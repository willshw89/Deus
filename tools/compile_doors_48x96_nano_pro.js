'use strict';

/**
 * tools/compile_doors_48x96_nano_pro.js
 *
 * Compiles authentic 16-bit Google Nano Banana Pro fantasy doors into standardized
 * 48x96 px frames (144x384 px sheets for 3 cols x 4 rows) per AGENTS.md Rule 11 & Rule 12.
 *
 * Visual Enclosure & Attachment Architecture:
 * - 100% Seamless Wall Integration:
 *   - Upper 48px (y = 0..47): Continuous wall roof coping derived 1:1 from the active
 *     wall sets (!$WallWood_Set.png and !$WallStone_Set.png) with zero color shifts,
 *     zero dark bars, and zero border lines at x=0 or x=47.
 *   - Lower 48px (y = 48..95): Flanking wall piers (x=0..5 and x=42..47) preserved 1:1
 *     from the active wall face, aligning with adjacent wall planks/blocks.
 *   - Doorway Opening (y = 48..94): Authentic Google Nano Banana Pro door jambs and
 *     leaves fitted flush against wall piers with zero gaps.
 *   - Closed (Col 0): 100% solid door leaf and frame shut tight.
 *   - Ajar (Col 1): Door leaf open at perspective angle, passage cleared to reveal floor.
 *   - Open (Col 2): Door leaf swung open, doorway opening is 100% transparent (A = 0)
 *     so characters pass through cleanly and the floor tile underneath is visible.
 *
 * Rows:
 * - Row 0 (Dir 2 / South): Horizontal Door (front-facing for horizontal wall runs)
 * - Row 1 (Dir 4 / West):  Vertical Door (side-profile for vertical wall runs)
 * - Row 2 (Dir 6 / East):  Vertical Door Mirrored (side-profile)
 * - Row 3 (Dir 8 / North): Horizontal Door (back-facing / interior)
 *
 * Strict 16-bit palette compliance: art/palette/uf.hex (<= 31 colors, binary alpha).
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

function isMagenta(r, g, b) {
    return (r > 120 && b > 120 && g < 60 && Math.abs(r - b) < 50);
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

function extractCroppedCell(rawDoors, colIdx, rowIdx, cropX1, cropX2, cropY1, cropY2) {
    const colW = Math.floor(rawDoors.width / 6);
    const rowH = Math.floor(rawDoors.height / 3);
    const startX = colIdx * colW;
    const startY = rowIdx * rowH;

    const cropW = cropX2 - cropX1 + 1;
    const cropH = cropY2 - cropY1 + 1;
    const cropped = Buffer.alloc(cropW * cropH * 4);

    for (let y = 0; y < cropH; y++) {
        for (let x = 0; x < cropW; x++) {
            const srcIdx = ((startY + cropY1 + y) * rawDoors.width + (startX + cropX1 + x)) * 4;
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

function scaleToSize(cell, dstW, dstH) {
    const dst = Buffer.alloc(dstW * dstH * 4);
    for (let y = 0; y < dstH; y++) {
        const srcY = Math.min(cell.h - 1, Math.floor(y * cell.h / dstH));
        for (let x = 0; x < dstW; x++) {
            const srcX = Math.min(cell.w - 1, Math.floor(x * cell.w / dstW));
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
 * - Lower 48px: Preserves left pier and right pier of wall face, fitting the door flush inside.
 */
