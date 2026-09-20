'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');
const GEN_CHAR_DIR = path.join(ROOT, 'game', 'img', 'generator', 'char');
if (!fs.existsSync(GEN_CHAR_DIR)) fs.mkdirSync(GEN_CHAR_DIR, { recursive: true });

function parseHex(s) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(s).trim());
    return m ? [(parseInt(m[1], 16) >> 16) & 255, (parseInt(m[1], 16) >> 8) & 255, parseInt(m[1], 16) & 255] : null;
}
function srgbToLab(r, g, b) {
    const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const R = lin(r), G = lin(g), B = lin(b);
    const X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
    const Y = (R * 0.2126729 + G * 0.7151522 + B * 0.0721750);
    const Z = (R * 0.0193339 + G * 0.1191920 + B * 0.9503041) / 1.08883;
    const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (t * 24389 / 27 + 16) / 116);
    const fx = f(X), fy = f(Y), fz = f(Z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
function labDist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }

const palHexes = fs.readFileSync(PALETTE_FILE, 'utf8').split(/\r?\n/).filter(Boolean).map(s => s.trim());
const PALETTE_LAB = palHexes.map(h => {
    const rgb = parseHex(h);
    return { rgb, lab: srgbToLab(rgb[0], rgb[1], rgb[2]) };
});

function snapToPalette(r, g, b) {
    const lab = srgbToLab(r, g, b);
    let best = PALETTE_LAB[0].rgb, bestDist = Infinity;
    for (let i = 0; i < PALETTE_LAB.length; i++) {
        const d = labDist(lab, PALETTE_LAB[i].lab);
        if (d < bestDist) { bestDist = d; best = PALETTE_LAB[i].rgb; }
    }
    return best;
}

// Load full verified walk sheets (144x192)
const m1 = decodePNG(fs.readFileSync('game/img/characters/$UF_Human_Male_1_Walk.png')); // Forester
const m2 = decodePNG(fs.readFileSync('game/img/characters/$UF_Human_Male_2_Walk.png')); // Blonde / Green
const m3 = decodePNG(fs.readFileSync('game/img/characters/$UF_Human_Male_3_Walk.png')); // Black hair / Armor
const m4 = decodePNG(fs.readFileSync('game/img/characters/$UF_Human_Male_4_Walk.png')); // Red hair / Beard

const f1 = decodePNG(fs.readFileSync('game/img/characters/$UF_Human_Female_1_Walk.png')); // Dress
const f2 = decodePNG(fs.readFileSync('game/img/characters/$UF_Human_Female_2_Walk.png')); // Forester green
const f3 = decodePNG(fs.readFileSync('game/img/characters/$UF_Human_Female_3_Walk.png')); // Indigo
const f4 = decodePNG(fs.readFileSync('game/img/characters/$UF_Human_Female_4_Walk.png')); // Guard armor

// ----------------------------------------------------------------------------
// 1. EXTRACT HAIR OVERLAYS (Rows y: 0..22 in each 48x48 cell)
// ----------------------------------------------------------------------------
function extractHairLayer(sheetBuf) {
    const hairBuf = Buffer.alloc(144 * 192 * 4);
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
            const bx = col * 48;
            const by = row * 48;
            for (let py = 0; py < 23; py++) {
                for (let px = 0; px < 48; px++) {
                    const idx = ((by + py) * 144 + (bx + px)) * 4;
                    const r = sheetBuf[idx], g = sheetBuf[idx + 1], b = sheetBuf[idx + 2], a = sheetBuf[idx + 3];
                    // Exclude skin tones (skin is generally warm peach/tan: r > 160, g > 110, b > 80 with r > b * 1.4)
                    const isSkin = (r > 150 && g > 100 && b > 70 && r > b * 1.3 && (r - g) < 70);
                    // North facing (row 3) is all hair on the back of the head!
                    if (a > 30 && (row === 3 || !isSkin)) {
                        hairBuf[idx] = r;
                        hairBuf[idx + 1] = g;
                        hairBuf[idx + 2] = b;
                        hairBuf[idx + 3] = a;
                    }
                }
            }
        }
    }
    return hairBuf;
}

console.log('Extracting Charset Hair layers...');
const mHair1 = extractHairLayer(m1.data); // Short brown
const mHair2 = extractHairLayer(m2.data); // Combed blonde
const mHair3 = extractHairLayer(m3.data); // Shaggy black
const mHair4 = extractHairLayer(m4.data); // Trimmed red

