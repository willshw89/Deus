#!/usr/bin/env node
"use strict";

// DEUS-TSK-ASTRA-04: measurement only. Each trial has its own Node process
// and VM, real terrain readers, fresh factions, and unchanged catalog data.
// No game loop, population/settling engine, rendering, or forced GC runs.
const fs = require("fs"), path = require("path"), vm = require("vm");
const crypto = require("crypto"), os = require("os");
const { performance } = require("perf_hooks");
const { spawnSync } = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "game/test_output/bench_history_sim.json");
const MODULES = ["World", "WorldGen", "Factions", "History", "Levels"];
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const sha = text => crypto.createHash("sha256").update(text).digest("hex");
const clone = value => JSON.parse(JSON.stringify(value));
const average = values => values.reduce((sum, v) => sum + v, 0) / values.length;
const duration = ms => ({ ms, us: ms * 1000 });

function parseArgs(args) {
    const out = { seeds: [0, 424242, 20260919], years: [100, 250, 500], runs: 2, json: false, selftest: false };
    for (let i = 0; i < args.length; i++) {
        const key = args[i];
        if (["--json", "--selftest", "--help"].includes(key)) { out[key.slice(2)] = true; continue; }
        assert(["--seed", "--years", "--runs"].includes(key), `Unknown argument: ${key}`);
        const value = args[++i], n = Number(value);
        const limit = key === "--seed" ? 2147483647 : key === "--years" ? 10000 : 100;
        assert(value !== undefined && /^\d+$/.test(value) && Number.isSafeInteger(n) &&
            n >= (key === "--seed" ? 0 : 1) && n <= limit, `Invalid ${key}: ${value}; expected integer ${key === "--seed" ? 0 : 1}..${limit}`);
        if (key === "--seed") out.seeds = [n];
        else if (key === "--years") out.years = [n];
        else out.runs = n;
    }
    return out;
}

function sourceBundle() {
    const files = {};
    const read = file => (files[file] = fs.readFileSync(path.join(ROOT, file), "utf8"));
    const list = {};
    vm.runInNewContext(read("game/js/plugins.js"), list, { timeout: 1000 });
    const plugins = list.$plugins.filter(p => p.status && MODULES.includes(p.name.replace(/^DEUS_/, "")));
    assert(plugins.length === MODULES.length && plugins.every((p, i) => p.name === `DEUS_${MODULES[i]}`),
        "Enabled plugin set/order changed; review isolated bootstrap");
    for (const p of plugins) read(`game/js/plugins/${p.name}.js`);
    const catalog = JSON.parse(read("game/data/UF_WorldCatalog.json"));
    read("tools/bench_history_sim.js");
    return { files, plugins, catalog, sources: Object.keys(files).map(file => ({ path: file, sha256: sha(files[file]) })) };
}

function once(source, anchor, insertion) {
    assert(source.split(anchor).length === 2, `Source observation anchor missing/ambiguous: ${anchor}`);
    return source.replace(anchor, insertion + "\n" + anchor);
}

function instrument(source) {
    // Observe only. No replacement of the RNG, event recorder, math, or loops.
    source = once(source, "        for (let year = 1; year <= years; year++) {", "        __historyProbe.mark('founding');");
    source = once(source, "        for (const w of wars) if (w.to === null) w.to = years;", "        __historyProbe.mark('annualSteps');");
    source = once(source, "        const keep = cfg.eventsKept || 400;", "        __historyProbe.emitted = events.length;");
    return source;
}

