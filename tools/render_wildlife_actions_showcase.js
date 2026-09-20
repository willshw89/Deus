'use strict';
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');

const speciesList = [
    { name: 'Boar',  prefix: 'UF_Boar' },
    { name: 'Deer',  prefix: 'UF_Deer' },
    { name: 'Hare',  prefix: 'UF_Hare' },
    { name: 'Sheep', prefix: 'UF_Sheep' },
    { name: 'Wolf',  prefix: 'UF_Wolf' }
];

const actions = ['Walk', 'Eat', 'Attack', 'Sleep'];

// Each action sheet is 144x192 (3 cols x 4 rows of 48x48)
// Let's create a showcase:
// Columns = 4 actions (Walk, Eat, Attack, Sleep)
// Rows = 5 species
// Each action sheet: 144x192.
// With padding:
// sheetWidth = 144, sheetHeight = 192
// colPad = 24, rowPad = 32, labelPad = 20
// Total width: (144 + 24) * 4 + 24 = 696 px
// Total height: (192 + 32) * 5 + 32 = 1152 px

const sheetW = 144, sheetH = 192;
const colGap = 20, rowGap = 28;
const marginX = 24, marginY = 24;

const outW = marginX * 2 + 4 * sheetW + 3 * colGap; // 24*2 + 576 + 60 = 684
const outH = marginY * 2 + 5 * sheetH + 4 * rowGap; // 24*2 + 960 + 112 = 1120

const outBuf = Buffer.alloc(outW * outH * 4);

// Background: neutral dark slate #1e232a
for (let i = 0; i < outW * outH; i++) {
    const idx = i * 4;
    outBuf[idx] = 0x1e;
    outBuf[idx + 1] = 0x23;
    outBuf[idx + 2] = 0x2a;
    outBuf[idx + 3] = 255;
}

for (let sIdx = 0; sIdx < speciesList.length; sIdx++) {
    const sp = speciesList[sIdx];
    const rowY = marginY + sIdx * (sheetH + rowGap);

    for (let aIdx = 0; aIdx < actions.length; aIdx++) {
        const act = actions[aIdx];
        const colX = marginX + aIdx * (sheetW + colGap);

        let filename;
        if (act === 'Walk') {
            filename = `$${sp.prefix}.png`;
        } else {
            filename = `$${sp.prefix}_${act}.png`;
        }

        const filePath = path.join(CHAR_DIR, filename);
        if (fs.existsSync(filePath)) {
            const img = decodePNG(fs.readFileSync(filePath), filename);
            // Draw sheet backing tile / border
            for (let y = 0; y < sheetH; y++) {
                for (let x = 0; x < sheetW; x++) {
                    const sidx = (y * img.width + x) * 4;
                    const didx = ((rowY + y) * outW + (colX + x)) * 4;
                    const a = img.data[sidx + 3];
                    if (a > 0) {
                        outBuf[didx] = img.data[sidx];
                        outBuf[didx + 1] = img.data[sidx + 1];
                        outBuf[didx + 2] = img.data[sidx + 2];
                        outBuf[didx + 3] = 255;
                    } else {
                        // Subtle grid checker for cell bounds
                        const cellX = Math.floor(x / 48);
                        const cellY = Math.floor(y / 48);
                        const isEven = (cellX + cellY) % 2 === 0;
                        outBuf[didx] = isEven ? 0x28 : 0x23;
                        outBuf[didx + 1] = isEven ? 0x2e : 0x29;
                        outBuf[didx + 2] = isEven ? 0x38 : 0x32;
                        outBuf[didx + 3] = 255;
                    }
                }
            }
        }
    }
}

const outPath = path.join(ROOT, 'art', 'review', 'wildlife_actions_showcase.png');
writePNG(outPath, outW, outH, outBuf);
console.log(`Saved showcase to: ${outPath}`);
