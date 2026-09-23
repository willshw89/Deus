// tools/srd_extract/lib/srd_text.js - shared text helpers for the SRD 5.1 extraction pipeline.
//
// Used by extract_pages.js (page cache), the category stagers (staging_*.json) and
// build_srd_catalog.js. Pure functions, no I/O, no engine globals.
//
// Source document: SRD_CC_v5.1.pdf (CC-BY-4.0). Nothing here changes the meaning of the
// text; the only substitutions are typographic artifacts of the PDF's fonts, listed in
// NORMALIZATION_RULES so the cache manifest can record exactly what was applied.
//
// Characters are built with String.fromCharCode so this file stays pure ASCII: an editor or
// tool that decodes escape sequences must never be able to change what is normalised.
"use strict";

const C = code => String.fromCharCode(code);
const CH = Object.freeze({
    SOFT_HYPHEN: C(0x00AD), HYPHEN: C(0x2010), NB_HYPHEN: C(0x2011), FIGURE_DASH: C(0x2012), EN_DASH: C(0x2013),
    EM_DASH: C(0x2014), HORIZ_BAR: C(0x2015), MINUS: C(0x2212), LINE_SEP: C(0x2028), UNMAPPED: C(0x008A),
    LSQUO: C(0x2018), RSQUO: C(0x2019), SBQUO: C(0x201A), PRIME: C(0x2032), LDQUO: C(0x201C), RDQUO: C(0x201D),
    BDQUO: C(0x201E), DPRIME: C(0x2033), ELLIPSIS: C(0x2026), TIMES: C(0x00D7), HALF: C(0x00BD), QUARTER: C(0x00BC),
    THREE_QUARTERS: C(0x00BE), BULLET: C(0x2022), NBSP: C(0x00A0)
});
const re = (chars, flags) => new RegExp(chars, flags || "g");

/** Every substitution applied to extracted text, in order. Documented in cache/manifest.json. */
const NORMALIZATION_RULES = Object.freeze([
    { id: "crlf", from: "CR LF or CR", to: "LF", why: "pdftotext on Windows emits CRLF" },
    { id: "hyphen_artifact", from: "'-' U+00AD U+2010 [U+2011]", to: "-", why: "the PDF encodes every hyphen as hyphen + soft hyphen + hyphen, 917 of the 1,122 occurrences with a trailing non-breaking hyphen as well (well-ordered, 2nd-level, 20-foot)" },
    { id: "soft_hyphen", from: "U+00AD", to: "", why: "any soft hyphen left over is invisible in the source" },
    { id: "line_separator", from: "U+2028", to: "LF", why: "one occurrence, a line break" },
    { id: "unmapped_glyph_dash", from: "U+008A", to: "U+2014 (em dash)", why: "a glyph of the PDF's Adobe-Japan1 font that pdftotext cannot map; 493 occurrences: 492 are the empty spell-slot cells of the class tables on pages 11, 15, 19, 30, 35, 42, 46 and 52 (printed as em dashes) and one is the dash in 'where the adversaries are [em dash] how far away' on page 90" },
    { id: "backtick_apostrophe", from: "` (grave accent)", to: "U+2019 (right single quotation mark)", why: "one of the PDF's fonts emits the apostrophe as a grave accent: 10 occurrences, all possessives or contractions (Thieves` Cant, can`t, Lion`s head), on pages 35, 39, 90, 232, 358 and 361" },
    { id: "minus_sign", from: "U+2212", to: "-", why: "numeric minus in stat blocks, e.g. (-4); parsers read ASCII" }
]);

const HYPHEN_ARTIFACT = re("-" + CH.SOFT_HYPHEN + "[" + CH.HYPHEN + CH.NB_HYPHEN + "]" + CH.NB_HYPHEN + "?");
const SOFT_HYPHENS = re(CH.SOFT_HYPHEN);
const LINE_SEPS = re(CH.LINE_SEP);
const UNMAPPED_GLYPHS = re(CH.UNMAPPED);
const BACKTICKS = re("`");
const MINUS_SIGNS = re(CH.MINUS);

