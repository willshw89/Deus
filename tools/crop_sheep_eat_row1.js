'use strict';
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const raw = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'pro_sheep_eat.png')), 'sheep_eat');

// Render a crop of row 1 (all 6 clusters)
const cropW = raw.width;
const cropH = 192;
const cropBuf = Buffer.alloc(cropW * cropH * 4);

for (let y = 0; y < 192; y++) {
    for (let x = 0; x < raw.width; x++) {
        const sidx = ((192 + y) * raw.width + x) * 4;
        const didx = (y * cropW + x) * 4;
        cropBuf[didx] = raw.data[sidx];
        cropBuf[didx + 1] = raw.data[sidx + 1];
        cropBuf[didx + 2] = raw.data[sidx + 2];
        cropBuf[didx + 3] = raw.data[sidx + 3];
    }
}

writePNG(path.join(ROOT, 'art', 'review', 'sheep_eat_row1_raw.png'), cropW, cropH, cropBuf);
console.log('Saved sheep_eat_row1_raw.png');
