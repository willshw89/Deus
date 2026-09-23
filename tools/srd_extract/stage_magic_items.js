// tools/srd_extract/stage_magic_items.js - SRD 5.1 Magic Items chapter (pages 206-253) -> staging_magic_items.json
//
// Usage: node tools/srd_extract/stage_magic_items.js
// Reads the page cache written by extract_pages.js (cache/page_NNN.layout.txt for structure,
// cache/page_NNN.txt for the prose cross-check) and writes staging/staging_magic_items.json in the
// shape given by docs/SRD5_1_COVERAGE_MANIFEST.md section 6. Exit 1 when any self-check fails.
//
// Entries: one magic-item per item heading (category "magic-items"), and one `rule` per chapter
// heading (category "rules") for the introductory rules (attunement, wearing and wielding, activating,
// charges, ...), the sentient-item rules and the Artifacts heading.
//
// How the chapter is read. The layout pages are split into columns (left column, then right) and
// concatenated into one stream. An item starts at a name line (one or two short lines) followed by a
// blank line and a type/rarity line such as "Wondrous item, rare (requires attunement)"; the type line
// may wrap onto a second line. Everything up to the next item or chapter heading is the item's body,
// unwrapped into paragraphs; tables inside the body are recognised by a header line (a "dNN" column or
// two or more title cells) and read row by row. A table whose rows the layout scrambled (a wrapped
// cell printed on the wrong row, a lowercase fragment where a row should begin) keeps its raw lines
// in `text` and is left with `rows: []` and a note, never re-paired by guesswork.
"use strict";

const fs = require("fs");
const path = require("path");
const T = require("./lib/srd_text");

const CACHE = path.join(__dirname, "cache");
const OUT_DIR = path.join(__dirname, "staging");
const OUT = path.join(OUT_DIR, "staging_magic_items.json");
const CATEGORY = "magic-items";
const SECTION = "Magic Items";
const PAGES = [206, 253];
const EXPECTED = { "magic-item": [243, 3] };

/** Chapter headings that are rules, with the page they stand on and their parents in the heading path. */
const HEADINGS = [
    ["Magic Items", 206, []],
    ["Attunement", 206, []],
    ["Wearing and Wielding Items", 206, []],
    ["Multiple Items of the Same Kind", 206, ["Wearing and Wielding Items"]],
    ["Paired Items", 206, ["Wearing and Wielding Items"]],
    ["Activating an Item", 206, []],
    ["Command Word", 207, ["Activating an Item"]],
    ["Consumables", 207, ["Activating an Item"]],
    ["Spells", 207, ["Activating an Item"]],
    ["Charges", 207, ["Activating an Item"]],
    ["Magic Items A-Z", 207, []],
    ["Sentient Magic Items", 251, []],
    ["Creating Sentient Magic Items", 251, ["Sentient Magic Items"]],
    ["Abilities", 251, ["Sentient Magic Items", "Creating Sentient Magic Items"]],
    ["Communication", 251, ["Sentient Magic Items", "Creating Sentient Magic Items"]],
    ["Senses", 251, ["Sentient Magic Items", "Creating Sentient Magic Items"]],
    ["Alignment", 251, ["Sentient Magic Items", "Creating Sentient Magic Items"]],
    ["Special Purpose", 251, ["Sentient Magic Items", "Creating Sentient Magic Items"]],
    ["Conflict", 252, ["Sentient Magic Items"]],
    ["Artifacts", 252, []]
];

const TYPE_RE = /^(Armor|Weapon|Wondrous item|Potion|Ring|Rod|Scroll|Staff|Wand)(?:\s*\(([^)]*)\))?,\s*(.*)$/;
const RARITY_RE = /\b(very rare|uncommon|common|rare|legendary|artifact)\b(?:\s*\(([^)]*)\))?/g;
const DIE_HEADER_RE = /^d(4|6|8|10|12|20|100)\b/;
const DIE_RESULT_RE = /^(00|\d{1,3}(?:[\u2013\u2014-]\d{1,3})?|\d{1,3}r\d{1,3})(?=\s|$)/; // "1r50": the source prints an en dash as "r" on page 228

