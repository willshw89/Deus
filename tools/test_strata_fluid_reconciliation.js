#!/usr/bin/env node
"use strict";

/**
 * tools/test_strata_fluid_reconciliation.js
 *
 * Verification suite for WG.00.07: Fluid <-> Five-Strata Reconciliation.
 * Tests physical capacity derivation from strata, gravity drain through strata openings,
 * lateral flow respecting floor lips, mass conservation, displacement on geometry changes,
 * zero fluid HP, save/reload fidelity, zero quiescent cost, and negative mutant controls.
 *
 * Usage:
 *   node tools/test_strata_fluid_reconciliation.js
 *   node tools/test_strata_fluid_reconciliation.js --mutant=<name>
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");

const argv = process.argv.slice(2);
const mutant = (argv.find(a => a.startsWith("--mutant=")) || "").slice(9);
const quiet = argv.includes("--quiet");

const MUTANTS = {
    ignore_capacity: true,
    leak_through_floor: true,
    destroy_creates_no_capacity: true,
    fluid_has_hp: true,
    delete_volume: true
};

if (mutant && !MUTANTS[mutant]) {
    console.error(`Unknown mutant "${mutant}". Known: ${Object.keys(MUTANTS).join(", ")}`);
    process.exit(2);
}

const FILES = ["DEUS_World.js", "DEUS_WorldGen.js", "DEUS_Tiles.js", "DEUS_Objects.js", "DEUS_Levels.js", "DEUS_Floors.js", "DEUS_Fluid.js"];

function buildEnvironment(mutantName = "") {
    const list = {};
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, "game/js/plugins.js"), "utf8"), list);
    const ns = {}, warnings = [], errors = [];
    const canvasCtx = () => ({
        imageSmoothingEnabled: false, createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
        putImageData() {}, drawImage() {}, fillRect() {}, clearRect() {}, getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })
    });
    const env = {
        window: null, UF: ns, DEUS: ns, Math, performance, setTimeout, clearTimeout, setInterval, clearInterval,
        console: {
            log: (...a) => { if (!quiet && process.env.DEUS_VM_LOG) console.log("  [VM]", ...a); },
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
        if (i < 0 || j <= i) throw new Error(`engine source section missing: ${a}`);
        return src.slice(i, j);
    };
    const core = fs.readFileSync(path.join(ROOT, "game/js/rmmz_core.js"), "utf8");
    const mgr = fs.readFileSync(path.join(ROOT, "game/js/rmmz_managers.js"), "utf8");
    const deus = fs.readFileSync(path.join(PLUGINS, "DEUS_Core.js"), "utf8");
    vm.runInContext(section(mgr, "DataManager.makeSaveContents =", "DataManager.correctDataErrors ="), ctx, { filename: "rmmz_managers.js" });
    vm.runInContext(section(core, "function JsonEx()", "//-----------------------------------------------------------------------------"), ctx, { filename: "rmmz_core.js JsonEx" });
    vm.runInContext(section(core, "Tilemap.TILE_ID_B =", "Tilemap.Layer ="), ctx, { filename: "rmmz_core.js Tilemap constants" });
    vm.runInContext(section(deus, "window.DEUS = window.DEUS || {};", "//-----------------------------------------------------------------------------"), ctx, { filename: "DEUS_Core.js events" });

    // Load sources with mutation if requested
    const sources = {};
    for (const f of FILES) sources[f] = fs.readFileSync(path.join(PLUGINS, f), "utf8");

    if (mutantName === "ignore_capacity") {
        sources["DEUS_Fluid.js"] = sources["DEUS_Fluid.js"].replace(/Math\.min\(maxTransfer, nCap - nDepth\)/g, "maxTransfer /* MUTANT ignore_capacity */");
    } else if (mutantName === "leak_through_floor") {
        sources["DEUS_Fluid.js"] = sources["DEUS_Fluid.js"].replace("if ((pass & 8) === 0) return false;", "/* MUTANT leak_through_floor */");
    } else if (mutantName === "destroy_creates_no_capacity") {
        sources["DEUS_Levels.js"] = sources["DEUS_Levels.js"].replace("const open = STRATA - (SOLID_B[rdM[rdO]] + SOLID_B[rdM[rdO + 1]] + SOLID_B[rdM[rdO + 2]] + SOLID_B[rdM[rdO + 3]] + SOLID_B[rdM[rdO + 4]]);", "const open = 2; /* MUTANT destroy_creates_no_capacity */");
    } else if (mutantName === "fluid_has_hp") {
        sources["DEUS_Levels.js"] = sources["DEUS_Levels.js"].replace(`{ id: M_WATER, key: "water", solid: false, fluid: true, maxHP: 0`, `{ id: M_WATER, key: "water", solid: true, fluid: false, maxHP: 100 /* MUTANT */`);
    } else if (mutantName === "delete_volume") {
        sources["DEUS_Fluid.js"] = sources["DEUS_Fluid.js"].replace(/depth -= transferAmt;/g, "depth = 0; /* MUTANT delete_volume */");
    }

    for (const f of FILES) vm.runInContext(sources[f], ctx, { filename: f });
    env.DataManager.onLoad(env.$dataTilesets);
    new env.Scene_Boot().start();

    // Generate new world
    env.UF.NewGameSetup = { seed: 20260923, year: 1 };
    env.UF.World.newWorld(20260923);

    env.__warnings = warnings;
    env.__errors = errors;
    return env;
}

