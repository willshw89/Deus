'use strict';
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');

const raw = decodePNG(fs.readFileSync('art/raw/doors_fantasy_nano_pro.png'));
console.log(`Image: ${raw.width}x${raw.height}`);

function isMagenta(r, g, b) {
    if (r > 165 && g < 85 && b > 165) return true;
    if (r > 80 && b > 70 && g < 65 && Math.abs(r - b) < 45) return true;
    return false;
}

// Slice into 3 horizontal bands
const bandH = raw.height / 3;
for (let row = 0; row < 3; row++) {
    const y0 = Math.round(row * bandH);
    const y1 = Math.round((row + 1) * bandH) - 1;
    console.log(`\n--- Row ${row} (y: ${y0}..${y1}) ---`);
    
    // Find connected non-magenta bounding boxes along x
    // Simple column histogram
    const colHist = [];
    for (let x = 0; x < raw.width; x++) {
        let count = 0;
        for (let y = y0; y <= y1; y++) {
            const idx = (y * raw.width + x) * 4;
            if (!isMagenta(raw.data[idx], raw.data[idx+1], raw.data[idx+2])) {
                count++;
            }
        }
        colHist.push(count);
    }
    
    // Find contiguous spans where count > 10
    const spans = [];
    let inSpan = false, sx = 0;
    for (let x = 0; x < raw.width; x++) {
        if (colHist[x] > 10) {
            if (!inSpan) { inSpan = true; sx = x; }
        } else {
            if (inSpan) {
                if (x - sx > 40) spans.push({ x0: sx, x1: x - 1 });
                inSpan = false;
            }
        }
    }
    if (inSpan && raw.width - sx > 40) spans.push({ x0: sx, x1: raw.width - 1 });

    spans.forEach((span, idx) => {
        // Find exact y bounds in this span
        let minY = y1, maxY = y0, count = 0;
        for (let y = y0; y <= y1; y++) {
            for (let x = span.x0; x <= span.x1; x++) {
                const i = (y * raw.width + x) * 4;
                if (!isMagenta(raw.data[i], raw.data[i+1], raw.data[i+2])) {
                    count++;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        console.log(`  Door ${idx}: x=[${span.x0}..${span.x1}] (w=${span.x1-span.x0+1}), y=[${minY}..${maxY}] (h=${maxY-minY+1}), count=${count}`);
    });
}

