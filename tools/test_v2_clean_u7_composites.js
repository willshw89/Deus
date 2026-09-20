const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const img = decodePNG(fs.readFileSync('art/raw/u7_modular_portraits_nano_pro.png'));
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

// Bounding boxes tuned
const HEADS = [
    { x: 14, y: 4, w: 314, h: 254 },
    { x: 354, y: 4, w: 316, h: 254 },
    { x: 694, y: 4, w: 316, h: 254 }
];

const HAIRS = [
    { x: 24, y: 340, w: 205, h: 172 },  // Parted brown
    { x: 290, y: 340, w: 175, h: 172 }, // Blond crop
    { x: 512, y: 338, w: 228, h: 175 }, // Black curly
    { x: 785, y: 340, w: 180, h: 165 }  // Grey elder
];

const BEARDS = [
    { x: 44, y: 615, w: 165, h: 115 },  // Trimmed goatee (below nose)
    { x: 298, y: 610, w: 168, h: 150 }, // Full brown beard (below nose)
    { x: 540, y: 610, w: 185, h: 155 }, // Long braided white beard (below nose)
    { x: 810, y: 588, w: 170, h: 167 }  // Eyepatch & stubble
];

const CLOTHES = [
    { x: 4, y: 782, w: 246, h: 240 },   // Leather jerkin
    { x: 260, y: 782, w: 246, h: 240 }, // Steel plate armor
    { x: 516, y: 775, w: 246, h: 248 }, // Green hooded mantle
    { x: 772, y: 785, w: 246, h: 238 }  // Blacksmith apron
];

const h0 = cleanAndExtract({ sx: HEADS[0].x, sy: HEADS[0].y, sw: HEADS[0].w, sh: HEADS[0].h }, { tx: 0, ty: 0, tw: 144, th: 144 });
const h1 = cleanAndExtract({ sx: HEADS[1].x, sy: HEADS[1].y, sw: HEADS[1].w, sh: HEADS[1].h }, { tx: 0, ty: 0, tw: 144, th: 144 });
const h2 = cleanAndExtract({ sx: HEADS[2].x, sy: HEADS[2].y, sw: HEADS[2].w, sh: HEADS[2].h }, { tx: 0, ty: 0, tw: 144, th: 144 });

const c0 = cleanAndExtract({ sx: CLOTHES[0].x, sy: CLOTHES[0].y, sw: CLOTHES[0].w, sh: CLOTHES[0].h }, { tx: 0, ty: 66, tw: 144, th: 78 });
const c1 = cleanAndExtract({ sx: CLOTHES[1].x, sy: CLOTHES[1].y, sw: CLOTHES[1].w, sh: CLOTHES[1].h }, { tx: 0, ty: 66, tw: 144, th: 78 });
const c2 = cleanAndExtract({ sx: CLOTHES[2].x, sy: CLOTHES[2].y, sw: CLOTHES[2].w, sh: CLOTHES[2].h }, { tx: 0, ty: 66, tw: 144, th: 78 });
const c3 = cleanAndExtract({ sx: CLOTHES[3].x, sy: CLOTHES[3].y, sw: CLOTHES[3].w, sh: CLOTHES[3].h }, { tx: 0, ty: 66, tw: 144, th: 78 });

// Hair top layer
const hr0 = cleanAndExtract({ sx: HAIRS[0].x, sy: HAIRS[0].y, sw: HAIRS[0].w, sh: HAIRS[0].h }, { tx: 22, ty: 12, tw: 100, th: 75 });
const hr1 = cleanAndExtract({ sx: HAIRS[1].x, sy: HAIRS[1].y, sw: HAIRS[1].w, sh: HAIRS[1].h }, { tx: 25, ty: 14, tw: 94, th: 75 });
const hr2 = cleanAndExtract({ sx: HAIRS[2].x, sy: HAIRS[2].y, sw: HAIRS[2].w, sh: HAIRS[2].h }, { tx: 20, ty: 10, tw: 104, th: 75 });
const hr3 = cleanAndExtract({ sx: HAIRS[3].x, sy: HAIRS[3].y, sw: HAIRS[3].w, sh: HAIRS[3].h }, { tx: 24, ty: 14, tw: 96, th: 72 });

// Beards placed right below nose
const b0 = cleanAndExtract({ sx: BEARDS[0].x, sy: BEARDS[0].y, sw: BEARDS[0].w, sh: BEARDS[0].h }, { tx: 28, ty: 72, tw: 88, th: 58 });
const b1 = cleanAndExtract({ sx: BEARDS[1].x, sy: BEARDS[1].y, sw: BEARDS[1].w, sh: BEARDS[1].h }, { tx: 28, ty: 70, tw: 88, th: 65 });
const b2 = cleanAndExtract({ sx: BEARDS[2].x, sy: BEARDS[2].y, sw: BEARDS[2].w, sh: BEARDS[2].h }, { tx: 26, ty: 70, tw: 92, th: 68 });
// Eyepatch covers eye at y=48..60 and stubble at y=72..100
const b3 = cleanAndExtract({ sx: BEARDS[3].x, sy: BEARDS[3].y, sw: BEARDS[3].w, sh: BEARDS[3].h }, { tx: 28, ty: 48, tw: 88, th: 78 });

// Clean b3 of any stray line between y=60 and 68
for (let y = 58; y < 68; y++) {
    for (let x = 0; x < 144; x++) {
        const idx = (y * 144 + x) * 4;
        b3[idx + 3] = 0; // clear gap between eyepatch and mouth
    }
}

function composite(headBuf, clothBuf, beardBuf, hairBuf) {
    const res = Buffer.alloc(144 * 144 * 4);
    headBuf.copy(res);
    for (const l of [clothBuf, beardBuf, hairBuf]) {
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

const v2ComboA = composite(h0, c1, b0, hr1); // Fair + Plate Armor + Goatee + Blond Crop
const v2ComboB = composite(h1, c0, b3, hr2); // Warrior + Leather Jerkin + Eyepatch/Stubble + Black Curls
const v2ComboC = composite(h2, c2, b2, hr3); // Elder + Green Mantle + Braided White + Grey Hair

writePNG(path.join(outDir, 'v2_combo_A.png'), 144, 144, v2ComboA);
writePNG(path.join(outDir, 'v2_combo_B.png'), 144, 144, v2ComboB);
writePNG(path.join(outDir, 'v2_combo_C.png'), 144, 144, v2ComboC);

console.log('v2 composites generated!');
