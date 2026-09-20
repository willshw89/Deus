'use strict';

/**
 * tools/fix_all_walk_facings.js
 *
 * Normalizes all 12-sprite character sheets to standard RMMZ directional conventions:
 * - Row 0: South (Down)
 * - Row 1: West (Left)  -> Strictly ALL 3 FRAMES FACE LEFT
 * - Row 2: East (Right) -> Strictly ALL 3 FRAMES FACE RIGHT (Exact horizontal mirror of West)
 * - Row 3: North (Up)
 *
 * Per VISION V110 and AGENTS.md Rule 12.
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const { checkFrameFacing } = require('./build_pro_human_male');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');

function mirrorCell(cell) {
    const dst = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + (47 - x)) * 4;
            const dIdx = (y * 48 + x) * 4;
            dst[dIdx]   = cell[sIdx];
            dst[dIdx+1] = cell[sIdx+1];
            dst[dIdx+2] = cell[sIdx+2];
            dst[dIdx+3] = cell[sIdx+3];
        }
    }
    return dst;
}

function extractCell(img, c, r) {
    const buf = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = ((r * 48 + y) * img.width + (c * 48 + x)) * 4;
            const dIdx = (y * 48 + x) * 4;
            buf[dIdx]   = img.data[sIdx];
            buf[dIdx+1] = img.data[sIdx+1];
            buf[dIdx+2] = img.data[sIdx+2];
            buf[dIdx+3] = img.data[sIdx+3];
        }
    }
    return buf;
}

function fixSheetSideFacings(imgData, width, height) {
    const out = Buffer.from(imgData);
    const imgObj = { width, height, data: out };

    for (let c = 0; c < 3; c++) {
        let cell = extractCell(imgObj, c, 1);
        const facing = checkFrameFacing(cell);
        if (facing === 'RIGHT') {
            cell = mirrorCell(cell);
        }

        // Write fixed cell to Row 1 (West - Left)
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const dIdx = ((1 * 48 + y) * width + (c * 48 + x)) * 4;
                const sIdx = (y * 48 + x) * 4;
                out[dIdx]   = cell[sIdx];
                out[dIdx+1] = cell[sIdx+1];
                out[dIdx+2] = cell[sIdx+2];
                out[dIdx+3] = cell[sIdx+3];
            }
        }

        // Write mirrored cell to Row 2 (East - Right)
        const eastCell = mirrorCell(cell);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const dIdx = ((2 * 48 + y) * width + (c * 48 + x)) * 4;
                const sIdx = (y * 48 + x) * 4;
                out[dIdx]   = eastCell[sIdx];
                out[dIdx+1] = eastCell[sIdx+1];
                out[dIdx+2] = eastCell[sIdx+2];
                out[dIdx+3] = eastCell[sIdx+3];
            }
        }
    }
    return out;
}

function processDirectory() {
    const files = fs.readdirSync(CHAR_DIR).filter(f => {
        if (!f.endsWith('.png')) return false;
        if (f.startsWith('!$')) return false; // Objects/props
        if (f.includes('.u7bak.')) return false; // Backups
        if (f.startsWith('$U7_')) return false; // Legacy U7 stand-ins
        return (
            f.startsWith('$UF_Human_') ||
            f.startsWith('$UF_Dwarf_') ||
            f.startsWith('$UF_Elf_') ||
            f.startsWith('$UF_Orc_') ||
            f === '$Adam.png' ||
            f === '$Eve.png' ||
            f === 'Adam.png' ||
            f === 'Eve.png' ||
            f === '$UF_Wolf.png' ||
            f === '$UF_Sheep.png' ||
            f === '$UF_Boar.png'
        );
    });

    console.log(`Processing ${files.length} character sheets in ${CHAR_DIR}...`);
    let fixedCount = 0;

    for (const f of files) {
        const p = path.join(CHAR_DIR, f);
        try {
            const img = decodePNG(fs.readFileSync(p));
            if (img.width !== 144 || img.height !== 192) continue;

            const r1 = [0, 1, 2].map(c => checkFrameFacing(extractCell(img, c, 1)));
            const r2 = [0, 1, 2].map(c => checkFrameFacing(extractCell(img, c, 2)));

            const needsFix = r1.some(d => d !== 'LEFT') || r2.some(d => d !== 'RIGHT');
            if (needsFix) {
                console.log(`Fixing ${f} (R1: ${r1.join(' ')} -> LEFT LEFT LEFT, R2: ${r2.join(' ')} -> RIGHT RIGHT RIGHT)`);
                const fixed = fixSheetSideFacings(img.data, img.width, img.height);
                writePNG(p, img.width, img.height, fixed);
                fixedCount++;
            }
        } catch (e) {
            console.error(`Error processing ${f}:`, e.message);
        }
    }

    // Sync Adam.png and Eve.png
    const adamPath = path.join(CHAR_DIR, '$Adam.png');
    const evePath = path.join(CHAR_DIR, '$Eve.png');
    if (fs.existsSync(adamPath)) fs.copyFileSync(adamPath, path.join(CHAR_DIR, 'Adam.png'));
    if (fs.existsSync(evePath)) fs.copyFileSync(evePath, path.join(CHAR_DIR, 'Eve.png'));

    console.log(`\nProcessed all character sheets. Fixed ${fixedCount} sheets.`);
}

processDirectory();

