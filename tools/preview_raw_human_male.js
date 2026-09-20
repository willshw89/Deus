'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const rawDir = path.join(__dirname, '..', 'art', 'raw');
const reviewDir = path.join(__dirname, '..', 'art', 'review');
const brainDir = 'C:/Users/snewt/.gemini/antigravity/brain/e6a9a54f-2cc6-432e-b7ec-5affda42dd85';

// Let's inspect the raw human male walk sheet: 576 x 1536
// It has 3 columns (each 192 wide) and 8 rows (each 192 tall).
// Let's downscale each 192x192 cell to 48x48 using simple box averaging
const d = decodePNG(fs.readFileSync(path.join(rawDir, 'human_male_adult_walk.png')));

const outW = 144;
const outH = 384;
const outBuf = Buffer.alloc(outW * outH * 4);

for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 3; c++) {
        // Source cell: x: c*192 .. c*192+191, y: r*192 .. r*192+191
        // Dest cell: x: c*48 .. c*48+47, y: r*48 .. r*48+47
        for (let dy = 0; dy < 48; dy++) {
            for (let dx = 0; dx < 48; dx++) {
                // Average 4x4 block
                let sumR = 0, sumG = 0, sumB = 0, sumA = 0, count = 0;
                for (let sy = 0; sy < 4; sy++) {
                    for (let sx = 0; sx < 4; sx++) {
                        const srcX = c * 192 + dx * 4 + sx;
                        const srcY = r * 192 + dy * 4 + sy;
                        const idx = (srcY * d.width + srcX) * 4;
                        const a = d.data[idx + 3];
                        const red = d.data[idx], green = d.data[idx + 1], blue = d.data[idx + 2];
                        const isMag = (red > 165 && green < 85 && blue > 165);
                        if (a > 100 && !isMag) {
                            sumR += red; sumG += green; sumB += blue; sumA += 255;
                            count++;
                        }
                    }
                }
                const dIdx = ((r * 48 + dy) * outW + (c * 48 + dx)) * 4;
                if (count >= 4) { // At least 25% opaque non-magenta
                    outBuf[dIdx] = Math.round(sumR / count);
                    outBuf[dIdx + 1] = Math.round(sumG / count);
                    outBuf[dIdx + 2] = Math.round(sumB / count);
                    outBuf[dIdx + 3] = 255;
                } else {
                    outBuf[dIdx + 3] = 0;
                }
            }
        }
    }
}

const outPath = path.join(reviewDir, 'raw_human_male_walk_downscale_preview.png');
writePNG(outPath, outW, outH, outBuf);
if (fs.existsSync(brainDir)) {
    writePNG(path.join(brainDir, 'raw_human_male_walk_downscale_preview.png'), outW, outH, outBuf);
}
console.log('Saved raw preview to', outPath);
