const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const { decodePNG } = require('../tools/png_read');
const { writePNG } = require('../tools/png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');
const RAW_SRC_PNG = path.join(ROOT, 'scratch', 'rocks_small_cand2.png');

// CIELAB color conversion functions
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

function loadPalette() {
    const text = fs.readFileSync(PALETTE_FILE, 'utf8');
    const unique = [];
    const index = new Map();
    for (const line of text.split(/\r?\n/)) {
        const rgb = parseHex(line);
        if (!rgb) continue;
        const k = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
        if (!index.has(k)) {
            index.set(k, unique.length);
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

const decoded = decodePNG(fs.readFileSync(RAW_SRC_PNG), 'rocks_small_cand2.png');
const imgW = decoded.width;
const imgH = decoded.height;
const imgData = decoded.data;

function getSrcPixel(x, y) {
    if (x < 0 || x >= imgW || y < 0 || y >= imgH) return [255, 0, 255];
    const o = (y * imgW + x) * 4;
    return [imgData[o], imgData[o + 1], imgData[o + 2]];
}

// 1. Find bounding box of non-magenta pixels
let minX = imgW, maxX = 0, minY = imgH, maxY = 0;
for (let y = 0; y < imgH; y++) {
    for (let x = 0; x < imgW; x++) {
        const [r, g, b] = getSrcPixel(x, y);
        const isMagenta = (r > 165 && g < 85 && b > 165);
        if (!isMagenta) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    }
}

const bboxW = maxX - minX + 1;
const bboxH = maxY - minY + 1;
console.log(`Bounding box: (${minX}, ${minY}) to (${maxX}, ${maxY}), size: ${bboxW}x${bboxH}`);

// 2. Map into 48x48 frame
// Sizing per ART_STANDARD: Loose stones 12-28 px tall, 36 px wide.
// Bottom grounded on row 47, leaving rows 0..27 clear so units stand calm over it
const targetW = 36;
const targetH = Math.round(targetW * (bboxH / bboxW)); // 20 px
const startY = 47 - targetH + 1; // row 28
const startX = Math.round((48 - targetW) / 2); // col 6

console.log(`Mapped size in 48x48 frame: ${targetW}x${targetH} at startCol=${startX}, startRow=${startY}`);

const grid = Array.from({ length: 48 }, () => Array(48).fill(null));

for (let dy = 0; dy < targetH; dy++) {
    for (let dx = 0; dx < targetW; dx++) {
        const gy = startY + dy;
        const gx = startX + dx;
        
        const srcY0 = minY + Math.floor(dy * (bboxH / targetH));
        const srcY1 = minY + Math.floor((dy + 1) * (bboxH / targetH));
        const srcX0 = minX + Math.floor(dx * (bboxW / targetW));
        const srcX1 = minX + Math.floor((dx + 1) * (bboxW / targetW));
        
        let sumR = 0, sumG = 0, sumB = 0, rockCount = 0, totalCount = 0;
        for (let sy = srcY0; sy < srcY1; sy++) {
            for (let sx = srcX0; sx < srcX1; sx++) {
                totalCount++;
                const [r, g, b] = getSrcPixel(sx, sy);
                const isMagenta = (r > 165 && g < 85 && b > 165);
                if (!isMagenta) {
                    sumR += r;
                    sumG += g;
                    sumB += b;
                    rockCount++;
                }
            }
        }
        
        if (rockCount > totalCount * 0.38) {
            const avgR = Math.round(sumR / rockCount);
            const avgG = Math.round(sumG / rockCount);
            const avgB = Math.round(sumB / rockCount);
            let snapped = pal.snap(avgR, avgG, avgB);
            
            // Defringe: if snapped color is purple/magenta from background bleed, snap to neutral dark outline
            const [sr, sg, sb] = snapped;
            if ((sr > sg + 15 && sb > sg + 15) || (sr === 36 && sg === 0 && sb === 36) || (sr === 24 && sg === 0 && sb === 24) || (sr === 53 && sg === 0 && sb === 53)) {
                // Remap to #242424 (neutral dark outline) or #353535
                snapped = [36, 36, 36];
            }
            grid[gy][gx] = snapped;
        }
    }
}

// 3. Count colors
const usedColors = new Map();
for (let y = 0; y < 48; y++) {
    for (let x = 0; x < 48; x++) {
        const c = grid[y][x];
        if (c) {
            const k = (c[0] << 16) | (c[1] << 8) | c[2];
            usedColors.set(k, (usedColors.get(k) || 0) + 1);
        }
    }
}

if (usedColors.size > 32) {
    const sorted = [...usedColors.entries()].sort((a, b) => b[1] - a[1]);
    const topPalette = sorted.slice(0, 32).map(([k]) => [(k >> 16) & 255, (k >> 8) & 255, k & 255]);
    const topLab = topPalette.map(c => srgbToLab(...c));
    
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const c = grid[y][x];
            if (!c) continue;
            const k = (c[0] << 16) | (c[1] << 8) | c[2];
            const isTop = topPalette.some(tc => ((tc[0] << 16) | (tc[1] << 8) | tc[2]) === k);
            if (!isTop) {
                const l = srgbToLab(...c);
                let best = topPalette[0], bd = Infinity;
                for (let i = 0; i < topLab.length; i++) {
                    const d = labDist(l, topLab[i]);
                    if (d < bd) { bd = d; best = topPalette[i]; }
                }
                grid[y][x] = best;
            }
        }
    }
}

const colorSet = new Set();
for (let y = 0; y < 48; y++) {
    for (let x = 0; x < 48; x++) {
        const c = grid[y][x];
        if (c) colorSet.add((c[0] << 16) | (c[1] << 8) | c[2]);
    }
}
console.log(`Final unique colors: ${colorSet.size}/32`);

// 4. Save art/masters/rocks_small.png (48x48 native PNG with alpha 0 or 255)
const masterBuf = Buffer.alloc(48 * 48 * 4);
for (let y = 0; y < 48; y++) {
    for (let x = 0; x < 48; x++) {
        const o = (y * 48 + x) * 4;
        const c = grid[y][x];
        if (c) {
            masterBuf[o] = c[0];
            masterBuf[o + 1] = c[1];
            masterBuf[o + 2] = c[2];
            masterBuf[o + 3] = 255;
        } else {
            masterBuf[o] = 0;
            masterBuf[o + 1] = 0;
            masterBuf[o + 2] = 0;
            masterBuf[o + 3] = 0;
        }
    }
}
const masterPath = path.join(ROOT, 'art', 'masters', 'rocks_small.png');
writePNG(masterPath, 48, 48, masterBuf);
console.log(`Saved master: ${masterPath}`);

// 5. Save art/masters/rocks_small.json sidecar
const sidecar = {
    id: "rocks_small",
    name: "Loose stones",
    category: "Geology",
    dimensions: "48x48",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S"],
    animations: {
        stand: [0]
    },
    layer: "under",
    palette: "art/palette/uf.hex",
    colorCount: colorSet.size,
    updatedDate: "2026-09-19"
};
const sidecarPath = path.join(ROOT, 'art', 'masters', 'rocks_small.json');
fs.writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2), 'utf8');
console.log(`Saved sidecar: ${sidecarPath}`);

