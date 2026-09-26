"use strict";
// tools/test_settlement_projects.js - Headless checks for DEUS_Projects (settlement deficits, the reserved 5x5
// communal shelter blueprint, phased open jobs, coarse cadence, save/load).
//
// Runs the real DEUS_Objects.js, DEUS_Items.js, DEUS_Jobs.js and DEUS_Projects.js in a Node vm against a small
// World double (one 64x64 ground area: object grid, water cells, units that walk one cell per update) and the real
// catalog. Idle colonists are driven by a minimal loop (take the best open job; step off a reserved cell), standing
// in for DEUS_Colonists' open-designation step.
//
// Usage: node tools/test_settlement_projects.js [--mutant=<name>] [--quiet]
//   --mutant   patches DEUS_Projects.js in memory before loading it; the run must then FAIL (Rule 4):
//              deficit_zero, no_reserve, no_jobs, save_drift, cadence_zero, phase_order
// Exit code: 0 all checks passed, 1 a check failed, 2 harness problem.

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const mutant = (process.argv.find(a => a.startsWith("--mutant=")) || "").slice(9);
const quiet = process.argv.includes("--quiet");

const MUTANTS = {
    deficit_zero: ["deficit: Math.max(0, needed - current)", "deficit: 0"],
    no_reserve: ["return hit ? hit.id : null;", "return null;"],
    no_jobs: ["const job = J.create(spec);", "const job = null;"],
    save_drift: ["reason: null,\n            log: []", "reason: null,\n            log: [],\n            runtime: () => 0"],
    cadence_zero: ["cadenceTicks: 3000,", "cadenceTicks: 1,"],
    phase_order: ["phases: [\"site\", \"walls\", \"hearth\", \"beds\"]", "phases: [\"site\", \"hearth\", \"walls\", \"beds\"]"]
};

const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "UF_WorldCatalog.json"), "utf8"));
// This harness proves the shelter loop alone: the settlement brain (DEUS-TSK-FABLE-06) has its other blueprints
// switched off here, so a fixture without food does not open a food cache before the shelter.
catalog.colony.projects = Object.assign({}, catalog.colony.projects, { blueprints: { food_cache: null, food_foraging: null, communal_stockpile: null, communal_chest: null, bedding_expansion: null } });
const read = name => fs.readFileSync(path.join(PLUGINS, name), "utf8");
const objectsSrc = read("DEUS_Objects.js");
const itemsSrc = read("DEUS_Items.js");
const jobsSrc = read("DEUS_Jobs.js");
let projectsSrc = read("DEUS_Projects.js");
if (mutant) {
    const m = MUTANTS[mutant];
    if (!m) { console.error(`unknown mutant "${mutant}" (known: ${Object.keys(MUTANTS).join(", ")})`); process.exit(2); }
    if (!projectsSrc.includes(m[0])) { console.error(`mutant "${mutant}": pattern not found in DEUS_Projects.js`); process.exit(2); }
    projectsSrc = projectsSrc.replace(m[0], m[1]);
    console.log(`MUTANT ${mutant}: DEUS_Projects.js patched in memory; this run must FAIL`);
}

let passed = 0, failed = 0;
function check(name, condition, detail = "") {
    if (condition) { passed++; console.log(`PASS projects.${name}${detail ? " - " + detail : ""}`); }
    else { failed++; console.log(`FAIL projects.${name}${detail ? " - " + detail : ""}`); }
    return !!condition;
}
const errors = [];

