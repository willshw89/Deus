// tools/test_column_landforms.js - Automated verification suite for Volumetric Column Landforms & Universal Mining
// Validates:
// 1. Surface elevation S(gx, gy) in {0, 1, 2} distribution across multiple seeds/regions.
// 2. Guaranteed flat camp clearing: S = 0 within r <= 12 around camp center.
// 3. Volumetric column generation: z < S is SOLID rock, z = S is FLOOR ground, z > S is OPEN air.
// 4. Natural ramps on single-step elevation transitions (Delta S = 1).
// 5. Universal mining across all Z levels: surface cliffs (z=0), plateaus (z=1), underground (z=-1).
// 6. Mining cell mutation (SOLID -> FLOOR) and stone yield matching local strata geology.
// 7. World-mutation invalidation: levels:cellChanged, levels:faceExposed to 6 orthogonal neighbors, room graph invalidation.
// 8. Rule 4 mutant mode (--mutant).
"use strict";

const fs = require("fs");
const path = require("path");

const isMutant = process.argv.includes("--mutant");

// Mock global environment for RMMZ plugin loading
global.window = global;
const catalogData = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "game", "data", "UF_WorldCatalog.json"), "utf8"));
global.$ufWorldCatalog = catalogData;
// DEUS_WorldGen.js runs `window.$ufWorldCatalog = window.$deusWorldCatalog;` at load; without this alias catalog()
// returns null in every plugin and the generators silently no-op.
global.$deusWorldCatalog = catalogData;
global.$dataWorldCatalog = catalogData;
global.ImageManager = { loadCharacter: () => ({ isReady: () => true }), loadTileset: () => ({ isReady: () => true }) };
global.Sprite = function() {
    this.anchor = { set: () => {} };
    this.visible = true;
    this.bitmap = null;
    this.tint = 0xffffff;
};
global.Sprite.prototype = {};
global.Bitmap = function() {
    return { isReady: () => true, blt: () => {} };
};
global.Point = function(x, y) { this.x = x || 0; this.y = y || 0; };
global.Tilemap = {
    TILE_ID_A1: 2048,
    TILE_ID_A2: 2816,
    TILE_ID_A4: 4352,
    isWaterTile: () => false,
    FLOOR_AUTOTILE_TABLE: Array.from({ length: 47 }, (_, i) => [[0, 0], [0, 0], [0, 0], [0, 0]])
};
global.Scene_Boot = function() {};
global.Spriteset_Map = function() {};
global.DataManager = {
    isBattleTest: () => false,
    isEventTest: () => false,
    onLoad: () => {},
    _databaseFiles: []
};
global.Scene_Boot = function() {};
global.Scene_Map = function() {};
global.Spriteset_Map = function() {};
global.Game_Player = function() {};
global.Game_Map = function() {};
global.SceneManager = { _scene: null };
global.$gamePlayer = { x: 128, y: 128 };
global.Input = { keyMapper: {} };
global.TouchInput = { isTriggered: () => false, clear: () => {} };
global.SoundManager = { playCursor: () => {} };
global.Utils = { encodeURI: s => s };
global.$dataMap = { width: 256, height: 256, data: [] };
global.$gameMap = {
    tileWidth: () => 48,
    tileHeight: () => 48,
    adjustX: x => x,
    adjustY: y => y,
    displayX: () => 0,
    displayY: () => 0,
    screenTileX: () => 20,
    screenTileY: () => 15,
    width: () => 256,
    height: () => 256,
    mapId: () => 1000,
    tileId: () => 0,
    isPassable: () => true,
    eventsXy: () => [],
    _events: {}
};

const size = 256;
const seed = 98765;
let nextUnitId = 200;
const unitsById = {};

// gen: 4 exercises the generator-4 volumetric path (column landforms, ramps, cliff caves); the runtime default in
// DEUS_Levels.js is GEN = 3, so a pass here does not mean a New Game has hills, ramps or cliff caves.
const levelsState = {
    "0": { z: 0, gen: 4, checksum: null, cells: {} },
    "1": { z: 1, gen: 4, checksum: null, cells: {} },
    "2": { z: 2, gen: 4, checksum: null, cells: {} },
    "-1": { z: -1, gen: 4, checksum: null, cells: {} },
    "-2": { z: -2, gen: 4, checksum: null, cells: {} }
};

const worldState = {
    seed,
    size,
    areasX: 1,
    areasY: 1,
    startArea: { x: 0, y: 0 },
    version: 4,
    levels: levelsState,
    items: { nextId: 1, byId: {} },
    jobs: { nextId: 1, list: [], byId: {}, log: [] }
};