let passes = 0, fails = 0;
function assert(name, condition, detail = "") {
    if (condition) {
        passes++;
        if (!quiet) console.log(`PASS: ${name}${detail ? " - " + detail : ""}`);
    } else {
        fails++;
        console.error(`FAIL: ${name}${detail ? " - " + detail : ""}`);
    }
}

function runSuite() {
    console.log(`=== DEUS Fluid <-> Five-Strata Reconciliation Suite (WG.00.07) ===\n`);

    const env = buildEnvironment(mutant);
    const Levels = env.UF.Levels;
    const Fluid = env.UF.Fluid;
    const Events = env.UF.Events;

    const area = { x: 0, y: 0 };

    function setStrata(x, y, z, m) {
        return Levels.setStrata({ area, x, y, z }, {
            m,
            hp: m.map(mat => (mat === "air" || mat === "water" || mat === "lava") ? 0 : 255)
        });
    }

    // --- Section 1: Physical Capacity Derivation from Strata (Tests A - F) ---
    console.log(`--- 1. Physical Capacity Derivation from Strata (Tests A-F) ---`);

    // A: 5/5 open cell (5 air strata)
    setStrata(5, 5, 0, ["air", "air", "air", "air", "air"]);
    const capA = Fluid.fluidCapacityAt(0, 0, 5, 5, 0);
    assert("cap_5_of_5", capA === 7, `5 air strata -> capacity 7 (got ${capA})`);
    Fluid.setCell(area, 5, 5, 0, "water", 7);
    const physA = Fluid.fluidPhysicalHeightStateAt(0, 0, 5, 5, 0);
    assert("phys_height_5_of_5", physA === 5, `7 water in 5-air cell -> physical height 5/5 (got ${physA})`);
    assert("phys_string_5_of_5", Fluid.fluidPhysicalHeightStringAt(0, 0, 5, 5, 0) === "FLUID_5_OF_5", `string matches FLUID_5_OF_5`);
    assert("levels_alias_phys_height", Levels.fluidPhysicalHeightStateAt(0, 0, 5, 5, 0) === 5, `Levels alias matches live Fluid physical height`);
    Fluid.setCell(area, 5, 5, 0, 0, 0);

    // B: 4/5 open cell (1 solid stratum, 4 air strata)
    setStrata(6, 5, 0, ["stone", "air", "air", "air", "air"]);
    const capB = Fluid.fluidCapacityAt(0, 0, 6, 5, 0);
    assert("cap_4_of_5", capB === 6, `4 air strata -> capacity 6 (got ${capB})`);
    Fluid.setCell(area, 6, 5, 0, "water", 6);
    const physB = Fluid.fluidPhysicalHeightStateAt(0, 0, 6, 5, 0);
    assert("phys_height_4_of_5", physB === 4, `6 water in 4-air cell -> physical height 4/5 (got ${physB})`);
    Fluid.setCell(area, 6, 5, 0, 0, 0);

    // C: 3/5 open cell (2 solid strata, 3 air strata)
    setStrata(7, 5, 0, ["stone", "stone", "air", "air", "air"]);
    const capC = Fluid.fluidCapacityAt(0, 0, 7, 5, 0);
    assert("cap_3_of_5", capC === 4, `3 air strata -> capacity 4 (got ${capC})`);
    Fluid.setCell(area, 7, 5, 0, "water", 4);
    const physC = Fluid.fluidPhysicalHeightStateAt(0, 0, 7, 5, 0);
    assert("phys_height_3_of_5", physC === 3, `4 water in 3-air cell -> physical height 3/5 (got ${physC})`);
    Fluid.setCell(area, 7, 5, 0, 0, 0);

    // D: 2/5 open cell (3 solid strata, 2 air strata)
    setStrata(8, 5, 0, ["stone", "stone", "stone", "air", "air"]);
    const capD = Fluid.fluidCapacityAt(0, 0, 8, 5, 0);
    assert("cap_2_of_5", capD === 3, `2 air strata -> capacity 3 (got ${capD})`);
    Fluid.setCell(area, 8, 5, 0, "water", 3);
    const physD = Fluid.fluidPhysicalHeightStateAt(0, 0, 8, 5, 0);
    assert("phys_height_2_of_5", physD === 2, `3 water in 2-air cell -> physical height 2/5 (got ${physD})`);
    Fluid.setCell(area, 8, 5, 0, 0, 0);

    // E: 1/5 open cell (4 solid strata, 1 air stratum)
    setStrata(9, 5, 0, ["stone", "stone", "stone", "stone", "air"]);
    const capE = Fluid.fluidCapacityAt(0, 0, 9, 5, 0);
    assert("cap_1_of_5", capE === 1, `1 air stratum -> capacity 1 (got ${capE})`);
    Fluid.setCell(area, 9, 5, 0, "water", 1);
    const physE = Fluid.fluidPhysicalHeightStateAt(0, 0, 9, 5, 0);
    assert("phys_height_1_of_5", physE === 1, `1 water in 1-air cell -> physical height 1/5 (got ${physE})`);
    Fluid.setCell(area, 9, 5, 0, 0, 0);

    // F: 0/5 open cell (5 solid strata)
    setStrata(10, 5, 0, ["stone", "stone", "stone", "stone", "stone"]);
    const capF = Fluid.fluidCapacityAt(0, 0, 10, 5, 0);
    assert("cap_0_of_5", capF === 0, `5 solid strata -> capacity 0 (got ${capF})`);
    const physF = Fluid.fluidPhysicalHeightStateAt(0, 0, 10, 5, 0);
    assert("phys_height_0_of_5", physF === 0, `solid cell -> physical height 0 (got ${physF})`);

    // --- Section 2: Vertical Flow Contracts (Tests G & H) ---
    console.log(`\n--- 2. Vertical Flow Contracts (Tests G & H) ---`);

    // G: Downward gravity drain through open strata
    setStrata(12, 10, 0, ["air", "air", "air", "air", "air"]);
    // Wall around (12, 10, -1) so water stays in cell without spreading on Z-1
    setStrata(11, 10, -1, ["stone", "stone", "stone", "stone", "stone"]);
    setStrata(13, 10, -1, ["stone", "stone", "stone", "stone", "stone"]);
    setStrata(12, 9, -1, ["stone", "stone", "stone", "stone", "stone"]);
    setStrata(12, 11, -1, ["stone", "stone", "stone", "stone", "stone"]);
    setStrata(12, 10, -1, ["stone", "air", "air", "air", "air"]); // Stone floor on Z-1
    const canPassDownOpen = Fluid.fluidCanPassDown(0, 0, 12, 10, 0);
    assert("can_pass_down_open", canPassDownOpen === true, `open hole allows downward drainage (got ${canPassDownOpen})`);
    Fluid.setCell(area, 12, 10, 0, "water", 6);
    Fluid.setCell(area, 12, 10, -1, 0, 0);
    for (let t = 0; t < 10; t++) Fluid.step(area, 64);
    const z0Drain = Fluid.depthAt(0, 0, 12, 10, 0);
    const zMinus1Drain = Fluid.depthAt(0, 0, 12, 10, -1);
    assert("gravity_drain_executed", z0Drain === 0 && zMinus1Drain === 6,
        `6 water drained completely from Z0 to Z-1 (Z0: ${z0Drain}, Z-1: ${zMinus1Drain})`);


    // H: Downward gravity blocked by solid floor
    setStrata(14, 10, 0, ["stone", "air", "air", "air", "air"]); // solid S0
    setStrata(14, 10, -1, ["air", "air", "air", "air", "air"]);
    const canPassDownFloor = Fluid.fluidCanPassDown(0, 0, 14, 10, 0);
    assert("can_pass_down_solid_floor_blocked", canPassDownFloor === false, `solid floor blocks downward drainage (got ${canPassDownFloor})`);
    Fluid.setCell(area, 14, 10, 0, "water", 6);
    Fluid.setCell(area, 14, 10, -1, 0, 0);
    for (let t = 0; t < 10; t++) Fluid.step(area, 64);
    const z0Floor = Fluid.depthAt(0, 0, 14, 10, 0);
    const zMinus1Floor = Fluid.depthAt(0, 0, 14, 10, -1);
    assert("no_leak_through_solid_floor", z0Floor === 6 && zMinus1Floor === 0,
        `water retained on stone floor without leaking (Z0: ${z0Floor}, Z-1: ${zMinus1Floor})`);

    // --- Section 3: Lateral Passage & Elevation Lips (Test I) ---
    console.log(`\n--- 3. Lateral Passage & Elevation Lips (Test I) ---`);

    // Source cell (16,10,0): S0 stone floor, 4 air strata (cap 6). Surface elevation = 10
    // Wall around source to isolate it, except east to curb
    setStrata(15, 10, 0, ["stone", "stone", "stone", "stone", "stone"]);
    setStrata(16, 9, 0, ["stone", "stone", "stone", "stone", "stone"]);
    setStrata(16, 11, 0, ["stone", "stone", "stone", "stone", "stone"]);
    setStrata(16, 10, 0, ["stone", "air", "air", "air", "air"]);

    // Dest curb cell (17,10,0): S0..S3 stone (4 solid strata, 1 air stratum, cap 1). Surface elevation = 13
    setStrata(17, 10, 0, ["stone", "stone", "stone", "stone", "air"]);
    setStrata(18, 10, 0, ["stone", "stone", "stone", "stone", "stone"]); // wall beyond
    setStrata(17, 9, 0, ["stone", "stone", "stone", "stone", "stone"]);
    setStrata(17, 11, 0, ["stone", "stone", "stone", "stone", "stone"]);

    // Test shallow water in source: depth 1 -> strata height 1 -> 10 + 1 = 11 <= 13 (curb)
    Fluid.setCell(area, 16, 10, 0, "water", 1);
    Fluid.setCell(area, 17, 10, 0, 0, 0);
    const canPassShallow = Fluid.fluidCanPassLaterally(0, 0, 16, 10, 0, 17, 10, 0);
    assert("lateral_curb_shallow_blocked", canPassShallow === false, `shallow water below curb lip cannot climb (got ${canPassShallow})`);

    // Test deep water in source: depth 6 -> strata height 4 -> 10 + 4 = 14 > 13 (curb)
    Fluid.setCell(area, 16, 10, 0, "water", 6);
    const canPassDeep = Fluid.fluidCanPassLaterally(0, 0, 16, 10, 0, 17, 10, 0);
    assert("lateral_curb_deep_spills", canPassDeep === true, `deep water exceeding curb height spills over (got ${canPassDeep})`);

    // Step simulation: fluid equalizes over curb, strictly respecting curb capacity of 1
    for (let t = 0; t < 20; t++) Fluid.step(area, 64);
    const curbDepth = Fluid.depthAt(0, 0, 17, 10, 0);
    const curbCap = Fluid.fluidCapacityAt(0, 0, 17, 10, 0);
    assert("neighbor_capacity_honored", curbDepth <= curbCap && curbDepth > 0,
        `curb fluid strictly bounded by its capacity of ${curbCap} (got ${curbDepth})`);

    // Clean up cells
    Fluid.setCell(area, 16, 10, 0, 0, 0);
    Fluid.setCell(area, 17, 10, 0, 0, 0);

    // --- Section 4: Dynamic Mutation & Displacement (Tests J & K) ---
    console.log(`\n--- 4. Dynamic Mutation & Displacement (Tests J & K) ---`);

    // J: Mining/destroying stratum increases open strata capacity
    setStrata(20, 10, 0, ["stone", "stone", "stone", "air", "air"]); // 3 solid, 2 air -> cap 3
    const capBeforeDig = Fluid.fluidCapacityAt(0, 0, 20, 10, 0);
    assert("cap_before_dig", capBeforeDig === 3, `initial capacity 3 (got ${capBeforeDig})`);

    // Damage S2 until destroyed
    Levels.damageStrata({ area, x: 20, y: 10, z: 0, stratum: 2 }, 300, "dig");
    const capAfterDig = Fluid.fluidCapacityAt(0, 0, 20, 10, 0);
    assert("dig_increases_capacity", capAfterDig === 4, `mining S2 increases capacity from 3 to 4 (got ${capAfterDig})`);

    // K: Constructing solid strata displaces fluid to adjacent air without mass loss
    // Create an enclosed basin with room above on Z+1
    setStrata(22, 10, 0, ["stone", "air", "air", "air", "air"]); // 4 air strata
    setStrata(22, 10, 1, ["air", "air", "air", "air", "air"]);   // Z+1 open air headroom
    // Put 6 water in (22,10,0)
    Fluid.setCell(area, 22, 10, 0, "water", 6);
    assert("water_in_cell_before_build", Fluid.depthAt(0, 0, 22, 10, 0) === 6, `6 water placed in cell`);

    // Fill (22,10,0) with solid rock (5 solid strata)
    setStrata(22, 10, 0, ["stone", "stone", "stone", "stone", "stone"]);
    const depthInSolid = Fluid.depthAt(0, 0, 22, 10, 0);
    assert("no_fluid_in_solid_rock", depthInSolid === 0, `solid rock contains 0 fluid after construction (got ${depthInSolid})`);

    // Fluid was displaced upward into Z+1
    const displacedZ1 = Fluid.depthAt(0, 0, 22, 10, 1);
    assert("fluid_displaced_upward", displacedZ1 === 6, `fluid displaced into open headroom on Z+1 (got ${displacedZ1})`);

    // Clean up
    Fluid.setCell(area, 22, 10, 1, 0, 0);

    // --- Section 5: Mass Conservation (Test L) ---
    console.log(`\n--- 5. Mass Conservation (Test L) ---`);
    // Create a 3x3 isolated pool on Z0
    for (let x = 24; x <= 28; x++) {
        for (let y = 24; y <= 28; y++) {
            if (x === 24 || x === 28 || y === 24 || y === 28) {
                setStrata(x, y, 0, ["stone", "stone", "stone", "stone", "stone"]); // walls
            } else {
                setStrata(x, y, 0, ["stone", "air", "air", "air", "air"]); // basin floor
                Fluid.setCell(area, x, y, 0, 0, 0);
            }
        }
    }
    // Put uneven fluid in basin
    Fluid.setCell(area, 25, 25, 0, "water", 6);
    Fluid.setCell(area, 26, 25, 0, "water", 4);
    Fluid.setCell(area, 25, 26, 0, "water", 2);

    function sumBasinVolume() {
        let sum = 0;
        for (let x = 25; x <= 27; x++) {
            for (let y = 25; y <= 27; y++) {
                sum += Fluid.depthAt(0, 0, x, y, 0);
            }
        }
        return sum;
    }

    const initialSum = sumBasinVolume();
    assert("initial_sum_set", initialSum === 12, `initial fluid volume is 12 (got ${initialSum})`);

    for (let t = 0; t < 50; t++) Fluid.step(area, 64);
    const finalSum = sumBasinVolume();
    assert("closed_loop_mass_conserved", finalSum === initialSum,
        `volume conserved across 50 simulation steps (initial: ${initialSum}, final: ${finalSum})`);

    // Clean up basin
    for (let x = 25; x <= 27; x++) {
        for (let y = 25; y <= 27; y++) {
            Fluid.setCell(area, x, y, 0, 0, 0);
        }
    }

    // --- Section 6: Zero Fluid HP (Test M) ---
    console.log(`\n--- 6. Zero Fluid HP (Test M) ---`);
    const waterMat = Levels.STRATA_MATERIALS.find(m => m.key === "water");
    const lavaMat = Levels.STRATA_MATERIALS.find(m => m.key === "lava");
    assert("water_mat_zero_hp", waterMat && !waterMat.solid && waterMat.maxHP === 0, `water strata material defines maxHP = 0, solid = false`);
    assert("lava_mat_zero_hp", lavaMat && !lavaMat.solid && lavaMat.maxHP === 0, `lava strata material defines maxHP = 0, solid = false`);

    // Set a pool cell with water stratum S1
    setStrata(30, 10, 0, ["stone", "water", "water", "air", "air"]);
    const dmgRes = Levels.damageStrata({ area, x: 30, y: 10, z: 0, stratum: 1 }, 100, "strike");
    assert("fluid_stratum_immune_to_damage", dmgRes && dmgRes.hit === false && dmgRes.fluid === true,
        `damaging fluid stratum refused structural damage (hit: ${dmgRes && dmgRes.hit}, fluid: ${dmgRes && dmgRes.fluid})`);

    // --- Section 7: Serialization & Reload Fidelity (Test N) ---
    console.log(`\n--- 7. Serialization & Reload Fidelity (Test N) ---`);
    setStrata(31, 10, 0, ["stone", "air", "air", "air", "air"]);
    Fluid.setCell(area, 31, 10, 0, "water", 5);

    // Save through DataManager
    const savedContents = env.DataManager.makeSaveContents();
    assert("save_contents_has_fluid", (savedContents.ufFluid || savedContents.deusFluid) && (savedContents.ufFluid || savedContents.deusFluid).fluidSchemaVersion === 1,
        `save contents includes versioned fluid schema 1`);

    // Clear and reload
    Fluid.setCell(area, 31, 10, 0, 0, 0);
    assert("cleared_before_reload", Fluid.depthAt(0, 0, 31, 10, 0) === 0, `cleared to 0`);
    env.DataManager.extractSaveContents(savedContents);
    assert("reloaded_exact_fluid", Fluid.depthAt(0, 0, 31, 10, 0) === 5,
        `reloaded save faithfully restored 5 water (got ${Fluid.depthAt(0, 0, 31, 10, 0)})`);

    // Clean up
    Fluid.setCell(area, 31, 10, 0, 0, 0);

    // --- Section 8: Zero Quiescent Tick Cost (Test P) ---
    console.log(`\n--- 8. Zero Quiescent Tick Cost (Test P) ---`);
    // Settle area
    for (let t = 0; t < 50; t++) {
        if (Fluid.step(area, 512) === 0) break;
    }
    let quiescentProcessed = 0;
    const t0 = performance.now();
    for (let t = 0; t < 100; t++) {
        quiescentProcessed += Fluid.step(area, 512);
    }
    const tElapsed = performance.now() - t0;
    assert("quiescent_zero_cost", quiescentProcessed === 0,
        `100 quiescent steps cost 0 processed cells (got ${quiescentProcessed}) in ${tElapsed.toFixed(2)}ms`);

    // --- Section 9: Determinism (Test O) ---
    console.log(`\n--- 9. Determinism (Test O) ---`);
    function runSimRun() {
        Fluid.reset();
        for (let x = 1; x <= 3; x++) {
            for (let y = 1; y <= 3; y++) {
                setStrata(x, y, 0, ["stone", "air", "air", "air", "air"]);
            }
        }
        Fluid.setCell(area, 1, 1, 0, "water", 6);
        for (let t = 0; t < 30; t++) Fluid.step(area, 64);
        return [1, 2, 3].map(x => [1, 2, 3].map(y => Fluid.depthAt(0, 0, x, y, 0)).join(",")).join("|");
    }
    const run1 = runSimRun();
    const run2 = runSimRun();
    assert("determinism_identical", run1 === run2, `two identical runs produce identical fluid grids (${run1})`);

    console.log(`\n==================================================`);
    console.log(`TOTAL CHECKS: ${passes + fails}`);
    console.log(`PASSED: ${passes}`);
    console.log(`FAILED: ${fails}`);
    console.log(`==================================================`);

    if (fails > 0) {
        console.error(`\nFAILED: ${fails} check(s) did not meet acceptance criteria.`);
        process.exit(1);
    }
    if (mutant) {
        process.exit(0);
    }

    console.log(`\nALL BASELINE CHECKS PASSED.`);

    // Run all mutants to confirm capability to fail (Rule 4)
    console.log(`\n--- Running Rule 4 Failure Mutation Checks ---`);
    let mutantsCaught = 0;
    for (const m of Object.keys(MUTANTS)) {
        const res = spawnSync(process.execPath, [__filename, `--mutant=${m}`, "--quiet"], { stdio: "pipe" });
        if (res.status === 1) {
            mutantsCaught++;
            console.log(`PASS: mutant_${m} successfully caught and exited 1.`);
        } else {
            console.error(`FAIL: mutant_${m} was NOT caught (exit code ${res.status})!`);
        }
    }
    console.log(`\nMUTANT VERIFICATION: ${mutantsCaught}/${Object.keys(MUTANTS).length} mutants detected.`);
    if (mutantsCaught !== Object.keys(MUTANTS).length) {
        process.exit(1);
    }
    console.log(`\nALL FLUID <-> STRATA RECONCILIATION CHECKS PASSED (WG.00.07).`);
    process.exit(0);
}

runSuite();
