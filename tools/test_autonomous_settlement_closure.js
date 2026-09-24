"use strict";
// tools/test_autonomous_settlement_closure.js - Headless proof for DEUS-TSK-FABLE-07: eight founders keep and grow
// their settlement on their own. Nobody in this harness orders a unit around: the driver only moves the calendar and
// calls Game_Map.update, and every job is posted by DEUS_Projects and taken by DEUS_Colonists' own decision loop.
//
// What it proves, in order: carried food counts once towards the settlement's food security (never by weight);
// the shelter, a communal stockpile and a food cache are opened by the brain's ranking and finished by the founders
// while suppers and bedtimes interrupt them; a survival interruption never counts against a cell; the finished
// shelter's beds leave no bedding project to open; a quiet settlement opens nothing it does not need; food and storage
// taken away are noticed and replaced; two newcomers get exactly the beds they lack; nothing is created or lost
// that a harvest, a build or a meal does not explain; a save and reload changes nothing and the work goes on.
//
// Runs the real DEUS_Objects.js, DEUS_Items.js, DEUS_Jobs.js, DEUS_Projects.js and DEUS_Colonists.js in a Node vm
// against a World double (one 64x64 ground area with a pond) and the real catalog. The calendar ($ufTime) advances
// one minute every MINUTE_TICKS map updates, as DEUS_Core does (TimeSpeed 1/6 s: ten frames a minute, 600 an hour).
// Bare bushes and trees regrow after the hours the catalog gives them (the game's Environment rule, replayed here).
// The test-clock hook (DEUS_Test.js, UF.Time.setForTest) is run apart, in a small sandbox, to prove its contract.
//
// Usage: node tools/test_autonomous_settlement_closure.js [--mutant=<name>] [--hourTicks=600] [--seed=N] [--quiet]
//   --hourTicks   map updates per calendar hour (default 600, the engine's; 3600 is what UF_Colonists' TICKS_PER_HOUR assumes)
//   --mutant      patches a plugin in memory; the run must then FAIL (Rule 4):
//                 carried_not_counted (packs left out of the food reserve), survival_counts_as_failure (a bedtime
//                 cancellation counts against the cell), no_autonomy (colonists never take project jobs)
// Exit code: 0 all checks passed, 1 a check failed, 2 harness problem.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const arg = (name, fallback) => { const a = process.argv.find(x => x.startsWith(`--${name}=`)); return a ? a.slice(name.length + 3) : fallback; };
const mutant = arg("mutant", "");
const quiet = process.argv.includes("--quiet");
const HOUR_TICKS = Math.max(60, parseInt(arg("hourTicks", "600"), 10) || 600);
const MINUTE_TICKS = Math.max(1, Math.round(HOUR_TICKS / 60));
const DAY_TICKS = MINUTE_TICKS * 60 * 24;
const SEED = (parseInt(arg("seed", "20260923"), 10) >>> 0) || 20260923;

const MUTANTS = {
    carried_not_counted: { file: "projects", from: "for (const u of people) for (const it of I.inventoryOf(u.id)) carriedLb += take(it);", to: "for (const u of people) for (const it of I.inventoryOf(u.id)) take(it);" },
    survival_counts_as_failure: { file: "projects", from: "if (job && job.state === \"failed\" && !preempted(job)) {", to: "if (job && job.state === \"failed\") {" },
    no_autonomy: { file: "jobs", from: "const candidates = open().filter(j => sameLevel(j.target, unit) && matches(j, filter));", to: "const candidates = open().filter(j => sameLevel(j.target, unit) && !(j.params && j.params.project) && matches(j, filter));" }
};

const catalogText = fs.readFileSync(path.join(ROOT, "game", "data", "UF_WorldCatalog.json"), "utf8");
const read = name => fs.readFileSync(path.join(PLUGINS, name), "utf8");
const sources = { objects: read("DEUS_Objects.js"), items: read("DEUS_Items.js"), jobs: read("DEUS_Jobs.js"), projects: read("DEUS_Projects.js"), colonists: read("DEUS_Colonists.js"), test: read("DEUS_Test.js") };
if (mutant) {
    const m = MUTANTS[mutant];
    if (!m) { console.error(`unknown mutant "${mutant}" (known: ${Object.keys(MUTANTS).join(", ")})`); process.exit(2); }
    if (!sources[m.file].includes(m.from)) { console.error(`mutant "${mutant}": pattern not found in the ${m.file} plugin`); process.exit(2); }
    sources[m.file] = sources[m.file].replace(m.from, m.to);
    console.log(`MUTANT ${mutant}: ${m.file} plugin patched in memory; this run must FAIL`);
}

let passed = 0, failed = 0;
function check(name, condition, detail = "") {
    if (condition) { passed++; console.log(`PASS closure.${name}${detail ? " - " + detail : ""}`); }
    else { failed++; console.log(`FAIL closure.${name}${detail ? " - " + detail : ""}`); }
    return !!condition;
}
const errors = [];
const note = text => { if (!quiet) console.log(`  ${text}`); };

