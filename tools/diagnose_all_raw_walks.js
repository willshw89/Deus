'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const { extractFrameFromCell } = require('./build_pro_human_male');

const files = [
    { name: 'male_1', path: 'art/raw/human_male_pro_4d_walk.png' },
    { name: 'male_2', path: 'art/raw/human_male_var2_pro_4d_walk.png' },
    { name: 'male_3', path: 'art/raw/human_male_var3_pro_4d_walk.png' },
    { name: 'male_4', path: 'art/raw/human_male_var4_pro_4d_walk.png' },
    { name: 'male_5', path: 'art/raw/human_male_var5_pro_4d_walk.png' },
    { name: 'male_6', path: 'art/raw/human_male_var6_pro_4d_walk.png' },
    { name: 'female_ref', path: 'references/human_female_walk_12_reference.png' },
    { name: 'female_1', path: 'art/raw/human_female_pro_4d_walk.png' },
    { name: 'female_2', path: 'art/raw/human_female_var2_pro_4d_walk.png' },
];

for (const item of files) {
    if (!fs.existsSync(item.path)) {
        console.log(`Missing ${item.path}`);
        continue;
    }
    const img = decodePNG(fs.readFileSync(item.path));
    const cols = 6;
    const rows = 3;
    const montage = Buffer.alloc(cols * 48 * rows * 48 * 4);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x0 = Math.round(c * (img.width / cols));
            const x1 = Math.round((c + 1) * (img.width / cols));
            const y0 = Math.round(r * (img.height / rows));
            const y1 = Math.round((r + 1) * (img.height / rows));

            const frame = extractFrameFromCell(img, x0, x1, y0, y1, 43, 44);

            for (let fy = 0; fy < 48; fy++) {
                for (let fx = 0; fx < 48; fx++) {
                    const sIdx = (fy * 48 + fx) * 4;
                    const dx = c * 48 + fx;
                    const dy = r * 48 + fy;
                    const dIdx = (dy * (cols * 48) + dx) * 4;
                    montage[dIdx]     = frame[sIdx];
                    montage[dIdx + 1] = frame[sIdx + 1];
                    montage[dIdx + 2] = frame[sIdx + 2];
                    montage[dIdx + 3] = frame[sIdx + 3];
                }
            }
        }
    }
    const outPath = `game/test_output/raw_cells_${item.name}.png`;
    writePNG(outPath, cols * 48, rows * 48, montage);
    console.log(`Saved ${outPath}`);
}
