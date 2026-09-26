//=============================================================================
// test_srd_rules_proof.js - Verification Suite for SRD 5.1 Rules Resolver
//=============================================================================
"use strict";

const fs = require('fs');
const path = require('path');

// Setup Node mock environment
const root = typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : {});
root.UF = root.UF || {};

// Mock Space
root.UF.Space = {
    sameZ: (a, b) => {
        const za = (a && a.z !== undefined) ? a.z : (a && a.area && a.area.z !== undefined ? a.area.z : 0);
        const zb = (b && b.z !== undefined) ? b.z : (b && b.area && b.area.z !== undefined ? b.area.z : 0);
        return za === zb;
    },
    chebyshev: (a, b) => Math.max(Math.abs((a.x || 0) - (b.x || 0)), Math.abs((a.y || 0) - (b.y || 0))),
    gridToFeet: cells => cells * 5,
    feetToGrid: feet => Math.ceil(feet / 5)
};

// DEUS_Conditions is the conditions authority. UF.Rules is the headless SRD module.
require(path.join(__dirname, '..', 'game', 'js', 'plugins', 'DEUS_Conditions.js'));
const { bindRules } = require('./rules/bind');
bindRules(root);

const Rules = root.UF.Rules;
const Conditions = root.UF.Conditions;

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

console.log(`--- Running SRD 5.1 Rules Resolver Proof Suite (Mutant: ${mutant}) ---`);

// -----------------------------------------------------------------------------
// Proof 1: Ability Scores, Modifiers & Standard DC Ladder
// -----------------------------------------------------------------------------
console.log('[Proof 1] Ability Scores, Modifiers & DC Ladder');
assert(Rules.modifier(1) === -5, 'Score 1 gives modifier -5');
assert(Rules.modifier(10) === 0, 'Score 10 gives modifier 0');
assert(Rules.modifier(11) === 0, 'Score 11 gives modifier 0');
assert(Rules.modifier(12) === 1, 'Score 12 gives modifier +1');
assert(Rules.modifier(14) === 2, 'Score 14 gives modifier +2');
assert(Rules.modifier(18) === 4, 'Score 18 gives modifier +4');
assert(Rules.modifier(20) === 5, 'Score 20 gives modifier +5');
assert(Rules.modifier(30) === 10, 'Score 30 gives modifier +10');

assert(Rules.dc("very_easy") === 5, 'Very Easy DC is 5');
assert(Rules.dc("easy") === 10, 'Easy DC is 10');
assert(Rules.dc("medium") === 15, 'Medium DC is 15');
assert(Rules.dc("hard") === 20, 'Hard DC is 20');
assert(Rules.dc("very_hard") === 25, 'Very Hard DC is 25');
assert(Rules.dc("nearly_impossible") === 30, 'Nearly Impossible DC is 30');

// -----------------------------------------------------------------------------
// Proof 2: Ability Checks, Advantage / Disadvantage & Passive Checks
// -----------------------------------------------------------------------------
console.log('[Proof 2] Ability Checks, Advantage & Passive Checks');
const hero = {
    id: "hero_wynn",
    data: {
        stats: { str: 16, dex: 14, con: 12, int: 10, wis: 15, cha: 8 },
        saveProficiencies: ["str", "con"]
    }
};

Rules._setTestRoll(12);
let checkResult = Rules.check(hero, "str", "medium", { profBonus: 2 });
assert(checkResult.roll === 12, 'Check rolled test override 12');
assert(checkResult.abilityMod === 3, 'STR 16 modifier is +3');
assert(checkResult.profBonus === 2, 'Proficiency bonus is +2');
assert(checkResult.total === 17, 'Total check is 12 + 3 + 2 = 17');
assert(checkResult.ok === true, 'Total 17 succeeds against DC 15 (Medium)');
assert(checkResult.margin === 2, 'Margin of success is +2');

// Passive Check
let passivePerception = Rules.passiveCheck(hero, "wis", null, { profBonus: 2 });
assert(passivePerception === 14, 'Passive Perception is 10 + 2(wis) + 2(prof) = 14');

