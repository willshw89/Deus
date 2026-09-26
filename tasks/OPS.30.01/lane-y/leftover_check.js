#!/usr/bin/env node
"use strict";
// OPS.30.01 lane-y evidence helper: lists processes whose command line names <path> (any slash style, any case),
// leaving out this process and its ancestors (the shell that ran it). It kills nothing.
// Usage: node tasks/OPS.30.01/lane-y/leftover_check.js <path> [<path> ...]
// Prints "LEFTOVER pid=<n> <command line>" per match and "LEFTOVER CHECK: <n> process(es)"; exit 0 when none, 1 otherwise.
const path = require("path");
const { spawnSync } = require("child_process");

const needles = process.argv.slice(2).map(p => path.resolve(p).replace(/\\/g, "/").toLowerCase());
if (!needles.length) { console.error("usage: leftover_check.js <path> [<path> ...]"); process.exit(2); }
const sysroot = process.env.SystemRoot || "C:\\Windows";
const ps = "Get-CimInstance Win32_Process | ForEach-Object { '{0}|{1}|{2}' -f $_.ProcessId, $_.ParentProcessId, ($_.CommandLine -replace '[\\r\\n]+', ' ') }";
const r = spawnSync(path.join(sysroot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"), ["-NoProfile", "-NonInteractive", "-Command", ps],
    { encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
if (r.status !== 0) { console.error(`cannot list processes: ${r.stderr || r.error}`); process.exit(2); }
const procs = r.stdout.split(/\r?\n/).map(l => /^(\d+)\|(\d+)\|(.*)$/.exec(l)).filter(Boolean).map(m => ({ pid: +m[1], ppid: +m[2], cmd: m[3] }));
const byPid = new Map(procs.map(p => [p.pid, p]));
const mine = new Set([process.pid, r.pid]);
for (let cur = byPid.get(process.pid); cur && !mine.has(cur.ppid);) { mine.add(cur.ppid); cur = byPid.get(cur.ppid); }
const hits = procs.filter(p => !mine.has(p.pid) && needles.some(n => p.cmd.replace(/\\/g, "/").toLowerCase().includes(n)));
for (const h of hits) console.log(`LEFTOVER pid=${h.pid} ${h.cmd.slice(0, 300)}`);
console.log(`LEFTOVER CHECK: ${hits.length} process(es) naming ${needles.join(", ")}`);
process.exit(hits.length ? 1 : 0);
