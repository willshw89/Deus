"use strict";
// tools/test_hazard_reflex.js - Headless checks for DEUS-TSK-FABLE-11: the reflexive self-preservation layer above
// every project and routine. A settler whose square catches fire drops its hauling at once and gets out; it never
// runs into another burning square; a settler on fire drops and rolls (or douses itself beside water); work is taken
// up again only from safe ground; a grappler that steps away lets go the moment it moves; an attacked settler runs
// (unarmed) or holds for UF_Combat (armed); the decision order reads 1..9 from assess(); and a save in the middle of
// a flight comes back and finishes it.
//
// Runs the real DEUS_Objects.js, DEUS_Items.js, DEUS_Jobs.js, DEUS_Colonists.js, DEUS_Conditions.js,
// DEUS_Environment.js and DEUS_Combat.js in a Node vm against a World double (one 64x64 ground area with a pond); the
// double emits world:unitMoved on every step as DEUS_World does, and stands in for UF_Fire (burning squares) and
// UF_Levels (lava, deep water). Nobody in this harness orders a colonist: the driver disturbs the world and calls
// Game_Map.update.
//
// Usage: node tools/test_hazard_reflex.js [--mutant=<name>] [--quiet]
//   --mutant   patches plugins in memory; the run must then FAIL (Rule 4):
//              ignores_fire_while_hauling (neither UF_Jobs' step nor the colonists' sweep ends a job in a hazard),
//              flees_into_fire (the safe-square search stops filtering hazards),
//              grapple_persists_on_step (a step no longer reaches UF.Conditions)
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
    ignores_fire_while_hauling: [
        { file: "jobs", from: "if (!(job.params && job.params.reflex) && inLethalHazard(unit)) {", to: "if (false) {" },
        { file: "colonists", from: "if (hz && !isReflexJob(job)) { J.cancel(job.id, \"emergency: lethal hazard\"); pendingDecision.add(u.id); continue; }", to: "if (false) { continue; }" }
    ],
    flees_into_fire: [{ file: "jobs", from: "if (lethalHazardAt(area, c.x, c.y)) continue;", to: "if (false) continue;" }],
    grapple_persists_on_step: [{ file: "colonists", from: "return Cond.onUnitMoved(u, from, to);", to: "return 0;" }]
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
    if (condition) { passed++; console.log(`PASS reflex.${name}${detail ? " - " + detail : ""}`); }
    else { failed++; console.log(`FAIL reflex.${name}${detail ? " - " + detail : ""}`); }
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
// The sandbox: the real plugins over a World double that reports steps and holds the burning squares

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
                const nx = u.x + Math.sign(u.goal.x - u.x), ny = u.y + Math.sign(u.goal.y - u.y);
                if (water.has(ny * size + nx)) { u.goal = null; continue; }
                const fx = u.x, fy = u.y;
                u.x = nx; u.y = ny;
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
    const key = (x, y) => `${x},${y}`;
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
    const S = { sandbox, W, O: sandbox.UF.Objects, I: sandbox.UF.Items, J: sandbox.UF.Jobs, C: sandbox.UF.Colonists, Cond: sandbox.UF.Conditions, E: sandbox.UF.Environment, Combat: combatLoaded ? sandbox.UF.Combat : null, map: new sandbox.Game_Map(), area: { x: 0, y: 0, z: 0 }, catalog, time, fire, lava, combatLoaded };
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
    sandbox.UF.Events.on("jobs:failed", job => S.failedJobs.push({ id: job.id, type: job.type, reason: job.reason, unit: job.assigned, params: Object.assign({}, job.params), at: clock }));
    sandbox.UF.Events.on("jobs:created", job => S.createdJobs.push({ id: job.id, type: job.type, owner: job.owner, params: Object.assign({}, job.params), target: job.target ? { x: job.target.x, y: job.target.y } : null, at: clock }));
    return S;
}

