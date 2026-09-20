const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');

// Load master floor blocks (96x144 each)
const woodBlock = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'floor_wood.png')));
const stoneBlock = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'floor_stone.png')));
const rushBlock = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'floor_rushes.png')));

// Load bed, item, colonist, wall, door
const bedSheet = decodePNG(fs.readFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Straw_Bed.png')));
const colonistSheet = decodePNG(fs.readFileSync(path.join(ROOT, 'game', 'img', 'characters', '$UF_Human_Male.png')));
const woodWallSheet = decodePNG(fs.readFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$WallWood_Set.png')));
const woodDoorSheet = decodePNG(fs.readFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Door_Wood.png')));

// Render 1x composite
// 3 rooms side by side, each 7x7 tiles (5x5 interior room surrounded by 1 tile dirt/walls)
// Total tiles: 23 across x 9 down
// Canvas width: 23 * 48 = 1104, height: 9 * 48 = 432
const COLS = 23, ROWS = 9;
const TILE = 48;
const W = COLS * TILE, H = ROWS * TILE;
const canvas = Buffer.alloc(W * H * 4);

// Fill with dirt background (warm earthy tone #554128)
for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
        const idx = (y * W + x) * 4;
        const n = ((x * 13 + y * 29) % 17) / 17;
        canvas[idx] = Math.round(85 + n * 12);
        canvas[idx + 1] = Math.round(65 + n * 10);
        canvas[idx + 2] = Math.round(40 + n * 8);
        canvas[idx + 3] = 255;
    }
}

function blitQuarter(src, sx, sy, dx, dy) {
    for (let y = 0; y < 24; y++) {
        for (let x = 0; x < 24; x++) {
            const si = ((sy + y) * src.width + (sx + x)) * 4;
            const di = ((dy + y) * W + (dx + x)) * 4;
            canvas[di] = src.data[si];
            canvas[di + 1] = src.data[si + 1];
            canvas[di + 2] = src.data[si + 2];
            canvas[di + 3] = 255;
        }
    }
}

// Draw autotile cell at tile coord (tx, ty) given neighbor mask
// In RMMZ A2 block (96x144):
// Center interior: NW=(24,72), NE=(48,72), SW=(24,96), SE=(48,96)
// North edge: NW=(24,48), NE=(48,48)
// South edge: NW=(24,120), NE=(48,120)
// West edge: NW=(0,72), SW=(0,96)
// East edge: NE=(72,72), SE=(72,96)
// Outer corners: NW=(0,48), NE=(72,48), SW=(0,120), SE=(72,120)
// Inner corner notches on top-right tile (48..95, 0..47): NW=(48,0), NE=(72,0), SW=(48,24), SE=(72,24)
function drawFloorTile(src, tx, ty, nwEdge, neEdge, swEdge, seEdge) {
    const px = tx * TILE, py = ty * TILE;
    // NW quarter (px, py)
    if (nwEdge.n && nwEdge.w) blitQuarter(src, 0, 48, px, py);
    else if (nwEdge.n) blitQuarter(src, 24, 48, px, py);
    else if (nwEdge.w) blitQuarter(src, 0, 72, px, py);
    else if (nwEdge.corner) blitQuarter(src, 48, 0, px, py);
    else blitQuarter(src, 24, 72, px, py);

    // NE quarter (px+24, py)
    if (neEdge.n && neEdge.e) blitQuarter(src, 72, 48, px + 24, py);
    else if (neEdge.n) blitQuarter(src, 48, 48, px + 24, py);
    else if (neEdge.e) blitQuarter(src, 72, 72, px + 24, py);
    else if (neEdge.corner) blitQuarter(src, 72, 0, px + 24, py);
    else blitQuarter(src, 48, 72, px + 24, py);

    // SW quarter (px, py+24)
    if (swEdge.s && swEdge.w) blitQuarter(src, 0, 120, px, py + 24);
    else if (swEdge.s) blitQuarter(src, 24, 120, px, py + 24);
    else if (swEdge.w) blitQuarter(src, 0, 96, px, py + 24);
    else if (swEdge.corner) blitQuarter(src, 48, 24, px, py + 24);
    else blitQuarter(src, 24, 96, px, py + 24);

    // SE quarter (px+24, py+24)
    if (seEdge.s && seEdge.e) blitQuarter(src, 72, 120, px + 24, py + 24);
    else if (seEdge.s) blitQuarter(src, 48, 120, px + 24, py + 24);
    else if (seEdge.e) blitQuarter(src, 72, 96, px + 24, py + 24);
    else if (seEdge.corner) blitQuarter(src, 72, 24, px + 24, py + 24);
    else blitQuarter(src, 48, 96, px + 24, py + 24);
}

function renderRoom(src, startCol, startRow) {
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            const tx = startCol + c;
            const ty = startRow + r;
            const isNorth = (r === 0);
            const isSouth = (r === 4);
            const isWest = (c === 0);
            const isEast = (c === 4);

            const nw = { n: isNorth, w: isWest, corner: false };
            const ne = { n: isNorth, e: isEast, corner: false };
            const sw = { s: isSouth, w: isWest, corner: false };
            const se = { s: isSouth, e: isEast, corner: false };

            drawFloorTile(src, tx, ty, nw, ne, sw, se);
        }
    }
}

