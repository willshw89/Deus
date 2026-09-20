'use strict';

const fs = require('fs');
const { decodePNG } = require('./png_read');
const img = decodePNG(fs.readFileSync('art/raw/human_male_pro_4d_attack.png'));

console.log('width:', img.width, 'height:', img.height);

const rowBlack = [];
for (let y = 0; y < img.height; y++) {
    let blackCount = 0;
    for (let x = 0; x < img.width; x++) {
        const idx = (y * img.width + x) * 4;
        if (img.data[idx] < 25 && img.data[idx+1] < 25 && img.data[idx+2] < 25) blackCount++;
    }
    if (blackCount > img.width * 0.5) rowBlack.push(y);
}
console.log('Horizontal grid lines near rows:', rowBlack);

const colBlack = [];
for (let x = 0; x < img.width; x++) {
    let blackCount = 0;
    for (let y = 0; y < img.height; y++) {
        const idx = (y * img.width + x) * 4;
        if (img.data[idx] < 25 && img.data[idx+1] < 25 && img.data[idx+2] < 25) blackCount++;
    }
    if (blackCount > img.height * 0.5) colBlack.push(x);
}
console.log('Vertical grid lines near cols:', colBlack);

