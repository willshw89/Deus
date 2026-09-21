const fs = require('fs');
const path = require('path');
const { readPNG } = require('./png_read');
const { writePNG } = require('./png_util');

const img = readPNG('art/raw/chest_v2.png');
const outDir = 'art/review/chest_v2_cells';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const cw = Math.floor(img.width / 3);
const ch = Math.floor(img.height / 4);

for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
        const cell = { width: cw, height: ch, data: Buffer.alloc(cw * ch * 4) };
        for (let y = 0; y < ch; y++) {
            for (let x = 0; x < cw; x++) {
                const srcIdx = ((r * ch + y) * img.width + (c * cw + x)) * 4;
                const dstIdx = (y * cw + x) * 4;
                cell.data[dstIdx] = img.data[srcIdx];
                cell.data[dstIdx + 1] = img.data[srcIdx + 1];
                cell.data[dstIdx + 2] = img.data[srcIdx + 2];
                cell.data[dstIdx + 3] = img.data[srcIdx + 3];
            }
        }
        writePNG(path.join(outDir, 'cell_r' + r + '_c' + c + '.png'), cw, ch, cell.data);
    }
}
console.log('Extracted 12 cells of size', cw, 'x', ch);
