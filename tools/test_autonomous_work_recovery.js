"use strict";
// tools/test_autonomous_work_recovery.js - Headless checks for DEUS-TSK-FABLE-09: project work heals itself.
// A haul whose stack is eaten or carried off mid-transit, a build job whose materials vanish from its square, a
// forage target picked by somebody else, a tree nobody can stand beside, a square another structure now occupies,
// a larder that refuses deliveries, a material nothing within reach yields, and a square that stays blocked for
// days: each is withdrawn or reported cleanly, never counted against a square that is not at fault, never left
// as an orphan job or a reservation, and never allowed to hold the colonists' dispatch. Idle strolls yield to
// posted project work (UF_Colonists' own preemption, checked from this side).
//
// Runs the real DEUS_Objects.js, DEUS_Items.js, DEUS_Jobs.js, DEUS_Projects.js and DEUS_Colonists.js in a Node vm
// against a World double (one 64x64 ground area with a pond); the calendar runs at DEUS_Core's rate (600 updates an
// hour). The driver only calls Game_Map.update and disturbs the world between updates; it never assigns or orders.
//
// Usage: node tools/test_autonomous_work_recovery.js [--mutant=<name>] [--quiet]
//   --mutant   patches a plugin in memory; the run must then FAIL (Rule 4):
//              no_withdrawal (stale jobs stay open), count_world_failures (a vanished item counts against the square),
//              no_give_up (a blocked project never gives up), no_wake_idle (idle strolls are not called to posted work)
// Exit code: 0 all checks passed, 1 a check failed, 2 harness problem.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const arg = (name, fallback) => { const a = process.argv.find(x => x.startsWith(`--${name}=`)); return a ? a.slice(name.length + 3) : fallback; };
const mutant = arg("mutant", "");
const quiet = process.argv.includes("--quiet");
const HOUR_TICKS = 600, MINUTE_TICKS = 10, DAY_TICKS = HOUR_TICKS * 24;
const SEED = 20260924;

const MUTANTS = {
    no_withdrawal: { file: "projects", from: "const why = staleReason(p, job, retryKey ? cells.get(retryKey) || null : null);", to: "const why = null;" },
    count_world_failures: { file: "projects", from: "if (cellFault(job)) {", to: "if (job && job.state === \"failed\" && !preempted(job)) {" },
    no_give_up: { file: "projects", from: "if ((cfg.giveUpTicks | 0) > 0 && now() - p.blockedSince.tick >= (cfg.giveUpTicks | 0)) {", to: "if (false) {" },
    no_wake_idle: { file: "projects", from: "for (const u of idle.slice(0, untaken)) {", to: "for (const u of idle.slice(0, 0)) {" }
};

const catalogText = fs.readFileSync(path.join(ROOT, "game", "data", "UF_WorldCatalog.json"), "utf8");
const read = name => fs.readFileSync(path.join(PLUGINS, name), "utf8");
const sources = { objects: read("DEUS_Objects.js"), items: read("DEUS_Items.js"), jobs: read("DEUS_Jobs.js"), projects: read("DEUS_Projects.js"), colonists: read("DEUS_Colonists.js") };
if (mutant) {
    const m = MUTANTS[mutant];
    if (!m) { console.error(`unknown mutant "${mutant}" (known: ${Object.keys(MUTANTS).join(", ")})`); process.exit(2); }
    if (!sources[m.file].includes(m.from)) { console.error(`mutant "${mutant}": pattern not found in the ${m.file} plugin`); process.exit(2); }
    sources[m.file] = sources[m.file].replace(m.from, m.to);
    console.log(`MUTANT ${mutant}: ${m.file} plugin patched in memory; this run must FAIL`);
}

