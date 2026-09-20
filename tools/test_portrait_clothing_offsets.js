'use strict';
const fs = require('fs');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const rawMale = decodePNG(fs.readFileSync('art/raw/u7_modular_portraits_nano_pro.png'));
const mBase = decodePNG(fs.readFileSync('game/img/generator/face/male_base_1.png'));

// Test different ty offsets for clothes 0..3
for (let ty = 75; ty <= 100; ty += 5) {
    const testCanvas = Buffer.from(mBase.data);
    const th = 144 - ty;
    // extract clothes 0 (leather jerkin: sx: 4, sy: 782, sw: 246, sh: 240)
    for (let dy = 0; dy < th; dy++) {
        for (let dx = 0; dx < 144; dx++) {
            const ix = Math.min(245, Math.floor(dx * 246 / 144));
            const iy = Math.min(239, Math.floor(dy * 240 / th));
            const sIdx = ((782 + iy) * rawMale.width + (4 + ix)) * 4;
            const r = rawMale.data[sIdx], g = rawMale.data[sIdx+1], b = rawMale.data[sIdx+2], a = rawMale.data[sIdx+3];
            // If not magenta and not background
            if (a > 10 && !(r > 130 && b > 130 && g < 110)) {
                const dIdx = ((ty + dy) * 144 + dx) * 4;
                testCanvas[dIdx] = r;
                testCanvas[dIdx+1] = g;
                testCanvas[dIdx+2] = b;
                testCanvas[dIdx+3] = 255;
            }
        }
    }
    writePNG(`scratch/u7_modular_test/test_cloth0_ty_${ty}.png`, 144, 144, testCanvas);
}
console.log('Saved ty tests.');

