const fs = require('fs');
const { writePNG } = require('./png_util');

// Ultima VII Daylight Palette exact colors (PALETTES.FLX Record 0 / uf.hex):
const pal = {
    '.': [255,   0, 255], // Solid magenta #FF00FF background
    'O': [ 32,  20,   8], // Idx 147: #201408 (deep dark brown silhouette outline)
    'o': [ 61,  36,  12], // Idx 145: #3D240C (softer brown outline/crease)
    
    // Hair (short dark brown: warm chestnut ramp)
    'H': [138,  93,  45], // Idx 140: #8A5D2D (hair highlight)
    'h': [109,  61,  12], // Idx 142: #6D3D0C (hair midtone)
    'd': [ 93,  53,  12], // Idx 143: #5D350C (hair shadow)
    
    // Light Skin
    'S': [255, 223, 186], // Idx 32:  #FFDFBA (skin highlight)
    's': [227, 194, 178], // Idx 105: #E3C2B2 (skin midtone)
    'c': [198, 142, 117], // Idx 109: #C68E75 (skin shadow / blush)
    
    // Eyes (FF5 signature: 1px crisp white + dark pupil)
    'W': [255, 255, 255], // Idx 15:  #FFFFFF (white sclera)
    'E': [ 45,  28,   8], // Idx 146: #2D1C08 (dark eye pupil)
    
    // Undyed Homespun Tunic (natural linen ramp)
    'T': [235, 227, 215], // Idx 134: #EBE3D7 (linen highlight - top left)
    't': [202, 178, 146], // Idx 136: #CAB292 (linen midtone)
    'u': [170, 134,  89], // Idx 138: #AA8659 (linen shadow - right/folds)
    
    // Brown Rope Belt
    'B': [186, 154, 113], // Idx 137: #BA9A71 (rope light)
    'b': [ 97,  49,   0], // Idx 12:  #613100 (rope shadow / knot)
    
    // Dark Grey-Brown Trousers
    'P': [ 85,  61,  49], // Idx 114: #553D31 (trousers highlight)
    'p': [ 61,  45,  36], // Idx 115: #3D2D24 (trousers midtone)
    'q': [ 40,  28,  20], // Idx 116: #281C14 (trousers shadow)
    
    // Simple Dark Leather Boots
    'L': [ 77,  45,  12], // Idx 144: #4D2D0C (boots leather)
    'l': [ 45,  28,   8]  // Idx 146: #2D1C08 (boots shadow/sole)
};

// ============================================================================
// Variant 1: FF5 Townsperson Villager (Man1/Man2 structure adapted to Settler)
// Symmetrical standing pose, arms at sides, homespun tunic to mid-thigh,
// rope belt, dark trousers, sturdy leather boots.
// ============================================================================
const grid1 = [
    "................", // 0: empty
    "....OOOOOOOO....", // 1: hair top outline (8px)
    "...OOHHHHhhOO...", // 2: hair crown highlight on left
    "..OHHHhHHHhhhdO.", // 3: hair bangs volume
    "..OhhOOsHHhOhhdO", // 4: bangs parting showing forehead skin 's'
    "..OOdOsssshOdOO.", // 5: brow & temple
    ".OTTOEWssssWEOT.", // 6: FF5 signature eyes (E pupil + W sclera + skin)
    "..OOTTOssssOTTO.", // 7: chin & open collar
    ".OTTTTTtttttuuuO", // 8: tunic chest & shoulders
    ".OSTTTTtttttuucO", // 9: arms at sides, hands peeking
    "..OBBBBBbbbbbbO.", // 10: rope belt with knot
    "..OTTTTTtttttuO.", // 11: tunic skirt mid-thigh
    "..OPPPqq..pqqqO.", // 12: trousers split
    "..OPPpqq..ppqqO.", // 13: trousers lower leg
    "..OLLlll..OLLlO.", // 14: dark boots
    ".OOLLlll..OLLlOO"  // 15: boot soles on ground row 16
];

// ============================================================================
// Variant 2: Natural FF5 Idle Stance (Bartz stance, organic posture)
// Staggered boots giving authentic SNES character weight and life.
// ============================================================================
const grid2 = [
    "................", // 0: empty
    "....OOOOOOOO....", // 1: hair top
    "...OOHHHHhhOO...", // 2: hair dome
    "..OHHHhHHHhhhdO.", // 3: layered bangs
    "..OhhOOsHHhOhhdO", // 4: forehead parting
    "..OOdOsssshOdOO.", // 5: brow
    ".OTTOEWssssWEOT.", // 6: signature eyes
    "..OOTTOssssOTTO.", // 7: chin & collar
    ".OTTTTTtttttuuuO", // 8: broad linen tunic
    ".OSTTTTtttttuucO", // 9: hands at sides
    "..OBBBBBbbbbbbO.", // 10: rope belt
    "..OTTTTTtttttuO.", // 11: mid-thigh tunic hem
    "..OPPPqq..pqqqO.", // 12: trousers emerging
    "...OPPpq..ppqqO.", // 13: shins
    "...OLLll..OLLlO.", // 14: boots
    "...OOLLl..OLLlOO"  // 15: feet planted
];

// ============================================================================
// Variant 3: Rugged Settler (tunic tie hanging down, slightly broader chest)
// ============================================================================
const grid3 = [
    "................", // 0: empty
    "....OOOOOOOO....", // 1: hair top
    "...OOHHHHhhOO...", // 2: hair crown
    "..OHHHhHHHhhhdO.", // 3: short dark-brown hair
    "..OhhOOsHHhOhhdO", // 4: forehead skin
    "..OOdOsssshOdOO.", // 5: brow
    ".OTTOEWssssWEOT.", // 6: expressive FF5 eyes
    "..OOTTOssssOTTO.", // 7: chin & open collar
    ".OTTTTTtttttuuuO", // 8: undyed homespun tunic
    ".OSTTTTtttttuucO", // 9: arms at sides
    "..OBBBbBbbbbbbO.", // 10: brown rope belt with knot
    "..OTTTbtttttquO.", // 11: rope end 'b' hanging down tunic skirt
    "..OPPPqq..pqqqO.", // 12: trousers
    "..OPPpqq..ppqqO.", // 13: shins
    "..OLLlll..OLLlO.", // 14: dark boots
    ".OOLLlll..OLLlOO"  // 15: feet on bottom row
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

renderGrid(grid1, 'ff5_settler_v1');
renderGrid(grid2, 'ff5_settler_v2');
renderGrid(grid3, 'ff5_settler_v3');
console.log('Rendered all FF5 settler variations.');
