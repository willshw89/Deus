'use strict';

const fs = require('fs');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const { extractFrameFromCell } = require('./build_pro_human_male');

const img = decodePNG(fs.readFileSync('art/raw/human_male_pro_4d_haul.png'));

const colBorders = [0, 234, 470, 704, 938, 1172, 1408];
const rowBorders = [0, 258, 511, 767];

const w = 6 * 48 * 3;
const h = 48 * 3;
const buf = Buffer.alloc(w * h * 4);

for (let c = 0; c < 6; c++) {
    const f = extractFrameFromCell(img, colBorders[c], colBorders[c+1], rowBorders[1], rowBorders[2], 43);
    const ox = c * 48 * 3;
    for (let py = 0; py < 48; py++) {
        for (let px = 0; px < 48; px++) {
            const sIdx = (py * 48 + px) * 4;
            if (f[sIdx+3] > 0) {
                for (let dy = 0; dy < 3; dy++) {
                    for (let dx = 0; dx < 3; dx++) {
                        const dIdx = ((py * 3 + dy) * w + (ox + px * 3 + dx)) * 4;
                        buf[dIdx]   = f[sIdx];
                        buf[dIdx+1] = f[sIdx+1];
                        buf[dIdx+2] = f[sIdx+2];
                        buf[dIdx+3] = 255;
                    }
                }
            }
        }
    }
}

writePNG('art/review/all_haul_side_frames_3x.png', w, h, buf);
console.log('Saved art/review/all_haul_side_frames_3x.png');
