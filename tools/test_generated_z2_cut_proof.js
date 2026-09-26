#!/usr/bin/env node
"use strict";

/**
 * tools/test_generated_z2_cut_proof.js
 *
 * WG.00.08 targeted proof (Directive 001-I section B): World Seed 18 generates a natural ravine that reaches Z-2 at
 * (194, 89), and its carve keeps the Owner's fluid ruling (docs/OWNER_DECISIONS.md DEC-001, 2026-09-25: fluid may sit
 * above a void only with >= 1 solid stratum between; fluid directly on air is a defect; fluid on fluid is normal).
 *
 * Runs the real plugins (DEUS_World, DEUS_WorldGen, DEUS_Tiles, DEUS_Objects, DEUS_Levels, DEUS_Floors) in Node vms with
 * RMMZ stubs, three times on seed 18 (generator 5):
 *   natural   the sources as they are: the target column, the ravine's descriptor, fluid support, floating solids, the map
 *   probed    the same sources plus three read-only probe calls in carveNaturalFeatures (before any feature, before the
 *             cut carve, after it) that copy the strata and the cut plan (cutTop, ownerCut, top). Its final strata and
 *             descriptors must equal the natural run's, so what it shows holds for the natural world.
 *   fixture   the probed sources; at the probe before the cut carve, water is planted on the rock top of up to 6 ravine
 *             columns the cut is about to carve. The generator keeps water away from cuts, so seed 18 never reaches the
 *             carve's fluid skip on its own.
 * Probes, fixture and mutants are in-memory source edits; nothing under game/ is written except the map PNG.
 *
 * Checks (each prints PASS or FAIL; every one is shown failing by a mutant below):
 *   first_air_is_3ft               (194, 89): the lowest non-solid stratum is at 3 ft (Z-2 S3)
 *   z_minus2_is_floor              Z-2 floor, HEIGHT_3_OF_5
 *   z_minus1_is_open               Z-1 open, HEIGHT_0_OF_5
 *   z0_is_open                     Z0 open, HEIGHT_0_OF_5
 *   z_plus1_z_plus2_open           Z+1 and Z+2 open
 *   ravine_identity                exactly one cut descriptor has (194, 89) as its deepest cell, and it is kind cut, type
 *                                  ravine, depthClass z2, floorLevel -2, minFloor = the column's first air, form line and
 *                                  profile u, a family with a ravine weight, cells > 0, id = its index (every descriptor's
 *                                  id = its index); the probed run's cut plan gives (194, 89) to the same id
 *   ravine_footprint_matches_plan  whole footprint: every column the plan gives the ravine is air from its planned floor to
 *                                  its rock top and unchanged below, or wholly unchanged if a fluid lies in that interval;
 *                                  no column outside every cut's plan changed; carved columns = the descriptor's cells
 *                                  (probed and fixture runs; the fixture's planted columns must all be kept)
 *   fluid_rests_on_support         DEC-001: no fluid stratum at e with air at e - 1 (whole area, natural and fixture runs);
 *                                  fluid on solid with a void lower down, and fluid on fluid, pass
 *   fluid_conserved_across_cut     every fluid stratum before the cut carve is the same fluid after generation and none is
 *                                  added (whole area; probed run from before any feature too; fixture run with its water)
 *   no_floating_solids             every solid stratum with air or fluid right under it is grounded: joined through solid
 *                                  strata (up, down, sideways) to bedrock (e = 0) or the area edge, the generator's own rule
 *                                  (whole area, natural run)
 *   probe_read_only                the probed run's final strata and descriptors equal the natural run's
 *   no_vm_errors                   no console.error in any run
 *
 * Mutants (--mutant=<name>; --mutants runs all, each must exit 1 with its designated check among the failures):
 *   cut_carve_disabled    -> ravine_footprint_matches_plan   the cut carve loop skips every column
 *   floor_capped_zminus1  -> z_minus2_is_floor               the carve's floor is clamped to Z-1 S0 (e >= 5)
 *   fluid_skip_removed    -> fluid_conserved_across_cut      the carve no longer skips a column holding a fluid
 *   cut_type_renamed      -> ravine_identity                 the descriptor reports type canyon, class deep
 *   floating_slab_left    -> no_floating_solids              a 1 ft stone slab left hanging in the z2 cut's air
 *   pool_undercut         -> fluid_rests_on_support          a column holding a fluid gets the rock under the fluid carved
 *   probe_perturbs        -> probe_read_only                 (harness) the probe writes one stratum
 *   error_injected        -> no_vm_errors                    carveNaturalFeatures logs a console.error
 *
 * The map (game/test_output/z2_cut_proof_seed18_194_89.png, 512 x 512, PASS stamped top left) is written only when every
 * check passes. A failing run without a mutant deletes a stale copy. Mutant runs never touch it.
 *
 * Usage: node tools/test_generated_z2_cut_proof.js [--mutant=<name>] [--mutants] [--quiet]
 * Exit: 0 all passed, 1 a check failed (with --mutants: a mutant not caught), 2 harness problem.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");
const { spawn } = require("child_process");
const { performance } = require("perf_hooks");

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const OUT_DIR = path.join(ROOT, "game", "test_output");
const PNG_PATH = path.join(OUT_DIR, "z2_cut_proof_seed18_194_89.png");
const arg = (name, fallback) => {
    const a = process.argv.find(x => x.startsWith(`--${name}=`));
    return a ? a.slice(name.length + 3) : fallback;
};
const mutant = arg("mutant", "");
const quiet = process.argv.includes("--quiet");

const SEED = 18, TX = 194, TY = 89;
const LEVELS = [-2, -1, 0, 1, 2], STRATA = 5, E_TOP = 25;
const NEAR = 30;                 // the 61 x 61 cells round (194, 89) the fluid audit reports on
const FIXTURE_COLUMNS = 6;
const M_STONE = 1, M_WATER = 4;
const FAMILIES_WITH_RAVINE = ["TEMP", "WET", "ARID", "HIGH"];   // DEUS_Levels FEATURE_PARAMS cuts.families with a ravine weight
// Material bytes as DEUS_Levels reads them (SOLID_B, FLUID_B): id in the low 6 bits, 0x40 no material, 0x80 built.
const isSolidB = v => (v & 0x40) === 0 && (v & 0x3f) >= 1 && (v & 0x3f) <= 3;
const isFluidB = v => (v & 0xc0) === 0 && ((v & 0x3f) === 4 || (v & 0x3f) === 5);

//-----------------------------------------------------------------------------
// Mutants and probes: exact source edits applied in memory. Each target must occur exactly once (else exit 2).

const L_ = "DEUS_Levels.js";
const CARVE_HEAD = "            const F = cutTop[i];\n            if (F === 255 || F >= top[i]) continue;";
const FLUID_SKIP = "            if (fluid) continue;\n";
const DESCRIPTORS = "        // Descriptors: the floor levels each cave reaches (from the strata).";
const MUTANTS = {
    cut_carve_disabled: { check: "ravine_footprint_matches_plan", edits: [[L_, CARVE_HEAD,
        "            const F = cutTop[i];\n            if (F === 255 || F >= top[i] || true) continue; /* MUTANT: cut carving skipped */"]] },
    floor_capped_zminus1: { check: "z_minus2_is_floor", edits: [[L_, CARVE_HEAD,
        "            const F = cutTop[i] === 255 ? 255 : Math.max(cutTop[i], STRATA); /* MUTANT: the floor stops at Z-1 S0 */\n            if (F === 255 || F >= top[i]) continue;"]] },
    fluid_skip_removed: { check: "fluid_conserved_across_cut", edits: [[L_, FLUID_SKIP, "            /* MUTANT: fluid skip removed */\n"]] },
    cut_type_renamed: { check: "ravine_identity", edits: [[L_, "kind: \"cut\", type, family, depthClass: cls.key,",
        "kind: \"cut\", type: type === \"ravine\" ? \"canyon\" : type, family, depthClass: cls.key === \"z2\" ? \"deep\" : cls.key, /* MUTANT */"]] },
    floating_slab_left: { check: "no_floating_solids", edits: [[L_, DESCRIPTORS,
        "        { /* MUTANT: a 1 ft stone slab left hanging in the z2 cut's air, after the floating-mass removal */\n" +
        "            const f = out.cuts.find(c => c.depthClass === \"z2\" && c.deepest), d = f ? f.deepest.y * size + f.deepest.x : -1;\n" +
        "            const air = (i, e) => e >= 0 && e < E_TOP && !solidE(i, e);\n" +
        "            slab: for (let i = size; f && i < n - size; i++) {\n" +
        "                if (ownerCut[i] !== f.id || !(touched[i] & 1) || i === d || i % size === 0 || i % size === size - 1) continue;\n" +
        "                for (let e = cutTop[i] + 1; e < E_TOP - 1; e++) {\n" +
        "                    if (air(i, e) && air(i, e - 1) && air(i, e + 1) && air(i - 1, e) && air(i + 1, e) && air(i - size, e) && air(i + size, e)) { setE(i, e, M_STONE); break slab; }\n" +
        "                }\n" +
        "            }\n" +
        "        }\n" + DESCRIPTORS]] },
    pool_undercut: { check: "fluid_rests_on_support", edits: [[L_, FLUID_SKIP,
        "            if (fluid) { for (let e = F; e < top[i] && FLUID_B[getE(i, e)] !== 1; e++) setE(i, e, M_AIR); continue; } /* MUTANT: the rock under the fluid carved */\n"]] },
    probe_perturbs: { check: "probe_read_only", edits: [], probePerturbs: true },
    error_injected: { check: "no_vm_errors", edits: [[L_, "    function carveNaturalFeatures(seed, gen, ax, ay, size, bs) {\n",
        "    function carveNaturalFeatures(seed, gen, ax, ay, size, bs) {\n        console.error(\"MUTANT error_injected\");\n"]] }
};
const probeCall = (stage, extra) => `        if (window.__z2Probe) window.__z2Probe("${stage}", { ax, ay, size, n, M${extra} });\n`;
const PROBES = [
    [L_, "        const top = new Uint8Array(n);      // first air above", probeCall("preFeatures", "") + "        const top = new Uint8Array(n);      // first air above"],
    [L_, "        // Carve: every stratum from the cut's floor to the rock's top becomes air",
        probeCall("preCut", ", top, cutTop, ownerCut") + "        // Carve: every stratum from the cut's floor to the rock's top becomes air"],
    [L_, "        //---------------------------------------------------------------- ramps where a carved slope",
        probeCall("postCut", "") + "        //---------------------------------------------------------------- ramps where a carved slope"]
];

