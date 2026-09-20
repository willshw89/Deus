// Adds the "select" key to the world catalog: UF_Select's tools, keys, limits, per-frame budgets and colours
// (VISION V86, docs/design/SELECTION.md §12; written by Claude Code 2026-09-19).
// Layout-preserving: the new block is inserted as text before the root object's closing brace and nothing else in the
// file changes. The file is re-read immediately before writing (and the insert recomputed if it changed meanwhile),
// and the result must parse with every other top-level key exactly as it was, in the same order, plus "select".
// An existing "select" key is left alone (the script reports whether it matches).
// Usage: node tools/add_select_catalog.js [--game <game folder>] [--check]
"use strict";
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const gameIdx = args.indexOf("--game");
const gameDir = path.resolve(gameIdx >= 0 ? args[gameIdx + 1] : path.join(__dirname, "..", "game"));
const checkOnly = args.includes("--check");
const file = path.join(gameDir, "data", "UF_WorldCatalog.json");
const KEY = "select";

const SELECT = {
    about: "Drag selection and area tools (UF_Select; docs/design/SELECTION.md, VISION V86). tools: one per toolbar button and key, in toolbar order; options = the UF_Interact menu option id the tool runs on each cell (build:<wall> = the wall chosen in the picker); job (+ object) = the job it makes, for the already-marked test; candidates = the cheap per-cell test (objectAction, openLand, built, floorable, designations); zone = the zone kind the tool also records. Labels and hints are player text (plain verbs). limits.openMarks caps the player's open designations from any source (UF_Jobs sorts and copies its whole list); budgets are milliseconds of UF_Select work per frame for the preview count and for marking. Owner: Claude Code.",
    limits: { openMarks: 2000, formationRadius: 12, stripNames: 12 },
    budgets: { previewMs: 2, commitMs: 3, minCellsPerFrame: 16 },
    summarySeconds: 6,
    colors: { box: "#f8fafc", boxFill: 0.1, selectFill: 0.08, eligible: 0.35, zones: { stockpile: "#86efac" }, zoneAlpha: 0.25 },
    tools: [
        { id: "chop", key: "C", label: "Chop", options: ["action:chop"], job: "chop", candidates: "objectAction", color: "#f5c542", hint: "Chop: drag over trees." },
        { id: "gather", key: "G", label: "Gather", options: ["action:gather"], job: "gather", candidates: "objectAction", color: "#a3e635", hint: "Gather: drag over bushes and plants." },
        { id: "pick", key: "P", label: "Pick up", options: ["action:pick"], job: "pick", candidates: "objectAction", color: "#e5e7eb", hint: "Pick up: drag over loose stones and sticks." },
        { id: "mine", key: "M", label: "Mine", options: ["action:mine"], job: "mine", candidates: "objectAction", color: "#fb923c", hint: "Mine: drag over rock and ore." },
        { id: "quarry", key: "R", label: "Quarry", options: ["action:quarry"], job: "quarry", candidates: "objectAction", color: "#d6d3d1", hint: "Quarry: drag over stone." },
        { id: "dig", key: "V", label: "Dig", options: ["dig"], job: "dig", candidates: "openLand", color: "#c08a4a", hint: "Dig: drag over ground." },
        { id: "dismantle", key: "T", label: "Dismantle", options: ["dismantle"], job: "dismantle", candidates: "built", color: "#f87171", hint: "Dismantle: drag over buildings." },
        { id: "floor", key: "L", label: "Build floor", options: ["floor:lay"], job: "floor", candidates: "floorable", color: "#d4a373", hint: "Build floor: drag over ground." },
        { id: "wall", key: "B", label: "Build wall", options: ["build:<wall>"], job: "build", candidates: "openLand", picker: "wall", color: "#38bdf8", hint: "Build wall: drag where the walls go." },
        { id: "stockpile", key: "O", label: "Mark stockpile", options: ["stockpile"], job: "build", object: "stockpile", candidates: "openLand", zone: "stockpile", color: "#86efac", hint: "Mark stockpile: drag over free ground." },
        { id: "cancel", key: "N", label: "Cancel", options: ["cancel"], candidates: "designations", color: "#ef4444", hint: "Cancel: drag over marked work." }
    ],
    zones: { stockpile: { label: "Stockpile", option: "stockpile" } }
};

