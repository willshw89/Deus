#!/usr/bin/env node
"use strict";

// HIST-01 / minimum HIST-02. Real Year-1 terrain/faction/founder bootstrap;
// explicit TEST biology inputs, not approved production catalog defaults.
const fs = require("fs"), path = require("path"), vm = require("vm"), crypto = require("crypto"), os = require("os");
const { performance } = require("perf_hooks");
const { spawnSync } = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "game/test_output/bench_production_history.json");
const PLUGIN = "game/js/plugins/DEUS_HistoricalDemographics.js";
const MODULES = ["World", "WorldGen", "Factions", "History", "Levels"];
const MUTANTS = ["dead_reproduce", "skip_succession", "corrupt_parents", "uniform_lifespan"];
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const sha = value => crypto.createHash("sha256").update(value).digest("hex");
const clone = value => JSON.parse(JSON.stringify(value));
const mean = values => values.reduce((a, b) => a + b, 0) / values.length;

// Fixture data only. The packet supplies human/elf/dwarf lifespan examples;
// other ranges and all probabilities are provisional test inputs, not lore.
function profiles() {
    const rows = {
        human: [[60, 85], [18, 45], .18, 3, .02, .001, .001],
        elf: [[300, 700], [60, 350], .025, 12, .002, .0001, .0001],
        dwarf: [[200, 350], [35, 150], .06, 8, .006, .0003, .0003],
        halfling: [[100, 150], [20, 65], .14, 4, .012, .0008, .0006],
        gnome: [[250, 400], [40, 200], .05, 10, .005, .0002, .0002],
        dragonborn: [[60, 90], [18, 45], .16, 3, .015, .001, .001],
        "half-elf": [[120, 180], [25, 85], .10, 5, .01, .0005, .0005],
        "half-orc": [[50, 75], [18, 40], .20, 2, .02, .001, .001],
        tiefling: [[80, 120], [20, 60], .12, 4, .01, .0007, .0007]
    };
    return Object.fromEntries(Object.entries(rows).map(([id, r]) => [id, {
        lifespan: r[0], reproductiveAge: r[1], birthChance: r[2], birthSpacingYears: r[3],
        infantMortality: r[4], diseaseMortality: r[5], exposureMortality: r[6]
    }]));
}

function parseArgs(args) {
    const out = { seeds: [0, 424242, 20260919], years: [100, 250], runs: 2, json: false, selftest: false, mutant: null };
    for (let i = 0; i < args.length; i++) {
        const key = args[i];
        if (["--json", "--selftest", "--help"].includes(key)) { out[key.slice(2)] = true; continue; }
        if (key.startsWith("--mutant=")) {
            out.mutant = key.slice(9); assert(MUTANTS.includes(out.mutant), "Unknown mutant"); continue;
        }
        assert(["--seed", "--years", "--runs"].includes(key), `Unknown option ${key}`);
        const raw = args[++i], n = Number(raw), min = key === "--seed" ? 0 : 1;
        const max = key === "--seed" ? 2147483647 : key === "--years" ? 250 : 20;
        assert(raw !== undefined && /^\d+$/.test(raw) && Number.isSafeInteger(n) && n >= min && n <= max, `Invalid ${key}`);
        if (key === "--runs") out.runs = n; else out[key === "--seed" ? "seeds" : "years"] = [n];
    }
    return out;
}
function once(source, anchor, replacement) {
    assert(source.split(anchor).length === 2, `Mutation anchor missing/ambiguous: ${anchor}`);
    return source.replace(anchor, replacement);
}
function mutate(source, mutant) {
    if (!mutant) return source;
    if (mutant === "dead_reproduce") return once(source, "function alive(person) { return person.died === null; }", "function alive(person) { return true; }");
    if (mutant === "skip_succession") return once(source, "if (previous && alive(state.people[previous.personId]))", "if (previous)");
    if (mutant === "corrupt_parents") return once(source, "parents: [mother.id, father.id]", "parents: [999999999, father.id]");
    return once(source, "return state.config.profiles[person.species].lifespan;", "return [55, 85];");
}
function sourceBundle() {
    const files = {}, read = file => (files[file] = fs.readFileSync(path.join(ROOT, file), "utf8"));
    const list = {};
    vm.runInNewContext(read("game/js/plugins.js"), list, { timeout: 1000 });
    const plugins = list.$plugins.filter(p => p.status && MODULES.includes(p.name.replace(/^DEUS_/, "")));
    assert(plugins.length === MODULES.length && plugins.every((p, i) => p.name === `DEUS_${MODULES[i]}`), "Canonical bootstrap plugin order changed");
    for (const p of plugins) read(`game/js/plugins/${p.name}.js`);
    const catalog = JSON.parse(read("game/data/UF_WorldCatalog.json"));
    read(PLUGIN); read("tools/test_production_history_demographics.js");
    return { files, plugins, catalog, sources: Object.keys(files).map(file => ({ path: file, sha256: sha(files[file]) })) };
}

