'use strict';
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');

const ROOT = path.resolve(__dirname, '..');

function isPurpleOrMagenta(r, g, b) {
    if (r > 60 && b > 60 && (r + b) > (g * 2 + 20)) return true;
    if (r > 120 && b > 120 && g < 110) return true;
    if (r > 170 && b > 170) return true;
    return false;
}

function extractSprite(raw, x0, y0, x1, y1) {
    let minX = 9999, maxX = -1, minY = 9999, maxY = -1;
    for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
            const idx = (y * raw.width + x) * 4;
            const r = raw.data[idx], g = raw.data[idx+1], b = raw.data[idx+2];
            if (!isPurpleOrMagenta(r, g, b)) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (minX > maxX) return null;
    return { x0: minX, y0: minY, x1: maxX, y1: maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

const files = ['pro_sheep_walk.png', 'pro_sheep_eat.png', 'pro_sheep_attack.png', 'pro_sheep_sleep.png'];

for (const f of files) {
    const p = path.join(ROOT, 'art', 'raw', f);
    if (!fs.existsSync(p)) {
        console.log(`\n=== ${f}: NOT READY YET ===`);
        continue;
    }
    const raw = decodePNG(fs.readFileSync(p), f);
    console.log(`\n=== ${f} (${raw.width}x${raw.height}) ===`);
    for (let r = 0; r < 4; r++) {
        const y0 = r * 192, y1 = (r + 1) * 192 - 1;
        const xProfile = new Array(raw.width).fill(0);
        for (let y = y0; y <= y1; y++) {
            for (let x = 0; x < raw.width; x++) {
                const idx = (y * raw.width + x) * 4;
                if (!isPurpleOrMagenta(raw.data[idx], raw.data[idx+1], raw.data[idx+2])) xProfile[x]++;
            }
        }
        const spans = [];
        let inSpan = false, startX = 0;
        for (let x = 0; x < raw.width; x++) {
            if (xProfile[x] > 5) {
                if (!inSpan) { inSpan = true; startX = x; }
            } else {
                if (inSpan) {
                    inSpan = false;
                    if (x - startX > 15) spans.push({ startX, endX: x - 1, w: x - startX });
                }
            }
        }
        if (inSpan && raw.width - startX > 15) spans.push({ startX, endX: raw.width - 1, w: raw.width - startX });
        console.log(`Row ${r}: ${spans.length} clusters:`);
        spans.forEach((s, idx) => {
            let minY = 9999, maxY = -1;
            for (let y = y0; y <= y1; y++) {
                for (let x = s.startX; x <= s.endX; x++) {
                    const i = (y * raw.width + x) * 4;
                    if (!isPurpleOrMagenta(raw.data[i], raw.data[i+1], raw.data[i+2])) {
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }
            console.log(`  C${idx}: [${s.startX}..${s.endX}] (${s.w}px wide), Y [${minY}..${maxY}] (${maxY - minY + 1}px tall)`);
        });
    }
}
