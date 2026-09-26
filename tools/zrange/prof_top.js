#!/usr/bin/env node
"use strict";
/**
 * tools/zrange/prof_top.js (WG.00.17, lane AA): self time per function from a V8 .cpuprofile (node --cpu-prof), for
 * comparing where the hot queries spend their time at two commits (tools/zrange/bench_queries.js --path-only).
 * Usage: node tools/zrange/prof_top.js <dir or .cpuprofile> [--top=25] [--filter=<substring of the url>]
 */
const fs = require("fs");
const path = require("path");
const args = process.argv.slice(2);
const arg = (n, d) => { const a = args.find(x => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
let file = args.find(a => !a.startsWith("--"));
if (fs.statSync(file).isDirectory()) file = path.join(file, fs.readdirSync(file).filter(f => f.endsWith(".cpuprofile")).sort().pop());
const prof = JSON.parse(fs.readFileSync(file, "utf8"));
const byId = new Map(prof.nodes.map(n => [n.id, n]));
const self = new Map();
const dt = prof.timeDeltas;
for (let k = 0; k < prof.samples.length; k++) {
    const n = byId.get(prof.samples[k]);
    const f = n.callFrame, key = `${f.functionName || "(anonymous)"} ${path.basename(f.url || "")}:${f.lineNumber + 1}`;
    self.set(key, (self.get(key) || 0) + (dt[k] || 0));
}
const total = [...self.values()].reduce((a, b) => a + b, 0);
const filter = arg("filter", "");
const rows = [...self.entries()].filter(([k]) => !filter || k.includes(filter)).sort((a, b) => b[1] - a[1]).slice(0, Number(arg("top", "25")));
console.log(`${file}: ${(total / 1000).toFixed(0)} ms sampled`);
for (const [k, v] of rows) console.log(`${(v / 1000).toFixed(1).padStart(9)} ms ${(100 * v / total).toFixed(1).padStart(5)} %  ${k}`);
