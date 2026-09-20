// One command for the whole test run (written 2026-09-18): ONE snapshot copy of game/ with every world plugin
// registered (tools/test_snapshot.js --no-run), then every suite run in that copy one after another through
// tools/run_tests.js (a fresh nw.exe per suite, since UF_Test takes one suite name per launch; the copy itself is made
// once), then the inventory tool, then a table. The real game/ folder is never touched (ENGINE_RULES section 6).
//
// Usage: node tools/run_all_suites.js [--name <n>] [--plugins A,B,C] [--suites a,b,c] [--skip-inventory] [--dir <folder>]
//   --name            snapshot name (default "all"): the copy lives in %TEMP%\uf_snapshots\<name>
//   --plugins         UF_ plugins to register before UF_Test, in this order (default: PLUGINS below, the contract's list)
//   --suites          which suites, in order (default: SUITES below); "inventory" is the node tool
//   --skip-inventory  don't run tools/generate_asset_inventory.js (note: that tool rewrites docs/ASSET_INVENTORY.md and
//                     game/data/UF_AssetIndex.json in the real project, as running it by hand does)
//   --dir             where to put the copy (default: %TEMP%\uf_snapshots\<name>)
// Output: <snapshot>\test_output\all_results.txt (every suite's RESULT line, its FAIL/ERROR/HARNESS lines, timing),
//         <snapshot>\test_output\<suite>\results.txt plus that suite's screenshots (UF_Test deletes top-level PNGs and
//         results.txt at the start of every launch, so each suite's files are moved into their own folder), and a table.
// Exit code: 0 every suite passed, 1 any suite had a FAIL or didn't finish (no RESULT line), 2 the snapshot failed.
"use strict";
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");

const PLUGINS = ["UF_World", "UF_WorldGen", "UF_Tiles", "UF_Factions", "UF_History", "UF_Objects", "UF_Items", "UF_Jobs",
    "UF_ColonyOverseer", "UF_Colonists", "UF_Wildlife", "UF_Stance", "UF_Fog", "UF_DayNight", "UF_TimeSpeed", "UF_Camera", "UF_Visuals", "UF_Look", "UF_Interact"];
const SUITES = ["world", "worldgen", "biomes", "tiles", "objects", "items", "jobs", "colonists", "overseer", "wildlife", "factions",
    "history", "stance", "fog", "daynight", "timespeed", "visuals", "look", "smoke", "inventory"];

const args = process.argv.slice(2);
const opt = (name, fallback) => {
    const i = args.indexOf(name);
    return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const name = opt("--name", "all");
const plugins = (opt("--plugins", PLUGINS.join(",")) || "").split(",").map(s => s.trim()).filter(Boolean);
let suites = (opt("--suites", SUITES.join(",")) || "").split(",").map(s => s.trim()).filter(Boolean);
if (args.includes("--skip-inventory")) suites = suites.filter(s => s !== "inventory");
const root = path.resolve(__dirname, "..");
const dir = path.resolve(opt("--dir", path.join(os.tmpdir(), "uf_snapshots", name)));
const outDir = path.join(dir, "test_output");
const allFile = path.join(outDir, "all_results.txt");
const stamp = () => new Date().toISOString();
const seconds = ms => (ms / 1000).toFixed(1);

// 1. The snapshot, made once.
const snap = spawnSync(process.execPath, [path.join(__dirname, "test_snapshot.js"), "--name", name, "--dir", dir, "--plugins", plugins.join(","), "--no-run"], { encoding: "utf8" });
process.stdout.write(snap.stdout || "");
if (snap.status !== 0 || !fs.existsSync(path.join(dir, "js", "plugins.js"))) {
    console.error(`snapshot failed (exit ${snap.status}): ${snap.stderr || ""}`);
    process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });
const pluginOrder = (snap.stdout.match(/^plugins: (.*)$/m) || [])[1] || plugins.join(" > ");
const lines = [];
const log = line => {
    lines.push(line);
    fs.writeFileSync(allFile, lines.join("\n") + "\n");
};
log(`run_all_suites ${stamp()} snapshot ${dir}`);
log(`plugins: ${pluginOrder}`);
log(`suites: ${suites.join(", ")}`);
log("");

