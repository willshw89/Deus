'use strict';

/**
 * tools/generate_deer_actions.js
 *
 * Generates Eat, Attack, and Sleep 12-sprite action sheets for Red Deer Stag
 * using Google Nano Banana Pro (gemini-3-pro-image), conditioned on the
 * master Walk sheet (art/raw/pro_deer_walk.png) as reference.
 */

const fs = require('fs');
const path = require('path');
const { generateWithNanoBananaPro } = require('./generate_nano_banana_pro');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'raw');
const DEER_WALK_REF = path.join(RAW_DIR, 'pro_deer_walk.png');

const tasks = [
    {
        name: 'Eat',
        output: path.join(RAW_DIR, 'pro_deer_eat.png'),
        prompt: `16-bit SNES pixel art creature sprite sheet of the EXACT SAME Red Deer Stag from the reference image, performing an EATING / GRAZING / BROWSING ANIMATION.
Grid of exactly 12 sprites arranged in 3 columns by 4 rows on a solid flat uniform magenta #FF00FF background.
Row 1 (top row): 3 sprites facing South (front view), grazing sequence: head lowered to ground level nibbling grass, large branching antlers tilted forward, chewing with ears twitching.
Row 2 (second row): 3 sprites facing West (profile facing left), grazing sequence: neck arched down nibbling forest floor, head up chewing, head down grazing.
Row 3 (third row): 3 sprites facing East (profile facing right), grazing sequence: neck arched down nibbling forest floor, head up chewing, head down grazing.
Row 4 (bottom row): 3 sprites facing North (back view), back view of deer grazing with head down between front legs.
Maintain EXACT same creature scale, slender graceful cervid anatomy, branching antlers, tawny reddish-brown coat with pale rump, proportions, and style as the reference image. Crisp pixel art, clean dark silhouette outlines, no background bleed, solid flat magenta #FF00FF background.`
    },
    {
        name: 'Attack',
        output: path.join(RAW_DIR, 'pro_deer_attack.png'),
        prompt: `16-bit SNES pixel art creature sprite sheet of the EXACT SAME Red Deer Stag from the reference image, performing a COMBAT ANTLER CLASH / REARING HOOF STRIKE.
CRITICAL CONSTRAINT: ZERO FLYING PROJECTILES, ZERO MAGIC BEAMS. Strictly natural physical creature combat animation.
Grid of exactly 12 sprites arranged in 3 columns by 4 rows on a solid flat uniform magenta #FF00FF background.
Row 1 (top row): 3 sprites facing South (front view), combat sequence: frame 1: lowering head presenting sharp antler points; frame 2: forward lunge / antler thrust; frame 3: battle recovery stance.
Row 2 (second row): 3 sprites facing West (profile facing left), combat sequence: frame 1: rearing back on hind legs; frame 2: powerful downward foreleg stomp and antler thrust; frame 3: recovery.
Row 3 (third row): 3 sprites facing East (profile facing right), combat sequence: frame 1: rearing back on hind legs; frame 2: powerful downward foreleg stomp and antler thrust; frame 3: recovery.
Row 4 (bottom row): 3 sprites facing North (back view), antler thrust and rearing attack sequence.
Maintain EXACT same creature scale, cervid anatomy, branching antlers, tawny coat, proportions, and style as the reference image. Crisp pixel art, clean dark silhouette outlines, solid flat magenta #FF00FF background.`
    },
    {
        name: 'Sleep',
        output: path.join(RAW_DIR, 'pro_deer_sleep.png'),
        prompt: `16-bit SNES pixel art creature sprite sheet of the EXACT SAME Red Deer Stag from the reference image, RESTING AND SLEEPING BEDDED DOWN ON THE GROUND.
Grid of exactly 12 sprites arranged in 3 columns by 4 rows on a solid flat uniform magenta #FF00FF background.
Row 1 (top row): 3 sprites facing South (front view), sleeping cycle: bedded down with slender legs folded neatly under body, head rested low, branching antlers swept back, eyes closed peacefully.
Row 2 (second row): 3 sprites facing West (profile facing left), sleeping cycle: curled up bedded down on forest floor, neck curved back resting on flank, eyes closed, slow breathing loop.
Row 3 (third row): 3 sprites facing East (profile facing right), sleeping cycle: curled up bedded down on forest floor, neck curved back resting on flank, eyes closed, slow breathing loop.
Row 4 (bottom row): 3 sprites facing North (back view), back view of bedded deer resting curled on ground.
Maintain EXACT same creature scale, cervid anatomy, branching antlers, tawny coat, proportions, and style as the reference image. Low grounded height (~22-26px height when bedded down), crisp pixel art, clean dark silhouette outlines, solid flat magenta #FF00FF background.`
    }
];

async function run() {
    for (const task of tasks) {
        console.log(`\n========================================`);
        console.log(`Generating Deer ${task.name}...`);
        console.log(`Output: ${task.output}`);
        if (fs.existsSync(task.output)) {
            console.log(`File already exists, skipping.`);
            continue;
        }
        await generateWithNanoBananaPro({
            prompt: task.prompt,
            outputPath: task.output,
            referenceImagePaths: [DEER_WALK_REF]
        });
        console.log(`Deer ${task.name} generated successfully.`);
    }
    console.log('\nAll Deer actions generated!');
}

run().catch(err => {
    console.error('Generation failed:', err);
    process.exit(1);
});

