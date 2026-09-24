#!/usr/bin/env node
'use strict';

/**
 * tools/test_palette_standard.js
 *
 * Automated Test Suite for DEUS Palette Architecture & Family Material Ramps (DW.01.05).
 * Validates:
 * 1. Palette registry loads and validates schema
 * 2. Master colors are unique by ID and bounded <= 256
 * 3. Exact duplicate RGB values check
 * 4. Ramps reference valid master colors with valid tone roles
 * 5. Monotonic value progression across ordinary ramps
 * 6. All five biomes have required material families
 * 7. All 10 biome pairs expose transition bridge specifications
 * 8. Zero snow/ice palette family in canonical biomes
 * 9. Volcanic high-saturation lava localized strictly to hazard/VFX
 * 10. Policy verification: packed tileset sheets NOT capped at 32 colors
 * 11. Strict QC: arbitrary unregistered RGB color fails
 * 12. Registered VFX exception behaves correctly
 * 13. Deterministic palette board graphic exists with correct dimensions
 * 14. Resolver API and CLI tooling
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`PASS: ${message}`);
        passed++;
    } else {
        console.error(`FAIL: ${message}`);
        failed++;
    }
}

console.log('=== DEUS PALETTE ARCHITECTURE & MATERIAL RAMPS TEST SUITE (DW.01.05) ===\n');

// -----------------------------------------------------------------------------
// 1. REGISTRY INTEGRITY & STRUCTURE
// -----------------------------------------------------------------------------
console.log('--- 1. Registry Integrity & Schema ---');
const REG_PATH = path.resolve(__dirname, '..', 'game', 'data', 'DEUS_PaletteRegistry.json');
const DOC_REG_PATH = path.resolve(__dirname, '..', 'docs', 'art', 'DEUS_PaletteRegistry.json');
const HEX_PATH = path.resolve(__dirname, '..', 'art', 'palette', 'deus_master_world_palette_v1.hex');

assert(fs.existsSync(REG_PATH), 'DEUS_PaletteRegistry.json exists in game/data/');
assert(fs.existsSync(DOC_REG_PATH), 'DEUS_PaletteRegistry.json exists in docs/art/');
assert(fs.existsSync(HEX_PATH), 'deus_master_world_palette_v1.hex exists in art/palette/');

let registry = null;
try {
    registry = JSON.parse(fs.readFileSync(REG_PATH, 'utf8'));
} catch (e) {
    assert(false, `Registry JSON parse error: ${e.message}`);
    process.exit(1);
}

assert(registry.version === '1.1.0', 'Registry version is 1.1.0');
assert(registry.documentId === 'DEUS-PALETTE-REGISTRY-01', 'Document ID is DEUS-PALETTE-REGISTRY-01');
assert(registry.canonicalCeiling === 256, 'Canonical master ceiling is locked to 256');
assert(registry.masterColorCount <= 240, `Master active colors (${registry.masterColorCount}) meets V1 ceiling <= 240 (target: 220–240)`);
assert(registry.masterColorCount >= 220, `Master active colors (${registry.masterColorCount}) meets target range >= 220`);
assert(registry.reservedCapacity >= 16, `Master palette retains explicit reserve capacity >= 16 slots (got ${registry.reservedCapacity})`);
assert(registry.canonicalCeiling - registry.masterColorCount === registry.reservedCapacity,
    'Reserved capacity equals canonicalCeiling minus masterColorCount');
assert(typeof registry.reservePolicy === 'object', 'reservePolicy block exists in registry');
assert(registry.reservePolicy.minReservedCapacity >= 16, 'reservePolicy requires >= 16 reserved slots');
assert(typeof registry.versioningPolicy === 'object', 'versioningPolicy block exists in registry');
assert(Array.isArray(registry.versioningPolicy.controlledAdditionSteps) && registry.versioningPolicy.controlledAdditionSteps.length === 8,
    'versioningPolicy specifies 8-step controlled change process');
assert(typeof registry.policy === 'object', 'Policy block exists');
assert(registry.policy.sheetCapPolicy.includes('NO ARBITRARY 32-COLOR CAP'), 'Policy explicitly removes arbitrary 32-color sheet cap');

// -----------------------------------------------------------------------------
// 2. MASTER COLOR INVARIANTS & UNIQUENESS
// -----------------------------------------------------------------------------
console.log('\n--- 2. Master Color Invariants & Deduplication ---');
const masterColors = registry.masterColors;
assert(masterColors !== undefined && typeof masterColors === 'object', 'masterColors object exists');

const masterIds = Object.keys(masterColors);
assert(masterIds.length === registry.masterColorCount, 'masterColorCount matches Object.keys length');

const seenHexes = new Map();
let malformedHex = 0;
let rgbMismatch = 0;
let lumMismatch = 0;

for (const [id, c] of Object.entries(masterColors)) {
    if (!/^#[0-9A-F]{6}$/i.test(c.hex)) malformedHex++;
    const r = parseInt(c.hex.slice(1, 3), 16);
    const g = parseInt(c.hex.slice(3, 5), 16);
    const b = parseInt(c.hex.slice(5, 7), 16);
    if (c.r !== r || c.g !== g || c.b !== b) rgbMismatch++;
    const expectedLum = Math.round((0.2126 * r + 0.7152 * g + 0.0722 * b) * 10) / 10;
    if (Math.abs(c.luminance - expectedLum) > 0.1) lumMismatch++;

    if (seenHexes.has(c.hex.toUpperCase())) {
        seenHexes.get(c.hex.toUpperCase()).push(id);
    } else {
        seenHexes.set(c.hex.toUpperCase(), [id]);
    }
}

assert(malformedHex === 0, 'All master color hex strings are well-formed 6-digit hex');
assert(rgbMismatch === 0, 'All master color RGB channels match hex codes');
assert(lumMismatch === 0, 'All master color luminance values accurately follow ITU-R BT.709');

// Exact duplicate check
let exactDuplicates = 0;
for (const [hex, ids] of seenHexes.entries()) {
    if (ids.length > 1) {
        exactDuplicates++;
        console.error(`  Exact duplicate: ${hex} used by: ${ids.join(', ')}`);
    }
}
assert(exactDuplicates === 0, 'Zero exact duplicate RGB values exist in Master Palette');

// Near duplicates check
const nearDuplicates = registry.nearDuplicatesReport;
assert(Array.isArray(nearDuplicates), 'nearDuplicatesReport is an array');
assert(nearDuplicates.length <= 15, `Near duplicates report count (${nearDuplicates.length}) is audited and <= 15`);

// -----------------------------------------------------------------------------
// 3. MATERIAL RAMPS INTEGRITY & MONOTONICITY
// -----------------------------------------------------------------------------
console.log('\n--- 3. Material Ramps Integrity & Monotonicity ---');
const ramps = registry.ramps;
const validRoles = new Set(['deepShadow', 'shadow', 'bodyDark', 'body', 'light', 'highlight']);

assert(Object.keys(ramps).length === registry.totalRampsCount, 'Ramp count matches registry totalRampsCount');
assert(registry.totalRampsCount >= 50, `Substantial material ramp coverage (got ${registry.totalRampsCount} ramps, >= 50)`);

let invalidColorRef = 0;
let invalidRole = 0;
let nonMonotonicRamps = [];

for (const [rId, ramp] of Object.entries(ramps)) {
    assert(ramp.rampId === rId, `${rId}: rampId matches key`);
    assert(ramp.colorCount >= 3 && ramp.colorCount <= 6, `${rId}: tone count ${ramp.colorCount} is 3-6 tones`);
    assert(ramp.colorIds.length === ramp.colorCount, `${rId}: colorIds length matches colorCount`);
    assert(ramp.hexColors.length === ramp.colorCount, `${rId}: hexColors length matches colorCount`);
    assert(ramp.toneRoles.length === ramp.colorCount, `${rId}: toneRoles length matches colorCount`);

    let prevLum = -1;
    let isMonotonic = true;

    for (let i = 0; i < ramp.colorCount; i++) {
        const cid = ramp.colorIds[i];
        const hex = ramp.hexColors[i];
        const role = ramp.toneRoles[i];

        if (!masterColors[cid]) invalidColorRef++;
        if (!validRoles.has(role)) invalidRole++;

        const mc = masterColors[cid];
        if (mc) {
            if (mc.luminance < prevLum) {
                isMonotonic = false;
            }
            prevLum = mc.luminance;
        }
    }

    if (!isMonotonic) {
        nonMonotonicRamps.push(rId);
    }
}

assert(invalidColorRef === 0, 'All ramps reference valid, existing master color IDs');
assert(invalidRole === 0, 'All ramp tone roles are valid (deepShadow, shadow, body, light, highlight)');
assert(nonMonotonicRamps.length === 0, `All ramps exhibit coherent monotonic value progression (failed: ${nonMonotonicRamps.join(', ')})`);

// -----------------------------------------------------------------------------
// 4. REQUIRED MATERIAL FAMILIES & BIOME COVERAGE
// -----------------------------------------------------------------------------
console.log('\n--- 4. Required Material Families & Biome Coverage ---');
const requiredRamps = [
    // Shared Neutrals
    'NEUT_VOID_BLACK', 'NEUT_COOL_GRAY', 'NEUT_WARM_GRAY', 'NEUT_PALE_CREST',
    // Temperate
    'TEMP_GRASS_FERTILE', 'TEMP_GRASS_DRY', 'TEMP_SOIL_LOAM', 'TEMP_WOODLAND_FLOOR',
    'TEMP_BARK_OAK', 'TEMP_BARK_BIRCH', 'TEMP_FOLIAGE_OAK', 'TEMP_STONE_FIELDSTONE', 'TEMP_STONE_LIMESTONE',
    // Wetland
    'WET_GRASS_SATURATED', 'WET_REED_RUSH', 'WET_SOIL_PEAT', 'WET_MUD_ANAEROBIC',
    'WET_SILT_RIVER', 'WET_STONE_DAMP_SLATE', 'WET_WOOD_DRIFTWOOD', 'WET_FOLIAGE_WILLOW',
    // Arid
    'ARID_GRASS_BUNCHGRASS', 'ARID_SOIL_HARDPAN', 'ARID_SOIL_CLAY', 'ARID_SAND_COARSE',
    'ARID_STONE_SANDSTONE', 'ARID_SCRUB_THORN', 'ARID_WOOD_BLEACHED', 'ARID_BONE_CALICHE',
    // Highland
    'HIGH_GRASS_ALPINE', 'HIGH_SOIL_STONY_LOAM', 'HIGH_GRAVEL_SCREE', 'HIGH_STONE_GRANITE',
    'HIGH_STONE_SLATE', 'HIGH_FOLIAGE_CONIFER', 'HIGH_BARK_CONIFER',
    // Volcanic
    'VOLC_ASH_DRIFT', 'VOLC_SOIL_SCORCHED', 'VOLC_STONE_BASALT', 'VOLC_STONE_SCORIA',
    'VOLC_STONE_PUMICE', 'VOLC_STONE_OBSIDIAN', 'VOLC_MINERAL_SULFUR', 'VOLC_WOOD_CHARRED', 'VOLC_LAVA_HAZARD',
    // Water
    'WATER_SHALLOW_CLEAR', 'WATER_DEEP_FRESH', 'WATER_MURKY_WETLAND', 'WATER_FOAM_RAPIDS',
    // Construction
    'CONSTRUCT_TIMBER_FRESH', 'CONSTRUCT_TIMBER_AGED', 'CONSTRUCT_STONE_DRESSED',
    'CONSTRUCT_METAL_IRON', 'CONSTRUCT_FABRIC_LEATHER',
    // Supernatural
    'MAGIC_DIVINE_GOLD', 'MAGIC_ARCANE_CYAN', 'MAGIC_ASTRAL_VIOLET', 'MAGIC_HEALING_EMERALD'
];

for (const req of requiredRamps) {
    assert(ramps[req] !== undefined, `Required ramp ${req} exists in registry`);
}

// -----------------------------------------------------------------------------
// 5. HORIZONTAL TRANSITIONS (ALL 10 BIOME PAIRS)
// -----------------------------------------------------------------------------
console.log('\n--- 5. Horizontal Transition Bridges (All 10 Pairs) ---');
const expectedPairs = [
    'TEMP_WET', 'TEMP_ARID', 'TEMP_HIGH', 'TEMP_VOLC',
    'WET_ARID', 'WET_HIGH', 'WET_VOLC',
    'ARID_HIGH', 'ARID_VOLC',
    'HIGH_VOLC'
];

assert(Object.keys(registry.transitionBridges).length === 10, 'Exactly 10 transition bridge pairs defined');

for (const pair of expectedPairs) {
    const bridge = registry.transitionBridges[pair];
    assert(bridge !== undefined, `Transition bridge for ${pair} exists`);
    assert(Array.isArray(bridge.primaryBridgeRamps) && bridge.primaryBridgeRamps.length >= 3,
        `${pair}: at least 3 bridge ramps specified (${bridge.primaryBridgeRamps.length})`);
    assert(Array.isArray(bridge.bridgeTones) && bridge.bridgeTones.length >= 3,
        `${pair}: bridge tones defined (${bridge.bridgeTones.length})`);
    assert(typeof bridge.notes === 'string' && bridge.notes.length > 0, `${pair}: transition notes defined`);
}

// -----------------------------------------------------------------------------
// 6. ECOLOGICAL INVARIANTS
// -----------------------------------------------------------------------------
console.log('\n--- 6. Cardinal Ecological Invariants ---');
// Invariant 1: Zero snow/ice/frost ramps in canonical biomes
for (const [rId, ramp] of Object.entries(ramps)) {
    const text = `${rId} ${ramp.preferredUsage} ${ramp.notes}`.toLowerCase();
    assert(!/\bsnow\b|\bice\b|\bglacier\b|\bfrost\b/i.test(rId),
        `${rId}: zero snow/ice in ramp identifier`);
}

// Invariant 2: High saturation lava strictly localized
const lavaRamp = ramps['VOLC_LAVA_HAZARD'];
assert(lavaRamp !== undefined, 'VOLC_LAVA_HAZARD ramp exists');
assert(lavaRamp.forbiddenUsage.includes('wallpaper flooding'), 'Lava ramp forbids full-screen wallpaper flooding');

const basaltRamp = ramps['VOLC_STONE_BASALT'];
const basaltCrests = basaltRamp.hexColors;
assert(basaltRamp.materialFamily === 'STONE', 'Basalt is classified as STONE');
// Verify basalt is dark cool grey, not bright glowing red
const basaltBody = masterColors[basaltRamp.colorIds[2]];
assert(basaltBody.r <= 60 && basaltBody.g <= 60 && basaltBody.b <= 70,
    `Basalt body (${basaltBody.hex}) is charcoal grey-black, not glowing red`);

// -----------------------------------------------------------------------------
// 7. POLICY CHANGE: PACKED TILESET SHEET CONTAINER VALIDATION
// -----------------------------------------------------------------------------
console.log('\n--- 7. Policy Change & QC Integration (art_check.js) ---');
const { checkFile } = require('./art_check');

// Create a mock tileset image fixture with 45 distinct colors (exceeding old 32 limit)
const tempDir = path.resolve(__dirname, '..', 'art', 'test_scratch');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const mockTilesetPath = path.join(tempDir, 'T_Tileset45Colors.png');
const mockTilesetScPath = path.join(tempDir, 'T_Tileset45Colors.json');

// 192x192 tileset sheet with 45 master palette colors
const { writePNG } = require('./png_util');
const tW = 192, tH = 192;
const tBuf = Buffer.alloc(tW * tH * 4, 0);

// Fill with 45 distinct colors from masterColors
const masterHexes = Object.values(masterColors).slice(0, 45);
for (let y = 0; y < tH; y++) {
    for (let x = 0; x < tW; x++) {
        const colIdx = (Math.floor(x / 24) + Math.floor(y / 24) * 8) % masterHexes.length;
        const c = masterHexes[colIdx];
        const idx = (y * tW + x) * 4;
        tBuf[idx] = c.r;
        tBuf[idx + 1] = c.g;
        tBuf[idx + 2] = c.b;
        tBuf[idx + 3] = 255;
    }
}
writePNG(mockTilesetPath, tW, tH, tBuf);
fs.writeFileSync(mockTilesetScPath, JSON.stringify({
    scaleClass: 'TERRAIN_TILE_48',
    intendedNativeWidth: 192,
    intendedNativeHeight: 192,
    paletteMode: 'MASTER'
}, null, 2), 'utf8');

// Run art_check on this 45-color tileset sheet
const tilesetReport = checkFile(mockTilesetPath, { sidecar: true, type: 'tileset' });
const palCheck = tilesetReport.checks.find(c => c.name === 'palette');
assert(palCheck && palCheck.status === 'PASS',
    `Tileset sheet with 45 colors PASSES palette check (policy change: no blind 32-color sheet cap; got ${palCheck ? palCheck.status : 'null'})`);
assert(palCheck && palCheck.detail.includes('compliant with DEUS Master Palette'),
    `Tileset detail confirms master palette compliance: "${palCheck.detail}"`);

// -----------------------------------------------------------------------------
// 8. STRICT QC: UNREGISTERED RGB COLOR REJECTION
// -----------------------------------------------------------------------------
console.log('\n--- 8. Strict QC: Unregistered RGB Color Rejection ---');
const badTilesetPath = path.join(tempDir, 'T_BadColorTileset.png');
const badTilesetScPath = path.join(tempDir, 'T_BadColorTileset.json');
const badBuf = Buffer.from(tBuf);

// Inject arbitrary unregistered neon magenta #FF00FF into tile (0,0)
badBuf[0] = 255; badBuf[1] = 0; badBuf[2] = 255; badBuf[3] = 255;
writePNG(badTilesetPath, tW, tH, badBuf);
fs.writeFileSync(badTilesetScPath, JSON.stringify({
    scaleClass: 'TERRAIN_TILE_48',
    intendedNativeWidth: 192,
    intendedNativeHeight: 192,
    paletteMode: 'MASTER'
}, null, 2), 'utf8');

const badReport = checkFile(badTilesetPath, { sidecar: true, type: 'tileset' });
const badPalCheck = badReport.checks.find(c => c.name === 'palette');
assert(badPalCheck && badPalCheck.status === 'FAIL',
    `Tileset with unregistered RGB color #FF00FF FAILS strict palette check (got ${badPalCheck ? badPalCheck.status : 'null'})`);
assert(badPalCheck && badPalCheck.detail.includes('outside DEUS Master Palette'),
    `Rejection message cites unregistered color: "${badPalCheck ? badPalCheck.detail : ''}"`);

// -----------------------------------------------------------------------------
// 9. REGISTERED VFX EXCEPTION
// -----------------------------------------------------------------------------
console.log('\n--- 9. Registered VFX Exception ---');
const vfxPath = path.join(tempDir, 'VFX_SpellEffect.png');
const vfxScPath = path.join(tempDir, 'VFX_SpellEffect.json');
writePNG(vfxPath, 96, 96, badBuf.slice(0, 96 * 96 * 4));
fs.writeFileSync(vfxScPath, JSON.stringify({
    paletteMode: 'VFX',
    alphaMode: 'VFX',
    intendedNativeWidth: 96,
    intendedNativeHeight: 96
}, null, 2), 'utf8');

const vfxReport = checkFile(vfxPath, { sidecar: true, type: 'object' });
const vfxPalCheck = vfxReport.checks.find(c => c.name === 'palette');
assert(vfxPalCheck && vfxPalCheck.status === 'PASS',
    `VFX asset with arbitrary colors PASSES via explicit VFX exception (got ${vfxPalCheck ? vfxPalCheck.status : 'null'})`);
assert(vfxPalCheck && vfxPalCheck.detail.includes('vfx exception'),
    `Detail confirms VFX exception: "${vfxPalCheck ? vfxPalCheck.detail : ''}"`);

// Clean up scratch files
try {
    fs.unlinkSync(mockTilesetPath);
    fs.unlinkSync(mockTilesetScPath);
    fs.unlinkSync(badTilesetPath);
    fs.unlinkSync(badTilesetScPath);
    fs.unlinkSync(vfxPath);
    fs.unlinkSync(vfxScPath);
} catch (e) {}

// -----------------------------------------------------------------------------
// 10. DETERMINISTIC PALETTE BOARD GRAPHIC
// -----------------------------------------------------------------------------
console.log('\n--- 10. Deterministic Palette Reference Board ---');
const BOARD_PATH = path.resolve(__dirname, '..', 'art', 'reference', 'DEUS_PALETTE_BOARD_V1.png');
assert(fs.existsSync(BOARD_PATH), 'DEUS_PALETTE_BOARD_V1.png exists in art/reference/');

const { readPNG } = require('./png_read');
const boardImg = readPNG(BOARD_PATH);
assert(boardImg.width === 1480, `Board width is exact 1480 px (got ${boardImg.width})`);
assert(boardImg.height === 1440, `Board height is exact 1440 px (got ${boardImg.height})`);
assert(boardImg.data.length === 1480 * 1440 * 4, 'Board raw RGBA buffer is fully intact');

// -----------------------------------------------------------------------------
// 11. PALETTE RESOLVER TOOLING
// -----------------------------------------------------------------------------
console.log('\n--- 11. Palette Resolver Tooling (tools/palette_resolver.js) ---');
const { resolveRamp, resolveBiome, resolveMaterial, resolvePair } = require('./palette_resolver');

const testRamp = resolveRamp('TEMP_GRASS_FERTILE');
assert(testRamp !== null && testRamp.rampId === 'TEMP_GRASS_FERTILE', 'Resolver API: resolves TEMP_GRASS_FERTILE');
assert(testRamp.colorCount === 5, 'Resolver API: TEMP_GRASS_FERTILE has 5 tones');

const testBiome = resolveBiome('TEMP');
assert(Array.isArray(testBiome) && testBiome.length >= 8, `Resolver API: resolves TEMP biome (${testBiome.length} ramps)`);

const testStone = resolveMaterial('STONE');
assert(Array.isArray(testStone) && testStone.length >= 8, `Resolver API: resolves STONE material family (${testStone.length} ramps)`);

const testPair = resolvePair('TEMP', 'ARID');
assert(testPair !== null && testPair.pairKey === 'TEMP_ARID', 'Resolver API: resolves TEMP_ARID transition pair');
assert(testPair.bridgeTones.length >= 4, 'Resolver API: transition pair provides bridge tones');

// CLI invocation test
try {
    const cliOut = cp.execSync('node tools/palette_resolver.js TEMP_SOIL_LOAM', { encoding: 'utf8' });
    assert(cliOut.includes('TEMP_SOIL_LOAM'), 'Resolver CLI: output includes ramp header');
    assert(cliOut.includes('TEMP_LOAM_01'), 'Resolver CLI: output includes master color IDs');
} catch (e) {
    assert(false, `Resolver CLI execution failed: ${e.message}`);
}

try {
    cp.execSync('node tools/palette_resolver.js NONEXISTENT_RAMP_XYZ', { stdio: 'pipe' });
    assert(false, 'Resolver CLI should exit with error on unknown ramp');
} catch (e) {
    assert(true, 'Resolver CLI exits with error code on unknown ramp');
}

// -----------------------------------------------------------------------------
// 12. CANONICAL ART LANGUAGE AUDIT & VARIABLE RAMP LENGTH DISTRIBUTION
// -----------------------------------------------------------------------------
console.log('\n--- 12. Canonical Art Language Audit & Ramp Length Distribution ---');

// Check variable ramp lengths
let count3 = 0, count4 = 0, count5 = 0, count6 = 0;
for (const ramp of Object.values(ramps)) {
    if (ramp.colorCount === 3) count3++;
    else if (ramp.colorCount === 4) count4++;
    else if (ramp.colorCount === 5) count5++;
    else if (ramp.colorCount === 6) count6++;
}
assert(count3 >= 1, `Palette contains 3-tone compact ramps (found ${count3})`);
assert(count4 >= 5, `Palette contains 4-tone variable length ramps (found ${count4}, expected >= 5)`);
assert(count5 >= 40, `Palette contains 5-tone standard ramps (found ${count5}, expected >= 40)`);

// Audit canonical files for zero occurrences of 'chibi'
const canonicalFilesToAudit = [
    'docs/art/DEUS_PALETTE_ARCHITECTURE_STANDARD.md',
    'docs/art/DEUS_PaletteRegistry.json',
    'game/data/DEUS_PaletteRegistry.json',
    'tools/palette_resolver.js',
    'tools/scale_resolver.js',
    'tools/biome_resolver.js',
    'tools/build_palette_registry.js',
    'tools/build_palette_board.js',
    'docs/art/DEUS_WORLD_WBS.md'
];

let chibiViolations = 0;
const chibiRegex = /\bchibi\b/i;

for (const relPath of canonicalFilesToAudit) {
    const fullPath = path.join(__dirname, '..', relPath);
    if (!fs.existsSync(fullPath)) {
        assert(false, `Canonical audit file missing: ${relPath}`);
        continue;
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    const match = content.match(chibiRegex);
    if (match) {
        chibiViolations++;
        console.error(`  Violation: forbidden term 'chibi' detected in ${relPath}`);
    }
}

assert(chibiViolations === 0, `Canonical art documents and resolvers have 0 occurrences of 'chibi' (violations: ${chibiViolations})`);

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n==================================================');
console.log(`TOTAL CHECKS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log('==================================================\n');

if (failed > 0) {
    console.error('PALETTE STANDARD VERIFICATION FAILED.');
    process.exit(1);
} else {
    console.log('ALL PALETTE STANDARD CHECKS PASSED (DW.01.05).');
    process.exit(0);
}
