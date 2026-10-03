// Builds a disposable mutant copy of a validated controlled snapshot to prove the zero-carved-cell path of
// river_continuous: the suite's carved-cell collection skips river id 0 (column 235) so that counted river has no raster
// cell, while river id 1 (column 28) keeps all of its cells. riverModels (the count) is untouched, so rivers_count still
// sees 2 rivers; river_continuous must FAIL with "river at column 235 (id 0): no carved cell anywhere in the world" as its
// first break. The source snapshot is never touched. Usage: node make_river_mutant2.js <src game dir> <dst game dir>
"use strict";
const fs = require("fs");
const path = require("path");
const [src, dst] = process.argv.slice(2);
if (!src || !dst) { console.error("usage: node make_river_mutant2.js <src game dir> <dst game dir>"); process.exit(1); }
if (fs.existsSync(dst)) { console.error(`refusing: ${dst} exists`); process.exit(1); }
fs.cpSync(src, dst, { recursive: true, filter: p => !/[\\/]test_output([\\/]|$)/.test(p) && !/game_runtime\.log$/.test(p) });
const file = path.join(dst, "js", "plugins", "DEUS_WorldGen.js");
let text = fs.readFileSync(file, "utf8");
const anchor = "                    for (let i = 0; i < size * size; i++) if (chunk.river[i] === r.id + 1) mine.push(i);";
if (text.split(anchor).length !== 2) { console.error("anchor not found exactly once"); process.exit(1); }
text = text.replace(anchor, () => "                    for (let i = 0; i < size * size; i++) if (chunk.river[i] === r.id + 1 && r.id !== 0) mine.push(i); // RIVER MUTANT 2: river id 0 keeps no raster cell");
fs.writeFileSync(file, text);
console.log(`river mutant 2 written: ${file}`);
