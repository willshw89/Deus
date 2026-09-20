'use strict';

const fs = require('fs');
const path = require('path');
const { readPNG } = require('./png_read');

const img = readPNG('art/raw/decomposition_nano_pro.png');
console.log('Image dimensions:', img.width, 'x', img.height);

const numCols = 4;
const numRows = 3;
const cellW = Math.floor(img.width / numCols); // 352
const cellH = Math.floor(img.height / numRows); // 256

for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
        const startX = c * cellW;
        const startY = r * cellH;
        let minX = 9999, maxX = -1, minY = 9999, maxY = -1;
        let nonMagentaCount = 0;

        for (let y = startY + 5; y < startY + cellH - 5; y++) {
            for (let x = startX + 5; x < startX + cellW - 5; x++) {
                const idx = (y * img.width + x) * 4;
                const red = img.data[idx];
                const green = img.data[idx + 1];
                const blue = img.data[idx + 2];
                // Check if not black border and not magenta background
                const isMagenta = (red > 200 && green < 80 && blue > 200);
                const isBorder = (red < 30 && green < 30 && blue < 30 && (x < startX + 10 || x > startX + cellW - 10 || y < startY + 10 || y > startY + cellH - 10));
                if (!isMagenta && !isBorder) {
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