function load(data, seed, mutant = null) {
    const ns = {}, errors = [], math = Object.create(Math);
    math.random = () => { throw new Error("Unseeded Math.random"); };
    const env = { window: null, UF: ns, DEUS: ns, Math: math, performance,
        $ufWorldCatalog: clone(data.catalog),
        PluginManager: { parameters: name => (data.plugins.find(p => p.name === name) || {}).parameters || {}, registerCommand() {} },
        DataManager: { _databaseFiles: [], onLoad() {}, isBattleTest: () => false, isEventTest: () => false },
        Input: { keyMapper: {} }, TouchInput: {}, SceneManager: { _scene: null },
        Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 }, $gameMap: { mapId: () => 0 }, $gamePlayer: {}, $gameSystem: {},
        ImageManager: { loadTileset() { throw new Error("Unexpected renderer call"); } }, Utils: { isOptionValid: () => false },
        console: { log() {}, warn() {}, error: (...args) => errors.push(args.map(String).join(" ")) } };
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

function jsonSafe(value, ancestors = new Set()) {
    if (value === null || typeof value === "string" || typeof value === "boolean") return;
    if (typeof value === "number") { assert(Number.isFinite(value), "Nonfinite persistent number"); return; }
    assert(typeof value === "object" && !ancestors.has(value), "Non-JSON value or cycle");
    assert(Array.isArray(value) || Object.prototype.toString.call(value) === "[object Object]", "Nonplain persistent container");
    ancestors.add(value);
    for (const key of Object.keys(value)) jsonSafe(value[key], ancestors);
    ancestors.delete(value);
}
const siteGeometry = state => state.sites.map(s => ({ id: s.id, factionId: s.factionId, area: s.area, x: s.x, y: s.y, z: s.z, zRange: s.zRange, foundedYear: s.foundedYear }));

