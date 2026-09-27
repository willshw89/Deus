// tools/test_vertical_worldgen_proof.js - Automated verification suite for Vertical Worldgen, Cliff Caves & Rock Enclosure
// Validates:
// 1. Natural Vertical Continuity across 5 Z-levels (Z = -2..+2).
// 2. Guaranteed Flat Camp Clearing (S = 0 within r <= 12).
// 3. Horizontal Cliff Cave Carving & Level Connection (Task 11):
//    - Breaches cliff faces at z = 0 into S >= 1 terrain.
//    - Floor mouth, rock tunnel, inner terminus with STAIR_DOWN at z = 0.
//    - Matching STAIR_UP at z = -1 with landing vestibule and cavern connection.
//    - Levels.cliffCaveMouths query and NaturalConnections passage registration.
// 4. Structural Geological Enclosure & Hybrid Rooms (Task 12):
//    - 100% natural rock enclosure (excavated cave dwelling or rock-faced room).
//    - Zero redundant wall construction steps in homeSteps.
//    - Intimacy, shelter, and bedroom satisfaction for cave dwellings.
//    - Hybrid room enclosure (cliff rock boundary + constructed wooden walls + door).
//    - World-mutation enclosure invalidation: mining away an enclosing rock wall breaches the room.
// 5. Rule 4 mutant mode (--mutant). Load mutant: --mutant=no_world.
//
// The plugins run in a Node vm. DEUS_World.js loads before DEUS_WorldGen.js and DEUS_Levels.js, because
// Levels reads UF.World.Z_RANGES.legacy and UF.Space at load (WG.00.17, bdf45b4c). The world state is the
// one this suite was written against (seed 1234, 96, one area, generator 4 on the five core levels, no
// zRange). DEUS_World reads a state with no zRange as the legacy range -2..+2
// (docs/systems/DEUS_ZRange.md section 3). The checks below are unchanged.
//
// Seed 54321 (used until 2026-09-22) yields an all-S=0 flat 96x96 world since commit 0256e10 (toroidal world
// alignment, 2026-09-21), so Test 3 could never find a cliff cave and Test 1 passed vacuously. Seed 1234 gives
// all three elevation bands inside the 10-cell inset and cliff cave mouths.
//
// Usage: node tools/test_vertical_worldgen_proof.js [--mutant | --mutant=no_world]
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

const size = 96;
const seed = 1234;
let nextUnitId = 300;
const unitsById = {};
const objectsByCell = {};

let harnessPassed = 0, harnessFailed = 0;
function harnessFail(msg) {
    harnessFailed++;
    console.log(`HARNESS ${msg}`);
    console.log(`RESULT: ${harnessPassed} passed, ${harnessFailed} failed (exit 1)`);
    process.exit(1);
}

if (mutantName && mutantName !== "no_world") {
    harnessFail(`unknown mutant "${mutantName}"; known: no_world (bare --mutant is the camp-clearing mutant)`);
}
if (mutantName === "no_world") console.log("MUTANT no_world: DEUS_World.js is not loaded; plugin load must fail");
if (isMutant) console.log("MUTANT --mutant: camp clearing is forced to fail; a flat camp must fail this run");

// Households subsystem gate. DEUS_Households.js was archived to archive/plugins on 2026-09-22 and is no longer
// registered in game/js/plugins.js; the leftover UF_Households.js is dead code. Test 4 (rock enclosure, hybrid
// rooms, breach) only runs when the real plugin is back on disk AND active in plugins.js. Otherwise it is SKIPped.
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

const PLUGIN_FILES = ["DEUS_World.js", "DEUS_WorldGen.js", "DEUS_Items.js", "DEUS_Levels.js", "DEUS_Jobs.js", "DEUS_NaturalConnections.js"];
if (HOUSEHOLDS_ACTIVE) PLUGIN_FILES.push("DEUS_Households.js");

