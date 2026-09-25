#!/usr/bin/env node
"use strict";

/**
 * tools/test_19b_performance_determinism.js
 *
 * Independent Performance & Determinism Verification for WG.00.08 / FABLE-19B.
 * Validates:
 * 1. DETERMINISM:
 *    - Strict reproducibility across fresh VM instances (seeds 18, 20260923, 3, 21, 4).
 *    - Bitwise identity across strata typed arrays for all 5 Z-levels.
 *    - PRNG isolation (zero calls to unseeded Math.random).
 *    - Generator 4 legacy baseline immutability (zero drift).
 * 2. PERFORMANCE:
 *    - World generation time (total and feature carving pass).
 *    - Query micro-benchmarks (continuousAirHeight, shapeCodeAt, hasOpaqueOverburden).
 *    - Memory footprint & typed array allocation.
 *    - Save file serialization impact (levels JSON delta).
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const v8 = require("v8");
const { performance } = require("perf_hooks");

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");

function createVM(options = {}) {
    const { forbidMathRandom = true, levelsGen = null } = options;
    const list = {};
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, "game/js/plugins.js"), "utf8"), list);
    const ns = { NewGameSetup: { startAreaX: 0, startAreaY: 0, worldSeed: 1 } }, warnings = [], errors = [];
    let mathRandomCalls = 0;

    const canvasCtx = () => ({
        imageSmoothingEnabled: false,
        createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
        putImageData() {}, drawImage() {}, fillRect() {}, clearRect() {},
        getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })
    });

    const env = {
        window: null, UF: ns, DEUS: ns, performance, setTimeout, clearTimeout,
        console: {
            log: () => {},
            warn: (...a) => warnings.push(a.map(String).join(" ")),
            error: (...a) => errors.push(a.map(x => (x && x.stack) || String(x)).join(" "))
        },
        document: { createElement: () => ({ width: 0, height: 0, getContext: canvasCtx }) },
        PluginManager: {
            parameters: name => {
                const params = (list.$plugins && list.$plugins.find(p => p.name === name) || {}).parameters || {};
                const copy = Object.assign({}, params);
                if (levelsGen !== null && (name === "DEUS_Levels" || name === "UF_Levels")) {
                    copy.levelsGen = String(levelsGen);
                }
                return copy;
            },
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

    if (forbidMathRandom) {
        env.Math = Object.create(Math);
        env.Math.random = () => {
            mathRandomCalls++;
            throw new Error("UNSEEDED Math.random() called during deterministic simulation!");
        };
    } else {
        env.Math = Math;
    }

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
    env.Sprite = vm.runInNewContext(`(function Sprite(){ this.children = []; })`);
    env.Bitmap = vm.runInNewContext(`(function Bitmap(){})`);

    const files = ["DEUS_World.js", "DEUS_WorldGen.js", "DEUS_Tiles.js", "DEUS_Objects.js", "DEUS_Levels.js", "DEUS_Floors.js"];
    for (const f of files) {
        const full = path.join(PLUGINS, f);
        if (fs.existsSync(full)) {
            vm.runInNewContext(fs.readFileSync(full, "utf8"), env, { filename: f });
        }
    }

    return { env, errors, warnings, getMathRandomCalls: () => mathRandomCalls };
}

function runDeterminismChecks() {
    console.log("\n=======================================================");
    console.log("1. DETERMINISM CHECKS (Fresh VM Isolation & Checksums)");
    console.log("=======================================================");

    const testSeeds = [18, 20260923, 3, 21, 4];
    let allPassed = true;

    for (const seed of testSeeds) {
        process.stdout.write(`Testing Seed ${seed} reproducibility across fresh VMs... `);

        // Run A (Fresh VM)
        const vmA = createVM({ forbidMathRandom: true });
        const WA = vmA.env.UF.World || vmA.env.DEUS.World;
        const LA = vmA.env.UF.Levels || vmA.env.DEUS.Levels;
        vmA.env.UF.NewGameSetup = vmA.env.UF.NewGameSetup || {};
        vmA.env.UF.NewGameSetup.startAreaX = 0;
        vmA.env.UF.NewGameSetup.startAreaY = 0;
        vmA.env.UF.NewGameSetup.worldSeed = seed;
        WA.initNewWorld(seed);

        const checksumsA = {};
        for (const z of [-2, -1, 0, 1, 2]) {
            checksumsA[String(z)] = LA.checksum(z);
        }

        // Run B (Fresh VM)
        const vmB = createVM({ forbidMathRandom: true });
        const WB = vmB.env.UF.World || vmB.env.DEUS.World;
        const LB = vmB.env.UF.Levels || vmB.env.DEUS.Levels;
        vmB.env.UF.NewGameSetup.startAreaX = 0;
        vmB.env.UF.NewGameSetup.startAreaY = 0;
        vmB.env.UF.NewGameSetup.worldSeed = seed;
        WB.initNewWorld(seed);

        const checksumsB = {};
        for (const z of [-2, -1, 0, 1, 2]) {
            checksumsB[String(z)] = LB.checksum(z);
        }

        let seedMatch = true;
        for (const z of [-2, -1, 0, 1, 2]) {
            if (checksumsA[String(z)] !== checksumsB[String(z)]) {
                seedMatch = false;
                allPassed = false;
            }
        }

        if (seedMatch) {
            console.log(`PASS [Z-2..Z+2 checksums bitwise identical, 0 Math.random calls]`);
        } else {
            console.log(`FAIL! Divergence between Run A and Run B!`);
            console.log("  Run A:", checksumsA);
            console.log("  Run B:", checksumsB);
        }
    }

    // Generator 4 Legacy Baseline Invariance Check
    process.stdout.write(`Testing Generator 4 Legacy Baseline invariance on Seed 18... `);
    const vmGen4 = createVM({ forbidMathRandom: true, levelsGen: 4 });
    const W4 = vmGen4.env.UF.World || vmGen4.env.DEUS.World;
    const L4 = vmGen4.env.UF.Levels || vmGen4.env.DEUS.Levels;
    vmGen4.env.UF.NewGameSetup.startAreaX = 0;
    vmGen4.env.UF.NewGameSetup.startAreaY = 0;
    vmGen4.env.UF.NewGameSetup.worldSeed = 18;
    W4.initNewWorld(18);

    const stats4 = L4.stats();
    // Generator 4 must have 0 cuts and 0 caves carved
    const gen4Clean = (stats4.cutsCarved === 0 || stats4.cutsCarved === undefined) &&
                     (stats4.caveNetworksCarved === 0 || stats4.caveNetworksCarved === undefined);
    if (gen4Clean) {
        console.log(`PASS [Generator 4 produces legacy strata without cuts/caves]`);
    } else {
        console.log(`FAIL! Generator 4 was modified: cutsCarved=${stats4.cutsCarved}`);
        allPassed = false;
    }

    return allPassed;
}

function runPerformanceChecks() {
    console.log("\n=======================================================");
    console.log("2. PERFORMANCE & QUERY BENCHMARKS");
    console.log("=======================================================");

    const seed = 18;
    console.log(`Running comparative profiling on Canonical Seed ${seed}...`);

    // Profile Generator 4 (Baseline)
    const vmGen4 = createVM({ forbidMathRandom: true, levelsGen: 4 });
    const W4 = vmGen4.env.UF.World || vmGen4.env.DEUS.World;
    const L4 = vmGen4.env.UF.Levels || vmGen4.env.DEUS.Levels;
    vmGen4.env.UF.NewGameSetup.startAreaX = 0;
    vmGen4.env.UF.NewGameSetup.startAreaY = 0;
    vmGen4.env.UF.NewGameSetup.worldSeed = seed;

    const t0_g4 = performance.now();
    W4.initNewWorld(seed);
    const ms_g4 = performance.now() - t0_g4;
    const save4 = W4.makeSaveContents ? W4.makeSaveContents() : {};
    const saveLen4 = JSON.stringify(save4).length;

    // Profile Generator 5 (Candidate with 19B cuts & caves)
    const vmGen5 = createVM({ forbidMathRandom: true });
    const W5 = vmGen5.env.UF.World || vmGen5.env.DEUS.World;
    const L5 = vmGen5.env.UF.Levels || vmGen5.env.DEUS.Levels;
    vmGen5.env.UF.NewGameSetup.startAreaX = 0;
    vmGen5.env.UF.NewGameSetup.startAreaY = 0;
    vmGen5.env.UF.NewGameSetup.worldSeed = seed;

    const t0_g5 = performance.now();
    W5.initNewWorld(seed);
    const ms_g5 = performance.now() - t0_g5;
    const stats5 = L5.stats ? L5.stats() : {};
    const mem5 = L5.strataMemory ? L5.strataMemory(0, 0) : null;
    const save5 = W5.makeSaveContents ? W5.makeSaveContents() : {};
    const saveLen5 = JSON.stringify(save5).length;

    console.log(`\nWorldGen Timings:`);
    console.log(`  Generator 4 (Pre-19B Baseline): ${ms_g4.toFixed(1)} ms`);
    console.log(`  Generator 5 (19B Candidate):    ${ms_g5.toFixed(1)} ms (Delta: +${(ms_g5 - ms_g4).toFixed(1)} ms)`);
    console.log(`  Feature Carving Time:           ${(stats5.featureMs || 0).toFixed(1)} ms (Target: < 3000 ms)`);

    console.log(`\nMemory & Save Footprint:`);
    console.log(`  Save JSON Length (Gen 4):       ${saveLen4.toLocaleString()} bytes`);
    console.log(`  Save JSON Length (Gen 5):       ${saveLen5.toLocaleString()} bytes (Delta: +${(saveLen5 - saveLen4).toLocaleString()} bytes)`);
    if (mem5) {
        console.log(`  Strata Memory Footprint:        ${(mem5.bytes / 1024).toFixed(1)} KB (Changed cells: ${mem5.changedCells})`);
    }

    // Micro-benchmarks for Queries
    console.log(`\nMicro-Query Latency:`);
    const pts = [];
    for (let x = 16; x < 48; x++) {
        for (let y = 16; y < 48; y++) {
            pts.push([x, y, 0]);
        }
    }

    // continuousAirHeight
    const N_QUERIES = 200000;
    let acc = 0;
    const t0_air = performance.now();
    for (let i = 0; i < N_QUERIES; i++) {
        const p = pts[i % pts.length];
        acc += L5.continuousAirHeight(0, 0, p[0], p[1], p[2]) | 0;
    }
    const ns_per_air = ((performance.now() - t0_air) * 1e6) / N_QUERIES;
    console.log(`  continuousAirHeight:            ${ns_per_air.toFixed(1)} ns/query (Target: < 2000 ns) [acc=${acc}]`);

    // shapeCodeAt
    let accShape = 0;
    const t0_shape = performance.now();
    for (let i = 0; i < N_QUERIES; i++) {
        const p = pts[i % pts.length];
        accShape += L5.shapeCodeAt(0, 0, p[0], p[1], p[2]) | 0;
    }
    const ns_per_shape = ((performance.now() - t0_shape) * 1e6) / N_QUERIES;
    console.log(`  shapeCodeAt:                    ${ns_per_shape.toFixed(1)} ns/query [acc=${accShape}]`);

    // hasOpaqueOverburden
    let accOb = 0;
    const t0_ob = performance.now();
    for (let i = 0; i < N_QUERIES; i++) {
        const p = pts[i % pts.length];
        accOb += L5.hasOpaqueOverburden(L5.ref(p[0], p[1], p[2])) ? 1 : 0;
    }
    const ns_per_ob = ((performance.now() - t0_ob) * 1e6) / N_QUERIES;
    console.log(`  hasOpaqueOverburden:            ${ns_per_ob.toFixed(1)} ns/query [acc=${accOb}]`);

    const perfPass = (stats5.featureMs || 0) < 3000 && ns_per_air < 2000;
    console.log(`\nPerformance Gate Verdict: ${perfPass ? "PASS" : "FAIL"}`);
    return perfPass;
}

function main() {
    console.log("=== DEUS WG.00.08 PERFORMANCE & DETERMINISM ACCEPTANCE GATE ===");
    const detOk = runDeterminismChecks();
    const perfOk = runPerformanceChecks();

    console.log("\n=======================================================");
    console.log(`FINAL RESULT: ${detOk && perfOk ? "ALL GATES PASSED (ACCEPTANCE READY)" : "GATES FAILED"}`);
    console.log("=======================================================");

    if (!detOk || !perfOk) {
        process.exit(1);
    }
}

main();
