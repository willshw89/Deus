#!/usr/bin/env node
"use strict";

/**
 * tools/ops/test_run_gate.js
 *
 * OPS.30.01 (Lane Y): checks for tools/ops/run_gate.js. Prints "PASS <name>" or "FAIL <name>" per check, then
 * "RESULT: <n> passed, <m> failed"; exits 0 only when every check passes.
 *
 * It builds synthetic git repos under the OS temp folder from tools/ops/fixtures/run_gate/ (each fixture suite is
 * copied to tools/test_<name>.js), runs run_gate.js against them with --root, and deletes them at the end. Every
 * fixture suite writes "<file name>.ran" into RUN_GATE_FIXTURE_MARKERS when it runs; that is how the checks prove
 * what was and was not spawned. No fixture starts the NW.js harness, even when run.
 *
 * Mutation checks: each mutant is applied to an in-memory copy of run_gate.js, which runs as `node -` with the source
 * on stdin; run_gate.js on disk is never written. A mutant counts as killed when its check set passes on the
 * unmutated source (run the same way) and fails on the mutant.
 *
 * run_gate.js screens this file as a suite by its text, so the file never spells the harness names out.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const IS_WIN = process.platform === "win32";
const SYSROOT = process.env.SystemRoot || process.env.SYSTEMROOT || "C:\\Windows";
const RUNNER = path.join(__dirname, "run_gate.js");
const FIX = path.join(__dirname, "fixtures", "run_gate");
const LISTS = path.join(FIX, "lists");
const SOURCE = fs.readFileSync(RUNNER, "utf8").replace(/\r\n/g, "\n");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "deus-test-run-gate-"));
const MARKERS = path.join(TMP, "markers");
fs.mkdirSync(MARKERS);

let passed = 0, failed = 0;
function check(name, ok, detail) {
    if (ok) { passed++; console.log(`PASS ${name}`); }
    else { failed++; console.log(`FAIL ${name}${detail ? ` -- ${String(detail).replace(/\s+/g, " ").slice(0, 600)}` : ""}`); }
    return !!ok;
}

// ---------------------------------------------------------------- fixture repos

const GIT_ENV = (() => {
    const env = Object.assign({}, process.env);
    for (const k of Object.keys(env)) if (/^GIT_/i.test(k)) delete env[k];
    env.GIT_TERMINAL_PROMPT = "0";
    return env;
})();

function git(cwd, args) {
    const r = spawnSync("git", args, { cwd, env: GIT_ENV, encoding: "utf8", windowsHide: true });
    if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed in ${cwd}: ${r.stderr || r.error}`);
    return r.stdout;
}

function makeRepo(name, layout) {
    const dir = path.join(TMP, name);
    for (const [dest, src] of Object.entries(layout)) {
        const d = path.join(dir, dest);
        fs.mkdirSync(path.dirname(d), { recursive: true });
        fs.copyFileSync(path.join(FIX, src), d);
    }
    git(dir, ["-c", "init.defaultBranch=main", "init", "-q"]);
    git(dir, ["-c", "core.autocrlf=false", "add", "-A"]);
    git(dir, ["-c", "user.name=run_gate fixture", "-c", "user.email=run_gate@fixture.invalid", "-c", "core.autocrlf=false", "commit", "-q", "-m", "fixture"]);
    return dir;
}

const SUITES = ["pass", "fail", "hang", "leak", "missing_module", "missing_plugin", "enoent", "type_error", "stdout_only",
    "stderr_decides", "nw_binary_ref", "harness_runner_ref", "via_helper", "via_spawned_script", "plugin_comment", "guard_evasion", "dotnet_missing_file", "plugin_not_loaded"];
const sp = n => `tools/test_${n}.js`;
const NESTED = "tools/sub/test_pass_nested.js";
const HELPERS = {
    "tools/fixture_sleeper.js": "helpers/sleeper.js",
    "tools/fixture_api.js": "helpers/api.js",
    "tools/fixture_harness_helper.js": "helpers/harness_helper.js",
    "tools/fixture_launcher.js": "helpers/launcher.js",
    "game/js/plugins/DEUS_FixtureNotes.js": "helpers/plugin_notes.js"
};
const FULL_LAYOUT = Object.assign({}, ...SUITES.map(n => ({ [sp(n)]: `suites/${n}.js` })), { [NESTED]: "suites/pass.js" }, HELPERS,
    { "tools/ops/gate_tests.json": "lists/gate_all_pass.json" });
const SMALL_LAYOUT = {
    [sp("pass")]: "suites/pass.js", [NESTED]: "suites/pass.js", [sp("fail")]: "suites/fail.js",
    [sp("nw_binary_ref")]: "suites/nw_binary_ref.js", "tools/ops/gate_tests.json": "lists/cl_gate_ok.json"
};
const EXPECT = {
    [sp("pass")]: "PASS", [NESTED]: "PASS", [sp("fail")]: "FAIL_OTHER", [sp("hang")]: "KILLED_TIMEOUT", [sp("leak")]: "PASS",
    [sp("missing_module")]: "FAIL_MISSING_DEPENDENCY", [sp("missing_plugin")]: "FAIL_MISSING_REFERENCE",
    [sp("enoent")]: "FAIL_MISSING_REFERENCE", [sp("type_error")]: "FAIL_API_DRIFT", [sp("stdout_only")]: "FAIL_MISSING_REFERENCE",
    [sp("stderr_decides")]: "FAIL_OTHER", [sp("nw_binary_ref")]: "NEEDS_NWJS", [sp("harness_runner_ref")]: "NEEDS_NWJS",
    [sp("via_helper")]: "NEEDS_NWJS", [sp("via_spawned_script")]: "NEEDS_NWJS", [sp("plugin_comment")]: "PASS",
    [sp("guard_evasion")]: "NEEDS_NWJS", [sp("dotnet_missing_file")]: "FAIL_MISSING_REFERENCE", [sp("plugin_not_loaded")]: "FAIL_MISSING_REFERENCE"
};
const STATIC_NW = ["nw_binary_ref", "harness_runner_ref", "via_helper", "via_spawned_script"];

// ---------------------------------------------------------------- processes

function killTree(pid) {
    if (!pid) return;
    if (IS_WIN) spawnSync(path.join(SYSROOT, "System32", "taskkill.exe"), ["/PID", String(pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    else { try { process.kill(-pid, "SIGKILL"); } catch (_) { try { process.kill(pid, "SIGKILL"); } catch (_) { /* gone */ } } }
}

