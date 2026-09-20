'use strict';

const fs = require('fs');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const {
    extractFrameFromCell,
    mirrorFrame,
    assemble12SpriteSheet
} = require('./build_pro_human_male');

const img = decodePNG(fs.readFileSync('art/raw/human_male_pro_4d_work.png'));

// South (Row 0)
const south0 = extractFrameFromCell(img, 0, 234, 0, 258, 43);    // Col 0: Standing
const south1 = extractFrameFromCell(img, 470, 704, 0, 258, 32);  // Col 2: Kneeling ready
const south2 = extractFrameFromCell(img, 938, 1172, 0, 258, 32); // Col 4: Hammer strike

// East (Row 1)
const east0  = extractFrameFromCell(img, 0, 234, 258, 511, 43);   // Col 0: Side standing
const east1  = extractFrameFromCell(img, 470, 704, 258, 511, 32); // Col 2: Side kneeling ready
const east2  = extractFrameFromCell(img, 938, 1172, 258, 511, 32);// Col 4: Side hammer strike

// North (Row 2)
const north0 = extractFrameFromCell(img, 0, 234, 511, 767, 43);   // Col 0: Back standing
const north1 = extractFrameFromCell(img, 470, 704, 511, 767, 32); // Col 2: Back kneeling ready
const north2 = extractFrameFromCell(img, 704, 938, 511, 767, 32); // Col 3: Back hammer strike

const workSheet = assemble12SpriteSheet({
    S: [south0, south1, south2],
    W: [east0, east1, east2].map(mirrorFrame),
    E: [east0, east1, east2],
    N: [north0, north1, north2]
});

writePNG('art/review/pro_work_12_sheet.png', 144, 192, workSheet);
console.log('Saved art/review/pro_work_12_sheet.png');

