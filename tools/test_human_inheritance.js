// Test human variation inheritance and distribution
"use strict";

function unit01(seed, salt, ...parts) {
    let h = (seed ^ salt) >>> 0;
    for (const p of parts) {
        h = Math.imul(h ^ (p | 0), 0x5bd1e995);
        h = (h ^ (h >>> 15)) >>> 0;
    }
    return (h >>> 0) / 4294967296;
}

const SALT_ROLL = 0x7391;
const SALT_FACET = 0x51c7;

function variationFor(worldSeed, unitId, mother, father) {
    const roll = unit01(worldSeed, SALT_ROLL, unitId);
    const mVar = mother && mother.data && mother.data.variation ? mother.data.variation | 0 : null;
    const fVar = father && father.data && father.data.variation ? father.data.variation | 0 : null;
    if (mVar && fVar) {
        if (roll < 0.45) return mVar;
        if (roll < 0.90) return fVar;
        return 1 + Math.floor(unit01(worldSeed, SALT_FACET, unitId) * 6);
    }
    if (mVar) {
        if (roll < 0.70) return mVar;
        return 1 + Math.floor(unit01(worldSeed, SALT_FACET, unitId) * 6);
    }
    if (fVar) {
        if (roll < 0.70) return fVar;
        return 1 + Math.floor(unit01(worldSeed, SALT_FACET, unitId) * 6);
    }
    return 1 + Math.floor(roll * 6);
}

// 1. Test random generation distribution across 1000 independent people
const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
for (let id = 1; id <= 1200; id++) {
    const v = variationFor(12345, id, null, null);
    counts[v]++;
}
console.log("Independent variation distribution over 1200 units:", counts);
for (let i = 1; i <= 6; i++) {
    if (counts[i] < 120 || counts[i] > 280) {
        throw new Error(`Distribution for variation ${i} was out of expected range: ${counts[i]}`);
    }
}

// 2. Test inheritance with Father=2, Mother=5
let motherCount = 0, fatherCount = 0, otherCount = 0;
const mom = { data: { variation: 5 } };
const dad = { data: { variation: 2 } };
for (let id = 1; id <= 1000; id++) {
    const v = variationFor(999, id, mom, dad);
    if (v === 5) motherCount++;
    else if (v === 2) fatherCount++;
    else otherCount++;
}
console.log(`Inheritance (Mom=5, Dad=2) over 1000 children: Mom=${motherCount}, Dad=${fatherCount}, Other=${otherCount}`);
if (motherCount < 400 || motherCount > 500) throw new Error(`Mother inheritance out of range: ${motherCount}`);
if (fatherCount < 400 || fatherCount > 500) throw new Error(`Father inheritance out of range: ${fatherCount}`);
if (otherCount < 50 || otherCount > 150) throw new Error(`Mutation out of range: ${otherCount}`);

console.log("ALL HUMAN VARIATION TESTS PASSED!");

