'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');
const BRAIN_DIR = 'C:/Users/snewt/.gemini/antigravity/brain/e6a9a54f-2cc6-432e-b7ec-5affda42dd85';

const actionKeys = [
    { key: 'Walk',   label: '1. WALK (Reference Sheet)', file: '$UF_Elf_Male_Walk.png' },
    { key: 'Haul',   label: '2. HAUL (Sack)',            file: '$UF_Elf_Male_Haul.png' },
    { key: 'Attack', label: '3. ATTACK (Sword Slash)',   file: '$UF_Elf_Male_Attack.png' },
    { key: 'Bow',    label: '4. BOW (Zero Arrows)',      file: '$UF_Elf_Male_Bow.png' },
    { key: 'Magic',  label: '5. MAGIC (Chant Only)',     file: '$UF_Elf_Male_Magic.png' },
    { key: 'Work',   label: '6. WORK (Kneel Craft)',     file: '$UF_Elf_Male_Work.png' },
    { key: 'Downed', label: '7. DOWNED (Corpse)',        file: '$UF_Elf_Male_Downed.png' }
];

// Layout: 4 columns across, 2 rows (4 on top row, 3 on bottom row)
// Each sheet is 144x192. At 2x zoom: 288x384 px.
// Card size: 308 wide x 410 tall (with padding and title header)
const cardW = 308;
const cardH = 416;
const boardW = cardW * 4 + 20; // 1252 px
const boardH = cardH * 2 + 20; // 852 px

const boardBuf = Buffer.alloc(boardW * boardH * 4);
for (let i = 0; i < boardBuf.length; i += 4) {
    boardBuf[i] = 16; boardBuf[i+1] = 20; boardBuf[i+2] = 26; boardBuf[i+3] = 255;
}

actionKeys.forEach((item, idx) => {
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    const cardX0 = 10 + col * cardW;
    const cardY0 = 10 + row * cardH;

    // Draw card background
    for (let cy = 0; cy < cardH - 10; cy++) {
        for (let cx = 0; cx < cardW - 10; cx++) {
            const bx = cardX0 + cx;
            const by = cardY0 + cy;
            const dIdx = (by * boardW + bx) * 4;
            boardBuf[dIdx]     = 24;
            boardBuf[dIdx + 1] = 30;
            boardBuf[dIdx + 2] = 40;
            boardBuf[dIdx + 3] = 255;
        }
    }

    // Load sheet
    const sheetPath = path.join(CHAR_DIR, item.file);
    const sheet = decodePNG(fs.readFileSync(sheetPath));

    // Blit sheet at 2x into card (starts at cx = 5, cy = 18)
    for (let sy = 0; sy < 192; sy++) {
        for (let sx = 0; sx < 144; sx++) {
            const sIdx = (sy * 144 + sx) * 4;
            if (sheet.data[sIdx + 3] > 0) {
                for (let dy = 0; dy < 2; dy++) {
                    for (let dx = 0; dx < 2; dx++) {
                        const bx = cardX0 + 5 + sx * 2 + dx;
                        const by = cardY0 + 18 + sy * 2 + dy;
                        const dIdx = (by * boardW + bx) * 4;
                        boardBuf[dIdx]     = sheet.data[sIdx];
                        boardBuf[dIdx + 1] = sheet.data[sIdx + 1];
                        boardBuf[dIdx + 2] = sheet.data[sIdx + 2];
                        boardBuf[dIdx + 3] = 255;
                    }
                }
            }
        }
    }
});

const outPath = path.join(REVIEW_DIR, 'elf_male_all_7_actions_12_sprites.png');
fs.writeFileSync(outPath, writePNG(boardBuf, boardW, boardH));
console.log('Saved 12-sprite grid showcase:', outPath);

fs.copyFileSync(outPath, path.join(BRAIN_DIR, 'elf_male_all_7_actions_12_sprites.png'));
console.log('Copied to brain artifacts.');

