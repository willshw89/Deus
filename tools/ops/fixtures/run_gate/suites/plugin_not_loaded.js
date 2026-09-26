// run_gate fixture (OPS.30.01): a plugin refuses to run because plugins it needs were not loaded.
// Expected: FAIL_MISSING_REFERENCE.
"use strict";
const fs = require("fs");
const path = require("path");
const MARKERS = process.env.RUN_GATE_FIXTURE_MARKERS;
if (MARKERS) fs.writeFileSync(path.join(MARKERS, `${path.basename(__filename, ".js")}.ran`), String(process.pid));
throw new Error("History: Demographics and Callings must be loaded before New Game");
