// fix2_switch_cost.js - WG.00.09b Lane K Fix 2: what the in-place switch costs before and after DEUS_Depth paints and places
// the planes inside UF.World.rebindSpriteset. Reads two layer_switch_perf.json files written by Lane N's
// tools/test_layer_switch_inplace.js --evidence=<dir> (fixed world seed 18, the same 23 switches in the same order) and prints,
// per switch and as median / max: the rebind's listener time (world.lastRebind.split.events: every world:levelBuilt /
// world:areaBuilt listener, DEUS_Depth's among them), the whole rebind (world.lastRebind.ms), the switch's work
// (last.workMs = swap + rebind + fog) and the slowest SceneManager.updateMain in the switch's window (maxUpdateMs).
// Wall-clock numbers of one run each on this machine: reported, not gated.
// Usage: node tasks/WG.00.09b/lane-k/perf/fix2_switch_cost.js <before.json> <after.json>
"use strict";
const fs = require("fs");
const [fa, fb] = process.argv.slice(2);
if (!fa || !fb) { console.error("usage: fix2_switch_cost.js <before layer_switch_perf.json> <after layer_switch_perf.json>"); process.exit(2); }
const A = JSON.parse(fs.readFileSync(fa, "utf8")), B = JSON.parse(fs.readFileSync(fb, "utf8"));
const row = s => ({
    key: `r${s.round} ${s.from}->${s.to}`,
    events: s.world && s.world.lastRebind && s.world.lastRebind.split ? s.world.lastRebind.split.events : NaN,
    rebind: s.world && s.world.lastRebind ? s.world.lastRebind.ms : NaN,
    work: s.last ? s.last.workMs : NaN,
    maxUpdate: s.maxUpdateMs
});
const ra = A.switches.map(row), rb = B.switches.map(row);
if (ra.length !== rb.length || ra.some((r, i) => r.key !== rb[i].key)) { console.error(`HARNESS: the two files hold different switch sequences (${ra.length} vs ${rb.length})`); process.exit(2); }
const f = v => (Number.isFinite(v) ? v.toFixed(2) : "-").padStart(7);
console.log(`before: ${fa} (seed ${A.seed}, made ${A.made})`);
console.log(`after:  ${fb} (seed ${B.seed}, made ${B.made})`);
console.log("switch            | listeners before  after | rebind before  after | work before  after | worst update before  after (ms)");
for (let i = 0; i < ra.length; i++) {
    const a = ra[i], b = rb[i];
    console.log(`${a.key.padEnd(17)} | ${f(a.events)} ${f(b.events)} | ${f(a.rebind)} ${f(b.rebind)} | ${f(a.work)} ${f(b.work)} | ${f(a.maxUpdate)} ${f(b.maxUpdate)}`);
}
const stat = (rows, k) => { const v = rows.map(r => r[k]).filter(Number.isFinite).sort((x, y) => x - y); return { n: v.length, median: v[Math.floor(v.length / 2)], max: v[v.length - 1] }; };
for (const k of ["events", "rebind", "work", "maxUpdate"]) {
    const a = stat(ra, k), b = stat(rb, k);
    console.log(`${k.padEnd(9)} median ${f(a.median)} -> ${f(b.median)}   max ${f(a.max)} -> ${f(b.max)}   (${a.n} / ${b.n} switches)`);
}
