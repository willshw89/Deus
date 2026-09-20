'use strict';

/**
 * tools/generate_doors_nano_pro.js
 *
 * Generates authentic 16-bit pixel art doors for standard fantasy materials
 * (Wood, Stone, Iron) with distinct Closed, Ajar, and Fully Open animation frames
 * using Google Nano Banana Pro (gemini-3-pro-image) per AGENTS.md Rule 11 & Rule 12.
 */

const path = require('path');
const fs = require('fs');
const { generateWithNanoBananaPro } = require('./generate_nano_banana_pro');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'raw');

fs.mkdirSync(RAW_DIR, { recursive: true });

async function main() {
    console.log('=== Generating Standard Fantasy Doors (Wood, Stone, Iron) with Google Nano Banana Pro ===');

    const promptDoors = `Pixel art sprite sheet, authentic 16-bit SNES RPG style (Final Fantasy V / Tactics Ogre / Seiken Densetsu), 3/4 top-down perspective RPG Maker format, showing 3 rows of DOORS in 3 standard fantasy materials on a SOLID UNIFORM BRIGHT MAGENTA (#FF00FF) BACKGROUND with zero shadows on the magenta background.

Layout: Exactly 3 rows by 3 columns of door sprites in a clean grid.
Each cell is centered and sized to fit a 48x48 pixel tile.

Row 1 (Top Row) - STURDY WOODEN DOOR:
- Col 1 (Closed): Solid timber door made of vertical oak planks with horizontal braces, wrought-iron strap hinges on the left, and a black iron ring latch on the right, neatly fitted inside a rustic square timber doorframe.
- Col 2 (Ajar / Opening): The same wooden door swung inward at a 45-degree angle, showing the door thickness and an open shadowed doorway opening.
- Col 3 (Fully Open): The wooden door is swung wide open against the side jamb, leaving the central doorway completely open with a dark interior doorway threshold.

Row 2 (Middle Row) - ANCIENT DWARVEN STONE DOOR:
- Col 1 (Closed): Heavy carved ashlar granite stone slab door with carved geometric runic borders and bronze pivot brackets, set within a massive chiseled stone block archway frame. Solidly closed.
- Col 2 (Ajar / Opening): The heavy stone slab door pivoted halfway open, revealing the deep cavern interior opening.
- Col 3 (Fully Open): The stone slab door pivoted flat against the stone jamb, leaving the chiseled stone doorway completely open.

Row 3 (Bottom Row) - FORGED IRON CITADEL DOOR:
- Col 1 (Closed): Heavy dark wrought-iron plate door reinforced with iron crossbars, raised iron rivets, and a heavy sliding bolt mechanism, set inside a heavy reinforced dark iron doorframe. Solidly locked and shut.
- Col 2 (Ajar / Opening): The iron door unlatched and swung inward at an angle, revealing the open passage.
- Col 3 (Fully Open): The iron door swung completely open against the iron frame post, leaving the reinforced gateway open and clear.

Style Requirements:
- Crisp 16-bit pixel art, authentic color quantization, distinct pixel clusters.
- Bold dark near-black outline separating doorframe and door from background.
- Grounded at bottom edge (baseline y=47 in each 48x48 cell).
- Flat uniform magenta #FF00FF background with NO blur, NO drop shadows on the background, NO gradients.`;

    const outDoorsPath = path.join(RAW_DIR, 'doors_fantasy_nano_pro.png');
    console.log(`Generating doors sprite sheet -> ${outDoorsPath}`);
    await generateWithNanoBananaPro({
        prompt: promptDoors,
        outputPath: outDoorsPath
    });

    console.log('=== Door Generation Complete ===');
}

main().catch(err => {
    console.error('Error generating doors:', err);
    process.exit(1);
});

