'use strict';
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');

const charDir = path.join(__dirname, '..', 'game', 'img', 'characters');
const files = [
    '$UF_Human_Male.png',
    '$UF_Human_Male_Adult.png',
    '$UF_Human_Male_8D.png',
    '$UF_Human_Male_AR600.png',
    '$UF_Human_Male_Attack_8D.png',
    '$UF_Human_Male_Bow_8D.png',
    '$UF_Human_Male_Cast_8D.png',
    '$UF_Human_Male_Work_8D.png',
    '$UF_Human_Attack_Sword.png',
    '$UF_Human_Attack_Bow.png',
    '$UF_Human_Cast.png'
];

for (const f of files) {
    const p = path.join(charDir, f);
    if (fs.existsSync(p)) {
        const d = decodePNG(fs.readFileSync(p));
        console.log(f.padEnd(32), `${d.width}x${d.height}`);
    } else {
        console.log(f.padEnd(32), 'NOT FOUND');
    }
}
