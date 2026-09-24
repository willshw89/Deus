#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const ROOT = path.resolve(__dirname, "..");
const MODULES = ["World", "WorldGen", "Factions", "HistoricalDemographics", "Callings", "Dnd5e", "History", "Levels", "Objects", "Items", "Containers", "Stockpiles", "Colonists"];

function loadEngine() {
    const cat = JSON.parse(fs.readFileSync(path.join(ROOT, "game/data/UF_WorldCatalog.json"), "utf8"));
    const env = {
        window: null, UF: {}, DEUS: {}, Math: Object.create(Math), console, performance,
        PluginManager: { parameters: () => ({}), registerCommand() {} },
        DataManager: { _databaseFiles: [], onLoad() {}, isBattleTest: () => false, isEventTest: () => false },
        Input: { keyMapper: {} }, TouchInput: {}, SceneManager: { _scene: null },
        Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 }, $gameMap: { mapId: () => 0 }, $gamePlayer: {}, $gameSystem: {},
        ImageManager: { loadTileset() {} }, Utils: { isOptionValid: () => false },
        Scene_Boot: { prototype: { start() {} } },
        Tilemap: { FLOOR_AUTOTILE_TABLE: [], isTileA1: () => false, isWaterTile: () => false }, Sprite: function() {}
    };
    env.$ufWorldCatalog = cat;
    env.$deusWorldCatalog = cat;
    env.window = env;

    const filePaths = MODULES.map(m => `DEUS_${m}.js`);
    const sources = filePaths.map(f => fs.readFileSync(path.join(ROOT, "game/js/plugins", f), "utf8"));
    const names = new Set(["Sprite", "Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot", "Rectangle"]);
    for (const source of sources) for (const m of source.matchAll(/\b((?:Game|Scene|Window|Spriteset|Sprite)_[A-Za-z0-9_]+)\.prototype/g)) names.add(m[1]);
    for (const name of names) env[name] = function() {};
    for (const name of names) env[name].prototype = {};
    for (const source of sources) for (const m of source.matchAll(/\b((?:Game|Scene|Window|Spriteset|Sprite)_[A-Za-z0-9_]+)\.prototype\.([A-Za-z0-9_]+)/g)) {
        env[m[1]].prototype[m[2]] = () => {};
    }

    sources.forEach((src, i) => vm.runInNewContext(src, env, { filename: filePaths[i] }));
    return env;
}

console.log("=== Starter Kit & 9-Tile Stockpile Verification ===");

const env = loadEngine();
const { UF } = env;

// 1. Tool item types exist
const shovelType = UF.Items.type("shovel");
assert(shovelType, "shovel type must exist");
assert(shovelType.tags.includes("tool") && shovelType.tags.includes("shovel"), "shovel must have tool and shovel tags");

const pickType = UF.Items.type("pickaxe");
assert(pickType, "pickaxe type must exist");
assert(pickType.id === "stone_pick", "pickaxe must resolve to stone_pick");

const axeType = UF.Items.type("axe");
assert(axeType, "axe type must exist");
assert(axeType.id === "stone_axe", "axe must resolve to stone_axe");

console.log("PASS 1: Tool types (shovel, pickaxe, axe) exist and resolve correctly.");

// 2. World and history generation
const world = UF.World.newWorld(20260923);
UF.Levels.ensureWorldLevels(world);
UF.Factions.generate(world);
UF.History.generate(world);
UF.History.spawnFounders(world.state || world);
UF.Colonists.setup(world);

const site = world.history.sites[0];
assert(site, "At least one site must exist");
const area = site.area;
const z = site.z || 0;

// 3. Central chest and starter contents
const chestObj = UF.Containers.at(area, site.x, site.y, z);
assert(chestObj, `Central chest must exist at (${site.x}, ${site.y})`);

const chestItems = UF.Containers.itemsIn(chestObj.id);
console.log(`Starting chest contains ${chestItems.length} item stacks:`);
for (const it of chestItems) {
    console.log(`  - ${it.count}x ${it.type} (id: ${it.id})`);
}

const totalMeat = chestItems.filter(it => it.type === "meat_cooked").reduce((sum, it) => sum + (it.count | 0), 0);
assert(totalMeat === 16, `Must contain 16 meat_cooked (food for 8 people for 1 day), found: ${totalMeat}`);

const shovelItem = chestItems.find(it => it.type === "shovel");
assert(shovelItem && shovelItem.count === 1, "Must contain 1 shovel");

const pickItem = chestItems.find(it => it.type === "stone_pick" || it.type === "pickaxe");
assert(pickItem && pickItem.count === 1, "Must contain 1 pickaxe");

const axeItem = chestItems.find(it => it.type === "stone_axe" || it.type === "axe");
assert(axeItem && axeItem.count === 1, "Must contain 1 axe");

console.log("PASS 2: Central chest contains exact starter kit (16 cooked meat, 1 shovel, 1 pickaxe, 1 axe).");

// 4. Nine starting tiles are stockpile squares
const sp = UF.Stockpiles.at(area, site.x, site.y, z);
assert(sp, "Center cell must be inside a designated stockpile");
assert(sp.cells.length === 9, `Starting stockpile must have 9 cells, found ${sp.cells.length}`);

for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
        const cx = site.x + dx, cy = site.y + dy;
        const cellSp = UF.Stockpiles.at(area, cx, cy, z);
        assert(cellSp && cellSp.id === sp.id, `Tile (${cx}, ${cy}) must be part of the starting stockpile`);
    }
}

console.log("PASS 3: All 9 starting tiles (3x3 centered on chest) are designated as physical stockpile squares.");

// 5. Colony state inherits the 9 stockpile squares
const colony = UF.Colonists.state();
assert(colony, "Colony state must initialize");
assert(Array.isArray(colony.stockpiles) && colony.stockpiles.length === 9, `Colony state must have 9 stockpiles, found: ${colony.stockpiles ? colony.stockpiles.length : 0}`);

console.log("PASS 4: Colony state initializes with all 9 stockpile tiles.");

console.log("\nALL STARTER CHEST & STOCKPILE CHECKS PASSED!");
process.exit(0);
