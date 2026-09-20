'use strict';
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');

const img = decodePNG(fs.readFileSync(path.join(__dirname, '..', 'art', 'raw', 'pro_wolf_walk.png')), 'wolf');

function isMagenta(r, g, b) {
    return (r > 170 && g < 70 && b > 170);
}

// Check each of the 4 rows (y: 0..191, 192..383, 384..575, 576..767)
for (let r = 0; r < 4; r++) {
    const y0 = r * 192;
    const y1 = y0 + 192;
    // Find connected opaque clusters in this row
    const colOpaque = new Array(img.width).fill(0);
    for (let x = 0; x < img.width; x++) {
        for (let y = y0; y < y1; y++) {
            const idx = (y * img.width + x) * 4;
            const red = img.data[idx], grn = img.data[idx + 1], blu = img.data[idx + 2];
            // Also ignore black border lines (red < 20, grn < 20, blu < 20)
            if (!isMagenta(red, grn, blu) && !(red < 20 && grn < 20 && blu < 20)) {
                colOpaque[x]++;
            }
        }
    }
    
    // Find intervals of columns with opaque content
    const intervals = [];
    let inSpan = false, startX = 0;
    for (let x = 0; x < img.width; x++) {
        if (colOpaque[x] > 5) {
            if (!inSpan) { inSpan = true; startX = x; }
        } else {
            if (inSpan) {
                if (x - startX > 20) intervals.push([startX, x]);
                inSpan = false;
            }
        }
    }
    if (inSpan && img.width - startX > 20) intervals.push([startX, img.width]);
    
    console.log(`Row ${r} (y: ${y0}..${y1}) intervals (${intervals.length}):`, intervals.map(iv => `[${iv[0]}..${iv[1]}] (w: ${iv[1]-iv[0]})`).join(', '));
}

