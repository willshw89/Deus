#!/usr/bin/env node
'use strict';

/**
 * tools/build_arid_z0_pilot_sheets.js
 *
 * Deterministically packs Phase D Pilot assets for Arid Z0 and Arid-to-Temperate
 * into official RMMZ sheets at authentic native 48px resolution:
 * - game/img/tilesets/Arid_Z0_CORE_A2.png (768x576)
 * - game/img/tilesets/Arid_Z0_TO_TEMPERATE_A2.png (768x576)
 * - game/img/tilesets/Arid_Z0_CORE_B.png (768x768, Cell [0,0] transparent eraser)
 * - game/img/tilesets/Arid_Z0_CORE_B_F02.png (768x768 companion)
 * - game/img/tilesets/Arid_Z0_CORE_B_F03.png (768x768 companion)
 * - game/img/tilesets/Arid_Z0_CORE_C.png (768x768 modular trees)
 * - game/data/art/animations/BIO_ARID_Z0_MANIFEST.json
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const { createBlankSheet, blitCell, validateAssembledSheet } = require('./pack_deus_tileset');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'source', 'biomes', 'arid_z0', 'raw');
const OUT_DIR = path.join(ROOT, 'game', 'img', 'tilesets');
const ANIM_DIR = path.join(ROOT, 'game', 'data', 'art', 'animations');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(ANIM_DIR, { recursive: true });

function loadRaw(filename) {
    const p = path.join(RAW_DIR, filename);
    if (!fs.existsSync(p)) throw new Error(`Missing raw source image: ${p}`);
    return decodePNG(fs.readFileSync(p));
}

console.log('Building Arid Z0 & Arid-to-Temperate Pilot RMMZ sheets at native 48px resolution...');

const rawGround = loadRaw('arid_z0_ground_matrix.png');
const rawFlora  = loadRaw('arid_z0_flora_clutter_matrix.png');
const rawTrees  = loadRaw('arid_z0_standard_trees_matrix.png');

function parseHex(s) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(s).trim());
    return m ? [(parseInt(m[1], 16) >> 16) & 255, (parseInt(m[1], 16) >> 8) & 255, parseInt(m[1], 16) & 255] : null;
}

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

const hexLines = fs.readFileSync(PALETTE_FILE, 'utf8').split(/\r?\n/).filter(s => s.trim().startsWith('#'));
const palRGB = hexLines.map(parseHex).filter(Boolean);
const palLab = palRGB.map(c => srgbToLab(...c));
const snapCache = new Map();

function snap(r, g, b) {
    const key = (r << 16) | (g << 8) | b;
    if (snapCache.has(key)) return snapCache.get(key);
    const l = srgbToLab(r, g, b);
    let best = palRGB[0], bd = Infinity;
    for (let i = 0; i < palLab.length; i++) {
        const d = Math.hypot(l[0] - palLab[i][0], l[1] - palLab[i][1], l[2] - palLab[i][2]);
        if (d < bd) { bd = d; best = palRGB[i]; }
    }
    snapCache.set(key, best);
    return best;
}

// Native 48x48 nearest-neighbor sampling with background isolation & palette snapping
function sampleTo48(srcImg, cx, cy, cw, ch) {
    const buf = Buffer.alloc(48 * 48 * 4, 0);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sx = cx + Math.floor((x / 48) * cw);
            const sy = cy + Math.floor((y / 48) * ch);
            if (sx >= srcImg.width || sy >= srcImg.height) continue;
            const si = (sy * srcImg.width + sx) * 4;
            const r = srcImg.data[si];
            const g = srcImg.data[si + 1];
            const b = srcImg.data[si + 2];
            const a = srcImg.data[si + 3];

            // Rejection for neutral dark grey background around flora/clutter (rgb ~ 60..90)
            const isDarkGreyBg = (Math.abs(r - g) < 6 && Math.abs(g - b) < 6 && r >= 65 && r <= 95);
            
            let pr = 0, pg = 0, pb = 0, pa = 0;
            if (!isDarkGreyBg && a >= 32) {
                const snapped = snap(r, g, b);
                pr = snapped[0];
                pg = snapped[1];
                pb = snapped[2];
                pa = 255;
            }

            const di = (y * 48 + x) * 4;
            buf[di]     = pr;
            buf[di + 1] = pg;
            buf[di + 2] = pb;
            buf[di + 3] = pa;
        }
    }
    return buf;
}

function quantizeTo32(buf, w, h) {
    const counts = new Map();
    for (let i = 0; i < w * h; i++) {
        const di = i * 4;
        if (buf[di + 3] === 0) continue;
        const key = (buf[di] << 16) | (buf[di + 1] << 8) | buf[di + 2];
        counts.set(key, (counts.get(key) || 0) + 1);
    }
    if (counts.size <= 32) return;
    
    // Sort colors by frequency descending, take top 32
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const top32 = sorted.slice(0, 32).map(e => [
        (e[0] >> 16) & 255,
        (e[0] >> 8) & 255,
        e[0] & 255
    ]);
    const top32Lab = top32.map(c => srgbToLab(...c));
    const reCache = new Map();

    for (let i = 0; i < w * h; i++) {
        const di = i * 4;
        if (buf[di + 3] === 0) continue;
        const key = (buf[di] << 16) | (buf[di + 1] << 8) | buf[di + 2];
        let rep = reCache.get(key);
        if (!rep) {
            const l = srgbToLab(buf[di], buf[di + 1], buf[di + 2]);
            let best = top32[0], bd = Infinity;
            for (let j = 0; j < top32Lab.length; j++) {
                const d = Math.hypot(l[0] - top32Lab[j][0], l[1] - top32Lab[j][1], l[2] - top32Lab[j][2]);
                if (d < bd) { bd = d; best = top32[j]; }
            }
            rep = best;
            reCache.set(key, rep);
        }
        buf[di]     = rep[0];
        buf[di + 1] = rep[1];
        buf[di + 2] = rep[2];
    }
}

// =========================================================================
// 1. Pack Sheet B (Clutter & Flora, 768x768, 16x16 tiles of 48x48)
// =========================================================================
const sheetB_F1 = createBlankSheet('B');
const sheetB_F2 = createBlankSheet('B');
const sheetB_F3 = createBlankSheet('B');

// In rawFlora (1024x1024):
// 4 animated rows (y = 0..120, 120..310, 370..500, 500..830), 9 columns each
const items = [];
const rowStarts = [0, 125, 375, 505];
const rowHeights = [115, 175, 120, 240];

for (let r = 0; r < 4; r++) {
    const rowY = rowStarts[r];
    const rH = rowHeights[r];
    for (let c = 0; c < 9; c++) {
        const colX = Math.floor(c * (rawFlora.width / 9));
        const cW = Math.floor(rawFlora.width / 9);
        const cellBuf = sampleTo48(rawFlora, colX + 4, rowY + 4, cW - 8, rH - 8);
        items.push(cellBuf);
    }
}

// Static clutter row (bottom row, y = 830..1024, 6 columns)
const clutterItems = [];
const clutterRowY = 830;
const clutterH = 190;
for (let c = 0; c < 6; c++) {
    const colX = Math.floor(c * (rawFlora.width / 6));
    const cW = Math.floor(rawFlora.width / 6);
    const cellBuf = sampleTo48(rawFlora, colX + 6, clutterRowY + 6, cW - 12, clutterH - 12);
    clutterItems.push(cellBuf);
}

// Populate Sheet B Frame 1
// Cell [0,0] is strictly transparent eraser
// Tile (1,0), (2,0), (3,0): Dry Bunchgrass Var A, B, C (Frame 1)
blitCell(items[0], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 1 * 48, 0 * 48); // Grass A1
blitCell(items[3], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 2 * 48, 0 * 48); // Grass B1
blitCell(items[6], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 3 * 48, 0 * 48); // Grass C1

// Tile (4,0), (5,0), (6,0): Sage Scrub Var A, B, C (Frame 1)
blitCell(items[9],  48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 4 * 48, 0 * 48); // Scrub A1
blitCell(items[12], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 5 * 48, 0 * 48); // Scrub B1
blitCell(items[15], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 6 * 48, 0 * 48); // Scrub C1

// Tile (7,0), (8,0), (9,0): Succulent Aloe Var A, B, C (Frame 1)
blitCell(items[18], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 7 * 48, 0 * 48); // Aloe A1
blitCell(items[21], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 8 * 48, 0 * 48); // Aloe B1
blitCell(items[24], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 9 * 48, 0 * 48); // Aloe C1

// Tile (10,0), (11,0), (12,0): Arid Reedgrass Var A, B, C (Frame 1)
blitCell(items[27], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 10 * 48, 0 * 48); // Reeds A1
blitCell(items[30], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 11 * 48, 0 * 48); // Reeds B1
blitCell(items[33], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 12 * 48, 0 * 48); // Reeds C1

// Static clutter: Tiles (13,0), (14,0), (15,0) and Row 1
blitCell(clutterItems[0], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 13 * 48, 0 * 48); // Caliche pebbles
blitCell(clutterItems[1], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 14 * 48, 0 * 48); // Sandstone rock
blitCell(clutterItems[2], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 15 * 48, 0 * 48); // Sandstone boulder
blitCell(clutterItems[3], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 0 * 48,  1 * 48); // Animal skull
blitCell(clutterItems[4], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 1 * 48,  1 * 48); // Driftwood log
blitCell(clutterItems[5], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 2 * 48,  1 * 48); // Cactus pad

// Companion Sheets F2 and F3
// Frame 2
blitCell(items[1],  48, 48, 0, 0, 48, 48, sheetB_F2.buffer, 768, 768, 1 * 48, 0 * 48); // Grass A2
blitCell(items[4],  48, 48, 0, 0, 48, 48, sheetB_F2.buffer, 768, 768, 2 * 48, 0 * 48); // Grass B2
blitCell(items[7],  48, 48, 0, 0, 48, 48, sheetB_F2.buffer, 768, 768, 3 * 48, 0 * 48); // Grass C2
blitCell(items[10], 48, 48, 0, 0, 48, 48, sheetB_F2.buffer, 768, 768, 4 * 48, 0 * 48); // Scrub A2
blitCell(items[13], 48, 48, 0, 0, 48, 48, sheetB_F2.buffer, 768, 768, 5 * 48, 0 * 48); // Scrub B2
blitCell(items[16], 48, 48, 0, 0, 48, 48, sheetB_F2.buffer, 768, 768, 6 * 48, 0 * 48); // Scrub C2
blitCell(items[19], 48, 48, 0, 0, 48, 48, sheetB_F2.buffer, 768, 768, 7 * 48, 0 * 48); // Aloe A2
blitCell(items[22], 48, 48, 0, 0, 48, 48, sheetB_F2.buffer, 768, 768, 8 * 48, 0 * 48); // Aloe B2
blitCell(items[25], 48, 48, 0, 0, 48, 48, sheetB_F2.buffer, 768, 768, 9 * 48, 0 * 48); // Aloe C2
blitCell(items[28], 48, 48, 0, 0, 48, 48, sheetB_F2.buffer, 768, 768, 10 * 48, 0 * 48); // Reeds A2
blitCell(items[31], 48, 48, 0, 0, 48, 48, sheetB_F2.buffer, 768, 768, 11 * 48, 0 * 48); // Reeds B2
blitCell(items[34], 48, 48, 0, 0, 48, 48, sheetB_F2.buffer, 768, 768, 12 * 48, 0 * 48); // Reeds C2

// Frame 3
blitCell(items[2],  48, 48, 0, 0, 48, 48, sheetB_F3.buffer, 768, 768, 1 * 48, 0 * 48); // Grass A3
blitCell(items[5],  48, 48, 0, 0, 48, 48, sheetB_F3.buffer, 768, 768, 2 * 48, 0 * 48); // Grass B3
blitCell(items[8],  48, 48, 0, 0, 48, 48, sheetB_F3.buffer, 768, 768, 3 * 48, 0 * 48); // Grass C3
blitCell(items[11], 48, 48, 0, 0, 48, 48, sheetB_F3.buffer, 768, 768, 4 * 48, 0 * 48); // Scrub A3
blitCell(items[14], 48, 48, 0, 0, 48, 48, sheetB_F3.buffer, 768, 768, 5 * 48, 0 * 48); // Scrub B3
blitCell(items[17], 48, 48, 0, 0, 48, 48, sheetB_F3.buffer, 768, 768, 6 * 48, 0 * 48); // Scrub C3
blitCell(items[20], 48, 48, 0, 0, 48, 48, sheetB_F3.buffer, 768, 768, 7 * 48, 0 * 48); // Aloe A3
blitCell(items[23], 48, 48, 0, 0, 48, 48, sheetB_F3.buffer, 768, 768, 8 * 48, 0 * 48); // Aloe B3
blitCell(items[26], 48, 48, 0, 0, 48, 48, sheetB_F3.buffer, 768, 768, 9 * 48, 0 * 48); // Aloe C3
blitCell(items[29], 48, 48, 0, 0, 48, 48, sheetB_F3.buffer, 768, 768, 10 * 48, 0 * 48); // Reeds A3
blitCell(items[32], 48, 48, 0, 0, 48, 48, sheetB_F3.buffer, 768, 768, 11 * 48, 0 * 48); // Reeds B3
blitCell(items[35], 48, 48, 0, 0, 48, 48, sheetB_F3.buffer, 768, 768, 12 * 48, 0 * 48); // Reeds C3

// Copy static clutter to F2 and F3
for (let c = 13; c < 16; c++) {
    blitCell(clutterItems[c - 13], 48, 48, 0, 0, 48, 48, sheetB_F2.buffer, 768, 768, c * 48, 0 * 48);
    blitCell(clutterItems[c - 13], 48, 48, 0, 0, 48, 48, sheetB_F3.buffer, 768, 768, c * 48, 0 * 48);
}
for (let c = 0; c < 3; c++) {
    blitCell(clutterItems[3 + c], 48, 48, 0, 0, 48, 48, sheetB_F2.buffer, 768, 768, c * 48, 1 * 48);
    blitCell(clutterItems[3 + c], 48, 48, 0, 0, 48, 48, sheetB_F3.buffer, 768, 768, c * 48, 1 * 48);
}

quantizeTo32(sheetB_F1.buffer, 768, 768);
quantizeTo32(sheetB_F2.buffer, 768, 768);
quantizeTo32(sheetB_F3.buffer, 768, 768);

const checkB = validateAssembledSheet(sheetB_F1);
if (!checkB.valid) throw new Error(`Sheet B validation failed: ${checkB.error}`);

writePNG(path.join(OUT_DIR, 'Arid_Z0_CORE_B.png'), 768, 768, sheetB_F1.buffer);
writePNG(path.join(OUT_DIR, 'Arid_Z0_CORE_B_F02.png'), 768, 768, sheetB_F2.buffer);
writePNG(path.join(OUT_DIR, 'Arid_Z0_CORE_B_F03.png'), 768, 768, sheetB_F3.buffer);
console.log('Saved Arid_Z0_CORE_B.png (F1, F2, F3) successfully!');

// =========================================================================
// 2. Pack Sheet C (Modular Trees, 768x768, 16x16 tiles of 48x48)
// =========================================================================
const sheetC = createBlankSheet('C');
// Umbrella Acacia (~84 px tall)
const acaciaBlock = sampleTo48(rawTrees, 50, 110, 450, 780);
blitCell(acaciaBlock, 48, 48, 0, 0, 48, 48, sheetC.buffer, 768, 768, 0, 0);

// Desert Palm (~88 px tall)
const palmBlock = sampleTo48(rawTrees, 500, 80, 270, 810);
blitCell(palmBlock, 48, 48, 0, 0, 48, 48, sheetC.buffer, 768, 768, 48 * 2, 0);

// Gnarled Olive (~78 px tall)
const oliveBlock = sampleTo48(rawTrees, 740, 250, 250, 650);
blitCell(oliveBlock, 48, 48, 0, 0, 48, 48, sheetC.buffer, 768, 768, 48 * 4, 0);

quantizeTo32(sheetC.buffer, 768, 768);
const checkC = validateAssembledSheet(sheetC);
if (!checkC.valid) throw new Error(`Sheet C validation failed: ${checkC.error}`);
writePNG(path.join(OUT_DIR, 'Arid_Z0_CORE_C.png'), 768, 768, sheetC.buffer);
console.log('Saved Arid_Z0_CORE_C.png successfully!');

// =========================================================================
// 3. Pack Sheet A2: Arid_Z0_CORE_A2.png (768x576)
// =========================================================================
const sheetA2_Core = createBlankSheet('A2');
const col0_sand    = sampleTo48(rawGround, 10, 80, 150, 150);   // Hardpan Sand
const col1_caliche = sampleTo48(rawGround, 180, 80, 150, 150);  // Cracked Caliche
const col2_gravel  = sampleTo48(rawGround, 350, 80, 150, 150);  // Steppe Gravel
const col3_drydirt = sampleTo48(rawGround, 520, 80, 150, 150);  // Dry Dirt

for (let by = 0; by < 12; by++) {
    for (let bx = 0; bx < 16; bx++) {
        let tex = col0_sand;
        if (by >= 4 && by < 7) tex = col1_caliche;
        else if (by >= 7 && by < 10) tex = col2_gravel;
        else if (by >= 10) tex = col3_drydirt;
        blitCell(tex, 48, 48, 0, 0, 48, 48, sheetA2_Core.buffer, 768, 576, bx * 48, by * 48);
    }
}

quantizeTo32(sheetA2_Core.buffer, 768, 576);
const checkA2Core = validateAssembledSheet(sheetA2_Core);
if (!checkA2Core.valid) throw new Error(`Sheet A2 Core validation failed: ${checkA2Core.error}`);
writePNG(path.join(OUT_DIR, 'Arid_Z0_CORE_A2.png'), 768, 576, sheetA2_Core.buffer);
console.log('Saved Arid_Z0_CORE_A2.png successfully!');

// =========================================================================
// 4. Pack Sheet A2: Arid_Z0_TO_TEMPERATE_A2.png (768x576)
// =========================================================================
const sheetA2_ToTemp = createBlankSheet('A2');
const col4_sparseturf = sampleTo48(rawGround, 690, 80, 150, 150);  // Sparse Olive Turf
const col5_transloam  = sampleTo48(rawGround, 860, 80, 150, 150);  // Transitional Loam

for (let by = 0; by < 12; by++) {
    for (let bx = 0; bx < 16; bx++) {
        let tex = (by < 6 ? col4_sparseturf : col5_transloam);
        blitCell(tex, 48, 48, 0, 0, 48, 48, sheetA2_ToTemp.buffer, 768, 576, bx * 48, by * 48);
    }
}

quantizeTo32(sheetA2_ToTemp.buffer, 768, 576);
const checkA2ToTemp = validateAssembledSheet(sheetA2_ToTemp);
if (!checkA2ToTemp.valid) throw new Error(`Sheet A2 To Temperate validation failed: ${checkA2ToTemp.error}`);
writePNG(path.join(OUT_DIR, 'Arid_Z0_TO_TEMPERATE_A2.png'), 768, 576, sheetA2_ToTemp.buffer);
console.log('Saved Arid_Z0_TO_TEMPERATE_A2.png successfully!');

// =========================================================================
// 5. Write Animation Manifest: BIO_ARID_Z0_MANIFEST.json
// =========================================================================
const manifest = {
    packageId: 'BIO_ARID_Z0_CORE',
    biome: 'Arid',
    zLevel: 'Z0',
    role: 'CORE',
    cameraDistanceLocked: '1.00x',
    frameTimeMs: 250,
    features: [
        {
            featureFamily: 'arid_bunchgrass',
            variations: ['A', 'B', 'C'],
            frames: 3,
            tileSlots: [
                { variation: 'A', tileX: 1, tileY: 0, companionF2: { tileX: 1, tileY: 0 }, companionF3: { tileX: 1, tileY: 0 } },
                { variation: 'B', tileX: 2, tileY: 0, companionF2: { tileX: 2, tileY: 0 }, companionF3: { tileX: 2, tileY: 0 } },
                { variation: 'C', tileX: 3, tileY: 0, companionF2: { tileX: 3, tileY: 0 }, companionF3: { tileX: 3, tileY: 0 } }
            ]
        },
        {
            featureFamily: 'desert_sage_scrub',
            variations: ['scrub_A', 'scrub_B', 'scrub_C'],
            frames: 3,
            tileSlots: [
                { variation: 'scrub_A', tileX: 4, tileY: 0, companionF2: { tileX: 4, tileY: 0 }, companionF3: { tileX: 4, tileY: 0 } },
                { variation: 'scrub_B', tileX: 5, tileY: 0, companionF2: { tileX: 5, tileY: 0 }, companionF3: { tileX: 5, tileY: 0 } },
                { variation: 'scrub_C', tileX: 6, tileY: 0, companionF2: { tileX: 6, tileY: 0 }, companionF3: { tileX: 6, tileY: 0 } }
            ]
        },
        {
            featureFamily: 'desert_succulents_aloe',
            variations: ['aloe_A', 'aloe_B', 'aloe_C'],
            frames: 3,
            tileSlots: [
                { variation: 'aloe_A', tileX: 7, tileY: 0, companionF2: { tileX: 7, tileY: 0 }, companionF3: { tileX: 7, tileY: 0 } },
                { variation: 'aloe_B', tileX: 8, tileY: 0, companionF2: { tileX: 8, tileY: 0 }, companionF3: { tileX: 8, tileY: 0 } },
                { variation: 'aloe_C', tileX: 9, tileY: 0, companionF2: { tileX: 9, tileY: 0 }, companionF3: { tileX: 9, tileY: 0 } }
            ]
        },
        {
            featureFamily: 'arid_canyon_reedgrass',
            variations: ['reed_A', 'reed_B', 'reed_C'],
            frames: 3,
            tileSlots: [
                { variation: 'reed_A', tileX: 10, tileY: 0, companionF2: { tileX: 10, tileY: 0 }, companionF3: { tileX: 10, tileY: 0 } },
                { variation: 'reed_B', tileX: 11, tileY: 0, companionF2: { tileX: 11, tileY: 0 }, companionF3: { tileX: 11, tileY: 0 } },
                { variation: 'reed_C', tileX: 12, tileY: 0, companionF2: { tileX: 12, tileY: 0 }, companionF3: { tileX: 12, tileY: 0 } }
            ]
        }
    ]
};

fs.writeFileSync(path.join(ANIM_DIR, 'BIO_ARID_Z0_MANIFEST.json'), JSON.stringify(manifest, null, 2), 'utf8');
console.log('Saved BIO_ARID_Z0_MANIFEST.json successfully!');
