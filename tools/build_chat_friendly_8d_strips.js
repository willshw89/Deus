const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const BRAIN = 'C:/Users/snewt/.gemini/antigravity/brain/e6a9a54f-2cc6-432e-b7ec-5affda42dd85';

const sprites = [
    { file: '$UF_Human_Male_8D.png', out: 'human_walk_8d_strip_3x.png', title: 'Human Settler (38px FF5)' },
    { file: '$UF_Dwarf_Male_8D.png', out: 'dwarf_walk_8d_strip_3x.png', title: 'Dwarf Mountain Folk (36px FF5)' },
    { file: '$UF_Elf_Male_8D.png', out: 'elf_walk_8d_strip_3x.png', title: 'Elf Sylvan Scout (40px FF5)' }
];

const facings = [
    '⬇ S (South)',
    '↙ SW (South-West)',
    '⬅ W (West)',
    '↖ NW (North-West)',
    '⬆ N (North)',
    '↗ NE (North-East)',
    '➡ E (East)',
    '↘ SE (South-East)'
];

const FONT_5X7 = {
    'A': [0x1C, 0x22, 0x22, 0x3E, 0x22, 0x22, 0x22],
    'B': [0x3C, 0x22, 0x22, 0x3C, 0x22, 0x22, 0x3C],
    'C': [0x1E, 0x20, 0x20, 0x20, 0x20, 0x20, 0x1E],
    'D': [0x38, 0x24, 0x22, 0x22, 0x22, 0x24, 0x38],
    'E': [0x3E, 0x20, 0x20, 0x3C, 0x20, 0x20, 0x3E],
    'F': [0x3E, 0x20, 0x20, 0x3C, 0x20, 0x20, 0x20],
    'G': [0x1E, 0x20, 0x20, 0x2E, 0x22, 0x22, 0x1E],
    'H': [0x22, 0x22, 0x22, 0x3E, 0x22, 0x22, 0x22],
    'I': [0x1C, 0x08, 0x08, 0x08, 0x08, 0x08, 0x1C],
    'J': [0x06, 0x02, 0x02, 0x02, 0x22, 0x22, 0x1C],
    'K': [0x22, 0x24, 0x28, 0x30, 0x28, 0x24, 0x22],
    'L': [0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x3E],
    'M': [0x22, 0x36, 0x2A, 0x22, 0x22, 0x22, 0x22],
    'N': [0x22, 0x32, 0x2A, 0x26, 0x22, 0x22, 0x22],
    'O': [0x1C, 0x22, 0x22, 0x22, 0x22, 0x22, 0x1C],
    'P': [0x3C, 0x22, 0x22, 0x3C, 0x20, 0x20, 0x20],
    'Q': [0x1C, 0x22, 0x22, 0x22, 0x2A, 0x24, 0x1A],
    'R': [0x3C, 0x22, 0x22, 0x3C, 0x28, 0x24, 0x22],
    'S': [0x1E, 0x20, 0x20, 0x1C, 0x02, 0x02, 0x3C],
    'T': [0x3E, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08],
    'U': [0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x1C],
    'V': [0x22, 0x22, 0x22, 0x22, 0x22, 0x14, 0x08],
    'W': [0x22, 0x22, 0x22, 0x2A, 0x2A, 0x36, 0x22],
    'X': [0x22, 0x22, 0x14, 0x08, 0x14, 0x22, 0x22],
    'Y': [0x22, 0x22, 0x14, 0x08, 0x08, 0x08, 0x08],
    'Z': [0x3E, 0x02, 0x04, 0x08, 0x10, 0x20, 0x3E],
    '0': [0x1C, 0x26, 0x2A, 0x32, 0x22, 0x22, 0x1C],
    '1': [0x08, 0x18, 0x08, 0x08, 0x08, 0x08, 0x1C],
    '2': [0x1C, 0x22, 0x02, 0x0C, 0x30, 0x20, 0x3E],
    '3': [0x1C, 0x22, 0x02, 0x0C, 0x02, 0x22, 0x1C],
    '4': [0x04, 0x0C, 0x14, 0x24, 0x3E, 0x04, 0x04],
    '5': [0x3E, 0x20, 0x3C, 0x02, 0x02, 0x22, 0x1C],
    '6': [0x1C, 0x20, 0x20, 0x3C, 0x22, 0x22, 0x1C],
    '7': [0x3E, 0x02, 0x04, 0x08, 0x10, 0x10, 0x10],
    '8': [0x1C, 0x22, 0x22, 0x1C, 0x22, 0x22, 0x1C],
    '9': [0x1C, 0x22, 0x22, 0x1E, 0x02, 0x02, 0x1C],
    ':': [0x00, 0x0C, 0x0C, 0x00, 0x0C, 0x0C, 0x00],
    '.': [0x00, 0x00, 0x00, 0x00, 0x00, 0x0C, 0x0C],
    '(': [0x08, 0x10, 0x20, 0x20, 0x20, 0x10, 0x08],
    ')': [0x20, 0x10, 0x08, 0x08, 0x08, 0x10, 0x20],
    '-': [0x00, 0x00, 0x00, 0x3E, 0x00, 0x00, 0x00],
    ' ': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
};

