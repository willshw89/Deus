"use strict";
// tools/test_multi_deficit_settlement.js - Headless checks for DEUS-TSK-FABLE-06: the settlement brain measures four
// deficits (shelter, food in colonist-days of nutrition, sheltered beds, storage slots), ranks candidate projects by
// utility, never opens a project for a need an active project already covers, and the founders carry the new project
// kinds through on their own: a 3x3 communal stockpile, bedding inside sheltered space, a food cache that builds a
// larder and forages wild food into it.
//
// Runs the real DEUS_Objects.js, DEUS_Items.js, DEUS_Jobs.js, DEUS_Projects.js and DEUS_Colonists.js in a Node vm
// against a World double (one 64x64 ground area with a pond) and the real catalog. The driver only calls
// Game_Map.update; fixtures set up the settlement's supplies directly.
//
// Usage: node tools/test_multi_deficit_settlement.js [--mutant=<name>] [--quiet]
//   --mutant   patches DEUS_Projects.js in memory; the run must then FAIL (Rule 4):
//              no_dup_prevention (active projects' capacity is ignored), no_priority (every candidate scores alike),
//              weight_not_nutrition (food is measured by weight)
// Exit code: 0 all checks passed, 1 a check failed, 2 harness problem.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const mutant = (process.argv.find(a => a.startsWith("--mutant=")) || "").slice(9);
const quiet = process.argv.includes("--quiet");

const MUTANTS = {
    no_dup_prevention: ["const unmet = Math.max(0, row.deficit - inFlightCapacity);", "const unmet = Math.max(0, row.deficit);"],
    no_priority: ["const utility = unmet > 0 ? severity * fraction + bonus - activeOfKind * 10 : -Infinity;", "const utility = unmet > 0 ? 0 : -Infinity;"],
    weight_not_nutrition: ["return t && t.food && Number.isFinite(t.food.nutrition) ? t.food.nutrition * (it.count | 0) : 0; };", "return t && t.food ? I.weightOf(it) : 0; };"]
};

const catalogText = fs.readFileSync(path.join(ROOT, "game", "data", "UF_WorldCatalog.json"), "utf8");
const read = name => fs.readFileSync(path.join(PLUGINS, name), "utf8");
const sources = { objects: read("DEUS_Objects.js"), items: read("DEUS_Items.js"), jobs: read("DEUS_Jobs.js"), projects: read("DEUS_Projects.js"), colonists: read("DEUS_Colonists.js") };
if (mutant) {
    const m = MUTANTS[mutant];
    if (!m) { console.error(`unknown mutant "${mutant}" (known: ${Object.keys(MUTANTS).join(", ")})`); process.exit(2); }
    if (!sources.projects.includes(m[0])) { console.error(`mutant "${mutant}": pattern not found in DEUS_Projects.js`); process.exit(2); }
    sources.projects = sources.projects.replace(m[0], m[1]);
    console.log(`MUTANT ${mutant}: DEUS_Projects.js patched in memory; this run must FAIL`);
}

let passed = 0, failed = 0;
function check(name, condition, detail = "") {
    if (condition) { passed++; console.log(`PASS brain.${name}${detail ? " - " + detail : ""}`); }
    else { failed++; console.log(`FAIL brain.${name}${detail ? " - " + detail : ""}`); }
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
    const S = { sandbox, W, O: sandbox.UF.Objects, I: sandbox.UF.Items, J: sandbox.UF.Jobs, P: sandbox.UF.Projects, C: sandbox.UF.Colonists, map: new sandbox.Game_Map(), area: { x: 0, y: 0, z: 0 }, catalog };
    S.now = () => clock;
    S.update = () => { clock++; W._frame = clock; W.walkUnits(); S.map.update(true); };
    return S;
}

//-----------------------------------------------------------------------------
// Fixtures: the camp in miniature, with the supplies each scenario needs

