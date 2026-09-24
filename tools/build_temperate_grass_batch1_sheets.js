#!/usr/bin/env node
'use strict';

/**
 * tools/build_temperate_grass_batch1_sheets.js
 *
 * Deterministically packs Batch 1 Grass assets into minimal legal RMMZ sheets:
 * - game/img/tilesets/Outside_A2.png (768x576, Blocks 0..3 populated with seamless grass variants, Blocks 4..31 transparent)
 * - game/img/tilesets/Outside_B.png  (768x768, Cell [0,0] transparent, Cells [1..3,0] with grass tufts Frame 1)
 * - game/img/tilesets/Outside_B_F02.png (768x768 companion Frame 2)
 * - game/img/tilesets/Outside_B_F03.png (768x768 companion Frame 3)
 * - game/img/tilesets/Outside_C.png  (768x768 transparent)
 * - game/data/art/animations/BIO_TEMPERATE_GRASS_MANIFEST.json
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const { createBlankSheet, blitCell } = require('./pack_deus_tileset');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_PNG = path.join(ROOT, 'art', 'source', 'biomes', 'temperate_z0', 'raw', 'temp_grass_batch1_source.png');
const GOLDEN_PNG = path.join(ROOT, 'art', 'review', 'world_style_a.png');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');
const OUT_DIR = path.join(ROOT, 'game', 'img', 'tilesets');
const ANIM_DIR = path.join(ROOT, 'game', 'data', 'art', 'animations');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(ANIM_DIR, { recursive: true });

// 1. Load DEUS Master Palette (256 colors)
const hexLines = fs.readFileSync(PALETTE_FILE, 'utf8').trim().split(/\r?\n/).filter(Boolean);
const PALETTE = hexLines.map(hex => {
    const num = parseInt(hex.replace('#', ''), 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
});

function srgbToLab(r, g, b) {
    const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const R = lin(r), G = lin(g), B = lin(b);
    const X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
    const Y = (R * 0.2126729 + G * 0.7151522 + B * 0.0721750);
    const Z = (R * 0.0193339 + G * 0.1191920 + B * 0.9503041) / 1.08883;
    const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (t * 24389 / 27 + 16) / 116);
    const fx = f(X), fy = f(Y), fz = f(Z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
// Dedicated 7-tone Temperate Verdant Material Family Ramp (all in uf.hex):
// 1. Deep blade shadow:           #39451C (57, 69, 28)
// 2. Swale shade / blade shadow:   #4D5D28 (77, 93, 40)
// 3. Swale base / meadow shadow:   #5D7139 (93, 113, 57)
// 4. Base Emerald Meadow:          #71864D (113, 134, 77)
// 5. Sunlit Meadow Rise:           #8A9A61 (138, 154, 97)
// 6. Sun-kissed blade highlight:   #9EAE7D (158, 174, 125)
// 7. Wildflower / clover accent:   #CAD7B6 (202, 215, 182)
const VERDANT_RAMP = [
    [57, 69, 28],
    [77, 93, 40],
    [93, 113, 57],
    [113, 134, 77],
    [138, 154, 97],
    [158, 174, 125],
    [202, 215, 182]
];

function snapToVerdantRamp(r, g, b) {
    let minD = Infinity, best = VERDANT_RAMP[3]; // default base emerald
    for (let i = 0; i < VERDANT_RAMP.length; i++) {
        const c = VERDANT_RAMP[i];
        const d = (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2;
        if (d < minD) { minD = d; best = c; }
    }
    return best;
}

// 2. Load Source Images
console.log('Loading source images...');
const srcImg = decodePNG(fs.readFileSync(SOURCE_PNG));
const goldImg = decodePNG(fs.readFileSync(GOLDEN_PNG));

/**
 * Extract a 48x48 tile from source image and snap every pixel to the verdant material ramp.
 */
