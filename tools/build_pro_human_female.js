'use strict';

/**
 * tools/build_pro_human_female.js
 *
 * Master compilation tool for Adult Female Human (Serious Chibi ~3.1 heads, 43px height, grounded y=47)
 * generated strictly via Google Nano Banana Pro (gemini-3-pro-image) per AGENTS.md Rule 11.
 *
 * 12 Sprites per Action Suite (3 cols x 4 rows: South, West, East, North).
 * Snapped to art/palette/uf.hex (<= 31 opaque colors).
 * Outputs to game/img/characters/$UF_Human_Female_*.png and .json sidecars.
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const {
    pal,
    extractFrameFromCell,
    mirrorFrame,
    assemble12SpriteSheet,
    quantizeSheet
} = require('./build_pro_human_male');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');

function saveFemaleSheetAndSidecar(buf, baseName, actionTag, animations) {
    const pngPath = path.join(CHAR_DIR, `$UF_${baseName}.png`);
    writePNG(pngPath, 144, 192, buf);

    const sidecar = {
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ['S', 'W', 'E', 'N'],
        animations: animations,
        frameMs: 180,
        species: 'human',
        stage: 'adult',
        gender: 'female',
        action: actionTag,
        style: 'Serious Chibi (VISION V116)',
        generator: 'Google Nano Banana Pro (gemini-3-pro-image, Rule 11, VISION V109)'
    };
    fs.writeFileSync(path.join(CHAR_DIR, `$UF_${baseName}.json`), JSON.stringify(sidecar, null, 2));
    console.log(`Saved $UF_${baseName}.png and .json (quantized <= 31 colors, grounded y=47)`);
}

module.exports = {
    pal,
    extractFrameFromCell,
    mirrorFrame,
    assemble12SpriteSheet,
    saveFemaleSheetAndSidecar,
    quantizeSheet
};
