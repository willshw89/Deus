// tools/srd_extract/stage_spells.js - SRD 5.1 stager for the `spells` category.
//
// Usage: node tools/srd_extract/stage_spells.js [--dump "<spell name>"]
//
// Reads the page cache (tools/srd_extract/cache, written by extract_pages.js) and writes
// tools/srd_extract/staging/staging_spells.json with two kinds of entry:
//   spell       pages 114-194 (Spell Descriptions), one entry per spell
//   spell-list  pages 105-113 (Spell Lists), one entry per casting class
// The contract is docs/SRD5_1_COVERAGE_MANIFEST.md (sections 4-7). Nothing here paraphrases the
// text: `text` is the cached text as printed, unwrapped into paragraphs, and every structured field
// is copied from the page or left null with a note.
//
// How the pages are read. Structure comes from the layout pages (page_NNN.layout.txt). Each page is
// split into its two columns (left column then right column is reading order) and the columns of
// pages 114-194 are concatenated into one line stream. A spell starts at its name line, which is the
// line before a level line ("2nd-level divination (ritual)", "Evocation cantrip"); the four header
// lines follow (a value continues on the next line when it wraps, indented or not); the description
// runs to the next name. Paragraph starts carry a first-line indent in the layout; bullet items and
// table rows are kept as separate lines. Blank lines inside a column are not trusted on their own
// (the layout inserts empty rows wherever the other column's line pitch differs), so a blank line
// before a non-indented prose line is checked against the reading-order page, which knows the real
// paragraph breaks of a column but scrambles tables.
//
// Column splitting. Columns are cut on the raw layout variant (page_NNN.layout.raw.txt: physical
// layout, unnormalised, exact column positions) and every part is normalised after the cut, so
// the PDF's multi-code hyphens can never move a line's right-column text (on the normalised layout
// variant they did, by two or three columns per hyphen, because pdftotext had padded the right
// column to an absolute column before the codes were collapsed). lib/srd_text.js
// splitRawLayoutColumns supplies the gutter decision; its rightStart is not used because it cuts
// the left column short on lines whose text runs past the gutter. The cut is made per line, at the
// first run of two or more spaces whose left part prints no wider than the page's modal
// right-column start; the shift per hyphen is still measured from the cache and reported (expected
// 0 on the raw variant) and the hyphen window stays as a guard.
//
// Self-check: the run ends with PASS/FAIL lines and exits 1 on any FAIL. Counts are reported as
// found, never padded.
"use strict";

const fs = require("fs");
const path = require("path");
const T = require("./lib/srd_text");

const ROOT = path.resolve(__dirname, "..", "..");
const CACHE_DIR = path.join(__dirname, "cache");
const STAGING_DIR = path.join(__dirname, "staging");
const OUT_FILE = path.join(STAGING_DIR, "staging_spells.json");

const LIST_PAGES = [105, 113];
const DESC_PAGES = [114, 194];
const LIST_SECTION = "Spell Lists";
const DESC_SECTION = "Spell Descriptions";
const EXPECTED_SPELLS = 319, SPELL_TOLERANCE = 2, EXPECTED_LISTS = 8;
const CLASSES = ["bard", "cleric", "druid", "paladin", "ranger", "sorcerer", "warlock", "wizard"];
const SCHOOLS = new Set(["abjuration", "conjuration", "divination", "enchantment", "evocation", "illusion", "necromancy", "transmutation"]);
const SPOT_CHECK = ["Acid Arrow", "Augury", "Fireball", "Wish", "Prestidigitation"];

// A level line: "2nd-level divination (ritual)", "Evocation cantrip". The dash between the ordinal
// and "level" is "-" in the PDF; the cache may still carry the residual "-" U+2011 pair.
const DASH = "[-\\u2010\\u2011\\u2012\\u2013]";
const LEVEL_RE = new RegExp("^(?:(\\d)(?:st|nd|rd|th)" + DASH + "+level\\s+([A-Za-z]+)(\\s*\\(ritual\\))?|([A-Za-z]+)\\s+cantrip(\\s*\\(ritual\\))?)\\s*$", "i");
const HEADER_RE = /^(Casting Time|Range|Components?|Duration):\s*(.*)$/;
const HEADER_KEYS = { "casting time": "castingTime", range: "range", components: "components", component: "components", duration: "duration" };
const BULLET = "•";
const HIGHER = /^At Higher Levels\./;
const LIST_CLASS_RE = /^([A-Z][a-z]+) Spells$/;
const LIST_LEVEL_RE = /^(?:Cantrips \(0 Level\)|(\d)(?:st|nd|rd|th) Level)$/;

const args = process.argv.slice(2);
const dumpName = (() => { const i = args.indexOf("--dump"); return i >= 0 ? args[i + 1] : null; })();
const verbose = args.includes("--verbose");
const LIMIT = verbose ? Infinity : 20;

const pad = n => String(n).padStart(3, "0");
/** One cached page: "raw" = page_NNN.layout.raw.txt (physical layout, unnormalised, exact columns),
 *  "reading" = page_NNN.txt (reading order, normalised). The normalised layout variant is not read. */
const readPage = (n, variant) => fs.readFileSync(path.join(CACHE_DIR, `page_${pad(n)}${variant === "raw" ? ".layout.raw" : ""}.txt`), "utf8");
const tokenKey = (s, n) => T.toPlain(s).toLowerCase().split(/\s+/).filter(Boolean).slice(0, n).join(" ");

// ---------------------------------------------------------------------------------------------
// Column splitting
// ---------------------------------------------------------------------------------------------

/**
 * Joining hyphens in a normalised string (preceded by a non-space character, as in "24-hour" or
 * "long-"; a minus sign as in "takes a -2" is not one). The PDF encodes a hyphen as up to four
 * glyph codes and pdftotext pads the right column to its absolute character column, so on the
 * normalised layout variant every hyphen in the left part of a line left that line's right-column
 * text up to MAX_SHIFT_PER_HYPHEN columns left. Columns are now cut on the raw layout variant,
 * where that shift does not exist; the window stays as a guard and the shift actually present is
 * measured from the cache (measureShift) and reported, never assumed.
 */
const HYPHEN_RE = /(?<=\S)[-‐‑]/g;
const hyphensIn = s => (s.match(HYPHEN_RE) || []).length;
const MAX_SHIFT_PER_HYPHEN = 3;

/** A raw layout page: its right-trimmed raw lines, the lib's gutter decision (made on the raw
 *  text by splitRawLayoutColumns) and the modal right-column start R (null for one column). */
function rawPage(p, opts) {
    const raw = readPage(p, "raw");
    const lib = T.splitRawLayoutColumns(raw, opts);
    const rawLines = raw.replace(/\r\n?/g, "\n").split("\n").map(l => l.replace(/\s+$/, ""));
    return { rawLines, gutter: lib.gutter, R: lib.gutter === null ? null : modalRightStart(rawLines, lib.gutter) };
}

/** The page's modal right-column start: the most common end of a run of spaces near the gutter. */
function modalRightStart(lines, gutter) {
    const hist = new Map();
    for (const l of lines) {
        const rx = / {2,}/g; let m;
        while ((m = rx.exec(l)) !== null) {
            const e = m.index + m[0].length;
            if (e >= gutter - 4 && e <= gutter + 20 && e < l.length) hist.set(e, (hist.get(e) || 0) + 1);
        }
    }
    let R = null, best = 0;
    for (const [e, n] of hist) if (n > best) { best = n; R = e; }
    return R;
}