function extractGrassTile(src, sx, sy) {
    const buf = Buffer.alloc(48 * 48 * 4);
    for (let dy = 0; dy < 48; dy++) {
        for (let dx = 0; dx < 48; dx++) {
            const i = ((sy + dy) * src.width + (sx + dx)) * 4;
            const [pr, pg, pb] = snapToVerdantRamp(src.data[i], src.data[i + 1], src.data[i + 2]);
            const di = (dy * 48 + dx) * 4;
            buf[di]     = pr;
            buf[di + 1] = pg;
            buf[di + 2] = pb;
            buf[di + 3] = 255;
        }
    }
    return buf;
}

/**
 * Makes a 48x48 tile seamlessly tileable across all four borders using cosine feathering.
 */
function makeSeamless48(tileBuf, blendWidth = 6) {
    const w = 48, h = 48;
    const out = Buffer.from(tileBuf);

    // Horizontal wrap: blend left x with right (w - 1 - x)
    for (let y = 0; y < h; y++) {
        for (let b = 0; b < blendWidth; b++) {
            const t = 0.5 * (1 - Math.cos((b / blendWidth) * Math.PI));
            const lIdx = (y * w + b) * 4;
            const rIdx = (y * w + (w - 1 - b)) * 4;
            for (let c = 0; c < 3; c++) {
                const mid = Math.round(0.5 * (out[lIdx + c] + out[rIdx + c]));
                out[lIdx + c] = Math.round((1 - t) * mid + t * out[lIdx + c]);
                out[rIdx + c] = Math.round((1 - t) * mid + t * out[rIdx + c]);
            }
            const [pr1, pg1, pb1] = snapToVerdantRamp(out[lIdx], out[lIdx + 1], out[lIdx + 2]);
            out[lIdx] = pr1; out[lIdx + 1] = pg1; out[lIdx + 2] = pb1;
            const [pr2, pg2, pb2] = snapToVerdantRamp(out[rIdx], out[rIdx + 1], out[rIdx + 2]);
            out[rIdx] = pr2; out[rIdx + 1] = pg2; out[rIdx + 2] = pb2;
        }
    }

    // Vertical wrap: blend top y with bottom (h - 1 - y)
    for (let x = 0; x < w; x++) {
        for (let b = 0; b < blendWidth; b++) {
            const t = 0.5 * (1 - Math.cos((b / blendWidth) * Math.PI));
            const tIdx = (b * w + x) * 4;
            const bIdx = ((h - 1 - b) * w + x) * 4;
            for (let c = 0; c < 3; c++) {
                const mid = Math.round(0.5 * (out[tIdx + c] + out[bIdx + c]));
                out[tIdx + c] = Math.round((1 - t) * mid + t * out[tIdx + c]);
                out[bIdx + c] = Math.round((1 - t) * mid + t * out[bIdx + c]);
            }
            const [pr1, pg1, pb1] = snapToVerdantRamp(out[tIdx], out[tIdx + 1], out[tIdx + 2]);
            out[tIdx] = pr1; out[tIdx + 1] = pg1; out[tIdx + 2] = pb1;
            const [pr2, pg2, pb2] = snapToVerdantRamp(out[bIdx], out[bIdx + 1], out[bIdx + 2]);
            out[bIdx] = pr2; out[bIdx + 1] = pg2; out[bIdx + 2] = pb2;
        }
    }
    return out;
}

// =========================================================================
// 3. Extract the 4 Seamless Grass Materials directly from Google Nano Banana Pro output
// =========================================================================
console.log('Extracting and processing 4 harmonious grass materials from authentic Nano Banana Pro output...');

// Tile 0: Base Emerald Turf (canonical lush temperate meadow from Block 1.1)
const rawBaseTurf = extractGrassTile(srcImg, 120, 120);
const baseEmeraldTurf = makeSeamless48(rawBaseTurf, 6);

// Tile 1: Swale Grass Variation (cooler, deeper meadow swale from Block 1.2)
const rawSwale = extractGrassTile(srcImg, 390, 120);
const swaleTurf = makeSeamless48(rawSwale, 6);

