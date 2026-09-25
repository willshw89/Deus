#!/usr/bin/env node
"use strict";

// HIST-10 integration checks execute the working production sources. HIST-09's
// separate frozen-candidate suites remain immutable regression evidence.
const fs = require("fs"), path = require("path"), os = require("os"), vm = require("vm"), crypto = require("crypto");
const { performance } = require("perf_hooks");
const { spawnSync } = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const MODULES = ["World", "WorldGen", "Factions", "Dnd5e", "Callings", "HistoricalDemographics", "History", "Levels"];
const COLONY_MODULES = ["Objects", "Items", "Containers", "Stockpiles", "Colonists"];
const SPECIES = ["human", "elf", "dwarf", "halfling", "gnome", "dragonborn", "half-elf", "half-orc", "tiefling"];
const MUTANTS = ["target_year_alters_early_history", "materialization_drops_species", "save_drops_historical_records"];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const json = value => JSON.stringify(value);
const clone = value => JSON.parse(json(value));
const sha = value => crypto.createHash("sha256").update(value).digest("hex");
const equal = (a, b, message) => assert(json(a) === json(b), message);

function section(source, start, end) {
    const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
    assert(a >= 0 && b > a, `Engine source section missing: ${start}`);
    return source.slice(a, b);
}
function sources() {
    const files = ["game/js/plugins.js", "game/data/UF_WorldCatalog.json", "game/data/Tilesets.json", "game/js/rmmz_core.js", "game/js/rmmz_managers.js", "game/js/plugins/DEUS_Core.js",
        "tools/test_history_materialization_and_world_age.js", ...[...MODULES, ...COLONY_MODULES].map(name => `game/js/plugins/DEUS_${name}.js`)];
    const contents = {}, hashes = {};
    for (const file of files) { const bytes = fs.readFileSync(path.join(ROOT, file)); contents[file] = bytes.toString("utf8"); hashes[file] = sha(bytes); }
    return { contents, hashes, digest: sha(json(hashes)) };
}
function load(bundle, { colonyBootstrap = false } = {}) {
    const src = bundle.contents, list = {};
    vm.runInNewContext(src["game/js/plugins.js"], list);
    const ns = {}, errors = [], warnings = [], math = Object.create(Math);
    math.random = () => { throw new Error("Unseeded Math.random rejected"); };
    Object.freeze(math);
    const env = { window: null, UF: ns, DEUS: ns, Math: math, performance,
        console: { log() {}, warn: (...a) => warnings.push(a.map(String).join(" ")), error: (...a) => errors.push(a.map(String).join(" ")) },
        PluginManager: { parameters: name => (list.$plugins.find(p => p.name === name) || {}).parameters || {}, registerCommand() {} },
        DataManager: { _databaseFiles: [], onLoad() {}, isBattleTest: () => false, isEventTest: () => false },
        Input: { keyMapper: {} }, TouchInput: {}, SceneManager: { _scene: null }, Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 },
        ImageManager: { loadTileset() { throw new Error("Unexpected renderer call"); } }, Utils: { isOptionValid: () => false },
        Tilemap: function() {}, $dataTilesets: JSON.parse(src["game/data/Tilesets.json"]),
        $ufWorldCatalog: JSON.parse(src["game/data/UF_WorldCatalog.json"]), $ufTime: { year: 1 },
        $gameSystem: {}, $gameScreen: {}, $gameTimer: {}, $gameSwitches: {}, $gameVariables: {}, $gameSelfSwitches: {}, $gameActors: {}, $gameParty: {} };
    env.window = env; env.$deusWorldCatalog = env.$ufWorldCatalog;
    const modules = [...MODULES, ...(colonyBootstrap ? COLONY_MODULES : [])];
    const code = modules.map(name => src[`game/js/plugins/DEUS_${name}.js`]);
    const classes = new Set(["Sprite", "Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot", "Rectangle", "Game_Map", "Game_Player"]);
    for (const text of code) for (const m of text.matchAll(/\b((?:Game|Scene|Window|Spriteset|Sprite)_[A-Za-z0-9_]+)\.prototype/g)) classes.add(m[1]);
    for (const name of classes) env[name] = vm.runInNewContext(`(function ${name}(){})`);
    for (const text of code) for (const m of text.matchAll(/\b((?:Game|Scene|Window|Spriteset|Sprite)_[A-Za-z0-9_]+)\.prototype\.([A-Za-z0-9_]+)/g)) env[m[1]].prototype[m[2]] = function() {};
    env.Game_Map.prototype.mapId = () => 0;
    env.Game_Map.prototype.tilesetFlags = () => [];
    env.Game_Player.prototype.isTransferring = () => false;
    env.Game_Player.prototype.direction = () => 2;
    env.$gameMap = new env.Game_Map(); env.$gameMap._events = [];
    env.$gamePlayer = new env.Game_Player(); env.$gamePlayer.x = 0; env.$gamePlayer.y = 0;
    const context = vm.createContext(env);
    // Native lexical bindings prevent VM host-proxy overhead in annual loops.
    vm.runInContext(["Math", "Object", "Array", "Number", "String", "Boolean", "Map", "Set", "JSON", "Date", "Uint8Array", "Uint16Array", "Int32Array", "Float32Array", "performance", "window"]
        .map(n => `const ${n} = globalThis.${n};`).join("\n"), context);
    const run = (text, filename) => vm.runInContext(text, context, { filename, timeout: 30000 });
    run(section(src["game/js/rmmz_managers.js"], "DataManager.makeSaveContents =", "DataManager.correctDataErrors ="), "rmmz_managers.js: real save contents methods");
    run(section(src["game/js/rmmz_core.js"], "function JsonEx()", "//-----------------------------------------------------------------------------"), "rmmz_core.js: JsonEx");
    run(section(src["game/js/rmmz_core.js"], "Tilemap.TILE_ID_B =", "Tilemap.Layer ="), "rmmz_core.js: tile constants and autotile tables");
    run(section(src["game/js/plugins/DEUS_Core.js"], "window.DEUS = window.DEUS || {};", "//-----------------------------------------------------------------------------"), "DEUS_Core.js: production event bus");
    code.forEach((text, i) => run(text, `DEUS_${modules[i]}.js`));
    assert(env.UF.Callings.PROFESSIONS.length === 89, "CALLING_CATALOG: exactly 89 canonical callings required");
    assert(typeof env.UF.History.materialize === "function", "HIST10_API: History.materialize missing");
    env.Scene_Boot.prototype.start.call({});
    assert(errors.length === 0, `BOOTSTRAP_ERRORS: ${errors.join("; ")}`);
    return { env, context, errors, warnings };
}

