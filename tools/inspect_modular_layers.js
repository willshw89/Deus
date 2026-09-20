'use strict';
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');

const rawMale = decodePNG(fs.readFileSync('art/raw/u7_modular_portraits_nano_pro.png'));
const rawFemale = decodePNG(fs.readFileSync('art/raw/u7_female_modular_portraits_nano_pro.png'));
const rawHair = decodePNG(fs.readFileSync('art/raw/modular_hair_beards_nano_pro.png'));

console.log('rawMale:', rawMale.width, 'x', rawMale.height);
console.log('rawFemale:', rawFemale.width, 'x', rawFemale.height);
console.log('rawHair:', rawHair.width, 'x', rawHair.height);
