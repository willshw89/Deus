const fs = require('fs');
const { writePNG } = require('./png_util');

const pal = {
    '.': [255,   0, 255], // Magenta #FF00FF
    'O': [ 48,  28,  16], // Dark brown silhouette outline #301C10
    'H': [148,  92,  42], // Hair highlight (chestnut) #945C2A
    'h': [ 96,  56,  24], // Hair midtone #603818
    'd': [ 60,  34,  14], // Hair shadow #3C220E
    'S': [255, 226, 196], // Skin highlight #FFE2C4
    's': [240, 192, 156], // Skin midtone #F0C09C
    'c': [210, 148, 110], // Skin shadow #D2946E
    'W': [255, 255, 255], // Eye white #FFFFFF
    'E': [ 34,  26,  22], // Eye pupil #221A16
    'T': [222, 204, 174], // Tunic highlight (pale-brown homespun) #DECCAE
    't': [190, 168, 134], // Tunic midtone #BEA886
    'u': [148, 122,  92], // Tunic shadow #947A5C
    'B': [142,  92,  44], // Belt highlight (brown rope) #8E5C2C
    'b': [ 94,  54,  22], // Belt shadow #5E3616
    'P': [ 96,  86,  78], // Trousers highlight (dark grey-brown) #60564E
    'p': [ 70,  62,  56], // Trousers midtone #463E38
    'q': [ 46,  40,  36], // Trousers shadow #2E2824
    'L': [ 76,  54,  38], // Boots highlight #4C3626
    'l': [ 36,  22,  14]  // Boots shadow/sole #24160E
};

// Design 1: Upper-left catchlight eyes (W E on both eyes), 15px tall
const d1 = [
    "................", // 0
    ".....OOOOOO.....", // 1: hair top
    "....OHHHhhhOO...", // 2: hair dome
    "...OHHHhhhhhdO..", // 3: hair bangs
    "...OhSWEssWEcO..", // 4: eyes: W=shine, E=pupil, S,s=nose bridge
    "....OsSssscO....", // 5: cheeks / mouth / chin
    "....OTSTtuuO....", // 6: collar with skin notch S
    "...OTTTTtuuuO...", // 7: shoulders / chest
    "...OSTTTtuucO...", // 8: arms at sides, hands S, c
    "....OBBbBbbO....", // 9: rope belt with knot B, b
    "...OTTTbtuuuO...", // 10: tunic skirt with hanging rope tie b
    "...OTTTTtuuuO...", // 11: tunic hem (mid-thigh)
    "....OPp..pqO....", // 12: dark grey-brown trousers
    "....OPp..pqO....", // 13: trousers
    "....OLL..llO....", // 14: dark boots
    "...OOLL..llOO..."  // 15: boots touching row 16
];

// Design 2: 2-pixel wide eyes (W E), but with chin line at row 6, torso rows 7-11
const d2 = [
    "................", // 0
    ".....OOOOOO.....", // 1: hair top
    "....OHHHhhhOO...", // 2: hair dome
    "...OHHHhhhhhdO..", // 3: hair bangs
    "...OhSWEssWEcO..", // 4: eyes: W=shine, E=pupil
    "...OhsSssssscO..", // 5: cheeks / lower face
    "....OsSssscO....", // 6: chin / jaw
    "...OTTTStuuuO...", // 7: shoulders / tunic neckline (S = skin)
    "...OTTTTtuuuO...", // 8: chest / arms
    "...OSTTTtuucO...", // 9: hands at sides / tunic waist
    "....OBBbBbbO....", // 10: brown rope belt with knot
    "...OTTTbtuuuO...", // 11: tunic skirt to mid-thigh
    "....OPp..pqO....", // 12: dark grey-brown trousers
    "....OPp..pqO....", // 13: trousers
    "....OLL..llO....", // 14: dark boots
    "...OOLL..llOO..."  // 15: boots touching row 16
];

// Design 3: Big simple vertical eyes (Row 4: pupil E, Row 5: sclera W / eye bottom)
// Like Shining Force / Grandia chibi sprites
const d3 = [
    "................", // 0
    ".....OOOOOO.....", // 1: hair top
    "....OHHHhhhOO...", // 2: hair dome
    "...OHHHhhhhhdO..", // 3: hair bangs
    "...OhSEsssEScO..", // 4: upper eye (dark pupil E)
    "...OhSWsssWScO..", // 5: lower eye (sclera/sparkle W), nose/mouth
    "....OsSssscO....", // 6: chin
    "...OTTTStuuuO...", // 7: shoulders / tunic neckline
    "...OTTTTtuuuO...", // 8: chest / arms
    "...OSTTTtuucO...", // 9: hands at sides
    "....OBBbBbbO....", // 10: rope belt with knot
    "...OTTTbtuuuO...", // 11: tunic skirt to mid-thigh
    "....OPp..pqO....", // 12: trousers
    "....OPp..pqO....", // 13: trousers
    "....OLL..llO....", // 14: dark boots
    "...OOLL..llOO..."  // 15: boots touching row 16
];

