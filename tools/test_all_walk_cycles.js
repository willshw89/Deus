'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const { extractFrameFromCell, mirrorFrame } = require('./build_pro_human_male');

// Let's create a test suite for all 12 characters (6 male + 6 female)
// Extracting their 3 West walk frames as [Stride A, Stand, Stride B]
// and East as mirrorFrame of West.
// Then creating a 4-step animation filmstrip for each to visually inspect!

const maleConfigs = [
    { num: 1, file: 'human_male_pro_4d_walk.png', wCells: [0, 2, 1] },
    { num: 2, file: 'human_male_var2_pro_4d_walk.png', wCells: [0, 2, 1] },
    { num: 3, file: 'human_male_var3_pro_4d_walk.png', wCells: [0, 2, 1] },
    { num: 4, file: 'human_male_var4_pro_4d_walk.png', wCells: [0, 2, 1] },
    { num: 5, file: 'human_male_var5_pro_4d_walk.png', wCells: [0, 1, 2] },
    { num: 6, file: 'human_male_var6_pro_4d_walk.png', wCells: [0, 2, 1] },
];

const femaleConfigs = [
    { num: 1, file: 'human_female_pro_4d_walk.png', wCells: [0, 2, 1] },
    { num: 2, file: 'human_female_var2_pro_4d_walk.png', wCells: [0, 1, 2] },
    { num: 3, file: 'human_female_var3_pro_4d_walk.png', wCells: [0, 1, 2] },
    { num: 4, file: 'human_female_var4_pro_4d_walk.png', wCells: [0, 1, 2] },
    { num: 5, file: 'human_female_var5_pro_4d_walk.png', wCells: [0, 1, 2] },
    { num: 6, file: 'human_female_var6_pro_4d_walk.png', wCells: [0, 1, 2] },
];

function testConfig(configs, prefix) {
    const scale = 3;
    const totalW = 4 * 48 * scale; // 4 animation steps: 0 -> 1 -> 2 -> 1
    const totalH = configs.length * 48 * scale;
    const buf = Buffer.alloc(totalW * totalH * 4);

    for (let i = 0; i < configs.length; i++) {
        const cfg = configs[i];
        const rawPath = path.join('art/raw', cfg.file);
        const img = decodePNG(fs.readFileSync(rawPath));
        const ch = Math.round(img.height / 3);

        const frames = cfg.wCells.map(c => {
            const x0 = Math.round(c * (img.width / 6));
            const x1 = Math.round((c + 1) * (img.width / 6));
            return extractFrameFromCell(img, x0, x1, ch, 2 * ch, 43, 44);
        });

        // 4-step walk cycle: 0 -> 1 -> 2 -> 1
        const cycle = [frames[0], frames[1], frames[2], frames[1]];

        for (let step = 0; step < 4; step++) {
            const f = cycle[step];
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (y * 48 + x) * 4;
                    for (let dy = 0; dy < scale; dy++) {
                        for (let dx = 0; dx < scale; dx++) {
                            const px = (step * 48 + x) * scale + dx;
                            const py = (i * 48 + y) * scale + dy;
                            const dIdx = (py * totalW + px) * 4;
                            buf[dIdx]     = f[sIdx];
                            buf[dIdx + 1] = f[sIdx + 1];
                            buf[dIdx + 2] = f[sIdx + 2];
                            buf[dIdx + 3] = f[sIdx + 3];
                        }
                    }
                }
            }
        }
    }

    const outPath = `game/test_output/${prefix}_walk_cycles_4step.png`;
    writePNG(outPath, totalW, totalH, buf);
    console.log(`Saved ${outPath}`);
}

testConfig(maleConfigs, 'all_males');
testConfig(femaleConfigs, 'all_females');
