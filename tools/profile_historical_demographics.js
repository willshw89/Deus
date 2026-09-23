#!/usr/bin/env node
"use strict";

// CODEX-01. Exact-source instrumentation lives only in a private VM string.
// No simulation fields, random draws, catalogs, or production files are changed.
const fs = require("fs"), path = require("path"), vm = require("vm"), crypto = require("crypto"), os = require("os");
const { performance } = require("perf_hooks");
const { spawnSync } = require("child_process");
const ROOT = path.resolve(__dirname, ".."), OUTPUT = path.join(ROOT, "docs/systems/UF_History_Profile.md");
const BASE = "8a40d2ed66da758fc95fc3c1e8205709336c54df";
const PLUGIN = "game/js/plugins/DEUS_HistoricalDemographics.js";
const ENGINE_SHA = "e08ce6104669830e0388fe90631f8002f8547f77484f52263eea3aee34273e95", ENGINE_BYTES = 45429;
const MODULES = ["World", "WorldGen", "Factions", "History", "Levels"];
const PHASES = ["validation", "bookkeeping", "mortality", "mateSearch", "kinship", "pairing", "births", "succession", "sites", "archive", "dispatch"];
const LABELS = { validation: "Validation (excluding kinship)", bookkeeping: "Conditions, clock and start census", mortality: "Mortality", mateSearch: "Mate search/filter/selection (excluding kinship/formation)",
    kinship: "Kinship, including ancestry", pairing: "Household closure/formation", births: "Density and births", succession: "Succession, including heir ancestry", sites: "Site scans/abandonment", archive: "Deceased tier sweep", dispatch: "Call boundaries / instrumentation overhead" };
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const sha = value => crypto.createHash("sha256").update(value).digest("hex");
const clone = value => JSON.parse(JSON.stringify(value));
const sum = values => values.reduce((a, b) => a + b, 0);
const HARNESS_SHA = sha(fs.readFileSync(__filename));
const cpuNow = () => { const c = process.cpuUsage(); return (c.user + c.system) / 1000; };

