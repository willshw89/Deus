#!/usr/bin/env node
// test_hazard_torture_live.js: the environmental and combat torture suite (DEUS-TSK-FABLE-12).
//
// Six scenes the user asked for before monsters go in, each a check that can fail: fire under a working settler
// (the hauler drops its lumber where it stands, gets off the burning square by a route and douses itself in the pond
// beside it); a fire that closes round a worker with one bent corridor out (the worker walks the corridor, never a
// burning square); a burning friend who cannot put itself out (a colonist with a water skin douses it, one beside the
// pond douses it with pond water, one with nothing smothers the flames); an armed settler struck by a wolf holds its
// ground, faces it, engages it and raises the alarm while an unarmed one runs for an armed friend; a grapple that
// breaks on a two-square displacement in every direction of grappler and victim; the idle never scan the job list every
// tick and still take a job the moment one is posted; and a flight saved mid-route comes back and finishes.
//
// The real DEUS_Objects.js, DEUS_Items.js, DEUS_Jobs.js, DEUS_Colonists.js, DEUS_Conditions.js, DEUS_Environment.js and
// DEUS_Combat.js run in a Node vm over a World double: one 64x64 ground area with a pond, a walker that paths round water
// and blocking objects (as the game's does) but not round fire (the game's pathfinder does not know fire either), and
// that ignites a unit stepping onto a burning square, as UF_Fire does. The double stands in for UF_Fire (burning squares)
// and UF_Levels (lava). DEUS_Environment's own loop burns the units (one beat per 60 updates). Nobody in this harness
// orders a colonist: the driver disturbs the world and calls Game_Map.update.
//
// Usage: node tools/test_hazard_torture_live.js [--mutant=<name>] [--quiet]
//   --mutant   patches plugins in memory; the run must then FAIL (Rule 4):
//              panics_into_fire_when_choked (a step through fire costs no more than any other: the escape goes through the flames)
//              unarmed_charges_threat (the unarmed run at the attacker instead of to a refuge)
//              ignores_burning_ally (nobody douses a burning friend)
// Exit code: 0 all checks passed, 1 a check failed, 2 harness problem.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const arg = (name, fallback) => { const a = process.argv.find(x => x.startsWith(`--${name}=`)); return a ? a.slice(name.length + 3) : fallback; };
const mutant = arg("mutant", "");
const quiet = process.argv.includes("--quiet");
const HOUR_TICKS = 600, MINUTE_TICKS = 10;

const MUTANTS = {
    panics_into_fire_when_choked: [{ file: "jobs", from: "const HAZARD_STEP_COST = 25;", to: "const HAZARD_STEP_COST = 1;" }],
    unarmed_charges_threat: [{ file: "colonists", from: "const refuge = refugeFor(u, a);", to: "const refuge = { cell: { x: a.x + 1, y: a.y }, kind: \"the foe\" };" }],
    ignores_burning_ally: [{ file: "colonists", from: "if (!J || !J.handler(\"douse_ally\")) return feedJob(u);", to: "if (true) return feedJob(u);" }]
};

const catalogText = fs.readFileSync(path.join(ROOT, "game", "data", "UF_WorldCatalog.json"), "utf8");
const read = name => fs.readFileSync(path.join(PLUGINS, name), "utf8");
const sources = { objects: read("DEUS_Objects.js"), items: read("DEUS_Items.js"), jobs: read("DEUS_Jobs.js"), colonists: read("DEUS_Colonists.js"), conditions: read("DEUS_Conditions.js"), environment: read("DEUS_Environment.js"), combat: read("DEUS_Combat.js") };
if (mutant) {
    const edits = MUTANTS[mutant];
    if (!edits) { console.error(`unknown mutant "${mutant}" (known: ${Object.keys(MUTANTS).join(", ")})`); process.exit(2); }
    for (const e of edits) {
        if (!sources[e.file].includes(e.from)) { console.error(`mutant "${mutant}": pattern not found in the ${e.file} plugin`); process.exit(2); }
        sources[e.file] = sources[e.file].replace(e.from, e.to);
    }
    console.log(`MUTANT ${mutant}: patched in memory; this run must FAIL`);
}

let passed = 0, failed = 0;
function check(name, condition, detail = "") {
    if (condition) { passed++; console.log(`PASS torture.${name}${detail ? " - " + detail : ""}`); }
    else { failed++; console.log(`FAIL torture.${name}${detail ? " - " + detail : ""}`); }
    return !!condition;
}
const errors = [];

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
// The sandbox: the real plugins over a World double whose walker paths round water and objects, and ignites on fire

