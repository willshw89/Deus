'use strict';

const fs = require('fs');
const path = require('path');
const { convertJpgToPng } = require('./jpg_to_png');
const { readPNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const APPROVED_DIR = path.join(ROOT, 'art', 'staging', 'chest_approved');
const STAGING_DIR = path.join(ROOT, 'art', 'staging');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');
const BRAIN_DIR = "C:/Users/snewt/.gemini/antigravity/brain/68544d17-f5bb-452f-930d-323a949c82b4";
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

const REAR_JPG = "C:/Users/snewt/.gemini/antigravity/brain/68544d17-f5bb-452f-930d-323a949c82b4/chest_rear_open_states_1790012124149.jpg";
const REAR_PNG = path.join(ROOT, 'art', 'raw', 'chest_rear_open_states.png');

convertJpgToPng(REAR_JPG, REAR_PNG);
const rearImg = readPNG(REAR_PNG);
console.log(`Loaded rear open states: ${rearImg.width}x${rearImg.height}`);

// Load palette
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

function isMagentaOrFringe(r, g, b) {
    if (r > 150 && b > 150 && g < 110) return true; // clear magenta
    if (r > 60 && b > 60 && (r + b) > (g * 2.3 + 25)) return true; // purple halo bleed
    return false;
}

// Downsample 298x300 approved cell into 48x48
function downsampleApprovedCell(cellImg) {
    const out = Buffer.alloc(48 * 48 * 4);
    const cw = cellImg.width, ch = cellImg.height;

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
            const r = cellImg.data[sIdx], g = cellImg.data[sIdx + 1], b = cellImg.data[sIdx + 2];
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

// Downsample rear sprite from 2-sprite sheet
function downsampleRearSprite(rearImg, spriteIndex) {
    const out = Buffer.alloc(48 * 48 * 4);
    const halfW = Math.floor(rearImg.width / 2);
    const ch = rearImg.height;

    const subX0 = spriteIndex * halfW;
    // Bounding box within the half
    const boxX0 = subX0 + 35;
    const boxX1 = subX0 + halfW - 35;
    const boxY0 = 100;
    const boxY1 = ch - 80;
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
            const sIdx = (sy * rearImg.width + sx) * 4;
            const r = rearImg.data[sIdx], g = rearImg.data[sIdx + 1], b = rearImg.data[sIdx + 2];
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

// Load approved cells
const r1c1 = downsampleApprovedCell(readPNG(path.join(APPROVED_DIR, 'R1C1.png')));
const r1c2 = downsampleApprovedCell(readPNG(path.join(APPROVED_DIR, 'R1C2.png')));
const r1c3 = downsampleApprovedCell(readPNG(path.join(APPROVED_DIR, 'R1C3.png')));

const r2c1 = downsampleApprovedCell(readPNG(path.join(APPROVED_DIR, 'R2C1.png')));
const r2c2 = downsampleApprovedCell(readPNG(path.join(APPROVED_DIR, 'R2C2.png')));
const r2c3 = downsampleApprovedCell(readPNG(path.join(APPROVED_DIR, 'R2C3.png')));

const r3c1 = downsampleApprovedCell(readPNG(path.join(APPROVED_DIR, 'R3C1.png')));
const r3c2 = downsampleApprovedCell(readPNG(path.join(APPROVED_DIR, 'R3C2.png')));
const r3c3 = downsampleApprovedCell(readPNG(path.join(APPROVED_DIR, 'R3C3.png')));

const r4c1 = downsampleApprovedCell(readPNG(path.join(APPROVED_DIR, 'R4C1.png')));
const r4c2 = downsampleRearSprite(rearImg, 0); // Left sprite: rear half-open
const r4c3 = downsampleRearSprite(rearImg, 1); // Right sprite: rear fully open

console.log('Processed all 12 cells to 48x48');

// Ensure base stability: lock lower box body (y >= 28) from Col 1 onto Col 2 & 3 in each row
const BASE_Y = 28;
function lockBase(baseCell, targetCell) {
    for (let y = BASE_Y; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const idx = (y * 48 + x) * 4;
            targetCell.data[idx] = baseCell.data[idx];
            targetCell.data[idx + 1] = baseCell.data[idx + 1];
            targetCell.data[idx + 2] = baseCell.data[idx + 2];
            targetCell.data[idx + 3] = baseCell.data[idx + 3];
        }
    }
}

lockBase(r1c1, r1c2);
lockBase(r1c1, r1c3);

lockBase(r2c1, r2c2);
lockBase(r2c1, r2c3);

lockBase(r3c1, r3c2);
lockBase(r3c1, r3c3);

lockBase(r4c1, r4c2);
lockBase(r4c1, r4c3);

console.log('Locked base stability across all rows');

// Build 144x192 Native Sheet
const final144x192 = Buffer.alloc(144 * 192 * 4);
const matrix = [
    [r1c1, r1c2, r1c3],
    [r2c1, r2c2, r2c3],
    [r3c1, r3c2, r3c3],
    [r4c1, r4c2, r4c3]
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

// Frequency filter colors <= 31
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

const outPngPath = path.join(STAGING_DIR, '!$UF_Chest_Wood.png');
writePNG(outPngPath, 144, 192, final144x192);

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
console.log('Saved staging !$UF_Chest_Wood.png and .json');

// Generate 4x contact sheet
const scale = 4;
const csW = 144 * scale, csH = 192 * scale;
const csBuf = Buffer.alloc(csW * csH * 4);
for (let i = 0; i < csBuf.length; i += 4) {
    csBuf[i] = 22; csBuf[i + 1] = 23; csBuf[i + 2] = 31; csBuf[i + 3] = 255;
}
for (let y = 0; y < 192; y++) {
    for (let x = 0; x < 144; x++) {
        const sIdx = (y * 144 + x) * 4;
        if (final144x192[sIdx + 3] === 255) {
            const r = final144x192[sIdx], g = final144x192[sIdx + 1], b = final144x192[sIdx + 2];
            for (let dy = 0; dy < scale; dy++) {
                for (let dx = 0; dx < scale; dx++) {
                    const dIdx = (((y * scale) + dy) * csW + ((x * scale) + dx)) * 4;
                    csBuf[dIdx] = r; csBuf[dIdx + 1] = g; csBuf[dIdx + 2] = b; csBuf[dIdx + 3] = 255;
                }
            }
        }
    }
}
for (let c = 1; c < 3; c++) {
    const gx = c * 48 * scale;
    for (let y = 0; y < csH; y++) {
        const idx = (y * csW + gx) * 4;
        csBuf[idx] = 60; csBuf[idx + 1] = 65; csBuf[idx + 2] = 85; csBuf[idx + 3] = 255;
    }
}
for (let r = 1; r < 4; r++) {
    const gy = r * 48 * scale;
    for (let x = 0; x < csW; x++) {
        const idx = (gy * csW + x) * 4;
        csBuf[idx] = 60; csBuf[idx + 1] = 65; csBuf[idx + 2] = 85; csBuf[idx + 3] = 255;
    }
}
const csPath = path.join(REVIEW_DIR, 'chest_master_approved_contact_sheet.png');
writePNG(csPath, csW, csH, csBuf);
fs.copyFileSync(csPath, path.join(BRAIN_DIR, 'chest_master_approved_contact_sheet.png'));

// Generate 5-step playback cycle sheet
const cycleCols = [0, 1, 2, 1, 0];
const pW = 48 * cycleCols.length * scale;
const pH = 48 * 4 * scale;
const pBuf = Buffer.alloc(pW * pH * 4);
for (let i = 0; i < pBuf.length; i += 4) {
    pBuf[i] = 18; pBuf[i + 1] = 19; pBuf[i + 2] = 26; pBuf[i + 3] = 255;
}
for (let r = 0; r < 4; r++) {
    for (let ci = 0; ci < cycleCols.length; ci++) {
        const c = cycleCols[ci];
        const srcX0 = c * 48, srcY0 = r * 48;
        const dstX0 = ci * 48 * scale, dstY0 = r * 48 * scale;
        for (let py = 0; py < 48; py++) {
            for (let px = 0; px < 48; px++) {
                const sIdx = ((srcY0 + py) * 144 + (srcX0 + px)) * 4;
                if (final144x192[sIdx + 3] === 255) {
                    const rCol = final144x192[sIdx], gCol = final144x192[sIdx + 1], bCol = final144x192[sIdx + 2];
                    for (let dy = 0; dy < scale; dy++) {
                        for (let dx = 0; dx < scale; dx++) {
                            const dIdx = ((dstY0 + py * scale + dy) * pW + (dstX0 + px * scale + dx)) * 4;
                            pBuf[dIdx] = rCol; pBuf[dIdx + 1] = gCol; pBuf[dIdx + 2] = bCol; pBuf[dIdx + 3] = 255;
                        }
                    }
                }
            }
        }
    }
}
const pbPath = path.join(REVIEW_DIR, 'chest_master_approved_playback.png');
writePNG(pbPath, pW, pH, pBuf);
fs.copyFileSync(pbPath, path.join(BRAIN_DIR, 'chest_master_approved_playback.png'));

console.log('Saved contact sheet and playback cycle sheet to review & brain');
