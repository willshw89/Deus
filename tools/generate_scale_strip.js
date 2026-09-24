#!/usr/bin/env node
'use strict';

/**
 * tools/generate_scale_strip.js
 *
 * Deterministic Scale Strip Generator for Project DEUS (DW.01.03).
 * Renders the authoritative Technical Human / World Scale Strip:
 * `art/reference/DEUS_HUMAN_SCALE_STRIP_V1.png`.
 *
 * Visualizes:
 * - 48x48 world tile grid outline
 * - Canonical Adult Human yardstick (~42 px)
 * - Micro-vegetation (short grass, tall grass)
 * - Shrubs (small bush, medium bush)
 * - Stone (medium rock, large boulder)
 * - Architecture/Furniture (doorway, bed, chair, table, chest)
 * - Trees (standard oak, standard birch, standard pine, large accent, hero tree)
 *
 * Aligned to a single continuous baseline (y=180) with exact tile grid rulers
 * and native 1:1 pixel rendering.
 */

const fs = require('fs');
const path = require('path');
const { writePNG } = require('./png_util');
const { loadRegistry } = require('./scale_resolver');

const OUTPUT_PATH = path.resolve(__dirname, '..', 'art', 'reference', 'DEUS_HUMAN_SCALE_STRIP_V1.png');

// Canvas dimensions
const W = 1340;
const H = 224;
const BASELINE_Y = 180;

// Buffer allocation
const buf = Buffer.alloc(W * H * 4, 0);

// Basic drawing primitives
function setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const idx = (y * W + x) * 4;
    buf[idx] = r;
    buf[idx + 1] = g;
    buf[idx + 2] = b;
    buf[idx + 3] = a;
}

function fillRect(x, y, w, h, r, g, b, a = 255) {
    for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
            setPixel(x + dx, y + dy, r, g, b, a);
        }
    }
}

function drawHLine(x1, x2, y, r, g, b, a = 255, dash = 0) {
    for (let x = x1; x <= x2; x++) {
        if (dash > 0 && Math.floor(x / dash) % 2 === 1) continue;
        setPixel(x, y, r, g, b, a);
    }
}

function drawVLine(x, y1, y2, r, g, b, a = 255, dash = 0) {
    for (let y = y1; y <= y2; y++) {
        if (dash > 0 && Math.floor(y / dash) % 2 === 1) continue;
        setPixel(x, y, r, g, b, a);
    }
}

// 3x5 Pixel Font for crisp 1:1 labels
const FONT_3X5 = {
    'A': [0b010, 0b101, 0b111, 0b101, 0b101],
    'B': [0b110, 0b101, 0b110, 0b101, 0b110],
    'C': [0b011, 0b100, 0b100, 0b100, 0b011],
    'D': [0b110, 0b101, 0b101, 0b101, 0b110],
    'E': [0b111, 0b100, 0b110, 0b100, 0b111],
    'F': [0b111, 0b100, 0b110, 0b100, 0b100],
    'G': [0b011, 0b100, 0b101, 0b101, 0b011],
    'H': [0b101, 0b101, 0b111, 0b101, 0b101],
    'I': [0b111, 0b010, 0b010, 0b010, 0b111],
    'J': [0b001, 0b001, 0b001, 0b101, 0b010],
    'K': [0b101, 0b110, 0b100, 0b110, 0b101],
    'L': [0b100, 0b100, 0b100, 0b100, 0b111],
    'M': [0b101, 0b111, 0b101, 0b101, 0b101],
    'N': [0b110, 0b101, 0b101, 0b101, 0b101],
    'O': [0b010, 0b101, 0b101, 0b101, 0b010],
    'P': [0b110, 0b101, 0b110, 0b100, 0b100],
    'Q': [0b010, 0b101, 0b101, 0b110, 0b011],
    'R': [0b110, 0b101, 0b110, 0b101, 0b101],
    'S': [0b011, 0b100, 0b010, 0b001, 0b110],
    'T': [0b111, 0b010, 0b010, 0b010, 0b010],
    'U': [0b101, 0b101, 0b101, 0b101, 0b010],
    'V': [0b101, 0b101, 0b101, 0b101, 0b010],
    'W': [0b101, 0b101, 0b101, 0b111, 0b101],
    'X': [0b101, 0b101, 0b010, 0b101, 0b101],
    'Y': [0b101, 0b101, 0b010, 0b010, 0b010],
    'Z': [0b111, 0b001, 0b010, 0b100, 0b111],
    '0': [0b010, 0b101, 0b101, 0b101, 0b010],
    '1': [0b010, 0b110, 0b010, 0b010, 0b111],
    '2': [0b110, 0b001, 0b010, 0b100, 0b111],
    '3': [0b110, 0b001, 0b010, 0b001, 0b110],
    '4': [0b101, 0b101, 0b111, 0b001, 0b001],
    '5': [0b111, 0b100, 0b110, 0b001, 0b110],
    '6': [0b011, 0b100, 0b110, 0b101, 0b010],
    '7': [0b111, 0b001, 0b010, 0b010, 0b010],
    '8': [0b010, 0b101, 0b010, 0b101, 0b010],
    '9': [0b010, 0b101, 0b011, 0b001, 0b110],
    ' ': [0b000, 0b000, 0b000, 0b000, 0b000],
    ':': [0b000, 0b010, 0b000, 0b010, 0b000],
    '-': [0b000, 0b000, 0b111, 0b000, 0b000],
    '~': [0b000, 0b101, 0b010, 0b000, 0b000],
    '/': [0b001, 0b001, 0b010, 0b100, 0b100],
    '[': [0b011, 0b010, 0b010, 0b010, 0b011],
    ']': [0b110, 0b010, 0b010, 0b010, 0b110],
    '(': [0b010, 0b100, 0b100, 0b100, 0b010],
    ')': [0b010, 0b001, 0b001, 0b001, 0b010],
    '.': [0b000, 0b000, 0b000, 0b000, 0b010],
    'x': [0b000, 0b101, 0b010, 0b101, 0b000],
    'p': [0b000, 0b110, 0b101, 0b110, 0b100]
};