// ---------------------------------------------------------------- cache access and columns

function readPage(p, layout) {
    return fs.readFileSync(path.join(CACHE, "page_" + String(p).padStart(3, "0") + (layout ? ".layout" : "") + ".txt"), "utf8");
}

/**
 * Split a layout page into columns. T.splitLayoutColumns finds the gutter column; the cut itself is
 * made per line at the run of two or more spaces nearest the gutter, because the right column's text
 * can start a character or two early or late (the library's fixed cut then loses the first word of the
 * right column or the last of the left one). Right-column indents are measured from the most common
 * start column; a line whose left text was pushed into the gutter is never taken as an indented start.
 */
function splitColumns(layoutText) {
    const s = T.splitLayoutColumns(layoutText);
    const lines = String(layoutText).split("\n");
    const rstrip = l => l.replace(/\s+$/, "");
    if (s.gutter === null) return { gutter: null, left: lines.map(rstrip), right: lines.map(() => ""), rightIndent: lines.map(() => 0) };
    const g = s.gutter;
    const cuts = lines.map(l => {
        if (l.length <= g) return null;
        let best = null, bestD = Infinity;
        const re = / {2,}/g;
        let m;
        while ((m = re.exec(l)) !== null) {
            const a = m.index, b = a + m[0].length;
            const d = g < a ? a - g : g >= b ? g - b + 1 : 0;
            if (d < bestD) { bestD = d; best = { a, b, pushed: a > g }; }
        }
        return best && bestD <= 12 && best.b < l.length ? best : null;
    });
    const starts = {};
    for (const c of cuts) if (c) starts[c.b] = (starts[c.b] || 0) + 1;
    let rightStart = s.rightStart, n = 0;
    for (const k of Object.keys(starts)) if (starts[k] > n) { n = starts[k]; rightStart = Number(k); }
    const left = [], right = [], rightIndent = [];
    lines.forEach((l, i) => {
        const c = cuts[i];
        if (!c) { left.push(rstrip(l)); right.push(""); rightIndent.push(0); return; }
        left.push(rstrip(l.slice(0, c.a)));
        right.push(rstrip(l.slice(c.b)));
        const ind = c.b - rightStart;
        rightIndent.push(c.pushed ? (ind >= 4 ? 2 : 0) : Math.max(0, ind));
    });
    return { gutter: g, left, right, rightIndent };
}

/** Linear stream of layout lines: every page's left column, then its right column (trailing blanks of a column dropped). */
function buildStream(first, last) {
    const stream = [];
    for (let p = first; p <= last; p++) {
        const s = splitColumns(readPage(p, true));
        const push = (col, lines, indents) => {
            let end = lines.length;
            while (end > 0 && !lines[end - 1].trim()) end--;
            for (let j = 0; j < end; j++) {
                const raw = lines[j], text = raw.replace(/^\s+/, "");
                stream.push({ page: p, col, lineNo: j, indent: indents ? indents[j] : raw.length - text.length, raw, text });
            }
        };
        push("L", s.left);
        if (s.gutter !== null) push("R", s.right, s.rightIndent);
    }
    return stream;
}

// ---------------------------------------------------------------- text helpers

