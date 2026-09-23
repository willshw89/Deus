// tools/srd_extract/stage_rules.js - SRD 5.1 stager for the `rules` category.
//
// Usage: node tools/srd_extract/stage_rules.js
// Reads:  tools/srd_extract/cache/ (page_NNN.txt, page_NNN.layout.txt, manifest.json), read-only.
// Writes: tools/srd_extract/staging/staging_rules.json
// Scope:  pages 76-104 (Using Ability Scores, Adventuring, Combat, Spellcasting), 195-205 (Traps, Diseases,
//         Madness, Objects, Poisons), 254-260 (Monsters: stat block rules) and 358-365 (Conditions,
//         Pantheons, Planes). Kinds: rule, hazard, table, condition, appendix.
// Contract: docs/SRD5_1_COVERAGE_MANIFEST.md (sections 4-7). Exit 1 when any self-check fails.
//
// This file also hosts the page model shared with stage_character_options.js (module.exports at the
// bottom): the lead allowed only the two stagers as new files, so the shared code lives here rather
// than in lib/. Nothing in it is specific to the rules chapters.
//
// How the text is read (see the coverage manifest section 2): the reading-order pages merge every
// line of a paragraph, so structure comes from the layout pages. A layout page is split into bands:
// two-column bands (left column, then right column) and full-width bands (tables wider than a
// column). Lines are grouped into blocks at blank lines; column, band and page boundaries are "soft"
// breaks that only end a block when the next line is visibly a new paragraph (indented), a bullet, a
// heading or a table line. Tables are read column by column in vertical order, because pdftotext
// drifts the cells of one row onto neighbouring lines but never reorders the cells of one column.
"use strict";

const fs = require("fs");
const path = require("path");
const T = require("./lib/srd_text");

const CACHE_DIR = path.join(__dirname, "cache");
const STAGING_DIR = path.join(__dirname, "staging");
const SOURCE_DOCUMENT = "SRD 5.1";

// ============================================================================================
// Shared page model
// ============================================================================================

function pad3(n) { return String(n).padStart(3, "0"); }

const pageCache = new Map();
/**
 * The raw layout page (page_NNN.layout.raw.txt): CR LF unified and the footer removed, nothing else,
 * so every character column is the one pdftotext printed. Columns are detected and cut on these
 * lines; each cut part is normalised afterwards (normalisation shortens the hyphen artifact from
 * four characters to one, which used to shift the text to its right by three columns).
 */
function readLayout(n) {
    if (!pageCache.has(n)) {
        const layout = fs.readFileSync(path.join(CACHE_DIR, `page_${pad3(n)}.layout.raw.txt`), "utf8");
        pageCache.set(n, layout.replace(/\r\n?/g, "\n").split("\n").map(l => l.replace(/\s+$/, "")));
    }
    return pageCache.get(n);
}

/** The pre-normalised layout page (page_NNN.layout.txt), kept only for the moved-line report. */
function readLayoutNormalized(n) {
    const file = path.join(CACHE_DIR, `page_${pad3(n)}.layout.txt`);
    if (!fs.existsSync(file)) return null;
    return fs.readFileSync(file, "utf8").split("\n").map(l => l.replace(/\s+$/, ""));
}

function readReading(n) {
    return fs.readFileSync(path.join(CACHE_DIR, `page_${pad3(n)}.txt`), "utf8");
}

function readManifest() {
    return JSON.parse(fs.readFileSync(path.join(CACHE_DIR, "manifest.json"), "utf8"));
}

/** The character column where the right text column starts, or null for a single-column page. */
function detectRightStart(lines, skip) {
    // Column occupancy profile: the right text column starts at the first column where the number
    // of lines with text jumps up after a valley (a column that almost no line writes through).
    // Indented paragraphs and right-column tables produce later, smaller jumps; a left-column
    // table's cells never sit in a valley because the prose lines around them run through it.
    const W = 100;
    const occ = new Array(W).fill(0);
    let n = 0;
    for (let i = 0; i < lines.length; i++) {
        if (skip && skip[i]) continue;
        const l = lines[i];
        if (l.trim() === "") continue;
        n++;
        for (let c = 0; c < Math.min(W, l.length); c++) if (l[c] !== " ") occ[c]++;
    }
    if (n < 2) return null;
    const jumps = [];
    for (let c = 40; c <= 82; c++) {
        const jump = occ[c] - occ[c - 1];
        // a valley before the jump: nearly empty, or much lower than the jump itself (a few lines
        // pushed left by long left-column text may sit just before the column start)
        if (jump >= 3 && (occ[c - 1] <= Math.max(1, n * 0.1) || occ[c - 1] <= jump * 0.4)) jumps.push([c, jump]);
    }
    if (!jumps.length) return null;
    // the leftmost jump that a real share of the right column's lines start at: the right column's
    // line count is approximated by the peak occupancy from that column on (a handful of lines
    // pushed left by long left-column text, or centred table rows, do not count)
    let best = null;
    for (const [c, jump] of jumps) {
        let R = 0;
        for (let k = c; k <= 82; k++) if (occ[k] > R) R = occ[k];
        if (jump >= Math.max(3, R * 0.2)) { best = c; break; }
    }
    if (best === null) return null;
    // sanity: most unmasked lines that reach past the gutter must have a gap ending at or after r-8
    let reach = 0, ok = 0;
    for (let i = 0; i < lines.length; i++) {
        if (skip && skip[i]) continue;
        const l = lines[i];
        if (l.length <= best + 3) continue;
        reach++;
        const re = /\s{2,}(?=\S)/g;
        let m;
        while ((m = re.exec(l)) !== null) { if (m.index + m[0].length >= best - 8) { ok++; break; } }
    }
    return reach && ok * 2 >= reach ? best : null;
}

function headingLike(text) {
    const t = text.trim();
    if (!t || t.length > 60) return false;
    if (!/^[A-Z]/.test(t)) return false;
    if (/[.,;!]$/.test(t)) return false;
    if (/^Prerequisite:/.test(t)) return false;
    if (/\S\s{2,}\S/.test(t)) return false;
    if (t.split(/\s+/).length > 10) return false;
    return true;
}

/**
 * Tables printed across the full page width. pdftotext cannot tell a wide table row from two column
 * texts on one line, so these regions are declared (checked against the pages on 2026-09-22):
 * the nine class tables that carry spell-slot or many columns, and the deity tables of Appendix PH-B.
 * `to: "classTable"` ends the region after the "20th" row and its trailing fragment lines;
 * `to: "end"` runs to the end of the page.
 */
const WIDE_REGIONS = {
    11: [{ from: "The Bard", to: "classTable" }],
    15: [{ from: "The Cleric", to: "classTable" }],
    19: [{ from: "The Druid", to: "classTable" }],
    26: [{ from: "The Monk", to: "classTable" }],
    30: [{ from: "The Paladin", to: "classTable" }],
    35: [{ from: "The Ranger", to: "classTable" }],
    42: [{ from: "The Sorcerer", to: "classTable" }],
    46: [{ from: "The Warlock", to: "classTable" }],
    52: [{ from: "The Wizard", to: "classTable" }],
    360: [{ from: "Celtic Deities", to: "end" }],
    361: [{ from: "*", to: "end" }],
    362: [{ from: "*", to: "end" }]
};

function wideMask(n, raw) {
    const mask = new Array(raw.length).fill(false);
    for (const reg of WIDE_REGIONS[n] || []) {
        let start = reg.from === "*" ? 0 : raw.findIndex(l => !/^\s/.test(l) && (l.trim() === reg.from || l.startsWith(reg.from + "  ")));
        if (start < 0) continue;
        let end = raw.length - 1;
        if (reg.to === "classTable") {
            let k = raw.findIndex((l, i) => i > start && /^\s*20th\b/.test(l));
            if (k < 0) continue;
            while (k + 1 < raw.length && raw[k + 1].trim() !== "") k++;
            end = k;
        }
        for (let i = start; i <= end; i++) mask[i] = true;
    }
    return mask;
}

/**
 * Split one line at the column gutter. Ordinary two-column lines have a run of two or more spaces
 * ending at or after r-8: the right text starts a little early when the left text is long, and later
 * than r when the paragraph is indented or the line is a table row of the right column. The first
 * such gap is the gutter (wide tables are masked before this is called). Returns { kind, left, right, p }.
 */
function splitLine(l, r) {
    if (l.trim() === "") return { kind: "blank" };
    let best = -1;
    const re = /\s{2,}(?=\S)/g;
    let m;
    while ((m = re.exec(l)) !== null) {
        const p = m.index + m[0].length;
        if (p >= r - 8 && (best < 0 || p < best)) best = p;
    }
    const firstText = l.search(/\S/);
    const lastText = l.replace(/\s+$/, "").length;
    if (best >= 0) {
        const leftText = l.slice(0, best).replace(/\s+$/, "");
        const rightX0 = best >= r ? r : best;
        const right = l.slice(rightX0).replace(/\s+$/, "");
        if (leftText.trim() === "") return { kind: "rightOnly", rightX0, right };
        return { kind: "twoCol", left: leftText, rightX0, right };
    }
    if (lastText <= r - 1) return { kind: "leftOnly", left: l.replace(/\s+$/, "") };
    if (firstText >= r - 8) { const rightX0 = firstText >= r ? r : firstText; return { kind: "rightOnly", rightX0, right: l.slice(rightX0).replace(/\s+$/, "") }; }
    // one gap of three or more spaces before r-8 with text on both sides of r: a squeezed line (the
    // U+2028 line-separator artifact on page 364 produces one); split at that gap
    const gaps = [...l.matchAll(/\s{3,}(?=\S)/g)];
    if (gaps.length === 1) {
        const p = gaps[0].index + gaps[0][0].length;
        return { kind: "twoCol", left: l.slice(0, p).replace(/\s+$/, ""), rightX0: p, right: l.slice(p).replace(/\s+$/, ""), squeezed: true };
    }
    return { kind: "wide" };
}

