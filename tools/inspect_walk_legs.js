'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');

const files = [
    'game/img/characters/$UF_Human_Male_Var1_Walk.png',
    'game/img/characters/gen/$gen_c0.png',
    'game/img/generator/char/male_base_1.png'
].filter(f => fs.existsSync(f));

files.forEach(fn => {
    console.log('\n=== Inspecting Sheet:', fn, '===');
    const p = decodePNG(fs.readFileSync(fn));
    console.log('Size:', p.width, 'x', p.height);

    for (let r = 0; r < 4; r++) {
        const rName = ['Down (South)', 'Left (West)', 'Right (East)', 'Up (North)'][r];
        console.log(`--- ${rName} (Row ${r}) ---`);
        for (let c1 = 0; c1 < 3; c1++) {
            for (let c2 = c1 + 1; c2 < 3; c2++) {
                let diff = 0;
                let legDiff = 0; // y >= 28 is legs/feet
                for (let y = 0; y < 48; y++) {
                    for (let x = 0; x < 48; x++) {
                        const idx1 = ((r * 48 + y) * p.width + (c1 * 48 + x)) * 4;
                        const idx2 = ((r * 48 + y) * p.width + (c2 * 48 + x)) * 4;
                        let d = false;
                        for (let ch = 0; ch < 4; ch++) {
                            if (p.data[idx1 + ch] !== p.data[idx2 + ch]) { d = true; break; }
                        }
                        if (d) {
                            diff++;
                            if (y >= 28) legDiff++;
                        }
                    }
                }
                console.log(`  Col ${c1} vs Col ${c2}: ${diff} px diff (legs: ${legDiff} px)`);
            }
        }
    }
});
