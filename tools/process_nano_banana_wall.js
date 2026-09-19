const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');
const PNG_SRC = 'C:/Users/snewt/.gemini/antigravity/brain/3ffbd16e-0b90-4fbe-9345-ac504edad4c5/wall_wood_2square.png';

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

const decoded = decodePNG(fs.readFileSync(PNG_SRC), 'wall_wood_2square.png');
const imgW = decoded.width;
const imgH = decoded.height;
const imgData = decoded.data;

function isBgPixel(r, g, b) {
    if (r > 150 && g < 100 && b > 150) return true;
    if (r > 130 && g < 80 && b > 120) return true;
    if (r > 170 && b > 140 && g < 130) return true;
    return false;
}

function getSrcPixel(x, y) {
    if (x < 0 || x >= imgW || y < 0 || y >= imgH) return [255, 0, 255];
    const o = (y * imgW + x) * 4;
    return [imgData[o], imgData[o + 1], imgData[o + 2]];
}

// Bounding box
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

// Map into 48x96 frame (fills the full 48 width and 96 height)
const targetW = 48;
const targetH = 96;
const grid = Array.from({ length: targetH }, () => Array(targetW).fill(null));

for (let gy = 0; gy < targetH; gy++) {
    for (let gx = 0; gx < targetW; gx++) {
        const srcY0 = minY + Math.floor(gy * (bboxH / targetH));
        const srcY1 = minY + Math.floor((gy + 1) * (bboxH / targetH));
        const srcX0 = minX + Math.floor(gx * (bboxW / targetW));
        const srcX1 = minX + Math.floor((gx + 1) * (bboxW / targetW));
        
        let sumR = 0, sumG = 0, sumB = 0, wallCount = 0, totalCount = 0;
        for (let sy = srcY0; sy < srcY1; sy++) {
            for (let sx = srcX0; sx < srcX1; sx++) {
                totalCount++;
                const [r, g, b] = getSrcPixel(sx, sy);
                if (!isBgPixel(r, g, b)) {
                    sumR += r;
                    sumG += g;
                    sumB += b;
                    wallCount++;
                }
            }
        }
        
        if (wallCount > totalCount * 0.35) {
            let avgR = Math.round(sumR / wallCount);
            let avgG = Math.round(sumG / wallCount);
            let avgB = Math.round(sumB / wallCount);
            
            // Fringe cleanup
            if (avgR > avgG * 1.3 && avgB > avgG * 1.3) {
                avgR = 36; avgG = 24; avgB = 12; // deep dark timber edge
            }
            grid[gy][gx] = pal.snap(avgR, avgG, avgB);
        } else {
            // Fill edges to make a solid tileable wall piece
            grid[gy][gx] = pal.snap(48, 32, 16);
        }
    }
}

// Ensure 32 colors max
const usedColors = new Map();
for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
        const c = grid[y][x];
        const k = (c[0] << 16) | (c[1] << 8) | c[2];
        usedColors.set(k, (usedColors.get(k) || 0) + 1);
    }
}

if (usedColors.size > 32) {
    const sorted = [...usedColors.entries()].sort((a, b) => b[1] - a[1]);
    const topPalette = sorted.slice(0, 32).map(([k]) => [(k >> 16) & 255, (k >> 8) & 255, k & 255]);
    const topLab = topPalette.map(c => srgbToLab(...c));
    
    for (let y = 0; y < targetH; y++) {
        for (let x = 0; x < targetW; x++) {
            const c = grid[y][x];
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

// Save master 48x96
const masterBuf = Buffer.alloc(targetW * targetH * 4);
for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
        const o = (y * targetW + x) * 4;
        const c = grid[y][x];
        masterBuf[o] = c[0];
        masterBuf[o + 1] = c[1];
        masterBuf[o + 2] = c[2];
        masterBuf[o + 3] = 255;
    }
}

const masterFile = path.join(ROOT, 'art', 'masters', 'wall_wood.png');
writePNG(masterFile, targetW, targetH, masterBuf);
console.log(`Saved master 2-square wooden wall: ${masterFile} (${targetW}x${targetH})`);

// Sidecar
const sidecar = {
    id: "wall_wood",
    name: "Wooden Palisade Wall (2-Square)",
    category: "Site",
    frameWidth: 48,
    frameHeight: 96,
    anchor: [24, 95],
    footprint: [1, 2],
    facings: ["S"],
    animations: {
        straight: [0]
    }
};
const sidecarFile = path.join(ROOT, 'art', 'masters', 'wall_wood.json');
fs.writeFileSync(sidecarFile, JSON.stringify(sidecar, null, 2));
console.log(`Saved sidecar: ${sidecarFile}`);

// Save 4x review
const scale4 = 4;
const revBuf = Buffer.alloc(targetW * scale4 * targetH * scale4 * 4);
for (let y = 0; y < targetH * scale4; y++) {
    for (let x = 0; x < targetW * scale4; x++) {
        const srcX = Math.floor(x / scale4);
        const srcY = Math.floor(y / scale4);
        const o = (y * (targetW * scale4) + x) * 4;
        const c = grid[srcY][srcX];
        revBuf[o] = c[0];
        revBuf[o + 1] = c[1];
        revBuf[o + 2] = c[2];
        revBuf[o + 3] = 255;
    }
}
const revFile = path.join(ROOT, 'art', 'review', 'wall_wood_2square_4x.png');
writePNG(revFile, targetW * scale4, targetH * scale4, revBuf);
console.log(`Saved 4x review: ${revFile}`);
