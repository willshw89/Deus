"use strict";
// tools/test_stabilization.js - Headless checks for SRD 5.1 dying and first aid among colonists (owner decision
// 2026-09-23, task 3 of the survival order): a colonist at 0 hit points is unconscious and rolls death saving throws
// by the round; an idle or ordinary-working colonist nearby drops what it does, reserves the patient, walks adjacent
// and makes a DC 10 Wisdom (Medicine) check; stable means no longer dying, not healed; the stable wake after 1d4
// hours with 1 hit point; damage at 0 is a failed save; three failures kill.
//
// Runs the real DEUS_Objects.js, DEUS_Items.js, DEUS_Jobs.js, DEUS_Projects.js and DEUS_Colonists.js in a Node vm
// against a World double and the real catalog. The driver only calls Game_Map.update; hit points are set directly
// (Combat is not loaded; its own hand-off is docs/handoffs/HANDOFF_srd_dying_and_stabilization.md).
//
// Usage: node tools/test_stabilization.js [--mutant=<name>] [--quiet]
//   --mutant   patches DEUS_Colonists.js in memory; the run must then FAIL (Rule 4):
//              no_rescue (nobody helps), heal_on_stable (stabilising heals), no_death_saves (the dying never roll),
//              instant_death (0 hit points kills at once)
// Exit code: 0 all checks passed, 1 a check failed, 2 harness problem.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const mutant = (process.argv.find(a => a.startsWith("--mutant=")) || "").slice(9);
const quiet = process.argv.includes("--quiet");

const MUTANTS = {
    no_rescue: ["if (!isColonist(u) || unconscious(u) || exhaustionOf(u) >= 5) return null;", "return null;"],
    heal_on_stable: ["d.stable = true;\n        d.successes = 0;", "d.stable = true; if (Number.isFinite(u.data.hp)) u.data.hp = u.data.maxHp || 10;\n        d.successes = 0;"],
    no_death_saves: ["while (t >= d.nextRoundAt && u.data.dying === d && !u.data.dead) {", "while (false) {"],
    instant_death: ["if (unconscious(u) && !u.data.dead) startDying(u); // idle or busy, 0 hit points is dying", "if (unconscious(u) && !u.data.dead) dieOf(u, \"wounds\");"]
};

const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "UF_WorldCatalog.json"), "utf8"));
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
    if (condition) { passed++; console.log(`PASS stabilize.${name}${detail ? " - " + detail : ""}`); }
    else { failed++; console.log(`FAIL stabilize.${name}${detail ? " - " + detail : ""}`); }
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
    const S = { sandbox, W, O: sandbox.UF.Objects, I: sandbox.UF.Items, J: sandbox.UF.Jobs, P: sandbox.UF.Projects, C: sandbox.UF.Colonists, map: new sandbox.Game_Map(), area: { x: 0, y: 0, z: 0 }, time: sandbox.$ufTime };
    S.now = () => clock;
    S.update = () => { clock++; W._frame = clock; W.walkUnits(); S.map.update(true); };
    return S;
}

