"use strict";
// tools/bench_pathfinding_hpa.js - Node timing for game/js/deus/DEUS_Pathfinding.js (CORE-HPA).
//
//   node tools/bench_pathfinding_hpa.js [--seed=12345] [--queries=200]
//
// This is a BENCHMARK run under Node with process.hrtime, not an in-game perf overlay number
// (CORE-HPA.md: performance is not a CI gate; report before/after numbers with the method).
// Printed: full build time on the 768x768 seeded obstacle grid, per-flush rebuild time for single-tile
// edits, hierarchical query median/p95 (cache off and on), plain A* median/p95 on the same queries,
// and expansions per query. Timings depend on the machine; the expansion counts do not.
const path = require("path");
const P = require(path.join(__dirname, "..", "game", "js", "deus", "DEUS_Pathfinding.js"));

const argv = process.argv.slice(2);
const seed = Number((argv.find(a => a.startsWith("--seed=")) || "--seed=12345").slice(7));
const nQueries = Number((argv.find(a => a.startsWith("--queries=")) || "--queries=200").slice(10));
const W = 768, H = 768;

function mulberry32(s) {
    let a = s >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const now = () => Number(process.hrtime.bigint()) / 1e6;
const pct = (arr, p) => { const s = arr.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const fmt = x => x.toFixed(3);

const g = P.createGrid({ width: W, height: H });
const rnd = mulberry32(seed);
for (let i = 0; i < W * H; i++) if (rnd() < 0.20) g.walk[i] = 0;
for (let k = 0; k < 300; k++) {
    const x = (rnd() * W) | 0, y = (rnd() * H) | 0, horiz = rnd() < 0.5, len = 8 + ((rnd() * 32) | 0);
    for (let j = 0; j < len; j++) g.walk[g.index(horiz ? x + j : x, horiz ? y : y + j, 0)] = 0;
}
const queries = [];
const qr = mulberry32(seed ^ 0x5bd1e995);
while (queries.length < nQueries) {
    const s = g.index((qr() * W) | 0, (qr() * H) | 0, 0), e = g.index((qr() * W) | 0, (qr() * H) | 0, 0);
    if (!g.walk[s] || !g.walk[e]) continue;
    if (Math.max(P.torusAbs(g.xOf(s), g.xOf(e), W), P.torusAbs(g.yOf(s), g.yOf(e), H)) < 64) continue;
    queries.push([s, e]);
}

console.log(`CORE-HPA benchmark (Node ${process.version}, ${process.platform} ${process.arch}); seed ${seed}; 768x768 grid, 20% random blocks + 300 wall segments; ${nQueries} queries at Chebyshev distance >= 64`);

// full build, three times (first includes JIT warm-up)
const builds = [];
let pf = null;
for (let i = 0; i < 3; i++) {
    pf = P.createPathfinder(g, { cache: false });
    const t = now(); pf.build(); builds.push(now() - t);
}
console.log(`full build: ${builds.map(fmt).join(" / ")} ms (3 runs); ${pf.stats().nodes} abstract nodes, ${pf.metrics.rebuildExpansions / 3 | 0} local expansions per build`);

// incremental rebuilds: single-tile edits at random interior and border positions
const er = mulberry32(seed + 1);
const flushInterior = [], flushBorder = [];
let rebuiltInterior = 0, rebuiltBorder = 0;
for (let i = 0; i < 200; i++) {
    const border = i % 2 === 1;
    const cx = (er() * 48) | 0, cy = (er() * 48) | 0;
    const x = cx * 16 + (border ? 0 : 3 + ((er() * 10) | 0)), y = cy * 16 + 3 + ((er() * 10) | 0);
    const idx = g.index(x, y, 0);
    const was = g.walk[idx];
    g.setWalkableAt(idx, was !== 1);
    const t = now(); const n = pf.flush(); const dt = now() - t;
    if (border) { flushBorder.push(dt); rebuiltBorder += n; } else { flushInterior.push(dt); rebuiltInterior += n; }
    g.setWalkableAt(idx, was === 1);
    pf.flush();
}
console.log(`flush after one interior tile edit: median ${fmt(pct(flushInterior, 0.5))} ms, p95 ${fmt(pct(flushInterior, 0.95))} ms (${(rebuiltInterior / flushInterior.length).toFixed(2)} clusters rebuilt per flush, includes the connectivity rebuild)`);
console.log(`flush after one border tile edit:   median ${fmt(pct(flushBorder, 0.5))} ms, p95 ${fmt(pct(flushBorder, 0.95))} ms (${(rebuiltBorder / flushBorder.length).toFixed(2)} clusters rebuilt per flush)`);

function runQueries(label, finder, opts) {
    const times = [], exps = [], costs = [];
    let found = 0;
    for (const [s, e] of queries) {
        const t = now();
        const r = opts === null ? finder.findPathAStar(s, e, { mask: 0 }) : finder.findPath(s, e, opts);
        times.push(now() - t);
        exps.push(r.expansions);
        if (r.status === "found") { found++; costs.push(r.cost); }
    }
    console.log(`${label}: median ${fmt(pct(times, 0.5))} ms, p95 ${fmt(pct(times, 0.95))} ms, max ${fmt(pct(times, 1))} ms; expansions median ${pct(exps, 0.5)}, p95 ${pct(exps, 0.95)}; ${found}/${queries.length} found`);
    return costs;
}
pf.resetMetrics();
runQueries("HPA* query (cache off), warm-up", pf, { mask: 0, cache: false });
const hpaOff = runQueries("HPA* query (cache off)", pf, { mask: 0, cache: false });
const pfc = P.createPathfinder(g, { cache: true }); pfc.build();
runQueries("HPA* query (cache on), first pass", pfc, { mask: 0 });
runQueries("HPA* query (cache on), second pass", pfc, { mask: 0 });
const astar = runQueries("plain A* reference", pf, null);
const ratios = hpaOff.map((c, i) => c / astar[i]).sort((a, b) => a - b);
console.log(`HPA*/A* cost ratio (cache off): max ${ratios[ratios.length - 1].toFixed(4)}, mean ${(ratios.reduce((a, b) => a + b, 0) / ratios.length).toFixed(4)}, p50 ${pct(ratios, 0.5).toFixed(4)}, p90 ${pct(ratios, 0.9).toFixed(4)}, p99 ${pct(ratios, 0.99).toFixed(4)}`);
console.log(`open-list overflow count: ${pf.metrics.openListOverflow + pfc.metrics.openListOverflow}`);
