// run_gate fixture (OPS.30.01): loads a game plugin whose comments name the harness, as the real DEUS plugins do.
// A plugin that does not use child_process cannot start a process, so this suite is not NEEDS_NWJS. Expected: PASS.
"use strict";
const fs = require("fs");
const path = require("path");
const MARKERS = process.env.RUN_GATE_FIXTURE_MARKERS;
if (MARKERS) fs.writeFileSync(path.join(MARKERS, `${path.basename(__filename, ".js")}.ran`), String(process.pid));
const notes = require(path.join(__dirname, "..", "game", "js", "plugins", "DEUS_FixtureNotes.js"));
console.log(notes.ok ? "PASS plugin loaded" : "FAIL plugin did not load");
process.exit(notes.ok ? 0 : 1);
