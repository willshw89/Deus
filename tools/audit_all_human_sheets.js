'use strict';

const fs = require('fs');
const path = require('path');
const { checkFrameFacing } = require('./build_pro_human_male');
const { decodePNG } = require('./png_read');

const CHAR_DIR = path.join(__dirname, '..', 'game', 'img', 'characters');
const files = fs.readdirSync(CHAR_DIR).filter(f => {
  const lower = f.toLowerCase();
  return (lower.includes('human') || lower.includes('adam') || lower.includes('eve')) && f.endsWith('.png') && !f.includes('u7bak') && !f.includes('Decomposition');
});

function extractCell(img, c, r) {
  const buf = Buffer.alloc(48 * 48 * 4);
  for (let y = 0; y < 48; y++) {
    for (let x = 0; x < 48; x++) {
      const sIdx = ((r * 48 + y) * img.width + (c * 48 + x)) * 4;
      const dIdx = (y * 48 + x) * 4;
      buf[dIdx] = img.data[sIdx];
      buf[dIdx+1] = img.data[sIdx+1];
      buf[dIdx+2] = img.data[sIdx+2];
      buf[dIdx+3] = img.data[sIdx+3];
    }
  }
  return buf;
}

console.log(`Auditing ${files.length} human character sheets...`);
let brokenCount = 0;
let okCount = 0;

for (const f of files) {
  const filePath = path.join(CHAR_DIR, f);
  const img = decodePNG(fs.readFileSync(filePath));
  if (img.width !== 144 || img.height !== 192) continue;

  const r1 = [0, 1, 2].map(c => checkFrameFacing(extractCell(img, c, 1))).join(' ');
  const r2 = [0, 1, 2].map(c => checkFrameFacing(extractCell(img, c, 2))).join(' ');

  const r1Ok = (r1 === 'LEFT LEFT LEFT');
  const r2Ok = (r2 === 'RIGHT RIGHT RIGHT');

  if (!r1Ok || !r2Ok) {
    brokenCount++;
    console.log(`BROKEN: ${f}`);
    console.log(`  Row 1 (West want L L L): ${r1}`);
    console.log(`  Row 2 (East want R R R): ${r2}`);
  } else {
    okCount++;
  }
}

console.log(`\nAudit Complete: ${okCount} OK, ${brokenCount} BROKEN.`);
