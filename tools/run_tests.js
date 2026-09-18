// Runs the UF_Test harness and turns its results file into an exit code.
// Usage: node tools/run_tests.js [suite] [--game <game folder>]
//   suite: a suite name (e.g. smoke, selftest, perf); omit to run the default suites
// Exit code: 0 all passed, 1 a check failed, 2 harness/launch problem.
//
// The exit code comes from the RESULT line in test_output/results.txt, NOT from nw.exe:
// NW.js does not pass the harness's exit code back to the shell (measured 2026-09-18).
"use strict";
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const NW = "C:\\Program Files (x86)\\Steam\\steamapps\\common\\RPG Maker MZ\\nwjs-win\\nw.exe";
const TIMEOUT_MS = 240000;

const args = process.argv.slice(2);
const gameIdx = args.indexOf("--game");
const gameDir = path.resolve(gameIdx >= 0 ? args[gameIdx + 1] : path.join(__dirname, "..", "game"));
const suite = args.find((a, i) => !a.startsWith("--") && (gameIdx < 0 || i !== gameIdx + 1));

const pluginsJs = fs.readFileSync(path.join(gameDir, "js", "plugins.js"), "utf8");
if (!/"name"\s*:\s*"UF_Test"\s*,\s*"status"\s*:\s*true/.test(pluginsJs)) {
    console.error(`UF_Test is not registered (or is disabled) in ${path.join(gameDir, "js", "plugins.js")}.`);
    console.error("Add it in the RMMZ Plugin Manager, or for a disposable copy run: node tools/add_test_plugin.js <plugins.js>");
    process.exit(2);
}

// Remove old results first, so a run where the harness never loads can't be mistaken for a pass.
const resultsFile = path.join(gameDir, "test_output", "results.txt");
fs.rmSync(resultsFile, { force: true });

const flag = suite ? `--uf-test=${suite}` : "--uf-test";
const profile = path.join(require("os").tmpdir(), "uf_test_profile");
console.log(`Running ${flag} on ${gameDir}`);
const child = spawn(NW, [gameDir, `--user-data-dir=${profile}`, flag], { stdio: "ignore" });

const timer = setTimeout(() => {
    console.error(`HARNESS: no exit after ${TIMEOUT_MS / 1000} s, killing nw.exe`);
    child.kill();
}, TIMEOUT_MS);

child.on("exit", () => {
    clearTimeout(timer);
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
