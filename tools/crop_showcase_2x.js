const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const srcPath = path.join(ROOT, 'art', 'review', 'nano_tilesets_live_showcase.png');
const img = decodePNG(fs.readFileSync(srcPath));

// Pond is at x: 0..350, y: 100..400
const cropX = 10, cropY = 100, cropW = 320, cropH = 240;

// 2x zoom (640x480)
const out2x = Buffer.alloc(cropW * 2 * cropH * 2 * 4);
for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
        const si = ((cropY + y) * img.width + (cropX + x)) * 4;
        const r = img.data[si], g = img.data[si + 1], b = img.data[si + 2], a = img.data[si + 3];
        for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
                const di = (((y * 2 + dy) * (cropW * 2)) + (x * 2 + dx)) * 4;
                out2x[di] = r;
                out2x[di + 1] = g;
                out2x[di + 2] = b;
                out2x[di + 3] = a;
            }
        }
    }
}
writePNG(path.join(ROOT, 'art', 'review', 'nano_water_and_tiles_crop_2x.png'), cropW * 2, cropH * 2, out2x);
console.log('Saved nano_water_and_tiles_crop_2x.png');
