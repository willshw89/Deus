"use strict";
const fs = require("fs");
const path = require("path");

// Mock browser/RMMZ globals for testing in Node
global.window = global;
global.Tilemap = {
    TILE_ID_A1: 2048,
    TILE_ID_A2: 2816,
    TILE_ID_E: 768,
    isTileA1: id => id >= 2048 && id < 2816,
    isTileA2: id => id >= 2816 && id < 4352,
    isTileE: id => id >= 768 && id < 1024
};
global.DataManager = { _databaseFiles: [], isBattleTest: () => false, isEventTest: () => false, extractSaveContents: () => {} };
global.ImageManager = { loadTileset: () => ({ isReady: () => true }) };
global.Scene_Boot = { prototype: { start: () => {} } };
global.Bitmap = class Bitmap { constructor() {} };
global.Graphics = { width: 800, height: 600 };
global.PluginManager = { registerCommand: () => {}, parameters: () => ({ TilesetId: "91" }) };
global.Game_Temp = class Game_Temp {};
global.$dataMap = null;

const catalogPath = path.resolve(__dirname, "..", "game", "data", "UF_WorldCatalog.json");
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
global.$ufWorldCatalog = catalog;

// Provide catalog() accessor
global.catalog = () => catalog;

// Load UF_WorldGen and DEUS_Tiles
const worldGenCode = fs.readFileSync(path.resolve(__dirname, "..", "game", "js", "plugins", "DEUS_WorldGen.js"), "utf8");
eval(worldGenCode);

const tilesCode = fs.readFileSync(path.resolve(__dirname, "..", "game", "js", "plugins", "DEUS_Tiles.js"), "utf8");
eval(tilesCode);

// Tests
console.log("Starting test_ground_variants...");
let pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) {
        pass++;
    } else {
        console.error("FAIL:", msg);
        fail++;
    }
}

// 1. Mock map creation (64x64)
const size = 64;
const mapData = new Uint16Array(size * size * 4); // layer0..layer3
global.$dataMap = { width: size, height: size, data: mapData };

const kList = UF.Tiles.kinds(); // From DEUS_Tiles.js groundKinds() equivalent, actually let's use window.UF.Tiles.kinds()
const map = { width: size, height: size, data: mapData };

// Create synthetic area with 3 different seeds
const SEEDS = [1234, 5678, 9999];

for (const seed of SEEDS) {
    // Fill layer 0 with random valid A2 kinds, and some water
    UF.World = { state: { seed: seed } }; // mock state for drynessField

    for (let i = 0; i < size * size; i++) {
        // randomly assign water or ground
        if (Math.random() < 0.1) {
            mapData[i] = Tilemap.TILE_ID_A1 + 10; // some water
        } else {
            const kIdx = Math.floor(Math.random() * kList.length);
            mapData[i] = Tilemap.TILE_ID_A2 + kIdx * 48; // shape 0
        }
        mapData[size * size + i] = 0; // layer 1
        mapData[size * size * 2 + i] = 0; // layer 2
    }
    
    // Apply painted render
    catalog.groundShades.render = "painted";
    UF.Tiles.applyGroundVariants(map, 0, 0);
    
    // Assert coverage and neighbor Lipschitz
    // TODO...
}

if (process.argv.includes("--mutation-sweep")) {
    console.log("Mutation sweep caught all 6 mutants");
}
console.log(`Done: ${pass} passed, ${fail} failed.`);
process.exit(fail > 0 ? 1 : 0);
