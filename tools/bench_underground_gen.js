#!/usr/bin/env node
"use strict";

// DEUS-TSK-ASTRA-02, 2026-09-22. Sole source edit: this file.
// Usage: node tools/bench_underground_gen.js [--seed N] [--runs N] [--profile] [--json]
//        node tools/bench_underground_gen.js --runtime both
// --runtime node|nw|both selects Node VM (default), hidden NW native evaluation,
// or both with cross-runtime checksum verification. --nw <exe> overrides NW.
// --json sends JSON to stdout and the ASCII table to stderr. The JSON artifact
// is always written to game/test_output/bench_underground_gen.json.
// --profile adds phase tables and weak tracking of intermediate province objects.
// --selftest checks fault detection without changing any production file.
//
// Scope is the current GEN3 *baseline*, not World.buildArea, resource placement,
// renderer boot, or subsequent fluid simulation. Missing requested phases are
// explicitly null, not fabricated zero-cost implementations. No generation math
// is copied or changed. Source is frozen once, instrumented only in memory at
// checked anchors, and compared to an instrumentation-free production oracle.
// Changes to those anchors / generator version fail closed for profiler review.
//
// Node's contextified global Math lookup grossly inflates tight-loop timings.
// A lexical binding to the very same native Math object avoids that VM artifact.
// The oracle uses the same bootstrap. NW runs native Function evaluation with
// the same inert engine dependencies; neither mode loads or changes the game.
//
// GC is outside generation/analysis timers. CLI Node respawns with --expose-gc
// when needed. Weak references are inspected only after releasing results and
// crossing an event-loop boundary. Retention flags are evidence of live objects
// in this bounded probe, not a claim about long-running game memory health.

const fs = require("fs");
const path = require("path");
const os = require("os");
const vm = require("vm");
const crypto = require("crypto");
const { performance } = require("perf_hooks");
const { setImmediate } = require("timers");
const { spawn, spawnSync } = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "game", "test_output", "bench_underground_gen.json");
const DEFAULT_NW = "C:/Program Files (x86)/Steam/steamapps/common/RPG Maker MZ/nwjs-win/nw.exe";
const SIZE = 256;
const Z_LEVELS = [-1, -2];
const nextTurn = () => new Promise(resolve => setImmediate(resolve));
const sha256 = text => crypto.createHash("sha256").update(text).digest("hex");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

function parseArgs(args) {
    const opts = { seeds: [0, 424242, 20260919], runs: 2, profile: false, json: false, runtime: "node", nw: DEFAULT_NW };
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (["--profile", "--json", "--selftest", "--help"].includes(arg)) { opts[arg.slice(2)] = true; continue; }
        assert(["--seed", "--runs", "--runtime", "--nw"].includes(arg), `Unknown argument ${arg}; use --help`);
        const value = args[++i];
        assert(value !== undefined && !value.startsWith("--"), `Missing value for ${arg}`);
        if (arg === "--seed" || arg === "--runs") {
            assert(/^\d+$/.test(value), `${arg} requires an integer`);
            const n = Number(value);
            assert(Number.isSafeInteger(n) && n >= (arg === "--seed" ? 0 : 1) && n <= (arg === "--seed" ? 2147483647 : 1000), `${arg} is outside its supported range`);
            if (arg === "--seed") opts.seeds = [n]; else opts.runs = n;
        } else if (arg === "--runtime") {
            assert(["node", "nw", "both"].includes(value), "--runtime must be node, nw, or both");
            opts.runtime = value;
        } else opts.nw = path.resolve(value);
    }
    return opts;
}

function sourceBundle() {
    const sourcePath = "game/js/plugins/DEUS_Levels.js";
    const source = fs.readFileSync(path.join(ROOT, sourcePath), "utf8");
    const catalogPath = "game/data/UF_WorldCatalog.json";
    const catalog = fs.readFileSync(path.join(ROOT, catalogPath), "utf8");
    const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8", windowsHide: true });
    return { source, catalog: JSON.parse(catalog), provenance: {
        sourcePath, sourceSha256: sha256(source), catalogPath, catalogSha256: sha256(catalog),
        gitHead: head.status === 0 ? head.stdout.trim() : null,
        capturedAt: new Date().toISOString(), generatorVersion: 3,
        note: "Measured source bytes, including any working-tree edits, are identified by SHA256; GEN3 is self-contained and does not consult catalog math."
    } };
}

