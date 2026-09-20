'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');
const GEN_FACE_DIR = path.join(ROOT, 'game', 'img', 'generator', 'face');

if (!fs.existsSync(GEN_FACE_DIR)) fs.mkdirSync(GEN_FACE_DIR, { recursive: true });

function isMagenta(r, g, b) {
    if (r > 130 && b > 130 && g < 110 && (r + b) > g * 2.2) return true;
    if (r > 80 && b > 80 && g < 50 && (r + b) > g * 2.4) return true;
    return false;
}

function cleanAndExtract(img, srcBox, targetBox) {
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

const rawMale = decodePNG(fs.readFileSync('art/raw/u7_modular_portraits_nano_pro.png'));
const rawFemale = decodePNG(fs.readFileSync('art/raw/u7_female_modular_portraits_nano_pro.png'));

// 1. Arch Frame
const archFrame = Buffer.alloc(144 * 144 * 4);
for (let dy = 0; dy < 144; dy++) {
    for (let dx = 0; dx < 144; dx++) {
        const isBorder = (dx < 17 || dx >= 127 || dy < 16 || dy >= 134);
        if (isBorder) {
            const sx = Math.min(320, Math.floor(dx * 321 / 144));
            const sy = Math.min(340, Math.floor(dy * 341 / 144));
            const sIdx = ((sy + 0) * rawMale.width + (sx + 10)) * 4;
            const r = rawMale.data[sIdx], g = rawMale.data[sIdx + 1], b = rawMale.data[sIdx + 2], a = rawMale.data[sIdx + 3];
            if (a > 20 && !isMagenta(r, g, b)) {
                const dIdx = (dy * 144 + dx) * 4;
                archFrame[dIdx] = r;
                archFrame[dIdx + 1] = g;
                archFrame[dIdx + 2] = b;
                archFrame[dIdx + 3] = 255;
            }
        }
    }
}
writePNG(path.join(GEN_FACE_DIR, 'arch_frame.png'), 144, 144, archFrame);

// 2. Male Heads
const mHeads = [
    { x: 14, y: 4, w: 314, h: 254 },  // Youth Fair
    { x: 354, y: 4, w: 316, h: 254 }, // Scarred Warrior
    { x: 694, y: 4, w: 316, h: 254 }  // Elder Weathered
];
mHeads.forEach((box, i) => {
    const head = cleanAndExtract(rawMale, { sx: box.x, sy: box.y, sw: box.w, sh: box.h }, { tx: 0, ty: 0, tw: 144, th: 144 });
    writePNG(path.join(GEN_FACE_DIR, `male_base_${i + 1}.png`), 144, 144, head);
});

// 3. Female Heads
const fHeads = [
    { x: 14, y: 4, w: 314, h: 254 },  // Young Fair
    { x: 354, y: 4, w: 316, h: 254 }, // Scarred Warrior
    { x: 694, y: 4, w: 316, h: 254 }  // Elder Weathered
];
fHeads.forEach((box, i) => {
    const head = cleanAndExtract(rawFemale, { sx: box.x, sy: box.y, sw: box.w, sh: box.h }, { tx: 0, ty: 0, tw: 144, th: 144 });
    writePNG(path.join(GEN_FACE_DIR, `female_base_${i + 1}.png`), 144, 144, head);
});

// 4. Children Portraits
const childBoy = cleanAndExtract(rawFemale, { sx: 516, sy: 550, w: 248, h: 236 }, { tx: 0, ty: 0, tw: 144, th: 144 });
const childGirl = cleanAndExtract(rawFemale, { sx: 772, sy: 550, w: 248, h: 236 }, { tx: 0, ty: 0, tw: 144, th: 144 });
writePNG(path.join(GEN_FACE_DIR, 'child_boy.png'), 144, 144, childBoy);
writePNG(path.join(GEN_FACE_DIR, 'child_girl.png'), 144, 144, childGirl);

// 5. Male Clothes
const mClothes = [
    { x: 4, y: 782, w: 246, h: 240 },   // Leather jerkin
    { x: 260, y: 782, w: 246, h: 240 }, // Steel plate armor
    { x: 516, y: 775, w: 246, h: 248 }, // Green hooded mantle
    { x: 772, y: 785, w: 246, h: 238 }  // Blacksmith apron
];
mClothes.forEach((box, i) => {
    const c = cleanAndExtract(rawMale, { sx: box.x, sy: box.y, sw: box.w, sh: box.h }, { tx: 0, ty: 66, tw: 144, th: 78 });
    writePNG(path.join(GEN_FACE_DIR, `male_cloth_${i + 1}.png`), 144, 144, c);
});

// 6. Female Clothes
const fClothes = [
    { x: 4, y: 782, w: 246, h: 240 },   // Leather jerkin
    { x: 260, y: 782, w: 246, h: 240 }, // Steel cuirass
    { x: 516, y: 775, w: 246, h: 248 }, // Green mantle
    { x: 772, y: 785, w: 246, h: 238 }  // Peasant dress
];
fClothes.forEach((box, i) => {
    const c = cleanAndExtract(rawFemale, { sx: box.x, sy: box.y, sw: box.w, sh: box.h }, { tx: 0, ty: 66, tw: 144, th: 78 });
    writePNG(path.join(GEN_FACE_DIR, `female_cloth_${i + 1}.png`), 144, 144, c);
});

// 7. Male Hairs
const mHairs = [
    { box: { x: 24, y: 340, w: 205, h: 172 }, target: { tx: 22, ty: 12, tw: 100, th: 75 } },  // Parted brown
    { box: { x: 290, y: 340, w: 175, h: 172 }, target: { tx: 25, ty: 14, tw: 94, th: 75 } },  // Blond crop
    { box: { x: 512, y: 338, w: 228, h: 175 }, target: { tx: 20, ty: 10, tw: 104, th: 75 } }, // Black curly
    { box: { x: 785, y: 340, w: 180, h: 165 }, target: { tx: 24, ty: 14, tw: 96, th: 72 } }   // Grey elder
];
mHairs.forEach((h, i) => {
    const hr = cleanAndExtract(rawMale, { sx: h.box.x, sy: h.box.y, sw: h.box.w, sh: h.box.h }, h.target);
    writePNG(path.join(GEN_FACE_DIR, `male_hair_${i + 1}.png`), 144, 144, hr);
});

// 8. Female Hairs
const fHairs = [
    { box: { x: 4, y: 330, w: 246, h: 360 }, target: { tx: 12, ty: 10, tw: 120, th: 125 } },   // Long wavy auburn
    { box: { x: 275, y: 330, w: 205, h: 360 }, target: { tx: 20, ty: 10, tw: 105, th: 125 } }, // Braided blonde plait
    { box: { x: 535, y: 330, w: 185, h: 220 }, target: { tx: 25, ty: 10, tw: 95, th: 80 } },   // Black topknot bun
    { box: { x: 765, y: 330, w: 220, h: 220 }, target: { tx: 22, ty: 12, tw: 100, th: 80 } }   // Silver elder hair
];
fHairs.forEach((h, i) => {
    const hr = cleanAndExtract(rawFemale, { sx: h.box.x, sy: h.box.y, sw: h.box.w, sh: h.box.h }, h.target);
    // Clear any horizontal frame slice in elder hair
    if (i === 3) {
        for (let y = 50; y < 65; y++) {
            for (let x = 0; x < 144; x++) {
                const idx = (y * 144 + x) * 4;
                if (hr[idx] < 50 && hr[idx + 1] < 50 && hr[idx + 2] < 50) hr[idx + 3] = 0;
            }
        }
    }
    writePNG(path.join(GEN_FACE_DIR, `female_hair_${i + 1}.png`), 144, 144, hr);
});

// 9. Male Beards
const mBeards = [
    { box: { x: 44, y: 615, w: 165, h: 115 }, target: { tx: 28, ty: 72, tw: 88, th: 58 } },  // Goatee
    { box: { x: 298, y: 610, w: 168, h: 150 }, target: { tx: 28, ty: 70, tw: 88, th: 65 } }, // Full beard
    { box: { x: 540, y: 610, w: 185, h: 155 }, target: { tx: 26, ty: 70, tw: 92, th: 68 } }, // Braided white beard
    { box: { x: 298, y: 610, w: 168, h: 150 }, target: { tx: 28, ty: 74, tw: 88, th: 58 } }  // Short stubble
];
mBeards.forEach((b, i) => {
    const br = cleanAndExtract(rawMale, { sx: b.box.x, sy: b.box.y, sw: b.box.w, sh: b.box.h }, b.target);
    writePNG(path.join(GEN_FACE_DIR, `male_beard_${i + 1}.png`), 144, 144, br);
});

console.log('All modular face layers cleanly extracted and tuned!');

