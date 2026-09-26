// run_gate fixture (OPS.30.01): stdout mentions ENOENT, but the uncaught error on stderr is an assertion.
// Expected: FAIL_OTHER (stderr decides whenever it has a candidate line).
"use strict";
const fs = require("fs");
const path = require("path");
const MARKERS = process.env.RUN_GATE_FIXTURE_MARKERS;
if (MARKERS) fs.writeFileSync(path.join(MARKERS, `${path.basename(__filename, ".js")}.ran`), String(process.pid));
console.log("note: data/optional.json not found (ENOENT), using defaults");
throw new Error("assertion failed: expected 4 rooms, got 3");
