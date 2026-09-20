const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const { checkFrameFacing } = require('./build_pro_human_male');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// CIELAB Palette Snapping
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
function labDist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }

const palHexes = fs.readFileSync(PALETTE_FILE, 'utf8').split(/\r?\n/).filter(Boolean).map(s => s.trim());
const PALETTE_LAB = palHexes.map(h => {
    const rgb = parseHex(h);
    return { rgb, lab: srgbToLab(rgb[0], rgb[1], rgb[2]) };
});

function snapToPalette(r, g, b) {
    const lab = srgbToLab(r, g, b);
    let best = PALETTE_LAB[0].rgb, bestDist = Infinity;
    for (let i = 0; i < PALETTE_LAB.length; i++) {
        const d = labDist(lab, PALETTE_LAB[i].lab);
        if (d < bestDist) { bestDist = d; best = PALETTE_LAB[i].rgb; }
    }
    return best;
}

function isMagenta(r, g, b) {
    if (r > 140 && b > 140 && g < 90) return true;
    if (r > 90 && b > 90 && g < 50 && (r + b) > g * 3.5) return true;
    return false;
}

function scaleImage(src, sw, sh, dw, dh) {
    const dst = Buffer.alloc(dw * dh * 4);
    for (let dy = 0; dy < dh; dy++) {
        for (let dx = 0; dx < dw; dx++) {
            const sx = Math.min(sw - 1, Math.floor(dx * sw / dw));
            const sy = Math.min(sh - 1, Math.floor(dy * sh / dh));
            const sIdx = (sy * sw + sx) * 4;
            const dIdx = (dy * dw + dx) * 4;
            dst[dIdx] = src[sIdx];
            dst[dIdx + 1] = src[sIdx + 1];
            dst[dIdx + 2] = src[sIdx + 2];
            dst[dIdx + 3] = src[sIdx + 3];
        }
    }
    return dst;
}

function extractSubRect(src, sw, sh, rx, ry, rw, rh) {
    const dst = Buffer.alloc(rw * rh * 4);
    for (let y = 0; y < rh; y++) {
        for (let x = 0; x < rw; x++) {
            const sx = rx + x;
            const sy = ry + y;
            const sIdx = (sy * sw + sx) * 4;
            const dIdx = (y * rw + x) * 4;
            dst[dIdx] = src[sIdx];
            dst[dIdx + 1] = src[sIdx + 1];
            dst[dIdx + 2] = src[sIdx + 2];
            dst[dIdx + 3] = src[sIdx + 3];
        }
    }
    return dst;
}

// ----------------------------------------------------------------------------
// 1. Build and Deploy $UF_Human_Child_Walk.png (144x192)
// ----------------------------------------------------------------------------
console.log('Building $UF_Human_Child_Walk.png...');
const rawChild = decodePNG(fs.readFileSync('art/raw/human_child_walk_nano_pro.png'));

// Frame definitions on rawChild:
// Row 0 (South):
// Col 0: x: 20..194, y: 30..340
// Col 1: x: 225..394, y: 30..340
// Col 2: x: 424..599, y: 30..340
// Row 1 (West):
// Col 0: x: 35..194, y: 380..680
// Col 1: x: 225..394, y: 380..680
// Col 2: x: 429..593, y: 380..680
// Row 2 (North):
// Col 0: x: 30..205, y: 710..1015
// Col 1: x: 230..399, y: 710..1015
// Col 2: x: 424..599, y: 710..1015

const childCoords = {
    S: [
        { x: 20, y: 30, w: 175, h: 310 },
        { x: 225, y: 30, w: 170, h: 310 },
        { x: 424, y: 30, w: 175, h: 310 }
    ],
    W: [
        { x: 630, y: 374, w: 164, h: 286 }, // Row 1 Col 3: Stride A
        { x: 640, y: 30,  w: 154, h: 310 }, // Row 0 Col 3: Stand
        { x: 36,  y: 374, w: 159, h: 286 }  // Row 1 Col 0: Stride B
    ],
    N: [
        { x: 30, y: 710, w: 175, h: 305 },
        { x: 230, y: 710, w: 170, h: 305 },
        { x: 424, y: 710, w: 175, h: 305 }
    ]
};

// Target height: 30 px. Baseline: y = 47.
const TARGET_H = 30;
const BASELINE_Y = 47;
const TARGET_W = 20;

