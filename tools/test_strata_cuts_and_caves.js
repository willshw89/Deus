#!/usr/bin/env node
"use strict";

/**
 * tools/test_strata_cuts_and_caves.js
 *
 * DEUS-TSK-FABLE-19B / WG.00.08: natural cuts and all-Z cave networks carved into the five-strata geometry
 * (docs/handoffs/HANDOFF_DEUS_TSK_FABLE_19B_CUTS_CAVES.md, docs/systems/UF_Levels.md section "Natural cuts and caves").
 * Runs the real plugins (DEUS_World, DEUS_WorldGen, DEUS_Tiles, DEUS_Objects, DEUS_Levels, DEUS_Floors) in a Node vm and
 * makes New Game worlds. Truth comes from the strata of the baselines, compared with generator 4 of the same seed (a New
 * Game with UF.NewGameSetup.levelsGen = 4) and with the levels code from before 19B (commit PRE_19B, read with git): the
 * natural-feature descriptors are used only to name what the strata show.
 *
 * Checks (handoff section 18 letters in brackets; each can print FAIL, the mutants below prove it):
 *   deterministic_same_seed     [A] two vms, same seed: the five baselines' strata, connectors and caps byte for byte, and the
 *                                    same checksums when another seed's world regenerates them (no live-state input)
 *   different_seeds_differ      [B] a second seed carves a different layout (column sets overlap < 25 %) and is valid too
 *   old_generator_unchanged         generator 4 (every save made before 19B) regenerates byte for byte as before 19B; a
 *                                    pre-V80 migration still gets generator 4
 *   carve_only_removes              every generator-4 -> 5 difference is a solid stratum turned to air, except the +2 massif
 *                                    fill (air -> stone on capped summit columns); connectors change only on changed columns
 *   partial_heights             [C] cut floors at HEIGHT_1..5_OF_5 (each fill seen, heightStateAt agrees on every cut column)
 *   z0_to_z1_exposure           [D] regression seed: a generated column open to the sky from the ground down to a floor in -1
 *   z1_to_z2_exposure           [E] regression seed: a generated sky-open column whose -1 cell is all air over a floor in -2
 *   feature_reaches_z2          [F] regression seed: one connected generated cut from the ground (or higher) down to -2
 *   shallow_more_common         [G] over the seed set: shallow cut components (<= 4 ft) outnumber the ones reaching -2 (x3)
 *   caves_on_all_levels         [H] over the seed set: roofed generated cave floors on +2, +1, 0, -1 and -2
 *   cave_free_terrain           [I] per seed: at most 5 % of columns hold a generated cave, at most 3 % a +2 massif
 *   traversable_terrain         [J] per seed: standable cells >= 90 % of generator 4's (ground and all levels), the ground's
 *                                    largest walkable region >= 85 %, the start valley (r <= 36) untouched on every level
 *   cave_overburden             [K] every roofed generated cave floor: hasOpaqueOverburden true and continuousAirHeight =
 *                                    the strata's air run; every sky-open cut floor: no overburden, Infinity; the networks'
 *                                    chambers roofed at their centres (>= 90 %)
 *   cave_void_minimum               over the seed set: no generated cave void is under 3 ft (the carve rule: C - F >= 3)
 *   roof_breach                 [L] a generated cave roof dug away: overburden and clearance change; a +2 cap breached:
 *                                    the same, levels:capBreached, the breach saved and loaded; restored = no record
 *   clearance_4_5_more          [M] continuousAirHeight: 4 ft (1 solid + 4 air), 5 ft, 6 and 9 ft across levels, sky,
 *                                    solid, no floor, a capped +2 floor; generated floors of 4, 5 and > 5 ft; no allocation
 *   clearance_stops_at_fluid    [M] clearance is AIR: stone + 4 water under solid 0 ft, stone + 2 air + 2 water 2 ft, -2
 *                                    stone + 4 lava 0 ft, the air above a water stratum not counted; airRunAt agrees
 *   shafts_keep_fluid               an instrumented copy of the generator plants water in every shaft's and skylight's path
 *                                    before they are carved (generated worlds keep pools away from them): the water stays and
 *                                    no rock of those columns is carved (a shaft or skylight never cuts through a fluid);
 *                                    needs rock under the water in at least one shaft and one skylight column
 *   multi_z_connectivity        [N] a generated multi-Z network: one continuous air volume holding floors on two levels
 *                                    (shaft or slope), and natural ramp connectors on slopes that step onto the next level
 *   no_floating_mass            [O] every solid stratum of every seed's five levels reaches bedrock or the area edge
 *   protections                     founding squares and pools below ground, cliff cave mouths, surface water, area edges
 *   ground_holes                    open ground cells: painted impassable dry rock face (layers 0 and 2, region 250), not
 *                                    walkable, cellInfo not walkable, no objects; no plant on a cut cell at any level
 *   save_load                       a generator-5 world saved and loaded: checksums verify, a dig and a cap change persist
 *   no_parallel_authority           baselines hold no per-cell feature or cut grid beside the strata, connectors, biome,
 *                                    surface and caps
 *   cost                            generation time and memory against generator 4 (reported; features < 3 s), query cost
 *   fluid_suite                 [P] node tools/test_strata_fluid_reconciliation.js exits 0 (--no-suites skips P and Q)
 *   foundation_suite            [Q] node tools/test_strata_foundation.js exits 0
 *   no_errors                       no console.error
 *
 * Usage: node tools/test_strata_cuts_and_caves.js [--seed=18] [--seed2=3] [--seeds=21,4] [--mutant=<name>] [--mutants]
 *        [--no-suites] [--quiet]
 * --mutants runs every mutant (each must exit 1) and prints the table. Exit: 0 all passed, 1 a check failed, 2 harness problem.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const v8 = require("v8");
const { performance } = require("perf_hooks");
const { execFileSync, spawn, spawnSync } = require("child_process");

// The allocation measurement needs global.gc: run again with --expose-gc when it's missing.
if (typeof global.gc !== "function") {
    const r = spawnSync(process.execPath, ["--expose-gc", __filename, ...process.argv.slice(2)], { stdio: "inherit" });
    process.exit(r.status === null ? 2 : r.status);
}

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const PRE_19B = "19fcf0e";     // HEAD before DEUS-TSK-FABLE-19B
const arg = (name, fallback) => {
    const a = process.argv.find(x => x.startsWith(`--${name}=`));
    return a ? a.slice(name.length + 3) : fallback;
};
const SEED = parseInt(arg("seed", "18"), 10) >>> 0;
const SEED2 = parseInt(arg("seed2", "3"), 10) >>> 0;
const EXTRA = arg("seeds", "21,4").split(",").map(s => parseInt(s, 10) >>> 0).filter(Boolean);
const mutant = arg("mutant", "");
const quiet = process.argv.includes("--quiet");
const noSuites = process.argv.includes("--no-suites") || !!mutant;

// Mutants (Rule 4): exact source edits, applied in memory. A missing target is a harness problem (exit 2).
const L_ = "DEUS_Levels.js", G_ = "DEUS_WorldGen.js";
const MUTANTS = {
    no_features: [[L_, "    function carveNaturalFeatures(seed, gen, ax, ay, size, bs) {\n", "    function carveNaturalFeatures(seed, gen, ax, ay, size, bs) {\n        bs[2].features = { cuts: [], caves: [], shafts: [], skylights: [] }; return bs[2].features; /* MUTANT */\n"]],
    nondeterministic: [[L_, "const rnd = (...p) => hash32(seed, salt, ax, ay, ...p) / 4294967296;", "const rnd = (...p) => p[0] === 204 || p[0] === 101 ? Math.random() : hash32(seed, salt, ax, ay, ...p) / 4294967296; /* MUTANT: the depth classes and the cave rolls drawn at random */"]],
    seed_ignored: [[L_, "const rnd = (...p) => hash32(seed, salt, ax, ay, ...p) / 4294967296;", "const rnd = (...p) => hash32(salt, ax, ay, ...p) / 4294967296; /* MUTANT */"]],
    old_gen_cut: [[L_, "        if (gen >= FEATURE_GEN) return volumeOf(seed, gen, ax, ay, size)[z + 2];", "        if (gen >= 4) return volumeOf(seed, gen, ax, ay, size)[z + 2]; /* MUTANT: generator 4 gets the cuts */"]],
    adds_mass: [[L_, "            for (let e = F; e < C; e++) setE(i, e, M_AIR);\n            clearConn(i, F, C - 1);\n            touched[i] |= 2;",
        "            for (let e = F; e < C; e++) setE(i, e, M_AIR);\n            if (C < E_TOP && !SOLID_B[getE(i, C)]) setE(i, C, M_STONE); /* MUTANT */\n            clearConn(i, F, C - 1);\n            touched[i] |= 2;"]],
    flat_cuts: [[L_, "                let Fw = T - Math.round((T - F) * wt[i]);", "                let Fw = T - Math.round((T - F) * wt[i]); Fw = Math.ceil(Fw / STRATA) * STRATA; /* MUTANT: whole levels only */"]],
    no_exposure: [[L_, "            const floorMin = Math.max(P.minBed, cls.floor);", "            const floorMin = 10; /* MUTANT: no cut below the ground's S0 */"],
        [L_, "        for (const net of networks) {\n            if (!net.skylight) continue;", "        for (const net of networks) {\n            if (net.skylight || !net.skylight) continue; /* MUTANT */"]],
    z2_everywhere: [[L_, "{ key: \"shallow\", p: 0.60, depth: [1, 4], floor: 7 },", "{ key: \"shallow\", p: 0.02, depth: [1, 4], floor: 7 }, /* MUTANT */"],
        [L_, "{ key: \"z2\", p: 0.03, bed: [1, 3], floor: 1 }", "{ key: \"z2\", p: 0.61, bed: [1, 3], floor: 1 }"]],
    underground_caves_only: [[L_, "        for (const z of [2, 1, 0, -1, -2]) {\n            const LV = CV.levels[String(z)], pl", "        for (const z of [-1, -2]) { /* MUTANT */\n            const LV = CV.levels[String(z)], pl"]],
    swiss_cheese: [[L_, "                spacing: 64,                   // one candidate anchor per 64 x 64 lattice cell and level", "                spacing: 20, /* MUTANT */"]],
    cuts_in_start: [[L_, "            startRadius: 40, startTaper: 8,", "            startRadius: 0, startTaper: 1, /* MUTANT */"]],
    no_roof: [[L_, "            let C = Math.min(F + h, capped ? E_TOP : top[i] - CV.roofMin, E_TOP);", "            let C = top[i]; /* MUTANT */"]],
    cap_ignored: [[L_, "        return capCode(qSt, qAx, qAy, qI) !== 0;\n    }", "        return false; /* MUTANT */\n    }"]],
    clearance_off_by_one: [[L_, "        let h = 0;\n        for (;;) {\n            while (s < STRATA) {\n                if (rdM[rdO + s] !== M_AIR) return h;",
        "        let h = 1; /* MUTANT */\n        for (;;) {\n            while (s < STRATA) {\n                if (rdM[rdO + s] !== M_AIR) return h;"]],
    air_through_fluid: [[L_, "        let h = 0;\n        for (;;) {\n            while (s < STRATA) {\n                if (rdM[rdO + s] !== M_AIR) return h;",
        "        let h = 0;\n        for (;;) {\n            while (s < STRATA) {\n                if (SOLID_B[rdM[rdO + s]] === 1) return h; /* MUTANT: fluid counted as air */"]],
    airrun_through_fluid: [[L_, "        let z = qZ, s = el % STRATA, h = 0;\n        locate(qSt, z, qAx, qAy, qI, 1);\n        for (;;) {\n            while (s < STRATA) {\n                if (rdM[rdO + s] !== M_AIR) return h;",
        "        let z = qZ, s = el % STRATA, h = 0;\n        locate(qSt, z, qAx, qAy, qI, 1);\n        for (;;) {\n            while (s < STRATA) {\n                if (SOLID_B[rdM[rdO + s]] === 1) return h; /* MUTANT: fluid counted as air */"]],
    void_min_1: [[L_, "            if (C - F < 3) return 0;", "            if (C - F < 1) return 0; /* MUTANT */"]],
    shaft_through_fluid: [[L_, "                if (fluidIn(i, sh.from, hi)) return;\n                let changed = false;\n                for (let e = sh.from; e < hi; e++) if (SOLID_B[getE(i, e)] === 1) { setE(i, e, M_AIR); changed = true; }",
        "                let changed = false;\n                for (let e = sh.from; e < hi; e++) if (SOLID_B[getE(i, e)] === 1 || FLUID_B[getE(i, e)] === 1) { setE(i, e, M_AIR); changed = true; } /* MUTANT: the old shaft */"]],
    shaft_prescan_removed: [[L_, "                if (fluidIn(i, sh.from, hi)) return;\n                let changed = false;\n                for (let e = sh.from; e < hi; e++) if (SOLID_B[getE(i, e)] === 1) { setE(i, e, M_AIR); changed = true; }",
        "                /* MUTANT: shaft pre-scan removed */\n                let changed = false;\n                for (let e = sh.from; e < hi; e++) if (SOLID_B[getE(i, e)] === 1) { setE(i, e, M_AIR); changed = true; }"]],
    skylight_through_fluid: [[L_, "                if (!solidE(i, nd.F - 1) || fluidIn(i, nd.F, top[i])) return;\n                let changed = false;\n                for (let e = nd.F; e < top[i]; e++) if (SOLID_B[getE(i, e)] === 1) { setE(i, e, M_AIR); changed = true; }",
        "                if (!solidE(i, nd.F - 1)) return;\n                let changed = false;\n                for (let e = nd.F; e < top[i]; e++) if (getE(i, e) !== M_AIR) { if (FLUID_B[getE(i, e)] === 1) return; setE(i, e, M_AIR); changed = true; } /* MUTANT: the old skylight */"]],
    no_multi_z: [[L_, "multiZChance: 0.25,", "multiZChance: 0, /* MUTANT */"], [L_, "shaftChance: 0.4,", "shaftChance: 0,"],
        [L_, "if (ramp) { CONN[zf + 2][i >> 1] |= RAMP << ((i & 1) << 2);", "if (ramp && false) { CONN[zf + 2][i >> 1] |= RAMP << ((i & 1) << 2);"]],
    keep_floating: [[L_, "                if (sol[v] !== 1) continue;", "                if (sol[v] !== 1 || true) continue; /* MUTANT */"]],
    pockets_unprotected: [[L_, "        for (const li of [0, 1]) {\n            const roofTop", "        for (const li of []) { /* MUTANT */\n            const roofTop"]],
    water_ignored: [[L_, "                if (S[j] === 0 && isWet(j)) return true;", "                if (false && isWet(j)) return true; /* MUTANT */"]],
    open_ground_grass: [[G_, "if (i < 0) return surfaceOut(x, y) >= 1; const c = col.code(i); return c === 1 || c === 3; }", "if (i < 0) return surfaceOut(x, y) >= 1; const c = col.code(i); return c === 1; } /* MUTANT */"]],
    plants_in_cuts: [[G_, "                if (L && typeof L.shapeCodeAt === \"function\" && L.shapeCodeAt(ctx.areaX, ctx.areaY, x, y, z) !== 2) continue;\n", "                /* MUTANT plants_in_cuts */\n"]],
    feature_grid_kept: [[L_, "        out.ms = performance.now() - t0;\n        bs[2].features = out;", "        out.ms = performance.now() - t0;\n        bs[2].cutTop = cutTop; /* MUTANT */\n        bs[2].features = out;"]],
    error_injected: [[L_, "    function carveNaturalFeatures(seed, gen, ax, ay, size, bs) {\n", "    function carveNaturalFeatures(seed, gen, ax, ay, size, bs) {\n        console.error(\"MUTANT error_injected\");\n"]]
};
if (process.argv.includes("--mutants")) {
    // Every mutant in its own process (6 at a time); each must exit 1.
    const names = Object.keys(MUTANTS), results = {};
    let next = 0, running = 0;
    const t0 = Date.now();
    const launch = () => {
        while (running < 6 && next < names.length) {
            const name = names[next++];
            running++;
            const child = spawn(process.execPath, ["--expose-gc", __filename, `--mutant=${name}`, "--quiet", ...process.argv.slice(2).filter(a => /^--(seed|seed2|seeds)=/.test(a))], { stdio: ["ignore", "pipe", "pipe"] });
            let text = "";
            child.stdout.on("data", d => { text += d; });
            child.stderr.on("data", d => { text += d; });
            child.on("close", code => {
                const fails = (text.match(/^FAIL (\S+)/gm) || []).map(s => s.slice(5));
                results[name] = { code, fails, caught: code === 1 && fails.length > 0 };
                const why = code !== 1 ? ` (want 1)${/^HARNESS .*/m.test(text) ? `: ${text.match(/^HARNESS .*/m)[0].slice(0, 200)}` : ""}` : fails.length ? "" : " (no check failed: not caught)";
                console.log(`MUTANT ${name}: exit ${code}${why}; failed: ${fails.join(", ") || "-"}`);
                running--;
                if (next < names.length) launch();
                else if (!running) {
                    const caught = names.filter(n => results[n].caught).length;
                    console.log(`MUTANTS: ${caught}/${names.length} caught by a named check (exit 1) (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
                    process.exit(caught === names.length ? 0 : 1);
                }
            });
        }
    };
    launch();
    return;
}
if (mutant && !MUTANTS[mutant]) {
    console.log(`HARNESS unknown mutant "${mutant}"; known: ${Object.keys(MUTANTS).join(", ")}`);
    console.log("RESULT: 0 passed, 0 failed (exit 2)");
    process.exit(2);
}

let passed = 0, failed = 0;
const failures = [];
// An uncaught error is the harness's problem (exit 2), never a check's failure.
process.on("uncaughtException", e => { console.log(`HARNESS uncaught: ${e && e.stack ? e.stack.split("\n").slice(0, 4).join(" | ") : e}`); console.log(`RESULT: ${passed} passed, ${failed} failed (exit 2)`); process.exit(2); });
process.on("unhandledRejection", e => { console.log(`HARNESS unhandled: ${e && e.stack ? e.stack.split("\n").slice(0, 4).join(" | ") : e}`); console.log(`RESULT: ${passed} passed, ${failed} failed (exit 2)`); process.exit(2); });
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
const info = s => { if (!quiet) console.log(`INFO ${s}`); };

//-----------------------------------------------------------------------------
// Sources: the working tree (with the mutant) and the levels code from before 19B.

const FILES = ["DEUS_World.js", "DEUS_WorldGen.js", "DEUS_Tiles.js", "DEUS_Objects.js", "DEUS_Levels.js", "DEUS_Floors.js"];
function currentSources() {
    const s = {};
    for (const f of FILES) s[f] = fs.readFileSync(path.join(PLUGINS, f), "utf8");
    if (mutant) {
        for (const [file, find, replace] of MUTANTS[mutant]) {
            if (!s[file].includes(find)) harnessProblem(`mutant ${mutant}: target not found in ${file}: ${find.slice(0, 80)}`);
            s[file] = s[file].replace(find, replace);
        }
    }
    return s;
}
function pre19bSources() {
    const s = {};
    for (const f of FILES) {
        try { s[f] = execFileSync("git", ["show", `${PRE_19B}:game/js/plugins/${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20 }); }
        catch (e) { harnessProblem(`can't read ${f} at ${PRE_19B} with git: ${e.message}`); }
    }
    if (s["DEUS_Levels.js"].includes("carveNaturalFeatures")) harnessProblem("the pre-19B DEUS_Levels.js already has natural features");
    return s;
}

//-----------------------------------------------------------------------------
// The vm: RMMZ stubs only where the plugins touch the engine (as tools/test_strata_foundation.js).

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
// A New Game world; levelsGen pins the level generator version (UF.NewGameSetup.levelsGen, 19B).
function newWorld(env, seed, levelsGen) {
    env.UF.NewGameSetup = levelsGen ? { seed, year: 1, levelsGen } : { seed, year: 1 };
    const t0 = performance.now();
    env.UF.World.newWorld(seed);
    return performance.now() - t0;
}
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
// Strata truth, read from the baselines' own arrays (never through the query API the checks judge).

const LEVELS = [-2, -1, 0, 1, 2], E_TOP = 25, SOLID = 1, FLOOR = 2, OPEN = 3, RAMP = 4;
const isSolidB = v => v !== 0 && (v & 0x40) === 0 && (v & 0x3f) >= 1 && (v & 0x3f) <= 3;
const isFluidB = v => (v & 0x3f) === 4 || (v & 0x3f) === 5;
const levelOfFloor = F => ((F / 5) | 0) - 2;           // the level a first-air elevation F stands on (fill F % 5)
function volume(env) {
    const L = env.UF.Levels, st = env.UF.World.state, a = { x: st.startArea.x, y: st.startArea.y };
    const bs = LEVELS.map(z => L.baseline(z, a.x, a.y));
    const size = st.size, n = size * size, M = bs.map(b => b.strata.m);
    const get = (i, e) => M[(e / 5) | 0][i * 5 + (e % 5)];
    const solid = (i, e) => isSolidB(get(i, e));
    const top = new Uint8Array(n);
    for (let i = 0; i < n; i++) { let e = E_TOP - 1; while (e >= 0 && !solid(i, e)) e--; top[i] = e + 1; }
    const caps = bs[4].caps || new Map();
    const conn = (li, i) => (bs[li].conn[i >> 1] >> ((i & 1) << 2)) & 15;
    return { env, L, st, a, bs, size, n, M, get, solid, top, caps, conn, S: L.surfaceGrid(a.x, a.y), gen: st.levels["0"].gen };
}
// Floors of a column: first-air elevations e with solid below; air run above up to the first solid (roof) or the top.
function floorsOf(V, i) {
    const out = [];
    for (let e = 1; e < E_TOP; e++) {
        if (V.solid(i, e) || !V.solid(i, e - 1)) continue;
        let r = e;
        while (r < E_TOP && !V.solid(i, r)) r++;
        let air = 0;
        while (e + air < r && V.get(i, e + air) === 0) air++;
        out.push({ F: e, roof: r, clear: r - e, air, sky: r === E_TOP && !V.caps.has(i), capped: r === E_TOP && V.caps.has(i) });
    }
    return out;
}
// Generator 5 against generator 4 of the same seed: cut columns (the rock top lowered), generated cave floors (a roofed
// air run holding strata that were solid in generator 4, or under a new cap), massif columns.
function compare(V5, V4) {
    const n = V5.n, cut = new Uint8Array(n), caveFloors = [], massif = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
        if (V5.top[i] < V4.top[i]) cut[i] = 1;
        if (V5.caps.has(i) && !V4.caps.has(i)) massif[i] = 1;
        for (const f of floorsOf(V5, i)) {
            if (f.sky) continue;
            let carved = f.capped && massif[i] === 1;
            for (let e = f.F; e < f.roof && !carved; e++) if (V4.solid(i, e)) carved = true;
            if (carved) caveFloors.push({ i, x: i % V5.size, y: (i / V5.size) | 0, F: f.F, level: levelOfFloor(f.F), clear: f.clear, air: f.air, roof: f.roof, capped: f.capped });
        }
    }
    return { cut, caveFloors, massif };
}
// Connected components (4-way) of a column mask.
function components(mask, size) {
    const n = size * size, seen = new Uint8Array(n), out = [];
    for (let s = 0; s < n; s++) {
        if (!mask[s] || seen[s]) continue;
        const q = [s];
        seen[s] = 1;
        for (let h = 0; h < q.length; h++) {
            const i = q[h], x = i % size, y = (i / size) | 0;
            for (const j of [x > 0 ? i - 1 : -1, x < size - 1 ? i + 1 : -1, y > 0 ? i - size : -1, y < size - 1 ? i + size : -1]) {
                if (j >= 0 && mask[j] && !seen[j]) { seen[j] = 1; q.push(j); }
            }
        }
        out.push(q);
    }
    return out;
}
// Solid strata not connected (up, down, sideways) to bedrock (elevation 0) or the area's edge.
function floatingStrata(V) {
    const n = V.n, size = V.size, N = n * E_TOP, sol = new Uint8Array(N), q = new Int32Array(N);
    for (let e = 0; e < E_TOP; e++) for (let i = 0; i < n; i++) sol[e * n + i] = V.solid(i, e) ? 1 : 0;
    let qh = 0, qt = 0;
    const push = v => { if (sol[v] === 1) { sol[v] = 2; q[qt++] = v; } };
    for (let i = 0; i < n; i++) push(i);
    for (let e = 0; e < E_TOP; e++) for (let k = 0; k < size; k++) { push(e * n + k); push(e * n + (size - 1) * size + k); push(e * n + k * size); push(e * n + k * size + size - 1); }
    while (qh < qt) {
        const v = q[qh++], e = (v / n) | 0, i = v - e * n, x = i % size;
        if (e > 0) push(v - n);
        if (e < E_TOP - 1) push(v + n);
        if (x > 0) push(v - 1);
        if (x < size - 1) push(v + 1);
        if (i >= size) push(v - size);
        if (i < n - size) push(v + size);
    }
    const out = [];
    for (let v = 0; v < N; v++) if (sol[v] === 1) out.push({ e: (v / n) | 0, x: (v % n) % size, y: ((v % n) / size) | 0 });
    return out;
}
const bytesOf = V => V.bs.map(b => Buffer.concat([Buffer.from(b.strata.m), Buffer.from(b.conn), Buffer.from(JSON.stringify([...(b.caps || new Map()).entries()]))]));

//-----------------------------------------------------------------------------

console.log(`=== DEUS-TSK-FABLE-19B natural cuts and all-Z caves: regression seed ${SEED}, second seed ${SEED2}, seed set ${[SEED, SEED2, ...EXTRA].join(",")}${mutant ? `, MUTANT ${mutant}` : ""} ===`);
const T0 = performance.now();
// P and Q (the WG.00.07 and 19A suites) run beside the checks, in their own processes.
const suites = {};
if (!noSuites) {
    for (const [key, file] of [["fluid_suite", "tools/test_strata_fluid_reconciliation.js"], ["foundation_suite", "tools/test_strata_foundation.js"]]) {
        suites[key] = new Promise(resolve => {
            const t0 = Date.now();
            const child = spawn(process.execPath, [path.join(ROOT, file)], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
            let text = "";
            child.stdout.on("data", d => { text += d; });
            child.stderr.on("data", d => { text += d; });
            child.on("close", code => resolve({ file, code, text, s: (Date.now() - t0) / 1000 }));
        });
    }
}

const src = currentSources();
const envA = setup(src, "g5");
const tNew5 = newWorld(envA, SEED);
const V5 = volume(envA);
if (!envA.UF.Levels || typeof envA.UF.Levels.continuousAirHeight !== "function") harnessProblem("DEUS_Levels without the 19B API");
const envB = setup(src, "g5-again");
newWorld(envB, SEED);
const V5b = volume(envB);
const env4 = setup(src, "g4");
const tNew4 = newWorld(env4, SEED, 4);
const V4 = volume(env4);
const envH = setup(pre19bSources(), "pre19B");
const tNewH = newWorld(envH, SEED);
const VH = volume(envH);
info(`newWorld seed ${SEED}: generator ${V5.gen} ${tNew5.toFixed(0)} ms, generator ${V4.gen} (same code, levelsGen 4) ${tNew4.toFixed(0)} ms, pre-19B code ${tNewH.toFixed(0)} ms; natural features ${envA.UF.Levels.stats().featureMs.toFixed(0)} ms`);
if (V5.gen < 5 && mutant !== "old_gen_cut") harnessProblem(`a New Game world has generator ${V5.gen}, not 5`);
const C5 = compare(V5, V4);
const F5 = envA.UF.Levels.naturalFeatures(V5.a.x, V5.a.y) || { cuts: [], caves: [], shafts: [], skylights: [] };
const L = envA.UF.Levels, W = envA.UF.World, size = V5.size, n = V5.n, a = V5.a;
const ref = (x, y, z) => ({ area: { x: a.x, y: a.y }, x, y, z });

// The seed set: the second seed and the extra ones, generator 5 and its generator-4 twin.
const set = [{ seed: SEED, V5, V4, C: C5 }];
for (const s of [SEED2, ...EXTRA]) {
    const e5 = setup(src, `g5-${s}`), e4 = setup(src, `g4-${s}`);
    const t5 = newWorld(e5, s), t4 = newWorld(e4, s, 4);
    const v5 = volume(e5), v4 = volume(e4);
    set.push({ seed: s, V5: v5, V4: v4, C: compare(v5, v4), env: e5, t5, t4 });
}
info(`seed set built: ${set.map(r => r.seed).join(", ")} (${((performance.now() - T0) / 1000).toFixed(0)} s)`);

const evidence = [];
const envErrors = [];
const ev = (k, text) => evidence.push(`${k}. ${text}`);

//---------------------------------------------------------------- [A] deterministic_same_seed
guard("deterministic_same_seed", () => {
    const x = bytesOf(V5), y = bytesOf(V5b);
    const same = LEVELS.map((z, k) => Buffer.compare(x[k], y[k]) === 0);
    const feat = JSON.stringify(F5.cuts.map(c => [c.type, c.anchor, c.cells])) === JSON.stringify((envB.UF.Levels.naturalFeatures(a.x, a.y) || { cuts: [] }).cuts.map(c => [c.type, c.anchor, c.cells]));
    // Purity: another seed's live world regenerates this seed's baselines to the same checksums.
    const other = set[1].env.UF.Levels;
    const sums = [-2, -1, 1, 2].map(z => ({ z, own: L.checksum(z), there: other.checksum(z, SEED, 5) }));
    const pure = sums.every(s => s.own === s.there);
    check("deterministic_same_seed", same.every(Boolean) && feat && pure,
        `seed ${SEED} in two vms: strata+connectors+caps per level ${LEVELS.map((z, k) => `${z}:${same[k] ? "same" : "DIFFERENT"}`).join(" ")}, feature list ${feat ? "same" : "DIFFERENT"}; ` +
        `regenerated inside seed ${SEED2}'s world: ${sums.map(s => `${s.z}: ${s.own}${s.own === s.there ? "" : `/${s.there} DIFFERENT`}`).join(", ")}`);
});

//---------------------------------------------------------------- [B] different_seeds_differ
guard("different_seeds_differ", () => {
    const r2 = set[1];
    const colsOf = C => { const s = new Set(); for (let i = 0; i < n; i++) if (C.cut[i]) s.add(i); for (const f of C.caveFloors) s.add(f.i); return s; };
    const p = colsOf(C5), q = colsOf(r2.C);
    let inter = 0;
    for (const i of p) if (q.has(i)) inter++;
    const jac = inter / Math.max(1, p.size + q.size - inter);
    const valid = floatingStrata(r2.V5).length === 0 && r2.C.caveFloors.length > 0 && q.size > 0;
    // The plans themselves: the cut anchors of the two seeds (the terrain alone would already move the carved columns).
    const F2 = set[1].env.UF.Levels.naturalFeatures(a.x, a.y) || { cuts: [] };
    const anchors = new Set(F5.cuts.map(c => `${c.anchor.x},${c.anchor.y}`));
    const sameAnchors = F2.cuts.filter(c => anchors.has(`${c.anchor.x},${c.anchor.y}`)).length;
    const anchorShare = sameAnchors / Math.max(1, Math.min(F5.cuts.length, F2.cuts.length));
    check("different_seeds_differ", p.size > 0 && q.size > 0 && jac < 0.25 && valid && anchorShare < 0.3,
        `carved columns: seed ${SEED} ${p.size}, seed ${SEED2} ${q.size}, shared ${inter} (overlap ${(jac * 100).toFixed(1)} %, limit 25 %); cut anchors ${F5.cuts.length} / ${F2.cuts.length}, at the same cell ${sameAnchors} (${(anchorShare * 100).toFixed(0)} %, limit 30 %); seed ${SEED2} valid (no floating mass, caves present) ${valid}`);
});

//---------------------------------------------------------------- old_generator_unchanged
guard("old_generator_unchanged", () => {
    const x = bytesOf(V4), y = bytesOf(VH);
    const same = LEVELS.map((z, k) => Buffer.compare(x[k], y[k]) === 0);
    const sums = LEVELS.map(z => ({ z, now: env4.UF.Levels.checksum(z), before: envH.UF.Levels.checksum(z) }));
    const sumsSame = sums.every(s => s.now === s.before);
    const noFeatures = env4.UF.Levels.naturalFeatures(a.x, a.y) === null && V4.caps.size === 0;
    // A pre-V80 save (no levels) migrates to generator 4, whatever a New Game makes now.
    const st = env4.UF.World.state, saved = JSON.parse(JSON.stringify({ levels: st.levels, version: st.version }));
    delete st.levels; st.version = 3;
    env4.UF.Levels.migrate(st, { x: 0, y: 0 });
    const migratedGen = LEVELS.map(z => st.levels[String(z)].gen);
    st.levels = saved.levels; st.version = saved.version;
    check("old_generator_unchanged", same.every(Boolean) && sumsSame && noFeatures && migratedGen.every(g => g === 4),
        `generator 4 (levelsGen 4) vs the pre-19B code (${PRE_19B}), seed ${SEED}: strata per level ${LEVELS.map((z, k) => `${z}:${same[k] ? "same" : "DIFFERENT"}`).join(" ")}; ` +
        `checksums ${sums.map(s => `${s.z}:${s.now}${s.now === s.before ? "" : `/${s.before}`}`).join(" ")}; no features or caps ${noFeatures}; a pre-V80 migration's generators [${migratedGen}]`);
});

//---------------------------------------------------------------- carve_only_removes
guard("carve_only_removes", () => {
    let removed = 0, added = 0, addedMassif = 0, changedSolid = 0, fluidLost = 0, connBad = 0, connRamps = 0;
    const bad = [];
    for (const r of set) {
        const A = r.V4, B = r.V5;
        for (let i = 0; i < n; i++) {
            let colChanged = false;
            for (let e = 0; e < E_TOP; e++) {
                const u = A.get(i, e), v = B.get(i, e);
                if (u === v) continue;
                colChanged = true;
                if (isSolidB(u) && v === 0) removed++;
                else if (u === 0 && isSolidB(v) && e >= 21 && B.caps.has(i) && !A.caps.has(i)) addedMassif++;
                else if (isFluidB(u) && v === 0) { fluidLost++; if (bad.length < 4) bad.push(`seed ${r.seed} (${i % size},${(i / size) | 0}) e ${e}: fluid ${u} -> air`); }
                else if (u === 0 && v !== 0) { added++; if (bad.length < 4) bad.push(`seed ${r.seed} (${i % size},${(i / size) | 0}) e ${e}: air -> ${v}`); }
                else { changedSolid++; if (bad.length < 4) bad.push(`seed ${r.seed} (${i % size},${(i / size) | 0}) e ${e}: ${u} -> ${v}`); }
            }
            for (let li = 0; li < 5; li++) {
                const c4 = A.conn(li, i), c5 = B.conn(li, i);
                if (c4 === c5) continue;
                if (c5 === RAMP && c4 === 0) connRamps++;
                else if (c5 === 0 && colChanged) continue;
                else { connBad++; if (bad.length < 6) bad.push(`seed ${r.seed} (${i % size},${(i / size) | 0}) level ${li - 2}: connector ${c4} -> ${c5}`); }
            }
        }
    }
    check("carve_only_removes", removed > 0 && added === 0 && changedSolid === 0 && fluidLost === 0 && connBad === 0,
        `${set.length} seeds, generator 4 -> 5: solid strata carved to air ${removed}; +2 massif fill on capped summit columns ${addedMassif}; ` +
        `air -> matter elsewhere ${added}, solid material changed ${changedSolid}, fluid removed ${fluidLost}; connectors: ramps added ${connRamps}, other changes on unchanged columns ${connBad}${bad.length ? `: ${bad.join("; ")}` : ""}`);
});

//---------------------------------------------------------------- [C] partial_heights
guard("partial_heights", () => {
    const count = [0, 0, 0, 0, 0, 0], wrong = [], example = {};
    for (let i = 0; i < n; i++) {
        if (!C5.cut[i]) continue;
        const T = V5.top[i];
        if (T < 1) continue;
        const k = ((T - 1) % 5) + 1, zc = levelOfFloor(T - 1);
        // The cell holding the top stratum must be filled from its S0 up to it (else the floor is a slab, reported apart).
        let base = true;
        for (let e = (zc + 2) * 5; e < T; e++) if (!V5.solid(i, e)) base = false;
        if (!base) continue;
        count[k]++;
        if (!example[k]) example[k] = { x: i % size, y: (i / size) | 0, z: zc, top: T };
        const hs = L.heightStateAt(a, i % size, (i / size) | 0, zc);
        if (hs !== `HEIGHT_${k}_OF_5` && wrong.length < 4) wrong.push(`(${i % size},${(i / size) | 0},${zc}) ${hs} want HEIGHT_${k}_OF_5`);
    }
    const ok = [1, 2, 3, 4, 5].every(k => count[k] >= 5) && wrong.length === 0;
    const e1 = example[2] || example[1];
    if (e1) ev(1, `shallow partial-height cut floor: seed ${SEED} (${e1.x},${e1.y}) level ${e1.z}: ${L.heightStateAt(a, e1.x, e1.y, e1.z)} (natural top ${V4.top[e1.y * size + e1.x]} ft, cut top ${e1.top} ft)`);
    check("partial_heights", ok, `cut columns of seed ${SEED} by the fill of the cell holding the new top: ${[1, 2, 3, 4, 5].map(k => `HEIGHT_${k}_OF_5 ${count[k]}${example[k] ? ` e.g. (${example[k].x},${example[k].y},${example[k].z})` : ""}`).join(", ")} (want >= 5 each); heightStateAt disagreeing ${wrong.length}${wrong.length ? `: ${wrong.join("; ")}` : ""}`);
});

//---------------------------------------------------------------- [D] [E] [F] exposures
const skyOpen = (V, i) => { const T = V.top[i]; for (let e = T; e < E_TOP; e++) if (V.solid(i, e)) return false; return !V.caps.has(i); };
guard("z0_to_z1_exposure", () => {
    let best = null, count = 0;
    for (let i = 0; i < n; i++) {
        if (!C5.cut[i] || V4.top[i] < 11 || !skyOpen(V5, i)) continue;
        const T = V5.top[i];
        if (T > 9 || T < 5) continue;       // the ground cell all air and -1's S4 open: the floor stands in -1
        count++;
        if (!best || T < best.T) best = { i, T };
    }
    if (best) {
        const x = best.i % size, y = (best.i / size) | 0;
        ev(2, `Z0 -> Z-1 cut: seed ${SEED} (${x},${y}): ground ${L.shapeAt(ref(x, y, 0))}, -1 ${L.shapeAt(ref(x, y, -1))} ${L.heightStateAt(ref(x, y, -1))}, first air at ${best.T} ft (natural ${V4.top[best.i]} ft), open to the sky`);
    }
    const x = best ? best.i % size : 0, y = best ? (best.i / size) | 0 : 0;
    check("z0_to_z1_exposure", !!best && L.shapeAt(ref(x, y, 0)) === "open" && L.hasOpaqueOverburden(ref(x, y, -1)) === false,
        best ? `${count} generated columns of seed ${SEED} open from the ground down to a floor in -1; deepest (${x},${y}): first air ${best.T} ft, ground cell ${L.shapeAt(ref(x, y, 0))}, -1 cell ${L.shapeAt(ref(x, y, -1))} (${L.heightStateAt(ref(x, y, -1))}), overburden ${L.hasOpaqueOverburden(ref(x, y, -1))}` : `no generated column of seed ${SEED} opens the ground to a floor in -1`);
});
let z2Column = null;
guard("z1_to_z2_exposure", () => {
    let best = null, count = 0;
    for (let i = 0; i < n; i++) {
        if (!C5.cut[i] || V4.top[i] < 11 || !skyOpen(V5, i)) continue;
        const T = V5.top[i];
        if (T > 4) continue;                // -1 all air and -2's S4 open: the floor stands in -2
        count++;
        if (!best || T < best.T) best = { i, T };
    }
    const x = best ? best.i % size : 0, y = best ? (best.i / size) | 0 : 0;
    if (best) {
        z2Column = best;
        ev(3, `Z-1 -> Z-2 cut: seed ${SEED} (${x},${y}): -1 ${L.shapeAt(ref(x, y, -1))} (all air), -2 ${L.shapeAt(ref(x, y, -2))} ${L.heightStateAt(ref(x, y, -2))}, first air ${best.T} ft (natural ${V4.top[best.i]} ft)`);
    }
    check("z1_to_z2_exposure", !!best && L.shapeAt(ref(x, y, -1)) === "open" && L.heightStateAt(ref(x, y, -1)) === "HEIGHT_0_OF_5",
        best ? `${count} generated sky-open columns of seed ${SEED} whose -1 cell is all air over a floor in -2; deepest (${x},${y}): first air ${best.T} ft, -1 ${L.shapeAt(ref(x, y, -1))}, -2 ${L.shapeAt(ref(x, y, -2))} ${L.heightStateAt(ref(x, y, -2))}` : `no generated column of seed ${SEED} opens -1 onto a floor in -2`);
});
guard("feature_reaches_z2", () => {
    const comps = components(C5.cut, size);
    let pick = null;
    for (const q of comps) {
        let minT = 99, hosts = new Set(), deepest = null;
        for (const i of q) { if (V5.top[i] < minT) { minT = V5.top[i]; deepest = i; } hosts.add(levelOfFloor(V4.top[i])); }
        if (minT <= 4 && [...hosts].some(z => z >= 0) && q.length >= 10 && skyOpen(V5, deepest) && (!pick || q.length > pick.q.length)) pick = { q, minT, hosts, deepest };
    }
    let traced = false;
    if (pick) {
        // Walk from the deepest column to a column on the ground or higher through the component (the cut is one feature).
        const inC = new Set(pick.q), seen = new Set([pick.deepest]), queue = [pick.deepest];
        for (let h = 0; h < queue.length && !traced; h++) {
            const i = queue[h];
            if (V4.top[i] >= 11) traced = true;
            const x = i % size, y = (i / size) | 0;
            for (const j of [i - 1, i + 1, i - size, i + size]) if (inC.has(j) && !seen.has(j) && Math.abs((j % size) - x) + Math.abs(((j / size) | 0) - y) === 1) { seen.add(j); queue.push(j); }
        }
        const xs = pick.q.map(i => i % size), ys = pick.q.map(i => (i / size) | 0), dx = pick.deepest % size, dy = (pick.deepest / size) | 0;
        const f = F5.cuts.find(c => c.deepest && c.deepest.x === dx && c.deepest.y === dy) || F5.cuts.find(c => c.floorLevel === -2);
        ev(4, `multi-level feature reaching Z-2: seed ${SEED}, ${f ? `${f.type} (${f.family}, class ${f.depthClass})` : "cut"} of ${pick.q.length} columns spanning x ${Math.min(...xs)}..${Math.max(...xs)}, y ${Math.min(...ys)}..${Math.max(...ys)}, host levels ${[...pick.hosts].sort()}, deepest (${dx},${dy}) first air ${pick.minT} ft`);
    }
    check("feature_reaches_z2", !!pick && traced,
        pick ? `a connected generated cut of seed ${SEED}: ${pick.q.length} columns, host levels [${[...pick.hosts].sort()}], deepest first air ${pick.minT} ft at (${pick.deepest % size},${(pick.deepest / size) | 0}); traced through the cut up to a column whose natural surface is the ground or higher ${traced}`
            : `no connected generated cut of seed ${SEED} runs from the ground (or higher) down to a floor in -2`);
});

//---------------------------------------------------------------- [G] shallow_more_common
guard("shallow_more_common", () => {
    let shallow = 0, mid = 0, z1 = 0, z2 = 0;
    const per = [];
    for (const r of set) {
        let s = 0, d2 = 0;
        for (const q of components(r.C.cut, size)) {
            let maxD = 0, minT = 99;
            for (const i of q) { maxD = Math.max(maxD, r.V4.top[i] - r.V5.top[i]); minT = Math.min(minT, r.V5.top[i]); }
            if (minT <= 5) { z2++; d2++; } else if (minT <= 6) z1++; else if (maxD <= 4) { shallow++; s++; } else mid++;
        }
        per.push(`${r.seed}: ${s} shallow / ${d2} to -2`);
    }
    check("shallow_more_common", shallow >= 3 * z2 && z2 >= 1 && shallow > mid,
        `generated cut components over ${set.length} seeds by realized depth: shallow (<= 4 ft) ${shallow}, deeper partial ${mid}, exposing -1 to its S0 ${z1}, reaching -2 ${z2} (want shallow >= 3 x reaching -2, and at least one reaching -2); ${per.join("; ")}`);
});

//---------------------------------------------------------------- [H] caves_on_all_levels
guard("caves_on_all_levels", () => {
    const levels = { "-2": 0, "-1": 0, "0": 0, "1": 0, "2": 0 }, first = {};
    for (const r of set) for (const f of r.C.caveFloors) {
        levels[f.level]++;
        const cur = first[f.level];
        if (!cur || (r.seed === SEED && (cur.seed !== SEED || f.clear > cur.clear))) first[f.level] = Object.assign({ seed: r.seed }, f);
    }
    // Evidence: the floor at the first chamber of a regression-seed network of that level (a representative chamber, not a
    // shaft column), else the roomiest generated floor of the level.
    const atNode = {};
    for (const c of F5.caves) {
        const nd = c.nodes.find(q => !q.stub);
        if (!nd || atNode[c.level]) continue;
        const f = C5.caveFloors.find(q => q.x === nd.x && q.y === nd.y && Math.abs(q.F - nd.floor) <= 1);
        if (f) atNode[c.level] = Object.assign({ seed: SEED, network: c.id }, f);
    }
    for (const [k, z] of [[5, 2], [6, 1], [7, 0], [8, -1], [9, -2]]) {
        const f = atNode[z] || first[z];
        if (f) ev(k, `Z${z >= 0 ? "+" : ""}${z} cave: seed ${f.seed}${f.network !== undefined ? ` network #${f.network}` : ""} (${f.x},${f.y}): floor first air ${f.F} ft (level ${f.level}), clearance ${f.clear} ft, roof ${f.capped ? "the ceiling cap" : `solid from ${f.roof} ft`}`);
    }
    check("caves_on_all_levels", LEVELS.every(z => levels[z] > 0),
        `roofed generated cave floors over ${set.length} seeds by level: ${LEVELS.slice().reverse().map(z => `${z}: ${levels[z]}${first[z] ? ` (seed ${first[z].seed} (${first[z].x},${first[z].y}))` : ""}`).join(", ")}`);
});

//---------------------------------------------------------------- [I] cave_free_terrain, [J] traversable_terrain
guard("cave_free_terrain", () => {
    const rows = [];
    let ok = true;
    for (const r of set) {
        const cols = new Set(r.C.caveFloors.map(f => f.i));
        let massif = 0;
        for (let i = 0; i < n; i++) if (r.C.massif[i]) massif++;
        const cf = cols.size / n, mf = massif / n;
        if (cf > 0.05 || mf > 0.03) ok = false;
        rows.push(`${r.seed}: cave columns ${cols.size} (${(cf * 100).toFixed(2)} %), massif ${massif} (${(mf * 100).toFixed(2)} %)`);
    }
    check("cave_free_terrain", ok, `${rows.join("; ")} (limits 5 % and 3 %)`);
});
guard("traversable_terrain", () => {
    const rows = [];
    let ok = true;
    for (const r of set) {
        const L5 = (r.env || envA).UF.Levels, L4 = r.V4.env.UF.Levels;
        let s5 = 0, s4 = 0, g5 = 0, g4 = 0;
        const walk5 = new Uint8Array(n), walk4 = new Uint8Array(n);
        for (const z of LEVELS) for (let i = 0; i < n; i++) {
            const x = i % size, y = (i / size) | 0;
            const c5 = L5.shapeCodeAt(a.x, a.y, x, y, z), c4 = L4.shapeCodeAt(a.x, a.y, x, y, z);
            if (c5 === FLOOR || c5 === RAMP) { s5++; if (z === 0) { g5++; walk5[i] = 1; } }
            if (c4 === FLOOR || c4 === RAMP) { s4++; if (z === 0) { g4++; walk4[i] = 1; } }
        }
        const big = m => Math.max(0, ...components(m, size).map(q => q.length));
        const b5 = big(walk5), b4 = big(walk4);
        let startSame = true;
        const mid = size / 2;
        for (let y = mid - 36; y <= mid + 36 && startSame; y++) for (let x = mid - 36; x <= mid + 36; x++) {
            if ((x - mid) ** 2 + (y - mid) ** 2 > 36 * 36) continue;
            const i = y * size + x;
            for (let e = 0; e < E_TOP; e++) if (r.V5.get(i, e) !== r.V4.get(i, e)) { startSame = false; break; }
        }
        const good = s5 >= 0.9 * s4 && g5 >= 0.9 * g4 && b5 >= 0.85 * b4 && startSame;
        if (!good) ok = false;
        rows.push(`${r.seed}: standable ${s5}/${s4} (${(s5 / s4 * 100).toFixed(1)} %), ground ${g5}/${g4} (${(g5 / g4 * 100).toFixed(1)} %), largest ground region ${b5}/${b4} (${(b5 / b4 * 100).toFixed(1)} %), start valley untouched ${startSame}`);
    }
    check("traversable_terrain", ok, rows.join("; "));
});

//---------------------------------------------------------------- [K] cave_overburden
guard("cave_overburden", () => {
    let caves = 0, cutFloors = 0;
    const bad = [];
    for (const f of C5.caveFloors) {
        caves++;
        const z = levelOfFloor(f.F), fill = f.F - (z + 2) * 5;
        // The cell whose standing surface is this floor: level z (fill 0 stands on the S4 below).
        const r = ref(f.x, f.y, z);
        if (L.worldStrataElevationAt(r) !== f.F - 1) continue;    // another floor of the column is this cell's
        const ob = L.hasOpaqueOverburden(r), cl = L.continuousAirHeight(r);
        if (!ob || cl !== f.air) { if (bad.length < 5) bad.push(`cave (${f.x},${f.y},${z}) fill ${fill}: overburden ${ob}, clearance ${cl} (strata: ${f.air} ft of air)`); }
    }
    for (let i = 0; i < n; i++) {
        if (!C5.cut[i] || !skyOpen(V5, i)) continue;
        const T = V5.top[i], z = levelOfFloor(T), x = i % size, y = (i / size) | 0;
        if (z > 2) continue;
        const r = ref(x, y, z);
        if (L.worldStrataElevationAt(r) !== T - 1) continue;
        cutFloors++;
        const ob = L.hasOpaqueOverburden(r), cl = L.continuousAirHeight(r);
        if (ob || cl !== Infinity) { if (bad.length < 8) bad.push(`cut floor (${x},${y},${z}): overburden ${ob}, clearance ${cl}`); }
    }
    // The generated networks' chambers are roofed: at each chamber centre (away from skylights and shafts) the strata hold a
    // floor at the chamber's height with rock (or the cap) above it.
    const open = [];
    let chambers = 0, roofedChambers = 0;
    const holes = [...(F5.skylights || []), ...(F5.shafts || [])];
    for (const c of F5.caves) for (const nd of c.nodes) {
        if (nd.stub || holes.some(h => Math.hypot(h.x - nd.x, h.y - nd.y) <= 3)) continue;
        chambers++;
        const fl = floorsOf(V5, nd.y * size + nd.x).find(q => Math.abs(q.F - nd.floor) <= 1);
        if (fl && !fl.sky) roofedChambers++;
        else if (open.length < 4) open.push(`#${c.id} (${nd.x},${nd.y}) floor ${nd.floor}: ${fl ? "open to the sky" : "no floor there"}`);
    }
    check("cave_overburden", caves > 20 && cutFloors > 50 && bad.length === 0 && chambers > 10 && roofedChambers >= 0.9 * chambers,
        `seed ${SEED}: ${caves} roofed generated cave floors (hasOpaqueOverburden true and continuousAirHeight = the air run of the strata), ${cutFloors} sky-open cut floors (no overburden, Infinity); wrong ${bad.length}${bad.length ? `: ${bad.join("; ")}` : ""}; ` +
        `network chambers roofed at their centres ${roofedChambers}/${chambers} (want >= 90 %: a mouth or a cut can open a few)${open.length ? `: ${open.join("; ")}` : ""}`);
    const roofed = C5.caveFloors.find(f => !f.capped && f.roof < V5.top[f.i] + 1 && f.level === -1) || C5.caveFloors.find(f => !f.capped);
    if (roofed) ev(11, `intact physical cave roof: seed ${SEED} (${roofed.x},${roofed.y}) level ${roofed.level}: floor ${roofed.F} ft, clearance ${roofed.clear} ft, solid roof from ${roofed.roof} ft to the rock top at ${V5.top[roofed.i]} ft (${V5.top[roofed.i] - roofed.roof} ft thick), hasOpaqueOverburden ${L.hasOpaqueOverburden(ref(roofed.x, roofed.y, roofed.level))}`);
});

guard("cave_void_minimum", () => {
    const hist = {}, small = [];
    for (const r of set) for (const f of r.C.caveFloors) {
        hist[f.clear] = (hist[f.clear] || 0) + 1;
        if (f.clear < 3 && small.length < 5) small.push(`seed ${r.seed} (${f.x},${f.y}) floor ${f.F} ft: ${f.clear} ft`);
    }
    const n3 = Object.keys(hist).map(Number);
    check("cave_void_minimum", small.length === 0 && n3.length > 0,
        `roofed generated cave voids over ${set.length} seeds by height (ft): ${JSON.stringify(hist)}; under 3 ft ${small.length}${small.length ? `: ${small.join("; ")}` : ""}`);
});

//---------------------------------------------------------------- [L] roof_breach
guard("roof_breach", () => {
    // A generated cave under a thin solid roof (not capped): dig the roof up to the sky.
    const solidRun = (i, e0, e1) => { for (let e = e0; e < e1; e++) if (!V5.solid(i, e)) return false; return true; };
    const f = C5.caveFloors.filter(c => !c.capped && V5.top[c.i] > c.roof && V5.top[c.i] - c.roof <= 6 && skyOpen(V5, c.i) && solidRun(c.i, c.roof, V5.top[c.i]))
        .sort((p, q) => (V5.top[p.i] - p.roof) - (V5.top[q.i] - q.roof) || p.i - q.i)[0];
    if (!f) throw new Error(`no generated cave under a thin open-topped roof in seed ${SEED}`);
    const z = levelOfFloor(f.F), r = ref(f.x, f.y, z);
    const snap = LEVELS.map(zz => L.strataAt(ref(f.x, f.y, zz)));
    const before = { ob: L.hasOpaqueOverburden(r), cl: String(L.continuousAirHeight(r)), shape: L.shapeAt(r) };
    const top = V5.top[f.i];
    const sum = L.applyVolumeDamage(a, f.x, f.y, levelOfFloor(f.roof), f.roof % 5, f.x, f.y, levelOfFloor(top - 1), (top - 1) % 5, 99999, "dig");
    const after = { ob: L.hasOpaqueOverburden(r), cl: String(L.continuousAirHeight(r)), shape: L.shapeAt(r) };
    LEVELS.forEach((zz, k) => L.setStrata(ref(f.x, f.y, zz), { m: snap[k].bytes, hp: snap[k].hp, connector: snap[k].connector || 0 }));
    const restored = { ob: L.hasOpaqueOverburden(r), cl: String(L.continuousAirHeight(r)), records: LEVELS.filter(zz => L.strataAt(ref(f.x, f.y, zz)).changed).length };
    const solidOk = before.ob && Number.isFinite(Number(before.cl)) && !after.ob && after.cl === "Infinity" && sum.strataDestroyed === top - f.roof && restored.ob && restored.cl === before.cl && restored.records === 0;
    ev(12, `roof breach: seed ${SEED} (${f.x},${f.y}) level ${z}: roof ${f.roof}..${top - 1} ft dug (${sum.strataDestroyed} strata) -> hasOpaqueOverburden ${before.ob} -> ${after.ob}, continuousAirHeight ${before.cl} -> ${after.cl}`);
    // A +2 cave's cap breached (and saved/loaded).
    const c = C5.caveFloors.find(q => q.capped);
    let capOk = false, capDetail = "no capped +2 cave in the regression seed";
    if (c) {
        const zc = levelOfFloor(c.F), rc = ref(c.x, c.y, zc), capBefore = L.capAt(rc);
        const events = [];
        const off = envA.UF.Events.on ? (envA.UF.Events.on("levels:capBreached", e => events.push(e)), true) : false;
        const b0 = { ob: L.hasOpaqueOverburden(rc), cl: L.continuousAirHeight(rc), shape: L.shapeAt(rc) };
        const dmg = L.applyCapDamage(rc, 1e7, "blast");
        const b1 = { ob: L.hasOpaqueOverburden(rc), cl: L.continuousAirHeight(rc), shape: L.shapeAt(rc), cap: L.capAt(rc) };
        const json = saveJson(envA);
        const st2 = loadJson(envA, json);
        const b2 = { ob: L.hasOpaqueOverburden(rc), cap: L.capAt(rc), saved: !!(st2.levels["2"].caps && Object.keys(st2.levels["2"].caps).length) };
        L.setCap(rc, { material: capBefore.material, thickness: capBefore.thickness, hp: 255 });
        const b3 = { ob: L.hasOpaqueOverburden(rc), cl: L.continuousAirHeight(rc), saved: !!envA.UF.World.state.levels["2"].caps };
        capOk = !!capBefore && b0.ob && b0.cl === c.clear && dmg.breached && !b1.ob && b1.cl === Infinity && b1.cap === null && events.length === 1 && !b2.ob && b2.cap === null && b2.saved && b3.ob && b3.cl === c.clear && !b3.saved && off;
        capDetail = `+2 cave (${c.x},${c.y},${zc}) under a ${capBefore ? `${capBefore.material} cap ${capBefore.thickness} ft` : "MISSING cap"}: overburden ${b0.ob} -> breached (${dmg.breached}, levels:capBreached ${events.length}) ${b1.ob}, clearance ${b0.cl} -> ${b1.cl}; saved and loaded: overburden ${b2.ob}, cap ${b2.cap ? "present" : "gone"}, saved record ${b2.saved}; restored: overburden ${b3.ob}, clearance ${b3.cl}, record kept ${b3.saved}`;
        ev(12, `cap breach: seed ${SEED} (${c.x},${c.y}) +2: ${capDetail}`);
    }
    check("roof_breach", solidOk && capOk,
        `cave (${f.x},${f.y},${z}) under ${top - f.roof} ft of roof: before ${JSON.stringify(before)}, dug ${sum.strataDestroyed} strata (want ${top - f.roof}) -> ${JSON.stringify(after)}, restored ${JSON.stringify(restored)}; ${capDetail}`);
});

//---------------------------------------------------------------- [M] clearance_4_5_more
// A valley column of the regression world away from every feature: -2 rock, -1 rock, ground floor, sky above.
function plainValleyColumn() {
    for (let i = 0; i < n; i++) {
        const x = i % size, y = (i / size) | 0;
        if (x < 30 || y < 30 || x > size - 30 || y > size - 30 || V5.S[i] !== 0 || C5.cut[i] || V5.top[i] !== 11) continue;
        if (!LEVELS.every(z => z > 0 || [0, 1, 2, 3, 4].every(s => V5.solid(i, (z + 2) * 5 + s) || z === 0))) continue;
        if (L.shapeAt(ref(x, y, -1)) !== "solid" || L.shapeAt(ref(x, y, -2)) !== "solid") continue;
        return i;
    }
    throw new Error("no plain valley column");
}
guard("clearance_4_5_more", () => {
    const col = plainValleyColumn();
    const x = col % size, y = (col / size) | 0, snap = LEVELS.map(z => L.strataAt(ref(x, y, z)));
    const set5 = (z, m) => L.setStrata(ref(x, y, z), { m, connector: 0 });
    const S_ = "stone", A_ = "air";
    const q = z => L.continuousAirHeight(ref(x, y, z));
    const got = {};
    set5(-1, [S_, A_, A_, A_, A_]); set5(0, [S_, S_, S_, S_, S_]);            // 1 solid + 4 air under solid: 4 ft
    got.four = q(-1); got.fourShape = L.shapeAt(ref(x, y, -1));
    set5(-1, [A_, A_, A_, A_, A_]);                                          // on -2's S4, 5 air under solid: 5 ft
    got.five = q(-1);
    set5(-1, [S_, A_, A_, A_, A_]); set5(0, [A_, A_, S_, S_, S_]);            // -1 S1..S4 + ground S0..S1: 6 ft
    got.six = q(-1); got.sixRun = L.airRunAt(a, x, y, 6);
    set5(0, [A_, A_, A_, A_, A_]); set5(1, [S_, S_, S_, S_, S_]);            // up to +1's S0: 9 ft
    got.nine = q(-1);
    set5(1, [A_, A_, A_, A_, A_]);                                           // nothing above: open sky
    got.sky = q(-1);
    set5(0, [S_, S_, A_, A_, S_]);                                           // a 2 ft slot in the ground cell: 2 ft
    got.slot = q(0); got.slotShape = L.shapeAt(ref(x, y, 0));
    got.solid = q(-2);
    set5(-1, [A_, A_, A_, A_, A_]); set5(-2, [S_, S_, A_, A_, A_]); set5(0, [A_, A_, A_, A_, A_]);
    got.noFloor = q(0);                                                      // ground cell open over open -1: nothing to stand on
    LEVELS.forEach((z, k) => L.setStrata(ref(x, y, z), { m: snap[k].bytes, hp: snap[k].hp, connector: snap[k].connector || 0 }));
    got.back = LEVELS.filter(z => L.strataAt(ref(x, y, z)).changed).length;
    // Generated floors of 4, 5 and more than 5 ft.
    const byClear = { 4: null, 5: null, more: null };
    for (const f of C5.caveFloors) {
        const k = f.air === 4 ? 4 : f.air === 5 ? 5 : f.air > 5 ? "more" : null;
        if (k === null || byClear[k]) continue;
        const r = ref(f.x, f.y, levelOfFloor(f.F));
        if (L.worldStrataElevationAt(r) === f.F - 1 && L.continuousAirHeight(r) === f.air) byClear[k] = f;
    }
    // Allocation: 1,000,000 queries after a warm-up grow the heap by < 1 B each.
    const pts = C5.caveFloors.slice(0, 64).map(f => [f.x, f.y, levelOfFloor(f.F)]);
    let acc = 0;
    if (!pts.length) pts.push([x, y, 0]);
    const run = N => { for (let k = 0; k < N; k++) { const p = pts[k % pts.length]; acc += L.continuousAirHeight(a.x, a.y, p[0], p[1], p[2]) | 0; } };
    run(200000);
    global.gc();
    const h0 = v8.getHeapStatistics().used_heap_size, t0 = performance.now();
    run(1000000);
    const ns = (performance.now() - t0) * 1e6 / 1000000, grew = v8.getHeapStatistics().used_heap_size - h0;
    const synth = got.four === 4 && got.five === 5 && got.six === 6 && got.sixRun === 6 && got.nine === 9 && got.sky === Infinity && got.slot === 2 && got.solid === 0 && got.noFloor === -1 && got.back === 0;
    for (const [k, f] of Object.entries(byClear)) if (f) ev(k === "4" ? "M4" : k === "5" ? "M5" : "M>5", `clearance ${f.clear} ft: seed ${SEED} (${f.x},${f.y}) level ${f.level}${f.capped ? " (capped +2)" : ""}`);
    check("clearance_4_5_more", synth && byClear[4] && byClear[5] && byClear.more && grew < 1000000 && ns < 2000,
        `fixture column (${x},${y}): 1 solid + 4 air under solid ${got.four} ft (derived shape ${got.fourShape}: the compatibility view; the clearance is the data), 5 air on -2's S4 ${got.five}, across -1 and the ground ${got.six} (airRunAt ${got.sixRun}), up to +1 ${got.nine}, open sky ${got.sky}, a 2 ft slot ${got.slot} (shape ${got.slotShape}), solid ${got.solid}, no floor ${got.noFloor}; restored records ${got.back}; ` +
        `generated floors: 4 ft ${byClear[4] ? `(${byClear[4].x},${byClear[4].y},${byClear[4].level})` : "NONE"}, 5 ft ${byClear[5] ? `(${byClear[5].x},${byClear[5].y},${byClear[5].level})` : "NONE"}, > 5 ft ${byClear.more ? `${byClear.more.clear} ft (${byClear.more.x},${byClear.more.y},${byClear.more.level})` : "NONE"}; ` +
        `1,000,000 queries ${ns.toFixed(0)} ns each, heap growth ${grew} B (checksum ${acc})`);
});

// Clearance is continuous AIR (handoff section 8): a fluid stratum ends the run like a solid one.
guard("clearance_stops_at_fluid", () => {
    const col = plainValleyColumn();
    const x = col % size, y = (col / size) | 0, snap = LEVELS.map(z => L.strataAt(ref(x, y, z)));
    const set5 = (z, m) => { if (!L.setStrata(ref(x, y, z), { m, connector: 0 })) throw new Error(`setStrata refused: ${L.lastRefusal().reason}`); };
    const S_ = "stone", A_ = "air", W_ = "water", V_ = "lava";
    const rows = [];
    let ok = true;
    const expect = (label, z, run, want) => {
        const got = { cah: L.continuousAirHeight(ref(x, y, z)), run: L.airRunAt(a, x, y, run) };
        const good = got.cah === want.cah && got.run === want.run;
        if (!good) ok = false;
        rows.push(`${label}: continuousAirHeight ${got.cah} (want ${want.cah}), airRunAt(${run}) ${got.run} (want ${want.run})${good ? "" : " WRONG"}`);
    };
    set5(0, [S_, S_, S_, S_, S_]);
    set5(-1, [S_, W_, W_, W_, W_]);                    // S0 stone, S1..S4 water, the cell above solid: no air
    expect("-1 stone + 4 water, ground solid", -1, 6, { cah: 0, run: 0 });
    set5(-1, [S_, A_, A_, W_, W_]);                    // S0 stone, S1..S2 air, S3..S4 water: 2 ft
    expect("-1 stone + 2 air + 2 water", -1, 6, { cah: 2, run: 2 });
    set5(-1, [S_, W_, A_, A_, A_]);                    // water right on the floor: 0 ft; the air above it is its own run
    expect("-1 stone + water + 3 air (from the floor)", -1, 6, { cah: 0, run: 0 });
    expect("the same, air run from S2", -1, 7, { cah: 0, run: 3 });
    set5(-1, [S_, S_, S_, S_, S_]);
    set5(-2, [S_, V_, V_, V_, V_]);                    // -2 S0 stone, S1..S4 lava, -1 solid: no air
    expect("-2 stone + 4 lava, -1 solid", -2, 1, { cah: 0, run: 0 });
    set5(-2, [S_, A_, A_, A_, A_]);                    // the same cell dry: 4 ft of air (the control)
    expect("-2 stone + 4 air, -1 solid (control)", -2, 1, { cah: 4, run: 4 });
    LEVELS.forEach((z, k) => L.setStrata(ref(x, y, z), { m: snap[k].bytes, hp: snap[k].hp, connector: snap[k].connector || 0 }));
    const back = LEVELS.filter(z => L.strataAt(ref(x, y, z)).changed).length;
    check("clearance_stops_at_fluid", ok && back === 0, `fixture column (${x},${y}): ${rows.join("; ")}; restored records ${back}`);
});

//---------------------------------------------------------------- [N] multi_z_connectivity
guard("multi_z_connectivity", () => {
    // An air volume of the regression world flood-filled from a generated cave floor (6-way, strata): the floors it holds.
    const floodLevels = (i0, F0) => {
        const seen = new Set(), q = [F0 * n + i0], lv = new Set();
        seen.add(q[0]);
        for (let h = 0; h < q.length && h < 400000; h++) {
            const v = q[h], e = (v / n) | 0, i = v - e * n, x = i % size;
            if (e > 0 && V5.solid(i, e - 1)) lv.add(levelOfFloor(e));
            const nb = [e > 0 ? v - n : -1, e < E_TOP - 1 ? v + n : -1, x > 0 ? v - 1 : -1, x < size - 1 ? v + 1 : -1, i >= size ? v - size : -1, i < n - size ? v + size : -1];
            for (const w of nb) {
                if (w < 0 || seen.has(w)) continue;
                const ee = (w / n) | 0, ii = w - ee * n;
                if (V5.solid(ii, ee) || !skyOpenBelow(ii, ee)) continue;
                seen.add(w);
                q.push(w);
            }
        }
        return { levels: [...lv].sort((p, r) => p - r), cells: seen.size };
    };
    // Stay inside rock (roofed air): the open sky is one volume with everything.
    const skyOpenBelow = (i, e) => { for (let k = e; k < E_TOP; k++) if (V5.solid(i, k)) return true; return V5.caps.has(i); };
    const cand = F5.caves.filter(c => c.multiZ);
    let found = null;
    for (const c of cand) {
        const nd = c.nodes.find(nn => !nn.stub) || c.nodes[0];
        const i = nd.y * size + nd.x;
        const fl = floorsOf(V5, i).filter(f => !f.sky && Math.abs(f.F - nd.floor) <= 1)[0];
        if (!fl) continue;
        const r = floodLevels(i, fl.F);
        if (r.levels.length >= 2) { found = Object.assign({ c, x: nd.x, y: nd.y, F: fl.F }, r); break; }
    }
    // Natural ramps: a ramp connector on a generated slope, the derived shape a ramp.
    let ramps = 0, rampAt = null;
    for (let i = 0; i < n; i++) for (let li = 0; li < 5; li++) {
        if (V5.conn(li, i) === RAMP && V4.conn(li, i) === 0) { ramps++; if (!rampAt && L.shapeAt(ref(i % size, (i / size) | 0, li - 2)) === "ramp") rampAt = { x: i % size, y: (i / size) | 0, z: li - 2 }; }
    }
    if (found) ev(10, `multi-Z cave network: seed ${SEED} network #${found.c.id} (level ${found.c.level}${found.c.joins.length ? `, joined by a shaft to #${found.c.joins.join(",")}` : ", sloped passage"}), from (${found.x},${found.y}) floor ${found.F} ft one air volume of ${found.cells} strata holding floors on levels [${found.levels}]`);
    check("multi_z_connectivity", !!found && !!rampAt,
        `${cand.length} networks flagged multi-Z in seed ${SEED}; ${found ? `#${found.c.id} from (${found.x},${found.y}) floor ${found.F} ft: ${found.cells} air strata (roofed), floors on levels [${found.levels}]` : "NONE whose air volume holds floors on two levels"}; ` +
        `natural ramp connectors added ${ramps}${rampAt ? `, e.g. (${rampAt.x},${rampAt.y},${rampAt.z}) derived ${L.shapeAt(ref(rampAt.x, rampAt.y, rampAt.z))}` : ", NONE derived as a ramp"}`);
});

guard("shafts_keep_fluid", () => {
    const anchor = "        for (const sh of out.shafts) {\n";
    const plant = `        // TEST INSTRUMENTATION (tools/test_strata_cuts_and_caves.js, shafts_keep_fluid): water planted in the paths.
        out.planted = [];
        for (const sh of out.shafts) disc(sh.x, sh.y, sh.r, i => {
            const hi = Math.min(sh.to, top[i] - CV.roofMin), e = hi - 1;
            if (e < sh.from || SOLID_B[getE(i, e)] !== 1) return;
            const solid = [];   // the rock under the water, in columns the shaft carve visits (its own gate)
            if (!((lock[i] & NO_CAVE) || wt[i] < 1)) for (let k = sh.from; k < e; k++) if (SOLID_B[getE(i, k)] === 1) solid.push(k);
            setE(i, e, M_WATER);
            out.planted.push({ kind: "shaft", x: i % size, y: (i / size) | 0, e, solid });
        });
        for (const net of networks) {
            if (!net.skylight) continue;
            const nd = net.skylight.node;
            let ok = true;
            disc(nd.x, nd.y, 1.2, i => {
                if ((lock[i] & (NO_CUT | NO_CAVE)) || wt[i] < 1 || minTop[i] > nd.F || top[i] - (nd.F + nd.h) > CV.skylightMax || nearWater(i)) ok = false;
            });
            if (!ok) continue;
            disc(nd.x, nd.y, 1.2, i => {
                const e = top[i] - 1, from = nd.F + nd.h;
                if (e <= from || SOLID_B[getE(i, e)] !== 1) return;
                const solid = [];
                for (let k = from; k < e; k++) if (SOLID_B[getE(i, k)] === 1) solid.push(k);
                setE(i, e, M_WATER);
                out.planted.push({ kind: "skylight", x: i % size, y: (i / size) | 0, e, solid });
            });
        }
`;
    const inst = Object.assign({}, src);
    if (!inst["DEUS_Levels.js"].includes(anchor)) harnessProblem("shafts_keep_fluid: the shaft loop to instrument is missing");
    inst["DEUS_Levels.js"] = inst["DEUS_Levels.js"].replace(anchor, plant + anchor);
    // Test on SEED and SEED2 (seed 3 naturally has eligible skylights with 5-6 strata of rock overburden as well as vertical shafts).
    const seedsToTest = [SEED, SEED2];
    const bad = [];
    let totalShafts = 0, totalSkylights = 0, totalRock = 0, totalWithRock = 0, totalShaftWithRock = 0, carved = 0;
    const rock = { shaft: 0, skylight: 0 };
    const summaries = [];
    for (const s of seedsToTest) {
        const envI = setup(inst, `inst-${s}`);
        newWorld(envI, s);
        const VI = volume(envI), stI = envI.UF.World.state, FI = envI.UF.Levels.naturalFeatures(stI.startArea.x, stI.startArea.y);
        const planted = FI.planted || [];
        let sShafts = 0, sSkylights = 0, sWithRock = 0, sShaftWithRock = 0;
        for (const p of planted) {
            const i = p.y * size + p.x;
            if (p.kind === "shaft") sShafts++; else sSkylights++;
            if (VI.get(i, p.e) !== 4 && bad.length < 5) bad.push(`${p.kind} (${p.x},${p.y}) planted water at ${p.e} ft is now ${VI.get(i, p.e)}`);
            for (const k of p.solid) {
                totalRock++; rock[p.kind]++;
                if (!VI.solid(i, k)) { carved++; if (bad.length < 8) bad.push(`${p.kind} (${p.x},${p.y}) rock at ${k} ft carved below the water`); }
            }
        }
        sWithRock = planted.filter(p => p.kind === "skylight" && p.solid.length).length;
        sShaftWithRock = planted.filter(p => p.kind === "shaft" && p.solid.length).length;
        totalShafts += sShafts; totalSkylights += sSkylights; totalWithRock += sWithRock; totalShaftWithRock += sShaftWithRock;
        summaries.push(`seed ${s}: ${sShafts} shafts (${sShaftWithRock} with rock under water), ${sSkylights} skylights (${sWithRock} with rock under water)`);
        envErrors.push(...envI.__errors);
    }
    // Both halves need a fixture: rock under planted water in a shaft column and in a skylight column.
    check("shafts_keep_fluid", totalShafts > 0 && totalShaftWithRock > 0 && totalWithRock > 0 && bad.length === 0,
        `${summaries.join("; ")}; total rock strata under water: ${totalRock} (shafts ${rock.shaft}, skylights ${rock.skylight}), carved ${carved}; ` +
        `after the carve: ${bad.length ? bad.join("; ") : "every planted water stratum still water, no rock under it carved"}`);
});

//---------------------------------------------------------------- [O] no_floating_mass
guard("no_floating_mass", () => {
    const rows = [];
    let total = 0;
    for (const r of set) {
        const f5 = floatingStrata(r.V5), f4 = floatingStrata(r.V4);
        total += f5.length;
        rows.push(`${r.seed}: generator 5 ${f5.length}${f5.length ? ` (e.g. ${JSON.stringify(f5.slice(0, 3))})` : ""}, generator 4 ${f4.length}`);
        if (f4.length) total += 1e6;   // the natural base must be anchored too
    }
    const removed = F5.floatingRemoved;
    check("no_floating_mass", total === 0, `solid strata not connected to bedrock or the area edge: ${rows.join("; ")}; the generator removed ${removed} unconnected strata in seed ${SEED}`);
});

//---------------------------------------------------------------- protections
guard("protections", () => {
    const bad = [];
    const same = (r, i, e0, e1) => { for (let e = e0; e < e1; e++) if (r.V5.get(i, e) !== r.V4.get(i, e)) return false; return true; };
    let pockets = 0, mouths = 0, edge = 0, water = 0, checkedWater = 0;
    for (const r of set) {
        const b4 = r.V4.bs;
        for (const li of [0, 1]) for (const p of b4[li].pockets || []) {
            pockets++;
            const cells = [];
            for (let dy = -p.clearRadius; dy <= p.clearRadius; dy++) for (let dx = -p.clearRadius; dx <= p.clearRadius; dx++) cells.push((p.y + dy) * size + p.x + dx);
            for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) cells.push((p.water.y + dy) * size + p.water.x + dx);
            const e0 = li * 5, e1 = (li + 1) * 5 + 1;    // the pocket's level and the next level's S0 (its roof)
            for (const i of cells) if (!same(r, i, e0, e1)) { if (bad.length < 4) bad.push(`seed ${r.seed} pocket ${li - 2}#${p.id} cell (${i % size},${(i / size) | 0}) changed (strata ${e0}..${e1 - 1})`); break; }
        }
        for (const m of b4[1].cliffCaves || []) {
            mouths++;
            const cells = [m.terminus.y * size + m.terminus.x, ...(m.corridor || [])];
            for (const c of m.tunnel || []) cells.push(c.y * size + c.x);
            for (const i of cells) if (!same(r, i, 0, E_TOP)) { if (bad.length < 6) bad.push(`seed ${r.seed} cliff mouth (${m.x},${m.y}) cell (${i % size},${(i / size) | 0}) changed`); break; }
        }
        for (let i = 0; i < n; i++) {
            const x = i % size, y = (i / size) | 0;
            if (Math.min(x, y, size - 1 - x, size - 1 - y) < 12 && !same(r, i, 0, E_TOP)) { edge++; if (bad.length < 8) bad.push(`seed ${r.seed} edge cell (${x},${y}) changed`); }
        }
        // No cut within 2 cells of surface water (the valley floor's water, as the world's own WorldGen reports it).
        const G = (r.env || envA).UF.WorldGen;
        for (let i = 0; i < n; i++) {
            if (!r.C.cut[i]) continue;
            const x = i % size, y = (i / size) | 0;
            for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
                const xx = x + dx, yy = y + dy;
                if (xx < 0 || yy < 0 || xx >= size || yy >= size || r.V5.S[yy * size + xx] !== 0) continue;
                checkedWater++;
                if (G.isWaterAt(a.x * size + xx, a.y * size + yy)) { water++; if (bad.length < 10) bad.push(`seed ${r.seed} cut (${x},${y}) next to water at (${xx},${yy})`); }
            }
        }
    }
    check("protections", bad.length === 0 && pockets > 0 && mouths > 0,
        `${set.length} seeds: ${pockets} underground founding squares and pools with their roofs, ${mouths} cliff cave mouths with their corridors, the 12-cell area edge (${edge} changed), ${checkedWater} valley cells within 2 of a cut checked for surface water (${water} wet)${bad.length ? `: ${bad.join("; ")}` : ""}`);
});

//---------------------------------------------------------------- ground_holes
guard("ground_holes", () => {
    const T = envA.UF.Tiles, G = envA.UF.WorldGen;
    const map = W.peekArea(a.x, a.y, 0);
    const peak = T.groundBase("peak_rock");
    let holes = 0;
    const bad = [];
    for (let i = 0; i < n; i++) {
        const x = i % size, y = (i / size) | 0;
        if (L.shapeCodeAt(a.x, a.y, x, y, 0) !== OPEN) continue;
        holes++;
        const l0 = map.data[i], l2 = map.data[2 * n + i], region = map.data[5 * n + i];
        const good = l0 >= peak && l0 < peak + 48 && l2 >= peak && l2 < peak + 48 && region === 250 && !W.walkable(a.x, a.y, x, y, { z: 0 })
            && !G.cellInfo(a.x * size + x, a.y * size + y).walkable && !(map.ufObjects && map.ufObjects[i]);
        if (!good && bad.length < 4) bad.push(`(${x},${y}) tiles ${l0}/${l2} region ${region} walkable ${W.walkable(a.x, a.y, x, y, { z: 0 })} cellInfo ${G.cellInfo(a.x * size + x, a.y * size + y).walkable} object ${map.ufObjects ? map.ufObjects[i] : "-"}`);
    }
    // No plant or kit object on a cut cell at +1 or +2 either (their builds).
    let upper = 0;
    for (const z of [1, 2]) {
        const m = W.peekArea(a.x, a.y, z);
        for (let i = 0; i < n; i++) if (C5.cut[i] && m.ufObjects && m.ufObjects[i] && L.shapeCodeAt(a.x, a.y, i % size, (i / size) | 0, z) !== FLOOR) { upper++; if (bad.length < 6) bad.push(`object on cut cell (${i % size},${(i / size) | 0},${z})`); }
    }
    const vs = G.volumeStats[`${a.x},${a.y}`] || {};
    check("ground_holes", holes > 20 && bad.length === 0 && vs.open === holes,
        `seed ${SEED}: ${holes} open ground cells (natural cuts): rock face on layers 0 and 2, region 250, not walkable, cellInfo not walkable, no object; objects on unstandable cut cells at +1/+2 ${upper}; volumeStats.open ${vs.open}${bad.length ? `; wrong: ${bad.join("; ")}` : ""}`);
});

//---------------------------------------------------------------- save_load
guard("save_load", () => {
    const st = W.state;
    const f = C5.caveFloors.find(c => !c.capped && c.level === -1 && c.F % 5 !== 0) || C5.caveFloors.find(c => c.F % 5 !== 0);
    const r = ref(f.x, f.y, levelOfFloor(f.F));
    const dug = L.applyStrataDamage(r.area, r.x, r.y, r.z, (f.F - 1) % 5, 99999, "dig");
    const before = L.strataAt(r);
    const json = saveJson(envA);
    const size0 = json.length;
    const st2 = loadJson(envA, json);
    const verify = L.verifyLevels(st2), after = L.strataAt(r);
    const fresh = setup(src, "fresh-load");
    newWorld(fresh, SEED + 1000);
    const st3 = loadJson(fresh, json);
    const freshSame = LEVELS.every(z => fresh.UF.Levels.checksum(z) === st3.levels[String(z)].checksum) && JSON.stringify(fresh.UF.Levels.strataAt(r)) === JSON.stringify(before);
    check("save_load", dug.ok && dug.destroyed && verify.length === 0 && JSON.stringify(after) === JSON.stringify(before) && freshSame && st2.levels["0"].gen === 5,
        `generator-5 world saved (${size0} chars of world state) and loaded: checksums verified (${verify.length} mismatches), the dug cave floor (${r.x},${r.y},${r.z}) kept [${after.materials}] (changed ${after.changed}); ` +
        `loaded into a fresh vm that had another world: its checksums regenerate and the dig is there ${freshSame}`);
});

//---------------------------------------------------------------- no_parallel_authority
guard("no_parallel_authority", () => {
    const known = new Set(["strata", "conn", "biome", "surface", "shape", "material", "water", "caps", "features", "pockets", "cliffCaves", "z", "size", "hasWater", "legacyGround"]);
    const extra = [];
    for (const b of V5.bs) for (const k of Object.keys(b)) {
        const v = b[k];
        const grid = v && ((ArrayBuffer.isView(v) && v.length >= n) || (Object.prototype.toString.call(v) === "[object Map]" && k !== "caps" && v.size > 1000));
        if (grid && !known.has(k)) extra.push(`${b.z}.${k}`);
        if (!known.has(k)) extra.push(`${b.z}.${k} (unknown member)`);
    }
    const featureJson = JSON.stringify(F5).length;
    check("no_parallel_authority", extra.length === 0 && featureJson < 200000,
        `baseline members beyond strata, connectors, biome, surface, caps, legacy views and descriptors: ${extra.length ? extra.join(", ") : "none"}; feature descriptors ${featureJson} chars (no per-cell grid)`);
});

//---------------------------------------------------------------- cost
guard("cost", () => {
    const s5 = L.stats(), m5 = L.strataMemory(a.x, a.y), m4 = env4.UF.Levels.strataMemory(a.x, a.y);
    const own = m => m.strata + m.connectors + m.biome + m.surface + (m.caps || 0);
    const save5 = saveJson(envA).length, save4 = saveJson(env4).length;
    const tFeat = s5.featureMs;
    check("cost", tFeat < 3000 && own(m5) - own(m4) < 256 * 1024,
        `seed ${SEED}: newWorld generator 5 ${tNew5.toFixed(0)} ms vs generator 4 ${tNew4.toFixed(0)} ms (same code) vs pre-19B ${tNewH.toFixed(0)} ms; natural features ${tFeat.toFixed(0)} ms (bound 3000); ` +
        `seed set newWorld ${set.slice(1).map(r => `${r.seed}: ${r.t5.toFixed(0)}/${r.t4.toFixed(0)} ms`).join(", ")}; ` +
        `baselines' own memory per area (strata, connectors, biome, surface, caps) ${own(m5)} B vs ${own(m4)} B (caps ${m5.capEntries} entries, ~${m5.caps} B; bound +256 KiB), with the cached shape grids and built legacy views ${m5.total} B vs ${m4.total} B; fresh save ${save5} vs ${save4} chars of world state`);
});

async function finish() {
    for (const [key, p] of Object.entries(suites)) {
        const r = await p;
        const tail = (r.text.match(/(RESULT:.*|MUTANT VERIFICATION:.*|PASSED: \d+|FAILED: \d+)/g) || []).join("; ");
        check(key, r.code === 0, `node ${r.file}: exit ${r.code} in ${r.s.toFixed(0)} s; ${tail}`);
    }
    const unexpected = [envA, envB, env4, ...set.slice(1).map(r => r.env)].flatMap(e => e ? e.__errors : []).concat(envErrors);
    check("no_errors", unexpected.length === 0, unexpected.length ? unexpected.slice(0, 3).join(" | ") : "none");
    if (!quiet) {
        console.log("EVIDENCE (generated worlds; x,y in the start area; levels -2..+2; heights in ft = strata):");
        for (const e of evidence) console.log(`  ${e}`);
    }
    console.log(`TIME ${((performance.now() - T0) / 1000).toFixed(1)} s`);
    console.log(`RESULT: ${passed} passed, ${failed} failed (exit ${failed ? 1 : 0})${failed ? ` - ${failures.join(", ")}` : ""}`);
    process.exit(failed ? 1 : 0);
}
finish();
