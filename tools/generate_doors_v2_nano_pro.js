'use strict';

/**
 * tools/generate_doors_v2_nano_pro.js
 *
 * Generates authentic 16-bit pixel art doors for standard fantasy materials
 * (Wood, Stone, Iron) with BOTH Horizontal (front-facing) and Vertical (side-facing)
 * models, featuring Closed, Ajar, and Fully Open frames.
 *
 * Crucial requirement: Open and Ajar frames have CLEAR/TRANSPARENT doorway openings
 * (on solid bright magenta #FF00FF background with NO black interior void)
 * so creatures and floor tiles are fully visible walking through.
 *
 * Powered by Google Nano Banana Pro (gemini-3-pro-image) per AGENTS.md Rule 11 & Rule 12.
 */

const path = require('path');
const fs = require('fs');
const { generateWithNanoBananaPro } = require('./generate_nano_banana_pro');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'raw');

fs.mkdirSync(RAW_DIR, { recursive: true });

async function main() {
    console.log('=== Generating Horizontal & Vertical Fantasy Doors with Google Nano Banana Pro ===');

    const prompt = `Pixel art sprite sheet, authentic 16-bit SNES RPG style (Final Fantasy V / Tactics Ogre / Seiken Densetsu), 3/4 top-down perspective RPG Maker format, showing DOORS in 3 standard fantasy materials (Wood, Stone, Iron) on a SOLID UNIFORM BRIGHT MAGENTA (#FF00FF) BACKGROUND with zero shadows on the magenta background.

CRITICAL REQUIREMENT:
The doorway opening when a door is OPEN or AJAR MUST BE EMPTY AND FILLED COMPLETELY WITH SOLID MAGENTA (#FF00FF).
DO NOT PAINT A BLACK VOID OR DARK RECTANGLE INSIDE THE OPEN DOORWAY. The opening must be clear so that when magenta is made transparent, characters and floor tiles underneath are 100% visible walking right through the open doorway!

Grid Layout: Exactly 6 rows by 3 columns of door sprites in a clean grid.
Each cell is centered and sized to fit a 48x48 pixel tile.

Columns:
- Col 1: CLOSED (door firmly shut in frame)
- Col 2: AJAR / HALF-OPEN (door leaf swung 45 degrees, opening inside frame is solid magenta #FF00FF)
- Col 3: FULLY OPEN (door leaf swung flat against the frame jamb, entire doorway opening is wide open and solid magenta #FF00FF)

Row 1 - WOODEN DOOR (HORIZONTAL WALL / FRONT-FACING):
- Timber frame with vertical oak planks, iron strap hinges, and iron ring latch.
- Front-facing 3/4 top-down perspective for walls running West-East.
- Col 1: Shut closed. Col 2: Swung half open, center is magenta. Col 3: Swung wide open, center is magenta.

Row 2 - WOODEN DOOR (VERTICAL WALL / SIDE-PROFILE):
- Heavy timber posts connecting top and bottom walls, for walls running North-South.
- Side-elevation profile view: vertical wooden door slab set between North and South timber jambs.
- Col 1: Shut closed between the vertical posts.
- Col 2: Swung inward at an angle, clear magenta opening between posts.
- Col 3: Swung flat against the post, clear magenta opening through the doorway.

Row 3 - DWARVEN STONE DOOR (HORIZONTAL WALL / FRONT-FACING):
- Heavy chiseled granite stone archway frame with carved geometric runic slab door.
- Front-facing 3/4 top-down perspective for horizontal walls.
- Col 1: Shut closed. Col 2: Pivoted half open, center is magenta. Col 3: Pivoted flat against stone jamb, center is magenta.

Row 4 - DWARVEN STONE DOOR (VERTICAL WALL / SIDE-PROFILE):
- Side-profile vertical stone doorway set between North and South stone wall blocks.
- Col 1: Heavy stone door slab firmly closed between posts.
- Col 2: Pivoted halfway open, clear magenta passage.
- Col 3: Pivoted fully open flat against side, clear magenta passage.

Row 5 - FORGED IRON CITADEL DOOR (HORIZONTAL WALL / FRONT-FACING):
- Wrought-iron frame with dark riveted iron plate door, crossbars, and heavy latch bolt.
- Front-facing 3/4 top-down perspective.
- Col 1: Shut closed. Col 2: Swung half open, center is magenta. Col 3: Swung fully open against iron frame post, center is magenta.

Row 6 - FORGED IRON CITADEL DOOR (VERTICAL WALL / SIDE-PROFILE):
- Side-profile vertical iron doorway set between North and South iron/stone walls.
- Col 1: Iron door slab shut between posts.
- Col 2: Iron door swung open at angle, clear magenta passage.
- Col 3: Iron door swung flat against jamb, clear magenta passage.

Style Requirements:
- Crisp 16-bit pixel art, authentic color quantization, distinct pixel clusters.
- Bold dark near-black outline separating doorframe and door from background.
- Grounded at bottom edge (baseline y=47 in each 48x48 cell).
- Flat uniform magenta #FF00FF background with NO blur, NO drop shadows on the background, NO gradients.`;

    const outPath = path.join(RAW_DIR, 'doors_v2_nano_pro.png');
    console.log(`Generating doors v2 sprite sheet -> ${outPath}`);
    await generateWithNanoBananaPro({
        prompt: prompt,
        outputPath: outPath
    });

    console.log('=== Doors Generation Complete ===');
}

main().catch(err => {
    console.error('Error generating doors v2:', err);
    process.exit(1);
});