function replaceOnce(source, anchor, replacement) {
    assert(source.split(anchor).length === 2, `Profiler anchor changed or is ambiguous: ${anchor.slice(0, 90)}`);
    return source.replace(anchor, replacement);
}

function prepareSource(source, instrumented) {
    assert(/const GEN = 3;/.test(source), "Profiler supports current GEN3 only; review phase boundaries for a new generator version");
    const begin = "    function generateUnderground(seed, gen, z, ax, ay, size, shape, material) {";
    const end = "    function surfaceElevation(seed, gx, gy, size, d, cl) {";
    const lo = source.indexOf(begin), hi = source.indexOf(end, lo);
    assert(lo >= 0 && hi > lo, "Underground source boundaries missing");
    let fn = source.slice(lo, hi);
    if (instrumented) {
        fn = replaceOnce(fn, begin, begin + "\n        __probe.begin();");
        const gen3 = "        // GEN >= 3: Continuous rolling cavern network with interconnected halls, corridors, and natural pillars";
        fn = replaceOnce(fn, gen3, "        __probe.mark('setup');\n" + gen3);
        const noise = "        for (let y = BORDER; y < size - BORDER; y++) {";
        fn = replaceOnce(fn, noise, "        __probe.trackObjects(provinces);\n        __probe.mark('biome_assignment');\n" + noise);
        // The same divisions declaration appears in GEN2; instrument GEN3 only.
        const split = fn.indexOf(gen3);
        let tail = fn.slice(split);
        const pockets = "        const divisions = z === -1 ? 6 : 4, span = size / divisions;";
        tail = replaceOnce(tail, pockets, "        __probe.mark('noise_thresholds');\n" + pockets);
        const water = "                const wx = Math.min(size - BORDER - 2, bestX + clearRadius + 2);";
        tail = replaceOnce(tail, water, "                __probe.waterStart();\n" + water);
        const bounds = "                const bounds = {";
        tail = replaceOnce(tail, bounds, "                __probe.waterEnd();\n" + bounds);
        const finish = '        if (provoked("underground_biomes"))';
        tail = replaceOnce(tail, finish, "        __probe.mark('pockets_including_water');\n" + finish);
        fn = fn.slice(0, split) + tail;
        source = source.slice(0, lo) + fn + source.slice(hi);
    }
    const close = source.lastIndexOf("})();");
    assert(close > 0 && source.slice(close + 5).trim() === "", "Levels IIFE end changed");
    return source.slice(0, close) + "\nwindow.__undergroundBench = { generate: generateBaseline, metrics: baselineMetrics, gen: GEN, cacheEntries: () => baselines.size };\n" + source.slice(close);
}

function tracker(profile, active) {
    let arrays = [], objects = [], phase = {}, last = 0, waterStart = 0, waterMs = 0;
    const Weak = typeof WeakRef === "function" ? WeakRef : null;
    const trackObject = (value, kind) => {
        if (Weak) objects.push({ ref: new Weak(value), kind });
    };
    const Typed = new Proxy(Uint8Array, { construct(target, args) {
        const value = Reflect.construct(target, args);
        if (active.value) arrays.push({ bytes: value.byteLength, ref: Weak ? new Weak(value) : null });
        return value;
    } });
    return {
        Typed,
        reset() { arrays = []; objects = []; phase = {}; waterMs = 0; },
        begin() { last = performance.now(); },
        mark(name) { const now = performance.now(); phase[name] = now - last; last = now; },
        waterStart() { waterStart = performance.now(); },
        waterEnd() { waterMs += performance.now() - waterStart; },
        trackObjects(provinces) {
            if (profile) { trackObject(provinces, "intermediate_province_array"); for (const p of provinces) trackObject(p, "intermediate_province_object"); }
        },
        trackOutput(b) {
            trackObject(b, "output_object"); trackObject(b.pockets, "output_pockets_array");
            for (const p of b.pockets) trackObject(p, "output_pocket_object");
        },
        snapshot() {
            return { phase: Object.assign({}, phase), waterMs, uint8Arrays: arrays.length,
                uint8Bytes: arrays.reduce((n, a) => n + a.bytes, 0), weakTrackingAvailable: !!Weak,
                trackedObjects: objects.length, intermediateObjectsTracked: profile };
        },
        retention() {
            if (!Weak) return { status: "unavailable", reason: "WeakRef unavailable" };
            const aliveArrays = arrays.filter(a => a.ref.deref() !== undefined);
            const aliveObjects = objects.filter(o => o.ref.deref() !== undefined);
            return { status: "checked_after_gc", liveUint8Arrays: aliveArrays.length,
                liveUint8Bytes: aliveArrays.reduce((n, a) => n + a.bytes, 0),
                liveObjects: aliveObjects.length,
                liveIntermediateObjects: aliveObjects.filter(o => o.kind.startsWith("intermediate_")).length };
        }
    };
}

