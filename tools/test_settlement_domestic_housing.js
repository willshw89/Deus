"use strict";
// tools/test_settlement_domestic_housing.js - Headless integration checks for DEUS-TSK-FABLE-16 Part 2 (with the
// Part 1 blueprint): a settlement that has raised its communal shelter goes on to house its households.
//
// Eight founders in four couples raise Shelter #1 (a 6x6 with a contained stone hearth, a walkway from the door and
// no straw against the fire) and Stockpile #1 in the camp phase; nobody opens a cottage while it is a camp. Once the
// shelter stands, storage holds and the food reserve covers three days, the settlement is a village: the brain reads
// four unhoused households, opens one cottage at a time for a named household, the household moves in when it is
// done (its members claim the cottage beds; the communal beds they held are free for newcomers), and the next
// household gets the next cottage. Meanwhile the fire simulation runs with the real catalog rules for fourteen days
// after the shelter is finished and nothing inside it ever ignites.
//
// Runs the real DEUS_Objects.js, DEUS_Items.js, DEUS_Jobs.js, DEUS_Projects.js, DEUS_Colonists.js, UF_Households.js
// and DEUS_Fire.js in a Node vm against a World double (one 64x64 ground area with a pond) and the real catalog, with
// the calendar advancing a minute every ten updates (600 an hour, 14,400 a day). Nobody orders a colonist.
//
// Usage: node tools/test_settlement_domestic_housing.js [--mutant=<name>] [--quiet] [--seed=N] [--hourTicks=N] [--days=N]
//   --mutant   patches a plugin in memory; the run must then FAIL (Rule 4):
//              domestic_housing_ignored (the brain never opens a cottage: housing stays a deficit nobody answers)
//              shelter_hearth_is_open_fire (the shelter gets a campfire hearth with straw against it and no containment)
//              communal_shelter_counts_as_home (a household is housed by the communal shelter's beds)
//              older_shelter_regrown (an older save's 5x5 shelter is read as a 6x6: its hearth and beds are missed)
//              cottage_beds_unreserved (a cottage's beds are nobody's until its family moves in)
//              phase_not_sticky (a village falls back to camp whenever the day's meals dip under the reserve)
//              no_child_corner (a cottage's spare bed is no child's room: its couple can never conceive)
//              housed_by_record (a cottage counts as a home whatever became of it)
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
const FIRE_DAYS = Math.max(1, parseInt(arg("days", "14"), 10) || 14); // days the finished shelter is watched for a fire

const MUTANTS = {
    domestic_housing_ignored: [{ file: "projects", from: "const phaseOk = !housing || phase !== \"camp\";", to: "const phaseOk = !housing;" }],
    shelter_hearth_is_open_fire: [
        { file: "projects", from: "hearthClearance: 1,", to: "hearthClearance: 0," },
        { file: "projects", from: "const HEARTH_FALLBACKS = [\"hearth\", \"kitchen_hearth\", \"campfire\"];", to: "const HEARTH_FALLBACKS = [\"campfire\"];" },
        { file: "projects", from: "                containHearth(p);", to: "                /* containHearth(p); */" }
    ],
    communal_shelter_counts_as_home: [{ file: "projects", from: "return { p, ok: !!p && homeContract(p, members).ok };", to: "return { p, ok: list(q => q.state === \"done\" && q.kind === \"communal_shelter\").length > 0 || (!!p && homeContract(p, members).ok) };" }],
    // DEUS-TSK-FABLE-17
    cottage_beds_unreserved: [{ file: "projects", from: "const bedReservedFor = (area, x, y) => (area ? bedReservations().get(", to: "const bedReservedFor = (area, x, y) => (false ? bedReservations().get(" }],
    phase_not_sticky: [{ file: "projects", from: "const settled = prev && prev !== \"camp\" ? sheltered && !d.food.critical : sheltered && foodStable && storageUp;", to: "const settled = sheltered && foodStable && storageUp;" }],
    no_child_corner: [{ file: "households", from: "const childCorners = Math.max(0, beds.length - people.filter(adult).length);", to: "const childCorners = 0;" }],
    housed_by_record: [{ file: "projects", from: "return { ok: reasons.length === 0, reasons, beds: bedsStanding, bedsNeeded };", to: "return { ok: true, reasons: [], beds: bedsStanding, bedsNeeded };" }],
    older_shelter_regrown: [{ file: "projects", from: "if (!b || !((p.size | 0) > 0) || (p.size | 0) === (b.size | 0)) return b;", to: "return b; /* MUTANT older_shelter_regrown */" }]
};

const catalogText = fs.readFileSync(path.join(ROOT, "game", "data", "UF_WorldCatalog.json"), "utf8");
const read = name => fs.readFileSync(path.join(PLUGINS, name), "utf8");
const sources = { objects: read("DEUS_Objects.js"), items: read("DEUS_Items.js"), jobs: read("DEUS_Jobs.js"), projects: read("DEUS_Projects.js"), colonists: read("DEUS_Colonists.js"), households: read("UF_Households.js"), fire: read("DEUS_Fire.js") };
if (mutant) {
    const patches = MUTANTS[mutant];
    if (!patches) { console.error(`unknown mutant "${mutant}" (known: ${Object.keys(MUTANTS).join(", ")})`); process.exit(2); }
    for (const m of patches) {
        if (!sources[m.file].includes(m.from)) { console.error(`mutant "${mutant}": pattern not found in the ${m.file} plugin: ${m.from}`); process.exit(2); }
        sources[m.file] = sources[m.file].replace(m.from, m.to);
    }
    console.log(`MUTANT ${mutant}: ${patches.length} patch(es) applied in memory; this run must FAIL`);
}

