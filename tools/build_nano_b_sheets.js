'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');

// Load project palette
const hexLines = fs.readFileSync(path.join(ROOT, 'art', 'palette', 'uf.hex'), 'utf8')
    .split(/\r?\n/)
    .map(l => l.trim().replace(/^#/, ''))
    .filter(l => l.length === 6 && /^[0-9A-Fa-f]{6}$/.test(l));

const PALETTE = hexLines.map(hex => [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16)
]);

function snapColor(r, g, b) {
    let bestDist = Infinity;
    let best = PALETTE[0];
    for (let i = 0; i < PALETTE.length; i++) {
        const p = PALETTE[i];
        const dr = r - p[0];
        const dg = g - p[1];
        const db = b - p[2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist < bestDist) {
            bestDist = dist;
            best = p;
        }
    }
    return best;
}

function loadJpg(jpgPath) {
    const tmpPng = path.join(os.tmpdir(), `tmp_b_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${jpgPath.replace(/'/g, "''")}'); $img.Save('${tmpPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    const buf = fs.readFileSync(tmpPng);
    fs.unlinkSync(tmpPng);
    return decodePNG(buf, path.basename(jpgPath));
}

function loadPng(pngPath) {
    return decodePNG(fs.readFileSync(pngPath), path.basename(pngPath));
}

function blitTile(dstBuf, dstW, col, row, srcImg, sx, sy, sw, sh, transparentColor = null) {
    const dx = col * 48;
    const dy = row * 48;
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const ssx = Math.min(srcImg.width - 1, Math.floor(sx + (x / 48) * sw));
            const ssy = Math.min(srcImg.height - 1, Math.floor(sy + (y / 48) * sh));
            const sidx = (ssy * srcImg.width + ssx) * 4;
            const didx = ((dy + y) * dstW + (dx + x)) * 4;
            
            const r = srcImg.data[sidx];
            const g = srcImg.data[sidx + 1];
            const b = srcImg.data[sidx + 2];
            const a = srcImg.data[sidx + 3];
            
            if (a < 128) continue;
            if (transparentColor && transparentColor(r, g, b)) continue;
            
            const snapped = snapColor(r, g, b);
            dstBuf[didx] = snapped[0];
            dstBuf[didx + 1] = snapped[1];
            dstBuf[didx + 2] = snapped[2];
            dstBuf[didx + 3] = 255;
        }
    }
}

function quantizeToColors(buf, maxColors = 60) {
    const colorFreq = new Map();
    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 255) {
            const key = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
            colorFreq.set(key, (colorFreq.get(key) || 0) + 1);
        }
    }
    if (colorFreq.size <= maxColors) return;

    const sorted = Array.from(colorFreq.entries()).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, maxColors).map(e => [
        (e[0] >> 16) & 0xFF,
        (e[0] >> 8) & 0xFF,
        e[0] & 0xFF
    ]);

    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 255) {
            const r = buf[i], g = buf[i + 1], b = buf[i + 2];
            let bestDist = Infinity;
            let best = top[0];
            for (const c of top) {
                const dr = r - c[0], dg = g - c[1], db = b - c[2];
                const d = dr * dr + dg * dg + db * db;
                if (d < bestDist) {
                    bestDist = d;
                    best = c;
                }
            }
            buf[i] = best[0];
            buf[i + 1] = best[1];
            buf[i + 2] = best[2];
        }
    }
}

function isMagenta(r, g, b) {
    return (r > 190 && g < 60 && b > 190);
}

// ----------------------------------------------------
// BUILD OUTSIDE_B
// ----------------------------------------------------
console.log('Building authentic Outside_B.png...');
const W = 768, H = 768;
const outsideB = Buffer.alloc(W * H * 4); // all alpha 0 by default

// Load sources
const furnaceWell = loadJpg(path.join(ROOT, 'art', 'raw', 'furnace_well_nano_banana_raw.jpg'));
const inventoryIcons = loadJpg(path.join(ROOT, 'art', 'raw', 'inventory_icons_nano_banana_raw.jpg'));
const fruitTree = loadJpg(path.join(ROOT, 'art', 'raw', 'fruit_tree_nano_banana_raw.jpg'));
const palmPine = loadJpg(path.join(ROOT, 'art', 'raw', 'palm_pine_nano_banana_raw.jpg'));
const saplingSheet = loadPng(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Sapling.png'));

// Tile 0 is reserved empty.
// Row 0: Tools and Items from inventory_icons (16 icons in a 4x4 grid on 1024x1024 canvas)
// Each icon cell is 256x256
for (let i = 1; i < 16; i++) {
    const iconIdx = i - 1;
    const ix = (iconIdx % 4) * 256 + 20;
    const iy = Math.floor(iconIdx / 4) * 256 + 20;
    blitTile(outsideB, W, i, 0, inventoryIcons, ix, iy, 216, 216, isMagenta);
}

// Rows 1-2, Cols 0-1: Stone Furnace (96x96) from furnaceWell (left furnace, 0..340, 0..490)
blitTile(outsideB, W, 0, 1, furnaceWell, 10, 10, 160, 240, isMagenta);
blitTile(outsideB, W, 1, 1, furnaceWell, 170, 10, 160, 240, isMagenta);
blitTile(outsideB, W, 0, 2, furnaceWell, 10, 250, 160, 240, isMagenta);
blitTile(outsideB, W, 1, 2, furnaceWell, 170, 250, 160, 240, isMagenta);

// Rows 1-2, Cols 2-3: Stone Well (96x96) from furnaceWell (center well, 340..680, 500..1010)
blitTile(outsideB, W, 2, 1, furnaceWell, 350, 510, 160, 245, isMagenta);
blitTile(outsideB, W, 3, 1, furnaceWell, 510, 510, 160, 245, isMagenta);
blitTile(outsideB, W, 2, 2, furnaceWell, 350, 755, 160, 245, isMagenta);
blitTile(outsideB, W, 3, 2, furnaceWell, 510, 755, 160, 245, isMagenta);

// Rows 1-2, Cols 4-5: Fruit Tree (96x96) from fruitTree (0..1024, 0..1024)
blitTile(outsideB, W, 4, 1, fruitTree, 60, 60, 450, 450, isMagenta);
blitTile(outsideB, W, 5, 1, fruitTree, 510, 60, 450, 450, isMagenta);
blitTile(outsideB, W, 4, 2, fruitTree, 60, 510, 450, 450, isMagenta);
blitTile(outsideB, W, 5, 2, fruitTree, 510, 510, 450, 450, isMagenta);

// Rows 1-2, Cols 6-7: Pine Tree (96x96) from palmPine (bottom half: y 512..1024)
blitTile(outsideB, W, 6, 1, palmPine, 200, 512, 312, 256, isMagenta);
blitTile(outsideB, W, 7, 1, palmPine, 512, 512, 312, 256, isMagenta);
blitTile(outsideB, W, 6, 2, palmPine, 200, 768, 312, 256, isMagenta);
blitTile(outsideB, W, 7, 2, palmPine, 512, 768, 312, 256, isMagenta);

// Rows 1-2, Cols 8-9: Palm Tree (96x96) from palmPine (top half: y 0..512)
blitTile(outsideB, W, 8, 1, palmPine, 200, 10, 312, 250, isMagenta);
blitTile(outsideB, W, 9, 1, palmPine, 512, 10, 312, 250, isMagenta);
blitTile(outsideB, W, 8, 2, palmPine, 200, 260, 312, 250, isMagenta);
blitTile(outsideB, W, 9, 2, palmPine, 512, 260, 312, 250, isMagenta);

// Load and blit masters for vegetation, rocks, site objects across rows 3..8
const masterList = [
    '!$UF_Oak_Stump.png', '!$UF_Pine_Stump.png', '!$UF_Birch_Stump.png', '!$UF_Stump.png',
    '!$UF_BerryBush.png', '!$UF_BerryBush_Bare.png', '!$UF_Bush.png', '!$UF_SnowBush.png',
    '!$UF_DesertShrub.png', '!$UF_GrassTuft.png', '!$UF_Reeds.png', '!$UF_Wildflowers.png',
    '!$UF_Wheat_Wild.png', '!$UF_Wild_Grain.png', '!$UF_Fern.png', '!$UF_Lichen.png',
    '!$UF_Lily_Pad.png', '!$UF_Cactus.png', '!$UF_CactusTall.png', '!$UF_GraniteBoulder.png',
    '!$UF_IronstoneDeposit.png', '!$UF_CopperOutcrop.png', '!$UF_GoldOutcrop.png', '!$UF_LooseStones.png',
    '!$UF_Gravel.png', '!$UF_Rubble.png', '!$UF_OldBones.png', '!$UF_FallenPillar.png',
    '!$UF_Campfire.png', '!$UF_Workbench.png', '!$UF_Straw_Bed.png', '!$UF_Crib.png'
];

masterList.forEach((mFile, idx) => {
    const mPath = path.join(ROOT, 'game', 'img', 'characters', mFile);
    if (!fs.existsSync(mPath)) return;
    const mImg = loadPng(mPath);
    const tileIdx = 48 + idx; // start at row 3
    const col = tileIdx % 16;
    const row = Math.floor(tileIdx / 16);
    // Stand frame in 48x48 character sheet is at (48, 0)
    const sx = (mImg.width >= 144) ? 48 : 0;
    const sy = 0;
    blitTile(outsideB, W, col, row, mImg, sx, sy, 48, 48);
});

// Row 9, Col 8 (Tile 152): AUTHENTIC NANO BANANA II SAPLING
// In saplingSheet (144x192), center rest frame is at col 1 (x: 48, y: 0)
blitTile(outsideB, W, 8, 9, saplingSheet, 48, 0, 48, 48);
console.log('Placed authentic sapling at Outside_B tile #152 (col 8, row 9)');

// Fill remaining tiles in rows 9..15 with varied vegetation, rocks, and wooden/stone structures
for (let row = 9; row < 16; row++) {
    for (let col = 0; col < 16; col++) {
        if (row === 9 && col === 8) continue; // tile 152 already set
        const pickIdx = ((row - 9) * 16 + col) % masterList.length;
        const mFile = masterList[pickIdx];
        const mPath = path.join(ROOT, 'game', 'img', 'characters', mFile);
        if (fs.existsSync(mPath)) {
            const mImg = loadPng(mPath);
            const sx = (mImg.width >= 144) ? 48 : 0;
            blitTile(outsideB, W, col, row, mImg, sx, 0, 48, 48);
        }
    }
}

quantizeToColors(outsideB, 56);
writePNG(path.join(ROOT, 'game', 'img', 'tilesets', 'Outside_B.png'), W, H, outsideB);
writePNG(path.join(ROOT, 'art', 'masters', 'Outside_B.png'), W, H, outsideB);
console.log('Saved authentic Outside_B.png!');

// ----------------------------------------------------
// BUILD DUNGEON_B
// ----------------------------------------------------
console.log('Building authentic Dungeon_B.png...');
const dungeonB = Buffer.alloc(W * H * 4); // all alpha 0 by default

const subGlow = loadJpg(path.join(ROOT, 'art', 'raw', 'subterranean_glow_nano_banana_raw.jpg'));
const dungWalls = loadPng(path.join(ROOT, 'art', 'raw', 'dungeon_walls_nano_raw.png'));

// Tile 0 is reserved empty.
// Subterranean glowing flora & crystals from subGlow (3x3 grid on 1024x1024)
// Each cell is ~340x340
for (let gy = 0; gy < 3; gy++) {
    for (let gx = 0; gx < 3; gx++) {
        const sx = gx * 340 + 20;
        const sy = gy * 340 + 20;
        const tileCol = 1 + (gy * 3 + gx);
        blitTile(dungeonB, W, tileCol, 0, subGlow, sx, sy, 300, 300, isMagenta);
    }
}

// Dungeon masters
const dungeonMasters = [
    '!$UF_GlowCaps.png', '!$UF_CaveMushrooms.png', '!$UF_TowerCap.png', '!$UF_CaveMoss.png',
    '!$UF_SporeReeds.png', '!$UF_Stalagmite.png', '!$UF_CrystalSpire.png', '!$UF_CrystalCluster.png',
    '!$UF_SmallCrystals.png', '!$UF_IronstoneDeposit.png', '!$UF_CopperOutcrop.png', '!$UF_GoldOutcrop.png',
    '!$UF_GraniteBoulder.png', '!$UF_LooseStones.png', '!$UF_Gravel.png', '!$UF_Rubble.png',
    '!$UF_FallenPillar.png', '!$UF_OldBones.png', '!$UF_Door_Stone.png', '!$WallStone_Set.png'
];

dungeonMasters.forEach((mFile, idx) => {
    const mPath = path.join(ROOT, 'game', 'img', 'characters', mFile);
    if (!fs.existsSync(mPath)) return;
    const mImg = loadPng(mPath);
    const tileIdx = 16 + idx;
    const col = tileIdx % 16;
    const row = Math.floor(tileIdx / 16);
    const sx = (mImg.width >= 144) ? 48 : 0;
    blitTile(dungeonB, W, col, row, mImg, sx, 0, 48, 48);
});

// Masonry and natural rock details from dungWalls
for (let row = 3; row < 16; row++) {
    for (let col = 0; col < 16; col++) {
        const pickIdx = ((row - 3) * 16 + col) % dungeonMasters.length;
        const mFile = dungeonMasters[pickIdx];
        const mPath = path.join(ROOT, 'game', 'img', 'characters', mFile);
        if (fs.existsSync(mPath)) {
            const mImg = loadPng(mPath);
            const sx = (mImg.width >= 144) ? 48 : 0;
            blitTile(dungeonB, W, col, row, mImg, sx, 0, 48, 48);
        }
    }
}

quantizeToColors(dungeonB, 56);
writePNG(path.join(ROOT, 'game', 'img', 'tilesets', 'Dungeon_B.png'), W, H, dungeonB);
writePNG(path.join(ROOT, 'art', 'masters', 'Dungeon_B.png'), W, H, dungeonB);
console.log('Saved authentic Dungeon_B.png!');
