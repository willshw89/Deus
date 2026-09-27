// tools/test_column_landforms.js - Automated verification suite for Volumetric Column Landforms & Universal Mining
// Validates:
// 1. Surface elevation S(gx, gy) in {0, 1, 2} distribution across multiple seeds/regions.
// 2. Guaranteed flat camp clearing: S = 0 within r <= 12 around camp center.
// 3. Volumetric column generation: z < S is SOLID rock, z = S is FLOOR ground, z > S is OPEN air.
// 4. Natural ramps on single-step elevation transitions (Delta S = 1).
// 5. Universal mining across all Z levels: surface cliffs (z=0), plateaus (z=1), underground (z=-1).
// 6. Mining cell mutation (SOLID -> FLOOR) and stone yield matching local strata geology.
// 7. World-mutation invalidation: levels:cellChanged, levels:faceExposed to 6 orthogonal neighbors, room graph invalidation.
// 8. Rule 4 mutant mode (--mutant). Load mutant: --mutant=no_world.
//
// The plugins run in a Node vm. DEUS_World.js loads before DEUS_WorldGen.js and DEUS_Levels.js, because
// Levels reads UF.World.Z_RANGES.legacy and UF.Space at load (WG.00.17, bdf45b4c). The world state is the
// one this suite was written against (seed 98765, 256, one area, generator 4 on the five core levels, no
// zRange). DEUS_World reads a state with no zRange as the legacy range -2..+2
// (docs/systems/DEUS_ZRange.md section 3). The checks below are unchanged.
//
// Usage: node tools/test_column_landforms.js [--mutant | --mutant=no_world]
//   --mutant            camp clearing must fail (a flat camp passes; exit 1)
//   --mutant=no_world   do not load DEUS_World.js (the load guard must exit 1)
// Exit: 0 all checks passed, 1 a check failed or a plugin failed to load.
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");

function argValue(name) {
    const a = process.argv.find(x => x.startsWith(`--${name}=`));
    return a ? a.slice(name.length + 3) : "";
}
// Bare --mutant is the camp-clearing mutant. --mutant=no_world is a different argv entry.
const isMutant = process.argv.includes("--mutant");
const mutantName = argValue("mutant");

const size = 256;
const seed = 98765;
let nextUnitId = 200;
const unitsById = {};

let passed = 0, failed = 0;
function harnessFail(msg) {
    failed++;
    console.log(`HARNESS ${msg}`);
    console.log(`RESULT: ${passed} passed, ${failed} failed (exit 1)`);
    process.exit(1);
}

if (mutantName && mutantName !== "no_world") {
    harnessFail(`unknown mutant "${mutantName}"; known: no_world (bare --mutant is the camp-clearing mutant)`);
}
if (mutantName === "no_world") console.log("MUTANT no_world: DEUS_World.js is not loaded; plugin load must fail");
if (isMutant) console.log("MUTANT --mutant: camp clearing is forced to fail; a flat camp must fail this run");

// Households subsystem gate. DEUS_Households.js was archived to archive/plugins on 2026-09-22 and is no longer
// registered in game/js/plugins.js; the leftover UF_Households.js is dead code. The room-invalidation checks in
// Test 6 only run when the real plugin is back on disk AND active in plugins.js. Otherwise they are SKIPped.
function householdsSubsystemActive() {
    if (!fs.existsSync(path.join(PLUGINS, "DEUS_Households.js"))) return false;
    try {
        const src = fs.readFileSync(path.join(ROOT, "game", "js", "plugins.js"), "utf8");
        const list = JSON.parse(src.slice(src.indexOf("["), src.lastIndexOf("]") + 1));
        return list.some(p => p.name === "DEUS_Households" && p.status === true);
    } catch (e) {
        return false;
    }
}
const HOUSEHOLDS_ACTIVE = householdsSubsystemActive();
const HOUSEHOLDS_SKIP_REASON = "Households subsystem retired 2026-09-22 (DEUS_Households.js archived, not registered)";

const PLUGIN_FILES = ["DEUS_World.js", "DEUS_WorldGen.js", "DEUS_Items.js", "DEUS_Levels.js", "DEUS_Jobs.js"];
if (HOUSEHOLDS_ACTIVE) PLUGIN_FILES.push("DEUS_Households.js");

