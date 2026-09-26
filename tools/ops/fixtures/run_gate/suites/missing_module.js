// run_gate fixture (OPS.30.01): requires a local module that does not exist. Expected: FAIL_MISSING_DEPENDENCY.
"use strict";
const fs = require("fs");
const path = require("path");
const MARKERS = process.env.RUN_GATE_FIXTURE_MARKERS;
if (MARKERS) fs.writeFileSync(path.join(MARKERS, `${path.basename(__filename, ".js")}.ran`), String(process.pid));
const helper = require("./fixture_helper_that_was_deleted");
helper.run();
