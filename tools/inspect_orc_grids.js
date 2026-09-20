'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'raw');

const FILES = [
    'orc_male_walk_12_raw.png',
    'orc_male_haul_12_raw.png',
    'orc_male_attack_12_raw.png',
    'orc_male_bow_12_raw.png',
    'orc_male_magic_12_raw.png',
    'orc_male_work_12_raw.png',
    'orc_male_downed_12_raw.png'
];

function isMagenta(r, g, b) {
    if (r > 130 && b > 130 && g < 100) return true;
    if (r < 70 && g > 130 && b > 130) return true;
    return false;
}

for (const file of FILES) {
    const p = path.join(RAW_DIR, file);
    if (!fs.existsSync(p)) {
        console.log(`Missing: ${file}`);
        continue;
    }
    const img = decodePNG(fs.readFileSync(p));
    console.log(`\n=== ${file}: ${img.width}x${img.height} ===`);

    // Find bounding box of each connected component or column slices
    // Simple projection on Y axis to find horizontal bands (rows)
    const yProj = new Array(img.height).fill(0);
    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
            const idx = (y * img.width + x) * 4;
            if (!isMagenta(img.data[idx], img.data[idx+1], img.data[idx+2])) {
                yProj[y]++;
            }
        }
    }

    // Identify row bands
    const rowBands = [];
    let inBand = false, startY = 0;
    for (let y = 0; y < img.height; y++) {
        if (yProj[y] > 50) {
            if (!inBand) { inBand = true; startY = y; }
        } else {
            if (inBand) {
                if (y - startY > 50) rowBands.push({ startY, endY: y });
                inBand = false;
            }
        }
    }
    if (inBand) rowBands.push({ startY, endY: img.height - 1 });

    console.log(`Found ${rowBands.length} rows:`);
    rowBands.forEach((b, rIdx) => {
        // Find columns in this row
        const xProj = new Array(img.width).fill(0);
        for (let y = b.startY; y <= b.endY; y++) {
            for (let x = 0; x < img.width; x++) {
                const idx = (y * img.width + x) * 4;
                if (!isMagenta(img.data[idx], img.data[idx+1], img.data[idx+2])) {
                    xProj[x]++;
                }
            }
        }
        const colBands = [];
        let inCol = false, startX = 0;
        for (let x = 0; x < img.width; x++) {
            if (xProj[x] > 20) {
                if (!inCol) { inCol = true; startX = x; }
            } else {
                if (inCol) {
                    if (x - startX > 30) colBands.push({ startX, endX: x });
                    inCol = false;
                }
            }
        }
        if (inCol) colBands.push({ startX, endX: img.width - 1 });

        console.log(`  Row ${rIdx} (y: ${b.startY}..${b.endY}): ${colBands.length} sprites -> cols: ${colBands.map(c => `[${c.startX}..${c.endX}]`).join(', ')}`);
    });
}
