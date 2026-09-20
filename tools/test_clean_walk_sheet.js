'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const img = decodePNG(fs.readFileSync('art/raw/human_male_pro_4d_walk.png'));
const PALETTE_FILE = 'art/palette/uf.hex';

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
    const seen = new Set();
    for (const line of text.split(/\r?\n/)) {
        const rgb = parseHex(line);
        if (!rgb) continue;
        const k = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
        if (!seen.has(k)) {
            seen.add(k);
            unique.push(rgb);
        }
    }
    const lab = unique.map(c => srgbToLab(...c));
    const cache = new Map();
    return {
        colors: unique,
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
const C_DARK_OUTLINE = pal.snap(24, 16, 10);

function applyDarkOutline(buf, w, h) {
    const isOpaque = (x, y) => (x >= 0 && x < w && y >= 0 && y < h && buf[(y * w + x) * 4 + 3] > 0);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            if (buf[idx + 3] === 0) continue;
            let border = false;
            for (let dy = -1; dy <= 1 && !border; dy++) {
                for (let dx = -1; dx <= 1 && !border; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    if (!isOpaque(x + dx, y + dy)) border = true;
                }
            }
            if (border) {
                buf[idx]     = C_DARK_OUTLINE[0];
                buf[idx + 1] = C_DARK_OUTLINE[1];
                buf[idx + 2] = C_DARK_OUTLINE[2];
            }
        }
    }
}

