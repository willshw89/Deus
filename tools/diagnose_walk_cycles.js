'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const img = decodePNG(fs.readFileSync('art/raw/human_male_pro_4d_walk.png'));
console.log('Image dimensions:', img.width, 'x', img.height);

// The raw image is 1408 x 768.
// 6 columns (1408 / 6 = 234.66) x 3 rows (768 / 3 = 256).
const cols = 6;
const rows = 3;
const cw = Math.floor(img.width / cols);
const ch = Math.floor(img.height / rows);

console.log(`Cell size ~ ${cw} x ${ch}`);

// Let's create a montage of all 18 cells, scaled down to 48x48 each
const { extractFrameFromCell } = require('./build_pro_human_male');

const montage = Buffer.alloc(cols * 48 * rows * 48 * 4);

for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
        const x0 = Math.round(c * (img.width / cols));
        const x1 = Math.round((c + 1) * (img.width / cols));
        const y0 = Math.round(r * (img.height / rows));
        const y1 = Math.round((r + 1) * (img.height / rows));
        
        const frame = extractFrameFromCell(img, x0, x1, y0, y1, 43, 44);
        
        // write into montage
        for (let fy = 0; fy < 48; fy++) {
            for (let fx = 0; fx < 48; fx++) {
                const sIdx = (fy * 48 + fx) * 4;
                const dx = c * 48 + fx;
                const dy = r * 48 + fy;
                const dIdx = (dy * (cols * 48) + dx) * 4;
                montage[dIdx]     = frame[sIdx];
                montage[dIdx + 1] = frame[sIdx + 1];
                montage[dIdx + 2] = frame[sIdx + 2];
                montage[dIdx + 3] = frame[sIdx + 3];
            }
        }
    }
}

fs.mkdirSync('game/test_output', { recursive: true });
writePNG('game/test_output/raw_male_1_all_18_cells.png', cols * 48, rows * 48, montage);
console.log('Wrote game/test_output/raw_male_1_all_18_cells.png');
