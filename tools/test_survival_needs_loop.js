"use strict";
// tools/test_survival_needs_loop.js - Headless checks for DEUS-TSK-FABLE-05: hunger, thirst and sleep tick at the
// catalog's rates on a coarse cadence; an acute need preempts a founder's project labor (the carried logs land at
// its feet, its reservations go); the founder drinks at the water's edge, eats from its pack, the larder or a berry
// bush, sleeps in a bed or by the hearth; a need nothing can meet does not thrash; work resumes afterwards.
//
// Runs the real DEUS_Objects.js, DEUS_Items.js, DEUS_Jobs.js, DEUS_Projects.js and DEUS_Colonists.js in a Node vm
// against a World double (one 64x64 ground area with a pond) and the real catalog. The driver only advances the
// clock and calls Game_Map.update; needs are set directly on the founders to trigger each case.
//
// Usage: node tools/test_survival_needs_loop.js [--mutant=<name>] [--quiet] [--debug]
//   --mutant   patches DEUS_Colonists.js in memory before loading it; the run must then FAIL (Rule 4):
//              no_preempt (labor is never suspended), no_water_check (drinks where it stands), no_needs_tick
//              (needs never rise), thrash (an unmeetable need is searched again every decision)
// Exit code: 0 all checks passed, 1 a check failed, 2 harness problem.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const mutant = (process.argv.find(a => a.startsWith("--mutant=")) || "").slice(9);
const quiet = process.argv.includes("--quiet");
const debug = process.argv.includes("--debug");

const MUTANTS = {
    no_preempt: ["J.cancel(job.id, `survival: ${need}`);", "/* no preemption */"],
    no_water_check: ["const w = waterNear(u, WATER_RADIUS);", "const w = { x: u.x, y: u.y };"],
    no_needs_tick: ["for (const k of Object.keys(rates)) n[k] = clamp((n[k] || 0) + rates[k], 0, 100);", "/* needs never rise */"],
    thrash: ["avoid.set(needKey(u, need), ticks() + NEED_RETRY_TICKS);", "/* no cooldown */"]
};

const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "UF_WorldCatalog.json"), "utf8"));
const read = name => fs.readFileSync(path.join(PLUGINS, name), "utf8");
const sources = {
    objects: read("DEUS_Objects.js"),
    items: read("DEUS_Items.js"),
    jobs: read("DEUS_Jobs.js"),
    projects: read("DEUS_Projects.js"),
    colonists: read("DEUS_Colonists.js")
};
if (mutant) {
    const m = MUTANTS[mutant];
    if (!m) { console.error(`unknown mutant "${mutant}" (known: ${Object.keys(MUTANTS).join(", ")})`); process.exit(2); }
    if (!sources.colonists.includes(m[0])) { console.error(`mutant "${mutant}": pattern not found in DEUS_Colonists.js`); process.exit(2); }
    sources.colonists = sources.colonists.replace(m[0], m[1]);
    console.log(`MUTANT ${mutant}: DEUS_Colonists.js patched in memory; this run must FAIL`);
}

let passed = 0, failed = 0;
function check(name, condition, detail = "") {
    if (condition) { passed++; console.log(`PASS survival.${name}${detail ? " - " + detail : ""}`); }
    else { failed++; console.log(`FAIL survival.${name}${detail ? " - " + detail : ""}`); }
    return !!condition;
}
const errors = [];

//-----------------------------------------------------------------------------
// The World double (the same hash and RNG as DEUS_World.js)

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

