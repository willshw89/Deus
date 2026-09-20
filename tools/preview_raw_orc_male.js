'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

function isMagenta(r, g, b) {
    if (r > 165 && g < 85 && b > 165) return true;
    if (r > 80 && b > 70 && g < 65 && Math.abs(r - b) < 45) return true;
    return false;
}

const img = decodePNG(fs.readFileSync('art/raw/orc_male_walk_12_raw.png'));

// Find row bands
const projY = new Array(img.height).fill(0);
for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
        const idx = (y * img.width + x) * 4;
        if (!isMagenta(img.data[idx], img.data[idx + 1], img.data[idx + 2])) projY[y]++;
    }
}
const rowBands = [];
let inBand = false, start = 0;
for (let y = 0; y < img.height; y++) {
    if (projY[y] > 50 && !inBand) { inBand = true; start = y; }
    else if (projY[y] <= 50 && inBand) { inBand = false; rowBands.push([start, y]); }
}
if (inBand) rowBands.push([start, img.height - 1]);

const sprites = [];
for (let r = 0; r < rowBands.length; r++) {
    const [y0, y1] = rowBands[r];
    const rProjX = new Array(img.width).fill(0);
    for (let y = y0; y <= y1; y++) {
        for (let x = 0; x < img.width; x++) {
            const idx = (y * img.width + x) * 4;
            if (!isMagenta(img.data[idx], img.data[idx + 1], img.data[idx + 2])) rProjX[x]++;
        }
    }
    const colBands = [];
    let inCol = false, cStart = 0;
    for (let x = 0; x < img.width; x++) {
        if (rProjX[x] > 20 && !inCol) { inCol = true; cStart = x; }
        else if (rProjX[x] <= 20 && inCol) { inCol = false; colBands.push([cStart, x]); }
    }
    if (inCol) colBands.push([cStart, img.width - 1]);

    for (let c = 0; c < colBands.length; c++) {
        const [x0, x1] = colBands[c];
        sprites.push({ r, c, x0, x1, y0, y1, w: x1 - x0, h: y1 - y0 });
    }
}

console.log(`Extracted ${sprites.length} sprites from orc_male_walk_12_raw.png`);

// Render contact sheet (each sprite thumbnail 64x64)
const cols = 6;
const rows = Math.ceil(sprites.length / cols);
const thumbW = 64, thumbH = 64;
const outBuf = Buffer.alloc(cols * thumbW * rows * thumbH * 4);

// Fill with dark grey background
for (let i = 0; i < outBuf.length; i += 4) {
    outBuf[i] = 40; outBuf[i+1] = 40; outBuf[i+2] = 48; outBuf[i+3] = 255;
}

for (let i = 0; i < sprites.length; i++) {
    const sp = sprites[i];
    const gridC = i % cols;
    const gridR = Math.floor(i / cols);
    const ox = gridC * thumbW;
    const oy = gridR * thumbH;

    const scale = 56 / Math.max(sp.w, sp.h);
    for (let dy = 0; dy < Math.round(sp.h * scale); dy++) {
        const sy = Math.round(sp.y0 + dy / scale);
        if (sy >= img.height) continue;
        for (let dx = 0; dx < Math.round(sp.w * scale); dx++) {
            const sx = Math.round(sp.x0 + dx / scale);
            if (sx >= img.width) continue;
            const sIdx = (sy * img.width + sx) * 4;
            if (!isMagenta(img.data[sIdx], img.data[sIdx+1], img.data[sIdx+2])) {
                const px = ox + 4 + dx;
                const py = oy + (thumbH - 4 - Math.round(sp.h * scale)) + dy;
                const dIdx = (py * cols * thumbW + px) * 4;
                outBuf[dIdx]   = img.data[sIdx];
                outBuf[dIdx+1] = img.data[sIdx+1];
                outBuf[dIdx+2] = img.data[sIdx+2];
                outBuf[dIdx+3] = 255;
            }
        }
    }
}

fs.mkdirSync('art/review', { recursive: true });
fs.writeFileSync('art/review/orc_male_walk_extracted_previews.png', writePNG(outBuf, cols * thumbW, rows * thumbH));
console.log('Saved art/review/orc_male_walk_extracted_previews.png');
