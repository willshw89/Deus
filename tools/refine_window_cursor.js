'use strict';
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const SYS_DIR = path.join(ROOT, 'game', 'img', 'system');
const MASTER_DIR = path.join(ROOT, 'art', 'masters');

const img = decodePNG(fs.readFileSync(path.join(SYS_DIR, 'Window_default.png')));

// Cursor box is at (96, 96, 48, 48)
// 9-slice layout:
// Corners: 16x16 at (96,96), (128,96), (96,128), (128,128)
// Edges: (112..127, 96..111) top, (112..127, 128..143) bottom
//        (96..111, 112..127) left, (128..143, 112..127) right
// Center: (112..127, 112..127)

// Electric cyan lightning palette colors:
// White core: [255, 255, 255, 255]
// Bright cyan: [160, 240, 255, 255]
// Cyan glow: [0, 212, 255, 200]
// Deep cyan: [0, 162, 255, 160]

// 1. Ensure center is 100% transparent
for (let y = 112; y < 128; y++) {
    for (let x = 112; x < 128; x++) {
        const idx = (y * img.width + x) * 4;
        img.data[idx + 3] = 0;
    }
}

// 2. Clean top edge (112..127, 96..111) to be a glowing cyan top border
for (let y = 96; y < 112; y++) {
    for (let x = 112; x < 128; x++) {
        const idx = (y * img.width + x) * 4;
        const distFromTop = y - 96;
        if (distFromTop === 0) {
            // White core
            img.data[idx] = 255; img.data[idx+1] = 255; img.data[idx+2] = 255; img.data[idx+3] = 255;
        } else if (distFromTop === 1) {
            // Bright cyan
            img.data[idx] = 160; img.data[idx+1] = 240; img.data[idx+2] = 255; img.data[idx+3] = 255;
        } else if (distFromTop === 2) {
            // Cyan glow
            img.data[idx] = 0; img.data[idx+1] = 212; img.data[idx+2] = 255; img.data[idx+3] = 180;
        } else {
            img.data[idx + 3] = 0;
        }
    }
}

// 3. Clean bottom edge (112..127, 128..143) to be a glowing cyan bottom border
for (let y = 128; y < 144; y++) {
    for (let x = 112; x < 128; x++) {
        const idx = (y * img.width + x) * 4;
        const distFromBottom = 143 - y;
        if (distFromBottom === 0) {
            img.data[idx] = 255; img.data[idx+1] = 255; img.data[idx+2] = 255; img.data[idx+3] = 255;
        } else if (distFromBottom === 1) {
            img.data[idx] = 160; img.data[idx+1] = 240; img.data[idx+2] = 255; img.data[idx+3] = 255;
        } else if (distFromBottom === 2) {
            img.data[idx] = 0; img.data[idx+1] = 212; img.data[idx+2] = 255; img.data[idx+3] = 180;
        } else {
            img.data[idx + 3] = 0;
        }
    }
}

// 4. Clean left edge (96..111, 112..127) to be a glowing cyan left border
for (let y = 112; y < 128; y++) {
    for (let x = 96; x < 112; x++) {
        const idx = (y * img.width + x) * 4;
        const distFromLeft = x - 96;
        if (distFromLeft === 0) {
            img.data[idx] = 255; img.data[idx+1] = 255; img.data[idx+2] = 255; img.data[idx+3] = 255;
        } else if (distFromLeft === 1) {
            img.data[idx] = 160; img.data[idx+1] = 240; img.data[idx+2] = 255; img.data[idx+3] = 255;
        } else if (distFromLeft === 2) {
            img.data[idx] = 0; img.data[idx+1] = 212; img.data[idx+2] = 255; img.data[idx+3] = 180;
        } else {
            img.data[idx + 3] = 0;
        }
    }
}

// 5. Clean right edge (128..143, 112..127) to be a glowing cyan right border
for (let y = 112; y < 128; y++) {
    for (let x = 128; x < 144; x++) {
        const idx = (y * img.width + x) * 4;
        const distFromRight = 143 - x;
        if (distFromRight === 0) {
            img.data[idx] = 255; img.data[idx+1] = 255; img.data[idx+2] = 255; img.data[idx+3] = 255;
        } else if (distFromRight === 1) {
            img.data[idx] = 160; img.data[idx+1] = 240; img.data[idx+2] = 255; img.data[idx+3] = 255;
        } else if (distFromRight === 2) {
            img.data[idx] = 0; img.data[idx+1] = 212; img.data[idx+2] = 255; img.data[idx+3] = 180;
        } else {
            img.data[idx + 3] = 0;
        }
    }
}

const outBuf = Buffer.from(img.data);
const pngData = writePNG(outBuf, img.width, img.height);

fs.writeFileSync(path.join(SYS_DIR, 'Window_default.png'), pngData);
fs.writeFileSync(path.join(SYS_DIR, 'Window_deus.png'), pngData);
fs.writeFileSync(path.join(SYS_DIR, 'Window.png'), pngData);
fs.writeFileSync(path.join(MASTER_DIR, 'Window_default.png'), pngData);
fs.writeFileSync(path.join(MASTER_DIR, 'Window_deus.png'), pngData);

console.log('Successfully refined cursor box in DEUS windowskin.');
