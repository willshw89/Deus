'use strict';

const fs = require('fs');
const { decodePNG } = require('./png_read');
const {
    extractFrameFromCell,
    assemble12SpriteSheet,
    saveSheetAndSidecar
} = require('./build_pro_human_male');

const img = decodePNG(fs.readFileSync('art/raw/human_male_pro_4d_walk.png'));

const south0 = extractFrameFromCell(img, 0, 234, 0, 258, 43);
const south1 = extractFrameFromCell(img, 234, 470, 0, 258, 43);
const south2 = extractFrameFromCell(img, 470, 704, 0, 258, 43);

const east0  = extractFrameFromCell(img, 938, 1172, 0, 258, 43);
const east1  = extractFrameFromCell(img, 704, 938,  0, 258, 43);
const east2  = extractFrameFromCell(img, 1172, 1408, 0, 258, 43);

const north0 = extractFrameFromCell(img, 0, 234, 511, 767, 43);
const north1 = extractFrameFromCell(img, 470, 704, 511, 767, 43);
const north2 = extractFrameFromCell(img, 234, 470, 511, 767, 43);

const walkSheet = assemble12SpriteSheet({
    S: [south0, south1, south2],
    W: [east0, east1, east2].map(require('./build_pro_human_male').mirrorFrame),
    E: [east0, east1, east2],
    N: [north0, north1, north2]
});

saveSheetAndSidecar(walkSheet, 'Human_Male_Walk', 'Walk', { walk: [0, 1, 2, 1], stand: [1] });
saveSheetAndSidecar(walkSheet, 'Human_Male',      'Walk', { walk: [0, 1, 2, 1], stand: [1] });
saveSheetAndSidecar(walkSheet, 'Human_Male_Adult','Walk', { walk: [0, 1, 2, 1], stand: [1] });
saveSheetAndSidecar(walkSheet, 'Human',           'Walk', { walk: [0, 1, 2, 1], stand: [1] });

console.log('Successfully compiled and saved all Walk aliases with Google Nano Banana Pro art!');