function hash32(...parts) {
    let h = 2166136261 >>> 0;
    for (const part of parts) {
        let v = part >>> 0;
        for (let i = 0; i < 4; i++) { h ^= v & 255; h = Math.imul(h, 16777619) >>> 0; v >>>= 8; }
    }
    return h >>> 0;
}
function mulberry32(a) {
    return () => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

//-----------------------------------------------------------------------------
// The sandbox: the real plugins over a World double, a calendar that runs, regrowth from the catalog

function makeSandbox(seed, size, catalog) {
    const ufObjects = new Uint16Array(size * size);
    const water = new Set();
    const built = { ufObjects, data: null };
    const sandbox = {};
    const emit = (name, ...args) => sandbox.UF.Events.emit(name, ...args);
    const zOf = o => (o && o.z !== undefined ? o.z : (o && o.area && o.area.z !== undefined ? o.area.z : 0));
    const inBounds = (x, y) => x >= 0 && y >= 0 && x < size && y < size;
    let clock = 0;
    const W = {
        EVENT_BASE: 1000, _frame: 0,
        state: { version: 4, seed, size, areasX: 1, areasY: 1, startArea: { x: 0, y: 0 }, units: {}, nextUnitId: 1, diffs: {}, objectDiffs: {}, factions: { playerId: "player" } },
        hash32, mulberry32, zOf,
        isLevel: z => z === 0,
        levelKey: (ax, ay, z = 0) => `${ax},${ay}${z ? "," + z : ""}`,
        inWorld: (ax, ay, z = 0) => ax === 0 && ay === 0 && z === 0,
        currentArea: () => ({ x: 0, y: 0 }),
        viewLevel: () => ({ x: 0, y: 0, z: 0 }),
        levelOfMapId: () => null,
        areaMapId: () => 1,
        peekArea: () => built,
        getObject: (ax, ay, x, y) => (inBounds(x, y) ? ufObjects[y * size + x] : 0),
        setObject(ax, ay, x, y, type, z = 0) {
            if (!inBounds(x, y)) return false;
            const i = y * size + x, t = sandbox.UF.Objects.type(type | 0);
            if (type && t && t.passable !== true && ufObjects[i] !== (type | 0)) {
                const s = this.standerAt(ax, ay, x, y, z);
                if (s) { this.lastObjectRefusal = { area: { x: ax, y: ay }, x, y, z, unitId: s.id, unitName: s.name || `unit ${s.id}` }; emit("world:objectRefused", this.lastObjectRefusal); return false; }
            }
            ufObjects[i] = type | 0;
            emit("world:objectChanged", { x: ax, y: ay }, x, y, type | 0);
            return true;
        },
        getTile: (ax, ay, x, y) => (water.has(y * size + x) ? 2048 : 1),
        walkable(ax, ay, x, y, opts = {}) {
            if (!inBounds(x, y) || water.has(y * size + x)) return false;
            if (opts.ground) return true;
            return !sandbox.UF.Objects.blocksIn({ x: 0, y: 0, z: 0 }, x, y);
        },
        standerAt: (ax, ay, x, y) => Object.values(W.state.units).find(u => u.x === x && u.y === y) || null,
        addUnit(spec) {
            const id = W.state.nextUnitId++;
            const u = { id, name: spec.name || `Founder ${id}`, image: { characterName: "", characterIndex: 0 }, area: { x: 0, y: 0 }, z: 0, x: spec.x | 0, y: spec.y | 0, dir: 2, data: spec.data || {}, goal: null };
            W.state.units[id] = u;
            emit("world:unitAdded", u);
            return u;
        },
        unit: id => W.state.units[id] || null,
        units: () => Object.values(W.state.units),
        unitsInArea: (ax, ay, z = 0) => (ax === 0 && ay === 0 && z === 0 ? Object.values(W.state.units) : []),
        removeUnit(id) { const u = W.state.units[id]; if (!u) return false; delete W.state.units[id]; emit("world:unitRemoved", u); return true; },
        sendUnit(id, goal) { const u = W.state.units[id]; if (!u) return false; u.goal = { area: { x: 0, y: 0 }, x: goal.x | 0, y: goal.y | 0, z: 0 }; return true; },
        stopUnit(id) { const u = W.state.units[id]; if (u) u.goal = null; },
        eventOf: () => null, refreshUnitImage() {}, invalidateUnitsCache() {},
        walkUnits() {
            for (const u of Object.values(W.state.units)) {
                if (!u.goal) continue;
                if (u.x === u.goal.x && u.y === u.goal.y) { u.goal = null; emit("world:unitArrived", u); continue; }
                const nx = u.x + Math.sign(u.goal.x - u.x), ny = u.y + Math.sign(u.goal.y - u.y);
                if (water.has(ny * size + nx)) { u.goal = null; continue; }
                u.x = nx; u.y = ny;
            }
        },
        water, ufObjects
    };
    class Sprite { constructor() { this.children = []; } addChild(c) { this.children.push(c); } }
    function Spriteset_Map() {}
    Spriteset_Map.prototype.createCharacters = function() {};
    function Game_Map() {}
    Game_Map.prototype.update = function() {};
    Game_Map.prototype.isPassable = () => true;
    function Scene_Boot() {}
    Scene_Boot.prototype.start = function() {};
    const errorConsole = Object.assign({}, console, {
        error: (...args) => { errors.push(args.map(a => (a && a.stack) || String(a)).join(" ")); if (!quiet) console.error(...args); },
        warn: (...args) => { if (!quiet) console.warn(...args); }
    });
    // The calendar, as DEUS_Core keeps it: hour, minute, day; a minute every MINUTE_TICKS updates.
    const time = {
        hour: 8, minute: 0, day: 1, monthIndex: 0, year: 1, seasonName: "spring",
        setTime(h, m) { this.hour = Math.max(0, Math.min(23, h | 0)); this.minute = Math.max(0, Math.min(59, m | 0)); },
        advanceMinute() {
            this.minute++;
            if (this.minute >= 60) { this.minute = 0; this.hour++; emit("time:hour", this.hour); }
            if (this.hour >= 24) { this.hour = 0; this.day++; emit("time:day", this.day, "Granite", this.year); }
        }
    };
    Object.assign(sandbox, {
        console: errorConsole, performance: { now: () => Date.now() },
        Sprite, Spriteset_Map, Game_Map, Scene_Boot, SceneManager: { _scene: null },
        DataManager: { makeSaveContents: () => ({ ufWorld: W.state }), extractSaveContents(contents) { W.state = contents.ufWorld; } },
        Tilemap: { isWaterTile: id => id === 2048 },
        ImageManager: { loadCharacter: () => ({}), loadTileset: () => ({}), isBigCharacter: () => true },
        $gameMap: null, $dataMap: null, $gamePlayer: null,
        $ufWorldCatalog: catalog, $deusWorldCatalog: catalog,
        $ufTime: time
    });
    sandbox.window = sandbox;
    sandbox.UF = {
        World: W,
        Time: { ticks: () => clock, paused: false, multiplier: () => 1, setLevel() {} },
        Events: {
            _listeners: {},
            on(event, cb) { (this._listeners[event] = this._listeners[event] || []).push(cb); },
            off(event, cb) { if (this._listeners[event]) this._listeners[event] = this._listeners[event].filter(x => x !== cb); },
            emit(event, ...args) { for (const cb of (this._listeners[event] || []).slice()) { try { cb(...args); } catch (e) { errorConsole.error(e); } } }
        }
    };
    sandbox.DEUS = sandbox.UF;
    vm.createContext(sandbox);
    vm.runInContext(sources.objects, sandbox, { filename: "DEUS_Objects.js" });
    vm.runInContext(sources.items, sandbox, { filename: "DEUS_Items.js" });
    vm.runInContext(sources.jobs, sandbox, { filename: "DEUS_Jobs.js" });
    vm.runInContext(sources.projects, sandbox, { filename: "DEUS_Projects.js" });
    vm.runInContext(sources.colonists, sandbox, { filename: "DEUS_Colonists.js" });
    const S = { sandbox, W, O: sandbox.UF.Objects, I: sandbox.UF.Items, J: sandbox.UF.Jobs, P: sandbox.UF.Projects, C: sandbox.UF.Colonists, map: new sandbox.Game_Map(), area: { x: 0, y: 0, z: 0 }, catalog, time };
    S.now = () => clock;
    S.clockText = () => `day ${time.day} ${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;
    // Regrowth is DEUS_Objects' own (UF.World.state.regrow, processed on every time:hour the calendar emits); the
    // harness only counts the bushes and trees that came back.
    S.regrown = 0;
    S.started = false;
    const traced = new Set((arg("trace", "") || "").split(";").filter(Boolean));
    sandbox.UF.Events.on("world:objectChanged", (area, x, y, index) => {
        const t = S.O.type(index | 0);
        if (S.started && t && (t.id === "fruit_tree" || t.id === "berry_bush")) S.regrown++;
        if (traced.has(`${x},${y}`)) console.log(`TRACE ${S.clockText()} (${x},${y}) -> ${t ? t.id : "nothing"}\n${new Error().stack.split("\n").slice(2, 9).join("\n")}`);
    });
    S.update = () => {
        clock++;
        W._frame = clock;
        if (clock % MINUTE_TICKS === 0) time.advanceMinute();
        W.walkUnits();
        S.map.update(true);
    };
    return S;
}

//-----------------------------------------------------------------------------
// The settlement: hearth, camp ring, an empty larder, founders with a few days of rations, materials, wild food

const SIZE = 64, SITE = { x: 32, y: 32 }, RADIUS = 4, LARDER = { x: 37, y: 32 };
const RATIONS_EACH = 3;
function makeSettlement(seed) {
    const catalog = JSON.parse(catalogText);
    // One communal shelter serves up to sixteen here (the catalog's eight would make the newcomers of scene J a second
    // shelter, whose beds would cover them; with sixteen, their beds are a genuine bedding need). The cottage
    // blueprint (DEUS-TSK-FABLE-16) is off: this harness proves the camp's self-maintenance, and a cottage's beds
    // would cover scene J's newcomers too; the village's housing is proven by tools/test_settlement_domestic_housing.js.
    catalog.colony.projects = Object.assign({}, catalog.colony.projects, { perShelter: 16, blueprints: { household_cottage: null } });
    const S = makeSandbox(seed, SIZE, catalog);
    const { W, O, I, area } = S;
    for (let y = 30; y <= 34; y++) for (let x = 44; x <= 46; x++) W.water.add(y * SIZE + x);
    O.setIn(area, SITE.x, SITE.y, "campfire");
    for (let dy = -RADIUS; dy <= RADIUS; dy++) for (let dx = -RADIUS; dx <= RADIUS; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== RADIUS || dx === 0) continue;
        O.setIn(area, SITE.x + dx, SITE.y + dy, "wall_wood");
    }
    W.state.colony = { version: 2, factionId: "player", siteId: 1, site: { x: SITE.x, y: SITE.y }, area: { x: 0, y: 0 }, z: 0, radius: RADIUS,
        plan: JSON.parse(JSON.stringify(catalog.colony.plan)).map(s => Object.assign(s, { done: false })), stockpiles: [], log: [] };
    O.setIn(area, LARDER.x, LARDER.y, "stockpile");
    W.state.colony.stockpiles.push({ x: LARDER.x, y: LARDER.y, stores: ["food"], step: "larder" });
    I.drop(area, SITE.x, 8, "log", 40);
    I.drop(area, 8, SITE.x, "stone", 20);
    I.drop(area, SITE.x, 9, "straw", 30);
    for (const [x, y] of [[12, 12], [52, 12], [12, 52], [52, 52], [20, 50], [50, 20]]) O.setIn(area, x, y, "oak");
    for (let i = 0; i < 10; i++) O.setIn(area, 40 + i, 44, "grass_tuft");
    // Wild food, placed by the seeded generator between 10 and 28 cells from the hearth on free dry ground.
    const rng = mulberry32(hash32(seed, 0xf00d));
    const busy = (x, y) => W.water.has(y * SIZE + x) || !!O.atIn(area, x, y) || I.atIn(area, x, y).length > 0 || (y >= 7 && y <= 10 && Math.abs(x - SITE.x) <= 1) || (x >= 7 && x <= 9 && Math.abs(y - SITE.y) <= 1);
    const wild = { fruit_tree: 0, berry_bush: 0 };
    let tries = 0;
    while ((wild.fruit_tree < 60 || wild.berry_bush < 40) && tries++ < 20000) {
        const x = 3 + Math.floor(rng() * (SIZE - 6)), y = 3 + Math.floor(rng() * (SIZE - 6));
        const d = Math.max(Math.abs(x - SITE.x), Math.abs(y - SITE.y));
        if (d < 10 || d > 28 || busy(x, y)) continue;
        const id = wild.fruit_tree < 60 && (wild.berry_bush >= 40 || rng() < 0.6) ? "fruit_tree" : "berry_bush";
        O.setIn(area, x, y, id);
        wild[id]++;
    }
    const seats = [[-1, -3], [1, -3], [-3, 0], [3, 0], [-1, 3], [1, 3], [0, -1], [0, 1]];
    S.founders = seats.map((s, i) => W.addUnit({ x: SITE.x + s[0], y: SITE.y + s[1], data: { kind: "colonist", faction: "player", founder: true, age: 25, gender: i % 2 ? "female" : "male", inventory: [], site: 1 } }));
    for (const u of S.founders) I.give("rations", RATIONS_EACH, u.id, { bypassLimits: true });
    S.founderIds = S.founders.map(u => u.id);
    S.wild = wild;
    S.started = true;
    // The founders arrive after supper time: the founding work runs into the first bedtimes (from 20:00 on, each
    // founder's own), so the survival interruptions are part of the proof rather than an accident of timing.
    S.time.setTime(19, 30);
    return S;
}

//-----------------------------------------------------------------------------
// Instruments: what the founders did on their own, what interrupted them, what every item became

function instrument(S) {
    const { J, I, O, C } = S;
    const rec = { assignCalls: 0, orders: 0, done: {}, projectJobsDone: 0, preempted: [], rests: [], deaths: [], created: 0, jobKinds: {} };
    S.sandbox.UF.Events.on("colonists:died", (u, cause) => rec.deaths.push({ name: u.name, cause, at: S.clockText() }));
    const assign = J.assign;
    J.assign = function(...args) { rec.assignCalls++; return assign.apply(this, args); };
    if (C && typeof C.order === "function") { const order = C.order; C.order = function(...args) { rec.orders++; return order.apply(this, args); }; }
    const seenAt = new Map(); // job id -> what the job was about when it started, for the ledger
    S.sandbox.UF.Events.on("jobs:assigned", job => {
        const t = job.target ? O.atIn(S.area, job.target.x, job.target.y) : null;
        const item = job.params && job.params.itemId ? I.get(job.params.itemId) : null;
        seenAt.set(job.id, { object: t ? t.id : null, itemType: item ? item.type : null });
    });
    const ledger = { yields: {}, built: {}, eaten: 0, baseline: null };
    const add = (m, k, n) => { m[k] = (m[k] || 0) + n; };
    S.sandbox.UF.Events.on("jobs:done", job => {
        rec.done[job.type] = (rec.done[job.type] || 0) + 1;
        if (job.params && job.params.project) rec.projectJobsDone++;
        const was = seenAt.get(job.id) || {};
        const cat = S.catalog;
        if (["chop", "gather", "pick", "quarry", "mine"].includes(job.type) && was.object) {
            const t = cat.objects.find(o => o.id === was.object);
            const y = t && t.actions && t.actions[job.type] ? t.actions[job.type].yields : null;
            for (const id of Object.keys(y || {})) add(ledger.yields, id, y[id] | 0);
        } else if (job.type === "build" && job.params && job.params.objectId) {
            const placed = job.target ? O.atIn(S.area, job.target.x, job.target.y) : null;
            if (placed && placed.id === job.params.objectId && placed.build && placed.build.items) for (const id of Object.keys(placed.build.items)) add(ledger.built, id, placed.build.items[id] | 0);
        } else if (job.type === "eat" && was.itemType) {
            const t = I.type(was.itemType);
            if (t && t.food) ledger.eaten += t.food.nutrition || 0;
        }
        seenAt.delete(job.id);
    });
    S.sandbox.UF.Events.on("jobs:failed", job => {
        if (job.params && job.params.project && typeof job.reason === "string" && job.reason.startsWith("survival:")) rec.preempted.push({ type: job.type, reason: job.reason, at: S.clockText() });
        seenAt.delete(job.id);
    });
    // Long rests: when each founder's sleep job with longRest starts and ends, in calendar hours. The same sampler
    // notes any cell failure a project holds for a survival reason (they are cleared once the cell is done, so the
    // record must be taken while the project is active).
    const resting = new Map();
    rec.survivalFailures = new Set();
    S.watchRests = () => {
        for (const p of S.P.active()) for (const key of Object.keys(p.failed || {})) {
            const f = p.failed[key];
            if (f && typeof f.reason === "string" && f.reason.startsWith("survival:")) rec.survivalFailures.add(`${p.id}:${key}:${f.reason}`);
        }
        for (const id of S.founderIds) {
            const job = J.of(id);
            const cur = resting.get(id);
            if (job && job.type === "sleep" && job.params && job.params.longRest) {
                if (!cur || cur.job !== job.id) resting.set(id, { job: job.id, start: S.now(), startText: S.clockText() });
            } else if (cur) {
                rec.rests.push({ unit: id, hours: (S.now() - cur.start) / HOUR_TICKS, from: cur.startText, to: S.clockText() });
                resting.delete(id);
            }
        }
    };
    S.rec = rec;
    S.ledger = ledger;
    return rec;
}
// Every stack once, wherever it is: materials by group in counts, food in pounds of nutrition.
const GROUP = { log: "wood", wood: "wood", straw: "straw", fiber: "straw", stone: "stone", rocks_small: "stone" };
function totals(S) {
    const out = { wood: 0, straw: 0, stone: 0, food: 0 };
    for (const it of S.I.all()) {
        const t = S.I.type(it.type);
        if (!t) continue;
        if (t.food) out.food += (t.food.nutrition || 0) * it.count;
        else if (GROUP[it.type]) out[GROUP[it.type]] += it.count;
    }
    return out;
}
function rebase(S) { S.ledger.baseline = totals(S); S.ledger.yields = {}; S.ledger.built = {}; S.ledger.eaten = 0; }
function expectedTotals(S) {
    const L = S.ledger, out = Object.assign({}, L.baseline);
    for (const id of Object.keys(L.yields)) { const g = GROUP[id]; const t = S.I.type(id); if (g) out[g] += L.yields[id]; else if (t && t.food) out.food += (t.food.nutrition || 0) * L.yields[id]; }
    for (const id of Object.keys(L.built)) { const g = GROUP[id]; if (g) out[g] -= L.built[id]; }
    out.food -= L.eaten;
    return out;
}
const close = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
const fmt = o => Object.keys(o).map(k => `${k} ${Math.round(o[k] * 1000) / 1000}`).join(", ");

//-----------------------------------------------------------------------------
// Driving: updates with the calendar running; a line per day for the record

function drive(S, updates, until) {
    let day = S.time.day;
    for (let i = 0; i < updates; i++) {
        S.update();
        if (S.watchRests && S.now() % 10 === 0) S.watchRests();
        if (S.time.day !== day) { day = S.time.day; dayLine(S); }
        if (until && until()) return i + 1;
    }
    return until ? -1 : updates;
}
function dayLine(S) {
    const d = S.P.evaluateDeficits(S.area);
    const kinds = S.P.list().reduce((m, p) => Object.assign(m, { [`${p.kind}:${p.state}`]: (m[`${p.kind}:${p.state}`] || 0) + 1 }), {});
    const open = S.J.list(j => j.state !== "done" && j.state !== "failed").length;
    const projectJobs = S.J.list(j => j.state !== "done" && j.state !== "failed" && j.params && j.params.project);
    const stuck = projectJobs.filter(j => !j.assigned).reduce((m, j) => Object.assign(m, { [`${j.type}${j.reason ? " (" + j.reason + ")" : ""}`]: (m[`${j.type}${j.reason ? " (" + j.reason + ")" : ""}`] || 0) + 1 }), {});
    const people = S.W.units().filter(u => u.data && u.data.kind === "colonist" && !u.data.dead);
    const asleep = people.filter(u => { const j = S.J.of(u.id); return j && j.type === "sleep"; }).length;
    const worst = people.reduce((m, u) => Math.max(m, (u.data.needs && u.data.needs.exhaustion) | 0), 0);
    const wild = S.O.findIn(S.area, { near: { x: SITE.x, y: SITE.y }, radius: 40, unsorted: true }).filter(f => f.type.id === "fruit_tree" || f.type.id === "berry_bush").length;
    note(`${S.clockText()}: ${people.length} alive (${asleep} asleep, worst exhaustion ${worst}, ${S.rec.deaths.length} dead); food ${d ? d.food.current : "?"}/${d ? d.food.needed : "?"} days (carried ${d ? d.food.carriedLb : "?"} lb, stored ${d ? d.food.storedLb : "?"} lb), shelter ${d ? d.shelter.current : "?"}, beds ${d ? d.bed.current : "?"}/${d ? d.bed.needed : "?"}, storage ${d ? d.storage.current : "?"}/${d ? d.storage.needed : "?"}; projects ${JSON.stringify(kinds)}; ${open} live jobs (${projectJobs.length} project jobs, untaken ${JSON.stringify(stuck)}); ${S.rec.preempted.length} survival interruptions; ${wild} wild food plants standing, ${S.regrown} regrown`);
}
const groupsClose = (a, b) => Object.keys(a).every(g => close(a[g], b[g], 1e-3));
const days = n => Math.round(n * DAY_TICKS);
const projectsOf = (S, kind) => S.P.list(p => p.kind === kind);
const objectAt = (S, x, y) => { const t = S.O.atIn(S.area, x, y); return t ? t.id : null };

//-----------------------------------------------------------------------------
// The test-clock hook, on the real UF_Time.js in a sandbox of its own

function testClockHook() {
    // The hook's own code, cut from DEUS_Test.js between its markers, over a calendar double like DEUS_Core's.
    const start = sources.test.indexOf("// >>> test clock"), end = sources.test.indexOf("// <<< test clock");
    if (start < 0 || end < 0) return { missing: true };
    const block = sources.test.slice(sources.test.indexOf("\n", start) + 1, end);
    const box = { console, performance: { now: () => Date.now() } };
    box.window = box;
    box.UF = { Events: { on() {} }, Test: { active: true }, Time: { paused: false, ticks: () => 0 } };
    box.DEUS = box.UF;
    let timer = 3;
    box.$ufTime = { hour: 21, minute: 40, day: 2, _timer: 0.1, setTime(h, m) { this.hour = h; this.minute = m; timer++; } };
    vm.createContext(box);
    vm.runInContext(`${block}\ninstallTestClock(window);`, box, { filename: "DEUS_Test.js (test clock)" });
    const T = box.UF.Time;
    const set = typeof T.setForTest === "function" ? T.setForTest(8, 0, 1) : undefined;
    const after = { hour: box.$ufTime.hour, minute: box.$ufTime.minute, day: box.$ufTime.day, timer: box.$ufTime._timer, paused: T.paused };
    const clamped = T.setForTest(30, -5);
    box.UF.Test.active = false;
    box.$ufTime.hour = 21;
    const refused = T.setForTest(8, 0, 1);
    return { set, after, clamped, refused, hourAfterRefusal: box.$ufTime.hour, usedSetTime: timer === 5 };
}

//-----------------------------------------------------------------------------
// Checks

console.log(`=== Autonomous settlement closure (DEUS_Projects.js + DEUS_Colonists.js) headless checks: ${MINUTE_TICKS} updates a minute, ${HOUR_TICKS} an hour, seed ${SEED} ===`);
try {
    const S = makeSettlement(SEED);
    const { W, O, I, J, P, C } = S;
    check("plugins_load", typeof P.brain === "function" && typeof C.decide === "function" && typeof I.inventoryOf === "function" && S.wild.fruit_tree === 60 && S.wild.berry_bush === 40,
        `Projects, Jobs, Items, Colonists loaded; ${S.wild.fruit_tree} fruit trees and ${S.wild.berry_bush} berry bushes within 28 cells; 8 founders with ${RATIONS_EACH} rations each`);

    // A. The test clock: sets the calendar, keeps it running, refuses outside a test.
    const hook = testClockHook();
    check("test_clock_hook", !hook.missing && !!hook.set && hook.set.hour === 8 && hook.set.minute === 0 && hook.set.day === 1 && hook.after.hour === 8 && hook.after.day === 1 && hook.after.timer === 0 && hook.after.paused === false && hook.usedSetTime &&
        !!hook.clamped && hook.clamped.hour === 23 && hook.clamped.minute === 0 && hook.refused === null && hook.hourAfterRefusal === 21,
        hook.missing ? "DEUS_Test.js has no test clock block" : `UF.Time.setForTest(8, 0, 1) -> ${JSON.stringify(hook.set)}, calendar not paused, minute timer reset; (30, -5) clamps to ${hook.clamped ? `${hook.clamped.hour}:${hook.clamped.minute}` : "?"}; refused (null) when UF.Test is inactive, clock untouched at ${hook.hourAfterRefusal}:00`);

    // B. Carried food is the settlement's food security; deposited food is the same food, moved.
    instrument(S);
    drive(S, 16);
    const d0 = P.evaluateDeficits(S.area);
    const cat = S.catalog, nut = cat.items.types.find(t => t.id === "rations").food.nutrition, wt = cat.items.types.find(t => t.id === "rations").weight;
    check("carried_nutrition_counted", !!d0 && d0.population === 8 && close(d0.food.carriedLb, 8 * RATIONS_EACH * nut) && close(d0.food.totalAccessibleNutrition, 8 * RATIONS_EACH * nut) && close(d0.food.communalStoredNutrition, 0) && close(d0.food.current, RATIONS_EACH * nut) && d0.food.deficit === 0 && d0.food.critical === false && !close(d0.food.lb, 8 * RATIONS_EACH * wt),
        d0 ? `${8 * RATIONS_EACH} rations in the founders' packs = ${d0.food.totalAccessibleNutrition} lb of nutrition (${8 * RATIONS_EACH * wt} lb by weight), ${d0.food.current} colonist-days, deficit ${d0.food.deficit}; communal ${d0.food.communalStoredNutrition} lb` : "no evaluation");
    const holder = S.founders[0];
    const held = I.inventoryOf(holder.id).filter(it => it.type === "rations");
    const removed = held.reduce((n, it) => n + it.count, 0);
    for (const it of held) I.remove(it.id);
    const d1 = P.evaluateDeficits(S.area);
    const expectDeficit = Math.max(0, 3 - (8 * RATIONS_EACH - removed) * nut / 8);
    check("removal_raises_deficit", !!d1 && close(d1.food.carriedLb, (8 * RATIONS_EACH - removed) * nut) && close(d1.food.deficit, Math.round(expectDeficit * 1000) / 1000) && close(d1.food.deficitLb, Math.round(expectDeficit * 8 * 1000) / 1000),
        d1 ? `${removed} rations taken from one pack: carried ${d1.food.carriedLb} lb, deficit ${d1.food.deficit} colonist-days (${d1.food.deficitLb} lb)` : "no evaluation");
    const given = I.give("rations", removed, holder.id, { bypassLimits: true });
    const d2 = P.evaluateDeficits(S.area);
    const depositor = S.founders[1];
    const stack = I.inventoryOf(depositor.id).find(it => it.type === "rations");
    const moved = stack ? stack.count : 0;
    if (stack) I.putDown(stack.id, S.area, LARDER.x, LARDER.y);
    const d3 = P.evaluateDeficits(S.area);
    const onLarder = I.atIn(S.area, LARDER.x, LARDER.y).filter(it => it.type === "rations").reduce((n, it) => n + it.count, 0);
    check("deposit_moves_not_adds", given.length > 0 && !!d2 && close(d2.food.totalAccessibleNutrition, d0.food.totalAccessibleNutrition) && !!d3 && moved > 0 && onLarder === moved &&
        close(d3.food.totalAccessibleNutrition, d2.food.totalAccessibleNutrition) && close(d3.food.carriedLb, d2.food.carriedLb - moved * nut) && close(d3.food.communalStoredNutrition, moved * nut) && close(d3.food.larderLb, moved * nut) && d3.food.deficit === d2.food.deficit,
        d3 ? `${moved} rations put in the larder: total ${d3.food.totalAccessibleNutrition} lb unchanged, carried ${d3.food.carriedLb} lb, communal ${d3.food.communalStoredNutrition} lb` : "no evaluation");
    // Independent count: every food stack in the world once, by nutrition, wherever it lies.
    const independent = S.I.all().filter(it => { const t = I.type(it.type); return t && t.food; }).reduce((n, it) => n + I.type(it.type).food.nutrition * it.count, 0);
    check("no_double_count", !!d3 && close(d3.food.totalAccessibleNutrition, Math.round(independent * 1000) / 1000),
        `plugin total ${d3 ? d3.food.totalAccessibleNutrition : "?"} lb, independent walk over every stack ${Math.round(independent * 1000) / 1000} lb`);
    rebase(S);

    // C. The brain's first choice is the shelter: food is covered by the packs, storage is a lesser need.
    const b0 = P.brain();
    check("shelter_first", !!b0 && b0.chosen && b0.chosen.kind === "communal_shelter" && b0.candidates.find(c => c.kind === "food_cache").utility === -Infinity && b0.candidates.find(c => c.kind === "communal_stockpile").utility < b0.chosen.utility,
        b0 ? b0.candidates.map(c => `${c.kind}:${c.utility === -Infinity ? "-" : c.utility.toFixed(2)}`).join("  ") : "no brain");

    // D. Founding to a standing settlement, unattended: shelter, stockpile and food cache by the founders alone.
    const startTotals = totals(S);
    const doneKinds = () => ["communal_shelter", "communal_stockpile", "food_cache"].filter(k => projectsOf(S, k).some(p => p.state === "done"));
    const n1 = drive(S, days(14), () => doneKinds().length === 3);
    const shelter = projectsOf(S, "communal_shelter")[0] || null;
    const rel = shelter ? P._internal.relativeCells(P.blueprint("communal_shelter")) : null;
    const at = (c) => objectAt(S, shelter.origin.x + c.x, shelter.origin.y + c.y);
    const walls = shelter ? rel.walls.filter(c => at(c) === c.object).length : 0;
    const beds = shelter ? rel.beds.filter(c => at(c) === "floor_straw").length : 0;
    const hearth = shelter ? at(rel.hearth[0]) === P.hearthId(P.blueprint("communal_shelter")) : false;
    const dS = P.evaluateDeficits(S.area);
    check("shelter_completed_autonomously", n1 > 0 && !!shelter && shelter.state === "done" && walls === 20 && beds === 11 && hearth && !!dS && dS.shelter.current >= 1 && S.rec.assignCalls === 0 && S.rec.orders === 0 && S.rec.projectJobsDone > 0,
        shelter ? `${P.describe(shelter)} after ${n1 > 0 ? (n1 / DAY_TICKS).toFixed(2) : ">14"} days: ${walls}/20 walls and door, ${beds}/11 beds, hearth ${hearth}; ${S.rec.projectJobsDone} project jobs done, ${S.rec.assignCalls} assign calls, ${S.rec.orders} orders; jobs done ${JSON.stringify(S.rec.done)}` : `no shelter project (${JSON.stringify(P.list().map(p => p.kind + ":" + p.state))})`);
    const stockpile = projectsOf(S, "communal_stockpile").find(p => p.state === "done") || projectsOf(S, "communal_stockpile")[0] || null;
    const registered = stockpile ? P.footprint(stockpile).filter(c => W.state.colony.stockpiles.some(s => s.x === c.x && s.y === c.y && s.stores.includes("wood"))).length : 0;
    check("stockpile_built_and_registered", !!stockpile && stockpile.state === "done" && P.footprint(stockpile).every(c => objectAt(S, c.x, c.y) === "stockpile") && registered === 9 && !!dS && dS.storage.current >= dS.storage.needed,
        stockpile ? `${P.describe(stockpile)}: ${P.footprint(stockpile).filter(c => objectAt(S, c.x, c.y) === "stockpile").length}/9 cells standing, ${registered} registered; storage ${dS ? dS.storage.current : "?"}/${dS ? dS.storage.needed : "?"} slots` : "no stockpile project");
    const cache = projectsOf(S, "food_cache").find(p => p.state === "done") || projectsOf(S, "food_cache")[0] || null;
    const gathered = (S.rec.done.gather || 0);
    check("food_cache_restores_reserve", !!cache && cache.state === "done" && gathered > 0 && !!dS && dS.food.current >= 1 && dS.food.storedLb > 0 && (S.ledger.eaten > 0),
        cache ? `${P.describe(cache)}; ${gathered} gather jobs done, ${Math.round(S.ledger.eaten * 100) / 100} lb eaten so far; reserve now ${dS ? dS.food.current : "?"}/${dS ? dS.food.needed : "?"} days (carried ${dS ? dS.food.carriedLb : "?"} lb, stored ${dS ? dS.food.storedLb : "?"} lb)` : `no food cache (${JSON.stringify(P.list().map(p => p.kind + ":" + p.state))})`);
    // Every log, straw and stone since the founding is explained by a harvest or a build; every pound of food by a
    // harvest or a meal. A refused placement that ate its materials, or a job that conjured some, would show here.
    const fA = totals(S), fE = expectedTotals(S);
    check("resources_conserved_founding", groupsClose(fA, fE) && Object.keys(S.ledger.built).length > 0 && S.ledger.built.log > 0,
        `actual ${fmt(fA)} vs expected ${fmt(fE)}: start ${fmt(S.ledger.baseline)} + yields ${JSON.stringify(S.ledger.yields)} - built ${JSON.stringify(S.ledger.built)} - eaten ${Math.round(S.ledger.eaten * 1000) / 1000} lb`);
    rebase(S);

    // E. Beds: the finished shelter's eight beds cover eight founders; no bedding project opens for them.
    for (let i = 0; i < 3; i++) P.tick();
    const bedRow = P.brain().candidates.find(c => c.kind === "bedding_expansion");
    check("no_unneeded_bedding", projectsOf(S, "bedding_expansion").length === 0 && !!dS && dS.bed.current >= 8 && dS.bed.deficit === 0 && bedRow && bedRow.unmet === 0,
        `beds ${dS ? dS.bed.current : "?"}/${dS ? dS.bed.needed : "?"}, bedding candidate unmet ${bedRow ? bedRow.unmet : "?"}; bedding projects opened: ${projectsOf(S, "bedding_expansion").length}`);

    // F. Save and reload: the record is JSON-safe and identical afterwards, and the settlement carries on (meals,
    // drinks and project jobs keep being done; three days' grace covers the first night, however long it lasts).
    const beforeJson = JSON.stringify(W.state.colony.projects);
    const contents = JSON.parse(JSON.stringify(S.sandbox.DataManager.makeSaveContents()));
    S.sandbox.DataManager.extractSaveContents(contents);
    S.founders = S.founderIds.map(id => W.unit(id));
    const afterJson = JSON.stringify(W.state.colony.projects);
    const jobsDone = () => S.rec.projectJobsDone + (S.rec.done.eat || 0) + (S.rec.done.drink || 0);
    const jobsDoneBefore = jobsDone();
    const nG = drive(S, days(3), () => jobsDone() >= jobsDoneBefore + 8);
    check("save_load_roundtrip", beforeJson === afterJson && S.founders.every(Boolean) && nG > 0 && P.list().length >= 3,
        `${beforeJson.length} bytes of project state identical after the round trip; ${S.founders.filter(Boolean).length}/8 founders resolved by id; 8 more meals, drinks or project jobs done within ${nG > 0 ? (nG / DAY_TICKS).toFixed(2) : ">3"} days after the reload`);

    // G. Maintenance: two more days. At most one project in flight, a bounded job list, meals and rests go on,
    //    nothing opens but the food cache that a day's eating calls for.
    const opened0 = P.list().length;
    const samples = [];
    drive(S, days(2), () => { if (S.now() % 600 === 0) samples.push({ active: P.active().length, live: J.list(j => j.state !== "done" && j.state !== "failed").length }); return false; });
    const maxActive = samples.reduce((m, s) => Math.max(m, s.active), 0), maxLive = samples.reduce((m, s) => Math.max(m, s.live), 0);
    const openedM = P.list().slice(opened0);
    const dM = P.evaluateDeficits(S.area);
    const eatenM = S.rec.done.eat || 0, restsM = S.rec.rests.length;
    // (A food cache a day or two is the settlement's foraging rhythm: eight suppers take a colonist-day off a
    // three-day reserve, so the brain opens a cache that forages it back; never two at once.)
    check("maintenance_stable", samples.length > 0 && maxActive <= 1 && maxLive <= 40 && openedM.length <= 4 && openedM.every(p => p.kind === "food_cache") && !!dM && dM.population === 8 && dM.shelter.deficit === 0 && dM.bed.deficit === 0 && dM.storage.deficit === 0 && dM.food.current >= 1 && eatenM > 8 && restsM > 0,
        `${samples.length} samples over 2 days: at most ${maxActive} project(s) active, ${maxLive} live jobs; ${openedM.length} project(s) opened (${openedM.map(p => p.kind + ":" + p.state).join(", ") || "none"}); ${dM ? dM.population : "?"} alive, food ${dM ? dM.food.current : "?"} days, ${eatenM} meals and ${restsM} long rests so far`);

    // H. Disturbance at dusk: every scrap of food is gone at 21:00, so the foraging that follows runs into bedtime.
    //    The brain notices at once (critical), a food cache forages the reserve back over the following days.
    //    A food cache the maintenance rhythm already has in flight is the recovery vehicle (its forage phase reads
    //    the deficit afresh every advance, and the brain opens no second cache beside it); otherwise a new one opens.
    drive(S, days(1), () => S.time.hour === 21 && S.time.minute === 0);
    const wipedAt = S.clockText();
    let taken = 0;
    for (const it of I.all()) { const t = I.type(it.type); if (t && t.food) { taken += t.food.nutrition * it.count; I.remove(it.id); } }
    rebase(S);
    const dI = P.evaluateDeficits(S.area);
    const bI = P.brain();
    const foodRow = bI ? bI.candidates.find(c => c.kind === "food_cache") : null;
    const activeAtWipe = projectsOf(S, "food_cache").find(p => p.state === "active") || null;
    const cachesBefore = projectsOf(S, "food_cache").length;
    const recovered = () => (activeAtWipe && activeAtWipe.state === "done") || projectsOf(S, "food_cache").slice(cachesBefore).some(p => p.state === "done");
    const nI = drive(S, days(4), () => { const d = P.evaluateDeficits(S.area); return recovered() && d && d.food.deficit === 0; });
    const dI2 = P.evaluateDeficits(S.area);
    const newCaches = projectsOf(S, "food_cache").slice(cachesBefore);
    const noticed = activeAtWipe ? (!!foodRow && foodRow.inFlightProjects >= 1 && !foodRow.eligible) : (!!bI && !!bI.chosen && bI.chosen.kind === "food_cache" && newCaches.length >= 1);
    check("food_disturbance_recovers", taken > 0 && !!dI && dI.food.current === 0 && dI.food.critical === true && noticed && recovered() && nI > 0 && !!dI2 && dI2.food.deficit === 0 && dI2.food.current >= 3 && dI2.population === 8 && newCaches.length <= 1,
        `${Math.round(taken * 100) / 100} lb of nutrition removed at ${wipedAt} -> food ${dI ? dI.food.current : "?"} days (critical ${dI ? dI.food.critical : "?"}); ${activeAtWipe ? `cache #${activeAtWipe.id} already in flight kept foraging (${activeAtWipe.state}, brain in-flight ${foodRow ? foodRow.inFlightProjects : "?"}, no second opened: ${newCaches.length} new)` : `${newCaches.length} new food cache(s) (${newCaches.map(p => p.state).join(", ")})`}; reserve ${dI2 ? dI2.food.current : "?"} days with ${dI2 ? dI2.population : "?"} alive after ${nI > 0 ? (nI / DAY_TICKS).toFixed(2) : ">4"} days`);

    // I. Disturbance: the stockpile is lost. A new one is sited, built and registered.
    const dJ0 = P.evaluateDeficits(S.area);
    const lost = stockpile ? P.footprint(stockpile) : [];
    for (const c of lost) { O.setIn(S.area, c.x, c.y, 0); W.state.colony.stockpiles = W.state.colony.stockpiles.filter(s => !(s.x === c.x && s.y === c.y)); }
    const dJ = P.evaluateDeficits(S.area); // the larder cell still counts its eight slots
    const pilesBefore = projectsOf(S, "communal_stockpile").length;
    const nJ = drive(S, days(4), () => projectsOf(S, "communal_stockpile").slice(pilesBefore).some(p => p.state === "done"));
    const newPile = projectsOf(S, "communal_stockpile").slice(pilesBefore).find(p => p.state === "done") || null;
    const dJ2 = P.evaluateDeficits(S.area);
    const registered2 = newPile ? P.footprint(newPile).filter(c => W.state.colony.stockpiles.some(s => s.x === c.x && s.y === c.y)).length : 0;
    check("storage_disturbance_recovers", lost.length === 9 && !!dJ0 && !!dJ && dJ.storage.current === dJ0.storage.current - 9 && dJ.storage.deficit > 0 && !!newPile && nJ > 0 && registered2 === 9 && !!dJ2 && dJ2.storage.deficit === 0 && projectsOf(S, "communal_stockpile").slice(pilesBefore).length === 1,
        `${lost.length} stockpile cells removed -> storage ${dJ0 ? dJ0.storage.current : "?"} -> ${dJ ? dJ.storage.current : "?"} of ${dJ ? dJ.storage.needed : "?"} slots; ${newPile ? P.describe(newPile) : "no replacement"} after ${nJ > 0 ? (nJ / DAY_TICKS).toFixed(2) : ">4"} days, ${registered2} cells registered; storage ${dJ2 ? dJ2.storage.current : "?"} slots, one replacement project`);

    // J. Newcomers outgrow the beds by exactly two (the 6x6 shelter has 11 and every finished cottage adds its own
    //    since DEUS-TSK-FABLE-16, so as many arrive as it takes): one bedding project of capacity two lays them.
    const dJb = P.evaluateDeficits(S.area);
    const arriving = Math.max(2, dJb.bed.current - dJb.population + 2);
    const seats = Array.from({ length: arriving }, (_, i) => [-3 + (i % 7), (i < 7 ? -2 : 2)]);
    const newcomers = seats.map((s, i) => W.addUnit({ name: `Newcomer ${i + 1}`, x: SITE.x + s[0], y: SITE.y + s[1], data: { kind: "colonist", faction: "player", age: 22, gender: i % 2 ? "female" : "male", inventory: [], site: 1 } }));
    for (const u of newcomers) I.give("rations", RATIONS_EACH, u.id, { bypassLimits: true });
    rebase(S);
    const dK = P.evaluateDeficits(S.area);
    const nK = drive(S, days(4), () => projectsOf(S, "bedding_expansion").some(p => p.state === "done"));
    const bedding = projectsOf(S, "bedding_expansion");
    const laid = bedding[0] ? bedding[0].phases[0].cells.filter(c => objectAt(S, c.x, c.y) === "floor_straw").length : 0;
    const dK2 = P.evaluateDeficits(S.area);
    check("bedding_when_population_grows", !!dK && dK.population === 8 + arriving && dK.bed.deficit === 2 && bedding.length === 1 && bedding[0].capacity.bed === 2 && bedding[0].state === "done" && laid === 2 && nK > 0 && !!dK2 && dK2.bed.current >= dK.population && dK2.bed.deficit === 0,
        `population ${dK ? dK.population : "?"}, bed deficit ${dK ? dK.bed.deficit : "?"} -> ${bedding.length} bedding project(s) ${bedding[0] ? `capacity ${bedding[0].capacity.bed}, ${bedding[0].state}, ${laid} beds laid` : ""} after ${nK > 0 ? (nK / DAY_TICKS).toFixed(2) : ">4"} days; beds ${dK2 ? dK2.bed.current : "?"}/${dK2 ? dK2.bed.needed : "?"}`);

    // K. Over the whole run: suppers and bedtimes cancelled project jobs and none counted against a cell; every long
    //    rest was one night; nobody died.
    const survivalFailures = [...S.rec.survivalFailures];
    const reasons = S.rec.preempted.reduce((m, x) => Object.assign(m, { [x.reason]: (m[x.reason] || 0) + 1 }), {});
    //    (A food cache in flight at the end is the daily foraging rhythm, not an unfinished build.)
    const unfinished = P.list(p => p.state === "active" && p.kind !== "food_cache");
    const cachesLive = projectsOf(S, "food_cache").filter(p => p.state === "active").length;
    check("survival_interruptions_recovered", S.rec.preempted.length > 0 && survivalFailures.length === 0 && unfinished.length === 0 && cachesLive <= 1,
        `${S.rec.preempted.length} project jobs cancelled for survival needs (${JSON.stringify(reasons)}; e.g. ${S.rec.preempted[0] ? `${S.rec.preempted[0].type} at ${S.rec.preempted[0].at}` : "none"}), ${survivalFailures.length} counted as cell failures${survivalFailures.length ? ` (${survivalFailures[0]})` : ""}; ${P.list().length} projects, ${unfinished.length} builds still active, ${cachesLive} food cache in flight`);
    const rests = S.rec.rests.slice(0, 8);
    const longest = S.rec.rests.reduce((m, r) => Math.max(m, r.hours), 0);
    check("long_rest_one_night", rests.length > 0 && longest <= 12,
        rests.length ? `${S.rec.rests.length} long rests observed, the longest ${longest.toFixed(1)} calendar hours; the first ${rests.length}: ${rests.map(r => r.hours.toFixed(1)).join(", ")} h (e.g. ${rests[0].from} to ${rests[0].to}); the SRD long rest is 8 h` : "no long rest observed");
    check("nobody_died", S.rec.deaths.length === 0, S.rec.deaths.length ? `${S.rec.deaths.length} dead: ${S.rec.deaths.slice(0, 4).map(x => `${x.name} of ${x.cause} on ${x.at}`).join("; ")}` : `all ${W.units().filter(u => u.data && u.data.kind === "colonist" && !u.data.dead).length} colonists alive after ${(S.now() / DAY_TICKS).toFixed(1)} calendar days`);

    // L. Resource conservation since the newcomers arrived, and no console errors.
    const actual = totals(S), expected = expectedTotals(S);
    check("resources_conserved_end", groupsClose(actual, expected),
        `actual ${fmt(actual)} vs expected ${fmt(expected)} (baseline ${fmt(S.ledger.baseline)} + yields ${JSON.stringify(S.ledger.yields)} - built ${JSON.stringify(S.ledger.built)} - eaten ${Math.round(S.ledger.eaten * 1000) / 1000} lb); start of run ${fmt(startTotals)}`);
    check("no_errors", errors.length === 0, errors.length ? errors[0].slice(0, 300) : `no console errors during ${S.now()} updates (${(S.now() / DAY_TICKS).toFixed(1)} calendar days)`);
} catch (e) {
    console.error(e && e.stack || e);
    console.log(`RESULT: ${passed} passed, ${failed} failed (harness error, exit 2)`);
    process.exit(2);
}

console.log(`\nRESULT: ${passed} passed, ${failed} failed (exit ${failed === 0 ? 0 : 1})`);
process.exit(failed === 0 ? 0 : 1);
