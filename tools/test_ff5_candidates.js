const fs = require('fs');
const { writePNG } = require('./png_util');

// Ultima VII Daylight Palette exact colors (PALETTES.FLX Record 0 / uf.hex):
const pal = {
    '.': [255,   0, 255], // Solid magenta #FF00FF background
    'O': [ 32,  20,   8], // Idx 147: #201408 (deep dark brown silhouette outline)
    'o': [ 61,  36,  12], // Idx 145: #3D240C (softer brown crease/detail)
    
    // Hair (short dark brown: warm chestnut ramp)
    'H': [138,  93,  45], // Idx 140: #8A5D2D (hair highlight)
    'h': [109,  61,  12], // Idx 142: #6D3D0C (hair midtone)
    'd': [ 93,  53,  12], // Idx 143: #5D350C (hair shadow)
    
    // Light Skin
    'S': [255, 223, 186], // Idx 32:  #FFDFBA (skin highlight)
    's': [227, 194, 178], // Idx 105: #E3C2B2 (skin midtone)
    'c': [198, 142, 117], // Idx 109: #C68E75 (skin shadow / blush)
    
    // Eyes (FF5 signature: 2x2 with inward pupils)
    'W': [255, 255, 255], // Idx 15:  #FFFFFF (white sclera)
    'E': [ 32,  20,   8], // Idx 147: #201408 (dark eye pupil / iris)
    
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
// Candidate 1: Classic FF5 Villager Architecture (Adapted Man1 with homespun tunic)
// ----------------------------------------------------------------------------
const candidate1 = [
    "................", // 0: empty
    "....OOOOOOOO....", // 1: hair top outline
    "..OOHHHhhhhhOO..", // 2: hair dome (highlight left, midtone right)
    "..OHHHhHHHHhhHO.", // 3: layered bangs
    "..OhhsshhhhhdhO.", // 4: forehead peeking
    "..OhdssssssdhhO.", // 5: brow bridge
    "..OOhWEssEWddhO.", // 6: eyes row 1 (W=sclera, E=pupil, ss=bridge)
    "..OOOWEssEWdOOO.", // 7: eyes row 2
    ".OTTOOSSSSOOttO.", // 8: chin (SSSS) & tunic shoulders
    ".OTTTTOOOOTTuuO.", // 9: tunic chest with V-collar, arms at sides
    "OSTTTOttttTuuTsO", // 10: hands at hips (S, s), linen tunic body
    ".OssssOBbbBOssO.", // 11: hands & rope belt
    "..OOOOttTTttOO..", // 12: mid-thigh tunic skirt
    "...OPPPqOOPPqO..", // 13: dark grey-brown trousers
    "...OLLll..OLLlO.", // 14: leather boots
    "...OOLLl..OLLlOO"  // 15: boot soles touching row 15
];

// ----------------------------------------------------------------------------
// Candidate 2: Symmetrical Settler with Firm Grounded Stance
// ----------------------------------------------------------------------------
const candidate2 = [
    "................", // 0: empty
    "....OOOOOOOO....", // 1: hair top outline
    "..OOHHHhhhhhOO..", // 2: hair crown
    "..OHHHhHHHHhhHO.", // 3: hair bangs
    "..OhhsshhhhhdhO.", // 4: forehead peeking
    "..OhdssssssdhhO.", // 5: brow bridge
    "..OOhWEssEWddhO.", // 6: FF5 signature eyes
    "..OOOWEssEWdOOO.", // 7: eyes lower
    ".OTTOOSSSSOOttO.", // 8: chin (SSSS) & shoulders
    ".OTTTTOOOOTTuuO.", // 9: chest V-collar
    "OSTTTOttttTuuTsO", // 10: hands at sides
    ".OssssOBbbBOssO.", // 11: hands & rope belt
    "..OOOOttTTttOO..", // 12: mid-thigh tunic skirt
    "..OPPPqq..pqqqO.", // 13: trousers
    "..OLLlll..OLLlO.", // 14: boots
    ".OOLLlll..OLLlOO"  // 15: boots touching bottom row 16
];

// ----------------------------------------------------------------------------
// Candidate 3: Dynamic FF5 Bartz Posture with Hanging Rope Tie
// ----------------------------------------------------------------------------
const candidate3 = [
    "................", // 0: empty
    "....OOOOOOOO....", // 1: hair top
    "..OOHHHhhhhhOO..", // 2: hair dome
    "..OHHHhHHHHhhHO.", // 3: bangs
    "..OhhsshhhhhdhO.", // 4: forehead
    "..OhdssssssdhhO.", // 5: brow
    "..OOhWEssEWddhO.", // 6: eyes
    "..OOOWEssEWdOOO.", // 7: eyes
    ".OTTOOSSSSOOttO.", // 8: chin & shoulders
    ".OTTTTOOOOTTuuO.", // 9: chest collar
    "OSTTTOttttTuuTsO", // 10: hands
    ".OssssOBbbBOssO.", // 11: rope belt
    "..OOOOtbTTttOO..", // 12: tunic skirt with rope tie hanging 'b'
    "...OPPPq..OppqO.", // 13: trousers
    "...OLLll..OLLlO.", // 14: boots
    "...OOLLl..OLLlOO"  // 15: boots on ground
];

// ----------------------------------------------------------------------------
// Candidate 4: Refined 1-pixel high eye variant (like Bartz row 7)
// ----------------------------------------------------------------------------
const candidate4 = [
    "................", // 0: empty
    "....OOOOOOOO....", // 1: hair crown
    "..OOHHHhhhhhOO..", // 2: hair dome
    "..OHHHhHHHHhhHO.", // 3: layered bangs
    "..OhhOOsHHhOhhdO", // 4: bangs parting showing forehead skin 's'
    "..OOdOsssshOdOO.", // 5: brow & temple
    ".OTTOOWssssWOttO", // 6: 1px high FF5 eye (W sclera + dark pupil outline)
    "..OOTTOssssOTTO.", // 7: chin & open collar
    ".OTTTTTtttttuuuO", // 8: broad tunic shoulders
    "OSTTTTTtttttuusO", // 9: arms at sides, hands peeking
    ".OssssOBbbBOssO.", // 10: brown rope belt
    "..OOOOttTTttOO..", // 11: mid-thigh tunic skirt
    "..OPPPqq..pqqqO.", // 12: dark grey-brown trousers
    "..OPPpqq..ppqqO.", // 13: trousers lower leg
    "..OLLlll..OLLlO.", // 14: dark boots
    ".OOLLlll..OLLlOO"  // 15: boots touching bottom row 16
];

function render(grid, name) {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const ch = grid[y][x];
            const c = pal[ch];
            if (!c) throw new Error(`Missing char ${ch} at ${x},${y}`);
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

render(candidate1, 'settler_ff5_c1');
render(candidate2, 'settler_ff5_c2');
render(candidate3, 'settler_ff5_c3');
render(candidate4, 'settler_ff5_c4');
console.log('Rendered Candidates 1-4 successfully.');
