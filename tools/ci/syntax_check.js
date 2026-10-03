#!/usr/bin/env node
// CI syntax check (WBS-ORG ORG-1.2): runs `node --check` on every game/js/plugins/*.js
// and every tools/**/*.js file. Fails (exit 1) if any file has a syntax error.
// game/js/libs/ (third-party, protected) and node_modules/ are never scanned. Directories named
// "fixtures" are skipped too: they hold test-input data (e.g. deliberate code fragments read by
// tools/governance/check_invariants.js), not runnable code. Skipped counts are printed.
// Usage: node tools/ci/syntax_check.js [--root <repo root>]
"use strict";
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");

const args = process.argv.slice(2);
const rootIdx = args.indexOf("--root");
const ROOT = path.resolve(rootIdx >= 0 ? args[rootIdx + 1] : path.join(__dirname, "..", ".."));
const SKIP_DIRS = new Set(["node_modules", ".git"]);
const FIXTURE_DIR = "fixtures";
let skippedFixtures = 0;
const SKIP_PATHS = [path.join(ROOT, "game", "js", "libs")];

function rel(p) { return path.relative(ROOT, p).split(path.sep).join("/"); }

function walk(dir, recursive, out) {
    if (!fs.existsSync(dir)) return out;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            if (!recursive || SKIP_DIRS.has(ent.name)) continue;
            if (ent.name === FIXTURE_DIR) { skippedFixtures += walk(full, true, []).length; continue; }
            if (SKIP_PATHS.some((s) => full === s || full.startsWith(s + path.sep))) continue;
            walk(full, recursive, out);
        } else if (ent.isFile() && ent.name.endsWith(".js")) {
            out.push(full);
        }
    }
    return out;
}

const files = [
    ...walk(path.join(ROOT, "game", "js", "plugins"), false, []),
    ...walk(path.join(ROOT, "tools"), true, [])
].sort();

if (files.length === 0) {
    console.error("syntax_check: no files found; wrong --root?");
    process.exit(2);
}

function check(file) {
    return new Promise((resolve) => {
        execFile(process.execPath, ["--check", file], { maxBuffer: 4 * 1024 * 1024 }, (err, _stdout, stderr) => {
            resolve({ file, ok: !err, msg: err ? String(stderr || err.message).trim() : "" });
        });
    });
}

async function main() {
    const failures = [];
    let next = 0;
    const workers = Array.from({ length: Math.max(2, Math.min(8, os.cpus().length)) }, async () => {
        while (next < files.length) {
            const r = await check(files[next++]);
            if (!r.ok) failures.push(r);
        }
    });
    await Promise.all(workers);
    failures.sort((a, b) => a.file.localeCompare(b.file));
    for (const f of failures) {
        console.log(`FAIL ${rel(f.file)}`);
        console.log(f.msg.split(/\r?\n/).map((l) => "    " + l).join("\n"));
    }
    const plugins = files.filter((f) => rel(f).startsWith("game/js/plugins/")).length;
    console.log(`syntax_check: ${files.length} files checked (${plugins} plugins, ${files.length - plugins} tools), ${failures.length} failed; ${skippedFixtures} .js file(s) under fixtures/ skipped`);
    process.exit(failures.length ? 1 : 0);
}
main();
