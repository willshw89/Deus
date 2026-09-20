const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const sheet = decodePNG(fs.readFileSync('game/img/faces/UF_Faces_human_1.png'));
const outDir = path.join(__dirname, '..', 'scratch', 'u7_modular_test');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function getCell(col, row) {
    const dst = Buffer.alloc(144 * 144 * 4);
    for (let y = 0; y < 144; y++) {
        for (let x = 0; x < 144; x++) {
            const sx = col * 144 + x;
            const sy = row * 144 + y;
            const sIdx = (sy * 576 + sx) * 4;
            const dIdx = (y * 144 + x) * 4;
            dst[dIdx] = sheet.data[sIdx];
            dst[dIdx + 1] = sheet.data[sIdx + 1];
            dst[dIdx + 2] = sheet.data[sIdx + 2];
            dst[dIdx + 3] = sheet.data[sIdx + 3];
        }
    }
    return dst;
}

// 1. Extract the pure Stone Arch Frame
// In Cell (0,0) and Cell (1,0), any pixel where x < 18 or x > 125 or y < 18 or y > 132 is the frame!
const c0 = getCell(0, 0);
const c1 = getCell(1, 0);
const c2 = getCell(2, 0);
const c3 = getCell(3, 0);

writePNG(path.join(outDir, 'cell_0_forester.png'), 144, 144, c0);
writePNG(path.join(outDir, 'cell_1_soldier.png'), 144, 144, c1);
writePNG(path.join(outDir, 'cell_2_wizard.png'), 144, 144, c2);
writePNG(path.join(outDir, 'cell_3_rogue.png'), 144, 144, c3);

// Extract clothing from lower region (y: 80 to 144)
function extractClothing(cell) {
    const dst = Buffer.alloc(144 * 144 * 4);
    for (let y = 78; y < 136; y++) {
        for (let x = 16; x < 128; x++) {
            const idx = (y * 144 + x) * 4;
            // Check if not pure dark background (#0b0f19 or similar)
            const r = cell[idx], g = cell[idx + 1], b = cell[idx + 2], a = cell[idx + 3];
            if (a > 0 && !(r < 18 && g < 22 && b < 32)) {
                // Keep clothing pixels
                dst[idx] = r;
                dst[idx + 1] = g;
                dst[idx + 2] = b;
                dst[idx + 3] = a;
            }
        }
    }
    return dst;
}

const clothForester = extractClothing(c0);
const clothKnight = extractClothing(c1);
const clothRogue = extractClothing(c3);

writePNG(path.join(outDir, 'cloth_forester.png'), 144, 144, clothForester);
writePNG(path.join(outDir, 'cloth_knight.png'), 144, 144, clothKnight);
writePNG(path.join(outDir, 'cloth_rogue.png'), 144, 144, clothRogue);

console.log('Extracted cells and clothing successfully into scratch/u7_modular_test');