function processFrameToCell(rect) {
    const rawFrame = extractSubRect(rawChild.data, rawChild.width, rawChild.height, rect.x, rect.y, rect.w, rect.h);
    // Find precise content bounds (excluding magenta)
    let minX = rect.w, maxX = 0, minY = rect.h, maxY = 0;
    for (let y = 0; y < rect.h; y++) {
        for (let x = 0; x < rect.w; x++) {
            const idx = (y * rect.w + x) * 4;
            if (!isMagenta(rawFrame[idx], rawFrame[idx + 1], rawFrame[idx + 2])) {
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxY) maxY = y;
            }
        }
    }
    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;
    const cropped = extractSubRect(rawFrame, rect.w, rect.h, minX, minY, cropW, cropH);
    for (let i = 0; i < cropped.length; i += 4) {
        if (isMagenta(cropped[i], cropped[i + 1], cropped[i + 2])) {
            cropped[i + 3] = 0;
        }
    }

    // Scale to TARGET_H
    const scaledW = Math.max(1, Math.round(cropW * (TARGET_H / cropH)));
    const scaled = scaleImage(cropped, cropW, cropH, scaledW, TARGET_H);

    // Place into 48x48 cell
    const cell = Buffer.alloc(48 * 48 * 4);
    const startX = Math.floor((48 - scaledW) / 2);
    const startY = BASELINE_Y - TARGET_H;

    for (let y = 0; y < TARGET_H; y++) {
        for (let x = 0; x < scaledW; x++) {
            const sIdx = (y * scaledW + x) * 4;
            const r = scaled[sIdx], g = scaled[sIdx + 1], b = scaled[sIdx + 2], a = scaled[sIdx + 3];
            if (!isMagenta(r, g, b) && a > 128) {
                const snapped = snapToPalette(r, g, b);
                const dIdx = ((startY + y) * 48 + (startX + x)) * 4;
                cell[dIdx] = snapped[0];
                cell[dIdx + 1] = snapped[1];
                cell[dIdx + 2] = snapped[2];
                cell[dIdx + 3] = 255;
            }
        }
    }
    return cell;
}

function mirrorCellHorizontal(cell) {
    const dst = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + (47 - x)) * 4;
            const dIdx = (y * 48 + x) * 4;
            dst[dIdx] = cell[sIdx];
            dst[dIdx + 1] = cell[sIdx + 1];
            dst[dIdx + 2] = cell[sIdx + 2];
            dst[dIdx + 3] = cell[sIdx + 3];
        }
    }
    return dst;
}

const childSheet = Buffer.alloc(144 * 192 * 4);

function blitCell(cell, col, row) {
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            const dIdx = (((row * 48) + y) * 144 + ((col * 48) + x)) * 4;
            childSheet[dIdx] = cell[sIdx];
            childSheet[dIdx + 1] = cell[sIdx + 1];
            childSheet[dIdx + 2] = cell[sIdx + 2];
            childSheet[dIdx + 3] = cell[sIdx + 3];
        }
    }
}

// Row 0: South
for (let c = 0; c < 3; c++) blitCell(processFrameToCell(childCoords.S[c]), c, 0);
// Row 1: West (strictly ALL LEFT per VISION V110)
const rawWest = [processFrameToCell(childCoords.W[0]), processFrameToCell(childCoords.W[1]), processFrameToCell(childCoords.W[2])];
const westFrames = rawWest.map(f => (checkFrameFacing(f) === 'RIGHT' ? mirrorCellHorizontal(f) : f));
for (let c = 0; c < 3; c++) blitCell(westFrames[c], c, 1);
// Row 2: East (Mirrored West - strictly ALL RIGHT)
for (let c = 0; c < 3; c++) blitCell(mirrorCellHorizontal(westFrames[c]), c, 2);
// Row 3: North
for (let c = 0; c < 3; c++) blitCell(processFrameToCell(childCoords.N[c]), c, 3);

writePNG('game/img/characters/$UF_Human_Child_Walk.png', 144, 192, childSheet);
console.log('Saved game/img/characters/$UF_Human_Child_Walk.png');

const childJson = {
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S", "W", "E", "N"],
    animations: {
        walk: [0, 1, 2, 1],
        stand: [1]
    },
    frameMs: 180,
    species: "human",
    stage: "child",
    gender: "any",
    action: "Walk",
    style: "Serious Chibi (VISION V116)",
    generator: "Google Nano Banana Pro (gemini-3-pro-image, Rule 11, VISION V109)"
};
fs.writeFileSync('game/img/characters/$UF_Human_Child_Walk.json', JSON.stringify(childJson, null, 2));
console.log('Saved game/img/characters/$UF_Human_Child_Walk.json');

