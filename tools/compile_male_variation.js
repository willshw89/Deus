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
const RAW_DIR = path.join(ROOT, 'art', 'raw');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');

function compileVariation(varNum, rawFilename) {
    const imgPath = path.join(RAW_DIR, rawFilename);
    if (!fs.existsSync(imgPath)) {
        console.error(`File not found: ${imgPath}`);
        return;
    }
    const img = decodePNG(fs.readFileSync(imgPath));

    // South
    const south0 = extractFrameFromCell(img, 0, 234, 0, 258, 43);
    const south1 = extractFrameFromCell(img, 234, 470, 0, 258, 43);
    const south2 = extractFrameFromCell(img, 470, 704, 0, 258, 43);

    // East (Side): Stride A (Left leg forward), Stand/Passing (Feet together), Stride B (Right leg forward)
    const east0 = extractFrameFromCell(img, 704, 938, 0, 258, 43);   // Row 0 Col 3: Stride A
    const east1 = extractFrameFromCell(img, 0, 234, 258, 511, 43);    // Row 1 Col 0: Stand / passing
    const east2 = extractFrameFromCell(img, 938, 1172, 258, 511, 43); // Row 1 Col 4: Stride B

    // North (Back)
    let nCols = [0, 1, 2];
    if (varNum === 3) nCols = [1, 2, 3]; // Var 3 Row 2 Col 0 was generated facing South
    const north0 = extractFrameFromCell(img, nCols[0] * 234, (nCols[0] + 1) * 234, 511, 767, 43);
    const north1 = extractFrameFromCell(img, nCols[1] * 234, (nCols[1] + 1) * 234, 511, 767, 43);
    const north2 = extractFrameFromCell(img, nCols[2] * 234, (nCols[2] + 1) * 234, 511, 767, 43);

    const sheet = assemble12SpriteSheet({
        S: [south0, south1, south2],
        W: [east0, east1, east2].map(mirrorFrame),
        E: [east0, east1, east2],
        N: [north0, north1, north2]
    });

    const baseName = `Human_Male_${varNum}`;
    saveSheetAndSidecar(sheet, baseName, 'Walk', { walk: [0, 1, 2, 1], stand: [1] });
    writePNG(path.join(REVIEW_DIR, `pro_male_var${varNum}_walk_12_sheet.png`), 144, 192, sheet);
    console.log(`Compiled variation ${varNum}: $UF_${baseName}.png and .json`);
}

module.exports = { compileVariation };

if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length >= 2) {
        compileVariation(parseInt(args[0], 10), args[1]);
    }
}
