'use strict';

/**
 * tools/generate_female_variations.js
 *
 * Generates the full suite of character sheets for Adult Female Human variations (2 to 6)
 * across all 7 actions: Walk, Haul, Attack, Bow, Magic, Work, Downed
 * using Google Nano Banana Pro (gemini-3-pro-image) per AGENTS.md Rule 11.
 *
 * Each variation's Walk sheet is conditioned on the master Female reference image.
 * Each variation's 6 remaining actions are conditioned on its own Walk sheet.
 */

const fs = require('fs');
const path = require('path');
const { generateWithNanoBananaPro } = require('./generate_nano_banana_pro');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'raw');
const MASTER_REF = path.join(RAW_DIR, 'references', 'human_female_walk_12_reference.png');

const FEMALE_VARIATION_SPECS = {
    2: {
        name: 'Variation 2 (Frontier Scout / Wayfinder)',
        features: 'Adult Female Human Settler with golden blonde hair neatly bound in twin braids, clean-shaven, serious determined expression with narrow eyes, forest olive-green archer tunic with dark leather vest, soft leather armguards, dark trousers, sturdy trail boots.',
        walkFile: 'human_female_var2_pro_4d_walk.png',
        attackDesc: 'MELEE COMBAT WITH DUAL FRONTIER HUNTING DAGGERS. Frame 1: Low twin-dagger ready guard; Frame 2: Rapid cross-slash strike with curved glowing steel blade arcs; Frame 3: Balanced recovery stance.',
        bowDesc: 'ARCHERY WITH LIGHT COMPOSITE YEW SCOUT BOW. Frame 1: Ready bow grip with quiver on back; Frame 2: Full string tension draw pulling fletched arrow to cheek; Frame 3: String pluck recoil with vibrating bowstring. ZERO flying arrows (VISION V111).',
        workDesc: 'FORESTER SCOUT CRAFT WORK. Frame 1: Standing inspection holding a small woodsman whittling knife; Frame 2: Kneeling craftsman down low (~28px height) carving timber; Frame 3: Ground wood strike / chipping block with knife. Solid flat magenta background with no furniture or large timber blocks.'
    },
    3: {
        name: 'Variation 3 (Heavy Guard / Shieldmaiden Veteran)',
        features: 'Adult Female Human Settler with raven black hair bound in a high warrior topknot, stern stoic gaze with narrow eyes, charcoal-grey reinforced quilted tunic with iron studs and cross-strap, dark wool trousers, heavy boots.',
        walkFile: 'human_female_var3_pro_4d_walk.png',
        attackDesc: 'MELEE COMBAT WITH HEAVY IRON BROADSWORD. Frame 1: High two-handed broadsword ready guard; Frame 2: Powerful downward cleave swing with curved glowing steel slash arc; Frame 3: Solid recovery stance.',
        bowDesc: 'ARCHERY WITH GARRISON RECURVE LONGBOW. Frame 1: Tall recurve bow ready stance with quiver on back; Frame 2: Full tension draw pulling heavy war arrow to chin; Frame 3: String release pluck recoil. ZERO flying arrows (VISION V111).',
        workDesc: 'TOWN GUARD FORTIFICATION WORK. Frame 1: Standing inspection holding an iron hammer; Frame 2: Kneeling craftsman down low (~28px height) inspecting palisade timber; Frame 3: Ground heavy hammer strike driving iron stake. Solid flat magenta background with no furniture or large timber blocks.'
    },
    4: {
        name: 'Variation 4 (Artisan Herbalist / Woodcrafter)',
        features: 'Adult Female Human Settler with fiery copper-red / auburn hair with loose locks framing face, serious determined expression with narrow eyes, terracotta/ochre artisan kirtle dress with rolled-up linen sleeves, utility belt with pouch satchel, sturdy work boots.',
        walkFile: 'human_female_var4_pro_4d_walk.png',
        attackDesc: 'MELEE COMBAT WITH CURVED WOODCUTTER HATCHET / CLEAVER. Frame 1: Two-handed high hatchet ready guard; Frame 2: Sweeping horizontal woodcutter cleave with glowing steel slash arc; Frame 3: Balanced recovery stance.',
        bowDesc: 'ARCHERY WITH COMPACT FORESTER BOW. Frame 1: Compact recurve bow ready stance with quiver; Frame 2: Smooth string tension draw to corner of jaw; Frame 3: String pluck recoil. ZERO flying arrows (VISION V111).',
        workDesc: 'HERBALIST & WOODWORKING CRAFT. Frame 1: Standing inspection with wooden mallet; Frame 2: Kneeling craftsman down low (~28px height) checking craft; Frame 3: Ground strike down with carpentry mallet. Solid flat magenta background with no furniture or large timber blocks.'
    },
    5: {
        name: 'Variation 5 (Forge Artisan / Quarrywoman)',
        features: 'Adult Female Human Settler with dark brown / black hair tied tightly in a leather kerchief / work band, soot-dusted hardy countenance with focused narrow eyes, heavy rawhide leather smithing apron over rolled-sleeve woolen kirtle, thick work boots.',
        walkFile: 'human_female_var5_pro_4d_walk.png',
        attackDesc: 'MELEE COMBAT WITH HEAVY FORGE HAMMER / MINER PICKAXE. Frame 1: Two-handed high hammer ready guard; Frame 2: Crushing downward sledgehammer strike with impact arc; Frame 3: Braced recovery stance.',
        bowDesc: 'RANGED COMBAT WITH HEAVY MINER CROSSBOW / SLING. Frame 1: Ready aim stance; Frame 2: Full tension draw pulling cord tight; Frame 3: Release pluck recoil. ZERO flying projectiles (VISION V111).',
        workDesc: 'BLACKSMITH FORGING WORK. Frame 1: Standing inspection holding smithing tongs; Frame 2: Kneeling blacksmith down low (~28px height) checking craft; Frame 3: Heavy hammer strike down on ground anvil. Solid flat magenta background with no furniture or large blocks.'
    },
    6: {
        name: 'Variation 6 (Seasoned Veteran Huntress / Ranger Captain)',
        features: 'Mature Adult Female Human Settler with ash-blonde / salt-and-pepper braided hair, weathered stoic expression with focused narrow eyes, deep indigo-blue woolen cloak tunic with leather shoulder pauldron and cross-strap quiver, cuffed leather boots.',
        walkFile: 'human_female_var6_pro_4d_walk.png',
        attackDesc: 'MELEE COMBAT WITH STEEL HUNTING SABRE / SIDEARM SWORD. Frame 1: Low blade ready guard; Frame 2: Swift diagonal lunge slash with curved steel blade arc; Frame 3: Deft recovery stance.',
        bowDesc: 'ARCHERY WITH ARTHURIAN YEW LONGBOW. Frame 1: Tall classic longbow aim stance with quiver on shoulder; Frame 2: Magnificent full draw pulling shaft to ear; Frame 3: String pluck recoil with vibrating bowstring. ZERO flying arrows (VISION V111).',
        workDesc: 'RANGER FIELDCRAFT WORK. Frame 1: Standing inspection holding hunting knife; Frame 2: Kneeling ranger down low (~28px height) checking trail; Frame 3: Ground strike working craft. Solid flat magenta background with no furniture or large blocks.'
    }
};

