'use strict';

const fs = require('fs');
const path = require('path');
const { readPNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const wallWood = readPNG(path.join(ROOT, 'game/img/characters/!$WallWood_Set.png'));
const wallStone = readPNG(path.join(ROOT, 'game/img/characters/!$WallStone_Set.png'));
const rawDoors = readPNG(path.join(ROOT, 'art/raw/doors_v2_nano_pro.png'));

// Palette loading & snapping
const PALETTE_FILE = path.join(ROOT, 'art/palette/uf.hex');
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
        if (!seen.has(k)) { seen.add(k); unique.push(rgb); }
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

function isMagenta(r, g, b) {
    if (r > 150 && g < 90 && b > 150) return true;
    if (r > 70 && b > 60 && g < 55 && Math.abs(r - b) < 40) return true;
    if (r > 100 && b > 100 && g < 70) return true;
    if (r > 15 && b > 15 && g < 12 && Math.abs(r - b) < 15) return true;
    return false;
}

function extractRawDoorLeaf(colIdx, rowIdx) {
    const numCols = 6, numRows = 3;
    const colW = Math.floor(rawDoors.width / numCols); // 234
    const rowH = Math.floor(rawDoors.height / numRows); // 256
    const startX = colIdx * colW, startY = rowIdx * rowH;
    const insetX = 16, insetY = 12;

    let minX = 9999, maxX = -1, minY = 9999, maxY = -1;
    for (let y = startY + insetY; y < startY + rowH - insetY; y++) {
        for (let x = startX + insetX; x < startX + colW - insetX; x++) {
            const idx = (y * rawDoors.width + x) * 4;
            const r = rawDoors.data[idx], g = rawDoors.data[idx + 1], b = rawDoors.data[idx + 2];
            if (!isMagenta(r, g, b)) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;
    const cropped = Buffer.alloc(cropW * cropH * 4);
    for (let y = 0; y < cropH; y++) {
        for (let x = 0; x < cropW; x++) {
            const srcIdx = ((minY + y) * rawDoors.width + (minX + x)) * 4;
            const dstIdx = (y * cropW + x) * 4;
            const r = rawDoors.data[srcIdx], g = rawDoors.data[srcIdx + 1], b = rawDoors.data[srcIdx + 2];
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
    return { buf: cropped, w: cropW, h: cropH };
}

function scaleDoor(cell, targetW, targetH) {
    const scale = Math.min(targetW / cell.w, targetH / cell.h);
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

/**
 * Builds a single 48x96 door frame directly out of the wall set frame:
 * - Upper 48px: 100% untouched wall coping matching adjacent wall.
 * - Lower 48px: Preserves left jamb (x=0..5) and right jamb (x=42..47) of the wall face,
 *   preserving lintel eave (y=48..51), and setting the door leaf inside (x=6..41, y=52..95).
 */
function buildSeamlessDoorFrame(wallImg, wallFrameIndex, rawLeaf, pattern = 0, material = 'wood') {
    const fw = 48, fh = 96;
    const col = wallFrameIndex % 4;
    const row = Math.floor(wallFrameIndex / 4);
    const sx = col * fw, sy = row * fh;

    // Start with a full 1:1 copy of the wall frame!
    const frame = Buffer.alloc(fw * fh * 4);
    for (let y = 0; y < fh; y++) {
        for (let x = 0; x < fw; x++) {
            const srcIdx = ((sy + y) * wallImg.width + (sx + x)) * 4;
            const dstIdx = (y * fw + x) * 4;
            frame[dstIdx]     = wallImg.data[srcIdx];
            frame[dstIdx + 1] = wallImg.data[srcIdx + 1];
            frame[dstIdx + 2] = wallImg.data[srcIdx + 2];
            frame[dstIdx + 3] = wallImg.data[srcIdx + 3];
        }
    }

    // Doorway opening coordinates inside the 48x96 tile:
    // Left wall pier: x = 0..5 (6px preserved wall face)
    // Right wall pier: x = 42..47 (6px preserved wall face)
    // Opening width: x = 6..41 (36px wide)
    // Top lintel / eave: y = 48..51 (4px preserved lintel trim)
    // Opening height: y = 52..94 (43px high; y=95 is bottom threshold)
    const openX1 = 6, openX2 = 41;
    const openY1 = 52, openY2 = 94;
    const openW = openX2 - openX1 + 1; // 36
    const openH = openY2 - openY1 + 1; // 43

    const cShadow = pal.snap(30, 18, 10);
    const cHighlight = pal.snap(135, 85, 30);
    const cStoneShadow = pal.snap(35, 36, 35);
    const cStoneHighlight = pal.snap(120, 125, 120);

    const shadowCol = (material === 'stone' || material === 'iron') ? cStoneShadow : cShadow;
    const hiCol     = (material === 'stone' || material === 'iron') ? cStoneHighlight : cHighlight;

    if (pattern === 0) {
        // CLOSED DOOR:
        // Clear opening interior
        for (let y = openY1; y <= openY2; y++) {
            for (let x = openX1; x <= openX2; x++) {
                const idx = (y * fw + x) * 4;
                frame[idx + 3] = 0;
            }
        }
        // Scale and insert door leaf
        const scaled = scaleDoor(rawLeaf, openW - 2, openH);
        const placeX = openX1 + Math.floor((openW - scaled.w) / 2);
        const placeY = openY2 - scaled.h + 1;
        for (let y = 0; y < scaled.h; y++) {
            for (let x = 0; x < scaled.w; x++) {
                const srcIdx = (y * scaled.w + x) * 4;
                if (scaled.buf[srcIdx + 3] === 0) continue;
                const dstX = placeX + x;
                const dstY = placeY + y;
                const dstIdx = (dstY * fw + dstX) * 4;
                frame[dstIdx]     = scaled.buf[srcIdx];
                frame[dstIdx + 1] = scaled.buf[srcIdx + 1];
                frame[dstIdx + 2] = scaled.buf[srcIdx + 2];
                frame[dstIdx + 3] = 255;
            }
        }
        // Inner doorframe shadow border (1px along openX1, openX2, and openY1)
        for (let y = openY1; y <= openY2; y++) {
            const idxL = (y * fw + openX1) * 4;
            const idxR = (y * fw + openX2) * 4;
            if (frame[idxL + 3] === 0) { frame[idxL] = shadowCol[0]; frame[idxL+1] = shadowCol[1]; frame[idxL+2] = shadowCol[2]; frame[idxL+3] = 255; }
            if (frame[idxR + 3] === 0) { frame[idxR] = shadowCol[0]; frame[idxR+1] = shadowCol[1]; frame[idxR+2] = shadowCol[2]; frame[idxR+3] = 255; }
        }
        for (let x = openX1; x <= openX2; x++) {
            const idxT = (openY1 * fw + x) * 4;
            frame[idxT] = shadowCol[0]; frame[idxT+1] = shadowCol[1]; frame[idxT+2] = shadowCol[2]; frame[idxT+3] = 255;
        }
    } else if (pattern === 1) {
        // AJAR DOOR:
        // Clear opening interior
        for (let y = openY1; y <= openY2; y++) {
            for (let x = openX1; x <= openX2; x++) {
                const idx = (y * fw + x) * 4;
                frame[idx + 3] = 0;
            }
        }
        // Inner frame jamb outlines
        for (let y = openY1; y <= openY2; y++) {
            const idxL = (y * fw + openX1) * 4;
            const idxR = (y * fw + openX2) * 4;
            frame[idxL] = shadowCol[0]; frame[idxL+1] = shadowCol[1]; frame[idxL+2] = shadowCol[2]; frame[idxL+3] = 255;
            frame[idxR] = shadowCol[0]; frame[idxR+1] = shadowCol[1]; frame[idxR+2] = shadowCol[2]; frame[idxR+3] = 255;
        }
        for (let x = openX1; x <= openX2; x++) {
            const idxT = (openY1 * fw + x) * 4;
            frame[idxT] = shadowCol[0]; frame[idxT+1] = shadowCol[1]; frame[idxT+2] = shadowCol[2]; frame[idxT+3] = 255;
        }
        // Insert ajar door leaf
        const scaled = scaleDoor(rawLeaf, openW - 6, openH);
        const placeX = openX1 + 2;
        const placeY = openY2 - scaled.h + 1;
        for (let y = 0; y < scaled.h; y++) {
            for (let x = 0; x < scaled.w; x++) {
                const srcIdx = (y * scaled.w + x) * 4;
                if (scaled.buf[srcIdx + 3] === 0) continue;
                const dstX = placeX + x;
                const dstY = placeY + y;
                const dstIdx = (dstY * fw + dstX) * 4;
                frame[dstIdx]     = scaled.buf[srcIdx];
                frame[dstIdx + 1] = scaled.buf[srcIdx + 1];
                frame[dstIdx + 2] = scaled.buf[srcIdx + 2];
                frame[dstIdx + 3] = 255;
            }
        }
    } else {
        // FULLY OPEN DOOR:
        // Clear entire opening completely down to floor!
        for (let y = openY1; y <= openY2; y++) {
            for (let x = openX1; x <= openX2; x++) {
                const idx = (y * fw + x) * 4;
                frame[idx + 3] = 0;
            }
        }
        // Inner frame jamb outlines
        for (let y = openY1; y <= openY2; y++) {
            const idxL = (y * fw + openX1) * 4;
            const idxR = (y * fw + openX2) * 4;
            frame[idxL] = shadowCol[0]; frame[idxL+1] = shadowCol[1]; frame[idxL+2] = shadowCol[2]; frame[idxL+3] = 255;
            frame[idxR] = shadowCol[0]; frame[idxR+1] = shadowCol[1]; frame[idxR+2] = shadowCol[2]; frame[idxR+3] = 255;
        }
        for (let x = openX1; x <= openX2; x++) {
            const idxT = (openY1 * fw + x) * 4;
            frame[idxT] = shadowCol[0]; frame[idxT+1] = shadowCol[1]; frame[idxT+2] = shadowCol[2]; frame[idxT+3] = 255;
        }
        // Door leaf folded back against left inner jamb (width 5px)
        const doorLeafW = 5;
        for (let y = openY1 + 1; y <= openY2 - 1; y++) {
            for (let dx = 1; dx <= doorLeafW; dx++) {
                const idx = (y * fw + (openX1 + dx)) * 4;
                if (dx === 1 || dx === doorLeafW) {
                    frame[idx] = shadowCol[0]; frame[idx+1] = shadowCol[1]; frame[idx+2] = shadowCol[2]; frame[idx+3] = 255;
                } else {
                    frame[idx] = hiCol[0]; frame[idx+1] = hiCol[1]; frame[idx+2] = hiCol[2]; frame[idx+3] = 255;
                }
            }
        }
    }

    return { buf: frame, w: fw, h: fh };
}

// Generate wall run previews to verify seamlessness
function generateWallRunDemo(wallImg, rawLeaf, pattern, outName, material = 'wood') {
    const demoW = 144, demoH = 96;
    const demoBuf = Buffer.alloc(demoW * demoH * 4);

    const doorFrame = buildSeamlessDoorFrame(wallImg, 10, rawLeaf, pattern, material);

    // Left wall at x=0 (Frame 10)
    const col = 10 % 4, row = Math.floor(10 / 4);
    const sx = col * 48, sy = row * 96;
    for (let y = 0; y < 96; y++) {
        for (let x = 0; x < 48; x++) {
            const srcIdx = ((sy + y) * wallImg.width + (sx + x)) * 4;
            const dstIdx = (y * demoW + x) * 4;
            demoBuf[dstIdx]     = wallImg.data[srcIdx];
            demoBuf[dstIdx + 1] = wallImg.data[srcIdx + 1];
            demoBuf[dstIdx + 2] = wallImg.data[srcIdx + 2];
            demoBuf[dstIdx + 3] = wallImg.data[srcIdx + 3];
        }
    }

    // Door in middle at x=48
    for (let y = 0; y < 96; y++) {
        for (let x = 0; x < 48; x++) {
            const srcIdx = (y * 48 + x) * 4;
            const dstIdx = (y * demoW + (48 + x)) * 4;
            demoBuf[dstIdx]     = doorFrame.buf[srcIdx];
            demoBuf[dstIdx + 1] = doorFrame.buf[srcIdx + 1];
            demoBuf[dstIdx + 2] = doorFrame.buf[srcIdx + 2];
            demoBuf[dstIdx + 3] = doorFrame.buf[srcIdx + 3];
        }
    }

    // Right wall at x=96 (Frame 10)
    for (let y = 0; y < 96; y++) {
        for (let x = 0; x < 48; x++) {
            const srcIdx = ((sy + y) * wallImg.width + (sx + x)) * 4;
            const dstIdx = (y * demoW + (96 + x)) * 4;
            demoBuf[dstIdx]     = wallImg.data[srcIdx];
            demoBuf[dstIdx + 1] = wallImg.data[srcIdx + 1];
            demoBuf[dstIdx + 2] = wallImg.data[srcIdx + 2];
            demoBuf[dstIdx + 3] = wallImg.data[srcIdx + 3];
        }
    }

    const outPath = path.join(ROOT, 'art', 'review', outName);
    writePNG(outPath, demoW, demoH, demoBuf);
    console.log('Saved preview ->', outPath);
}

const leafWoodClosed = extractRawDoorLeaf(0, 0);
const leafWoodAjar   = extractRawDoorLeaf(1, 0);
const leafWoodOpen   = extractRawDoorLeaf(2, 0);

generateWallRunDemo(wallWood, leafWoodClosed, 0, 'wall_run_door_closed.png', 'wood');
generateWallRunDemo(wallWood, leafWoodAjar,   1, 'wall_run_door_ajar.png', 'wood');
generateWallRunDemo(wallWood, leafWoodOpen,   2, 'wall_run_door_open.png', 'wood');

const leafStoneClosed = extractRawDoorLeaf(0, 1);
const leafStoneAjar   = extractRawDoorLeaf(1, 1);
const leafStoneOpen   = extractRawDoorLeaf(2, 1);

generateWallRunDemo(wallStone, leafStoneClosed, 0, 'wall_run_stone_door_closed.png', 'stone');
generateWallRunDemo(wallStone, leafStoneAjar,   1, 'wall_run_stone_door_ajar.png', 'stone');
generateWallRunDemo(wallStone, leafStoneOpen,   2, 'wall_run_stone_door_open.png', 'stone');

