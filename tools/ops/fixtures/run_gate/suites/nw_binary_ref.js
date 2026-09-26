// run_gate fixture (OPS.30.01): names the NW.js binary the way the live suites do. It never starts it: if it is run
// at all it only writes its marker. Expected: NEEDS_NWJS from the static screen, never spawned.
"use strict";
const fs = require("fs");
const path = require("path");
const MARKERS = process.env.RUN_GATE_FIXTURE_MARKERS;
if (MARKERS) fs.writeFileSync(path.join(MARKERS, `${path.basename(__filename, ".js")}.ran`), String(process.pid));
const NW = "C:\\Program Files (x86)\\Steam\\steamapps\\common\\RPG Maker MZ\\nwjs-win\\nw.exe";
console.log(`would start ${NW} (this fixture never does)`);
