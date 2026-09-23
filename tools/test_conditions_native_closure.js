"use strict";
// tools/test_conditions_native_closure.js - Headless closure of the SRD 5.1 condition contracts (DEUS-TSK-FABLE-10):
// what a creature drops and what it keeps in its grip; when a grapple ends; what a frightened creature may still do
// when it can and cannot see what it fears; what a charmer gains and what the charmed refuses; a stable creature at
// 0 hit points against a dying one; two instances of one condition; and a save that comes back byte for byte.
//
// Runs the real DEUS_Objects.js, DEUS_Items.js, DEUS_Jobs.js, DEUS_Colonists.js, DEUS_Conditions.js, DEUS_Combat.js
// and DEUS_Dnd5e.js in a Node vm against a World double (one 64x64 ground area) with the real catalog, the calendar
// at DEUS_Core's rate (600 updates an hour). Items are the live model: equipped slots hold the ids of carried items.
//
// Usage: node tools/test_conditions_native_closure.js [--mutant=<name>] [--quiet]
//   --mutant   patches DEUS_Conditions.js in memory; the run must then FAIL (Rule 4):
//              stunned_drops_item, grapple_survives_incapacitated, frightened_allows_advance, charmed_allows_attack
// Exit code: 0 all checks passed, 1 a check failed, 2 harness problem.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const arg = (name, fallback) => { const a = process.argv.find(x => x.startsWith(`--${name}=`)); return a ? a.slice(name.length + 3) : fallback; };
const mutant = arg("mutant", "");
const quiet = process.argv.includes("--quiet");
const HOUR_TICKS = 600, MINUTE_TICKS = 10, ROUND = 360;

const MUTANTS = {
    stunned_drops_item: { from: "const DROPS_HELD = [\"unconscious\", \"petrified\"];", to: "const DROPS_HELD = [\"unconscious\", \"petrified\", \"stunned\"];" },
    grapple_survives_incapacitated: { from: "if (INCAPACITATING.includes(cid)) releaseGrapplesHeldBy(unit, `grappler ${cid}`);", to: "if (false) releaseGrapplesHeldBy(unit, `grappler ${cid}`);" },
    frightened_allows_advance: { from: "if (targetDist < currentDist) {\n                    return false;\n                }", to: "if (targetDist < currentDist) {\n                    return true;\n                }" },
    charmed_allows_attack: { from: "inst.sourceUnitId === target.id) {\n                    return false;", to: "inst.sourceUnitId === target.id) {\n                    return true;" }
};

const catalogText = fs.readFileSync(path.join(ROOT, "game", "data", "UF_WorldCatalog.json"), "utf8");
const read = name => fs.readFileSync(path.join(PLUGINS, name), "utf8");
const sources = { objects: read("DEUS_Objects.js"), items: read("DEUS_Items.js"), jobs: read("DEUS_Jobs.js"), colonists: read("DEUS_Colonists.js"), conditions: read("DEUS_Conditions.js"), combat: read("DEUS_Combat.js"), dnd5e: read("DEUS_Dnd5e.js") };
if (mutant) {
    const m = MUTANTS[mutant];
    if (!m) { console.error(`unknown mutant "${mutant}" (known: ${Object.keys(MUTANTS).join(", ")})`); process.exit(2); }
    if (!sources.conditions.includes(m.from)) { console.error(`mutant "${mutant}": pattern not found in DEUS_Conditions.js`); process.exit(2); }
    sources.conditions = sources.conditions.replace(m.from, m.to);
    console.log(`MUTANT ${mutant}: DEUS_Conditions.js patched in memory; this run must FAIL`);
}

