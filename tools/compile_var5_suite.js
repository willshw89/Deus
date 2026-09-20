'use strict';

/**
 * tools/compile_var5_suite.js
 *
 * Compiles the complete 7-action 12-sprite suite for Adult Male Human (Variation 5 - Blacksmith / Quarryman)
 * into game/img/characters/$UF_Human_Male_5_{Action}.png and .json sidecars.
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const {
    extractFrameFromCell,
    extractUniformCell,
    mirrorFrame,
    assemble12SpriteSheet,
    saveSheetAndSidecar
} = require('./build_pro_human_male');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'raw');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');

function compileVar5Suite() {
    console.log('=== Compiling Adult Male Human Variation 5 (Blacksmith) 7-Action Suite ===');

    // 1. WALK
    const imgWalk = decodePNG(fs.readFileSync(path.join(RAW_DIR, 'human_male_var5_pro_4d_walk.png')));
    const wS = [0, 1, 2].map(c => extractFrameFromCell(imgWalk, c * 234, (c + 1) * 234, 0, 258, 43));
    const wE = [0, 1, 2].map(c => extractFrameFromCell(imgWalk, c * 234, (c + 1) * 234, 258, 511, 43));
    const wN = [0, 1, 2].map(c => extractFrameFromCell(imgWalk, c * 234, (c + 1) * 234, 511, 767, 43));
    const walkSheet = assemble12SpriteSheet({ S: wS, W: wE.map(mirrorFrame), E: wE, N: wN });
    saveSheetAndSidecar(walkSheet, 'Human_Male_5_Walk', 'Walk', { walk: [0, 1, 2, 1], stand: [1] });
    saveSheetAndSidecar(walkSheet, 'Human_Male_5', 'Walk', { walk: [0, 1, 2, 1], stand: [1] });

    // 2. HAUL
    const imgHaul = decodePNG(fs.readFileSync(path.join(RAW_DIR, 'human_male_var5_pro_4d_haul.png')));
    const hS = [0, 1, 2].map(c => extractFrameFromCell(imgHaul, c * 234, (c + 1) * 234, 0, 258, 43));
    const hE = [0, 1, 2].map(c => extractFrameFromCell(imgHaul, c * 234, (c + 1) * 234, 258, 511, 43));
    const hN = [0, 1, 2].map(c => extractFrameFromCell(imgHaul, c * 234, (c + 1) * 234, 511, 767, 43));
    const haulSheet = assemble12SpriteSheet({ S: hS, W: hE.map(mirrorFrame), E: hE, N: hN });
    saveSheetAndSidecar(haulSheet, 'Human_Male_5_Haul', 'Haul', { haul: [0, 1, 2, 1], carry: [1], stand: [1] });

    // 3. ATTACK (Heavy Smithing Hammer)
    const imgAtk = decodePNG(fs.readFileSync(path.join(RAW_DIR, 'human_male_var5_pro_4d_attack.png')));
    const aS = [0, 1, 2].map(c => extractFrameFromCell(imgAtk, c * 234, (c + 1) * 234, 0, 258, 43));
    const aE = [0, 1, 2].map(c => extractFrameFromCell(imgAtk, c * 234, (c + 1) * 234, 258, 511, 43));
    const aN = [0, 1, 2].map(c => extractFrameFromCell(imgAtk, c * 234, (c + 1) * 234, 511, 767, 43));
    const atkSheet = assemble12SpriteSheet({ S: aS, W: aE.map(mirrorFrame), E: aE, N: aN });
    saveSheetAndSidecar(atkSheet, 'Human_Male_5_Attack', 'Attack', { attack: [0, 1, 2], ready: [0] });

    // 4. BOW (Heavy Miner Crossbow / Sling)
    const imgBow = decodePNG(fs.readFileSync(path.join(RAW_DIR, 'human_male_var5_pro_4d_bow.png')));
    const bS = [0, 1, 2].map(c => extractFrameFromCell(imgBow, c * 234, (c + 1) * 234, 0, 258, 43));
    const bE = [
        extractFrameFromCell(imgBow, 0, 234, 258, 511, 43),
        extractFrameFromCell(imgBow, 1 * 234, 2 * 234, 258, 511, 43),
        extractFrameFromCell(imgBow, 5 * 234, 6 * 234, 258, 511, 43)
    ];
    const bN = [0, 1, 2].map(c => extractFrameFromCell(imgBow, c * 234, (c + 1) * 234, 511, 767, 43));
    const bowSheet = assemble12SpriteSheet({ S: bS, W: bE.map(mirrorFrame), E: bE, N: bN });
    saveSheetAndSidecar(bowSheet, 'Human_Male_5_Bow', 'Bow', { shoot: [0, 1, 2], aim: [1], ready: [0] });

    // 5. MAGIC (Spell Initiation)
    const imgMag = decodePNG(fs.readFileSync(path.join(RAW_DIR, 'human_male_var5_pro_4d_magic.png')));
    const mS = [0, 1, 2].map(c => extractFrameFromCell(imgMag, c * 234, (c + 1) * 234, 0, 258, 43));
    const mE = [0, 1, 2].map(c => extractFrameFromCell(imgMag, c * 234, (c + 1) * 234, 258, 511, 43));
    const mN = [0, 1, 2].map(c => extractFrameFromCell(imgMag, c * 234, (c + 1) * 234, 511, 767, 43));
    const magSheet = assemble12SpriteSheet({ S: mS, W: mE.map(mirrorFrame), E: mE, N: mN });
    saveSheetAndSidecar(magSheet, 'Human_Male_5_Magic', 'Magic', { cast: [0, 1, 2, 1], chant: [0] });

    // 6. WORK (Blacksmith Forging Work)
    const imgWrk = decodePNG(fs.readFileSync(path.join(RAW_DIR, 'human_male_var5_pro_4d_work.png')));
    const wkS = [
        extractFrameFromCell(imgWrk, 0, 234, 0, 258, 43),
        extractUniformCell(imgWrk, 234, 468, 0, 258),
        extractFrameFromCell(imgWrk, 468, 702, 0, 258, 43)
    ];
    const wkE = [
        extractFrameFromCell(imgWrk, 0, 234, 258, 511, 43),
        extractUniformCell(imgWrk, 234, 468, 258, 511),
        extractFrameFromCell(imgWrk, 468, 702, 258, 511, 43)
    ];
    const wkN = [
        extractFrameFromCell(imgWrk, 0, 234, 511, 767, 43),
        extractUniformCell(imgWrk, 234, 468, 511, 767),
        extractFrameFromCell(imgWrk, 468, 702, 511, 767, 43)
    ];
    const wrkSheet = assemble12SpriteSheet({ S: wkS, W: wkE.map(mirrorFrame), E: wkE, N: wkN });
    saveSheetAndSidecar(wrkSheet, 'Human_Male_5_Work', 'Work', { work: [0, 1, 2, 1], craft: [1] });

    // 7. DOWNED (Defeat Sequence)
    const imgDwn = decodePNG(fs.readFileSync(path.join(RAW_DIR, 'human_male_var5_pro_4d_downed.png')));
    const dS = [
        extractFrameFromCell(imgDwn, 234, 468, 0, 258, 43),   // Flinch clutching chest
        extractUniformCell(imgDwn, 702, 936, 0, 258),         // Kneeling collapse (~28px)
        extractUniformCell(imgDwn, 936, 1170, 0, 258)         // Flat horizontal corpse (~14px)
    ];
    const dE = [
        extractFrameFromCell(imgDwn, 234, 468, 258, 511, 43),
        extractUniformCell(imgDwn, 702, 936, 258, 511),
        extractUniformCell(imgDwn, 936, 1170, 258, 511)
    ];
    const dN = [
        extractFrameFromCell(imgDwn, 0, 234, 511, 767, 43),
        extractUniformCell(imgDwn, 702, 936, 511, 767),
        extractUniformCell(imgDwn, 936, 1170, 511, 767)
    ];
    const dwnSheet = assemble12SpriteSheet({ S: dS, W: dE.map(mirrorFrame), E: dE, N: dN });
    saveSheetAndSidecar(dwnSheet, 'Human_Male_5_Downed', 'Downed', { downed: [0, 1, 2], corpse: [2] });

    // Save Var 5 Master 7-Action Review Board (7 sheets wide: 7 * 144 = 1008, height 192)
    const sheets = [walkSheet, haulSheet, atkSheet, bowSheet, magSheet, wrkSheet, dwnSheet];
    const montage = Buffer.alloc(7 * 144 * 192 * 4);
    for (let i = 0; i < sheets.length; i++) {
        const sBuf = sheets[i];
        const xOffset = i * 144;
        for (let y = 0; y < 192; y++) {
            for (let x = 0; x < 144; x++) {
                const sIdx = (y * 144 + x) * 4;
                const dIdx = (y * (7 * 144) + (xOffset + x)) * 4;
                montage[dIdx]     = sBuf[sIdx];
                montage[dIdx + 1] = sBuf[sIdx + 1];
                montage[dIdx + 2] = sBuf[sIdx + 2];
                montage[dIdx + 3] = sBuf[sIdx + 3];
            }
        }
    }
    const reviewPath = path.join(REVIEW_DIR, 'human_male_var5_all_7_actions_12_sprites.png');
    writePNG(reviewPath, 7 * 144, 192, montage);
    console.log(`Saved Var 5 Master Review Board: ${reviewPath}`);
}

compileVar5Suite();
