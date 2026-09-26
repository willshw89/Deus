// check_escalation_citations.js - WG.00.09b Lane K (Fix 1, M2): every [ID] that escalation.md cites exists in the output of
// escalation_figures.js, and every number next to citations appears in one of the cited lines. Numbers that are not figures
// (rank numbers, code line numbers, lane and directive names) are listed separately for a human to confirm.
// Usage: node tasks/WG.00.09b/lane-k/perf/check_escalation_citations.js   (runs escalation_figures.js itself)
// Exit: 0 every cited ID exists and every other number was found; 1 otherwise.
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const md = fs.readFileSync(path.join(__dirname, "..", "escalation.md"), "utf8");
const out = execFileSync(process.execPath, [path.join(__dirname, "escalation_figures.js")], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const lines = new Map();
const ol = out.split(/\r?\n/);
for (let i = 0; i < ol.length; i++) {
    const m = ol[i].match(/^(\S+)\s+(.*)$/);
    if (m && /\./.test(m[1]) && !/^===/.test(m[1])) lines.set(m[1], `${m[2]} ${ol[i + 1] || ""}`);
}
// Join a bullet or paragraph with its continuation lines (a citation may sit on the next line of the same item).
const units = [];
for (const l of md.split(/\r?\n/)) {
    if (/^\s*$/.test(l)) { units.push(""); continue; }
    if (/^\s*([-|#]|\d+\.\s)/.test(l) || !units.length) units.push(l.trim());
    else units[units.length - 1] += " " + l.trim();
}
const NOT_FIGURES = /^(K[1-4]|0017|0019|WBS|DEC)/;
let missing = 0, notFound = 0;
const other = [];
for (const u of units) {
    const ids = [...u.matchAll(/\[([A-Za-z0-9_.+-]+)\]/g)].map(m => m[1]).filter(x => /^(fix1|fix1a|fix1b|postK4|preK4|base|append)\./.test(x));
    if (!ids.length) continue;
    for (const id of ids) if (!lines.has(id)) { missing++; console.log(`MISSING ID ${id}`); }
    const text = ids.map(id => lines.get(id) || "").join(" ");
    const clean = u.replace(/\[[^\]]*\]/g, " ").replace(/`[^`]*`/g, " ").replace(/\((?:DEUS_\w+\.js)?:?\d+(?:[–-]\d+)?\)/g, " ").replace(/\b(?:post|pre)-K4\b|\bfix1[ab]?\b|\bFix 1\b|\bK[1-4]\b|\b0017-Q\b|\bWBS §4 step 7\b|\btop[ -]60\b|\bE[1-5]\b|\b\d{4}-\d{2}-\d{2}\b|\b(?:normal|stress|run) [12]\b/g, " ");
    for (const n of clean.match(/\d+(?:\.\d+)?/g) || []) {
        const re = new RegExp(`(^|[^0-9.])${n.replace(".", "\\.")}(?![0-9])`);
        if (re.test(text)) continue;
        if (u.startsWith("|") && /^\|\s*\d+\s*\|/.test(u) && u.match(/^\|\s*(\d+)/)[1] === n) { other.push(`rank ${n}`); continue; }
        notFound++;
        console.log(`NOT FOUND ${n} in [${ids.join("] [")}]: ${u.slice(0, 140)}`);
    }
}
console.log(`${lines.size} figure lines; cited IDs missing: ${missing}; numbers not found in their cited lines: ${notFound}; rank numbers skipped: ${other.length}`);
process.exit(missing || notFound ? 1 : 0);
