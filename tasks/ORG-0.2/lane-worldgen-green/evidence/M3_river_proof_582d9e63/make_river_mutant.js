// Builds a disposable mutant copy of a validated controlled snapshot to prove the two course-based river checks can fail.
// Usage: node make_river_mutant.js <source snapshot game dir> <target game dir>
//   In the copy's DEUS_WorldGen.js worldgen suite only:
//   - the start clearance uses keep = 60 instead of catalog keepAwayFromStart (14): the nearest carved river tile at this
//     seed is about 28 cells away, so river_not_through_start must FAIL ("pass 28, ... cells ... keep away 60");
//   - the built-map wetness lookup reads every 97th cell index as dry: some carved river cells read dry and the flood is
//     cut there, so river_continuous must FAIL with "dry on the built map" and/or "not joined by water".
// The source snapshot is never touched.
"use strict";
const fs = require("fs");
const path = require("path");
const [src, dst] = process.argv.slice(2);
if (!src || !dst) { console.error("usage: node make_river_mutant.js <src game dir> <dst game dir>"); process.exit(1); }
if (fs.existsSync(dst)) { console.error(`refusing: ${dst} exists`); process.exit(1); }
fs.cpSync(src, dst, { recursive: true, filter: p => !/[\\/]test_output([\\/]|$)/.test(p) && !/game_runtime\.log$/.test(p) });
const file = path.join(dst, "js", "plugins", "DEUS_WorldGen.js");
let text = fs.readFileSync(file, "utf8");
const once = (a, b) => { if (text.split(a).length !== 2) { console.error(`anchor not found exactly once: ${a}`); process.exit(1); } text = text.replace(a, () => b); };
once("            const keep = cat.rivers.keepAwayFromStart;", "            const keep = 60; // RIVER MUTANT: clearance radius widened so the real rivers fall inside it");
once("                const wet = i => isWaterTile(here.data[i]);", "                const wet = i => isWaterTile(here.data[i]) && i % 97 !== 0; // RIVER MUTANT: every 97th cell reads dry");
fs.writeFileSync(file, text);
console.log(`river mutant written: ${file}`);
