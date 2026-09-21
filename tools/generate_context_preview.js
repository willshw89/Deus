'use strict';

const fs = require('fs');
const path = require('path');
const { readPNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');
const STAGING_DIR = path.join(ROOT, 'art', 'staging');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');

function run() {
    // 288 x 192 preview canvas (6 x 4 tiles of 48x48)
    const W = 288;
    const H = 192;
    const canvas = Buffer.alloc(W * H * 4);

    // 1. Draw temperate meadow floor background (#5D7139, #4D5D28, #71864D)
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const idx = (y * W + x) * 4;
            // Dithered meadow pattern
            const isDark = ((x ^ y) & 4) === 0;
            const r = isDark ? 0x4D : 0x5D;
            const g = isDark ? 0x5D : 0x71;
            const b = isDark ? 0x28 : 0x39;
            canvas[idx] = r;
            canvas[idx + 1] = g;
            canvas[idx + 2] = b;
            canvas[idx + 3] = 0xFF;
        }
    }

    // 2. Draw wood plank floor in right room (x: 144..288, y: 0..192)
    for (let y = 0; y < H; y++) {
        for (let x = 144; x < W; x++) {
            const idx = (y * W + x) * 4;
            const plankY = y % 16;
            const isPlankBorder = plankY === 0 || plankY === 15;
            canvas[idx] = isPlankBorder ? 0x3D : 0x9A;
            canvas[idx + 1] = isPlankBorder ? 0x24 : 0x71;
            canvas[idx + 2] = isPlankBorder ? 0x0C : 0x41;
            canvas[idx + 3] = 0xFF;
        }
    }

    // Helper to blit a 48x48 frame
    function blit(img, srcCol, srcRow, destTileX, destTileY) {
        const sx0 = srcCol * 48;
        const sy0 = srcRow * 48;
        const dx0 = destTileX * 48;
        const dy0 = destTileY * 48;

        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sidx = ((sy0 + y) * img.width + (sx0 + x)) * 4;
                const a = img.data[sidx + 3];
                if (a > 128) {
                    const didx = ((dy0 + y) * W + (dx0 + x)) * 4;
                    canvas[didx] = img.data[sidx];
                    canvas[didx + 1] = img.data[sidx + 1];
                    canvas[didx + 2] = img.data[sidx + 2];
                    canvas[didx + 3] = 0xFF;
                }
            }
        }
    }

    const chestImg = readPNG(path.join(STAGING_DIR, '!$UF_Chest_Wood.png'));
    const crateImg = readPNG(path.join(STAGING_DIR, '!$UF_Crate_Wood.png'));
    const barrelImg = readPNG(path.join(STAGING_DIR, '!$UF_Barrel_Food.png'));
    const pantryImg = readPNG(path.join(STAGING_DIR, '!$UF_Kitchen_Pantry.png'));

    // Blit closed and open containers
    blit(chestImg, 0, 0, 0, 1); // Chest Closed at (0, 1)
    blit(chestImg, 2, 0, 1, 1); // Chest Open at (1, 1)

    blit(crateImg, 0, 0, 0, 2); // Crate Closed at (0, 2)
    blit(crateImg, 2, 0, 1, 2); // Crate Open at (1, 2)

    blit(barrelImg, 0, 0, 3, 2); // Barrel Closed at (3, 2)
    blit(barrelImg, 2, 0, 4, 2); // Barrel Open at (4, 2)

    blit(pantryImg, 0, 0, 3, 1); // Pantry Closed at (3, 1)
    blit(pantryImg, 2, 0, 4, 1); // Pantry Open at (4, 1)

    // Blit accepted colonist sprite for human scale reference
    const colonistPath = path.join(CHAR_DIR, '$UF_Human_Male.png');
    if (fs.existsSync(colonistPath)) {
        const colonistImg = readPNG(colonistPath);
        blit(colonistImg, 1, 0, 2, 1); // Standing colonist between the containers at (2, 1)
    }

    const outPath = path.join(REVIEW_DIR, 'batch1_containers_context_preview.png');
    writePNG(outPath, W, H, canvas);
    console.log(`Generated Context Preview: ${outPath}`);
}

run();
