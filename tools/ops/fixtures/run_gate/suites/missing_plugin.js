// run_gate fixture (OPS.30.01): loads a game plugin that does not exist. Expected: FAIL_MISSING_REFERENCE.
"use strict";
const fs = require("fs");
const path = require("path");
const MARKERS = process.env.RUN_GATE_FIXTURE_MARKERS;
if (MARKERS) fs.writeFileSync(path.join(MARKERS, `${path.basename(__filename, ".js")}.ran`), String(process.pid));
require(path.join(__dirname, "..", "game", "js", "plugins", "DEUS_RemovedPlugin.js"));
