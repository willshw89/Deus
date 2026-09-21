'use strict';
const fs = require('fs');
const path = require('path');
const { checkFrameFacing, mirrorFrame } = require('./build_pro_human_male');
const { decodePNG } = require('./png_read');

const file = path.join(__dirname, '..', 'game', 'img', 'characters', '$UF_Human_Male_1_Walk.png');
const p = decodePNG(fs.readFileSync(file));

function getCell(img, c, r) {
  const buf = Buffer.alloc(48 * 48 * 4);
  for (let y = 0; y < 48; y++) {
    for (let x = 0; x < 48; x++) {
      const s = ((r * 48 + y) * img.width + (c * 48 + x)) * 4;
      const d = (y * 48 + x) * 4;
      for (let i = 0; i < 4; i++) buf[d + i] = img.data[s + i];
    }
  }
  return buf;
}

const cell0 = getCell(p, 0, 1);
const cell1 = getCell(p, 1, 1);
const cell2 = getCell(p, 2, 1);

console.log('Row 1 Cell 0:', checkFrameFacing(cell0));
console.log('Row 1 Cell 1:', checkFrameFacing(cell1));
console.log('Row 1 Cell 2:', checkFrameFacing(cell2));

console.log('Mirrored Cell 0:', checkFrameFacing(mirrorFrame(cell0)));
console.log('Mirrored Cell 1:', checkFrameFacing(mirrorFrame(cell1)));
console.log('Mirrored Cell 2:', checkFrameFacing(mirrorFrame(cell2)));
