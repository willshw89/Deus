"use strict";
// tools/test_survival_needs_loop.js - Headless checks for DEUS-TSK-FABLE-05 under the SRD 5.1 model the owner chose on
// 2026-09-23 ("I want it like SRD"): a colonist needs a pound of food and a gallon of water a day, days without food
// past 3 + Constitution modifier and short water add levels of exhaustion at the day's end, exhaustion is the single
// penalty ladder (level 5 no work, level 6 death), a long rest with the day's full food and drink takes a level off,
// supper and bedtime interrupt labor, and a need nothing can meet does not thrash.
//
// Runs the real DEUS_Objects.js, DEUS_Items.js, DEUS_Jobs.js, DEUS_Projects.js and DEUS_Colonists.js in a Node vm
// against a World double (one 64x64 ground area with a pond) and the real catalog. The driver only advances the
// clock and calls Game_Map.update; the calendar ($ufTime) is moved directly to reach suppers, nights and new days.
//
// Usage: node tools/test_survival_needs_loop.js [--mutant=<name>] [--quiet]
//   --mutant   patches DEUS_Colonists.js in memory before loading it; the run must then FAIL (Rule 4):
//              no_preempt (labor is never suspended), free_food (eating adds no food to the day),
//              no_day_end (the day never closes), thrash (an unmeetable need is searched again every decision)
// Exit code: 0 all checks passed, 1 a check failed, 2 harness problem.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const mutant = (process.argv.find(a => a.startsWith("--mutant=")) || "").slice(9);
const quiet = process.argv.includes("--quiet");

const MUTANTS = {
    no_preempt: ["J.cancel(job.id, `survival: ${need}`);", "/* no preemption */"],
    free_food: ["u.data.needs.foodLb = Math.round(((u.data.needs.foodLb || 0) + (lb > 0 ? lb : 0.2)) * 1000) / 1000;", "/* free food */"],
    no_day_end: ["if (n && n.day !== today) endOfDay(u, n);", "/* the day never ends */"],
    thrash: ["avoid.set(needKey(u, need), ticks() + NEED_RETRY_TICKS);", "/* no cooldown */"]
};

// The catalog with the SRD food data applied in memory (tools/add_srd_food_data.js): weight, nutrition and water per
// food item, and the SRD rations item. The canonical file gets it when the coordinator runs the script at the gate.
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "UF_WorldCatalog.json"), "utf8"));
const foodData = require("./add_srd_food_data.js").applyFoodData(catalog);
const read = name => fs.readFileSync(path.join(PLUGINS, name), "utf8");
const sources = { objects: read("DEUS_Objects.js"), items: read("DEUS_Items.js"), jobs: read("DEUS_Jobs.js"), projects: read("DEUS_Projects.js"), colonists: read("DEUS_Colonists.js") };
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
        console: errorConsole, performance: { now: () => Date.now() },
        Sprite, Spriteset_Map, Game_Map, Scene_Boot, SceneManager: { _scene: null },
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
    const S = { sandbox, W, O: sandbox.UF.Objects, I: sandbox.UF.Items, J: sandbox.UF.Jobs, P: sandbox.UF.Projects, C: sandbox.UF.Colonists, map: new sandbox.Game_Map(), area: { x: 0, y: 0, z: 0 }, time: sandbox.$ufTime };
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
    for (let dy = -RADIUS; dy <= RADIUS; dy++) for (let dx = -RADIUS; dx <= RADIUS; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== RADIUS || dx === 0) continue;
        O.setIn(area, SITE.x + dx, SITE.y + dy, "wall_wood");
    }
    S.beds = [[SITE.x - 2, SITE.y - 1], [SITE.x + 2, SITE.y - 1], [SITE.x - 2, SITE.y + 1]];
    for (const [x, y] of S.beds) O.setIn(area, x, y, "floor_straw");
    W.state.colony = { version: 2, factionId: "player", siteId: 1, site: { x: SITE.x, y: SITE.y }, area: { x: 0, y: 0 }, z: 0, radius: RADIUS,
        plan: JSON.parse(JSON.stringify(catalog.colony.plan)).map(s => Object.assign(s, { done: false })), stockpiles: [], log: [] };
    const seats = [[-1, -2], [1, -2], [-2, 0], [2, 0], [-1, 2], [1, 2], [0, -1], [0, 1]];
    S.founders = seats.map((s, i) => W.addUnit({ x: SITE.x + s[0], y: SITE.y + s[1], data: { kind: "colonist", faction: "player", founder: true, age: 25, gender: i % 2 ? "female" : "male", inventory: [], site: 1 } }));
    I.drop(area, SITE.x, 8, "log", 40);
    I.drop(area, 8, SITE.x, "stone", 20);
    I.drop(area, SITE.x, 9, "straw", 30);
    return S;
}
const PLANTS = [[0, 0, "bush"], [1, 1, "oak"], [2, 1, "bush"], [3, 1, "bush"], [1, 2, "rocks_small"], [3, 2, "bush"], [1, 3, "rocks_small"], [2, 3, "bush"], [3, 3, "oak"]];

