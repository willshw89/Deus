'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const fn = 'game/img/characters/gen/$gen_c0.png';
const p = decodePNG(fs.readFileSync(fn));

const scale = 4;
const outW = 48 * 3 * scale;
const outH = 48 * 2 * scale;
const out = Buffer.alloc(outW * outH * 4);

for (let r = 0; r < 2; r++) { // r=0: Left (row 1), r=1: Right (row 2)
    const srcRow = r + 1;
    for (let c = 0; c < 3; c++) {
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const srcIdx = ((srcRow * 48 + y) * 144 + (c * 48 + x)) * 4;
                for (let dy = 0; dy < scale; dy++) {
                    for (let dx = 0; dx < scale; dx++) {
                        const outX = (c * 48 + x) * scale + dx;
                        const outY = (r * 48 + y) * scale + dy;
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
}
writePNG('game/test_output/left_right_walk_frames_4x.png', outW, outH, out);
console.log('Saved game/test_output/left_right_walk_frames_4x.png');