writePNG(path.join(GEN_CHAR_DIR, 'male_hair_1.png'), 144, 192, mHair1);
writePNG(path.join(GEN_CHAR_DIR, 'male_hair_2.png'), 144, 192, mHair2);
writePNG(path.join(GEN_CHAR_DIR, 'male_hair_3.png'), 144, 192, mHair3);
writePNG(path.join(GEN_CHAR_DIR, 'male_hair_4.png'), 144, 192, mHair4);

const fHair1 = extractHairLayer(f1.data); // Long auburn
const fHair2 = extractHairLayer(f2.data); // Braided blonde
const fHair3 = extractHairLayer(f3.data); // Black bun/wavy
const fHair4 = extractHairLayer(f4.data); // Ponytail brown

writePNG(path.join(GEN_CHAR_DIR, 'female_hair_1.png'), 144, 192, fHair1);
writePNG(path.join(GEN_CHAR_DIR, 'female_hair_2.png'), 144, 192, fHair2);
writePNG(path.join(GEN_CHAR_DIR, 'female_hair_3.png'), 144, 192, fHair3);
writePNG(path.join(GEN_CHAR_DIR, 'female_hair_4.png'), 144, 192, fHair4);

// ----------------------------------------------------------------------------
// 2. EXTRACT BEARD OVERLAYS (py: 18..26 in each 48x48 cell)
// ----------------------------------------------------------------------------
console.log('Extracting Charset Beard layers...');
function extractBeardLayer(sheetBuf) {
    const beardBuf = Buffer.alloc(144 * 192 * 4);
    for (let row = 0; row < 3; row++) { // S, W, E only (North has no beard visible)
        for (let col = 0; col < 3; col++) {
            const bx = col * 48;
            const by = row * 48;
            for (let py = 19; py < 26; py++) {
                for (let px = 14; px < 34; px++) {
                    const idx = ((by + py) * 144 + (bx + px)) * 4;
                    const r = sheetBuf[idx], g = sheetBuf[idx + 1], b = sheetBuf[idx + 2], a = sheetBuf[idx + 3];
                    const isSkin = (r > 165 && g > 115 && b > 85 && r > b * 1.3);
                    if (a > 30 && !isSkin) {
                        beardBuf[idx] = r;
                        beardBuf[idx + 1] = g;
                        beardBuf[idx + 2] = b;
                        beardBuf[idx + 3] = a;
                    }
                }
            }
        }
    }
    return beardBuf;
}

const mBeard1 = Buffer.alloc(144 * 192 * 4); // None / clean shaven (blank)
const mBeard2 = extractBeardLayer(m3.data); // Goatee
const mBeard3 = extractBeardLayer(m4.data); // Full beard
const mBeard4 = extractBeardLayer(m2.data); // Short stubble

writePNG(path.join(GEN_CHAR_DIR, 'male_beard_1.png'), 144, 192, mBeard4); // Stubble
writePNG(path.join(GEN_CHAR_DIR, 'male_beard_2.png'), 144, 192, mBeard2); // Goatee
writePNG(path.join(GEN_CHAR_DIR, 'male_beard_3.png'), 144, 192, mBeard3); // Full beard
writePNG(path.join(GEN_CHAR_DIR, 'male_beard_4.png'), 144, 192, mBeard3); // Braided/heavy beard

// ----------------------------------------------------------------------------
// 3. EXTRACT CLOTHING & ARMOR OVERLAYS (py: 22..47)
// ----------------------------------------------------------------------------
console.log('Extracting Charset Clothing layers...');
function extractClothingLayer(sheetBuf) {
    const clothBuf = Buffer.alloc(144 * 192 * 4);
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
            const bx = col * 48;
            const by = row * 48;
            for (let py = 22; py < 48; py++) {
                for (let px = 0; px < 48; px++) {
                    const idx = ((by + py) * 144 + (bx + px)) * 4;
                    const r = sheetBuf[idx], g = sheetBuf[idx + 1], b = sheetBuf[idx + 2], a = sheetBuf[idx + 3];
                    // Preserve clothing, exclude pure bare hand pixels (py 28..34, px 8..14 or 34..40)
                    const isBareHand = (py >= 28 && py <= 35 && (px <= 14 || px >= 34) && r > 165 && g > 115 && b > 85);
                    if (a > 30 && !isBareHand) {
                        clothBuf[idx] = r;
                        clothBuf[idx + 1] = g;
                        clothBuf[idx + 2] = b;
                        clothBuf[idx + 3] = a;
                    }
                }
            }
        }
    }
    return clothBuf;
}