/**
 * Split one layout page into bands: { kind: "columns", left, right } or { kind: "wide", lines }.
 * A line is { page, x0, text } with text rstripped and leading spaces relative to x0.
 */
function pageBands(n, opts = {}) {
    // detection and cutting happen on the raw layout; every cut part is normalised afterwards
    // (opts.normalized reads the pre-normalised layout instead, for the moved-line report only)
    const raw = opts.normalized ? readLayoutNormalized(n) : readLayout(n);
    if (!raw) throw new Error(`page ${n}: layout not in the cache`);
    const push = (arr, x0, text) => {
        // normalisation can turn the one U+2028 line separator (page 364) into a line break
        for (const t of T.normalizeText(text).split("\n")) arr.push({ page: n, x0, text: t.replace(/\s+$/, "") });
    };
    const mask = wideMask(n, raw);
    const r = detectRightStart(raw, mask);
    if (r === null) { const lines = []; raw.forEach(t => push(lines, 0, t)); return { rightStart: null, bands: [{ kind: "wide", lines }], spanning: [] }; }
    const parts = raw.map((l, i) => mask[i] ? { kind: "wide" } : splitLine(l, r));
    const spanning = [];
    parts.forEach((p, i) => { if (p.kind === "wide" && !mask[i]) spanning.push(i); });
    const bands = [];
    let i = 0;
    while (i < raw.length) {
        if (parts[i].kind === "wide") {
            const lines = [];
            while (i < raw.length && (parts[i].kind === "wide" || (mask[i]))) { push(lines, 0, raw[i]); i++; }
            bands.push({ kind: "wide", lines });
        } else {
            const left = [], right = [];
            while (i < raw.length && parts[i].kind !== "wide") {
                const p = parts[i];
                if (p.kind === "blank") { push(left, 0, ""); push(right, r, ""); }
                else if (p.kind === "leftOnly") { push(left, 0, p.left); push(right, r, ""); }
                else if (p.kind === "rightOnly") { push(left, 0, ""); push(right, p.rightX0, p.right); }
                else { push(left, 0, p.left); push(right, p.rightX0, p.right); }
                i++;
            }
            bands.push({ kind: "columns", left, right });
        }
    }
    return { rightStart: r, bands, spanning };
}

/**
 * How many flow lines the raw-layout cut changed against the same cut of the pre-normalised layout,
 * over page ranges: the lines of the new flow (band kind, column origin, text) that do not occur in
 * the old flow of the same page. Null when the pre-normalised pages are no longer in the cache.
 */
function layoutMoveReport(pageRanges) {
    const flat = (bands) => {
        const out = [];
        for (const band of bands) {
            if (band.kind === "wide") for (const l of band.lines) out.push(`W|0|${l.text}`);
            else { for (const l of band.left) out.push(`L|${l.x0}|${l.text}`); for (const l of band.right) out.push(`R|${l.x0}|${l.text}`); }
        }
        return out;
    };
    const report = { moved: 0, pages: 0, pagesMoved: 0, perPage: [] };
    for (const [a, b] of pageRanges) for (let n = a; n <= b; n++) {
        if (!readLayoutNormalized(n)) return null;
        const old = new Map();
        for (const l of flat(pageBands(n, { normalized: true }).bands)) old.set(l, (old.get(l) || 0) + 1);
        let moved = 0;
        for (const l of flat(pageBands(n).bands)) {
            const k = old.get(l) || 0;
            if (k > 0) old.set(l, k - 1); else moved++;
        }
        report.pages++;
        if (moved) { report.pagesMoved++; report.moved += moved; report.perPage.push({ page: n, moved }); }
    }
    return report;
}

const BREAK = Object.freeze({ brk: true, text: "", page: 0, x0: 0 });

function trimBlank(lines) {
    let a = 0, b = lines.length;
    while (a < b && lines[a].text.trim() === "") a++;
    while (b > a && lines[b - 1].text.trim() === "") b--;
    return lines.slice(a, b);
}

/** The reading flow of one page: lines in reading order with BREAK markers between column parts. */
function pageFlow(n) {
    const out = [];
    for (const band of pageBands(n).bands) {
        if (band.kind === "wide") {
            out.push(...trimBlank(band.lines), BREAK);
        } else {
            out.push(...trimBlank(band.left), BREAK, ...trimBlank(band.right), BREAK);
        }
    }
    return out;
}

/** The reading flow of a page range [a, b]. */
function rangeFlow(a, b) {
    const out = [];
    for (let n = a; n <= b; n++) out.push(...pageFlow(n));
    return out;
}

function indentOf(text) { return text.length - text.replace(/^\s+/, "").length; }
function isTableLine(text) { return /\S\s{2,}\S/.test(text.trim()); }
function isBullet(text) { return /^\s*(•|\d{1,2}\.\s?[A-Z])/.test(text); }
const LABEL_RE = /^(Hit Dice|Hit Points at 1st Level|Hit Points at Higher Levels|Armor|Weapons|Tools|Saving Throws|Skills|Skill Proficiencies|Languages|Equipment|Tool Proficiencies):\s/;
function isLabel(text) { return LABEL_RE.test(text.trim()); }

/**
 * Group flow lines into blocks. A block is { lines: [Line], pages: [n...] }. Blank lines end a block;
 * BREAK markers end a block only when the following line is visibly a new unit.
 */
