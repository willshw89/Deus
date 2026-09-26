// append_cost.js - WG.00.09b Lane K (Fix 1, M2): the cost of one synchronous log append, as DEUS_Core's UF.Events.emit does it
// for every listener of every world:* event (require('fs').appendFileSync('game_runtime.log', line)). Node on this machine,
// 2,000 appends of a line like the ones the game writes, to a temporary file that is deleted afterwards. The machine load is
// recorded with the numbers (os.cpus() idle/total deltas over the measurement, AI workers and nw.exe as in
// tools/bench_render_layers.js). Writes append_cost.json next to this script (never overwrites: append_cost_<n>.json).
// Usage: node tasks/WG.00.09b/lane-k/perf/append_cost.js
"use strict";
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

const N = 2000;
const line = `[2026-09-26T04:30:00.000Z] event world:unitMoved listener 3 took 0.02 ms\n`;
const file = path.join(os.tmpdir(), `lanek_append_cost_${process.pid}.log`);
const cpuTimes = () => { let idle = 0, total = 0; for (const c of os.cpus()) { const t = c.times; idle += t.idle; total += t.user + t.nice + t.sys + t.idle + t.irq; } return { idle, total }; };
const procs = () => {
    try {
        const out = execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command",
            "$all = @(Get-CimInstance Win32_Process); $w = @($all | Where-Object { ($_.Name -eq 'claude.exe' -and $_.CommandLine -match ' -p ') -or $_.Name -eq 'grok.exe' -or ($_.Name -eq 'node.exe' -and $_.CommandLine -match 'codex\\.js.* exec') }).Count; $n = @($all | Where-Object { $_.Name -eq 'nw.exe' }).Count; \"$w $n\""], { encoding: "utf8", windowsHide: true });
        const [w, n] = out.trim().split(/\s+/).map(Number);
        return { aiWorkers: w, nwExe: n };
    } catch (e) { return { error: e.message.split("\n")[0] }; }
};

const before = procs();
const c0 = cpuTimes();
const us = [];
for (let i = 0; i < N; i++) {
    const t = process.hrtime.bigint();
    fs.appendFileSync(file, line);
    us.push(Number(process.hrtime.bigint() - t) / 1000);
}
const c1 = cpuTimes();
const after = procs();
fs.rmSync(file, { force: true });
us.sort((a, b) => a - b);
const q = p => +us[Math.min(us.length - 1, Math.floor(p * (us.length - 1) + 0.5))].toFixed(1);
const out = {
    what: "one fs.appendFileSync of a 72-byte line, as DEUS_Core UF.Events.emit writes for each listener of each world:* event",
    appends: N, microseconds: { min: q(0), median: q(0.5), p95: q(0.95), max: q(1), mean: +(us.reduce((a, b) => a + b, 0) / N).toFixed(1) },
    machineLoad: { cpuPercentDuring: +(100 * (1 - (c1.idle - c0.idle) / Math.max(1, c1.total - c0.total))).toFixed(1), aiWorkersBefore: before.aiWorkers, aiWorkersAfter: after.aiWorkers, nwExeBefore: before.nwExe, nwExeAfter: after.nwExe,
        note: "aiWorkers: the PM's filter (claude.exe -p, grok.exe, codex exec); the session running this script counts as 1" },
    machine: { host: os.hostname(), cpus: os.cpus().length, cpu: os.cpus()[0] && os.cpus()[0].model, node: process.version },
    measuredAt: new Date().toISOString()
};
let dst = path.join(__dirname, "append_cost.json");
for (let n = 2; fs.existsSync(dst); n++) dst = path.join(__dirname, `append_cost_${n}.json`);
fs.writeFileSync(dst, JSON.stringify(out, null, 1) + "\n");
console.log(JSON.stringify(out, null, 1));
console.log(`wrote ${dst}`);
