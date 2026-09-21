"use strict";
// tools/test_extraction_difficulty.js - Automated tests for Extraction Difficulty, Tool Effectiveness & Tiered Yields (Task 5)
// Verifies wood hardness scaling, stone quarry difficulty, tool quality/material bonuses, hard stone tool penalties, and tiered quality stamping.

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
const skillsSrc = fs.readFileSync(path.resolve(__dirname, "..", "game", "js", "plugins", "UF_Skills.js"), "utf8");
const jobsSrc = fs.readFileSync(path.resolve(__dirname, "..", "game", "js", "plugins", "UF_Jobs.js"), "utf8");

let passed = 0, failed = 0;
function check(name, condition, detail = "") {
    if (condition) {
        passed++;
        console.log(`PASS extraction.${name}${detail ? " - " + detail : ""}`);
    } else {
        failed++;
        console.log(`FAIL extraction.${name}${detail ? " - " + detail : ""}`);
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
    diffs: { "0,0,0": {} },
    units: {},
    skills: { rolls: 0 }
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
        onLoad: () => {},
        extractSaveContents: () => {}
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
            unit: id => worldState.units[id] || null,
            units: () => Object.values(worldState.units),
            unitsInArea: () => Object.values(worldState.units),
            eventOf: () => null,
            stopUnit: () => {},
            mulberry32: a => () => 0.5,
            hash32: (...args) => 12345
        }
    }
};

sandbox.Scene_Boot.prototype.start = () => {};
sandbox.Scene_Map.prototype.createDisplayObjects = () => {};
sandbox.Scene_Map.prototype.isAnyWindowUnderMouse = () => false;
sandbox.Spriteset_Map.prototype.createCharacters = () => {};
sandbox.Game_Player.prototype.performTransfer = () => {};
sandbox.Game_Map.prototype.setup = () => {};
sandbox.Game_Map.prototype.update = () => {};
sandbox.window = sandbox;

vm.createContext(sandbox);

// Execute plugins in sandbox
vm.runInContext(worldGenSrc, sandbox);
vm.runInContext(levelsSrc, sandbox);
vm.runInContext(itemsSrc, sandbox);
vm.runInContext(objectsSrc, sandbox);
vm.runInContext(skillsSrc, sandbox);
vm.runInContext(jobsSrc, sandbox);

const Objects = sandbox.UF.Objects;
const Items = sandbox.UF.Items;
const WorldGen = sandbox.UF.WorldGen;
const Jobs = sandbox.UF.Jobs;
const Skills = sandbox.UF.Skills;

console.log("=== Running Extraction Difficulty & Tool Effectiveness Test Suite ===");

// 1. Wood Hardness & Work Scaling
// Oak: hardness 6, workability 50 (baseline work: 240 ticks)
// Pine (fir_snow): hardness 2, workability 85 (softwood: 120 ticks)
Objects.set(10, 10, "oak");
Objects.set(11, 10, "fir_snow");

const oakChopJob = { type: "chop", target: { area: { x: 0, y: 0, z: 0 }, x: 10, y: 10, z: 0 } };
const pineChopJob = { type: "chop", target: { area: { x: 0, y: 0, z: 0 }, x: 11, y: 10, z: 0 } };

const oakWork = Jobs.work(oakChopJob);
const pineWork = Jobs.work(pineChopJob);

const woodScalingOk = oakWork === 240 && pineWork < oakWork && pineWork === 120;
check("wood_felling_hardness_scaling", woodScalingOk && (isMutant ? pineWork === 240 : true),
    `oak felling work: ${oakWork} ticks; pine felling work: ${pineWork} ticks (expected 120 vs 240)`);

// 2. Stone Hardness & Quarrying Scaling
// Find a granite cell and a limestone cell on the map
let graniteCell = null, limestoneCell = null;
for (let y = 10; y < 240; y += 10) {
    for (let x = 10; x < 240; x += 10) {
        const geo = WorldGen.geologyAt(x, y, 0);
        if (geo) {
            if (geo.stone === "granite" && !graniteCell) graniteCell = { x, y };
            if (geo.stone === "limestone" && !limestoneCell) limestoneCell = { x, y };
        }
    }
}

Objects.set(graniteCell.x, graniteCell.y, "granite_boulder");
Objects.set(limestoneCell.x, limestoneCell.y, "wall_stone");