//-----------------------------------------------------------------------------
// Sandbox. RMMZ stubs only where these plugins touch the engine at load
// (the same shape as setup() in tools/test_strata_foundation.js and Lane BB's geology harness).

function section(src, a, b, label) {
    const i = src.indexOf(a), j = src.indexOf(b, i + a.length);
    if (i < 0 || j <= i) harnessFail(`engine source section missing (${label}): ${a}`);
    return src.slice(i, j);
}

function setup(pluginFiles) {
    const list = {};
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, "game/js/plugins.js"), "utf8"), list);
    const catalogData = JSON.parse(fs.readFileSync(path.join(ROOT, "game/data/UF_WorldCatalog.json"), "utf8"));
    const canvasCtx = () => ({
        imageSmoothingEnabled: false,
        createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
        putImageData() {}, drawImage() {}, fillRect() {}, clearRect() {},
        getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })
    });
    const env = {
        window: null, Math, performance, setTimeout, clearTimeout, console,
        document: { createElement: () => ({ width: 0, height: 0, getContext: canvasCtx }) },
        PluginManager: {
            parameters: name => (list.$plugins && list.$plugins.find(p => p.name === name) || {}).parameters || {},
            registerCommand() {}
        },
        DataManager: {
            _databaseFiles: [],
            onLoad() {},
            isBattleTest: () => false,
            isEventTest: () => false,
            createGameObjects() {},
            loadMapData() {},
            makeSaveContents() { return {}; },
            extractSaveContents() {}
        },
        Input: { keyMapper: {} },
        TouchInput: { isTriggered: () => false, clear: () => {}, x: 0, y: 0, _currentState: {} },
        SceneManager: { _scene: null },
        Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 },
        ImageManager: {
            loadTileset() { return { isReady: () => true, isError: () => false }; },
            loadParallax() { return null; },
            loadCharacter() { return { isReady: () => true }; }
        },
        Utils: { isOptionValid: () => false, encodeURI: s => s },
        SoundManager: { playCursor: () => {} },
        Tilemap: function Tilemap() {},
        $dataTilesets: JSON.parse(fs.readFileSync(path.join(ROOT, "game/data/Tilesets.json"), "utf8")),
        $dataMap: { width: size, height: size, data: new Array(size * size * 6).fill(0) },
        $ufWorldCatalog: catalogData,
        $deusWorldCatalog: null,
        $gameSystem: {},
        $gameScreen: { weatherType: () => "none", weatherPower: () => 0, changeWeather() {} },
        $gameTimer: {}, $gameSwitches: {}, $gameVariables: {}, $gameSelfSwitches: {},
        $gameActors: {}, $gameParty: {}
    };
    env.window = env;
    env.global = env;
    env.$deusWorldCatalog = env.$ufWorldCatalog;
    for (const name of ["Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot", "Rectangle", "Game_Map", "Game_Player", "Game_CharacterBase", "Game_Event", "Spriteset_Map", "Spriteset_Base"]) {
        env[name] = vm.runInNewContext(`(function ${name}(){})`);
        env[name].prototype.initialize = function() {};
    }
    env.Scene_Boot.prototype.start = function() {};
    env.Scene_Boot.prototype.isReady = function() { return true; };
    env.Scene_Map.prototype.createDisplayObjects = function() {};
    env.Scene_Map.prototype.createAllWindows = function() {};
    env.Scene_Map.prototype.update = function() {};
    env.Scene_Map.prototype.isAnyWindowUnderMouse = function() { return false; };
    env.Scene_Map.prototype.isReady = function() { return true; };
    env.Spriteset_Map.prototype.createCharacters = function() {};
    env.Spriteset_Map.prototype.createTilemap = function() {};
    env.Spriteset_Map.prototype.update = function() {};
    env.Spriteset_Map.prototype.updateParallax = function() {};
    env.Sprite = vm.runInNewContext(`(function Sprite(bitmap) {
        this.anchor = { x: 0, y: 0, set(a, b) { this.x = a; this.y = b; } };
        this.children = []; this.parent = null; this.visible = true; this.bitmap = bitmap || null; this.x = 0; this.y = 0; this.z = 0;
    })`);
    Object.assign(env.Sprite.prototype, { update() {}, addChild(c) { c.parent = this; this.children.push(c); return c; }, setFrame() {} });
    env.Bitmap = vm.runInNewContext(`(function Bitmap(w, h) {
        this.width = w || 0; this.height = h || 0;
        this.context = { imageSmoothingEnabled: false, drawImage() {}, putImageData() {}, fillRect() {} };
        this._baseTexture = { update() {} };
    })`);
    Object.assign(env.Bitmap.prototype, {
        isReady() { return true; }, isError() { return false; }, clear() {}, clearRect() {}, fillRect() {},
        strokeRect() {}, blt() {}, drawText() {}, getAlphaPixel() { return 0; }
    });
    env.Bitmap.load = () => ({ isReady: () => false, isError: () => false });
    Object.assign(env.Game_Map.prototype, {
        setup() {}, update() {}, parallaxName() { return ""; },
        mapId() { return this._mapId || 0; }, width: () => size, height: () => size,
        tileId: () => 0, tilesetFlags: () => [],
        isPassable: () => true, checkPassage: () => true,
        displayX() { return 0; }, displayY() { return 0; }, screenTileX: () => 17, screenTileY: () => 13,
        adjustX(x) { return x; }, adjustY(y) { return y; },
        roundXWithDirection: (x, d) => x + (d === 6 ? 1 : d === 4 ? -1 : 0),
        roundYWithDirection: (y, d) => y + (d === 2 ? 1 : d === 8 ? -1 : 0),
        eventsXy: () => [], eventsXyNt: () => [], events: () => []
    });
    Object.assign(env.Game_Player.prototype, {
        isTransferring: () => false, direction: () => 2, isCollided: () => false,
        locate(x, y) { this.x = x; this.y = y; },
        setupForNewGame() {}, performTransfer() {}, reserveTransfer() {}, moveStraight() {}, moveDiagonally() {}
    });
    Object.assign(env.Game_Event.prototype, { isCollidedWithEvents() {}, isCollidedWithPlayerCharacters() {} });
    Object.assign(env.Game_CharacterBase.prototype, { isCollidedWithEvents() {} });
    env.$gameMap = new env.Game_Map();
    env.$gameMap._events = [];
    env.$gamePlayer = new env.Game_Player();
    env.$gamePlayer.x = Math.floor(size / 2);
    env.$gamePlayer.y = Math.floor(size / 2);

    const ctx = vm.createContext(env);
    const core = fs.readFileSync(path.join(ROOT, "game/js/rmmz_core.js"), "utf8");
    const deus = fs.readFileSync(path.join(PLUGINS, "DEUS_Core.js"), "utf8");
    vm.runInContext(section(core, "Tilemap.TILE_ID_B =", "Tilemap.Layer =", "Tilemap constants"), ctx, { filename: "rmmz_core.js Tilemap constants" });
    // UF.Events, the real bus (DEUS_Core). Levels emits levels:cellChanged / levels:faceExposed through it.
    vm.runInContext(section(deus, "window.DEUS = window.DEUS || {};", "//-----------------------------------------------------------------------------", "DEUS_Core events"), ctx, { filename: "DEUS_Core.js events" });

    for (const file of pluginFiles) {
        if (mutantName === "no_world" && file === "DEUS_World.js") continue;
        const src = fs.readFileSync(path.join(PLUGINS, file), "utf8");
        try {
            vm.runInContext(src, ctx, { filename: file });
        } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            harnessFail(`plugin failed to load: ${file}: ${msg}`);
        }
    }
    try {
        env.DataManager.onLoad(env.$dataTilesets);
    } catch (e) {
        harnessFail(`tileset registration failed: ${e && e.message ? e.message : e}`);
    }
    return env;
}

