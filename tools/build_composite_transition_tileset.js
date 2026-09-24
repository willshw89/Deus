#!/usr/bin/env node
'use strict';

/**
 * tools/build_composite_transition_tileset.js
 *
 * Compiles authentic native 48px Temperate and Arid assets into
 * composite RMMZ tileset sheets for in-engine testing:
 * - Outside_A2.png (768x576, 32 autotile blocks of 96x144)
 * - Outside_B.png  (768x768, Cell [0,0] transparent, 256 tiles)
 * - Outside_C.png  (768x768, Standard Trees: Oak, Birch, Pine, Acacia, Palm, Olive)
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const { createBlankSheet, blitCell } = require('./pack_deus_tileset');

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

            if (isBgRejection && isBgRejection(r, g, b, a, sx, sy)) {
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

function extractSprite(srcImg, srcX, srcY, srcW, srcH, isBg, targetW, targetH) {
    const buf = Buffer.alloc(targetW * targetH * 4, 0);
    const scale = Math.min(targetW / srcW, targetH / srcH);
    const scaledW = Math.round(srcW * scale);
    const scaledH = Math.round(srcH * scale);
    const offsetX = Math.floor((targetW - scaledW) / 2);
    const offsetY = targetH - scaledH; // Anchor to bottom baseline

    for (let dy = 0; dy < scaledH; dy++) {
        for (let dx = 0; dx < scaledW; dx++) {
            const sx = srcX + Math.floor(dx / scale);
            const sy = srcY + Math.floor(dy / scale);
            if (sx >= srcImg.width || sy >= srcImg.height) continue;
            const si = (sy * srcImg.width + sx) * 4;
            const r = srcImg.data[si];
            const g = srcImg.data[si + 1];
            const b = srcImg.data[si + 2];
            const a = srcImg.data[si + 3];

            if (isBg && isBg(r, g, b, a, sx, sy)) continue;
            if (a >= 32) {
                const s = snap(r, g, b);
                const di = ((offsetY + dy) * targetW + (offsetX + dx)) * 4;
                buf[di]     = s[0];
                buf[di + 1] = s[1];
                buf[di + 2] = s[2];
                buf[di + 3] = 255;
            }
        }
    }
    return buf;
}

function blitBuffer(srcBuf, srcW, srcH, dstBuf, dstW, dstH, dstX, dstY) {
    for (let y = 0; y < srcH; y++) {
        for (let x = 0; x < srcW; x++) {
            const dx = dstX + x;
            const dy = dstY + y;
            if (dx < 0 || dx >= dstW || dy < 0 || dy >= dstH) continue;
            const si = (y * srcW + x) * 4;
            if (srcBuf[si + 3] === 0) continue;
            const di = (dy * dstW + dx) * 4;
            dstBuf[di]     = srcBuf[si];
            dstBuf[di + 1] = srcBuf[si + 1];
            dstBuf[di + 2] = srcBuf[si + 2];
            dstBuf[di + 3] = 255;
        }
    }
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
    const rawTempFlora  = decodePNG(fs.readFileSync(path.join(TEMP_RAW, 'temp_clean_flora.png')));
    const rawTempTrees  = decodePNG(fs.readFileSync(path.join(TEMP_RAW, 'temp_clean_trees.png')));

    const rawAridGround = decodePNG(fs.readFileSync(path.join(ARID_RAW, 'arid_z0_ground_matrix.png')));
    const rawAridFlora  = decodePNG(fs.readFileSync(path.join(ARID_RAW, 'arid_z0_flora_clutter_matrix.png')));
    const rawAridTrees  = decodePNG(fs.readFileSync(path.join(ARID_RAW, 'arid_z0_standard_trees_matrix.png')));

    // -------------------------------------------------------------
    // 1. Build Composite Outside_A2.png (768x576)
    // -------------------------------------------------------------
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
    // 2. Build Composite Outside_B.png (768x768) - Flora & Clutter
    // -------------------------------------------------------------
    const sheetB = createBlankSheet('B');
    // Cell [0,0] is transparent eraser

    // Background rejection helpers:
    // Reject neutral grey ~70..95 and bright white text pixels ~185..255
    const isTempFloraBg = (r, g, b) => {
        if (r > 185 && g > 185 && b > 185) return true; // Reject white header text
        return (Math.abs(r - g) < 6 && Math.abs(g - b) < 6 && r >= 65 && r <= 95);
    };
    const isAridDarkGrey = (r, g, b, a, sx, sy) => {
        if (sy >= 835 && sy <= 845) return true; // Separator line above static clutter
        return (Math.abs(r - g) < 6 && Math.abs(g - b) < 6 && r >= 65 && r <= 95);
    };

    // Row 0: Temperate Flora & Clutter (from temp_clean_flora.png)
    // Grasses (Item 0, 1, 2)
    const grass1 = sampleCell48(rawTempFlora, 10, 50, 140, 130, isTempFloraBg);
    blitCell(grass1, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 1 * 48, 0 * 48);
    const grass2 = sampleCell48(rawTempFlora, 185, 50, 140, 130, isTempFloraBg);
    blitCell(grass2, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 2 * 48, 0 * 48);
    const grass3 = sampleCell48(rawTempFlora, 355, 50, 140, 130, isTempFloraBg);
    blitCell(grass3, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 3 * 48, 0 * 48);

    // Flowers: Bluebells, Poppies, Daisies
    const bluebells = sampleCell48(rawTempFlora, 20, 240, 310, 125, isTempFloraBg);
    blitCell(bluebells, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 4 * 48, 0 * 48);
    const poppies = sampleCell48(rawTempFlora, 350, 240, 310, 125, isTempFloraBg);
    blitCell(poppies, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 5 * 48, 0 * 48);
    const daisies = sampleCell48(rawTempFlora, 860, 310, 125, 65, isTempFloraBg);
    blitCell(daisies, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 6 * 48, 0 * 48);

    // Bushes: Green Bush, Bramble, Autumn
    const bushG = sampleCell48(rawTempFlora, 25, 435, 310, 135, isTempFloraBg);
    blitCell(bushG, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 7 * 48, 0 * 48);
    const bushB = sampleCell48(rawTempFlora, 345, 435, 220, 135, isTempFloraBg);
    blitCell(bushB, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 8 * 48, 0 * 48);
    const bushA = sampleCell48(rawTempFlora, 720, 435, 250, 110, isTempFloraBg);
    blitCell(bushA, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 9 * 48, 0 * 48);

    // Reeds: River Reeds, Cattails, River Fern
    const reedR = sampleCell48(rawTempFlora, 20, 640, 310, 150, isTempFloraBg);
    blitCell(reedR, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 10 * 48, 0 * 48);
    const reedC = sampleCell48(rawTempFlora, 345, 640, 270, 150, isTempFloraBg);
    blitCell(reedC, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 11 * 48, 0 * 48);
    const reedF = sampleCell48(rawTempFlora, 720, 640, 255, 145, isTempFloraBg);
    blitCell(reedF, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 12 * 48, 0 * 48);

    // Static Clutter: Pebbles, Granite Rock, Mossy Boulder
    const clutP = sampleCell48(rawTempFlora, 20, 850, 150, 135, isTempFloraBg);
    blitCell(clutP, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 13 * 48, 0 * 48);
    const clutR = sampleCell48(rawTempFlora, 175, 850, 160, 135, isTempFloraBg);
    blitCell(clutR, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 14 * 48, 0 * 48);
    const clutB = sampleCell48(rawTempFlora, 345, 850, 150, 135, isTempFloraBg);
    blitCell(clutB, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 15 * 48, 0 * 48);

    // Row 1: Arid Flora & Clutter (from arid_z0_flora_clutter_matrix.png)
    // Bunchgrass
    const aridGrass = sampleCell48(rawAridFlora, 20, 20, 90, 90, isAridDarkGrey);
    blitCell(aridGrass, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 0 * 48, 1 * 48);
    // Sage scrub
    const aridScrub = sampleCell48(rawAridFlora, 20, 140, 90, 130, isAridDarkGrey);
    blitCell(aridScrub, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 1 * 48, 1 * 48);
    // Aloe succulent
    const aridAloe = sampleCell48(rawAridFlora, 20, 390, 90, 90, isAridDarkGrey);
    blitCell(aridAloe, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 2 * 48, 1 * 48);
    // Reeds
    const aridReeds = sampleCell48(rawAridFlora, 20, 520, 90, 190, isAridDarkGrey);
    blitCell(aridReeds, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 3 * 48, 1 * 48);
    // Caliche pebbles
    const aridCaliche = sampleCell48(rawAridFlora, 20, 855, 140, 130, isAridDarkGrey);
    blitCell(aridCaliche, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 4 * 48, 1 * 48);
    // Sandstone rock
    const aridRock = sampleCell48(rawAridFlora, 180, 855, 140, 130, isAridDarkGrey);
    blitCell(aridRock, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 5 * 48, 1 * 48);
    // Sandstone boulder
    const aridBoulder = sampleCell48(rawAridFlora, 350, 855, 150, 150, isAridDarkGrey);
    blitCell(aridBoulder, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 6 * 48, 1 * 48);
    // Horned Skull
    const aridSkull = sampleCell48(rawAridFlora, 520, 855, 150, 150, isAridDarkGrey);
    blitCell(aridSkull, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 7 * 48, 1 * 48);
    // Driftwood
    const aridDriftwood = sampleCell48(rawAridFlora, 690, 855, 150, 150, isAridDarkGrey);
    blitCell(aridDriftwood, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 8 * 48, 1 * 48);
    // Cactus
    const aridCactus = sampleCell48(rawAridFlora, 860, 855, 150, 150, isAridDarkGrey);
    blitCell(aridCactus, 48, 48, 0, 0, 48, 48, sheetB.buffer, 768, 768, 9 * 48, 1 * 48);

    // Erase any stray edge pixels along y=47, y=48, y=95
    for (let x = 0; x < 768; x++) {
        for (const ey of [0, 47, 48, 95]) {
            const di = (ey * 768 + x) * 4;
            // If surrounded above or below by transparent pixels, clear it
            sheetB.buffer[di + 3] = 0;
        }
    }

    quantizeTo32(sheetB.buffer, 768, 768);
    writePNG(path.join(targetTilesetsDir, 'Outside_B.png'), 768, 768, sheetB.buffer);
    console.log('Assembled composite Outside_B.png');

    // -------------------------------------------------------------
    // 3. Build Composite Outside_C.png (768x768) - Trees
    // -------------------------------------------------------------
    // Standard Overworld Trees:
    // Oak: 2x2 tiles (96x96 px), height ~84 px, width ~56 px centered at col 0..1, row 0..1
    // Birch: 1x2 tiles (48x96 px), height ~88 px, width ~36 px centered at col 2, row 0..1
    // Pine: 1x2 tiles (48x96 px), height ~92 px, width ~40 px centered at col 3, row 0..1
    // Acacia: 2x2 tiles (96x96 px), height ~84 px, width ~52 px centered at col 4..5, row 0..1
    // Palm: 1x2 tiles (48x96 px), height ~88 px, width ~32 px centered at col 6, row 0..1
    // Olive: 1x2 tiles (48x96 px), height ~78 px, width ~28 px centered at col 7, row 0..1
    const sheetC = createBlankSheet('C');

    const isTempTreeBg = (r, g, b, a, x, y) => {
        if (y >= 680) return true; // Baseline & labels
        return (Math.abs(r - g) < 5 && Math.abs(g - b) < 5 && r > 70 && r < 95);
    };

    const isAridTreeBg = (r, g, b, a, x, y) => {
        if (y >= 865) return true; // Baseline & labels
        // Exclude human colonist (x < 205 && y > 630)
        if (x < 205 && y > 630) return true;
        return (Math.abs(r - g) < 5 && Math.abs(g - b) < 5 && r > 70 && r < 95);
    };

    // Extract Oak (96x96 px, anchored bottom)
    const oakBuf = extractSprite(rawTempTrees, 163, 151, 358, 529, isTempTreeBg, 96, 96);
    blitBuffer(oakBuf, 96, 96, sheetC.buffer, 768, 768, 0 * 48, 0 * 48);

    // Extract Birch (48x96 px, anchored bottom)
    const birchBuf = extractSprite(rawTempTrees, 520, 140, 210, 540, isTempTreeBg, 48, 96);
    blitBuffer(birchBuf, 48, 96, sheetC.buffer, 768, 768, 2 * 48, 0 * 48);

    // Extract Pine (48x96 px, anchored bottom)
    const pineBuf = extractSprite(rawTempTrees, 740, 127, 241, 553, isTempTreeBg, 48, 96);
    blitBuffer(pineBuf, 48, 96, sheetC.buffer, 768, 768, 3 * 48, 0 * 48);

    // Extract Acacia (96x96 px, anchored bottom) - Crop Acacia only (x=170..515)
    const acaciaBuf = extractSprite(rawAridTrees, 170, 120, 345, 745, isAridTreeBg, 96, 96);
    blitBuffer(acaciaBuf, 96, 96, sheetC.buffer, 768, 768, 4 * 48, 0 * 48);

    // Extract Palm (48x96 px, anchored bottom) - Crop Palm only (x=518..745)
    const palmBuf = extractSprite(rawAridTrees, 518, 88, 225, 777, isAridTreeBg, 48, 96);
    blitBuffer(palmBuf, 48, 96, sheetC.buffer, 768, 768, 6 * 48, 0 * 48);

    // Extract Olive (48x96 px, anchored bottom) - Crop Olive only (x=755..990)
    const oliveBuf = extractSprite(rawAridTrees, 755, 175, 235, 690, isAridTreeBg, 48, 96);
    blitBuffer(oliveBuf, 48, 96, sheetC.buffer, 768, 768, 7 * 48, 0 * 48);

    quantizeTo32(sheetC.buffer, 768, 768);
    writePNG(path.join(targetTilesetsDir, 'Outside_C.png'), 768, 768, sheetC.buffer);
    console.log('Assembled composite Outside_C.png');
}

module.exports = { buildCompositeSheets };

if (require.main === module) {
    buildCompositeSheets(path.join(ROOT, 'game', 'img', 'tilesets'));
}