/**
 * Where one right-trimmed RAW layout line splits: at the end of the gutter run, the first run of
 * 2+ spaces whose left part prints (normalised) no wider than R - 2 and which ends at or after
 * R - MAX_SHIFT_PER_HYPHEN * h - 2, h being the joining hyphens in that printed left part (the
 * guard; on raw lines the gutter run ends at R plus the right text's indent). A run ending earlier
 * lies inside the left column's text (a wide table row). Positions are raw; the raw left part is
 * wider than its printed width by the hyphen codes, and when it runs past R pdftotext pushes the
 * right text after a two-space gap, which this still finds. Returns { cut, h, problem }: cut is the
 * line length for a left-only line; problem is set for a line that reaches the right column
 * without a gutter run (kept in the left column).
 */
function cutLine(raw, R) {
    const rx = / {2,}/g; let m;
    while ((m = rx.exec(raw)) !== null) {
        const start = m.index, e = start + m[0].length;
        if (e >= raw.length) break;
        const printed = T.normalizeText(raw.slice(0, start));
        if (printed.length > R - 2) break;
        const h = hyphensIn(printed);
        if (e >= R - MAX_SHIFT_PER_HYPHEN * h - 2) return { cut: e, h, problem: false };
    }
    return { cut: raw.length, h: 0, problem: T.normalizeText(raw).length > R - 1 };
}

/**
 * The shift of right-column text per hyphen in the left part, measured on the raw layout pages
 * first..last: the most common value of R - cut over lines whose left part holds exactly one
 * joining hyphen (0 when the cache does not shift, which is the expectation for the raw variant).
 * Returned with the sample count so the run can report it.
 */
function measureShift(first, last, opts) {
    const hist = new Map();
    for (let p = first; p <= last; p++) {
        const { rawLines, R } = rawPage(p, opts);
        if (R === null) continue;
        for (const raw of rawLines) {
            const { cut, h, problem } = cutLine(raw, R);
            if (problem || cut === 0 || cut >= raw.length || h !== 1) continue;
            const d = R - cut;
            if (d >= 0) hist.set(d, (hist.get(d) || 0) + 1);
        }
    }
    let shift = 0, best = 0, samples = 0;
    for (const [d, n] of hist) { samples += n; if (n > best) { best = n; shift = d; } }
    return { shift, samples };
}

/**
 * Split one raw layout page into columns: [{ col, lines }] in reading order, every line normalised
 * after the cut. The gutter decision is splitRawLayoutColumns'; R is the page's modal right-column
 * start; each raw line is cut by cutLine. The right part keeps its indent relative to where its
 * text starts on this line (R less the measured shift per hyphen, 0 on the raw variant), so an
 * indented paragraph start in the right column still reads as indented.
 */
function splitColumns(p, page, warnings, opts, shift = 0) {
    const { rawLines, gutter, R } = rawPage(p, opts);
    const single = () => [{ col: 0, lines: rawLines.map(l => T.normalizeText(l).replace(/\s+$/, "")) }];
    if (gutter === null) return single();
    if (R === null) {
        warnings.push({ page, message: "column split: gutter found but no right-column start; page read as one column" });
        return single();
    }
    const left = [], right = [];
    for (const raw of rawLines) {
        const { cut, h, problem } = cutLine(raw, R);
        if (problem) warnings.push({ page, message: `column split ambiguous, line kept in the left column: ${JSON.stringify(T.normalizeText(raw).trim())}` });
        const rightIndent = Math.max(0, cut - (R - shift * h));
        left.push(T.normalizeText(raw.slice(0, cut)).replace(/\s+$/, ""));
        right.push(cut < raw.length ? " ".repeat(rightIndent) + T.normalizeText(raw.slice(cut)).replace(/\s+$/, "") : "");
    }
    return [{ col: 0, lines: left }, { col: 1, lines: right }];
}

/** Concatenate the columns of pages first..last into one line stream; records the measured column
 *  shift in meta.columnShift when meta is given. */
function buildStream(first, last, warnings, opts, meta) {
    const stream = [];
    const measured = measureShift(first, last, opts);
    if (meta) meta.columnShift = measured;
    for (let p = first; p <= last; p++) {
        const cols = splitColumns(p, p, warnings, opts, measured.shift);
        for (const c of cols) {
            let seen = false;
            for (const raw of c.lines) {
                const text = raw.trim();
                const line = { page: p, col: c.col, raw, text, indent: raw.length - raw.replace(/^ +/, "").length, colStart: false };
                if (text && !seen) { line.colStart = true; seen = true; }
                stream.push(line);
            }
        }
    }
    return stream;
}

// ---------------------------------------------------------------------------------------------
// Spell descriptions (pages 114-194)
// ---------------------------------------------------------------------------------------------

function parseLevelLine(text) {
    const m = text.match(LEVEL_RE);
    if (!m) return null;
    if (m[1] !== undefined) {
        const school = m[2].toLowerCase();
        return { level: parseInt(m[1], 10), school, ritual: !!m[3], known: SCHOOLS.has(school) };
    }
    const school = m[4].toLowerCase();
    return { level: 0, school, ritual: !!m[5], known: SCHOOLS.has(school) };
}

/** The reading-order text of the given pages as one whitespace-normalised string (cached per page). */
const roPageCache = new Map();
function readingOrderText(pages) {
    return pages.map(p => { if (!roPageCache.has(p)) roPageCache.set(p, normWS(readPage(p, "reading"))); return roPageCache.get(p); }).join(" ");
}

/** Reading-order paragraph starts per page: "page|first five words" -> true. */
function readingOrderParagraphStarts(first, last) {
    const starts = new Set();
    for (let p = first; p <= last; p++) {
        for (const line of readPage(p, "reading").split("\n")) {
            const t = line.trim();
            if (t) starts.add(p + "|" + tokenKey(t, 5));
        }
    }
    return starts;
}

// ---------------------------------------------------------------------------------------------
// Tables. Seven spells print tables. The specs below describe structure only (caption, column
// names, dice, how coverage is judged); every cell comes from the page, and a table that cannot be
// reconstructed stays as its printed lines with a note.
//
// Grid tables (all but Confusion) are read column-major from the raw layout: fragments (runs of
// text separated by 2+ spaces) are clustered into the spec's column groups by the widest gaps
// between their start positions; the header words are consumed from the top of each group (they
// wrap onto data lines: "Similar" / "Area"); the remaining fragments are the group's cells in row
// order, which also resolves cells printed a row above or below their label (Animate Objects'
// Str/Dex, Scrying's Connection modifiers, Teleport's range columns). A wrapped label (a fragment
// starting in lower case: "circle", "object", "destination") joins the previous label; a wrapped
// text cell on an unlabelled line ("damage") joins the previous cell when it does not parse as the
// group's cell types. Any group that took a cell from an unlabelled line must be listed in the same
// order by the reading-order page, which prints these tables column-major. Confusion is a
// labelled-row table (d10 | Behavior) whose "9–10" label is printed beside the wrapped tail of row
// 7–8; the cell boundary is the sentence boundary, and the note says so. Dice ranges are validated
// for inclusive coverage of the die (one partition per table, or per row for Teleport).
// ---------------------------------------------------------------------------------------------

const TABLE_SPECS = {
    "Animate Objects": [{ caption: "Animated Object Statistics", columns: ["Size", "HP", "AC", "Attack", "Str", "Dex"], groups: [["Size"], ["HP", "AC", "Attack"], ["Str", "Dex"]], types: { HP: "int", AC: "int", Str: "int", Dex: "int" }, dice: null, coverage: null }],
    "Confusion": [{ layout: "labelled", caption: null, columns: ["d10", "Behavior"], dice: "d10", coverage: "table" }],
    "Control Weather": [
        { caption: "Precipitation", columns: ["Stage", "Condition"], dice: null, coverage: null },
        { caption: "Temperature", columns: ["Stage", "Condition"], dice: null, coverage: null },
        { caption: "Wind", columns: ["Stage", "Condition"], dice: null, coverage: null }
    ],
    "Creation": [{ caption: null, columns: ["Material", "Duration"], dice: null, coverage: null }],
    "Reincarnate": [{ caption: null, columns: ["d100", "Race"], dice: "d100", coverage: "table" }],
    "Scrying": [
        { caption: null, columns: ["Knowledge", "Save Modifier"], dice: null, coverage: null },
        { caption: null, columns: ["Connection", "Save Modifier"], dice: null, coverage: null }
    ],
    "Teleport": [{ caption: null, columns: ["Familiarity", "Mishap", "Similar Area", "Off Target", "On Target"], dice: "d100", coverage: "row", rangeColumns: [1, 2, 3, 4] }]
};

