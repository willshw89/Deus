'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const GEN_DIR = path.join(ROOT, 'game', 'img', 'generator');
const GEN_FACE_DIR = path.join(GEN_DIR, 'face');
const GEN_CHAR_DIR = path.join(GEN_DIR, 'char');

[GEN_DIR, GEN_FACE_DIR, GEN_CHAR_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

function isMagenta(r, g, b) {
    if (r > 130 && b > 130 && g < 110 && (r + b) > g * 2.2) return true;
    if (r > 80 && b > 80 && g < 50 && (r + b) > g * 2.4) return true;
    return false;
}

const rawMale = decodePNG(fs.readFileSync('art/raw/u7_modular_portraits_nano_pro.png'));
const rawFemale = decodePNG(fs.readFileSync('art/raw/u7_female_modular_portraits_nano_pro.png'));

// Helper to scale a region of raw into a 144x144 buffer
function extractRegion(raw, sx0, sy0, sw, sh, tx0, ty0, tw, th, filterSkin = false) {
    const dst = Buffer.alloc(144 * 144 * 4);
    for (let dy = 0; dy < th; dy++) {
        for (let dx = 0; dx < tw; dx++) {
            const px = tx0 + dx;
            const py = ty0 + dy;
            if (px < 0 || px >= 144 || py < 0 || py >= 144) continue;

            const sx = Math.min(raw.width - 1, sx0 + Math.floor(dx * sw / tw));
            const sy = Math.min(raw.height - 1, sy0 + Math.floor(dy * sh / th));
            const sIdx = (sy * raw.width + sx) * 4;

            const r = raw.data[sIdx], g = raw.data[sIdx + 1], b = raw.data[sIdx + 2], a = raw.data[sIdx + 3];
            const isMag = isMagenta(r, g, b);
            const isSkin = filterSkin && (r > 140 && g > 90 && b > 60 && r > b * 1.25 && (r - g) < 75);

            if (a > 20 && !isMag && !isSkin) {
                // Stone arch outer boundary mask (keep only inside arch bounds)
                const cx = px - 72;
                const cy = py - 54;
                const outsideArchTop = (py < 54 && (cx * cx + cy * cy > 56 * 56));
                const outsideArchSides = (px < 10 || px >= 134);
                if (!outsideArchTop && !outsideArchSides) {
                    const dIdx = (py * 144 + px) * 4;
                    dst[dIdx] = r;
                    dst[dIdx + 1] = g;
                    dst[dIdx + 2] = b;
                    dst[dIdx + 3] = 255;
                }
            }
        }
    }
    return dst;
}

// ----------------------------------------------------------------------------
// 1. Male Heads (Complete authentic U7 stone arch portraits)
// ----------------------------------------------------------------------------
const mHeads = [
    extractRegion(rawMale, 10, 0, 320, 340, 0, 0, 144, 144),   // 1: Fair Youth
    extractRegion(rawMale, 352, 0, 320, 340, 0, 0, 144, 144),  // 2: Scarred Warrior
    extractRegion(rawMale, 694, 0, 320, 340, 0, 0, 144, 144)   // 3: Weathered Elder
];
mHeads.forEach((h, i) => writePNG(path.join(GEN_FACE_DIR, `male_base_${i + 1}.png`), 144, 144, h));

// ----------------------------------------------------------------------------
// 2. Female Heads (Complete authentic U7 stone arch portraits)
// ----------------------------------------------------------------------------
const fHeads = [
    extractRegion(rawFemale, 10, 0, 320, 340, 0, 0, 144, 144),   // 1: Fair Youth
    extractRegion(rawFemale, 352, 0, 320, 340, 0, 0, 144, 144),  // 2: Scarred Warrior
    extractRegion(rawFemale, 694, 0, 320, 340, 0, 0, 144, 144)   // 3: Weathered Elder Matron
];
fHeads.forEach((h, i) => writePNG(path.join(GEN_FACE_DIR, `female_base_${i + 1}.png`), 144, 144, h));

// ----------------------------------------------------------------------------
// 3. Male Clothes (Overlay at shoulders/chest, y=108..144)
// ----------------------------------------------------------------------------
const mClothes = [
    extractRegion(rawMale, 2, 800, 252, 223, 18, 108, 108, 36),   // 1: Leather jerkin
    extractRegion(rawMale, 258, 825, 252, 198, 18, 108, 108, 36), // 2: Steel plate cuirass
    extractRegion(rawMale, 514, 815, 252, 208, 18, 108, 108, 36), // 3: Green hooded mantle
    extractRegion(rawMale, 770, 810, 252, 213, 18, 108, 108, 36)  // 4: Blacksmith apron
];
mClothes.forEach((c, i) => writePNG(path.join(GEN_FACE_DIR, `male_cloth_${i + 1}.png`), 144, 144, c));

// ----------------------------------------------------------------------------
// 4. Female Clothes (Overlay at shoulders/chest, y=108..144)
// ----------------------------------------------------------------------------
const fClothes = [
    extractRegion(rawFemale, 2, 800, 252, 223, 18, 108, 108, 36),  // 1: Leather jerkin
    extractRegion(rawFemale, 258, 825, 252, 198, 18, 108, 108, 36),// 2: Steel plate cuirass
    extractRegion(rawFemale, 514, 815, 252, 208, 18, 108, 108, 36),// 3: Green hooded mantle
    extractRegion(rawFemale, 770, 810, 252, 213, 18, 108, 108, 36) // 4: Peasant blouse with pouch
];
fClothes.forEach((c, i) => writePNG(path.join(GEN_FACE_DIR, `female_cloth_${i + 1}.png`), 144, 144, c));

// ----------------------------------------------------------------------------
// 5. Male Beards (Overlay at mustache & chin, y=91..140)
// ----------------------------------------------------------------------------
const mBeards = [
    extractRegion(rawMale, 43, 612, 170, 126, 45, 95, 54, 38, true),  // 1: Trimmed goatee
    extractRegion(rawMale, 296, 620, 175, 148, 35, 91, 74, 42, true), // 2: Full brown beard
    extractRegion(rawMale, 542, 615, 193, 165, 35, 91, 74, 50, true), // 3: Braided long white beard
    Buffer.alloc(144 * 144 * 4)                                       // 4: Clean shaven (empty)
];
mBeards.forEach((b, i) => writePNG(path.join(GEN_FACE_DIR, `male_beard_${i + 1}.png`), 144, 144, b));

// ----------------------------------------------------------------------------
// 6. Child Portraits (Complete authentic U7 stone arch portraits)
// ----------------------------------------------------------------------------
const childBoy = extractRegion(rawFemale, 516, 569, 244, 230, 0, 0, 144, 144);
const childGirl = extractRegion(rawFemale, 766, 565, 246, 234, 0, 0, 144, 144);
writePNG(path.join(GEN_FACE_DIR, 'child_boy.png'), 144, 144, childBoy);
writePNG(path.join(GEN_FACE_DIR, 'child_girl.png'), 144, 144, childGirl);

console.log('Master generator portrait layers cleanly extracted and verified!');
