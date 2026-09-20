'use strict';

const fs = require('fs');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const {
    extractFrameFromCell,
    mirrorFrame,
    assemble12SpriteSheet,
    saveFemaleSheetAndSidecar
} = require('./build_pro_human_female');

const img = decodePNG(fs.readFileSync('art/raw/human_female_pro_4d_walk.png'));

// South
const south0 = extractFrameFromCell(img, 0, 234, 0, 258, 43);
const south1 = extractFrameFromCell(img, 234, 470, 0, 258, 43);
const south2 = extractFrameFromCell(img, 470, 704, 0, 258, 43);

// East: Col 1 (Stride A), Col 0 (Stand), Col 4 (Stride B)
const east0 = extractFrameFromCell(img, 234, 470, 258, 511, 43);
const east1 = extractFrameFromCell(img, 0, 234, 258, 511, 43);
const east2 = extractFrameFromCell(img, 938, 1172, 258, 511, 43);

// North
const north0 = extractFrameFromCell(img, 0, 234, 511, 767, 43);
const north1 = extractFrameFromCell(img, 470, 704, 511, 767, 43);
const north2 = extractFrameFromCell(img, 234, 470, 511, 767, 43);

const walkSheet = assemble12SpriteSheet({
    S: [south0, south1, south2],
    W: [east0, east1, east2].map(mirrorFrame),
    E: [east0, east1, east2],
    N: [north0, north1, north2]
});

saveFemaleSheetAndSidecar(walkSheet, 'Human_Female_Walk', 'Walk', { walk: [0, 1, 2, 1], stand: [1] });
saveFemaleSheetAndSidecar(walkSheet, 'Human_Female',      'Walk', { walk: [0, 1, 2, 1], stand: [1] });
saveFemaleSheetAndSidecar(walkSheet, 'Human_Female_Adult','Walk', { walk: [0, 1, 2, 1], stand: [1] });

writePNG('art/review/pro_female_walk_12_sheet.png', 144, 192, walkSheet);
console.log('Saved art/review/pro_female_walk_12_sheet.png and deployed to game/img/characters/');
