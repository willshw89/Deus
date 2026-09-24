"use strict";
// tools/test_settlement_expansion_multi_dwelling.js - Headless integration checks for DEUS-TSK-FABLE-13: a colony
// that grows past its first shelter expands the settlement on its own. Eight founders raise Shelter #1 and Stockpile
// #1; four newcomers arrive (twelve colonists); the brain reads a second shelter, four beds and more storage as unmet;
// Shelter #2 is sited apart from everything standing, its parcel is cleared (a tree felled) and the felled logs are
// hauled to the stockpile before a wall goes up; Shelter #2 and Stockpile #2 are finished; nothing overlaps and every
// door opens onto free ground; no job ever pulls material out of a standing building; the founders keep the beds they
// hold while the newcomers claim Shelter #2's; everyone survives, sleeps in a bed of their own and eats.
//
// Runs the real DEUS_Objects.js, DEUS_Items.js, DEUS_Jobs.js, DEUS_Projects.js and DEUS_Colonists.js in a Node vm
// against a World double (one 64x64 ground area with a pond) and the real catalog, with the calendar advancing a minute
// every ten updates (600 an hour, 14,400 a day), so meals, bedtimes and long rests happen. Nobody in this harness
// orders a colonist: the driver only calls Game_Map.update, adds the newcomers and plants one tree.
//
// Usage: node tools/test_settlement_expansion_multi_dwelling.js [--mutant=<name>] [--quiet] [--seed=N] [--hourTicks=N]
//   --mutant   patches a plugin in memory; the run must then FAIL (Rule 4):
//              overlapping_footprint_allowed (siting ignores standing buildings: a footprint may cover Shelter #1)
//              cannibalizes_existing_building (walls count as a wood source: Shelter #1 and the camp ring get chopped)
//              bed_allocation_displaces_founders (a newcomer may claim a bed a founder holds)
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
const SEED = (parseInt(arg("seed", "20260924"), 10) >>> 0) || 20260924;

const MUTANTS = {
    overlapping_footprint_allowed: { file: "projects", from: "if (isConstructed(here)) return false;", to: "if (false) return false;" },
    cannibalizes_existing_building: { file: "projects", from: "if (!t || !t.actions || isConstructed(t)) continue;", to: "if (!t || !t.actions) continue;" },
    bed_allocation_displaces_founders: { file: "colonists", from: "if (holder !== undefined && holder !== u.id) continue; // held by a living colonist: never displaced", to: "if (false) continue;" }
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
    if (condition) { passed++; console.log(`PASS expansion.${name}${detail ? " - " + detail : ""}`); }
    else { failed++; console.log(`FAIL expansion.${name}${detail ? " - " + detail : ""}`); }
    return !!condition;
}
const note = text => { if (!quiet) console.log(`  ${text}`); };
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
// The sandbox: the real plugins over a World double with the calendar running

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
            const u = { id, name: spec.name || "", image: spec.image || { characterName: "", characterIndex: 0 }, area: { x: 0, y: 0 }, z: 0, x: spec.x | 0, y: spec.y | 0, dir: 2, data: spec.data || {}, goal: null };
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
                // A straight step when the way is dry; else a breadth-first path round water and blocking objects,
                // as the game's pathfinder finds (a straight-only walker strands colonists on the far side of the pond).
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
                const fx = u.x, fy = u.y;
                u.x = next.x; u.y = next.y;
                emit("world:unitMoved", u, { x: fx, y: fy }, { x: u.x, y: u.y });
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
// The settlement: hearth, camp ring, a larder, founders with rations, materials, trees, grass and wild food

