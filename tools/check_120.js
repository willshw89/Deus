const fs = require('fs');
global.window = {};
global.PluginManager = { parameters: () => ({}) };
global.Tilemap = { TILE_ID_A1: 2048, TILE_ID_A2: 2816, FLOOR_AUTOTILE_TABLE: Array(48).fill([[0,0],[0,0],[0,0],[0,0]]) };
global.DataManager = { isBattleTest: () => false, isEventTest: () => false, onLoad: () => {}, _databaseFiles: [] };
global.Scene_Boot = { prototype: {} };
const catalog = JSON.parse(fs.readFileSync('game/data/UF_WorldCatalog.json', 'utf8'));
global.$ufWorldCatalog = catalog;
window.$ufWorldCatalog = catalog;

eval(fs.readFileSync('game/js/plugins/UF_WorldGen.js', 'utf8'));
eval(fs.readFileSync('game/js/plugins/UF_World.js', 'utf8'));

const W = window.UF.World;
W.newWorld(12345);
const map = W.buildArea(0, 0);

console.log('Map built, size:', map.width);
for (let y = 120; y <= 135; y++) {
    let row = '';
    for (let x = 120; x <= 135; x++) {
        const t0 = map.data[y * 256 + x];
        const t1 = map.data[256 * 256 + y * 256 + x];
        row += `(${x},${y}):t0=${t0},t1=${t1} `;
    }
    console.log(row);
    break;
}
