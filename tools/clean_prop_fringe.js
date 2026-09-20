'use strict';

const fs = require('fs');
const path = require('path');
const { readPNG } = require('./png_read');
const { writePNG } = require('./png_util');

const CHAR_DIR = path.join(__dirname, '..', 'game', 'img', 'characters');

const PROPS = [
    'Bed_Wood',
    'Chest_Wood',
    'Dining_Table',
    'Dining_Bench',
    'Kitchen_Counter',
    'Kitchen_Pantry',
    'Kitchen_Hearth',
    'Shop_Counter',
    'Apothecary_Bench'
];

for (const prop of PROPS) {
    const pngPath = path.join(CHAR_DIR, `!$UF_${prop}.png`);
    const img = readPNG(pngPath);
    let cleaned = 0;

    for (let i = 0; i < img.data.length; i += 4) {
        if (img.data[i + 3] === 0) continue;
        const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
        // Detect magenta / purple fringe: high R, high B, low G
        if (r > 100 && b > 100 && g < 50 && Math.abs(r - b) < 60) {
            img.data[i + 3] = 0;
            cleaned++;
        }
    }
    if (cleaned > 0) {
        writePNG(pngPath, img.width, img.height, img.data);
        console.log(`Cleaned ${cleaned} stray fringe pixels in ${prop}`);
    }
}
