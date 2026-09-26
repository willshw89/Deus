// run_gate fixture (OPS.30.01): fails the way a suite that loads an image through PowerShell does when the file is
// missing: the first stderr line matches no rule, a later one names FileNotFoundException. Expected:
// FAIL_MISSING_REFERENCE (the first stderr line that matches a rule decides).
"use strict";
const fs = require("fs");
const path = require("path");
const MARKERS = process.env.RUN_GATE_FIXTURE_MARKERS;
if (MARKERS) fs.writeFileSync(path.join(MARKERS, `${path.basename(__filename, ".js")}.ran`), String(process.pid));
console.error('Exception calling "FromFile" with "1" argument(s): "C:/fixture/missing_source.jpg"');
console.error("    + CategoryInfo          : NotSpecified: (:) [], MethodInvocationException");
console.error("    + FullyQualifiedErrorId : FileNotFoundException");
process.exit(1);
