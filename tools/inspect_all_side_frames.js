'use strict';

const fs = require('fs');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const img = decodePNG(fs.readFileSync('art/raw/human_male_pro_4d_walk.png'));

// The 9 side-facing frames in human_male_pro_4d_walk.png are:
// Row 0 Col 3, Col 4, Col 5
// Row 1 Col 0, Col 1, Col 2, Col 3, Col 4, Col 5
const candidateCells = [
    { name: 'R0_C3', c: 3, r: 0, x0: 704,  x1: 938,  y0: 0,   y1: 258 },
    { name: 'R0_C4', c: 4, r: 0, x0: 938,  x1: 1172, y0: 0,   y1: 258 },
    { name: 'R0_C5', c: 5, r: 0, x0: 1172, x1: 1408, y0: 0,   y1: 258 },
    { name: 'R1_C0', c: 0, r: 1, x0: 0,    x1: 234,  y0: 258, y1: 511 },
    { name: 'R1_C1', c: 1, r: 1, x0: 234,  x1: 470,  y0: 258, y1: 511 },
    { name: 'R1_C2', c: 2, r: 1, x0: 470,  x1: 704,  y0: 258, y1: 511 },
    { name: 'R1_C3', c: 3, r: 1, x0: 704,  x1: 938,  y0: 258, y1: 511 },
    { name: 'R1_C4', c: 4, r: 1, x0: 938,  x1: 1172, y0: 258, y1: 511 },
    { name: 'R1_C5', c: 5, r: 1, x0: 1172, x1: 1408, y0: 258, y1: 511 }
];

const { extractFrameFromCell } = require('./build_pro_human_male');

const w = candidateCells.length * 48 * 3;
const h = 48 * 3;
const buf = Buffer.alloc(w * h * 4);

// Fill with checkerboard
for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
        const o = (y * w + x) * 4;
        const cb = ((Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0) ? 35 : 45;
        buf[o] = cb; buf[o+1] = cb; buf[o+2] = cb; buf[o+3] = 255;
    }
}

candidateCells.forEach((cand, idx) => {
    const f = extractFrameFromCell(img, cand.x0, cand.x1, cand.y0, cand.y1, 43);
    const ox = idx * 48 * 3;
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
});

writePNG('art/review/all_9_side_frames_3x.png', w, h, buf);
console.log('Saved art/review/all_9_side_frames_3x.png');
