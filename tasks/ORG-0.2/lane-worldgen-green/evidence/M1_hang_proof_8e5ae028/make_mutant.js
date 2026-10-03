// Builds a disposable mutant copy of a validated controlled snapshot to prove the watchdogs can fire.
// Usage: node make_mutant.js <source snapshot game dir> <target game dir> hang|stall
//   hang : the "ownership" suite first awaits a condition that never holds (10 min wait) -> the per-suite watchdog
//          must fail ownership.suite_completed at 180 s, reject the wait, take ownership.on_timeout.png and finish.
//   stall: the "ownership" suite first runs a synchronous endless loop -> no timer can fire, results.txt stops
//          growing -> tools/run_tests.js must kill the nw.exe tree after 240 s without progress (exit 2, no RESULT).
// Only the copy is changed; the source snapshot is never touched.
"use strict";
const fs = require("fs");
const path = require("path");
const [src, dst, kind] = process.argv.slice(2);
if (!src || !dst || !["hang", "stall"].includes(kind)) { console.error("usage: node make_mutant.js <src game dir> <dst game dir> hang|stall"); process.exit(1); }
if (fs.existsSync(dst)) { console.error(`refusing: ${dst} exists`); process.exit(1); }
fs.cpSync(src, dst, { recursive: true, filter: p => !/[\\/]test_output([\\/]|$)/.test(p) && !/game_runtime\.log$/.test(p) });
const file = path.join(dst, "js", "plugins", "DEUS_Ownership.js");
let text = fs.readFileSync(file, "utf8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";
const anchor = `        UF.Test.suite("ownership", async t => {` + eol;
if (text.split(anchor).length !== 2) { console.error("anchor not found exactly once"); process.exit(1); }
const inject = kind === "hang"
    ? `            await t.waitUntil(() => false, 600000, "a condition that never holds (WATCHDOG MUTANT hang)");` + eol
    : `            for (;;) { /* WATCHDOG MUTANT stall: blocks the frame loop and every timer */ }` + eol;
text = text.replace(anchor, anchor + inject);
fs.writeFileSync(file, text);
console.log(`mutant ${kind} written: ${file}`);
console.log(fs.readFileSync(file, "utf8").split(eol).slice(640, 644).join("\n"));
