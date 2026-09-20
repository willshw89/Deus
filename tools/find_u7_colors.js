const fs = require('fs');
const hex = fs.readFileSync('art/palette/uf.hex', 'utf8').trim().split(/\r?\n/);
function hexToRgb(h) {
    return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
}

console.log('--- Skin-like tones in U7 palette ---');
for (let i = 0; i < 256; i++) {
    const [r, g, b] = hexToRgb(hex[i]);
    if (r > 160 && g > 110 && b > 80 && r >= g && g >= b) {
        console.log(`Idx ${i}: ${hex[i]} [r:${r}, g:${g}, b:${b}]`);
    }
}

console.log('\n--- Linen / Pale homespun tones in U7 palette ---');
for (let i = 0; i < 256; i++) {
    const [r, g, b] = hexToRgb(hex[i]);
    if (r > 140 && g > 120 && b > 90 && Math.abs(r - g) < 40 && Math.abs(g - b) < 40) {
        console.log(`Idx ${i}: ${hex[i]} [r:${r}, g:${g}, b:${b}]`);
    }
}

console.log('\n--- Dark brown / leather / hair tones in U7 palette ---');
for (let i = 0; i < 256; i++) {
    const [r, g, b] = hexToRgb(hex[i]);
    if (r < 120 && r > 30 && g < 90 && b < 60 && r > g && g > b) {
        console.log(`Idx ${i}: ${hex[i]} [r:${r}, g:${g}, b:${b}]`);
    }
}