function environment(bundle, probe) {
    const namespace = {}, errors = [], warnings = [];
    const math = Object.create(Math);
    math.random = () => { throw new Error("Unseeded Math.random in benchmark execution"); };
    const env = {
        UF: namespace, DEUS: namespace, performance, Math: math, __historyProbe: probe,
        $ufWorldCatalog: clone(bundle.catalog),
        PluginManager: { parameters: name => (bundle.plugins.find(p => p.name === name) || {}).parameters || {}, registerCommand() {} },
        DataManager: { _databaseFiles: [], onLoad() {}, isBattleTest: () => false, isEventTest: () => false },
        Input: { keyMapper: {} }, TouchInput: {}, SceneManager: { _scene: null },
        ImageManager: { loadTileset() { throw new Error("Unexpected tileset rendering"); } },
        Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 },
        $gameMap: { mapId: () => 0 }, $gamePlayer: {}, $gameSystem: {},
        Utils: { isOptionValid: () => false },
        console: { log() {}, warn: (...args) => warnings.push(args.map(String).join(" ")),
            error: (...args) => errors.push(args.map(String).join(" ")) }
    };
    env.window = env;
    env.$deusWorldCatalog = env.$ufWorldCatalog;
    // Definition-only MZ shells. Calling an engine method is an error: these
    // aliases must never become a substitute for simulation/terrain behavior.
    const names = new Set(["Sprite", "Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot", "Rectangle"]);
    const sources = bundle.plugins.map(p => bundle.files[`game/js/plugins/${p.name}.js`]);
    for (const source of sources) for (const m of source.matchAll(/\b((?:Game|Scene|Window|Spriteset|Sprite)_[A-Za-z0-9_]+)\.prototype/g)) names.add(m[1]);
    for (const name of names) env[name] = function() { throw new Error(`Unexpected engine construction: ${name}`); };
    for (const source of sources) for (const m of source.matchAll(/\b((?:Game|Scene|Window|Spriteset|Sprite)_[A-Za-z0-9_]+)\.prototype\.([A-Za-z0-9_]+)/g)) {
        const label = `${m[1]}.${m[2]}`;
        env[m[1]].prototype[m[2]] = () => { throw new Error(`Unexpected engine call: ${label}`); };
    }
    return { env, errors, warnings };
}

function trial(seed, years, profiled) {
    const start = performance.now(), bundle = sourceBundle();
    const phases = {};
    const probe = { emitted: null, time: 0, mark(name) {
        const t = performance.now(); phases[name] = duration(t - this.time); this.time = t;
    } };
    const { env, errors, warnings } = environment(bundle, probe);
    const context = vm.createContext(env);
    // Lexical native builtins avoid contextified global lookup overhead in the
    // tight terrain loops, without changing their implementations.
    vm.runInContext(["Math", "Object", "Array", "Number", "String", "Boolean", "Map", "Set", "JSON", "Date",
        "Uint8Array", "Uint16Array", "Int32Array", "Float32Array", "performance", "window", "__historyProbe"]
        .map(name => `const ${name} = globalThis.${name};`).join("\n"), context);
    for (const p of bundle.plugins) {
        let source = bundle.files[`game/js/plugins/${p.name}.js`];
        if (profiled && p.name === "DEUS_History") source = instrument(source);
        vm.runInContext(source, context, { filename: p.name, timeout: 10000 });
    }
    const loaded = performance.now();
    // Deliberately no Events/Core or world:created population listeners. These
    // public calls provide real empty world state and terrain for site placement.
    const state = env.UF.World.newWorld(seed);
    assert(state.seed === seed && state.size === 256, "World seed/size contract changed");
    env.UF.Levels.ensureWorldLevels(state);
    const terrainReady = performance.now();
    env.UF.Factions.generate(state);
    assert(state.factions && state.factions.list.length && env.UF.WorldGen.cellInfo(128, 128), "Missing real factions/terrain");
    const setupDone = performance.now();
    const before = process.memoryUsage();
    const simStart = performance.now();
    probe.time = simStart;
    const history = env.UF.History.generate(state, { targetYears: years, legacySimulate: true, settle: false });
    const simEnd = performance.now();
    if (profiled) phases.finalization = duration(simEnd - probe.time);
    const after = process.memoryUsage();
    assert(history && history.years === years && Array.isArray(history.events), "History API/horizon contract changed");
    assert(errors.length === 0, `Plugin console errors: ${errors.join("; ")}`);
    const serialized = JSON.stringify(history), eventLog = JSON.stringify(history.events), factions = JSON.stringify(state.factions);
    const eventCount = history.events.length;
    const rulers = Object.values(history.rulers).flat();
    const factionSites = history.sites.filter(s => s.faction !== null);
    const result = {
        seed, years, sources: bundle.sources,
        timings: { loading: duration(loaded - start), worldAndTerrain: duration(terrainReady - loaded),
            factions: duration(setupDone - terrainReady), setupTotal: duration(setupDone - start),
            simulation: duration(simEnd - simStart), phases: profiled ? phases : null,
            per100Years: duration((simEnd - simStart) * 100 / years), yearsPerSecond: years * 1000 / (simEnd - simStart) },
        memory: { before, after, delta: Object.fromEntries(Object.keys(before).map(k => [k, after[k] - before[k]])) },
        figures: { total: null, alive: null, dead: null, status: "NOT AVAILABLE: annual history has no individual life/death registry",
            namedRulerRecords: rulers.length, currentRulers: rulers.filter(r => r.from <= years && r.to > years).length,
            formerRulers: rulers.filter(r => r.to <= years).length,
            aggregateFactionPopulation: state.factions.list.reduce((sum, f) => sum + f.population, 0) },
        events: { retained: eventCount, emitted: probe.emitted, discarded: profiled ? probe.emitted - eventCount : null,
            retentionLimit: bundle.catalog.history.eventsKept || 400, sha256: sha(eventLog) },
        factions: { count: state.factions.list.length, settlementsFounded: factionSites.length,
            activeSettlements: factionSites.filter(s => s.ruined === null).length,
            ruinedSettlements: factionSites.filter(s => s.ruined !== null).length,
            beastLairs: history.sites.filter(s => s.faction === null).length, totalSites: history.sites.length },
        state: { jsonCharacters: serialized.length, utf8Bytes: Buffer.byteLength(serialized, "utf8"),
            sha256: sha(serialized), factionsSha256: sha(factions) },
        warnings, evidence: { eventLog, history: serialized, factions }
    };
    result.timings.serializationAndMetrics = duration(performance.now() - simEnd);
    result.timings.workerTotal = duration(performance.now() - start);
    return result;
}

