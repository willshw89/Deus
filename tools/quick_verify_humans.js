'use strict';
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');

const CHAR_DIR = path.join(__dirname, '..', 'game', 'img', 'characters');
const actions = ['Walk', 'Haul', 'Attack', 'Bow', 'Magic', 'Work', 'Downed'];

function checkDemographic(gender) {
    console.log(`=== Checking Adult ${gender} Human (6 variations x 7 actions) ===`);
    let total = 0, passed = 0;
    for (let v = 1; v <= 6; v++) {
        let varPassed = 0;
        const details = [];
        for (const act of actions) {
            total++;
            let baseName = `$UF_Human_${gender}_${v}_${act}`;
            let pngPath = path.join(CHAR_DIR, `${baseName}.png`);
            let jsonPath = path.join(CHAR_DIR, `${baseName}.json`);

            // Check if Male var 1 uses the alias format without _1_
            if (!fs.existsSync(pngPath) && v === 1) {
                baseName = `$UF_Human_${gender}_${act}`;
                pngPath = path.join(CHAR_DIR, `${baseName}.png`);
                jsonPath = path.join(CHAR_DIR, `${baseName}.json`);
            }

            if (!fs.existsSync(pngPath) || !fs.existsSync(jsonPath)) {
                details.push(`MISSING(${act})`);
                continue;
            }
            const d = decodePNG(fs.readFileSync(pngPath));
            if (d.width !== 144 || d.height !== 192) {
                details.push(`BAD_DIM(${act})`);
                continue;
            }
            const colors = new Set();
            let badAlpha = 0;
            for (let i = 0; i < d.data.length; i += 4) {
                const a = d.data[i + 3];
                if (a !== 0 && a !== 255) badAlpha++;
                if (a > 0) colors.add((d.data[i] << 16) | (d.data[i + 1] << 8) | d.data[i + 2]);
            }
            if (badAlpha > 0 || colors.size > 31) {
                details.push(`BAD_PIXEL(${act}: colors=${colors.size}, badAlpha=${badAlpha})`);
                continue;
            }
            varPassed++;
            passed++;
        }
        console.log(`Variation ${v}: ${varPassed}/7 actions verified ${details.length ? details.join(', ') : '✓'}`);
    }
    console.log(`Total ${gender}: ${passed}/${total} PASS\n`);
}

checkDemographic('Male');
checkDemographic('Female');
