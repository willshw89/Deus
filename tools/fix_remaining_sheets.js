'use strict';

const fs = require('fs');
const path = require('path');
const { checkFrameFacing, mirrorFrame } = require('./build_pro_human_male');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const CHAR_DIR = path.join(__dirname, '..', 'game', 'img', 'characters');

function fixSheet(filename) {
  const filePath = path.join(CHAR_DIR, filename);
  if (!fs.existsSync(filePath)) return;
  const p = decodePNG(fs.readFileSync(filePath));
  const out = Buffer.from(p.data);

  function getCellFrom(buf, c, r) {
    const cell = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
      for (let x = 0; x < 48; x++) {
        const s = ((r * 48 + y) * 144 + (c * 48 + x)) * 4;
        const d = (y * 48 + x) * 4;
        for (let i = 0; i < 4; i++) cell[d + i] = buf[s + i];
      }
    }
    return cell;
  }

  function setCellOn(buf, c, r, cell) {
    for (let y = 0; y < 48; y++) {
      for (let x = 0; x < 48; x++) {
        const s = (y * 48 + x) * 4;
        const d = ((r * 48 + y) * 144 + (c * 48 + x)) * 4;
        for (let i = 0; i < 4; i++) buf[d + i] = cell[s + i];
      }
    }
  }

  // Row 1: ensure all 3 frames face LEFT
  for (let c = 0; c < 3; c++) {
    const cell = getCellFrom(p.data, c, 1);
    const facing = checkFrameFacing(cell);
    const leftCell = (facing === 'RIGHT') ? mirrorFrame(cell) : cell;
    setCellOn(out, c, 1, leftCell);
    // Row 2: exact mirror of leftCell -> guaranteed RIGHT
    setCellOn(out, c, 2, mirrorFrame(leftCell));
  }

  writePNG(filePath, 144, 192, out);
  console.log(`Repaired ${filename}`);
}

fixSheet('$UF_Human_Female_4_Work.png');
fixSheet('$UF_Human_Female_4_Downed.png');
fixSheet('$UF_Human_Male_1_Downed.png');
fixSheet('$UF_Human_Male_Downed.png');
