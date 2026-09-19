// Adds V56 floor ground kinds and each culture's preferred floor recipe.
// The file is re-read immediately before writing. Only groundKinds[] and
// cultures.<species>.floor are changed; --check never writes.
// Usage: node tools/add_floors_catalog.js [--game <game folder>] [--check]
"use strict";
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const gameIdx = args.indexOf("--game");
const gameDir = path.resolve(gameIdx >= 0 ? args[gameIdx + 1] : path.join(__dirname, "..", "game"));
const checkOnly = args.includes("--check");
const file = path.join(gameDir, "data", "UF_WorldCatalog.json");

const KINDS = [
    { id: "floor_wood", name: "Plank floor", pattern: "planks", colors: ["#9b6a3c", "#724826", "#bc8650", "#50311d"], edge: "#3a2416" },
    { id: "floor_stone", name: "Flagstone floor", pattern: "cracks", colors: ["#8e8e88", "#696965", "#aaa9a2", "#4b4b48"], edge: "#393936" },
    { id: "floor_rushes", name: "Rush floor", pattern: "needles", colors: ["#b49a58", "#806d3d", "#d1b96f", "#5f512d"], edge: "#493e24" }
];
const FLOOR = {
    human: { kind: "floor_wood", item: "log", count: 1 },
    elf: { kind: "floor_wood", item: "log", count: 1 },
    dwarf: { kind: "floor_stone", item: "stone", count: 1 },
    gnome: { kind: "floor_stone", item: "stone", count: 1 },
    goblin: { kind: "floor_rushes", item: "straw", count: 2 },
    orc: { kind: "floor_rushes", item: "straw", count: 2 },
    automaton: { kind: "floor_stone", item: "stone", count: 1 }
};

function main() {
    const raw = fs.readFileSync(file, "utf8");
    const before = JSON.parse(raw);
    if (!Array.isArray(before.groundKinds) || !before.cultures) throw new Error("the catalog has no groundKinds list or cultures");
    const lines = raw.split("\n");
    const changes = [];

    const start = lines.findIndex(l => /^  "groundKinds": \[/.test(l));
    if (start < 0) throw new Error('no "groundKinds": [ line');
    let end = -1;
    for (let i = start + 1; i < lines.length; i++) if (/^  \],?\s*$/.test(lines[i])) { end = i; break; }
    if (end < 0) throw new Error("no closing line for groundKinds");
    const have = new Set(before.groundKinds.map(k => k.id));
    const missing = KINDS.filter(k => !have.has(k.id));
    if (missing.length) {
        let last = end - 1;
        while (last > start && lines[last].trim() === "") last--;
        if (!/\}\s*,?\s*$/.test(lines[last])) throw new Error("the last groundKinds line is not an entry");
        if (!/,\s*$/.test(lines[last])) lines[last] = lines[last].replace(/\s*$/, ",");
        const added = missing.map((k, i) => `    ${JSON.stringify(k)}${i < missing.length - 1 ? "," : ""}`);
        lines.splice(last + 1, 0, ...added);
        changes.push(`groundKinds: + ${missing.map(k => k.id).join(", ")}`);
    }

    const cStart = lines.findIndex(l => /^  "cultures": \{/.test(l));
    if (cStart < 0) throw new Error('no "cultures": { line');
    let cEnd = -1;
    for (let i = cStart + 1; i < lines.length; i++) if (/^  \},?\s*$/.test(lines[i])) { cEnd = i; break; }
    if (cEnd < 0) throw new Error("no closing line for cultures");
    for (let i = cStart + 1; i < cEnd; i++) {
        const m = lines[i].match(/^    "([a-z_]+)": \{ /);
        if (!m || !FLOOR[m[1]] || before.cultures[m[1]].floor) continue;
        const anchor = lines[i].includes('"door": ') ? /("door": "[^"]*")/ : lines[i].includes('"laterWall": ') ? /("laterWall": "[^"]*")/ : /("wall": "[^"]*")/;
        if (!anchor.test(lines[i])) throw new Error(`cultures.${m[1]}: no insertion anchor`);
        lines[i] = lines[i].replace(anchor, `$1, "floor": ${JSON.stringify(FLOOR[m[1]])}`);
        changes.push(`cultures.${m[1]}.floor = ${FLOOR[m[1]].kind}`);
    }

    if (!changes.length) { console.log(`${file}: floors already present, nothing to do`); return; }
    const out = lines.join("\n");
    const after = JSON.parse(out);
    for (const key of Object.keys(before)) {
        if (key === "groundKinds" || key === "cultures") continue;
        if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) throw new Error(`section "${key}" changed unexpectedly`);
    }
    if (JSON.stringify(after.groundKinds.slice(0, before.groundKinds.length)) !== JSON.stringify(before.groundKinds)) throw new Error("existing groundKinds changed");
    for (const sp of Object.keys(before.cultures)) {
        const b = Object.assign({}, before.cultures[sp]), a = Object.assign({}, after.cultures[sp]);
        if (a && typeof a === "object") delete a.floor;
        if (b && typeof b === "object") delete b.floor;
        if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`cultures.${sp} changed beyond floor`);
    }
    for (const k of KINDS) if (!after.groundKinds.some(x => x.id === k.id)) throw new Error(`${k.id} missing after edit`);
    for (const line of changes) console.log(line);
    if (checkOnly) { console.log("(check only: nothing written)"); return; }
    fs.writeFileSync(file, out);
    console.log(`written: ${file} (${raw.length} -> ${out.length} bytes)`);
}

try { main(); } catch (e) { console.error(`add_floors_catalog: ${e.message}`); process.exit(1); }
