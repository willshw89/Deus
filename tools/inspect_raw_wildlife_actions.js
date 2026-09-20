'use strict';
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'raw');

const files = [
    'pro_boar_walk.png',
    'pro_boar_eat.png',
    'pro_boar_attack.png',
    'pro_boar_sleep.png',
    'pro_deer_walk.png',
    'pro_deer_eat.png',
    'pro_deer_attack.png',
    'pro_deer_sleep.png'
];

function isBg(r, g, b) {
    if (r > 60 && b > 60 && (r + b) > (g * 2 + 20)) return true;
    if (r > 120 && b > 120 && g < 110) return true;
    if (r > 170 && b > 170) return true;
    return false;
}

for (const f of files) {
    const p = path.join(RAW_DIR, f);
    if (!fs.existsSync(p)) {
        console.log(`${f}: MISSING`);
        continue;
    }
    const raw = decodePNG(fs.readFileSync(p), f);
    console.log(`\n=== ${f} (${raw.width}x${raw.height}) ===`);

    // Divide into 4 rows, 3 cols
    const cellW = Math.floor(raw.width / 3);
    const cellH = Math.floor(raw.height / 4);

    for (let r = 0; r < 4; r++) {
        const rowNames = ['South (Row 0)', 'West (Row 1)', 'East (Row 2)', 'North (Row 3)'];
        let rowInfo = `  ${rowNames[r]}: `;
        for (let c = 0; c < 3; c++) {
            const x0 = c * cellW;
            const y0 = r * cellH;
            const x1 = (c + 1) * cellW - 1;
            const y1 = (r + 1) * cellH - 1;

            let minX = 9999, maxX = -1, minY = 9999, maxY = -1;
            for (let y = y0; y <= y1; y++) {
                for (let x = x0; x <= x1; x++) {
                    const idx = (y * raw.width + x) * 4;
                    const pr = raw.data[idx], pg = raw.data[idx + 1], pb = raw.data[idx + 2];
                    if (!isBg(pr, pg, pb)) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }
            if (minX <= maxX) {
                rowInfo += `[C${c}: ${maxX - minX + 1}x${maxY - minY + 1} @(${minX},${minY})] `;
            } else {
                rowInfo += `[C${c}: EMPTY] `;
            }
        }
        console.log(rowInfo);
    }
}
