// ORG-0.2 item (c) headless diagnostic (scratch, never tracked): what the hydrology network produces at a seed, measured
// with the worldgen suite's own river arithmetic. Usage: node diag_rivers.js [seed]
const fs = require("fs"), path = require("path");
const LANE = path.resolve(__dirname, "..", "..");
const GAME = path.join(LANE, "game");
const seed = Number(process.argv[2] || 1920951434);
const UF = {};
global.window = { UF, addEventListener: () => {}, removeEventListener: () => {}, location: { search: "" }, document: { addEventListener: () => {}, createElement: () => ({ getContext: () => null, style: {} }) }, requestAnimationFrame: () => 0 };
global.document = window.document; global.navigator = { userAgent: "node" }; global.localStorage = { getItem: () => null, setItem: () => {} };
global.PluginManager = { parameters: () => ({}), registerCommand: () => {} };
global.Tilemap = { TILE_ID_A1: 2048, TILE_ID_A2: 2816, isTileA1: id => id >= 2048 && id < 2816 };
for (const k of ["Game_System", "Game_Action", "Game_Battler", "Scene_Map", "Game_CharacterBase", "Scene_Boot", "Game_Player", "Game_Map", "Game_Interpreter", "Scene_Title", "Game_Event", "Sprite_Character", "Spriteset_Map", "Game_Screen", "Game_Temp"]) global[k] = { prototype: {} };
global.Window_Base = class {}; global.Window_Command = class {}; global.Scene_Base = class {};
global.Graphics = { width: 816, height: 624, frameCount: 0 };
global.DataManager = { onLoad: () => {}, isBattleTest: () => false, isEventTest: () => false, _databaseFiles: [] };
global.performance = global.performance || { now: () => Date.now() };
const realRequire = require;
(function load() {
    const require = p => realRequire(p.startsWith(".") ? path.resolve(GAME, p) : p);
    eval(fs.readFileSync(path.join(GAME, "js/plugins/DEUS_Core.js"), "utf8"));
    eval(fs.readFileSync(path.join(GAME, "js/plugins/DEUS_WorldGen.js"), "utf8"));
})();
window.$deusWorldCatalog = JSON.parse(fs.readFileSync(path.join(GAME, "data/DEUS_WorldCatalog.json"), "utf8"));
window.$ufWorldCatalog = window.$deusWorldCatalog;
const NS = window.UF || window.DEUS; if (!NS || !NS.WorldGen) { console.log("namespace keys: window.UF=" + (window.UF ? Object.keys(window.UF).join(",") : "none") + " window.DEUS=" + (window.DEUS ? Object.keys(window.DEUS).join(",") : "none")); process.exit(1); }
const WG = NS.WorldGen, cat = window.$deusWorldCatalog, cl = cat.climate, R = cat.rivers;
const state = { seed, areasX: 1, areasY: 1, size: 256, startArea: { x: 0, y: 0 } };
NS.World = { state }; if (window.UF && window.UF !== NS) window.UF.World = NS.World;
const wm = WG.waterModel(state);
const net = wm.net;
console.log(`seed ${seed}; seaLevel ${cl.seaLevel}; catalog rivers count ${JSON.stringify(R.count)} halfWidth ${JSON.stringify(R.halfWidth)} keepAwayFromStart ${R.keepAwayFromStart}`);
if (!net) { console.log("NO NETWORK (hydrology module missing?)"); process.exit(1); }
const elev = Array.from(net.grid.elev), sorted = elev.slice().sort((a, b) => a - b);
const q = p => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
console.log(`macro grid ${net.grid.width}x${net.grid.height} nodes: min ${sorted[0].toFixed(3)} median ${q(0.5).toFixed(3)} p90 ${q(0.9).toFixed(3)} max ${sorted[sorted.length - 1].toFixed(3)}; nodes >= 0.6: ${elev.filter(e => e >= 0.6).length}; nodes <= seaLevel: ${elev.filter(e => e <= cl.seaLevel).length}`);
console.log(`planned rivers ${net.rivers.length}: ` + net.rivers.map(r => `#${r.id} source (${r.source.mx},${r.source.my}) e=${net.grid.elev[r.source.my * net.grid.width + r.source.mx].toFixed(3)} nodes ${r.nodes.length} terminal ${r.terminal}${r.lake ? ` lake@(${r.lake.mx},${r.lake.my})` : ""} eroded ${r.eroded}`).join(" | "));
console.log(`failed sources ${net.failed.length}: ${JSON.stringify(net.failed)}`);
const rivers = WG.riverModels(state);
const size = 256, mid = 128, a = { x: 0, y: 0 };
const [cMin, cMax] = R.count;
console.log(`riverModels: ${rivers.length}; rivers_count would be ${rivers.length >= 1 && rivers.length >= cMin && rivers.length <= cMax ? "PASS" : "FAIL"}`);
const gaps = rivers.map(r => Math.abs(Math.round(r.center(a.y * size + mid)) - (a.x * size + mid)));
console.log(`river_not_through_start: gaps ${JSON.stringify(gaps)} (keep away ${R.keepAwayFromStart}) -> ${gaps.every(g => g > R.keepAwayFromStart) ? "PASS" : "FAIL"}`);
for (const r of rivers) {
    const ys = r.course.map(p => p.y), xs = r.course.map(p => p.x);
    let crossed = 0; for (let gy = 0; gy < size; gy++) if (!Number.isNaN(r.center(gy))) crossed++;
    console.log(`river #${r.id}: anchorX ${r.anchorX} halfWidth ${r.halfWidth} terminal ${r.terminal} course points ${r.course.length} x ${Math.min(...xs)}..${Math.max(...xs)} y ${Math.min(...ys)}..${Math.max(...ys)} (unwrapped); rows of 256 with a center: ${crossed}; center(128)=${r.center(128)}`);
    const breaks = []; let dry = 0, jumps = 0;
    const col = Math.round(r.center(a.y * size)) - a.x * size;
    if (col < 0 || col >= size || Number.isNaN(col)) { console.log(`  river_continuous loop: ${Number.isNaN(col) ? "col NaN (row 0 not crossed): the suite's col<0||col>=size test is false for NaN, so the row loop RUNS" : "skipped (col " + col + " outside the area)"}`); }
    if (!(col < 0 || col >= size)) {
        let prev = null;
        for (let y = 0; y < size; y++) {
            const c = Math.round(r.center(a.y * size + y)) - a.x * size;
            if (c < -r.halfWidth || c >= size + r.halfWidth) { prev = null; continue; }
            let wet = false;
            for (let x = Math.max(0, c - r.halfWidth); x <= Math.min(size - 1, c + r.halfWidth); x++) if (wm.isWater(x, y)) wet = true;
            if (!wet) { dry++; breaks.push(`row ${y} dry (center ${c})`); }
            else if (prev !== null && Math.abs(c - prev) > 2 * r.halfWidth + 1) { jumps++; breaks.push(`jump ${prev}->${c} at row ${y}`); }
            prev = c;
        }
        console.log(`  river_continuous (proxy wm.isWater for tiles): breaks ${breaks.length} (dry rows ${dry}, jumps ${jumps}); first: ${breaks[0] || "none"}; last: ${breaks[breaks.length - 1] || "none"}`);
    }
}