"use strict";
// tools/test_geology_strata.js - Automated tests for Geological Stratum Generation (Z=0, Z=-1, Z=-2)
// Verifies physical stone properties, stratum mapping, determinism, depth bands, and integration.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const isMutant = process.argv.includes("--mutant");

const catalogPath = path.resolve(__dirname, "..", "game", "data", "UF_WorldCatalog.json");
const catalogData = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

const worldGenSrc = fs.readFileSync(path.resolve(__dirname, "..", "game", "js", "plugins", "DEUS_WorldGen.js"), "utf8");
const levelsSrc = fs.readFileSync(path.resolve(__dirname, "..", "game", "js", "plugins", "DEUS_Levels.js"), "utf8");

let passed = 0, failed = 0;
function check(name, condition, detail = "") {
    if (condition) {
        passed++;
        console.log(`PASS geology.${name}${detail ? " - " + detail : ""}`);
    } else {
        failed++;
        console.log(`FAIL geology.${name}${detail ? " - " + detail : ""}`);
    }
}

// Set up simulated engine sandbox
const worldState = {
    seed: 1074124084,
    size: 256,
    areasX: 1,
    areasY: 1,
    startArea: { x: 0, y: 0 },
    levels: {}
};

const fakeTilemap = {
    TILE_ID_A1: 2048,
    TILE_ID_A2: 2816,
    TILE_ID_A4: 4352,
    FLOOR_AUTOTILE_TABLE: Array.from({ length: 48 }, () => [[0, 0], [0, 0], [0, 0], [0, 0]]),
    WALL_AUTOTILE_TABLE: Array.from({ length: 48 }, () => [[0, 0], [0, 0], [0, 0], [0, 0]])
};

const sandbox = {
    console,
    performance: { now: () => Date.now() },
    window: {},
    $ufWorldCatalog: catalogData,
    $deusWorldCatalog: catalogData, // DEUS_WorldGen.js sets window.$ufWorldCatalog = window.$deusWorldCatalog at load, so both names must hold the catalog
    DataManager: {
        isBattleTest: () => false,
        isEventTest: () => false,
        _databaseFiles: [],
        onLoad: () => {}
    },
    Scene_Boot: function() {},
    Scene_Map: function() {},
    Spriteset_Map: function() {},
    Sprite: function() {},
    Game_Player: function() {},
    Game_Map: function() {},
    SceneManager: { _scene: null },
    $gameMap: { width: () => 256, height: () => 256, mapId: () => 1000 },
    $gamePlayer: { x: 128, y: 128 },
    Bitmap: function() { return { isReady: () => true, blt: () => {} }; },
    ImageManager: { loadTileset: () => ({ isReady: () => true }) },
    Tilemap: fakeTilemap,
    Input: { keyMapper: {} },
    TouchInput: { isTriggered: () => false, clear: () => {} },
    SoundManager: { playCursor: () => {} },
    Utils: { encodeURI: s => s },
    UF: {
        Events: { on: () => {}, emit: () => {} },
        World: {
            state: worldState,
            inWorld: (x, y, z) => true,
            currentArea: () => ({ x: 0, y: 0, z: 0 }),
            viewLevel: () => ({ x: 0, y: 0, z: 0 }),
            registerGenerator: () => {},
            unregisterGenerator: () => {}
        }
    }
};

sandbox.Scene_Boot.prototype.start = () => {};
sandbox.Scene_Map.prototype.createDisplayObjects = () => {};
sandbox.Scene_Map.prototype.isAnyWindowUnderMouse = () => false;
sandbox.Spriteset_Map.prototype.createCharacters = () => {};
sandbox.Game_Player.prototype.performTransfer = () => {};
sandbox.Game_Map.prototype.setup = () => {};
sandbox.window = sandbox;
sandbox.DEUS = sandbox.UF; // every DEUS_*.js runs `window.DEUS = window.DEUS || {}; window.UF = window.DEUS;` at load: alias first so the mock namespace survives

vm.createContext(sandbox);

// Execute DEUS_WorldGen and DEUS_Levels in sandbox (the UF_*.js files are RMMZ-only forwarders since 2026-09-22)
vm.runInContext(worldGenSrc, sandbox);
vm.runInContext(levelsSrc, sandbox);

const WorldGen = sandbox.UF.WorldGen;
const Levels = sandbox.UF.Levels;
const stones = catalogData.materials.stones;

