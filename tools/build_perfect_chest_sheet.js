'use strict';

const fs = require('fs');
const path = require('path');
const { convertJpgToPng } = require('./jpg_to_png');
const { readPNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const JPG_V3 = "C:/Users/snewt/.gemini/antigravity/brain/68544d17-f5bb-452f-930d-323a949c82b4/chest_wood_v3_1790010202402.jpg";
const RAW_PNG = path.join(ROOT, 'art', 'raw', 'chest_wood_v3.png');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// Convert JPG to PNG
convertJpgToPng(JPG_V3, RAW_PNG);

const img = readPNG(RAW_PNG);
console.log(`Loaded chest_wood_v3: ${img.width}x${img.height}`);

// Parse palette
const hexLines = fs.readFileSync(PALETTE_FILE, 'utf8').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith(';'));
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

const PALETTE_LAB = PALETTE.map(c => srgbToLab(c[0], c[1], c[2]));

function findClosestPaletteColor(r, g, b) {
    const lab = srgbToLab(r, g, b);
    let minD = Infinity;
    let best = PALETTE[0];
    for (let i = 0; i < PALETTE.length; i++) {
        const d = Math.hypot(lab[0] - PALETTE_LAB[i][0], lab[1] - PALETTE_LAB[i][1], lab[2] - PALETTE_LAB[i][2]);
        if (d < minD) {
            minD = d;
            best = PALETTE[i];
        }
    }
    return best;
}

function isMagenta(r, g, b) {
    return r > 180 && b > 180 && g < 80;
}

const cellW = Math.floor(img.width / 3);
const cellH = Math.floor(img.height / 4);

// Extract a single cell buffer
function getCell(r, c) {
    const buf = Buffer.alloc(cellW * cellH * 4);
    for (let y = 0; y < cellH; y++) {
        for (let x = 0; x < cellW; x++) {
            const sIdx = ((r * cellH + y) * img.width + (c * cellW + x)) * 4;
            const dIdx = (y * cellW + x) * 4;
            buf[dIdx] = img.data[sIdx];
            buf[dIdx + 1] = img.data[sIdx + 1];
            buf[dIdx + 2] = img.data[sIdx + 2];
            buf[dIdx + 3] = img.data[sIdx + 3];
        }
    }
    return { width: cellW, height: cellH, data: buf };
}

// Flip cell horizontally
function flipCellH(cell) {
    const buf = Buffer.alloc(cell.width * cell.height * 4);
    for (let y = 0; y < cell.height; y++) {
        for (let x = 0; x < cell.width; x++) {
            const sIdx = (y * cell.width + x) * 4;
            const dIdx = (y * cell.width + (cell.width - 1 - x)) * 4;
            buf[dIdx] = cell.data[sIdx];
            buf[dIdx + 1] = cell.data[sIdx + 1];
            buf[dIdx + 2] = cell.data[sIdx + 2];
            buf[dIdx + 3] = cell.data[sIdx + 3];
        }
    }
    return { width: cell.width, height: cell.height, data: buf };
}

// Downsample a cell from cellW x cellH to 48x48
function downsampleTo48(cell) {
    const out = Buffer.alloc(48 * 48 * 4);
    const boxX0 = 35, boxX1 = cell.width - 35;
    const boxY0 = 20, boxY1 = cell.height - 15;
    const srcW = boxX1 - boxX0;
    const srcH = boxY1 - boxY0;

    // We place the chest nicely grounded on the 48x48 tile:
    // target width ~38px, target height ~36px, anchored to bottom (y ~ 44)
    const targetW = 38;
    const targetH = 36;
    const dstX0 = Math.floor((48 - targetW) / 2);
    const dstY0 = 47 - targetH;

    for (let dy = 0; dy < 48; dy++) {
        for (let dx = 0; dx < 48; dx++) {
            const outIdx = (dy * 48 + dx) * 4;
            if (dx < dstX0 || dx >= dstX0 + targetW || dy < dstY0 || dy >= dstY0 + targetH) {
                out[outIdx + 3] = 0;
                continue;
            }
            const sx = Math.floor(boxX0 + ((dx - dstX0) / targetW) * srcW);
            const sy = Math.floor(boxY0 + ((dy - dstY0) / targetH) * srcH);
            const sIdx = (sy * cell.width + sx) * 4;
            const r = cell.data[sIdx], g = cell.data[sIdx + 1], b = cell.data[sIdx + 2];
            if (isMagenta(r, g, b)) {
                out[outIdx + 3] = 0;
            } else {
                const snapped = findClosestPaletteColor(r, g, b);
                out[outIdx] = snapped[0];
                out[outIdx + 1] = snapped[1];
                out[outIdx + 2] = snapped[2];
                out[outIdx + 3] = 255;
            }
        }
    }
    return { width: 48, height: 48, data: out };
}

