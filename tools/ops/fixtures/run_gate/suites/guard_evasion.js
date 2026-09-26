// run_gate fixture (OPS.30.01): builds the NW.js binary name at run time, which a text screen cannot see, and tries to
// start a process whose arguments name it. That process is only node writing a marker, so nothing real starts even
// without the guard. Expected: NEEDS_NWJS decided by the runtime guard, and no ".spawned" marker.
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const MARKERS = process.env.RUN_GATE_FIXTURE_MARKERS;
if (MARKERS) fs.writeFileSync(path.join(MARKERS, `${path.basename(__filename, ".js")}.ran`), String(process.pid));
const name = ["n", "w", ".", "e", "x", "e"].join("");
const marker = path.join(MARKERS || os.tmpdir(), "guard_evasion.spawned");
try {
    spawnSync(process.execPath, ["-e", "require('fs').writeFileSync(process.argv[1], 'spawned')", marker, `--harness=${name}`], { stdio: "ignore" });
} catch (e) {
    console.error(`blocked: ${e.message}`);
    process.exit(1);
}
console.log("started a process naming the harness (the guard should have stopped it)");
