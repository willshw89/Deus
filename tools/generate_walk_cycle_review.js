'use strict';
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');

const sheets = [
    { title: 'Male Settler Var 1', file: '$UF_Human_Male_1_Walk.png' },
    { title: 'Female Settler Var 1', file: '$UF_Human_Female_1_Walk.png' },
    { title: 'Human Child', file: '$UF_Human_Child_Walk.png' },
    { title: 'Procedural Gen 0', file: '$gen_c0.png' }
];

// Composite 4 sheets side by side: Width = 4 * 144 = 576, Height = 192
const totalW = sheets.length * 144;
const totalH = 192;
const composite = Buffer.alloc(totalW * totalH * 4);

sheets.forEach((s, idx) => {
    const p = path.join(CHAR_DIR, s.file);
    const img = decodePNG(fs.readFileSync(p));
    const xOff = idx * 144;
    for (let y = 0; y < 192; y++) {
        for (let x = 0; x < 144; x++) {
            const sIdx = (y * 144 + x) * 4;
            const dIdx = (y * totalW + (xOff + x)) * 4;
            composite[dIdx]   = img.data[sIdx];
            composite[dIdx+1] = img.data[sIdx+1];
            composite[dIdx+2] = img.data[sIdx+2];
            composite[dIdx+3] = img.data[sIdx+3];
        }
    }
});

const outPath = path.join(REVIEW_DIR, 'walk_cycle_direction_verified_montage.png');
writePNG(outPath, totalW, totalH, composite);
console.log('Saved verified walk montage to:', outPath);
