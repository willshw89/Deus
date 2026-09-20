const { decodePNG } = require('./png_read');
const fs = require('fs');
const img = decodePNG(fs.readFileSync('art/raw/human_male_pro_4d_walk.png'));

function isBg(r, g, b) {
    // Magenta background
    if (r > 165 && g < 85 && b > 165) return true;
    if (r > 80 && b > 70 && g < 65 && Math.abs(r - b) < 45) return true;
    // Black grid border line
    if (r < 25 && g < 25 && b < 25) return true;
    return false;
}
const rowBorders = [0, 258, 511, 767];
const colBorders = [0, 234, 470, 704, 938, 1172, 1408];

for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 6; c++) {
        // Leave 10px margin from cell borders to find the sprite body
        const minX = colBorders[c] + 8, maxX = colBorders[c+1] - 8;
        const minY = rowBorders[r] + 8, maxY = rowBorders[r+1] - 8;
        let bbMinX = Infinity, bbMaxX = -Infinity, bbMinY = Infinity, bbMaxY = -Infinity, count = 0;
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const idx = (y * img.width + x) * 4;
                const red = img.data[idx], grn = img.data[idx+1], blu = img.data[idx+2];
                if (!isBg(red, grn, blu)) {
                    if (x < bbMinX) bbMinX = x;
                    if (x > bbMaxX) bbMaxX = x;
                    if (y < bbMinY) bbMinY = y;
                    if (y > bbMaxY) bbMaxY = y;
                    count++;
                }
            }
        }
        if (count > 0) {
            console.log(`Cell [${r},${c}]: count=${count} w=${bbMaxX - bbMinX + 1} h=${bbMaxY - bbMinY + 1} sprite=[x:${bbMinX}..${bbMaxX}, y:${bbMinY}..${bbMaxY}] cell=[${colBorders[c]}..${colBorders[c+1]}, ${rowBorders[r]}..${rowBorders[r+1]}]`);
        } else {
            console.log(`Cell [${r},${c}]: empty`);
        }
    }
}

