const fs = require('fs');
const { writePNG } = require('./png_util');

const pal = {
    '.': [255,   0, 255], // Solid magenta #FF00FF background
    'O': [ 32,  20,   8], // Idx 147: #201408 (deep dark brown silhouette outline)
    'o': [ 61,  36,  12], // Idx 145: #3D240C (softer brown outline)
    
    // Hair (short dark brown: warm chestnut ramp)
    'H': [138,  93,  45], // Idx 140: #8A5D2D (hair highlight)
    'h': [109,  61,  12], // Idx 142: #6D3D0C (hair midtone)
    'd': [ 93,  53,  12], // Idx 143: #5D350C (hair shadow)
    
    // Light Skin
    'S': [255, 223, 186], // Idx 32:  #FFDFBA (skin highlight)
    's': [227, 194, 178], // Idx 105: #E3C2B2 (skin midtone)
    'c': [198, 142, 117], // Idx 109: #C68E75 (skin shadow / blush)
    
    // Eyes (FF5 signature 2x2: white sclera + dark pupil)
    'W': [255, 255, 255], // Idx 15:  #FFFFFF (white sclera)
    
    // Undyed Homespun Tunic (natural linen ramp)
    'T': [235, 227, 215], // Idx 134: #EBE3D7 (linen highlight - upper left)
    't': [202, 178, 146], // Idx 136: #CAB292 (linen midtone)
    'u': [170, 134,  89], // Idx 138: #AA8659 (linen shadow / folds)
    
    // Brown Rope Belt
    'B': [186, 154, 113], // Idx 137: #BA9A71 (rope highlight)
    'b': [ 97,  49,   0], // Idx 12:  #613100 (rope shadow / knot)
    
    // Dark Grey-Brown Trousers
    'P': [ 85,  61,  49], // Idx 114: #553D31 (trousers highlight)
    'p': [ 61,  45,  36], // Idx 115: #3D2D24 (trousers midtone)
    'q': [ 40,  28,  20], // Idx 116: #281C14 (trousers shadow)
    
    // Simple Dark Leather Boots
    'L': [ 77,  45,  12], // Idx 144: #4D2D0C (boots leather)
    'l': [ 45,  28,   8]  // Idx 146: #2D1C08 (boots shadow/sole)
};

// Refined Settler with natural homespun linen chest & V-neck:
const grid = [
    "................", // 0: empty
    ".....OOOOOO.....", // 1: top hair outline
    "....OhHHHhhO....", // 2: hair crown (highlight left, chestnut right)
    "...OhHHHHHHhO...", // 3: hair volume dome
    "...OHHhHHHHHHO..", // 4: layered bangs
    "...OHhshhHHHO...", // 5: forehead skin peeking
    "...OHhssshhHHO..", // 6: brow bridge
    "...OhWOssOWHO...", // 7: FF5 eyes (W=white, O=pupil, ss=bridge)
    "...OOWOSSOWOO...", // 8: eyes lower / chin top
    "..OTTOOSSSSOttO.", // 9: chin (SSSS) & tunic shoulders
    ".OTTTTOssOTTuuO.", // 10: natural V-neck collar opening (ss) with linen chest
    ".OsTTOTTTttTuTsO", // 11: hands at sides (s), tunic midtone
    "..OOBBbbbbBOO...", // 12: brown rope belt with knot
    "..OTTTTTtttttuO.", // 13: mid-thigh tunic skirt hem
    "...OPPPq.OPpqO..", // 14: dark grey-brown trousers & boots ankle
    "...OLLll.OLLlO.."  // 15: simple dark leather boots touching bottom row!
];

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
writePNG('game/test_output/settler_clean_1x.png', w, h, buf);

const s16 = 16;
const buf16 = Buffer.alloc(w * s16 * h * s16 * 4);
for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
        const sIdx = (y * w + x) * 4;
        for (let dy = 0; dy < s16; dy++) {
            for (let dx = 0; dx < s16; dx++) {
                const dIdx = (((y * s16 + dy) * w * s16) + (x * s16 + dx)) * 4;
                buf16[dIdx] = buf[sIdx];
                buf16[dIdx + 1] = buf[sIdx + 1];
                buf16[dIdx + 2] = buf[sIdx + 2];
                buf16[dIdx + 3] = 255;
            }
        }
    }
}
writePNG('game/test_output/settler_clean_16x.png', w * s16, h * s16, buf16);

// Also 3x (48x48)
const s3 = 3;
const buf3 = Buffer.alloc(w * s3 * h * s3 * 4);
for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
        const sIdx = (y * w + x) * 4;
        for (let dy = 0; dy < s3; dy++) {
            for (let dx = 0; dx < s3; dx++) {
                const dIdx = (((y * s3 + dy) * w * s3) + (x * s3 + dx)) * 4;
                buf3[dIdx] = buf[sIdx];
                buf3[dIdx + 1] = buf[sIdx + 1];
                buf3[dIdx + 2] = buf[sIdx + 2];
                buf3[dIdx + 3] = 255;
            }
        }
    }
}
writePNG('game/test_output/settler_clean_3x.png', w * s3, h * s3, buf3);
console.log('Saved settler_clean');

