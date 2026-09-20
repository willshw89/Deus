const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const { writePNG } = require('../tools/png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');
const JPG_SRC = 'C:/Users/snewt/.gemini/antigravity/brain/3ffbd16e-0b90-4fbe-9345-ac504edad4c5/settler_male_nano_banana_1789833925244.jpg';

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

const { decodePNG } = require('./png_read');
const PNG_SRC = 'C:/Users/snewt/AppData/Local/Temp/uf_make_25d/settler_male_nano_banana_1789833925244.jpg.52556.png';
console.log('Reading PNG from:', PNG_SRC);
const decoded = decodePNG(fs.readFileSync(PNG_SRC), 'nano_banana.png');
const imgW = decoded.width;
const imgH = decoded.height;
const imgData = decoded.data;
console.log(`Decoded PNG: ${imgW}x${imgH}`);

function getSrcPixel(x, y) {
    if (x < 0 || x >= imgW || y < 0 || y >= imgH) return [255, 0, 255];
    const o = (y * imgW + x) * 4;
    return [imgData[o], imgData[o + 1], imgData[o + 2]];
}

// 2. Find bounding box of non-magenta pixels
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

// 3. Map into 48x48 frame
// Height = 46 px (rows 2..47)
// Bottom = row 47
// Top = row 2 (47 - 46 + 1 = 2)
// Aspect ratio preserved: targetW = Math.round(46 * (bboxW / bboxH))
const targetH = 46;
const targetW = Math.round(targetH * (bboxW / bboxH));
const startY = 2;
const startX = Math.round((48 - targetW) / 2);
console.log(`Mapped size in 48x48 frame: ${targetW}x${targetH} at startCol=${startX}, startRow=${startY}`);

const grid1x = Array.from({ length: 48 }, () => Array(48).fill(null));

for (let dy = 0; dy < targetH; dy++) {
    for (let dx = 0; dx < targetW; dx++) {
        const gy = startY + dy;
        const gx = startX + dx;
        
        // Sample area in source image
        const srcY0 = minY + Math.floor(dy * (bboxH / targetH));
        const srcY1 = minY + Math.floor((dy + 1) * (bboxH / targetH));
        const srcX0 = minX + Math.floor(dx * (bboxW / targetW));
        const srcX1 = minX + Math.floor((dx + 1) * (bboxW / targetW));
        
        let sumR = 0, sumG = 0, sumB = 0, charCount = 0, totalCount = 0;
        for (let sy = srcY0; sy < srcY1; sy++) {
            for (let sx = srcX0; sx < srcX1; sx++) {
                totalCount++;
                const [r, g, b] = getSrcPixel(sx, sy);
                const isMag = (r > 165 && g < 85 && b > 165);
                if (!isMag) {
                    sumR += r;
                    sumG += g;
                    sumB += b;
                    charCount++;
                }
            }
        }
        
        // If at least 38% of the box is character, this pixel is part of the character
        if (charCount > 0 && (charCount / totalCount) >= 0.38) {
            // Average ONLY the non-magenta pixels! Zero bleed!
            const avgR = Math.round(sumR / charCount);
            const avgG = Math.round(sumG / charCount);
            const avgB = Math.round(sumB / charCount);
            const snapped = pal.snap(avgR, avgG, avgB);
            grid1x[gy][gx] = snapped;
        } else {
            grid1x[gy][gx] = [255, 0, 255]; // Background
        }
    }
}

// 4. Fill background for all other pixels
for (let y = 0; y < 48; y++) {
    for (let x = 0; x < 48; x++) {
        if (!grid1x[y][x]) grid1x[y][x] = [255, 0, 255];
    }
}

// 5. Build 1x PNG buffer
const buf1x = Buffer.alloc(48 * 48 * 4);
for (let y = 0; y < 48; y++) {
    for (let x = 0; x < 48; x++) {
        const rgb = grid1x[y][x];
        const isBg = (rgb[0] === 255 && rgb[1] === 0 && rgb[2] === 255);
        const o = (y * 48 + x) * 4;
        buf1x[o]     = rgb[0];
        buf1x[o + 1] = rgb[1];
        buf1x[o + 2] = rgb[2];
        buf1x[o + 3] = isBg ? 0 : 255;
    }
}

// 6. Build 4x Raw Delivery Canvas (192x192 with crisp 4x4 blocks on #FF00FF)
const buf4x = Buffer.alloc(192 * 192 * 4);
for (let y = 0; y < 192; y++) {
    for (let x = 0; x < 192; x++) {
        const gx = Math.floor(x / 4);
        const gy = Math.floor(y / 4);
        const rgb = grid1x[gy][gx];
        const o = (y * 192 + x) * 4;
        buf4x[o]     = rgb[0];
        buf4x[o + 1] = rgb[1];
        buf4x[o + 2] = rgb[2];
        buf4x[o + 3] = 255; // Opaque magenta
    }
}

writePNG('scratch/test_nano_banana_settler_1x.png', 48, 48, buf1x);
writePNG('scratch/test_nano_banana_settler_4x.png', 192, 192, buf4x);
console.log('Saved scratch/test_nano_banana_settler_1x.png and scratch/test_nano_banana_settler_4x.png');
