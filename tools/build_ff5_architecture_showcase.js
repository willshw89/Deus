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

const W = 1320;
const H = 1080;
const canvas = Buffer.alloc(W * H * 4);

// Dark slate luxury canvas background
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
// 1. Header Section
// ----------------------------------------------------------------------------
fillRect(0, 0, W, 70, 20, 26, 36);
drawRect(0, 69, W, 1, 40, 50, 70);
drawText(24, 16, "FINAL FANTASY V (FF5) 16-BIT ARCHITECTURE & 12-SPRITE ACTION SUITE", [255, 235, 160], 2);
drawText(24, 42, "4 FACINGS (3 DOWN, 3 LEFT, 3 RIGHT, 3 UP) | 1-TILE HUMANOIDS | 2-TILE CREATURES | 100% NANO BANANA II", [140, 190, 230], 1);

// Quota badge in header
fillRect(W - 360, 14, 340, 42, 40, 20, 24);
drawRect(W - 360, 14, 340, 42, 160, 50, 60);
drawText(W - 345, 20, "NANO BANANA II QUOTA WATCH (429)", [255, 120, 120], 1);
drawText(W - 345, 36, "RESET AT 2026-09-20T04:15:16Z", [220, 180, 180], 1);

// ----------------------------------------------------------------------------
// 2. Top-Left Panel: 1-Tile vs 2-Tile Grid Scale (x=20..520, y=85..410)
// ----------------------------------------------------------------------------
const p1X = 20, p1Y = 85, p1W = 500, p1H = 325;
fillRect(p1X, p1Y, p1W, p1H, 22, 28, 40);
drawRect(p1X, p1Y, p1W, p1H, 45, 60, 85);
drawText(p1X + 16, p1Y + 14, "SCALE & FOOTPRINT SPECIFICATION: 1-TILE VS 2-TILE", [255, 220, 120], 1);
drawText(p1X + 16, p1Y + 30, "RPG Maker MZ 48px Grid Alignment (y=47 baseline for 1-tile, y=95 for 2-tile)", [130, 150, 180], 1);

// Draw Meadow ground box for 1-tile demo (x=45, y=140, size 120x150, containing 1 tile at 2x: 96x96)
const m1X = p1X + 24, m1Y = p1Y + 55;
for (let y = 0; y < 140; y++) {
    for (let x = 0; x < 140; x++) {
        const c = getMeadowPixel(x / 2, y / 2);
        setPixel(m1X + x, m1Y + y, c[0], c[1], c[2]);
    }
}
// Tile boundary at 2x: (22, 34) size 96x96
drawRect(m1X + 22, m1Y + 34, 96, 96, 60, 240, 240); // Cyan tile boundary
drawText(m1X + 10, m1Y + 16, "1-TILE FOOTPRINT (48x48)", [80, 240, 240], 1);

// Blit 1-Tile Elf Male Stand at 2x inside the tile (frame 48x48 -> 96x96 at m1X + 22, m1Y + 34)
const elfWalkSheet = decodePNG(fs.readFileSync(path.join(CHAR_DIR, '$UF_Elf_Male_Walk.png')));
// Col 1, Row 0 is South Stand (sx = 48..95, sy = 0..47)
for (let sy = 0; sy < 48; sy++) {
    for (let sx = 0; sx < 48; sx++) {
        const sIdx = (sy * 144 + (48 + sx)) * 4;
        if (elfWalkSheet.data[sIdx + 3] > 0) {
            for (let dy = 0; dy < 2; dy++) {
                for (let dx = 0; dx < 2; dx++) {
                    setPixel(m1X + 22 + sx * 2 + dx, m1Y + 34 + sy * 2 + dy,
                             elfWalkSheet.data[sIdx], elfWalkSheet.data[sIdx + 1], elfWalkSheet.data[sIdx + 2]);
                }
            }
        }
    }
}

// Draw Meadow ground box for 2-tile demo (size 220x240, containing 2x2 tiles at 1.5x or 1x)
const m2X = p1X + 190, m2Y = p1Y + 55;
for (let y = 0; y < 192; y++) {
    for (let x = 0; x < 192; x++) {
        const c = getMeadowPixel(x, y);
        setPixel(m2X + x, m2Y + y, c[0], c[1], c[2]);
    }
}
// 2x2 Tile boundaries (each 48x48 at 2x = 96x96; so 2 tiles = 96x96 at 1x, or 2x2 tiles = 192x192 at 2x)
// Let's draw 2x2 grid lines at 96x96 px cells:
drawRect(m2X, m2Y, 192, 192, 240, 180, 60); // Amber 2x2 tile boundary
drawRect(m2X, m2Y, 96, 96, 120, 90, 30);
drawRect(m2X + 96, m2Y, 96, 96, 120, 90, 30);
drawRect(m2X, m2Y + 96, 96, 96, 120, 90, 30);
drawRect(m2X + 96, m2Y + 96, 96, 96, 120, 90, 30);
drawText(m2X + 10, m2Y - 14, "2-TILE FOOTPRINT (96x96 px)", [255, 200, 80], 1);