function integrity(s, expectedProfiles, originalSites) {
    jsonSafe(s);
    assert(s.version === 6 && s.domain === "historical" && s.currentYear === s.startYear + s.yearsSimulated, "Schema/year invariant");
    assert(JSON.stringify(siteGeometry(s)) === JSON.stringify(originalSites), "Site geometry changed/teleported");
    for (const name of ["people", "sites", "dynasties", "rulers"]) {
        const ids = s[name].map(r => r.id);
        assert(ids.every(Number.isSafeInteger) && new Set(ids).size === ids.length, `Duplicate/noninteger ${name} IDs`);
    }
    const people = new Map(s.people.map(p => [p.id, p])), sites = new Map(s.sites.map(x => [x.id, x]));
    const dynasties = new Map(s.dynasties.map(x => [x.id, x]));
    const residents = new Map(s.sites.map(x => [x.id, 0]));
    for (const site of s.sites) {
        assert(Number.isInteger(site.z) && site.z >= -2 && site.z <= 2 && Array.isArray(site.zRange) && site.zRange.length === 2 &&
            site.zRange.every(z => Number.isInteger(z) && z >= -2 && z <= 2) && site.zRange[0] <= site.z && site.z <= site.zRange[1], "Invalid volumetric Z");
    }
    for (const p of s.people) {
        assert(s.factions[p.factionId] && sites.has(p.siteId) && dynasties.has(p.dynastyId), "Person foreign key missing");
        assert(sites.get(p.siteId).factionId === p.factionId, "Person faction/site mismatch");
        assert(["male", "female"].includes(p.gender) && expectedProfiles[p.species], "Invalid gender/species");
        assert(Number.isInteger(p.born) && p.born <= s.currentYear && (p.died === null || Number.isInteger(p.died) && p.died >= p.born && p.died <= s.currentYear), "Invalid lifetime dates");
        assert(["living", "recent", "historic", "compressed"].includes(p.tier) && (p.died === null) === (p.tier === "living"), "Tier/alive mismatch");
        if (p.died === null) residents.set(p.siteId, residents.get(p.siteId) + 1);
        else {
            assert(["old_age", "violence", "disease", "exposure"].includes(p.causeOfDeath), "Missing death cause");
            if (p.causeOfDeath === "old_age") assert(p.died - p.born >= expectedProfiles[p.species].lifespan[0], "Species lifespan violated by old-age mortality");
        }
        assert(p.parents.length === 0 && p.isFounder || p.parents.length === 2 && !p.isFounder, "Invalid founder/parent record");
        if (!p.parents.length) continue;
        const [m, f] = p.parents.map(id => people.get(id));
        assert(m && f && m.id !== f.id, "Invalid parent IDs");
        assert(m.gender === "female" && f.gender === "male", "Parent gender order");
        assert(m.siteId === p.siteId && f.siteId === p.siteId && m.factionId === p.factionId && f.factionId === p.factionId, "Nonlocal birth");
        assert(!m.parents.includes(f.id) && !f.parents.includes(m.id) && !m.parents.some(id => f.parents.includes(id)), "Incest/half-sibling birth");
        for (const parent of [m, f]) {
            assert(parent.born < p.born, "Parent birth chronology");
            assert(parent.died === null || parent.died > p.born, "Dead parent reproduced");
            const [lo, hi] = expectedProfiles[parent.species].reproductiveAge;
            assert(p.born - parent.born >= lo && p.born - parent.born <= hi, "Species reproductive window violated");
        }
        assert(p.generation === 1 + Math.max(m.generation, f.generation), "Generation depth mismatch");
        assert(s.partnerships.some(b => b.motherId === m.id && b.fatherId === f.id && b.siteId === p.siteId &&
            b.fromYear <= p.born && (b.toYear === null || b.toYear > p.born)), "Birth outside recorded partnership");
    }
    for (const site of s.sites) assert(site.population === residents.get(site.id) && site.peakPopulation >= site.population &&
        (site.abandonedYear === null || site.population === 0), "Site population/abandonment mismatch");
    for (const faction of Object.values(s.factions)) {
        const living = s.people.filter(p => p.factionId === faction.id && p.died === null);
        const records = s.rulers.filter(r => r.factionId === faction.id);
        const active = records.filter(r => r.toYear === null);
        assert(active.length === (living.length ? 1 : 0), "Active ruler count mismatch");
        if (active.length) {
            assert(active[0].id === faction.activeRulerId && people.get(active[0].personId).died === null, "Dead/mismatched active ruler");
        } else assert(faction.activeRulerId === null, "Extinct faction retains ruler");
        records.forEach((r, i) => {
            const p = people.get(r.personId);
            assert(p && p.factionId === faction.id && p.siteId === r.siteId && p.dynastyId === r.dynastyId, "Ruler foreign keys");
            assert(p.born <= r.fromYear && (p.died === null || p.died > r.fromYear), "Ruler not alive at accession");
            assert(r.fromYear <= s.currentYear && (r.toYear === null || r.toYear >= r.fromYear), "Ruler chronology");
            if (i) assert(records[i - 1].toYear === r.fromYear, "Ruler transition gap/overlap");
            if (p.died !== null) assert(r.toYear === p.died, "Ruler term does not close at death");
        });
    }
    const occupied = new Map();
    for (const b of s.partnerships) for (const id of [b.motherId, b.fatherId]) {
        const intervals = occupied.get(id) || [];
        for (const old of intervals) assert((old.toYear !== null && old.toYear <= b.fromYear) || (b.toYear !== null && b.toYear <= old.fromYear), "Overlapping monogamous partnerships");
        intervals.push(b); occupied.set(id, intervals);
    }
    const text = JSON.stringify(s);
    assert(JSON.stringify(JSON.parse(text)) === text, "JSON round-trip mismatch");
    return { text, stateSha256: sha(text), eventsSha256: sha(JSON.stringify(s.events)), living: s.people.filter(p => p.died === null).length };
}

function run(data, seed, years, mutant = null) {
    const start = performance.now(), loaded = load(data, seed, mutant), { api, world } = loaded;
    const biology = profiles();
    const s = api.create(world, { profiles: biology, recentYears: 20, eventLimit: 1000000 });
    assert(Object.values(s.factions).map(f => f.species).sort().join() === Object.keys(biology).sort().join(), "Canonical nine-species roster mismatch");
    const originalSites = clone(siteGeometry(s)), initial = clone(s), setupMs = performance.now() - start;
    const originalPlans = world.factions.list.flatMap(f => world.history.founders[f.id].plan.map(p => ({ ...p, factionId: f.id })));
    assert(s.people.length === originalPlans.length && s.sites.length === world.history.sites.length, "Founding import count mismatch");
    s.people.forEach((p, i) => assert(p.name === originalPlans[i].name && p.gender === originalPlans[i].gender && p.born === 1 - originalPlans[i].age && p.factionId === originalPlans[i].factionId, "Imported founder identity/age changed"));
    s.sites.forEach(site => {
        const original = world.history.sites.find(x => x.id === site.sourceSiteId);
        assert(original && site.x === original.x && site.y === original.y && site.z === original.z && JSON.stringify(site.area) === JSON.stringify(original.area), "Imported site coordinate changed");
    });
    const before = process.memoryUsage().heapUsed;
    let peak = before, totalMs = 0, maxYearMs = 0, samplingMs = 0;
    for (let year = 0; year < years; year++) {
        const t = performance.now(); api.step(s); const ms = performance.now() - t;
        totalMs += ms; maxYearMs = Math.max(maxYearMs, ms);
        const sample = performance.now(); peak = Math.max(peak, process.memoryUsage().heapUsed); samplingMs += performance.now() - sample;
    }
    const after = process.memoryUsage().heapUsed, v = performance.now();
    const checked = integrity(s, biology, originalSites);
    api.validate(s);
    assert(JSON.stringify(world) === loaded.canonical, "Standalone simulation changed canonical Year-1 world");
    if (years >= 100) {
        assert(s.people.length > initial.people.length, "Proof produced no births");
        assert(s.people.some(p => p.died !== null), "Proof produced no deaths");
    }
    return { seed, years, timing: { setupMs, totalMs, maxYearMs, samplingMs, verificationMs: performance.now() - v, wallMs: performance.now() - start },
        living: checked.living, archived: s.people.length - checked.living, totalPeople: s.people.length,
        activeSites: s.sites.filter(x => x.abandonedYear === null).length, abandonedSites: s.sites.filter(x => x.abandonedYear !== null).length,
        stateBytes: Buffer.byteLength(checked.text), heap: { before, after, delta: after - before, sampledPeakDelta: peak - before },
        stateSha256: checked.stateSha256, eventsSha256: checked.eventsSha256,
        namesSha256: sha(JSON.stringify(s.people.map(p => p.name))), events: s.events.length,
        tiers: Object.fromEntries(["living", "recent", "historic", "compressed"].map(t => [t, s.people.filter(p => p.tier === t).length])),
        evidence: { state: checked.text, events: JSON.stringify(s.events) }, initial };
}

