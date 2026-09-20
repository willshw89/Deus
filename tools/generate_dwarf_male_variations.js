'use strict';

/**
 * tools/generate_dwarf_male_variations.js
 *
 * Generates the full suite of character sheets for Adult Male Dwarf variations (2 to 6)
 * across all 7 actions: Walk, Haul, Attack, Bow, Magic, Work, Downed
 * using Google Nano Banana Pro (gemini-3-pro-image) per AGENTS.md Rule 11.
 *
 * Each variation's Walk sheet is conditioned on the master Dwarf Male reference image.
 * Each variation's 6 remaining actions are conditioned on its own Walk sheet.
 */

const fs = require('fs');
const path = require('path');
const { generateWithNanoBananaPro } = require('./generate_nano_banana_pro');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'raw');
const MASTER_REF = path.join(RAW_DIR, 'references', 'dwarf_male_walk_12_reference.png');

const DWARF_MALE_VARIATION_SPECS = {
    2: {
        name: 'Variation 2 (Deep Runesmith / Stonecrafter)',
        features: 'Adult Male Dwarf Settler with dark granite-grey braided beard with gold ring clasps, soot-dusted skin, serious determined expression with narrow eyes, thick leather apron over olive-green reinforced tunic, heavy boots.',
        walkFile: 'dwarf_male_var2_pro_4d_walk.png',
        attackDesc: 'MELEE COMBAT WITH ORNATE RUNIC WARHAMMER. Frame 1: High two-handed warhammer ready guard; Frame 2: Powerful downward crushing strike with curved glowing steel impact arc; Frame 3: Solid recovery stance.',
        bowDesc: 'ARCHERY WITH REPEATING DWARVEN CRANK-CROSSBOW. Frame 1: Heavy crank-crossbow aim stance; Frame 2: Cocking crank tension with steel prod drawn tight; Frame 3: Trigger release pluck recoil. ZERO flying bolts (VISION V111).',
        magicDesc: 'RUNE STONE EARTH INCANTATION SPELL INITIATION. Frame 1: Holding glowing rune stone high, beginning chant; Frame 2: Channeled forward with glowing golden/cyan rune aura around palms; Frame 3: Rune seal release posture with soft glowing palm aura. ZERO flying beams or projectiles (VISION V111).',
        workDesc: 'STONECRAFTER & RUNESMITH CRAFT WORK. Frame 1: Standing inspection holding a fine stone chisel; Frame 2: Kneeling craftsman down low (~26px height) inspecting runic slab; Frame 3: Ground chisel strike with hammer on stone. Solid flat magenta background with no furniture or large stone blocks.'
    },
    3: {
        name: 'Variation 3 (Ironbreaker / Citadel Heavy Guard)',
        features: 'Adult Male Dwarf Settler with iron-grey steel beard braided into three tight plies, brass banded armguards, banded iron cuirass over chainmail, dark trousers, heavy steel-toed boots.',
        walkFile: 'dwarf_male_var3_pro_4d_walk.png',
        attackDesc: 'MELEE COMBAT WITH HEAVY DWARVEN BROAD-AXE & SQUARE IRON TOWER BUCKLER. Frame 1: High axe guard with shield forward; Frame 2: Sweeping horizontal cleave strike with curved glowing steel slash arc; Frame 3: Braced battle recovery stance behind shield.',
        bowDesc: 'ARCHERY WITH HEAVY SIEGE ARBALEST. Frame 1: Massive iron-reinforced arbalest aim stance; Frame 2: Heavy stirrup string draw tension; Frame 3: Heavy string release pluck recoil. ZERO flying bolts (VISION V111).',
        magicDesc: 'CITADEL BULWARK RUNE CHANT INITIATION. Frame 1: Raising heavy gauntlet, beginning ward chant; Frame 2: Slamming shield forward with glowing bronze barrier rune aura around hands; Frame 3: Ward seal posture with soft glowing aura. ZERO flying projectiles (VISION V111).',
        workDesc: 'CITADEL ARMORSMITH WORK. Frame 1: Standing inspection holding smithing tongs; Frame 2: Kneeling craftsman down low (~26px height) inspecting iron plate; Frame 3: Ground strike driving heavy hammer down on iron. Solid flat magenta background with no furniture or large blocks.'
    },
    4: {
        name: 'Variation 4 (Tunnel Scout / Geologist)',
        features: 'Adult Male Dwarf Settler with golden-brown braided beard, brass prospecting goggles pushed up onto forehead, fur-lined brown leather mantle, exploration gear harness, dark sturdy trousers, trail boots.',
        walkFile: 'dwarf_male_var4_pro_4d_walk.png',
        attackDesc: 'MELEE COMBAT WITH DUAL MINING MATTOCKS / TRENCH DAGGERS. Frame 1: Low twin-mattock ready guard; Frame 2: Rapid cross-slash strike with short curved glowing steel blade arcs; Frame 3: Deft agile recovery stance.',
        bowDesc: 'ARCHERY WITH COMPACT TUNNEL SCOUT CROSSBOW. Frame 1: Compact scout arbalest aim stance; Frame 2: Drawing string tension to cheek; Frame 3: String release pluck recoil. ZERO flying bolts (VISION V111).',
        magicDesc: 'GEOMANCY ORE DETECTION SPELL INITIATION. Frame 1: Holding glowing crystal prism high; Frame 2: Hands channeled forward with soft emerald earth glow around palms; Frame 3: Divination release posture with soft glowing palm aura. ZERO flying beams or projectiles (VISION V111).',
        workDesc: 'GEOLOGIST PROSPECTING WORK. Frame 1: Standing inspection holding rock hammer; Frame 2: Kneeling scout down low (~26px height) checking rock stratum; Frame 3: Ground strike chipping mineral sample. Solid flat magenta background with no furniture or large blocks.'
    },
    5: {
        name: 'Variation 5 (Master Brewmaster / Clan Cook)',
        features: 'Adult Male Dwarf Settler with bright blonde bushy beard, sturdy round physique, brewer leather jerkin over rolled-sleeve woolen shirt, wooden cask harness strap, thick boots.',
        walkFile: 'dwarf_male_var5_pro_4d_walk.png',
        attackDesc: 'MELEE COMBAT WITH HEAVY SPIKED BREWER MASH PADDLE / CLUB. Frame 1: Two-handed high mash paddle ready guard; Frame 2: Powerful downward bludgeoning strike with impact arc; Frame 3: Braced solid recovery stance.',
        bowDesc: 'RANGED COMBAT WITH HAND ARBALEST / HEAVY SLING. Frame 1: Ready aim stance; Frame 2: Drawing sling/cord tight with full tension; Frame 3: Release pluck recoil. ZERO flying projectiles (VISION V111).',
        magicDesc: 'CLAN VITALITY BREW INCANTATION INITIATION. Frame 1: Raising brass drinking horn high; Frame 2: Hands channeled forward with warm amber vitality mana aura around palms; Frame 3: Incantation seal posture with soft glowing aura. ZERO flying projectiles (VISION V111).',
        workDesc: 'BREWERY & COOPERING WORK. Frame 1: Standing inspection holding bung mallet; Frame 2: Kneeling cooper down low (~26px height) inspecting wooden cask hoop; Frame 3: Ground mallet strike driving cask hoop. Solid flat magenta background with no furniture or large casks.'
    },
    6: {
        name: 'Variation 6 (Ancient Thane / Clan Elder)',
        features: 'Elder Adult Male Dwarf Settler with snowy white flowing beard reaching past belt adorned with ancient gold beard rings, regal bronze-trimmed deep purple woolen mantle, ornate torque collar, dark trousers, boots.',
        walkFile: 'dwarf_male_var6_pro_4d_walk.png',
        attackDesc: 'MELEE COMBAT WITH MASTERWORK GILDED DWARVEN GREAT植XE. Frame 1: High two-handed greataxe ready guard; Frame 2: Magnificent sweeping cleave with curved glowing golden-steel slash arc; Frame 3: Regal battle recovery stance.',
        bowDesc: 'ARCHERY WITH DRAGON-CRESTED MASTERWORK ARBALEST. Frame 1: Carved dragon-bow aim stance; Frame 2: Full tension draw pulling cord tight; Frame 3: String release pluck recoil. ZERO flying bolts (VISION V111).',
        magicDesc: 'ANCESTRAL STORM HAMMER INCANTATION INITIATION. Frame 1: Raising ancient rune hammer high; Frame 2: Channeling storm earth mana forward with crackling blue/gold lightning aura around hands; Frame 3: Incantation release posture with soft glowing palm aura. ZERO flying beams or projectiles (VISION V111).',
        workDesc: 'CLAN RECORDING & RELIC WORK. Frame 1: Standing inspection holding chisel stylus; Frame 2: Kneeling thane down low (~26px height) inspecting ancestral tablet; Frame 3: Ground strike engraving rune on stone. Solid flat magenta background with no furniture or large slabs.'
    }
};