function validateEvidence(result) {
    assert(JSON.parse(result.evidence.eventLog).length === result.events.retained, "Event count does not match serialized event data");
    assert(sha(result.evidence.eventLog) === result.events.sha256, "Event data checksum mismatch");
    assert(sha(result.evidence.history) === result.state.sha256, "History state checksum mismatch");
    assert(sha(result.evidence.factions) === result.state.factionsSha256, "Faction state checksum mismatch");
}

function verifyRepeat(first, next) {
    validateEvidence(first); validateEvidence(next);
    assert(first.seed === next.seed && first.years === next.years, "Seed/year mismatch");
    assert(first.events.retained === next.events.retained, "Repeated event count mismatch");
    assert(first.evidence.eventLog === next.evidence.eventLog, "Repeated event data differs byte-for-byte");
    assert(first.evidence.history === next.evidence.history && first.evidence.factions === next.evidence.factions,
        "Repeated history/faction state differs byte-for-byte");
    if (first.events.emitted !== null && next.events.emitted !== null)
        assert(first.events.emitted === next.events.emitted, "Emitted event count mismatch");
}

function runTrial(bundle, seed, years, profiled = true) {
    const start = performance.now();
    const child = spawnSync(process.execPath, [__filename, "--worker", String(seed), String(years), profiled ? "profile" : "plain"],
        { cwd: ROOT, encoding: "utf8", windowsHide: true, maxBuffer: 16 * 1024 * 1024, timeout: 120000 });
    assert(!child.error && child.status === 0, `Trial seed=${seed} years=${years} failed: ${child.error || child.stderr || child.status}`);
    const result = JSON.parse(child.stdout);
    assert(JSON.stringify(result.sources) === JSON.stringify(bundle.sources), "Inputs changed during benchmark; discard mixed-source results");
    validateEvidence(result);
    result.timings.processWall = duration(performance.now() - start);
    result.timings.processOverhead = duration(result.timings.processWall.ms - result.timings.workerTotal.ms);
    // Process exit is the release boundary; no speculative VM retention claims.
    return result;
}

