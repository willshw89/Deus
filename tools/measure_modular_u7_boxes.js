const fs = require('fs');
const { decodePNG } = require('./png_read');

const img = decodePNG(fs.readFileSync('art/raw/u7_modular_portraits_nano_pro.png'));

function isMagenta(r, g, b) {
    return (r > 190 && g < 70 && b > 190);
}

function findBoxesInRow(yStart, yEnd, numCols) {
    const colWidth = Math.floor(img.width / numCols);
    const boxes = [];
    for (let c = 0; c < numCols; c++) {
        const xStart = c * colWidth;
        const xEnd = (c + 1) * colWidth;
        let minX = img.width, maxX = 0, minY = img.height, maxY = 0, count = 0;
        for (let y = yStart; y < yEnd; y++) {
            for (let x = xStart; x < xEnd; x++) {
                const idx = (y * img.width + x) * 4;
                const r = img.data[idx], g = img.data[idx + 1], b = img.data[idx + 2], a = img.data[idx + 3];
                if (a > 10 && !isMagenta(r, g, b)) {
                    count++;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (count > 0) {
            boxes.push({ col: c, minX, maxX, minY, maxY, w: maxX - minX + 1, h: maxY - minY + 1, count });
        } else {
            boxes.push(null);
        }
    }
    return boxes;
}

console.log('Row 0 (Framed Heads - 3 cols):', findBoxesInRow(0, 260, 3));
console.log('Row 1 (Hairstyles - 4 cols):', findBoxesInRow(260, 520, 4));
console.log('Row 2 (Beards / Features - 4 cols):', findBoxesInRow(520, 770, 4));
console.log('Row 3 (Clothing Busts - 4 cols):', findBoxesInRow(770, 1024, 4));
