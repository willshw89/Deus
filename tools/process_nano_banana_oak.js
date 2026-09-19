const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');
const PNG_SRC = 'C:/Users/snewt/.gemini/antigravity/brain/3ffbd16e-0b90-4fbe-9345-ac504edad4c5/oak_tree_stand.png';

// CIELAB color conversion functions (matching make_25d.js)
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

console.log('Reading PNG from:', PNG_SRC);
const decoded = decodePNG(fs.readFileSync(PNG_SRC), 'oak_tree_stand.png');
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
        const isMagenta = (r > 170 && g < 80 && b > 170);
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

// 2. Map into 96x96 frame
// Oak spec in GENERATOR_PROMPTS.md: 80-96 px wide and tall, 96x96 frame.
// Trunk grounded on row 95.
// Anchor = [48, 95].
const targetH = 92;
const targetW = Math.round(targetH * (bboxW / bboxH));
const startY = 95 - targetH + 1; // 4
const startX = Math.round((96 - targetW) / 2);
console.log(`Mapped size in 96x96 frame: ${targetW}x${targetH} at startCol=${startX}, startRow=${startY}`);

const grid = Array.from({ length: 96 }, () => Array(96).fill(null));

for (let dy = 0; dy < targetH; dy++) {
    for (let dx = 0; dx < targetW; dx++) {
        const gy = startY + dy;
        const gx = startX + dx;
        
        // Sample area in source image
        const srcY0 = minY + Math.floor(dy * (bboxH / targetH));
        const srcY1 = minY + Math.floor((dy + 1) * (bboxH / targetH));
        const srcX0 = minX + Math.floor(dx * (bboxW / targetW));
        const srcX1 = minX + Math.floor((dx + 1) * (bboxW / targetW));
        
        let sumR = 0, sumG = 0, sumB = 0, treeCount = 0, totalCount = 0;
        for (let sy = srcY0; sy < srcY1; sy++) {
            for (let sx = srcX0; sx < srcX1; sx++) {
                totalCount++;
                const [r, g, b] = getSrcPixel(sx, sy);
                const isMagenta = (r > 170 && g < 80 && b > 170);
                if (!isMagenta) {
                    sumR += r;
                    sumG += g;
                    sumB += b;
                    treeCount++;
                }
            }
        }
        
        // Threshold: if majority is tree
        if (treeCount > totalCount * 0.35) {
            const avgR = Math.round(sumR / treeCount);
            const avgG = Math.round(sumG / treeCount);
            const avgB = Math.round(sumB / treeCount);
            grid[gy][gx] = pal.snap(avgR, avgG, avgB);
        }
    }
}

// 3. Count colors
const usedColors = new Map();
for (let y = 0; y < 96; y++) {
    for (let x = 0; x < 96; x++) {
        const c = grid[y][x];
        if (c) {
            const k = (c[0] << 16) | (c[1] << 8) | c[2];
            usedColors.set(k, (usedColors.get(k) || 0) + 1);
        }
    }
}
console.log(`Unique colors before reduction: ${usedColors.size}`);

// If > 32 colors, keep top 31 and re-map rarest to nearest top color
if (usedColors.size > 32) {
    const sorted = [...usedColors.entries()].sort((a, b) => b[1] - a[1]);
    const topPalette = sorted.slice(0, 32).map(([k]) => [(k >> 16) & 255, (k >> 8) & 255, k & 255]);
    const topLab = topPalette.map(c => srgbToLab(...c));
    
    for (let y = 0; y < 96; y++) {
        for (let x = 0; x < 96; x++) {
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

const finalColors = new Set();
for (let y = 0; y < 96; y++) {
    for (let x = 0; x < 96; x++) {
        const c = grid[y][x];
        if (c) finalColors.add((c[0] << 16) | (c[1] << 8) | c[2]);
    }
}
console.log(`Final unique colors: ${finalColors.size}/32`);

// 4. Save 96x96 master frame (RGBA with transparent background or magenta)
// For RMMZ and masters: alpha 0/255 transparent PNG
const masterBuf = Buffer.alloc(96 * 96 * 4);
for (let y = 0; y < 96; y++) {
    for (let x = 0; x < 96; x++) {
        const o = (y * 96 + x) * 4;
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

const masterFile = path.join(ROOT, 'art', 'masters', 'oak_stand_96x96.png');
writePNG(masterFile, 96, 96, masterBuf);
console.log(`Saved master stand frame: ${masterFile}`);

// Also save review render at 4x on magenta and on meadow
const scale4x = 4;
const review4xBuf = Buffer.alloc(96 * scale4x * 96 * scale4x * 4);
for (let y = 0; y < 96 * scale4x; y++) {
    for (let x = 0; x < 96 * scale4x; x++) {
        const srcX = Math.floor(x / scale4x);
        const srcY = Math.floor(y / scale4x);
        const o = (y * (96 * scale4x) + x) * 4;
        const c = grid[srcY][srcX];
        if (c) {
            review4xBuf[o] = c[0];
            review4xBuf[o + 1] = c[1];
            review4xBuf[o + 2] = c[2];
            review4xBuf[o + 3] = 255;
        } else {
            // Magenta background
            review4xBuf[o] = 255;
            review4xBuf[o + 1] = 0;
            review4xBuf[o + 2] = 255;
            review4xBuf[o + 3] = 255;
        }
    }
}

const review4xFile = path.join(ROOT, 'art', 'review', 'oak_stand_4x_magenta.png');
writePNG(review4xFile, 96 * scale4x, 96 * scale4x, review4xBuf);
console.log(`Saved 4x review on magenta: ${review4xFile}`);
