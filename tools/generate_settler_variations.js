const fs = require('fs');
const path = require('path');
const { writePNG } = require('./png_util');

// Complete palette matching the prompt specifications:
// - Max 20 colors total
// - 16-bit SNES look
// - Upper-left light source
// - Selective dark brown outline on silhouette only
// - Flat 2-3 step shading per material
const pal = {
    '.': [255,   0, 255], // 1: Background flat magenta #FF00FF
    'O': [ 48,  28,  16], // 2: Dark brown selective silhouette outline #301C10
    'o': [ 74,  44,  26], // 3: Softer brown outline (lit upper-left silhouette) #4A2C1A
    'H': [146,  90,  40], // 4: Hair highlight (warm chestnut) #925A28
    'h': [ 92,  54,  22], // 5: Hair midtone (rich dark brown) #5C3616
    'd': [ 56,  32,  12], // 6: Hair shadow (deep dark brown) #38200C
    'S': [255, 226, 196], // 7: Skin highlight (light skin) #FFE2C4
    's': [240, 192, 156], // 8: Skin midtone #F0C09C
    'c': [208, 146, 108], // 9: Skin shadow / blush #D0926C
    'W': [255, 255, 255], // 10: Eye white (sclera) #FFFFFF
    'E': [ 34,  26,  22], // 11: Eye pupil (deep dark brown/black) #221A16
    'T': [222, 204, 174], // 12: Tunic highlight (pale-brown homespun linen) #DECCAE
    't': [190, 168, 134], // 13: Tunic midtone #BEA886
    'u': [148, 122,  92], // 14: Tunic shadow #947A5C
    'B': [142,  92,  44], // 15: Belt highlight (brown rope) #8E5C2C
    'b': [ 94,  54,  22], // 16: Belt shadow / rope tie #5E3616
    'P': [ 96,  86,  78], // 17: Trousers highlight (dark grey-brown) #60564E
    'p': [ 70,  62,  56], // 18: Trousers midtone #463E38
    'q': [ 46,  40,  36], // 19: Trousers shadow #2E2824
    'L': [ 76,  54,  38], // 20: Boots (simple dark leather boots) #4C3626
    'l': [ 36,  22,  14]  // Boots sole/shadow #24160E
};

// Let's ensure palette is <= 20 colors:
// If we merge 'o' into 'O', and 'L'/'l', let's count:
// '.' (1), 'O' (2), 'H' (3), 'h' (4), 'd' (5), 'S' (6), 's' (7), 'c' (8), 'W' (9), 'E' (10),
// 'T' (11), 't' (12), 'u' (13), 'B' (14), 'b' (15), 'P' (16), 'p' (17), 'q' (18), 'L' (19), 'l' (20)
// Exactly 20 colors!

// Let's create variations to explore the best eye styling, hair shaping, tunic draping, and stance.

// Variation A:
// 15 pixels tall (row 0 empty, rows 1..15 used).
// Eyes are 2x1 (white + dark pupil).
// Tunic has neck notch showing skin, arms clearly defined at sides, rope belt with tie, flared tunic hem.
const varA = [
    "................", // 0: empty
    "......OOOO......", // 1: hair crown outline
    "....OOHhhhOO....", // 2: hair dome
    "...OHHHhhhhhdO..", // 3: hair bangs & side locks
    "...OhSWEssEWcO..", // 4: eyes: W=sclera, E=pupil, S/s=skin nose bridge
    "....OsSssscO....", // 5: cheeks / mouth / chin
    "....OTSTtuuO....", // 6: tunic neckline (S=neck skin notch in center)
    "...OTTTTtuuuO...", // 7: shoulders / chest
    "...OSTTTtuucO...", // 8: arms / torso (S/c = skin hands at sides)
    "....OBBBbbbb....", // 9: rope belt at waist
    "...OTTTTtuuuO...", // 10: tunic mid-thigh skirt
    "...OTTTTtuuuO...", // 11: tunic hem
    "....OPp..pqO....", // 12: dark grey-brown trousers below tunic
    "....OPp..pqO....", // 13: trousers to boots
    "....OLL..llO....", // 14: dark boots
    "...OOLL..llOO..."  // 15: boot soles touching row 16 (y=15)
];

// Variation B:
// Big 2-pixel high expressive eyes (classic JRPG anime style):
// Row 4: eye top (E, E)
// Row 5: eye bottom (W, W) with cheek/mouth
const varB = [
    "................", // 0: empty
    ".....OOOOOO.....", // 1: hair crown
    "....OHHHhhhOO...", // 2: hair dome
    "...OHHHhhhhhdO..", // 3: hair bangs
    "...OhSEsssEScO..", // 4: upper eye (dark pupil E)
    "...OhSWsssWScO..", // 5: lower eye (spark/sclera W), nose/mouth
    "....OsSssscO....", // 6: chin / jaw
    "...OTTTStuuuO...", // 7: tunic collar with neck notch
    "...OTTTTtuuuO...", // 8: chest / arms
    "...OSTTTtuucO...", // 9: hands at sides (S, c)
    "....OBBBbbbb....", // 10: rope belt
    "...OTTTTtuuuO...", // 11: tunic to mid-thigh
    "....OPp..pqO....", // 12: trousers
    "....OPp..pqO....", // 13: trousers / ankles
    "....OLL..llO....", // 14: boots
    "...OOLL..llOO..."  // 15: feet on bottom row 16
];