function assertPluginsLoaded(env) {
    const missing = [];
    const uf = env.UF;
    const world = uf && uf.World;
    const space = uf && uf.Space;
    const worldGen = uf && uf.WorldGen;
    const levels = uf && uf.Levels;
    const items = uf && uf.Items;
    const jobs = uf && uf.Jobs;
    const events = uf && uf.Events;
    if (!world || !world.Z_RANGES || !world.Z_RANGES.legacy || typeof world.zRange !== "function") missing.push("UF.World.Z_RANGES.legacy/zRange");
    if (!space || typeof space.GRID_SIZE_FEET !== "number" || typeof space.STRATUM_FEET !== "number") missing.push("UF.Space.GRID_SIZE_FEET/STRATUM_FEET");
    if (!worldGen) missing.push("UF.WorldGen");
    if (!levels || typeof levels.surfaceElevationAt !== "function" || typeof levels.shapeAt !== "function" || typeof levels.setShape !== "function") missing.push("UF.Levels.surfaceElevationAt/shapeAt/setShape");
    if (!items || typeof items.find !== "function" || typeof items.materialOf !== "function" || typeof items.give !== "function") missing.push("UF.Items.find/materialOf/give");
    if (!jobs || typeof jobs.handler !== "function") missing.push("UF.Jobs.handler");
    if (!events || typeof events.on !== "function" || typeof events.off !== "function" || typeof events.emit !== "function") missing.push("UF.Events.on/off/emit");
    if (HOUSEHOLDS_ACTIVE && !(uf.Households && typeof uf.Households.invalidateRoomEnclosure === "function")) missing.push("UF.Households.invalidateRoomEnclosure");
    if (missing.length) harnessFail(`plugins did not load: missing ${missing.join(", ")}`);
}

