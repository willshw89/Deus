//=============================================================================
// benchmark_performance.js
// Reproducible performance benchmark for Project DEUS simulation tick
// Measures 20 Hz simulation tick duration, heap usage, and unit throughput.
//=============================================================================

"use strict";

const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");

// Mock environment
global.window = global;
const catalogData = JSON.parse(fs.readFileSync(path.join(__dirname, "../game/data/UF_WorldCatalog.json"), "utf8"));
global.$ufWorldCatalog = catalogData;
global.$dataWorldCatalog = catalogData;

global.ImageManager = { loadCharacter: () => ({ isReady: () => true }), loadTileset: () => ({ isReady: () => true }) };
global.Sprite = function() { this.anchor = { set: () => {} }; this.visible = true; this.bitmap = null; };
global.Bitmap = function() { return { isReady: () => true, blt: () => {} }; };
global.Point = function(x, y) { this.x = x || 0; this.y = y || 0; };
global.DataManager = { isBattleTest: () => false, isEventTest: () => false, onLoad: () => {}, extractSaveContents: () => {} };
global.Scene_Boot = { prototype: { start: () => {} } };
global.Scene_Map = function() {};
global.Scene_Map.prototype = { createDisplayObjects: () => {} };
global.Game_Player = function() {};
global.Game_Player.prototype = { performTransfer: () => {}, moveStraight: () => {} };
global.Game_Map = function() {};
global.Game_Map.prototype = { update: () => {} };
global.Game_Event = function(mapId, eventId) { this._eventId = eventId; this.x = 0; this.y = 0; };
global.$gamePlayer = { x: 128, y: 128, isTransferring: () => false };
global.Input = { keyMapper: {} };
global.Spriteset_Map = function() {};
global.Spriteset_Map.prototype = { createCharacters: () => {} };
global.PluginManager = { parameters: () => ({}) };

// Load core simulation plugins
require("../game/js/plugins/UF_World.js");
require("../game/js/plugins/UF_Time.js");
require("../game/js/plugins/UF_Proficiency.js");
require("../game/js/plugins/UF_Combat.js");
require("../game/js/plugins/UF_Colonists.js");

console.log("=== DEUS Simulation Performance Benchmark ===");

// 1. Initialize world
const seed = 12345;
const state = UF.World.newWorld(seed);

// 2. Setup 8 colonists and 4 wildlife entities
const colonists = [];
for (let i = 1; i <= 8; i++) {
    const u = {
        id: i,
        name: `Colonist_${i}`,
        area: { x: 0, y: 0 },
        z: 0,
        x: 64 + (i % 4),
        y: 64 + Math.floor(i / 4),
        data: {
            kind: "colonist",
            faction: 1,
            species: "human",
            ai: "settlement",
            hp: 20,
            maxHp: 20,
            combat: { targetId: null, mode: "defend" },
            stats: { str: 10, dex: 12, con: 11, int: 10, wis: 10, cha: 10 }
        }
    };
    state.units[i] = u;
    colonists.push(u);
}

for (let j = 9; j <= 12; j++) {
    state.units[j] = {
        id: j,
        name: `Deer_${j}`,
        area: { x: 0, y: 0 },
        z: 0,
        x: 80 + j,
        y: 80 + j,
        data: {
            kind: "wildlife",
            species: "deer",
            faction: 99,
            hp: 15,
            maxHp: 15,
            combat: { targetId: null, mode: "flee" }
        }
    };
}

console.log(`World initialized with ${Object.keys(state.units).length} active entities.`);

// 3. Warm-up run (10 ticks)
for (let t = 0; t < 10; t++) {
    UF.Time.update(1 / 20);
}

// 4. Benchmark 200 simulation ticks
const TICKS = 200;
const tickTimes = [];
const startMem = process.memoryUsage().heapUsed;
const tStart = performance.now();

for (let t = 0; t < TICKS; t++) {
    const t0 = performance.now();
    UF.Time.update(1 / 20);
    const dt = performance.now() - t0;
    tickTimes.push(dt);
}

const tTotal = performance.now() - tStart;
const endMem = process.memoryUsage().heapUsed;

// 5. Statistical analysis
tickTimes.sort((a, b) => a - b);
const sum = tickTimes.reduce((acc, v) => acc + v, 0);
const avgMs = sum / TICKS;
const minMs = tickTimes[0];
const maxMs = tickTimes[tickTimes.length - 1];
const p50Ms = tickTimes[Math.floor(TICKS * 0.50)];
const p95Ms = tickTimes[Math.floor(TICKS * 0.95)];
const p99Ms = tickTimes[Math.floor(TICKS * 0.99)];
const memDeltaMB = (endMem - startMem) / (1024 * 1024);

console.log("\n--- Benchmark Results ---");
console.log(`Ticks simulated:    ${TICKS}`);
console.log(`Total duration:     ${tTotal.toFixed(2)} ms`);
console.log(`Average tick time:  ${avgMs.toFixed(3)} ms`);
console.log(`Median (p50) tick:  ${p50Ms.toFixed(3)} ms`);
console.log(`95th percentile:    ${p95Ms.toFixed(3)} ms`);
console.log(`99th percentile:    ${p99Ms.toFixed(3)} ms`);
console.log(`Min / Max tick:     ${minMs.toFixed(3)} ms / ${maxMs.toFixed(3)} ms`);
console.log(`Memory delta:       ${memDeltaMB.toFixed(2)} MB`);
console.log(`Tick rate capacity: ${(1000 / avgMs).toFixed(0)} Hz (target: 20 Hz, budget: 50.0 ms)`);

if (avgMs < 10.0) {
    console.log("\n[PASS] Simulation tick performance is exceptionally healthy (< 10 ms budget).");
    process.exit(0);
} else {
    console.warn("\n[WARN] Simulation tick exceeds 10 ms budget.");
    process.exit(1);
}
