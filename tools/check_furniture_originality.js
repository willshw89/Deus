'use strict';

const { execSync } = require('child_process');
const list = [
    '!$UF_Bed_Wood.png',
    '!$UF_Chest_Wood.png',
    '!$UF_Dining_Table.png',
    '!$UF_Dining_Bench.png',
    '!$UF_Kitchen_Counter.png',
    '!$UF_Kitchen_Pantry.png',
    '!$UF_Kitchen_Hearth.png',
    '!$UF_Shop_Counter.png',
    '!$UF_Apothecary_Bench.png'
];

console.log('=== Checking Ultima VII Originality on New Props ===');
for (const f of list) {
    const node = `"${process.execPath}"`;
    const res = execSync(`${node} tools/originality_check.js "game/img/characters/${f}"`).toString().trim();
    console.log(`${f} -> ${res}`);
}
