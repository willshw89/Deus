#!/usr/bin/env node
// Lane M (SIM.00.01) citation extractor for ADR-003. Evidence tooling only: it lists every file:line citation in
// the ADR with the cited lines as they are at a given commit, so each claim can be judged by a reader.
// It does not judge claims. Usage:
//   node tasks/SIM.00.01/lane-m/cite_check.js --adr <rev>:<path> | --adr-file <path>  --rev <commit> [--out <file>] [--json <file>]
//     [--compare <commit>]   also report, per unpinned citation, whether the cited lines read the same at <commit>
// A citation is `File.ext:N`, `File.ext:N-M`, or a bare `:N` / `:N-M` that refers to the last file named before it
// (same line first, then earlier lines of the same section). A citation followed by "at `<sha>`" is read at <sha>.
"use strict";
const { execFileSync } = require("child_process");
const fs = require("fs");

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const ADR_REV = opt("--adr"), ADR_FILE = opt("--adr-file"), REV = opt("--rev"), OUT = opt("--out"), JSON_OUT = opt("--json");
const CMP = opt("--compare");
if ((!ADR_REV && !ADR_FILE) || !REV) {
    console.error("usage: cite_check.js (--adr <rev>:<path> | --adr-file <path>) --rev <commit> [--out f] [--json f]");
    process.exit(2);
}
const git = a => execFileSync("git", a, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
const adrText = ADR_FILE ? fs.readFileSync(ADR_FILE, "utf8") : git(["show", ADR_REV]);

// Basename -> repo path. Plugins, engine files and a few known docs; anything else must carry its directory.
const treeCache = new Map();
function tree(rev) {
    if (!treeCache.has(rev)) treeCache.set(rev, git(["ls-tree", "-r", "--name-only", rev]).split("\n").filter(Boolean));
    return treeCache.get(rev);
}
function resolvePath(name, rev) {
    const all = tree(rev);
    if (all.includes(name)) return name;
    const hits = all.filter(p => p === name || p.endsWith("/" + name));
    if (hits.length === 1) return hits[0];
    const pref = ["game/js/plugins/", "game/js/", "game/data/", "docs/systems/", "docs/", "tools/"];
    for (const d of pref) { const h = hits.find(p => p === d + name); if (h) return h; }
    return hits.length ? hits[0] : null;
}
const fileCache = new Map();
function fileLines(path, rev) {
    const key = rev + ":" + path;
    if (!fileCache.has(key)) {
        let t = null;
        try { t = git(["show", key]); } catch (e) { t = null; }
        fileCache.set(key, t === null ? null : t.replace(/\r\n/g, "\n").split("\n"));
    }
    return fileCache.get(key);
}

// One token, in order of the groups:
//   1-3 an explicit file cite `File.ext:N[-M]`;
//   4-7 a bare `:N[-M]` (the file is the last one named before it);
//   8   a file named without a line (`rmmz_core.js`), which only sets the context file;
//   9   a plugin short name before a bare cite ("Levels `:4287`" -> DEUS_Levels.js), which only sets the context file.
const FNAME = "(?:[A-Za-z0-9_.\\/-]*\\/)?(?:DEUS_[A-Za-z0-9_]+\\.js|UF_[A-Za-z0-9_]+\\.(?:js|json|md)|rmmz_[a-z]+\\.js|plugins\\.js|[A-Za-z0-9_-]+\\.(?:md|json|js))";
const TOK_RE = new RegExp("(" + FNAME + "):(\\d+)(?:-(\\d+))?" +
    "|(^|[`\\s(,/])(:(\\d+)(?:-(\\d+))?)(?=[`),;\\s]|$)" +
    "|`(" + FNAME + ")`(?!:)" +
    "|\\b([A-Z][A-Za-z]+)(?= \\(?`:\\d)", "g");
const SHA_AT_RE = /^[^|]{0,40}?\bat `([0-9a-f]{7,40})`/;

const lines = adrText.replace(/\r\n/g, "\n").split("\n");
const cites = [];
let section = "", lastFile = null, lastFileLine = 0, inFence = false;
for (let li = 0; li < lines.length; li++) {
    const L = lines[li];
    if (/^```/.test(L)) { inFence = !inFence; }
    if (/^#{1,4} /.test(L)) { section = L.replace(/^#+ /, ""); lastFile = null; continue; }
    TOK_RE.lastIndex = 0;
    let m;
    while ((m = TOK_RE.exec(L))) {
        let file, a, b, bare = false;
        if (m[8]) { lastFile = m[8]; lastFileLine = li; continue; }
        if (m[9]) { const cand = "DEUS_" + m[9] + ".js"; if (resolvePath(cand, REV)) { lastFile = cand; lastFileLine = li; } continue; }
        if (m[1]) { file = m[1]; a = +m[2]; b = m[3] ? +m[3] : a; lastFile = file; lastFileLine = li; }
        else { if (!lastFile) continue; file = lastFile; a = +m[6]; b = m[7] ? +m[7] : a; bare = true; }
        const after = L.slice(TOK_RE.lastIndex);
        // A pin after the cite ("... `:171-187` at `0c1baf8d`") or just before it ("at `0c1baf8d` (`...:171-187`").
        const before = L.slice(Math.max(0, m.index - 20), m.index);
        const at = SHA_AT_RE.exec(after) || /\bat `([0-9a-f]{7,40})` \(`?$/.exec(before);
        cites.push({ adrLine: li + 1, section, file, a, b, bare, ctxBack: bare ? li - lastFileLine : 0, pin: at ? at[1] : null });
    }
}

const out = [], json = [];
let n = 0, missing = 0, outOfRange = 0;
const cmp = { same: 0, changed: [] };
for (const c of cites) {
    n++;
    const rev = c.pin || REV;
    const path = resolvePath(c.file.replace(/^\//, ""), rev);
    const fl = path ? fileLines(path, rev) : null;
    let status = "OK", body = [];
    if (!path || !fl) { status = "NO_FILE"; missing++; }
    else if (c.a < 1 || c.b > fl.length || c.b < c.a) { status = "OUT_OF_RANGE(len " + fl.length + ")"; outOfRange++; }
    else {
        const span = c.b - c.a + 1;
        const pick = span <= 8 ? [...Array(span).keys()].map(k => c.a + k) : [c.a, c.a + 1, c.a + 2, -1, c.b - 1, c.b];
        body = pick.map(k => k < 0 ? "      ..." : `${String(k).padStart(6)}  ${fl[k - 1].trim().slice(0, 220)}`);
    }
    const id = "C" + String(n).padStart(3, "0");
    if (CMP && !c.pin && status === "OK") {
        const f2 = fileLines(path, CMP), a = fl.slice(c.a - 1, c.b).join("\n");
        const b = f2 && c.b <= f2.length ? f2.slice(c.a - 1, c.b).join("\n") : null;
        if (a === b) cmp.same++; else cmp.changed.push(id + " " + path + ":" + c.a + (c.b !== c.a ? "-" + c.b : ""));
    }
    const claim = lines[c.adrLine - 1].trim().slice(0, 600);
    out.push(`### ${id} ADR:${c.adrLine} ${path || c.file}:${c.a}${c.b !== c.a ? "-" + c.b : ""}${c.pin ? " @" + c.pin : ""}${c.bare ? " (bare, file from " + c.ctxBack + " line(s) back)" : ""} ${status}`,
        `section: ${c.section}`, `claim: ${claim}`, ...body, "");
    json.push(Object.assign({ id, path, rev, status, claim }, c));
}
const head = `# ADR-003 citation dump\n\nADR: ${ADR_FILE || ADR_REV}\nCode/doc rev: ${REV}\nCitations: ${n}; NO_FILE: ${missing}; OUT_OF_RANGE: ${outOfRange}\n\n`;
if (OUT) fs.writeFileSync(OUT, head + out.join("\n")); else process.stdout.write(head + out.join("\n"));
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(json, null, 1));
console.error(`citations ${n}  NO_FILE ${missing}  OUT_OF_RANGE ${outOfRange}`);
if (CMP) { console.error(`compare ${CMP}: same text ${cmp.same}, changed ${cmp.changed.length}`); for (const x of cmp.changed) console.error("  changed " + x); }
process.exit(0);