function blocksOf(flow) {
    const blocks = [];
    let cur = [];
    let pending = false;
    const close = () => { if (cur.length) blocks.push(cur); cur = []; };
    for (let i = 0; i < flow.length; i++) {
        const ln = flow[i];
        if (ln.brk) { pending = true; continue; }
        if (ln.text.trim() === "") { close(); pending = false; continue; }
        if (pending && cur.length) {
            const last = cur[cur.length - 1].text;
            let next = null;
            for (let j = i + 1; j < flow.length; j++) { if (flow[j].brk) continue; next = flow[j].text; break; }
            const nextBlank = next === null || next.trim() === "";
            const startsNew = indentOf(ln.text) >= 2 || isBullet(ln.text) || isTableLine(ln.text) || isLabel(ln.text)
                || (headingLike(ln.text) && nextBlank)
                || (cur.length === 1 && headingLike(last) && !isLabel(last))
                || isTableLine(last) || isBullet(last) && /[.]$/.test(last) && /^[A-Z]/.test(ln.text) && !/^\s/.test(ln.text) && false;
            if (startsNew) close();
        }
        pending = false;
        cur.push(ln);
    }
    close();
    // A block that opens with an indented lower-case line continues the previous block (a blank line
    // that the layout inserted inside a bullet or a hanging-indent list).
    const merged = [];
    for (const b of blocks) {
        const first = b[0].text;
        const prev = merged[merged.length - 1];
        if (prev && indentOf(first) >= 2 && /^\s+[a-z(]/.test(first) && !isTableLine(first)) { prev.push(...b); continue; }
        // a line after a line without terminal punctuation continues that paragraph when it is
        // lower-case (any indent) or indented (any case); a heading block never continues this way
        const prevLast = prev ? prev[prev.length - 1].text : "";
        const prevIsHeading = prev && prev.length === 1 && !/^\s/.test(prevLast) && headingLike(prevLast);
        const unfinished = prev && !prevIsHeading && !isTableLine(prevLast) && !/[.!?:”"]$/.test(prevLast.trim());
        if (unfinished && !isTableLine(first) && (/^[a-z]/.test(first) || (indentOf(first) >= 2 && !isBullet(first)))) { prev.push(...b); continue; }
        merged.push(b);
    }
    return merged.map(lines => ({ lines, pages: [...new Set(lines.map(l => l.page))] }));
}

function blockKind(block) {
    const texts = block.lines.map(l => l.text);
    const tableLines = texts.filter(isTableLine).length;
    if (tableLines && tableLines * 2 >= texts.length) return "table";
    if (texts.every(isBullet) || (isBullet(texts[0]) && texts.every(t => isBullet(t) || indentOf(t) >= 2))) return "bullets";
    if (texts.some(isLabel)) return "labels";
    if (texts.length <= 2 && texts.every(t => !/^\s/.test(t) && headingLike(t) && !isLabel(t))) return "heading";
    return "prose";
}

function blockText(block) { return block.lines.map(l => l.text.trim()).join(" ").replace(/\s+/g, " "); }

function joinLines(a, b) {
    const t = b.trim();
    if (!a) return t;
    if (/[-‐‑—]$/.test(a)) return a + t;
    return a + " " + t;
}

/** Paragraphs of a prose, bullets or labels block, unwrapped. */
function blockParagraphs(block, kind) {
    kind = kind || blockKind(block);
    const paras = [];
    let cur = null;
    const hanging = kind === "bullets" || kind === "labels";
    let curIsBullet = false;
    for (const ln of block.lines) {
        const ind = indentOf(ln.text);
        let startsNew;
        if (cur === null) startsNew = true;
        else if (isBullet(ln.text) || isLabel(ln.text)) startsNew = true;
        else if (hanging) startsNew = ind === 0 && kind === "labels" ? true : false;
        else if (curIsBullet && ind >= 2) startsNew = false; // a bullet's own hanging indent inside a prose block
        else if (/^\s+[a-z]/.test(ln.text)) startsNew = false; // hanging indent: a paragraph never opens lower-case
        else startsNew = ind >= 2 && ind <= 7;
        if (startsNew) { if (cur !== null) paras.push(cur); cur = ln.text.trim(); curIsBullet = isBullet(ln.text); }
        else cur = joinLines(cur, ln.text);
    }
    if (cur !== null) paras.push(cur);
    return paras;
}

/** Render an unparsed table block as rows: cells separated by two or more spaces become " | ". */
function rawTableRows(block) {
    return block.lines.map(l => l.text.trim().split(/\s{2,}/).join(" | ")).filter(Boolean);
}

// ------------------------------------------------------------------------------------------
// Generic table reader (column-wise, vertical order)
// ------------------------------------------------------------------------------------------

/** Cells of one line: runs separated by two or more spaces, each with its start column. */
function lineCells(text) {
    const out = [];
    const re = /\S(?:\S| (?=\S))*/g;
    let m;
    while ((m = re.exec(text)) !== null) out.push({ x: m.index, text: m[0] });
    return out;
}

function clusterByX(tokens, wantClusters, keyOf) {
    keyOf = keyOf || (t => t.x);
    const sorted = tokens.slice().sort((a, b) => keyOf(a) - keyOf(b) || a.order - b.order);
    for (let gap = 2; gap <= 12; gap++) {
        const clusters = [];
        let cur = null, lastX = null;
        for (const t of sorted) {
            const k = keyOf(t);
            if (cur === null || k - lastX >= gap) { cur = []; clusters.push(cur); }
            cur.push(t);
            lastX = k;
        }
        if (clusters.length === wantClusters) return clusters.map(c => c.slice().sort((a, b) => a.order - b.order));
        if (clusters.length < wantClusters) return null;
    }
    return null;
}

/**
 * Segment the vertically ordered lines of one wrapped text column into `n` cells.
 * A boundary before a line is certain when the line is "—" or the previous line ends a sentence and the
 * line starts with a capital; impossible when the line starts lower-case or the previous line ends with
 * a comma, hyphen or open parenthesis; possible otherwise. `cellStart` (regex) overrides: a boundary
 * exists exactly where a line matches it.
 */
function segmentWrapped(lines, n, cellStart) {
    if (lines.length === n) return lines.slice();
    if (lines.length < n) return null;
    const boundaries = [];
    for (let i = 1; i < lines.length; i++) {
        const prev = lines[i - 1], cur = lines[i];
        let kind;
        if (cellStart) kind = cellStart.test(cur) ? "certain" : "impossible";
        else if (cur === "—" || prev === "—") kind = "certain";
        else if (/^[a-z(]/.test(cur) || /[,\-‐‑(]$/.test(prev) || /\b(the|of|and|or|to|a|an|from|with|in|for|by|per|than|as|if|that|is|are)$/.test(prev)) kind = "impossible";
        else if (/[.!?”")]$/.test(prev) && /^[A-Z“"]/.test(cur)) kind = "certain";
        else kind = "possible";
        boundaries.push(kind);
    }
    const build = (use) => {
        const cells = [];
        let cur = lines[0];
        for (let i = 1; i < lines.length; i++) {
            if (use(boundaries[i - 1])) { cells.push(cur); cur = lines[i]; }
            else cur = joinLines(cur, lines[i]);
        }
        cells.push(cur);
        return cells;
    };
    const certainOnly = build(k => k === "certain");
    if (certainOnly.length === n) return certainOnly;
    const withPossible = build(k => k === "certain" || k === "possible");
    if (withPossible.length === n) return withPossible;
    // Lists whose cells all start lower-case (spell lists) give no case evidence: a wrapped cell's first
    // line is the one that fills the column, so join after the longest lines, as many as needed, when
    // that choice is unambiguous.
    if (!cellStart) {
        const joins = lines.length - n;
        const byLen = lines.slice(0, -1).map((l, i) => ({ i, len: l.length })).sort((a, b) => b.len - a.len);
        if (joins > 0 && byLen.length > joins && byLen[joins - 1].len > byLen[joins].len) {
            const set = new Set(byLen.slice(0, joins).map(x => x.i));
            const cells = [];
            let cur = lines[0];
            for (let i = 1; i < lines.length; i++) {
                if (set.has(i - 1)) cur = joinLines(cur, lines[i]);
                else { cells.push(cur); cur = lines[i]; }
            }
            cells.push(cur);
            if (cells.length === n) return cells;
        }
    }
    return null;
}

/**
 * Read a table from flow lines by columns.
 * spec: { caption, columns: [names], headerWords?: [extra header tokens to drop], keyColumn?: 0,
 *         cellStart?: { [colIndex]: RegExp }, mode?: "numbered" | "lastToken", headerDepth?: 4 }
 * Returns { caption, columns, rows, warnings: [] } or { error } when the layout defeats the reader.
 */
function readTable(lines, spec) {
    const warnings = [];
    const columns = spec.columns;
    const nCols = columns.length;
    const headerSet = new Set([spec.caption, ...columns, ...(spec.headerWords || [])].filter(Boolean).map(s => s.trim()));
    const isHeaderToken = (text) => {
        const t = text.trim();
        if (headerSet.has(t)) return true;
        // a run of header names separated by single spaces ("Minute Hour Day")
        const words = t.split(" ");
        let i = 0;
        while (i < words.length) {
            let found = false;
            for (let j = words.length; j > i; j--) { if (headerSet.has(words.slice(i, j).join(" "))) { i = j; found = true; break; } }
            if (!found) return false;
        }
        return true;
    };
    const nonBlank = lines.filter(l => !l.brk && l.text.trim() !== "");
    const headerDepth = spec.headerDepth === undefined ? 4 : spec.headerDepth;
    let tokens = [];
    let order = 0;
    nonBlank.forEach((ln, li) => {
        let cells;
        if (spec.mode === "numbered") {
            const m = ln.text.match(/^\s*(\d+)\s+(\S.*)$/);
            if (m) cells = [{ x: 0, text: m[1] }, { x: 1, text: m[2].trim() }];
            else if (isTableLine(ln.text) && li < headerDepth) cells = lineCells(ln.text);
            else cells = [{ x: 1, text: ln.text.trim() }];
        } else if (spec.mode === "lastToken") {
            // the last word of the line is the second column (e.g. "Cloth, paper, rope 11")
            const m = ln.text.trim().match(/^(.*\S)\s+(\S+)$/);
            if (m && !isHeaderToken(ln.text.trim())) cells = [{ x: 0, text: m[1] }, { x: 1, text: m[2] }];
            else cells = lineCells(ln.text);
        } else {
            cells = lineCells(ln.text);
        }
        if (spec.splitLine) {
            // unit cells such as "feet miles miles": one cell per word, at its own column
            const split = [];
            for (const c of cells) {
                if (!spec.splitLine.test(c.text)) { split.push(c); continue; }
                const re = /\S+/g;
                let m;
                while ((m = re.exec(c.text)) !== null) split.push({ x: c.x + m.index, text: m[0] });
            }
            cells = split;
        }
        for (const c of cells) {
            if (li < headerDepth && isHeaderToken(c.text)) continue;
            tokens.push({ x: c.x, text: c.text.trim(), order: order++, line: li, page: ln.page });
        }
    });
    if (spec.mode === "words") {
        // every non-header line is one row and every whitespace-separated word one cell
        const rows = [];
        nonBlank.forEach((ln, li) => {
            const t = ln.text.trim();
            if (li < headerDepth && isHeaderToken(t)) return;
            const words = t.split(/\s+/);
            if (words.length === nCols) rows.push(words);
            else warnings.push({ page: ln.page, message: `${spec.caption}: line with ${words.length} cells for ${nCols} columns skipped: "${t.slice(0, 60)}"` });
        });
        return { caption: spec.caption, columns, rows, warnings };
    }
    if (spec.mode === "lastToken" || spec.mode === "numbered") {
        // both modes produce exactly two columns by construction: x 0 and x 1
        const c0 = tokens.filter(t => t.x === 0), c1 = tokens.filter(t => t.x === 1);
        if (spec.mode === "numbered") {
            // continuation lines (x 1, not preceded on the same line by a number) attach to the previous row
            const rows = [];
            for (const t of tokens) {
                if (t.x === 0) rows.push([t.text, ""]);
                else if (rows.length) rows[rows.length - 1][1] = joinLines(rows[rows.length - 1][1], t.text);
                else warnings.push({ page: t.page, message: `${spec.caption}: text before the first numbered row: "${t.text}"` });
            }
            return { caption: spec.caption, columns, rows, warnings };
        }
        if (c0.length !== c1.length) return { error: `${spec.caption}: ${c0.length} labels but ${c1.length} values` };
        return { caption: spec.caption, columns, rows: c0.map((t, i) => [t.text, c1[i].text]), warnings };
    }
    // Cluster page by page: pdftotext lays every page out on its own character grid, so a table that
    // continues on the next page has its columns at other positions there. A page that populates
    // fewer columns (a table tail) is assigned by the nearest column centre of the previous page.
    if (spec.debug) for (const t of tokens) console.error(`  tok p${t.page} L${t.line} x${t.x} ${JSON.stringify(t.text)}`);
    // Cells are grouped into columns by their start column; when that fails (right-aligned numbers
    // such as "+10" under "-5"), by their end column, then by their centre.
    const pagesSeen = [...new Set(tokens.map(t => t.page))];
    const assemble = (keyOf) => {
        const clustersByCol = Array.from({ length: nCols }, () => []);
        if (spec.classify) {
            // the spec assigns every cell to a column by content and position (tables whose cells sit
            // under the wrong header on the character grid)
            for (const t of tokens) { const c = spec.classify(t); if (c >= 0 && c < nCols) clustersByCol[c].push(t); }
            for (const c of clustersByCol) c.sort((a, b) => a.order - b.order);
        }
        let prevCenters = null;
        for (const pg of spec.classify ? [] : pagesSeen) {
            const group = tokens.filter(t => t.page === pg);
            let clusters = clusterByX(group, nCols, keyOf);
            if (!clusters) {
                if (!prevCenters) return { error: `${spec.caption}: could not separate ${nCols} columns on page ${pg} from the cell positions (${[...new Set(group.map(t => t.x))].sort((a, b) => a - b).join(",")})` };
                clusters = Array.from({ length: nCols }, () => []);
                for (const t of group) {
                    let best = 0, bd = Infinity;
                    prevCenters.forEach((c, i) => { const d = Math.abs(keyOf(t) - c); if (d < bd) { bd = d; best = i; } });
                    clusters[best].push(t);
                }
                clusters.forEach(c => c.sort((a, b) => a.order - b.order));
            }
            prevCenters = clusters.map((c, i) => c.length ? c.reduce((s, t) => s + keyOf(t), 0) / c.length : (prevCenters ? prevCenters[i] : 0));
            clusters.forEach((c, i) => clustersByCol[i].push(...c));
        }
        const segmentColumn = (c, n) => {
            const texts = clustersByCol[c].map(t => t.text);
            if (texts.length === n) return texts;
            if (texts.length < n) return { error: `${spec.caption}: column "${columns[c]}" has ${texts.length} cells for ${n} rows` };
            const cellStart = spec.cellStart && spec.cellStart[c];
            const seg = segmentWrapped(texts, n, cellStart);
            if (!seg) return { error: `${spec.caption}: column "${columns[c]}" has ${texts.length} lines that could not be joined into ${n} cells` };
            return seg;
        };
        if (spec.twoHalves) {
            // two side-by-side halves with the same two columns, read as one list of rows
            const half = nCols / 2;
            const rows = [];
            for (const base of [0, half]) {
                const n = clustersByCol[base].length;
                const cols = [];
                for (let c = base; c < base + half; c++) { const col = segmentColumn(c, n); if (col.error) return col; cols.push(col); }
                for (let r = 0; r < n; r++) rows.push(cols.map(col => col[r]));
            }
            return { caption: spec.caption, columns: columns.slice(0, half), rows, warnings: warnings.slice() };
        }
        const key = spec.keyColumn || 0;
        const n = clustersByCol[key].length;
        const cols = [];
        for (let c = 0; c < nCols; c++) { const col = segmentColumn(c, n); if (col.error) return col; cols.push(col); }
        const rows = [];
        for (let r = 0; r < n; r++) rows.push(cols.map(col => col[r]));
        return { caption: spec.caption, columns, rows, warnings: warnings.slice() };
    };
    const KEYINGS = [["start", t => t.x], ["end", t => t.x + t.text.length], ["centre", t => t.x + t.text.length / 2]];
    let last = null;
    for (const [keyName, keyOf] of KEYINGS) {
        const result = assemble(keyOf);
        if (!result.error) {
            if (keyName !== "start") result.warnings.push({ page: nonBlank[0].page, message: `${spec.caption}: columns separated by cell ${keyName} positions` });
            return result;
        }
        if (!last) last = result;
    }
    return last;
}

function tableToText(table) {
    const lines = [];
    if (table.caption) lines.push(table.caption);
    lines.push(table.columns.join(" | "));
    for (const r of table.rows) lines.push(r.join(" | "));
    return lines.join("\n");
}

// ------------------------------------------------------------------------------------------
// Section walking
// ------------------------------------------------------------------------------------------

/**
 * Find the index of the block that is the heading `name` (one heading block, or two consecutive
 * heading blocks whose texts join to it, for wrapped titles). Returns { index, span } or null.
 */
function findHeading(blocks, name, from, kinds) {
    const want = T.toPlain(name).replace(/\s+/g, " ").trim().toLowerCase();
    for (let i = from || 0; i < blocks.length; i++) {
        if (kinds[i] !== "heading") continue;
        const t1 = T.toPlain(blockText(blocks[i])).toLowerCase();
        if (t1 === want) return { index: i, span: 1 };
        if (i + 1 < blocks.length && kinds[i + 1] === "heading") {
            const t2 = (t1 + " " + T.toPlain(blockText(blocks[i + 1])).toLowerCase()).replace(/\s+/g, " ");
            if (t2 === want) return { index: i, span: 2 };
        }
    }
    return null;
}

/** Index of the first flow line (>= from) whose trimmed text starts with `prefix` at indent 0 of its column. */
function findLine(flow, prefix, from) {
    const want = T.toPlain(prefix).toLowerCase();
    for (let i = from || 0; i < flow.length; i++) {
        if (flow[i].brk) continue;
        const t = T.toPlain(flow[i].text).toLowerCase();
        if (t.trimStart().startsWith(want) && indentOf(flow[i].text) <= 7) return i;
    }
    return -1;
}

/**
 * Locate a table by its spec in the flow: the caption line (a line equal to the caption or starting
 * with it followed by two spaces) up to the `until` line (exclusive). Returns the flow slice.
 */
function tableRegion(flow, spec, from) {
    const cap = T.toPlain(spec.locate || spec.caption).toLowerCase();
    let start = -1;
    for (let i = from || 0; i < flow.length; i++) {
        if (flow[i].brk) continue;
        const t = T.toPlain(flow[i].text).toLowerCase();
        if (indentOf(flow[i].text) > 1) continue;
        const tt = t.trim();
        if (tt === cap || tt.startsWith(cap + "  ")) { start = i; break; }
    }
    if (start < 0) return null;
    let end = flow.length;
    if (spec.until) {
        const u = findLine(flow, spec.until, start + 1);
        if (u < 0) return null;
        end = u;
    }
    return { start, end, lines: flow.slice(start, end) };
}

// ------------------------------------------------------------------------------------------
// Entry assembly
// ------------------------------------------------------------------------------------------

/**
 * Render a run of blocks as entry text and collect its tables. `tables` are parsed tables (with
 * `region` start/end in block indices) that replace the blocks they cover.
 */
function renderBlocks(blocks, kinds, from, to, tableHits, warnings) {
    const paras = [];
    const pages = new Set();
    let i = from;
    while (i < to) {
        const hit = tableHits && tableHits.find(h => h.fromBlock === i && h.table);
        if (hit) {
            paras.push(tableToText(hit.table));
            for (let k = hit.fromBlock; k < hit.toBlock; k++) blocks[k].pages.forEach(p => pages.add(p));
            i = hit.toBlock;
            continue;
        }
        const b = blocks[i];
        b.pages.forEach(p => pages.add(p));
        const k = kinds[i];
        if (k === "heading") paras.push(blockText(b));
        else if (k === "table") {
            paras.push(rawTableRows(b).join("\n"));
            if (warnings) warnings.push({ page: b.pages[0], message: `table not covered by a spec, kept as raw rows: "${b.lines[0].text.trim().slice(0, 60)}"` });
        }
        else paras.push(...blockParagraphs(b, k));
        i++;
    }
    return { text: paras.join("\n\n"), pages: [...pages].sort((a, b) => a - b) };
}

function makeEntry(o) {
    const text = o.text;
    const entry = {
        id: T.stableId(o.kind, o.name, o.variant),
        category: o.category,
        kind: o.kind,
        name: o.name,
        source: { document: SOURCE_DOCUMENT, pages: o.pages, section: o.section, heading: o.heading === undefined ? o.name : o.heading },
        text,
        data: o.data || {},
        dice: T.findDice(text).map(d => ({ text: d.text, count: d.count, sides: d.sides, modifier: d.modifier, average: d.average })),
        readiness: o.readiness || "parsed",
        notes: o.notes || []
    };
    return entry;
}

function attribution() {
    return readManifest().license.attribution;
}

function writeStaging(file, category, pageRanges, entries, warnings, generator) {
    const manifest = readManifest();
    const out = {
        metadata: {
            generator,
            generatedAt: new Date().toISOString(),
            category,
            source: { file: manifest.source.file, sha256: manifest.source.sha256, pages: pageRanges },
            cache: { generatedAt: manifest.generatedAt },
            license: { id: manifest.license.id, attribution: manifest.license.attribution }
        },
        entries,
        warnings
    };
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(out, null, 1) + "\n", "utf8");
    return out;
}

// ------------------------------------------------------------------------------------------
// Self-check helpers
// ------------------------------------------------------------------------------------------

function makeChecker() {
    const results = [];
    const check = (ok, label) => { results.push({ ok: !!ok, label }); console.log(`${ok ? "PASS" : "FAIL"}: ${label}`); return !!ok; };
    const failed = () => results.filter(r => !r.ok).length;
    return { check, failed, results };
}

function requiredFieldsMissing(entry, required) {
    const missing = [];
    for (const f of required) {
        const v = entry.data[f];
        if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) missing.push(f);
    }
    return missing;
}

function pageCoverage(entries, pageRanges) {
    const covered = new Set();
    for (const e of entries) for (const p of e.source.pages) covered.add(p);
    const missing = [];
    for (const [a, b] of pageRanges) for (let p = a; p <= b; p++) if (!covered.has(p)) missing.push(p);
    return missing;
}

function countBy(entries, key) {
    const m = {};
    for (const e of entries) m[e[key]] = (m[e[key]] || 0) + 1;
    return m;
}

// ============================================================================================
// Rules category
// ============================================================================================

const RULES_PAGES = [[76, 104], [195, 205], [254, 260], [358, 365]];
const REQUIRED = {
    rule: ["headingPath", "tables"],
    hazard: ["headingPath", "tables"],
    appendix: ["headingPath", "tables"],
    table: ["caption", "columns", "rows", "headingPath"],
    condition: ["effects"]
};

/**
 * Chapter specifications. `entries` lists the printed headings that become rule entries (checked
 * against the pages on 2026-09-22); everything between two of them belongs to the first. `tables`
 * lists the tables of the chapter with their printed captions and column names. Section = the
 * section title used in source.section.
 */
const CHAPTERS = [
    // Page ranges as printed (checked 2026-09-22): the Using Ability Scores chapter runs to the Saving
    // Throws section on page 83; Adventuring starts with "Time" on page 84 and Combat with "The Order
    // of Combat" on page 90. Neither of those two chapter titles is present in the pdftotext output
    // (they are not text on the page), so those chapters get no intro entry and their headingPath
    // uses the section title from the coverage manifest.
    {
        id: "using-ability-scores", title: "Using Ability Scores", pages: [76, 83], next: null, wrapped: ["Using Ability", "Scores"],
        entries: ["Ability Scores and Modifiers", "Advantage and Disadvantage", "Proficiency Bonus", "Ability Checks", "Using Each Ability", "Saving Throws"],
        tables: [
            { caption: "Ability Scores and Modifiers", columns: ["Score", "Modifier"], until: "To determine an ability modifier", entryOf: "Ability Scores and Modifiers", standalone: true, secondOccurrence: true },
            { caption: "Typical Difficulty Classes", columns: ["Task Difficulty", "DC"], until: "To make an ability check", mode: "lastToken", entryOf: "Ability Checks", standalone: true }
        ]
    },
    {
        id: "adventuring", title: "Adventuring", pages: [84, 89], next: null, noPrintedTitle: true,
        entries: ["Time", "Movement", "The Environment", "Resting", "Between Adventures"],
        tables: [
            { caption: "Travel Pace", columns: ["Pace", "Minute", "Hour", "Day", "Effect"], headerWords: ["Distance Traveled per . . .", "Distance Traveled per", ". . ."], splitLine: /^((feet|miles)(\s+(feet|miles))+|(Fast|Normal|Slow) \d+)$/, until: "Difficult Terrain", entryOf: "Movement", standalone: true, secondOccurrence: true }
        ]
    },
    {
        id: "combat", title: "Combat", pages: [90, 99], next: null, noPrintedTitle: true,
        entries: ["The Order of Combat", "Movement and Position", "Actions in Combat", "Making an Attack", "Cover", "Damage and Healing", "Mounted Combat", "Underwater Combat"],
        tables: [
            { caption: "Size Categories", columns: ["Size", "Space"], until: "Space", entryOf: "Movement and Position", standalone: true, variant: "Combat" }
        ]
    },
    {
        id: "spellcasting", title: "Spellcasting", pages: [100, 104], next: null,
        entries: ["What Is a Spell?", "Casting a Spell", "The Schools of Magic"],
        tables: []
    },
    {
        id: "traps", title: "Traps", pages: [195, 198], next: "Diseases",
        entries: ["Traps in Play", "Trap Effects", "Complex Traps", "Sample Traps"],
        hazards: { after: "Sample Traps", subtitleLine: true },
        tables: [
            { caption: "Trap Save DCs and Attack Bonuses", columns: ["Trap Danger", "Save DC", "Attack Bonus"], until: "Damage Severity by Level", entryOf: "Trap Effects", standalone: true },
            { caption: "Damage Severity by Level", columns: ["Character Level", "Setback", "Dangerous", "Deadly"], until: "Complex Traps", entryOf: "Trap Effects", standalone: true }
        ]
    },
    {
        id: "diseases", title: "Diseases", pages: [199, 200], next: "Madness",
        entries: ["Sample Diseases"],
        hazards: { after: "Sample Diseases" },
        tables: []
    },
    {
        id: "madness", title: "Madness", pages: [201, 202], next: "Objects",
        entries: ["Going Mad", "Madness Effects", "Curing Madness"],
        hazardTables: ["Short-Term Madness", "Long-Term Madness", "Indefinite Madness"],
        tables: [
            { caption: "Short-Term Madness", columns: ["d100", "Effect (lasts 1d10 minutes)"], until: "Long-Term Madness", entryOf: "Madness Effects", standalone: true, cellStart: { 1: /^The character\b/ } },
            { caption: "Long-Term Madness", columns: ["d100", "Effect (lasts 1d10 × 10 hours)"], until: "Indefinite Madness", entryOf: "Madness Effects", standalone: true, cellStart: { 1: /^(The character|Whenever the character)\b/ } },
            { caption: "Indefinite Madness", columns: ["d100", "Flaw (lasts until cured)"], until: "Curing Madness", entryOf: "Madness Effects", standalone: true, cellStart: { 1: /^[“"]/ } }
        ]
    },
    {
        id: "objects", title: "Objects", pages: [203, 203], next: "Poisons",
        entries: ["Statistics for Objects"],
        tables: [
            { caption: "Object Armor Class", columns: ["Substance", "AC"], until: "Hit Points.", mode: "lastToken", entryOf: "Statistics for Objects", standalone: true },
            { caption: "Object Hit Points", columns: ["Size", "Fragile", "Resilient"], until: "Huge and Gargantuan Objects.", entryOf: "Statistics for Objects", standalone: true }
        ]
    },
    {
        id: "poisons", title: "Poisons", pages: [204, 205], next: null,
        entries: ["Sample Poisons"],
        hazards: { after: "Sample Poisons", runIn: true },
        tables: [
            { caption: "Poisons", columns: ["Item", "Type", "Price per Dose"], until: "Sample Poisons", entryOf: "__intro__", standalone: true, tableName: "Poisons (price table)", secondOccurrence: true }
        ]
    },
    {
        id: "monsters-intro", title: "Monsters (stat block rules)", pages: [254, 260], next: null, headingText: "Monsters",
        entries: ["Size", "Modifying Creatures", "Type", "Alignment", "Armor Class", "Hit Points", "Speed", "Ability Scores", "Saving Throws", "Skills",
            "Vulnerabilities, Resistances, and Immunities", "Senses", "Languages", "Challenge", "Special Traits", "Actions", "Reactions", "Limited Usage",
            "Grapple Rules for Monsters", "Equipment", "Legendary Creatures"],
        tables: [
            { caption: "Size Categories", columns: ["Size", "Space", "Examples"], until: "Modifying Creatures", entryOf: "Size", standalone: true },
            { caption: "Hit Dice by Size", columns: ["Monster Size", "Hit Die", "Average HP per Die"], until: "A monster’s Constitution modifier also affects", entryOf: "Hit Points", standalone: true },
            { caption: "Proficiency Bonus by Challenge Rating", columns: ["Challenge", "Proficiency Bonus", "Challenge", "Proficiency Bonus"], headerWords: ["Proficiency", "Bonus"], until: "Skills", entryOf: "Saving Throws", standalone: true, twoHalves: true },
            { caption: "Experience Points by Challenge Rating", columns: ["Challenge", "XP", "Challenge", "XP"], until: "Special Traits", entryOf: "Challenge", standalone: true, twoHalves: true }
        ]
    }
];

function main() {
    const generator = "tools/srd_extract/stage_rules.js";
    const warnings = [];
    const entries = [];
    const chk = makeChecker();

    // ---- rules chapters -------------------------------------------------------------------
    for (const ch of CHAPTERS) stageChapter(ch, entries, warnings);

    // ---- conditions ------------------------------------------------------------------------
    stageConditions(entries, warnings);

    // ---- appendices ------------------------------------------------------------------------
    stagePantheons(entries, warnings);
    stagePlanes(entries, warnings);

    // ---- readiness -------------------------------------------------------------------------
    for (const e of entries) {
        const missing = requiredFieldsMissing(e, REQUIRED[e.kind] || []).filter(f => !(f === "tables" && Array.isArray(e.data.tables)));
        if (missing.length) { e.readiness = "extracted"; e.notes.push(`missing: ${missing.join(", ")}`); }
        if (e.readiness !== "extracted" && e.notes.some(n => /^missing/.test(n))) e.readiness = "extracted";
    }

    // ---- duplicate ids ---------------------------------------------------------------------
    const ids = new Map();
    for (const e of entries) ids.set(e.id, (ids.get(e.id) || 0) + 1);
    const dupes = [...ids].filter(([, n]) => n > 1).map(([id]) => id);

    // ---- write -----------------------------------------------------------------------------
    const file = path.join(STAGING_DIR, "staging_rules.json");
    writeStaging(file, "rules", RULES_PAGES, entries, warnings, generator);

    // ---- self-check ------------------------------------------------------------------------
    console.log(`\n== stage_rules self-check (${entries.length} entries, ${warnings.length} warnings) ==`);
    const counts = countBy(entries, "kind");
    const expected = { condition: [15, 0], rule: [40, 30], hazard: [30, 20], table: [20, 20], appendix: [2, 0] };
    for (const [kind, [exp, tol]] of Object.entries(expected)) {
        const n = counts[kind] || 0;
        chk.check(Math.abs(n - exp) <= tol, `count ${kind}: ${n} (expected ${exp} ± ${tol})`);
    }
    chk.check(dupes.length === 0, `duplicate ids: ${dupes.length ? dupes.join(", ") : "none"}`);
    const emptyText = entries.filter(e => !e.text || !e.text.trim());
    chk.check(emptyText.length === 0, `non-empty text everywhere (${emptyText.map(e => e.id).join(", ") || "ok"})`);
    const badParsed = entries.filter(e => e.readiness === "parsed" && requiredFieldsMissing(e, REQUIRED[e.kind] || []).filter(f => !(f === "tables" && Array.isArray(e.data.tables))).length);
    chk.check(badParsed.length === 0, `required fields on every parsed entry (${badParsed.map(e => e.id).join(", ") || "ok"})`);
    const uncovered = pageCoverage(entries, RULES_PAGES);
    chk.check(uncovered.length === 0, `every page contributes text (uncovered: ${uncovered.join(", ") || "none"})`);
    spotChecks(entries, chk);

    const readiness = countBy(entries, "readiness");
    console.log(`counts per kind: ${JSON.stringify(counts)}`);
    console.log(`readiness: ${JSON.stringify(readiness)}`);
    console.log(`warnings: ${warnings.length}`);
    for (const e of entries.filter(e => e.readiness === "extracted")) console.log(`  extracted: ${e.id} p.${e.source.pages.join(",")}: ${e.notes.join("; ")}`);
    const moved = layoutMoveReport(RULES_PAGES);
    console.log(moved ? `raw layout cut: ${moved.moved} lines moved on ${moved.pagesMoved} of ${moved.pages} pages (${moved.perPage.map(p => `${p.page}:${p.moved}`).join(" ")})` : "raw layout cut: pre-normalised layout pages not in the cache, moved-line report skipped");
    console.log(`wrote ${path.relative(path.resolve(__dirname, "..", ".."), file)}`);
    const failed = chk.failed();
    console.log(failed ? `RESULT: FAIL (${failed} check(s) failed)` : "RESULT: PASS");
    process.exit(failed ? 1 : 0);
}

// ------------------------------------------------------------------------------------------
// Chapter staging
// ------------------------------------------------------------------------------------------

function chapterFlowAndBlocks(ch) {
    const flow = rangeFlow(ch.pages[0], ch.pages[1]);
    const blocks = blocksOf(flow);
    const kinds = blocks.map(blockKind);
    return { flow, blocks, kinds };
}

/** Resolve every table spec of a chapter: parse it from the flow and map it onto block indices. */
function resolveTables(ch, flow, blocks, kinds, warnings) {
    const hits = [];
    for (const spec of ch.tables || []) {
        let from = 0;
        let region = tableRegion(flow, spec, from);
        if (spec.secondOccurrence && region) region = tableRegion(flow, spec, region.start + 1);
        if (!region) { warnings.push({ page: ch.pages[0], message: `table "${spec.caption}" not located` }); continue; }
        // drop a leading caption line that is a heading block (the caption is added back by tableToText)
        let table = readTable(region.lines, spec);
        if (table.error) { warnings.push({ page: region.lines[0].page, message: table.error }); table = null; }
        // map the region onto block indices
        const startLine = flow[region.start], endLine = region.end < flow.length ? flow[region.end] : null;
        const fromBlock = blocks.findIndex(b => b.lines.includes(startLine));
        let toBlock = endLine ? blocks.findIndex(b => b.lines.includes(endLine)) : blocks.length;
        if (fromBlock < 0) { warnings.push({ page: startLine.page, message: `table "${spec.caption}" region start not in a block` }); continue; }
        if (toBlock < 0) toBlock = blocks.length;
        // the `until` line may sit in the same block as trailing table lines; split is not needed because
        // renderBlocks replaces whole blocks: verify the until line starts its block
        if (endLine && blocks[toBlock].lines[0] !== endLine) {
            const blk = blocks[toBlock];
            const cut = blk.lines.indexOf(endLine);
            const head = { lines: blk.lines.slice(0, cut), pages: [...new Set(blk.lines.slice(0, cut).map(l => l.page))] };
            const tail = { lines: blk.lines.slice(cut), pages: [...new Set(blk.lines.slice(cut).map(l => l.page))] };
            blocks.splice(toBlock, 1, head, tail);
            kinds.splice(toBlock, 1, blockKind(head), blockKind(tail));
            // earlier hits that lie beyond the split point move down by one block
            for (const h of hits) { if (h.fromBlock > toBlock) h.fromBlock++; if (h.toBlock > toBlock) h.toBlock++; }
            toBlock += 1;
        }
        hits.push({ spec, table, fromBlock, toBlock, page: startLine.page, pages: [...new Set(region.lines.filter(l => !l.brk).map(l => l.page))] });
    }
    return hits;
}

function stageChapter(ch, entries, warnings) {
    const { flow, blocks, kinds } = chapterFlowAndBlocks(ch);
    const section = ch.title;
    const chapterHeading = ch.headingText || ch.title;
    const hits = resolveTables(ch, flow, blocks, kinds, warnings);

    // locate the chapter heading (possibly wrapped over two heading blocks)
    let h0 = ch.noPrintedTitle ? null : findHeading(blocks, chapterHeading, 0, kinds);
    if (!h0 && ch.wrapped) h0 = findHeading(blocks, ch.wrapped.join(" "), 0, kinds);
    if (!h0 && !ch.noPrintedTitle) { warnings.push({ page: ch.pages[0], message: `chapter heading "${chapterHeading}" not found` }); return; }

    // locate every entry heading, in order
    const marks = [];
    let from = h0 ? h0.index + h0.span : 0;
    for (const name of ch.entries) {
        const h = findHeading(blocks, name, from, kinds);
        if (!h) { warnings.push({ page: ch.pages[0], message: `entry heading "${name}" not found in ${ch.title}` }); continue; }
        marks.push({ name, index: h.index, span: h.span });
        from = h.index + h.span;
    }
    // end of the chapter: the next chapter's heading or the end of the range
    let endBlock = blocks.length;
    if (ch.next) {
        const hn = findHeading(blocks, ch.next, from, kinds);
        if (hn) endBlock = hn.index;
    }
    // hazards: named entries after a given heading (traps, diseases, poisons)
    let hazardStart = -1;
    if (ch.hazards) {
        const m = marks.find(x => x.name === ch.hazards.after);
        if (m) hazardStart = m.index;
    }

    const bounds = [];
    // chapter intro: from the chapter heading to the first entry heading (none when the title is not printed)
    if (h0) bounds.push({ name: chapterHeading, from: h0.index, to: marks.length ? marks[0].index : endBlock, intro: true, span: h0.span });
    for (let i = 0; i < marks.length; i++) {
        bounds.push({ name: marks[i].name, from: marks[i].index, to: i + 1 < marks.length ? marks[i + 1].index : endBlock, span: marks[i].span });
    }

    for (const b of bounds) {
        const isHazardSection = ch.hazards && b.name === ch.hazards.after;
        let to = b.to;
        let hazardBlocks = null;
        if (isHazardSection) {
            // the section's own prose runs until the first hazard heading; the rest are hazard entries
            hazardBlocks = splitHazards(blocks, kinds, b.from + b.span, b.to, ch, warnings);
            to = hazardBlocks.introEnd;
        }
        const r = renderBlocks(blocks, kinds, b.from, to, hits, warnings);
        const subheadings = [];
        for (let i = b.from + b.span; i < to; i++) if (kinds[i] === "heading" && !hits.some(h => i >= h.fromBlock && i < h.toBlock)) subheadings.push(blockText(blocks[i]));
        const tables = hits.filter(h => h.fromBlock >= b.from && h.fromBlock < to && h.table).map(h => ({ caption: h.table.caption, columns: h.table.columns, rows: h.table.rows }));
        const headingPath = b.intro ? [chapterHeading] : [chapterHeading, b.name];
        const name = b.intro ? `${chapterHeading}` : `${chapterHeading}: ${b.name}`;
        const notes = [];
        const failedTables = hits.filter(h => h.fromBlock >= b.from && h.fromBlock < to && !h.table);
        for (const f of failedTables) notes.push(`missing: table "${f.spec.caption}" could not be parsed`);
        entries.push(makeEntry({
            kind: "rule", category: "rules", name, heading: b.intro ? chapterHeading : b.name,
            pages: r.pages, section, text: r.text,
            data: { headingPath, subheadings, tables },
            notes
        }));
        if (hazardBlocks) {
            for (const hz of hazardBlocks.hazards) {
                // run-in hazards (poisons) carry their own paragraphs; the others are block ranges
                const rr = hz.synthetic ? { text: hz.synthetic.para, pages: hz.synthetic.pages } : renderBlocks(blocks, kinds, hz.from, hz.to, hits, warnings);
                const hzTables = hz.synthetic ? [] : hits.filter(h => h.fromBlock >= hz.from && h.fromBlock < hz.to && h.table).map(h => ({ caption: h.table.caption, columns: h.table.columns, rows: h.table.rows }));
                entries.push(makeEntry({
                    kind: "hazard", category: "rules", name: hz.name, heading: hz.name,
                    pages: rr.pages, section, text: rr.text,
                    data: { headingPath: [chapterHeading, b.name, hz.name], hazardType: hz.type || null, tables: hzTables, category: ch.id === "traps" ? "trap" : ch.id === "diseases" ? "disease" : "poison" }
                }));
            }
        }
    }

    // madness: the three madness tables are hazards of their own (a form of madness each)
    if (ch.hazardTables) {
        for (const cap of ch.hazardTables) {
            const h = hits.find(x => x.spec.caption === cap);
            if (!h) continue;
            const text = h.table ? tableToText(h.table) : renderBlocks(blocks, kinds, h.fromBlock, h.toBlock, null, warnings).text;
            entries.push(makeEntry({
                kind: "hazard", category: "rules", name: cap, heading: cap, pages: h.pages, section, text,
                data: { headingPath: [chapterHeading, "Madness Effects", cap], hazardType: "madness", tables: h.table ? [{ caption: h.table.caption, columns: h.table.columns, rows: h.table.rows }] : [], category: "madness" },
                notes: h.table ? [] : ["missing: tables (table not parsed)"]
            }));
        }
    }

    // standalone table entries
    for (const h of hits) {
        if (!h.spec.standalone) continue;
        const owner = h.spec.entryOf === "__intro__" ? [chapterHeading] : [chapterHeading, h.spec.entryOf];
        const tname = h.spec.tableName || h.spec.caption;
        if (h.table) {
            entries.push(makeEntry({
                kind: "table", category: "rules", name: tname, variant: h.spec.variant, heading: h.spec.caption, pages: h.pages, section, text: tableToText(h.table),
                data: { caption: h.table.caption, columns: h.table.columns, rows: h.table.rows, headingPath: owner }
            }));
        } else {
            const rr = renderBlocks(blocks, kinds, h.fromBlock, h.toBlock, null, null);
            entries.push(makeEntry({
                kind: "table", category: "rules", name: tname, variant: h.spec.variant, heading: h.spec.caption, pages: h.pages, section, text: rr.text,
                data: { caption: h.spec.caption, columns: h.spec.columns, rows: null, headingPath: owner },
                readiness: "extracted", notes: ["missing: rows (the layout defeated the column reader)"]
            }));
        }
    }
}

/**
 * Split the blocks of a "Sample X" section into the intro and one hazard per printed name.
 * Traps: heading + a subtitle line ("Mechanical trap"). Diseases: heading blocks. Poisons: run-in
 * paragraphs "Name (Type). text".
 */
function splitHazards(blocks, kinds, from, to, ch, warnings) {
    const hazards = [];
    if (ch.hazards.runIn) {
        // poisons: each paragraph "Name (Type). ..." of the section; the intro is the first prose block
        let introEnd = from;
        for (let i = from; i < to; i++) {
            const b = blocks[i];
            if (kinds[i] !== "prose") continue;
            const paras = blockParagraphs(b, "prose");
            const runIn = paras.filter(p => /^[A-Z][^.]{2,60}\((Ingested|Inhaled|Contact|Injury)\)\.\s/.test(p));
            if (!runIn.length) { if (hazards.length === 0) introEnd = i + 1; continue; }
            if (hazards.length === 0 && introEnd === from) introEnd = i;
            // one hazard per run-in paragraph: give each its own pseudo-block range by splitting the block
            for (const p of paras) {
                const m = p.match(/^([A-Z][^.(]{2,60}?)\s\((Ingested|Inhaled|Contact|Injury)\)\.\s/);
                if (m) hazards.push({ name: m[1].trim(), type: m[2], from: i, to: i + 1, para: p, pages: b.pages });
                else if (hazards.length) { hazards[hazards.length - 1].para += "\n\n" + p; }
            }
        }
        // convert paragraph-level hazards into block-level ones by splitting blocks
        const out = [];
        let offset = 0;
        for (const hz of hazards) out.push(hz);
        // renderBlocks works on block ranges; give each hazard a synthetic block
        for (const hz of out) {
            const synthetic = { lines: [{ page: hz.pages[0], x0: 0, text: hz.para.split("\n\n").join("\n") }], pages: hz.pages, synthetic: hz.para };
            hz.synthetic = synthetic;
        }
        return { introEnd, hazards: out.map(hz => ({ name: hz.name, type: hz.type, from: -1, to: -1, synthetic: hz })) };
    }
    let introEnd = to;
    const heads = [];
    for (let i = from; i < to; i++) {
        if (kinds[i] !== "heading") continue;
        const t = blockText(blocks[i]);
        if (ch.hazards.subtitleLine && /^(Mechanical|Magic) trap$/.test(t)) continue;
        heads.push({ name: t, index: i });
    }
    if (heads.length) introEnd = heads[0].index;
    for (let k = 0; k < heads.length; k++) {
        const h = heads[k];
        const end = k + 1 < heads.length ? heads[k + 1].index : to;
        let type = null;
        if (ch.hazards.subtitleLine && kinds[h.index + 1] === "heading") type = blockText(blocks[h.index + 1]);
        hazards.push({ name: h.name, type, from: h.index, to: end });
    }
    return { introEnd, hazards };
}

// ------------------------------------------------------------------------------------------
// Conditions (Appendix PH-A, pages 358-359)
// ------------------------------------------------------------------------------------------

const CONDITION_NAMES = ["Blinded", "Charmed", "Deafened", "Exhaustion", "Frightened", "Grappled", "Incapacitated", "Invisible", "Paralyzed", "Petrified", "Poisoned", "Prone", "Restrained", "Stunned", "Unconscious"];

function stageConditions(entries, warnings) {
    const flow = rangeFlow(358, 359);
    const blocks = blocksOf(flow);
    const kinds = blocks.map(blockKind);
    const section = "Appendix PH-A: Conditions";
    const exSpec = { caption: "Exhaustion", columns: ["Level", "Effect"], until: "If an already exhausted creature" };
    // the exhaustion table follows the Exhaustion heading's first paragraph; locate its header line
    let exTable = null, exHit = null;
    {
        const hdr = flow.findIndex(l => !l.brk && /^Level\s{2,}Effect$/.test(l.text.trim()));
        const u = hdr >= 0 ? findLine(flow, exSpec.until, hdr + 1) : -1;
        if (hdr >= 0 && u > hdr) {
            const lines = flow.slice(hdr, u);
            const t = readTable(lines, { caption: "Exhaustion", columns: ["Level", "Effect"], mode: "numbered" });
            if (t.error) warnings.push({ page: 358, message: t.error });
            else {
                exTable = t;
                const fromBlock = blocks.findIndex(b => b.lines.includes(flow[hdr]));
                let toBlock = blocks.findIndex(b => b.lines.includes(flow[u]));
                exHit = { table: t, fromBlock, toBlock, pages: [...new Set(lines.filter(l => !l.brk).map(l => l.page))] };
            }
        } else warnings.push({ page: 358, message: "exhaustion table header not found" });
    }
    const h0 = findHeading(blocks, "Appendix PH-A: Conditions", 0, kinds);
    const marks = [];
    let from = h0 ? h0.index + h0.span : 0;
    for (const name of CONDITION_NAMES) {
        const h = findHeading(blocks, name, from, kinds);
        if (!h) { warnings.push({ page: 358, message: `condition heading "${name}" not found` }); continue; }
        marks.push({ name, index: h.index });
        from = h.index + 1;
    }
    // appendix intro as a rule entry
    if (h0) {
        const r = renderBlocks(blocks, kinds, h0.index, marks[0].index, null, warnings);
        entries.push(makeEntry({ kind: "rule", category: "rules", name: "Conditions", heading: "Conditions", pages: r.pages, section, text: r.text, data: { headingPath: ["Appendix PH-A: Conditions"], subheadings: [], tables: [] } }));
    }
    for (let i = 0; i < marks.length; i++) {
        const m = marks[i];
        const to = i + 1 < marks.length ? marks[i + 1].index : blocks.length;
        const hits = m.name === "Exhaustion" && exHit ? [exHit] : null;
        const r = renderBlocks(blocks, kinds, m.index, to, hits, warnings);
        const effects = [];
        for (let k = m.index + 1; k < to; k++) {
            if (hits && k >= exHit.fromBlock && k < exHit.toBlock) continue;
            if (kinds[k] === "bullets") for (const p of blockParagraphs(blocks[k], "bullets")) effects.push(p.replace(/^•\s*/, ""));
        }
        const data = { effects };
        const notes = [];
        if (m.name === "Exhaustion") {
            if (exTable) data.table = { caption: "Exhaustion", columns: exTable.columns, rows: exTable.rows };
            else { data.table = null; notes.push("missing: table"); }
            // exhaustion has no bullets: its effects are the table rows
            if (!effects.length && exTable) data.effects = exTable.rows.map(r => `Level ${r[0]}: ${r[1]}`);
        }
        entries.push(makeEntry({ kind: "condition", category: "rules", name: m.name, pages: r.pages, section, text: r.text, data, notes }));
    }
    if (exTable) {
        entries.push(makeEntry({ kind: "table", category: "rules", name: "Exhaustion", heading: "Exhaustion", pages: exHit.pages, section, text: tableToText(exTable),
            data: { caption: "Exhaustion", columns: exTable.columns, rows: exTable.rows, headingPath: ["Appendix PH-A: Conditions", "Exhaustion"] } }));
    }
}

// ------------------------------------------------------------------------------------------
// Appendix PH-B: Fantasy-Historical Pantheons (360-362), Appendix PH-C: The Planes of Existence (363-365)
// ------------------------------------------------------------------------------------------

const DEITY_TABLES = [
    { caption: "Celtic Deities", until: "Greek Deities" },
    { caption: "Greek Deities", until: "Egyptian Deities" },
    { caption: "Egyptian Deities", until: "Norse Deities" },
    { caption: "Norse Deities", until: null }
];

function stagePantheons(entries, warnings) {
    const flow = rangeFlow(360, 362);
    const blocks = blocksOf(flow);
    const kinds = blocks.map(blockKind);
    const section = "Appendix PH-B: Fantasy-Historical Pantheons";
    const hits = [];
    const tables = [];
    const notes = [];
    for (const d of DEITY_TABLES) {
        const spec = { caption: d.caption, columns: ["Deity", "Alignment", "Suggested Domains", "Symbol"], until: d.until };
        const region = tableRegion(flow, spec, 0);
        if (!region) { warnings.push({ page: 360, message: `deity table "${d.caption}" not located` }); notes.push(`missing: table "${d.caption}"`); continue; }
        const t = readTable(region.lines, spec);
        if (t.error) { warnings.push({ page: region.lines[0].page, message: t.error }); notes.push(`missing: table "${d.caption}"`); continue; }
        const startLine = flow[region.start], endLine = region.end < flow.length ? flow[region.end] : null;
        const fromBlock = blocks.findIndex(b => b.lines.includes(startLine));
        const toBlock = endLine ? blocks.findIndex(b => b.lines.includes(endLine)) : blocks.length;
        hits.push({ table: t, fromBlock, toBlock });
        tables.push({ caption: t.caption, columns: t.columns, rows: t.rows });
    }
    const h0 = findHeading(blocks, "Appendix PH-B: Fantasy-Historical Pantheons", 0, kinds) || findHeading(blocks, "Appendix PH-B:", 0, kinds);
    const start = h0 ? h0.index : 0;
    const r = renderBlocks(blocks, kinds, start, blocks.length, hits, warnings);
    const subheadings = [];
    for (let i = start + (h0 ? h0.span : 0); i < blocks.length; i++) if (kinds[i] === "heading" && !hits.some(h => i >= h.fromBlock && i < h.toBlock)) subheadings.push(blockText(blocks[i]));
    entries.push(makeEntry({ kind: "appendix", category: "rules", name: "Fantasy-Historical Pantheons", heading: "Appendix PH-B: Fantasy-Historical Pantheons", pages: r.pages, section, text: r.text,
        data: { headingPath: ["Appendix PH-B: Fantasy-Historical Pantheons"], subheadings, tables, deityCount: tables.reduce((n, t) => n + t.rows.length, 0) }, notes }));
}

function stagePlanes(entries, warnings) {
    const flow = rangeFlow(363, 365);
    const blocks = blocksOf(flow);
    const kinds = blocks.map(blockKind);
    const section = "Appendix PH-C: The Planes of Existence";
    const h0 = findHeading(blocks, "Appendix PH-C: The Planes of Existence", 0, kinds) || findHeading(blocks, "Appendix PH-C:", 0, kinds);
    const start = h0 ? h0.index : 0;
    const r = renderBlocks(blocks, kinds, start, blocks.length, null, warnings);
    const subheadings = [];
    for (let i = start + (h0 ? h0.span : 0); i < blocks.length; i++) if (kinds[i] === "heading") subheadings.push(blockText(blocks[i]));
    entries.push(makeEntry({ kind: "appendix", category: "rules", name: "The Planes of Existence", heading: "Appendix PH-C: The Planes of Existence", pages: r.pages, section, text: r.text,
        data: { headingPath: ["Appendix PH-C: The Planes of Existence"], subheadings, tables: [] } }));
}

// ------------------------------------------------------------------------------------------
// Spot checks
// ------------------------------------------------------------------------------------------

function spotChecks(entries, chk) {
    const byId = new Map(entries.map(e => [e.id, e]));
    const blinded = byId.get("srd:condition:blinded");
    chk.check(blinded && blinded.data.effects.length === 2 && /can’t see/.test(blinded.data.effects[0]), "spot: Blinded has 2 effects, the first about not seeing");
    const ex = byId.get("srd:condition:exhaustion");
    chk.check(ex && ex.data.table && ex.data.table.rows.length === 6 && ex.data.table.rows[5][1] === "Death", "spot: Exhaustion table has 6 levels ending in Death");
    const tp = byId.get("srd:table:travel-pace");
    chk.check(tp && tp.data.rows && tp.data.rows.length === 3 && tp.data.rows[0][0] === "Fast" && tp.data.rows[0][1] === "400 feet" && tp.data.rows[2][3] === "18 miles", "spot: Travel Pace table: Fast 400 feet, Slow 18 miles per day");
    const cover = byId.get("srd:rule:combat-cover");
    chk.check(cover && /half cover/.test(cover.text) && /three-quarters cover/.test(cover.text) && /total cover/.test(cover.text), "spot: Combat: Cover names half, three-quarters and total cover");
    const dc = byId.get("srd:table:typical-difficulty-classes");
    chk.check(dc && dc.data.rows && dc.data.rows.length === 6 && dc.data.rows[0][0] === "Very easy" && dc.data.rows[5][1] === "30", "spot: Typical Difficulty Classes: 6 rows from Very easy (5) to Nearly impossible (30)");
    const cm = byId.get("srd:hazard:crawler-mucus");
    chk.check(cm && cm.data.hazardType === "Contact" && /DC 13 Constitution/.test(cm.text), "spot: Crawler Mucus is a contact poison with a DC 13 Constitution save");
    const cf = byId.get("srd:hazard:cackle-fever");
    chk.check(cf && /DC 13 Constitution saving throw/.test(cf.text) && /5 \(1d10\) psychic damage/.test(cf.text), "spot: Cackle Fever text carries its DC 13 save and 5 (1d10) psychic damage");
    // deity counts as printed on pages 360-362 (counted 2026-09-22): Celtic 14, Greek 19, Egyptian 14, Norse 20
    const pan = byId.get("srd:appendix:fantasy-historical-pantheons");
    const deityRows = pan ? pan.data.tables.map(t => t.rows.length) : [];
    chk.check(pan && deityRows.join(",") === "14,19,14,20" && pan.data.deityCount === 67, `spot: Pantheons parse 4 deity tables with 14, 19, 14 and 20 deities (got ${pan ? deityRows.join(", ") + " = " + pan.data.deityCount : "no entry"})`);
    const lugh = pan && pan.data.tables[0].rows.find(r => /^Lugh,/.test(r[0]));
    chk.check(lugh && lugh[1] === "CN" && lugh[2] === "Knowledge, Life" && lugh[3] === "Pair of long hands", `spot: Celtic row Lugh reads CN | Knowledge, Life | Pair of long hands (got ${JSON.stringify(lugh)})`);
}

module.exports = {
    CACHE_DIR, STAGING_DIR, SOURCE_DOCUMENT,
    readLayout, readLayoutNormalized, readReading, readManifest,
    detectRightStart, pageBands, pageFlow, rangeFlow, BREAK, layoutMoveReport,
    blocksOf, blockKind, blockText, blockParagraphs, rawTableRows, headingLike, indentOf, isTableLine, isBullet, isLabel, joinLines,
    lineCells, clusterByX, segmentWrapped, readTable, tableToText,
    findHeading, findLine, tableRegion, renderBlocks, makeEntry, writeStaging,
    makeChecker, requiredFieldsMissing, pageCoverage, countBy
};

if (require.main === module) main();
