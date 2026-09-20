const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');

const dir = path.join(__dirname, '..', 'game', 'img', 'characters');
const files = [
    '$UF_Orc_8D.png', '$UF_Orc_Male.png', '$UF_Orc_Female.png',
    '$UF_Goblin_8D.png', '$UF_Goblin_Male.png', '$UF_Goblin_Female.png',
    '$UF_Gnome_8D.png', '$UF_Gnome_Male.png', '$UF_Gnome_Female.png',
    '$UF_Boar_8D.png', '$UF_Wolf_8D.png', '$UF_Bear_8D.png', '$UF_Fox_8D.png', '$UF_Hare_8D.png',
    '$UF_GiantSpider_8D.png', '$UF_Troll_8D.png'
];

for (const f of files) {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) {
        console.log(`${f}: MISSING`);
        continue;
    }
    const img = decodePNG(fs.readFileSync(p));
    console.log(`${f}: ${img.width}x${img.height} (${img.width/48}x${img.height/48})`);
}