function environment(bundle, probe, instrumented) {
    function Empty() {}
    // These dependencies only permit plugin definition. No renderer/game/boot
    // method is run, and none replaces a generator/hash/noise function.
    const world = { state: { seed: 0, size: SIZE, areasX: 1, areasY: 1, levels: {} } };
    const namespace = { World: world, Events: { on() {}, emit() {} } };
    const env = {
        performance, __probe: probe, UF: namespace, DEUS: namespace,
        $ufWorldCatalog: bundle.catalog, $deusWorldCatalog: bundle.catalog,
        DataManager: { onLoad() {}, _databaseFiles: [] }, Input: { keyMapper: {} },
        Scene_Boot: function() {}, Scene_Map: function() {}, Spriteset_Map: function() {},
        Game_Player: function() {}, Game_Map: function() {}, Sprite: Empty,
        ImageManager: { loadTileset() { throw new Error("Rendering is outside the baseline benchmark"); } },
        SceneManager: { _scene: null },
        console: { log() {}, warn() {}, error() {} }
    };
    if (instrumented) env.Uint8Array = probe.Typed;
    env.window = env;
    return env;
}

function loadGenerator(bundle, mode, instrumented, probe) {
    const env = environment(bundle, probe, instrumented);
    const source = prepareSource(bundle.source, instrumented);
    if (mode === "node-vm") {
        const context = vm.createContext(env);
        // Same objects, faster lexical lookup. No noise formula/seed alteration.
        vm.runInContext("const Math = globalThis.Math; const Uint8Array = globalThis.Uint8Array;", context);
        vm.runInContext(source, context, { filename: bundle.provenance.sourcePath, timeout: 5000 });
    } else {
        const keys = Object.keys(env);
        Function(...keys, source)(...keys.map(key => env[key]));
    }
    assert(env.__undergroundBench && env.__undergroundBench.gen === 3, "Production generation API failed to load");
    return env.__undergroundBench;
}

function memory() {
    const m = process.memoryUsage();
    return { heapUsed: m.heapUsed, heapTotal: m.heapTotal, external: m.external,
        arrayBuffers: typeof m.arrayBuffers === "number" ? m.arrayBuffers : null, rss: m.rss };
}
function memoryDelta(a, b) {
    const result = {};
    for (const k of Object.keys(a)) result[k] = a[k] === null || b[k] === null ? null : b[k] - a[k];
    return result;
}

