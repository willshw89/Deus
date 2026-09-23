// tools/srd_extract/stage_magic_items.js - SRD 5.1 Magic Items chapter (pages 206-253) -> staging_magic_items.json
//
// Usage: node tools/srd_extract/stage_magic_items.js
// Reads the page cache written by extract_pages.js (cache/page_NNN.layout.raw.txt for structure,
// cache/page_NNN.txt for the prose cross-checks) and writes staging/staging_magic_items.json in the
// shape given by docs/SRD5_1_COVERAGE_MANIFEST.md section 6. Exit 1 when any self-check fails.
//
// Entries: one magic-item per item heading (category "magic-items"), and one `rule` per chapter
// heading (category "rules") for the introductory rules (attunement, wearing and wielding, activating,
// charges, ...), the sentient-item rules and the Artifacts heading.
//
// How the chapter is read. Columns are detected on the raw layout (exact positions) with
// T.splitRawLayoutColumns, cut per line at the run of two or more spaces nearest that gutter, and
// normalised after the cut (T.normalizeText); the cut is compared with the library's fixed cut and the
// number of lines it moved is printed. Left column, then right, is one stream. An item starts at a
// name line (one or two short lines) followed by a blank line and a type/rarity line such as
// "Wondrous item, rare (requires attunement)"; the type line may wrap. Everything up to the next item
// or chapter heading is the item's body, unwrapped into paragraphs; tables are recognised by a header
// line and read as column flows: every column's cells are collected in printed order and the flows are
// zipped only when each column holds exactly as many cells as the first (or die) column. That is what
// the SRD's own misprinted tables need: on pages 209, 220, 226, 228, 231, 239 and 249-250 the die
// column is printed on a compressed grid, so the labels sit on the wrong lines while the order of every
// column stays intact. A table whose flows cannot be segmented with certainty (a wrapped outcome that
// starts with a capital, or two cells printed with a single space between them) keeps its raw lines in
// `text`, records its labels and their coverage, and is left with rows [] and a note; nothing is guessed.
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
const DIE_HEADER_RE = /^d(4|6|8|10|12|20|100)$/;
// a printed die result: "01", "16", "00", "91\u201300", "1\u20135"; page 228 prints its en dashes as "r" ("1r50")
const LABEL_RE = /^(00|\d{1,3}(?:[\u2013\u2014-]\d{1,3})?|\d{1,3}r\d{1,3})$/;
const IRON_FLASK_NOTE = "the d100 ranges of the Iron Flask table come out of pdftotext as '1r50', '51r54', ... (the page's en dash mapped to the letter r); the cache normalises them to en dashes (lib rule iron_flask_dash) and the stager reads them as ranges";

// ---------------------------------------------------------------- cache access and columns

function readRawLayout(p) {
    return fs.readFileSync(path.join(CACHE, "page_" + String(p).padStart(3, "0") + ".layout.raw.txt"), "utf8").replace(/\r\n?/g, "\n");
}
function readReading(p) {
    return fs.readFileSync(path.join(CACHE, "page_" + String(p).padStart(3, "0") + ".txt"), "utf8");
}

/**
 * Split a raw layout page into columns. T.splitRawLayoutColumns detects the gutter on the raw text
 * (exact positions); the cut itself is made per line at the run of two or more spaces nearest that
 * gutter, so that a line whose text was pushed across the gutter by pdftotext loses no word, and each
 * piece is normalised afterwards. Right-column indents are measured from the most common start column.
 * `moved` counts the lines whose cut differs from the library's fixed cut (the guard's report).
 */
