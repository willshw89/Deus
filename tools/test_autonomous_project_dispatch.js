"use strict";
// tools/test_autonomous_project_dispatch.js - Headless checks for DEUS-TSK-FABLE-03: eight idle founders claim open
// DEUS_Projects jobs on their own (no UF.Jobs.assign/take call from outside the plugins), never two on one job or
// one reserved target, and the society plan no longer emits shelter, door, bed or chest steps while DEUS_Projects is
// managing settlement construction.
//
// Runs the real DEUS_Objects.js, DEUS_Items.js, DEUS_Jobs.js, DEUS_Projects.js and DEUS_Colonists.js in a Node vm
// against a World double (one 64x64 ground area: object grid, water cells, units that walk one cell per update) and
// the real catalog. The driver only advances the clock and calls Game_Map.update; nothing else touches the jobs.
//
// Usage: node tools/test_autonomous_project_dispatch.js [--mutant=<name>] [--quiet] [--debug]
//   --mutant   patches DEUS_Colonists.js in memory before loading it; the run must then FAIL (Rule 4):
//              decide_null (decide returns null), ignore_projects (project jobs are never taken),
//              no_bypass (the society plan keeps its shelter steps), per_frame (a decision sweep every update)
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
    decide_null: ["return projectJob(u) || designationJob(u) || stepOffReserved(u);", "return null;"],
    ignore_projects: ["const ids = new Set(P.active().map(p => p.id));", "const ids = new Set();"],
    no_bypass: ["const projectsManaged = () => !!(", "const projectsManaged = () => false && !!("],
    per_frame: ["const SWEEP_EVERY = 30;", "const SWEEP_EVERY = 1;"]
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
    if (mutant === "per_frame") sources.colonists = sources.colonists.replace("const DECIDE_EVERY = 60;", "const DECIDE_EVERY = 0;");
    console.log(`MUTANT ${mutant}: DEUS_Colonists.js patched in memory; this run must FAIL`);
}

let passed = 0, failed = 0;
function check(name, condition, detail = "") {
    if (condition) { passed++; console.log(`PASS dispatch.${name}${detail ? " - " + detail : ""}`); }
    else { failed++; console.log(`FAIL dispatch.${name}${detail ? " - " + detail : ""}`); }
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
                if (s) { this.lastObjectRefusal = { x, y, unitId: s.id }; emit("world:objectRefused", this.lastObjectRefusal); return false; }
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
    const S = { sandbox, W, O: sandbox.UF.Objects, I: sandbox.UF.Items, J: sandbox.UF.Jobs, P: sandbox.UF.Projects, C: sandbox.UF.Colonists, map: new sandbox.Game_Map(), area: { x: 0, y: 0, z: 0 } };
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
    // Founders: unnamed (DEUS_Colonists keeps TEST_-named units out of the simulation), adults, player faction.
    const seats = [[-1, -2], [1, -2], [-2, 0], [2, 0], [-1, 2], [1, 2], [0, -1], [0, 1]];
    S.founders = seats.map((s, i) => W.addUnit({ x: SITE.x + s[0], y: SITE.y + s[1], data: { kind: "colonist", faction: "player", founder: true, age: 25, gender: i % 2 ? "female" : "male", inventory: [], site: 1 } }));
    I.drop(area, SITE.x, 8, "log", 40);
    I.drop(area, 8, SITE.x, "stone", 20);
    I.drop(area, SITE.x, 9, "straw", 30);
    return S;
}
// Nine natural objects on the footprint the chooser will pick: nine site-clearing jobs for eight founders.
const PLANTS = [[0, 0, "bush"], [1, 1, "oak"], [2, 1, "bush"], [3, 1, "bush"], [1, 2, "rocks_small"], [3, 2, "bush"], [1, 3, "rocks_small"], [2, 3, "bush"], [3, 3, "oak"]];

function drive(S, updates, until) {
    for (let i = 0; i < updates; i++) {
        S.update();
        if (until && until()) return i + 1;
    }
    return until ? -1 : updates;
}
const OWNED = ["shelter", "door", "beds", "chest"];
const projectJobsOf = (S, p) => S.J.list(j => j.params && j.params.project === p.id && (j.state === "travel" || j.state === "work"));
const jobOf = (S, u) => S.J.of(u.id);

//-----------------------------------------------------------------------------
// Checks

