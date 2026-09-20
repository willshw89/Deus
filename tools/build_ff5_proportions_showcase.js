const fs = require('fs');
const path = require('path');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');

// Ultima VII Daylight Palette exact colors:
const pal = {
    '.': [255,   0, 255,   0], // Transparent
    'M': [255,   0, 255, 255], // Magenta
    'O': [ 32,  20,   8, 255], // Dark outline
    'o': [ 61,  36,  12, 255], // Soft brown outline
    'H': [138,  93,  45, 255], // Hair highlight
    'h': [109,  61,  12, 255], // Hair midtone
    'd': [ 93,  53,  12, 255], // Hair shadow
    'S': [255, 223, 186, 255], // Skin highlight
    's': [227, 194, 178, 255], // Skin midtone
    'c': [198, 142, 117, 255], // Skin shadow
    'W': [255, 255, 255, 255], // Eye white
    'E': [ 32,  20,   8, 255], // Eye pupil
    'T': [235, 227, 215, 255], // Tunic highlight
    't': [202, 178, 146, 255], // Tunic midtone
    'u': [170, 134,  89, 255], // Tunic shadow
    'B': [186, 154, 113, 255], // Belt highlight
    'b': [ 97,  49,   0, 255], // Belt shadow
    'P': [ 85,  61,  49, 255], // Trousers highlight
    'p': [ 61,  45,  36, 255], // Trousers midtone
    'q': [ 40,  28,  20, 255], // Trousers shadow
    'L': [ 77,  45,  12, 255], // Boots leather
    'l': [ 45,  28,   8, 255], // Boots sole
    // Female green skirt / dress
    'G': [ 77, 125,  45, 255], // Green highlight
    'g': [ 45,  85,  24, 255], // Green midtone
    'k': [ 28,  53,  16, 255], // Green shadow
    // Dwarf Beard orange-red ramp
    'R': [215,  97,  24, 255], // Beard highlight
    'r': [170,  69,  12, 255], // Beard midtone
    'z': [125,  45,   8, 255], // Beard shadow
    // Dwarf Iron / Chainmail
    'I': [170, 178, 186, 255], // Iron highlight
    'i': [117, 125, 134, 255], // Iron midtone
    'j': [ 69,  73,  81, 255]  // Iron shadow
};

// ============================================================================
// HUMAN MALE (FF5 Proportions, 16x16 native, ~45px tall at 3x)
// ============================================================================

// South Stand
const hm_stand_s = [
    "................", // 0
    ".....OOOOOO.....", // 1: Hair top
    "...OOHHHHhhOO...", // 2: Hair crown
    "..OHHHhHHHhhhdO.", // 3: Bangs
    "..OhhOOsHHhOhhdO", // 4: Bangs parting & forehead
    "..OOdOsssshOdOO.", // 5: Brow
    ".OTTOOWssssWOOT.", // 6: Eyes (W=white, E=pupil)
    "..OOTTOssssOTTO.", // 7: Chin & open collar
    ".OTTTTTtttttuuuO", // 8: Tunic chest
    ".OSTTTTtttttuucO", // 9: Arms at sides, hands
    "..OBBBBBbbbbbbO.", // 10: Rope belt
    "..OTTTTTtttttuO.", // 11: Tunic hem
    "..OPPPqq..pqqqO.", // 12: Trousers
    "..OPPpqq..ppqqO.", // 13: Shins
    "..OLLlll..OLLlO.", // 14: Boots ankle
    ".OOLLlll..OLLlOO"  // 15: Boots grounded on bottom row 15
];

