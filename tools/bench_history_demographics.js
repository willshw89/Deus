#!/usr/bin/env node
"use strict";

// DEUS-TSK-ASTRA-05. A prospective, synthetic workload, NOT a game simulator.
// Only the existing deterministic helpers and catalog inputs are read. No
// production plugin is loaded, patched, enabled, or called; no save is written.
const fs = require("fs"), path = require("path"), vm = require("vm"), os = require("os");
const crypto = require("crypto");
const { performance } = require("perf_hooks");
const { spawnSync } = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "game/test_output/bench_history_demographics.json");
const BASELINE = "6941395";
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const sha = text => crypto.createHash("sha256").update(text).digest("hex");
const clone = value => JSON.parse(JSON.stringify(value));
const mean = values => values.reduce((a, b) => a + b, 0) / values.length;
const elapsed = start => performance.now() - start;

function reportPath(raw) {
    const target = path.resolve(raw), allowed = path.dirname(OUTPUT);
    const within = (base, file) => {
        const relative = path.relative(base, file);
        return relative !== ".." && !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative);
    };
    assert(/\.json$/i.test(target) && within(allowed, target), "Report path must be a .json file under game/test_output");
    // Resolve the nearest existing ancestor, including an existing report file,
    // so a junction/symlink cannot redirect a report into protected data.
    let ancestor = target;
    while (!fs.existsSync(ancestor)) ancestor = path.dirname(ancestor);
    const realTarget = path.resolve(fs.realpathSync(ancestor), path.relative(ancestor, target));
    assert(within(fs.realpathSync(ROOT), realTarget) && within(allowed, realTarget), "Report path escapes game/test_output through a link");
    if (fs.existsSync(target)) assert(fs.statSync(target).isFile(), "Report target must be a file");
    return target;
}

function parseArgs(args) {
    const out = { seeds: [0, 424242, 20260919], years: [100, 250, 500], scales: [1, 4, 16], runs: 2, json: OUTPUT, selftest: false };
    for (let i = 0; i < args.length; i++) {
        const key = args[i];
        if (["--selftest", "--help"].includes(key)) { out[key.slice(2)] = true; continue; }
        assert(["--seed", "--years", "--runs", "--scale", "--json"].includes(key), `Unknown argument ${key}`);
        const raw = args[++i];
        assert(raw !== undefined && raw.trim() !== "" && !raw.startsWith("--"), `Missing value for ${key}`);
        if (key === "--json") { out.json = reportPath(raw); continue; }
        const n = Number(raw), min = key === "--seed" ? 0 : 1;
        const max = key === "--seed" ? 2147483647 : key === "--years" ? 2000 : key === "--runs" ? 100 : 64;
        assert(/^\d+$/.test(raw) && Number.isSafeInteger(n) && n >= min && n <= max, `Invalid ${key}: expected integer ${min}..${max}`);
        if (key === "--runs") out.runs = n;
        else out[key === "--seed" ? "seeds" : key === "--scale" ? "scales" : "years"] = [n];
    }
    return out;
}

function bundle() {
    const files = ["game/js/plugins/DEUS_History.js", "game/js/plugins/DEUS_World.js", "game/data/UF_WorldCatalog.json",
        "tools/bench_history_sim.js", "tools/bench_history_demographics.js"];
    const texts = files.map(file => fs.readFileSync(path.join(ROOT, file), "utf8"));
    const source = texts[0], begin = "    function hash32(...parts) {", end = "    const SALT_HISTORY =";
    assert(source.split(begin).length === 2 && source.split(end).length === 2, "PRNG source anchors changed; review extraction");
    const helpers = source.slice(source.indexOf(begin), source.indexOf(end));
    const math = Object.create(Math);
    math.random = () => { throw new Error("Unseeded Math.random forbidden"); };
    const rng = vm.compileFunction(helpers + "\nreturn {hash32, mulberry32};", ["Math"])(math);
    const catalog = JSON.parse(texts[2]), f = catalog.factions.founders;
    const config = {
        model: "TEST_demographics_v1", domain: "historical", cultures: catalog.factions.species.map(s => s.id),
        founderMale: f.male, founderFemale: f.female, founderAge: f.age.slice(),
        populationCapPerFaction: catalog.history.populationCap,
        birthChancePerPair: catalog.history.settle.birthChancePerPair,
        rulerTerm: catalog.history.rulerReign.slice(), eventsKept: catalog.history.eventsKept,
        // Workload assumptions, deliberately uniform across all cultures.
        reproductiveAge: [18, 59], lifespan: [55, 85], splitPopulation: 160, splitEveryYears: 25,
        abandonmentPopulation: catalog.history.settle.minPeople,
        maxArchivedPeople: 2000000
    };
    assert(config.cultures.length > 0 && new Set(config.cultures).size === config.cultures.length, "Invalid catalog faction roster");
    assert(f.male === 4 && f.female === 4 && catalog.history.simulate === false, "Canonical founder/history defaults changed; review workload baseline");
    assert(config.eventsKept > 0 && config.populationCapPerFaction > 0 && config.birthChancePerPair >= 0 && config.birthChancePerPair <= 1, "Invalid workload inputs");
    return { config, rng, sources: files.map((file, i) => ({ path: file, sha256: sha(texts[i]) })) };
}