function getPrompt(varNum, actionName) {
    const spec = DWARF_MALE_VARIATION_SPECS[varNum];
    if (!spec) throw new Error(`Unknown variation: ${varNum}`);

    if (actionName === 'Walk') {
        return `16-bit SNES pixel art character sprite sheet of an Adult Male Dwarf Settler variation matching the serious chibi style (~2.6 heads tall, stocky broad-shouldered upright battle-ready posture, focused stern gaze, ~36px height) and exact scale of the reference character.
Character features: ${spec.features}
4-direction walk cycle on a 6x3 grid with solid magenta background (#FF00FF).
Row 1: South front walk cycle (step, stand, step).
Row 2: Side profile walk cycle with clear alternating leg strides (left leg forward, standing/passing, right leg forward).
Row 3: North back walk cycle (step, stand, step).
Clean solid colors, authentic pixel art, sharp dark outlines, grounded baseline at bottom of cells, matching reference proportions identically.`;
    }

    const basePrefix = `16-bit SNES pixel art character sprite sheet of the EXACT SAME Adult Male Dwarf Settler from the reference image in serious chibi style, upright 3/4 top-down perspective, Final Fantasy V / Seiken Densetsu style. Same serious chibi proportions (~2.6 heads tall, stocky posture, ~36px height) and identical facial features, beard, and clothing as the reference image.
Grid of animation sprites on solid flat uniform magenta #FF00FF background.
Row 1: South facing front view (3 frames).
Row 2: Side profile view facing left and right (3 frames).
Row 3: North facing back view (3 frames).`;

    const baseSuffix = `Strictly maintain identical anatomical scale, proportions, skin tone, beard, and clothing palette from the reference image. Crisp pixel art, clean dark silhouette outlines, no blur, solid flat magenta #FF00FF background.`;

    if (actionName === 'Haul') {
        return `${basePrefix}
ACTION: DEDICATED HEAVY LOAD HAULING / CARRYING CYCLE (AR-600 col 7 / VISION V113).
Row 1: 3 sprites facing South (front view), carrying a heavy burlap sack full of ore in both arms tightly against the chest, walk cycle (step, stand, step).
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
ACTION: ${spec.magicDesc}
Row 1: 3 sprites facing South (front view), magic initiation (frame 1: ready posture; frame 2: channeling chant; frame 3: release posture with soft glowing aura).
Row 2: Side profile incantation posture with soft glowing palm aura.
Row 3: North facing back view incantation posture.
${baseSuffix}`;
    }

    if (actionName === 'Work') {
        return `${basePrefix}
ACTION: ${spec.workDesc}
Row 1: 3 sprites facing South (front view), work animation (frame 1: standing check; frame 2: kneeling craftsman down low (~26px height); frame 3: ground tool strike).
Row 2: Side profile work animation (standing, kneeling craftsman, ground strike).
Row 3: North facing back view work animation.
${baseSuffix}`;
    }

    if (actionName === 'Downed') {
        return `${basePrefix}
ACTION: DEFEAT / DOWNED / CORPSE SEQUENCE.
Row 1: 3 sprites facing South (front view), defeat sequence (frame 1: hurt flinch clutching side; frame 2: collapsing to knees (~24px height); frame 3: completely flat horizontal prone resting corpse lying on the ground (~14px height)).
Row 2: Side profile hurt recoil, falling forward, completely horizontal prone corpse lying on ground.
Row 3: North facing back view stagger backward, collapse, flat horizontal prone resting corpse lying on ground.
${baseSuffix}`;
    }

    throw new Error(`Unknown action: ${actionName}`);
}