function verifyRepeat(a, b) {
    assert(a.seed === b.seed && a.years === b.years, "Repeat seed/year mismatch");
    assert(a.evidence.state === b.evidence.state && a.evidence.events === b.evidence.events, "Repeated state/events differ byte-for-byte");
    assert(a.stateSha256 === b.stateSha256 && a.eventsSha256 === b.eventsSha256, "Repeated hashes differ");
}

function quietProfiles() {
    const p = profiles();
    Object.values(p).forEach(r => { r.birthChance = 0; r.infantMortality = 0; r.diseaseMortality = 0; r.exposureMortality = 0; });
    return p;
}
function smallWorld(loaded, species = "human", age = 25) {
    const world = clone(loaded.world), f = world.factions.list.find(f => f.species === species);
    assert(f, `Missing fixture species ${species}`);
    world.factions.list = [f]; world.factions.playerId = f.id;
    world.history.sites = world.history.sites.filter(s => s.faction === f.id);
    const record = world.history.founders[f.id];
    record.plan = ["female", "male"].map((gender, i) => ({ ...record.plan.find(p => p.gender === gender), age,
        familyId: "TEST_family", surname: "TEST_family", site: record.site, leader: i === 0, title: "TEST_Chief" }));
    world.history.sites.forEach(s => { s.pop = record.plan.filter(p => p.site === s.id).length; });
    f.population = record.plan.length;
    world.history.founders = { [f.id]: record };
    return world;
}
function targetedFixtures(loaded, check) {
    const D = loaded.api, quiet = quietProfiles();
    check("Dead parent cannot reproduce", () => {
        const cfg = clone(quiet); cfg.human.birthChance = 1; cfg.human.birthSpacingYears = 1;
        const s = D.create(smallWorld(loaded), { profiles: cfg });
        const mother = s.people.find(p => p.gender === "female");
        D.step(s, { casualtyIds: [mother.id] });
        assert(s.people.length === 2 && mother.died === 2, "Dead parent reproduced");
        integrity(s, cfg, siteGeometry(s));
    });
    check("Death immediately hands rulership to a living successor", () => {
        const s = D.create(smallWorld(loaded), { profiles: quiet });
        const old = s.rulers.find(r => r.toYear === null);
        D.step(s, { casualtyIds: [old.personId] });
        const active = s.rulers.filter(r => r.toYear === null);
        assert(active.length === 1 && s.people[active[0].personId].died === null && old.toYear === 2, "Dead active ruler / missing succession");
        integrity(s, quiet, siteGeometry(s));
    });
    check("Legitimate birth has valid female/male parent IDs", () => {
        const cfg = clone(quiet); cfg.human.birthChance = 1; cfg.human.birthSpacingYears = 1;
        const s = D.create(smallWorld(loaded), { profiles: cfg });
        D.step(s);
        assert(s.people.length === 3, "Birth fixture produced no child");
        assert(s.people[2].parents.every(id => s.people[id]), "Invalid parent IDs");
        integrity(s, cfg, siteGeometry(s));
    });
    check("Elf old-age mortality cannot use uniform human lifespan", () => {
        const s = D.create(smallWorld(loaded, "elf", 120), { profiles: quiet });
        D.step(s);
        assert(s.people.every(p => p.died === null), "Species lifespan violated: young elf died of old age");
    });
    check("Species maximum lifespan forces natural mortality", () => {
        const s = D.create(smallWorld(loaded, "human", 85), { profiles: quiet });
        D.step(s);
        assert(s.people.every(p => p.died === 2 && p.causeOfDeath === "old_age"), "Old-age upper bound not enforced");
        integrity(s, quiet, siteGeometry(s));
    });
    check("Half siblings and direct ancestors excluded; unrelated ID0 founders eligible", () => {
        const s = { people: [{ parents: [] }, { parents: [] }, { parents: [0, 1] }, { parents: [0, 4] }, { parents: [] }] };
        assert(!D.kinshipRelated(s, 0, 1) && D.kinshipRelated(s, 0, 2) && D.kinshipRelated(s, 2, 3), "Kinship exclusion failure");
    });
    check("Imported family bonds persist before reproductive maturity", () => {
        const w = smallWorld(loaded, "elf"), f = w.factions.list[0], record = w.history.founders[f.id];
        record.plan = [0, 1].flatMap(family => record.plan.map((p, i) => ({ ...p,
            familyId: `TEST_family_${family}`, surname: `TEST_family_${family}`,
            age: i === family ? 60 : 58, leader: family === 0 && i === 0 })));
        f.population = 4; w.history.sites[0].pop = 4;
        const cfg = clone(quiet); cfg.elf.birthChance = 1;
        const s = D.create(w, { profiles: cfg });
        assert(s.partnerships.length === 2 && s.partnerships.every(b => b.imported === true &&
            s.people[b.motherId].sourceFamilyId === s.people[b.fatherId].sourceFamilyId), "Imported family bond replaced before maturity");
        const bonds = s.partnerships.map(b => [b.motherId, b.fatherId]);
        D.step(s); assert(s.people.length === 4, "Immature partner reproduced");
        D.step(s); assert(s.people.length === 6, "Mature imported household did not reproduce");
        assert(JSON.stringify(s.partnerships.map(b => [b.motherId, b.fatherId])) === JSON.stringify(bonds), "Imported household was re-paired");
        integrity(s, cfg, siteGeometry(s));
    });
    check("Stable monogamous partnership and historical parent survival", () => {
        const cfg = clone(quiet); cfg.human.birthChance = 1; cfg.human.birthSpacingYears = 2;
        const s = D.create(smallWorld(loaded), { profiles: cfg }), h = clone(s.partnerships[0]);
        D.simulate(s, 3);
        assert(s.partnerships.length === 1 && s.partnerships[0].motherId === h.motherId && s.partnerships[0].fatherId === h.fatherId, "Annual re-pairing occurred");
        assert(s.people.filter(p => !p.isFounder).map(p => p.born).join() === "2,4", "Birth spacing ignored");
        D.step(s, { casualtyIds: [h.motherId] });
        integrity(s, cfg, siteGeometry(s)); // Mother dies AFTER valid earlier births.
        const bad = clone(s); bad.people[h.motherId].died = 2;
        let rejected = false; try { integrity(bad, cfg, siteGeometry(bad)); } catch (e) { rejected = /Dead parent reproduced/.test(e.message); }
        assert(rejected, "Temporal parental survival mutation not detected");
    });
    check("Minor ruler remains legitimate; extinct faction has no ruler", () => {
        const cfg = clone(quiet); cfg.human.birthChance = 1;
        const s = D.create(smallWorld(loaded), { profiles: cfg }); D.step(s);
        D.step(s, { casualtyIds: [0, 1] });
        const child = s.people[2], active = s.rulers.find(r => r.toYear === null);
        assert(active && active.personId === child.id && active.isMinor === true, "Minor-only faction lost ruler");
        integrity(s, cfg, siteGeometry(s));
        const invalidAccession = clone(s); invalidAccession.rulers[active.id].fromYear = 1;
        let rejected = false;
        try { D.validate(invalidAccession); } catch (e) { rejected = /not alive at accession/.test(e.message); }
        assert(rejected, "Pre-birth ruler accession accepted");
        D.step(s, { casualtyIds: [child.id] });
        assert(!s.rulers.some(r => r.toYear === null) && Object.values(s.factions)[0].activeRulerId === null, "Extinct faction retains ruler");
        integrity(s, cfg, siteGeometry(s));
    });
    check("A direct child outranks a grandchild despite higher genealogy depth", () => {
        // Deliberately long-lived TEST people permit remarriage across generations.
        // R(1) has child A(8), grandchild G(10), then later direct child C(12)
        // with unrelated X(11). C is generation3, G generation2; ancestry depth
        // must not be mistaken for distance from the deceased ruler.
        const w = smallWorld(loaded), f = w.factions.list[0], record = w.history.founders[f.id];
        record.plan = Array.from({ length: 4 }, (_, family) => record.plan.map((p, i) => ({ ...p,
            name: `TEST_founder_${family}_${i}`, age: 41, familyId: `TEST_family_${family}`,
            surname: `TEST_family_${family}`, leader: family === 0 && i === 1 }))).flat();
        f.population = 8; w.history.sites[0].pop = 8;
        const cfg = clone(quiet); cfg.human.lifespan = [1000, 1200]; cfg.human.reproductiveAge = [18, 900];
        const s = D.create(w, { profiles: cfg });
        const child = (gender, born, motherId, fatherId) => {
            const m = s.people[motherId], father = s.people[fatherId], id = s.people.length;
            s.people.push({ ...clone(m), id, name: `TEST_child_${id}`, gender, born, parents: [motherId, fatherId],
                generation: 1 + Math.max(m.generation, father.generation), title: null, isFounder: false,
                wasRuler: false, pedigreeAnchor: false, partnershipId: null, sourceFamilyId: null, lastBirthYear: null });
            m.lastBirthYear = born; m.pedigreeAnchor = father.pedigreeAnchor = true;
        };
        child("female", 2, 0, 1); child("male", 2, 4, 5);
        child("male", 22, 8, 3); child("female", 22, 6, 9);
        child("male", 52, 11, 1);
        s.currentYear = 69; s.yearsSimulated = 68;
        for (const [id, year] of [[2, 19], [7, 19], [0, 40], [8, 60]]) {
            Object.assign(s.people[id], { died: year, causeOfDeath: "violence", tier: 69 - year >= 20 ? "historic" : "recent" });
        }
        for (const p of s.people) p.partnershipId = null;
        for (const h of s.partnerships) {
            const deaths = [s.people[h.motherId].died, s.people[h.fatherId].died].filter(y => y !== null);
            h.toYear = deaths.length ? Math.min(...deaths) : null;
        }
        for (const [motherId, fatherId, fromYear, toYear] of [[8, 3, 20, 60], [6, 9, 20, null], [11, 1, 41, null]]) {
            s.partnerships.push({ id: s.partnerships.length, motherId, fatherId, siteId: 0, fromYear, toYear,
                lastBirthYear: null, imported: false });
        }
        for (const h of s.partnerships) {
            const births = s.people.filter(p => p.parents[0] === h.motherId && p.parents[1] === h.fatherId).map(p => p.born);
            h.lastBirthYear = births.length ? Math.max(...births) : null;
            if (h.toYear === null) for (const id of [h.motherId, h.fatherId]) s.people[id].partnershipId = h.id;
        }
        s.sites[0].population = s.people.filter(p => p.died === null).length; s.sites[0].peakPopulation = 10;
        D.validate(s); integrity(s, cfg, siteGeometry(s));
        D.step(s, { casualtyIds: [1] });
        const active = s.rulers.find(r => r.toYear === null);
        assert(active.personId === 12 && active.successionType === "hereditary", "Genealogy depth displaced a living direct heir");
        integrity(s, cfg, siteGeometry(s)); D.validate(s);
    });
    check("Disease and exposure hazards record separate causes", () => {
        for (const cause of ["disease", "exposure"]) {
            const s = D.create(smallWorld(loaded), { profiles: quiet });
            D.step(s, { siteRisks: { 0: { [cause]: 1 } } });
            assert(s.people.every(p => p.died === 2 && p.causeOfDeath === cause), `${cause} mortality absent`);
        }
    });
    check("Infant risk is evaluated after birth", () => {
        const cfg = clone(quiet); cfg.human.birthChance = 1; cfg.human.infantMortality = 1;
        const s = D.create(smallWorld(loaded), { profiles: cfg }); D.step(s);
        const child = s.people[2]; assert(child && child.died === null, "Newborn fixture failed"); D.step(s);
        assert(child.died === 3 && child.causeOfDeath === "disease", "Infant hazard absent");
    });
    check("No cross-site or cross-Z partnerships", () => {
        const w = smallWorld(loaded), fid = w.factions.list[0].id, source = w.history.sites[0];
        const second = { ...clone(source), id: source.id + 100, z: -1 };
        w.history.sites.push(second); w.history.founders[fid].plan[1].site = second.id; w.history.founders[fid].plan[1].z = -1;
        source.pop = 1; second.pop = 1;
        const cfg = clone(quiet); cfg.human.birthChance = 1;
        const s = D.create(w, { profiles: cfg }); D.simulate(s, 5);
        assert(s.partnerships.length === 0 && s.people.length === 2, "Cross-Z teleport pairing");
    });
    check("Invalid configuration rejected without source changes", () => {
        const w = smallWorld(loaded), before = JSON.stringify(w); let failed = false;
        try { D.create(w, {}); } catch (e) { failed = /profile/.test(e.message); }
        assert(failed && JSON.stringify(w) === before, "Missing profiles accepted or import changed source");
    });
}

