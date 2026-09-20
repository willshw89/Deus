const fs = require('fs');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const m1 = decodePNG(fs.readFileSync('game/img/characters/$UF_Human_Male_1_Walk.png'));
const m2 = decodePNG(fs.readFileSync('game/img/characters/$UF_Human_Male_2_Walk.png'));
const m3 = decodePNG(fs.readFileSync('game/img/characters/$UF_Human_Male_3_Walk.png'));
const f1 = decodePNG(fs.readFileSync('game/img/characters/$UF_Human_Female_1_Walk.png'));
const f2 = decodePNG(fs.readFileSync('game/img/characters/$UF_Human_Female_2_Walk.png'));

console.log('Successfully read walk files:');
console.log('M1:', m1.width, 'x', m1.height);
console.log('M2:', m2.width, 'x', m2.height);
console.log('M3:', m3.width, 'x', m3.height);
console.log('F1:', f1.width, 'x', f1.height);
console.log('F2:', f2.width, 'x', f2.height);