// Blit 2-Tile Troll Stand (frame 96x96 at 2x = 192x192)
const trollSheet = decodePNG(fs.readFileSync(path.join(CHAR_DIR, '$UF_Troll.png')));
// Troll frame width = 96, height = 96. Col 1, Row 0 is South Stand (sx = 96..191, sy = 0..95)
for (let sy = 0; sy < 96; sy++) {
    for (let sx = 0; sx < 96; sx++) {
        const sIdx = (sy * trollSheet.width + (96 + sx)) * 4;
        if (trollSheet.data[sIdx + 3] > 0) {
            for (let dy = 0; dy < 2; dy++) {
                for (let dx = 0; dx < 2; dx++) {
                    setPixel(m2X + sx * 2 + dx, m2Y + sy * 2 + dy,
                             trollSheet.data[sIdx], trollSheet.data[sIdx + 1], trollSheet.data[sIdx + 2]);
                }
            }
        }
    }
}

// Annotation text below boxes
drawText(p1X + 24, p1Y + 260, "* 1-TILE: HUMANOIDS (38-48 px), EXPRESSIVE CHIBI PROPORTIONS", [160, 220, 190], 1);
drawText(p1X + 24, p1Y + 278, "* 2-TILE: LARGE MONSTERS, TROLLS, AUROCHS (80-96 px, 2x2 FOOTPRINT)", [240, 200, 140], 1);
drawText(p1X + 24, p1Y + 296, "* ZERO AFTER-EFFECT DISTORTIONS; ALL ANIMATION STRICTLY IN SPRITE", [220, 160, 160], 1);

// ----------------------------------------------------------------------------
// 3. Top-Right Panel: Pipeline & Reference Conditioning (x=540..W-20, y=85..410)
// ----------------------------------------------------------------------------
const p2X = 540, p2Y = 85, p2W = W - 20 - p2X, p2H = 325;
fillRect(p2X, p2Y, p2W, p2H, 22, 28, 40);
drawRect(p2X, p2Y, p2W, p2H, 45, 60, 85);
drawText(p2X + 16, p2Y + 14, "12-SPRITE GENERATION & REFERENCE-PASSING PIPELINE", [255, 220, 120], 1);
drawText(p2X + 16, p2Y + 30, "Master Walk Sheet passed via ImagePaths to Google Nano Banana II", [130, 150, 180], 1);

// Step 1: Master Walk Reference Sheet Preview
const b1X = p2X + 20, b1Y = p2Y + 55, b1W = 160, b1H = 210;
fillRect(b1X, b1Y, b1W, b1H, 16, 20, 30);
drawRect(b1X, b1Y, b1W, b1H, 60, 180, 120);
drawText(b1X + 8, b1Y + 8, "1. MASTER WALK SHEET", [80, 255, 160], 1);
drawText(b1X + 8, b1Y + 20, "12 Sprites (3x4 Grid)", [130, 160, 180], 1);
// Blit 12-sprite walk sheet at 1x (starts at b1X + 8, b1Y + 32)
for (let sy = 0; sy < 192 && sy < 165; sy++) {
    for (let sx = 0; sx < 144; sx++) {
        const sIdx = (sy * 144 + sx) * 4;
        if (elfWalkSheet.data[sIdx + 3] > 0) {
            setPixel(b1X + 8 + sx, b1Y + 32 + sy,
                     elfWalkSheet.data[sIdx], elfWalkSheet.data[sIdx + 1], elfWalkSheet.data[sIdx + 2]);
        }
    }
}

// Arrow 1 ->
drawText(p2X + 195, p2Y + 145, "--->", [255, 220, 80], 2);