//-----------------------------------------------------------------------------
// Sandbox. RMMZ stubs only where these plugins touch the engine at load
// (the same shape as setup() in tools/test_strata_foundation.js and Lane BB's geology harness).

function section(src, a, b, label) {
    const i = src.indexOf(a), j = src.indexOf(b, i + a.length);
    if (i < 0 || j <= i) harnessFail(`engine source section missing (${label}): ${a}`);
    return src.slice(i, j);
}

// The household checks were written against these doubles (DEUS_Objects / DEUS_Floors / DEUS_Colonists are not
// what Test 4 calls). Installed only when that plugin is actually loaded, and before it, as the old harness did.
function installHouseholdDoubles(env) {
    const catalogData = env.$ufWorldCatalog;
    env.UF.Objects = {
        types: () => catalogData.objects,
        type: id => catalogData.objects.find(o => o.id === id || o.typeId === id) || null,
        atIn: (area, x, y) => {
            const z = area ? (area.z !== undefined ? area.z : 0) : 0;
            const key = `${z}:${x},${y}`;
            const id = objectsByCell[key];
            if (!id) return null;
            const entry = catalogData.objects.find(o => o.id === id);
            return entry ? Object.assign({ id }, entry) : { id, tags: [] };
        },
        setIn: (area, x, y, id) => {
            const z = area ? (area.z !== undefined ? area.z : 0) : 0;
            const key = `${z}:${x},${y}`;
            if (!id) delete objectsByCell[key];
            else objectsByCell[key] = id;
        },
        place: (id, target) => {
            const z = target.z !== undefined ? target.z : (target.area && target.area.z !== undefined ? target.area.z : 0);
            const key = `${z}:${target.x},${target.y}`;
            objectsByCell[key] = id;
        }
    };
    env.UF.Objects.at = env.UF.Objects.atIn;
    env.UF.Objects.set = env.UF.Objects.setIn;
    env.UF.Ownership = {
        ownerOf: () => null,
        claim: () => {}
    };
    env.UF.Floors = {
        isFloorAt: () => true,
        applyRoofedUpperDeck: () => true,
        setFloor: () => true,
        Rooms: { invalidate: () => {} }
    };
    env.UF.Colonists = {
        state: u => ({ site: { x: 48, y: 48 }, siteId: 1, area: { x: 0, y: 0 }, z: u ? u.z : 0 }),
        culture: () => ({ wall: "wall_wood", door: "door_wood", floor: { kind: "floor_wood" } }),
        settlements: () => [{ site: { x: 48, y: 48 }, radius: 10, area: { x: 0, y: 0 }, z: 0 }]
    };
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
    vm.runInContext(section(deus, "window.DEUS = window.DEUS || {};", "//-----------------------------------------------------------------------------", "DEUS_Core events"), ctx, { filename: "DEUS_Core.js events" });

    for (const file of pluginFiles) {
        if (mutantName === "no_world" && file === "DEUS_World.js") continue;
        if (file === "DEUS_Households.js") installHouseholdDoubles(env);
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
    const links = uf && uf.NaturalConnections;
    const events = uf && uf.Events;
    if (!world || !world.Z_RANGES || !world.Z_RANGES.legacy || typeof world.zRange !== "function") missing.push("UF.World.Z_RANGES.legacy/zRange");
    if (!space || typeof space.GRID_SIZE_FEET !== "number" || typeof space.STRATUM_FEET !== "number") missing.push("UF.Space.GRID_SIZE_FEET/STRATUM_FEET");
    if (!worldGen) missing.push("UF.WorldGen");
    if (!levels || typeof levels.baseline !== "function" || typeof levels.surfaceElevationAt !== "function" || typeof levels.shapeAt !== "function" || typeof levels.cliffCaveMouths !== "function" || typeof levels.cellAt !== "function" || typeof levels.setShape !== "function") {
        missing.push("UF.Levels.baseline/surfaceElevationAt/shapeAt/cliffCaveMouths/cellAt/setShape");
    }
    if (!links || typeof links.generate !== "function") missing.push("UF.NaturalConnections.generate");
    if (!events || typeof events.on !== "function" || typeof events.emit !== "function") missing.push("UF.Events.on/emit");
    if (HOUSEHOLDS_ACTIVE && !(uf.Households && typeof uf.Households.make === "function")) missing.push("UF.Households.make");
    if (missing.length) harnessFail(`plugins did not load: missing ${missing.join(", ")}`);
}

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
    items: { byId: {}, nextId: 1, byCell: {} },
    objects: { byCell: objectsByCell, byId: {}, nextId: 1 },
    jobs: { list: [], nextId: 1 },
    history: { sites: [] },
    households: { version: 1, nextId: 1, byId: {}, byUnit: {}, people: {} },
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
const Levels = UF.Levels;
const Jobs = UF.Jobs;
const NaturalConnections = UF.NaturalConnections;
const Households = HOUSEHOLDS_ACTIVE ? UF.Households : null;

let passed = 0;
let failed = 0;
let skipped = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  PASS: ${message}`);
        passed++;
    } else {
        console.error(`  FAIL: ${message}`);
        failed++;
    }
}

function skip(message, reason) {
    console.log(`  SKIP: ${message} - ${reason}`);
    skipped++;
}

async function runSuite() {
    console.log("\n--- Running Vertical Worldgen, Cliff Caves & Rock Enclosure Proof Suite  ---");

    // =========================================================================
    // Test 1: Natural Vertical Continuity Across 5 Z-Levels
    // =========================================================================
    console.log("\nTest 1: Natural Vertical Continuity Across 5 Z-Levels (Z = -2..+2)");
    {
        const b0 = Levels.baseline(0, 0, 0);
        const b1 = Levels.baseline(1, 0, 0);
        const b2 = Levels.baseline(2, 0, 0);
        const b_neg1 = Levels.baseline(-1, 0, 0);
        const b_neg2 = Levels.baseline(-2, 0, 0);

        assert(b0 && b1 && b2 && b_neg1 && b_neg2, "Baselines generated for all 5 vertical levels (-2..+2)");

        // Check volumetric physical laws across surface levels: every cell of the 10-cell inset, so the S=2 branch is
        // exercised even when ridges are rare.
        let correctColumns = 0;
        let checked = 0;
        const bands = { 0: 0, 1: 0, 2: 0 };
        for (let y = 10; y < size - 10; y++) {
            for (let x = 10; x < size - 10; x++) {
                const S = Levels.surfaceElevationAt(x, y, seed);
                const s0 = Levels.shapeAt({ area: { x: 0, y: 0 }, x, y, z: 0 });
                const s1 = Levels.shapeAt({ area: { x: 0, y: 0 }, x, y, z: 1 });
                const s2 = Levels.shapeAt({ area: { x: 0, y: 0 }, x, y, z: 2 });
                checked++;
                bands[S] = (bands[S] || 0) + 1;

                let ok = true;
                if (S === 0) {
                    if (s0 !== "floor" && s0 !== "ramp") ok = false;
                    if (s1 !== "open") ok = false;
                    if (s2 !== "open") ok = false;
                } else if (S === 1) {
                    if (s0 !== "solid" && s0 !== "floor" && s0 !== "stairDown") ok = false; // floor/stairDown allowed if cliff cave
                    if (s1 !== "floor" && s1 !== "ramp") ok = false;
                    if (s2 !== "open") ok = false;
                } else if (S === 2) {
                    if (s0 !== "solid" && s0 !== "floor" && s0 !== "stairDown") ok = false;
                    if (s1 !== "solid") ok = false;
                    if (s2 !== "floor" && s2 !== "ramp") ok = false;
                }
                if (ok) correctColumns++;
            }
        }
        // A flat world would satisfy the column laws trivially; require elevated terrain in the sample.
        assert(bands[1] > 0 && bands[2] > 0, `Sampled columns include plateau (S=1: ${bands[1]}) and ridge (S=2: ${bands[2]}) terrain, not only datum (S=0: ${bands[0]})`);
        assert(correctColumns === checked, `All ${checked} sampled vertical columns obey volumetric physical laws (${correctColumns}/${checked})`);
    }

    // =========================================================================
    // Test 2: Guaranteed Flat Camp Clearing
    // =========================================================================
    console.log("\nTest 2: Guaranteed Flat Camp Clearing (r <= 12 around Camp Center)");
    {
        const mid = Math.floor(size / 2);
        let allDatumZero = true;
        let cellCount = 0;
        for (let dy = -12; dy <= 12; dy++) {
            for (let dx = -12; dx <= 12; dx++) {
                if (Math.hypot(dx, dy) <= 12) {
                    cellCount++;
                    const S = Levels.surfaceElevationAt(mid + dx, mid + dy, seed);
                    if (S !== 0) allDatumZero = false;
                }
            }
        }

        if (isMutant) allDatumZero = false; // Rule 4 mutant check

        assert(allDatumZero, `Camp clearing (r <= 12, ${cellCount} cells) is 100% flat at datum S = 0`);
    }

    // =========================================================================
    // Test 3: Horizontal Cliff Cave Carving & Level Connection (Task 11)
    // =========================================================================
    console.log("\nTest 3: Horizontal Cliff Cave Carving & Level Connection (Task 11)");
    {
        const area = { x: 0, y: 0 };
        const cliffMouths = Levels.cliffCaveMouths(area);
        assert(Array.isArray(cliffMouths) && cliffMouths.length > 0, `Generated ${cliffMouths.length} natural horizontal cliff cave mouths breaching cliffs`);

        const cm = cliffMouths[0] || null;
        assert(cm && cm.tunnel && cm.terminus, "Cliff cave mouth record contains entrance tunnel and inner terminus");

        if (!cm || !cm.terminus) {
            // No mouth to inspect: record the dependent checks as failures instead of throwing out of the suite.
            assert(false, "Cave mouth, terminus, stair and vestibule checks could not be evaluated (no cliff cave mouth generated)");
        } else {
            // Surface checks at z = 0
            const mouthShape = Levels.shapeAt({ area, x: cm.x, y: cm.y, z: 0 });
            const mouthCell = Levels.cellAt({ area, x: cm.x, y: cm.y, z: 0 });
            assert(mouthShape === "floor", `Cave mouth at (${cm.x}, ${cm.y}, z=0) breaches cliff face as traversable FLOOR (got ${mouthShape})`);
            assert(mouthCell && mouthCell.material === "stone", "Cave mouth floor material is natural STONE");

            const termShape0 = Levels.shapeAt({ area, x: cm.terminus.x, y: cm.terminus.y, z: 0 });
            assert(termShape0 === "stairDown", `Inner terminus at (${cm.terminus.x}, ${cm.terminus.y}, z=0) has STAIR_DOWN descent (got ${termShape0})`);

            // Subterranean checks at z = -1
            const termShapeNeg1 = Levels.shapeAt({ area, x: cm.terminus.x, y: cm.terminus.y, z: -1 });
            const termCellNeg1 = Levels.cellAt({ area, x: cm.terminus.x, y: cm.terminus.y, z: -1 });
            assert(termShapeNeg1 === "stairUp", `Subterranean terminus at (${cm.terminus.x}, ${cm.terminus.y}, z=-1) has matching STAIR_UP (got ${termShapeNeg1})`);

            // Task 11 promise: the carve clears natural water on the terminus and its 3x3 vestibule (baseline water = 0).
            const bNeg1 = Levels.baseline(-1, area.x, area.y);
            let wetBaseline = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const vx = cm.terminus.x + dx, vy = cm.terminus.y + dy;
                    if (bNeg1 && bNeg1.water && bNeg1.water[vy * size + vx]) wetBaseline++;
                }
            }
            assert(!!bNeg1 && !!bNeg1.water && wetBaseline === 0, `Subterranean stair landing has natural water cleared in the z=-1 baseline (wet vestibule cells: ${wetBaseline})`);
            // The landing must also be dry once the fluid simulation has run (cellAt reports flood water). Since commit
            // 4eebef2 (2026-09-21) the DEUS_Levels flood BFS spreads natural z=-1 pools over the connected cavern floor,
            // which reaches this landing, so this check FAILS on the current plugins. That is a real plugin finding
            // (Task 11 dry-landing promise vs. the fluid simulation); it is asserted, never skipped or faked.
            console.log(`  Info: landing cell at z=-1 after fluid simulation: water=${termCellNeg1 && termCellNeg1.water}, flooded=${termCellNeg1 && termCellNeg1.flooded}, floodType=${termCellNeg1 && termCellNeg1.floodType}`);
            assert(!!termCellNeg1 && !termCellNeg1.water, `Subterranean stair landing is dry after the fluid simulation (cellAt.water=${termCellNeg1 && termCellNeg1.water}, flooded=${termCellNeg1 && termCellNeg1.flooded}, floodType=${termCellNeg1 && termCellNeg1.floodType})`);

            // Vestibule checks at z = -1
            let floorNeighbors = 0;
            for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                const ns = Levels.shapeAt({ area, x: cm.terminus.x + dx, y: cm.terminus.y + dy, z: -1 });
                if (ns === "floor" || ns === "ramp") floorNeighbors++;
            }
            assert(floorNeighbors >= 1, `Subterranean stair landing has walkable vestibule (found ${floorNeighbors} walkable neighbors)`);
        }

        // NaturalConnections registration
        const savedConnections = NaturalConnections.generate();
        assert(savedConnections && savedConnections.links && savedConnections.links.length > 0, "NaturalConnections generated passage links");
        const cliffLink = savedConnections.links.find(l => l.kind === "cliff_cave_passage");
        assert(!!cliffLink, `NaturalConnections registered cliff cave passage: id=${cliffLink && cliffLink.id}`);
        assert(cliffLink && cliffLink.a.z === 0 && cliffLink.b.z === -1, "Cliff cave link connects z=0 to z=-1");
    }

    // =========================================================================
    // Test 4: Structural Natural Rock Enclosure & Hybrid Rooms (Task 12)
    // =========================================================================
    console.log("\nTest 4: Structural Natural Rock Enclosure & Hybrid Rooms (Task 12)");
    if (!HOUSEHOLDS_ACTIVE) {
        for (const name of [
            "Created household for colonist",
            "All natural rock perimeter cells count as structural enclosure",
            "homeSteps requires 0 wall construction steps for rock boundary",
            "Cave room strictly enclosed with 100% natural rock boundary + door",
            "Cave room automatically roofed upon enclosure",
            "Cave dwelling satisfies bedroom demands",
            "Bed demands satisfied",
            "Hearth demand satisfied",
            "Hybrid room requires building only 10 wooden walls, omitting 5 natural cliff tiles",
            "Hybrid room enclosed successfully with combination of natural cliff and wooden walls",
            "Hybrid room roofed upon enclosure",
            "households:enclosureBreached event emitted when rock wall mined away",
            "strictEnclosure returns FALSE after rock wall breached",
            "isRoofed reset to FALSE after enclosure breached",
            "Household demands reflect missing bedroom after breach"
        ]) skip(name, HOUSEHOLDS_SKIP_REASON);
    } else {
        // Colonist unit
        const colonist = {
            id: ++nextUnitId,
            name: "Gimli",
            area: { x: 0, y: 0 },
            x: 20, y: 20, z: 0,
            data: { kind: "colonist", faction: "settler", age: 25, stage: "adult" }
        };
        unitsById[colonist.id] = colonist;

        // Household
        const household = Households.make(colonist);
        assert(household && household.id, `Created household ${household && household.id} for colonist`);

        // Test A: 100% Natural Rock Enclosed Cave Dwelling at z = -1
        console.log("  Subtest A: 100% Natural Rock Boundary (Underground Cave Room)");
        const caveRoomX = 20, caveRoomY = 20, zCave = -1;

        // Carve 3x3 interior space inside solid rock at z = -1
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                const rx = caveRoomX + dx, ry = caveRoomY + dy;
                if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
                    Levels.setShape({ area: { x: 0, y: 0 }, x: rx, y: ry, z: zCave }, "floor", { material: "stone" });
                } else {
                    Levels.setShape({ area: { x: 0, y: 0 }, x: rx, y: ry, z: zCave }, "solid", { material: "stone" });
                }
            }
        }

        // Room footprint: 5x5 exterior bounds (walls at perimeter dx=±2 or dy=±2, door at (caveRoomX, caveRoomY+2))
        const caveWalls = [];
        for (let y = caveRoomY - 2; y <= caveRoomY + 2; y++) {
            for (let x = caveRoomX - 2; x <= caveRoomX + 2; x++) {
                if (x === caveRoomX - 2 || x === caveRoomX + 2 || y === caveRoomY - 2 || y === caveRoomY + 2) {
                    if (!(x === caveRoomX && y === caveRoomY + 2)) {
                        caveWalls.push({ x, y });
                    }
                }
            }
        }
        const caveDoor = [{ x: caveRoomX, y: caveRoomY + 2 }];
        const caveFloors = [];
        for (let y = caveRoomY - 1; y <= caveRoomY + 1; y++) {
            for (let x = caveRoomX - 1; x <= caveRoomX + 1; x++) {
                caveFloors.push({ x, y });
            }
        }

        const caveHome = {
            x: caveRoomX - 2, y: caveRoomY - 2, w: 5, h: 5,
            walls: caveWalls,
            doors: caveDoor,
            floors: caveFloors,
            beds: [{ unitId: colonist.id, x: caveRoomX - 1, y: caveRoomY - 1 }],
            hearth: { x: caveRoomX, y: caveRoomY },
            storage: { x: caveRoomX + 1, y: caveRoomY + 1 },
            wall: "wall_stone",
            door: "door_wood"
        };
        household.z = zCave;
        household.area = { x: 0, y: 0 };
        household.home = caveHome;

        // Verify that all perimeter rock walls are recognized as structural enclosure
        const allRockStructural = caveWalls.every(w => Households.isStructuralEnclosure(household, w.x, w.y, zCave, caveHome.wall));
        assert(allRockStructural, `All ${caveWalls.length} natural rock perimeter cells count as structural enclosure`);

        // Check homeSteps: buildable walls should be EMPTY (no construction steps for rock!)
        const steps = Households.planSteps(colonist);
        const wallStep = steps && steps.find(s => s.id === `${household.id}_walls`);
        const buildableCount = wallStep && wallStep.cells ? wallStep.cells.length : 0;
        assert(buildableCount === 0, `homeSteps requires 0 wall construction steps for rock boundary (count: ${buildableCount})`);

        // Place door and furniture to complete room
        UF.Objects.place(caveHome.door, { area: { x: 0, y: 0, z: zCave }, x: caveDoor[0].x, y: caveDoor[0].y, z: zCave });
        UF.Objects.place("floor_straw", { area: { x: 0, y: 0, z: zCave }, x: caveHome.beds[0].x, y: caveHome.beds[0].y, z: zCave });
        UF.Objects.place("campfire", { area: { x: 0, y: 0, z: zCave }, x: caveHome.hearth.x, y: caveHome.hearth.y, z: zCave });
        UF.Objects.place("stockpile", { area: { x: 0, y: 0, z: zCave }, x: caveHome.storage.x, y: caveHome.storage.y, z: zCave });

        const caveEnclosed = Households.strictEnclosure(household, caveHome);
        assert(caveEnclosed, "Cave room strictly enclosed with 100% natural rock boundary + door");
        assert(caveHome.isRoofed === true, "Cave room automatically roofed upon enclosure");

        const caveDemands = Households.demands(household);
        assert(caveDemands.bedrooms === 0, `Cave dwelling satisfies bedroom demands (bedrooms missing: ${caveDemands.bedrooms})`);
        assert(caveDemands.beds === 0, `Bed demands satisfied (beds missing: ${caveDemands.beds})`);
        assert(caveDemands.cooking === 0, `Hearth demand satisfied`);

        // Test B: Hybrid Room Enclosure (Surface Cliff + Wooden Walls at z = 0)
        console.log("\n  Subtest B: Hybrid Room Boundary (Surface Cliff + Wooden Walls at z = 0)");
        const cliffRoomX = 60, cliffRoomY = 60, zCliff = 0;

        // North side is solid rock cliff face; rest is floor
        for (let dx = -2; dx <= 2; dx++) {
            Levels.setShape({ area: { x: 0, y: 0 }, x: cliffRoomX + dx, y: cliffRoomY - 2, z: zCliff }, "solid", { material: "stone" });
        }
        for (let dy = -1; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                Levels.setShape({ area: { x: 0, y: 0 }, x: cliffRoomX + dx, y: cliffRoomY + dy, z: zCliff }, "floor", { material: "soil" });
            }
        }

        const hybridWalls = [
            // North: natural cliff rock
            { x: cliffRoomX - 2, y: cliffRoomY - 2 }, { x: cliffRoomX - 1, y: cliffRoomY - 2 }, { x: cliffRoomX, y: cliffRoomY - 2 },
            { x: cliffRoomX + 1, y: cliffRoomY - 2 }, { x: cliffRoomX + 2, y: cliffRoomY - 2 },
            // West & East: wood
            { x: cliffRoomX - 2, y: cliffRoomY - 1 }, { x: cliffRoomX - 2, y: cliffRoomY }, { x: cliffRoomX - 2, y: cliffRoomY + 1 },
            { x: cliffRoomX + 2, y: cliffRoomY - 1 }, { x: cliffRoomX + 2, y: cliffRoomY }, { x: cliffRoomX + 2, y: cliffRoomY + 1 },
            // South: wood (door at center)
            { x: cliffRoomX - 2, y: cliffRoomY + 2 }, { x: cliffRoomX - 1, y: cliffRoomY + 2 },
            { x: cliffRoomX + 1, y: cliffRoomY + 2 }, { x: cliffRoomX + 2, y: cliffRoomY + 2 }
        ];
        const hybridDoor = [{ x: cliffRoomX, y: cliffRoomY + 2 }];
        const hybridFloors = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                hybridFloors.push({ x: cliffRoomX + dx, y: cliffRoomY + dy });
            }
        }

        const colonist2 = {
            id: ++nextUnitId,
            name: "Boromir",
            area: { x: 0, y: 0 },
            x: cliffRoomX, y: cliffRoomY, z: zCliff,
            data: { kind: "colonist", faction: "settler", age: 30, stage: "adult" }
        };
        unitsById[colonist2.id] = colonist2;

        const household2 = Households.make(colonist2);
        const hybridHome = {
            x: cliffRoomX - 2, y: cliffRoomY - 2, w: 5, h: 5,
            walls: hybridWalls,
            doors: hybridDoor,
            floors: hybridFloors,
            beds: [{ unitId: colonist2.id, x: cliffRoomX - 1, y: cliffRoomY - 1 }],
            hearth: { x: cliffRoomX, y: cliffRoomY },
            storage: { x: cliffRoomX + 1, y: cliffRoomY + 1 },
            wall: "wall_wood",
            door: "door_wood"
        };
        household2.z = zCliff;
        household2.area = { x: 0, y: 0 };
        household2.home = hybridHome;

        // Check build steps: only non-rock walls (west, east, south) need building (10 cells out of 15)
        const hybridSteps = Households.planSteps(colonist2);
        const hybridWallStep = hybridSteps.find(s => s.id === `${household2.id}_walls`);
        assert(hybridWallStep && hybridWallStep.cells.length === 10, `Hybrid room requires building only 10 wooden walls, omitting 5 natural cliff tiles (got ${hybridWallStep ? hybridWallStep.cells.length : 0})`);

        // Build the wooden walls and door
        if (hybridWallStep) {
            for (const wc of hybridWalls.filter(w => !Households.isNaturalRock(household2, w.x, w.y, zCliff))) {
                UF.Objects.place(hybridHome.wall, { area: { x: 0, y: 0, z: zCliff }, x: wc.x, y: wc.y, z: zCliff });
            }
        }
        UF.Objects.place(hybridHome.door, { area: { x: 0, y: 0, z: zCliff }, x: hybridDoor[0].x, y: hybridDoor[0].y, z: zCliff });
        UF.Objects.place("floor_straw", { area: { x: 0, y: 0, z: zCliff }, x: hybridHome.beds[0].x, y: hybridHome.beds[0].y, z: zCliff });
        UF.Objects.place("campfire", { area: { x: 0, y: 0, z: zCliff }, x: hybridHome.hearth.x, y: hybridHome.hearth.y, z: zCliff });
        UF.Objects.place("stockpile", { area: { x: 0, y: 0, z: zCliff }, x: hybridHome.storage.x, y: hybridHome.storage.y, z: zCliff });

        const hybridEnclosed = Households.strictEnclosure(household2, hybridHome);
        assert(hybridEnclosed, "Hybrid room enclosed successfully with combination of natural cliff and wooden walls");
        assert(hybridHome.isRoofed === true, "Hybrid room roofed upon enclosure");

        // Test C: Mining Breaches Natural Rock Structural Enclosure
        console.log("\n  Subtest C: Mining Breaches Structural Enclosure (Invalidation)");
        const breachX = cliffRoomX, breachY = cliffRoomY - 2; // North cliff wall cell

        // Mine the natural rock cell away (turns to floor)
        let breachedEventFired = false;
        UF.Events.once("households:enclosureBreached", () => { breachedEventFired = true; });

        const oldCell = Levels.cellAt({ area: { x: 0, y: 0 }, x: breachX, y: breachY, z: zCliff });
        Levels.setShape({ area: { x: 0, y: 0 }, x: breachX, y: breachY, z: zCliff }, "floor", { material: "stone" });
        const newCell = Levels.cellAt({ area: { x: 0, y: 0 }, x: breachX, y: breachY, z: zCliff });

        assert(breachedEventFired, "households:enclosureBreached event emitted when rock wall mined away");
        const afterBreachEnclosed = Households.strictEnclosure(household2, hybridHome);
        assert(!afterBreachEnclosed, "strictEnclosure returns FALSE after rock wall breached");
        assert(hybridHome.isRoofed === false, "isRoofed reset to FALSE after enclosure breached");

        const breachedDemands = Households.demands(household2);
        assert(breachedDemands.bedrooms === 1, `Household demands reflect missing bedroom after breach (missing: ${breachedDemands.bedrooms})`);
    }

    console.log(`\nTest Suite Summary: ${passed} passed, ${failed} failed, ${skipped} skipped.`);
    process.exit(failed > 0 ? 1 : 0);
}

runSuite().catch(err => {
    console.error("Test execution threw error:", err);
    process.exit(1);
});
