'use strict';

/**
 * tools/compile_all_6_male_variations.js
 *
 * Compiles all 6 Adult Male Human Settler variations into game/img/characters/$UF_Human_Male_N.png
 * and creates review sheets in art/review/.
 * All sprites originated 100% from Google Nano Banana Pro (gemini-3-pro-image) per Rule 11.
 * Snapped to art/palette/uf.hex (<= 31 opaque colors), grounded y=47, serious chibi proportions.
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const {
    extractFrameFromCell,
    mirrorFrame,
    assemble12SpriteSheet,
    saveSheetAndSidecar
} = require('./build_pro_human_male');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'raw');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');

const VARIATIONS = [
    {
        num: 1,
        name: 'Chestnut Brown Doublet (Master)',
        file: 'human_male_pro_4d_walk.png',
        sCols: [0, 1, 2],
        eCoords: [[704, 938, 0, 258], [0, 234, 258, 511], [938, 1172, 258, 511]],
        nCols: [0, 2, 1]
    },
    {
        num: 2,
        name: 'Golden Blonde Swept Hair / Olive Tunic',
        file: 'human_male_var2_pro_4d_walk.png',
        sCols: [0, 1, 2],
        eCoords: [[704, 938, 0, 258], [0, 234, 258, 511], [938, 1172, 258, 511]],
        nCols: [0, 1, 2]
    },
    {
        num: 3,
        name: 'Raven Black Hair & Beard / Charcoal Tunic',
        file: 'human_male_var3_pro_4d_walk.png',
        sCols: [0, 1, 2],
        eCoords: [[704, 938, 0, 258], [0, 234, 258, 511], [938, 1172, 258, 511]],
        nCols: [1, 2, 3] // Var 3 Row 2 Col 0 was South
    },
    {
        num: 4,
        name: 'Auburn Hair & Goatee / Terracotta Tunic',
        file: 'human_male_var4_pro_4d_walk.png',
        sCols: [0, 1, 2],
        eCoords: [[704, 938, 0, 258], [0, 234, 258, 511], [938, 1172, 258, 511]],
        nCols: [0, 1, 2]
    },
    {
        num: 5,
        name: 'Bald Artisan & Beard / Rawhide Work Vest',
        file: 'human_male_var5_pro_4d_walk.png',
        sCols: [0, 1, 2],
        eCoords: [[0, 234, 258, 511], [234, 470, 258, 511], [470, 704, 258, 511]],
        customNorth: (img) => {
            const n0 = extractFrameFromCell(img, 0, 234, 511, 767, 43);
            const n2 = extractFrameFromCell(img, 470, 704, 511, 767, 43);
            const n1 = Buffer.from(n0);
            for (let y = 38; y < 48; y++) {
                for (let x = 24; x < 48; x++) {
                    const s = (y * 48 + x) * 4;
                    n1[s] = n2[s]; n1[s+1] = n2[s+1]; n1[s+2] = n2[s+2]; n1[s+3] = n2[s+3];
                }
            }
            return [n0, n1, n2];
        }
    },
    {
        num: 6,
        name: 'Salt & Pepper Veteran / Indigo Blue Tunic',
        file: 'human_male_var6_pro_4d_walk.png',
        sCols: [0, 1, 2],
        eCoords: [[704, 938, 0, 258], [0, 234, 258, 511], [938, 1172, 258, 511]],
        nCols: [0, 1, 2]
    }
];

function compileAll() {
    const compiledSheets = [];

    for (const v of VARIATIONS) {
        const rawPath = path.join(RAW_DIR, v.file);
        if (!fs.existsSync(rawPath)) {
            console.error(`File missing: ${rawPath}`);
            continue;
        }
        const img = decodePNG(fs.readFileSync(rawPath));

        // South
        const s0 = extractFrameFromCell(img, v.sCols[0] * 234, (v.sCols[0] + 1) * 234, 0, 258, 43);
        const s1 = extractFrameFromCell(img, v.sCols[1] * 234, (v.sCols[1] + 1) * 234, 0, 258, 43);
        const s2 = extractFrameFromCell(img, v.sCols[2] * 234, (v.sCols[2] + 1) * 234, 0, 258, 43);

        // East: Stride A, Stand/Passing, Stride B
        const e0 = extractFrameFromCell(img, v.eCoords[0][0], v.eCoords[0][1], v.eCoords[0][2], v.eCoords[0][3], 43);
        const e1 = extractFrameFromCell(img, v.eCoords[1][0], v.eCoords[1][1], v.eCoords[1][2], v.eCoords[1][3], 43);
        const e2 = extractFrameFromCell(img, v.eCoords[2][0], v.eCoords[2][1], v.eCoords[2][2], v.eCoords[2][3], 43);

        // North
        let northFrames;
        if (v.customNorth) {
            northFrames = v.customNorth(img);
        } else {
            const n0 = extractFrameFromCell(img, v.nCols[0] * 234, (v.nCols[0] + 1) * 234, 511, 767, 43);
            const n1 = extractFrameFromCell(img, v.nCols[1] * 234, (v.nCols[1] + 1) * 234, 511, 767, 43);
            const n2 = extractFrameFromCell(img, v.nCols[2] * 234, (v.nCols[2] + 1) * 234, 511, 767, 43);
            northFrames = [n0, n1, n2];
        }

        const sheet = assemble12SpriteSheet({
            S: [s0, s1, s2],
            W: [e0, e1, e2].map(mirrorFrame),
            E: [e0, e1, e2],
            N: northFrames
        });

        const baseName = `Human_Male_${v.num}`;
        saveSheetAndSidecar(sheet, baseName, 'Walk', { walk: [0, 1, 2, 1], stand: [1] });
        writePNG(path.join(REVIEW_DIR, `pro_male_var${v.num}_walk_12_sheet.png`), 144, 192, sheet);

        if (v.num === 1) {
            // Also update the primary master walk sheets
            saveSheetAndSidecar(sheet, 'Human_Male_Walk', 'Walk', { walk: [0, 1, 2, 1], stand: [1] });
            saveSheetAndSidecar(sheet, 'Human_Male', 'Walk', { walk: [0, 1, 2, 1], stand: [1] });
            saveSheetAndSidecar(sheet, 'Human_Male_Adult', 'Walk', { walk: [0, 1, 2, 1], stand: [1] });
            saveSheetAndSidecar(sheet, 'Human', 'Walk', { walk: [0, 1, 2, 1], stand: [1] });
        }

        compiledSheets.push({ ...v, sheet });
        console.log(`Successfully compiled Variation ${v.num}: ${v.name}`);
    }

    // Build Master 6-Variation Review Montage (6 columns of 12-sprite sheets: width = 6 * 144 = 864, height = 192)
    const montage = Buffer.alloc(6 * 144 * 192 * 4);
    for (let i = 0; i < compiledSheets.length; i++) {
        const sBuf = compiledSheets[i].sheet;
        const xOffset = i * 144;
        for (let y = 0; y < 192; y++) {
            for (let x = 0; x < 144; x++) {
                const sIdx = (y * 144 + x) * 4;
                const dIdx = (y * (6 * 144) + (xOffset + x)) * 4;
                montage[dIdx]   = sBuf[sIdx];
                montage[dIdx+1] = sBuf[sIdx+1];
                montage[dIdx+2] = sBuf[sIdx+2];
                montage[dIdx+3] = sBuf[sIdx+3];
            }
        }
    }
    const montagePath = path.join(REVIEW_DIR, 'human_male_6_variations_montage.png');
    writePNG(montagePath, 6 * 144, 192, montage);
    console.log(`Saved master montage to: ${montagePath}`);
}

compileAll();

