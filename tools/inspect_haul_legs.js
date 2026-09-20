'use strict';

const fs = require('fs');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const img = decodePNG(fs.readFileSync('game/img/characters/$UF_Human_Male_Haul.png'));

const w = 144 * 4;
const h = 48 * 4;
const buf = Buffer.alloc(w * h * 4);

for (let c = 0; c < 3; c++) {
    for (let py = 0; py < 48; py++) {
        for (let px = 0; px < 48; px++) {
            const sIdx = ((2 * 48 + py) * 144 + (c * 48 + px)) * 4;
            const r = img.data[sIdx], g = img.data[sIdx+1], b = img.data[sIdx+2], a = img.data[sIdx+3];
            for (let dy = 0; dy < 4; dy++) {
                for (let dx = 0; dx < 4; dx++) {
                    const dIdx = (((py * 4 + dy)) * w + (c * 48 * 4 + px * 4 + dx)) * 4;
                    if (a > 0) {
                        buf[dIdx] = r; buf[dIdx+1] = g; buf[dIdx+2] = b; buf[dIdx+3] = 255;
                    } else {
                        const cb = ((Math.floor((px*4+dx)/8) + Math.floor((py*4+dy)/8)) % 2 === 0) ? 40 : 50;
                        buf[dIdx] = cb; buf[dIdx+1] = cb; buf[dIdx+2] = cb; buf[dIdx+3] = 255;
                    }
                }
            }
        }
    }
}

writePNG('art/review/inspect_haul_east_legs_4x.png', w, h, buf);
console.log('Saved art/review/inspect_haul_east_legs_4x.png');
