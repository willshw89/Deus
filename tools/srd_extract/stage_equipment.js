// tools/srd_extract/stage_equipment.js - SRD 5.1 Equipment chapter (pages 62-75) -> staging_equipment.json
//
// Usage: node tools/srd_extract/stage_equipment.js
// Reads the page cache written by extract_pages.js (cache/page_NNN.layout.raw.txt for structure,
// columns cut on the raw grid and normalised afterwards; cache/page_NNN.txt for the prose and page
// cross-checks) and writes staging/staging_equipment.json in the shape given by
// docs/SRD5_1_COVERAGE_MANIFEST.md section 6. Exit 1 when any self-check fails.
//
// Entries: weapon, armor, gear, tool, mount, vehicle, trade-good (category "equipment") plus one
// `rule` entry per chapter heading (category "rules"), each carrying the chapter's tables. The
// assembler routes entries by category, so the rules live here only because they share the pages.
//
// How the tables are read. pdftotext -layout keeps every cell at its printed x position but, for
// most tables of this chapter, not on its printed row: the Armor, Adventuring Gear, Tack, Mounts,
// Waterborne, Lifestyle, Food and Services tables come out with one column's values shifted up or
// down by several rows (page 64 prints "Studded leather 45 gp" with no AC and "Medium Armor" with
// "12 + Dex modifier"). Within a column the printed order is intact. So each table is read column
// by column: the names (their indentation marks group headers) and each value column as an ordered
// sequence, then zipped. A zip is accepted only when every value column has exactly one value per
// item; otherwise the table is a FAIL, never a guess. Cells are recognised by their value pattern
// (cost, weight, AC, ...) because the layout sometimes separates cells with a single space.
// The Weapons table is aligned except for its last rows (WEAPONS_NET_NOTE).
"use strict";

const fs = require("fs");
const path = require("path");
const T = require("./lib/srd_text");

const CACHE = path.join(__dirname, "cache");
const OUT_DIR = path.join(__dirname, "staging");
const OUT = path.join(OUT_DIR, "staging_equipment.json");
const CATEGORY = "equipment";
const SECTION = "Equipment";
const CHAPTER_PAGES = [62, 75];
const PAGES = [62, 74]; // page 75 is "Feats" (WARN_PAGE_75)
const WARN_PAGE_75 = "page 75 is the Feats section (Grappler), not equipment; left to stage_character_options.js (the contract's section map lists feats under pages 56-61)";
const WEAPONS_NET_NOTE = "page 66: the Weapons table's last rows are misaligned in the source (the Net row's values sit on the Longbow line and the name 'Net' on the line after it); the names and value rows of the Martial Ranged Weapons group were re-paired by printed order";

const EXPECTED = { weapon: [37, 0], armor: [13, 0], gear: [99, 2], tool: [36, 0], mount: [8, 0], vehicle: [20, 1], "trade-good": [13, 0] }; // mirrors docs/SRD5_1_COVERAGE_MANIFEST.md section 4 (counts corrected 2026-09-22 from the pages)
const DASH = "\u2014";

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
 * gutter, so that a line whose text runs through the gutter column loses no word, and each piece is
 * normalised afterwards (T.normalizeText). Right-column x positions are measured from the most common
 * start column; a line whose left text was pushed into the gutter is never taken as an indented start.
 * `moved` counts the lines whose cut differs from the library's fixed cut (the guard's report).
 */
function splitColumns(rawText) {
    const lib = T.splitRawLayoutColumns(rawText);
    const lines = rawText.split("\n");
    const rstrip = l => l.replace(/\s+$/, "");
    const norm = l => rstrip(T.normalizeText(l));
    const full = lines.map(norm);
    if (lib.gutter === null) return { gutter: null, full, left: full, right: lines.map(() => ""), rightX0: lines.map(() => 0), rightIndent: lines.map(() => 0), moved: 0 };
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
        const L = c ? norm(l.slice(0, c.a)) : norm(l), R = c ? norm(l.slice(c.b)) : "";
        left.push(L); right.push(R);
        const x0 = c ? c.vb - rightStart : 0;
        rightX0.push(x0);
        rightIndent.push(c && c.pushed ? (x0 >= 4 ? 2 : 0) : Math.max(0, x0));
        if (L.trim() !== (lib.left[i] || "").trim() || R.trim() !== (lib.right[i] || "").trim()) moved++;
    });
    return { gutter: g, full, left, right, rightX0, rightIndent, moved };
}

/** Linear stream of layout lines: every page's left column, then its right column. Left lines keep the full physical line. */
function buildStream(first, last) {
    const stream = [], partners = new Map(), moved = {};
    for (let p = first; p <= last; p++) {
        const s = splitColumns(readRawLayout(p));
        if (s.moved) moved[p] = s.moved;
        const mk = (col, raw, j, full, indent) => { const text = raw.replace(/^\s+/, ""); return { page: p, col, lineNo: j, indent: indent === undefined ? raw.length - text.length : indent, raw, full, text, used: false }; };
        s.left.forEach((raw, j) => stream.push(mk("L", raw, j, s.full[j])));
        if (s.gutter !== null) s.right.forEach((text, j) => {
            const l = mk("R", " ".repeat(Math.max(0, s.rightX0[j])) + text.replace(/^\s+/, ""), j, null, s.rightIndent[j]);
            stream.push(l); partners.set(p + ":" + j, l);
        });
    }
    return { stream, partners, moved };
}

function findLine(stream, page, col, re, nth = 1) {
    let n = 0;
    for (let i = 0; i < stream.length; i++) {
        const l = stream[i];
        if (l.page === page && l.col === col && !l.used && re.test(l.text) && ++n === nth) return i;
    }
    return -1;
}

/** Take lines from start until endRe matches (exclusive) or the column ends; marks them (and, for full-width tables, their right-column partners) used. */
function takeRange(S, start, endRe, fullWidth) {
    const out = [];
    const { page, col } = S.stream[start];
    for (let i = start; i < S.stream.length; i++) {
        const l = S.stream[i];
        if (l.page !== page || l.col !== col) break;
        if (endRe && endRe.test(l.text)) break;
        l.used = true;
        if (fullWidth) { const r = S.partners.get(l.page + ":" + l.lineNo); if (r) r.used = true; l.line = l.full; } else l.line = l.raw;
        out.push(l);
    }
    while (out.length && !out[out.length - 1].text) out.pop();
    return out;
}

// ---------------------------------------------------------------- text helpers

const HYPHEN_END = /[-\u2010\u2011\u2014]$/;
const joinWrapped = (a, b) => HYPHEN_END.test(a) ? a + b : a + " " + b;