function getPrompt(varNum, actionName) {
    const spec = FEMALE_VARIATION_SPECS[varNum];
    if (!spec) throw new Error(`Unknown variation: ${varNum}`);

    if (actionName === 'Walk') {
        return `16-bit SNES pixel art sprite sheet of an Adult Female Human Settler variation matching the serious chibi style (~3.1 heads tall, upright battle-ready posture, focused stern gaze, ~42px height) and exact scale of the reference character.
Character features: ${spec.features}
4-direction walk cycle on a 6x3 grid with solid magenta background (#FF00FF).
Row 1: South front walk cycle (step, stand, step).
Row 2: Side profile walk cycle with clear alternating leg strides (left leg forward, standing/passing, right leg forward).
Row 3: North back walk cycle (step, stand, step).
Clean solid colors, authentic pixel art, sharp dark outlines, grounded baseline at bottom of cells, matching reference proportions identically.`;
    }

    const basePrefix = `16-bit SNES pixel art character sprite sheet of the EXACT SAME Adult Female Human Settler from the reference image in serious chibi style, upright 3/4 top-down perspective, Final Fantasy V / Seiken Densetsu style. Same serious chibi proportions (~3.1 heads tall, upright posture, ~42px height) and identical facial features, hair, and clothing as the reference image.
Grid of animation sprites on solid flat uniform magenta #FF00FF background.
Row 1: South facing front view (3 frames).
Row 2: Side profile view facing left and right (3 frames).
Row 3: North facing back view (3 frames).`;

    const baseSuffix = `Strictly maintain identical anatomical scale, proportions, skin tone, hair, and clothing palette from the reference image. Crisp pixel art, clean dark silhouette outlines, no blur, solid flat magenta #FF00FF background.`;

    if (actionName === 'Haul') {
        return `${basePrefix}
ACTION: DEDICATED HEAVY LOAD HAULING / CARRYING CYCLE (AR-600 col 7 / VISION V113).
Row 1: 3 sprites facing South (front view), carrying a heavy burlap sack in both arms tightly against the chest, walk cycle (step, stand, step).
Row 2: Side profile walk carrying the heavy burlap sack held in front of chest in both arms.
Row 3: North facing back view carrying the sack in front of chest.
${baseSuffix}`;
    }

    if (actionName === 'Attack') {
        return `${basePrefix}
ACTION: ${spec.attackDesc}
Row 1: 3 sprites facing South (front view), attack animation (frame 1: ready guard; frame 2: attack swing with slash arc; frame 3: recovery stance).
Row 2: Side profile attack animation with weapon slash arc.
Row 3: North facing back view attack animation.
${baseSuffix}`;
    }

    if (actionName === 'Bow') {
        return `${basePrefix}
ACTION: ${spec.bowDesc}
Row 1: 3 sprites facing South (front view), archery animation (frame 1: aim stance; frame 2: full string tension draw; frame 3: pluck recoil).
Row 2: Side profile archery animation with string draw and pluck recoil.
Row 3: North facing back view archery animation.
${baseSuffix}`;
    }

    if (actionName === 'Magic') {
        return `${basePrefix}
ACTION: FANTASY SPELLCASTING POSTURE (VISION V111).
Row 1: 3 sprites facing South (front view), spellcasting posture (frame 1: standing ready posture; frame 2: hands raised channeling soft light; frame 3: soft glowing palm aura initiation). ZERO flying projectile beams or leaf bursts.
Row 2: Side profile spellcasting posture with soft glowing palm aura.
Row 3: North facing back view spellcasting posture.
${baseSuffix}`;
    }

    if (actionName === 'Work') {
        return `${basePrefix}
ACTION: ${spec.workDesc}
Row 1: 3 sprites facing South (front view), craftsman cycle (frame 1: standing inspection; frame 2: kneeling craftsman down low ~28px height; frame 3: ground tool strike).
Row 2: Side profile craftsman cycle (standing, kneeling craftsman down low, ground strike).
Row 3: North facing back view craftsman cycle.
${baseSuffix}`;
    }

    if (actionName === 'Downed') {
        return `${basePrefix}
ACTION: DEFEAT COLLAPSE AND PRONE RESTING POSTURE (AR-600 col 6).
Row 1: 3 sprites facing South (front view), defeat sequence (frame 1: hurt flinch stagger clutching torso; frame 2: kneeling collapse posture down low ~28px; frame 3: flat horizontal prone resting sprite lying down on the ground ~14px height).
Row 2: Side profile defeat sequence (hurt flinch, kneeling collapse, flat horizontal prone resting sprite).
Row 3: North back defeat sequence.
${baseSuffix}`;
    }

    throw new Error(`Unknown action: ${actionName}`);
}

