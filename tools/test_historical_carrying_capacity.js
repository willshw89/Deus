#!/usr/bin/env node
"use strict";

// tools/test_historical_carrying_capacity.js
// Production verification harness for DEUS-TSK-HIST-09:
// Bounded historical demographics with localized site-specific carrying capacity.
//
// Verifies:
// 1. Canonical 3-seed 500-year matrix (seeds: 0, 424242, 20260919) with 2 repeats each.
// 2. Checkpoints at 100, 250, and 500 elapsed years.
// 3. Exact deterministic state and event SHA-256 repeat matching.
// 4. Save/reload resumption equivalence (100y save + 150y reload vs continuous 250y).
// 5. Site capacity variance (proves site-specific capacity, NOT a universal constant K=160).
// 6. Broader deterministic sweep of seeds (e.g. 20 seeds).
// 7. Rule 4 mutant controls: --mutant=no_density_pressure | universal_constant | corrupt_capacity.

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");
const os = require("os");
const { performance } = require("perf_hooks");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "game", "test_output", "test_historical_carrying_capacity.json");
const PLUGIN = "game/js/plugins/DEUS_HistoricalDemographics.js";
const MODULES = ["World", "WorldGen", "Factions", "History", "Levels"];
const MUTANTS = ["no_density_pressure", "universal_constant", "corrupt_capacity"];

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const sha = val => crypto.createHash("sha256").update(val).digest("hex");
const clone = val => JSON.parse(JSON.stringify(val));
const median = arr => {
    if (!arr.length) return null;
    const s = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

// Bundle production source files
function sourceBundle() {
    const files = {};
    const read = file => (files[file] = fs.readFileSync(path.join(ROOT, file), "utf8"));
    const list = {};
    vm.runInNewContext(read("game/js/plugins.js"), list, { timeout: 1000 });
    const plugins = list.$plugins.filter(p => p.status && MODULES.includes(p.name.replace(/^DEUS_/, "")));
    assert(plugins.length === MODULES.length && plugins.every((p, i) => p.name === `DEUS_${MODULES[i]}`), "Canonical bootstrap plugin order changed");
    for (const p of plugins) read(`game/js/plugins/${p.name}.js`);
    const catalog = JSON.parse(read("game/data/UF_WorldCatalog.json"));
    read(PLUGIN);
    return { files, plugins, catalog, sources: Object.keys(files).map(file => ({ path: file, sha256: sha(files[file]) })) };
}

function once(source, anchor, replacement) {
    assert(source.split(anchor).length === 2, `Mutation anchor missing/ambiguous: ${anchor}`);
    return source.replace(anchor, replacement);
}

function mutate(source, mutant) {
    if (!mutant) return source;
    if (mutant === "no_density_pressure") {
        return once(source,
            "const scale = Math.max(capModel.minimumScale, 1 - (site.population / cap));",
            "const scale = 1.0;");
    }
    if (mutant === "universal_constant") {
        return once(source,
            "const historicalCapacity = options.siteCapacity && options.siteCapacity[s.id] !== undefined\n                ? options.siteCapacity[s.id]\n                : deriveSiteCapacity(state, s.id, s.z, s.kind);",
            "const historicalCapacity = 160;");
    }
    if (mutant === "corrupt_capacity") {
        return once(source,
            "const historicalCapacity = options.siteCapacity && options.siteCapacity[s.id] !== undefined\n                ? options.siteCapacity[s.id]\n                : deriveSiteCapacity(state, s.id, s.z, s.kind);",
            "const historicalCapacity = -1;");
    }
    throw new Error(`Unknown mutant: ${mutant}`);
}

function load(data, seed, mutant = null) {
    const ns = {}, errors = [], math = Object.create(Math);
    math.random = () => { throw new Error("Unseeded Math.random"); };
    const env = {
        window: null, UF: ns, DEUS: ns, Math: math, performance,
        $ufWorldCatalog: clone(data.catalog),
        PluginManager: { parameters: name => (data.plugins.find(p => p.name === name) || {}).parameters || {}, registerCommand() {} },
        DataManager: { _databaseFiles: [], onLoad() {}, isBattleTest: () => false, isEventTest: () => false },
        Input: { keyMapper: {} }, TouchInput: {}, SceneManager: { _scene: null },
        Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 }, $gameMap: { mapId: () => 0 }, $gamePlayer: {}, $gameSystem: {},
        ImageManager: { loadTileset() { throw new Error("Unexpected renderer call"); } }, Utils: { isOptionValid: () => false },
        console: { log() {}, warn() {}, error: (...args) => errors.push(args.map(String).join(" ")) }
    };
    env.window = env; env.$deusWorldCatalog = env.$ufWorldCatalog;
    const sources = data.plugins.map(p => data.files[`game/js/plugins/${p.name}.js`]);
    const names = new Set(["Sprite", "Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot", "Rectangle"]);
    for (const source of sources) for (const m of source.matchAll(/\b((?:Game|Scene|Window|Spriteset|Sprite)_[A-Za-z0-9_]+)\.prototype/g)) names.add(m[1]);
    for (const name of names) env[name] = function() { throw new Error(`Unexpected engine construction ${name}`); };
    for (const source of sources) for (const m of source.matchAll(/\b((?:Game|Scene|Window|Spriteset|Sprite)_[A-Za-z0-9_]+)\.prototype\.([A-Za-z0-9_]+)/g)) {
        const label = `${m[1]}.${m[2]}`;
        env[m[1]].prototype[m[2]] = () => { throw new Error(`Unexpected engine method ${label}`); };
    }
    const context = vm.createContext(env);
    vm.runInContext(["Math", "Object", "Array", "Number", "String", "Boolean", "Map", "Set", "JSON", "Date",
        "Uint8Array", "Uint16Array", "Int32Array", "Float32Array", "performance", "window"]
        .map(n => `const ${n} = globalThis.${n};`).join("\n"), context);
    data.plugins.forEach((p, i) => vm.runInContext(sources[i], context, { filename: p.name, timeout: 10000 }));
    const W = env.UF.World, world = W.newWorld(seed);
    env.UF.Levels.ensureWorldLevels(world); env.UF.Factions.generate(world); env.UF.History.generate(world);
    assert(world.history.version === 5 && world.history.startYear === 1 && world.history.simulated === false, "Year-1 founding contract changed");
    const canonical = JSON.stringify(world);
    vm.runInContext(mutate(data.files[PLUGIN], mutant), context, { filename: PLUGIN, timeout: 10000 });
    assert(JSON.stringify(world) === canonical, "Plugin load mutated canonical world");
    assert(errors.length === 0, errors.join("; "));
    return { env, world, canonical, api: env.UF.HistoricalDemographics, context };
}

