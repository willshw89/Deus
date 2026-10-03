// Runs the UF_Test harness and turns its results file into an exit code.
// Usage: node tools/run_tests.js [suite] [--game <game folder>]
//   suite: a suite name (e.g. smoke, selftest, perf); omit to run the default suites
// Exit code: 0 all passed, 1 a check failed, 2 harness/launch problem.
//
// The exit code comes from the RESULT line in test_output/results.txt, NOT from nw.exe:
// NW.js does not pass the harness's exit code back to the shell (measured 2026-09-18).
//
// Kill timers (ORG-0.2, 2026-10-03). The harness bounds every suite with its own 180 s watchdog and, once the map is
// up, writes "HARNESS suite budget <b> s each; <n> suite(s) selected: ..." to results.txt. This runner sizes its hard
// cap from that line: MAP_START_MS + n x b + GRACE_MS from launch. Before that line exists, and at all times as a
// floor, the only kill is the no-progress one: results.txt unchanged for STALL_MS, which is longer than the harness's
// 180 s map-start wait so a slow New Game is not mistaken for a hang. A kill names its reason on stderr, ends the whole
// nw.exe tree, and leaves the partial results file for the RESULT check below (no RESULT means exit 2).
"use strict";
const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const NW = "C:\\Program Files (x86)\\Steam\\steamapps\\common\\RPG Maker MZ\\nwjs-win\\nw.exe";
const STALL_MS = 240000;
const MAP_START_MS = 180000;
const GRACE_MS = 60000;
const POLL_MS = 5000;

const args = process.argv.slice(2);
const gameIdx = args.indexOf("--game");
const gameDir = path.resolve(gameIdx >= 0 ? args[gameIdx + 1] : path.join(__dirname, "..", "game"));
const suite = args.find((a, i) => !a.startsWith("--") && (gameIdx < 0 || i !== gameIdx + 1));

const pluginsJs = fs.readFileSync(path.join(gameDir, "js", "plugins.js"), "utf8");
if (!/"name"\s*:\s*"(?:DEUS_Test|UF_Test)"\s*,\s*"status"\s*:\s*true/.test(pluginsJs)) {
    console.error(`UF_Test is not registered (or is disabled) in ${path.join(gameDir, "js", "plugins.js")}.`);
    console.error("Add it in the RMMZ Plugin Manager, or for a disposable copy run: node tools/add_test_plugin.js <plugins.js>");
    process.exit(2);
}

// Remove old results first, so a run where the harness never loads can't be mistaken for a pass.
const resultsFile = path.join(gameDir, "test_output", "results.txt");
fs.rmSync(resultsFile, { force: true });

const flag = suite ? `--deus-test=${suite}` : "--deus-test";
// A fresh browser profile per run: Chromium allows one process per profile, so a shared profile makes
// back-to-back runs hand off to the previous, still-closing process and exit early.
const profile = path.join(require("os").tmpdir(), `uf_test_profile_${process.pid}_${Date.now()}`);
console.log(`Running ${flag} on ${gameDir}`);
// Chromium stops drawing frames for covered or background windows, which stalls checks and ruins timing.
const noThrottle = [
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
    "--disable-features=CalculateNativeWinOcclusion"
];
const child = spawn(NW, [gameDir, `--user-data-dir=${profile}`, ...noThrottle, flag], { stdio: ["ignore", "pipe", "pipe"] });
child.stdout.on("data", () => {});
child.stderr.on("data", () => {});

const started = Date.now();
let killedFor = null, lastSize = -1, lastChange = started, capMs = null;
const kill = why => {
    killedFor = why;
    console.error(`HARNESS: ${why}, killing nw.exe`);
    if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    child.kill();
};
const poll = setInterval(() => {
    let size = -1;
    try { size = fs.statSync(resultsFile).size; } catch (_) { size = -1; }
    const now = Date.now();
    if (size !== lastSize) { lastSize = size; lastChange = now; }
    if (capMs === null && size > 0) {
        let text = "";
        try { text = fs.readFileSync(resultsFile, "utf8"); } catch (_) { text = ""; }
        const b = text.match(/^HARNESS suite budget (\d+) s each; (\d+) suite\(s\) selected/m);
        if (b) {
            capMs = MAP_START_MS + Number(b[2]) * Number(b[1]) * 1000 + GRACE_MS;
            console.log(`HARNESS: ${b[2]} suite(s) x ${b[1]} s budget; hard cap ${Math.round(capMs / 1000)} s from launch`);
        }
    }
    if (now - lastChange >= STALL_MS) kill(`no progress in results.txt for ${STALL_MS / 1000} s`);
    else if (capMs !== null && now - started >= capMs) kill(`run exceeded its hard cap of ${Math.round(capMs / 1000)} s`);
}, POLL_MS);

child.on("exit", (code, signal) => {
    clearInterval(poll);
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) { /* still locked; it's in the temp folder */ }
    if (!fs.existsSync(resultsFile) || !/^RESULT:/m.test(fs.readFileSync(resultsFile, "utf8"))) {
        console.error(`HARNESS: nw.exe exited after ${seconds} s with code ${code}${signal ? ", signal " + signal : ""} before the harness finished${killedFor ? ` (killed by this runner: ${killedFor})` : ""}.`);
        console.error("         If another agent or script killed nw.exe processes at that moment, that's the cause (ENGINE_RULES §6).");
    }
    if (!fs.existsSync(resultsFile)) {
        console.error("HARNESS: no results file. The game crashed before the harness loaded, or UF_Test didn't run.");
        process.exit(2);
    }
    const text = fs.readFileSync(resultsFile, "utf8");
    process.stdout.write(text);
    const m = text.match(/^RESULT: (\d+) passed, (\d+) failed \(exit (\d)\)$/m);
    if (!m) {
        console.error("HARNESS: results file has no RESULT line (the run didn't finish).");
        process.exit(2);
    }
    process.exit(Number(m[3]));
});