function alive(pid) {
    try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function allDead(pids) {
    for (let i = 0; i < 20 && pids.some(alive); i++) await sleep(100);
    return pids.length > 0 && !pids.some(alive);
}

// Runs run_gate.js (from disk, or `node -` with a source on stdin). A watchdog kills its whole tree.
function runRunner(args, opts = {}) {
    return new Promise(resolve => {
        const argv = opts.source ? ["-", ...args] : [RUNNER, ...args];
        const child = spawn(process.execPath, argv, {
            cwd: TMP, env: Object.assign({}, process.env, { RUN_GATE_FIXTURE_MARKERS: MARKERS }),
            stdio: [opts.source ? "pipe" : "ignore", "pipe", "pipe"], windowsHide: true, detached: !IS_WIN
        });
        let out = "", err = "", code = null, done = false, watchdogFired = false;
        child.stdout.on("data", d => { out += d; });
        child.stderr.on("data", d => { err += d; });
        if (opts.source) child.stdin.end(opts.source);
        const finish = () => { if (done) return; done = true; clearTimeout(watchdog); resolve({ code, out, err, watchdogFired, text: out + err }); };
        const watchdog = setTimeout(() => { watchdogFired = true; killTree(child.pid); }, opts.watchdogMs || 120000);
        child.on("exit", c => { code = c; setTimeout(finish, 3000); });
        child.on("close", c => { code = c; finish(); });
    });
}

// Processes the fixtures recorded; they were started (through run_gate.js) by this test, so the test may end them.
function recordedPids() {
    const pids = [];
    for (const f of ["hang.pids", "leak.pid"]) {
        try { pids.push(...fs.readFileSync(path.join(MARKERS, f), "utf8").trim().split(/\s+/).map(Number).filter(Boolean)); } catch (_) { /* none */ }
    }
    return pids;
}

function cleanup() {
    for (const pid of recordedPids()) if (alive(pid)) killTree(pid);
}

function clearMarkers() {
    cleanup();
    for (const f of fs.readdirSync(MARKERS)) fs.rmSync(path.join(MARKERS, f), { force: true });
}

function ran(file) { return fs.existsSync(path.join(MARKERS, `${path.basename(file, ".js")}.ran`)); }
function pidsIn(file) { try { return fs.readFileSync(path.join(MARKERS, file), "utf8").trim().split(/\s+/).map(Number).filter(Boolean); } catch (_) { return []; } }
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (_) { return null; } }
function codes(text) { return [...new Set((text.match(/^VIOLATION (\w+):/gm) || []).map(l => l.slice(10, -1)))].sort().join(","); }

let outSeq = 0;
function outFile(tag) { return path.join(TMP, `census_${tag}_${++outSeq}.json`); }

// ---------------------------------------------------------------- check sets (shared by the main run and the mutants)

let FULL, SMALL;

async function setGateFail(run) {
    clearMarkers();
    const r = await run(["--root", FULL, "--gate-list", path.join(LISTS, "gate_one_fails.json")]);
    return [["gate_one_suite_broken_exit_1", r.code === 1 && /^GATE tools\/test_fail\.js EXIT=1 \d+ms/m.test(r.out) && /^RESULT: 1 passed, 1 failed$/m.test(r.out), r.text]];
}

