'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const p = decodePNG(fs.readFileSync('art/raw/human_male_pro_4d_walk.png'));
console.log('Size:', p.width, p.height);

// Crop Row 0 cells 3, 4, 5
// and Row 1 cells 0, 1, 2, 3, 4, 5
// Each cell ~ 234x256
const cw = 1408 / 6; // 234.666
const ch = 768 / 3;  // 256

function cropCell(r, c) {
    const x0 = Math.round(c * cw);
    const y0 = Math.round(r * ch);
    const w = Math.round((c + 1) * cw) - x0;
    const h = Math.round((r + 1) * ch) - y0;
    const buf = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const sIdx = ((y0 + y) * p.width + (x0 + x)) * 4;
            const dIdx = (y * w + x) * 4;
            buf[dIdx]     = p.data[sIdx];
            buf[dIdx + 1] = p.data[sIdx + 1];
            buf[dIdx + 2] = p.data[sIdx + 2];
            buf[dIdx + 3] = p.data[sIdx + 3];
        }
    }
    return { w, h, buf };
}

// Let's inspect Row 0: col 3, col 4, col 5 (the right-facing walk sequence!)
// and Row 1: col 0, col 1, col 2, col 3, col 4, col 5
for (let c = 3; c < 6; c++) {
    const cell = cropCell(0, c);
    writePNG(`game/test_output/raw_r0_c${c}.png`, cell.w, cell.h, cell.buf);
}
for (let c = 0; c < 6; c++) {
    const cell = cropCell(1, c);
    writePNG(`game/test_output/raw_r1_c${c}.png`, cell.w, cell.h, cell.buf);
}

console.log('Saved individual raw cells!');
