// run_gate fixture (OPS.30.01): passes but leaves a detached child running. The runner's leftover sweep must kill it.
"use strict";
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const MARKERS = process.env.RUN_GATE_FIXTURE_MARKERS;
if (MARKERS) fs.writeFileSync(path.join(MARKERS, `${path.basename(__filename, ".js")}.ran`), String(process.pid));
const child = spawn(process.execPath, [path.join(__dirname, "fixture_sleeper.js")], { stdio: "ignore", detached: true, windowsHide: true });
child.unref();
if (MARKERS) fs.writeFileSync(path.join(MARKERS, "leak.pid"), String(child.pid));
console.log("PASS leaves a child behind on purpose");
