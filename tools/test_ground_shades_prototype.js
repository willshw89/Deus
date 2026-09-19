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

const catalog = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "game", "data", "UF_WorldCatalog.json"), "utf8"));
global.$ufWorldCatalog = catalog;

// Load UF_WorldGen to test resolve and fields
const worldGenCode = fs.readFileSync(path.resolve(__dirname, "..", "game", "js", "plugins", "UF_WorldGen.js"), "utf8");
eval(worldGenCode);

console.log("Loaded catalog and UF_WorldGen. Testing climate fields and ground families...");

const families = catalog.groundShades.families;
console.log("Ground shade families:", Object.keys(families));

const kindToFamily = {};
for (const [famName, fam] of Object.entries(families)) {
    for (const kindId of Object.keys(fam.kinds)) {
        kindToFamily[kindId] = famName;
    }
}
console.log("Mapped kinds to families:", Object.keys(kindToFamily).length);