console.log("=== Running Geological Strata Test Suite ===");

// 1. API Existence
check("api_present", typeof WorldGen.geologyAt === "function" && typeof Levels.stratumAt === "function",
    "WorldGen.geologyAt and Levels.stratumAt are defined");

// 2. Surface Geology (Z=0) Physical Mapping
const surfaceSamples = [];
const stoneCounts = {};
for (let y = 16; y < 240; y += 16) {
    for (let x = 16; x < 240; x += 16) {
        const g = WorldGen.geologyAt(x, y, 0);
        if (g) {
            surfaceSamples.push(g);
            stoneCounts[g.stone] = (stoneCounts[g.stone] || 0) + 1;
        }
    }
}

const allValidStones = surfaceSamples.every(s => stones[s.stone] && s.name === stones[s.stone].name);
const stoneTypesFound = Object.keys(stoneCounts).length;
check("surface_strata_valid", surfaceSamples.length > 100 && allValidStones && (isMutant ? stoneTypesFound < 2 : stoneTypesFound >= 4),
    `sampled ${surfaceSamples.length} cells: ${stoneTypesFound} stone types found (${Object.keys(stoneCounts).join(", ")}), all match catalog`);

// 3. Determinism
const c1 = WorldGen.geologyAt(128, 128, 0);
const c2 = WorldGen.geologyAt(128, 128, 0);
check("determinism", !!c1 && !!c2 && c1.stone === c2.stone && c1.density === c2.density,
    `cell (128,128) produced identical stone '${c1 ? c1.stone : "none"}' across repeated calls`);

// 4. Physical Properties Attached
check("physical_properties_attached", c1 && typeof c1.density === "number" && typeof c1.compressiveStrength === "number" && typeof c1.workability === "number",
    `stone ${c1 ? c1.name : "none"}: density ${c1 ? c1.density : "n/a"}, compressiveStrength ${c1 ? c1.compressiveStrength : "n/a"}, workability ${c1 ? c1.workability : "n/a"}`);

// 5. Upper Earth Strata (Z=-1)
const upperEarthSample = WorldGen.geologyAt(64, 64, -1);
check("upper_earth_strata", !!upperEarthSample && upperEarthSample.depthBand === "upper_earth" && ["limestone", "sandstone", "slate"].includes(upperEarthSample.stone),
    `Z=-1 stratum: stone '${upperEarthSample ? upperEarthSample.stone : "none"}', depthBand '${upperEarthSample ? upperEarthSample.depthBand : "none"}'`);

// 6. Deep Earth Strata (Z=-2)
const deepEarthSample = WorldGen.geologyAt(64, 64, -2);
check("deep_earth_strata", !!deepEarthSample && deepEarthSample.depthBand === "deep" && ["granite", "marble", "basalt", "limestone", "slate"].includes(deepEarthSample.stone),
    `Z=-2 stratum: stone '${deepEarthSample ? deepEarthSample.stone : "none"}', depthBand '${deepEarthSample ? deepEarthSample.depthBand : "none"}'`);

// 7. Levels.stratumAt Integration
const refStratum = Levels.stratumAt({ area: { x: 0, y: 0 }, x: 128, y: 128, z: 0 });
check("levels_stratum_at", !!refStratum && refStratum.stone === c1.stone,
    `Levels.stratumAt matches WorldGen.geologyAt: ${refStratum ? refStratum.stone : "none"}`);

// 8. WorldGen.cellInfo Integration
const cellInfo = WorldGen.cellInfo(128, 128, 0);
check("cell_info_contains_geology", !!cellInfo && !!cellInfo.geology && cellInfo.geology.stone === c1.stone,
    `WorldGen.cellInfo(128,128,0) includes geology: stone '${cellInfo && cellInfo.geology ? cellInfo.geology.stone : "none"}'`);

// 9. Levels.cellAt Integration
const levelCell = Levels.cellAt({ area: { x: 0, y: 0 }, x: 64, y: 64, z: -1 });
check("levels_cell_at_contains_stratum", !!levelCell && !!levelCell.stratum,
    `Levels.cellAt(64,64,-1) includes stratum: stone '${levelCell && levelCell.stratum ? levelCell.stratum.stone : "none"}'`);

console.log(`\nRESULT: ${passed} passed, ${failed} failed (exit ${failed === 0 ? 0 : 1})`);
process.exit(failed === 0 ? 0 : 1);
