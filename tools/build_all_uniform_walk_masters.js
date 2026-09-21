'use strict';

/**
 * tools/build_all_uniform_walk_masters.js
 *
 * Compiles verified 12-sprite uniform walk sheets for:
 * Male 1..6 and Female 1..6
 * strictly from Google Nano Banana Pro raw sheets (Rule 11).
 *
 * Universal 12-sprite standard layout (VISION V110, V114, V115, V130):
 * Row 0: DOWN DOWN DOWN  (South)
 * Row 1: LEFT LEFT LEFT  (West)
 * Row 2: RIGHT RIGHT RIGHT (East - horizontal mirror of West)
 * Row 3: UP UP UP      (North)
 *
 * Each facing has [Stride A, Stand, Stride B] so RMMZ 1->0->1->2 walk cycle
 * plays [Stand -> Stride A -> Stand -> Stride B] with crisp alternating foot strides.
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const { pal, isMagenta, applyDarkOutline, mirrorFrame, quantizeSheet } = require('./build_pro_human_male');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');
if (!fs.existsSync(REVIEW_DIR)) fs.mkdirSync(REVIEW_DIR, { recursive: true });

function findBoundingBox(img, minX, maxX, minY, maxY) {
    const startX = minX + 15, endX = maxX - 15;
    const startY = minY + 15, endY = maxY - 15;
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
    const safeMinX = minX + 12;
    const safeMaxX = maxX - 12;
    const safeMinY = minY + 12;
    const safeMaxY = maxY - 12;

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

function assembleProSheet(img, config) {
    const cw = Math.floor(img.width / 6);
    const ch = Math.floor(img.height / 3);
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

    // Row 1: West [strideA, stand, strideB] - natively facing LEFT
    const w0 = getFrame(config.west[0].r, config.west[0].c, true);
    const w1 = getFrame(config.west[1].r, config.west[1].c, true);
    const w2 = getFrame(config.west[2].r, config.west[2].c, true);

    // Row 2: East - strictly mirror of West per VISION V110 (100% guaranteed facing RIGHT)
    const e0 = mirrorFrame(w0);
    const e1 = mirrorFrame(w1);
    const e2 = mirrorFrame(w2);

    // Row 3: North [strideA, stand, strideB]
    const n0 = config.north[0].mirror ? mirrorFrame(getFrame(config.north[0].r, config.north[0].c)) : getFrame(config.north[0].r, config.north[0].c);
    const n1 = config.north[1].mirror ? mirrorFrame(getFrame(config.north[1].r, config.north[1].c)) : getFrame(config.north[1].r, config.north[1].c);
    const n2 = config.north[2].mirror ? mirrorFrame(getFrame(config.north[2].r, config.north[2].c)) : getFrame(config.north[2].r, config.north[2].c);

    const sheet = Buffer.alloc(144 * 192 * 4);
    const rows = [
        [s0, s1, s2], // Row 0: DOWN (South)
        [w0, w1, w2], // Row 1: LEFT (West)
        [e0, e1, e2], // Row 2: RIGHT (East)
        [n0, n1, n2]  // Row 3: UP (North)
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

function saveSidecar(name, gender) {
    const sidecar = {
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ['S', 'W', 'E', 'N'],
        animations: {
            walk: [0, 1, 2, 1],
            stand: [1]
        },
        frameMs: 180,
        species: 'human',
        stage: 'adult',
        gender: gender,
        action: 'Walk',
        style: 'Serious Chibi (VISION V116)',
        generator: 'Google Nano Banana Pro (gemini-3-pro-image, Rule 11, VISION V109)'
    };
    fs.writeFileSync(path.join(CHAR_DIR, `$UF_${name}.json`), JSON.stringify(sidecar, null, 2));
}

const SHEETS = [
    // 1. Males 1..6
    {
        name: 'Human_Male_1_Walk',
        gender: 'male',
        file: 'art/raw/human_male_pro_4d_walk.png',
        refStand: { r: 0, c: 1 },
        south: [ { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 } ],
        west:  [ { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 } ],
        north: [ { r: 2, c: 0 }, { r: 2, c: 2 }, { r: 2, c: 1 } ],
        aliases: ['Human_Male_1', 'Human_Male_Walk', 'Human_Male', 'Human', 'Adam']
    },
    {
        name: 'Human_Male_2_Walk',
        gender: 'male',
        file: 'art/raw/human_male_var2_pro_4d_walk.png',
        refStand: { r: 0, c: 1 },
        south: [ { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 } ],
        west:  [ { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 } ],
        north: [ { r: 2, c: 0 }, { r: 2, c: 2 }, { r: 2, c: 1 } ],
        aliases: ['Human_Male_2']
    },
    {
        name: 'Human_Male_3_Walk',
        gender: 'male',
        file: 'art/raw/human_male_var3_pro_4d_walk.png',
        refStand: { r: 0, c: 1 },
        south: [ { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 } ],
        west:  [ { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 } ],
        north: [ { r: 2, c: 1 }, { r: 2, c: 3 }, { r: 2, c: 2 } ],
        aliases: ['Human_Male_3']
    },
    {
        name: 'Human_Male_4_Walk',
        gender: 'male',
        file: 'art/raw/human_male_var4_pro_4d_walk.png',
        refStand: { r: 0, c: 1 },
        south: [ { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 } ],
        west:  [ { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 } ],
        north: [ { r: 2, c: 0 }, { r: 2, c: 2 }, { r: 2, c: 1 } ],
        aliases: ['Human_Male_4']
    },
    {
        name: 'Human_Male_5_Walk',
        gender: 'male',
        file: 'art/raw/human_male_var5_pro_4d_walk.png',
        refStand: { r: 0, c: 1 },
        south: [ { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 } ],
        west:  [ { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 } ],
        north: [ { r: 2, c: 0 }, { r: 2, c: 2 }, { r: 2, c: 0, mirror: true } ],
        aliases: ['Human_Male_5']
    },
    {
        name: 'Human_Male_6_Walk',
        gender: 'male',
        file: 'art/raw/human_male_var6_pro_4d_walk.png',
        refStand: { r: 0, c: 1 },
        south: [ { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 } ],
        west:  [ { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 } ],
        north: [ { r: 2, c: 0 }, { r: 2, c: 2 }, { r: 2, c: 1 } ],
        aliases: ['Human_Male_6']
    },
    // 2. Females 1..6
    {
        name: 'Human_Female_1_Walk',
        gender: 'female',
        file: 'art/raw/human_female_pro_4d_walk.png',
        refStand: { r: 0, c: 1 },
        south: [ { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 } ],
        west:  [ { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 } ],
        north: [ { r: 2, c: 0 }, { r: 2, c: 2 }, { r: 2, c: 1 } ],
        aliases: ['Human_Female_1', 'Human_Female_Walk', 'Human_Female', 'Eve']
    },
    {
        name: 'Human_Female_2_Walk',
        gender: 'female',
        file: 'art/raw/human_female_var2_pro_4d_walk.png',
        refStand: { r: 0, c: 1 },
        south: [ { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 } ],
        west:  [ { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 } ],
        north: [ { r: 2, c: 0 }, { r: 2, c: 2 }, { r: 2, c: 1 } ],
        aliases: ['Human_Female_2']
    },
    {
        name: 'Human_Female_3_Walk',
        gender: 'female',
        file: 'art/raw/human_female_var3_pro_4d_walk.png',
        refStand: { r: 0, c: 1 },
        south: [ { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 } ],
        west:  [ { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 } ],
        north: [ { r: 2, c: 0 }, { r: 2, c: 2 }, { r: 2, c: 1 } ],
        aliases: ['Human_Female_3']
    },
    {
        name: 'Human_Female_4_Walk',
        gender: 'female',
        file: 'art/raw/human_female_var4_pro_4d_walk.png',
        refStand: { r: 0, c: 1 },
        south: [ { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 } ],
        west:  [ { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 } ],
        north: [ { r: 2, c: 0 }, { r: 2, c: 2 }, { r: 2, c: 1 } ],
        aliases: ['Human_Female_4']
    },
    {
        name: 'Human_Female_5_Walk',
        gender: 'female',
        file: 'art/raw/human_female_var5_pro_4d_walk.png',
        refStand: { r: 0, c: 1 },
        south: [ { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 } ],
        west:  [ { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 } ],
        north: [ { r: 2, c: 0 }, { r: 2, c: 2 }, { r: 2, c: 1 } ],
        aliases: ['Human_Female_5']
    },
    {
        name: 'Human_Female_6_Walk',
        gender: 'female',
        file: 'art/raw/human_female_var6_pro_4d_walk.png',
        refStand: { r: 0, c: 1 },
        south: [ { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 } ],
        west:  [ { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 } ],
        north: [ { r: 2, c: 0 }, { r: 2, c: 2 }, { r: 2, c: 1 } ],
        aliases: ['Human_Female_6']
    }
];

for (const cfg of SHEETS) {
    const img = decodePNG(fs.readFileSync(cfg.file));
    const sheet = assembleProSheet(img, cfg);
    const mainFile = path.join(CHAR_DIR, `$UF_${cfg.name}.png`);
    writePNG(mainFile, 144, 192, sheet);
    saveSidecar(cfg.name, cfg.gender);
    console.log(`Saved ${mainFile}`);

    for (const alias of (cfg.aliases || [])) {
        const aliasFile = alias === 'Adam' || alias === 'Eve'
            ? path.join(CHAR_DIR, `$${alias}.png`)
            : path.join(CHAR_DIR, `$UF_${alias}.png`);
        writePNG(aliasFile, 144, 192, sheet);
        if (alias !== 'Adam' && alias !== 'Eve') saveSidecar(alias, cfg.gender);
        console.log(`  -> Alias: ${aliasFile}`);
    }
}

console.log('All 12 human master walk sheets successfully compiled and deployed!');
