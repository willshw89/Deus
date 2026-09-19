const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');

// Load assets
const meadow = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'meadow.png')));
const wallWood = decodePNG(fs.readFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$WallWood_Set.png')));
const wallStone = decodePNG(fs.readFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$WallStone_Set.png')));
const doorWood = decodePNG(fs.readFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Door_Wood.png')));
const doorStone = decodePNG(fs.readFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Door_Stone.png')));
const settler = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'human_male_stand.png')));
const deer = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'deer_idle.png')));

// Dimensions: 10 tiles wide x 5 tiles high (480 x 240 px)
const COLS = 10;
const ROWS = 5;
const WIDTH = COLS * 48;  // 480
const HEIGHT = ROWS * 48; // 240
const buf = Buffer.alloc(WIDTH * HEIGHT * 4);

// 1. Meadow background
for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
        const mx = x % 48;
        const my = y % 48;
        const mo = (my * meadow.width + mx) * 4;
        const o = (y * WIDTH + x) * 4;
        buf[o] = meadow.data[mo];
        buf[o + 1] = meadow.data[mo + 1];
        buf[o + 2] = meadow.data[mo + 2];
        buf[o + 3] = 255;
    }
}

// Blit helper
function blit(src, srcX, srcY, srcW, srcH, dstX, dstY) {
    for (let y = 0; y < srcH; y++) {
        for (let x = 0; x < srcW; x++) {
            const so = ((srcY + y) * src.width + (srcX + x)) * 4;
            const dx = dstX + x;
            const dy = dstY + y;
            if (dx < 0 || dx >= WIDTH || dy < 0 || dy >= HEIGHT) continue;
            const dof = (dy * WIDTH + dx) * 4;
            const a = src.data[so + 3];
            if (a === 255) {
                buf[dof] = src.data[so];
                buf[dof + 1] = src.data[so + 1];
                buf[dof + 2] = src.data[so + 2];
                buf[dof + 3] = 255;
            }
        }
    }
}

// 2. Left side: Wooden palisade wall with closed and open doors
// Wall row at y=1 (rows 48..143: 48x96 wall pieces)
// Piece 10 is straight EW (col 2, row 2 in 4x5 grid -> x=96, y=192 in 192x480 sheet)
const wPiece10X = 96, wPiece10Y = 192;
blit(wallWood, wPiece10X, wPiece10Y, 48, 96, 0 * 48, 48);   // EW wall
blit(doorWood, 0, 0, 48, 48, 1 * 48, 96);                  // Closed wood door
blit(wallWood, wPiece10X, wPiece10Y, 48, 96, 2 * 48, 48);   // EW wall
blit(doorWood, 96, 0, 48, 48, 3 * 48, 96);                 // Open wood door
blit(wallWood, wPiece10X, wPiece10Y, 48, 96, 4 * 48, 48);   // EW wall

// 3. Right side: Stone fortress wall with closed and open doors
const sPiece10X = 96, sPiece10Y = 192;
blit(wallStone, sPiece10X, sPiece10Y, 48, 96, 5 * 48, 48);  // EW stone wall
blit(doorStone, 0, 0, 48, 48, 6 * 48, 96);                 // Closed stone door
blit(wallStone, sPiece10X, sPiece10Y, 48, 96, 7 * 48, 48);  // EW stone wall
blit(doorStone, 96, 0, 48, 48, 8 * 48, 96);                // Open stone door
blit(wallStone, sPiece10X, sPiece10Y, 48, 96, 9 * 48, 48);  // EW stone wall

// 4. Characters:
// Deer outside closed wood door at (1 * 48, 144)
// Deer frame 0 (South stand): 48x48 from deer_idle (x=0, y=0)
blit(deer, 0, 0, 48, 48, 1 * 48, 144);

// Settler walking through open wood door at (3 * 48, 96)
// Settler south stand: x=0, y=0 in 48x384 sheet
blit(settler, 0, 0, 48, 48, 3 * 48, 96);

// Settler walking through open stone door at (8 * 48, 96)
blit(settler, 0, 0, 48, 48, 8 * 48, 96);

// Save 1x
writePNG(path.join(ROOT, 'art', 'review', 'doors_in_walls_showcase_1x.png'), WIDTH, HEIGHT, buf);

// Save 2x
const w2 = WIDTH * 2, h2 = HEIGHT * 2;
const b2 = Buffer.alloc(w2 * h2 * 4);
for (let y = 0; y < h2; y++) {
    const sy = Math.floor(y / 2);
    for (let x = 0; x < w2; x++) {
        const sx = Math.floor(x / 2);
        const so = (sy * WIDTH + sx) * 4;
        const dof = (y * w2 + x) * 4;
        b2[dof] = buf[so]; b2[dof + 1] = buf[so + 1]; b2[dof + 2] = buf[so + 2]; b2[dof + 3] = 255;
    }
}
writePNG(path.join(ROOT, 'art', 'review', 'doors_in_walls_showcase_2x.png'), w2, h2, b2);
console.log('Saved doors in walls showcase.');
