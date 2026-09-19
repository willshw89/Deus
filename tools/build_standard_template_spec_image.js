#!/usr/bin/env node
'use strict';

/**
 * tools/build_standard_template_spec_image.js
 *
 * Renders the official UF 8-Directional Standard Charset Template specification image.
 * Labels every position across the 18 columns and 8 rows:
 * - 6 Actions (Movement, Melee, Ranged, Magic, Work, Downed/Dead)
 * - 3 Animation Frames per action
 * - 8 Directional Rows (S, SW, W, NW, N, NE, E, SE)
 * - Grid boundaries, coordinate markers, and descriptive headers.
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const BRAIN = 'C:/Users/snewt/.gemini/antigravity/brain/e6a9a54f-2cc6-432e-b7ec-5affda42dd85';

// 5x7 bitmap font
const FONT = {
    'A': [0x1C, 0x22, 0x22, 0x3E, 0x22, 0x22, 0x22],
    'B': [0x3C, 0x22, 0x22, 0x3C, 0x22, 0x22, 0x3C],
    'C': [0x1E, 0x20, 0x20, 0x20, 0x20, 0x20, 0x1E],
    'D': [0x38, 0x24, 0x22, 0x22, 0x22, 0x24, 0x38],
    'E': [0x3E, 0x20, 0x20, 0x3C, 0x20, 0x20, 0x3E],
    'F': [0x3E, 0x20, 0x20, 0x3C, 0x20, 0x20, 0x20],
    'G': [0x1E, 0x20, 0x20, 0x2E, 0x22, 0x22, 0x1E],
    'H': [0x22, 0x22, 0x22, 0x3E, 0x22, 0x22, 0x22],
    'I': [0x1C, 0x08, 0x08, 0x08, 0x08, 0x08, 0x1C],
    'J': [0x06, 0x02, 0x02, 0x02, 0x22, 0x22, 0x1C],
    'K': [0x22, 0x24, 0x28, 0x30, 0x28, 0x24, 0x22],
    'L': [0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x3E],
    'M': [0x22, 0x36, 0x2A, 0x22, 0x22, 0x22, 0x22],
    'N': [0x22, 0x32, 0x2A, 0x26, 0x22, 0x22, 0x22],
    'O': [0x1C, 0x22, 0x22, 0x22, 0x22, 0x22, 0x1C],
    'P': [0x3C, 0x22, 0x22, 0x3C, 0x20, 0x20, 0x20],
    'Q': [0x1C, 0x22, 0x22, 0x22, 0x2A, 0x24, 0x1A],
    'R': [0x3C, 0x22, 0x22, 0x3C, 0x28, 0x24, 0x22],
    'S': [0x1E, 0x20, 0x20, 0x1C, 0x02, 0x02, 0x3C],
    'T': [0x3E, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08],
    'U': [0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x1C],
    'V': [0x22, 0x22, 0x22, 0x22, 0x22, 0x14, 0x08],
    'W': [0x22, 0x22, 0x22, 0x2A, 0x2A, 0x36, 0x22],
    'X': [0x22, 0x22, 0x14, 0x08, 0x14, 0x22, 0x22],
    'Y': [0x22, 0x22, 0x14, 0x08, 0x08, 0x08, 0x08],
    'Z': [0x3E, 0x02, 0x04, 0x08, 0x10, 0x20, 0x3E],
    '0': [0x1C, 0x26, 0x2A, 0x32, 0x22, 0x22, 0x1C],
    '1': [0x08, 0x18, 0x08, 0x08, 0x08, 0x08, 0x1C],
    '2': [0x1C, 0x22, 0x02, 0x0C, 0x30, 0x20, 0x3E],
    '3': [0x1C, 0x22, 0x02, 0x0C, 0x02, 0x22, 0x1C],
    '4': [0x04, 0x0C, 0x14, 0x24, 0x3E, 0x04, 0x04],
    '5': [0x3E, 0x20, 0x3C, 0x02, 0x02, 0x22, 0x1C],
    '6': [0x1C, 0x20, 0x20, 0x3C, 0x22, 0x22, 0x1C],
    '7': [0x3E, 0x02, 0x04, 0x08, 0x10, 0x10, 0x10],
    '8': [0x1C, 0x22, 0x22, 0x1C, 0x22, 0x22, 0x1C],
    '9': [0x1C, 0x22, 0x22, 0x1E, 0x02, 0x02, 0x1C],
    '-': [0x00, 0x00, 0x00, 0x3E, 0x00, 0x00, 0x00],
    '/': [0x02, 0x04, 0x08, 0x10, 0x20, 0x00, 0x00],
    ':': [0x00, 0x08, 0x00, 0x00, 0x08, 0x00, 0x00],
    '.': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08],
    '(': [0x08, 0x10, 0x20, 0x20, 0x20, 0x10, 0x08],
    ')': [0x20, 0x10, 0x08, 0x08, 0x08, 0x10, 0x20],
    ' ': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
};

function drawText(buf, w, h, x0, y0, str, col, scale = 1) {
    str = String(str).toUpperCase();
    let cx = x0;
    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        const glyph = FONT[ch] || FONT[' '];
        for (let row = 0; row < 7; row++) {
            const bits = glyph[row];
            for (let bit = 0; bit < 6; bit++) {
                if ((bits >> (5 - bit)) & 1) {
                    for (let sy = 0; sy < scale; sy++) {
                        for (let sx = 0; sx < scale; sx++) {
                            const px = cx + bit * scale + sx;
                            const py = y0 + row * scale + sy;
                            if (px >= 0 && px < w && py >= 0 && py < h) {
                                const idx = (py * w + px) * 4;
                                buf[idx] = col[0]; buf[idx + 1] = col[1]; buf[idx + 2] = col[2]; buf[idx + 3] = 255;
                            }
                        }
                    }
                }
            }
        }
        cx += 7 * scale;
    }
}

// Load existing elf charsets to populate template
const charsets = [
    { title: 'MOVEMENT', sub: ['STEP L', 'STAND', 'STEP R'], file: '$UF_Elf_8D.png' },
    { title: 'MELEE',    sub: ['WINDUP', 'STRIKE', 'RECOVER'], file: '$UF_Elf_Attack_8D.png' },
    { title: 'RANGED',   sub: ['AIM', 'DRAW', 'RELEASE'], file: '$UF_Elf_Male_Bow_8D.png' },
    { title: 'MAGIC',    sub: ['READY', 'GLOW', 'THRUST'], file: '$UF_Elf_Cast_Staff_8D.png' },
    { title: 'WORK',     sub: ['REACH', 'WORK', 'GATHER'], file: '$UF_Elf_Work_8D.png' },
    { title: 'DOWNED',   sub: ['HURT', 'COLLAPSE', 'SLEEP/DEAD'], file: '$UF_Elf_Dead_8D.png' }
];

const loaded = charsets.map(c => {
    const p = path.join(CHAR_DIR, c.file);
    return { ...c, img: decodePNG(fs.readFileSync(p), c.file) };
});

const ROW_LABELS = [
    'ROW 0: SOUTH (FACING 2)',
    'ROW 1: SOUTH-WEST (FACING 1)',
    'ROW 2: WEST (FACING 4)',
    'ROW 3: NORTH-WEST (FACING 7)',
    'ROW 4: NORTH (FACING 8)',
    'ROW 5: NORTH-EAST (FACING 9)',
    'ROW 6: EAST (FACING 6)',
    'ROW 7: SOUTH-EAST (FACING 3)'
];

// Layout geometry (at 2x sprite scale):
// Left label column: 220 px
// 6 action sections: each 3 cols * (48*2 = 96 px) + separator 12 px = 300 px
// Total W: 220 + 6 * 300 = 2020 px
// Header: 100 px
// 8 rows * (48*2 = 96 px) = 768 px
// Footer: 40 px
// Total H: 100 + 768 + 40 = 908 px

const LEFT_MARGIN = 220;
const SECTION_PAD = 12;
const CELL_SIZE = 96; // 48 * 2
const SEC_W = 3 * CELL_SIZE; // 288 px
const TOTAL_W = LEFT_MARGIN + 6 * (SEC_W + SECTION_PAD) + 20;
const HEADER_H = 110;
const ROW_H = 96;
const TOTAL_H = HEADER_H + 8 * ROW_H + 40;

const buf = Buffer.alloc(TOTAL_W * TOTAL_H * 4);

// Fill background: dark slate #131722
for (let i = 0; i < buf.length; i += 4) {
    buf[i] = 19; buf[i + 1] = 23; buf[i + 2] = 34; buf[i + 3] = 255;
}

// Title
drawText(buf, TOTAL_W, TOTAL_H, 20, 20, 'UF 8-DIRECTIONAL STANDARD CHARSET SPECIFICATION (ALL FACTIONS)', [255, 215, 0], 2);
drawText(buf, TOTAL_W, TOTAL_H, 20, 45, '18 COLUMNS (6 ACTIONS X 3 FRAMES) X 8 DIRECTIONAL ROWS (144X384 PX PER CHARSET)', [160, 180, 205], 1);

// Draw Action Headers & Sub-headers
loaded.forEach((sec, sIdx) => {
    const sx = LEFT_MARGIN + sIdx * (SEC_W + SECTION_PAD);
    // Section title
    drawText(buf, TOTAL_W, TOTAL_H, sx + 10, 70, `SET ${sIdx + 1}: ${sec.title}`, [100, 220, 255], 2);
    // Sub frames
    sec.sub.forEach((subName, fIdx) => {
        const fx = sx + fIdx * CELL_SIZE;
        drawText(buf, TOTAL_W, TOTAL_H, fx + 10, 95, `[C${sIdx * 3 + fIdx}] ${subName}`, [200, 200, 200], 1);
    });
});

// Draw Row Labels and Sprites
for (let r = 0; r < 8; r++) {
    const ry = HEADER_H + r * ROW_H;

    // Row label on the left
    drawText(buf, TOTAL_W, TOTAL_H, 15, ry + 40, ROW_LABELS[r], [255, 230, 150], 1);

    // Draw horizontal grid line
    for (let x = 0; x < TOTAL_W; x++) {
        const idx = (ry * TOTAL_W + x) * 4;
        buf[idx] = 40; buf[idx + 1] = 45; buf[idx + 2] = 65; buf[idx + 3] = 255;
    }

    // Draw sprites for each section
    loaded.forEach((sec, sIdx) => {
        const sx = LEFT_MARGIN + sIdx * (SEC_W + SECTION_PAD);

        // Vertical separator before section
        for (let y = 0; y < ROW_H; y++) {
            const sepIdx = ((ry + y) * TOTAL_W + sx - 6) * 4;
            buf[sepIdx] = 60; buf[sepIdx + 1] = 70; buf[sepIdx + 2] = 95; buf[sepIdx + 3] = 255;
        }

        // Draw 3 frames
        for (let f = 0; f < 3; f++) {
            const fx = sx + f * CELL_SIZE;

            // Draw sprite (scaled 2x from 48x48)
            for (let py = 0; py < 48; py++) {
                for (let px = 0; px < 48; px++) {
                    const srcX = f * 48 + px;
                    const srcY = r * 48 + py;
                    const sIdx = (srcY * 144 + srcX) * 4;
                    if (sec.img.data[sIdx + 3] === 0) continue;

                    for (let dy = 0; dy < 2; dy++) {
                        for (let dx = 0; dx < 2; dx++) {
                            const tx = fx + px * 2 + dx;
                            const ty = ry + py * 2 + dy;
                            if (tx >= 0 && tx < TOTAL_W && ty >= 0 && ty < TOTAL_H) {
                                const dIdx = (ty * TOTAL_W + tx) * 4;
                                buf[dIdx]     = sec.img.data[sIdx];
                                buf[dIdx + 1] = sec.img.data[sIdx + 1];
                                buf[dIdx + 2] = sec.img.data[sIdx + 2];
                                buf[dIdx + 3] = 255;
                            }
                        }
                    }
                }
            }

            // Cell boundary line
            for (let y = 0; y < ROW_H; y++) {
                const bIdx = ((ry + y) * TOTAL_W + fx) * 4;
                buf[bIdx] = 30; buf[bIdx + 1] = 35; buf[bIdx + 2] = 50; buf[bIdx + 3] = 255;
            }
        }
    });
}

// Save output
const outPath = path.join(BRAIN, 'standard_8d_charset_template_spec.png');
writePNG(outPath, TOTAL_W, TOTAL_H, buf);
console.log(`Saved specification template to: ${outPath}`);

// Also save directly into docs/design/
const docsDir = path.join(ROOT, 'docs', 'design');
if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
writePNG(path.join(docsDir, 'STANDARD_8D_CHARSET_TEMPLATE.png'), TOTAL_W, TOTAL_H, buf);
console.log('Saved docs/design/STANDARD_8D_CHARSET_TEMPLATE.png');
