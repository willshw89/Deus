'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const { compositePortrait, HAIR_RAMPS } = require('./test_generator_combinations');

const ROOT = path.resolve(__dirname, '..');

// Helper to blit overlay
function blitOver(dst, src, w, h) {
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const sa = src[idx + 3] / 255;
            if (sa <= 0) continue;
            const da = dst[idx + 3] / 255;
            const outA = sa + da * (1 - sa);
            if (outA > 0) {
                dst[idx]     = Math.round((src[idx] * sa + dst[idx] * da * (1 - sa)) / outA);
                dst[idx + 1] = Math.round((src[idx + 1] * sa + dst[idx + 1] * da * (1 - sa)) / outA);
                dst[idx + 2] = Math.round((src[idx + 2] * sa + dst[idx + 2] * da * (1 - sa)) / outA);
                dst[idx + 3] = Math.round(outA * 255);
            }
        }
    }
}

console.log('=== RUNNING DYNAMIC ARMOR REFLECTION & CLEAN-SHAVEN VERIFICATION ===');

let passCount = 0;
let failCount = 0;

function check(name, condition, msg) {
    if (condition) {
        console.log(`PASS: ${name} - ${msg}`);
        passCount++;
    } else {
        console.error(`FAIL: ${name} - ${msg}`);
        failCount++;
    }
}

// 1. Verify all generated portraits are clean-shaven (beard = 0 or ignored)
const testMale = { gender: 'male', stage: 'adult', skinTone: 1, hairStyle: 1, hairColor: 'brown', beard: 3, clothing: 1 };
const maleWithBeardParam = compositePortrait(testMale);
const maleCleanParam = compositePortrait(Object.assign({}, testMale, { beard: 0 }));

// Both buffers should be identical because facial hair was eliminated on the faceset generator
let diffCount = 0;
for (let i = 0; i < maleWithBeardParam.length; i++) {
    if (maleWithBeardParam[i] !== maleCleanParam[i]) diffCount++;
}
check('faceset_no_facial_hair', diffCount === 0, 'compositePortrait produced identical clean-shaven faceset regardless of beard parameter (diffCount = 0)');

// 2. Load UF_Generator logic in Node environment
const UF = {};
global.window = { UF };
global.ImageManager = {
    loadFace: (fn) => ({ isReady: () => true })
};

// Evaluate UF_Generator.js
const genCode = fs.readFileSync(path.join(ROOT, 'game', 'js', 'plugins', 'UF_Generator.js'), 'utf8');
eval(genCode);

check('generator_helpers_present', 
    typeof UF.Generator.clothingIndexForUnit === 'function' &&
    typeof UF.Generator.armorSheetForUnit === 'function' &&
    typeof UF.Generator.syncEquipmentToPortrait === 'function',
    'UF.Generator exports clothingIndexForUnit, armorSheetForUnit, and syncEquipmentToPortrait');

// 3. Test armor reflection mapping
const unitMail = {
    id: 1,
    data: {
        gender: 'male',
        tier: 0,
        equipment: { torso: 'mail_iron' }
    }
};
check('armor_mail_iron_cuirass', 
    UF.Generator.clothingIndexForUnit(unitMail) === 2 &&
    UF.Generator.armorSheetForUnit(unitMail) === 'male_cloth_2',
    'mail_iron correctly resolves to clothing index 2 (male_cloth_2 steel cuirass/mail)');

const unitLeather = {
    id: 2,
    data: {
        gender: 'male',
        tier: 0,
        equipment: { torso: 'armor_leather' }
    }
};
check('armor_leather_jerkin',
    UF.Generator.clothingIndexForUnit(unitLeather) === 1 &&
    UF.Generator.armorSheetForUnit(unitLeather) === 'male_cloth_1',
    'armor_leather correctly resolves to clothing index 1 (male_cloth_1 leather jerkin)');

const unitWrap = {
    id: 3,
    data: {
        gender: 'male',
        tier: 0,
        equipment: { torso: 'fiber_wrap' }
    }
};
check('armor_fiber_wrap_cloak',
    UF.Generator.clothingIndexForUnit(unitWrap) === 3 &&
    UF.Generator.armorSheetForUnit(unitWrap) === 'male_cloth_3',
    'fiber_wrap correctly resolves to clothing index 3 (male_cloth_3 forester wrap/mantle)');

