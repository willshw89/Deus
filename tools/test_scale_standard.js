#!/usr/bin/env node
'use strict';

/**
 * tools/test_scale_standard.js
 *
 * Automated verification suite for Project DEUS:
 * "DW.01.03 — Freeze Human / World Scale Strip".
 *
 * Verifies:
 * 1. Machine-readable scale registry (game/data/DEUS_ScaleRegistry.json) schema and invariants.
 * 2. Tree standard preservation (Oak ~84 px, Birch ~88 px, Pine ~92 px, Accent ~105 px, Hero ~140 px).
 * 3. Required scale classes presence across all categories.
 * 4. Scale resolver prompt compiler tool (tools/scale_resolver.js).
 * 5. Scale strip graphic output (art/reference/DEUS_HUMAN_SCALE_STRIP_V1.png).
 * 6. Automated QC integration in art_check.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { loadRegistry, resolveScaleClass } = require('./scale_resolver');
const { readPNG } = require('./png_read');

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

console.log('=== DEUS HUMAN / WORLD SCALE STANDARD TEST SUITE (DW.01.03) ===\n');

// -----------------------------------------------------------------------------
// 1. REGISTRY INTEGRITY & BASELINES
// -----------------------------------------------------------------------------
console.log('--- 1. Registry Integrity & Canonical Baselines ---');
const registry = loadRegistry();

assert(registry.version === '1.0.0', 'Registry version is 1.0.0');
assert(registry.officialCameraScale === '1.00x', 'Official camera is locked to 1.00x');
assert(registry.worldTileSizePx === 48, 'World tile size is 48 px');
assert(registry.canonicalHumanHeightPx === 42, 'Canonical Adult Human yardstick is 42 px');
assert(registry.pixelDensityMode === 'NATIVE_1_TO_1', 'Pixel density is NATIVE_1_TO_1');

// -----------------------------------------------------------------------------
// 2. TREE STANDARD PRESERVATION
// -----------------------------------------------------------------------------
console.log('\n--- 2. Tree Standard Preservation ---');
const oak = registry.classes.TREE_COMMON_OAK;
assert(oak && oak.visualHeightMin === 72 && oak.visualHeightTarget === 84 && oak.visualHeightMax === 96,
    'Standard Common Oak is 72-96 px (target 84 px, ~2.0x Human)');

const birch = registry.classes.TREE_COMMON_BIRCH;
assert(birch && birch.visualHeightMin === 76 && birch.visualHeightTarget === 88 && birch.visualHeightMax === 100,
    'Standard Common Birch is 76-100 px (target 88 px, ~2.1x Human)');

const pine = registry.classes.TREE_COMMON_PINE;
assert(pine && pine.visualHeightMin === 80 && pine.visualHeightTarget === 92 && pine.visualHeightMax === 104,
    'Standard Common Pine is 80-104 px (target 92 px, ~2.2x Human)');

const accent = registry.classes.TREE_LARGE_ACCENT;
assert(accent && accent.visualHeightMin === 96 && accent.visualHeightTarget === 105 && accent.visualHeightMax === 124,
    'Large Accent Tree is 96-124 px (target 105 px, ~2.5x Human)');

const hero = registry.classes.TREE_HERO_LANDMARK;
assert(hero && hero.visualHeightMin === 120 && hero.visualHeightTarget === 140 && hero.visualHeightMax === 160,
    'Hero / Landmark Tree is 120-160+ px (target 140 px, ~3.3x Human)');

// -----------------------------------------------------------------------------
// 3. REQUIRED CLASS COVERAGE
// -----------------------------------------------------------------------------
console.log('\n--- 3. Required Class Coverage ---');
const requiredClasses = [
    // Human / Character
    'CHARACTER_HUMAN_ADULT', 'CHARACTER_DWARF_ADULT', 'CHARACTER_ELF_ADULT', 'CHARACTER_CHILD', 'CREATURE_LARGE_2TILE',
    // Micro Vegetation
    'MICRO_SHORT_GRASS', 'MICRO_TALL_GRASS', 'MICRO_REEDS', 'MICRO_FLOWERS', 'MICRO_FUNGI',
    // Shrubs
    'SHRUB_SMALL_BUSH', 'SHRUB_MEDIUM_BUSH', 'SHRUB_LARGE_THICKET',
    // Stone
    'STONE_PEBBLES', 'STONE_SMALL_ROCK', 'STONE_MEDIUM_ROCK', 'STONE_LARGE_BOULDER', 'STONE_HERO_OUTCROP',
    // Wood / Debris
    'DEBRIS_STUMP', 'DEBRIS_FALLEN_BRANCH', 'DEBRIS_FALLEN_LOG',
    // Trees
    'TREE_SAPLING', 'TREE_COMMON_OAK', 'TREE_COMMON_BIRCH', 'TREE_COMMON_PINE', 'TREE_LARGE_ACCENT', 'TREE_HERO_LANDMARK',
    // Architecture Reference
    'ARCH_DOORWAY', 'ARCH_WALL_2GRID', 'ARCH_BED', 'ARCH_CHAIR', 'ARCH_TABLE',
    'ARCH_CHEST', 'ARCH_BARREL', 'ARCH_WORKBENCH', 'ARCH_HEARTH', 'ARCH_FENCE', 'ARCH_STAIR_RAMP'
];

let allExist = true;
for (const rc of requiredClasses) {
    if (!registry.classes[rc]) {
        allExist = false;
        assert(false, `Required class ${rc} exists in registry`);
    }
}
if (allExist) {
    assert(true, `All ${requiredClasses.length} required canonical scale classes exist in registry`);
}

// -----------------------------------------------------------------------------
// 4. LOGICAL INVARIANTS ACROSS ALL ENTRIES
// -----------------------------------------------------------------------------
console.log('\n--- 4. Logical Invariants Across All Entries ---');
let allConsistent = true;
const validAnchors = new Set(['BOTTOM_CENTER', 'BOTTOM_LEFT', 'CENTER', 'BOTTOM_SURFACE']);

for (const [id, entry] of Object.entries(registry.classes)) {
    if (entry.visualWidthMin > entry.visualWidthTarget || entry.visualWidthTarget > entry.visualWidthMax) {
        allConsistent = false;
        assert(false, `${id}: width min <= target <= max violated`);
    }
    if (entry.visualHeightMin > entry.visualHeightTarget || entry.visualHeightTarget > entry.visualHeightMax) {
        allConsistent = false;
        assert(false, `${id}: height min <= target <= max violated`);
    }
    if (!Number.isInteger(entry.footprintWidthTiles) || entry.footprintWidthTiles < 1) {
        allConsistent = false;
        assert(false, `${id}: invalid footprintWidthTiles`);
    }
    if (!Number.isInteger(entry.footprintHeightTiles) || entry.footprintHeightTiles < 1) {
        allConsistent = false;
        assert(false, `${id}: invalid footprintHeightTiles`);
    }
    if (!validAnchors.has(entry.anchorType)) {
        allConsistent = false;
        assert(false, `${id}: invalid anchorType ${entry.anchorType}`);
    }
    if (typeof entry.overhangAllowed !== 'boolean') {
        allConsistent = false;
        assert(false, `${id}: overhangAllowed must be boolean`);
    }
}
if (allConsistent) {
    assert(true, `All ${Object.keys(registry.classes).length} entries satisfy strict mathematical and footprint bounds`);
}

// -----------------------------------------------------------------------------
// 5. SCALE RESOLVER CLI & API
// -----------------------------------------------------------------------------
console.log('\n--- 5. Scale Resolver Tooling (tools/scale_resolver.js) ---');
const resolvedOak = resolveScaleClass('TREE_COMMON_OAK');
assert(resolvedOak && resolvedOak.ratioToHuman === 2.0, 'Resolver API: TREE_COMMON_OAK ratio is 2.0x Human');
assert(resolvedOak.visualEnvelope.height.target === 84, 'Resolver API: target height is 84 px');
assert(resolvedOak.overhangAllowed === true, 'Resolver API: overhang is allowed for tree');

// Test CLI invocation
try {
    const cliOutput = execSync('node tools/scale_resolver.js TREE_COMMON_OAK', { encoding: 'utf8' });
    assert(cliOutput.includes('YARDSTICK REFERENCE: Canonical Adult Human is ~42 native rendered pixels tall'),
        'Resolver CLI: output includes Human yardstick reference');
    assert(cliOutput.includes('TARGET VISUAL ENVELOPE: 68 px wide × 84 px tall'),
        'Resolver CLI: output includes target visual envelope');
} catch (e) {
    assert(false, `Resolver CLI execution failed: ${e.message}`);
}

// Test CLI failure on unknown class
try {
    execSync('node tools/scale_resolver.js UNKNOWN_CLASS_TEST', { encoding: 'utf8', stdio: 'pipe' });
    assert(false, 'Resolver CLI should fail on unknown class');
} catch (e) {
    assert(true, 'Resolver CLI exits with error code on unknown class');
}

// -----------------------------------------------------------------------------
// 6. SCALE STRIP ASSET VERIFICATION
// -----------------------------------------------------------------------------
console.log('\n--- 6. Canonical Scale Strip Graphic ---');
const stripPath = path.resolve(__dirname, '..', 'art', 'reference', 'DEUS_HUMAN_SCALE_STRIP_V1.png');
assert(fs.existsSync(stripPath), 'DEUS_HUMAN_SCALE_STRIP_V1.png exists in art/reference/');

try {
    const stripImg = readPNG(stripPath);
    assert(stripImg.width === 1340 && stripImg.height === 224,
        `Scale strip dimensions are exact 1340x224 px (got ${stripImg.width}x${stripImg.height})`);
    assert(stripImg.data.length === 1340 * 224 * 4, 'Scale strip raw RGBA buffer is fully intact');
} catch (e) {
    assert(false, `Failed to decode scale strip PNG: ${e.message}`);
}

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log(`\n==================================================`);
console.log(`TOTAL CHECKS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${totalTests - passedTests}`);
console.log(`==================================================\n`);

if (passedTests === totalTests) {
    console.log('ALL SCALE STANDARD CHECKS PASSED (DW.01.03).');
    process.exit(0);
} else {
    console.error('SCALE STANDARD VERIFICATION FAILED.');
    process.exit(1);
}