const SIZE = 64, SITE = { x: 32, y: 32 }, RADIUS = 4;
function makeFixture(seed, opts = {}) {
    const catalog = JSON.parse(catalogText);
    catalog.colony.projects = Object.assign({}, catalog.colony.projects, opts.config || {});
    const S = makeSandbox(seed, SIZE, catalog);
    const { W, O, I, area } = S;
    for (let y = 30; y <= 34; y++) for (let x = 44; x <= 46; x++) W.water.add(y * SIZE + x);
    O.setIn(area, SITE.x, SITE.y, "campfire");
    for (let dy = -RADIUS; dy <= RADIUS; dy++) for (let dx = -RADIUS; dx <= RADIUS; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== RADIUS || dx === 0) continue;
        O.setIn(area, SITE.x + dx, SITE.y + dy, "wall_wood");
    }
    if (opts.door) O.setIn(area, SITE.x, SITE.y - RADIUS, "door_wood"); // a door set into the ring: one shelter
    const bedCells = [[-2, -1], [2, -1], [-2, 1], [2, 1], [-1, -2], [1, -2], [-1, 2], [1, 2]];
    for (const [dx, dy] of bedCells.slice(0, opts.beds === undefined ? 3 : opts.beds)) O.setIn(area, SITE.x + dx, SITE.y + dy, "floor_straw");
    W.state.colony = { version: 2, factionId: "player", siteId: 1, site: { x: SITE.x, y: SITE.y }, area: { x: 0, y: 0 }, z: 0, radius: RADIUS,
        plan: JSON.parse(JSON.stringify(catalog.colony.plan)).map(s => Object.assign(s, { done: false })), stockpiles: [], log: [] };
    if (opts.larder) {
        const L = { x: SITE.x + 5, y: SITE.y };
        O.setIn(area, L.x, L.y, "stockpile");
        W.state.colony.stockpiles.push({ x: L.x, y: L.y, stores: ["food"], step: "larder" });
        for (const [type, n] of Object.entries(opts.larder)) I.drop(area, L.x, L.y, type, n);
        S.larder = L;
    }
    for (let i = 0; i < (opts.stockpileCells || 0); i++) {
        const x = SITE.x - 5, y = SITE.y - 3 + i;
        O.setIn(area, x, y, "stockpile");
        W.state.colony.stockpiles.push({ x, y, stores: ["wood", "stone", "material"] });
    }
    if (opts.groundFood) for (const [type, n, x, y] of opts.groundFood) I.drop(area, x, y, type, n);
    if (opts.wildFood) for (const [id, x, y] of opts.wildFood) O.setIn(area, x, y, id);
    const seats = [[-1, -3], [1, -3], [-3, 0], [3, 0], [-1, 3], [1, 3], [0, -1], [0, 1]];
    S.founders = seats.map((s, i) => W.addUnit({ x: SITE.x + s[0], y: SITE.y + s[1], data: { kind: "colonist", faction: "player", founder: true, age: 25, gender: i % 2 ? "female" : "male", inventory: [], site: 1 } }));
    I.drop(area, SITE.x, 8, "log", 40);
    I.drop(area, 8, SITE.x, "stone", 20);
    I.drop(area, SITE.x, 9, "straw", 30);
    drive(S, 16); // the first needs tick: SRD records on the founders
    if (opts.fed) for (const u of S.founders) { const n = S.C.needsOf(u); n.foodLb = 1; n.waterGal = 1; }
    return S;
}
function drive(S, updates, until) {
    for (let i = 0; i < updates; i++) { S.update(); if (until && until()) return i + 1; }
    return until ? -1 : updates;
}
const objectAt = (S, x, y) => { const t = S.O.atIn(S.area, x, y); return t ? t.id : null; };
const round3 = v => Math.round(v * 1000) / 1000;
const close = (a, b) => Math.abs(a - b) < 1e-6;
const nutritionOf = (cat, id) => cat.items.types.find(t => t.id === id).food.nutrition;
const weightOf = (cat, id) => cat.items.types.find(t => t.id === id).weight;
/** The brain's formula, recomputed here from the same configuration, for one deficit row. */
function expectedUtility(cfg, key, row, inFlightCapacity, activeOfKind) {
    if (key === "housing") return -Infinity; // a cottage never opens in the camp phase (DEUS-TSK-FABLE-16); these fixtures are camps
    const unmet = Math.max(0, row.deficit - inFlightCapacity);
    const fraction = row.needed > 0 ? Math.min(1, unmet / row.needed) : 0;
    const critical = key === "food" && row.critical;
    const severity = critical ? cfg.severity.foodCritical : cfg.severity[key];
    const bonus = (critical ? cfg.survivalBonus.foodCritical : 0) + (key === "shelter" && unmet > 0 ? cfg.survivalBonus.shelter : 0);
    return unmet > 0 ? severity * fraction + bonus - activeOfKind * 10 : -Infinity;
}

