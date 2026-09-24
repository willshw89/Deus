#!/usr/bin/env node
"use strict";

/**
 * tools/test_volumetric_terrain_column.js
 *
 * DEUS-TSK-FABLE-16 Part 3 (owner directive 2026-09-24): the hard volumetric terrain invariant.
 * "All of the terrain on Z+1 needs to have walls under it on Z0." Column profiles by surface height S:
 *   S = 2: +2 floor/ramp, +1 solid, ground solid.   S = 1: +2 open, +1 floor/ramp, ground solid.
 *   S = 0: +2 open, +1 open, ground floor (or ramp).  Exceptions: cave mouths carved into a hill at the ground.
 *
 * Runs the real plugins (DEUS_World, DEUS_WorldGen, DEUS_Tiles, DEUS_Objects, DEUS_Levels; with --history also
 * DEUS_Factions, DEUS_Dnd5e, DEUS_Callings, DEUS_History, DEUS_HistoricalDemographics, DEUS_Doors) in a Node vm, makes
 * a New Game world per seed and checks, for the start area:
 *   column_profiles        every cell's shapes at 0/+1/+2 match its S (carved cave cells excepted and counted)
 *   z0_solid_rock_tiles    every ground SOLID cell is the rock face (peak_rock) on layers 0 and 2, region 250,
 *                          impassable by tile flags (World.walkable ground:true false) and World.walkable false
 *   z0_solid_no_objects    no object on a ground SOLID cell
 *   ramps_caves_walkable   ground ramps (dry ground) and carved cave cells (bare rock floor) are walkable
 *   volume_stats           UF.WorldGen.volumeStats agrees with the shape grid
 *   natural_wall_cells     UF.Levels.naturalWallCells(area, 0, ...) lists exactly the SOLID cells with an exposed
 *                          orthogonal neighbour (whole area), with the right masks
 *   natural_wall_spec      naturalWallSpec: 48 x 96, 48 px cap, cap colours inside #08080C..#121218
 *   natural_wall_frame     the frame drawn by the plugin: cap fill in the upper 48 px, the face blitted below it
 *   ground_connectors      groundConnectorCells lists every ground ramp and stair with its look
 *   sprite_z0              the real Sprite_UFNaturalWalls on a ground view draws a 96 px wall frame on every natural
 *                          wall cell of its window and a connector frame on every ramp/stair there; nothing when the
 *                          ground has no column (generator 3)
 *   path_never_solid       World.findPath between two valley cells on either side of a hill never steps on a solid
 *                          cell of its level (and does not cross the hill's solid run)
 *   unit_refused_hill      a unit sent into a hill cell never stands on a solid cell and never reaches it
 *   unit_walks_legal_route a unit sent across the hill never stands on a solid cell on the way and arrives
 *   dig_repaint            a ground setShape SOLID -> floor repaints bare rock floor (walkable), exposes the next wall
 *                          cells, matches a fresh build; back to SOLID repaints the rock face exactly
 *   site_pieces_skipped    a history site piece on a SOLID ground cell is left out and counted, one on the valley isn't
 *   no_errors              no console.error from the plugins
 *
 * Usage: node tools/test_volumetric_terrain_column.js [--seeds=20260923,20260924] [--mutant=<name>] [--history] [--quiet]
 * Negative controls (Rule 4; each must exit 1):
 *   --mutant=hollow_floating_hills       WorldGen paints the ground under hills as before (natural ground, water)
 *   --mutant=cliffs_invisible_on_ground  Levels classifies no natural walls on the ground
 *   --mutant=hills_walkable              both guards off: the ground painted without its column and Levels reporting
 *                                        its solid cells as floor (paths and units walk into hills)
 *   coverage (one seed is enough): floating_upper_levels, ground_without_column, plants_inside_hills, cap_not_black,
 *                                  connectors_hidden, error_injected
 * Exit: 0 all checks passed, 1 a check failed, 2 harness problem.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { performance } = require("perf_hooks");

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const arg = (name, fallback) => {
    const a = process.argv.find(x => x.startsWith(`--${name}=`));
    return a ? a.slice(name.length + 3) : fallback;
};
const SEEDS = arg("seeds", "20260923,20260924").split(",").map(s => parseInt(s, 10) >>> 0).filter(Boolean);
const mutant = arg("mutant", "");
const withHistory = process.argv.includes("--history");
const quiet = process.argv.includes("--quiet");

// Mutants: exact source edits, applied in memory. A missing target is a harness problem (exit 2), never a pass.
const HOLLOW = {
    file: "DEUS_WorldGen.js",
    find: "const col = z === 0 ? groundColumns(ctx.areaX, ctx.areaY, false) : null;",
    replace: "const col = null; /* MUTANT: the ground painted without its column */"
};
const MUTANTS = {
    hollow_floating_hills: [HOLLOW],
    cliffs_invisible_on_ground: [{
        file: "DEUS_Levels.js",
        find: "if (!st || levelGen(st, 0) < 4 || !W.inWorld(ax, ay, 0) || provoked(\"ground_cliffs\")) return () => -1;",
        replace: "return () => -1; /* MUTANT cliffs_invisible_on_ground */"
    }],
    // Both guards off: the ground's tiles painted without the column AND its solid cells reported as floor.
    hills_walkable: [HOLLOW, {
        file: "DEUS_Levels.js",
        find: "            if (levelGen(st, 0) >= 4) {\n                const b = baseline(0, ax, ay);\n                return pack(b.shape[i], false, b.material[i]);",
        replace: "            if (levelGen(st, 0) >= 4) {\n                const b = baseline(0, ax, ay);\n                return pack(b.shape[i] === SOLID ? FLOOR : b.shape[i], false, b.material[i]); /* MUTANT hills_walkable */"
    }],
    // Coverage mutants: each makes one more check print FAIL (run with one seed: --seeds=20260923).
    floating_upper_levels: [{ // +1 under a +2 surface left open: the +2 floor floats
        file: "DEUS_Levels.js",
        find: "                        if (z < S) {\n                            shape[i] = SOLID;",
        replace: "                        if (z < S) {\n                            shape[i] = z === 1 ? OPEN : SOLID; /* MUTANT floating_upper_levels */"
    }],
    ground_without_column: [{
        file: "DEUS_Levels.js",
        find: "return !!st && levelGen(st, 0) >= 4;",
        replace: "return false; /* MUTANT ground_without_column */"
    }],
    plants_inside_hills: [{
        file: "DEUS_WorldGen.js",
        find: "// Anchor surface objects to actual surface elevation (S === z)\n                if (L && typeof L.surfaceElevationAt === \"function\") {\n                    const S = L.surfaceElevationAt(gx, gy, seed);\n                    if (S !== z) continue;",
        replace: "// Anchor surface objects to actual surface elevation (S === z)\n                if (L && typeof L.surfaceElevationAt === \"function\") {\n                    const S = L.surfaceElevationAt(gx, gy, seed);\n                    if (S !== z && false) continue; /* MUTANT plants_inside_hills */"
    }],
    cap_not_black: [{
        file: "DEUS_Levels.js",
        find: "width: 48, height: 96, capHeight: 48, capColor: \"#0a0a10\"",
        replace: "width: 48, height: 96, capHeight: 48, capColor: \"#5c5c68\" /* MUTANT cap_not_black */"
    }],
    connectors_hidden: [{
        file: "DEUS_Levels.js",
        find: "if (s >= RAMP) out.push({ x, y, look: CONNECTOR_LOOK[s] });",
        replace: "if (s >= RAMP && false) out.push({ x, y, look: CONNECTOR_LOOK[s] }); /* MUTANT connectors_hidden */"
    }],
    error_injected: [{
        file: "DEUS_WorldGen.js",
        find: "    function generate(ctx) {",
        replace: "    function generate(ctx) { console.error(\"MUTANT error_injected\");"
    }]
};
if (mutant && !MUTANTS[mutant]) {
    console.log(`HARNESS unknown mutant "${mutant}"; known: ${Object.keys(MUTANTS).join(", ")}`);
    console.log("RESULT: 0 passed, 0 failed (exit 2)");
    process.exit(2);
}

