'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const { extractFrameFromCell } = require('./build_pro_human_male');

const femaleFiles = [
    'human_female_pro_4d_walk.png',
    'human_female_var2_pro_4d_walk.png',
    'human_female_var3_pro_4d_walk.png',
    'human_female_var4_pro_4d_walk.png',
    'human_female_var5_pro_4d_walk.png',
    'human_female_var6_pro_4d_walk.png'
];

const scale = 2;
const w = 6 * 48 * scale;
const h = 6 * 48 * scale;
const outBuf = Buffer.alloc(w * h * 4);

for (let i = 0; i < femaleFiles.length; i++) {
    const rawPath = path.join('art/raw', femaleFiles[i]);
    const img = decodePNG(fs.readFileSync(rawPath));
    const ch = Math.round(img.height / 3);

    for (let c = 0; c < 6; c++) {
        const x0 = Math.round(c * (img.width / 6));
        const x1 = Math.round((c + 1) * (img.width / 6));
        const frame = extractFrameFromCell(img, x0, x1, ch, 2 * ch, 43, 44);

        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = (y * 48 + x) * 4;
                for (let dy = 0; dy < scale; dy++) {
                    for (let dx = 0; dx < scale; dx++) {
                        const px = (c * 48 + x) * scale + dx;
                        const py = (i * 48 + y) * scale + dy;
                        const dIdx = (py * w + px) * 4;
                        outBuf[dIdx]     = frame[sIdx];
                        outBuf[dIdx + 1] = frame[sIdx + 1];
                        outBuf[dIdx + 2] = frame[sIdx + 2];
                        outBuf[dIdx + 3] = frame[sIdx + 3];
                    }
                }
            }
        }
    }
}

writePNG('game/test_output/all_females_row1_cells.png', w, h, outBuf);
console.log('Saved game/test_output/all_females_row1_cells.png');
