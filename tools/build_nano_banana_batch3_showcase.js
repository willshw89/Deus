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

// 1. Draw 96x96 Trees: Savanna Acacia, Swamp Cypress, Tall Cactus
const savannaImg = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'tree_savanna.png')), 'tree_savanna.png');
const swampImg = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'tree_swamp.png')), 'tree_swamp.png');
const cactusTallImg = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'cactustall.png')), 'cactustall.png');

blit(savannaImg, 0, 0, 96, 96, 40, 40, 160, 160);
blit(swampImg, 0, 0, 96, 96, 230, 40, 160, 160);
blit(cactusTallImg, 0, 0, 96, 96, 420, 40, 160, 160);

// 2. Draw Workplaces: Workbench & Stockpile
const workbenchImg = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'workbench.png')), 'workbench.png');
const stockpileImg = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'stockpile.png')), 'stockpile.png');
blit(workbenchImg, 0, 0, 48, 48, 620, 70, 100, 100);
blit(stockpileImg, 0, 0, 48, 48, 770, 70, 100, 100);

// 3. Draw Geology & Ores (Row 2, 48x48 at ~1.7x): Granite, Copper, Gold, Ironstone, Rubble, Fallen Pillar, Old Bones
const geos = [
    { file: 'graniteboulder.png', name: 'Granite' },
    { file: 'copperoutcrop.png', name: 'Copper' },
    { file: 'goldoutcrop.png', name: 'Gold' },
    { file: 'ironstonedeposit.png', name: 'Ironstone' },
    { file: 'rubble.png', name: 'Rubble' },
    { file: 'fallenpillar.png', name: 'Pillar' },
    { file: 'oldbones.png', name: 'Bones' },
    { file: 'loosestones.png', name: 'Stones' }
];

for (let i = 0; i < geos.length; i++) {
    const geo = geos[i];
    const geoPath = path.join(ROOT, 'art', 'masters', geo.file);
    if (fs.existsSync(geoPath)) {
        const geoImg = decodePNG(fs.readFileSync(geoPath), geo.file);
        const dx = 40 + i * 112;
        const dy = 320;
        blit(geoImg, 0, 0, 48, 48, dx, dy, 90, 90);
    }
}

const outPath = path.join(ROOT, 'art', 'review', 'nano_banana_batch3_showcase.png');
writePNG(outPath, showW, showH, buf);
console.log('Created Batch 3 showcase at:', outPath);
