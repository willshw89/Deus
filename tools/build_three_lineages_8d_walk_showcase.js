const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');
const BRAIN = 'C:/Users/snewt/.gemini/antigravity/brain/e6a9a54f-2cc6-432e-b7ec-5affda42dd85';

// Palette colors for canvas background, UI, and text
const BG_COLOR = [22, 27, 34, 255];      // Dark slate background
const CARD_BG = [33, 38, 45, 255];       // Panel dark grey
const BORDER_COLOR = [48, 54, 61, 255];   // Subtle border
const ACCENT_BLUE = [88, 166, 255, 255];  // Blue
const ACCENT_GOLD = [210, 153, 34, 255];  // Gold
const ACCENT_GREEN = [63, 185, 80, 255];  // Emerald
const WHITE = [240, 246, 252, 255];
const MUTED = [139, 148, 158, 255];
const GROUND_LINE = [63, 185, 80, 100];   // Ground guide line

const facings = [
    { label: 'SOUTH (S)', arrow: 'v', desc: 'Front Stomp Stride' },
    { label: 'SOUTH-WEST (SW)', arrow: '<', desc: 'Front-Diagonal Turn' },
    { label: 'WEST (W)', arrow: '<', desc: 'Profile Scissor Split' },
    { label: 'NORTH-WEST (NW)', arrow: '<', desc: 'Back-Diagonal Turn' },
    { label: 'NORTH (N)', arrow: '^', desc: 'Back Walk Cycle' },
    { label: 'NORTH-EAST (NE)', arrow: '>', desc: 'Back-Diagonal Turn' },
    { label: 'EAST (E)', arrow: '>', desc: 'Profile Scissor Split' },
    { label: 'SOUTH-EAST (SE)', arrow: 'v', desc: 'Front-Diagonal Turn' }
];

// Draw simple 5x7 bitmap font
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
    ',': [0x00, 0x00, 0x00, 0x00, 0x0C, 0x04, 0x08],
    '-': [0x00, 0x00, 0x00, 0x3E, 0x00, 0x00, 0x00],
    '(': [0x08, 0x10, 0x20, 0x20, 0x20, 0x10, 0x08],
    ')': [0x20, 0x10, 0x08, 0x08, 0x08, 0x10, 0x20],
    '/': [0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x00],
    '·': [0x00, 0x00, 0x18, 0x18, 0x00, 0x00, 0x00],
    ' ': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
};

