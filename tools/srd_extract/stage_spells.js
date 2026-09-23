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
// Column splitting. lib/srd_text.js splitLayoutColumns finds the gutter, but its rightStart cuts
// the left column short on lines whose text runs past the gutter, and pdftotext pads the right
// column to an absolute character column before the cache collapses the PDF's multi-code hyphens,
// so a line whose left part holds hyphens has its right-column text a few columns further left
// (three per hyphen on the 2026-09-23 cache, two on the one before it). So the gutter decision is
// the lib's and the cut is made per line, at the first run of two or more spaces that starts before
// the page's modal right-column start and ends within the shift those hyphens allow; the shift
// itself is measured from the cache and reported, and only used to restore right-column indents.
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
const readPage = (n, layout) => fs.readFileSync(path.join(CACHE_DIR, `page_${pad(n)}${layout ? ".layout" : ""}.txt`), "utf8");
const tokenKey = (s, n) => T.toPlain(s).toLowerCase().split(/\s+/).filter(Boolean).slice(0, n).join(" ");

// ---------------------------------------------------------------------------------------------
// Column splitting
// ---------------------------------------------------------------------------------------------

/**
 * Hyphens in a string. The PDF encodes a hyphen as up to four glyph codes; pdftotext pads the right
 * column to its absolute character column before the cache collapses those codes to one character,
 * so every hyphen in the left part of a layout line can leave that line's right-column text up to
 * MAX_SHIFT_PER_HYPHEN columns left of where it sits on hyphen-free lines. The cut only allows for
 * this; the shift actually present is measured from the cache (measureShift), never assumed.
 * Only joining hyphens count (preceded by a non-space character, as in "24-hour" or "long-"): a
 * minus sign (normalised from U+2212, as in "takes a -2") is a single glyph code and shifts nothing.
 */
const HYPHEN_RE = /(?<=\S)[-‐‑]/g;
const hyphensIn = s => (s.match(HYPHEN_RE) || []).length;
const MAX_SHIFT_PER_HYPHEN = 3;

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
 * Where one right-trimmed layout line splits: at the end of the gutter run, the first run of 2+
 * spaces that starts before R - 2 and ends at or after R - MAX_SHIFT_PER_HYPHEN * h - 2, h being the
 * hyphens before it. A run ending earlier lies inside the left column's text (a wide table row).
 * Returns { cut, h, problem }: cut is the line length for a left-only line; problem is set for a
 * line that reaches the right column without a gutter run (kept in the left column).
 */
function cutLine(trimmed, R) {
    const rx = / {2,}/g; let m;
    while ((m = rx.exec(trimmed)) !== null) {
        const start = m.index, e = start + m[0].length;
        if (start > R - 2) break;
        if (e >= trimmed.length) break;
        const h = hyphensIn(trimmed.slice(0, e));
        if (e >= R - MAX_SHIFT_PER_HYPHEN * h - 2) return { cut: e, h, problem: false };
    }
    return { cut: trimmed.length, h: 0, problem: trimmed.length > R - 1 };
}

/**
 * The shift of right-column text per hyphen in the left part, measured on pages first..last: the
 * most common value of R - cut over lines whose left part holds exactly one hyphen (0 when the
 * cache does not shift). Returned with the sample count so the run can report it.
 */
function measureShift(first, last, opts) {
    const hist = new Map();
    for (let p = first; p <= last; p++) {
        const text = readPage(p, true), lines = text.split("\n");
        const lib = T.splitLayoutColumns(text, opts);
        if (lib.gutter === null) continue;
        const R = modalRightStart(lines, lib.gutter);
        if (R === null) continue;
        for (const l of lines) {
            const trimmed = l.replace(/\s+$/, "");
            const { cut, h, problem } = cutLine(trimmed, R);
            if (problem || cut === 0 || cut >= trimmed.length || h !== 1) continue;
            const d = R - cut;
            if (d >= 0) hist.set(d, (hist.get(d) || 0) + 1);
        }
    }
    let shift = 0, best = 0, samples = 0;
    for (const [d, n] of hist) { samples += n; if (n > best) { best = n; shift = d; } }
    return { shift, samples };
}

/**
 * Split one layout page into columns: [{ col, lines }] in reading order. The gutter decision is
 * splitLayoutColumns'; R is the page's modal right-column start; each line is cut by cutLine. The
 * right part keeps its indent relative to where its text starts on this line (R less the measured
 * shift per hyphen), so an indented paragraph start in the right column still reads as indented.
 */
function splitColumns(layoutText, page, warnings, opts, shift = 0) {
    const lib = T.splitLayoutColumns(layoutText, opts);
    const lines = layoutText.split("\n");
    const single = () => [{ col: 0, lines: lines.map(l => l.replace(/\s+$/, "")) }];
    if (lib.gutter === null) return single();
    const R = modalRightStart(lines, lib.gutter);
    if (R === null) {
        warnings.push({ page, message: "column split: gutter found but no right-column start; page read as one column" });
        return single();
    }
    const left = [], right = [];
    for (const l of lines) {
        const trimmed = l.replace(/\s+$/, "");
        const { cut, h, problem } = cutLine(trimmed, R);
        if (problem) warnings.push({ page, message: `column split ambiguous, line kept in the left column: ${JSON.stringify(trimmed.trim())}` });
        const rightIndent = Math.max(0, cut - (R - shift * h));
        left.push(trimmed.slice(0, cut).replace(/\s+$/, ""));
        right.push(cut < trimmed.length ? " ".repeat(rightIndent) + trimmed.slice(cut) : "");
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
        const cols = splitColumns(readPage(p, true), p, warnings, opts, measured.shift);
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

/** Reading-order paragraph starts per page: "page|first five words" -> true. */
function readingOrderParagraphStarts(first, last) {
    const starts = new Set();
    for (let p = first; p <= last; p++) {
        for (const line of readPage(p, false).split("\n")) {
            const t = line.trim();
            if (t) starts.add(p + "|" + tokenKey(t, 5));
        }
    }
    return starts;
}

/**
 * Build description blocks from layout lines. Block types: "p" (prose, lines joined with spaces),
 * "bullets" (one item per line), "table" (one row per line, spacing kept).
 *
 * Paragraph rules, from the SRD's typography: a prose paragraph after the first starts with a
 * first-line indent; an unindented line starts a paragraph only after the header block, a bullet
 * list or a table, or when it is a caption (short, capitalised, unpunctuated, followed by a table
 * or a list). A blank row before an unindented prose line is otherwise ignored: the layout puts
 * empty rows wherever the other column's line pitch differs, and the reading-order page breaks at
 * the same rows (page 132: "...10 gallons of clean" / "water within range..."), so it cannot
 * arbitrate them. Every such decision is recorded in `diag` (printed with --verbose).
 */
function buildBlocks(lines, paraStarts, diag, spellName) {
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
        const blocks = buildBlocks(descLines, paraStarts, meta.diag, name);
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
            classes: []
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
    for (let p = DESC_PAGES[0]; p <= DESC_PAGES[1]; p++) for (const l of readPage(p, false).split("\n")) { const t = l.trim(); if (t) lines.push({ page: p, text: t }); }
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
        for (const t of sp.text.split(/\s+/).filter(Boolean)) bag.set(t, (bag.get(t) || 0) + 1);
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
        for (const l of readPage(p, false).split("\n")) {
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
