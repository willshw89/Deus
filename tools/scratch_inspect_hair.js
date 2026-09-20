const fs = require('fs');
const { decodePNG } = require('./png_read');

const img = decodePNG(fs.readFileSync('art/raw/modular_hair_beards_nano_pro.png'));
console.log('Image dimensions:', img.width, 'x', img.height);
