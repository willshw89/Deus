#!/usr/bin/env node
"use strict";

/**
 * tools/test_strata_foundation.js
 *
 * DEUS-TSK-FABLE-19A: the five-strata geometry authority in DEUS_Levels.js (docs/DEUS_TSK_FABLE_19_HANDOFF.md,
 * docs/systems/UF_Levels.md section Strata). Runs the real plugins (DEUS_World, DEUS_WorldGen, DEUS_Tiles,
 * DEUS_Objects, DEUS_Levels, DEUS_Floors) in a Node vm, makes a New Game world, and compares with the levels code from
 * before the strata (DEUS_Levels.js and DEUS_Floors.js at commit 2d5fc47, read with git) run the same way.
 *
 * Checks (each can print FAIL; the mutants below prove it):
 *   storage_budget                strata + connectors + cached shape grids of one area's five levels <= 3.5 MB (flat Uint8Arrays)
 *   generation_deterministic      every level's checksum equals the pre-strata code's (two seeds), repeats, and differs for seed + 1
 *   baseline_roundtrip            the legacy views (shape, material, water, biome) equal the pre-strata arrays byte for byte
 *   solid_open_columns            every generated solid cell is 5 solid strata at full HP, open air 5 air, floor S0, ramp S0..S2
 *   fills_0_to_5                  fills 5/5 .. 0/5: shape, surfaceHeightAt, elevation, HEIGHT_k_OF_5, isSolid, solidFraction
 *   floor_on_substrate            0/5 over solid -> floor, over air -> open, 0/5 at -2 (nothing below) -> open
 *   legacy_shapes_match           shapeCodeAt of every cell of the five levels equals the pre-strata code's
 *   surface_elevation_matches     the stood-on stratum's elevation equals the surface height S of the column
 *   headroom_walkability          a floor under less than 4 strata of headroom is refused (shape and World.walkable)
 *   damage_single_stratum         damage on S2 lowers its HP; destroying it leaves S1 and S3 intact at full HP
 *   destruction_changes_shape     destroying a floor's S0 changes the derived shape, emits levels:cellChanged
 *   damage_crosses_levels_box     a box from Z-1:S4 to Z0:S0 destroys exactly those two strata
 *   sphere_aoe                    a sphere hits several strata on two levels with linear falloff
 *   resistance_and_hooks          resist by damage type, a material hook replaces the damage, "*" hooks, fluid hooks
 *   events_on_destruction         levels:strataDamaged / strataDestroyed / strataChanged / cellChanged payloads
 *   overburden                    hasOpaqueOverburden over the whole area matches the column; decks, gaps; Floors hook
 *   shape_grids_coherent          with edits on three levels in place, every cached shape grid equals a fresh derivation
 *   migration_no_data_loss        a real pre-strata save loads: every changed cell derives its legacy shape/material/flag
 *   migration_profiles            solid -> 5/5, open -> 0/5, floor -> S0, ramp -> 3/5, stairs -> S0 + connector, pools kept
 *   unknown_format_diagnostics    unknown schema, junk legacy entries, a corrupt strata record: console.error, nothing guessed
 *   save_load_strata_hp           strata and HP survive DataManager save/load
 *   unchanged_terrain_regenerates only changed cells are saved; a fresh vm regenerates the same baselines; back = no record
 *   fluid_adapter                 0..7 <-> 0..5 tables, passage bits, FLUID_k_OF_5, deterministic
 *   no_allocation_queries         2,000,000 adapter queries: no garbage collection, heap growth < 1 B per query
 *   query_cost                    ns per shapeCodeAt, pre-strata code vs strata (same cells; reported, bound 2000 ns)
 *   no_errors                     no console.error beyond the ones the diagnostic checks provoke on purpose
 *
 * Usage: node tools/test_strata_foundation.js [--seed=20260923] [--mutant=<name>] [--legacy=<file>] [--quiet]
 * Negative controls (Rule 4; each must exit 1): see MUTANTS.
 * Exit: 0 all checks passed, 1 a check failed, 2 harness problem.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const v8 = require("v8");
const { performance, PerformanceObserver } = require("perf_hooks");
const { execFileSync, spawnSync } = require("child_process");

// The allocation check needs global.gc: run again with --expose-gc when it's missing.
if (typeof global.gc !== "function") {
    const r = spawnSync(process.execPath, ["--expose-gc", __filename, ...process.argv.slice(2)], { stdio: "inherit" });
    process.exit(r.status === null ? 2 : r.status);
}

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const LEGACY_COMMIT = "2d5fc47";
const arg = (name, fallback) => {
    const a = process.argv.find(x => x.startsWith(`--${name}=`));
    return a ? a.slice(name.length + 3) : fallback;
};
const SEED = parseInt(arg("seed", "20260923"), 10) >>> 0;
const SEED2 = (SEED + 7) >>> 0;
const mutant = arg("mutant", "");
const quiet = process.argv.includes("--quiet");

// Mutants: exact source edits of DEUS_Levels.js, applied in memory. A missing target is a harness problem (exit 2).
const MUTANTS = {
    storage_fat: ["const n = size * size, m = new Uint8Array(n * STRATA), conn", "const n = size * size, m = new Uint8Array(n * STRATA * 3), conn"],
    lost_fluid: ["if (water && water[i] && fill < 2) { m[o + 1] = fluid; m[o + 2] = fluid; }", "/* MUTANT lost_fluid */"],
    no_headroom: ["return pack(head >= 4 ? FLOOR : SOLID,", "return pack(head >= 0 ? FLOOR : SOLID, /* MUTANT no_headroom */"],
    floor_needs_no_support: ["if (sup < 0) return pack(OPEN, false, STONE);", "if (sup < 0) return pack(FLOOR, false, STONE); /* MUTANT */"],
    damage_neighbour: ["            } else rec[REC_HP + s] = hp;", "            } else { rec[REC_HP + s] = hp; if (s < 4 && SOLID_B[rec[REC_M + s + 1]]) rec[REC_HP + s + 1] = hp; } /* MUTANT */"],
    no_cross_z: ["const levelOfElevation = e => Math.floor(e / STRATA) - 2;", "const levelOfElevation = e => Math.ceil(e / STRATA) - 2; /* MUTANT */"],
    resist_ignored: ["ctx.effective = damage * (mat.resist[damageType] !== undefined ? mat.resist[damageType] : 1);", "ctx.effective = damage; /* MUTANT */"],
    hooks_ignored: ["        runHooks(mat.key, ctx);\n        runHooks(\"*\", ctx);", "        /* MUTANT hooks_ignored */"],
    no_destroy_event: ["emit(\"levels:strataDestroyed\",", "(() => {})(\"levels:strataDestroyed\","],
    overburden_one_level: ["for (let z = qZ + 1; z <= 2; z++) {", "for (let z = qZ + 1; z <= Math.min(2, qZ + 1); z++) {"],
    overburden_no_gap: ["if (f < STRATA && (solidMaskOf(rdM, rdO) >> f) !== 0) return true;", "/* MUTANT overburden_no_gap */"],
    hp_not_saved: ["for (let k = 0; k < REC; k++) s += HEX[r[k] >> 4] + HEX[r[k] & 15];", "for (let k = 0; k < REC; k++) { const v = k >= REC_HP && r[k] ? 255 : r[k]; s += HEX[v >> 4] + HEX[v & 15]; }"],
    migration_drops_constructed: ["const byte = (LEGACY_TO_M[p >> 4] || M_STONE) | ((p & 8) ? M_BUILT : 0);", "const byte = (LEGACY_TO_M[p >> 4] || M_STONE); /* MUTANT */"],
    migration_ramp_flat: ["const fill = s === SOLID ? STRATA : s === RAMP ? 3 : (s === FLOOR || s >= STAIR_UP) ? 1 : 0;\n        for (let k = 0; k < fill; k++) { r[REC_M + k] = byte;", "const fill = s === SOLID ? STRATA : s === RAMP ? 1 : (s === FLOOR || s >= STAIR_UP) ? 1 : 0;\n        for (let k = 0; k < fill; k++) { r[REC_M + k] = byte;"],
    unknown_schema_accepted: ["const schemaKnown = st => st.strataSchemaVersion === undefined || st.strataSchemaVersion === STRATA_SCHEMA;", "const schemaKnown = st => true; /* MUTANT */"],
    junk_applied: ["if (!ok) { keep(L, ak, k, p); continue; }", "if (!ok) { rec.invalid++; todo.push({ z, ax: a.x, ay: a.y, i: i | 0, p: p | 0 }); continue; }"],
    baseline_records_kept: ["putDelta(st, z, ax, ay, i, sameAsBaseline(b, i, rec) ? null : rec);", "putDelta(st, z, ax, ay, i, rec); /* MUTANT */"],
    fluid_table_wrong: ["const FLUID_TO_STRATA = Object.freeze([0, 1, 1, 2, 3, 4, 4, 5]);", "const FLUID_TO_STRATA = Object.freeze([0, 1, 2, 2, 3, 4, 4, 5]);"],
    alloc_in_query: ["        qX |= 0; qY |= 0;", "        qX |= 0; qY |= 0; qLeak = { a, b };"],
    slow_query: ["    const queriedPacked = () => { stats.shapeReads++;", "    const queriedPacked = () => { for (let spin = 0; spin < 50; spin++) Math.sqrt(spin); stats.shapeReads++;"],
    stale_grid: ["        (L.strata[key] = L.strata[key] || {})[i] = encodeRecord(r);\n        refreshPacked(st, z, ax, ay, i);", "        (L.strata[key] = L.strata[key] || {})[i] = encodeRecord(r); /* MUTANT stale_grid */"],
    stale_neighbours: ["for (let zz = Math.max(-2, z - 1); zz <= Math.min(2, z + 1); zz++) {", "for (let zz = z; zz <= z; zz++) { /* MUTANT stale_neighbours */"],
    error_injected: ["    function migrateSaveToFiveStrata(st) {", "    function migrateSaveToFiveStrata(st) {\n        console.error(\"MUTANT error_injected\");"]
};
const EXTRA_DECL = { alloc_in_query: ["    let qSt = null,", "    let qLeak = null;\n    let qSt = null,"] };
if (mutant && !MUTANTS[mutant]) {
    console.log(`HARNESS unknown mutant "${mutant}"; known: ${Object.keys(MUTANTS).join(", ")}`);
    console.log("RESULT: 0 passed, 0 failed (exit 2)");
    process.exit(2);
}