// South Step Left: Left foot strides forward, planted firmly; Right foot kicks back, lifted; torso dips
const hm_stepL_s = [
    "................", // 0
    ".....OOOOOO.....", // 1
    "...OOHHHHhhOO...", // 2
    "..OHHHhHHHhhhdO.", // 3
    "..OhhOOsHHhOhhdO", // 4
    "..OOdOsssshOdOO.", // 5
    ".OTTOOWssssWOOT.", // 6
    "..OOTTOssssOTTO.", // 7
    ".OTTTTTtttttuuuO", // 8
    "OSTTTTTtttttuuc.", // 9: Left hand back, right hand forward
    ".sOBBBBBbbbbbbO.", // 10: Belt
    "..OTTTTTtttttuOs", // 11: Right hand swung forward
    ".OPPPqq...pqqqO.", // 12: Left leg lunges forward/out
    ".OPPpqq...pqqOO.", // 13: Left shin forward, right thigh back
    "OLLllll...OLLl..", // 14: Left boot wide, right boot lifted off ground
    "OOLLlll........."  // 15: Left boot firmly planted on ground row 15!
];

// South Step Right: Right foot strides forward, planted firmly; Left foot kicks back, lifted
const hm_stepR_s = [
    "................", // 0
    ".....OOOOOO.....", // 1
    "...OOHHHHhhOO...", // 2
    "..OHHHhHHHhhhdO.", // 3
    "..OhhOOsHHhOhhdO", // 4
    "..OOdOsssshOdOO.", // 5
    ".OTTOOWssssWOOT.", // 6
    "..OOTTOssssOTTO.", // 7
    ".OTTTTTtttttuuuO", // 8
    ".cTTTTTtttttuuTO", // 9: Right arm back, left arm forward
    ".sOBBBBBbbbbbbOs", // 10: Left hand swung forward
    ".sOTTTTtttttuuO.", // 11: Belt / hem
    "..OPPPq...pqqqO.", // 12: Right leg lunges forward/out
    "..OOPpq...pqqpO.", // 13: Right shin forward, left thigh back
    "...OLLl...OLLllO", // 14: Left boot lifted off ground, right boot wide
    "..........OOLLll"  // 15: Right boot firmly planted on ground row 15!
];

// West Stand (Profile)
const hm_stand_w = [
    "................", // 0
    "....OOOOOO......", // 1: Hair top
    "..OOHHHHHhOO....", // 2: Crown
    ".OHHHhHHHHhhO...", // 3: Hair volume
    ".OhhhsshHHHhhO..", // 4: Temple & bangs
    ".OdsWshHHHHhhO..", // 5: Brow & eye
    ".OsssssHHHHhhO..", // 6: Nose & chin
    "..OssOTTTTHhhO..", // 7: Neck & tunic shoulder
    ".OTTTTTtttttuO..", // 8: Tunic chest & sleeve
    ".OTTTTTtsssscO..", // 9: Hand resting forward
    "..OBBBBBbbbbO...", // 10: Belt
    "..OTTTTttttquO..", // 11: Tunic hem
    "...OPPPqqqqO....", // 12: Trousers
    "...OPPpqqqqO....", // 13: Legs overlap
    "...OLLllllO.....", // 14: Boots
    "..OOLLllllOO...."  // 15: Both feet grounded
];

// West Step Forward: Front foot strides out 3px forward, planted on row 15! Rear foot pushes back
const hm_stepL_w = [
    "................", // 0
    "....OOOOOO......", // 1
    "..OOHHHHHhOO....", // 2
    ".OHHHhHHHHhhO...", // 3
    ".OhhhsshHHHhhO..", // 4
    ".OdsWshHHHHhhO..", // 5
    ".OsssssHHHHhhO..", // 6
    "..OssOTTTTHhhO..", // 7
    ".OTTTTTtttttuO..", // 8
    "OTTTTTTtsssscO..", // 9: Arm swings forward with stride
    ".OBBBBBbbbbO....", // 10
    ".OTTTTttttquO...", // 11
    "OPPPqq...pqqO...", // 12: Wide leg split
    "OPPpqq....qqO...", // 13: Stride forward
    "OLLlll....OLLO..", // 14: Front boot forward, rear boot heel up
    "OOLLlll........."  // 15: Front boot planted forward on row 15!
];