const SIZE = 64, SITE = { x: 32, y: 32 }, RADIUS = 4;
function makeFixture(seed, opts = {}) {
    const S = makeSandbox(seed, SIZE);
    const { W, O, I, area } = S;
    for (let y = 30; y <= 34; y++) for (let x = 44; x <= 46; x++) W.water.add(y * SIZE + x);
    O.setIn(area, SITE.x, SITE.y, "campfire");
    for (let dy = -RADIUS; dy <= RADIUS; dy++) for (let dx = -RADIUS; dx <= RADIUS; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== RADIUS || dx === 0) continue;
        O.setIn(area, SITE.x + dx, SITE.y + dy, "wall_wood");
    }
    W.state.colony = { version: 2, factionId: "player", siteId: 1, site: { x: SITE.x, y: SITE.y }, area: { x: 0, y: 0 }, z: 0, radius: RADIUS,
        plan: JSON.parse(JSON.stringify(catalog.colony.plan)).map(s => Object.assign(s, { done: false })), stockpiles: [], log: [] };
    const seats = [[-1, -2], [1, -2], [-2, 0], [2, 0], [-1, 2], [1, 2], [0, -1], [0, 1]];
    const n = opts.founders === undefined ? 8 : opts.founders;
    S.founders = seats.slice(0, n).map((s, i) => W.addUnit({ x: SITE.x + s[0], y: SITE.y + s[1], data: { kind: "colonist", faction: "player", founder: true, age: 25, gender: i % 2 ? "female" : "male", inventory: [], site: 1, hp: 10, maxHp: 10, stats: { str: 10, dex: 10, con: 10, int: 10, wis: opts.wis === undefined ? 10 : opts.wis, cha: 10 }, proficiencies: opts.medicine ? ["medicine"] : [] } }));
    S.P.setEnabled(false); // no settlement project: the rescuers' ordinary work is what the harness gives them
    return S;
}
function drive(S, updates, until) {
    for (let i = 0; i < updates; i++) { S.update(); if (until && until()) return i + 1; }
    return until ? -1 : updates;
}
const jobOf = (S, u) => S.J.of(u.id);
const near = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const ROUND = 360, HOUR = 3600, SALT_ROLL = 0xc0;
const seededD20 = (S, ...parts) => 1 + Math.floor((hash32(S.W.state.seed, SALT_ROLL, ...parts) / 4294967296) * 20);