let passed = 0, failed = 0;
function check(name, condition, detail = "") {
    if (condition) { passed++; console.log(`PASS conditions.${name}${detail ? " - " + detail : ""}`); }
    else { failed++; console.log(`FAIL conditions.${name}${detail ? " - " + detail : ""}`); }
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
// The sandbox: the real plugins over a World double with a running calendar

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
                u.x = nx; u.y = ny;
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
        hour: 8, minute: 0, day: 1, monthIndex: 0, year: 1, seasonName: "spring",
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
        $gameMap: null, $dataMap: null, $gamePlayer: null,
        $ufWorldCatalog: catalog, $deusWorldCatalog: catalog,
        $ufTime: time
    });
    sandbox.window = sandbox;
    sandbox.global = sandbox;
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
    vm.runInContext(sources.colonists, sandbox, { filename: "DEUS_Colonists.js" });
    vm.runInContext(sources.conditions, sandbox, { filename: "DEUS_Conditions.js" });
    let combatLoaded = true;
    try { vm.runInContext(sources.combat, sandbox, { filename: "DEUS_Combat.js" }); } catch (e) { combatLoaded = false; errors.push(`DEUS_Combat.js did not load: ${e.message}`); }
    try { vm.runInContext(sources.dnd5e, sandbox, { filename: "DEUS_Dnd5e.js" }); } catch (e) { errors.push(`DEUS_Dnd5e.js did not load: ${e.message}`); }
    const S = { sandbox, W, O: sandbox.UF.Objects, I: sandbox.UF.Items, J: sandbox.UF.Jobs, C: sandbox.UF.Colonists, Cond: sandbox.UF.Conditions, Combat: combatLoaded ? sandbox.UF.Combat : null, Dnd: sandbox.UF.Dnd5e || null, map: new sandbox.Game_Map(), area: { x: 0, y: 0, z: 0 }, catalog, time, combatLoaded };
    S.now = () => clock;
    S.update = () => {
        clock++;
        W._frame = clock;
        if (clock % MINUTE_TICKS === 0) time.advanceMinute();
        W.walkUnits();
        S.map.update(true);
    };
    S.events = [];
    for (const name of ["condition:dropped_items", "condition:expired", "condition:removed", "condition:added", "colonists:conscious", "colonists:dying"]) {
        sandbox.UF.Events.on(name, (...args) => S.events.push({ name, unit: args[0] && args[0].id, arg: args[1] }));
    }
    return S;
}

//-----------------------------------------------------------------------------
// The camp: hearth, ring, eight founders with rations

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
    S.founders = seats.map((s, i) => W.addUnit({ name: `Founder ${i + 1}`, x: SITE.x + s[0], y: SITE.y + s[1], data: { kind: "colonist", faction: "player", founder: true, age: 25, gender: i % 2 ? "female" : "male", inventory: [], site: 1, hp: 10, maxHp: 10, stats: { str: 10, dex: 10, con: 10, int: 10, wis: 14, cha: 10 } } }));
    for (const u of S.founders) I.give("rations", 3, u.id, { bypassLimits: true });
    // Free-standing units outside the colony for the fear and charm scenes.
    S.spawn = (name, x, y, extra = {}) => W.addUnit({ name, x, y, data: Object.assign({ kind: "creature", faction: "wild", inventory: [], hp: 10, maxHp: 10, stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, combat: { mode: "manual" } }, extra) });
    return S;
}
function drive(S, updates, until) {
    for (let i = 0; i < updates; i++) { S.update(); if (until && until()) return i + 1; }
    return until ? -1 : updates;
}
/** Gives the unit a carried item and equips it in a hand slot; returns the item record. */
function arm(S, u, typeId, slot) {
    const made = S.I.give(typeId, 1, u.id, { bypassLimits: true });
    const it = made[0];
    if (!it) throw new Error(`could not give ${typeId}`);
    S.I.equip(u.id, it.id, slot);
    return it;
}
const onCell = (S, u, itemId) => S.I.atIn(S.area, u.x, u.y).some(it => it.id === itemId);
const carried = (S, u, itemId) => { const it = S.I.get(itemId); return !!it && it.holder === u.id; };
const walk = (S, u, x, y) => { u.x = x; u.y = y; };

//-----------------------------------------------------------------------------
// Checks