const HYPHEN_END = /[-\u2010\u2011\u2014]$/;
const joinWrapped = (a, b) => HYPHEN_END.test(a) ? a + b : a + " " + b;
const isLowerStart = s => /^[a-z]/.test(s);
const endsSentence = s => /[.!?:\u201D"\)]$/.test(s);

// ---------------------------------------------------------------- tables

const cellsOf = s => s.trim().split(/ {2,}/);

/** Header columns and their x positions: "d10 Damage Type  d10 Damage Type" -> [d10, Damage Type, d10, Damage Type]. */
function headerColumns(raw) {
    const out = [];
    const re = /\S(?:\S| (?=\S))*/g;
    let m;
    while ((m = re.exec(raw)) !== null) {
        const dm = /^(d\d+)\s+(.+)$/.exec(m[0]);
        if (dm) { out.push({ x: m.index, text: dm[1] }); out.push({ x: m.index + m[0].indexOf(dm[2]), text: dm[2] }); }
        else out.push({ x: m.index, text: m[0] });
    }
    return out;
}

/** Split a row at the header's column positions: the boundary before column k is the first space at or after x_k - 2. */
function positionalCells(raw, cols) {
    const cells = [];
    let start = 0;
    for (let k = 1; k < cols.length; k++) {
        let b = Math.max(start, cols[k].x - 2);
        while (b < raw.length && raw[b] !== " ") b++;
        if (b >= raw.length) return null;
        cells.push(raw.slice(start, b).trim());
        while (b < raw.length && raw[b] === " ") b++;
        start = b;
    }
    cells.push(raw.slice(start).trim());
    return cells.some(c => !c) ? null : cells;
}

function isHeaderLine(l) {
    const t = l.text;
    if (DIE_HEADER_RE.test(t)) return true;
    const cells = cellsOf(t);
    if (cells.length < 2 || cells.length > 6) return false;
    return cells.every(c => c.length <= 32 && /^[A-Z\u2026d]/.test(c) && !/[.!?]$/.test(c) && c.split(" ").length <= 4);
}

const isCaptionLine = s => !!s && s.split(" ").length <= 6 && /^[A-Z]/.test(s) && !endsSentence(s) && !cellsOf(s)[1];

/**
 * Try to read a table starting at lines[i] (its header line). Returns { block, end } or null.
 * block: { type: "table", caption, columns, rows, rawLines, aligned, note, problem }
 * `hasCaption` (a title line stands just above the header) lets a one-row table through, so that a
 * table the layout scrambled is still recorded (and flagged) instead of dissolving into paragraphs.
 */
function tryTable(lines, i, hasCaption) {
    const h = lines[i];
    if (!isHeaderLine(h)) return null;
    let cols = headerColumns(h.raw);
    if (cols.length < 2) return null;
    const dice = DIE_HEADER_RE.test(h.text);
    const rows = [], raw = [h.raw];
    const problems = [];
    let j = i + 1, lastNonBlank = i, note = "", interrupted = false, sideBySide = false, ncols = cols.length, colX = cols;
    const setup = () => {
        const half = cols.length / 2;
        sideBySide = cols.length >= 4 && cols.length % 2 === 0 && cols.slice(0, half).every((c, k) => c.text === cols[half + k].text);
        ncols = sideBySide ? half : cols.length;
        colX = sideBySide ? cols.slice(0, half) : cols;
    };
    setup();
    // a second header line (short capitalised cells, no die result, indented) completes the titles
    if (lines[j] && lines[j].text && lines[j].indent >= 2 && !DIE_RESULT_RE.test(lines[j].text) && cellsOf(lines[j].text).every(c => /^[A-Z]/.test(c) && c.split(" ").length <= 3)) {
        for (const c of headerColumns(lines[j].raw)) {
            let best = null, bd = Infinity;
            for (const hc of cols) { const d = Math.abs(hc.x - c.x); if (d < bd) { bd = d; best = hc; } }
            if (best) best.text += " " + c.text;
        }
        raw.push(lines[j].raw); lastNonBlank = j; j++;
        setup();
    }
    const DIE_MID = / {2,}(00|\d{1,3}(?:[\u2013\u2014-]\d{1,3})?)(?=\s|$)/;
    const parseRow = l => {
        if (dice) {
            const dm = DIE_RESULT_RE.exec(l.text);
            if (!dm) return null;
            const rest = l.text.slice(dm[0].length).trim();
            if (sideBySide) {
                const sm = DIE_MID.exec(rest);
                const a = sm ? rest.slice(0, sm.index).trim() : rest, b = sm ? rest.slice(sm.index).trim() : null;
                const out = [{ half: 0, cells: [dm[0]].concat(ncols > 2 ? (positionalCells(a, colX.slice(1)) || [a]) : [a]) }];
                if (b) { const bm = DIE_RESULT_RE.exec(b); out.push({ half: 1, cells: [bm[0], b.slice(bm[0].length).trim()] }); }
                return out;
            }
            if (ncols === 2) return [{ half: 0, cells: [dm[0], rest] }];
            const rel = l.raw.indexOf(l.text) + dm[0].length;
            const pc = positionalCells(l.raw.slice(rel), colX.slice(1).map(c => ({ x: c.x - rel })));
            return [{ half: 0, cells: [dm[0]].concat(pc || [rest]) }];
        }
        if (/^[\u2022*]/.test(l.text)) return null;
        const c2 = cellsOf(l.text);
        if (c2.length === ncols) return [{ half: 0, cells: c2 }];
        if (sideBySide && c2.length === 2 * ncols) return [{ half: 0, cells: c2.slice(0, ncols) }, { half: 1, cells: c2.slice(ncols) }];
        if (l.indent >= 2) return null;
        const pc = positionalCells(l.raw, colX);
        if (pc && pc[0].split(" ").length <= 4 && /^[A-Z0-9\u2013]/.test(pc[0]) && !/[.]$/.test(pc[0])) return [{ half: 0, cells: pc }];
        return null;
    };
    const isContinuation = l => {
        if (dice) return !DIE_RESULT_RE.test(l.text) && l.indent >= 2;
        return l.indent >= Math.max(2, colX[1].x - 1) && !cellsOf(l.text)[1];
    };
    while (j < lines.length) {
        const l = lines[j];
        if (!l.text) {
            let k = j + 1;
            while (k < lines.length && !lines[k].text) k++;
            if (k >= lines.length) break;
            const nx = lines[k];
            if (/^\*/.test(nx.text) && rows.length) { j = k; continue; }
            if (parseRow(nx)) { j = k; continue; }
            break;
        }
        if (/^\*/.test(l.text) && rows.length) { note = note ? joinWrapped(note, l.text) : l.text; raw.push(l.raw); lastNonBlank = j; j++; continue; }
        const r = parseRow(l);
        if (r) { for (const row of r) rows.push(row); raw.push(l.raw); lastNonBlank = j; j++; continue; }
        if (rows.length && isContinuation(l)) {
            const last = rows[rows.length - 1].cells;
            if (/^[A-Z]/.test(l.text)) problems.push("continuation line starts with a capital: " + l.text.slice(0, 40));
            last[last.length - 1] = joinWrapped(last[last.length - 1], l.text);
            raw.push(l.raw); lastNonBlank = j; j++; continue;
        }
        if (rows.length) interrupted = true;
        break;
    }
    if (rows.length < 2 && !(hasCaption && rows.length === 1)) return null;
    if (interrupted) problems.push("table interrupted by an unindented line that is neither a row nor a continuation");
    // a single-spaced header ("d10 Damage Type Gem") hides a column that every row shows: split the title by word count
    if (dice && ncols === 2 && rows.length && rows.every(r => cellsOf(r.cells[1]).length === cellsOf(rows[0].cells[1]).length && cellsOf(r.cells[1]).length > 1)) {
        const k = cellsOf(rows[0].cells[1]).length - 1;
        const words = colX[1].text.split(" ");
        if (words.length > k) {
            colX = [colX[0], { x: colX[1].x, text: words.slice(0, words.length - k).join(" ") }].concat(words.slice(words.length - k).map(w => ({ x: 0, text: w })));
            ncols = colX.length;
            for (const r of rows) r.cells = [r.cells[0]].concat(cellsOf(r.cells[1]));
            note = note ? note : "";
            problems.push.apply(problems, []);
            raw.header = "column titles split by word count from a single-spaced header";
        }
    }
    const ordered = rows.filter(r => r.half === 0).concat(rows.filter(r => r.half === 1)).map(r => r.cells);
    for (const r of ordered) {
        if (r.length !== ncols) problems.push("row has " + r.length + " cells: " + r.join(" | ").slice(0, 40));
        else if (r[1] && isLowerStart(r[1])) problems.push("row text starts lowercase: " + r.join(" | ").slice(0, 40));
    }
    if (dice) {
        let prev = 0;
        for (const r of ordered) {
            const first = /^(\d+)/.exec(r[0] === "00" ? "100" : r[0]);
            const v = first ? Number(first[1]) : 0;
            if (v < prev) { problems.push("die results out of order at " + r[0]); break; }
            prev = v;
        }
    }
    const aligned = problems.length === 0;
    const block = { type: "table", caption: null, columns: colX.map(c => c.text), rows: aligned ? ordered : [], rawLines: raw.map(x => x.trim()), aligned, note };
    if (raw.header) block.headerNote = raw.header;
    if (!aligned) block.problem = "rows not recoverable from the layout (" + problems[0] + ")";
    return { block, end: lastNonBlank + 1 };
}

/** Body lines -> blocks: paragraphs ({ type: "para", text }) and tables. */
function parseBlocks(lines) {
    const blocks = [];
    let para = null, pendingBreak = false;
    const flush = () => { if (para) blocks.push({ type: "para", text: para }); para = null; };
    let i = 0;
    while (i < lines.length) {
        const l = lines[i];
        if (!l.text) { pendingBreak = true; i++; continue; }
        // a short title line just above the header (at most one blank line between) is the table's caption
        const prev = blocks.length && blocks[blocks.length - 1].type === "para" ? blocks[blocks.length - 1] : null;
        const cap = para && isCaptionLine(para) ? para : (!para && prev && isCaptionLine(prev.text) ? prev.text : null);
        const tb = tryTable(lines, i, !!cap);
        if (tb) {
            if (cap && para) para = null; else if (cap && prev) blocks.pop();
            flush();
            tb.block.caption = cap;
            blocks.push(tb.block);
            i = tb.end; pendingBreak = true;
            continue;
        }
        const starts = l.indent >= 2 || /^[\u2022*]/.test(l.text);
        const joinAcrossBreak = pendingBreak && para && !starts && isLowerStart(l.text) && !endsSentence(para);
        if (para && !starts && (!pendingBreak || joinAcrossBreak)) para = joinWrapped(para, l.text);
        else { flush(); para = l.text; }
        pendingBreak = false;
        i++;
    }
    flush();
    return blocks;
}

function renderBlock(b) {
    if (b.type === "para") return b.text;
    if (!b.aligned) return (b.caption ? b.caption + "\n" : "") + b.rawLines.join("\n");
    const lines = [];
    if (b.caption) lines.push(b.caption);
    lines.push(b.columns.join(" | "));
    for (const r of b.rows) lines.push(r.join(" | "));
    if (b.note) lines.push(b.note);
    return lines.join("\n");
}

// ---------------------------------------------------------------- type line

function parseTypeLine(s) {
    const m = TYPE_RE.exec(s);
    if (!m) return null;
    const out = { itemType: m[1].toLowerCase(), typeDetail: m[2] ? m[2].trim() : null, rarityText: m[3].trim(), rarity: null, rarities: [], attunement: { required: false, restriction: null }, notes: [] };
    let rest = m[3];
    const att = /\(requires attunement(?:\s+([^)]*))?\)/.exec(rest);
    if (att) { out.attunement = { required: true, restriction: att[1] ? att[1].trim() : null }; rest = rest.replace(att[0], " "); }
    const found = [];
    let r;
    RARITY_RE.lastIndex = 0;
    while ((r = RARITY_RE.exec(rest)) !== null) found.push({ rarity: r[1], variant: r[2] ? r[2].trim() : null });
    const t = rest.trim();
    if (/^rarity varies\b/.test(t) || /^varies\b/.test(t)) out.rarity = "varies";
    else if (/^rarity by\b/.test(t)) { out.rarity = "varies"; out.notes.push("rarity printed as \"" + t + "\""); }
    else if (found.length === 1 && !found[0].variant) out.rarity = found[0].rarity;
    else if (found.length >= 1) { out.rarity = "varies"; out.rarities = found; }
    if (found.length) out.rarities = found;
    return out;
}

