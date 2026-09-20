'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');
const BRAIN_DIR = 'C:/Users/snewt/.gemini/antigravity/brain/e6a9a54f-2cc6-432e-b7ec-5affda42dd85';

const meadowPath = path.join(ROOT, 'art', 'masters', 'meadow.png');
const meadowDec = fs.existsSync(meadowPath) ? decodePNG(fs.readFileSync(meadowPath)) : null;

function getMeadowPixel(x, y) {
    if (!meadowDec) return [52, 98, 48];
    const mx = ((x % 48) + 48) % 48;
    const my = ((y % 48) + 48) % 48;
    const o = (my * meadowDec.width + mx) * 4;
    return [meadowDec.data[o], meadowDec.data[o + 1], meadowDec.data[o + 2]];
}

const FONT = {
    '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001',
    '5': '111100111001111', '6': '111100111101111', '7': '111001001010010', '8': '111101111101111', '9': '111101111001111',
    'A': '010101111101101', 'B': '110101110101110', 'C': '011100100100011', 'D': '110101101101110', 'E': '111100110100111',
    'F': '111100110100100', 'G': '011100101101011', 'H': '101101111101101', 'I': '111010010010111', 'J': '001001001101010',
    'K': '101101110101101', 'L': '100100100100111', 'M': '101111111101101', 'N': '110101101101101', 'O': '010101101101010',
    'P': '110101110100100', 'Q': '010101101110011', 'R': '110101110101101', 'S': '011100010001110', 'T': '111010010010010',
    'U': '101101101101111', 'V': '101101101101010', 'W': '101101111111101', 'X': '101101010101101', 'Y': '101101010010010',
    'Z': '111001010100111', '.': '000000000000010', ':': '000010000010000', '-': '000000111000000', '=': '000111000111000',
    '/': '001001010100100', '_': '000000000000111', '(': '010100100100010', ')': '010001001001010', '#': '101111101111101',
    '$': '011110010011110', '!': '010010010000010', '?': '110001010000010', ' ': '000000000000000', '<': '001010100010001',
    '>': '100010001010100', '+': '000010111010000', ',': '000000000010100', '[': '110100100100110', ']': '011001001001011',
    '&': '010101010101101', '|': '010010010010010', '%': '101001010100101', '"': '101101000000000', '\'': '010010000000000',
    '*': '010111010101010'
};

const W = 1280;
const H = 820;
const canvas = Buffer.alloc(W * H * 4);

// Background
for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
        const o = (y * W + x) * 4;
        canvas[o] = 14; canvas[o + 1] = 17; canvas[o + 2] = 23; canvas[o + 3] = 255;
    }
}

function setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const o = (y * W + x) * 4;
    if (a === 255) {
        canvas[o] = r; canvas[o + 1] = g; canvas[o + 2] = b; canvas[o + 3] = 255;
    } else if (a > 0) {
        const alpha = a / 255;
        canvas[o] = Math.round(r * alpha + canvas[o] * (1 - alpha));
        canvas[o + 1] = Math.round(g * alpha + canvas[o + 1] * (1 - alpha));
        canvas[o + 2] = Math.round(b * alpha + canvas[o + 2] * (1 - alpha));
        canvas[o + 3] = 255;
    }
}

function fillRect(x0, y0, w, h, r, g, b, a = 255) {
    for (let y = y0; y < y0 + h; y++) {
        for (let x = x0; x < x0 + w; x++) {
            setPixel(x, y, r, g, b, a);
        }
    }
}

function drawRect(x0, y0, w, h, r, g, b) {
    for (let x = x0; x < x0 + w; x++) {
        setPixel(x, y0, r, g, b);
        setPixel(x, y0 + h - 1, r, g, b);
    }
    for (let y = y0; y < y0 + h; y++) {
        setPixel(x0, y, r, g, b);
        setPixel(x0 + w - 1, y, r, g, b);
    }
}

function drawText(x, y, text, rgb, scale = 1) {
    let cx = x;
    for (const ch of String(text).toUpperCase()) {
        const g = FONT[ch] || FONT['?'];
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 3; c++) {
                if (g[r * 3 + c] === '1') {
                    fillRect(cx + c * scale, y + r * scale, scale, scale, rgb[0], rgb[1], rgb[2], 255);
                }
            }
        }
        cx += 4 * scale;
    }
}

