// run_gate fixture (OPS.30.01): a suite with a failing check, reported on stdout only. Expected: FAIL_OTHER.
"use strict";
const fs = require("fs");
const path = require("path");
const MARKERS = process.env.RUN_GATE_FIXTURE_MARKERS;
if (MARKERS) fs.writeFileSync(path.join(MARKERS, `${path.basename(__filename, ".js")}.ran`), String(process.pid));
console.log("PASS first_check");
console.log("FAIL second_check: expected 2, got 3");
console.log("RESULT: 1 passed, 1 failed");
process.exit(1);
