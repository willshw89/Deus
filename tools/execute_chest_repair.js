'use strict';

const fs = require('fs');
const path = require('path');
const { readPNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const AUDIT_DIR = path.join(ROOT, 'art', 'staging', 'chest_audit');
const STAGING_DIR = path.join(ROOT, 'art', 'staging');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');
const BRAIN_DIR = "C:/Users/snewt/.gemini/antigravity/brain/68544d17-f5bb-452f-930d-323a949c82b4";
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// Load Palette
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
    let minD = Infinity, best = PALETTE[0];
    for (let i = 0; i < PALETTE.length; i++) {
        const d = Math.hypot(lab[0] - PALETTE_LAB[i][0], lab[1] - PALETTE_LAB[i][1], lab[2] - PALETTE_LAB[i][2]);
        if (d < minD) { minD = d; best = PALETTE[i]; }
    }
    return best;
}

// Strict magenta and purple-bleed halo filter
function isMagentaOrFringe(r, g, b) {
    if (r > 150 && b > 150 && g < 110) return true; // clear magenta
    if (r > 60 && b > 60 && (r + b) > (g * 2.3 + 25)) return true; // purple halo bleed
    return false;
}

// Downsample raw cell into 48x48
function downsampleCell(rawCell) {
    const out = Buffer.alloc(48 * 48 * 4);
    const cw = rawCell.width, ch = rawCell.height;
    
    const boxX0 = 28, boxX1 = cw - 28;
    const boxY0 = 10, boxY1 = ch - 5;
    const srcW = boxX1 - boxX0;
    const srcH = boxY1 - boxY0;

    const targetW = 38;
    const targetH = 37;
    const dstX0 = Math.floor((48 - targetW) / 2); // x = 5
    const dstY0 = 47 - targetH; // y = 10

    for (let dy = 0; dy < 48; dy++) {
        for (let dx = 0; dx < 48; dx++) {
            const outIdx = (dy * 48 + dx) * 4;
            if (dx < dstX0 || dx >= dstX0 + targetW || dy < dstY0 || dy >= dstY0 + targetH) {
                out[outIdx + 3] = 0;
                continue;
            }
            const sx = Math.floor(boxX0 + ((dx - dstX0) / targetW) * srcW);
            const sy = Math.floor(boxY0 + ((dy - dstY0) / targetH) * srcH);
            const sIdx = (sy * cw + sx) * 4;
            const r = rawCell.data[sIdx], g = rawCell.data[sIdx + 1], b = rawCell.data[sIdx + 2];
            if (isMagentaOrFringe(r, g, b)) {
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

function cloneCell(cell) {
    const buf = Buffer.alloc(48 * 48 * 4);
    cell.data.copy(buf);
    return { width: 48, height: 48, data: buf };
}

function flipH(cell) {
    const buf = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            const dIdx = (y * 48 + (47 - x)) * 4;
            buf[dIdx] = cell.data[sIdx];
            buf[dIdx + 1] = cell.data[sIdx + 1];
            buf[dIdx + 2] = cell.data[sIdx + 2];
            buf[dIdx + 3] = cell.data[sIdx + 3];
        }
    }
    return { width: 48, height: 48, data: buf };
}

// Load raw frames
const r1c1_raw = readPNG(path.join(AUDIT_DIR, 'R1C1.png'));
const r1c2_raw = readPNG(path.join(AUDIT_DIR, 'R1C2.png'));
const r1c3_raw = readPNG(path.join(AUDIT_DIR, 'R1C3.png'));
const r2c1_raw = readPNG(path.join(AUDIT_DIR, 'R2C1.png'));
const r2c2_raw = readPNG(path.join(AUDIT_DIR, 'R2C2.png'));
const r2c3_raw = readPNG(path.join(AUDIT_DIR, 'R2C3.png'));
const r4c1_raw = readPNG(path.join(AUDIT_DIR, 'R4C1.png'));

// Native 48x48 downsampled
const r1c1 = downsampleCell(r1c1_raw);
const r1c2 = downsampleCell(r1c2_raw);
const r1c3 = downsampleCell(r1c3_raw);
const r2c1 = downsampleCell(r2c1_raw);
const r2c2 = downsampleCell(r2c2_raw);
const r2c3 = downsampleCell(r2c3_raw);
const r4c1 = downsampleCell(r4c1_raw);

const BASE_Y = 28;

const COL_SHADOW = findClosestPaletteColor(38, 22, 12);
const COL_FLOOR = findClosestPaletteColor(66, 43, 24);
const COL_FLOOR_HL = findClosestPaletteColor(104, 72, 42);
const COL_IRON = findClosestPaletteColor(42, 45, 52);
const COL_IRON_HL = findClosestPaletteColor(75, 82, 93);
const COL_OUTLINE = findClosestPaletteColor(24, 20, 18);

// REPAIR R1C2:
const r1c2_repaired = cloneCell(r1c2);
for (let y = BASE_Y; y < 48; y++) {
    for (let x = 0; x < 48; x++) {
        const idx = (y * 48 + x) * 4;
        r1c2_repaired.data[idx] = r1c1.data[idx];
        r1c2_repaired.data[idx + 1] = r1c1.data[idx + 1];
        r1c2_repaired.data[idx + 2] = r1c1.data[idx + 2];
        r1c2_repaired.data[idx + 3] = r1c1.data[idx + 3];
    }
}
for (let y = 23; y <= 27; y++) {
    for (let x = 9; x <= 38; x++) {
        const idx = (y * 48 + x) * 4;
        if (r1c2_repaired.data[idx + 3] === 255) {
            const c = (y <= 24) ? COL_SHADOW : ((y === 27 && (x % 4 === 0)) ? COL_FLOOR_HL : COL_FLOOR);
            r1c2_repaired.data[idx] = c[0];
            r1c2_repaired.data[idx + 1] = c[1];
            r1c2_repaired.data[idx + 2] = c[2];
        }
    }
}

// REPAIR R1C3:
const r1c3_repaired = cloneCell(r1c3);
for (let y = BASE_Y; y < 48; y++) {
    for (let x = 0; x < 48; x++) {
        const idx = (y * 48 + x) * 4;
        r1c3_repaired.data[idx] = r1c1.data[idx];
        r1c3_repaired.data[idx + 1] = r1c1.data[idx + 1];
        r1c3_repaired.data[idx + 2] = r1c1.data[idx + 2];
        r1c3_repaired.data[idx + 3] = r1c1.data[idx + 3];
    }
}
for (let y = 22; y <= 27; y++) {
    for (let x = 9; x <= 38; x++) {
        const idx = (y * 48 + x) * 4;
        if (r1c3_repaired.data[idx + 3] === 255) {
            const c = (y <= 24) ? COL_SHADOW : ((y === 27 && (x % 5 === 0)) ? COL_FLOOR_HL : COL_FLOOR);
            r1c3_repaired.data[idx] = c[0];
            r1c3_repaired.data[idx + 1] = c[1];
            r1c3_repaired.data[idx + 2] = c[2];
        }
    }
}

// REPAIR R2C2 (LEFT half-open):
const r2c2_repaired = cloneCell(r2c2);
for (let y = BASE_Y; y < 48; y++) {
    for (let x = 0; x < 48; x++) {
        const idx = (y * 48 + x) * 4;
        r2c2_repaired.data[idx] = r2c1.data[idx];
        r2c2_repaired.data[idx + 1] = r2c1.data[idx + 1];
        r2c2_repaired.data[idx + 2] = r2c1.data[idx + 2];
        r2c2_repaired.data[idx + 3] = r2c1.data[idx + 3];
    }
}
for (let y = 23; y <= 27; y++) {
    for (let x = 11; x <= 35; x++) {
        const idx = (y * 48 + x) * 4;
        if (r2c2_repaired.data[idx + 3] === 255) {
            const c = (y <= 24) ? COL_SHADOW : COL_FLOOR;
            r2c2_repaired.data[idx] = c[0];
            r2c2_repaired.data[idx + 1] = c[1];
            r2c2_repaired.data[idx + 2] = c[2];
        }
    }
}

// REPAIR R2C3 (LEFT fully open):
const r2c3_repaired = cloneCell(r2c3);
for (let y = BASE_Y; y < 48; y++) {
    for (let x = 0; x < 48; x++) {
        const idx = (y * 48 + x) * 4;
        r2c3_repaired.data[idx] = r2c1.data[idx];
        r2c3_repaired.data[idx + 1] = r2c1.data[idx + 1];
        r2c3_repaired.data[idx + 2] = r2c1.data[idx + 2];
        r2c3_repaired.data[idx + 3] = r2c1.data[idx + 3];
    }
}
for (let y = 22; y <= 27; y++) {
    for (let x = 11; x <= 35; x++) {
        const idx = (y * 48 + x) * 4;
        if (r2c3_repaired.data[idx + 3] === 255) {
            const c = (y <= 24) ? COL_SHADOW : COL_FLOOR;
            r2c3_repaired.data[idx] = c[0];
            r2c3_repaired.data[idx + 1] = c[1];
            r2c3_repaired.data[idx + 2] = c[2];
        }
    }
}

// ROW 3: RIGHT FACING (Horizontal flip of Row 2)
const r3c1 = flipH(r2c1);
const r3c2 = flipH(r2c2_repaired);
const r3c3 = flipH(r2c3_repaired);

// ROW 4: UP FACING (Rear view)
// R4C1: Approved closed rear view
// Clean any fringe on R4C1:
for (let y = 0; y < 48; y++) {
    for (let x = 0; x < 48; x++) {
        const idx = (y * 48 + x) * 4;
        if (r4c1.data[idx + 3] === 255 && isMagentaOrFringe(r4c1.data[idx], r4c1.data[idx + 1], r4c1.data[idx + 2])) {
            r4c1.data[idx + 3] = 0;
        }
    }
}

// R4C2: Half-Open rear
// Composite R4C1 base + 45° angled rear lid
const r4c2_repaired = cloneCell(r4c1);
// Arched top curve for tilted lid (apex at center x=24)
for (let y = 14; y <= 26; y++) {
    for (let x = 5; x <= 42; x++) {
        const idx = (y * 48 + x) * 4;
        const distFromCenter = Math.abs(x - 24);
        const archTop = 15 + Math.floor((distFromCenter / 18) * 3); // 15 at center, 18 at edge
        if (y >= archTop) {
            if (y === archTop || x === 5 || x === 42) {
                // Dark outline
                r4c2_repaired.data[idx] = COL_OUTLINE[0];
                r4c2_repaired.data[idx + 1] = COL_OUTLINE[1];
                r4c2_repaired.data[idx + 2] = COL_OUTLINE[2];
                r4c2_repaired.data[idx + 3] = 255;
            } else if (x >= 22 && x <= 25) {
                // Central vertical iron hinge strap
                const ic = (x === 23 || x === 24) ? COL_IRON_HL : COL_IRON;
                r4c2_repaired.data[idx] = ic[0];
                r4c2_repaired.data[idx + 1] = ic[1];
                r4c2_repaired.data[idx + 2] = ic[2];
                r4c2_repaired.data[idx + 3] = 255;
            } else {
                // Tilted oak planks
                const wc = (y % 4 === 0) ? COL_FLOOR : COL_FLOOR_HL;
                r4c2_repaired.data[idx] = wc[0];
                r4c2_repaired.data[idx + 1] = wc[1];
                r4c2_repaired.data[idx + 2] = wc[2];
                r4c2_repaired.data[idx + 3] = 255;
            }
        } else {
            r4c2_repaired.data[idx + 3] = 0; // Transparent above the arched lid
        }
    }
}
// Keep rear hinges intact on y = 27..28
for (let x = 0; x < 48; x++) {
    for (let y = 27; y <= 47; y++) {
        const idx = (y * 48 + x) * 4;
        r4c2_repaired.data[idx] = r4c1.data[idx];
        r4c2_repaired.data[idx + 1] = r4c1.data[idx + 1];
        r4c2_repaired.data[idx + 2] = r4c1.data[idx + 2];
        r4c2_repaired.data[idx + 3] = r4c1.data[idx + 3];
    }
}

// R4C3: Fully Open rear
// Composite R4C1 base + vertical 90° upright lid back
const r4c3_repaired = cloneCell(r4c1);
for (let y = 10; y <= 26; y++) {
    for (let x = 5; x <= 42; x++) {
        const idx = (y * 48 + x) * 4;
        const distFromCenter = Math.abs(x - 24);
        const archTop = 10 + Math.floor((distFromCenter / 18) * 3); // 10 at center, 13 at edge (matches R1C3)
        if (y >= archTop) {
            if (y === archTop || x === 5 || x === 42) {
                // Dark outline
                r4c3_repaired.data[idx] = COL_OUTLINE[0];
                r4c3_repaired.data[idx + 1] = COL_OUTLINE[1];
                r4c3_repaired.data[idx + 2] = COL_OUTLINE[2];
                r4c3_repaired.data[idx + 3] = 255;
            } else if (x >= 22 && x <= 25) {
                // Central vertical iron strap
                const ic = (x === 23 || x === 24) ? COL_IRON_HL : COL_IRON;
                r4c3_repaired.data[idx] = ic[0];
                r4c3_repaired.data[idx + 1] = ic[1];
                r4c3_repaired.data[idx + 2] = ic[2];
                r4c3_repaired.data[idx + 3] = 255;
            } else {
                // Rear oak planks of upright lid
                const wc = (y % 4 === 0) ? COL_FLOOR : COL_FLOOR_HL;
                r4c3_repaired.data[idx] = wc[0];
                r4c3_repaired.data[idx + 1] = wc[1];
                r4c3_repaired.data[idx + 2] = wc[2];
                r4c3_repaired.data[idx + 3] = 255;
            }
        } else {
            r4c3_repaired.data[idx + 3] = 0;
        }
    }
}
// Keep rear hinges intact on y = 27..47
for (let x = 0; x < 48; x++) {
    for (let y = 27; y <= 47; y++) {
        const idx = (y * 48 + x) * 4;
        r4c3_repaired.data[idx] = r4c1.data[idx];
        r4c3_repaired.data[idx + 1] = r4c1.data[idx + 1];
        r4c3_repaired.data[idx + 2] = r4c1.data[idx + 2];
        r4c3_repaired.data[idx + 3] = r4c1.data[idx + 3];
    }
}

// Global fringe sweep on all cells to guarantee ZERO purple/magenta residue
const allCells = [r1c1, r1c2_repaired, r1c3_repaired, r2c1, r2c2_repaired, r2c3_repaired, r3c1, r3c2, r3c3, r4c1, r4c2_repaired, r4c3_repaired];
for (const cell of allCells) {
    for (let i = 0; i < cell.data.length; i += 4) {
        if (cell.data[i + 3] === 255 && isMagentaOrFringe(cell.data[i], cell.data[i + 1], cell.data[i + 2])) {
            cell.data[i + 3] = 0;
        }
    }
}

// Assemble 144x192 Native Sheet
const final144x192 = Buffer.alloc(144 * 192 * 4);
const matrix = [
    [r1c1, r1c2_repaired, r1c3_repaired],
    [r2c1, r2c2_repaired, r2c3_repaired],
    [r3c1, r3c2, r3c3],
    [r4c1, r4c2_repaired, r4c3_repaired]
];

for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
        const cell = matrix[r][c];
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = (y * 48 + x) * 4;
                const dIdx = ((r * 48 + y) * 144 + (c * 48 + x)) * 4;
                final144x192[dIdx] = cell.data[sIdx];
                final144x192[dIdx + 1] = cell.data[sIdx + 1];
                final144x192[dIdx + 2] = cell.data[sIdx + 2];
                final144x192[dIdx + 3] = cell.data[sIdx + 3];
            }
        }
    }
}

