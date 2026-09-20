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
global.Game_Player = { prototype: {} };
global.Game_Map = { prototype: {} };
global.Game_CharacterBase = { prototype: {} };
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
eval(fs.readFileSync('game/js/plugins/UF_World.js', 'utf8'));
eval(fs.readFileSync('game/js/plugins/UF_Tiles.js', 'utf8'));
const cat = JSON.parse(fs.readFileSync('game/data/UF_WorldCatalog.json', 'utf8'));
global.window.$ufWorldCatalog = cat;

const map = UF.World.peekArea(0, 0);
const size = 256;
const counts = {};
const waterBodies = [];
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const t = map.data[y * size + x];
    if (t >= 2048 && t < 2816) {
      counts.water = (counts.water || 0) + 1;
      if (waterBodies.length < 10 && x % 16 === 0 && y % 16 === 0) {
        waterBodies.push({ x, y, tile: t });
      }
    } else {
      const k = UF.Tiles.kindOfTile(t);
      const name = k ? k.id : 'unknown';
      counts[name] = (counts[name] || 0) + 1;
    }
  }
}
console.log('Biome counts in area (0, 0):', counts);
console.log('Sample water spots:', waterBodies);