const mCloth1 = extractClothingLayer(m1.data); // Brown leather jerkin
const mCloth2 = extractClothingLayer(m3.data); // Steel cuirass & mail
const mCloth3 = extractClothingLayer(m2.data); // Green doublet / scout
const mCloth4 = extractClothingLayer(m4.data); // Artisan vest / heavy leather

writePNG(path.join(GEN_CHAR_DIR, 'male_cloth_1.png'), 144, 192, mCloth1);
writePNG(path.join(GEN_CHAR_DIR, 'male_cloth_2.png'), 144, 192, mCloth2);
writePNG(path.join(GEN_CHAR_DIR, 'male_cloth_3.png'), 144, 192, mCloth3);
writePNG(path.join(GEN_CHAR_DIR, 'male_cloth_4.png'), 144, 192, mCloth4);

const fCloth1 = extractClothingLayer(f1.data); // Russet peasant dress
const fCloth2 = extractClothingLayer(f4.data); // Guard cuirass & armor
const fCloth3 = extractClothingLayer(f2.data); // Forester green tunic
const fCloth4 = extractClothingLayer(f3.data); // Indigo artisan gown

writePNG(path.join(GEN_CHAR_DIR, 'female_cloth_1.png'), 144, 192, fCloth1);
writePNG(path.join(GEN_CHAR_DIR, 'female_cloth_2.png'), 144, 192, fCloth2);
writePNG(path.join(GEN_CHAR_DIR, 'female_cloth_3.png'), 144, 192, fCloth3);
writePNG(path.join(GEN_CHAR_DIR, 'female_cloth_4.png'), 144, 192, fCloth4);

// ----------------------------------------------------------------------------
// 4. EXTRACT BASE BODIES (Head, face, arms, boots) in 3 SKIN TONES
// ----------------------------------------------------------------------------
console.log('Building Base Bodies in 3 skin tones...');
function extractBaseBody(sheetBuf, skinMultiplier) {
    const bodyBuf = Buffer.alloc(144 * 192 * 4);
    for (let i = 0; i < sheetBuf.length; i += 4) {
        const r = sheetBuf[i], g = sheetBuf[i + 1], b = sheetBuf[i + 2], a = sheetBuf[i + 3];
        if (a > 30) {
            const isSkin = (r > 150 && g > 95 && b > 65 && r > b * 1.25);
            if (isSkin) {
                // Adjust skin tone
                const nr = Math.min(255, Math.max(0, Math.round(r * skinMultiplier[0])));
                const ng = Math.min(255, Math.max(0, Math.round(g * skinMultiplier[1])));
                const nb = Math.min(255, Math.max(0, Math.round(b * skinMultiplier[2])));
                const sn = snapToPalette(nr, ng, nb);
                bodyBuf[i] = sn[0];
                bodyBuf[i + 1] = sn[1];
                bodyBuf[i + 2] = sn[2];
                bodyBuf[i + 3] = 255;
            } else {
                bodyBuf[i] = r;
                bodyBuf[i + 1] = g;
                bodyBuf[i + 2] = b;
                bodyBuf[i + 3] = a;
            }
        }
    }
    return bodyBuf;
}

// 3 skin multipliers: Fair [1.0, 1.0, 1.0], Tanned [0.90, 0.82, 0.70], Dark [0.65, 0.55, 0.45]
const mBody1 = extractBaseBody(m1.data, [1.0, 1.0, 1.0]);
const mBody2 = extractBaseBody(m1.data, [0.88, 0.80, 0.68]);
const mBody3 = extractBaseBody(m1.data, [0.65, 0.54, 0.44]);

writePNG(path.join(GEN_CHAR_DIR, 'male_base_1.png'), 144, 192, mBody1);
writePNG(path.join(GEN_CHAR_DIR, 'male_base_2.png'), 144, 192, mBody2);
writePNG(path.join(GEN_CHAR_DIR, 'male_base_3.png'), 144, 192, mBody3);

const fBody1 = extractBaseBody(f1.data, [1.0, 1.0, 1.0]);
const fBody2 = extractBaseBody(f1.data, [0.88, 0.80, 0.68]);
const fBody3 = extractBaseBody(f1.data, [0.65, 0.54, 0.44]);

writePNG(path.join(GEN_CHAR_DIR, 'female_base_1.png'), 144, 192, fBody1);
writePNG(path.join(GEN_CHAR_DIR, 'female_base_2.png'), 144, 192, fBody2);
writePNG(path.join(GEN_CHAR_DIR, 'female_base_3.png'), 144, 192, fBody3);

console.log('\n=== ALL MODULAR CHARSET LAYERS EXTRACTED SUCCESSFULLY ===');

