// Adds the V57 door objects and the cultures' door choice to data/UF_WorldCatalog.json (written 2026-09-18 night).
// Text-based: the catalog is re-read immediately before it is written back whole, and only these keys change:
//   objects[]: door_wood, door_stone (appended at the end of the array, one line each like their neighbours)
//   cultures[<species>].door = "door_wood" | "door_stone" (matching the culture's wall material)
// Every other byte of the file stays as it was (other engineers edit other sections at the same time).
// Usage: "C:\Program Files\nodejs\node.exe" tools/add_doors_catalog.js [--game <game folder>] [--check]
//   --game   the game folder whose data/UF_WorldCatalog.json is edited (default: game/ next to tools/)
//   --check  only report what would change; write nothing
// Exit code: 0 done (or already there), 1 the file could not be edited safely.
"use strict";
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const gameIdx = args.indexOf("--game");
const gameDir = path.resolve(gameIdx >= 0 ? args[gameIdx + 1] : path.join(__dirname, "..", "game"));
const checkOnly = args.includes("--check");
const file = path.join(gameDir, "data", "UF_WorldCatalog.json");

const DOORS = [
    { id: "door_wood", name: "Wooden door", image: "!Door1", characterIndex: 0, passable: false, tags: ["building", "door", "wood"],
        build: { items: { log: 1 }, work: 4 }, door: { material: "wood", hp: 20 }, ruin: "rubble" },
    // !Door2 is the RTP magic-circle sheet, not a door sheet.  Until AR-300
    // supplies original stone-door art, reuse !Door1 with a cool tint.
    { id: "door_stone", name: "Stone door", image: "!Door1", characterIndex: 0, tint: "#b8c0c8", passable: false, tags: ["building", "door", "stone"],
        build: { items: { stone: 2 }, work: 4 }, door: { material: "stone", hp: 40 }, ruin: "rubble" }
];
const doorFor = (wallId, objectsById) => {
    const wall = objectsById.get(wallId);
    const tags = (wall && wall.tags) || [];
    return tags.includes("stone") || /stone/.test(String(wallId)) ? "door_stone" : "door_wood";
};

function main() {
    const raw = fs.readFileSync(file, "utf8"); // re-read right before writing: nothing older is used
    const catalog = JSON.parse(raw);
    if (!Array.isArray(catalog.objects) || !catalog.cultures) throw new Error("the catalog has no objects list or cultures");
    const byId = new Map(catalog.objects.map(o => [o.id, o]));
    const lines = raw.split("\n");
    const changes = [];

    // 1. objects: append the doors before the line that closes the array ("  ],").
    const start = lines.findIndex(l => /^  "objects": \[/.test(l));
    if (start < 0) throw new Error('no "objects": [ line at 2-space indent');
    let end = -1;
    for (let i = start + 1; i < lines.length; i++) if (/^  \],?\s*$/.test(lines[i])) { end = i; break; }
    if (end < 0) throw new Error("no closing line for the objects array");
    const missing = DOORS.filter(d => !byId.has(d.id));
    if (missing.length) {
        let last = end - 1;
        while (last > start && lines[last].trim() === "") last--;
        if (!/\}\s*,?\s*$/.test(lines[last])) throw new Error(`the last objects line is not an entry: ${lines[last].slice(0, 80)}`);
        if (!/,\s*$/.test(lines[last])) lines[last] = lines[last].replace(/\s*$/, ",");
        const added = missing.map((d, i) => `    ${JSON.stringify(d).replace(/,"/g, ', "').replace(/":/g, '": ').replace(/\{"/g, '{ "').replace(/\}/g, " }").replace(/\[\"/g, '["')}${i < missing.length - 1 ? "," : ""}`);
        lines.splice(last + 1, 0, ...added);
        changes.push(`objects: + ${missing.map(d => d.id).join(", ")}`);
        // the array's closing line moved down by the number of lines added
        end += added.length;
    }

    // 2. cultures: one line per species; add "door" after "laterWall" (or after "wall").
    const cStart = lines.findIndex(l => /^  "cultures": \{/.test(l));
    if (cStart < 0) throw new Error('no "cultures": { line');
    let cEnd = -1;
    for (let i = cStart + 1; i < lines.length; i++) if (/^  \},?\s*$/.test(lines[i])) { cEnd = i; break; }
    if (cEnd < 0) throw new Error("no closing line for cultures");
    for (let i = cStart + 1; i < cEnd; i++) {
        const m = lines[i].match(/^    "([a-z_]+)": \{ (.*)$/);
        if (!m || m[1] === "about") continue;
        const species = m[1];
        const culture = catalog.cultures[species];
        if (!culture || typeof culture !== "object") continue;
        if (culture.door) continue;
        const door = doorFor(culture.wall, byId);
        const anchor = lines[i].includes('"laterWall": ') ? /("laterWall": "[^"]*")/ : /("wall": "[^"]*")/;
        if (!anchor.test(lines[i])) throw new Error(`cultures.${species}: no wall field on its line`);
        lines[i] = lines[i].replace(anchor, `$1, "door": "${door}"`);
        changes.push(`cultures.${species}.door = ${door}`);
    }

    if (!changes.length) {
        console.log(`${file}: doors already present, nothing to do`);
        return;
    }
    const out = lines.join("\n");
    // The result must parse, and differ from the original only in the keys named above.
    const after = JSON.parse(out);
    const before = catalog;
    for (const key of Object.keys(before)) {
        if (key === "objects" || key === "cultures") continue;
        if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) throw new Error(`section "${key}" changed unexpectedly`);
    }
    if (JSON.stringify(after.objects.slice(0, before.objects.length)) !== JSON.stringify(before.objects)) throw new Error("existing objects changed");
    for (const sp of Object.keys(before.cultures)) {
        const b = Object.assign({}, before.cultures[sp]), a = Object.assign({}, after.cultures[sp]);
        if (typeof a === "object" && a) delete a.door;
        if (typeof b === "object" && b) delete b.door;
        if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`cultures.${sp} changed beyond door`);
    }
    for (const d of DOORS) if (!after.objects.some(o => o.id === d.id)) throw new Error(`${d.id} missing after the edit`);
    for (const line of changes) console.log(line);
    if (checkOnly) {
        console.log("(check only: nothing written)");
        return;
    }
    fs.writeFileSync(file, out);
    console.log(`written: ${file} (${raw.length} -> ${out.length} bytes)`);
}

try {
    main();
} catch (e) {
    console.error(`add_doors_catalog: ${e.message}`);
    process.exit(1);
}