function stage(age) { return age < 1 ? "baby" : age < 12 ? "child" : age < 18 ? "teen" : age < 60 ? "adult" : "elder"; }
function census(people, year) {
    const out = { living: 0, deceased: 0, cohorts: { baby: 0, child: 0, teen: 0, adult: 0, elder: 0 }, ages: {} };
    for (const p of people) {
        if (p.died !== null) { out.deceased++; continue; }
        out.living++;
        const age = year - p.born;
        out.cohorts[stage(age)]++;
        out.ages[age] = (out.ages[age] || 0) + 1;
    }
    return out;
}

function streamRecorder() {
    const hash = crypto.createHash("sha256");
    let count = 0, arrayBytes = 2;
    return {
        add(events) {
            for (const event of events) {
                const text = JSON.stringify(event);
                hash.update(text + "\n"); // All events, including later-discarded records.
                arrayBytes += Buffer.byteLength(text) + (count++ ? 1 : 0);
            }
        },
        finish() { return { count, arrayBytes, sha256: hash.digest("hex"), encoding: "UTF-8 NDJSON, one newline per event" }; }
    };
}

function simulate(input, cfg, rng, observe = () => {}) {
    const { seed, years, scale } = input;
    const rand = rng.mulberry32(rng.hash32(seed, 0x44454d4f));
    const roll = ([lo, hi]) => lo + Math.floor(rand() * (hi - lo + 1));
    const state = { model: cfg.model, domain: "historical", seed, years, scale, config: cfg,
        people: [], sites: [], dynasties: [], rulers: [], events: [], checkpoints: [],
        counts: { initial: 0, births: 0, deaths: 0, living: 0, peakLiving: 0, eventsGenerated: 0, blockedBirths: 0, successions: 0 } };
    const factions = cfg.cultures.map((culture, id) => ({ id, culture, living: [], ruler: null, lastRuler: null }));
    let batch = [], simulationMs = 0, initializationMs = 0, maxYearMs = 0;
    const emit = (year, type, faction, site, person = null) => {
        const id = ++state.counts.eventsGenerated;
        const event = { id, year, type, faction, site, person, text: `TEST_${type}: faction ${faction}, site ${site}, person ${person}` };
        if (state.events.length < cfg.eventsKept) state.events.push(event);
        else state.events[(id - 1) % cfg.eventsKept] = event;
        batch.push(event);
    };
    const createSite = (f, year) => {
        const site = { id: state.sites.length, faction: f.id, founded: year, abandoned: null, population: 0 };
        state.sites.push(site); emit(year, "founding", f.id, site.id); return site;
    };
    const createPerson = (f, site, born, female, parents, dynasty) => {
        assert(state.people.length < cfg.maxArchivedPeople, "Synthetic workload safety limit reached; no result certified");
        const generation = parents.length ? 1 + Math.max(...parents.map(id => state.people[id].generation)) : 0;
        const p = { id: state.people.length, faction: f.id, site: site.id, born, died: null,
            deathAt: born + roll(cfg.lifespan), female, parents, dynasty, generation };
        state.people.push(p); f.living.push(p.id); site.population++;
        state.counts.living++;
        state.counts.peakLiving = Math.max(state.counts.peakLiving, state.counts.living);
        return p;
    };
    const succeed = (f, year) => {
        const active = f.ruler, prior = f.lastRuler;
        if (active && state.people[active.person].died === null && year < active.until) return;
        if (active && active.to === null) active.to = year;
        // Oldest adult in the previous maternal dynasty; otherwise oldest adult.
        let best = null;
        for (const id of f.living) {
            const p = state.people[id];
            if (year - p.born < cfg.reproductiveAge[0]) continue;
            const same = prior && p.dynasty === prior.dynasty;
            const bestSame = best && prior && best.dynasty === prior.dynasty;
            if (!best || (same && !bestSame) || (!!same === !!bestSame && (p.born < best.born || (p.born === best.born && p.id < best.id)))) best = p;
        }
        f.ruler = null;
        if (!best) return;
        const record = { faction: f.id, person: best.id, dynasty: best.dynasty, from: year, to: null, until: year + roll(cfg.rulerTerm) };
        state.rulers.push(record); f.ruler = record; f.lastRuler = record;
        if (prior) state.counts.successions++;
        emit(year, prior ? "succession" : "ruler", f.id, best.site, best.id);
    };
    const checkpoint = year => {
        const living = factions.flatMap(f => f.living).map(id => state.people[id]);
        const population = census(living, year);
        state.checkpoints.push({ year, living: population.living, deceased: state.counts.deaths,
            cohorts: population.cohorts, ages: population.ages, eventsGenerated: state.counts.eventsGenerated });
    };
    const start = performance.now();
    for (const f of factions) {
        const site = createSite(f, 0);
        const n = (cfg.founderMale + cfg.founderFemale) * scale;
        for (let i = 0; i < n; i++) {
            if (i % 2 === 0) state.dynasties.push({ id: state.dynasties.length, founder: state.people.length, faction: f.id });
            const p = createPerson(f, site, -roll(cfg.founderAge), i % 2 === 1, [], state.dynasties.length - 1);
            state.counts.initial++; emit(0, "founder", f.id, site.id, p.id);
        }
        succeed(f, 0);
    }
    state.counts.peakLiving = state.counts.living;
    checkpoint(0);
    initializationMs = elapsed(start); simulationMs += initializationMs;
    observe(0, batch, state); batch = [];
    for (let year = 1; year <= years; year++) {
        const t = performance.now();
        for (const f of factions) {
            const survivors = [], women = [], men = [];
            for (const id of f.living) {
                const p = state.people[id];
                if (year >= p.deathAt) {
                    p.died = year; state.sites[p.site].population--; state.counts.deaths++; state.counts.living--;
                    emit(year, "death", f.id, p.site, p.id);
                } else {
                    survivors.push(id);
                    const age = year - p.born;
                    if (age >= cfg.reproductiveAge[0] && age <= cfg.reproductiveAge[1]) (p.female ? women : men).push(id);
                }
            }
            f.living = survivors;
            // Annual stable-ID pair matching is a workload assumption, not marriage.
            for (let i = 0; i < Math.min(women.length, men.length); i++) {
                if (rand() >= cfg.birthChancePerPair) continue;
                if (f.living.length >= cfg.populationCapPerFaction * scale) { state.counts.blockedBirths++; continue; }
                const mother = state.people[women[i]], father = state.people[men[i]];
                const baby = createPerson(f, state.sites[mother.site], year, rand() < 0.5, [mother.id, father.id], mother.dynasty);
                state.counts.births++; emit(year, "birth", f.id, baby.site, baby.id);
            }
            const sites = state.sites.filter(s => s.faction === f.id && s.abandoned === null);
            for (const site of sites) {
                if (site.population < cfg.abandonmentPopulation) {
                    const target = sites.find(s => s !== site && s.abandoned === null && s.population >= cfg.abandonmentPopulation);
                    if (target || site.population === 0) {
                        for (const id of f.living) {
                            const p = state.people[id];
                            if (p.site === site.id) { p.site = target.id; target.population++; }
                        }
                        site.population = 0; site.abandoned = year; emit(year, "abandonment", f.id, site.id);
                    }
                } else if (year % cfg.splitEveryYears === 0 && site.population >= cfg.splitPopulation) {
                    const next = createSite(f, year), wanted = Math.floor(site.population / 3);
                    for (const id of f.living) {
                        const p = state.people[id];
                        if (p.site === site.id && next.population < wanted) { p.site = next.id; next.population++; site.population--; }
                    }
                }
            }
            succeed(f, year);
        }
        state.counts.peakLiving = Math.max(state.counts.peakLiving, state.counts.living);
        if (year % 100 === 0 || year === years) checkpoint(year);
        const ms = elapsed(t); simulationMs += ms; maxYearMs = Math.max(maxYearMs, ms);
        observe(year, batch, state); batch = [];
    }
    const final = performance.now();
    state.events.sort((a, b) => a.id - b.id);
    simulationMs += elapsed(final);
    return { state, timing: { simulationMs, initializationMs, maxYearMs } };
}