let passed = 0, failed = 0;
function check(name, condition, detail = "") {
    if (condition) { passed++; console.log(`PASS housing.${name}${detail ? " - " + detail : ""}`); }
    else { failed++; console.log(`FAIL housing.${name}${detail ? " - " + detail : ""}`); }
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
// The sandbox: the real plugins over a World double with the calendar running and the fire beat on the map update

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
        state: { version: 4, seed, size, areasX: 1, areasY: 1, startArea: { x: 0, y: 0 }, units: {}, nextUnitId: 1, diffs: {}, objectDiffs: {}, factions: { playerId: "player" }, ticks: 0 },
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
        setTile() { return true; },
        walkable(ax, ay, x, y, opts = {}) {
            if (!inBounds(x, y) || water.has(y * size + x)) return false;
            if (opts.ground) return true;
            if (sandbox.UF.Fire && sandbox.UF.Fire.isBurning({ x: 0, y: 0, z: 0 }, x, y)) return false;
            return !sandbox.UF.Objects.blocksIn({ x: 0, y: 0, z: 0 }, x, y);
        },
        cellFree(ax, ay, x, y, ignore = 0) { return W.walkable(ax, ay, x, y) && !Object.values(W.state.units).some(u => u.id !== ignore && u.x === x && u.y === y); },
        reachable: () => true,
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
        eventOf: () => null, unitOfEvent: () => null, refreshUnitImage() {}, invalidateUnitsCache() {}, isDisplayed: () => false,
        walkUnits() {
            for (const u of Object.values(W.state.units)) {
                if (!u.goal) continue;
                if (u.x === u.goal.x && u.y === u.goal.y) { u.goal = null; emit("world:unitArrived", u); continue; }
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
    class Sprite { constructor() { this.children = []; this.anchor = { set() {} }; } addChild(c) { this.children.push(c); } }
    function Spriteset_Map() {}
    Spriteset_Map.prototype.createCharacters = function() {};
    function Game_Map() {}
    Game_Map.prototype.update = function() {};
    Game_Map.prototype.isPassable = () => true;
    Game_Map.prototype.roundXWithDirection = (x, d) => x + (d === 6 ? 1 : d === 4 ? -1 : 0);
    Game_Map.prototype.roundYWithDirection = (y, d) => y + (d === 2 ? 1 : d === 8 ? -1 : 0);
    function Game_CharacterBase() {}
    Game_CharacterBase.prototype.isMapPassable = () => true;
    function Game_Event() {}
    function Scene_Boot() {}
    Scene_Boot.prototype.start = function() {};
    function Bitmap() { this.context = { createImageData: () => ({ data: new Uint8ClampedArray(4) }), putImageData() {} }; this._baseTexture = { update() {} }; }
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
        Sprite, Spriteset_Map, Game_Map, Game_CharacterBase, Game_Event, Scene_Boot, Bitmap, SceneManager: { _scene: null }, Graphics: { frameCount: 0 },
        DataManager: { makeSaveContents: () => ({ ufWorld: W.state }), extractSaveContents(contents) { W.state = contents.ufWorld; }, createGameObjects() {} },
        Tilemap: { isWaterTile: id => id === 2048 },
        ImageManager: { loadCharacter: () => ({}), loadTileset: () => ({}), isBigCharacter: () => true },
        $gameMap: null, $dataMap: { ufObjects }, $gamePlayer: null, // no $gameMap: UF_Colonists reads tiles through it only when it exists
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
    vm.runInContext(sources.projects, sandbox, { filename: "DEUS_Projects.js" });
    vm.runInContext(sources.colonists, sandbox, { filename: "DEUS_Colonists.js" });
    vm.runInContext(sources.households, sandbox, { filename: "UF_Households.js" });
    vm.runInContext(sources.fire, sandbox, { filename: "DEUS_Fire.js" });
    const S = { sandbox, W, O: sandbox.UF.Objects, I: sandbox.UF.Items, J: sandbox.UF.Jobs, P: sandbox.UF.Projects, C: sandbox.UF.Colonists, H: sandbox.UF.Households, F: sandbox.UF.Fire, map: new sandbox.Game_Map(), area: { x: 0, y: 0, z: 0 }, catalog, time };
    // UF_Households hooks its listeners from Scene_Boot.start, which no sandbox runs: the harness wires the two it
    // needs (a daily reconcile, a home sync after a household's job) the way the plugin's hook() does.
    sandbox.UF.Events.on("time:day", () => { try { S.H.reconcile(); } catch (e) { errorConsole.error(e); } });
    S.now = () => clock;
    S.clockText = () => `day ${time.day} ${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;
    S.update = () => {
        clock++;
        W._frame = clock;
        W.state.ticks = clock;
        if (clock % MINUTE_TICKS === 0) time.advanceMinute();
        W.walkUnits();
        S.map.update(true); // UF_Jobs, UF_Colonists, UF_Projects and UF_Fire all step from the map update
    };
    return S;
}

//-----------------------------------------------------------------------------
// The settlement: hearth, camp ring, a larder, four founding couples with rations, materials, trees, grass, wild food

const SIZE = 64, SITE = { x: 32, y: 32 }, RADIUS = 4, LARDER = { x: 37, y: 32 };
const RATIONS_EACH = 4;
function makeSettlement(seed) {
    const catalog = JSON.parse(catalogText);
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
    // Materials for the shelter (21 logs, 4 stone, 22 straw), the stockpile, and four cottages (19 logs, 4 stone,
    // up to 6 straw and a fiber each) with a margin; grass tufts yield fiber for the chests.
    I.drop(area, SITE.x, 8, "log", 60);
    I.drop(area, SITE.x + 1, 8, "log", 60);
    I.drop(area, 8, SITE.x, "stone", 30);
    I.drop(area, SITE.x, 9, "straw", 60);
    I.drop(area, SITE.x + 1, 9, "fiber", 8);
    for (const [x, y] of [[12, 12], [52, 12], [12, 52], [52, 52], [20, 50], [50, 20], [10, 30], [54, 40]]) O.setIn(area, x, y, "oak");
    for (let i = 0; i < 14; i++) O.setIn(area, 40 + i, 46, "grass_tuft");
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
    S.founders = seats.map((s, i) => W.addUnit({ name: `Founder ${i + 1}`, x: SITE.x + s[0], y: SITE.y + s[1], data: { kind: "colonist", faction: "player", founder: true, age: 25 + i, gender: i % 2 ? "female" : "male", inventory: [], site: 1, surname: `House${Math.floor(i / 2) + 1}` } }));
    // Four couples: founders 1+2, 3+4, 5+6, 7+8 are each other's partners (as DEUS_History pairs the founders).
    for (let i = 0; i < 8; i += 2) {
        const a = S.founders[i], b = S.founders[i + 1];
        a.data.partnerId = b.id; a.data.partner = b.id; b.data.partnerId = a.id; b.data.partner = a.id;
        a.data.familyId = b.data.familyId = `fam${i / 2 + 1}`;
    }
    for (const u of S.founders) I.give("rations", RATIONS_EACH, u.id, { bypassLimits: true });
    S.H.reconcile(); // the four couples become four household records (in the game: colonists:ready and every new day)
    S.wild = wild;
    S.time.setTime(8, 0);
    return S;
}

//-----------------------------------------------------------------------------
// Instruments

function instrument(S) {
    const rec = { assignCalls: 0, orders: 0, deaths: [], opened: [], done: [], movedIn: [], ignitions: [], shelterIgnitions: [], bedClaims: [], sleeps: [] };
    S.sandbox.UF.Events.on("colonists:died", (u, cause) => rec.deaths.push({ name: u.name, cause, at: S.clockText() }));
    const assign = S.J.assign;
    S.J.assign = function(...args) { rec.assignCalls++; return assign.apply(this, args); };
    if (S.C && typeof S.C.order === "function") { const order = S.C.order; S.C.order = function(...args) { rec.orders++; return order.apply(this, args); }; }
    S.sandbox.UF.Events.on("projects:opened", p => rec.opened.push({ id: p.id, kind: p.kind, household: p.household ? p.household.id : null, bedCount: p.bedCount, phase: S.P.phase(), at: S.clockText(), tick: S.now() }));
    S.sandbox.UF.Events.on("projects:done", p => rec.done.push({ id: p.id, kind: p.kind, at: S.clockText(), tick: S.now() }));
    S.sandbox.UF.Events.on("projects:movedIn", (p, householdId, claimed) => rec.movedIn.push({ id: p.id, householdId, claimed: claimed.slice(), at: S.clockText(), tick: S.now() }));
    S.sandbox.UF.Events.on("fire:ignited", (a, x, y, cause, objId, prov) => { const r = { x, y, cause, objId, fireId: prov ? prov.fireId : null, at: S.clockText() }; rec.ignitions.push(r); if (S.shelter && S.P.footprint(S.shelter).some(c => c.x === x && c.y === y)) rec.shelterIgnitions.push(r); });
    S.sandbox.UF.Events.on("colonists:bedClaimed", (u, b) => rec.bedClaims.push({ unit: u.id, x: b.x, y: b.y, at: S.clockText() }));
    S.sandbox.UF.Events.on("jobs:done", (job, u) => { if (job.type === "sleep" && u) rec.sleeps.push({ unit: u.id, x: job.target.x, y: job.target.y, at: S.clockText(), tick: S.now() }); });
    S.rec = rec;
    return rec;
}
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
    const people = colonists(S);
    note(`${S.clockText()}: ${d ? d.phase : "?"}; ${people.length} alive (${S.rec.deaths.length} dead); shelter ${d ? d.shelter.current : "?"}/${d ? d.shelter.needed : "?"}, beds ${d ? d.bed.current : "?"}/${d ? d.bed.needed : "?"}, storage ${d ? d.storage.current : "?"}/${d ? d.storage.needed : "?"}, food ${d ? d.food.current : "?"}/${d ? d.food.needed : "?"} days, homes ${d ? d.housing.current : "?"}/${d ? d.housing.needed : "?"}; fires ${S.F.count()}; ${Object.keys(kinds).join(" ") || "no projects"}`);
}
const days = n => Math.round(n * DAY_TICKS);
const projectsOf = (S, kind) => S.P.list(p => p.kind === kind);
const objectAt = (S, x, y) => { const t = S.O.atIn(S.area, x, y); return t ? t.id : null; };
const colonists = S => S.W.units().filter(u => u.data && u.data.kind === "colonist" && !u.data.dead);
const bedOf = u => (u.data && u.data.bed && typeof u.data.bed === "object" ? `${u.data.bed.x},${u.data.bed.y}` : null);
const hasTag = (t, tag) => !!t && Array.isArray(t.tags) && t.tags.includes(tag);
const ORTHO = [[0, -1], [1, 0], [0, 1], [-1, 0]];
/** A footprint project's parts by role, absolute. */
function parts(S, p) {
    const bp = S.P.blueprint(p.kind), rel = S.P._internal.relativeCells(bp, p.bedCount);
    const abs = c => ({ x: p.origin.x + c.x, y: p.origin.y + c.y, object: c.object });
    return { walls: rel.walls.map(abs), hearth: rel.hearth.map(abs)[0] || null, beds: rel.beds.map(abs), chest: rel.chest.map(abs)[0] || null, clearance: rel.clearance.map(abs), door: rel.walls.filter(c => c.object === bp.door).map(abs)[0] || null };
}
function standing(S, p) {
    const q = parts(S, p);
    return {
        walls: q.walls.filter(c => objectAt(S, c.x, c.y) === c.object).length, wallsWanted: q.walls.length,
        beds: q.beds.filter(c => objectAt(S, c.x, c.y) === c.object).length, bedsWanted: q.beds.length,
        hearth: q.hearth ? objectAt(S, q.hearth.x, q.hearth.y) : null, chest: q.chest ? objectAt(S, q.chest.x, q.chest.y) : null,
        clearanceFree: q.clearance.filter(c => !objectAt(S, c.x, c.y)).length, clearanceWanted: q.clearance.length,
        door: q.door ? objectAt(S, q.door.x, q.door.y) : null
    };
}
function arrive(S, n) {
    const out = [];
    for (let i = 0; i < n; i++) {
        const s = [[-2, -2], [2, 2], [-2, 2], [2, -2]][i % 4];
        out.push(S.W.addUnit({ name: `Newcomer ${i + 1}`, x: SITE.x + s[0], y: SITE.y + s[1], data: { kind: "colonist", faction: "player", founder: false, age: 20 + i, gender: i % 2 ? "female" : "male", inventory: [], site: 1 } }));
    }
    for (const u of out) { S.I.give("rations", RATIONS_EACH, u.id, { bypassLimits: true }); const nd = S.C.needsOf(u); if (nd) { nd.foodLb = 1; nd.waterGal = 1; } }
    S.sandbox.UF.Events.emit("colonists:immigrated", out, S.W.state.colony);
    return out;
}

//-----------------------------------------------------------------------------
// Checks

console.log(`=== Domestic housing progression (DEUS_Projects.js + UF_Households.js + DEUS_Fire.js) headless checks: ${MINUTE_TICKS} updates a minute, seed ${SEED} ===`);
try {
    const S = makeSettlement(SEED);
    const { W, O, I, J, P, C, H, F } = S;
    const cfg = P.config(), area = S.area;
    instrument(S);
    drive(S, 16);
    const shelterBp = P.blueprint("communal_shelter"), cottageBp = P.blueprint("household_cottage");
    const hearthType = O.type(P.hearthId(shelterBp));
    check("plugins_load", typeof P.phase === "function" && typeof P.households === "function" && typeof P.hearthId === "function" && typeof C.claimBedAt === "function" && !!H && typeof H.assignHome === "function" && typeof H.isHoused === "function" &&
        !!F && typeof F.sourceInfoAt === "function" && typeof F.setContained === "function" && !!cottageBp && cottageBp.deficit === "housing" && !!hearthType && F.isHearthType(hearthType) && S.wild.fruit_tree === 80 && S.wild.berry_bush === 60,
        `Projects phase/households/hearthId, Colonists claimBedAt, Households assignHome/isHoused, Fire sourceInfoAt/setContained; shelter hearth resolves to ${hearthType ? hearthType.id : "nothing"} (contained type ${hearthType ? F.isHearthType(hearthType) : "?"}); cottage blueprint deficit ${cottageBp ? cottageBp.deficit : "-"}`);

    // A0. An older save (DEUS-TSK-FABLE-17): a communal shelter finished before the 6x6 blueprint is a 5x5 record
    //     with a campfire at its centre and eight straw beds round it. After a load its hearth is found where it
    //     stands (centre of the 5x5, not of a 6x6), marked contained, and its eight beds still count as sheltered.
    {
        const L = makeSandbox(SEED + 1, SIZE, JSON.parse(catalogText));
        const o = { x: 20, y: 22 }, legacyBeds = []; // within the 24-cell settlement scan of the hearth (32,32), clear of the camp ring
        for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
            const edge = x === 0 || y === 0 || x === 4 || y === 4;
            const id = edge ? (x === 2 && y === 4 ? "door_wood" : "wall_wood") : (x === 2 && y === 2 ? "campfire" : "floor_straw");
            L.O.setIn(L.area, o.x + x, o.y + y, id);
            if (id === "floor_straw") legacyBeds.push(`${o.x + x},${o.y + y}`);
        }
        const tick = { domain: "action", tick: 0 };
        L.W.state.colony = { version: 2, factionId: "player", siteId: 1, site: { x: SITE.x, y: SITE.y }, area: { x: 0, y: 0 }, z: 0, radius: RADIUS, plan: [], stockpiles: [], log: [],
            projects: { version: 1, nextId: 2, list: [{ id: 1, kind: "communal_shelter", deficit: "shelter", state: "done", phase: 4, origin: { area: { x: 0, y: 0 }, x: o.x, y: o.y, z: 0 }, size: 5, margin: 1,
                phases: null, larder: null, capacity: { shelter: 1, bed: 8 }, utility: null, created: tick, sited: tick, finished: tick, jobs: {}, hauls: {}, harvests: {}, failed: {}, blocked: null,
                blockedCycles: 0, blockedSince: null, refused: {}, recheck: null, reason: null, log: [] }] } };
        L.P._internal.sweepContainment();
        const hc = L.P.hearthCellOf(L.P.get(1));
        const info = L.F.sourceInfoAt(L.area, o.x + 2, o.y + 2);
        const sheltered = new Set(L.P.sheltered().map(c => `${c.x},${c.y}`));
        const counted = legacyBeds.filter(k => sheltered.has(k)).length;
        const dL = L.P.evaluateDeficits(L.area);
        check("older_save_shelter_contained_and_counted", !!hc && hc.x === o.x + 2 && hc.y === o.y + 2 && !!info && info.contained === true && info.escapeChance === 0 && info.by === "project:1" && counted === 8 && !!dL && dL.bed.current === 8,
            `5x5 record: hearth cell ${hc ? `(${hc.x},${hc.y})` : "none"} (campfire at (${o.x + 2},${o.y + 2})), ${info ? `contained ${info.contained}, escape ${info.escapeChance}, by ${info.by}` : "no source info"}; ${counted}/8 of its beds sheltered; beds ${dL ? dL.bed.current : "?"} counted`);
    }

    // A. The blueprints are intrinsically safe: a contained hearth at the centre, nothing flammable on its four
    //    neighbours (the cell between door and hearth is the walkway), beds only beyond that, the door in the wall.
    const relS = P._internal.relativeCells(shelterBp), relC = P._internal.relativeCells(cottageBp, 2);
    const n = shelterBp.size, mid = Math.floor(n / 2);
    const hS = relS.hearth[0];
    const bedTouchesHearth = rel => rel.beds.some(b => rel.hearth[0] && Math.abs(b.x - rel.hearth[0].x) + Math.abs(b.y - rel.hearth[0].y) <= (cfg.hearthClearance | 0));
    const walkway = relS.clearance.some(c => c.x === mid && c.y === mid + 1) && !relS.beds.some(b => b.x === mid && b.y === mid + 1);
    const doorS = relS.walls.find(c => c.object === shelterBp.door);
    check("blueprints_keep_fuel_off_the_hearth", !!hS && hS.x === mid && hS.y === mid && hS.object === hearthType.id && (cfg.hearthClearance | 0) >= 1 && relS.clearance.length === 4 && !bedTouchesHearth(relS) && walkway && !!doorS && doorS.x === mid && doorS.y === n - 1 &&
        relS.beds.length === 11 && relS.walls.length === 4 * (n - 1) && relC.beds.length === 2 && relC.chest.length === 1 && !bedTouchesHearth(relC) && relC.clearance.length === 4 && relC.beds.every(b => !relC.chest.some(c => c.x === b.x && c.y === b.y)),
        `shelter ${n}x${n}: hearth ${hS ? `${hS.object} at (${hS.x},${hS.y})` : "none"}, ${relS.clearance.length} clearance cells (walkway (${mid},${mid + 1}) ${walkway ? "free" : "BLOCKED"}), ${relS.beds.length} beds (${bedTouchesHearth(relS) ? "one TOUCHES the hearth" : "none touching the hearth"}), door at (${doorS ? doorS.x : "?"},${doorS ? doorS.y : "?"}), ${relS.walls.length} wall cells; cottage for 2: ${relC.beds.length} beds, ${relC.chest.length} chest, ${relC.clearance.length} clearance`);

    // B. Four couples are four households; the communal shelter houses none of them; the camp opens no cottage.
    const d0 = P.evaluateDeficits(area);
    const hh0 = P.households();
    const b0 = P.brain();
    const cottageCand = b0 ? b0.candidates.find(c => c.kind === "household_cottage") : null;
    check("founders_form_four_unhoused_households", !!d0 && d0.population === 8 && d0.phase === "camp" && H.all().length === 4 && hh0.length === 4 && hh0.every(h => h.members.length === 2 && h.eligible && !h.housed && h.source === "households") &&
        d0.housing.needed === 4 && d0.housing.current === 0 && d0.housing.deficit === 4 && d0.shelter.emergency.needed === 8 && d0.shelter.emergency.current === d0.bed.current && d0.shelter.deficit === 1 && !!cottageCand && cottageCand.phaseOk === false && !cottageCand.eligible && b0.chosen && b0.chosen.kind === "communal_shelter",
        `${H.all().length} household records, ${hh0.length} seen by the planner (${hh0.map(h => `${h.id}:${h.members.map(u => u.id).join("+")}${h.housed ? " housed" : ""}`).join(" ")}); phase ${d0 ? d0.phase : "?"}; homes ${d0 ? d0.housing.current : "?"}/${d0 ? d0.housing.needed : "?"}; emergency ${d0 ? d0.shelter.emergency.current : "?"}/${d0 ? d0.shelter.emergency.needed : "?"}; cottage candidate ${cottageCand ? `phaseOk ${cottageCand.phaseOk}, eligible ${cottageCand.eligible}` : "absent"}; brain chooses ${b0 && b0.chosen ? b0.chosen.kind : "nothing"}`);

    // C. The camp: Shelter #1 rises with a contained stone hearth, its clearance free, no cottage meanwhile.
    const n1 = drive(S, days(12), () => projectsOf(S, "communal_shelter").some(p => p.state === "done"));
    const shelter = projectsOf(S, "communal_shelter").find(p => p.state === "done") || projectsOf(S, "communal_shelter")[0] || null;
    S.shelter = shelter;
    const st1 = shelter ? standing(S, shelter) : null;
    const hq = shelter ? parts(S, shelter).hearth : null;
    const hearthInfo = hq ? F.sourceInfoAt(area, hq.x, hq.y) : null;
    const cottagesInCamp = S.rec.opened.filter(o => o.kind === "household_cottage" && o.phase === "camp").length;
    check("camp_raises_safe_communal_shelter", n1 > 0 && !!shelter && shelter.state === "done" && !!st1 && st1.walls === st1.wallsWanted && st1.beds === 11 && st1.hearth === hearthType.id && st1.clearanceFree === 4 && st1.door === shelterBp.door &&
        !!hearthInfo && hearthInfo.contained === true && hearthInfo.escapeChance === 0 && hearthInfo.state === "normal" && cottagesInCamp === 0 && S.rec.assignCalls === 0 && S.rec.orders === 0,
        `${shelter ? P.describe(shelter) : "no shelter"} after ${n1 > 0 ? (n1 / DAY_TICKS).toFixed(2) : ">12"} days: ${st1 ? `${st1.walls}/${st1.wallsWanted} walls and door (${st1.door}), hearth ${st1.hearth}, ${st1.beds}/${st1.bedsWanted} beds, ${st1.clearanceFree}/${st1.clearanceWanted} clearance cells free` : "-"}; hearth ${hearthInfo ? `contained ${hearthInfo.contained}, state ${hearthInfo.state}, escape ${hearthInfo.escapeChance}` : "no source info"}; ${cottagesInCamp} cottage(s) opened in the camp phase; ${S.rec.assignCalls} assign calls, ${S.rec.orders} orders`);
    const shelterDoneTick = S.now();

    // D. The village: with storage and three days of food the phase turns; the brain opens a cottage for one named
    //    unhoused household, one at a time, and no bed anywhere sits against a fire.
    const n2 = drive(S, days(10), () => P.phase() !== "camp" && projectsOf(S, "household_cottage").length > 0);
    const dD = P.evaluateDeficits(area);
    const first = projectsOf(S, "household_cottage")[0] || null;
    const firstHh = first && first.household ? hh0.find(h => h.id === first.household.id) : null;
    const concurrent = Math.max(0, ...S.rec.opened.filter(o => o.kind === "household_cottage").map(o => S.P.list(p => p.kind === "household_cottage" && p.state === "active" && p.created.tick <= o.tick && (p.finished === null || p.finished.tick >= o.tick)).length));
    // Its bed cells are kept for its family while it is built (DEUS-TSK-FABLE-17): nobody else claims them.
    const keptFor = first ? parts(S, first).beds.map(b => P.bedReservedFor(area, b.x, b.y)) : [];
    check("village_opens_cottage_for_unhoused_household", n2 > 0 && !!dD && dD.phase === "village" && dD.shelter.deficit === 0 && dD.storage.deficit === 0 && dD.food.current >= Math.min(dD.food.needed, cfg.villageFoodDays) && !!first && !!first.household && !!firstHh && !firstHh.housed && first.household.size === 2 && first.bedCount === 3 &&
        first.capacity.housing === 1 && first.capacity.bed === 3 && concurrent <= 1 && keptFor.length === 3 && keptFor.every(ids => ids && ids.length === 2 && first.household.members.every(m => ids.includes(m))),
        `after ${n2 > 0 ? (n2 / DAY_TICKS).toFixed(2) : ">10"} more days: phase ${dD ? dD.phase : "?"} (shelter ${dD ? dD.shelter.current : "?"}/${dD ? dD.shelter.needed : "?"}, storage ${dD ? dD.storage.current : "?"}/${dD ? dD.storage.needed : "?"}, food ${dD ? dD.food.current : "?"} days); ${first ? `${P.describe(first)} for household ${first.household ? first.household.id : "none"} (size ${first.household ? first.household.size : "?"}, ${first.bedCount} beds, capacity ${JSON.stringify(first.capacity)}, beds kept for [${keptFor.map(ids => (ids ? ids.join("+") : "nobody")).join(" | ")}])` : "no cottage opened"}; at most ${concurrent} cottage(s) active at once`);

    // E. The first cottage is finished and its household moves in: the home record names the building, both members
    //    hold the cottage's beds, and the two communal beds they held are free.
    const communalBefore = first && first.household ? first.household.members.map(id => bedOf(W.unit(id))) : [];
    const n3 = first ? drive(S, days(8), () => first.state !== "active") : -1;
    const stC = first ? standing(S, first) : null;
    const members = first && first.household ? first.household.members.map(id => W.unit(id)).filter(Boolean) : [];
    const cottageBeds = first ? parts(S, first).beds.map(c => `${c.x},${c.y}`) : [];
    const memberBeds = members.map(bedOf);
    const record = first && first.household ? H.all().find(h => h.id === first.household.id) : null;
    const dE = P.evaluateDeficits(area);
    const hhE = P.households().find(h => first && first.household && h.id === first.household.id) || null;
    const claims = C.bedClaims();
    const freed = communalBefore.filter(k => k && !cottageBeds.includes(k) && !claims.has(`0,0,0:${k}`)).length;
    const contractE = first ? P.homeContract(first) : null;
    const conceive = record ? H.canConceiveChild(record) : null;
    check("household_moves_into_finished_cottage", n3 > 0 && !!first && first.state === "done" && !!stC && stC.walls === stC.wallsWanted && stC.hearth === hearthType.id && stC.beds === 3 && stC.chest === cottageBp.chest && stC.clearanceFree === 4 && !!contractE && contractE.ok && conceive === true &&
        !!first.movedIn && first.movedIn.claimed.length === 2 && members.length === 2 && memberBeds.every(k => k && cottageBeds.includes(k)) && new Set(memberBeds).size === 2 &&
        !!record && record.homeBuildingId === first.id && !!record.home && record.home.isShared === false && H.isHoused(record, cfg.cottageBeds) && !!hhE && hhE.housed && hhE.homeBuildingId === first.id &&
        !!dE && dE.housing.current === 1 && dE.housing.deficit === 3 && freed === 2,
        `${first ? P.describe(first) : "no cottage"} after ${n3 > 0 ? (n3 / DAY_TICKS).toFixed(2) : ">8"} days: ${stC ? `${stC.walls}/${stC.wallsWanted} walls, hearth ${stC.hearth}, ${stC.beds}/${stC.bedsWanted} beds, chest ${stC.chest}, clearance ${stC.clearanceFree}/${stC.clearanceWanted}` : "-"}; moved in ${first && first.movedIn ? `${first.movedIn.claimed.length} claimed` : "no"}; member beds ${memberBeds.join(" ")} (cottage beds ${cottageBeds.join(" ")}); household record ${record ? `homeBuildingId ${record.homeBuildingId}, shared ${record.home ? record.home.isShared : "?"}, housed ${H.isHoused(record, cfg.cottageBeds)}` : "missing"}; homes ${dE ? dE.housing.current : "?"}/${dE ? dE.housing.needed : "?"}; communal beds freed ${freed}/2 (were ${communalBefore.join(" ")}); home contract ${contractE ? (contractE.ok ? "met" : contractE.reasons.join(", ")) : "?"}; the couple may conceive: ${conceive}`);

    // F. Newcomers take the freed communal beds; the next cottage goes to another household.
    const came = arrive(S, 2);
    const n4 = drive(S, days(8), () => projectsOf(S, "household_cottage").filter(p => p.state === "done").length >= 2);
    const doneCottages = projectsOf(S, "household_cottage").filter(p => p.state === "done");
    const householdsHoused = new Set(doneCottages.map(p => p.household && p.household.id));
    const newcomerBeds = came.map(bedOf);
    const shelterBedCells = shelter ? parts(S, shelter).beds.map(c => `${c.x},${c.y}`) : [];
    const dF = P.evaluateDeficits(area);
    const allBeds = O.findIn(area, { near: { x: SITE.x, y: SITE.y }, radius: 40, tags: ["bed"], unsorted: true });
    const bedsByFire = allBeds.filter(b => ORTHO.some(([dx, dy]) => hasTag(O.atIn(area, b.x + dx, b.y + dy), "fire")));
    const cottageBedCells = doneCottages.concat(projectsOf(S, "household_cottage").filter(p => p.state === "active")).flatMap(p => parts(S, p).beds.map(c => `${c.x},${c.y}`));
    const sheltersBuilt = projectsOf(S, "communal_shelter").length, dev = P.development();
    const fellBack = dev ? dev.history.filter(h => h.phase === "camp").length : -1;
    check("second_household_housed_and_newcomers_take_communal_beds", n4 > 0 && doneCottages.length >= 2 && householdsHoused.size === doneCottages.length && doneCottages.every(p => p.movedIn && p.movedIn.claimed.length === 2) &&
        newcomerBeds.every(k => k && shelterBedCells.includes(k) && !cottageBedCells.includes(k)) && new Set(newcomerBeds).size === 2 && !!dF && dF.housing.current >= 2 && bedsByFire.length === 0 &&
        sheltersBuilt === 1 && dF.phase === "village" && fellBack === 1,
        `${doneCottages.length} cottage(s) done for households ${[...householdsHoused].join(", ")} after ${n4 > 0 ? (n4 / DAY_TICKS).toFixed(2) : ">8"} more days; newcomers' beds ${newcomerBeds.join(" ")} (${newcomerBeds.filter(k => k && shelterBedCells.includes(k)).length}/2 in Shelter #1); homes ${dF ? dF.housing.current : "?"}/${dF ? dF.housing.needed : "?"}; ${bedsByFire.length} bed(s) against a fire of ${allBeds.length}; ${sheltersBuilt} communal shelter(s); phase ${dF ? dF.phase : "?"}, history ${dev ? dev.history.map(h => h.phase).join(" > ") : "none"}`);

    // G. Fourteen days after the shelter was finished, nothing inside it ever caught fire: the hearth burned every
    //    day of it under the real catalog's fire rules (every beat rolled), the straw beds stand, nobody burned.
    const elapsed = S.now() - shelterDoneTick;
    if (elapsed < days(FIRE_DAYS)) drive(S, days(FIRE_DAYS) - elapsed);
    const beatsSince = Math.floor((S.now() - shelterDoneTick) / F.beatFrames());
    const stG = shelter ? standing(S, shelter) : null;
    const burnDeaths = S.rec.deaths.filter(d => d.cause === "fire").length;
    check("shelter_survives_fourteen_days_unburnt", !!shelter && beatsSince >= Math.floor(days(FIRE_DAYS) / F.beatFrames()) && S.rec.shelterIgnitions.length === 0 && !!stG && stG.beds === 11 && stG.hearth === hearthType.id && F.count() === 0 && burnDeaths === 0 && S.rec.deaths.length === 0,
        `${beatsSince} fire beats since the shelter was finished (${(( S.now() - shelterDoneTick) / DAY_TICKS).toFixed(1)} days): ${S.rec.shelterIgnitions.length} ignition(s) inside it, ${S.rec.ignitions.length} anywhere${S.rec.ignitions.length ? ` (first ${S.rec.ignitions[0].cause} on ${S.rec.ignitions[0].objId} at (${S.rec.ignitions[0].x},${S.rec.ignitions[0].y}) ${S.rec.ignitions[0].at})` : ""}; ${stG ? `${stG.beds}/11 beds stand, hearth ${stG.hearth}` : "-"}; ${F.count()} cells burning now; deaths ${S.rec.deaths.length} (${burnDeaths} by fire)`);

    // I. Homes are kept from the world (DEUS-TSK-FABLE-17): the first cottage loses a wall, so at the next cycle it is
    //    released and its household reads unhoused; mended, the household is back in the same cottage at the next cycle
    //    (a vacant cottage that stands is lived in before a new one is built; one begun meanwhile is cancelled).
    {
        const home = projectsOf(S, "household_cottage").find(p => p.state === "done") || null;
        const hid = home && home.household ? home.household.id : null;
        const wall = home ? parts(S, home).walls.find(c => c.object === "wall_wood") : null;
        if (wall) O.setIn(area, wall.x, wall.y, null);
        P.tick();
        const releasedWhy = home && home.household && home.household.released ? home.household.released.reason : null;
        const hI = P.households().find(h => h.id === hid) || null;
        if (wall) O.setIn(area, wall.x, wall.y, "wall_wood");
        P.tick();
        const hI2 = P.households().find(h => h.id === hid) || null;
        const extra = projectsOf(S, "household_cottage").filter(p => p.state === "active" && p.household && p.household.id === hid);
        check("fallen_cottage_released_then_lived_in_again", !!home && !!wall && !!releasedWhy && /wall or door/.test(releasedWhy) && !!hI && !hI.housed && !!hI2 && hI2.housed && hI2.homeBuildingId === home.id && !!home.household && !home.household.released && extra.length === 0,
            home ? `wall (${wall ? `${wall.x},${wall.y}` : "?"}) taken down: released "${releasedWhy || "no"}", household ${hid} housed ${hI ? hI.housed : "?"}; wall put back: housed ${hI2 ? hI2.housed : "?"} in ${hI2 ? hI2.homeBuildingId : "?"} (the same cottage #${home.id}), ${extra.length} new cottage(s) still open for it` : "no finished cottage");
    }
    {
        const d = (population, food, critical, emergencyDeficit) => ({ population, shelter: { current: 1, deficit: 0, emergency: { deficit: emergencyDeficit } }, bed: { deficit: emergencyDeficit }, food: { current: food, needed: 3, critical }, storage: { deficit: 1 } });
        const phaseOf = P._internal.phaseOf;
        const dip = phaseOf(d(10, 2.5, false, 0), "village"), dipFromCamp = phaseOf(d(10, 2.5, false, 0), "camp");
        const hungry = phaseOf(d(10, 0.5, true, 0), "village"), unbedded = phaseOf(d(12, 3, false, 1), "village"), town = phaseOf(d(16, 3, false, 0), "village");
        check("phase_sticky_and_town", dip === "village" && dipFromCamp === "camp" && hungry === "camp" && unbedded === "camp" && town === "town",
            `a village whose food dips to 2.5 days and stockpile runs short: ${dip}; the same as a camp: ${dipFromCamp}; critical food: ${hungry}; someone without a sheltered bed: ${unbedded}; 16 people: ${town}`);
    }

    // H. Save and reload: the housing record, the households' homes and the bed claims come back identical.
    const housingJson = JSON.stringify(P.list(p => p.kind === "household_cottage").map(p => [p.id, p.household, p.bedCount]).concat([P.development()])), homesJson = JSON.stringify(H.all().map(h => [h.id, h.homeBuildingId])), bedsJson = JSON.stringify(colonists(S).map(u => [u.id, u.data.bed]));
    const whole = JSON.stringify(W.state);
    const clean = !whole.includes("undefined") && !whole.includes("Infinity") && !whole.includes("NaN");
    const contents = JSON.parse(JSON.stringify(S.sandbox.DataManager.makeSaveContents()));
    S.sandbox.DataManager.extractSaveContents(contents);
    const dH = P.evaluateDeficits(area);
    check("save_load_keeps_homes", clean && JSON.stringify(P.list(p => p.kind === "household_cottage").map(p => [p.id, p.household, p.bedCount]).concat([P.development()])) === housingJson && JSON.stringify(H.all().map(h => [h.id, h.homeBuildingId])) === homesJson && JSON.stringify(colonists(S).map(u => [u.id, u.data.bed])) === bedsJson && !!dH && dH.housing.current === (dF ? dF.housing.current : -1),
        `${whole.length} bytes, JSON-clean ${clean}; housing record, ${H.all().length} households' homes and ${colonists(S).length} bed claims identical after the round trip; homes ${dH ? dH.housing.current : "?"}/${dH ? dH.housing.needed : "?"}`);

    check("no_errors", errors.length === 0, errors.length ? errors[0].slice(0, 300) : `no console errors during ${S.now()} updates (${(S.now() / DAY_TICKS).toFixed(1)} calendar days)`);
} catch (e) {
    console.error(e && e.stack || e);
    console.log(`RESULT: ${passed} passed, ${failed} failed (harness error, exit 2)`);
    process.exit(2);
}

console.log(`\nRESULT: ${passed} passed, ${failed} failed (exit ${failed === 0 ? 0 : 1})`);
process.exit(failed === 0 ? 0 : 1);
