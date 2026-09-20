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

function checkSheet(filename) {
    const file = path.join(__dirname, '..', 'game', 'img', 'characters', filename);
    if (!fs.existsSync(file)) return console.log('Not found:', file);
    const img = decodePNG(fs.readFileSync(file));
    console.log('=== ' + filename + ' ===');
    for (let r = 0; r < 4; r++) {
        const facings = [];
        for (let c = 0; c < 3; c++) {
            if (r === 0) facings.push('DOWN');
            else if (r === 3) facings.push('UP');
            else {
                const cell = extractCell(img, c, r);
                facings.push(checkFrameFacing(cell));
            }
        }
        console.log(`Row ${r}:`, facings.join(' '));
    }
}

checkSheet('$UF_Human_Male_1_Walk.png');
checkSheet('$UF_Human_Male_2_Walk.png');
checkSheet('$UF_Human_Male_3_Walk.png');
checkSheet('$UF_Human_Male_4_Walk.png');
checkSheet('$UF_Human_Male_5.png');
checkSheet('$UF_Human_Male_6.png');
checkSheet('$UF_Human_Female_1_Walk.png');
checkSheet('$UF_Human_Female_2_Walk.png');
checkSheet('$UF_Human_Female_3_Walk.png');
checkSheet('$UF_Human_Female_4_Walk.png');
checkSheet('$UF_Human_Child_Walk.png');

// Check baked gen sheets too
checkSheet('$gen_c0.png');
checkSheet('$gen_c1.png');
checkSheet('$Adam.png');
checkSheet('$Eve.png');
