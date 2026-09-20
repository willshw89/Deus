const fs = require('fs');
const { writePNG } = require('./png_util');

const pal = {
    '.': [255,   0, 255], // 1: #FF00FF (background)
    'O': [ 48,  28,  16], // 2: #301C10 (dark brown selective silhouette outline)
    'H': [152,  94,  44], // 3: #985E2C (hair highlight)
    'h': [ 98,  58,  26], // 4: #623A1A (hair midtone)
    'd': [ 60,  34,  14], // 5: #3C220E (hair shadow)
    'S': [255, 226, 196], // 6: #FFE2C4 (skin highlight)
    's': [240, 192, 156], // 7: #F0C09C (skin midtone)
    'c': [210, 148, 110], // 8: #D2946E (skin shadow)
    'W': [255, 255, 255], // 9: #FFFFFF (eye white catchlight)
    'E': [ 34,  26,  22], // 10: #221A16 (eye pupil)
    'T': [224, 206, 176], // 11: #E0CEB0 (tunic highlight - undyed pale-brown homespun)
    't': [192, 170, 136], // 12: #C0AA88 (tunic midtone)
    'u': [148, 122,  92], // 13: #947A5C (tunic shadow)
    'B': [144,  94,  44], // 14: #905E2E (belt highlight - brown rope)
    'b': [ 96,  56,  22], // 15: #603816 (belt shadow / knot)
    'P': [ 96,  86,  78], // 16: #60564E (trousers highlight - dark grey-brown)
    'p': [ 70,  62,  56], // 17: #463E38 (trousers midtone)
    'q': [ 46,  40,  36], // 18: #2E2824 (trousers shadow)
    'L': [ 76,  54,  38], // 19: #4C3626 (boots highlight - simple dark boots)
    'l': [ 36,  22,  14]  // 20: #24160E (boots shadow/sole)
};

const finalGrid = [
    "................", // Row 0 (empty)
    ".....OOOOOO.....", // Row 1: hair crown outline
    "....OHHHhhhOO...", // Row 2: hair dome (highlight left, midtone right)
    "...OHHHhhhhhdO..", // Row 3: hair volume & bangs
    "...OhWESsWEdcO..", // Row 4: big simple eyes (W=shine, E=pupil), skin bridge (S, s)
    "...OhEESsEEcO...", // Row 5: lower eyes (E=pupil), skin bridge (S, s), shadow (c)
    "....OsSssscO....", // Row 6: chin & jaw
    "...OTTTStuuuO...", // Row 7: tunic shoulders, V-neck collar notch (S)
    "...OTTTTtuuuO...", // Row 8: chest, arms at sides
    "...OSTTTtuucO...", // Row 9: hands at sides (S, c), tunic waist
    "....OBBbBbbO....", // Row 10: brown rope belt with knot
    "...OTTTbtuuuO...", // Row 11: undyed homespun tunic to mid-thigh, hanging rope tie (b)
    "....OPPppqqO....", // Row 12: dark grey-brown trousers emerging below tunic
    "....OPpq.pqO....", // Row 13: trousers separating at shins with 1px gap
    "....OLL..llO....", // Row 14: simple dark boots
    "...OLLL..lllO..."  // Row 15: boot soles touching bottom row 16
];

// Verify dimensions
console.log('Height:', finalGrid.length);
for (let y = 0; y < finalGrid.length; y++) {
    if (finalGrid[y].length !== 16) {
        throw new Error(`Row ${y} length is ${finalGrid[y].length}, expected 16`);
    }
}

// Build 16x16 buffer
const w = 16, h = 16;
const buf1x = Buffer.alloc(w * h * 4);
const colorSet = new Set();

for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
        const ch = finalGrid[y][x];
        const c = pal[ch];
        if (!c) throw new Error(`Unknown char '${ch}' at (${x}, ${y})`);
        const hex = ((1 << 24) + (c[0] << 16) + (c[1] << 8) + c[2]).toString(16).slice(1).toUpperCase();
        colorSet.add('#' + hex);
        const idx = (y * w + x) * 4;
        buf1x[idx] = c[0];
        buf1x[idx + 1] = c[1];
        buf1x[idx + 2] = c[2];
        buf1x[idx + 3] = 255;
    }
}

console.log('Unique colors count:', colorSet.size);
console.log('Colors:', Array.from(colorSet).join(', '));

// Check bounds
// 1. Row 0 must be empty
const row0Empty = finalGrid[0].split('').every(ch => ch === '.');
console.log('Row 0 empty:', row0Empty);

// 2. Row 15 must have feet
const row15Feet = finalGrid[15].includes('L') && finalGrid[15].includes('l');
console.log('Row 15 has feet touching bottom row:', row15Feet);

// 3. Col 0 and 15 must be empty
let edgeEmpty = true;
for (let y = 0; y < 16; y++) {
    if (finalGrid[y][0] !== '.' || finalGrid[y][15] !== '.') {
        edgeEmpty = false;
        console.log(`Edge not empty at y=${y}: left=${finalGrid[y][0]}, right=${finalGrid[y][15]}`);
    }
}
console.log('Edges untouched (cols 0 and 15 empty):', edgeEmpty);

// Check if pure black exists
const hasPureBlack = colorSet.has('#000000');
console.log('Has pure black #000000:', hasPureBlack);

// Save canonical files
const targetPaths = [
    'art/settler_male_16x16.png',
    'game/test_output/settler_male_16x16.png'
];

if (!fs.existsSync('art')) fs.mkdirSync('art', { recursive: true });

for (const p of targetPaths) {
    writePNG(p, w, h, buf1x);
    console.log('Saved', p, '16x16 native');
}

// Generate 3x (48x48 RMMZ frame size) and 16x (256x256 display)
function makeScale(scale, outPath) {
    const sw = w * scale;
    const sh = h * scale;
    const zBuf = Buffer.alloc(sw * sh * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const sIdx = (y * w + x) * 4;
            for (let dy = 0; dy < scale; dy++) {
                for (let dx = 0; dx < scale; dx++) {
                    const dIdx = (((y * scale + dy) * sw) + (x * scale + dx)) * 4;
                    zBuf[dIdx] = buf1x[sIdx];
                    zBuf[dIdx + 1] = buf1x[sIdx + 1];
                    zBuf[dIdx + 2] = buf1x[sIdx + 2];
                    zBuf[dIdx + 3] = buf1x[sIdx + 3];
                }
            }
        }
    }
    writePNG(outPath, sw, sh, zBuf);
    console.log('Saved', outPath, `${sw}x${sh}`);
}

makeScale(3, 'game/test_output/settler_male_3x.png');
makeScale(16, 'game/test_output/settler_male_16x.png');
makeScale(16, 'art/settler_male_16x.png');