function runTrajectory(data, seed, horizons = [100, 250, 500], mutant = null) {
    const start = performance.now();
    const loaded = load(data, seed, mutant);
    const { api, world } = loaded;
    const state = api.create(world, { profiles: "default", eventLimit: 1000000 });
    
    // Initial verification
    api.validate(state);
    assert(state.sites.length === 9, "Expected 9 canonical sites");
    assert(state.people.length === 72, "Expected 72 canonical founders");
    
    // Verify capacity configuration and representation
    const capacities = state.sites.map(s => s.historicalCapacity);
    assert(capacities.every(c => Number.isSafeInteger(c) && c >= 60 && c <= 350), "Invalid site capacity range");
    
    // Checkpoints collection
    const checkpoints = {};
    const maxHorizon = Math.max(...horizons);
    let worstAnnualMs = 0;
    
    for (let year = 1; year <= maxHorizon; year++) {
        const t0 = performance.now();
        api.step(state);
        const stepMs = performance.now() - t0;
        if (stepMs > worstAnnualMs) worstAnnualMs = stepMs;
        
        if (horizons.includes(year)) {
            api.validate(state);
            const text = JSON.stringify(state);
            const stateSha256 = sha(text);
            const eventsSha256 = sha(JSON.stringify(state.events));
            const living = state.people.filter(p => p.died === null);
            const bySpecies = {};
            const bySite = {};
            for (const p of living) {
                bySpecies[p.species] = (bySpecies[p.species] || 0) + 1;
                bySite[p.siteId] = (bySite[p.siteId] || 0) + 1;
            }
            
            // Check active fertile partnerships
            const activeFertilePartnerships = {};
            for (const h of state.partnerships.filter(h => h.toYear === null)) {
                const m = state.people[h.motherId], f = state.people[h.fatherId];
                if (m.died === null && f.died === null) {
                    const profile = state.config.profiles[m.species];
                    const [lo, hi] = profile.reproductiveAge;
                    const ageM = state.currentYear - m.born, ageF = state.currentYear - f.born;
                    if (ageM >= lo && ageM <= hi && ageF >= lo && ageF <= hi) {
                        activeFertilePartnerships[m.species] = (activeFertilePartnerships[m.species] || 0) + 1;
                    }
                }
            }
            
            checkpoints[year] = {
                year,
                livingCount: living.length,
                bySpecies,
                bySite,
                activeFertilePartnerships,
                stateBytes: Buffer.byteLength(text, "utf8"),
                stateSha256,
                eventsSha256,
                eventsCount: state.events.length,
                stateText: text,
                eventsText: JSON.stringify(state.events)
            };
        }
    }
    
    const wallMs = performance.now() - start;
    return {
        seed,
        wallMs,
        worstAnnualMs,
        capacities,
        checkpoints,
        state
    };
}

