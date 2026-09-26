#!/usr/bin/env node
// SIM.50.01 gap audit: check every code citation in docs/audits/LIVING_WORLD_GAP_AUDIT.md against a git commit.
//
// Usage: node tasks/SIM.50.01/gap-audit/verify_citations.js [--commit 75cf2ff3] [--doc docs/audits/LIVING_WORLD_GAP_AUDIT.md]
//
// What it checks:
//   1. Every citation `path:line` or `path:line-line` (inside backticks) names a file that exists at the commit and
//      lines inside that file. Bare plugin names (`DEUS_Fluid.js:56`, `UF_Time.js:12`) resolve to game/js/plugins/.
//   2. Every evidence-table row of the form  | `path:line` | `excerpt` | ... |  has the excerpt on the cited line (or,
//      for a range, on some line of the range). Whitespace is collapsed before comparing; `\|` in the doc is a literal |.
// Exit code: 0 when every citation resolves and every excerpt matches; 1 otherwise (each failure is printed).
// Self-test: --selftest runs the checker on a doctored copy of the doc (one excerpt changed, one line number moved,
// one file renamed) and exits 0 only when all three are reported as failures.

"use strict";
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const argOf = (name, def) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
const COMMIT = argOf("--commit", "75cf2ff3");
const DOC = argOf("--doc", "docs/audits/LIVING_WORLD_GAP_AUDIT.md");
const ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();

const fileCache = new Map();
function linesAt(relPath) {
    if (fileCache.has(relPath)) return fileCache.get(relPath);
    let lines = null;
    try {
        const text = execFileSync("git", ["show", `${COMMIT}:${relPath}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
        lines = text.replace(/^﻿/, "").split(/\r?\n/);
    } catch (e) { lines = null; }
    fileCache.set(relPath, lines);
    return lines;
}
const resolvePath = p => (/^(DEUS|UF)_[A-Za-z0-9]+\.js$/.test(p) ? `game/js/plugins/${p}` : p);
const norm = s => s.replace(/\s+/g, " ").trim();

// A citation: `path:123` or `path:123-456` inside backticks. Paths may be bare plugin names or repo-relative.
const CITE = /`((?:[A-Za-z0-9_.\-]+\/)*[A-Za-z0-9_.\-]+\.(?:js|json|md|bat|ps1)):(\d+)(?:-(\d+))?`/g;

function check(docText) {
    const failures = [];
    let citations = 0, excerpts = 0;
    const docLines = docText.split(/\r?\n/);
    docLines.forEach((line, n) => {
        const where = `doc line ${n + 1}`;
        // Evidence-table row: | `path:line` | `excerpt` | ...
        const row = /^\|\s*`([^`]+:\d+(?:-\d+)?)`\s*\|\s*`((?:[^`\\]|\\.)*)`\s*\|/.exec(line);
        let m;
        CITE.lastIndex = 0;
        while ((m = CITE.exec(line)) !== null) {
            citations++;
            const rel = resolvePath(m[1]), a = Number(m[2]), b = m[3] ? Number(m[3]) : a;
            const lines = linesAt(rel);
            if (!lines) { failures.push(`${where}: ${m[1]} does not exist at ${COMMIT}`); continue; }
            if (a < 1 || b < a || b > lines.length) { failures.push(`${where}: ${m[1]}:${a}${b !== a ? "-" + b : ""} is outside the file (${lines.length} lines)`); continue; }
        }
        if (row) {
            excerpts++;
            const c = /^(.*):(\d+)(?:-(\d+))?$/.exec(row[1]);
            const rel = resolvePath(c[1]), a = Number(c[2]), b = c[3] ? Number(c[3]) : a;
            const lines = linesAt(rel);
            const want = norm(row[2].replace(/\\\|/g, "|"));
            if (!lines || b > lines.length) return;   // already reported above
            let hit = false;
            for (let k = a; k <= b && !hit; k++) if (norm(lines[k - 1]).includes(want)) hit = true;
            if (!hit) failures.push(`${where}: excerpt not on ${row[1]}\n    want: ${want}\n    line: ${norm(lines[a - 1] || "")}`);
        }
    });
    return { failures, citations, excerpts };
}

function main() {
    const docPath = path.join(ROOT, DOC);
    const text = fs.readFileSync(docPath, "utf8");
    if (args.includes("--selftest")) {
        const rows = text.split(/\r?\n/).filter(l => /^\|\s*`[^`]+:\d+`\s*\|\s*`/.test(l));
        if (rows.length < 3) { console.log("SELFTEST FAIL: fewer than 3 evidence rows to doctor"); process.exit(1); }
        const r0 = rows[0], r1 = rows[1], r2 = rows[2];
        const bad0 = r0.replace(/^(\|\s*`[^`]+`\s*\|\s*`)((?:[^`\\]|\\.)*)(`)/, (s, a, ex, b) => a + ex + " MUTATED_EXCERPT" + b); // wrong excerpt (2nd cell)
        const bad1 = r1.replace(/`([^`]+):(\d+)`/, (s, p, l) => `\`${p}:${Number(l) + 100000}\``);                       // line outside file
        const bad2 = r2.replace(/`([^`]+):(\d+)`/, (s, p, l) => `\`${p.replace(/\.js$/, "_NOPE.js").replace(/\.json$/, "_NOPE.json")}:${l}\``); // no such file
        const doctored = text.replace(r0, bad0).replace(r1, bad1).replace(r2, bad2);
        const res = check(doctored);
        const caught = [bad0, bad1, bad2].filter(b => res.failures.some(f => f.includes(`doc line ${doctored.split(/\r?\n/).indexOf(b) + 1}:`))).length;
        console.log(`SELFTEST: ${caught}/3 doctored citations reported as failures (${res.failures.length} failures total)`);
        process.exit(caught === 3 ? 0 : 1);
    }
    const res = check(text);
    for (const f of res.failures) console.log(`FAIL ${f}`);
    console.log(`${res.citations} citations checked, ${res.excerpts} verbatim excerpts checked against ${COMMIT}: ${res.failures.length} failure(s)`);
    process.exit(res.failures.length ? 1 : 0);
}
main();
