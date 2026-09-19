const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');

const bushes = [
    { id: 'berry_bush_bare', name: 'Berry bush (picked)', rmmz: '!$UF_BerryBush_Bare', terrain: 'meadow' },
    { id: 'bush', name: 'Shrub', rmmz: '!$UF_Bush', terrain: 'meadow' },
    { id: 'desert_shrub', name: 'Desert shrub', rmmz: '!$UF_DesertShrub', terrain: 'sand' },
    { id: 'snow_bush', name: 'Snow bush', rmmz: '!$UF_SnowBush', terrain: 'snow' }
];

console.log('Exporting Batch 1 Bushes to standard RMMZ charsets...');

for (const b of bushes) {
    const masterPath = path.join(ROOT, 'art', 'masters', `${b.id}.png`);
    const master = decodePNG(fs.readFileSync(masterPath), b.id);

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

    const rmmzPngPath = path.join(ROOT, 'game', 'img', 'characters', `${b.rmmz}.png`);
    writePNG(rmmzPngPath, rmmzW, rmmzH, rmmzBuf);
    console.log(`  Saved RMMZ charset: ${rmmzPngPath}`);

    const rmmzJson = {
        id: b.id,
        name: b.name,
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: {
            stand: [0]
        },
        passable: true,
        under: false
    };
    const rmmzJsonPath = path.join(ROOT, 'game', 'img', 'characters', `${b.rmmz}.json`);
    fs.writeFileSync(rmmzJsonPath, JSON.stringify(rmmzJson, null, 2), 'utf8');
    console.log(`  Saved RMMZ sidecar: ${rmmzJsonPath}`);
}

console.log('All Batch 1 Bushes exported to game/img/characters/ successfully!');
