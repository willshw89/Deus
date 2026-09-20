const fs = require('fs');
const { writePNG } = require('./png_util');

// Ultima VII Daylight Palette exact colors (from PALETTES.FLX Record 0 / uf.hex):
const pal = {
    '.': [255,   0, 255], // Magenta #FF00FF background
    'O': [ 32,  20,   8], // Idx 147: #201408 (deep dark brown silhouette outline)
    'o': [ 61,  36,  12], // Idx 145: #3D240C (softer brown outline)
    
    // Hair (warm dark brown / chestnut)
    'H': [117,  69,   4], // Idx 11:  #754504 (hair highlight)
    'h': [ 93,  53,  12], // Idx 143: #5D350C (hair midtone)
    'd': [ 61,  36,  12], // Idx 145: #3D240C (hair shadow)
    
    // Light Skin
    'S': [255, 223, 186], // Idx 32:  #FFDFBA (skin highlight)
    's': [227, 194, 178], // Idx 105: #E3C2B2 (skin midtone)
    'c': [198, 142, 117], // Idx 109: #C68E75 (skin shadow / blush)
    
    // Eyes (FF5 style: dark pupil/brow + clean white pixel)
    'W': [255, 255, 255], // Idx 15:  #FFFFFF (white sclera)
    'E': [ 45,  28,   8], // Idx 146: #2D1C08 (dark eye pupil)
    
    // Undyed Homespun Tunic (natural linen / pale oatmeal)
    'T': [235, 227, 215], // Idx 134: #EBE3D7 (tunic highlight)
    't': [202, 178, 146], // Idx 136: #CAB292 (tunic midtone)
    'u': [170, 134,  89], // Idx 138: #AA8659 (tunic shadow)
    
    // Brown Rope Belt
    'B': [186, 154, 113], // Idx 137: #BA9A71 (belt highlight)
    'b': [ 97,  49,   0], // Idx 12:  #613100 (belt shadow / knot)
    
    // Dark Grey-Brown Trousers
    'P': [ 85,  61,  49], // Idx 114: #553D31 (trousers highlight)
    'p': [ 61,  45,  36], // Idx 115: #3D2D24 (trousers midtone)
    'q': [ 40,  28,  20], // Idx 116: #281C14 (trousers shadow)
    
    // Simple Dark Leather Boots
    'L': [ 77,  45,  12], // Idx 144: #4D2D0C (boots leather)
    'l': [ 45,  28,   8]  // Idx 146: #2D1C08 (boots shadow/sole)
};

// ----------------------------------------------------------------------------
// Authentic Final Fantasy V character grid structure (16x16 canvas):
// Width: 14 pixels centered (cols 1..14, cols 0 and 15 empty)
// Height: 16 pixels (rows 0..15, feet touching row 15)
// ----------------------------------------------------------------------------
const ff5Grid1 = [
    "................", // 0: empty
    ".....OOOOOO.....", // 1: hair top outline
    "...OOHHHHhhOO...", // 2: FF5 layered hair crown (highlight left, mid right)
    "..OHHHhHHHhhhdO.", // 3: FF5 hair bangs with tufts
    "..OhhOOsHHhOhhdO", // 4: bangs parting showing forehead skin 's'
    "..OOdOsssshOdOO.", // 5: brow & temple
    ".OTTOOWssssWOOT.", // 6: FF5 signature eyes! (White W + dark E outline + skin)
    "..OOTTOssssOTTO.", // 7: chin & open tunic collar neckline
    ".OTTTTTtttttuuuO", // 8: tunic shoulders & chest (undyed linen)
    ".OSTTTTtttttuucO", // 9: arms at sides, hands peeking out (S, c)
    "..OBBBBBbbbbbbO.", // 10: brown rope belt with knot
    "..OTTTTTtttttuO.", // 11: tunic skirt to mid-thigh
    "..OPPPqq..pqqqO.", // 12: dark grey-brown trousers emerging below tunic
    "..OPPpqq..ppqqO.", // 13: trousers shins
    "..OLLlll..OLLlO.", // 14: dark leather boots
    ".OOLLlll..OLLlOO"  // 15: boot soles touching bottom row 16
];