// Tile 2: Sunlit Meadow Grass Variation (warm sun-dappled rise from Block 1.3)
const rawSunlit = extractGrassTile(srcImg, 660, 120);
const sunlitTurf = makeSeamless48(rawSunlit, 6);

// Tile 3: Clover Meadow Variation (subtle clover drifts in meadow from Block 1.4)
const rawClover = extractGrassTile(srcImg, 840, 70);
const cloverTurf = makeSeamless48(rawClover, 6);

// =========================================================================
// 4. Assemble Outside_A2.png (768x576 px, 32 blocks of 96x144 px)
// =========================================================================
console.log('Assembling Outside_A2.png...');
const sheetA2 = createBlankSheet('A2');

/**
 * Fills an autotile block (96x144 px, 2x3 tiles) with a seamless 48x48 tile.
 */
function fillAutotileBlock(dstSheet, blockCol, blockRow, tile48) {
    const startX = blockCol * 96;
    const startY = blockRow * 144;
    for (let ty = 0; ty < 3; ty++) {
        for (let tx = 0; tx < 2; tx++) {
            blitCell(tile48, 48, 48, 0, 0, 48, 48,
                     dstSheet.buffer, dstSheet.width, dstSheet.height,
                     startX + tx * 48, startY + ty * 48);
        }
    }
}

// Populate the 4 grass variations in the first 4 blocks of row 0
fillAutotileBlock(sheetA2, 0, 0, baseEmeraldTurf); // Block 0: Base Emerald Turf
fillAutotileBlock(sheetA2, 1, 0, swaleTurf);       // Block 1: Swale Turf
fillAutotileBlock(sheetA2, 2, 0, sunlitTurf);      // Block 2: Sunlit Turf
fillAutotileBlock(sheetA2, 3, 0, cloverTurf);      // Block 3: Clover Meadow Turf

// Blocks 4..31 intentionally remain 100% transparent black (unpopulated)

// =========================================================================
// 5. Extract 3 Grass Tufts x 3 Animation Frames for Outside_B
// =========================================================================
console.log('Extracting grass tufts...');

// In srcImg (1200x896), Row 3 columns:
// Var 1: F1 [30..131], F2 [150..251], F3 [270..371], Y: [780..844]
// Var 2: F1 [420..517], F2 [535..631], F3 [649..746], Y: [780..844]
// Var 3: F1 [794..899], F2 [918..1024], F3 [1042..1147], Y: [780..844]
const tuftSpecs = [
    { name: 'SlenderBlades', f1: [44, 780, 70, 65], f2: [164, 780, 70, 65], f3: [284, 780, 70, 65] },
    { name: 'CloverCluster', f1: [430, 780, 75, 65], f2: [545, 780, 75, 65], f3: [659, 780, 75, 65] },
    { name: 'WildFieldGrass', f1: [805, 780, 80, 65], f2: [930, 780, 80, 65], f3: [1055, 780, 80, 65] }
];

function extractTuftSprite(src, sx, sy, sw, sh, targetH = 16) {
    const targetW = Math.round((sw / sh) * targetH);
    const cell = Buffer.alloc(48 * 48 * 4, 0); // transparent
    const offsetX = Math.floor((48 - targetW) / 2);
    const offsetY = 47 - targetH; // anchor at bottom (baseline y=47)

    for (let dy = 0; dy < targetH; dy++) {
        for (let dx = 0; dx < targetW; dx++) {
            const srcX = Math.min(src.width - 1, Math.round(sx + (dx * sw) / targetW));
            const srcY = Math.min(src.height - 1, Math.round(sy + (dy * sh) / targetH));
            const si = (srcY * src.width + srcX) * 4;
            const r = src.data[si], g = src.data[si + 1], b = src.data[si + 2];

            // Filter out light grey background/checkerboard in AI output
            const isBg = (r > 190 && g > 190 && b > 190) || (Math.abs(r - 74) < 15 && Math.abs(g - 74) < 15 && Math.abs(b - 74) < 15);
            if (!isBg && (g > 50 || (r < 50 && g < 50 && b < 50))) {
                const [pr, pg, pb] = snapToVerdantRamp(r, g, b);
                const di = ((offsetY + dy) * 48 + (offsetX + dx)) * 4;
                cell[di]     = pr;
                cell[di + 1] = pg;
                cell[di + 2] = pb;
                cell[di + 3] = 255;
            }
        }
    }
    return cell;
}

