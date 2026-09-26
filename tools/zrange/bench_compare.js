#!/usr/bin/env node
"use strict";
/**
 * tools/zrange/bench_compare.js (WG.00.17, lane AA): compares tools/bench_render_layers.js outputs (read only; their
 * JSON files) of the base and the tip, phase by phase, against the BRIEF's performance budget:
 *   render-side fields (parts.render, render.depth, render.tilemap_layers, update.spriteset, drawCalls) within +10 % at
 *   median and p95; update.map median within +10 %; the paused +2 tick median at most 2.5 ms.
 * A metric's value for a file is the median over its runs of that run's phase median (or p95). Wall-clock numbers are
 * reported for the reviewer: nothing here is asserted by the game's checks. Each run's machine load (label, median CPU %,
 * AI workers, other nw.exe) is listed with it.
 *
 * Usage: node tools/zrange/bench_compare.js --base=<json> --tip=<json> [--label=<text>] [--md=<out.md>] [--json=<out.json>]
 * Prints the table; exit 0 (a report, not a gate).
 */
const fs = require("fs");
const path = require("path");
const args = process.argv.slice(2);
const arg = (name, fallback) => { const a = args.find(x => x.startsWith(`--${name}=`)); return a ? a.slice(name.length + 3) : fallback; };
const load = f => JSON.parse(fs.readFileSync(path.resolve(f), "utf8"));
const base = load(arg("base")), tip = load(arg("tip"));
const LABEL = arg("label", `${base.scenario} ${String(base.measuredSha).slice(0, 8)} vs ${String(tip.measuredSha).slice(0, 8)}`);

const median = a => { const s = a.filter(v => typeof v === "number" && isFinite(v)).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const FIELDS = [
    { key: "render", get: (p, q) => p.parts && p.parts.render && p.parts.render[q], budget: 0.10, stats: ["median", "p95"] },
    { key: "render.depth", get: (p, q) => p.parts && p.parts["render.depth"] && p.parts["render.depth"][q], budget: 0.10, stats: ["median", "p95"] },
    { key: "render.tilemap_layers", get: (p, q) => p.parts && p.parts["render.tilemap_layers"] && p.parts["render.tilemap_layers"][q], budget: 0.10, stats: ["median", "p95"] },
    { key: "update.spriteset", get: (p, q) => p.parts && p.parts["update.spriteset"] && p.parts["update.spriteset"][q], budget: 0.10, stats: ["median", "p95"] },
    { key: "drawCalls", get: (p, q) => p.drawCalls && p.drawCalls[q === "p95" ? "p95" : "median"], budget: 0.10, stats: ["median", "p95"] },
    { key: "update.map", get: (p, q) => p.parts && p.parts["update.map"] && p.parts["update.map"][q], budget: 0.10, stats: ["median"] },
    { key: "tick", get: (p, q) => p.tickMs && p.tickMs[q], budget: null, stats: ["median", "p95"] },
    { key: "frame", get: (p, q) => p.frameMs && p.frameMs[q], budget: null, stats: ["median", "p95"] }
];
const phasesOf = j => { const names = []; for (const r of j.runs) for (const p of r.phases || []) if (!names.includes(p.phase)) names.push(p.phase); return names; };
const valueOf = (j, phase, f, q) => median(j.runs.map(r => { const p = (r.phases || []).find(x => x.phase === phase); return p ? f.get(p, q) : null; }));
const loadOf = j => j.runs.map(r => { const m = r.machineLoad || {}; const o = m.overall || m.cpu || {}; return `run ${r.run}: ${m.label || "?"}, CPU median ${o.median !== undefined ? o.median : "?"} %, AI workers ${m.aiWorkers !== undefined ? JSON.stringify(m.aiWorkers) : "?"}, other nw.exe ${m.otherNwExe !== undefined ? JSON.stringify(m.otherNwExe) : "?"}`; });

const rows = [], misses = [];
for (const phase of phasesOf(base).filter(p => phasesOf(tip).includes(p))) {
    for (const f of FIELDS) for (const q of f.stats) {
        const b = valueOf(base, phase, f, q), t = valueOf(tip, phase, f, q);
        if (b === null || t === null) continue;
        const ratio = b > 0 ? t / b - 1 : (t > 0 ? Infinity : 0);
        let verdict = "";
        if (f.budget !== null) verdict = ratio <= f.budget ? "within" : `OVER (+${(ratio * 100).toFixed(0)} %, ${(t - b).toFixed(3)} abs)`;
        if (f.key === "tick" && q === "median" && /^paused_\+2/.test(phase)) verdict = t <= 2.5 ? "<= 2.5 ms" : "OVER 2.5 ms";
        rows.push({ phase, field: f.key, stat: q, base: b, tip: t, ratio, verdict });
        if (/OVER/.test(verdict)) misses.push(`${phase} ${f.key} ${q}: ${b} -> ${t} (${verdict})`);
    }
}
const fmt = v => (v === null ? "-" : Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(3));
const md = [];
md.push(`### ${LABEL}`);
md.push("");
md.push(`Base: ${arg("base")} (${base.runs.length} run(s), sha ${base.measuredSha}); tip: ${arg("tip")} (${tip.runs.length} run(s), sha ${tip.measuredSha}).`);
md.push("");
md.push(`Machine load, base: ${loadOf(base).join("; ")}.`);
md.push(`Machine load, tip: ${loadOf(tip).join("; ")}.`);
md.push("");
md.push("| Phase | Field | Stat | Base ms | Tip ms | Tip/base - 1 | Budget |");
md.push("|---|---|---|---:|---:|---:|---|");
for (const r of rows) md.push(`| ${r.phase} | ${r.field} | ${r.stat} | ${fmt(r.base)} | ${fmt(r.tip)} | ${isFinite(r.ratio) ? `${(r.ratio * 100).toFixed(1)} %` : "inf"} | ${r.verdict} |`);
md.push("");
md.push(misses.length ? `Over budget (${misses.length}): ${misses.join("; ")}` : "Every budgeted field within budget.");
md.push("");
const text = md.join("\n");
console.log(text);
if (arg("md", "")) fs.writeFileSync(path.resolve(arg("md", "")), text + "\n");
if (arg("json", "")) fs.writeFileSync(path.resolve(arg("json", "")), JSON.stringify({ label: LABEL, base: arg("base"), tip: arg("tip"), rows, misses }, null, 1) + "\n");