//-----------------------------------------------------------------------------
// Checks

console.log("=== Multi-deficit settlement brain (DEUS_Projects.js) headless checks ===");
try {
    // A. Four deficits, food in colonist-days of nutrition, never weight.
    const A = makeFixture(20260923, { larder: { berries: 20, rations: 4 }, groundFood: [["fruit", 8, 20, 20]], fed: true });
    const cat = A.catalog, cfg = A.P.config();
    check("plugins_load", typeof A.P.brain === "function" && A.P.deficits.join(",") === "shelter,food,bed,storage,housing" && Object.keys(A.P.blueprints()).length === 5,
        `UF.Projects brain with deficits ${A.P.deficits.join("/")} and blueprints ${Object.keys(A.P.blueprints()).join(", ")}`);
    const d = A.P.evaluateDeficits(A.area);
    // Storage in physical slots (DEUS-TSK-GEMINI-07): the one-cell larder is one slot (a container on it would add its
    // slots); each colonist needs slotsPerColonist.
    const larderSlots = 1;
    const lb = 20 * nutritionOf(cat, "berries") + 4 * nutritionOf(cat, "rations") + 8 * nutritionOf(cat, "fruit");
    const lbByWeight = 20 * weightOf(cat, "berries") + 4 * weightOf(cat, "rations") + 8 * weightOf(cat, "fruit");
    check("deficits_measured_by_nutrition", !!d && d.population === 8 && close(d.food.lb, round3(lb)) && close(d.food.current, round3(lb / 8)) && close(d.food.larderLb, round3(20 * nutritionOf(cat, "berries") + 4 * nutritionOf(cat, "rations"))) && close(d.food.groundLb, round3(8 * nutritionOf(cat, "fruit"))) && close(d.food.deficit, round3(3 - lb / 8)) && d.food.critical === false && !close(lb, lbByWeight) &&
        d.storage.needed === 8 * cfg.slotsPerColonist && d.storage.current === larderSlots && d.storage.deficit === 8 * cfg.slotsPerColonist - larderSlots && d.bed.needed === 8 && d.bed.current === 3 && d.bed.deficit === 5 && d.shelter.needed === 1 && d.shelter.current === 0,
        d ? `food ${d.food.lb} lb of nutrition (${lbByWeight.toFixed(1)} lb by weight) = ${d.food.current} colonist-days, needs ${d.food.deficit} more; storage ${d.storage.current}/${d.storage.needed} slots; beds ${d.bed.current}/${d.bed.needed} sheltered; shelter ${d.shelter.current}/${d.shelter.needed}` : "no evaluation");

    // B. Ranking by utility: the shelter first here (food is short but not critical).
    const b = A.P.brain();
    const order = b ? b.candidates.map(c => `${c.kind}:${c.utility === -Infinity ? "-" : c.utility.toFixed(2)}`) : [];
    const expected = b ? b.candidates.every(c => close(c.utility === -Infinity ? -1e9 : c.utility, expectedUtility(cfg, c.deficit, d[c.deficit], 0, 0) === -Infinity ? -1e9 : expectedUtility(cfg, c.deficit, d[c.deficit], 0, 0))) : false;
    const cycle = A.P.tick();
    const first = A.P.active()[0] || null;
    check("brain_ranks_by_utility", !!b && expected && b.chosen && b.chosen.kind === "communal_shelter" && b.candidates[0].kind === "communal_shelter" && b.candidates[1].kind === "food_cache" && !!first && first.kind === "communal_shelter" && cycle.opened.length === 1 && first.capacity.shelter === 1 && first.capacity.bed === 11,
        `${order.join("  ")}; opened ${first ? first.kind : "nothing"} adding ${first ? JSON.stringify(first.capacity) : "-"}`);

    // C. No project spam: with the founders idle, twelve cycles open at most one project per kind, and none for beds
    //    while the shelter project's eight beds already cover them.
    A.C.setEnabled(false);
    for (let i = 0; i < 12; i++) A.P.tick();
    const kinds = A.P.list().map(p => p.kind);
    const perKind = kinds.reduce((m, k) => Object.assign(m, { [k]: (m[k] || 0) + 1 }), {});
    const bedRow = A.P.brain().candidates.find(c => c.kind === "bedding_expansion");
    check("no_project_spam", A.P.list().length === 3 && perKind.communal_shelter === 1 && perKind.food_cache === 1 && perKind.communal_stockpile === 1 && !perKind.bedding_expansion && !perKind.household_cottage && bedRow && bedRow.unmet === 0 && bedRow.inFlightCapacity === 11,
        `after 12 cycles: ${JSON.stringify(perKind)}; beds: deficit ${bedRow ? bedRow.total : "?"}, ${bedRow ? bedRow.inFlightCapacity : "?"} covered by the shelter, unmet ${bedRow ? bedRow.unmet : "?"}`);

    // D. Critical food outranks the shelter; the food cache builds a larder, then forages wild food into it.
    const F = makeFixture(7, { door: true, beds: 8, stockpileCells: 8, fed: true, config: { targetReserveDays: 0.5, reserveMarginDays: 0 },
        wildFood: [["fruit_tree", 24, 24], ["fruit_tree", 26, 22], ["fruit_tree", 22, 26], ["berry_bush", 40, 24], ["berry_bush", 42, 22], ["berry_bush", 24, 40], ["fruit_tree", 40, 40], ["berry_bush", 22, 40], ["fruit_tree", 44, 26], ["fruit_tree", 26, 44]] });
    const bf = F.P.brain();
    const cf = F.P.tick();
    const fp = F.P.active()[0] || null;
    check("critical_food_first", !!bf && bf.deficits.food.critical && bf.chosen && bf.chosen.kind === "food_cache" && bf.candidates[0].kind === "food_cache" && !!fp && fp.kind === "food_cache" && Array.isArray(fp.phases) && fp.phases[0].name === "larder" && fp.phases[0].cells.length === 1 && fp.phases[0].cells[0].stores.includes("food") && fp.larder && cf.opened.length === 1,
        bf ? `food ${bf.deficits.food.current}/${bf.deficits.food.needed} days (critical): ${bf.candidates.map(c => `${c.kind}:${c.utility === -Infinity ? "-" : c.utility.toFixed(1)}`).join("  ")}; opened ${fp ? F.P.describe(fp) : "nothing"}` : "no brain");
    const nf = fp ? drive(F, 20000, () => fp.state !== "active") : -1;
    const df = F.P.evaluateDeficits(F.area);
    const larderObj = fp && fp.larder ? objectAt(F, fp.larder.x, fp.larder.y) : null;
    const larderRegistered = fp && fp.larder ? F.W.state.colony.stockpiles.some(s => s.x === fp.larder.x && s.y === fp.larder.y && s.stores.includes("food")) : false;
    check("food_cache_forages_to_target", nf > 0 && !!fp && fp.state === "done" && larderObj === "stockpile" && larderRegistered && !!df && df.food.current >= 0.5 && df.food.deficit === 0 && df.food.larderLb > 0,
        fp ? `${fp.state} after ${nf} updates: larder ${larderObj || "missing"} at (${fp.larder.x},${fp.larder.y}) ${larderRegistered ? "registered for food" : "not registered"}; reserve ${df ? df.food.current : "?"} days (${df ? df.food.larderLb : "?"} lb in the larder, ${df ? df.food.groundLb : "?"} lb on the ground)` : "no food project");

    // E. Beds inside sheltered space: four missing, one bedding project of capacity four, never a second.
    const B = makeFixture(11, { door: true, beds: 4, larder: { rations: 24 }, stockpileCells: 8, fed: true });
    const bb = B.P.brain();
    B.P.tick();
    const bp = B.P.active()[0] || null;
    for (let i = 0; i < 5; i++) B.P.tick();
    const bedding = B.P.list().filter(p => p.kind === "bedding_expansion");
    const sheltered = new Set(B.P.sheltered().map(c => `${c.x},${c.y}`));
    const insideRing = bp ? bp.phases[0].cells.every(c => sheltered.has(`${c.x},${c.y}`) && Math.max(Math.abs(c.x - SITE.x), Math.abs(c.y - SITE.y)) <= RADIUS - 1) : false;
    check("duplicate_prevention_beds", !!bb && bb.chosen && bb.chosen.kind === "bedding_expansion" && bb.deficits.bed.deficit === 4 && !!bp && bp.kind === "bedding_expansion" && bp.capacity.bed === 4 && bp.phases[0].cells.length === 4 && insideRing && bedding.length === 1 && B.P.active().length === 1,
        bp ? `${B.P.describe(bp)}; capacity ${JSON.stringify(bp.capacity)}, cells ${bp.phases[0].cells.map(c => `(${c.x},${c.y})`).join(" ")} all sheltered; ${bedding.length} bedding project(s) after six cycles` : `nothing opened (${bb ? bb.candidates.map(c => c.kind + ":" + (c.utility === -Infinity ? "-" : c.utility.toFixed(1))).join(" ") : "no brain"})`);
    const nb = bp ? drive(B, 12000, () => bp.state !== "active") : -1;
    const db = B.P.evaluateDeficits(B.area);
    check("bedding_built_by_founders", nb > 0 && !!bp && bp.state === "done" && bp.phases[0].cells.every(c => objectAt(B, c.x, c.y) === "floor_straw") && !!db && db.bed.current === 8 && db.bed.deficit === 0,
        bp ? `${bp.state} after ${nb} updates: ${bp.phases[0].cells.filter(c => objectAt(B, c.x, c.y) === "floor_straw").length}/4 beds laid; beds now ${db ? db.bed.current : "?"}/${db ? db.bed.needed : "?"}` : "no bedding project");

    // F. Storage: the only deficit left is slots; a 3x3 communal stockpile is built and registered.
    const Sx = makeFixture(13, { door: true, beds: 8, larder: { rations: 24 }, fed: true });
    const bs = Sx.P.brain();
    Sx.P.tick();
    const sp = Sx.P.active()[0] || null;
    for (let i = 0; i < 3; i++) Sx.P.tick();
    const ns = sp ? drive(Sx, 12000, () => sp.state !== "active") : -1;
    const ds = Sx.P.evaluateDeficits(Sx.area);
    const registered = sp ? Sx.P.footprint(sp).filter(c => Sx.W.state.colony.stockpiles.some(s => s.x === c.x && s.y === c.y && s.stores.includes("wood"))).length : 0;
    // A 3x3 stockpile adds nine physical slots (one per cell, DEUS-TSK-GEMINI-07); with the larder's it covers the eight needed.
    check("storage_project_builds_stockpile", !!bs && bs.chosen && bs.chosen.kind === "communal_stockpile" && !!sp && sp.kind === "communal_stockpile" && sp.capacity.storage === 9 * cfg.slotsPerStockpileCell && Sx.P.list().filter(p => p.kind === "communal_stockpile").length === 1 && ns > 0 && sp.state === "done" && Sx.P.footprint(sp).every(c => objectAt(Sx, c.x, c.y) === "stockpile") && registered === 9 && !!ds && ds.storage.current >= ds.storage.needed && ds.storage.deficit === 0,
        sp ? `${sp.state} after ${ns} updates: ${Sx.P.footprint(sp).filter(c => objectAt(Sx, c.x, c.y) === "stockpile").length}/9 stockpile cells, ${registered} registered with stores; storage now ${ds ? ds.storage.current : "?"}/${ds ? ds.storage.needed : "?"} slots; one stockpile project in ${Sx.P.list().length} project(s)` : `nothing opened (${bs ? bs.candidates.map(c => c.kind + ":" + (c.utility === -Infinity ? "-" : c.utility.toFixed(1))).join(" ") : "no brain"})`);

    check("no_errors", errors.length === 0, errors.length ? errors[0].slice(0, 200) : "no console errors during the run");
} catch (e) {
    console.error(e && e.stack || e);
    console.log(`RESULT: ${passed} passed, ${failed} failed (harness error, exit 2)`);
    process.exit(2);
}

console.log(`\nRESULT: ${passed} passed, ${failed} failed (exit ${failed === 0 ? 0 : 1})`);
process.exit(failed === 0 ? 0 : 1);
