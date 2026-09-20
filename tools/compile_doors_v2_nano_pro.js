'use strict';

/**
 * tools/compile_doors_v2_nano_pro.js
 *
 * Compiles authentic 16-bit Google Nano Banana Pro fantasy doors:
 * - Wood Door  (! $UF_Door_Wood.png & .json)
 * - Stone Door (! $UF_Door_Stone.png & .json)
 * - Iron Door  (! $UF_Door_Iron.png & .json)
 *
 * Features:
 * - Row 0 (Dir 2 / South): Horizontal Door (front-facing for horizontal walls)
 * - Row 1 (Dir 4 / West):  Vertical Door (side-profile for vertical walls)
 * - Row 2 (Dir 6 / East):  Vertical Door (mirrored side-profile)
 * - Row 3 (Dir 8 / North): Horizontal Door
 *
 * Columns:
 * - Col 0: Closed
 * - Col 1: Ajar (100% clear doorway opening)
 * - Col 2: Fully Open (100% clear doorway opening, so creature and floor are visible walking through)
 *
 * 144x192 px sheets (3 cols x 4 rows of 48x48 px frames).
 * Snapped strictly to art/palette/uf.hex (<= 31 colors, 100% binary transparency).
 */

const fs = require('fs');
const path = require('path');
const { readPNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const RAW_PATH = path.join(ROOT, 'art', 'raw', 'doors_v2_nano_pro.png');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

fs.mkdirSync(CHAR_DIR, { recursive: true });

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

function extractCell(srcImg, colIdx, rowIdx) {
    const numCols = 6;
    const numRows = 3;
    const colW = Math.floor(srcImg.width / numCols); // 234
    const rowH = Math.floor(srcImg.height / numRows); // 256
    const startX = colIdx * colW;
    const startY = rowIdx * rowH;

    // Inset by 16 px X and 12 px Y to cleanly avoid cell dividers
    const insetX = 16, insetY = 12;

    let minX = 9999, maxX = -1, minY = 9999, maxY = -1;
    for (let y = startY + insetY; y < startY + rowH - insetY; y++) {
        for (let x = startX + insetX; x < startX + colW - insetX; x++) {
            const idx = (y * srcImg.width + x) * 4;
            const r = srcImg.data[idx];
            const g = srcImg.data[idx + 1];
            const b = srcImg.data[idx + 2];
            if (!isMagenta(r, g, b)) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    if (maxX < minX) {
        minX = startX + 10; maxX = startX + colW - 10;
        minY = startY + 10; maxY = startY + rowH - 10;
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
                cropped[dstIdx]     = snapped[0];
                cropped[dstIdx + 1] = snapped[1];
                cropped[dstIdx + 2] = snapped[2];
                cropped[dstIdx + 3] = 255;
            }
        }
    }

    // Clean up isolated speckles (islands of < 10 pixels not connected to main sprite)
    const visited = new Uint8Array(cropW * cropH);
    for (let y = 0; y < cropH; y++) {
        for (let x = 0; x < cropW; x++) {
            const pos = y * cropW + x;
            if (visited[pos] || cropped[pos * 4 + 3] === 0) continue;
            // Flood fill component
            const q = [pos];
            visited[pos] = 1;
            const comp = [pos];
            let head = 0;
            while (head < q.length) {
                const cur = q[head++];
                const cx = cur % cropW, cy = Math.floor(cur / cropW);
                for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                    const nx = cx + dx, ny = cy + dy;
                    if (nx >= 0 && nx < cropW && ny >= 0 && ny < cropH) {
                        const npos = ny * cropW + nx;
                        if (!visited[npos] && cropped[npos * 4 + 3] > 0) {
                            visited[npos] = 1;
                            q.push(npos);
                            comp.push(npos);
                        }
                    }
                }
            }
            // If island smaller than 40 pixels, erase
            if (comp.length < 40) {
                for (const p of comp) cropped[p * 4 + 3] = 0;
            }
        }
    }

    return { buf: cropped, w: cropW, h: cropH };
}

