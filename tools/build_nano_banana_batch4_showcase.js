const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');

const showW = 1040, showH = 640;
const buf = Buffer.alloc(showW * showH * 4);

// Background: deep dark slate (#14171d)
for (let i = 0; i < showW * showH; i++) {
    buf[i * 4] = 20;
    buf[i * 4 + 1] = 23;
    buf[i * 4 + 2] = 29;
    buf[i * 4 + 3] = 255;
}

function blit(src, sx, sy, sw, sh, dx, dy, targetW, targetH) {
    for (let dyPos = 0; dyPos < targetH; dyPos++) {
        const srcY = sy + Math.floor(dyPos * sh / targetH);
        for (let dxPos = 0; dxPos < targetW; dxPos++) {
            const srcX = sx + Math.floor(dxPos * sw / targetW);
            const sidx = (srcY * src.width + srcX) * 4;
            if (src.data[sidx + 3] > 128) {
                const targetX = dx + dxPos;
                const targetY = dy + dyPos;
                if (targetX >= 0 && targetX < showW && targetY >= 0 && targetY < showH) {
                    const didx = (targetY * showW + targetX) * 4;
                    buf[didx] = src.data[sidx];
                    buf[didx + 1] = src.data[sidx + 1];
                    buf[didx + 2] = src.data[sidx + 2];
                    buf[didx + 3] = 255;
                }
            }
        }
    }
}

// 1. Row 1: Large Mature Trees (96x96 -> 180x180)
const oakImg = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'oak.png')), 'oak.png');
const birchImg = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'birch.png')), 'birch.png');
const snowFirImg = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'fir_snow.png')), 'fir_snow.png');

blit(oakImg, 0, 0, 96, 96, 40, 30, 180, 180);
blit(birchImg, 0, 0, 96, 96, 250, 30, 180, 180);
blit(snowFirImg, 0, 0, 96, 96, 460, 30, 180, 180);

// Animated Campfire: 3 lit frames + unlit
const campSheet = decodePNG(fs.readFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Campfire.png')), '!$UF_Campfire.png');
const campUnlit = decodePNG(fs.readFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Campfire_Unlit.png')), '!$UF_Campfire_Unlit.png');

// 3 lit frames
blit(campSheet, 0, 0, 48, 48, 680, 50, 70, 70);
blit(campSheet, 48, 0, 48, 48, 760, 50, 70, 70);
blit(campSheet, 96, 0, 48, 48, 840, 50, 70, 70);
// Unlit
blit(campUnlit, 0, 0, 48, 48, 930, 50, 70, 70);

// Doors & Straw Bed
const doorWood = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'door_wood.png')), 'door_wood.png');
const doorStone = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'door_stone.png')), 'door_stone.png');
const strawBed = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'floor_straw.png')), 'floor_straw.png');

blit(doorWood, 0, 0, 48, 48, 690, 140, 70, 70);
blit(doorStone, 0, 0, 48, 48, 780, 140, 70, 70);
blit(strawBed, 0, 0, 48, 48, 880, 145, 80, 60);

// 2. Row 2: Flora & Shrubbery (48x48 -> 96x96)
const floras = [
    { file: 'berry_bush.png', name: 'Berry (Full)' },
    { file: 'berry_bush_bare.png', name: 'Berry (Bare)' },
    { file: 'bush.png', name: 'Bush' },
    { file: 'desert_shrub.png', name: 'Desert' },
    { file: 'snow_bush.png', name: 'Snow' },
    { file: 'grass_tuft.png', name: 'Grass' },
    { file: 'fern.png', name: 'Fern' },
    { file: 'stump.png', name: 'Stump' }
];

for (let i = 0; i < floras.length; i++) {
    const fl = floras[i];
    const p = path.join(ROOT, 'art', 'masters', fl.file);
    if (fs.existsSync(p)) {
        const img = decodePNG(fs.readFileSync(p), fl.file);
        blit(img, 0, 0, 48, 48, 40 + i * 122, 260, 96, 96);
    }
}

// 3. Row 3: Small Crystals (3 frames pulse)
const crystalSheet = decodePNG(fs.readFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_SmallCrystals.png')), '!$UF_SmallCrystals.png');
blit(crystalSheet, 0, 0, 48, 48, 40, 420, 100, 100);
blit(crystalSheet, 48, 0, 48, 48, 160, 420, 100, 100);
blit(crystalSheet, 96, 0, 48, 48, 280, 420, 100, 100);

const outPath = path.join(ROOT, 'art', 'review', 'nano_banana_batch4_showcase.png');
writePNG(outPath, showW, showH, buf);
console.log('Created Batch 4 showcase at:', outPath);