/**
 * Unwrap stream lines into paragraphs: a blank line, an indent of 2+ or a bullet starts a new one.
 * A paragraph cut by a column or page break (blank lines, then an unindented line starting lowercase
 * while the paragraph has no closing punctuation yet) is joined back together.
 */
function toParagraphs(lines) {
    const out = [];
    let cur = null, pages = [], pendingBreak = false;
    const flush = () => { if (cur) out.push({ text: cur, pages: [...new Set(pages)] }); cur = null; pages = []; };
    for (const l of lines) {
        if (!l.text) { pendingBreak = true; continue; }
        // a bullet's later lines hang two columns in; they continue the bullet, they do not start a paragraph
        const bulletCont = cur && /^[\u2022*]/.test(cur) && !pendingBreak && l.indent <= 2 && !/^[\u2022*]/.test(l.text) && (/^[a-z]/.test(l.text) || (!/[.!?:\u201d"\)]$/.test(cur) && cur.length >= 35));
        const starts = !bulletCont && (l.indent >= 2 || /^[\u2022*]/.test(l.text));
        const joinAcrossBreak = pendingBreak && cur && !starts && /^[a-z]/.test(l.text) && !/[.!?:\u201D"\)]$/.test(cur);
        if (cur && !starts && (!pendingBreak || joinAcrossBreak)) { cur = joinWrapped(cur, l.text); pages.push(l.page); }
        else { flush(); cur = l.text; pages = [l.page]; }
        pendingBreak = false;
    }
    flush();
    return out;
}

const normKey = s => T.toPlain(s).toLowerCase().replace(/\s+/g, " ").trim();

function parseNumber(s) {
    const frac = { "\u00BD": 0.5, "\u00BC": 0.25, "\u00BE": 0.75 };
    const m = /^(\d+)?([\u00BD\u00BC\u00BE])?(?:(\d+)\/(\d+))?$/.exec(String(s).replace(/,/g, ""));
    if (!m || !m[0]) return null;
    return (m[1] ? Number(m[1]) : 0) + (m[2] ? frac[m[2]] : 0) + (m[3] ? Number(m[3]) / Number(m[4]) : 0);
}

function parseCost(s) {
    if (s == null) return { amount: null, unit: null, text: null };
    const m = /^([\d,]+) (cp|sp|ep|gp|pp)$/.exec(s);
    return m ? { amount: Number(m[1].replace(/,/g, "")), unit: m[2] } : { amount: null, unit: null, text: s };
}

function parseWeight(s) {
    if (s == null || s === DASH) return null;
    const m = /^([\d,\u00BD\u00BC\u00BE/]+) lb\.( \(full\))?$/.exec(s);
    if (!m) return { lb: null, text: s };
    const w = { lb: parseNumber(m[1]) };
    if (m[2]) w.note = "full";
    return w;
}

function parseDamage(s) {
    if (s === DASH) return null;
    const m = /^(\d+d\d+|\d+) ([a-z]+)$/.exec(s);
    return m ? { dice: m[1], type: m[2] } : { dice: null, type: null, text: s };
}

/** "Finesse, light, thrown (range 20/60)" -> [{ name, detail }] */
function parseProperties(s) {
    if (!s || s === DASH) return [];
    const parts = [];
    let depth = 0, cur = "";
    for (const ch of s) {
        if (ch === "(") depth++;
        if (ch === ")") depth--;
        if (ch === "," && depth === 0) { parts.push(cur); cur = ""; } else cur += ch;
    }
    parts.push(cur);
    return parts.map(x => x.trim()).filter(Boolean).map(x => {
        const m = /^([^(]+?)\s*(?:\(([^)]*)\))?$/.exec(x);
        return { name: m[1].trim().toLowerCase(), detail: m[2] ? m[2].trim() : null };
    });
}

function parseAc(s) {
    const m = /^(\d+)( \+ Dex modifier)?( \(max 2\))?$/.exec(s || "");
    if (m) return { base: Number(m[1]), dexModifier: m[3] ? "max2" : m[2] ? "full" : "none", bonus: 0 };
    const b = /^\+(\d+)$/.exec(s || "");
    return b ? { base: 0, dexModifier: "none", bonus: Number(b[1]) } : null;
}

// ---------------------------------------------------------------- token-based table reader

const RE = {
    cost: /\d[\d,]* (?:cp|sp|ep|gp|pp)(?: minimum)?/,
    pay: /\d[\d,]* (?:cp|sp|ep|gp|pp)(?: per (?:mile|day))?/,
    weight: /[\d,\u00BD\u00BC\u00BE/]+ lb\.(?: \(full\))?/,
    ac: /\d+ \+ Dex modifier(?: \(max 2\))?|\+\d+|\b\d{2}\b/,
    strength: /Str \d+/,
    stealth: /Disadvantage/,
    speedFt: /\d+ ft\./,
    speedMph: /[\d\u00BD]+ mph/,
    capacity: /[\d,]+ lb\./,
    dash: /\u2014/,
    star: /\*/,
    times: /\u00D7\d+/
};

/**
 * Tokenise one line: value cells by the table's token patterns (in priority order), the rest is the name.
 * Returns { name, values: [{ key, text, x }] }. Wildcard keys ("dash", "star", "times") are resolved later.
 */
function tokenize(line, tokens) {
    const re = new RegExp(tokens.map(t => "(" + RE[t.re].source + ")").join("|"), "g");
    const values = [], rest = [];
    let last = 0, m;
    while ((m = re.exec(line)) !== null) {
        const between = line.slice(last, m.index), before = between.trim();
        if (before) rest.push({ x: last + between.search(/\S/), text: before });
        const k = m.slice(1).findIndex(g => g !== undefined);
        values.push({ key: tokens[k].key, text: m[0], x: m.index });
        last = m.index + m[0].length;
    }
    const tailRaw = line.slice(last), tail = tailRaw.trim();
    if (tail) rest.push({ x: last + tailRaw.search(/\S/), text: tail });
    return { rest, values };
}

/**
 * Read a table whose rows may be misaligned but whose columns are in printed order.
 * cfg: { caption, columns: [key...] (value columns in printed order), tokens: [{ key, re }], headerRe, skipRe,
 *        stripTokens, dashColumns: [{ key, header }] (resolve a dash by x position from the header),
 *        wildcard: key for dash/star/times when not position-resolved ("fill" = next missing column on the line),
 *        groupHeaders: [names] (when the layout lost the indentation), groupBy: "indent" | "list" }
 * Returns { items: [{ name, indent, group, values, page }], names: [{ name, isGroup }] }.
 */
function readColumnTable(lines, cfg, fail) {
    const strip = new Set(cfg.stripTokens || []);
    const seqs = {};
    for (const c of cfg.columns) seqs[c] = [];
    const names = [];
    let headerPos = null;
    for (const l of lines) {
        if (!l.text) continue;
        if (cfg.headerRe && cfg.headerRe.test(l.text)) {
            if (cfg.dashColumns) { headerPos = {}; for (const dc of cfg.dashColumns) { const x = l.line.indexOf(dc.header); if (x >= 0) headerPos[dc.key] = x; } }
            continue;
        }
        if (cfg.skipRe && cfg.skipRe.test(l.text)) continue;
        const { rest, values } = tokenize(l.line, cfg.tokens);
        const seen = new Set(values.filter(v => cfg.columns.includes(v.key)).map(v => v.key));
        for (const v of values) {
            let key = v.key;
            if (!cfg.columns.includes(key)) {
                if (key === "dash" && cfg.dashColumns && headerPos) {
                    let bk = null, bd = Infinity;
                    for (const dc of cfg.dashColumns) { const d = Math.abs(v.x - headerPos[dc.key]); if (d < bd) { bd = d; bk = dc.key; } }
                    key = bk;
                } else if (cfg.wildcard === "fill") { key = cfg.columns.find(c => !seen.has(c)) || null; if (key) seen.add(key); }
                else key = cfg.wildcard || null;
            }
            if (!key) { fail("page " + l.page + ": " + cfg.caption + ": token " + JSON.stringify(v.text) + " has no column: " + l.text); continue; }
            seqs[key].push(v.text);
        }
        const nameParts = rest.filter(r => !strip.has(r.text));
        if (nameParts.length > 1) fail("page " + l.page + ": " + cfg.caption + ": more than one name on a line: " + l.text);
        if (nameParts.length) names.push({ name: nameParts[0].text, indent: nameParts[0].x, page: l.page });
    }
    const groupSet = new Set(cfg.groupHeaders || []);
    const items = [];
    let group = null;
    for (let i = 0; i < names.length; i++) {
        const n = names[i], next = names[i + 1];
        const isGroup = groupSet.has(n.name) || (cfg.groupBy === "indent" && !!next && next.indent >= n.indent + 2);
        n.isGroup = isGroup;
        if (isGroup) { group = n.name; continue; }
        if (n.indent < 2) group = null;
        n.item = { name: n.name, indent: n.indent, group, values: {}, page: n.page };
        items.push(n.item);
    }
    for (const c of cfg.columns) {
        if (seqs[c].length !== items.length) fail(cfg.caption + ": column " + c + " has " + seqs[c].length + " values for " + items.length + " items [" + items.map(i => i.name).join(", ") + "]");
        else items.forEach((it, i) => { it.values[c] = seqs[c][i]; });
    }
    return { items, names };
}

/** Rows of a rule table in printed order: group headers as rows of their own (empty value cells), items with their values. */
function tableRows(r, keys) {
    return r.names.map(n => n.isGroup ? [n.name].concat(keys.map(() => "")) : [n.name].concat(keys.map(k => n.item.values[k] === undefined ? "" : n.item.values[k])));
}

/** A table rendered into entry text: caption, header, rows and the source's own footnote (never the parser's note). */
function renderTable(t) {
    const lines = [];
    if (t.caption) lines.push(t.caption);
    lines.push(t.columns.join(" | "));
    for (const r of t.rows) lines.push(r.join(" | "));
    if (t.footnote) lines.push(t.footnote);
    return lines.join("\n");
}

/** Every page a block of table lines was printed on. */
const pagesOf = lines => [...new Set(lines.filter(l => l.text).map(l => l.page))];

// ---------------------------------------------------------------- main

function main() {
    const failures = [], warnings = [];
    const fail = msg => failures.push(msg);
    const warn = (page, message) => warnings.push({ page, message });
    const cacheManifest = JSON.parse(fs.readFileSync(path.join(CACHE, "manifest.json"), "utf8"));
    const S = buildStream(PAGES[0], PAGES[1]);
    const stream = S.stream;
    const movedTotal = Object.values(S.moved).reduce((a, b) => a + b, 0);
    console.log("INFO guard: the nearest-gap cut moved " + movedTotal + " line(s) against splitRawLayoutColumns" + (movedTotal ? " (" + Object.entries(S.moved).map(([p, n]) => "p" + p + ":" + n).join(", ") + ")" : ""));
    warn(75, WARN_PAGE_75);

    const tables = {};
    const ruleTables = {};
    const addTable = (heading, t) => { tables[t.caption] = t; (ruleTables[heading] = ruleTables[heading] || []).push(t); };
    const locate = (page, col, re, nth) => { const i = findLine(stream, page, col, re, nth); if (i < 0) fail("page " + page + ": line not found: " + re); return i; };
    const two = (a, b, endRe, fullWidth) => (a < 0 || b < 0) ? [] : takeRange(S, a, null, fullWidth).concat(takeRange(S, b, endRe, fullWidth));

    // ---- T1 Standard Exchange Rates (page 62): CP/SP/EP sit on the coin rows, GP/PP on their own rows.
    {
        const i = locate(62, "L", /^Coin\s+CP\s+SP\s+EP/);
        const cap = locate(62, "L", /^Standard Exchange Rates$/);
        if (i >= 0 && cap >= 0) {
            stream[cap].used = true;
            const block = takeRange(S, i, /^Selling Treasure$/);
            const coins = [], gpPp = [];
            for (const l of block.slice(1)) {
                if (!l.text) continue;
                const m = /^([A-Z][a-z]+ \([a-z]+\))\s+(\S+)\s+(\S+)\s+(\S+)(?:\s+(\S+)\s+(\S+))?$/.exec(l.text);
                if (m) { coins.push([m[1], m[2], m[3], m[4]]); if (m[5]) gpPp.push([m[5], m[6]]); }
                else { const v = l.text.split(/\s+/); if (v.length === 2) gpPp.push(v); else fail("page 62: exchange table line not understood: " + l.text); }
            }
            if (coins.length !== 5 || gpPp.length !== 5) fail("page 62: exchange table expected 5 coins and 5 GP/PP pairs, got " + coins.length + "/" + gpPp.length);
            addTable("Equipment", { caption: "Standard Exchange Rates", columns: ["Coin", "CP", "SP", "EP", "GP", "PP"], rows: coins.map((c, k) => c.concat(gpPp[k] || ["?", "?"])), page: 62 });
        }
    }

    // ---- T2 Armor (pages 63-64, full width)
    const armorItems = [];
    {
        const lines = two(locate(63, "L", /^Armor\s+Cost\s+Armor Class \(AC\)/), locate(64, "L", /./), /^Getting Into and Out of Armor$/, true);
        const r = readColumnTable(lines, {
            caption: "Armor", headerRe: /^Armor\s+Cost\s+Armor Class/, stripTokens: ["Armor"],
            columns: ["cost", "ac", "strength", "stealth", "weight"],
            tokens: [{ key: "cost", re: "cost" }, { key: "weight", re: "weight" }, { key: "ac", re: "ac" }, { key: "strength", re: "strength" }, { key: "stealth", re: "stealth" }, { key: "dash", re: "dash" }],
            dashColumns: [{ key: "strength", header: "Strength" }, { key: "stealth", header: "Stealth" }], groupBy: "indent"
        }, fail);
        armorItems.push(...r.items);
        addTable("Armor", { caption: "Armor", columns: ["Armor", "Cost", "Armor Class (AC)", "Strength", "Stealth", "Weight"], rows: tableRows(r, ["cost", "ac", "strength", "stealth", "weight"]), page: 63, pages: pagesOf(lines) });
    }

    // ---- T3 Donning and Doffing Armor (page 64)
    {
        const i = locate(64, "L", /^Donning and Doffing Armor$/);
        if (i >= 0) {
            const block = takeRange(S, i, /^Weapons$/);
            const rows = block.filter(l => l.text && !/^Donning|^Category/.test(l.text)).map(l => l.text.split(/ {2,}/));
            if (rows.length !== 4 || rows.some(r => r.length !== 3)) fail("page 64: Donning and Doffing table expected 4 rows x 3 cells");
            addTable("Getting Into and Out of Armor", { caption: "Donning and Doffing Armor", columns: ["Category", "Don", "Doff"], rows, page: 64 });
        }
    }

    // ---- T4 Weapons (pages 65-66, full width), row-wise with the Net repair
    const weaponItems = [];
    {
        const lines = two(locate(65, "L", /^Weapons\s+Cost Damage/), locate(66, "L", /./), /^Adventuring Gear$/, true);
        const groups = {}, order = [];
        let group = null;
        const tokens = [{ key: "cost", re: "cost" }, { key: "damage", re: "damage" }, { key: "weight", re: "weight" }, { key: "dash", re: "dash" }];
        RE.damage = /(?:\d+d\d+|\d+) (?:bludgeoning|piercing|slashing)/;
        for (const l of lines) {
            if (!l.text || /^Weapons\s+Cost|^Name$/.test(l.text)) continue;
            const gm = /^(Simple|Martial) (Melee|Ranged) Weapons$/.exec(l.text);
            if (gm) { group = l.text; groups[group] = { names: [], values: [] }; order.push(group); continue; }
            const { rest, values } = tokenize(l.line, tokens);
            const v = {};
            for (const t of values) {
                let key = t.key;
                if (key === "dash") key = ["damage", "weight", "properties"].find(k => !(k in v) && (k !== "properties" || rest.every(r => r.x < t.x)));
                v[key] = t.text;
            }
            const name = rest.length && rest[0].x < (values[0] ? values[0].x : Infinity) ? rest.shift().text : null;
            const props = rest.length ? rest[rest.length - 1].text : null;
            if (props) v.properties = props;
            if (name) groups[group].names.push({ name, page: l.page });
            if (values.length) {
                const missing = ["cost", "damage", "weight", "properties"].filter(k => !(k in v));
                if (missing.length) fail("page " + l.page + ": weapon row lacks " + missing.join(",") + ": " + l.text);
                groups[group].values.push(Object.assign({ page: l.page, nameOnLine: name }, v));
            } else if (!name) fail("page " + l.page + ": weapon line not understood: " + l.text);
        }
        const rows = [];
        for (const g of order) {
            const G = groups[g];
            if (G.names.length !== G.values.length) { fail(g + ": " + G.names.length + " names vs " + G.values.length + " value rows"); continue; }
            const misaligned = G.values.some(v => v.nameOnLine === null);
            G.names.forEach((n, k) => {
                const v = G.values[k];
                const notes = [];
                if (misaligned && v.nameOnLine !== n.name) notes.push(WEAPONS_NET_NOTE);
                weaponItems.push({ name: n.name, group: g, values: v, page: n.page, notes });
                rows.push([g + ": " + n.name, v.cost, v.damage, v.weight, v.properties]);
            });
        }
        if (weaponItems.some(w => w.notes.length)) warn(66, WEAPONS_NET_NOTE);
        addTable("Weapons", { caption: "Weapons", columns: ["Name", "Cost", "Damage", "Weight", "Properties"], rows, page: 65, pages: pagesOf(lines) });
    }

    // ---- T5 Adventuring Gear (pages 68-69)
    const gearItems = [];
    {
        const cap = locate(68, "R", /^Adventuring Gear$/);
        if (cap >= 0) stream[cap].used = true;
        const lines = two(locate(69, "L", /^Item\s+Cost\s+Weight/), locate(69, "R", /./), /^Container Capacity$/);
        const r = readColumnTable(lines, {
            caption: "Adventuring Gear", headerRe: /^Item\s+Cost\s+Weight$/, columns: ["cost", "weight"],
            tokens: [{ key: "cost", re: "cost" }, { key: "weight", re: "weight" }, { key: "dash", re: "dash" }], wildcard: "weight", groupBy: "indent"
        }, fail);
        gearItems.push(...r.items);
        addTable("Adventuring Gear", { caption: "Adventuring Gear", columns: ["Item", "Cost", "Weight"], rows: tableRows(r, ["cost", "weight"]), page: 69, pages: pagesOf(lines) });
    }

    // ---- T6 Container Capacity (pages 69-70)
    {
        const lines = two(locate(69, "R", /^Container Capacity$/), locate(70, "L", /./), /^Equipment Packs$/);
        const rows = [];
        let note = "";
        for (const l of lines) {
            if (!l.text || /^Container/.test(l.text)) continue;
            if (/^\*/.test(l.text) || note) { note = note ? note + " " + l.text : l.text; continue; }
            const m = /^(.+?)\s+(\d.*)$/.exec(l.text);
            if (m) rows.push([m[1], m[2]]); else fail("page " + l.page + ": container row not understood: " + l.text);
        }
        if (rows.length !== 13) fail("Container Capacity: expected 13 rows, got " + rows.length);
        addTable("Adventuring Gear", { caption: "Container Capacity", columns: ["Container", "Capacity"], rows, footnote: note, page: 69, pages: pagesOf(lines) });
    }

    // ---- T7 Tools (page 70); group membership is settled once the description index exists
    let toolNames = [], toolFootnote = "";
    {
        const i = locate(70, "R", /^Tools$/);
        if (i >= 0) {
            const lines = takeRange(S, i, /^\s*Artisan\u2019s Tools\./);
            const fn = lines.find(l => /^\* See/.test(l.text));
            if (fn) { toolFootnote = fn.text; fn.text = ""; }
            const r = readColumnTable(lines, {
                caption: "Tools", headerRe: /^Item\s+Cost\s+Weight$/, skipRe: /^Tools$/, columns: ["cost", "weight"],
                tokens: [{ key: "cost", re: "cost" }, { key: "weight", re: "weight" }, { key: "dash", re: "dash" }, { key: "star", re: "star" }],
                wildcard: "fill", groupBy: "list", groupHeaders: ["Artisan\u2019s tools", "Gaming set", "Musical instrument"]
            }, fail);
            for (const v of r.items) if (v.values.cost === DASH) fail("Tools: dash read as a cost for " + v.name);
            toolNames = r.names;
        }
    }

    // ---- T8 Mounts and Other Animals (pages 71-72)
    const mountItems = [];
    {
        const lines = two(locate(71, "R", /^Mounts and Other Animals$/), locate(72, "L", /./), /^Tack, Harness, and Drawn Vehicles$/);
        const r = readColumnTable(lines, {
            caption: "Mounts and Other Animals", headerRe: /^Item\s+Cost\s+Speed\s+Carrying$/, skipRe: /^Mounts and Other Animals$/, stripTokens: ["Capacity"],
            columns: ["cost", "speed", "capacity"], tokens: [{ key: "cost", re: "cost" }, { key: "speed", re: "speedFt" }, { key: "capacity", re: "capacity" }], groupBy: "indent"
        }, fail);
        mountItems.push(...r.items);
        addTable("Mounts and Vehicles", { caption: "Mounts and Other Animals", columns: ["Item", "Cost", "Speed", "Carrying Capacity"], rows: r.items.map(it => [it.name, it.values.cost, it.values.speed, it.values.capacity]), page: 71, pages: pagesOf(lines) });
    }

    // ---- T9 Tack, Harness, and Drawn Vehicles (page 72)
    const vehicleItems = [];
    {
        const i = locate(72, "L", /^Tack, Harness, and Drawn Vehicles$/);
        if (i >= 0) {
            const r = readColumnTable(takeRange(S, i, /^Waterborne Vehicles$/), {
                caption: "Tack, Harness, and Drawn Vehicles", headerRe: /^Item\s+Cost\s+Weight$/, skipRe: /^Tack, Harness/, columns: ["cost", "weight"],
                tokens: [{ key: "cost", re: "cost" }, { key: "weight", re: "weight" }, { key: "dash", re: "dash" }, { key: "times", re: "times" }], wildcard: "fill", groupBy: "indent"
            }, fail);
            for (const it of r.items) { it.table = "Tack, Harness, and Drawn Vehicles"; vehicleItems.push(it); }
            addTable("Mounts and Vehicles", { caption: "Tack, Harness, and Drawn Vehicles", columns: ["Item", "Cost", "Weight"], rows: tableRows(r, ["cost", "weight"]), page: 72 });
        }
    }

    // ---- T10 Waterborne Vehicles (page 72)
    {
        const i = locate(72, "L", /^Waterborne Vehicles$/);
        if (i >= 0) {
            const r = readColumnTable(takeRange(S, i, /^Trade Goods$/), {
                caption: "Waterborne Vehicles", headerRe: /^Item\s+Cost\s+Speed$/, skipRe: /^Waterborne Vehicles$/, columns: ["cost", "speed"],
                tokens: [{ key: "cost", re: "cost" }, { key: "speed", re: "speedMph" }], groupBy: "indent"
            }, fail);
            for (const it of r.items) { it.table = "Waterborne Vehicles"; vehicleItems.push(it); }
            addTable("Mounts and Vehicles", { caption: "Waterborne Vehicles", columns: ["Item", "Cost", "Speed"], rows: r.items.map(it => [it.name, it.values.cost, it.values.speed]), page: 72 });
        }
    }

    // ---- T11 Trade Goods (page 72), aligned rows
    const tradeItems = [];
    {
        const i = locate(72, "R", /^Trade Goods$/);
        if (i >= 0) {
            const rows = [];
            for (const l of takeRange(S, i, /^Expenses$/)) {
                if (!l.text || /^Trade Goods$|^Cost\s+Goods$/.test(l.text)) continue;
                const m = /^([\d,]+ (?:cp|sp|ep|gp|pp))\s{2,}(.+)$/.exec(l.text);
                if (!m) { fail("page 72: trade goods row not understood: " + l.text); continue; }
                rows.push([m[1], m[2]]);
                tradeItems.push({ name: m[2], values: { cost: m[1] }, page: l.page, group: null });
            }
            addTable("Trade Goods", { caption: "Trade Goods", columns: ["Cost", "Goods"], rows, page: 72 });
        }
    }

    // ---- T12 Lifestyle Expenses (pages 72-73)
    {
        const lines = two(locate(72, "R", /^Lifestyle Expenses$/, 2), locate(73, "L", /./), /^\s*Wretched\./);
        const r = readColumnTable(lines, {
            caption: "Lifestyle Expenses", headerRe: /^Lifestyle\s+Price\/Day$/, skipRe: /^Lifestyle Expenses$/, columns: ["price"],
            tokens: [{ key: "price", re: "cost" }, { key: "dash", re: "dash" }], wildcard: "price", groupBy: "indent"
        }, fail);
        if (r.items.length !== 7) fail("Lifestyle Expenses: expected 7 rows, got " + r.items.length);
        addTable("Lifestyle Expenses", { caption: "Lifestyle Expenses", columns: ["Lifestyle", "Price/Day"], rows: r.items.map(it => [it.name, it.values.price]), page: 72, pages: pagesOf(lines) });
    }

    // ---- T13 Food, Drink, and Lodging (pages 73-74)
    {
        const lines = two(locate(73, "R", /^Food, Drink, and Lodging$/, 2), locate(74, "L", /./), /^Services$/);
        const r = readColumnTable(lines, {
            caption: "Food, Drink, and Lodging", headerRe: /^Item\s+Cost$/, skipRe: /^Food, Drink, and Lodging$/, columns: ["cost"],
            tokens: [{ key: "cost", re: "cost" }], groupBy: "indent", groupHeaders: ["Ale"]
        }, fail);
        if (r.items.length !== 20) fail("Food, Drink, and Lodging: expected 20 rows, got " + r.items.length);
        addTable("Food, Drink, and Lodging", { caption: "Food, Drink, and Lodging", columns: ["Item", "Cost"], rows: tableRows(r, ["cost"]), page: 73, pages: pagesOf(lines),
            note: "the layout lost the indentation of the Ale group's rows (Gallon, Mug); Ale is treated as a group header by an explicit list" });
    }

    // ---- T14 Services (page 74)
    {
        const i = locate(74, "R", /^Services\s+Pay$/);
        if (i >= 0) {
            const r = readColumnTable(takeRange(S, i, /^\s*Skilled hirelings include/), {
                caption: "Services", headerRe: /^Services\s+Pay$/, stripTokens: ["Service"], columns: ["pay"], tokens: [{ key: "pay", re: "pay" }], groupBy: "indent", groupHeaders: ["Coach cab", "Hireling"]
            }, fail);
            if (r.items.length !== 7) fail("Services: expected 7 rows, got " + r.items.length);
            addTable("Services", { caption: "Services", columns: ["Service", "Pay"], rows: tableRows(r, ["pay"]), page: 74,
                note: "the layout lost the indentation of the Coach cab rows (Between towns, Within a city); Coach cab and Hireling are treated as group headers by an explicit list" });
        }
    }

    // ---- Headings and rule sections from the remaining (unused) stream lines
    const HEADINGS = [
        ["Equipment", 62, []], ["Selling Treasure", 62, []], ["Armor", 62, []],
        ["Light Armor", 63, ["Armor"]], ["Medium Armor", 63, ["Armor"]], ["Heavy Armor", 63, ["Armor"]], ["Getting Into and Out of Armor", 64, ["Armor"]],
        ["Weapons", 64, []], ["Weapon Proficiency", 64, ["Weapons"]], ["Weapon Properties", 64, ["Weapons"]], ["Improvised Weapons", 65, ["Weapons"]], ["Silvered Weapons", 65, ["Weapons"]], ["Special Weapons", 65, ["Weapons"]],
        ["Adventuring Gear", 66, []], ["Equipment Packs", 70, []], ["Tools", 70, []], ["Mounts and Vehicles", 71, []], ["Trade Goods", 72, []],
        ["Expenses", 72, []], ["Lifestyle Expenses", 72, ["Expenses"]], ["Self-Sufficiency", 73, ["Expenses"]], ["Food, Drink, and Lodging", 73, ["Expenses"]],
        ["Services", 74, []], ["Spellcasting Services", 74, ["Services"]]
    ];
    const rest = stream.filter(l => !l.used);
    const heads = [];
    for (const [text, page, parents] of HEADINGS) {
        const k = rest.findIndex(l => l.page === page && l.text === text && l.indent === 0);
        if (k < 0) { fail("heading not found on page " + page + ": " + text); continue; }
        heads.push({ text, page, headingPath: text === "Equipment" ? ["Equipment"] : ["Equipment"].concat(parents, [text]), k });
    }
    heads.sort((a, b) => a.k - b.k);
    const sections = [];
    for (let s = 0; s < heads.length; s++) {
        const h = heads[s];
        const end = s + 1 < heads.length ? heads[s + 1].k : rest.length;
        const lines = rest.slice(h.k + 1, end);
        const pages = [...new Set(lines.filter(l => l.text).map(l => l.page))];
        sections.push({ heading: h.text, headingPath: h.headingPath, page: h.page, pages: pages.length ? pages : [h.page], paragraphs: toParagraphs(lines) });
    }
    if (toolFootnote) { const ts = sections.find(s => s.heading === "Tools"); if (ts) ts.paragraphs.push({ text: toolFootnote, pages: [70] }); }
    if (heads.length && heads[0].k !== 0) fail("layout lines before the first heading: " + rest.slice(0, heads[0].k).map(l => l.text).filter(Boolean).join(" / "));

    // ---- Description index: run-in bold headings "Name. Text..." per section, consulted per kind
    const descBySection = {};
    for (const s of sections) {
        const idx = new Map();
        for (const p of s.paragraphs) {
            const m = /^([A-Z][A-Za-z\u2019',\- ]{0,40}?)\. (.+)$/.exec(p.text);
            if (!m) continue;
            const words = m[1].split(/\s+/);
            if (!words.every(w => /^[A-Z]/.test(w) || /^(of|or|and|the|a)$/.test(w.replace(/,$/, "")))) continue;
            const key = normKey(m[1]);
            if (!idx.has(key)) idx.set(key, { text: p.text, pages: p.pages, section: s.heading });
        }
        descBySection[s.heading] = idx;
    }
    const DESC_SECTIONS = { armor: ["Armor", "Light Armor", "Medium Armor", "Heavy Armor"], weapon: ["Special Weapons"], gear: ["Adventuring Gear"], tool: ["Tools"], mount: ["Mounts and Vehicles"], vehicle: ["Mounts and Vehicles"], "trade-good": [] };
    const findDescription = (kind, name) => {
        const base = normKey(name), noParen = base.replace(/\s*\([^)]*\)\s*$/, "").trim(), first = noParen.split(",")[0].trim();
        for (const sec of DESC_SECTIONS[kind]) {
            const idx = descBySection[sec];
            if (!idx) continue;
            for (const k of [base, noParen, first]) { if (idx.has(k)) return idx.get(k); if (idx.has(k + "s")) return idx.get(k + "s"); }
        }
        return null;
    };

    // ---- Tools: rows after a group header belong to it until a row that has its own description or the footnoted row
    const toolItems = [];
    {
        let cur = null;
        for (const n of toolNames) {
            if (n.isGroup) { cur = n.name; continue; }
            if (!n.item) continue;
            const own = findDescription("tool", n.name) || n.item.values.cost === "*";
            if (own) cur = null;
            n.item.group = cur;
            toolItems.push(n.item);
        }
        addTable("Tools", { caption: "Tools", columns: ["Item", "Cost", "Weight"], rows: tableRows({ names: toolNames }, ["cost", "weight"]), page: 70, pages: [70], footnote: toolFootnote });
    }

    // ---- Entries
    const entries = [];
    const ids = new Map();
    const push = e => {
        if (ids.has(e.id)) fail("duplicate id " + e.id + " (" + e.name + " / " + ids.get(e.id) + ")");
        ids.set(e.id, e.name);
        e.dice = T.findDice(e.text).map(d => ({ text: d.text, count: d.count, sides: d.sides, modifier: d.modifier, average: d.average }));
        entries.push(e);
    };
    const src = (pages, heading) => ({ document: "SRD 5.1", pages: [...new Set(pages)].sort((a, b) => a - b), section: SECTION, heading });
    const rowText = (columns, values) => columns.join(" | ") + "\n" + values.join(" | ");
    const withDesc = (text, d) => d ? text + "\n\n" + d.text : text;
    const finish = (missing, notes) => { if (missing.length) notes.push("missing required field(s): " + missing.join(", ")); return missing.length ? "extracted" : "parsed"; };

    for (const w of weaponItems) {
        const gm = /^(Simple|Martial) (Melee|Ranged)/.exec(w.group);
        const notes = w.notes.slice(), missing = [];
        const d = findDescription("weapon", w.name);
        const data = {
            weaponCategory: gm[1].toLowerCase(), rangeType: gm[2].toLowerCase(), cost: parseCost(w.values.cost), damage: parseDamage(w.values.damage),
            weight: parseWeight(w.values.weight), properties: parseProperties(w.values.properties), group: w.group, description: d ? d.text : null
        };
        if (data.cost.amount === null) missing.push("cost");
        if (data.damage === null) notes.push("damage printed as " + DASH);
        else if (data.damage.dice === null) missing.push("damage");
        else if (!/d/.test(data.damage.dice)) notes.push("damage is a flat " + data.damage.dice + ", not a dice expression");
        if (data.weight === null) notes.push("weight printed as " + DASH);
        else if (data.weight.lb === null) missing.push("weight");
        if (w.values.properties !== DASH && data.properties.length === 0) missing.push("properties");
        const text = withDesc(rowText(tables.Weapons.columns, [w.name, w.values.cost, w.values.damage, w.values.weight, w.values.properties]), d);
        push({ id: T.stableId("weapon", w.name), category: CATEGORY, kind: "weapon", name: w.name, source: src([w.page].concat(d ? d.pages : []), w.name), text, data, readiness: finish(missing, notes), notes });
    }

    for (const a of armorItems) {
        const notes = [], missing = [];
        const cat = a.group === "Shield" ? "shield" : a.group ? a.group.replace(/ Armor$/, "").toLowerCase() : null;
        const ac = parseAc(a.values.ac);
        const sm = /^Str (\d+)$/.exec(a.values.strength || "");
        const d = findDescription("armor", a.name);
        const data = { armorCategory: cat, cost: parseCost(a.values.cost), ac, strength: sm ? Number(sm[1]) : null, stealthDisadvantage: a.values.stealth === "Disadvantage", weight: parseWeight(a.values.weight), group: a.group, description: d ? d.text : null };
        if (!cat) missing.push("armorCategory");
        if (data.cost.amount === null) missing.push("cost");
        if (!ac) missing.push("ac");
        if (!sm && a.values.strength !== DASH) missing.push("strength");
        if (a.values.stealth !== "Disadvantage" && a.values.stealth !== DASH) missing.push("stealthDisadvantage");
        if (!data.weight || data.weight.lb === null) missing.push("weight");
        const text = withDesc(rowText(tables.Armor.columns, [a.name, a.values.cost, a.values.ac, a.values.strength, a.values.stealth, a.values.weight]), d);
        push({ id: T.stableId("armor", a.name), category: CATEGORY, kind: "armor", name: a.name, source: src([a.page].concat(d ? d.pages : []), a.name), text, data, readiness: finish(missing, notes), notes });
    }

    /**
     * A cost or weight that is not printed as a figure keeps the printed symbol and the text it refers to:
     * "*" (the Tools table's footnote) or "\u00D74" / "\u00D72" (barding: a multiple of the equivalent armor, per its paragraph).
     */
    const symbolic = (printed, basis, key) => {
        if (!basis) return null;
        const o = key === "cost" ? { amount: null, unit: null, printed, basis } : { lb: null, printed, basis };
        const mult = /^\u00D7(\d+)$/.exec(printed);
        if (mult) o.multiplier = Number(mult[1]);
        return o;
    };
    const simpleItem = (kind, it, columns, printed, extra) => {
        const notes = [], missing = [];
        const d = findDescription(kind, it.name);
        const basis = it.values.cost === "*" ? toolFootnote : (d ? d.text : null);
        let cost = parseCost(it.values.cost);
        if (cost.amount === null) {
            cost = symbolic(it.values.cost, basis, "cost") || cost;
            if (cost.printed === undefined) { missing.push("cost"); notes.push("cost is not a coin amount as printed: " + it.values.cost); }
        }
        let weight = it.values.weight === undefined ? null : parseWeight(it.values.weight);
        if (weight && weight.lb === null) {
            weight = symbolic(it.values.weight, basis, "weight") || weight;
            if (weight.printed === undefined) { missing.push("weight"); notes.push("weight is not a pound figure as printed: " + it.values.weight); }
        }
        const data = Object.assign({ cost, weight, group: it.group || null, table: it.table || columns.caption, description: d ? d.text : null }, extra || {});
        if (it.group) { const gd = findDescription(kind, it.group); if (gd) data.groupDescription = gd.text; }
        if (cost.printed !== undefined || (weight && weight.printed !== undefined)) notes.push("cost " + JSON.stringify(it.values.cost) + " and weight " + JSON.stringify(it.values.weight) + " are printed as symbols; the basis text is carried in data (" + (it.values.cost === "*" ? "the Tools table footnote" : "the " + it.name + " paragraph") + ")");
        const text = withDesc(rowText(columns.columns, [it.name].concat(printed)), d);
        push({ id: T.stableId(kind, it.name), category: CATEGORY, kind, name: it.name, source: src([it.page].concat(d ? d.pages : []), it.name), text, data, readiness: finish(missing, notes), notes });
    };
    for (const it of gearItems) simpleItem("gear", it, tables["Adventuring Gear"], [it.values.cost, it.values.weight]);
    for (const it of toolItems) {
        simpleItem("tool", it, tables.Tools, [it.values.cost, it.values.weight]);
        if (it.values.cost === "*") { const e = entries[entries.length - 1]; e.data.description = toolFootnote; e.text += "\n\n" + toolFootnote; }
    }
    for (const it of mountItems) {
        const cap = /^([\d,]+) lb\.$/.exec(it.values.capacity), sp = /^(\d+) ft\.$/.exec(it.values.speed);
        simpleItem("mount", it, tables["Mounts and Other Animals"], [it.values.cost, it.values.speed, it.values.capacity],
            { speed: sp ? { walk: Number(sp[1]) } : { text: it.values.speed }, carryingCapacity: cap ? { lb: Number(cap[1].replace(/,/g, "")) } : { text: it.values.capacity } });
    }
    for (const it of vehicleItems) {
        const extra = {};
        if (it.values.speed) { const m = /^([\d\u00BD]+) mph$/.exec(it.values.speed); extra.speed = m ? { mph: parseNumber(m[1]) } : { text: it.values.speed }; }
        simpleItem("vehicle", it, tables[it.table], it.values.speed ? [it.values.cost, it.values.speed] : [it.values.cost, it.values.weight], extra);
    }
    for (const it of tradeItems) {
        const notes = [], missing = [];
        const cost = parseCost(it.values.cost);
        if (cost.amount === null) missing.push("cost");
        push({ id: T.stableId("trade-good", it.name), category: CATEGORY, kind: "trade-good", name: it.name, source: src([it.page], it.name), text: rowText(["Cost", "Goods"], [it.values.cost, it.name]),
            data: { cost, weight: null, group: null, table: "Trade Goods", description: null }, readiness: finish(missing, notes), notes });
    }

    for (const s of sections) {
        const ts = ruleTables[s.heading] || [];
        const text = s.paragraphs.map(p => p.text).concat(ts.map(renderTable)).join("\n\n");
        const notes = text ? [] : ["no text under this heading"];
        const pages = [...new Set(s.pages.concat(...ts.map(t => t.pages || [t.page])))];
        push({ id: T.stableId("rule", s.heading === "Equipment" ? "Equipment" : "Equipment " + s.heading), category: "rules", kind: "rule", name: s.heading, source: src(pages, s.heading), text,
            data: { headingPath: s.headingPath, tables: ts.map(t => { const o = { caption: t.caption, columns: t.columns, rows: t.rows }; if (t.footnote) o.footnote = t.footnote; if (t.note) o.note = t.note; return o; }) },
            readiness: text ? "parsed" : "extracted", notes });
    }

    // ---- Prose cross-check against the reading-order pages (whitespace and hyphen breaks folded)
    const fold = s => T.toPlain(s).replace(/-\s+/g, "-").replace(/\s+/g, " ").trim();
    const reading = {};
    for (let p = PAGES[0]; p <= PAGES[1] + 1; p++) reading[p] = fold(readReading(p));
    {
        let checked = 0, missing = 0;
        for (const s of sections) for (const p of s.paragraphs) {
            if (p.text.length < 40) continue;
            checked++;
            const f = fold(p.text);
            const ok = p.pages.some(pg => reading[pg].includes(f) || (reading[pg] + " " + (reading[pg + 1] || "")).includes(f));
            if (!ok) { missing++; warn(p.pages[0], "paragraph not found verbatim in the reading-order text (" + s.heading + "): " + p.text.slice(0, 70)); }
        }
        console.log((missing ? "WARN" : "PASS") + " prose cross-check: " + (checked - missing) + "/" + checked + " section paragraphs found verbatim in the reading-order pages");
    }

    // ---- Page attribution: the first and last text line of every entry must be found on its cited pages
    {
        const probeOf = line => {
            if (line.includes(" | ")) { const cells = line.split(" | ").filter(c => c.length >= 4); return cells.sort((a, b) => b.length - a.length)[0] || null; }
            return line.length > 40 ? line.slice(-40) : line;
        };
        const bad = [];
        for (const e of entries) {
            const lines = e.text.split("\n").filter(l => l.trim());
            const lastLine = [...lines].reverse().find(l => fold(l).length >= 12) || lines[lines.length - 1];
            for (const [which, probe] of [["first", e.name], ["last", probeOf(lastLine)]]) {
                if (!probe) continue;
                const f = fold(probe);
                if (e.source.pages.some(p => reading[p] && reading[p].includes(f))) continue;
                const adjacent = e.source.pages.flatMap(p => [p - 1, p + 1]).filter(p => reading[p] && reading[p].includes(f));
                bad.push(e.id + " (" + which + " line " + JSON.stringify(probe.slice(0, 40)) + ", cited " + e.source.pages.join(",") + (adjacent.length ? ", found only on " + adjacent.join(",") : ", not found") + ")");
            }
        }
        console.log((bad.length ? "FAIL" : "PASS") + " page attribution: first and last text line of every entry found on its cited pages in the reading-order cache" + (bad.length ? ": " + bad.join("; ") : ""));
        if (bad.length) failures.push("page attribution");
    }

    // ---- Self-checks
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
    const REQUIRED = {
        weapon: ["weaponCategory", "rangeType", "cost", "damage", "weight", "properties"], armor: ["armorCategory", "cost", "ac", "strength", "stealthDisadvantage", "weight"],
        gear: ["cost", "weight", "group", "description"], tool: ["cost", "weight", "group", "description"], mount: ["cost", "weight", "group", "description"],
        vehicle: ["cost", "weight", "group", "description"], "trade-good": ["cost", "weight", "group", "description"], rule: ["headingPath", "tables"]
    };
    const badParsed = entries.filter(e => e.readiness === "parsed" && REQUIRED[e.kind].some(k => !(k in e.data)));
    check(badParsed.length === 0, "required data fields present on every parsed entry" + (badParsed.length ? ": " + badParsed.map(e => e.id).join(", ") : ""));
    for (const n of ["Longsword", "Net", "Chain mail", "Shield", "Thieves\u2019 tools", "Warhorse"]) {
        const e = entries.find(x => x.name === n && x.kind !== "rule");
        const shown = e ? Object.assign({}, e.data, { description: e.data.description ? e.data.description.slice(0, 40) + "..." : null }) : null;
        if (shown) delete shown.groupDescription;
        check(!!e, "spot " + n + (e ? " [" + e.kind + ", " + e.readiness + "] " + JSON.stringify(shown) : ": MISSING"));
    }
    const readinessCount = {};
    for (const e of entries) readinessCount[e.readiness] = (readinessCount[e.readiness] || 0) + 1;
    console.log("INFO readiness: " + JSON.stringify(readinessCount) + "; warnings: " + warnings.length);
    for (const e of entries) if (e.readiness !== "parsed") console.log("INFO extracted: " + e.id + " (pages " + e.source.pages.join(",") + "): " + e.notes.join("; "));
    for (const f of failures) if (!/^count |^duplicate ids|^non-empty|^required data|^spot |^page attribution/.test(f)) console.log("FAIL " + f);

    // ---- Write
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const out = {
        metadata: {
            generator: "tools/srd_extract/stage_equipment.js", generatedAt: new Date().toISOString(), category: CATEGORY,
            source: { file: cacheManifest.source.file, sha256: cacheManifest.source.sha256, pages: [CHAPTER_PAGES] },
            cache: { generatedAt: cacheManifest.generatedAt }, license: cacheManifest.license, counts, readiness: readinessCount,
            columnCut: { method: "nearest 2+ space run to the raw gutter of splitRawLayoutColumns, normalised after the cut", linesMoved: movedTotal }
        },
        entries, warnings
    };
    fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
    console.log("wrote " + path.relative(path.resolve(__dirname, "..", ".."), OUT) + " (" + entries.length + " entries, " + warnings.length + " warnings)");
    console.log(failures.length ? "FAIL stage_equipment: " + failures.length + " failure(s)" : "PASS stage_equipment: all checks passed");
    process.exit(failures.length ? 1 : 0);
}

main();
