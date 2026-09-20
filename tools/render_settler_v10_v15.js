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

// 7 New refined variations:
// Focus on:
// 1. Big simple eyes (comparing white sclera + pupil vs dark anime pupil + shine)
// 2. Tunic to mid-thigh (solid homespun skirt, rope belt with knot & tie)
// 3. Dark grey-brown trousers below tunic
// 4. Simple dark boots touching row 16 (y=15)
// 5. Arms at sides, hands visible
// 6. Centered horizontally, top 1 row empty, feet on bottom row

// V10: Eye with White sclera and Dark pupil (2x1 eyes on row 5, brow on row 4)
const v10 = [
    "................", // 0: empty
    ".....OOOOOO.....", // 1: hair top
    "....OHHHhhhOO...", // 2: hair dome
    "...OHHHhhhhhdO..", // 3: hair bangs
    "...OhddssddhdO..", // 4: brow line & temples
    "...OhWEssWEcO...", // 5: big simple eyes: W=sclera, E=pupil, skin nose bridge
    "....OsSssscO....", // 6: lower cheeks / chin
    "...OTTTStuuuO...", // 7: shoulders, V-neck collar with skin notch
    "...OTTTTtuuuO...", // 8: chest, arms at sides
    "...OSTTTtuucO...", // 9: hands at sides (S, c)
    "....OBBbBbbO....", // 10: brown rope belt with knot
    "...OTTTbtuuuO...", // 11: tunic skirt to mid-thigh, hanging rope tie
    "....OPp..pqO....", // 12: dark grey-brown trousers
    "....OPp..pqO....", // 13: trousers
    "....OLL..llO....", // 14: dark boots
    "...OOLL..llOO..."  // 15: boots touching row 16
];

// V11: Like d5 (proven great look) with clean trousers and boots
const v11 = [
    "................", // 0: empty
    ".....OOOOOO.....", // 1: hair top
    "....OHHHhhhOO...", // 2: hair dome
    "...OHHHhhhhhdO..", // 3: hair bangs
    "...OhdEEdEEddO..", // 4: dark brow & pupil top
    "...OhSEssEScO...", // 5: pupil & lower eye
    "....OsSssscO....", // 6: chin
    "...OTTTStuuuO...", // 7: shoulders, V-neck collar
    "...OTTTTtuuuO...", // 8: chest, arms
    "...OSTTTtuucO...", // 9: hands at sides
    "....OBBbBbbO....", // 10: rope belt with knot
    "...OTTTbtuuuO...", // 11: tunic skirt to mid-thigh
    "....OPp..pqO....", // 12: dark grey-brown trousers
    "....OPp..pqO....", // 13: trousers
    "....OLL..llO....", // 14: dark boots
    "...OOLL..llOO..."  // 15: boots touching row 16
];

// V12: White catchlight in the pupil (row 4: brow/pupil, row 5: pupil with white glint)
const v12 = [
    "................", // 0: empty
    ".....OOOOOO.....", // 1: hair top
    "....OHHHhhhOO...", // 2: hair dome
    "...OHHHhhhhhdO..", // 3: hair bangs
    "...OhdEEdEEddO..", // 4: brow & pupil top
    "...OhEWssEWcO...", // 5: pupil E with white catchlight W!
    "....OsSssscO....", // 6: chin
    "...OTTTStuuuO...", // 7: shoulders, V-neck collar
    "...OTTTTtuuuO...", // 8: chest, arms
    "...OSTTTtuucO...", // 9: hands at sides
    "....OBBbBbbO....", // 10: rope belt with knot
    "...OTTTbtuuuO...", // 11: tunic to mid-thigh
    "....OPp..pqO....", // 12: dark grey-brown trousers
    "....OPp..pqO....", // 13: trousers
    "....OLL..llO....", // 14: dark boots
    "...OOLL..llOO..."  // 15: boots touching row 16
];

// V13: Pupil with white catchlight on upper-left:
// Row 4: left eye (W E), right eye (W E)
// Row 5: left eye (E E), right eye (E E)
const v13 = [
    "................", // 0: empty
    ".....OOOOOO.....", // 1: hair top
    "....OHHHhhhOO...", // 2: hair dome
    "...OHHHhhhhhdO..", // 3: hair bangs
    "...OhWEddWEddO..", // 4: upper eye: W=sparkle, E=pupil
    "...OhEEssEEcO...", // 5: lower eye: EE=pupil
    "....OsSssscO....", // 6: chin
    "...OTTTStuuuO...", // 7: shoulders, V-neck collar
    "...OTTTTtuuuO...", // 8: chest, arms
    "...OSTTTtuucO...", // 9: hands at sides
    "....OBBbBbbO....", // 10: rope belt
    "...OTTTbtuuuO...", // 11: tunic skirt
    "....OPp..pqO....", // 12: trousers
    "....OPp..pqO....", // 13: trousers
    "....OLL..llO....", // 14: boots
    "...OOLL..llOO..."  // 15: boots touching row 16
];

// V14: 2x2 eyes (classic Shining Force style):
// Row 4: dEEddEEd (brow + pupil)
// Row 5: sWEssWEc (white sclera + pupil)
const v14 = [
    "................", // 0: empty
    ".....OOOOOO.....", // 1: hair top
    "....OHHHhhhOO...", // 2: hair dome
    "...OHHHhhhhhdO..", // 3: hair bangs
    "...OhdEEdEEddO..", // 4: brow + pupil
    "...OhsWEssWEcO..", // 5: white + pupil
    "....OsSssscO....", // 6: chin
    "...OTTTStuuuO...", // 7: shoulders, collar
    "...OTTTTtuuuO...", // 8: chest, arms
    "...OSTTTtuucO...", // 9: hands
    "....OBBbBbbO....", // 10: belt
    "...OTTTbtuuuO...", // 11: tunic to mid-thigh
    "....OPp..pqO....", // 12: trousers
    "....OPp..pqO....", // 13: trousers
    "....OLL..llO....", // 14: boots
    "...OOLL..llOO..."  // 15: boots touching row 16
];

// V15: Stance with slightly wider shoulders and clear homespun tunic folds
const v15 = [
    "................", // 0: empty
    ".....OOOOOO.....", // 1: hair top
    "....OHHHhhhOO...", // 2: hair dome
    "...OHHHhhhhhdO..", // 3: hair bangs
    "...OhdEEdEEddO..", // 4: brow + pupil
    "...OhSEssEScO...", // 5: eye + cheek
    "....OsSssscO....", // 6: chin
    "...OTTTStuuuO...", // 7: shoulders, collar
    "...OTTTTtuuuO...", // 8: chest, arms
    "...OSTTTtuucO...", // 9: hands at sides
    "....OBBbBbbO....", // 10: rope belt with knot
    "...OTTTbtuuuO...", // 11: tunic to mid-thigh
    "....OPp..pqO....", // 12: dark trousers
    "....OPp..pqO....", // 13: trousers
    "...OLLl..lLlO...", // 14: boots
    "...OOLL..llOO..."  // 15: boots touching row 16
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

const map = { v10, v11, v12, v13, v14, v15 };
for (const [k, v] of Object.entries(map)) {
    render(v, `settler_${k}`);
}
console.log('Rendered v10..v15');

