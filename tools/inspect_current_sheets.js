'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

function dumpSheetInspection(filePath, outPath) {
    if (!fs.existsSync(filePath)) {
        console.log('File does not exist:', filePath);
        return;
    }
    const img = decodePNG(fs.readFileSync(filePath));
    // Zoom 3x: 144x192 -> 432x576
    const scale = 3;
    const zw = img.width * scale;
    const zh = img.height * scale;
    const buf = Buffer.alloc(zw * zh * 4);

    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
            const sIdx = (y * img.width + x) * 4;
            for (let dy = 0; dy < scale; dy++) {
                for (let dx = 0; dx < scale; dx++) {
                    const dIdx = (((y * scale + dy) * zw) + (x * scale + dx)) * 4;
                    buf[dIdx]     = img.data[sIdx];
                    buf[dIdx + 1] = img.data[sIdx + 1];
                    buf[dIdx + 2] = img.data[sIdx + 2];
                    buf[dIdx + 3] = img.data[sIdx + 3];
                }
            }
        }
    }

    // Draw grid lines between 48x48 cells (which are 144x144 after 3x scale)
    const cellScaled = 48 * scale;
    for (let r = 0; r <= 4; r++) {
        const y = Math.min(r * cellScaled, zh - 1);
        for (let x = 0; x < zw; x++) {
            const idx = (y * zw + x) * 4;
            buf[idx] = 255; buf[idx+1] = 0; buf[idx+2] = 0; buf[idx+3] = 255;
        }
    }
    for (let c = 0; c <= 3; c++) {
        const x = Math.min(c * cellScaled, zw - 1);
        for (let y = 0; y < zh; y++) {
            const idx = (y * zw + x) * 4;
            buf[idx] = 255; buf[idx+1] = 0; buf[idx+2] = 0; buf[idx+3] = 255;
        }
    }

    writePNG(outPath, zw, zh, buf);
    console.log(`Saved inspection to ${outPath}`);
}

dumpSheetInspection('game/img/characters/$UF_Human_Male_1_Walk.png', 'game/test_output/inspect_male_1_current.png');
dumpSheetInspection('game/img/characters/gen/$gen_c0.png', 'game/test_output/inspect_gen_c0_current.png');
dumpSheetInspection('game/img/characters/$UF_Human_Female_1_Walk.png', 'game/test_output/inspect_female_1_current.png');
