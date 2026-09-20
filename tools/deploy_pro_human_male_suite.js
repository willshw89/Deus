'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const {
    pal,
    mirrorFrame,
    assemble12SpriteSheet,
    saveSheetAndSidecar,
    quantizeSheet
} = require('./build_pro_human_male');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');

console.log('=== Deploying 100% Google Nano Banana Pro Human Male Action Suite ===\n');

// 1. Walk
const walkPNG = decodePNG(fs.readFileSync(path.join(REVIEW_DIR, 'pro_walk_12_sheet_perfect.png')));
quantizeSheet(walkPNG.data, 144, 192, 31);
saveSheetAndSidecar(walkPNG.data, 'Human_Male_Walk', 'Walk', { walk: [0, 1, 2, 1], stand: [1] });
saveSheetAndSidecar(walkPNG.data, 'Human_Male',      'Walk', { walk: [0, 1, 2, 1], stand: [1] });
saveSheetAndSidecar(walkPNG.data, 'Human_Male_Adult','Walk', { walk: [0, 1, 2, 1], stand: [1] });
saveSheetAndSidecar(walkPNG.data, 'Human',           'Walk', { walk: [0, 1, 2, 1], stand: [1] });

// 2. Haul
const haulPNG = decodePNG(fs.readFileSync(path.join(REVIEW_DIR, 'pro_haul_12_sheet.png')));
saveSheetAndSidecar(haulPNG.data, 'Human_Male_Haul', 'Haul', { haul: [0, 1, 2, 1], carry: [1], stand: [1] });

// 3. Attack
const attackPNG = decodePNG(fs.readFileSync(path.join(REVIEW_DIR, 'pro_attack_12_sheet.png')));
saveSheetAndSidecar(attackPNG.data, 'Human_Male_Attack',  'Attack', { attack: [0, 1, 2] });
saveSheetAndSidecar(attackPNG.data, 'Human_Attack_Sword', 'Attack', { attack: [0, 1, 2] });

// 4. Bow
const bowPNG = decodePNG(fs.readFileSync(path.join(REVIEW_DIR, 'pro_bow_12_sheet.png')));
saveSheetAndSidecar(bowPNG.data, 'Human_Male_Bow',   'Bow', { shoot: [0, 1, 2], pluck: [2] });
saveSheetAndSidecar(bowPNG.data, 'Human_Attack_Bow', 'Bow', { shoot: [0, 1, 2], pluck: [2] });

// 5. Magic
const magicPNG = decodePNG(fs.readFileSync(path.join(REVIEW_DIR, 'pro_magic_12_sheet.png')));
saveSheetAndSidecar(magicPNG.data, 'Human_Male_Magic', 'Cast', { cast: [0, 1, 2] });
saveSheetAndSidecar(magicPNG.data, 'Human_Cast',       'Cast', { cast: [0, 1, 2] });

// 6. Work
const workPNG = decodePNG(fs.readFileSync(path.join(REVIEW_DIR, 'pro_work_12_sheet.png')));
saveSheetAndSidecar(workPNG.data, 'Human_Male_Work', 'Work', { work: [0, 1, 2] });

// 7. Downed
const downedPNG = decodePNG(fs.readFileSync(path.join(REVIEW_DIR, 'pro_downed_12_sheet.png')));
saveSheetAndSidecar(downedPNG.data, 'Human_Male_Downed', 'Downed', { downed: [0, 1, 2], hurt: [0], collapse: [1], corpse: [2] });

console.log('\nAll sheets deployed to game/img/characters/ successfully!');