const RANGE_RE = /^(\d{1,3})(?:[–—-](\d{1,3}))?$/;
const LABEL_RE = /^(\d{1,3}(?:[–—-]\d{1,3})?)\s+(.*)$/;
const normWS = s => String(s).replace(/\s+/g, " ").trim();

/** "01–04" -> { min: 1, max: 4, text }; "97–00" on a d100 -> max 100; null when not a range of the die. */
function parseRange(text, die) {
    const m = RANGE_RE.exec(text);
    if (!m) return null;
    const conv = s => { const v = parseInt(s, 10); return die === 100 && v === 0 ? 100 : v; };
    const min = conv(m[1]), max = m[2] === undefined ? min : conv(m[2]);
    if (min < 1 || max > die || min > max) return null;
    return { min, max, text };
}

/** Gaps and overlaps of inclusive ranges over 1..die, as [min, max] runs. */
function coverageOf(ranges, die) {
    const count = new Array(die + 1).fill(0);
    for (const r of ranges) for (let v = r.min; v <= r.max; v++) count[v]++;
    const runs = pred => { const out = []; let start = null; for (let v = 1; v <= die + 1; v++) { const on = v <= die && pred(count[v]); if (on && start === null) start = v; if (!on && start !== null) { out.push([start, v - 1]); start = null; } } return out; };
    return { gaps: runs(n => n === 0), overlaps: runs(n => n > 1) };
}

/** Text fragments of a layout line separated by runs of 2+ spaces, with their start columns. */
function fragmentsOf(raw) {
    const out = [];
    const rx = / {2,}/g; let pos = 0, m;
    const push = (s, e) => { const t = raw.slice(s, e); const lead = t.length - t.replace(/^ +/, "").length; const text = t.trim(); if (text) out.push({ start: s + lead, text }); };
    while ((m = rx.exec(raw)) !== null) { push(pos, m.index); pos = m.index + m[0].length; }
    push(pos, raw.length);
    return out;
}

/** Split sorted distinct start columns into K clusters at the K - 1 widest gaps; null when ambiguous. */
function clusterStarts(starts, K) {
    const uniq = [...new Set(starts)].sort((a, b) => a - b);
    if (uniq.length < K) return null;
    if (K === 1) return [uniq];
    const gaps = uniq.slice(1).map((v, i) => ({ gap: v - uniq[i], at: i }));
    const sorted = gaps.slice().sort((a, b) => b.gap - a.gap);
    const chosen = sorted.slice(0, K - 1);
    if (sorted.length > K - 1 && sorted[K - 1].gap === chosen[K - 2].gap) return null;
    const cuts = new Set(chosen.map(g => g.at));
    const clusters = [[uniq[0]]];
    for (let i = 1; i < uniq.length; i++) { if (cuts.has(i - 1)) clusters.push([]); clusters[clusters.length - 1].push(uniq[i]); }
    return clusters;
}

/** Split one fragment into a group's cells by type ("int" cells are leading integers, the last text cell takes the rest); null when it does not fit. */
function splitFragment(text, cols, types) {
    if (cols.length === 1) return [text];
    const out = []; let rest = text;
    for (let i = 0; i < cols.length; i++) {
        const last = i === cols.length - 1;
        if ((types || {})[cols[i]] === "int") {
            const m = last ? /^([+-]?\d+)$/.exec(rest) : /^([+-]?\d+)\s+(.*)$/.exec(rest);
            if (!m) return null;
            out.push(m[1]); rest = last ? "" : m[2];
        } else {
            if (!last) return null;
            out.push(rest.trim());
        }
    }
    return out;
}

/** A grid table from `lines` at or after index `from`. Returns { ok, table, from, to, rendered } or { ok: false, reason }. */
function parseGridTable(lines, from, spec, roText) {
    const groups = spec.groups || spec.columns.map(c => [c]);
    const first = spec.columns[0];
    let h = -1;
    for (let i = from; i < lines.length; i++) { const t = lines[i].text; if (t === first || t.startsWith(first + " ")) { h = i; break; } }
    if (h < 0) return { ok: false, reason: `header "${first}" not found` };
    const notes = [];
    let caption = null;
    if (spec.caption) {
        let j = h - 1; while (j >= 0 && !lines[j].text) j--;
        if (j >= 0 && lines[j].text === spec.caption) caption = spec.caption; else notes.push(`caption "${spec.caption}" not found before the header`);
    }
    let end = h + 1;
    const tableLike = l => !l.text || /\S {2,}\S/.test(l.text) || l.indent >= 4;
    while (end < lines.length && tableLike(lines[end])) end++;
    while (end > h + 1 && !lines[end - 1].text) end--;

    const frags = [];
    for (let i = h; i < end; i++) if (lines[i].text) for (const f of fragmentsOf(lines[i].raw)) frags.push(Object.assign({ line: i }, f));
    const clusters = clusterStarts(frags.map(f => f.start), groups.length);
    if (!clusters) return { ok: false, reason: `cannot separate ${groups.length} columns by position` };
    const clusterOf = start => clusters.findIndex(c => c[0] <= start && start <= c[c.length - 1]);
    const groupFrags = groups.map(() => []);
    for (const f0 of frags) {
        // A cell that fills its column is separated from the next column by a single space
        // ("Medium 40 13 +5 to hit, ..."): split it at that column's start, which the header and
        // the other rows fix.
        let f = f0;
        for (;;) {
            const c = clusterOf(f.start);
            if (c < 0) return { ok: false, reason: `fragment ${JSON.stringify(f.text)} at column ${f.start} belongs to no column` };
            const next = c + 1 < clusters.length ? clusters[c + 1][0] : Infinity;
            if (f.start + f.text.length <= next) { groupFrags[c].push(f); break; }
            const cutAt = next - f.start;
            if (f.text[cutAt - 1] !== " " || f.text[cutAt] === " ") return { ok: false, reason: `${JSON.stringify(f.text)} runs across the column starting at ${next}` };
            groupFrags[c].push({ line: f.line, start: f.start, text: f.text.slice(0, cutAt).trim() });
            f = { line: f.line, start: next, text: f.text.slice(cutAt) };
        }
    }

    // Header words, consumed from the top of each group (they may wrap onto the next line).
    const data = [];
    for (let g = 0; g < groups.length; g++) {
        const name = groups[g].join(" ");
        let acc = "", k = 0;
        while (k < groupFrags[g].length && acc !== name) {
            acc = (acc + " " + groupFrags[g][k].text).trim(); k++;
            if (!name.startsWith(acc)) return { ok: false, reason: `header of column ${JSON.stringify(name)} reads ${JSON.stringify(acc)}` };
        }
        if (acc !== name) return { ok: false, reason: `header ${JSON.stringify(name)} incomplete` };
        data.push(groupFrags[g].slice(k));
    }
    // Row labels: the first group, wrapped labels (lower-case start) joined to the previous one.
    const labels = [];
    for (const f of data[0]) { if (/^[a-z]/.test(f.text) && labels.length) labels[labels.length - 1].text += " " + f.text; else labels.push({ text: f.text, line: f.line }); }
    const N = labels.length;
    if (!N) return { ok: false, reason: "no rows" };
    const labelledLines = new Set(data[0].map(f => f.line));
    // Other groups: cells in row order; wrapped text cells on unlabelled lines join the previous cell.
    const groupCells = [labels.map(l => [l.text])];
    for (let g = 1; g < groups.length; g++) {
        const cols = groups[g]; const cells = []; let offset = false;
        const lastIsText = (spec.types || {})[cols[cols.length - 1]] !== "int";
        for (const f of data[g]) {
            const split = splitFragment(f.text, cols, spec.types);
            const unlabelled = !labelledLines.has(f.line);
            if (split) { cells.push(split); if (unlabelled) offset = true; }
            else if (unlabelled && cells.length && lastIsText) cells[cells.length - 1][cols.length - 1] += " " + f.text;
            else return { ok: false, reason: `cannot place ${JSON.stringify(f.text)} in column ${cols.join("/")}` };
        }
        if (cells.length !== N) return { ok: false, reason: `column ${cols.join("/")} has ${cells.length} cells for ${N} rows` };
        const columnMajor = normWS([cols.join(" "), ...cells.map(c => c.join(" "))].join(" "));
        const roOrder = roText.includes(columnMajor);
        if (offset && !roOrder) return { ok: false, reason: `column ${cols.join("/")} took cells from unlabelled lines and the reading order does not list them in that order` };
        groupCells.push(cells);
    }
    const rows = [];
    for (let r = 0; r < N; r++) rows.push({ roll: null, cells: groupCells.map(gc => gc[r]).flat() });

    // Dice and coverage.
    const die = spec.dice ? parseInt(spec.dice.slice(1), 10) : null;
    let coverage = null;
    if (spec.coverage === "table") {
        const col = spec.columns.indexOf(spec.dice);
        const ranges = [];
        for (const row of rows) {
            const r = parseRange(row.cells[col], die);
            if (!r) return { ok: false, reason: `${JSON.stringify(row.cells[col])} is not a ${spec.dice} range` };
            row.roll = r; ranges.push(r);
        }
        const c = coverageOf(ranges, die);
        coverage = { complete: !c.gaps.length && !c.overlaps.length, gaps: c.gaps.map(v => ({ row: null, ranges: [v] })), overlaps: c.overlaps.map(v => ({ row: null, ranges: [v] })) };
    } else if (spec.coverage === "row") {
        const gaps = [], overlaps = [];
        for (const row of rows) {
            const ranges = [];
            for (const ci of spec.rangeColumns) {
                const cell = row.cells[ci];
                if (cell === "—") continue;
                const r = parseRange(cell, die);
                if (!r) return { ok: false, reason: `${JSON.stringify(cell)} in row ${JSON.stringify(row.cells[0])} is not a ${spec.dice} range` };
                ranges.push(r);
            }
            const c = coverageOf(ranges, die);
            if (c.gaps.length) gaps.push({ row: row.cells[0], ranges: c.gaps });
            if (c.overlaps.length) overlaps.push({ row: row.cells[0], ranges: c.overlaps });
        }
        coverage = { complete: !gaps.length && !overlaps.length, gaps, overlaps };
    }
    const table = { caption, dice: spec.dice || null, columns: spec.columns.slice(), rows, footnotes: [], coverage };
    const rendered = [spec.columns.join(" | "), ...rows.map(r => r.cells.join(" | "))];
    return { ok: true, table, from: h, to: end, rendered, notes };
}

