'use strict';

const fs = require('fs');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const {
    extractFrameFromCell,
    mirrorFrame,
    assemble12SpriteSheet
} = require('./build_pro_human_male');

const img = decodePNG(fs.readFileSync('art/raw/human_male_pro_4d_haul.png'));

// South (Row 0)
const south0 = extractFrameFromCell(img, 0, 234, 0, 258, 43);    // Col 0: Step left
const south1 = extractFrameFromCell(img, 234, 470, 0, 258, 43);  // Col 1: Stand
const south2 = extractFrameFromCell(img, 470, 704, 0, 258, 43);  // Col 2: Step right

// East (Row 1)
const east0  = extractFrameFromCell(img, 0, 234, 258, 511, 43);   // Col 0: Side step 1
const east1  = extractFrameFromCell(img, 234, 470, 258, 511, 43); // Col 1: Side stand
const east2  = extractFrameFromCell(img, 704, 938, 258, 511, 43); // Col 3: Side step 2

// North (Row 2)
const north0 = extractFrameFromCell(img, 0, 234, 511, 767, 43);   // Col 0: Back step 1
const north1 = extractFrameFromCell(img, 234, 470, 511, 767, 43); // Col 1: Back stand
const north2 = extractFrameFromCell(img, 470, 704, 511, 767, 43); // Col 2: Back step 2

const haulSheet = assemble12SpriteSheet({
    S: [south0, south1, south2],
    W: [east0, east1, east2].map(mirrorFrame),
    E: [east0, east1, east2],
    N: [north0, north1, north2]
});

writePNG('art/review/pro_haul_12_sheet.png', 144, 192, haulSheet);
console.log('Saved art/review/pro_haul_12_sheet.png');