function core(state) {
    return clone(state);
}
function worldEvidence(world) {
    return { worldSha256: sha(json(world)), historySha256: sha(json(world.history)), unitsSha256: sha(json(world.units)), factionsSha256: sha(json(world.factions)),
        sitesSha256: sha(json(world.history.sites)), peopleSha256: sha(json(world.history.demographics.people)), rulersSha256: sha(json(world.history.rulers)),
        census: world.history.demographics.living.length, ancestors: world.history.demographics.graveyard.length, unitCount: Object.keys(world.units).length };
}
function inspect(loaded, world, targetYear) {
    const { env, errors } = loaded, h = world.history, d = h && h.demographics;
    assert(d, "HIST10_API: missing production demographics"); env.UF.HistoricalDemographics.validate(d);
    const steps = targetYear <= 1 ? 0 : targetYear;
    const start = targetYear === 0 ? 0 : 1;
    assert(d.yearsSimulated === steps && d.startYear === start && d.currentYear === start + steps, "WORLD_AGE: target does not map to frozen annual clock");
    assert(errors.length === 0, `GENERATION_ERRORS: ${errors.join("; ")}`);
    const alive = d.people.filter(p => p.died === null), dead = d.people.filter(p => p.died !== null);
    equal(d.living, alive.map(p => p.id), "LIVING_INDEX: living IDs do not exactly partition people");
    equal(d.graveyard, dead.map(p => p.id), "ANCESTOR_INDEX: deceased IDs do not exactly partition people");
    assert(new Set([...d.living, ...d.graveyard]).size === d.people.length, "PERSON_PARTITION: duplicate or missing person IDs");
    const units = Object.values(world.units), map = h.materialization && h.materialization.personToUnit;
    assert(map && Object.keys(map).length === alive.length, "MATERIALIZED_CENSUS: person-to-unit map differs from living census");
    assert(units.length === alive.length && units.every(u => Number.isInteger(u.data.historicalPersonId)), "MATERIALIZED_CENSUS: physical living population differs from ledger");
    const occupied = new Set();
    for (const u of units) {
        const key = `${u.area.x},${u.area.y},${u.z},${u.x},${u.y}`;
        assert(!occupied.has(key) && env.UF.World.cellFree(u.area.x, u.area.y, u.x, u.y, u.id, u.z), `MATERIALIZED_PLACEMENT: blocked or overlapping Creature #${u.id}`);
        occupied.add(key);
    }
    const children = new Map(d.people.map(p => [p.id, []]));
    for (const p of d.people) for (const parent of p.parents) children.get(parent).push(p.id);
    const species = Object.fromEntries(SPECIES.map(s => [s, 0]));
    for (const p of alive) {
        const u = world.units[map[p.id]], data = u && u.data;
        assert(u && Number.isSafeInteger(u.id) && u.id > 0 && data.historicalPersonId === p.id, `MATERIALIZED_ID: ${p.id}`);
        assert(SPECIES.includes(data.species) && data.species === p.species, `MATERIALIZED_SPECIES: ${p.id}`); species[p.species]++;
        assert(data.gender === p.gender && data.sex === p.gender && data.born === p.born && data.age === d.currentYear - p.born, `MATERIALIZED_BIOLOGY: ${p.id}`);
        const entityId = personId => h.materialization.baseUnitId + personId;
        equal(data.parents, p.parents.map(entityId), `MATERIALIZED_PARENTS: ${p.id}`);
        equal(data.children, children.get(p.id).map(entityId), `MATERIALIZED_CHILDREN: ${p.id}`);
        for (const gender of ["female", "male"]) {
            const parent = p.parents.find(id => d.people[id].gender === gender);
            equal(data[gender === "female" ? "motherId" : "fatherId"], parent === undefined ? null : entityId(parent), `ANCESTOR_KINSHIP: ${p.id}/${gender}`);
        }
        const partnership = p.partnershipId === null ? null : d.partnerships[p.partnershipId];
        const spouse = partnership && partnership.toYear === null ? (partnership.motherId === p.id ? partnership.fatherId : partnership.motherId) : null;
        equal(data.spouse, spouse === null ? null : entityId(spouse), `MATERIALIZED_SPOUSE: ${p.id}`);
        equal(data.partnerId || null, data.spouse, `LIVE_PARTNER_COHERENCE: ${p.id}`);
        assert(data.willingToPartner === true, `PAIRING_RESUMED: ${p.id}`);
        assert(typeof data.householdId === "string" || Number.isSafeInteger(data.householdId), `MATERIALIZED_HOUSEHOLD: ${p.id}`);
        const site = d.sites[p.siteId];
        assert(data.siteId === p.siteId && data.site === site.sourceSiteId && data.faction === p.factionId, `MATERIALIZED_SITE: ${p.id}`);
        const callingId = typeof data.calling === "string" ? data.calling : data.calling && data.calling.id;
        assert(env.UF.Callings.callingById(callingId) && Array.isArray(data.callings) && data.callings.length === 3, `MATERIALIZED_CALLING: ${p.id}`);
        assert(new Set(data.callings.map(c => typeof c === "string" ? c : c.id)).size === 3 && data.callings.every(c => env.UF.Callings.callingById(typeof c === "string" ? c : c.id)), `MATERIALIZED_CALLINGS: ${p.id}`);
        assert(["str", "dex", "con", "int", "wis", "cha"].every(k => Number.isInteger(data.stats[k]) && data.stats[k] >= 3 && data.stats[k] <= 20), `MATERIALIZED_STATS: ${p.id}`);
        assert(Number.isInteger(data.hp) && data.hp > 0, `MATERIALIZED_HP: ${p.id}`);
    }
    if (targetYear >= 250) assert(SPECIES.every(s => species[s] > 0), "NINE_SPECIES: a canonical species has no materialized living citizen");
    for (const f of Object.values(d.factions)) {
        const chain = h.rulers[f.id], expected = d.rulers.filter(r => r.factionId === f.id);
        assert(Array.isArray(chain) && chain.length === expected.length, `RULER_CHAIN: ${f.id}`);
        expected.forEach((r, i) => { assert(chain[i].personId === r.personId, `RULER_PERSON: ${f.id}/${i}`); if (r.toYear === null) assert(chain[i].unitId === map[r.personId], `ACTIVE_RULER_UNIT: ${f.id}`); });
    }
    const before = json(world); env.UF.History.materialize(world); equal(json(world), before, "MATERIALIZATION_IDEMPOTENCE: second materialization changes world");
    return { targetYear, worldSeed: world.seed, demographicSeed: d.seed, currentYear: d.currentYear, yearsSimulated: d.yearsSimulated, living: alive.length, ancestors: dead.length, records: d.people.length,
        species, events: d.events.length, personToUnit: clone(map), coreSha256: sha(json(core(d))), eventsSha256: sha(json(d.events)), stateBytes: Buffer.byteLength(json(world)), ...worldEvidence(world) };
}