async function setTimeoutKill(run) {
    clearMarkers();
    const r = await run(["--root", FULL, "--suite", sp("hang"), "--timeout", "2"], { watchdogMs: 25000 });
    const pids = pidsIn("hang.pids");
    const dead = await allDead(pids);
    return [
        ["gate_timeout_exit_1", r.code === 1 && !r.watchdogFired && /^GATE tools\/test_hang\.js EXIT=TIMEOUT \d+ms KILLED_TIMEOUT/m.test(r.out), r.text],
        ["gate_timeout_killed_suite_and_child", pids.length === 2 && dead && /^LEFTOVERS: none$/m.test(r.out), `pids ${pids.join(" ")} alive ${pids.filter(alive).join(" ")} ${r.out}`]
    ];
}

async function setTreeKill(run) {
    clearMarkers();
    const out = outFile("tree");
    const r = await run(["--census", "--root", FULL, "--suite", sp("hang"), "--timeout", "2", "--out", out], { watchdogMs: 40000 });
    const doc = readJson(out) || {};
    const row = (doc.suites || [])[0] || {};
    const leftovers = (doc.leftovers || []).filter(l => l.suite === sp("hang"));
    const pids = pidsIn("hang.pids");
    return [
        ["census_timeout_row", r.code === 0 && row.category === "KILLED_TIMEOUT" && row.exitCode === null, r.text],
        ["census_timeout_tree_killed_before_sweep", pids.length === 2 && leftovers.length === 0 && await allDead(pids), JSON.stringify(doc.leftovers)]
    ];
}

async function setScreenGate(run) {
    clearMarkers();
    const r = await run(["--root", FULL, "--suite", sp("nw_binary_ref")]);
    return [["gate_refuses_nwjs_suite_named_exit_2", r.code === 2 && /^REFUSED tools\/test_nw_binary_ref\.js NEEDS_NWJS: static screen:/m.test(r.out) && !ran(sp("nw_binary_ref")), `ran=${ran(sp("nw_binary_ref"))} ${r.text}`]];
}

async function setTransitive(run) {
    clearMarkers();
    const r = await run(["--root", FULL, "--suite", sp("via_helper"), "--suite", sp("via_spawned_script")]);
    const ok = r.code === 2
        && /^REFUSED tools\/test_via_helper\.js NEEDS_NWJS: static screen: tools\/test_via_helper\.js -> tools\/fixture_harness_helper\.js:\d+/m.test(r.out)
        && /^REFUSED tools\/test_via_spawned_script\.js NEEDS_NWJS: static screen: tools\/test_via_spawned_script\.js -> tools\/fixture_launcher\.js:\d+/m.test(r.out)
        && !ran(sp("via_helper")) && !ran(sp("via_spawned_script"));
    return [["gate_refuses_transitive_nwjs_exit_2", ok, r.text]];
}

async function setMissingModule(run) {
    clearMarkers();
    const out = outFile("mm");
    const r = await run(["--census", "--root", FULL, "--suite", sp("missing_module"), "--out", out]);
    const row = ((readJson(out) || {}).suites || [])[0] || {};
    return [["census_missing_module_category", r.code === 0 && row.category === "FAIL_MISSING_DEPENDENCY" && /Cannot find module/.test(row.firstErrorLine || ""), JSON.stringify(row)]];
}

async function setDuplicate(run) {
    const r = await run(["--check-lists", "--root", SMALL, "--gate-list", path.join(LISTS, "cl_gate_duplicate.json"), "--quarantine", path.join(LISTS, "cl_quarantine_ok.json")]);
    return [["check_lists_duplicate_in_gate", r.code === 1 && codes(r.out) === "DUPLICATE", r.text]];
}

async function setUnlisted(run) {
    const r = await run(["--check-lists", "--root", SMALL, "--gate-list", path.join(LISTS, "cl_gate_ok.json"), "--quarantine", path.join(LISTS, "cl_quarantine_unlisted.json")]);
    return [["check_lists_unlisted_suite", r.code === 1 && codes(r.out) === "UNLISTED" && /VIOLATION UNLISTED: tools\/test_fail\.js /.test(r.out), r.text]];
}

