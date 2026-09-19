const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const rmmzFile = path.join(ROOT, 'game', 'img', 'characters', '$UF_Hare.png');
const raw = decodePNG(fs.readFileSync(rmmzFile), '$UF_Hare.png');
const outW = 144 * 4, outH = 192 * 4;
const buf = Buffer.alloc(outW * outH * 4);

for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
        const chk = ((Math.floor(x / 16) + Math.floor(y / 16)) % 2 === 0);
        const c = chk ? 220 : 245;
        const idx = (y * outW + x) * 4;
        buf[idx] = c;
        buf[idx + 1] = c;
        buf[idx + 2] = c;
        buf[idx + 3] = 255;
    }
}

for (let y = 0; y < 192; y++) {
    for (let x = 0; x < 144; x++) {
        const sidx = (y * 144 + x) * 4;
        if (raw.data[sidx + 3] > 0) {
            for (let dy = 0; dy < 4; dy++) {
                for (let dx = 0; dx < 4; dx++) {
                    const didx = ((y * 4 + dy) * outW + (x * 4 + dx)) * 4;
                    buf[didx] = raw.data[sidx];
                    buf[didx + 1] = raw.data[sidx + 1];
                    buf[didx + 2] = raw.data[sidx + 2];
                    buf[didx + 3] = 255;
                }
            }
        }
    }
}

const outPath = path.join(ROOT, 'art', 'review', 'hare_rmmz_charset_4x.png');
writePNG(outPath, outW, outH, buf);
console.log(`Saved: ${outPath}`);