function splitColumns(rawText) {
    const lib = T.splitRawLayoutColumns(rawText);
    const lines = rawText.split("\n");
    const rstrip = l => l.replace(/\s+$/, "");
    if (lib.gutter === null) return { gutter: null, left: lines.map(l => rstrip(T.normalizeText(l))), right: lines.map(() => ""), rightX0: lines.map(() => 0), moved: 0 };
    const g = lib.gutter;
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
    // the right column's start is measured on the raw grid (exact); only the text is normalised
    const starts = {};
    lines.forEach((l, i) => { const c = cuts[i]; if (c) { c.vb = c.b; starts[c.vb] = (starts[c.vb] || 0) + 1; } });
    let rightStart = null, n = 0;
    for (const k of Object.keys(starts)) if (starts[k] > n) { n = starts[k]; rightStart = Number(k); }
    const left = [], right = [], rightX0 = [], rightIndent = [];
    let moved = 0;
    lines.forEach((l, i) => {
        const c = cuts[i];
        const L = c ? rstrip(T.normalizeText(l.slice(0, c.a))) : rstrip(T.normalizeText(l));
        const R = c ? rstrip(T.normalizeText(l.slice(c.b))) : "";
        left.push(L); right.push(R);
        const x0 = c ? c.vb - rightStart : 0;
        rightX0.push(x0);
        // a line whose left text was pushed into the gutter is never taken as an indented paragraph start
        rightIndent.push(c && c.pushed ? (x0 >= 4 ? 2 : 0) : Math.max(0, x0));
        if (L.trim() !== (lib.left[i] || "").trim() || R.trim() !== (lib.right[i] || "").trim()) moved++;
    });
    return { gutter: g, left, right, rightX0, rightIndent, moved };
}

/** Linear stream of layout lines: every page's left column, then its right column (trailing blanks of a column dropped). */
function buildStream(first, last) {
    const stream = [], moved = {};
    for (let p = first; p <= last; p++) {
        const s = splitColumns(readRawLayout(p));
        if (s.moved) moved[p] = s.moved;
        const push = (col, lines, x0s, indents) => {
            let end = lines.length;
            while (end > 0 && !lines[end - 1].trim()) end--;
            for (let j = 0; j < end; j++) {
                const raw = lines[j], text = raw.replace(/^\s+/, "");
                const x0 = x0s ? x0s[j] : raw.length - text.length;
                stream.push({ page: p, col, lineNo: j, x0, indent: indents ? indents[j] : x0, text });
            }
        };
        push("L", s.left);
        if (s.gutter !== null) push("R", s.right, s.rightX0, s.rightIndent);
    }
    return { stream, moved };
}

// ---------------------------------------------------------------- text helpers