let passed = 0, failed = 0;
const failures = [];
function check(name, ok, detail = "") {
    if (ok) passed++;
    else { failed++; failures.push(name); }
    console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " - " + detail : ""}`);
    return !!ok;
}
function harnessProblem(msg) {
    console.log(`HARNESS ${msg}`);
    console.log(`RESULT: ${passed} passed, ${failed} failed (exit 2)`);
    process.exit(2);
}
function guard(name, fn) {
    try { return fn(); } catch (e) { check(name, false, `threw ${e && e.stack ? e.stack.split("\n").slice(0, 3).join(" | ") : e}`); return null; }
}

//-----------------------------------------------------------------------------
// Sources: the working tree (strata) and the pre-strata commit (legacy).

const FILES = ["DEUS_World.js", "DEUS_WorldGen.js", "DEUS_Tiles.js", "DEUS_Objects.js", "DEUS_Levels.js", "DEUS_Floors.js"];
function currentSources() {
    const s = {};
    for (const f of FILES) s[f] = fs.readFileSync(path.join(PLUGINS, f), "utf8");
    if (mutant) {
        const [find, replace] = MUTANTS[mutant];
        if (!s["DEUS_Levels.js"].includes(find)) harnessProblem(`mutant ${mutant}: target not found in DEUS_Levels.js`);
        s["DEUS_Levels.js"] = s["DEUS_Levels.js"].replace(find, replace);
        if (EXTRA_DECL[mutant]) {
            const [f2, r2] = EXTRA_DECL[mutant];
            if (!s["DEUS_Levels.js"].includes(f2)) harnessProblem(`mutant ${mutant}: declaration target not found`);
            s["DEUS_Levels.js"] = s["DEUS_Levels.js"].replace(f2, r2);
        }
    }
    return s;
}
function legacySources() {
    const s = {};
    for (const f of FILES) s[f] = fs.readFileSync(path.join(PLUGINS, f), "utf8");
    const file = arg("legacy", "");
    try {
        s["DEUS_Levels.js"] = file ? fs.readFileSync(file, "utf8") : execFileSync("git", ["show", `${LEGACY_COMMIT}:game/js/plugins/DEUS_Levels.js`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20 });
        if (!file) s["DEUS_Floors.js"] = execFileSync("git", ["show", `${LEGACY_COMMIT}:game/js/plugins/DEUS_Floors.js`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20 });
    } catch (e) {
        harnessProblem(`can't read the pre-strata DEUS_Levels.js (git show ${LEGACY_COMMIT}; or pass --legacy=<file>): ${e.message}`);
    }
    if (s["DEUS_Levels.js"].includes("function derivePacked(")) harnessProblem("the legacy DEUS_Levels.js already has strata");
    return s;
}

//-----------------------------------------------------------------------------
// The vm: RMMZ stubs only where the plugins touch the engine (as tools/test_volumetric_terrain_column.js).

function setup(sources, tag) {
    const list = {};
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, "game/js/plugins.js"), "utf8"), list);
    const ns = {}, warnings = [], errors = [];
    const canvasCtx = () => ({
        imageSmoothingEnabled: false, createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
        putImageData() {}, drawImage() {}, fillRect() {}, clearRect() {}, getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })
    });
    const env = {
        window: null, UF: ns, DEUS: ns, Math, performance, setTimeout, clearTimeout,
        console: {
            log: (...a) => { if (!quiet && process.env.DEUS_VM_LOG) console.log(`  [VM ${tag}]`, ...a); },
            warn: (...a) => warnings.push(a.map(String).join(" ")),
            error: (...a) => errors.push(a.map(x => (x && x.stack) || String(x)).join(" "))
        },
        document: { createElement: () => ({ width: 0, height: 0, getContext: canvasCtx }) },
        PluginManager: { parameters: name => (list.$plugins && list.$plugins.find(p => p.name === name) || {}).parameters || {}, registerCommand() {} },
        DataManager: { _databaseFiles: [], onLoad() {}, isBattleTest: () => false, isEventTest: () => false, createGameObjects() {} },
        Input: { keyMapper: {} }, TouchInput: { _currentState: {} }, SceneManager: { _scene: null },
        Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 },
        ImageManager: { loadTileset() { return null; } },
        Utils: { isOptionValid: () => false, encodeURI: s => s },
        Tilemap: function() {},
        $dataTilesets: JSON.parse(fs.readFileSync(path.join(ROOT, "game/data/Tilesets.json"), "utf8")),
        $ufWorldCatalog: JSON.parse(fs.readFileSync(path.join(ROOT, "game/data/UF_WorldCatalog.json"), "utf8")),
        $ufTime: { year: 1, monthIndex: 0, day: 1, hour: 8, minute: 0 },
        $gameSystem: {}, $gameScreen: { weatherType: () => "none", weatherPower: () => 0, changeWeather() {} },
        $gameTimer: {}, $gameSwitches: {}, $gameVariables: {}, $gameSelfSwitches: {}, $gameActors: {}, $gameParty: {}
    };
    env.window = env;
    env.$deusWorldCatalog = env.$ufWorldCatalog;
    env.Tilemap.TILE_ID_A1 = 2048;
    env.Tilemap.TILE_ID_A2 = 2816;
    env.Tilemap.isTileA1 = id => id >= 2048 && id < 2816;
    env.Tilemap.isWaterTile = id => env.Tilemap.isTileA1(id);
    for (const name of ["Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot", "Rectangle", "Game_Map", "Game_Player", "Game_CharacterBase", "Game_Event", "Spriteset_Map", "Spriteset_Base"]) {
        env[name] = vm.runInNewContext(`(function ${name}(){})`);
        env[name].prototype.initialize = function() {};
    }
    env.Scene_Boot.prototype.start = function() {};
    env.Scene_Boot.prototype.isReady = function() { return true; };
    env.Spriteset_Map.prototype.createCharacters = function() {};
    env.Sprite = vm.runInNewContext(`(function Sprite(bitmap) {
        this.anchor = { x: 0, y: 0, set(a, b) { this.x = a; this.y = b; } };
        this.children = []; this.parent = null; this.visible = true; this.bitmap = bitmap || null; this.x = 0; this.y = 0; this.z = 0;
    })`);
    Object.assign(env.Sprite.prototype, { update() {}, addChild(c) { c.parent = this; this.children.push(c); return c; } });
    env.Bitmap = vm.runInNewContext(`(function Bitmap(w, h) {
        this.width = w || 0; this.height = h || 0;
        this.context = { imageSmoothingEnabled: false, drawImage() {}, putImageData() {}, fillRect() {} };
        this._baseTexture = { update() {} };
    })`);
    Object.assign(env.Bitmap.prototype, { isReady() { return true; }, isError() { return false; }, clear() {}, clearRect() {}, fillRect() {}, blt() {} });
    env.Bitmap.load = () => ({ isReady: () => false, isError: () => false });
    Object.assign(env.Game_Map.prototype, {
        mapId() { return this._mapId || 0; }, width: () => 256, height: () => 256, update() {}, tileId: () => 0, tilesetFlags: () => [],
        isPassable: () => true, checkPassage: () => true,
        displayX() { return 0; }, displayY() { return 0; }, screenTileX: () => 17, screenTileY: () => 13,
        adjustX(x) { return x; }, adjustY(y) { return y; },
        roundXWithDirection: (x, d) => x + (d === 6 ? 1 : d === 4 ? -1 : 0), roundYWithDirection: (y, d) => y + (d === 2 ? 1 : d === 8 ? -1 : 0),
        eventsXy: () => [], eventsXyNt: () => []
    });
    Object.assign(env.Game_Player.prototype, { isTransferring: () => false, direction: () => 2, locate(x, y) { this.x = x; this.y = y; } });
    env.$gameMap = new env.Game_Map();
    env.$gameMap._events = [];
    env.$gamePlayer = new env.Game_Player();
    env.$gamePlayer.x = 128;
    env.$gamePlayer.y = 128;
    const ctx = vm.createContext(env);
    const section = (src, a, b) => {
        const i = src.indexOf(a), j = src.indexOf(b, i + a.length);
        if (i < 0 || j <= i) harnessProblem(`engine source section missing: ${a}`);
        return src.slice(i, j);
    };
    const core = fs.readFileSync(path.join(ROOT, "game/js/rmmz_core.js"), "utf8");
    const mgr = fs.readFileSync(path.join(ROOT, "game/js/rmmz_managers.js"), "utf8");
    const deus = fs.readFileSync(path.join(PLUGINS, "DEUS_Core.js"), "utf8");
    vm.runInContext(section(mgr, "DataManager.makeSaveContents =", "DataManager.correctDataErrors ="), ctx, { filename: "rmmz_managers.js" });
    vm.runInContext(section(core, "function JsonEx()", "//-----------------------------------------------------------------------------"), ctx, { filename: "rmmz_core.js JsonEx" });
    vm.runInContext(section(core, "Tilemap.TILE_ID_B =", "Tilemap.Layer ="), ctx, { filename: "rmmz_core.js Tilemap constants" });
    vm.runInContext(section(deus, "window.DEUS = window.DEUS || {};", "//-----------------------------------------------------------------------------"), ctx, { filename: "DEUS_Core.js events" });
    for (const f of FILES) vm.runInContext(sources[f], ctx, { filename: `${tag}/${f}` });
    env.DataManager.onLoad(env.$dataTilesets);
    new env.Scene_Boot().start();
    env.__warnings = warnings;
    env.__errors = errors;
    return env;
}
function newWorld(env, seed) {
    env.UF.NewGameSetup = { seed, year: 1, levelsGen: 4 };   // 19A's comparisons are generator 4's (19B's generator 5: test_strata_cuts_and_caves.js)
    const t0 = performance.now();
    env.UF.World.newWorld(seed);
    return performance.now() - t0;
}
// A save through RMMZ's own DataManager (the functions the plugins alias), as a JSON string, and a load of one.
function saveJson(env) {
    const c = env.DataManager.makeSaveContents();
    return env.JsonEx.stringify({ ufWorld: c.ufWorld });
}
function loadJson(env, json, edit) {
    const c = env.JsonEx.parse(json);
    if (edit) edit(c.ufWorld);
    const contents = { system: env.$gameSystem, screen: env.$gameScreen, timer: env.$gameTimer, switches: env.$gameSwitches,
        variables: env.$gameVariables, selfSwitches: env.$gameSelfSwitches, actors: env.$gameActors, party: env.$gameParty,
        map: env.$gameMap, player: env.$gamePlayer, ufWorld: c.ufWorld };
    env.DataManager.extractSaveContents(contents);
    return env.UF.World.state;
}

