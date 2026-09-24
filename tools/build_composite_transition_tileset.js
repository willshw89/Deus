#!/usr/bin/env node
'use strict';

/**
 * tools/build_composite_transition_tileset.js
 *
 * Compiles authentic native 48px Temperate and Arid assets into
 * composite RMMZ tileset sheets for in-engine testing:
 * - Outside_A2.png (768x576, 32 autotile blocks of 96x144)
 * - Outside_B.png  (768x768, Cell [0,0] transparent, 256 tiles)
 * - Outside_C.png  (768x768, Standard Trees: Oak, Birch, Olive, Acacia, Palm)
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const { createBlankSheet, blitCell, validateAssembledSheet } = require('./pack_deus_tileset');

const ROOT = path.resolve(__dirname, '..');
const TEMP_RAW = path.join(ROOT, 'art', 'source', 'biomes', 'temperate_z0', 'raw');
const ARID_RAW = path.join(ROOT, 'art', 'source', 'biomes', 'arid_z0', 'raw');
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

function sampleCell48(srcImg, cx, cy, cw, ch, isBgRejection) {
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

            if (isBgRejection && isBgRejection(r, g, b, a)) {
                continue;
            }

            if (a >= 32) {
                const s = snap(r, g, b);
                const di = (y * 48 + x) * 4;
                buf[di]     = s[0];
                buf[di + 1] = s[1];
                buf[di + 2] = s[2];
                buf[di + 3] = 255;
            }
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

function buildCompositeSheets(targetTilesetsDir) {
    fs.mkdirSync(targetTilesetsDir, { recursive: true });

    // Load raw sources
    const rawTempGround = decodePNG(fs.readFileSync(path.join(TEMP_RAW, 'temp_z0_ground_matrix.png')));
    const rawTempFlora  = decodePNG(fs.readFileSync(path.join(TEMP_RAW, 'temp_z0_flora_clutter_matrix.png')));
    const rawTempTrees  = decodePNG(fs.readFileSync(path.join(TEMP_RAW, 'temp_z0_standard_trees_matrix.png')));

    const rawAridGround = decodePNG(fs.readFileSync(path.join(ARID_RAW, 'arid_z0_ground_matrix.png')));
    const rawAridFlora  = decodePNG(fs.readFileSync(path.join(ARID_RAW, 'arid_z0_flora_clutter_matrix.png')));
    const rawAridTrees  = decodePNG(fs.readFileSync(path.join(ARID_RAW, 'arid_z0_standard_trees_matrix.png')));

    // -------------------------------------------------------------
    // 1. Build Composite Outside_A2.png (768x576)
    // -------------------------------------------------------------
    // 8 columns x 4 rows of 96x144 px autotile blocks (32 blocks total)
    // Row 0:
    // Block 0: Temperate Core Turf
    // Block 1: Temperate-to-Arid Olive Turf
    // Block 2: Shared Ecotone Mottled Soil
    // Block 3: Arid-to-Temperate Steppe Clay
    // Block 4: Arid Core Hardpan Sand
    // Block 5: Arid Core Cracked Caliche
    // Block 6: Dirt Road / Trail
    // Block 7: Steppe Gravel
    const sheetA2 = createBlankSheet('A2');

    const turfTile    = sampleCell48(rawTempGround, 50, 180, 140, 140);
    const oliveTile   = sampleCell48(rawAridGround, 690, 80, 150, 150);
    const ecotoneTile = sampleCell48(rawAridGround, 860, 80, 150, 150);
    const clayTile    = sampleCell48(rawAridGround, 520, 80, 150, 150);
    const sandTile    = sampleCell48(rawAridGround, 10, 80, 150, 150);
    const calicheTile = sampleCell48(rawAridGround, 180, 80, 150, 150);
    const dirtRoadTile= sampleCell48(rawTempGround, 50, 350, 140, 140);
    const gravelTile  = sampleCell48(rawAridGround, 350, 80, 150, 150);

    const blocks = [turfTile, oliveTile, ecotoneTile, clayTile, sandTile, calicheTile, dirtRoadTile, gravelTile];

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 8; col++) {
            const tile = blocks[col];
            const blockX = col * 96;
            const blockY = row * 144;
            // Fill the 96x144 block with 2x3 tiles of 48x48
            for (let ty = 0; ty < 3; ty++) {
                for (let tx = 0; tx < 2; tx++) {
                    blitCell(tile, 48, 48, 0, 0, 48, 48, sheetA2.buffer, 768, 576, blockX + tx * 48, blockY + ty * 48);
                }
            }
        }
    }

    quantizeTo32(sheetA2.buffer, 768, 576);
    writePNG(path.join(targetTilesetsDir, 'Outside_A2.png'), 768, 576, sheetA2.buffer);
    console.log('Assembled composite Outside_A2.png');

    // -------------------------------------------------------------
    // 2. Build Composite Outside_B.png (768x768)
    // -------------------------------------------------------------
    const sheetB = createBlankSheet('B');
    // Cell [0,0] strictly transparent eraser

    // Row 0: Temperate Flora & Clutter
    // Extract temperate flora
    for (let c = 0; c < 12; c++) {
        const colX = Math.floor(c * (rawTempFlora.width / 12));
        const cell = sampleCell48(rawTempFlora, colX + 10, 20, 70, 110, (r, g, b) => (Math.abs(r - g) < 8 && Math.abs(g - b) < 8 && ((r > 120 && r < 145) || (r > 170 && r < 205))));
        blitCell(cell, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, (1 + c) * 48, 0 * 48);
    }
    // Granite boulder and rock
    const boulder = sampleCell48(rawTempFlora, 350, 830, 140, 140, (r, g, b) => (Math.abs(r - g) < 8 && Math.abs(g - b) < 8 && ((r > 120 && r < 145) || (r > 170 && r < 205))));
    blitCell(boulder, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 14 * 48, 0 * 48);
    const stump = sampleCell48(rawTempFlora, 520, 830, 140, 140, (r, g, b) => (Math.abs(r - g) < 8 && Math.abs(g - b) < 8 && ((r > 120 && r < 145) || (r > 170 && r < 205))));
    blitCell(stump, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 15 * 48, 0 * 48);

    // Row 1: Arid Flora & Clutter
    const aridDarkGrey = (r, g, b) => (Math.abs(r - g) < 6 && Math.abs(g - b) < 6 && r >= 65 && r <= 95);
    // Bunchgrass
    const aridGrass = sampleCell48(rawAridFlora, 20, 20, 90, 90, aridDarkGrey);
    blitCell(aridGrass, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 0 * 48, 1 * 48);
    // Sage scrub
    const aridScrub = sampleCell48(rawAridFlora, 20, 140, 90, 140, aridDarkGrey);
    blitCell(aridScrub, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 1 * 48, 1 * 48);
    // Aloe succulent
    const aridAloe = sampleCell48(rawAridFlora, 20, 390, 90, 100, aridDarkGrey);
    blitCell(aridAloe, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 2 * 48, 1 * 48);
    // Reeds
    const aridReeds = sampleCell48(rawAridFlora, 20, 520, 90, 200, aridDarkGrey);
    blitCell(aridReeds, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 3 * 48, 1 * 48);

    // Static arid clutter
    const aridSkull = sampleCell48(rawAridFlora, 520, 840, 150, 170, aridDarkGrey);
    blitCell(aridSkull, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 4 * 48, 1 * 48);
    const aridCactus = sampleCell48(rawAridFlora, 860, 840, 150, 170, aridDarkGrey);
    blitCell(aridCactus, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 5 * 48, 1 * 48);
    const aridBoulder = sampleCell48(rawAridFlora, 350, 840, 150, 170, aridDarkGrey);
    blitCell(aridBoulder, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 6 * 48, 1 * 48);
    const aridDriftwood = sampleCell48(rawAridFlora, 690, 840, 150, 170, aridDarkGrey);
    blitCell(aridDriftwood, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 7 * 48, 1 * 48);

    quantizeTo32(sheetB.buffer, 768, 768);
    writePNG(path.join(targetTilesetsDir, 'Outside_B.png'), 768, 768, sheetB.buffer);
    console.log('Assembled composite Outside_B.png');

    // -------------------------------------------------------------
    // 3. Build Composite Outside_C.png (768x768) - Trees
    // -------------------------------------------------------------
    const sheetC = createBlankSheet('C');
    // Oak: 48x48 tiles at (0,0) and (1,0)
    const oak = sampleCell48(rawTempTrees, 25, 110, 290, 390, (r, g, b) => (Math.abs(r - g) < 8 && Math.abs(g - b) < 8 && ((r > 120 && r < 145) || (r > 170 && r < 205))));
    blitCell(oak, 48, 48, 0, 0, 48, 48, sheetC.buffer, 768, 768, 0 * 48, 0 * 48);

    // Birch: at (2,0)
    const birch = sampleCell48(rawTempTrees, 680, 110, 140, 390, (r, g, b) => (Math.abs(r - g) < 8 && Math.abs(g - b) < 8 && ((r > 120 && r < 145) || (r > 170 && r < 205))));
    blitCell(birch, 48, 48, 0, 0, 48, 48, sheetC.buffer, 768, 768, 2 * 48, 0 * 48);

    // Acacia: at (4,0)
    const acacia = sampleCell48(rawAridTrees, 50, 110, 450, 780, aridDarkGrey);
    blitCell(acacia, 48, 48, 0, 0, 48, 48, sheetC.buffer, 768, 768, 4 * 48, 0 * 48);

    // Palm: at (6,0)
    const palm = sampleCell48(rawAridTrees, 500, 80, 270, 810, aridDarkGrey);
    blitCell(palm, 48, 48, 0, 0, 48, 48, sheetC.buffer, 768, 768, 6 * 48, 0 * 48);

    // Gnarled Olive: at (8,0)
    const olive = sampleCell48(rawAridTrees, 740, 250, 250, 650, aridDarkGrey);
    blitCell(olive, 48, 48, 0, 0, 48, 48, sheetC.buffer, 768, 768, 8 * 48, 0 * 48);

    quantizeTo32(sheetC.buffer, 768, 768);
    writePNG(path.join(targetTilesetsDir, 'Outside_C.png'), 768, 768, sheetC.buffer);
    console.log('Assembled composite Outside_C.png');
}

module.exports = { buildCompositeSheets };

if (require.main === module) {
    buildCompositeSheets(path.join(ROOT, 'game', 'img', 'tilesets'));
}
