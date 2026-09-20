'use strict';

const fs = require('fs');
const { decodePNG } = require('./png_read');

const img = decodePNG(fs.readFileSync('game/img/characters/$UF_Human_Male_Walk.png'));

for (let row = 0; row < 4; row++) {
    const rowName = ['South', 'West', 'East', 'North'][row];
    console.log(`=== ${rowName} (Row ${row}) ===`);
    // Compare col 0 vs col 1, col 1 vs col 2, col 0 vs col 2
    for (let c1 = 0; c1 < 3; c1++) {
        for (let c2 = c1 + 1; c2 < 3; c2++) {
            let diffs = 0;
            let legDiffs = 0;
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const idx1 = ((row * 48 + y) * 144 + (c1 * 48 + x)) * 4;
                    const idx2 = ((row * 48 + y) * 144 + (c2 * 48 + x)) * 4;
                    const a1 = img.data[idx1+3], a2 = img.data[idx2+3];
                    const r1 = img.data[idx1], r2 = img.data[idx2];
                    const g1 = img.data[idx1+1], g2 = img.data[idx2+1];
                    const b1 = img.data[idx1+2], b2 = img.data[idx2+2];
                    if (a1 !== a2 || (a1 > 0 && (r1 !== r2 || g1 !== g2 || b1 !== b2))) {
                        diffs++;
                        if (y >= 28) legDiffs++;
                    }
                }
            }
            console.log(`Col ${c1} vs Col ${c2}: total diff pixels = ${diffs}, leg/lower body diffs = ${legDiffs}`);
        }
    }
}