function metrics(state) {
    const population = census(state.people, state.years);
    const ruling = new Set(state.rulers.map(r => r.dynasty));
    const curves = state.checkpoints.map((c, i) => ({ ...c,
        yearsInInterval: i ? c.year - state.checkpoints[i - 1].year : 0,
        eventsInInterval: c.eventsGenerated - (i ? state.checkpoints[i - 1].eventsGenerated : 0) }));
    return { ...population, peakLiving: state.counts.peakLiving, peopleArchived: state.people.length,
        births: state.counts.births, blockedBirths: state.counts.blockedBirths,
        settlementsFounded: state.sites.length, settlementsAbandoned: state.sites.filter(s => s.abandoned !== null).length,
        extinctFactions: state.config.cultures.length - new Set(state.people.filter(p => p.died === null).map(p => p.faction)).size,
        dynasties: state.dynasties.length, rulingDynasties: ruling.size, rulerAppointments: state.rulers.length, successions: state.counts.successions,
        maxRulerLineageDepth: state.rulers.reduce((n, r) => Math.max(n, state.people[r.person].generation), 0),
        maxGenealogyDepth: state.people.reduce((n, p) => Math.max(n, p.generation), 0),
        eventsGenerated: state.counts.eventsGenerated, eventsRetained: state.events.length,
        eventsDiscarded: state.counts.eventsGenerated - state.events.length, growth: curves };
}