const SIZE = 64, SITE = { x: 32, y: 32 }, RADIUS = 4, LARDER = { x: 37, y: 32 };
const RATIONS_EACH = 4;
const CONSTRUCTED = ["building", "wall", "door", "bed", "stockpile"];
function makeSettlement(seed) {
    const catalog = JSON.parse(catalogText);
    // This harness proves communal expansion (a second shelter and stockpile for newcomers). The cottage blueprint
    // (DEUS-TSK-FABLE-16) is off: these unpaired founders would each get a cottage and leave the shelter beds the
    // checks below follow; the village's housing is proven by tools/test_settlement_domestic_housing.js.
    catalog.colony.projects = Object.assign({}, catalog.colony.projects, { blueprints: { household_cottage: null } });
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
    // Materials: logs for one shelter and a little over (16 of wall and door, 3 of hearth), so the second shelter must
    // fell oaks for the rest (a felled oak yields three logs; standing walls must never count as a source); stone for
    // both hearths; straw for both shelters' beds (16 each); grass tufts yield fiber (a straw stands in).
    I.drop(area, SITE.x, 8, "log", 24);
    I.drop(area, 8, SITE.x, "stone", 20);
    I.drop(area, SITE.x, 9, "straw", 40);
    for (const [x, y] of [[12, 12], [52, 12], [12, 52], [52, 52], [20, 50], [50, 20], [10, 30], [54, 40]]) O.setIn(area, x, y, "oak");
    for (let i = 0; i < 14; i++) O.setIn(area, 40 + i, 46, "grass_tuft");
    // Wild food between 10 and 28 cells from the hearth on free dry ground (the seeded generator places it).
    const rng = mulberry32(hash32(seed, 0xf00d));
    const busy = (x, y) => W.water.has(y * SIZE + x) || !!O.atIn(area, x, y) || I.atIn(area, x, y).length > 0 || (y >= 7 && y <= 10 && Math.abs(x - SITE.x) <= 1) || (x >= 7 && x <= 9 && Math.abs(y - SITE.y) <= 1);
    const wild = { fruit_tree: 0, berry_bush: 0 };
    let tries = 0;
    while ((wild.fruit_tree < 80 || wild.berry_bush < 60) && tries++ < 40000) {
        const x = 3 + Math.floor(rng() * (SIZE - 6)), y = 3 + Math.floor(rng() * (SIZE - 6));
        const d = Math.max(Math.abs(x - SITE.x), Math.abs(y - SITE.y));
        if (d < 10 || d > 28 || busy(x, y)) continue;
        const id = wild.fruit_tree < 80 && (wild.berry_bush >= 60 || rng() < 0.6) ? "fruit_tree" : "berry_bush";
        O.setIn(area, x, y, id);
        wild[id]++;
    }
    const seats = [[-1, -3], [1, -3], [-3, 0], [3, 0], [-1, 3], [1, 3], [0, -1], [0, 1]];
    S.founders = seats.map((s, i) => W.addUnit({ name: `Founder ${i + 1}`, x: SITE.x + s[0], y: SITE.y + s[1], data: { kind: "colonist", faction: "player", founder: true, age: 25 + i, gender: i % 2 ? "female" : "male", inventory: [], site: 1 } }));
    for (const u of S.founders) I.give("rations", RATIONS_EACH, u.id, { bypassLimits: true });
    S.founderIds = S.founders.map(u => u.id);
    S.wild = wild;
    S.time.setTime(8, 0);
    return S;
}

//-----------------------------------------------------------------------------
// Instruments: jobs and what they targeted, phases, sleeps, deaths, the materials ledger

function instrument(S) {
    const { J, I, O } = S;
    const rec = { assignCalls: 0, orders: 0, done: {}, deaths: [], created: [], phases: [], sleeps: [], violations: [], tidyHauls: [] };
    S.sandbox.UF.Events.on("colonists:died", (u, cause) => rec.deaths.push({ name: u.name, cause, at: S.clockText() }));
    const assign = J.assign;
    J.assign = function(...args) { rec.assignCalls++; return assign.apply(this, args); };
    if (S.C && typeof S.C.order === "function") { const order = S.C.order; S.C.order = function(...args) { rec.orders++; return order.apply(this, args); }; }
    const seenAt = new Map();
    S.sandbox.UF.Events.on("jobs:created", job => {
        const t = job.target ? O.atIn(S.area, job.target.x, job.target.y) : null;
        const r = { id: job.id, type: job.type, x: job.target ? job.target.x : null, y: job.target ? job.target.y : null, object: t ? t.id : null, project: job.params ? job.params.project : null, tidy: !!(job.params && job.params.tidy), at: S.clockText(), tick: S.now() };
        rec.created.push(r);
        if (["chop", "mine", "quarry", "dismantle", "gather", "pick"].includes(job.type) && t && CONSTRUCTED.some(tag => Array.isArray(t.tags) && t.tags.includes(tag))) rec.violations.push(r);
        if (r.tidy) rec.tidyHauls.push(Object.assign(r, { to: job.params.to ? { x: job.params.to.x, y: job.params.to.y } : null, itemId: job.params.itemId, state: "open" }));
    });
    S.sandbox.UF.Events.on("jobs:assigned", job => {
        const t = job.target ? O.atIn(S.area, job.target.x, job.target.y) : null;
        const item = job.params && job.params.itemId ? I.get(job.params.itemId) : null;
        seenAt.set(job.id, { object: t ? t.id : null, itemType: item ? item.type : null });
    });
    S.sandbox.UF.Events.on("projects:phase", p => rec.phases.push({ id: p.id, kind: p.kind, phase: p.phase, at: S.clockText(), tick: S.now(), loose: looseOnFootprint(S, p) }));
    const ledger = { yields: {}, built: {}, eaten: 0, baseline: null };
    const add = (m, k, n) => { m[k] = (m[k] || 0) + n; };
    S.sandbox.UF.Events.on("jobs:done", (job, u) => {
        rec.done[job.type] = (rec.done[job.type] || 0) + 1;
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
        } else if (job.type === "sleep" && u) {
            rec.sleeps.push({ unit: u.id, x: job.target.x, y: job.target.y, longRest: !!(job.params && job.params.longRest), at: S.clockText(), tick: S.now() });
        }
        const tidy = rec.tidyHauls.find(h => h.id === job.id);
        if (tidy) tidy.state = "done";
        seenAt.delete(job.id);
    });
    S.sandbox.UF.Events.on("jobs:failed", job => { const tidy = rec.tidyHauls.find(h => h.id === job.id); if (tidy) tidy.state = `failed: ${job.reason}`; seenAt.delete(job.id); });
    S.rec = rec;
    S.ledger = ledger;
    return rec;
}
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
const groupsClose = (a, b) => Object.keys(a).every(g => close(a[g], b[g], 1e-3));
const fmt = o => Object.keys(o).map(k => `${k} ${Math.round(o[k] * 1000) / 1000}`).join(", ");

