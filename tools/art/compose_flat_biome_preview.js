const fs = require('fs');
const path = require('path');
const { readPNG } = require('../png_read');
const { writePNG } = require('../png_util');

const loam = readPNG('art/tilesets/individual_48/forest_loam.png');
const grass = readPNG('art/tilesets/individual_48/meadow_grass.png');
const bedrock = readPNG('art/tilesets/individual_48/granite_bedrock.png');
const mud = readPNG('art/tilesets/individual_48/marsh_mud.png');
const actor = readPNG('game/img/characters/$UF_Stock_Actor1_0.png');
const boulder = readPNG('C:/Users/snewt/.deus_worktrees/lane-cd/art/masters/source_sets/SURFACE_SHARED_STONE_GRANITE-BOULDER_V1_DEFAULT/variant_0.png');
const rocks = readPNG('C:/Users/snewt/.deus_worktrees/lane-cd/art/masters/source_sets/ALL_SHARED_STONE_ROCKS-SMALL_V1_DEFAULT/variant_0.png');

// Create a composed map preview: 8 tiles wide x 4 tiles high (384 x 192 px)
const W = 384, H = 192;
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

function stampCrop(img, srcX, srcY, w, h, destX, destY) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = img.px(srcX + x, srcY + y);
      setPx(destX + x, destY + y, r, g, b, a);
    }
  }
}

// Tile 8x4 grid:
// Top half: Grass on left, Forest Loam on right
// Bottom half: Granite Bedrock on left, Marsh Mud on right
for (let ty = 0; ty < 4; ty++) {
  for (let tx = 0; tx < 8; tx++) {
    let tile = grass;
    if (ty < 2) {
      tile = tx < 4 ? grass : loam;
    } else {
      tile = tx < 4 ? bedrock : mud;
    }
    stamp(tile, tx * 48, ty * 48);
  }
}

// Place Actor at tile (1, 1) on grass (single 48x48 frame, column 1, row 0)
stampCrop(actor, 48, 0, 48, 48, 1 * 48, 1 * 48);

// Place Granite Boulder at tile (2, 1) on grass
stamp(boulder, 2 * 48, 1 * 48);

// Place Loose Stones at tile (5, 1) on forest loam
stamp(rocks, 5 * 48, 1 * 48);

// Place Actor on bedrock at tile (1, 2)
stampCrop(actor, 48, 0, 48, 48, 1 * 48, 2 * 48);

// Place Boulder on bedrock at tile (2, 2)
stamp(boulder, 2 * 48, 2 * 48);

// Place Loose Stones on marsh mud at tile (6, 2)
stamp(rocks, 6 * 48, 2 * 48);

const outPng = 'art/tilesets/individual_48/flat_biome_scene_preview.png';
writePNG(outPng, W, H, buf);
console.log('Saved flat biome scene preview to', outPng);
