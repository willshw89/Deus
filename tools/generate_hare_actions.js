'use strict';

/**
 * tools/generate_hare_actions.js
 *
 * Generates Eat, Attack, and Sleep 12-sprite action sheets for Wild Hare
 * using Google Nano Banana Pro (gemini-3-pro-image), conditioned on the
 * master Walk sheet (art/raw/pro_hare_walk.png) as reference.
 */

const fs = require('fs');
const path = require('path');
const { generateWithNanoBananaPro } = require('./generate_nano_banana_pro');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'raw');
const HARE_WALK_REF = path.join(RAW_DIR, 'pro_hare_walk.png');

const tasks = [
    {
        name: 'Eat',
        output: path.join(RAW_DIR, 'pro_hare_eat.png'),
        prompt: `16-bit SNES pixel art creature sprite sheet of the EXACT SAME Wild Hare from the reference image, performing an EATING / NIBBLING / CHEWING ANIMATION.
Grid of exactly 12 sprites arranged in 3 columns by 4 rows on a solid flat uniform magenta #FF00FF background.
Row 1 (top row): 3 sprites facing South (front view), feeding sequence: sitting on haunches holding a clover/root with forepaws, rapid whisker twitch and nose wiggle, chewing furiously.
Row 2 (second row): 3 sprites facing West (profile facing left), nibbling grass on ground, sitting up munching, head down nibbling.
Row 3 (third row): 3 sprites facing East (profile facing right), nibbling grass on ground, sitting up munching, head down nibbling.
Row 4 (bottom row): 3 sprites facing North (back view), back view of hare sitting low nibbling on ground, long ears twitching.
Maintain EXACT same tiny creature scale, tawny agouti fur, long black-tipped upright ears, white underbelly, proportions, and style as the reference image. Crisp pixel art, clean dark silhouette outlines, no background bleed, solid flat magenta #FF00FF background.`
    },
    {
        name: 'Attack',
        output: path.join(RAW_DIR, 'pro_hare_attack.png'),
        prompt: `16-bit SNES pixel art creature sprite sheet of the EXACT SAME Wild Hare from the reference image, performing a BOXING / KICKING DEFENSIVE ATTACK.
CRITICAL CONSTRAINT: ZERO FLYING PROJECTILES, ZERO MAGIC BEAMS. Strictly physical beast combat animation.
Grid of exactly 12 sprites arranged in 3 columns by 4 rows on a solid flat uniform magenta #FF00FF background.
Row 1 (top row): 3 sprites facing South (front view), defensive attack: standing upright on hind legs, rapid forepaw jab / swatting flurry, battle stance.
Row 2 (second row): 3 sprites facing West (profile facing left), leaping defensive rear kick, forepaw jab strike, recovery.
Row 3 (third row): 3 sprites facing East (profile facing right), leaping defensive rear kick, forepaw jab strike, recovery.
Row 4 (bottom row): 3 sprites facing North (back view), boxing and kicking flurry sequence.
Maintain EXACT same tiny creature scale, tawny fur, long ears, proportions, and style as the reference image. Crisp pixel art, clean dark silhouette outlines, solid flat magenta #FF00FF background.`
    },
    {
        name: 'Sleep',
        output: path.join(RAW_DIR, 'pro_hare_sleep.png'),
        prompt: `16-bit SNES pixel art creature sprite sheet of the EXACT SAME Wild Hare from the reference image, RESTING AND SLEEPING FLAT ON THE GROUND.
Grid of exactly 12 sprites arranged in 3 columns by 4 rows on a solid flat uniform magenta #FF00FF background.
Row 1 (top row): 3 sprites facing South (front view), sleeping cycle: curled into a compact tight ball of fur, ears folded flat against back, eyes closed peacefully, tiny breathing rhythm.
Row 2 (second row): 3 sprites facing West (profile facing left), curled tight on ground, ears laid back, eyes closed, slow breathing loop.
Row 3 (third row): 3 sprites facing East (profile facing right), curled tight on ground, ears laid back, eyes closed, slow breathing loop.
Row 4 (bottom row): 3 sprites facing North (back view), back view of tiny hare curled into a furry ball on ground.
Maintain EXACT same tiny creature scale, tawny fur, long ears, proportions, and style as the reference image. Very low grounded height (~10-14px height when sleeping), crisp pixel art, clean dark silhouette outlines, solid flat magenta #FF00FF background.`
    }
];

async function run() {
    for (const task of tasks) {
        console.log(`\n========================================`);
        console.log(`Generating Hare ${task.name}...`);
        console.log(`Output: ${task.output}`);
        if (fs.existsSync(task.output)) {
            console.log(`File already exists, skipping.`);
            continue;
        }
        await generateWithNanoBananaPro({
            prompt: task.prompt,
            outputPath: task.output,
            referenceImagePaths: [HARE_WALK_REF]
        });
        console.log(`Hare ${task.name} generated successfully.`);
    }
    console.log('\nAll Hare actions generated!');
}

run().catch(err => {
    console.error('Generation failed:', err);
    process.exit(1);
});

