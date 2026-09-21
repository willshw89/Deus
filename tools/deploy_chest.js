const fs = require('fs');
const path = require('path');

const srcPng = path.join(__dirname, '..', 'art', 'staging', '!$UF_Chest_Wood.png');
const srcJson = path.join(__dirname, '..', 'art', 'staging', '!$UF_Chest_Wood.json');

const dstPng = path.join(__dirname, '..', 'game', 'img', 'characters', '!$UF_Chest_Wood.png');
const dstJson = path.join(__dirname, '..', 'game', 'img', 'characters', '!$UF_Chest_Wood.json');

fs.copyFileSync(srcPng, dstPng);
fs.copyFileSync(srcJson, dstJson);

console.log('Successfully deployed !$UF_Chest_Wood.png and .json to game/img/characters/');
