#!/usr/bin/env node
"use strict";
/**
 * tools/zrange/bench_queries.js (WG.00.17, lane AA): the per-call cost of the hot cell queries and of the 3D path search,
 * at a commit or the working tree, in a Node vm (the RMMZ stubs of tools/test_strata_foundation.js). A diagnostic for
 * the query path's overhead (the planner calls these millions of times); in-game numbers are the bench's and the
 * world suite's.
 *
 * Usage: node tools/zrange/bench_queries.js [--commit=<sha>] [--seed=18] [--z-range=a..b] [--rounds=3]
 * Prints ns per call for shapeCodeAt (numeric and ref forms), World.isLevel, World.inWorld, hasOpaqueOverburden,
 * getStrataFluidPassage, and ms per World.findPath of 60 seeded routes of 40-80 cells on the ground.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { performance } = require("perf_hooks");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const args = process.argv.slice(2);
const arg = (n, d) => { const a = args.find(x => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const COMMIT = arg("commit", ""), SEED = Number(arg("seed", "18")), ROUNDS = Number(arg("rounds", "3"));
const FILES = ["DEUS_World.js", "DEUS_WorldGen.js", "DEUS_Tiles.js", "DEUS_Objects.js", "DEUS_Levels.js", "DEUS_Floors.js"];
const read = rel => COMMIT ? execFileSync("git", ["show", `${COMMIT}:${rel}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 256 << 20 }) : fs.readFileSync(path.join(ROOT, rel), "utf8");

function setup() {
    const list = {};
    vm.runInNewContext(read("game/js/plugins.js"), list);
    const ns = {};
    const canvasCtx = () => ({ imageSmoothingEnabled: false, createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }), putImageData() {}, drawImage() {}, fillRect() {}, clearRect() {}, getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) });
    const env = {
        window: null, UF: ns, DEUS: ns, Math, performance, setTimeout, clearTimeout, process: { env: { DEUS_Z_RANGE: arg("z-range", "") } },
        console: { log() {}, warn() {}, error() {} },
        document: { createElement: () => ({ width: 0, height: 0, getContext: canvasCtx }) },
        PluginManager: { parameters: name => (list.$plugins && list.$plugins.find(p => p.name === name) || {}).parameters || {}, registerCommand() {} },
        DataManager: { _databaseFiles: [], onLoad() {}, isBattleTest: () => false, isEventTest: () => false, createGameObjects() {} },
        Input: { keyMapper: {} }, TouchInput: { _currentState: {} }, SceneManager: { _scene: null },
        Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 }, ImageManager: { loadTileset() { return null; } },
        Utils: { isOptionValid: () => false, encodeURI: s => s }, Tilemap: function() {},
        $dataTilesets: JSON.parse(read("game/data/Tilesets.json")), $ufWorldCatalog: JSON.parse(read("game/data/UF_WorldCatalog.json")),
        $ufTime: { year: 1, monthIndex: 0, day: 1, hour: 8, minute: 0 },
        $gameSystem: {}, $gameScreen: { weatherType: () => "none", weatherPower: () => 0, changeWeather() {} },
        $gameTimer: {}, $gameSwitches: {}, $gameVariables: {}, $gameSelfSwitches: {}, $gameActors: {}, $gameParty: {}
    };
    env.window = env;
    env.$deusWorldCatalog = env.$ufWorldCatalog;
    env.Tilemap.TILE_ID_A1 = 2048; env.Tilemap.TILE_ID_A2 = 2816;
    env.Tilemap.isTileA1 = id => id >= 2048 && id < 2816;
    env.Tilemap.isWaterTile = id => env.Tilemap.isTileA1(id);
    for (const name of ["Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot", "Rectangle", "Game_Map", "Game_Player", "Game_CharacterBase", "Game_Event", "Spriteset_Map", "Spriteset_Base"]) {
        env[name] = vm.runInNewContext(`(function ${name}(){})`);
        env[name].prototype.initialize = function() {};
    }
    env.Scene_Boot.prototype.start = function() {};
    env.Scene_Boot.prototype.isReady = function() { return true; };
    env.Spriteset_Map.prototype.createCharacters = function() {};
    env.Sprite = vm.runInNewContext(`(function Sprite(bitmap) { this.anchor = { x: 0, y: 0, set(a, b) { this.x = a; this.y = b; } }; this.children = []; this.parent = null; this.visible = true; this.bitmap = bitmap || null; this.x = 0; this.y = 0; this.z = 0; })`);
    Object.assign(env.Sprite.prototype, { update() {}, addChild(c) { c.parent = this; this.children.push(c); return c; } });
    env.Bitmap = vm.runInNewContext(`(function Bitmap(w, h) { this.width = w || 0; this.height = h || 0; this.context = { imageSmoothingEnabled: false, drawImage() {}, putImageData() {}, fillRect() {} }; this._baseTexture = { update() {} }; })`);
    Object.assign(env.Bitmap.prototype, { isReady() { return true; }, isError() { return false; }, clear() {}, clearRect() {}, fillRect() {}, blt() {} });
    env.Bitmap.load = () => ({ isReady: () => false, isError: () => false });
    Object.assign(env.Game_Map.prototype, { mapId() { return this._mapId || 0; }, width: () => 256, height: () => 256, update() {}, tileId: () => 0, tilesetFlags: () => [], isPassable: () => true, checkPassage: () => true,
        displayX() { return 0; }, displayY() { return 0; }, screenTileX: () => 17, screenTileY: () => 13, adjustX(x) { return x; }, adjustY(y) { return y; },
        roundXWithDirection: (x, d) => x + (d === 6 ? 1 : d === 4 ? -1 : 0), roundYWithDirection: (y, d) => y + (d === 2 ? 1 : d === 8 ? -1 : 0), eventsXy: () => [], eventsXyNt: () => [] });
    Object.assign(env.Game_Player.prototype, { isTransferring: () => false, direction: () => 2, locate(x, y) { this.x = x; this.y = y; } });
    env.$gameMap = new env.Game_Map(); env.$gameMap._events = [];
    env.$gamePlayer = new env.Game_Player(); env.$gamePlayer.x = 128; env.$gamePlayer.y = 128;
    // A context without interceptors (node >= 22.8): globals cost what they cost in the game (a contextified vm is ~10x slower on them).
    const ctx = vm.createContext(vm.constants.DONT_CONTEXTIFY);
    for (const k of Object.keys(env)) ctx[k] = env[k];
    ctx.window = ctx;
    env.__ctx = ctx;
    const section = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i + a.length); return src.slice(i, j); };
    const core = read("game/js/rmmz_core.js"), mgr = read("game/js/rmmz_managers.js"), deus = read("game/js/plugins/DEUS_Core.js");
    vm.runInContext(section(mgr, "DataManager.makeSaveContents =", "DataManager.correctDataErrors ="), ctx);
    vm.runInContext(section(core, "function JsonEx()", "//-----------------------------------------------------------------------------"), ctx);
    vm.runInContext(section(core, "Tilemap.TILE_ID_B =", "Tilemap.Layer ="), ctx);
    vm.runInContext(section(deus, "window.DEUS = window.DEUS || {};", "//-----------------------------------------------------------------------------"), ctx);
    for (const f of FILES) vm.runInContext(read(`game/js/plugins/${f}`), ctx, { filename: f });
    ctx.DataManager.onLoad(ctx.$dataTilesets);
    new ctx.Scene_Boot().start();
    return ctx;
}

const env = setup();
const W = env.UF.World, L = env.UF.Levels;
env.UF.NewGameSetup = { seed: SEED, year: 1 };
const t0 = performance.now();
W.newWorld(SEED);
const tNew = performance.now() - t0;
const st = W.state, size = st.size, a = { x: st.startArea.x, y: st.startArea.y };
const levels = [-2, -1, 0, 1, 2];
if (process.execArgv.includes("--allow-natives-syntax")) {
    const fast = new Function("o", "return %HasFastProperties(o)");
    console.log(`World: ${Object.getOwnPropertyNames(W).length} own properties, fast ${fast(W)}; Levels: ${Object.getOwnPropertyNames(L).length}, fast ${fast(L)}`);
}
const pts = [];
for (let k = 0; k < 4096; k++) pts.push({ x: (97 + ((k * 37) % 65)) % size, y: (101 + ((k * 61) % 49)) % size, z: levels[k % 5] });
const refs = pts.map(p => ({ area: a, x: p.x, y: p.y, z: p.z }));
for (const z of levels) L.shapeCodeAt(a.x, a.y, 0, 0, z);
function bench(name, fn, N = 2000000) {
    let acc = 0;
    for (let k = 0; k < 200000; k++) acc += fn(k & 4095) | 0;
    const out = [];
    for (let r = 0; r < ROUNDS; r++) { const t = performance.now(); for (let k = 0; k < N; k++) acc += fn(k & 4095) | 0; out.push((performance.now() - t) * 1e6 / N); }
    out.sort((p, q) => p - q);
    console.log(`${name.padEnd(34)} ${out[0].toFixed(1)} ns/call (min of ${ROUNDS}; ${out.map(v => v.toFixed(1)).join(" / ")})  [${acc & 1}]`);
}
console.log(`=== bench_queries ${COMMIT ? COMMIT.slice(0, 8) : "working tree"}, seed ${SEED}, New Game ${tNew.toFixed(0)} ms, levels ${W.LEVELS.length} ===`);
const ONLY_PATH = args.includes("--path-only");
if (!ONLY_PATH) bench("Levels.shapeCodeAt (ax,ay,x,y,z)", k => L.shapeCodeAt(a.x, a.y, pts[k].x, pts[k].y, pts[k].z));
if (!ONLY_PATH) bench("Levels.shapeCodeAt (ref)", k => L.shapeCodeAt(refs[k]));
if (!ONLY_PATH) bench("World.isLevel", k => W.isLevel(pts[k].z) ? 1 : 0, 5000000);
if (!ONLY_PATH) bench("World.inWorld", k => W.inWorld(a.x, a.y, pts[k].z) ? 1 : 0, 5000000);
if (!ONLY_PATH) bench("Levels.hasOpaqueOverburden", k => L.hasOpaqueOverburden(refs[k]) ? 1 : 0, 500000);
if (!ONLY_PATH) bench("Levels.getStrataFluidPassage", k => L.getStrataFluidPassage(refs[k]), 1000000);
// 3D path searches on the ground: 60 seeded routes of 40-80 cells between walkable cells.
const rng = W.mulberry32(SEED * 7 + 1);
const routes = [];
for (let tries = 0; routes.length < 60 && tries < 20000; tries++) {
    const sx = 20 + Math.floor(rng() * 216), sy = 20 + Math.floor(rng() * 216), gx = 20 + Math.floor(rng() * 216), gy = 20 + Math.floor(rng() * 216);
    const d = Math.max(Math.abs(gx - sx), Math.abs(gy - sy));
    if (d < 40 || d > 80 || !W.walkable(a.x, a.y, sx, sy, { z: 0 }) || !W.walkable(a.x, a.y, gx, gy, { z: 0 })) continue;
    routes.push([sx, sy, gx, gy]);
}
for (const r of routes) W.findPath(a, r[0], r[1], r[2], r[3], { z: 0 });   // warm up (grids, JIT)
const pr = [];
for (let round = 0; round < ROUNDS; round++) {
    const t = performance.now();
    let found = 0;
    for (const r of routes) if (W.findPath(a, r[0], r[1], r[2], r[3], { z: 0 })) found++;
    pr.push({ ms: (performance.now() - t) / routes.length, found });
}
pr.sort((p, q) => p.ms - q.ms);
console.log(`${"World.findPath (3D, ground)".padEnd(34)} ${pr[0].ms.toFixed(3)} ms/plan (min of ${ROUNDS}; ${pr.map(p => p.ms.toFixed(3)).join(" / ")}); ${routes.length} routes, ${pr[0].found} found; last plan expanded ${W.lastPath ? W.lastPath.expanded : "?"}`);