function makeSandbox(seed, size, catalog) {
    const ufObjects = new Uint16Array(size * size);
    const water = new Set();
    const fire = new Set();     // "x,y" burning squares (stands in for UF_Fire)
    const lava = new Set();     // "x,y" lava (stands in for UF_Levels)
    const built = { ufObjects, data: null };
    const sandbox = {};
    const emit = (name, ...args) => sandbox.UF.Events.emit(name, ...args);
    const zOf = o => (o && o.z !== undefined ? o.z : (o && o.area && o.area.z !== undefined ? o.area.z : 0));
    const inBounds = (x, y) => x >= 0 && y >= 0 && x < size && y < size;
    const key = (x, y) => `${x},${y}`;
    let clock = 0;
    const fireSteps = [];       // every step a unit took onto a burning square: { id, x, y, at }
    const passable = (x, y) => inBounds(x, y) && !water.has(y * size + x) && !sandbox.UF.Objects.blocksIn({ x: 0, y: 0, z: 0 }, x, y);
    // The next square toward the goal by breadth-first search over passable squares (8 ways, no corner cutting), or
    // null when the goal cannot be reached. Fire is not avoided: the game's pathfinder does not know it either.
    function nextStep(u) {
        const gx = u.goal.x, gy = u.goal.y;
        if (!inBounds(gx, gy)) return null;
        const prev = new Map([[key(u.x, u.y), null]]);
        const queue = [{ x: u.x, y: u.y }];
        const dirs = [[0, -1], [-1, 0], [1, 0], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
        let found = null;
        while (queue.length && !found) {
            const c = queue.shift();
            for (const [dx, dy] of dirs) {
                const nx = c.x + dx, ny = c.y + dy, k = key(nx, ny);
                if (prev.has(k)) continue;
                const isGoal = nx === gx && ny === gy;
                if (!isGoal && !passable(nx, ny)) continue;
                if (isGoal && !inBounds(nx, ny)) continue;
                if (dx && dy && !(passable(c.x + dx, c.y) && passable(c.x, c.y + dy))) continue;
                if (isGoal && !passable(nx, ny)) continue; // an object on the goal: stand beside it is the job's business
                prev.set(k, key(c.x, c.y));
                if (isGoal) { found = k; break; }
                queue.push({ x: nx, y: ny });
            }
        }
        if (!found) return null;
        let k = found, back = prev.get(k);
        while (back && back !== key(u.x, u.y)) { k = back; back = prev.get(k); }
        const [x, y] = k.split(",").map(Number);
        return { x, y };
    }
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
            const u = { id, name: spec.name || `Unit ${id}`, image: { characterName: "", characterIndex: 0 }, area: { x: 0, y: 0 }, z: 0, x: spec.x | 0, y: spec.y | 0, dir: 2, data: spec.data || {}, goal: null };
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
        eventOf: () => null, refreshUnitImage() {}, invalidateUnitsCache() {}, isDisplayed: () => false,
        walkUnits() {
            for (const u of Object.values(W.state.units)) {
                if (!u.goal) continue;
                if (u.x === u.goal.x && u.y === u.goal.y) { u.goal = null; emit("world:unitArrived", u); continue; }
                const next = nextStep(u);
                if (!next) { u.goal = null; continue; }
                const fx = u.x, fy = u.y;
                u.x = next.x; u.y = next.y;
                if (fire.has(key(u.x, u.y))) {
                    fireSteps.push({ id: u.id, x: u.x, y: u.y, at: clock });
                    const E = sandbox.UF.Environment;
                    if (E && u.data && !u.data.burning) E.igniteUnit(u, 8, 1); // as UF_Fire ignites what stands in it
                }
                emit("world:unitMoved", u, { x: fx, y: fy }, { x: u.x, y: u.y }); // as DEUS_World.notifyMoved does
            }
        },
        water, ufObjects
    };
    class Sprite { constructor() { this.children = []; this.anchor = { set() {} }; } addChild(c) { this.children.push(c); } removeChild() {} }
    class Bitmap { constructor(w, h) { this.width = w; this.height = h; } fillRect() {} clearRect() {} drawText() {} }
    function Spriteset_Map() {}
    Spriteset_Map.prototype.createCharacters = function() {};
    function Game_Map() {}
    Game_Map.prototype.update = function() {};
    Game_Map.prototype.isPassable = () => true;
    function Scene_Boot() {}
    Scene_Boot.prototype.start = function() {};
    class Scene_Map { update() {} isActive() { return false; } }
    const errorConsole = Object.assign({}, console, {
        error: (...args) => { errors.push(args.map(a => (a && a.stack) || String(a)).join(" ")); if (!quiet) console.error(...args); },
        warn: (...args) => { if (!quiet) console.warn(...args); }
    });
    const time = {
        hour: 10, minute: 0, day: 1, monthIndex: 0, year: 1, seasonName: "spring",
        setTime(h, m) { this.hour = h | 0; this.minute = m | 0; },
        ticksPerMinute: () => MINUTE_TICKS, ticksPerHour: () => HOUR_TICKS, ticksPerDay: () => HOUR_TICKS * 24,
        ticksForHours: h => Math.round(h * HOUR_TICKS), ticksForMinutes: m => Math.round(m * MINUTE_TICKS), hoursFromTicks: t => t / HOUR_TICKS,
        advanceMinute() {
            this.minute++;
            if (this.minute >= 60) { this.minute = 0; this.hour++; emit("time:hour", this.hour); }
            if (this.hour >= 24) { this.hour = 0; this.day++; emit("time:day", this.day, "Granite", this.year); }
        }
    };
    Object.assign(sandbox, {
        console: errorConsole, performance: { now: () => Date.now() },
        Sprite, Bitmap, Spriteset_Map, Game_Map, Scene_Boot, Scene_Map, SceneManager: { _scene: null },
        Input: { keyMapper: {}, isTriggered: () => false, isPressed: () => false }, TouchInput: { x: 0, y: 0, isTriggered: () => false },
        Graphics: { frameCount: 0, boxWidth: 1280, boxHeight: 720, width: 1280, height: 720 },
        DataManager: { makeSaveContents: () => ({ ufWorld: W.state }), extractSaveContents(contents) { W.state = contents.ufWorld; } },
        Tilemap: { isWaterTile: id => id === 2048 },
        ImageManager: { loadCharacter: () => ({}), loadTileset: () => ({}), isBigCharacter: () => true },
        $gameMap: null, $dataMap: null, $gamePlayer: null, $gameMessage: { isBusy: () => false },
        $ufWorldCatalog: catalog, $deusWorldCatalog: catalog,
        $ufTime: time
    });
    sandbox.window = sandbox;
    sandbox.global = sandbox;
    sandbox.UF = {
        World: W,
        Time: { ticks: () => clock, paused: false, multiplier: () => 1, setLevel() {}, ticksPerHour: () => HOUR_TICKS, ticksPerMinute: () => MINUTE_TICKS, ticksForHours: h => Math.round(h * HOUR_TICKS) },
        Fire: { isBurning: (level, x, y) => fire.has(key(x, y)), ignite() { return false; } },
        Levels: { isFlooded: ref => (ref && lava.has(key(ref.x, ref.y)) ? { flooded: true, type: "lava" } : null) },
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
    vm.runInContext(sources.colonists, sandbox, { filename: "DEUS_Colonists.js" });
    vm.runInContext(sources.conditions, sandbox, { filename: "DEUS_Conditions.js" });
    vm.runInContext(sources.environment, sandbox, { filename: "DEUS_Environment.js" });
    let combatLoaded = true;
    try { vm.runInContext(sources.combat, sandbox, { filename: "DEUS_Combat.js" }); } catch (e) { combatLoaded = false; errors.push(`DEUS_Combat.js did not load: ${e.message}`); }
    const S = { sandbox, W, O: sandbox.UF.Objects, I: sandbox.UF.Items, J: sandbox.UF.Jobs, C: sandbox.UF.Colonists, Cond: sandbox.UF.Conditions, E: sandbox.UF.Environment, Combat: combatLoaded ? sandbox.UF.Combat : null, map: new sandbox.Game_Map(), area: { x: 0, y: 0, z: 0 }, time, fire, lava, fireSteps, combatLoaded };
    S.now = () => clock;
    S.update = () => {
        clock++;
        W._frame = clock;
        if (clock % MINUTE_TICKS === 0) time.advanceMinute();
        W.walkUnits();
        S.map.update(true);
    };
    S.failedJobs = [];
    S.createdJobs = [];
    S.alarms = [];
    sandbox.UF.Events.on("jobs:failed", job => S.failedJobs.push({ id: job.id, type: job.type, reason: job.reason, unit: job.assigned, params: Object.assign({}, job.params), at: clock }));
    sandbox.UF.Events.on("jobs:created", job => S.createdJobs.push({ id: job.id, type: job.type, owner: job.owner, params: Object.assign({}, job.params), target: job.target ? { x: job.target.x, y: job.target.y } : null, at: clock }));
    sandbox.UF.Events.on("colonists:alarm", (by, attacker, told) => S.alarms.push({ by: by.id, attacker: attacker.id, told, at: clock }));
    return S;
}

//-----------------------------------------------------------------------------
// The camp: hearth, ring, founders, a pond, logs in the open; projects off (the driver posts the work it needs)

const SIZE = 64, SITE = { x: 32, y: 32 }, RADIUS = 4;
const POND = { x0: 44, y0: 30, x1: 46, y1: 34 };
function makeCamp(seed) {
    const catalog = JSON.parse(catalogText);
    catalog.colony.projects = Object.assign({}, catalog.colony.projects, { blueprints: { communal_shelter: null, food_cache: null, communal_stockpile: null, bedding_expansion: null } });
    // Harness-only content: lumber that weighs something (5 lb a log: a stack of five is a real load, under the
    // encumbrance line), and a water skin for the ally scene (no such item is in the catalog yet).
    const log = catalog.items.types.find(t => t.id === "log");
    if (log) log.weight = 5;
    catalog.items.types.push({ id: "TEST_waterskin", name: "TEST water skin", image: "!$UF_Icon_265", tags: ["container", "water"], liquid: "water", stack: 1, weight: 5 });
    const S = makeSandbox(seed, SIZE, catalog);
    const { W, O, I, area } = S;
    for (let y = POND.y0; y <= POND.y1; y++) for (let x = POND.x0; x <= POND.x1; x++) W.water.add(y * SIZE + x);
    O.setIn(area, SITE.x, SITE.y, "campfire");
    for (let dy = -RADIUS; dy <= RADIUS; dy++) for (let dx = -RADIUS; dx <= RADIUS; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== RADIUS || dx === 0) continue;
        O.setIn(area, SITE.x + dx, SITE.y + dy, "wall_wood");
    }
    W.state.colony = { version: 2, factionId: "player", siteId: 1, site: { x: SITE.x, y: SITE.y }, area: { x: 0, y: 0 }, z: 0, radius: RADIUS,
        plan: JSON.parse(JSON.stringify(catalog.colony.plan)).map(s => Object.assign(s, { done: false })), stockpiles: [], log: [] };
    const seats = [[-1, -3], [1, -3], [-3, 0], [3, 0], [-1, 3], [1, 3], [0, -1], [0, 1]];
    S.founders = seats.map((s, i) => W.addUnit({ name: `Founder ${i + 1}`, x: SITE.x + s[0], y: SITE.y + s[1], data: { kind: "colonist", faction: "player", founder: true, age: 25, gender: i % 2 ? "female" : "male", inventory: [], hp: 10, maxHp: 10, stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } } }));
    for (const u of S.founders) { I.give("rations", 3, u.id, { bypassLimits: true }); const n = S.C.needsOf(u); if (n) { n.foodLb = 1; n.waterGal = 1; } }
    S.spawn = (name, x, y, extra = {}) => W.addUnit({ name, x, y, data: Object.assign({ kind: "creature", faction: "wild", inventory: [], hp: 10, maxHp: 10, stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, combat: { mode: "manual" } }, extra) });
    // A founder that takes no part: a dependant decides nothing and is pulled off nothing.
    S.bench = (...units) => { for (const u of units) { const j = S.J.of(u.id); if (j) S.J.cancel(j.id, "test bench"); u.data.age = 10; } };
    // Only these founders take part; the rest are benched, and these are idle, untrottled and back to working age.
    S.only = (...keep) => { for (const u of S.founders) { if (keep.includes(u)) { u.data.age = 25; S.reset(u); if (S.C._internal.preemptAt) S.C._internal.preemptAt.delete(u.id); } else S.bench(u); } };
    S.reset = u => { const j = S.J.of(u.id); if (j) S.J.cancel(j.id, "test reset"); u.goal = null; };
    return S;
}
function drive(S, updates, until) {
    for (let i = 0; i < updates; i++) { S.update(); if (until && until()) return i + 1; }
    return until ? -1 : updates;
}
const burning = (S, x, y) => S.fire.has(`${x},${y}`);
const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const jobOf = (S, u) => S.J.of(u.id);
const walk = (u, x, y) => { u.x = x; u.y = y; u.goal = null; };
const stepsInFire = (S, u, since = 0) => S.fireSteps.filter(s => s.id === u.id && s.at >= since);
const groundCount = (S, x, y, type) => S.I.atIn(S.area, x, y).filter(it => it.type === type).reduce((n, it) => n + (it.count || 1), 0);
const carried = (S, u, type) => S.I.inventoryOf(u.id).filter(it => it.type === type).reduce((n, it) => n + (it.count || 1), 0);