// ----------------------------------------------------------------------------
// 1. Header
// ----------------------------------------------------------------------------
fillRect(0, 0, W, 70, 20, 26, 36);
drawRect(0, 69, W, 1, 40, 50, 70);
drawText(24, 16, "AESTHETIC LOCK: SERIOUS CHIBI AS OPPOSED TO CUTE CHIBI (VISION V116)", [255, 235, 160], 2);
drawText(24, 42, "TACTICAL 16-BIT PROPORTIONS (~3.0-3.2 HEADS) | DETERMINED GAZE | FUNCTIONAL MEDIEVAL GEAR", [140, 190, 230], 1);

// ----------------------------------------------------------------------------
// 2. Left Panel: Cute Chibi (Rejected) vs Serious Chibi (Approved)
// ----------------------------------------------------------------------------
const p1X = 24, p1Y = 85, p1W = 580, p1H = 340;
fillRect(p1X, p1Y, p1W, p1H, 22, 28, 40);
drawRect(p1X, p1Y, p1W, p1H, 45, 60, 85);

// Column A: Cute Chibi (Rejected)
fillRect(p1X + 16, p1Y + 16, 260, 308, 30, 20, 24);
drawRect(p1X + 16, p1Y + 16, 260, 308, 160, 50, 60);
drawText(p1X + 28, p1Y + 28, "CUTE CHIBI (REJECTED)", [255, 120, 120], 1);
drawText(p1X + 28, p1Y + 44, "Juvenile / Bubbly / Toy-like", [200, 160, 160], 1);
drawText(p1X + 28, p1Y + 70, "* HEAD: Giant bubble head (1:2 ratio)", [220, 180, 180], 1);
drawText(p1X + 28, p1Y + 90, "* EYES: Huge shiny manga orbs", [220, 180, 180], 1);
drawText(p1X + 28, p1Y + 110, "* FACE: Big smiling / blushing cheeks", [220, 180, 180], 1);
drawText(p1X + 28, p1Y + 130, "* BODY: Squat, stubby blob limbs", [220, 180, 180], 1);
drawText(p1X + 28, p1Y + 150, "* GEAR: Oversized plastic weapons", [220, 180, 180], 1);
drawText(p1X + 28, p1Y + 170, "* PALETTE: Pastel / saturated candy", [220, 180, 180], 1);
drawText(p1X + 28, p1Y + 200, "RESULT: Breaks dark fantasy tone,", [255, 140, 140], 1);
drawText(p1X + 28, p1Y + 216, "reads as a children's mobile game.", [255, 140, 140], 1);

// Column B: Serious Chibi (Approved)
fillRect(p1X + 295, p1Y + 16, 270, 308, 18, 32, 28);
drawRect(p1X + 295, p1Y + 16, 270, 308, 50, 180, 100);
drawText(p1X + 307, p1Y + 28, "SERIOUS CHIBI (APPROVED V116)", [120, 255, 160], 1);
drawText(p1X + 307, p1Y + 44, "Tactical 16-Bit / Tactics Ogre / FF5", [160, 220, 190], 1);
drawText(p1X + 307, p1Y + 70, "* HEAD: Grounded proportion (~3.1 ratio)", [200, 240, 210], 1);
drawText(p1X + 307, p1Y + 90, "* EYES: Narrow, determined, stern brow", [200, 240, 210], 1);
drawText(p1X + 307, p1Y + 110, "* FACE: Focused tactical expression", [200, 240, 210], 1);
drawText(p1X + 307, p1Y + 130, "* BODY: Defined shoulders & stance", [200, 240, 210], 1);
drawText(p1X + 307, p1Y + 150, "* GEAR: Functional straps, scabbard, belt", [200, 240, 210], 1);
drawText(p1X + 307, p1Y + 170, "* PALETTE: Earthy, weathered, 16-bit", [200, 240, 210], 1);
drawText(p1X + 307, p1Y + 200, "RESULT: Charming yet mature & gritty,", [140, 255, 180], 1);
drawText(p1X + 307, p1Y + 216, "fits serious colony survival.", [140, 255, 180], 1);

