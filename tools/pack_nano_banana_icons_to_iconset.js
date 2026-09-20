const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const ICONSET_FILE = path.join(ROOT, 'game', 'img', 'system', 'IconSet.png');

const iconNames = [
    "log", "dressed_stone", "stone", "copper_ore",
    "gold_ore", "apple", "berries", "wheat",
    "herbs", "pickaxe", "axe", "sword",
    "bow", "campfire", "crystal", "potion"
];

// Read existing IconSet
const iconSetImg = decodePNG(fs.readFileSync(ICONSET_FILE), 'IconSet.png');
const outBuf = Buffer.from(iconSetImg.data);

// Also create 32x32 icon files for each
for (let i = 0; i < iconNames.length; i++) {
    const name = iconNames[i];
    const icon48Path = path.join(ROOT, 'art', 'masters', `${name}_icon.png`);
    if (!fs.existsSync(icon48Path)) continue;
    const icon48 = decodePNG(fs.readFileSync(icon48Path), `${name}_icon.png`);

    const icon32Buf = Buffer.alloc(32 * 32 * 4);
    for (let y = 0; y < 32; y++) {
        const srcY = Math.min(47, Math.floor(y * 48 / 32));
        for (let x = 0; x < 32; x++) {
            const srcX = Math.min(47, Math.floor(x * 48 / 32));
            const sidx = (srcY * 48 + srcX) * 4;
            const didx = (y * 32 + x) * 4;
            if (icon48.data[sidx + 3] > 128) {
                icon32Buf[didx] = icon48.data[sidx];
                icon32Buf[didx + 1] = icon48.data[sidx + 1];
                icon32Buf[didx + 2] = icon48.data[sidx + 2];
                icon32Buf[didx + 3] = 255;
            }
        }
    }

    const icon32Path = path.join(ROOT, 'art', 'masters', `${name}_icon_32.png`);
    writePNG(icon32Path, 32, 32, icon32Buf);

    // Blit to IconSet at slot 320 + i (row 20)
    const slot = 320 + i;
    const col = slot % 16;
    const row = Math.floor(slot / 16);
    const ox = col * 32;
    const oy = row * 32;

    for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
            const sidx = (y * 32 + x) * 4;
            const didx = ((oy + y) * iconSetImg.width + (ox + x)) * 4;
            if (icon32Buf[sidx + 3] > 128) {
                outBuf[didx] = icon32Buf[sidx];
                outBuf[didx + 1] = icon32Buf[sidx + 1];
                outBuf[didx + 2] = icon32Buf[sidx + 2];
                outBuf[didx + 3] = 255;
            }
        }
    }
}

writePNG(ICONSET_FILE, iconSetImg.width, iconSetImg.height, outBuf);
writePNG(path.join(ROOT, 'art', 'masters', 'IconSet.png'), iconSetImg.width, iconSetImg.height, outBuf);
console.log('Successfully packed 16 Nano Banana 2 icons into IconSet.png!');
