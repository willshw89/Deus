const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');

// 1. Load human settler south frame (48x48)
const humanPath = path.join(ROOT, 'art', 'masters', 'human_male_stand.png');
const humanDec = decodePNG(fs.readFileSync(humanPath), 'human.png');
const humanW = 48, humanH = 48;
const humanPixels = Array.from({ length: humanH }, () => Array(humanW).fill(null));
for (let y = 0; y < humanH; y++) {
    for (let x = 0; x < humanW; x++) {
        const o = (y * humanDec.width + x) * 4;
        if (humanDec.data[o + 3] > 128) {
            humanPixels[y][x] = [humanDec.data[o], humanDec.data[o + 1], humanDec.data[o + 2]];
        }
    }
}

// 2. Load oak 96x96 master (exactly 2 squares vertical)
const oakPath = path.join(ROOT, 'art', 'masters', 'oak_stand_96x96.png');
const oakDec = decodePNG(fs.readFileSync(oakPath), 'oak.png');
const oakPixels = Array.from({ length: 96 }, () => Array(96).fill(null));
for (let y = 0; y < 96; y++) {
    for (let x = 0; x < 96; x++) {
        const o = (y * 96 + x) * 4;
        if (oakDec.data[o + 3] > 128) {
            oakPixels[y][x] = [oakDec.data[o], oakDec.data[o + 1], oakDec.data[o + 2]];
        }
    }
}

// 3. Load 2-square wall master (48x96: roof square + wall face square)
const wallPath = path.join(ROOT, 'art', 'masters', 'wall_wood.png');
const wallDec = decodePNG(fs.readFileSync(wallPath), 'wall.png');
const wallPixels = Array.from({ length: 96 }, () => Array(48).fill(null));
for (let y = 0; y < 96; y++) {
    for (let x = 0; x < 48; x++) {
        const o = (y * 48 + x) * 4;
        if (wallDec.data[o + 3] > 128) {
            wallPixels[y][x] = [wallDec.data[o], wallDec.data[o + 1], wallDec.data[o + 2]];
        }
    }
}

// 4. Load meadow tile (48x48)
const meadowPath = path.join(ROOT, 'art', 'masters', 'meadow.png');
let meadowDec = null;
if (fs.existsSync(meadowPath)) {
    meadowDec = decodePNG(fs.readFileSync(meadowPath), 'meadow.png');
}

function getMeadowPixel(x, y) {
    if (!meadowDec) return [77, 93, 40];
    const mx = x % 48;
    const my = y % 48;
    const o = (my * meadowDec.width + mx) * 4;
    return [meadowDec.data[o], meadowDec.data[o + 1], meadowDec.data[o + 2]];
}

// 5. Compose scene: 10 tiles wide x 5 tiles high (480 x 240 px)
const cols = 10, rows = 5;
const sceneW = cols * 48;
const sceneH = rows * 48;
const sceneBuf = Buffer.alloc(sceneW * sceneH * 4);

// Meadow ground
for (let y = 0; y < sceneH; y++) {
    for (let x = 0; x < sceneW; x++) {
        const o = (y * sceneW + x) * 4;
        const [r, g, b] = getMeadowPixel(x, y);
        sceneBuf[o] = r;
        sceneBuf[o + 1] = g;
        sceneBuf[o + 2] = b;
        sceneBuf[o + 3] = 255;
    }
}

function blit(pixels, startX, startY) {
    const ph = pixels.length;
    const pw = pixels[0].length;
    for (let py = 0; py < ph; py++) {
        for (let px = 0; px < pw; px++) {
            const c = pixels[py][px];
            if (!c) continue;
            const sx = startX + px;
            const sy = startY + py;
            if (sx < 0 || sx >= sceneW || sy < 0 || sy >= sceneH) continue;
            const o = (sy * sceneW + sx) * 4;
            sceneBuf[o] = c[0];
            sceneBuf[o + 1] = c[1];
            sceneBuf[o + 2] = c[2];
            sceneBuf[o + 3] = 255;
        }
    }
}

// Layout:
// Left: Continuous 2-square wall run across cols 1, 2, 3 (rows 1..2: row 1 is roof square, row 2 is wall face)
blit(wallPixels, 1 * 48, 1 * 48);
blit(wallPixels, 2 * 48, 1 * 48);
blit(wallPixels, 3 * 48, 1 * 48);

// Settler 1 in front of wall at col 2, row 3
blit(humanPixels, 2 * 48, 3 * 48);

// Center-Right: 2-square vertical tree (cols 5..6, rows 1..2: 96x96 px)
blit(oakPixels, 5 * 48, 1 * 48);

// Settler 2 standing beside tree at col 7, row 2
blit(humanPixels, 7 * 48, 2 * 48);

// Another 2-square tree at cols 8..9, rows 2..3
blit(oakPixels, 8 * 48, 2 * 48);

// Overlay faint grid lines (48x48)
for (let y = 0; y < sceneH; y++) {
    for (let x = 0; x < sceneW; x++) {
        const isGrid = (x % 48 === 0 || y % 48 === 0);
        if (isGrid) {
            const o = (y * sceneW + x) * 4;
            sceneBuf[o] = Math.round(sceneBuf[o] * 0.72);
            sceneBuf[o + 1] = Math.round(sceneBuf[o + 1] * 0.72);
            sceneBuf[o + 2] = Math.round(sceneBuf[o + 2] * 0.72);
        }
    }
}

// Save 1x
const file1x = path.join(ROOT, 'art', 'review', 'two_square_standard_showcase_1x.png');
writePNG(file1x, sceneW, sceneH, sceneBuf);

// Save 2x
const scale2 = 2;
const buf2x = Buffer.alloc(sceneW * scale2 * sceneH * scale2 * 4);
for (let y = 0; y < sceneH * scale2; y++) {
    for (let x = 0; x < sceneW * scale2; x++) {
        const sx = Math.floor(x / scale2);
        const sy = Math.floor(y / scale2);
        const srcO = (sy * sceneW + sx) * 4;
        const dstO = (y * (sceneW * scale2) + x) * 4;
        buf2x[dstO] = sceneBuf[srcO];
        buf2x[dstO + 1] = sceneBuf[srcO + 1];
        buf2x[dstO + 2] = sceneBuf[srcO + 2];
        buf2x[dstO + 3] = 255;
    }
}
const file2x = path.join(ROOT, 'art', 'review', 'two_square_standard_showcase_2x.png');
writePNG(file2x, sceneW * scale2, sceneH * scale2, buf2x);
console.log(`Saved 2-square showcase: ${file2x}`);