const sheetB_F1 = createBlankSheet('B');
const sheetB_F2 = createBlankSheet('B');
const sheetB_F3 = createBlankSheet('B');

// Cell [0,0] is strictly transparent eraser (leave cell 0 untouched)
for (let i = 0; i < tuftSpecs.length; i++) {
    const spec = tuftSpecs[i];
    const col = i + 1; // Col 1, 2, 3
    const t1 = extractTuftSprite(srcImg, spec.f1[0], spec.f1[1], spec.f1[2], spec.f1[3], 15);
    const t2 = extractTuftSprite(srcImg, spec.f2[0], spec.f2[1], spec.f2[2], spec.f2[3], 15);
    const t3 = extractTuftSprite(srcImg, spec.f3[0], spec.f3[1], spec.f3[2], spec.f3[3], 15);

    blitCell(t1, 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, col * 48, 0);
    blitCell(t2, 48, 48, 0, 0, 48, 48, sheetB_F2.buffer, 768, 768, col * 48, 0);
    blitCell(t3, 48, 48, 0, 0, 48, 48, sheetB_F3.buffer, 768, 768, col * 48, 0);
}

// =========================================================================
// 6. Write All Tileset Sheets
// =========================================================================
console.log('Writing packed sheets to game/img/tilesets/...');

function exportSheet(filename, sheetObj) {
    const outPath = path.join(OUT_DIR, filename);
    writePNG(outPath, sheetObj.width, sheetObj.height, sheetObj.buffer);
    console.log(`  Wrote ${filename} (${sheetObj.width}x${sheetObj.height})`);
}

exportSheet('Outside_A2.png', sheetA2);
exportSheet('Outside_B.png', sheetB_F1);
exportSheet('Outside_B_F02.png', sheetB_F2);
exportSheet('Outside_B_F03.png', sheetB_F3);

// Legal empty sheets for unused slots in Batch 1
exportSheet('Outside_A1.png', createBlankSheet('A1'));
exportSheet('Outside_A3.png', createBlankSheet('A3'));
exportSheet('Outside_A4.png', createBlankSheet('A4'));
exportSheet('Outside_A5.png', createBlankSheet('A5'));
exportSheet('Outside_C.png', createBlankSheet('C'));
exportSheet('Outside_D.png', createBlankSheet('D'));
exportSheet('Outside_E.png', createBlankSheet('E'));

// Save Animation Manifest
const manifest = {
    biome: "Temperate_Z0",
    batch: "Batch1_Grass",
    engineTarget: "RPG Maker MZ",
    framesPerLoop: 3,
    animatedFeatures: [
        { slot: "B", col: 1, row: 0, name: "Tuft_SlenderBlades", frames: ["Outside_B.png", "Outside_B_F02.png", "Outside_B_F03.png"] },
        { slot: "B", col: 2, row: 0, name: "Tuft_CloverCluster", frames: ["Outside_B.png", "Outside_B_F02.png", "Outside_B_F03.png"] },
        { slot: "B", col: 3, row: 0, name: "Tuft_WildFieldGrass", frames: ["Outside_B.png", "Outside_B_F02.png", "Outside_B_F03.png"] }
    ]
};
fs.writeFileSync(path.join(ANIM_DIR, 'BIO_TEMPERATE_GRASS_MANIFEST.json'), JSON.stringify(manifest, null, 2), 'utf8');
console.log('Wrote BIO_TEMPERATE_GRASS_MANIFEST.json');
console.log('Batch 1 Grass Packing COMPLETE.');
