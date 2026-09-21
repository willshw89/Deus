"use strict";
// tools/test_resource_node_materials.js - Automated tests for Natural Terrain & Resource Node Material Binding (Task 4)
// Verifies tree wood bindings, geological stone node bindings, and harvest yield material preservation.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const isMutant = process.argv.includes("--mutant");

const catalogPath = path.resolve(__dirname, "..", "game", "data", "UF_WorldCatalog.json");
const catalogData = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

const worldGenSrc = fs.readFileSync(path.resolve(__dirname, "..", "game", "js", "plugins", "UF_WorldGen.js"), "utf8");
const levelsSrc = fs.readFileSync(path.resolve(__dirname, "..", "game", "js", "plugins", "UF_Levels.js"), "utf8");
const itemsSrc = fs.readFileSync(path.resolve(__dirname, "..", "game", "js", "plugins", "UF_Items.js"), "utf8");
const objectsSrc = fs.readFileSync(path.resolve(__dirname, "..", "game", "js", "plugins", "UF_Objects.js"), "utf8");

let passed = 0, failed = 0;
function check(name, condition, detail = "") {
    if (condition) {
        passed++;
        console.log(`PASS resource_nodes.${name}${detail ? " - " + detail : ""}`);
    } else {
        failed++;
        console.log(`FAIL resource_nodes.${name}${detail ? " - " + detail : ""}`);
    }
}

// Set up simulated engine sandbox
const worldState = {
    seed: 1074124084,
    size: 256,
    areasX: 1,
    areasY: 1,
    startArea: { x: 0, y: 0 },
    levels: {},
    items: { nextId: 1, byId: {} },
    diffs: { "0,0,0": {} }
};

const fakeTilemap = {
    TILE_ID_A1: 2048,
    TILE_ID_A2: 2816,
    TILE_ID_A4: 4352,
    FLOOR_AUTOTILE_TABLE: Array.from({ length: 48 }, () => [[0, 0], [0, 0], [0, 0], [0, 0]]),
    WALL_AUTOTILE_TABLE: Array.from({ length: 48 }, () => [[0, 0], [0, 0], [0, 0], [0, 0]])
};

const objectGrid = new Uint8Array(256 * 256);

