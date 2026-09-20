'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');

const rawDir = path.join(__dirname, '..', 'art', 'raw');
const charDir = path.join(__dirname, '..', 'game', 'img', 'characters');

function inspectImage(filePath, label) {
    if (!fs.existsSync(filePath)) {
        console.log(`${label}: NOT FOUND`);
        return;
    }
    const d = decodePNG(fs.readFileSync(filePath));
    console.log(`=== ${label} (${d.width}x${d.height}) ===`);
    // Find non-transparent / non-magenta bounding box
    let minX = d.width, maxX = 0, minY = d.height, maxY = 0, totalOpaque = 0;
    for (let y = 0; y < d.height; y++) {
        for (let x = 0; x < d.width; x++) {
            const idx = (y * d.width + x) * 4;
            const a = d.data[idx + 3];
            const r = d.data[idx], g = d.data[idx + 1], b = d.data[idx + 2];
            const isMag = (r > 165 && g < 85 && b > 165);
            if (a > 0 && !isMag) {
                totalOpaque++;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    console.log(`  Opaque pixels: ${totalOpaque}, Bounds: (${minX},${minY}) to (${maxX},${maxY}) [${maxX - minX + 1}x${maxY - minY + 1}]`);
}

inspectImage(path.join(rawDir, 'human_male_adult_walk.png'), 'RAW Male Walk');
inspectImage(path.join(rawDir, 'human_male_adult_attack.png'), 'RAW Male Attack');
inspectImage(path.join(rawDir, 'human_male_adult_carry.png'), 'RAW Male Carry');
inspectImage(path.join(rawDir, 'human_male_adult_cast.png'), 'RAW Male Cast');
inspectImage(path.join(rawDir, 'human_male_adult_work.png'), 'RAW Male Work');
inspectImage(path.join(rawDir, 'human_male_adult_death.png'), 'RAW Male Death');
inspectImage(path.join(charDir, '$UF_Human_Attack_Bow.png'), 'CHAR Human Attack Bow');
inspectImage(path.join(charDir, '$UF_Human_Male_Bow_8D.png'), 'CHAR Human Male Bow 8D');
