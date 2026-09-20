'use strict';

const fs = require('fs');
const path = require('path');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');
const BRAIN_DIR = 'C:/Users/snewt/.gemini/antigravity/brain/e6a9a54f-2cc6-432e-b7ec-5affda42dd85';

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
const H = 940;
const canvas = Buffer.alloc(W * H * 4);

// Background
for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
        const o = (y * W + x) * 4;
        canvas[o] = 13; canvas[o + 1] = 16; canvas[o + 2] = 22; canvas[o + 3] = 255;
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
drawText(24, 16, "FIVE VERTICAL LAYERS ARCHITECTURE & PALETTE GUIDELINES (VISION V117)", [255, 235, 160], 2);
drawText(24, 42, "Z-2 (DEEP) | Z-1 (SUBTERRANEAN) | Z=0 (OVERLAND) | Z+1 & Z+2 (BUILT UP / CLIFFS & MOUNTAINS)", [140, 190, 230], 1);

// ----------------------------------------------------------------------------
// 2. The 5 Vertical Layers Stack
// ----------------------------------------------------------------------------
const layers = [
    {
        z: "+2",
        name: "HIGH ELEVATED LAYER",
        tag: "ONLY BUILT UP OR ALPINE MOUNTAINS",
        tagColor: [140, 200, 255],
        bgRGB: [22, 28, 42],
        borderRGB: [70, 110, 160],
        swatches: [
            { name: "OPEN AIR", rgb: [111, 143, 184] },
            { name: "ALPINE PEAKS", rgb: [220, 232, 245] },
            { name: "HIGH STONE", rgb: [100, 115, 135] },
            { name: "ROOF SHINGLES", rgb: [120, 75, 45] },
            { name: "BATTLEMENTS", rgb: [60, 70, 85] }
        ],
        desc: "ONLY built up (watchtower tops, third-story parapets, high roofs) OR high alpine mountain peaks and jagged ridges.",
        rules: "Default is calm open air sky haze (opacity 50%). Never flat open plains. Colonists reach via stairs/ladders."
    },
    {
        z: "+1",
        name: "FIRST ELEVATED LAYER",
        tag: "ONLY BUILT UP OR CLIFFS / PLATEAUS",
        tagColor: [255, 200, 120],
        bgRGB: [28, 25, 22],
        borderRGB: [160, 120, 60],
        swatches: [
            { name: "TIMBER PLANK", rgb: [142, 91, 50] },
            { name: "MASONRY STONE", rgb: [154, 158, 166] },
            { name: "CLIFF ROCK", rgb: [90, 98, 112] },
            { name: "MESA TOP", rgb: [165, 125, 80] },
            { name: "OPEN AIR", rgb: [111, 143, 184] }
        ],
        desc: "ONLY built up (second-story rooms, roofs, wooden walkways, stone decks, watchtower bases) OR natural cliffs, plateaus, and foothills.",
        rules: "Default is open air sky. Built floors feature visible thickness drop strips along south edge. Cliffs connect down to Z=0."
    },
    {
        z: "0",
        name: "OVERLAND BIOMES (GROUND LEVEL)",
        tag: "FULL SURFACE OVERLAND BIOMES",
        tagColor: [100, 255, 140],
        bgRGB: [18, 30, 20],
        borderRGB: [50, 160, 80],
        swatches: [
            { name: "MEADOW GREEN", rgb: [77, 120, 48] },
            { name: "FOREST SOIL", rgb: [92, 64, 40] },
            { name: "FRESH WATER", rgb: [60, 114, 160] },
            { name: "DESERT SAND", rgb: [210, 175, 120] },
            { name: "TUNDRA SNOW", rgb: [225, 235, 245] }
        ],
        desc: "Full natural surface biomes (meadows, mixed forests, taiga/snow, arid deserts, wetlands/swamps, coastlines).",
        rules: "Sunlight, weather, wind cycles, wildlife herds, flora, trees, settler starting camps, natural cave entrances to Z-1."
    },
    {
        z: "-1",
        name: "THE SUBTERRANEAN LAYER",
        tag: "BROWNS, GREYS, SLATE, PACKED EARTH",
        tagColor: [220, 180, 140],
        bgRGB: [28, 22, 18],
        borderRGB: [140, 100, 70],
        swatches: [
            { name: "CAVE SLATE", rgb: [88, 92, 102] },
            { name: "PACKED SOIL", rgb: [107, 79, 58] },
            { name: "IRON VEIN", rgb: [184, 88, 56] },
            { name: "COPPER VEIN", rgb: [80, 190, 140] },
            { name: "GOLD VEIN", rgb: [235, 200, 64] }
        ],
        desc: "Browns, greys, slate, packed earth, rough-hewn stone, dark shale. Mineable ore veins (iron, copper, gold, coal).",
        rules: "Mostly solid earth/rock to excavate, with pockets of habitable space. Early dwarven guaranteed settlements. Ambient cave darkness."
    },
    {
        z: "-2",
        name: "THE DEEP LAYER",
        tag: "BLACKS, DARK BLUES, GLOWIES, PURPLES",
        tagColor: [180, 120, 255],
        bgRGB: [16, 12, 28],
        borderRGB: [110, 60, 180],
        swatches: [
            { name: "ABYSS BLACK", rgb: [14, 18, 26] },
            { name: "DEEP BLUE", rgb: [26, 40, 68] },
            { name: "GLOW MOSS", rgb: [61, 245, 168] },
            { name: "AETHER PURPLE", rgb: [95, 42, 135] },
            { name: "CRYSTAL SPIRE", rgb: [215, 60, 225] }
        ],
        desc: "Blacks, dark blues, glowies (bioluminescent flora, radiant crystal clusters, luminescent cave moss, aether fissures), dark purples.",
        rules: "Perpetual deep abyss, lit exclusively by radiant glowing minerals and flora. Primordial subterranean horrors and second dwarven camp."
    }
];

