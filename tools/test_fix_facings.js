'use strict';
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');

function checkFrameDir(frame, w = 48, h = 48) {
    let leftSkin = 0, rightSkin = 0;
    let leftAlpha = 0, rightAlpha = 0;
    for (let py = 10; py < 30; py++) {
        for (let px = 0; px < 24; px++) {
            const idx = (py * w + px) * 4;
            if (frame[idx + 3] > 50) {
                leftAlpha++;
                const r = frame[idx], g = frame[idx + 1], b = frame[idx + 2];
                if (r > 130 && g > 80 && b > 50) leftSkin++;
            }
        }
        for (let px = 24; px < 48; px++) {
            const idx = (py * w + px) * 4;
            if (frame[idx + 3] > 50) {
                rightAlpha++;
                const r = frame[idx], g = frame[idx + 1], b = frame[idx + 2];
                if (r > 130 && g > 80 && b > 50) rightSkin++;
            }
        }
    }
    const skinDiff = leftSkin - rightSkin;
    const alphaDiff = leftAlpha - rightAlpha;
    const facing = (skinDiff > 5) ? 'LEFT' : (skinDiff < -5) ? 'RIGHT' : (alphaDiff > 0) ? 'LEFT' : 'RIGHT';
    return { skinDiff, alphaDiff, facing };
}

function extractCell(img, col, row) {
    const buf = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = ((row * 48 + y) * img.width + (col * 48 + x)) * 4;
            const dIdx = (y * 48 + x) * 4;
            buf[dIdx] = img.data[sIdx];
            buf[dIdx+1] = img.data[sIdx+1];
            buf[dIdx+2] = img.data[sIdx+2];
            buf[dIdx+3] = img.data[sIdx+3];
        }
    }
    return buf;
}

const img5 = decodePNG(fs.readFileSync(path.join(__dirname, '..', 'game', 'img', 'characters', '$UF_Human_Male_5.png')));
for (let c = 0; c < 3; c++) {
    console.log('Male 5 Row 1 Col', c, ':', checkFrameDir(extractCell(img5, c, 1)));
    console.log('Male 5 Row 2 Col', c, ':', checkFrameDir(extractCell(img5, c, 2)));
}

function mirrorCell(cell) {
    const dst = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + (47 - x)) * 4;
            const dIdx = (y * 48 + x) * 4;
            dst[dIdx]   = cell[sIdx];
            dst[dIdx+1] = cell[sIdx+1];
            dst[dIdx+2] = cell[sIdx+2];
            dst[dIdx+3] = cell[sIdx+3];
        }
    }
    return dst;
}

function fixSheetSideFacings(imgData, width, height) {
    // imgData is RGBA buffer
    const out = Buffer.from(imgData);
    // For each col in Row 1 (West):
    for (let c = 0; c < 3; c++) {
        let cell = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = ((1 * 48 + y) * width + (c * 48 + x)) * 4;
                const dIdx = (y * 48 + x) * 4;
                cell[dIdx] = out[sIdx]; cell[dIdx+1] = out[sIdx+1]; cell[dIdx+2] = out[sIdx+2]; cell[dIdx+3] = out[sIdx+3];
            }
        }
        const facing = checkFrameDir(cell).facing;
        if (facing === 'RIGHT') {
            cell = mirrorCell(cell);
        }
        // Write fixed cell to Row 1 (West)
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const dIdx = ((1 * 48 + y) * width + (c * 48 + x)) * 4;
                const sIdx = (y * 48 + x) * 4;
                out[dIdx] = cell[sIdx]; out[dIdx+1] = cell[sIdx+1]; out[dIdx+2] = cell[sIdx+2]; out[dIdx+3] = cell[sIdx+3];
            }
        }
        // Mirror cell to Row 2 (East)
        const eastCell = mirrorCell(cell);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const dIdx = ((2 * 48 + y) * width + (c * 48 + x)) * 4;
                const sIdx = (y * 48 + x) * 4;
                out[dIdx] = eastCell[sIdx]; out[dIdx+1] = eastCell[sIdx+1]; out[dIdx+2] = eastCell[sIdx+2]; out[dIdx+3] = eastCell[sIdx+3];
            }
        }
    }
    return out;
}

testFiles.forEach(file => {
    const p = path.join(__dirname, '..', 'game', 'img', 'characters', file);
    if (!fs.existsSync(p)) return;
    const img = decodePNG(fs.readFileSync(p));
    const fixedData = fixSheetSideFacings(img.data, img.width, img.height);
    const fixedImg = { width: img.width, height: img.height, data: fixedData };
    const r1 = [0, 1, 2].map(c => checkFrameDir(extractCell(fixedImg, c, 1)).facing).join(' ');
    const r2 = [0, 1, 2].map(c => checkFrameDir(extractCell(fixedImg, c, 2)).facing).join(' ');
    console.log('FIXED', file.padEnd(30), '| R1:', r1, '| R2:', r2);
});