/** A labelled-row table (Confusion): "label text..." rows with wrapped continuation lines. */
function parseLabelledTable(lines, from, spec) {
    const header = spec.columns.join(" ");
    let h = -1;
    for (let i = from; i < lines.length; i++) if (lines[i].text === header) { h = i; break; }
    if (h < 0) return { ok: false, reason: `header ${JSON.stringify(header)} not found` };
    const notes = [];
    const rows = [];
    let pending = null, i = h + 1;
    for (; i < lines.length; i++) {
        const l = lines[i];
        if (!l.text) continue;
        const m = LABEL_RE.exec(l.text);
        if (m && !pending) {
            if (/^[a-z]/.test(m[2])) {
                if (!rows.length) return { ok: false, reason: `row ${m[1]} starts mid-sentence with no previous row` };
                rows[rows.length - 1].text += " " + m[2];
                pending = { label: m[1], line: i };
                notes.push(`row ${m[1]}: label printed beside the wrapped text of row ${rows[rows.length - 1].label} (page ${l.page}); its cell starts at the next sentence`);
            } else rows.push({ label: m[1], text: m[2], line: i });
            continue;
        }
        if (l.indent >= 4) {
            // A continuation line. While a label is pending, the first sentence start after a
            // finished sentence opens that label's cell; everything before it belongs to the row above.
            if (pending && /^[A-Z]/.test(l.text) && /[.!?]$/.test(rows[rows.length - 1].text)) { rows.push({ label: pending.label, text: l.text, line: pending.line }); pending = null; }
            else if (rows.length) rows[rows.length - 1].text += " " + l.text;
            else return { ok: false, reason: "continuation line before the first row" };
            continue;
        }
        break;
    }
    if (pending) return { ok: false, reason: `row ${pending.label} has no cell` };
    let end = i; while (end > h + 1 && !lines[end - 1].text) end--;
    if (!rows.length) return { ok: false, reason: "no rows" };
    const die = parseInt(spec.dice.slice(1), 10);
    const ranges = [];
    const outRows = rows.map(r => {
        const roll = parseRange(r.label, die);
        if (roll) ranges.push(roll);
        return { roll, cells: [r.label, r.text] };
    });
    if (ranges.length !== rows.length) return { ok: false, reason: "a row label is not a range of the die" };
    const c = coverageOf(ranges, die);
    const coverage = { complete: !c.gaps.length && !c.overlaps.length, gaps: c.gaps.map(v => ({ row: null, ranges: [v] })), overlaps: c.overlaps.map(v => ({ row: null, ranges: [v] })) };
    const table = { caption: spec.caption || null, dice: spec.dice, columns: spec.columns.slice(), rows: outRows, footnotes: [], coverage };
    const rendered = [spec.columns.join(" | "), ...outRows.map(r => r.cells.join(" | "))];
    return { ok: true, table, from: h, to: end, rendered, notes };
}

/** All tables of one spell: regions (line index -> { to, rendered }) for buildBlocks and data.tables. */
function parseSpellTables(name, lines, roText, notes) {
    const regions = new Map(), tables = [];
    let from = 0;
    for (const spec of TABLE_SPECS[name] || []) {
        const r = spec.layout === "labelled" ? parseLabelledTable(lines, from, spec) : parseGridTable(lines, from, spec, roText);
        const label = spec.caption || spec.columns.join("/");
        if (!r.ok) { notes.push(`table ${label}: not reconstructed (${r.reason}); printed lines kept`); continue; }
        for (const n of r.notes) notes.push(`table ${label}: ${n}`);
        if (r.table.coverage && !r.table.coverage.complete) notes.push(`table ${label}: ${spec.dice} coverage incomplete`);
        regions.set(r.from, { to: r.to, rendered: r.rendered });
        tables.push(r.table);
        from = r.to;
    }
    return { regions, tables };
}

/**
 * Build description blocks from layout lines. Block types: "p" (prose, lines joined with spaces),
 * "bullets" (one item per line), "table" (one row per line: a parsed table's rendered rows, or the
 * printed rows with their spacing kept when no table was parsed there).
 *
 * Paragraph rules, from the SRD's typography: a prose paragraph after the first starts with a
 * first-line indent; an unindented line starts a paragraph only after the header block, a bullet
 * list or a table, or when it is a caption (short, capitalised, unpunctuated, followed by a table
 * or a list). A blank row before an unindented prose line is otherwise ignored: the layout puts
 * empty rows wherever the other column's line pitch differs, and the reading-order page breaks at
 * the same rows (page 132: "...10 gallons of clean" / "water within range..."), so it cannot
 * arbitrate them. Every such decision is recorded in `diag` (printed with --verbose).
 */
