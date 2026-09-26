// determinism_runs.js - WG.00.09b Lane K Fix 1, section 3.4: run a gate command n times in a row (or several commands at the
// same time, --parallel), each run preceded by a machine-load sample, and keep the raw output.
//   Load at the start of each run: CPU % of the whole machine over 3 s (os.cpus() idle/total deltas), the AI worker count (the
//   PM's filter: claude.exe -p, grok.exe, codex exec; this session counts as 1) and the nw.exe count, by PowerShell CIM.
//   Per run: exit code, duration, the RESULT line, the pass/fail counts, the world seed from the preconditions line.
// Usage (from the root of a clone):
//   node tasks/WG.00.09b/lane-k/determinism_runs.js --runs 5 --log <file> -- node tools/test_layer_render_flat.js
//   node tasks/WG.00.09b/lane-k/determinism_runs.js --parallel --log <file> -- "node tools/test_layer_render_flat.js" "node tools/test_layer_render_flat.js --suite depth"
// Exit: 0 every run exited 0; 1 otherwise.
"use strict";
const fs = require("fs");
const os = require("os");
const { spawn, execFileSync } = require("child_process");

const argv = process.argv.slice(2), dd = argv.indexOf("--");
const own = dd >= 0 ? argv.slice(0, dd) : argv, rest = dd >= 0 ? argv.slice(dd + 1) : [];
const opt = (n, d) => { const i = own.indexOf(n); return i >= 0 && own[i + 1] !== undefined ? own[i + 1] : d; };
const parallel = own.includes("--parallel");
const runs = parallel ? 1 : Math.max(1, parseInt(opt("--runs", "1"), 10) || 1);
const log = opt("--log", null);
const commands = parallel ? rest.map(c => c.split(" ")) : [rest];
if (!commands.length || !commands[0].length) { console.error("usage: determinism_runs.js [--runs n | --parallel] --log <file> -- <command...>"); process.exit(2); }

const cpuTimes = () => { let idle = 0, total = 0; for (const c of os.cpus()) { const t = c.times; idle += t.idle; total += t.user + t.nice + t.sys + t.idle + t.irq; } return { idle, total }; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function load() {
    const at = new Date().toISOString(), c0 = cpuTimes();
    await sleep(3000);
    const c1 = cpuTimes();
    let workers = null, nw = null;
    try {
        const out = execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command",
            "$all = @(Get-CimInstance Win32_Process); $w = @($all | Where-Object { ($_.Name -eq 'claude.exe' -and $_.CommandLine -match ' -p ') -or $_.Name -eq 'grok.exe' -or ($_.Name -eq 'node.exe' -and $_.CommandLine -match 'codex\\.js.* exec') }).Count; $n = @($all | Where-Object { $_.Name -eq 'nw.exe' }).Count; \"$w $n\""], { encoding: "utf8", windowsHide: true });
        [workers, nw] = out.trim().split(/\s+/).map(Number);
    } catch (e) { /* recorded as null */ }
    return { at, cpuPercent3s: +(100 * (1 - (c1.idle - c0.idle) / Math.max(1, c1.total - c0.total))).toFixed(1), aiWorkers: workers, nwExe: nw };
}
function run(cmd) {
    return new Promise(resolve => {
        const t0 = Date.now();
        const child = spawn(cmd[0], cmd.slice(1), { stdio: ["ignore", "pipe", "pipe"] });
        let out = "";
        child.stdout.on("data", d => { out += d; });
        child.stderr.on("data", d => { out += d; });
        child.on("exit", code => resolve({ code, ms: Date.now() - t0, out }));
    });
}
const summarize = (cmd, r, ld, n) => {
    const res = (r.out.match(/^RESULT: .*$/m) || [null])[0] || (r.out.match(/^RESULT: \d+ passed, \d+ failed.*$/m) || ["(no RESULT line)"])[0];
    const req = (r.out.match(/^required checks: .*$/m) || [""])[0];
    const counts = (r.out.match(/^run: RESULT: (\d+) passed, (\d+) failed/m) || r.out.match(/^RESULT: (\d+) passed, (\d+) failed/m) || []).slice(1, 3);
    const seed = (r.out.match(/world seed (\d+)/) || [])[1] || "-";
    return `RUN ${n} | ${cmd.join(" ")} | load at start: CPU ${ld.cpuPercent3s} % (3 s), AI workers ${ld.aiWorkers}, nw.exe ${ld.nwExe} (${ld.at}) | EXIT=${r.code} DURATION_MS=${r.ms} | ${res}${req ? ` | ${req}` : ""}${counts.length ? ` | passed ${counts[0]}, failed ${counts[1]}` : ""} | world seed ${seed}`;
};
(async () => {
    const lines = [];
    let bad = 0;
    const put = s => { lines.push(s); console.log(s); if (log) fs.appendFileSync(log, s + "\n"); };
    put(`=== determinism_runs ${new Date().toISOString()} ${parallel ? `${commands.length} command(s) at the same time` : `${runs} consecutive run(s)`}; cwd ${process.cwd()}; git HEAD ${(() => { try { return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(); } catch (e) { return "?"; } })()} ===`);
    if (parallel) {
        const ld = await load();
        // The CPU while they run: one sample a second (os.cpus() deltas), min / median / max.
        const cpu = [];
        let last = cpuTimes();
        const timer = setInterval(() => { const now = cpuTimes(), dt = now.total - last.total; if (dt > 0) cpu.push(+(100 * (1 - (now.idle - last.idle) / dt)).toFixed(1)); last = now; }, 1000);
        const rs = await Promise.all(commands.map(c => run(c)));
        clearInterval(timer);
        const s = cpu.slice().sort((a, b) => a - b);
        put(`CPU while the ${commands.length} command(s) ran: min ${s[0]} / median ${s[Math.floor((s.length - 1) / 2)]} / max ${s[s.length - 1]} % over ${s.length} 1-s samples`);
        rs.forEach((r, i) => { if (r.code !== 0) bad++; put(summarize(commands[i], r, ld, `P${i + 1}`)); });
        rs.forEach((r, i) => put(`--- raw output P${i + 1}: ${commands[i].join(" ")} ---\n${r.out.trimEnd()}`));
    } else {
        for (let n = 1; n <= runs; n++) {
            const ld = await load();
            const r = await run(commands[0]);
            if (r.code !== 0) bad++;
            put(summarize(commands[0], r, ld, n));
            put(`--- raw output run ${n} ---\n${r.out.trimEnd()}`);
        }
    }
    put(`=== ${bad ? `${bad} run(s) did not exit 0` : "every run exited 0"} ===`);
    process.exit(bad ? 1 : 0);
})();
