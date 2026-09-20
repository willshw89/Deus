'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const { extractFrameFromCell } = require('./build_pro_human_male');

function analyzeLegs(frame) {
    // Let's analyze pixels in the lower 1/3 of the frame (y: 34 to 47)
    // Left side (x: 8 to 23), Right side (x: 24 to 39)
    let leftPixels = 0, rightPixels = 0;
    let minX = 48, maxX = 0;
    for (let y = 36; y <= 47; y++) {
        for (let x = 0; x < 48; x++) {
            const idx = (y * 48 + x) * 4;
            if (frame[idx + 3] > 100) {
                if (x < 24) leftPixels++;
                else rightPixels++;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
            }
        }
    }
    const stanceWidth = maxX - minX + 1;
    return { leftPixels, rightPixels, stanceWidth, minX, maxX };
}

const maleFiles = [
    'human_male_pro_4d_walk.png',
    'human_male_var2_pro_4d_walk.png',
    'human_male_var3_pro_4d_walk.png',
    'human_male_var4_pro_4d_walk.png',
    'human_male_var5_pro_4d_walk.png',
    'human_male_var6_pro_4d_walk.png'
];

console.log('=== MALES ROW 1 CELLS 0, 1, 2 ===');
for (let i = 0; i < maleFiles.length; i++) {
    const rawPath = path.join('art/raw', maleFiles[i]);
    const img = decodePNG(fs.readFileSync(rawPath));
    const ch = Math.round(img.height / 3);
    console.log(`Male ${i+1}:`);
    for (let c = 0; c < 3; c++) {
        const x0 = Math.round(c * (img.width / 6));
        const x1 = Math.round((c + 1) * (img.width / 6));
        const frame = extractFrameFromCell(img, x0, x1, ch, 2 * ch, 43, 44);
        const a = analyzeLegs(frame);
        console.log(`  Cell ${c}: stanceWidth=${a.stanceWidth} (x: ${a.minX}..${a.maxX}), leftPx=${a.leftPixels}, rightPx=${a.rightPixels}`);
    }
}

const femaleFiles = [
    'human_female_pro_4d_walk.png',
    'human_female_var2_pro_4d_walk.png',
    'human_female_var3_pro_4d_walk.png',
    'human_female_var4_pro_4d_walk.png',
    'human_female_var5_pro_4d_walk.png',
    'human_female_var6_pro_4d_walk.png'
];

console.log('\n=== FEMALES ROW 1 CELLS 0, 1, 2 ===');
for (let i = 0; i < femaleFiles.length; i++) {
    const rawPath = path.join('art/raw', femaleFiles[i]);
    const img = decodePNG(fs.readFileSync(rawPath));
    const ch = Math.round(img.height / 3);
    console.log(`Female ${i+1}:`);
    for (let c = 0; c < 3; c++) {
        const x0 = Math.round(c * (img.width / 6));
        const x1 = Math.round((c + 1) * (img.width / 6));
        const frame = extractFrameFromCell(img, x0, x1, ch, 2 * ch, 43, 44);
        const a = analyzeLegs(frame);
        console.log(`  Cell ${c}: stanceWidth=${a.stanceWidth} (x: ${a.minX}..${a.maxX}), leftPx=${a.leftPixels}, rightPx=${a.rightPixels}`);
    }
}