console.log("=== Dying and first aid (DEUS_Colonists.js + DEUS_Jobs.js stabilize) headless checks ===");
try {
    // A. Eight founders with good Wisdom and Medicine training; one collapses while working.
    const S = makeFixture(20260923, { wis: 20, medicine: true });
    const { W, O, J, C, area } = S;
    const cancelled = [], died = [], events = { dying: 0, stabilized: 0, conscious: 0 };
    S.sandbox.UF.Events.on("jobs:failed", j => cancelled.push({ id: j.id, type: j.type, reason: j.reason, unit: j.assigned }));
    S.sandbox.UF.Events.on("colonists:died", (u, cause) => died.push({ id: u.id, cause }));
    for (const k of Object.keys(events)) S.sandbox.UF.Events.on(`colonists:${k}`, () => events[k]++);
    check("plugins_load", !!J.handler("stabilize") && typeof C.stabilize === "function" && typeof C.woundedAtZero === "function" && typeof C.dying === "function" && C._internal.ROUND_TICKS === ROUND,
        `UF.Jobs has the stabilize job; UF.Colonists has stabilize/woundedAtZero/dying; a round is ${C._internal.ROUND_TICKS} ticks`);
    drive(S, 16);
    const F = S.founders[0];
    O.setIn(area, F.x, F.y - 3, "oak"); // outside the ring, on nobody's square
    const chop = J.create({ type: "chop", target: { area: { x: 0, y: 0 }, x: F.x, y: F.y - 3, z: 0 }, owner: F.id });
    drive(S, 40);
    F.data.hp = 0; // struck down
    const n1 = drive(S, 60, () => !!C.dying(F));
    const d0 = C.dying(F);
    const cutF = chop ? cancelled.find(c => c.id === chop.id) : null;
    check("unconscious_starts_dying", n1 > 0 && !!d0 && d0.successes === 0 && d0.failures === 0 && d0.stable === false && d0.nextRoundAt === d0.since + ROUND && !!cutF && cutF.reason === "survival: unconscious" && C.unconscious(F) && !jobOf(S, F) && C.decide(F) === null && events.dying === 1,
        `#${F.id} at 0 hit points after ${n1} updates: dying record ${JSON.stringify(d0)}; its chop ${cutF ? `cancelled "${cutF.reason}"` : "kept"}; decides nothing`);

    // B. Emergency aid: a colonist drops ordinary work, reserves the patient, no second rescuer.
    const n2 = drive(S, 90, () => J.list(j => j.type === "stabilize" && j.params.unitId === F.id && (j.state === "travel" || j.state === "work")).length > 0);
    const aid = J.list(j => j.type === "stabilize" && j.params.unitId === F.id && (j.state === "travel" || j.state === "work"));
    const R = aid.length ? W.unit(aid[0].assigned) : null;
    const emergencyCuts = cancelled.filter(c => c.reason === "emergency: aid");
    check("rescue_job_emergency", n2 > 0 && aid.length === 1 && !!R && R !== F && aid[0].params.emergency === true && J.reservation.reservedBy({ id: F.id }) === R.id && J.reservation.reservedBy(aid[0].target) === R.id,
        R ? `#${R.id} took stabilize#${aid[0].id} for #${F.id} after ${n2} updates (${emergencyCuts.length} worker(s) cut "emergency: aid"); patient reserved by ${J.reservation.reservedBy({ id: F.id })}, one rescuer` : `no rescuer in ${n2} updates`);

    // C. The Medicine check beside the patient: stable, not healed; the rescuer is released.
    const n3 = R ? drive(S, 3000, () => (C.dying(F) && C.dying(F).stable) || F.data.dead || !C.unconscious(F)) : -1;
    const dS = C.dying(F);
    const done = aid.length ? J.get(aid[0].id) : null;
    const res = done && done.result;
    const wakeHours = dS && dS.wakeAt !== null ? (dS.wakeAt - S.now()) / HOUR : -1;
    check("medicine_check_stabilizes", n3 > 0 && !!dS && dS.stable === true && !F.data.dead && !!res && res.ok === true && res.dc === 10 && res.total === res.roll + 5 + 2 && res.total >= 10 && near(R, F) <= 1 && events.stabilized === 1,
        dS ? `after ${n3} updates: ${dS.stable ? "stable" : "not stable"}; check d20 ${res ? res.roll : "?"} + 5 (Wis 20) + 2 (Medicine) = ${res ? res.total : "?"} against DC 10; rescuer #${R ? R.id : "?"} at distance ${R ? near(R, F) : "?"}` : `patient ${F.data.dead ? "died" : "vanished"} after ${n3} updates`);
    check("stable_not_healed", !!dS && dS.stable && F.data.hp === 0 && C.unconscious(F) && wakeHours >= 1 && wakeHours <= 4 && Number.isInteger(Math.round(wakeHours)) && J.reservation.reservedBy({ id: F.id }) === null,
        dS ? `hit points ${F.data.hp} (still 0), unconscious ${C.unconscious(F)}, wakes in ${wakeHours.toFixed(2)} h (1d4), patient reservation ${J.reservation.reservedBy({ id: F.id }) === null ? "released" : "kept"}` : "no dying record");
    const savesBefore = dS ? [dS.successes, dS.failures].join("/") : "?";
    drive(S, 2 * ROUND + 5);
    check("stable_skips_death_saves", !!dS && dS.stable && dS.successes === 0 && dS.failures === 0 && F.data.hp === 0 && !F.data.dead,
        `two rounds later the stable patient still shows ${C.dying(F) ? `${C.dying(F).successes}/${C.dying(F).failures}` : "?"} saves (was ${savesBefore}), hit points ${F.data.hp}`);

    // D. Waking: 1 hit point after the hours, conscious, back in the decision pool.
    const n4 = drive(S, 4 * HOUR + 400, () => !C.unconscious(F));
    check("wakes_with_one_hit_point", n4 > 0 && F.data.hp === 1 && !C.dying(F) && !C.unconscious(F) && events.conscious === 1 && !F.data.dead,
        `#${F.id} came to after ${n4} updates with ${F.data.hp} hit point(s); dying record ${C.dying(F) ? "still there" : "cleared"}`);
    check("no_errors_main", errors.length === 0, errors.length ? errors[0].slice(0, 200) : "no console errors in the main run");

    // E. Alone, over several seeds: the death saving throws, round by round, exactly as the seeded d20s say.
    {
        const lines = [];
        let allMatch = true, kinds = new Set();
        for (const seedNo of [7, 11, 13, 17, 19]) {
            const A = makeFixture(seedNo, { founders: 1 });
            drive(A, 16);
            const u = A.founders[0];
            u.data.hp = 0;
            drive(A, 60, () => !!A.C.dying(u));
            const d = A.C.dying(u);
            const t0 = d ? d.since : 0;
            // The same rule the plugin follows, from the same seeded rolls.
            let s = 0, f = 0, outcome = null, rolls = [];
            for (let k = 1; k <= 12 && !outcome; k++) {
                const roll = seededD20(A, u.id, t0 + k * ROUND, 21);
                rolls.push(roll);
                if (roll === 20) { outcome = "conscious"; break; }
                if (roll === 1) f += 2; else if (roll >= 10) s += 1; else f += 1;
                if (f >= 3) outcome = "dead";
                else if (s >= 3) outcome = "stable";
            }
            drive(A, rolls.length * ROUND + 30);
            const dd = A.C.dying(u);
            const actual = u.data.dead ? "dead" : (dd ? (dd.stable ? "stable" : `${dd.successes}/${dd.failures}`) : (A.W.unit(u.id) && u.data.hp === 1 ? "conscious" : "gone"));
            const match = !!d && !!outcome && actual === outcome;
            allMatch = allMatch && match;
            if (outcome) kinds.add(outcome);
            lines.push(`seed ${seedNo}: rolls ${rolls.join(" ")} -> ${outcome || "undecided"}, plugin ${actual}${match ? "" : " MISMATCH"}`);
        }
        check("death_saves_by_the_round", allMatch && kinds.size >= 2, lines.join("; "));
    }

    // F. Damage at 0 hit points is a failed save (two on a critical hit); a stable patient hit again is dying again.
    {
        const B = makeFixture(8, { founders: 2 });
        drive(B, 16);
        const [p, q] = B.founders;
        p.data.hp = 0;
        drive(B, 60, () => !!B.C.dying(p));
        const dp = B.C.dying(p);
        const hit1 = dp ? B.C.woundedAtZero(p, false) : null;
        const f1 = hit1 ? hit1.failures : -1;
        if (dp) B.C._internal.becomeStable(p, dp, "test");
        const wasStable = !!dp && dp.stable;
        const afterHit = dp ? B.C.woundedAtZero(p, false) : null;
        const stableAfter = afterHit ? afterHit.stable : null, f2 = afterHit ? afterHit.failures : -1;
        if (dp) B.C.woundedAtZero(p, true); // two more failures: three in all
        const diedOfWounds = p.data.dead === true && !B.W.unit(p.id);
        q.data.hp = 0;
        drive(B, 60, () => !!B.C.dying(q));
        check("damage_at_zero_fails_saves", f1 === 1 && wasStable && stableAfter === false && f2 === 1 && diedOfWounds,
            `#${p.id}: one hit at 0 -> ${f1} failure; stabilised, hit again -> ${stableAfter ? "still stable" : "dying again"} with ${f2} failure; a critical hit -> ${diedOfWounds ? "dead and removed" : "alive"}`);
    }
    {
        const Pz = makeFixture(9, { founders: 3, wis: 20, medicine: true });
        drive(Pz, 16);
        const [pt, tired, thirsty] = Pz.founders;
        Pz.C.needsOf(tired).exhaustion = 5;
        Pz.C.needsOf(thirsty).waterGal = 0;
        pt.data.hp = 0;
        drive(Pz, 90, () => Pz.J.list(j => j.type === "stabilize" && (j.state === "travel" || j.state === "work")).length > 0);
        const who = Pz.J.list(j => j.type === "stabilize" && (j.state === "travel" || j.state === "work")).map(j => j.assigned);
        check("rescue_priority", who.length === 1 && who[0] === thirsty.id && Pz.C._internal.rescueJob(tired) === null,
            `patient #${pt.id}: rescuer ${who.join(",") || "none"} (thirsty #${thirsty.id} helps before drinking; #${tired.id} at exhaustion 5 cannot)`);
    }

    check("no_errors", errors.length === 0, errors.length ? errors[0].slice(0, 200) : "no console errors during the run");
} catch (e) {
    console.error(e && e.stack || e);
    console.log(`RESULT: ${passed} passed, ${failed} failed (harness error, exit 2)`);
    process.exit(2);
}

console.log(`\nRESULT: ${passed} passed, ${failed} failed (exit ${failed === 0 ? 0 : 1})`);
process.exit(failed === 0 ? 0 : 1);
