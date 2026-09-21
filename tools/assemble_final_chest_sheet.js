'use strict';

const fs = require('fs');
const path = require('path');
const { readPNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const STAGING_DIR = path.join(ROOT, 'art', 'staging');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');
const BRAIN_DIR = "C:/Users/snewt/.gemini/antigravity/brain/68544d17-f5bb-452f-930d-323a949c82b4";
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

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

// Read current sheet which has Rows 1-3 approved and Row 4 Col 1 & Col 3 approved
const sheetPng = readPNG(path.join(STAGING_DIR, '!$UF_Chest_Wood.png'));
const testR4C2 = readPNG(path.join(REVIEW_DIR, 'test_r4c2.png'));

// Construct final 144x192
const finalSheet = Buffer.alloc(144 * 192 * 4);
sheetPng.data.copy(finalSheet);

// Splice testR4C2 into Row 4, Col 2 (r=3, c=1: x=48..95, y=144..191)
const dstX0 = 48;
const dstY0 = 3 * 48; // 144

for (let y = 0; y < 48; y++) {
    for (let x = 0; x < 48; x++) {
        const sIdx = (y * 48 + x) * 4;
        const dIdx = ((dstY0 + y) * 144 + (dstX0 + x)) * 4;
        finalSheet[dIdx] = testR4C2.data[sIdx];
        finalSheet[dIdx + 1] = testR4C2.data[sIdx + 1];
        finalSheet[dIdx + 2] = testR4C2.data[sIdx + 2];
        finalSheet[dIdx + 3] = testR4C2.data[sIdx + 3];
    }
}

// Color reduce to <= 31
const colorCounts = new Map();
for (let i = 0; i < finalSheet.length; i += 4) {
    if (finalSheet[i + 3] === 255) {
        const key = (finalSheet[i] << 16) | (finalSheet[i + 1] << 8) | finalSheet[i + 2];
        colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
    }
}
const sortedColors = Array.from(colorCounts.entries()).sort((a, b) => b[1] - a[1]);
console.log(`Pre-filter color count: ${sortedColors.length}`);

if (sortedColors.length > 31) {
    const top31 = sortedColors.slice(0, 31).map(e => [(e[0] >> 16) & 255, (e[0] >> 8) & 255, e[0] & 255]);
    const topLab = top31.map(c => srgbToLab(c[0], c[1], c[2]));
    for (let i = 0; i < finalSheet.length; i += 4) {
        if (finalSheet[i + 3] === 255) {
            const curKey = (finalSheet[i] << 16) | (finalSheet[i + 1] << 8) | finalSheet[i + 2];
            const inTop = top31.some(c => ((c[0] << 16) | (c[1] << 8) | c[2]) === curKey);
            if (!inTop) {
                const lab = srgbToLab(finalSheet[i], finalSheet[i + 1], finalSheet[i + 2]);
                let minD = Infinity, best = top31[0];
                for (let j = 0; j < top31.length; j++) {
                    const d = Math.hypot(lab[0] - topLab[j][0], lab[1] - topLab[j][1], lab[2] - topLab[j][2]);
                    if (d < minD) { minD = d; best = top31[j]; }
                }
                finalSheet[i] = best[0];
                finalSheet[i + 1] = best[1];
                finalSheet[i + 2] = best[2];
            }
        }
    }
}

const finalSet = new Set();
for (let i = 0; i < finalSheet.length; i += 4) {
    if (finalSheet[i + 3] === 255) {
        finalSet.add((finalSheet[i] << 16) | (finalSheet[i + 1] << 8) | finalSheet[i + 2]);
    }
}
console.log(`Final distinct colors: ${finalSet.size} (limit 32)`);

const outPath = path.join(STAGING_DIR, '!$UF_Chest_Wood.png');
writePNG(outPath, 144, 192, finalSheet);

// Generate 4x Contact Sheet
const scale = 4;
const csW = 144 * scale, csH = 192 * scale;
const csBuf = Buffer.alloc(csW * csH * 4);
for (let i = 0; i < csBuf.length; i += 4) {
    csBuf[i] = 22; csBuf[i + 1] = 23; csBuf[i + 2] = 31; csBuf[i + 3] = 255;
}
for (let y = 0; y < 192; y++) {
    for (let x = 0; x < 144; x++) {
        const sIdx = (y * 144 + x) * 4;
        if (finalSheet[sIdx + 3] === 255) {
            const r = finalSheet[sIdx], g = finalSheet[sIdx + 1], b = finalSheet[sIdx + 2];
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
const csPath = path.join(REVIEW_DIR, 'chest_final_assembled_contact_sheet.png');
writePNG(csPath, csW, csH, csBuf);
fs.copyFileSync(csPath, path.join(BRAIN_DIR, 'chest_final_assembled_contact_sheet.png'));

// Generate 5-step Playback Cycle Sheet
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
                if (finalSheet[sIdx + 3] === 255) {
                    const rCol = finalSheet[sIdx], gCol = finalSheet[sIdx + 1], bCol = finalSheet[sIdx + 2];
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
const pbPath = path.join(REVIEW_DIR, 'chest_final_assembled_playback.png');
writePNG(pbPath, pW, pH, pBuf);
fs.copyFileSync(pbPath, path.join(BRAIN_DIR, 'chest_final_assembled_playback.png'));

console.log('Saved final assembled contact sheet and playback cycle sheet');
