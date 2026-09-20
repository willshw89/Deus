'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const img = decodePNG(fs.readFileSync('art/raw/human_male_pro_4d_walk.png'));

function isBg(r, g, b) {
    if (r > 165 && g < 85 && b > 165) return true;
    if (r > 80 && b > 70 && g < 65 && Math.abs(r - b) < 45) return true;
    if (r < 25 && g < 25 && b < 25) return true;
    return false;
}

// Function to extract a sprite from raw bounds and scale to 48x48 cell anchored at baseline y=47
function extractSpriteScaled(minX, maxX, minY, maxY, targetH = 43) {
    // Find precise sprite bounds
    let sMinX = Infinity, sMaxX = -Infinity, sMinY = Infinity, sMaxY = -Infinity;
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const idx = (y * img.width + x) * 4;
            if (!isBg(img.data[idx], img.data[idx+1], img.data[idx+2])) {
                if (x < sMinX) sMinX = x;
                if (x > sMaxX) sMaxX = x;
                if (y < sMinY) sMinY = y;
                if (y > sMaxY) sMaxY = y;
            }
        }
    }
    const origW = sMaxX - sMinX + 1;
    const origH = sMaxY - sMinY + 1;
    const scale = targetH / origH;
    const outW = Math.round(origW * scale);
    const outH = targetH;

    const out = Buffer.alloc(48 * 48 * 4);
    const dstBaseline = 47;
    const dstY0 = dstBaseline - outH + 1;
    const dstX0 = Math.round(24 - outW / 2);

    for (let dy = 0; dy < outH; dy++) {
        const ty = dstY0 + dy;
        if (ty < 0 || ty >= 48) continue;
        for (let dx = 0; dx < outW; dx++) {
            const tx = dstX0 + dx;
            if (tx < 0 || tx >= 48) continue;

            // Sample source with box filter
            const srcMinX = sMinX + Math.floor(dx / scale);
            const srcMaxX = sMinX + Math.floor((dx + 1) / scale);
            const srcMinY = sMinY + Math.floor(dy / scale);
            const srcMaxY = sMinY + Math.floor((dy + 1) / scale);

            let rSum = 0, gSum = 0, bSum = 0, count = 0;
            for (let sy = srcMinY; sy <= srcMaxY; sy++) {
                if (sy < 0 || sy >= img.height) continue;
                for (let sx = srcMinX; sx <= srcMaxX; sx++) {
                    if (sx < 0 || sx >= img.width) continue;
                    const idx = (sy * img.width + sx) * 4;
                    const r = img.data[idx], g = img.data[idx+1], b = img.data[idx+2];
                    if (!isBg(r, g, b)) {
                        rSum += r; gSum += g; bSum += b; count++;
                    }
                }
            }
            if (count > 0) {
                const dIdx = (ty * 48 + tx) * 4;
                out[dIdx]   = Math.round(rSum / count);
                out[dIdx+1] = Math.round(gSum / count);
                out[dIdx+2] = Math.round(bSum / count);
                out[dIdx+3] = 255;
            }
        }
    }
    return out;
}

// Extract candidates and build a preview image
const colBorders = [0, 234, 470, 704, 938, 1172, 1408];
const rowBorders = [0, 258, 511, 767];

// Let's create an image with all 18 cells downscaled to 48x48:
// 6 cols x 3 rows = 288 x 144
const previewW = 6 * 48;
const previewH = 3 * 48;
const previewBuf = Buffer.alloc(previewW * previewH * 4);

// Fill with checkerboard
for (let y = 0; y < previewH; y++) {
    for (let x = 0; x < previewW; x++) {
        const o = (y * previewW + x) * 4;
        const cb = ((Math.floor(x / 6) + Math.floor(y / 6)) % 2 === 0) ? 35 : 45;
        previewBuf[o] = cb; previewBuf[o+1] = cb; previewBuf[o+2] = cb + 5; previewBuf[o+3] = 255;
    }
}

for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 6; c++) {
        if (r === 2 && c === 5) continue;
        const f = extractSpriteScaled(colBorders[c]+8, colBorders[c+1]-8, rowBorders[r]+8, rowBorders[r+1]-8, 43);
        const ox = c * 48;
        const oy = r * 48;
        for (let py = 0; py < 48; py++) {
            for (let px = 0; px < 48; px++) {
                const sIdx = (py * 48 + px) * 4;
                if (f[sIdx+3] > 0) {
                    const dIdx = ((oy + py) * previewW + (ox + px)) * 4;
                    previewBuf[dIdx]   = f[sIdx];
                    previewBuf[dIdx+1] = f[sIdx+1];
                    previewBuf[dIdx+2] = f[sIdx+2];
                    previewBuf[dIdx+3] = 255;
                }
            }
        }
    }
}

writePNG('art/review/pro_walk_extracted_cells.png', previewW, previewH, previewBuf);
console.log('Saved art/review/pro_walk_extracted_cells.png');