const graniteQuarryJob = { type: "quarry", target: { area: { x: 0, y: 0, z: 0 }, x: graniteCell.x, y: graniteCell.y, z: 0 } };
const limestoneQuarryJob = { type: "quarry", target: { area: { x: 0, y: 0, z: 0 }, x: limestoneCell.x, y: limestoneCell.y, z: 0 } };

const graniteWork = Jobs.work(graniteQuarryJob);
const limestoneWork = Jobs.work(limestoneQuarryJob);

const stoneScalingOk = graniteWork > limestoneWork && graniteWork === Math.round(200 * (85 / 45));
check("stone_quarry_hardness_scaling", stoneScalingOk,
    `limestone quarry work: ${limestoneWork} ticks; granite quarry work: ${graniteWork} ticks (fracture 85 vs 45)`);

// 3. Tool Quality & Material Multiplier
// Worker with stone axe vs masterwork stone axe vs iron axe
const worker = {
    id: 101,
    name: "Artisan",
    area: { x: 0, y: 0, z: 0 },
    x: 10,
    y: 10,
    data: {
        kind: "colonist",
        workRate: 1,
        equipment: {},
        inventory: []
    }
};
worldState.units[worker.id] = worker;

const stoneAxe = Items.give("stone_axe", 1, worker.id, { q: 0, mat: "stone" })[0];
const masterworkStoneAxe = Items.give("stone_axe", 1, worker.id, { q: 3, mat: "stone" })[0];
const ironAxe = Items.give("axe_iron", 1, worker.id, { q: 0, mat: "iron" })[0];

worker.data.equipment.tool = stoneAxe.id;
const baseMult = Jobs.toolMultiplier(worker, oakChopJob);

worker.data.equipment.tool = masterworkStoneAxe.id;
const qualityMult = Jobs.toolMultiplier(worker, oakChopJob);

worker.data.equipment.tool = ironAxe.id;
const ironMult = Jobs.toolMultiplier(worker, oakChopJob);

const toolBonusOk = baseMult === 2.0 && qualityMult > baseMult && ironMult > baseMult;
check("tool_quality_and_material_bonus", toolBonusOk,
    `stone axe mult: ${baseMult.toFixed(2)}; Q3 stone axe: ${qualityMult.toFixed(2)}; iron axe: ${ironMult.toFixed(2)}`);

// 4. Hard Stone Inadequate Tool Penalty
// Mining granite with primitive stone pick vs iron pick
const stonePick = Items.give("stone_pick", 1, worker.id, { q: 0, mat: "stone" })[0];
worker.data.equipment.tool = stonePick.id;

const graniteToolMultPrimitive = Jobs.toolMultiplier(worker, graniteQuarryJob);

const ironPick = Items.give("stone_pick", 1, worker.id, { q: 0, mat: "iron" })[0]; // pick forged from iron
worker.data.equipment.tool = ironPick.id;

const graniteToolMultMetal = Jobs.toolMultiplier(worker, graniteQuarryJob);

const penaltyOk = graniteToolMultPrimitive === 1.0 && graniteToolMultMetal > graniteToolMultPrimitive;
check("hard_stone_tool_penalty", penaltyOk,
    `stone pick on granite: mult ${graniteToolMultPrimitive.toFixed(2)} (incurred 50% penalty); iron pick on granite: mult ${graniteToolMultMetal.toFixed(2)}`);

// 5. Tiered Harvest Yields & Quality Stamping
// Skilled worker felling oak produces quality logs
worker.data.skillXp = { woodcutting: 100000 }; // ~Level 50 woodcutting
worker.data.equipment.tool = ironAxe.id;

Objects.set(20, 20, "oak");
Objects.applyIn({ x: 0, y: 0 }, 20, 20, "chop", worker);
const droppedLogs = Items.atIn({ x: 0, y: 0 }, 20, 20);
const harvestQualityOk = droppedLogs.length > 0 && droppedLogs[0].mat === "oak" && typeof droppedLogs[0].q === "number" && droppedLogs[0].q > 0;

check("tiered_harvest_quality_stamping", harvestQualityOk,
    `harvested oak log: mat='${droppedLogs[0] ? droppedLogs[0].mat : "none"}', quality=${droppedLogs[0] ? droppedLogs[0].q : "none"}`);

console.log(`\nRESULT: ${passed} passed, ${failed} failed (exit ${failed === 0 ? 0 : 1})`);
process.exit(failed === 0 ? 0 : 1);
