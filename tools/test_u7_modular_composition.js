const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const img = decodePNG(fs.readFileSync('art/raw/u7_modular_portraits_nano_pro.png'));
const outDir = path.join(__dirname, '..', 'scratch', 'u7_modular_test');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function isMagenta(r, g, b) {
    return (r > 190 && g < 70 && b > 190);
}

// Bounding boxes in 1024x1024 raw image:
// Row 0: Framed Heads
const HEADS = [
    { x: 10, y: 0, w: 322, h: 260 },
    { x: 350, y: 0, w: 324, h: 260 },
    { x: 692, y: 0, w: 322, h: 260 }
];

// Row 1: Hairstyles
const HAIRS = [
    { x: 20, y: 330, w: 215, h: 185 },  // Parted brown
    { x: 285, y: 330, w: 185, h: 185 }, // Blond crop
    { x: 505, y: 330, w: 240, h: 185 }, // Black curly
    { x: 780, y: 330, w: 190, h: 175 }  // Grey elder
];

// Row 2: Beards
const BEARDS = [
    { x: 40, y: 580, w: 175, h: 155 },  // Trimmed goatee
    { x: 295, y: 575, w: 175, h: 190 }, // Full brown beard
    { x: 535, y: 575, w: 195, h: 195 }, // Long braided white beard
    { x: 805, y: 575, w: 180, h: 180 }  // Eyepatch & stubble
];

// Row 3: Clothing Busts
const CLOTHES = [
    { x: 2, y: 775, w: 252, h: 248 },   // Leather jerkin
    { x: 258, y: 775, w: 252, h: 248 }, // Steel plate armor
    { x: 514, y: 770, w: 252, h: 253 }, // Green hooded mantle
    { x: 770, y: 780, w: 252, h: 243 }  // Blacksmith apron
];

// Scale and extract function:
function extractTo144(srcBox, targetBox) {
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

// 1. Extract Heads to 144x144 (fills entire frame, tx=0, ty=0, tw=144, th=144)
const headBuffers = HEADS.map((h, i) => {
    const b = extractTo144({ sx: h.x, sy: h.y, sw: h.w, sh: h.h }, { tx: 0, ty: 0, tw: 144, th: 144 });
    writePNG(path.join(outDir, `head_${i}.png`), 144, 144, b);
    return b;
});

// 2. Extract Clothes to 144x144 (fits lower region: tx=0, ty=64, tw=144, th=80)
const clothBuffers = CLOTHES.map((c, i) => {
    const b = extractTo144({ sx: c.x, sy: c.y, sw: c.w, sh: c.h }, { tx: 0, ty: 64, tw: 144, th: 80 });
    writePNG(path.join(outDir, `cloth_${i}.png`), 144, 144, b);
    return b;
});

// 3. Extract Beards to 144x144 (fits lower face: tx=24, ty=58, tw=96, th=75)
const beardBuffers = BEARDS.map((b, i) => {
    const buf = extractTo144({ sx: b.x, sy: b.y, sw: b.w, sh: b.h }, { tx: 24, ty: 58, tw: 96, th: 75 });
    writePNG(path.join(outDir, `beard_${i}.png`), 144, 144, buf);
    return buf;
});

// 4. Extract Hairs to 144x144 (fits upper head: tx=18, ty=10, tw=108, th=80)
const hairBuffers = HAIRS.map((h, i) => {
    const buf = extractTo144({ sx: h.x, sy: h.y, sw: h.w, sh: h.h }, { tx: 18, ty: 10, tw: 108, th: 80 });
    writePNG(path.join(outDir, `hair_${i}.png`), 144, 144, buf);
    return buf;
});

// 5. Test Composite Combinations:
function composite(headBuf, clothBuf, beardBuf, hairBuf) {
    const res = Buffer.alloc(144 * 144 * 4);
    // Draw head first
    headBuf.copy(res);

    // Draw layers in order: cloth, beard, hair
    const layers = [clothBuf, beardBuf, hairBuf];
    for (const l of layers) {
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

const comboA = composite(headBuffers[0], clothBuffers[1], beardBuffers[0], hairBuffers[1]); // Fair + Plate + Goatee + Blond
const comboB = composite(headBuffers[1], clothBuffers[0], beardBuffers[3], hairBuffers[2]); // Warrior + Leather + Eyepatch + Black Curls
const comboC = composite(headBuffers[2], clothBuffers[2], beardBuffers[2], hairBuffers[3]); // Elder + Mantle + Braided White + Grey

writePNG(path.join(outDir, 'combo_A.png'), 144, 144, comboA);
writePNG(path.join(outDir, 'combo_B.png'), 144, 144, comboB);
writePNG(path.join(outDir, 'combo_C.png'), 144, 144, comboC);

console.log('Composites generated: combo_A.png, combo_B.png, combo_C.png');