console.log("=== SRD 5.1 condition closure (DEUS_Conditions.js) headless checks ===");
try {
    const S = makeCamp(20260924);
    const { Cond, I, O, C, W } = S;
    const [F1, F2, F3, F4, F5, F6, F7, F8] = S.founders;
    check("plugins_load", !!Cond && typeof Cond.isStable === "function" && typeof Cond.onUnitMoved === "function" && typeof Cond.releaseGrapples === "function" && typeof Cond.lineOfSight === "function" && typeof Cond.socialCheckModifiers === "function" && typeof Cond.fearSourceVisible === "function" && JSON.stringify(Cond.DROPS_HELD) === JSON.stringify(["unconscious", "petrified"]) && !!C && !!I,
        `Conditions with isStable/onUnitMoved/releaseGrapples/lineOfSight/socialCheckModifiers/fearSourceVisible; drops held: ${Cond.DROPS_HELD.join(", ")}; Combat ${S.combatLoaded ? "loaded" : "not loaded"}, Dnd5e ${S.Dnd ? "loaded" : "not loaded"}`);
    drive(S, 16);

    // 1. Grip: unconscious and petrified drop what they hold onto their own square; incapacitated, stunned and
    //    paralyzed keep it.
    {
        const axe = arm(S, F1, "stone_axe", "mainHand"), club = arm(S, F1, "club", "offHand");
        S.events.length = 0;
        const inst = Cond.add(F1, "unconscious", { source: "sleep_spell" });
        const dropped = S.events.filter(e => e.name === "condition:dropped_items" && e.unit === F1.id);
        check("unconscious_drops_held_items", !!inst && onCell(S, F1, axe.id) && onCell(S, F1, club.id) && !carried(S, F1, axe.id) && !carried(S, F1, club.id) && F1.data.equipment.mainHand === null && F1.data.equipment.offHand === null && dropped.length === 1 && dropped[0].arg.length === 2 && !Cond.canAct(F1) && Cond.has(F1, "prone"),
            `axe #${axe.id} and club #${club.id} on (${F1.x},${F1.y}): ${onCell(S, F1, axe.id) && onCell(S, F1, club.id)}; slots ${JSON.stringify({ mainHand: F1.data.equipment.mainHand, offHand: F1.data.equipment.offHand })}; ${dropped.length} drop event(s) with ${dropped[0] ? dropped[0].arg.length : 0} items; cannot act, prone`);
        Cond.clear(F1);
        const axe2 = arm(S, F2, "stone_axe", "mainHand");
        Cond.add(F2, "petrified", { source: "basilisk_gaze" });
        check("petrified_drops_held_items", onCell(S, F2, axe2.id) && !carried(S, F2, axe2.id) && F2.data.equipment.mainHand === null && Cond.has(F2, "incapacitated") && !Cond.canAct(F2) && Cond.damageMultiplier(F2) === 0.5,
            `axe #${axe2.id} on (${F2.x},${F2.y}): ${onCell(S, F2, axe2.id)}; mainHand ${F2.data.equipment.mainHand}; incapacitated, half damage`);
        Cond.clear(F2);
        const kept = [];
        for (const cid of ["incapacitated", "stunned", "paralyzed"]) {
            const it = arm(S, F3, "stone_axe", "mainHand");
            Cond.add(F3, cid, { source: `test_${cid}` });
            kept.push({ cid, held: carried(S, F3, it.id) && F3.data.equipment.mainHand === it.id && !onCell(S, F3, it.id), cannotAct: !Cond.canAct(F3) && !Cond.canReact(F3) });
            Cond.clear(F3);
            I.unequip(F3.id, "mainHand");
            I.remove(it.id);
        }
        check("incapacitated_stunned_paralyzed_keep_grip", kept.length === 3 && kept.every(k => k.held && k.cannotAct),
            kept.map(k => `${k.cid}: grip ${k.held ? "held" : "LOST"}, ${k.cannotAct ? "cannot act or react" : "CAN act"}`).join("; "));
        // Downed at 0 hit points by DEUS_Combat: the world's event drops the items too.
        const axe4 = arm(S, F4, "stone_axe", "mainHand");
        F4.data.hp = 0;
        S.sandbox.UF.Events.emit("combat:downed", { attacker: F5, target: F4 });
        check("downed_at_zero_hp_drops_items", onCell(S, F4, axe4.id) && F4.data.equipment.mainHand === null && Cond.has(F4, "unconscious") && !Cond.canAct(F4),
            `after combat:downed the axe lies on (${F4.x},${F4.y}): ${onCell(S, F4, axe4.id)}; unconscious by the 0-hit-point rule: ${Cond.has(F4, "unconscious")}`);
        F4.data.hp = 10;
        delete F4.data.dying;
    }

    // 2. Grapples end the moment the grappler cannot act, dies, leaves, or moves out of reach.
    {
        const G = S.spawn("Grappler", 20, 20), V = S.spawn("Victim", 20, 21);
        const results = [];
        for (const cid of Cond.INCAPACITATING) {
            const g = Cond.add(V, "grappled", { source: "hold", sourceUnitId: G.id });
            const before = Cond.has(V, "grappled") && Array.isArray(G.data.grappling) && G.data.grappling.includes(V.id);
            S.events.length = 0;
            Cond.add(G, cid, { source: `test_${cid}` }); // no tick between: the grapple must be gone already
            const ended = S.events.find(e => e.name === "condition:expired" && e.unit === V.id && e.arg && e.arg.condition === "grappled");
            results.push({ cid, before, after: !Cond.has(V, "grappled") && !G.data.grappling && !!ended && !!g });
            Cond.clear(G);
            Cond.clear(V);
        }
        Cond.add(V, "grappled", { source: "hold", sourceUnitId: G.id });
        Cond.add(G, "poisoned", { source: "test_poison" });
        const keptUnderPoison = Cond.has(V, "grappled");
        Cond.clear(G);
        check("grapple_ends_when_grappler_incapacitated", results.length === 5 && results.every(r => r.before && r.after) && keptUnderPoison,
            `${results.map(r => `${r.cid}: ${r.before ? "held" : "NOT held"} -> ${r.after ? "ended at once" : "STILL held"}`).join("; ")}; poisoned grappler keeps it: ${keptUnderPoison}`);
        // Death and removal.
        G.data.dead = true;
        S.sandbox.UF.Events.emit("colonists:died", G, "test");
        const endedOnDeath = !Cond.has(V, "grappled");
        G.data.dead = false;
        Cond.add(V, "grappled", { source: "hold", sourceUnitId: G.id });
        const G2 = S.spawn("Grappler 2", 20, 22);
        Cond.add(V, "grappled", { source: "hold2", sourceUnitId: G2.id });
        W.removeUnit(G2.id);
        const endedOnRemoval = Cond.instances(V, "grappled").every(i => i.sourceUnitId !== G2.id) && Cond.instances(V, "grappled").length === 1;
        check("grapple_ends_when_grappler_dies_or_leaves", endedOnDeath && endedOnRemoval,
            `grappler dead -> released: ${endedOnDeath}; second grappler removed from the world -> its hold released, the other kept: ${endedOnRemoval}`);
        // Moving out of reach: the mover's own notice, and the victim's tick.
        walk(S, G, 23, 20);
        const endedOnMove = Cond.onUnitMoved(G);
        const freeAfterMove = !Cond.has(V, "grappled");
        walk(S, G, 20, 20);
        Cond.add(V, "grappled", { source: "hold", sourceUnitId: G.id });
        walk(S, G, 25, 25);
        Cond.tick(V, S.now());
        check("grapple_ends_when_grappler_moves_away", endedOnMove === 1 && freeAfterMove && !Cond.has(V, "grappled") && !G.data.grappling,
            `onUnitMoved(grappler 3 cells away) ended ${endedOnMove}; victim free: ${freeAfterMove}; tick() after another move frees too: ${!Cond.has(V, "grappled")}`);
    }

    // 3. Frightened: never willingly closer; disadvantage only while a source of the fear is in sight.
    {
        // Open ground away from the camp ring (which itself blocks sight): the source six cells east of the creature.
        const M = S.spawn("Dragon", 16, 50), F = S.spawn("Scared", 10, 50), other = S.spawn("Bystander", 10, 54);
        Cond.add(F, "frightened", { source: "frightful_presence", sourceUnitId: M.id });
        const closer = Cond.canWillinglyMoveTo(F, 11, 50), away = Cond.canWillinglyMoveTo(F, 9, 50), sideways = Cond.canWillinglyMoveTo(F, 10, 51);
        const seen = Cond.fearSourceVisible(F), atkSeen = Cond.attackRollModifiers(F, other, { distance: 4 }), chkSeen = Cond.checkModifiers(F, "wis", "perception");
        for (const y of [49, 50, 51]) O.setIn(S.area, 13, y, "wall_wood");
        const hidden = Cond.fearSourceVisible(F), atkHidden = Cond.attackRollModifiers(F, other, { distance: 4 }), chkHidden = Cond.checkModifiers(F, "wis", "perception");
        const closerHidden = Cond.canWillinglyMoveTo(F, 11, 50), awayHidden = Cond.canWillinglyMoveTo(F, 9, 50);
        const forced = Cond.attackRollModifiers(F, other, { distance: 4, fearSourceVisible: true });
        for (const y of [49, 50, 51]) O.setIn(S.area, 13, y, 0);
        const seenAgain = Cond.fearSourceVisible(F);
        check("frightened_cannot_approach_visible_or_hidden_source", closer === false && away === true && sideways === true && closerHidden === false && awayHidden === true,
            `source at (16,50), creature at (10,50): closer refused ${!closer}, away ${away}, sideways (same distance) ${sideways}; behind a wall: closer still refused ${!closerHidden}, away ${awayHidden}`);
        check("frightened_disadvantage_suspended_without_line_of_sight", seen === true && atkSeen.disadvantage === true && chkSeen.disadvantage === true && hidden === false && atkHidden.disadvantage === false && !atkHidden.disSources.includes("attacker_frightened") && chkHidden.disadvantage === false && !chkHidden.disSources.includes("frightened") && forced.disadvantage === true && seenAgain === true,
            `in sight: attack disadvantage ${atkSeen.disadvantage}, check disadvantage ${chkSeen.disadvantage}; walls at x=13: seen ${hidden}, attack ${atkHidden.disadvantage} (${atkHidden.disSources.join(",") || "none"}), check ${chkHidden.disadvantage}; opts.fearSourceVisible forces ${forced.disadvantage}; walls gone: seen ${seenAgain}`);
        Cond.clear(F);
    }

    // 4. Charmed: the charmer's social checks against the charmed creature have advantage; the charmed creature
    //    refuses to harm the charmer and nobody else is spared.
    {
        const Cx = S.spawn("Siren", 10, 10), T = S.spawn("Enamored", 10, 11), U = S.spawn("Stranger", 12, 10), A = S.spawn("Other talker", 11, 12);
        Cond.add(T, "charmed", { source: "charm_person", sourceUnitId: Cx.id, duration: 6000 });
        const social = Cond.socialCheckModifiers(Cx, T, "cha", "persuasion"), deception = Cond.socialCheckModifiers(Cx, T, "cha", "deception", { social: true });
        const vsStranger = Cond.socialCheckModifiers(Cx, U, "cha", "persuasion"), otherActor = Cond.socialCheckModifiers(A, T, "cha", "persuasion"), athletics = Cond.socialCheckModifiers(Cx, T, "str", "athletics");
        const harmCharmer = Cond.canHarmfullyTarget(T, Cx), harmOther = Cond.canHarmfullyTarget(T, U), charmerHarms = Cond.canHarmfullyTarget(Cx, T);
        let combatRefused = null, combatAllowed = null;
        if (S.Combat && typeof S.Combat.resolveAttack === "function") {
            combatRefused = S.Combat.resolveAttack(T, Cx, { hit: true, damage: 1 }) === null;
            combatAllowed = S.Combat.resolveAttack(T, U, { hit: true, damage: 1 }) !== null;
        }
        check("charmer_social_advantage", social.advantage === true && social.charmerAdvantage === true && social.advSources.includes("charmer_social") && deception.advantage === true && vsStranger.advantage === false && otherActor.advantage === false && athletics.advantage === false && Cond.charmerHasAdvantageOver(Cx, T) && !Cond.charmerHasAdvantageOver(A, T),
            `charmer vs charmed: persuasion advantage ${social.advantage} (${social.advSources.join(",")}), deception ${deception.advantage}; vs a stranger ${vsStranger.advantage}; another talker vs the charmed ${otherActor.advantage}; athletics ${athletics.advantage}`);
        check("charmed_refuses_harm_to_charmer", harmCharmer === false && harmOther === true && charmerHarms === true && combatRefused !== false && combatAllowed !== false,
            `charmed -> charmer refused ${!harmCharmer}, charmed -> stranger allowed ${harmOther}, charmer -> charmed allowed ${charmerHarms}; DEUS_Combat.resolveAttack: on the charmer ${combatRefused === null ? "not loaded" : combatRefused ? "refused (null)" : "ALLOWED"}, on a stranger ${combatAllowed === null ? "not loaded" : combatAllowed ? "resolved" : "REFUSED"}`);
        Cond.clear(T);
    }

    // 5. Dying versus stable at 0 hit points (DEUS_Colonists owns the state; Conditions reflects it).
    {
        const P = F5, Q = F6;
        P.data.hp = 0; Q.data.hp = 0;
        const n0 = drive(S, 120, () => !!P.data.dying && !!Q.data.dying);
        const d = P.data.dying;
        if (d) { d.stable = true; d.successes = 0; d.failures = 0; d.wakeAt = S.now() + 4 * HOUR_TICKS; } // wakes after the five rounds watched below
        const before = d ? { s: d.successes, f: d.failures } : null;
        const reflected = Cond.instances(P, "unconscious")[0] || null;
        drive(S, 5 * ROUND);
        const dq = Q.data.dying;
        const stableStill = !!P.data.dying && P.data.dying.stable === true && P.data.dying.successes === 0 && P.data.dying.failures === 0 && P.data.hp === 0;
        const controlRolled = Q.data.hp >= 1 || Q.data.dead || (!!dq && dq.successes + dq.failures >= 1) || Q.data.hp === 0 && !dq;
        check("stable_dying_skips_death_saves", n0 > 0 && !!d && !!reflected && reflected.source === "zero_hp" && reflected.stable === true && reflected.dying === true && Cond.isStable(P) && Cond.has(P, "unconscious") && !Cond.canAct(P) && Cond.speedZero(P) && stableStill && controlRolled,
            `stable patient after 5 rounds: saves ${P.data.dying ? `${P.data.dying.successes}/${P.data.dying.failures}` : "?"} (was ${before ? `${before.s}/${before.f}` : "?"}), hp ${P.data.hp}, unconscious ${Cond.has(P, "unconscious")}, isStable ${Cond.isStable(P)}, reflected ${JSON.stringify(reflected ? { source: reflected.source, dying: reflected.dying, stable: reflected.stable } : null)}; the unstable control rolled: ${dq ? `${dq.successes}/${dq.failures}` : `no dying record (hp ${Q.data.hp}, dead ${!!Q.data.dead})`}`);
        const nW = drive(S, 3 * HOUR_TICKS, () => !P.data.dying);
        const woke = S.events.some(e => e.name === "colonists:conscious" && e.unit === P.id);
        check("stable_stays_unconscious_until_revived", nW > 0 && woke && P.data.hp >= 1 && !Cond.has(P, "unconscious") && Cond.canAct(P) && !Cond.isStable(P),
            `woke after ${nW} updates (${(nW / HOUR_TICKS).toFixed(1)} h): hp ${P.data.hp}, unconscious ${Cond.has(P, "unconscious")}, can act ${Cond.canAct(P)}`);
        if (Q.data.dying) { delete Q.data.dying; }
        Q.data.hp = 10; Q.data.dead = false;
    }

    // 6. Two instances of one condition: one penalty, and each ends on its own.
    {
        const X = S.spawn("Poisoned twice", 15, 15);
        const t0 = S.now();
        const a = Cond.add(X, "poisoned", { source: "spider_bite", duration: 100 });
        const b = Cond.add(X, "poisoned", { source: "poison_cloud", duration: 300 });
        const mods = Cond.checkModifiers(X, "str", "athletics");
        const once = mods.disSources.filter(s => s === "poisoned").length === 1 && mods.disadvantage === true;
        const removedA = Cond.remove(X, "poisoned", a.id);
        const stillB = Cond.has(X, "poisoned") && Cond.instances(X, "poisoned").length === 1 && Cond.instances(X, "poisoned")[0].id === b.id;
        drive(S, 150);
        Cond.tick(X, S.now());
        const at150 = Cond.has(X, "poisoned");
        drive(S, 151);
        Cond.tick(X, S.now());
        const at301 = Cond.has(X, "poisoned");
        const expiredB = S.events.filter(e => e.name === "condition:expired" && e.unit === X.id && e.arg && e.arg.id === b.id).length;
        check("multi_instance_non_stacking_and_isolated_removal", a.id !== b.id && once && removedA && stillB && at150 === true && at301 === false && expiredB === 1,
            `two poisons -> one disadvantage (${mods.disSources.join(",")}); removed the bite -> the cloud remains (${stillB}); t+150 still poisoned ${at150}; t+301 expired ${!at301} (expiry events ${expiredB}); ids ${a.id}, ${b.id}`);
    }

    // 7. Save and load: the record is JSON, byte for byte the same after a round trip, with durations, sources and
    //    metadata intact; an indefinite condition stays indefinite; new instance ids stay unique afterwards.
    {
        const Y = S.spawn("Saved", 18, 18), M2 = S.spawn("Ghost", 18, 20), Cz = S.spawn("Charmer", 19, 18);
        const t0 = S.now();
        Cond.add(Y, "poisoned", { source: "dart", duration: 300, metadata: { potency: 2, tags: ["needle", "blue"] } });
        Cond.add(Y, "frightened", { source: "specter", sourceUnitId: M2.id });
        Cond.add(Y, "charmed", { source: "charm_person", sourceUnitId: Cz.id, duration: 1000, saveDc: 13, saveAbility: "wis" });
        Cond.add(Y, "grappled", { source: "hold", sourceUnitId: Cz.id });
        const json1 = JSON.stringify(Y.data.conditions);
        const clean = !json1.includes("Infinity") && !json1.includes("undefined") && !json1.includes("NaN");
        const parsed = JSON.parse(json1);
        const Z = S.spawn("Loaded", 18, 18, { conditions: parsed, conditionSeq: Y.data.conditionSeq });
        const json2 = JSON.stringify(Z.data.conditions);
        const poisonY = Cond.instances(Y, "poisoned")[0], poisonZ = Cond.instances(Z, "poisoned")[0];
        const fearZ = Cond.instances(Z, "frightened")[0], charmZ = Cond.instances(Z, "charmed")[0];
        const same = json1 === json2 && poisonZ.expiresAt === poisonY.expiresAt && poisonZ.expiresAt === t0 + 300 && JSON.stringify(poisonZ.metadata) === JSON.stringify({ potency: 2, tags: ["needle", "blue"] }) && fearZ.sourceUnitId === M2.id && fearZ.duration === null && fearZ.expiresAt === null && charmZ.saveDc === 13 && charmZ.saveAbility === "wis" && charmZ.sourceUnitId === Cz.id;
        const behaves = Cond.has(Z, "poisoned") && Cond.has(Z, "frightened") && !Cond.canWillinglyMoveTo(Z, 18, 19) && !Cond.canHarmfullyTarget(Z, Cz) && Cond.speedZero(Z);
        // Ticking the copy expires the poison at the very same tick the original would.
        Cond.tick(Z, t0 + 299); const alive299 = Cond.has(Z, "poisoned");
        Cond.tick(Z, t0 + 300); const alive300 = Cond.has(Z, "poisoned");
        const fresh = Cond.add(Z, "poisoned", { source: "later" });
        const ids = new Set([].concat(...Object.keys(Y.data.conditions).map(k => Y.data.conditions[k].instances.map(i => i.id))));
        const unique = !ids.has(fresh.id) && Z.data.conditionSeq === Y.data.conditionSeq + 1;
        check("save_load_round_trip", clean && same && behaves && alive299 && !alive300 && unique,
            `${json1.length} bytes, no Infinity/undefined: ${clean}; identical after the round trip: ${json1 === json2}; poison expires at ${poisonZ.expiresAt} (set at ${t0}+300), metadata ${JSON.stringify(poisonZ.metadata)}, fear source #${fearZ.sourceUnitId} indefinite (${fearZ.duration}), charm DC ${charmZ.saveDc} ${charmZ.saveAbility}; the copy behaves (frightened, charmed, grappled): ${behaves}; expiry at t+299/t+300: ${alive299}/${alive300}; a new instance id ${fresh.id} is unique: ${unique}`);
        Cond.clear(Y); Cond.clear(Z);
    }

    // 8. Every instance stamp carries its time domain.
    {
        const T = S.spawn("Tagged", 5, 5);
        Cond.add(T, "blinded", { source: "dust", duration: 50 });
        Cond.add(T, "restrained", { source: "net" });
        const insts = [].concat(...Object.keys(T.data.conditions).map(k => T.data.conditions[k].instances));
        check("timers_tagged_action", insts.length === 2 && insts.every(i => i.domain === "action" && Number.isFinite(i.startedAt)),
            `${insts.length} instances, domains ${insts.map(i => i.domain).join("/")}`);
    }

    check("no_errors", errors.length === 0, errors.length ? errors[0].slice(0, 300) : `no console errors during ${S.now()} updates`);
} catch (e) {
    console.error(e && e.stack || e);
    console.log(`RESULT: ${passed} passed, ${failed} failed (harness error, exit 2)`);
    process.exit(2);
}

console.log(`\nRESULT: ${passed} passed, ${failed} failed (exit ${failed === 0 ? 0 : 1})`);
process.exit(failed === 0 ? 0 : 1);