// Design 4: 14 pixels tall (Rows 0 and 1 empty, rows 2..15 used)
// Head 5 rows (2..6), torso 5 rows (7..11), legs 4 rows (12..15)
const d4 = [
    "................", // 0: empty
    "................", // 1: empty
    ".....OOOOOO.....", // 2: hair crown
    "....OHHHhhhOO...", // 3: hair bangs
    "...OhSWEssWEcO..", // 4: eyes
    "...OhsSssssscO..", // 5: face / cheeks
    "....OsSssscO....", // 6: chin
    "...OTTTStuuuO...", // 7: tunic shoulders / neck notch
    "...OTTTTtuuuO...", // 8: chest / arms
    "...OSTTTtuucO...", // 9: hands at sides
    "....OBBbBbbO....", // 10: brown rope belt with knot
    "...OTTTbtuuuO...", // 11: tunic skirt to mid-thigh
    "....OPp..pqO....", // 12: dark trousers
    "....OPp..pqO....", // 13: trousers
    "....OLL..llO....", // 14: simple dark boots
    "...OOLL..llOO..."  // 15: boots touching row 16
];

// Design 5: Eyes as classic 16-bit 2x2 eyes with pupil + catchlight:
// Row 4: E W .. W E (or E E .. E E)
// Row 5: W E .. W E (or S E .. E s)
// Let's test classic FF6 town sprite eyes:
// In FF6, NPC eyes are 2 pixels wide:
// Eye is (E, E) with dark brow above and cheek below, or (W, E)
const d5 = [
    "................", // 0
    ".....OOOOOO.....", // 1: hair top
    "....OHHHhhhOO...", // 2: hair dome
    "...OHHHhhhhhdO..", // 3: hair bangs
    "...OhdEEdEEddO..", // 4: dark brow & pupil top
    "...OhSEssEScO...", // 5: eye pupil / sparkle & nose
    "....OsSssscO....", // 6: chin
    "...OTTTStuuuO...", // 7: shoulders / tunic
    "...OTTTTtuuuO...", // 8: chest / arms
    "...OSTTTtuucO...", // 9: hands at sides
    "....OBBbBbbO....", // 10: rope belt with knot
    "...OTTTbtuuuO...", // 11: tunic to mid-thigh
    "....OPp..pqO....", // 12: dark grey-brown trousers
    "....OPp..pqO....", // 13: trousers
    "....OLL..llO....", // 14: dark boots
    "...OOLL..llOO..."  // 15: boots touching row 16
];

// Design 6: Stance with legs slightly apart, refined arms and homespun tunic texture
const d6 = [
    "................", // 0: empty
    ".....OOOOOO.....", // 1: crown of hair
    "....OHHHhhhOO...", // 2: rounded hair volume
    "...OHHHhhhhhdO..", // 3: bangs and sideburns
    "...OhSWEssWEcO..", // 4: big simple eyes (W=shine, E=pupil)
    "...OhsSssssscO..", // 5: cheeks, nose bridge, mouth
    "....OsSssscO....", // 6: chin
    "...OTTTStuuuO...", // 7: tunic shoulders, neck notch
    "...OTTTTtuuuO...", // 8: chest, arms at sides
    "...OSTTTtuucO...", // 9: skin hands at sides, tunic waist
    "....OBBbBbbO....", // 10: brown rope belt with hanging knot
    "...OTTTbtuuuO...", // 11: undyed homespun tunic to mid-thigh
    "....OPp..pqO....", // 12: dark grey-brown trousers
    "....OPp..pqO....", // 13: trousers
    "...OLLL..llLO...", // 14: sturdy dark leather boots
    "...OOLL..llOO..."  // 15: boots soles touching bottom row 16
];

function render(grid, prefix) {
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
    writePNG(`game/test_output/${prefix}_1x.png`, w, h, buf);

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
    writePNG(`game/test_output/${prefix}_16x.png`, w * scale, h * scale, zBuf);
}

const designs = { d1, d2, d3, d4, d5, d6 };
for (const [name, grid] of Object.entries(designs)) {
    render(grid, `settler_${name}`);
}
console.log('Generated d1..d6');

