'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');

const ROOT = path.resolve(__dirname, '..');
const file = path.join(ROOT, 'art', 'raw', 'human_male_adult_walk.png');
const d = decodePNG(fs.readFileSync(file));

console.log('Image dimensions:', d.width, 'x', d.height);

// Check each of the 8 rows (each 192px tall)
for (let r = 0; r < 8; r++) {
    const y0 = r * 192;
    const y1 = y0 + 192;
    let minX = d.width, maxX = 0, minY = y1, maxY = y0, count = 0;
    for (let y = y0; y < y1; y++) {
        for (let x = 0; x < d.width; x++) {
            const idx = (y * d.width + x) * 4;
            const a = d.data[idx + 3];
            const red = d.data[idx], green = d.data[idx + 1], blue = d.data[idx + 2];
            const isMag = (red > 170 && green < 80 && blue > 170);
            if (a > 0 && !isMag) {
                count++;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    console.log(`Row ${r} (y: ${y0}..${y1}): count=${count}, bounds=(${minX}, ${minY}) to (${maxX}, ${maxY}), size=${maxX - minX + 1}x${maxY - minY + 1}`);
}