//-----------------------------------------------------------------------------
// Checks

console.log("=== Environmental and combat torture (DEUS_Colonists.js, DEUS_Jobs.js) headless checks ===");
try {
    const S = makeCamp(20260924);
    const { W, O, I, J, C, E } = S;
    drive(S, 2);
    const probe = J.safeCellNear(S.founders[0], 4);
    check("plugins_load", typeof J.fireNear === "function" && typeof J.carriesWater === "function" && typeof J.isAflame === "function" && !!J.handler("douse_ally") && !!J.handler("extinguish") &&
        typeof C.assess === "function" && typeof C.raiseAlarm === "function" && typeof C.refugeFor === "function" && typeof C.douseJob === "function" && C._internal.lastIdleScan && typeof C._internal.lastIdleScan.get === "function" && C._internal.IDLE_SCAN_INTERVAL === 60 &&
        (probe === null || Array.isArray(probe.route)) && !!E && S.combatLoaded && !!S.Cond,
        `Jobs fireNear/carriesWater/isAflame + douse + extinguish, safeCellNear with a route; Colonists assess/raiseAlarm/refugeFor/douseJob, idle scan interval ${C._internal.IDLE_SCAN_INTERVAL}; Environment, Conditions and Combat loaded`);

    // 1. Fire under a working settler: a hauler carrying five logs steps onto a burning band beside the pond. The haul
    //    is lost at once and the logs lie where it stood; the hauler leaves the square by a route for a safe square
    //    beside the water, douses itself there, and is out of the fire and of the flames.
    {
        const H = S.founders[0];
        S.bench(...S.founders.slice(1));
        S.reset(H);
        walk(H, 47, 40);
        I.drop(S.area, 47, 36, "log", 5);
        const stack = I.atIn(S.area, 47, 36).find(it => it.type === "log");
        const haul = J.create({ type: "haul", target: { area: { x: 0, y: 0 }, x: 47, y: 36, z: 0 }, params: { itemId: stack.id, count: 5, to: { area: { x: 0, y: 0 }, x: 47, y: 20, z: 0 } }, owner: H.id });
        const nCarry = drive(S, 200, () => carried(S, H, "log") === 5);
        const load = I.encumbrance(H.id);
        // The band across its way north, beside the pond (x 44..46, y 30..34): it steps onto (47,33).
        for (let x = 44; x <= 50; x++) S.fire.add(`${x},33`);
        const t0 = S.now();
        const nFail = drive(S, 200, () => haul.state === "failed");
        const at = { x: H.x, y: H.y };
        const logsAtFeet = groundCount(S, at.x, at.y, "log"), stillCarried = carried(S, H, "log");
        const aflameAt = E.isBurning(H);
        const nFlee = drive(S, 60, () => { const j = jobOf(S, H); return !!j && j.params && j.params.reflex === "hazard"; });
        const flee = jobOf(S, H);
        const fleeRec = flee ? { x: flee.target.x, y: flee.target.y, route: flee.params.route ? flee.params.route.length : 0 } : null;
        const nDouse = drive(S, 300, () => { const j = jobOf(S, H); return !!j && j.type === "extinguish"; });
        const douse = jobOf(S, H);
        const method = douse ? douse.params.method : null;
        const nOut = drive(S, 400, () => !E.isBurning(H) && !J.inLethalHazard(H));
        const nCalm = drive(S, 300, () => !J.fireNear(S.area, H.x, H.y) && !J.inLethalHazard(H));
        const fireStepsAfter = stepsInFire(S, H, t0).filter(s => !(s.x === at.x && s.y === at.y)).length;
        check("fire_under_hauler_drops_load_and_douses", nCarry > 0 && load.status === "unencumbered" && nFail > 0 && haul.reason === "emergency: lethal hazard" && at.y === 33 && burning(S, at.x, at.y) &&
            logsAtFeet === 5 && stillCarried === 0 && aflameAt && nFlee > 0 && !!fleeRec && !burning(S, fleeRec.x, fleeRec.y) && fleeRec.route >= 1 && J.isWaterAt(S.area, fleeRec.x - 1, fleeRec.y) &&
            nDouse > 0 && method === "water" && nOut > 0 && !E.isBurning(H) && H.data.hp > 0 && nCalm > 0 && fireStepsAfter === 0,
            `${H.name} carried 5 logs (${load.currentWeight} lb, ${load.status}); on the burning square (${at.x},${at.y}) the haul went ${haul.state} "${haul.reason}" after ${nFail} updates, ${logsAtFeet} logs at its feet, ${stillCarried} carried, aflame ${aflameAt}; ` +
            `reflex ${fleeRec ? `to (${fleeRec.x},${fleeRec.y}) by a ${fleeRec.route}-square route, water beside it ${J.isWaterAt(S.area, fleeRec.x - 1, fleeRec.y)}` : "none"} after ${nFlee}; then ${method || "no extinguish"} after ${nDouse}; out and off the fire after ${nOut}, calm after ${nCalm}, hit points ${H.data.hp}/${H.data.maxHp}, later steps into fire ${fireStepsAfter}`);
        S.fire.clear();
    }

    // 2. A fire closes round a worker: every square within two burns but a bent corridor (north, then west). The chop
    //    is dropped for the fire beside the worker, the route runs the corridor to a calm square, and no step lands in
    //    fire. The straight way to the nearest calm square (north through two burning squares) is shorter.
    const choke = (S2, W2, ox, oy) => {
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { if (dx || dy) S2.fire.add(`${ox + dx},${oy + dy}`); }
        for (const [x, y] of [[ox, oy - 1], [ox - 1, oy - 1], [ox - 2, oy - 1]]) S2.fire.delete(`${x},${y}`); // the corridor: (20,49) (19,49) (18,49)
    };
    {
        const S2 = makeCamp(20260925);
        const W2 = S2.founders[1];
        S2.bench(...S2.founders.filter(u => u !== W2));
        S2.reset(W2);
        walk(W2, 20, 50);
        S2.O.setIn(S2.area, 21, 50, "oak");
        const chop = S2.J.create({ type: "chop", target: { area: { x: 0, y: 0 }, x: 21, y: 50, z: 0 }, owner: W2.id });
        const nWork = drive(S2, 60, () => chop.state === "work");
        choke(S2, W2, 20, 50);
        const t0 = S2.now();
        const assessed = S2.C.assess(W2);
        const nCut = drive(S2, 120, () => chop.state === "failed");
        const nFlee = drive(S2, 60, () => { const j = jobOf(S2, W2); return !!j && j.params && j.params.reflex === "hazard"; });
        const flee = jobOf(S2, W2);
        const route = flee && flee.params.route ? flee.params.route.map(c => `(${c.x},${c.y})`).join(" ") : "";
        const nArrive = flee ? drive(S2, 200, () => flee.state === "done" || flee.state === "failed") : -1;
        const end = { x: W2.x, y: W2.y };
        const inFire = stepsInFire(S2, W2, t0);
        check("choked_escape_uses_corridor", nWork > 0 && assessed.priority === 2 && assessed.detail === "fire nearby" && nCut > 0 && (chop.reason === "emergency: fire nearby" || chop.reason === "fire at the work site") && nFlee > 0 && !!flee && flee.params.route && flee.params.route.length >= 5 &&
            nArrive > 0 && flee.state === "done" && inFire.length === 0 && !S2.E.isBurning(W2) && !S2.J.fireNear(S2.area, end.x, end.y) && !S2.J.inLethalHazard(W2) && !burning(S2, end.x, end.y),
            `${W2.name} at work at (20,50) with fire all round but a corridor: assess ${assessed.priority} (${assessed.detail}); chop ${chop.state} "${chop.reason}" after ${nCut}; route [${route}] taken after ${nFlee}, ${flee ? flee.state : "no flight"} after ${nArrive} at (${end.x},${end.y}); steps into fire ${inFire.length}${inFire.length ? ` (${inFire.map(s => `(${s.x},${s.y})`).join(" ")})` : ""}, aflame ${S2.E.isBurning(W2)}`);
        S2.fire.clear();
    }

    // 3. A burning friend who cannot put itself out (paralyzed, UF.Conditions): a colonist at work with a water skin
    //    drops the work for it and douses it with the skin; one beside the pond douses with pond water; one with no
    //    water smothers the flames. Each friend is alive and out well before the flames would have killed it.
    {
        const S3 = makeCamp(20260926);
        const [B, R, Cc, R2, D, R3] = S3.founders;
        const burnDown = u => { S3.Cond.add(u, "paralyzed", { source: "test" }); S3.E.igniteUnit(u, 40, 1); };
        // (a) the water carrier at work six squares away (nobody else takes part in each scene: the intended rescuer is the test)
        S3.only(B, R);
        walk(B, 20, 40); walk(R, 26, 40);
        S3.I.give("TEST_waterskin", 1, R.id, { bypassLimits: true });
        S3.O.setIn(S3.area, 27, 41, "oak");
        const chop = S3.J.create({ type: "chop", target: { area: { x: 0, y: 0 }, x: 27, y: 41, z: 0 }, owner: R.id });
        drive(S3, 40, () => chop.state === "work");
        burnDown(B);
        const canAct = S3.Cond.canAct(B), assessedR = S3.C.assess(R), assessedB = S3.C.assess(B);
        const nCut = drive(S3, 120, () => chop.state === "failed");
        const nDouse = drive(S3, 60, () => { const j = jobOf(S3, R); return !!j && j.type === "douse_ally"; });
        const douseA = jobOf(S3, R);
        const nOutA = drive(S3, 400, () => !S3.E.isBurning(B));
        const doneA = douseA ? S3.J.get(douseA.id) : null;
        // (b) beside the pond, the rescuer carries nothing (the water carrier sits this one out)
        S3.only(Cc, R2);
        walk(Cc, 43, 32); walk(R2, 38, 32);
        burnDown(Cc);
        const nDouseB = drive(S3, 120, () => { const j = jobOf(S3, R2); return !!j && j.type === "douse_ally"; });
        const douseB = jobOf(S3, R2);
        const nOutB = drive(S3, 400, () => !S3.E.isBurning(Cc));
        // (c) nothing to douse with: smother
        S3.only(D, R3);
        walk(D, 20, 20); walk(R3, 24, 20);
        burnDown(D);
        const nDouseC = drive(S3, 120, () => { const j = jobOf(S3, R3); return !!j && j.type === "douse_ally"; });
        const douseC = jobOf(S3, R3);
        const nOutC = drive(S3, 500, () => !S3.E.isBurning(D));
        const alive = [B, Cc, D].every(u => !u.data.dead && S3.W.unit(u.id) && u.data.hp > 0);
        check("burning_ally_doused_by_water_carrier", !canAct && assessedB.priority === 1 && assessedR.priority === 4 && assessedR.detail === "douse" && nCut > 0 && chop.reason === "emergency: aid" && nDouse > 0 && !!douseA && douseA.params.unitId === B.id && douseA.params.method === "water" &&
            nOutA > 0 && !!doneA && doneA.state === "done" && doneA.result && doneA.result.extinguished && doneA.result.method === "water" && !S3.E.isBurning(B) && B.data.hp > 0 && S3.J.carriesWater(R),
            `${B.name} paralyzed (can act ${canAct}, assess ${assessedB.priority}) and aflame; ${R.name} (assess ${assessedR.priority} ${assessedR.detail}) lost its chop "${chop.reason}" after ${nCut}, took ${douseA ? `douse #${douseA.id} (${douseA.params.method})` : "nothing"} after ${nDouse}; ${B.name} out after ${nOutA} (${doneA ? doneA.state : "?"}), hit points ${B.data.hp}`);
        check("burning_ally_doused_from_pond_or_smothered", nDouseB > 0 && !!douseB && douseB.params.unitId === Cc.id && douseB.params.method === "water" && nOutB > 0 && !S3.E.isBurning(Cc) &&
            nDouseC > 0 && !!douseC && douseC.params.unitId === D.id && douseC.params.method === "smother" && nOutC > 0 && !S3.E.isBurning(D) && alive,
            `beside the pond: ${R2.name} took ${douseB ? `douse (${douseB.params.method})` : "nothing"} after ${nDouseB}, ${Cc.name} out after ${nOutB}; no water: ${R3.name} took ${douseC ? `douse (${douseC.params.method})` : "nothing"} after ${nDouseC}, ${D.name} out after ${nOutC}; all three alive ${alive} (hit points ${B.data.hp}/${Cc.data.hp}/${D.data.hp})`);
    }

    // 4. Struck by a wolf: the armed settler at work drops the work, holds its ground, faces the wolf, engages it
    //    (UF_Combat) and raises the alarm; an armed friend alarmed at a distance stands to it; the unarmed one struck
    //    runs for the armed friend, never at the wolf.
    {
        const S4 = makeCamp(20260927);
        const [A, U, G, ...rest] = S4.founders;
        S4.bench(...rest);
        for (const u of [A, U, G]) S4.reset(u);
        const wolf = S4.spawn("Wolf", 30, 45, { tags: ["hostile"], kind: "creature", hp: 200, maxHp: 200 });
        walk(A, 31, 45); walk(U, 30, 47); walk(G, 36, 40);
        for (const u of [A, G]) { const club = S4.I.give("club", 1, u.id, { bypassLimits: true })[0]; S4.I.equip(u.id, club.id, "mainHand"); }
        S4.O.setIn(S4.area, 32, 45, "oak");
        const chop = S4.J.create({ type: "chop", target: { area: { x: 0, y: 0 }, x: 32, y: 45, z: 0 }, owner: A.id });
        const nWork = drive(S4, 60, () => chop.state === "work");
        const dU0 = cheb(U, wolf);
        let gAtRun = null; // where the armed friend stood when the runner chose its refuge (it may take a step before the sweep stops it)
        S4.sandbox.UF.Events.on("jobs:created", j => { if (!gAtRun && j.owner === U.id && j.params && j.params.reflex === "threat") gAtRun = { x: G.x, y: G.y }; });
        S4.sandbox.UF.Events.emit("combat:hit", { attacker: wolf, target: A, damage: 1, hit: true });
        S4.sandbox.UF.Events.emit("combat:hit", { attacker: wolf, target: U, damage: 1, hit: true });
        const assessA = S4.C.assess(A), assessU = S4.C.assess(U);
        const nCut = drive(S4, 120, () => chop.state === "failed");
        const nHold = drive(S4, 60, () => A.data.combat && A.data.combat.targetId === wolf.id);
        const holdRec = { dir: A.dir, target: A.data.combat ? A.data.combat.targetId : null, job: jobOf(S4, A) ? jobOf(S4, A).type : null, alarm: S4.W.state.colony.alarm ? S4.W.state.colony.alarm.attackerId : null, told: S4.alarms.length ? S4.alarms[0].told : 0 };
        const gThreat = G.data.threat ? { alarm: !!G.data.threat.alarm, attackerId: G.data.threat.attackerId } : null;
        const assessG = S4.C.assess(G);
        // The alarmed friend drops whatever idle business it had at the next sweep and stands where it is from then on.
        const nGHold = drive(S4, 60, () => jobOf(S4, G) === null && !G.goal);
        const gAt = { x: G.x, y: G.y };
        const nRun = drive(S4, 60, () => { const j = jobOf(S4, U); return !!j && j.params && j.params.reflex === "threat"; });
        const run = jobOf(S4, U);
        const runRec = run ? { x: run.target.x, y: run.target.y, refuge: run.params.refuge, fromWolf: cheb(run.target, wolf), toG: cheb(run.target, gAtRun || G) } : null;
        const nAway = drive(S4, 200, () => cheb(U, wolf) > dU0 + 2);
        const gStill = nGHold > 0 && jobOf(S4, G) === null && G.x === gAt.x && G.y === gAt.y;
        check("armed_holds_and_alarms_unarmed_runs_to_friend", nWork > 0 && assessA.priority === 3 && assessA.detail === "holds ground" && nCut > 0 && chop.reason === "emergency: threat" && nHold > 0 && holdRec.target === wolf.id && holdRec.dir === 4 && holdRec.job === null &&
            holdRec.alarm === wolf.id && holdRec.told >= 2 && !!gThreat && gThreat.alarm && gThreat.attackerId === wolf.id && assessG.priority === 3 && assessG.detail === "holds ground" && gStill &&
            assessU.priority === 3 && assessU.detail === "runs" && nRun > 0 && !!runRec && runRec.refuge === "an armed friend" && runRec.toG <= 2 && runRec.fromWolf > dU0 && nAway > 0 && cheb(U, wolf) > dU0,
            `${A.name} (club) at work beside the wolf: assess ${assessA.priority} ${assessA.detail}; chop ${chop.state} "${chop.reason}" after ${nCut}; facing ${holdRec.dir} (4 = west, the wolf), engaged ${holdRec.target === wolf.id}, job ${holdRec.job}; alarm on ${holdRec.alarm === wolf.id ? "the wolf" : holdRec.alarm} told ${holdRec.told}; ` +
            `${G.name} (club, 6 away) ${gThreat ? `alarmed, assess ${assessG.priority} ${assessG.detail}, ${gStill ? `standing at (${gAt.x},${gAt.y}) since` : `not standing: job ${jobOf(S4, G) ? jobOf(S4, G).type : "none"}, at (${G.x},${G.y}) vs (${gAt.x},${gAt.y})`}` : "not alarmed"}; ${U.name} (unarmed, ${dU0} from the wolf): assess ${assessU.priority} ${assessU.detail}, ${runRec ? `ran for ${runRec.refuge} to (${runRec.x},${runRec.y}) ${runRec.toG} from ${G.name}, ${runRec.fromWolf} from the wolf` : "did not run"}, now ${cheb(U, wolf)} away after ${nAway}`);
    }

    // 5. A grapple breaks on a two-square displacement whichever way the grappler steps and whichever way the victim
    //    is shoved, and holds at one square (no Conditions.tick anywhere in this harness).
    {
        const S5 = makeCamp(20260928);
        const G = S5.founders[0], V = S5.founders[1];
        S5.bench(...S5.founders);
        const dirs = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
        const shove = (u, dx, dy) => { const from = { x: u.x, y: u.y }; u.x += dx; u.y += dy; S5.sandbox.UF.Events.emit("world:unitMoved", u, from, { x: u.x, y: u.y }); };
        const mismatches = [];
        let releases = 0, holds = 0;
        for (const who of ["grappler", "victim"]) {
            for (const [sx, sy] of dirs) {           // where the grappler stands, beside the victim
                for (const [dx, dy] of dirs) {       // the way the mover steps, twice
                    walk(V, 20, 20); walk(G, 20 + sx, 20 + sy);
                    S5.Cond.clear(V, "grappled"); delete G.data.grappling;
                    S5.Cond.add(V, "grappled", { source: "hold", sourceUnitId: G.id });
                    if (!S5.Cond.has(V, "grappled")) { mismatches.push(`${who} ${sx},${sy} step ${dx},${dy}: not grappled at the start`); continue; }
                    for (let step = 1; step <= 2; step++) {
                        shove(who === "grappler" ? G : V, dx, dy);
                        const expectHeld = cheb(G, V) <= 1, held = S5.Cond.has(V, "grappled");
                        if (held !== expectHeld) mismatches.push(`${who} at ${sx},${sy} stepping ${dx},${dy} x${step}: distance ${cheb(G, V)}, ${held ? "still held" : "released"}`);
                        else if (held) holds++; else releases++;
                    }
                }
            }
        }
        check("grapple_breaks_on_two_square_displacement_all_directions", mismatches.length === 0 && releases > 0 && holds > 0,
            `128 grappler-and-victim runs of two steps in eight directions from eight sides: ${holds} held at one square, ${releases} released beyond, ${mismatches.length} wrong${mismatches.length ? ` (${mismatches.slice(0, 3).join("; ")})` : ""}`);
    }

    // 6. Idle founders never scan the job list every tick: with nothing to do, the open list is read a bounded number
    //    of times in 300 updates; a job posted is still taken within two sweeps.
    {
        const S6 = makeCamp(20260929);
        drive(S6, 30);
        const realOpen = S6.J.open;
        let openCalls = 0;
        S6.J.open = function(...args) { openCalls++; return realOpen.apply(this, args); };
        drive(S6, 300);
        const idleCalls = openCalls;
        S6.O.setIn(S6.area, 20, 20, "oak");
        const chop = S6.J.create({ type: "chop", target: { area: { x: 0, y: 0 }, x: 20, y: 20, z: 0 } });
        const nTake = drive(S6, 61, () => chop.assigned !== null && chop.assigned !== undefined && chop.state !== "open");
        S6.J.open = realOpen;
        check("idle_scan_bounded_and_wakes_on_post", idleCalls > 0 && idleCalls <= 6 && nTake > 0,
            `${idleCalls} UF.Jobs.open() calls in 300 updates with 8 idle founders and no open job (10 sweeps; an empty list is looked at once per ${S6.C._internal.IDLE_SCAN_INTERVAL} ticks for the whole colony); a chop posted was taken after ${nTake} update(s)`);
    }

    // 7. A flight saved mid-route (the corridor scene again) comes back with its route and finishes without a step in fire.
    {
        const S7 = makeCamp(20260930);
        const W7 = S7.founders[2];
        S7.bench(...S7.founders.filter(u => u !== W7));
        S7.reset(W7);
        walk(W7, 20, 50);
        choke(S7, W7, 20, 50);
        const t0 = S7.now();
        const nFlee = drive(S7, 90, () => { const j = jobOf(S7, W7); return !!j && j.params && j.params.reflex === "hazard" && (j.params.routeIndex | 0) >= 1; });
        const job1 = jobOf(S7, W7);
        const before = JSON.stringify(S7.W.state), unitsBefore = JSON.stringify(S7.W.state.units);
        const clean = !before.includes("undefined") && !before.includes("Infinity") && !before.includes("NaN");
        const contents = JSON.parse(JSON.stringify(S7.sandbox.DataManager.makeSaveContents()));
        S7.sandbox.DataManager.extractSaveContents(contents);
        const unitsSame = JSON.stringify(S7.W.state.units) === unitsBefore;
        const W7b = S7.W.unit(W7.id), job2 = W7b ? jobOf(S7, W7b) : null;
        const routeKept = !!job1 && !!job2 && job2.id === job1.id && JSON.stringify(job2.params.route) === JSON.stringify(job1.params.route) && job2.params.routeIndex === job1.params.routeIndex;
        const nDone = job2 ? drive(S7, 200, () => job2.state === "done" || job2.state === "failed") : -1;
        const inFire = stepsInFire(S7, W7b || W7, t0);
        check("save_load_mid_route_flight_finishes", nFlee > 0 && clean && unitsSame && routeKept && nDone > 0 && job2.state === "done" && inFire.length === 0 && !!W7b && !S7.J.fireNear(S7.area, W7b.x, W7b.y) && !S7.E.isBurning(W7b),
            `saved ${nFlee} updates in, at waypoint ${job1 ? job1.params.routeIndex : "?"} of ${job1 && job1.params.route ? job1.params.route.length : "?"} (${before.length} bytes, JSON-clean ${clean}); units identical after the round trip ${unitsSame}, route identical ${routeKept}; ${job2 ? job2.state : "no job"} after ${nDone} at (${W7b ? W7b.x : "?"},${W7b ? W7b.y : "?"}), steps into fire ${inFire.length}`);
        S7.fire.clear();
    }

    check("no_errors", errors.length === 0, errors.length ? errors[0].slice(0, 300) : "no console errors in any scene");
} catch (e) {
    console.error(e && e.stack || e);
    console.log(`RESULT: ${passed} passed, ${failed} failed (harness error, exit 2)`);
    process.exit(2);
}

console.log(`\nRESULT: ${passed} passed, ${failed} failed (exit ${failed === 0 ? 0 : 1})`);
process.exit(failed === 0 ? 0 : 1);