function selftest(data, mutant = null) {
    const checks = [], check = (name, fn) => { fn(); checks.push({ name, status: "PASS" }); };
    const rejects = (fn, pattern) => { let e; try { fn(); } catch (error) { e = error; }
        assert(e && pattern.test(e.message), `Expected ${pattern}; got ${e ? e.message : "success"}`); };
    check("CLI defaults and overrides", () => {
        assert(parseArgs([]).years.join() === "100,250", "Wrong horizons");
        const o = parseArgs(["--years", "100", "--seed", "0", "--runs", "3", "--json"]);
        assert(o.seeds[0] === 0 && o.years[0] === 100 && o.runs === 3 && o.json, "CLI ignored");
    });
    for (const a of [["--years", "-1"], ["--years", "251"], ["--seed", "1.5"], ["--seed", "2147483648"], ["--runs", "0"], ["--seed"], ["--unknown"]])
        check(`Reject ${a.join(" ")}`, () => rejects(() => parseArgs(a), /Invalid|Unknown/));
    const loaded = load(data, 0, mutant);
    targetedFixtures(loaded, check);
    check("Invalid annual inputs fail before advancing persistent state", () => {
        for (const input of [42, [], null, { siteRisks: false }, { siteRisks: { 0: 42 } }, { casualtyIds: ["0"] }]) {
            const s = loaded.api.create(smallWorld(loaded), { profiles: quietProfiles() }), before = JSON.stringify(s);
            rejects(() => loaded.api.step(s, input), /invalid annual conditions|invalid site risks|invalid casualty IDs/);
            assert(JSON.stringify(s) === before, "Invalid conditions partially advanced state");
        }
        for (const input of [42, [], null]) {
            const s = loaded.api.create(smallWorld(loaded), { profiles: quietProfiles() }), before = JSON.stringify(s);
            rejects(() => loaded.api.simulate(s, 2, input), /invalid simulation options/);
            assert(JSON.stringify(s) === before, "Invalid simulation options partially advanced state");
        }
    });
    check("Persistent foreign keys require integer IDs", () => {
        const original = loaded.api.create(smallWorld(loaded), { profiles: quietProfiles() });
        for (const [registry, row, key] of [["people", 1, "dynastyId"], ["people", 1, "siteId"],
            ["rulers", 0, "personId"], ["dynasties", 0, "founderId"], ["partnerships", 0, "motherId"]]) {
            const s = clone(original); s[registry][row][key] = String(s[registry][row][key]);
            rejects(() => loaded.api.validate(s), /HistoricalDemographics: invalid/);
        }
    });
    check("A valid single-year workload need not contain both births and deaths", () => run(data, 0, 1, mutant));
    const a = run(data, 0, 100, mutant), b = run(data, 0, 100, mutant);
    check("Real founding import / deterministic 100-year run", () => verifyRepeat(a, b));
    check("Counts metadata mutation fails", () => {
        const changed = clone(a); changed.seed++;
        rejects(() => verifyRepeat(a, changed), /seed\/year/);
    });
    check("Non-JSON values rejected independently", () => {
        rejects(() => jsonSafe({ x: NaN }), /Nonfinite/); rejects(() => jsonSafe({ x: undefined }), /Non-JSON/);
        rejects(() => jsonSafe({ x: new Map() }), /Nonplain/);
    });
    check("Resume after JSON reload equals continuous 250 years", () => {
        const original = loaded.api.create(loaded.world, { profiles: profiles(), eventLimit: 1000000 });
        const continuous = clone(original), split = clone(original);
        loaded.api.simulate(continuous, 250); loaded.api.simulate(split, 100);
        const another = load(data, 0), resumed = clone(split); another.api.simulate(resumed, 150);
        assert(JSON.stringify(continuous) === JSON.stringify(resumed), "JSON resume changed state/RNG/IDs");
        integrity(resumed, profiles(), siteGeometry(original));
    });
    if (!mutant) for (const name of MUTANTS) check(`Mutation exits 1 for intended invariant: ${name}`, () => {
        const result = spawnSync(process.execPath, [__filename, `--mutant=${name}`], { cwd: ROOT, encoding: "utf8", windowsHide: true, timeout: 60000 });
        const patterns = { dead_reproduce: /Dead parent reproduced/, skip_succession: /Dead\/mismatched active ruler|Dead active ruler \/ missing succession/,
            corrupt_parents: /Invalid parent IDs/, uniform_lifespan: /Species lifespan violated: young elf/ };
        assert(!result.error && result.status === 1 && patterns[name].test(result.stderr), `Mutant ${name} did not fail its intended check: ${result.stderr || result.error}`);
        checks.push({ name: `Negative control ${name}`, observed: "FAIL (expected), exit 1", reason: result.stderr.split(/\r?\n/)[0] });
    });
    return { status: "PASS", checks, passed: checks.filter(c => c.status === "PASS").length };
}