function drawText(str, startX, startY, r, g, b, a = 255) {
    let curX = startX;
    for (let i = 0; i < str.length; i++) {
        const ch = str[i].toUpperCase();
        const glyph = FONT_3X5[ch] || FONT_3X5[' '];
        for (let row = 0; row < 5; row++) {
            const bits = glyph[row];
            if (bits & 0b100) setPixel(curX, startY + row, r, g, b, a);
            if (bits & 0b010) setPixel(curX + 1, startY + row, r, g, b, a);
            if (bits & 0b001) setPixel(curX + 2, startY + row, r, g, b, a);
        }
        curX += 4;
    }
}

// Background
fillRect(0, 0, W, H, 20, 22, 30); // Dark slate parchment

// Header Banner
drawText('DEUS TECHNICAL HUMAN / WORLD SCALE STRIP (DW.01.03)', 15, 8, 230, 215, 180);
drawText('OFFICIAL 1.00x CAMERA | NATIVE 1:1 RESOLUTION | 48x48 TILE GRID | CANONICAL HUMAN = 42 PX', 15, 16, 140, 150, 170);

// Measurement Rulers
const RULER_X = 92;
drawVLine(RULER_X, 20, BASELINE_Y, 90, 95, 110);

// Height grid lines
const heights = [
    { px: 0, label: '0 PX', col: 'left' },
    { px: 12, label: '12 PX', col: 'right' },
    { px: 24, label: '24 PX', col: 'left' },
    { px: 36, label: '36 PX', col: 'right' },
    { px: 42, label: '42P HUMAN', highlight: true, col: 'right' },
    { px: 48, label: '48P [1T]', grid: true, col: 'left' },
    { px: 58, label: '58P DOOR', col: 'right' },
    { px: 84, label: '84P OAK', highlight: true, col: 'right' },
    { px: 96, label: '96P [2T]', grid: true, col: 'left' },
    { px: 105, label: '105P ACC', col: 'right' },
    { px: 140, label: '140P HERO', highlight: true, col: 'right' },
    { px: 144, label: '144P [3T]', grid: true, col: 'left' }
];

for (const h of heights) {
    const y = BASELINE_Y - h.px;
    if (y < 20) continue;

    // Tick
    drawHLine(RULER_X - 4, RULER_X, y, 160, 165, 180);

    // Guide line across the entire strip
    if (h.grid) {
        drawHLine(RULER_X + 1, W - 15, y, 65, 75, 95, 255, 4); // Tile boundary
    } else if (h.highlight) {
        drawHLine(RULER_X + 1, W - 15, y, 170, 130, 50, 255, 6); // Golden reference line
    } else {
        drawHLine(RULER_X + 1, W - 15, y, 35, 40, 50, 255, 8); // Minor tick guide
    }

    // Ruler Label (left col: x=8, right col: x=46)
    const lx = h.col === 'left' ? 8 : 44;
    drawText(h.label, lx, y - 2, h.highlight ? 230 : 130, h.highlight ? 180 : 140, h.highlight ? 80 : 150);
}

