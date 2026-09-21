'use strict';

/**
 * tools/build_faction_creature_walk_masters.js
 *
 * Compiles authentic 12-sprite walk sheets for non-human faction creatures:
 * - Elf Male ($UF_Elf_Male.png, $UF_Elf.png)
 * - Elf Female ($UF_Elf_Female.png)
 * - Dwarf Male ($UF_Dwarf_Male.png, $UF_Dwarf.png)
 * - Dwarf Female ($UF_Dwarf_Female.png)
 * - Orc Male ($UF_Orc_Male.png, $UF_Orc.png)
 *
 * Strictly from Google Nano Banana Pro raw sheets (Rule 11, Rule 12).
 *
 * Layout Standard (VISION V110, V114, V115, V130):
 * Row 0: DOWN DOWN DOWN  (South)
 * Row 1: LEFT LEFT LEFT  (West)
 * Row 2: RIGHT RIGHT RIGHT (East - exact horizontal mirror of West)
 * Row 3: UP UP UP        (North)
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const { pal, isMagenta, applyDarkOutline, mirrorFrame, quantizeSheet } = require('./build_pro_human_male');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');

function findBoundingBox(img, minX, maxX, minY, maxY) {
    const startX = minX + 5, endX = maxX - 5;
    const startY = minY + 5, endY = maxY - 5;
    let sMinX = Infinity, sMaxX = -Infinity, sMinY = Infinity, sMaxY = -Infinity;
    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            const idx = (y * img.width + x) * 4;
            const r = img.data[idx], g = img.data[idx+1], b = img.data[idx+2];
            if (!isMagenta(r, g, b)) {
                if (x < sMinX) sMinX = x;
                if (x > sMaxX) sMaxX = x;
                if (y < sMinY) sMinY = y;
                if (y > sMaxY) sMaxY = y;
            }
        }
    }
    return { sMinX, sMaxX, sMinY, sMaxY, w: sMaxX - sMinX + 1, h: sMaxY - sMinY + 1 };
}

function extractCellUniform(img, minX, maxX, minY, maxY, scale, refCenterX, refBaselineY) {
    const out = Buffer.alloc(48 * 48 * 4);
    const dstCenterX = 23.5;
    const dstBaselineY = 47.0;
    const safeMinX = minX + 2;
    const safeMaxX = maxX - 2;
    const safeMinY = minY + 2;
    const safeMaxY = maxY - 2;

    for (let dy = 0; dy < 48; dy++) {
        const rawY0 = refBaselineY - (dstBaselineY - dy + 0.5) / scale;
        const rawY1 = refBaselineY - (dstBaselineY - dy - 0.5) / scale;
        const ry0 = Math.max(safeMinY, Math.floor(rawY0));
        const ry1 = Math.min(safeMaxY, Math.ceil(rawY1));
        if (ry0 > safeMaxY || ry1 < safeMinY) continue;

        for (let dx = 0; dx < 48; dx++) {
            const rawX0 = refCenterX + (dx - dstCenterX - 0.5) / scale;
            const rawX1 = refCenterX + (dx - dstCenterX + 0.5) / scale;
            const rx0 = Math.max(safeMinX, Math.floor(rawX0));
            const rx1 = Math.min(safeMaxX, Math.ceil(rawX1));
            if (rx0 > safeMaxX || rx1 < safeMinX) continue;

            let rSum = 0, gSum = 0, bSum = 0, count = 0;
            for (let sy = ry0; sy <= ry1; sy++) {
                for (let sx = rx0; sx <= rx1; sx++) {
                    const idx = (sy * img.width + sx) * 4;
                    const r = img.data[idx], g = img.data[idx+1], b = img.data[idx+2];
                    if (!isMagenta(r, g, b)) {
                        rSum += r; gSum += g; bSum += b; count++;
                    }
                }
            }

            if (count > 0) {
                const snapped = pal.snap(Math.round(rSum / count), Math.round(gSum / count), Math.round(bSum / count));
                const dIdx = (dy * 48 + dx) * 4;
                out[dIdx]   = snapped[0];
                out[dIdx+1] = snapped[1];
                out[dIdx+2] = snapped[2];
                out[dIdx+3] = 255;
            }
        }
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

function assemble8RowSheet(img, config) {
    const cw = Math.floor(img.width / 3);
    const ch = Math.floor(img.height / 8);
    const refCell = config.refStand;
    const refBox = findBoundingBox(img, refCell.c * cw, (refCell.c + 1) * cw - 1, refCell.r * ch, (refCell.r + 1) * ch - 1);
    const scale = (config.targetH || 43.0) / refBox.h;
    const localBaselineY = refBox.sMaxY - refCell.r * ch;

    function getFrame(r, c, isSide = false) {
        const box = findBoundingBox(img, c * cw, (c + 1) * cw - 1, r * ch, (r + 1) * ch - 1);
        const cellCenter = isSide ? (box.sMinX + box.sMaxX) / 2 : (c + 0.5) * cw;
        const rowBaselineY = r * ch + localBaselineY;
        return extractCellUniform(img, c * cw, (c + 1) * cw - 1, r * ch, (r + 1) * ch - 1, scale, cellCenter, rowBaselineY);
    }

    // Row 0: South [strideA, stand, strideB]
    const s0 = getFrame(config.south[0].r, config.south[0].c);
    const s1 = getFrame(config.south[1].r, config.south[1].c);
    const s2 = getFrame(config.south[2].r, config.south[2].c);

    // Row 1: West [strideA, stand, strideB]
    const w0 = getFrame(config.west[0].r, config.west[0].c, true);
    const w1 = getFrame(config.west[1].r, config.west[1].c, true);
    const w2 = getFrame(config.west[2].r, config.west[2].c, true);

    // Row 2: East - strict mirror of West
    const e0 = mirrorFrame(w0);
    const e1 = mirrorFrame(w1);
    const e2 = mirrorFrame(w2);

    // Row 3: North [strideA, stand, strideB]
    const n0 = getFrame(config.north[0].r, config.north[0].c);
    const n1 = getFrame(config.north[1].r, config.north[1].c);
    const n2 = getFrame(config.north[2].r, config.north[2].c);

    const sheet = Buffer.alloc(144 * 192 * 4);
    const rows = [
        [s0, s1, s2],
        [w0, w1, w2],
        [e0, e1, e2],
        [n0, n1, n2]
    ];

    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 3; c++) {
            const f = rows[r][c];
            for (let py = 0; py < 48; py++) {
                for (let px = 0; px < 48; px++) {
                    const sIdx = (py * 48 + px) * 4;
                    const dIdx = ((r * 48 + py) * 144 + (c * 48 + px)) * 4;
                    sheet[dIdx]   = f[sIdx];
                    sheet[dIdx+1] = f[sIdx+1];
                    sheet[dIdx+2] = f[sIdx+2];
                    sheet[dIdx+3] = f[sIdx+3];
                }
            }
        }
    }
    quantizeSheet(sheet, 144, 192, 31);
    return sheet;
}

function assembleBoxConfigSheet(img, config) {
    const refBox = config.refBox;
    const scale = (config.targetH || 43.0) / (refBox.maxY - refBox.minY + 1);

    function getFrameFromBox(box) {
        const cellCenter = (box.minX + box.maxX) / 2;
        const baselineY = box.maxY;
        return extractCellUniform(img, Math.max(0, box.minX - 5), Math.min(img.width - 1, box.maxX + 5), Math.max(0, box.minY - 5), Math.min(img.height - 1, box.maxY + 5), scale, cellCenter, baselineY);
    }

    const s0 = getFrameFromBox(config.south[0]);
    const s1 = getFrameFromBox(config.south[1]);
    const s2 = getFrameFromBox(config.south[2]);

    const w0 = getFrameFromBox(config.west[0]);
    const w1 = getFrameFromBox(config.west[1]);
    const w2 = getFrameFromBox(config.west[2]);

    const e0 = mirrorFrame(w0);
    const e1 = mirrorFrame(w1);
    const e2 = mirrorFrame(w2);

    const n0 = getFrameFromBox(config.north[0]);
    const n1 = getFrameFromBox(config.north[1]);
    const n2 = getFrameFromBox(config.north[2]);

    const sheet = Buffer.alloc(144 * 192 * 4);
    const rows = [
        [s0, s1, s2],
        [w0, w1, w2],
        [e0, e1, e2],
        [n0, n1, n2]
    ];

    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 3; c++) {
            const f = rows[r][c];
            for (let py = 0; py < 48; py++) {
                for (let px = 0; px < 48; px++) {
                    const sIdx = (py * 48 + px) * 4;
                    const dIdx = ((r * 48 + py) * 144 + (c * 48 + px)) * 4;
                    sheet[dIdx]   = f[sIdx];
                    sheet[dIdx+1] = f[sIdx+1];
                    sheet[dIdx+2] = f[sIdx+2];
                    sheet[dIdx+3] = f[sIdx+3];
                }
            }
        }
    }
    quantizeSheet(sheet, 144, 192, 31);
    return sheet;
}

function makePlaybackBuf(sheetBuf) {
    const out = Buffer.alloc(192 * 192 * 4);
    const steps = [1, 0, 1, 2];
    for (let r = 0; r < 4; r++) {
        for (let s = 0; s < 4; s++) {
            const col = steps[s];
            for (let py = 0; py < 48; py++) {
                for (let px = 0; px < 48; px++) {
                    const sIdx = ((r * 48 + py) * 144 + (col * 48 + px)) * 4;
                    const dIdx = ((r * 48 + py) * 192 + (s * 48 + px)) * 4;
                    out[dIdx]   = sheetBuf[sIdx];
                    out[dIdx+1] = sheetBuf[sIdx+1];
                    out[dIdx+2] = sheetBuf[sIdx+2];
                    out[dIdx+3] = sheetBuf[sIdx+3];
                }
            }
        }
    }
    return out;
}

const FACTION_SHEETS = [
    // 1. Elf Male
    {
        name: 'Elf_Male',
        type: '8row',
        file: 'art/raw/elf_male_adult_walk.png',
        refStand: { r: 0, c: 1 },
        targetH: 44.0,
        south: [ { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 } ],
        west:  [ { r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 } ],
        north: [ { r: 4, c: 0 }, { r: 4, c: 1 }, { r: 4, c: 2 } ],
        aliases: ['Elf']
    },
    // 2. Elf Female
    {
        name: 'Elf_Female',
        type: '8row',
        file: 'art/raw/elf_female_adult_walk.png',
        refStand: { r: 0, c: 1 },
        targetH: 43.0,
        south: [ { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 } ],
        west:  [ { r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 } ],
        north: [ { r: 4, c: 0 }, { r: 4, c: 1 }, { r: 4, c: 2 } ],
        aliases: []
    },
    // 3. Dwarf Male
    {
        name: 'Dwarf_Male',
        type: '8row',
        file: 'art/raw/dwarf_male_adult_walk.png',
        refStand: { r: 0, c: 1 },
        targetH: 41.0,
        south: [ { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 } ],
        west:  [ { r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 } ],
        north: [ { r: 4, c: 0 }, { r: 4, c: 1 }, { r: 4, c: 2 } ],
        aliases: ['Dwarf']
    },
    // 4. Dwarf Female
    {
        name: 'Dwarf_Female',
        type: '8row',
        file: 'art/raw/dwarf_female_adult_walk.png',
        refStand: { r: 0, c: 1 },
        targetH: 40.0,
        south: [ { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 } ],
        west:  [ { r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 } ],
        north: [ { r: 4, c: 0 }, { r: 4, c: 1 }, { r: 4, c: 2 } ],
        aliases: []
    },
    // 5. Orc Male
    {
        name: 'Orc_Male',
        type: 'box',
        file: 'art/raw/orc_male_walk_12_raw.png',
        refBox: { minX: 619, maxX: 788, minY: 2, maxY: 246 },
        targetH: 45.0,
        south: [
            { minX: 358, maxX: 525, minY: 2, maxY: 255 },
            { minX: 619, maxX: 788, minY: 2, maxY: 246 },
            { minX: 883, maxX: 1049, minY: 2, maxY: 252 }
        ],
        west: [
            { minX: 135, maxX: 258, minY: 261, maxY: 506 },
            { minX: 387, maxX: 495, minY: 261, maxY: 507 },
            { minX: 1150, maxX: 1272, minY: 261, maxY: 506 }
        ],
        north: [
            { minX: 882, maxX: 1049, minY: 516, maxY: 765 },
            { minX: 358, maxX: 525, minY: 516, maxY: 765 },
            { minX: 1126, maxX: 1293, minY: 516, maxY: 765 }
        ],
        aliases: ['Orc']
    }
];

console.log('Compiling authentic faction creature walk sheets...');
for (const cfg of FACTION_SHEETS) {
    const img = decodePNG(fs.readFileSync(cfg.file));
    const sheet = cfg.type === '8row' ? assemble8RowSheet(img, cfg) : assembleBoxConfigSheet(img, cfg);
    const mainFile = path.join(CHAR_DIR, `$UF_${cfg.name}.png`);
    writePNG(mainFile, 144, 192, sheet);
    console.log(`Saved ${mainFile}`);

    const pb = makePlaybackBuf(sheet);
    writePNG(path.join(REVIEW_DIR, `review_$UF_${cfg.name}.png`), 192, 192, pb);

    for (const alias of (cfg.aliases || [])) {
        const aliasFile = path.join(CHAR_DIR, `$UF_${alias}.png`);
        writePNG(aliasFile, 144, 192, sheet);
        console.log(`  -> Alias: ${aliasFile}`);
    }
}
console.log('Faction creature walk sheets compiled successfully!');
