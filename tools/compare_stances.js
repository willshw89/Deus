const fs = require('fs');
const { writePNG } = require('./png_util');

const pal = {
    '.': [255,   0, 255], // 1: Background #FF00FF
    'O': [ 48,  28,  16], // 2: Silhouette outline (dark brown) #301C10
    'H': [152,  94,  44], // 3: Hair highlight #985E2C
    'h': [ 98,  58,  26], // 4: Hair midtone #623A1A
    'd': [ 60,  34,  14], // 5: Hair shadow #3C220E
    'S': [255, 226, 196], // 6: Skin highlight #FFE2C4
    's': [240, 192, 156], // 7: Skin midtone #F0C09C
    'c': [210, 148, 110], // 8: Skin shadow #D2946E
    'W': [255, 255, 255], // 9: Eye white #FFFFFF
    'E': [ 34,  26,  22], // 10: Eye pupil #221A16
    'T': [224, 206, 176], // 11: Tunic highlight #E0CEB0
    't': [192, 170, 136], // 12: Tunic midtone #C0AA88
    'u': [148, 122,  92], // 13: Tunic shadow #947A5C
    'B': [144,  94,  46], // 14: Belt highlight (brown rope) #905E2E
    'b': [ 96,  56,  22], // 15: Belt shadow #603816
    'P': [ 96,  86,  78], // 16: Trousers highlight #60564E
    'p': [ 70,  62,  56], // 17: Trousers midtone #463E38
    'q': [ 46,  40,  36], // 18: Trousers shadow #2E2824
    'L': [ 76,  54,  38], // 19: Boots highlight #4C3626
    'l': [ 36,  22,  14]  // 20: Boots shadow/sole #24160E
};

// Stance A: Legs separate with 2-pixel gap
const stanceA = [
    "................", // 0: empty
    ".....OOOOOO.....", // 1: hair top
    "....OHHHhhhOO...", // 2: hair dome
    "...OHHHhhhhhdO..", // 3: hair bangs
    "...OhWEddWEddO..", // 4: upper eyes (W=shine, E=pupil)
    "...OhEEssEEcO...", // 5: lower eyes (E=pupil), skin bridge (s)
    "....OsSssscO....", // 6: chin
    "...OTTTStuuuO...", // 7: tunic collar with skin notch (S)
    "...OTTTTtuuuO...", // 8: chest, arms at sides
    "...OSTTTtuucO...", // 9: hands at sides (S, c)
    "....OBBbBbbO....", // 10: brown rope belt with knot
    "...OTTTbtuuuO...", // 11: tunic skirt to mid-thigh, hanging rope tie (b)
    "....OPp..pqO....", // 12: dark grey-brown trousers
    "....OPp..pqO....", // 13: trousers
    "...OLLL..lllO...", // 14: boots upper
    "...OLLL..lllO..."  // 15: boots soles touching bottom row 16
];

// Stance B: Classic JRPG standing pose (legs together at trousers, separate boots at bottom row)
// FF6 / Shining Force style:
const stanceB = [
    "................", // 0: empty
    ".....OOOOOO.....", // 1: hair top
    "....OHHHhhhOO...", // 2: hair dome
    "...OHHHhhhhhdO..", // 3: hair bangs
    "...OhWEddWEddO..", // 4: upper eyes (W=shine, E=pupil)
    "...OhEEssEEcO...", // 5: lower eyes (E=pupil), skin bridge (s)
    "....OsSssscO....", // 6: chin
    "...OTTTStuuuO...", // 7: tunic collar with skin notch (S)
    "...OTTTTtuuuO...", // 8: chest, arms at sides
    "...OSTTTtuucO...", // 9: hands at sides (S, c)
    "....OBBbBbbO....", // 10: brown rope belt with knot
    "...OTTTbtuuuO...", // 11: tunic to mid-thigh
    "....OPPppqqO....", // 12: trousers solid across thighs (P=highlight, p=mid, q=shadow)
    "....OPpq.pqO....", // 13: trousers separating at shins (. = 1px gap)
    "....OLL..llO....", // 14: dark boots ankles
    "...OLLL..lllO..."  // 15: boots touching row 16
];

// Stance C: Stance B with 1-pixel gap between boots on row 14-15
const stanceC = [
    "................", // 0: empty
    ".....OOOOOO.....", // 1: hair top
    "....OHHHhhhOO...", // 2: hair dome
    "...OHHHhhhhhdO..", // 3: hair bangs
    "...OhWEddWEddO..", // 4: upper eyes
    "...OhEEssEEcO...", // 5: lower eyes
    "....OsSssscO....", // 6: chin
    "...OTTTStuuuO...", // 7: shoulders & collar
    "...OTTTTtuuuO...", // 8: chest, arms
    "...OSTTTtuucO...", // 9: hands at sides
    "....OBBbBbbO....", // 10: brown rope belt
    "...OTTTbtuuuO...", // 11: tunic to mid-thigh
    "....OPPppqqO....", // 12: trousers below tunic
    "...OPPp..pqqO...", // 13: trousers
    "...OLLl..lLlO...", // 14: boots
    "...OLLL..lllO..."  // 15: boots touching row 16
];

// Stance D: Slightly more upright arms, cleaner tunic drape
const stanceD = [
    "................", // 0: empty
    ".....OOOOOO.....", // 1: hair top
    "....OHHHhhhOO...", // 2: hair dome
    "...OHHHhhhhhdO..", // 3: hair bangs
    "...OhWEddWEddO..", // 4: upper eyes (W=shine, E=pupil)
    "...OhEEssEEcO...", // 5: lower eyes (E=pupil)
    "....OsSssscO....", // 6: chin
    "...OTTTStuuuO...", // 7: collar & shoulders
    "...OTTTTtuuuO...", // 8: chest & arms
    "...OSTTTtuucO...", // 9: hands & waist
    "....OBBbBbbO....", // 10: brown rope belt with knot
    "...OTTTbtuuuO...", // 11: tunic skirt to mid-thigh
    "....OPPpqqqO....", // 12: dark grey-brown trousers
    "....OPp..pqO....", // 13: trousers
    "....OLL..llO....", // 14: dark boots
    "...OLLL..lllO..."  // 15: boots touching row 16
];

function render(grid, name) {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const ch = grid[y][x];
            const c = pal[ch];
            if (!c) throw new Error(`Missing ${ch}`);
            const idx = (y * w + x) * 4;
            buf[idx] = c[0];
            buf[idx + 1] = c[1];
            buf[idx + 2] = c[2];
            buf[idx + 3] = 255;
        }
    }
    writePNG(`game/test_output/${name}_1x.png`, w, h, buf);

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
    writePNG(`game/test_output/${name}_16x.png`, w * scale, h * scale, zBuf);
}

render(stanceA, 'stance_A');
render(stanceB, 'stance_B');
render(stanceC, 'stance_C');
render(stanceD, 'stance_D');
console.log('Stances rendered.');

