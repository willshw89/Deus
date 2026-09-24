#!/usr/bin/env node
'use strict';

/**
 * tools/biome_resolver.js
 *
 * Mechanical Biome Identity Resolver for Project DEUS (DW.01.04).
 * Resolves declared biome IDs into deterministic prompt injection
 * conditioning blocks and horizontal transition bridge specifications.
 *
 * Usage:
 *   node tools/biome_resolver.js <BIOME_ID>
 *   node tools/biome_resolver.js --list
 *   node tools/biome_resolver.js --pair <BIOME_A> <BIOME_B>
 *   node tools/biome_resolver.js --all-pairs
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.resolve(__dirname, '..', 'game', 'data', 'DEUS_BiomeRegistry.json');

function loadBiomeRegistry() {
    if (!fs.existsSync(REGISTRY_PATH)) {
        throw new Error(`Biome registry not found at ${REGISTRY_PATH}`);
    }
    return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
}

const ALIASES = {
    'TEMPERATE': 'TEMP',
    'VERDANT': 'TEMP',
    'WETLAND': 'WET',
    'RIVERLAND': 'WET',
    'SWAMP': 'WET',
    'MARSH': 'WET',
    'STEPPE': 'ARID',
    'DESERT': 'ARID',
    'HIGHLAND': 'HIGH',
    'MOUNTAIN': 'HIGH',
    'VOLCANIC': 'VOLC',
    'ASHLAND': 'VOLC'
};

function normalizeBiomeId(rawId) {
    if (!rawId) return null;
    const up = rawId.toUpperCase().trim();
    if (ALIASES[up]) return ALIASES[up];
    return up;
}

function resolveBiome(rawId) {
    const registry = loadBiomeRegistry();
    const id = normalizeBiomeId(rawId);
    const entry = registry.biomes[id];
    if (!entry) return null;

    const promptBlock = [
        `=== CANONICAL BIOME SPECIFICATION (${entry.biomeId} — ${entry.displayName}) ===`,
        `DOMINANT GROUND: ${entry.dominantGround}`,
        `EXPOSED SOIL: ${entry.exposedSoil}`,
        `GEOLOGY: ${entry.geology}`,
        `MOISTURE & DRAINAGE: ${entry.moisture} (${entry.drainage})`,
        `VEGETATION DENSITY: Grass [${entry.vegetationDensity.grass}], Shrubs [${entry.vegetationDensity.shrubs}], Trees [${entry.vegetationDensity.trees}], Low Flora [${entry.vegetationDensity.lowFlora}], Debris [${entry.vegetationDensity.debris}]`,
        `VEGETATION FORM: ${entry.vegetationForm}`,
        `TREE VOCABULARY: ${entry.treeVocabulary.join(', ')}`,
        `SHRUB VOCABULARY: ${entry.shrubVocabulary.join(', ')}`,
        `LOW FLORA VOCABULARY: ${entry.lowFloraVocabulary.join(', ')}`,
        `ROCK OUTCROPS: ${entry.rockOutcropVocabulary.join(', ')}`,
        `DEBRIS & CLUTTER: ${entry.debrisVocabulary.join(', ')}`,
        `WATER EDGE BEHAVIOR: ${entry.waterEdgeBehavior}`,
        `ELEVATION CHARACTER: ${entry.elevationCharacter}`,
        `ATMOSPHERIC FEEL: ${entry.atmosphericCharacter}`,
        `SIGNATURE MATERIALS: ${entry.signatureMaterials.join(', ')}`,
        `SHARED MATERIALS: ${entry.sharedMaterials.join(', ')}`,
        `FORBIDDEN VISUAL CUES: ${entry.forbiddenCues.join(', ')}`,
        `VERTICAL CONTINUITY HOOKS:`,
        `  Z+2 (Highest/Exposed): ${entry.verticalHooks['Z+2']}`,
        `  Z+1 (Upland/Terrace):   ${entry.verticalHooks['Z+1']}`,
        `  Z0  (Canonical Surface): ${entry.verticalHooks['Z0']}`,
        `  Z-1 (Substrate/Roots): ${entry.verticalHooks['Z-1']}`,
        `  Z-2 (Bedrock/Caverns): ${entry.verticalHooks['Z-2']}`,
        `NOTES: ${entry.notes}`
    ].join('\n');

    return {
        biomeId: entry.biomeId,
        displayName: entry.displayName,
        dominantGround: entry.dominantGround,
        exposedSoil: entry.exposedSoil,
        geology: entry.geology,
        moisture: entry.moisture,
        drainage: entry.drainage,
        vegetationDensity: entry.vegetationDensity,
        vegetationForm: entry.vegetationForm,
        treeVocabulary: entry.treeVocabulary,
        shrubVocabulary: entry.shrubVocabulary,
        lowFloraVocabulary: entry.lowFloraVocabulary,
        rockOutcropVocabulary: entry.rockOutcropVocabulary,
        debrisVocabulary: entry.debrisVocabulary,
        waterEdgeBehavior: entry.waterEdgeBehavior,
        elevationCharacter: entry.elevationCharacter,
        atmosphericCharacter: entry.atmosphericCharacter,
        signatureMaterials: entry.signatureMaterials,
        sharedMaterials: entry.sharedMaterials,
        forbiddenCues: entry.forbiddenCues,
        verticalHooks: entry.verticalHooks,
        notes: entry.notes,
        promptInjectionBlock: promptBlock
    };
}

function resolveTransition(rawA, rawB) {
    const registry = loadBiomeRegistry();
    const a = normalizeBiomeId(rawA);
    const b = normalizeBiomeId(rawB);
    if (!a || !b) return null;

    const key1 = `${a}_${b}`;
    const key2 = `${b}_${a}`;
    const t = registry.horizontalTransitions[key1] || registry.horizontalTransitions[key2];
    if (!t) return null;

    const promptBlock = [
        `=== CANONICAL BIOME TRANSITION AXES (${t.pair}) ===`,
        `GRASS DENSITY AXIS: ${t.grassDensity}`,
        `SOIL TRANSITION AXIS: ${t.soilTransition}`,
        `GEOLOGY TRANSITION AXIS: ${t.geologyTransition}`,
        `MOISTURE TRANSITION AXIS: ${t.moistureTransition}`,
        `VEGETATION FORM AXIS: ${t.vegetationForm}`,
        `TOPOGRAPHY AXIS: ${t.topography}`
    ].join('\n');

    return {
        pairKey: key1 in registry.horizontalTransitions ? key1 : key2,
        pair: t.pair,
        grassDensity: t.grassDensity,
        soilTransition: t.soilTransition,
        geologyTransition: t.geologyTransition,
        moistureTransition: t.moistureTransition,
        vegetationForm: t.vegetationForm,
        topography: t.topography,
        promptInjectionBlock: promptBlock
    };
}

function listBiomes() {
    const registry = loadBiomeRegistry();
    return Object.values(registry.biomes).map(b => ({
        id: b.biomeId,
        displayName: b.displayName,
        moisture: b.moisture,
        dominantGround: b.dominantGround,
        geology: b.geology,
        signatures: b.signatureMaterials.slice(0, 3).join(', ')
    }));
}

function listTransitions() {
    const registry = loadBiomeRegistry();
    return Object.entries(registry.horizontalTransitions).map(([k, v]) => ({
        key: k,
        pair: v.pair,
        moisture: v.moistureTransition,
        soil: v.soilTransition
    }));
}

function main() {
    const args = process.argv.slice(2);
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        console.log('Usage: node tools/biome_resolver.js <BIOME_ID>');
        console.log('       node tools/biome_resolver.js --list');
        console.log('       node tools/biome_resolver.js --pair <BIOME_A> <BIOME_B>');
        console.log('       node tools/biome_resolver.js --all-pairs');
        process.exit(0);
    }

    if (args.includes('--list')) {
        const biomes = listBiomes();
        console.log(`\n=== DEUS CANONICAL BIOMES: ${biomes.length} REGISTERED ===\n`);
        console.table(biomes);
        process.exit(0);
    }

    if (args.includes('--all-pairs')) {
        const transitions = listTransitions();
        console.log(`\n=== DEUS HORIZONTAL BIOME TRANSITION PAIRS: ${transitions.length} REGISTERED ===\n`);
        console.table(transitions);
        process.exit(0);
    }

    const pairIdx = args.indexOf('--pair');
    if (pairIdx !== -1) {
        let b1 = args[pairIdx + 1];
        let b2 = args[pairIdx + 2];
        if (b1 && b1.includes('_') && !b2) {
            const parts = b1.split('_');
            b1 = parts[0];
            b2 = parts[1];
        }
        if (!b1 || !b2) {
            console.error('ERROR: --pair requires two biome IDs (e.g. node tools/biome_resolver.js --pair TEMP ARID)');
            process.exit(1);
        }
        const transition = resolveTransition(b1, b2);
        if (!transition) {
            console.error(`ERROR: Unknown biome transition pair '${b1}' <-> '${b2}'.`);
            process.exit(1);
        }
        console.log(transition.promptInjectionBlock);
        process.exit(0);
    }

    const targetBiome = args[0];
    const resolved = resolveBiome(targetBiome);
    if (!resolved) {
        console.error(`ERROR: Unknown biome ID '${targetBiome}'.`);
        console.error(`Run 'node tools/biome_resolver.js --list' to view canonical biomes.`);
        process.exit(1);
    }

    console.log(resolved.promptInjectionBlock);
    process.exit(0);
}

module.exports = {
    loadBiomeRegistry,
    resolveBiome,
    resolveTransition,
    listBiomes,
    listTransitions
};

if (require.main === module) {
    main();
}