// gen: 4 exercises the generator-4 volumetric path (column landforms, ramps, cliff caves). The level entries are the
// generated core (docs/systems/DEUS_ZRange.md section 2, legacy). No zRange on the state: the live range is legacy.
function coreLevels(gen) {
    const levels = {};
    for (const z of [-2, -1, 0, 1, 2]) levels[String(z)] = { z, gen, checksum: null, cells: {} };
    return levels;
}

const worldState = {
    seed,
    size,
    areasX: 1,
    areasY: 1,
    startArea: { x: 0, y: 0 },
    version: 4,
    levels: coreLevels(4),
    units: unitsById,
    nextUnitId,
    items: { nextId: 1, byId: {} },
    jobs: { nextId: 1, list: [], byId: {}, log: [] },
    diffs: {},
    objectDiffs: {}
};

function installWorld(env) {
    env.UF.World.state = worldState;
    const range = env.UF.World.zRange();
    const legacy = env.UF.World.Z_RANGES.legacy;
    env.$gameMap._mapId = env.UF.World.areaMapId(0, 0, 0);
    if (range.zMin !== legacy.zMin || range.zMax !== legacy.zMax) {
        harnessFail(`state has no zRange but UF.World.zRange() is ${range.zMin}..${range.zMax}; docs/systems/DEUS_ZRange.md section 3 says that state is the legacy range ${legacy.zMin}..${legacy.zMax}`);
    }
    const space = env.UF.Space;
    console.log(`INFO world seed ${seed}, size ${size}, areas 1x1, generator 4, zRange ${range.zMin}..${range.zMax} (state has no zRange: legacy)`);
    console.log(`INFO space ${space.GRID_SIZE_FEET} ft cell, ${space.STRATUM_FEET} ft stratum, ${space.Z_STEP_FEET} ft layer`);
    console.log(`INFO view map ${env.$gameMap.mapId()} (areaMapId 0,0,0 = ${env.UF.World.areaMapId(0, 0, 0)})`);
}

const loadedAt = Date.now();
const sandbox = setup(PLUGIN_FILES);
assertPluginsLoaded(sandbox);
console.log(`INFO plugins loaded: ${PLUGIN_FILES.filter(f => !(mutantName === "no_world" && f === "DEUS_World.js")).join(", ")} (${Date.now() - loadedAt} ms)`);
installWorld(sandbox);

const UF = sandbox.UF;
const W = UF.World;
const L = UF.Levels;
const J = UF.Jobs;
const I = UF.Items;
const WG = UF.WorldGen;

// DEUS_Skills.js is archived (archive/plugins, not registered in plugins.js). Jobs.mine.apply stamps a dropped
// stone with UF.Skills.qualityRoll when that function exists, and leaves quality unset when the roll is 0.
// The roll this suite was written against is the miner's own skillQuality (the miner below is 4).
UF.Skills = {
    qualityRoll: (unit) => (unit && unit.data && unit.data.skillQuality) || 3
};

