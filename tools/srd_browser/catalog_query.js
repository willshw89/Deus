// tools/srd_browser/catalog_query.js - search, filter and index logic for the SRD 5.1 catalogue browser.
//
// Pure module: no DOM, no I/O, no engine globals. Loaded by index.html as a classic script
// (assigns window.SrdCatalogQuery) and by selftest.js from Node (module.exports), so every
// query the page runs can be exercised headlessly.
//
// The catalogue contract is docs/SRD5_1_COVERAGE_MANIFEST.md sections 5-8. Entries are the
// objects of game/data/srd51/<category>.json -> entries[]. The punctuation fold below mirrors
// toPlain() in tools/srd_extract/lib/srd_text.js (kept in sync by hand; the page cannot
// require that file). Characters are built with String.fromCharCode so this file stays ASCII.
(function (root, factory) {
    "use strict";
    if (typeof module === "object" && module.exports) module.exports = factory();
    else root.SrdCatalogQuery = factory();
})(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const VERSION = "1.0.0";
    const C = code => String.fromCharCode(code);
    const re = (chars, flags) => new RegExp(chars, flags || "g");
    const CH = Object.freeze({
        HYPHEN: C(0x2010), NB_HYPHEN: C(0x2011), FIGURE_DASH: C(0x2012), EN_DASH: C(0x2013), EM_DASH: C(0x2014),
        HORIZ_BAR: C(0x2015), MINUS: C(0x2212), LSQUO: C(0x2018), RSQUO: C(0x2019), SBQUO: C(0x201A), PRIME: C(0x2032),
        LDQUO: C(0x201C), RDQUO: C(0x201D), BDQUO: C(0x201E), DPRIME: C(0x2033), ELLIPSIS: C(0x2026), TIMES: C(0x00D7),
        HALF: C(0x00BD), QUARTER: C(0x00BC), THREE_QUARTERS: C(0x00BE), BULLET: C(0x2022), NBSP: C(0x00A0), SOFT_HYPHEN: C(0x00AD)
    });

    // Same table as srd_text.js PLAIN_MAP, plus U+2212 minus and the soft hyphen (both harmless for search).
    const PLAIN_MAP = [
        [re("[" + CH.LSQUO + CH.RSQUO + CH.SBQUO + CH.PRIME + "]"), "'"],
        [re("[" + CH.LDQUO + CH.RDQUO + CH.BDQUO + CH.DPRIME + "]"), '"'],
        [re("[" + CH.HYPHEN + CH.NB_HYPHEN + CH.FIGURE_DASH + CH.EN_DASH + CH.EM_DASH + CH.HORIZ_BAR + CH.MINUS + "]"), "-"],
        [re(CH.ELLIPSIS), "..."],
        [re(CH.TIMES), "x"],
        [re(CH.HALF), "1/2"],
        [re(CH.QUARTER), "1/4"],
        [re(CH.THREE_QUARTERS), "3/4"],
        [re(CH.BULLET), "*"],
        [re(CH.NBSP), " "],
        [re(CH.SOFT_HYPHEN), ""]
    ];

    /** Display order, labels and default file names of the six catalogue categories (manifest section 5). */
    const CATEGORIES = Object.freeze([
        { id: "creatures", label: "Creatures", file: "creatures.json" },
        { id: "spells", label: "Spells", file: "spells.json" },
        { id: "equipment", label: "Equipment", file: "equipment.json" },
        { id: "magic-items", label: "Magic Items", file: "magic_items.json" },
        { id: "character-options", label: "Character Options", file: "character_options.json" },
        { id: "rules", label: "Rules", file: "rules.json" }
    ]);
    const KINDS = Object.freeze(["creature", "spell", "spell-list", "weapon", "armor", "gear", "tool", "mount", "vehicle",
        "trade-good", "magic-item", "race", "subrace", "class", "subclass", "background", "feat", "condition", "rule",
        "hazard", "table", "appendix"]);
    const READINESS = Object.freeze(["extracted", "parsed", "verified", "adapted"]);
    const MANIFEST_FILE = "catalogue_manifest.json";
    const ICON_COLUMNS = 16, ICON_SIZE = 32, ICON_COUNT = 400; // stock IconSet.png: 512x800 = 16 x 25 icons

    /** ASCII-fold typographic punctuation (search only; stored text is never changed). */
    function toPlain(s) {
        let out = s == null ? "" : String(s);
        for (const [pattern, to] of PLAIN_MAP) out = out.replace(pattern, to);
        return out;
    }

    /** Search key: folded, lower case, whitespace collapsed. */
    function fold(s) {
        return toPlain(s).toLowerCase().replace(/\s+/g, " ").trim();
    }

    /** Query words. Every word must match somewhere in an entry's haystack. */
    function tokenize(query) {
        return fold(query).split(" ").filter(Boolean);
    }

    /** Collect every string and number inside a data object, depth first (keys are not collected). */
    function flattenValues(value, out, depth) {
        out = out || [];
        depth = depth || 0;
        if (value == null || depth > 16) return out;
        if (typeof value === "string") { if (value) out.push(value); return out; }
        if (typeof value === "number") { out.push(String(value)); return out; }
        if (typeof value === "boolean") return out;
        if (Array.isArray(value)) { for (const v of value) flattenValues(v, out, depth + 1); return out; }
        if (typeof value === "object") { for (const k of Object.keys(value)) flattenValues(value[k], out, depth + 1); return out; }
        return out;
    }

    /** "1/4" -> 0.25, "10" -> 10, 3 -> 3, anything else -> NaN. */
    function challengeValue(rating) {
        if (typeof rating === "number") return rating;
        const s = fold(rating);
        const m = /^(\d+)(?:\s*\/\s*(\d+))?$/.exec(s);
        if (!m) return NaN;
        return m[2] ? parseInt(m[1], 10) / parseInt(m[2], 10) : parseInt(m[1], 10);
    }

    /** The printed challenge rating of a creature entry as a filter key, or null. */
    function challengeKey(entry) {
        const c = entry && entry.data && entry.data.challenge;
        if (c == null) return null;
        const rating = typeof c === "object" ? c.rating : c;
        if (rating == null || rating === "") return null;
        return fold(rating).replace(/\s+/g, "");
    }

    /** The spell level of a spell entry as a filter key ("0" for cantrips), or null. */
    function spellLevelKey(entry) {
        if (!entry || entry.kind !== "spell" || !entry.data) return null;
        const l = entry.data.level;
        if (typeof l === "number" && Number.isFinite(l)) return String(l);
        if (typeof l === "string" && /^\d+$/.test(l.trim())) return String(parseInt(l, 10));
        return null;
    }

    function uniqueSorted(values, cmp) {
        const out = Array.from(new Set(values.filter(v => v != null)));
        out.sort(cmp);
        return out;
    }

    function categoryOrder(id) {
        const i = CATEGORIES.findIndex(c => c.id === id);
        return i < 0 ? CATEGORIES.length : i;
    }

    const cmpText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

    /**
     * Build the search index once. Returns
     * { entries, docs, byId, categories, kinds, kindsByCategory, readiness, challenges, spellLevels }.
     * docs[i].hay is the folded haystack: name, id, verbatim text and every data value.
     */
    function buildIndex(entries) {
        const list = Array.isArray(entries) ? entries : [];
        const docs = [];
        const byId = new Map();
        const kindsByCategory = {};
        for (let i = 0; i < list.length; i++) {
            const entry = list[i];
            if (!entry || typeof entry !== "object") continue;
            const name = entry.name == null ? "" : String(entry.name);
            const id = entry.id == null ? "" : String(entry.id);
            const parts = [name, id, entry.text == null ? "" : String(entry.text)];
            flattenValues(entry.data, parts);
            const doc = { i, entry, id, name, nameKey: fold(name), idKey: fold(id), hay: fold(parts.join(" | ")) };
            docs.push(doc);
            if (!byId.has(id)) byId.set(id, []);
            byId.get(id).push(entry);
            const cat = entry.category == null ? "" : String(entry.category);
            if (!kindsByCategory[cat]) kindsByCategory[cat] = new Set();
            kindsByCategory[cat].add(entry.kind == null ? "" : String(entry.kind));
        }
        const categories = uniqueSorted(docs.map(d => d.entry.category), (a, b) => categoryOrder(a) - categoryOrder(b) || cmpText(a, b));
        const kinds = uniqueSorted(docs.map(d => d.entry.kind), (a, b) => {
            const ia = KINDS.indexOf(a), ib = KINDS.indexOf(b);
            return (ia < 0 ? KINDS.length : ia) - (ib < 0 ? KINDS.length : ib) || cmpText(a, b);
        });
        const readiness = uniqueSorted(docs.map(d => d.entry.readiness), (a, b) => {
            const ia = READINESS.indexOf(a), ib = READINESS.indexOf(b);
            return (ia < 0 ? READINESS.length : ia) - (ib < 0 ? READINESS.length : ib) || cmpText(a, b);
        });
        const challenges = uniqueSorted(docs.map(d => challengeKey(d.entry)), (a, b) => {
            const va = challengeValue(a), vb = challengeValue(b);
            if (Number.isNaN(va) && Number.isNaN(vb)) return cmpText(a, b);
            if (Number.isNaN(va)) return 1;
            if (Number.isNaN(vb)) return -1;
            return va - vb;
        });
        const spellLevels = uniqueSorted(docs.map(d => spellLevelKey(d.entry)), (a, b) => parseInt(a, 10) - parseInt(b, 10));
        const kbc = {};
        for (const cat of Object.keys(kindsByCategory)) kbc[cat] = kinds.filter(k => kindsByCategory[cat].has(k));
        return { entries: list, docs, byId, categories, kinds, kindsByCategory: kbc, readiness, challenges, spellLevels };
    }

    function scoreDoc(doc, q, tokens) {
        if (doc.idKey === q) return 1000;
        if (doc.nameKey === q) return 800;
        if (doc.nameKey.startsWith(q)) return 600;
        if (doc.nameKey.indexOf(q) >= 0) return 400;
        if (tokens.every(t => doc.nameKey.indexOf(t) >= 0)) return 300;
        if (tokens.every(t => doc.idKey.indexOf(t) >= 0)) return 200;
        if (tokens.some(t => doc.nameKey.indexOf(t) >= 0)) return 100;
        return 10;
    }

    /**
     * Run a query. filters: { query, category, kind, readiness, challenge, spellLevel, limit }.
     * Empty/absent filters match everything. Returns entries: ranked when there is a query
     * (id match, then name matches, then full text), otherwise in catalogue order.
     */
    function search(index, filters) {
        const f = filters || {};
        const q = fold(f.query || "");
        const tokens = tokenize(f.query || "");
        const category = f.category ? String(f.category) : "";
        const kind = f.kind ? String(f.kind) : "";
        const readiness = f.readiness ? String(f.readiness) : "";
        const challenge = f.challenge == null || f.challenge === "" ? "" : fold(f.challenge).replace(/\s+/g, "");
        const spellLevel = f.spellLevel == null || f.spellLevel === "" ? "" : String(f.spellLevel);
        const hits = [];
        for (const doc of index.docs) {
            const e = doc.entry;
            if (category && e.category !== category) continue;
            if (kind && e.kind !== kind) continue;
            if (readiness && e.readiness !== readiness) continue;
            if (challenge && challengeKey(e) !== challenge) continue;
            if (spellLevel && spellLevelKey(e) !== spellLevel) continue;
            if (tokens.length) {
                let ok = true;
                for (const t of tokens) if (doc.hay.indexOf(t) < 0) { ok = false; break; }
                if (!ok) continue;
                hits.push({ doc, score: scoreDoc(doc, q, tokens) });
            } else {
                hits.push({ doc, score: 0 });
            }
        }
        if (tokens.length) {
            hits.sort((a, b) => b.score - a.score || cmpText(a.doc.nameKey, b.doc.nameKey) || a.doc.i - b.doc.i);
        }
        const limit = typeof f.limit === "number" && f.limit > 0 ? f.limit : hits.length;
        const out = new Array(Math.min(limit, hits.length));
        for (let i = 0; i < out.length; i++) out[i] = hits[i].doc.entry;
        return out;
    }

    /** All entries with exactly this stable id (normally one; zero when unknown). */
    function resolveId(index, id) {
        if (id == null) return [];
        const exact = index.byId.get(String(id));
        if (exact) return exact.slice();
        const loose = index.byId.get(fold(id));
        return loose ? loose.slice() : [];
    }

    function countBy(entries, keyFn) {
        const out = {};
        for (const e of entries) {
            const k = keyFn(e);
            if (k == null || k === "") continue;
            out[k] = (out[k] || 0) + 1;
        }
        return out;
    }

    /** Counts of each filter value among the given entries (for option labels). */
    function facets(entries) {
        const list = Array.isArray(entries) ? entries : [];
        return {
            categories: countBy(list, e => e.category),
            kinds: countBy(list, e => e.kind),
            readiness: countBy(list, e => e.readiness),
            challenges: countBy(list, challengeKey),
            spellLevels: countBy(list, spellLevelKey)
        };
    }

    /** Per-category and total counts of entries, kinds and readiness tags (the Coverage panel). */
    function coverage(entries) {
        const list = Array.isArray(entries) ? entries : [];
        const byCategory = {};
        const totals = { entries: 0, kinds: {}, readiness: {} };
        for (const e of list) {
            const cat = e.category == null ? "" : String(e.category);
            if (!byCategory[cat]) byCategory[cat] = { entries: 0, kinds: {}, readiness: {} };
            const c = byCategory[cat];
            c.entries++;
            totals.entries++;
            const k = e.kind == null ? "" : String(e.kind);
            const r = e.readiness == null ? "" : String(e.readiness);
            c.kinds[k] = (c.kinds[k] || 0) + 1;
            c.readiness[r] = (c.readiness[r] || 0) + 1;
            totals.kinds[k] = (totals.kinds[k] || 0) + 1;
            totals.readiness[r] = (totals.readiness[r] || 0) + 1;
        }
        return { byCategory, totals };
    }

    function guessCategory(file) {
        return String(file).replace(/^.*[\\/]/, "").replace(/\.json$/i, "").toLowerCase().replace(/_/g, "-");
    }

    function normalizeFileItem(item, keyHint) {
        if (item == null) return null;
        let file = null, category = null;
        if (typeof item === "string") { file = item; category = keyHint || null; }
        else if (typeof item === "object") {
            file = item.file || item.path || item.filename || item.name || null;
            category = item.category || item.id || keyHint || null;
        }
        if (!file || typeof file !== "string" || !/\.json$/i.test(file)) return null;
        const base = file.replace(/^.*[\\/]/, "");
        if (base.toLowerCase() === MANIFEST_FILE) return null;
        return { category: category ? String(category) : guessCategory(base), file: base };
    }

    /**
     * Which category files the manifest names. Probes the shapes a manifest could plausibly use
     * (files[], categories[] or {category: file|{file}}, catalogues, outputs); falls back to the six
     * default file names. Returns { files: [{ category, file }], source: "manifest.<key>" | "fallback" }.
     */
    function discoverFiles(manifest) {
        const m = manifest && typeof manifest === "object" ? manifest : {};
        const keys = ["files", "categories", "catalogues", "catalogs", "outputs", "categoryFiles"];
        for (const key of keys) {
            const v = m[key];
            if (!v) continue;
            const found = [];
            if (Array.isArray(v)) {
                for (const item of v) { const n = normalizeFileItem(item); if (n) found.push(n); }
            } else if (typeof v === "object") {
                for (const k of Object.keys(v)) { const n = normalizeFileItem(v[k], k); if (n) found.push(n); }
            }
            if (found.length) return { files: found, source: "manifest." + key };
        }
        return { files: CATEGORIES.map(c => ({ category: c.id, file: c.file })), source: "fallback" };
    }

    /**
     * The CC-BY-4.0 attribution string. Looks in the manifest first, then in the loaded category
     * files' metadata. categoryFiles: [{ file, json }] or the parsed file objects. Returns { text, from } or null.
     */
    function attributionFrom(manifest, categoryFiles) {
        const m = manifest && typeof manifest === "object" ? manifest : {};
        const probes = [
            ["manifest.metadata.license.attribution", m.metadata && m.metadata.license && m.metadata.license.attribution],
            ["manifest.license.attribution", m.license && m.license.attribution],
            ["manifest.metadata.attribution", m.metadata && m.metadata.attribution],
            ["manifest.attribution", m.attribution]
        ];
        for (const [from, text] of probes) if (typeof text === "string" && text.trim()) return { text: text.trim(), from };
        const files = Array.isArray(categoryFiles) ? categoryFiles : [];
        for (const f of files) {
            const json = f && (f.json || f);
            const text = json && json.metadata && json.metadata.license && json.metadata.license.attribution;
            if (typeof text === "string" && text.trim()) return { text: text.trim(), from: (f.file || "category file") + " metadata.license.attribution" };
        }
        return null;
    }

    /**
     * Counts the manifest itself declares, when it declares any, normalised to
     * { byCategory: { cat: { entries, kinds, readiness } }, totals: { entries, kinds, readiness } }.
     * Missing pieces are undefined; the page compares them with what it loaded.
     */
    function declaredCounts(manifest) {
        const m = manifest && typeof manifest === "object" ? manifest : {};
        const out = { byCategory: {}, totals: {} };
        const num = v => (typeof v === "number" && Number.isFinite(v) ? v : (typeof v === "string" && /^\d+$/.test(v) ? parseInt(v, 10) : undefined));
        const obj = v => (v && typeof v === "object" && !Array.isArray(v) ? v : undefined);
        const takeItem = (item, keyHint) => {
            if (!item || typeof item !== "object") return;
            const cat = item.category || item.id || keyHint;
            if (!cat) return;
            const entries = num(item.entries) !== undefined ? num(item.entries) : (num(item.count) !== undefined ? num(item.count) : num(item.entryCount));
            out.byCategory[cat] = {
                entries,
                kinds: obj(item.kinds) || obj(item.byKind) || obj(item.kindCounts),
                readiness: obj(item.readiness) || obj(item.byReadiness) || obj(item.readinessCounts)
            };
        };
        for (const key of ["files", "categories", "catalogues", "catalogs", "outputs", "counts"]) {
            const v = m[key];
            if (Array.isArray(v)) v.forEach(item => takeItem(item));
            else if (obj(v)) for (const k of Object.keys(v)) takeItem(v[k], k);
        }
        const t = obj(m.totals) || obj(m.total) || obj(m.summary);
        if (t) {
            out.totals.entries = num(t.entries) !== undefined ? num(t.entries) : num(t.count);
            out.totals.kinds = obj(t.kinds) || obj(t.byKind);
            out.totals.readiness = obj(t.readiness) || obj(t.byReadiness);
        } else if (num(m.entries) !== undefined || num(m.entryCount) !== undefined) {
            out.totals.entries = num(m.entries) !== undefined ? num(m.entries) : num(m.entryCount);
        }
        return out;
    }

    /** Pixel offset of icon index n in the stock sheet, or null when the index is outside the sheet. */
    function iconOffset(index) {
        if (!Number.isInteger(index) || index < 0 || index >= ICON_COUNT) return null;
        return { x: (index % ICON_COLUMNS) * ICON_SIZE, y: Math.floor(index / ICON_COLUMNS) * ICON_SIZE };
    }

    return {
        VERSION, CATEGORIES, KINDS, READINESS, MANIFEST_FILE, ICON_COLUMNS, ICON_SIZE, ICON_COUNT,
        toPlain, fold, tokenize, flattenValues, challengeValue, challengeKey, spellLevelKey,
        buildIndex, search, resolveId, facets, coverage,
        discoverFiles, attributionFrom, declaredCounts, iconOffset
    };
});