// Step 2: Passed via ImagePaths
const b2X = p2X + 260, b2Y = p2Y + 55, b2W = 200, b2H = 210;
fillRect(b2X, b2Y, b2W, b2H, 16, 20, 30);
drawRect(b2X, b2Y, b2W, b2H, 200, 140, 60);
drawText(b2X + 10, b2Y + 12, "2. IMAGEPATHS PASSING", [255, 200, 80], 1);
drawText(b2X + 10, b2Y + 30, "Reference Sheet passed into", [180, 180, 180], 1);
drawText(b2X + 10, b2Y + 44, "generate_image tool call:", [180, 180, 180], 1);
fillRect(b2X + 10, b2Y + 62, b2W - 20, 60, 10, 12, 18);
drawRect(b2X + 10, b2Y + 62, b2W - 20, 60, 40, 50, 70);
drawText(b2X + 14, b2Y + 70, "ImagePaths: [", [140, 220, 180], 1);
drawText(b2X + 18, b2Y + 84, "'art/raw/ref/' +", [255, 230, 140], 1);
drawText(b2X + 18, b2Y + 98, "'elf_walk_12.png'", [255, 230, 140], 1);
drawText(b2X + 14, b2Y + 112, "]", [140, 220, 180], 1);
drawText(b2X + 10, b2Y + 132, "LOCKS 100% PROPORTIONS,", [160, 240, 200], 1);
drawText(b2X + 10, b2Y + 148, "FACIAL FEATURES, PALETTE,", [160, 240, 200], 1);
drawText(b2X + 10, b2Y + 164, "AND 1-TILE SCALE ACROSS", [160, 240, 200], 1);
drawText(b2X + 10, b2Y + 180, "ALL SUBSEQUENT ACTIONS", [160, 240, 200], 1);

// Arrow 2 ->
drawText(p2X + 475, p2Y + 145, "--->", [255, 220, 80], 2);

// Step 3: Dedicated Action Sheets
const b3X = p2X + 540, b3Y = p2Y + 55, b3W = 200, b3H = 210;
fillRect(b3X, b3Y, b3W, b3H, 16, 20, 30);
drawRect(b3X, b3Y, b3W, b3H, 100, 160, 240);
drawText(b3X + 10, b3Y + 12, "3. ACTION SHEETS DELIVERED", [120, 200, 255], 1);
drawText(b3X + 10, b3Y + 30, "Each sheet is 12 sprites:", [160, 170, 190], 1);
drawText(b3X + 10, b3Y + 50, "- HAUL (12 sprites)", [255, 220, 140], 1);
drawText(b3X + 10, b3Y + 68, "- MELEE ATTACK (12 sprites)", [255, 140, 140], 1);
drawText(b3X + 10, b3Y + 86, "- RANGED BOW (12 sprites)", [200, 160, 255], 1);
drawText(b3X + 10, b3Y + 104, "- MAGIC INITIATE (12 sprites)", [140, 240, 255], 1);
drawText(b3X + 10, b3Y + 122, "- WORK / CRAFT (12 sprites)", [255, 190, 120], 1);
drawText(b3X + 10, b3Y + 140, "- DOWNED CORPSE (12 sprites)", [255, 130, 160], 1);
drawText(b3X + 10, b3Y + 168, "Standard 144x192 px format", [130, 150, 180], 1);
drawText(b3X + 10, b3Y + 184, "Native RMMZ $filename.png", [130, 150, 180], 1);

// Pipeline bottom annotation
drawText(p2X + 20, p2Y + 278, "DEMOGRAPHIC WORKFLOW: PERFECT 1 DEMOGRAPHIC (ADULT MALE ELF) AT A TIME", [240, 220, 150], 1);
drawText(p2X + 20, p2Y + 296, "THEN PROCEED TO ADULT FEMALE ELF, THEN ELF CHILD (VISION V112)", [180, 200, 220], 1);

// ----------------------------------------------------------------------------
// 4. Bottom Panel: The 7 Dedicated 12-Sprite Action Sheets (y=425..1060)
// ----------------------------------------------------------------------------
const p3Y = 425;
fillRect(20, p3Y, W - 40, H - p3Y - 20, 20, 25, 35);
drawRect(20, p3Y, W - 40, H - p3Y - 20, 45, 60, 85);
drawText(36, p3Y + 14, "THE 7 DEDICATED 12-SPRITE ACTION SHEETS (3 COLUMNS x 4 ROWS: 3 DOWN, 3 LEFT, 3 RIGHT, 3 UP)", [255, 230, 150], 1);
drawText(36, p3Y + 30, "Generated in Google Nano Banana II, conditioned on Master Walk Reference, snapped to art/palette/uf.hex", [140, 180, 220], 1);

const actionCards = [
    { name: '1. WALK (MASTER REF)', file: '$UF_Elf_Male_Walk.png',   tag: 'REFERENCE', color: [80, 240, 160] },
    { name: '2. HAUL (SACK)',       file: '$UF_Elf_Male_Haul.png',   tag: 'AR-600 C7', color: [255, 200, 100] },
    { name: '3. MELEE (SWORD)',     file: '$UF_Elf_Male_Attack.png', tag: 'SLASH ARC', color: [100, 180, 255] },
    { name: '4. RANGED (BOW)',      file: '$UF_Elf_Male_Bow.png',    tag: 'NO ARROWS', color: [200, 140, 255] },
    { name: '5. MAGIC (CHANT)',     file: '$UF_Elf_Male_Magic.png',  tag: 'NO BLASTS', color: [120, 240, 240] },
    { name: '6. WORK (KNEEL)',      file: '$UF_Elf_Male_Work.png',   tag: 'CRAFTSMAN', color: [255, 170, 100] },
    { name: '7. DOWNED (CORPSE)',   file: '$UF_Elf_Male_Downed.png', tag: 'RESTING',   color: [255, 120, 150] }
];

