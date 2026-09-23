// tools/srd_extract/diff_staging.js - record-level diff of the staging files against a git revision.
//
// Usage: node tools/srd_extract/diff_staging.js [--ref <git ref>] [--out <json file>]
//   --ref  the revision to compare the working staging files with (default e70783e, the first build)
//   --out  where to write the machine-readable diff (default tools/srd_extract/reports/staging_diff.json)
//
// For every staging_*.json: entries added, removed, and changed (text, data keys, readiness, notes, pages).
// Prints one summary line per file and a total; exit 0 always (it reports, it does not judge).
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback; };
const ref = opt("--ref", "e70783e");
const outFile = path.resolve(opt("--out", path.join(__dirname, "reports", "staging_diff.json")));
const stagingDir = path.join(__dirname, "staging");

function gitShow(rel) {
    try {
        return execFileSync("git", ["show", `${ref}:${rel.replace(/\\/g, "/")}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
    } catch (e) {
        return null;
    }
}
const stable = v => JSON.stringify(v, Object.keys(v && typeof v === "object" && !Array.isArray(v) ? v : {}).sort());
function deepEqual(a, b) { return JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b)); }
function sortKeys(v) {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map(k => [k, sortKeys(v[k])]));
    return v;
}

const report = { ref, generatedAt: new Date().toISOString(), files: {}, totals: { added: 0, removed: 0, changed: 0, unchanged: 0 } };
const files = fs.readdirSync(stagingDir).filter(f => /^staging_.*\.json$/.test(f)).sort();
for (const file of files) {
    const rel = path.join("tools", "srd_extract", "staging", file);
    const nowObj = JSON.parse(fs.readFileSync(path.join(stagingDir, file), "utf8"));
    const oldText = gitShow(rel);
    const oldObj = oldText ? JSON.parse(oldText) : { entries: [] };
    const oldById = new Map(oldObj.entries.map(e => [e.id, e]));
    const nowById = new Map(nowObj.entries.map(e => [e.id, e]));
    const f = { added: [], removed: [], changed: [], unchanged: 0 };
    for (const [id, e] of nowById) {
        const o = oldById.get(id);
        if (!o) { f.added.push({ id, pages: e.source.pages, readiness: e.readiness }); continue; }
        const ch = {};
        if (o.text !== e.text) ch.text = { oldLength: o.text.length, newLength: e.text.length };
        if (o.readiness !== e.readiness) ch.readiness = { old: o.readiness, new: e.readiness };
        if (!deepEqual(o.source.pages, e.source.pages)) ch.pages = { old: o.source.pages, new: e.source.pages };
        if (!deepEqual(o.notes, e.notes)) ch.notes = { old: o.notes, new: e.notes };
        const keys = new Set([...Object.keys(o.data || {}), ...Object.keys(e.data || {})]);
        const dataKeys = [...keys].filter(k => !deepEqual((o.data || {})[k], (e.data || {})[k]));
        if (dataKeys.length) ch.data = dataKeys;
        if (Object.keys(ch).length) f.changed.push(Object.assign({ id }, ch)); else f.unchanged++;
    }
    for (const id of oldById.keys()) if (!nowById.has(id)) f.removed.push({ id });
    report.files[file] = f;
    report.totals.added += f.added.length; report.totals.removed += f.removed.length; report.totals.changed += f.changed.length; report.totals.unchanged += f.unchanged;
    console.log(`${file.padEnd(34)} vs ${ref}: +${f.added.length} added, -${f.removed.length} removed, ${f.changed.length} changed, ${f.unchanged} unchanged${oldText ? "" : " (file absent at ref)"}`);
}
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(report, null, 1) + "\n", "utf8");
console.log(`staging diff: +${report.totals.added} -${report.totals.removed} ~${report.totals.changed} =${report.totals.unchanged} -> ${path.relative(ROOT, outFile)}`);