const FILES = ["DEUS_World.js", "DEUS_WorldGen.js", "DEUS_Tiles.js"]
    .concat(withHistory ? ["DEUS_Factions.js", "DEUS_Dnd5e.js", "DEUS_Callings.js", "DEUS_History.js", "DEUS_HistoricalDemographics.js"] : [])
    .concat(["DEUS_Objects.js"], withHistory ? ["DEUS_Doors.js"] : [], ["DEUS_Levels.js"]);

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

//-----------------------------------------------------------------------------
// The vm: RMMZ stubs only where the plugins touch the engine; the plugins themselves are the real files.

function setup() {
    const sources = {};
    for (const f of FILES) sources[f] = fs.readFileSync(path.join(PLUGINS, f), "utf8");
    if (mutant) {
        for (const m of MUTANTS[mutant]) {
            if (!sources[m.file] || !sources[m.file].includes(m.find)) harnessProblem(`mutant ${mutant}: target not found in ${m.file}`);
            sources[m.file] = sources[m.file].replace(m.find, m.replace);
        }
        console.log(`MUTANT ${mutant}: ${MUTANTS[mutant].map(m => m.file).join(" + ")} edited in memory; this run must FAIL`);
    }
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
            log: (...a) => { if (!quiet && process.env.DEUS_VM_LOG) console.log("  [VM]", ...a); },
            warn: (...a) => warnings.push(a.map(String).join(" ")),
            error: (...a) => errors.push(a.map(x => (x && x.stack) || String(x)).join(" "))
        },
        document: { createElement: () => ({ width: 0, height: 0, getContext: canvasCtx }) },
        PluginManager: { parameters: name => (list.$plugins && list.$plugins.find(p => p.name === name) || {}).parameters || {}, registerCommand() {} },
        DataManager: { _databaseFiles: [], onLoad() {}, isBattleTest: () => false, isEventTest: () => false },
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
    // Sprite and Bitmap: enough for the plugin's sprites to run; a Bitmap records its fills and blits.
    env.Sprite = vm.runInNewContext(`(function Sprite(bitmap) {
        this.anchor = { x: 0, y: 0, set(a, b) { this.x = a; this.y = b; } };
        this.children = []; this.parent = null; this.visible = true; this.bitmap = bitmap || null; this.x = 0; this.y = 0; this.z = 0;
    })`);
    Object.assign(env.Sprite.prototype, { update() {}, addChild(c) { c.parent = this; this.children.push(c); return c; } });
    env.Bitmap = vm.runInNewContext(`(function Bitmap(w, h) {
        this.width = w || 0; this.height = h || 0; this.ops = [];
        this.context = { imageSmoothingEnabled: false, drawImage() {}, putImageData() {}, fillRect() {} };
        this._baseTexture = { update() {} };
    })`);
    Object.assign(env.Bitmap.prototype, {
        isReady() { return true; }, isError() { return false; }, clear() {}, clearRect() {},
        fillRect(x, y, w, h, c) { this.ops.push(["fill", x, y, w, h, c]); },
        blt(src, sx, sy, sw, sh, dx, dy) { this.ops.push(["blt", sx, sy, sw, sh, dx, dy]); }
    });
    env.Bitmap.load = () => ({ isReady: () => false, isError: () => false });
    Object.assign(env.Game_Map.prototype, {
        mapId() { return this._mapId || 0; }, width: () => 256, height: () => 256, update() {}, tileId: () => 0, tilesetFlags: () => [],
        isPassable: () => true, checkPassage: () => true,
        displayX() { return this._dx || 0; }, displayY() { return this._dy || 0; }, screenTileX: () => 17, screenTileY: () => 13,
        adjustX(x) { return x - (this._dx || 0); }, adjustY(y) { return y - (this._dy || 0); },
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
    for (const f of FILES) vm.runInContext(sources[f], ctx, { filename: f });
    // Boot as RMMZ does: the tilesets arrive (UF_Tiles registers 91, UF_Levels 92), then Scene_Boot.start (hooks,
    // generators, the build hook that lays UF_Tiles' ground shades on layer 1).
    env.DataManager.onLoad(env.$dataTilesets);
    new env.Scene_Boot().start();
    env.__warnings = warnings;
    env.__errors = errors;
    return env;
}

//-----------------------------------------------------------------------------

const hexRgb = h => [1, 3, 5].map(k => parseInt(String(h).slice(k, k + 2), 16));
const inCapRange = h => {
    if (!/^#[0-9a-fA-F]{6}$/.test(String(h))) return false;
    const c = hexRgb(h), lo = hexRgb("#08080c"), hi = hexRgb("#121218");
    return c.every((v, k) => v >= lo[k] && v <= hi[k]);
};
const SOLID = 1, FLOOR = 2, OPEN = 3, RAMP = 4, STAIR_DOWN = 6;

function runSeed(seed) {
    const tag = `seed${seed}`;
    const env = setup();
    const W = env.UF.World, L = env.UF.Levels, T = env.UF.Tiles, G = env.UF.WorldGen, O = env.UF.Objects;
    if (!W || !L || !T || !G || !O) harnessProblem("plugins did not load (World/Levels/Tiles/WorldGen/Objects)");
    env.UF.NewGameSetup = { seed, year: 1 };
    let t0 = performance.now();
    W.newWorld(seed);
    const tNew = performance.now() - t0;
    const st = W.state, size = st.size, n = size * size, a = { x: st.startArea.x, y: st.startArea.y };
    t0 = performance.now();
    const map = W.peekArea(a.x, a.y, 0);
    const tBuild = performance.now() - t0;
    console.log(`INFO ${tag}: newWorld ${tNew.toFixed(0)} ms, ground build ${tBuild.toFixed(0)} ms (peek cache; 0 = built during newWorld), tileset ${map.tilesetId}, plugins ${FILES.length}${withHistory ? " (with history)" : ""}`);

    // Truth: the baselines (runtime arrays, never through the API that the mutants edit) and the surface heights.
    const b0 = L.baseline(0, a.x, a.y), b1 = L.baseline(1, a.x, a.y), b2 = L.baseline(2, a.x, a.y);
    const S = L.surfaceGrid(a.x, a.y);
    const ok0 = check(`${tag}.columns_exist`, L.groundVolumetric() && !!S && !!b0 && !!b1 && !!b2 && st.levels["0"].gen >= 4,
        `ground generator ${st.levels && st.levels["0"] && st.levels["0"].gen}, surface grid ${S ? "present" : "missing"}`);
    if (!ok0) return env;
    const caves = new Set();
    for (const m of (b0.cliffCaves || [])) for (const c of m.tunnel) caves.add(c.y * size + c.x);
    const counts = { S0: 0, S1: 0, S2: 0 };
    let carved = 0, ramps0 = 0, stairs0 = 0;
    const bad = [];
    const okUpper = s => s === FLOOR || s === RAMP;
    for (let i = 0; i < n; i++) {
        const s = S[i], z0 = b0.shape[i], z1 = b1.shape[i], z2 = b2.shape[i];
        counts[`S${s}`]++;
        let good;
        if (s === 2) good = z0 === SOLID && z1 === SOLID && okUpper(z2);
        else if (s === 1) good = (z0 === SOLID || caves.has(i)) && okUpper(z1) && z2 === OPEN;
        else good = (z0 === FLOOR || z0 === RAMP) && z1 === OPEN && z2 === OPEN;
        if (s >= 1 && z0 !== SOLID) {
            if (caves.has(i) && (z0 === FLOOR || z0 === STAIR_DOWN)) carved++;
            else good = false;
        }
        if (z0 === RAMP) ramps0++;
        if (z0 === STAIR_DOWN) stairs0++;
        if (!good && bad.length < 5) bad.push(`(${i % size},${Math.floor(i / size)}) S=${s} shapes ${z0}/${z1}/${z2}`);
        else if (!good) bad.push("");
    }
    check(`${tag}.column_profiles`, bad.length === 0 && counts.S1 > 0 && counts.S2 > 0,
        `${n} cells: S0 ${counts.S0}, S1 ${counts.S1}, S2 ${counts.S2}; carved cave cells excepted ${carved}; ground ramps ${ramps0}; violations ${bad.length}${bad.length ? ": " + bad.filter(Boolean).join("; ") : ""}`);

    // Tiles, passage and objects on every ground SOLID cell.
    const peak = T.groundBase("peak_rock");
    let solid = 0, notRock = 0, noCap = 0, groundPass = 0, walk = 0, noRegion = 0, objects = 0;
    const firstBad = [];
    for (let i = 0; i < n; i++) {
        if (b0.shape[i] !== SOLID) continue;
        solid++;
        const x = i % size, y = (i - x) / size;
        const t0i = map.data[i], t2i = map.data[2 * n + i];
        const isRock = t0i >= peak && t0i < peak + 48;
        if (!isRock) { notRock++; if (firstBad.length < 3) firstBad.push(`(${x},${y}) layer0 ${t0i} ${(T.kindOfTile(t0i) || {}).id || (env.Tilemap.isTileA1(t0i) ? "water" : "?")}`); }
        if (!(t2i >= peak && t2i < peak + 48)) noCap++;
        if (W.walkable(a.x, a.y, x, y, { ground: true })) groundPass++;
        if (W.walkable(a.x, a.y, x, y, { z: 0 })) walk++;
        if (map.data[5 * n + i] !== 250) noRegion++;
        if (map.ufObjects[i]) objects++;
    }
    check(`${tag}.z0_solid_rock_tiles`, solid > 0 && notRock === 0 && noCap === 0 && groundPass === 0 && walk === 0 && noRegion === 0,
        `${solid} ground SOLID cells: not rock face ${notRock}, layer 2 not rock ${noCap}, tile-passable ${groundPass}, walkable ${walk}, region != 250 ${noRegion}${firstBad.length ? "; first: " + firstBad.join(", ") : ""}`);
    check(`${tag}.z0_solid_no_objects`, objects === 0, `${objects} object(s) on ground SOLID cells`);

    const rockBase = T.groundBase("rock");
    let rampBad = [], caveBad = [];
    for (let i = 0; i < n; i++) {
        const x = i % size, y = (i - x) / size, s0 = b0.shape[i];
        if (s0 === RAMP) {
            const ok = !env.Tilemap.isTileA1(map.data[i]) && W.walkable(a.x, a.y, x, y, { z: 0 });
            if (!ok) rampBad.push(`(${x},${y}) tile ${map.data[i]}`);
        } else if (caves.has(i) && s0 !== SOLID) {
            const t = map.data[i];
            const ok = t >= rockBase && t < rockBase + 48 && W.walkable(a.x, a.y, x, y, { z: 0 });
            if (!ok) caveBad.push(`(${x},${y}) tile ${t} ${(T.kindOfTile(t) || {}).id || "?"}`);
        }
    }
    check(`${tag}.ramps_caves_walkable`, rampBad.length === 0 && caveBad.length === 0 && ramps0 > 0,
        `${ramps0} ground ramps (not walkable/dry: ${rampBad.length}${rampBad.length ? " " + rampBad.slice(0, 3).join(", ") : ""}), ${carved} carved cave cells (not walkable rock floor: ${caveBad.length}${caveBad.length ? " " + caveBad.slice(0, 3).join(", ") : ""})`);

    const vs = G.volumeStats[`${a.x},${a.y}`] || {};
    check(`${tag}.volume_stats`, vs.columns === true && vs.solid === solid && vs.carved === carved && vs.ramps === ramps0,
        `WorldGen.volumeStats ${JSON.stringify(vs)}; grid: solid ${solid}, carved ${carved}, ramps ${ramps0}`);

    // Natural wall classification over the whole area (independent rule, wrapping like the one-area world's map).
    const one = st.areasX === 1 && st.areasY === 1;
    const solidAt = (x, y) => {
        if (one) { x = ((x % size) + size) % size; y = ((y % size) + size) % size; } else if (x < 0 || y < 0 || x >= size || y >= size) return true;
        return b0.shape[y * size + x] === SOLID;
    };
    const NB8 = [[0, -1, 1], [0, 1, 2], [-1, 0, 4], [1, 0, 8], [-1, -1, 16], [1, -1, 32], [-1, 1, 64], [1, 1, 128]];
    const expected = new Map();
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        if (!solidAt(x, y)) continue;
        if ([[0, -1], [0, 1], [-1, 0], [1, 0]].every(([dx, dy]) => solidAt(x + dx, y + dy))) continue;
        let mask = 0;
        for (const [dx, dy, bit] of NB8) if (solidAt(x + dx, y + dy)) mask |= bit;
        expected.set(y * size + x, mask);
    }
    const listed = L.naturalWallCells(a, 0, 0, 0, size - 1, size - 1);
    let missing = 0, extra = 0, maskBad = 0, matBad = 0;
    const seen = new Set();
    for (const c of listed) {
        const i = c.y * size + c.x;
        seen.add(i);
        if (!expected.has(i)) { extra++; continue; }
        if (expected.get(i) !== c.mask) maskBad++;
        if (c.material !== "stone") matBad++;
    }
    for (const i of expected.keys()) if (!seen.has(i)) missing++;
    check(`${tag}.natural_wall_cells`, expected.size > 0 && missing === 0 && extra === 0 && maskBad === 0 && matBad === 0,
        `expected ${expected.size} exposed SOLID cells, listed ${listed.length}: missing ${missing}, extra ${extra}, wrong mask ${maskBad}, wrong material ${matBad}`);

    // The frame spec and the frame the plugin draws (UF_Levels composes it from the runtime A4 sheet).
    const spec = L.naturalWallSpec || {};
    check(`${tag}.natural_wall_spec`, spec.width === 48 && spec.height === 96 && spec.capHeight === 48 && inCapRange(spec.capColor) && inCapRange(spec.capEdgeColor),
        `spec ${spec.width}x${spec.height}, cap ${spec.capHeight} px ${spec.capColor} (edge ${spec.capEdgeColor}); allowed #08080C..#121218`);
    env.ImageManager.loadTileset("UF_GenLevels_A4");
    env.ImageManager.loadTileset("UF_GenLevels_B");
    const frame = L.naturalWallFrame("stone", 0);
    const fills = frame ? frame.ops.filter(o => o[0] === "fill") : [];
    const blits = frame ? frame.ops.filter(o => o[0] === "blt") : [];
    const capFill = fills.find(o => o[1] === 0 && o[2] === 0 && o[3] === 48 && o[4] === 48);
    check(`${tag}.natural_wall_frame`, !!frame && frame.width === 48 && frame.height === 96 && !!capFill && inCapRange(capFill[5])
        && fills.every(o => o[2] + o[4] <= 48 && inCapRange(o[5])) && blits.length === 4 && blits.every(o => o[6] >= 48 && o[6] + o[4] <= 96),
        frame ? `frame ${frame.width}x${frame.height}; fills ${fills.map(o => `${o[5]}@y${o[2]}+${o[4]}`).join(", ")}; face blits ${blits.length} at y ${blits.map(o => o[6]).join("/")}` : "no frame (A4 sheet missing)");

    // Connectors on the ground.
    const conn = L.groundConnectorCells(a, 0, 0, size - 1, size - 1);
    const connExpected = [];
    for (let i = 0; i < n; i++) if (b0.shape[i] >= RAMP) connExpected.push(i);
    const connSet = new Set(conn.map(c => c.y * size + c.x));
    const looksOk = conn.every(c => (b0.shape[c.y * size + c.x] === RAMP ? c.look === "ramp_up" : /^stair_/.test(c.look)));
    check(`${tag}.ground_connectors`, conn.length === connExpected.length && connExpected.every(i => connSet.has(i)) && looksOk && conn.length > 0,
        `${conn.length} listed of ${connExpected.length} ground ramps/stairs (ramps ${ramps0}, stairs down ${stairs0}); looks ${[...new Set(conn.map(c => c.look))].join(", ")}`);

    // The real sprite on a ground view (a window at the hill edge nearest the start's centre).
    const mid = Math.floor(size / 2);
    let edge = null, best = Infinity;
    for (const i of expected.keys()) {
        const x = i % size, y = (i - x) / size, d = Math.hypot(x - mid, y - mid);
        if (x < 20 || y < 20 || x > size - 20 || y > size - 20) continue;
        if (!solidAt(x, y + 1) && d < best) { best = d; edge = { x, y }; }
    }
    if (!edge) {
        check(`${tag}.sprite_z0`, false, "no south-facing hill edge away from the area border");
    } else {
        const fake = { _tilemap: { children: [], addChild: env.Sprite.prototype.addChild } };
        env.Spriteset_Map.prototype.createCharacters.call(fake);
        const layer = fake._ufNaturalWalls;
        env.$dataMap = map;
        env.$gameMap._mapId = W.areaMapId(a.x, a.y, 0);
        env.$gameMap._dx = edge.x - 8;
        env.$gameMap._dy = edge.y - 6;
        const view = W.viewLevel();
        layer.update();
        const x0 = Math.max(0, env.$gameMap._dx - 1), x1 = Math.min(size - 1, env.$gameMap._dx + 17 + 1);
        const y0 = Math.max(0, env.$gameMap._dy - 1), y1 = Math.min(size - 1, env.$gameMap._dy + 13 + 2);
        const want = [...expected.keys()].filter(i => { const x = i % size, y = (i - x) / size; return x >= x0 && x <= x1 && y >= y0 && y <= y1; });
        const wantConn = connExpected.filter(i => { const x = i % size, y = (i - x) / size; return x >= x0 && x <= x1 && y >= y0 && y <= y1; });
        const walls = [...layer._active.entries()].filter(([k, s]) => k >= 0 && s._ufKind === "wall");
        const conns = [...layer._active.entries()].filter(([k, s]) => k < 0 && s._ufKind === "connector");
        const wallsOk = walls.length === want.length && want.every(i => layer._active.has(i))
            && walls.every(([, s]) => s.visible && s.bitmap && s.bitmap.height === 96 && s._ufLevel === 0 && s.anchor.y === 1 && s.z >= 7);
        const edgeSprite = layer._active.get(edge.y * size + edge.x);
        const connOk = conns.length === wantConn.length && conns.every(([, s]) => s.visible && s.bitmap && s.bitmap.height === 48 && s.z < 1);
        // A ground without its column (generator 3, older saves) draws nothing.
        st.levels["0"].gen = 3;
        layer.update();
        const oldSaveCount = layer._active.size;
        st.levels["0"].gen = 4;
        layer.update();
        check(`${tag}.sprite_z0`, !!view && view.z === 0 && want.length > 0 && wallsOk && !!edgeSprite && connOk && oldSaveCount === 0 && layer._active.size === walls.length + conns.length,
            `view ${view ? `(${view.x},${view.y},${view.z})` : "none"}; window x ${x0}..${x1}, y ${y0}..${y1}: ${walls.length} wall frames for ${want.length} natural wall cells (edge (${edge.x},${edge.y}) ${edgeSprite ? `drawn ${edgeSprite.bitmap.width}x${edgeSprite.bitmap.height}` : "NOT drawn"}), ${conns.length} connector frames for ${wantConn.length} ramps/stairs; generator 3: ${oldSaveCount} sprites`);
        env.$gameMap._mapId = 0;
        env.$dataMap = null;
    }

    // Paths and units never go through a hill.
    const valley = (x, y) => x >= 0 && y >= 0 && x < size && y < size && b0.shape[y * size + x] === FLOOR && S[y * size + x] === 0 && W.walkable(a.x, a.y, x, y, { z: 0 });
    const truthSolid = (x, y, z) => {
        const b = z === 0 ? b0 : z === 1 ? b1 : z === 2 ? b2 : null;
        return !b || b.shape[y * size + x] === SOLID || b.shape[y * size + x] === OPEN;
    };
    const runs = [];
    for (let y = 24; y < size - 24; y++) {
        for (let x = 24; x < size - 34; x++) {
            if (b0.shape[y * size + x] !== SOLID || b0.shape[y * size + x - 1] === SOLID) continue;
            let len = 0;
            while (len < 12 && b0.shape[y * size + x + len] === SOLID) len++;
            if (len >= 2 && len < 12 && valley(x - 1, y) && valley(x + len, y)) runs.push({ x0: x - 1, x1: x + len, y, len, d: Math.hypot(x - mid, y - mid) });
        }
    }
    runs.sort((p, q) => p.d - q.d);
    let crossing = null;
    for (const r of runs.slice(0, 30)) {
        const p = W.findPath(a, r.x0, r.y, r.x1, r.y, { z: 0 });
        if (p && !p.partial && p.length) { crossing = { run: r, path: p }; break; }
    }
    if (!crossing) {
        check(`${tag}.path_never_solid`, false, `no complete path found across any of ${Math.min(30, runs.length)} hill runs (of ${runs.length}) nearest the start`);
    } else {
        const { run, path: p } = crossing;
        const onSolid = p.filter(c => truthSolid(c.x, c.y, c.z === undefined ? 0 : c.z));
        const throughRun = p.filter(c => (c.z || 0) === 0 && c.y === run.y && c.x > run.x0 && c.x < run.x1);
        const levels = [...new Set(p.map(c => c.z || 0))].sort();
        check(`${tag}.path_never_solid`, onSolid.length === 0 && throughRun.length === 0 && p.length > run.len + 1,
            `valley (${run.x0},${run.y}) -> (${run.x1},${run.y}) across a ${run.len}-cell hill: ${p.length} steps on levels ${levels.join(",")}; steps on solid/open ${onSolid.length}, through the hill's run ${throughRun.length}`);
    }

    // A unit sent into the hill.
    const hill = edge ? { x: edge.x, y: edge.y } : null, foot = edge ? { x: edge.x, y: edge.y + 1 } : null;
    if (!hill || !valley(foot.x, foot.y)) {
        check(`${tag}.unit_refused_hill`, false, `no valley cell at the foot of the chosen hill edge ${edge ? `(${edge.x},${edge.y + 1})` : ""}`);
    } else {
        W._frame = W._frame || 0;
        const u = W.addUnit({ name: "TEST_climber", image: { characterName: "" }, area: a, x: foot.x, y: foot.y, z: 0, exact: true, data: { kind: "test" } });
        const sent = W.sendUnit(u.id, { area: a, x: hill.x, y: hill.y, z: 0 });
        let inside = 0, reached = false;
        for (let f = 0; f < 800; f++) {
            W.update();
            if (truthSolid(u.x, u.y, u.z || 0)) inside++;
            if (u.x === hill.x && u.y === hill.y && (u.z || 0) === 0) reached = true;
        }
        check(`${tag}.unit_refused_hill`, inside === 0 && !reached,
            `sent ${sent ? "accepted" : "refused"} from (${foot.x},${foot.y}) to hill cell (${hill.x},${hill.y}); after 800 frames at (${u.x},${u.y},${u.z || 0}), frames on a solid/open cell ${inside}, reached the hill cell ${reached}`);
        W.removeUnit(u.id);
    }
    if (crossing) {
        const { run, path: p } = crossing;
        const u = W.addUnit({ name: "TEST_walker", image: { characterName: "" }, area: a, x: run.x0, y: run.y, z: 0, exact: true, data: { kind: "test" } });
        W.sendUnit(u.id, { area: a, x: run.x1, y: run.y, z: 0 });
        let inside = 0, arrived = false, frames = 0;
        const limit = 16 * (p.length + 20) * 2;
        for (; frames < limit && !arrived; frames++) {
            W.update();
            if (truthSolid(u.x, u.y, u.z || 0)) inside++;
            if (u.x === run.x1 && u.y === run.y && (u.z || 0) === 0) arrived = true;
        }
        check(`${tag}.unit_walks_legal_route`, inside === 0 && arrived,
            `walker (${run.x0},${run.y}) -> (${run.x1},${run.y}) (planned ${p.length} steps): ${arrived ? `arrived after ${frames} frames` : `not arrived after ${frames} frames, at (${u.x},${u.y},${u.z || 0})`}; frames on a solid/open cell ${inside}`);
        W.removeUnit(u.id);
    }

    // Digging into the hill at the ground, then filling it again.
    if (!edge) {
        check(`${tag}.dig_repaint`, false, "no hill edge to dig");
    } else {
        const D = { x: edge.x, y: edge.y }, ref = { area: a, x: D.x, y: D.y, z: 0 };
        const snap = () => {
            const out = [];
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) for (const layer of [0, 2, 5]) out.push(W.getTile(a.x, a.y, D.x + dx, D.y + dy, layer, 0));
            return out.join(",");
        };
        const before = snap();
        const dug = L.setShape(ref, "floor", { material: "stone", cause: "harness_dig" });
        const t = W.getTile(a.x, a.y, D.x, D.y, 0, 0);
        const kind = (T.kindOfTile(t) || {}).id;
        const openNow = W.walkable(a.x, a.y, D.x, D.y, { ground: true }) && W.walkable(a.x, a.y, D.x, D.y, { z: 0 });
        const layer2 = W.getTile(a.x, a.y, D.x, D.y, 2, 0), region = W.getTile(a.x, a.y, D.x, D.y, 5, 0);
        const wallsAfter = L.naturalWallCells(a, 0, D.x - 1, D.y - 1, D.x + 1, D.y + 1);
        const northExposed = solidAt(D.x, D.y - 1) ? wallsAfter.some(c => c.x === D.x && c.y === D.y - 1) : true;
        const digListed = wallsAfter.some(c => c.x === D.x && c.y === D.y);
        // A fresh build (with a synthetic history site: one piece on a valley cell, one inside the hill) paints what the repaint did.
        const catObjects = env.$ufWorldCatalog.objects || [];
        const objIndex = Math.max(0, catObjects.findIndex(o => o && o.id === "chest_wood"));
        const objId = catObjects[objIndex] && catObjects[objIndex].id, objType = objIndex + 1;
        let inner = null;
        for (let r = 2; r < 12 && !inner; r++) if (solidAt(D.x, D.y - r) && [[0, -1], [0, 1], [-1, 0], [1, 0]].every(([dx, dy]) => solidAt(D.x + dx, D.y - r + dy))) inner = { x: D.x, y: D.y - r };
        let outer = null;
        for (let r = 3; r < 12 && !outer; r++) if (valley(D.x, D.y + r) && !map.ufObjects[(D.y + r) * size + D.x]) outer = { x: D.x, y: D.y + r };
        const realHistory = env.UF.History;
        const site = inner && outer ? { id: "TEST_site", x: outer.x, y: outer.y, radius: 0, pieces: [{ object: objId, dx: 0, dy: 0 }, { object: objId, dx: inner.x - outer.x, dy: inner.y - outer.y }] } : null;
        env.UF.History = { sitesIn: (ax, ay) => (site && ax === a.x && ay === a.y ? [site] : []) };
        const fresh = W.buildArea(a.x, a.y, 0);
        const vsSite = Object.assign({}, G.volumeStats[`${a.x},${a.y}`] || {});
        if (realHistory) env.UF.History = realHistory; else delete env.UF.History;
        let buildDiff = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) for (const layer of [0, 2, 5]) {
            const i = (layer * size + D.y + dy) * size + D.x + dx;
            if (fresh.data[i] !== W.getTile(a.x, a.y, D.x + dx, D.y + dy, layer, 0)) buildDiff++;
        }
        const filled = L.setShape(ref, "solid", { material: "stone", cause: "harness_fill" });
        const after = snap();
        const closed = !W.walkable(a.x, a.y, D.x, D.y, { ground: true }) && !W.walkable(a.x, a.y, D.x, D.y, { z: 0 });
        check(`${tag}.dig_repaint`, dug && kind === "rock" && openNow && layer2 === 0 && region === 0 && !digListed && northExposed && buildDiff === 0 && filled && after === before && closed,
            `dig (${D.x},${D.y}): setShape floor ${dug}, ground ${kind}, walkable ${openNow}, layer2 ${layer2}, region ${region}, still a wall ${digListed}, cell north now exposed ${northExposed}; fresh build differs on ${buildDiff} of 27 tiles; fill: setShape solid ${filled}, tiles restored ${after === before}, blocked ${closed}`);
        if (!site) check(`${tag}.site_pieces_skipped`, false, "no inner hill cell / free valley cell for the synthetic site");
        else {
            const onValley = fresh.ufObjects[outer.y * size + outer.x], onHill = fresh.ufObjects[inner.y * size + inner.x];
            check(`${tag}.site_pieces_skipped`, onValley === objType && onHill === 0 && vsSite.sitePiecesSkipped === 1,
                `site "${objId}" pieces: valley (${outer.x},${outer.y}) -> type ${onValley} (want ${objType}), hill (${inner.x},${inner.y}) -> type ${onHill} (want 0); sitePiecesSkipped ${vsSite.sitePiecesSkipped}`);
        }
    }

    if (withHistory) {
        // The whole built ground with the real history (camps, founders' chests) on it.
        let onSolid = [];
        const m2 = W.peekArea(a.x, a.y, 0);
        for (let i = 0; i < n; i++) if (b0.shape[i] === SOLID && m2.ufObjects[i]) onSolid.push(`(${i % size},${Math.floor(i / size)}) ${(O.type(m2.ufObjects[i]) || {}).id}`);
        check(`${tag}.history_objects_off_solid`, onSolid.length === 0, `${onSolid.length} object(s) of the real history on ground SOLID cells${onSolid.length ? ": " + onSolid.slice(0, 5).join(", ") : ""}`);
    }

    check(`${tag}.no_errors`, env.__errors.length === 0, env.__errors.length ? env.__errors.slice(0, 2).join(" | ").slice(0, 400) : `none (${env.__warnings.length} warning(s))`);
    return env;
}

const started = performance.now();
console.log(`=== Volumetric terrain column (DEUS-TSK-FABLE-16 part 3): seeds ${SEEDS.join(", ")}${mutant ? `, mutant ${mutant}` : ""} ===`);
try {
    for (const seed of SEEDS) runSeed(seed);
} catch (e) {
    harnessProblem(`exception: ${e && e.stack ? e.stack.split("\n").slice(0, 4).join(" | ") : e}`);
}
const code = failed ? 1 : 0;
console.log(`TIME ${((performance.now() - started) / 1000).toFixed(1)} s`);
if (failures.length) console.log(`FAILED CHECKS: ${failures.join(", ")}`);
console.log(`RESULT: ${passed} passed, ${failed} failed (exit ${code})`);
process.exit(code);
