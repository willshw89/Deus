'use strict';
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');

const img = decodePNG(fs.readFileSync(path.join(__dirname, '..', 'art', 'raw', 'pro_wolf_walk.png')), 'wolf');
console.log('Dimensions:', img.width, 'x', img.height);

// Check background magenta
function isMagenta(r, g, b) {
    return (r > 180 && g < 70 && b > 180);
}

// Find horizontal lines (black grid lines between rows)
const rowBlack = new Array(img.height).fill(0);
for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
        const idx = (y * img.width + x) * 4;
        const r = img.data[idx], g = img.data[idx + 1], b = img.data[idx + 2];
        if (r < 30 && g < 30 && b < 30) {
            rowBlack[y]++;
        }
    }
}

// Find column black lines
const colBlack = new Array(img.width).fill(0);
for (let x = 0; x < img.width; x++) {
    for (let y = 0; y < img.height; y++) {
        const idx = (y * img.width + x) * 4;
        const r = img.data[idx], g = img.data[idx + 1], b = img.data[idx + 2];
        if (r < 30 && g < 30 && b < 30) {
            colBlack[x]++;
        }
    }
}

console.log('Row height roughly:', img.height / 4);
console.log('Col width roughly:', img.width / 5);

