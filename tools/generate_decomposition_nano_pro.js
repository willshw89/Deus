'use strict';

/**
 * tools/generate_decomposition_nano_pro.js
 *
 * Generates authentic 16-bit pixel art decomposition and skeleton sprites
 * using Google Nano Banana Pro (gemini-3-pro-image) per AGENTS.md Rule 11 & Rule 12.
 */

const path = require('path');
const fs = require('fs');
const { generateWithNanoBananaPro } = require('./generate_nano_banana_pro');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'raw');

fs.mkdirSync(RAW_DIR, { recursive: true });

async function main() {
    console.log('=== Generating Decomposition Animation & Skeleton Sprites with Google Nano Banana Pro ===');

    const prompt = `Pixel art sprite sheet, authentic 16-bit SNES RPG style (Final Fantasy V / Tactics Ogre / Seiken Densetsu), 3/4 top-down perspective RPG Maker format, showing animated stages of CORPSE DECOMPOSITION and SKELETONS on a SOLID UNIFORM BRIGHT MAGENTA (#FF00FF) BACKGROUND with zero shadows on the magenta background.

Layout: Exactly 3 rows by 4 columns of sprites in a clean grid.
Each cell is centered and sized to fit a 48x48 pixel tile.

Row 1 (Top Row) - HUMANOID DECOMPOSITION ANIMATION:
- Col 1 (Fresh Corpse): Humanoid body lying flat on back/side on the ground, limp arms and legs, peaceful or fallen posture, medieval tunic/trousers intact.
- Col 2 (Early Decay / Bloating): The corpse begins to bloat and discolor, skin turning grey-green, clothing tearing, slight dark decay staining on ground.
- Col 3 (Active Rotting / Flesh Sloughing): Advanced decay, ribcage poking through torn decaying clothes, sunken eye sockets, flesh melting away.
- Col 4 (Skeletonizing): Flesh almost completely gone, bare ivory skull and exposed white ribcage, decayed cloth tatters, vertebrae and pelvis visible.

Row 2 (Middle Row) - BEAST / ANIMAL DECOMPOSITION ANIMATION:
- Col 1 (Fresh Animal Carcass): Wild beast/wolf carcass lying on its side on the ground, fur limp, eyes closed.
- Col 2 (Bloated Carcass): Carcass abdomen bloated, fur patchy, dark decomposition starting.
- Col 3 (Decaying Beast): Exposed curved animal ribs, skull snout showing bone teeth, rotting hide.
- Col 4 (Animal Skeleton): Clean quadruped animal skeleton on its side, curving spine, ribcage, and animal skull.

Row 3 (Bottom Row) - WEATHERED SKELETONS & REMAINS:
- Col 1 (Humanoid Bleached Skeleton - Resting Horizontal): Complete human skeleton lying flat on back/ground, bleached ivory bones, skull, ribcage, pelvis, leg and arm bones resting peacefully.
- Col 2 (Humanoid Skeletal Remains - Curled): Skeletal remains slightly curled on side, intact skull and ribcage, weathered ancient bones.
- Col 3 (Beast Skeleton Remains): Complete weathered quadruped beast skeleton lying on ground.
- Col 4 (Remains with Loot Pouch): Humanoid skeleton with an intact leather adventurer's loot pouch and weathered iron dagger beside the ribcage.

Style Requirements:
- Crisp 16-bit pixel art, authentic color quantization, distinct pixel clusters.
- Bold dark near-black outline separating bones and corpse from background.
- Grounded at bottom edge (baseline y=47 in each 48x48 cell).
- Flat uniform magenta #FF00FF background with NO blur, NO drop shadows on the background, NO gradients.`;

    const outPath = path.join(RAW_DIR, 'decomposition_nano_pro.png');
    console.log(`Generating decomposition sprite sheet -> ${outPath}`);
    await generateWithNanoBananaPro({
        prompt: prompt,
        outputPath: outPath
    });

    console.log('=== Decomposition Generation Complete ===');
}

main().catch(err => {
    console.error('Error generating decomposition:', err);
    process.exit(1);
});

