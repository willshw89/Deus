'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const rawDir = path.join(__dirname, '..', 'art', 'raw');
const reviewDir = path.join(__dirname, '..', 'art', 'review');
const brainDir = 'C:/Users/snewt/.gemini/antigravity/brain/e6a9a54f-2cc6-432e-b7ec-5affda42dd85';

function downscaleSheet(rawName, outName, cols = 3, rows = 8) {
    const rawPath = path.join(rawDir, rawName);
    if (!fs.existsSync(rawPath)) {
        console.log('File not found:', rawName);
        return;
    }
    const d = decodePNG(fs.readFileSync(rawPath));
    const outW = cols * 48;
    const outH = rows * 48;
    const outBuf = Buffer.alloc(outW * outH * 4);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            for (let dy = 0; dy < 48; dy++) {
                for (let dx = 0; dx < 48; dx++) {
                    let sumR = 0, sumG = 0, sumB = 0, count = 0;
                    for (let sy = 0; sy < 4; sy++) {
                        for (let sx = 0; sx < 4; sx++) {
                            const srcX = c * 192 + dx * 4 + sx;
                            const srcY = r * 192 + dy * 4 + sy;
                            if (srcX >= d.width || srcY >= d.height) continue;
                            const idx = (srcY * d.width + srcX) * 4;
                            const a = d.data[idx + 3];
                            const red = d.data[idx], green = d.data[idx + 1], blue = d.data[idx + 2];
                            const isMag = (red > 165 && green < 85 && blue > 165);
                            if (a > 100 && !isMag) {
                                sumR += red; sumG += green; sumB += blue;
                                count++;
                            }
                        }
                    }
                    const dIdx = ((r * 48 + dy) * outW + (c * 48 + dx)) * 4;
                    if (count >= 4) {
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

    const outPath = path.join(reviewDir, outName);
    writePNG(outPath, outW, outH, outBuf);
    if (fs.existsSync(brainDir)) {
        writePNG(path.join(brainDir, outName), outW, outH, outBuf);
    }
    console.log(`Saved ${outName} (${outW}x${outH})`);
}

downscaleSheet('human_male_adult_attack.png', 'raw_human_male_attack_downscale_preview.png', 3, 8);
downscaleSheet('human_male_adult_carry.png', 'raw_human_male_carry_downscale_preview.png', 1, 8);
downscaleSheet('human_male_adult_cast.png', 'raw_human_male_cast_downscale_preview.png', 3, 8);
downscaleSheet('human_male_adult_work.png', 'raw_human_male_work_downscale_preview.png', 3, 8);
downscaleSheet('human_male_adult_death.png', 'raw_human_male_death_downscale_preview.png', 3, 8);