let passiveAdv = Rules.passiveCheck(hero, "wis", null, { profBonus: 2, advantage: true });
assert(passiveAdv === 19, 'Passive Perception with Advantage adds +5 (got 19)');

let passiveDisadv = Rules.passiveCheck(hero, "wis", null, { profBonus: 2, disadvantage: true });
assert(passiveDisadv === 9, 'Passive Perception with Disadvantage subtracts 5 (got 9)');

// Mutual cancellation of adv/disadv
Rules._clearTestRoll();
let advCancel = Rules.check(hero, "str", 10, { advantage: true, disadvantage: true, rng: () => 0.2 });
assert(advCancel.advantage === false && advCancel.disadvantage === false, 'Advantage and Disadvantage cancel to normal single roll');

// -----------------------------------------------------------------------------
// Proof 3: Saving Throws & Condition Auto-Fails
// -----------------------------------------------------------------------------
console.log('[Proof 3] Saving Throws & Condition Auto-Fails');
Rules._setTestRoll(10);
let strSave = Rules.save(hero, "str", 15);
assert(strSave.ok === true, 'STR save with prof succeeds: 10 + 3 + 2 = 15 vs DC 15');

// Apply Paralyzed condition
Conditions.add(hero, "paralyzed");
let dexSaveParalyzed = Rules.save(hero, "dex", 10);
assert(dexSaveParalyzed.ok === false, 'DEX save automatically fails while Paralyzed');
assert(dexSaveParalyzed.autoFailed === true, 'autoFailed flag is set on condition failure');
Conditions.remove(hero, "paralyzed");

// -----------------------------------------------------------------------------
// Proof 4: Contested Checks (Grapple / Shove)
// -----------------------------------------------------------------------------
console.log('[Proof 4] Contested Checks');
const orc = {
    id: "orc_grum",
    data: { stats: { str: 18, dex: 10 } }
};
Rules._setTestRoll(10); // hero total = 10 + 3 = 13, orc total = 10 + 4 = 14
let contest = Rules.contest(hero, "str", orc, "str");
assert(contest.winner === "B", 'Orc wins grapple contest with higher total (14 vs 13)');

// -----------------------------------------------------------------------------
// Proof 5: Armor Class (AC) Foundations
// -----------------------------------------------------------------------------
console.log('[Proof 5] Armor Class (AC) Formulas');
const colonist = {
    id: "unit_wynn",
    data: {
        stats: { dex: 16 }, // dex mod +3
        equipment: {}
    }
};

// 1. Unarmored: 10 + Dex (13)
let ac = Rules.armorClass(colonist);
assert(ac.ac === 13 && ac.category === "unarmored", 'Unarmored AC is 10 + Dex (13)');

// 2. Light Armor (Leather 11 + full Dex) = 14
colonist.data.equipment.torso = "leather";
ac = Rules.armorClass(colonist);
assert(ac.ac === 14 && ac.category === "light", 'Leather armor AC is 11 + 3(Dex) = 14');

// 3. Medium Armor (Chain shirt 13 + max 2 Dex) = 15
colonist.data.equipment.torso = "chain_shirt";
ac = Rules.armorClass(colonist);
assert(ac.ac === 15 && ac.effectiveDex === 2, 'Chain shirt caps Dex bonus to +2 (AC 15)');

// 4. Heavy Armor (Plate 18, no Dex) = 18
colonist.data.equipment.torso = "plate";
ac = Rules.armorClass(colonist);
assert(ac.ac === 18 && ac.effectiveDex === 0, 'Plate armor grants flat 18 AC with no Dex bonus');

// 5. Shield (+2) = 20
colonist.data.equipment.shield = "shield";
ac = Rules.armorClass(colonist);
assert(ac.ac === 20 && ac.shieldAC === 2, 'Plate + Shield gives 20 AC');

// -----------------------------------------------------------------------------
// Proof 6: Combat Attack Resolution & Same-Z Invariant
// -----------------------------------------------------------------------------
console.log('[Proof 6] Combat Attack Resolution & Same-Z Invariant');
const attacker = {
    id: "cenric",
    x: 10, y: 10, z: 0,
    data: { stats: { str: 16, dex: 14 } }
};
const targetZ0 = {
    id: "wolf_1",
    x: 11, y: 10, z: 0,
    data: { stats: { dex: 12 }, combat: { hp: 11 } }
};
const targetZ1 = {
    id: "archer_tower",
    x: 11, y: 10, z: 1, // Different Z!
    data: { stats: { dex: 12 } }
};

