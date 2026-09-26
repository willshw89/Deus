// run_gate fixture (OPS.30.01): hangs, with a child process. Expected: KILLED_TIMEOUT, and the child dies with it.
// The child is detached: on Windows, libuv puts a node process's ordinary children in a kill-on-close job, so they
// would die with this process anyway; a detached child survives unless the runner kills the whole tree.
// Both processes end by themselves after 10 minutes, so nothing runs forever even if a kill fails.
"use strict";
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const MARKERS = process.env.RUN_GATE_FIXTURE_MARKERS;
if (MARKERS) fs.writeFileSync(path.join(MARKERS, `${path.basename(__filename, ".js")}.ran`), String(process.pid));
const sleeper = spawn(process.execPath, [path.join(__dirname, "fixture_sleeper.js")], { stdio: "ignore", detached: true, windowsHide: true });
if (MARKERS) fs.writeFileSync(path.join(MARKERS, "hang.pids"), `${process.pid} ${sleeper.pid}`);
console.log("hanging on purpose");
setTimeout(() => process.exit(0), 10 * 60 * 1000);
