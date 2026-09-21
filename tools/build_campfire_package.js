'use strict';

const fs = require('fs');
const path = require('path');
const { readPNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const MASTER_PATH = path.join(ROOT, 'art', 'masters', 'deus_campfire_master_12sprites_pink.png');
const STAGING_DIR = path.join(ROOT, 'art', 'staging');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');
const BRAIN_DIR = "C:/Users/snewt/.gemini/antigravity/brain/68544d17-f5bb-452f-930d-323a949c82b4";
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

const master = readPNG(MASTER_PATH);
console.log(`Loaded master sheet: ${master.width}x${master.height}`);

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

// Exclude purple colors from campfire palette (fire is red/orange/yellow, stones are grey/black, logs are brown)
const FIRE_PALETTE = PALETTE.filter(c => {
    const isPurple = (c[0] > c[1] + 10 && c[2] > c[1] + 10);
    return !isPurple;
});
const FIRE_PALETTE_LAB = FIRE_PALETTE.map(c => srgbToLab(c[0], c[1], c[2]));

function findClosestPaletteColor(r, g, b) {
    const lab = srgbToLab(r, g, b);
    let minD = Infinity, best = FIRE_PALETTE[0];
    for (let i = 0; i < FIRE_PALETTE.length; i++) {
        const d = Math.hypot(lab[0] - FIRE_PALETTE_LAB[i][0], lab[1] - FIRE_PALETTE_LAB[i][1], lab[2] - FIRE_PALETTE_LAB[i][2]);
        if (d < minD) { minD = d; best = FIRE_PALETTE[i]; }
    }
    return best;
}

function isBgColor(r, g, b) {
    return (r - g > 30 && b - g > 30);
}

const cellCols = [[2, 296], [299, 596], [599, 894]];
const cellRows = [[2, 298], [302, 598], [601, 898], [901, 1198]];

// Uniform scale factor: 42 px diameter on 48x48 tile
const globalScale = 42.0 / 278.0; // ~0.151079
const nativeCellSize = 48;
const nativeAnchorX = 23.5;
const nativeAnchorY = 46;

const nativeBuf = Buffer.alloc(144 * 192 * 4);

for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
        const [x0, x1] = cellCols[c];
        const [y0, y1] = cellRows[r];
        const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
        const visited = new Uint8Array(cw * ch);
        const queue = [];

        for (let x = 0; x < cw; x++) {
            queue.push([x, 0]); queue.push([x, ch - 1]);
            visited[0 * cw + x] = 1; visited[(ch - 1) * cw + x] = 1;
        }
        for (let y = 1; y < ch - 1; y++) {
            queue.push([0, y]); queue.push([cw - 1, y]);
            visited[y * cw + 0] = 1; visited[y * cw + (cw - 1)] = 1;
        }

        while (queue.length > 0) {
            const [cx, cy] = queue.pop();
            const neighbors = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
            for (const [nx, ny] of neighbors) {
                if (nx < 0 || nx >= cw || ny < 0 || ny >= ch) continue;
                const nIdx = ny * cw + nx;
                if (visited[nIdx]) continue;
                const mx = x0 + nx, my = y0 + ny;
                const idx = (my * master.width + mx) * 4;
                const red = master.data[idx], grn = master.data[idx + 1], blu = master.data[idx + 2];
                if (isBgColor(red, grn, blu)) {
                    visited[nIdx] = 1;
                    queue.push([nx, ny]);
                }
            }
        }

        // Find bounds of campfire
        let minX = cw, maxX = 0, minY = ch, maxY = 0;
        for (let y = 0; y < ch; y++) {
            for (let x = 0; x < cw; x++) {
                if (!visited[y * cw + x]) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        const fireCenterX = (x0 + minX + x0 + maxX) / 2.0;
        const fireBaseY = y0 + maxY;

        const dstCellX0 = c * nativeCellSize;
        const dstCellY0 = r * nativeCellSize;

        for (let ny = 0; ny < nativeCellSize; ny++) {
            for (let nx = 0; nx < nativeCellSize; nx++) {
                const dIdx = ((dstCellY0 + ny) * 144 + (dstCellX0 + nx)) * 4;

                const relDx = nx - nativeAnchorX;
                const relDy = ny - nativeAnchorY;

                const mx = Math.round(fireCenterX + relDx / globalScale);
                const my = Math.round(fireBaseY + relDy / globalScale);

                if (mx < x0 || mx > x1 || my < y0 || my > y1) {
                    nativeBuf[dIdx + 3] = 0;
                    continue;
                }

                const relCellX = mx - x0;
                const relCellY = my - y0;
                if (visited[relCellY * cw + relCellX]) {
                    nativeBuf[dIdx + 3] = 0;
                    continue;
                }

                const sIdx = (my * master.width + mx) * 4;
                const red = master.data[sIdx], grn = master.data[sIdx + 1], blu = master.data[sIdx + 2];
                const snapped = findClosestPaletteColor(red, grn, blu);

                nativeBuf[dIdx] = snapped[0];
                nativeBuf[dIdx + 1] = snapped[1];
                nativeBuf[dIdx + 2] = snapped[2];
                nativeBuf[dIdx + 3] = 255;
            }
        }
    }
}

// Frequency filter to <= 31 distinct colors
const colorCounts = new Map();
for (let i = 0; i < nativeBuf.length; i += 4) {
    if (nativeBuf[i + 3] === 255) {
        const key = (nativeBuf[i] << 16) | (nativeBuf[i + 1] << 8) | nativeBuf[i + 2];
        colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
    }
}
const sortedColors = Array.from(colorCounts.entries()).sort((a, b) => b[1] - a[1]);
console.log(`Pre-filter color count: ${sortedColors.length}`);

if (sortedColors.length > 31) {
    const top31 = sortedColors.slice(0, 31).map(e => [(e[0] >> 16) & 255, (e[0] >> 8) & 255, e[0] & 255]);
    const topLab = top31.map(c => srgbToLab(c[0], c[1], c[2]));
    for (let i = 0; i < nativeBuf.length; i += 4) {
        if (nativeBuf[i + 3] === 255) {
            const curKey = (nativeBuf[i] << 16) | (nativeBuf[i + 1] << 8) | nativeBuf[i + 2];
            const inTop = top31.some(c => ((c[0] << 16) | (c[1] << 8) | c[2]) === curKey);
            if (!inTop) {
                const lab = srgbToLab(nativeBuf[i], nativeBuf[i + 1], nativeBuf[i + 2]);
                let minD = Infinity, best = top31[0];
                for (let j = 0; j < top31.length; j++) {
                    const d = Math.hypot(lab[0] - topLab[j][0], lab[1] - topLab[j][1], lab[2] - topLab[j][2]);
                    if (d < minD) { minD = d; best = top31[j]; }
                }
                nativeBuf[i] = best[0];
                nativeBuf[i + 1] = best[1];
                nativeBuf[i + 2] = best[2];
            }
        }
    }
}

const finalSet = new Set();
for (let i = 0; i < nativeBuf.length; i += 4) {
    if (nativeBuf[i + 3] === 255) {
        finalSet.add((nativeBuf[i] << 16) | (nativeBuf[i + 1] << 8) | nativeBuf[i + 2]);
    }
}
console.log(`Final distinct colors: ${finalSet.size} (limit 32)`);

if (!fs.existsSync(STAGING_DIR)) fs.mkdirSync(STAGING_DIR, { recursive: true });
if (!fs.existsSync(REVIEW_DIR)) fs.mkdirSync(REVIEW_DIR, { recursive: true });

const stagingPng = path.join(STAGING_DIR, '!$UF_Campfire.png');
const stagingJson = path.join(STAGING_DIR, '!$UF_Campfire.json');

writePNG(stagingPng, 144, 192, nativeBuf);

const sidecar = {
    id: "campfire",
    name: "Campfire",
    generator: "gemini-3-pro-image",
    model: "Google Nano Banana Pro",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S", "W", "E", "N"],
    animations: {
        stand: [0, 1, 2],
        burn: [0, 1, 2]
    },
    frameMs: 150,
    standard: "Project DEUS 16-bit HD"
};

fs.writeFileSync(stagingJson, JSON.stringify(sidecar, null, 2));
console.log(`Wrote staging files: ${stagingPng} and ${stagingJson}`);

// Generate 5-step Playback Cycle Sheet (0 -> 1 -> 2 -> 1 -> 0) at 4x scale
const scale = 4;
const cycleCols = [0, 1, 2, 1, 0];
const pW = 48 * cycleCols.length * scale;
const pH = 48 * 4 * scale;
const pBuf = Buffer.alloc(pW * pH * 4);

// Fill with dark background #16171F
for (let i = 0; i < pBuf.length; i += 4) {
    pBuf[i] = 22; pBuf[i + 1] = 23; pBuf[i + 2] = 31; pBuf[i + 3] = 255;
}

for (let r = 0; r < 4; r++) {
    for (let ci = 0; ci < cycleCols.length; ci++) {
        const c = cycleCols[ci];
        const srcX0 = c * 48, srcY0 = r * 48;
        const dstX0 = ci * 48 * scale, dstY0 = r * 48 * scale;
        for (let py = 0; py < 48; py++) {
            for (let px = 0; px < 48; px++) {
                const sIdx = ((srcY0 + py) * 144 + (srcX0 + px)) * 4;
                if (nativeBuf[sIdx + 3] === 255) {
                    const rCol = nativeBuf[sIdx], gCol = nativeBuf[sIdx + 1], bCol = nativeBuf[sIdx + 2];
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

const pbPath = path.join(REVIEW_DIR, 'campfire_playback_cycle.png');
writePNG(pbPath, pW, pH, pBuf);
fs.copyFileSync(pbPath, path.join(BRAIN_DIR, 'campfire_playback_cycle.png'));
console.log('Saved campfire playback cycle sheet');