// 2. Each suite in turn.
const rows = [];
const resultRe = /^RESULT: (\d+) passed, (\d+) failed \(exit (\d)\)$/m;
for (let i = 0; i < suites.length; i++) {
    const suite = suites[i];
    const started = Date.now();
    process.stdout.write(`[${i + 1}/${suites.length}] ${suite} ... `);
    let row;
    if (suite === "inventory") {
        const r = spawnSync(process.execPath, [path.join(__dirname, "generate_asset_inventory.js")], { encoding: "utf8", cwd: root });
        const text = (r.stdout || "") + (r.stderr || "");
        const m = text.match(/^RESULT (PASS|FAIL) (\d+)\/(\d+) checks \(inventory\)$/m);
        const fails = text.split(/\r?\n/).filter(l => /^FAIL /.test(l));
        row = { suite, passed: m ? Number(m[2]) : 0, failed: m ? Number(m[3]) - Number(m[2]) : 0, exit: m ? (m[1] === "PASS" ? 0 : 1) : 2,
            result: m ? m[0] : `no RESULT line (exit ${r.status})`, fails, errors: [], ms: Date.now() - started, shots: [] };
        fs.mkdirSync(path.join(outDir, suite), { recursive: true });
        fs.writeFileSync(path.join(outDir, suite, "results.txt"), text);
    } else {
        const r = spawnSync(process.execPath, [path.join(__dirname, "run_tests.js"), suite, "--game", dir], { encoding: "utf8" });
        const resultsFile = path.join(outDir, "results.txt");
        const text = fs.existsSync(resultsFile) ? fs.readFileSync(resultsFile, "utf8") : "";
        const m = text.match(resultRe);
        const all = text.split(/\r?\n/);
        row = { suite, passed: m ? Number(m[1]) : 0, failed: m ? Number(m[2]) : 0, exit: m ? Number(m[3]) : 2,
            result: m ? m[0] : `no RESULT line (run_tests exit ${r.status}; ${(r.stderr || "").trim().split(/\r?\n/).filter(Boolean).slice(-2).join(" | ") || "no stderr"})`,
            fails: all.filter(l => /^FAIL /.test(l)), errors: all.filter(l => /^(ERROR|HARNESS) /.test(l)), ms: Date.now() - started, shots: [] };
        // Keep this suite's files: UF_Test wipes results.txt and every PNG in test_output at the next launch.
        const keep = path.join(outDir, suite);
        fs.rmSync(keep, { recursive: true, force: true });
        fs.mkdirSync(keep, { recursive: true });
        if (text) fs.writeFileSync(path.join(keep, "results.txt"), text);
        for (const f of fs.readdirSync(outDir)) {
            if (!f.endsWith(".png")) continue;
            fs.renameSync(path.join(outDir, f), path.join(keep, f));
            row.shots.push(path.join(keep, f));
        }
    }
    rows.push(row);
    console.log(`${row.result} (${seconds(row.ms)} s)`);
    log(`## ${suite} (${seconds(row.ms)} s)`);
    log(row.result);
    for (const l of row.fails) log(l);
    for (const l of row.errors) log(l);
    for (const s of row.shots) log(`SHOT ${s}`);
    log("");
}

// 3. The table.
const pad = (s, n, right) => (right ? String(s).padStart(n) : String(s).padEnd(n));
const table = [
    `${pad("suite", 11)} ${pad("passed", 6, true)} ${pad("failed", 6, true)} ${pad("exit", 4, true)} ${pad("secs", 6, true)}  first FAIL`,
    `${"-".repeat(11)} ${"-".repeat(6)} ${"-".repeat(6)} ${"-".repeat(4)} ${"-".repeat(6)}  ${"-".repeat(40)}`
];
for (const r of rows) {
    const first = r.exit === 2 ? r.result : (r.fails[0] || "");
    table.push(`${pad(r.suite, 11)} ${pad(r.passed, 6, true)} ${pad(r.failed, 6, true)} ${pad(r.exit, 4, true)} ${pad(seconds(r.ms), 6, true)}  ${first.length > 110 ? first.slice(0, 107) + "..." : first}`);
}
const bad = rows.filter(r => r.exit !== 0);
const passed = rows.reduce((n, r) => n + r.passed, 0), failed = rows.reduce((n, r) => n + r.failed, 0);
const totalMs = rows.reduce((n, r) => n + r.ms, 0);
const summary = `TOTAL: ${rows.length} suites, ${rows.length - bad.length} passed, ${bad.length} failed or unfinished (${bad.map(r => r.suite).join(", ") || "none"}); ${passed} checks passed, ${failed} failed; ${seconds(totalMs)} s`;
console.log("");
for (const l of table) console.log(l);
console.log(summary);
console.log(`all results: ${allFile}`);
log("## table");
for (const l of table) log(l);
log(summary);
process.exit(bad.length ? 1 : 0);
