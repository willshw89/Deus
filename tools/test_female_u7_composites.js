'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const img = decodePNG(fs.readFileSync('art/raw/u7_female_modular_portraits_nano_pro.png'));
const outDir = path.join(__dirname, '..', 'scratch', 'u7_modular_test');

function isMagenta(r, g, b) {
    if (r > 130 && b > 130 && g < 110 && (r + b) > g * 2.2) return true;
    if (r > 80 && b > 80 && g < 50 && (r + b) > g * 2.4) return true;
    return false;
}

function cleanAndExtract(srcBox, targetBox) {
    const dst = Buffer.alloc(144 * 144 * 4);
    const { sx, sy, sw, sh } = srcBox;
    const { tx, ty, tw, th } = targetBox;

    for (let dy = 0; dy < th; dy++) {
        for (let dx = 0; dx < tw; dx++) {
            const px = tx + dx;
            const py = ty + dy;
            if (px < 0 || px >= 144 || py < 0 || py >= 144) continue;

            const ix = Math.min(sw - 1, Math.floor(dx * sw / tw));
            const iy = Math.min(sh - 1, Math.floor(dy * sh / th));
            const sIdx = ((sy + iy) * img.width + (sx + ix)) * 4;

            const r = img.data[sIdx], g = img.data[sIdx + 1], b = img.data[sIdx + 2], a = img.data[sIdx + 3];
            if (a > 10 && !isMagenta(r, g, b)) {
                const dIdx = (py * 144 + px) * 4;
                dst[dIdx] = r;
                dst[dIdx + 1] = g;
                dst[dIdx + 2] = b;
                dst[dIdx + 3] = 255;
            }
        }
    }
    return dst;
}

// Female Heads Row 0
const HEADS = [
    { x: 14, y: 4, w: 314, h: 254 },  // Young Fair
    { x: 354, y: 4, w: 316, h: 254 }, // Scarred Warrior
    { x: 694, y: 4, w: 316, h: 254 }  // Elder
];

// Female Hair Row 1
const HAIRS = [
    { x: 4, y: 330, w: 246, h: 360 },   // Long wavy auburn hair
    { x: 275, y: 330, w: 205, h: 360 }, // Braided blonde plait
    { x: 535, y: 330, w: 185, h: 220 }, // Black topknot bun
    { x: 765, y: 330, w: 220, h: 220 }  // Silver elder hair
];

// Female Clothes Row 3
const CLOTHES = [
    { x: 4, y: 782, w: 246, h: 240 },   // Leather jerkin
    { x: 260, y: 782, w: 246, h: 240 }, // Steel cuirass
    { x: 516, y: 775, w: 246, h: 248 }, // Green mantle
    { x: 772, y: 785, w: 246, h: 238 }  // Peasant dress
];

const fh0 = cleanAndExtract({ sx: HEADS[0].x, sy: HEADS[0].y, sw: HEADS[0].w, sh: HEADS[0].h }, { tx: 0, ty: 0, tw: 144, th: 144 });
const fh1 = cleanAndExtract({ sx: HEADS[1].x, sy: HEADS[1].y, sw: HEADS[1].w, sh: HEADS[1].h }, { tx: 0, ty: 0, tw: 144, th: 144 });
const fh2 = cleanAndExtract({ sx: HEADS[2].x, sy: HEADS[2].y, sw: HEADS[2].w, sh: HEADS[2].h }, { tx: 0, ty: 0, tw: 144, th: 144 });

const fc0 = cleanAndExtract({ sx: CLOTHES[0].x, sy: CLOTHES[0].y, sw: CLOTHES[0].w, sh: CLOTHES[0].h }, { tx: 0, ty: 66, tw: 144, th: 78 });
const fc1 = cleanAndExtract({ sx: CLOTHES[1].x, sy: CLOTHES[1].y, sw: CLOTHES[1].w, sh: CLOTHES[1].h }, { tx: 0, ty: 66, tw: 144, th: 78 });
const fc2 = cleanAndExtract({ sx: CLOTHES[2].x, sy: CLOTHES[2].y, sw: CLOTHES[2].w, sh: CLOTHES[2].h }, { tx: 0, ty: 66, tw: 144, th: 78 });
const fc3 = cleanAndExtract({ sx: CLOTHES[3].x, sy: CLOTHES[3].y, sw: CLOTHES[3].w, sh: CLOTHES[3].h }, { tx: 0, ty: 66, tw: 144, th: 78 });

const fhr0 = cleanAndExtract({ sx: HAIRS[0].x, sy: HAIRS[0].y, sw: HAIRS[0].w, sh: HAIRS[0].h }, { tx: 12, ty: 10, tw: 120, th: 125 });
const fhr1 = cleanAndExtract({ sx: HAIRS[1].x, sy: HAIRS[1].y, sw: HAIRS[1].w, sh: HAIRS[1].h }, { tx: 20, ty: 10, tw: 105, th: 125 });
const fhr2 = cleanAndExtract({ sx: HAIRS[2].x, sy: HAIRS[2].y, sw: HAIRS[2].w, sh: HAIRS[2].h }, { tx: 25, ty: 10, tw: 95, th: 80 });
const fhr3 = cleanAndExtract({ sx: HAIRS[3].x, sy: HAIRS[3].y, sw: HAIRS[3].w, sh: HAIRS[3].h }, { tx: 22, ty: 12, tw: 100, th: 80 });

function composite(headBuf, clothBuf, hairBuf) {
    const res = Buffer.alloc(144 * 144 * 4);
    headBuf.copy(res);
    for (const l of [clothBuf, hairBuf]) {
        if (!l) continue;
        for (let i = 0; i < 144 * 144; i++) {
            const idx = i * 4;
            const a = l[idx + 3];
            if (a > 10) {
                res[idx] = l[idx];
                res[idx + 1] = l[idx + 1];
                res[idx + 2] = l[idx + 2];
                res[idx + 3] = 255;
            }
        }
    }
    return res;
}

const fComboA = composite(fh0, fc3, fhr1); // Fair + Peasant Dress + Braided Blonde
const fComboB = composite(fh1, fc1, fhr0); // Warrior + Cuirass + Long Wavy Auburn
const fComboC = composite(fh2, fc2, fhr3); // Elder + Green Mantle + Silver Hair

writePNG(path.join(outDir, 'f_combo_A.png'), 144, 144, fComboA);
writePNG(path.join(outDir, 'f_combo_B.png'), 144, 144, fComboB);
writePNG(path.join(outDir, 'f_combo_C.png'), 144, 144, fComboC);

console.log('Female composites generated!');