// Ground Baseline
drawHLine(10, W - 10, BASELINE_Y, 150, 135, 100);
drawHLine(10, W - 10, BASELINE_Y + 1, 100, 90, 65);
fillRect(10, BASELINE_Y + 2, W - 20, 4, 35, 45, 30); // Sub-baseline loam bed

// Item Layout definitions
const items = [
    {
        name: '48x48 TILE',
        hTarget: 48,
        w: 48,
        render: (cx, by) => {
            // Draw 48x48 grid box
            const x0 = cx - 24, y0 = by - 48;
            for (let dy = 0; dy < 48; dy++) {
                for (let dx = 0; dx < 48; dx++) {
                    const isBorder = dx === 0 || dx === 47 || dy === 0 || dy === 47;
                    const isDiag = dx === dy || dx === (47 - dy);
                    if (isBorder) setPixel(x0 + dx, y0 + dy, 70, 160, 190);
                    else if (isDiag) setPixel(x0 + dx, y0 + dy, 35, 75, 95);
                    else if ((dx + dy) % 4 === 0) setPixel(x0 + dx, y0 + dy, 25, 45, 60);
                }
            }
        }
    },
    {
        name: 'HUMAN',
        hTarget: 42,
        w: 18,
        render: (cx, by) => {
            // Canonical Human ~42 px silhouette
            const x0 = cx - 9, y0 = by - 42;
            // Head (y0 to y0+12)
            fillRect(x0 + 4, y0, 10, 11, 220, 185, 140);
            fillRect(x0 + 3, y0, 12, 4, 110, 70, 40); // Brown hair
            // Eyes
            setPixel(x0 + 6, y0 + 5, 20, 20, 20);
            setPixel(x0 + 11, y0 + 5, 20, 20, 20);
            // Torso (y0+12 to y0+26)
            fillRect(x0 + 2, y0 + 12, 14, 14, 55, 105, 170); // Blue tunic
            fillRect(x0 + 2, y0 + 24, 14, 2, 130, 85, 40); // Belt
            // Legs & Boots (y0+26 to y0+42)
            fillRect(x0 + 3, y0 + 26, 5, 16, 75, 55, 35);
            fillRect(x0 + 10, y0 + 26, 5, 16, 75, 55, 35);
        }
    },
    {
        name: 'SHORT GRASS',
        hTarget: 12,
        w: 18,
        render: (cx, by) => {
            for (let i = 0; i < 5; i++) {
                const ox = cx - 8 + i * 4;
                const gh = 8 + (i % 3) * 2;
                drawVLine(ox, by - gh, by, 90, 160, 60);
                setPixel(ox + 1, by - gh + 2, 120, 190, 80);
            }
        }
    },
    {
        name: 'TALL GRASS',
        hTarget: 28,
        w: 22,
        render: (cx, by) => {
            for (let i = 0; i < 6; i++) {
                const ox = cx - 10 + i * 4;
                const gh = 20 + ((i * 7) % 9);
                drawVLine(ox, by - gh, by, 75, 140, 50);
                drawVLine(ox + 1, by - gh + 4, by, 100, 170, 70);
            }
        }
    },
    {
        name: 'SMALL BUSH',
        hTarget: 18,
        w: 26,
        render: (cx, by) => {
            const x0 = cx - 13, y0 = by - 18;
            for (let dy = 0; dy < 18; dy++) {
                for (let dx = 0; dx < 26; dx++) {
                    if (Math.hypot((dx - 13) * 0.8, dy - 10) <= 9) {
                        const isLight = (dx + dy) % 3 === 0;
                        setPixel(x0 + dx, y0 + dy, isLight ? 90 : 65, isLight ? 150 : 115, isLight ? 50 : 35);
                    }
                }
            }
        }
    },
    {
        name: 'MED BUSH',
        hTarget: 26,
        w: 36,
        render: (cx, by) => {
            const x0 = cx - 18, y0 = by - 26;
            for (let dy = 0; dy < 26; dy++) {
                for (let dx = 0; dx < 36; dx++) {
                    if (Math.hypot((dx - 18) * 0.75, dy - 15) <= 13) {
                        const isLight = (dx * 2 + dy) % 4 === 0;
                        setPixel(x0 + dx, y0 + dy, isLight ? 100 : 70, isLight ? 160 : 120, isLight ? 55 : 40);
                    }
                }
            }
        }
    },
    {
        name: 'MED ROCK',
        hTarget: 22,
        w: 28,
        render: (cx, by) => {
            const x0 = cx - 14, y0 = by - 22;
            for (let dy = 0; dy < 22; dy++) {
                for (let dx = 0; dx < 28; dx++) {
                    if (Math.hypot((dx - 14) * 0.9, dy - 13) <= 10) {
                        const c = 90 + ((dx * 5 + dy * 3) % 25);
                        setPixel(x0 + dx, y0 + dy, c, c, c + 5);
                    }
                }
            }
        }
    },
    {
        name: 'BOULDER',
        hTarget: 38,
        w: 42,
        render: (cx, by) => {
            const x0 = cx - 21, y0 = by - 38;
            for (let dy = 0; dy < 38; dy++) {
                for (let dx = 0; dx < 42; dx++) {
                    if (Math.hypot((dx - 21) * 0.95, dy - 21) <= 18) {
                        const c = 80 + ((dx * 7 + dy * 11) % 35);
                        setPixel(x0 + dx, y0 + dy, c, c + 2, c + 8);
                    }
                }
            }
        }
    },
    {
        name: 'DOORWAY',
        hTarget: 58,
        w: 44,
        render: (cx, by) => {
            const x0 = cx - 22, y0 = by - 58;
            // Stone jambs (44 wide, 58 tall)
            fillRect(x0, y0, 6, 58, 100, 105, 115);
            fillRect(x0 + 38, y0, 6, 58, 100, 105, 115);
            // Lintel
            fillRect(x0, y0, 44, 7, 120, 125, 135);
            // Wooden door opening/leaf
            fillRect(x0 + 6, y0 + 7, 32, 51, 140, 95, 50);
            // Iron studs
            for (let r = 0; r < 3; r++) {
                setPixel(x0 + 12, y0 + 18 + r * 14, 40, 40, 45);
                setPixel(x0 + 32, y0 + 18 + r * 14, 40, 40, 45);
            }
        }
    },
    {
        name: 'BED',
        hTarget: 58,
        w: 28,
        render: (cx, by) => {
            const x0 = cx - 14, y0 = by - 58;
            fillRect(x0, y0, 28, 58, 110, 75, 45); // Wood frame
            fillRect(x0 + 2, y0 + 2, 24, 14, 210, 205, 190); // Pillow
            fillRect(x0 + 2, y0 + 16, 24, 40, 160, 60, 50); // Blanket
        }
    },
    {
        name: 'CHAIR',
        hTarget: 26,
        w: 20,
        render: (cx, by) => {
            const x0 = cx - 10, y0 = by - 26;
            // Backrest
            fillRect(x0 + 2, y0, 16, 12, 130, 90, 50);
            // Seat (y=14 above ground)
            fillRect(x0 + 1, by - 14, 18, 4, 150, 105, 60);
            // Legs
            fillRect(x0 + 2, by - 10, 3, 10, 100, 70, 40);
            fillRect(x0 + 15, by - 10, 3, 10, 100, 70, 40);
        }
    },
    {
        name: 'TABLE',
        hTarget: 24,
        w: 38,
        render: (cx, by) => {
            const x0 = cx - 19, y0 = by - 24;
            // Tabletop (waist height ~22 px)
            fillRect(x0, y0, 38, 6, 150, 105, 60);
            // Legs
            fillRect(x0 + 3, y0 + 6, 4, 18, 110, 75, 45);
            fillRect(x0 + 31, y0 + 6, 4, 18, 110, 75, 45);
        }
    },
    {
        name: 'CHEST',
        hTarget: 20,
        w: 32,
        render: (cx, by) => {
            const x0 = cx - 16, y0 = by - 20;
            fillRect(x0, y0, 32, 20, 130, 85, 45);
            // Iron bands
            fillRect(x0, y0 + 7, 32, 2, 60, 65, 75);
            fillRect(x0 + 6, y0, 2, 20, 60, 65, 75);
            fillRect(x0 + 24, y0, 2, 20, 60, 65, 75);
            // Lock
            fillRect(x0 + 15, y0 + 9, 3, 4, 210, 175, 60);
        }
    },
    {
        name: 'OAK (~84)',
        hTarget: 84,
        w: 68,
        render: (cx, by) => {
            const y0 = by - 84;
            // Trunk
            fillRect(cx - 8, by - 36, 16, 36, 80, 50, 30);
            // Foliage canopy (~68x60)
            for (let dy = 0; dy < 60; dy++) {
                for (let dx = 0; dx < 68; dx++) {
                    if (Math.hypot((dx - 34) * 0.9, dy - 30) <= 28) {
                        const isLight = (dx * 3 + dy * 7) % 4 === 0;
                        setPixel(cx - 34 + dx, y0 + dy, isLight ? 90 : 60, isLight ? 150 : 110, isLight ? 50 : 35);
                    }
                }
            }
        }
    },
    {
        name: 'BIRCH (~88)',
        hTarget: 88,
        w: 56,
        render: (cx, by) => {
            const y0 = by - 88;
            // Slender white trunk
            fillRect(cx - 5, by - 40, 10, 40, 210, 215, 210);
            // Black bark marks
            for (let r = 0; r < 4; r++) setPixel(cx - 3, by - 32 + r * 8, 40, 40, 40);
            // Airy canopy
            for (let dy = 0; dy < 62; dy++) {
                for (let dx = 0; dx < 56; dx++) {
                    if (Math.hypot((dx - 28) * 0.9, dy - 31) <= 26) {
                        const isLight = (dx + dy) % 2 === 0;
                        setPixel(cx - 28 + dx, y0 + dy, isLight ? 120 : 85, isLight ? 175 : 135, isLight ? 70 : 50);
                    }
                }
            }
        }
    },
    {
        name: 'PINE (~92)',
        hTarget: 92,
        w: 52,
        render: (cx, by) => {
            const y0 = by - 92;
            // Trunk
            fillRect(cx - 6, by - 24, 12, 24, 75, 45, 25);
            // Conifer tiers
            for (let dy = 0; dy < 78; dy++) {
                const maxSpread = dy * 0.32;
                for (let dx = -maxSpread; dx <= maxSpread; dx++) {
                    const isLight = (dx + dy) % 3 === 0;
                    setPixel(cx + Math.round(dx), y0 + dy, isLight ? 45 : 30, isLight ? 95 : 70, isLight ? 50 : 35);
                }
            }
        }
    },
    {
        name: 'ACCENT (105)',
        hTarget: 105,
        w: 88,
        render: (cx, by) => {
            const y0 = by - 105;
            // Thick trunk
            fillRect(cx - 11, by - 44, 22, 44, 75, 45, 25);
            // Broad ancient canopy
            for (let dy = 0; dy < 74; dy++) {
                for (let dx = 0; dx < 88; dx++) {
                    if (Math.hypot((dx - 44) * 0.85, dy - 37) <= 36) {
                        const isLight = (dx * 5 + dy * 2) % 4 === 0;
                        setPixel(cx - 44 + dx, y0 + dy, isLight ? 85 : 55, isLight ? 140 : 100, isLight ? 45 : 30);
                    }
                }
            }
        }
    },
    {
        name: 'HERO (~140)',
        hTarget: 140,
        w: 120,
        render: (cx, by) => {
            const y0 = by - 140;
            // Giant trunk
            fillRect(cx - 16, by - 55, 32, 55, 65, 40, 20);
            // Ancient massive canopy
            for (let dy = 0; dy < 98; dy++) {
                for (let dx = 0; dx < 120; dx++) {
                    if (Math.hypot((dx - 60) * 0.85, dy - 49) <= 48) {
                        const isLight = (dx * 3 + dy * 3) % 4 === 0;
                        setPixel(cx - 60 + dx, y0 + dy, isLight ? 80 : 50, isLight ? 130 : 90, isLight ? 40 : 25);
                    }
                }
            }
        }
    }
];

// Layout items horizontally
let curX = 120;
for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const lblLen = item.name.length * 4;
    const colW = Math.max(item.w, lblLen);
    const cx = curX + Math.floor(colW / 2);

    // Render item silhouette
    item.render(cx, BASELINE_Y);

    // Item label under baseline
    const lbl = item.name;
    const lblX = cx - Math.floor(lblLen / 2);
    drawText(lbl, lblX, BASELINE_Y + 8, 220, 210, 180);

    const sub = `${item.hTarget} PX`;
    const subX = cx - Math.floor((sub.length * 4) / 2);
    drawText(sub, subX, BASELINE_Y + 16, 150, 160, 180);

    curX += colW + 18;
}

// Ensure target directory exists
fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

// Encode PNG
writePNG(OUTPUT_PATH, W, H, buf);
console.log(`Generated canonical scale strip at: ${OUTPUT_PATH} (${W}x${H} px)`);
