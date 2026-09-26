// run_gate fixture (OPS.30.01): calls a function its module no longer exports. Expected: FAIL_API_DRIFT.
"use strict";
const fs = require("fs");
const path = require("path");
const MARKERS = process.env.RUN_GATE_FIXTURE_MARKERS;
if (MARKERS) fs.writeFileSync(path.join(MARKERS, `${path.basename(__filename, ".js")}.ran`), String(process.pid));
const api = require("./fixture_api");
console.log(api.renamedFunction(1, 2));
