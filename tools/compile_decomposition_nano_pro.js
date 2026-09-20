'use strict';

/**
 * tools/compile_decomposition_nano_pro.js
 *
 * Compiles authentic 16-bit Google Nano Banana Pro decomposition animation and skeleton sheets:
 * - Humanoid Decomposition (! $UF_Decomposition_Human.png & .json)
 * - Beast Decomposition     (! $UF_Decomposition_Beast.png & .json)
 * - Skeletons & Remains     (! $UF_Skeleton.png & .json)
 *
 * Sized 144x192 px (3 cols x 4 rows of 48x48 px frames).
 * Snapped strictly to art/palette/uf.hex (<= 31 colors, 100% binary transparency).
 */

const fs = require('fs');
const path = require('path');
const { readPNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const RAW_PATH = path.join(ROOT, 'art', 'raw', 'decomposition_nano_pro.png');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

fs.mkdirSync(CHAR_DIR, { recursive: true });
fs.mkdirSync(REVIEW_DIR, { recursive: true });

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
    const f = (t) => t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16 / 116);
    const fX = f(X), fY = f(Y), fZ = f(Z);
    return [116 * fY - 16, 500 * (fX - fY), 200 * (fY - fZ)];
}

function labDist(a, b) {
    const dL = a[0] - b[0], da = a[1] - b[1], db = a[2] - b[2];
    return dL * dL + da * da + db * db;
}

function loadPalette() {
    const text = fs.readFileSync(PALETTE_FILE, 'utf8');
    const unique = [];
    const seen = new Set();
    for (const line of text.split(/\r?\n/)) {
        const rgb = parseHex(line);
        if (!rgb) continue;
        const k = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
        if (!seen.has(k)) {
            seen.add(k);
            unique.push(rgb);
        }
    }
    const lab = unique.map(c => srgbToLab(...c));
    const cache = new Map();
    return {
        snap(r, g, b) {
            const k = (r << 16) | (g << 8) | b;
            if (cache.has(k)) return cache.get(k);
            const l = srgbToLab(r, g, b);
            let best = unique[0], bd = Infinity;
            for (let i = 0; i < lab.length; i++) {
                const d = labDist(l, lab[i]);
                if (d < bd) { bd = d; best = unique[i]; }
            }
            cache.set(k, best);
            return best;
        }
    };
}

const pal = loadPalette();
const C_DARK_OUTLINE = pal.snap(20, 16, 14);

function isMagenta(r, g, b) {
    if (r > 150 && g < 90 && b > 150) return true;
    if (r > 70 && b > 60 && g < 55 && Math.abs(r - b) < 40) return true;
    if (r > 100 && b > 100 && g < 70) return true;
    if (r > 15 && b > 15 && g < 12 && Math.abs(r - b) < 15) return true;
    return false;
}

function applyDarkOutline(buf, w, h) {
    const isOpaque = (x, y) => (x >= 0 && x < w && y >= 0 && y < h && buf[(y * w + x) * 4 + 3] > 0);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            if (buf[idx + 3] === 0) continue;
            let border = false;
            for (let dy = -1; dy <= 1 && !border; dy++) {
                for (let dx = -1; dx <= 1 && !border; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    if (!isOpaque(x + dx, y + dy)) border = true;
                }
            }
            if (border) {
                buf[idx]     = C_DARK_OUTLINE[0];
                buf[idx + 1] = C_DARK_OUTLINE[1];
                buf[idx + 2] = C_DARK_OUTLINE[2];
            }
        }
    }
}

