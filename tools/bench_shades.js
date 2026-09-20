const fs = require('fs');
const UF = {};
global.window = { UF };
global.document = {
    createElement: () => ({
        width: 768, height: 768,
        getContext: () => ({
            putImageData: () => {},
            getImageData: () => ({ data: new Uint8ClampedArray(768 * 768 * 4) }),
            createImageData: () => ({ data: new Uint8ClampedArray(768 * 768 * 4) }),
            drawImage: () => {}
        })
    })
};
global.PluginManager = { parameters: () => ({}), registerCommand: () => {} };
global.Tilemap = { TILE_ID_A1: 2048, TILE_ID_A2: 2816, isTileA1: id => id >= 2048 && id < 2816 };
global.Game_System = { prototype: {} };
global.Scene_Boot = { prototype: {} };
global.DataManager = { onLoad: () => {}, isBattleTest: () => false, isEventTest: () => false, _databaseFiles: [] };
global.SceneManager = {};
global.Scene_Map = function() {};
global.Window_Base = class {};
global.Graphics = { width: 816, height: 624 };
global.ImageManager = { loadTileset: () => ({}) };
global.Bitmap = class {
    constructor() {
        this.context = {
            putImageData: () => {},
            getImageData: () => ({ data: new Uint8ClampedArray(768 * 768 * 4) }),
            createImageData: () => ({ data: new Uint8ClampedArray(768 * 768 * 4) }),
            drawImage: () => {}
        };
        this._baseTexture = { update: () => {} };
    }
};

eval(fs.readFileSync('game/js/plugins/UF_Core.js', 'utf8'));
eval(fs.readFileSync('game/js/plugins/UF_WorldGen.js', 'utf8'));
eval(fs.readFileSync('game/js/plugins/UF_Tiles.js', 'utf8'));
const cat = JSON.parse(fs.readFileSync('game/data/UF_WorldCatalog.json', 'utf8'));
global.window.$ufWorldCatalog = cat;

const size = 256;
const map = { width: size, height: size, tilesetId: 91, data: new Int32Array(size * size * 4) };
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const biome = x < 80 ? 2816 : (x < 160 ? 2816 + 48 : (x < 220 ? 2816 + 96 : 2816 + 144));
    map.data[y * size + x] = biome;
  }
}

// Warm up JIT
UF.Tiles.applyGroundShades(map, 0, 0);

const runs = 5;
let sum = 0;
for (let i = 0; i < runs; i++) {
    UF.Tiles.applyGroundShades(map, 0, 0);
    const ms = UF.Tiles.shadeStats().lastBuildMs;
    console.log(`Run ${i+1}: ${ms.toFixed(2)} ms`);
    sum += ms;
}
console.log(`Average: ${(sum / runs).toFixed(2)} ms`);
