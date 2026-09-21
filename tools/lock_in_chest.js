'use strict';

const fs = require('fs');
const path = require('path');
const { readPNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const MASTER_PATH = path.join(ROOT, 'art', 'masters', 'deus_chest_master_12sprites_pink.png');
const STAGING_DIR = path.join(ROOT, 'art', 'staging');
const PROD_DIR = path.join(ROOT, 'game', 'img', 'characters');
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

const CHEST_PALETTE = PALETTE.filter(c => {
    // Exclude any purple/magenta/pink colors
    const isPurple = (c[0] > c[1] + 10 && c[2] > c[1] + 10);
    return !isPurple;
});
const CHEST_PALETTE_LAB = CHEST_PALETTE.map(c => srgbToLab(c[0], c[1], c[2]));

function findClosestPaletteColor(r, g, b) {
    const lab = srgbToLab(r, g, b);
    let minD = Infinity, best = CHEST_PALETTE[0];
    for (let i = 0; i < CHEST_PALETTE.length; i++) {
        const d = Math.hypot(lab[0] - CHEST_PALETTE_LAB[i][0], lab[1] - CHEST_PALETTE_LAB[i][1], lab[2] - CHEST_PALETTE_LAB[i][2]);
        if (d < minD) { minD = d; best = CHEST_PALETTE[i]; }
    }
    return best;
}

function isBgColor(r, g, b) {
    return (r - g > 30 && b - g > 30);
}

const cellCols = [[3, 294], [301, 594], [601, 892]];
const cellRows = [[3, 297], [303, 596], [602, 895], [902, 1196]];

// Uniform scale factor
const globalScale = 38.0 / 260.0; // 0.1461538
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

        // Flood fill from outer borders of cell to identify all background pixels
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

        // Find bounds of chest in this cell
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

        const chestCenterX = (x0 + minX + x0 + maxX) / 2.0;
        const chestBaseY = y0 + maxY;

        // Downsample into 48x48 cell
        const dstCellX0 = c * nativeCellSize;
        const dstCellY0 = r * nativeCellSize;

        for (let ny = 0; ny < nativeCellSize; ny++) {
            for (let nx = 0; nx < nativeCellSize; nx++) {
                const dIdx = ((dstCellY0 + ny) * 144 + (dstCellX0 + nx)) * 4;

                const relDx = nx - nativeAnchorX;
                const relDy = ny - nativeAnchorY;

                const mx = Math.round(chestCenterX + relDx / globalScale);
                const my = Math.round(chestBaseY + relDy / globalScale);

                // If outside cell or visited (background), transparent
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

                // Chest pixel: map to palette
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

// Frequency filter top colors to ensure <= 32 colors
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

// Ensure staging directory exists
if (!fs.existsSync(STAGING_DIR)) fs.mkdirSync(STAGING_DIR, { recursive: true });

const stagingPng = path.join(STAGING_DIR, '!$UF_Chest_Wood.png');
const stagingJson = path.join(STAGING_DIR, '!$UF_Chest_Wood.json');

writePNG(stagingPng, 144, 192, nativeBuf);

const sidecar = {
    id: "chest_wood",
    name: "Wooden Chest",
    generator: "gemini-3-pro-image",
    model: "Google Nano Banana Pro",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S", "W", "E", "N"],
    animations: {
        closed: [0],
        open: [0, 1, 2]
    },
    frameMs: 150,
    standard: "Project DEUS 16-bit HD"
};

fs.writeFileSync(stagingJson, JSON.stringify(sidecar, null, 2));
console.log(`Wrote staging files: ${stagingPng} and ${stagingJson}`);
