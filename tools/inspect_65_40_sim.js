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
global.Tilemap = { TILE_ID_A1: 2048, TILE_ID_A2: 2816, isTileA1: id => id >= 2048 && id < 2816, isTileA2: id => id >= 2816 && id < 4352 };
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

// Build area (0, 0)
const st = { seed: 12345, size: 256, areasX: 1, areasY: 1, startArea: { x: 0, y: 0 } };
global.window.UF.World = { state: st };

// Classify cells as UF_WorldGen does
const d = UF.WorldGen.dims(st);
const cl = cat.climate;
const seed = st.seed;

// Fill map data using UF_WorldGen logic
for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
        const f = UF.WorldGen.fieldsFor(seed, d, cl, x, y);
        // Biome ground kind
        // Look up biome
        const bKey = f.sal > 0.8 && f.t > 0.65 && f.r > 0.75 ? "swamp_mangrove" :
                     (f.e < cl.seaLevel ? (f.t < 0.2 ? "ocean_arctic" : f.t < 0.65 ? "ocean_temperate" : "ocean_tropical") :
                     (f.e >= cl.mountainLevel ? "mountain" :
                     (f.t < 0.12 ? "glacier" :
                     (f.t < 0.25 ? "tundra" :
                     (f.r > 0.6 && f.d < 0.35 ? "marsh_temperate_fresh" :
                     (f.t < 0.45 ? (f.r > 0.5 ? "taiga" : "forest_temperate") :
                     (f.r < 0.2 ? (f.e > 0.65 ? "desert_badland" : f.d < 0.3 ? "desert_sand" : "desert_rock") :
                     (f.r < 0.35 ? (f.t > 0.65 ? "savanna_tropical" : "savanna_temperate") :
                     (f.r < 0.5 ? (f.t > 0.65 ? "shrubland_tropical" : "shrubland_temperate") :
                     (f.r < 0.7 ? "grassland_temperate" : "forest_temperate"))))))))));
        const bDef = cat.biomes[bKey] || cat.biomes.grassland_temperate;
        const gKindId = bDef.ground || "meadow";
        const kIdx = cat.groundKinds.findIndex(g => g.id === gKindId);
        map.data[y * size + x] = Tilemap.TILE_ID_A2 + (kIdx >= 0 ? kIdx : 0) * 48;
    }
}

// Now apply ground shades
UF.Tiles.applyGroundShades(map, 0, 0);

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
        row.push(`(${x},${y}): ${kId}:${fam} L1=${t1}`);
    }
    console.log(row.join(' | '));
}
