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

// Common lower body (Stance B)
const lowerBody = [
    "....OsSssscO....", // 6: chin
    "...OTTTStuuuO...", // 7: shoulders & collar
    "...OTTTTtuuuO...", // 8: chest, arms
    "...OSTTTtuucO...", // 9: hands at sides
    "....OBBbBbbO....", // 10: brown rope belt with knot
    "...OTTTbtuuuO...", // 11: tunic to mid-thigh
    "....OPPppqqO....", // 12: trousers below tunic
    "....OPpq.pqO....", // 13: trousers with 1px gap
    "....OLL..llO....", // 14: dark boots
    "...OLLL..lllO..."  // 15: boots touching row 16
];

// Eye Var 1: Skin bridge on row 4 instead of dark bar:
// Row 4: W E S s W E (white catchlight, dark pupil, skin bridge)
// Row 5: E E S s E E (dark pupil lower, skin bridge)
const e1 = [
    "................", // 0
    ".....OOOOOO.....", // 1
    "....OHHHhhhOO...", // 2
    "...OHHHhhhhhdO..", // 3
    "...OhWESsWEdcO..", // 4: W=shine, E=pupil, S/s=skin bridge!
    "...OhEESsEEcO...", // 5: EE=pupil, S/s=skin bridge!
    ...lowerBody
];

// Eye Var 2: Sclera + Pupil forward-facing:
// Row 4: brow line (dd Ss dd)
// Row 5: Left eye (W E), Right eye (E W) -> pupils centered!
const e2 = [
    "................", // 0
    ".....OOOOOO.....", // 1
    "....OHHHhhhOO...", // 2
    "...OHHHhhhhhdO..", // 3
    "...OhddSsdddcO..", // 4: brow line, skin forehead S s
    "...OhWEssEWcO...", // 5: left eye W E (pupil at 6), right eye E W (pupil at 9)! Both pupils look straight forward!
    ...lowerBody
];

// Eye Var 3: Classic 2x2 anime eyes with white catchlight at top-left:
// Row 4: Left eye (W E), Right eye (W E)
// Row 5: Left eye (E E), Right eye (E E)
// With skin forehead/bangs on row 3:
const e3 = [
    "................", // 0
    ".....OOOOOO.....", // 1
    "....OHHHhhhOO...", // 2
    "...OHHHhhhhhdO..", // 3
    "...OhWESsWEscO..", // 4: W E (left eye), S s (bridge), W E (right eye), s c (shadow)
    "...OhEESsEEcO...", // 5: E E (left eye), S s (bridge), E E (right eye)
    ...lowerBody
];

// Eye Var 4: 1-pixel high, 2-pixel wide eyes with pupil and shine on row 4, cheeks on row 5:
// Row 4: W E s s W E
// Row 5: s S s s s c (cheeks, nose, mouth)
const e4 = [
    "................", // 0
    ".....OOOOOO.....", // 1
    "....OHHHhhhOO...", // 2
    "...OHHHhhhhhdO..", // 3
    "...OhWESsWEscO..", // 4: big eyes W E
    "...OhsSssssscO..", // 5: cheeks, nose tip, mouth
    ...lowerBody
];

// Eye Var 5: Big 2x1 vertical dark eyes with catchlight (FF5 Bartz / Cecil style):
// Row 4: E at 6, E at 9 (dark pupils with white sparkle W at 5 and 8)
// Row 5: E at 6, E at 9
const e5 = [
    "................", // 0
    ".....OOOOOO.....", // 1
    "....OHHHhhhOO...", // 2
    "...OHHHhhhhhdO..", // 3
    "...OhSEssESdcO..", // 4: pupil E at 6 and 9, skin S, s
    "...OhWEssEWcO...", // 5: white catchlight W at 5 and 10!
    ...lowerBody
];

// Eye Var 6: The perfected classic JRPG settler face:
// Row 3: Bangs fringe
// Row 4: Brow & eye top: W E at (5,6), bridge at (7,8), E W at (9,10)
// Row 5: Eye bottom & cheeks: E at 6, E at 9, cheeks around
const e6 = [
    "................", // 0
    ".....OOOOOO.....", // 1
    "....OHHHhhhOO...", // 2
    "...OHHHhhhhhdO..", // 3
    "...OhWESsEWdcO..", // 4: Left eye W E, nose bridge S s, Right eye E W
    "...OhsEssEsscO..", // 5: Left eye bottom E, nose s, Right eye bottom E
    ...lowerBody
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

const tests = { e1, e2, e3, e4, e5, e6 };
for (const [k, v] of Object.entries(tests)) {
    render(v, `eye_${k}`);
}
console.log('Eye variations rendered.');