function validate(state, m) {
    const actual = metrics(state);
    assert(JSON.stringify(actual) === JSON.stringify(m), "Simulated counts/metrics mismatch");
    assert(m.living + m.deceased === state.people.length && state.counts.initial + m.births === state.people.length, "Population conservation failed");
    assert(m.living === state.counts.living && m.deceased === state.counts.deaths, "Living/deceased count mismatch");
    assert(Object.values(m.cohorts).reduce((a, b) => a + b, 0) === m.living, "Cohort count mismatch");
    const residents = new Array(state.sites.length).fill(0);
    for (const [i, p] of state.people.entries()) {
        assert(p.id === i && state.sites[p.site] && state.dynasties[p.dynasty], "Invalid person ID/reference");
        assert(p.born <= state.years && (p.died === null ? p.deathAt > state.years : p.died >= p.born && p.died <= state.years), "Invalid lifespan");
        for (const id of p.parents) assert(state.people[id] && id < p.id && p.born - state.people[id].born >= state.config.reproductiveAge[0], "Invalid parent chronology");
        if (p.died === null) residents[p.site]++;
    }
    state.sites.forEach((s, i) => assert(s.id === i && residents[i] === s.population && (s.abandoned === null || s.population === 0), "Settlement population mismatch"));
    state.rulers.forEach(r => assert(state.people[r.person] && state.people[r.person].dynasty === r.dynasty && r.from <= state.years && (r.to === null || r.to >= r.from), "Invalid ruler lineage"));
    assert(m.successions === state.rulers.length - new Set(state.rulers.map(r => r.faction)).size, "Succession count mismatch");
    assert(m.growth.reduce((sum, c) => sum + c.eventsInInterval, 0) === m.eventsGenerated, "Event growth intervals do not reconcile");
    assert(m.eventsRetained === Math.min(state.config.eventsKept, m.eventsGenerated), "Event retention mismatch");
    state.events.forEach((e, i) => assert(e.id === m.eventsGenerated - m.eventsRetained + i + 1 && e.year <= state.years, "Retained event ordering mismatch"));
}

