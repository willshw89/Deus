'use strict';
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');
fs.mkdirSync(REVIEW_DIR, { recursive: true });

function renderPreview(srcFile, outFile) {
    const srcPath = path.join(ROOT, 'game', 'img', 'tilesets', srcFile);
    const img = decodePNG(fs.readFileSync(srcPath), srcFile);
    // Render full 768x768 with a dark slate background to easily see transparent cutouts
    const out = Buffer.alloc(img.width * img.height * 4);
    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
            const idx = (y * img.width + x) * 4;
            const a = img.data[idx + 3];
            // Check checkerboard background for transparency
            const check = ((Math.floor(x / 16) + Math.floor(y / 16)) % 2 === 0) ? 32 : 44;
            if (a < 128) {
                out[idx] = check;
                out[idx + 1] = check;
                out[idx + 2] = check + 8;
                out[idx + 3] = 255;
            } else {
                out[idx] = img.data[idx];
                out[idx + 1] = img.data[idx + 1];
                out[idx + 2] = img.data[idx + 2];
                out[idx + 3] = 255;
            }
        }
    }
    const outPath = path.join(REVIEW_DIR, outFile);
    writePNG(outPath, img.width, img.height, out);
    console.log(`Saved review preview -> ${outPath}`);
}

renderPreview('Outside_B.png', 'nano_outside_b_sheet_review.png');
renderPreview('Outside_C.png', 'nano_outside_c_sheet_review.png');
