"use strict";
// tools/test_project_construction_loop.js - Headless checks for DEUS-TSK-FABLE-04: a project steps into its next
// phase at once (no cadence wait), a footprint whose objects cannot be fully cleared is never chosen, a build that
// the world refuses consumes nothing, and a haul lifts only what the carrier may legally carry, splitting the stack.
// Ends with the whole communal shelter built by the founders alone, every log and straw accounted for.
//
// Runs the real DEUS_Objects.js, DEUS_Items.js, DEUS_Jobs.js, DEUS_Projects.js and DEUS_Colonists.js in a Node vm
// against a World double (one 64x64 ground area: object grid, water cells, units that walk one cell per update) and
// the real catalog. The driver only advances the clock and calls Game_Map.update.
//
// Usage: node tools/test_project_construction_loop.js [--mutant=<name>] [--quiet] [--debug]
//   --mutant   patches a plugin in memory before loading it; the run must then FAIL (Rule 4):
//              consume_first (Jobs consumes before placing), no_split (Jobs lifts whole stacks),
//              no_readvance (Projects waits for the cadence), shallow_clear (Projects ignores harvest remainders)
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
    consume_first: ["jobs", "const placed = O.setIn(area, x, y, t.id);", "consumeBuildItems(I, area, x, y, needs); const placed = O.setIn(area, x, y, t.id);"],
    no_split: ["jobs", "const qty = legalLift(job, unit, it);", "const qty = it.count | 0;"],
    no_readvance: ["projects", "const next = advance(p);", "const next = null;"],
    shallow_clear: ["projects", "if (!canFullyClear(here)) return false;", "if (here.passable !== true && !clearAction(here)) return false;"]
};

const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "UF_WorldCatalog.json"), "utf8"));
// This harness proves the shelter loop alone: the settlement brain (DEUS-TSK-FABLE-06) has its other blueprints
// switched off here, so a fixture without food does not open a food cache before the shelter.
catalog.colony.projects = Object.assign({}, catalog.colony.projects, { blueprints: { food_cache: null, food_foraging: null, communal_stockpile: null, communal_chest: null, bedding_expansion: null } });
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
    if (!sources[m[0]].includes(m[1])) { console.error(`mutant "${mutant}": pattern not found in DEUS_${m[0]}.js`); process.exit(2); }
    sources[m[0]] = sources[m[0]].replace(m[1], m[2]);
    console.log(`MUTANT ${mutant}: DEUS_${m[0]} patched in memory; this run must FAIL`);
}

let passed = 0, failed = 0;
function check(name, condition, detail = "") {
    if (condition) { passed++; console.log(`PASS loop.${name}${detail ? " - " + detail : ""}`); }
    else { failed++; console.log(`FAIL loop.${name}${detail ? " - " + detail : ""}`); }
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
    let clock = 0;
    const refusals = [];
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
                if (s) {
                    this.lastObjectRefusal = { area: { x: ax, y: ay }, x, y, z, unitId: s.id, unitName: s.name || `unit ${s.id}`, reason: `${t.id} can't go on (${x},${y}): unit ${s.id} stands there` };
                    refusals.push(this.lastObjectRefusal);
                    emit("world:objectRefused", this.lastObjectRefusal);
                    return false;
                }
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
    const S = { sandbox, W, O: sandbox.UF.Objects, I: sandbox.UF.Items, J: sandbox.UF.Jobs, P: sandbox.UF.Projects, C: sandbox.UF.Colonists, map: new sandbox.Game_Map(), area: { x: 0, y: 0, z: 0 }, refusals };
    S.now = () => clock;
    /** One map update: the world clock, movement, then Game_Map.update (Jobs, Projects and Colonists in load order). */
    S.update = () => { clock++; W._frame = clock; W.walkUnits(); S.map.update(true); };
    return S;
}

//-----------------------------------------------------------------------------
// The fixture: the locked start in miniature (a camp ring with two gaps, three straw beds, eight unnamed founders)

