const fs = require('fs');
const path = require('path');
const { readPNG } = require('../png_read');
const { writePNG } = require('../png_util');

const TILES = [
  'meadow_grass',
  'forest_loam',
  'pine_needles',
  'tropical_dirt',
  'marsh_mud',
  'peat_moss',
  'desert_sand',
  'dry_clay',
  'tundra_lichen',
  'snow_field',
  'mountain_scree',
  'granite_bedrock',
  'volcanic_ash',
  'calm_water'
];

// Layout: 7 columns x 2 rows of 2x2 tile patches (each patch is 2x2 = 96x96 px)
// Total width: 7 * 96 = 672 px
// Total height: 2 * 96 = 192 px
const COLS = 7;
const ROWS = 2;
const PATCH_SIZE = 96; // 2x2 tiles of 48px
const W = COLS * PATCH_SIZE;
const H = ROWS * PATCH_SIZE;

const buf = Buffer.alloc(W * H * 4);

function setPx(x, y, r, g, b, a) {
  if (x < 0 || x >= W || y < 0 || y >= H || a === 0) return;
  const idx = (y * W + x) * 4;
  if (a === 255) {
    buf[idx] = r; buf[idx+1] = g; buf[idx+2] = b; buf[idx+3] = 255;
  } else {
    const alpha = a / 255;
    buf[idx] = Math.round(r * alpha + buf[idx] * (1 - alpha));
    buf[idx+1] = Math.round(g * alpha + buf[idx+1] * (1 - alpha));
    buf[idx+2] = Math.round(b * alpha + buf[idx+2] * (1 - alpha));
    buf[idx+3] = 255;
  }
}

function stamp(img, destX, destY) {
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const [r, g, b, a] = img.px(x, y);
      setPx(destX + x, destY + y, r, g, b, a);
    }
  }
}

for (let i = 0; i < TILES.length; i++) {
  const tileName = TILES[i];
  const tilePath = path.resolve(`art/tilesets/individual_48/${tileName}.png`);
  if (!fs.existsSync(tilePath)) {
    console.warn(`Missing tile: ${tilePath}`);
    continue;
  }
  const tileImg = readPNG(tilePath);
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const startX = col * PATCH_SIZE;
  const startY = row * PATCH_SIZE;

  // Stamp 2x2 grid of this tile
  stamp(tileImg, startX, startY);
  stamp(tileImg, startX + 48, startY);
  stamp(tileImg, startX, startY + 48);
  stamp(tileImg, startX + 48, startY + 48);
}

// Write composed showcase image
const outPath = path.resolve('art/tilesets/individual_48/all_biomes_showcase.png');
writePNG(outPath, W, H, buf);
console.log(`Generated all-biomes showcase: ${outPath} (${W}x${H})`);
