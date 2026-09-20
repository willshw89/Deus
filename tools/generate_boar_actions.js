'use strict';

/**
 * tools/generate_boar_actions.js
 *
 * Generates Eat, Attack, and Sleep 12-sprite action sheets for Wild Boar
 * using Google Nano Banana Pro (gemini-3-pro-image), conditioned on the
 * master Walk sheet (art/raw/pro_boar_walk.png) as reference.
 */

const fs = require('fs');
const path = require('path');
const { generateWithNanoBananaPro } = require('./generate_nano_banana_pro');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'raw');
const BOAR_WALK_REF = path.join(RAW_DIR, 'pro_boar_walk.png');

const tasks = [
    {
        name: 'Eat',
        output: path.join(RAW_DIR, 'pro_boar_eat.png'),
        prompt: `16-bit SNES pixel art creature sprite sheet of the EXACT SAME Wild Boar from the reference image, performing an EATING / ROOTING / FORAGING ANIMATION.
Grid of exactly 12 sprites arranged in 3 columns by 4 rows on a solid flat uniform magenta #FF00FF background.
Row 1 (top row): 3 sprites facing South (front view), feeding sequence: snout dipped low to ground snuffling, munching on roots with head bobbing, chewing with tusks visible.
Row 2 (second row): 3 sprites facing West (profile facing left), rooting sequence: lowered snout plowing into ground, lifting snout chewing root, head down rooting.
Row 3 (third row): 3 sprites facing East (profile facing right), rooting sequence: lowered snout plowing into ground, lifting snout chewing root, head down rooting.
Row 4 (bottom row): 3 sprites facing North (back view), feeding with head down, bristly back swaying slightly as it munches.
Maintain EXACT same creature scale, stout build, bristly brown-black coat, white curving tusks, proportions, and style as the reference image. Crisp pixel art, clean dark silhouette outlines, no background bleed, solid flat magenta #FF00FF background.`
    },
    {
        name: 'Attack',
        output: path.join(RAW_DIR, 'pro_boar_attack.png'),
        prompt: `16-bit SNES pixel art creature sprite sheet of the EXACT SAME Wild Boar from the reference image, performing a FEROCIOUS TUSK GORE / CHARGE ATTACK.
CRITICAL CONSTRAINT: ZERO FLYING PROJECTILES, ZERO MAGIC BEAMS. Strictly physical beast combat animation.
Grid of exactly 12 sprites arranged in 3 columns by 4 rows on a solid flat uniform magenta #FF00FF background.
Row 1 (top row): 3 sprites facing South (front view), attack sequence: frame 1: lowered head with flared nostrils ready to strike; frame 2: violent upward slash of tusks with fierce forward thrust; frame 3: battle recovery stance.
Row 2 (second row): 3 sprites facing West (profile facing left), attack sequence: frame 1: coil back on hind legs; frame 2: explosive forward lunge with upward tusk hook; frame 3: recovery stance.
Row 3 (third row): 3 sprites facing East (profile facing right), attack sequence: frame 1: coil back on hind legs; frame 2: explosive forward lunge with upward tusk hook; frame 3: recovery stance.
Row 4 (bottom row): 3 sprites facing North (back view), violent charge and upward thrust sequence.
Maintain EXACT same creature scale, stout build, bristly coat, white curving tusks, proportions, and style as the reference image. Crisp pixel art, clean dark silhouette outlines, solid flat magenta #FF00FF background.`
    },
    {
        name: 'Sleep',
        output: path.join(RAW_DIR, 'pro_boar_sleep.png'),
        prompt: `16-bit SNES pixel art creature sprite sheet of the EXACT SAME Wild Boar from the reference image, RESTING AND SLEEPING FLAT ON THE GROUND.
Grid of exactly 12 sprites arranged in 3 columns by 4 rows on a solid flat uniform magenta #FF00FF background.
Row 1 (top row): 3 sprites facing South (front view), sleeping cycle: curled up low on belly with hooves tucked underneath, head resting on ground, eyes peacefully closed, gentle breathing rise and fall.
Row 2 (second row): 3 sprites facing West (profile facing left), sleeping cycle: lying flat on side or curled with legs tucked, head resting on paws/ground, eyes closed, slow breathing loop.
Row 3 (third row): 3 sprites facing East (profile facing right), sleeping cycle: lying flat on side or curled with legs tucked, head resting on paws/ground, eyes closed, slow breathing loop.
Row 4 (bottom row): 3 sprites facing North (back view), back view of boar sleeping curled up low on ground.
Maintain EXACT same creature scale, stout build, bristly coat, white curving tusks, proportions, and style as the reference image. Low grounded height (~16-20px height when sleeping), crisp pixel art, clean dark silhouette outlines, solid flat magenta #FF00FF background.`
    }
];

async function run() {
    for (const task of tasks) {
        console.log(`\n========================================`);
        console.log(`Generating Boar ${task.name}...`);
        console.log(`Output: ${task.output}`);
        if (fs.existsSync(task.output)) {
            console.log(`File already exists, skipping.`);
            continue;
        }
        await generateWithNanoBananaPro({
            prompt: task.prompt,
            outputPath: task.output,
            referenceImagePaths: [BOAR_WALK_REF]
        });
        console.log(`Boar ${task.name} generated successfully.`);
    }
    console.log('\nAll Boar actions generated!');
}

run().catch(err => {
    console.error('Generation failed:', err);
    process.exit(1);
});

