const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');

const pngPath = 'C:/Users/snewt/.gemini/antigravity/brain/3ffbd16e-0b90-4fbe-9345-ac504edad4c5/oak_tree_stand.png';
const decoded = decodePNG(fs.readFileSync(pngPath), 'oak_tree_stand.png');
console.log(`Dimensions: ${decoded.width}x${decoded.height}`);

let minX = decoded.width, maxX = 0, minY = decoded.height, maxY = 0;
for (let y = 0; y < decoded.height; y++) {
    for (let x = 0; x < decoded.width; x++) {
        const o = (y * decoded.width + x) * 4;
        const r = decoded.data[o];
        const g = decoded.data[o + 1];
        const b = decoded.data[o + 2];
        const isMagenta = (r > 170 && g < 80 && b > 170);
        if (!isMagenta) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    }
}

console.log(`Bounding box: (${minX}, ${minY}) to (${maxX}, ${maxY})`);
console.log(`Drawn size: ${maxX - minX + 1}w x ${maxY - minY + 1}h`);
