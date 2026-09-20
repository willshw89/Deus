const fs = require('fs');
const path = require('path');
const { writePNG } = require('./png_util');

// U7 Daylight Palette (Record 0) exact colors from uf.hex:
const U7 = {
    bg:      [255,   0, 255], // Magenta #FF00FF
    outline: [ 32,  20,   8], // Idx 147: #201408 (deep dark brown silhouette)
    
    // Hair (warm dark brown)
    hairHi:  [109,  61,  12], // Idx 142: #6D3D0C
    hairMid: [ 93,  53,  12], // Idx 143: #5D350C
    hairSh:  [ 61,  36,  12], // Idx 145: #3D240C
    
    // Light Skin (peach / cream / tanned)
    skinHi:  [255, 223, 186], // Idx 32: #FFDFBA
    skinMid: [227, 194, 178], // Idx 105: #E3C2B2
    skinSh:  [198, 142, 117], // Idx 109: #C68E75
    skinDark:[174, 125, 101], // Idx 110: #AE7D65
    
    // Eyes
    eyeWhite:[255, 255, 255], // Idx 15: #FFFFFF
    eyeDark: [ 53,  24,   0], // Idx 45: #351800
    
    // Undyed Homespun Tunic (natural unbleached linen / pale oatmeal wool)
    tunicHi: [235, 227, 215], // Idx 134: #EBE3D7
    tunicMid:[202, 178, 146], // Idx 136: #CAB292
    tunicSh: [170, 134,  89], // Idx 138: #AA8659
    
    // Brown Rope Belt
    beltHi:  [186, 154, 113], // Idx 137: #BA9A71
    beltSh:  [ 97,  49,   0], // Idx 12: #613100
    
    // Dark Grey-Brown Trousers
    trouserHi:[ 85,  61,  49], // Idx 114: #553D31
    trouserMid:[ 61,  45,  36], // Idx 115: #3D2D24
    trouserSh:[ 40,  28,  20], // Idx 116: #281C14
    
    // Simple Dark Leather Boots
    bootHi:  [ 77,  45,  12], // Idx 144: #4D2D0C
    bootSh:  [ 45,  28,   8]  // Idx 146: #2D1C08
};

// Map chars to colors
const palMap = {
    '.': U7.bg,
    'O': U7.outline,
    'H': U7.hairHi,
    'h': U7.hairMid,
    'd': U7.hairSh,
    'S': U7.skinHi,
    's': U7.skinMid,
    'c': U7.skinSh,
    'k': U7.skinDark,
    'W': U7.eyeWhite,
    'E': U7.eyeDark,
    'T': U7.tunicHi,
    't': U7.tunicMid,
    'u': U7.tunicSh,
    'B': U7.beltHi,
    'b': U7.beltSh,
    'P': U7.trouserHi,
    'p': U7.trouserMid,
    'q': U7.trouserSh,
    'L': U7.bootHi,
    'l': U7.bootSh
};

// ----------------------------------------------------------------------------
// Model 1: Realistic 16x16 Adult Male Settler (NO CHIBI, 1:5 adult ratio)
// Total 15 pixels tall:
// Head: rows 1..3 (3 pixels high! Realistic proportion)
// Neck & Torso: rows 4..8 (5 pixels high)
// Legs: rows 9..15 (7 pixels high)
// ----------------------------------------------------------------------------
const real16 = [
    "................", // 0: empty
    "......OHHO......", // 1: short dark hair crown (realistic small head)
    ".....OhSEshO....", // 2: face: hair sides, brow shadow, skin, subtle eye E
    "......OscdO.....", // 3: jawline / chin / neck
    "....OTTTTtuuO...", // 4: broad adult male shoulders, tunic neckline
    "....OSTTTtuucO..", // 5: chest, arms at sides (S, c = hands)
    "....OBBBbbbbO...", // 6: brown rope belt at natural waist
    "....OTTTtuuuO...", // 7: tunic skirt hanging to mid-thigh
    "....OPPppqqO....", // 8: dark grey-brown trousers emerging below tunic
    "....OPP..qqO....", // 9: upper thighs (separated)
    "....OPp..pqO....", // 10: knees
    "....OPp..pqO....", // 11: lower shins
    "....OLL..llO....", // 12: boot tops
    "....OLL..llO....", // 13: dark leather boots
    "....OLL..llO....", // 14: ankles
    "...OOLL..llOO..."  // 15: boot soles touching row 16
];

