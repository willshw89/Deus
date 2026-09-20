'use strict';

/**
 * tools/generate_sheep_actions.js
 *
 * Generates Eat, Attack, and Sleep 12-sprite action sheets for Wild Mountain Sheep
 * using Google Nano Banana Pro (gemini-3-pro-image), conditioned on the
 * master Walk sheet (art/raw/pro_sheep_walk.png) as reference.
 */

const fs = require('fs');
const path = require('path');
const { generateWithNanoBananaPro } = require('./generate_nano_banana_pro');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'raw');
const SHEEP_WALK_REF = path.join(RAW_DIR, 'pro_sheep_walk.png');

const tasks = [
    {
        name: 'Eat',
        output: path.join(RAW_DIR, 'pro_sheep_eat.png'),
        prompt: `16-bit SNES pixel art creature sprite sheet of the EXACT SAME Wild Mountain Sheep from the reference image, performing an EATING / GRAZING ANIMATION.
Grid of exactly 12 sprites arranged in 3 columns by 4 rows on a solid flat uniform magenta #FF00FF background.
Row 1 (top row): 3 sprites facing South (front view), grazing sequence: head lowered to ground level nibbling shrubs, spiral horns curving forward, chewing slowly with heavy wool fleece.
Row 2 (second row): 3 sprites facing West (profile facing left), grazing sequence: head down grazing, head raised chewing, head down grazing.
Row 3 (third row): 3 sprites facing East (profile facing right), grazing sequence: head down grazing, head raised chewing, head down grazing.
Row 4 (bottom row): 3 sprites facing North (back view), back view of sheep grazing with head down.
Maintain EXACT same creature scale, thick wool fleece, curving spiral horns, proportions, and style as the reference image. Crisp pixel art, clean dark silhouette outlines, no background bleed, solid flat magenta #FF00FF background.`
    },
    {
        name: 'Attack',
        output: path.join(RAW_DIR, 'pro_sheep_attack.png'),
        prompt: `16-bit SNES pixel art creature sprite sheet of the EXACT SAME Wild Mountain Sheep from the reference image, performing a HEADBUTT / HORN RAM ATTACK.
CRITICAL CONSTRAINT: ZERO FLYING PROJECTILES, ZERO MAGIC BEAMS. Strictly physical beast combat animation.
Grid of exactly 12 sprites arranged in 3 columns by 4 rows on a solid flat uniform magenta #FF00FF background.
Row 1 (top row): 3 sprites facing South (front view), ram attack: frame 1: tucking chin down with spiral horns pointed forward; frame 2: violent forward ramming impact; frame 3: battle recovery stance.
Row 2 (second row): 3 sprites facing West (profile facing left), ram attack: frame 1: backing up and lowering head; frame 2: explosive forward headbutt strike; frame 3: recovery.
Row 3 (third row): 3 sprites facing East (profile facing right), ram attack: frame 1: backing up and lowering head; frame 2: explosive forward headbutt strike; frame 3: recovery.
Row 4 (bottom row): 3 sprites facing North (back view), horn ram attack sequence.
Maintain EXACT same creature scale, wool fleece, curving spiral horns, proportions, and style as the reference image. Crisp pixel art, clean dark silhouette outlines, solid flat magenta #FF00FF background.`
    },
    {
        name: 'Sleep',
        output: path.join(RAW_DIR, 'pro_sheep_sleep.png'),
        prompt: `16-bit SNES pixel art creature sprite sheet of the EXACT SAME Wild Mountain Sheep from the reference image, RESTING AND SLEEPING FLAT ON THE GROUND.
Grid of exactly 12 sprites arranged in 3 columns by 4 rows on a solid flat uniform magenta #FF00FF background.
Row 1 (top row): 3 sprites facing South (front view), sleeping cycle: bedded down with hooves tucked beneath thick wool fleece, head resting low on ground, horns curving along side, eyes closed peacefully.
Row 2 (second row): 3 sprites facing West (profile facing left), curled up bedded down on ground, head rested, eyes closed, slow breathing loop.
Row 3 (third row): 3 sprites facing East (profile facing right), curled up bedded down on ground, head rested, eyes closed, slow breathing loop.
Row 4 (bottom row): 3 sprites facing North (back view), back view of bedded sheep resting curled on ground.
Maintain EXACT same creature scale, thick wool fleece, curving spiral horns, proportions, and style as the reference image. Low grounded height (~18-22px height when bedded down), crisp pixel art, clean dark silhouette outlines, solid flat magenta #FF00FF background.`
    }
];

async function run() {
    for (const task of tasks) {
        console.log(`\n========================================`);
        console.log(`Generating Sheep ${task.name}...`);
        console.log(`Output: ${task.output}`);
        if (fs.existsSync(task.output)) {
            console.log(`File already exists, skipping.`);
            continue;
        }
        await generateWithNanoBananaPro({
            prompt: task.prompt,
            outputPath: task.output,
            referenceImagePaths: [SHEEP_WALK_REF]
        });
        console.log(`Sheep ${task.name} generated successfully.`);
    }
    console.log('\nAll Sheep actions generated!');
}

run().catch(err => {
    console.error('Generation failed:', err);
    process.exit(1);
});

