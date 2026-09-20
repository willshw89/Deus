const fs = require('fs');
const path = require('path');
const { readPNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_FILE = path.join(ROOT, 'game', 'data', 'UF_WorldCatalog.json');
const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));

console.log('Generating Visual Showcase for all 67 World Objects & Inventory Icons...');

// Load meadow terrain backdrop if available
const meadowPath = path.join(ROOT, 'art', 'masters', 'meadow.png');
let meadowImg = null;
if (fs.existsSync(meadowPath)) {
    try { meadowImg = readPNG(meadowPath); } catch (e) {}
}

// Layout: 7 columns of objects, 10 rows
// Each cell: 180 px wide x 120 px tall (at 1x)
// Cell layout:
//   Top: 3 animation frames side by side (e.g. 3 x 48 = 144px wide)
//   Beside/below: 32x32 inventory icon
//   Text: object ID & animation tag
const COLS = 7;
const ROWS = Math.ceil(catalog.objects.length / COLS);
const CELL_W = 192;
const CELL_H = 120;
const CANVAS_W = COLS * CELL_W;
const CANVAS_H = ROWS * CELL_H + 40; // 40px header

const canvasBuf = Buffer.alloc(CANVAS_W * CANVAS_H * 4);

// Fill with dark slate RPG backdrop with subtle grid (#1a1c23)
for (let y = 0; y < CANVAS_H; y++) {
    for (let x = 0; x < CANVAS_W; x++) {
        const o = (y * CANVAS_W + x) * 4;
        const isHeader = y < 40;
        const isGridLine = (x % CELL_W === 0 || (y - 40) % CELL_H === 0);
        if (isHeader) {
            canvasBuf[o] = 18; canvasBuf[o + 1] = 20; canvasBuf[o + 2] = 28; canvasBuf[o + 3] = 255;
        } else if (isGridLine) {
            canvasBuf[o] = 38; canvasBuf[o + 1] = 42; canvasBuf[o + 2] = 54; canvasBuf[o + 3] = 255;
        } else {
            canvasBuf[o] = 26; canvasBuf[o + 1] = 28; canvasBuf[o + 2] = 36; canvasBuf[o + 3] = 255;
        }
    }
}

// Draw each object into its cell
catalog.objects.forEach((obj, idx) => {
    const colIdx = idx % COLS;
    const rowIdx = Math.floor(idx / COLS);
    const cellX = colIdx * CELL_W;
    const cellY = 40 + rowIdx * CELL_H;

    const sheetPath = path.join(ROOT, 'game', 'img', 'characters', `${obj.image}.png`);
    const sidecarPath = path.join(ROOT, 'game', 'img', 'characters', `${obj.image}.json`);
    const iconPath = path.join(ROOT, 'art', 'masters', `${obj.id}_icon.png`);

    if (!fs.existsSync(sheetPath)) return;
    const sheet = readPNG(sheetPath);
    const sc = fs.existsSync(sidecarPath) ? JSON.parse(fs.readFileSync(sidecarPath, 'utf8')) : {};
    const fw = sc.frameWidth || 48;
    const fh = sc.frameHeight || 48;

    // Draw background turf patch behind the 3 frames (meadow turf at cellX + 8, cellY + 8)
    const turfW = fw >= 96 ? 136 : 144;
    const turfH = Math.min(64, fh);
    for (let dy = 0; dy < turfH; dy++) {
        for (let dx = 0; dx < turfW; dx++) {
            const px = cellX + 6 + dx;
            const py = cellY + 8 + (64 - turfH) + dy;
            if (px < CANVAS_W && py < CANVAS_H) {
                const o = (py * CANVAS_W + px) * 4;
                if (meadowImg) {
                    const mo = ((dy % 48) * meadowImg.width + (dx % 48)) * 4;
                    canvasBuf[o] = Math.floor(meadowImg.data[mo] * 0.45);
                    canvasBuf[o + 1] = Math.floor(meadowImg.data[mo + 1] * 0.45);
                    canvasBuf[o + 2] = Math.floor(meadowImg.data[mo + 2] * 0.45);
                    canvasBuf[o + 3] = 255;
                } else {
                    canvasBuf[o] = 35; canvasBuf[o + 1] = 45; canvasBuf[o + 2] = 25; canvasBuf[o + 3] = 255;
                }
            }
        }
    }

    // Draw the 3 animation frames (col 0, 1, 2) scaled to fit cell if 96x96
    const renderScale = fw >= 96 ? 0.5 : 1.0;
    const renderFw = Math.round(fw * renderScale);
    const renderFh = Math.round(fh * renderScale);

    for (let f = 0; f < 3; f++) {
        const frameStartX = f * fw;
        const destFrameX = cellX + 6 + f * (renderFw + 2);
        const destFrameY = cellY + 8 + (64 - renderFh);

        for (let dy = 0; dy < renderFh; dy++) {
            const sy = Math.min(fh - 1, Math.floor(dy / renderScale));
            for (let dx = 0; dx < renderFw; dx++) {
                const sx = Math.min(fw - 1, Math.floor(dx / renderScale));
                const so = (sy * sheet.width + (frameStartX + sx)) * 4;
                if (so + 3 < sheet.data.length && sheet.data[so + 3] > 128) {
                    const doff = ((destFrameY + dy) * CANVAS_W + (destFrameX + dx)) * 4;
                    canvasBuf[doff] = sheet.data[so];
                    canvasBuf[doff + 1] = sheet.data[so + 1];
                    canvasBuf[doff + 2] = sheet.data[so + 2];
                    canvasBuf[doff + 3] = 255;
                }
            }
        }
    }

    // Draw 32x32 inventory icon at cellX + 154, cellY + 24 with golden bezel
    if (fs.existsSync(iconPath)) {
        const icon = readPNG(iconPath);
        const iconX = cellX + 152;
        const iconY = cellY + 24;

        // Bezel outline
        for (let dy = -1; dy <= 32; dy++) {
            for (let dx = -1; dx <= 32; dx++) {
                const bx = iconX + dx;
                const by = iconY + dy;
                if (bx >= 0 && bx < CANVAS_W && by >= 0 && by < CANVAS_H) {
                    const bo = (by * CANVAS_W + bx) * 4;
                    if (dx === -1 || dx === 32 || dy === -1 || dy === 32) {
                        canvasBuf[bo] = 160; canvasBuf[bo + 1] = 130; canvasBuf[bo + 2] = 50; canvasBuf[bo + 3] = 255;
                    } else {
                        canvasBuf[bo] = 12; canvasBuf[bo + 1] = 14; canvasBuf[bo + 2] = 18; canvasBuf[bo + 3] = 255;
                    }
                }
            }
        }

        // Blit icon
        for (let dy = 0; dy < 32; dy++) {
            for (let dx = 0; dx < 32; dx++) {
                const so = (dy * icon.width + dx) * 4;
                if (so + 3 < icon.data.length && icon.data[so + 3] > 128) {
                    const doff = ((iconY + dy) * CANVAS_W + (iconX + dx)) * 4;
                    canvasBuf[doff] = icon.data[so];
                    canvasBuf[doff + 1] = icon.data[so + 1];
                    canvasBuf[doff + 2] = icon.data[so + 2];
                    canvasBuf[doff + 3] = 255;
                }
            }
        }
    }
});

const outReviewPath = path.join(ROOT, 'art', 'review', 'all_world_objects_showcase.png');
writePNG(outReviewPath, CANVAS_W, CANVAS_H, canvasBuf);
console.log(`Saved full visual showcase: ${outReviewPath} (${CANVAS_W}x${CANVAS_H})`);
