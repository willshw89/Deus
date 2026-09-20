#!/usr/bin/env node
'use strict';

/**
 * tools/build_creator_review_board.js
 *
 * Renders a high-resolution 4x magnified Creator Review Board for fine-grained
 * inspection of all 6 actions across all 8 directions.
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');
const BRAIN_DIR = 'C:/Users/snewt/.gemini/antigravity/brain/e6a9a54f-2cc6-432e-b7ec-5affda42dd85';

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
    '[': [0x1E, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1E],
    ']': [0x3C, 0x04, 0x04, 0x04, 0x04, 0x04, 0x3C],
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

const actionSheets = [
    { title: 'STAGE 1: MOVEMENT', sub: ['STEP L', 'STAND', 'STEP R'], file: '$UF_Elf_8D.png' },
    { title: 'STAGE 2: MELEE ATTACK', sub: ['WINDUP', 'STRIKE', 'RECOVER'], file: '$UF_Elf_Attack_8D.png' },
    { title: 'STAGE 3: RANGED BOW', sub: ['AIM', 'DRAW', 'RELEASE'], file: '$UF_Elf_Bow_8D.png' },
    { title: 'STAGE 4: MAGIC CAST', sub: ['READY', 'GLOW', 'THRUST'], file: '$UF_Elf_Magic_8D.png' },
    { title: 'STAGE 5: WORK / CRAFT', sub: ['REACH', 'WORK', 'GATHER'], file: '$UF_Elf_Work_8D.png' },
    { title: 'STAGE 6: DOWNED / DEAD', sub: ['HURT', 'FALL', 'DEAD/REST'], file: '$UF_Elf_Dead_8D.png' }
];

const loaded = actionSheets.map(s => {
    const p = path.join(CHAR_DIR, s.file);
    return { ...s, img: decodePNG(fs.readFileSync(p), s.file) };
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

// Scale factor: 2x (96x96 px per sprite cell)
const CELL_SIZE = 96;
const SEC_W = 3 * CELL_SIZE; // 288 px
const SECTION_PAD = 12;
const LEFT_MARGIN = 220;
const HEADER_H = 110;
const ROW_H = 96;
const TOTAL_W = LEFT_MARGIN + 6 * (SEC_W + SECTION_PAD) + 20;
const TOTAL_H = HEADER_H + 8 * ROW_H + 40;

function renderBoard(title, subtitle) {
    const boardBuf = Buffer.alloc(TOTAL_W * TOTAL_H * 4);

    // Background: deep dark navy #10141e
    for (let i = 0; i < boardBuf.length; i += 4) {
        boardBuf[i] = 16; boardBuf[i + 1] = 20; boardBuf[i + 2] = 30; boardBuf[i + 3] = 255;
    }

    // Title & Subtitle
    drawText(boardBuf, TOTAL_W, TOTAL_H, 20, 20, title, [255, 215, 0], 2);
    drawText(boardBuf, TOTAL_W, TOTAL_H, 20, 48, subtitle, [160, 180, 205], 1);

    // Section Headers
    loaded.forEach((sec, sIdx) => {
        const sx = LEFT_MARGIN + sIdx * (SEC_W + SECTION_PAD);
        drawText(boardBuf, TOTAL_W, TOTAL_H, sx + 6, 70, sec.title, [110, 220, 255], 1);
        sec.sub.forEach((subName, fIdx) => {
            const fx = sx + fIdx * CELL_SIZE;
            drawText(boardBuf, TOTAL_W, TOTAL_H, fx + 6, 92, `[C${sIdx * 3 + fIdx}] ${subName}`, [200, 200, 200], 1);
        });
    });

    // Render Rows & Cells
    for (let r = 0; r < 8; r++) {
        const ry = HEADER_H + r * ROW_H;

        // Row label
        drawText(boardBuf, TOTAL_W, TOTAL_H, 15, ry + 40, ROW_LABELS[r], [255, 230, 150], 1);

        // Horizontal grid line
        for (let x = 0; x < TOTAL_W; x++) {
            const idx = (ry * TOTAL_W + x) * 4;
            boardBuf[idx] = 35; boardBuf[idx + 1] = 40; boardBuf[idx + 2] = 60; boardBuf[idx + 3] = 255;
        }

        // Render sprites
        loaded.forEach((sec, sIdx) => {
            const sx = LEFT_MARGIN + sIdx * (SEC_W + SECTION_PAD);

            // Section separator
            for (let y = 0; y < ROW_H; y++) {
                const sepIdx = ((ry + y) * TOTAL_W + sx - 7) * 4;
                boardBuf[sepIdx] = 65; boardBuf[sepIdx + 1] = 75; boardBuf[sepIdx + 2] = 105; boardBuf[sepIdx + 3] = 255;
            }

            for (let f = 0; f < 3; f++) {
                const fx = sx + f * CELL_SIZE;

                // Cell boundary line
                for (let y = 0; y < ROW_H; y++) {
                    const bIdx = ((ry + y) * TOTAL_W + fx) * 4;
                    boardBuf[bIdx] = 28; boardBuf[bIdx + 1] = 32; boardBuf[bIdx + 2] = 48; boardBuf[bIdx + 3] = 255;
                }

                // Draw sprite (2x nearest neighbor)
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
                                    boardBuf[dIdx]     = sec.img.data[sIdx];
                                    boardBuf[dIdx + 1] = sec.img.data[sIdx + 1];
                                    boardBuf[dIdx + 2] = sec.img.data[sIdx + 2];
                                    boardBuf[dIdx + 3] = 255;
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    // Bottom boundary line
    for (let x = 0; x < TOTAL_W; x++) {
        const idx = ((HEADER_H + 8 * ROW_H) * TOTAL_W + x) * 4;
        boardBuf[idx] = 35; boardBuf[idx + 1] = 40; boardBuf[idx + 2] = 60; boardBuf[idx + 3] = 255;
    }

    return boardBuf;
}

// 1. Render Elf Creator Review Board
const elfReviewBuf = renderBoard(
    'ELF 8-DIRECTIONAL CREATOR REVIEW BOARD (6 STAGES)',
    '18 COLUMNS X 8 DIRECTIONAL ROWS (STRICT ANATOMICAL LOCK & GROUNDING VERIFIED)'
);
const outReview = path.join(REVIEW_DIR, 'elf_creator_review_board.png');
const outBrain = path.join(BRAIN_DIR, 'elf_creator_review_board.png');
writePNG(outReview, TOTAL_W, TOTAL_H, elfReviewBuf);
writePNG(outBrain, TOTAL_W, TOTAL_H, elfReviewBuf);
console.log(`Saved Creator Review Board to: ${outReview}`);

// 2. Render Universal Standard Specification Template for all factions
const templateBuf = renderBoard(
    'UNIVERSAL 8-DIRECTIONAL STANDARD CHARSET TEMPLATE (ALL FACTIONS)',
    '18 COLUMNS X 8 DIRECTIONAL ROWS (AUTHORITATIVE ENGINE MATRIX SPECIFICATION)'
);
const docsTemplate = path.join(ROOT, 'docs', 'design', 'STANDARD_8D_CHARSET_TEMPLATE.png');
const brainTemplate = path.join(BRAIN_DIR, 'standard_8d_charset_template_spec.png');
writePNG(docsTemplate, TOTAL_W, TOTAL_H, templateBuf);
writePNG(brainTemplate, TOTAL_W, TOTAL_H, templateBuf);
console.log(`Updated docs/design/STANDARD_8D_CHARSET_TEMPLATE.png`);