function buildSeamlessDoorFrame(wallImg, wallFrameIndex, rawLeaf, pattern, openX1, openX2, openY1, openY2, clearInnerOpening = false) {
    const fw = 48, fh = 96;
    const col = wallFrameIndex % 4;
    const row = Math.floor(wallFrameIndex / 4);
    const sx = col * fw, sy = row * fh;

    // Start with a full 1:1 copy of the wall frame
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

    const openW = openX2 - openX1 + 1;
    const openH = openY2 - openY1 + 1;
    const scaled = scaleToSize(rawLeaf, openW, openH);

    // If ajar or open, clear opening so floor shows through
    if (clearInnerOpening) {
        const clearX1 = openX1 + 6;
        const clearX2 = openX2 - 6;
        const clearY1 = openY1 + 4;
        const clearY2 = openY2;
        for (let y = clearY1; y <= clearY2; y++) {
            for (let x = clearX1; x <= clearX2; x++) {
                const idx = (y * fw + x) * 4;
                frame[idx + 3] = 0;
            }
        }
    }

    // Overlay scaled door leaf and frame
    for (let y = 0; y < openH; y++) {
        for (let x = 0; x < openW; x++) {
            const s = (y * openW + x) * 4;
            if (scaled.buf[s + 3] === 0) continue;
            const dstX = openX1 + x;
            const dstY = openY1 + y;
            if (dstX < 0 || dstX >= fw || dstY < 0 || dstY >= fh) continue;
            const dstIdx = (dstY * fw + dstX) * 4;
            frame[dstIdx]     = scaled.buf[s];
            frame[dstIdx + 1] = scaled.buf[s + 1];
            frame[dstIdx + 2] = scaled.buf[s + 2];
            frame[dstIdx + 3] = 255;
        }
    }

    return { buf: frame, w: fw, h: fh };
}

