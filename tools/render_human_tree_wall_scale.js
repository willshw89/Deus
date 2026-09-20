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

// 2. Load oak 96x96 master (2x2 tiles)
const oak96Path = path.join(ROOT, 'art', 'masters', 'oak_stand_96x96.png');
const oak96Dec = decodePNG(fs.readFileSync(oak96Path), 'oak96.png');
const oak96Pixels = Array.from({ length: 96 }, () => Array(96).fill(null));
for (let y = 0; y < 96; y++) {
    for (let x = 0; x < 96; x++) {
        const o = (y * 96 + x) * 4;
        if (oak96Dec.data[o + 3] > 128) {
            oak96Pixels[y][x] = [oak96Dec.data[o], oak96Dec.data[o + 1], oak96Dec.data[o + 2]];
        }
    }
}

// 3. Load grand oak 144x144 master (3x3 tiles)
const oak144Path = path.join(ROOT, 'art', 'masters', 'oak_grand_3x3_144x144.png');
const oak144Dec = decodePNG(fs.readFileSync(oak144Path), 'oak144.png');
const oak144Pixels = Array.from({ length: 144 }, () => Array(144).fill(null));
for (let y = 0; y < 144; y++) {
    for (let x = 0; x < 144; x++) {
        const o = (y * 144 + x) * 4;
        if (oak144Dec.data[o + 3] > 128) {
            oak144Pixels[y][x] = [oak144Dec.data[o], oak144Dec.data[o + 1], oak144Dec.data[o + 2]];
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

// 5. Build 2-square wall (48 wide x 96 tall)
// Top square (y = 0..47): roof square
// Bottom square (y = 48..95): wall face square
const wallW = 48, wallH = 96;
const wallPixels = Array.from({ length: wallH }, () => Array(wallW).fill(null));

for (let y = 0; y < 48; y++) {
    for (let x = 0; x < 48; x++) {
        const isBorder = (x === 0 || x === 47 || y === 0 || y === 47);
        const isBevel = (x <= 3 || x >= 44 || y <= 3 || y >= 44);
        if (isBorder) wallPixels[y][x] = [32, 24, 16];
        else if (isBevel) wallPixels[y][x] = [64, 48, 32];
        else wallPixels[y][x] = [28, 22, 18]; // dark recessed center
    }
}
for (let y = 48; y < 96; y++) {
    for (let x = 0; x < 48; x++) {
        const logX = x % 6;
        let c;
        if (logX === 0) c = [48, 32, 16];
        else if (logX === 1) c = [125, 77, 24];
        else if (logX <= 3) c = [93, 53, 12];
        else c = [61, 36, 12];
        
        if (y === 60 || y === 61 || y === 80 || y === 81) c = [160, 130, 80];
        if (y === 95) c = [24, 16, 8];
        wallPixels[y][x] = c;
    }
}

// 6. Build stone 2-square wall as well (48 wide x 96 tall)
const stoneWallPixels = Array.from({ length: wallH }, () => Array(wallW).fill(null));
for (let y = 0; y < 48; y++) {
    for (let x = 0; x < 48; x++) {
        const isBorder = (x === 0 || x === 47 || y === 0 || y === 47);
        const isBevel = (x <= 3 || x >= 44 || y <= 3 || y >= 44);
        if (isBorder) stoneWallPixels[y][x] = [24, 24, 24];
        else if (isBevel) stoneWallPixels[y][x] = [56, 56, 56];
        else stoneWallPixels[y][x] = [20, 20, 20];
    }
}
for (let y = 48; y < 96; y++) {
    for (let x = 0; x < 48; x++) {
        const stoneRow = Math.floor((y - 48) / 8);
        const stoneCol = Math.floor((x + (stoneRow % 2 === 1 ? 8 : 0)) / 16);
        const inSeam = ((y - 48) % 8 === 0) || ((x + (stoneRow % 2 === 1 ? 8 : 0)) % 16 === 0);
        let c;
        if (inSeam) c = [28, 28, 28];
        else if ((y - 48) % 8 === 1 || (x % 16 === 1)) c = [130, 130, 125];
        else c = [90, 90, 85];
        if (y === 95) c = [20, 20, 20];
        stoneWallPixels[y][x] = c;
    }
}

// 7. Compose scene: 14 tiles wide x 7 tiles high (672 x 336 px)
const sceneCols = 14, sceneRows = 7;
const sceneW = sceneCols * 48;
const sceneH = sceneRows * 48;
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
// Left: 2-square Wood Wall (cols 1..2, rows 1..2)
// Next: 2-square Stone Wall (col 3, rows 1..2)
// Human in front of wall: col 2, row 3
blit(wallPixels, 1 * 48, 1 * 48);
blit(wallPixels, 2 * 48, 1 * 48);
blit(stoneWallPixels, 3 * 48, 1 * 48);
blit(humanPixels, 2 * 48, 3 * 48);

// Center: 2x2 Oak Tree (cols 5..6, rows 2..3)
// Human standing beside it: col 7, row 3
blit(oak96Pixels, 5 * 48, 2 * 48);
blit(humanPixels, 7 * 48, 3 * 48);

// Right: 3x3 Grand Oak Tree (cols 9..11, rows 2..4)
// Human standing under it: col 10, row 5
blit(oak144Pixels, 9 * 48, 2 * 48);
blit(humanPixels, 10 * 48, 5 * 48);

// Add faint grid lines (48x48) so user can clearly count squares
for (let y = 0; y < sceneH; y++) {
    for (let x = 0; x < sceneW; x++) {
        const isGrid = (x % 48 === 0 || y % 48 === 0);
        if (isGrid) {
            const o = (y * sceneW + x) * 4;
            // Slight dark overlay on grid lines
            sceneBuf[o] = Math.round(sceneBuf[o] * 0.75);
            sceneBuf[o + 1] = Math.round(sceneBuf[o + 1] * 0.75);
            sceneBuf[o + 2] = Math.round(sceneBuf[o + 2] * 0.75);
        }
    }
}

// Save 1x
const scene1xFile = path.join(ROOT, 'art', 'review', 'scale_comparison_human_walls_trees_1x.png');
writePNG(scene1xFile, sceneW, sceneH, sceneBuf);
console.log(`Saved 1x comparison: ${scene1xFile}`);

// Save 2x
const scale2 = 2;
const scene2xBuf = Buffer.alloc(sceneW * scale2 * sceneH * scale2 * 4);
for (let y = 0; y < sceneH * scale2; y++) {
    for (let x = 0; x < sceneW * scale2; x++) {
        const sx = Math.floor(x / scale2);
        const sy = Math.floor(y / scale2);
        const srcO = (sy * sceneW + sx) * 4;
        const dstO = (y * (sceneW * scale2) + x) * 4;
        scene2xBuf[dstO] = sceneBuf[srcO];
        scene2xBuf[dstO + 1] = sceneBuf[srcO + 1];
        scene2xBuf[dstO + 2] = sceneBuf[srcO + 2];
        scene2xBuf[dstO + 3] = 255;
    }
}
const scene2xFile = path.join(ROOT, 'art', 'review', 'scale_comparison_human_walls_trees_2x.png');
writePNG(scene2xFile, sceneW * scale2, sceneH * scale2, scene2xBuf);
console.log(`Saved 2x comparison: ${scene2xFile}`);