//-----------------------------------------------------------------------------
// --mutants: every mutant in its own process (4 at a time).

if (process.argv.includes("--mutants")) {
    const names = Object.keys(MUTANTS), results = {};
    let next = 0, running = 0;
    const t0 = Date.now();
    const launch = () => {
        while (running < 4 && next < names.length) {
            const name = names[next++];
            running++;
            const child = spawn(process.execPath, [__filename, `--mutant=${name}`, "--quiet"], { stdio: ["ignore", "pipe", "pipe"] });
            let text = "";
            child.stdout.on("data", d => { text += d; });
            child.stderr.on("data", d => { text += d; });
            child.on("close", code => {
                const fails = (text.match(/^FAIL (\S+)/gm) || []).map(s => s.slice(5));
                const want = MUTANTS[name].check, hit = fails.includes(want);
                results[name] = code === 1 && hit;
                const harness = /^HARNESS .*/m.test(text) ? `: ${text.match(/^HARNESS .*/m)[0].slice(0, 200)}` : "";
                console.log(`MUTANT ${name}: exit ${code}${code !== 1 ? ` (want 1)${harness}` : ""}; designated ${want} ${hit ? "FAILED" : "did not fail (not caught)"}; failed: ${fails.join(", ") || "-"}`);
                running--;
                if (next < names.length) launch();
                else if (!running) {
                    const caught = names.filter(n => results[n]).length;
                    console.log(`MUTANTS: ${caught}/${names.length} caught by their designated check (exit 1) (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
                    process.exit(caught === names.length ? 0 : 1);
                }
            });
        }
    };
    launch();
    return;
}

//-----------------------------------------------------------------------------
// Harness

const results = [];
function harnessProblem(msg) {
    console.log(`HARNESS ${msg}`);
    console.log(`RESULT: ${results.filter(r => r.ok).length} passed, ${results.filter(r => !r.ok).length} failed (exit 2)`);
    process.exit(2);
}
process.on("uncaughtException", e => harnessProblem(`uncaught: ${e && e.stack ? e.stack.split("\n").slice(0, 4).join(" | ") : e}`));
if (mutant && !MUTANTS[mutant]) harnessProblem(`unknown mutant "${mutant}"; known: ${Object.keys(MUTANTS).join(", ")}`);

// A named check: fn asserts (node:assert) and returns the detail line. An assertion or any error is a FAIL.
function check(name, fn) {
    let ok = false, detail = "";
    try {
        detail = fn() || "";
        ok = true;
    } catch (e) {
        detail = e instanceof assert.AssertionError ? e.message : `threw ${e && e.stack ? e.stack.split("\n").slice(0, 3).join(" | ") : e}`;
    }
    results.push({ name, ok });
    console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " - " + detail : ""}`);
}
const fmt = v => JSON.stringify(v);
const eq = (actual, expected, what) => assert.strictEqual(actual, expected, `${what}: ${fmt(actual)}, expected ${fmt(expected)}`);
const say = (...a) => { if (!quiet) console.log(...a); };

function sourcesWith(base, edits, label) {
    const s = Object.assign({}, base);
    for (const [file, find, replace] of edits) {
        const at = s[file].indexOf(find);
        if (at < 0 || s[file].indexOf(find, at + 1) >= 0) harnessProblem(`${label}: target ${at < 0 ? "not found" : "not unique"} in ${file}: ${find.slice(0, 90)}`);
        s[file] = s[file].slice(0, at) + replace + s[file].slice(at + find.length);
    }
    return s;
}

// Minimal pure-Node PNG encoder using zlib
function encodePNG(width, height, rgbaBuffer) {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    // CRC32 table
    const crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        crcTable[n] = c;
    }
    function crc32(buf) {
        let c = 0xffffffff;
        for (let i = 0; i < buf.length; i++) {
            c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
        }
        return (c ^ 0xffffffff) >>> 0;
    }

    function createChunk(type, data) {
        const typeBuf = Buffer.from(type, "ascii");
        const lenBuf = Buffer.alloc(4);
        lenBuf.writeUInt32BE(data.length, 0);
        const crcBuf = Buffer.alloc(4);
        const crcVal = crc32(Buffer.concat([typeBuf, data]));
        crcBuf.writeUInt32BE(crcVal, 0);
        return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
    }

    // IHDR
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // 8 bits per channel
    ihdr[9] = 6; // RGBA
    ihdr[10] = 0; // Deflate
    ihdr[11] = 0; // Filter
    ihdr[12] = 0; // Interlace
    const ihdrChunk = createChunk("IHDR", ihdr);

    // IDAT: uncompressed scanlines with filter byte 0
    const rawScanlines = Buffer.alloc(height * (1 + width * 4));
    let rawOffset = 0;
    for (let y = 0; y < height; y++) {
        rawScanlines[rawOffset++] = 0; // Filter: None
        const srcOffset = y * width * 4;
        rgbaBuffer.copy(rawScanlines, rawOffset, srcOffset, srcOffset + width * 4);
        rawOffset += width * 4;
    }
    const compressedData = zlib.deflateSync(rawScanlines, { level: 9 });
    const idatChunk = createChunk("IDAT", compressedData);

    // IEND
    const iendChunk = createChunk("IEND", Buffer.alloc(0));

    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// VM setup matching test_strata_cuts_and_caves.js; the plugin sources come from `sources`, probe is window.__z2Probe.
function setupVM(sources, tag, probe) {
    const list = {};
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, "game/js/plugins.js"), "utf8"), list);
    const ns = {}, warnings = [], errors = [];
    const canvasCtx = () => ({
        imageSmoothingEnabled: false,
        createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
        putImageData() {}, drawImage() {}, fillRect() {}, clearRect() {},
        getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })
    });
    const env = {
        window: null, UF: ns, DEUS: ns, Math, performance, setTimeout, clearTimeout,
        console: {
            log: (...a) => { if (!quiet) console.log(`  [VM ${tag}]`, ...a); },
            warn: (...a) => warnings.push(a.map(String).join(" ")),
            error: (...a) => errors.push(a.map(x => (x && x.stack) || String(x)).join(" "))
        },
        document: { createElement: () => ({ width: 0, height: 0, getContext: canvasCtx }) },
        PluginManager: {
            parameters: name => (list.$plugins && list.$plugins.find(p => p.name === name) || {}).parameters || {},
            registerCommand() {}
        },
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
    if (probe) env.__z2Probe = probe;
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

    const section = (src, a, b) => {
        const i = src.indexOf(a), j = src.indexOf(b, i + a.length);
        if (i < 0 || j <= i) throw new Error(`engine source section missing: ${a}`);
        return src.slice(i, j);
    };
    const core = fs.readFileSync(path.join(ROOT, "game/js/rmmz_core.js"), "utf8");
    const mgr = fs.readFileSync(path.join(ROOT, "game/js/rmmz_managers.js"), "utf8");
    const deus = fs.readFileSync(path.join(PLUGINS, "DEUS_Core.js"), "utf8");
    const ctx = vm.createContext(env);
    vm.runInContext(section(mgr, "DataManager.makeSaveContents =", "DataManager.correctDataErrors ="), ctx, { filename: "rmmz_managers.js" });
    vm.runInContext(section(core, "function JsonEx()", "//-----------------------------------------------------------------------------"), ctx, { filename: "rmmz_core.js JsonEx" });
    vm.runInContext(section(core, "Tilemap.TILE_ID_B =", "Tilemap.Layer ="), ctx, { filename: "rmmz_core.js Tilemap constants" });
    vm.runInContext(section(deus, "window.DEUS = window.DEUS || {};", "//-----------------------------------------------------------------------------"), ctx, { filename: "DEUS_Core.js events" });
    for (const f of FILES) vm.runInContext(sources[f], ctx, { filename: f });
    env.DataManager.onLoad(env.$dataTilesets);
    new env.Scene_Boot().start();
    return { env, errors, warnings };
}

const FILES = ["DEUS_World.js", "DEUS_WorldGen.js", "DEUS_Tiles.js", "DEUS_Objects.js", "DEUS_Levels.js", "DEUS_Floors.js"];

// One New Game world of seed 18 in its own vm; M = the start area's five baselines' strata (z = -2..2).
function generate(tag, sources, probe) {
    const t0 = performance.now();
    const { env, errors, warnings } = setupVM(sources, tag, probe);
    env.UF.NewGameSetup = { seed: SEED, year: 1, levelsGen: 5 };
    env.UF.World.newWorld(SEED);
    const st = env.UF.World.state, a = { x: st.startArea.x, y: st.startArea.y }, L = env.UF.Levels;
    const M = LEVELS.map(z => L.baseline(z, a.x, a.y).strata.m);
    const ms = performance.now() - t0;
    say(`World seed ${SEED} generated in the ${tag} vm in ${ms.toFixed(0)} ms.`);
    return { tag, env, L, size: st.size, a, M, errors, warnings, ms };
}

// The probe: copies of the strata at each stage and of the cut plan before the carve, per area. The fixture plants water
// before copying; probe_perturbs writes one stratum (cell 0, e = 24: an area-edge column, so it stays grounded).
function makeProbe(opts) {
    const rec = {};
    const fn = (stage, d) => {
        const r = rec[`${d.ax},${d.ay}`] = rec[`${d.ax},${d.ay}`] || { size: d.size, n: d.n };
        if (stage === "preCut") {
            if (opts.plant) r.planted = plantFixture(d);
            if (opts.perturb) d.M[4][4] = d.M[4][4] ? 0 : M_STONE;
            r.top = Uint8Array.from(d.top);
            r.cutTop = Uint8Array.from(d.cutTop);
            r.ownerCut = Int32Array.from(d.ownerCut);
        }
        r[stage] = d.M.map(m => Uint8Array.from(m));
    };
    return { rec, fn };
}

// Water on the rock top (e = top - 1, rock at top - 2 still inside the carve interval) of up to FIXTURE_COLUMNS columns
// the plan gives the ravine owning (194, 89), spread along it; never (194, 89) itself.
function plantFixture(d) {
    const { M, size, n, top, cutTop, ownerCut } = d, ti = TY * size + TX, rid = ownerCut[ti];
    const get = (i, e) => M[(e / STRATA) | 0][i * STRATA + (e % STRATA)];
    const cand = [], out = [];
    if (rid < 0) return out;
    for (let i = 0; i < n; i++) {
        if (i === ti || ownerCut[i] !== rid || cutTop[i] === 255) continue;
        const F = cutTop[i], T = top[i];
        if (T - F < 2 || !isSolidB(get(i, T - 1)) || !isSolidB(get(i, T - 2))) continue;
        let fl = false;
        for (let e = F; e < T; e++) if (isFluidB(get(i, e))) fl = true;
        if (!fl) cand.push(i);
    }
    for (let k = 0; k < FIXTURE_COLUMNS && cand.length; k++) {
        const i = cand[Math.floor((k + 0.5) * cand.length / FIXTURE_COLUMNS)];
        if (out.some(p => p.i === i)) continue;
        const e = top[i] - 1;
        M[(e / STRATA) | 0][i * STRATA + (e % STRATA)] = M_WATER;
        out.push({ i, x: i % size, y: (i / size) | 0, e, F: cutTop[i], T: top[i] });
    }
    return out;
}

const getter = M => (i, e) => M[(e / STRATA) | 0][i * STRATA + (e % STRATA)];
const near = (i, size) => Math.abs(i % size - TX) <= NEAR && Math.abs(((i / size) | 0) - TY) <= NEAR;

// Every fluid stratum by what is right under it (DEC-001). onSolidOverVoid: on solid, with air lower in the column.
function fluidSupport(M, size, filter) {
    const get = getter(M), c = { strata: 0, onFluid: 0, onSolid: 0, onSolidOverVoid: 0, onModelFloor: 0, onAir: 0, onAirAt: [] };
    for (let i = 0; i < size * size; i++) {
        if (filter && !filter(i)) continue;
        for (let e = 0; e < E_TOP; e++) {
            if (!isFluidB(get(i, e))) continue;
            c.strata++;
            if (e === 0) { c.onModelFloor++; continue; }
            const b = get(i, e - 1);
            if (isFluidB(b)) c.onFluid++;
            else if (isSolidB(b)) {
                c.onSolid++;
                for (let k = e - 2; k >= 0; k--) if (!isSolidB(get(i, k)) && !isFluidB(get(i, k))) { c.onSolidOverVoid++; break; }
            } else {
                c.onAir++;
                if (c.onAirAt.length < 8) c.onAirAt.push(`(${i % size}, ${(i / size) | 0}) fluid at ${e} ft on air at ${e - 1} ft`);
            }
        }
    }
    return c;
}

// Fluid strata of A that are not the same byte in B (lost) and fluid strata of B that A did not hold (added).
function fluidDiff(A, B, size, filter) {
    const r = { before: 0, lost: 0, added: 0, at: [] };
    for (let li = 0; li < 5; li++) {
        const a = A[li], b = B[li];
        for (let k = 0; k < a.length; k++) {
            const i = (k / STRATA) | 0;
            if (filter && !filter(i)) continue;
            if (isFluidB(a[k])) r.before++;
            if (isFluidB(a[k]) && b[k] !== a[k]) r.lost++;
            else if (isFluidB(b[k]) && a[k] !== b[k]) r.added++;
            else continue;
            if (r.at.length < 6) r.at.push(`(${i % size}, ${(i / size) | 0}) ${li * STRATA + k % STRATA} ft ${a[k]} -> ${b[k]}`);
        }
    }
    return r;
}

// The cut carve against its plan for the cut owning (194, 89): columns it carved, columns it kept for a fluid, columns
// off plan; and columns outside every cut's plan that changed.
function footprintAudit(r) {
    const { size, n, preCut, postCut, top, cutTop, ownerCut } = r, ti = TY * size + TX, rid = ownerCut[ti];
    const pre = getter(preCut), post = getter(postCut);
    const a = { rid, cells: [], carved: 0, fluidKept: 0, bad: [], outside: 0, targetF: cutTop[ti], targetCarved: false };
    for (let i = 0; i < n; i++) {
        let changed = false;
        for (let e = 0; e < E_TOP && !changed; e++) if (pre(i, e) !== post(i, e)) changed = true;
        if (cutTop[i] === 255) { if (changed) a.outside++; continue; }
        if (rid < 0 || ownerCut[i] !== rid) continue;
        a.cells.push(i);
        const F = cutTop[i], T = top[i], where = `(${i % size}, ${(i / size) | 0})`;
        let fl = false;
        for (let e = F; e < T; e++) if (isFluidB(pre(i, e))) fl = true;
        if (fl) {
            a.fluidKept++;
            if (changed) a.bad.push(`${where} holds a fluid in ${F}..${T - 1} ft but was changed`);
            continue;
        }
        let off = -1;
        for (let e = 0; e < E_TOP && off < 0; e++) if (e >= F && e < T ? post(i, e) !== 0 : post(i, e) !== pre(i, e)) off = e;
        if (off >= 0) a.bad.push(`${where} planned air ${F}..${T - 1} ft, stratum ${off} ft is ${post(i, off)} (was ${pre(i, off)})`);
        else { a.carved++; if (i === ti) a.targetCarved = true; }
    }
    return a;
}

// Solid strata joined through solid strata (6 faces) to bedrock (e = 0) or the area edge: the rule the generator's
// floating-mass removal applies (DEUS_Levels carveNaturalFeatures), computed here independently.
function floatingSolids(M, size, scope) {
    const n = size * size, N = n * E_TOP, st = new Uint8Array(N), q = new Int32Array(N), get = getter(M);
    for (let e = 0; e < E_TOP; e++) for (let i = 0; i < n; i++) st[e * n + i] = isSolidB(get(i, e)) ? 1 : 0;
    let qh = 0, qt = 0;
    const push = v => { if (st[v] === 1) { st[v] = 2; q[qt++] = v; } };
    for (let i = 0; i < n; i++) push(i);
    for (let e = 0; e < E_TOP; e++) for (let k = 0; k < size; k++) {
        push(e * n + k); push(e * n + (size - 1) * size + k); push(e * n + k * size); push(e * n + k * size + size - 1);
    }
    while (qh < qt) {
        const v = q[qh++], e = (v / n) | 0, i = v - e * n, x = i % size;
        if (e > 0) push(v - n);
        if (e < E_TOP - 1) push(v + n);
        if (x > 0) push(v - 1);
        if (x < size - 1) push(v + 1);
        if (i >= size) push(v - size);
        if (i < n - size) push(v + size);
    }
    const r = { overhangs: 0, scopeOverhangs: 0, floating: 0, floatingOverhangs: 0, at: [] };
    for (let e = 0; e < E_TOP; e++) for (let i = 0; i < n; i++) {
        const s = st[e * n + i];
        if (!s) continue;
        const overhang = e > 0 && !isSolidB(get(i, e - 1));
        if (overhang) { r.overhangs++; if (scope(i)) r.scopeOverhangs++; }
        if (s !== 1) continue;
        r.floating++;
        if (overhang) {
            r.floatingOverhangs++;
            if (r.at.length < 6) r.at.push(`(${i % size}, ${(i / size) | 0}) ${e} ft over ${get(i, e - 1) ? "fluid" : "air"}`);
        }
    }
    return r;
}

//-----------------------------------------------------------------------------

function run() {
    console.log("======================================================================");
    console.log("DEUS TARGETED PROOF: GENERATED Z-2 CUT & FLUID PRESERVATION (WG.00.08, Directive 001-I sec B)");
    console.log(`World Seed ${SEED}, generator 5, target (${TX}, ${TY})${mutant ? `, MUTANT ${mutant}` : ""}`);
    console.log("======================================================================");

    const disk = {};
    for (const f of FILES) disk[f] = fs.readFileSync(path.join(PLUGINS, f), "utf8");
    const MU = mutant ? MUTANTS[mutant] : null;
    const base = MU ? sourcesWith(disk, MU.edits, `mutant ${mutant}`) : disk;
    const probed = sourcesWith(base, PROBES, "probe");

    const nat = generate("natural", base, null);
    const P = makeProbe({ perturb: !!(MU && MU.probePerturbs) });
    const prb = generate("probed", probed, P.fn);
    const X = makeProbe({ plant: true });
    const fix = generate("fixture", probed, X.fn);

    const size = nat.size, n = size * size, TI = TY * size + TX, akey = `${nat.a.x},${nat.a.y}`;
    const pr = P.rec[akey], fr = X.rec[akey];
    for (const [tag, r] of [["probed", pr], ["fixture", fr]]) {
        if (!r || !r.preFeatures || !r.preCut || !r.postCut) harnessProblem(`the ${tag} run's probes did not fire for area ${akey}`);
    }
    const getN = getter(nat.M);

    //------------------------------------------------------------------ 1. the column
    let firstAir = -1;
    for (let e = 0; e < E_TOP && firstAir < 0; e++) if (!isSolidB(getN(TI, e))) firstAir = e;
    say(`\n--- 1. STRATA COLUMN AT (${TX}, ${TY}) (natural run; cell index ${TI}) ---`);
    say(`First air elevation: ${firstAir} ft`);
    say("Elevation | Level | Stratum | Material | Solid?");
    say("----------------------------------------------");
    for (let e = E_TOP - 1; e >= 0; e--) {
        const v = getN(TI, e), z = ((e / STRATA) | 0) - 2;
        const mat = v === 0 ? "AIR" : ["AIR", "STONE", "SOIL", "WOOD", "WATER", "LAVA"][v & 0x3f] || `MAT_${v}`;
        say(`   ${String(e).padStart(2)}     |  Z=${z >= 0 ? "+" + z : z}  |   S${e % STRATA}    | ${mat.padEnd(8)} | ${isSolidB(v)}`);
    }

    say(`\n--- 2. MULTI-Z SHAPE & HEIGHT STATE AT (${TX}, ${TY}) ---`);
    const zs = {};
    for (const z of LEVELS) {
        const r = { areaX: nat.a.x, areaY: nat.a.y, x: TX, y: TY, z };
        zs[z] = { shape: nat.L.shapeAt(r), height: nat.L.heightStateAt(r) };
        say(`Level Z=${z >= 0 ? "+" + z : z}: shape = ${String(zs[z].shape).padEnd(8)} | heightState = ${zs[z].height}`);
    }

    //------------------------------------------------------------------ 3. the ravine, its footprint, the fixture
    const featsN = nat.L.naturalFeatures(nat.a.x, nat.a.y);
    const auditP = footprintAudit(pr), auditF = footprintAudit(fr);
    const inFootprint = new Uint8Array(n);
    for (const i of auditP.cells) inFootprint[i] = 1;
    const scope = i => near(i, size) || inFootprint[i] === 1 ||
        [1, -1, size, -size].some(d => i + d >= 0 && i + d < n && inFootprint[i + d] === 1);
    say(`\n--- 3. RAVINE FOOTPRINT (probed run: the cut plan before the carve) ---`);
    say(`Plan owner of (${TX}, ${TY}): cut #${auditP.rid}; planned columns ${auditP.cells.length}, carved ${auditP.carved}, kept for a fluid ${auditP.fluidKept}, off plan ${auditP.bad.length}; changed columns outside every cut plan ${auditP.outside}`);
    say(`Fixture: water planted in ${(fr.planted || []).length} ravine columns before the carve: ${(fr.planted || []).map(p => `(${p.x}, ${p.y}) ${p.e} ft over rock ${p.F}..${p.e - 1} ft`).join("; ") || "none"}`);
    say(`Fixture carve: carved ${auditF.carved}, kept for a fluid ${auditF.fluidKept}, off plan ${auditF.bad.length}`);

    //------------------------------------------------------------------ 4. fluid audit (DEC-001)
    const supN = fluidSupport(nat.M, size), supNear = fluidSupport(nat.M, size, i => near(i, size)), supF = fluidSupport(fix.M, size);
    say(`\n--- 4. FLUID SUPPORT AUDIT (Owner ruling DEC-001: fluid directly on air is a defect) ---`);
    say(`Whole area (natural): ${supN.strata} fluid strata; on fluid ${supN.onFluid}, on solid ${supN.onSolid} (of them over a lower void, >= 1 solid between: ${supN.onSolidOverVoid}), on the model floor ${supN.onModelFloor}, directly on air ${supN.onAir}`);
    say(`61 x 61 round (${TX}, ${TY}) (natural): ${supNear.strata} fluid strata; on fluid ${supNear.onFluid}, on solid ${supNear.onSolid} (over a lower void: ${supNear.onSolidOverVoid}), directly on air ${supNear.onAir}`);
    say(`Whole area (fixture): ${supF.strata} fluid strata; on fluid ${supF.onFluid}, on solid ${supF.onSolid}, directly on air ${supF.onAir}`);
    if (!quiet) {
        const getP = getter(nat.M);
        for (let y = TY - NEAR; y <= TY + NEAR; y++) for (let x = TX - NEAR; x <= TX + NEAR; x++) {
            if (x < 0 || y < 0 || x >= size || y >= size) continue;
            const i = y * size + x;
            let col = "", has = false;
            for (let e = 0; e < E_TOP; e++) { const v = getP(i, e); col += isFluidB(v) ? "~" : isSolidB(v) ? "#" : "."; if (isFluidB(v)) has = true; }
            if (has) console.log(`  (${x}, ${y}) e=0..24: ${col}`);
        }
    }

    //------------------------------------------------------------------ 5. cross-section
    say(`\n--- 5. ASCII ELEVATION CROSS-SECTION (Y = ${TY}, X = 186..202, natural run) ---`);
    const xStart = 186, xEnd = 202;
    let head = "Elev | ";
    for (let x = xStart; x <= xEnd; x++) head += String(x % 10);
    say(head);
    say("-".repeat(head.length));
    for (let e = E_TOP - 1; e >= 0; e--) {
        let line = ` ${String(e).padStart(2)}  | `;
        for (let x = xStart; x <= xEnd; x++) {
            const v = getN(TY * size + x, e);
            line += isFluidB(v) ? "~" : isSolidB(v) ? "#" : ".";
        }
        const z = ((e / STRATA) | 0) - 2;
        say(`${line}  (Z=${z >= 0 ? "+" + z : z} S${e % STRATA})`);
    }
    say("Legend: '#' = Solid Rock/Soil, '.' = Air, '~' = Water / Lava");

    //------------------------------------------------------------------ 6. checks
    console.log(`\n--- 6. CHECKS ---`);
    check("first_air_is_3ft", () => {
        eq(firstAir, 3, `first non-solid stratum of (${TX}, ${TY}) (ft)`);
        return `first air at ${firstAir} ft (Z-2 S3)`;
    });
    check("z_minus2_is_floor", () => {
        eq(zs[-2].shape, "floor", "Z-2 shape");
        eq(zs[-2].height, "HEIGHT_3_OF_5", "Z-2 heightState");
        return `Z-2 shape=${zs[-2].shape} height=${zs[-2].height}`;
    });
    check("z_minus1_is_open", () => {
        eq(zs[-1].shape, "open", "Z-1 shape");
        eq(zs[-1].height, "HEIGHT_0_OF_5", "Z-1 heightState");
        return `Z-1 shape=${zs[-1].shape} height=${zs[-1].height}`;
    });
    check("z0_is_open", () => {
        eq(zs[0].shape, "open", "Z0 shape");
        eq(zs[0].height, "HEIGHT_0_OF_5", "Z0 heightState");
        return `Z0 shape=${zs[0].shape} height=${zs[0].height}`;
    });
    check("z_plus1_z_plus2_open", () => {
        eq(zs[1].shape, "open", "Z+1 shape");
        eq(zs[2].shape, "open", "Z+2 shape");
        return `Z+1 shape=${zs[1].shape}, Z+2 shape=${zs[2].shape}`;
    });
    check("ravine_identity", () => {
        assert.ok(featsN && Array.isArray(featsN.cuts), "naturalFeatures gave no cut list");
        featsN.cuts.forEach((c, k) => eq(c.id, k, `cut descriptor ${k}'s id`));
        const hits = featsN.cuts.filter(c => c.deepest && c.deepest.x === TX && c.deepest.y === TY);
        eq(hits.length, 1, `cut descriptors whose deepest cell is (${TX}, ${TY})`);
        const c = hits[0];
        eq(c.kind, "cut", "kind");
        eq(c.type, "ravine", "type");
        eq(c.depthClass, "z2", "depthClass");
        eq(c.floorLevel, -2, "floorLevel");
        eq(c.minFloor, firstAir, `minFloor (ft) against the first air of (${TX}, ${TY})`);
        eq(c.form, "line", "form (ravine type)");
        eq(c.profile, "u", "profile (ravine type)");
        assert.ok(FAMILIES_WITH_RAVINE.includes(c.family), `family ${fmt(c.family)} has no ravine weight (${FAMILIES_WITH_RAVINE.join(", ")})`);
        assert.ok(Number.isInteger(c.cells) && c.cells > 0, `cells ${fmt(c.cells)}, expected > 0`);
        assert.ok(c.anchor && c.anchor.x >= 0 && c.anchor.y >= 0 && c.anchor.x < size && c.anchor.y < size, `anchor ${fmt(c.anchor)} outside the area`);
        eq(auditP.rid, c.id, `the probed run's cut plan owner of (${TX}, ${TY})`);
        return `cut #${c.id}: kind ${c.kind}, type ${c.type}, depthClass ${c.depthClass}, family ${c.family}, floorLevel ${c.floorLevel}, minFloor ${c.minFloor} ft, deepest (${c.deepest.x}, ${c.deepest.y}), anchor (${c.anchor.x}, ${c.anchor.y}), ${c.cells} cells, length ${c.length}, ${c.form}/${c.profile}`;
    });
    check("ravine_footprint_matches_plan", () => {
        const featsP = prb.L.naturalFeatures(prb.a.x, prb.a.y), featsF = fix.L.naturalFeatures(fix.a.x, fix.a.y);
        for (const [tag, au, feats] of [["probed", auditP, featsP], ["fixture", auditF, featsF]]) {
            assert.ok(au.rid >= 0, `${tag}: (${TX}, ${TY}) is in no cut's plan`);
            eq(au.bad.length, 0, `${tag}: ravine columns off plan [${au.bad.slice(0, 4).join("; ")}]`);
            eq(au.outside, 0, `${tag}: columns outside every cut plan changed by the cut carve`);
            assert.ok(au.carved > 0, `${tag}: the ravine carved no column (${au.cells.length} planned)`);
            eq(au.targetCarved, true, `${tag}: (${TX}, ${TY}) carved to its planned floor ${au.targetF} ft`);
            eq(au.carved, feats && feats.cuts[au.rid] ? feats.cuts[au.rid].cells : null, `${tag}: carved ravine columns against the descriptor's cells`);
        }
        const planted = (fr.planted || []).length;
        assert.ok(planted > 0, "fixture: no water planted in the ravine's carve path");
        eq(auditF.fluidKept, auditP.fluidKept + planted, "fixture: ravine columns kept for a fluid (natural + planted)");
        return `probed: cut #${auditP.rid}, ${auditP.cells.length} planned columns, ${auditP.carved} carved to plan (= descriptor), ${auditP.fluidKept} kept for a fluid, 0 off plan, 0 changed outside the plans; ` +
            `fixture: ${auditF.carved} carved, ${auditF.fluidKept} kept (the ${planted} planted), 0 off plan`;
    });
    check("fluid_rests_on_support", () => {
        assert.ok(supN.strata > 0, "natural: no fluid stratum in the area (nothing to audit)");
        eq(supN.onAir, 0, `natural: fluid strata directly on air [${supN.onAirAt.join("; ")}]`);
        eq(supF.onAir, 0, `fixture: fluid strata directly on air [${supF.onAirAt.join("; ")}]`);
        assert.ok((fr.planted || []).length > 0, "fixture: no water planted (nothing under test)");
        return `natural: ${supN.strata} fluid strata, 0 on air (on fluid ${supN.onFluid}, on solid ${supN.onSolid} of which ${supN.onSolidOverVoid} over a lower void through >= 1 solid; 61 x 61: ${supNear.strata} strata, ${supNear.onSolidOverVoid} over a lower void); fixture: ${supF.strata} strata, 0 on air`;
    });
    check("fluid_conserved_across_cut", () => {
        const f1 = fluidDiff(pr.preFeatures, pr.preCut, size), f2 = fluidDiff(pr.preCut, pr.postCut, size), f3 = fluidDiff(pr.postCut, prb.M, size);
        const foot = i => inFootprint[i] === 1;
        const fx = fluidDiff(fr.preCut, fix.M, size), fxFoot = fluidDiff(fr.preCut, fix.M, size, foot), natFoot = fluidDiff(pr.preCut, prb.M, size, foot);
        const nearN = fluidDiff(pr.preCut, prb.M, size, i => near(i, size));
        for (const [what, d] of [["probed, before any feature -> before the cut carve", f1], ["probed, the cut carve", f2], ["probed, after the cut carve -> final", f3], ["fixture, before the cut carve -> final", fx]]) {
            eq(d.lost + d.added, 0, `${what}: fluid strata lost ${d.lost}, added ${d.added} [${d.at.join("; ")}]`);
        }
        assert.ok(f2.before > 0, "probed: no fluid stratum before the cut carve (nothing to conserve)");
        const planted = (fr.planted || []).length;
        assert.ok(planted > 0, "fixture: no water planted in the ravine's carve path");
        eq(fxFoot.before, natFoot.before + planted, "fixture: fluid strata in the ravine footprint before the carve (natural + planted)");
        return `probed: ${f2.before} fluid strata before the cut carve (61 x 61: ${nearN.before}, ravine footprint: ${natFoot.before}), the same after generation (0 lost, 0 added, also from before any feature); ` +
            `fixture: ${fx.before} strata incl. ${planted} planted in the ravine's carve path, 0 lost, 0 added`;
    });
    check("no_floating_solids", () => {
        const f = floatingSolids(nat.M, size, scope);
        assert.ok(f.scopeOverhangs > 0, "no solid stratum with air or fluid under it round the ravine (nothing to audit)");
        eq(f.floating, 0, `solid strata not grounded (${f.floatingOverhangs} of them with air or fluid right under) [${f.at.join("; ")}]`);
        return `${f.overhangs} solid strata with air or fluid right under them in the area (${f.scopeOverhangs} round the ravine and the 61 x 61), all grounded; 0 floating`;
    });
    check("probe_read_only", () => {
        let diff = 0, first = "";
        for (let li = 0; li < 5; li++) for (let k = 0; k < nat.M[li].length; k++) {
            if (nat.M[li][k] === prb.M[li][k]) continue;
            if (!diff++) first = ` first at (${((k / STRATA) | 0) % size}, ${((k / STRATA / size) | 0)}) ${li * STRATA + k % STRATA} ft`;
        }
        eq(diff, 0, `strata differing between the natural and probed runs${first}`);
        const noMs = (key, v) => key === "ms" ? undefined : v;
        eq(JSON.stringify(prb.L.naturalFeatures(prb.a.x, prb.a.y), noMs) === JSON.stringify(featsN, noMs), true, "probed descriptors equal the natural run's");
        return `${5 * n * STRATA} strata and the feature descriptors identical`;
    });
    check("no_vm_errors", () => {
        for (const r of [nat, prb, fix]) eq(r.errors.length, 0, `${r.tag} run console.error count [${r.errors.slice(0, 2).join(" | ").slice(0, 200)}]`);
        return `0 errors (warnings: ${nat.warnings.length}/${prb.warnings.length}/${fix.warnings.length})`;
    });

    const failed = results.filter(r => !r.ok).map(r => r.name), passed = results.length - failed.length;

    //------------------------------------------------------------------ 7. the map
    console.log(`\n--- 7. VISUAL PROOF (128 x 128 cells round (${TX}, ${TY}), 4 px per cell) ---`);
    if (mutant) console.log("Mutant run: the map is not written and a previous one is left as it is.");
    else if (failed.length) {
        if (fs.existsSync(PNG_PATH)) { fs.unlinkSync(PNG_PATH); console.log(`A check failed: no map written; the stale ${PNG_PATH} was deleted.`); }
        else console.log("A check failed: no map written.");
    } else {
        const png = renderMap(nat.M, size);
        fs.mkdirSync(OUT_DIR, { recursive: true });
        fs.writeFileSync(PNG_PATH, png);
        console.log(`All checks passed: map written to ${PNG_PATH} (${png.length} bytes, 512x512 px, PASS stamped top left)`);
    }

    console.log(`\nRESULT: ${passed} passed, ${failed.length} failed (exit ${failed.length ? 1 : 0})${failed.length ? " - " + failed.join(", ") : ""}`);
    console.log(`Run times: natural ${nat.ms.toFixed(0)} ms, probed ${prb.ms.toFixed(0)} ms, fixture ${fix.ms.toFixed(0)} ms`);
    process.exit(failed.length ? 1 : 0);
}

// The exposed level of each cell's highest solid (or water), the target's crosshair, and a PASS stamp.
function renderMap(M, size) {
    const get = getter(M), mapW = 128, mapH = 128, originX = TX - 64, originY = TY - 64, scale = 4;
    const imgW = mapW * scale, imgH = mapH * scale, rgba = Buffer.alloc(imgW * imgH * 4);
    const fill = (px0, py0, w, h, r, g, b) => {
        for (let py = py0; py < py0 + h; py++) for (let px = px0; px < px0 + w; px++) {
            const o = (py * imgW + px) * 4;
            rgba[o] = r; rgba[o + 1] = g; rgba[o + 2] = b; rgba[o + 3] = 255;
        }
    };
    for (let my = 0; my < mapH; my++) for (let mx = 0; mx < mapW; mx++) {
        const wx = originX + mx, wy = originY + my;
        let r = 20, g = 20, b = 25;
        if (wx >= 0 && wx < size && wy >= 0 && wy < size) {
            const ci = wy * size + wx;
            let topSolid = -1, hasWater = false;
            for (let e = E_TOP - 1; e >= 0; e--) {
                if (isFluidB(get(ci, e))) { hasWater = true; break; }
                if (isSolidB(get(ci, e))) { topSolid = e; break; }
            }
            const topZ = ((topSolid / STRATA) | 0) - 2;
            if (hasWater) [r, g, b] = [30, 100, 200];              // water
            else if (topSolid < 0) [r, g, b] = [10, 10, 15];       // no floor
            else if (topZ === -2) [r, g, b] = [75, 45, 95];        // exposed Z-2 chasm floor
            else if (topZ === -1) [r, g, b] = [90, 80, 80];        // exposed Z-1
            else if (topZ === 0) [r, g, b] = [60, 110, 50];        // ground
            else if (topZ === 1) [r, g, b] = [90, 135, 65];        // +1
            else [r, g, b] = [180, 185, 190];                      // +2
            if (wx === TX && wy === TY) [r, g, b] = [255, 220, 40];
            else if ((wx === TX && Math.abs(wy - TY) <= 3) || (wy === TY && Math.abs(wx - TX) <= 3)) [r, g, b] = [255, 80, 80];
        }
        fill(mx * scale, my * scale, scale, scale, r, g, b);
    }
    // PASS in a 3 x 5 font, 6 px per dot, on a black box.
    const FONT = { P: ["111", "101", "111", "100", "100"], A: ["010", "101", "111", "101", "101"], S: ["011", "100", "010", "001", "110"] };
    fill(6, 6, 4 * 24 + 6, 5 * 6 + 12, 0, 0, 0);
    [..."PASS"].forEach((ch, k) => FONT[ch].forEach((row, ry) => [...row].forEach((bit, rx) => {
        if (bit === "1") fill(12 + k * 24 + rx * 6, 12 + ry * 6, 6, 6, 60, 220, 90);
    })));
    return encodePNG(imgW, imgH, rgba);
}

run();
