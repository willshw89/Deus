'use strict';
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const raw = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'pro_sheep_eat.png')), 'sheep_eat');

function isPurpleOrMagenta(r, g, b) {
    if (r > 60 && b > 60 && (r + b) > (g * 2 + 20)) return true;
    if (r > 120 && b > 120 && g < 110) return true;
    if (r > 170 && b > 170) return true;
    return false;
}

// Check where non-bg pixels actually are in row 1
for (let c = 0; c < 6; c++) {
    const x0 = c * 234;
    const x1 = (c + 1) * 234 - 1;
    let minX = 9999, maxX = -1, minY = 9999, maxY = -1, count = 0;
    for (let y = 192; y < 384; y++) {
        for (let x = x0; x <= x1; x++) {
            const idx = (y * raw.width + x) * 4;
            if (!isPurpleOrMagenta(raw.data[idx], raw.data[idx+1], raw.data[idx+2])) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                count++;
            }
        }
    }
    console.log(`Col ${c} [${x0}..${x1}]: ${count} px, bounds X [${minX}..${maxX}] Y [${minY}..${maxY}]`);
}
