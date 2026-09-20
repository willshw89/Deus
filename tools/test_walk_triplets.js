'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const { extractFrameFromCell, mirrorFrame } = require('./build_pro_human_male');

const img = decodePNG(fs.readFileSync('art/raw/human_male_pro_4d_walk.png'));
const cols = 6;
const cw = Math.floor(img.width / cols);
const ch = Math.floor(img.height / 3);

// Extract row 1 cells: 0, 1, 2, 3, 4, 5
const r1Frames = [];
for (let c = 0; c < 6; c++) {
    const x0 = Math.round(c * (img.width / cols));
    const x1 = Math.round((c + 1) * (img.width / cols));
    const y0 = Math.round(1 * (img.height / 3));
    const y1 = Math.round(2 * (img.height / 3));
    r1Frames.push(extractFrameFromCell(img, x0, x1, y0, y1, 43, 44));
}

// Let's create an image showing:
// Option A: [Cell 0 (Stride A), Cell 2 (Neutral), Cell 1 (Stride B)]
// Option B: [Cell 3 (Stride A), Cell 5 (Neutral), Cell 4 (Stride B)]
// at 4x zoom!
const scale = 4;
const optA = [r1Frames[0], r1Frames[2], r1Frames[1]];
const optB = [r1Frames[3], r1Frames[5], r1Frames[4]];

function makeRow(frames) {
    const w = 3 * 48 * scale;
    const h = 48 * scale;
    const buf = Buffer.alloc(w * h * 4);
    for (let c = 0; c < 3; c++) {
        const f = frames[c];
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = (y * 48 + x) * 4;
                for (let dy = 0; dy < scale; dy++) {
                    for (let dx = 0; dx < scale; dx++) {
                        const px = (c * 48 + x) * scale + dx;
                        const py = y * scale + dy;
                        const dIdx = (py * w + px) * 4;
                        buf[dIdx]     = f[sIdx];
                        buf[dIdx + 1] = f[sIdx + 1];
                        buf[dIdx + 2] = f[sIdx + 2];
                        buf[dIdx + 3] = f[sIdx + 3];
                    }
                }
            }
        }
    }
    return { w, h, buf };
}

const rowA = makeRow(optA);
const rowB = makeRow(optB);

// Combine into one image: Row A on top, Row B on bottom
const totalW = rowA.w;
const totalH = rowA.h * 2 + 10;
const compBuf = Buffer.alloc(totalW * totalH * 4);

// Copy Row A
for (let y = 0; y < rowA.h; y++) {
    for (let x = 0; x < rowA.w; x++) {
        const sIdx = (y * rowA.w + x) * 4;
        const dIdx = (y * totalW + x) * 4;
        compBuf[dIdx]   = rowA.buf[sIdx];
        compBuf[dIdx+1] = rowA.buf[sIdx+1];
        compBuf[dIdx+2] = rowA.buf[sIdx+2];
        compBuf[dIdx+3] = rowA.buf[sIdx+3];
    }
}
// Copy Row B
for (let y = 0; y < rowB.h; y++) {
    for (let x = 0; x < rowB.w; x++) {
        const sIdx = (y * rowB.w + x) * 4;
        const dIdx = ((y + rowA.h + 10) * totalW + x) * 4;
        compBuf[dIdx]   = rowB.buf[sIdx];
        compBuf[dIdx+1] = rowB.buf[sIdx+1];
        compBuf[dIdx+2] = rowB.buf[sIdx+2];
        compBuf[dIdx+3] = rowB.buf[sIdx+3];
    }
}

writePNG('game/test_output/walk_triplets_test.png', totalW, totalH, compBuf);
console.log('Saved game/test_output/walk_triplets_test.png');
