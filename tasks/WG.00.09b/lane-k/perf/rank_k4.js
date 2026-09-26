// rank_k4.js - WG.00.09b Lane K: the K4 ranking from the K3 baselines (the normal and stress JSON files written by
// tools/bench_render_layers.js).
//   A. CPU per simulation update from the V8 profiles: named entry points (inclusive ms) and scripts (self ms). The
//      "Game_Map.update X.js" / "Scene_Map.update X.js" alias links are never used: their inclusive time is the rest of the
//      alias chain, not X's own work.
//   B. The wrapped parts, median ms per engine tick (the lane's own code is measured here, whole).
// Usage: node tasks/WG.00.09b/lane-k/perf/rank_k4.js <baseline.json> [<stress_baseline.json> ...]
"use strict";
const fs = require("fs");
const files = process.argv.slice(2);
if (!files.length) { console.error("usage: rank_k4.js <baseline.json> [<stress_baseline.json> ...]"); process.exit(2); }

// [label, owner, kind, matcher]: kind "incl" = the largest inclusive entry whose key matches; "self" = the sum of the self
// time of the scripts listed.
const ROWS = [
    ["Environment wetness/thermal -> Floors.isRoofed/roomAt/computeRoom -> Objects.atIn", "DEUS_Environment + DEUS_Floors + DEUS_Objects (forbidden)", "incl", /^updateEnvironment DEUS_Environment\.js/],
    ["Colonists scan/decide", "DEUS_Colonists (forbidden)", "incl", /^scan DEUS_Colonists\.js/],
    ["  of which hazard reflex -> Jobs.safeCellNear -> standableIn -> World.walkable", "DEUS_Colonists + DEUS_Jobs + DEUS_World (forbidden)", "incl", /^hazardReflexJob DEUS_Colonists\.js/],
    ["World.update (unit stepping, paths)", "DEUS_World (forbidden)", "incl", /^World\.update DEUS_World\.js/],
    ["Synchronous log writes (fs open/write/close: DEUS_Core UF.Events.emit, one line per world:* listener)", "DEUS_Core (forbidden)", "self", ["open", "close", "writeBuffer", "writeString", "fsync"]],
    ["Effekseer (wasm)", "RMMZ libs (read-only)", "self", ["wasm "]],
    ["Garbage collector", "(engine)", "self", ["(garbage collector)"]],
    ["DEUS_Objects.js self", "DEUS_Objects (forbidden)", "self", ["DEUS_Objects.js"]],
    ["DEUS_World.js self", "DEUS_World (forbidden)", "self", ["DEUS_World.js"]],
    ["DEUS_Floors.js self", "DEUS_Floors (forbidden)", "self", ["DEUS_Floors.js"]],
    ["DEUS_Jobs.js self", "DEUS_Jobs (forbidden)", "self", ["DEUS_Jobs.js"]],
    ["pixi.js self", "PIXI (read-only)", "self", ["pixi.js"]],
    ["DEUS_Depth.js self", "DEUS_Depth (lane K)", "self", ["DEUS_Depth.js"]],
    ["DEUS_Minimap.js self", "DEUS_Minimap (lane K)", "self", ["DEUS_Minimap.js"]],
    ["DEUS_Fog.js self", "DEUS_Fog (lane K, only if ranked)", "self", ["DEUS_Fog.js"]],
    ["DEUS_DayNight.js self", "DEUS_DayNight (lane K, only if ranked)", "self", ["DEUS_DayNight.js"]]
];
const LANE_PARTS = ["update.spriteset.tilemap.depth", "update.depth_late", "render.depth", "paint.depth_planes", "update.minimap", "update.minimap.overlay", "update.minimap.chunks", "render.minimap", "update.fog", "update.fog.refresh", "render.fog", "update.daynight_glow", "render.daynight_glow"];

const prof = new Map(), parts = new Map(), phases = [];
for (const f of files) {
    const r = JSON.parse(fs.readFileSync(f, "utf8"));
    for (const run of r.runs) {
        for (const [lab, pr] of Object.entries(run.profiles || {})) {
            const ph = `${r.scenario}#${run.run}:${lab}`;
            phases.push(`${ph}: ${pr.updates} updates, ${pr.wallMs} ms wall, ${pr.samples} samples`);
            for (const [label, owner, kind, m] of ROWS) {
                let ms = null;
                if (kind === "incl") { const hit = pr.topInclusive.find(e => m.test(e.fn)); ms = hit ? hit.msPerUpdate : null; }
                else ms = pr.selfByScript.filter(e => m.includes(e.fn) || m.some(x => x.endsWith(" ") && e.fn.startsWith(x))).reduce((a, e) => a + e.msPerUpdate, 0);
                const row = prof.get(label) || { owner, kind, byPhase: {} };
                row.byPhase[ph] = ms;
                prof.set(label, row);
            }
        }
        for (const p of run.phases) {
            if (!/^(steady_|stress_)/.test(p.phase)) continue;
            const ph = `${r.scenario}#${run.run}:${p.phase}`;
            for (const [k, v] of Object.entries(p.parts)) { const row = parts.get(k) || {}; row[ph] = v.median; parts.set(k, row); }
        }
    }
}
const stat = o => { const v = Object.values(o).filter(x => x !== null); return { worst: v.length ? Math.max(...v) : null, mean: v.length ? v.reduce((a, b) => a + b, 0) / v.length : null, n: v.length }; };
const f2 = v => (v === null ? "  (n/a)" : v.toFixed(2).padStart(7));
console.log("Profiled windows:\n  " + phases.join("\n  "));
console.log("\nA. CPU ms per simulation update (V8 sampling profile, 500 us), ranked by the worst window. 'n/a': below the stored top-60 inclusive list.");
for (const [label, row] of [...prof.entries()].sort((a, b) => (stat(b[1].byPhase).worst || 0) - (stat(a[1].byPhase).worst || 0))) {
    const s = stat(row.byPhase);
    console.log(`  ${f2(s.worst)} worst ${f2(s.mean)} mean (${s.n} windows)  ${label}  [${row.owner}]`);
}
console.log("\nB. Wrapped parts, median ms per engine tick in each steady/stress window, ranked by the worst window:");
for (const [k, row] of [...parts.entries()].sort((a, b) => stat(b[1]).worst - stat(a[1]).worst)) {
    const s = stat(row);
    console.log(`  ${s.worst.toFixed(3).padStart(8)} worst ${s.mean.toFixed(3).padStart(8)} mean  ${k}${LANE_PARTS.includes(k) ? "  [lane K]" : ""}`);
}