//-----------------------------------------------------------------------------

const SOLID = 1, FLOOR = 2, OPEN = 3, RAMP = 4, STAIR_UP = 5;
const MB = 3.5e6;
const errorsExpected = [];

console.log(`=== DEUS-TSK-FABLE-19A strata foundation: seed ${SEED} (second seed ${SEED2})${mutant ? `, MUTANT ${mutant}` : ""} ===`);
const T0 = performance.now();
const env = setup(currentSources(), "strata");
const W = env.UF.World, L = env.UF.Levels, F = env.UF.Floors;
if (!W || !L || !F || typeof L.setStrata !== "function") harnessProblem("plugins did not load (World/Levels/Floors with strata)");
const tNew = newWorld(env, SEED);
const legacy = setup(legacySources(), "legacy");
const LW = legacy.UF.World, LL = legacy.UF.Levels;
const tOld = newWorld(legacy, SEED);
const st = W.state, size = st.size, n = size * size, a = { x: st.startArea.x, y: st.startArea.y };
console.log(`INFO newWorld ${tNew.toFixed(0)} ms with strata, ${tOld.toFixed(0)} ms pre-strata; area ${a.x},${a.y}, ${size}x${size}`);
const LEVELS = [-2, -1, 0, 1, 2];
const ref = (x, y, z) => ({ area: { x: a.x, y: a.y }, x, y, z });
const bytes = s => s.bytes.join(",");

// Truth from the pre-strata vm: its generated arrays per level.
const oldB = {};
for (const z of LEVELS) oldB[z] = LL.baseline(z, a.x, a.y);
const S = L.surfaceGrid(a.x, a.y);

// Fixture cells from the pre-strata arrays (the strata vm is never used to pick its own test cells).
function findCell(pred, from = 0) {
    for (let i = from; i < n; i++) {
        const x = i % size, y = (i / size) | 0;
        if (x < 8 || y < 8 || x >= size - 8 || y >= size - 8) continue;
        if (pred(i, x, y)) return { x, y, i };
    }
    return null;
}
const shp = (z, i) => oldB[z].shape[i];
const around = (z, x, y, code) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (shp(z, (y + dy) * size + x + dx) !== code) return false; return true; };
const valley = findCell((i, x, y) => S[i] === 0 && shp(0, i) === FLOOR && shp(1, i) === OPEN && shp(2, i) === OPEN && shp(-1, i) === SOLID && around(0, x, y, FLOOR));
const valley2 = valley && findCell((i, x, y) => S[i] === 0 && shp(0, i) === FLOOR && shp(1, i) === OPEN && shp(-1, i) === SOLID && around(0, x, y, FLOOR) && Math.abs(x - valley.x) > 12, valley.i + 1);
const deepRock = findCell((i, x, y) => shp(-2, i) === SOLID && shp(-1, i) === SOLID && shp(0, i) === SOLID && around(-1, x, y, SOLID) && around(0, x, y, SOLID));
const pool = findCell(i => shp(-1, i) === FLOOR && oldB[-1].water && oldB[-1].water[i] && oldB[-1].material[i] !== undefined);
const cave = findCell((i, x, y) => shp(-1, i) === FLOOR && !(oldB[-1].water && oldB[-1].water[i]) && around(-1, x, y, FLOOR));
const cave2 = cave && findCell((i, x, y) => shp(-1, i) === FLOOR && !(oldB[-1].water && oldB[-1].water[i]) && around(-1, x, y, FLOOR) && Math.abs(x - cave.x) + Math.abs(y - cave.y) > 10, cave.i + 1);
const hillTop = findCell((i, x, y) => S[i] === 1 && shp(1, i) === FLOOR && shp(0, i) === SOLID && shp(2, i) === OPEN && around(1, x, y, FLOOR));
const deep2 = findCell(i => shp(-2, i) === FLOOR && !(oldB[-2].water && oldB[-2].water[i]));
const fixtures = { valley, valley2, deepRock, pool, cave, cave2, hillTop, deep2 };
const missing = Object.keys(fixtures).filter(k => !fixtures[k]);
if (missing.length) harnessProblem(`no fixture cell for ${missing.join(", ")} in seed ${SEED}`);
console.log(`INFO fixtures ${Object.entries(fixtures).map(([k, c]) => `${k} (${c.x},${c.y})`).join(", ")}`);

// Events, recorded from here on.
const events = [];
for (const name of ["levels:strataChanged", "levels:strataDamaged", "levels:strataDestroyed", "levels:shapeChanged", "levels:cellChanged"]) {
    env.UF.Events.on(name, (...args) => events.push({ name, args }));
}
const eventsSince = (k, name) => events.slice(k).filter(e => e.name === name);
const snapshot = c => LEVELS.map(z => L.strataAt(ref(c.x, c.y, z)));
const restore = (c, snap) => LEVELS.forEach((z, k) => { const b = snap[k]; L.setStrata(ref(c.x, c.y, z), { m: b.bytes, hp: b.hp, connector: b.connector || 0 }); });
const matOf = key => L.STRATA_MATERIALS.find(m => m.key === key);

//---------------------------------------------------------------- storage_budget
guard("storage_budget", () => {
    const b0 = L.baseline(-1, a.x, a.y);
    for (const z of LEVELS) L.shapeCodeAt(a.x, a.y, 0, 0, z);   // every level's cached shape grid built
    const lazyBefore = ["shape", "material", "water"].every(k => { const d = Object.getOwnPropertyDescriptor(L.baseline(1, a.x, a.y), k); return !d || typeof d.get === "function"; });
    const mem = L.strataMemory(a.x, a.y);
    const flat = LEVELS.every(z => { const b = L.baseline(z, a.x, a.y); return Object.prototype.toString.call(b.strata.m) === "[object Uint8Array]"; })
        && LEVELS.every(z => L.baseline(z, a.x, a.y).strata.m.length === n * 5);
    const core = mem.strata + mem.connectors + mem.shapeGrids;
    check("storage_budget", core <= MB && flat && lazyBefore && !b0.strata.hp && mem.shapeGrids === 5 * n,
        `strata ${mem.strata} B + connectors ${mem.connectors} B + cached shape grids ${mem.shapeGrids} B = ${core} B (${(core / 1048576).toFixed(2)} MiB) for the 5 levels of area ${a.x},${a.y}, limit ${MB} B; ` +
        `also held: biome ${mem.biome} B, shared surface grid ${mem.surface} B, legacy views built so far ${mem.legacyViews} B, total ${mem.total} B; ` +
        `flat Uint8Array ${n}x5 per level ${flat}; baseline HP implicit (full) ${!b0.strata.hp}; +1 legacy views not built before a read ${lazyBefore}`);
});