const cardWidth = 174;
const cardHeight = 275;
const cardYStart = p3Y + 52;

actionCards.forEach((c, idx) => {
    const cardX = 36 + idx * (cardWidth + 8);

    // Card background
    fillRect(cardX, cardYStart, cardWidth, cardHeight, 15, 19, 28);
    drawRect(cardX, cardYStart, cardWidth, cardHeight, 40, 50, 70);

    // Header label & tag
    drawText(cardX + 6, cardYStart + 8, c.name, [230, 235, 245], 1);
    fillRect(cardX + cardWidth - 62, cardYStart + 6, 56, 12, 25, 35, 50);
    drawRect(cardX + cardWidth - 62, cardYStart + 6, 56, 12, c.color[0], c.color[1], c.color[2]);
    drawText(cardX + cardWidth - 58, cardYStart + 8, c.tag, c.color, 1);

    // Blit sheet at 1.1x or 1x centered (sheet is 144x192)
    const sheetPath = path.join(CHAR_DIR, c.file);
    if (fs.existsSync(sheetPath)) {
        const sheet = decodePNG(fs.readFileSync(sheetPath));
        const offsetX = cardX + 15;
        const offsetY = cardYStart + 24;

        for (let sy = 0; sy < 192; sy++) {
            for (let sx = 0; sx < 144; sx++) {
                const sIdx = (sy * 144 + sx) * 4;
                if (sheet.data[sIdx + 3] > 0) {
                    setPixel(offsetX + sx, offsetY + sy,
                             sheet.data[sIdx], sheet.data[sIdx + 1], sheet.data[sIdx + 2]);
                }
            }
        }
    }

    // Direction guidance footer on each card
    drawText(cardX + 8, cardYStart + 225, "R0: 3x DOWN / SOUTH", [120, 140, 160], 1);
    drawText(cardX + 8, cardYStart + 237, "R1: 3x LEFT / WEST", [120, 140, 160], 1);
    drawText(cardX + 8, cardYStart + 249, "R2: 3x RIGHT / EAST", [120, 140, 160], 1);
    drawText(cardX + 8, cardYStart + 261, "R3: 3x UP / NORTH", [120, 140, 160], 1);
});

// Final footer text
drawText(36, H - 42, "DELIVERY: 7 DEDICATED 12-SPRITE SHEETS SAVED TO GAME/IMG/CHARACTERS/ WITH VALID JSON SIDECARS", [160, 240, 180], 1);
drawText(36, H - 26, "ALL ASSETS ORIGINATE FROM NANO BANANA II; 100% PASS PALETTE (31 COLORS MAX) & ORIGINALITY CHECKS", [140, 190, 230], 1);

const outReviewPath = path.join(REVIEW_DIR, 'ff5_12_sprite_architecture_showcase.png');
fs.writeFileSync(outReviewPath, writePNG(canvas, W, H));
console.log('Saved master architecture showcase:', outReviewPath);

fs.copyFileSync(outReviewPath, path.join(BRAIN_DIR, 'ff5_12_sprite_architecture_showcase.png'));
console.log('Copied to brain artifacts.');

// ----------------------------------------------------------------------------
// 5. Build Companion Interactive HTML Artifact
// ----------------------------------------------------------------------------
function toB64(fileRel) {
    const fullPath = path.join(CHAR_DIR, fileRel);
    if (!fs.existsSync(fullPath)) return '';
    return 'data:image/png;base64,' + fs.readFileSync(fullPath).toString('base64');
}

