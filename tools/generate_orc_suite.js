'use strict';

/**
 * tools/generate_orc_suite.js
 *
 * Generates the full 7-action 12-sprite suite for Adult Male Orc
 * using Google Nano Banana Pro (gemini-3-pro-image).
 * Conditioned on the first master Walk reference image for 100% character consistency.
 */

const fs = require('fs');
const path = require('path');
const { generateWithNanoBananaPro } = require('./generate_nano_banana_pro');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'raw');
const REF_DIR = path.join(RAW_DIR, 'references');

fs.mkdirSync(RAW_DIR, { recursive: true });
fs.mkdirSync(REF_DIR, { recursive: true });

const WALK_RAW = path.join(RAW_DIR, 'orc_male_walk_12_raw.png');
const WALK_REF = path.join(REF_DIR, 'orc_male_walk_12_reference.png');

const PROMPT_WALK = `16-bit SNES pixel art character sprite sheet of an Adult Male Orc Settler / Raider in serious chibi style, upright 3/4 top-down perspective, Final Fantasy V / Seiken Densetsu style.
Grid of exactly 12 sprites arranged in 3 columns by 4 rows on a solid flat uniform magenta #FF00FF background.
Row 1 (top row): 3 sprites facing South (front view), walk cycle (left step, standing neutral, right step).
Row 2 (second row): 3 sprites facing West (profile/side view facing left), walk cycle (left step, standing neutral, right step).
Row 3 (third row): 3 sprites facing East (profile/side view facing right), walk cycle (left step, standing neutral, right step).
Row 4 (bottom row): 3 sprites facing North (back view), walk cycle (left step, standing neutral, right step).
Character appearance: Muscular, powerful fantasy mountain orc with grey-green skin, two prominent upward-pointing tusks from lower jaw, dark hair tied into a rugged topknot, rough beast-hide vest with iron studs, wide studded leather belt with iron buckle, coarse dark trousers, and wrapped fur-lined leather boots. Fierce, determined, stoic expression with focused narrow eyes.
Consistent broad-shouldered muscular proportions across all 12 sprites, crisp pixel art, clean silhouette outlines, no blur, no anti-aliasing against background, solid flat magenta #FF00FF background.`;