function buildBlocks(lines, paraStarts, diag, spellName, regions = new Map()) {
    const blocks = [];
    let cur = null;
    let blankPending = false;
    let prevText = "";
    const open = (type, line) => { cur = { type, items: [{ text: line.text, page: line.page, indented: line.indent >= 1 }] }; blocks.push(cur); };
    const append = line => { cur.items[cur.items.length - 1].text += " " + line.text; };
    const addItem = line => { cur.items.push({ text: line.text, page: line.page, indented: line.indent >= 1 }); };
    const nextNonBlank = i => { for (let j = i + 1; j < lines.length; j++) if (lines[j].text) return lines[j]; return null; };
    const startsBlock = l => !!l && (l.text.startsWith(BULLET) || /\S {2,}\S/.test(l.text) || l.indent >= 4);

    for (let i = 0; i < lines.length; i++) {
        const ln = lines[i];
        if (regions.has(i)) {
            const r = regions.get(i);
            cur = { type: "table", parsed: true, items: r.rendered.map(text => ({ text, page: ln.page, indented: false })) };
            blocks.push(cur);
            blankPending = false; prevText = r.rendered[r.rendered.length - 1];
            i = r.to - 1;
            continue;
        }
        if (!ln.text) { blankPending = true; continue; }
        if (ln.colStart) blankPending = false;
        const isBullet = ln.text.startsWith(BULLET);
        const hasRun = /\S {2,}\S/.test(ln.text);
        const roStart = paraStarts.has(ln.page + "|" + tokenKey(ln.text, 5));
        let handled = false;

        if (isBullet) {
            if (cur && cur.type === "bullets") addItem(ln); else open("bullets", ln);
            handled = true;
        } else if (cur && cur.type === "bullets" && ln.indent >= 1 && !hasRun) {
            // An indented line after a bullet item continues it unless a blank row separates them
            // and the reading order also starts a paragraph there.
            const continues = !blankPending || /^[a-z]/.test(ln.text) || !roStart;
            diag.push({ spell: spellName, page: ln.page, kind: "after bullet", prev: prevText, text: ln.text, roStart, decision: continues ? "joined to the bullet item" : "paragraph" });
            if (continues) { append(ln); handled = true; }
        }
        if (!handled) {
            if (hasRun) {
                if (cur && cur.type === "table") addItem(ln); else open("table", ln);
            } else if (cur && cur.type === "table" && ln.indent >= 4) {
                addItem(ln);
            } else if (cur && cur.type === "p" && ln.indent >= 4) {
                append(ln);
            } else if (ln.indent >= 1) {
                open("p", ln);
            } else if (!cur || cur.type !== "p") {
                open("p", ln);
            } else if (blankPending && !ln.colStart) {
                const captionLike = /^[A-Z]/.test(ln.text) && ln.text.length <= 48 && !/[.,;:]$/.test(ln.text) && startsBlock(nextNonBlank(i));
                const paragraph = roStart && captionLike;
                diag.push({ spell: spellName, page: ln.page, kind: "blank row", prev: prevText, text: ln.text, roStart, decision: paragraph ? "paragraph (caption)" : "joined" });
                if (paragraph) open("p", ln); else append(ln);
            } else {
                append(ln);
            }
        }
        blankPending = false;
        prevText = ln.text;
    }
    return blocks;
}

/** A bullet or table block as one paragraph: one item or row per line. */
function blockText(b) {
    return b.items.map(i => i.text).join("\n");
}

function parseComponents(value, notes) {
    const out = { verbal: false, somatic: false, material: false, materialDescription: null };
    if (value === undefined) return out;
    const open = value.indexOf("(");
    const head = (open >= 0 ? value.slice(0, open) : value).trim();
    if (open >= 0) {
        const close = value.lastIndexOf(")");
        if (close > open) out.materialDescription = value.slice(open + 1, close).trim();
        else { out.materialDescription = value.slice(open + 1).trim(); notes.push("components: material description has no closing parenthesis"); }
    }
    const tokens = head.split(",").map(s => s.trim()).filter(Boolean);
    for (const t of tokens) {
        if (t === "V") out.verbal = true;
        else if (t === "S") out.somatic = true;
        else if (t === "M") out.material = true;
        else notes.push(`components: unrecognised token ${JSON.stringify(t)}`);
    }
    if (out.material && out.materialDescription === null) notes.push("components: M without a material description");
    if (!out.material && out.materialDescription !== null) notes.push("components: material description without M");
    if (!tokens.length) notes.push("components: empty");
    return out;
}

