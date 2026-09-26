//=============================================================================
// test_srd_equipment_proof.js - Verification Suite for SRD 5.1 Equipment & AC
//=============================================================================
"use strict";

const fs = require('fs');
const path = require('path');

const root = typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : {});
root.UF = root.UF || {};

// Mock Space for range and distance conversions
root.UF.Space = {
    gridToFeet: cells => cells * 5,
    feetToGrid: feet => Math.ceil(feet / 5),
    sameZ: (a, b) => (a && a.z !== undefined ? a.z : 0) === (b && b.z !== undefined ? b.z : 0),
    chebyshev: (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y))
};

require(path.join(__dirname, '..', 'game', 'js', 'plugins', 'DEUS_Conditions.js'));
const { bindRules } = require('./rules/bind');
bindRules(root);

const Rules = root.UF.Rules;
const Space = root.UF.Space;

const mutant = process.argv.includes('--mutant');

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        passed++;
        console.log(`PASS: ${message}`);
    } else {
        failed++;
        console.error(`FAIL: ${message}`);
    }
}

console.log(`--- Running SRD 5.1 Equipment & AC Proof Suite (Mutant: ${mutant}) ---`);

// -----------------------------------------------------------------------------
// Proof 1: Weapon Properties & Ranges
// -----------------------------------------------------------------------------
console.log('[Proof 1] Weapon Properties, Ranges & Conversions');
const dagger = Rules.WEAPON_DEFS.dagger;
assert(dagger.dice === "1d4" && dagger.type === "piercing", 'Dagger deals 1d4 piercing');
assert(dagger.properties.includes("finesse") && dagger.properties.includes("thrown"), 'Dagger has finesse and thrown properties');
assert(Space.feetToGrid(dagger.range) === 4, 'Dagger normal range 20 ft converts to 4 grid cells');
assert(Space.feetToGrid(dagger.longRange) === 12, 'Dagger long range 60 ft converts to 12 grid cells');

const longsword = Rules.WEAPON_DEFS.longsword;
assert(longsword.dice === "1d8" && longsword.versatileDice === "1d10", 'Longsword is versatile: 1d8 (one-handed) / 1d10 (two-handed)');

const halberd = Rules.WEAPON_DEFS.halberd;
assert(halberd.properties.includes("reach") && halberd.range === 10, 'Halberd has reach property with 10 ft range (2 grid cells)');
assert(Space.feetToGrid(halberd.range) === 2, 'Halberd 10 ft range is 2 grid cells');

const shortbow = Rules.WEAPON_DEFS.shortbow;
assert(shortbow.ranged === true && shortbow.range === 80 && shortbow.longRange === 320, 'Shortbow has normal range 80 ft (16 cells) and long range 320 ft (64 cells)');

// -----------------------------------------------------------------------------
// Proof 2: Finesse & Ranged Ability Selection
// -----------------------------------------------------------------------------
console.log('[Proof 2] Finesse & Ranged Attack Ability Routing');
const rogue = {
    x: 10, y: 10, z: 0,
    data: { stats: { str: 10, dex: 18 } } // Str mod 0, Dex mod +4
};
const dummyTarget = { x: 11, y: 10, z: 0, data: { stats: { dex: 10 } } };

Rules._setTestRoll(10);
// Dagger is finesse: should pick Dex (+4) over Str (0)
let daggerAttack = Rules.attack(rogue, dummyTarget, "dagger", { profBonus: 2 });
assert(daggerAttack.abilityMod === (mutant ? 0 : 4), 'Finesse weapon automatically selects higher Dex modifier (+4)');
assert(daggerAttack.attackMod === (mutant ? 2 : 6), 'Attack modifier is +4(Dex) + 2(prof) = +6');

// Shortbow is ranged: strictly uses Dex (+4)
let bowAttack = Rules.attack(rogue, dummyTarget, "shortbow", { profBonus: 2 });
assert(bowAttack.abilityMod === 4, 'Ranged weapon strictly selects Dex modifier (+4)');

// -----------------------------------------------------------------------------
// Proof 3: Armor Class (AC) Foundations
// -----------------------------------------------------------------------------
console.log('[Proof 3] Armor Class Categories & Limits');
const defender = {
    data: {
        stats: { dex: 16 }, // Dex mod +3
        equipment: {}
    }
};

// 1. Unarmored: 10 + 3 = 13
assert(Rules.armorClass(defender).ac === 13, 'Unarmored AC is 10 + Dex (13)');

// 2. Light Armor (Studded leather 12 + full Dex) = 15
defender.data.equipment.torso = "studded_leather";
assert(Rules.armorClass(defender).ac === 15, 'Studded leather gives 12 + 3(Dex) = 15 AC');

// 3. Medium Armor (Half plate 15 + max 2 Dex) = 17, with stealth disadvantage
defender.data.equipment.torso = "half_plate";
let halfPlateAC = Rules.armorClass(defender);
assert(halfPlateAC.ac === 17, 'Half plate caps Dex bonus to +2 (15 + 2 = 17)');
assert(halfPlateAC.stealthDisadv === true, 'Half plate imposes stealth disadvantage');

// 4. Heavy Armor (Plate 18 flat)
defender.data.equipment.torso = "plate";
let plateAC = Rules.armorClass(defender);
assert(plateAC.ac === 18, 'Plate armor gives flat 18 AC');
assert(plateAC.effectiveDex === 0, 'Plate armor grants 0 Dex modifier');
assert(plateAC.stealthDisadv === true, 'Plate armor imposes stealth disadvantage');

// 5. Shield Bonus (+2)
defender.data.equipment.shield = "shield";
assert(Rules.armorClass(defender).ac === 20, 'Plate (18) + Shield (+2) gives 20 AC');

// -----------------------------------------------------------------------------
// Proof 4: Cover AC Bonuses
// -----------------------------------------------------------------------------
console.log('[Proof 4] Cover Bonuses to AC');
const coverDefender = {
    x: 15, y: 10, z: 0,
    data: { stats: { dex: 10 }, equipment: { torso: "leather" } } // AC 11
};
Rules._setTestRoll(11); // Roll 11 + mod 5 = 16

// No cover: AC 11
let noCover = Rules.attack(rogue, coverDefender, "shortbow", { targetAC: 11, coverBonus: 0 });
assert(noCover.hit === true, 'Attack hits with total 16 vs AC 11');

// Half Cover: +2 AC (13)
let halfCover = Rules.attack(rogue, coverDefender, "shortbow", { targetAC: 11, coverBonus: 2 });
assert(halfCover.effectiveAC === 13, 'Half cover adds +2 to effective AC (13)');
assert(halfCover.hit === true, 'Total 16 hits against half cover AC 13');

// Three-quarters Cover: +5 AC (16)
let threeQuartersCover = Rules.attack(rogue, coverDefender, "shortbow", { targetAC: 11, coverBonus: 5 });
assert(threeQuartersCover.effectiveAC === 16, 'Three-quarters cover adds +5 to effective AC (16)');
assert(threeQuartersCover.hit === true, 'Total 16 hits against three-quarters cover AC 16');

// Total Cover (Infinity AC / blocked)
let totalCover = Rules.attack(rogue, coverDefender, "shortbow", { targetAC: 11, coverBonus: Infinity });
assert(totalCover.hit === false, 'Total cover cannot be directly targeted or hit');

Rules._clearTestRoll();

console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
    console.error(`SRD Equipment & AC Proof Suite FAILED with ${failed} failure(s).`);
    process.exit(1);
} else {
    console.log('SRD Equipment & AC Proof Suite PASSED (100%).');
}