/** Apply NORMALIZATION_RULES to a page's raw pdftotext output. */
function normalizeText(s) {
    return String(s)
        .replace(/\r\n?/g, "\n")
        .replace(HYPHEN_ARTIFACT, "-")
        .replace(SOFT_HYPHENS, "")
        .replace(LINE_SEPS, "\n")
        .replace(UNMAPPED_GLYPHS, CH.EM_DASH)
        .replace(BACKTICKS, CH.RSQUO)
        .replace(MINUS_SIGNS, "-");
}

const PLAIN_MAP = [
    [re("[" + CH.LSQUO + CH.RSQUO + CH.SBQUO + CH.PRIME + "]"), "'"],
    [re("[" + CH.LDQUO + CH.RDQUO + CH.BDQUO + CH.DPRIME + "]"), '"'],
    [re("[" + CH.HYPHEN + CH.NB_HYPHEN + CH.FIGURE_DASH + CH.EN_DASH + CH.EM_DASH + CH.HORIZ_BAR + "]"), "-"],
    [re(CH.ELLIPSIS), "..."],
    [re(CH.TIMES), "x"],
    [re(CH.HALF), "1/2"],
    [re(CH.QUARTER), "1/4"],
    [re(CH.THREE_QUARTERS), "3/4"],
    [re(CH.BULLET), "*"],
    [re(CH.NBSP), " "]
];

/** ASCII-fold typographic punctuation for search and slugs (never for stored text). */
function toPlain(s) {
    let out = String(s);
    for (const [pattern, to] of PLAIN_MAP) out = out.replace(pattern, to);
    return out;
}

const FOOTER_RE = /^\s*System Reference Document 5\.1\s*(\d{1,3})?\s*$/;

/**
 * Remove the running footer ("System Reference Document 5.1" and the page number) from one page.
 * Reading-order pages end with the title on one line and the number on a later line; layout pages
 * carry both on one line. Returns { text, footerPage } where footerPage is the printed page number
 * (null when none was found), so the caller can verify it against the page index.
 */
function stripFooter(pageText) {
    const lines = String(pageText).split("\n");
    let footerPage = null;
    let end = lines.length;
    while (end > 0 && lines[end - 1].trim() === "") end--;
    if (end > 0 && /^\s*\d{1,3}\s*$/.test(lines[end - 1])) {
        let j = end - 2;
        while (j >= 0 && lines[j].trim() === "") j--;
        if (j >= 0 && FOOTER_RE.test(lines[j])) {
            footerPage = parseInt(lines[end - 1], 10);
            end = j;
        }
    } else if (end > 0 && FOOTER_RE.test(lines[end - 1])) {
        const m = lines[end - 1].match(FOOTER_RE);
        if (m && m[1]) footerPage = parseInt(m[1], 10);
        end--;
    }
    while (end > 0 && lines[end - 1].trim() === "") end--;
    return { text: lines.slice(0, end).join("\n"), footerPage };
}

/**
 * Split a `pdftotext -layout` page into its two text columns.
 * The gutter is the character column where most long lines have a run of spaces. Returns
 * { gutter, rightStart, left, right } with arrays of lines; gutter is null when the page reads as a
 * single column (wide tables, chapter openers) and then every line is in `left`.
 */