function stageSpells(warnings, meta) {
    const stream = buildStream(DESC_PAGES[0], DESC_PAGES[1], warnings, undefined, meta);
    const paraStarts = readingOrderParagraphStarts(DESC_PAGES[0], DESC_PAGES[1]);
    meta.roStarts = paraStarts;
    meta.proseStarts = [];
    meta.bulletItems = [];
    meta.headerValues = [];
    meta.diag = [];
    meta.tablePages = new Set();
    meta.colStartKeys = new Set(stream.filter(l => l.colStart).map(l => l.page + "|" + tokenKey(l.text, 5)));

    // 1. Boundaries: every level line whose school is known, with the preceding non-blank line as the name.
    const bounds = [];
    for (let i = 0; i < stream.length; i++) {
        const ln = stream[i];
        if (!ln.text) continue;
        const lv = parseLevelLine(ln.text);
        if (!lv) continue;
        if (!lv.known) { warnings.push({ page: ln.page, message: `level-shaped line with unknown school ignored: ${JSON.stringify(ln.text)}` }); continue; }
        let j = i - 1;
        while (j >= 0 && !stream[j].text) j--;
        if (j < 0) { warnings.push({ page: ln.page, message: `level line without a name line: ${JSON.stringify(ln.text)}` }); continue; }
        bounds.push({ nameIdx: j, levelIdx: i, level: lv });
    }
    // Preamble before the first name (expected: the chapter title only).
    const preamble = stream.slice(0, bounds.length ? bounds[0].nameIdx : 0).map(l => l.text).filter(Boolean);
    if (preamble.join(" ") !== DESC_SECTION) warnings.push({ page: DESC_PAGES[0], message: `unexpected text before the first spell: ${JSON.stringify(preamble.join(" | "))}` });

    const entries = [];
    const ids = new Map();
    for (let b = 0; b < bounds.length; b++) {
        const { nameIdx, levelIdx, level } = bounds[b];
        const end = b + 1 < bounds.length ? bounds[b + 1].nameIdx : stream.length;
        const nameLine = stream[nameIdx];
        const name = nameLine.text;
        const notes = [];
        const pages = new Set([nameLine.page]);
        if (/\S {2,}\S/.test(name) || name.length > 48 || !/^[A-Z]/.test(name)) warnings.push({ page: nameLine.page, message: `suspicious spell name: ${JSON.stringify(name)}` });

        // 2. Header block.
        const header = {}; const headerOrder = []; const headerPrinted = [];
        let cur = null, k = levelIdx + 1, count = 0;
        while (k < end) {
            const ln = stream[k];
            if (!ln.text) { k++; continue; }
            const m = ln.text.match(HEADER_RE);
            if (m) {
                cur = HEADER_KEYS[m[1].toLowerCase()];
                header[cur] = m[2].trim();
                headerOrder.push(cur); headerPrinted.push(m[1]);
                pages.add(ln.page);
                k++; count++;
                if (cur === "duration") break;
            } else if (cur && count < 12) {
                header[cur] = (header[cur] + " " + ln.text).trim();
                pages.add(ln.page);
                k++; count++;
            } else {
                break;
            }
        }
        // A wrapped Duration value would start the next line in lower case; a description never does.
        if (cur === "duration") {
            let k2 = k; while (k2 < end && !stream[k2].text) k2++;
            if (k2 < end && /^[a-z]/.test(stream[k2].text) && !stream[k2].text.startsWith(BULLET)) {
                header.duration += " " + stream[k2].text; pages.add(stream[k2].page); k = k2 + 1;
                warnings.push({ page: stream[k2].page, message: `${name}: Duration value continued on the next line` });
            }
        }
        for (const key of ["castingTime", "range", "components", "duration"]) if (header[key] === undefined) notes.push(`header line missing: ${key}`);
        if (headerOrder.join(",") !== "castingTime,range,components,duration" && headerOrder.length === 4) notes.push(`header lines out of order: ${headerOrder.join(", ")}`);

        // 3. Description blocks.
        const descLines = stream.slice(k, end);
        for (const ln of descLines) if (ln.text) pages.add(ln.page);
        const parsedTables = parseSpellTables(name, descLines, readingOrderText([...pages]), notes);
        const blocks = buildBlocks(descLines, paraStarts, meta.diag, name, parsedTables.regions);
        const paragraphs = []; // { text, page, prose, indented }
        for (const blk of blocks) {
            if (blk.type === "p") for (const item of blk.items) paragraphs.push({ text: item.text, page: item.page, prose: true, indented: item.indented });
            else {
                paragraphs.push({ text: blockText(blk), page: blk.items[0].page, prose: false });
                if (blk.type === "table") for (const item of blk.items) meta.tablePages.add(item.page);
                if (blk.type === "bullets") for (const item of blk.items) meta.bulletItems.push({ page: item.page, text: item.text });
            }
        }
        paragraphs.forEach((p, i) => { if (p.prose) meta.proseStarts.push({ page: p.page, key: tokenKey(p.text, 5), name, indented: p.indented, first: i === 0 }); });
        for (const key of ["castingTime", "range", "components", "duration"]) if (header[key] !== undefined) meta.headerValues.push({ pages: [...pages], text: header[key] });

        let atHigherLevels = null;
        const descParas = [];
        paragraphs.forEach((p, i) => {
            if (HIGHER.test(p.text)) {
                if (atHigherLevels !== null) notes.push("more than one At Higher Levels paragraph");
                atHigherLevels = p.text;
                if (i !== paragraphs.length - 1) notes.push("At Higher Levels is not the last paragraph");
            } else {
                if (p.text.includes("At Higher Levels.")) notes.push("At Higher Levels found inside a paragraph, not at its start");
                descParas.push(p.text);
            }
        });
        if (!descParas.length) notes.push("description empty");

        // 4. Assemble text and data.
        const headerText = headerPrinted.map((printed, i) => `${printed}: ${header[headerOrder[i]]}`).join("\n");
        const text = [name, stream[levelIdx].text, headerText, ...paragraphs.map(p => p.text)].filter(s => s && s.length).join("\n\n");
        const components = parseComponents(header.components, notes);
        const duration = header.duration === undefined ? null : header.duration;
        const data = {
            level: level.level,
            school: level.school,
            ritual: level.ritual,
            castingTime: header.castingTime === undefined ? null : header.castingTime,
            range: header.range === undefined ? null : header.range,
            components,
            duration,
            concentration: duration !== null && /^Concentration\b/i.test(duration),
            description: descParas.join("\n\n"),
            atHigherLevels,
            classes: [],
            tables: parsedTables.tables
        };
        if (duration !== null && /concentration/i.test(duration) && !data.concentration) notes.push(`duration mentions concentration but does not start with it: ${JSON.stringify(duration)}`);

        let id = T.stableId("spell", name);
        if (ids.has(id)) {
            const variant = "p" + nameLine.page;
            warnings.push({ page: nameLine.page, message: `duplicate id ${id}; this entry becomes ${T.stableId("spell", name, variant)}` });
            id = T.stableId("spell", name, variant);
        }
        ids.set(id, true);

        const entry = {
            id, category: "spells", kind: "spell", name,
            source: { document: "SRD 5.1", pages: [...pages].sort((a, b) => a - b), section: DESC_SECTION, heading: name },
            text,
            data,
            dice: T.findDice(text).map(d => ({ text: d.text, count: d.count, sides: d.sides, modifier: d.modifier, average: d.average })),
            readiness: "extracted",
            notes
        };
        entries.push(entry);
    }
    meta.descStream = stream;
    return entries;
}

/** Required-field check for a spell (section 7 of the contract). Returns the missing fields. */
function spellMissingFields(d) {
    const missing = [];
    if (!Number.isInteger(d.level) || d.level < 0 || d.level > 9) missing.push("level");
    if (typeof d.school !== "string" || !SCHOOLS.has(d.school)) missing.push("school");
    if (typeof d.ritual !== "boolean") missing.push("ritual");
    if (typeof d.castingTime !== "string" || !d.castingTime) missing.push("castingTime");
    if (typeof d.range !== "string" || !d.range) missing.push("range");
    const c = d.components;
    if (!c || typeof c.verbal !== "boolean" || typeof c.somatic !== "boolean" || typeof c.material !== "boolean") missing.push("components");
    else if (!(c.verbal || c.somatic || c.material)) missing.push("components");
    else if (c.material && (typeof c.materialDescription !== "string" || !c.materialDescription)) missing.push("components.materialDescription");
    else if (!c.material && c.materialDescription !== null) missing.push("components.materialDescription");
    if (typeof d.duration !== "string" || !d.duration) missing.push("duration");
    if (typeof d.concentration !== "boolean") missing.push("concentration");
    if (typeof d.description !== "string" || !d.description) missing.push("description");
    if (!(d.atHigherLevels === null || (typeof d.atHigherLevels === "string" && d.atHigherLevels))) missing.push("atHigherLevels");
    if (!Array.isArray(d.classes)) missing.push("classes");
    return missing;
}

// ---------------------------------------------------------------------------------------------
// Spell lists (pages 105-113)
// ---------------------------------------------------------------------------------------------

function stageSpellLists(warnings) {
    const stream = buildStream(LIST_PAGES[0], LIST_PAGES[1], warnings, { minCol: 12, maxCol: 30, minRun: 2 });
    const lists = [];
    let list = null, group = null;
    for (const ln of stream) {
        if (!ln.text) continue;
        if (ln.text === LIST_SECTION) continue;
        let m;
        if ((m = ln.text.match(LIST_CLASS_RE))) {
            list = { name: ln.text, className: m[1].toLowerCase(), groups: [], pages: new Set([ln.page]) };
            lists.push(list); group = null;
        } else if ((m = ln.text.match(LIST_LEVEL_RE))) {
            if (!list) { warnings.push({ page: ln.page, message: `level heading before any class heading: ${JSON.stringify(ln.text)}` }); continue; }
            group = { level: m[1] === undefined ? 0 : parseInt(m[1], 10), heading: ln.text, names: [] };
            list.groups.push(group); list.pages.add(ln.page);
        } else {
            if (!list || !group) { warnings.push({ page: ln.page, message: `spell-list line outside a level group: ${JSON.stringify(ln.text)}` }); continue; }
            if (/\S {2,}\S/.test(ln.text)) warnings.push({ page: ln.page, message: `spell-list name with internal spacing: ${JSON.stringify(ln.text)}` });
            group.names.push(ln.text); list.pages.add(ln.page);
        }
    }
    const entries = [];
    for (const l of lists) {
        const notes = [];
        if (!CLASSES.includes(l.className)) notes.push(`class not in the expected set: ${l.className}`);
        if (!l.groups.length) notes.push("no level groups");
        for (const g of l.groups) if (!g.names.length) notes.push(`empty level group: ${g.heading}`);
        const text = [l.name, ...l.groups.map(g => [g.heading, ...g.names].join("\n"))].join("\n\n");
        entries.push({
            id: T.stableId("spell-list", l.name),
            category: "spells", kind: "spell-list", name: l.name,
            source: { document: "SRD 5.1", pages: [...l.pages].sort((a, b) => a - b), section: LIST_SECTION, heading: l.name },
            text,
            data: { class: l.className, spells: l.groups.map(g => ({ level: g.level, names: g.names.slice() })) },
            dice: T.findDice(text).map(d => ({ text: d.text, count: d.count, sides: d.sides, modifier: d.modifier, average: d.average })),
            readiness: "extracted",
            notes
        });
    }
    return entries;
}