// Count and enforce colors <= 31
const colorCounts = new Map();
for (let i = 0; i < final144x192.length; i += 4) {
    if (final144x192[i + 3] === 255) {
        const key = (final144x192[i] << 16) | (final144x192[i + 1] << 8) | final144x192[i + 2];
        colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
    }
}
const sortedColors = Array.from(colorCounts.entries()).sort((a, b) => b[1] - a[1]);
console.log(`Pre-filter color count: ${sortedColors.length}`);

if (sortedColors.length > 31) {
    const top31 = sortedColors.slice(0, 31).map(e => [(e[0] >> 16) & 255, (e[0] >> 8) & 255, e[0] & 255]);
    const topLab = top31.map(c => srgbToLab(c[0], c[1], c[2]));
    for (let i = 0; i < final144x192.length; i += 4) {
        if (final144x192[i + 3] === 255) {
            const curKey = (final144x192[i] << 16) | (final144x192[i + 1] << 8) | final144x192[i + 2];
            const inTop = top31.some(c => ((c[0] << 16) | (c[1] << 8) | c[2]) === curKey);
            if (!inTop) {
                const lab = srgbToLab(final144x192[i], final144x192[i + 1], final144x192[i + 2]);
                let minD = Infinity, best = top31[0];
                for (let j = 0; j < top31.length; j++) {
                    const d = Math.hypot(lab[0] - topLab[j][0], lab[1] - topLab[j][1], lab[2] - topLab[j][2]);
                    if (d < minD) { minD = d; best = top31[j]; }
                }
                final144x192[i] = best[0];
                final144x192[i + 1] = best[1];
                final144x192[i + 2] = best[2];
            }
        }
    }
}

const finalSet = new Set();
for (let i = 0; i < final144x192.length; i += 4) {
    if (final144x192[i + 3] === 255) {
        finalSet.add((final144x192[i] << 16) | (final144x192[i + 1] << 8) | final144x192[i + 2]);
    }
}
console.log(`Final distinct colors: ${finalSet.size} (limit 32)`);

const finalSheetPath = path.join(STAGING_DIR, '!$UF_Chest_Wood.png');
writePNG(finalSheetPath, 144, 192, final144x192);

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
fs.writeFileSync(path.join(STAGING_DIR, '!$UF_Chest_Wood.json'), JSON.stringify(sidecar, null, 2));
console.log('Saved clean repaired !$UF_Chest_Wood.png and sidecar to staging');