async function setGuard(run) {
    clearMarkers();
    const out = outFile("guard");
    const r = await run(["--census", "--root", FULL, "--suite", sp("guard_evasion"), "--out", out]);
    const row = ((readJson(out) || {}).suites || [])[0] || {};
    const spawned = fs.existsSync(path.join(MARKERS, "guard_evasion.spawned"));
    return [["census_runtime_guard_blocks_launch", r.code === 0 && row.category === "NEEDS_NWJS" && row.rule === "runtime_guard"
        && /^RUN_GATE_GUARD: blocked spawnSync\(/.test(row.firstErrorLine || "") && ran(sp("guard_evasion")) && !spawned, `spawned=${spawned} ${JSON.stringify(row)}`]];
}

async function setLeak(run) {
    clearMarkers();
    const out = outFile("leak");
    const r = await run(["--census", "--root", FULL, "--suite", sp("leak"), "--out", out]);
    const doc = readJson(out) || {};
    const pid = pidsIn("leak.pid")[0];
    const swept = (doc.leftovers || []).find(l => l.pid === pid && l.suite === sp("leak") && l.gone === true);
    const dead = pid ? await allDead([pid]) : false;
    return [["census_leftover_child_swept", r.code === 0 && !!swept && dead && /^LEFTOVER pid=\d+ killed \(child of tools\/test_leak\.js/m.test(r.out), `pid=${pid} dead=${dead} ${r.text}`]];
}

// ---------------------------------------------------------------- main checks

async function gateChecks() {
    clearMarkers();
    let r = await runRunner(["--root", FULL]);
    check("gate_all_pass_exit_0", r.code === 0 && /^RESULT: 2 passed, 0 failed$/m.test(r.out) && ran(sp("pass")) && ran(NESTED), r.text);
    check("gate_default_timeout_600", /timeout 600 s each, one at a time$/m.test(r.out), r.out.split("\n")[0]);
    const gateLines = r.out.split(/\r?\n/).filter(l => l.startsWith("GATE "));
    check("gate_line_format", gateLines.length === 2 && gateLines.every(l => /^GATE \S+ EXIT=0 \d+ms$/.test(l)), gateLines.join(" | "));

    for (const [name, ok, detail] of await setGateFail(runRunner)) check(name, ok, detail);
    r = await runRunner(["--root", FULL, "--gate-list", path.join(LISTS, "gate_one_fails.json")]);
    check("gate_failure_shows_deciding_line", /^ {4}\| decided by other: FAIL second_check: expected 2, got 3$/m.test(r.out), r.text);

    clearMarkers();
    r = await runRunner(["--root", FULL, "--gate-list", path.join(LISTS, "gate_names_nw.json")]);
    check("gate_refuses_nwjs_in_list_exit_2_runs_nothing", r.code === 2 && /^REFUSED tools\/test_nw_binary_ref\.js NEEDS_NWJS/m.test(r.out)
        && !ran(sp("nw_binary_ref")) && !ran(sp("pass")), r.text);
    for (const [name, ok, detail] of await setScreenGate(runRunner)) check(name, ok, detail);
    for (const [name, ok, detail] of await setTransitive(runRunner)) check(name, ok, detail);
    for (const [name, ok, detail] of await setTimeoutKill(runRunner)) check(name, ok, detail);

    clearMarkers();
    for (const [name, list, re] of [
        ["gate_empty_list_exit_2", "gate_empty.json", /LIST ERROR: no suite to run/],
        ["gate_invalid_list_exit_2", "gate_invalid.json", /LIST ERROR: .*not valid JSON/],
        ["gate_missing_suite_exit_2", "gate_missing_suite.json", /LIST ERROR: tools\/test_gone\.js does not exist/]
    ]) {
        r = await runRunner(["--root", FULL, "--gate-list", path.join(LISTS, list)]);
        check(name, r.code === 2 && re.test(r.out) && !ran(sp("pass")), r.text);
    }
    r = await runRunner(["--root", FULL, "--gate-list", path.join(LISTS, "gate_all_pass.json"), "--no-such-flag"]);
    check("usage_unknown_flag_exit_2", r.code === 2 && /unknown argument/.test(r.err), r.text);
    r = await runRunner(["--census", "--root", FULL, "--concurrency", "4", "--out", outFile("c4")]);
    check("usage_concurrency_above_3_exit_2", r.code === 2 && /--concurrency must be an integer from 1 to 3/.test(r.err), r.text);
    r = await runRunner(["--census", "--root", FULL]);
    check("usage_census_without_out_exit_2", r.code === 2 && /--census needs --out/.test(r.err), r.text);
}

async function censusChecks() {
    clearMarkers();
    const out = outFile("full"), logDir = path.join(TMP, "logs_full");
    const r = await runRunner(["--census", "--root", FULL, "--timeout", "3", "--out", out, "--log-dir", logDir]);
    const doc = readJson(out) || {};
    const rows = new Map((doc.suites || []).map(x => [x.path, x]));
    check("census_complete_exit_0", r.code === 0 && doc.partial === false && /^CENSUS COMPLETE: 19\/19 measured/m.test(r.out), r.text);
    check("census_rows_are_the_tracked_suites", [...rows.keys()].sort().join(",") === Object.keys(EXPECT).sort().join(","), [...rows.keys()].join(","));
    for (const [p, cat] of Object.entries(EXPECT)) {
        const row = rows.get(p) || {};
        check(`category_${path.basename(p, ".js")}_${cat}`, row.category === cat, JSON.stringify(row));
    }
    const nwRan = STATIC_NW.filter(n => ran(sp(n)));
    const others = Object.keys(EXPECT).filter(p => !STATIC_NW.some(n => sp(n) === p));
    const notRan = others.filter(p => !ran(p));
    check("census_needs_nwjs_never_spawned", nwRan.length === 0, `markers found for ${nwRan.join(", ")}`);
    check("census_every_other_suite_ran", notRan.length === 0, `no marker for ${notRan.join(", ")}`);
    const vh = rows.get(sp("via_helper")) || {}, vs = rows.get(sp("via_spawned_script")) || {}, nb = rows.get(sp("nw_binary_ref")) || {};
    check("census_nwjs_rows_carry_screen_evidence", /^static screen: tools\/test_via_helper\.js -> tools\/fixture_harness_helper\.js:\d+ names "test_snapsho[t]"/.test(vh.firstErrorLine || "")
        && /^static screen: tools\/test_via_spawned_script\.js -> tools\/fixture_launcher\.js:\d+ names "nw\.exe"/i.test(vs.firstErrorLine || "")
        && /^static screen: tools\/test_nw_binary_ref\.js:\d+ names "n[w]js"/i.test(nb.firstErrorLine || "")
        && [vh, vs, nb].every(x => x.exitCode === null && x.ms === null && x.rule === "static_screen"), JSON.stringify([vh, vs, nb]));
    const hang = rows.get(sp("hang")) || {};
    const hangPids = pidsIn("hang.pids");
    check("census_hang_killed_with_its_child", hang.exitCode === null && /killed after 3 s/.test(hang.firstErrorLine || "") && hangPids.length === 2 && await allDead(hangPids)
        && !(doc.leftovers || []).some(l => l.suite === sp("hang")), `${JSON.stringify(hang)} pids ${hangPids}`);
    const leakPid = pidsIn("leak.pid")[0];
    check("census_leak_child_swept", !!(doc.leftovers || []).find(l => l.pid === leakPid && l.suite === sp("leak") && l.gone) && leakPid && await allDead([leakPid]), JSON.stringify(doc.leftovers));
    const g = rows.get(sp("guard_evasion")) || {};
    check("census_guard_evasion_blocked", g.rule === "runtime_guard" && !fs.existsSync(path.join(MARKERS, "guard_evasion.spawned")), JSON.stringify(g));
    const line = p => (rows.get(p) || {}).firstErrorLine || "";
    const stream = p => (rows.get(p) || {}).errorStream;
    check("census_deciding_lines", /Cannot find module '\.\/fixture_helper_that_was_deleted'/.test(line(sp("missing_module")))
        && /Cannot find module '.*[\\/]js[\\/]plugins[\\/]DEUS_RemovedPlugin\.js'/.test(line(sp("missing_plugin")))
        && /ENOENT: no such file or directory/.test(line(sp("enoent"))) && stream(sp("enoent")) === "stderr"
        && /api\.renamedFunction is not a function/.test(line(sp("type_error")))
        && /^FAIL loads the world: ENOENT/.test(line(sp("stdout_only"))) && stream(sp("stdout_only")) === "stdout"
        && /^Error: assertion failed: expected 4 rooms, got 3$/.test(line(sp("stderr_decides"))) && stream(sp("stderr_decides")) === "stderr"
        && line(sp("fail")) === "FAIL second_check: expected 2, got 3"
        && /FullyQualifiedErrorId : FileNotFoundException$/.test(line(sp("dotnet_missing_file")))
        && /must be loaded before New Game$/.test(line(sp("plugin_not_loaded"))),JSON.stringify([...rows.values()].map(x => [x.path, x.errorStream, x.firstErrorLine])));
    const bad = [...rows.values()].filter(x => !("exitCode" in x) || !("ms" in x) || (x.category === "PASS") !== (x.firstErrorLine === null));
    check("census_row_fields", rows.size === 19 && bad.length === 0, JSON.stringify(bad));
    check("census_gate_flag", [...rows.values()].every(x => x.gate === (x.path === sp("pass") || x.path === NESTED)), "");
    check("census_lines_hide_root_path", ![...rows.values()].some(x => x.firstErrorLine && x.firstErrorLine.toLowerCase().includes(FULL.toLowerCase()))
        && /<root>/.test(line(sp("enoent"))), line(sp("enoent")));
    let logs = [];
    try { logs = fs.readdirSync(logDir); } catch (_) { /* none */ }
    check("census_log_dir_one_log_per_run_suite", logs.length === 19 - STATIC_NW.length && logs.includes("tools__test_fail.js.log"), logs.join(","));

    const outDefault = outFile("defaults");
    const rd = await runRunner(["--census", "--root", FULL, "--suite", sp("pass"), "--out", outDefault]);
    const dd = readJson(outDefault) || {};
    check("census_defaults_180s_3_at_once", rd.code === 0 && dd.timeoutSec === 180 && dd.concurrency === 3 && /timeout 180 s, up to 3 at once/.test(rd.out), rd.text);

    // Budget and resume: one at a time, the hang (first in path order) outlasts the 1 s budget, so pass never starts.
    clearMarkers();
    const out2 = outFile("budget");
    const args = ["--census", "--root", FULL, "--suite", sp("pass"), "--suite", sp("hang"), "--timeout", "2", "--concurrency", "1", "--out", out2];
    let r2 = await runRunner([...args, "--budget-sec", "1"]);
    let d2 = readJson(out2) || {};
    check("census_budget_partial_exit_3", r2.code === 3 && d2.partial === true && (d2.suites || []).length === 1 && !ran(sp("pass")) && /^CENSUS PARTIAL: 1\/2/m.test(r2.out), r2.text);
    r2 = await runRunner(args);
    d2 = readJson(out2) || {};
    const inv = Object.fromEntries((d2.suites || []).map(x => [x.path, x.invocation]));
    check("census_resume_completes_exit_0", r2.code === 0 && d2.partial === false && (d2.invocations || []).length === 2
        && inv[sp("hang")] === 0 && inv[sp("pass")] === 1 && ran(sp("pass")), r2.text);
    r2 = await runRunner(args);
    check("census_refuses_to_overwrite_complete_exit_2", r2.code === 2 && /holds a complete census/.test(r2.err), r2.text);
    clearMarkers();
    r2 = await runRunner(["--census", "--root", FULL, "--suite", sp("harness_runner_ref"), "--out", outFile("nw")]);
    check("census_refuses_nwjs_suite_named_exit_2", r2.code === 2 && /^REFUSED tools\/test_harness_runner_ref\.js NEEDS_NWJS/m.test(r2.out) && !ran(sp("harness_runner_ref")), r2.text);
}

async function checkListsChecks() {
    clearMarkers();
    const cl = (gate, quarantine) => runRunner(["--check-lists", "--root", SMALL, "--gate-list", path.join(LISTS, gate), "--quarantine", path.join(LISTS, quarantine)]);
    let r = await cl("cl_gate_ok.json", "cl_quarantine_ok.json");
    check("check_lists_ok_exit_0", r.code === 0 && /^CHECK-LISTS: OK \(1 gate, 2 quarantined, 1 passingNotGated, 4 tracked suites\)$/m.test(r.out), r.text);
    r = await runRunner(["--check-lists", "--root", SMALL, "--quarantine", path.join(LISTS, "cl_quarantine_ok.json")]);
    check("check_lists_default_gate_list_exit_0", r.code === 0, r.text);
    for (const [name, ok, detail] of await setDuplicate(runRunner)) check(name, ok, detail);
    for (const [name, ok, detail] of await setUnlisted(runRunner)) check(name, ok, detail);
    for (const [name, gate, q, want] of [
        ["check_lists_duplicate_in_quarantine", "cl_gate_ok.json", "cl_quarantine_duplicate.json", "DUPLICATE"],
        ["check_lists_missing_path", "cl_gate_missing_path.json", "cl_quarantine_ok.json", "MISSING_PATH"],
        ["check_lists_suite_in_gate_and_quarantine", "cl_gate_in_both.json", "cl_quarantine_ok.json", "IN_GATE_AND_QUARANTINE"],
        ["check_lists_suite_in_gate_and_gate_tests_quarantine", "cl_gate_quarantined_in_gate_tests.json", "cl_quarantine_ok.json", "IN_GATE_AND_QUARANTINE"],
        ["check_lists_bad_schema", "cl_gate_ok.json", "cl_quarantine_bad_schema.json", "QUARANTINE_INVALID"],
        ["check_lists_needs_nwjs_in_gate", "cl_gate_nw.json", "cl_quarantine_no_nw.json", "NEEDS_NWJS_IN_GATE"],
        ["check_lists_needs_nwjs_recorded_passing", "cl_gate_ok.json", "cl_quarantine_nw_as_pass.json", "NEEDS_NWJS_UNRECORDED"],
        ["check_lists_stale_needs_nwjs", "cl_gate_ok.json", "cl_quarantine_nw_stale.json", "NEEDS_NWJS_STALE"],
        // An unreadable list lists nothing, so the suites only it listed are also UNLISTED.
        ["check_lists_invalid_gate_list", "gate_invalid.json", "cl_quarantine_ok.json", "GATE_LIST_INVALID,UNLISTED"],
        ["check_lists_missing_quarantine_file", "cl_gate_ok.json", "no_such_quarantine.json", "QUARANTINE_INVALID,UNLISTED"]
    ]) {
        r = await cl(gate, q);
        check(name, r.code === 1 && codes(r.out) === want, `codes=${codes(r.out)} ${r.text}`);
    }
    const any = [sp("pass"), NESTED, sp("fail"), sp("nw_binary_ref")].filter(ran);
    check("check_lists_runs_no_suite", any.length === 0, any.join(","));
}

function censusDoc(head, rows, extra) {
    return Object.assign({
        schemaVersion: 1, kind: "run_gate census", root: SMALL, head, node: process.version, platform: "synthetic", timeoutSec: 180, concurrency: 3,
        partial: false, suiteList: rows.map(x => x.path), invocations: [{ startedAt: "2026-09-26T15:00:00.000Z", endedAt: "2026-09-26T15:10:00.000Z", ran: rows.length }],
        suites: rows, leftovers: []
    }, extra || {});
}

function row(p, category, gate) {
    const exitCode = category === "PASS" ? 0 : category === "NEEDS_NWJS" || category === "KILLED_TIMEOUT" ? null : 1;
    const line = category === "PASS" ? null : category === "NEEDS_NWJS" ? `static screen: ${p}:8 names the harness (synthetic)` : "FAIL second_check: expected 2, got 3";
    return { path: p, gate: !!gate, category, firstErrorLine: line, errorStream: "stdout", rule: "other", exitCode, signal: null, ms: 50, invocation: 0 };
}

async function mergeChecks() {
    const base = "2222222222222222222222222222222222222222";
    const runs = [];
    for (let i = 0; i < 3; i++) {
        const f = path.join(TMP, `synthetic_run${i}.json`);
        const nestedCat = "PASS";
        fs.writeFileSync(f, JSON.stringify(censusDoc(base, [row(sp("pass"), "PASS", true), row(NESTED, nestedCat), row(sp("fail"), "FAIL_OTHER"), row(sp("nw_binary_ref"), "NEEDS_NWJS")])));
        runs.push(f);
    }
    const q = path.join(TMP, "merged_quarantine.json");
    let r = await runRunner(["--merge-census", ...runs, "--write-quarantine", q, "--base", base]);
    const doc = readJson(q) || {};
    check("merge_three_agreeing_runs", r.code === 0 && (doc.suites || []).map(s => s.path).join(",") === `${sp("fail")},${sp("nw_binary_ref")}`
        && (doc.passingNotGated || []).map(s => s.path).join(",") === NESTED && doc.measuredAt === "2026-09-26" && doc.baseCommit === base
        && (doc.suites || []).every(s => s.owner === null) && /^MERGE suites=4 agree=4 disagree=0 gate=1 quarantine=2 passingNotGated=1$/m.test(r.out), r.text);
    r = await runRunner(["--check-lists", "--root", SMALL, "--gate-list", path.join(LISTS, "cl_gate_ok.json"), "--quarantine", q]);
    check("merge_output_passes_check_lists", r.code === 0, r.text);

    const flakyRuns = runs.map((f, i) => {
        const g = path.join(TMP, `synthetic_flaky${i}.json`);
        fs.writeFileSync(g, JSON.stringify(censusDoc(base, [row(sp("pass"), "PASS", true), row(NESTED, i === 2 ? "KILLED_TIMEOUT" : "PASS"), row(sp("fail"), "FAIL_OTHER"), row(sp("nw_binary_ref"), "NEEDS_NWJS")])));
        return g;
    });
    const q2 = path.join(TMP, "merged_flaky.json");
    r = await runRunner(["--merge-census", ...flakyRuns, "--write-quarantine", q2, "--base", base]);
    const d2 = readJson(q2) || {};
    const nested = (d2.suites || []).find(s => s.path === NESTED) || {};
    check("merge_flaky_suite_is_fail_other", r.code === 0 && nested.category === "FAIL_OTHER" && nested.flaky === true
        && (nested.runCategories || []).join("/") === "PASS/PASS/KILLED_TIMEOUT" && !(d2.passingNotGated || []).some(s => s.path === NESTED)
        && /^FLAKY tools\/sub\/test_pass_nested\.js PASS \/ PASS \/ KILLED_TIMEOUT$/m.test(r.out), r.text);

    const partial = path.join(TMP, "synthetic_partial.json");
    fs.writeFileSync(partial, JSON.stringify(censusDoc(base, [row(sp("pass"), "PASS", true)], { partial: true })));
    r = await runRunner(["--merge-census", runs[0], runs[1], partial, "--write-quarantine", path.join(TMP, "never.json"), "--base", base]);
    check("merge_refuses_partial_census_exit_2", r.code === 2 && /partial census/.test(r.err) && !fs.existsSync(path.join(TMP, "never.json")), r.text);
    r = await runRunner(["--merge-census", runs[0], runs[1], "--write-quarantine", path.join(TMP, "never.json"), "--base", base]);
    check("merge_refuses_missing_run_exit_2", r.code === 2 && /measured 2 times, expected 3/.test(r.err) && !fs.existsSync(path.join(TMP, "never.json")), r.text);
}

// ---------------------------------------------------------------- mutants

const MUTANTS = [
    { name: "gate_ignores_failing_exit", find: 'const ok = r.code === 0 && !r.timedOut && c.category === "PASS";', replace: "const ok = true;", set: setGateFail },
    { name: "timeout_removed", find: "timer = setTimeout(onTimeout, ctx.timeoutMs);", replace: "timer = null;", set: setTimeoutKill },
    { name: "needs_nwjs_screen_removed", find: "function screen(rel) {", replace: "function screen(rel) { return { needsNwjs: false, chain: [rel], reached: 0 };", set: setScreenGate },
    { name: "missing_module_rule_swapped", find: '{ id: "module_not_found", category: "FAIL_MISSING_DEPENDENCY"', replace: '{ id: "module_not_found", category: "FAIL_API_DRIFT"', set: setMissingModule },
    { name: "check_lists_duplicate_check_removed", find: 'for (const [label, list] of lists) for (const d of duplicates(list)) add("DUPLICATE"', replace: 'for (const [label, list] of lists) for (const d of []) add("DUPLICATE"', set: setDuplicate },
    { name: "tree_kill_removed", find: "timedOut = true; killTree(child.pid);", replace: "timedOut = true; child.kill();", set: setTreeKill },
    { name: "transitive_screen_removed", find: "for (const r of refs(i, isSuite)) {", replace: "for (const r of []) {", set: setTransitive },
    { name: "gate_nwjs_refusal_removed", find: "    if (refused.length) {\n        for (const [s, sc] of refused)", replace: "    if (false) {\n        for (const [s, sc] of refused)", set: setScreenGate },
    { name: "runtime_guard_removed", find: "env.NODE_OPTIONS = `--require", replace: "env.NODE_OPTIONS_OFF = `--require", set: setGuard },
    { name: "leftover_sweep_removed", find: "const procs = listProcesses();\n    if (!procs) return { error", replace: "const procs = [];\n    if (!procs) return { error", set: setLeak },
    { name: "check_lists_unlisted_check_removed", find: "for (const s of suites) if (!G.has(keyOf(s))", replace: "for (const s of []) if (!G.has(keyOf(s))", set: setUnlisted }
];

async function mutantChecks() {
    const fromSource = src => (args, opts) => runRunner(args, Object.assign({}, opts, { source: src }));
    const baselines = new Map();
    for (const m of MUTANTS) {
        const count = SOURCE.split(m.find).length - 1;
        if (count !== 1) { check(`mutant_${m.name}_killed`, false, `the mutant's text occurs ${count} times in run_gate.js (must be exactly once)`); continue; }
        if (!baselines.has(m.set)) {
            const res = await m.set(fromSource(SOURCE));
            cleanup();
            baselines.set(m.set, res);
            const bad = res.filter(([, ok]) => !ok);
            check(`stdin_baseline_${m.set.name}`, bad.length === 0, bad.map(([n, , d]) => `${n}: ${d}`).join(" | "));
        }
        const baseOk = baselines.get(m.set).every(([, ok]) => ok);
        const mutated = SOURCE.replace(m.find, () => m.replace);
        const res = await m.set(fromSource(mutated));
        cleanup();
        const caught = res.filter(([, ok]) => !ok).map(([n]) => n);
        check(`mutant_${m.name}_killed`, baseOk && caught.length > 0, baseOk ? "no check failed on the mutant" : "the unmutated baseline failed");
        if (baseOk && caught.length) console.log(`    mutant ${m.name} caught by: ${caught.join(", ")}`);
    }
    check("run_gate_on_disk_unchanged", fs.readFileSync(RUNNER, "utf8").replace(/\r\n/g, "\n") === SOURCE, "run_gate.js changed during the test");
}

// ---------------------------------------------------------------- leftovers of this test

function processesNaming(dir) {
    if (!IS_WIN) {
        const r = spawnSync("ps", ["-eo", "pid=,args="], { encoding: "utf8" });
        return (r.stdout || "").split("\n").filter(l => l.includes(dir) && !l.includes(String(process.pid)));
    }
    const ps = "Get-CimInstance Win32_Process | ForEach-Object { '{0}|{1}' -f $_.ProcessId, $_.CommandLine }";
    const r = spawnSync(path.join(SYSROOT, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"), ["-NoProfile", "-NonInteractive", "-Command", ps], { encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
    const needle = dir.replace(/\\/g, "/").toLowerCase();
    return (r.stdout || "").split(/\r?\n/).filter(l => l.replace(/\\/g, "/").toLowerCase().includes(needle) && !l.startsWith(`${process.pid}|`));
}

async function main() {
    console.log(`test_run_gate: fixtures in ${TMP}`);
    FULL = makeRepo("full", FULL_LAYOUT);
    SMALL = makeRepo("small", SMALL_LAYOUT);
    try {
        await gateChecks();
        await censusChecks();
        await checkListsChecks();
        await mergeChecks();
        await mutantChecks();
    } finally {
        cleanup();
    }
    const left = processesNaming(TMP);
    check("no_leftover_processes", left.length === 0, left.join(" | "));
    for (const l of left) killTree(Number(l.split("|")[0]));
    try { fs.rmSync(TMP, { recursive: true, force: true, maxRetries: 5 }); } catch (e) { console.log(`note: could not remove ${TMP}: ${e.message}`); }
    console.log(`RESULT: ${passed} passed, ${failed} failed`);
    return failed ? 1 : 0;
}

main().then(code => { process.exitCode = code; }, e => {
    console.log(`FAIL test_run_gate_crashed -- ${e && e.stack || e}`);
    cleanup();
    console.log(`RESULT: ${passed} passed, ${failed + 1} failed`);
    process.exitCode = 1;
});
