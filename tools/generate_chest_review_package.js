'use strict';

const fs = require('fs');
const path = require('path');
const { readPNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const STAGING_DIR = path.join(ROOT, 'art', 'staging');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');
const BRAIN_DIR = process.env.ARTIFACT_DIR || "C:/Users/snewt/.gemini/antigravity/brain/28d55bd5-5c9e-48a3-84ae-0a03f62bd3d0";
try { fs.mkdirSync(BRAIN_DIR, { recursive: true }); } catch (e) {}

const sheetPng = readPNG(path.join(STAGING_DIR, '!$UF_Chest_Wood.png'));

// 1. Generate 4x Contact Sheet (144*4 x 192*4 = 576 x 768)
const scale = 4;
const csW = 144 * scale;
const csH = 192 * scale;
const csBuf = Buffer.alloc(csW * csH * 4);

// Background: #16171f
for (let i = 0; i < csBuf.length; i += 4) {
    csBuf[i] = 22; csBuf[i + 1] = 23; csBuf[i + 2] = 31; csBuf[i + 3] = 255;
}

for (let y = 0; y < 192; y++) {
    for (let x = 0; x < 144; x++) {
        const sIdx = (y * 144 + x) * 4;
        const a = sheetPng.data[sIdx + 3];
        if (a === 255) {
            const r = sheetPng.data[sIdx], g = sheetPng.data[sIdx + 1], b = sheetPng.data[sIdx + 2];
            for (let dy = 0; dy < scale; dy++) {
                for (let dx = 0; dx < scale; dx++) {
                    const dIdx = (((y * scale) + dy) * csW + ((x * scale) + dx)) * 4;
                    csBuf[dIdx] = r;
                    csBuf[dIdx + 1] = g;
                    csBuf[dIdx + 2] = b;
                    csBuf[dIdx + 3] = 255;
                }
            }
        }
    }
}

// Add cell grid lines at every 48*scale
for (let c = 1; c < 3; c++) {
    const gx = c * 48 * scale;
    for (let y = 0; y < csH; y++) {
        const idx = (y * csW + gx) * 4;
        csBuf[idx] = 60; csBuf[idx + 1] = 65; csBuf[idx + 2] = 85; csBuf[idx + 3] = 255;
    }
}
for (let r = 1; r < 4; r++) {
    const gy = r * 48 * scale;
    for (let x = 0; x < csW; x++) {
        const idx = (gy * csW + x) * 4;
        csBuf[idx] = 60; csBuf[idx + 1] = 65; csBuf[idx + 2] = 85; csBuf[idx + 3] = 255;
    }
}

const csPath = path.join(REVIEW_DIR, 'chest_repair_contact_sheet.png');
writePNG(csPath, csW, csH, csBuf);
fs.copyFileSync(csPath, path.join(BRAIN_DIR, 'chest_repair_contact_sheet.png'));
console.log('Saved contact sheet to review & brain');

// 2. Playback Cycle Sheet:
// 4 Rows (DOWN, LEFT, RIGHT, UP)
// 5 Columns: Frame 0 (Closed) -> Frame 1 (Opening) -> Frame 2 (Open Hold) -> Frame 1 (Closing) -> Frame 0 (Closed)
const cycleCols = [0, 1, 2, 1, 0];
const pW = 48 * cycleCols.length * scale; // 48 * 5 * 4 = 960
const pH = 48 * 4 * scale; // 48 * 4 * 4 = 768
const pBuf = Buffer.alloc(pW * pH * 4);

for (let i = 0; i < pBuf.length; i += 4) {
    pBuf[i] = 18; pBuf[i + 1] = 19; pBuf[i + 2] = 26; pBuf[i + 3] = 255;
}

for (let r = 0; r < 4; r++) {
    for (let ci = 0; ci < cycleCols.length; ci++) {
        const c = cycleCols[ci];
        const srcX0 = c * 48;
        const srcY0 = r * 48;
        const dstX0 = ci * 48 * scale;
        const dstY0 = r * 48 * scale;

        for (let py = 0; py < 48; py++) {
            for (let px = 0; px < 48; px++) {
                const sIdx = ((srcY0 + py) * 144 + (srcX0 + px)) * 4;
                if (sheetPng.data[sIdx + 3] === 255) {
                    const rCol = sheetPng.data[sIdx], gCol = sheetPng.data[sIdx + 1], bCol = sheetPng.data[sIdx + 2];
                    for (let dy = 0; dy < scale; dy++) {
                        for (let dx = 0; dx < scale; dx++) {
                            const dIdx = ((dstY0 + py * scale + dy) * pW + (dstX0 + px * scale + dx)) * 4;
                            pBuf[dIdx] = rCol;
                            pBuf[dIdx + 1] = gCol;
                            pBuf[dIdx + 2] = bCol;
                            pBuf[dIdx + 3] = 255;
                        }
                    }
                }
            }
        }
    }
}

const pbPath = path.join(REVIEW_DIR, 'chest_repair_playback_cycle.png');
writePNG(pbPath, pW, pH, pBuf);
fs.copyFileSync(pbPath, path.join(BRAIN_DIR, 'chest_repair_playback_cycle.png'));
console.log('Saved playback cycle sheet to review & brain');

// 3. In-Context Gameplay Preview:
// Beside adult colonist sprite on temperate meadow & wood plank floor
const ctxW = 672, ctxH = 384;
const ctxBuf = Buffer.alloc(ctxW * ctxH * 4);

// Meadow background top half, plank floor bottom half
for (let y = 0; y < ctxH; y++) {
    for (let x = 0; x < ctxW; x++) {
        const idx = (y * ctxW + x) * 4;
        if (y < 192) {
            // Meadow grass texture
            const grassVar = ((x * 13 + y * 7) % 19 < 4) ? 5 : 0;
            ctxBuf[idx] = 72 + grassVar; ctxBuf[idx + 1] = 115 + grassVar; ctxBuf[idx + 2] = 52; ctxBuf[idx + 3] = 255;
        } else {
            // Wood plank floor
            const plankY = (y - 192) % 48;
            const seam = (plankY === 0 || plankY === 47);
            const rWood = seam ? 78 : 138, gWood = seam ? 52 : 92, bWood = seam ? 32 : 58;
            ctxBuf[idx] = rWood; ctxBuf[idx + 1] = gWood; ctxBuf[idx + 2] = bWood; ctxBuf[idx + 3] = 255;
        }
    }
}

// Load human colonist if available
let colonistPng = null;
const colonistFile = path.join(ROOT, 'game', 'img', 'characters', '$UF_Human_Male_Walk.png');
if (fs.existsSync(colonistFile)) colonistPng = readPNG(colonistFile);

function blitSprite(srcPng, sx0, sy0, sw, sh, dx0, dy0, scaleFactor = 1) {
    for (let sy = 0; sy < sh; sy++) {
        for (let sx = 0; sx < sw; sx++) {
            const sIdx = ((sy0 + sy) * srcPng.width + (sx0 + sx)) * 4;
            if (srcPng.data[sIdx + 3] === 255) {
                const r = srcPng.data[sIdx], g = srcPng.data[sIdx + 1], b = srcPng.data[sIdx + 2];
                for (let dy = 0; dy < scaleFactor; dy++) {
                    for (let dx = 0; dx < scaleFactor; dx++) {
                        const targetX = dx0 + sx * scaleFactor + dx;
                        const targetY = dy0 + sy * scaleFactor + dy;
                        if (targetX >= 0 && targetX < ctxW && targetY >= 0 && targetY < ctxH) {
                            const dIdx = (targetY * ctxW + targetX) * 4;
                            ctxBuf[dIdx] = r;
                            ctxBuf[dIdx + 1] = g;
                            ctxBuf[dIdx + 2] = b;
                            ctxBuf[dIdx + 3] = 255;
                        }
                    }
                }
            }
        }
    }
}

// Render 4 facings (closed and open) at 2x scale
// Row 1 (Meadow): Closed chests facing DOWN, LEFT, RIGHT, UP beside Colonist
const facings = [
    { name: "DOWN", row: 0, x: 48 },
    { name: "LEFT", row: 1, x: 176 },
    { name: "RIGHT", row: 2, x: 304 },
    { name: "UP", row: 3, x: 432 }
];

// Draw Closed chests on grass (y = 50)
for (const f of facings) {
    blitSprite(sheetPng, 0, f.row * 48, 48, 48, f.x, 50, 2);
}
// Colonist standing on grass (y = 50, x = 560)
if (colonistPng) {
    blitSprite(colonistPng, 0, 0, 48, 48, 560, 50, 2);
}

// Draw Fully Open chests on wood planks (y = 230)
for (const f of facings) {
    blitSprite(sheetPng, 96, f.row * 48, 48, 48, f.x, 230, 2);
}
// Colonist standing on planks (y = 230, x = 560)
if (colonistPng) {
    blitSprite(colonistPng, 0, 0, 48, 48, 560, 230, 2);
}

const ctxPath = path.join(REVIEW_DIR, 'chest_repair_context_preview.png');
writePNG(ctxPath, ctxW, ctxH, ctxBuf);
fs.copyFileSync(ctxPath, path.join(BRAIN_DIR, 'chest_repair_context_preview.png'));
console.log('Saved context preview to review & brain');

// 4. Interactive HTML Animation Review
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>DEUS Asset Pipeline — Chest Animation Review</title>
<style>
  body { background: #12131a; color: #e0e0ea; font-family: monospace; padding: 24px; }
  h1 { color: #d4a359; font-size: 20px; }
  h2 { color: #8fa0c0; font-size: 15px; margin-top: 24px; border-bottom: 1px solid #2e3245; padding-bottom: 6px; }
  .grid { display: flex; gap: 32px; flex-wrap: wrap; margin-top: 16px; }
  .card { background: #1a1b26; border: 1px solid #2e3245; border-radius: 6px; padding: 16px; text-align: center; }
  .canvas-wrap { background: #222334; border: 1px solid #3c405a; display: inline-block; padding: 8px; border-radius: 4px; }
  canvas { image-rendering: pixelated; width: 144px; height: 144px; }
  .status { margin-top: 8px; font-size: 12px; color: #73c991; }
  .meta { font-size: 11px; color: #888ca0; margin-top: 4px; }
</style>
</head>
<body>
<h1>PROJECT DEUS — REPAIRED CHEST ASSET FAMILY REVIEW</h1>
<p>Animation playback cycle: Closed (Col 1) &rarr; Half-Open (Col 2) &rarr; Fully Open (Col 3) &rarr; Half-Open (Col 2) &rarr; Closed (Col 1) at 150ms per frame.</p>

<h2>Interactive Animated Playback (All 4 Facings)</h2>
<div class="grid">
  <div class="card">
    <div class="canvas-wrap"><canvas id="cv_down" width="48" height="48"></canvas></div>
    <div class="status">ROW 1: DOWN (South)</div>
    <div class="meta">Hinged rear, front latch, empty oak interior</div>
  </div>
  <div class="card">
    <div class="canvas-wrap"><canvas id="cv_left" width="48" height="48"></canvas></div>
    <div class="status">ROW 2: LEFT (West)</div>
    <div class="meta">Latch on left, hinge on right, empty interior</div>
  </div>
  <div class="card">
    <div class="canvas-wrap"><canvas id="cv_right" width="48" height="48"></canvas></div>
    <div class="status">ROW 3: RIGHT (East)</div>
    <div class="meta">Latch on right, hinge on left, empty interior</div>
  </div>
  <div class="card">
    <div class="canvas-wrap"><canvas id="cv_up" width="48" height="48"></canvas></div>
    <div class="status">ROW 4: UP (North)</div>
    <div class="meta">Rear oak wall, rear hinges, vertical lid back</div>
  </div>
</div>

<h2>Static Frame Inspection Sheets</h2>
<p><a href="chest_repair_contact_sheet.png" target="_blank">View 4x Master Contact Sheet</a> | <a href="chest_repair_playback_cycle.png" target="_blank">View 5-Step Playback Cycle Sheet</a> | <a href="chest_repair_context_preview.png" target="_blank">View In-Context Preview</a></p>

<script>
const img = new Image();
img.src = '!$UF_Chest_Wood.png';
img.onload = () => {
  const canvases = [
    { id: 'cv_down', row: 0 },
    { id: 'cv_left', row: 1 },
    { id: 'cv_right', row: 2 },
    { id: 'cv_up', row: 3 }
  ];
  const frames = [0, 1, 2, 1];
  let cur = 0;
  setInterval(() => {
    const col = frames[cur];
    canvases.forEach(c => {
      const cv = document.getElementById(c.id);
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, 48, 48);
      ctx.drawImage(img, col * 48, c.row * 48, 48, 48, 0, 0, 48, 48);
    });
    cur = (cur + 1) % frames.length;
  }, 150);
};
</script>
</body>
</html>`;

fs.writeFileSync(path.join(REVIEW_DIR, 'chest_repair_preview.html'), htmlContent);
console.log('Saved interactive review HTML');

