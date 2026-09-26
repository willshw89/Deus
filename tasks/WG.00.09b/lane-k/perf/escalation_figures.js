// escalation_figures.js - WG.00.09b Lane K (Fix 1, M2): every figure escalation.md quotes, computed from the committed bench
// JSON files in this folder. Each line: an ID (the one escalation.md cites), the value, and where it comes from (file, field,
// phase/run). Rounding is stated on each line; escalation.md quotes the printed value.
//   Sets: fix1 = baseline_eb446e06.json + stress_baseline_eb446e06.json (the final Fix 1 code, machine load recorded);
//         fix1a = *_e3896d76.json, fix1b = baseline_8dbd0bdc.json (intermediate Fix 1 code, machine load recorded);
//         postK4 = *_f19b23bf.json, preK4 = *_5c6641e1.json, base = *_8592b07a.json (pre-Fix 1: taken under contention, load
//         not recorded). append_cost.json: the log-append cost.
//   The A rows are computed exactly as rank_k4.js computes them (same keys, same matchers).
// Usage: node tasks/WG.00.09b/lane-k/perf/escalation_figures.js
"use strict";
const fs = require("fs");
const path = require("path");
const dir = __dirname;
const read = f => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));

const SETS = [
    { id: "fix1", label: "Fix 1 final code eb446e06, machine load recorded (runs[].machineLoad)", files: ["baseline_eb446e06.json", "stress_baseline_eb446e06.json"] },
    { id: "fix1a", label: "Fix 1 intermediate code e3896d76 (items found by one cell lookup per window cell), machine load recorded", files: ["baseline_e3896d76.json", "stress_baseline_e3896d76.json"] },
    { id: "fix1b", label: "Fix 1 intermediate code 8dbd0bdc (normal only; the bench tool before the nw.exe process-tree rule), machine load recorded", files: ["baseline_8dbd0bdc.json"] },
    { id: "postK4", label: "post-K4 f19b23bf (pre-Fix 1: taken under contention, load not recorded)", files: ["baseline_f19b23bf.json", "stress_baseline_f19b23bf.json"] },
    { id: "preK4", label: "pre-K4 5c6641e1 (pre-Fix 1: taken under contention, load not recorded)", files: ["baseline_5c6641e1.json", "stress_baseline_5c6641e1.json"] },
    { id: "base", label: "branch base 8592b07a (pre-Fix 1: taken under contention, load not recorded)", files: ["baseline_8592b07a.json", "stress_baseline_8592b07a.json"] }
];
// The rows of rank_k4.js (label, kind, matcher).
const ROWS = [
    ["env", "Environment wetness/thermal -> Floors.isRoofed/roomAt/computeRoom -> Objects.atIn (inclusive)", "incl", /^updateEnvironment DEUS_Environment\.js/],
    ["colonists", "Colonists scan/decide (inclusive)", "incl", /^scan DEUS_Colonists\.js/],
    ["hazard", "hazard reflex -> Jobs.safeCellNear -> standableIn -> World.walkable (inclusive)", "incl", /^hazardReflexJob DEUS_Colonists\.js/],
    ["worldUpdate", "World.update (inclusive)", "incl", /^World\.update DEUS_World\.js/],
    ["log", "synchronous log writes: self of open/close/writeBuffer/writeString/fsync", "self", ["open", "close", "writeBuffer", "writeString", "fsync"]],
    ["effekseer", "Effekseer (wasm) self", "self", ["wasm "]],
    ["gc", "garbage collector self", "self", ["(garbage collector)"]],
    ["objectsSelf", "DEUS_Objects.js self", "self", ["DEUS_Objects.js"]],
    ["worldSelf", "DEUS_World.js self", "self", ["DEUS_World.js"]],
    ["floorsSelf", "DEUS_Floors.js self", "self", ["DEUS_Floors.js"]],
    ["jobsSelf", "DEUS_Jobs.js self", "self", ["DEUS_Jobs.js"]],
    ["depthSelf", "DEUS_Depth.js self", "self", ["DEUS_Depth.js"]],
    ["minimapSelf", "DEUS_Minimap.js self", "self", ["DEUS_Minimap.js"]],
    ["fogSelf", "DEUS_Fog.js self", "self", ["DEUS_Fog.js"]],
    ["dayNightSelf", "DEUS_DayNight.js self", "self", ["DEUS_DayNight.js"]]
];
const rowMs = (pr, kind, m) => {
    if (kind === "incl") { const hit = pr.topInclusive.find(e => m.test(e.fn)); return hit ? hit.msPerUpdate : null; }
    return pr.selfByScript.filter(e => m.includes(e.fn) || m.some(x => x.endsWith(" ") && e.fn.startsWith(x))).reduce((a, e) => a + e.msPerUpdate, 0);
};
const f2 = v => (v === null || v === undefined ? "n/a" : v.toFixed(2));
const f1 = v => (v === null || v === undefined ? "n/a" : v.toFixed(1));
const range = (a, f = x => String(x)) => (a.length ? `${f(Math.min(...a))}-${f(Math.max(...a))}` : "n/a");
const out = [];
const fig = (id, value, source) => out.push(`${id.padEnd(30)} ${value}\n${" ".repeat(31)}<- ${source}`);