function splitLayoutColumns(layoutText, opts = {}) {
    const lines = String(layoutText).split("\n");
    const minCol = opts.minCol || 40, maxCol = opts.maxCol || 80, minRun = opts.minRun || 3;
    const long = lines.filter(l => l.length > maxCol);
    const single = () => ({ gutter: null, rightStart: null, left: lines.map(l => l.replace(/\s+$/, "")), right: [] });
    if (long.length < 4) return single();
    const score = new Array(maxCol + 1).fill(0);
    for (const l of long) {
        for (let c = minCol; c <= maxCol; c++) {
            let ok = true;
            for (let k = 0; k < minRun; k++) if (l[c + k] !== " ") { ok = false; break; }
            if (ok) score[c]++;
        }
    }
    let best = -1, bestScore = 0;
    for (let c = minCol; c <= maxCol; c++) if (score[c] > bestScore) { bestScore = score[c]; best = c; }
    if (best < 0 || bestScore < long.length * 0.6) return single();
    let start = best;
    while (start <= maxCol + minRun && long.every(l => l.length <= start || l[start] === " ")) start++;
    const left = [], right = [];
    for (const l of lines) {
        left.push(l.slice(0, best).replace(/\s+$/, ""));
        right.push(l.length > best ? l.slice(start).replace(/\s+$/, "") : "");
    }
    return { gutter: best, rightStart: start, left, right };
}

const DICE_SRC = "(\\d+)\\s*d\\s*(\\d+)(?:\\s*([+-])\\s*(\\d+))?";

/** Parse one dice expression such as "4d8 + 2" or "2d6". Returns null for no match. */
function parseDice(expr) {
    if (typeof expr !== "string") return null;
    const m = new RegExp(DICE_SRC).exec(normalizeText(expr));
    if (!m) return null;
    const count = parseInt(m[1], 10), sides = parseInt(m[2], 10);
    const modifier = m[4] ? (m[3] === "-" ? -1 : 1) * parseInt(m[4], 10) : 0;
    return { text: m[0].replace(/\s+/g, " ").trim(), count, sides, modifier, average: Math.floor(count * (sides + 1) / 2 + modifier) };
}

/** Every dice expression in a text, in order, each with its character offset. */
function findDice(text) {
    const out = [];
    const rx = new RegExp(DICE_SRC, "g");
    const t = normalizeText(text);
    let m;
    while ((m = rx.exec(t)) !== null) {
        const d = parseDice(m[0]);
        if (d) out.push(Object.assign({ index: m.index }, d));
    }
    return out;
}

/** "Crossbow, light" -> "crossbow-light"; "Bag of Tricks (Gray)" -> "bag-of-tricks-gray". */
function slugify(name) {
    return toPlain(name)
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/['"]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/** Stable catalogue id: srd:<kind>:<slug>[-<variant slug>]. Kinds are listed in the coverage manifest. */
function stableId(kind, name, variant) {
    const k = String(kind).toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const base = slugify(name);
    if (!k || !base) throw new Error("stableId needs a kind and a name (got " + JSON.stringify(kind) + ", " + JSON.stringify(name) + ")");
    return variant ? "srd:" + k + ":" + base + "-" + slugify(variant) : "srd:" + k + ":" + base;
}

/** Join reading-order lines into paragraphs: a blank line separates paragraphs. */
function paragraphs(text) {
    return String(text).split(/\n\s*\n/).map(p => p.split("\n").map(l => l.trim()).filter(Boolean).join(" ")).filter(Boolean);
}

/**
 * Heading candidates on a reading-order page: short lines that start with a capital, have no
 * terminal punctuation and precede a non-empty line. An aid for the stagers, not a truth.
 */
function headingCandidates(text, opts = {}) {
    const maxLen = opts.maxLen || 48;
    const lines = String(text).split("\n");
    const out = [];
    for (let i = 0; i < lines.length; i++) {
        const l = lines[i].trim();
        if (!l || l.length > maxLen) continue;
        if (!/^[A-Z]/.test(l)) continue;
        if (/[.:;,!?]$/.test(l)) continue;
        if (/^(STR|DEX|CON|INT|WIS|CHA)\b/.test(l)) continue;
        if (/^\d/.test(l)) continue;
        if (l.split(/\s+/).length > 8) continue;
        const next = (lines[i + 1] || "").trim();
        if (!next) continue;
        out.push({ line: i, text: l });
    }
    return out;
}

module.exports = {
    CH,
    NORMALIZATION_RULES,
    normalizeText,
    toPlain,
    stripFooter,
    splitLayoutColumns,
    parseDice,
    findDice,
    slugify,
    stableId,
    paragraphs,
    headingCandidates
};
