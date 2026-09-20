'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const {
    extractFrameFromCell,
    mirrorFrame,
    assemble12SpriteSheet
} = require('./build_pro_human_male');

const RAW_DIR = path.join(__dirname, '..', 'art', 'raw');
const REVIEW_DIR = path.join(__dirname, '..', 'art', 'review');

// Function to preview 6x3 extracted cells from a raw image
function previewRawGrid(rawFileName, outFileName, targetH = 43) {
    const rawPath = path.join(RAW_DIR, rawFileName);
    if (!fs.existsSync(rawPath)) {
        console.warn('File not found:', rawPath);
        return;
    }
    const img = decodePNG(fs.readFileSync(rawPath));
    const cellW = Math.floor(img.width / 6);
    const cellH = Math.floor(img.height / 3);

    const outBuf = Buffer.alloc(6 * 48 * 3 * 48 * 4);

    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 6; c++) {
            const minX = c * cellW;
            const maxX = (c + 1) * cellW;
            const minY = r * cellH;
            const maxY = (r + 1) * cellH;
            const frame = extractFrameFromCell(img, minX, maxX, minY, maxY, targetH);

            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const s = (y * 48 + x) * 4;
                    const d = (((r * 48 + y) * (6 * 48)) + (c * 48 + x)) * 4;
                    outBuf[d]   = frame[s];
                    outBuf[d+1] = frame[s+1];
                    outBuf[d+2] = frame[s+2];
                    outBuf[d+3] = frame[s+3];
                }
            }
        }
    }
    writePNG(path.join(REVIEW_DIR, outFileName), 6 * 48, 3 * 48, outBuf);
    console.log(`Saved grid preview: ${outFileName}`);
}

previewRawGrid('human_female_var2_pro_4d_walk.png', 'debug_var2_walk_grid.png');
previewRawGrid('human_female_var2_pro_4d_attack.png', 'debug_var2_attack_grid.png');
previewRawGrid('human_female_var2_pro_4d_downed.png', 'debug_var2_downed_grid.png');

module.exports = { previewRawGrid };
