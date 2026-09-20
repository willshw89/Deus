'use strict';

const fs = require('fs');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const {
    extractFrameFromCell,
    mirrorFrame,
    assemble12SpriteSheet
} = require('./build_pro_human_male');

const img = decodePNG(fs.readFileSync('art/raw/human_male_pro_4d_downed.png'));

// South (Row 0)
const south0 = extractFrameFromCell(img, 0, 234, 0, 258, 43);    // Col 0: Hurt flinch
const south1 = extractFrameFromCell(img, 704, 938, 0, 258, 30);  // Col 3: Kneeling collapse
const south2 = extractFrameFromCell(img, 938, 1172, 0, 258, 14); // Col 4: Prone corpse

// East (Row 1)
const east0  = extractFrameFromCell(img, 0, 234, 258, 511, 43);   // Col 0: Side hurt flinch
const east1  = extractFrameFromCell(img, 704, 938, 258, 511, 30); // Col 3: Side kneeling collapse
const east2  = extractFrameFromCell(img, 938, 1172, 258, 511, 14);// Col 4: Side prone corpse

// North (Row 2)
const north0 = extractFrameFromCell(img, 0, 234, 511, 767, 43);   // Col 0: Back hurt flinch
const north1 = extractFrameFromCell(img, 704, 938, 511, 767, 30); // Col 3: Back kneeling collapse
const north2 = extractFrameFromCell(img, 938, 1172, 511, 767, 14);// Col 4: Back prone corpse

const downedSheet = assemble12SpriteSheet({
    S: [south0, south1, south2],
    W: [east0, east1, east2].map(mirrorFrame),
    E: [east0, east1, east2],
    N: [north0, north1, north2]
});

writePNG('art/review/pro_downed_12_sheet.png', 144, 192, downedSheet);
console.log('Saved art/review/pro_downed_12_sheet.png');