function table(rows) {
    const grid = [["Seed", "Years", "Mean ms", "Worst ms", "Max year ms", "Living", "Archived", "Sites A/X", "State KiB", "Peak heap KiB*", "Repeat"],
        ...rows.map(r => [r.seed, r.years, r.meanMs.toFixed(3), r.worstMs.toFixed(3), r.maxYearMs.toFixed(3), r.living, r.archived,
            `${r.activeSites}/${r.abandonedSites}`, (r.stateBytes / 1024).toFixed(2), (r.peakHeap / 1024).toFixed(1), r.determinism])].map(r => r.map(String));
    const w = grid[0].map((_, i) => Math.max(...grid.map(r => r[i].length))), line = "+-" + w.map(n => "-".repeat(n)).join("-+-") + "-+";
    return [line, ...grid.flatMap((r, i) => ["| " + r.map((s, j) => s.padEnd(w[j])).join(" | ") + " |", ...(i ? [] : [line])]), line].join("\n");
}

function main() {
    const started = performance.now(), options = parseArgs(process.argv.slice(2));
    if (options.help) { console.log("Usage: node tools/test_production_history_demographics.js [--seed N] [--years 1..250] [--runs 1..20] [--json] [--selftest] [--mutant=<name>]"); return; }
    const data = sourceBundle();
    if (options.selftest || options.mutant) {
        const report = selftest(data, options.mutant);
        if (options.json) console.log(JSON.stringify(report, null, 2));
        else { report.checks.forEach(c => console.log(`${c.status || c.observed}: ${c.name}${c.reason ? " - " + c.reason : ""}`)); console.log(`Self-test PASS: ${report.passed} checks`); }
        // A surviving mutant exits 0; the parent selftest must reject it. Never
        // manufacture a failure merely because a mutant flag was supplied.
        return;
    }
    const runs = [], summary = [], variance = [];
    for (const seed of options.seeds) for (const years of options.years) {
        const group = [];
        for (let i = 0; i < options.runs; i++) { const r = run(data, seed, years); if (i) verifyRepeat(group[0], r); group.push(r); }
        const a = group[0];
        variance.push({ seed, years, population: `${a.living}/${a.archived}`, names: a.namesSha256, events: a.eventsSha256 });
        summary.push({ seed, years, runs: options.runs, meanMs: mean(group.map(r => r.timing.totalMs)),
            worstMs: Math.max(...group.map(r => r.timing.totalMs)), maxYearMs: Math.max(...group.map(r => r.timing.maxYearMs)),
            living: a.living, archived: a.archived, activeSites: a.activeSites, abandonedSites: a.abandonedSites,
            stateBytes: a.stateBytes, peakHeap: Math.max(...group.map(r => r.heap.sampledPeakDelta)), determinism: options.runs > 1 ? "PASS" : "NOT RUN" });
        for (const r of group) { delete r.evidence; delete r.initial; runs.push(r); }
    }
    if (options.seeds.length > 1) for (const year of options.years) {
        const v = variance.filter(r => r.years === year);
        for (const key of ["population", "names", "events"]) assert(new Set(v.map(r => r[key])).size > 1, `Seed variance missing: ${key}`);
    }
    assert(JSON.stringify(sourceBundle().sources) === JSON.stringify(data.sources), "Read-only inputs changed during proof");
    const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, windowsHide: true, encoding: "utf8" });
    const report = { task: "DEUS-TSK-ASTRA-06", schemaVersion: 1, status: "PASS", createdAt: new Date().toISOString(), options,
        runtime: { node: process.version, cpu: (os.cpus()[0] || {}).model }, provenance: { head: head.stdout.trim(), sources: data.sources },
        testProfiles: profiles(), profileStatus: "Provisional proof inputs, not approved catalog biology or automatically enabled game behavior",
        methodology: { timings: "Only production api.step calls are included in annual/total simulation timings. Setup, heap sampling and verification reported separately.",
            memory: "Sampled annual process heap high-water delta, including temporary allocations and ordinary GC; not exact state footprint or a leak assertion. No forced GC.",
            spatial: "Imports real Year-1 terrain/faction/founder records; no expansion, migration, map stamping or spawned live units.",
            scope: "No registration in plugins.js, no New Game hook, no deep-history compression, tactical combat or native gameplay proof." },
        seedVariance: options.seeds.length > 1 ? "PASS" : "NOT RUN", summary, runs, totalWallMs: performance.now() - started };
    fs.mkdirSync(path.dirname(OUTPUT), { recursive: true }); fs.writeFileSync(OUTPUT, JSON.stringify(report, null, 2) + "\n");
    const human = table(summary) + `\nPASS; wall ${(report.totalWallMs / 1000).toFixed(3)} s; JSON: ${OUTPUT}`;
    if (options.json) { console.error(human); console.log(JSON.stringify(report, null, 2)); } else console.log(human);
}
try { main(); } catch (e) { console.error(`FAIL: ${e.stack || e}`); process.exitCode = 1; }
