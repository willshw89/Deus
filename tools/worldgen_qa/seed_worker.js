"use strict";

const { performance } = require("perf_hooks");
const { createRuntime } = require("./runtime");
const { LEVELS, GENERATORS, MUTANTS } = require("./contracts");
const { layerFingerprint, stateFingerprint } = require("./fingerprint");
const { surveyViability, provokeViability } = require("./viability");

function run(seed, mutant = "") {
    const started = performance.now();
    let current = "bootstrap", lastTime = started, peakRss = 0, peakHeap = 0;
    const stages = [], checks = [];
    const stage = name => {
        const time = performance.now(), mem = process.memoryUsage();
        peakRss = Math.max(peakRss, mem.rss); peakHeap = Math.max(peakHeap, mem.heapUsed);
        if (current) stages.push({ stage: current, ms: +(time - lastTime).toFixed(3) });
        current = name; lastTime = time;
        console.log("@@stage " + JSON.stringify({ seed, stage: name }));
    };
    const check = (name, ok, detail, caseId = "aggregate") => checks.push({ name, pass: !!ok, seed, stage: current, caseId, detail });
    let runtime, result = {};
    try {
        runtime = createRuntime(stage, { currentStage: () => current });
        const { env } = runtime, W = env.UF.World, L = env.UF.Levels;
        if (mutant === "registration") W.unregisterGenerator("uf_worldgen");
        stage("newWorld");
        env.UF.NewGameSetup = { year: 0, seed, faction: "human", worldSize: 256, fogOfWar: false };
        const world = W.newWorld(seed);
        if (mutant === "completion") world.history.materialization.complete = false;
        if (mutant === "runtime_errors") {
            env.UF.Events.on("qa:provocation", () => { throw new Error("WG.84.01 listener exception provocation"); });
            env.UF.Events.emit("qa:provocation");
        }
        const h = world.history || {}, levels = W.levels();
        check("completion", world === W.state && world.seed === seed && world.size === 256
            && world.areasX === 1 && world.areasY === 1 && levels.join() === LEVELS.join()
            && [-2, -1, 0, 1, 2].every(z => world.levels[z] && world.levels[z].checksum && world.levels[z].gen === 5)
            && h.simulated === false && h.years === 0 && h.worldAge === 0 && env.$ufTime.year === 0
            && h.materialization && h.materialization.complete === true
            && runtime.events.includes("world:initializing") && runtime.events.includes("world:created"),
        { seed: world.seed, size: world.size, levels, year: env.$ufTime.year, years: h.years,
            materialized: h.materialization && h.materialization.complete });

        const maps = new Map(), hashes = {};
        const faults = [];
        const objectCount = env.$ufWorldCatalog.objects.length;
        for (const z of LEVELS) {
            stage(`build:z=${z}`);
            if (z === LEVELS[0] && (mutant === "fatal" || mutant === "timeout")) {
                W.registerGenerator("qa_fault", () => {
                    if (mutant === "fatal") throw new Error("WG.84.01 registered generator throw provocation");
                    while (true) { /* parent process watchdog must terminate this worker */ }
                }, 1, { levels: [z] });
            }
            const before = runtime.calls.length;
            const map = W.buildArea(0, 0, z);
            if (mutant === "worker_protocol" && z === LEVELS[0]) process.exit(0);
            if (mutant === "map_integrity" && z === 0) map.data[0] = NaN;
            if (mutant === "reproducibility" && z === 0) map.ufObjects[0] = (map.ufObjects[0] + 1) % objectCount;
            maps.set(z, map);
            const shape = L.shapeGrid(z, 0, 0), base = L.baseline(z, 0, 0);
            const expected = GENERATORS.filter(n => n === "uf_levels_terrain" ? z !== 0
                : n === "uf_worldgen" ? z >= 0 && z <= 2 : z === -1 || z === -2);
            const called = runtime.calls.slice(before).filter(c => c.z === z).map(c => c.name);
            if (called.join() !== expected.join()) faults.push(`z=${z} generators=${called} expected=${expected}`);
            const n = 256 * 256;
            const bad = !map || map.width !== 256 || map.height !== 256 || map.ufArea.z !== z
                || map.data.length !== n * 6 || map.ufObjects.length !== n || shape.length !== n
                || base.material.length !== n
                || !map.data.every(t => Number.isInteger(t) && t >= 0 && t < 8192)
                || !map.ufObjects.every(t => t >= 0 && t <= objectCount)
                || !shape.every(s => s >= 1 && s <= 7);
            check("map_integrity", !bad, { z, tiles: map && map.data.length, objects: map && map.ufObjects.length,
                shapes: shape.length, materials: base.material.length }, `z:${z}`);
            hashes[z] = layerFingerprint(runtime, map, z);
        }
        stage("registration");
        check("registration", W.generators().join() === GENERATORS.join() && faults.length === 0,
            { registered: W.generators(), faults });

        stage("viability");
        if (mutant in MUTANTS && !["seed_count", "registration", "completion", "map_integrity", "stability", "state_stability",
            "reproducibility", "runtime_errors", "worker_protocol", "fatal", "timeout"].includes(mutant)) {
            result.provocation = provokeViability(mutant, runtime, maps);
        }
        result.viability = surveyViability(runtime, maps, check);

        // Rebuild fresh maps in reverse order, after clearing the World peek cache.
        // The cold-process pair in the parent separately excludes shared baseline caches.
        const stateBeforeRebuild = stateFingerprint(world);
        W.clearPeekCache(); L.invalidateFloods();
        for (const z of [...LEVELS].reverse()) {
            stage(`stability:z=${z}`);
            const again = W.buildArea(0, 0, z);
            if (mutant === "stability" && z === 0) again.data[0] = again.data[0] === 0 ? 1 : 0;
            if (mutant === "state_stability" && z === 0) world.nextUnitId++;
            const hash = layerFingerprint(runtime, again, z);
            check("stability", hash === hashes[z], { z, first: hashes[z], rebuilt: hash }, `z:${z}`);
        }
        check("stability", JSON.stringify(stateBeforeRebuild) === JSON.stringify(stateFingerprint(world)),
            { part: "saved world truth before/after reverse rebuild" }, "world_state");
        stage("runtime_errors");
        check("runtime_errors", runtime.errors.length === 0, runtime.errors);
        check("fatal", maps.size === LEVELS.length && result.viability !== undefined,
            "all level builds and viability survey returned");
        result = { ...result, hashes, stateHashes: stateFingerprint(world), plugins: runtime.names,
            warningCount: runtime.warnings.length, warnings: runtime.warnings, logs: runtime.logs };
    } catch (error) {
        check("fatal", false, error && error.stack || String(error));
        if (runtime) check("runtime_errors", runtime.errors.length === 0, runtime.errors);
    }
    stage("finished");
    return { seed, mutant, ...result, checks, stages, ms: +(performance.now() - started).toFixed(3),
        memory: { peakSampledRss: peakRss, peakSampledHeap: peakHeap, maxRssKiB: process.resourceUsage().maxRSS } };
}

if (require.main === module) {
    const seed = Number(process.argv[2]), mutant = process.argv[3] || "";
    if (!Number.isInteger(seed) || seed < 0 || seed > 0x7fffffff || (mutant && !(mutant in MUTANTS))) {
        console.error("Usage: node tools/worldgen_qa/seed_worker.js <seed> [known-mutant]");
        process.exitCode = 2;
    } else {
        const result = run(seed, mutant);
        console.log("@@result " + JSON.stringify(result));
        process.exitCode = result.checks.some(c => !c.pass) ? 1 : 0;
    }
}
module.exports = { run };
