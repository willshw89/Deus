'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');

// Load all 12 cursors inspection image (already 4x scale)
const curImg = decodePNG(fs.readFileSync(path.join(REVIEW_DIR, 'all_cursors_inspected.png')));
// Load default menu in-game screenshot (816x624)
const menuImg = decodePNG(fs.readFileSync(path.join(REVIEW_DIR, 'menus', 'faction_menus.menu_clean_default.png')));
// Load Window_default (192x192)
const winImg = decodePNG(fs.readFileSync(path.join(ROOT, 'game', 'img', 'system', 'Window_default.png')));

// Assemble showcase layout:
// Top: All 12 Pointy Cursors Header & Cursors Grid
// Bottom: Default Menu (816x624) + Default Windowskin (192x192 -> 2x 384x384)
const outW = 1200;
const outH = 1100;
const outBuf = Buffer.alloc(outW * outH * 4);

// Fill with dark slate background
for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
        const idx = (y * outW + x) * 4;
        outBuf[idx] = 24;
        outBuf[idx+1] = 24;
        outBuf[idx+2] = 30;
        outBuf[idx+3] = 255;
    }
}

// 1. Draw Cursors image centered horizontally at top (y = 40)
const curX0 = Math.round((outW - curImg.width) / 2);
const curY0 = 40;
for (let y = 0; y < curImg.height; y++) {
    for (let x = 0; x < curImg.width; x++) {
        const sIdx = (y * curImg.width + x) * 4;
        const dIdx = ((curY0 + y) * outW + (curX0 + x)) * 4;
        outBuf[dIdx]   = curImg.data[sIdx];
        outBuf[dIdx+1] = curImg.data[sIdx+1];
        outBuf[dIdx+2] = curImg.data[sIdx+2];
        outBuf[dIdx+3] = 255;
    }
}

// 2. Draw Menu image at bottom left (y = 440, x = 40)
const menuX0 = 40;
const menuY0 = 440;
for (let y = 0; y < menuImg.height; y++) {
    for (let x = 0; x < menuImg.width; x++) {
        const sIdx = (y * menuImg.width + x) * 4;
        const dIdx = ((menuY0 + y) * outW + (menuX0 + x)) * 4;
        outBuf[dIdx]   = menuImg.data[sIdx];
        outBuf[dIdx+1] = menuImg.data[sIdx+1];
        outBuf[dIdx+2] = menuImg.data[sIdx+2];
        outBuf[dIdx+3] = 255;
    }
}

// 3. Draw Windowskin scaled 2x at bottom right (y = 550, x = 880)
const winX0 = 880;
const winY0 = 550;
for (let y = 0; y < winImg.height; y++) {
    for (let x = 0; x < winImg.width; x++) {
        const sIdx = (y * winImg.width + x) * 4;
        if (winImg.data[sIdx+3] === 0) continue;
        for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
                const px = winX0 + x * 2 + dx;
                const py = winY0 + y * 2 + dy;
                const dIdx = (py * outW + px) * 4;
                outBuf[dIdx]   = winImg.data[sIdx];
                outBuf[dIdx+1] = winImg.data[sIdx+1];
                outBuf[dIdx+2] = winImg.data[sIdx+2];
                outBuf[dIdx+3] = 255;
            }
        }
    }
}

const outPath = path.join(REVIEW_DIR, 'all_pointy_cursors_and_default_menu_showcase.png');
fs.writeFileSync(outPath, writePNG(outBuf, outW, outH));
console.log(`Saved master review showcase: ${outPath}`);