function drive(S, updates, until) {
    for (let i = 0; i < updates; i++) { S.update(); if (until && until()) return i + 1; }
    return until ? -1 : updates;
}
const totalOf = (S, type) => S.I.all().filter(it => it.type === type).reduce((n, it) => n + it.count, 0);
const groundOf = (S, type, x, y) => S.I.atIn(S.area, x, y).filter(it => it.type === type).reduce((n, it) => n + it.count, 0);
const carriedOf = (S, u, type) => S.I.inventoryOf(u.id).filter(it => it.type === type).reduce((n, it) => n + it.count, 0);
const jobOf = (S, u) => S.J.of(u.id);
const needs = u => u.data.needs;
const near = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
/** Ends the calendar day and runs the plugin's needs tick at once, so the reckoning reads exactly the values just set. */
function nextDay(S) { S.time.day += 1; S.time.hour = 10; S.C.tickNeeds(); }
const close = (a, b) => Math.abs(a - b) < 1e-6;

//-----------------------------------------------------------------------------
// Checks

console.log("=== Survival needs loop, SRD 5.1 model (DEUS_Colonists.js) headless checks ===");
try {
    const S = makeFixture(20260922);
    const { W, O, I, J, P, C, area } = S;
    const cancelled = [], died = [], drinks = [];
    S.sandbox.UF.Events.on("jobs:failed", j => cancelled.push({ id: j.id, type: j.type, reason: j.reason, unit: j.assigned }));
    S.sandbox.UF.Events.on("jobs:done", (j, u) => { if (j.type === "drink") drinks.push(u ? u.id : null); });
    S.sandbox.UF.Events.on("colonists:died", (u, cause) => died.push({ id: u.id, cause }));
    const berry = catalog.items.types.find(t => t.id === "berries"), rations = catalog.items.types.find(t => t.id === "rations"), fruit = catalog.items.types.find(t => t.id === "fruit");
    const LB = berry.food.nutrition;
    const perDay = Math.ceil(1 / LB);

    check("plugins_load", !!C && typeof C.tickNeeds === "function" && typeof C.exhaustionEffects === "function" && typeof C._internal.endOfDay === "function",
        `UF.Colonists with tickNeeds/exhaustionEffects/endOfDay; a berry feeds ${LB} lb of the day's pound (weighs ${berry.weight} lb), so a day is ${perDay} berries`);
    check("food_data_contract", (foodData.changed || !foodData.notes.length) && !!rations && rations.srd === "srd:gear:rations-1-day" && rations.weight === 2 && rations.food.nutrition === 1 && rations.food.water === 0 && rations.food.source === "srd:gear:rations-1-day" &&
        catalog.items.types.filter(t => t.food).every(t => Number.isFinite(t.weight) && Number.isFinite(t.food.nutrition) && Number.isFinite(t.food.water) && (t.food.source === "deus" || t.food.source.startsWith("srd:"))) && fruit.food.water === 0.05 && I.weightOf({ type: "rations", count: 1 }) === 2,
        `${catalog.items.types.filter(t => t.food).length} food items carry weight, nutrition and water; rations: ${rations ? `${rations.weight} lb, feeds ${rations.food.nutrition} day, ${rations.srd}` : "missing"}; DEUS-marked: ${catalog.items.types.filter(t => t.food && t.food.source === "deus").map(t => t.id).join(" ")}`);

    // A. The SRD record: no meters. An old meter record is replaced on sight; nothing drifts within a day.
    S.founders[1].data.needs = { hunger: 50, thirst: 40, sleep: 10 };
    drive(S, 16);
    const n0 = needs(S.founders[0]);
    check("needs_srd_record", S.founders.every(u => needs(u) && needs(u).model === "srd" && needs(u).foodLb === 0 && needs(u).waterGal === 0 && needs(u).exhaustion === 0 && needs(u).daysWithoutFood === 0 && needs(u).hunger === undefined),
        `founder #${S.founders[0].id}: ${JSON.stringify(n0)}; founder #${S.founders[1].id}'s meter record replaced: ${needs(S.founders[1]).hunger === undefined}`);
    P.setEnabled(false);
    const snap = JSON.stringify(S.founders.map(u => [needs(u).foodLb, needs(u).daysWithoutFood, needs(u).exhaustion]));
    drive(S, 600);
    check("no_meter_drift", JSON.stringify(S.founders.map(u => [needs(u).foodLb, needs(u).daysWithoutFood, needs(u).exhaustion])) === snap,
        "600 updates within one day changed no founder's food, days-without-food or exhaustion (the SRD counts days, not ticks)");

    // B. Idle founders drink the day's gallon once, and one with berries eats until the day's pound is reached.
    const F2 = S.founders[1];
    I.create("berries", perDay + 3, { holder: F2.id });
    P.setEnabled(true);
    const pre = P._internal.chooseSite(W.state.colony, P.blueprint("communal_shelter"), P.config());
    if (pre) for (const [dx, dy, id] of PLANTS) O.setIn(area, pre.x + dx, pre.y + dy, id);
    P.tick();
    const p = P.active()[0] || null;
    const n1 = drive(S, 4000, () => S.founders.every(u => needs(u).waterGal >= 1) && needs(F2).foodLb >= 1 && !(jobOf(S, F2) && jobOf(S, F2).type === "eat"));
    const oneDrinkEach = S.founders.every(u => drinks.filter(id => id === u.id).length === 1);
    check("drinks_a_gallon_a_day", n1 > 0 && oneDrinkEach && S.founders.every(u => needs(u).waterGal >= 1),
        `after ${n1} updates every founder has drunk exactly once (gallons ${S.founders.map(u => needs(u).waterGal).join(" ")}; food adds a little water on top)`);
    check("eats_a_pound_a_day", n1 > 0 && close(needs(F2).foodLb, perDay * LB) && carriedOf(S, F2, "berries") === 3,
        `#${F2.id} ate ${perDay + 3 - carriedOf(S, F2, "berries")} berries (${perDay} expected) for ${needs(F2).foodLb} lb and stopped; ${carriedOf(S, F2, "berries")} left in its pack`);
    // Nutrition is not weight: one ration (2 lb) feeds the whole day; fruit adds water as well as food.
    {
        const X = S.founders[2], Y = S.founders[3];
        I.create("rations", 2, { holder: X.id });
        I.create("fruit", 6, { holder: Y.id });
        const waterY = needs(Y).waterGal;
        const m = drive(S, 1500, () => needs(X).foodLb >= 1 && needs(Y).foodLb >= 1 && !(jobOf(S, X) && jobOf(S, X).type === "eat") && !(jobOf(S, Y) && jobOf(S, Y).type === "eat"));
        const fruitEaten = 6 - carriedOf(S, Y, "fruit");
        check("nutrition_and_water_are_not_weight", m > 0 && carriedOf(S, X, "rations") === 1 && close(needs(X).foodLb, 1) && fruitEaten === Math.ceil(1 / fruit.food.nutrition) && close(needs(Y).foodLb, fruitEaten * fruit.food.nutrition) && close(needs(Y).waterGal - waterY, fruitEaten * fruit.food.water),
            `#${X.id} ate 1 ration (2 lb) for ${needs(X).foodLb} lb of the day (1 expected) and kept ${carriedOf(S, X, "rations")}; #${Y.id} ate ${fruitEaten} fruit for ${needs(Y).foodLb} lb and ${(needs(Y).waterGal - waterY).toFixed(2)} gal (${(fruitEaten * fruit.food.water).toFixed(2)} expected)`);
    }

    // C. Supper (the last meal hour) interrupts labor that leaves the day's food short; a carried stack stays at the
    //    worker's feet. A need known to be unmeetable never preempts, so the larder is stocked first and one founder
    //    is kept busy on a long haul with its earlier "nothing to eat" cooldown cleared. The listener reads the scene
    //    at the moment of the cut: UF_Jobs' cancel has already put the carried stack down and released reservations.
    W.state.colony.stockpiles.push({ x: SITE.x + 5, y: SITE.y, stores: ["food"], step: "larder" });
    O.setIn(area, SITE.x + 5, SITE.y, "stockpile");
    I.drop(area, SITE.x + 5, SITE.y, "berries", 40);
    const H = S.founders[0];
    { const j = jobOf(S, H); if (j) J.cancel(j.id, "test: scenario"); }
    for (const k of [...C._internal.avoid.keys()]) if (k.startsWith(`${H.id}:`)) C._internal.avoid.delete(k);
    const stack = I.atIn(area, SITE.x, 8).find(it => it.type === "log");
    const hA = stack ? J.create({ type: "haul", target: { area: { x: 0, y: 0 }, x: SITE.x, y: 8, z: 0 }, params: { itemId: stack.id, to: { area: { x: 0, y: 0 }, x: SITE.x, y: 56, z: 0 } }, owner: H.id }) : null;
    const n2 = hA ? drive(S, 400, () => carriedOf(S, H, "log") > 0) : -1;
    S.time.hour = 19;
    const supper = [];
    const onCut = j => {
        if (!hA || j.id !== hA.id) return;
        const it = I.get(j.params.itemId);
        supper.push({ id: j.id, reason: j.reason, type: it ? it.type : "?", atFeet: it ? groundOf(S, it.type, H.x, H.y) : 0, carried: it ? carriedOf(S, H, it.type) : -1,
            inv: I.inventoryOf(H.id).map(x => `${x.type}x${x.count}`).join("+"),
            released: J.reservation.reservedBy(j.target) !== H.id && J.reservation.reservedBy(j.params.itemId) !== H.id, foodLb: needs(H).foodLb });
    };
    S.sandbox.UF.Events.on("jobs:failed", onCut);
    const n3 = hA ? drive(S, 300, () => supper.length > 0) : -1;
    S.sandbox.UF.Events.off("jobs:failed", onCut);
    const cut = supper[0] || null;
    check("supper_preempts_labor", n2 > 0 && n3 > 0 && !!cut && cut.reason === "survival: hunger" && cut.foodLb < 1 && cut.atFeet >= 1 && cut.carried === 0 && cut.released,
        cut ? `at 19:00 with ${cut.foodLb} lb eaten, #${H.id}'s haul #${cut.id} (carrying ${cut.type}) was cancelled "${cut.reason}" after ${n3} updates; ${cut.atFeet} ${cut.type} at its feet, ${cut.carried} items carried${cut.inv ? ` (${cut.inv})` : ""}, reservations ${cut.released ? "released" : "kept"}` : `#${H.id}'s haul was not cut in ${n3} updates (picked up after ${n2})`);
    // The cut founder eats its pound from the larder (one eater at a time at a one-cell larder, eight hungry founders)
    // and goes back to the project.
    const n4 = H ? drive(S, 6000, () => needs(H).foodLb >= 1) : -1;
    // Back in the pool: no need stands in the way, and the decision the sweep runs yields labor (or nothing at all
    // when the project has no open job at that moment).
    const n5 = H ? drive(S, 900, () => { const j = jobOf(S, H); return !j || (j.params && j.params.project === p.id); }) : -1;
    let resumed = false, how = "no hauler";
    if (H) {
        const j = jobOf(S, H);
        if (j && j.params && j.params.project === p.id) { resumed = true; how = `took ${j.type}#${j.id} on its own`; }
        else if (!j) {
            const d = C.decide(H);
            const openWork = J.open().filter(x => x.params && x.params.project).length;
            resumed = (!!d && !["eat", "drink", "sleep"].includes(d.type)) || (!d && openWork === 0);
            how = d ? `decide -> ${d.type}#${d.id}` : `decide -> nothing, ${openWork} open project jobs`;
        } else how = `still ${j.type}#${j.id}`;
    }
    check("labor_resumes_after_supper", n4 > 0 && n5 > 0 && close(needs(H).foodLb, perDay * LB) && C._internal.urgent(H) === null && resumed,
        H ? `#${H.id} ate its pound from the larder after ${n4} updates; ${how} after ${n5} more (no need pending: ${C._internal.urgent(H) === null})` : "no hauler");

    // D. The day's reckoning: a pound resets the count, half a pound is half a day, nothing is a whole day.
    S.time.hour = 10;
    for (const u of S.founders) { const j = jobOf(S, u); if (j && (j.type === "eat" || j.type === "fetch" || j.type === "gather")) J.cancel(j.id, "test: scenario over"); }
    for (const it of I.all().filter(it => it.type === "berries")) I.remove(it.id);
    const [A, B, Cc, D, E, G, R] = S.founders.filter(u => u !== H).slice(0, 7);
    for (const u of S.founders) { needs(u).waterGal = 1; needs(u).foodLb = 1; needs(u).daysWithoutFood = 2; }
    needs(A).foodLb = 1; needs(B).foodLb = 0.5; needs(Cc).foodLb = 0;
    nextDay(S);
    check("day_end_food_counts", needs(A).daysWithoutFood === 0 && needs(B).daysWithoutFood === 2.5 && needs(Cc).daysWithoutFood === 3 && S.founders.every(u => needs(u).foodLb === 0 && needs(u).waterGal === 0 && needs(u).exhaustion === 0),
        `after the day ended: a pound -> ${needs(A).daysWithoutFood} days without food, half a pound -> ${needs(B).daysWithoutFood}, nothing -> ${needs(Cc).daysWithoutFood}; the day's food and water counters reset; no exhaustion yet`);

    // E. Starvation: past 3 + Con modifier days without food, each day's end adds a level.
    const starveAll = () => { for (const u of S.founders) { needs(u).waterGal = 1; needs(u).foodLb = 0; needs(u).daysWithoutFood = Math.min(needs(u).daysWithoutFood, 2); } };
    starveAll(); needs(Cc).daysWithoutFood = 3; nextDay(S);
    const ex1 = needs(Cc).exhaustion;
    starveAll(); needs(Cc).daysWithoutFood = 4; nextDay(S);
    check("starvation_exhaustion", ex1 === 1 && needs(Cc).exhaustion === 2 && needs(Cc).fromNeeds === 2 && C._internal.conModOf(Cc) === 0,
        `#${Cc.id} (Con modifier ${C._internal.conModOf(Cc)}, limit 3 days): day 4 without food -> exhaustion ${ex1}, day 5 -> ${needs(Cc).exhaustion} (from hunger ${needs(Cc).fromNeeds})`);

    // F. Water: none costs a level, two when already exhausted; half a gallon rides on a DC 15 Constitution save.
    starveAll(); for (const u of S.founders) needs(u).foodLb = 1;
    needs(D).waterGal = 0; needs(D).exhaustion = 0; needs(D).fromNeeds = 0;
    needs(E).waterGal = 0.5; needs(E).exhaustion = 0; needs(E).fromNeeds = 0;
    const dayNo = C._internal.dayNumber() + 1; // the reckoning runs on the new day
    const d20 = 1 + Math.floor((hash32(W.state.seed, 0xc0, E.id, dayNo, 15) / 4294967296) * 20);
    nextDay(S);
    const w1 = needs(D).exhaustion;
    for (const u of S.founders) { needs(u).foodLb = 1; needs(u).waterGal = 1; }
    needs(D).waterGal = 0;
    nextDay(S);
    const expectE = d20 + C._internal.conModOf(E) < 15 ? 1 : 0;
    check("water_rules", w1 === 1 && needs(D).exhaustion === 3 && needs(E).exhaustion === expectE,
        `#${D.id} no water: ${w1} level, then ${needs(D).exhaustion} (two more while already exhausted); #${E.id} half a gallon: seeded d20 ${d20} ${d20 < 15 ? "fails" : "passes"} DC 15 -> ${needs(E).exhaustion} level(s)`);

    // G. The ladder (SRD p. 358) as other systems read it.
    const table = [0, 1, 2, 3, 4, 5, 6].map(l => { const u = { data: { needs: { model: "srd", exhaustion: l } } }; const e = C.exhaustionEffects(u); return [e.speedFactor, e.hpMaxFactor, e.disadvantageOnChecks ? 1 : 0, e.disadvantageOnAttacksAndSaves ? 1 : 0, e.dead ? 1 : 0].join(""); });
    // SRD p. 358: 1 checks, 2 speed halved, 3 attacks and saves, 4 hit point maximum halved, 5 speed 0, 6 death.
    check("exhaustion_effects_ladder", table.join(" ") === "11000 11100 0.51100 0.51110 0.50.5110 00.5110 00.5111" && C.exhaustionEffects({ data: { needs: { model: "srd", exhaustion: 2 } } }).text === "speed halved",
        `levels 0..6 -> [speed, hp max, checks, attacks, dead]: ${table.join(" ")}`);

    // H. Level 5 stops labor (only rest remains); level 6 kills.
    for (const u of S.founders) { needs(u).foodLb = 1; needs(u).waterGal = 1; needs(u).exhaustion = Math.min(needs(u).exhaustion, 2); }
    { const j = jobOf(S, G); if (j) J.cancel(j.id, "test: scenario"); }
    O.setIn(area, 20, 50, "oak");
    const gJob = J.create({ type: "chop", target: { area: { x: 0, y: 0 }, x: 20, y: 50, z: 0 }, owner: G.id }); // 240 ticks of work, the job to lose
    const n6 = gJob && gJob.state !== "failed" ? 1 : -1;
    needs(G).exhaustion = 4; needs(G).fromNeeds = 4; needs(G).daysWithoutFood = 3; needs(G).foodLb = 0; needs(G).waterGal = 1;
    for (const u of S.founders) if (u !== G) { needs(u).foodLb = 1; needs(u).waterGal = 1; }
    nextDay(S);
    const gCut = gJob ? cancelled.find(c => c.id === gJob.id) : null;
    const n7 = drive(S, 300, () => { const j = jobOf(S, G); return !!j && j.type === "sleep" && j.params.longRest; });
    const gRest = jobOf(S, G);
    check("level5_stops_labor", n6 > 0 && !!gJob && needs(G).exhaustion === 5 && !!gCut && gCut.reason === "survival: exhaustion" && n7 > 0 && !!gRest && gRest.target.x === G.x && gRest.target.y === G.y,
        `#${G.id} at level 5: ${gJob ? `${gJob.type}#${gJob.id}` : "no job"} ${gCut ? `cancelled "${gCut.reason}"` : "kept"}; now ${gRest ? `resting where it stands (${gRest.target.x},${gRest.target.y})` : "not resting"}`);
    needs(G).foodLb = 0; needs(G).waterGal = 1; needs(G).daysWithoutFood = 4;
    for (const u of S.founders) if (u !== G) { needs(u).foodLb = 1; needs(u).waterGal = 1; }
    nextDay(S);
    check("level6_kills", died.length === 1 && died[0].id === G.id && died[0].cause === "hunger" && G.data.dead === true && !W.unit(G.id) && C.list().length === 7,
        `${died.length} death(s): ${died.map(d => `#${d.id} of ${d.cause}`).join(" ")}; #${G.id} ${W.unit(G.id) ? "still in the world" : "removed"}, ${C.list().length} colonists left`);

    // I. The long rest at night: hit points back; a level off only with the full day's food and drink.
    for (const u of C.list()) { needs(u).foodLb = 1; needs(u).waterGal = 1; }
    needs(R).exhaustion = 2; needs(R).fromNeeds = 2; needs(R).foodLb = 0.5; needs(R).waterGal = 1; R.data.hp = 3; R.data.maxHp = 10;
    S.time.hour = 1;
    const n8 = drive(S, 300, () => { const j = jobOf(S, R); return !!j && j.type === "sleep" && j.params.longRest; });
    const rest1 = jobOf(S, R);
    const n9 = rest1 ? drive(S, 40000, () => rest1.state === "done" || rest1.state === "failed") : -1;
    const afterHalf = needs(R).exhaustion, restedDay = needs(R).lastRestDay;
    needs(R).lastRestDay = null; needs(R).foodLb = 1; needs(R).waterGal = 1;
    const n10 = drive(S, 300, () => { const j = jobOf(S, R); return !!j && j.type === "sleep" && j.params.longRest; });
    const rest2 = jobOf(S, R);
    const n11 = rest2 ? drive(S, 40000, () => rest2.state === "done" || rest2.state === "failed") : -1;
    check("long_rest_rules", n8 > 0 && n9 > 0 && rest1.state === "done" && rest1.params.frames === 8 * 3600 && R.data.hp === 10 && afterHalf === 2 && restedDay === C._internal.dayKey() && n10 > 0 && n11 > 0 && rest2.state === "done" && needs(R).exhaustion === 1,
        `#${R.id} at 01:00: rest of ${rest1 ? rest1.params.frames : "?"} ticks ${rest1 ? rest1.state : "?"}; hit points 3 -> ${R.data.hp}; exhaustion stayed ${afterHalf} on half a pound, then ${needs(R).exhaustion} after a rest on the full pound and gallon`);
    check("no_errors_main", errors.length === 0, errors.length ? errors[0].slice(0, 200) : "no console errors in the main run");

    // J. No water in the world: one search, one thought, then a long cooldown; the colonist keeps working meanwhile.
    {
        const Dw = makeFixture(3, { pond: false });
        Dw.P.setEnabled(false);
        drive(Dw, 16);
        const u = Dw.founders[0];
        Dw.W.counters.getTile = 0;
        const thoughts = () => (u.data.thoughts || []).filter(t => t.text === "Found no water to drink.").length;
        drive(Dw, 1200);
        const scans = Dw.W.counters.getTile / (121 * 121);
        check("unreachable_water_no_thrash", thoughts() === 2 && scans <= 8 * 2 + 0.5,
            `over 1200 updates with no water: ${thoughts()} "found no water" thoughts for #${u.id} (2 expected: one per 600-tick cooldown), ${scans.toFixed(1)} full water searches for 8 founders (16 expected; a search every decision would make ${8 * Math.floor(1200 / 60)})`);
    }

    check("no_errors", errors.length === 0, errors.length ? errors[0].slice(0, 200) : "no console errors during the run");
} catch (e) {
    console.error(e && e.stack || e);
    console.log(`RESULT: ${passed} passed, ${failed} failed (harness error, exit 2)`);
    process.exit(2);
}

console.log(`\nRESULT: ${passed} passed, ${failed} failed (exit ${failed === 0 ? 0 : 1})`);
process.exit(failed === 0 ? 0 : 1);