function quantizeSheet(buf, w, h, maxColors = 31) {
    const counts = new Map();
    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 0) continue;
        const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
        counts.set(k, (counts.get(k) || 0) + 1);
    }
    if (counts.size <= maxColors) return;

    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const keep = sorted.slice(0, maxColors).map(e => [
        (e[0] >> 16) & 255, (e[0] >> 8) & 255, e[0] & 255
    ]);
    const keepLab = keep.map(c => srgbToLab(...c));

    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 0) continue;
        const l = srgbToLab(buf[i], buf[i + 1], buf[i + 2]);
        let best = keep[0], bd = Infinity;
        for (let j = 0; j < keepLab.length; j++) {
            const d = labDist(l, keepLab[j]);
            if (d < bd) { bd = d; best = keep[j]; }
        }
        buf[i]     = best[0];
        buf[i + 1] = best[1];
        buf[i + 2] = best[2];
    }
}

function extractCell(srcImg, cellCol, cellRow) {
    const numCols = 4;
    const numRows = 3;
    const cellW = Math.floor(srcImg.width / numCols); // 352
    const cellH = Math.floor(srcImg.height / numRows); // 256
    const startX = cellCol * cellW;
    const startY = cellRow * cellH;

    let minX = 9999, maxX = -1, minY = 9999, maxY = -1;
    for (let y = startY + 5; y < startY + cellH - 5; y++) {
        for (let x = startX + 5; x < startX + cellW - 5; x++) {
            const idx = (y * srcImg.width + x) * 4;
            const r = srcImg.data[idx];
            const g = srcImg.data[idx + 1];
            const b = srcImg.data[idx + 2];
            const isBorder = (r < 30 && g < 30 && b < 30 && (x < startX + 12 || x > startX + cellW - 12 || y < startY + 12 || y > startY + cellH - 12));
            if (!isMagenta(r, g, b) && !isBorder) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    if (maxX < minX) {
        minX = startX + 20; maxX = startX + cellW - 20;
        minY = startY + 20; maxY = startY + cellH - 20;
    }

    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;
    const cropped = Buffer.alloc(cropW * cropH * 4);

    for (let y = 0; y < cropH; y++) {
        for (let x = 0; x < cropW; x++) {
            const srcIdx = ((minY + y) * srcImg.width + (minX + x)) * 4;
            const dstIdx = (y * cropW + x) * 4;
            const r = srcImg.data[srcIdx];
            const g = srcImg.data[srcIdx + 1];
            const b = srcImg.data[srcIdx + 2];
            if (isMagenta(r, g, b)) {
                cropped[dstIdx + 3] = 0;
            } else {
                const snapped = pal.snap(r, g, b);
                cropped[dstIdx] = snapped[0];
                cropped[dstIdx + 1] = snapped[1];
                cropped[dstIdx + 2] = snapped[2];
                cropped[dstIdx + 3] = 255;
            }
        }
    }

    return { buf: cropped, w: cropW, h: cropH };
}

function scaleToTarget(cell, targetMaxW = 42, targetMaxH = 26) {
    const scale = Math.min(targetMaxW / cell.w, targetMaxH / cell.h);
    const dstW = Math.max(1, Math.round(cell.w * scale));
    const dstH = Math.max(1, Math.round(cell.h * scale));
    const dst = Buffer.alloc(dstW * dstH * 4);

    for (let y = 0; y < dstH; y++) {
        const srcY = Math.min(cell.h - 1, Math.floor(y / scale));
        for (let x = 0; x < dstW; x++) {
            const srcX = Math.min(cell.w - 1, Math.floor(x / scale));
            const srcIdx = (srcY * cell.w + srcX) * 4;
            const dstIdx = (y * dstW + x) * 4;
            if (cell.buf[srcIdx + 3] > 0) {
                dst[dstIdx]     = cell.buf[srcIdx];
                dst[dstIdx + 1] = cell.buf[srcIdx + 1];
                dst[dstIdx + 2] = cell.buf[srcIdx + 2];
                dst[dstIdx + 3] = 255;
            } else {
                dst[dstIdx + 3] = 0;
            }
        }
    }

    return { buf: dst, w: dstW, h: dstH };
}

function blitIntoFrame(sheetBuf, sheetW, frameX, frameY, scaled, baselineY = 45) {
    const placeX = frameX + Math.floor((48 - scaled.w) / 2);
    const placeY = frameY + baselineY - scaled.h;

    for (let y = 0; y < scaled.h; y++) {
        for (let x = 0; x < scaled.w; x++) {
            const srcIdx = (y * scaled.w + x) * 4;
            if (scaled.buf[srcIdx + 3] === 0) continue;
            const dstX = placeX + x;
            const dstY = placeY + y;
            if (dstX < 0 || dstX >= sheetW || dstY < 0 || dstY >= 192) continue;
            const dstIdx = (dstY * sheetW + dstX) * 4;
            sheetBuf[dstIdx]     = scaled.buf[srcIdx];
            sheetBuf[dstIdx + 1] = scaled.buf[srcIdx + 1];
            sheetBuf[dstIdx + 2] = scaled.buf[srcIdx + 2];
            sheetBuf[dstIdx + 3] = 255;
        }
    }
}

function buildSheet(frameLayout) {
    // 3 columns x 4 rows (144 x 192)
    const sheetW = 144, sheetH = 192;
    const sheetBuf = Buffer.alloc(sheetW * sheetH * 4);

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
            const frameX = col * 48;
            const frameY = row * 48;
            const frameSpec = frameLayout[row][col];
            if (frameSpec) {
                blitIntoFrame(sheetBuf, sheetW, frameX, frameY, frameSpec.scaled, frameSpec.baselineY || 45);
            }
        }
    }

    applyDarkOutline(sheetBuf, sheetW, sheetH);
    quantizeSheet(sheetBuf, sheetW, sheetH, 31);
    return sheetBuf;
}