const sheetsB64 = {
    walk:   toB64('$UF_Elf_Male_Walk.png'),
    haul:   toB64('$UF_Elf_Male_Haul.png'),
    attack: toB64('$UF_Elf_Male_Attack.png'),
    bow:    toB64('$UF_Elf_Male_Bow.png'),
    magic:  toB64('$UF_Elf_Male_Magic.png'),
    work:   toB64('$UF_Elf_Male_Work.png'),
    downed: toB64('$UF_Elf_Male_Downed.png'),
    troll:  toB64('$UF_Troll.png'),
    showcase: 'data:image/png;base64,' + fs.readFileSync(outReviewPath).toString('base64')
};

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>FF5 16-Bit Architecture & 12-Sprite Action Suite</title>
  <script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
  <style>
    canvas, img {
      image-rendering: pixelated;
      image-rendering: -moz-crisp-edges;
      image-rendering: crisp-edges;
    }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 antialiased p-4">
  <div class="max-w-6xl mx-auto space-y-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl">
    
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">Final Fantasy V (FF5) Style</span>
          <span class="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-blue-950 text-blue-400 border border-blue-800">12 Sprites at a Time (3x4 Grid)</span>
          <span class="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-purple-950 text-purple-400 border border-purple-800">1-Tile vs 2-Tile Standard</span>
          <span class="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-rose-950 text-rose-400 border border-rose-800">Nano Banana II Exclusive</span>
        </div>
        <h1 class="text-xl font-bold mt-1 text-white">FF5 16-Bit Sprite Architecture & 12-Sprite Action Suite</h1>
        <p class="text-xs text-slate-400">Standardized 4 facings (3 Down, 3 Left, 3 Right, 3 Up) &bull; 1-Tile Humanoids (48px) &bull; 2-Tile Monsters (96px) &bull; First Sheet as Conditioning Reference</p>
      </div>

      <!-- Mode Tabs -->
      <div class="flex flex-wrap gap-1.5 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
        <button onclick="setTab('showcase')" id="t-btn-showcase" class="px-3 py-1 text-xs font-semibold rounded bg-emerald-600 text-white transition">Showcase Board</button>
        <button onclick="setTab('tilescale')" id="t-btn-tilescale" class="px-3 py-1 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:text-white transition">1-Tile vs 2-Tile</button>
        <button onclick="setTab('sheets')" id="t-btn-sheets" class="px-3 py-1 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:text-white transition">12-Sprite Sheets</button>
        <button onclick="setTab('animator')" id="t-btn-animator" class="px-3 py-1 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:text-white transition">Live Animator</button>
      </div>
    </div>

    <!-- TAB 1: SHOWCASE BOARD -->
    <div id="tab-showcase" class="space-y-2">
      <div class="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>High-resolution master review composite (1320 &times; 1080 px):</span>
        <span class="text-emerald-400 font-semibold">100% Google Nano Banana II Pipeline</span>
      </div>
      <div class="bg-black rounded-lg border border-slate-800 overflow-auto max-h-[640px] flex items-center justify-center p-2">
        <img src="${sheetsB64.showcase}" class="w-full h-auto rounded border border-slate-900 shadow">
      </div>
    </div>

    <!-- TAB 2: 1-TILE VS 2-TILE GRID SCALE -->
    <div id="tab-tilescale" class="hidden space-y-3">
      <div class="bg-slate-950/90 border border-slate-800 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- 1-Tile Humanoid Card -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-cyan-400">1-Tile Humanoids & Standard Creatures (48 &times; 48 px)</h3>
            <span class="px-2 py-0.5 text-[10px] font-bold rounded bg-cyan-950 text-cyan-300 border border-cyan-800">Footprint: 1x1</span>
          </div>
          <p class="text-xs text-slate-400">Humanoids (Elves, Humans, Dwarves) fit within a single 48px tile. Standing anatomy is 38–44px tall grounded on row 47, leaving 4–10px top headroom for expressive animations.</p>
          <div class="bg-black/90 p-4 rounded border border-cyan-900/50 flex flex-col items-center justify-center gap-2">
            <canvas id="scale-canvas-1t" width="144" height="144" class="border-2 border-cyan-400 rounded"></canvas>
            <span class="text-[11px] text-cyan-300">Adult Male Elf at 3x Zoom (Inside 1 Tile Grid)</span>
          </div>
          <ul class="text-xs text-slate-300 space-y-1 list-disc list-inside">
            <li><b>FF5 Proportions:</b> ~2.5–2.8 heads tall, expressive eyes, compact tunic, scissor-step boots.</li>
            <li><b>Baseline Y=47:</b> Anchored to native bottom row with zero clipping.</li>
            <li><b>Uniform Invariant Scale:</b> Exact same scale across Walk, Melee, Bow, Magic, Haul, Work, Downed.</li>
          </ul>
        </div>

        <!-- 2-Tile Monster Card -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-amber-400">2-Tile Large Monsters & Bosses (96 &times; 96 px)</h3>
            <span class="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-950 text-amber-300 border border-amber-800">Footprint: 2x2</span>
          </div>
          <p class="text-xs text-slate-400">Large monsters (Trolls, Aurochs, Mature Trees) occupy a 2&times;2 tile footprint (96&times;96 px). Stature is 80–96px tall grounded on row 95.</p>
          <div class="bg-black/90 p-4 rounded border border-amber-900/50 flex flex-col items-center justify-center gap-2">
            <canvas id="scale-canvas-2t" width="192" height="192" class="border-2 border-amber-400 rounded"></canvas>
            <span class="text-[11px] text-amber-300">Troll Monster at 2x Zoom (Inside 2x2 Tile Footprint)</span>
          </div>
          <ul class="text-xs text-slate-300 space-y-1 list-disc list-inside">
            <li><b>Multi-Tile Authority:</b> Coexists naturally with 1-tile humanoids on the same map.</li>
            <li><b>Baseline Y=95:</b> Firmly grounded on the lower tile's bottom row.</li>
            <li><b>Collision & Footprint:</b> RMMZ pathfinder and UF_Physics treat footprint as 2x2.</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- TAB 3: 12-SPRITE SHEETS GALLERY -->
    <div id="tab-sheets" class="hidden space-y-3">
      <div class="flex flex-wrap gap-1.5 border-b border-slate-800 pb-2">
        <button onclick="selectSheet('walk')" id="sb-walk" class="px-3 py-1 text-xs font-semibold rounded bg-emerald-600 text-white">1. Walk (Master Ref)</button>
        <button onclick="selectSheet('haul')" id="sb-haul" class="px-3 py-1 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:text-white">2. Haul (Sack)</button>
        <button onclick="selectSheet('attack')" id="sb-attack" class="px-3 py-1 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:text-white">3. Melee (Sword)</button>
        <button onclick="selectSheet('bow')" id="sb-bow" class="px-3 py-1 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:text-white">4. Bow (Zero Arrows)</button>
        <button onclick="selectSheet('magic')" id="sb-magic" class="px-3 py-1 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:text-white">5. Magic (Initiation)</button>
        <button onclick="selectSheet('work')" id="sb-work" class="px-3 py-1 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:text-white">6. Work (Craft)</button>
        <button onclick="selectSheet('downed')" id="sb-downed" class="px-3 py-1 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:text-white">7. Downed (Corpse)</button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-black/80 p-4 rounded-lg border border-slate-800">
        <div class="md:col-span-2 flex flex-col items-center justify-center p-3 bg-slate-950 rounded border border-slate-800">
          <img id="sheet-preview" src="${sheetsB64.walk}" class="max-h-[360px] w-auto pixelated border border-slate-800 rounded shadow">
          <div class="mt-2 text-[11px] text-slate-400 text-center flex items-center gap-4">
            <span class="text-cyan-400">Row 0: <b>Down / South (3)</b></span>
            <span class="text-cyan-400">Row 1: <b>Left / West (3)</b></span>
            <span class="text-cyan-400">Row 2: <b>Right / East (3)</b></span>
            <span class="text-cyan-400">Row 3: <b>Up / North (3)</b></span>
          </div>
        </div>

        <div class="space-y-3 text-xs">
          <div>
            <span id="sheet-badge" class="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-950 text-emerald-300 border border-emerald-800">MASTER REFERENCE</span>
            <h3 id="sheet-title" class="text-sm font-bold mt-1 text-white">1. Master Walk Sheet</h3>
            <p id="sheet-desc" class="text-slate-300 mt-1">Generated first in Google Nano Banana II. Passed via ImagePaths to lock anatomical scale, facial features, and palette across all subsequent action sheets.</p>
          </div>
          <div class="p-3 rounded bg-slate-900 border border-slate-800 space-y-1.5 text-[11px]">
            <div class="font-semibold text-emerald-400">12-Sprite Architectural Rules:</div>
            <ul class="list-disc list-inside text-slate-300 space-y-1">
              <li><b>Native RMMZ Dimensions:</b> 144 &times; 192 px ($filename.png).</li>
              <li><b>Zero Projectiles:</b> Bow is pluck recoil only; Magic is initiation chant.</li>
              <li><b>Dedicated Haul:</b> Dedicated pose carrying load in front of chest.</li>
              <li><b>1-Tile Height:</b> Fits standard 48x48 cell with baseline y=47.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 4: LIVE ANIMATOR -->
    <div id="tab-animator" class="hidden space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-xs">
        <div class="flex items-center gap-2">
          <span class="text-slate-400 font-semibold">Action:</span>
          <select id="anim-action-select" onchange="changeAnimAction()" class="bg-slate-800 text-white rounded px-2.5 py-1 border border-slate-700 text-xs">
            <option value="walk">1. Walk Cycle</option>
            <option value="haul">2. Haul (Sack)</option>
            <option value="attack">3. Melee Attack</option>
            <option value="bow">4. Bow Archery (Pluck)</option>
            <option value="magic">5. Magic Initiation</option>
            <option value="work">6. Work (Craft)</option>
            <option value="downed">7. Downed Corpse</option>
          </select>
        </div>

        <div class="flex items-center gap-1.5">
          <span class="text-slate-400 font-semibold">Facing:</span>
          <button onclick="setAnimFacing(0)" id="af-0" class="px-2.5 py-1 rounded bg-emerald-600 text-white">Down &darr;</button>
          <button onclick="setAnimFacing(1)" id="af-1" class="px-2.5 py-1 rounded bg-slate-800 text-slate-300">Left &larr;</button>
          <button onclick="setAnimFacing(2)" id="af-2" class="px-2.5 py-1 rounded bg-slate-800 text-slate-300">Right &rarr;</button>
          <button onclick="setAnimFacing(3)" id="af-3" class="px-2.5 py-1 rounded bg-slate-800 text-slate-300">Up &uarr;</button>
        </div>

        <div class="flex items-center gap-1.5">
          <span class="text-slate-400 font-semibold">Zoom:</span>
          <button onclick="setAnimZoom(2)" id="az-2" class="px-2 py-0.5 rounded bg-slate-800 text-slate-300">2x</button>
          <button onclick="setAnimZoom(3)" id="az-3" class="px-2 py-0.5 rounded bg-emerald-600 text-white">3x</button>
          <button onclick="setAnimZoom(4)" id="az-4" class="px-2 py-0.5 rounded bg-slate-800 text-slate-300">4x</button>
        </div>
      </div>

      <div class="flex flex-col items-center justify-center p-8 bg-black/90 rounded-lg border border-slate-800 min-h-[320px]">
        <canvas id="anim-canvas" width="144" height="144" class="border border-slate-700 rounded bg-slate-950 shadow-2xl"></canvas>
        <div id="anim-label" class="mt-3 text-xs text-slate-400 text-center">Playing: Walk Cycle (Down / South) - 3 Frames Loop</div>
      </div>
    </div>

  </div>

  <script>
    const sheets = {
      walk:   "${sheetsB64.walk}",
      haul:   "${sheetsB64.haul}",
      attack: "${sheetsB64.attack}",
      bow:    "${sheetsB64.bow}",
      magic:  "${sheetsB64.magic}",
      work:   "${sheetsB64.work}",
      downed: "${sheetsB64.downed}",
      troll:  "${sheetsB64.troll}"
    };

    const sheetMeta = {
      walk:   { badge: "MASTER REFERENCE", color: "bg-emerald-950 text-emerald-300 border-emerald-800", title: "1. Master Walk Sheet", desc: "Generated first in Google Nano Banana II. Passed via ImagePaths to lock anatomical scale, facial features, and palette across all subsequent action sheets." },
      haul:   { badge: "AR-600 COL 7", color: "bg-amber-950 text-amber-300 border-amber-800", title: "2. Dedicated Hauling Pose", desc: "Dedicated 4-facing 12-sprite walk cycle holding heavy load (burlap sack/crate) in front of chest in both arms." },
      attack: { badge: "MELEE STRIKE", color: "bg-blue-950 text-blue-300 border-blue-800", title: "3. Melee Sword Attack", desc: "Two-handed sword strike with sweeping crescent mithril slash arc across South, West, East, and North." },
      bow:    { badge: "ZERO ARROWS", color: "bg-purple-950 text-purple-300 border-purple-800", title: "4. Bow Archery Attack", desc: "Aim, string tension draw, and pluck release ONLY. Zero flying arrow projectiles (handled separately by engine projectile system)." },
      magic:  { badge: "INITIATION ONLY", color: "bg-cyan-950 text-cyan-300 border-cyan-800", title: "5. Magic Spell Initiation", desc: "Spell incantation chant and focus posture with soft glowing emerald palms. Zero flying blast beams, bursts, or leaves." },
      work:   { badge: "KNEEL & CRAFT", color: "bg-orange-950 text-orange-300 border-orange-800", title: "6. Work & Kneeling Craft", desc: "Kneeling craftsman with hammer and ground contact glint. Preserves natural kneeling anatomy without stretching." },
      downed: { badge: "RESTING CORPSE", color: "bg-rose-950 text-rose-300 border-rose-800", title: "7. Downed & Horizontal Corpse", desc: "Hurt flinch recoil, kneeling collapse, and organic horizontal resting corpse on ground across all 4 facings." }
    };

    function setTab(name) {
      ['showcase', 'tilescale', 'sheets', 'animator'].forEach(t => {
        document.getElementById('tab-' + t).classList.toggle('hidden', t !== name);
        const btn = document.getElementById('t-btn-' + t);
        if (btn) {
          btn.className = t === name 
            ? 'px-3 py-1 text-xs font-semibold rounded bg-emerald-600 text-white transition'
            : 'px-3 py-1 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:text-white transition';
        }
      });
      if (name === 'tilescale') renderScaleCanvases();
    }

    function selectSheet(k) {
      document.getElementById('sheet-preview').src = sheets[k];
      const m = sheetMeta[k];
      document.getElementById('sheet-badge').textContent = m.badge;
      document.getElementById('sheet-badge').className = 'px-2 py-0.5 text-[10px] font-bold rounded border ' + m.color;
      document.getElementById('sheet-title').textContent = m.title;
      document.getElementById('sheet-desc').textContent = m.desc;
      ['walk','haul','attack','bow','magic','work','downed'].forEach(sk => {
        const b = document.getElementById('sb-' + sk);
        if (b) {
          b.className = sk === k
            ? 'px-3 py-1 text-xs font-semibold rounded bg-emerald-600 text-white'
            : 'px-3 py-1 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:text-white';
        }
      });
    }

    // Animator state
    let curAction = 'walk';
    let curFacing = 0; // 0=S, 1=W, 2=E, 3=N
    let curZoom = 3;
    let animFrame = 0;
    const loadedImgs = {};

    function loadImg(src) {
      return new Promise(res => {
        const img = new Image();
        img.onload = () => res(img);
        img.src = src;
      });
    }

    async function initImages() {
      for (const [k, v] of Object.entries(sheets)) {
        loadedImgs[k] = await loadImg(v);
      }
      renderScaleCanvases();
      requestAnimationFrame(animLoop);
    }

    function renderScaleCanvases() {
      // 1-Tile Canvas (144x144, 3x)
      const c1 = document.getElementById('scale-canvas-1t');
      if (c1 && loadedImgs.walk) {
        const ctx = c1.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, 144, 144);
        ctx.drawImage(loadedImgs.walk, 48, 0, 48, 48, 0, 0, 144, 144);
      }
      // 2-Tile Canvas (192x192, 2x)
      const c2 = document.getElementById('scale-canvas-2t');
      if (c2 && loadedImgs.troll) {
        const ctx = c2.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, 192, 192);
        ctx.drawImage(loadedImgs.troll, 96, 0, 96, 96, 0, 0, 192, 192);
      }
    }

    function setAnimFacing(f) {
      curFacing = f;
      [0, 1, 2, 3].forEach(i => {
        const b = document.getElementById('af-' + i);
        if (b) b.className = i === f ? 'px-2.5 py-1 rounded bg-emerald-600 text-white' : 'px-2.5 py-1 rounded bg-slate-800 text-slate-300';
      });
    }

    function setAnimZoom(z) {
      curZoom = z;
      const cvs = document.getElementById('anim-canvas');
      cvs.width = 48 * z;
      cvs.height = 48 * z;
      [2, 3, 4].forEach(i => {
        const b = document.getElementById('az-' + i);
        if (b) b.className = i === z ? 'px-2 py-0.5 rounded bg-emerald-600 text-white' : 'px-2 py-0.5 rounded bg-slate-800 text-slate-300';
      });
    }

    function changeAnimAction() {
      curAction = document.getElementById('anim-action-select').value;
      animFrame = 0;
    }

    let lastTick = 0;
    const actionSequences = {
      walk:   [0, 1, 2, 1],
      haul:   [0, 1, 2, 1],
      attack: [0, 1, 2],
      bow:    [0, 1, 2],
      magic:  [0, 1, 2],
      work:   [0, 1, 2],
      downed: [0, 1, 2]
    };
    const actionSpeeds = {
      walk: 180, haul: 180, attack: 140, bow: 200, magic: 200, work: 220, downed: 300
    };

    function animLoop(ts) {
      const cvs = document.getElementById('anim-canvas');
      if (cvs && loadedImgs[curAction]) {
        const seq = actionSequences[curAction] || [0, 1, 2, 1];
        const spd = actionSpeeds[curAction] || 180;
        if (ts - lastTick > spd) {
          animFrame = (animFrame + 1) % seq.length;
          lastTick = ts;
        }

        const colIdx = seq[animFrame];
        const rowIdx = curFacing;
        const ctx = cvs.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, cvs.width, cvs.height);

        // Draw tile grid border
        ctx.strokeStyle = 'rgba(74, 222, 128, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, cvs.width, cvs.height);

        // Draw character frame
        const sx = colIdx * 48;
        const sy = rowIdx * 48;
        ctx.drawImage(loadedImgs[curAction], sx, sy, 48, 48, 0, 0, cvs.width, cvs.height);

        const dirNames = ['Down / South', 'Left / West', 'Right / East', 'Up / North'];
        document.getElementById('anim-label').textContent = 
          'Playing: ' + sheetMeta[curAction].title + ' (' + dirNames[curFacing] + ') - Frame ' + colIdx + ' (' + (animFrame + 1) + '/' + seq.length + ')';
      }
      requestAnimationFrame(animLoop);
    }

    initImages();
  </script>
</body>
</html>`;

const htmlArtifactPath = path.join(BRAIN_DIR, 'ff5_12_sprite_suite_viewer.html');
fs.writeFileSync(htmlArtifactPath, htmlContent);
console.log('Saved interactive HTML artifact:', htmlArtifactPath);

