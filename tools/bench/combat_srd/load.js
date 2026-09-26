"use strict";
// Machine load for a heavy NW.js run. Same quantities as WG.00.09b Fix 1:
// os.cpus() idle/total deltas, and the PM's process filter (claude -p, grok, codex exec, other nw.exe).

const os = require("os");
const { execFile, execFileSync } = require("child_process");

function cpuTimes() {
    let idle = 0;
    let total = 0;
    const cpus = os.cpus();
    for (let i = 0; i < cpus.length; i++) {
        const t = cpus[i].times;
        idle += t.idle;
        total += t.user + t.nice + t.sys + t.idle + t.irq;
    }
    return { idle: idle, total: total };
}

function cpuSampler() {
    const samples = [];
    let last = cpuTimes();
    const timer = setInterval(() => {
        const now = cpuTimes();
        const dt = now.total - last.total;
        if (dt > 0) samples.push({ t: Date.now(), cpu: +(100 * (1 - (now.idle - last.idle) / dt)).toFixed(1) });
        last = now;
    }, 1000);
    return { samples: samples, stop: () => clearInterval(timer) };
}

function stats3(arr) {
    if (!arr.length) return { samples: 0, min: null, median: null, max: null };
    const s = arr.slice().sort((a, b) => a - b);
    return { samples: s.length, min: s[0], median: s[Math.floor((s.length - 1) / 2)], max: s[s.length - 1] };
}

const PS_PROCS = [
    "$all = @(Get-CimInstance Win32_Process)",
    "$w = @($all | Where-Object { ($_.Name -eq 'claude.exe' -and $_.CommandLine -match ' -p ') -or $_.Name -eq 'grok.exe' -or ($_.Name -eq 'node.exe' -and $_.CommandLine -match 'codex\\.js.* exec') }).Count",
    "$nw = @($all | Where-Object { $_.Name -eq 'nw.exe' } | ForEach-Object { [pscustomobject]@{ pid = $_.ProcessId; ppid = $_.ParentProcessId; cmd = [string]$_.CommandLine } })",
    "[pscustomobject]@{ workers = $w; nw = $nw } | ConvertTo-Json -Compress -Depth 3"
].join("; ");
const PS_ARGS = ["-NoProfile", "-NonInteractive", "-Command", PS_PROCS];
const LOAD_NOTE = "aiWorkers: PowerShell CIM, claude.exe with ' -p ', grok.exe, node.exe running codex.js exec (the PM's filter); the session running this bench counts as 1. otherNwExe: nw.exe processes that are not this run's own.";

function procsOf(at, own, out) {
    const j = JSON.parse(String(out).trim());
    const nw = j.nw ? [].concat(j.nw) : [];
    const byPid = new Map(nw.map(p => [p.pid, p]));
    const isOwn = p => {
        if (!own) return false;
        if (own.profile && String(p.cmd || "").includes(own.profile)) return true;
        for (let q = p, n = 0; q && n < 16; q = byPid.get(q.ppid), n++) {
            if (own.rootPid && q.pid === own.rootPid) return true;
        }
        return false;
    };
    const others = nw.filter(p => !isOwn(p));
    return {
        at: at,
        aiWorkers: j.workers,
        otherNwExe: others.length,
        otherNw: others.map(p => ({ pid: p.pid, ppid: p.ppid, cmd: String(p.cmd || "").slice(0, 160) }))
    };
}

function procs(own) {
    const at = new Date().toISOString();
    try {
        return procsOf(at, own, execFileSync("powershell", PS_ARGS, { encoding: "utf8", windowsHide: true, timeout: 60000 }));
    } catch (e) {
        return { at: at, aiWorkers: null, otherNwExe: null, otherNw: [], error: e.message.split("\n")[0] };
    }
}

function procsAsync(own) {
    const at = new Date().toISOString();
    return new Promise(resolve => {
        execFile("powershell", PS_ARGS, { encoding: "utf8", windowsHide: true, timeout: 60000 }, (err, out) => {
            if (err) return resolve({ at: at, aiWorkers: null, otherNwExe: null, otherNw: [], error: err.message.split("\n")[0] });
            try { resolve(procsOf(at, own, out)); }
            catch (e) { resolve({ at: at, aiWorkers: null, otherNwExe: null, otherNw: [], error: e.message }); }
        });
    });
}

function machineLoad(load, phases) {
    const byPhase = {};
    for (let i = 0; i < phases.length; i++) {
        const p = phases[i];
        if (!Number.isFinite(p.wallStart) || !Number.isFinite(p.wallEnd)) continue;
        const c = stats3(load.cpuSamples.filter(s => s.t > p.wallStart && s.t - 1000 < p.wallEnd).map(s => s.cpu));
        byPhase[p.phase] = c;
        p.cpuPercent = c;
    }
    const overall = stats3(load.cpuSamples.map(s => s.cpu));
    const nwCounts = [load.start.otherNwExe].concat(load.during.map(d => d.otherNwExe), [load.end.otherNwExe]).filter(n => Number.isFinite(n));
    const otherNwMax = nwCounts.length ? Math.max.apply(null, nwCounts) : null;
    const quiet = overall.median !== null && overall.median <= 25 && otherNwMax === 0;
    return {
        label: quiet ? "quiet" : "loaded",
        labelRule: "quiet: overall median CPU <= 25 % and no other nw.exe at the start, in any 15 s check or at the end; otherwise loaded",
        method: "CPU: os.cpus() idle/total time deltas over all logical CPUs, one sample a second. " + LOAD_NOTE,
        startedAt: load.start.at,
        finishedAt: load.end.at,
        start: { aiWorkers: load.start.aiWorkers, otherNwExe: load.start.otherNwExe, otherNw: load.start.otherNw, error: load.start.error },
        end: { aiWorkers: load.end.aiWorkers, otherNwExe: load.end.otherNwExe, otherNw: load.end.otherNw, error: load.end.error },
        during: load.during,
        otherNwExeMax: otherNwMax,
        cpu: { intervalMs: 1000, overall: overall, byPhase: byPhase, samples: load.cpuSamples }
    };
}

module.exports = {
    cpuSampler: cpuSampler,
    procs: procs,
    procsAsync: procsAsync,
    machineLoad: machineLoad,
    stats3: stats3
};