// ----------------------------------------------------------------------------
// 2. Build and Deploy UF_Faces_human_1.png & UF_Faces_human_2.png (576x288)
// ----------------------------------------------------------------------------
console.log('\nPacking U7 Stone Arch Face Sheets...');
const rawFemale = decodePNG(fs.readFileSync('art/raw/u7_female_modular_portraits_nano_pro.png'));
const rawMale = decodePNG(fs.readFileSync('art/raw/u7_modular_portraits_nano_pro.png'));

function extractAndSnapArch(rawImg, rect) {
    const rawArch = extractSubRect(rawImg.data, rawImg.width, rawImg.height, rect.x, rect.y, rect.w, rect.h);
    const scaled = scaleImage(rawArch, rect.w, rect.h, 144, 144);
    const out = Buffer.alloc(144 * 144 * 4);
    for (let i = 0; i < 144 * 144 * 4; i += 4) {
        const r = scaled[i], g = scaled[i + 1], b = scaled[i + 2], a = scaled[i + 3];
        if (isMagenta(r, g, b) || a < 20) {
            out[i + 3] = 0; // Transparent outside the arch
        } else {
            const sn = snapToPalette(r, g, b);
            out[i] = sn[0];
            out[i + 1] = sn[1];
            out[i + 2] = sn[2];
            out[i + 3] = 255;
        }
    }
    return out;
}

// Child Arches from rawFemale Row 2:
const boyArch = extractAndSnapArch(rawFemale, { x: 516, y: 550, w: 248, h: 236 });
const girlArch = extractAndSnapArch(rawFemale, { x: 772, y: 550, w: 248, h: 236 });

// Female Arches from rawFemale Row 0:
const femArch1 = extractAndSnapArch(rawFemale, { x: 10, y: 0, w: 321, h: 345 });
const femArch2 = extractAndSnapArch(rawFemale, { x: 350, y: 0, w: 324, h: 345 });
const femElderArch = extractAndSnapArch(rawFemale, { x: 692, y: 0, w: 323, h: 345 });

// Male Elder Arch from rawMale Row 0:
const maleElderArch = extractAndSnapArch(rawMale, { x: 693, y: 0, w: 321, h: 341 });

// Load existing UF_Faces_human_1 and UF_Faces_human_2 to preserve current verified faces
const existingF1 = decodePNG(fs.readFileSync('game/img/faces/UF_Faces_human_1.png'));
const existingF2 = decodePNG(fs.readFileSync('game/img/faces/UF_Faces_human_2.png'));

function blitFaceCell(dstBuf, cellBuf, cellIndex) {
    const col = cellIndex % 4;
    const row = Math.floor(cellIndex / 4);
    for (let y = 0; y < 144; y++) {
        for (let x = 0; x < 144; x++) {
            const sIdx = (y * 144 + x) * 4;
            const dIdx = (((row * 144) + y) * 576 + ((col * 144) + x)) * 4;
            dstBuf[dIdx] = cellBuf[sIdx];
            dstBuf[dIdx + 1] = cellBuf[sIdx + 1];
            dstBuf[dIdx + 2] = cellBuf[sIdx + 2];
            dstBuf[dIdx + 3] = cellBuf[sIdx + 3];
        }
    }
}

// Sheet 1: Male 1-6 (cells 0..5), Child Boy (cell 6), Child Girl (cell 7)
const sheet1 = Buffer.from(existingF1.data);
blitFaceCell(sheet1, boyArch, 6);
blitFaceCell(sheet1, girlArch, 7);
writePNG('game/img/faces/UF_Faces_human_1.png', 576, 288, sheet1);
console.log('Saved game/img/faces/UF_Faces_human_1.png (Male 1-6 + Child Boy & Girl)');

// Sheet 2: Female 1-2 (cells 0..1), Female 3-6 (cells 2..5), Elder Male (cell 6), Elder Female (cell 7)
const sheet2 = Buffer.from(existingF2.data);
blitFaceCell(sheet2, femArch1, 0);
blitFaceCell(sheet2, femArch2, 1);
blitFaceCell(sheet2, maleElderArch, 6);
blitFaceCell(sheet2, femElderArch, 7);
writePNG('game/img/faces/UF_Faces_human_2.png', 576, 288, sheet2);
console.log('Saved game/img/faces/UF_Faces_human_2.png (Female 1-6 + Elder Male & Female)');

console.log('\n=== ASSET PACKING & DEPLOYMENT COMPLETE ===');
