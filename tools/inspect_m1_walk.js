'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const p = decodePNG(fs.readFileSync('game/img/characters/$UF_Human_Male_1_Walk.png'));
console.log('Size of $UF_Human_Male_1_Walk.png:', p.width, p.height);

const scale = 4;
const outW = 48 * 3 * scale;
const outH = 48 * scale;
const out = Buffer.alloc(outW * outH * 4);
for (let c = 0; c < 3; c++) {
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const srcIdx = ((1 * 48 + y) * 144 + (c * 48 + x)) * 4;
            for (let dy = 0; dy < scale; dy++) {
                for (let dx = 0; dx < scale; dx++) {
                    const outX = (c * 48 + x) * scale + dx;
                    const outY = y * scale + dy;
                    const outIdx = (outY * outW + outX) * 4;
                    out[outIdx]     = p.data[srcIdx];
                    out[outIdx + 1] = p.data[srcIdx + 1];
                    out[outIdx + 2] = p.data[srcIdx + 2];
                    out[outIdx + 3] = p.data[srcIdx + 3];
                }
            }
        }
    }
}
writePNG('game/test_output/m1_walk_row1.png', outW, outH, out);
console.log('Saved game/test_output/m1_walk_row1.png');
