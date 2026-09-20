'use strict';

const fs = require('fs');
const path = require('path');
const { readPNG } = require('./png_read');

const img = readPNG('art/raw/props_domestic_kitchen_shops_nano_pro.png');
const { width, height, data } = img;

function isBg(r, g, b, a) {
    if (a < 64) return true;
    // Magenta background
    if (r > 150 && b > 150 && g < 110) return true;
    // Black grid border line (r < 30, g < 30, b < 30) along cell edges
    return false;
}

const cellW = width / 3;
const cellH = height / 3;

console.log(`Dimensions: ${width}x${height}, cell size: ${cellW}x${cellH}`);

const names = [
    ['bed_wood', 'chest_wood', 'dining_table'],
    ['dining_bench', 'kitchen_counter', 'kitchen_pantry'],
    ['kitchen_hearth', 'shop_counter', 'apothecary_bench']
];

for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
        const startX = Math.round(c * cellW) + 5;
        const endX = Math.round((c + 1) * cellW) - 5;
        const startY = Math.round(r * cellH) + 5;
        const endY = Math.round((r + 1) * cellH) - 5;

        let minX = endX, maxX = startX, minY = endY, maxY = startY;
        let count = 0;

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const idx = (y * width + x) * 4;
                const red = data[idx], green = data[idx + 1], blue = data[idx + 2], alpha = data[idx + 3];
                // Ignore black border lines near boundaries
                if (red < 20 && green < 20 && blue < 20 && (x < startX + 10 || x > endX - 10 || y < startY + 10 || y > endY - 10)) {
                    continue;
                }
                if (!isBg(red, green, blue, alpha)) {
                    count++;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        const bw = maxX >= minX ? maxX - minX + 1 : 0;
        const bh = maxY >= minY ? maxY - minY + 1 : 0;
        console.log(`[${r},${c}] ${names[r][c]}: bbox (${minX}, ${minY}) to (${maxX}, ${maxY}) = ${bw}x${bh} px (${count} px)`);
    }
}