const HYPHEN_END = /[-\u2010\u2011\u2014]$/;
const joinWrapped = (a, b) => HYPHEN_END.test(a) ? a + b : a + " " + b;
const isLowerStart = s => /^[a-z]/.test(s);
const endsSentence = s => /[.!?:\u201D"\)]$/.test(s);
const cellsOf = s => s.trim().split(/ {2,}/);
const fold = s => T.toPlain(s).replace(/-\s+/g, "-").replace(/\s+/g, " ").trim();

/** Tokens of a stream line: runs separated by two or more spaces, with their x relative to the column. */
function lineTokens(l) {
    const out = [];
    const re = /\S(?:\S| (?=\S))*/g;
    let m;
    while ((m = re.exec(l.text)) !== null) out.push({ x: l.x0 + m.index, text: m[0] });
    return out;
}

// ---------------------------------------------------------------- tables

/** Header columns and their x positions: "d10 Damage Type  d10 Damage Type" -> [d10, Damage Type, d10, Damage Type]. */
function headerColumns(l) {
    const out = [];
    for (const t of lineTokens(l)) {
        const dm = /^(d\d+)\s+(.+)$/.exec(t.text);
        if (dm) { out.push({ x: t.x, text: dm[1] }); out.push({ x: t.x + t.text.indexOf(dm[2]), text: dm[2] }); }
        else out.push({ x: t.x, text: t.text });
    }
    return out;
}

function isHeaderLine(l) {
    const t = l.text;
    if (/^d(4|6|8|10|12|20|100)\s+\S/.test(t)) return true;
    const cells = cellsOf(t);
    if (cells.length < 2 || cells.length > 6) return false;
    return cells.every(c => c.length <= 32 && /^[A-Z\u2026d]/.test(c) && !/[.!?]$/.test(c) && c.split(" ").length <= 4);
}

const isCaptionLine = s => !!s && s.split(" ").length <= 6 && /^[A-Z]/.test(s) && !endsSentence(s) && !cellsOf(s)[1];

function parseRoll(text) {
    const m = /^(\d{1,3})(?:[\u2013\u2014\-r](\d{1,3}))?$/.exec(text);
    if (!m) return null;
    const num = s => (Number(s) === 0 ? 100 : Number(s));
    const min = num(m[1]), max = m[2] ? num(m[2]) : min;
    return { min, max, text };
}

/** Coverage of 1..sides by the rolls: { complete, gaps, overlaps } (gaps and overlaps as "a-b" strings). */
function coverageOf(rolls, sides) {
    const count = new Array(sides + 2).fill(0);
    let outOfRange = false;
    for (const r of rolls) { if (r.min < 1 || r.max > sides || r.max < r.min) outOfRange = true; for (let v = Math.max(1, r.min); v <= Math.min(sides, r.max); v++) count[v]++; }
    const runs = pred => { const out = []; let a = null; for (let v = 1; v <= sides + 1; v++) { const ok = v <= sides && pred(count[v]); if (ok && a === null) a = v; if (!ok && a !== null) { out.push(a === v - 1 ? String(a) : a + "-" + (v - 1)); a = null; } } return out; };
    const gaps = runs(c => c === 0), overlaps = runs(c => c > 1);
    return { complete: !outOfRange && gaps.length === 0 && overlaps.length === 0, gaps, overlaps };
}

/**
 * Read a table starting at lines[i] (its header line). Returns { block, end } or null.
 * The block: { type: "table", caption, dice, columns, rows: [{ roll, cells }], footnotes, nested, coverage,
 *              labels, rawLines, aligned, problem, headerNote }
 */
function readTable(lines, i, hasCaption) {
    const h = lines[i];
    if (!isHeaderLine(h)) return null;
    let cols = headerColumns(h);
    if (cols.length < 2) return null;
    const raw = [h.text];
    let j = i + 1, lastNonBlank = i, headerNote = null;
    // a second header line (short capitalised cells, no label, indented) completes the titles
    if (lines[j] && lines[j].text && lines[j].indent >= 2 && !LABEL_RE.test(lineTokens(lines[j])[0].text) && cellsOf(lines[j].text).every(c => /^[A-Z]/.test(c) && c.split(" ").length <= 3)) {
        for (const c of headerColumns(lines[j])) {
            let best = null, bd = Infinity;
            for (const hc of cols) { const d = Math.abs(hc.x - c.x); if (d < bd) { bd = d; best = hc; } }
            if (best) best.text += " " + c.text;
        }
        raw.push(lines[j].text); lastNonBlank = j; j++;
    }
    const half = cols.length / 2;
    const sideBySide = cols.length >= 4 && cols.length % 2 === 0 && cols.slice(0, half).every((c, k) => c.text === cols[half + k].text);
    let halves = sideBySide ? [cols.slice(0, half), cols.slice(half)] : [cols];
    const dice = DIE_HEADER_RE.test(halves[0][0].text) ? halves[0][0].text : null;
    const sides = dice ? Number(dice.slice(1)) : null;
    const colOf = (cs, x) => { let k = 0; for (let q = 1; q < cs.length; q++) if (x >= cs[q].x - 3) k = q; return k; };
    const labelOf = (toks, cs) => { const f = toks[0]; if (!f) return null; const w = f.text.split(" ")[0]; return LABEL_RE.test(w) && f.x <= cs[0].x + 3 ? w : null; };
    // a labelled table: a die column, or a one-word first column whose rows start with a plain number (the Apparatus levers)
    const firstBody = lines.slice(j).find(l => l.text);
    const labeled = !!dice || (!!firstBody && /^\d{1,3}(\s+[A-Z\u201C\u2018]|$)/.test(lineTokens(firstBody)[0].text) && lineTokens(firstBody)[0].x <= halves[0][0].x + 3);

    // ---- which lines belong to the table
    const footnotes = [];
    const inTable = l => {
        if (!l.text) return false;
        const toks = lineTokens(l);
        const first = toks[0];
        if (/^\*/.test(l.text)) return true;
        const cs = halves[0];
        if (labeled) {
            if (labelOf(toks, cs)) return true;
            if (first.x >= cs[1].x - 1) return true;
            return l.indent < 2 && first.x < 2 && !isCaptionLine(l.text) && !isHeaderLine(l);
        }
        if (toks.length >= 2) { const ks = new Set(toks.map(t => colOf(cs, t.x))); if (ks.size >= 2) return true; }
        if (first.x >= cs[1].x - 3) return true;
        return l.indent < 2 && toks.length === 1 && /^[A-Z0-9]/.test(first.text) && first.text.length > cs[1].x - first.x + 2 && /\s/.test(first.text.slice(Math.max(0, cs[1].x - 2 - first.x)));
    };
    const body = [];
    while (j < lines.length) {
        const l = lines[j];
        if (!l.text) {
            let k = j + 1;
            while (k < lines.length && !lines[k].text) k++;
            if (k >= lines.length || !inTable(lines[k])) break;
            j = k; continue;
        }
        if (!inTable(l)) break;
        if (/^\*/.test(l.text)) footnotes.push(l.text); else body.push(l);
        raw.push(l.text); lastNonBlank = j; j++;
    }
    if (!body.length) return null;

    // a single-spaced header ("Lever Up   Down") merges the label column's title with the next column's: split at the first word
    if (labeled && !sideBySide && halves[0][0].text.split(" ").length > 1) {
        const first = lineTokens(firstBody)[0], lab = labelOf([first], halves[0]);
        if (lab && first.text.length > lab.length) {
            const restX = first.x + first.text.length - first.text.slice(lab.length).replace(/^\s+/, "").length;
            const words = halves[0][0].text.split(" ");
            halves = [[{ x: halves[0][0].x, text: words[0] }, { x: restX, text: words.slice(1).join(" ") }].concat(halves[0].slice(1))];
            headerNote = "column titles split from a single-spaced header";
        }
    }
    // a single-spaced header ("d10 Damage Type Gem") hides a column that every labelled row shows: split its title by word count
    if (labeled && !sideBySide && halves[0].length === 2) {
        const counts = [];
        let sampleX = null, m = 0;
        for (const l of body) {
            const toks = lineTokens(l);
            const lab = labelOf(toks, halves[0]);
            if (!lab) continue;
            const restX = toks[0].text.length > lab.length ? toks[0].x + toks[0].text.length - toks[0].text.slice(lab.length).replace(/^\s+/, "").length : null;
            const xs = (restX === null ? [] : [restX]).concat(toks.slice(1).map(t => t.x));
            counts.push(xs.length);
            if (xs.length > m) { m = xs.length; sampleX = xs; }
        }
        if (m >= 2 && counts.filter(c => c === m).length >= 2 && sampleX) {
            const words = halves[0][1].text.split(" ");
            if (words.length >= m) {
                const extra = m - 1;
                halves = [[halves[0][0], { x: halves[0][1].x, text: words.slice(0, words.length - extra).join(" ") }].concat(words.slice(words.length - extra).map((w, q) => ({ x: sampleX[sampleX.length - extra + q], text: w })))];
                headerNote = "column titles split by word count from a single-spaced header";
            }
        }
    }

    // ---- column flows per half
    const problems = [];
    const rows = [];
    let labels = [];
    for (const cs of halves) {
        const flows = cs.map(() => []);
        for (const l of body) {
            let toks = lineTokens(l);
            if (sideBySide) {
                const from = cs === halves[0] ? -Infinity : halves[1][0].x - 3, to = cs === halves[0] ? halves[1][0].x - 3 : Infinity;
                toks = toks.filter(t => t.x >= from && t.x < to);
            }
            let firstOnLine = true;
            for (const t of toks) {
                let k = colOf(cs, t.x), text = t.text, x = t.x;
                if (labeled && firstOnLine) {
                    const lab = labelOf([t], cs);
                    if (lab) {
                        flows[0].push({ text: lab, x, line: l });
                        if (text === lab) { firstOnLine = false; continue; }
                        const rest = text.slice(lab.length).replace(/^\s+/, "");
                        x = x + text.length - rest.length; text = rest; k = colOf(cs, x); if (k === 0) k = 1;
                    } else if (k === 0) k = 1; // text at the label column that is not a label continues the first text column
                }
                firstOnLine = false;
                // a token that runs on into the next column: split at the column boundary when the second part starts there, else refuse
                if (k < cs.length - 1 && x + text.length > cs[k + 1].x + 1) {
                    const cut = Math.max(0, cs[k + 1].x - 2 - x);
                    const rel = text.slice(cut).search(/ /);
                    if (rel < 0) { problems.push("cell runs into the next column: " + text.slice(0, 40)); flows[k].push({ text, x, line: l }); continue; }
                    const at = cut + rel;
                    const a = text.slice(0, at).trim(), b = text.slice(at).trim();
                    const bx = x + text.length - text.slice(at).replace(/^\s+/, "").length;
                    if (Math.abs(bx - cs[k + 1].x) > 3 || !a || !b) { problems.push("two cells printed with a single space between them: " + text.slice(0, 50)); flows[k].push({ text, x, line: l }); continue; }
                    flows[k].push({ text: a, x, line: l });
                    flows[k + 1].push({ text: b, x: bx, line: l });
                    continue;
                }
                flows[k].push({ text, x, line: l });
            }
        }
        // segment every flow into cells: a capital, a digit, a quotation mark or a signed number starts a cell, anything else continues one
        const cells = flows.map((flow, k) => {
            const out = [];
            for (const t of flow) {
                const starts = (k === 0 && labeled) || /^([A-Z0-9\u201C\u2018]|[+\-]\d)/.test(t.text) || out.length === 0;
                if (starts) out.push(t.text); else out[out.length - 1] = joinWrapped(out[out.length - 1], t.text);
            }
            return out;
        });
        const n = cells[0].length;
        if (dice) labels = labels.concat(cells[0]);
        const bad = cells.map((c, k) => c.length !== n ? cs[k].text + " " + c.length : null).filter(Boolean);
        if (bad.length) problems.push("column cell counts differ (" + cs[0].text + " " + n + "; " + bad.join(", ") + ")");
        if (!problems.length) for (let r = 0; r < n; r++) rows.push({ roll: dice ? parseRoll(cells[0][r]) : null, cells: cells.map(c => c[r]) });
    }
    if (dice && rows.some(r => !r.roll)) problems.push("a die label could not be read as a range");
    if (!problems.length && !dice && rows.length < 2 && !(hasCaption && rows.length === 1)) return null;
    if (problems.length && body.length < 2 && !hasCaption) return null;
    const aligned = problems.length === 0;
    const block = { type: "table", caption: null, dice, columns: halves[0].map(c => c.text), rows: aligned ? rows : [], footnotes, nested: [], coverage: null, rawLines: raw, aligned, note: footnotes.join(" ") };
    if (dice) {
        const rolls = (aligned ? rows.map(r => r.roll) : labels.map(parseRoll)).filter(Boolean);
        block.labels = labels;
        block.coverage = coverageOf(rolls, sides);
        if (!block.coverage.complete) problems.push("die results do not cover 1-" + sides + " exactly once (gaps " + JSON.stringify(block.coverage.gaps) + ", overlaps " + JSON.stringify(block.coverage.overlaps) + ")");
        if (problems.length) { block.rows = []; block.aligned = false; }
    }
    if (headerNote) block.headerNote = headerNote;
    if (!block.aligned) block.problem = "rows not recoverable from the layout (" + problems[0] + ")";
    return { block, end: lastNonBlank + 1 };
}

/** Body lines -> blocks: paragraphs ({ type: "para", text, pages }) and tables. */
function parseBlocks(lines) {
    const blocks = [];
    let para = null, paraPages = [], pendingBreak = false;
    const flush = () => { if (para) blocks.push({ type: "para", text: para, pages: [...new Set(paraPages)] }); para = null; paraPages = []; };
    let i = 0;
    while (i < lines.length) {
        const l = lines[i];
        if (!l.text) { pendingBreak = true; i++; continue; }
        // a short title line just above the header (at most one blank line between) is the table's caption
        const prev = blocks.length && blocks[blocks.length - 1].type === "para" ? blocks[blocks.length - 1] : null;
        const cap = para && isCaptionLine(para) ? para : (!para && prev && isCaptionLine(prev.text) ? prev.text : null);
        const tb = readTable(lines, i, !!cap);
        if (tb) {
            if (cap && para) para = null; else if (cap && prev) blocks.pop();
            flush();
            tb.block.caption = cap;
            tb.block.pages = [...new Set(lines.slice(i, tb.end).map(x => x.page))];
            blocks.push(tb.block);
            i = tb.end; pendingBreak = true;
            continue;
        }
        // a bullet's later lines hang two columns in; they continue the bullet, they do not start a paragraph
        const bulletCont = para && /^[\u2022*]/.test(para) && !pendingBreak && l.indent <= 2 && !/^[\u2022*]/.test(l.text) && (isLowerStart(l.text) || (!endsSentence(para) && para.length >= 35));
        const starts = !bulletCont && (l.indent >= 2 || /^[\u2022*]/.test(l.text));
        const joinAcrossBreak = pendingBreak && para && !starts && isLowerStart(l.text) && !endsSentence(para);
        if (para && !starts && (!pendingBreak || joinAcrossBreak)) { para = joinWrapped(para, l.text); paraPages.push(l.page); }
        else { flush(); para = l.text; paraPages = [l.page]; }
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
    for (const r of b.rows) lines.push(r.cells.join(" | "));
    for (const f of b.footnotes) lines.push(f);
    return lines.join("\n");
}

/** data.tables entry for a magic item (the shape asked for on 2026-09-22) and for a rule (the contract's array rows). */
function tableData(b, kind) {
    if (kind === "rule") {
        const o = { caption: b.caption, columns: b.columns, rows: b.aligned ? b.rows.map(r => r.cells) : [] };
        if (b.footnotes.length) o.note = b.footnotes.join(" ");
        if (!b.aligned) { o.unparsed = true; o.rawLines = b.rawLines; o.problem = b.problem; }
        return o;
    }
    const o = { caption: b.caption, dice: b.dice, columns: b.columns, rows: b.rows, footnotes: b.footnotes, nested: b.nested, coverage: b.coverage };
    if (b.dice) o.labels = b.labels;
    if (b.headerNote) o.headerNote = b.headerNote;
    if (!b.aligned) { o.unparsed = true; o.rawLines = b.rawLines; o.problem = b.problem; }
    return o;
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
    else if (found.length >= 1) out.rarity = "varies";
    if (found.length) out.rarities = found;
    return out;
}

// ---------------------------------------------------------------- main

function main() {
    const failures = [], warnings = [];
    const fail = msg => failures.push(msg);
    const warn = (page, message) => warnings.push({ page, message });
    const cacheManifest = JSON.parse(fs.readFileSync(path.join(CACHE, "manifest.json"), "utf8"));
    const built = buildStream(PAGES[0], PAGES[1]);
    const stream = built.stream;
    const movedTotal = Object.values(built.moved).reduce((a, b) => a + b, 0);
    console.log("INFO guard: the nearest-gap cut moved " + movedTotal + " line(s) against splitRawLayoutColumns" + (movedTotal ? " (" + Object.entries(built.moved).map(([p, n]) => "p" + p + ":" + n).join(", ") + ")" : ""));

    // ---- boundaries: chapter headings and item name blocks
    const bounds = [];
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
        const typeLines = [i];
        let s = l.text;
        for (let c = 1; c <= 2; c++) {
            const nx = stream[i + c];
            if (!nx || !nx.text) break;
            const open = (s.match(/\(/g) || []).length, close = (s.match(/\)/g) || []).length;
            if (open > close || /,$/.test(s) || /\b(or|very)$/.test(s) || /^\(/.test(nx.text)) { typeLines.push(i + c); s = s + " " + nx.text; } else break;
        }
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

    // ---- reading-order text for the cross-checks
    const reading = {};
    for (let p = PAGES[0]; p <= PAGES[1]; p++) reading[p] = fold(readReading(p));
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
    const blockPages = (blocks, first) => [...new Set([first].concat(...blocks.map(b => b.pages || [])))];
    const tableNotes = (blocks, pages) => blocks.filter(b => b.type === "table" && !b.aligned).map(b => "table " + (b.caption || b.columns.join("/")) + " on page " + (b.pages ? b.pages[0] : pages[0]) + ": " + b.problem);

    for (let b = 0; b < bounds.length; b++) {
        const B = bounds[b];
        const end = b + 1 < bounds.length ? bounds[b + 1].k : stream.length;
        if (B.kind === "rule") {
            const body = stream.slice(B.k + 1, end);
            const blocks = parseBlocks(body);
            const pages = blockPages(blocks, B.page);
            crossCheck(blocks, pages, B.heading);
            let text = blocks.map(renderBlock).join("\n\n");
            const notes = tableNotes(blocks, pages);
            if (!text) { text = B.heading; notes.push("heading only: the SRD prints no prose under it (the artifact entries follow directly)"); }
            const complete = blocks.every(x => x.type !== "table" || x.aligned);
            push({ id: T.stableId("rule", B.heading === "Magic Items" ? "Magic Items" : "Magic Items " + B.heading), category: "rules", kind: "rule", name: B.heading, source: src(pages, B.heading), text,
                data: { headingPath: B.headingPath, tables: blocks.filter(x => x.type === "table").map(x => tableData(x, "rule")) }, readiness: complete ? "parsed" : "extracted", notes });
            continue;
        }
        const bodyStart = B.typeLines[B.typeLines.length - 1] + 1;
        const body = stream.slice(bodyStart, end);
        const blocks = parseBlocks(body);
        const pages = blockPages(blocks, B.page);
        crossCheck(blocks, pages, B.name);
        const tl = parseTypeLine(B.typeText);
        const notes = tl ? tl.notes.slice() : [];
        const missing = [];
        const description = blocks.filter(x => x.type === "para").map(x => x.text).join("\n\n");
        const data = {
            itemType: tl ? tl.itemType : null, typeDetail: tl ? tl.typeDetail : null, rarity: tl ? tl.rarity : null, rarityText: tl ? tl.rarityText : B.typeText,
            attunement: tl ? tl.attunement : { required: null, restriction: null }, description, tables: blocks.filter(x => x.type === "table").map(x => tableData(x, "magic-item"))
        };
        if (tl && tl.rarities.length) data.rarities = tl.rarities;
        if (!data.itemType) missing.push("itemType");
        if (!data.rarity) missing.push("rarity");
        if (!description) missing.push("description");
        const tn = tableNotes(blocks, pages);
        if (tn.length) { missing.push("tables"); notes.push(...tn); }
        if (B.name === "Iron Flask") notes.push(IRON_FLASK_NOTE);
        if (missing.length) notes.push("missing required field(s): " + [...new Set(missing)].join(", "));
        const text = [B.name, B.typeText].concat(blocks.map(renderBlock)).join("\n\n");
        push({ id: T.stableId("magic-item", B.name), category: CATEGORY, kind: "magic-item", name: B.name, source: src(pages, B.name), text, data, readiness: missing.length ? "extracted" : "parsed", notes });
    }
    console.log((missingParas ? "WARN" : "PASS") + " prose cross-check: " + (checked - missingParas) + "/" + checked + " paragraphs found verbatim in the reading-order pages");
    warn(228, IRON_FLASK_NOTE);

    // ---- page attribution: the first and last text line of every entry must be found on its cited pages
    {
        const probeOf = line => {
            if (line.includes(" | ")) { const cells = line.split(" | ").filter(c => c.length >= 4); return cells.sort((a, b) => b.length - a.length)[0] || null; }
            return line.length > 40 ? line.slice(-40) : line;
        };
        const bad = [];
        for (const e of entries) {
            const lines = e.text.split("\n").filter(l => l.trim());
            const first = e.name, lastLine = [...lines].reverse().find(l => fold(l).length >= 12) || lines[lines.length - 1];
            for (const [which, probe] of [["first", first], ["last", probeOf(lastLine)]]) {
                if (!probe) continue;
                const f = fold(probe);
                const onCited = e.source.pages.some(p => reading[p] && reading[p].includes(f));
                if (onCited) continue;
                const adjacent = e.source.pages.flatMap(p => [p - 1, p + 1]).filter(p => reading[p] && reading[p].includes(f));
                bad.push(e.id + " (" + which + " line " + JSON.stringify(probe.slice(0, 40)) + ", cited " + e.source.pages.join(",") + (adjacent.length ? ", found only on " + adjacent.join(",") : ", not found") + ")");
            }
        }
        console.log((bad.length ? "FAIL" : "PASS") + " page attribution: first and last text line of every entry found on its cited pages in the reading-order cache" + (bad.length ? ": " + bad.join("; ") : ""));
        if (bad.length) failures.push("page attribution");
    }

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
    const badParsed = entries.filter(e => e.readiness === "parsed" && (REQUIRED[e.kind].some(k => !(k in e.data)) || (e.kind === "magic-item" && (!e.data.itemType || !e.data.rarity || !e.data.description)) || e.data.tables.some(t => t.unparsed)));
    check(badParsed.length === 0, "required data fields present on every parsed entry" + (badParsed.length ? ": " + badParsed.map(e => e.id).join(", ") : ""));
    for (const n of ["Adamantine Armor", "Bag of Holding", "Deck of Many Things", "Spell Scroll", "Vorpal Sword"]) {
        const e = entries.find(x => x.name === n);
        const shown = e ? { itemType: e.data.itemType, typeDetail: e.data.typeDetail, rarity: e.data.rarity, attunement: e.data.attunement, tables: e.data.tables.map(t => (t.caption || t.columns.join("/")) + " " + (t.unparsed ? "UNPARSED" : t.rows.length + " rows")), description: e.data.description.slice(0, 50) + "..." } : null;
        check(!!e, "spot " + n + (e ? " [" + e.readiness + "] " + JSON.stringify(shown) : ": MISSING"));
    }
    // per-table coverage report for the dice tables of the nine items the 2026-09-22 follow-up named
    for (const n of ["Apparatus of the Crab", "Bag of Beans", "Efreeti Bottle", "Horn of Valhalla", "Iron Flask", "Manual of Golems", "Necklace of Prayer Beads", "Robe of Useful Items", "Wand of Wonder"]) {
        const e = entries.find(x => x.name === n);
        if (!e) { console.log("INFO table " + n + ": entry missing"); continue; }
        for (const t of e.data.tables) console.log("INFO table " + n + " [" + (t.caption || t.columns.join("/")) + "]: " + (t.unparsed ? "UNPARSED (" + t.problem + ")" : t.rows.length + " rows") + (t.dice ? "; coverage " + JSON.stringify(t.coverage) : "; not a dice table"));
    }
    const readinessCount = {};
    for (const e of entries) readinessCount[e.readiness] = (readinessCount[e.readiness] || 0) + 1;
    const tableStats = { parsed: 0, unparsed: 0 };
    for (const e of entries) for (const t of e.data.tables) tableStats[t.unparsed ? "unparsed" : "parsed"]++;
    console.log("INFO readiness: " + JSON.stringify(readinessCount) + "; tables: " + JSON.stringify(tableStats) + "; warnings: " + warnings.length);
    for (const e of entries) if (e.readiness !== "parsed") console.log("INFO extracted: " + e.id + " (pages " + e.source.pages.join(",") + "): " + e.notes.join("; "));
    for (const f of failures) if (!/^count |^duplicate ids|^non-empty|^required data|^spot |^page attribution/.test(f)) console.log("FAIL " + f);

    // ---- write
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const out = {
        metadata: {
            generator: "tools/srd_extract/stage_magic_items.js", generatedAt: new Date().toISOString(), category: CATEGORY,
            source: { file: cacheManifest.source.file, sha256: cacheManifest.source.sha256, pages: [PAGES] },
            cache: { generatedAt: cacheManifest.generatedAt }, license: cacheManifest.license, counts, readiness: readinessCount,
            columnCut: { method: "nearest 2+ space run to the raw gutter of splitRawLayoutColumns, normalised after the cut", linesMoved: movedTotal }
        },
        entries, warnings
    };
    fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
    console.log("wrote " + path.relative(path.resolve(__dirname, "..", ".."), OUT) + " (" + entries.length + " entries, " + warnings.length + " warnings)");
    console.log(failures.length ? "FAIL stage_magic_items: " + failures.length + " failure(s)" : "PASS stage_magic_items: all checks passed");
    process.exit(failures.length ? 1 : 0);
}

main();
