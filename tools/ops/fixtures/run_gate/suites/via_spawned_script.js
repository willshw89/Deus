// run_gate fixture (OPS.30.01): names a tools script it would start with node; that script names the NW.js binary.
// Expected: NEEDS_NWJS with the chain suite -> script, never spawned. It starts nothing itself.
"use strict";
const fs = require("fs");
const path = require("path");
const MARKERS = process.env.RUN_GATE_FIXTURE_MARKERS;
if (MARKERS) fs.writeFileSync(path.join(MARKERS, `${path.basename(__filename, ".js")}.ran`), String(process.pid));
const script = path.join(__dirname, "fixture_launcher.js");
console.log(`would run node ${script} (this fixture never does)`);