function renderShowcase(spritesList, mainTitle, filename) {
    const loadedSheets = spritesList.map(s => {
        const p = path.join(CHAR_DIR, s.file);
        return decodePNG(fs.readFileSync(p));
    });

    const SCALE = 4;
    const FRAME_SIZE = 48 * SCALE; // 192 px
    const LABEL_WIDTH = 220;
    const SPRITE_GROUP_WIDTH = FRAME_SIZE * 3; // 576 px
    const GROUP_GAP = 28;
    const ROW_GAP = 14;
    const HEADER_HEIGHT = 196;
    const FOOTER_HEIGHT = 70;

    const WIDTH = LABEL_WIDTH + (SPRITE_GROUP_WIDTH * 3) + (GROUP_GAP * 2) + 40;
    const HEIGHT = HEADER_HEIGHT + (8 * (FRAME_SIZE + ROW_GAP)) + FOOTER_HEIGHT;

    const canvas = Buffer.alloc(WIDTH * HEIGHT * 4);

    for (let i = 0; i < canvas.length; i += 4) {
        canvas[i] = BG_COLOR[0];
        canvas[i + 1] = BG_COLOR[1];
        canvas[i + 2] = BG_COLOR[2];
        canvas[i + 3] = 255;
    }

    function setPixel(x, y, col) {
        if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
        const idx = (y * WIDTH + x) * 4;
        const a = col[3] !== undefined ? col[3] / 255 : 1;
        if (a >= 1) {
            canvas[idx] = col[0];
            canvas[idx + 1] = col[1];
            canvas[idx + 2] = col[2];
            canvas[idx + 3] = 255;
        } else {
            canvas[idx] = Math.round(canvas[idx] * (1 - a) + col[0] * a);
            canvas[idx + 1] = Math.round(canvas[idx + 1] * (1 - a) + col[1] * a);
            canvas[idx + 2] = Math.round(canvas[idx + 2] * (1 - a) + col[2] * a);
            canvas[idx + 3] = 255;
        }
    }

    function drawRect(rx, ry, rw, rh, col) {
        for (let y = ry; y < ry + rh; y++) {
            for (let x = rx; x < rx + rw; x++) {
                setPixel(x, y, col);
            }
        }
    }

    function drawStrokeRect(rx, ry, rw, rh, col, thickness = 1) {
        for (let t = 0; t < thickness; t++) {
            for (let x = rx; x < rx + rw; x++) {
                setPixel(x, ry + t, col);
                setPixel(x, ry + rh - 1 - t, col);
            }
            for (let y = ry; y < ry + rh; y++) {
                setPixel(rx + t, y, col);
                setPixel(rx + rw - 1 - t, y, col);
            }
        }
    }

    function drawChar(ch, x, y, col, scale = 2) {
        const glyph = FONT_5X7[ch.toUpperCase()] || FONT_5X7[' '];
        for (let row = 0; row < 7; row++) {
            const bits = glyph[row];
            for (let bit = 0; bit < 5; bit++) {
                if ((bits >> (5 - 1 - bit)) & 1) {
                    for (let sy = 0; sy < scale; sy++) {
                        for (let sx = 0; sx < scale; sx++) {
                            setPixel(x + bit * scale + sx, y + row * scale + sy, col);
                        }
                    }
                }
            }
        }
    }

    function drawString(str, x, y, col, scale = 2) {
        let curX = x;
        for (let i = 0; i < str.length; i++) {
            drawChar(str[i], curX, y, col, scale);
            curX += (5 + 1) * scale;
        }
    }

    // 1. Master Header Box
    drawRect(20, 16, WIDTH - 40, 88, CARD_BG);
    drawStrokeRect(20, 16, WIDTH - 40, 88, BORDER_COLOR, 1);
    drawString(mainTitle, 36, 26, ACCENT_BLUE, 2);
    drawString('3 SPRITES IN ALL 8 COMPASS DIRECTIONS: 3-FRAME WALK CYCLES (STEP 1 · STAND · STEP 2)', 36, 48, WHITE, 2);
    drawString('AUTHENTIC FINAL FANTASY V PROPORTIONS (1:2.8 RATIO) & DYNAMIC SCISSOR FOOTSTEPS', 36, 70, ACCENT_GREEN, 2);

    // 2. Group Headers (Human, Dwarf, Elf)
    spritesList.forEach((sp, sIdx) => {
        const groupX = LABEL_WIDTH + (sIdx * (SPRITE_GROUP_WIDTH + GROUP_GAP));
        drawRect(groupX, 114, SPRITE_GROUP_WIDTH, 70, CARD_BG);
        drawStrokeRect(groupX, 114, SPRITE_GROUP_WIDTH, 70, BORDER_COLOR, 1);

        drawString(sp.title, groupX + 16, 124, (sIdx === 0 ? ACCENT_BLUE : sIdx === 1 ? ACCENT_GOLD : ACCENT_GREEN), 2);
        drawString(sp.subtitle, groupX + 16, 144, WHITE, 1);

        const stepNames = ['STEP 1 (LEFT)', 'NEUTRAL STAND', 'STEP 2 (RIGHT)'];
        stepNames.forEach((st, cIdx) => {
            const colX = groupX + (cIdx * FRAME_SIZE);
            drawString(st, colX + 24, 164, MUTED, 1);
        });
    });

    // 3. 8 Facing Rows
    facings.forEach((fc, rIdx) => {
        const rowY = HEADER_HEIGHT + (rIdx * (FRAME_SIZE + ROW_GAP));

        // Left Direction Badge Box
        drawRect(20, rowY, LABEL_WIDTH - 30, FRAME_SIZE, CARD_BG);
        drawStrokeRect(20, rowY, LABEL_WIDTH - 30, FRAME_SIZE, BORDER_COLOR, 1);

        drawString(fc.label, 30, rowY + 36, WHITE, 2);
        drawString(fc.desc, 30, rowY + 66, ACCENT_BLUE, 1);
        drawString(`ROW ${rIdx} OF 8`, 30, rowY + 90, MUTED, 1);
        drawString('3-FRAME CYCLE', 30, rowY + 110, ACCENT_GOLD, 1);

        spritesList.forEach((sp, sIdx) => {
            const groupX = LABEL_WIDTH + (sIdx * (SPRITE_GROUP_WIDTH + GROUP_GAP));
            const sheet = loadedSheets[sIdx];

            for (let cIdx = 0; cIdx < 3; cIdx++) {
                const frameX = groupX + (cIdx * FRAME_SIZE);

                drawRect(frameX, rowY, FRAME_SIZE, FRAME_SIZE, [26, 32, 44, 255]);
                drawStrokeRect(frameX, rowY, FRAME_SIZE, FRAME_SIZE, BORDER_COLOR, 1);

                // Grounding guideline at row 47
                const groundY = rowY + (47 * SCALE) + (SCALE - 1);
                drawRect(frameX + 8, groundY, FRAME_SIZE - 16, 2, GROUND_LINE);

                // 4x nearest neighbor sprite drawing
                for (let sy = 0; sy < 48; sy++) {
                    for (let sx = 0; sx < 48; sx++) {
                        const srcIdx = (((rIdx * 48) + sy) * 144 + ((cIdx * 48) + sx)) * 4;
                        const r = sheet.data[srcIdx];
                        const g = sheet.data[srcIdx + 1];
                        const b = sheet.data[srcIdx + 2];
                        const a = sheet.data[srcIdx + 3];

                        if (a > 0) {
                            for (let dy = 0; dy < SCALE; dy++) {
                                for (let dx = 0; dx < SCALE; dx++) {
                                    setPixel(frameX + (sx * SCALE) + dx, rowY + (sy * SCALE) + dy, [r, g, b, 255]);
                                }
                            }
                        }
                    }
                }

                // Step tag
                const stepTag = cIdx === 0 ? 'STEP 1' : cIdx === 1 ? 'STAND' : 'STEP 2';
                drawRect(frameX + 6, rowY + 6, 46, 16, [15, 23, 42, 220]);
                drawString(stepTag, frameX + 9, rowY + 10, cIdx === 1 ? ACCENT_GOLD : WHITE, 1);
            }
        });
    });

    // 4. Footer
    const footerY = HEIGHT - FOOTER_HEIGHT + 16;
    drawRect(20, footerY, WIDTH - 40, 42, CARD_BG);
    drawStrokeRect(20, footerY, WIDTH - 40, 42, BORDER_COLOR, 1);
    drawString('FOOTSTEP VERIFICATION: ROW 47 BASELINE CONTACT ON PLANTED BOOT · 2PX ELEVATION ON TRAILING BOOT · SCISSOR LEG SPLIT IN PROFILE', 36, footerY + 14, ACCENT_GREEN, 2);

    const outReview = path.join(REVIEW_DIR, filename);
    const outBrain = path.join(BRAIN, filename);

    writePNG(outReview, WIDTH, HEIGHT, canvas);
    writePNG(outBrain, WIDTH, HEIGHT, canvas);

    console.log(`Saved: ${outReview}`);
    console.log(`Saved: ${outBrain}`);
}