for (const set of SETS) {
    out.push(`\n=== ${set.id}: ${set.label} ===`);
    const docs = set.files.map(f => ({ f, r: read(f) }));
    const src = docs.map(d => d.f).join(" + ");
    // Runs, units, GL, machine load.
    for (const { f, r } of docs) {
        fig(`${set.id}.${r.scenario}.runs`, `${r.runs.length} run(s); units in the world ${r.runs.map(x => x.environment.units).join(", ")}`, `${f}: runs[].environment.units`);
        fig(`${set.id}.${r.scenario}.machine`, JSON.stringify(r.machine), `${f}: machine`);
        fig(`${set.id}.${r.scenario}.gl`, [...new Set(r.runs.map(x => x.environment.gl))].join(" | "), `${f}: runs[].environment.gl`);
        for (const run of r.runs) {
            const ml = run.machineLoad;
            if (!ml) { fig(`${set.id}.${r.scenario}.r${run.run}.load`, "no machineLoad (not recorded)", `${f}: runs[${run.run - 1}]`); continue; }
            const pre = ml.preRun && ml.preRun.length ? ml.preRun.map(a => `${a.cpu.median} % median over ${a.cpu.samples} s, other nw.exe ${a.otherNwExe.join("/")}, ${a.quiet ? "quiet" : "loaded"}`).join("; ") : "none";
            fig(`${set.id}.${r.scenario}.r${run.run}.load`, `${ml.label}; CPU min/median/max ${ml.cpu.overall.min}/${ml.cpu.overall.median}/${ml.cpu.overall.max} % (${ml.cpu.overall.samples} 1-s samples); AI workers ${ml.start.aiWorkers} start, ${ml.end.aiWorkers} end; other nw.exe ${ml.start.otherNwExe} start, max ${ml.otherNwExeMax}, ${ml.end.otherNwExe} end; ${ml.startedAt} to ${ml.finishedAt}; pre-run probe: ${pre}`,
                `${f}: runs[${run.run - 1}].machineLoad (label, cpu.overall, start, end, otherNwExeMax, startedAt, finishedAt, preRun)`);
        }
    }
    // A. Profile rows, as rank_k4.js.
    const windows = [];
    for (const { f, r } of docs) for (const run of r.runs) for (const [lab, pr] of Object.entries(run.profiles || {})) windows.push({ f, sc: r.scenario, run: run.run, lab, pr });
    fig(`${set.id}.windows`, `${windows.length} profiled windows: ${windows.map(w => `${w.sc}#${w.run}:${w.lab}`).join(", ")}`, `${src}: runs[].profiles`);
    for (const [key, label, kind, m] of ROWS) {
        const vals = windows.map(w => ({ w, v: rowMs(w.pr, kind, m) })).filter(x => x.v !== null);
        const v = vals.map(x => x.v);
        const mean = v.length ? v.reduce((a, b) => a + b, 0) / v.length : null, worst = v.length ? Math.max(...v) : null;
        const worstAt = vals.find(x => x.v === worst);
        fig(`${set.id}.A.${key}`, `mean ${f2(mean)} / worst ${f2(worst)} ms per update over ${v.length} window(s)${worstAt ? `; worst in ${worstAt.w.sc}#${worstAt.w.run}:${worstAt.w.lab}` : ""}${key === "hazard" ? `; per window: ${vals.map(x => `${x.w.sc}#${x.w.run}:${x.w.lab} ${f2(x.v)}`).join(", ") || "none"}` : ""} (2 decimals)`,
            `${src}: runs[].profiles[*].${kind === "incl" ? `topInclusive[fn ~ ${m}]` : `selfByScript[fn in ${JSON.stringify(m)}]`}.msPerUpdate`);
    }
    // The environment's share of Scene_Map.updateMain and of the non-idle sampled time, per window.
    const shareMain = [], shareAll = [];
    for (const w of windows) {
        const env = rowMs(w.pr, "incl", /^updateEnvironment DEUS_Environment\.js/);
        const mainHits = w.pr.topInclusive.filter(e => /^Scene_Map\.updateMain /.test(e.fn)).map(e => e.msPerUpdate);
        const idle = (w.pr.selfByScript.find(e => e.fn === "(idle)") || { msPerUpdate: 0 }).msPerUpdate;
        const busy = w.pr.sampledMs / w.pr.updates - idle;
        if (env !== null && mainHits.length) shareMain.push(100 * env / Math.max(...mainHits));
        if (env !== null && busy > 0) shareAll.push(100 * env / busy);
    }
    fig(`${set.id}.A.envShareOfUpdateMain`, `${range(shareMain, f1)} % over ${shareMain.length} window(s) (1 decimal)`, `${src}: runs[].profiles[*]: topInclusive 'updateEnvironment DEUS_Environment.js' / the largest topInclusive 'Scene_Map.updateMain *'`);
    fig(`${set.id}.A.envShareOfBusy`, `${range(shareAll, f1)} % over ${shareAll.length} window(s) (1 decimal)`, `${src}: runs[].profiles[*]: topInclusive 'updateEnvironment DEUS_Environment.js' / (sampledMs / updates - selfByScript '(idle)')`);
    // B. Wrapped parts (median ms per tick in each steady/stress phase).
    for (const part of ["update", "update.map", "update.map.world", "events", "render", "update.spriteset.tilemap.depth", "update.depth_late", "render.depth", "update.minimap"]) {
        const v = [];
        for (const { r } of docs) for (const run of r.runs) for (const p of run.phases) if (/^(steady_|stress_)/.test(p.phase) && p.parts[part]) v.push(p.parts[part].median);
        const mean = v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
        fig(`${set.id}.B.${part}`, `mean ${mean === null ? "n/a" : mean.toFixed(3)} / worst ${v.length ? Math.max(...v).toFixed(3) : "n/a"} ms per tick over ${v.length} phase(s) (3 decimals)`, `${src}: runs[].phases[steady_*|stress_*].parts["${part}"].median`);
    }
    // The lane's item and wall re-reads: the largest per-tick time in any phase (the wrapped parts carry a max per phase).
    for (const part of ["depth.plane.rebuildItems", "depth.plane.rebuildWalls"]) {
        const mx = [];
        for (const { r } of docs) for (const run of r.runs) for (const p of run.phases) if (p.parts[part]) mx.push(p.parts[part].max);
        const s2 = mx.slice().sort((x, y) => x - y);
        fig(`${set.id}.B.${part}.max`, mx.length ? `largest ${Math.max(...mx)} ms in one tick; median of the phases' largest ${s2[Math.floor((s2.length - 1) / 2)]} ms over ${mx.length} phase(s)` : "not measured", `${src}: runs[].phases[].parts["${part}"].max`);
    }
    // Frame and tick medians by phase kind.
    const byKind = { paused: /^paused_/, steady: /^steady_/, stress: /^stress_/ };
    for (const [kind, re] of Object.entries(byKind)) {
        const list = [];
        for (const { r } of docs) for (const run of r.runs) for (const p of run.phases) if (re.test(p.phase)) list.push({ run: `${r.scenario}#${run.run}`, phase: p.phase, frame: p.frameMs.median, tick: p.tickMs.median, cpu: p.cpuPercent });
        if (!list.length) continue;
        fig(`${set.id}.frames.${kind}`, `frame median ${range(list.map(x => x.frame))} ms over ${list.length} phase(s): ${list.map(x => `${x.run}:${x.phase} ${x.frame}${x.cpu ? ` (CPU ${x.cpu.median} %)` : ""}`).join(", ")}`, `${src}: runs[].phases[${re}].frameMs.median${list[0].cpu ? ", .cpuPercent.median" : ""}`);
        fig(`${set.id}.ticks.${kind}`, `tick median ${range(list.map(x => x.tick))} ms over ${list.length} phase(s): ${list.map(x => `${x.run}:${x.phase} ${x.tick}`).join(", ")}`, `${src}: runs[].phases[${re}].tickMs.median`);
    }
    // World events per frame in the stress phases.
    const ev = [];
    for (const { r } of docs) for (const run of r.runs) for (const p of run.phases) if (/^stress_/.test(p.phase) && p.worldEventsPerFrame) ev.push({ at: `${r.scenario}#${run.run}:${p.phase}`, e: p.worldEventsPerFrame });
    if (ev.length) fig(`${set.id}.events.stress`, ev.map(x => `${x.at}: ${x.e.median} world:* events a frame (median), max ${x.e.max}; listener calls median ${x.e.listenerCallsMedian}, max ${x.e.listenerCallsMax}`).join("; "), `${src}: runs[].phases[stress_*].worldEventsPerFrame`);
    // Level switches.
    const sw = [];
    for (const { r } of docs) for (const run of r.runs) for (const s of run.switches || []) sw.push(s);
    if (sw.length) {
        fig(`${set.id}.switch.requestToStarted`, `${range(sw.map(s => s.requestToStartedMs), f1)} ms over ${sw.length} switch(es) (1 decimal)`, `${src}: runs[].switches[].requestToStartedMs`);
        const ls = sw.map(s => s.levelsLastSwitch && s.levelsLastSwitch.ms).filter(Number.isFinite);
        fig(`${set.id}.switch.lastSwitchMs`, `${range(ls, f1)} ms over ${ls.length} switch(es) (1 decimal)`, `${src}: runs[].switches[].levelsLastSwitch.ms`);
        const peek = sw.map(s => s.depth && s.depth.lastPeekMs).filter(Number.isFinite), paint = sw.map(s => s.depth && s.depth.lastPaintMs).filter(Number.isFinite), made = sw.map(s => s.depth && s.depth.canvasesMade).filter(Number.isFinite);
        fig(`${set.id}.switch.depth`, `lastPeekMs ${range(peek, v => v.toFixed(3))}, lastPaintMs ${range(paint, v => v.toFixed(3))} ms (3 decimals); canvasesMade ${[...new Set(made)].join("/")}`, `${src}: runs[].switches[].depth.lastPeekMs, .lastPaintMs, .canvasesMade`);
        const slow = sw.reduce((x, y) => (y.requestToStartedMs > x.requestToStartedMs ? y : x));
        fig(`${set.id}.switch.slowest`, `${slow.from} -> ${slow.to}: request to started ${slow.requestToStartedMs} ms, levelsLastSwitch.ms ${slow.levelsLastSwitch ? slow.levelsLastSwitch.ms.toFixed(1) : "n/a"} (1 decimal), depth lastPeekMs ${slow.depth ? slow.depth.lastPeekMs : "n/a"}, lastPaintMs ${slow.depth ? slow.depth.lastPaintMs : "n/a"}`, `${src}: runs[].switches[] with the largest requestToStartedMs`);
        fig(`${set.id}.switch.worstFrame`, `${range(sw.map(s => s.worstFrameMs), f1)} ms worst frame in the 30 frames after a switch (1 decimal)`, `${src}: runs[].switches[].worstFrameMs`);
    }
}
if (fs.existsSync(path.join(dir, "append_cost.json"))) {
    const a = read("append_cost.json");
    out.push("\n=== append_cost.json ===");
    fig("append.us", `${a.appends} appends: median ${a.microseconds.median}, p95 ${a.microseconds.p95}, min ${a.microseconds.min}, max ${a.microseconds.max} us; CPU ${a.machineLoad.cpuPercentDuring} % during, AI workers ${a.machineLoad.aiWorkersBefore}/${a.machineLoad.aiWorkersAfter}, nw.exe ${a.machineLoad.nwExeBefore}/${a.machineLoad.nwExeAfter}; ${a.measuredAt}`, "append_cost.json: microseconds, machineLoad, measuredAt");
}
console.log(out.join("\n"));