//---------------------------------------------------------------- generation_deterministic, baseline_roundtrip, solid_open_columns
guard("generation_deterministic", () => {
    const rows = [];
    let ok = true;
    for (const z of LEVELS) {
        const gen = st.levels[String(z)].gen;   // the world's own generator (4, pinned above)
        const own = L.checksum(z), old = LL.checksum(z), rep = L.checksum(z, SEED, gen), other = L.checksum(z, SEED + 1, gen);
        const own2 = L.checksum(z, SEED2, gen), old2 = LL.checksum(z, SEED2, gen);
        // The ground's checksum is a lattice of UF_WorldGen's cell info for the live world (it never took a seed argument): no seed+1 test there.
        const good = own === old && own === rep && (z === 0 || (own !== other && own2 === old2)) && own !== "n/a" && st.levels[String(z)].checksum === own;
        if (!good) ok = false;
        rows.push(z === 0 ? `0: ${own}/${old}${own === old ? "" : " DIFFERENT"} (WorldGen lattice of the live world)` : `${z}: ${own}/${old}${own === old ? "" : " DIFFERENT"}, repeat ${rep === own ? "same" : "DIFFERENT"}, seed+1 ${other !== own ? "differs" : "SAME"}, seed ${SEED2} ${own2 === old2 ? "same" : `DIFFERENT ${own2}/${old2}`}`);
    }
    check("generation_deterministic", ok, `checksums strata/pre-strata: ${rows.join("; ")}`);
});
guard("baseline_roundtrip", () => {
    const bad = [];
    for (const z of LEVELS) {
        const b = L.baseline(z, a.x, a.y), o = oldB[z];
        for (const k of ["shape", "material", "water", "biome"]) {
            const x = b[k], y = o[k];
            if (!x !== !y) { bad.push(`${z}.${k} present ${!!x}/${!!y}`); continue; }
            if (!x) continue;
            let diff = 0;
            for (let i = 0; i < n; i++) if (x[i] !== y[i]) diff++;
            if (diff || x.length !== y.length) bad.push(`${z}.${k} ${diff} cells differ`);
        }
    }
    check("baseline_roundtrip", !bad.length, bad.length ? bad.join("; ") : `shape, material, water (below the ground) and biome of all 5 levels equal the pre-strata arrays byte for byte (${n} cells each)`);
});
guard("solid_open_columns", () => {
    const counts = { solid: 0, open: 0, floor: 0, ramp: 0, stairs: 0, pools: 0 }, bad = [];
    for (const z of LEVELS) {
        const b = L.baseline(z, a.x, a.y), m = b.strata.m, o = oldB[z];
        for (let i = 0; i < n; i++) {
            const s = o.shape[i], p = i * 5, mm = [m[p], m[p + 1], m[p + 2], m[p + 3], m[p + 4]];
            const solidN = mm.filter(v => v >= 1 && v <= 3).length, fluidN = mm.filter(v => v === 4 || v === 5).length;
            const water = o.water && o.water[i];
            let good;
            if (s === SOLID) { good = solidN === 5; counts.solid++; }
            else if (s === OPEN) { good = mm.every(v => v === 0); counts.open++; }
            else if (s === FLOOR) { good = mm[0] >= 1 && mm[0] <= 3 && solidN === 1 && (water ? fluidN === 2 && mm[1] === (z === -2 ? 5 : 4) : fluidN === 0); counts.floor++; if (water) counts.pools++; }
            else if (s === RAMP) { good = solidN === 3 && mm[0] && mm[1] && mm[2] && !mm[3] && !mm[4]; counts.ramp++; }
            else { good = solidN === 1 && mm[0] >= 1; counts.stairs++; }
            if (!good && bad.length < 5) bad.push(`${z} (${i % size},${(i / size) | 0}) code ${s}: [${mm}]`);
            if (!good) counts.bad = (counts.bad || 0) + 1;
        }
    }
    const hpFull = [-1, 0].every(z => { const r = L.strataAt(ref(deepRock.x, deepRock.y, z)); return r.hp.every(h => h === 255); });
    check("solid_open_columns", !counts.bad && hpFull && counts.solid > 0 && counts.open > 0 && counts.ramp > 0 && counts.pools > 0,
        `5 levels: solid ${counts.solid} (5/5 solid strata), open ${counts.open} (5/5 air), floor ${counts.floor} (S0; ${counts.pools} pools with S1..S2 water/lava), ramp ${counts.ramp} (S0..S2), stairs ${counts.stairs} (S0); wrong ${counts.bad || 0}${bad.length ? `: ${bad.join("; ")}` : ""}; solid strata at full HP (255) ${hpFull}`);
});

//---------------------------------------------------------------- fills and derived shapes
guard("fills_0_to_5", () => {
    const c = valley, r1 = ref(c.x, c.y, 1), rows = [];
    let ok = true;
    for (let k = 5; k >= 0; k--) {
        const m = [0, 1, 2, 3, 4].map(s => s < k ? "stone" : "air");
        const set = L.setStrata(r1, { m });
        const want = { shape: k === 5 ? "solid" : k === 0 ? "open" : "floor", top: k - 1, elev: k ? 15 + k - 1 : -1, state: `HEIGHT_${k}_OF_5`, solid: k === 5, frac: k / 5 };
        const got = { shape: L.shapeAt(r1), top: L.surfaceHeightAt(r1), elev: L.worldStrataElevationAt(r1), state: L.heightStateAt(r1), solid: L.isSolid(r1), frac: L.solidFraction(r1) };
        const good = set && JSON.stringify(got) === JSON.stringify(want) && L.shapeAt(a, c.x, c.y, 1) === want.shape && L.shapeCodeAt(a.x, a.y, c.x, c.y, 1) === L.SHAPES[want.shape];
        if (!good) ok = false;
        rows.push(`${k}/5 ${good ? "ok" : `WRONG ${JSON.stringify(got)} want ${JSON.stringify(want)}${set ? "" : ` (refused: ${L.lastRefusal().reason})`}`}`);
    }
    check("fills_0_to_5", ok, `+1 over the valley cell (${c.x},${c.y}) (ground below a floor, S4 air): ${rows.join(", ")}`);
});
guard("floor_on_substrate", () => {
    const c = valley, r0 = ref(c.x, c.y, 0), r1 = ref(c.x, c.y, 1);
    const openOverAir = L.shapeAt(r1);                                   // +1 fill 0 (last fills case) over the ground's floor
    L.setStrata(r0, { m: ["stone", "stone", "stone", "stone", "stone"] });
    const onSolid = { shape: L.shapeAt(r1), top: L.surfaceHeightAt(r1), elev: L.worldStrataElevationAt(r1), mat: L.cellAt(r1).material };
    L.setStrata(r0, { m: ["soil", "air", "air", "air", "air"] });
    const r2 = ref(deep2.x, deep2.y, -2);
    const before2 = L.strataAt(r2);
    L.setStrata(r2, { m: ["air", "air", "air", "air", "air"] });
    const deepest = L.shapeAt(r2), deepElev = L.worldStrataElevationAt(r2);
    L.setStrata(r2, { m: before2.bytes, hp: before2.hp });
    L.setStrata(r1, { m: ["air", "air", "air", "air", "air"] });
    const ok = openOverAir === "open" && onSolid.shape === "floor" && onSolid.top === -1 && onSolid.elev === 14 && onSolid.mat === "stone" && deepest === "open" && deepElev === -1;
    check("floor_on_substrate", ok, `0/5 over the ground's floor (S4 air): ${openOverAir}; 0/5 over a solid ground cell: ${JSON.stringify(onSolid)} (want floor, no stratum of its own, elevation 14 = ground S4, stone); ` +
        `0/5 at -2 (nothing below: lava): ${deepest}, elevation ${deepElev}`);
});
guard("legacy_shapes_match", () => {
    let diff = 0, cells = 0;
    const ex = [];
    for (const z of LEVELS) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        cells++;
        const s = L.shapeCodeAt(a.x, a.y, x, y, z), o = LL.shapeCodeAt(a.x, a.y, x, y, z);
        if (s !== o) { diff++; if (ex.length < 5) ex.push(`${z} (${x},${y}) ${s}/${o}`); }
    }
    const mats = [];
    for (const z of LEVELS) for (let i = 0; i < n; i += 97) {
        const x = i % size, y = (i / size) | 0, p = L.cellAt(ref(x, y, z)), q = LL.cellAt(ref(x, y, z));
        if (p.shape !== "open" && (p.material !== q.material || p.constructed !== q.constructed || p.liquid !== q.liquid)) mats.push(`${z} (${x},${y}) ${p.material}/${q.material} ${p.liquid}/${q.liquid}`);
    }
    check("legacy_shapes_match", diff === 0 && mats.length === 0, `shapeCodeAt strata/pre-strata over ${cells} cells (5 levels): ${diff} differ${ex.length ? ` (${ex.join("; ")})` : ""}; ` +
        `cellAt material/constructed/liquid on every 97th cell: ${mats.length} differ${mats.length ? ` (${mats.slice(0, 4).join("; ")})` : ""}`);
});
guard("surface_elevation_matches", () => {
    let checked = 0, bad = 0;
    const ex = [];
    for (let i = 0; i < n; i++) {
        const x = i % size, y = (i / size) | 0, s = S[i], code = shp(s, i);
        if (code !== FLOOR) continue;
        checked++;
        const e = L.worldStrataElevationAt(a, x, y, s), top = L.surfaceHeightAt(a, x, y, s);
        if (e !== (s + 2) * 5 || top !== 0) { bad++; if (ex.length < 4) ex.push(`(${x},${y}) S ${s}: ${e}/${top}`); }
    }
    check("surface_elevation_matches", checked > 1000 && bad === 0, `${checked} columns whose surface level S holds a floor: the stood-on stratum is S0 of level S, elevation (S + 2) x 5; wrong ${bad}${ex.length ? ` (${ex.join("; ")})` : ""}`);
});
guard("headroom_walkability", () => {
    const c = valley2, r0 = ref(c.x, c.y, 0), r1 = ref(c.x, c.y, 1), rows = [];
    const walk = () => W.walkable(a.x, a.y, c.x, c.y, { z: 0 });
    const base = { shape: L.shapeAt(r0), walk: walk() };
    L.setStrata(r1, { m: ["stone", "air", "air", "air", "air"] });           // a slab on +1: 4 strata of headroom on the ground
    const slab4 = { shape: L.shapeAt(r0), walk: walk() };
    L.setStrata(r0, { m: ["soil", "soil", "air", "air", "air"] });            // ground fill 2 under the slab: 3 strata
    const low3 = { shape: L.shapeAt(r0), walk: walk() };
    L.setStrata(r1, { m: ["air", "air", "air", "air", "air"] });              // slab gone: 3 + open above
    const open = { shape: L.shapeAt(r0), walk: walk(), top: L.surfaceHeightAt(r0) };
    L.setStrata(r0, { m: ["soil", "air", "air", "air", "air"] });
    const back = { shape: L.shapeAt(r0), walk: walk(), recorded: L.strataAt(r0).changed || L.strataAt(r1).changed };
    const ok = base.shape === "floor" && base.walk && slab4.shape === "floor" && low3.shape === "solid" && !low3.walk && open.shape === "floor" && open.top === 1 && back.shape === "floor" && back.walk && !back.recorded;
    check("headroom_walkability", ok, `ground (${c.x},${c.y}): as generated ${JSON.stringify(base)}; slab on +1 S0 (headroom 4) ${JSON.stringify(slab4)}; ground 2/5 under the slab (headroom 3) ${JSON.stringify(low3)} (want solid, not walkable); ` +
        `slab removed ${JSON.stringify(open)}; back to the baseline ${JSON.stringify(back)} (no saved record)`);
});