function args(argv) {
    const out = { seed: 0, years: 500, json: false, compare: false, selftest: false, worker: null };
    for (let i = 0; i < argv.length; i++) {
        const key = argv[i];
        if (["--json", "--compare", "--selftest", "--help"].includes(key)) { out[key.slice(2)] = true; continue; }
        assert(["--seed", "--years", "--worker"].includes(key), `Unknown option ${key}`);
        const value = argv[++i]; assert(value !== undefined && !value.startsWith("--"), `Missing value for ${key}`);
        if (key === "--worker") { assert(["plain", "profile"].includes(value), "Invalid worker mode"); out.worker = value; }
        else { assert(/^\d+$/.test(value), `Invalid ${key}`); out[key.slice(2)] = Number(value); }
    }
    assert(Number.isSafeInteger(out.seed) && out.seed >= 0 && out.seed <= 0x7fffffff, "Seed must be 0..2147483647");
    assert(Number.isSafeInteger(out.years) && out.years >= 1 && out.years <= 10000, "Years must be 1..10000");
    return out;
}
function bundle() {
    const disk = fs.readFileSync(path.join(ROOT, PLUGIN));
    assert(disk.length === ENGINE_BYTES && sha(disk) === ENGINE_SHA, "CANDIDATE_MISMATCH: working plugin differs from CODEX-01 packet");
    const files = {}, sources = [];
    const read = file => {
        const child = spawnSync("git", ["show", `${BASE}:${file}`], { cwd: ROOT, windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
        assert(!child.error && child.status === 0, `Cannot read frozen input ${file}`);
        files[file] = child.stdout.toString("utf8"); sources.push({ path: file, bytes: child.stdout.length, sha256: sha(child.stdout) });
        return files[file];
    };
    const list = {}; vm.runInNewContext(read("game/js/plugins.js"), list, { timeout: 1000 });
    const plugins = list.$plugins.filter(p => p.status && MODULES.includes(p.name.replace(/^DEUS_/, "")));
    assert(plugins.map(p => p.name).join() === MODULES.map(n => `DEUS_${n}`).join(), "Frozen bootstrap order changed");
    plugins.forEach(p => read(`game/js/plugins/${p.name}.js`));
    const catalog = JSON.parse(read("game/data/UF_WorldCatalog.json")); read(PLUGIN);
    assert(Buffer.byteLength(files[PLUGIN]) === ENGINE_BYTES && sha(files[PLUGIN]) === ENGINE_SHA, "Frozen candidate hash/bytes mismatch");
    return { files, sources, plugins, catalog, sourceDigest: sha(JSON.stringify(sources)) };
}
function once(source, anchor, replacement) {
    assert(source.split(anchor).length === 2, `Instrumentation anchor missing or ambiguous: ${anchor.slice(0, 110)}`);
    return source.replace(anchor, replacement);
}
function instrument(raw) {
    let source = raw.replace(/\r\n/g, "\n");
    source = once(source, '    const UF = window.DEUS || window.UF;', '    const __p = globalThis.__historyProbe;\n    const UF = window.DEUS || window.UF;');
    // Function-level try/finally observes every early return without changing it.
    const wrap = (name, signature, next, phase) => {
        source = once(source, signature, `${signature}\n        const __frame = __p.enter("${phase}");\n        try {`);
        source = once(source, `\n    }\n    function ${next}`, `\n        } finally { __p.leave(__frame); }\n    }\n    function ${next}`);
    };
    wrap("validate", "    function validate(state) {", "conditionsValid", "validation");
    wrap("conditionsValid", "    function conditionsValid(state, conditions) {", "step", "bookkeeping");
    wrap("kinshipRelated", "    function kinshipRelated(state, a, b) {", "emit", "kinship");
    wrap("partner", "    function partner(state, mother, father, imported = false) {", "fertile", "pairing");
    wrap("pair", "    function pair(state) {", "succession", "mateSearch");
    wrap("succession", "    function succession(state, initial = {}) {", "create", "succession");
    // Step spans are exact existing statement ranges. No enclosing block changes
    // the lexical scope of startOfYearPopulation, which is consumed by births.
    source = once(source, '        check(state.currentYear < 1000000', '        const __setup = __p.enter("bookkeeping");\n        check(state.currentYear < 1000000');
    source = once(source, '        const casualties = new Set(conditions.casualtyIds || []);', '        __p.leave(__setup);\n        const __mortality = __p.enter("mortality");\n        const casualties = new Set(conditions.casualtyIds || []);');
    source = once(source, '        for (const h of state.partnerships.filter(h => h.toYear === null)) {\n            if (!alive', '        __p.leave(__mortality);\n        const __closure = __p.enter("pairing");\n        for (const h of state.partnerships.filter(h => (__p.hit("closurePartnershipVisits"), h.toYear === null))) {\n            __p.hit("activeHouseholdsForClosure");\n            if (!alive');
    source = once(source, '        pair(state);\n        const capModel', '        __p.leave(__closure);\n        pair(state);\n        const __births = __p.enter("births");\n        const capModel');
    source = once(source, '        succession(state);\n        for (const s of state.sites)', '        __p.leave(__births);\n        succession(state);\n        const __sites = __p.enter("sites");\n        for (const s of state.sites)');
    source = once(source, '        for (const p of state.people) if (p.tier === "recent" && state.currentYear - p.died >= state.config.recentYears) p.tier = "historic";',
        '        __p.leave(__sites);\n        const __archive = __p.enter("archive");\n        for (const p of state.people) { __p.hit("archiveRecordVisits"); if (p.tier === "recent" && state.currentYear - p.died >= state.config.recentYears) { __p.hit("archiveTransitions"); p.tier = "historic"; } }\n        __p.leave(__archive);');
    // Counts preserve short-circuit order and the original predicates/array order.
    const replacements = [
        ['for (const p of state.people.filter(alive)) {', 'for (const p of state.people.filter(p => (__p.hit("mortalityRecordVisits"), alive(p)))) {\n            __p.hit("livingMortalityAssessments");'],
        ['const available = state.people.filter(p => fertile(state, p) && p.partnershipId === null);', 'const available = state.people.filter(p => (__p.hit("pairRecordVisits"), fertile(state, p) && p.partnershipId === null));\n        __p.hit("availableCandidates", available.length);'],
        ['available.filter(p => p.gender === "female")', 'available.filter(p => (__p.hit("availableGenderVisits"), p.gender === "female"))'],
        ['const candidates = available.filter(p => p.gender === "male" && p.partnershipId === null && p.siteId === mother.siteId && p.species === mother.species && p.factionId === mother.factionId && !kinshipRelated(state, p.id, mother.id));', 'const candidates = available.filter(p => (__p.hit("mateCandidateVisits"), p.gender === "male" && p.partnershipId === null && p.siteId === mother.siteId && p.species === mother.species && p.factionId === mother.factionId && !kinshipRelated(state, p.id, mother.id)));\n            __p.hit("prospectiveMothers"); __p.hit("eligibleMateCandidates", candidates.length);'],
        ['check(state.partnerships.some(h => h.motherId === m.id && h.fatherId === f.id && h.siteId === p.siteId && h.fromYear <= p.born && (h.toYear === null || h.toYear > p.born)),', 'check(state.partnerships.some(h => (__p.hit("validationBirthPartnershipVisits"), h.motherId === m.id && h.fatherId === f.id && h.siteId === p.siteId && h.fromYear <= p.born && (h.toYear === null || h.toYear > p.born))),'],
        ['for (const [i, p] of state.people.entries()) {', 'for (const [i, p] of state.people.entries()) {\n            __p.hit("validationPeopleVisits");'],
        ['for (const [i, h] of state.partnerships.entries()) {', 'for (const [i, h] of state.partnerships.entries()) {\n            __p.hit("validationPartnershipVisits");'],
        ['function ancestor(state, parentId, personId) {', 'function ancestor(state, parentId, personId) {\n        __p.hit("ancestorCalls");'],
        ['const id = pending.pop();', 'const id = pending.pop(); __p.hit("ancestorPendingPops");'],
        ['if (state.people[id].parents) pending.push(...state.people[id].parents);', 'if (state.people[id].parents) { __p.hit("ancestorEdgesPushed", state.people[id].parents.length); pending.push(...state.people[id].parents); }'],
        ['const living = state.people.filter(p => p.factionId === faction.id && alive(p));', 'const living = state.people.filter(p => (__p.hit("successionRecordVisits"), p.factionId === faction.id && alive(p)));\n            __p.hit("successionSearches"); __p.hit("successionLivingCandidates", living.length);'],
        ['living.filter(p => ancestor(state, prior.personId, p.id))', 'living.filter(p => (__p.hit("heirCandidates"), ancestor(state, prior.personId, p.id)))'],
        ['for (const h of state.partnerships.filter(h => h.toYear === null)) {', 'for (const h of state.partnerships.filter(h => (__p.hit("birthPartnershipVisits"), h.toYear === null))) {\n            __p.hit("activeBirthHouseholds");'],
        ['const rng = random(state, state.currentYear, h.id, 0x42495254);', 'const rng = random(state, state.currentYear, h.id, 0x42495254);\n            __p.hit("eligibleBirthDraws");'],
        ['startOfYearPopulation.set(s.id, s.population);', '__p.hit("startCensusSiteVisits"); startOfYearPopulation.set(s.id, s.population);'],
        ['s.peakPopulation = Math.max(s.peakPopulation, s.population);', '__p.hit("siteUpdateVisits"); s.peakPopulation = Math.max(s.peakPopulation, s.population);']
    ];
    for (const [a, b] of replacements) source = once(source, a, b);
    return source;
}
class Probe {
    constructor() { this.active = false; this.stack = []; }
    warm() {
        // Initialize only observer methods/records. No engine call or state exists.
        for (let i = 0; i < 20; i++) {
            this.start(); const cpu = cpuNow(), wall = performance.now(); this.openCall();
            const validation = this.enter("validation"), kinship = this.enter("kinship");
            this.hit("ancestorCalls"); this.leave(kinship); this.leave(validation);
            for (const phase of PHASES.filter(p => !["validation", "kinship", "dispatch"].includes(p))) this.leave(this.enter(phase));
            this.closeCall(); this.finish(performance.now() - wall, cpuNow() - cpu);
        }
    }
    start() {
        this.active = true; this.stack = []; this.counts = {};
        this.phases = Object.fromEntries(PHASES.map(p => [p, { wallMs: 0, cpuMs: 0, inclusiveWallMs: 0, inclusiveCpuMs: 0, calls: 0 }]));
        this.kinshipByCaller = {};
    }
    openCall() { this.callWall = performance.now(); this.callCpu = cpuNow(); this.firstSpan = true; this.lastRootLeave = null; }
    boundary(wallMs, cpuMs) {
        const p = this.phases.dispatch; p.wallMs += wallMs; p.cpuMs += cpuMs; p.inclusiveWallMs += wallMs; p.inclusiveCpuMs += cpuMs; p.calls++;
    }
    closeCall() {
        const cpu = cpuNow(), wall = performance.now();
        assert(this.lastRootLeave && this.lastRootLeave.phase === "archive" && this.stack.length === 0, "Missing final archive phase boundary");
        this.boundary(wall - this.lastRootLeave.wall, cpu - this.lastRootLeave.cpu);
    }
    enter(phase) {
        if (!this.active) return null;
        const frame = { phase, wall: performance.now(), cpu: cpuNow(), childWall: 0, childCpu: 0 };
        if (this.firstSpan) { assert(phase === "validation", "Missing first validation phase boundary"); this.firstSpan = false; this.boundary(frame.wall - this.callWall, frame.cpu - this.callCpu); }
        if (phase === "kinship") {
            const caller = this.stack.length ? this.stack[this.stack.length - 1].phase : "external";
            this.kinshipByCaller[caller] = (this.kinshipByCaller[caller] || 0) + 1;
        }
        this.stack.push(frame); return frame;
    }
    leave(frame) {
        if (!frame) return;
        const endCpu = cpuNow(), endWall = performance.now(), cpu = endCpu - frame.cpu, wall = endWall - frame.wall;
        assert(this.stack.pop() === frame, "Timer stack corrupted");
        const p = this.phases[frame.phase]; p.calls++; p.wallMs += wall - frame.childWall; p.cpuMs += cpu - frame.childCpu;
        p.inclusiveWallMs += wall; p.inclusiveCpuMs += cpu;
        if (this.stack.length) { const parent = this.stack[this.stack.length - 1]; parent.childWall += wall; parent.childCpu += cpu; }
        else this.lastRootLeave = { wall: endWall, cpu: endCpu, phase: frame.phase };
    }
    hit(name, count = 1) {
        if (!this.active) return;
        this.counts[name] = (this.counts[name] || 0) + count;
        if (name.startsWith("ancestor")) {
            const caller = this.stack.length ? this.stack[this.stack.length - 1].phase : "external";
            const key = `${name}:${caller}`; this.counts[key] = (this.counts[key] || 0) + count;
        }
    }
    finish(wallMs, cpuMs) {
        this.active = false; assert(this.stack.length === 0, "Unclosed timer span");
        return { wallMs, cpuMs, phases: this.phases, counters: this.counts, kinshipByCaller: this.kinshipByCaller,
            unattributedWallMs: wallMs - sum(Object.values(this.phases).map(p => p.wallMs)),
            unattributedCpuMs: cpuMs - sum(Object.values(this.phases).map(p => p.cpuMs)) };
    }
}
function load(data, seed, probe = null, injectedSource = null) {
    const ns = {}, errors = [], math = Object.create(Math);
    math.random = () => { throw new Error("UNSEEDED_RANDOM: Math.random is forbidden"); };
    const env = { window: null, UF: ns, DEUS: ns, Math: math, performance, __historyProbe: probe,
        $ufWorldCatalog: clone(data.catalog), PluginManager: { parameters: name => (data.plugins.find(p => p.name === name) || {}).parameters || {}, registerCommand() {} },
        DataManager: { _databaseFiles: [], onLoad() {}, isBattleTest: () => false, isEventTest: () => false }, Input: { keyMapper: {} }, TouchInput: {},
        SceneManager: { _scene: null }, Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 }, $gameMap: { mapId: () => 0 }, $gamePlayer: {}, $gameSystem: {},
        ImageManager: { loadTileset() { throw new Error("Unexpected renderer"); } }, Utils: { isOptionValid: () => false },
        console: { log() {}, warn() {}, error: (...values) => errors.push(values.map(String).join(" ")) } };
    env.window = env; env.$deusWorldCatalog = env.$ufWorldCatalog;
    const sources = data.plugins.map(p => data.files[`game/js/plugins/${p.name}.js`]);
    const names = new Set(["Sprite", "Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot", "Rectangle"]);
    for (const source of sources) for (const m of source.matchAll(/\b((?:Game|Scene|Window|Spriteset|Sprite)_[A-Za-z0-9_]+)\.prototype/g)) names.add(m[1]);
    for (const name of names) env[name] = function() { throw new Error(`Unexpected engine constructor ${name}`); };
    for (const source of sources) for (const m of source.matchAll(/\b((?:Game|Scene|Window|Spriteset|Sprite)_[A-Za-z0-9_]+)\.prototype\.([A-Za-z0-9_]+)/g))
        env[m[1]].prototype[m[2]] = () => { throw new Error(`Unexpected engine method ${m[1]}.${m[2]}`); };
    const context = vm.createContext(env);
    vm.runInContext(["Math", "Object", "Array", "Number", "String", "Boolean", "Map", "Set", "JSON", "Date", "Uint8Array", "Uint16Array", "Int32Array", "Float32Array", "performance", "window"]
        .map(n => `const ${n} = globalThis.${n};`).join("\n"), context);
    data.plugins.forEach((p, i) => vm.runInContext(sources[i], context, { filename: p.name, timeout: 10000 }));
    const world = ns.World.newWorld(seed); ns.Levels.ensureWorldLevels(world); ns.Factions.generate(world); ns.History.generate(world);
    const canonical = JSON.stringify(world);
    const source = injectedSource || (probe ? instrument(data.files[PLUGIN]) : data.files[PLUGIN]);
    vm.runInContext(source, context, { filename: PLUGIN, timeout: 10000 });
    assert(JSON.stringify(world) === canonical && errors.length === 0, "Plugin load changed world or emitted errors");
    return { api: ns.HistoricalDemographics, world, canonical, errors, context, instrumentedSha256: probe ? sha(source) : null };
}
function invariantSeed(state, seed) { assert(state.seed === seed, `SEED_CHANGED: expected ${seed}, got ${state.seed}`); }
function metrics(state, oldLength, oldLiving) {
    const livingBySpecies = Object.fromEntries(Object.keys(state.config.profiles).map(id => [id, 0]));
    let living = 0, fertileIndividuals = 0, maxGenerationDepth = 0;
    for (const p of state.people) {
        maxGenerationDepth = Math.max(maxGenerationDepth, p.generation);
        if (p.died !== null) continue;
        living++; livingBySpecies[p.species]++;
        const [a, b] = state.config.profiles[p.species].reproductiveAge, age = state.currentYear - p.born;
        if (age >= a && age <= b) fertileIndividuals++;
    }
    const births = state.people.length - oldLength;
    return { livingBySpecies, living, totalRecords: state.people.length, deceased: state.people.length - living,
        partnerships: state.partnerships.length, activePartnerships: state.partnerships.filter(h => h.toYear === null).length,
        fertileIndividuals, births, deaths: oldLiving + births - living, maxGenerationDepth, eventsRetained: state.events.length };
}
function accounting(rows) {
    const wallMs = sum(rows.map(r => r.wallMs)), measuredMs = sum(rows.map(r => sum(Object.values(r.phases).map(p => p.wallMs))));
    const errorRatio = Math.abs(wallMs - measuredMs) / wallMs;
    assert(wallMs > 0 && errorRatio < .05, `TIMER_ACCOUNTING: phase error ${(errorRatio * 100).toFixed(3)}% exceeds 5%`);
    return { status: "PASS", wallMs, measuredMs, errorRatio, maximumAnnualErrorRatio: Math.max(...rows.map(r => Math.abs(r.unattributedWallMs) / r.wallMs)),
        annualRowsAboveFivePercent: rows.filter(r => Math.abs(r.unattributedWallMs) / r.wallMs >= .05).length };
}
function warningSlow(actualMs, referenceMs, factor = 2) {
    return actualMs > Math.max(5, referenceMs * factor) ? { code: "SLOW_PATH", actualMs, referenceMs, factor } : null;
}
function run(data, seed, years, profiled, injectedSource = null) {
    const started = performance.now(), probe = profiled ? new Probe() : null;
    if (probe) probe.warm();
    const loaded = load(data, seed, probe, injectedSource);
    const state = loaded.api.create(loaded.world, { eventLimit: 1000000 });
    invariantSeed(state, seed);
    const initialBytes = JSON.stringify(state), setupMs = performance.now() - started, annual = [], checkpoints = [];
    let previous = metrics(state, state.people.length, state.people.length), simulationWallMs = 0, simulationCpuMs = 0, observationMs = 0;
    for (let year = 1; year <= years; year++) {
        invariantSeed(state, seed); if (probe) probe.start();
        const cpu = cpuNow(), t = performance.now();
        if (probe) probe.openCall(); loaded.api.step(state); if (probe) probe.closeCall();
        const wallMs = performance.now() - t, cpuMs = cpuNow() - cpu;
        const timing = probe ? probe.finish(wallMs, cpuMs) : { wallMs, cpuMs };
        simulationWallMs += wallMs; simulationCpuMs += cpuMs;
        const observed = performance.now(); invariantSeed(state, seed);
        if (probe) {
            for (const key of ["validation", "mortality", "mateSearch", "births", "succession", "sites", "archive"])
                assert(timing.phases[key].calls === 1, `Missing or duplicate annual phase: ${key}`);
            assert(timing.phases.bookkeeping.calls === 2 && timing.phases.dispatch.calls === 2 && timing.phases.pairing.calls >= 1, "Invalid annual timer coverage");
            for (const key of ["mortalityRecordVisits", "pairRecordVisits", "validationPeopleVisits"])
                assert(timing.counters[key] === previous.totalRecords, `Counter mismatch: ${key}`);
            assert(timing.counters.archiveRecordVisits === state.people.length && timing.counters.livingMortalityAssessments === previous.living,
                "Counter mismatch: archive or living mortality census");
            assert(sum(Object.values(timing.kinshipByCaller)) === timing.phases.kinship.calls, "Counter mismatch: kinship callers");
        }
        const m = metrics(state, previous.totalRecords, previous.living); previous = m;
        annual.push({ years: year, engineYear: state.currentYear, ...m, ...timing });
        if ([100, 250, 500, years].includes(year)) {
            const text = JSON.stringify(state), events = JSON.stringify(state.events);
            assert(state.eventsDiscarded === 0, "Chronicle truncated");
            checkpoints.push({ years: year, stateBytes: Buffer.byteLength(text), stateSha256: sha(text), eventsSha256: sha(events), stateText: text, eventsText: events });
        }
        observationMs += performance.now() - observed;
        if (year % 100 === 0) console.error(`${profiled ? "profile" : "plain"} seed ${seed}: ${year}/${years}, ${m.living} living, ${m.totalRecords} records`);
    }
    const checkStart = performance.now(); loaded.api.validate(state);
    assert(JSON.stringify(loaded.world) === loaded.canonical && loaded.errors.length === 0, "Run changed canonical world or emitted errors");
    const postValidationMs = performance.now() - checkStart;
    return { seed, years, mode: profiled ? "profile" : "plain", workerPid: process.pid, sourceDigest: data.sourceDigest, harnessSha256: HARNESS_SHA,
        instrumentedSha256: loaded.instrumentedSha256, setupMs, simulationWallMs, simulationCpuMs, observationMs, postValidationMs,
        totalWallMs: performance.now() - started, initialBytes, annual, checkpoints, accounting: probe ? accounting(annual) : null };
}
function compare(a, b) {
    assert(a.seed === b.seed && a.years === b.years && a.sourceDigest === b.sourceDigest && a.harnessSha256 === b.harnessSha256, "Run identity mismatch");
    assert(a.initialBytes === b.initialBytes, "INSTRUMENTATION_STATE_CHANGED: initial state");
    assert(a.checkpoints.length === b.checkpoints.length, "Checkpoint coverage mismatch");
    for (let i = 0; i < a.checkpoints.length; i++) {
        const x = a.checkpoints[i], y = b.checkpoints[i];
        assert(x.years === y.years && x.stateText === y.stateText && x.eventsText === y.eventsText && x.stateSha256 === y.stateSha256 && x.eventsSha256 === y.eventsSha256,
            `INSTRUMENTATION_STATE_CHANGED: checkpoint ${x.years}`);
    }
    const biology = r => r.annual.map(({ years, engineYear, livingBySpecies, living, totalRecords, deceased, partnerships, activePartnerships, fertileIndividuals, births, deaths, maxGenerationDepth, eventsRetained }) =>
        ({ years, engineYear, livingBySpecies, living, totalRecords, deceased, partnerships, activePartnerships, fertileIndividuals, births, deaths, maxGenerationDepth, eventsRetained }));
    assert(JSON.stringify(biology(a)) === JSON.stringify(biology(b)), "INSTRUMENTATION_STATE_CHANGED: annual demographics");
    return { status: "PASS", method: "Exact initial/checkpoint state and event bytes, hashes, and every annual demographic metric; distinct worker processes", checkpoints: a.checkpoints.map(c => c.years) };
}
function selftest(data) {
    const checks = [];
    const check = (name, fn) => { fn(); checks.push({ name, status: "PASS" }); };
    const reject = (fn, pattern) => { let error; try { fn(); } catch (e) { error = e; } assert(error && pattern.test(error.message), `Negative control did not reject as intended: ${error && error.message}`); return error.message; };
    check("CLI bounds and defaults", () => { assert(args([]).years === 500 && args([]).seed === 0, "Bad defaults"); for (const a of [["--years", "0"], ["--seed", "1.5"], ["--seed"], ["--unknown"]]) reject(() => args(a), /Invalid|Missing|Unknown|Years/); });
    check("Instrumentation rejects missing unique anchor", () => reject(() => instrument(data.files[PLUGIN].replace("function pair(state)", "function wrong(state)")), /anchor/));
    check("Unseeded randomness mutation is caught", () => {
        const bad = once(data.files[PLUGIN], "        validate(state); conditionsValid(state, conditions);", "        Math.random(); validate(state); conditionsValid(state, conditions);");
        reject(() => run(data, 0, 1, false, bad), /UNSEEDED_RANDOM/);
    });
    check("Changed persistent seed mutation is caught", () => {
        const bad = once(data.files[PLUGIN], "        validate(state); conditionsValid(state, conditions);", "        state.seed++; validate(state); conditionsValid(state, conditions);");
        reject(() => run(data, 0, 1, false, bad), /SEED_CHANGED/);
    });
    let plain, profiled;
    check("Instrumented and unchanged trajectories retain identical bytes", () => { plain = run(data, 0, 100, false); profiled = run(data, 0, 100, true); compare(plain, profiled); });
    check("Independent outer timer agrees with exclusive spans within 5%", () => accounting(profiled.annual));
    check("Missing phase mutation fails timer accounting", () => {
        const bad = clone(profiled.annual);
        const largest = PHASES.slice().sort((a, b) => sum(bad.map(r => r.phases[b].wallMs)) - sum(bad.map(r => r.phases[a].wallMs)))[0];
        for (const row of bad) row.phases[largest].wallMs = 0;
        reject(() => accounting(bad), /TIMER_ACCOUNTING/);
    });
    check("Changed checkpoint bytes fail equality", () => { const bad = clone(profiled); bad.checkpoints[0].stateText += " "; reject(() => compare(plain, bad), /INSTRUMENTATION_STATE_CHANGED/); });
    check("Synthetic slow-path execution triggers warning", () => {
        const source = once(data.files[PLUGIN], "        validate(state); conditionsValid(state, conditions);", "        { const until = performance.now() + 20; while (performance.now() < until) {} }\n        validate(state); conditionsValid(state, conditions);");
        const normal = run(data, 0, 1, false), slow = run(data, 0, 1, false, source);
        assert(warningSlow(slow.simulationWallMs, normal.simulationWallMs), "Slow control did not trigger warning");
        assert(!warningSlow(1, 1), "Normal control incorrectly warned");
    });
    return { status: "PASS", passed: checks.length, checks };
}
function worker(data, seed, years, mode) {
    const started = performance.now(), child = spawnSync(process.execPath, [__filename, "--worker", mode, "--seed", String(seed), "--years", String(years)],
        { cwd: ROOT, windowsHide: true, encoding: "utf8", timeout: 300000, maxBuffer: 128 * 1024 * 1024 });
    if (child.stderr) console.error(child.stderr.trim());
    assert(!child.error && child.status === 0, `${mode} seed ${seed} worker failed: ${child.error ? child.error.code + ': ' + child.error.message : child.status}; ${(child.stderr || '').slice(-4000)}`);
    const result = JSON.parse(child.stdout);
    assert(result.sourceDigest === data.sourceDigest && result.harnessSha256 === HARNESS_SHA, "Worker input/source identity mismatch");
    result.processWallMs = performance.now() - started; return result;
}
function summarize(plain, profile) {
    const phases = Object.fromEntries(PHASES.map(name => [name, Object.fromEntries(["wallMs", "cpuMs", "inclusiveWallMs", "inclusiveCpuMs", "calls"].map(k => [k, sum(profile.annual.map(r => r.phases[name][k]))]))]));
    const counters = {}, kinshipByCaller = {};
    for (const row of profile.annual) {
        for (const [key, count] of Object.entries(row.counters)) counters[key] = (counters[key] || 0) + count;
        for (const [key, count] of Object.entries(row.kinshipByCaller)) kinshipByCaller[key] = (kinshipByCaller[key] || 0) + count;
    }
    return { seed: plain.seed, years: plain.years, plainSimulationWallMs: plain.simulationWallMs, plainSimulationCpuMs: plain.simulationCpuMs,
        profileSimulationWallMs: profile.simulationWallMs, profileSimulationCpuMs: profile.simulationCpuMs,
        observerOverheadRatio: profile.simulationWallMs / plain.simulationWallMs - 1,
        observerOverheadWarning: warningSlow(profile.simulationWallMs, plain.simulationWallMs), phases, counters, kinshipByCaller,
        horizons: profile.checkpoints.map(c => ({ years: c.years, plainWallMs: sum(plain.annual.slice(0, c.years).map(r => r.wallMs)), plainCpuMs: sum(plain.annual.slice(0, c.years).map(r => r.cpuMs)),
            profileWallMs: sum(profile.annual.slice(0, c.years).map(r => r.wallMs)), profileCpuMs: sum(profile.annual.slice(0, c.years).map(r => r.cpuMs)),
            phases: Object.fromEntries(PHASES.map(p => [p, { wallMs: sum(profile.annual.slice(0, c.years).map(r => r.phases[p].wallMs)), cpuMs: sum(profile.annual.slice(0, c.years).map(r => r.phases[p].cpuMs)) }])) })),
        final: profile.annual[profile.annual.length - 1], accounting: profile.accounting };
}
const table = (headers, rows) => ["| " + headers.join(" | ") + " |", "| " + headers.map(() => "---").join(" | ") + " |", ...rows.map(r => "| " + r.join(" | ") + " |")].join("\n");
const ms = n => n.toFixed(3), pct = n => (n * 100).toFixed(2) + "%";
function compactAnnualJSON(report) {
    const rows = [];
    let text = JSON.stringify(report, (key, value) => {
        if (key !== "annual") return value;
        rows.push(value); return `__ANNUAL_ROWS_${rows.length - 1}__`;
    }, 2);
    rows.forEach((list, i) => { text = text.replace(`"__ANNUAL_ROWS_${i}__"`, "[\n" + list.map(r => JSON.stringify(r)).join(",\n") + "\n]"); });
    return text;
}
function markdown(report) {
    const lines = ["# HIST-09 historical demographics performance profile", "", `Task: DEUS-TSK-CODEX-01. Captured ${report.createdAt}. Result: **${report.status}**.`, "",
        `Frozen commit: \`${BASE}\`. Plugin: \`${PLUGIN}\`, ${ENGINE_BYTES} raw bytes, SHA-256 \`${ENGINE_SHA}\`.`, "",
        "Only this report and `tools/profile_historical_demographics.js` belong to this task. The task's explicit two-file boundary supersedes routine STATUS/VISION edits. Production, catalogs, Astra verifiers, and settlement files remain read-only. This is telemetry, not an official Astra revalidation or a production optimization.", "",
        "## Running the tool", "", "```text", "node tools/profile_historical_demographics.js", "node tools/profile_historical_demographics.js --seed 424242 --years 250 --json", "node tools/profile_historical_demographics.js --compare --json", "node tools/profile_historical_demographics.js --selftest", "```", "",
        "Default is seed 0 for 500 elapsed historical years. `--compare` selects seeds 0, 424242, and 20260919. Every selected seed gets a fresh unmodified worker and a separate instrumented worker. `--json` prints the structured report to stdout; the same data is embedded below. A normal run overwrites this one allowed markdown report; self-test does not. Custom years retain checkpoints at 100/250/500 when reached and at the final year.", "",
        "## Measurement method", "",
        `Runtime: ${report.runtime.node}; ${report.runtime.cpu}. Sequential fresh workers, plain then profiled. Production dependencies and catalogs are raw Git blobs from the frozen commit. The inspected working candidate must match before execution and after completion. Harness SHA-256: \`${report.provenance.harnessSha256}\`.`, "",
        "Exact uniquely matched anchors add timers/counters only to a private source string before VM compilation. The file and simulation state are never patched. Internal lexical calls require these probes; replacing exported methods would miss validation and kinship calls. Every annual demographic metric and exact state/event bytes at all checkpoints are compared against the untouched worker. Full chronicle retention uses the same `eventLimit: 1000000` as the Astra baseline and is asserted untruncated; this option is disclosed and identical in both workers.", "",
        "Phase wall milliseconds use `performance.now()`; CPU milliseconds use deltas of `process.cpuUsage()` (process-wide user plus system, including any V8 helper threads). Neither is a hardware-cycle measurement. Nested kinship time is subtracted from validation/mate-search before exclusive totals are added. Ancestor work stays inside kinship or succession. Kinship inclusive time and counts are also retained. CPU granularity can produce tiny negative exclusive values; raw measurements remain visible.", "",
        "The independent outer timer surrounds `api.step` and observer call-boundary hooks. Setup, census diagnostics, serialization, checkpoint comparison and final validation are separate. Twenty empty observer cycles initialize timer machinery during setup without calling the engine or touching a simulation state. No forced GC. Entry and return boundaries are independently measured intervals that can include lazy compilation and observer overhead; they are not inferred JIT measurements. Unattributed intermediate gaps are reported, never filled with an artificial residual phase. First validation, final archive, and mandatory phase-call counts are asserted. The accounting check requires cumulative exclusive wall spans within 5% of independently measured annual-call time; annual gaps and outlier counts are disclosed. Timer/counter overhead changes the measured run, so profiled phase costs must not be presented as exact untouched-production costs. Plain timing is the control; overhead is reported, not subtracted heuristically.", "",
        "## Comparative results", "",
        table(["Seed", "Plain step wall ms", "Profiled step wall ms", "Plain CPU ms", "Profile CPU ms", "Observed overhead", "Living", "Historical records", "Kinship calls", "Accounting error"], report.results.map(r => {
            const s = r.summary; return [s.seed, ms(s.plainSimulationWallMs), ms(s.profileSimulationWallMs), ms(s.plainSimulationCpuMs), ms(s.profileSimulationCpuMs), pct(s.observerOverheadRatio), s.final.living, s.final.totalRecords, s.phases.kinship.calls, pct(s.accounting.errorRatio)]; })), ""];
    for (const r of report.results) {
        const s = r.summary;
        lines.push(`### Seed ${s.seed}: exclusive phase costs over ${s.years} years`, "", table(["Phase", "Wall ms", "CPU ms", "Share of measured step wall", "Timed spans"], PHASES.map(p => [LABELS[p], ms(s.phases[p].wallMs), ms(s.phases[p].cpuMs), pct(s.phases[p].wallMs / s.profileSimulationWallMs), s.phases[p].calls])), "",
            `Byte equality: **${r.equality.status}**. Cumulative timer error ${pct(s.accounting.errorRatio)}; maximum annual gap ${pct(s.accounting.maximumAnnualErrorRatio)}; ${s.accounting.annualRowsAboveFivePercent} annual rows exceed 5%.`, "",
            table(["Horizon", "Living", "Records", "Active households", "Fertile people", "Max generation", "State SHA-256", "Events SHA-256"], r.profile.checkpoints.map(c => { const a = r.profile.annual[c.years - 1]; return [c.years, a.living, a.totalRecords, a.activePartnerships, a.fertileIndividuals, a.maxGenerationDepth, `\`${c.stateSha256}\``, `\`${c.eventsSha256}\``]; })), "",
            table(["Horizon", "Plain wall ms", "Profile wall ms", "Plain CPU ms", "Profile CPU ms"], s.horizons.map(h => [h.years, ms(h.plainWallMs), ms(h.profileWallMs), ms(h.plainCpuMs), ms(h.profileCpuMs)])), "");
    }
    lines.push("## Structural interpretation", "",
        "Let P be all historical people, H all partnerships, U unpartnered fertile people, F prospective mothers, and J the retained JSON graph. Annual validation walks J, scans people/households, checks historical kinship, and executes `partnerships.some` for every nonfounder: a worst-case O(P×H) association scan. `validationBirthPartnershipVisits` records actual predicate evaluations, including short-circuit exits. Population saturation does not bound archived records or this work.", "",
        "Mate search scans P, then U for females and U for each prospective mother: O(P + F×U) before kinship ancestry. `mateCandidateVisits` measures actual filtering work, while kinship caller counts distinguish mating from historical validation. The new candidate prunes ancestor walks by birth dates; `ancestorPendingPops` and `ancestorEdgesPushed` show actual traversal work rather than inferring it from generation depth alone. Edge counts cover subsequent pending.push operations, excluding the initial parents.slice entries.", "",
        "Mortality and archive loops still scan P annually. Household closure and births scan H. Succession normally checks each faction and continues with its living ruler; replacement scans and heir walks occur only when needed. Site updates are O(S). The structural limits are source analysis, not a fitted empirical complexity proof.", "",
        table(["Seed", "Validation birth/household predicate visits", "Mate candidate visits", "Ancestor pops", "Kinship calls from validation", "Kinship calls from mate search", "Succession searches", "Archive records visited"], report.results.map(r => { const s = r.summary; return [s.seed, s.counters.validationBirthPartnershipVisits || 0, s.counters.mateCandidateVisits || 0, s.counters.ancestorPendingPops || 0, s.kinshipByCaller.validation || 0, s.kinshipByCaller.mateSearch || 0, s.counters.successionSearches || 0, s.counters.archiveRecordVisits || 0]; })), "",
        "Seed timing differences are measured here, not assumed from the older candidate. Compare observed record counts, association predicate visits, kinship calls and ancestry work; one ordered trial per seed cannot prove a stable runtime ranking or separate every scheduler/JIT/GC effect. No result is rerun to obtain a preferred ordering.", "",
        "## Checks and remaining limits", "",
        `Self-test: **${report.selftest.status}**, ${report.selftest.passed || 0} checks. It executes deliberate unseeded-random and changed-seed mutations, altered byte evidence, a missing phase, and a real 20 ms busy-work control. Required unchanged regression command: **${report.regression.status}**, exit ${report.regression.exitCode}.`, "", "```text", report.regression.diagnostic || "NOT RUN", "```", "",
        report.regression.candidateMismatch ? "The existing Astra regression guard still names the previous candidate. A mismatch is not a passing regression and does not establish that the new candidate violates its contracts; no contracts execute in that command. This task cannot retarget the reserved verifier." : "The regression result above is retained as observed; any failure requires review by the owner of that verifier.", "",
        "Official independent revalidation remains with Astra. Headless byte equality and profiler self-tests are the checks performed here. Native Playtest, F8, NW.js gameplay and screenshots are not required by this task and were NOT RUN. A SLOW_PATH warning in a summary describes instrumentation overhead relative to the plain control, not a production regression. Missing work-counter keys mean zero observed visits.", "",
        ...(report.failure ? ["Execution failure (completed seed evidence retained; uncompleted coverage is not inferred):", "", "```text", report.failure, "```", ""] : []),
        "## Structured report", "", "Annual metrics, timing spans, counters, provenance, equality checks and negative-control results follow. Bulk state/event strings were removed only after exact comparisons; checkpoint hashes remain.", "", "```json", compactAnnualJSON(report), "```", "");
    return lines.join("\n");
}
function main() {
    const started = performance.now(), options = args(process.argv.slice(2));
    if (options.help) { console.log("Usage: node tools/profile_historical_demographics.js [--seed N] [--years N] [--compare] [--json] [--selftest]"); return; }
    const data = bundle();
    if (options.worker) { console.log(JSON.stringify(run(data, options.seed, options.years, options.worker === "profile"))); return; }
    if (options.selftest) { const checks = selftest(data); console.log(options.json ? JSON.stringify(checks, null, 2) : checks.checks.map(c => `PASS ${c.name}`).join("\n") + `\nSelf-test PASS: ${checks.passed} checks`); return; }
    const report = { task: "DEUS-TSK-CODEX-01", schemaVersion: 1, status: "INCOMPLETE", createdAt: new Date().toISOString(), options,
        runtime: { node: process.version, cpu: (os.cpus()[0] || {}).model }, provenance: { baselineCommit: BASE, pluginSha256: ENGINE_SHA, pluginBytes: ENGINE_BYTES, sourceDigest: data.sourceDigest, harnessSha256: HARNESS_SHA, sources: data.sources },
        selftest: { status: "NOT RUN" }, regression: { command: "node tools/test_historical_carrying_capacity.js", status: "NOT RUN", exitCode: null }, results: [], totalWallMs: 0 };
    report.requestedSeeds = options.compare ? [0, 424242, 20260919] : [options.seed];
    try {
        report.selftest = selftest(data);
        const regression = spawnSync(process.execPath, [path.join(ROOT, "tools/test_historical_carrying_capacity.js")], { cwd: ROOT, windowsHide: true, encoding: "utf8", timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
        const diagnostic = (regression.stderr || regression.stdout || String(regression.error)).trim();
        report.regression = { command: report.regression.command, status: !regression.error && regression.status === 0 ? "PASS" : "FAIL", exitCode: regression.status,
            candidateMismatch: !regression.error && regression.status !== 0 && /CANDIDATE_MISMATCH: working plugin differs from frozen candidate/.test(diagnostic), diagnostic };
        for (const seed of report.requestedSeeds) {
            report.attemptingSeed = seed;
            const plain = worker(data, seed, options.years, "plain"), profile = worker(data, seed, options.years, "profile");
            assert(plain.workerPid !== profile.workerPid, "Controls must use separate processes");
            const equality = compare(plain, profile), summary = summarize(plain, profile);
            for (const result of [plain, profile]) { delete result.initialBytes; for (const c of result.checkpoints) { delete c.stateText; delete c.eventsText; } }
            plain.annual = plain.annual.map(({ years, wallMs, cpuMs }) => ({ years, wallMs, cpuMs }));
            report.results.push({ plain, profile, equality, summary });
        }
        delete report.attemptingSeed;
        assert(sha(fs.readFileSync(path.join(ROOT, PLUGIN))) === ENGINE_SHA, "Candidate changed during profiling");
        report.provenance.candidateUnchangedAtEnd = true;
        report.status = report.regression.status === "PASS" ? "PASS" : report.regression.candidateMismatch ? "PROFILING PASS; REQUIRED REGRESSION BLOCKED BY CANDIDATE MISMATCH" : "FAIL: REQUIRED REGRESSION";
    } catch (error) {
        report.status = /ETIMEDOUT/.test(error.message) ? "INCOMPLETE" : "FAIL";
        report.failure = error.stack || error.message;
    }
    report.coverage = report.requestedSeeds.map(seed => ({ seed, years: options.years, status: report.results.some(r => r.summary.seed === seed) ? "MEASURED" : "NOT COMPLETED" }));
    report.totalWallMs = performance.now() - started;
    fs.writeFileSync(OUTPUT, markdown(report));
    const summary = table(["Seed", "Plain ms", "Profile ms", "Living", "Records", "Byte equality"], report.results.map(r => [r.summary.seed, ms(r.summary.plainSimulationWallMs), ms(r.summary.profileSimulationWallMs), r.summary.final.living, r.summary.final.totalRecords, r.equality.status]));
    if (options.json) { console.error(summary); console.log(JSON.stringify(report, null, 2)); } else console.log(summary);
    console.error(`${report.status}; total wall ${ms(report.totalWallMs / 1000)} s; report ${OUTPUT}`);
    if (report.status !== "PASS") process.exitCode = 1;
}
module.exports = { args, bundle, instrument, Probe, load, run, accounting, compare, selftest, markdown };
if (require.main === module) { try { main(); } catch (error) { console.error(`FAIL: ${error.stack || error}`); process.exitCode = 1; } }