// Variation C:
// 14 pixels tall (rows 0 and 1 empty, rows 2..15 used):
// Compact chibi proportions, 1/3 head (5 px), 1/3 torso (5 px), 1/3 legs (4 px)
const varC = [
    "................", // 0: empty
    "................", // 1: empty
    ".....OOOOOO.....", // 2: hair top outline
    "....OHHHhhhdO...", // 3: hair bangs
    "...OhSWEssEWcO..", // 4: big simple eyes (W=white, E=pupil)
    "....OsSssscO....", // 5: cheeks / jaw
    "...OTTTStuuuO...", // 6: neck notch / shoulders
    "...OTTTTtuuuO...", // 7: chest / upper arms
    "...OSTTTtuucO...", // 8: hands / torso
    "....OBBBbbbb....", // 9: rope belt
    "...OTTTTtuuuO...", // 10: tunic skirt
    "...OTTTTtuuuO...", // 11: tunic hem (mid-thigh)
    "....OPp..pqO....", // 12: dark trousers
    "....OPp..pqO....", // 13: trousers / boots top
    "....OLL..llO....", // 14: boots
    "...OOLL..llOO..."  // 15: boots touching row 16
];

// Variation D:
// Refined Variation A with belt knot tail, better arm separation, and classic FF6-style hair
const varD = [
    "................", // 0: empty
    ".....OOOOOO.....", // 1: hair crown
    "....OHHHhhhOO...", // 2: hair volume
    "...OHHHhhhhhdO..", // 3: side bangs
    "...OhSWEssEWcO..", // 4: eyes: W=white, E=pupil, S,s=skin
    "....OsSssscO....", // 5: lower face / cheeks
    "....OTTTtuuO....", // 6: shoulders / neckline
    "...OTTTTtuuuO...", // 7: upper body
    "...OSTTTtuucO...", // 8: arms with skin hands
    "....OBBbBbbO....", // 9: belt with hanging rope knot 'b'
    "....O..b..O.....", // 10: rope knot tail hanging onto tunic
    "...OTTTTtuuuO...", // 11: tunic hem at mid-thigh
    "....OPp..pqO....", // 12: dark grey-brown trousers
    "....OPp..pqO....", // 13: trousers
    "....OLL..llO....", // 14: dark boots
    "...OOLL..llOO..."  // 15: feet on bottom row 16
];

// Variation E:
// Refined Variation D without the hollow in row 10, keeping solid tunic under the rope tail:
const varE = [
    "................", // 0: empty
    ".....OOOOOO.....", // 1: hair crown
    "....OHHHhhhOO...", // 2: hair volume
    "...OHHHhhhhhdO..", // 3: bangs
    "...OhSWEssEWcO..", // 4: eyes: W=white, E=pupil
    "....OsSssscO....", // 5: face / cheeks
    "....OTSTtuuO....", // 6: neckline with throat notch
    "...OTTTTtuuuO...", // 7: chest / upper arms
    "...OSTTTtuucO...", // 8: arms at sides, hands
    "....OBBbBbbO....", // 9: brown rope belt with knot
    "...OTTTbtuuuO...", // 10: rope tie 'b' hanging over pale-brown tunic skirt
    "...OTTTTtuuuO...", // 11: tunic hem at mid-thigh
    "....OPp..pqO....", // 12: dark grey-brown trousers
    "....OPp..pqO....", // 13: trousers
    "....OLL..llO....", // 14: simple dark boots
    "...OOLL..llOO..."  // 15: boot soles touching bottom row 16
];

function generateImage(grid, out1x, out16x) {
    const w = 16, h = 16;
    const buf1x = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const ch = grid[y][x];
            const c = pal[ch];
            if (!c) throw new Error(`Missing char ${ch}`);
            const idx = (y * w + x) * 4;
            buf1x[idx] = c[0];
            buf1x[idx + 1] = c[1];
            buf1x[idx + 2] = c[2];
            buf1x[idx + 3] = 255;
        }
    }
    writePNG(out1x, w, h, buf1x);

    const scale = 16;
    const buf16x = Buffer.alloc(w * scale * h * scale * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const sIdx = (y * w + x) * 4;
            for (let dy = 0; dy < scale; dy++) {
                for (let dx = 0; dx < scale; dx++) {
                    const dIdx = (((y * scale + dy) * w * scale) + (x * scale + dx)) * 4;
                    buf16x[dIdx] = buf1x[sIdx];
                    buf16x[dIdx + 1] = buf1x[sIdx + 1];
                    buf16x[dIdx + 2] = buf1x[sIdx + 2];
                    buf16x[dIdx + 3] = buf1x[sIdx + 3];
                }
            }
        }
    }
    writePNG(out16x, w * scale, h * scale, buf16x);
}

const vars = { A: varA, B: varB, C: varC, D: varD, E: varE };
for (const [key, grid] of Object.entries(vars)) {
    generateImage(grid, `game/test_output/settler_var_${key}.png`, `game/test_output/settler_var_${key}_16x.png`);
}
console.log('All variations generated.');