//-----------------------------------------------------------------------------
// Driving and reading the world

function drive(S, updates, until) {
    let day = S.time.day;
    for (let i = 0; i < updates; i++) {
        S.update();
        if (S.time.day !== day) { day = S.time.day; dayLine(S); }
        if (until && until()) return i + 1;
    }
    return until ? -1 : updates;
}
function dayLine(S) {
    const d = S.P.evaluateDeficits(S.area);
    const kinds = S.P.list().reduce((m, p) => Object.assign(m, { [`${p.kind}#${p.id}:${p.state}${p.state === "active" ? "/" + p.phase : ""}`]: 1 }), {});
    const people = S.W.units().filter(u => u.data && u.data.kind === "colonist" && !u.data.dead);
    note(`${S.clockText()}: ${people.length} alive (${S.rec.deaths.length} dead); shelter ${d ? d.shelter.current : "?"}/${d ? d.shelter.needed : "?"}, beds ${d ? d.bed.current : "?"}/${d ? d.bed.needed : "?"}, storage ${d ? d.storage.current : "?"}/${d ? d.storage.needed : "?"}, food ${d ? d.food.current : "?"}/${d ? d.food.needed : "?"} days; ${Object.keys(kinds).join(" ") || "no projects"}`);
}
const days = n => Math.round(n * DAY_TICKS);
const projectsOf = (S, kind) => S.P.list(p => p.kind === kind);
const objectAt = (S, x, y) => { const t = S.O.atIn(S.area, x, y); return t ? t.id : null; };
const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const colonists = S => S.W.units().filter(u => u.data && u.data.kind === "colonist" && !u.data.dead);
const bedOf = u => (u.data && u.data.bed && typeof u.data.bed === "object" ? `${u.data.bed.x},${u.data.bed.y}` : null);
function looseOnFootprint(S, p) {
    let n = 0;
    for (const c of S.P.footprint(p)) for (const it of S.I.atIn(S.area, c.x, c.y)) { const t = S.I.type(it.type); if (t && !t.food) n += it.count | 0; }
    return n;
}
/** A shelter's standing parts: walls and door, beds, hearth, and its door's surroundings. */
function shelterParts(S, p) {
    const rel = S.P._internal.relativeCells(S.P.blueprint("communal_shelter"));
    const at = c => objectAt(S, p.origin.x + c.x, p.origin.y + c.y);
    const door = rel.walls.find(c => c.object === "door_wood");
    const dx = p.origin.x + door.x, dy = p.origin.y + door.y;
    const wallNeighbours = [[0, -1], [1, 0], [0, 1], [-1, 0]].filter(([ox, oy]) => { const t = S.O.atIn(S.area, dx + ox, dy + oy); return t && Array.isArray(t.tags) && t.tags.includes("wall"); }).length;
    const outside = { x: dx, y: dy + 1 };
    return {
        walls: rel.walls.filter(c => at(c) === c.object).length, beds: rel.beds.filter(c => at(c) === "floor_straw").length, hearth: at(rel.hearth[0]) === S.P.hearthId(S.P.blueprint("communal_shelter")),
        door: { x: dx, y: dy, present: at(door) === "door_wood", wallNeighbours, outsideFree: !S.O.atIn(S.area, outside.x, outside.y) && !S.W.water.has(outside.y * SIZE + outside.x) },
        bedCells: rel.beds.map(c => `${p.origin.x + c.x},${p.origin.y + c.y}`)
    };
}
const ringCells = () => { const out = new Set(); for (let dy = -RADIUS; dy <= RADIUS; dy++) for (let dx = -RADIUS; dx <= RADIUS; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === RADIUS) out.add(`${SITE.x + dx},${SITE.y + dy}`); return out; };
/** Newcomers through the colonists' own immigration when it works in the sandbox, else added as arriving settlers. */
function arrive(S, n) {
    let spawned = [];
    try { spawned = S.C.spawnImmigrants(S.W.state.colony, n) || []; } catch (e) { spawned = []; }
    const out = spawned.slice();
    for (let i = out.length; i < n; i++) {
        const s = [[-2, -2], [2, 2], [-2, 2], [2, -2]][i % 4];
        out.push(S.W.addUnit({ name: `Newcomer ${i + 1}`, x: SITE.x + s[0], y: SITE.y + s[1], data: { kind: "colonist", faction: "player", founder: false, age: 20 + i, gender: i % 2 ? "female" : "male", inventory: [], site: 1 } }));
    }
    for (const u of out) { S.I.give("rations", RATIONS_EACH, u.id, { bypassLimits: true }); const nd = S.C.needsOf(u); if (nd) { nd.foodLb = 1; nd.waterGal = 1; } }
    return { units: out, viaImmigration: spawned.length };
}