// Assemble the 12 native cells into 144x192
console.log('Building 12-cell matrix with DOWN/LEFT/RIGHT/UP facings...');
const grid48 = [];

// Row 0: DOWN DOWN DOWN (from Row 0 of v3)
grid48.push([downsampleTo48(getCell(0, 0)), downsampleTo48(getCell(0, 1)), downsampleTo48(getCell(0, 2))]);

// Row 1: LEFT LEFT LEFT (from Row 1 of v3)
const left0 = getCell(1, 0), left1 = getCell(1, 1), left2 = getCell(1, 2);
grid48.push([downsampleTo48(left0), downsampleTo48(left1), downsampleTo48(left2)]);

// Row 2: RIGHT RIGHT RIGHT (Horizontally flipped Row 1)
grid48.push([downsampleTo48(flipCellH(left0)), downsampleTo48(flipCellH(left1)), downsampleTo48(flipCellH(left2))]);

// Row 3: UP UP UP (Rear view)
// Col 0: closed rear from Row 3 Col 0
// Col 1: half-open rear
// Col 2: fully open rear
const rearClosed = getCell(3, 0);
const rearHalf = getCell(3, 1);
const rearOpen = getCell(3, 2);
grid48.push([downsampleTo48(rearClosed), downsampleTo48(rearHalf), downsampleTo48(rearOpen)]);

// Assemble native 144x192
const native144x192 = Buffer.alloc(144 * 192 * 4);
for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
        const cell = grid48[r][c];
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = (y * 48 + x) * 4;
                const dIdx = ((r * 48 + y) * 144 + (c * 48 + x)) * 4;
                native144x192[dIdx] = cell.data[sIdx];
                native144x192[dIdx + 1] = cell.data[sIdx + 1];
                native144x192[dIdx + 2] = cell.data[sIdx + 2];
                native144x192[dIdx + 3] = cell.data[sIdx + 3];
            }
        }
    }
}

// Frequency filter top colors to ensure <= 32 colors
const colorCounts = new Map();
for (let i = 0; i < native144x192.length; i += 4) {
    if (native144x192[i + 3] === 255) {
        const key = (native144x192[i] << 16) | (native144x192[i + 1] << 8) | native144x192[i + 2];
        colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
    }
}
const sortedColors = Array.from(colorCounts.entries()).sort((a, b) => b[1] - a[1]);
console.log(`Total initial colors: ${sortedColors.length}`);

if (sortedColors.length > 31) {
    const top31 = sortedColors.slice(0, 31).map(e => [(e[0] >> 16) & 255, (e[0] >> 8) & 255, e[0] & 255]);
    const topLab = top31.map(c => srgbToLab(c[0], c[1], c[2]));
    for (let i = 0; i < native144x192.length; i += 4) {
        if (native144x192[i + 3] === 255) {
            const curKey = (native144x192[i] << 16) | (native144x192[i + 1] << 8) | native144x192[i + 2];
            const inTop = top31.some(c => ((c[0] << 16) | (c[1] << 8) | c[2]) === curKey);
            if (!inTop) {
                const lab = srgbToLab(native144x192[i], native144x192[i + 1], native144x192[i + 2]);
                let minD = Infinity, best = top31[0];
                for (let j = 0; j < top31.length; j++) {
                    const d = Math.hypot(lab[0] - topLab[j][0], lab[1] - topLab[j][1], lab[2] - topLab[j][2]);
                    if (d < minD) { minD = d; best = top31[j]; }
                }
                native144x192[i] = best[0];
                native144x192[i + 1] = best[1];
                native144x192[i + 2] = best[2];
            }
        }
    }
}

// Final color count
const finalCounts = new Set();
for (let i = 0; i < native144x192.length; i += 4) {
    if (native144x192[i + 3] === 255) {
        finalCounts.add((native144x192[i] << 16) | (native144x192[i + 1] << 8) | native144x192[i + 2]);
    }
}
console.log(`Final distinct colors: ${finalCounts.size} (limit 32)`);

// Write native PNG and JSON sidecar into staging
const stagingDir = path.join(ROOT, 'art', 'staging');
if (!fs.existsSync(stagingDir)) fs.mkdirSync(stagingDir, { recursive: true });

const outPngPath = path.join(stagingDir, '!$UF_Chest_Wood.png');
writePNG(outPngPath, 144, 192, native144x192);

const sidecar = {
    id: "chest_wood",
    generator: "gemini-3-pro-image",
    model: "Google Nano Banana Pro",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S", "W", "E", "N"],
    animations: {
        stand: [0],
        open: [0, 1, 2]
    },
    frameMs: 150,
    standard: "Project DEUS 16-bit HD"
};
fs.writeFileSync(path.join(stagingDir, '!$UF_Chest_Wood.json'), JSON.stringify(sidecar, null, 2));
console.log('Saved staging files: !$UF_Chest_Wood.png and .json');