function selftest(bundle) {
    const checks = [];
    const check = (name, fn) => { fn(); checks.push({ name, status: "PASS" }); };
    const rejects = (fn, pattern) => {
        let error;
        try { fn(); } catch (e) { error = e; }
        assert(error && pattern.test(error.message), `Expected rejection ${pattern}; got ${error ? error.message : "success"}`);
        return error.message;
    };
    check("CLI defaults and explicit zero seed", () => {
        assert(JSON.stringify(parseArgs([]).years) === "[100,250,500]" && parseArgs([]).runs === 2, "Wrong defaults");
        const o = parseArgs(["--years", "250", "--seed", "0", "--runs", "3", "--json"]);
        assert(o.seeds[0] === 0 && o.years[0] === 250 && o.runs === 3 && o.json, "Flags ignored");
    });
    for (const args of [["--years", "-1"], ["--years", "0"], ["--years", "1.5"], ["--years", "10001"],
        ["--seed", "1.2"], ["--seed", "-1"], ["--seed", "2147483648"], ["--runs", "0"], ["--runs", "2.5"],
        ["--runs", "NaN"], ["--runs", "101"], ["--years"], ["--unknown"]])
        check(`CLI rejects ${args.join(" ")}`, () => rejects(() => parseArgs(args), /Invalid|Unknown/));
    const a = runTrial(bundle, 0, 100), b = runTrial(bundle, 0, 100), raw = runTrial(bundle, 0, 100, false);
    check("Same seed is bit-for-bit deterministic", () => verifyRepeat(a, b));
    check("Observation hooks preserve uninstrumented production output", () => verifyRepeat(a, raw));
    const mutations = [
        ["event count", r => r.events.retained++, /Event count/],
        ["event text", r => { const e = JSON.parse(r.evidence.eventLog); e[0].text += " MUTATION"; r.evidence.eventLog = JSON.stringify(e); }, /checksum/],
        ["changed data with recalculated hash", r => { const e = JSON.parse(r.evidence.eventLog); e[0].year++; r.evidence.eventLog = JSON.stringify(e); r.events.sha256 = sha(r.evidence.eventLog); }, /differs byte-for-byte/],
        ["seed mismatch", r => r.seed++, /Seed\/year/],
        ["year mismatch", r => r.years++, /Seed\/year/],
        ["emitted count", r => r.events.emitted++, /Emitted event/]
    ];
    for (const [label, mutate, pattern] of mutations) {
        const changed = clone(b); mutate(changed);
        check(`Mutation rejected: ${label}`, () => {
            const reason = rejects(() => verifyRepeat(a, changed), pattern);
            checks.push({ name: `Negative control: ${label}`, observedResult: "FAIL (expected)", reason });
        });
    }
    check("Missing observation anchor fails closed", () => rejects(() => instrument("changed source"), /anchor/));
    return { status: "PASS", passed: checks.filter(c => c.status === "PASS").length, checks };
}

function summary(seed, years, runs) {
    const r = runs[0];
    return { seed, years, runs: runs.length, simulationMeanMs: average(runs.map(r => r.timings.simulation.ms)),
        simulationMinMs: Math.min(...runs.map(r => r.timings.simulation.ms)), simulationMaxMs: Math.max(...runs.map(r => r.timings.simulation.ms)),
        per100YearsMeanMs: average(runs.map(r => r.timings.per100Years.ms)),
        yearsPerSecond: years * 1000 / average(runs.map(r => r.timings.simulation.ms)),
        heapDeltaMeanBytes: average(runs.map(r => r.memory.delta.heapUsed)),
        eventsRetained: r.events.retained, eventsEmitted: r.events.emitted, namedRulerRecords: r.figures.namedRulerRecords,
        factionCount: r.factions.count, settlementsFounded: r.factions.settlementsFounded, historyUtf8Bytes: r.state.utf8Bytes,
        eventsSha256: r.events.sha256, determinism: runs.length > 1 ? "PASS" : "NOT RUN (one run)" };
}

function table(rows) {
    const grid = [["Seed", "Years", "Runs", "Mean ms", "ms/100yr", "Years/s", "Events kept/all", "Rulers", "Factions/sites", "Heap d KiB", "State KiB", "Repeat"],
        ...rows.map(r => [r.seed, r.years, r.runs, r.simulationMeanMs.toFixed(3), r.per100YearsMeanMs.toFixed(3), r.yearsPerSecond.toFixed(0),
            `${r.eventsRetained}/${r.eventsEmitted}`, r.namedRulerRecords, `${r.factionCount}/${r.settlementsFounded}`,
            (r.heapDeltaMeanBytes / 1024).toFixed(1), (r.historyUtf8Bytes / 1024).toFixed(2), r.determinism])].map(row => row.map(String));
    const widths = grid[0].map((_, i) => Math.max(...grid.map(r => r[i].length)));
    const line = "+-" + widths.map(w => "-".repeat(w)).join("-+-") + "-+";
    return [line, ...grid.flatMap((row, i) => ["| " + row.map((s, j) => s.padEnd(widths[j])).join(" | ") + " |", ...(i === 0 ? [line] : [])]), line].join("\n");
}