let passed = 0, failed = 0;
function check(name, condition, detail = "") {
    if (condition) { passed++; console.log(`PASS recovery.${name}${detail ? " - " + detail : ""}`); }
    else { failed++; console.log(`FAIL recovery.${name}${detail ? " - " + detail : ""}`); }
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
// The sandbox: the real plugins over a World double with a running calendar

function makeSandbox(seed, size, catalog, walkEvery) {
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
            if (clock % walkEvery !== 0) return;
            for (const u of Object.values(W.state.units)) {
                if (!u.goal) continue;
                if (u.x === u.goal.x && u.y === u.goal.y) { u.goal = null; emit("world:unitArrived", u); continue; }
                // A straight step when the way is dry; else a breadth-first path round water and blocking objects,
                // as the game's pathfinder finds (DEUS-TSK-FABLE-13: the straight-only walker stranded colonists
                // on the far side of the pond, and their claimed beds were then out of reach every night).
                const sx = u.x + Math.sign(u.goal.x - u.x), sy = u.y + Math.sign(u.goal.y - u.y);
                let next = water.has(sy * size + sx) ? null : { x: sx, y: sy };
                if (!next) next = (function() {
                    const key = (x, y) => x + "," + y;
                    const passable = (x, y) => inBounds(x, y) && !water.has(y * size + x) && !sandbox.UF.Objects.blocksIn({ x: 0, y: 0, z: 0 }, x, y);
                    const gx = u.goal.x, gy = u.goal.y;
                    if (!inBounds(gx, gy)) return null;
                    const prev = new Map([[key(u.x, u.y), null]]);
                    const queue = [{ x: u.x, y: u.y }];
                    const dirs = [[0, -1], [-1, 0], [1, 0], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
                    let found = null, steps = 0;
                    while (queue.length && !found && steps++ < 1500) {
                        const c = queue.shift();
                        for (const [dx, dy] of dirs) {
                            const nx = c.x + dx, ny = c.y + dy, k = key(nx, ny);
                            if (prev.has(k)) continue;
                            const isGoal = nx === gx && ny === gy;
                            if (!isGoal && !passable(nx, ny)) continue;
                            if (isGoal && (!inBounds(nx, ny) || water.has(ny * size + nx))) continue;
                            if (dx && dy && !(passable(c.x + dx, c.y) && passable(c.x, c.y + dy))) continue;
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
                })();
                if (!next) { u.goal = null; continue; }
                u.x = next.x; u.y = next.y;
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
    const time = {
        hour: 6, minute: 0, day: 1, monthIndex: 0, year: 1, seasonName: "spring",
        setTime(h, m) { this.hour = Math.max(0, Math.min(23, h | 0)); this.minute = Math.max(0, Math.min(59, m | 0)); },
        ticksPerMinute: () => MINUTE_TICKS, ticksPerHour: () => HOUR_TICKS, ticksPerDay: () => DAY_TICKS,
        ticksForHours: h => Math.round(h * HOUR_TICKS), ticksForMinutes: m => Math.round(m * MINUTE_TICKS), hoursFromTicks: t => t / HOUR_TICKS,
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
        Time: { ticks: () => clock, paused: false, multiplier: () => 1, setLevel() {}, ticksPerHour: () => HOUR_TICKS, ticksPerMinute: () => MINUTE_TICKS, ticksForHours: h => Math.round(h * HOUR_TICKS) },
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
// The camp: hearth, ring, founders with rations, materials, trees, grass, wild food, one or two larders

const SIZE = 64, SITE = { x: 32, y: 32 }, RADIUS = 4, LARDER_A = { x: 37, y: 32 }, LARDER_B = { x: 27, y: 32 };
const FAST = { cadenceTicks: 600, startDelayTicks: 30, retryTicks: 600, staleTicks: 120, giveUpTicks: 6000, perShelter: 12 };
const SHELTER_ONLY = { blueprints: { food_cache: null, communal_stockpile: null, bedding_expansion: null } };
const FOOD_ONLY = { blueprints: { communal_shelter: null, communal_stockpile: null, bedding_expansion: null }, targetReserveDays: 3, reserveMarginDays: 0.5 };
function makeCamp(seed, opts = {}) {
    const catalog = JSON.parse(catalogText);
    catalog.colony.projects = Object.assign({}, catalog.colony.projects, FAST, opts.config || {});
    const S = makeSandbox(seed, SIZE, catalog, opts.walkEvery || 1);
    const { W, O, I, area } = S;
    for (let y = 30; y <= 34; y++) for (let x = 44; x <= 46; x++) W.water.add(y * SIZE + x);
    O.setIn(area, SITE.x, SITE.y, "campfire");
    for (let dy = -RADIUS; dy <= RADIUS; dy++) for (let dx = -RADIUS; dx <= RADIUS; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== RADIUS || dx === 0) continue;
        O.setIn(area, SITE.x + dx, SITE.y + dy, "wall_wood");
    }
    if (opts.door) O.setIn(area, SITE.x, SITE.y - RADIUS, "door_wood");
    const bedCells = [[-2, -1], [2, -1], [-2, 1], [2, 1], [-1, -2], [1, -2], [-1, 2], [1, 2]];
    for (const [dx, dy] of bedCells.slice(0, opts.beds || 0)) O.setIn(area, SITE.x + dx, SITE.y + dy, "floor_straw");
    W.state.colony = { version: 2, factionId: "player", siteId: 1, site: { x: SITE.x, y: SITE.y }, area: { x: 0, y: 0 }, z: 0, radius: RADIUS,
        plan: JSON.parse(JSON.stringify(catalog.colony.plan)).map(s => Object.assign(s, { done: false })), stockpiles: [], log: [] };
    O.setIn(area, LARDER_A.x, LARDER_A.y, "stockpile");
    W.state.colony.stockpiles.push({ x: LARDER_A.x, y: LARDER_A.y, stores: ["food"], step: "larder" });
    if (opts.larderB) { O.setIn(area, LARDER_B.x, LARDER_B.y, "stockpile"); W.state.colony.stockpiles.push({ x: LARDER_B.x, y: LARDER_B.y, stores: ["food"] }); }
    for (let i = 0; i < (opts.stockpileCells || 0); i++) { const x = SITE.x - 5, y = SITE.y - 3 + i; O.setIn(area, x, y, "stockpile"); W.state.colony.stockpiles.push({ x, y, stores: ["wood", "stone", "material"] }); }
    I.drop(area, SITE.x, 8, "log", 40);
    I.drop(area, 8, SITE.x, "stone", 20);
    if (opts.straw !== false) I.drop(area, SITE.x, 9, "straw", 30);
    for (const [x, y] of [[12, 12], [52, 12], [12, 52], [52, 52], [20, 50], [50, 20]]) O.setIn(area, x, y, "oak");
    if (opts.grass !== false) for (let i = 0; i < 10; i++) O.setIn(area, 40 + i, 44, "grass_tuft");
    const rng = mulberry32(hash32(seed, 0xf00d));
    const busy = (x, y) => W.water.has(y * SIZE + x) || !!O.atIn(area, x, y) || I.atIn(area, x, y).length > 0 || (y >= 7 && y <= 10 && Math.abs(x - SITE.x) <= 1) || (x >= 7 && x <= 9 && Math.abs(y - SITE.y) <= 1);
    const wild = { fruit_tree: 0, berry_bush: 0 };
    let tries = 0;
    while ((wild.fruit_tree < 30 || wild.berry_bush < 20) && tries++ < 20000) {
        const x = 3 + Math.floor(rng() * (SIZE - 6)), y = 3 + Math.floor(rng() * (SIZE - 6));
        const d = Math.max(Math.abs(x - SITE.x), Math.abs(y - SITE.y));
        if (d < 10 || d > 28 || busy(x, y)) continue;
        const id = wild.fruit_tree < 30 && (wild.berry_bush >= 20 || rng() < 0.6) ? "fruit_tree" : "berry_bush";
        O.setIn(area, x, y, id);
        wild[id]++;
    }
    const seats = [[-1, -3], [1, -3], [-3, 0], [3, 0], [-1, 3], [1, 3], [0, -1], [0, 1]];
    S.founders = seats.map((s, i) => W.addUnit({ x: SITE.x + s[0], y: SITE.y + s[1], data: { kind: "colonist", faction: "player", founder: true, age: 25, gender: i % 2 ? "female" : "male", inventory: [], site: 1 } }));
    for (const u of S.founders) I.give("rations", opts.rations === undefined ? 3 : opts.rations, u.id, { bypassLimits: true });
    S.founderIds = S.founders.map(u => u.id);
    S.wild = wild;
    S.assignCalls = 0;
    const assign = S.J.assign;
    S.J.assign = function(...a) { S.assignCalls++; return assign.apply(this, a); };
    S.failedJobs = [];
    S.sandbox.UF.Events.on("jobs:failed", job => S.failedJobs.push({ id: job.id, type: job.type, reason: job.reason, project: job.params && job.params.project, target: job.target ? { x: job.target.x, y: job.target.y } : null }));
    if (opts.enabled === false) S.P.setEnabled(false);
    return S;
}
function drive(S, updates, until) {
    for (let i = 0; i < updates; i++) { S.update(); if (until && until()) return i + 1; }
    return until ? -1 : updates;
}
const days = n => Math.round(n * DAY_TICKS);
const finished = j => !j || j.state === "done" || j.state === "failed";
const objectAt = (S, x, y) => { const t = S.O.atIn(S.area, x, y); return t ? t.id : null; };
const projectJobs = (S, p) => S.J.list(j => j.params && j.params.project === p.id);
const liveProjectJobs = (S, p) => projectJobs(S, p).filter(j => !finished(j));
const wallCells = (S, p) => S.P._internal.relativeCells(S.P.blueprint("communal_shelter")).walls.map(c => ({ x: p.origin.x + c.x, y: p.origin.y + c.y, object: c.object }));
const reservationKeys = S => Array.from(S.J.reservation._reservations.entries()).map(([k, v]) => ({ key: k, unitId: v.unitId }));
/** Reservation entries that belong to nobody's live assigned job: leaks. */
function leakedReservations(S) {
    return reservationKeys(S).filter(r => { const j = S.J.of(r.unitId); return !j || finished(j); });
}
/** Opens the shelter through the brain and drives to its walls phase. */
function shelterToWalls(S, budget = days(1)) {
    S.P.tick();
    const p = S.P.active().find(q => q.kind === "communal_shelter") || null;
    if (!p) return { p: null, n: -1 };
    const n = drive(S, budget, () => p.phase >= 1 || p.state !== "active");
    return { p, n };
}
const lowPriority = j => !!j && j.params && !!(j.params.stroll || j.params.explore || j.params.contemplate || j.params.inspect || j.params.idleSocial || j.params.fireGather);

//-----------------------------------------------------------------------------
// Checks

console.log("=== Autonomous work recovery (DEUS_Projects.js) headless checks ===");
try {
    // A. Plugins and the recovery API.
    const A = makeCamp(SEED, { config: SHELTER_ONLY });
    check("plugins_load", typeof A.P._internal.staleReason === "function" && typeof A.P._internal.cellFault === "function" && typeof A.P._internal.refusedAt === "function" && A.P.config().giveUpTicks === 6000 && A.P.config().staleTicks === 120,
        `Projects with staleReason/cellFault/refusedAt; fast config: cadence ${A.P.config().cadenceTicks}, stale ${A.P.config().staleTicks}, retry ${A.P.config().retryTicks}, give up ${A.P.config().giveUpTicks} ticks`);

    // B. A haul's stack vanishes in transit (eaten, carried off): the haul fails with the world's reason, nothing
    //    counts against the wall it was bound for, another stack is hauled, and the walls go up.
    {
        const { p, n } = shelterToWalls(A);
        let vanished = 0, reasons = {};
        for (let round = 0; round < 3 && p && p.state === "active"; round++) {
            let job = null;
            drive(A, days(0.5), () => { job = A.J.list(j => j.type === "haul" && j.params.project === p.id && j.assigned && !finished(j) && (j.phase | 0) === 0)[0] || null; return !!job; });
            if (!job) break;
            A.I.remove(job.params.itemId);
            drive(A, 2000, () => finished(A.J.get(job.id)));
            const after = A.J.get(job.id);
            if (after && after.state === "failed") { vanished++; reasons[after.reason] = (reasons[after.reason] || 0) + 1; }
        }
        const nB = p ? drive(A, days(1.5), () => p.phase >= 2 || p.state !== "active") : -1;
        const walls = p ? wallCells(A, p).filter(c => objectAt(A, c.x, c.y) === c.object).length : 0;
        check("haul_stack_vanishes_in_transit", !!p && n > 0 && vanished === 3 && reasons["the item is gone"] === 3 && Object.keys(p.failed).length === 0 && nB > 0 && p.phase >= 2 && walls === 20 && A.assignCalls === 0,
            p ? `${vanished} hauls lost their stack on the way (${JSON.stringify(reasons)}); squares with a failure count: ${Object.keys(p.failed).length}; walls ${walls}/20 after ${nB > 0 ? (nB / HOUR_TICKS).toFixed(1) : ">36"} h; ${A.assignCalls} assign calls` : "no shelter project");
    }

    // C. An open build job's materials vanish from its square: the job is withdrawn (stale: the materials are gone)
    //    and the logs are hauled again; without withdrawal the square would wait forever for a job that claims it.
    {
        const Cx = makeCamp(SEED + 1, { config: SHELTER_ONLY });
        const { p, n } = shelterToWalls(Cx);
        let job = null, key = null;
        drive(Cx, days(0.5), () => { for (const k of Object.keys(p.jobs)) { const j = Cx.J.get(p.jobs[k]); if (j && j.type === "build" && j.state === "open" && !j.assigned) { job = j; key = k; return true; } } return false; });
        const [cx, cy] = key ? key.split(",").map(Number) : [null, null];
        const removed = job ? Cx.I.atIn(Cx.area, cx, cy).filter(it => it.type === "log").map(it => { Cx.I.remove(it.id); return it.count; }).reduce((a, b) => a + b, 0) : 0;
        const nC = job ? drive(Cx, 2000, () => finished(Cx.J.get(job.id))) : -1;
        const after = job ? Cx.J.get(job.id) : null;
        const rehauled = job ? drive(Cx, days(0.5), () => Object.keys(p.hauls).some(id => p.hauls[id].cell === key) || objectAt(Cx, cx, cy) === "wall_wood") : -1;
        const nDone = drive(Cx, days(1.5), () => p.phase >= 2 || p.state !== "active");
        check("open_build_materials_vanish", !!job && removed > 0 && nC > 0 && !!after && after.state === "failed" && after.reason === "stale: the materials are gone" && rehauled > 0 && nDone > 0 && p.phase >= 2 && objectAt(Cx, cx, cy) === "wall_wood" && !p.failed[key],
            job ? `build at (${cx},${cy}) lost ${removed} logs -> ${after ? after.state : "?"} (${after ? after.reason : "?"}) after ${nC} updates; logs hauled again ${rehauled > 0 ? "yes" : "no"}; wall standing ${objectAt(Cx, cx, cy) === "wall_wood"}; phase ${p.phase}` : "no open build job found");
    }

    // D. A forage target picked by somebody else before the gatherer arrives, and a tree nobody can stand beside.
    {
        const D = makeCamp(SEED + 2, { config: FOOD_ONLY, door: true, beds: 8, stockpileCells: 8, rations: 1 });
        // Wall a fruit tree in with oaks: no square beside it to stand on.
        const target = D.O.findIn(D.area, { near: SITE, radius: 28, id: "fruit_tree" })[0];
        const ring = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
        for (const [dx, dy] of ring) if (!D.O.atIn(D.area, target.x + dx, target.y + dy)) D.O.setIn(D.area, target.x + dx, target.y + dy, "oak");
        D.P.tick();
        const p = D.P.active().find(q => q.kind === "food_cache") || null;
        let job = null;
        if (p) drive(D, days(0.5), () => { job = D.J.list(j => j.type === "gather" && j.params.project === p.id && j.assigned && !finished(j) && (j.phase | 0) === 0 && !(j.target.x === target.x && j.target.y === target.y))[0] || null; return !!job; });
        const picked = job ? D.O.atIn(D.area, job.target.x, job.target.y) : null;
        if (job) D.O.setIn(D.area, job.target.x, job.target.y, picked && picked.id === "fruit_tree" ? "fruit_tree_bare" : "berry_bush_bare");
        const nD = job ? drive(D, 2000, () => finished(D.J.get(job.id))) : -1;
        const after = job ? D.J.get(job.id) : null;
        const pickedKey = job ? `${job.target.x},${job.target.y}` : null;
        // The walled-in tree: posted, found undoable by everyone, withdrawn after staleTicks and not chosen again for retryTicks.
        const wallKey = `${target.x},${target.y}`;
        const nW = p ? drive(D, days(0.5), () => !!p.failed[wallKey] && String(p.failed[wallKey].reason).startsWith("stale: can't reach")) : -1;
        const wallRecord = p && p.failed[wallKey] ? JSON.parse(JSON.stringify(p.failed[wallKey])) : null; // cleared once the project finishes
        const withdrawn = D.failedJobs.filter(f => f.project === (p && p.id) && f.target && f.target.x === target.x && f.target.y === target.y && f.reason === "stale: can't reach it").length;
        const nE = p ? drive(D, days(3.5), () => p.state !== "active") : -1;
        const dD = D.P.evaluateDeficits(D.area);
        // (UF_Jobs finishes a gather on a picked plant as done with nothing to show; either way the slot is free again.)
        check("forage_target_gone_or_unreachable", !!p && !!job && !!after && finished(after) && !p.failed[pickedKey] && nW > 0 && withdrawn >= 1 && !!wallRecord && wallRecord.retryAt > 0 && nE > 0 && p.state === "done" && !!dD && dD.food.deficit === 0 && D.assignCalls === 0,
            p ? `gather at ${pickedKey} found its plant picked -> ${after ? `${after.state} (${after.reason})` : "?"} after ${nD} updates, no failure count on that square; walled-in tree at ${wallKey}: ${withdrawn} withdrawal(s) (one per retryTicks), failure record ${wallRecord ? JSON.stringify(wallRecord) : "none"}; cache ${p.state}, reserve ${dD ? dD.food.current : "?"} days` : "no food cache opened");
    }

    // E. A wall square another structure now occupies: reported as blocked with the reason, the other squares are
    //    built meanwhile, the phase waits; once the square is clear the shelter is finished.
    {
        const E = makeCamp(SEED + 3, { config: SHELTER_ONLY });
        const { p, n } = shelterToWalls(E);
        const cell = p ? wallCells(E, p).find(c => c.object === "wall_wood" && objectAt(E, c.x, c.y) === null) : null;
        if (cell) E.O.setIn(E.area, cell.x, cell.y, "floor_straw");
        const nE = p ? drive(E, days(1), () => wallCells(E, p).filter(c => objectAt(E, c.x, c.y) === c.object).length >= 15 && p.blocked && /in the way/.test(p.blocked.reason)) : -1;
        const built = p ? wallCells(E, p).filter(c => objectAt(E, c.x, c.y) === c.object).length : 0;
        const text = p ? E.P.describe(p) : "";
        const paused = p ? drive(E, days(0.25), () => !!p.blockedSince) : -1;
        const stillWalls = p && p.phase === 1;
        if (cell) E.O.setIn(E.area, cell.x, cell.y, 0);
        const nF = p ? drive(E, days(1.5), () => p.state !== "active") : -1;
        check("blocked_square_reported_then_finished", !!cell && nE > 0 && built === 15 && /in the way/.test(text) && stillWalls && paused > 0 && nF > 0 && p.state === "done" && objectAt(E, cell.x, cell.y) === "wall_wood",
            cell ? `straw floor put on (${cell.x},${cell.y}): ${built}/16 wall squares built around it, phase stayed walls, "${text}"; paused after ${paused} more updates; cleared -> ${p.state} after ${nF > 0 ? (nF / HOUR_TICKS).toFixed(1) : ">36"} h` : "no free wall square");
        // Timers on the record are action-domain stamps.
        const stamps = [];
        const walk = (v, path) => { if (!v || typeof v !== "object") return; if (typeof v.tick === "number" && "domain" in v) stamps.push({ path, domain: v.domain }); for (const k of Object.keys(v)) if (k !== "log") walk(v[k], `${path}.${k}`); };
        if (p) walk(p, "project");
        check("timers_tagged_action", stamps.length >= 3 && stamps.every(s => s.domain === "action"),
            `${stamps.length} tagged stamps on the record (${stamps.map(s => s.path.replace("project.", "")).join(", ")}), all domain "action"`);
    }

    // F. The larder refuses deliveries (a full stockpile): the square is noted, the next hauls go to the other
    //    larder, food arrives there, and the cache still finishes.
    {
        const F = makeCamp(SEED + 4, { config: FOOD_ONLY, door: true, beds: 8, stockpileCells: 8, larderB: true, rations: 1 });
        const putDown = F.I.putDown;
        F.I.putDown = function(itemId, area, x, y) { if (x === LARDER_A.x && y === LARDER_A.y) return null; return putDown.call(this, itemId, area, x, y); };
        F.P.tick();
        const p = F.P.active().find(q => q.kind === "food_cache") || null;
        const keyA = `${LARDER_A.x},${LARDER_A.y}`;
        const nR = p ? drive(F, days(1), () => !!(p.refused && p.refused[keyA])) : -1;
        const refusedRecord = p && p.refused ? p.refused[keyA] : null;
        const atB = () => F.I.atIn(F.area, LARDER_B.x, LARDER_B.y).filter(it => { const t = F.I.type(it.type); return t && t.food; }).reduce((n, it) => n + it.count, 0);
        const toB = p ? drive(F, days(1), () => F.J.list(j => j.type === "haul" && j.params.project === p.id && j.params.to && j.params.to.x === LARDER_B.x && j.params.to.y === LARDER_B.y).length > 0 && atB() > 0) : -1;
        const foodAtB = atB();
        const toAAfter = p ? F.J.list(j => j.type === "haul" && j.params.project === p.id && j.params.to && j.params.to.x === LARDER_A.x && j.params.to.y === LARDER_A.y && j.params.postedAt > (refusedRecord ? refusedRecord.since.tick : Infinity) && j.params.postedAt < (refusedRecord ? refusedRecord.until.tick : 0)).length : -1;
        const logged = p ? p.log.some(l => /delivery refused/.test(l.text)) : false;
        // Once the refusal expires and the larder takes deliveries again, it is offered them again.
        F.I.putDown = putDown;
        const retried = p && refusedRecord ? drive(F, days(1), () => F.J.list(j => j.type === "haul" && j.params.project === p.id && j.params.to && j.params.to.x === LARDER_A.x && j.params.to.y === LARDER_A.y && j.params.postedAt >= refusedRecord.until.tick).length > 0 || p.state !== "active") : -1;
        const toAAgain = p && refusedRecord ? F.J.list(j => j.type === "haul" && j.params.project === p.id && j.params.to && j.params.to.x === LARDER_A.x && j.params.to.y === LARDER_A.y && j.params.postedAt >= refusedRecord.until.tick).length : 0;
        check("refused_delivery_reroutes", !!p && nR > 0 && !!refusedRecord && refusedRecord.until.domain === "action" && toB > 0 && toAAfter === 0 && foodAtB > 0 && logged && retried > 0 && (toAAgain > 0 || p.state === "done"),
            p ? `larder A refused -> record ${refusedRecord ? JSON.stringify({ count: refusedRecord.count, until: refusedRecord.until.tick }) : "none"} after ${nR} updates; ${toAAfter} hauls to A while refused, hauls to B ${toB > 0 ? "yes" : "no"}, ${foodAtB} food items at B; after the refusal expired: ${toAAgain} hauls to A again, cache ${p.state}` : "no food cache opened");
    }

    // G. Idle strolls yield to posted project work (UF_Colonists' preemption "work: preempt idle"), leaving no
    //    orphan job and no reservation behind.
    {
        const G = makeCamp(SEED + 5, { config: SHELTER_ONLY, enabled: false, walkEvery: 6 });
        drive(G, 400);
        const idle = G.founders.filter(u => lowPriority(G.J.of(u.id))).length;
        G.P.setEnabled(true);
        G.P.tick();
        const p = G.P.active().find(q => q.kind === "communal_shelter") || null;
        const called = () => G.failedJobs.filter(f => f.reason === "work: project posted" || f.reason === "work: preempt idle");
        const nG = p ? drive(G, 600, () => called().length >= 1 && G.founders.filter(u => { const j = G.J.of(u.id); return j && j.params && j.params.project === p.id; }).length >= 3) : -1;
        const reasons = called().reduce((m, f) => Object.assign(m, { [f.reason]: (m[f.reason] || 0) + 1 }), {});
        const onProject = G.founders.filter(u => { const j = G.J.of(u.id); return j && j.params && j.params.project === p.id; }).length;
        const leaks = leakedReservations(G);
        const orphans = G.J.list(j => lowPriority(j) && !finished(j) && !G.founders.some(u => G.J.of(u.id) === j)).length;
        check("idle_stroll_preempted_by_project_work", idle >= 3 && !!p && nG > 0 && called().length >= 1 && onProject >= 3 && leaks.length === 0 && orphans === 0 && G.assignCalls === 0,
            `${idle}/8 founders idling before the project; after it opened: ${called().length} idle job(s) cancelled (${JSON.stringify(reasons)}), ${onProject} founders on project jobs within ${nG} updates; ${leaks.length} leaked reservations, ${orphans} orphan idle jobs`);
    }

    // H. A material nothing within reach yields: the beds phase pauses with the reason, colonists still take other
    //    work, and straw dropped later resumes and finishes the shelter.
    {
        const H = makeCamp(SEED + 6, { config: SHELTER_ONLY, straw: false, grass: false });
        H.P.tick();
        const p = H.P.active().find(q => q.kind === "communal_shelter") || null;
        const nH = p ? drive(H, days(2), () => p.phase === 3 && !!p.blockedSince) : -1;
        const reason = p && p.blocked ? p.blocked.reason : "";
        const text = p ? H.P.describe(p) : "";
        const oak = H.O.findIn(H.area, { near: SITE, radius: 40, id: "oak" })[0];
        const chop = oak ? H.J.create({ type: "chop", target: { x: oak.x, y: oak.y } }) : null;
        const nChop = chop ? drive(H, 3000, () => finished(H.J.get(chop.id))) : -1;
        const chopDone = chop ? H.J.get(chop.id).state === "done" : false;
        const stillPaused = p && !!p.blockedSince && p.state === "active";
        H.I.drop(H.area, SITE.x, 9, "straw", 30);
        const nBeds = p ? drive(H, days(1.5), () => p.state !== "active") : -1;
        const resumed = p ? p.log.some(l => l.text === "resumed") : false;
        check("missing_material_pauses_then_resumes", !!p && nH > 0 && reason === "no straw within reach" && /paused since tick/.test(text) && chopDone && stillPaused && nBeds > 0 && p.state === "done" && resumed,
            p ? `beds phase paused: "${reason}" (${text}); a player designation was still done meanwhile (chop ${chopDone ? "done" : "not done"} in ${nChop} updates); straw dropped -> ${resumed ? "resumed" : "no resume"} -> ${p.state} after ${nBeds > 0 ? (nBeds / HOUR_TICKS).toFixed(1) : ">36"} h` : "no shelter project");
    }

    // I. A square that stays blocked: after giveUpTicks the project gives up with the reason, its kind cools, and
    //    no job or reservation of it remains.
    {
        const Ix = makeCamp(SEED + 7, { config: SHELTER_ONLY });
        const { p } = shelterToWalls(Ix);
        const cell = p ? wallCells(Ix, p).find(c => c.object === "wall_wood" && objectAt(Ix, c.x, c.y) === null) : null;
        if (cell) Ix.O.setIn(Ix.area, cell.x, cell.y, "floor_straw");
        const nI = p ? drive(Ix, days(2), () => p.state !== "active") : -1;
        const cooled = Ix.P.brain().candidates.find(c => c.kind === "communal_shelter");
        const live = p ? liveProjectJobs(Ix, p).length : -1;
        const cells = p ? new Set(Ix.P.footprint(p).map(c => `cell:0,0,0:${c.x},${c.y}`)) : new Set();
        const held = reservationKeys(Ix).filter(r => cells.has(r.key)).length;
        check("permanently_blocked_project_gives_up", !!cell && nI > 0 && p.state === "cancelled" && /^gave up: /.test(p.reason) && /in the way/.test(p.reason) && !!cooled && cooled.cooled && live === 0 && held === 0 && leakedReservations(Ix).length === 0,
            p ? `${Ix.P.describe(p)} after ${nI > 0 ? (nI / HOUR_TICKS).toFixed(1) : ">48"} h; shelter kind cooled ${cooled ? cooled.cooled : "?"}; ${live} live jobs, ${held} reservations on its squares, ${leakedReservations(Ix).length} leaked` : "no shelter project");
        const stranded = Ix.P.list().filter(q => q.state === "active" && q.blockedSince && Ix.now() - q.blockedSince.tick > 6000).length;
        check("nothing_stranded", stranded === 0 && Ix.P.list().every(q => q.state !== "active" ? liveProjectJobs(Ix, q).length === 0 : true),
            `${stranded} active projects blocked past giveUpTicks; every finished project has 0 live jobs`);
    }

    // J. Determinism: the blocked-square scenario twice from the same seed gives the same record.
    {
        const run = () => {
            const X = makeCamp(SEED + 8, { config: SHELTER_ONLY });
            const { p } = shelterToWalls(X);
            const cell = p ? wallCells(X, p).find(c => c.object === "wall_wood" && objectAt(X, c.x, c.y) === null) : null;
            if (cell) X.O.setIn(X.area, cell.x, cell.y, "floor_straw");
            drive(X, days(0.5));
            return JSON.stringify(X.P.list());
        };
        const one = run(), two = run();
        check("deterministic", one === two && one.length > 100, `${one.length} bytes of project record, identical on the second run`);
    }

    check("no_errors", errors.length === 0, errors.length ? errors[0].slice(0, 300) : "no console errors during the run");
} catch (e) {
    console.error(e && e.stack || e);
    console.log(`RESULT: ${passed} passed, ${failed} failed (harness error, exit 2)`);
    process.exit(2);
}

console.log(`\nRESULT: ${passed} passed, ${failed} failed (exit ${failed === 0 ? 0 : 1})`);
process.exit(failed === 0 ? 0 : 1);
