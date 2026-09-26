#!/usr/bin/env node
// test_fire_survival_behavior.js: fire survival behavior and construction common sense (DEUS-TSK-FABLE-18).
//
// The production plugins (DEUS_World's real pathfinder and walker, DEUS_Fire's real beats and spread, DEUS_Projects,
// DEUS_Jobs, DEUS_Colonists, DEUS_Environment, DEUS_Conditions) run in a Node vm on a generated world with the eight
// founders, exactly as tools/test_native_survival_soak.js builds it. The colony works on its own until its communal
// shelter has walls; then the driver sets fires and watches what the colonists do. Nobody orders a colonist except
// scene B's runner (a reflex move, as a flight or a douse run is).
//
//   A. Doomed construction: two walls of the shelter under construction catch fire. At once every job the project
//      posted is withdrawn and nothing is posted while the site burns; nobody steps into the flames; no square is
//      blamed for the fire; the burn is recorded against the site with its fire id; after the fire is out and the site
//      has been calm for fireCalmTicks the work resumes.
//   B. A route crossed by a new fire: a colonist on a reflex run (not preempted by "fire nearby") is walking a planned
//      path when a line of straw across it catches fire. It is rerouted and never steps onto a burning square.
//   C. Work at a fire: a haul whose item lies beside a burning square is not taken while it burns (the job waits open,
//      "fire at the work site") and is taken once the fire is out; a haul already taken fails when fire reaches its site.
//   D. Life over matter: a paralysed colonist burns beside the burning shelter. A friend douses it; nobody takes the
//      burning shelter's work meanwhile.
//   E. Siting: a site where structures burned twice is never chosen again (once is allowed); a new footprint keeps
//      fireClearance squares from an open campfire.
//
// Usage: node tools/test_fire_survival_behavior.js [--seed=N] [--mutant=<name>] [--quiet]
//   --mutant patches the plugins in memory; the run must then FAIL (Rule 4):
//     works_through_fire         DEUS_Projects never holds a burning project
//     no_reroute_on_ignition     DEUS_Colonists never reroutes a path a fire crossed
//     takes_jobs_at_fire         DEUS_Jobs takes and keeps jobs at a burning site
//     ignores_burning_ally       nobody douses a burning friend
//     rebuilds_where_it_burned   siting ignores burned ground and open fires
// Exit code: 0 all checks passed, 1 a check failed, 2 harness problem.

"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { performance } = require("perf_hooks");

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const arg = (name, fallback) => { const a = process.argv.find(x => x.startsWith(`--${name}=`)); return a ? a.slice(name.length + 3) : fallback; };
const SEED = (parseInt(arg("seed", "20260923"), 10) >>> 0) || 20260923;
const mutant = arg("mutant", "");
const quiet = process.argv.includes("--quiet");

const PLUGIN_FILES = [
    "DEUS_World.js", "DEUS_WorldGen.js", "DEUS_Levels.js", "DEUS_Factions.js", "DEUS_Dnd5e.js", "DEUS_Callings.js",
    "DEUS_HistoricalDemographics.js", "DEUS_History.js", "DEUS_Objects.js", "DEUS_Doors.js", "DEUS_Items.js",
    "DEUS_Containers.js", "DEUS_Stockpiles.js", "DEUS_Jobs.js", "DEUS_Projects.js", "DEUS_Environment.js", "DEUS_Fire.js",
    "DEUS_Conditions.js", "DEUS_DeathForensics.js", "DEUS_Colonists.js"
];
const MUTANTS = {
    works_through_fire: [{ file: "DEUS_Projects.js", from: "if (fireHold(p)) { summary.waiting = \"fire\"; return summary; }", to: "/* MUTANT works_through_fire */" }],
    no_reroute_on_ignition: [{ file: "DEUS_Colonists.js", from: "if (_ignitedLevels.size) rerouteAroundFire();", to: "/* MUTANT no_reroute_on_ignition */" }],
    takes_jobs_at_fire: [{ file: "DEUS_Jobs.js", from: "if (!job || FIRE_EXEMPT.has(job.type) || (job.params && job.params.reflex)) return false;", to: "return false; /* MUTANT takes_jobs_at_fire */" }],
    ignores_burning_ally: [{ file: "DEUS_Colonists.js", from: "if (!J || !J.handler(\"douse_ally\")) return feedJob(u);", to: "if (true) return feedJob(u); /* MUTANT ignores_burning_ally */" }],
    rebuilds_where_it_burned: [{ file: "DEUS_Projects.js", from: "if (siteValid(area, ox, oy, n, cfg.margin, reserved, hazards))", to: "if (siteValid(area, ox, oy, n, cfg.margin, reserved, null))" }]
};

