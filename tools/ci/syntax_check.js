#!/usr/bin/env node
// CI syntax check (WBS-ORG ORG-1.2): runs `node --check` on game/js/plugins.js, every
// game/js/plugins/*.js, every game/js/sim/**/*.js and every tools/**/*.js file (fixtures included).
// Fails (exit 1) if any file has a syntax error.
// game/js/libs/ (third-party, protected) and node_modules/ are never scanned.
// The only other skips are the exact paths in INTENTIONALLY_INVALID below: fixtures that are
// deliberately malformed test inputs. Executable fixture code (e.g. tools/art/fixtures/templates/
// build_fixture.js, the tools/fixtures/UF_*.js runtime plugins) is checked like any other file.
// Scope: syntax only. Behavioral and native (NW.js) tests are NOT run in CI yet; they are gated
// locally by run_tests.bat.
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
const SKIP_PATHS = [path.join(ROOT, "game", "js", "libs")];

// Exact repo-relative paths of deliberately invalid-syntax fixtures. Keep this list narrow:
// add an entry only for a file that is meant to fail `node --check`, with the reason.
const INTENTIONALLY_INVALID = new Map([
    // Mutant fragment for INV-GOV-02 (tools/governance/test_check_invariants.js): a loop body
    // without its loop (`continue` outside iteration). check_invariants.js reads it as text to
    // prove the checker can fail; it is never executed.
    ["tools/governance/fixtures/invariants/INV-GOV-02/tools/governance/check_claims.js",
        "INV-GOV-02 mutant fragment (read as text, not executed)"]
]);

function rel(p) { return path.relative(ROOT, p).split(path.sep).join("/"); }

function walk(dir, recursive, out) {
    if (!fs.existsSync(dir)) return out;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            if (!recursive || SKIP_DIRS.has(ent.name)) continue;
            if (SKIP_PATHS.some((s) => full === s || full.startsWith(s + path.sep))) continue;
            walk(full, recursive, out);
        } else if (ent.isFile() && ent.name.endsWith(".js")) {
            out.push(full);
        }
    }
    return out;
}

const pluginsJs = path.join(ROOT, "game", "js", "plugins.js");
const found = [
    ...(fs.existsSync(pluginsJs) ? [pluginsJs] : []),
    ...walk(path.join(ROOT, "game", "js", "plugins"), false, []),
    ...walk(path.join(ROOT, "game", "js", "sim"), true, []),
    ...walk(path.join(ROOT, "tools"), true, [])
].sort();

const skipped = found.filter((f) => INTENTIONALLY_INVALID.has(rel(f)));
const files = found.filter((f) => !INTENTIONALLY_INVALID.has(rel(f)));
const foundRel = new Set(found.map(rel));
const stale = [...INTENTIONALLY_INVALID.keys()].filter((p) => !foundRel.has(p));

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
    for (const f of skipped) console.log(`SKIP ${rel(f)} (${INTENTIONALLY_INVALID.get(rel(f))})`);
    for (const p of stale) console.log(`WARN allowlisted path not found (remove it from INTENTIONALLY_INVALID): ${p}`);
    const count = (prefix) => files.filter((f) => rel(f).startsWith(prefix)).length;
    const plugins = count("game/js/plugins/") + (files.includes(pluginsJs) ? 1 : 0);
    const sim = count("game/js/sim/");
    const tools = count("tools/");
    console.log(`syntax_check: ${files.length} files checked (${plugins} plugins incl. plugins.js, ${sim} sim, ${tools} tools), ${failures.length} failed; ${skipped.length} allowlisted invalid fixture(s) skipped`);
    process.exit(failures.length ? 1 : 0);
}
main();
