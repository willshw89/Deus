const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');

const iconNames = [
    "log", "dressed_stone", "stone", "copper_ore",
    "gold_ore", "apple", "berries", "wheat",
    "herbs", "pickaxe", "axe", "sword",
    "bow", "campfire", "crystal", "potion"
];

const showW = 900, showH = 500;
const buf = Buffer.alloc(showW * showH * 4);

// Background: dark midnight slate (#14171d)
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

// 1. Draw Fruit Trees at 2x (96x96 -> 192x192)
const ftImg = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'fruit_tree.png')), 'fruit_tree.png');
const ftBareImg = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'fruit_tree_bare.png')), 'fruit_tree_bare.png');

blit(ftImg, 0, 0, 96, 96, 40, 40, 192, 192);
blit(ftBareImg, 0, 0, 96, 96, 250, 40, 192, 192);

// 2. Draw Reeds 3 animation frames at 2x (48x48 -> 96x96)
const reedsImg = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', '!$UF_Reeds.png')), '!$UF_Reeds.png');
blit(reedsImg, 0, 0, 48, 48, 50, 290, 96, 96);
blit(reedsImg, 48, 0, 48, 48, 170, 290, 96, 96);
blit(reedsImg, 96, 0, 48, 48, 290, 290, 96, 96);

// 3. Draw 16 Icons at 1.5x (48x48 -> 72x72) in 4x4 grid
for (let idx = 0; idx < iconNames.length; idx++) {
    const name = iconNames[idx];
    const iconPath = path.join(ROOT, 'art', 'masters', `${name}_icon.png`);
    if (fs.existsSync(iconPath)) {
        const iconImg = decodePNG(fs.readFileSync(iconPath), `${name}_icon.png`);
        const gx = idx % 4;
        const gy = Math.floor(idx / 4);
        const dx = 480 + gx * 95;
        const dy = 40 + gy * 105;
        blit(iconImg, 0, 0, 48, 48, dx, dy, 72, 72);
    }
}

const outPath = path.join(ROOT, 'art', 'review', 'nano_banana_world_objects_showcase.png');
writePNG(outPath, showW, showH, buf);
console.log('Created showcase at:', outPath);
