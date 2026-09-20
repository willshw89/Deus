const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const fs = require('fs');

const img = decodePNG(fs.readFileSync('art/raw/human_male_pro_4d_walk.png'));

// Let's create an artifact image showing the extracted candidates
// Let's crop Row 0 cells [0, 1, 2], [3, 4, 5], Row 1 [0, 1, 2, 3, 4, 5], Row 2 [0, 1, 2]
const rowBorders = [0, 258, 511, 767];
const colBorders = [0, 234, 470, 704, 938, 1172, 1408];

function cropCell(c, r) {
    const minX = colBorders[c], maxX = colBorders[c+1];
    const minY = rowBorders[r], maxY = rowBorders[r+1];
    const w = maxX - minX;
    const h = maxY - minY;
    const buf = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const sIdx = ((minY + y) * img.width + (minX + x)) * 4;
            const dIdx = (y * w + x) * 4;
            buf[dIdx] = img.data[sIdx];
            buf[dIdx+1] = img.data[sIdx+1];
            buf[dIdx+2] = img.data[sIdx+2];
            buf[dIdx+3] = img.data[sIdx+3];
        }
    }
    return { w, h, buf };
}

// Let's save a preview montage of the cells:
// South: (0,0), (1,0), (2,0)
// Side: (3,0), (4,0), (5,0), (0,1), (1,1), (2,1)
// North: (0,2), (1,2), (2,2)
console.log('Cropping and inspecting cells...');

