'use strict';

/**
 * tools/compile_all_42_female_charsets.js
 *
 * Master compilation tool for Adult Female Human 42-Charset Suite
 * (6 Settler Variations x 7 Dedicated 12-Sprite Actions: Walk, Haul, Attack, Bow, Magic, Work, Downed).
 *
 * All sprites originated 100% from Google Nano Banana Pro (gemini-3-pro-image) per AGENTS.md Rule 11.
 * Snapped to art/palette/uf.hex (<= 31 colors per sheet, 100% binary alpha).
 * Grounded at native baseline y = 47 in 48x48 cells. Serious chibi style (~3.1 heads tall, ~42-43px height).
 * Dynamic alternating leg strides on West and East walk/haul cycles.
 * Outputs to game/img/characters/$UF_Human_Female_{1..6}_{Action}.png and sidecars,
 * with Var 1 also aliased to $UF_Human_Female_{Action}.png, $UF_Human_Female.png, and $Eve.png.
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

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'raw');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');

fs.mkdirSync(REVIEW_DIR, { recursive: true });
fs.mkdirSync(CHAR_DIR, { recursive: true });

// Specific cell coordinates and extraction configs for all 6 variations
const VARIATIONS = [
    {
        num: 1,
        name: 'Variation 1 (Master Settler / Militia Pioneer)',
        walkRaw: 'references/human_female_walk_12_reference.png',
        haulRaw: 'human_female_haul_12_raw.png',
        attackRaw: 'human_female_attack_12_raw.png',
        bowRaw: 'human_female_bow_12_raw.png',
        magicRaw: 'human_female_magic_12_raw.png',
        workRaw: 'human_female_work_12_raw.png',
        downedRaw: 'human_female_downed_12_raw.png',
        // Var 1 uses master reference grid
        isMasterGrid: true
    },
    {
        num: 2,
        name: 'Variation 2 (Frontier Scout / Wayfinder)',
        walkRaw: 'human_female_var2_pro_4d_walk.png',
        haulRaw: 'human_female_var2_pro_4d_haul.png',
        attackRaw: 'human_female_var2_pro_4d_attack.png',
        bowRaw: 'human_female_var2_pro_4d_bow.png',
        magicRaw: 'human_female_var2_pro_4d_magic.png',
        workRaw: 'human_female_var2_pro_4d_work.png',
        downedRaw: 'human_female_var2_pro_4d_downed.png'
    },
    {
        num: 3,
        name: 'Variation 3 (Heavy Guard / Shieldmaiden Veteran)',
        walkRaw: 'human_female_var3_pro_4d_walk.png',
        haulRaw: 'human_female_var3_pro_4d_haul.png',
        attackRaw: 'human_female_var3_pro_4d_attack.png',
        bowRaw: 'human_female_var3_pro_4d_bow.png',
        magicRaw: 'human_female_var3_pro_4d_magic.png',
        workRaw: 'human_female_var3_pro_4d_work.png',
        downedRaw: 'human_female_var3_pro_4d_downed.png'
    },
    {
        num: 4,
        name: 'Variation 4 (Artisan Herbalist / Woodcrafter)',
        walkRaw: 'human_female_var4_pro_4d_walk.png',
        haulRaw: 'human_female_var4_pro_4d_haul.png',
        attackRaw: 'human_female_var4_pro_4d_attack.png',
        bowRaw: 'human_female_var4_pro_4d_bow.png',
        magicRaw: 'human_female_var4_pro_4d_magic.png',
        workRaw: 'human_female_var4_pro_4d_work.png',
        downedRaw: 'human_female_var4_pro_4d_downed.png'
    },
    {
        num: 5,
        name: 'Variation 5 (Forge Artisan / Quarrywoman)',
        walkRaw: 'human_female_var5_pro_4d_walk.png',
        haulRaw: 'human_female_var5_pro_4d_haul.png',
        attackRaw: 'human_female_var5_pro_4d_attack.png',
        bowRaw: 'human_female_var5_pro_4d_bow.png',
        magicRaw: 'human_female_var5_pro_4d_magic.png',
        workRaw: 'human_female_var5_pro_4d_work.png',
        downedRaw: 'human_female_var5_pro_4d_downed.png'
    },
    {
        num: 6,
        name: 'Variation 6 (Seasoned Veteran Huntress / Ranger Captain)',
        walkRaw: 'human_female_var6_pro_4d_walk.png',
        haulRaw: 'human_female_var6_pro_4d_haul.png',
        attackRaw: 'human_female_var6_pro_4d_attack.png',
        bowRaw: 'human_female_var6_pro_4d_bow.png',
        magicRaw: 'human_female_var6_pro_4d_magic.png',
        workRaw: 'human_female_var6_pro_4d_work.png',
        downedRaw: 'human_female_var6_pro_4d_downed.png'
    }
];

function compileVariation(v) {
    console.log(`\n==========================================================`);
    console.log(`=== Compiling Adult Female Human ${v.name} ===`);
    console.log(`==========================================================`);

    const cW = 234, cH = 256;

    // 1. WALK
    console.log('1. Walk...');
    const imgWalk = decodePNG(fs.readFileSync(path.join(RAW_DIR, v.walkRaw)));
    const wS = [0, 1, 2].map(c => extractFrameFromCell(imgWalk, c * cW, (c + 1) * cW, 0, cH, 43));
    let wE;
    if (v.isMasterGrid) {
        // Master reference: row 0 col 3 (Stride A), row 0 col 4 (Stand), row 1 col 0 (Stride B)
        wE = [
            extractFrameFromCell(imgWalk, 3 * cW, 4 * cW, 0, cH, 43),
            extractFrameFromCell(imgWalk, 4 * cW, 5 * cW, 0, cH, 43),
            extractFrameFromCell(imgWalk, 0 * cW, 1 * cW, cH, 2 * cH, 43)
        ];
    } else {
        wE = [
            extractFrameFromCell(imgWalk, 3 * cW, 4 * cW, 0, cH, 43),   // Stride A
            extractFrameFromCell(imgWalk, 4 * cW, 5 * cW, 0, cH, 43),   // Stand
            extractFrameFromCell(imgWalk, 0 * cW, 1 * cW, cH, 2 * cH, 43) // Stride B
        ];
    }
    const wN = [0, 1, 2].map(c => extractFrameFromCell(imgWalk, c * cW, (c + 1) * cW, 2 * cH, 3 * cH, 43));
    const walkSheet = assemble12SpriteSheet({ S: wS, W: wE.map(mirrorFrame), E: wE, N: wN });
    saveSheetAndSidecar(walkSheet, `Human_Female_${v.num}_Walk`, 'Walk', { walk: [0, 1, 2, 1], stand: [1] });
    saveSheetAndSidecar(walkSheet, `Human_Female_${v.num}`, 'Walk', { walk: [0, 1, 2, 1], stand: [1] });

    if (v.num === 1) {
        saveSheetAndSidecar(walkSheet, 'Human_Female_Walk', 'Walk', { walk: [0, 1, 2, 1], stand: [1] });
        saveSheetAndSidecar(walkSheet, 'Human_Female', 'Walk', { walk: [0, 1, 2, 1], stand: [1] });
        saveSheetAndSidecar(walkSheet, 'Eve', 'Walk', { walk: [0, 1, 2, 1], stand: [1] });
    }

    // 2. HAUL
    console.log('2. Haul...');
    const imgHaul = decodePNG(fs.readFileSync(path.join(RAW_DIR, v.haulRaw)));
    const hS = [0, 1, 2].map(c => extractFrameFromCell(imgHaul, c * cW, (c + 1) * cW, 0, cH, 43));
    const hE = [
        extractFrameFromCell(imgHaul, 3 * cW, 4 * cW, 0, cH, 43),   // Stride A
        extractFrameFromCell(imgHaul, 4 * cW, 5 * cW, 0, cH, 43),   // Stand
        extractFrameFromCell(imgHaul, 0 * cW, 1 * cW, cH, 2 * cH, 43) // Stride B
    ];
    const hN = [0, 1, 2].map(c => extractFrameFromCell(imgHaul, c * cW, (c + 1) * cW, 2 * cH, 3 * cH, 43));
    const haulSheet = assemble12SpriteSheet({ S: hS, W: hE.map(mirrorFrame), E: hE, N: hN });
    saveSheetAndSidecar(haulSheet, `Human_Female_${v.num}_Haul`, 'Haul', { haul: [0, 1, 2, 1], carry: [1], stand: [1] });
    if (v.num === 1) saveSheetAndSidecar(haulSheet, 'Human_Female_Haul', 'Haul', { haul: [0, 1, 2, 1], carry: [1], stand: [1] });

    // 3. ATTACK
    console.log('3. Attack...');
    const imgAtk = decodePNG(fs.readFileSync(path.join(RAW_DIR, v.attackRaw)));
    const aS = [0, 2, 3].map(c => extractFrameFromCell(imgAtk, c * cW, (c + 1) * cW, 0, cH, 43));
    const aE = [0, 2, 3].map(c => extractFrameFromCell(imgAtk, c * cW, (c + 1) * cW, cH, 2 * cH, 43));
    const aN = [0, 2, 3].map(c => extractFrameFromCell(imgAtk, c * cW, (c + 1) * cW, 2 * cH, 3 * cH, 43));
    const atkSheet = assemble12SpriteSheet({ S: aS, W: aE.map(mirrorFrame), E: aE, N: aN });
    saveSheetAndSidecar(atkSheet, `Human_Female_${v.num}_Attack`, 'Attack', { attack: [0, 1, 2], ready: [0] });
    if (v.num === 1) saveSheetAndSidecar(atkSheet, 'Human_Female_Attack', 'Attack', { attack: [0, 1, 2], ready: [0] });

    // 4. BOW
    console.log('4. Bow...');
    const imgBow = decodePNG(fs.readFileSync(path.join(RAW_DIR, v.bowRaw)));
    const bS = [0, 1, 2].map(c => extractFrameFromCell(imgBow, c * cW, (c + 1) * cW, 0, cH, 43));
    const bE = [0, 1, 2].map(c => extractFrameFromCell(imgBow, c * cW, (c + 1) * cW, cH, 2 * cH, 43));
    const bN = [0, 1, 2].map(c => extractFrameFromCell(imgBow, c * cW, (c + 1) * cW, 2 * cH, 3 * cH, 43));
    const bowSheet = assemble12SpriteSheet({ S: bS, W: bE.map(mirrorFrame), E: bE, N: bN });
    saveSheetAndSidecar(bowSheet, `Human_Female_${v.num}_Bow`, 'Bow', { shoot: [0, 1, 2], aim: [1], ready: [0] });
    if (v.num === 1) saveSheetAndSidecar(bowSheet, 'Human_Female_Bow', 'Bow', { shoot: [0, 1, 2], aim: [1], ready: [0] });

    // 5. MAGIC
    console.log('5. Magic...');
    const imgMag = decodePNG(fs.readFileSync(path.join(RAW_DIR, v.magicRaw)));
    const mS = [0, 1, 2].map(c => extractFrameFromCell(imgMag, c * cW, (c + 1) * cW, 0, cH, 43));
    const mE = [0, 1, 2].map(c => extractFrameFromCell(imgMag, c * cW, (c + 1) * cW, cH, 2 * cH, 43));
    const mN = [0, 1, 2].map(c => extractFrameFromCell(imgMag, c * cW, (c + 1) * cW, 2 * cH, 3 * cH, 43));
    const magSheet = assemble12SpriteSheet({ S: mS, W: mE.map(mirrorFrame), E: mE, N: mN });
    saveSheetAndSidecar(magSheet, `Human_Female_${v.num}_Magic`, 'Magic', { cast: [0, 1, 2, 1], chant: [0] });
    if (v.num === 1) saveSheetAndSidecar(magSheet, 'Human_Female_Magic', 'Magic', { cast: [0, 1, 2, 1], chant: [0] });

    // 6. WORK
    console.log('6. Work...');
    const imgWrk = decodePNG(fs.readFileSync(path.join(RAW_DIR, v.workRaw)));
    let wkCols;
    if (v.num === 3 || v.num === 5 || v.num === 6) {
        wkCols = [0, 2, 3];
    } else {
        wkCols = [0, 3, 4];
    }
    const wkS = wkCols.map(c => extractFrameFromCell(imgWrk, c * cW, (c + 1) * cW, 0, cH, 43));
    const wkE = wkCols.map(c => extractFrameFromCell(imgWrk, c * cW, (c + 1) * cW, cH, 2 * cH, 43));
    const wkN = wkCols.map(c => extractFrameFromCell(imgWrk, c * cW, (c + 1) * cW, 2 * cH, 3 * cH, 43));
    const wrkSheet = assemble12SpriteSheet({ S: wkS, W: wkE.map(mirrorFrame), E: wkE, N: wkN });
    saveSheetAndSidecar(wrkSheet, `Human_Female_${v.num}_Work`, 'Work', { work: [0, 1, 2, 1], craft: [1] });
    if (v.num === 1) saveSheetAndSidecar(wrkSheet, 'Human_Female_Work', 'Work', { work: [0, 1, 2, 1], craft: [1] });

    // 7. DOWNED
    console.log('7. Downed...');
    const imgDwn = decodePNG(fs.readFileSync(path.join(RAW_DIR, v.downedRaw)));
    let dS, dE, dN;
    if (v.num === 1) {
        dS = [
            extractFrameFromCell(imgDwn, 0, cW, 0, cH, 43),
            extractFrameFromCell(imgDwn, cW, 2 * cW, 0, cH, 43),
            extractFrameFromCell(imgDwn, 2 * cW, 3 * cW, 0, cH, 43, 44)
        ];
        dE = [
            extractFrameFromCell(imgDwn, 0, cW, cH, 2 * cH, 43),
            extractFrameFromCell(imgDwn, cW, 2 * cW, cH, 2 * cH, 43),
            extractFrameFromCell(imgDwn, 2 * cW, 3 * cW, cH, 2 * cH, 43, 44)
        ];
        dN = [
            extractFrameFromCell(imgDwn, 0, cW, 2 * cH, 3 * cH, 43),
            extractFrameFromCell(imgDwn, cW, 2 * cW, 2 * cH, 3 * cH, 43),
            extractFrameFromCell(imgDwn, 2 * cW, 3 * cW, 2 * cH, 3 * cH, 43, 44)
        ];
    } else if (v.num === 2) {
        dS = [
            extractFrameFromCell(imgDwn, 0, cW, 0, cH, 43),
            extractFrameFromCell(imgDwn, 3 * cW, 4 * cW, 0, cH, 43),
            extractFrameFromCell(imgDwn, 1120, 1400, 0, cH, 43, 44)
        ];
        dE = [
            extractFrameFromCell(imgDwn, 0, cW, cH, 2 * cH, 43),
            extractFrameFromCell(imgDwn, 3 * cW, 4 * cW, cH, 2 * cH, 43),
            extractFrameFromCell(imgDwn, 1120, 1400, cH, 2 * cH, 43, 44)
        ];
        dN = [
            extractFrameFromCell(imgDwn, 0, cW, 2 * cH, 3 * cH, 43),
            extractFrameFromCell(imgDwn, 3 * cW, 4 * cW, 2 * cH, 3 * cH, 43),
            extractFrameFromCell(imgDwn, 1120, 1400, 2 * cH, 3 * cH, 43, 44)
        ];
    } else if (v.num === 3 || v.num === 4) {
        dS = [
            extractFrameFromCell(imgDwn, 0, cW, 0, cH, 43),
            extractFrameFromCell(imgDwn, 3 * cW, 4 * cW, 0, cH, 43),
            extractFrameFromCell(imgDwn, 1000, 1380, 0, cH, 43, 44)
        ];
        dE = [
            extractFrameFromCell(imgDwn, 0, cW, cH, 2 * cH, 43),
            extractFrameFromCell(imgDwn, 3 * cW, 4 * cW, cH, 2 * cH, 43),
            extractFrameFromCell(imgDwn, 1000, 1380, cH, 2 * cH, 43, 44)
        ];
        dN = [
            extractFrameFromCell(imgDwn, 0, cW, 2 * cH, 3 * cH, 43),
            extractFrameFromCell(imgDwn, 3 * cW, 4 * cW, 2 * cH, 3 * cH, 43),
            extractFrameFromCell(imgDwn, 1000, 1380, 2 * cH, 3 * cH, 43, 44)
        ];
    } else if (v.num === 5) {
        dS = [
            extractFrameFromCell(imgDwn, 0, cW, 0, cH, 43),
            extractFrameFromCell(imgDwn, 740, 980, 0, cH, 43),
            extractFrameFromCell(imgDwn, 990, 1380, 0, cH, 43, 44)
        ];
        dE = [
            extractFrameFromCell(imgDwn, 0, cW, cH, 2 * cH, 43),
            extractFrameFromCell(imgDwn, 740, 980, cH, 2 * cH, 43),
            extractFrameFromCell(imgDwn, 990, 1380, cH, 2 * cH, 43, 44)
        ];
        dN = [
            extractFrameFromCell(imgDwn, 0, cW, 2 * cH, 3 * cH, 43),
            extractFrameFromCell(imgDwn, 740, 980, 2 * cH, 3 * cH, 43),
            extractFrameFromCell(imgDwn, 990, 1380, 2 * cH, 3 * cH, 43, 44)
        ];
    } else if (v.num === 6) {
        dS = [
            extractFrameFromCell(imgDwn, 0, cW, 0, cH, 43),
            extractFrameFromCell(imgDwn, 730, 980, 0, cH, 43),
            extractFrameFromCell(imgDwn, 990, 1380, 0, cH, 43, 44)
        ];
        dE = [
            extractFrameFromCell(imgDwn, 0, cW, cH, 2 * cH, 43),
            extractFrameFromCell(imgDwn, 730, 980, cH, 2 * cH, 43),
            extractFrameFromCell(imgDwn, 990, 1380, cH, 2 * cH, 43, 44)
        ];
        dN = [
            extractFrameFromCell(imgDwn, 0, cW, 2 * cH, 3 * cH, 43),
            extractFrameFromCell(imgDwn, 730, 980, 2 * cH, 3 * cH, 43),
            extractFrameFromCell(imgDwn, 990, 1380, 2 * cH, 3 * cH, 43, 44)
        ];
    }
    const dwnSheet = assemble12SpriteSheet({ S: dS, W: dE.map(mirrorFrame), E: dE, N: dN });
    saveSheetAndSidecar(dwnSheet, `Human_Female_${v.num}_Downed`, 'Downed', { downed: [0, 1, 2], corpse: [2] });
    if (v.num === 1) saveSheetAndSidecar(dwnSheet, 'Human_Female_Downed', 'Downed', { downed: [0, 1, 2], corpse: [2] });

    // Save individual variation 7-action review montage (1008 x 192 px)
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
    const montagePath = path.join(REVIEW_DIR, `human_female_var${v.num}_all_7_actions_12_sprites.png`);
    writePNG(montagePath, 7 * 144, 192, montage);
    console.log(`Saved Var ${v.num} review montage to: ${montagePath}`);

    return { ...v, walkSheet, sheets };
}

function compileAll() {
    console.log('=== Starting Compilation of All 42 Adult Female Human Charsets ===\n');
    const results = [];

    for (const v of VARIATIONS) {
        const res = compileVariation(v);
        results.push(res);
    }

    // Build Master 6-Variation Walk Montage (864 x 192 px)
    console.log('\nBuilding Master 6-Variation Walk Montage (864 x 192 px)...');
    const walkMontage = Buffer.alloc(6 * 144 * 192 * 4);
    for (let i = 0; i < results.length; i++) {
        const sBuf = results[i].walkSheet;
        const xOffset = i * 144;
        for (let y = 0; y < 192; y++) {
            for (let x = 0; x < 144; x++) {
                const sIdx = (y * 144 + x) * 4;
                const dIdx = (y * (6 * 144) + (xOffset + x)) * 4;
                walkMontage[dIdx]   = sBuf[sIdx];
                walkMontage[dIdx+1] = sBuf[sIdx+1];
                walkMontage[dIdx+2] = sBuf[sIdx+2];
                walkMontage[dIdx+3] = sBuf[sIdx+3];
            }
        }
    }
    const walkMontagePath = path.join(REVIEW_DIR, 'human_female_6_variations_montage.png');
    writePNG(walkMontagePath, 6 * 144, 192, walkMontage);
    console.log(`Saved master walk montage: ${walkMontagePath}`);

    console.log('\n=== All 42 Adult Female Human Charsets Successfully Compiled! ===');
}

compileAll();
