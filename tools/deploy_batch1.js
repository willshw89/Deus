'use strict';
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'art', 'staging');
const dstDir = path.join(__dirname, '..', 'game', 'img', 'characters');

const files = [
    '!$UF_Chest_Wood.png',
    '!$UF_Chest_Wood.json',
    '!$UF_Crate_Wood.png',
    '!$UF_Crate_Wood.json',
    '!$UF_Barrel_Food.png',
    '!$UF_Barrel_Food.json',
    '!$UF_Kitchen_Pantry.png',
    '!$UF_Kitchen_Pantry.json'
];

for (const f of files) {
    const src = path.join(srcDir, f);
    const dst = path.join(dstDir, f);
    fs.copyFileSync(src, dst);
    console.log(`Copied ${f} -> game/img/characters/`);
}
console.log('All approved Batch 1 assets deployed successfully.');
