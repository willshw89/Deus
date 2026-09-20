'use strict';
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');

function isMagenta(r, g, b) {
    if (r > 165 && g < 85 && b > 165) return true;
    if (r > 80 && b > 70 && g < 65 && Math.abs(r - b) < 45) return true;
    return false;
}

function checkGrid(file, cols, rows) {
    const rawImg = decodePNG(fs.readFileSync(path.join('art/raw', file)));
    const cellW = rawImg.width / cols;
    const cellH = rawImg.height / rows;
    console.log(`=== ${file} (${cols}x${rows}) cell: ${cellW.toFixed(1)}x${cellH.toFixed(1)} ===`);
    for (let r = 0; r < rows; r++) {
        let rowStr = `R${r}: `;
        for (let c = 0; c < cols; c++) {
            const x0 = Math.round(c * cellW);
            const x1 = Math.round((c + 1) * cellW) - 1;
            const y0 = Math.round(r * cellH);
            const y1 = Math.round((r + 1) * cellH) - 1;
            let count = 0, minY = y1, maxY = y0;
            for (let y = y0; y <= y1; y++) {
                for (let x = x0; x <= x1; x++) {
                    const idx = (y * rawImg.width + x) * 4;
                    if (!isMagenta(rawImg.data[idx], rawImg.data[idx+1], rawImg.data[idx+2])) {
                        count++;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }
            const h = count > 0 ? (maxY - minY + 1) : 0;
            rowStr += `[c${c}: cnt=${count} h=${h}] `;
        }
        console.log(rowStr);
    }
}

checkGrid('dwarf_female_walk_12_raw.png', 6, 3);
checkGrid('dwarf_female_haul_12_raw.png', 6, 3);
checkGrid('dwarf_female_attack_12_raw.png', 5, 4);
checkGrid('dwarf_female_attack_12_raw.png', 4, 4);
checkGrid('dwarf_female_attack_12_raw.png', 3, 4);
checkGrid('dwarf_female_bow_12_raw.png', 3, 4);
checkGrid('dwarf_female_magic_12_raw.png', 3, 4);
checkGrid('dwarf_female_work_12_raw.png', 6, 3);
checkGrid('dwarf_female_downed_12_raw.png', 6, 3);
