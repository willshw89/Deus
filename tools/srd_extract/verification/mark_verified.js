// tools/srd_extract/verification/mark_verified.js - record that an entry was compared with the rendered page.
//
// Usage: node tools/srd_extract/verification/mark_verified.js <id> [<id> ...] --by "<reviewer>" --method "<how>"
//        [--pages 208,209] [--note "<text>"] [--staging <dir>] [--file <verified.json>]
//
// Looks each id up in the staging files, hashes the entry's current text and appends or replaces a record
// { id, verifiedBy, verifiedAt, method, pages, textSha256, notes } in verified.json. build_srd_catalog.js applies the
// mark only while the text still hashes to textSha256, so a re-parse can never carry a stale mark forward.
// Exit 1 when an id is not found. It never edits staging files or the catalogue.
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback; };
const ids = args.filter((a, i) => /^srd:/.test(a) && !/^--/.test(args[i - 1] || ""));
const by = opt("--by", null), method = opt("--method", null), note = opt("--note", null);
const pagesOpt = opt("--pages", null);
const stagingDir = path.resolve(opt("--staging", path.join(__dirname, "..", "staging")));
const file = path.resolve(opt("--file", path.join(__dirname, "verified.json")));

if (!ids.length || !by || !method) {
    console.error("mark_verified: need at least one srd: id, --by and --method");
    process.exit(2);
}
const entries = new Map();
for (const f of fs.readdirSync(stagingDir).filter(f => /^staging_.*\.json$/.test(f))) {
    for (const e of JSON.parse(fs.readFileSync(path.join(stagingDir, f), "utf8")).entries) entries.set(e.id, e);
}
const store = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { about: "Verification marks applied by tools/build_srd_catalog.js; see docs/SRD5_1_COVERAGE_MANIFEST.md section 6.", records: [] };
let missing = 0;
for (const id of ids) {
    const e = entries.get(id);
    if (!e) { console.error(`mark_verified: ${id} not found in ${stagingDir}`); missing++; continue; }
    const rec = {
        id,
        verifiedBy: by,
        verifiedAt: new Date().toISOString().slice(0, 10),
        method,
        pages: pagesOpt ? pagesOpt.split(",").map(Number) : e.source.pages,
        textSha256: crypto.createHash("sha256").update(e.text, "utf8").digest("hex"),
        notes: note ? [note] : []
    };
    const i = store.records.findIndex(r => r.id === id);
    if (i >= 0) store.records[i] = rec; else store.records.push(rec);
    console.log(`marked ${id} (pages ${rec.pages.join(",")}, text sha256 ${rec.textSha256.slice(0, 12)})`);
}
store.records.sort((a, b) => a.id.localeCompare(b.id));
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(store, null, 1) + "\n", "utf8");
process.exit(missing ? 1 : 0);