// One line per value inside a block, in the file's style: { "k": v, ... } and [a, b].
const inline = v => (Array.isArray(v) ? `[${v.map(inline).join(", ")}]`
    : v && typeof v === "object" ? `{ ${Object.keys(v).map(k => `${JSON.stringify(k)}: ${inline(v[k])}`).join(", ")} }`
        : JSON.stringify(v));
function block() {
    const lines = [`  ${JSON.stringify(KEY)}: {`];
    const keys = Object.keys(SELECT);
    keys.forEach((k, i) => {
        const last = i === keys.length - 1;
        if (k === "tools") {
            lines.push('    "tools": [');
            SELECT.tools.forEach((t, j) => lines.push(`      ${inline(t)}${j < SELECT.tools.length - 1 ? "," : ""}`));
            lines.push(`    ]${last ? "" : ","}`);
        } else {
            lines.push(`    ${JSON.stringify(k)}: ${inline(SELECT[k])}${last ? "" : ","}`);
        }
    });
    lines.push("  }");
    return lines.join("\n");
}

// The new text, or null when the key is already there. Throws when the file isn't what's expected.
function insert(raw) {
    const before = JSON.parse(raw);
    if (!before || typeof before !== "object" || Array.isArray(before)) throw new Error("the catalog is not a JSON object");
    if (Object.prototype.hasOwnProperty.call(before, KEY)) return { out: null, before };
    const end = raw.lastIndexOf("}");
    if (end < 0) throw new Error("no closing brace");
    let i = end - 1;
    while (i >= 0 && /\s/.test(raw[i])) i--;
    if (raw[i] !== "}" && raw[i] !== "]" && raw[i] !== '"' && !/[0-9a-z]/.test(raw[i])) throw new Error(`unexpected text before the closing brace: ${JSON.stringify(raw.slice(Math.max(0, i - 20), end + 1))}`);
    const out = raw.slice(0, i + 1) + ",\n" + block() + raw.slice(i + 1);
    const after = JSON.parse(out);
    const kb = Object.keys(before), ka = Object.keys(after);
    const orderOk = ka.length === kb.length + 1 && kb.every((k, n) => ka[n] === k) && ka[ka.length - 1] === KEY;
    const changed = kb.filter(k => JSON.stringify(after[k]) !== JSON.stringify(before[k]));
    if (!orderOk || changed.length) throw new Error(`verification failed: key order ok ${orderOk}; changed keys: ${changed.join(", ") || "none"}`);
    if (JSON.stringify(after[KEY]) !== JSON.stringify(SELECT)) throw new Error(`the written ${KEY} block doesn't parse back to the intended value`);
    if (!out.startsWith(raw.slice(0, i + 1)) || !out.endsWith(raw.slice(i + 1))) throw new Error("the insert touched text outside its place");
    return { out, before };
}

function main() {
    let raw = fs.readFileSync(file, "utf8");
    let r = insert(raw);
    if (!r.out) {
        const same = JSON.stringify(r.before[KEY]) === JSON.stringify(SELECT);
        console.log(`${file}: "${KEY}" is already there (${same ? "identical to this script's block" : "DIFFERENT from this script's block; left as it is"}). Nothing written.`);
        return 0;
    }
    if (checkOnly) {
        console.log(`${file}: would insert ${block().split("\n").length} lines ("${KEY}") before the closing brace; every other key verified unchanged. --check: nothing written.`);
        return 0;
    }
    // Re-read right before writing: another agent may have saved the file since it was read.
    for (let attempt = 0; attempt < 3; attempt++) {
        const now = fs.readFileSync(file, "utf8");
        if (now !== raw) {
            raw = now;
            r = insert(raw);
            if (!r.out) {
                console.log(`${file}: "${KEY}" appeared meanwhile; nothing written.`);
                return 0;
            }
            continue;
        }
        const tmp = `${file}.${KEY}_tmp`;
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
        console.log(`${file}: inserted "${KEY}" (${block().split("\n").length} lines, ${r.out.length - raw.length} bytes); every other top-level key re-read and unchanged: ${kept}.`);
        return kept ? 0 : 1;
    }
    throw new Error("the file kept changing while this script tried to write it; nothing written");
}

try {
    process.exit(main());
} catch (e) {
    console.error(`add_select_catalog: ${e.message}`);
    process.exit(2);
}
