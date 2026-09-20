'use strict';
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'raw');

function isBg(r, g, b) {
    if (r > 60 && b > 60 && (r + b) > (g * 2 + 20)) return true;
    if (r > 120 && b > 120 && g < 110) return true;
    if (r > 170 && b > 170) return true;
    return false;
}

function findComponentsInRow(raw, y0, y1) {
    // Project non-bg pixels onto x-axis
    const xProfile = new Array(raw.width).fill(0);
    for (let y = y0; y <= y1; y++) {
        for (let x = 0; x < raw.width; x++) {
            const idx = (y * raw.width + x) * 4;
            if (!isBg(raw.data[idx], raw.data[idx+1], raw.data[idx+2])) {
                xProfile[x]++;
            }
        }
    }

    // Find contiguous spans of non-zero x
    const spans = [];
    let inSpan = false;
    let startX = 0;
    for (let x = 0; x < raw.width; x++) {
        if (xProfile[x] > 5) { // threshold
            if (!inSpan) {
                inSpan = true;
                startX = x;
            }
        } else {
            if (inSpan) {
                inSpan = false;
                if (x - startX > 20) { // filter out thin noise
                    spans.push({ startX, endX: x - 1, w: x - startX });
                }
            }
        }
    }
    if (inSpan && raw.width - startX > 20) {
        spans.push({ startX, endX: raw.width - 1, w: raw.width - startX });
    }
    return spans;
}

const files = ['pro_boar_walk.png', 'pro_boar_eat.png', 'pro_boar_attack.png', 'pro_boar_sleep.png'];

for (const f of files) {
    const raw = decodePNG(fs.readFileSync(path.join(RAW_DIR, f)), f);
    console.log(`\n================= ${f} =================`);
    for (let r = 0; r < 4; r++) {
        const y0 = r * 192;
        const y1 = (r + 1) * 192 - 1;
        const spans = findComponentsInRow(raw, y0, y1);
        console.log(`Row ${r} (${y0}-${y1}): ${spans.length} clusters:`);
        spans.forEach((s, idx) => {
            // Find y bounds in this cluster
            let minY = 9999, maxY = -1;
            for (let y = y0; y <= y1; y++) {
                for (let x = s.startX; x <= s.endX; x++) {
                    const i = (y * raw.width + x) * 4;
                    if (!isBg(raw.data[i], raw.data[i+1], raw.data[i+2])) {
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }
            console.log(`  Cluster ${idx}: X [${s.startX}..${s.endX}] (${s.w}px wide), Y [${minY}..${maxY}] (${maxY - minY + 1}px tall)`);
        });
    }
}