// Attack across Z levels
let crossZAttack = Rules.attack(attacker, targetZ1, "longsword");
assert(crossZAttack.hit === false && crossZAttack.sameZViolation === true, 'Attack across different Z levels is strictly rejected by same-Z invariant');

// Normal attack on same Z datum
Rules._setTestRoll(15);
let attackZ0 = Rules.attack(attacker, targetZ0, "longsword", { targetAC: 12 });
assert(attackZ0.hit === true, 'Attack hits when roll + attackMod >= target AC');
assert(attackZ0.attackMod === 5, 'Attack mod is +3(Str) + 2(prof) = +5');
assert(attackZ0.attackTotal === 20, 'Attack total is 15 + 5 = 20 vs AC 12');

// Critical Hit (Natural 20) & Doubled Dice Damage
Rules._setTestRoll(20);
let critAttack = Rules.attack(attacker, targetZ0, "longsword", { targetAC: 25 });
assert(critAttack.hit === true, 'Natural 20 hits regardless of high AC');
assert(critAttack.critical === true, 'Natural 20 is a critical hit');

let critDamage = Rules.damage(attacker, targetZ0, critAttack, { rng: () => 0 });
assert(critDamage.critical === true, 'Damage resolution recognises critical hit');
assert(critDamage.diceRolled === "2d8", 'Critical hit rolls damage dice twice (2d8 for longsword)');

// -----------------------------------------------------------------------------
// Proof 7: Heroic Death Saving Throws at 0 HP
// -----------------------------------------------------------------------------
console.log('[Proof 7] Heroic Death Saves at 0 HP');
const dyingUnit = {
    id: "downed_colonist",
    data: { combat: { hp: 0 } }
};

Rules._setTestRoll(12); // Success (>= 10)
let ds1 = Rules.deathSave(dyingUnit);
assert(ds1.result === "success" && ds1.successes === 1, 'Roll 12 gives 1 death save success');

Rules._setTestRoll(5); // Failure (< 10)
let ds2 = Rules.deathSave(dyingUnit);
assert(ds2.result === "failure" && ds2.failures === 1, 'Roll 5 gives 1 death save failure');

Rules._setTestRoll(1); // Critical failure (2 failures)
let ds3 = Rules.deathSave(dyingUnit);
assert(ds3.result === "critical_failure" && ds3.failures === 3 && ds3.dead === true, 'Nat 1 adds 2 failures, reaching 3 failures and death');

// Revive test (Nat 20)
const revivedUnit = { id: "lucky_soldier", data: { combat: { hp: 0 } } };
Rules._setTestRoll(20);
let dsRevive = Rules.deathSave(revivedUnit);
assert(dsRevive.result === "revive" && revivedUnit.data.combat.hp === 1, 'Nat 20 on death save revives unit immediately with 1 HP');

// -----------------------------------------------------------------------------
// Proof 8: Jumping & Falling Formulas
// -----------------------------------------------------------------------------
console.log('[Proof 8] Jumping & Falling Rules');
const athlete = { data: { stats: { str: 16 } } }; // Str 16, mod +3
assert(Rules.jumping(athlete, "long", true) === 16, 'Running long jump equals STR score (16 ft)');
assert(Rules.jumping(athlete, "long", false) === 8, 'Standing long jump is half STR score (8 ft)');
assert(Rules.jumping(athlete, "high", true) === 6, 'Running high jump is 3 + STR mod (6 ft)');

let fall30ft = Rules.fallingDamage(30);
assert(fall30ft.dice === "3d6" && fall30ft.landsProne === true, 'Falling 30 ft deals 3d6 bludgeoning damage and lands prone');

Rules._clearTestRoll();

console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
    console.error(`SRD Rules Resolver Proof Suite FAILED with ${failed} failure(s).`);
    process.exit(1);
} else {
    console.log('SRD Rules Resolver Proof Suite PASSED (100%).');
}