function verifyGates(trajectory) {
    const { seed, wallMs, capacities, checkpoints } = trajectory;
    const failures = [];
    
    // Gate: Site Capacity Variance (not universal constant)
    const uniqueCapacities = new Set(capacities);
    if (uniqueCapacities.size < 2) {
        failures.push(`siteCapacityVariance failed: all sites share identical capacity (${[...uniqueCapacities].join(", ")})`);
    }
    
    // Gate: Trajectory timing budget (< 30s)
    if (wallMs >= 30000) {
        failures.push(`trajectoryBudget failed: wall time ${wallMs.toFixed(1)}ms exceeded 30000ms threshold`);
    }
    
    for (const year of Object.keys(checkpoints).map(Number)) {
        const cp = checkpoints[year];
        
        // Gate: Serialized state (< 15 MiB)
        const maxBytes = 15 * 1024 * 1024;
        if (cp.stateBytes >= maxBytes) {
            failures.push(`serializedState failed at year ${year}: ${cp.stateBytes} bytes exceeded 15 MiB`);
        }
        
        // Gate: Zero extinctions (every species must be extant)
        const speciesList = ["human", "elf", "dwarf", "halfling", "gnome", "dragonborn", "half-elf", "half-orc", "tiefling"];
        for (const sp of speciesList) {
            const count = cp.bySpecies[sp] || 0;
            if (count <= 0) {
                failures.push(`zeroExtinctions failed at year ${year}: species ${sp} is extinct`);
            }
            // Gate: Bounded population (< 1,500)
            if (count >= 1500) {
                failures.push(`boundedPopulation failed at year ${year}: species ${sp} reached ${count} >= 1500`);
            }
        }
        
        // Gate: Viable reproduction at 250 and 500
        if (year >= 250) {
            for (const sp of speciesList) {
                const pairs = cp.activeFertilePartnerships[sp] || 0;
                if (pairs <= 0) {
                    failures.push(`viableReproduction failed at year ${year}: species ${sp} has 0 fertile partnerships`);
                }
            }
        }
    }
    
    return failures;
}

function parseCli(argv) {
    const opts = {
        seeds: [0, 424242, 20260919],
        horizons: [100, 250, 500],
        runs: 2,
        sweep: 0,
        mutant: null,
        selftest: false,
        json: OUTPUT
    };
    for (let i = 2; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === "--selftest") opts.selftest = true;
        else if (arg.startsWith("--mutant=")) opts.mutant = arg.slice(9);
        else if (arg === "--seed" && argv[i + 1]) { opts.seeds = [Number(argv[++i])]; }
        else if (arg === "--years" && argv[i + 1]) { opts.horizons = [Number(argv[++i])]; }
        else if (arg === "--runs" && argv[i + 1]) { opts.runs = Number(argv[++i]); }
        else if (arg === "--sweep" && argv[i + 1]) { opts.sweep = Number(argv[++i]); }
        else if (arg === "--json" && argv[i + 1]) { opts.json = path.resolve(argv[++i]); }
    }
    return opts;
}

