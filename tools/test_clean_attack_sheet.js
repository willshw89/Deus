'use strict';

const fs = require('fs');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const { pal, mirrorFrame, assemble12SpriteSheet, quantizeSheet } = require('./build_pro_human_male');

const img = decodePNG(fs.readFileSync('art/raw/human_male_pro_4d_attack.png'));
const C_DARK_OUTLINE = pal.snap(24, 16, 10);

function isBg(r, g, b) {
    if (r > 200 && g > 225 && b > 225 && Math.abs(g - b) < 20) return true;
    if (r < 25 && g < 25 && b < 25) return true;
    return false;
}

function applyDarkOutline(buf, w, h) {
    const isOpaque = (x, y) => (x >= 0 && x < w && y >= 0 && y < h && buf[(y * w + x) * 4 + 3] > 0);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            if (buf[idx + 3] === 0) continue;
            let border = false;
            for (let dy = -1; dy <= 1 && !border; dy++) {
                for (let dx = -1; dx <= 1 && !border; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    if (!isOpaque(x + dx, y + dy)) border = true;
                }
            }
            if (border) {
                buf[idx]     = C_DARK_OUTLINE[0];
                buf[idx + 1] = C_DARK_OUTLINE[1];
                buf[idx + 2] = C_DARK_OUTLINE[2];
            }
        }
    }
}

function extractAttackFrame(minX, maxX, minY, maxY, targetH = 43) {
    const startX = minX + 10, endX = maxX - 10;
    const startY = minY + 10, endY = maxY - 10;

    let sMinX = Infinity, sMaxX = -Infinity, sMinY = Infinity, sMaxY = -Infinity;
    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            const idx = (y * img.width + x) * 4;
            const r = img.data[idx], g = img.data[idx+1], b = img.data[idx+2];
            if (!isBg(r, g, b)) {
                if (x < sMinX) sMinX = x;
                if (x > sMaxX) sMaxX = x;
                if (y < sMinY) sMinY = y;
                if (y > sMaxY) sMaxY = y;
            }
        }
    }

    if (sMinX === Infinity) return Buffer.alloc(48 * 48 * 4);

    // Uniform scale factor tied to adult human standing height 242px -> 43px
    const scale = 43 / 242;
    const origW = sMaxX - sMinX + 1;
    const origH = sMaxY - sMinY + 1;
    const outW = Math.max(1, Math.round(origW * scale));
    const outH = Math.max(1, Math.round(origH * scale));

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

            const srcMinX = sMinX + Math.floor(dx / scale);
            const srcMaxX = sMinX + Math.floor((dx + 1) / scale);
            const srcMinY = sMinY + Math.floor(dy / scale);
            const srcMaxY = sMinY + Math.floor((dy + 1) / scale);

            let rSum = 0, gSum = 0, bSum = 0, count = 0;
            for (let sy = srcMinY; sy <= srcMaxY; sy++) {
                if (sy < startY || sy > endY) continue;
                for (let sx = srcMinX; sx <= srcMaxX; sx++) {
                    if (sx < startX || sx > endX) continue;
                    const idx = (sy * img.width + sx) * 4;
                    const r = img.data[idx], g = img.data[idx+1], b = img.data[idx+2];
                    if (!isBg(r, g, b)) {
                        rSum += r; gSum += g; bSum += b; count++;
                    }
                }
            }
            if (count > 0) {
                const avgR = Math.round(rSum / count);
                const avgG = Math.round(gSum / count);
                const avgB = Math.round(bSum / count);
                const snapped = pal.snap(avgR, avgG, avgB);
                const dIdx = (ty * 48 + tx) * 4;
                out[dIdx]   = snapped[0];
                out[dIdx+1] = snapped[1];
                out[dIdx+2] = snapped[2];
                out[dIdx+3] = 255;
            }
        }
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

// Extract South
const south0 = extractAttackFrame(0, 234, 0, 258);
const south1 = extractAttackFrame(234, 470, 0, 258);
const south2 = extractAttackFrame(470, 938, 0, 258);

// Extract East (side)
const east0 = extractAttackFrame(0, 234, 258, 511);
const east1 = extractAttackFrame(234, 470, 258, 511);
const east2 = extractAttackFrame(470, 938, 258, 511);

// Extract North (back)
const north0 = extractAttackFrame(0, 234, 511, 767);
const north1 = extractAttackFrame(704, 938, 511, 767);
const north2 = extractAttackFrame(470, 704, 511, 767);

const attackSheet = assemble12SpriteSheet({
    S: [south0, south1, south2],
    W: [east0, east1, east2].map(mirrorFrame),
    E: [east0, east1, east2],
    N: [north0, north1, north2]
});

writePNG('art/review/pro_attack_12_sheet.png', 144, 192, attackSheet);
console.log('Saved art/review/pro_attack_12_sheet.png');

