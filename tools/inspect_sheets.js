const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');

const dir = path.join(__dirname, '..', 'game', 'img', 'characters');
const targets = [
    '$UF_Boar_8D.png',
    '$UF_Troll_8D.png',
    '$UF_Wolf_8D.png',
    '$UF_Bear_8D.png',
    '$UF_Fox_8D.png',
    '$UF_Hare_8D.png',
    '$UF_GiantSpider_8D.png',
    '$UF_Human_Male_AR600.png',
    '$UF_Human_Male_8D.png',
    '$UF_Orc_8D.png',
    '$UF_Goblin_8D.png',
    '$UF_Gnome_8D.png'
];

for (const f of targets) {
    const p = path.join(dir, f);
    if (fs.existsSync(p)) {
        const img = decodePNG(fs.readFileSync(p));
        console.log(`${f}: ${img.width}x${img.height} (${img.width / 48} cols x ${img.height / 48} rows)`);
    } else {
        console.log(`${f}: NOT FOUND`);
    }
}

