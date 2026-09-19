// Adds the "speech" section (UF_Speech, VISION V62) to data/UF_WorldCatalog.json (written 2026-09-19).
// Text-based and layout-preserving: the catalog is re-read immediately before it is written, the section is appended
// as the last top-level key, and the result is parsed and compared: every other top-level key must be unchanged
// (same value, same order) or nothing is written. Other engineers edit other sections at the same time.
// Usage: "C:\Program Files\nodejs\node.exe" tools/add_speech_catalog.js [--game <game folder>] [--check] [--replace]
//   --game     the game folder whose data/UF_WorldCatalog.json is edited (default: game/ next to tools/)
//   --check    only report what would change; write nothing
//   --replace  when a different "speech" section is already there, replace it (default: leave it and report)
// Exit code: 0 done (or already there), 1 the file could not be edited safely.
"use strict";
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const gameIdx = args.indexOf("--game");
const gameDir = path.resolve(gameIdx >= 0 ? args[gameIdx + 1] : path.join(__dirname, "..", "game"));
const checkOnly = args.includes("--check");
const replace = args.includes("--replace");
const file = path.join(gameDir, "data", "UF_WorldCatalog.json");

const SPEECH = {
    about: "Over-head speech (UF_Speech, VISION V62; added 2026-09-19): remarks, barks, shouts, orders and thoughts float as plain text above the speaker's head, follow them and fade; no bubble, no box. Text is the game font at fontSize px with an outline of outlineWidth (RMMZ's canvas stroke width, centred on the letter edge) in outlineColor, rows lineHeight px apart, at most maxChars characters a row and maxLines rows a line; longer text becomes consecutive lines by the same speaker, in order. A line lasts framesBase + framesPerChar x its characters frames (at most framesMax) unless the caller gives frames; frames are 1/60 s at every game speed and stop while the game is paused. fadeIn/fadeOut: frames. gap: px between the head and the text; spacing: px kept between two lines that would overlap (the later line moves up). maxOnScreen: lines shown at once (the oldest bark gives way first, else the oldest line); maxQueue: lines one speaker keeps waiting. minZoom: below this map zoom no text is shown (the text keeps its screen size at every zoom). headDefault: px above the feet when a speaker's sprite size is unknown. routeBarks: UF_Visuals' barks are drawn by UF_Speech (false = UF_Visuals' own bubble, which fails in this NW.js build for want of the canvas roundRect, so no bark shows). kinds: colour per kind, optional bold/italic. Owner: Claude Code.",
    enabled: true,
    routeBarks: true,
    fontSize: 18,
    lineHeight: 21,
    outlineColor: "rgba(0, 0, 0, 0.9)",
    outlineWidth: 3,
    maxChars: 22,
    maxLines: 3,
    framesBase: 90,
    framesPerChar: 4,
    framesMax: 480,
    fadeIn: 6,
    fadeOut: 20,
    gap: 4,
    spacing: 2,
    maxOnScreen: 12,
    maxQueue: 6,
    minZoom: 0.3,
    headDefault: 48,
    kinds: {
        remark: { color: "#f4f0e2" },
        bark: { color: "#ffe39f" },
        shout: { color: "#ff9d85", bold: true },
        order: { color: "#a9d7ff" },
        thought: { color: "#cdc6ea", italic: true }
    }
};

// One line per field, the kinds one per line, spaced like the neighbouring sections ({ "a": 1, "b": 2 }).
const inline = v => JSON.stringify(v).replace(/":/g, '": ').replace(/,"/g, ', "').replace(/^\{"/, '{ "').replace(/\}$/, " }");
function block() {
    const out = ['  "speech": {'];
    const keys = Object.keys(SPEECH);
    keys.forEach((k, i) => {
        const last = i === keys.length - 1;
        if (k === "kinds") {
            out.push('    "kinds": {');
            const kinds = Object.keys(SPEECH.kinds);
            kinds.forEach((n, j) => out.push(`      ${JSON.stringify(n)}: ${inline(SPEECH.kinds[n])}${j < kinds.length - 1 ? "," : ""}`));
            out.push(`    }${last ? "" : ","}`);
        } else {
            out.push(`    ${JSON.stringify(k)}: ${JSON.stringify(SPEECH[k])}${last ? "" : ","}`);
        }
    });
    out.push("  }");
    return out;
}