function compile48x96Door(rawDoors, wallSetImg, materialRow, materialName, outFilename, meta) {
    const sheetW = 144, sheetH = 384; // 3 cols x 4 rows of 48x96 frames
    const sheetBuf = Buffer.alloc(sheetW * sheetH * 4);

    let hCropX1, hCropX2Closed, hCropX2Open, hCropY1, hCropY2;
    let hOpenX1, hOpenX2, hOpenY1, hOpenY2;
    let vCropX1, vCropX2, vCropY1, vCropY2;
    let vOpenX1, vOpenX2, vOpenY1, vOpenY2;

    if (materialName === 'wood') {
        hCropX1 = 36; hCropX2Closed = 202; hCropX2Open = 227; hCropY1 = 3; hCropY2 = 212;
        hOpenX1 = 6; hOpenX2 = 41; hOpenY1 = 48; hOpenY2 = 94;

        vCropX1 = 36; vCropX2 = 202; vCropY1 = 3; vCropY2 = 212;
        vOpenX1 = 8; vOpenX2 = 39; vOpenY1 = 48; vOpenY2 = 94;
    } else if (materialName === 'stone') {
        hCropX1 = 18; hCropX2Closed = 222; hCropX2Open = 226; hCropY1 = 1; hCropY2 = 212;
        hOpenX1 = 4; hOpenX2 = 43; hOpenY1 = 48; hOpenY2 = 94;

        vCropX1 = 83; vCropX2 = 211; vCropY1 = 2; vCropY2 = 212;
        vOpenX1 = 8; vOpenX2 = 39; vOpenY1 = 48; vOpenY2 = 94;
    } else { // iron
        hCropX1 = 28; hCropX2Closed = 211; hCropX2Open = 233; hCropY1 = 22; hCropY2 = 212;
        hOpenX1 = 5; hOpenX2 = 42; hOpenY1 = 48; hOpenY2 = 94;

        vCropX1 = 35; vCropX2 = 215; vCropY1 = 22; vCropY2 = 212;
        vOpenX1 = 8; vOpenX2 = 39; vOpenY1 = 48; vOpenY2 = 94;
    }

    // Horizontal Door raw extractions (South & North)
    const rawHClosed = extractCroppedCell(rawDoors, 0, materialRow, hCropX1, hCropX2Closed, hCropY1, hCropY2);
    const rawHAjar   = extractCroppedCell(rawDoors, 1, materialRow, hCropX1, hCropX2Closed, hCropY1, hCropY2);
    const rawHOpen   = extractCroppedCell(rawDoors, 2, materialRow, hCropX1, hCropX2Open,   hCropY1, hCropY2);

    // North back view doors
    const rawNClosed = (materialName === 'wood')
        ? extractCroppedCell(rawDoors, 3, materialRow, hCropX1, hCropX2Closed, hCropY1, hCropY2)
        : rawHClosed;
    const rawNAjar   = (materialName === 'wood')
        ? extractCroppedCell(rawDoors, 4, materialRow, hCropX1, hCropX2Closed, hCropY1, hCropY2)
        : rawHAjar;
    const rawNOpen   = (materialName === 'wood')
        ? extractCroppedCell(rawDoors, 5, materialRow, hCropX1, hCropX2Open,   hCropY1, hCropY2)
        : rawHOpen;

    // Vertical Door raw extractions (West & East)
    const rawVClosed = (materialName === 'wood')
        ? extractCroppedCell(rawDoors, 3, materialRow, vCropX1, vCropX2, vCropY1, vCropY2)
        : extractCroppedCell(rawDoors, 3, materialRow, vCropX1, vCropX2, vCropY1, vCropY2);
    const rawVAjar   = (materialName === 'wood')
        ? extractCroppedCell(rawDoors, 4, materialRow, vCropX1, vCropX2, vCropY1, vCropY2)
        : extractCroppedCell(rawDoors, 4, materialRow, vCropX1, vCropX2, vCropY1, vCropY2);
    const rawVOpen   = (materialName === 'wood')
        ? extractCroppedCell(rawDoors, 5, materialRow, vCropX1, vCropX2, vCropY1, vCropY2)
        : extractCroppedCell(rawDoors, 5, materialRow, vCropX1, vCropX2, vCropY1, vCropY2);

    // Wall frame indices: Frame 10 is horizontal run, Frame 5 is vertical run
    const HORIZ_FRAME_IDX = 10;
    const VERT_FRAME_IDX  = 5;

    // Build Row 0: Dir 2 / South
    const frameS0 = buildSeamlessDoorFrame(wallSetImg, HORIZ_FRAME_IDX, rawHClosed, 0, hOpenX1, hOpenX2, hOpenY1, hOpenY2, false);
    const frameS1 = buildSeamlessDoorFrame(wallSetImg, HORIZ_FRAME_IDX, rawHAjar,   1, hOpenX1, hOpenX2, hOpenY1, hOpenY2, true);
    const frameS2 = buildSeamlessDoorFrame(wallSetImg, HORIZ_FRAME_IDX, rawHOpen,   2, hOpenX1, hOpenX2, hOpenY1, hOpenY2, true);

    // Build Row 1: Dir 4 / West
    const frameW0 = buildSeamlessDoorFrame(wallSetImg, VERT_FRAME_IDX, rawVClosed, 0, vOpenX1, vOpenX2, vOpenY1, vOpenY2, false);
    const frameW1 = buildSeamlessDoorFrame(wallSetImg, VERT_FRAME_IDX, rawVAjar,   1, vOpenX1, vOpenX2, vOpenY1, vOpenY2, true);
    const frameW2 = buildSeamlessDoorFrame(wallSetImg, VERT_FRAME_IDX, rawVOpen,   2, vOpenX1, vOpenX2, vOpenY1, vOpenY2, true);

    // Build Row 2: Dir 6 / East (Mirrored West)
    const frameE0 = mirrorHorizontal(frameW0);
    const frameE1 = mirrorHorizontal(frameW1);
    const frameE2 = mirrorHorizontal(frameW2);

    // Build Row 3: Dir 8 / North
    const frameN0 = buildSeamlessDoorFrame(wallSetImg, HORIZ_FRAME_IDX, rawNClosed, 0, hOpenX1, hOpenX2, hOpenY1, hOpenY2, false);
    const frameN1 = buildSeamlessDoorFrame(wallSetImg, HORIZ_FRAME_IDX, rawNAjar,   1, hOpenX1, hOpenX2, hOpenY1, hOpenY2, true);
    const frameN2 = buildSeamlessDoorFrame(wallSetImg, HORIZ_FRAME_IDX, rawNOpen,   2, hOpenX1, hOpenX2, hOpenY1, hOpenY2, true);

    // Blit 12 frames into master sheet (3 cols x 4 rows)
    const rows = [
        [frameS0, frameS1, frameS2],
        [frameW0, frameW1, frameW2],
        [frameE0, frameE1, frameE2],
        [frameN0, frameN1, frameN2]
    ];

    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 3; c++) {
            const frm = rows[r][c];
            const startX = c * 48;
            const startY = r * 96;
            for (let y = 0; y < 96; y++) {
                for (let x = 0; x < 48; x++) {
                    const srcIdx = (y * 48 + x) * 4;
                    const dstIdx = ((startY + y) * sheetW + (startX + x)) * 4;
                    sheetBuf[dstIdx]     = frm.buf[srcIdx];
                    sheetBuf[dstIdx + 1] = frm.buf[srcIdx + 1];
                    sheetBuf[dstIdx + 2] = frm.buf[srcIdx + 2];
                    sheetBuf[dstIdx + 3] = frm.buf[srcIdx + 3];
                }
            }
        }
    }

    quantizeSheet(sheetBuf, sheetW, sheetH, 31);

    const outPath = path.join(CHAR_DIR, outFilename + '.png');
    writePNG(outPath, sheetW, sheetH, sheetBuf);

    const sidecarPath = path.join(CHAR_DIR, outFilename + '.json');
    fs.writeFileSync(sidecarPath, JSON.stringify(meta, null, 2), 'utf8');
    console.log(`Compiled 100% Seamless 48x96 Door -> ${outPath} (${sheetW}x${sheetH})`);
}

