const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');

const freshStrip = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'fresh.png')));
const pondStrip = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'pond.png')));
const saltStrip = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'salt.png')));
const deepStrip = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'deep.png')));
const blightedStrip = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'blighted.png')));

const colonistSheet = decodePNG(fs.readFileSync(path.join(ROOT, 'game', 'img', 'characters', '$UF_Human_Male.png')));
const treeSheet = decodePNG(fs.readFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Oak.png')));

// Canvas: 24 tiles wide x 12 tiles high (1152 x 576)
const COLS = 24, ROWS = 12;
const TILE = 48;
const W = COLS * TILE, H = ROWS * TILE;
const canvas = Buffer.alloc(W * H * 4);

// Fill background with green meadow (#5D7139)
for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
        const di = (y * W + x) * 4;
        const n = ((x * 7 + y * 19) % 13) / 13;
        canvas[di] = Math.round(93 + n * 10);
        canvas[di + 1] = Math.round(113 + n * 12);
        canvas[di + 2] = Math.round(57 + n * 8);
        canvas[di + 3] = 255;
    }
}

// Draw comparison strips for 5 water kinds at the top:
// Each strip is 288x144 (3 frames of 96x144)
const strips = [freshStrip, pondStrip, saltStrip, deepStrip, blightedStrip];

function blitStrip(src, dx, dy) {
    for (let y = 0; y < src.height; y++) {
        for (let x = 0; x < src.width; x++) {
            if (dx + x >= W || dy + y >= H) continue;
            const si = (y * src.width + x) * 4;
            const di = ((dy + y) * W + (dx + x)) * 4;
            canvas[di] = src.data[si];
            canvas[di + 1] = src.data[si + 1];
            canvas[di + 2] = src.data[si + 2];
            canvas[di + 3] = 255;
        }
    }
}

// Display 3 animation frames for fresh, pond, salt, deep side by side
blitStrip(freshStrip, 24, 24);
blitStrip(pondStrip, 336, 24);
blitStrip(saltStrip, 648, 24);

// Bottom half: A natural winding river / lake in meadow
// River crossing from cols 3..9, rows 5..10 using fresh water
for (let r = 5; r < 11; r++) {
    for (let c = 2; c < 8; c++) {
        // Sample from fresh water frame 1 interior (x=120..168, y=72..120)
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const si = ((72 + y) * freshStrip.width + (120 + x)) * 4;
                const di = (((r * TILE) + y) * W + ((c * TILE) + x)) * 4;
                canvas[di] = freshStrip.data[si];
                canvas[di + 1] = freshStrip.data[si + 1];
                canvas[di + 2] = freshStrip.data[si + 2];
                canvas[di + 3] = 255;
            }
        }
    }
}

// Blit a colonist fishing on the bank
function blitSprite(src, sx, sy, sw, sh, dx, dy) {
    for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
            if (dx + x >= W || dy + y >= H) continue;
            const si = ((sy + y) * src.width + (sx + x)) * 4;
            const alpha = src.data[si + 3];
            if (alpha > 50) {
                const di = ((dy + y) * W + (dx + x)) * 4;
                canvas[di] = src.data[si];
                canvas[di + 1] = src.data[si + 1];
                canvas[di + 2] = src.data[si + 2];
                canvas[di + 3] = 255;
            }
        }
    }
}

// Colonist standing on bank at (1, 7) facing east
blitSprite(colonistSheet, 96, 0, 48, 48, 1 * TILE, 7 * TILE);

// Tree at (9, 6)
blitSprite(treeSheet, 0, 0, 96, 96, 9 * TILE, 6 * TILE);

// Save 1x
const out1x = path.join(ROOT, 'art', 'review', 'water_animated_showcase_1x.png');
writePNG(out1x, W, H, canvas);

// Save 3x
const SCALE = 2; // 2x integer scale for manageable preview
const W2 = W * SCALE, H2 = H * SCALE;
const buf2x = Buffer.alloc(W2 * H2 * 4);
for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
        const si = (y * W + x) * 4;
        const r = canvas[si], g = canvas[si + 1], b = canvas[si + 2];
        for (let dy = 0; dy < SCALE; dy++) {
            for (let dx = 0; dx < SCALE; dx++) {
                const di = (((y * SCALE + dy) * W2) + (x * SCALE + dx)) * 4;
                buf2x[di] = r;
                buf2x[di + 1] = g;
                buf2x[di + 2] = b;
                buf2x[di + 3] = 255;
            }
        }
    }
}
const out2x = path.join(ROOT, 'art', 'review', 'water_animated_showcase_2x.png');
writePNG(out2x, W2, H2, buf2x);
console.log('Water animated showcase written: 1x and 2x!');

