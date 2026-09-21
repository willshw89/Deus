'use strict';

const fs = require('fs');
const path = require('path');
const { readPNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const BRAIN_DIR = "C:/Users/snewt/.gemini/antigravity/brain/68544d17-f5bb-452f-930d-323a949c82b4";

const p1 = readPNG(path.join(ROOT, 'art', 'raw', 'm1.png'));
const pRefR4C3 = readPNG(path.join(ROOT, 'art', 'raw', 'ref_r4c3_approved.png'));

function isPinkish(r, g, b) {
  return (r > 100 && b > 100 && g < 100 && (r + b) > 2.5 * g);
}

const outW = p1.width, outH = p1.height;
const outBuf = Buffer.alloc(outW * outH * 4);
p1.data.copy(outBuf);

// Preserve Rows 1, 2, 3 and Row 4 Col 1 from p1.
// Clear Row 4 Col 2 (x: 299..596, y: 900..1198) and Col 3 (x: 599..894, y: 900..1198)
for (let y = 900; y <= 1198; y++) {
  for (let x = 299; x <= 894; x++) {
    if (x === 597 || x === 598) continue;
    const idx = (y * outW + x) * 4;
    outBuf[idx] = 255; outBuf[idx+1] = 0; outBuf[idx+2] = 255; outBuf[idx+3] = 255;
  }
}

// In p1, R4C1 lower body:
// x: 25..269 (w: 245, center = 147), y: 1056..1175 (hinge at 1056, base at 1175)
const targetW = 245;
const r4c1_x0 = 25;
const hingeY = 1056;
const baseY = 1175;

// Copy R4C1 lower body to Col 2 (center = 447) and Col 3 (center = 747)
const colCenters = [147, 447, 747];

for (let c = 1; c <= 2; c++) {
  const dstX0 = colCenters[c] - Math.floor(targetW / 2);
  for (let y = hingeY; y <= baseY; y++) {
    for (let dx = 0; dx < targetW; dx++) {
      const sIdx = (y * outW + (r4c1_x0 + dx)) * 4;
      const dIdx = (y * outW + (dstX0 + dx)) * 4;
      const r = p1.data[sIdx], g = p1.data[sIdx+1], b = p1.data[sIdx+2];
      if (!isPinkish(r, g, b)) {
        outBuf[dIdx] = r; outBuf[dIdx+1] = g; outBuf[dIdx+2] = b; outBuf[dIdx+3] = 255;
      }
    }
  }
}

// In ref_r4c3_approved.png (w: 600, h: 896):
// Chest width: x: 33..563 (w: 531, center = 298)
// Lid: y: 129..476 (h: 348)
const ref_lid_y0 = 129, ref_lid_h = 476 - 129 + 1; // 348
const ref_x0 = 33, ref_w = 531;

// === Col 3: Fully Open Vertical Lid ===
const r4c3_h = 151; // fits inside row 4 (905 to 1056)
const r4c3_top = hingeY - r4c3_h;
const r4c3_x0 = colCenters[2] - Math.floor(targetW / 2);

for (let dy = 0; dy < r4c3_h; dy++) {
  const sy = ref_lid_y0 + Math.floor((dy / r4c3_h) * ref_lid_h);
  const dstY = r4c3_top + dy;
  if (dstY < 900) continue;
  for (let dx = 0; dx < targetW; dx++) {
    const sx = ref_x0 + Math.floor((dx / targetW) * ref_w);
    const sIdx = (sy * pRefR4C3.width + sx) * 4;
    const r = pRefR4C3.data[sIdx], g = pRefR4C3.data[sIdx+1], b = pRefR4C3.data[sIdx+2];
    if (!isPinkish(r, g, b)) {
      const dIdx = (dstY * outW + (r4c3_x0 + dx)) * 4;
      outBuf[dIdx] = r; outBuf[dIdx+1] = g; outBuf[dIdx+2] = b; outBuf[dIdx+3] = 255;
    }
  }
}

// === Col 2: Half-Open 45-degree Lid ===
const r4c2_h = 125;
const r4c2_top = hingeY - r4c2_h;
const r4c2_x0 = colCenters[1] - Math.floor(targetW / 2);

for (let dy = 0; dy < r4c2_h; dy++) {
  const sy = ref_lid_y0 + Math.floor((dy / r4c2_h) * ref_lid_h);
  const dstY = r4c2_top + dy;
  for (let dx = 0; dx < targetW; dx++) {
    const sx = ref_x0 + Math.floor((dx / targetW) * ref_w);
    const sIdx = (sy * pRefR4C3.width + sx) * 4;
    const r = pRefR4C3.data[sIdx], g = pRefR4C3.data[sIdx+1], b = pRefR4C3.data[sIdx+2];
    if (!isPinkish(r, g, b)) {
      const dIdx = (dstY * outW + (r4c2_x0 + dx)) * 4;
      outBuf[dIdx] = r; outBuf[dIdx+1] = g; outBuf[dIdx+2] = b; outBuf[dIdx+3] = 255;
    }
  }
}
// Top rim outline for tilted lid
for (let dx = 0; dx < targetW; dx++) {
  const dIdx = (r4c2_top * outW + (r4c2_x0 + dx)) * 4;
  if (outBuf[dIdx+3] === 255 && !isPinkish(outBuf[dIdx], outBuf[dIdx+1], outBuf[dIdx+2])) {
    outBuf[dIdx] = 25; outBuf[dIdx+1] = 20; outBuf[dIdx+2] = 20;
  }
}

const pinkOutPath = path.join(ROOT, 'art', 'masters', 'deus_chest_master_12sprites_pink.png');
writePNG(pinkOutPath, outW, outH, outBuf);
fs.copyFileSync(pinkOutPath, path.join(BRAIN_DIR, 'deus_chest_master_12sprites_pink.png'));
console.log('Saved 12-sprite pink master sheet to:', pinkOutPath);

