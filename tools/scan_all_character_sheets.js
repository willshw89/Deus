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

const dir = path.join(__dirname, '..', 'game', 'img', 'characters');
const allFiles = fs.readdirSync(dir).filter(f => f.endsWith('.png') && !f.startsWith('!$') && (f.includes('Human') || f.includes('Adam') || f.includes('Eve')));

console.log('Checking', allFiles.length, 'human character sheets...');
let bad = [];
for (const f of allFiles) {
    try {
        const img = decodePNG(fs.readFileSync(path.join(dir, f)));
        if (img.width !== 144 || img.height !== 192) continue;
        const r1 = [0, 1, 2].map(c => checkFrameFacing(extractCell(img, c, 1)));
        const r2 = [0, 1, 2].map(c => checkFrameFacing(extractCell(img, c, 2)));
        if (r1.some(d => d !== 'LEFT') || r2.some(d => d !== 'RIGHT')) {
            bad.push(`${f} | R1: ${r1.join(' ')} | R2: ${r2.join(' ')}`);
        }
    } catch (e) {
        console.error(f, e.message);
    }
}

console.log('Total bad sheets:', bad.length);
bad.forEach(b => console.log(b));