async function main() {
    console.log('--- Step 1: Generating Master Walk Sheet for Adult Male Orc ---');
    if (!fs.existsSync(WALK_RAW)) {
        console.log('Generating:', WALK_RAW);
        await generateWithNanoBananaPro({
            prompt: PROMPT_WALK,
            outputPath: WALK_RAW,
            referenceImagePaths: []
        });
        console.log('Master Walk generated.');
    } else {
        console.log('Master Walk already exists at:', WALK_RAW);
    }

    // Save as reference image for subsequent sheets
    fs.copyFileSync(WALK_RAW, WALK_REF);
    console.log('Saved master reference image to:', WALK_REF);

    const actions = [
        {
            name: 'Haul',
            file: path.join(RAW_DIR, 'orc_male_haul_12_raw.png'),
            prompt: `16-bit SNES pixel art character sprite sheet of the EXACT SAME Adult Male Orc from the reference image, performing a DEDICATED HEAVY LOAD HAULING / CARRYING CYCLE.
Grid of exactly 12 sprites arranged in 3 columns by 4 rows on a solid flat uniform magenta #FF00FF background.
Row 1 (top row): 3 sprites facing South (front view), carrying a heavy timber log / rough ore crate in both arms tightly against the chest, walk cycle (step, stand, step).
Row 2 (second row): 3 sprites facing West (profile facing left), carrying the heavy load held in front of chest, walk cycle.
Row 3 (third row): 3 sprites facing East (profile facing right), carrying the heavy load held in front of chest, walk cycle.
Row 4 (bottom row): 3 sprites facing North (back view), carrying the heavy load in front of chest (visible around shoulders/sides), walk cycle.
Maintain EXACT same character scale, grey-green skin, tusks, dark topknot, clothing, proportions, and style as the reference image. Crisp pixel art, clean dark silhouette outlines, solid flat magenta #FF00FF background.`
        },
        {
            name: 'Attack',
            file: path.join(RAW_DIR, 'orc_male_attack_12_raw.png'),
            prompt: `16-bit SNES pixel art character sprite sheet of the EXACT SAME Adult Male Orc from the reference image, performing a MELEE COMBAT BRUTAL CHOPPER / CLEAVER CLEAVE ATTACK.
Grid of exactly 12 sprites arranged in 3 columns by 4 rows on a solid flat uniform magenta #FF00FF background.
Row 1 (top row): 3 sprites facing South (front view), attack animation (frame 1: high ready guard holding heavy notched iron chopper cleaver; frame 2: powerful downward cleave swing with curved glowing steel slash arc; frame 3: battle recovery stance).
Row 2 (second row): 3 sprites facing West (profile facing left), cleaver strike with slash arc (frame 1: draw back; frame 2: horizontal cleave slash arc; frame 3: recovery).
Row 3 (third row): 3 sprites facing East (profile facing right), cleaver strike with slash arc (frame 1: draw back; frame 2: horizontal cleave slash arc; frame 3: recovery).
Row 4 (bottom row): 3 sprites facing North (back view), cleaver overhead strike sequence.
Maintain EXACT same character scale, grey-green skin, tusks, dark topknot, clothing, proportions, and style as the reference image. Crisp pixel art, clean dark silhouette outlines, solid flat magenta #FF00FF background.`
        },
        {
            name: 'Bow',
            file: path.join(RAW_DIR, 'orc_male_bow_12_raw.png'),
            prompt: `16-bit SNES pixel art character sprite sheet of the EXACT SAME Adult Male Orc from the reference image, performing a HEAVY WAR BOW / RECURVE BOW ATTACK.
CRITICAL CONSTRAINT: ZERO FLYING ARROWS OR PROJECTILES. This animation is strictly the weapon manipulation and recoil.
Grid of exactly 12 sprites arranged in 3 columns by 4 rows on a solid flat uniform magenta #FF00FF background.
Row 1 (top row): 3 sprites facing South (front view), war bow aim and shoot (frame 1: aiming heavy wood and horn war bow forward; frame 2: pulling heavy string tension to ear; frame 3: string release pluck recoil, ZERO flying arrows).
Row 2 (second row): 3 sprites facing West (profile facing left), bow aim, draw tension, and string release recoil (ZERO flying arrows).
Row 3 (third row): 3 sprites facing East (profile facing right), bow aim, draw tension, and string release recoil (ZERO flying arrows).
Row 4 (bottom row): 3 sprites facing North (back view), bow aim, draw tension, and string release recoil.
Maintain EXACT same character scale, grey-green skin, tusks, dark topknot, clothing, proportions, and style as the reference image. Crisp pixel art, clean dark silhouette outlines, solid flat magenta #FF00FF background.`
        },
        {
            name: 'Magic',
            file: path.join(RAW_DIR, 'orc_male_magic_12_raw.png'),
            prompt: `16-bit SNES pixel art character sprite sheet of the EXACT SAME Adult Male Orc from the reference image, performing a SHAMANIC BLOOD TOTEM / WAR CHANT INCANTATION.
CRITICAL CONSTRAINT: ZERO FLYING BEAMS, ZERO LASERS, ZERO PROJECTILES. Only spell initiation posture with soft glowing palm or totem aura.
Grid of exactly 12 sprites arranged in 3 columns by 4 rows on a solid flat uniform magenta #FF00FF background.
Row 1 (top row): 3 sprites facing South (front view), casting sequence (frame 1: holding carved bone war totem high, beginning deep vocal war chant; frame 2: hands and totem channeled forward with glowing crimson blood mana aura around palms; frame 3: spell completion posture with soft red aura).
Row 2 (second row): 3 sprites facing West (profile facing left), incantation posture with soft crimson palm aura.
Row 3 (third row): 3 sprites facing East (profile facing right), incantation posture with soft crimson palm aura.
Row 4 (bottom row): 3 sprites facing North (back view), raising totem and channeling blood war magic.
Maintain EXACT same character scale, grey-green skin, tusks, dark topknot, clothing, proportions, and style as the reference image. Crisp pixel art, clean dark silhouette outlines, solid flat magenta #FF00FF background.`
        },
        {
            name: 'Work',
            file: path.join(RAW_DIR, 'orc_male_work_12_raw.png'),
            prompt: `16-bit SNES pixel art character sprite sheet of the EXACT SAME Adult Male Orc from the reference image, performing CRAFTING / MINING / FORGING WORK.
Grid of exactly 12 sprites arranged in 3 columns by 4 rows on a solid flat uniform magenta #FF00FF background.
Row 1 (top row): 3 sprites facing South (front view), crafting cycle (frame 1: standing checking work with heavy iron hammer; frame 2: kneeling down low on one knee near ground (~30px height); frame 3: striking downward with hammer on iron anvil / stone block on ground).
Row 2 (second row): 3 sprites facing West (profile facing left), work cycle (standing, kneeling craftsman, striking downward on ground anvil).
Row 3 (third row): 3 sprites facing East (profile facing right), work cycle (standing, kneeling craftsman, striking downward on ground anvil).
Row 4 (bottom row): 3 sprites facing North (back view), kneeling back view striking work on ground.
Maintain EXACT same character scale, grey-green skin, tusks, dark topknot, clothing, proportions, and style as the reference image. Crisp pixel art, clean dark silhouette outlines, solid flat magenta #FF00FF background.`
        },
        {
            name: 'Downed',
            file: path.join(RAW_DIR, 'orc_male_downed_12_raw.png'),
            prompt: `16-bit SNES pixel art character sprite sheet of the EXACT SAME Adult Male Orc from the reference image, performing a DEFEAT / DOWNED / CORPSE SEQUENCE.
Grid of exactly 12 sprites arranged in 3 columns by 4 rows on a solid flat uniform magenta #FF00FF background.
Row 1 (top row): 3 sprites facing South (front view), defeat sequence (frame 1: hurt flinch clutching side wound; frame 2: collapsing to knees (~28px height); frame 3: completely flat horizontal prone resting corpse lying on the ground (~16px height)).
Row 2 (second row): 3 sprites facing West (profile facing left), hurt recoil, falling forward, completely horizontal prone corpse lying on ground.
Row 3 (third row): 3 sprites facing East (profile facing right), hurt recoil, falling forward, completely horizontal prone corpse lying on ground.
Row 4 (bottom row): 3 sprites facing North (back view), stagger backward, collapse, flat horizontal prone resting corpse lying on ground.
Maintain EXACT same character scale, grey-green skin, tusks, dark topknot, clothing, proportions, and style as the reference image. Crisp pixel art, clean dark silhouette outlines, solid flat magenta #FF00FF background.`
        }
    ];

    for (const act of actions) {
        console.log(`\n--- Generating Action: ${act.name} ---`);
        if (fs.existsSync(act.file)) {
            console.log(`Action ${act.name} already exists at: ${act.file}`);
            continue;
        }
        await generateWithNanoBananaPro({
            prompt: act.prompt,
            outputPath: act.file,
            referenceImagePaths: [WALK_REF]
        });
        console.log(`Completed ${act.name}.`);
    }

    console.log('\nAll 7 Adult Male Orc action sheets successfully generated!');
}

main().catch(err => {
    console.error('Generation failed:', err);
    process.exit(1);
});
