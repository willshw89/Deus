'use strict';
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');

for (const name of ['pro_sheep_walk.png', 'pro_sheep_eat.png', 'pro_sheep_attack.png', 'pro_sheep_sleep.png']) {
    const raw = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', name)), name);
    // Downsample 2x to 704x384
    const dw = 704, dh = 384;
    const dbuf = Buffer.alloc(dw * dh * 4);
    for (let y = 0; y < dh; y++) {
        for (let x = 0; x < dw; x++) {
            const sx = x * 2;
            const sy = y * 2;
            const sidx = (sy * raw.width + sx) * 4;
            const didx = (y * dw + x) * 4;
            dbuf[didx] = raw.data[sidx];
            dbuf[didx + 1] = raw.data[sidx + 1];
            dbuf[didx + 2] = raw.data[sidx + 2];
            dbuf[didx + 3] = raw.data[sidx + 3];
        }
    }
    writePNG(path.join(ROOT, 'art', 'review', `preview_${name}`), dw, dh, dbuf);
}
console.log('Saved previews.');