function main() {
    const started = performance.now();
    if (process.argv[2] === "--worker") {
        const args = parseArgs(["--seed", process.argv[3], "--years", process.argv[4]]);
        assert(process.argv.length === 6 && ["profile", "plain"].includes(process.argv[5]), "Invalid internal worker request");
        process.stdout.write(JSON.stringify(trial(args.seeds[0], args.years[0], process.argv[5] === "profile")));
        return;
    }
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
        console.log("Usage: node tools/bench_history_sim.js [--seed 0..2147483647] [--years 1..10000] [--runs 1..100] [--json] [--selftest]\nDefaults: seeds 0,424242,20260919; years 100,250,500; two independent runs.\n--json: JSON stdout (table on stderr). --selftest: checks only; does not replace benchmark artifact.");
        return;
    }
    const bundle = sourceBundle();
    if (options.selftest) {
        const result = selftest(bundle);
        if (options.json) console.log(JSON.stringify(result, null, 2));
        else {
            for (const check of result.checks) console.log(`${check.status || check.observedResult}: ${check.name}${check.reason ? " - " + check.reason : ""}`);
            console.log(`Self-test PASS: ${result.passed} checks; wall ${((performance.now() - started) / 1000).toFixed(3)} s`);
        }
        return;
    }
    const rows = [], results = [];
    for (const seed of options.seeds) for (const years of options.years) {
        const group = [];
        for (let run = 1; run <= options.runs; run++) {
            const result = runTrial(bundle, seed, years);
            if (group.length) verifyRepeat(group[0], result);
            result.run = run; group.push(result);
        }
        rows.push(summary(seed, years, group));
        for (const result of group) { delete result.evidence; delete result.sources; results.push(result); }
    }
    const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8", windowsHide: true });
    const report = {
        schemaVersion: 1, task: "DEUS-TSK-ASTRA-04", status: "PASS", createdAt: new Date().toISOString(), options,
        methodology: {
            engine: "Legacy annual history; History.generate(state, {targetYears, legacySimulate:true, settle:false})",
            bootstrap: "Real World.newWorld, Levels.ensureWorldLevels and Factions.generate; no Core/Events population callbacks. Real WorldGen/Levels terrain queries.",
            isolation: "Fresh Node process and VM per run; no forced GC; no warm-up. Process exit releases each trial.",
            phases: "performance.now() milliseconds and converted microseconds, without rounding. Founding includes public entry overhead; finalization includes chronicle trimming. Instrumentation overhead is included.",
            per100Years: "Normalized whole simulation cost *100/years, not sampled 100-year intervals. Horizons are independent; combat onset depends on total horizon.",
            memory: "Process heapUsed before/after simulation: signed net heap change, not cumulative allocations or a leak/retention test; ordinary GC may occur.",
            stateSize: "History state only, not a complete game save. JSON.length is UTF-16 code units; utf8Bytes measures encoded bytes.",
            figures: "Individual alive/dead/total unavailable. Rulers have reign intervals, not life spans; former rulers are not assumed dead.",
            limitations: "Annual legacy sites/homes omit z. No living-world iterateWorldHistory, settling, colonist AI, gameplay, or native rendering verification.",
            processOverhead: "Spawn/startup, result transport, and process teardown combined; excluded from simulation timings.",
            totalWall: "Through result validation and report assembly; excludes final artifact/stdout writes."
        },
        runtime: { node: process.version, v8: process.versions.v8, platform: process.platform, arch: process.arch,
            cpu: (os.cpus()[0] || {}).model || null },
        provenance: { gitHead: head.status === 0 ? head.stdout.trim() : null, sources: bundle.sources },
        determinism: options.runs > 1 ? "PASS" : "NOT RUN (one run)",
        feasibility500Years: rows.filter(r => r.years === 500).map(r => ({ seed: r.seed, maxMs: r.simulationMaxMs,
            targetMs: 3000, withinTarget: r.simulationMaxMs < 3000 })),
        summary: rows, runs: results, totalWall: duration(performance.now() - started)
    };
    assert(JSON.stringify(sourceBundle().sources) === JSON.stringify(bundle.sources), "Inputs changed before report; refusing stale artifact");
    fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
    const json = JSON.stringify(report, null, 2);
    fs.writeFileSync(OUTPUT, json + "\n");
    const human = `${table(rows)}\nLegacy annual history; figures alive/dead unavailable. Heap delta is net, not allocation total.\nPASS; wall ${(report.totalWall.ms / 1000).toFixed(3)} s; JSON: ${OUTPUT}`;
    if (options.json) { console.error(human); console.log(json); }
    else console.log(human);
}

try { main(); } catch (error) {
    console.error(`FAIL: ${error.stack || error}`);
    process.exitCode = 1;
}
