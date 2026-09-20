const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');
const PNG_SRC = 'C:/Users/snewt/.gemini/antigravity/brain/3ffbd16e-0b90-4fbe-9345-ac504edad4c5/oak_tree_grand_3x3.png';

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

const decoded = decodePNG(fs.readFileSync(PNG_SRC), 'oak_tree_grand_3x3.png');
const imgW = decoded.width;
const imgH = decoded.height;
const imgData = decoded.data;

function isBgPixel(r, g, b) {
    // Detect magenta background and JPEG compression fringe
    // Magenta is high R, low G, high B
    if (r > 140 && g < 100 && b > 140) return true;
    if (r > 120 && g < 80 && b > 100) return true;
    if (r > 160 && b > 140 && g < 130) return true;
    return false;
}

function getSrcPixel(x, y) {
    if (x < 0 || x >= imgW || y < 0 || y >= imgH) return [255, 0, 255];
    const o = (y * imgW + x) * 4;
    return [imgData[o], imgData[o + 1], imgData[o + 2]];
}

// 1. Bounding box
let minX = imgW, maxX = 0, minY = imgH, maxY = 0;
for (let y = 0; y < imgH; y++) {
    for (let x = 0; x < imgW; x++) {
        const [r, g, b] = getSrcPixel(x, y);
        if (!isBgPixel(r, g, b)) {
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

// 2. Map into 144x144 frame (3x3 RPG Maker tiles)
const targetH = 138;
const targetW = Math.round(targetH * (bboxW / bboxH));
const startY = 143 - targetH + 1;
const startX = Math.round((144 - targetW) / 2);

const grid = Array.from({ length: 144 }, () => Array(144).fill(null));

for (let dy = 0; dy < targetH; dy++) {
    for (let dx = 0; dx < targetW; dx++) {
        const gy = startY + dy;
        const gx = startX + dx;
        if (gy < 0 || gy >= 144 || gx < 0 || gx >= 144) continue;
        
        const srcY0 = minY + Math.floor(dy * (bboxH / targetH));
        const srcY1 = minY + Math.floor((dy + 1) * (bboxH / targetH));
        const srcX0 = minX + Math.floor(dx * (bboxW / targetW));
        const srcX1 = minX + Math.floor((dx + 1) * (bboxW / targetW));
        
        let sumR = 0, sumG = 0, sumB = 0, treeCount = 0, totalCount = 0;
        for (let sy = srcY0; sy < srcY1; sy++) {
            for (let sx = srcX0; sx < srcX1; sx++) {
                totalCount++;
                const [r, g, b] = getSrcPixel(sx, sy);
                if (!isBgPixel(r, g, b)) {
                    sumR += r;
                    sumG += g;
                    sumB += b;
                    treeCount++;
                }
            }
        }
        
        if (treeCount > totalCount * 0.40) {
            let avgR = Math.round(sumR / treeCount);
            let avgG = Math.round(sumG / treeCount);
            let avgB = Math.round(sumB / treeCount);
            
            // Check for magenta contamination: if red and blue are abnormally high compared to green
            if (avgR > avgG && avgB > avgG) {
                // Contaminated fringe: if in top half (canopy), it's dark green leaf outline
                if (dy < targetH * 0.65) {
                    avgR = 16; avgG = 28; avgB = 12; // deep dark forest green outline
                } else {
                    avgR = 32; avgG = 20; avgB = 8; // deep dark bark outline
                }
            }
            grid[gy][gx] = pal.snap(avgR, avgG, avgB);
        }
    }
}

// 3. Keep top 32 colors
const usedColors = new Map();
for (let y = 0; y < 144; y++) {
    for (let x = 0; x < 144; x++) {
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
    
    for (let y = 0; y < 144; y++) {
        for (let x = 0; x < 144; x++) {
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

// Save 144x144 master
const masterBuf = Buffer.alloc(144 * 144 * 4);
for (let y = 0; y < 144; y++) {
    for (let x = 0; x < 144; x++) {
        const o = (y * 144 + x) * 4;
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

const masterFile = path.join(ROOT, 'art', 'masters', 'oak_grand_3x3_144x144.png');
writePNG(masterFile, 144, 144, masterBuf);
console.log(`Saved master grand oak without fringe: ${masterFile}`);