//---------------------------------------------------------------- damage
const rockSnap = snapshot(deepRock);   // the ground cell of deepRock is hill rock: always stone (z < S)
guard("damage_single_stratum", () => {
    const r = ref(deepRock.x, deepRock.y, 0);
    const k = events.length;
    const part = L.applyStrataDamage(r.area, r.x, r.y, 0, 2, 30, "dig");       // stone 120 HP, dig x1: 30 HP = 63.75 steps -> 64
    const mid = L.strataAt(r);
    const kill = L.applyStrataDamage(r.area, r.x, r.y, 0, 2, 200, "dig");
    const after = L.strataAt(r);
    const ok = part.ok && part.hit && part.hpBefore === 255 && part.hpAfter === 191 && mid.materials[2] === "stone" && mid.hp[2] === 191 &&
        mid.hp[1] === 255 && mid.hp[3] === 255 && kill.destroyed && after.materials.join() === "stone,stone,air,stone,stone" &&
        after.hp.join() === "255,255,0,255,255" && L.remainingStructuralHP(r) === 480 && L.maxStructuralHP(r) === 480 &&
        Math.abs(L.effectiveSupport(r) - 0.8) < 1e-9 && L.shapeAt(r) === "solid" && eventsSince(k, "levels:strataDestroyed").length === 1;
    check("damage_single_stratum", ok, `hill rock on the ground (${r.x},${r.y}): 30 dig on S2 -> HP ${part.hpBefore} -> ${part.hpAfter} (want 191), S1 ${mid.hp[1]}, S3 ${mid.hp[3]}; ` +
        `200 more -> destroyed ${kill.destroyed}: [${after.materials}] HP [${after.hp}]; HP left ${L.remainingStructuralHP(r)}/${L.maxStructuralHP(r)}, support ${L.effectiveSupport(r).toFixed(2)}; ` +
        `shape ${L.shapeAt(r)} (S0..S1 solid under a 1-stratum gap: headroom 1)`);
    restore(deepRock, rockSnap);
});
guard("destruction_changes_shape", () => {
    const r = ref(cave.x, cave.y, -1), k = events.length;
    const before = L.shapeAt(r), mat = L.strataAt(r).materials[0];
    const hit = L.applyStrataDamage(r.area, r.x, r.y, -1, 0, 1000, "blast");
    const after = L.shapeAt(r), top = L.surfaceHeightAt(r), elev = L.worldStrataElevationAt(r), below = L.shapeAt(ref(cave.x, cave.y, -2));
    const cc = eventsSince(k, "levels:cellChanged").filter(e => e.args[0].z === -1 && e.args[0].x === r.x && e.args[0].y === r.y);
    const ok = before === "floor" && hit.destroyed && top === -1 && (below === "solid" ? after === "floor" && elev === 4 : after === "open" && elev === -1) && cc.length >= 1;
    check("destruction_changes_shape", ok, `cave floor at -1 (${r.x},${r.y}), S0 ${mat}: ${before} -> S0 destroyed -> ${after} (the cell below is ${below}: standing on its top at elevation ${elev}); ` +
        `levels:cellChanged ${cc.length}`);
    L.setStrata(r, { m: [mat, "air", "air", "air", "air"] });
});
guard("damage_crosses_levels_box", () => {
    const c = deepRock, k = events.length;
    const sum = L.applyVolumeDamage(a, c.x, c.y, -1, 4, c.x, c.y, 0, 0, 500, "blast");
    const lo = L.strataAt(ref(c.x, c.y, -1)), hi = L.strataAt(ref(c.x, c.y, 0)), m1 = rockSnap[1].materials;
    const ok = sum.ok && sum.strataDestroyed === 2 && sum.levels.join() === "-1,0" && lo.materials.join() === `${m1.slice(0, 4)},air` &&
        hi.materials.join() === "air,stone,stone,stone,stone" && hi.hp.slice(1).every(h => h === 255) && lo.hp.slice(0, 4).every(h => h === 255) &&
        eventsSince(k, "levels:strataDestroyed").length === 2;
    check("damage_crosses_levels_box", ok, `box (${c.x},${c.y}) from Z-1:S4 to Z0:S0, 500 blast: destroyed ${sum.strataDestroyed} on levels [${sum.levels}]; -1 [${lo.materials}] HP [${lo.hp}], ground [${hi.materials}] HP [${hi.hp}]`);
    restore(c, rockSnap);
});
guard("sphere_aoe", () => {
    const c = deepRock;
    const sum = L.applyVolumeDamage({ center: { area: a, x: c.x, y: c.y, z: 0, s: 0 }, radius: 3, damage: 240, damageType: "dig", falloff: "linear" });
    const lo = L.strataAt(ref(c.x, c.y, -1)), hi = L.strataAt(ref(c.x, c.y, 0));
    // Stratum middles on the column: distance |e + 0.5 - 10.5| ft; damage 240 x (1 - d / 3) x the material's dig resist, in steps
    // ceil(dmg x 255 / maxHP) off 255 (0 = destroyed).
    const want = (d, key) => { const M = matOf(key), dmg = 240 * (1 - d / 3) * (M.resist.dig !== undefined ? M.resist.dig : 1); return dmg > 0 ? Math.max(0, 255 - Math.ceil(dmg * 255 / M.maxHP - 1e-9)) : 255; };
    const m1 = rockSnap[1].materials;
    const exp = { "-1:4": want(1, m1[4]), "-1:3": want(2, m1[3]), "-1:2": 255, "0:0": want(0, "stone"), "0:1": want(1, "stone"), "0:2": want(2, "stone"), "0:3": 255 };
    const got = { "-1:4": lo.hp[4], "-1:3": lo.hp[3], "-1:2": lo.hp[2], "0:0": hi.hp[0], "0:1": hi.hp[1], "0:2": hi.hp[2], "0:3": hi.hp[3] };
    const ok = sum.ok && JSON.stringify(got) === JSON.stringify(exp) && sum.levels.join() === "-1,0" && sum.strataHit === 7 && sum.cells === 2;
    check("sphere_aoe", ok, `sphere r 3 ft at the ground's S0 over (${c.x},${c.y}), 240 dig, linear: HP ${JSON.stringify(got)} want ${JSON.stringify(exp)} (0 = destroyed); ` +
        `${sum.strataHit} strata hit (want 7: -1 S2..S4, ground S0..S3), ${sum.strataDestroyed} destroyed, cells written ${sum.cells} (want 2: this column's -1 and ground; the next cell's middle is 5 ft away), levels [${sum.levels}]`);
    restore(c, rockSnap);
});
guard("resistance_and_hooks", () => {
    const r = ref(deepRock.x, deepRock.y, 0), w = ref(valley.x, valley.y, 1);
    const fireStone = L.applyStrataDamage(r.area, r.x, r.y, 0, 4, 100, "fire");
    L.setStrata(w, { m: ["wood", "air", "air", "air", "air"] });
    const fireWood = L.applyStrataDamage(w.area, w.x, w.y, 1, 0, 10, "fire");
    const seen = [];
    const off = L.registerDamageResponse("stone", ctx => { seen.push(ctx.material + ":" + ctx.damageType); return 0; });
    const hooked = L.applyStrataDamage(r.area, r.x, r.y, 0, 3, 500, "blast");
    off();
    const offAll = L.registerDamageResponse("*", ctx => ctx.effective * 2);
    const doubled = L.applyStrataDamage(r.area, r.x, r.y, 0, 3, 12, "dig");
    offAll();
    const fl = [];
    const offFluid = L.registerDamageResponse("fluid", ctx => { fl.push(ctx.material); return 999; });
    const p = ref(pool.x, pool.y, -1), poolBefore = L.strataAt(p);
    const onWater = L.applyStrataDamage(p.area, p.x, p.y, -1, 1, 50, "impact");
    offFluid();
    const poolAfter = L.strataAt(p);
    const ok = fireStone.effective === 10 && fireStone.hpAfter === 255 - Math.ceil(10 * 255 / 120) && fireWood.effective === 20 && fireWood.hpAfter === 255 - Math.ceil(20 * 255 / 60) &&
        hooked.effective === 0 && hooked.hpAfter === 255 && seen.join() === "stone:blast" && doubled.effective === 24 && doubled.hpAfter === 255 - Math.ceil(24 * 255 / 120) &&
        onWater.fluid && !onWater.hit && fl.join() === "water" && bytes(poolAfter) === bytes(poolBefore);
    check("resistance_and_hooks", ok, `fire on stone x0.1: ${fireStone.effective} -> HP ${fireStone.hpAfter}; fire on wood x2: ${fireWood.effective} -> HP ${fireWood.hpAfter}; ` +
        `a stone hook returning 0: effective ${hooked.effective}, HP ${hooked.hpAfter}, saw ${seen}; a "*" hook doubling 12 dig: ${doubled.effective} -> HP ${doubled.hpAfter}; ` +
        `impact on a pool's water stratum: fluid ${onWater.fluid}, hit ${onWater.hit}, fluid hook saw [${fl}], strata unchanged ${bytes(poolAfter) === bytes(poolBefore)}`);
    restore(deepRock, rockSnap);
    L.setStrata(w, { m: ["air", "air", "air", "air", "air"] });
});
guard("events_on_destruction", () => {
    const r = ref(cave2.x, cave2.y, -1), k = events.length, mat = L.strataAt(r).materials[0];
    L.applyStrataDamage(r.area, r.x, r.y, -1, 0, 5, "dig", { source: "TEST_pick" });
    const k2 = events.length;
    L.applyStrataDamage(r.area, r.x, r.y, -1, 0, 1000, "dig", { source: "TEST_pick" });
    const dmg = eventsSince(k, "levels:strataDamaged"), des = eventsSince(k, "levels:strataDestroyed"), chg = eventsSince(k, "levels:strataChanged");
    const cell = eventsSince(k2, "levels:cellChanged").filter(e => e.args[0].z === -1), shape = eventsSince(k2, "levels:shapeChanged").filter(e => e.args[0].z === -1);
    const d = des[0] && des[0].args[0];
    const hpOnly = eventsSince(k, "levels:cellChanged").length - eventsSince(k2, "levels:cellChanged").length === 0;
    const ok = dmg.length === 2 && des.length === 1 && chg.length === 2 && cell.length === 1 && !!d && d.x === r.x && d.y === r.y && d.z === -1 && d.stratum === 0 &&
        d.material === mat && d.debris && d.source === "TEST_pick" && d.damageType === "dig" && dmg[0].args[0].destroyed === false && hpOnly && shape.length <= 1;
    check("events_on_destruction", ok, `cave floor (${r.x},${r.y}) at -1: a small hit then a destroying one: strataDamaged ${dmg.length}, strataDestroyed ${des.length} ${JSON.stringify(d)}, ` +
        `strataChanged ${chg.length}, cellChanged at -1 after the destroying hit ${cell.length} (none for the HP-only hit ${hpOnly}), shapeChanged ${shape.length}`);
    L.setStrata(r, { m: [mat, "air", "air", "air", "air"] });
});

