'use strict';

const fs = require('fs');
const path = require('path');
const { readPNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const STAGING_DIR = path.join(ROOT, 'art', 'staging');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');

const r4c1 = readPNG(path.join(STAGING_DIR, 'chest_approved', 'R4C1.png'));
// Let's check R4C1 and R4C3 from the assembled sheet
const sheetPng = readPNG(path.join(STAGING_DIR, '!$UF_Chest_Wood.png'));

// Extract R4C1 (cell r=3, c=0) and R4C3 (cell r=3, c=2) from sheetPng (48x48)
function getSheetCell(r, c) {
    const buf = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = ((r * 48 + y) * 144 + (c * 48 + x)) * 4;
            const dIdx = (y * 48 + x) * 4;
            buf[dIdx] = sheetPng.data[sIdx];
            buf[dIdx + 1] = sheetPng.data[sIdx + 1];
            buf[dIdx + 2] = sheetPng.data[sIdx + 2];
            buf[dIdx + 3] = sheetPng.data[sIdx + 3];
        }
    }
    return { width: 48, height: 48, data: buf };
}

const c_r4c1 = getSheetCell(3, 0); // closed rear
const c_r4c3 = getSheetCell(3, 2); // fully open rear (approved by user!)

// Create R4C2:
// Start with base of c_r4c1 (y >= 27)
const r4c2 = Buffer.alloc(48 * 48 * 4);
for (let y = 27; y < 48; y++) {
    for (let x = 0; x < 48; x++) {
        const idx = (y * 48 + x) * 4;
        r4c2[idx] = c_r4c1.data[idx];
        r4c2[idx + 1] = c_r4c1.data[idx + 1];
        r4c2[idx + 2] = c_r4c1.data[idx + 2];
        r4c2[idx + 3] = c_r4c1.data[idx + 3];
    }
}

// In c_r4c3, the vertical lid is from Y=10 to Y=26 (height 17 px).
// For R4C2 (45 degrees), the lid is foreshortened to height ~12 px (from Y=15 to Y=26).
const lidSrcTop = 10, lidSrcBot = 26;
const lidDstTop = 15, lidDstBot = 26;
const srcH = lidSrcBot - lidSrcTop + 1;
const dstH = lidDstBot - lidDstTop + 1;

for (let dy = lidDstTop; dy <= lidDstBot; dy++) {
    const sy = Math.round(lidSrcTop + ((dy - lidDstTop) / dstH) * (srcH - 1));
    for (let x = 0; x < 48; x++) {
        const sIdx = (sy * 48 + x) * 4;
        const dIdx = (dy * 48 + x) * 4;
        if (c_r4c3.data[sIdx + 3] === 255) {
            r4c2[dIdx] = c_r4c3.data[sIdx];
            r4c2[dIdx + 1] = c_r4c3.data[sIdx + 1];
            r4c2[dIdx + 2] = c_r4c3.data[sIdx + 2];
            r4c2[dIdx + 3] = 255;
        }
    }
}

// Ensure the top edge has dark outline
for (let x = 0; x < 48; x++) {
    const idx = (lidDstTop * 48 + x) * 4;
    if (r4c2[idx + 3] === 255) {
        // Dark outline color
        r4c2[idx] = 24; r4c2[idx + 1] = 20; r4c2[idx + 2] = 18;
    }
}

writePNG(path.join(REVIEW_DIR, 'test_r4c2.png'), 48, 48, r4c2);
console.log('Saved test_r4c2.png');
