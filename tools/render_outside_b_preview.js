'use strict';
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const p = path.join(__dirname, '..', 'game', 'img', 'tilesets', 'Outside_B.png');
const img = decodePNG(fs.readFileSync(p), 'outside_b');
const sw = 512, sh = 512;
const out = Buffer.alloc(sw * sh * 4);
for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
        const sx = Math.min(img.width - 1, Math.floor(x * (img.width / sw)));
        const sy = Math.min(img.height - 1, Math.floor(y * (img.height / sh)));
        const srcIdx = (sy * img.width + sx) * 4;
        const dstIdx = (y * sw + x) * 4;
        out[dstIdx] = img.data[srcIdx];
        out[dstIdx + 1] = img.data[srcIdx + 1];
        out[dstIdx + 2] = img.data[srcIdx + 2];
        out[dstIdx + 3] = img.data[srcIdx + 3];
    }
}
const outPath = path.join(__dirname, '..', 'art', 'review', 'stock_outside_b_preview.png');
writePNG(outPath, sw, sh, out);
console.log('Saved:', outPath);