function worker(request) {
    const bundle = sources(); assert(bundle.digest === request.sourceDigest, "SOURCE_CHANGED: worker sources differ from dispatch");
    const loaded = load(bundle, request), { env } = loaded, start = performance.now();
    if (request.mode === "load") {
        const bytes = fs.readFileSync(request.savePath);
        assert(sha(bytes) === request.fileSha256, "DISK_SAVE_HASH: disk bytes changed");
        env.DataManager.extractSaveContents(env.JsonEx.parse(bytes.toString("utf8")));
        assert(loaded.errors.length === 0, `SAVE_LOAD_ERRORS: ${loaded.errors.join("; ")}`);
        return { pid: process.pid, sourceDigest: bundle.digest, fileSha256: sha(bytes), ...worldEvidence(env.UF.World.state), wallMs: performance.now() - start };
    }
    // Production world:created listener must invoke the new generation entry point.
    if (request.targetYear !== 500) env.UF.NewGameSetup = { year: request.targetYear };
    let checkpoint = null, bootstrapCalls = 0;
    const generate = env.UF.History.generate;
    env.UF.History.generate = function(world, opts = {}) {
        bootstrapCalls++;
        return generate.call(this, world, { ...opts, ...(request.seedOverride === undefined ? {} : { seed: request.seedOverride }), onCheckpoint(state) {
            if (state.yearsSimulated === 100) checkpoint = core(state);
        } });
    };
    if (request.mutant === "target_year_alters_early_history" && request.targetYear === 500) {
        const step = env.UF.HistoricalDemographics.step;
        env.UF.HistoricalDemographics.step = function(state, ...args) { const result = step.call(this, state, ...args); if (state.yearsSimulated === 1) state.people[0].name += " TEST_PREFIX_CORRUPTION"; return result; };
    }
    const world = env.UF.World.newWorld(request.seed);
    assert(bootstrapCalls === 1 && world.history && world.history.demographics, `NEW_GAME_BOOTSTRAP: generation did not attach demographics exactly once; ${loaded.errors.join("; ")}`);
    if (request.mutant === "materialization_drops_species") for (const [id, u] of Object.entries(world.units)) if (u.data.species === "human") delete world.units[id];
    const result = inspect(loaded, world, request.targetYear);
    if (request.colonyBootstrap) {
        assert(world.colony && world.colony.settlementsReady, "COLONY_BOOTSTRAP: production Colonists setup did not complete");
        assert(Object.values(world.units).some(u => u.data.kind === "colonist"), "COLONY_BOOTSTRAP: player faction was not converted");
    }
    result.pid = process.pid; result.sourceDigest = bundle.digest; result.wallMs = performance.now() - start;
    if (request.targetYear === 500) {
        assert(checkpoint, "PREFIX_CHECKPOINT: production did not report year100");
        result.checkpoint100Sha256 = sha(json(checkpoint)); result.checkpoint100EventsSha256 = sha(json(checkpoint.events));
    }
    if (request.savePath) {
        let contents = env.DataManager.makeSaveContents();
        assert(contents.ufWorld === world, "REAL_SAVE_HOOK: World state absent from DataManager.makeSaveContents");
        const prior = worldEvidence(world);
        if (request.mutant === "save_drops_historical_records") {
            // Keep engine class instances intact so this mutation tests only ancestor loss.
            const demographics = contents.ufWorld.history.demographics;
            contents = { ...contents, ufWorld: { ...contents.ufWorld, history: { ...contents.ufWorld.history,
                demographics: { ...demographics, people: demographics.people.filter(p => p.died === null), graveyard: [] } } } };
        }
        const bytes = Buffer.from(env.JsonEx.stringify(contents));
        const fd = fs.openSync(request.savePath, "wx");
        try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
        const saved = JSON.parse(bytes.toString("utf8")).ufWorld.history.demographics;
        result.save = { fileSha256: sha(bytes), bytes: bytes.length, expected: prior, savedAncestors: saved.people.filter(p => p.died !== null).length };
    }
    return result;
}