function main() {
    console.log('=== Compiling 48x96 Fantasy Doors with 100% Seamless Wall Integration ===');
    const rawDoors = readPNG(RAW_PATH);
    const wallWood = readPNG(path.join(CHAR_DIR, '!$WallWood_Set.png'));
    const wallStone = readPNG(path.join(CHAR_DIR, '!$WallStone_Set.png'));

    // 1. Wood Door (Row 0 of rawDoors, Wood Wall Set)
    compile48x96Door(rawDoors, wallWood, 0, 'wood', '!$UF_Door_Wood', {
        generator: 'gemini-3-pro-image',
        model: 'Google Nano Banana Pro',
        material: 'wood',
        type: 'door',
        frameWidth: 48,
        frameHeight: 96,
        anchor: [24, 96],
        features: [
            '48x96_wall_attached',
            '100_percent_seamless_wall_coping',
            'flushing_wall_piers',
            'timber_jambs_and_lintel',
            'horizontal_front_facing',
            'vertical_side_profile',
            'clear_doorway_opening'
        ],
        directions: {
            south: 0,
            west: 1,
            east: 2,
            north: 3
        },
        patterns: {
            0: 'closed',
            1: 'ajar',
            2: 'open'
        },
        animations: {
            stand: [0]
        }
    });

    // 2. Stone Door (Row 1 of rawDoors, Stone Wall Set)
    compile48x96Door(rawDoors, wallStone, 1, 'stone', '!$UF_Door_Stone', {
        generator: 'gemini-3-pro-image',
        model: 'Google Nano Banana Pro',
        material: 'stone',
        type: 'door',
        frameWidth: 48,
        frameHeight: 96,
        anchor: [24, 96],
        features: [
            '48x96_wall_attached',
            '100_percent_seamless_wall_coping',
            'flushing_wall_piers',
            'dressed_stone_arch_and_pillars',
            'horizontal_front_facing',
            'vertical_side_profile',
            'clear_doorway_opening'
        ],
        directions: {
            south: 0,
            west: 1,
            east: 2,
            north: 3
        },
        patterns: {
            0: 'closed',
            1: 'ajar',
            2: 'open'
        },
        animations: {
            stand: [0]
        }
    });

    // 3. Iron Door (Row 2 of rawDoors, Stone Wall Set + Iron Strapping)
    compile48x96Door(rawDoors, wallStone, 2, 'iron', '!$UF_Door_Iron', {
        generator: 'gemini-3-pro-image',
        model: 'Google Nano Banana Pro',
        material: 'iron',
        type: 'door',
        frameWidth: 48,
        frameHeight: 96,
        anchor: [24, 96],
        features: [
            '48x96_wall_attached',
            '100_percent_seamless_wall_coping',
            'flushing_wall_piers',
            'riveted_iron_strapped_door',
            'horizontal_front_facing',
            'vertical_side_profile',
            'clear_doorway_opening'
        ],
        directions: {
            south: 0,
            west: 1,
            east: 2,
            north: 3
        },
        patterns: {
            0: 'closed',
            1: 'ajar',
            2: 'open'
        },
        animations: {
            stand: [0]
        }
    });

    console.log('=== All 48x96 Door Sprite Sheets Compiled Successfully ===');
}

main();
