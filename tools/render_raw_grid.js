'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const p = decodePNG(fs.readFileSync('art/raw/human_male_pro_4d_walk.png'));
console.log('Size:', p.width, p.height);

// 6 cols x 3 rows grid
// Col width ~ 234, row height ~ 256
// Downsample to a contact sheet: each cell 80x88 -> contact sheet 480 x 264
const cw = 234, ch = 256;
const dw = 80, dh = 88;
const contact = Buffer.alloc(480 * 264 * 4);

for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 6; c++) {
        const sx0 = c * cw;
        const sy0 = r * ch;
        for (let dy = 0; dy < dh; dy++) {
            for (let dx = 0; dx < dw; dx++) {
                const sx = Math.min(p.width - 1, Math.round(sx0 + (dx / dw) * cw));
                const sy = Math.min(p.height - 1, Math.round(sy0 + (dy / dh) * ch));
                const sIdx = (sy * p.width + sx) * 4;
                const dIdx = ((r * dh + dy) * 480 + (c * dw + dx)) * 4;
                contact[dIdx]     = p.data[sIdx];
                contact[dIdx + 1] = p.data[sIdx + 1];
                contact[dIdx + 2] = p.data[sIdx + 2];
                contact[dIdx + 3] = p.data[sIdx + 3];
            }
        }
    }
}
writePNG('game/test_output/raw_male_walk_grid.png', 480, 264, contact);
console.log('Saved game/test_output/raw_male_walk_grid.png');