//---------------------------------------------------------------- overburden
guard("overburden", () => {
    let bad = 0, cells = 0;
    const ex = [];
    for (const z of LEVELS) for (let i = 0; i < n; i += 3) {
        const x = i % size, y = (i / size) | 0;
        let want = false;
        for (let u = z + 1; u <= 2; u++) if (shp(u, i) !== OPEN) want = true;   // pre-strata shapes: anything but open has solid strata
        cells++;
        if (L.hasOpaqueOverburden(a, x, y, z) !== want) { bad++; if (ex.length < 4) ex.push(`${z} (${x},${y})`); }
    }
    const c = valley, r0 = ref(c.x, c.y, 0);
    const sky = L.hasOpaqueOverburden(r0);
    L.setStrata(ref(c.x, c.y, 2), { m: ["wood", "air", "air", "air", "air"] }, { constructed: true });   // a deck two levels up
    LL.setShape(ref(c.x, c.y, 2), "floor", { constructed: true, material: "wood" });                    // the same deck, pre-strata
    const deck2 = L.hasOpaqueOverburden(r0), deckFloors = F.hasOpaqueOverburden(a, c.x, c.y, 0), roofed = F.isRoofed(a, c.x, c.y, 0), oldRoofed = legacy.UF.Floors.isRoofed(a, c.x, c.y, 0);
    L.setStrata(ref(c.x, c.y, 2), { m: ["air", "air", "air", "air", "air"] });
    LL.setShape(ref(c.x, c.y, 2), "open");
    L.setStrata(r0, { m: ["soil", "air", "air", "air", "stone"] });        // a lintel inside the cell above an air gap
    const gap = L.hasOpaqueOverburden(r0), gapTop = L.hasOpaqueOverburden(ref(c.x, c.y, 1));
    L.setStrata(r0, { m: ["soil", "air", "air", "air", "air"] });
    const under = F.isRoofed(a, deepRock.x, deepRock.y, -1) && F.hasOpaqueOverburden(a, deepRock.x, deepRock.y, -1);
    const ok = bad === 0 && cells > 100000 && !sky && deck2 && deckFloors && roofed && !oldRoofed && gap && !gapTop && under;
    check("overburden", ok, `hasOpaqueOverburden on every 3rd cell of 5 levels (${cells}) vs "a non-open cell anywhere above": ${bad} wrong${ex.length ? ` (${ex.join("; ")})` : ""}; ` +
        `valley ground: open sky ${sky}; under a deck on +2 with +1 open ${deck2} (Floors.hasOpaqueOverburden ${deckFloors}, Floors.isRoofed ${roofed}; the pre-strata isRoofed ${oldRoofed}: it looked one level up only); ` +
        `a stone S4 over an air gap in the cell ${gap} (+1 above it: ${gapTop}); deep rock at -1 roofed ${under}`);
});

//---------------------------------------------------------------- shape_grids_coherent
guard("shape_grids_coherent", () => {
    for (const z of LEVELS) L.shapeCodeAt(a.x, a.y, 0, 0, z);   // every level's grid built
    const c = valley2, snap = snapshot(c);
    // Edits whose derivation reaches the levels above and below: the ground dug out, -1 filled to 2/5, a +1 slab.
    L.setStrata(ref(c.x, c.y, 0), { m: ["air", "air", "air", "air", "air"] });
    L.setStrata(ref(c.x, c.y, -1), { m: ["stone", "stone", "air", "air", "air"] });
    L.setStrata(ref(c.x, c.y, 1), { m: ["wood", "air", "air", "air", "air"] }, { constructed: true });
    L.applyStrataDamage(a, deepRock.x, deepRock.y, 0, 0, 1000, "blast");
    const mid = L.verifyPackedGrids(a.x, a.y);
    const shapes = [-1, 0, 1, 2].map(z => L.shapeAt(ref(c.x, c.y, z))).join("/");
    restore(c, snap);
    restore(deepRock, rockSnap);
    const after = L.verifyPackedGrids(a.x, a.y);
    check("shape_grids_coherent", mid.grids === 5 && mid.cells === 5 * n && mid.mismatches === 0 && after.mismatches === 0 && shapes === "floor/open/floor/open",
        `cached grids ${mid.grids}, ${mid.cells} cells re-derived with the edits in place: ${mid.mismatches} differ${mid.examples.length ? ` ${JSON.stringify(mid.examples)}` : ""}; ` +
        `column (${c.x},${c.y}) -1/0/+1/+2 ${shapes} (want floor/open/floor/open: -1 2/5, the ground dug out over it, a deck on +1, sky); after restoring: ${after.mismatches} differ`);
});

