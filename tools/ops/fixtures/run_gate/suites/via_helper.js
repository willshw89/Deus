// run_gate fixture (OPS.30.01): reaches the harness only through a helper it requires (the helper names the snapshot
// harness). Expected: NEEDS_NWJS with the chain suite -> helper, never spawned.
"use strict";
const fs = require("fs");
const path = require("path");
const MARKERS = process.env.RUN_GATE_FIXTURE_MARKERS;
if (MARKERS) fs.writeFileSync(path.join(MARKERS, `${path.basename(__filename, ".js")}.ran`), String(process.pid));
const helper = require("./fixture_harness_helper");
console.log(helper.describe());
