const fs = require('fs');
const path = require('path');

const wolfPath = path.join(__dirname, '../game/img/characters/$U7_Wolf.png');
const wolfJson = path.join(__dirname, '../game/img/characters/$U7_Wolf.json');
const harePath = path.join(__dirname, '../game/img/characters/$U7_Hare.png');
const hareJson = path.join(__dirname, '../game/img/characters/$U7_Hare.json');

console.log('Wolf exists:', fs.existsSync(wolfPath), fs.existsSync(wolfJson));
if (fs.existsSync(wolfJson)) console.log('Wolf json:', fs.readFileSync(wolfJson, 'utf8'));

console.log('Hare exists:', fs.existsSync(harePath), fs.existsSync(hareJson));
if (fs.existsSync(hareJson)) console.log('Hare json:', fs.readFileSync(hareJson, 'utf8'));

