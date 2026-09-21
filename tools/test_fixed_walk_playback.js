'use strict';
const fs = require('fs');
const path = require('path');
const { checkFrameFacing, mirrorFrame } = require('./build_pro_human_male');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const file = path.join(ROOT, 'game', 'img', 'characters', '$UF_Human_Male_1_Walk.png');
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

// Build proper West row: all 3 frames face LEFT
const westCols = [
  checkFrameFacing(getCell(p, 0, 1)) === 'LEFT' ? getCell(p, 0, 1) : mirrorFrame(getCell(p, 0, 1)),
  checkFrameFacing(getCell(p, 1, 1)) === 'LEFT' ? getCell(p, 1, 1) : mirrorFrame(getCell(p, 1, 1)),
  checkFrameFacing(getCell(p, 2, 1)) === 'LEFT' ? getCell(p, 2, 1) : mirrorFrame(getCell(p, 2, 1))
];

// Build proper East row: all 3 frames face RIGHT (mirror of West)
const eastCols = westCols.map(mirrorFrame);

// Verify facings
console.log('West facings:', westCols.map(checkFrameFacing).join(' '));
console.log('East facings:', eastCols.map(checkFrameFacing).join(' '));

// Generate 5-step playback sheet (Col 1 -> Col 0 -> Col 1 -> Col 2 -> Col 1)
const steps = [1, 0, 1, 2, 1];
const scale = 4;
const pW = 48 * steps.length * scale;
const pH = 48 * 4 * scale;
const pBuf = Buffer.alloc(pW * pH * 4);

// Fill with dark contrast #16171F
for (let i = 0; i < pBuf.length; i += 4) {
  pBuf[i] = 22; pBuf[i+1] = 23; pBuf[i+2] = 31; pBuf[i+3] = 255;
}

const southCols = [getCell(p, 0, 0), getCell(p, 1, 0), getCell(p, 2, 0)];
const northCols = [getCell(p, 0, 3), getCell(p, 1, 3), getCell(p, 2, 3)];

const allRows = [southCols, westCols, eastCols, northCols];

for (let r = 0; r < 4; r++) {
  const rowFrames = allRows[r];
  for (let s = 0; s < steps.length; s++) {
    const frame = rowFrames[steps[s]];
    const dstX0 = s * 48 * scale;
    const dstY0 = r * 48 * scale;
    for (let py = 0; py < 48; py++) {
      for (let px = 0; px < 48; px++) {
        const sIdx = (py * 48 + px) * 4;
        if (frame[sIdx + 3] > 0) {
          const rC = frame[sIdx], gC = frame[sIdx + 1], bC = frame[sIdx + 2];
          for (let dy = 0; dy < scale; dy++) {
            for (let dx = 0; dx < scale; dx++) {
              const dIdx = ((dstY0 + py * scale + dy) * pW + (dstX0 + px * scale + dx)) * 4;
              pBuf[dIdx] = rC; pBuf[dIdx + 1] = gC; pBuf[dIdx + 2] = bC; pBuf[dIdx + 3] = 255;
            }
          }
        }
      }
    }
  }
}

writePNG(path.join(ROOT, 'art', 'review', 'test_fixed_male_playback.png'), pW, pH, pBuf);
console.log('Saved test_fixed_male_playback.png');
