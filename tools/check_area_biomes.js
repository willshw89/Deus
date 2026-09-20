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
global.DataManager = { onLoad: () => {}, isBattleTest: () => false, isEventTest: () => false, _databaseFiles: [] };
eval(fs.readFileSync('game/js/plugins/UF_Core.js', 'utf8'));
eval(fs.readFileSync('game/js/plugins/UF_WorldGen.js', 'utf8'));
const cat = JSON.parse(fs.readFileSync('game/data/UF_WorldCatalog.json', 'utf8'));
global.window['$ufWorldCatalog'] = cat;

const WG = UF.WorldGen;
const cfg = cat.groundShades;
const size = 256;
const cornersW = size + 1;
const fw = cfg.field.weights;
const d = WG.dims();
const cl = cat.climate;
const STEP = 8;
const subW = Math.floor((cornersW - 1) / STEP) + 1;
const subD = new Float32Array(subW * subW);

for (let sy = 0; sy < subW; sy++) {
    const cy = Math.min(cornersW - 1, sy * STEP);
    for (let sx = 0; sx < subW; sx++) {
        const cx = Math.min(cornersW - 1, sx * STEP);
        const nMain = WG.valueNoise(0, 0x5ade, cx, cy, cfg.field.scale * 2.5);
        const nDetail = WG.valueNoise(0, 0x5adf, cx, cy, cfg.field.detailScale * 2.5);
        const f = WG.fieldsFor(0, d, cl, cx, cy);
        const rainTerm = (1 - f.r) * fw.rain;
        const drainTerm = f.d * fw.drainage;
        const heightTerm = Math.max(0, f.e - 0.55) * fw.height;
        const val = nMain * fw.noise + nDetail * fw.detail + rainTerm + drainTerm + heightTerm;
        // Contrast expansion: centered at 0.5 with 1.6x dynamic range
        const centered = (val - 0.50) * 1.8 + 0.50;
        subD[sy * subW + sx] = Math.max(0, Math.min(1, centered));
    }
}

const minVal = Math.min(...subD), maxVal = Math.max(...subD);
console.log('Centered subD min:', minVal.toFixed(3), 'max:', maxVal.toFixed(3));

// Balanced meadow shares across all 11 steps in window [1, 11]
const balancedShares = [0.08, 0.10, 0.12, 0.14, 0.14, 0.12, 0.10, 0.08, 0.06, 0.04, 0.02];
const stepCounts = {};
for (const v of subD) {
    let s = 1, acc = 0;
    for (let i = 0; i < balancedShares.length; i++) {
        acc += balancedShares[i];
        if (v <= acc) { s = 1 + i; break; }
    }
    stepCounts[s] = (stepCounts[s] || 0) + 1;
}
console.log('Balanced step counts in area (0,0):', stepCounts);