// Render Room 1: Wood Plank Floor (cols 1..5, rows 2..6)
renderRoom(woodBlock, 1, 2);
// Render Room 2: Fitted Stone Flagstone (cols 8..12, rows 2..6)
renderRoom(stoneBlock, 8, 2);
// Render Room 3: Woven Rush Matting (cols 15..19, rows 2..6)
renderRoom(rushBlock, 15, 2);

function blitSprite(src, sx, sy, sw, sh, dx, dy) {
    for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
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

// Add furniture and inhabitants to each room to test contrast & legibility
// Room 1 (Wood): Straw bed at (2, 3), Colonist at (4, 4), Door at (3, 6)
blitSprite(bedSheet, 0, 0, 48, 48, 2 * TILE, 3 * TILE);
blitSprite(colonistSheet, 48, 0, 48, 48, 4 * TILE, 4 * TILE);
blitSprite(woodDoorSheet, 0, 0, 48, 48, 3 * TILE, 6 * TILE);

// Room 2 (Stone): Bed at (9, 3), Colonist at (11, 4)
blitSprite(bedSheet, 0, 0, 48, 48, 9 * TILE, 3 * TILE);
blitSprite(colonistSheet, 48, 0, 48, 48, 11 * TILE, 4 * TILE);

// Room 3 (Rushes): Bed at (16, 3), Colonist at (18, 4)
blitSprite(bedSheet, 0, 0, 48, 48, 16 * TILE, 3 * TILE);
blitSprite(colonistSheet, 48, 0, 48, 48, 18 * TILE, 4 * TILE);

// Write 1x review
const out1x = path.join(ROOT, 'art', 'review', 'floors_showcase_1x.png');
writePNG(out1x, W, H, canvas);

// Write 3x review
const SCALE = 3;
const W3 = W * SCALE, H3 = H * SCALE;
const buf3x = Buffer.alloc(W3 * H3 * 4);
for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
        const si = (y * W + x) * 4;
        const r = canvas[si], g = canvas[si + 1], b = canvas[si + 2];
        for (let dy = 0; dy < SCALE; dy++) {
            for (let dx = 0; dx < SCALE; dx++) {
                const di = (((y * SCALE + dy) * W3) + (x * SCALE + dx)) * 4;
                buf3x[di] = r;
                buf3x[di + 1] = g;
                buf3x[di + 2] = b;
                buf3x[di + 3] = 255;
            }
        }
    }
}
const out3x = path.join(ROOT, 'art', 'review', 'floors_showcase_3x.png');
writePNG(out3x, W3, H3, buf3x);
console.log('Floors showcase generated: 1x and 3x!');