function worker(input, capture = false) {
    const started = performance.now(), data = bundle(), setupMs = elapsed(started);
    const stream = streamRecorder(), evidenceEvents = capture ? [] : null;
    let peakHeap = 0, observationMs = 0;
    const before = process.memoryUsage().heapUsed;
    peakHeap = before;
    const { state, timing } = simulate(input, data.config, data.rng, (year, events) => {
        const t = performance.now();
        // Sample before allocating JSON/hash evidence for this annual batch.
        peakHeap = Math.max(peakHeap, process.memoryUsage().heapUsed);
        stream.add(events);
        if (capture) evidenceEvents.push(...events);
        observationMs += elapsed(t);
    });
    const after = process.memoryUsage().heapUsed;
    peakHeap = Math.max(peakHeap, after);
    const t = performance.now(), m = metrics(state);
    validate(state, m);
    const validationMs = elapsed(t), serializedAt = performance.now();
    const stateText = JSON.stringify(state), retainedText = JSON.stringify(state.events), all = stream.finish();
    assert(all.count === m.eventsGenerated, "Full event stream count mismatch");
    const bytes = Buffer.byteLength(stateText), retainedBytes = Buffer.byteLength(retainedText);
    const result = { ...input, metrics: m, sources: data.sources,
        memory: { heapBeforeBytes: before, heapAfterBytes: after, netHeapDeltaBytes: after - before,
            sampledPeakHeapBytes: peakHeap, sampledPeakDeltaBytes: peakHeap - before },
        serialization: { stateUtf8Bytes: bytes, stateCharacters: stateText.length, retainedEventBytes: retainedBytes,
            allGeneratedEventArrayBytes: all.arrayBytes, fullEventArchiveProjectionBytes: bytes - retainedBytes + all.arrayBytes,
            bytesPerArchivedPerson: bytes / state.people.length },
        checksums: { state: sha(stateText), retainedEvents: sha(retainedText), allEvents: all.sha256 },
        timing: { ...timing, setupMs, observationMs, validationMs, serializationMs: elapsed(serializedAt),
            per100YearsMs: timing.simulationMs * 100 / input.years, yearsPerSecond: input.years * 1000 / timing.simulationMs },
        evidence: capture ? { state: stateText, events: JSON.stringify(evidenceEvents) } : undefined };
    result.timing.workerWallMs = elapsed(started);
    return result;
}

function verifyRepeat(a, b) {
    assert(a.seed === b.seed && a.years === b.years && a.scale === b.scale, "Seed/year/scale mismatch");
    assert(JSON.stringify(a.metrics) === JSON.stringify(b.metrics), "Simulated counts/metrics mismatch");
    assert(JSON.stringify(a.serialization) === JSON.stringify(b.serialization), "Serialized sizes mismatch");
    assert(a.checksums.allEvents === b.checksums.allEvents, "Full event stream mismatch");
    assert(a.checksums.retainedEvents === b.checksums.retainedEvents, "Retained events mismatch");
    assert(a.checksums.state === b.checksums.state, "State bytes mismatch");
    if (a.evidence && b.evidence) assert(a.evidence.state === b.evidence.state && a.evidence.events === b.evidence.events, "Captured byte-for-byte evidence mismatch");
}

function runTrial(data, input) {
    const t = performance.now();
    const result = spawnSync(process.execPath, [__filename, "--worker", String(input.seed), String(input.years), String(input.scale)],
        { cwd: ROOT, encoding: "utf8", windowsHide: true, maxBuffer: 8 * 1024 * 1024, timeout: 180000 });
    assert(!result.error && result.status === 0, `Trial ${JSON.stringify(input)} failed: ${result.error || result.stderr || result.status}`);
    const r = JSON.parse(result.stdout);
    assert(JSON.stringify(r.sources) === JSON.stringify(data.sources), "Source drift during benchmark");
    r.timing.processWallMs = elapsed(t);
    r.timing.processOverheadMs = r.timing.processWallMs - r.timing.workerWallMs;
    delete r.sources;
    return r;
}

