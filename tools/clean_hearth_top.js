'use strict';

const path = require('path');
const { readPNG } = require('./png_read');
const { writePNG } = require('./png_util');

const filePath = path.join(__dirname, '..', 'game', 'img', 'characters', '!$UF_Kitchen_Hearth.png');
const img = readPNG(filePath);

// Check and clear the top rows of each 48-row block if it contains purple/magenta fringe
for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
        const startX = col * 48;
        const startY = row * 48;
        for (let y = 0; y < 6; y++) {
            for (let x = 0; x < 48; x++) {
                const idx = ((startY + y) * 144 + (startX + x)) * 4;
                if (img.data[idx + 3] > 0) {
                    const r = img.data[idx], g = img.data[idx + 1], b = img.data[idx + 2];
                    if (r > 60 && b > 60 && g < 40) {
                        img.data[idx + 3] = 0;
                    }
                }
            }
        }
    }
}

writePNG(filePath, 144, 192, img.data);
console.log('Cleaned hearth top border.');
