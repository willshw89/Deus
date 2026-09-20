// Adds the top-level "ambient" key (UF_Ambient, VISION V60, ART_STANDARD U8) to the world catalog without touching
// anything else. The file's text is kept as it is: the key is inserted before the root object's closing brace, and the
// script checks that every other key parses to exactly the same value before it writes. It re-reads the file right
// before writing and starts over if another agent changed it in between. Idempotent: an existing "ambient" key is left
// alone (and reported).
//
// Usage: node tools/add_ambient_catalog.js [--file <catalog.json>] [--dry-run]
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

// The same values as UF_Ambient.js DEFAULTS (the plugin's fallback when this key is missing).
const AMBIENT = {
    about: "What moves on its own (UF_Ambient, VISION V60, ART_STANDARD U8). objects: rules tried in order; a rule matches an object type when its id is in ids or any of its tags is in tags, and the first match picks the motion: sway and ripple (the sprite shears from its foot; amp = how far its top moves, in pixels at zoom 1; period in frames, 60 = 1 s, one value per object from hash32 of its cell and type), fire (flame overlay, flicker, smoke puffs rising smokeRise px over smokeLife frames, one every smokeEvery frames; flameAt = where the flame's foot sits, from the object's anchor), door (an in-between frame while a UF_Doors door opens or closes), still. work: bob or spark while a job at the object is in its work state. A sheet whose sidecar names frames under animations (sway, idle, lit, work, open) steps those frames at frameMs instead of the code motion. Types no rule matches stay still. creatures: breathing (amp px, period frames, starts after frames of standing), idle turns (after idle frames, then every), fliers (units with one of these tags) bob amp px. water: glints on water cells in view by day (at most max, one per cellsPerGlint water cells, life frames each, gap frames between). particles: leaves over leaf grounds, pollen over pollen grounds, at most max on screen, one every frames. houses: chimney smoke over rooms UF_Society lists as lived in or with a lit hearth.",
    objects: [
        { tags: ["fire"], motion: "fire", flameAt: [0, -24], smokeEvery: [70, 130], smokeRise: [20, 40], smokeLife: [100, 150], work: "spark" },
        { tags: ["door"], motion: "door" },
        { ids: ["dead_tree", "tree_cursed"], motion: "sway", amp: 0.75, period: [240, 330] },
        { tags: ["tree"], motion: "sway", amp: 1.5, period: [180, 300] },
        { ids: ["cactus", "cactus_tall", "lichen", "lily_pad"], motion: "still" },
        { ids: ["grass_tuft", "reeds", "wild_grain", "wheat_wild"], tags: ["crop", "grain"], motion: "ripple", amp: 1, period: [80, 130] },
        { tags: ["flower"], motion: "ripple", amp: 0.75, period: [100, 160] },
        { tags: ["bush"], motion: "sway", amp: 0.5, period: [240, 360] },
        { tags: ["plant"], motion: "ripple", amp: 0.75, period: [110, 170] },
        { tags: ["farm"], motion: "still" },
        { tags: ["furnace", "smithy"], motion: "still", work: "spark" },
        { tags: ["workplace"], motion: "still", work: "bob" }
    ],
    creatures: {
        breathe: { amp: 1, period: [120, 180], after: 30 },
        turn: { idle: 360, every: [300, 720] },
        flier: { tags: ["flier"], amp: 2, period: [80, 110] }
    },
    water: { max: 6, cellsPerGlint: 40, life: 30, gap: [20, 90], hours: [6, 19] },
    particles: {
        max: 12,
        every: 24,
        leaf: { grounds: ["forest_floor", "needle_floor", "jungle_floor"], life: [360, 720], tints: ["#9cc45a", "#c9b24a", "#b07a3c", "#7fae4a"] },
        pollen: { grounds: ["meadow", "tropical_grass", "blessed_grass"], life: [300, 600] }
    },
    houses: { smokeEvery: [90, 160], smokeRise: [20, 40], smokeLife: [110, 160] }
};

const stripBom = t => t.replace(/^﻿/, "");
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function build(text) {
    const before = JSON.parse(stripBom(text));
    if (Object.prototype.hasOwnProperty.call(before, "ambient")) return { already: true, before };
    const nl = text.includes("\r\n") ? "\r\n" : "\n";
    const end = text.lastIndexOf("}");
    if (end < 0) throw new Error("no closing brace");
    let i = end - 1;
    while (i >= 0 && /\s/.test(text[i])) i--;
    const body = JSON.stringify(AMBIENT, null, 2).split("\n").map((l, k) => (k === 0 ? l : "  " + l)).join(nl);
    const out = text.slice(0, i + 1) + "," + nl + '  "ambient": ' + body + text.slice(i + 1);
    const after = JSON.parse(stripBom(out));
    const keysBefore = Object.keys(before), keysAfter = Object.keys(after);
    const problems = [];
    if (keysAfter.length !== keysBefore.length + 1 || keysAfter[keysAfter.length - 1] !== "ambient") problems.push(`keys ${keysBefore.length} -> ${keysAfter.length}, last "${keysAfter[keysAfter.length - 1]}"`);
    for (const k of keysBefore) if (!same(before[k], after[k])) problems.push(`key "${k}" changed`);
    if (!same(after.ambient, AMBIENT)) problems.push("ambient value differs");
    if (!out.startsWith(text.slice(0, i + 1))) problems.push("text before the insertion changed");
    // Every id a rule names must be a catalog object.
    const ids = new Set((before.objects || []).map(o => o.id));
    for (const r of AMBIENT.objects) for (const id of r.ids || []) if (!ids.has(id)) problems.push(`rule names unknown object "${id}"`);
    return { already: false, before, after, out, problems };
}

for (let attempt = 1; attempt <= 3; attempt++) {
    const text = fs.readFileSync(file, "utf8");
    const r = build(text);
    if (r.already) {
        console.log(`${file}: "ambient" already present (${JSON.stringify(r.before.ambient).length} chars); nothing written`);
        process.exit(0);
    }
    if (r.problems.length) {
        console.error(`CHECK FAILED, nothing written: ${r.problems.join("; ")}`);
        process.exit(1);
    }
    if (dryRun) {
        console.log(`dry run: would add "ambient" (${r.out.length - text.length} bytes) to ${file}; ${Object.keys(r.before).length} other keys unchanged`);
        process.exit(0);
    }
    const again = fs.readFileSync(file, "utf8");
    if (again !== text) {
        console.log(`attempt ${attempt}: the file changed while checking; starting over`);
        continue;
    }
    fs.writeFileSync(file, r.out);
    const written = JSON.parse(stripBom(fs.readFileSync(file, "utf8")));
    const ok = same(written.ambient, AMBIENT) && Object.keys(r.before).every(k => same(r.before[k], written[k]));
    console.log(`${ok ? "WROTE" : "WRITTEN BUT CHECK FAILED"} ${file}: "ambient" added (${r.out.length - text.length} bytes); ${Object.keys(r.before).length} other keys unchanged: ${ok}`);
    process.exit(ok ? 0 : 1);
}
console.error("the file kept changing; nothing written");
process.exit(1);