function selftest(data) {
    const checks = [], check = (name, fn) => { fn(); checks.push({ name, status: "PASS" }); };
    const reject = (fn, pattern) => { let error; try { fn(); } catch (e) { error = e; }
        assert(error && pattern.test(error.message), `Expected ${pattern}; got ${error ? error.message : "success"}`); return error.message; };
    check("CLI defaults and explicit flags", () => {
        const d = parseArgs([]), p = parseArgs(["--seed", "0", "--years", "250", "--runs", "3", "--scale", "4", "--json", OUTPUT]);
        assert(d.runs === 2 && d.years.join() === "100,250,500" && d.seeds.join() === "0,424242,20260919", "Defaults changed");
        assert(p.seeds[0] === 0 && p.years[0] === 250 && p.runs === 3 && p.scales[0] === 4 && p.json === OUTPUT, "Overrides ignored");
    });
    for (const args of [["--years", "-1"], ["--years", "0"], ["--years", "2.5"], ["--years", "2001"],
        ["--seed", "1.5"], ["--seed", "2147483648"], ["--runs", "0"], ["--runs", "NaN"], ["--scale", "0"], ["--scale", "65"],
        ["--json"], ["--json", "--runs"], ["--json", "bad.js"], ["--json", "game/data/UF_WorldCatalog.json"],
        ["--json", "game/save/TEST_report.json"], ["--json", "game/test_output/../data/TEST_report.json"], ["--unknown"]])
        check(`Reject ${args.join(" ")}`, () => reject(() => parseArgs(args), /Invalid|Missing|Unknown|Report path/));
    check("Unmodified PRNG reference vectors", () => {
        assert(data.rng.hash32(0, 0x4157) === 954361837 && data.rng.hash32(424242, 0x4157) === 4062503306, "Hash changed");
        const rand = data.rng.mulberry32(0);
        assert([0, 1, 2].map(() => rand() * 4294967296).join() === "1144304738,1416247,958946056", "Mulberry32 changed");
    });
    check("Independent lifespan/cohort oracle", () => {
        const people = [100, 95, 85, 60, 30].map(born => ({ born, died: null })).concat([{ born: 40, died: 90 }]);
        const c = census(people, 100);
        assert(c.living === 5 && c.deceased === 1 && Object.values(c.cohorts).every(n => n === 1), "Cohort oracle mismatch");
        assert(Object.keys(c.ages).join() === "0,5,15,40,70", "Age histogram mismatch");
    });
    const a = worker({ seed: 0, years: 100, scale: 1 }, true), b = worker({ seed: 0, years: 100, scale: 1 }, true);
    check("Repeat event stream and state are byte-for-byte identical", () => verifyRepeat(a, b));
    check("Unretained event array byte projection is exact", () => assert(Buffer.byteLength(a.evidence.events) === a.serialization.allGeneratedEventArrayBytes, "Event byte projection mismatch"));
    const mutations = [
        ["simulated counts", r => r.metrics.living++, /counts/],
        ["seed", r => r.seed++, /Seed/],
        ["discarded event text with recomputed hash", r => {
            const e = JSON.parse(r.evidence.events); assert(e.length > r.metrics.eventsRetained, "Control requires discarded events");
            e[0].text += " MUTATION"; const s = streamRecorder(); s.add(e); r.checksums.allEvents = s.finish().sha256;
        }, /Full event/],
        ["retained event text with recomputed hashes", r => {
            const state = JSON.parse(r.evidence.state); state.events[0].text += " MUTATION";
            r.checksums.retainedEvents = sha(JSON.stringify(state.events)); r.checksums.state = sha(JSON.stringify(state));
        }, /Retained events/],
        ["state data with recomputed hash", r => {
            const state = JSON.parse(r.evidence.state); state.people[0].born--; r.checksums.state = sha(JSON.stringify(state));
        }, /State bytes/]
    ];
    for (const [name, mutate, pattern] of mutations) check(`Mutation rejected: ${name}`, () => {
        const changed = clone(b); mutate(changed);
        const reason = reject(() => verifyRepeat(a, changed), pattern);
        checks.push({ name: `Negative control: ${name}`, observed: "FAIL (expected)", reason });
    });
    check("Population corruption rejected independently", () => {
        const state = JSON.parse(a.evidence.state); state.counts.deaths++;
        reject(() => validate(state, metrics(state)), /count mismatch/);
    });
    check("Settlement extinction and complete lifespan accounting", () => {
        const cfg = { ...data.config, birthChancePerPair: 0, lifespan: [41, 41] };
        const { state } = simulate({ seed: 0, years: 50, scale: 1 }, cfg, data.rng);
        const m = metrics(state); validate(state, m);
        assert(m.living === 0 && m.deceased === 72 && m.extinctFactions === 9 && m.settlementsAbandoned === 9, "Extinction fixture mismatch");
    });
    check("Succession retains dynasty history across ruler vacancies", () => {
        const cfg = { ...data.config, cultures: [data.config.cultures[0]], founderAge: [18, 18], lifespan: [21, 21],
            birthChancePerPair: 1, rulerTerm: [100, 100] };
        const { state } = simulate({ seed: 0, years: 50, scale: 1 }, cfg, data.rng);
        const m = metrics(state); validate(state, m);
        assert(state.rulers.some((r, i) => i && r.from > state.rulers[i - 1].to), "Fixture did not create a vacancy");
        assert(m.rulerAppointments === 5 && m.successions === 4, "Vacancy succession oracle mismatch");
        const changed = clone(state); changed.counts.successions--;
        reject(() => validate(changed, metrics(changed)), /Succession count/);
    });
    check("Peak population matches independent event replay within each year", () => {
        const cfg = { ...data.config, cultures: data.config.cultures.slice(0, 2) };
        let living = 0, peak = 0;
        const { state } = simulate({ seed: 0, years: 42, scale: 1 }, cfg, data.rng, (year, events) => {
            for (const e of events) {
                if (e.type === "founder" || e.type === "birth") living++;
                if (e.type === "death") living--;
                peak = Math.max(peak, living);
            }
        });
        assert(peak === 33 && state.counts.peakLiving === peak && state.counts.living === living, "Within-year population peak lost");
    });
    check("Partial-century intervals reconcile", () => {
        const { state } = simulate({ seed: 424242, years: 125, scale: 1 }, data.config, data.rng);
        const m = metrics(state); validate(state, m);
        assert(m.growth.map(c => c.yearsInInterval).join() === "0,100,25", "Partial interval missing");
    });
    return { status: "PASS", passed: checks.filter(c => c.status === "PASS").length, checks };
}