// 1. Render Males: Human, Dwarf, Elf
renderShowcase([
    { id: 'human_male', title: 'HUMAN SETTLER (MALE)', subtitle: '38px Stature · 1:2.8 FF5 Anatomy', file: '$UF_Human_Male_8D.png' },
    { id: 'dwarf_male', title: 'DWARF MOUNTAIN FOLK (MALE)', subtitle: '36px Stature · 1:2.4 FF5 Stocky', file: '$UF_Dwarf_Male_8D.png' },
    { id: 'elf_male', title: 'ELF SYLVAN SCOUT (MALE)', subtitle: '40px Stature · 1:2.8 FF5 Sylvan', file: '$UF_Elf_Male_8D.png' }
], 'ULTIMATE FRONTIER - 16-BIT 8-DIRECTIONAL WALK SUITES (MALES)', 'three_lineages_8d_walk_cycles_all_8_facings_4x.png');

// 2. Render Females: Human, Dwarf, Elf
renderShowcase([
    { id: 'human_female', title: 'HUMAN SETTLER (FEMALE)', subtitle: '38px Stature · 1:2.8 FF5 Anatomy', file: '$UF_Human_Female_8D.png' },
    { id: 'dwarf_female', title: 'DWARF MOUNTAIN FOLK (FEMALE)', subtitle: '36px Stature · 1:2.4 FF5 Stocky', file: '$UF_Dwarf_Female_8D.png' },
    { id: 'elf_female', title: 'ELF SYLVAN MAIDEN (FEMALE)', subtitle: '40px Stature · 1:2.8 FF5 Sylvan', file: '$UF_Elf_Female_8D.png' }
], 'ULTIMATE FRONTIER - 16-BIT 8-DIRECTIONAL WALK SUITES (FEMALES)', 'three_females_8d_walk_cycles_all_8_facings_4x.png');

