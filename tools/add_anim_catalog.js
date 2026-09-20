// Adds the top-level "anim" key (UF_Anim, VISION V58) to the world catalog without touching anything else.
// The file's text is kept as it is: the key is inserted before the root object's closing brace, and the script
// checks that every other key parses to exactly the same value before it writes. It re-reads the file right
// before writing and starts over if another agent changed it in between. Idempotent: an existing "anim" key
// is left alone (and reported).
//
// Usage: node tools/add_anim_catalog.js [--file <catalog.json>] [--dry-run]
//   default file: game/data/UF_WorldCatalog.json
// Exit code: 0 written or already present, 1 a check failed (nothing written).
"use strict";
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const opt = (name, fallback) => {
    const i = args.indexOf(name);
    return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const file = path.resolve(opt("--file", path.join(__dirname, "..", "game", "data", "UF_WorldCatalog.json")));
const dryRun = args.includes("--dry-run");

const ANIM = {
    about: "Combat and death animations (UF_Anim, VISION V58). remainsHours: game hours a dead creature's remains lie on its cell (they fade over the last hour). Death, attack and hurt frames come from each sheet's sidecar (animations.dead, attack, hurt; ASSET_REQUESTS AR-600).",
    remainsHours: 12
};

const stripBom = t => t.replace(/^﻿/, "");
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function build(text) {
    const before = JSON.parse(stripBom(text));
    if (Object.prototype.hasOwnProperty.call(before, "anim")) return { already: true, before };
    const nl = text.includes("\r\n") ? "\r\n" : "\n";
    const end = text.lastIndexOf("}");
    if (end < 0) throw new Error("no closing brace");
    let i = end - 1;
    while (i >= 0 && /\s/.test(text[i])) i--;
    const body = JSON.stringify(ANIM, null, 2).split("\n").map((l, k) => (k === 0 ? l : "  " + l)).join(nl);
    const out = text.slice(0, i + 1) + "," + nl + '  "anim": ' + body + text.slice(i + 1);
    const after = JSON.parse(stripBom(out));
    const keysBefore = Object.keys(before), keysAfter = Object.keys(after);
    const problems = [];
    if (keysAfter.length !== keysBefore.length + 1 || keysAfter[keysAfter.length - 1] !== "anim") problems.push(`keys ${keysBefore.length} -> ${keysAfter.length}, last "${keysAfter[keysAfter.length - 1]}"`);
    for (const k of keysBefore) if (!same(before[k], after[k])) problems.push(`key "${k}" changed`);
    if (!same(after.anim, ANIM)) problems.push("anim value differs");
    if (!out.startsWith(text.slice(0, i + 1))) problems.push("text before the insertion changed");
    return { already: false, before, after, out, problems };
}

for (let attempt = 1; attempt <= 3; attempt++) {
    const text = fs.readFileSync(file, "utf8");
    const r = build(text);
    if (r.already) {
        console.log(`${file}: "anim" already present: ${JSON.stringify(r.before.anim)}`);
        process.exit(0);
    }
    if (r.problems.length) {
        console.error(`CHECK FAILED, nothing written: ${r.problems.join("; ")}`);
        process.exit(1);
    }
    if (dryRun) {
        console.log(`dry run: would add "anim" (${r.out.length - text.length} bytes) to ${file}; ${Object.keys(r.before).length} other keys unchanged`);
        process.exit(0);
    }
    const again = fs.readFileSync(file, "utf8");
    if (again !== text) {
        console.log(`attempt ${attempt}: the file changed while checking; starting over`);
        continue;
    }
    fs.writeFileSync(file, r.out);
    const written = JSON.parse(stripBom(fs.readFileSync(file, "utf8")));
    const ok = same(written.anim, ANIM) && Object.keys(r.before).every(k => same(r.before[k], written[k]));
    console.log(`${ok ? "WROTE" : "WRITTEN BUT CHECK FAILED"} ${file}: "anim" = ${JSON.stringify(written.anim)}; ${Object.keys(r.before).length} other keys unchanged: ${ok}`);
    process.exit(ok ? 0 : 1);
}
console.error("the file kept changing; nothing written");
process.exit(1);
