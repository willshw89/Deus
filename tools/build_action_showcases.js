const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const CHAR_DIR = path.join(__dirname, '..', 'game', 'img', 'characters');
const OUT_DIR = 'C:\\Users\\snewt\\.gemini\\antigravity\\brain\\e6a9a54f-2cc6-432e-b7ec-5affda42dd85';

// We will build a high-resolution showcase:
// Rows: Selected Creatures (Human Male, Dwarf Male, Elf Male, Orc Male, Goblin Male, Gnome Male, Boar, Wolf, Bear, Troll)
// Columns: 8 Compass Directions (S, SW, W, NW, N, NE, E, SE)
// For each creature & direction, we show a composite cell displaying:
// [Walk Frame 0, Work Frame 1, Melee Attack Frame 1, Ranged Attack Frame 1, Magic Cast Frame 1]

const SHOWCASE_CREATURES = [
    { name: 'Human Male', file: '$UF_Human_Male_AR600.png', fw: 48, fh: 48 },
    { name: 'Dwarf Male', file: '$UF_Dwarf_Male_AR600.png', fw: 48, fh: 48 },
    { name: 'Elf Male', file: '$UF_Elf_Male_AR600.png', fw: 48, fh: 48 },
    { name: 'Orc Male', file: '$UF_Orc_Male_AR600.png', fw: 48, fh: 48 },
    { name: 'Goblin Male', file: '$UF_Goblin_Male_AR600.png', fw: 48, fh: 48 },
    { name: 'Gnome Male', file: '$UF_Gnome_Male_AR600.png', fw: 48, fh: 48 },
    { name: 'Boar', file: '$UF_Boar_AR600.png', fw: 48, fh: 48 },
    { name: 'Wolf', file: '$UF_Wolf_AR600.png', fw: 48, fh: 48 },
    { name: 'Bear', file: '$UF_Bear_AR600.png', fw: 48, fh: 48 }
];

const FACINGS = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'];
// Columns to sample from AR600:
// 1: Walk, 5: Work (active stroke), 9: Melee Attack (active slash), 12: Magic Cast (surge)
const ACTION_COLS = [1, 5, 9, 12];
const ACTION_NAMES = ['Walk', 'Work', 'Attack', 'Cast'];

// Each tile is 48x48. Scaled 2x = 96x96 per frame.
// 4 actions per direction = 4 * 96 = 384 px wide per direction cell.
// But let's keep it compact: 1x native resolution or 2x:
// Let's create an action review strip for the 3 main lineages + orc + goblin + wildlife:
// Width: 8 directions * (4 actions * 48) = 8 * 192 = 1536 px wide.
// Height: 9 creatures * 56 px (48 + 8 padding) + 40 header = ~544 px.

const SCALE = 2; // 2x nearest-neighbor for crisp viewing
const CELL_W = 48 * ACTION_COLS.length * SCALE; // 48 * 4 * 2 = 384 px per facing
const CELL_H = 48 * SCALE; // 96 px
const PAD_X = 12, PAD_Y = 16;
const HEADER_H = 48;
const LABEL_W = 160;

const TOTAL_W = LABEL_W + (CELL_W + PAD_X) * 8 + PAD_X;
const TOTAL_H = HEADER_H + (CELL_H + PAD_Y) * SHOWCASE_CREATURES.length + PAD_Y;

const outBuf = Buffer.alloc(TOTAL_W * TOTAL_H * 4);

// Background: warm dark slate #1a1e24
for (let i = 0; i < outBuf.length; i += 4) {
    outBuf[i] = 26;
    outBuf[i + 1] = 30;
    outBuf[i + 2] = 36;
    outBuf[i + 3] = 255;
}

function blit(src, srcW, srcH, sx, sy, sw, sh, dx, dy, scale = 1) {
    for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
            const sIdx = (((sy + y) * srcW) + (sx + x)) * 4;
            if (src[sIdx + 3] === 0) continue;
            for (let sy_ = 0; sy_ < scale; sy_++) {
                for (let sx_ = 0; sx_ < scale; sx_++) {
                    const tx = dx + x * scale + sx_;
                    const ty = dy + y * scale + sy_;
                    if (tx >= 0 && tx < TOTAL_W && ty >= 0 && ty < TOTAL_H) {
                        const dIdx = (ty * TOTAL_W + tx) * 4;
                        outBuf[dIdx] = src[sIdx];
                        outBuf[dIdx + 1] = src[sIdx + 1];
                        outBuf[dIdx + 2] = src[sIdx + 2];
                        outBuf[dIdx + 3] = 255;
                    }
                }
            }
        }
    }
}

console.log(`Generating visual showcase (${TOTAL_W}x${TOTAL_H})...`);

SHOWCASE_CREATURES.forEach((c, cIdx) => {
    const p = path.join(CHAR_DIR, c.file);
    if (!fs.existsSync(p)) return;
    const img = decodePNG(fs.readFileSync(p));
    const sheetW = img.width;

    const rowY = HEADER_H + cIdx * (CELL_H + PAD_Y);

    for (let r = 0; r < 8; r++) {
        const facingX = LABEL_W + r * (CELL_W + PAD_X);

        ACTION_COLS.forEach((col, aIdx) => {
            const fx = facingX + aIdx * (48 * SCALE);
            blit(img.data, sheetW, img.height, col * 48, r * 48, 48, 48, fx, rowY, SCALE);
        });
    }
});

const outPath = path.join(OUT_DIR, 'all_creatures_8d_actions_matrix.png');
writePNG(outPath, TOTAL_W, TOTAL_H, outBuf);
console.log(`Saved showcase to ${outPath}`);
