// run_gate fixture (OPS.30.01): a suite that passes. test_run_gate.js copies it to tools/test_<name>.js in a
// synthetic repo; RUN_GATE_FIXTURE_MARKERS names the folder where every fixture records that it ran.
"use strict";
const fs = require("fs");
const path = require("path");
const MARKERS = process.env.RUN_GATE_FIXTURE_MARKERS;
if (MARKERS) fs.writeFileSync(path.join(MARKERS, `${path.basename(__filename, ".js")}.ran`), String(process.pid));
console.log("PASS fixture_check");
console.log("RESULT: 1 passed, 0 failed");
