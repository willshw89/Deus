'use strict';

/**
 * tools/generate_male_variation_actions.js
 *
 * Generates the 6 remaining actions (Haul, Attack, Bow, Magic, Work, Downed)
 * for an Adult Male Human variation using Google Nano Banana Pro (gemini-3-pro-image).
 * Each variation's master Walk sheet is used as the multimodal conditioning reference.
 */

const fs = require('fs');
const path = require('path');
const { generateWithNanoBananaPro } = require('./generate_nano_banana_pro');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'raw');

const VARIATION_SPECS = {
    2: {
        name: 'Variation 2 (Golden Blonde Scout / Forester)',
        desc: 'Adult Male Human Settler with golden blonde swept-back hair, clean-shaven with light blonde stubble, serious determined expression with narrow eyes, forest olive-green woolen tunic with dark leather vest, brown breeches, sturdy leather boots.',
        ref: 'human_male_var2_pro_4d_walk.png',
        attackDesc: 'MELEE COMBAT WITH DUAL FRONTIER HUNTING DAGGERS. Frame 1: Low twin-dagger ready guard; Frame 2: Rapid cross-slash strike with short curved glowing steel blade arcs; Frame 3: Balanced recovery stance.',
        bowDesc: 'ARCHERY WITH LIGHT COMPOSITE YEW SHORTBOW. Frame 1: Ready bow grip with quiver on back; Frame 2: Full string tension draw pulling fletched arrow to cheek; Frame 3: String pluck recoil with vibrating bowstring. ZERO flying arrows (VISION V111).',
        workDesc: 'FORESTER CRAFTSMAN WOODCARVING WORK. Frame 1: Standing inspection holding a small woodsman axe; Frame 2: Kneeling craftsman down low (~28px height) carving timber; Frame 3: Ground wood strike / chipping block with axe.'
    },
    3: {
        name: 'Variation 3 (Heavy Town Guard / Veteran)',
        desc: 'Adult Male Human Settler with raven black shaggy hair, full dark beard and mustache, serious determined expression with narrow eyes, charcoal grey wool tunic, iron-riveted leather cross-belt, dark trousers, heavy boots.',
        ref: 'human_male_var3_pro_4d_walk.png',
        attackDesc: 'MELEE COMBAT WITH HEAVY IRON BROADSWORD. Frame 1: High two-handed broadsword ready guard; Frame 2: Powerful downward cleave swing with curved glowing steel slash arc; Frame 3: Solid recovery stance.',
        bowDesc: 'ARCHERY WITH HEAVY GARRISON LONGBOW. Frame 1: Tall yew bow ready stance with quiver on back; Frame 2: Full tension draw pulling heavy war arrow to chin; Frame 3: String release pluck recoil. ZERO flying arrows (VISION V111).',
        workDesc: 'TOWN GUARD FORTIFICATION WORK. Frame 1: Standing inspection holding an iron hammer; Frame 2: Kneeling craftsman down low (~28px height) inspecting palisade timber; Frame 3: Ground heavy hammer strike driving iron stake.'
    },
    4: {
        name: 'Variation 4 (Artisan Woodsman / Carpenter)',
        desc: 'Adult Male Human Settler with fiery auburn hair, trimmed red goatee, serious determined expression with narrow eyes, terracotta/ochre artisan tunic with rolled-up sleeves, tool strap loops, brown work trousers, heavy boots.',
        ref: 'human_male_var4_pro_4d_walk.png',
        attackDesc: 'MELEE COMBAT WITH BROAD BEARDED WOODCUTTER AXE. Frame 1: Two-handed high axe ready guard; Frame 2: Sweeping horizontal woodcutter cleave with glowing steel slash arc; Frame 3: Balanced recovery stance.',
        bowDesc: 'ARCHERY WITH RECURVE FORESTER BOW. Frame 1: Compact recurve bow ready stance with quiver; Frame 2: Smooth string tension draw to corner of jaw; Frame 3: String pluck recoil. ZERO flying arrows (VISION V111).',
        workDesc: 'CARPENTER WOODWORKING CRAFT. Frame 1: Standing inspection with wooden mallet; Frame 2: Kneeling craftsman down low (~28px height) checking craft; Frame 3: Ground strike down with carpentry mallet. Solid flat magenta background with no furniture or large timber blocks.'
    },
    5: {
        name: 'Variation 5 (Blacksmith / Quarryman)',
        desc: 'Adult Male Human Settler with shaved bald head, rugged dark full beard and mustache, serious determined expression with narrow eyes, rawhide leather work vest over coarse off-white sleeves, heavy apron trousers, thick boots.',
        ref: 'human_male_var5_pro_4d_walk.png',
        attackDesc: 'MELEE COMBAT WITH HEAVY SMITHING HAMMER. Frame 1: Two-handed high hammer ready guard; Frame 2: Crushing downward sledgehammer strike with impact arc; Frame 3: Braced recovery stance.',
        bowDesc: 'RANGED COMBAT WITH HEAVY MINER SLING / CROSSBOW. Frame 1: Ready aim stance; Frame 2: Full tension draw pulling cord tight; Frame 3: Release pluck recoil. ZERO flying projectiles (VISION V111).',
        workDesc: 'BLACKSMITH FORGING WORK. Frame 1: Standing inspection holding smithing tongs; Frame 2: Kneeling blacksmith down low (~28px height) checking craft; Frame 3: Heavy hammer strike down. Solid flat magenta background with no furniture or large blocks.'
    },
    6: {
        name: 'Variation 6 (Seasoned Veteran Ranger)',
        desc: 'Mature Adult Male Human Settler with salt-and-pepper steel grey hair parted to side, trimmed grey beard and mustache, weathered stoic expression with focused narrow eyes, deep indigo-blue woolen tunic with leather cross-strap and quiver, dark trousers, boots.',
        ref: 'human_male_var6_pro_4d_walk.png',
        attackDesc: 'MELEE COMBAT WITH STEEL SIDEARM HUNTING SWORD. Frame 1: Low blade ready guard; Frame 2: Swift diagonal lunge slash with curved steel blade arc; Frame 3: Deft recovery stance.',
        bowDesc: 'ARCHERY WITH ARTHURIAN YEW LONGBOW. Frame 1: Tall classic longbow aim stance with quiver on shoulder; Frame 2: Magnificent full draw pulling shaft to ear; Frame 3: String pluck recoil with vibrating bowstring. ZERO flying arrows (VISION V111).',
        workDesc: 'RANGER FIELDCRAFT WORK. Frame 1: Standing inspection holding hunting knife; Frame 2: Kneeling ranger down low (~28px height) checking trail; Frame 3: Ground strike working craft. Solid flat magenta background with no furniture or large blocks.'
    }
};

