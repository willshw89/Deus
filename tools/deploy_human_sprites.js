#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');

const srcMalePng = path.join(CHAR_DIR, '$UF_Human_Male.png');
const srcMaleJson = path.join(CHAR_DIR, '$UF_Human_Male.json');
const srcFemPng = path.join(CHAR_DIR, '$UF_Human_Female.png');
const srcFemJson = path.join(CHAR_DIR, '$UF_Human_Female.json');

const dstAdamPng = path.join(CHAR_DIR, '$Adam.png');
const dstAdamJson = path.join(CHAR_DIR, '$Adam.json');
const dstEvePng = path.join(CHAR_DIR, '$Eve.png');
const dstEveJson = path.join(CHAR_DIR, '$Eve.json');

fs.copyFileSync(srcMalePng, dstAdamPng);
fs.copyFileSync(srcMaleJson, dstAdamJson);
fs.copyFileSync(srcFemPng, dstEvePng);
fs.copyFileSync(srcFemJson, dstEveJson);

console.log('Successfully deployed FF6 settlers over $Adam and $Eve:');
console.log('  $UF_Human_Male.png -> $Adam.png');
console.log('  $UF_Human_Female.png -> $Eve.png');