// Refined FF5 Settler Variant 2 (exact Bartz Freelancer tunic & stance mapping):
const ff5Grid2 = [
    "................", // 0: empty
    ".....OOOOOO.....", // 1: hair crown
    "...OOHHHHhhOO...", // 2: hair volume
    "..OHHHhHHHhhhdO.", // 3: bangs
    "..OhhOOsHHhOhhdO", // 4: bangs tufts & forehead skin
    "..OOdOsssshOdOO.", // 5: brow
    ".OTTOOWssssWOOT.", // 6: eyes (W sclera, dark pupil outline)
    "..OOTTTSSSSOTTO.", // 7: chin and open neck
    ".OTTTTTtttttuuuO", // 8: broad tunic shoulders
    ".OSTTTTtttttuucO", // 9: chest & hands at sides
    "..OBBBBBbbbbbbO.", // 10: brown rope belt
    "..OTTTTTtttttuO.", // 11: tunic skirt to mid-thigh
    "..OPPPqq..pqqqO.", // 12: trousers below tunic
    "..OPPpqq..ppqqO.", // 13: trousers lower leg
    "..OLLlll..OLLlO.", // 14: boots ankle
    ".OOLLlll..OLLlOO"  // 15: feet on bottom row
];

// Variant 3: Cleaner tunic neckline with rope knot hanging down:
const ff5Grid3 = [
    "................", // 0: empty
    ".....OOOOOO.....", // 1: hair crown
    "...OOHHHHhhOO...", // 2: hair dome
    "..OHHHhHHHhhhdO.", // 3: FF5 spiky/layered hair bangs
    "..OhhOOsHHhOhhdO", // 4: hair parting, forehead
    "..OOdOsssshOdOO.", // 5: brow
    ".OTTOOWssssWOOT.", // 6: eyes (W sclera, dark pupil)
    "..OOTTTssssOTTO.", // 7: chin, collar
    ".OTTTTTtttttuuuO", // 8: tunic chest
    ".OSTTTTtttttuucO", // 9: hands at sides
    "..OBBBbBbbbbbbO.", // 10: rope belt with knot
    "..OTTTbtttttquO.", // 11: tunic skirt with hanging rope tie 'b'
    "..OPPPqq..pqqqO.", // 12: dark trousers
    "..OPPpqq..ppqqO.", // 13: trousers
    "..OLLlll..OLLlO.", // 14: boots
    ".OOLLlll..OLLlOO"  // 15: boots touching bottom row 16
];

function renderGrid(grid, name) {
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

    // 3x (48x48)
    const scale3 = 3;
    const buf3 = Buffer.alloc(w * scale3 * h * scale3 * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const sIdx = (y * w + x) * 4;
            for (let dy = 0; dy < scale3; dy++) {
                for (let dx = 0; dx < scale3; dx++) {
                    const dIdx = (((y * scale3 + dy) * w * scale3) + (x * scale3 + dx)) * 4;
                    buf3[dIdx] = buf[sIdx];
                    buf3[dIdx + 1] = buf[sIdx + 1];
                    buf3[dIdx + 2] = buf[sIdx + 2];
                    buf3[dIdx + 3] = 255;
                }
            }
        }
    }
    writePNG(`game/test_output/${name}_3x.png`, w * scale3, h * scale3, buf3);

    // 16x zoom (256x256)
    const scale16 = 16;
    const buf16 = Buffer.alloc(w * scale16 * h * scale16 * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const sIdx = (y * w + x) * 4;
            for (let dy = 0; dy < scale16; dy++) {
                for (let dx = 0; dx < scale16; dx++) {
                    const dIdx = (((y * scale16 + dy) * w * scale16) + (x * scale16 + dx)) * 4;
                    buf16[dIdx] = buf[sIdx];
                    buf16[dIdx + 1] = buf[sIdx + 1];
                    buf16[dIdx + 2] = buf[sIdx + 2];
                    buf16[dIdx + 3] = 255;
                }
            }
        }
    }
    writePNG(`game/test_output/${name}_16x.png`, w * scale16, h * scale16, buf16);
}

renderGrid(ff5Grid1, 'ff5_settler_v1');
renderGrid(ff5Grid2, 'ff5_settler_v2');
renderGrid(ff5Grid3, 'ff5_settler_v3');
console.log('FF5-style settler sprites rendered with U7 palette.');
