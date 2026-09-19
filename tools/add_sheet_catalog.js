// Adds the "sheet" key to the world catalog: UF_Sheet's inventory grid size, equipment slots and placeholder faces
// (VISION V59, V49; written by Claude Code 2026-09-19).
// Layout-preserving: the new block is inserted as text before the root object's closing brace and nothing else in the
// file changes. The file is re-read immediately before writing (and the insert recomputed if it changed meanwhile),
// and the result must parse with every other top-level key exactly as it was, in the same order, plus "sheet".
// An existing "sheet" key is left alone (the script reports whether it matches).
// Usage: node tools/add_sheet_catalog.js [--game <game folder>] [--check]
"use strict";
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const gameIdx = args.indexOf("--game");
const gameDir = path.resolve(gameIdx >= 0 ? args[gameIdx + 1] : path.join(__dirname, "..", "game"));
const checkOnly = args.includes("--check");
const file = path.join(gameDir, "data", "UF_WorldCatalog.json");

const SHEET = {
    about: "The selection panel (UF_Sheet; VISION V59, V49; user 2026-09-19). grid: the inventory grid, columns x rows of slot x slot px. slots: the equipment slots in order. slotAliases: older unit.data.equipment keys shown in a slot until every reader moves to the five slots (tool = weapon, clothes = torso). faces: placeholder portraits per species id (people and wildlife) and gender key (male, female, <stage>_<gender> such as elder_male, any) as [faceSheet, index] pairs from img/faces (stock RPG Maker sheets, 4 columns x 2 rows of 144x144) until AR-700; the pick is stable per unit (unit id modulo the list); a species with no usable entry gets the code-drawn UF_GenFace silhouette. unit.data.face { sheet, index } overrides. Owner: Claude Code.",
    grid: { columns: 8, rows: 4, slot: 36 },
    slots: ["head", "weapon", "shield", "torso", "legs"],
    slotAliases: { tool: "weapon", clothes: "torso" },
    faces: {
        human: { male: [["People1", 0], ["People1", 2], ["People1", 4]], female: [["People1", 1], ["People1", 3], ["People1", 5]], elder_male: [["People1", 6]], elder_female: [["People1", 7]] },
        elf: { male: [["Nature", 5]], female: [["Nature", 6]] },
        dwarf: { male: [["People2", 4], ["People3", 4]], female: [["People2", 7]] },
        gnome: { male: [["People4", 4]], female: [["People4", 7]] },
        automaton: { any: [["Evil", 6]] },
        wolf: { any: [["Monster", 2]] },
        fox: { any: [["Nature", 3]] },
        arctic_fox: { any: [["Monster", 4]] },
        jackal: { any: [["Nature", 0]] },
        boar: { any: [["Nature", 2]] },
        wildcat: { any: [["Nature", 1]] },
        restless_dead: { any: [["Monster", 6]] }
    }
};

// One line per value inside a block, in the file's style: { "k": v, ... } and [a, b].
const inline = v => (Array.isArray(v) ? `[${v.map(inline).join(", ")}]`
    : v && typeof v === "object" ? `{ ${Object.keys(v).map(k => `${JSON.stringify(k)}: ${inline(v[k])}`).join(", ")} }`
        : JSON.stringify(v));
function block() {
    const lines = ['  "sheet": {'];
    const keys = Object.keys(SHEET);
    keys.forEach((k, i) => {
        const last = i === keys.length - 1;
        if (k === "faces") {
            lines.push('    "faces": {');
            const sp = Object.keys(SHEET.faces);
            sp.forEach((s, j) => lines.push(`      ${JSON.stringify(s)}: ${inline(SHEET.faces[s])}${j < sp.length - 1 ? "," : ""}`));
            lines.push(`    }${last ? "" : ","}`);
        } else {
            lines.push(`    ${JSON.stringify(k)}: ${inline(SHEET[k])}${last ? "" : ","}`);
        }
    });
    lines.push("  }");
    return lines.join("\n");
}