function scaleToFrame(cell, targetMaxW = 44, targetMaxH = 46) {
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

function mirrorHorizontal(cell) {
    const dst = Buffer.alloc(cell.w * cell.h * 4);
    for (let y = 0; y < cell.h; y++) {
        for (let x = 0; x < cell.w; x++) {
            const srcIdx = (y * cell.w + (cell.w - 1 - x)) * 4;
            const dstIdx = (y * cell.w + x) * 4;
            dst[dstIdx]     = cell.buf[srcIdx];
            dst[dstIdx + 1] = cell.buf[srcIdx + 1];
            dst[dstIdx + 2] = cell.buf[srcIdx + 2];
            dst[dstIdx + 3] = cell.buf[srcIdx + 3];
        }
    }
    return { buf: dst, w: cell.w, h: cell.h };
}

function blitIntoFrame(sheetBuf, sheetW, frameX, frameY, scaled, baselineY = 47) {
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

function compileDoorMaterial(raw, materialRow, outFilename, meta) {
    // 144x192 sheet: 3 cols x 4 rows
    const sheetW = 144, sheetH = 192;
    const sheetBuf = Buffer.alloc(sheetW * sheetH * 4);

    // Extract raw cells
    // Cols 0, 1, 2: Horizontal Door (Closed, Ajar, Open)
    const hClosed = scaleToFrame(extractCell(raw, 0, materialRow), 44, 46);
    const hAjar   = scaleToFrame(extractCell(raw, 1, materialRow), 44, 46);
    const hOpen   = scaleToFrame(extractCell(raw, 2, materialRow), 44, 46);

    // Cols 3, 4, 5: Vertical Door (Closed, Ajar, Open)
    const vClosed = scaleToFrame(extractCell(raw, 3, materialRow), 44, 46);
    const vAjar   = scaleToFrame(extractCell(raw, 4, materialRow), 44, 46);
    const vOpen   = scaleToFrame(extractCell(raw, 5, materialRow), 44, 46);

    // Mirror vertical door for East facing
    const vClosedMirrored = mirrorHorizontal(vClosed);
    const vAjarMirrored   = mirrorHorizontal(vAjar);
    const vOpenMirrored   = mirrorHorizontal(vOpen);

    // Layout:
    // Row 0 (South / Dir 2): Horizontal Door (Closed, Ajar, Open)
    blitIntoFrame(sheetBuf, sheetW, 0, 0, hClosed);
    blitIntoFrame(sheetBuf, sheetW, 48, 0, hAjar);
    blitIntoFrame(sheetBuf, sheetW, 96, 0, hOpen);

    // Row 1 (West / Dir 4): Vertical Door (Closed, Ajar, Open)
    blitIntoFrame(sheetBuf, sheetW, 0, 48, vClosed);
    blitIntoFrame(sheetBuf, sheetW, 48, 48, vAjar);
    blitIntoFrame(sheetBuf, sheetW, 96, 48, vOpen);

    // Row 2 (East / Dir 6): Vertical Door Mirrored (Closed, Ajar, Open)
    blitIntoFrame(sheetBuf, sheetW, 0, 96, vClosedMirrored);
    blitIntoFrame(sheetBuf, sheetW, 48, 96, vAjarMirrored);
    blitIntoFrame(sheetBuf, sheetW, 96, 96, vOpenMirrored);

    // Row 3 (North / Dir 8): Horizontal Door (Closed, Ajar, Open)
    blitIntoFrame(sheetBuf, sheetW, 0, 144, hClosed);
    blitIntoFrame(sheetBuf, sheetW, 48, 144, hAjar);
    blitIntoFrame(sheetBuf, sheetW, 96, 144, hOpen);

    applyDarkOutline(sheetBuf, sheetW, sheetH);
    quantizeSheet(sheetBuf, sheetW, sheetH, 31);

    const outPath = path.join(CHAR_DIR, outFilename + '.png');
    writePNG(outPath, 144, 192, sheetBuf);

    const sidecarPath = path.join(CHAR_DIR, outFilename + '.json');
    fs.writeFileSync(sidecarPath, JSON.stringify(meta, null, 2), 'utf8');
    console.log(`Compiled -> ${outPath}`);
}

function main() {
    console.log('=== Compiling Horizontal & Vertical Doors v2 with Clear Openings ===');
    const raw = readPNG(RAW_PATH);

    // 1. Wood Door (Row 0)
    compileDoorMaterial(raw, 0, '!$UF_Door_Wood', {
        generator: 'gemini-3-pro-image',
        model: 'Google Nano Banana Pro',
        material: 'wood',
        type: 'door',
        features: ['horizontal_model', 'vertical_model', 'clear_doorway_opening', 'wall_connecting'],
        directions: {
            south: 'horizontal_front_facing',
            west: 'vertical_side_profile_west',
            east: 'vertical_side_profile_east',
            north: 'horizontal_back_facing'
        },
        patterns: {
            0: 'closed',
            1: 'ajar',
            2: 'open'
        }
    });

    // 2. Stone Door (Row 1)
    compileDoorMaterial(raw, 1, '!$UF_Door_Stone', {
        generator: 'gemini-3-pro-image',
        model: 'Google Nano Banana Pro',
        material: 'stone',
        type: 'door',
        features: ['horizontal_model', 'vertical_model', 'clear_doorway_opening', 'wall_connecting'],
        directions: {
            south: 'horizontal_front_facing',
            west: 'vertical_side_profile_west',
            east: 'vertical_side_profile_east',
            north: 'horizontal_back_facing'
        },
        patterns: {
            0: 'closed',
            1: 'ajar',
            2: 'open'
        }
    });

    // 3. Iron Door (Row 2)
    compileDoorMaterial(raw, 2, '!$UF_Door_Iron', {
        generator: 'gemini-3-pro-image',
        model: 'Google Nano Banana Pro',
        material: 'iron',
        type: 'door',
        features: ['horizontal_model', 'vertical_model', 'clear_doorway_opening', 'wall_connecting'],
        directions: {
            south: 'horizontal_front_facing',
            west: 'vertical_side_profile_west',
            east: 'vertical_side_profile_east',
            north: 'horizontal_back_facing'
        },
        patterns: {
            0: 'closed',
            1: 'ajar',
            2: 'open'
        }
    });

    console.log('=== All Door Materials Compiled Successfully ===');
}

main();
