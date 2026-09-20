'use strict';

/**
 * tools/compile_female_var2.js
 *
 * Compiles Adult Female Human Variation 2 (Scout) across all 7 actions.
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const {
    extractFrameFromCell,
    mirrorFrame,
    assemble12SpriteSheet,
    saveSheetAndSidecar
} = require('./build_pro_human_male');

const RAW_DIR = path.join(__dirname, '..', 'art', 'raw');
const REVIEW_DIR = path.join(__dirname, '..', 'art', 'review');

function compileVar2() {
    console.log('=== Compiling Female Var 2 (Frontier Scout) ===');

    // 1. WALK
    const imgWalk = decodePNG(fs.readFileSync(path.join(RAW_DIR, 'human_female_var2_pro_4d_walk.png')));
    const wS = [0, 1, 2].map(c => extractFrameFromCell(imgWalk, c * 234, (c + 1) * 234, 0, 258, 43));
    const wE = [
        extractFrameFromCell(imgWalk, 704, 938, 0, 258, 43),   // Stride A (left leg)
        extractFrameFromCell(imgWalk, 0, 234, 258, 511, 43),    // Stand / passing
        extractFrameFromCell(imgWalk, 0, 234, 258, 511, 43)     // Stride B
    ];
    // Check if col 0 row 1 has right leg forward
    const wE_strideB = extractFrameFromCell(imgWalk, 938, 1172, 258, 511, 43);
    const wE_final = [wE[0], wE[1], wE_strideB];
    const wN = [0, 1, 2].map(c => extractFrameFromCell(imgWalk, c * 234, (c + 1) * 234, 511, 767, 43));
    const walkSheet = assemble12SpriteSheet({ S: wS, W: wE_final.map(mirrorFrame), E: wE_final, N: wN });
    saveSheetAndSidecar(walkSheet, 'Human_Female_2_Walk', 'Walk', { walk: [0, 1, 2, 1], stand: [1] });
    saveSheetAndSidecar(walkSheet, 'Human_Female_2', 'Walk', { walk: [0, 1, 2, 1], stand: [1] });

    // 2. HAUL
    const imgHaul = decodePNG(fs.readFileSync(path.join(RAW_DIR, 'human_female_var2_pro_4d_haul.png')));
    const hS = [0, 1, 2].map(c => extractFrameFromCell(imgHaul, c * 234, (c + 1) * 234, 0, 258, 43));
    const hE = [
        extractFrameFromCell(imgHaul, 704, 938, 0, 258, 43),   // Stride A
        extractFrameFromCell(imgHaul, 0, 234, 258, 511, 43),    // Stand
        extractFrameFromCell(imgHaul, 938, 1172, 258, 511, 43)  // Stride B
    ];
    const hN = [0, 1, 2].map(c => extractFrameFromCell(imgHaul, c * 234, (c + 1) * 234, 511, 767, 43));
    const haulSheet = assemble12SpriteSheet({ S: hS, W: hE.map(mirrorFrame), E: hE, N: hN });
    saveSheetAndSidecar(haulSheet, 'Human_Female_2_Haul', 'Haul', { haul: [0, 1, 2, 1], carry: [1], stand: [1] });

    // 3. ATTACK (Dual Hunting Daggers)
    const imgAtk = decodePNG(fs.readFileSync(path.join(RAW_DIR, 'human_female_var2_pro_4d_attack.png')));
    const aS = [0, 2, 3].map(c => extractFrameFromCell(imgAtk, c * 234, (c + 1) * 234, 0, 258, 43));
    const aE = [0, 2, 3].map(c => extractFrameFromCell(imgAtk, c * 234, (c + 1) * 234, 258, 511, 43));
    const aN = [0, 2, 3].map(c => extractFrameFromCell(imgAtk, c * 234, (c + 1) * 234, 511, 767, 43));
    const atkSheet = assemble12SpriteSheet({ S: aS, W: aE.map(mirrorFrame), E: aE, N: aN });
    saveSheetAndSidecar(atkSheet, 'Human_Female_2_Attack', 'Attack', { attack: [0, 1, 2], ready: [0] });

    // 4. BOW (Composite Scout Bow)
    const imgBow = decodePNG(fs.readFileSync(path.join(RAW_DIR, 'human_female_var2_pro_4d_bow.png')));
    const bS = [0, 1, 2].map(c => extractFrameFromCell(imgBow, c * 234, (c + 1) * 234, 0, 258, 43));
    const bE = [0, 1, 2].map(c => extractFrameFromCell(imgBow, c * 234, (c + 1) * 234, 258, 511, 43));
    const bN = [0, 1, 2].map(c => extractFrameFromCell(imgBow, c * 234, (c + 1) * 234, 511, 767, 43));
    const bowSheet = assemble12SpriteSheet({ S: bS, W: bE.map(mirrorFrame), E: bE, N: bN });
    saveSheetAndSidecar(bowSheet, 'Human_Female_2_Bow', 'Bow', { shoot: [0, 1, 2], aim: [1], ready: [0] });

    // 5. MAGIC (Spell Initiation)
    const imgMag = decodePNG(fs.readFileSync(path.join(RAW_DIR, 'human_female_var2_pro_4d_magic.png')));
    const mS = [0, 1, 2].map(c => extractFrameFromCell(imgMag, c * 234, (c + 1) * 234, 0, 258, 43));
    const mE = [0, 1, 2].map(c => extractFrameFromCell(imgMag, c * 234, (c + 1) * 234, 258, 511, 43));
    const mN = [0, 1, 2].map(c => extractFrameFromCell(imgMag, c * 234, (c + 1) * 234, 511, 767, 43));
    const magSheet = assemble12SpriteSheet({ S: mS, W: mE.map(mirrorFrame), E: mE, N: mN });
    saveSheetAndSidecar(magSheet, 'Human_Female_2_Magic', 'Magic', { cast: [0, 1, 2, 1], chant: [0] });

    // 6. WORK (Forester Whittling / Craft)
    const imgWrk = decodePNG(fs.readFileSync(path.join(RAW_DIR, 'human_female_var2_pro_4d_work.png')));
    const wkS = [
        extractFrameFromCell(imgWrk, 0, 234, 0, 258, 43),
        extractFrameFromCell(imgWrk, 704, 938, 0, 258, 43),   // Kneeling craftsman
        extractFrameFromCell(imgWrk, 938, 1172, 0, 258, 43)  // Ground strike
    ];
    const wkE = [
        extractFrameFromCell(imgWrk, 0, 234, 258, 511, 43),
        extractFrameFromCell(imgWrk, 704, 938, 258, 511, 43),
        extractFrameFromCell(imgWrk, 938, 1172, 258, 511, 43)
    ];
    const wkN = [
        extractFrameFromCell(imgWrk, 0, 234, 511, 767, 43),
        extractFrameFromCell(imgWrk, 704, 938, 511, 767, 43),
        extractFrameFromCell(imgWrk, 938, 1172, 511, 767, 43)
    ];
    const wrkSheet = assemble12SpriteSheet({ S: wkS, W: wkE.map(mirrorFrame), E: wkE, N: wkN });
    saveSheetAndSidecar(wrkSheet, 'Human_Female_2_Work', 'Work', { work: [0, 1, 2, 1], craft: [1] });

    // 7. DOWNED (Defeat Sequence)
    const imgDwn = decodePNG(fs.readFileSync(path.join(RAW_DIR, 'human_female_var2_pro_4d_downed.png')));
    const dS = [
        extractFrameFromCell(imgDwn, 0, 234, 0, 258, 43),                     // Flinch
        extractFrameFromCell(imgDwn, 704, 938, 0, 258, 43),                   // Kneel
        extractFrameFromCell(imgDwn, 1120, 1400, 0, 258, 43, 44)             // Prone corpse
    ];
    const dE = [
        extractFrameFromCell(imgDwn, 0, 234, 258, 511, 43),
        extractFrameFromCell(imgDwn, 704, 938, 258, 511, 43),
        extractFrameFromCell(imgDwn, 1120, 1400, 258, 511, 43, 44)
    ];
    const dN = [
        extractFrameFromCell(imgDwn, 0, 234, 511, 767, 43),
        extractFrameFromCell(imgDwn, 704, 938, 511, 767, 43),
        extractFrameFromCell(imgDwn, 1120, 1400, 511, 767, 43, 44)
    ];
    const dwnSheet = assemble12SpriteSheet({ S: dS, W: dE.map(mirrorFrame), E: dE, N: dN });
    saveSheetAndSidecar(dwnSheet, 'Human_Female_2_Downed', 'Downed', { downed: [0, 1, 2], corpse: [2] });

    // Montage
    const sheets = [walkSheet, haulSheet, atkSheet, bowSheet, magSheet, wrkSheet, dwnSheet];
    const montage = Buffer.alloc(7 * 144 * 192 * 4);
    for (let i = 0; i < sheets.length; i++) {
        const sBuf = sheets[i];
        const xOffset = i * 144;
        for (let y = 0; y < 192; y++) {
            for (let x = 0; x < 144; x++) {
                const sIdx = (y * 144 + x) * 4;
                const dIdx = (y * (7 * 144) + (xOffset + x)) * 4;
                montage[dIdx]   = sBuf[sIdx];
                montage[dIdx+1] = sBuf[sIdx+1];
                montage[dIdx+2] = sBuf[sIdx+2];
                montage[dIdx+3] = sBuf[sIdx+3];
            }
        }
    }
    const montagePath = path.join(REVIEW_DIR, 'human_female_var2_all_7_actions_12_sprites.png');
    writePNG(montagePath, 7 * 144, 192, montage);
    console.log(`Saved Var 2 review montage to: ${montagePath}`);
}

compileVar2();
