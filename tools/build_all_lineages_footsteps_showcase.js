#!/usr/bin/env node
'use strict';

/**
 * tools/build_all_lineages_footsteps_showcase.js
 *
 * Renders an exhaustive 4x review showcase displaying the dynamic footstep walk cycles
 * (South, West, and North) across all 6 character archetypes:
 * - Human Male & Female
 * - Dwarf Male & Female
 * - Elf Male & Female
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');

function getFrame(img, col, row, totalCols = 3) {
    const frame = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (((row * 48 + y) * img.width) + (col * 48 + x)) * 4;
            const dIdx = (y * 48 + x) * 4;
            frame[dIdx] = img.data[sIdx];
            frame[dIdx + 1] = img.data[sIdx + 1];
            frame[dIdx + 2] = img.data[sIdx + 2];
            frame[dIdx + 3] = img.data[sIdx + 3];
        }
    }
    return frame;
}

function blit48(src, dst, dstX, dstY, dstW) {
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            const dIdx = ((dstY + y) * dstW + (dstX + x)) * 4;
            if (src[sIdx + 3] > 0) {
                dst[dIdx] = src[sIdx];
                dst[dIdx + 1] = src[sIdx + 1];
                dst[dIdx + 2] = src[sIdx + 2];
                dst[dIdx + 3] = src[sIdx + 3];
            }
        }
    }
}

function main() {
    console.log('=== Generating All Lineages Dynamic Footsteps Showcase ===');

    const sheets = [
        { name: 'Human Male',   file: '$UF_Human_Male_8D.png' },
        { name: 'Human Female', file: '$UF_Human_Female_8D.png' },
        { name: 'Dwarf Male',   file: '$UF_Dwarf_Male_8D.png' },
        { name: 'Dwarf Female', file: '$UF_Dwarf_Female_8D.png' },
        { name: 'Elf Male',     file: '$UF_Elf_Male_8D.png' },
        { name: 'Elf Female',   file: '$UF_Elf_Female_8D.png' }
    ];

    // Canvas layout:
    // 6 rows (one per archetype)
    // 9 columns:
    // Cols 0, 1, 2: South Walk (Step L, Stand, Step R)
    // Col 3: Spacer
    // Cols 4, 5, 6: West Walk (Stride Fwd, Stand, Stride Back)
    // Col 7: Spacer
    // Cols 8, 9, 10: North Walk (Step L Up, Stand Back, Step R Up)
    const numCols = 11;
    const numRows = 6;
    const baseW = numCols * 48; // 528
    const baseH = numRows * 48; // 288
    const baseCanvas = Buffer.alloc(baseW * baseH * 4);

    for (let r = 0; r < numRows; r++) {
        const item = sheets[r];
        const imgPath = path.join(CHAR_DIR, item.file);
        const img = decodePNG(fs.readFileSync(imgPath));

        // South: row 0 in 8D sheet
        const sL = getFrame(img, 0, 0);
        const sS = getFrame(img, 1, 0);
        const sR = getFrame(img, 2, 0);

        // West: row 2 in 8D sheet
        const wL = getFrame(img, 0, 2);
        const wS = getFrame(img, 1, 2);
        const wR = getFrame(img, 2, 2);

        // North: row 4 in 8D sheet
        const nL = getFrame(img, 0, 4);
        const nS = getFrame(img, 1, 4);
        const nR = getFrame(img, 2, 4);

        // Blit South (cols 0, 1, 2)
        blit48(sL, baseCanvas, 0 * 48, r * 48, baseW);
        blit48(sS, baseCanvas, 1 * 48, r * 48, baseW);
        blit48(sR, baseCanvas, 2 * 48, r * 48, baseW);

        // Blit West (cols 4, 5, 6)
        blit48(wL, baseCanvas, 4 * 48, r * 48, baseW);
        blit48(wS, baseCanvas, 5 * 48, r * 48, baseW);
        blit48(wR, baseCanvas, 6 * 48, r * 48, baseW);

        // Blit North (cols 8, 9, 10)
        blit48(nL, baseCanvas, 8 * 48, r * 48, baseW);
        blit48(nS, baseCanvas, 9 * 48, r * 48, baseW);
        blit48(nR, baseCanvas, 10 * 48, r * 48, baseW);
    }

    // 4x upscale for review
    const scale = 4;
    const upW = baseW * scale; // 2112
    const upH = baseH * scale; // 1152
    const upBuf = Buffer.alloc(upW * upH * 4);

    // Warm deep slate backdrop
    for (let i = 0; i < upBuf.length; i += 4) {
        upBuf[i] = 38; upBuf[i + 1] = 42; upBuf[i + 2] = 48; upBuf[i + 3] = 255;
    }

    // Subtle divider lines between directions
    const div1X = 3 * 48 * scale + Math.round(24 * scale);
    const div2X = 7 * 48 * scale + Math.round(24 * scale);
    for (let y = 0; y < upH; y++) {
        for (let dx = -1; dx <= 1; dx++) {
            const idx1 = (y * upW + div1X + dx) * 4;
            const idx2 = (y * upW + div2X + dx) * 4;
            upBuf[idx1] = 55; upBuf[idx1 + 1] = 60; upBuf[idx1 + 2] = 70;
            upBuf[idx2] = 55; upBuf[idx2 + 1] = 60; upBuf[idx2 + 2] = 70;
        }
    }

    for (let y = 0; y < baseH; y++) {
        for (let x = 0; x < baseW; x++) {
            const sIdx = (y * baseW + x) * 4;
            if (baseCanvas[sIdx + 3] > 0) {
                for (let dy = 0; dy < scale; dy++) {
                    for (let dx = 0; dx < scale; dx++) {
                        const dIdx = (((y * scale + dy) * upW) + (x * scale + dx)) * 4;
                        upBuf[dIdx] = baseCanvas[sIdx];
                        upBuf[dIdx + 1] = baseCanvas[sIdx + 1];
                        upBuf[dIdx + 2] = baseCanvas[sIdx + 2];
                        upBuf[dIdx + 3] = 255;
                    }
                }
            }
        }
    }

    const outPath = path.join(REVIEW_DIR, 'all_lineages_footsteps_walk_cycles_4x.png');
    writePNG(outPath, upW, upH, upBuf);
    console.log('SUCCESS: Written comprehensive footsteps walk cycles to:', outPath);
}

main();