function makeSandbox(seed, size) {
    const ufObjects = new Uint16Array(size * size);
    const water = new Set();
    const built = { ufObjects, data: null };
    const sandbox = {};
    const emit = (name, ...args) => sandbox.UF.Events.emit(name, ...args);
    const zOf = o => (o && o.z !== undefined ? o.z : (o && o.area && o.area.z !== undefined ? o.area.z : 0));
    const inBounds = (x, y) => x >= 0 && y >= 0 && x < size && y < size;
    let clock = 0;
    const counters = { getTile: 0 };
    const W = {
        EVENT_BASE: 1000,
        _frame: 0,
        state: {
            version: 4, seed, size, areasX: 1, areasY: 1, startArea: { x: 0, y: 0 },
            units: {}, nextUnitId: 1, diffs: {}, objectDiffs: {}, factions: { playerId: "player" }
        },
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
        getTile: (ax, ay, x, y) => { counters.getTile++; return water.has(y * size + x) ? 2048 : 1; },
        walkable(ax, ay, x, y, opts = {}) {
            if (!inBounds(x, y) || water.has(y * size + x)) return false;
            if (opts.ground) return true;
            return !sandbox.UF.Objects.blocksIn({ x: 0, y: 0, z: 0 }, x, y);
        },
        standerAt: (ax, ay, x, y) => Object.values(W.state.units).find(u => u.x === x && u.y === y) || null,
        addUnit(spec) {
            const id = W.state.nextUnitId++;
            const u = { id, name: spec.name || "", image: { characterName: "", characterIndex: 0 }, area: { x: 0, y: 0 }, z: 0, x: spec.x | 0, y: spec.y | 0, dir: 2, data: spec.data || {}, goal: null };
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
        eventOf: () => null,
        refreshUnitImage() {},
        invalidateUnitsCache() {},
        /** One cell per update toward the goal (8-way), never onto water. */
        walkUnits() {
            for (const u of Object.values(W.state.units)) {
                if (!u.goal) continue;
                if (u.x === u.goal.x && u.y === u.goal.y) { u.goal = null; emit("world:unitArrived", u); continue; }
                const nx = u.x + Math.sign(u.goal.x - u.x), ny = u.y + Math.sign(u.goal.y - u.y);
                if (water.has(ny * size + nx)) { u.goal = null; continue; }
                u.x = nx; u.y = ny;
            }
        },
        water, ufObjects, counters
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
    Object.assign(sandbox, {
        console: errorConsole,
        performance: { now: () => Date.now() },
        Sprite, Spriteset_Map, Game_Map, Scene_Boot,
        SceneManager: { _scene: null },
        DataManager: { makeSaveContents: () => ({ ufWorld: W.state }), extractSaveContents(contents) { W.state = contents.ufWorld; } },
        Tilemap: { isWaterTile: id => id === 2048 },
        ImageManager: { loadCharacter: () => ({}), loadTileset: () => ({}), isBigCharacter: () => true },
        $gameMap: null, $dataMap: null, $gamePlayer: null,
        $ufWorldCatalog: catalog, $deusWorldCatalog: catalog,
        $ufTime: { hour: 10, minute: 0, day: 1, monthIndex: 0, year: 1, seasonName: "spring" }
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
    const S = { sandbox, W, O: sandbox.UF.Objects, I: sandbox.UF.Items, J: sandbox.UF.Jobs, P: sandbox.UF.Projects, C: sandbox.UF.Colonists, map: new sandbox.Game_Map(), area: { x: 0, y: 0, z: 0 } };
    S.now = () => clock;
    S.update = () => { clock++; W._frame = clock; W.walkUnits(); S.map.update(true); };
    return S;
}

//-----------------------------------------------------------------------------
// The fixture: the camp in miniature (ring with two gaps, three straw beds, eight unnamed founders), a pond to the east

const SIZE = 64, SITE = { x: 32, y: 32 }, RADIUS = 4;
const POND = { x0: 44, y0: 30, x1: 46, y1: 34 };
function makeFixture(seed, opts = {}) {
    const S = makeSandbox(seed, SIZE);
    const { W, O, I, area } = S;
    if (opts.pond !== false) for (let y = POND.y0; y <= POND.y1; y++) for (let x = POND.x0; x <= POND.x1; x++) W.water.add(y * SIZE + x);
    O.setIn(area, SITE.x, SITE.y, "campfire");
    for (let dy = -RADIUS; dy <= RADIUS; dy++) {
        for (let dx = -RADIUS; dx <= RADIUS; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== RADIUS || dx === 0) continue;
            O.setIn(area, SITE.x + dx, SITE.y + dy, "wall_wood");
        }
    }
    S.beds = [[SITE.x - 2, SITE.y - 1], [SITE.x + 2, SITE.y - 1], [SITE.x - 2, SITE.y + 1]];
    if (opts.beds !== false) for (const [x, y] of S.beds) O.setIn(area, x, y, "floor_straw");
    W.state.colony = {
        version: 2, factionId: "player", siteId: 1, site: { x: SITE.x, y: SITE.y }, area: { x: 0, y: 0 }, z: 0, radius: RADIUS,
        plan: JSON.parse(JSON.stringify(catalog.colony.plan)).map(s => Object.assign(s, { done: false })), stockpiles: [], log: []
    };
    const seats = [[-1, -2], [1, -2], [-2, 0], [2, 0], [-1, 2], [1, 2], [0, -1], [0, 1]];
    S.founders = seats.map((s, i) => W.addUnit({ x: SITE.x + s[0], y: SITE.y + s[1], data: { kind: "colonist", faction: "player", founder: true, age: 25, gender: i % 2 ? "female" : "male", inventory: [], site: 1 } }));
    I.drop(area, SITE.x, 8, "log", 40);
    I.drop(area, 8, SITE.x, "stone", 20);
    I.drop(area, SITE.x, 9, "straw", 30);
    return S;
}
const PLANTS = [[0, 0, "bush"], [1, 1, "oak"], [2, 1, "bush"], [3, 1, "bush"], [1, 2, "rocks_small"], [3, 2, "bush"], [1, 3, "rocks_small"], [2, 3, "bush"], [3, 3, "oak"]];

function drive(S, updates, until) {
    for (let i = 0; i < updates; i++) {
        S.update();
        if (until && until()) return i + 1;
    }
    return until ? -1 : updates;
}
const objectAt = (S, x, y) => { const t = S.O.atIn(S.area, x, y); return t ? t.id : null; };
const totalOf = (S, type) => S.I.all().filter(it => it.type === type).reduce((n, it) => n + it.count, 0);
const groundOf = (S, type, x, y) => S.I.atIn(S.area, x, y).filter(it => it.type === type).reduce((n, it) => n + it.count, 0);
const carriedOf = (S, u, type) => S.I.inventoryOf(u.id).filter(it => it.type === type).reduce((n, it) => n + it.count, 0);
const jobOf = (S, u) => S.J.of(u.id);
const nextToWater = (S, u) => [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => S.W.water.has((u.y + dy) * SIZE + u.x + dx)) && !S.W.water.has(u.y * SIZE + u.x);
const near = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const rates = catalog.colony.needs, START = { hunger: 12, thirst: 18, sleep: 8 };

//-----------------------------------------------------------------------------
// Checks

console.log("=== Survival needs loop (DEUS_Colonists.js) headless checks ===");
try {
    const S = makeFixture(20260922);
    const { W, O, I, J, P, C, area } = S;
    const cancelled = [];
    S.sandbox.UF.Events.on("jobs:failed", j => cancelled.push({ id: j.id, type: j.type, reason: j.reason, unit: j.assigned }));

    // A. Needs appear on the first needs tick and rise at the catalog's rates, once per game minute, not per frame.
    check("plugins_load", !!C && typeof C.tickNeeds === "function" && typeof C._internal.needJob === "function" && typeof C._internal.urgent === "function",
        `UF.Colonists with tickNeeds/needJob/urgent; catalog rates hunger ${rates.hunger}, thirst ${rates.thirst}, sleep ${rates.sleep}`);
    const before = S.founders.map(u => !!u.data.needs);
    drive(S, 16);
    const f0 = S.founders[0], n0 = Object.assign({}, f0.data.needs); // a snapshot: the live object keeps changing
    check("needs_initialised", before.every(b => !b) && S.founders.every(u => u.data.needs && u.data.needs.hunger === START.hunger + rates.hunger && u.data.needs.thirst === START.thirst + rates.thirst),
        `no founder had needs before the first tick; after it hunger ${n0 && n0.hunger}, thirst ${n0 && n0.thirst}, sleep ${n0 && n0.sleep}`);
    let changes = 0, lastHunger = n0.hunger;
    for (let i = 0; i < 600; i++) { S.update(); if (f0.data.needs.hunger !== lastHunger) { changes++; lastHunger = f0.data.needs.hunger; } }
    const eps = 1e-6;
    check("needs_tick_rate", changes === 10 && Math.abs(f0.data.needs.hunger - (n0.hunger + 10 * rates.hunger)) < eps && Math.abs(f0.data.needs.thirst - (n0.thirst + 10 * rates.thirst)) < eps && Math.abs(f0.data.needs.sleep - (n0.sleep + 10 * rates.sleep)) < eps,
        `over 600 updates hunger changed ${changes} times (10 needs ticks) and rose ${(f0.data.needs.hunger - n0.hunger).toFixed(2)} (${(10 * rates.hunger).toFixed(2)} expected); thirst ${f0.data.needs.thirst.toFixed(2)}, sleep ${f0.data.needs.sleep.toFixed(2)}`);

    // B. The founders start the communal shelter; a hauler carrying logs gets acutely thirsty.
    const pre = P._internal.chooseSite(W.state.colony, P.blueprint("communal_shelter"), P.config());
    if (pre) for (const [dx, dy, id] of PLANTS) O.setIn(area, pre.x + dx, pre.y + dy, id);
    P.tick();
    const p = P.active()[0] || null;
    const hauler = () => S.founders.find(u => { const j = jobOf(S, u); return j && j.type === "haul" && j.params.project === p.id && carriedOf(S, u, "log") > 0; }) || null;
    const n1 = p ? drive(S, 6000, () => !!hauler()) : -1;
    const H = hauler();
    const haul = H ? jobOf(S, H) : null;
    const carried = H ? carriedOf(S, H, "log") : 0;
    const logsBefore = totalOf(S, "log");
    if (H) H.data.needs.thirst = 95;
    const n2 = H ? drive(S, 300, () => { const j = jobOf(S, H); return !!j && j.type === "drink"; }) : -1;
    const cut = haul ? cancelled.find(c => c.id === haul.id) : null;
    const atFeet = cut ? groundOf(S, "log", H.x, H.y) : 0;
    const drink = H ? jobOf(S, H) : null;
    check("preempt_thirst_drops_haul", n1 > 0 && !!H && carried > 0 && n2 > 0 && !!cut && cut.reason === "survival: thirst" && !!drink && drink.type === "drink" && carriedOf(S, H, "log") === 0 && totalOf(S, "log") === logsBefore && J.reservation.reservedBy(haul.target) !== H.id && J.reservation.reservedBy(haul.params.itemId) !== H.id,
        H ? `#${H.id} carried ${carried} log(s) for haul #${haul.id}; thirst 95 -> ${cut ? `cancelled "${cut.reason}"` : "not cancelled"} after ${n2} updates, now ${drink ? drink.type : "idle"}; carries ${carriedOf(S, H, "log")}, ${totalOf(S, "log")} logs in the world (${logsBefore} before); haul target reserved by ${J.reservation.reservedBy(haul.target)}` : `no hauler with logs after ${n1} updates`);

    // C. The drink: at the water's edge, thirst falls by 65.
    const n3 = drink ? drive(S, 900, () => drink.state === "done" || drink.state === "failed") : -1;
    check("drink_resolves", n3 > 0 && !!drink && drink.state === "done" && nextToWater(S, H) && Math.abs(H.data.needs.thirst - 30) < 1,
        H ? `drink ${drink ? drink.state : "?"}${drink && drink.reason ? ` (${drink.reason})` : ""} after ${n3} updates; #${H.id} at (${H.x},${H.y}) ${nextToWater(S, H) ? "beside" : "not beside"} the water; thirst ${H.data.needs.thirst.toFixed(1)} (30 expected)` : "no drinker");

    // D. Labor resumes: the rested founder claims project work again within a sweep or two.
    const n4 = H ? drive(S, 600, () => { const j = jobOf(S, H); return !!j && j.params && j.params.project === p.id; }) : -1;
    const back = H ? jobOf(S, H) : null;
    check("labor_resumes", n4 > 0 && !!back && back.params.project === p.id,
        H ? `#${H.id} took ${back ? `${back.type}#${back.id}` : "nothing"} after ${n4} updates` : "no drinker");

    // Hunger scenarios. A meal takes the food's value off hunger (berries 25); a colonist eats until it is below the
    // threshold (55), so 92 takes two berries. Each founder is fed down afterwards and every active meal job is
    // ended before the harness removes food, so no scenario feeds on another's leftovers.
    const eats = [];
    S.sandbox.UF.Events.on("jobs:done", (j, u) => { if (j.type === "eat") eats.push({ unit: u ? u.id : null, item: j.params.itemType }); });
    const HUNGER_AT = catalog.colony.thresholds.hunger, BERRY = catalog.items.types.find(t => t.id === "berries").food.hunger;
    const mealsFor = (from) => Math.ceil((from - HUNGER_AT + 1e-9) / BERRY);
    const settle = (u, hunger) => { for (const f of S.founders) { const j = jobOf(S, f); if (j && (j.type === "eat" || j.type === "fetch" || j.type === "gather")) J.cancel(j.id, "test: scenario over"); } u.data.needs.hunger = hunger; };

    // E. Hunger: carried food first.
    const F2 = S.founders.find(u => u !== H) || S.founders[1];
    I.create("berries", 3, { holder: F2.id });
    F2.data.needs.hunger = 92;
    const eats0 = eats.length;
    const n5 = drive(S, 600, () => F2.data.needs.hunger < HUNGER_AT && !(jobOf(S, F2) && jobOf(S, F2).type === "eat"));
    const ate2 = eats.slice(eats0).filter(e => e.unit === F2.id).length;
    check("hunger_eats_carried_food", n5 > 0 && ate2 === mealsFor(92) && carriedOf(S, F2, "berries") === 3 - mealsFor(92) && F2.data.needs.hunger < HUNGER_AT && F2.data.needs.hunger > 92 - (mealsFor(92) + 1) * BERRY,
        `#${F2.id} hunger 92 -> ${F2.data.needs.hunger.toFixed(1)} after ${n5} updates with ${ate2} meal(s) of berries (${mealsFor(92)} expected); carries ${carriedOf(S, F2, "berries")} berries (${3 - mealsFor(92)} expected)`);
    settle(F2, 20);

    // F. Hunger with no food anywhere but a berry bush in reach: gather, then eat from the ground.
    const F4 = S.founders.find(u => u !== H && u !== F2) || S.founders[2];
    for (const it of I.all().filter(it => it.type === "berries")) I.remove(it.id);
    O.setIn(area, 26, 26, "berry_bush");
    F4.data.needs.hunger = 92;
    const eats1 = eats.length;
    const n6 = drive(S, 1500, () => F4.data.needs.hunger < HUNGER_AT && !(jobOf(S, F4) && jobOf(S, F4).type === "eat"));
    const ate4 = eats.slice(eats1).filter(e => e.unit === F4.id).length;
    check("hunger_forages_berry_bush", n6 > 0 && ate4 === mealsFor(92) && F4.data.needs.hunger < HUNGER_AT && objectAt(S, 26, 26) === "berry_bush_bare" && totalOf(S, "berries") === 2 - ate4,
        `#${F4.id} hunger 92 -> ${F4.data.needs.hunger.toFixed(1)} after ${n6} updates with ${ate4} meal(s); the bush is ${objectAt(S, 26, 26)}; berries in the world ${totalOf(S, "berries")} (2 gathered, ${ate4} eaten)`);
    settle(F4, 20);

    // G. Hunger with food in the larder: fetch it, eat.
    const F3 = S.founders.find(u => ![H, F2, F4].includes(u)) || S.founders[3];
    for (const it of I.all().filter(it => it.type === "berries")) I.remove(it.id);
    W.state.colony.stockpiles.push({ x: SITE.x + 5, y: SITE.y, stores: ["food"], step: "larder" });
    O.setIn(area, SITE.x + 5, SITE.y, "stockpile");
    I.drop(area, SITE.x + 5, SITE.y, "berries", 4);
    F3.data.needs.hunger = 92;
    const eats2 = eats.length;
    const n7 = drive(S, 1500, () => F3.data.needs.hunger < HUNGER_AT && !(jobOf(S, F3) && jobOf(S, F3).type === "eat"));
    const ate3 = eats.slice(eats2).filter(e => e.unit === F3.id).length;
    check("hunger_eats_from_larder", n7 > 0 && ate3 === mealsFor(92) && F3.data.needs.hunger < HUNGER_AT && totalOf(S, "berries") === 4 - ate3 && carriedOf(S, F3, "berries") + groundOf(S, "berries", SITE.x + 5, SITE.y) === 4 - ate3,
        `#${F3.id} hunger 92 -> ${F3.data.needs.hunger.toFixed(1)} after ${n7} updates with ${ate3} meal(s) from the larder; berries: ${carriedOf(S, F3, "berries")} carried, ${groundOf(S, "berries", SITE.x + 5, SITE.y)} in the larder, ${totalOf(S, "berries")} in the world (${4 - ate3} expected)`);
    settle(F3, 20);

    // H. Exhaustion: a bed in the settlement, slept in until rested.
    const F5 = S.founders.find(u => ![H, F2, F3, F4].includes(u)) || S.founders[4];
    F5.data.needs.sleep = 92;
    const n8 = drive(S, 300, () => { const j = jobOf(S, F5); return !!j && j.type === "sleep"; });
    const sleepJob = jobOf(S, F5);
    const bedCells = S.beds.concat(p ? P.cells(p, 3).map(c => [c.x, c.y]) : []);
    const onBed = sleepJob && bedCells.some(([x, y]) => x === sleepJob.target.x && y === sleepJob.target.y && objectAt(S, x, y) === "floor_straw");
    const n9 = sleepJob ? drive(S, 40000, () => sleepJob.state === "done" || sleepJob.state === "failed") : -1;
    check("sleep_in_bed", n8 > 0 && !!sleepJob && onBed && n9 > 0 && sleepJob.state === "done" && F5.data.needs.sleep <= 5 && F5.x === sleepJob.target.x && F5.y === sleepJob.target.y,
        F5 ? `#${F5.id} sleep 92 -> ${sleepJob ? `sleep job on (${sleepJob.target.x},${sleepJob.target.y}) ${onBed ? "a straw bed" : "not a bed"}` : "no sleep job"} after ${n8} updates; ${sleepJob ? sleepJob.state : "?"} after ${n9} more; sleep now ${F5.data.needs ? F5.data.needs.sleep.toFixed(1) : "?"}` : "no founder");
    check("no_errors_main", errors.length === 0, errors.length ? errors[0].slice(0, 200) : "no console errors in the main run");

    // I. No bed anywhere: sleep beside the hearth, never on it.
    {
        const B = makeFixture(2, { beds: false });
        B.P.setEnabled(false);
        drive(B, 16);
        const u = B.founders[0];
        u.data.needs.sleep = 92;
        const m = drive(B, 300, () => { const j = jobOf(B, u); return !!j && j.type === "sleep"; });
        const j = jobOf(B, u);
        check("sleep_fallback_hearth", m > 0 && !!j && near(j.target, SITE) >= 2 && near(j.target, SITE) <= 4 && objectAt(B, j.target.x, j.target.y) === null,
            j ? `sleep job on (${j.target.x},${j.target.y}), ${near(j.target, SITE)} from the campfire, cell holds ${objectAt(B, j.target.x, j.target.y) || "nothing"}` : `no sleep job after ${m} updates`);
    }

    // J. No water in the world: one search, one thought, then a long cooldown; the colonist keeps working meanwhile.
    {
        const D = makeFixture(3, { pond: false });
        D.P.setEnabled(false);
        drive(D, 16);
        const u = D.founders[0];
        u.data.needs.thirst = 95;
        D.W.counters.getTile = 0;
        const thoughts = () => (u.data.thoughts || []).filter(t => t.text === "Found no water to drink.").length;
        drive(D, 1200);
        const scans = D.W.counters.getTile / (121 * 121);
        check("unreachable_water_no_thrash", thoughts() === 2 && scans <= 2.5,
            `over 1200 updates with no water: ${thoughts()} "found no water" thoughts (2 expected: one per ${600}-tick cooldown), ${scans.toFixed(1)} full water searches (${(121 * 121)} tile reads each); a search every decision would make ${Math.floor(1200 / 60)}`);
    }

    check("no_errors", errors.length === 0, errors.length ? errors[0].slice(0, 200) : "no console errors during the run");
} catch (e) {
    console.error(e && e.stack || e);
    console.log(`RESULT: ${passed} passed, ${failed} failed (harness error, exit 2)`);
    process.exit(2);
}

console.log(`\nRESULT: ${passed} passed, ${failed} failed (exit ${failed === 0 ? 0 : 1})`);
process.exit(failed === 0 ? 0 : 1);
