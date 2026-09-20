'use strict';

/**
 * tools/generate_female_orc_suite.js
 *
 * Generates the full 7-action 12-sprite suite for Adult Female Orc
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

const WALK_RAW = path.join(RAW_DIR, 'orc_female_walk_12_raw.png');
const WALK_REF = path.join(REF_DIR, 'orc_female_walk_12_reference.png');

const PROMPT_WALK = `16-bit SNES pixel art character sprite sheet of an Adult Female Orc Warrior / Settler in serious chibi style, upright 3/4 top-down perspective, Final Fantasy V / Seiken Densetsu style.
Grid of exactly 12 sprites arranged in 3 columns by 4 rows on a solid flat uniform magenta #FF00FF background.
Row 1 (top row): 3 sprites facing South (front view), walk cycle (left step, standing neutral, right step).
Row 2 (second row): 3 sprites facing West (profile/side view facing left), walk cycle (left step, standing neutral, right step).
Row 3 (third row): 3 sprites facing East (profile/side view facing right), walk cycle (left step, standing neutral, right step).
Row 4 (bottom row): 3 sprites facing North (back view), walk cycle (left step, standing neutral, right step).
Character appearance: Powerful, athletic fantasy orc woman warrior with grey-green skin, small upward-pointing tusks from lower jaw, thick dark hair plaited into a tight warrior braid tied back, tough beast-hide vest with iron rivets, leather arm bracers, studded leather belt with iron buckle, dark wrap trousers, and sturdy boots. Fierce, determined, stoic expression with focused narrow eyes.
Consistent athletic proportions across all 12 sprites, crisp pixel art, clean silhouette outlines, no blur, no anti-aliasing against background, solid flat magenta #FF00FF background.`;

async function main() {
    console.log('--- Step 1: Generating Master Walk Sheet for Adult Female Orc ---');
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

    fs.copyFileSync(WALK_RAW, WALK_REF);
    console.log('Saved master reference image to:', WALK_REF);

    const actions = [
        {
            name: 'Haul',
            file: path.join(RAW_DIR, 'orc_female_haul_12_raw.png'),
            prompt: `16-bit SNES pixel art character sprite sheet of the EXACT SAME Adult Female Orc from the reference image, performing a DEDICATED HEAVY LOAD HAULING / CARRYING CYCLE.
Grid of exactly 12 sprites arranged in 3 columns by 4 rows on a solid flat uniform magenta #FF00FF background.
Row 1 (top row): 3 sprites facing South (front view), carrying a heavy cargo sack / timber in both arms tightly against the chest, walk cycle (step, stand, step).
Row 2 (second row): 3 sprites facing West (profile facing left), carrying the heavy cargo held in front of chest, walk cycle.
Row 3 (third row): 3 sprites facing East (profile facing right), carrying the heavy cargo held in front of chest, walk cycle.
Row 4 (bottom row): 3 sprites facing North (back view), carrying the heavy cargo in front of chest, walk cycle.
Maintain EXACT same character scale, grey-green skin, dark warrior braid, clothing, proportions, and style as the reference image. Crisp pixel art, clean dark silhouette outlines, solid flat magenta #FF00FF background.`
        },
        {
            name: 'Attack',
            file: path.join(RAW_DIR, 'orc_female_attack_12_raw.png'),
            prompt: `16-bit SNES pixel art character sprite sheet of the EXACT SAME Adult Female Orc from the reference image, performing a MELEE COMBAT JAGGED WAR AXE / CLEAVER ATTACK.
Grid of exactly 12 sprites arranged in 3 columns by 4 rows on a solid flat uniform magenta #FF00FF background.
Row 1 (top row): 3 sprites facing South (front view), attack animation (frame 1: high ready guard with iron war axe; frame 2: powerful cleave swing with curved glowing steel slash arc; frame 3: battle recovery stance).
Row 2 (second row): 3 sprites facing West (profile facing left), war axe strike with slash arc.
Row 3 (third row): 3 sprites facing East (profile facing right), war axe strike with slash arc.
Row 4 (bottom row): 3 sprites facing North (back view), war axe overhead cleave attack sequence.
Maintain EXACT same character scale, grey-green skin, dark warrior braid, clothing, proportions, and style as the reference image. Crisp pixel art, clean dark silhouette outlines, solid flat magenta #FF00FF background.`
        },
        {
            name: 'Bow',
            file: path.join(RAW_DIR, 'orc_female_bow_12_raw.png'),
            prompt: `16-bit SNES pixel art character sprite sheet of the EXACT SAME Adult Female Orc from the reference image, performing a HEAVY WAR BOW / RECURVE BOW ATTACK.
CRITICAL CONSTRAINT: ZERO FLYING ARROWS OR PROJECTILES. This animation is strictly the weapon manipulation and recoil.
Grid of exactly 12 sprites arranged in 3 columns by 4 rows on a solid flat uniform magenta #FF00FF background.
Row 1 (top row): 3 sprites facing South (front view), war bow aim and shoot (frame 1: aiming heavy bow forward; frame 2: drawing string tension to cheek; frame 3: trigger release and subtle weapon recoil, ZERO flying arrows).
Row 2 (second row): 3 sprites facing West (profile facing left), bow aim, draw tension, and release recoil (ZERO flying arrows).
Row 3 (third row): 3 sprites facing East (profile facing right), bow aim, draw tension, and release recoil (ZERO flying arrows).
Row 4 (bottom row): 3 sprites facing North (back view), bow aim, draw tension, and release recoil.
Maintain EXACT same character scale, grey-green skin, dark warrior braid, clothing, proportions, and style as the reference image. Crisp pixel art, clean dark silhouette outlines, solid flat magenta #FF00FF background.`
        },
        {
            name: 'Magic',
            file: path.join(RAW_DIR, 'orc_female_magic_12_raw.png'),
            prompt: `16-bit SNES pixel art character sprite sheet of the EXACT SAME Adult Female Orc from the reference image, performing a SHAMANIC WAR CHANT INCANTATION.
CRITICAL CONSTRAINT: ZERO FLYING BEAMS, ZERO LASERS, ZERO PROJECTILES. Only spell initiation posture with soft glowing palm or totem aura.
Grid of exactly 12 sprites arranged in 3 columns by 4 rows on a solid flat uniform magenta #FF00FF background.
Row 1 (top row): 3 sprites facing South (front view), casting sequence (frame 1: raising bone focus, beginning vocal incantation; frame 2: channeling ritual forward with glowing crimson mana aura around hands; frame 3: spell release posture with soft glowing aura).
Row 2 (second row): 3 sprites facing West (profile facing left), incantation posture with soft crimson aura.
Row 3 (third row): 3 sprites facing East (profile facing right), incantation posture with soft crimson aura.
Row 4 (bottom row): 3 sprites facing North (back view), channeling ritual magic with glowing aura.
Maintain EXACT same character scale, grey-green skin, dark warrior braid, clothing, proportions, and style as the reference image. Crisp pixel art, clean dark silhouette outlines, solid flat magenta #FF00FF background.`
        },
        {
            name: 'Work',
            file: path.join(RAW_DIR, 'orc_female_work_12_raw.png'),
            prompt: `16-bit SNES pixel art character sprite sheet of the EXACT SAME Adult Female Orc from the reference image, performing CRAFTING / LEATHERWORKING / MINING WORK.
Grid of exactly 12 sprites arranged in 3 columns by 4 rows on a solid flat uniform magenta #FF00FF background.
Row 1 (top row): 3 sprites facing South (front view), crafting cycle (frame 1: standing checking work with tool; frame 2: kneeling down low on one knee near ground (~30px height); frame 3: striking downward with hammer/knife on leather/iron work on ground).
Row 2 (second row): 3 sprites facing West (profile facing left), work cycle (standing, kneeling, striking downward).
Row 3 (third row): 3 sprites facing East (profile facing right), work cycle (standing, kneeling, striking downward).
Row 4 (bottom row): 3 sprites facing North (back view), kneeling back view striking work on ground.
Maintain EXACT same character scale, grey-green skin, dark warrior braid, clothing, proportions, and style as the reference image. Crisp pixel art, clean dark silhouette outlines, solid flat magenta #FF00FF background.`
        },
        {
            name: 'Downed',
            file: path.join(RAW_DIR, 'orc_female_downed_12_raw.png'),
            prompt: `16-bit SNES pixel art character sprite sheet of the EXACT SAME Adult Female Orc from the reference image, performing a DEFEAT / DOWNED / CORPSE SEQUENCE.
Grid of exactly 12 sprites arranged in 3 columns by 4 rows on a solid flat uniform magenta #FF00FF background.
Row 1 (top row): 3 sprites facing South (front view), defeat sequence (frame 1: hurt flinch clutching side; frame 2: collapsing to knees (~28px height); frame 3: completely flat horizontal prone resting corpse lying on the ground (~16px height)).
Row 2 (second row): 3 sprites facing West (profile facing left), hurt recoil, falling forward, completely horizontal prone corpse lying on ground.
Row 3 (third row): 3 sprites facing East (profile facing right), hurt recoil, falling forward, completely horizontal prone corpse lying on ground.
Row 4 (bottom row): 3 sprites facing North (back view), stagger backward, collapse, flat horizontal prone resting corpse lying on ground.
Maintain EXACT same character scale, grey-green skin, dark warrior braid, clothing, proportions, and style as the reference image. Crisp pixel art, clean dark silhouette outlines, solid flat magenta #FF00FF background.`
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

    console.log('\nAll 7 Adult Female Orc action sheets successfully generated!');
}

main().catch(err => {
    console.error('Generation failed:', err);
    process.exit(1);
});
