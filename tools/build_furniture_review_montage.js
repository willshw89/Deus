'use strict';

const fs = require('fs');
const path = require('path');
const { readPNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');

const PROPS = [
    { id: 'Bed_Wood', name: 'Wooden Bed' },
    { id: 'Chest_Wood', name: 'Storage Chest' },
    { id: 'Dining_Table', name: 'Dining Table' },
    { id: 'Dining_Bench', name: 'Dining Bench' },
    { id: 'Kitchen_Counter', name: 'Prep Counter' },
    { id: 'Kitchen_Pantry', name: 'Food Larder' },
    { id: 'Kitchen_Hearth', name: 'Cooking Hearth' },
    { id: 'Shop_Counter', name: 'Shop Counter' },
    { id: 'Apothecary_Bench', name: 'Apothecary' }
];

// Create a 9-item montage: 3 columns x 3 rows of 48x48 sprites scaled 2x to 96x96 with border
const cellW = 96, cellH = 96;
const cols = 3, rows = 3;
const totalW = cols * cellW, totalH = rows * cellH;
const buf = Buffer.alloc(totalW * totalH * 4);

// Fill with dark slate backdrop
for (let i = 0; i < buf.length; i += 4) {
    buf[i] = 32;
    buf[i + 1] = 34;
    buf[i + 2] = 40;
    buf[i + 3] = 255;
}

PROPS.forEach((p, idx) => {
    const r = Math.floor(idx / cols);
    const c = idx % cols;
    const pngPath = path.join(CHAR_DIR, `!$UF_${p.id}.png`);
    const img = readPNG(pngPath);

    // Frame 0 of top row (0..48, 0..48)
    const startX = c * cellW;
    const startY = r * cellH;

    for (let py = 0; py < 48; py++) {
        for (let px = 0; px < 48; px++) {
            const sIdx = (py * 144 + px) * 4;
            if (img.data[sIdx + 3] > 0) {
                // Draw 2x scale
                for (let dy = 0; dy < 2; dy++) {
                    for (let dx = 0; dx < 2; dx++) {
                        const outX = startX + px * 2 + dx;
                        const outY = startY + py * 2 + dy;
                        const dIdx = (outY * totalW + outX) * 4;
                        buf[dIdx] = img.data[sIdx];
                        buf[dIdx + 1] = img.data[sIdx + 1];
                        buf[dIdx + 2] = img.data[sIdx + 2];
                        buf[dIdx + 3] = 255;
                    }
                }
            }
        }
    }
});

const outPath = path.join(REVIEW_DIR, 'furniture_kitchen_shops_montage.png');
writePNG(outPath, totalW, totalH, buf);
console.log(`Saved montage -> ${outPath} (${totalW}x${totalH})`);
