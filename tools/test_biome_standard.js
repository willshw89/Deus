#!/usr/bin/env node
'use strict';

/**
 * tools/test_biome_standard.js
 *
 * Automated verification suite for Project DEUS:
 * "DW.01.04 — Freeze Biome Identity & Material Differentiation Standard".
 *
 * Verifies:
 * 1. Registry schema and canonical baselines (version 1.0.0, 5 canonical biomes).
 * 2. Absolute exclusion of snow/ice biomes, and explicit prohibition of snow in Highland.
 * 3. Restrained Volcanic identity (lava is an accent feature, no red wallpaper).
 * 4. Structural material identity coverage across all 5 biomes (ground, soil, geology, ecology, debris).
 * 5. Distinct signature materials and physical form rules.
 * 6. Vertical Z continuity hooks (Z+2 through Z-2) across all 5 biomes.
 * 7. All 10 horizontal transition pairs across all 6 physical bridge axes.
 * 8. Biome resolver prompt compiler CLI and module API.
 * 9. Separation of concerns: no premature RGB/hex palette ramps frozen in registry.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { loadBiomeRegistry, resolveBiome, resolveTransition, listBiomes, listTransitions } = require('./biome_resolver');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
    totalTests++;
    if (!condition) {
        console.error(`FAIL: ${message}`);
        return false;
    } else {
        console.log(`PASS: ${message}`);
        passedTests++;
        return true;
    }
}

console.log('=== DEUS BIOME IDENTITY & MATERIAL DIFFERENTIATION TEST SUITE (DW.01.04) ===\n');

// -----------------------------------------------------------------------------
// 1. REGISTRY INTEGRITY & CANONICAL BASELINES
// -----------------------------------------------------------------------------
console.log('--- 1. Registry Integrity & Canonical Baselines ---');
const registry = loadBiomeRegistry();

assert(registry.version === '1.0.0', 'Registry version is 1.0.0');
assert(registry.documentId === 'DEUS-BIOME-REGISTRY-01', 'Document ID is DEUS-BIOME-REGISTRY-01');
assert(registry.task === 'DW.01.04', 'Task is DW.01.04');
assert(Array.isArray(registry.canonicalBiomes) && registry.canonicalBiomes.length === 5,
    'Exactly 5 canonical major biomes are registered');

const expectedBiomes = ['TEMP', 'WET', 'ARID', 'HIGH', 'VOLC'];
assert(expectedBiomes.every(b => registry.canonicalBiomes.includes(b)),
    'Canonical biomes match expected IDs (TEMP, WET, ARID, HIGH, VOLC)');

// -----------------------------------------------------------------------------
// 2. EXCLUSION OF SNOW / ICE & FROZEN BIOME RESTRICTIONS
// -----------------------------------------------------------------------------
console.log('\n--- 2. Exclusion of Snow/Ice & Highland Restrictions ---');
assert(!registry.canonicalBiomes.includes('FROZEN'), 'FROZEN is not a canonical biome');
assert(!registry.canonicalBiomes.includes('SNOW'), 'SNOW is not a canonical biome');
assert(!registry.canonicalBiomes.includes('GLACIER'), 'GLACIER is not a canonical biome');
assert(!registry.canonicalBiomes.includes('ICE'), 'ICE is not a canonical biome');

const highland = registry.biomes.HIGH;
assert(highland, 'HIGH biome exists');
const highlandForbidden = highland.forbiddenCues.map(c => c.toLowerCase());
assert(highlandForbidden.some(c => c.includes('snow')), 'Highland explicitly forbids snow');
assert(highlandForbidden.some(c => c.includes('ice')), 'Highland explicitly forbids ice');
assert(highlandForbidden.some(c => c.includes('glacier')), 'Highland explicitly forbids glaciers');
assert(highlandForbidden.some(c => c.includes('frost')), 'Highland explicitly forbids frost');

// -----------------------------------------------------------------------------
// 3. VOLCANIC ACCENT RESTRICTIONS
// -----------------------------------------------------------------------------
console.log('\n--- 3. Volcanic Accent & Lava Containment ---');
const volcanic = registry.biomes.VOLC;
assert(volcanic, 'VOLC biome exists');
assert(volcanic.signatureMaterials.some(m => m.includes('focal molten lava')),
    'Volcanic defines lava as a focal/accent material');
const volcForbidden = volcanic.forbiddenCues.map(c => c.toLowerCase());
assert(volcForbidden.some(c => c.includes('red') || c.includes('wallpaper')),
    'Volcanic explicitly forbids full-screen glowing red wallpaper');

// -----------------------------------------------------------------------------
// 4. PHYSICAL SYSTEM & ECOLOGICAL PROFILE COMPLETENESS
// -----------------------------------------------------------------------------
console.log('\n--- 4. Physical System Completeness Across All Biomes ---');
const densityValues = new Set(['VERY_SPARSE', 'SPARSE', 'MODERATE', 'MODERATE_TO_DENSE', 'DENSE', 'VERY_DENSE', 'SPARSE_TO_MODERATE']);

for (const id of expectedBiomes) {
    const b = registry.biomes[id];
    assert(b !== undefined, `Biome ${id} exists in biomes map`);
    assert(typeof b.displayName === 'string' && b.displayName.length > 0, `${id}: valid displayName`);
    assert(typeof b.dominantGround === 'string' && b.dominantGround.length > 0, `${id}: valid dominantGround`);
    assert(typeof b.exposedSoil === 'string' && b.exposedSoil.length > 0, `${id}: valid exposedSoil`);
    assert(typeof b.geology === 'string' && b.geology.length > 0, `${id}: valid geology`);
    assert(typeof b.moisture === 'string' && b.moisture.length > 0, `${id}: valid moisture`);
    assert(typeof b.drainage === 'string' && b.drainage.length > 0, `${id}: valid drainage`);
    assert(typeof b.vegetationForm === 'string' && b.vegetationForm.length > 0, `${id}: valid vegetationForm`);
    assert(Array.isArray(b.treeVocabulary) && b.treeVocabulary.length > 0, `${id}: valid treeVocabulary`);
    assert(Array.isArray(b.shrubVocabulary) && b.shrubVocabulary.length > 0, `${id}: valid shrubVocabulary`);
    assert(Array.isArray(b.lowFloraVocabulary) && b.lowFloraVocabulary.length > 0, `${id}: valid lowFloraVocabulary`);
    assert(Array.isArray(b.rockOutcropVocabulary) && b.rockOutcropVocabulary.length > 0, `${id}: valid rockOutcropVocabulary`);
    assert(Array.isArray(b.debrisVocabulary) && b.debrisVocabulary.length > 0, `${id}: valid debrisVocabulary`);
    assert(Array.isArray(b.signatureMaterials) && b.signatureMaterials.length >= 3, `${id}: at least 3 signature materials`);
    assert(Array.isArray(b.sharedMaterials) && b.sharedMaterials.length >= 3, `${id}: shared materials declared`);
    assert(Array.isArray(b.forbiddenCues) && b.forbiddenCues.length >= 3, `${id}: forbidden cues declared`);

    // Vegetation density checks
    assert(densityValues.has(b.vegetationDensity.grass), `${id}: valid grass density (${b.vegetationDensity.grass})`);
    assert(densityValues.has(b.vegetationDensity.shrubs), `${id}: valid shrub density (${b.vegetationDensity.shrubs})`);
    assert(densityValues.has(b.vegetationDensity.trees), `${id}: valid tree density (${b.vegetationDensity.trees})`);
    assert(densityValues.has(b.vegetationDensity.lowFlora), `${id}: valid lowFlora density (${b.vegetationDensity.lowFlora})`);
    assert(densityValues.has(b.vegetationDensity.debris), `${id}: valid debris density (${b.vegetationDensity.debris})`);
}

// -----------------------------------------------------------------------------
// 5. VERTICAL Z HOOKS (Z+2 TO Z-2)
// -----------------------------------------------------------------------------
console.log('\n--- 5. Vertical Z Continuity Hooks ---');
const expectedZLevels = ['Z+2', 'Z+1', 'Z0', 'Z-1', 'Z-2'];
for (const id of expectedBiomes) {
    const b = registry.biomes[id];
    const zHooks = b.verticalHooks;
    assert(zHooks !== undefined, `${id}: verticalHooks object exists`);
    for (const z of expectedZLevels) {
        assert(typeof zHooks[z] === 'string' && zHooks[z].length > 0,
            `${id}: ${z} vertical hook defined (${zHooks[z].substring(0, 30)}...)`);
        const hookText = zHooks[z].toLowerCase();
        assert(!/boardwalk|settlement|dwarven|orchard|mine shaft|quarry|root cellar|dug earthworks/i.test(hookText),
            `${id}: ${z} hook contains no constructed infrastructure (${hookText.substring(0, 25)}...)`);
        assert(!/raptor|swamp bird|eagle/i.test(hookText),
            `${id}: ${z} hook contains no wildlife references (${hookText.substring(0, 25)}...)`);
        assert(!/canopy crowns|upper crowns/i.test(hookText),
            `${id}: ${z} hook contains no tree canopy airspace leakage (${hookText.substring(0, 25)}...)`);
    }
}

// -----------------------------------------------------------------------------
// 6. HORIZONTAL TRANSITIONS (ALL 10 PAIRS & 6 AXES)
// -----------------------------------------------------------------------------
console.log('\n--- 6. Horizontal Transitions Across All 10 Biome Pairs ---');
const expectedPairs = [
    'TEMP_WET', 'TEMP_ARID', 'TEMP_HIGH', 'TEMP_VOLC',
    'WET_ARID', 'WET_HIGH', 'WET_VOLC',
    'ARID_HIGH', 'ARID_VOLC',
    'HIGH_VOLC'
];

assert(Object.keys(registry.horizontalTransitions).length === 10,
    `Exactly 10 horizontal transition pairs registered (found ${Object.keys(registry.horizontalTransitions).length})`);

for (const pairKey of expectedPairs) {
    const t = registry.horizontalTransitions[pairKey];
    assert(t !== undefined, `Transition pair ${pairKey} exists`);
    assert(typeof t.grassDensity === 'string' && t.grassDensity.length > 0, `${pairKey}: valid grassDensity axis`);
    assert(typeof t.soilTransition === 'string' && t.soilTransition.length > 0, `${pairKey}: valid soilTransition axis`);
    assert(typeof t.geologyTransition === 'string' && t.geologyTransition.length > 0, `${pairKey}: valid geologyTransition axis`);
    assert(typeof t.moistureTransition === 'string' && t.moistureTransition.length > 0, `${pairKey}: valid moistureTransition axis`);
    assert(typeof t.vegetationForm === 'string' && t.vegetationForm.length > 0, `${pairKey}: valid vegetationForm axis`);
    assert(typeof t.topography === 'string' && t.topography.length > 0, `${pairKey}: valid topography axis`);
}

// -----------------------------------------------------------------------------
// 7. PROMPT-COMPILER TOOLING (tools/biome_resolver.js)
// -----------------------------------------------------------------------------
console.log('\n--- 7. Biome Resolver Tooling (tools/biome_resolver.js) ---');
const resolvedTemp = resolveBiome('TEMP');
assert(resolvedTemp && resolvedTemp.biomeId === 'TEMP', 'Resolver API: resolves TEMP');
assert(resolvedTemp.signatureMaterials.includes('rich loam'), 'Resolver API: TEMP includes rich loam signature');

const resolvedAridName = resolveBiome('steppe');
assert(resolvedAridName && resolvedAridName.biomeId === 'ARID', 'Resolver API: alias "steppe" resolves to ARID');

const resolvedTrans = resolveTransition('TEMP', 'ARID');
assert(resolvedTrans && resolvedTrans.pair === 'TEMP <-> ARID', 'Resolver API: resolves transition TEMP <-> ARID');
assert(resolvedTrans.soilTransition.includes('caliche'), 'Resolver API: TEMP-ARID soil axis includes caliche');

// CLI invocation tests
try {
    const cliOutput = execSync('node tools/biome_resolver.js TEMP', { encoding: 'utf8' });
    assert(cliOutput.includes('=== CANONICAL BIOME SPECIFICATION (TEMP — Temperate / Verdant) ==='),
        'Resolver CLI: output includes canonical biome header');
    assert(cliOutput.includes('DOMINANT GROUND: Fertile meadow turf'),
        'Resolver CLI: output includes dominant ground specification');
} catch (e) {
    assert(false, `Resolver CLI execution failed: ${e.message}`);
}

try {
    const cliTrans = execSync('node tools/biome_resolver.js --pair TEMP WET', { encoding: 'utf8' });
    assert(cliTrans.includes('=== CANONICAL BIOME TRANSITION AXES (TEMP <-> WET) ==='),
        'Resolver CLI: output includes transition pair header');
    assert(cliTrans.includes('SOIL TRANSITION AXIS:'),
        'Resolver CLI: output includes soil transition axis');
} catch (e) {
    assert(false, `Resolver CLI --pair execution failed: ${e.message}`);
}

try {
    execSync('node tools/biome_resolver.js NONEXISTENT_BIOME', { encoding: 'utf8', stdio: 'pipe' });
    assert(false, 'Resolver CLI should fail on unknown biome');
} catch (e) {
    assert(true, 'Resolver CLI exits with error code on unknown biome');
}

// -----------------------------------------------------------------------------
// 8. SEPARATION OF CONCERNS: NO RAW PALETTE ARCHITECTURE FROZEN HERE
// -----------------------------------------------------------------------------
console.log('\n--- 8. Separation of Concerns: No Premature Raw Palette Architecture ---');
const registryRaw = fs.readFileSync(path.resolve(__dirname, '..', 'game', 'data', 'DEUS_BiomeRegistry.json'), 'utf8');
const hexMatches = registryRaw.match(/#[0-9a-fA-F]{6}/g);
assert(!hexMatches || hexMatches.length === 0,
    'No premature hex color ramps in biome registry (reserved for DW.01.05)');

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log(`\n==================================================`);
console.log(`TOTAL CHECKS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${totalTests - passedTests}`);
console.log(`==================================================\n`);

if (passedTests === totalTests) {
    console.log('ALL BIOME STANDARD CHECKS PASSED (DW.01.04).');
    process.exit(0);
} else {
    console.error('BIOME STANDARD VERIFICATION FAILED.');
    process.exit(1);
}
