#!/usr/bin/env node
"use strict";
// OPS.30.01 lane-y: checks every path changed since the base against lane.json allowedPaths
// ("**" crosses folders, "*" and "?" stay inside one, case-insensitive, as tools/ops/README.md section 1 describes).
// Usage: node tasks/OPS.30.01/lane-y/analysis/scope_check.js [--cached]   (--cached: base vs the index, else base..HEAD)
// Exit 0 when every path matches, 1 otherwise.
const path = require("path");
const { execFileSync } = require("child_process");

const BASE = "425b594c146d5f353c10faa11f4b5d47f499b45f";
const lane = require(path.join(__dirname, "..", "lane.json"));
const esc = s => s.replace(/[.+^${}()|[\]\\]/g, "\\$&");
const toRe = g => new RegExp(`^${g.split("**").map(a => a.split("*").map(b => b.split("?").map(esc).join("[^/]")).join("[^/]*")).join(".*")}$`, "i");
const globs = lane.allowedPaths.map(g => ({ g, re: toRe(g), n: 0 }));
const args = process.argv.includes("--cached") ? ["diff", "--cached", "--name-only", BASE] : ["diff", "--name-only", `${BASE}..HEAD`];
const files = execFileSync("git", args, { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
let outside = 0;
for (const f of files) {
    const hit = globs.find(x => x.re.test(f));
    if (hit) hit.n++; else { outside++; console.log(`OUTSIDE ${f}`); }
}
console.log(`$ git ${args.join(" ")}: ${files.length} paths, ${outside} outside allowedPaths`);
for (const x of globs) console.log(`  ${x.g}: ${x.n}`);
console.log("paths other than evidence/logs/** and evidence/superseded/**:");
for (const f of files) if (!/^tasks\/OPS\.30\.01\/lane-y\/evidence\/(logs|superseded)\//.test(f)) console.log(`  ${f}`);
process.exit(outside ? 1 : 0);
