const fs = require('fs');
const path = require('path');
const { readPNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');

function blit(src, srcW, srcH, dst, dstW, dstH, dx, dy, zoom = 1) {
    for (let sy = 0; sy < srcH; sy++) {
        for (let sx = 0; sx < srcW; sx++) {
            const sIdx = (sy * srcW + sx) * 4;
            const sa = src[sIdx + 3];
            if (sa === 0) continue;
            const sr = src[sIdx], sg = src[sIdx + 1], sb = src[sIdx + 2];

            for (let zy = 0; zy < zoom; zy++) {
                for (let zx = 0; zx < zoom; zx++) {
                    const tx = dx + sx * zoom + zx;
                    const ty = dy + sy * zoom + zy;
                    if (tx < 0 || tx >= dstW || ty < 0 || ty >= dstH) continue;
                    const dIdx = (ty * dstW + tx) * 4;
                    dst[dIdx] = sr;
                    dst[dIdx + 1] = sg;
                    dst[dIdx + 2] = sb;
                    dst[dIdx + 3] = 255;
                }
            }
        }
    }
}

function blitSub(src, srcTotalW, srcTotalH, sx0, sy0, subW, subH, dst, dstW, dstH, dx, dy, zoom = 1) {
    for (let sy = 0; sy < subH; sy++) {
        for (let sx = 0; sx < subW; sx++) {
            const sIdx = ((sy0 + sy) * srcTotalW + (sx0 + sx)) * 4;
            const sa = src[sIdx + 3];
            if (sa === 0) continue;
            const sr = src[sIdx], sg = src[sIdx + 1], sb = src[sIdx + 2];

            for (let zy = 0; zy < zoom; zy++) {
                for (let zx = 0; zx < zoom; zx++) {
                    const tx = dx + sx * zoom + zx;
                    const ty = dy + sy * zoom + zy;
                    if (tx < 0 || tx >= dstW || ty < 0 || ty >= dstH) continue;
                    const dIdx = (ty * dstW + tx) * 4;
                    dst[dIdx] = sr;
                    dst[dIdx + 1] = sg;
                    dst[dIdx + 2] = sb;
                    dst[dIdx + 3] = 255;
                }
            }
        }
    }
}

// 1. Lineup on Magenta 4x (workbench, rubble, bones_pile, fallen_pillar)
console.log('Rendering site_pieces_batch2_lineup_4x.png...');
const benchPng = readPNG(path.join(ROOT, 'art', 'masters', 'workbench.png'));
const rubblePng = readPNG(path.join(ROOT, 'art', 'masters', 'rubble.png'));
const bonesPng = readPNG(path.join(ROOT, 'art', 'masters', 'bones_pile.png'));
const pillarPng = readPNG(path.join(ROOT, 'art', 'masters', 'fallen_pillar.png'));

const lineupW = (48 * 4 + 16 * 5) * 4; // 4 assets with padding
const lineupH = (48 + 16 * 2) * 4;
const lineupBuf = Buffer.alloc(lineupW * lineupH * 4);
// Fill with magenta #FF00FF
for (let i = 0; i < lineupBuf.length; i += 4) {
    lineupBuf[i] = 255;
    lineupBuf[i + 1] = 0;
    lineupBuf[i + 2] = 255;
    lineupBuf[i + 3] = 255;
}

blit(benchPng.data, 48, 48, lineupBuf, lineupW, lineupH, 16 * 4, 16 * 4, 4);
blit(rubblePng.data, 48, 48, lineupBuf, lineupW, lineupH, (16 * 2 + 48) * 4, 16 * 4, 4);
blit(bonesPng.data, 48, 48, lineupBuf, lineupW, lineupH, (16 * 3 + 48 * 2) * 4, 16 * 4, 4);
blit(pillarPng.data, 48, 48, lineupBuf, lineupW, lineupH, (16 * 4 + 48 * 3) * 4, 16 * 4, 4);

writePNG(path.join(ROOT, 'art', 'review', 'site_pieces_batch2_lineup_4x.png'), lineupW, lineupH, lineupBuf);

// 2. Lineup on Meadow Grass 4x
console.log('Rendering site_pieces_batch2_on_meadow_4x.png...');
const meadowPng = readPNG(path.join(ROOT, 'art', 'masters', 'meadow.png'));
const meadowBuf = Buffer.alloc(lineupW * lineupH * 4);
// Tile meadow 48x48
for (let y = 0; y < lineupH; y += 48 * 4) {
    for (let x = 0; x < lineupW; x += 48 * 4) {
        blitSub(meadowPng.data, meadowPng.width, meadowPng.height, 0, 0, 48, 48, meadowBuf, lineupW, lineupH, x, y, 4);
    }
}
blit(benchPng.data, 48, 48, meadowBuf, lineupW, lineupH, 16 * 4, 16 * 4, 4);
blit(rubblePng.data, 48, 48, meadowBuf, lineupW, lineupH, (16 * 2 + 48) * 4, 16 * 4, 4);
blit(bonesPng.data, 48, 48, meadowBuf, lineupW, lineupH, (16 * 3 + 48 * 2) * 4, 16 * 4, 4);
blit(pillarPng.data, 48, 48, meadowBuf, lineupW, lineupH, (16 * 4 + 48 * 3) * 4, 16 * 4, 4);

writePNG(path.join(ROOT, 'art', 'review', 'site_pieces_batch2_on_meadow_4x.png'), lineupW, lineupH, meadowBuf);

// 3. Grand Ruins & Workshop In-Engine Scene 2x
console.log('Rendering ruins_and_workshop_scene_2x.png...');
const sceneCols = 10, sceneRows = 6;
const sceneW = sceneCols * 48 * 2, sceneH = sceneRows * 48 * 2;
const sceneBuf = Buffer.alloc(sceneW * sceneH * 4);

// Tile meadow background
for (let y = 0; y < sceneH; y += 48 * 2) {
    for (let x = 0; x < sceneW; x += 48 * 2) {
        blitSub(meadowPng.data, meadowPng.width, meadowPng.height, 0, 0, 48, 48, sceneBuf, sceneW, sceneH, x, y, 2);
    }
}

// Load other required sprites
const wallWoodPng = readPNG(path.join(ROOT, 'game', 'img', 'characters', '!$WallWood_Set.png'));
const wallStonePng = readPNG(path.join(ROOT, 'game', 'img', 'characters', '!$WallStone_Set.png'));
const doorWoodPng = readPNG(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Door_Wood.png'));
const doorStonePng = readPNG(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Door_Stone.png'));
const settlerPng = readPNG(path.join(ROOT, 'art', 'masters', 'human_male_stand_south.png'));
const deerPng = readPNG(path.join(ROOT, 'game', 'img', 'characters', '$UF_Deer.png'));

// Left side: Frontier Settlement Workshop
// Wood Wall across columns 0 to 3 on row 1 (y = 0..1)
blitSub(wallWoodPng.data, 192, 480, 48, 0, 48, 96, sceneBuf, sceneW, sceneH, 0 * 48 * 2, 0 * 48 * 2, 2);
blitSub(doorWoodPng.data, 144, 192, 96, 0, 48, 48, sceneBuf, sceneW, sceneH, 1 * 48 * 2, 1 * 48 * 2, 2); // open door
blitSub(wallWoodPng.data, 192, 480, 48, 0, 48, 96, sceneBuf, sceneW, sceneH, 2 * 48 * 2, 0 * 48 * 2, 2);

// Workbench at col 1, row 3
blit(benchPng.data, 48, 48, sceneBuf, sceneW, sceneH, 1 * 48 * 2, 3 * 48 * 2, 2);
// Settler standing at workbench at col 2, row 3
blit(settlerPng.data, 48, 48, sceneBuf, sceneW, sceneH, 2 * 48 * 2, 3 * 48 * 2, 2);

// Right side: Ancient Sacked Ruins
// Ruined stone wall pieces on cols 6 and 9, row 1
blitSub(wallStonePng.data, 192, 480, 48, 0, 48, 96, sceneBuf, sceneW, sceneH, 6 * 48 * 2, 0 * 48 * 2, 2);
blitSub(doorStonePng.data, 144, 192, 0, 0, 48, 48, sceneBuf, sceneW, sceneH, 7 * 48 * 2, 1 * 48 * 2, 2); // closed stone door
blitSub(wallStonePng.data, 192, 480, 48, 0, 48, 96, sceneBuf, sceneW, sceneH, 9 * 48 * 2, 0 * 48 * 2, 2);

// Piles of Rubble in ruins
blit(rubblePng.data, 48, 48, sceneBuf, sceneW, sceneH, 8 * 48 * 2, 1 * 48 * 2, 2); // in ruined breach
blit(rubblePng.data, 48, 48, sceneBuf, sceneW, sceneH, 5 * 48 * 2, 2 * 48 * 2, 2);

// Fallen classical pillar resting at cols 6-7, row 3
blit(pillarPng.data, 48, 48, sceneBuf, sceneW, sceneH, 6 * 48 * 2, 3 * 48 * 2, 2);

// Old bones scatter in ancient ruined courtyard
blit(bonesPng.data, 48, 48, sceneBuf, sceneW, sceneH, 8 * 48 * 2, 3 * 48 * 2, 2);

// Deer grazing peacefully near foreground (col 5, row 4)
blitSub(deerPng.data, 144, 192, 48, 0, 48, 48, sceneBuf, sceneW, sceneH, 4 * 48 * 2, 4 * 48 * 2, 2);

writePNG(path.join(ROOT, 'art', 'review', 'ruins_and_workshop_scene_2x.png'), sceneW, sceneH, sceneBuf);

console.log('All review showcases generated successfully!');
