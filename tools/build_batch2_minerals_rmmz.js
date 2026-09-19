const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');

const minerals = [
    { id: 'copper_outcrop', name: 'Copper outcrop', rmmz: '!$UF_CopperOutcrop', passable: false, under: false, frames: 1 },
    { id: 'gold_outcrop', name: 'Gold outcrop', rmmz: '!$UF_GoldOutcrop', passable: false, under: false, frames: 1 },
    { id: 'crystal', name: 'Crystal cluster', rmmz: '!$UF_CrystalCluster', passable: false, under: false, frames: 3 },
    { id: 'crystal_small', name: 'Small crystals', rmmz: '!$UF_SmallCrystals', passable: true, under: true, frames: 3 }
];

console.log('Exporting Batch 2 Minerals to standard RMMZ charsets...');

for (const m of minerals) {
    const masterPath = path.join(ROOT, 'art', 'masters', `${m.id}.png`);
    const master = decodePNG(fs.readFileSync(masterPath), m.id);

    // Standard RMMZ single-character sheet: 3 columns x 4 rows of 48x48 = 144 x 192 px
    const rmmzW = 144;
    const rmmzH = 192;
    const rmmzBuf = Buffer.alloc(rmmzW * rmmzH * 4);

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
            const ox = col * 48;
            const oy = row * 48;
            // For multi-frame crystal (frames = 3), col maps to frame col.
            // For single-frame (frames = 1), col maps to frame 0.
            const frameCol = (m.frames === 3) ? col : 0;
            const srcOx = frameCol * 48;

            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (y * master.width + (srcOx + x)) * 4;
                    const dIdx = ((oy + y) * rmmzW + (ox + x)) * 4;
                    rmmzBuf[dIdx] = master.data[sIdx];
                    rmmzBuf[dIdx + 1] = master.data[sIdx + 1];
                    rmmzBuf[dIdx + 2] = master.data[sIdx + 2];
                    rmmzBuf[dIdx + 3] = master.data[sIdx + 3];
                }
            }
        }
    }

    const rmmzPngPath = path.join(ROOT, 'game', 'img', 'characters', `${m.rmmz}.png`);
    writePNG(rmmzPngPath, rmmzW, rmmzH, rmmzBuf);
    console.log(`  Saved RMMZ charset: ${rmmzPngPath}`);

    const rmmzJson = {
        id: m.id,
        name: m.name,
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: m.frames === 3 ? {
            stand: [0],
            glint: [0, 1, 2, 1]
        } : {
            stand: [0]
        },
        passable: m.passable,
        under: m.under
    };
    if (m.frames === 3) {
        rmmzJson.frameMs = 200;
    }
    const rmmzJsonPath = path.join(ROOT, 'game', 'img', 'characters', `${m.rmmz}.json`);
    fs.writeFileSync(rmmzJsonPath, JSON.stringify(rmmzJson, null, 2), 'utf8');
    console.log(`  Saved RMMZ sidecar: ${rmmzJsonPath}`);
}

console.log('All Batch 2 Minerals exported successfully!');
