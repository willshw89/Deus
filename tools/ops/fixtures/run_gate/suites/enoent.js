// run_gate fixture (OPS.30.01): reads a data file that does not exist. Expected: FAIL_MISSING_REFERENCE.
"use strict";
const fs = require("fs");
const path = require("path");
const MARKERS = process.env.RUN_GATE_FIXTURE_MARKERS;
if (MARKERS) fs.writeFileSync(path.join(MARKERS, `${path.basename(__filename, ".js")}.ran`), String(process.pid));
const world = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "fixture_world.json"), "utf8"));
console.log(world.name);