console.log("=== Autonomous project dispatch (DEUS_Colonists.js + DEUS_Projects.js) headless checks ===");
try {
    const S = makeFixture(20260922);
    const { W, O, J, P, C, area } = S;
    const created = [];
    S.sandbox.UF.Events.on("jobs:created", j => created.push({ id: j.id, type: j.type, plan: j.params && j.params.plan, project: j.params && j.params.project }));
    const doneBy = [];
    S.sandbox.UF.Events.on("jobs:done", (j, u) => doneBy.push({ id: j.id, type: j.type, project: j.params && j.params.project, by: u ? u.id : null }));
    let openCalls = 0;
    const realOpen = J.open;
    J.open = function(...args) { openCalls++; return realOpen.apply(this, args); };

    check("plugins_load", !!C && !!P && typeof C.decide === "function" && typeof C._internal.projectJob === "function" && typeof C._internal.scan === "function" && typeof P.reservedAt === "function",
        `UF.Colonists, UF.Projects v${P && P.version}, UF.Jobs loaded; decide/projectJob/scan present`);
    check("founders_recognised", C.list().length === 8 && C.list().every(u => S.founders.includes(u)),
        `${C.list().length} colonists recognised out of ${W.units().length} units`);

    // The society plan read by the colonists has no shelter, door, beds or chest steps while DEUS_Projects manages;
    // the saved plan record keeps them; switching DEUS_Projects off brings them back.
    const u0 = S.founders[0];
    const plan0 = C.effectivePlan(u0).map(s => s.id);
    const raw = W.state.colony.plan.map(s => s.id);
    check("legacy_plan_bypassed", plan0.length > 0 && !plan0.some(id => OWNED.includes(id)) && OWNED.every(id => raw.includes(id)) && !C.planText(u0).toLowerCase().includes("shelter"),
        `effective plan: ${plan0.join(" ")}; saved plan keeps ${OWNED.join("/")}`);
    P.setEnabled(false);
    C.advanceTicks(31);
    const planOff = C.effectivePlan(u0).map(s => s.id);
    P.setEnabled(true);
    C.advanceTicks(31);
    const planOn = C.effectivePlan(u0).map(s => s.id);
    check("bypass_conditional", OWNED.every(id => planOff.includes(id)) && !planOn.some(id => OWNED.includes(id)),
        `with UF.Projects disabled: ${planOff.filter(id => OWNED.includes(id)).join(" ")} back in the plan; enabled again: none`);

    // Idle founders with nothing to do cost a bounded number of decisions: sweeps every 30 ticks, at most 4 each,
    // each idle colonist at most once per 60 ticks (16 decisions in 120 updates; a per-frame loop makes hundreds).
    openCalls = 0;
    drive(S, 120);
    check("idle_scan_bounded", openCalls > 0 && openCalls <= 20,
        `${openCalls} UF.Jobs.open() calls in 120 updates with 8 idle founders and no open job (expected 16)`);

    // A decoy designation next to the camp (no project): founders must prefer project jobs to it.
    O.setIn(area, SITE.x, SITE.y - 2, "bush");
    const decoy = J.create({ type: "gather", target: { area: { x: 0, y: 0 }, x: SITE.x, y: SITE.y - 2, z: 0 } });

    // One communal shelter project with nine open clearing jobs, nothing assigned yet.
    const pre = P._internal.chooseSite(W.state.colony, P.blueprint("communal_shelter"), P.config());
    if (pre) for (const [dx, dy, id] of PLANTS) O.setIn(area, pre.x + dx, pre.y + dy, id);
    P.tick();
    const p = P.active()[0] || null;
    const open0 = p ? J.open().filter(j => j.params && j.params.project === p.id) : [];
    check("project_opened", !!p && !!pre && p.origin.x === pre.x && p.origin.y === pre.y && p.phase === 0 && open0.length === 9 && open0.every(j => !j.assigned && !j.owner),
        p ? `${P.describe(p)}; ${open0.length} open clearing jobs: ${open0.map(j => j.type).sort().join(" ")}` : "no project");

    // Eight idle founders claim eight distinct project jobs with nothing but map updates.
    openCalls = 0;
    const n1 = p ? drive(S, 120, () => S.founders.every(u => { const j = jobOf(S, u); return j && j.params && j.params.project === p.id; })) : -1;
    const decoyState = decoy ? decoy.state : "none";
    const active = p ? projectJobsOf(S, p) : [];
    const claimed = S.founders.map(u => jobOf(S, u)).filter(Boolean);
    const allProject = claimed.length === 8 && claimed.every((j, i) => j.params && j.params.project === p.id && j.assigned === S.founders[i].id);
    check("claimed_autonomously", n1 > 0 && allProject,
        `${claimed.length}/8 founders hold a project job after ${n1} updates and ${openCalls} open() calls (driver called only Game_Map.update): ${claimed.map(j => `${j.type}#${j.id}`).join(" ")}; ${J.open().length} still open`);
    check("project_jobs_preferred", !!decoy && decoyState === "open" && !decoy.assigned,
        `the decoy gather beside the camp is ${decoyState}${decoy && decoy.assigned ? ` (taken by #${decoy.assigned})` : ""} while the eight founders hold project jobs farther away`);
    const ids = new Set(claimed.map(j => j.id));
    const cells = new Set(claimed.map(j => `${j.target.x},${j.target.y}`));
    const RM = J.reservation;
    const reservedOk = claimed.every(j => RM.reservedBy(j.target) === j.assigned && !RM.isReservedByOther(j.assigned, j.target));
    const crossOk = claimed.every(j => S.founders.every(u => u.id === j.assigned || RM.isReservedByOther(u.id, j.target)));
    check("no_double_claim", claimed.length === 8 && ids.size === 8 && cells.size === 8 && active.length === 8 && reservedOk && crossOk,
        `${ids.size} distinct jobs on ${cells.size} distinct cells; every target reserved for its worker and against the other seven`);
    if (debug) for (const u of S.founders) { const j = jobOf(S, u); console.log(`    #${u.id} at ${u.x},${u.y}: ${j ? `${j.type}#${j.id} ${j.state} @${j.target.x},${j.target.y}` : "idle"}`); }

    // A cancelled job sends the worker back to the pool: it holds another job within two sweeps.
    const victim = claimed[0] || null;
    const worker = victim ? W.unit(victim.assigned) : null;
    if (victim) J.cancel(victim.id, "test: released");
    const n2 = victim ? drive(S, 90, () => { const j = jobOf(S, worker); return !!j && j.id !== victim.id; }) : -1;
    const again = worker ? jobOf(S, worker) : null;
    check("failed_job_returns_to_pool", n2 > 0 && !!again && again.id !== victim.id && again.params && again.params.project === p.id,
        victim ? `job #${victim.id} cancelled; #${worker.id} took ${again ? `${again.type}#${again.id}` : "nothing"} after ${n2} updates` : "no job to cancel");

    // The founders finish the site phase by themselves, then claim the walls-phase hauls.
    const n3 = p ? drive(S, 6000, () => p.phase >= 1 || p.state !== "active") : -1;
    const clearedBy = doneBy.filter(d => d.project === p.id && d.by !== null && S.founders.some(u => u.id === d.by));
    const clear = p && P.footprint(p).every(c => !O.atIn(area, c.x, c.y));
    check("site_cleared_by_founders", n3 > 0 && p.phase === 1 && clear && clearedBy.length >= 9 && new Set(clearedBy.map(d => d.by)).size >= 4,
        p ? `phase ${p.phase} after ${n3} updates; ${clearedBy.length} project jobs done by ${new Set(clearedBy.map(d => d.by)).size} different founders; footprint ${clear ? "clear" : "not clear"}` : "no project");
    // DEUS_Projects posts the next phase's jobs at its next cycle (cadence 3000 ticks) rather than right after the
    // phase steps, so the founders may wait up to one cadence here; the claim itself is theirs within a sweep.
    const cadence = P.config().cadenceTicks | 0;
    const n4 = p ? drive(S, cadence + 200, () => projectJobsOf(S, p).filter(j => j.type === "haul" || j.type === "build").length >= 4) : -1;
    const phase2 = p ? projectJobsOf(S, p) : [];
    check("hauls_claimed_in_walls_phase", n4 > 0 && phase2.filter(j => j.type === "haul" || j.type === "build").length >= 4 && new Set(phase2.map(j => j.assigned)).size === phase2.length,
        `${phase2.length} project jobs held after ${n4} more updates (cadence ${cadence}): ${phase2.map(j => `${j.type}#${j.id}->#${j.assigned}`).join(" ")}`);

    const legacy = created.filter(c => c.plan && OWNED.includes(c.plan));
    check("no_legacy_shelter_jobs", created.length > 0 && legacy.length === 0,
        `${created.length} jobs created during the run, ${legacy.length} from the society plan's ${OWNED.join("/")} steps; the decoy is now ${decoy ? decoy.state : "none"} (taken once project work ran out)`);
    check("no_errors", errors.length === 0, errors.length ? errors[0].slice(0, 200) : "no console errors during the run");
} catch (e) {
    console.error(e && e.stack || e);
    console.log(`RESULT: ${passed} passed, ${failed} failed (harness error, exit 2)`);
    process.exit(2);
}

console.log(`\nRESULT: ${passed} passed, ${failed} failed (exit ${failed === 0 ? 0 : 1})`);
process.exit(failed === 0 ? 0 : 1);