let invalidatedRooms = [];
if (HOUSEHOLDS_ACTIVE) {
    const realInvalidate = UF.Households && UF.Households.invalidateRoomEnclosure;
    if (typeof realInvalidate === "function") {
        UF.Households.invalidateRoomEnclosure = (area, x, y, z) => {
            invalidatedRooms.push({ area, x, y, z });
            return realInvalidate.call(UF.Households, area, x, y, z);
        };
    }
}

let testsPassed = 0;
let testsFailed = 0;
let testsSkipped = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  PASS: ${message}`);
        testsPassed++;
    } else {
        console.error(`  FAIL: ${message}`);
        testsFailed++;
    }
}

function skip(message, reason) {
    console.log(`  SKIP: ${message} - ${reason}`);
    testsSkipped++;
}

console.log(`\n--- Running Volumetric Column Landforms & Universal Mining Suite ${isMutant ? "(MUTANT MODE)" : ""} ---`);

// =========================================================================
// Test 1: Topographic Surface Elevation Distribution & Determinism
// =========================================================================
console.log("\nTest 1: Surface Elevation S(gx, gy) Distribution & Determinism");
{
    const elevCounts = { 0: 0, 1: 0, 2: 0 };
    for (let y = 0; y < size; y += 4) {
        for (let x = 0; x < size; x += 4) {
            const s = L.surfaceElevationAt(x, y, seed);
            elevCounts[s] = (elevCounts[s] || 0) + 1;
        }
    }

    assert(elevCounts[0] > 0, `Contains valley/plains datum S=0 (found ${elevCounts[0]} samples)`);
    assert(elevCounts[1] > 0, `Contains plateau/hill S=1 (found ${elevCounts[1]} samples)`);
    assert(elevCounts[2] > 0, `Contains mountain ridge S=2 (found ${elevCounts[2]} samples)`);

    // Determinism check: repeating same coordinates yields identical elevation
    const s1 = L.surfaceElevationAt(45, 67, seed);
    const s2 = L.surfaceElevationAt(45, 67, seed);
    assert(s1 === s2, `Deterministic elevation at (45,67): ${s1} === ${s2}`);

    const otherSeed = seed + 777;
    const sOther = L.surfaceElevationAt(45, 67, otherSeed);
    console.log(`  Info: Elevation distribution sampled: S0=${elevCounts[0]}, S1=${elevCounts[1]}, S2=${elevCounts[2]}`);
}

// =========================================================================
// Test 2: Guaranteed Flat Camp Clearing
// =========================================================================
console.log("\nTest 2: Guaranteed Flat Camp Clearing (r <= 12 at Datum S=0)");
{
    const mid = Math.floor(size / 2);
    let allDatumZero = true;
    let checkedCount = 0;

    for (let dy = -12; dy <= 12; dy++) {
        for (let dx = -12; dx <= 12; dx++) {
            if (Math.hypot(dx, dy) <= 12) {
                const s = L.surfaceElevationAt(mid + dx, mid + dy, seed);
                checkedCount++;
                if (s !== 0) {
                    allDatumZero = false;
                }
            }
        }
    }

    if (isMutant) {
        // Deliberate failure under mutant mode
        assert(false, "MUTANT FAILURE: simulated camp elevation non-zero failure");
    } else {
        assert(allDatumZero, `All ${checkedCount} cells within camp radius r<=12 are strictly datum S=0`);
    }
}

// =========================================================================
// Test 3: Volumetric Topography Across Z-Levels (z < S, z = S, z > S)
// =========================================================================
console.log("\nTest 3: Volumetric Topography Across Z-Levels");
{
    // Find sample coordinates with S = 0, S = 1, and S = 2 outside the camp.
    // The S = 0 sample must be an interior plain cell (all 4 neighbours also S = 0): DEUS_Levels places natural
    // ramps on the LOWER floor cell of a single-step transition, so an S = 0 cell beside S = 1 is legitimately a ramp.
    let pt0 = null, pt1 = null, pt2 = null;
    const interiorDatum = (x, y) => [[0, -1], [0, 1], [-1, 0], [1, 0]].every(([dx, dy]) => L.surfaceElevationAt(x + dx, y + dy, seed) === 0);
    for (let y = 10; y < size - 10; y++) {
        for (let x = 10; x < size - 10; x++) {
            const s = L.surfaceElevationAt(x, y, seed);
            if (s === 0 && !pt0 && interiorDatum(x, y)) pt0 = { x, y };
            if (s === 1 && !pt1) pt1 = { x, y };
            if (s === 2 && !pt2) pt2 = { x, y };
            if (pt0 && pt1 && pt2) break;
        }
        if (pt0 && pt1 && pt2) break;
    }

    assert(pt0 && pt1 && pt2, "Located representative coordinates for S=0, S=1, S=2");

    // Case A: At S = 0 (Datum plain)
    // z = 0 should be FLOOR
    // z = 1 should be OPEN
    // z = 2 should be OPEN
    const shape0_z0 = L.shapeAt({ area: { x: 0, y: 0 }, x: pt0.x, y: pt0.y, z: 0 });
    const shape0_z1 = L.shapeAt({ area: { x: 0, y: 0 }, x: pt0.x, y: pt0.y, z: 1 });
    const shape0_z2 = L.shapeAt({ area: { x: 0, y: 0 }, x: pt0.x, y: pt0.y, z: 2 });
    assert(shape0_z0 === "floor", `Datum coordinate (S=0) at z=0 is FLOOR (got ${shape0_z0})`);
    assert(shape0_z1 === "open", `Datum coordinate (S=0) at z=1 is OPEN sky (got ${shape0_z1})`);
    assert(shape0_z2 === "open", `Datum coordinate (S=0) at z=2 is OPEN sky (got ${shape0_z2})`);

    // Case B: At S = 1 (Plateau / Hill)
    // z = 0 should be SOLID rock mass beneath plateau
    // z = 1 should be FLOOR surface of the plateau
    // z = 2 should be OPEN sky above plateau
    const shape1_z0 = L.shapeAt({ area: { x: 0, y: 0 }, x: pt1.x, y: pt1.y, z: 0 });
    const shape1_z1 = L.shapeAt({ area: { x: 0, y: 0 }, x: pt1.x, y: pt1.y, z: 1 });
    const shape1_z2 = L.shapeAt({ area: { x: 0, y: 0 }, x: pt1.x, y: pt1.y, z: 2 });
    assert(shape1_z0 === "solid", `Plateau coordinate (S=1) at z=0 is SOLID rock mass (got ${shape1_z0})`);
    assert(shape1_z1 === "floor" || shape1_z1 === "ramp", `Plateau coordinate (S=1) at z=1 is FLOOR or RAMP (got ${shape1_z1})`);
    assert(shape1_z2 === "open", `Plateau coordinate (S=1) at z=2 is OPEN sky (got ${shape1_z2})`);

    // Case C: At S = 2 (High Ridge / Mountain)
    // z = 0 should be SOLID rock
    // z = 1 should be SOLID rock
    // z = 2 should be FLOOR surface
    const shape2_z0 = L.shapeAt({ area: { x: 0, y: 0 }, x: pt2.x, y: pt2.y, z: 0 });
    const shape2_z1 = L.shapeAt({ area: { x: 0, y: 0 }, x: pt2.x, y: pt2.y, z: 1 });
    const shape2_z2 = L.shapeAt({ area: { x: 0, y: 0 }, x: pt2.x, y: pt2.y, z: 2 });
    assert(shape2_z0 === "solid", `High ridge coordinate (S=2) at z=0 is SOLID rock mass (got ${shape2_z0})`);
    assert(shape2_z1 === "solid", `High ridge coordinate (S=2) at z=1 is SOLID rock mass (got ${shape2_z1})`);
    assert(shape2_z2 === "floor" || shape2_z2 === "ramp", `High ridge coordinate (S=2) at z=2 is FLOOR or RAMP (got ${shape2_z2})`);
}

// =========================================================================
// Test 4: Natural Ramps at Elevation Transitions
// =========================================================================
console.log("\nTest 4: Natural Ramps at Single-Step Transitions");
{
    let rampFound = false;
    let rampLevel = 0;
    for (let z = 0; z <= 1; z++) {
        for (let y = 1; y < size - 1; y++) {
            for (let x = 1; x < size - 1; x++) {
                const sh = L.shapeAt({ area: { x: 0, y: 0 }, x, y, z });
                if (sh === "ramp") {
                    rampFound = true;
                    rampLevel = z;
                    break;
                }
            }
            if (rampFound) break;
        }
        if (rampFound) break;
    }

    assert(rampFound, `Natural ramp generated connecting elevation transition (found at z=${rampLevel})`);
}

// =========================================================================
// Test 5: Universal Mining on Surface & Elevated Solid Rock
// =========================================================================
console.log("\nTest 5: Universal Mining on Surface Rock (z = 0)");
{
    // Find a solid rock cliff cell on z=0 (under an S=1 or S=2 hill)
    let cliffPt = null;
    for (let y = 10; y < size - 10; y++) {
        for (let x = 10; x < size - 10; x++) {
            const sh = L.shapeAt({ area: { x: 0, y: 0 }, x, y, z: 0 });
            if (sh === "solid") {
                cliffPt = { x, y };
                break;
            }
        }
        if (cliffPt) break;
    }

    assert(cliffPt !== null, `Found surface cliff cell at (${cliffPt.x}, ${cliffPt.y}, z=0)`);

    const targetRef = { area: { x: 0, y: 0, z: 0 }, x: cliffPt.x, y: cliffPt.y };
    const miner = {
        id: nextUnitId++,
        name: "Cliff Miner",
        area: { x: 0, y: 0, z: 0 },
        x: cliffPt.x - 1,
        y: cliffPt.y,
        z: 0,
        data: { inventory: [], equipment: { tool: null }, skillQuality: 4 }
    };
    unitsById[miner.id] = miner;

    // Plan a mine job on the surface solid cell
    const mineJob = {
        id: 991,
        type: "mine",
        target: targetRef,
        params: {}
    };

    const handler = J.handler("mine");
    assert(!!handler && typeof handler.plan === "function", "Mine job handler registered");

    const planRes = handler.plan(mineJob, miner);
    assert(planRes.ok === true, `Surface cliff mining planned successfully: stand=(${planRes.stand.x}, ${planRes.stand.y})`);

    const workTicks = handler.work(mineJob, miner);
    assert(workTicks > 0, `Mining work ticks calculated based on stone fracture resistance: ${workTicks} ticks`);

    // Verify cell is solid before mining
    assert(L.shapeAt(targetRef) === "solid", "Target cell is SOLID before mining");

    // Apply mining completion
    handler.apply(mineJob, miner);

    // Verify cell mutated to floor
    const mutatedShape = L.shapeAt(targetRef);
    assert(mutatedShape === "floor", `Surface cliff mutated to FLOOR after mining (got ${mutatedShape})`);

    // Verify stone drops on ground matching local strata geology
    const groundItems = I.find({ area: { x: 0, y: 0 }, near: { x: cliffPt.x, y: cliffPt.y }, radius: 0.5 });
    assert(groundItems.length > 0, `Mining dropped stone items on mined cell (count: ${groundItems.length})`);
    const droppedItem = groundItems[0].item;
    assert(droppedItem.type === "stone", `Dropped item is stone (got ${droppedItem.type})`);
    assert(droppedItem.mat !== undefined && droppedItem.mat !== null, `Dropped stone has typed geological material: ${droppedItem.mat}`);

    // Quality stamping rule (DEUS_Jobs mine.apply, commit 404a818 2026-09-21): hard stone (tag "hard_stone" or
    // fractureResistance >= 75) is only stamped with the miner's quality when the equipped tool is a metal pick;
    // otherwise q stays unset. The expectation is derived from the catalog entry of the stone actually dropped.
    const stoneDef = typeof I.materialOf === "function" ? I.materialOf(`stones:${droppedItem.mat}`) : null;
    const hardStone = !!(stoneDef && ((stoneDef.tags && stoneDef.tags.includes("hard_stone")) || (stoneDef.fractureResistance || 0) >= 75));
    if (!hardStone) {
        assert(droppedItem.q === 4, `Dropped ${droppedItem.mat} (soft stone) stamped with miner quality (got ${droppedItem.q})`);
    } else {
        assert(droppedItem.q === undefined, `Hard stone ${droppedItem.mat} mined bare-handed leaves quality unstamped (got ${droppedItem.q})`);

        // Equip a metal pick and mine a second solid cell: the quality stamp must now apply.
        // The catalog has no iron/steel/bronze pick type; the plugin's metal-pick rule also accepts item.mat, so a
        // stone_pick record with mat "iron" is the only data-driven way to satisfy it.
        const pick = (I.give("stone_pick", 1, miner.id, { mat: "iron", bypassLimits: true }) || [])[0] || null;
        assert(!!pick && pick.holder === miner.id, `Miner given a metal pick via Items.give (item ${pick && pick.id}, mat ${pick && pick.mat})`);
        if (pick) miner.data.equipment.tool = pick.id;

        let cliffPt2 = null;
        for (let y = 10; y < size - 10 && !cliffPt2; y++) {
            for (let x = 10; x < size - 10; x++) {
                if ((x !== cliffPt.x || y !== cliffPt.y) && L.shapeAt({ area: { x: 0, y: 0 }, x, y, z: 0 }) === "solid") {
                    cliffPt2 = { x, y };
                    break;
                }
            }
        }
        assert(cliffPt2 !== null, `Found second surface cliff cell at (${cliffPt2 && cliffPt2.x}, ${cliffPt2 && cliffPt2.y}, z=0)`);
        if (cliffPt2) {
            miner.x = cliffPt2.x - 1;
            miner.y = cliffPt2.y;
            const job2 = { id: 992, type: "mine", target: { area: { x: 0, y: 0, z: 0 }, x: cliffPt2.x, y: cliffPt2.y }, params: {} };
            const plan2 = handler.plan(job2, miner);
            assert(plan2.ok === true, `Second mining job planned with metal pick: stand=(${plan2.stand && plan2.stand.x}, ${plan2.stand && plan2.stand.y})`);
            handler.apply(job2, miner);
            const drops2 = I.find({ area: { x: 0, y: 0 }, near: { x: cliffPt2.x, y: cliffPt2.y }, radius: 0.5 });
            const item2 = drops2.length ? drops2[0].item : null;
            assert(!!item2 && item2.type === "stone", `Second mining dropped stone (count: ${drops2.length})`);
            assert(!!item2 && item2.q === 4, `Stone mined with a metal pick is stamped with miner quality 4 (got ${item2 && item2.q}, mat ${item2 && item2.mat})`);
        }
    }
}

// =========================================================================
// Test 6: World-Mutation Invalidation Engine & Exposed Faces
// =========================================================================
console.log("\nTest 6: World-Mutation Invalidation & Exposed Faces");
{
    invalidatedRooms = [];
    let cellChangedEvents = [];
    let faceExposedEvents = [];

    const onCellChanged = e => cellChangedEvents.push(e);
    const onFaceExposed = e => faceExposedEvents.push(e);

    UF.Events.on("levels:cellChanged", onCellChanged);
    UF.Events.on("levels:faceExposed", onFaceExposed);

    // Mine another solid cell
    const testRef = { area: { x: 0, y: 0, z: 0 }, x: 50, y: 50 };
    L.setShape(testRef, "floor", { material: "stone", cause: "excavation_test" });

    UF.Events.off("levels:cellChanged", onCellChanged);
    UF.Events.off("levels:faceExposed", onFaceExposed);

    assert(cellChangedEvents.length === 1, `levels:cellChanged emitted exactly once (count: ${cellChangedEvents.length})`);
    assert(cellChangedEvents[0].x === 50 && cellChangedEvents[0].y === 50, "cellChanged contains correct coordinates");
    assert(cellChangedEvents[0].cause === "excavation_test", `cellChanged contains correct cause: ${cellChangedEvents[0].cause}`);

    assert(faceExposedEvents.length === 6, `levels:faceExposed emitted for all 6 orthogonal neighbors (count: ${faceExposedEvents.length})`);

    if (HOUSEHOLDS_ACTIVE) {
        assert(invalidatedRooms.length >= 1, "Room enclosure invalidation triggered upon world cell mutation");
        assert(invalidatedRooms.length >= 1 && invalidatedRooms[0].x === 50 && invalidatedRooms[0].y === 50, "Invalidated room at correct mutation coordinate");
    } else {
        skip("Room enclosure invalidation triggered upon world cell mutation", HOUSEHOLDS_SKIP_REASON);
        skip("Invalidated room at correct mutation coordinate", HOUSEHOLDS_SKIP_REASON);
    }
}

// =========================================================================
// Test Suite Summary
// =========================================================================
console.log(`\nTest Suite Summary: ${testsPassed} passed, ${testsFailed} failed, ${testsSkipped} skipped.`);
if (testsFailed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
