const fs = require('fs');
const { writePNG } = require('./png_util');

// Ultima VII Daylight Palette exact colors (PALETTES.FLX Record 0 / uf.hex):
const pal = {
    '.': [255,   0, 255], // Solid magenta #FF00FF background
    'O': [ 32,  20,   8], // Idx 147: #201408 (deep dark brown silhouette outline)
    'o': [ 61,  36,  12], // Idx 145: #3D240C (soft shadow outline)
    
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

// ----------------------------------------------------------------------------
// Perfected FF5 Settler Grid (Row 0 empty, Cols 0 & 15 empty, Feet on Row 15)
// ----------------------------------------------------------------------------
const perfectSettler1 = [
    "................", // 0: empty
    ".....OOOOOO.....", // 1: top hair outline
    "....OhHHHhhO....", // 2: hair crown (highlight left, chestnut right)
    "...OhHHHHHHhO...", // 3: hair dome volume
    "...OHHhHHHHHHO..", // 4: layered bangs
    "...OHhshhHHHO...", // 5: forehead skin peeking through bangs
    "...OHhssshhHHO..", // 6: brow bridge (sss)
    "...OhWOssOWHO...", // 7: FF5 eyes (W=sclera, O=pupil, ss=bridge)
    "...OOWOSSOWOO...", // 8: eyes lower / chin top
    "..OTTOOSSSSOttO.", // 9: chin (SSSS) & linen tunic shoulders
    ".OTTTcOOOOcTTuO.", // 10: tunic chest with open collar V (OOOO), sleeves
    ".OsTTOTTTTTTuTsO", // 11: hands at sides (s), tunic waist
    "..OOBBbbbbBOO...", // 12: brown rope belt with knot
    "..OTTTTTtttttuO.", // 13: mid-thigh tunic skirt hem
    "...OPPPq.OPpqO..", // 14: dark grey-brown trousers & boots ankle
    "...OLLll.OLLlO.."  // 15: simple dark leather boots on bottom row!
];

// Symmetrical grounded feet variant:
const perfectSettler2 = [
    "................", // 0: empty
    ".....OOOOOO.....", // 1: top hair outline
    "....OhHHHhhO....", // 2: hair crown
    "...OhHHHHHHhO...", // 3: hair dome
    "...OHHhHHHHHHO..", // 4: layered bangs
    "...OHhshhHHHO...", // 5: forehead
    "...OHhssshhHHO..", // 6: brow bridge
    "...OhWOssOWHO...", // 7: eyes
    "...OOWOSSOWOO...", // 8: eyes lower
    "..OTTOOSSSSOttO.", // 9: chin & shoulders
    ".OTTTcOOOOcTTuO.", // 10: tunic chest
    ".OsTTOTTTTTTuTsO", // 11: hands at sides
    "..OOBBbbbbBOO...", // 12: brown rope belt
    "..OTTTTTtttttuO.", // 13: tunic skirt to mid-thigh
    "..OPPPqq.pqqqO..", // 14: trousers
    "..OLLll...LLlO.."  // 15: boots touching row 15
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

    // 3x scale (48x48)
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
    writePNG(`game/test_output/${name}_3x.png`, w * s3, h * s3, buf3);

    // 16x zoom (256x256)
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
    writePNG(`game/test_output/${name}_16x.png`, w * s16, h * s16, buf16);
}

render(perfectSettler1, 'settler_perfect_v1');
render(perfectSettler2, 'settler_perfect_v2');
console.log('Exported perfect settlers.');

