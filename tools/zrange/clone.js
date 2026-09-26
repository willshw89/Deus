#!/usr/bin/env node
"use strict";
/**
 * tools/zrange/clone.js (WG.00.17, lane AA): a throwaway clone of this repository at a commit, under %TEMP%, for the
 * heavy NW.js runs (run_tests, bench, provocations), so nothing runs in the worktree. The clone is a local clone
 * (objects hardlinked) with a sparse checkout of game/, tools/ and art/palette/ (tools/test_palette.js) only, core.autocrlf off (the files are byte for byte
 * the commit's).
 *
 * Usage: node tools/zrange/clone.js <commit> <name>     -> prints the clone's folder (%TEMP%\laneaa_clones\<name>)
 *        node tools/zrange/clone.js --remove <name>      -> deletes it (junction-safe)
 *        node tools/zrange/clone.js --remove-all         -> deletes every clone of this tool
 * Exit: 0 done, 2 problem.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const BASE = path.join(os.tmpdir(), "laneaa_clones");

function git(args, cwd) {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024, env: Object.assign({}, process.env, { MSYS_NO_PATHCONV: "1" }) });
}
/** Delete a folder without following junctions or symlinks (snapshot folders hold junctions to real game folders). */
function removeTree(dir) {
    if (!fs.existsSync(dir)) return;
    const st = fs.lstatSync(dir);
    if (st.isSymbolicLink()) { fs.unlinkSync(dir); return; }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        const l = fs.lstatSync(p);
        if (l.isSymbolicLink()) fs.unlinkSync(p);
        else if (l.isDirectory()) removeTree(p);
        else fs.rmSync(p, { force: true });
    }
    fs.rmdirSync(dir);
}
function makeClone(commit, name) {
    const dir = path.join(BASE, name);
    removeTree(dir);
    fs.mkdirSync(BASE, { recursive: true });
    git(["-c", "core.autocrlf=false", "clone", "--local", "--no-checkout", "-q", ROOT, dir]);
    git(["config", "core.autocrlf", "false"], dir);
    git(["sparse-checkout", "set", "--no-cone", "/game/", "/tools/", "/art/palette/"], dir);
    git(["checkout", "-q", "--detach", commit], dir);
    return { dir, head: git(["rev-parse", "HEAD"], dir).trim() };
}
module.exports = { makeClone, removeTree, BASE };

if (require.main === module) {
    const a = process.argv.slice(2);
    try {
        if (a[0] === "--remove") { removeTree(path.join(BASE, a[1])); console.log(`removed ${path.join(BASE, a[1])}`); }
        else if (a[0] === "--remove-all") { removeTree(BASE); console.log(`removed ${BASE}`); }
        else {
            if (a.length < 2) throw new Error("usage: clone.js <commit> <name>");
            const r = makeClone(a[0], a[1]);
            console.log(r.dir);
            console.log(`HEAD ${r.head}`);
        }
    } catch (e) { console.error(`HARNESS: ${e.message}`); process.exit(2); }
}