//-----------------------------------------------------------------------------
// The World double (the same hash and RNG as DEUS_World.js, so seeded choices match the game's)

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
    const W = {
        EVENT_BASE: 1000,
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
                if (s) { this.lastObjectRefusal = { x, y, unitId: s.id, reason: `${t.id} can't go on (${x},${y}): ${s.name} stands there` }; emit("world:objectRefused", this.lastObjectRefusal); return false; }
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
            const u = { id, name: spec.name || `Unit ${id}`, image: spec.image || { characterName: "", characterIndex: 0 }, area: { x: 0, y: 0 }, z: 0, x: spec.x | 0, y: spec.y | 0, dir: spec.dir || 2, data: spec.data || {}, goal: null };
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
        /** One cell per update toward the goal (8-way), the double's stand-in for DEUS_World's movement. */
        walkUnits() {
            for (const u of Object.values(W.state.units)) {
                if (!u.goal) continue;
                if (u.x === u.goal.x && u.y === u.goal.y) { u.goal = null; emit("world:unitArrived", u); continue; }
                u.x += Math.sign(u.goal.x - u.x);
                u.y += Math.sign(u.goal.y - u.y);
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
        console: errorConsole,
        performance: { now: () => Date.now() },
        Sprite, Spriteset_Map, Game_Map, Scene_Boot,
        SceneManager: { _scene: null },
        DataManager: {
            makeSaveContents: () => ({ ufWorld: W.state }),
            extractSaveContents(contents) { W.state = contents.ufWorld; }
        },
        Tilemap: { isWaterTile: id => id === 2048 },
        ImageManager: { loadCharacter: () => ({}), loadTileset: () => ({}), isBigCharacter: () => true },
        $gameMap: null, $dataMap: null, $gamePlayer: null,
        $ufWorldCatalog: catalog, $deusWorldCatalog: catalog,
        require
    });
    sandbox.window = sandbox;
    sandbox.UF = {
        World: W,
        Events: {
            _listeners: {},
            on(event, cb) { (this._listeners[event] = this._listeners[event] || []).push(cb); },
            off(event, cb) { if (this._listeners[event]) this._listeners[event] = this._listeners[event].filter(x => x !== cb); },
            emit(event, ...args) { for (const cb of this._listeners[event] || []) { try { cb(...args); } catch (e) { errorConsole.error(e); } } }
        }
    };
    sandbox.DEUS = sandbox.UF;
    // Placements refused because a unit stood on the cell (UF_Jobs' build.apply consumes the materials before it places).
    const refusals = [];
    sandbox.UF.Events.on("world:objectRefused", r => refusals.push(r));
    sandbox.DEUS = sandbox.UF;
    vm.createContext(sandbox);
    vm.runInContext(objectsSrc, sandbox, { filename: "DEUS_Objects.js" });
    vm.runInContext(itemsSrc, sandbox, { filename: "DEUS_Items.js" });
    vm.runInContext(jobsSrc, sandbox, { filename: "DEUS_Jobs.js" });
    vm.runInContext(projectsSrc, sandbox, { filename: "DEUS_Projects.js" });
    return { sandbox, W, O: sandbox.UF.Objects, I: sandbox.UF.Items, J: sandbox.UF.Jobs, P: sandbox.UF.Projects, map: new sandbox.Game_Map(), area: { x: 0, y: 0, z: 0 }, refusals };
}

//-----------------------------------------------------------------------------
// The fixture: the locked start in miniature (a camp ring with two gaps, three straw beds, eight founders)

const SIZE = 64, SITE = { x: 32, y: 32 }, RADIUS = 4;
function makeFixture(seed, opts = {}) {
    const S = makeSandbox(seed, SIZE);
    const { W, O, I, area } = S;
    for (const cell of opts.water || []) W.water.add(cell[1] * SIZE + cell[0]);
    O.setIn(area, SITE.x, SITE.y, "campfire");
    for (let dy = -RADIUS; dy <= RADIUS; dy++) {
        for (let dx = -RADIUS; dx <= RADIUS; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== RADIUS) continue;
            if (dx === 0) continue; // the ring's two gaps, north and south
            O.setIn(area, SITE.x + dx, SITE.y + dy, "wall_wood");
        }
    }
    for (const [x, y] of [[SITE.x - 2, SITE.y - 1], [SITE.x + 2, SITE.y - 1], [SITE.x - 2, SITE.y + 1]]) O.setIn(area, x, y, "floor_straw");
    W.state.colony = {
        version: 2, factionId: "player", siteId: 1, site: { x: SITE.x, y: SITE.y }, area: { x: 0, y: 0 }, z: 0, radius: RADIUS,
        plan: JSON.parse(JSON.stringify(catalog.colony.plan)), stockpiles: [], log: []
    };
    const colonists = [];
    const seats = [[-1, -2], [1, -2], [-2, 0], [2, 0], [-1, 2], [1, 2], [0, -1], [0, 1]];
    for (let i = 0; i < 8; i++) {
        colonists.push(W.addUnit({ name: `TEST_Founder${i + 1}`, x: SITE.x + seats[i][0], y: SITE.y + seats[i][1], data: { kind: "colonist", faction: "player", gender: i % 2 ? "f" : "m", founder: true, inventory: [], needs: { hunger: 0, thirst: 0, sleep: 0 } } }));
    }
    // Materials lying in the open, well outside the camp: 40 logs, 20 stones, 30 straw.
    I.drop(area, SITE.x, 8, "log", 40);
    I.drop(area, 8, SITE.x, "stone", 20);
    I.drop(area, SITE.x, 8 + 1, "straw", 30);
    S.colonists = colonists;
    return S;
}

