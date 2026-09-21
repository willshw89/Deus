'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const cDir = path.join(ROOT, 'game', 'img', 'characters');

fs.copyFileSync(path.join(cDir, '$UF_Human_Male_Walk.png'), path.join(cDir, '$Adam.png'));
fs.copyFileSync(path.join(cDir, '$UF_Human_Male_Walk.json'), path.join(cDir, '$Adam.json'));

fs.copyFileSync(path.join(cDir, '$UF_Human_Female_Walk.png'), path.join(cDir, '$Eve.png'));
fs.copyFileSync(path.join(cDir, '$UF_Human_Female_Walk.json'), path.join(cDir, '$Eve.json'));

console.log('Successfully updated Adam and Eve charsets');
