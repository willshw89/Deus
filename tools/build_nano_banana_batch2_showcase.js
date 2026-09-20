const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');

const showW = 960, showH = 560;
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

// 1. Draw Furnace 3 animation frames (96x96 -> 144x144)
const furnaceImg = decodePNG(fs.readFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Furnace.png')), '!$UF_Furnace.png');
blit(furnaceImg, 0, 0, 96, 96, 40, 40, 130, 130);
blit(furnaceImg, 96, 0, 96, 96, 185, 40, 130, 130);
blit(furnaceImg, 192, 0, 96, 96, 330, 40, 130, 130);

// 2. Draw Well 3 animation frames (96x96 -> 144x144)
const wellImg = decodePNG(fs.readFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Well.png')), '!$UF_Well.png');
blit(wellImg, 0, 0, 96, 96, 500, 40, 130, 130);
blit(wellImg, 96, 0, 96, 96, 645, 40, 130, 130);
blit(wellImg, 192, 0, 96, 96, 790, 40, 130, 130);

// 3. Draw Subterranean Glow Fungi 3 frames at 2x (48x48 -> 96x96)
const glowImg = decodePNG(fs.readFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_GlowCaps.png')), '!$UF_GlowCaps.png');
blit(glowImg, 0, 0, 48, 48, 60, 220, 100, 100);
blit(glowImg, 48, 0, 48, 48, 200, 220, 100, 100);
blit(glowImg, 96, 0, 48, 48, 340, 220, 100, 100);

// 4. Draw Palm Tree & Pine Tree (96x96 -> 180x180)
const palmImg = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'palm.png')), 'palm.png');
const pineImg = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'pine.png')), 'pine.png');
blit(palmImg, 0, 0, 96, 96, 530, 200, 170, 170);
blit(pineImg, 0, 0, 96, 96, 740, 200, 170, 170);

const outPath = path.join(ROOT, 'art', 'review', 'nano_banana_batch2_showcase.png');
writePNG(outPath, showW, showH, buf);
console.log('Created Batch 2 showcase at:', outPath);
