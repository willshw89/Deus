#!/usr/bin/env node
// CI root hygiene check (WBS-ORG ORG-2.4): fails (exit 1) if any .js, .png or .zip file sits in the
// repo root, other than the allowlist below. Scripts belong in tools/ (permanent) or
// scratchpad/<lane-id>/ (throwaway, gitignored); see AGENTS.md -> Script location rule.
// Usage: node tools/ci/check_root.js [--root <repo root>]
"use strict";
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const rootIdx = args.indexOf("--root");
const ROOT = path.resolve(rootIdx >= 0 ? args[rootIdx + 1] : path.join(__dirname, "..", ".."));

// Root files of these types that are allowed. Adding an entry needs Owner OK.
const ALLOWLIST = new Set([]);
const BANNED_EXT = new Set([".js", ".png", ".zip"]);

const offenders = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter((e) => e.isFile() && BANNED_EXT.has(path.extname(e.name).toLowerCase()) && !ALLOWLIST.has(e.name))
    .map((e) => e.name)
    .sort();

for (const name of offenders) console.log(`FAIL root file not allowed: ${name} (move it to tools/ or scratchpad/<lane-id>/)`);
console.log(`check_root: ${offenders.length} disallowed .js/.png/.zip file(s) in ${ROOT}`);
process.exit(offenders.length ? 1 : 0);