// West Step Pushback: Rear foot strides forward, front foot kicks back
const hm_stepR_w = [
    "................", // 0
    "....OOOOOO......", // 1
    "..OOHHHHHhOO....", // 2
    ".OHHHhHHHHhhO...", // 3
    ".OhhhsshHHHhhO..", // 4
    ".OdsWshHHHHhhO..", // 5
    ".OsssssHHHHhhO..", // 6
    "..OssOTTTTHhhO..", // 7
    ".OTTTTTtttttuO..", // 8
    ".OTTTTTtsssscO..", // 9: Arm swings back
    "..OBBBBBbbbbO...", // 10
    "..OTTTTttttquO..", // 11
    "...OPPqq..ppqqO.", // 12: Leg split opposite
    "...OPqq....pqqO.", // 13
    "...OLL.....OLLlO", // 14: Front boot raised, back boot down
    "..........OOLLlO"  // 15: Back boot planted on row 15!
];

// Helper to upscale grid to 48x48 (3x)
function gridTo48(grid) {
    const buf = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const ch = grid[y][x];
            const rgba = pal[ch] || [0, 0, 0, 0];
            for (let dy = 0; dy < 3; dy++) {
                for (let dx = 0; dx < 3; dx++) {
                    const idx = (((y * 3 + dy) * 48) + (x * 3 + dx)) * 4;
                    buf[idx] = rgba[0];
                    buf[idx + 1] = rgba[1];
                    buf[idx + 2] = rgba[2];
                    buf[idx + 3] = rgba[3];
                }
            }
        }
    }
    return buf;
}

// Build a showcase canvas with:
// Row 1: South Walk Cycle (Step L, Stand, Step R)
// Row 2: West Walk Cycle (Step L, Stand, Step R)
const showcase = Buffer.alloc(144 * 96 * 4);

function blit48(src, dst, dstX, dstY, dstW = 144) {
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sidx = (y * 48 + x) * 4;
            const didx = ((dstY + y) * dstW + (dstX + x)) * 4;
            if (src[sidx + 3] > 0) {
                dst[didx] = src[sidx];
                dst[didx + 1] = src[sidx + 1];
                dst[didx + 2] = src[sidx + 2];
                dst[didx + 3] = src[sidx + 3];
            }
        }
    }
}

const f_s_stepL = gridTo48(hm_stepL_s);
const f_s_stand = gridTo48(hm_stand_s);
const f_s_stepR = gridTo48(hm_stepR_s);

const f_w_stepL = gridTo48(hm_stepL_w);
const f_w_stand = gridTo48(hm_stand_w);
const f_w_stepR = gridTo48(hm_stepR_w);

blit48(f_s_stepL, showcase, 0, 0);
blit48(f_s_stand, showcase, 48, 0);
blit48(f_s_stepR, showcase, 96, 0);

blit48(f_w_stepL, showcase, 0, 48);
blit48(f_w_stand, showcase, 48, 48);
blit48(f_w_stepR, showcase, 96, 48);

// Output at 4x upscale for clear review (576x384)
const s4 = 4;
const out4x = Buffer.alloc(144 * s4 * 96 * s4 * 4);
for (let y = 0; y < 96; y++) {
    for (let x = 0; x < 144; x++) {
        const sidx = (y * 144 + x) * 4;
        for (let dy = 0; dy < s4; dy++) {
            for (let dx = 0; dx < s4; dx++) {
                const didx = (((y * s4 + dy) * 144 * s4) + (x * s4 + dx)) * 4;
                out4x[didx] = showcase[sidx];
                out4x[didx + 1] = showcase[sidx + 1];
                out4x[didx + 2] = showcase[sidx + 2];
                out4x[didx + 3] = showcase[sidx + 3];
            }
        }
    }
}

const outPath = path.join(ROOT, 'art', 'review', 'ff5_proportions_footsteps_preview_4x.png');
writePNG(outPath, 144 * s4, 96 * s4, out4x);
console.log('Saved FF5 footsteps showcase preview to:', outPath);
