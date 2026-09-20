'use strict';

const fs = require('fs');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const {
    extractFrameFromCell,
    mirrorFrame,
    assemble12SpriteSheet
} = require('./build_pro_human_male');

const img = decodePNG(fs.readFileSync('art/raw/human_male_pro_4d_bow.png'));

// South (Row 0)
const south0 = extractFrameFromCell(img, 0, 234, 0, 258, 43);    // Col 0: Aim
const south1 = extractFrameFromCell(img, 234, 470, 0, 258, 43);  // Col 1: Full draw
const south2 = extractFrameFromCell(img, 938, 1172, 0, 258, 43); // Col 4: Pluck recoil

// East (Row 1)
const east0  = extractFrameFromCell(img, 0, 234, 258, 511, 43);   // Col 0: Side aim
const east1  = extractFrameFromCell(img, 234, 470, 258, 511, 43); // Col 1: Side full draw
const east2  = extractFrameFromCell(img, 938, 1172, 258, 511, 43);// Col 4: Side pluck recoil

// North (Row 2)
const north0 = extractFrameFromCell(img, 0, 234, 511, 767, 43);   // Col 0: Back aim
const north1 = extractFrameFromCell(img, 234, 470, 511, 767, 43); // Col 1: Back full draw
const north2 = extractFrameFromCell(img, 704, 938, 511, 767, 43); // Col 3: Back pluck recoil

const bowSheet = assemble12SpriteSheet({
    S: [south0, south1, south2],
    W: [east0, east1, east2].map(mirrorFrame),
    E: [east0, east1, east2],
    N: [north0, north1, north2]
});

writePNG('art/review/pro_bow_12_sheet.png', 144, 192, bowSheet);
console.log('Saved art/review/pro_bow_12_sheet.png');

