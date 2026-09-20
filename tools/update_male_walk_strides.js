'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const {
    extractFrameFromCell,
    mirrorFrame,
    assemble12SpriteSheet,
    saveSheetAndSidecar
} = require('./build_pro_human_male');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');

const imgWalk = decodePNG(fs.readFileSync('art/raw/human_male_pro_4d_walk.png'));
const imgHaul = decodePNG(fs.readFileSync('art/raw/human_male_pro_4d_haul.png'));

const cw = Math.floor(imgWalk.width / 6);
const ch = Math.floor(imgWalk.height / 3);

// --- 1. WALK (Dynamic Alternating Strides) ---
// South: [Step 1, Stand, Step 2]
const south0 = extractFrameFromCell(imgWalk, 0 * cw, 1 * cw, 0, ch, 43);
const south1 = extractFrameFromCell(imgWalk, 1 * cw, 2 * cw, 0, ch, 43);
const south2 = extractFrameFromCell(imgWalk, 2 * cw, 3 * cw, 0, ch, 43);

// West: Col 0 = Stride A (Cell 0), Col 1 = Stand/Passing (Cell 2), Col 2 = Stride B (Cell 1)
const west0 = extractFrameFromCell(imgWalk, 0 * cw, 1 * cw, ch, 2 * ch, 43);
const west1 = extractFrameFromCell(imgWalk, 2 * cw, 3 * cw, ch, 2 * ch, 43);
const west2 = extractFrameFromCell(imgWalk, 1 * cw, 2 * cw, ch, 2 * ch, 43);

// North: [Step 1, Stand, Step 2]
const north0 = extractFrameFromCell(imgWalk, 0 * cw, 1 * cw, 2 * ch, 3 * ch, 43);
const north1 = extractFrameFromCell(imgWalk, 1 * cw, 2 * cw, 2 * ch, 3 * ch, 43);
const north2 = extractFrameFromCell(imgWalk, 2 * cw, 3 * cw, 2 * ch, 3 * ch, 43);

const walkSheet = assemble12SpriteSheet({
    S: [south0, south1, south2],
    W: [west0, west1, west2],
    E: [west0, west1, west2].map(mirrorFrame),
    N: [north0, north1, north2]
});

saveSheetAndSidecar(walkSheet, 'Human_Male_Walk', 'Walk', { walk: [0, 1, 2, 1], stand: [1] });
saveSheetAndSidecar(walkSheet, 'Human_Male',      'Walk', { walk: [0, 1, 2, 1], stand: [1] });
saveSheetAndSidecar(walkSheet, 'Human_Male_Adult','Walk', { walk: [0, 1, 2, 1], stand: [1] });
saveSheetAndSidecar(walkSheet, 'Human',           'Walk', { walk: [0, 1, 2, 1], stand: [1] });
writePNG(path.join(CHAR_DIR, '$Adam.png'), 144, 192, walkSheet);

// --- 2. HAUL (Dynamic Alternating Strides) ---
const haulSouth0 = extractFrameFromCell(imgHaul, 0 * cw, 1 * cw, 0, ch, 43);
const haulSouth1 = extractFrameFromCell(imgHaul, 1 * cw, 2 * cw, 0, ch, 43);
const haulSouth2 = extractFrameFromCell(imgHaul, 2 * cw, 3 * cw, 0, ch, 43);

// West Haul: Col 0 = Stride A (Cell 1), Col 1 = Stand/Carry (Cell 0), Col 2 = Stride B (Cell 2)
const haulWest0 = extractFrameFromCell(imgHaul, 1 * cw, 2 * cw, ch, 2 * ch, 43);
const haulWest1 = extractFrameFromCell(imgHaul, 0 * cw, 1 * cw, ch, 2 * ch, 43);
const haulWest2 = extractFrameFromCell(imgHaul, 2 * cw, 3 * cw, ch, 2 * ch, 43);

const haulNorth0 = extractFrameFromCell(imgHaul, 0 * cw, 1 * cw, 2 * ch, 3 * ch, 43);
const haulNorth1 = extractFrameFromCell(imgHaul, 1 * cw, 2 * cw, 2 * ch, 3 * ch, 43);
const haulNorth2 = extractFrameFromCell(imgHaul, 2 * cw, 3 * cw, 2 * ch, 3 * ch, 43);

const haulSheet = assemble12SpriteSheet({
    S: [haulSouth0, haulSouth1, haulSouth2],
    W: [haulWest0, haulWest1, haulWest2],
    E: [haulWest0, haulWest1, haulWest2].map(mirrorFrame),
    N: [haulNorth0, haulNorth1, haulNorth2]
});

saveSheetAndSidecar(haulSheet, 'Human_Male_Haul', 'Haul', { haul: [0, 1, 2, 1], carry: [1], stand: [1] });

console.log('Successfully updated Walk and Haul with dynamic alternating leg animation!');