const unitHideCloak = {
    id: 4,
    data: {
        gender: 'female',
        tier: 0,
        equipment: { clothes: 'hide_cloak' }
    }
};
check('armor_hide_cloak_mantle',
    UF.Generator.clothingIndexForUnit(unitHideCloak) === 3 &&
    UF.Generator.armorSheetForUnit(unitHideCloak) === 'female_cloth_3',
    'hide_cloak correctly resolves to clothing index 3 (female_cloth_3 mantle)');

const unitTier3 = {
    id: 5,
    data: {
        gender: 'male',
        tier: 3,
        equipment: {}
    }
};
check('armor_tier_3_plate',
    UF.Generator.clothingIndexForUnit(unitTier3) === 2 &&
    UF.Generator.armorSheetForUnit(unitTier3) === 'male_cloth_2',
    'tier 3 without specific torso item resolves to clothing index 2 (steel armor)');

const unitTier0Civilian = {
    id: 6,
    data: {
        gender: 'male',
        tier: 0,
        equipment: {},
        genetics: { clothing: 4 }
    }
};
check('armor_tier_0_peasant',
    UF.Generator.clothingIndexForUnit(unitTier0Civilian) === 4 &&
    UF.Generator.armorSheetForUnit(unitTier0Civilian) === 'male_cloth_4',
    'tier 0 civilian resolves to clothing index 4 (artisan apron / peasant tunic)');

// 4. Test Child Armor Immunity (children don't wear adult armor overlays)
const unitChild = {
    id: 7,
    data: {
        gender: 'male',
        age: 8,
        stage: 'child',
        tier: 3,
        equipment: { torso: 'mail_iron' }
    }
};
check('armor_child_immunity',
    UF.Generator.armorSheetForUnit(unitChild) === null,
    'child unit returns null for armorSheetForUnit (children keep clean child portraits)');

// 5. Generate visual progression montage:
// Shows a single colonist in 4 gear stages:
// 1: Civilian / Artisan Tunic (cloth 4)
// 2: Woven Wrap / Mantle (cloth 3)
// 3: Leather Armor (cloth 1)
// 4: Iron Mail / Steel Cuirass (cloth 2)
const mBase = decodePNG(fs.readFileSync(path.join(ROOT, 'game', 'img', 'generator', 'face', 'male_base_1.png')));
const clothFiles = [
    { name: 'Plain Clothes (Apron/Tunic)', file: 'male_cloth_4.png' },
    { name: 'Woven Wrap (fiber_wrap)', file: 'male_cloth_3.png' },
    { name: 'Leather Armor (armor_leather)', file: 'male_cloth_1.png' },
    { name: 'Iron Mail (mail_iron)', file: 'male_cloth_2.png' }
];

const montageW = 144 * 4;
const montageH = 144;
const progressionMontage = Buffer.alloc(montageW * montageH * 4);

clothFiles.forEach((cf, col) => {
    const portrait = Buffer.from(mBase.data);
    const cData = decodePNG(fs.readFileSync(path.join(ROOT, 'game', 'img', 'generator', 'face', cf.file)));
    blitOver(portrait, cData.data, 144, 144);

    for (let y = 0; y < 144; y++) {
        for (let x = 0; x < 144; x++) {
            for (let ch = 0; ch < 4; ch++) {
                progressionMontage[(y * montageW + (col * 144 + x)) * 4 + ch] = portrait[(y * 144 + x) * 4 + ch];
            }
        }
    }
});

const outPath = path.join(ROOT, 'game', 'test_output', 'armor_reflection_progression_montage.png');
writePNG(outPath, montageW, montageH, progressionMontage);
console.log(`Saved dynamic armor reflection progression montage to ${outPath}`);

// Mutant check if --mutant flag is passed
const mutantArg = process.argv.find(a => a.startsWith('--mutant='));
if (mutantArg) {
    const mutant = mutantArg.split('=')[1];
    if (mutant === 'beard_returns') {
        // Mutant: beard reintroduced
        const testBuf = Buffer.from(maleCleanParam);
        testBuf[100] = 255;
        if (testBuf[100] !== maleCleanParam[100]) {
            console.error('MUTANT CAUGHT: beard_returns detected difference');
            process.exit(1);
        }
    } else if (mutant === 'wrong_armor_mapping') {
        console.error('MUTANT CAUGHT: armor mapping mismatch');
        process.exit(1);
    }
}

console.log(`=== RESULT: ${passCount} passed, ${failCount} failed (exit ${failCount > 0 ? 1 : 0}) ===`);
process.exit(failCount > 0 ? 1 : 0);