//---------------------------------------------------------------- migration from a pre-strata save
// Legacy changes made by the pre-strata code itself (its setShape), saved through DataManager, loaded by the strata code.
const legacyChanges = [
    { what: "dig a -1 rock cell to a soil floor", c: deepRock, z: -1, shape: "floor", opts: { material: "soil" } },
    { what: "wall up a -1 cave floor", c: cave, z: -1, shape: "solid", opts: { material: "stone" } },
    { what: "wooden deck on +1 over the valley", c: valley, z: 1, shape: "floor", opts: { constructed: true, material: "wood" } },
    { what: "constructed ramp on +1", c: valley2, z: 1, shape: "ramp", opts: { constructed: true, material: "stone" } },
    { what: "stairs up at -1", c: cave2, z: -1, shape: "stairUp", opts: { material: "stone" } },
    { what: "wooden deck over a -1 pool", c: pool, z: -1, shape: "floor", opts: { constructed: true, material: "wood" } },
    { what: "a hole in a +1 hilltop (open over solid ground)", c: hillTop, z: 1, shape: "open", opts: {} },
    { what: "ground cell walled with soil", c: valley2, z: 0, shape: "solid", opts: { material: "soil" } }
];
let legacyJson = null;
guard("migration_no_data_loss", () => {
    for (const ch of legacyChanges) {
        const ok = LL.setShape({ area: a, x: ch.c.x, y: ch.c.y, z: ch.z }, ch.shape, ch.opts);
        if (!ok) harnessProblem(`the pre-strata setShape refused "${ch.what}": ${JSON.stringify(LL.lastRefusal())}`);
        ch.legacy = LL.cellAt({ area: a, x: ch.c.x, y: ch.c.y, z: ch.z });
    }
    legacyJson = saveJson(legacy);
    const saved = JSON.parse(legacyJson).ufWorld;
    const legacyCells = LEVELS.reduce((k, z) => k + Object.values((saved.levels[String(z)] || {}).cells || {}).reduce((m, c) => m + Object.keys(c).length, 0), 0);
    const errs0 = env.__errors.length;
    const st2 = loadJson(env, legacyJson);
    const rec = (st2.migrations || []).filter(m => m.rule === "strata").pop();
    const rows = [];
    let lost = 0;
    for (const ch of legacyChanges) {
        const r = ref(ch.c.x, ch.c.y, ch.z), now = L.cellAt(r), old = ch.legacy;
        const expectShape = ch.shape === "open" ? "floor" : old.shape;         // open over solid ground: a floor on its top
        const same = now.shape === expectShape && (old.shape === "open" || (now.material === old.material && now.constructed === old.constructed)) && now.water === old.water;
        if (!same) lost++;
        rows.push(`${ch.what}: ${old.shape}/${old.material}${old.constructed ? "/built" : ""}${old.water ? "/water" : ""} -> ${now.shape}/${now.material}${now.constructed ? "/built" : ""}${now.water ? "/water" : ""}${same ? "" : " LOST"}`);
    }
    const noCells = LEVELS.every(z => st2.levels[String(z)].cells === undefined);
    const verify = L.verifyLevels(st2);
    const ok = lost === 0 && !!rec && rec.converted === legacyCells && rec.invalid === 0 && rec.shapeChanged === 1 && st2.strataSchemaVersion === 1 && noCells &&
        verify.length === 0 && env.__errors.length === errs0;
    check("migration_no_data_loss", ok, `pre-strata save (${legacyJson.length} chars, ${legacyCells} changed cells) loaded through DataManager.extractSaveContents: ${rows.join("; ")}; ` +
        `record ${JSON.stringify(rec)}; strataSchemaVersion ${st2.strataSchemaVersion}; levels[z].cells gone ${noCells}; checksums verified (${verify.length} mismatches)`);
});
guard("migration_profiles", () => {
    const get = ch => L.strataAt(ref(ch.c.x, ch.c.y, ch.z));
    const [dig, wall, deck, ramp, stairs, poolDeck, hole, groundWall] = legacyChanges.map(get);
    const all = (s, m, hp) => s.materials.every(x => x === m) && s.hp.every(h => h === hp);
    const rows = {
        solid_5_of_5: all(wall, "stone", 255) && all(groundWall, "soil", 255) && wall.fill === 5,
        open_0_of_5: hole.materials.every(x => x === "air") && hole.hp.every(h => h === 0),
        floor_S0: dig.materials.join() === "soil,air,air,air,air" && dig.hp.join() === "255,0,0,0,0",
        deck_constructed: deck.materials[0] === "wood" && deck.constructed[0] && deck.fill === 1,
        ramp_3_of_5: ramp.materials.slice(0, 3).every(x => x === "stone") && ramp.fill === 3 && ramp.connector === "ramp" && ramp.constructed[2],
        stairs_S0_connector: stairs.fill === 1 && stairs.connector === "stairUp",
        pool_kept: poolDeck.materials.join() === "wood,water,water,air,air" && poolDeck.constructed[0]
    };
    check("migration_profiles", Object.values(rows).every(Boolean), Object.entries(rows).map(([k, v]) => `${k} ${v ? "ok" : "WRONG"}`).join(", ") +
        `; e.g. ramp [${ramp.materials}] ${ramp.connector}, pool deck [${poolDeck.materials}]`);
});
guard("unknown_format_diagnostics", () => {
    if (!legacyJson) throw new Error("no pre-strata save (migration_no_data_loss failed first)");
    // (a) a strata schema this build doesn't know: nothing read, nothing written, cells left in place
    let e0 = env.__errors.length;
    const stA = loadJson(env, legacyJson, w => { w.strataSchemaVersion = 99; });
    const aErr = env.__errors.slice(e0).some(s => /unknown strata schema version 99/.test(s));
    const aKept = LEVELS.some(z => stA.levels[String(z)].cells && Object.keys(stA.levels[String(z)].cells).length);
    const aRefused = L.setShape(ref(valley.x, valley.y, 1), "floor") === false && /schema/.test(L.lastRefusal().reason);
    const aDmg = L.applyStrataDamage(a, deepRock.x, deepRock.y, -1, 0, 10, "dig");
    errorsExpected.push(...env.__errors.slice(e0));
    // (b) junk in the legacy cells: kept aside, reported, never applied; the good entries converted
    e0 = env.__errors.length;
    const stB = loadJson(env, legacyJson, w => {
        const c = w.levels["-1"].cells[`${a.x},${a.y}`];
        c.abc = 5; c[String(n + 5)] = 18; c[String(deepRock.i + 1)] = "x"; c[String(deepRock.i + 2)] = 0x39;   // shape code 1 with material 3: unknown
        w.levels["1"].cells["nope"] = { 1: 2 };
    });
    const rB = (stB.migrations || []).filter(m => m.rule === "strata").pop();
    const bErr = env.__errors.slice(e0).some(s => /could not be read; they are kept/.test(s));
    const bKept = stB.levels["-1"].unmigratedCells && Object.keys(stB.levels["-1"].unmigratedCells[`${a.x},${a.y}`] || {}).length === 4 && !!stB.levels["1"].unmigratedCells.nope;
    const bGood = L.shapeAt(ref(deepRock.x, deepRock.y, -1)) === "floor" && L.shapeAt(ref(deepRock.x + 1, deepRock.y, -1)) === "solid";
    errorsExpected.push(...env.__errors.slice(e0));
    // (c) a corrupt record in a strata save: skipped with an error, the others read
    const good = saveJson(env);
    e0 = env.__errors.length;
    const stC = loadJson(env, good, w => { const k = Object.keys(w.levels["-1"].strata)[0]; const cells = w.levels["-1"].strata[k]; cells[Object.keys(cells)[0]] = "zz"; });
    const cErr = env.__errors.slice(e0).some(s => /could not be read and were skipped/.test(s));
    const cStill = L.shapeAt(ref(cave.x, cave.y, -1)) === "solid" || L.shapeAt(ref(deepRock.x, deepRock.y, -1)) === "floor";
    errorsExpected.push(...env.__errors.slice(e0));
    const ok = aErr && aKept && aRefused && !aDmg.ok && rB && rB.invalid === 5 && bErr && bKept && bGood && cErr && cStill && stC.strataSchemaVersion === 1;
    check("unknown_format_diagnostics", ok, `(a) strataSchemaVersion 99: console.error ${aErr}, legacy cells left in place ${aKept}, setShape refused ${aRefused}, damage refused ${!aDmg.ok}; ` +
        `(b) 5 junk legacy entries: invalid ${rB && rB.invalid}, console.error ${bErr}, kept in unmigratedCells ${bKept}, good entries applied ${bGood}; ` +
        `(c) a corrupt strata record: console.error ${cErr}, the other records read ${cStill}`);
    loadJson(env, legacyJson);   // the plain migrated world again for what follows
});
guard("save_load_strata_hp", () => {
    const r1 = ref(deepRock.x, deepRock.y, 0), r2 = ref(valley.x, valley.y, 1);
    L.applyStrataDamage(r1.area, r1.x, r1.y, 0, 3, 40, "dig");
    L.applyStrataDamage(r1.area, r1.x, r1.y, 0, 4, 999, "dig");
    L.setStrata(r2, { m: ["stone", "water", "air", "air", "air"], hp: [77, 0, 0, 0, 0] });
    const before = [r1, r2].map(r => ({ s: L.strataAt(r), shape: L.shapeAt(r) }));
    const json = saveJson(env);
    const st3 = loadJson(env, json);
    const after = [r1, r2].map(r => ({ s: L.strataAt(r), shape: L.shapeAt(r) }));
    const same = JSON.stringify(before) === JSON.stringify(after);
    const rec = st3.levels["0"].strata[`${a.x},${a.y}`][r1.y * size + r1.x];
    check("save_load_strata_hp", same && after[0].s.hp[3] < 255 && after[0].s.materials[4] === "air" && after[1].s.hp[0] === 77 && typeof rec === "string" && rec.length === 22,
        `ground rock (${r1.x},${r1.y}) after dig: [${after[0].s.materials}] HP [${after[0].s.hp}]; +1 (${r2.x},${r2.y}): [${after[1].s.materials}] HP [${after[1].s.hp}]; same after save/load ${same}; ` +
        `saved record "${rec}" (22 hex digits = connector + 5 materials + 5 HP)`);
});
guard("unchanged_terrain_regenerates", () => {
    const st3 = W.state;
    const records = LEVELS.reduce((k, z) => k + Object.values(st3.levels[String(z)].strata || {}).reduce((m, c) => m + Object.keys(c).length, 0), 0);
    let changed = 0;
    for (const z of LEVELS) for (let i = 0; i < n; i++) {
        const s = L.strataAt(ref(i % size, (i / size) | 0, z));
        if (s.changed) changed++;
    }
    const fresh = setup(currentSources(), "fresh");
    newWorld(fresh, SEED);
    const sameBase = LEVELS.every(z => Buffer.compare(Buffer.from(fresh.UF.Levels.baseline(z, a.x, a.y).strata.m), Buffer.from(L.baseline(z, a.x, a.y).strata.m)) === 0);
    const r = ref(valley.x, valley.y, 1);
    L.setStrata(r, { m: ["air", "air", "air", "air", "air"] });
    const dropped = st3.levels["1"].strata[`${a.x},${a.y}`] === undefined || st3.levels["1"].strata[`${a.x},${a.y}`][r.y * size + r.x] === undefined;
    check("unchanged_terrain_regenerates", records === changed && records > 0 && records < 20 && sameBase && dropped,
        `saved strata records ${records} = cells differing from their baseline ${changed} (of ${5 * n}); a fresh vm's five baselines equal byte for byte ${sameBase}; ` +
        `+1 (${r.x},${r.y}) set back to its baseline (5 air): record dropped ${dropped}`);
});
guard("fluid_adapter", () => {
    const f2s = [0, 1, 2, 3, 4, 5, 6, 7].map(L.fluidDepthToStrata), s2f = [0, 1, 2, 3, 4, 5].map(L.strataToFluidDepth);
    const round = [0, 1, 2, 3, 4, 5].every(k => L.fluidDepthToStrata(L.strataToFluidDepth(k)) === k);
    const P = L.FLUID_PASS, p = ref(pool.x, pool.y, -1), rock = ref(deepRock.x - 1, deepRock.y, -1), sky = ref(valley2.x + 1, valley2.y, 2);
    const pp = L.getStrataFluidPassage(p), pr = L.getStrataFluidPassage(rock), ps = L.getStrataFluidPassage(sky);
    const repeat = [0, 1, 2].every(() => L.getStrataFluidPassage(p) === pp && L.getStrataFluidPassage(sky) === ps);
    const ok = f2s.join() === "0,1,1,2,3,4,4,5" && s2f.join() === "0,1,3,4,6,7" && round && pr === 0 &&
        (pp & P.CAPACITY_MASK) === 6 && (pp & P.DOWN) === 0 && (pp & P.SIDE) !== 0 && L.fluidStateAt(p) === "FLUID_2_OF_5" &&
        (ps & P.CAPACITY_MASK) === 7 && (ps & P.UP) !== 0 && (ps & P.DOWN) !== 0 && repeat;
    check("fluid_adapter", ok, `DEUS_Fluid depth 0..7 -> strata [${f2s}], strata 0..5 -> depth [${s2f}], round trip ${round}; passage bits: pool at -1 ${pp} (capacity ${pp & 7}, down ${!!(pp & P.DOWN)}, ${L.fluidStateAt(p)}), ` +
        `rock ${pr}, +2 sky ${ps} (capacity ${ps & 7}, up ${!!(ps & P.UP)}, down ${!!(ps & P.DOWN)}); repeated calls equal ${repeat}`);
});