// 6. Save art/raw/rocks_small.png (4x canvas: 192x192 on solid #FF00FF magenta background)
const raw4xBuf = Buffer.alloc(192 * 192 * 4);
for (let y = 0; y < 192; y++) {
    for (let x = 0; x < 192; x++) {
        const gx = Math.floor(x / 4);
        const gy = Math.floor(y / 4);
        const o = (y * 192 + x) * 4;
        const c = grid[gy][gx];
        if (c) {
            raw4xBuf[o] = c[0];
            raw4xBuf[o + 1] = c[1];
            raw4xBuf[o + 2] = c[2];
            raw4xBuf[o + 3] = 255;
        } else {
            raw4xBuf[o] = 255;
            raw4xBuf[o + 1] = 0;
            raw4xBuf[o + 2] = 255;
            raw4xBuf[o + 3] = 255;
        }
    }
}
const rawPath = path.join(ROOT, 'art', 'raw', 'rocks_small.png');
writePNG(rawPath, 192, 192, raw4xBuf);
console.log(`Saved 4x raw: ${rawPath}`);

// 7. Visual review renders in art/review/
// A. 4x on magenta
const reviewMagentaPath = path.join(ROOT, 'art', 'review', 'rocks_small_4x_magenta.png');
writePNG(reviewMagentaPath, 192, 192, raw4xBuf);