// ---------------------------------------------------------------- main

function main() {
    const failures = [], warnings = [];
    const fail = msg => failures.push(msg);
    const warn = (page, message) => warnings.push({ page, message });
    const cacheManifest = JSON.parse(fs.readFileSync(path.join(CACHE, "manifest.json"), "utf8"));
    const stream = buildStream(PAGES[0], PAGES[1]);

    // ---- boundaries: chapter headings and item name blocks
    const bounds = []; // { k, kind: "rule"|"item", ... }
    const headingAt = new Set();
    for (const [text, page, parents] of HEADINGS) {
        const k = stream.findIndex(l => l.page === page && l.text === text && l.indent === 0);
        if (k < 0) { fail("heading not found on page " + page + ": " + text); continue; }
        headingAt.add(k);
        bounds.push({ k, kind: "rule", heading: text, headingPath: text === "Magic Items" ? ["Magic Items"] : ["Magic Items"].concat(parents, [text]), page });
    }
    const nameOk = l => l.text.length <= 60 && /^[A-Z]/.test(l.text) && !/[.:;!?]$/.test(l.text);
    for (let i = 0; i < stream.length; i++) {
        const l = stream[i];
        if (!TYPE_RE.test(l.text) || l.indent >= 2) continue;
        // continuation of a wrapped type line
        const typeLines = [i];
        let s = l.text;
        for (let c = 1; c <= 2; c++) {
            const nx = stream[i + c];
            if (!nx || !nx.text) break;
            const open = (s.match(/\(/g) || []).length, close = (s.match(/\)/g) || []).length;
            if (open > close || /,$/.test(s) || /\b(or|very)$/.test(s) || /^\(/.test(nx.text)) { typeLines.push(i + c); s = s + " " + nx.text; } else break;
        }
        // name block: the non-blank run above the blank line before the type line, same column, name-shaped
        let j = i - 1;
        if (j >= 0 && !stream[j].text) j--;
        const names = [];
        while (j >= 0 && stream[j].text && stream[j].page === l.page && stream[j].col === l.col && names.length < 3 && nameOk(stream[j]) && !headingAt.has(j)) { names.unshift(j); j--; }
        if (!names.length) { warn(l.page, "type line without a name above it: " + l.text); continue; }
        if (names.length === 3) { names.shift(); warn(l.page, "name block of three lines trimmed to two: " + names.map(n => stream[n].text).join(" / ")); }
        bounds.push({ k: names[0], kind: "item", nameLines: names, typeLines, name: names.map(n => stream[n].text).join(" "), typeText: s, page: l.page });
    }
    bounds.sort((a, b) => a.k - b.k);
    for (let b = 1; b < bounds.length; b++) if (bounds[b].k === bounds[b - 1].k) fail("two boundaries at the same line " + bounds[b].k);

    // ---- reading-order text for the cross-check
    const fold = s => T.toPlain(s).replace(/-\s+/g, "-").replace(/\s+/g, " ").trim();
    const reading = {};
    for (let p = PAGES[0]; p <= PAGES[1]; p++) reading[p] = fold(readPage(p, false));
    let checked = 0, missingParas = 0;
    const crossCheck = (blocks, pages, label) => {
        for (const b of blocks) {
            if (b.type !== "para" || b.text.length < 40) continue;
            checked++;
            const f = fold(b.text);
            const ok = pages.some(pg => reading[pg].includes(f) || (reading[pg] + " " + (reading[pg + 1] || "")).includes(f));
            if (!ok) { missingParas++; warn(pages[0], "paragraph not found verbatim in the reading-order text (" + label + "): " + b.text.slice(0, 70)); }
        }
    };

    // ---- entries
    const entries = [];
    const ids = new Map();
    const push = e => {
        if (ids.has(e.id)) fail("duplicate id " + e.id + " (" + e.name + " / " + ids.get(e.id) + ")");
        ids.set(e.id, e.name);
        e.dice = T.findDice(e.text).map(d => ({ text: d.text, count: d.count, sides: d.sides, modifier: d.modifier, average: d.average }));
        entries.push(e);
    };
    const src = (pages, heading) => ({ document: "SRD 5.1", pages: [...new Set(pages)].sort((a, b) => a - b), section: SECTION, heading });
    const tableData = blocks => blocks.filter(b => b.type === "table").map(b => { const o = { caption: b.caption, columns: b.columns, rows: b.rows }; if (b.note) o.note = b.note; if (!b.aligned) { o.unparsed = true; o.rawLines = b.rawLines; o.problem = b.problem; } return o; });

    for (let b = 0; b < bounds.length; b++) {
        const B = bounds[b];
        const end = b + 1 < bounds.length ? bounds[b + 1].k : stream.length;
        if (B.kind === "rule") {
            const body = stream.slice(B.k + 1, end);
            const blocks = parseBlocks(body);
            const pages = [...new Set([B.page].concat(body.filter(l => l.text).map(l => l.page)))];
            crossCheck(blocks, pages, B.heading);
            let text = blocks.map(renderBlock).join("\n\n");
            const notes = [];
            if (!text) { text = B.heading; notes.push("heading only: the SRD prints no prose under it (the artifact entries follow directly)"); }
            for (const t of blocks) if (t.type === "table" && !t.aligned) notes.push("table " + (t.caption || t.columns.join("/")) + ": " + t.problem);
            push({ id: T.stableId("rule", B.heading === "Magic Items" ? "Magic Items" : "Magic Items " + B.heading), category: "rules", kind: "rule", name: B.heading, source: src(pages, B.heading), text,
                data: { headingPath: B.headingPath, tables: tableData(blocks) }, readiness: notes.length ? "extracted" : "parsed", notes });
            continue;
        }
        const bodyStart = B.typeLines[B.typeLines.length - 1] + 1;
        const body = stream.slice(bodyStart, end);
        const blocks = parseBlocks(body);
        const pages = [...new Set([B.page].concat(body.filter(l => l.text).map(l => l.page)))];
        crossCheck(blocks, pages, B.name);
        const tl = parseTypeLine(B.typeText);
        const notes = tl ? tl.notes.slice() : [];
        const missing = [];
        const description = blocks.filter(x => x.type === "para").map(x => x.text).join("\n\n");
        const data = {
            itemType: tl ? tl.itemType : null, typeDetail: tl ? tl.typeDetail : null, rarity: tl ? tl.rarity : null, rarityText: tl ? tl.rarityText : B.typeText,
            attunement: tl ? tl.attunement : { required: null, restriction: null }, description, tables: tableData(blocks)
        };
        if (tl && tl.rarities.length) data.rarities = tl.rarities;
        if (!data.itemType) missing.push("itemType");
        if (!data.rarity) missing.push("rarity");
        if (!description) missing.push("description");
        for (const t of blocks) if (t.type === "table" && !t.aligned) { missing.push("tables"); notes.push("table " + (t.caption || t.columns.join("/")) + " on page " + pages[0] + ": " + t.problem); }
        if (missing.length) notes.push("missing required field(s): " + [...new Set(missing)].join(", "));
        const text = [B.name, B.typeText].concat(blocks.map(renderBlock)).join("\n\n");
        push({ id: T.stableId("magic-item", B.name), category: CATEGORY, kind: "magic-item", name: B.name, source: src(pages, B.name), text, data, readiness: missing.length ? "extracted" : "parsed", notes });
    }
    console.log((missingParas ? "WARN" : "PASS") + " prose cross-check: " + (checked - missingParas) + "/" + checked + " paragraphs found verbatim in the reading-order pages");
    warn(228, "the d100 ranges of the Iron Flask table are printed as '1r50', '51r54', ... in the page cache (the source PDF's en dash maps to 'r' on this page); kept verbatim");

    // ---- self-checks
    const counts = {};
    for (const e of entries) counts[e.kind] = (counts[e.kind] || 0) + 1;
    const check = (ok, msg) => { console.log((ok ? "PASS" : "FAIL") + " " + msg); if (!ok) failures.push(msg); };
    for (const kind of Object.keys(EXPECTED)) {
        const [exp, tol] = EXPECTED[kind], n = counts[kind] || 0;
        check(Math.abs(n - exp) <= tol, "count " + kind + ": " + n + " (contract expects " + exp + ", tolerance " + tol + ")");
    }
    console.log("INFO count rule: " + (counts.rule || 0) + " (chapter headings)");
    const dups = failures.filter(f => /^duplicate id/.test(f)).length;
    check(dups === 0, "duplicate ids: " + dups);
    check(entries.every(e => e.text && e.text.trim()), "non-empty text on every entry");
    const REQUIRED = { "magic-item": ["itemType", "typeDetail", "rarity", "attunement", "description", "tables"], rule: ["headingPath", "tables"] };
    const badParsed = entries.filter(e => e.readiness === "parsed" && (REQUIRED[e.kind].some(k => !(k in e.data)) || (e.kind === "magic-item" && (!e.data.itemType || !e.data.rarity || !e.data.description))));
    check(badParsed.length === 0, "required data fields present on every parsed entry" + (badParsed.length ? ": " + badParsed.map(e => e.id).join(", ") : ""));
    for (const n of ["Adamantine Armor", "Bag of Holding", "Deck of Many Things", "Spell Scroll", "Vorpal Sword"]) {
        const e = entries.find(x => x.name === n);
        const shown = e ? { itemType: e.data.itemType, typeDetail: e.data.typeDetail, rarity: e.data.rarity, attunement: e.data.attunement, tables: e.data.tables.map(t => (t.caption || t.columns.join("/")) + " " + (t.unparsed ? "UNPARSED" : t.rows.length + " rows")), description: e.data.description.slice(0, 50) + "..." } : null;
        check(!!e, "spot " + n + (e ? " [" + e.readiness + "] " + JSON.stringify(shown) : ": MISSING"));
    }
    const readinessCount = {};
    for (const e of entries) readinessCount[e.readiness] = (readinessCount[e.readiness] || 0) + 1;
    const tableStats = { parsed: 0, unparsed: 0 };
    for (const e of entries) for (const t of e.data.tables) tableStats[t.unparsed ? "unparsed" : "parsed"]++;
    console.log("INFO readiness: " + JSON.stringify(readinessCount) + "; tables: " + JSON.stringify(tableStats) + "; warnings: " + warnings.length);
    for (const e of entries) if (e.readiness !== "parsed") console.log("INFO extracted: " + e.id + " (pages " + e.source.pages.join(",") + "): " + e.notes.join("; "));
    for (const f of failures) if (!/^count |^duplicate ids|^non-empty|^required data|^spot /.test(f)) console.log("FAIL " + f);

    // ---- write
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const out = {
        metadata: {
            generator: "tools/srd_extract/stage_magic_items.js", generatedAt: new Date().toISOString(), category: CATEGORY,
            source: { file: cacheManifest.source.file, sha256: cacheManifest.source.sha256, pages: [PAGES] },
            cache: { generatedAt: cacheManifest.generatedAt }, license: cacheManifest.license, counts, readiness: readinessCount
        },
        entries, warnings
    };
    fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
    console.log("wrote " + path.relative(path.resolve(__dirname, "..", ".."), OUT) + " (" + entries.length + " entries, " + warnings.length + " warnings)");
    console.log(failures.length ? "FAIL stage_magic_items: " + failures.length + " failure(s)" : "PASS stage_magic_items: all checks passed");
    process.exit(failures.length ? 1 : 0);
}

main();
