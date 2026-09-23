#!/usr/bin/env node
"use strict";

// ASTRA-10: independent measurements of the frozen HIST-09 production candidate.
// Production defaults and production density only; no caller fertility adjustment.
const fs = require("fs"), path = require("path"), vm = require("vm"), crypto = require("crypto"), os = require("os");
const { performance } = require("perf_hooks");
const { spawnSync } = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const BASE = "f532291b8aecbd9899814ddf6c098bd3cee36342";
const TASK = "DEUS-TSK-ASTRA-10";
const PLUGIN = "game/js/plugins/DEUS_HistoricalDemographics.js";
const ENGINE_HASH = "06d0f7ac1596bea8d2432c48c899497e9d8b0cb67b12925e23958a5427af0012";
const ENGINE_BYTES = 41439;
const DEFAULT_OUTPUT = path.join(ROOT, "game/test_output/bench_species_biology.json");
const MODULES = ["World", "WorldGen", "Factions", "History", "Levels"];
const MUTANTS = ["unseeded", "invalid_lifespan", "inverted_fertility", "corrupt_parentage"];
const GROWTH_FLAG_RATIO = 100; // Diagnostic only; never a production population cap.
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const clone = value => JSON.parse(JSON.stringify(value));
const sha = value => crypto.createHash("sha256").update(value).digest("hex");
const mean = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const HARNESS_HASH = sha(fs.readFileSync(__filename));
const WORKER_TIMEOUT_MS = 60000;
const CALIBRATION = Object.freeze({ revision: "HIST-09 frozen production defaults", siteCapacity: 160, minimumFertilityScale: 0.1,
    maxSpeciesPopulation: 1500, maxStateBytes: 15 * 1024 * 1024, maxTrajectoryMs: 30000, maxSeedMs: 60000 });

function profiles() {
    const rows = {
        human: [[60, 90], [18, 55], .36, 3, .004, .0003, .0003],
        elf: [[350, 750], [60, 350], .025, 12, .002, .0001, .0001],
        dwarf: [[250, 350], [40, 240], .09, 6, .006, .0003, .0003],
        halfling: [[120, 150], [20, 110], .20, 4, .012, .0008, .0006],
        gnome: [[350, 500], [40, 200], .05, 10, .005, .0002, .0002],
        dragonborn: [[65, 80], [15, 60], .34, 3, .004, .0003, .0003],
        "half-elf": [[140, 180], [20, 125], .12, 5, .01, .0005, .0005],
        "half-orc": [[55, 75], [14, 50], .40, 2, .004, .0003, .0003],
        tiefling: [[70, 110], [18, 65], .30, 3, .004, .0003, .0003]
    };
    return Object.fromEntries(Object.entries(rows).map(([id, r]) => [id, {
        lifespan: r[0], reproductiveAge: r[1], birthChance: r[2], birthSpacingYears: r[3],
        infantMortality: r[4], diseaseMortality: r[5], exposureMortality: r[6]
    }]));
}
const SPECIES = Object.keys(profiles());

function densityScale(population, capacity = CALIBRATION.siteCapacity) {
    assert(Number.isSafeInteger(population) && population >= 0 && Number.isSafeInteger(capacity) && capacity > 0, "Invalid density inputs");
    return Math.max(CALIBRATION.minimumFertilityScale, 1 - population / capacity);
}
function indexSites(state) {
    const sites = new Map();
    for (const site of state.sites) {
        const species = state.factions[site.factionId].species;
        assert(!sites.has(species), "Density schedule requires exactly one site per species");
        sites.set(species, site);
    }
    assert(sites.size === SPECIES.length, "Density schedule is missing a species site");
    return sites;
}
function advanceYear(api, state, config, sites, method = "step") {
    const schedule = {};
    for (const [id, site] of sites) {
        const scale = densityScale(site.population, site.historicalCapacity), effectiveFertility = config[id].birthChance * scale;
        schedule[id] = { siteId: site.id, population: site.population, capacity: site.historicalCapacity, scale, effectiveFertility };
    }
    if (method === "simulate") api.simulate(state, 1);
    else { assert(method === "step", "Unknown annual API"); api.step(state); }
    return schedule;
}

