#!/usr/bin/env node
"use strict";

/**
 * tools/capture_pre_migration_baseline.js
 *
 * Pre-Migration Baseline Metric Capture for DEUS Consolidation Plan V1 (Phase 1).
 * Captures deterministic baseline performance, memory, checksums, and save sizes
 * before any repository restructuring or runtime pruning takes place.
 *
 * Golden Seeds:
 * - Seed 18 (Canonical 19B regression seed)
 * - Seed 20260923 (Canonical DEUS WorldGen golden seed)
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { performance } = require("perf_hooks");

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");

function setupVM(tag) {
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
            log: () => {},
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
    return { env, errors, warnings };
}

function captureSeed(seed) {
    const { env, errors } = setupVM(`seed-${seed}`);
    const L = env.UF.Levels || env.DEUS.Levels;
    const W = env.UF.World || env.DEUS.World;

    const t0 = performance.now();
    env.UF.NewGameSetup.startAreaX = 0;
    env.UF.NewGameSetup.startAreaY = 0;
    env.UF.NewGameSetup.worldSeed = seed;
    W.initNewWorld(seed);
    const totalMs = performance.now() - t0;

    const stats = L && typeof L.stats === "function" ? L.stats() : {};
    const checksums = {};
    for (const z of [-2, -1, 0, 1, 2]) {
        checksums[String(z)] = L ? L.checksum(z) : null;
    }

    const saveObj = W.makeSaveContents ? W.makeSaveContents() : {};
    const saveLen = JSON.stringify(saveObj).length;
    const mem = L && typeof L.strataMemory === "function" ? L.strataMemory(0, 0) : null;

    return {
        seed,
        totalWorldGenMs: Math.round(totalMs),
        featureMs: stats.featureMs ? Math.round(stats.featureMs) : null,
        checksums,
        saveJsonChars: saveLen,
        strataMemory: mem,
        errors: errors.length
    };
}

function run() {
    console.log("=== DEUS PRE-MIGRATION BASELINE CAPTURE ===");
    const results = {
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        seeds: {}
    };

    for (const s of [18, 20260923]) {
        console.log(`Profiling golden seed ${s}...`);
        results.seeds[String(s)] = captureSeed(s);
        console.log(`  Done in ${results.seeds[String(s)].totalWorldGenMs} ms (checksums: ${JSON.stringify(results.seeds[String(s)].checksums)})`);
    }

    const outPath = path.join(ROOT, "scratch", "pre_migration_baseline.json");
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2), "utf8");
    console.log(`Baseline metrics recorded to: ${outPath}`);
}

run();