function signature(b) {
    let fnv = 2166136261 >>> 0;
    const arraysHash = crypto.createHash("sha256"), outputHash = crypto.createHash("sha256");
    for (const key of ["shape", "material", "biome", "water"]) {
        assert(b[key] && b[key].length === SIZE * SIZE, `Invalid ${key} array dimensions`);
        const data = Buffer.from(b[key].buffer, b[key].byteOffset, b[key].byteLength);
        arraysHash.update(data); outputHash.update(data);
        for (const byte of b[key]) { fnv ^= byte; fnv = Math.imul(fnv, 16777619) >>> 0; }
    }
    assert(Array.isArray(b.pockets), "Missing pocket descriptors");
    outputHash.update(JSON.stringify(b.pockets));
    return { fnv1a: fnv.toString(16).padStart(8, "0"), arraysSha256: arraysHash.digest("hex"), fullSha256: outputHash.digest("hex") };
}
function verifySignature(expected, actual) {
    assert(expected.fullSha256 === actual.fullSha256 && expected.fnv1a === actual.fnv1a,
        `Determinism/instrumentation mismatch: expected ${expected.fullSha256}, got ${actual.fullSha256}`);
}
function phases(s, analysisMs) {
    return {
        noise_thresholds: { requestedPhase: 1, status: "measured", ms: s.phase.noise_thresholds,
            implementation: "Six seeded 2D valueNoise samples per interior cell; hall/corridor/pillar thresholds. No Perlin 3D or elevation phase in GEN3." },
        cellular_smoothing: { requestedPhase: 2, status: "not_present", ms: null, iterations: 0,
            implementation: "GEN3 has no cellular automata smoothing pass." },
        chamber_connectivity: { requestedPhase: 3, status: "diagnostic_only", ms: analysisMs,
            implementation: "Unchanged production baselineMetrics: bounded four-neighbor FLOOR BFS, including wet floors; outside generation timer." },
        fluid_placement: { requestedPhase: 4, status: "partial", ms: s.waterMs,
            implementation: "GEN3 pocket 2x2 source placement only. Later fluid BFS and lava semantics are outside baseline; no basalt placement." },
        mineral_veins: { requestedPhase: 5, status: "outside_baseline", ms: null,
            implementation: "No ore injection in generateBaseline. Separate WorldGen resource objects and later geology queries are not measured." }
    };
}