// The new text, or null when "sheet" is already there. Throws when the file isn't what's expected.
function insert(raw) {
    const before = JSON.parse(raw);
    if (!before || typeof before !== "object" || Array.isArray(before)) throw new Error("the catalog is not a JSON object");
    if (Object.prototype.hasOwnProperty.call(before, "sheet")) return { out: null, before };
    const end = raw.lastIndexOf("}");
    if (end < 0) throw new Error("no closing brace");
    let i = end - 1;
    while (i >= 0 && /\s/.test(raw[i])) i--;
    if (raw[i] !== "}" && raw[i] !== "]" && raw[i] !== '"' && !/[0-9a-z]/.test(raw[i])) throw new Error(`unexpected text before the closing brace: ${JSON.stringify(raw.slice(Math.max(0, i - 20), end + 1))}`);
    const out = raw.slice(0, i + 1) + ",\n" + block() + raw.slice(i + 1);
    const after = JSON.parse(out);
    const kb = Object.keys(before), ka = Object.keys(after);
    const orderOk = ka.length === kb.length + 1 && kb.every((k, n) => ka[n] === k) && ka[ka.length - 1] === "sheet";
    const changed = kb.filter(k => JSON.stringify(after[k]) !== JSON.stringify(before[k]));
    if (!orderOk || changed.length) throw new Error(`verification failed: key order ok ${orderOk}; changed keys: ${changed.join(", ") || "none"}`);
    if (JSON.stringify(after.sheet) !== JSON.stringify(SHEET)) throw new Error("the written sheet block doesn't parse back to the intended value");
    if (!out.startsWith(raw.slice(0, i + 1)) || !out.endsWith(raw.slice(i + 1))) throw new Error("the insert touched text outside its place");
    return { out, before };
}

function main() {
    let raw = fs.readFileSync(file, "utf8");
    let r = insert(raw);
    if (!r.out) {
        const same = JSON.stringify(r.before.sheet) === JSON.stringify(SHEET);
        console.log(`${file}: "sheet" is already there (${same ? "identical to this script's block" : "DIFFERENT from this script's block; left as it is"}). Nothing written.`);
        return 0;
    }
    if (checkOnly) {
        console.log(`${file}: would insert ${block().split("\n").length} lines ("sheet") before the closing brace; every other key verified unchanged. --check: nothing written.`);
        return 0;
    }
    // Re-read right before writing: another agent may have saved the file since it was read.
    for (let attempt = 0; attempt < 3; attempt++) {
        const now = fs.readFileSync(file, "utf8");
        if (now !== raw) {
            raw = now;
            r = insert(raw);
            if (!r.out) {
                console.log(`${file}: "sheet" appeared meanwhile; nothing written.`);
                return 0;
            }
            continue;
        }
        const tmp = `${file}.sheet_tmp`;
        fs.writeFileSync(tmp, r.out);
        const last = fs.readFileSync(file, "utf8");
        if (last !== raw) { // changed between the check and the write: start over
            fs.rmSync(tmp, { force: true });
            raw = last;
            r = insert(raw);
            if (!r.out) return 0;
            continue;
        }
        fs.renameSync(tmp, file);
        const written = fs.readFileSync(file, "utf8");
        if (written !== r.out) throw new Error("the file on disk differs from what was written");
        const after = JSON.parse(written);
        const kept = Object.keys(r.before).every(k => JSON.stringify(after[k]) === JSON.stringify(r.before[k]));
        console.log(`${file}: inserted "sheet" (${block().split("\n").length} lines, ${r.out.length - raw.length} bytes); every other top-level key re-read and unchanged: ${kept}.`);
        return kept ? 0 : 1;
    }
    throw new Error("the file kept changing while this script tried to write it; nothing written");
}

try {
    process.exit(main());
} catch (e) {
    console.error(`add_sheet_catalog: ${e.message}`);
    process.exit(2);
}