async function generateFemaleVariation(varNum, actionsToRun = null) {
    const spec = FEMALE_VARIATION_SPECS[varNum];
    if (!spec) throw new Error(`Unknown variation: ${varNum}`);

    const allActions = ['Walk', 'Haul', 'Attack', 'Bow', 'Magic', 'Work', 'Downed'];
    const actions = actionsToRun || allActions;

    console.log(`\n======================================================`);
    console.log(`=== Processing Adult Female Human Variation ${varNum} ===`);
    console.log(`=== ${spec.name} ===`);
    console.log(`======================================================\n`);

    for (const act of actions) {
        const outBase = `human_female_var${varNum}_pro_4d_${act.toLowerCase()}`;
        const outPng = path.join(RAW_DIR, `${outBase}.png`);
        const outJpg = path.join(RAW_DIR, `${outBase}.jpg`);

        if (fs.existsSync(outPng)) {
            console.log(`[SKIP] Already exists: ${outPng}`);
            continue;
        }

        const prompt = getPrompt(varNum, act);
        const refImage = (act === 'Walk')
            ? MASTER_REF
            : path.join(RAW_DIR, spec.walkFile);

        console.log(`\n--- Generating ${spec.name} [${act}] ---`);
        console.log(`Output: ${outPng}`);
        console.log(`Reference: ${refImage}`);

        await generateWithNanoBananaPro({
            prompt,
            outputPath: outPng,
            referenceImagePaths: [refImage]
        });
        console.log(`[DONE] Generated: ${outPng}`);
    }
}

module.exports = {
    FEMALE_VARIATION_SPECS,
    getPrompt,
    generateFemaleVariation
};

if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.log('Usage: node tools/generate_female_variations.js <varNum|all> [actionName]');
        process.exit(1);
    }

    const varArg = args[0];
    const actionArg = args[1] || null;
    const varsToRun = varArg === 'all' ? [2, 3, 4, 5, 6] : [parseInt(varArg, 10)];
    const actionsToRun = actionArg ? [actionArg] : null;

    (async () => {
        for (const v of varsToRun) {
            await generateFemaleVariation(v, actionsToRun);
        }
    })().then(() => {
        console.log('\nAll requested female variations completed successfully.');
        process.exit(0);
    }).catch(err => {
        console.error('Fatal generation error:', err);
        process.exit(1);
    });
}
