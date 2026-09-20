'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const {
    extractFrameFromCell,
    mirrorFrame,
    assemble12SpriteSheet,
    saveSheetAndSidecar
} = require('./build_pro_human_male');

const imgWalk = decodePNG(fs.readFileSync('art/raw/human_male_pro_4d_walk.png'));
const imgHaul = decodePNG(fs.readFileSync('art/raw/human_male_pro_4d_haul.png'));

// --- 1. WALK (Dynamic Alternating Strides) ---
// South
const south0 = extractFrameFromCell(imgWalk, 0, 234, 0, 258, 43);
const south1 = extractFrameFromCell(imgWalk, 234, 470, 0, 258, 43);
const south2 = extractFrameFromCell(imgWalk, 470, 704, 0, 258, 43);

// East: Col 0 = Stride A, Col 1 = Stand/Passing, Col 2 = Stride B
const east0 = extractFrameFromCell(imgWalk, 704, 938, 0, 258, 43);   // R0_C3: Stride A
const east1 = extractFrameFromCell(imgWalk, 0, 234, 258, 511, 43);    // R1_C0: Feet together (Stand)
const east2 = extractFrameFromCell(imgWalk, 938, 1172, 258, 511, 43); // R1_C4: Stride B

// North
const north0 = extractFrameFromCell(imgWalk, 0, 234, 511, 767, 43);
const north1 = extractFrameFromCell(imgWalk, 470, 704, 511, 767, 43);
const north2 = extractFrameFromCell(imgWalk, 234, 470, 511, 767, 43);

const walkSheet = assemble12SpriteSheet({
    S: [south0, south1, south2],
    W: [east0, east1, east2].map(mirrorFrame),
    E: [east0, east1, east2],
    N: [north0, north1, north2]
});

saveSheetAndSidecar(walkSheet, 'Human_Male_Walk', 'Walk', { walk: [0, 1, 2, 1], stand: [1] });
saveSheetAndSidecar(walkSheet, 'Human_Male',      'Walk', { walk: [0, 1, 2, 1], stand: [1] });
saveSheetAndSidecar(walkSheet, 'Human_Male_Adult','Walk', { walk: [0, 1, 2, 1], stand: [1] });
saveSheetAndSidecar(walkSheet, 'Human',           'Walk', { walk: [0, 1, 2, 1], stand: [1] });

// --- 2. HAUL (Dynamic Alternating Strides) ---
const haulSouth0 = extractFrameFromCell(imgHaul, 0, 234, 0, 258, 43);
const haulSouth1 = extractFrameFromCell(imgHaul, 234, 470, 0, 258, 43);
const haulSouth2 = extractFrameFromCell(imgHaul, 470, 704, 0, 258, 43);

// East Haul: Stride A (Col 1), Passing (Col 0), Stride B (Col 4)
const haulEast0 = extractFrameFromCell(imgHaul, 234, 470, 258, 511, 43); // Stride A
const haulEast1 = extractFrameFromCell(imgHaul, 0, 234, 258, 511, 43);   // Stand / passing
const haulEast2 = extractFrameFromCell(imgHaul, 938, 1172, 258, 511, 43);// Stride B

const haulNorth0 = extractFrameFromCell(imgHaul, 0, 234, 511, 767, 43);
const haulNorth1 = extractFrameFromCell(imgHaul, 234, 470, 511, 767, 43);
const haulNorth2 = extractFrameFromCell(imgHaul, 470, 704, 511, 767, 43);

const haulSheet = assemble12SpriteSheet({
    S: [haulSouth0, haulSouth1, haulSouth2],
    W: [haulEast0, haulEast1, haulEast2].map(mirrorFrame),
    E: [haulEast0, haulEast1, haulEast2],
    N: [haulNorth0, haulNorth1, haulNorth2]
});

saveSheetAndSidecar(haulSheet, 'Human_Male_Haul', 'Haul', { haul: [0, 1, 2, 1], carry: [1], stand: [1] });

console.log('Successfully updated Walk and Haul with dynamic alternating leg animation!');