function summarize(runs) {
    const r = runs[0];
    return { seed: r.seed, years: r.years, scale: r.scale, runs: runs.length,
        meanMs: mean(runs.map(r => r.timing.simulationMs)), worstMs: Math.max(...runs.map(r => r.timing.simulationMs)),
        meanMsPer100Years: mean(runs.map(r => r.timing.per100YearsMs)), yearsPerSecond: r.years * 1000 / mean(runs.map(r => r.timing.simulationMs)),
        sampledPeakHeapDeltaKiB: Math.max(...runs.map(r => r.memory.sampledPeakDeltaBytes)) / 1024,
        stateKiB: r.serialization.stateUtf8Bytes / 1024, fullEventArchiveProjectionKiB: r.serialization.fullEventArchiveProjectionBytes / 1024,
        living: r.metrics.living, deceased: r.metrics.deceased, peakLiving: r.metrics.peakLiving,
        eventsGenerated: r.metrics.eventsGenerated, eventsRetained: r.metrics.eventsRetained,
        successions: r.metrics.successions, dynasties: r.metrics.dynasties, rulerLineageDepth: r.metrics.maxRulerLineageDepth,
        determinism: runs.length > 1 ? "PASS" : "NOT RUN" };
}
function table(rows) {
    const grid = [["Seed", "Yr", "Load", "Mean ms", "Worst ms", "ms/100yr", "Years/s", "Heap peak KiB*", "State KiB", "Alive/dead", "Peak alive", "Lineage", "Repeat"],
        ...rows.map(r => [r.seed, r.years, `${r.scale}x`, r.meanMs.toFixed(2), r.worstMs.toFixed(2), r.meanMsPer100Years.toFixed(2),
            r.yearsPerSecond.toFixed(0), r.sampledPeakHeapDeltaKiB.toFixed(0), r.stateKiB.toFixed(1), `${r.living}/${r.deceased}`,
            r.peakLiving, r.rulerLineageDepth, r.determinism])].map(row => row.map(String));
    const widths = grid[0].map((_, i) => Math.max(...grid.map(row => row[i].length)));
    const line = "+-" + widths.map(w => "-".repeat(w)).join("-+-") + "-+";
    return [line, ...grid.flatMap((row, i) => ["| " + row.map((s, j) => s.padEnd(widths[j])).join(" | ") + " |", ...(i === 0 ? [line] : [])]), line].join("\n");
}