function parseArgs(args) {
    const out = { seeds: [0, 424242, 20260919], horizons: [100, 250, 500], runs: 2, json: null, selftest: false, worker: false, mutant: null };
    for (let i = 0; i < args.length; i++) {
        const key = args[i];
        if (["--selftest", "--help", "--worker", "--resume-worker", "--matrix-only"].includes(key)) { out[key.slice(2)] = true; continue; }
        if (key.startsWith("--mutant=")) { out.mutant = key.slice(9); assert(MUTANTS.includes(out.mutant), "Unknown mutant"); continue; }
        assert(["--seed", "--years", "--runs", "--json"].includes(key), `Unknown option ${key}`);
        const raw = args[++i]; assert(raw && !raw.startsWith("--"), `Missing value for ${key}`);
        if (key === "--json") { out.json = path.resolve(raw); continue; }
        const n = Number(raw);
        assert(/^\d+$/.test(raw) && Number.isSafeInteger(n), `Invalid ${key}`);
        if (key === "--seed") { assert(n >= 0 && n <= 0x7fffffff, "Invalid --seed"); out.seeds = [n]; }
        if (key === "--years") { assert([100, 250, 500].includes(n), "Invalid --years (100, 250, 500)"); out.horizons = [n]; }
        if (key === "--runs") { assert(n >= 1 && n <= 20, "Invalid --runs"); out.runs = n; }
    }
    return out;
}
function validateProfiles(config) {
    assert(Object.keys(config).sort().join() === SPECIES.slice().sort().join(), "Nine canonical species profiles required");
    for (const [id, p] of Object.entries(config)) {
        for (const key of ["lifespan", "reproductiveAge"])
            assert(Array.isArray(p[key]) && p[key].length === 2 && p[key].every(n => Number.isSafeInteger(n) && n > 0) && p[key][0] <= p[key][1], `Invalid ${key} bounds: ${id}`);
        assert(p.reproductiveAge[1] < p.lifespan[1], `Reproduction beyond lifespan: ${id}`);
        assert(Number.isSafeInteger(p.birthSpacingYears) && p.birthSpacingYears >= 1, `Invalid spacing: ${id}`);
        for (const key of ["birthChance", "infantMortality", "diseaseMortality", "exposureMortality"])
            assert(Number.isFinite(p[key]) && p[key] >= 0 && p[key] <= 1, `Invalid probability: ${id}.${key}`);
    }
}
function bundle() {
    const inspected = fs.readFileSync(path.join(ROOT, PLUGIN));
    assert(inspected.length === ENGINE_BYTES && sha(inspected) === ENGINE_HASH, "Candidate mismatch: inspected production file differs from ASTRA-10 dispatch");
    const files = {}, sources = [];
    const read = file => {
        const committed = spawnSync("git", ["show", `${BASE}:${file}`], { cwd: ROOT, encoding: "utf8", windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
        assert(committed.status === 0 && !committed.error, `Cannot read frozen source ${file}`);
        // All executed source and catalog data come from the named immutable
        // commit. Concurrent working-tree changes are recorded, never loaded.
        const disk = fs.readFileSync(path.join(ROOT, file), "utf8");
        files[file] = committed.stdout;
        sources.push({ path: file, loadedFrom: `${BASE}:${file}`, sha256: sha(committed.stdout),
            workingSha256AtStart: sha(disk), workingMatchesBaselineAtStart: disk.replace(/\r\n/g, "\n") === committed.stdout.replace(/\r\n/g, "\n") });
        return committed.stdout;
    };
    const list = {}; vm.runInNewContext(read("game/js/plugins.js"), list, { timeout: 1000 });
    const plugins = list.$plugins.filter(p => p.status && MODULES.includes(p.name.replace(/^DEUS_/, "")));
    assert(plugins.length === MODULES.length && plugins.every((p, i) => p.name === `DEUS_${MODULES[i]}`), "Bootstrap order changed");
    plugins.forEach(p => read(`game/js/plugins/${p.name}.js`));
    const catalog = JSON.parse(read("game/data/UF_WorldCatalog.json"));
    read(PLUGIN); assert(Buffer.byteLength(files[PLUGIN]) === ENGINE_BYTES && sha(files[PLUGIN]) === ENGINE_HASH, "Frozen engine hash mismatch");
    return { files, sources, plugins, catalog };
}
const sourceDigest = data => sha(JSON.stringify(data.sources.map(s => [s.path, s.sha256])));
function verifySnapshot(data) {
    for (const s of data.sources) assert(sha(data.files[s.path]) === s.sha256, `Loaded snapshot changed: ${s.path}`);
}
function load(data, seed) {
    const ns = {}, errors = [], math = Object.create(Math);
    math.random = () => { throw new Error("Unseeded Math.random rejected"); }; Object.freeze(math);
    const env = { window: null, UF: ns, DEUS: ns, Math: math, performance, $ufWorldCatalog: clone(data.catalog),
        PluginManager: { parameters: name => (data.plugins.find(p => p.name === name) || {}).parameters || {}, registerCommand() {} },
        DataManager: { _databaseFiles: [], onLoad() {}, isBattleTest: () => false, isEventTest: () => false },
        Input: { keyMapper: {} }, TouchInput: {}, SceneManager: { _scene: null }, Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 },
        $gameMap: { mapId: () => 0 }, $gamePlayer: {}, $gameSystem: {}, Utils: { isOptionValid: () => false },
        ImageManager: { loadTileset() { throw new Error("Unexpected renderer call"); } },
        console: { log() {}, warn() {}, error: (...a) => errors.push(a.map(String).join(" ")) } };
    env.window = env; env.$deusWorldCatalog = env.$ufWorldCatalog;
    const code = data.plugins.map(p => data.files[`game/js/plugins/${p.name}.js`]);
    const classes = new Set(["Sprite", "Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot", "Rectangle"]);
    for (const source of code) for (const m of source.matchAll(/\b((?:Game|Scene|Window|Spriteset|Sprite)_[A-Za-z0-9_]+)\.prototype/g)) classes.add(m[1]);
    for (const name of classes) env[name] = function() { throw new Error(`Unexpected engine constructor ${name}`); };
    for (const source of code) for (const m of source.matchAll(/\b((?:Game|Scene|Window|Spriteset|Sprite)_[A-Za-z0-9_]+)\.prototype\.([A-Za-z0-9_]+)/g))
        env[m[1]].prototype[m[2]] = () => { throw new Error("Unexpected engine method"); };
    const context = vm.createContext(env);
    // Native lexical bindings avoid host-proxy lookup overhead; source is unmodified.
    vm.runInContext(["Math", "Object", "Array", "Number", "String", "Boolean", "Map", "Set", "JSON", "Date", "Uint8Array", "Uint16Array", "Int32Array", "Float32Array", "performance", "window"]
        .map(n => `const ${n} = globalThis.${n};`).join("\n"), context);
    data.plugins.forEach((p, i) => vm.runInContext(code[i], context, { filename: p.name, timeout: 10000 }));
    const world = ns.World.newWorld(seed); assert(world.seed === seed, "Requested seed changed during bootstrap");
    ns.Levels.ensureWorldLevels(world); ns.Factions.generate(world); ns.History.generate(world);
    assert(world.history.version === 5 && world.history.startYear === 1 && world.history.simulated === false, "Canonical Year-1 contract changed");
    const canonical = JSON.stringify(world);
    vm.runInContext(data.files[PLUGIN], context, { filename: PLUGIN, timeout: 10000 });
    assert(JSON.stringify(world) === canonical && errors.length === 0, "Bootstrap mutated world or logged errors");
    return { api: ns.HistoricalDemographics, context, world, canonical, errors };
}
function stats(values) {
    let count = 0, sum = 0, sumSquares = 0, min = null, max = null;
    for (const n of values) { count++; sum += n; sumSquares += n * n; min = min === null ? n : Math.min(min, n); max = max === null ? n : Math.max(max, n); }
    const avg = count ? sum / count : null;
    return { count, min, max, mean: avg, stdDev: count ? Math.sqrt(Math.max(0, sumSquares / count - avg * avg)) : null, sum, sumSquares };
}
function pooled(rows) {
    const valid = rows.filter(r => r.count), count = valid.reduce((n, r) => n + r.count, 0);
    const sum = valid.reduce((n, r) => n + r.sum, 0), sumSquares = valid.reduce((n, r) => n + r.sumSquares, 0);
    return { count, min: count ? Math.min(...valid.map(r => r.min)) : null, max: count ? Math.max(...valid.map(r => r.max)) : null,
        mean: count ? sum / count : null, stdDev: count ? Math.sqrt(Math.max(0, sumSquares / count - (sum / count) ** 2)) : null, sum, sumSquares };
}
const geometry = state => JSON.stringify(state.sites.map(s => [s.id, s.sourceSiteId, s.factionId, s.area, s.x, s.y, s.z, s.zRange]));
function checkDeath(person, profile) {
    const age = person.died - person.born;
    assert(age >= 0 && age <= profile.lifespan[1], `Death exceeds maximum lifespan: ${person.species}`);
    if (person.causeOfDeath === "old_age") assert(age >= profile.lifespan[0], `Old-age death below lifespan minimum: ${person.species}`);
}
function checkState(state, config, originalGeometry) {
    assert(state.version === 7 && state.historyModelVersion === 1 && state.capacityModelVersion === 1 && state.domain === "historical" && state.currentYear === state.startYear + state.yearsSimulated, "Schema/clock mismatch");
    assert(geometry(state) === originalGeometry, "Site geometry changed");
    assert(JSON.stringify(state.config.profiles) === JSON.stringify(config), "Profile matrix changed during simulation");
    const byId = new Map(state.people.map(p => [p.id, p])), births = new Map(), residents = new Map(state.sites.map(s => [s.id, 0]));
    assert(byId.size === state.people.length && state.people.every(p => Number.isSafeInteger(p.id)), "Person ID collision");
    for (const p of state.people) {
        const cfg = config[p.species]; assert(cfg && residents.has(p.siteId), "Species/site missing");
        if (p.died !== null) checkDeath(p, cfg);
        else { assert(state.currentYear - p.born < cfg.lifespan[1], "Living person survived hard lifespan maximum"); residents.set(p.siteId, residents.get(p.siteId) + 1); }
        assert(p.parents.length === (p.isFounder ? 0 : 2), "Invalid parent count");
        if (p.isFounder) continue;
        const [m, f] = p.parents.map(id => byId.get(id));
        assert(m && f && m !== f, "Invalid parentage IDs");
        assert(m.gender === "female" && f.gender === "male", "Parent gender order invalid");
        assert(!m.parents.some(id => f.parents.includes(id)) && !m.parents.includes(f.id) && !f.parents.includes(m.id), "Prohibited kinship birth");
        for (const parent of [m, f]) {
            const age = p.born - parent.born, range = config[parent.species].reproductiveAge;
            assert(age >= range[0] && age <= range[1], "Parent outside reproductive window");
            assert(parent.died === null || parent.died > p.born, "Deceased parent reproduced");
            assert(parent.siteId === p.siteId && parent.species === p.species && parent.factionId === p.factionId, "Nonlocal or mismatched birth");
        }
        const b = births.get(m.id) || []; b.push(p.born); births.set(m.id, b);
    }
    for (const [id, dates] of births) {
        dates.sort((a, b) => a - b);
        assert(dates.every((y, i) => !i || y - dates[i - 1] >= config[byId.get(id).species].birthSpacingYears), "Birth spacing violated");
    }
    for (const site of state.sites) assert(site.population === residents.get(site.id), "Site population mismatch");
    for (const faction of Object.values(state.factions)) {
        const living = state.people.some(p => p.factionId === faction.id && p.died === null), active = state.rulers.filter(r => r.factionId === faction.id && r.toYear === null);
        assert(active.length === (living ? 1 : 0) && active.every(r => byId.get(r.personId).died === null), "Active ruler invariant failed");
    }
    const text = JSON.stringify(state);
    assert(JSON.stringify(JSON.parse(text)) === text, "JSON round-trip differs");
    return text;
}
function census(state) {
    const out = Object.fromEntries(SPECIES.map(id => [id, { living: 0, born: 0, dead: 0, fertileMale: 0, fertileFemale: 0, unpartneredFertile: 0 }]));
    for (const p of state.people) {
        const r = out[p.species]; r[p.died === null ? "living" : "dead"]++; if (!p.isFounder) r.born++;
        const age = state.currentYear - p.born, bounds = state.config.profiles[p.species].reproductiveAge;
        if (p.died === null && age >= bounds[0] && age <= bounds[1]) {
            r[p.gender === "male" ? "fertileMale" : "fertileFemale"]++;
            if (p.partnershipId === null) r.unpartneredFertile++;
        }
    }
    return out;
}
function indexRecords(state) {
    const bySpecies = new Map(SPECIES.map(id => [id, []])), bySiteAge = new Map(), fertileIds = new Set();
    for (const p of state.people) {
        bySpecies.get(p.species).push(p);
        const age = state.currentYear - p.born, bounds = state.config.profiles[p.species].reproductiveAge;
        if (p.died !== null || age < bounds[0] || age > bounds[1]) continue;
        fertileIds.add(p.id);
        if (p.partnershipId !== null) continue;
        const key = `${p.siteId}:${Math.floor(age / 10) * 10}`, bucket = bySiteAge.get(key) || { siteId: p.siteId, ageFrom: Math.floor(age / 10) * 10, male: [], female: [] };
        bucket[p.gender].push(p.id); bySiteAge.set(key, bucket);
    }
    const couples = new Map(state.sites.map(s => [s.id, 0]));
    for (const p of state.partnerships) if (p.toYear === null && fertileIds.has(p.motherId) && fertileIds.has(p.fatherId)) couples.set(p.siteId, couples.get(p.siteId) + 1);
    return { bySpecies, bySiteAge, couples };
}
function speciesMetrics(state, id, curves, index) {
    const people = index.bySpecies.get(id), dead = people.filter(p => p.died !== null), living = people.filter(p => p.died === null);
    const births = new Map(), offspring = new Map();
    for (const p of people.filter(p => !p.isFounder)) {
        const b = births.get(p.parents[0]) || []; b.push(p.born); births.set(p.parents[0], b);
        const children = offspring.get(p.parents[0]) || []; children.push(p); offspring.set(p.parents[0], children);
    }
    const gaps = []; for (const dates of births.values()) { dates.sort((a, b) => a - b); dates.slice(1).forEach((y, i) => gaps.push(y - dates[i])); }
    const founderCount = people.filter(p => p.isFounder).length;
    const endedFemales = people.filter(p => !p.isFounder && p.gender === "female" && (p.died !== null || state.currentYear - p.born > state.config.profiles[id].reproductiveAge[1]));
    const daughters = endedFemales.flatMap(p => (offspring.get(p.id) || []).filter(c => c.gender === "female"));
    const minAge = state.config.profiles[id].reproductiveAge[0];
    const mature = daughters.filter(p => p.born + minAge <= state.currentYear && (p.died === null || p.died > p.born + minAge));
    const censoredDaughters = daughters.filter(p => p.died === null && p.born + minAge > state.currentYear);
    const factions = new Set(people.map(p => p.factionId)), rulers = state.rulers.filter(r => factions.has(r.factionId));
    let dynastyChanges = 0;
    for (const fid of factions) {
        const reigns = rulers.filter(r => r.factionId === fid);
        reigns.slice(1).forEach((r, i) => { if (r.dynastyId !== reigns[i].dynastyId) dynastyChanges++; });
    }
    const row = curves[curves.length - 1], previous = curves[Math.max(0, curves.length - 101)], earlier = previous.species[id];
    const dt = row.years - previous.years, logRate = earlier.living > 0 && living.length > 0 && dt ? Math.log(living.length / earlier.living) / dt : null;
    const oldAge = dead.filter(p => p.causeOfDeath === "old_age"), ageStats = rows => stats(rows.map(p => p.died - p.born));
    const highGrowth = curves.some(r => r.species[id].living > founderCount * GROWTH_FLAG_RATIO);
    const siteId = people[0].siteId;
    return { species: id, founders: founderCount, living: living.length, archived: dead.length, births: people.length - founderCount,
        reproduction: { fertileMale: row.species[id].fertileMale, fertileFemale: row.species[id].fertileFemale,
            activeFertileCouples: index.couples.get(siteId), unpartneredFertile: row.species[id].unpartneredFertile,
            unpartneredByAge: [...index.bySiteAge.values()].filter(b => b.siteId === siteId).map(b => ({ ageFrom: b.ageFrom, male: b.male.length, female: b.female.length })) },
        deathsByCause: Object.fromEntries(["old_age", "disease", "exposure", "violence"].map(c => [c, dead.filter(p => p.causeOfDeath === c).length])),
        infantDeaths: dead.filter(p => p.deathDetail === "infant").length,
        lifespan: { allCompleted: ageStats(dead), oldAge: ageStats(oldAge), founders: ageStats(dead.filter(p => p.isFounder)),
            bornDuringRun: ageStats(dead.filter(p => !p.isFounder)), censoredLivingAges: stats(living.map(p => state.currentYear - p.born)) },
        birthSpacing: stats(gaps), maxGeneration: people.reduce((n, p) => Math.max(n, p.generation), 0),
        extinct: living.length === 0, firstExtinctionYear: (curves.find(r => r.species[id].living === 0) || {}).years ?? null,
        growth: { ratioToFounders: living.length / founderCount, highGrowthFlag: highGrowth, diagnosticThresholdRatio: GROWTH_FLAG_RATIO,
            carryingCapacity: state.sites[siteId].historicalCapacity, capacityCheck: "PRODUCTION SITE CAPACITY; NOT A HARD POPULATION CAP", trailingYears: dt, trailingLogGrowthPerYear: logRate,
            trailingDoublingYears: logRate !== null && logRate > 0 ? Math.log(2) / logRate : null,
            trailingBirths: row.species[id].born - earlier.born, trailingDeaths: row.species[id].dead - earlier.dead },
        replacement: { closedFemaleCohort: endedFemales.length, femaleOffspring: daughters.length, daughtersReachedMaturity: mature.length,
            daughtersStillCensored: censoredDaughters.length, femaleOffspringPerClosedFemale: endedFemales.length ? daughters.length / endedFemales.length : null,
            matureDaughtersPerClosedFemale: endedFemales.length ? mature.length / endedFemales.length : null },
        rulers: { active: rulers.filter(r => r.toYear === null).length, accessions: rulers.length,
            successions: rulers.length - factions.size, distinctDynasties: new Set(rulers.map(r => r.dynastyId)).size, dynastyChanges } };
}
function trajectory(data, seed, horizons, progress = false, checkpointSink = null) {
    const start = performance.now(), loaded = load(data, seed), config = profiles(); validateProfiles(config);
    const { api, world } = loaded, state = api.create(world, { eventLimit: 1000000 });
    assert(state.demographicProfileVersion === "1.0.0-provisional-astra08" && JSON.stringify(state.config.profiles) === JSON.stringify(config), "Promoted default profiles differ from independent expected matrix");
    assert(Object.values(state.factions).map(f => f.species).sort().join() === SPECIES.slice().sort().join(), "Canonical species roster changed");
    const originalGeometry = geometry(state), sites = indexSites(state), setupMs = performance.now() - start;
    const curves = [{ years: 0, species: census(state) }], checkpoints = [], tickMs = [];
    const heapBefore = process.memoryUsage().heapUsed; let peak = heapBefore, observationMs = 0, verificationMs = 0;
    for (let year = 1; year <= Math.max(...horizons); year++) {
        const density = Object.fromEntries([...sites].map(([id, s]) => [id, { siteId: s.id, population: s.population, capacity: s.historicalCapacity,
            scale: densityScale(s.population, s.historicalCapacity), effectiveFertility: config[id].birthChance * densityScale(s.population, s.historicalCapacity) }]));
        const t = performance.now(); api.step(state); tickMs.push(performance.now() - t);
        const observationStart = performance.now();
        const heapAfterTick = process.memoryUsage().heapUsed; peak = Math.max(peak, heapAfterTick);
        curves.push({ years: year, species: census(state), density }); observationMs += performance.now() - observationStart;
        if (horizons.includes(year)) {
            const v = performance.now();
            const text = checkState(state, config, originalGeometry); api.validate(state);
            assert(state.eventsDiscarded === 0, "Event cap reached; full-stream determinism unavailable");
            assert(JSON.stringify(world) === loaded.canonical && loaded.errors.length === 0, "Simulation changed canonical world or logged errors");
            const events = JSON.stringify(state.events), index = indexRecords(state), species = SPECIES.map(id => speciesMetrics(state, id, curves, index));
            verificationMs += performance.now() - v;
            checkpoints.push({ seed, years: year, currentYear: state.currentYear, species, living: species.reduce((n, s) => n + s.living, 0),
                archived: species.reduce((n, s) => n + s.archived, 0), stateBytes: Buffer.byteLength(text),
                stateSha256: sha(text), eventsSha256: sha(events), events: state.events.length,
                timing: { simulationMs: tickMs.reduce((a, b) => a + b, 0), meanYearMs: mean(tickMs), worstYearMs: Math.max(...tickMs),
                    setupMs, observationMs, verificationMs }, heap: { before: heapBefore, after: heapAfterTick, delta: heapAfterTick - heapBefore, sampledPeakDelta: peak - heapBefore },
                evidence: { state: text, events } });
            // Publish only after validation; pipe I/O is outside timed calls.
            if (checkpointSink) checkpointSink({ seed, sourceDigest: sourceDigest(data), harnessSha256: HARNESS_HASH, setupMs,
                checkpoint: checkpoints[checkpoints.length - 1], curves, tickMs, wallMs: performance.now() - start });
        }
        if (progress && (horizons.includes(year) || year > 250 && year % 50 === 0)) console.error(`Seed ${seed}: ${year} years; ${curves[year].species["half-elf"].living} half-elves; ${state.people.length} total records`);
    }
    assert(JSON.stringify(world) === loaded.canonical && loaded.errors.length === 0, "Simulation changed canonical world or logged errors");
    verifySnapshot(data);
    return { seed, workerPid: process.pid, sourceDigest: sourceDigest(data), harnessSha256: HARNESS_HASH, setupMs, checkpoints, curves, tickMs,
        sites: state.sites.map(s => ({ id: s.id, sourceSiteId: s.sourceSiteId, species: state.factions[s.factionId].species, z: s.z, capacity: s.historicalCapacity,
            population: s.population, peakPopulation: s.peakPopulation })), wallMs: performance.now() - start };
}
function sameRun(a, b) {
    assert(a.seed === b.seed && a.checkpoints.length === b.checkpoints.length, "Repeat identity mismatch");
    assert(JSON.stringify(a.curves) === JSON.stringify(b.curves), "Population curves differ across repeats");
    a.checkpoints.forEach((r, i) => {
        const s = b.checkpoints[i];
        assert(r.years === s.years && r.evidence.state === s.evidence.state && r.evidence.events === s.evidence.events &&
            r.stateSha256 === s.stateSha256 && r.eventsSha256 === s.eventsSha256, "State/event determinism mismatch");
    });
}
function workerOutput(stdout, completeRequired) {
    const checkpoints = []; let latest = null, complete = null;
    const lines = stdout.split("\n");
    for (let i = 0; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        let frame;
        try { frame = JSON.parse(lines[i]); }
        catch (error) { if (!completeRequired && i === lines.length - 1) break; throw error; }
        assert(frame.type === "checkpoint" || frame.type === "complete", "Invalid worker frame");
        const r = frame.result;
        assert(r.harnessSha256 === HARNESS_HASH, "Worker harness differs from parent");
        if (latest) assert(r.seed === latest.seed && r.sourceDigest === latest.sourceDigest, "Worker frame identity mismatch");
        if (frame.type === "checkpoint") {
            assert(!complete && r.checkpoint && (!checkpoints.length || r.checkpoint.years > checkpoints[checkpoints.length - 1].years), "Invalid checkpoint order");
            checkpoints.push(r.checkpoint); latest = r;
        } else { assert(!complete, "Duplicate worker completion"); complete = r; latest = r; }
    }
    if (completeRequired) assert(complete, "Worker did not publish completion");
    if (!latest) return null;
    const result = { ...latest, checkpoints }; delete result.checkpoint;
    return result;
}
function failureReport(options, runs, repeatChecks, partial, failure, elapsedMs, data) {
    const retained = [...runs, ...(partial ? [partial] : [])];
    // Exact bytes have already served completed repeat comparisons; keep hashes
    // and measurements in the failure artifact without bloating it with state.
    retained.forEach(r => r.checkpoints.forEach(c => { delete c.evidence; }));
    const coverage = options.seeds.flatMap(seed => Array.from({ length: options.runs }, (_, i) =>
        options.horizons.map(years => ({ seed, repeat: i + 1, years,
            status: retained.some(r => r.seed === seed && r.repeat === i + 1 && r.checkpoints.some(c => c.years === years)) ? "MEASURED" : "NOT RUN" })))).flat();
    return { task: TASK, schemaVersion: 2, status: "FAIL", createdAt: new Date().toISOString(), options,
        provenance: { baselineCommit: BASE, sourceDigest: sourceDigest(data), harnessSha256: HARNESS_HASH },
        failure, coverage, repeatChecks, completedRuns: runs, partialRun: partial,
        proposedProfiles: profiles(), calibration: CALIBRATION, approvedForIntegration: false, totalWallMs: elapsedMs,
        limitation: "Incomplete matrix. Partial worker data ends at its last validated checkpoint; missing results are not zero populations. No completed-matrix biological aggregate or calibration approval." };
}
function aggregate(runs, horizons) {
    const unique = runs.filter((r, i) => runs.findIndex(s => s.seed === r.seed) === i);
    return horizons.map(years => ({ years, uniqueSeeds: unique.length,
        stateBytes: stats(unique.map(r => r.checkpoints.find(c => c.years === years).stateBytes)),
        species: SPECIES.map(id => {
            const rows = unique.map(r => r.checkpoints.find(c => c.years === years).species.find(s => s.species === id));
            return { species: id, population: stats(rows.map(s => s.living)), populationsBySeed: unique.map((r, i) => ({ seed: r.seed, living: rows[i].living })),
                extinctions: rows.filter(s => s.extinct).length, extinctionSampleFraction: rows.filter(s => s.extinct).length / unique.length,
                highGrowthSeeds: rows.filter(s => s.growth.highGrowthFlag).length,
                lifespan: Object.fromEntries(Object.keys(rows[0].lifespan).map(k => [k, pooled(rows.map(s => s.lifespan[k]))])),
                birthSpacing: pooled(rows.map(s => s.birthSpacing)), maxGeneration: Math.max(...rows.map(s => s.maxGeneration)),
                activeRulers: rows.reduce((n, s) => n + s.rulers.active, 0), successions: rows.reduce((n, s) => n + s.rulers.successions, 0),
                dynastyChanges: rows.reduce((n, s) => n + s.rulers.dynastyChanges, 0) };
        }) }));
}
function acceptance(runs) {
    const checkpoints = runs.flatMap(r => r.checkpoints), mature = checkpoints.filter(c => c.years >= 250);
    const checks = {
        zeroExtinctions: runs.every(r => r.curves.every(c => SPECIES.every(id => c.species[id].living > 0))),
        viableReproduction: mature.length ? mature.every(c => c.species.every(s => s.living > 0 && s.reproduction.activeFertileCouples > 0)) : null,
        boundedPopulation: runs.every(r => r.curves.every(c => SPECIES.every(id => c.species[id].living < CALIBRATION.maxSpeciesPopulation))),
        serializedState: checkpoints.every(c => c.stateBytes < CALIBRATION.maxStateBytes),
        trajectoryBudget: runs.every(r => r.wallMs < CALIBRATION.maxTrajectoryMs)
    };
    return Object.fromEntries(Object.entries(checks).map(([key, value]) => [key, value === null ? "NOT RUN" : value ? "PASS" : "FAIL"]));
}
function table(headers, rows) {
    const grid = [headers, ...rows].map(r => r.map(String)), widths = headers.map((_, i) => Math.max(...grid.map(r => r[i].length)));
    const line = "+-" + widths.map(n => "-".repeat(n)).join("-+-") + "-+";
    return [line, ...grid.flatMap((r, i) => ["| " + r.map((v, j) => v.padEnd(widths[j])).join(" | ") + " |", ...(i ? [] : [line])]), line].join("\n");
}
function measuredMatrixChecks(matrix) {
    const partials = matrix.incomplete.map(item => item.partial).filter(Boolean);
    return { acceptance: matrix.runs.length ? acceptance(matrix.runs) : {},
        partialAcceptance: partials.length ? acceptance(partials) : {} };
}
function runMutant(data, name) {
    const loaded = load(data, 0), config = profiles();
    if (name === "unseeded") vm.runInContext("Math.random()", loaded.context);
    if (name === "invalid_lifespan") config.human.lifespan.reverse();
    if (name === "inverted_fertility") config.human.reproductiveAge.reverse();
    validateProfiles(config);
    const state = loaded.api.create(loaded.world, { profiles: config });
    loaded.api.simulate(state, 5);
    if (name === "corrupt_parentage") { const child = state.people.find(p => !p.isFounder); assert(child, "Mutation fixture has no child"); child.parents[0] = 999999999; }
    checkState(state, config, geometry(state)); // A surviving mutant exits 0.
}
function selftest(data) {
    const checks = [], check = (name, fn) => { fn(); checks.push({ name, status: "PASS" }); };
    const rejects = (fn, re) => { let error; try { fn(); } catch (e) { error = e; } assert(error && re.test(error.message), `Expected ${re}, got ${error ? error.message : "success"}`); };
    check("CLI defaults and explicit options", () => {
        assert(parseArgs([]).horizons.join() === "100,250,500" && parseArgs([]).runs === 2, "Wrong defaults");
        const p = parseArgs(["--seed", "0", "--years", "500", "--runs", "3", "--json", "game/test_output/TEST_biology.json"]);
        assert(p.seeds[0] === 0 && p.horizons[0] === 500 && p.runs === 3 && path.isAbsolute(p.json), "CLI ignored");
    });
    for (const args of [["--years", "99"], ["--seed", "-1"], ["--seed", "2147483648"], ["--runs", "0"], ["--runs", "1.5"], ["--json"], ["--bogus"]])
        check(`Reject ${args.join(" ")}`, () => rejects(() => parseArgs(args), /Invalid|Missing|Unknown/));
    check("Supplied nine-profile matrix accepted", () => validateProfiles(profiles()));
    check("Density schedule decreases fertility and retains the disclosed floor", () => {
        assert(densityScale(0) === 1 && densityScale(80) === 0.5 && densityScale(160) === 0.1 && densityScale(320) === 0.1, "Density curve incorrect");
        rejects(() => densityScale(1, 0), /Invalid density inputs/);
        for (const p of Object.values(profiles())) assert((p.reproductiveAge[1] - p.reproductiveAge[0] + 1) * p.birthChance * .1 / 2 < 1,
            "Density-floor upper bound on expected daughters reaches replacement");
    });
    check("Immutable loaded snapshot detects changed source bytes", () => {
        const changed = { ...data, files: { ...data.files, [PLUGIN]: data.files[PLUGIN] + " " } };
        rejects(() => verifySnapshot(changed), /Loaded snapshot changed/);
        verifySnapshot(data);
    });
    check("Statistics, pooling, and empty cohorts", () => {
        const a = stats([1, 2, 3]), b = pooled([stats([1]), stats([2, 3])]);
        assert(a.mean === 2 && Math.abs(a.stdDev - Math.sqrt(2 / 3)) < 1e-12 && JSON.stringify(a) === JSON.stringify(b), "Statistics incorrect");
        assert(stats([]).mean === null && stats([]).min === null, "Empty cohort fabricated a lifespan");
    });
    check("Early health death allowed; early old-age and over-maximum rejected", () => {
        const p = { born: 0, died: 1, causeOfDeath: "disease", species: "human" }; checkDeath(p, profiles().human);
        rejects(() => checkDeath({ ...p, causeOfDeath: "old_age" }, profiles().human), /below lifespan minimum/);
        rejects(() => checkDeath({ ...p, died: 91 }, profiles().human), /maximum lifespan/);
    });
    const a = trajectory(data, 0, [100]), b = trajectory(data, 0, [100]);
    check("Public step matches simulate and JSON continuation under the density schedule", () => {
        const { api, world } = load(data, 0), config = profiles();
        let state = api.create(world, { eventLimit: 1000000 }), sites = indexSites(state);
        for (let year = 1; year <= 100; year++) {
            const expectedPopulation = sites.get("human").population, rates = advanceYear(api, state, config, sites, "simulate");
            assert(rates.human.population === expectedPopulation && rates.human.effectiveFertility === config.human.birthChance * densityScale(expectedPopulation, sites.get("human").historicalCapacity), "Density input uses the wrong census");
            assert(JSON.stringify(state.config.profiles) === JSON.stringify(config), "Base profile was not restored");
            if (year === 50) { state = JSON.parse(JSON.stringify(state)); sites = indexSites(state); }
        }
        assert(JSON.stringify(state) === a.checkpoints[0].evidence.state, "step/simulate or JSON continuation changed state/event bytes");
        state.sites.push({ ...state.sites[0], id: state.sites.length });
        rejects(() => indexSites(state), /exactly one site per species/);
    });
    check("Extinction, saturation, serialization and timing gates can fail", () => {
        const trial = clone(a); trial.processWallMs = trial.wallMs;
        assert(acceptance([trial]).zeroExtinctions === "PASS", "Control fixture already extinct");
        trial.curves[0].species.human.living = 0;
        assert(acceptance([trial]).zeroExtinctions === "FAIL", "Extinction gate survived mutation");
        trial.curves[0].species.human.living = 1500;
        assert(acceptance([trial]).boundedPopulation === "FAIL", "Population gate survived mutation");
        trial.checkpoints[0].stateBytes = CALIBRATION.maxStateBytes;
        trial.wallMs = CALIBRATION.maxTrajectoryMs; trial.processWallMs = CALIBRATION.maxSeedMs;
        const result = acceptance([trial]);
        assert(result.serializedState === "FAIL" && result.trajectoryBudget === "FAIL", "Budget gates survived mutation");
        trial.checkpoints[0].years = 250; trial.checkpoints[0].species[0].reproduction.activeFertileCouples = 0;
        assert(acceptance([trial]).viableReproduction === "FAIL", "Reproduction gate survived mutation");
    });
    check("Known failures survive an incomplete trajectory without inventing missing coverage", () => {
        const partial = clone(a); partial.curves[partial.curves.length - 1].species.human.living = 0;
        const result = measuredMatrixChecks({ runs: [], incomplete: [{ partial }] });
        assert(Object.keys(result.acceptance).length === 0 && result.partialAcceptance.zeroExtinctions === "FAIL" &&
            result.partialAcceptance.viableReproduction === "NOT RUN", "Incomplete evidence hid extinction or fabricated mature coverage");
    });
    check("Timed-out worker preserves validated checkpoints and missing coverage", () => {
        const result = { ...a, checkpoint: a.checkpoints[0] }; delete result.checkpoints;
        const child = spawnSync(process.execPath, ["-e", "process.stdout.write(require('fs').readFileSync(0));setInterval(()=>{},1000)"],
            { input: JSON.stringify({ type: "checkpoint", result }) + "\n", encoding: "utf8", windowsHide: true, timeout: 1000, maxBuffer: 256 * 1024 * 1024 });
        assert(child.error && child.error.code === "ETIMEDOUT", `Timeout control did not time out: ${child.error ? child.error.code : child.status}`);
        const partial = workerOutput(child.stdout, false);
        assert(partial && partial.checkpoints.length === 1 && partial.checkpoints[0].evidence.state === a.checkpoints[0].evidence.state, "Validated checkpoint lost on timeout");
        partial.repeat = 1;
        const report = failureReport({ seeds: [0], runs: 2, horizons: [100, 250, 500] }, [], [], partial,
            { code: child.error.code }, 1000, data);
        assert(report.status === "FAIL" && report.coverage.filter(c => c.status === "MEASURED").length === 1 &&
            report.coverage.filter(c => c.status === "NOT RUN").length === 5 && !report.partialRun.checkpoints[0].evidence,
            "Failure report fabricated completed coverage or leaked full state evidence");
        rejects(() => workerOutput(child.stdout, true), /did not publish completion/);
        rejects(() => workerOutput(JSON.stringify({ type: "checkpoint", result: { ...result, harnessSha256: "changed" } }) + "\n", false), /Worker harness differs/);
        const finished = workerOutput(child.stdout + JSON.stringify({ type: "complete", result: { ...a, checkpoints: undefined } }) + "\n", true);
        assert(finished.checkpoints[0].stateSha256 === a.checkpoints[0].stateSha256, "Completion frame lost checkpoint");
    });
    check("Real engine repeat has byte-identical state/events/curves", () => sameRun(a, b));
    check("Changed repeat bytes are rejected", () => { const bad = clone(b); bad.checkpoints[0].evidence.events += " "; rejects(() => sameRun(a, bad), /determinism/); });
    check("An immortal living survivor violates the hard lifespan maximum", () => {
        const s = JSON.parse(a.checkpoints[0].evidence.state), p = s.people.find(p => p.isFounder && p.died === null);
        assert(p, "Living founder fixture missing"); p.born = s.currentYear - profiles()[p.species].lifespan[1];
        rejects(() => checkState(s, profiles(), geometry(s)), /Living person survived hard lifespan maximum/);
    });
    check("Duplicate repeats do not inflate extinction samples", () => assert(aggregate([a, b], [100])[0].uniqueSeeds === 1, "Pseudoreplication"));
    check("Birth spacing mutation rejected independently", () => {
        const s = JSON.parse(a.checkpoints[0].evidence.state), grouped = new Map();
        const parents = new Set(s.people.flatMap(p => p.parents));
        for (const p of s.people.filter(p => !p.isFounder && p.died === null && !parents.has(p.id))) {
            const key = p.parents.join("/"); const g = grouped.get(key) || []; g.push(p); grouped.set(key, g);
        }
        const siblings = [...grouped.values()].find(g => g.length >= 2); assert(siblings, "Spacing fixture missing");
        siblings.sort((p, q) => p.born - q.born); siblings[1].born = siblings[0].born;
        rejects(() => checkState(s, profiles(), geometry(s)), /Birth spacing violated/);
    });
    for (const name of MUTANTS) check(`Mutation ${name} exits 1 for intended assertion`, () => {
        const result = spawnSync(process.execPath, [__filename, `--mutant=${name}`], { cwd: ROOT, encoding: "utf8", windowsHide: true, timeout: 60000 });
        const patterns = { unseeded: /Error: Unseeded Math.random rejected/, invalid_lifespan: /Error: Invalid lifespan bounds/, inverted_fertility: /Error: Invalid reproductiveAge bounds/, corrupt_parentage: /Error: Invalid parentage IDs/ };
        assert(!result.error && result.status === 1 && patterns[name].test(result.stderr), `Mutation ${name} did not fail its intended assertion: ${result.stderr || result.error}`);
        checks.push({ name: `Negative control ${name}`, observed: "FAIL (expected)", exitCode: result.status, diagnostic: result.stderr.split(/\r?\n/).find(line => patterns[name].test(line)) });
    });
    return { task: TASK, status: "PASS", passed: checks.filter(c => c.status === "PASS").length, checks };
}
function writeReport(file, report) {
    const relative = path.relative(path.join(ROOT, "game/test_output"), file);
    assert(relative && !relative.startsWith("..") && !path.isAbsolute(relative) && file.endsWith(".json"), "JSON output must be a .json file under game/test_output (protects code/catalog/saves)");
    fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(report, null, 2) + "\n");
}
function resumeWorker(data, options) {
    const input = JSON.parse(fs.readFileSync(0, "utf8"));
    assert(input.sourceDigest === sourceDigest(data) && input.harnessSha256 === HARNESS_HASH, "Restart snapshot source identity mismatch");
    const loaded = load(data, options.seeds[0]), state = JSON.parse(input.state);
    assert(state.seed === options.seeds[0] && state.yearsSimulated === 100, "Restart must begin at the requested 100-year checkpoint");
    loaded.api.validate(state);
    const start = performance.now(), config = profiles(), originalGeometry = geometry(state);
    for (let i = 0; i < 150; i++) loaded.api.step(state);
    const text = checkState(state, config, originalGeometry), events = JSON.stringify(state.events);
    loaded.api.validate(state);
    assert(JSON.stringify(loaded.world) === loaded.canonical && loaded.errors.length === 0, "Restart mutated canonical world or logged errors");
    console.log(JSON.stringify({ workerPid: process.pid, years: state.yearsSimulated, sourceDigest: sourceDigest(data), harnessSha256: HARNESS_HASH,
        stateSha256: sha(text), eventsSha256: sha(events), evidence: { state: text, events }, simulationAndVerificationMs: performance.now() - start }));
}
function runWorker(data, seed, horizons) {
    const args = [__filename, "--worker", "--seed", String(seed)];
    if (horizons.length === 1) args.push("--years", String(horizons[0]));
    const start = performance.now();
    const child = spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8", windowsHide: true,
        timeout: WORKER_TIMEOUT_MS, maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "inherit"] });
    let result = null, parseError = null;
    try { result = workerOutput(child.stdout || "", !child.error && child.status === 0); } catch (error) { parseError = error.message; }
    const processWallMs = performance.now() - start;
    if (result && result.sourceDigest !== sourceDigest(data)) { parseError = "Worker snapshot differs from parent baseline"; result = null; }
    if (result) result.processWallMs = processWallMs;
    const failed = child.error || child.status !== 0 || parseError;
    return { result, processWallMs, failure: failed ? { seed, exitCode: child.status, code: child.error ? child.error.code : "WORKER_FAILURE",
        diagnostic: parseError || (child.error && child.error.message) || "Worker exited nonzero", timeoutMs: WORKER_TIMEOUT_MS } : null };
}
function runRestart(data, run) {
    const a = run.checkpoints.find(c => c.years === 100), b = run.checkpoints.find(c => c.years === 250);
    if (!a || !b) return { seed: run.seed, status: "NOT RUN", reason: "100/250-year checkpoints required" };
    const started = performance.now(), child = spawnSync(process.execPath, [__filename, "--resume-worker", "--seed", String(run.seed)], {
        cwd: ROOT, encoding: "utf8", windowsHide: true, timeout: WORKER_TIMEOUT_MS, maxBuffer: 256 * 1024 * 1024,
        input: JSON.stringify({ state: a.evidence.state, sourceDigest: sourceDigest(data), harnessSha256: HARNESS_HASH }) });
    if (child.error || child.status !== 0) return { seed: run.seed, status: "FAIL", exitCode: child.status, diagnostic: child.stderr || String(child.error) };
    try {
        const resumed = JSON.parse(child.stdout);
        assert(resumed.workerPid !== run.workerPid && resumed.years === 250, "Restart did not use a new process or correct horizon");
        assert(resumed.sourceDigest === sourceDigest(data) && resumed.harnessSha256 === HARNESS_HASH, "Restart candidate differs");
        assert(resumed.evidence.state === b.evidence.state && resumed.evidence.events === b.evidence.events && resumed.stateSha256 === b.stateSha256 && resumed.eventsSha256 === b.eventsSha256,
            "Full-process restart changed state/event bytes or hashes");
        return { seed: run.seed, status: "PASS", sourceProcessExited: true, sourcePid: run.workerPid, resumedPid: resumed.workerPid,
            stateSha256: resumed.stateSha256, eventsSha256: resumed.eventsSha256, processWallMs: performance.now() - started };
    } catch (error) { return { seed: run.seed, status: "FAIL", diagnostic: error.message }; }
}
function suite(script, json = false) {
    const started = performance.now(), child = spawnSync(process.execPath, [path.join(__dirname, script), "--selftest", ...(json ? ["--json"] : [])],
        { cwd: ROOT, encoding: "utf8", windowsHide: true, timeout: 120000, maxBuffer: 32 * 1024 * 1024 });
    let report = null, parseError = null;
    if (json) { try { report = JSON.parse(child.stdout); } catch (error) { parseError = error.message; } }
    return { command: `node tools/${script} --selftest${json ? " --json" : ""}`, status: !child.error && child.status === 0 && !parseError ? "PASS" : "FAIL",
        exitCode: child.status, wallMs: performance.now() - started, report, stdout: json && report ? undefined : child.stdout,
        stderr: child.stderr, diagnostic: parseError || (child.error && child.error.message) || null };
}
function sweepSummary(runs) {
    const populations = runs.map(r => r.checkpoints[0].living).sort((a,b) => a-b), n = populations.length;
    return { completedSeeds: runs.map(r => r.seed), living: { min: n ? populations[0] : null,
        median: n ? (populations[Math.floor((n - 1) / 2)] + populations[Math.floor(n / 2)]) / 2 : null, max: n ? populations[n-1] : null },
        largestSitePopulation: n ? Math.max(...runs.flatMap(r => r.sites.map(s => s.peakPopulation))) : null,
        slowestTrajectoryMs: n ? Math.max(...runs.map(r => r.wallMs)) : null,
        species: SPECIES.map(id => ({ species: id, extinctSeeds: runs.filter(r => r.curves.some(c => c.species[id].living === 0)).map(r => r.seed),
            extinctionFrequency: n ? runs.filter(r => r.curves.some(c => c.species[id].living === 0)).length / n : null,
            populationsBySeed: runs.map(r => ({ seed: r.seed, living: r.checkpoints[0].species.find(s => s.species === id).living })) })) };
}
function main() {
    const started = performance.now(), options = parseArgs(process.argv.slice(2));
    if (options.help) { console.log("Usage: node tools/bench_species_biology.js [--seed N] [--years 100|250|500] [--runs N] [--matrix-only] [--json game/test_output/name.json] [--selftest] [--mutant=<name>]\nDefault: independent contracts, regression self-test, 3-seed/2-repeat 500-year matrix, full-process restarts, and 20-seed 250-year sweep."); return; }
    const data = bundle();
    if (options.mutant) { runMutant(data, options.mutant); return; }
    if (options["resume-worker"]) { resumeWorker(data, options); return; }
    if (options.worker) {
        const result = trajectory(data, options.seeds[0], options.horizons, true,
            checkpoint => console.log(JSON.stringify({ type: "checkpoint", result: checkpoint })));
        delete result.checkpoints; console.log(JSON.stringify({ type: "complete", result })); return;
    }
    if (options.selftest) {
        const report = selftest(data); report.checks.forEach(c => console.log(`${c.status || c.observed}: ${c.name}${c.diagnostic ? " - " + c.diagnostic : ""}`));
        console.log(`Self-test PASS: ${report.passed} checks`); if (options.json) writeReport(options.json, report); return;
    }
    const full = !options["matrix-only"] && options.seeds.join() === "0,424242,20260919" && options.horizons.join() === "100,250,500" && options.runs === 2;
    const report = { task: TASK, schemaVersion: 3, status: "INCOMPLETE", createdAt: new Date().toISOString(), options, fullDispatchCoverageRequested: full,
        runtime: { node: process.version, cpu: (os.cpus()[0] || {}).model, trialIsolation: "One fresh Node process per trajectory; sequential measurements" },
        provenance: { baselineCommit: BASE, expectedEngineSha256: ENGINE_HASH, observedEngineSha256: sha(data.files[PLUGIN]), candidateBytes: ENGINE_BYTES,
            sourceDigest: sourceDigest(data), harnessSha256: HARNESS_HASH, sources: data.sources },
        expectedProductionProfiles: profiles(), gates: { maxSpeciesPopulation: 1500, maxStateBytes: 15 * 1024 * 1024, maxTrajectoryMs: 30000 },
        methodology: { density: "Unmodified production step; default profiles from create(world). Harness records but never applies the independent start-of-year density oracle.",
            timing: "Only api.step is timed as annual simulation. Trajectory wall includes setup, observations, checkpoint validation/serialization and pipe emission. Parent processWallMs also includes startup/source loading/IPC parsing. No forced GC.",
            sweep: "Seeds1..20 at250 years are descriptive coverage, not an additional extinction-free gate; all counts and observed failures retained.",
            state: "Complete person/partnership/event registries; event cap asserted unused. Exact serialized bytes compared before evidence strings are omitted from report.",
            restart: "100-year JSON checkpoint retained by parent; originating child exits before a different child parses it and executes150 further years." },
        suites: {}, matrix: { runs: [], incomplete: [], repeatChecks: [], acceptance: {} }, restarts: [], sweep: { status: "NOT RUN", runs: [], incomplete: [] }, totalWallMs: 0 };
    const output = options.json || DEFAULT_OUTPUT;
    function persist() {
        report.totalWallMs = performance.now() - started;
        report.matrix.coverage = options.seeds.flatMap(seed => Array.from({length: options.runs}, (_, i) => options.horizons.map(years => ({seed, repeat:i+1, years,
            status: [...report.matrix.runs, ...report.matrix.incomplete.map(f=>f.partial).filter(Boolean)].some(r => r.seed===seed && r.repeat===i+1 && r.checkpoints.some(c=>c.years===years)) ? "MEASURED" : "NOT RUN"})))).flat();
        writeReport(output, JSON.parse(JSON.stringify(report, (key,value) => key === "evidence" ? undefined : value)));
    }
    if (full) {
        try { report.suites.benchmark = selftest(data); } catch (error) { report.suites.benchmark = {status:"FAIL", diagnostic:error.stack}; }
        report.suites.capacity = suite("test_historical_carrying_capacity.js", true);
        report.suites.regression = suite("test_production_history_demographics.js", true);
        console.error(`Contracts ${report.suites.capacity.status}; regression ${report.suites.regression.status}; benchmark self-test ${report.suites.benchmark.status}`);
    }
    persist();
    for (const seed of options.seeds) {
        let first = null, repeatFailure = null, completed = 0;
        for (let repeat = 1; repeat <= options.runs; repeat++) {
            console.error(`Matrix seed ${seed}, repeat ${repeat}/${options.runs}, horizons ${options.horizons.join("/")}`);
            const item = runWorker(data, seed, options.horizons);
            if (item.result) item.result.repeat = repeat;
            if (item.failure) report.matrix.incomplete.push({...item.failure, repeat, processWallMs:item.processWallMs, partial:item.result});
            else {
                completed++; report.matrix.runs.push(item.result);
                if (first) { try { sameRun(first,item.result); } catch(error) { repeatFailure=error.message; } }
                else first=item.result;
            }
            persist();
        }
        report.matrix.repeatChecks.push({seed, repeats:completed, status:repeatFailure ? "FAIL" : completed!==options.runs ? "INCOMPLETE" : options.runs>1 ? "PASS" : "NOT RUN", diagnostic:repeatFailure});
        if (full && first) report.restarts.push(runRestart(data,first));
        for (const run of report.matrix.runs.filter(r=>r.seed===seed)) for (const c of run.checkpoints) delete c.evidence;
        persist();
    }
    Object.assign(report.matrix, measuredMatrixChecks(report.matrix));
    report.matrix.processTotalsBySeed = options.seeds.map(seed=>({seed, elapsedMs:[...report.matrix.runs,...report.matrix.incomplete].filter(r=>r.seed===seed).reduce((sum,r)=>sum+r.processWallMs,0)}));
    if (report.matrix.runs.length) report.matrix.summaries=aggregate(report.matrix.runs,options.horizons);
    if (full) {
        report.sweep.status="INCOMPLETE";
        for(let seed=1;seed<=20;seed++) {
            console.error(`Sweep seed ${seed}/20, 250 years`);
            const item=runWorker(data,seed,[250]);
            if(item.failure)report.sweep.incomplete.push({...item.failure,processWallMs:item.processWallMs,partial:item.result});
            else { for(const c of item.result.checkpoints)delete c.evidence; report.sweep.runs.push(item.result); }
            persist();
        }
        report.sweep.summary=sweepSummary(report.sweep.runs);
        report.sweep.status=report.sweep.runs.length===20?"COMPLETE":"INCOMPLETE";
    }
    verifySnapshot(data);
    report.provenance.sources=data.sources.map(s=>({...s,workingSha256AtEnd:sha(fs.readFileSync(path.join(ROOT,s.path)))}));
    report.provenance.candidateUnchangedAtEnd = sha(fs.readFileSync(path.join(ROOT,PLUGIN))) === ENGINE_HASH;
    const explicitFailure=!report.provenance.candidateUnchangedAtEnd || Object.values(report.suites).some(s=>s.status==="FAIL") ||
        Object.values(report.matrix.acceptance).includes("FAIL") || Object.values(report.matrix.partialAcceptance).includes("FAIL") ||
        report.matrix.repeatChecks.some(s=>s.status==="FAIL") || report.restarts.some(r=>r.status==="FAIL");
    const incomplete=report.matrix.incomplete.length>0 || (full && (report.sweep.status!=="COMPLETE" || report.restarts.length!==3 || report.restarts.some(r=>r.status!=="PASS")));
    report.status=explicitFailure?"FAIL":incomplete?"INCOMPLETE":full?"PASS":"PASS WITH NON-BLOCKING LIMITATIONS";
    report.coverageLimitation=full?null:"Selected matrix coverage only; full ASTRA-10 dispatch acceptance is NOT RUN.";
    persist();
    console.log(table(["Seed","Repeat","Trajectory s","Living500","State bytes500"],report.matrix.runs.map(r=>{const c=r.checkpoints.find(c=>c.years===500);return[r.seed,r.repeat,(r.wallMs/1000).toFixed(3),c?c.living:"NOT RUN",c?c.stateBytes:"NOT RUN"];})));
    console.log(`Acceptance: ${JSON.stringify(report.matrix.acceptance)}`);
    console.log(`Repeat checks: ${JSON.stringify(report.matrix.repeatChecks)}; restarts: ${report.restarts.map(r=>`${r.seed}:${r.status}`).join(", ")}`);
    if(report.sweep.summary)console.log(`Sweep: ${JSON.stringify(report.sweep.summary)}`);
    console.log(`${report.status}; total wall ${(report.totalWallMs/1000).toFixed(3)} s; JSON: ${output}`);
    if(report.status==="FAIL"||report.status==="INCOMPLETE")process.exitCode=1;
}
if (require.main === module) { try { main(); } catch (error) { console.error(`FAIL: ${error.stack || error}`); process.exitCode = 1; } }