async function generateVariation(varNum) {
    const spec = DWARF_MALE_VARIATION_SPECS[varNum];
    console.log(`\n=============================================================`);
    console.log(`   Generating Dwarf Male ${spec.name}`);
    console.log(`=============================================================`);

    const walkRawPath = path.join(RAW_DIR, spec.walkFile);

    // Step 1: Walk sheet (conditioned on master reference)
    if (!fs.existsSync(walkRawPath)) {
        console.log(`[Var ${varNum}] Generating Walk sheet conditioned on master reference...`);
        await generateWithNanoBananaPro({
            prompt: getPrompt(varNum, 'Walk'),
            outputPath: walkRawPath,
            referenceImagePaths: [MASTER_REF]
        });
        console.log(`[Var ${varNum}] Walk sheet generated: ${walkRawPath}`);
    } else {
        console.log(`[Var ${varNum}] Walk sheet already exists: ${walkRawPath}`);
    }

    // Step 2: Remaining 6 actions (conditioned on this variation's Walk sheet)
    const actions = ['Haul', 'Attack', 'Bow', 'Magic', 'Work', 'Downed'];
    for (const act of actions) {
        const actFile = `dwarf_male_var${varNum}_pro_4d_${act.toLowerCase()}.png`;
        const actPath = path.join(RAW_DIR, actFile);

        if (!fs.existsSync(actPath)) {
            console.log(`[Var ${varNum}] Generating ${act} conditioned on Walk sheet...`);
            await generateWithNanoBananaPro({
                prompt: getPrompt(varNum, act),
                outputPath: actPath,
                referenceImagePaths: [walkRawPath]
            });
            console.log(`[Var ${varNum}] ${act} generated: ${actPath}`);
        } else {
            console.log(`[Var ${varNum}] ${act} already exists: ${actPath}`);
        }
    }

    console.log(`[Var ${varNum}] Completed all 7 actions!`);
}

async function main() {
    const targetVar = process.argv[2] ? parseInt(process.argv[2], 10) : null;
    const variationsToRun = targetVar ? [targetVar] : [2, 3, 4, 5, 6];

    for (const v of variationsToRun) {
        await generateVariation(v);
    }
    console.log('\nAll targeted Dwarf Male variation generations complete!');
}

main().catch(err => {
    console.error('Generation failed:', err);
    process.exit(1);
});

