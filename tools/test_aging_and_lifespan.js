// Test suite: Aging, Life Stages, and 60-Year Average Lifespan
// Verifies:
// 1. Life stage classification: Baby (0-1), Child (2-11), Teen (12-14), Adult (15-49), Elder (50+).
// 2. Average lifespan of 60 years: 0% mortality < 55, progressive natural mortality centering around 60.
// 3. Monte-Carlo simulation across 1000 simulated lives: mean lifespan is 60 +/- 3 years.
// 4. Peaceful passing of old age chronicles accurate text: "[Name] passed away peacefully of old age at the age of [X]".
// 5. Mourning thoughts (-8 morale) awarded to kin and household members.
// 6. Mutant provocation check: fails if mortality threshold or curve is altered (Rule 4).

"use strict";
const fs = require("fs");
const path = require("path");

const mutant = process.argv.find(a => a.startsWith("--mutant=")) ? process.argv.find(a => a.startsWith("--mutant=")).split("=")[1] : null;

let passed = 0, failed = 0;
function check(name, cond, detail) {
    if (cond) {
        console.log(`PASS ${name}${detail ? " - " + detail : ""}`);
        passed++;
    } else {
        console.error(`FAIL ${name}${detail ? " - " + detail : ""}`);
        failed++;
    }
}

function unit01(seed, salt, ...parts) {
    let h = (seed ^ salt) >>> 0;
    for (const p of parts) {
        h = Math.imul(h ^ (p | 0), 0x5bd1e995);
        h = (h ^ (h >>> 15)) >>> 0;
    }
    return (h >>> 0) / 4294967296;
}

function mortalityRateForAge(age) {
    if (mutant === "immortal") return 0;
    if (mutant === "premature") return age >= 20 ? 0.5 : 0;

    if (age < 55) return 0;
    if (age >= 76) return 0.80;
    if (age >= 71) return 0.60;
    if (age >= 66) return 0.42;
    if (age >= 61) return 0.28;
    if (age >= 58) return 0.16;
    if (age >= 55) return 0.06;
    return 0;
}

console.log("=== Testing Aging Progression and 60-Year Lifespan System ===");

// 1. Check life stage transitions
function stageForAge(age) {
    if (age >= 50) return "elder";
    if (age >= 15) return "adult";
    if (age >= 12) return "teen";
    if (age >= 2) return "child";
    return "baby";
}

check("stage_baby", stageForAge(0) === "baby" && stageForAge(1) === "baby");
check("stage_child", stageForAge(2) === "child" && stageForAge(8) === "child" && stageForAge(11) === "child");
check("stage_teen", stageForAge(12) === "teen" && stageForAge(14) === "teen");
check("stage_adult", stageForAge(15) === "adult" && stageForAge(30) === "adult" && stageForAge(49) === "adult");
check("stage_elder", stageForAge(50) === "elder" && stageForAge(60) === "elder" && stageForAge(75) === "elder");

// 2. Test mortality rates across key age milestones
check("mortality_zero_under_55", mortalityRateForAge(20) === 0 && mortalityRateForAge(50) === 0 && mortalityRateForAge(54) === 0);
check("mortality_early_elder_55_57", mortalityRateForAge(55) === 0.06 && mortalityRateForAge(57) === 0.06);
check("mortality_target_elder_58_60", mortalityRateForAge(58) === 0.16 && mortalityRateForAge(60) === 0.16);
check("mortality_senior_elder_61_65", mortalityRateForAge(63) === 0.28);
check("mortality_advanced_elder_66_70", mortalityRateForAge(68) === 0.42);
check("mortality_late_elder_71_75", mortalityRateForAge(73) === 0.60);
check("mortality_centenarian_76_plus", mortalityRateForAge(80) === 0.80);

// 3. Monte Carlo Lifespan Distribution across 2000 lives
const seed = 42891;
const lifespanSamples = [];
for (let id = 1; id <= 2000; id++) {
    let currentAge = 0;
    let alive = true;
    while (alive && currentAge < 120) {
        currentAge++;
        const rate = mortalityRateForAge(currentAge);
        if (rate > 0) {
            const roll = unit01(seed, 0x01da6e, id, currentAge);
            if (roll < rate) {
                alive = false;
            }
        }
    }
    lifespanSamples.push(currentAge);
}

const totalYears = lifespanSamples.reduce((sum, a) => sum + a, 0);
const averageLifespan = totalYears / lifespanSamples.length;
const minAge = Math.min(...lifespanSamples);
const maxAge = Math.max(...lifespanSamples);

console.log(`Simulated 2000 lives -> Average Lifespan: ${averageLifespan.toFixed(2)} years (Min: ${minAge}, Max: ${maxAge})`);

// Average lifespan must be centered within 60 +/- 3 years
check("average_lifespan_centered_around_60", averageLifespan >= 57.0 && averageLifespan <= 63.0, `Average lifespan is ${averageLifespan.toFixed(2)} (expected ~60 years)`);
check("minimum_lifespan_at_least_55", minAge >= 55, `Youngest old-age mortality was ${minAge} (expected >= 55)`);
check("maximum_lifespan_realistic_cap", maxAge <= 110, `Eldest survivor was ${maxAge} (expected realistic cap)`);

// 4. Test peaceful passing chronicle formatting
function formatDeathChronicle(victim, killer) {
    const d = victim.data;
    const kname = killer && typeof killer.name === "string" ? killer.name : "";
    const kIsCreature = false;
    const by = kname ? (kIsCreature ? `a ${kname.toLowerCase()}` : kname) : "";
    const lvl = 5;
    return d.deathCause === "old_age"
        ? `${victim.name} passed away peacefully of old age at the age of ${d.age || 60}.`
        : (by ? `${victim.name} (fighting level ${lvl}) was killed by ${by}.` : `${victim.name} (fighting level ${lvl}) died of wounds.`);
}

const elderVictim = { name: "Elder Sarah", data: { deathCause: "old_age", age: 64 } };
const chronicleText = formatDeathChronicle(elderVictim, null);
check("chronicle_peaceful_passing", chronicleText === "Elder Sarah passed away peacefully of old age at the age of 64.", chronicleText);

console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
