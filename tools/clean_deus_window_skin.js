'use strict';
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const SYS_DIR = path.join(ROOT, 'game', 'img', 'system');
const MASTER_DIR = path.join(ROOT, 'art', 'masters');

const imgPath = path.join(SYS_DIR, 'Window_default.png');
const img = decodePNG(fs.readFileSync(imgPath));

let cleaned = 0;
for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
        const idx = (y * img.width + x) * 4;
        if (img.data[idx + 3] === 0) continue;

        const r = img.data[idx];
        const g = img.data[idx + 1];
        const b = img.data[idx + 2];

        // Detect purple / magenta fringe:
        // In DEUS palette, lightning is cyan (G >= 140, B >= 180, R can be high for white core, but R is never much greater than G unless purple)
        // If Red and Blue are significantly higher than Green, it's magenta/purple artifact
        if (r > g + 25 && b > g + 25) {
            img.data[idx + 3] = 0;
            cleaned++;
            continue;
        }
        if (r > 120 && b > 120 && g < 100) {
            img.data[idx + 3] = 0;
            cleaned++;
            continue;
        }

        // Also clean any stray pixels on the seam at y=95..96 between frame and lower section
        if (x >= 96 && y === 95 && (img.data[idx + 3] > 0)) {
            // keep clean margin
        }
    }
}

console.log(`Cleaned ${cleaned} purple/magenta fringe pixels.`);

const outBuf = Buffer.from(img.data);
const pngData = writePNG(outBuf, img.width, img.height);

fs.writeFileSync(path.join(SYS_DIR, 'Window_default.png'), pngData);
fs.writeFileSync(path.join(SYS_DIR, 'Window_deus.png'), pngData);
fs.writeFileSync(path.join(SYS_DIR, 'Window.png'), pngData);
fs.writeFileSync(path.join(MASTER_DIR, 'Window_default.png'), pngData);
fs.writeFileSync(path.join(MASTER_DIR, 'Window_deus.png'), pngData);

console.log('Saved pristine Window_default.png across system and masters.');

