'use strict';
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const raw = decodePNG(fs.readFileSync(path.join(__dirname, '..', 'art', 'raw', 'pro_wolf_walk.png')), 'wolf');

// Crop row 1: y 192..384, full width 1408
const cw = raw.width, ch = 192;
const crop = Buffer.alloc(cw * ch * 4);
for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
        const sidx = ((192 + y) * raw.width + x) * 4;
        const didx = (y * cw + x) * 4;
        crop[didx] = raw.data[sidx];
        crop[didx + 1] = raw.data[sidx + 1];
        crop[didx + 2] = raw.data[sidx + 2];
        crop[didx + 3] = 255;
    }
}
writePNG(path.join(__dirname, '..', 'art', 'review', 'crop_wolf_row1.png'), cw, ch, crop);
console.log('Saved crop_wolf_row1.png');

