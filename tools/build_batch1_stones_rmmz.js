const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');

const stones = [
    { id: 'granite_boulder', name: 'Granite boulder', rmmz: '!$UF_GraniteBoulder', passable: false, under: false },
    { id: 'ironstone', name: 'Ironstone outcrop', rmmz: '!$UF_IronstoneDeposit', passable: false, under: false },
    { id: 'rocks_small', name: 'Loose stones', rmmz: '!$UF_LooseStones', passable: true, under: true },
    { id: 'gravel', name: 'Gravel', rmmz: '!$UF_Gravel', passable: true, under: true }
];

console.log('Exporting Batch 1 Stones & Ore to standard RMMZ charsets...');

for (const s of stones) {
    const masterPath = path.join(ROOT, 'art', 'masters', `${s.id}.png`);
    const master = decodePNG(fs.readFileSync(masterPath), s.id);

    // Standard RMMZ single-character sheet: 3 columns x 4 rows of 48x48 = 144 x 192 px
    const rmmzW = 144;
    const rmmzH = 192;
    const rmmzBuf = Buffer.alloc(rmmzW * rmmzH * 4);

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
            const ox = col * 48;
            const oy = row * 48;
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (y * 48 + x) * 4;
                    const dIdx = ((oy + y) * rmmzW + (ox + x)) * 4;
                    rmmzBuf[dIdx] = master.data[sIdx];
                    rmmzBuf[dIdx + 1] = master.data[sIdx + 1];
                    rmmzBuf[dIdx + 2] = master.data[sIdx + 2];
                    rmmzBuf[dIdx + 3] = master.data[sIdx + 3];
                }
            }
        }
    }

    const rmmzPngPath = path.join(ROOT, 'game', 'img', 'characters', `${s.rmmz}.png`);
    writePNG(rmmzPngPath, rmmzW, rmmzH, rmmzBuf);
    console.log(`  Saved RMMZ charset: ${rmmzPngPath}`);

    const rmmzJson = {
        id: s.id,
        name: s.name,
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: {
            stand: [0]
        },
        passable: s.passable,
        under: s.under
    };
    const rmmzJsonPath = path.join(ROOT, 'game', 'img', 'characters', `${s.rmmz}.json`);
    fs.writeFileSync(rmmzJsonPath, JSON.stringify(rmmzJson, null, 2), 'utf8');
    console.log(`  Saved RMMZ sidecar: ${rmmzJsonPath}`);
}

console.log('All Batch 1 Stones & Ore exported successfully!');