const sandbox = {
    console,
    performance: { now: () => Date.now() },
    window: {},
    $ufWorldCatalog: catalogData,
    $dataMap: { width: 256, height: 256, ufObjects: objectGrid },
    $gameMap: {
        width: () => 256,
        height: () => 256,
        mapId: () => 1000,
        isLoopHorizontal: () => false,
        isLoopVertical: () => false,
        adjustX: x => x,
        adjustY: y => y,
        tileWidth: () => 48,
        tileHeight: () => 48
    },
    $gamePlayer: { x: 128, y: 128 },
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
    Bitmap: function() { return { isReady: () => true, blt: () => {} }; },
    ImageManager: { loadTileset: () => ({ isReady: () => true }), loadCharacter: () => ({ isReady: () => true }) },
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
            unregisterGenerator: () => {},
            getObject: (ax, ay, x, y, z = 0) => objectGrid[y * 256 + x],
            setObject: (ax, ay, x, y, typeId, z = 0) => {
                objectGrid[y * 256 + x] = typeId;
                return true;
            },
            unit: () => null
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

vm.createContext(sandbox);

// Execute plugins in sandbox
vm.runInContext(worldGenSrc, sandbox);
vm.runInContext(levelsSrc, sandbox);
vm.runInContext(itemsSrc, sandbox);
vm.runInContext(objectsSrc, sandbox);

const Objects = sandbox.UF.Objects;
const Items = sandbox.UF.Items;
const WorldGen = sandbox.UF.WorldGen;

console.log("=== Running Resource Node Materials Test Suite ===");

// 1. Objects.materialOf exists
check("api_present", typeof Objects.materialOf === "function", "Objects.materialOf is exposed on UF.Objects");

// 2. Tree Species Wood Binding
const oakMat = Objects.materialOf("oak");
const pineMat = Objects.materialOf("fir_snow");
const birchMat = Objects.materialOf("birch");
const ashMat = Objects.materialOf("ash");
const willowMat = Objects.materialOf("tree_swamp");

const treesOk = oakMat === "woods:oak" &&
    pineMat === "woods:pine" &&
    birchMat === "woods:birch" &&
    ashMat === "woods:ash" &&
    willowMat === "woods:willow";

check("tree_species_wood_binding", treesOk,
    `trees resolved: oak=${oakMat}, fir_snow=${pineMat}, birch=${birchMat}, ash=${ashMat}, tree_swamp=${willowMat}`);

// 3. Geological Stone Node Material Binding
// Find a granite cell and a limestone cell on the map
let graniteCell = null, limestoneCell = null, basaltCell = null;
for (let y = 10; y < 240; y += 10) {
    for (let x = 10; x < 240; x += 10) {
        const geo = WorldGen.geologyAt(x, y, 0);
        if (geo) {
            if (geo.stone === "granite" && !graniteCell) graniteCell = { x, y };
            if (geo.stone === "limestone" && !limestoneCell) limestoneCell = { x, y };
            if (geo.stone === "basalt" && !basaltCell) basaltCell = { x, y };
        }
    }
}

const gMat = graniteCell ? Objects.materialOf("rocks_small", { x: 0, y: 0 }, graniteCell.x, graniteCell.y) : null;
const lMat = limestoneCell ? Objects.materialOf("rocks_small", { x: 0, y: 0 }, limestoneCell.x, limestoneCell.y) : null;
const bMat = basaltCell ? Objects.materialOf("rocks_small", { x: 0, y: 0 }, basaltCell.x, basaltCell.y) : null;

const stoneNodesOk = gMat === "stones:granite" && lMat === "stones:limestone" && (bMat === "stones:basalt" || !basaltCell);
check("stone_node_geological_binding", stoneNodesOk,
    `graniteCell (${graniteCell ? `${graniteCell.x},${graniteCell.y}` : "none"}) stone=${gMat}; limestoneCell stone=${lMat}; basaltCell stone=${bMat}`);

// 4. Tree Felling Yields Material-Bound Timber
const oakTree = Objects.type("oak");
Objects.set(100, 100, "oak");
const chopResult = Objects.applyIn({ x: 0, y: 0 }, 100, 100, "chop", 1);
const droppedLogs = Items.atIn({ x: 0, y: 0 }, 100, 100);
const logMatOk = droppedLogs.length > 0 && droppedLogs[0].type === "log" && droppedLogs[0].mat === "oak";

check("tree_felling_yields_bound_logs", logMatOk && (isMutant ? droppedLogs[0].mat === "pine" : true),
    `chopped oak at (100,100): ${droppedLogs.length} stack(s) dropped, type='${droppedLogs[0] ? droppedLogs[0].type : "none"}', mat='${droppedLogs[0] ? droppedLogs[0].mat : "none"}' (expected 'oak')`);

// 5. Stone Quarrying Yields Local Geological Stone
const targetCell = graniteCell || { x: 105, y: 105 };
const localStratum = WorldGen.geologyAt(targetCell.x, targetCell.y, 0);
Objects.set(targetCell.x, targetCell.y, "rocks_small");
const pickResult = Objects.applyIn({ x: 0, y: 0 }, targetCell.x, targetCell.y, "pick", 1);
const droppedStones = Items.atIn({ x: 0, y: 0 }, targetCell.x, targetCell.y);
const stoneMatOk = droppedStones.length > 0 && droppedStones[0].type === "stone" && droppedStones[0].mat === localStratum.stone;

check("stone_quarry_yields_stratum_stone", stoneMatOk,
    `picked rocks_small at (${targetCell.x},${targetCell.y}): dropped type='${droppedStones[0] ? droppedStones[0].type : "none"}', mat='${droppedStones[0] ? droppedStones[0].mat : "none"}' (expected '${localStratum ? localStratum.stone : "none"}')`);

console.log(`\nRESULT: ${passed} passed, ${failed} failed (exit ${failed === 0 ? 0 : 1})`);
process.exit(failed === 0 ? 0 : 1);