// Idle colonists: the best open job they can do now; a colonist idling on a reserved cell steps off it.
function freeCellNear(S, u, avoid) {
    for (let r = 1; r <= 8; r++) {
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
            const x = u.x + dx, y = u.y + dy;
            if (avoid(x, y)) continue;
            if (S.J.standable(S.area, x, y, u.id)) return { x, y };
        }
    }
    return null;
}
// Every log in the world: on the ground (under a wall too) or carried. Used by the tracer and the walls check.
function totalLogs(S) {
    return S.I.all().filter(it => it.type === "log").reduce((n, it) => n + it.count, 0);
}
function drive(S, updates, until) {
    let last = debug ? totalLogs(S) : 0;
    const finishedNow = [];
    const onDone = job => finishedNow.push(`${job.type}#${job.id}@${job.target.x},${job.target.y}${job.params.itemId ? " item " + job.params.itemId : ""}`);
    if (debug) { S.sandbox.UF.Events.on("jobs:done", onDone); S.sandbox.UF.Events.on("jobs:failed", onDone); }
    for (let i = 0; i < updates; i++) {
        S.W.walkUnits();
        S.map.update(true);
        if (debug) {
            const t = totalLogs(S);
            if (t !== last) { console.log(`    [trace] update ${i}: logs ${last} -> ${t}; finished: ${finishedNow.join(", ") || "-"}`); last = t; }
            finishedNow.length = 0;
        }
        for (const u of S.colonists) {
            const live = S.W.unit(u.id);
            if (!live || S.J.of(live.id)) continue;
            const p = S.P.active()[0];
            if (p && S.P.reservedAt(S.area, live.x, live.y)) {
                const cell = freeCellNear(S, live, (x, y) => x >= p.origin.x - 2 && y >= p.origin.y - 2 && x < p.origin.x + p.size + 2 && y < p.origin.y + p.size + 2);
                if (cell) { S.J.create({ type: "move", target: { area: { x: 0, y: 0 }, x: cell.x, y: cell.y, z: 0 }, owner: live.id }); continue; }
            }
            S.J.take(live.id);
        }
        if (until && until()) { if (debug) { S.sandbox.UF.Events.off("jobs:done", onDone); S.sandbox.UF.Events.off("jobs:failed", onDone); } return i + 1; }
    }
    if (debug) { S.sandbox.UF.Events.off("jobs:done", onDone); S.sandbox.UF.Events.off("jobs:failed", onDone); }
    return until ? -1 : updates;
}
const ownJobs = (S, p) => S.J.list(j => j.params && j.params.project === p.id && j.state !== "done" && j.state !== "failed");
// True when a value survives JSON (the save format) unchanged: plain objects and arrays, finite numbers, strings,
// booleans, null; no functions, undefined, NaN, Infinity, Maps, Sets or class instances (realm-independent).
function jsonSafeValue(v) {
    if (v === null || typeof v === "string" || typeof v === "boolean") return true;
    if (typeof v === "number") return Number.isFinite(v);
    if (Array.isArray(v)) return v.every(jsonSafeValue);
    if (typeof v === "object") return Object.prototype.toString.call(v) === "[object Object]" && (!v.constructor || v.constructor.name === "Object") && Object.keys(v).every(k => v[k] !== undefined && jsonSafeValue(v[k]));
    return false;
}
const debug = process.argv.includes("--debug");
function dump(S, p, label) {
    if (!debug) return;
    console.log(`--- ${label}: ${S.P.describe(p)}`);
    console.log(`    phase ${p.phase} jobs=${JSON.stringify(p.jobs)} hauls=${JSON.stringify(p.hauls)} harvests=${JSON.stringify(p.harvests)} failed=${JSON.stringify(p.failed)} blocked=${JSON.stringify(p.blocked)}`);
    for (const j of S.J.list()) console.log(`    job #${j.id} ${j.type} ${j.state} @${j.target.x},${j.target.y} to=${j.params.to ? `${j.params.to.x},${j.params.to.y}` : "-"} item=${j.params.itemId || "-"} obj=${j.params.objectId || "-"} assigned=${j.assigned} reason=${j.reason} progress=${j.progress}`);
    for (const u of S.W.units()) console.log(`    unit #${u.id} at ${u.x},${u.y} goal=${u.goal ? `${u.goal.x},${u.goal.y}` : "-"} inv=${JSON.stringify(u.data.inventory)} job=${S.J.of(u.id) ? S.J.of(u.id).id : "-"}`);
    for (const c of S.P.cells(p)) console.log(`    cell ${c.x},${c.y} ${c.object} ${c.state} here=${objectAt(S, c.x, c.y)} items=${S.I.atIn(S.area, c.x, c.y).map(i => `${i.type}x${i.count}`).join("+")}`);
}
const objectAt = (S, x, y) => { const t = S.O.atIn(S.area, x, y); return t ? t.id : null; };
const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

