'use strict';

const fs = require('fs');
const path = require('path');
const { readPNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const auditDir = path.join(ROOT, 'art', 'staging', 'chest_audit');

// We will construct a labeled inspection sheet:
// 3 columns x 4 rows of 298x300 frames.
// We'll downsample each cell to 149x150 so the full 3x4 sheet is 447x600, easy to view.

const cw = 298, ch = 300;
const scw = 149, sch = 150;
const sheetW = scw * 3;
const sheetH = sch * 4;
const outBuf = Buffer.alloc(sheetW * sheetH * 4);

// Fill with neutral dark background #1a1a24
for (let i = 0; i < outBuf.length; i += 4) {
    outBuf[i] = 26;
    outBuf[i + 1] = 26;
    outBuf[i + 2] = 36;
    outBuf[i + 3] = 255;
}

for (let r = 1; r <= 4; r++) {
    for (let c = 1; c <= 3; c++) {
        const framePath = path.join(auditDir, `R${r}C${c}.png`);
        if (!fs.existsSync(framePath)) continue;
        const cellImg = readPNG(framePath);

        const dstX0 = (c - 1) * scw;
        const dstY0 = (r - 1) * sch;

        for (let dy = 0; dy < sch; dy++) {
            for (let dx = 0; dx < scw; dx++) {
                const sx = Math.floor(dx * (cw / scw));
                const sy = Math.floor(dy * (ch / sch));
                const sIdx = (sy * cw + sx) * 4;
                const dIdx = ((dstY0 + dy) * sheetW + (dstX0 + dx)) * 4;

                const red = cellImg.data[sIdx], grn = cellImg.data[sIdx + 1], blu = cellImg.data[sIdx + 2];
                const isMag = (red > 180 && blu > 180 && grn < 80);

                if (!isMag) {
                    outBuf[dIdx] = red;
                    outBuf[dIdx + 1] = grn;
                    outBuf[dIdx + 2] = blu;
                    outBuf[dIdx + 3] = 255;
                }
            }
        }
    }
}

// Add thin grid lines
for (let c = 1; c < 3; c++) {
    const gx = c * scw;
    for (let y = 0; y < sheetH; y++) {
        const idx = (y * sheetW + gx) * 4;
        outBuf[idx] = 80; outBuf[idx + 1] = 80; outBuf[idx + 2] = 110; outBuf[idx + 3] = 255;
    }
}
for (let r = 1; r < 4; r++) {
    const gy = r * sch;
    for (let x = 0; x < sheetW; x++) {
        const idx = (gy * sheetW + x) * 4;
        outBuf[idx] = 80; outBuf[idx + 1] = 80; outBuf[idx + 2] = 110; outBuf[idx + 3] = 255;
    }
}

const outPath = path.join(auditDir, 'chest_audit_contact_sheet.png');
writePNG(outPath, sheetW, sheetH, outBuf);
console.log('Saved audit contact sheet to:', outPath);