// Flood fill mask to find background in cell
function extractSpriteClean(minX, maxX, minY, maxY, targetH = 43) {
    const cellW = maxX - minX + 1;
    const cellH = maxY - minY + 1;
    const isBg = new Uint8Array(cellW * cellH); // 1 = bg, 0 = sprite

    const q = [];
    function isColorBg(rx, ry) {
        const idx = (ry * img.width + rx) * 4;
        const r = img.data[idx], g = img.data[idx+1], b = img.data[idx+2];
        // Magenta check
        if (r > 130 && b > 110 && g < 100 && (r + b) / 2 - g > 35) return true;
        // Black grid border line
        if (r < 25 && g < 25 && b < 25) return true;
        return false;
    }

    // Seed borders
    for (let x = 0; x < cellW; x++) {
        // top
        if (isColorBg(minX + x, minY)) { isBg[0 * cellW + x] = 1; q.push(x, 0); }
        // bottom
        if (isColorBg(minX + x, maxY)) { isBg[(cellH - 1) * cellW + x] = 1; q.push(x, cellH - 1); }
    }
    for (let y = 0; y < cellH; y++) {
        // left
        if (isColorBg(minX, minY + y)) { isBg[y * cellW + 0] = 1; q.push(0, y); }
        // right
        if (isColorBg(maxX, minY + y)) { isBg[y * cellW + cellW - 1] = 1; q.push(cellW - 1, y); }
    }

    // BFS
    let head = 0;
    while (head < q.length) {
        const cx = q[head++];
        const cy = q[head++];
        const dirs = [[1,0], [-1,0], [0,1], [0,-1]];
        for (const [dx, dy] of dirs) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && nx < cellW && ny >= 0 && ny < cellH) {
                const nIdx = ny * cellW + nx;
                if (isBg[nIdx] === 0 && isColorBg(minX + nx, minY + ny)) {
                    isBg[nIdx] = 1;
                    q.push(nx, ny);
                }
            }
        }
    }

    // Find bounding box of sprite (isBg === 0)
    let sMinX = Infinity, sMaxX = -Infinity, sMinY = Infinity, sMaxY = -Infinity;
    for (let y = 0; y < cellH; y++) {
        for (let x = 0; x < cellW; x++) {
            if (isBg[y * cellW + x] === 0) {
                if (x < sMinX) sMinX = x;
                if (x > sMaxX) sMaxX = x;
                if (y < sMinY) sMinY = y;
                if (y > sMaxY) sMaxY = y;
            }
        }
    }

    const origW = sMaxX - sMinX + 1;
    const origH = sMaxY - sMinY + 1;
    const scale = targetH / origH;
    const outW = Math.round(origW * scale);
    const outH = targetH;

    const out = Buffer.alloc(48 * 48 * 4);
    const dstBaseline = 47;
    const dstY0 = dstBaseline - outH + 1;
    const dstX0 = Math.round(24 - outW / 2);

    for (let dy = 0; dy < outH; dy++) {
        const ty = dstY0 + dy;
        if (ty < 0 || ty >= 48) continue;
        for (let dx = 0; dx < outW; dx++) {
            const tx = dstX0 + dx;
            if (tx < 0 || tx >= 48) continue;

            const srcMinX = sMinX + Math.floor(dx / scale);
            const srcMaxX = sMinX + Math.floor((dx + 1) / scale);
            const srcMinY = sMinY + Math.floor(dy / scale);
            const srcMaxY = sMinY + Math.floor((dy + 1) / scale);

            let rSum = 0, gSum = 0, bSum = 0, count = 0;
            for (let sy = srcMinY; sy <= srcMaxY; sy++) {
                if (sy < 0 || sy >= cellH) continue;
                for (let sx = srcMinX; sx <= srcMaxX; sx++) {
                    if (sx < 0 || sx >= cellW) continue;
                    if (isBg[sy * cellW + sx] === 0) {
                        const idx = ((minY + sy) * img.width + (minX + sx)) * 4;
                        rSum += img.data[idx];
                        gSum += img.data[idx+1];
                        bSum += img.data[idx+2];
                        count++;
                    }
                }
            }
            if (count > 0) {
                const avgR = Math.round(rSum / count);
                const avgG = Math.round(gSum / count);
                const avgB = Math.round(bSum / count);
                const snapped = pal.snap(avgR, avgG, avgB);
                const dIdx = (ty * 48 + tx) * 4;
                out[dIdx]   = snapped[0];
                out[dIdx+1] = snapped[1];
                out[dIdx+2] = snapped[2];
                out[dIdx+3] = 255;
            }
        }
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

// Let's test the 3 South frames, 3 East frames, and 3 North frames
const south0 = extractSpriteClean(0, 234, 0, 258, 43);
const south1 = extractSpriteClean(234, 470, 0, 258, 43);
const south2 = extractSpriteClean(470, 704, 0, 258, 43);

const east0  = extractSpriteClean(938, 1172, 0, 258, 43); // Row 0 Cell 4: stride 1
const east1  = extractSpriteClean(0, 234, 258, 511, 43);   // Row 1 Cell 0: side stand
const east2  = extractSpriteClean(1172, 1408, 0, 258, 43); // Row 0 Cell 5: stride 2

const north0 = extractSpriteClean(0, 234, 511, 767, 43);   // Row 2 Cell 0: step 1
const north1 = extractSpriteClean(470, 704, 511, 767, 43); // Row 2 Cell 2: stand
const north2 = extractSpriteClean(234, 470, 511, 767, 43); // Row 2 Cell 1: step 2

function mirrorFrame(frame) {
    const out = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            const dIdx = (y * 48 + (47 - x)) * 4;
            out[dIdx]     = frame[sIdx];
            out[dIdx + 1] = frame[sIdx + 1];
            out[dIdx + 2] = frame[sIdx + 2];
            out[dIdx + 3] = frame[sIdx + 3];
        }
    }
    return out;
}

const west0 = mirrorFrame(east0);
const west1 = mirrorFrame(east1);
const west2 = mirrorFrame(east2);

// Build 144x192 sheet
const testSheet = Buffer.alloc(144 * 192 * 4);
const rows = [
    [south0, south1, south2],
    [west0, west1, west2],
    [east0, east1, east2],
    [north0, north1, north2]
];

for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
        const f = rows[r][c];
        for (let py = 0; py < 48; py++) {
            for (let px = 0; px < 48; px++) {
                const sIdx = (py * 48 + px) * 4;
                if (f[sIdx + 3] > 0) {
                    const dIdx = ((r * 48 + py) * 144 + (c * 48 + px)) * 4;
                    testSheet[dIdx]   = f[sIdx];
                    testSheet[dIdx+1] = f[sIdx+1];
                    testSheet[dIdx+2] = f[sIdx+2];
                    testSheet[dIdx+3] = 255;
                }
            }
        }
    }
}

writePNG('art/review/pro_walk_12_sheet.png', 144, 192, testSheet);
console.log('Saved art/review/pro_walk_12_sheet.png');