async function benchmarkRuntime(bundle, opts, mode, gc = global.gc) {
    const runtimeStart = performance.now();
    const active = { value: false }, probe = tracker(opts.profile, active);
    const plain = loadGenerator(bundle, mode, false, probe);
    const measured = loadGenerator(bundle, mode, true, probe);
    const rows = [], warnings = [];
    const collect = async () => { await nextTurn(); if (typeof gc === "function") { gc(); gc(); } };
    for (const seed of opts.seeds) for (const z of Z_LEVELS) {
        await collect();
        const oracleStart = performance.now();
        let oracle = plain.generate(seed, plain.gen, z, 0, 0, SIZE);
        const oracleMs = performance.now() - oracleStart;
        const expected = signature(oracle);
        oracle = null;
        await collect();
        const row = { seed, z, size: SIZE, gen: measured.gen, referenceGenerationMs: oracleMs,
            referenceChecksums: expected, runs: [], deterministic: true };
        for (let run = 0; run < opts.runs; run++) {
            probe.reset();
            const before = memory();
            active.value = true;
            const started = performance.now();
            let baseline;
            try { baseline = measured.generate(seed, measured.gen, z, 0, 0, SIZE); }
            finally { active.value = false; }
            const generationMs = performance.now() - started;
            const afterGeneration = memory();
            const checksums = signature(baseline);
            verifySignature(expected, checksums);
            const analysisStart = performance.now();
            const metrics = measured.metrics(baseline, SIZE);
            const analysisMs = performance.now() - analysisStart;
            assert(metrics.solid + metrics.floor === SIZE * SIZE, "GEN3 topology has invalid/unaccounted shape codes");
            assert(metrics.components.reduce((n, a) => n + a, 0) === metrics.floor, "Component coverage does not match FLOOR cells");
            assert(Number.isFinite(generationMs) && generationMs >= 0 && analysisMs >= 0, "Invalid timing samples");
            probe.trackOutput(baseline);
            const tracked = probe.snapshot();
            for (const key of ["setup", "biome_assignment", "noise_thresholds", "pockets_including_water"]) {
                assert(Number.isFinite(tracked.phase[key]) && tracked.phase[key] >= 0, `Missing phase timer ${key}`);
            }
            const expectedOutputBytes = ["shape", "material", "biome", "water"].reduce((n, key) => n + baseline[key].byteLength, 0);
            const sample = { run: run + 1, generationMs, analysisMs, checksums,
                phases: phases(tracked, analysisMs),
                generationBreakdownMs: Object.assign({}, tracked.phase, {
                    pocketPlacementExcludingWater: Math.max(0, tracked.phase.pockets_including_water - tracked.waterMs),
                    wrapperAndFinalization: Math.max(0, generationMs - Object.values(tracked.phase).reduce((a, b) => a + b, 0))
                }),
                memory: { before, afterGeneration, delta: memoryDelta(before, afterGeneration),
                    expectedOutputBufferBytes: expectedOutputBytes, allocationTracking: tracked,
                    extraUint8AllocationBytes: tracked.uint8Bytes - expectedOutputBytes },
                topology: { solidCells: metrics.solid, solidEarthPercent: metrics.solidFraction * 100,
                    floorCells: metrics.floor, sourceFluidCells: metrics.water,
                    chamberCount: metrics.components.length, chamberSizes: metrics.components.slice().sort((a, b) => b - a),
                    pocketCandidates: baseline.pockets.length, biomeCells: metrics.biomes,
                    adjacency: "bounded cardinal FLOOR connectivity; source-fluid cells included" } };
            baseline = null;
            await collect();
            sample.memory.afterRelease = memory();
            sample.memory.retainedDelta = memoryDelta(before, sample.memory.afterRelease);
            sample.memory.retention = typeof gc === "function" ? probe.retention() : { status: "unavailable", reason: "GC not exposed" };
            const retained = sample.memory.retention;
            sample.memory.flags = [];
            if (retained.liveUint8Arrays > 0) sample.memory.flags.push("LIVE_UINT8_AFTER_RELEASE");
            if (retained.liveObjects > 0) sample.memory.flags.push("LIVE_OBJECT_AFTER_RELEASE");
            if (sample.memory.extraUint8AllocationBytes > 0) sample.memory.flags.push("INTERMEDIATE_UINT8_ALLOCATIONS");
            if (sample.memory.retainedDelta.heapUsed > 1024 * 1024) sample.memory.flags.push("HEAP_GROWTH_REVIEW_NOT_PROVEN_LEAK");
            assert(measured.cacheEntries() === 0, "Benchmark accidentally populated production baseline cache");
            row.runs.push(sample);
        }
        row.averageGenerationMs = row.runs.reduce((n, r) => n + r.generationMs, 0) / row.runs.length;
        row.averageAnalysisMs = row.runs.reduce((n, r) => n + r.analysisMs, 0) / row.runs.length;
        row.averageHeapDeltaBytes = row.runs.reduce((n, r) => n + r.memory.delta.heapUsed, 0) / row.runs.length;
        row.checksum = expected.fnv1a;
        rows.push(row);
    }
    if (typeof gc !== "function") warnings.push("GC unavailable: post-release retention is not assessed.");
    if (process.versions.nw) warnings.push("Bundled NW.js arrayBuffers counter is exposed but may be incomplete; use tracked byte counts and weak reachability, not that counter alone.");
    return { runtime: mode, elapsedMs: performance.now() - runtimeStart,
        versions: Object.assign({}, process.versions), gcAvailable: typeof gc === "function",
        bootstrap: mode === "node-vm" ? "Full production Levels source in VM; lexical native Math/Uint8Array bindings" : "Full production Levels source, native Function evaluation in hidden NW.js",
        warnings, rows };
}