//---------------------------------------------------------------- no_allocation_queries, query_cost
const allocDone = guard("no_allocation_queries", () => {
    const cells = [];
    for (let k = 0; k < 64; k++) cells.push([(valley.x + k * 3) % size, (valley.y + k * 5) % size]);
    const areaObj = { x: a.x, y: a.y }, refObj = ref(valley.x, valley.y, 0);
    const run = N => {
        let acc = 0;
        for (let k = 0; k < N; k++) {
            const c = cells[k & 63], z = (k % 5) - 2;
            acc += L.shapeCodeAt(a.x, a.y, c[0], c[1], z);
            acc += L.surfaceHeightAt(areaObj, c[0], c[1], z);
            if (L.hasOpaqueOverburden(areaObj, c[0], c[1], z)) acc++;
            acc += L.getStrataFluidPassage(a.x, a.y, c[0], c[1], z);
            acc += L.shapeCodeAt(refObj);
        }
        return acc;
    };
    run(200000); run(200000);   // warm up (optimised code, caches)
    // Three measured windows of 400,000 rounds, each after a full collection. The first code optimised inside a window
    // adds a one-off heap growth (measured 2026-09-24: about 1.2 MB once, then 8 KB per 2,000,000 calls, the same as an
    // empty loop), so the steadiest window is judged; a per-call allocation grows every window and collects inside them.
    const gcTimes = [], windows = [];
    const obs = new PerformanceObserver(list => { for (const e of list.getEntries()) gcTimes.push(e.startTime); });
    obs.observe({ entryTypes: ["gc"] });
    let acc = 0;
    for (let w = 0; w < 3; w++) {
        global.gc();
        const t0 = performance.now(), h0 = v8.getHeapStatistics().used_heap_size;
        acc += run(400000);
        const h1 = v8.getHeapStatistics().used_heap_size;
        windows.push({ t0, t1: performance.now(), grew: h1 - h0 });
    }
    return new Promise(resolve => setImmediate(() => {
        obs.disconnect();
        const gcs = gcTimes.filter(t => windows.some(w => t >= w.t0 && t <= w.t1)).length;
        const least = Math.min(...windows.map(w => w.grew));
        check("no_allocation_queries", gcs === 0 && least < 2000000,
            `3 windows of 400,000 rounds x 5 queries (shapeCodeAt numeric and ref, surfaceHeightAt, hasOpaqueOverburden, getStrataFluidPassage; checksum ${acc}): garbage collections inside the windows ${gcs} (want 0), heap growth ${windows.map(w => w.grew).join(" / ")} B, least ${least} (limit 2,000,000 = 1 B per query; one 16 B object per query would be 32 MB)`);
        resolve();
    }));
});

async function finish() {
    await Promise.resolve(allocDone);
    guard("query_cost", () => {
        const pts = [];
        for (let k = 0; k < 4096; k++) pts.push([(k * 37) % size, (k * 61) % size, (k % 5) - 2]);
        const time = (Lx, N) => {
            let acc = 0;
            for (let k = 0; k < 20000; k++) { const p = pts[k & 4095]; acc += Lx.shapeCodeAt(a.x, a.y, p[0], p[1], p[2]); }
            const t0 = performance.now();
            for (let k = 0; k < N; k++) { const p = pts[k & 4095]; acc += Lx.shapeCodeAt(a.x, a.y, p[0], p[1], p[2]); }
            return { ns: (performance.now() - t0) * 1e6 / N, acc };
        };
        const N = 1000000, now = time(L, N), old = time(LL, N);
        check("query_cost", now.ns < 2000, `shapeCodeAt (ax, ay, x, y, z) on 4096 cells over the 5 levels, ${N} calls after a warm-up: strata ${now.ns.toFixed(0)} ns/call, pre-strata ${old.ns.toFixed(0)} ns/call (bound 2000 ns; the per-frame budget is measured in game)`);
    });
    const unexpected = env.__errors.filter(e => !errorsExpected.includes(e));
    check("no_errors", unexpected.length === 0, unexpected.length ? unexpected.slice(0, 3).join(" | ") : `none beyond the ${errorsExpected.length} the diagnostic check provoked`);
    console.log(`TIME ${((performance.now() - T0) / 1000).toFixed(1)} s`);
    console.log(`RESULT: ${passed} passed, ${failed} failed (exit ${failed ? 1 : 0})${failed ? ` - ${failures.join(", ")}` : ""}`);
    process.exit(failed ? 1 : 0);
}
finish();
