#!/usr/bin/env node
'use strict';

/**
 * tools/build_temperate_z0_pilot_sheets.js
 *
 * Deterministically packs Phase B Pilot assets for Temperate Z0 into official RMMZ sheets:
 * - game/img/tilesets/Temperate_Z0_CORE_A2.png (768x576)
 * - game/img/tilesets/Temperate_Z0_CORE_B.png  (768x768, Cell [0,0] transparent)
 * - game/img/tilesets/Temperate_Z0_CORE_B_F02.png (768x768 companion)
 * - game/img/tilesets/Temperate_Z0_CORE_B_F03.png (768x768 companion)
 * - game/img/tilesets/Temperate_Z0_CORE_C.png  (768x768)
 * - game/data/art/animations/BIO_TEMPERATE_Z0_MANIFEST.json
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const { createBlankSheet, blitCell, validateAssembledSheet } = require('./pack_deus_tileset');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'source', 'biomes', 'temperate_z0', 'raw');
const OUT_DIR = path.join(ROOT, 'game', 'img', 'tilesets');
const ANIM_DIR = path.join(ROOT, 'game', 'data', 'art', 'animations');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(ANIM_DIR, { recursive: true });

function loadRaw(filename) {
    const p = path.join(RAW_DIR, filename);
    if (!fs.existsSync(p)) throw new Error(`Missing raw source image: ${p}`);
    return decodePNG(fs.readFileSync(p));
}

console.log('Building Temperate Z0 Pilot RMMZ sheets...');

const rawGround = loadRaw('temp_z0_ground_matrix.png');
const rawFlora  = loadRaw('temp_z0_flora_clutter_matrix.png');
const rawTrees  = loadRaw('temp_z0_standard_trees_matrix.png');

// =========================================================================
// 1. Pack Sheet B (Clutter & Flora, 768x768, 16x16 tiles of 48x48)
// =========================================================================
// Cell [0,0] is strictly transparent eraser.
// We extract the flora grid from rawFlora (1024x1024, ~9 columns x 6 rows)
// and map each cell into 48x48 tiles on Sheet B.
const sheetB_F1 = createBlankSheet('B');
const sheetB_F2 = createBlankSheet('B');
const sheetB_F3 = createBlankSheet('B');

// In rawFlora (1024x1024):
// Top rows have letter/number labels; cell width ~1024 / 9 = ~113.7 px, cell height ~1024 / 6 = ~170 px
// Let's sample and downscale/center each cell to 48x48:
const floraCols = 9;
const floraRows = 5;
const cellW = Math.floor(rawFlora.width / floraCols);
const cellH = Math.floor(rawFlora.height / 6); // 6 rows including header area

// Pack into Sheet B starting at Tile (1, 0)
// Row 0 on Sheet B:
// Tile (0,0): Transparent eraser
// Tiles (1..3, 0): Grass Tuft Var A (F1, F2, F3)
// Tiles (4..6, 0): Grass Tuft Var B (F1, F2, F3)
// Tiles (7..9, 0): Grass Tuft Var C (F1, F2, F3)
//
// In RMMZ static sheet B, we place Frame 1 for all items:
// Tile (1,0): Grass A1
// Tile (2,0): Grass B1
// Tile (3,0): Grass C1
// Tile (4,0): Bluebell D1
// Tile (5,0): Poppy E1
// Tile (6,0): Anemone F1
// Tile (7,0): Shrub G1
// Tile (8,0): Bramble H1
// Tile (9,0): Autumn Scrub I1
// Tile (10,0): Reeds J1
// Tile (11,0): Cattails K1
// Tile (12,0): River Fern L1
// Tile (13,0): Pebbles M1 (static)
// Tile (14,0): Rock N1 (static)
// Tile (15,0): Mossy Boulder O1 (static)

const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

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

function sampleTo48(srcImg, cx, cy, cw, ch) {
    const buf = Buffer.alloc(48 * 48 * 4, 0);
    // Authentic native 48x48 pixel art extraction (nearest-neighbor, no 16x16 downsample, no blur)
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
            const isChromaChecker = (Math.abs(r - g) < 8 && Math.abs(g - b) < 8 && ((r > 120 && r < 145) || (r > 170 && r < 205)));
            
            let pr = 0, pg = 0, pb = 0, pa = 0;
            if (!isChromaChecker && a >= 32) {
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

// Slice the 9 flora columns across rows
const items = [];
for (let r = 0; r < 4; r++) {
    const rowY = Math.floor(rawFlora.height * 0.08) + r * Math.floor(rawFlora.height * 0.17);
    for (let c = 0; c < 9; c++) {
        const colX = c * Math.floor(rawFlora.width / 9);
        const cellBuf = sampleTo48(rawFlora, colX + 10, rowY + 15, Math.floor(rawFlora.width / 9) - 20, Math.floor(rawFlora.height * 0.17) - 25);
        items.push(cellBuf);
    }
}

// Static clutter row (row 5)
const clutterRowY = Math.floor(rawFlora.height * 0.82);
const clutterItems = [];
for (let c = 0; c < 6; c++) {
    const colX = c * Math.floor(rawFlora.width / 6);
    const cellBuf = sampleTo48(rawFlora, colX + 10, clutterRowY + 15, Math.floor(rawFlora.width / 6) - 20, Math.floor(rawFlora.height * 0.16) - 20);
    clutterItems.push(cellBuf);
}

// Populate Sheet B Frame 1
// Place Grass A1, B1, C1 in Tile (1,0), (2,0), (3,0)
blitCell(items[0], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 1 * 48, 0 * 48); // Grass A1
blitCell(items[3], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 2 * 48, 0 * 48); // Grass B1
blitCell(items[6], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 3 * 48, 0 * 48); // Grass C1

// Place Flowers D1, E1, F1 in Tile (4,0), (5,0), (6,0)
blitCell(items[9],  48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 4 * 48, 0 * 48); // Bluebell D1
blitCell(items[12], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 5 * 48, 0 * 48); // Poppy E1
blitCell(items[15], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 6 * 48, 0 * 48); // Anemone F1

// Place Bushes G1, H1, I1 in Tile (7,0), (8,0), (9,0)
blitCell(items[18], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 7 * 48, 0 * 48); // Bush G1
blitCell(items[21], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 8 * 48, 0 * 48); // Bramble H1
blitCell(items[24], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 9 * 48, 0 * 48); // Autumn scrub I1

// Place Reeds J1, K1, L1 in Tile (10,0), (11,0), (12,0)
blitCell(items[27], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 10 * 48, 0 * 48); // Reeds J1
blitCell(items[30], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 11 * 48, 0 * 48); // Cattails K1
blitCell(items[33], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 12 * 48, 0 * 48); // River Fern L1

// Place Clutter in Tile (13,0), (14,0), (15,0) and Row 1
blitCell(clutterItems[0], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 13 * 48, 0 * 48); // Pebbles
blitCell(clutterItems[1], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 14 * 48, 0 * 48); // Rock
blitCell(clutterItems[2], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 15 * 48, 0 * 48); // Mossy Boulder
blitCell(clutterItems[3], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 0 * 48,  1 * 48); // Stump
blitCell(clutterItems[4], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 1 * 48,  1 * 48); // Log
blitCell(clutterItems[5], 48, 48, 0, 0, 48, 48, sheetB_F1.buffer, 768, 768, 2 * 48,  1 * 48); // Mushrooms

// Populate Companion Sheets F2 and F3 for animated tiles
// (Frame 2 uses columns 1, 4, 7... Frame 3 uses columns 2, 5, 8...)
blitCell(items[1],  48, 48, 0, 0, 48, 48, sheetB_F2.buffer, 768, 768, 1 * 48, 0 * 48); // Grass A2
blitCell(items[4],  48, 48, 0, 0, 48, 48, sheetB_F2.buffer, 768, 768, 2 * 48, 0 * 48); // Grass B2
blitCell(items[7],  48, 48, 0, 0, 48, 48, sheetB_F2.buffer, 768, 768, 3 * 48, 0 * 48); // Grass C2
blitCell(items[10], 48, 48, 0, 0, 48, 48, sheetB_F2.buffer, 768, 768, 4 * 48, 0 * 48); // Bluebell D2
blitCell(items[13], 48, 48, 0, 0, 48, 48, sheetB_F2.buffer, 768, 768, 5 * 48, 0 * 48); // Poppy E2
blitCell(items[16], 48, 48, 0, 0, 48, 48, sheetB_F2.buffer, 768, 768, 6 * 48, 0 * 48); // Anemone F2
blitCell(items[19], 48, 48, 0, 0, 48, 48, sheetB_F2.buffer, 768, 768, 7 * 48, 0 * 48); // Bush G2
blitCell(items[22], 48, 48, 0, 0, 48, 48, sheetB_F2.buffer, 768, 768, 8 * 48, 0 * 48); // Bramble H2
blitCell(items[25], 48, 48, 0, 0, 48, 48, sheetB_F2.buffer, 768, 768, 9 * 48, 0 * 48); // Autumn scrub I2
blitCell(items[28], 48, 48, 0, 0, 48, 48, sheetB_F2.buffer, 768, 768, 10 * 48, 0 * 48); // Reeds J2
blitCell(items[31], 48, 48, 0, 0, 48, 48, sheetB_F2.buffer, 768, 768, 11 * 48, 0 * 48); // Cattails K2
blitCell(items[34], 48, 48, 0, 0, 48, 48, sheetB_F2.buffer, 768, 768, 12 * 48, 0 * 48); // River Fern L2

blitCell(items[2],  48, 48, 0, 0, 48, 48, sheetB_F3.buffer, 768, 768, 1 * 48, 0 * 48); // Grass A3
blitCell(items[5],  48, 48, 0, 0, 48, 48, sheetB_F3.buffer, 768, 768, 2 * 48, 0 * 48); // Grass B3
blitCell(items[8],  48, 48, 0, 0, 48, 48, sheetB_F3.buffer, 768, 768, 3 * 48, 0 * 48); // Grass C3
blitCell(items[11], 48, 48, 0, 0, 48, 48, sheetB_F3.buffer, 768, 768, 4 * 48, 0 * 48); // Bluebell D3
blitCell(items[14], 48, 48, 0, 0, 48, 48, sheetB_F3.buffer, 768, 768, 5 * 48, 0 * 48); // Poppy E3
blitCell(items[17], 48, 48, 0, 0, 48, 48, sheetB_F3.buffer, 768, 768, 6 * 48, 0 * 48); // Anemone F3
blitCell(items[20], 48, 48, 0, 0, 48, 48, sheetB_F3.buffer, 768, 768, 7 * 48, 0 * 48); // Bush G3
blitCell(items[23], 48, 48, 0, 0, 48, 48, sheetB_F3.buffer, 768, 768, 8 * 48, 0 * 48); // Bramble H3
blitCell(items[26], 48, 48, 0, 0, 48, 48, sheetB_F3.buffer, 768, 768, 9 * 48, 0 * 48); // Autumn scrub I3
blitCell(items[29], 48, 48, 0, 0, 48, 48, sheetB_F3.buffer, 768, 768, 10 * 48, 0 * 48); // Reeds J3
blitCell(items[32], 48, 48, 0, 0, 48, 48, sheetB_F3.buffer, 768, 768, 11 * 48, 0 * 48); // Cattails K3
blitCell(items[35], 48, 48, 0, 0, 48, 48, sheetB_F3.buffer, 768, 768, 12 * 48, 0 * 48); // River Fern L3

// Copy static clutter to F2 and F3 as well
for (let c = 13; c < 16; c++) {
    blitCell(clutterItems[c - 13], 48, 48, 0, 0, 48, 48, sheetB_F2.buffer, 768, 768, c * 48, 0 * 48);
    blitCell(clutterItems[c - 13], 48, 48, 0, 0, 48, 48, sheetB_F3.buffer, 768, 768, c * 48, 0 * 48);
}
for (let c = 0; c < 3; c++) {
    blitCell(clutterItems[3 + c], 48, 48, 0, 0, 48, 48, sheetB_F2.buffer, 768, 768, c * 48, 1 * 48);
    blitCell(clutterItems[3 + c], 48, 48, 0, 0, 48, 48, sheetB_F3.buffer, 768, 768, c * 48, 1 * 48);
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

// Validate and quantize Sheet B
quantizeTo32(sheetB_F1.buffer, 768, 768);
quantizeTo32(sheetB_F2.buffer, 768, 768);
quantizeTo32(sheetB_F3.buffer, 768, 768);

const checkB = validateAssembledSheet(sheetB_F1);
if (!checkB.valid) throw new Error(`Sheet B validation failed: ${checkB.error}`);

writePNG(path.join(OUT_DIR, 'Temperate_Z0_CORE_B.png'), 768, 768, sheetB_F1.buffer);
writePNG(path.join(OUT_DIR, 'Temperate_Z0_CORE_B_F02.png'), 768, 768, sheetB_F2.buffer);
writePNG(path.join(OUT_DIR, 'Temperate_Z0_CORE_B_F03.png'), 768, 768, sheetB_F3.buffer);
console.log('Saved Temperate_Z0_CORE_B.png (F1, F2, F3) successfully!');

// =========================================================================
// 2. Pack Sheet C (Modular Trees, 768x768, 16x16 tiles of 48x48)
// =========================================================================
const sheetC = createBlankSheet('C');
const oakBlock = sampleTo48(rawTrees, 25, 110, 290, 390);
blitCell(oakBlock, 48, 48, 0, 0, 48, 48, sheetC.buffer, 768, 768, 0, 0);

const birchBlock = sampleTo48(rawTrees, 680, 110, 140, 390);
blitCell(birchBlock, 48, 48, 0, 0, 48, 48, sheetC.buffer, 768, 768, 48 * 2, 0);

const pineBlock = sampleTo48(rawTrees, 30, 580, 290, 410);
blitCell(pineBlock, 48, 48, 0, 0, 48, 48, sheetC.buffer, 768, 768, 48 * 4, 0);

quantizeTo32(sheetC.buffer, 768, 768);
const checkC = validateAssembledSheet(sheetC);
if (!checkC.valid) throw new Error(`Sheet C validation failed: ${checkC.error}`);
writePNG(path.join(OUT_DIR, 'Temperate_Z0_CORE_C.png'), 768, 768, sheetC.buffer);
console.log('Saved Temperate_Z0_CORE_C.png successfully!');

// =========================================================================
// 3. Pack Sheet A2 (Ground Autotiles, 768x576, 16x12 tiles)
// =========================================================================
const sheetA2 = createBlankSheet('A2');
const coreTurf = sampleTo48(rawGround, 50, 180, 140, 140);
const coreSoil = sampleTo48(rawGround, 50, 350, 140, 140);
const coreStone = sampleTo48(rawGround, 50, 520, 140, 140);
const coreMixed = sampleTo48(rawGround, 50, 690, 140, 140);

for (let by = 0; by < 12; by++) {
    for (let bx = 0; bx < 16; bx++) {
        let tex = coreTurf;
        if (by >= 6 && by < 9) tex = coreSoil;
        else if (by >= 9) tex = (bx < 8 ? coreStone : coreMixed);
        blitCell(tex, 48, 48, 0, 0, 48, 48, sheetA2.buffer, 768, 576, bx * 48, by * 48);
    }
}

quantizeTo32(sheetA2.buffer, 768, 576);
const checkA2 = validateAssembledSheet(sheetA2);
if (!checkA2.valid) throw new Error(`Sheet A2 validation failed: ${checkA2.error}`);
writePNG(path.join(OUT_DIR, 'Temperate_Z0_CORE_A2.png'), 768, 576, sheetA2.buffer);
console.log('Saved Temperate_Z0_CORE_A2.png successfully!');

// =========================================================================
// 4. Write Animation Manifest
// =========================================================================
const manifest = {
    packageId: 'BIO_TEMPERATE_Z0_CORE',
    biome: 'Temperate',
    zLevel: 'Z0',
    role: 'CORE',
    cameraDistanceLocked: '1.00x',
    frameTimeMs: 250,
    features: [
        {
            featureFamily: 'grass_tuft',
            variations: ['A', 'B', 'C'],
            frames: 3,
            tileSlots: [
                { variation: 'A', tileX: 1, tileY: 0, companionF2: { tileX: 1, tileY: 0 }, companionF3: { tileX: 1, tileY: 0 } },
                { variation: 'B', tileX: 2, tileY: 0, companionF2: { tileX: 2, tileY: 0 }, companionF3: { tileX: 2, tileY: 0 } },
                { variation: 'C', tileX: 3, tileY: 0, companionF2: { tileX: 3, tileY: 0 }, companionF3: { tileX: 3, tileY: 0 } }
            ]
        },
        {
            featureFamily: 'wildflowers',
            variations: ['bluebell', 'poppy', 'anemone'],
            frames: 3,
            tileSlots: [
                { variation: 'bluebell', tileX: 4, tileY: 0, companionF2: { tileX: 4, tileY: 0 }, companionF3: { tileX: 4, tileY: 0 } },
                { variation: 'poppy',    tileX: 5, tileY: 0, companionF2: { tileX: 5, tileY: 0 }, companionF3: { tileX: 5, tileY: 0 } },
                { variation: 'anemone',  tileX: 6, tileY: 0, companionF2: { tileX: 6, tileY: 0 }, companionF3: { tileX: 6, tileY: 0 } }
            ]
        },
        {
            featureFamily: 'shrubs_brambles',
            variations: ['shrub_green', 'bramble_berry', 'scrub_autumn'],
            frames: 3,
            tileSlots: [
                { variation: 'shrub_green',  tileX: 7, tileY: 0, companionF2: { tileX: 7, tileY: 0 }, companionF3: { tileX: 7, tileY: 0 } },
                { variation: 'bramble_berry', tileX: 8, tileY: 0, companionF2: { tileX: 8, tileY: 0 }, companionF3: { tileX: 8, tileY: 0 } },
                { variation: 'scrub_autumn',  tileX: 9, tileY: 0, companionF2: { tileX: 9, tileY: 0 }, companionF3: { tileX: 9, tileY: 0 } }
            ]
        },
        {
            featureFamily: 'water_reeds',
            variations: ['marsh_reeds', 'cattails', 'river_fern'],
            frames: 3,
            tileSlots: [
                { variation: 'marsh_reeds', tileX: 10, tileY: 0, companionF2: { tileX: 10, tileY: 0 }, companionF3: { tileX: 10, tileY: 0 } },
                { variation: 'cattails',    tileX: 11, tileY: 0, companionF2: { tileX: 11, tileY: 0 }, companionF3: { tileX: 11, tileY: 0 } },
                { variation: 'river_fern',  tileX: 12, tileY: 0, companionF2: { tileX: 12, tileY: 0 }, companionF3: { tileX: 12, tileY: 0 } }
            ]
        }
    ]
};

fs.writeFileSync(path.join(ANIM_DIR, 'BIO_TEMPERATE_Z0_MANIFEST.json'), JSON.stringify(manifest, null, 2), 'utf8');
console.log('Saved BIO_TEMPERATE_Z0_MANIFEST.json successfully!');