// Model 1b: Realistic 16x16 with 4-pixel head (subtle eye dot + chin):
const real16b = [
    "................", // 0: empty
    ".....OOOOOO.....", // 1: hair top
    "....OHHHhhhOO...", // 2: hair & temple
    "....OhEs.EsdO...", // 3: subtle realistic eyes E at 6 and 10, skin s
    ".....OssscO.....", // 4: jaw / chin / beard stubble
    "...OTTTTStuuuO..", // 5: broad adult shoulders, V-neck tunic
    "...OTTTTTtuuuO..", // 6: chest, arms
    "...OSTTTTtuucO..", // 7: hands at sides, waist
    "....OBBBbbbbO...", // 8: rope belt
    "...OTTTTtuuuO...", // 9: tunic to mid-thigh
    "....OPP..qqO....", // 10: trousers (thighs)
    "....OPp..pqO....", // 11: trousers (knees)
    "....OPp..pqO....", // 12: trousers (shins)
    "....OLL..llO....", // 13: boots
    "....OLL..llO....", // 14: boots
    "...OOLL..llOO..."  // 15: boots touching row 16
];

// ----------------------------------------------------------------------------
// Model 2: Taller Realistic Adult Male Settler (16x24 native)
// True 1:6 adult proportion, fits inside 48x48 RMMZ frame perfectly (scale 2x)
// ----------------------------------------------------------------------------
const real24 = [
    "................", // 0
    "................", // 1
    "......OOOO......", // 2: hair crown
    ".....OHHHhhO....", // 3: hair dome
    "....OhHHhhhhO...", // 4: hair bangs
    "....OhsEsEsdO...", // 5: realistic eyes E, nose bridge s, hair sides
    ".....OsSscdO....", // 6: cheekbone, mouth, chin
    ".....OTSTtuO....", // 7: neck & tunic collar
    "...OTTTTTtuuuO..", // 8: broad shoulders
    "...OTTTTTtuuuO..", // 9: chest / pectorals
    "...OTTTTTtuuuO..", // 10: torso / ribs
    "...OSTTTTtuucO..", // 11: hands at sides, waist
    "....OBBBbbbbO...", // 12: brown rope belt with knot
    "...OTTTbtuuuO...", // 13: tunic skirt over hips, rope tie
    "...OTTTTtuuuO...", // 14: tunic hem at mid-thigh
    "....OPPpqqqO....", // 15: trousers below tunic
    "....OPP..qqO....", // 16: thighs
    "....OPp..pqO....", // 17: thighs / knees
    "....OPp..pqO....", // 18: shins
    "....OLL..llO....", // 19: boot tops
    "....OLL..llO....", // 20: leather boots
    "....OLL..llO....", // 21: ankles
    "...OOLL..llOO...", // 22: feet soles
    "................"  // 23
];

function renderToPNG(grid, w, h, filename, scale = 1) {
    const sw = w * scale;
    const sh = h * scale;
    const buf = Buffer.alloc(sw * sh * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const ch = grid[y][x];
            const c = palMap[ch];
            if (!c) throw new Error(`Missing ${ch}`);
            for (let dy = 0; dy < scale; dy++) {
                for (let dx = 0; dx < scale; dx++) {
                    const dIdx = (((y * scale + dy) * sw) + (x * scale + dx)) * 4;
                    buf[dIdx] = c[0];
                    buf[dIdx + 1] = c[1];
                    buf[dIdx + 2] = c[2];
                    buf[dIdx + 3] = 255;
                }
            }
        }
    }
    writePNG(filename, sw, sh, buf);
}

// Render Model 1 (16x16 realistic):
renderToPNG(real16, 16, 16, 'game/test_output/realistic_settler_16a_1x.png', 1);
renderToPNG(real16, 16, 16, 'game/test_output/realistic_settler_16a_3x.png', 3);
renderToPNG(real16, 16, 16, 'game/test_output/realistic_settler_16a_16x.png', 16);

renderToPNG(real16b, 16, 16, 'game/test_output/realistic_settler_16b_1x.png', 1);
renderToPNG(real16b, 16, 16, 'game/test_output/realistic_settler_16b_3x.png', 3);
renderToPNG(real16b, 16, 16, 'game/test_output/realistic_settler_16b_16x.png', 16);

// Render Model 2 (16x24 realistic):
renderToPNG(real24, 16, 24, 'game/test_output/realistic_settler_24_1x.png', 1);
renderToPNG(real24, 16, 24, 'game/test_output/realistic_settler_24_2x.png', 2);
renderToPNG(real24, 16, 24, 'game/test_output/realistic_settler_24_8x.png', 8);

console.log('Realistic settler models rendered with U7 palette.');

