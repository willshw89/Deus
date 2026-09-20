'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const { extractFrameFromCell, mirrorFrame } = require('./build_pro_human_male');

const img = decodePNG(fs.readFileSync('art/raw/human_male_pro_4d_walk.png'));
const cols = 6;

// Extract cells:
// c0: Stride A
// c1: Stride B
// c2: Neutral Stand
const cell0 = extractFrameFromCell(img, 0, Math.round(img.width/6), Math.round(img.height/3), Math.round(2*img.height/3), 43, 44);
const cell1 = extractFrameFromCell(img, Math.round(img.width/6), Math.round(2*img.width/6), Math.round(img.height/3), Math.round(2*img.height/3), 43, 44);
const cell2 = extractFrameFromCell(img, Math.round(2*img.width/6), Math.round(3*img.width/6), Math.round(img.height/3), Math.round(2*img.height/3), 43, 44);

// Sequence in RMMZ: Col 0 -> Col 1 -> Col 2 -> Col 1
// If Col 0 = cell0 (Stride A), Col 1 = cell2 (Stand), Col 2 = cell1 (Stride B):
// The 4-step loop is: [cell0, cell2, cell1, cell2]
const cycle = [cell0, cell2, cell1, cell2];

// Let's create a side-by-side filmstrip of the 4 steps at 4x zoom
const scale = 4;
const w = 4 * 48 * scale;
const h = 48 * scale;
const filmstrip = Buffer.alloc(w * h * 4);

for (let step = 0; step < 4; step++) {
    const f = cycle[step];
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            for (let dy = 0; dy < scale; dy++) {
                for (let dx = 0; dx < scale; dx++) {
                    const px = (step * 48 + x) * scale + dx;
                    const py = y * scale + dy;
                    const dIdx = (py * w + px) * 4;
                    filmstrip[dIdx]     = f[sIdx];
                    filmstrip[dIdx + 1] = f[sIdx + 1];
                    filmstrip[dIdx + 2] = f[sIdx + 2];
                    filmstrip[dIdx + 3] = f[sIdx + 3];
                }
            }
        }
    }
}

writePNG('game/test_output/fixed_male_walk_cycle_filmstrip.png', w, h, filmstrip);
console.log('Saved game/test_output/fixed_male_walk_cycle_filmstrip.png');
