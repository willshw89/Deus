'use strict';
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');

const ROOT = path.resolve(__dirname, '..');
const img = decodePNG(fs.readFileSync(path.join(ROOT, 'game', 'img', 'characters', '$UF_Sheep_Eat.png')), 'sheep_eat');

for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
        let count = 0, minY = 99, maxY = -1, minX = 99, maxX = -1;
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const idx = ((r * 48 + y) * 144 + (c * 48 + x)) * 4;
                if (img.data[idx + 3] > 0) {
                    count++;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        console.log(`R${r} C${c}: ${count} px, X [${minX}..${maxX}], Y [${minY}..${maxY}]`);
    }
}
