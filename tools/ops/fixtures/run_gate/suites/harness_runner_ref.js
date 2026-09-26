// run_gate fixture (OPS.30.01): names tools/run_tests.js. It never runs it. Expected: NEEDS_NWJS, never spawned.
"use strict";
const fs = require("fs");
const path = require("path");
const MARKERS = process.env.RUN_GATE_FIXTURE_MARKERS;
if (MARKERS) fs.writeFileSync(path.join(MARKERS, `${path.basename(__filename, ".js")}.ran`), String(process.pid));
const HARNESS = path.join(__dirname, "run_tests.js");
console.log(`would run ${HARNESS} (this fixture never does)`);