async function runNW(bundle, opts) {
    assert(fs.existsSync(opts.nw), `NW.js executable not found: ${opts.nw}`);
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "deus_underground_bench_"));
    const resultPath = path.join(temporary, "result.json");
    fs.writeFileSync(path.join(temporary, "input.json"), JSON.stringify({ bundle, opts }));
    fs.writeFileSync(path.join(temporary, "package.json"), JSON.stringify({ name: "deus-underground-benchmark", main: "index.html",
        window: { show: false }, "chromium-args": "--js-flags=--expose-gc" }));
    // Node14's external module resolver can fail realpath on restricted Windows
    // ancestor directories even when reading the authorized file is permitted.
    // Evaluate our frozen CommonJS source directly; its imports are all builtins.
    const toolSourcePath = path.join(temporary, "bench_tool.cjs");
    fs.writeFileSync(toolSourcePath, fs.readFileSync(__filename, "utf8"));
    const script = `const fs=require('fs');let finished=false;
function finish(payload){if(finished)return;finished=true;fs.writeFileSync(${JSON.stringify(resultPath)},JSON.stringify(payload));nw.App.quit();}
function failed(error){finish({ok:false,error:String(error&&error.stack||error)});}
window.addEventListener('error',e=>failed(e.error||e.message));window.addEventListener('unhandledrejection',e=>failed(e.reason));
try {
const input=JSON.parse(fs.readFileSync(${JSON.stringify(path.join(temporary, "input.json"))},'utf8'));
const source=fs.readFileSync(${JSON.stringify(toolSourcePath)},'utf8').replace(/^#![^\\n]*\\n/,'');
const mod={exports:{}};
Function('require','module','exports','__filename','__dirname',source)(require,mod,mod.exports,${JSON.stringify(__filename)},${JSON.stringify(__dirname)});
mod.exports.benchmarkRuntime(input.bundle,input.opts,'nw-native',global.gc || window.gc).then(result=>finish({ok:true,result})).catch(failed);
} catch(error){failed(error);}`;
    fs.writeFileSync(path.join(temporary, "driver.js"), script);
    fs.writeFileSync(path.join(temporary, "index.html"), '<!doctype html><meta charset="utf-8"><script src="driver.js"></script>');
    const launched = performance.now();
    await new Promise((resolve, reject) => {
        const child = spawn(opts.nw, [temporary, `--user-data-dir=${path.join(temporary, "profile")}`, "--js-flags=--expose-gc",
            "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"],
            { cwd: temporary, windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
        let stderr = "";
        child.stderr.on("data", data => { stderr = (stderr + data.toString()).slice(-8000); });
        const timeout = setTimeout(() => {
            // Only this launch's PID/tree, never a process-name kill.
            if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
            else child.kill();
            child.stderr.destroy(); child.unref();
            reject(new Error(`NW benchmark timed out; stopped only its launched process tree; diagnostics ${temporary}`));
        }, Math.max(30000, opts.runs * opts.seeds.length * 4000));
        child.on("error", error => { clearTimeout(timeout); reject(error); });
        child.on("exit", (code, signal) => {
            clearTimeout(timeout);
            fs.writeFileSync(path.join(temporary, "stderr.txt"), stderr);
            if (code !== 0 || signal) reject(new Error(`NW exited abnormally (${code}, ${signal}); see ${temporary}`));
            else if (fs.existsSync(resultPath)) resolve(); else reject(new Error(`NW exited without benchmark results; see ${temporary}`));
        });
    });
    const payload = JSON.parse(fs.readFileSync(resultPath, "utf8"));
    assert(payload.ok, `NW benchmark failed: ${payload.error}`);
    payload.result.launchAndRuntimeMs = performance.now() - launched;
    payload.result.diagnosticDirectory = temporary;
    return payload.result;
}

function table(report) {
    const header = ["Runtime", "Seed", "Z", "Gen ms", "BFS ms", "Heap delta KiB", "Solid %", "Chambers", "FNV-1a", "Repeat"];
    const rows = [];
    for (const runtime of report.runtimes) for (const row of runtime.rows) {
        const topo = row.runs[0].topology;
        rows.push([runtime.runtime, String(row.seed), String(row.z), row.averageGenerationMs.toFixed(3),
            row.averageAnalysisMs.toFixed(3), (row.averageHeapDeltaBytes / 1024).toFixed(1), topo.solidEarthPercent.toFixed(4),
            String(topo.chamberCount), row.checksum, row.deterministic ? "PASS" : "FAIL"]);
    }
    const widths = header.map((h, i) => Math.max(h.length, ...rows.map(r => r[i].length)));
    const line = "+-" + widths.map(w => "-".repeat(w)).join("-+-") + "-+";
    const format = row => "| " + row.map((v, i) => v.padEnd(widths[i])).join(" | ") + " |";
    return [line, format(header), line, ...rows.map(format), line].join("\n");
}

async function selftest(bundle) {
    let passed = 0, failed = 0;
    const checks = [];
    const check = (name, condition) => { checks.push({ name, pass: !!condition }); condition ? passed++ : failed++; };
    const rejects = fn => { try { fn(); return false; } catch (_) { return true; } };
    for (const args of [["--seed", "-1"], ["--seed", "1.2"], ["--runs", "0"], ["--runtime", "fake"], ["--unknown"]]) check(`reject_${args.join('_')}`, rejects(() => parseArgs(args)));
    check("seed_zero", parseArgs(["--seed", "0"]).seeds[0] === 0);
    check("anchor_drift_fails", rejects(() => prepareSource(bundle.source.replace("const wx = Math.min(size - BORDER - 2, bestX + clearRadius + 2);", "const wx = bestX;"), true)));
    const active = { value: false }, probe = tracker(false, active);
    const api = loadGenerator(bundle, "node-vm", false, probe);
    const b = api.generate(0, 3, -1, 0, 0, SIZE), before = signature(b);
    b.shape[0] ^= 1;
    check("checksum_detects_byte_mutation", rejects(() => verifySignature(before, signature(b))));
    b.shape[0] ^= 1; b.pockets[0].x++;
    check("checksum_detects_metadata_mutation", rejects(() => verifySignature(before, signature(b))));
    const toy = { shape: new Uint8Array([2, 1, 2, 1, 1, 1, 2, 2, 1]), material: new Uint8Array(9), water: new Uint8Array(9) };
    const metrics = api.metrics(toy, 3);
    check("real_metrics_disconnected_components", metrics.components.length === 3 && metrics.solid === 5 && metrics.floor === 4);
    const leakActive = { value: true }, leakProbe = tracker(true, leakActive);
    let held = new leakProbe.Typed(1024);
    await nextTurn(); if (global.gc) global.gc();
    check("retention_detects_held_uint8", leakProbe.retention().liveUint8Bytes === 1024);
    held.fill(1); held = null;
    await nextTurn(); if (global.gc) { global.gc(); global.gc(); }
    check("released_uint8_collects", leakProbe.retention().liveUint8Arrays === 0);
    leakProbe.reset();
    let heldObjects = [{ marker: "TEST_PROVINCE" }];
    leakProbe.trackObjects(heldObjects);
    await nextTurn(); if (global.gc) global.gc();
    check("retention_detects_held_objects", leakProbe.retention().liveIntermediateObjects === 2);
    heldObjects[0].marker = "TEST_RELEASE"; heldObjects = null;
    await nextTurn(); if (global.gc) { global.gc(); global.gc(); }
    check("released_objects_collect", leakProbe.retention().liveIntermediateObjects === 0);
    return { passed, failed, checks };
}

async function main(args) {
    const started = performance.now(), opts = parseArgs(args);
    if (opts.help) {
        console.log("Usage: node tools/bench_underground_gen.js [--seed N] [--runs N] [--profile] [--json] [--runtime node|nw|both] [--nw executable] [--selftest]");
        console.log("Defaults: seeds 0,424242,20260919; two measured fresh runs per -1/-2 layer, plus an instrumentation-free reference. Seed range 0..2147483647; runs 1..1000. Always writes game/test_output/bench_underground_gen.json.");
        console.log("--profile adds detailed phase/retention output; --json emits JSON stdout and ASCII stderr. NW runs hidden, no game/editor changes.");
        return 0;
    }
    if (typeof global.gc !== "function" && !process.versions.nw) {
        const child = spawnSync(process.execPath, ["--expose-gc", __filename, ...args], { cwd: process.cwd(), stdio: "inherit", windowsHide: true });
        if (child.error) throw child.error;
        return child.status === null ? 2 : child.status;
    }
    const bundle = sourceBundle();
    if (opts.selftest) {
        const result = await selftest(bundle);
        for (const c of result.checks) console.log(`${c.pass ? "PASS" : "FAIL"} underground_bench.${c.name}`);
        console.log(`RESULT: ${result.passed} passed, ${result.failed} failed`);
        return result.failed ? 1 : 0;
    }
    const report = { schemaVersion: 1, task: "DEUS-TSK-ASTRA-02", status: "running", createdAt: new Date().toISOString(),
        provenance: bundle.provenance,
        machine: { platform: process.platform, arch: process.arch, cpu: os.cpus()[0].model },
        configuration: { seeds: opts.seeds, zLevels: Z_LEVELS, size: SIZE, runs: opts.runs, profile: opts.profile, runtime: opts.runtime },
        method: { timer: "performance.now()", timeDomain: "engine", coldCacheEveryRun: true,
            reference: "One fresh instrumentation-free production generation per seed/depth, compared to every measured run; checksums include arrays plus pocket metadata.",
            phaseAccounting: "Connectivity is diagnostic time after generation. Water timing is a subset of pockets_including_water; do not sum overlapping timings.",
            memory: "heapUsed is a net GC-sensitive delta, not total allocated bytes. Four baseline buffers total 262144 bytes. Allocation proxies/weak references add instrumentation overhead. Post-release GC lies outside timers.",
            exclusions: "Full map painting, resources/ore object placement, population, late fluid simulation, native editor/renderer, and GEN4 are outside this baseline." }, runtimes: [] };
    try {
        if (opts.runtime !== "nw") report.runtimes.push(await benchmarkRuntime(bundle, opts, "node-vm"));
        if (opts.runtime !== "node") report.runtimes.push(await runNW(bundle, opts));
        if (report.runtimes.length === 2) {
            for (let i = 0; i < report.runtimes[0].rows.length; i++) verifySignature(report.runtimes[0].rows[i].referenceChecksums, report.runtimes[1].rows[i].referenceChecksums);
            report.crossRuntimeDeterministic = true;
        }
        report.status = "pass";
    } catch (error) { report.status = "fail"; report.error = String(error.stack || error); }
    report.elapsedMs = performance.now() - started;
    report.sourceUnchangedDuringRun = sha256(fs.readFileSync(path.join(ROOT, bundle.provenance.sourcePath), "utf8")) === bundle.provenance.sourceSha256;
    report.defaultBudget = { limitMs: 15000, measuredMs: report.elapsedMs, underLimit: report.elapsedMs < 15000, scope: "This benchmark process; excludes parent Node GC-launch overhead and JSON printing" };
    report.defaultBudget.enforced = opts.runtime === "node" && opts.runs === 2 && !opts.profile && opts.seeds.join(",") === "0,424242,20260919";
    if (report.defaultBudget.enforced && !report.defaultBudget.underLimit) { report.status = "fail"; report.error = "Default benchmark exceeded its 15000 ms budget"; }
    fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
    fs.writeFileSync(OUTPUT, JSON.stringify(report, null, 2) + "\n");
    const write = text => opts.json ? console.error(text) : console.log(text);
    write(table(report));
    write("GEN3: 2D value noise; no cellular smoothing or mineral-vein phase. BFS is separate topology analysis; fluid time covers source placement only.");
    if (opts.profile) for (const runtime of report.runtimes) for (const row of runtime.rows) {
        for (const sample of row.runs) write(`${runtime.runtime} seed=${row.seed} z=${row.z} run=${sample.run} phases=${JSON.stringify(sample.phases)} memoryFlags=${JSON.stringify(sample.memory.flags)}`);
    }
    write(`RESULT: ${report.status.toUpperCase()} | elapsed ${report.elapsedMs.toFixed(1)} ms | JSON ${OUTPUT}`);
    if (opts.json) console.log(JSON.stringify(report));
    if (report.error) console.error(report.error);
    return report.status === "pass" ? 0 : 1;
}

if (require.main === module) main(process.argv.slice(2)).then(code => { process.exitCode = code; }).catch(error => { console.error(`BENCHMARK ERROR: ${error.stack || error}`); process.exitCode = 2; });
module.exports = { main, benchmarkRuntime, sourceBundle, prepareSource, loadGenerator, tracker, signature, verifySignature, parseArgs, selftest };
