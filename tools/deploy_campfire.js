'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const srcPng = path.join(ROOT, 'art', 'staging', '!$UF_Campfire.png');
const srcJson = path.join(ROOT, 'art', 'staging', '!$UF_Campfire.json');

const dstPng = path.join(ROOT, 'game', 'img', 'characters', '!$UF_Campfire.png');
const dstJson = path.join(ROOT, 'game', 'img', 'characters', '!$UF_Campfire.json');

fs.copyFileSync(srcPng, dstPng);
fs.copyFileSync(srcJson, dstJson);

console.log('Successfully deployed:');
console.log(' ', dstPng);
console.log(' ', dstJson);
