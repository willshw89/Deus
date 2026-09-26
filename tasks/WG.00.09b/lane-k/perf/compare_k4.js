// compare_k4.js - WG.00.09b Lane K: the lane's own per-tick parts before and after K4, from bench JSON files written with
// the same tool (tools/bench_render_layers.js). Whole-frame times are printed too, but they are dominated by the simulation,
// which differs per New Game world and with machine load; the parts are the lane's code alone.
// Usage: node tasks/WG.00.09b/lane-k/perf/compare_k4.js <before.json> <after.json>
"use strict";
const fs = require("fs");
const [beforeFile, afterFile] = process.argv.slice(2);
if (!beforeFile || !afterFile) { console.error("usage: compare_k4.js <before.json> <after.json>"); process.exit(2); }
const PARTS = ["update.spriteset.tilemap.depth", "update.depth_late", "render.depth", "depth.root.updateUnits", "depth.root.scanUnits", "depth.plane.updateEntities",
    "depth.plane.objectLayer", "depth.plane.rebuildWalls", "depth.plane.rebuildItems", "depth.plane.placeUnits", "depth.plane.sortEntities", "depth.plane.placeEntities",
    "update.minimap", "update.minimap.overlay", "update.fog", "update.daynight_glow"];
function load(file) {
    const r = JSON.parse(fs.readFileSync(file, "utf8"));
    const out = { sha: r.measuredSha.slice(0, 8), scenario: r.scenario, phases: new Map() };
    for (const run of r.runs) for (const p of run.phases) {
        if (!/^(steady_|stress_)/.test(p.phase)) continue;
        const e = out.phases.get(p.phase) || { frame: [], tick: [], parts: {} };
        e.frame.push(p.frameMs.median);
        e.tick.push(p.tickMs.median);
        for (const k of PARTS) if (p.parts[k]) (e.parts[k] = e.parts[k] || []).push(p.parts[k].mean);
        out.phases.set(p.phase, e);
    }
    return out;
}
const avg = a => (a && a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const f3 = v => (v === null ? "     -" : v.toFixed(3).padStart(7));
const b = load(beforeFile), a = load(afterFile);
console.log(`${b.scenario}: before ${b.sha} vs after ${a.sha}; mean over runs of each phase's per-tick mean (ms), whole-frame medians for context`);
for (const [phase, eb] of b.phases) {
    const ea = a.phases.get(phase);
    if (!ea) continue;
    console.log(`\n${phase}: frame median ${avg(eb.frame).toFixed(1)} -> ${avg(ea.frame).toFixed(1)} ms, tick median ${avg(eb.tick).toFixed(1)} -> ${avg(ea.tick).toFixed(1)} ms (simulation-dominated)`);
    for (const k of PARTS) {
        const vb = avg(eb.parts[k]), va = avg(ea.parts[k]);
        if (vb === null && va === null) continue;
        const d = vb !== null && va !== null ? `${(va - vb >= 0 ? "+" : "")}${(va - vb).toFixed(3)}${vb > 0 ? ` (${(((va - vb) / vb) * 100).toFixed(0)} %)` : ""}` : "";
        console.log(`  ${k.padEnd(32)} ${f3(vb)} -> ${f3(va)}  ${d}`);
    }
}
