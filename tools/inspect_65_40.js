const fs = require('fs');
const UF = {};
global.window = { UF };
global.PluginManager = { parameters: () => ({}), registerCommand: () => {} };
global.Tilemap = { TILE_ID_A1: 2048, TILE_ID_A2: 2816, isTileA1: id => id >= 2048 && id < 2816 };
global.Game_System = { prototype: {} };
global.Game_Action = { prototype: {} };
global.Game_Battler = { prototype: {} };
global.Scene_Map = { prototype: {} };
global.Game_CharacterBase = { prototype: {} };
global.Scene_Boot = { prototype: {} };
global.Game_Player = { prototype: {} };
global.Game_Map = { prototype: {} };
global.Window_Base = class {};
global.Graphics = { width: 816, height: 624 };
global.ImageManager = { loadTileset: () => ({}) };
global.Bitmap = class { constructor() { this.context = { putImageData: () => {}, createImageData: () => ({ data: new Uint8ClampedArray(768*768*4) }), drawImage: () => {} }; this._baseTexture = { update: () => {} }; } };
global.document = { createElement: () => ({ width: 768, height: 768, getContext: () => ({ putImageData: () => {}, createImageData: () => ({ data: new Uint8ClampedArray(768*768*4) }), drawImage: () => {} }) }) };
global.DataManager = { onLoad: () => {}, isBattleTest: () => false, isEventTest: () => false, _databaseFiles: [] };
eval(fs.readFileSync('game/js/plugins/UF_Core.js', 'utf8'));
eval(fs.readFileSync('game/js/plugins/UF_WorldGen.js', 'utf8'));
eval(fs.readFileSync('game/js/plugins/UF_World.js', 'utf8'));
eval(fs.readFileSync('game/js/plugins/UF_Tiles.js', 'utf8'));
const cat = JSON.parse(fs.readFileSync('game/data/UF_WorldCatalog.json', 'utf8'));
global.window['$ufWorldCatalog'] = cat;

const map = UF.World.peekArea(0, 0);
const size = 256;
console.log('Inspecting (65, 40) region:');
for (let dy = -3; dy <= 3; dy++) {
    const y = 40 + dy;
    const row = [];
    for (let dx = -4; dx <= 4; dx++) {
        const x = 65 + dx;
        const t0 = map.data[y * size + x];
        const t1 = map.data[(1 * size + y) * size + x];
        const kd = UF.Tiles.kindOfTile(t0);
        const kId = kd ? kd.id : '?';
        const fam = UF.Tiles.familyOf(kId);
        row.push(`${kId}:${fam}:L1=${t1}`);
    }
    console.log(row.join(' | '));
}