const startY = 85;
const cardH = 155;
const cardGap = 12;

layers.forEach((l, idx) => {
    const cardY = startY + idx * (cardH + cardGap);
    const cardX = 24;
    const cardW = W - 48;

    // Card background
    fillRect(cardX, cardY, cardW, cardH, l.bgRGB[0], l.bgRGB[1], l.bgRGB[2]);
    drawRect(cardX, cardY, cardW, cardH, l.borderRGB[0], l.borderRGB[1], l.borderRGB[2]);

    // Z-level badge on left
    fillRect(cardX + 16, cardY + 16, 56, 44, 10, 14, 20);
    drawRect(cardX + 16, cardY + 16, 56, 44, l.tagColor[0], l.tagColor[1], l.tagColor[2]);
    const zLabel = l.z === "0" ? "Z=0" : "Z" + l.z;
    drawText(cardX + 22, cardY + 28, zLabel, [255, 255, 255], 2);

    // Title & Tag
    drawText(cardX + 86, cardY + 18, l.name, [255, 255, 255], 2);
    const tagLen = l.tag.length * 8 + 16;
    fillRect(cardX + 86, cardY + 40, tagLen, 16, 12, 16, 24);
    drawRect(cardX + 86, cardY + 40, tagLen, 16, l.tagColor[0], l.tagColor[1], l.tagColor[2]);
    drawText(cardX + 94, cardY + 44, l.tag, l.tagColor, 1);

    // Swatches on right side
    const swatchStartX = cardX + cardW - 460;
    const swatchY = cardY + 16;
    drawText(swatchStartX, swatchY, "PALETTE & COLOR RAMP:", [160, 180, 205], 1);

    l.swatches.forEach((sw, sIdx) => {
        const sx = swatchStartX + sIdx * 88;
        const sy = swatchY + 16;
        fillRect(sx, sy, 80, 28, sw.rgb[0], sw.rgb[1], sw.rgb[2]);
        drawRect(sx, sy, 80, 28, 255, 255, 255, 100);
        drawText(sx + 4, sy + 32, sw.name, [200, 210, 225], 1);
    });

    // Description text
    drawText(cardX + 24, cardY + 75, "ENVIRONMENT: " + l.desc, [240, 240, 250], 1);
    drawText(cardX + 24, cardY + 98, "RULES & ROLE: " + l.rules, [180, 200, 220], 1);

    // Progress/separator indicator
    drawRect(cardX + 16, cardY + cardH - 24, cardW - 32, 1, l.borderRGB[0], l.borderRGB[1], l.borderRGB[2], 80);
    drawText(cardX + 24, cardY + cardH - 18, "CONCURRENT 5-MAP SIMULATION: PERSISTENT 256x256 LEVEL WITH REAL-TIME AUTONOMOUS LIFE", [140, 160, 180], 1);
});

// Footer
drawText(36, H - 20, "CODIFIED IN DOCS/VISION.MD (V117), DOCS/ART_STANDARD.MD (SECTION 8), AND DOCS/HANDOFFS/HANDOFF_VERTICAL.MD", [160, 240, 190], 1);

const outPath = path.join(REVIEW_DIR, 'five_layer_vertical_world_guidelines.png');
fs.writeFileSync(outPath, writePNG(canvas, W, H));
console.log('Saved vertical layer guidelines graphic:', outPath);

fs.copyFileSync(outPath, path.join(BRAIN_DIR, 'five_layer_vertical_world_guidelines.png'));
console.log('Copied to brain artifacts.');