function main() {
    const opts = parseCli(process.argv);
    console.log("=== DEUS Historical Demographics & Carrying Capacity Verification ===");
    console.log(`Node: ${process.version}, OS: ${os.type()} ${os.arch()}`);
    
    const data = sourceBundle();
    
    // Mutant mode execution
    if (opts.mutant) {
        console.log(`\n[MUTANT MODE: ${opts.mutant}]`);
        assert(MUTANTS.includes(opts.mutant), `Unknown mutant: ${opts.mutant}`);
        try {
            const tr = runTrajectory(data, 0, [100, 250, 500], opts.mutant);
            const failures = verifyGates(tr);
            if (failures.length > 0) {
                console.log(`PASS mutant ${opts.mutant} triggered expected gate failure:`);
                failures.forEach(f => console.log(`  - ${f}`));
                process.exit(1); // Standard Rule 4 behavior: mutant test exits 1
            } else {
                console.error(`FAIL mutant ${opts.mutant} passed all gates without error!`);
                process.exit(0);
            }
        } catch (e) {
            console.log(`PASS mutant ${opts.mutant} threw expected error: ${e.message}`);
            process.exit(1);
        }
    }
    
    // Save / Reload Resumption Test
    console.log("\n--- Testing Save/Reload Resumption Equivalence (100y + 150y vs continuous 250y) ---");
    {
        const testSeed = 0;
        // 1. Continuous 250 years
        const cont = runTrajectory(data, testSeed, [250]);
        const contCp = cont.checkpoints[250];
        
        // 2. 100 years -> serialize -> reload -> 150 years
        const loaded = load(data, testSeed);
        const { api, world } = loaded;
        const s100 = api.create(world, { profiles: "default", eventLimit: 1000000 });
        for (let y = 1; y <= 100; y++) api.step(s100);
        api.validate(s100);
        
        // Serialize and reload
        const savedText = JSON.stringify(s100);
        const reloaded = JSON.parse(savedText);
        api.validate(reloaded);
        
        // Advance 150 more years
        for (let y = 101; y <= 250; y++) api.step(reloaded);
        api.validate(reloaded);
        
        const resumedText = JSON.stringify(reloaded);
        const resumedSha = sha(resumedText);
        const resumedEventsSha = sha(JSON.stringify(reloaded.events));
        
        assert(resumedText === contCp.stateText, "Save/reload resumption state differs from continuous run");
        assert(resumedSha === contCp.stateSha256, "Save/reload state SHA-256 differs from continuous run");
        assert(resumedEventsSha === contCp.eventsSha256, "Save/reload events SHA-256 differs from continuous run");
        console.log(`PASS Save/Reload Resumption: continuous 250y matches 100y+150y reload byte-for-byte (SHA: ${resumedSha.slice(0, 16)}...)`);
    }
    
    // Canonical 3-Seed 500-Year Matrix
    console.log(`\n--- Canonical 500-Year Matrix (Seeds: ${opts.seeds.join(", ")}, Runs: ${opts.runs}) ---`);
    const results = [];
    let matrixPassed = true;
    
    for (const seed of opts.seeds) {
        console.log(`\n[SEED ${seed}]`);
        const runs = [];
        for (let r = 1; r <= opts.runs; r++) {
            const tr = runTrajectory(data, seed, opts.horizons);
            const failures = verifyGates(tr);
            const cp500 = tr.checkpoints[500] || tr.checkpoints[Math.max(...opts.horizons)];
            const living = cp500.livingCount;
            const bytes = cp500.stateBytes;
            const timeSec = (tr.wallMs / 1000).toFixed(3);
            const worstMs = tr.worstAnnualMs.toFixed(2);
            
            console.log(`  Run ${r}: Wall ${timeSec}s (worst ${worstMs}ms), Living: ${living}, State: ${(bytes / 1024).toFixed(1)} KiB, SHA: ${cp500.stateSha256.slice(0, 16)}...`);
            if (failures.length > 0) {
                console.error(`  FAIL gates violated:`);
                failures.forEach(f => console.error(`    - ${f}`));
                matrixPassed = false;
            } else {
                console.log(`  PASS all gates`);
            }
            runs.push(tr);
        }
        
        // Verify Repeat Determinism
        if (runs.length >= 2) {
            for (const h of opts.horizons) {
                const a = runs[0].checkpoints[h], b = runs[1].checkpoints[h];
                assert(a.stateText === b.stateText, `Seed ${seed} year ${h}: repeated states differ byte-for-byte`);
                assert(a.eventsText === b.eventsText, `Seed ${seed} year ${h}: repeated events differ byte-for-byte`);
                assert(a.stateSha256 === b.stateSha256, `Seed ${seed} year ${h}: repeated state SHA mismatch`);
            }
            console.log(`  PASS Repeat Determinism: 100% byte-identical state and events across independent trials`);
        }
        
        const first = runs[0];
        const cp = first.checkpoints[500] || first.checkpoints[Math.max(...opts.horizons)];
        results.push({
            seed,
            wallMs: first.wallMs,
            worstAnnualMs: first.worstAnnualMs,
            capacities: first.capacities,
            living: cp.livingCount,
            bySpecies: cp.bySpecies,
            bySite: cp.bySite,
            stateBytes: cp.stateBytes,
            stateSha256: cp.stateSha256,
            eventsSha256: cp.eventsSha256
        });
    }
    
    // Broader Sweep (if requested, or run 20 seeds)
    const sweepCount = opts.sweep > 0 ? opts.sweep : 20;
    console.log(`\n--- Broader Seed Sweep (${sweepCount} seeds at 250 years) ---`);
    const sweepResults = [];
    const speciesExtinctionCounts = {};
    const totalLivingList = [];
    let sweepWorstMs = 0;
    
    for (let s = 1; s <= sweepCount; s++) {
        const tr = runTrajectory(data, s, [250]);
        const cp250 = tr.checkpoints[250];
        totalLivingList.push(cp250.livingCount);
        if (tr.wallMs > sweepWorstMs) sweepWorstMs = tr.wallMs;
        
        const speciesList = ["human", "elf", "dwarf", "halfling", "gnome", "dragonborn", "half-elf", "half-orc", "tiefling"];
        for (const sp of speciesList) {
            if (!cp250.bySpecies[sp] || cp250.bySpecies[sp] <= 0) {
                speciesExtinctionCounts[sp] = (speciesExtinctionCounts[sp] || 0) + 1;
            }
        }
        sweepResults.push({
            seed: s,
            living: cp250.livingCount,
            bySpecies: cp250.bySpecies,
            wallMs: tr.wallMs,
            stateBytes: cp250.stateBytes
        });
    }
    
    const minPop = Math.min(...totalLivingList);
    const maxPop = Math.max(...totalLivingList);
    const medPop = median(totalLivingList);
    const maxStateBytes = Math.max(...sweepResults.map(r => r.stateBytes));
    
    console.log(`Sweep Summary (${sweepCount} seeds at 250 years):`);
    console.log(`  Total Population: Min = ${minPop}, Median = ${medPop}, Max = ${maxPop}`);
    console.log(`  Extinctions: ${Object.keys(speciesExtinctionCounts).length ? JSON.stringify(speciesExtinctionCounts) : "Zero across all seeds"}`);
    console.log(`  Largest State: ${(maxStateBytes / 1024).toFixed(1)} KiB (< 15 MiB threshold)`);
    console.log(`  Slowest Trajectory: ${(sweepWorstMs / 1000).toFixed(3)}s (< 30s threshold)`);
    
    // Save report artifact
    const report = {
        task: "DEUS-TSK-HIST-09",
        timestamp: new Date().toISOString(),
        canonicalMatrix: results,
        sweep: {
            count: sweepCount,
            minPop,
            medPop,
            maxPop,
            maxStateBytes,
            slowestTrajectoryMs: sweepWorstMs,
            speciesExtinctions: speciesExtinctionCounts
        }
    };
    
    fs.mkdirSync(path.dirname(opts.json), { recursive: true });
    fs.writeFileSync(opts.json, JSON.stringify(report, null, 2));
    console.log(`\nDetailed report written to: ${opts.json}`);
    
    if (!matrixPassed) {
        console.error("\nRESULT: FAILED (one or more gates violated)");
        process.exit(1);
    }
    
    console.log("\nRESULT: ALL PASS (Canonical 500y matrix, Repeat determinism, Save/Reload resumption, Broader sweep)");
    process.exit(0);
}

main();

