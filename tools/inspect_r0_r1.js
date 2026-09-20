'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const { extractFrameFromCell } = require('./build_pro_human_male');

const img = decodePNG(fs.readFileSync('art/raw/human_male_pro_4d_walk.png'));
const cols = 6;

// Row 0 cells 3, 4, 5 (East)
// Row 1 cells 0, 1, 2, 3, 4, 5 (West)
const scale = 4;
const totalW = 6 * 48 * scale;
const totalH = 2 * 48 * scale;
const out = Buffer.alloc(totalW * totalH * 4);

// Row 0: c=0..5
for (let c = 0; c < 6; c++) {
    const x0 = Math.round(c * (img.width / cols));
    const x1 = Math.round((c + 1) * (img.width / cols));
    const frameR0 = extractFrameFromCell(img, x0, x1, 0, Math.round(img.height / 3), 43, 44);
    const frameR1 = extractFrameFromCell(img, x0, x1, Math.round(img.height / 3), Math.round(2 * img.height / 3), 43, 44);

    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            for (let dy = 0; dy < scale; dy++) {
                for (let dx = 0; dx < scale; dx++) {
                    // R0
                    let px = (c * 48 + x) * scale + dx;
                    let py = y * scale + dy;
                    let dIdx = (py * totalW + px) * 4;
                    out[dIdx]   = frameR0[sIdx];
                    out[dIdx+1] = frameR0[sIdx+1];
                    out[dIdx+2] = frameR0[sIdx+2];
                    out[dIdx+3] = frameR0[sIdx+3];

                    // R1
                    py = (48 + y) * scale + dy;
                    dIdx = (py * totalW + px) * 4;
                    out[dIdx]   = frameR1[sIdx];
                    out[dIdx+1] = frameR1[sIdx+1];
                    out[dIdx+2] = frameR1[sIdx+2];
                    out[dIdx+3] = frameR1[sIdx+3];
                }
            }
        }
    }
}

writePNG('game/test_output/inspect_r0_r1_all_cells_4x.png', totalW, totalH, out);
console.log('Saved game/test_output/inspect_r0_r1_all_cells_4x.png');
