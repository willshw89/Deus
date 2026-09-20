'use strict';
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const raw = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'pro_wolf_walk.png')), 'wolf');

// Check cell (585, 390, 835, 573) - Row 2, Col 2 (West stand)
const x0 = 585, y0 = 390, x1 = 835, y1 = 573;
const w = x1 - x0 + 1, h = y1 - y0 + 1;
const isBg = new Uint8Array(w * h);

function isMagenta(r, g, b) {
    if (r > 110 && b > 110 && (r + b) > (g * 2 + 20)) return true;
    if (r > 130 && b > 130 && g < 120) return true;
    if (r > 170 && b > 170) return true;
    return false;
}

// Queue for BFS flood fill
const queue = [];
function pushIfBg(x, y) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const idx = y * w + x;
    if (isBg[idx]) return;
    const sidx = ((y0 + y) * raw.width + (x0 + x)) * 4;
    const r = raw.data[sidx], g = raw.data[sidx+1], b = raw.data[sidx+2];
    // Border line or magenta
    if (isMagenta(r, g, b) || (r < 30 && g < 30 && b < 30 && (y < 4 || y > h - 4 || x < 4 || x > w - 4))) {
        isBg[idx] = 1;
        queue.push(x, y);
    }
}

// Seed borders
for (let x = 0; x < w; x++) {
    pushIfBg(x, 0);
    pushIfBg(x, h - 1);
}
for (let y = 0; y < h; y++) {
    pushIfBg(0, y);
    pushIfBg(w - 1, y);
}

// Flood fill
let head = 0;
while (head < queue.length) {
    const cx = queue[head++];
    const cy = queue[head++];
    const neighbors = [
        [cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1],
        [cx + 1, cy + 1], [cx - 1, cy + 1], [cx + 1, cy - 1], [cx - 1, cy - 1]
    ];
    for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            const nidx = ny * w + nx;
            if (!isBg[nidx]) {
                const sidx = ((y0 + ny) * raw.width + (x0 + nx)) * 4;
                const r = raw.data[sidx], g = raw.data[sidx+1], b = raw.data[sidx+2];
                if (isMagenta(r, g, b)) {
                    isBg[nidx] = 1;
                    queue.push(nx, ny);
                }
            }
        }
    }
}

// Find bounding box of foreground
let minX = w, maxX = 0, minY = h, maxY = 0;
for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
        if (!isBg[y * w + x]) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    }
}

console.log('Foreground box inside cell:', { minX, maxX, minY, maxY, fgW: maxX - minX + 1, fgH: maxY - minY + 1 });
console.log('Absolute coordinates:', {
    x0: x0 + minX,
    y0: y0 + minY,
    x1: x0 + maxX,
    y1: y0 + maxY
});

