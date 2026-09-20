'use strict';

const fs = require('fs');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const { extractFrameFromCell, mirrorFrame } = require('./build_pro_human_male');

const img = decodePNG(fs.readFileSync('art/raw/human_male_pro_4d_walk.png'));

// Test combination 1:
// Col 0: R0_C3 (x: 704..938, y: 0..258)
// Col 1: R1_C0 (x: 0..234, y: 258..511)
// Col 2: R1_C1 (x: 234..470, y: 258..511)
const c1_0 = extractFrameFromCell(img, 704, 938, 0, 258, 43);
const c1_1 = extractFrameFromCell(img, 0, 234, 258, 511, 43);
const c1_2 = extractFrameFromCell(img, 234, 470, 258, 511, 43);

// Test combination 2:
// Col 0: R0_C3 (x: 704..938, y: 0..258)
// Col 1: R1_C0 (x: 0..234, y: 258..511)
// Col 2: R1_C4 (x: 938..1172, y: 258..511)
const c2_0 = extractFrameFromCell(img, 704, 938, 0, 258, 43);
const c2_1 = extractFrameFromCell(img, 0, 234, 258, 511, 43);
const c2_2 = extractFrameFromCell(img, 938, 1172, 258, 511, 43);

// Test combination 3:
// Col 0: R1_C1 (left forward)
// Col 1: R1_C0 (feet together)
// Col 2: R1_C4 (right forward)
const c3_0 = extractFrameFromCell(img, 234, 470, 258, 511, 43);
const c3_1 = extractFrameFromCell(img, 0, 234, 258, 511, 43);
const c3_2 = extractFrameFromCell(img, 938, 1172, 258, 511, 43);

function build3Strip(frames) {
    const buf = Buffer.alloc(144 * 48 * 4);
    for (let c = 0; c < 3; c++) {
        const f = frames[c];
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = (y * 48 + x) * 4;
                if (f[sIdx+3] > 0) {
                    const dIdx = (y * 144 + (c * 48 + x)) * 4;
                    buf[dIdx] = f[sIdx];
                    buf[dIdx+1] = f[sIdx+1];
                    buf[dIdx+2] = f[sIdx+2];
                    buf[dIdx+3] = 255;
                }
            }
        }
    }
    return buf;
}

writePNG('art/review/walk_side_combo1.png', 144, 48, build3Strip([c1_0, c1_1, c1_2]));
writePNG('art/review/walk_side_combo2.png', 144, 48, build3Strip([c2_0, c2_1, c2_2]));
writePNG('art/review/walk_side_combo3.png', 144, 48, build3Strip([c3_0, c3_1, c3_2]));

console.log('Saved combo 1, 2, and 3');
