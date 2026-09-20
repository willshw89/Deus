const fs = require('fs');
const path = require('path');
const { writePNG } = require('./png_util');

const palette = {
    '.': [255, 0, 255],     // Background magenta
    'O': [46, 26, 14],      // Silhouette outline (dark brown)
    'H': [142, 88, 36],     // Hair highlight
    'h': [88, 52, 20],      // Hair mid
    'd': [58, 32, 12],      // Hair shadow
    'S': [255, 226, 196],   // Skin highlight
    's': [242, 194, 158],   // Skin mid
    'c': [214, 152, 114],   // Skin shadow
    'W': [255, 255, 255],   // Eye white
    'E': [34, 28, 24],      // Eye pupil
    'T': [220, 202, 172],   // Tunic highlight (pale brown homespun)
    't': [190, 168, 134],   // Tunic mid
    'u': [150, 124, 94],    // Tunic shadow
    'B': [144, 94, 46],     // Belt highlight
    'b': [96, 56, 22],      // Belt shadow
    'P': [92, 82, 74],      // Trousers highlight (dark grey-brown)
    'p': [68, 60, 54],      // Trousers mid
    'q': [46, 40, 36],      // Trousers shadow
    'L': [76, 56, 40],      // Boots highlight (dark leather)
    'l': [38, 24, 14]       // Boots shadow/sole
};

// Design 1: 15-pixel tall (Row 0 empty, rows 1..15 used)
// Head: rows 1..5 (5 pixels)
// Neck/Torso: rows 6..11 (6 pixels)
// Legs/Boots: rows 12..15 (4 pixels)
const grid1 = [
    "................", // 0: empty
    "......OOOO......", // 1: top hair outline
    "....OOHhhhOO....", // 2: hair dome (highlight on left, shadow on right)
    "...OHHHhhhhdO...", // 3: hair & bangs
    "...OhSSEssEcO...", // 4: eyes! (big simple eyes with sclera/pupil, skin)
    "....OsSssssc....", // 5: cheeks, nose, mouth
    "....OTTTtuuO....", // 6: neck / tunic collar & shoulders
    "...OTTTTtuuuO...", // 7: upper tunic / arms at sides
    "...OSTTTtuucO...", // 8: tunic chest / hands at sides (skin hands S, c)
    "....OBBbbbbO....", // 9: rope belt with knot
    "....OTTTtuuO....", // 10: tunic skirt flared
    "...OTTTTtuuuO...", // 11: tunic hem at mid-thigh
    "....OPP..qqO....", // 12: dark grey-brown trousers below tunic
    "....OPP..qqO....", // 13: trousers / boot top
    "....OLL..llO....", // 14: dark boots
    "...OOLL..llOO..."  // 15: boot soles (touching bottom row 16)
];

// Design 2: Refined classic SNES proportions (FF5/FF6 / Shining Force)
// Big expressive eyes, clear readable silhouette, chibi proportions
const grid2 = [
    "................", // 0: empty
    ".....OOOOOO.....", // 1: crown of hair outline
    "....OHHHhhhdO...", // 2: rounded hair volume
    "...OHHHhhhhhdO..", // 3: hair bangs / temple
    "...OhSWE..WEcO..", // 4: big eyes! (Sclera W, pupil E, skin bridge S)
    "...OhSss..sscO..", // 5: lower face / cheeks
    "....OsSssssc....", // 6: chin / jaw
    "...OTTTTtuuuO...", // 7: shoulders / tunic neckline
    "...OTTTTtuuuO...", // 8: arms / chest
    "...OSTTTtuucO...", // 9: hands at sides / tunic waist
    "....OBBBbbbb....", // 10: brown rope belt
    "...OTTTTTuuuO...", // 11: tunic skirt to mid-thigh
    "....OPp..pqO....", // 12: trousers below tunic
    "....OLL..llO....", // 13: boots ankle
    "....OLL..llO....", // 14: boots foot
    "...OOLL..llOO..."  // 15: boots touching row 16
];

// Design 3: 14-pixel tall (Rows 0 and 1 empty, rows 2..15 used)
// Head 5 rows (2..6), torso/tunic 5 rows (7..11), legs/boots 4 rows (12..15)
const grid3 = [
    "................", // 0: empty
    "................", // 1: empty
    ".....OOOOOO.....", // 2: top hair
    "....OHHHhhhdO...", // 3: hair bangs
    "...OhSWEssWEcO..", // 4: big simple eyes (W=sclera, E=pupil)
    "....OsSssscO....", // 5: face / cheeks
    "....OTTTtuuO....", // 6: neck & tunic collar
    "...OTTTTtuuuO...", // 7: chest / upper arms
    "...OSTTTtuucO...", // 8: hands / tunic body
    "....OBBBbbbb....", // 9: rope belt
    "...OTTTTtuuuO...", // 10: tunic skirt mid-thigh
    "....OPP..qqO....", // 11: trousers
    "....OPP..qqO....", // 12: trousers to knee/calf
    "....OLL..llO....", // 13: dark boots upper
    "....OLL..llO....", // 14: boots ankle
    "...OOLL..llOO..."  // 15: boots sole touching row 16
];

function renderGrid(grid, filename) {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const ch = grid[y][x];
            const c = palette[ch];
            if (!c) throw new Error(`Unknown char '${ch}' at (${x}, ${y})`);
            const idx = (y * w + x) * 4;
            buf[idx] = c[0];
            buf[idx + 1] = c[1];
            buf[idx + 2] = c[2];
            buf[idx + 3] = 255;
        }
    }
    writePNG(filename, w, h, buf);

    // Also 16x zoom
    const scale = 16;
    const zBuf = Buffer.alloc(w * scale * h * scale * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const sIdx = (y * w + x) * 4;
            for (let dy = 0; dy < scale; dy++) {
                for (let dx = 0; dx < scale; dx++) {
                    const dIdx = (((y * scale + dy) * w * scale) + (x * scale + dx)) * 4;
                    zBuf[dIdx] = buf[sIdx];
                    zBuf[dIdx + 1] = buf[sIdx + 1];
                    zBuf[dIdx + 2] = buf[sIdx + 2];
                    zBuf[dIdx + 3] = buf[sIdx + 3];
                }
            }
        }
    }
    writePNG(filename.replace('.png', '_16x.png'), w * scale, h * scale, zBuf);
}

renderGrid(grid1, 'game/test_output/settler_cand1.png');
renderGrid(grid2, 'game/test_output/settler_cand2.png');
renderGrid(grid3, 'game/test_output/settler_cand3.png');
console.log('Candidate grids rendered.');

