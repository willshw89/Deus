const fs = require('fs');
const { decodePNG } = require('./png_read');

const raw = decodePNG(fs.readFileSync('art/raw/u7_modular_portraits_nano_pro.png'));

// Check pixels around hair 2 (x: 512, y: 338, w: 228, h: 175)
const colors = {};
for (let y = 338; y < 338 + 175; y++) {
    for (let x = 512; x < 512 + 228; x++) {
        const idx = (y * 1024 + x) * 4;
        const r = raw.data[idx], g = raw.data[idx+1], b = raw.data[idx+2];
        const k = `${Math.floor(r/30)*30},${Math.floor(g/30)*30},${Math.floor(b/30)*30}`;
        colors[k] = (colors[k] || 0) + 1;
    }
}
console.log('Top color clusters in Hair 2:');
Object.entries(colors).sort((a,b) => b[1] - a[1]).slice(0, 10).forEach(([k, c]) => console.log(k, ':', c));