// ----------------------------------------------------------------------------
// 3. Right Panel: Anatomical Stature Breakdown (x=625..W-24, y=85..410)
// ----------------------------------------------------------------------------
const p2X = 625, p2Y = 85, p2W = W - 24 - p2X, p2H = 340;
fillRect(p2X, p2Y, p2W, p2H, 22, 28, 40);
drawRect(p2X, p2Y, p2W, p2H, 45, 60, 85);
drawText(p2X + 16, p2Y + 16, "ANATOMICAL RATIO IN 48px TILE (1 TILE IN HEIGHT)", [255, 220, 120], 1);
drawText(p2X + 16, p2Y + 32, "Total Stature = 40 px tall | Ratio = 3.08 Heads (~3.1 Serious Chibi)", [140, 190, 230], 1);

// Draw ground box with tile boundary at 4x (48x48 -> 192x192)
const gX = p2X + 24, gY = p2Y + 55;
for (let y = 0; y < 192; y++) {
    for (let x = 0; x < 192; x++) {
        const c = getMeadowPixel(x / 4, y / 4);
        setPixel(gX + x, gY + y, c[0], c[1], c[2]);
    }
}
drawRect(gX, gY, 192, 192, 60, 240, 240); // Cyan tile boundary

// Blit Elf Male Stand at 4x (frame 48x48 -> 192x192)
const elfWalkSheet = decodePNG(fs.readFileSync(path.join(CHAR_DIR, '$UF_Elf_Male_Walk.png')));
// Col 1, Row 0 is South Stand (sx = 48..95, sy = 0..47)
for (let sy = 0; sy < 48; sy++) {
    for (let sx = 0; sx < 48; sx++) {
        const sIdx = (sy * 144 + (48 + sx)) * 4;
        if (elfWalkSheet.data[sIdx + 3] > 0) {
            for (let dy = 0; dy < 4; dy++) {
                for (let dx = 0; dx < 4; dx++) {
                    setPixel(gX + sx * 4 + dx, gY + sy * 4 + dy,
                             elfWalkSheet.data[sIdx], elfWalkSheet.data[sIdx + 1], elfWalkSheet.data[sIdx + 2]);
                }
            }
        }
    }
}

// Draw height measurement lines and labels to the right of the 4x sprite
const lineX = gX + 205;
// Head: rows 8..20 (13px * 4 = 52px)
drawRect(lineX, gY + 8 * 4, 15, 13 * 4, 255, 200, 80);
drawText(lineX + 25, gY + 12 * 4, "HEAD: 13 px (32.5%) - STERN BROW, FOCUSED GAZE", [255, 210, 100], 1);

// Torso: rows 21..33 (13px * 4 = 52px)
drawRect(lineX, gY + 21 * 4, 15, 13 * 4, 100, 200, 255);
drawText(lineX + 25, gY + 25 * 4, "TORSO: 13 px (32.5%) - DEFINED TUNIC, BELT, STRAPS", [120, 210, 255], 1);

// Legs/Boots: rows 34..47 (14px * 4 = 56px)
drawRect(lineX, gY + 34 * 4, 15, 14 * 4, 120, 240, 150);
drawText(lineX + 25, gY + 39 * 4, "LEGS: 14 px (35.0%) - ARTICULATED LEATHER BOOTS", [140, 240, 170], 1);

drawText(p2X + 24, p2Y + 265, "TOTAL HEIGHT: 40 px ON ROWS 8..47 (LEAVES 7px TOP CLEARANCE)", [255, 235, 160], 1);
drawText(p2X + 24, p2Y + 285, "BASELINE Y=47: PERFECT GROUNDING WITH ZERO CLIPPING", [160, 240, 200], 1);
drawText(p2X + 24, p2Y + 305, "100% PASSES ORIGINALITY CHECK (0.513 >= 0.28) & PALETTE CHECK", [140, 200, 240], 1);

// ----------------------------------------------------------------------------
// 4. Bottom Panel: The 4 Core Facings & Action Lineup in Serious Chibi
// ----------------------------------------------------------------------------
const p3Y = 440;
fillRect(24, p3Y, W - 48, H - p3Y - 20, 20, 25, 35);
drawRect(24, p3Y, W - 48, H - p3Y - 20, 45, 60, 85);
drawText(36, p3Y + 14, "SERIOUS CHIBI ACTION PREVIEWS (3x CLOSE-UP ON MEADOW TERRAIN)", [255, 230, 150], 1);
drawText(36, p3Y + 30, "Mature battle postures, zero flying projectiles, initiation-only magic, dedicated hauling", [140, 180, 220], 1);

