#!/usr/bin/env node
"use strict";

// ASTRA-11 independent, bounded contracts for the immutable HIST-09 candidate.
// This file never edits production or writes artifacts. The benchmark owns the
// long matrices, full-process save/restart test, sweep and consolidated report.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");
const v8 = require("v8");
const { performance } = require("perf_hooks");
const { spawnSync } = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const PLUGIN = "game/js/plugins/DEUS_HistoricalDemographics.js";
const CANDIDATE = "8a40d2ed66da758fc95fc3c1e8205709336c54df";
const CANDIDATE_SHA256 = "e08ce6104669830e0388fe90631f8002f8547f77484f52263eea3aee34273e95";
const CANDIDATE_BYTES = 45429;
const LEGACY = "931b993e60545b24bddaa71ab433ebac8e967eb8";
const LEGACY_NORMALIZED_SHA256 = "647592fc4a65b474f5f12835cee80a461d1f0c86ba847559b3ec835791471c2e";
const MODULES = ["World", "WorldGen", "Factions", "History", "Levels"];
const MODEL = { version: 1, defaultBaseline: 160, minimumScale: 0.1, minCapacity: 60, maxCapacity: 350 };
const PROFILE_VERSION = "1.0.0-provisional-astra08";
const PACKET_POLICY = "literal ASTRA-11 packet (clarification requested; no correction received)";
const MUTANT_CHECKS = {
    no_density_pressure: "DENSITY_RATE",
    universal_constant: "LOCAL_CAPACITY",
    live_census_order_dependent: "ANNUAL_ORDER",
    base_birth_1_bypass: "BIRTH_ONE",
    unsupported_version_accepted: "VERSIONS",
    malformed_capacity_accepted: "CAPACITY_REJECTION",
    migration_rewrites_custom_profile: "MIGRATION_PRESERVATION",
    migration_non_idempotence: "MIGRATION_IDEMPOTENCE"
};
const MUTANTS = Object.keys(MUTANT_CHECKS);
const MUTANT_DIAGNOSTICS = {
    no_density_pressure: /DENSITY_RATE: observed births differ from independent start-population probability oracle/,
    universal_constant: /LOCAL_CAPACITY: observed births differ from independent start-population probability oracle/,
    live_census_order_dependent: /ANNUAL_ORDER: observed births differ from independent start-population probability oracle/,
    base_birth_1_bypass: /BIRTH_ONE: observed births differ from independent start-population probability oracle/,
    unsupported_version_accepted: /VERSIONS: expected rejection, got success/,
    malformed_capacity_accepted: /CAPACITY_REJECTION null: expected rejection, got success/,
    migration_rewrites_custom_profile: /Migration rewrote caller's custom profiles/,
    migration_non_idempotence: /Migration changed an already migrated v7 state/
};
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const clone = value => JSON.parse(JSON.stringify(value));
const text = value => JSON.stringify(value);
const sha = value => crypto.createHash("sha256").update(value).digest("hex");
const fingerprint = value => sha(v8.serialize(value));
const equal = (a, b, message) => assert(text(a) === text(b), message);
function expectedProfiles() {
    const p = (lifespan, reproductiveAge, birthChance, birthSpacingYears, infantMortality, diseaseMortality, exposureMortality) =>
        ({ lifespan, reproductiveAge, birthChance, birthSpacingYears, infantMortality, diseaseMortality, exposureMortality });
    // Independent expectation from the dispatch packet, never from engine exports.
    return {
        human: p([60, 90], [18, 55], .36, 3, .004, .0003, .0003),
        elf: p([350, 750], [60, 350], .025, 12, .002, .0001, .0001),
        dwarf: p([250, 350], [40, 240], .09, 6, .006, .0003, .0003),
        halfling: p([120, 150], [20, 110], .20, 4, .012, .0008, .0006),
        gnome: p([350, 500], [40, 200], .05, 10, .005, .0002, .0002),
        dragonborn: p([65, 80], [15, 60], .34, 3, .004, .0003, .0003),
        "half-elf": p([140, 180], [20, 125], .12, 5, .010, .0005, .0005),
        "half-orc": p([55, 75], [14, 50], .40, 2, .004, .0003, .0003),
        tiefling: p([70, 110], [18, 65], .30, 3, .004, .0003, .0003)
    };
}
function frozenBundle(commit) {
    const files = {}, sources = [];
    const read = file => {
        const result = spawnSync("git", ["show", `${commit}:${file}`], { cwd: ROOT, windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
        assert(!result.error && result.status === 0, `Cannot load frozen input ${commit}:${file}`);
        files[file] = result.stdout.toString("utf8");
        sources.push({ path: file, commit, bytes: result.stdout.length, sha256: sha(result.stdout) });
        return files[file];
    };
    const list = {}; vm.runInNewContext(read("game/js/plugins.js"), list, { timeout: 1000 });
    const plugins = list.$plugins.filter(p => p.status && MODULES.includes(p.name.replace(/^DEUS_/, "")));
    assert(plugins.length === MODULES.length && plugins.every((p, i) => p.name === `DEUS_${MODULES[i]}`), "Frozen bootstrap order changed");
    for (const p of plugins) read(`game/js/plugins/${p.name}.js`);
    const catalog = JSON.parse(read("game/data/UF_WorldCatalog.json"));
    read(PLUGIN);
    return { commit, files, plugins, catalog, sources, sourceDigest: sha(text(sources)) };
}
function sourceBundle({ verifyWorkingCandidate = true } = {}) {
    const data = frozenBundle(CANDIDATE), source = data.sources.find(s => s.path === PLUGIN);
    assert(source.sha256 === CANDIDATE_SHA256 && source.bytes === CANDIDATE_BYTES, "CANDIDATE_MISMATCH: frozen plugin hash/length differs from dispatch packet");
    if (verifyWorkingCandidate) {
        const disk = fs.readFileSync(path.join(ROOT, PLUGIN));
        assert(sha(disk) === CANDIDATE_SHA256 && disk.length === CANDIDATE_BYTES, "CANDIDATE_MISMATCH: working plugin differs from frozen candidate");
    }
    data.legacy = frozenBundle(LEGACY);
    assert(sha(data.legacy.files[PLUGIN].replace(/\r\n/g, "\n")) === LEGACY_NORMALIZED_SHA256, "Legacy fixture source hash mismatch");
    return data;
}
function verifySnapshot(data) {
    for (const s of data.sources) assert(sha(data.files[s.path]) === s.sha256, `Frozen source changed: ${s.path}`);
}
function once(source, anchor, replacement) {
    assert(source.split(anchor).length === 2, `Mutation anchor missing/ambiguous: ${anchor}`);
    return source.replace(anchor, replacement);
}
function mutate(source, mutant) {
    source = source.replace(/\r\n/g, "\n");
    if (!mutant) return source;
    assert(MUTANTS.includes(mutant), `Unknown mutant: ${mutant}`);
    const replacements = {
        no_density_pressure: ["const scale = Math.max(capModel.minimumScale, 1 - (startPop / cap));", "const scale = 1;"],
        universal_constant: ["const cap = site.historicalCapacity;", "const cap = 160;"],
        live_census_order_dependent: ["const startPop = startOfYearPopulation.get(mother.siteId);", "const startPop = site.population;"],
        base_birth_1_bypass: ["const effectiveBirthChance = profile.birthChance * scale;", "const effectiveBirthChance = profile.birthChance >= 1 ? 1 : profile.birthChance * scale;"],
        unsupported_version_accepted: ["check(state.version === 7, `unsupported demographics schema version: ${state.version}`);", "check(integer(state.version), 'integer schema required');"],
        malformed_capacity_accepted: ["check(s.historicalCapacity >= ABSOLUTE_MIN_CAPACITY && s.historicalCapacity <= ABSOLUTE_MAX_CAPACITY, \"historicalCapacity outside absolute envelope [60, 350]\");\n            check(integer(s.historicalCapacity) && s.historicalCapacity >= cm.minCapacity && s.historicalCapacity <= cm.maxCapacity, \"invalid historicalCapacity\");", "// mutant: accept malformed site capacity"],
        migration_rewrites_custom_profile: ["candidate.migratedFromVersion = 6;", "candidate.migratedFromVersion = 6; candidate.config.profiles = copy(DEFAULT_PROFILES);"],
        migration_non_idempotence: ["if (state.version === 7) {\n            validate(state);\n            return state;\n        }", "if (state.version === 7) {\n            validate(state);\n            state.migrationAttempts = (state.migrationAttempts || 0) + 1;\n            return state;\n        }"]
    };
    return once(source, ...replacements[mutant]);
}
function load(data, seed = 0, mutant = null) {
    verifySnapshot(data);
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
        env[m[1]].prototype[m[2]] = () => { throw new Error(`Unexpected engine method ${m[1]}.${m[2]}`); };
    }
    const context = vm.createContext(env);
    vm.runInContext(["Math", "Object", "Array", "Number", "String", "Boolean", "Map", "Set", "JSON", "Date",
        "Uint8Array", "Uint16Array", "Int32Array", "Float32Array", "performance", "window"]
        .map(n => `const ${n} = globalThis.${n};`).join("\n"), context);
    data.plugins.forEach((p, i) => vm.runInContext(sources[i], context, { filename: p.name, timeout: 10000 }));
    const world = env.UF.World.newWorld(seed);
    env.UF.Levels.ensureWorldLevels(world); env.UF.Factions.generate(world); env.UF.History.generate(world);
    assert(world.history.version === 5 && world.history.startYear === 1 && world.history.simulated === false, "Year-1 founding contract changed");
    const canonical = text(world);
    vm.runInContext(mutate(data.files[PLUGIN], mutant), context, { filename: PLUGIN, timeout: 10000 });
    assert(text(world) === canonical && errors.length === 0, `Plugin load changed canonical world or logged errors: ${errors.join('; ')}`);
    return { env, world, canonical, api: env.UF.HistoricalDemographics, context, errors };
}
function rejectUnchanged(fn, state, diagnostic, pattern = null) {
    const before = fingerprint(state); let error;
    try { fn(); } catch (e) { error = e; }
    assert(error && (!pattern || pattern.test(error.message)), `${diagnostic}: expected rejection${pattern ? ` matching ${pattern}` : ''}, got ${error ? error.message : 'success'}`);
    assert(fingerprint(state) === before, `${diagnostic}: rejection mutated input`);
}
function freezeDeep(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) { Object.values(value).forEach(freezeDeep); Object.freeze(value); }
    return value;
}
function quietProfiles(birthChance = 1) {
    return { human: { lifespan: [200, 300], reproductiveAge: [18, 150], birthChance,
        birthSpacingYears: 1, infantMortality: 0, diseaseMortality: 0, exposureMortality: 0 } };
}
function fixtureWorld(seed, specs = [{ id: 101, pairs: 4, extra: 0 }]) {
    const fid = "TEST_CAPACITY_FACTION", sites = [], plan = [];
    for (const [index, s] of specs.entries()) {
        sites.push({ id: s.id, faction: fid, name: `TEST_SITE_${s.id}`, kind: "camp", area: { x: 0, y: 0 },
            x: 10 + index, y: 10, z: s.z || 0, zRange: [s.z || 0, s.z || 0], founded: 1, ruined: null, pop: s.pairs * 2 + (s.extra || 0) });
        for (let pair = 0; pair < s.pairs; pair++) for (const gender of ["female", "male"]) {
            plan.push({ name: `TEST_PERSON_${plan.length}`, surname: "TEST_DYNASTY", gender, age: 30,
                familyId: `TEST_FAMILY_${s.id}_${pair}`, leader: plan.length === 0, title: plan.length === 0 ? "TEST_LEADER" : null, site: s.id, z: s.z || 0 });
        }
        for (let n = 0; n < (s.extra || 0); n++) plan.push({ name: `TEST_CHILD_${plan.length}`, gender: "male", age: 5, site: s.id, z: s.z || 0 });
    }
    return { seed, size: 64, areasX: 1, areasY: 1, factions: { list: [{ id: fid, species: "human", culture: "TEST_CULTURE" }] },
        history: { version: 5, startYear: 1, years: 0, sites, founders: { [fid]: { site: specs[0].id, plan } } } };
}
function draw(loaded, seed, id, year = 2) { return loaded.env.UF.World.mulberry32(loaded.env.UF.World.hash32(seed, year, id, 0x42495254))(); }
function selectSeed(predicate) {
    for (let seed = 0; seed < 100000; seed++) if (predicate(seed)) return seed;
    throw new Error("Fixture construction could not find discriminating deterministic seed");
}
function expectedMothers(loaded, state, conditions = {}) {
    const killed = new Set(conditions.casualtyIds || []), mothers = [];
    for (const h of state.partnerships) {
        const m = state.people[h.motherId], f = state.people[h.fatherId], profile = state.config.profiles[m.species];
        if (h.toYear !== null || killed.has(m.id) || killed.has(f.id)) continue;
        if ([m, f].some(p => p.died !== null || state.currentYear + 1 - p.born < profile.reproductiveAge[0] || state.currentYear + 1 - p.born > profile.reproductiveAge[1])) continue;
        const site = state.sites[m.siteId], chance = profile.birthChance * Math.max(.1, 1 - site.population / site.historicalCapacity);
        if (draw(loaded, state.seed, h.id, state.currentYear + 1) < chance) mothers.push(m.id);
    }
    return mothers;
}
function actualMothers(state, founderCount) { return state.people.slice(founderCount).map(p => p.parents[0]); }
function checkBirths(loaded, state, label, conditions = {}) {
    const before = state.people.length, profiles = text(state.config.profiles), expected = expectedMothers(loaded, state, conditions);
    loaded.api.step(state, conditions);
    equal(actualMothers(state, before), expected, `${label}: observed births differ from independent start-population probability oracle`);
    assert(text(state.config.profiles) === profiles, `${label}: step rewrote base profiles`);
    loaded.api.validate(state);
    return { expected, observed: actualMothers(state, before) };
}
function profileMetadata(state) {
    // Inspect existing metadata without inventing a required fingerprint field.
    const registries = new Set(["factions", "sites", "people", "dynasties", "rulers", "partnerships", "events", "config"]);
    return { top: clone(Object.fromEntries(Object.entries(state).filter(([key]) => !registries.has(key)))),
        config: clone(Object.fromEntries(Object.entries(state.config).filter(([key]) => !["profiles", "names"].includes(key)))) };
}
function metadataLeaves(value, prefix = "", output = []) {
    for (const [key, item] of Object.entries(value)) {
        const field = prefix ? `${prefix}.${key}` : key;
        if (item && typeof item === "object") metadataLeaves(item, field, output);
        else output.push({ field, value: item });
    }
    return output;
}
function packetContracts(loaded) {
    const { api, world } = loaded, checks = [], defaults = api.create(world), profiles = expectedProfiles();
    profiles.human.birthChance = .123;
    const custom = api.create(world, { profiles }), same = api.create(world, { profiles: clone(profiles) });
    const varied = clone(profiles); varied.human.birthChance = .124;
    const different = api.create(world, { profiles: varied });
    const advertised = state => metadataLeaves(profileMetadata(state)).filter(entry =>
        /profile/i.test(entry.field) && typeof entry.value === "string" && /^[a-f0-9]{64}$/i.test(entry.value));
    const add = (id, expected, observed, fn, mapping = null) => {
        try { fn(); checks.push({ id, status: "PASS", expected, observed, mapping }); }
        catch (error) { checks.push({ id, status: "FAIL", expected, observed, mapping, diagnostic: `${id}: ${error.message}` }); }
    };
    add("PACKET_DEFAULT_PROFILE_TAG", "v1", defaults.demographicProfileVersion,
        () => assert(defaults.demographicProfileVersion === "v1", "Promoted default tag differs from literal packet"), "Existing state.demographicProfileVersion");
    add("PACKET_DEMOGRAPHIC_MODEL", 7, defaults.historyModelVersion,
        () => assert(defaults.historyModelVersion === 7, "Existing historical model version differs from packet's demographic-model version"),
        "Packet 'Demographic Model Version' mapped to the existing state.historyModelVersion; schema state.version is separately 7. No new state field is assumed.");
    const modelMetadata = { capacityModelVersion: defaults.capacityModelVersion, capacityModel: clone(defaults.config.capacityModel) };
    add("PACKET_CAPACITY_MODEL_IDENTITY", "local_density_v1", modelMetadata,
        () => assert(metadataLeaves(modelMetadata).some(entry => entry.value === "local_density_v1"), "The persisted capacity model has no literal local_density_v1 identity"),
        "Inspect existing root/config capacity-model metadata; no unspecified model/type/id property is invented.");
    const claimed = api.create(world, { profiles, demographicProfileVersion: "v1" });
    add("PACKET_CUSTOM_CANNOT_CLAIM_V1", "custom", claimed.demographicProfileVersion,
        () => assert(claimed.demographicProfileVersion === "custom", "Modified biology can claim the packet's promoted v1 tag"), "Explicit modified profiles plus options.demographicProfileVersion='v1'");
    const fingerprints = advertised(custom), repeatFingerprints = advertised(same), changedFingerprints = advertised(different);
    add("PACKET_CUSTOM_PROFILE_FINGERPRINT", "Advertised deterministic SHA-256 profile fingerprint; equal profiles repeat, changed profiles differ",
        { customMetadata: profileMetadata(custom), fingerprints, repeatFingerprints, changedFingerprints }, () => {
            assert(custom.demographicProfileVersion === "custom", "Custom profile tag absent");
            assert(fingerprints.length > 0, "No advertised 64-hex SHA-256 profile fingerprint in top-level or config metadata");
            equal(fingerprints, repeatFingerprints, "Same custom profiles changed fingerprint");
            assert(fingerprints.every(entry => {
                const changed = changedFingerprints.find(item => item.field === entry.field);
                return changed && changed.value !== entry.value;
            }), "Changing custom biology did not change fingerprint");
        }, "All existing top-level/config metadata is retained above; candidate fingerprint fields are discovered, not named by the verifier.");
    return { policy: PACKET_POLICY, checks, observedMetadata: { defaults: profileMetadata(defaults), custom: profileMetadata(custom) } };
}
function runContracts(data, { mutant = null, only = null } = {}) {
    const started = performance.now(), checks = [], observations = [], tests = [];
    const loaded = load(data, 0, mutant), { api, world } = loaded;
    const add = (id, name, fn) => tests.push({ id, name, fn });
    let legacyState;
    function realLegacy() {
        if (!legacyState) {
            const old = load(data.legacy, 0), profiles = expectedProfiles();
            profiles.human.birthChance = .271; // A genuine caller-specific v6 value, different from promoted defaults.
            legacyState = old.api.create(old.world, { profiles, eventLimit: 1000000 });
            old.api.simulate(legacyState, 40);
            old.api.validate(legacyState);
            assert(legacyState.version === 6 && legacyState.people.some(p => p.parents.length) && legacyState.people.some(p => p.died !== null), "Real v6 fixture lacks populated lineage/death history");
        }
        return clone(legacyState);
    }
    add("DEFAULTS", "Omitted and undefined profiles use independent expected defaults and v7 metadata", () => {
        const before = text(world);
        for (const options of [undefined, { profiles: undefined }]) {
            const s = options === undefined ? api.create(world) : api.create(world, options);
            assert(s.version === 7 && s.historyModelVersion === 1 && s.capacityModelVersion === 1 && s.demographicProfileVersion === PROFILE_VERSION, "Default schema/profile tags mismatch");
            equal(s.config.profiles, expectedProfiles(), "Promoted profile matrix differs from packet");
            equal(s.config.capacityModel, MODEL, "Default capacity model differs from packet");
            assert(s.people.length === 72 && s.sites.length === 9, "Canonical founder/site count changed");
        }
        assert(text(world) === before && !world.history.demographics, "create changed or auto-attached to canonical history");
    });
    add("CUSTOM", "Caller profiles remain custom and are copied without affecting later defaults", () => {
        const profiles = expectedProfiles(); profiles.human.birthChance = .123;
        const s = api.create(world, { profiles }), before = text(s.config.profiles);
        assert(s.demographicProfileVersion === "custom", "Explicit profiles not labeled custom");
        equal(s.config.profiles, profiles, "Explicit profiles changed");
        profiles.human.birthChance = .999; assert(text(s.config.profiles) === before, "Caller/profile alias leaked");
        s.config.profiles.elf.lifespan[1] = 749;
        equal(api.create(world).config.profiles, expectedProfiles(), "State mutation changed module defaults");
    });
    add("CUSTOM_PROVENANCE", "Caller-supplied biology cannot claim promoted profile provenance", () => {
        const profiles = expectedProfiles(); profiles.human.birthChance = .123;
        const s = api.create(world, { profiles, demographicProfileVersion: PROFILE_VERSION });
        assert(s.demographicProfileVersion === "custom", "Custom biology accepted promoted-default provenance");
    });
    add("VALIDATE_PURE", "validate accepts deeply frozen v7 input without any mutation", () => {
        const s = clone(api.create(world)), before = text(s); freezeDeep(s);
        assert(api.validate(s) === true && text(s) === before, "validate changed valid state");
    });
    add("VERSIONS", "Unknown schema and mismatched model versions reject without mutation", () => {
        const cases = [s => s.version = 8, s => s.historyModelVersion = 2, s => s.capacityModelVersion = 2,
            s => s.config.capacityModel.version = 2, s => delete s.historyModelVersion, s => s.demographicProfileVersion = null];
        for (const change of cases) { const s = clone(api.create(world)); change(s); rejectUnchanged(() => api.validate(s), s, "VERSIONS"); }
    });
    add("CAPACITY_REJECTION", "Missing, noninteger and out-of-range capacities reject without mutation", () => {
        for (const cap of [null, 0, -1, 59, 351, 60.5, NaN, Infinity, "160", undefined]) {
            const s = clone(api.create(world));
            if (cap === undefined) delete s.sites[0].historicalCapacity; else s.sites[0].historicalCapacity = cap;
            rejectUnchanged(() => api.validate(s), s, `CAPACITY_REJECTION ${String(cap)}`);
        }
    });
    add("CREATE_CAPACITY", "create enforces explicit capacity bounds and preserves source", () => {
        const id = world.history.sites[0].id;
        for (const cap of [60, 350]) assert(api.create(world, { siteCapacity: { [id]: cap } }).sites.find(s => s.sourceSiteId === id).historicalCapacity === cap, "Legal capacity boundary rejected");
        for (const cap of [null, -1, 0, 59, 351, 60.5, NaN, Infinity, "160"]) rejectUnchanged(() => api.create(world, { siteCapacity: { [id]: cap } }), world, `CREATE_CAPACITY ${String(cap)}`);
    });
    add("ABSOLUTE_CREATE_BOUNDS", "Caller model cannot widen create's mandatory [60,350] capacity range", () => {
        const id = world.history.sites[0].id;
        for (const cap of [59, 351]) rejectUnchanged(() => api.create(world, { capacityModel: { minCapacity: 1, maxCapacity: 1000 }, siteCapacity: { [id]: cap } }), world, `ABSOLUTE_CREATE_BOUNDS ${cap}`);
    });
    add("ABSOLUTE_VALIDATE_BOUNDS", "Caller model cannot widen validate's mandatory [60,350] capacity range", () => {
        for (const cap of [59, 351]) {
            const s = clone(api.create(world)); Object.assign(s.config.capacityModel, { minCapacity: 1, maxCapacity: 1000 }); s.sites[0].historicalCapacity = cap;
            rejectUnchanged(() => api.validate(s), s, `ABSOLUTE_VALIDATE_BOUNDS ${cap}`);
        }
    });
    add("MODEL_INPUT_SHAPE", "Malformed capacity-model containers are rejected at create", () => {
        for (const capacityModel of [42, "bad", [], false]) rejectUnchanged(() => api.create(world, { capacityModel }), world, "MODEL_INPUT_SHAPE");
    });
    add("MODEL_VALUES", "Malformed capacity-model numbers and inconsistent versions reject", () => {
        for (const change of [{ minimumScale: -1 }, { minimumScale: 1.01 }, { defaultBaseline: 0 }, { minCapacity: 0 }, { minCapacity: 351, maxCapacity: 350 }, { maxCapacity: 350.5 }, { version: 2 }]) {
            const s = clone(api.create(world)); Object.assign(s.config.capacityModel, change);
            rejectUnchanged(() => api.validate(s), s, "MODEL_VALUES");
        }
    });
    add("CAPACITY_DERIVATION", "Capacity follows the specified seeded algorithm and source IDs", () => {
        const s = api.create(world);
        for (const site of s.sites) {
            const rng = loaded.env.UF.World.mulberry32(loaded.env.UF.World.hash32(s.seed, site.sourceSiteId, 0x43415041));
            const expected = (site.z === 0 ? 170 : site.z === -1 ? 155 : 145) + Math.floor(rng() * 31) - 15;
            assert(site.historicalCapacity === expected, `Capacity derivation differs at source site ${site.sourceSiteId}`);
        }
        const reordered = clone(world); reordered.history.sites.reverse();
        const actual = api.create(reordered);
        for (const site of s.sites) assert(actual.sites.find(x => x.sourceSiteId === site.sourceSiteId).historicalCapacity === site.historicalCapacity, "Dense site index changed capacity");
    });
    add("DENSITY_RATE", "Ordinary fertility is reduced by the independent density probability", () => {
        const seed = selectSeed(seed => draw(loaded, seed, 0) >= .8 * (1 - 8 / 60) && draw(loaded, seed, 0) < .8);
        const s = api.create(fixtureWorld(seed), { profiles: quietProfiles(.8), siteCapacity: { 101: 60 } });
        checkBirths(loaded, s, "DENSITY_RATE");
    });
    add("BIRTH_ONE", "Base birthChance=1 still obeys site density pressure", () => {
        const seed = selectSeed(seed => draw(loaded, seed, 0) >= 1 - 8 / 60);
        const s = api.create(fixtureWorld(seed), { profiles: quietProfiles(1), siteCapacity: { 101: 60 } });
        const result = checkBirths(loaded, s, "BIRTH_ONE"); assert(!result.expected.includes(0), "Fixture did not discriminate bypass");
    });
    add("ANNUAL_ORDER", "Earlier births do not change later households' annual density probability", () => {
        const pairs = 6, population = pairs * 2, scale = 1 - population / 60;
        const seed = selectSeed(seed => {
            let born = 0, differs = false;
            for (let h = 0; h < pairs; h++) { const r = draw(loaded, seed, h), live = r < Math.max(.1, 1 - (population + born) / 60); if ((r < scale) !== live) differs = true; if (live) born++; }
            return differs;
        });
        const s = api.create(fixtureWorld(seed, [{ id: 101, pairs }]), { profiles: quietProfiles(), siteCapacity: { 101: 60 } });
        checkBirths(loaded, s, "ANNUAL_ORDER");
    });
    add("ANNUAL_DEATHS", "Density uses pre-death census throughout the year", () => {
        const population = 9;
        const seed = selectSeed(seed => draw(loaded, seed, 0) >= 1 - population / 60 && draw(loaded, seed, 0) < 1 - (population - 1) / 60);
        const s = api.create(fixtureWorld(seed, [{ id: 101, pairs: 4, extra: 1 }]), { profiles: quietProfiles(), siteCapacity: { 101: 60 } });
        checkBirths(loaded, s, "ANNUAL_DEATHS", { casualtyIds: [8] });
    });
    add("LOCAL_CAPACITY", "Two same-species sites use their own capacities and censuses", () => {
        const specs = [{ id: 101, pairs: 4 }, { id: 202, pairs: 8 }];
        const seed = selectSeed(seed => draw(loaded, seed, 0) >= .8 * (1 - 8 / 60) && draw(loaded, seed, 0) < .8 * (1 - 8 / 160));
        const s = api.create(fixtureWorld(seed, specs), { profiles: quietProfiles(.8), siteCapacity: { 101: 60, 202: 350 } });
        checkBirths(loaded, s, "LOCAL_CAPACITY");
        const pressured = api.create(fixtureWorld(seed, [specs[0], { ...specs[1], extra: 100 }]), { profiles: quietProfiles(.8), siteCapacity: { 101: 60, 202: 350 } });
        checkBirths(loaded, pressured, "LOCAL_CAPACITY unrelated-site perturbation");
        equal(s.people.filter(p => !p.isFounder && p.siteId === 0).map(p => p.parents[0]), pressured.people.filter(p => !p.isFounder && p.siteId === 0).map(p => p.parents[0]), "Other site population altered target-site fertility");
    });
    add("DENSITY_FLOOR", "At and above capacity fertility retains the nonzero 0.1 floor", () => {
        for (const pairs of [30, 40]) {
            const seed = selectSeed(seed => draw(loaded, seed, 0) < .1);
            const s = api.create(fixtureWorld(seed, [{ id: 101, pairs }]), { profiles: quietProfiles(), siteCapacity: { 101: 60 } });
            assert(checkBirths(loaded, s, "DENSITY_FLOOR").expected.includes(0), "Nonzero-floor fixture lacks expected birth");
        }
    });
    add("LEGACY_REQUIRES_MIGRATION", "Real v6 states reject step/validate with explicit migration diagnostic", () => {
        for (const method of ["step", "validate"]) { const s = realLegacy(); rejectUnchanged(() => api[method](s), s, "LEGACY_REQUIRES_MIGRATION", /explicit migration required/); }
    });
    add("MIGRATION_PRESERVATION", "Real populated v6 migration preserves all existing records and custom biology", () => {
        const s = realLegacy(), original = clone(s), profiles = text(s.config.profiles);
        assert(api.migrate(s) === s && s.version === 7, "Migration did not return v7 state");
        assert(text(s.config.profiles) === profiles, "Migration rewrote caller's custom profiles");
        const projection = clone(s); projection.version = 6;
        for (const key of ["historyModelVersion", "capacityModelVersion", "demographicProfileVersion", "migratedFromVersion"]) delete projection[key];
        delete projection.config.capacityModel; projection.sites.forEach(site => delete site.historicalCapacity);
        equal(projection, original, "Migration rewrote IDs/people/parents/partnerships/dynasties/rulers/events or other legacy fields");
        assert(s.historyModelVersion === 1 && s.capacityModelVersion === 1 && s.migratedFromVersion === 6, "Migration metadata mismatch");
        api.validate(s);
    });
    add("MIGRATION_IDEMPOTENCE", "Explicit migration is byte-idempotent on already migrated v7", () => {
        const s = realLegacy(); api.migrate(s); const before = text(s);
        assert(api.migrate(s) === s && text(s) === before, "Migration changed an already migrated v7 state");
    });
    add("MIGRATION_REJECTION", "Migration rejects unknown versions and malformed legacy capacity", () => {
        for (const version of [0, 5, 8, "6"]) { const s = realLegacy(); s.version = version; rejectUnchanged(() => api.migrate(s), s, "MIGRATION_REJECTION"); }
        const s = realLegacy(); s.sites[0].historicalCapacity = null;
        const before = text(s); let caught;
        try { api.migrate(s); } catch (e) { caught = e; }
        assert(caught && /historicalCapacity/.test(caught.message), "Migration accepted malformed legacy capacity");
        observations.push({ id: "MIGRATION_FAILURE_ATOMICITY", status: text(s) === before ? "UNCHANGED" : "MUTATED_BEFORE_REJECTION", detail: "ASTRA-11 additionally enforces atomic failure through its mandatory MIGRATION_ATOMICITY check.", fromVersion: 6, afterVersion: s.version });
    });
    add("MIGRATION_ATOMICITY", "Malformed v6 migration rejects without changing original state or version", () => {
        const changes = [s => s.sites[0].historicalCapacity = null, s => s.sites[0].historicalCapacity = 59,
            s => s.sites[0].historicalCapacity = 351, s => s.sites[0].historicalCapacity = NaN,
            s => s.sites[0].population++, s => s.config = null,
            s => { s.people.find(p => p.parents.length).parents[0] = 999999; }];
        for (const change of changes) {
            const s = realLegacy(); change(s);
            rejectUnchanged(() => api.migrate(s), s, "MIGRATION_ATOMICITY");
            assert(s.version === 6, "Malformed migration changed source schema version");
        }
    });
    for (const test of tests) {
        if (only && test.id !== only) continue;
        const t = performance.now();
        try { test.fn(); checks.push({ id: test.id, name: test.name, status: "PASS", elapsedMs: performance.now() - t }); }
        catch (error) { checks.push({ id: test.id, name: test.name, status: "FAIL", diagnostic: `${test.id}: ${error.message}`, elapsedMs: performance.now() - t }); }
    }
    assert(!only || checks.length === 1, "Unknown contract selector");
    // Targeted mutant subprocesses exercise only their intended oracle. Literal
    // packet mismatches must not create false-positive mutant detections.
    const packet = only ? { policy: PACKET_POLICY, checks: [], observedMetadata: null } : packetContracts(loaded);
    const commonStatus = checks.some(c => c.status === "FAIL") ? "FAIL" : "PASS";
    const packetStatus = only ? "NOT RUN" : packet.checks.some(c => c.status === "FAIL") ? "FAIL" : "PASS";
    assert(text(world) === loaded.canonical && loaded.errors.length === 0, "Contract execution mutated canonical world or logged engine errors");
    verifySnapshot(data);
    return { task: "DEUS-TSK-ASTRA-11", suite: "historical-carrying-capacity-contracts", status: commonStatus === "FAIL" || packetStatus === "FAIL" ? "FAIL" : "PASS",
        commonStatus, commonContractBasis: "Established implementation schema/metadata plus independent behavior, envelope, locality, migration and atomicity contracts; literal ASTRA-11 metadata acceptance is separate.",
        packetStatus, packetPolicy: packet.policy, packetChecks: packet.checks, observedMetadata: packet.observedMetadata,
        packetPassed: packet.checks.filter(c => c.status === "PASS").length, packetFailed: packet.checks.filter(c => c.status === "FAIL").length,
        candidate: { commit: CANDIDATE, sha256: CANDIDATE_SHA256, bytes: CANDIDATE_BYTES, sourceDigest: data.sourceDigest },
        legacyFixture: { commit: LEGACY, normalizedEngineSha256: LEGACY_NORMALIZED_SHA256, years: legacyState ? 40 : null },
        mutant, checks, observations, passed: checks.filter(c => c.status === "PASS").length, failed: checks.filter(c => c.status === "FAIL").length, wallMs: performance.now() - started };
}
function selftest(data = sourceBundle(), { mutants = true } = {}) {
    const started = performance.now();
    const report = runContracts(data);
    report.contractWallMs = report.wallMs;
    report.mutants = [];
    if (mutants) for (const name of MUTANTS) {
        const result = spawnSync(process.execPath, [__filename, `--mutant=${name}`], { cwd: ROOT, windowsHide: true, encoding: "utf8", timeout: 20000, maxBuffer: 4 * 1024 * 1024 });
        let observed; try { observed = JSON.parse(result.stdout); } catch (_) { /* classified below */ }
        const target = MUTANT_CHECKS[name], failed = observed && observed.checks && observed.checks.find(c => c.id === target && c.status === "FAIL");
        const detected = !result.error && result.status === 1 && failed && MUTANT_DIAGNOSTICS[name].test(failed.diagnostic);
        report.mutants.push({ name, expectedContract: target, status: detected ? "PASS" : "FAIL", childExitCode: result.status,
            observedContract: failed || null, diagnostic: detected ? failed.diagnostic : String(result.error || result.stderr || result.stdout) });
    }
    report.mutantsPassed = report.mutants.filter(m => m.status === "PASS").length;
    report.mutantsFailed = report.mutants.filter(m => m.status === "FAIL").length;
    report.status = report.failed || report.packetFailed || report.mutantsFailed ? "FAIL" : "PASS";
    report.wallMs = performance.now() - started;
    return report;
}
function main(args = process.argv.slice(2)) {
    let mutant = null;
    for (const arg of args) {
        if (arg === "--selftest" || arg === "--json") continue;
        if (arg === "--help") { console.log("Usage: node tools/test_historical_carrying_capacity.js [--selftest] [--json] [--mutant=<name>]\nBounded stdout-only JSON contracts; long-run matrix/restart/sweep live in bench_species_biology.js.\nMutants: " + MUTANTS.join(", ")); return; }
        assert(arg.startsWith("--mutant=") && !mutant, `Unknown/duplicate option ${arg}`); mutant = arg.slice(9); assert(MUTANTS.includes(mutant), `Unknown mutant ${mutant}`);
    }
    const data = sourceBundle(), report = mutant ? runContracts(data, { mutant, only: MUTANT_CHECKS[mutant] }) : selftest(data);
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.status === "PASS" ? 0 : 1;
}
module.exports = { sourceBundle, load, runContracts, selftest, verifySnapshot, expectedProfiles, CANDIDATE, CANDIDATE_SHA256, MUTANTS, MUTANT_CHECKS };
if (require.main === module) try { main(); } catch (error) { console.error(`FAIL: ${error.stack || error}`); process.exitCode = 1; }