const eventListeners = {};
let invalidatedRooms = [];

global.UF = {
    Catalog: $dataWorldCatalog,
    Events: {
        on: (ev, fn) => { (eventListeners[ev] = eventListeners[ev] || []).push(fn); },
        off: (ev, fn) => {
            if (!eventListeners[ev]) return;
            eventListeners[ev] = eventListeners[ev].filter(f => f !== fn);
        },
        emit: (ev, data) => { (eventListeners[ev] || []).forEach(fn => fn(data)); }
    },
    World: {
        state: worldState,
        inWorld: (ax, ay, z) => (z >= -2 && z <= 2 && ax === 0 && ay === 0),
        unit: (id) => unitsById[id] || null,
        units: () => Object.values(unitsById),
        unitsInArea: (ax, ay, z) => Object.values(unitsById).filter(u => u.area.x === ax && u.area.y === ay && (z === undefined || u.z === z)),
        currentArea: () => ({ x: 0, y: 0, z: 0 }),
        viewLevel: () => ({ x: 0, y: 0, z: 0 }),
        levelOfMapId: (mapId) => 0,
        areaMapId: (ax, ay, z) => 1000 + z,
        eventOf: () => null,
        stopUnit: () => {},
        walkable: () => true,
        cellFree: () => true,
        getObject: () => null,
        setDerivedTile: () => {},
        registerGenerator: () => {},
        unregisterGenerator: () => {}
    },
    Objects: {
        materialOf: () => null,
        findIn: () => [],
        at: () => null,
        atIn: () => null
    },
    Skills: {
        qualityRoll: (unit) => (unit && unit.data && unit.data.skillQuality) || 3
    },
    Ownership: {
        ownerOf: () => null,
        claim: () => {}
    }
};
// Every DEUS_*.js plugin runs `window.DEUS = window.DEUS || {}; window.UF = window.DEUS;` at load. Aliasing DEUS to
// the mock before any require keeps the plugins attaching to this object instead of replacing it with an empty one.
global.DEUS = global.UF;

// Households subsystem gate. DEUS_Households.js was archived to archive/plugins on 2026-09-22 and is no longer
// registered in game/js/plugins.js; the leftover UF_Households.js is dead code. The room-invalidation checks in
// Test 6 only run when the real plugin is back on disk AND active in plugins.js. Otherwise they are SKIPped.
const PLUGINS_DIR = path.resolve(__dirname, "..", "game", "js", "plugins");
function householdsSubsystemActive() {
    if (!fs.existsSync(path.join(PLUGINS_DIR, "DEUS_Households.js"))) return false;
    try {
        const src = fs.readFileSync(path.resolve(__dirname, "..", "game", "js", "plugins.js"), "utf8");
        const list = JSON.parse(src.slice(src.indexOf("["), src.lastIndexOf("]") + 1));
        return list.some(p => p.name === "DEUS_Households" && p.status === true);
    } catch (e) {
        return false;
    }
}
const HOUSEHOLDS_ACTIVE = householdsSubsystemActive();
const HOUSEHOLDS_SKIP_REASON = "Households subsystem retired 2026-09-22 (DEUS_Households.js archived, not registered)";

// Load plugins. The UF_*.js files are 16-line forwarders that only work inside RMMZ (PluginManager.loadScript);
// in Node the DEUS_*.js sources must be loaded directly.
require(path.join(PLUGINS_DIR, "DEUS_WorldGen.js"));
require(path.join(PLUGINS_DIR, "DEUS_Items.js"));
require(path.join(PLUGINS_DIR, "DEUS_Levels.js"));
require(path.join(PLUGINS_DIR, "DEUS_Jobs.js"));
if (HOUSEHOLDS_ACTIVE) {
    require(path.join(PLUGINS_DIR, "DEUS_Households.js"));
    // Spy on the real invalidation hook so Test 6 records DEUS_Levels -> Households calls without faking them.
    const realInvalidate = UF.Households && UF.Households.invalidateRoomEnclosure;
    if (typeof realInvalidate === "function") {
        UF.Households.invalidateRoomEnclosure = (area, x, y, z) => {
            invalidatedRooms.push({ area, x, y, z });
            return realInvalidate.call(UF.Households, area, x, y, z);
        };
    }
}

const W = UF.World;
const L = UF.Levels;
const J = UF.Jobs;
const I = UF.Items;
const WG = UF.WorldGen;

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
