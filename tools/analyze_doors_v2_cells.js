'use strict';

const fs = require('fs');
const { readPNG } = require('./png_read');

const img = readPNG('art/raw/doors_v2_nano_pro.png');
console.log('Image dimensions:', img.width, 'x', img.height);

const numCols = 6;
const numRows = 3;
const colW = Math.floor(img.width / numCols); // 234
const rowH = Math.floor(img.height / numRows); // 256

for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
        const startX = c * colW;
        const startY = r * rowH;
        let minX = 9999, maxX = -1, minY = 9999, maxY = -1;
        let nonMagentaCount = 0;

        for (let y = startY + 2; y < startY + rowH - 2; y++) {
            for (let x = startX + 2; x < startX + colW - 2; x++) {
                const idx = (y * img.width + x) * 4;
                const red = img.data[idx];
                const green = img.data[idx + 1];
                const blue = img.data[idx + 2];
                // Check if not magenta background
                const isMagenta = (red > 200 && green < 80 && blue > 200);
                if (!isMagenta) {
                    nonMagentaCount++;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        console.log(`Cell [R${r}, C${c}]: bounds=(${minX - startX}, ${minY - startY}) to (${maxX - startX}, ${maxY - startY}), size=${maxX - minX + 1}x${maxY - minY + 1}, pixels=${nonMagentaCount}`);
    }
}

