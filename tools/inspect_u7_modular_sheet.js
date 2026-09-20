const fs = require('fs');
const path = require('path');

// Convert the jpg to png or inspect with our tools
const genJpg = 'C:/Users/snewt/.gemini/antigravity/brain/e6a9a54f-2cc6-432e-b7ec-5affda42dd85/u7_modular_portraits_nano_pro_1789916859983.jpg';
console.log('Source exists:', fs.existsSync(genJpg), 'size:', fs.statSync(genJpg).size);

// Copy raw to art/raw
const rawDir = path.join(__dirname, '..', 'art', 'raw');
if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });
fs.copyFileSync(genJpg, path.join(rawDir, 'u7_modular_portraits_nano_pro.jpg'));
console.log('Copied raw to art/raw/u7_modular_portraits_nano_pro.jpg');