// ---------------------------------------------------------------------------------------------
// Cross-reference and cross-check
// ---------------------------------------------------------------------------------------------

function crossReference(spells, lists) {
    const bySlug = new Map();
    for (const s of spells) bySlug.set(T.slugify(s.name), s);
    const unmatchedListNames = [];
    for (const l of lists) {
        for (const g of l.data.spells) {
            for (const n of g.names) {
                const s = bySlug.get(T.slugify(n));
                if (!s) { unmatchedListNames.push({ list: l.name, level: g.level, name: n }); l.notes.push(`no spell description matches ${JSON.stringify(n)} (${g.heading || "level " + g.level})`); continue; }
                if (!s.data.classes.includes(l.data.class)) s.data.classes.push(l.data.class);
                if (s.data.level !== g.level) s.notes.push(`${l.name} lists it at level ${g.level}, the description says ${s.data.level}`);
            }
        }
    }
    const unlisted = [];
    for (const s of spells) {
        s.data.classes.sort((a, b) => CLASSES.indexOf(a) - CLASSES.indexOf(b));
        if (!s.data.classes.length) { unlisted.push(s); s.notes.push("not on any class spell list"); }
    }
    return { unmatchedListNames, unlisted };
}

/**
 * Bag-of-words comparison of each spell's text with the same spell's span of the reading-order
 * pages. Word order differs inside tables (the reading order scrambles them); the multiset must not.
 */
function readingOrderCrossCheck(spells) {
    const lines = [];
    for (let p = DESC_PAGES[0]; p <= DESC_PAGES[1]; p++) for (const l of readPage(p, "reading").split("\n")) { const t = l.trim(); if (t) lines.push({ page: p, text: t }); }
    const starts = [];
    for (let i = 1; i < lines.length; i++) {
        const lv = parseLevelLine(lines[i].text);
        if (lv && lv.known) starts.push(i - 1);
    }
    const segments = new Map();
    for (let s = 0; s < starts.length; s++) {
        const from = starts[s], to = s + 1 < starts.length ? starts[s + 1] : lines.length;
        const name = lines[from].text;
        const key = T.slugify(name);
        segments.set(key, { name, tokens: lines.slice(from, to).map(l => l.text).join(" ").split(/\s+/).filter(Boolean) });
    }
    const mismatches = [];
    for (const sp of spells) {
        const seg = segments.get(T.slugify(sp.name));
        if (!seg) { mismatches.push({ name: sp.name, page: sp.source.pages[0], detail: "no reading-order segment" }); continue; }
        const bag = new Map();
        for (const t of sp.text.split(/\s+/).filter(t => t && t !== "|")) bag.set(t, (bag.get(t) || 0) + 1);
        for (const t of seg.tokens) bag.set(t, (bag.get(t) || 0) - 1);
        const extra = [], missing = [];
        for (const [t, n] of bag) { if (n > 0) extra.push(`${t}x${n}`); if (n < 0) missing.push(`${t}x${-n}`); }
        if (extra.length || missing.length) mismatches.push({ name: sp.name, page: sp.source.pages[0], detail: `layout-only: [${extra.join(", ")}] reading-order-only: [${missing.join(", ")}]` });
    }
    return { segments: segments.size, mismatches };
}

/**
 * Paragraph structure against the reading-order pages, where they can be trusted.
 * Splits: an unindented prose paragraph after the first one (started after a list, a table or as
 * a caption) must be a paragraph start in the reading order too. Indented paragraphs and first
 * paragraphs are not checked: the reading order merges "The GM has the creatures' statistics. At
 * Higher Levels..." and "Duration: 24 hours This spell lets you...".
 * Merges: every reading-order paragraph start must be one of the stager's paragraph starts or a
 * column top, ignoring the reading order's own artifacts: header wraps, bullet fragments (a line
 * that is part of a staged bullet item or holds a bullet character), material-description wrap
 * lines and lines starting in lower case. Lines on pages with a staged table are reported
 * separately: the reading order scrambles tables.
 */
function paragraphStructureCheck(spells, meta) {
    const mine = new Set(meta.proseStarts.map(s => s.page + "|" + s.key));
    const splits = meta.proseStarts.filter(s => !s.indented && !s.first && !meta.tablePages.has(s.page) && !meta.roStarts.has(s.page + "|" + s.key));
    const names = new Set(spells.map(s => s.name));
    const HEADER_ANY = /\b(Casting Time|Range|Components?|Duration): /;
    const merges = [], tableResidue = [];
    for (let p = DESC_PAGES[0]; p <= DESC_PAGES[1]; p++) {
        for (const l of readPage(p, "reading").split("\n")) {
            const t = l.trim();
            if (!t || t === DESC_SECTION || names.has(t) || parseLevelLine(t) || HEADER_ANY.test(t) || t.includes(BULLET) || /^[a-z]/.test(t)) continue;
            const key = p + "|" + tokenKey(t, 5);
            if (mine.has(key) || meta.colStartKeys.has(key)) continue;
            if (meta.bulletItems.some(b => b.page === p && b.text.includes(t))) continue;
            if (meta.headerValues.some(h => h.pages.includes(p) && h.text.includes(t))) continue;
            (meta.tablePages.has(p) ? tableResidue : merges).push({ page: p, text: t.slice(0, 90) });
        }
    }
    return { splits, merges, tableResidue };
}

// ---------------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------------

