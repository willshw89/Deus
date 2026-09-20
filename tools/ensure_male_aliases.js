'use strict';
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'game', 'img', 'characters');
const actions = ['Walk', 'Haul', 'Attack', 'Bow', 'Magic', 'Work', 'Downed'];
for (const act of actions) {
    const srcPng = path.join(dir, `$UF_Human_Male_${act}.png`);
    const srcJson = path.join(dir, `$UF_Human_Male_${act}.json`);
    const dstPng = path.join(dir, `$UF_Human_Male_1_${act}.png`);
    const dstJson = path.join(dir, `$UF_Human_Male_1_${act}.json`);
    if (fs.existsSync(srcPng) && !fs.existsSync(dstPng)) {
        fs.copyFileSync(srcPng, dstPng);
        console.log(`Created ${path.basename(dstPng)}`);
    }
    if (fs.existsSync(srcJson) && !fs.existsSync(dstJson)) {
        fs.copyFileSync(srcJson, dstJson);
        console.log(`Created ${path.basename(dstJson)}`);
    }
}
console.log('Aliases checked and synchronized.');