//-----------------------------------------------------------------------------
// The camp: hearth, ring, founders, a pond, logs in the open; projects off (the driver posts the work it needs)

const SIZE = 64, SITE = { x: 32, y: 32 }, RADIUS = 4;
function makeCamp(seed) {
    const catalog = JSON.parse(catalogText);
    catalog.colony.projects = Object.assign({}, catalog.colony.projects, { blueprints: { communal_shelter: null, food_cache: null, communal_stockpile: null, bedding_expansion: null } });
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
    const seats = [[-1, -3], [1, -3], [-3, 0], [3, 0], [-1, 3], [1, 3], [0, -1], [0, 1]];
    S.founders = seats.map((s, i) => W.addUnit({ name: `Founder ${i + 1}`, x: SITE.x + s[0], y: SITE.y + s[1], data: { kind: "colonist", faction: "player", founder: true, age: 25, gender: i % 2 ? "female" : "male", inventory: [], site: 1, hp: 10, maxHp: 10, stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } } }));
    for (const u of S.founders) { I.give("rations", 3, u.id, { bypassLimits: true }); const n = S.C.needsOf(u); if (n) { n.foodLb = 1; n.waterGal = 1; } }
    I.drop(area, SITE.x, 8, "log", 40);
    S.spawn = (name, x, y, extra = {}) => W.addUnit({ name, x, y, data: Object.assign({ kind: "creature", faction: "wild", inventory: [], hp: 10, maxHp: 10, stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, combat: { mode: "manual" } }, extra) });
    return S;
}
function drive(S, updates, until) {
    for (let i = 0; i < updates; i++) { S.update(); if (until && until()) return i + 1; }
    return until ? -1 : updates;
}
const burning = (S, x, y) => S.fire.has(`${x},${y}`);
const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const jobOf = (S, u) => S.J.of(u.id);
const walk = (u, x, y) => { u.x = x; u.y = y; };
/** An open haul of the logs to a far square, for a founder to take on its own. */
function postHaul(S, to) {
    const log = S.I.atIn(S.area, SITE.x, 8).find(it => it.type === "log");
    return S.J.create({ type: "haul", target: { area: { x: 0, y: 0 }, x: SITE.x, y: 8, z: 0 }, params: { itemId: log.id, count: 5, to: { area: { x: 0, y: 0 }, x: to.x, y: to.y, z: 0 } } });
}

//-----------------------------------------------------------------------------
// Checks

