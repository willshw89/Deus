'use strict';
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const SYS_DIR = path.join(ROOT, 'game', 'img', 'system');
const MASTER_DIR = path.join(ROOT, 'art', 'masters');

const curPath = path.join(SYS_DIR, 'Window_default.png');
const img = decodePNG(fs.readFileSync(curPath));

// 1. Refine the 48x48 Cursor Box at (96, 96)
// In RMMZ, the cursor at (96, 96, 48, 48) is sliced with 16x16 corners and 16px edges.
// When stretched across a 750px wide savefile card, the 16x16 corners stay intact at the ends,
// the top/bottom 16px edges stretch across the width, and the left/right 16px edges stretch across the height.
// To have a razor-clean electric cyan glow frame without horizontal/vertical smears:
// - The center (112..127, 112..127) must be completely transparent (alpha = 0).
// - The edges:
//   Top edge (x: 112..127, y: 96..111):
//     y = 96: pure white #ffffff
//     y = 97..98: electric cyan #a0f0ff
//     y = 99: cyan glow #00d4ff (alpha 180)
//     y = 100..111: alpha = 0
//   Bottom edge (x: 112..127, y: 128..143):
//     y = 143: pure white #ffffff
//     y = 141..142: electric cyan #a0f0ff
//     y = 140: cyan glow #00d4ff (alpha 180)
//     y = 128..139: alpha = 0
//   Left edge (x: 96..111, y: 112..127):
//     x = 96: pure white #ffffff
//     x = 97..98: electric cyan #a0f0ff
//     x = 99: cyan glow #00d4ff (alpha 180)
//     x = 100..111: alpha = 0
//   Right edge (x: 128..143, y: 112..127):
//     x = 143: pure white #ffffff
//     x = 141..142: electric cyan #a0f0ff
//     x = 140: cyan glow #00d4ff (alpha 180)
//     x = 128..139: alpha = 0

function setPixel(x, y, r, g, b, a) {
    const idx = (y * img.width + x) * 4;
    img.data[idx]     = r;
    img.data[idx + 1] = g;
    img.data[idx + 2] = b;
    img.data[idx + 3] = a;
}

// Clear inner center
for (let y = 112; y < 128; y++) {
    for (let x = 112; x < 128; x++) {
        setPixel(x, y, 0, 0, 0, 0);
    }
}

// Top edge
for (let x = 112; x < 128; x++) {
    setPixel(x, 96, 255, 255, 255, 255);
    setPixel(x, 97, 160, 240, 255, 255);
    setPixel(x, 98, 160, 240, 255, 255);
    setPixel(x, 99, 0, 212, 255, 180);
    for (let y = 100; y < 112; y++) setPixel(x, y, 0, 0, 0, 0);
}

// Bottom edge
for (let x = 112; x < 128; x++) {
    for (let y = 128; y < 140; y++) setPixel(x, y, 0, 0, 0, 0);
    setPixel(x, 140, 0, 212, 255, 180);
    setPixel(x, 141, 160, 240, 255, 255);
    setPixel(x, 142, 160, 240, 255, 255);
    setPixel(x, 143, 255, 255, 255, 255);
}

// Left edge
for (let y = 112; y < 128; y++) {
    setPixel(96, y, 255, 255, 255, 255);
    setPixel(97, y, 160, 240, 255, 255);
    setPixel(98, y, 160, 240, 255, 255);
    setPixel(99, y, 0, 212, 255, 180);
    for (let x = 100; x < 112; x++) setPixel(x, y, 0, 0, 0, 0);
}

// Right edge
for (let y = 112; y < 128; y++) {
    for (let x = 128; x < 140; x++) setPixel(x, y, 0, 0, 0, 0);
    setPixel(140, y, 0, 212, 255, 180);
    setPixel(141, y, 160, 240, 255, 255);
    setPixel(142, y, 160, 240, 255, 255);
    setPixel(143, y, 255, 255, 255, 255);
}

// 4 Corners (16x16 each):
// In each corner, ensure the inner 6x6 area (closest to center) is transparent so corners connect smoothly to edges
for (let dy = 10; dy < 16; dy++) {
    for (let dx = 10; dx < 16; dx++) {
        setPixel(96 + dx, 96 + dy, 0, 0, 0, 0); // TL
        setPixel(128 + (15 - dx), 96 + dy, 0, 0, 0, 0); // TR
        setPixel(96 + dx, 128 + (15 - dy), 0, 0, 0, 0); // BL
        setPixel(128 + (15 - dx), 128 + (15 - dy), 0, 0, 0, 0); // BR
    }
}

// 2. Populate Standard RMMZ Text Color Chips at (x: 96..191, y: 144..191)
function hexRgb(hex) {
    const n = parseInt(String(hex || '#000000').replace('#', ''), 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const TEXT_COLORS = [
    "#ffffff","#71aee7","#ff5965","#efca28","#8eff82","#006dd2","#bebebe","#ffffff",
    "#7d7d7d","#006dd2","#c20c1c","#45b645","#c69618","#ff5965","#8eff82","#bebebe",
    "#006dd2","#c69618","#c20c1c","#45b645","#8a5508","#71aee7","#efca28","#bebebe",
    "#45b645","#c20c1c","#006dd2","#efca28","#45b645","#c69618","#8a5508","#100c08"
].map(hexRgb);

// 8 columns x 4 rows, each chip is 12x12
for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 8; col++) {
        const rgb = TEXT_COLORS[row * 8 + col];
        const ox = 96 + col * 12;
        const oy = 144 + row * 12;
        for (let dy = 0; dy < 12; dy++) {
            for (let dx = 0; dx < 12; dx++) {
                // 1px subtle dark bevel rim on chips
                if (dx === 0 || dy === 0 || dx === 11 || dy === 11) {
                    setPixel(ox + dx, oy + dy, Math.floor(rgb[0] * 0.7), Math.floor(rgb[1] * 0.7), Math.floor(rgb[2] * 0.7), 255);
                } else {
                    setPixel(ox + dx, oy + dy, rgb[0], rgb[1], rgb[2], 255);
                }
            }
        }
    }
}

const outPng = writePNG(Buffer.from(img.data), img.width, img.height);
fs.writeFileSync(path.join(SYS_DIR, 'Window_default.png'), outPng);
fs.writeFileSync(path.join(SYS_DIR, 'Window_deus.png'), outPng);
fs.writeFileSync(path.join(SYS_DIR, 'Window.png'), outPng);
fs.writeFileSync(path.join(MASTER_DIR, 'Window_default.png'), outPng);
fs.writeFileSync(path.join(MASTER_DIR, 'Window_deus.png'), outPng);

console.log('Saved pristine DEUS windowskin with 32 text colors and flawless cursor box.');
