#!/usr/bin/env node
'use strict';

/**
 * tools/palette_resolver.js
 *
 * Deterministic Palette and Material Ramp Resolver for Project DEUS (DW.01.05).
 * Resolves color ramps, biome palettes, transition bridges, and prompt-conditioning
 * color blocks for Nano Banana Pro and engine tooling.
 *
 * Usage:
 *   node tools/palette_resolver.js TEMP_GRASS_FERTILE
 *   node tools/palette_resolver.js --biome TEMP
 *   node tools/palette_resolver.js --material STONE
 *   node tools/palette_resolver.js --pair TEMP ARID
 *   node tools/palette_resolver.js --list-ramps
 *   node tools/palette_resolver.js --master
 *   node tools/palette_resolver.js --budget
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.resolve(__dirname, '..', 'game', 'data', 'DEUS_PaletteRegistry.json');

let _registry = null;

function loadRegistry() {
    if (_registry) return _registry;
    if (!fs.existsSync(REGISTRY_PATH)) {
        throw new Error(`Palette registry not found at ${REGISTRY_PATH}. Run tools/build_palette_registry.js first.`);
    }
    _registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
    return _registry;
}

function resolveRamp(rampId) {
    const reg = loadRegistry();
    const idUpper = rampId.toUpperCase();
    const ramp = reg.ramps[idUpper];
    if (!ramp) {
        // Try fuzzy or partial search
        const matches = Object.keys(reg.ramps).filter(k => k.includes(idUpper));
        if (matches.length === 1) {
            return reg.ramps[matches[0]];
        }
        return null;
    }
    return ramp;
}

function resolveBiome(biomeId) {
    const reg = loadRegistry();
    const bUpper = biomeId.toUpperCase();
    const results = [];
    for (const [id, ramp] of Object.entries(reg.ramps)) {
        if (ramp.biomeAffinity.includes(bUpper) || ramp.biomeAffinity.includes('UNIVERSAL')) {
            results.push(ramp);
        }
    }
    return results;
}

function resolveMaterial(materialFamily) {
    const reg = loadRegistry();
    const mUpper = materialFamily.toUpperCase();
    const results = [];
    for (const [id, ramp] of Object.entries(reg.ramps)) {
        if (ramp.materialFamily.toUpperCase() === mUpper) {
            results.push(ramp);
        }
    }
    return results;
}

function resolvePair(biomeA, biomeB) {
    const reg = loadRegistry();
    const a = biomeA.toUpperCase();
    const b = biomeB.toUpperCase();
    const key1 = `${a}_${b}`;
    const key2 = `${b}_${a}`;
    const bridge = reg.transitionBridges[key1] || reg.transitionBridges[key2];
    if (!bridge) return null;
    return {
        pairKey: reg.transitionBridges[key1] ? key1 : key2,
        ...bridge
    };
}

function formatRampBlock(ramp) {
    const lines = [];
    lines.push(`=== RAMP: ${ramp.rampId} (${ramp.materialFamily} | Biome: ${ramp.biomeAffinity.join(', ')}) ===`);
    lines.push(`USAGE: ${ramp.preferredUsage}`);
    if (ramp.forbiddenUsage) lines.push(`FORBIDDEN: ${ramp.forbiddenUsage}`);
    lines.push(`TONES (${ramp.colorCount}):`);
    for (let i = 0; i < ramp.colorCount; i++) {
        const id = ramp.colorIds[i];
        const hex = ramp.hexColors[i];
        const role = ramp.toneRoles[i];
        lines.push(`  [${role.padEnd(12)}] ${hex.padEnd(9)} (${id})`);
    }
    lines.push(`NOTES: ${ramp.notes}`);
    return lines.join('\n');
}

// -----------------------------------------------------------------------------
// CLI HANDLER
// -----------------------------------------------------------------------------
function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log(`DEUS Palette & Material Ramp Resolver (DW.01.05)
Usage:
  node tools/palette_resolver.js <RAMP_ID>
  node tools/palette_resolver.js --biome <BIOME_ID>
  node tools/palette_resolver.js --material <FAMILY>
  node tools/palette_resolver.js --pair <BIOME_A> <BIOME_B>
  node tools/palette_resolver.js --list-ramps
  node tools/palette_resolver.js --master
  node tools/palette_resolver.js --budget
`);
        process.exit(0);
    }

    const reg = loadRegistry();

    if (args[0] === '--list-ramps') {
        console.log(`=== DEUS CANONICAL MATERIAL RAMPS (${reg.totalRampsCount} total) ===\n`);
        const byFam = {};
        for (const [id, r] of Object.entries(reg.ramps)) {
            if (!byFam[r.materialFamily]) byFam[r.materialFamily] = [];
            byFam[r.materialFamily].push(r);
        }
        for (const [fam, list] of Object.entries(byFam)) {
            console.log(`-- ${fam} (${list.length} ramps) --`);
            for (const r of list) {
                console.log(`  ${r.rampId.padEnd(26)} [${r.colorCount} tones] -> ${r.hexColors.join(' ')}`);
            }
            console.log('');
        }
        return;
    }

    if (args[0] === '--master') {
        console.log(`=== DEUS MASTER WORLD PALETTE SUMMARY ===`);
        console.log(`Master Active Colors:  ${reg.masterColorCount} (Target: 220–240)`);
        console.log(`Reserved Headroom:     ${reg.reservedCapacity} slots (Ceiling: ${reg.canonicalCeiling}, Min: >= 16)`);
        console.log(`Total Ramps:           ${reg.totalRampsCount}`);
        console.log(`Total Ramp Slots:      ${reg.totalRampSlotsCount}`);
        console.log(`Policy:                ${reg.policy.sheetCapPolicy}`);
        console.log(`Near-Duplicates (<4):${reg.nearDuplicatesReport.length} (Audited intentional material distinctions)`);
        return;
    }

    if (args[0] === '--budget') {
        console.log(`=== DEUS COLOR BUDGET GUIDELINES (NO BLIND 32-COLOR SHEET CAP) ===\n`);
        for (const [k, b] of Object.entries(reg.colorBudgets)) {
            console.log(`[${b.assetClass}]`);
            console.log(`  Typical Tones:   ${b.typicalTones}`);
            console.log(`  Max Colors:      ${b.maxUniqueColors || 'N/A (Container Union)'}`);
            console.log(`  Guidance:        ${b.guidance}\n`);
        }
        return;
    }

    if (args[0] === '--biome') {
        const biome = args[1];
        if (!biome) {
            console.error('Error: specify biome ID (e.g. TEMP, WET, ARID, HIGH, VOLC)');
            process.exit(1);
        }
        const ramps = resolveBiome(biome);
        console.log(`=== BIOME PALETTE SPECIFICATION: ${biome.toUpperCase()} (${ramps.length} ramps) ===\n`);
        for (const r of ramps) {
            console.log(formatRampBlock(r));
            console.log('');
        }
        return;
    }

    if (args[0] === '--material') {
        const mat = args[1];
        if (!mat) {
            console.error('Error: specify material family (e.g. GRASS, SOIL, STONE, WOOD_BARK, FOLIAGE, WATER, CONSTRUCTION, SUPERNATURAL)');
            process.exit(1);
        }
        const ramps = resolveMaterial(mat);
        console.log(`=== MATERIAL FAMILY SPECIFICATION: ${mat.toUpperCase()} (${ramps.length} ramps) ===\n`);
        for (const r of ramps) {
            console.log(formatRampBlock(r));
            console.log('');
        }
        return;
    }

    if (args[0] === '--pair') {
        const a = args[1];
        const b = args[2];
        if (!a || !b) {
            console.error('Error: specify two biomes (e.g. --pair TEMP ARID)');
            process.exit(1);
        }
        const bridge = resolvePair(a, b);
        if (!bridge) {
            console.error(`Error: no transition bridge registered between ${a} and ${b}`);
            process.exit(1);
        }
        console.log(`=== HORIZONTAL TRANSITION BRIDGE: ${bridge.pairKey} ===`);
        console.log(`NOTES: ${bridge.notes}`);
        console.log(`PRIMARY BRIDGE RAMPS: ${bridge.primaryBridgeRamps.join(', ')}`);
        console.log(`BRIDGE TONES:         ${bridge.bridgeTones.join(' ')}\n`);
        for (const rId of bridge.primaryBridgeRamps) {
            const ramp = resolveRamp(rId);
            if (ramp) {
                console.log(`  [${ramp.rampId}] (${ramp.materialFamily}): ${ramp.hexColors.join(' ')}`);
            }
        }
        return;
    }

    // Default: query ramp ID
    const ramp = resolveRamp(args[0]);
    if (!ramp) {
        console.error(`Error: ramp "${args[0]}" not found in registry.`);
        process.exit(1);
    }
    console.log(formatRampBlock(ramp));
}

module.exports = {
    loadRegistry,
    resolveRamp,
    resolveBiome,
    resolveMaterial,
    resolvePair,
    formatRampBlock
};

if (require.main === module) {
    main();
}
