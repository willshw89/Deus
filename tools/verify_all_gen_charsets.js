'use strict';
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { checkFrameFacing } = require('./build_pro_human_male');

function extractCell(img, c, r) {
    const buf = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = ((r * 48 + y) * img.width + (c * 48 + x)) * 4;
            const dIdx = (y * 48 + x) * 4;
            buf[dIdx] = img.data[sIdx];
            buf[dIdx+1] = img.data[sIdx+1];
            buf[dIdx+2] = img.data[sIdx+2];
            buf[dIdx+3] = img.data[sIdx+3];
        }
    }
    return buf;
}

let pass = 0, fail = 0;
for (let i = 0; i < 116; i++) {
    const filename = path.join(__dirname, '..', 'game', 'img', 'characters', `$gen_c${i}.png`);
    const img = decodePNG(fs.readFileSync(filename));
    let match = true;
    for (let c = 0; c < 3 && match; c++) {
        for (let y = 0; y < 48 && match; y++) {
            for (let x = 0; x < 48 && match; x++) {
                const sIdx = ((1 * 48 + y) * 144 + (c * 48 + (47 - x))) * 4;
                const dIdx = ((2 * 48 + y) * 144 + (c * 48 + x)) * 4;
                for (let ch = 0; ch < 4; ch++) {
                    if (img.data[sIdx + ch] !== img.data[dIdx + ch]) {
                        match = false;
                        break;
                    }
                }
            }
        }
    }
    if (match) pass++;
    else {
        console.log(`MISMATCH in $gen_c${i}.png`);
        fail++;
    }
}
console.log(`Strict Symmetry Verification: PASS = ${pass} / 116 | FAIL = ${fail}`);
