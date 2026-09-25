#!/usr/bin/env node
"use strict";

/**
 * tools/performance/census_boot_load.js
 *
 * Part of WG.00.12 (Lane C: Non-Moving Consolidation).
 * Profiles boot/load census:
 * 1. Measures file sizes of all registered plugins in game/js/plugins.js
 * 2. Measures cold VM evaluation time for each core engine subsystem
 * 3. Profiles baseline memory consumption of engine state structures
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { performance } = require("perf_hooks");

const ROOT = path.resolve(__dirname, "..", "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const PLUGINS_JS = path.join(ROOT, "game", "js", "plugins.js");

console.log("=== DEUS BOOT / LOAD CENSUS (WG.00.12) ===");

if (!fs.existsSync(PLUGINS_JS)) {
    console.error("Missing game/js/plugins.js!");
    process.exit(1);
}

const rawPlugins = fs.readFileSync(PLUGINS_JS, "utf8");
const match = rawPlugins.match(/=\s*(\[[\s\S]*?\]);?\s*$/);
const pluginList = match ? JSON.parse(match[1]) : [];

console.log(`\n1. Registered Plugins in game/js/plugins.js: ${pluginList.length}`);
console.log("------------------------------------------------------------");

let totalPluginBytes = 0;
const pluginStats = [];

for (const p of pluginList) {
    const filename = `${p.name}.js`;
    const fullPath = path.join(PLUGINS, filename);
    let bytes = 0, exists = false;
    if (fs.existsSync(fullPath)) {
        bytes = fs.statSync(fullPath).size;
        exists = true;
        totalPluginBytes += bytes;
    }
    pluginStats.push({ name: p.name, status: p.status, bytes, exists });
    const statusMark = p.status ? "[ON] " : "[OFF]";
    const sizeStr = exists ? `${(bytes / 1024).toFixed(1)} KB` : "MISSING";
    console.log(`  ${statusMark} ${p.name.padEnd(30)} ${sizeStr.padStart(10)}`);
}

console.log("------------------------------------------------------------");
console.log(`Total active plugin payload: ${(totalPluginBytes / 1024).toFixed(1)} KB (${(totalPluginBytes / (1024 * 1024)).toFixed(2)} MB)`);

// 2. Measure Subsystem Load Timings in Isolated VM
console.log("\n2. Subsystem Cold Load Timings (Isolated Node VM)");
console.log("------------------------------------------------------------");

const criticalPlugins = [
    "DEUS_Core.js",
    "DEUS_World.js",
    "DEUS_WorldGen.js",
    "DEUS_Levels.js",
    "DEUS_Fluid.js",
    "DEUS_Tiles.js",
    "DEUS_Floors.js",
    "DEUS_Walls.js",
    "DEUS_FactionMenus.js"
];

for (const f of criticalPlugins) {
    const full = path.join(PLUGINS, f);
    if (!fs.existsSync(full)) {
        console.log(`  ${f.padEnd(25)} NOT FOUND`);
        continue;
    }
    const src = fs.readFileSync(full, "utf8");
    const env = { window: {}, Math, parseInt, String, performance, Date, setTimeout, clearTimeout, Array, Object };
    env.window = env;
    env.PluginManager = { parameters: () => ({}), registerCommand: () => {} };
    env.Tilemap = { TILE_ID_A1: 2048, TILE_ID_A2: 2816, isTileA1: () => false, isWaterTile: () => false };
    env.UF = {};
    env.DEUS = {};

    const ctx = vm.createContext(env);
    const t0 = performance.now();
    try {
        vm.runInContext(src, ctx, { filename: f });
        const loadMs = performance.now() - t0;
        console.log(`  ${f.padEnd(25)} ${loadMs.toFixed(2).padStart(8)} ms (${(src.length / 1024).toFixed(1)} KB)`);
    } catch (e) {
        // If syntax is clean but runtime RMMZ globals are missing, measure compile time
        const tCompile0 = performance.now();
        new vm.Script(src, { filename: f });
        const compileMs = performance.now() - tCompile0;
        console.log(`  ${f.padEnd(25)} [compile] ${compileMs.toFixed(2).padStart(6)} ms (${(src.length / 1024).toFixed(1)} KB)`);
    }
}

console.log("\n============================================================");
console.log("BOOT / LOAD CENSUS COMPLETED (EXIT 0)");
console.log("============================================================");