function getActionPrompt(varNum, actionName) {
    const spec = VARIATION_SPECS[varNum];
    if (!spec) throw new Error(`Unknown variation: ${varNum}`);

    const basePrefix = `16-bit SNES pixel art character sprite sheet of the EXACT SAME Adult Male Human Settler from the reference image in serious chibi style, upright 3/4 top-down perspective, Final Fantasy V / Seiken Densetsu style. Same serious chibi proportions (~3.1 heads tall, upright posture, ~43px height) and identical facial features, hair, and clothing as the reference image.
Grid of animation sprites on solid flat uniform magenta #FF00FF background.
Row 1: South facing front view (3 frames).
Row 2: Side profile view facing left and right (3 frames).
Row 3: North facing back view (3 frames).`;

    const baseSuffix = `Strictly maintain identical anatomical scale, proportions, skin tone, hair, beard, and clothing palette from the reference image. Crisp pixel art, clean dark silhouette outlines, no blur, solid flat magenta #FF00FF background.`;

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

async function generateAction(varNum, actionName) {
    const spec = VARIATION_SPECS[varNum];
    const outFilename = `human_male_var${varNum}_pro_4d_${actionName.toLowerCase()}.png`;
    const outPath = path.join(RAW_DIR, outFilename);
    const refPath = path.join(RAW_DIR, spec.ref);

    if (fs.existsSync(outPath)) {
        console.log(`Action ${actionName} for Var ${varNum} already exists: ${outPath}`);
        return outPath;
    }

    const prompt = getActionPrompt(varNum, actionName);
    console.log(`\n=== Generating Var ${varNum} (${spec.name}) Action: ${actionName} ===`);
    console.log(`Output: ${outPath}`);
    console.log(`Reference Image: ${refPath}`);

    await generateWithNanoBananaPro({
        prompt,
        outputPath: outPath,
        referenceImagePaths: [refPath]
    });

    console.log(`Finished generating: ${outFilename}`);
    return outPath;
}

module.exports = {
    VARIATION_SPECS,
    getActionPrompt,
    generateAction
};

if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log('Usage: node tools/generate_male_variation_actions.js <varNum> <actionName|all>');
        process.exit(1);
    }
    const varNum = parseInt(args[0], 10);
    const actionArg = args[1];
    const actions = actionArg === 'all'
        ? ['Haul', 'Attack', 'Bow', 'Magic', 'Work', 'Downed']
        : [actionArg];

    (async () => {
        for (const act of actions) {
            await generateAction(varNum, act);
        }
    })().then(() => process.exit(0)).catch(err => {
        console.error(err);
        process.exit(1);
    });
}

