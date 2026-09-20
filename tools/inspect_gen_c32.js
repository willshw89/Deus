'use strict';
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');

const img = decodePNG(fs.readFileSync(path.join(__dirname, '..', 'game', 'img', 'characters', '$gen_c32.png')));

for (let y = 16; y <= 22; y++) {
    const row = [];
    for (let x = 16; x <= 26; x++) {
        const idx = ((48 + y) * 144 + (48 + x)) * 4;
        row.push(`${img.data[idx]},${img.data[idx+1]},${img.data[idx+2]}`);
    }
    console.log(row.join(' | '));
}

