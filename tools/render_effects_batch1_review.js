const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');

function isMagenta(r, g, b) {
    return r === 255 && g === 0 && b === 255;
}

function renderShowcase() {
    let meadow = null;
    try {
        meadow = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'meadow.png')), 'meadow.png');
    } catch (e) {
        console.log('Could not load meadow');
    }

    const effects = [
        { id: 'fx_hit', name: 'Hit Flash (3 frames)', frames: 3 },
        { id: 'fx_blood', name: 'Blood Decals (3 variants)', frames: 3 },
        { id: 'fx_dust', name: 'Dust Puff (4 frames)', frames: 4 },
        { id: 'fx_wood_chips', name: 'Wood Chips (4 frames)', frames: 4 },
        { id: 'fx_stone_chips', name: 'Stone Chips (4 frames)', frames: 4 }
    ];

    console.log('Batch 1 Effects review renderer initialized.');
}

if (require.main === module) {
    renderShowcase();
}

module.exports = { renderShowcase };
