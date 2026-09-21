'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');

const CHAR_DIR = path.join(__dirname, '..', 'game', 'img', 'characters');
const walkFiles = [
  '$UF_Human_Male_1_Walk.png',
  '$UF_Human_Male_2_Walk.png',
  '$UF_Human_Male_3_Walk.png',
  '$UF_Human_Male_4_Walk.png',
  '$UF_Human_Male_5_Walk.png',
  '$UF_Human_Male_6_Walk.png',
  '$UF_Human_Female_1_Walk.png',
  '$UF_Human_Female_2_Walk.png',
  '$UF_Human_Female_3_Walk.png',
  '$UF_Human_Female_4_Walk.png',
  '$UF_Human_Female_5_Walk.png',
  '$UF_Human_Female_6_Walk.png',
  '$UF_Human_Child_Walk.png'
];

function analyzeFeetSpread(img, col, row) {
  // Check rows y: 38..47 (feet region)
  let minX = 48, maxX = 0;
  for (let y = 38; y < 48; y++) {
    for (let x = 0; x < 48; x++) {
      const idx = ((row * 48 + y) * img.width + (col * 48 + x)) * 4;
      if (img.data[idx + 3] > 50) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
  }
  return maxX - minX + 1;
}

console.log('Analyzing foot spread in Row 1 (West) across all walk sheets:');
console.log('File | Col 0 spread | Col 1 spread | Col 2 spread');
for (const f of walkFiles) {
  const p = decodePNG(fs.readFileSync(path.join(CHAR_DIR, f)));
  const s0 = analyzeFeetSpread(p, 0, 1);
  const s1 = analyzeFeetSpread(p, 1, 1);
  const s2 = analyzeFeetSpread(p, 2, 1);
  console.log(`${f.padEnd(28)} | ${String(s0).padEnd(12)} | ${String(s1).padEnd(12)} | ${String(s2).padEnd(12)}`);
}