const SCALE = 3;
const CELL = 48 * SCALE; // 144 px
const LABEL_W = 140;
const WIDTH = LABEL_W + (3 * CELL) + 20; // 140 + 432 + 20 = 592 px (perfect chat width!)
const HEADER_H = 44;
const ROW_H = CELL + 8;
const HEIGHT = HEADER_H + (8 * ROW_H) + 16;

sprites.forEach(sp => {
    const png = decodePNG(fs.readFileSync(path.join(CHAR_DIR, sp.file)));
    const canvas = Buffer.alloc(WIDTH * HEIGHT * 4);

    // Fill background dark slate
    for (let i = 0; i < canvas.length; i += 4) {
        canvas[i] = 22; canvas[i+1] = 27; canvas[i+2] = 34; canvas[i+3] = 255;
    }

    function setPixel(x, y, r, g, b, a = 255) {
        if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
        const idx = (y * WIDTH + x) * 4;
        canvas[idx] = r; canvas[idx+1] = g; canvas[idx+2] = b; canvas[idx+3] = a;
    }

    function drawChar(ch, x, y, col) {
        const glyph = FONT_5X7[ch.toUpperCase()] || FONT_5X7[' '];
        for (let row = 0; row < 7; row++) {
            const bits = glyph[row];
            for (let bit = 0; bit < 5; bit++) {
                if ((bits >> (5 - 1 - bit)) & 1) {
                    setPixel(x + bit, y + row, col[0], col[1], col[2]);
                }
            }
        }
    }

    function drawStr(str, x, y, col) {
        let curX = x;
        for (let i = 0; i < str.length; i++) {
            drawChar(str[i], curX, y, col);
            curX += 6;
        }
    }

    // Header
    drawStr(sp.title.toUpperCase() + ' - 8-DIRECTION WALK STRIP', 16, 12, [88, 166, 255]);
    drawStr('STEP 1 (LEFT)', LABEL_W + 36, 28, [139, 148, 158]);
    drawStr('STAND / PASS', LABEL_W + CELL + 36, 28, [210, 153, 34]);
    drawStr('STEP 2 (RIGHT)', LABEL_W + (CELL * 2) + 36, 28, [139, 148, 158]);

    // 8 Facing Rows
    for (let r = 0; r < 8; r++) {
        const rowY = HEADER_H + (r * ROW_H);

        // Label box
        drawStr(facings[r].replace(/[⬇↙⬅↖⬆↗➡↘]/g, ''), 16, rowY + 60, [240, 246, 252]);
        drawStr(`ROW ${r}`, 16, rowY + 74, [139, 148, 158]);

        // 3 Frames
        for (let c = 0; c < 3; c++) {
            const frameX = LABEL_W + (c * CELL);

            // Cell border
            for (let x = frameX; x < frameX + CELL - 4; x++) {
                setPixel(x, rowY, 48, 54, 61);
                setPixel(x, rowY + CELL - 4, 48, 54, 61);
            }
            for (let y = rowY; y < rowY + CELL - 4; y++) {
                setPixel(frameX, y, 48, 54, 61);
                setPixel(frameX + CELL - 4, y, 48, 54, 61);
            }

            // Ground line at row 47
            const groundY = rowY + (47 * SCALE) + 2;
            for (let x = frameX + 4; x < frameX + CELL - 8; x++) {
                setPixel(x, groundY, 63, 185, 80);
            }

            // Draw 48x48 sprite at 3x
            for (let sy = 0; sy < 48; sy++) {
                for (let sx = 0; sx < 48; sx++) {
                    const sIdx = (((r * 48) + sy) * 144 + ((c * 48) + sx)) * 4;
                    const pr = png.data[sIdx];
                    const pg = png.data[sIdx + 1];
                    const pb = png.data[sIdx + 2];
                    const pa = png.data[sIdx + 3];

                    if (pa > 0) {
                        for (let dy = 0; dy < SCALE; dy++) {
                            for (let dx = 0; dx < SCALE; dx++) {
                                setPixel(frameX + (sx * SCALE) + dx, rowY + (sy * SCALE) + dy, pr, pg, pb);
                            }
                        }
                    }
                }
            }
        }
    }

    const outPath = path.join(BRAIN, sp.out);
    writePNG(outPath, WIDTH, HEIGHT, canvas);
    console.log(`Saved: ${outPath} (${WIDTH}x${HEIGHT})`);
});
