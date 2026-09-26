// run_gate fixture (OPS.30.01): reports a missing file on stdout only, then exits 1.
// Expected: FAIL_MISSING_REFERENCE decided from stdout (stderr is empty).
"use strict";
const fs = require("fs");
const path = require("path");
const MARKERS = process.env.RUN_GATE_FIXTURE_MARKERS;
if (MARKERS) fs.writeFileSync(path.join(MARKERS, `${path.basename(__filename, ".js")}.ran`), String(process.pid));
console.log("PASS loads the catalog");
console.log("FAIL loads the world: ENOENT: no such file or directory, open 'data/world.json'");
process.exit(1);