//-----------------------------------------------------------------------------
// Checks

console.log(`=== Settlement expansion to a second dwelling (DEUS_Projects.js + DEUS_Colonists.js) headless checks: ${MINUTE_TICKS} updates a minute, seed ${SEED} ===`);
try {
    const S = makeSettlement(SEED);
    const { W, O, I, J, P, C } = S;
    const cfg = P.config(), area = S.area;
    instrument(S);
    check("plugins_load", typeof P.structures === "function" && typeof P._internal.stockpileCellFor === "function" && typeof P._internal.tidyParcel === "function" && typeof C.claimBed === "function" && typeof C.allocateBeds === "function" && typeof C.bedClaims === "function" &&
        cfg.perShelter === 8 && S.wild.fruit_tree === 80 && S.wild.berry_bush === 60,
        `Projects structures/stockpileCellFor/tidyParcel, Colonists claimBed/allocateBeds/bedClaims; perShelter ${cfg.perShelter}, ${cfg.slotsPerColonist} slot(s) a colonist, ${cfg.slotsPerStockpileCell} a stockpile cell; ${S.wild.fruit_tree} fruit trees, ${S.wild.berry_bush} berry bushes`);
    drive(S, 16);
    rebase(S);

    // A. Founding: the founders raise Shelter #1 and Stockpile #1 on their own.
    const d0 = P.evaluateDeficits(area);
    const n1 = drive(S, days(10), () => projectsOf(S, "communal_shelter").some(p => p.state === "done") && projectsOf(S, "communal_stockpile").some(p => p.state === "done"));
    const p1 = projectsOf(S, "communal_shelter").find(p => p.state === "done") || projectsOf(S, "communal_shelter")[0] || null;
    const s1 = projectsOf(S, "communal_stockpile").find(p => p.state === "done") || projectsOf(S, "communal_stockpile")[0] || null;
    const parts1 = p1 ? shelterParts(S, p1) : null;
    const registered1 = s1 ? P.footprint(s1).filter(c => W.state.colony.stockpiles.some(s => s.x === c.x && s.y === c.y && s.stores.includes("wood"))).length : 0;
    const dA = P.evaluateDeficits(area);
    check("founding_builds_shelter_and_stockpile", !!d0 && d0.population === 8 && d0.shelter.deficit === 1 && n1 > 0 && !!p1 && p1.state === "done" && !!parts1 && parts1.walls === 20 && parts1.beds === 11 && parts1.hearth && parts1.door.present &&
        !!s1 && s1.state === "done" && registered1 === 9 && !!dA && dA.shelter.deficit === 0 && dA.storage.deficit === 0 && S.rec.assignCalls === 0 && S.rec.orders === 0 && S.rec.deaths.length === 0,
        `${p1 ? P.describe(p1) : "no shelter"} (${parts1 ? `${parts1.walls}/20 walls and door, ${parts1.beds}/11 beds, hearth ${parts1.hearth}` : "-"}); ${s1 ? P.describe(s1) : "no stockpile"}, ${registered1}/9 cells registered; after ${n1 > 0 ? (n1 / DAY_TICKS).toFixed(2) : ">10"} days: shelter ${dA ? dA.shelter.current : "?"}/${dA ? dA.shelter.needed : "?"}, storage ${dA ? dA.storage.current : "?"}/${dA ? dA.storage.needed : "?"}; ${S.rec.assignCalls} assign calls, ${S.rec.orders} orders`);
    const snapshot1 = p1 ? P.footprint(p1).map(c => `${c.x},${c.y}:${objectAt(S, c.x, c.y)}`) : [];
    const ringBefore = [...ringCells()].filter(k => { const [x, y] = k.split(",").map(Number); return objectAt(S, x, y) === "wall_wood"; }).length;

    // B. The founders hold Shelter #1's beds: eight distinct claims on its bed cells.
    drive(S, 31);
    const founderBeds = new Map(S.founders.map(u => [u.id, bedOf(u)]));
    const distinct1 = new Set([...founderBeds.values()].filter(Boolean)).size;
    const inShelter1 = parts1 ? [...founderBeds.values()].filter(k => k && parts1.bedCells.includes(k)).length : 0;
    check("founders_claim_beds", distinct1 === 8 && inShelter1 === 8 && S.founders.every(u => C.claimedBed(u)),
        `${distinct1} distinct claims, ${inShelter1} on Shelter #1's bed cells: ${S.founders.map(u => `#${u.id}@${bedOf(u)}`).join(" ")}`);

    // C. Four newcomers: the brain reads a second shelter, four beds and more storage as unmet, the shelter first.
    const came = arrive(S, 4);
    S.newcomers = came.units;
    rebase(S); // the newcomers' rations enter the ledger here
    drive(S, 31);
    const dC = P.evaluateDeficits(area);
    const bC = P.brain();
    const storageNeeded = 12 * cfg.slotsPerColonist;
    // Shelter #1's 11 beds leave one newcomer without (DEUS-TSK-FABLE-16: 6x6, a hearth with clearance, 11 beds).
    check("influx_deficits_recognised", came.units.length === 4 && !!dC && dC.population === 12 && dC.shelter.needed === 2 && dC.shelter.deficit === 1 && dC.bed.needed === 12 && dC.bed.deficit === 1 &&
        dC.storage.needed === storageNeeded && dC.storage.deficit === Math.max(0, storageNeeded - dC.storage.current) && dC.storage.deficit > 0 && !!bC && bC.chosen && bC.chosen.kind === "communal_shelter",
        `${came.units.length} arrived (${came.viaImmigration} through spawnImmigrants): population ${dC ? dC.population : "?"}; shelter ${dC ? dC.shelter.current : "?"}/${dC ? dC.shelter.needed : "?"} (deficit ${dC ? dC.shelter.deficit : "?"}), beds ${dC ? dC.bed.current : "?"}/${dC ? dC.bed.needed : "?"} (deficit ${dC ? dC.bed.deficit : "?"}), storage ${dC ? dC.storage.current : "?"}/${dC ? dC.storage.needed : "?"} (deficit ${dC ? dC.storage.deficit : "?"}); brain: ${bC ? bC.candidates.map(c => `${c.kind}:${c.utility === -Infinity ? "-" : c.utility.toFixed(2)}`).join("  ") : "none"}`);

    // D. Shelter #2 is sited where the brain would site it; a tree on that parcel is felled and its logs go to the
    //    stockpile before the first wall is posted.
    const predicted = P._internal.chooseSite(W.state.colony, P.blueprint("communal_shelter"), cfg);
    const oak = predicted ? { x: predicted.x + 1, y: predicted.y + 1 } : null;
    if (oak) O.setIn(area, oak.x, oak.y, "oak");
    const before2 = projectsOf(S, "communal_shelter").length;
    const nOpen = drive(S, days(2), () => projectsOf(S, "communal_shelter").length > before2);
    const p2 = projectsOf(S, "communal_shelter")[before2] || null;
    const nWalls = p2 ? drive(S, days(3), () => p2.phase >= 1 || p2.state !== "active") : -1;
    const chopped = oak ? S.rec.created.find(r => r.type === "chop" && r.x === oak.x && r.y === oak.y && r.project === (p2 ? p2.id : -1)) : null;
    const tidy = p2 ? S.rec.tidyHauls.filter(h => h.project === p2.id) : [];
    const wallsPhase = p2 ? S.rec.phases.find(ph => ph.id === p2.id && ph.phase === 1) : null;
    const logsOnPile = s1 ? P.footprint(s1).reduce((n, c) => n + I.atIn(area, c.x, c.y).filter(it => it.type === "log").reduce((m, it) => m + it.count, 0), 0) : 0;
    check("second_shelter_parcel_cleared_and_tidied", !!predicted && nOpen > 0 && !!p2 && p2.origin.x === predicted.x && p2.origin.y === predicted.y && !!chopped && objectAt(S, oak.x, oak.y) !== "oak" && nWalls > 0 &&
        tidy.length >= 1 && tidy.some(h => h.state === "done" && h.to && s1 && P.footprint(s1).some(c => c.x === h.to.x && c.y === h.to.y)) && !!wallsPhase && wallsPhase.loose === 0 && logsOnPile > 0,
        `${p2 ? P.describe(p2) : "no second shelter"} ${predicted ? `(predicted origin (${predicted.x},${predicted.y}))` : ""}; oak at ${oak ? `(${oak.x},${oak.y})` : "-"} ${chopped ? `chopped by the project's job #${chopped.id}` : "never chopped"}, now ${oak ? objectAt(S, oak.x, oak.y) || "clear" : "-"}; ${tidy.length} tidy haul(s) [${tidy.map(h => `${h.state} to (${h.to ? h.to.x : "?"},${h.to ? h.to.y : "?"})`).join("; ")}]; walls phase began ${wallsPhase ? `${wallsPhase.at} with ${wallsPhase.loose} loose material on the parcel` : "never"}; ${logsOnPile} logs on Stockpile #1`);

    // E. The expansion completes: Shelter #2 and Stockpile #2 stand, no deficit is left.
    const nE = drive(S, days(12), () => projectsOf(S, "communal_shelter").filter(p => p.state === "done").length >= 2 && projectsOf(S, "communal_stockpile").filter(p => p.state === "done").length >= 2);
    const shelters = projectsOf(S, "communal_shelter").filter(p => p.state === "done");
    const piles = projectsOf(S, "communal_stockpile").filter(p => p.state === "done");
    const parts2 = shelters[1] ? shelterParts(S, shelters[1]) : null;
    const registered2 = piles[1] ? P.footprint(piles[1]).filter(c => W.state.colony.stockpiles.some(s => s.x === c.x && s.y === c.y)).length : 0;
    const dE = P.evaluateDeficits(area);
    check("expansion_completes", nE > 0 && shelters.length === 2 && piles.length === 2 && !!parts2 && parts2.walls === 20 && parts2.beds === 11 && parts2.hearth && registered2 === 9 &&
        !!dE && dE.population === 12 && dE.shelter.deficit === 0 && dE.bed.deficit === 0 && dE.storage.deficit === 0 && S.rec.assignCalls === 0 && S.rec.orders === 0,
        `${shelters.map(p => P.describe(p)).join("; ") || "no shelters"} | ${piles.map(p => P.describe(p)).join("; ") || "no stockpiles"}; after ${nE > 0 ? (nE / DAY_TICKS).toFixed(2) : ">12"} days: shelter ${dE ? dE.shelter.current : "?"}/${dE ? dE.shelter.needed : "?"}, beds ${dE ? dE.bed.current : "?"}/${dE ? dE.bed.needed : "?"}, storage ${dE ? dE.storage.current : "?"}/${dE ? dE.storage.needed : "?"}`);

    // F. Spatial integrity: every standing structure keeps a free ring round it, none touches the camp ring or the
    //    larder, each door has walls at its sides and free ground outside; and siting refuses Shelter #1's ground.
    const structures = P.structures();
    const cellsOf = s => new Set(s.cells.map(c => `${c.x},${c.y}`));
    let overlaps = 0, minGap = Infinity;
    for (let i = 0; i < structures.length; i++) for (let j = i + 1; j < structures.length; j++) {
        const a = structures[i].cells, bSet = cellsOf(structures[j]);
        let gap = Infinity;
        for (const ca of a) { if (bSet.has(`${ca.x},${ca.y}`)) overlaps++; for (const cb of structures[j].cells) gap = Math.min(gap, cheb(ca, cb)); }
        minGap = Math.min(minGap, gap);
    }
    const ring = ringCells();
    const touchesCamp = structures.reduce((n, s) => n + s.cells.filter(c => ring.has(`${c.x},${c.y}`) || cheb(c, SITE) <= RADIUS || (c.x === LARDER.x && c.y === LARDER.y)).length, 0);
    const doorsOk = shelters.every(p => { const sp = shelterParts(S, p); return sp.door.present && sp.door.wallNeighbours >= 2 && sp.door.outsideFree; });
    //    Two probes of the siting rule itself: a footprint covering Shelter #1's east wall and beds (its hearth left
    //    out, which no rule but "standing buildings" could refuse), and one flush against that wall (the wall in its
    //    margin ring). Each names the first square that refuses it, as siteValid reasons.
    const reserved = P._internal.reservedCellSet(W.state.colony, cfg);
    // The plugin's own verdict square by square (a 1x1 footprint with no margin at each square of the footprint and
    // its ring), so the refusing square is what siteValid refuses, whatever the rule.
    const whyRefused = (ox, oy) => {
        for (let y = oy - cfg.margin; y < oy + 5 + cfg.margin; y++) for (let x = ox - cfg.margin; x < ox + 5 + cfg.margin; x++) {
            if (P._internal.siteValid(area, x, y, 1, 0, reserved)) continue;
            const t = O.atIn(area, x, y);
            return `(${x},${y})${reserved.has(`${x},${y}`) ? " reserved" : ""}${W.water.has(y * SIZE + x) ? " water" : ""}${t ? ` ${t.id}` : ""}`;
        }
        return "nothing";
    };
    const overAt = p1 ? { x: p1.origin.x + 4, y: p1.origin.y } : null, touchAt = p1 ? { x: p1.origin.x + 5, y: p1.origin.y } : null;
    // Wild growth that happens to stand in a probe rectangle is cleared first, so nothing but Shelter #1 can refuse.
    for (const at of [overAt, touchAt].filter(Boolean)) for (let y = at.y - cfg.margin; y < at.y + 5 + cfg.margin; y++) for (let x = at.x - cfg.margin; x < at.x + 5 + cfg.margin; x++) {
        const t = O.atIn(area, x, y);
        if (t && !CONSTRUCTED.some(tag => Array.isArray(t.tags) && t.tags.includes(tag))) O.setIn(area, x, y, 0);
    }
    const probeOver = overAt ? P._internal.siteValid(area, overAt.x, overAt.y, 5, cfg.margin, reserved) : true;
    const probeTouch = touchAt ? P._internal.siteValid(area, touchAt.x, touchAt.y, 5, cfg.margin, reserved) : true;
    check("spatial_integrity", structures.length >= 4 && overlaps === 0 && minGap >= cfg.margin + 1 && touchesCamp === 0 && doorsOk && probeOver === false && probeTouch === false,
        `${structures.length} structures (${structures.map(s => `${s.kind}#${s.id} at (${s.origin.x},${s.origin.y})`).join(", ")}): ${overlaps} overlapping cells, smallest gap ${minGap} (margin ${cfg.margin}), ${touchesCamp} cells on the camp ring, inside it or on the larder; doors ${doorsOk ? "walled at the sides with free ground outside" : "not all valid"}; ` +
        `siting over Shelter #1's east wall ${probeOver ? "ACCEPTED" : `refused by ${overAt ? whyRefused(overAt.x, overAt.y) : "?"}`}, flush against it ${probeTouch ? "ACCEPTED" : `refused by ${touchAt ? whyRefused(touchAt.x, touchAt.y) : "?"}`}`);

    // G. Nothing was taken from a standing building: no clearing job ever targeted one, Shelter #1 and the camp ring
    //    stand as they did, and every log, straw and stone is accounted for by a harvest or a build.
    const snapshotNow = p1 ? P.footprint(p1).map(c => `${c.x},${c.y}:${objectAt(S, c.x, c.y)}`) : [];
    const shelter1Intact = snapshot1.length === 36 && snapshot1.every((k, i) => k === snapshotNow[i]);
    const shelter1Diff = snapshot1.map((k, i) => (k === snapshotNow[i] ? null : `${k} -> ${snapshotNow[i] ? snapshotNow[i].split(":")[1] : "?"}`)).filter(Boolean);
    const ringNow = [...ring].filter(k => { const [x, y] = k.split(",").map(Number); return objectAt(S, x, y) === "wall_wood"; }).length;
    const actual = totals(S), expected = expectedTotals(S);
    // Wood for the second shelter came from the wild (oaks and their stumps), never from a building.
    const woodHarvests = S.rec.created.filter(r => r.type === "chop" && (r.object === "oak" || r.object === "stump")).length;
    check("no_cannibalization", S.rec.violations.length === 0 && shelter1Intact && ringNow === ringBefore && groupsClose(actual, expected) && (S.ledger.built.log || 0) > 0 && (S.ledger.yields.log || 0) >= 6 && woodHarvests >= 2,
        `${S.rec.violations.length} clearing job(s) on standing buildings${S.rec.violations.length ? ` (e.g. ${S.rec.violations[0].type} on ${S.rec.violations[0].object} at (${S.rec.violations[0].x},${S.rec.violations[0].y}) ${S.rec.violations[0].at})` : ""}; ${woodHarvests} chop(s) of wild wood; Shelter #1 ${shelter1Intact ? "intact" : `CHANGED (${shelter1Diff.join("; ")})`}, camp ring ${ringNow}/${ringBefore} walls; materials actual ${fmt(actual)} vs expected ${fmt(expected)} (yields ${JSON.stringify(S.ledger.yields)}, built ${JSON.stringify(S.ledger.built)})`);

    // H. The newcomers hold Shelter #2's beds; the founders hold what they held; nobody shares a bed.
    drive(S, 31);
    const foundersKept = S.founders.filter(u => bedOf(u) === founderBeds.get(u.id)).length;
    const newcomerBeds = S.newcomers.map(bedOf);
    // Shelter #1 has 11 beds (DEUS-TSK-FABLE-16), so three newcomers take its free beds and the rest Shelter #2's.
    const newIn1 = parts1 ? newcomerBeds.filter(k => k && parts1.bedCells.includes(k)).length : 0;
    const inShelter2 = parts2 ? newcomerBeds.filter(k => k && parts2.bedCells.includes(k)).length : 0;
    const all = colonists(S), allBeds = all.map(bedOf);
    const distinctAll = new Set(allBeds.filter(Boolean)).size;
    const standing = all.filter(u => C.claimedBed(u)).length;
    check("newcomers_bedded_without_displacement", foundersKept === 8 && newIn1 + inShelter2 === 4 && inShelter2 >= 1 && distinctAll === 12 && standing === 12,
        `founders keeping their bed ${foundersKept}/8, newcomers on Shelter #1's free beds ${newIn1}/4 and Shelter #2's ${inShelter2}/4 (${S.newcomers.map(u => `${u.name || "#" + u.id}@${bedOf(u)}`).join(" ")}); ${distinctAll} distinct claims among ${all.length}, ${standing} standing`);

    // I. Two more days: all twelve alive, sleeping in their own beds, fed.
    const sleepsBefore = S.rec.sleeps.length;
    drive(S, days(2));
    const recent = S.rec.sleeps.slice(sleepsBefore);
    const claimOf = new Map(all.map(u => [bedOf(u), u.id]));
    const sleptOwn = all.filter(u => recent.some(s => s.unit === u.id && `${s.x},${s.y}` === bedOf(u)));
    const noOwn = all.filter(u => !sleptOwn.includes(u)).map(u => `${u.name || "#" + u.id}: ${recent.filter(s => s.unit === u.id).map(s => `(${s.x},${s.y}) ${s.at}`).join(", ") || "no sleep"}`);
    // Nobody ever slept in a bed another colonist holds: the invariant the claims exist for.
    const inOthersBed = recent.filter(s => { const holder = claimOf.get(`${s.x},${s.y}`); return holder !== undefined && holder !== s.unit; });
    const dI = P.evaluateDeficits(area);
    const hungry = all.filter(u => { const n = C.needsOf(u); return n && (n.daysWithoutFood | 0) >= 2; }).length;
    const alive = colonists(S).length;
    check("longevity_all_survive_bedded_and_fed", alive === 12 && S.rec.deaths.length === 0 && sleptOwn.length === 12 && inOthersBed.length === 0 && hungry === 0 && !!dI && dI.food.critical === false,
        `${alive}/12 alive (${S.rec.deaths.length} dead); ${sleptOwn.length}/12 slept in their own bed in the last two days (${recent.length} sleeps${noOwn.length ? `; without: ${noOwn.join("; ")}` : ""}), ${inOthersBed.length} sleep(s) in another's bed; ${hungry} colonist(s) two days without food; food ${dI ? dI.food.current : "?"}/${dI ? dI.food.needed : "?"} days${dI && dI.food.critical ? " (critical)" : ""}`);

    // J. Save and reload: projects, structures and bed claims come back identical.
    const projectsJson = JSON.stringify(W.state.colony.projects), bedsJson = JSON.stringify(all.map(u => [u.id, u.data.bed]));
    const whole = JSON.stringify(W.state);
    const clean = !whole.includes("undefined") && !whole.includes("Infinity") && !whole.includes("NaN");
    const contents = JSON.parse(JSON.stringify(S.sandbox.DataManager.makeSaveContents()));
    S.sandbox.DataManager.extractSaveContents(contents);
    const after = colonists(S);
    check("save_load_keeps_expansion", clean && JSON.stringify(W.state.colony.projects) === projectsJson && JSON.stringify(after.map(u => [u.id, u.data.bed])) === bedsJson && P.structures().length === structures.length,
        `${whole.length} bytes, JSON-clean ${clean}; projects identical, ${after.length} colonists' bed claims identical, ${P.structures().length} structures`);

    check("no_errors", errors.length === 0, errors.length ? errors[0].slice(0, 300) : `no console errors during ${S.now()} updates (${(S.now() / DAY_TICKS).toFixed(1)} calendar days)`);
} catch (e) {
    console.error(e && e.stack || e);
    console.log(`RESULT: ${passed} passed, ${failed} failed (harness error, exit 2)`);
    process.exit(2);
}

console.log(`\nRESULT: ${passed} passed, ${failed} failed (exit ${failed === 0 ? 0 : 1})`);
process.exit(failed === 0 ? 0 : 1);