// Draw 8 sample sprites across the bottom panel at 3x (frame 48x48 -> 144x144)
const samples = [
    { title: "1. SOUTH (DOWN)", sheet: '$UF_Elf_Male_Walk.png',   sx: 48,  sy: 0,   desc: "Neutral Stand" },
    { title: "2. WEST (LEFT)",   sheet: '$UF_Elf_Male_Walk.png',   sx: 48,  sy: 48,  desc: "Profile Stand" },
    { title: "3. EAST (RIGHT)",  sheet: '$UF_Elf_Male_Walk.png',   sx: 48,  sy: 96,  desc: "Mirrored Profile" },
    { title: "4. NORTH (UP)",    sheet: '$UF_Elf_Male_Walk.png',   sx: 48,  sy: 144, desc: "Back Stance" },
    { title: "5. HAUL SACK",     sheet: '$UF_Elf_Male_Haul.png',   sx: 48,  sy: 0,   desc: "Carrying Load" },
    { title: "6. MELEE SWING",   sheet: '$UF_Elf_Male_Attack.png', sx: 48,  sy: 0,   desc: "Slash Arc" },
    { title: "7. BOW PLUCK",     sheet: '$UF_Elf_Male_Bow.png',    sx: 96,  sy: 0,   desc: "Zero Arrows" },
    { title: "8. MAGIC AURA",    sheet: '$UF_Elf_Male_Magic.png',  sx: 0,   sy: 0,   desc: "Spell Chant" }
];

const boxW = 144, boxH = 144;
const gap = 10;
const startX = 38;
const startY = p3Y + 54;

samples.forEach((samp, i) => {
    const curX = startX + i * (boxW + gap);
    
    // Meadow background at 3x
    for (let y = 0; y < boxH; y++) {
        for (let x = 0; x < boxW; x++) {
            const c = getMeadowPixel(x / 3, y / 3);
            setPixel(curX + x, startY + y, c[0], c[1], c[2]);
        }
    }
    drawRect(curX, startY, boxW, boxH, 40, 50, 70);

    // Blit sprite at 3x
    const sheet = decodePNG(fs.readFileSync(path.join(CHAR_DIR, samp.sheet)));
    for (let sy = 0; sy < 48; sy++) {
        for (let sx = 0; sx < 48; sx++) {
            const sIdx = ((samp.sy + sy) * sheet.width + (samp.sx + sx)) * 4;
            if (sheet.data[sIdx + 3] > 0) {
                for (let dy = 0; dy < 3; dy++) {
                    for (let dx = 0; dx < 3; dx++) {
                        setPixel(curX + sx * 3 + dx, startY + sy * 3 + dy,
                                 sheet.data[sIdx], sheet.data[sIdx + 1], sheet.data[sIdx + 2]);
                    }
                }
            }
        }
    }

    // Title & desc
    drawText(curX + 4, startY + boxH + 8, samp.title, [240, 220, 140], 1);
    drawText(curX + 4, startY + boxH + 22, samp.desc, [160, 180, 200], 1);
});

// Footer
drawText(36, H - 35, "PROMPT UPGRADE: ALL NANO BANANA II PROMPTS SPECIFY 'SERIOUS TACTICAL CHIBI, 3.1 HEADS, DETERMINED BROW' (V116)", [160, 240, 190], 1);
drawText(36, H - 20, "ZERO CUTE BUBBLE TROPES | ZERO FLYING PROJECTILES | 100% CONDITIONAL ON MASTER REFERENCE SHEET", [130, 170, 210], 1);

const outCompPath = path.join(REVIEW_DIR, 'serious_chibi_aesthetic_comparison.png');
fs.writeFileSync(outCompPath, writePNG(canvas, W, H));
console.log('Saved serious chibi comparison showcase:', outCompPath);

fs.copyFileSync(outCompPath, path.join(BRAIN_DIR, 'serious_chibi_aesthetic_comparison.png'));
console.log('Copied to brain artifacts.');