function main() {
    const start = performance.now();
    if (process.argv[2] === "--worker") {
        assert(process.argv.length === 6, "Invalid worker arguments");
        const o = parseArgs(["--seed", process.argv[3], "--years", process.argv[4], "--scale", process.argv[5]]);
        Math.random = () => { throw new Error("Unseeded Math.random forbidden"); };
        console.log(JSON.stringify(worker({ seed: o.seeds[0], years: o.years[0], scale: o.scales[0] })));
        return;
    }
    const options = parseArgs(process.argv.slice(2));
    if (options.help) { console.log("Usage: node tools/bench_history_demographics.js [--seed 0..2147483647] [--years 1..2000] [--runs 1..100] [--scale 1..64] [--json <game/test_output/path.json>] [--selftest]\nDefault: three seeds, 100/250/500 years, 1x/4x/16x population, two runs. Synthetic workload only. --selftest does not replace the benchmark report."); return; }
    reportPath(options.json);
    const data = bundle();
    if (options.selftest) {
        const r = selftest(data);
        for (const c of r.checks) console.log(`${c.status || c.observed}: ${c.name}${c.reason ? " - " + c.reason : ""}`);
        console.log(`Self-test ${r.status}: ${r.passed} checks; wall ${(elapsed(start) / 1000).toFixed(3)} s`); return;
    }
    const runs = [], rows = [];
    for (const seed of options.seeds) for (const years of options.years) for (const scale of options.scales) {
        const group = [];
        for (let run = 1; run <= options.runs; run++) {
            const r = runTrial(data, { seed, years, scale });
            if (group.length) verifyRepeat(group[0], r);
            r.run = run; group.push(r); runs.push(r);
        }
        rows.push(summarize(group));
    }
    const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8", windowsHide: true });
    assert(JSON.stringify(bundle().sources) === JSON.stringify(data.sources), "Source drift before report");
    const report = { task: "DEUS-TSK-ASTRA-05", schemaVersion: 1, status: "PASS", createdAt: new Date().toISOString(), options,
        provenance: { requestedBaseline: BASELINE, observedHead: head.status === 0 ? head.stdout.trim() : null, sources: data.sources },
        runtime: { node: process.version, v8: process.versions.v8, platform: process.platform, cpu: (os.cpus()[0] || {}).model },
        model: { config: data.config, claimedFactionCount: 11, observedFactionCount: data.config.cultures.length,
            assumptions: ["Synthetic individual model; all cultures use the same biology. Not production history, new lore, or a save schema.",
                "Loads multiply both catalog founder counts and faction carrying caps. Initial synthetic year is 0; no world/campfire is instantiated.",
                "Lifespan uniformly 55..85; no disease, war, immigration, or preassigned family ties. Every lifetime is archived.",
                "Stable-ID adult pairs matched anew each year, ages18..59, catalog birth probability, one trial per pair; births blocked at faction cap.",
                "Child inherits maternal dynasty; genealogy depth is max parent depth+1. Founder pairs establish dynasties.",
                "Ruler death or term end selects oldest adult in previous dynasty, else oldest adult. Successions count appointments after each faction's first, including reappointments and vacancies. Lineage depth is genealogical, not succession count.",
                "Sites split one-third of residents every25 years above160 people; small sites relocate to another viable same-faction site or close when empty. No terrain, buildings, pathfinding or physical simulation."] },
        methodology: { timing: "performance.now() milliseconds; simulation sum includes founder construction, annual steps, cohort checkpoints, and retained events. Hashing, annual heap samples, validation, serialization, setup and process overhead reported separately.",
            memory: "No forced GC. Annual/end heap samples are a lower-bound high-water mark including runtime indexes, transient objects and prior observer garbage, not exact live-state size or allocated bytes. Net delta may be negative.",
            determinism: "SHA-256 over every emitted event as UTF-8 NDJSON, ordered retained-event JSON and complete deterministic state JSON. Selftest additionally compares captured bytes. No timing/memory enters state.",
            archiveProjection: "Exact byte projection replacing the retained event array with all generated events, without retaining that larger archive. Not a measurement of its heap or execution cost.",
            budget: "No state-size ceiling supplied. Three seconds is an illustrative comparison from ASTRA-04, not a new pass/fail requirement; maximum capacity/failure boundary is not established.",
            totalWall: "Through validation/report assembly, excluding final report/stdout writes. Fresh child process per trial, no warmup." },
        determinism: options.runs > 1 ? "PASS" : "NOT RUN", summary: rows, runs, totalWallMs: elapsed(start) };
    fs.mkdirSync(path.dirname(options.json), { recursive: true });
    reportPath(options.json);
    fs.writeFileSync(options.json, JSON.stringify(report, null, 2) + "\n");
    console.log(table(rows));
    console.log(`Synthetic demographics; ${data.config.cultures.length} catalog factions (assignment claimed11). *Sampled heap delta, not retained state.\nPASS; wall ${(report.totalWallMs / 1000).toFixed(3)} s; JSON: ${options.json}`);
}

try { main(); } catch (error) { console.error(`FAIL: ${error.stack || error}`); process.exitCode = 1; }