const sources = {};
for (const f of PLUGIN_FILES) sources[f] = fs.readFileSync(path.join(PLUGINS, f), "utf8");
if (mutant) {
    const edits = MUTANTS[mutant];
    if (!edits) { console.error(`unknown mutant "${mutant}" (known: ${Object.keys(MUTANTS).join(", ")})`); process.exit(2); }
    for (const e of edits) {
        if (!sources[e.file].includes(e.from)) { console.error(`mutant "${mutant}": pattern not found in ${e.file}`); process.exit(2); }
        sources[e.file] = sources[e.file].replace(e.from, e.to);
    }
    console.log(`MUTANT ${mutant}: patched in memory; this run must FAIL`);
}
const catalogText = fs.readFileSync(path.join(ROOT, "game", "data", "UF_WorldCatalog.json"), "utf8");
const tilesetsText = fs.readFileSync(path.join(ROOT, "game", "data", "Tilesets.json"), "utf8");
const pluginsJsText = fs.readFileSync(path.join(ROOT, "game", "js", "plugins.js"), "utf8");

let passed = 0, failed = 0;
function check(name, condition, detail = "") {
    if (condition) { passed++; console.log(`PASS fire.${name}${detail ? " - " + detail : ""}`); }
    else { failed++; console.log(`FAIL fire.${name}${detail ? " - " + detail : ""}`); }
    return !!condition;
}

// The same vm environment as test_native_survival_soak.js.
function setupEnvironment() {
    const list = {};
    vm.runInNewContext(pluginsJsText, list);
    const ns = {};
    const errors = [];
    const env = {
        window: null, UF: ns, DEUS: ns, Math, performance, setTimeout, clearTimeout,
        console: { log: (...a) => { if (!quiet) console.log("  [VM]", ...a); }, warn: () => {}, error: (...a) => errors.push(a.map(String).join(" ")) },
        PluginManager: { parameters: name => (list.$plugins && list.$plugins.find(p => p.name === name) || {}).parameters || {}, registerCommand() {} },
        DataManager: { _databaseFiles: [], onLoad() {}, isBattleTest: () => false, isEventTest: () => false },
        Input: { keyMapper: {} }, TouchInput: { _currentState: {} }, SceneManager: { _scene: null },
        Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 }, ImageManager: { loadTileset() {} },
        Utils: { isOptionValid: () => false }, Tilemap: function() {},
        $dataTilesets: JSON.parse(tilesetsText), $ufWorldCatalog: JSON.parse(catalogText),
        $ufTime: { year: 1, monthIndex: 0, day: 1, hour: 8, minute: 0 },
        $gameSystem: {}, $gameScreen: { weatherType: () => "none", weatherPower: () => 0, changeWeather() {} },
        $gameTimer: {}, $gameSwitches: {}, $gameVariables: {}, $gameSelfSwitches: {}, $gameActors: {}, $gameParty: {}
    };
    env.window = env;
    env.$deusWorldCatalog = env.$ufWorldCatalog;
    env.__errors = errors;
    env.Tilemap.TILE_ID_A1 = 2048;
    env.Tilemap.TILE_ID_A2 = 2816;
    env.Tilemap.isTileA1 = id => id >= 2048 && id < 2816;
    env.Tilemap.isWaterTile = id => env.Tilemap.isTileA1(id);
    for (const name of ["Sprite", "Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot", "Rectangle", "Game_Map", "Game_Player",
        "Game_CharacterBase", "Game_Event", "Spriteset_Map", "Spriteset_Base", "Bitmap", "Graphics"]) {
        env[name] = vm.runInNewContext(`(function ${name}(){})`);
        env[name].prototype.initialize = function() {};
    }
    Object.assign(env.Game_Map.prototype, {
        mapId: () => 0, width: () => 64, height: () => 64, update() {}, tileId: () => 0, tilesetFlags: () => [], isPassable: () => true,
        checkPassage: () => true, roundXWithDirection: (x, d) => x + (d === 6 ? 1 : d === 4 ? -1 : 0),
        roundYWithDirection: (y, d) => y + (d === 2 ? 1 : d === 8 ? -1 : 0), eventsXy: () => [], eventsXyNt: () => []
    });
    Object.assign(env.Game_Player.prototype, { isTransferring: () => false, direction: () => 2, locate(x, y) { this.x = x; this.y = y; } });
    env.$gameMap = new env.Game_Map();
    env.$gameMap._events = [];
    env.$gamePlayer = new env.Game_Player();
    env.$gamePlayer.x = 32;
    env.$gamePlayer.y = 32;
    const ctx = vm.createContext(env);
    const section = (source, start, end) => {
        const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
        if (a < 0 || b <= a) throw new Error(`Engine source section missing: ${start}`);
        return source.slice(a, b);
    };
    const rmmzCoreSrc = fs.readFileSync(path.join(ROOT, "game", "js", "rmmz_core.js"), "utf8");
    const rmmzMgrSrc = fs.readFileSync(path.join(ROOT, "game", "js", "rmmz_managers.js"), "utf8");
    const deusCoreSrc = fs.readFileSync(path.join(PLUGINS, "DEUS_Core.js"), "utf8");
    vm.runInContext(section(rmmzMgrSrc, "DataManager.makeSaveContents =", "DataManager.correctDataErrors ="), ctx, { filename: "rmmz_managers.js" });
    vm.runInContext(section(rmmzCoreSrc, "function JsonEx()", "//-----------------------------------------------------------------------------"), ctx, { filename: "rmmz_core.js: JsonEx" });
    vm.runInContext(section(rmmzCoreSrc, "Tilemap.TILE_ID_B =", "Tilemap.Layer ="), ctx, { filename: "rmmz_core.js: tile constants" });
    vm.runInContext(section(deusCoreSrc, "window.DEUS = window.DEUS || {};", "//-----------------------------------------------------------------------------"), ctx, { filename: "DEUS_Core.js: events" });
    for (const file of PLUGIN_FILES) vm.runInContext(sources[file], ctx, { filename: file });
    return env;
}