function build(raw) {
    const catalog = JSON.parse(raw);
    if (catalog.speech !== undefined) {
        if (JSON.stringify(catalog.speech) === JSON.stringify(SPEECH)) return { text: null, note: "speech: already there, unchanged" };
        if (!replace) return { text: null, note: "speech: a different section is already there (run with --replace to overwrite it); nothing written" };
    }
    const eol = raw.includes("\r\n") ? "\r\n" : "\n";
    const lines = raw.split(/\r?\n/);
    let text;
    if (catalog.speech !== undefined) {
        // Replace the existing section's lines: from '  "speech": {' to its closing '  }' at 2-space indent.
        const start = lines.findIndex(l => /^  "speech": \{/.test(l));
        if (start < 0) throw new Error('a "speech" key exists but not as a 2-space-indented block');
        let end = -1;
        for (let i = start + 1; i < lines.length; i++) if (/^  \},?\s*$/.test(lines[i])) { end = i; break; }
        if (end < 0) throw new Error("no closing line for the speech section");
        const comma = /,\s*$/.test(lines[end]);
        const b = block();
        if (comma) b[b.length - 1] += ",";
        lines.splice(start, end - start + 1, ...b);
        text = lines.join(eol);
    } else {
        // Append as the last top-level key: the file ends with '}' (and maybe a newline); the line before closes the last key.
        let close = lines.length - 1;
        while (close >= 0 && lines[close].trim() === "") close--;
        if (lines[close] !== "}") throw new Error(`the last line is not "}": ${JSON.stringify(lines[close])}`);
        let prev = close - 1;
        while (prev >= 0 && lines[prev].trim() === "") prev--;
        if (!/^  [\]}]\s*$/.test(lines[prev]) && !/^  "[^"]+": .*[^,]\s*$/.test(lines[prev])) throw new Error(`unexpected line before the closing brace: ${lines[prev].slice(0, 80)}`);
        lines[prev] = lines[prev].replace(/\s*$/, ",");
        lines.splice(close, 0, ...block());
        text = lines.join(eol);
    }
    // Everything else must be exactly as it was.
    const after = JSON.parse(text);
    const beforeKeys = Object.keys(catalog).filter(k => k !== "speech");
    const afterKeys = Object.keys(after).filter(k => k !== "speech");
    if (beforeKeys.join("\u0000") !== afterKeys.join("\u0000")) throw new Error("the other top-level keys changed order or set");
    for (const k of beforeKeys) if (JSON.stringify(after[k]) !== JSON.stringify(catalog[k])) throw new Error(`top-level key "${k}" would change`);
    if (JSON.stringify(after.speech) !== JSON.stringify(SPEECH)) throw new Error("the written speech section does not read back as intended");
    return { text, note: `speech: ${catalog.speech !== undefined ? "replaced" : "added"} (${block().length} lines); ${beforeKeys.length} other keys unchanged` };
}

function main() {
    const raw = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
    const r = build(raw);
    console.log(`${file}: ${r.note}`);
    if (!r.text || checkOnly) return 0;
    // Re-read right before writing: if anyone changed the file meanwhile, build again from their version.
    const now = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
    const final = now === raw ? r : build(now);
    if (!final.text) return 0;
    fs.writeFileSync(file, final.text);
    const check = JSON.parse(fs.readFileSync(file, "utf8"));
    if (JSON.stringify(check.speech) !== JSON.stringify(SPEECH)) throw new Error("read-back after writing does not match");
    console.log("written and read back");
    return 0;
}

try {
    process.exit(main());
} catch (e) {
    console.error(`add_speech_catalog: ${e.message}; nothing written`);
    process.exit(1);
}