function child(request, allowFailure = false) {
    const start = performance.now();
    const run = spawnSync(process.execPath, [__filename, "--worker"], { cwd: ROOT, windowsHide: true, encoding: "utf8", input: json(request), timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
    if (!run.error && run.status !== 0 && allowFailure) return { pid: run.pid, exitCode: run.status, diagnostic: run.stderr.trim() || run.stdout.trim(), processWallMs: performance.now() - start };
    assert(!run.error && run.status === 0, `WORKER_FAILURE: ${run.error ? run.error.message : run.stderr.trim() || run.stdout.trim()}`);
    const result = JSON.parse(run.stdout); result.processWallMs = performance.now() - start;
    assert(result.pid !== process.pid && result.sourceDigest === request.sourceDigest, "PROCESS_IDENTITY: expected fresh child and identical sources");
    return result;
}
function main(args = process.argv.slice(2)) {
    if (args.length === 1 && args[0] === "--worker") { console.log(json(worker(JSON.parse(fs.readFileSync(0, "utf8"))))); return; }
    if (args.length === 1 && args[0] === "--help") { console.log("Usage: node tools/test_history_materialization_and_world_age.js [--mutant=" + MUTANTS.join("|") + "]\nWorking-source HIST-10 integration. Temporary saves are created in the OS temp directory and removed after fresh-process restore checks."); return; }
    const mutant = args.length === 1 && args[0].startsWith("--mutant=") ? args[0].slice(9) : null;
    assert(args.length === 0 || MUTANTS.includes(mutant), "Invalid CLI option");
    const start = performance.now(), bundle = sources(), rows = [], restarts = [], checks = [];
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "deus-astra15-"));
    try {
        const seeds = mutant ? [0] : [0, 424242, 20260919];
        const years = mutant === "target_year_alters_early_history" ? [100, 500] : mutant ? [250] : [0, 100, 250, 500];
        for (const seed of seeds) for (const targetYear of years) {
            const savePath = targetYear >= 250 ? path.join(temp, `seed-${seed}-year-${targetYear}.json`) : null;
            const result = child({ mode: "generate", seed, targetYear, sourceDigest: bundle.digest, mutant, savePath });
            rows.push({ seed, ...result });
            checks.push({ id: `ERA_${seed}_${targetYear}`, status: "PASS" });
            if (savePath) {
                const ancestorLoss = result.save.savedAncestors !== result.save.expected.ancestors;
                const restored = child({ mode: "load", savePath, sourceDigest: bundle.digest, fileSha256: result.save.fileSha256 }, ancestorLoss);
                assert(restored.pid !== result.pid, "DISK_RESTART: saver and loader reused a process");
                assert(!ancestorLoss, `ROUNDTRIP_HISTORICAL_RECORDS: ${result.save.expected.ancestors} ancestors became ${result.save.savedAncestors} in actual saved contents; fresh loader ${restored.pid} ${restored.exitCode ? `rejected (exit ${restored.exitCode}): ${restored.diagnostic}` : `restored ${restored.ancestors} ancestors`}`);
                for (const [key, value] of Object.entries(result.save.expected)) equal(restored[key], value, `ROUNDTRIP_${key}: saved world changed after process exit and restart`);
                restarts.push({ seed, targetYear, saverPid: result.pid, loaderPid: restored.pid, fileSha256: result.save.fileSha256, bytes: result.save.bytes, status: "PASS", wallMs: restored.processWallMs });
                fs.unlinkSync(savePath);
                checks.push({ id: `DISK_RESTART_${seed}_${targetYear}`, status: "PASS" });
            }
            console.log(`PASS ERA seed=${seed} year=${targetYear}: ${result.living} living, ${result.ancestors} ancestors, ${result.processWallMs.toFixed(1)} ms`);
        }
        for (const seed of seeds) {
            const seedRows = rows.filter(r => r.seed === seed), identities = new Map();
            for (const row of seedRows) for (const [personId, unitId] of Object.entries(row.personToUnit)) {
                assert(!identities.has(personId) || identities.get(personId) === unitId, `STABLE_ENTITY_ID: seed ${seed}, person ${personId}`); identities.set(personId, unitId);
            }
            checks.push({ id: `STABLE_ENTITY_IDS_${seed}`, status: "PASS" });
            const hundred = rows.find(r => r.seed === seed && r.targetYear === 100), fiveHundred = rows.find(r => r.seed === seed && r.targetYear === 500);
            if (hundred && fiveHundred) {
                assert(hundred.coreSha256 === fiveHundred.checkpoint100Sha256 && hundred.eventsSha256 === fiveHundred.checkpoint100EventsSha256, `PREFIX_INVARIANCE: seed ${seed} Year100 differs from the 500-year checkpoint`);
                checks.push({ id: `PREFIX_INVARIANCE_${seed}`, status: "PASS" });
            }
        }
        if (!mutant) {
            const dawn = rows.find(r => r.seed === 0 && r.targetYear === 0);
            const alias = child({ mode: "generate", seed: 0, targetYear: 1, sourceDigest: bundle.digest });
            assert(dawn.currentYear === 0 && alias.currentYear === 1 && alias.living === dawn.living && alias.records === dawn.records, "DAWN_ALIAS: Year0/Year1 founders differ in clock year, census or records");
            checks.push({ id: "DAWN_YEAR1_ALIAS", status: "PASS" });
            const override = child({ mode: "generate", seed: 424242, seedOverride: 0, targetYear: 0, sourceDigest: bundle.digest });
            const repeat = child({ mode: "generate", seed: 424242, seedOverride: 0, targetYear: 0, sourceDigest: bundle.digest });
            assert(override.worldSeed === 424242 && override.demographicSeed === 0, "API_SEED_OVERRIDE: explicit seed0 did not select timeline RNG while preserving world seed");
            assert(override.coreSha256 === repeat.coreSha256 && override.unitsSha256 === repeat.unitsSha256, "API_SEED_OVERRIDE: explicit seed0 is not repeatable");
            checks.push({ id: "API_EXPLICIT_SEED", status: "PASS" });
            const colony = child({ mode: "generate", seed: 0, targetYear: 0, colonyBootstrap: true, sourceDigest: bundle.digest });
            assert(colony.coreSha256 === dawn.coreSha256, "COLONY_BOOTSTRAP: subsequent listeners changed the historical core");
            checks.push({ id: "COLONY_NEW_GAME_BOOTSTRAP", status: "PASS" });
            for (const targetYear of [250, 500]) {
                const mature = child({ mode: "generate", seed: 0, targetYear, colonyBootstrap: true, sourceDigest: bundle.digest });
                assert(mature.coreSha256 === rows.find(r => r.seed === 0 && r.targetYear === targetYear).coreSha256,
                    `COLONY_BOOTSTRAP: year${targetYear} listeners changed the historical core`);
                checks.push({ id: `COLONY_NEW_GAME_BOOTSTRAP_${targetYear}`, status: "PASS" });
            }
        }
        assert(sources().digest === bundle.digest, "SOURCE_CHANGED: working production changed during suite");
        const report = { task: "DEUS-TSK-ASTRA-15", status: "PASS", sourceSha256: bundle.hashes, sourceDigest: bundle.digest, checks, matrix: rows, restarts,
            totalWallMs: performance.now() - start, methodology: "Fresh VM and OS process per canonical seed/age; production History world:created, World.addUnit, Callings and Dnd5e; original engine DataManager/JsonEx plus production save aliases. Rendering classes and scene baseline methods are headless doubles. No native gameplay claim. Year0 and Year1 are the same founders, founded at year 0 and year 1 (core currentYear=0/1); N>1 means N unchanged HIST-09 annual steps from year 1, core currentYear=N+1. Full core and event hashes prove Year100 prefix. Dedicated saver exits before fresh loader reads/fsynced disk save; full world/history/units/factions/sites/people/rulers hashes compared." };
        console.log(`RESULT: ${checks.length} passed, 0 failed`); console.log(json(report));
    } finally {
        // Delete only known files under the exact directory this invocation created.
        for (const name of fs.readdirSync(temp)) { assert(/^seed-\d+-year-\d+\.json$/.test(name), "Unexpected temp file; refusing cleanup"); fs.unlinkSync(path.join(temp, name)); }
        fs.rmdirSync(temp);
    }
}
if (require.main === module) { try { main(); } catch (error) { console.error(`FAIL ${error.stack || error.message}`); process.exitCode = 1; } }
module.exports = { sources, load, inspect, worker, main };