function writeSidecar(jsonPath, meta) {
    fs.writeFileSync(jsonPath, JSON.stringify(meta, null, 2), 'utf8');
}

function main() {
    console.log('=== Compiling Decomposition Animation & Skeleton Sheets from Google Nano Banana Pro ===');
    const raw = readPNG(RAW_PATH);

    // Extract raw cells
    // Row 0: Humanoid Decomposition (4 stages)
    const hStage0 = scaleToTarget(extractCell(raw, 0, 0), 42, 22);
    const hStage1 = scaleToTarget(extractCell(raw, 1, 0), 42, 23);
    const hStage2 = scaleToTarget(extractCell(raw, 2, 0), 42, 22);
    const hStage3 = scaleToTarget(extractCell(raw, 3, 0), 42, 22);

    // Row 1: Beast Decomposition (4 stages)
    const bStage0 = scaleToTarget(extractCell(raw, 0, 1), 42, 24);
    const bStage1 = scaleToTarget(extractCell(raw, 1, 1), 42, 25);
    const bStage2 = scaleToTarget(extractCell(raw, 2, 1), 42, 24);
    const bStage3 = scaleToTarget(extractCell(raw, 3, 1), 42, 23);

    // Row 2: Skeletons & Remains
    const skelHuman = scaleToTarget(extractCell(raw, 0, 2), 42, 22);
    const skelCurled = scaleToTarget(extractCell(raw, 1, 2), 40, 20);
    const skelBeast = scaleToTarget(extractCell(raw, 2, 2), 42, 23);
    const skelLoot = scaleToTarget(extractCell(raw, 3, 2), 42, 25);

    // 1. Compile !$UF_Decomposition_Human.png
    // Row 0 (Dir 2 / South): Stage 0 (Fresh), Stage 1 (Bloated), Stage 2 (Rotting)
    // Row 1 (Dir 4 / West): Stage 2 (Rotting), Stage 3 (Skeletonizing), skelHuman (Bleached Skeleton)
    // Row 2 (Dir 6 / East): skelHuman (Bleached Skeleton x3)
    // Row 3 (Dir 8 / North): skelCurled (Curled Skeleton x3)
    const humanLayout = [
        [{ scaled: hStage0 }, { scaled: hStage1 }, { scaled: hStage2 }],
        [{ scaled: hStage2 }, { scaled: hStage3 }, { scaled: skelHuman }],
        [{ scaled: skelHuman }, { scaled: skelHuman }, { scaled: skelHuman }],
        [{ scaled: skelCurled }, { scaled: skelCurled }, { scaled: skelCurled }]
    ];
    const humanBuf = buildSheet(humanLayout);
    const humanPng = path.join(CHAR_DIR, '!$UF_Decomposition_Human.png');
    writePNG(humanPng, 144, 192, humanBuf);
    writeSidecar(path.join(CHAR_DIR, '!$UF_Decomposition_Human.json'), {
        generator: 'gemini-3-pro-image',
        model: 'Google Nano Banana Pro',
        type: 'decomposition_human',
        description: 'Authentic 16-bit humanoid decomposition animation sequence',
        frames: {
            south: ['fresh_corpse', 'bloated_decay', 'active_rot'],
            west: ['active_rot', 'skeletonizing', 'bleached_skeleton'],
            east: ['bleached_skeleton', 'bleached_skeleton', 'bleached_skeleton'],
            north: ['curled_skeleton', 'curled_skeleton', 'curled_skeleton']
        }
    });
    console.log(`Compiled -> ${humanPng}`);

    // 2. Compile !$UF_Decomposition_Beast.png
    const beastLayout = [
        [{ scaled: bStage0 }, { scaled: bStage1 }, { scaled: bStage2 }],
        [{ scaled: bStage2 }, { scaled: bStage3 }, { scaled: skelBeast }],
        [{ scaled: skelBeast }, { scaled: skelBeast }, { scaled: skelBeast }],
        [{ scaled: skelBeast }, { scaled: skelBeast }, { scaled: skelBeast }]
    ];
    const beastBuf = buildSheet(beastLayout);
    const beastPng = path.join(CHAR_DIR, '!$UF_Decomposition_Beast.png');
    writePNG(beastPng, 144, 192, beastBuf);
    writeSidecar(path.join(CHAR_DIR, '!$UF_Decomposition_Beast.json'), {
        generator: 'gemini-3-pro-image',
        model: 'Google Nano Banana Pro',
        type: 'decomposition_beast',
        description: 'Authentic 16-bit beast decomposition animation sequence',
        frames: {
            south: ['fresh_carcass', 'bloated_carcass', 'decaying_beast'],
            west: ['decaying_beast', 'skeletonizing_beast', 'animal_skeleton'],
            east: ['animal_skeleton', 'animal_skeleton', 'animal_skeleton'],
            north: ['animal_skeleton', 'animal_skeleton', 'animal_skeleton']
        }
    });
    console.log(`Compiled -> ${beastPng}`);

    // 3. Compile !$UF_Skeleton.png (Interactive remains / lootable skeletons)
    const skelLayout = [
        [{ scaled: skelHuman }, { scaled: skelHuman }, { scaled: skelHuman }],
        [{ scaled: skelCurled }, { scaled: skelCurled }, { scaled: skelCurled }],
        [{ scaled: skelBeast }, { scaled: skelBeast }, { scaled: skelBeast }],
        [{ scaled: skelLoot }, { scaled: skelLoot }, { scaled: skelLoot }]
    ];
    const skelBuf = buildSheet(skelLayout);
    const skelPng = path.join(CHAR_DIR, '!$UF_Skeleton.png');
    writePNG(skelPng, 144, 192, skelBuf);
    writeSidecar(path.join(CHAR_DIR, '!$UF_Skeleton.json'), {
        generator: 'gemini-3-pro-image',
        model: 'Google Nano Banana Pro',
        type: 'skeleton_remains',
        description: 'Authentic 16-bit interactive skeletal remains',
        variants: {
            south: 'humanoid_skeleton_flat',
            west: 'humanoid_skeleton_curled',
            east: 'beast_skeleton',
            north: 'skeleton_with_loot_pouch'
        }
    });
    console.log(`Compiled -> ${skelPng}`);

    console.log('=== All Sheets Successfully Compiled ===');
}

main();
