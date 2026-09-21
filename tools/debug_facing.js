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

const c0 = getCell(p, 0, 1);
const c1 = getCell(p, 1, 1);
const c2 = getCell(p, 2, 1);

console.log('c0 raw:', checkFrameFacing(c0));
console.log('c1 raw:', checkFrameFacing(c1));
console.log('c2 raw:', checkFrameFacing(c2));

const m0 = mirrorFrame(c0);
const m1 = mirrorFrame(c1);
const m2 = mirrorFrame(c2);

console.log('m0 (mirror of c0):', checkFrameFacing(m0));
console.log('m1 (mirror of c1):', checkFrameFacing(m1));
console.log('m2 (mirror of c2):', checkFrameFacing(m2));