function main() {
    const manifest = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, "manifest.json"), "utf8"));
    const warnings = [];
    const meta = {};

    const lists = stageSpellLists(warnings);
    const spells = stageSpells(warnings, meta);
    const xref = crossReference(spells, lists);

    for (const s of spells) {
        const missing = spellMissingFields(s.data);
        for (const f of missing) s.notes.push(`required field missing: ${f}`);
        s.readiness = missing.length ? "extracted" : "parsed";
    }
    for (const l of lists) {
        const ok = typeof l.data.class === "string" && l.data.class && Array.isArray(l.data.spells) && l.data.spells.length > 0 && l.data.spells.every(g => Number.isInteger(g.level) && g.names.length > 0);
        l.readiness = ok ? "parsed" : "extracted";
        if (!ok) l.notes.push("required field missing: spells");
    }

    const entries = [...lists, ...spells];
    const staging = {
        metadata: {
            generator: "tools/srd_extract/stage_spells.js",
            generatedAt: new Date().toISOString(),
            category: "spells",
            source: { file: manifest.source.file, sha256: manifest.source.sha256, pages: [LIST_PAGES.slice(), DESC_PAGES.slice()] },
            cache: { generatedAt: manifest.generatedAt },
            license: manifest.license
        },
        entries,
        warnings
    };
    fs.mkdirSync(STAGING_DIR, { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(staging, null, 2) + "\n", "utf8");

    if (dumpName) {
        const e = entries.find(x => T.slugify(x.name) === T.slugify(dumpName));
        console.log(e ? JSON.stringify(e, null, 2) : `no entry named ${JSON.stringify(dumpName)}`);
    }

    // ---- Self-check ----
    let failures = 0;
    const check = (ok, label) => { console.log(`${ok ? "PASS" : "FAIL"}: ${label}`); if (!ok) failures++; };

    console.log(`SRD stage_spells: ${spells.length} spells, ${lists.length} spell lists, ${warnings.length} warnings -> ${path.relative(ROOT, OUT_FILE)}`);
    console.log(`Column shift per left-hand hyphen, measured on the cache: ${meta.columnShift.shift} column(s) over ${meta.columnShift.samples} one-hyphen lines (cache generated ${manifest.generatedAt})`);
    check(Math.abs(spells.length - EXPECTED_SPELLS) <= SPELL_TOLERANCE, `spell count ${spells.length} within ${SPELL_TOLERANCE} of ${EXPECTED_SPELLS}`);
    check(lists.length === EXPECTED_LISTS && CLASSES.every(c => lists.some(l => l.data.class === c)), `spell lists: ${lists.length} (${lists.map(l => l.data.class).join(", ")}), expected exactly ${EXPECTED_LISTS}`);
    const idCount = new Map();
    for (const e of entries) idCount.set(e.id, (idCount.get(e.id) || 0) + 1);
    const dupIds = [...idCount].filter(([, n]) => n > 1).map(([id]) => id);
    check(dupIds.length === 0, `duplicate ids: ${dupIds.length}${dupIds.length ? " (" + dupIds.join(", ") + ")" : ""}`);
    const emptyText = entries.filter(e => !e.text || !e.text.trim());
    check(emptyText.length === 0, `entries with empty text: ${emptyText.length}`);
    const badParsed = spells.filter(s => s.readiness === "parsed" && spellMissingFields(s.data).length);
    check(badParsed.length === 0, `parsed spells failing the required-field check: ${badParsed.length}`);
    const levels = new Array(10).fill(0);
    for (const s of spells) if (Number.isInteger(s.data.level) && s.data.level >= 0 && s.data.level <= 9) levels[s.data.level]++;
    check(levels.every(n => n > 0), `level distribution cantrips..9th: ${levels.join(" ")}`);
    const noClassNoNote = spells.filter(s => !s.data.classes.length && !s.notes.some(n => /class/.test(n)));
    check(noClassNoNote.length === 0, `spells with no class and no note: ${noClassNoNote.length}`);
    const roc = readingOrderCrossCheck(spells);
    check(roc.mismatches.length === 0, `reading-order bag-of-words cross-check: ${roc.segments} segments, ${roc.mismatches.length} spells differ`);
    for (const m of roc.mismatches.slice(0, 20)) console.log(`  ${m.name} (p${m.page}): ${m.detail.slice(0, 300)}`);
    const ps = paragraphStructureCheck(spells, meta);
    check(ps.splits.length === 0 && ps.merges.length === 0, `paragraph structure vs reading order: ${meta.proseStarts.length} prose paragraphs, ${ps.splits.length} unindented paragraph starts the reading order lacks, ${ps.merges.length} reading-order paragraph starts not staged as paragraphs (${ps.tableResidue.length} further reading-order lines on pages with staged tables, not counted)`);
    for (const s of ps.splits.slice(0, LIMIT)) console.log(`  split: ${s.name} (p${s.page}): ${s.key}`);
    for (const m of ps.merges.slice(0, LIMIT)) console.log(`  merged: p${m.page}: ${m.text}`);
    if (verbose) for (const m of ps.tableResidue) console.log(`  table residue: p${m.page}: ${m.text}`);
    const blankDecisions = meta.diag.filter(d => d.kind === "blank row");
    const bulletDecisions = meta.diag.filter(d => d.kind === "after bullet");
    console.log(`Blank-row decisions: ${blankDecisions.length} (${blankDecisions.filter(d => d.decision !== "joined").length} captions); after-bullet decisions: ${bulletDecisions.length} (${bulletDecisions.filter(d => d.decision === "paragraph").length} paragraphs)`);
    if (verbose) for (const d of meta.diag) console.log(`  ${d.kind}: ${d.spell} (p${d.page}) ${d.decision} [ro ${d.roStart ? "start" : "no"}]: ${JSON.stringify(d.prev.slice(-40))} | ${JSON.stringify(d.text.slice(0, 60))}`);

    console.log("Spot check:");
    for (const n of SPOT_CHECK) {
        const s = spells.find(x => T.slugify(x.name) === T.slugify(n));
        if (!s) { check(false, `spot check: ${n} not found`); continue; }
        const d = s.data, c = d.components;
        const comps = [c.verbal ? "V" : null, c.somatic ? "S" : null, c.material ? "M" : null].filter(Boolean).join(", ") + (c.materialDescription ? ` (${c.materialDescription})` : "");
        console.log(`  ${s.name} | pages ${s.source.pages.join(",")} | level ${d.level} | ${d.school}${d.ritual ? " (ritual)" : ""} | casting ${d.castingTime} | range ${d.range} | components ${comps} | duration ${d.duration} | concentration ${d.concentration} | classes ${d.classes.join("/")} | ${s.readiness}`);
    }
    check(SPOT_CHECK.every(n => spells.some(x => T.slugify(x.name) === T.slugify(n))), "spot check: all five spells present");

    const withTables = spells.filter(s => s.data.tables.length);
    const specSpells = Object.keys(TABLE_SPECS);
    const tableCount = withTables.reduce((n, s) => n + s.data.tables.length, 0);
    const expectedTables = specSpells.reduce((n, k) => n + TABLE_SPECS[k].length, 0);
    check(tableCount === expectedTables && specSpells.every(k => spells.some(s => s.name === k && s.data.tables.length === TABLE_SPECS[k].length)), `tables parsed: ${tableCount} of ${expectedTables} in ${withTables.length} spells (${withTables.map(s => s.name).join(", ")})`);
    for (const s of withTables) for (const t of s.data.tables) {
        const cov = t.coverage ? `${t.dice} coverage ${t.coverage.complete ? "complete" : "INCOMPLETE gaps " + JSON.stringify(t.coverage.gaps) + " overlaps " + JSON.stringify(t.coverage.overlaps)}` : "no dice";
        console.log(`  ${s.name} (p${s.source.pages.join(",")}): ${t.caption ? JSON.stringify(t.caption) + " " : ""}[${t.columns.join(" | ")}] ${t.rows.length} rows, ${cov}`);
    }
    check(spells.every(s => !s.notes.some(n => /not reconstructed|coverage incomplete/.test(n))), `tables with unresolved rows or incomplete coverage: ${spells.filter(s => s.notes.some(n => /not reconstructed|coverage incomplete/.test(n))).length}`);

    const readiness = {};
    for (const e of entries) readiness[e.readiness] = (readiness[e.readiness] || 0) + 1;
    console.log(`Readiness: ${Object.entries(readiness).map(([k, v]) => `${k} ${v}`).join(", ")}; warnings ${warnings.length}`);
    const extracted = spells.filter(s => s.readiness === "extracted");
    if (extracted.length) {
        console.log(`Spells marked extracted (${extracted.length}):`);
        for (const s of extracted) console.log(`  ${s.name} (p${s.source.pages[0]}): ${s.notes.filter(n => /required field missing/.test(n)).join("; ")}`);
    }
    console.log(`Class-list cross-reference: ${xref.unmatchedListNames.length} list names match no spell, ${xref.unlisted.length} spells on no list`);
    for (const u of xref.unmatchedListNames) console.log(`  list name unmatched: ${u.list} level ${u.level}: ${JSON.stringify(u.name)}`);
    for (const s of xref.unlisted) console.log(`  spell on no list: ${s.name} (p${s.source.pages[0]})`);
    const otherNotes = spells.filter(s => s.notes.some(n => !/required field missing|not on any class/.test(n)));
    if (otherNotes.length) {
        console.log(`Spells with other notes (${otherNotes.length}):`);
        for (const s of otherNotes) console.log(`  ${s.name} (p${s.source.pages[0]}): ${s.notes.filter(n => !/required field missing|not on any class/.test(n)).join("; ")}`);
    }
    if (warnings.length) {
        console.log(`Warnings (${warnings.length}):`);
        for (const w of warnings) console.log(`  p${w.page}: ${w.message}`);
    }
    console.log(failures ? `RESULT: FAIL (${failures} check${failures === 1 ? "" : "s"} failed)` : "RESULT: PASS");
    process.exit(failures ? 1 : 0);
}

if (require.main === module) main();

module.exports = { splitColumns, buildStream, parseLevelLine, buildBlocks, parseComponents, spellMissingFields };