// B. 4x on meadow grass
let meadowDecoded = null;
try {
    meadowDecoded = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'meadow.png')), 'meadow.png');
} catch (e) {
    console.log('Meadow master not found, skipping composite on meadow');
}

if (meadowDecoded) {
    const meadowBuf = Buffer.alloc(192 * 192 * 4);
    for (let y = 0; y < 192; y++) {
        for (let x = 0; x < 192; x++) {
            const mx = Math.floor(x / 4) % meadowDecoded.width;
            const my = Math.floor(y / 4) % meadowDecoded.height;
            const mo = (my * meadowDecoded.width + mx) * 4;
            
            const gx = Math.floor(x / 4);
            const gy = Math.floor(y / 4);
            const c = grid[gy][gx];
            const o = (y * 192 + x) * 4;
            
            if (c) {
                meadowBuf[o] = c[0];
                meadowBuf[o + 1] = c[1];
                meadowBuf[o + 2] = c[2];
                meadowBuf[o + 3] = 255;
            } else {
                meadowBuf[o] = meadowDecoded.data[mo];
                meadowBuf[o + 1] = meadowDecoded.data[mo + 1];
                meadowBuf[o + 2] = meadowDecoded.data[mo + 2];
                meadowBuf[o + 3] = 255;
            }
        }
    }
    const reviewMeadowPath = path.join(ROOT, 'art', 'review', 'rocks_small_on_meadow_4x.png');
    writePNG(reviewMeadowPath, 192, 192, meadowBuf);
    console.log(`Saved meadow review: ${reviewMeadowPath}`);
}

// C. Review showcase: Settler standing next to and over loose stones (2 tiles wide = 96x48 at 1x, 384x192 at 4x)
let settlerDecoded = null;
try {
    settlerDecoded = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'human_male_stand_south.png')), 'human_male_stand_south.png');
} catch (e) {
    console.log('Settler not found, skipping settler composite');
}

if (settlerDecoded && meadowDecoded) {
    // 2 tiles wide (96 px), 1 tile tall (48 px) at 4x = 384x192
    const compW = 384;
    const compH = 192;
    const compBuf = Buffer.alloc(compW * compH * 4);
    
    // Left tile (0..47): Settler standing on meadow
    // Right tile (48..95): Rocks_small on meadow with Settler standing over them (layer: under)
    for (let y = 0; y < compH; y++) {
        for (let x = 0; x < compW; x++) {
            const o = (y * compW + x) * 4;
            const screenX = Math.floor(x / 4);
            const screenY = Math.floor(y / 4);
            
            // Meadow ground
            const mx = screenX % meadowDecoded.width;
            const my = screenY % meadowDecoded.height;
            const mo = (my * meadowDecoded.width + mx) * 4;
            let r = meadowDecoded.data[mo];
            let g = meadowDecoded.data[mo + 1];
            let b = meadowDecoded.data[mo + 2];
            
            if (screenX < 48) {
                // Left tile: settler only
                const so = (screenY * 48 + screenX) * 4;
                if (settlerDecoded.data[so + 3] > 0) {
                    r = settlerDecoded.data[so];
                    g = settlerDecoded.data[so + 1];
                    b = settlerDecoded.data[so + 2];
                }
            } else {
                // Right tile: rocks_small, and settler standing on it (demonstrating layer: under)
                const rx = screenX - 48;
                const ry = screenY;
                const rc = grid[ry][rx];
                if (rc) {
                    r = rc[0];
                    g = rc[1];
                    b = rc[2];
                }
                // Settler overlay
                const so = (ry * 48 + rx) * 4;
                if (settlerDecoded.data[so + 3] > 0) {
                    r = settlerDecoded.data[so];
                    g = settlerDecoded.data[so + 1];
                    b = settlerDecoded.data[so + 2];
                }
            }
            
            compBuf[o] = r;
            compBuf[o + 1] = g;
            compBuf[o + 2] = b;
            compBuf[o + 3] = 255;
        }
    }
    
    const reviewCompPath = path.join(ROOT, 'art', 'review', 'rocks_small_settler_showcase_4x.png');
    writePNG(reviewCompPath, compW, compH, compBuf);
    console.log(`Saved showcase review: ${reviewCompPath}`);
}