console.log("=== Hazard reflex and decision order (DEUS_Colonists.js + DEUS_Jobs.js) headless checks ===");
try {
    const S = makeCamp(20260924);
    const { W, O, I, J, C, Cond, E } = S;
    check("plugins_load", typeof J.lethalHazardAt === "function" && typeof J.inLethalHazard === "function" && typeof J.safeCellNear === "function" && !!J.handler("extinguish") && typeof C.assess === "function" && typeof C.onUnitMoved === "function" && !!E && typeof E.igniteUnit === "function" && !!Cond,
        `Jobs lethalHazardAt/inLethalHazard/safeCellNear + extinguish; Colonists assess/onUnitMoved; Environment ${E ? "loaded" : "missing"}; Combat ${S.combatLoaded ? "loaded" : "not loaded"}`);
    drive(S, 16);

    // 1. A settler hauling timber whose square catches fire drops the haul at once and gets off the square.
    {
        const haul = postHaul(S, { x: 20, y: 20 });
        const nTake = drive(S, 400, () => haul.assigned && (haul.state === "travel" || haul.state === "work") && jobOf(S, W.unit(haul.assigned)) === haul);
        const F = haul.assigned ? W.unit(haul.assigned) : null;
        // A band of fire across its way to the logs (the sandbox walks a square per update: the row it steps onto burns).
        const row = F ? F.y - 3 : 0;
        if (F) for (let x = F.x - 6; x <= F.x + 6; x++) S.fire.add(`${x},${row}`);
        const nFail = F ? drive(S, 200, () => haul.state === "failed") : -1;
        const at = F ? { x: F.x, y: F.y } : null;
        const nFlee = F ? drive(S, 60, () => { const j = jobOf(S, F); return !!j && j.params && j.params.reflex === "hazard"; }) : -1;
        const flee = F ? jobOf(S, F) : null;
        const fleeTarget = flee ? { x: flee.target.x, y: flee.target.y } : null;
        const nSafe = F ? drive(S, 200, () => !burning(S, F.x, F.y) && !J.inLethalHazard(F)) : -1;
        const priorityWhileOnFire = F ? C.assess(Object.assign({}, F, { x: at.x, y: at.y })) : null;
        check("hauling_settler_on_fire_drops_job_and_flees", nTake > 0 && !!F && nFail > 0 && haul.reason === "emergency: lethal hazard" && at.y === row && nFlee > 0 && nFlee <= 40 && !!fleeTarget && !burning(S, fleeTarget.x, fleeTarget.y) && nSafe > 0 && !J.inLethalHazard(F) && priorityWhileOnFire && priorityWhileOnFire.priority === 2,
            F ? `${F.name} took haul #${haul.id} after ${nTake} updates; stepped onto the burning row y=${row} at (${at.x},${at.y}) -> haul ${haul.state} "${haul.reason}" (${nFail} updates after the fire was set); reflex ${flee ? `${flee.type} to (${fleeTarget.x},${fleeTarget.y})` : "none"} ${nFlee} update(s) later; safe after ${nSafe} more at (${F.x},${F.y}); assess on the burning square: ${priorityWhileOnFire ? `${priorityWhileOnFire.priority} ${priorityWhileOnFire.name} (${priorityWhileOnFire.detail})` : "?"}` : `nobody took the haul in ${nTake} updates (state ${haul.state})`);
        // Nothing but the reflex is taken while the square burns: the first ordinary job after the fire starts from safe ground.
        S.fire.clear();
        if (F) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) S.fire.add(`${F.x + dx},${F.y + dy}`); // fire closes in again
        O.setIn(S.area, 12, 12, "oak");
        J.create({ type: "chop", target: { area: { x: 0, y: 0 }, x: 12, y: 12, z: 0 } });
        let takenAt = null;
        const nWork = F ? drive(S, 600, () => { const j = jobOf(S, F); if (j && !(j.params && j.params.reflex) && !takenAt) takenAt = { type: j.type, x: F.x, y: F.y, hazard: !!J.inLethalHazard(F), tick: S.now() }; return !!takenAt; }) : -1;
        S.fire.clear();
        check("work_resumes_only_from_safe_ground", nWork > 0 && !!takenAt && takenAt.hazard === false && !burning(S, takenAt.x, takenAt.y),
            F ? `${F.name}'s first ordinary job after the fire (${takenAt ? takenAt.type : "none"}) began after ${nWork} updates standing at (${takenAt ? takenAt.x : "?"},${takenAt ? takenAt.y : "?"}), in a hazard: ${takenAt ? takenAt.hazard : "?"}` : "no settler");
    }

    // 2. Fire on every neighbouring square: the settler flees to the ring beyond, never into a burning square.
    {
        const F = S.founders[7];
        walk(F, 12, 50);
        const j0 = jobOf(S, F); if (j0) J.cancel(j0.id, "test reset");
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) S.fire.add(`${12 + dx},${50 + dy}`);
        const nFlee = drive(S, 120, () => { const j = jobOf(S, F); return !!j && j.params && j.params.reflex === "hazard"; });
        const flee = jobOf(S, F);
        const target = flee ? { x: flee.target.x, y: flee.target.y } : null;
        const nSafe = drive(S, 200, () => !J.inLethalHazard(F) && jobOf(S, F) !== flee);
        const dist = target ? cheb(target, { x: 12, y: 50 }) : -1;
        check("does_not_flee_into_fire", nFlee > 0 && !!target && !burning(S, target.x, target.y) && dist === 2 && nSafe > 0 && !burning(S, F.x, F.y) && !J.inLethalHazard(F),
            `nine burning squares around (12,50): reflex to (${target ? `${target.x},${target.y}` : "?"}) at distance ${dist}, burning ${target ? burning(S, target.x, target.y) : "?"}; ${F.name} ends at (${F.x},${F.y}), burning ${burning(S, F.x, F.y)}`);
        S.fire.clear();
    }

    // 3. On fire on safe ground: drop and roll; beside water: douse.
    {
        const A = S.founders[5], B = S.founders[6];
        walk(A, 20, 40); walk(B, 43, 32); // B beside the pond
        for (const u of [A, B]) { const j = jobOf(S, u); if (j) J.cancel(j.id, "test reset"); }
        E.igniteUnit(A, 40, 1); E.igniteUnit(B, 40, 1);
        const hzA = J.inLethalHazard(A);
        const nA = drive(S, 120, () => { const j = jobOf(S, A); return !!j && j.type === "extinguish"; });
        const jobA = jobOf(S, A), jobB = jobOf(S, B);
        const methods = { A: jobA ? jobA.params.method : null, B: jobB ? jobB.params.method : null };
        const nOut = drive(S, 400, () => !E.isBurning(A) && !E.isBurning(B));
        const doneA = S.J.get(jobA ? jobA.id : -1), doneB = S.J.get(jobB ? jobB.id : -1);
        check("burning_triggers_self_extinguish", !!hzA && hzA.kind === "burning" && nA > 0 && methods.A === "roll" && methods.B === "water" && nOut > 0 && !E.isBurning(A) && !E.isBurning(B) && doneA && doneA.state === "done" && doneA.result && doneA.result.extinguished && doneB && doneB.state === "done" && A.data.hp > 0 && B.data.hp > 0,
            `hazard "${hzA ? hzA.kind : "?"}"; ${A.name} on open ground: ${methods.A} (${doneA ? doneA.state : "?"}), ${B.name} beside the pond: ${methods.B} (${doneB ? doneB.state : "?"}); both out after ${nOut} updates, hit points ${A.data.hp}/${B.data.hp}`);
    }

    // 4. A grappler that steps away lets go the moment it moves (no Conditions.tick anywhere in this harness).
    {
        const G = S.spawn("Grappler", 50, 50), V = S.spawn("Victim", 50, 51);
        Cond.add(V, "grappled", { source: "hold", sourceUnitId: G.id });
        const held0 = Cond.has(V, "grappled");
        W.sendUnit(G.id, { x: 53, y: 50 });
        S.update(); // one step: distance 1, still held
        const heldAt1 = Cond.has(V, "grappled") && cheb(G, V) === 1;
        S.update(); // second step: distance 2, released within the same update
        const releasedAt2 = !Cond.has(V, "grappled") && cheb(G, V) === 2;
        check("grappler_step_breaks_grapple", held0 && heldAt1 && releasedAt2 && !G.data.grappling,
            `held before: ${held0}; after one step (distance ${cheb(G, V) - 1}) still held: ${heldAt1}; after the second step (distance ${cheb(G, V)}) released: ${releasedAt2}`);
        W.stopUnit(G.id);
    }

    // 5. Under attack: the unarmed run from the attacker, the armed hold their ground and drop their work.
    {
        const H = S.spawn("Wolf", 30, 45, { tags: ["hostile"], kind: "creature" });
        const R = S.founders[2], A = S.founders[3];
        walk(R, 30, 46); walk(A, 34, 46);
        for (const u of [R, A]) { const j = jobOf(S, u); if (j) J.cancel(j.id, "test reset"); }
        const club = I.give("club", 1, A.id, { bypassLimits: true })[0];
        I.equip(A.id, club.id, "mainHand");
        O.setIn(S.area, 36, 46, "oak");
        const chop = J.create({ type: "chop", target: { area: { x: 0, y: 0 }, x: 36, y: 46, z: 0 }, owner: A.id });
        if (C._internal.preemptAt) { C._internal.preemptAt.delete(R.id); C._internal.preemptAt.delete(A.id); } // no throttle left over from earlier scenes
        // The wolf bites both before either decides again: the runner is idle (its reset job put it in the pending set), the fighter is at work.
        S.sandbox.UF.Events.emit("combat:hit", { attacker: H, target: R, damage: 1, hit: true });
        S.sandbox.UF.Events.emit("combat:hit", { attacker: H, target: A, damage: 1, hit: true });
        const dR0 = cheb(R, H);
        const assessR = C.assess(R); // read before the flight: once out of THREAT_RADIUS the threat is over
        const nRun = drive(S, 120, () => { const j = jobOf(S, R); return !!j && j.params && j.params.reflex === "threat"; });
        const run = jobOf(S, R);
        const nCut = drive(S, 700, () => chop.state === "failed");
        const assessA = C.assess(A);
        const nFar = drive(S, 200, () => cheb(R, H) > dR0 + 2);
        const parts = { assessR: assessR.priority === 3 && assessR.detail === "runs", ran: nRun > 0 && !!run && run.type === "move", farther: !!run && cheb(run.target, H) > dR0, gotAway: nFar > 0, cut: nCut > 0 && chop.reason === "emergency: threat", holds: assessA.priority === 3 && assessA.detail === "holds ground", noWork: jobOf(S, A) === null };
        check("threat_response_run_or_hold", Object.values(parts).every(Boolean),
            `unarmed ${R.name}: assess ${assessR.priority} ${assessR.name} (${assessR.detail}), ran (${run ? `${run.type} to (${run.target.x},${run.target.y}), ${cheb(run.target, H)} from the wolf vs ${dR0}` : "no flight"}), now ${cheb(R, H)} away; armed ${A.name}: chop ${chop.state} "${chop.reason}" after ${nCut} updates, assess ${assessA.priority} ${assessA.name} (${assessA.detail}), takes no work while threatened: ${jobOf(S, A) === null}; ${JSON.stringify(parts)}`);
        delete R.data.threat; delete A.data.threat;
        W.removeUnit(H.id);
    }

    // 6. The order, read from assess(): a state per rung, each above the next.
    {
        const T = makeCamp(20260925);
        const [u1, u2, u3, u4, u5, u6, u7, u8] = T.founders;
        drive(T, 16);
        for (const u of T.founders) { const j = T.J.of(u.id); if (j) T.J.cancel(j.id, "test reset"); }
        const results = [];
        u1.data.hp = 0; results.push(["unable", T.C.assess(u1).priority, 1]); // 0 hit points
        T.fire.add(`${u2.x},${u2.y}`); results.push(["hazard", T.C.assess(u2).priority, 2]); T.fire.clear();
        const wolf = T.spawn("Wolf", u3.x + 1, u3.y, { tags: ["hostile"], kind: "creature" });
        T.sandbox.UF.Events.emit("combat:hit", { attacker: wolf, target: u3, damage: 1, hit: true }); results.push(["threat", T.C.assess(u3).priority, 3]); delete u3.data.threat; T.W.removeUnit(wolf.id);
        drive(T, 31); // a sweep: u1 at 0 hit points starts dying, so u4 sees a patient
        results.push(["aid", T.C.assess(u4).priority, 4]);
        u1.data.hp = 10; delete u1.data.dying;
        for (const u of T.founders) { const j = T.J.of(u.id); if (j) T.J.cancel(j.id, "test reset"); }
        T.time.setTime(19, 0); const n5 = T.C.needsOf(u5); n5.foodLb = 0; results.push(["critical", T.C.assess(u5).priority, 5]); n5.foodLb = 1; T.time.setTime(10, 0);
        u6.data.drafted = true; results.push(["orders", T.C.assess(u6).priority, 6]); delete u6.data.drafted;
        T.O.setIn(T.area, 20, 20, "oak"); const work = T.J.create({ type: "chop", target: { area: { x: 0, y: 0 }, x: 20, y: 20, z: 0 } }); results.push(["work", T.C.assess(u7).priority, 7]); T.J.cancel(work.id, "test");
        const n8 = T.C.needsOf(u8); n8.foodLb = 0; results.push(["routine", T.C.assess(u8).priority, 8]); n8.foodLb = 1;
        results.push(["idle", T.C.assess(u8).priority, 9]);
        check("priority_order_assessed", results.every(r => r[1] === r[2]),
            results.map(r => `${r[0]}=${r[1]}${r[1] === r[2] ? "" : ` (expected ${r[2]})`}`).join(", "));
    }

    // 7. A save in the middle of a flight: the reflex job, the threat and the flames come back and the flight ends safe.
    {
        const F = S.founders[4];
        walk(F, 12, 20);
        const j0 = jobOf(S, F); if (j0) J.cancel(j0.id, "test reset");
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) S.fire.add(`${12 + dx},${20 + dy}`);
        const bear = S.spawn("Bear", 16, 20, { tags: ["hostile"], kind: "creature" });
        F.data.threat = { attackerId: bear.id, at: S.now() };
        const nFlee = drive(S, 120, () => { const j = jobOf(S, F); return !!j && j.params && j.params.reflex === "hazard"; });
        const job1 = jobOf(S, F);
        const before = JSON.stringify(W.state), unitsBefore = JSON.stringify(W.state.units);
        const reflexBefore = job1 ? JSON.stringify({ id: job1.id, type: job1.type, params: job1.params, target: job1.target }) : null;
        const clean = !before.includes("undefined") && !before.includes("Infinity") && !before.includes("NaN");
        const contents = JSON.parse(JSON.stringify(S.sandbox.DataManager.makeSaveContents()));
        S.sandbox.DataManager.extractSaveContents(contents);
        // (UF_Jobs re-plans every job after a load, so the job list is not byte-identical; the units and the reflex job's
        //  own record are.)
        const unitsSame = JSON.stringify(W.state.units) === unitsBefore;
        const F2 = W.unit(F.id);
        const job2 = F2 ? jobOf(S, F2) : null;
        const reflexSame = job2 ? JSON.stringify({ id: job2.id, type: job2.type, params: job2.params, target: job2.target }) === reflexBefore : false;
        const nSafe = F2 ? drive(S, 200, () => !J.inLethalHazard(F2)) : -1;
        S.fire.clear();
        check("save_load_preserves_reflex_state", nFlee > 0 && clean && unitsSame && reflexSame && !!F2 && !!job2 && job2.params.reflex === "hazard" && F2.data.threat && F2.data.threat.attackerId === bear.id && nSafe > 0 && !burning(S, F2.x, F2.y),
            `flight saved after ${nFlee} updates (${before.length} bytes, JSON-clean ${clean}); units identical after the round trip ${unitsSame}, reflex job identical ${reflexSame} (${job2 ? `#${job2.id} ${job2.params.reflex}` : "lost"}), threat ${F2 && F2.data.threat ? "kept" : "lost"}; safe after ${nSafe} more updates at (${F2 ? F2.x : "?"},${F2 ? F2.y : "?"})`);
        if (F2) delete F2.data.threat;
        W.removeUnit(bear.id);
    }

    check("no_errors", errors.length === 0, errors.length ? errors[0].slice(0, 300) : `no console errors during ${S.now()} updates`);
} catch (e) {
    console.error(e && e.stack || e);
    console.log(`RESULT: ${passed} passed, ${failed} failed (harness error, exit 2)`);
    process.exit(2);
}

console.log(`\nRESULT: ${passed} passed, ${failed} failed (exit ${failed === 0 ? 0 : 1})`);
process.exit(failed === 0 ? 0 : 1);
