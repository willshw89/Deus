#!/usr/bin/env node
'use strict';

/**
 * tools/scale_resolver.js
 *
 * Mechanical Scale Resolver for Project DEUS (DW.01.03).
 * Resolves declared asset scale classes into deterministic prompt injection
 * parameters and automated QC envelope boundaries.
 *
 * Usage:
 *   node tools/scale_resolver.js <ASSET_CLASS>
 *   node tools/scale_resolver.js --list
 *   node tools/scale_resolver.js --category <CATEGORY>
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.resolve(__dirname, '..', 'game', 'data', 'DEUS_ScaleRegistry.json');

function loadRegistry() {
    if (!fs.existsSync(REGISTRY_PATH)) {
        throw new Error(`Scale registry not found at ${REGISTRY_PATH}`);
    }
    return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
}

function resolveScaleClass(className) {
    const registry = loadRegistry();
    const entry = registry.classes[className];
    if (!entry) {
        return null;
    }

    const humanH = registry.canonicalHumanHeightPx;
    const ratioToHuman = (entry.visualHeightTarget / humanH).toFixed(2);

    const promptInjection = [
        `=== CANONICAL SCALE SPECIFICATION (${className}) ===`,
        `YARDSTICK REFERENCE: Canonical Adult Human is ~${humanH} native rendered pixels tall.`,
        `TARGET VISUAL ENVELOPE: ${entry.visualWidthTarget} px wide × ${entry.visualHeightTarget} px tall.`,
        `PERMITTED TOLERANCE: Width [${entry.visualWidthMin}-${entry.visualWidthMax} px], Height [${entry.visualHeightMin}-${entry.visualHeightMax} px].`,
        `PROPORTION TO HUMAN: Approximately ${ratioToHuman}x Adult Human height.`,
        `GAMEPLAY FOOTPRINT: ${entry.footprintWidthTiles}×${entry.footprintHeightTiles} tiles (${entry.footprintWidthTiles * registry.worldTileSizePx}×${entry.footprintHeightTiles * registry.worldTileSizePx} px).`,
        `GROUND ANCHOR: ${entry.anchorType}.`,
        `TILE OVERHANG: ${entry.overhangAllowed ? 'PERMITTED (canopy/features may overhang footprint)' : 'STRICTLY CONTAINED WITHIN FOOTPRINT'}.`,
        `PIXEL DENSITY: 1:1 Native Resolution (1 source art pixel = 1 rendered screen pixel at 1.00x camera).`,
        `NOTES: ${entry.notes}`
    ].join('\n');

    return {
        assetClass: className,
        category: entry.category,
        visualEnvelope: {
            width: { min: entry.visualWidthMin, target: entry.visualWidthTarget, max: entry.visualWidthMax },
            height: { min: entry.visualHeightMin, target: entry.visualHeightTarget, max: entry.visualHeightMax }
        },
        footprint: {
            widthTiles: entry.footprintWidthTiles,
            heightTiles: entry.footprintHeightTiles,
            pixelDimensions: `${entry.footprintWidthTiles * registry.worldTileSizePx}x${entry.footprintHeightTiles * registry.worldTileSizePx}`
        },
        anchor: entry.anchorType,
        overhangAllowed: entry.overhangAllowed,
        humanReferenceHeight: humanH,
        ratioToHuman: parseFloat(ratioToHuman),
        notes: entry.notes,
        promptInjectionBlock: promptInjection
    };
}

function listClasses(categoryFilter = null) {
    const registry = loadRegistry();
    const results = [];
    for (const [k, v] of Object.entries(registry.classes)) {
        if (!categoryFilter || v.category === categoryFilter.toUpperCase()) {
            results.push({
                class: k,
                category: v.category,
                target: `${v.visualWidthTarget}x${v.visualHeightTarget} px`,
                range: `${v.visualWidthMin}-${v.visualWidthMax}W × ${v.visualHeightMin}-${v.visualHeightMax}H`,
                footprint: `${v.footprintWidthTiles}x${v.footprintHeightTiles}T`,
                notes: v.notes
            });
        }
    }
    return results;
}

function main() {
    const args = process.argv.slice(2);
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        console.log('Usage: node tools/scale_resolver.js <ASSET_CLASS>');
        console.log('       node tools/scale_resolver.js --list');
        console.log('       node tools/scale_resolver.js --category <CATEGORY>');
        process.exit(0);
    }

    if (args.includes('--list')) {
        const classes = listClasses();
        console.log(`\n=== DEUS SCALE REGISTRY: ${classes.length} REGISTERED CLASSES ===\n`);
        console.table(classes);
        process.exit(0);
    }

    const catIdx = args.indexOf('--category');
    if (catIdx !== -1 && args[catIdx + 1]) {
        const cat = args[catIdx + 1];
        const classes = listClasses(cat);
        console.log(`\n=== DEUS SCALE REGISTRY [CATEGORY: ${cat.toUpperCase()}]: ${classes.length} CLASSES ===\n`);
        console.table(classes);
        process.exit(0);
    }

    const targetClass = args[0].toUpperCase();
    const resolved = resolveScaleClass(targetClass);
    if (!resolved) {
        console.error(`ERROR: Unknown asset scale class '${targetClass}'.`);
        console.error(`Run 'node tools/scale_resolver.js --list' to view available classes.`);
        process.exit(1);
    }

    console.log(resolved.promptInjectionBlock);
    process.exit(0);
}

module.exports = {
    loadRegistry,
    resolveScaleClass,
    listClasses
};

if (require.main === module) {
    main();
}