function main() {
    const env = setupEnvironment();
    const U = env.UF;
    const { World: W, Colonists: Col, Jobs: J, Projects: P, Items: I, Objects: O, Fire: F, Environment: E, Conditions: Cond } = U;
    check("plugins_load", !!(W && Col && J && P && I && O && F && E && Cond) && typeof J.fireAtWorkSite === "function" &&
        typeof Col.rerouteAroundFire === "function" && typeof P._internal.fireHold === "function" && typeof P._internal.siteHazards === "function",
        "World, Colonists (rerouteAroundFire), Jobs (fireAtWorkSite), Projects (fireHold, siteHazards), Fire, Environment, Conditions");

    const world = W.newWorld(SEED);
    Col.setup(world);
    const c = W.state.colony;
    const area = { x: c.area.x, y: c.area.y, z: c.z | 0 };
    const levelOf = u => ({ x: u.area.x, y: u.area.y, z: u.z | 0 });
    const isCol = u => !!u && !!u.data && (u.data.founder || u.data.kind === "colonist") && !u.data.dead;
    const colonists = () => W.units().filter(isCol);
    let updates = 0;
    const clock = env.$ufTime;
    function tick() {
        updates++;
        if (world.state) world.state.ticks = (world.state.ticks || 0) + 1;
        world.ticks = (world.ticks || 0) + 1;
        env.$gameMap.update(true);
        if (updates % 10 === 0 && ++clock.minute >= 60) { clock.minute = 0; if (++clock.hour >= 24) { clock.hour = 0; clock.day++; } }
    }
    function drive(n, until) { for (let i = 0; i < n; i++) { tick(); if (until && until()) return true; } return !!(until && until()); }
    const hm = () => `day ${clock.day} ${clock.hour}:${String(clock.minute).padStart(2, "0")}`;

    // Instruments over the whole run.
    const stepsIntoFire = [];
    U.Events.on("world:unitMoved", (u, from, to) => {
        if (isCol(u) && to && F.isBurning(levelOf(u), to.x, to.y)) stepsIntoFire.push({ id: u.id, name: u.name, x: to.x, y: to.y, at: updates });
    });
    const CELL_FAULT = /^can't reach|^nowhere to take it|^the square is taken/;
    const projectFailures = [];
    U.Events.on("jobs:failed", j => { if (j && j.params && j.params.project !== undefined) projectFailures.push({ id: j.id, project: j.params.project, reason: j.reason || "", at: updates }); });

    const burningNear = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (F.isBurning(area, x, y)) return true; return false; };
    const siteBox = p => ({ x0: p.origin.x - 1, y0: p.origin.y - 1, x1: p.origin.x + p.size, y1: p.origin.y + p.size });
    const siteBurning = p => { const b = siteBox(p); return burningNear(b.x0, b.y0, b.x1, b.y1); };
    const ownJobs = p => J.list(j => j.params && j.params.project === p.id && (j.state === "open" || j.state === "travel" || j.state === "work"));
    const builtWalls = p => {
        const out = [];
        for (let y = p.origin.y; y < p.origin.y + p.size; y++) for (let x = p.origin.x; x < p.origin.x + p.size; x++) {
            const t = O.atIn(area, x, y);
            if (t && t.id === "wall_wood") out.push({ x, y });
        }
        return out;
    };
    function extinguishBox(x0, y0, x1, y1) {
        let n = 0;
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (F.isBurning(area, x, y)) { F.extinguish(area, x, y, "out"); n++; }
        return n;
    }
    const freeCell = (x, y) => W.walkable(area.x, area.y, x, y, { z: area.z }) && !O.atIn(area, x, y) && !(typeof W.standerAt === "function" && W.standerAt(area.x, area.y, x, y, area.z));
    function freeNear(x, y, r, ok = freeCell) {
        for (let d = 0; d <= r; d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
            if (ok(x + dx, y + dy)) return { x: x + dx, y: y + dy };
        }
        return null;
    }

    // The colony works until its communal shelter has walls and some of its jobs are taken.
    let shelter = null;
    const ready = drive(3 * 24 * 600, () => {
        shelter = P.active().find(p => p.kind === "communal_shelter") || null;
        return !!shelter && builtWalls(shelter).length >= 4 && ownJobs(shelter).some(j => j.assigned);
    });
    if (!ready || !shelter) {
        check("shelter_under_construction", false, `after ${updates} updates (${hm()}): ${shelter ? `shelter #${shelter.id} walls ${builtWalls(shelter).length}, jobs ${ownJobs(shelter).length}` : "no communal shelter project"}`);
        return finish(env);
    }
    const cfg = P.config();
    console.log(`  shelter #${shelter.id} at (${shelter.origin.x},${shelter.origin.y}) size ${shelter.size}: ${builtWalls(shelter).length} walls, ${ownJobs(shelter).length} jobs (${ownJobs(shelter).filter(j => j.assigned).length} taken) at ${hm()}`);

    //---------------------------------------------------------------------------------------------------------------
    // A. Doomed construction
    {
        const p = shelter;
        const takenBefore = ownJobs(p).filter(j => j.assigned).length, openBefore = ownJobs(p).length;
        let postedWhileBurning = 0, takenWhileBurning = 0;
        const onPosted = (pp, job) => { if (pp && pp.id === p.id && siteBurning(p)) postedWhileBurning++; };
        const onAssigned = job => { if (job && job.params && job.params.project === p.id && siteBurning(p)) takenWhileBurning++; };
        U.Events.on("projects:jobPosted", onPosted);
        U.Events.on("jobs:assigned", onAssigned);
        const stepsBefore = stepsIntoFire.length, failBefore = projectFailures.length;
        const lit = builtWalls(p).slice(0, 2);
        for (const w of lit) F.ignite(area, w.x, w.y, { cause: "test" });
        const litNow = lit.filter(w => F.isBurning(area, w.x, w.y)).length;
        drive(5);
        const heldAtOnce = !!p.fire, leftAtOnce = ownJobs(p).length;
        check("doomed_site_withdrawn_at_once", litNow === lit.length && heldAtOnce && leftAtOnce === 0,
            `${litNow}/${lit.length} walls lit at ${hm()}; ${openBefore} job(s) (${takenBefore} taken) before; 5 updates later: held ${heldAtOnce}, jobs left ${leftAtOnce}${p.fire ? `, ${p.fire.withdrawn} withdrawn` : ""}`);
        drive(600);
        const stillBurning = siteBurning(p);
        check("nothing_posted_or_taken_while_burning", postedWhileBurning === 0 && takenWhileBurning === 0 && stillBurning,
            `600 updates of fire (site still burning: ${stillBurning}): posted ${postedWhileBurning}, taken ${takenWhileBurning}; project jobs now ${ownJobs(p).length}`);
        const out = extinguishBox(p.origin.x - 3, p.origin.y - 3, p.origin.x + p.size + 2, p.origin.y + p.size + 2);
        const tOut = updates;
        let resumedAt = null;
        U.Events.on("projects:fireOut", pp => { if (pp && pp.id === p.id && resumedAt === null) resumedAt = updates; });
        drive((cfg.fireCalmTicks | 0) + 1200, () => resumedAt !== null && ownJobs(p).length > 0);
        check("work_resumes_after_calm", resumedAt !== null && resumedAt - tOut >= (cfg.fireCalmTicks | 0) && !p.fire && ownJobs(p).length > 0,
            `${out} burning square(s) put out at update ${tOut}; fireOut at ${resumedAt === null ? "never" : `+${resumedAt - tOut}`} (calm needed ${cfg.fireCalmTicks}); jobs posted after: ${ownJobs(p).length}`);
        const faults = projectFailures.slice(failBefore).filter(f => f.project === p.id && CELL_FAULT.test(f.reason));
        const fireReasons = projectFailures.slice(failBefore).filter(f => f.project === p.id).map(f => f.reason);
        const blamed = Object.keys(p.failed || {}).filter(k => /fire/.test((p.failed[k] && p.failed[k].reason) || ""));
        check("fire_blames_no_square", faults.length === 0 && blamed.length === 0,
            `failures during the scene: ${JSON.stringify(fireReasons.reduce((m, r) => (m[r] = (m[r] || 0) + 1, m), {}))}; cell faults ${faults.length}; squares blamed for fire ${blamed.length}`);
        const st = P.state();
        const rec = ((st && st.burnedSites) || []).find(r => r.origin && r.origin.x === p.origin.x && r.origin.y === p.origin.y);
        check("structure_burn_recorded", !!rec && rec.count === 1 && !!rec.last && typeof rec.last.fireId === "string" && rec.last.project === p.id,
            rec ? `site (${rec.origin.x},${rec.origin.y}) ${rec.kind}: count ${rec.count}, fires [${rec.fires.join(" ")}], source ${rec.last && rec.last.sourceType}` : "no burn record for the shelter's site");
        check("nobody_stepped_into_the_burning_site", stepsIntoFire.length === stepsBefore,
            stepsIntoFire.length === stepsBefore ? "no colonist stepped onto a burning square" : JSON.stringify(stepsIntoFire.slice(stepsBefore, stepsBefore + 3)));
    }

    //---------------------------------------------------------------------------------------------------------------
    // B. A route crossed by a new fire
    {
        const runner = colonists().filter(u => !Cond.has || !Cond.has(u, "paralyzed")).sort((a, b) => a.id - b.id)[0];
        const cur = J.of(runner.id);
        if (cur) J.cancel(cur.id, "test: scene B");
        const from = { x: runner.x, y: runner.y };
        const goal = freeNear(runner.x + 18, runner.y, 6) || freeNear(runner.x - 18, runner.y, 6);
        const job = goal ? J.create({ type: "move", target: { area: { x: area.x, y: area.y }, x: goal.x, y: goal.y, z: area.z }, params: { reflex: "test_run", siteId: runner.data.site }, owner: runner.id }) : null;
        drive(240, () => (W.pathOf(runner.id) || []).length >= 10 || !job || job.state === "done" || job.state === "failed");
        const planned = W.pathOf(runner.id) || [];
        // A line of straw across the planned path, six steps ahead, perpendicular to the way the path goes there.
        const k = Math.min(6, planned.length - 2);
        const at = k >= 3 ? planned[k] : null, prev = k >= 3 ? planned[k - 1] : null;
        const straw = [];
        if (at && prev) {
            const dx = Math.sign(at.x - prev.x), dy = Math.sign(at.y - prev.y);
            const px = -dy, py = dx; // across the way the path goes; two squares thick so no diagonal step slips through
            for (const depth of [0, 1]) for (let s = -3; s <= 3; s++) {
                const x = at.x + px * s + dx * depth, y = at.y + py * s + dy * depth;
                if (straw.some(q => q.x === x && q.y === y)) continue;
                if (W.walkable(area.x, area.y, x, y, { z: area.z }) && !O.atIn(area, x, y) && O.setIn(area, x, y, "floor_straw")) straw.push({ x, y });
            }
        }
        const reroutesBefore = runner.data.fireReroutes | 0, stepsBefore = stepsIntoFire.length;
        const near = () => Math.max(Math.abs(runner.x - at.x), Math.abs(runner.y - at.y));
        drive(600, () => !at || near() <= 3 || job.state !== "travel");
        let litN = 0;
        for (const s of straw) if (F.ignite(area, s.x, s.y, { cause: "test" })) litN++;
        const crossedPlan = (W.pathOf(runner.id) || []).some(c2 => straw.some(s => s.x === c2.x && s.y === c2.y));
        drive(1500, () => job.state === "done" || job.state === "failed");
        const mine = stepsIntoFire.slice(stepsBefore).filter(s => s.id === runner.id);
        const reroutes = (runner.data.fireReroutes | 0) - reroutesBefore;
        check("fire_across_route_rerouted", !!job && straw.length >= 5 && litN >= 5 && crossedPlan && reroutes >= 1 && mine.length === 0,
            `${runner.name} from (${from.x},${from.y}) to ${goal ? `(${goal.x},${goal.y})` : "?"}: ${straw.length} straw lit ${litN} across the path at ${at ? `(${at.x},${at.y})` : "?"} when ${at ? near() : "?"} step(s) away (plan crossed it: ${crossedPlan}); reroutes ${reroutes}; steps into fire ${mine.length}${mine.length ? " " + JSON.stringify(mine[0]) : ""}; job ${job ? `${job.state}${job.reason ? " (" + job.reason + ")" : ""}` : "none"}`);
        extinguishBox(Math.min(...straw.map(s => s.x)) - 3, Math.min(...straw.map(s => s.y)) - 3, Math.max(...straw.map(s => s.x)) + 3, Math.max(...straw.map(s => s.y)) + 3);
        for (const s of straw) { const t = O.atIn(area, s.x, s.y); if (t && t.id === "floor_straw") O.setIn(area, s.x, s.y, null); }
    }

    //---------------------------------------------------------------------------------------------------------------
    // C. Work at a fire
    {
        const avoidSite = (x, y) => freeCell(x, y) && !(x >= shelter.origin.x - 4 && x < shelter.origin.x + shelter.size + 4 && y >= shelter.origin.y - 4 && y < shelter.origin.y + shelter.size + 4);
        const spot = freeNear(c.site.x - 12, c.site.y + 10, 8, (x, y) => avoidSite(x, y) && avoidSite(x + 1, y) && avoidSite(x - 3, y));
        const log1 = spot ? I.create("log", 1, { area: { x: area.x, y: area.y }, z: area.z, x: spot.x, y: spot.y }) : null;
        const fuel = spot ? { x: spot.x + 1, y: spot.y } : null;
        if (fuel) O.setIn(area, fuel.x, fuel.y, "floor_straw");
        const lit = fuel ? F.ignite(area, fuel.x, fuel.y, { cause: "test" }) : false;
        const job = log1 ? J.create({ type: "haul", target: { area: { x: area.x, y: area.y }, x: spot.x, y: spot.y, z: area.z }, params: { itemId: log1.id, count: 1, to: { area: { x: area.x, y: area.y }, x: spot.x - 3, y: spot.y, z: area.z }, material: "log", test: "C" } }) : null;
        const idle = colonists().sort((a, b) => Math.hypot(a.x - spot.x, a.y - spot.y) - Math.hypot(b.x - spot.x, b.y - spot.y))[0];
        const firstTry = job ? J.take(idle.id, j => j.id === job.id) : null;
        drive(300);
        const heldOpen = !!job && job.state === "open" && !job.assigned;
        check("job_at_fire_not_taken", !!job && lit && !firstTry && heldOpen && job.reason === "fire at the work site",
            job ? `haul of a log at (${spot.x},${spot.y}) beside burning straw (lit ${lit}): take by ${idle.name} ${firstTry ? "TOOK it" : "refused"}; after 300 updates ${job.state}${job.assigned ? ` by #${job.assigned}` : ""} (${job.reason || "-"})` : "no job");
        extinguishBox(fuel.x - 1, fuel.y - 1, fuel.x + 1, fuel.y + 1);
        const t = O.atIn(area, fuel.x, fuel.y);
        if (t && t.id === "floor_straw") O.setIn(area, fuel.x, fuel.y, null);
        const secondTry = job && job.state === "open" ? J.take(idle.id, j => j.id === job.id) : null;
        check("job_taken_once_the_fire_is_out", !!secondTry && secondTry.id === job.id,
            job ? `after the fire: take by ${idle.name} ${secondTry ? `took #${secondTry.id}` : `refused (${job.reason || "-"}; state ${job.state})`}` : "no job");
        if (job && (job.state === "open" || job.state === "travel" || job.state === "work")) J.cancel(job.id, "test: done");

        // A taken haul whose site catches fire fails on the worker's next step.
        const spot2 = freeNear(c.site.x + 12, c.site.y + 10, 8, (x, y) => avoidSite(x, y) && avoidSite(x + 1, y) && avoidSite(x - 3, y));
        const log2 = spot2 ? I.create("log", 1, { area: { x: area.x, y: area.y }, z: area.z, x: spot2.x, y: spot2.y }) : null;
        const job2 = log2 ? J.create({ type: "haul", target: { area: { x: area.x, y: area.y }, x: spot2.x, y: spot2.y, z: area.z }, params: { itemId: log2.id, count: 1, to: { area: { x: area.x, y: area.y }, x: spot2.x - 3, y: spot2.y, z: area.z }, material: "log", test: "C2" } }) : null;
        const worker = colonists().sort((a, b) => Math.hypot(a.x - spot2.x, a.y - spot2.y) - Math.hypot(b.x - spot2.x, b.y - spot2.y))[0];
        const cur = J.of(worker.id);
        if (cur) J.cancel(cur.id, "test: scene C2");
        const got = job2 ? J.take(worker.id, j => j.id === job2.id) : null;
        drive(2);
        O.setIn(area, spot2.x + 1, spot2.y, "floor_straw");
        const lit2 = F.ignite(area, spot2.x + 1, spot2.y, { cause: "test" });
        drive(5);
        check("taken_job_dropped_when_fire_reaches_it", !!got && lit2 && job2.state === "failed" && job2.reason === "fire at the work site",
            job2 ? `${worker.name} took #${job2.id}: ${!!got}; fire beside the log (lit ${lit2}); 5 updates later ${job2.state} (${job2.reason || "-"})` : "no job");
        extinguishBox(spot2.x, spot2.y - 1, spot2.x + 2, spot2.y + 1);
        const t2 = O.atIn(area, spot2.x + 1, spot2.y);
        if (t2 && t2.id === "floor_straw") O.setIn(area, spot2.x + 1, spot2.y, null);
    }

    //---------------------------------------------------------------------------------------------------------------
    // D. Life over matter
    {
        const p = shelter.state === "active" ? shelter : null;
        const walls = p ? builtWalls(p).slice(0, 2) : [];
        // The friend walks (a reflex move nothing preempts) to an open square three off the shelter's east side, with every
        // square round it free, so its rescuers have somewhere to stand; then it is paralysed and set burning.
        const open8 = (x, y) => freeCell(x, y) && [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]].every(([dx, dy]) => freeCell(x + dx, y + dy));
        const spot = p ? freeNear(p.origin.x + p.size + 3, p.origin.y + 2, 8, open8) : null;
        const ally = colonists().sort((a, b) => (spot ? Math.hypot(a.x - spot.x, a.y - spot.y) - Math.hypot(b.x - spot.x, b.y - spot.y) : a.id - b.id))[0];
        const cur = J.of(ally.id);
        if (cur) J.cancel(cur.id, "test: scene D");
        const walkTo = spot ? J.create({ type: "move", target: { area: { x: area.x, y: area.y }, x: spot.x, y: spot.y, z: area.z }, params: { reflex: "test_walk", siteId: ally.data.site }, owner: ally.id }) : null;
        drive(1200, () => !walkTo || walkTo.state === "done" || walkTo.state === "failed");
        const around = () => [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]].map(([dx, dy]) => {
            const x = ally.x + dx, y = ally.y + dy, t = O.atIn(area, x, y), who = W.units().find(u2 => u2 !== ally && u2.x === x && u2.y === y && u2.area.x === area.x && u2.area.y === area.y);
            return `${x},${y}:${W.walkable(area.x, area.y, x, y, { z: area.z }) ? "" : "#"}${t ? t.id : ""}${who ? `@${who.id}` : ""}${F.isBurning(area, x, y) ? "*" : ""}`;
        }).join(" ");
        const aroundAtStart = around();
        Cond.add(ally, "paralyzed", { source: "test" });
        E.igniteUnit(ally, 60, 1);
        for (const w of walls) F.ignite(area, w.x, w.y, { cause: "test" });
        let douse = null, takenSite = 0, groundLit = 0;
        const douses = [];
        const litAt = updates + 1;
        let diedAt = null;
        U.Events.on("colonists:died", u2 => { if (u2 && u2.id === ally.id && diedAt === null) diedAt = updates; });
        const onCreated = j => {
            if (!(j && j.type === "douse_ally" && j.params && j.params.unitId === ally.id)) return;
            const r = W.unit(j.owner);
            j.__probe = { at: updates - litAt, dist: r ? Math.max(Math.abs(r.x - ally.x), Math.abs(r.y - ally.y)) : null, hp: ally.data.hp };
            douses.push(j);
            if (!douse || douse.state === "failed") douse = j;
        };
        U.Events.on("fire:ignited", (a2, x, y, cause) => { if (x === ally.x && y === ally.y) groundLit++; });
        const onAssigned = j => { if (p && j && j.params && j.params.project === p.id && siteBurning(p)) takenSite++; };
        U.Events.on("jobs:created", onCreated);
        U.Events.on("jobs:assigned", onAssigned);
        const hpBefore = ally.data.hp;
        drive(1800, () => !E.isBurning(ally));
        const out = !E.isBurning(ally);
        const tried = douses.map(j => `#${j.id} by #${j.owner} ${j.state}${j.reason ? ` (${j.reason})` : ""}, posted +${j.__probe.at} at ${j.__probe.dist} square(s), patient hp ${j.__probe.hp}${j.finished ? `, ended +${j.finished - litAt}` : ""}`).join("; ") + (diedAt !== null ? `; died +${diedAt - litAt}` : "");
        check("burning_friend_doused_first", !!douse && douse.state === "done" && out && !ally.data.dead && takenSite === 0,
            `${ally.name} #${ally.id} walked to ${spot ? `(${spot.x},${spot.y})` : "?"} (${walkTo ? walkTo.state : "no walk"}), at (${ally.x},${ally.y}) paralysed and burning (hp ${hpBefore} -> ${ally.data.hp}); its square lit ${groundLit} time(s); shelter walls lit ${walls.length}; douses [${tried || "none"}]; still burning ${!out}; shelter jobs taken while burning ${takenSite}${out ? "" : `; round it at the start [${aroundAtStart}], now [${around()}]`}`);
        Cond.remove(ally, "paralyzed");
        if (p) extinguishBox(p.origin.x - 3, p.origin.y - 3, p.origin.x + p.size + 2, p.origin.y + p.size + 2);
    }

    //---------------------------------------------------------------------------------------------------------------
    // E. Siting
    {
        const bp = P.blueprint("communal_shelter");
        const n = bp.size | 0, margin = cfg.margin | 0, clear = cfg.fireClearance | 0;
        const choose = () => P._internal.chooseSite(c, bp, cfg);
        const s0 = choose();
        const st = P.state();
        st.burnedSites = st.burnedSites || [];
        const rec = { kind: bp.id, origin: { area: { x: area.x, y: area.y }, x: s0 ? s0.x : 0, y: s0 ? s0.y : 0, z: area.z }, size: n, count: 1, fires: ["test-1"], last: null };
        st.burnedSites.push(rec);
        const sOnce = choose();
        rec.count = 2; rec.fires.push("test-2");
        const sTwice = choose();
        const overlaps = (a, b) => !!a && !!b && a.x < b.x + n + margin && b.x - margin < a.x + n && a.y < b.y + n + margin && b.y - margin < a.y + n;
        check("burned_twice_never_rebuilt", !!s0 && !!sOnce && sOnce.x === s0.x && sOnce.y === s0.y && !!sTwice && !overlaps(sTwice, s0),
            `first choice ${s0 ? `(${s0.x},${s0.y})` : "none"}; burned once -> ${sOnce ? `(${sOnce.x},${sOnce.y})` : "none"}; burned twice -> ${sTwice ? `(${sTwice.x},${sTwice.y})` : "none"}`);
        // An open campfire one square off the chosen footprint's east side.
        let fire = null;
        if (sTwice) {
            fire = freeNear(sTwice.x + n + 1, sTwice.y + 1, 1, (x, y) => freeCell(x, y) && x >= sTwice.x + n);
            if (fire) O.setIn(area, fire.x, fire.y, "campfire");
        }
        const info = fire ? F.sourceInfoAt(area, fire.x, fire.y) : null;
        const sFire = choose();
        const gap = (s, f) => Math.max(Math.max(s.x - f.x, f.x - (s.x + n - 1), 0), Math.max(s.y - f.y, f.y - (s.y + n - 1), 0));
        check("open_fire_kept_clear", !!fire && !!sFire && gap(sFire, fire) > clear && !(info && info.contained),
            fire ? `campfire at (${fire.x},${fire.y}) (contained ${!!(info && info.contained)}) ${gap(sTwice, fire)} square(s) from the last choice; new choice ${sFire ? `(${sFire.x},${sFire.y}), ${gap(sFire, fire)} square(s) away (need > ${clear})` : "none"}` : "no cell for the campfire");
        if (fire) O.setIn(area, fire.x, fire.y, null);
        st.burnedSites.splice(st.burnedSites.indexOf(rec), 1);
    }

    return finish(env);
}

function finish(env) {
    const errors = env && env.__errors ? env.__errors.filter(e => !/^\s*$/.test(e)) : [];
    check("no_errors", errors.length === 0, errors.length ? errors[0].slice(0, 300) : "no console errors");
    console.log(`\nRESULT: ${passed} passed, ${failed} failed (exit ${failed ? 1 : 0})`);
    process.exitCode = failed ? 1 : 0;
}

try { main(); } catch (e) { console.error("HARNESS PROBLEM:", e && e.stack || e); process.exitCode = 2; }