//-----------------------------------------------------------------------------
// Checks

console.log("=== Settlement projects (DEUS_Projects.js) headless checks ===");
try {
    const S = makeFixture(20260922, { water: (() => { const w = []; for (let y = 0; y < SIZE; y++) for (let x = 41; x <= 42; x++) w.push([x, y]); return w; })() });
    const { W, O, I, J, P, area } = S;

    check("plugin_loads", !!P && ["evaluateDeficits", "tick", "list", "get", "active", "open", "cancel", "reservedAt", "describe", "explain", "cells", "footprint"].every(k => typeof P[k] === "function") && P.timers.cadence.domain === "action",
        `UF.Projects v${P && P.version}, cadence ${P && P.timers.cadence.ticks} ticks (${P && P.timers.cadence.domain})`);
    check("no_unseeded_random", !/Math\.random/.test(read("DEUS_Projects.js")), "DEUS_Projects.js has no Math.random");

    // 1. Year-1 deficits: 8 founders, a lit hearth, a gapped ring, three straw beds, no stockpile. Storage is counted in
    //    physical slots (DEUS-TSK-GEMINI-07): one per stockpile cell plus a container's slots, slotsPerColonist needed each.
    const d0 = P.evaluateDeficits(area), cfg0 = P.config();
    check("deficit_year1", !!d0 && d0.population === 8 && d0.shelter.needed === 1 && d0.shelter.current === 0 && d0.shelter.deficit === 1 &&
        d0.bed.needed === 8 && d0.bed.current === 3 && d0.storage.needed === 8 * cfg0.slotsPerColonist && d0.storage.current === 0 && d0.food.needed === 3 && d0.food.current === 0 && d0.food.critical === true,
        d0 ? P.explain(area) : "no deficits");

    // 2. The deficit reads the world: a door set into the ring's north gap makes one shelter.
    O.setIn(area, SITE.x, SITE.y - RADIUS, "door_wood");
    const d1 = P.evaluateDeficits(area);
    O.setIn(area, SITE.x, SITE.y - RADIUS, null);
    const d2 = P.evaluateDeficits(area);
    check("deficit_reads_world", !!d1 && d1.shelter.current === 1 && d1.shelter.deficit === 0 && d2.shelter.current === 0 && d2.shelter.deficit === 1,
        `with a door in the wall: ${d1 && d1.shelter.current}/${d1 && d1.shelter.needed}; without: ${d2 && d2.shelter.current}/${d2 && d2.shelter.needed}`);

    // 3. Coarse cadence: 3000 map updates run exactly one cycle (at the start delay), never one per frame.
    {
        const C = makeFixture(20260922);
        let evaluations = 0;
        C.sandbox.UF.Events.on("projects:evaluated", () => evaluations++);
        for (let i = 0; i < 3000; i++) { C.W.walkUnits(); C.map.update(true); }
        check("cadence_coarse", evaluations === 1, `${evaluations} evaluation(s) in 3000 map updates (start delay ${P.config().startDelayTicks}, cadence ${P.config().cadenceTicks})`);
    }

    // 4. A cycle opens one communal shelter project on a reserved, valid footprint. The chooser is deterministic, so the
    //    footprint is known before the cycle: an oak and a shrub planted on it give the site phase real work.
    const pre = P._internal.chooseSite(W.state.colony, P.blueprint("communal_shelter"), P.config());
    if (pre) { O.setIn(area, pre.x + 1, pre.y + 1, "oak"); O.setIn(area, pre.x + 3, pre.y + 3, "bush"); }
    const cycle = P.tick();
    const p = P.active()[0] || null;
    const fp = p ? P.footprint(p) : [];
    const planCells = new Set(catalog.colony.plan.filter(s => s.build && s.cells).flatMap(s => s.cells.map(c => `${SITE.x + c[0]},${SITE.y + c[1]}`)));
    const footprintOk = p && fp.every(c => c.x >= 1 && c.y >= 1 && c.x < SIZE - 1 && c.y < SIZE - 1 && !W.water.has(c.y * SIZE + c.x) && cheb(c, SITE) > RADIUS + 1 && !planCells.has(`${c.x},${c.y}`) && [null, "oak", "bush"].includes(objectAt(S, c.x, c.y)));
    const marginOk = p && (() => { for (let y = p.origin.y - 1; y < p.origin.y + p.size + 1; y++) for (let x = p.origin.x - 1; x < p.origin.x + p.size + 1; x++) if (W.water.has(y * SIZE + x)) return false; return true; })();
    check("project_opened_and_sited", !!p && !!pre && p.origin.x === pre.x && p.origin.y === pre.y && p.kind === "communal_shelter" && p.state === "active" && p.phase === 0 && p.size === 6 && cycle.opened.length === 1 && P.list().length === 1 &&
        footprintOk && marginOk && P.reservedAt(area, p.origin.x, p.origin.y) === p.id && P.reservedAt(area, p.origin.x + 5, p.origin.y + 5) === p.id &&
        P.reservedAt(area, SITE.x, SITE.y) === null && P.reservedAt(area, p.origin.x - 1, p.origin.y) === null && p.created.domain === "action",
        p ? `${P.describe(p)}; chooser predicted (${pre && pre.x},${pre && pre.y})` : `no project (cycle: ${JSON.stringify(cycle && cycle.deficits && cycle.deficits.shelter)})`);

    // 5. The same seed picks the same footprint; a moat forces the search outward.
    {
        const again = makeFixture(20260922, { water: (() => { const w = []; for (let y = 0; y < SIZE; y++) for (let x = 41; x <= 42; x++) w.push([x, y]); return w; })() });
        again.P.tick();
        const q = again.P.active()[0];
        const other = makeFixture(7);
        other.P.tick();
        const r = other.P.active()[0];
        check("site_deterministic", !!p && !!q && q.origin.x === p.origin.x && q.origin.y === p.origin.y,
            `seed 20260922 twice: (${p && p.origin.x},${p && p.origin.y}) and (${q && q.origin.x},${q && q.origin.y}); seed 7: (${r && r.origin.x},${r && r.origin.y})`);
        const moat = [];
        for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) { const d = cheb({ x, y }, SITE); if (d >= 6 && d <= 14) moat.push([x, y]); }
        const M = makeFixture(20260922, { water: moat });
        M.P.tick();
        const m = M.P.active()[0];
        const mc = m ? { x: m.origin.x + 2, y: m.origin.y + 2 } : null;
        check("site_avoids_water", !!m && cheb(mc, SITE) >= 18 && M.P.footprint(m).every(c => !M.W.water.has(c.y * SIZE + c.x)),
            m ? `moat at 6..14: footprint centre ${cheb(mc, SITE)} from the hearth` : "no project sited beyond the moat");
    }

    // 6. Phase 1 (site): the oak and the shrub on the footprint are cleared by the objects' own harvest jobs, posted
    //    open (no owner) by the opening cycle; the stump left by the oak is cleared the same way.
    let phaseOk = false, clearJobs = [];
    if (p) {
        clearJobs = ownJobs(S, p);
        const types = clearJobs.map(j => `${j.type}@${j.target.x - p.origin.x},${j.target.y - p.origin.y}`).sort();
        const posted = clearJobs.length === 2 && clearJobs.some(j => j.type === "chop" && j.target.x === p.origin.x + 1) && clearJobs.some(j => j.type === "gather" && j.target.x === p.origin.x + 3) && clearJobs.every(j => !j.owner && !j.assigned && j.state === "open");
        const n = drive(S, 4000, () => p.phase >= 1);
        phaseOk = n > 0 && p.phase === 1 && P.footprint(p).every(c => !objectAt(S, c.x, c.y));
        check("phase_site_clears", posted && phaseOk, `posted ${types.join(" ")}; phase ${p.phase} after ${n} updates; footprint ${phaseOk ? "clear" : "not clear"}`);
    } else check("phase_site_clears", false, "no project");

    // 7. Phase 2 (walls): hauls posted with one job per item and per cell; a taken job reserves cell and item.
    let mid = null;
    if (p && phaseOk) {
        P.advance(p.id);
        const jobs = ownJobs(S, p);
        const hauls = jobs.filter(j => j.type === "haul");
        const items = new Set(hauls.map(j => j.params.itemId));
        const toCells = new Set(hauls.map(j => `${j.params.to.x},${j.params.to.y}`));
        const perimeter = c => c.x === p.origin.x || c.y === p.origin.y || c.x === p.origin.x + 5 || c.y === p.origin.y + 5;
        const toOk = hauls.every(j => perimeter(j.params.to) && P.reservedAt(area, j.params.to.x, j.params.to.y) === p.id && j.params.material === "log");
        const n = drive(S, 60, () => ownJobs(S, p).some(j => j.assigned));
        const taken = ownJobs(S, p).find(j => j.assigned);
        const other = S.colonists.find(u => !taken || u.id !== taken.assigned);
        const reserved = taken && J.reservation.reservedBy(taken.target) === taken.assigned && J.reservation.reservedBy(taken.params.itemId) === taken.assigned && J.reservation.isReservedByOther(other.id, taken.params.itemId);
        check("hauls_and_reservations", hauls.length >= 4 && items.size === hauls.length && toCells.size === hauls.length && toOk && jobs.length <= P.config().maxOpenJobs && n > 0 && !!reserved,
            `${hauls.length} hauls (${items.size} items, ${toCells.size} cells) of ${jobs.length} jobs; ${taken ? `${J.describe(taken)} taken by #${taken.assigned} after ${n} updates, cell and item reserved` : "none taken"}`);

        // 8. Save/load round trip mid-construction: JSON-safe, identical, usable after load.
        const live = P.state();
        const jsonSafe = jsonSafeValue(live);
        const before = JSON.stringify(live);
        const contents = JSON.parse(JSON.stringify(S.sandbox.DataManager.makeSaveContents()));
        S.sandbox.DataManager.extractSaveContents(contents);
        const restored = P.state();
        const after = JSON.stringify(restored);
        const q = P.get(p.id);
        check("save_load_roundtrip", jsonSafe && restored !== live && after === before && !!q && q.origin.x === p.origin.x && P.reservedAt(area, p.origin.x, p.origin.y) === p.id && P.describe(p.id).includes("phase 2/4 walls"),
            `${jsonSafe ? "JSON-safe" : "NOT JSON-safe"}; ${after === before ? "identical after load" : "differs after load"}; ${q ? P.describe(q) : "project lost"}`);
        mid = q;
    } else { check("hauls_and_reservations", false, "phase 1 did not finish"); check("save_load_roundtrip", false, "phase 1 did not finish"); }

    // 9. Walls then the south door; 10. hearth then eight beds; the deficit closes and nothing more opens.
    if (mid) {
        const S2 = Object.assign({}, S, { colonists: S.W.units().filter(u => u.data && u.data.kind === "colonist") });
        const logsBefore = I.find({ area: { x: 0, y: 0 }, z: 0, id: "log" }).reduce((n, f) => n + f.item.count, 0);
        const n1 = drive(S2, 40000, () => mid.phase >= 2 || mid.state !== "active");
        dump(S2, mid, `after the walls drive (${n1} updates)`);
        const o = mid.origin;
        let walls = 0;
        for (const c of P.cells(mid, 1)) if (c.object === "wall_wood" && objectAt(S, c.x, c.y) === "wall_wood") walls++;
        // The 6x6 blueprint (DEUS-TSK-FABLE-16): the door at the bottom middle (o.x+3, o.y+5), 19 wall cells, 20 logs.
        const door = objectAt(S, o.x + 3, o.y + 5) === "door_wood";
        const logsAfter = I.find({ area: { x: 0, y: 0 }, z: 0, id: "log" }).reduce((n, f) => n + f.item.count, 0);
        const logsCarried = W.units().reduce((n, u) => n + I.inventoryOf(u.id).filter(it => it.type === "log").reduce((m, it) => m + it.count, 0), 0);
        // Every log is accounted for: exactly 16 in the walls and the door. A placement the world refused because a
        // unit stood on the square costs nothing since DEUS-TSK-FABLE-04 (UF_Jobs' build places before it consumes).
        const refused = S.refusals.filter(r => r.x >= o.x && r.y >= o.y && r.x < o.x + 6 && r.y < o.y + 6).length;
        const ticksMid = P.tick();
        check("walls_then_door", n1 > 0 && mid.phase === 2 && walls === 19 && door && logsBefore - logsAfter - logsCarried === 20 && P.active().length === 1 && ticksMid.opened.length === 0,
            `phase ${mid.phase} after ${n1} updates: ${walls}/19 walls, door ${door ? "at" : "missing at"} (${o.x + 3},${o.y + 5}); logs ${logsBefore} -> ${logsAfter} on the ground + ${logsCarried} carried = 20 used, ${refused} refused placement(s) cost nothing; still 1 active project`);
        const n2 = drive(S2, 60000, () => mid.state !== "active");
        let beds = 0;
        for (const c of P.cells(mid, 3)) if (objectAt(S, c.x, c.y) === "floor_straw") beds++;
        const hearthId = P.hearthId(P.blueprint("communal_shelter")); const hearth = objectAt(S, o.x + 3, o.y + 3) === hearthId;
        const d3 = P.evaluateDeficits(area);
        const after = P.tick();
        check("hearth_and_beds_complete", n2 > 0 && mid.state === "done" && hearth && beds === 11 && !!d3 && d3.shelter.current === 1 && d3.shelter.deficit === 0 && d3.bed.current === 14 && after.opened.length === 0 && P.active().length === 0 && P.list().length === 1,
            `${mid.state} after ${n2} more updates: hearth ${hearth ? `${hearthId} built` : `${hearthId} missing`}, ${beds}/11 beds; ${P.explain(area)}; ${P.list().length} project(s), ${P.active().length} active`);
    } else { check("walls_then_door", false, "no mid-construction project"); check("hearth_and_beds_complete", false, "no mid-construction project"); }

    check("no_errors", errors.length === 0, errors.length ? errors[0].slice(0, 200) : "no console errors during the run");
} catch (e) {
    console.error(e && e.stack || e);
    console.log(`RESULT: ${passed} passed, ${failed} failed (harness error, exit 2)`);
    process.exit(2);
}

console.log(`\nRESULT: ${passed} passed, ${failed} failed (exit ${failed === 0 ? 0 : 1})`);
process.exit(failed === 0 ? 0 : 1);