const SIZE = 64, SITE = { x: 32, y: 32 }, RADIUS = 4;
function makeFixture(seed) {
    const S = makeSandbox(seed, SIZE);
    const { W, O, I, area } = S;
    O.setIn(area, SITE.x, SITE.y, "campfire");
    for (let dy = -RADIUS; dy <= RADIUS; dy++) {
        for (let dx = -RADIUS; dx <= RADIUS; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== RADIUS || dx === 0) continue;
            O.setIn(area, SITE.x + dx, SITE.y + dy, "wall_wood");
        }
    }
    for (const [x, y] of [[SITE.x - 2, SITE.y - 1], [SITE.x + 2, SITE.y - 1], [SITE.x - 2, SITE.y + 1]]) O.setIn(area, x, y, "floor_straw");
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
const groundOf = (S, type, x, y) => S.I.atIn(S.area, x, y).filter(it => it.type === type);
const carriedOf = (S, u, type) => S.I.inventoryOf(u.id).filter(it => it.type === type).reduce((n, it) => n + it.count, 0);
const target = (x, y) => ({ area: { x: 0, y: 0 }, x, y, z: 0 });

//-----------------------------------------------------------------------------
// Checks

console.log("=== Project construction loop (DEUS_Projects.js + DEUS_Jobs.js) headless checks ===");
try {
    // A. Clearability: the harvest remainder decides, not the object's own passability.
    {
        const S = makeFixture(1);
        const can = id => S.P._internal.canFullyClear(S.O.type(id));
        const table = { berry_bush: false, berry_bush_bare: false, oak: true, stump: true, bush: true, rocks_small: true, flowers: true, reeds: true };
        const wrong = Object.keys(table).filter(id => can(id) !== table[id]);
        check("plugins_load", !!S.P && !!S.J && !!S.C && typeof S.P._internal.canFullyClear === "function", `UF.Projects v${S.P && S.P.version}, UF.Jobs, UF.Colonists loaded`);
        check("clearability_query", wrong.length === 0, wrong.length ? `wrong for ${wrong.join(", ")}` : Object.keys(table).map(id => `${id}:${can(id) ? "clearable" : "not"}`).join(" "));
    }

    // B. A footprint holding a berry bush (gathers into an unclearable bare bush) is never chosen, and a project
    //    that already has one reports the cell blocked instead of posting a gather that cannot clear it.
    const S = makeFixture(20260922);
    const { W, O, I, J, P, C, area } = S;
    const bp = P.blueprint("communal_shelter");
    const first = P._internal.chooseSite(W.state.colony, bp, P.config());
    if (first) O.setIn(area, first.x + 2, first.y + 2, "berry_bush");
    const second = P._internal.chooseSite(W.state.colony, bp, P.config());
    const moved = !!first && !!second && (second.x !== first.x || second.y !== first.y);
    const tmp = first ? P.open("communal_shelter", { origin: { x: first.x, y: first.y } }) : null;
    const berryCell = tmp ? P.cells(tmp, 0).find(c => c.x === first.x + 2 && c.y === first.y + 2) : null;
    if (tmp) P.cancel(tmp.id, "test: berry footprint");
    if (first) O.setIn(area, first.x + 2, first.y + 2, null);
    const again = P._internal.chooseSite(W.state.colony, bp, P.config());
    check("unclearable_site_rejected", moved && !!berryCell && berryCell.state === "blocked" && !!again && again.x === first.x && again.y === first.y,
        `first choice (${first && first.x},${first && first.y}); with a berry bush on it the chooser moved to (${second && second.x},${second && second.y}); a project there reports the cell ${berryCell ? berryCell.state : "?"}; bush removed: (${again && again.x},${again && again.y}) again`);

    // C. The site phase ends and the walls phase posts its hauls in the same advance, not at the next cadence.
    const phaseAt = [], firstJobOfPhase = {}, yielded = {};
    S.sandbox.UF.Events.on("projects:phase", p => phaseAt.push({ phase: p.phase, tick: S.now() }));
    S.sandbox.UF.Events.on("jobs:done", j => { const y = j.result && j.result.yields; if (y) for (const k of Object.keys(y)) yielded[k] = (yielded[k] || 0) + (y[k] | 0); });
    S.sandbox.UF.Events.on("jobs:created", j => { const ph = j.params && j.params.phase; if (j.params && j.params.project && ph !== undefined && firstJobOfPhase[ph] === undefined) firstJobOfPhase[ph] = S.now(); });
    if (again) for (const [dx, dy, id] of PLANTS) O.setIn(area, again.x + dx, again.y + dy, id);
    const logsStart = totalOf(S, "log"), strawStart = totalOf(S, "straw") + totalOf(S, "fiber"), stoneStart = totalOf(S, "stone");
    P.tick();
    const p = P.active()[0] || null;
    const n1 = p ? drive(S, 6000, () => p.phase >= 1 || p.state !== "active") : -1;
    const step1 = phaseAt.find(e => e.phase === 1);
    check("phase_readvance_immediate", n1 > 0 && !!p && !!step1 && firstJobOfPhase[1] !== undefined && firstJobOfPhase[1] === step1.tick && J.list(j => j.params && j.params.project === p.id && j.params.phase === 1).length >= 4,
        p ? `phase 2 began at tick ${step1 ? step1.tick : "?"}, its first haul was posted at tick ${firstJobOfPhase[1]} (cadence ${P.config().cadenceTicks}); ${J.list(j => j.params && j.params.project === p.id && j.params.phase === 1).length} walls-phase jobs exist` : "no project");

    // D. The founders finish the shelter; every log, stone and straw is accounted for (nothing lost to a refusal).
    const n2 = p ? drive(S, 60000, () => p.state !== "active") : -1;
    const o = p ? p.origin : null;
    let walls = 0, beds = 0;
    if (p) {
        for (const c of P.cells(p, 1)) if (c.object === "wall_wood" && objectAt(S, c.x, c.y) === "wall_wood") walls++;
        for (const c of P.cells(p, 3)) if (objectAt(S, c.x, c.y) === "floor_straw") beds++;
    }
    // The 6x6 blueprint (DEUS-TSK-FABLE-16): the door at the bottom middle, the contained stone hearth at the centre.
    const hearthId = P.hearthId(P.blueprint("communal_shelter"));
    const door = p && objectAt(S, o.x + 3, o.y + 5) === "door_wood";
    const hearth = p && objectAt(S, o.x + 3, o.y + 3) === hearthId;
    // Used = what was there + what the founders' harvests yielded (from jobs:done results) - what is left anywhere.
    const logsUsed = logsStart + (yielded.log || 0) - totalOf(S, "log");
    const strawUsed = strawStart + (yielded.straw || 0) + (yielded.fiber || 0) - totalOf(S, "straw") - totalOf(S, "fiber"); // beds take fiber for straw
    const stoneUsed = stoneStart + (yielded.stone || 0) - totalOf(S, "stone");
    const refusedBuilds = S.refusals.filter(r => p && r.x >= o.x && r.y >= o.y && r.x < o.x + 6 && r.y < o.y + 6).length;
    const d = P.evaluateDeficits(area);
    check("shelter_completed_by_founders", n2 > 0 && !!p && p.state === "done" && walls === 19 && door && hearth && beds === 11 && !!d && d.shelter.current === 1 && d.shelter.deficit === 0,
        p ? `${p.state} after ${n1 + n2} updates: ${walls}/19 walls, door ${door ? "up" : "missing"}, hearth ${hearth ? `${hearthId} up` : `${hearthId} missing`}, ${beds}/11 beds; ${d ? P.explain(area) : ""}` : "no project");
    const hearthCost = (O.type(hearthId) && O.type(hearthId).build && O.type(hearthId).build.items) || {}; const wantLogs = 20 + (hearthCost.log | 0), wantStone = hearthCost.stone | 0;
    check("materials_conserved", logsUsed === wantLogs && strawUsed === 22 && stoneUsed === wantStone,
        `logs used ${logsUsed} (19 walls + door + ${hearthCost.log | 0} for the hearth = ${wantLogs}; harvests yielded ${yielded.log || 0}), straw or fiber used ${strawUsed} (11 beds x 2; yielded ${(yielded.straw || 0) + (yielded.fiber || 0)}), stone used ${stoneUsed} (hearth ${wantStone}; yielded ${yielded.stone || 0}); ${refusedBuilds} placement(s) refused on the footprint, none lost a material`);

    // E. Recursion is bounded: a project in its walls phase whose walls, hearth and beds already stand steps through
    //    every remaining phase in one advance and stops at "done" (the site phase treats standing buildings as blockers,
    //    so the record is put at phase 1 first).
    {
        const events = { phase: 0, done: 0 };
        S.sandbox.UF.Events.on("projects:phase", () => events.phase++);
        S.sandbox.UF.Events.on("projects:done", () => events.done++);
        const q = P.open("communal_shelter", { origin: { x: 8, y: 44 } });
        if (q) { for (const ph of [1, 2, 3]) for (const c of P.cells(q, ph)) O.setIn(area, c.x, c.y, c.object); q.phase = 1; }
        const summary = q ? P.advance(q.id) : null;
        check("advance_recursion_bounded", !!q && q.state === "done" && q.phase === bp.phases.length && events.phase === bp.phases.length - 2 && events.done === 1 && !!summary,
            q ? `prebuilt project #${q.id} from phase 2: one advance -> ${q.state}, phase ${q.phase}/${bp.phases.length}, ${events.phase} phase events, ${events.done} done event` : "could not open");
    }

    // F. Transactional build: a refused placement consumes nothing; the retry consumes exactly once.
    {
        const B = makeFixture(3);
        B.P.setEnabled(false); // no project opens in the background: nothing else moves the materials
        const T = { x: 20, y: 20 };
        B.I.drop(B.area, T.x, T.y, "log", 1);
        const stander = B.W.addUnit({ x: T.x, y: T.y, data: { kind: "person", manual: true } });
        const worker = B.founders[0];
        const j1 = B.J.create({ type: "build", target: target(T.x, T.y), params: { objectId: "wall_wood" }, owner: worker.id });
        const m1 = j1 ? drive(B, 400, () => j1.state === "done" || j1.state === "failed") : -1;
        const logsAfterRefusal = groundOf(B, "log", T.x, T.y).reduce((n, it) => n + it.count, 0);
        const noWall = objectAt(B, T.x, T.y) !== "wall_wood";
        check("build_refused_keeps_materials", m1 > 0 && !!j1 && j1.state === "failed" && !!j1.reason && logsAfterRefusal === 1 && noWall && B.refusals.length === 1 && errors.length === 0,
            j1 ? `job ${j1.state} (${j1.reason}) after ${m1} updates; ${logsAfterRefusal} log still on the square, ${noWall ? "no wall" : "a wall"}; ${B.refusals.length} refusal, ${errors.length} console errors` : "no job");
        B.W.removeUnit(stander.id);
        const j2 = B.J.create({ type: "build", target: target(T.x, T.y), params: { objectId: "wall_wood" }, owner: worker.id });
        const m2 = j2 ? drive(B, 400, () => j2.state === "done" || j2.state === "failed") : -1;
        const logsAfterBuild = groundOf(B, "log", T.x, T.y).reduce((n, it) => n + it.count, 0);
        if (debug) for (const it of B.I.all().filter(it => it.type === "log")) console.log(`    log #${it.id} x${it.count} ${it.area ? `at ${it.x},${it.y}` : `held by #${it.holder}`}`);
        check("build_success_consumes_once", m2 > 0 && !!j2 && j2.state === "done" && objectAt(B, T.x, T.y) === "wall_wood" && logsAfterBuild === 0 && totalOf(B, "log") === 40,
            j2 ? `job ${j2.state} after ${m2} updates; wall ${objectAt(B, T.x, T.y) === "wall_wood" ? "up" : "missing"}, ${logsAfterBuild} log left on the square, ${totalOf(B, "log")} logs elsewhere (40 expected)` : "no job");
        // Materials that vanished while the builder worked: no object for free, a clean "needs items".
        const T2 = { x: 24, y: 20 };
        B.I.drop(B.area, T2.x, T2.y, "log", 1);
        const j3 = B.J.create({ type: "build", target: target(T2.x, T2.y), params: { objectId: "wall_wood" }, owner: worker.id });
        const m3 = j3 ? drive(B, 400, () => j3.state === "work") : -1;
        if (m3 > 0) for (const it of groundOf(B, "log", T2.x, T2.y)) B.I.remove(it.id);
        const m4 = j3 ? drive(B, 400, () => j3.state === "done" || j3.state === "failed") : -1;
        check("build_verifies_materials_at_apply", m3 > 0 && m4 > 0 && !!j3 && j3.state === "failed" && j3.reason === "needs items" && objectAt(B, T2.x, T2.y) !== "wall_wood" && errors.length === 0,
            j3 ? `log removed while the builder worked: job ${j3.state}${j3.reason ? ` (${j3.reason})` : ""}, ${objectAt(B, T2.x, T2.y) === "wall_wood" ? "a wall stands anyway" : "no wall"}` : "no job");
    }

    // G. Legal partial hauling: a 5-log stack, carriers who may lift 45 lb unencumbered, one who may lift 10.
    {
        const H = makeFixture(4);
        H.P.setEnabled(false); // no project opens in the background: nothing else moves the materials
        const src = { x: 10, y: 10 }, dst = { x: 40, y: 10 };
        H.I.drop(H.area, src.x, src.y, "log", 5);
        const [A, Bw, Cw] = H.founders;
        A.data.maxWeight = 135; Bw.data.maxWeight = 135; Cw.data.maxWeight = 30; // encumbered at a third: 45, 45, 10 lb
        const one = H.I.weightOf({ type: "log", count: 1 });
        // The legal lift is what keeps the carrier unencumbered after what it already carries (a starting kit counts).
        const liftOf = u => Math.floor((H.I.encumbrance(u.id).encumbered - H.I.carriedWeight(u.id) + 1e-6) / one);
        const legal = liftOf(A), legalB = liftOf(Bw);
        const stack = groundOf(H, "log", src.x, src.y)[0];
        if (debug) console.log(`    #${A.id} before the haul: carries ${H.I.inventoryOf(A.id).map(it => `${it.type}x${it.count}`).join("+") || "nothing"} (${H.I.carriedWeight(A.id)} lb), unencumbered up to ${H.I.encumbrance(A.id).encumbered} lb; job ${H.J.of(A.id) ? H.J.of(A.id).type : "none"}`);
        const hA = H.J.create({ type: "haul", target: target(src.x, src.y), params: { itemId: stack.id, to: target(dst.x, dst.y) }, owner: A.id });
        const g1 = hA ? drive(H, 400, () => carriedOf(H, A, "log") > 0 || hA.state === "failed") : -1;
        const left1 = groundOf(H, "log", src.x, src.y);
        const splitOk = g1 > 0 && carriedOf(H, A, "log") === legal && left1.length === 1 && left1[0].count === 5 - legal && totalOf(H, "log") === 45 && hA.params.itemId !== stack.id && H.J.reservation.reservedBy(stack.id) === null;
        check("partial_haul_by_weight", splitOk,
            `a log weighs ${one} lb, #${A.id} already carries ${H.I.carriedWeight(A.id) - carriedOf(H, A, "log") * one} lb, so the legal lift is ${legal}: it carries ${carriedOf(H, A, "log")} (job ${hA ? hA.state : "?"}${hA && hA.reason ? " " + hA.reason : ""}), ${left1.map(it => it.count).join("+") || 0} left on the source as ${left1.length} stack(s), ${totalOf(H, "log")} logs in the world; source stack ${H.J.reservation.reservedBy(stack.id) === null ? "released" : "still reserved"}`);
        drive(H, 5);
        H.J.cancel(hA.id, "test: dropped mid-transit");
        const dropped = groundOf(H, "log", A.x, A.y).reduce((n, it) => n + it.count, 0);
        const hB = left1.length ? H.J.create({ type: "haul", target: target(src.x, src.y), params: { itemId: left1[0].id, to: target(dst.x, dst.y) }, owner: Bw.id }) : null;
        const g2 = hB ? drive(H, 400, () => carriedOf(H, Bw, "log") > 0 || hB.state === "failed") : -1;
        const left2 = groundOf(H, "log", src.x, src.y).reduce((n, it) => n + it.count, 0);
        const ids = new Set(H.I.all().filter(it => it.type === "log").map(it => it.id));
        check("second_carrier_and_cancel_conserve", carriedOf(H, A, "log") === 0 && dropped === legal && g2 > 0 && carriedOf(H, Bw, "log") === Math.min(legalB, 5 - legal) && left2 === Math.max(0, 5 - legal - legalB) && totalOf(H, "log") === 45 && ids.size === H.I.all().filter(it => it.type === "log").length,
            `#${A.id} cancelled: ${dropped} logs at its feet (${A.x},${A.y}), carries ${carriedOf(H, A, "log")}; #${Bw.id} carries ${carriedOf(H, Bw, "log")}, ${left2} left at the source; ${totalOf(H, "log")} logs in the world, ${ids.size} distinct stacks`);
        const g3 = hB ? drive(H, 400, () => hB.state === "done" || hB.state === "failed") : -1;
        H.I.drop(H.area, src.x, src.y, "log", 2); // a fresh stack for the carrier who may lift only 10 lb
        const remainder = groundOf(H, "log", src.x, src.y)[0] || null;
        const hC = remainder ? H.J.create({ type: "haul", target: target(src.x, src.y), params: { itemId: remainder.id, to: target(dst.x, dst.y) }, owner: Cw.id }) : null;
        const g4 = hC ? drive(H, 400, () => hC.state === "done" || hC.state === "failed") : -1;
        const atSrc = groundOf(H, "log", src.x, src.y).reduce((n, it) => n + it.count, 0);
        check("too_heavy_aborts_without_pickup", g3 > 0 && !!hB && hB.state === "done" && groundOf(H, "log", dst.x, dst.y).reduce((n, it) => n + it.count, 0) === Math.min(legalB, 5 - legal) && !!hC && g4 > 0 && hC.state === "failed" && hC.reason === "too heavy to lift" && carriedOf(H, Cw, "log") === 0 && atSrc === left2 + 2 && totalOf(H, "log") === 47 && errors.length === 0,
            `#${Bw.id} delivered ${groundOf(H, "log", dst.x, dst.y).reduce((n, it) => n + it.count, 0)} to (${dst.x},${dst.y}); #${Cw.id} (10 lb): job ${hC ? hC.state : "none"}${hC && hC.reason ? " (" + hC.reason + ")" : ""}, carries ${carriedOf(H, Cw, "log")}, source keeps ${atSrc}; ${totalOf(H, "log")} logs in the world (47 expected), ${errors.length} console errors`);
    }

    check("no_errors", errors.length === 0, errors.length ? errors[0].slice(0, 200) : "no console errors during the run");
} catch (e) {
    console.error(e && e.stack || e);
    console.log(`RESULT: ${passed} passed, ${failed} failed (harness error, exit 2)`);
    process.exit(2);
}

console.log(`\nRESULT: ${passed} passed, ${failed} failed (exit ${failed === 0 ? 0 : 1})`);
process.exit(failed === 0 ? 0 : 1);
