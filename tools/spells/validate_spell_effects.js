"use strict";
// SIM.60.02 spell-effect validator (DEC-018). Node only, no npm dependencies.
//
//   node tools/spells/validate_spell_effects.js                  validate docs/schemas/spells/effects.json and friends
//   node tools/spells/validate_spell_effects.js --check          rebuild srd_baseline.json in memory and compare it
//   node tools/spells/validate_spell_effects.js --write-baseline rewrite srd_baseline.json (only when the inputs change)
//   node tools/spells/validate_spell_effects.js --fixture <file> apply a negative fixture in memory, then validate
//
// Every error is printed as "ERROR <CODE> <spellId or file> <path> - <message>" and the exit code is 1.
// The rules are the functions named rule*() below; tools/spells/test_spell_effects.js switches each one off in an
// in-memory copy of this file and shows that its fixture then fails.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..", "..");
const FILES = {
    schema: "docs/schemas/spells/spell_effect.schema.json",
    effects: "docs/schemas/spells/effects.json",
    baseline: "docs/schemas/spells/srd_baseline.json",
    tuning: "docs/schemas/spells/tuning.json",
    primitives: "docs/schemas/spells/primitives.json",
    audit: "docs/audits/srd_spell_effect_audit.json",
    spells: "game/data/srd51/spells.json",
    rules: "game/data/srd51/rules.json",
    ledger: "game/js/sim/ledger_defaults.js"
};
const BASELINE_VERSION = "deus-srd-baseline/1.0.0";

// ---------------------------------------------------------------------------------------------------------------
// Reading and writing
// ---------------------------------------------------------------------------------------------------------------

function readText(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n"); }
function sha256(text) { return crypto.createHash("sha256").update(text, "utf8").digest("hex"); }
function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

// Sources of the baseline only (audit JSON, spells.json, rules.json). Hashes are taken after folding CRLF to LF.
function loadSources() {
    const text = {};
    for (const k of ["audit", "spells", "rules"]) text[k] = readText(FILES[k]);
    const data = {};
    for (const k of Object.keys(text)) data[k] = JSON.parse(text[k]);
    data.sourceHashes = { audit: sha256(text.audit), spells: sha256(text.spells), rules: sha256(text.rules) };
    return data;
}
function loadData() {
    const data = loadSources();
    for (const k of ["schema", "effects", "baseline", "tuning", "primitives"]) data[k] = JSON.parse(readText(FILES[k]));
    data.ledger = require(path.join(ROOT, FILES.ledger));
    return data;
}

// Deterministic JSON text: 2-space indent; an object or array whose members are all scalars (or scalar arrays) is
// written on one line when it fits in 160 characters. Key order is the insertion order, which the generator fixes.
function isScalar(v) { return v === null || typeof v !== "object"; }
function isFlat(v) {
    if (Array.isArray(v)) return v.every(isScalar);
    return Object.keys(v).every(k => isScalar(v[k]) || (Array.isArray(v[k]) && v[k].every(isScalar)));
}
function inline(v) {
    if (isScalar(v)) return JSON.stringify(v);
    if (Array.isArray(v)) return "[" + v.map(inline).join(", ") + "]";
    return "{" + Object.keys(v).map(k => JSON.stringify(k) + ": " + inline(v[k])).join(", ") + "}";
}
function stringify(v, indent) {
    indent = indent || "";
    if (isScalar(v)) return JSON.stringify(v);
    const inner = indent + "  ";
    if (Array.isArray(v)) {
        if (v.length === 0) return "[]";
        if (isFlat(v)) { const s = inline(v); if (s.length + indent.length <= 160) return s; }
        return "[\n" + v.map(x => inner + stringify(x, inner)).join(",\n") + "\n" + indent + "]";
    }
    const keys = Object.keys(v);
    if (keys.length === 0) return "{}";
    if (isFlat(v)) { const s = inline(v); if (s.length + indent.length <= 160) return s; }
    return "{\n" + keys.map(k => inner + JSON.stringify(k) + ": " + stringify(v[k], inner)).join(",\n") + "\n" + indent + "}";
}

// ---------------------------------------------------------------------------------------------------------------
// SRD baseline: generated from the srd block of every audit record, cross-checked against spells.json
// ---------------------------------------------------------------------------------------------------------------

// Rule entries of rules.json that effects may point into, with the one sentence each is quoted for.
const RULE_ENTRIES = [
    { key: "rule:combat-the-order-of-combat", id: "srd:rule:combat-the-order-of-combat", quote: "A round represents about 6 seconds in the game world." },
    { key: "condition:petrified", id: "srd:condition:petrified", quote: "Its weight increases by a factor of ten, and it ceases aging." }
];
const NUM_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11,
    twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
    thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000 };
const FRACTION_WORDS = { half: 2, halves: 2, third: 3, thirds: 3, quarter: 4, quarters: 4, eighth: 8, eighths: 8 };
const TOKEN = new RegExp("(\\d+d\\d+)" +
    "|\\b(one|two|three)-(half|halves|third|thirds|quarter|quarters|eighth|eighths)\\b" +
    "|(\\d+)/(\\d+)" +
    "|(\\d{1,3}(?:,\\d{3})+|\\d+(?:\\.\\d+)?)(st|nd|rd|th)?" +
    "|\\b(" + Object.keys(NUM_WORDS).join("|") + ")\\b", "gi");
const ADJ = "(?:additional |extra )?";
const UNITS = [
    [new RegExp("^[- ]*cubic[- ](?:feet|foot)\\b", "i"), "ft3"],
    [new RegExp("^[- ]*square[- ](?:feet|foot)\\b", "i"), "ft2"],
    [new RegExp("^[- ]*" + ADJ + "miles? per hour\\b", "i"), "mph"],
    [new RegExp("^[- ]*" + ADJ + "(?:feet|foot)\\b", "i"), "ft"],
    [new RegExp("^[- ]*" + ADJ + "inch(?:es)?\\b", "i"), "in"],
    [new RegExp("^[- ]*" + ADJ + "miles?\\b", "i"), "mi"],
    [new RegExp("^[- ]*" + ADJ + "gallons?\\b", "i"), "gal"],
    [new RegExp("^[- ]*" + ADJ + "pounds?\\b", "i"), "lb"],
    [new RegExp("^[- ]*" + ADJ + "seconds?\\b", "i"), "second"],
    [new RegExp("^[- ]*" + ADJ + "rounds?\\b", "i"), "round"],
    [new RegExp("^[- ]*" + ADJ + "minutes?\\b", "i"), "minute"],
    [new RegExp("^[- ]*" + ADJ + "hours?\\b", "i"), "hour"],
    [new RegExp("^[- ]*" + ADJ + "days?\\b", "i"), "day"],
    [new RegExp("^[- ]*" + ADJ + "years?\\b", "i"), "year"],
    [new RegExp("^[- ]*percent\\b", "i"), "percent"],
    [new RegExp("^[- ]*gp\\b", "i"), "gp"],
    [new RegExp("^[- ]*" + ADJ + "hit points?\\b", "i"), "hp"],
    [new RegExp("^[- ]*times\\b", "i"), "times"]
];
const FACTOR_BEFORE = /(?:multiplied by|by a factor of) $/i;
// Seconds per unit. A round is taken from the SRD rule quoted above; a year has no length here (the calendar is not
// set by this task), so year measures carry seconds: null.
const UNIT_SECONDS = { second: 1, minute: 60, hour: 3600, day: 86400 };

function extractMeasures(text, from, roundSeconds) {
    const out = [];
    if (!text) return out;
    TOKEN.lastIndex = 0;
    let m;
    while ((m = TOKEN.exec(text))) {
        const at = m.index;
        let end = at + m[0].length;
        const rec = { from, at };
        const before = text.slice(Math.max(0, at - 20), at);
        if (m[1]) {
            const parts = m[1].toLowerCase().split("d");
            Object.assign(rec, { unit: "dice", dice: m[1], count: Number(parts[0]), sides: Number(parts[1]) });
        } else if (m[2]) {
            Object.assign(rec, { unit: "fraction", value: NUM_WORDS[m[2].toLowerCase()] / FRACTION_WORDS[m[3].toLowerCase()] });
        } else {
            let value;
            if (m[4]) value = Number(m[4]) / Number(m[5]);
            else if (m[6]) value = Number(m[6].replace(/,/g, ""));
            else value = NUM_WORDS[m[8].toLowerCase()];
            rec.value = value;
            const rest = text.slice(end);
            if (m[7]) {
                const lv = /^[- ]*level\b/i.exec(rest);
                rec.unit = lv ? "level" : "ordinal";
                if (lv) end += lv[0].length;
            } else if (FACTOR_BEFORE.test(before)) {
                rec.unit = "factor";
            } else {
                let unit = null;
                for (const [re, u] of UNITS) { const x = re.exec(rest); if (x) { unit = u; end += x[0].length; break; } }
                if (unit) {
                    rec.unit = unit;
                    if (unit === "round") rec.seconds = value * roundSeconds;
                    else if (UNIT_SECONDS[unit] !== undefined) rec.seconds = value * UNIT_SECONDS[unit];
                    else if (unit === "year") rec.seconds = null;
                } else {
                    const w = /^[- ]([A-Za-z]+)/.exec(rest);
                    rec.unit = "count";
                    if (w) { rec.noun = w[1].toLowerCase(); end += w[0].length; }
                }
            }
        }
        rec.quote = text.slice(at, end);
        out.push(rec);
    }
    return out;
}

function parseDuration(q, roundSeconds) {
    if (q === "Instantaneous") return { kind: "instantaneous", seconds: 0 };
    if (/^Until dispelled( or triggered)?$/.test(q)) return { kind: "untilDispelled", seconds: null };
    if (q === "Special") return { kind: "special", seconds: null };
    const m = /^(?:Concentration,? )?(?:up to )?(\d+|one) (round|minute|hour|day)s?\.?$/i.exec(q);
    if (!m) throw new Error("baseline: unparsed duration " + JSON.stringify(q));
    const value = m[1].toLowerCase() === "one" ? 1 : Number(m[1]);
    const unit = m[2].toLowerCase();
    const per = unit === "round" ? roundSeconds : UNIT_SECONDS[unit];
    return { kind: "timed", value, unit, seconds: value * per, upTo: /up to/i.test(q) };
}

function parseRange(q) {
    let m = /^(\d[\d,]*) (feet|miles?)$/.exec(q);
    if (m) return { kind: "distance", value: Number(m[1].replace(/,/g, "")), unit: m[2] === "feet" ? "ft" : "mi" };
    m = /^Self \((.+)\)$/.exec(q);
    if (m) return { kind: "self", shapeQuote: m[1] };
    const k = { Self: "self", Touch: "touch", Sight: "sight", Unlimited: "unlimited", Special: "special" }[q];
    if (!k) throw new Error("baseline: unparsed range " + JSON.stringify(q));
    return { kind: k };
}

function buildBaseline(data) {
    const audit = data.audit, spellsFile = data.spells, rulesFile = data.rules;
    const entries = new Map(spellsFile.entries.map(e => [e.id, e]));
    const rulesById = new Map(rulesFile.entries.map(e => [e.id, e]));
    const mismatches = [], quoteMisses = [];
    let fieldsCompared = 0, quotesChecked = 0;

    const rules = {};
    for (const r of RULE_ENTRIES) {
        const e = rulesById.get(r.id);
        if (!e) throw new Error("baseline: rules.json has no " + r.id);
        quotesChecked++;
        if (!e.text.includes(r.quote)) quoteMisses.push({ id: r.id, field: "text", quote: r.quote });
        rules[r.key] = { id: r.id, quote: r.quote, measures: extractMeasures(r.quote, "text", 0) };
    }
    const roundM = rules["rule:combat-the-order-of-combat"].measures.find(x => x.unit === "second");
    const roundSeconds = roundM ? roundM.value : null;
    if (roundSeconds === null) throw new Error("baseline: no round length in the quoted SRD rule");

    const COPIED = ["level", "school", "ritual", "castingTime", "range", "components", "duration", "concentration"];
    const spells = {};
    for (const rec of audit.records) {
        const e = entries.get(rec.id);
        const slug = rec.id.replace(/^srd:spell:/, "");
        const s = rec.srd;
        if (!e) { mismatches.push({ id: rec.id, field: "*", note: "audit record has no spells.json entry" }); continue; }
        for (const f of COPIED) {
            fieldsCompared++;
            if (JSON.stringify(s[f]) !== JSON.stringify(e.data[f])) mismatches.push({ id: rec.id, field: f, audit: s[f], spells: e.data[f] });
        }
        fieldsCompared++;
        if (rec.name !== e.name) mismatches.push({ id: rec.id, field: "name", audit: rec.name, spells: e.name });
        const hl = s.higherLevels;
        if (hl) {
            fieldsCompared++;
            if ((hl.atHigherLevels || null) !== (e.data.atHigherLevels || null)) mismatches.push({ id: rec.id, field: "atHigherLevels" });
        }
        for (const list of ["area", "save", "attack", "damage"]) {
            for (const q of s[list] || []) {
                quotesChecked++;
                const src = q.from === "range" ? e.data.range : e.data.description;
                if (!src || !src.includes(q.quote)) quoteMisses.push({ id: rec.id, field: list, quote: q.quote });
            }
        }
        spells[slug] = {
            id: rec.id,
            name: rec.name,
            level: s.level,
            school: s.school,
            ritual: s.ritual,
            concentration: s.concentration,
            castingTime: { quote: s.castingTime, from: "castingTime" },
            range: Object.assign({ quote: s.range, from: "range" }, parseRange(s.range)),
            components: clone(s.components),
            duration: Object.assign({ quote: s.duration, from: "duration" }, parseDuration(s.duration, roundSeconds)),
            area: clone(s.area || []),
            save: clone(s.save || []),
            attack: clone(s.attack || []),
            damage: clone(s.damage || []),
            higherLevels: clone(s.higherLevels),
            measures: extractMeasures(e.data.description, "description", roundSeconds)
                .concat(extractMeasures(e.data.atHigherLevels, "atHigherLevels", roundSeconds)),
            source: clone(s.source)
        };
    }
    const spellKinds = {};
    for (const e of spellsFile.entries) spellKinds[e.kind] = (spellKinds[e.kind] || 0) + 1;
    let measureCount = 0;
    for (const k of Object.keys(spells)) measureCount += spells[k].measures.length;
    return {
        schemaVersion: BASELINE_VERSION,
        generator: "tools/spells/validate_spell_effects.js (--write-baseline writes this file; --check rebuilds and compares it)",
        note: "Every value is copied from the srd block of the SIM.60.01 audit record or is an exact SRD quote with the number read from it. " +
            "Duration seconds use the quoted SRD round rule; a year has no length here. Effects point into this file with srdRef; they never copy its numbers.",
        sources: {
            audit: { file: FILES.audit, sha256: data.sourceHashes.audit },
            spells: { file: FILES.spells, sha256: data.sourceHashes.spells },
            rules: { file: FILES.rules, sha256: data.sourceHashes.rules }
        },
        counts: {
            auditRecords: audit.records.length,
            spellsJsonEntries: spellsFile.entries.length,
            spellsJsonByKind: spellKinds,
            outOfScope: (audit.outOfScope || []).length,
            baselineSpells: Object.keys(spells).length,
            measures: measureCount
        },
        crossCheck: { fieldsCompared, mismatches, quotesChecked, quoteMisses },
        outOfScope: (audit.outOfScope || []).map(o => o.id),
        rules,
        spells
    };
}

let baselineMemo = null;
function baselineText(data) {
    if (baselineMemo && baselineMemo.audit === data.audit && baselineMemo.spells === data.spells && baselineMemo.rules === data.rules) return baselineMemo.text;
    const text = stringify(buildBaseline(data)) + "\n";
    baselineMemo = { audit: data.audit, spells: data.spells, rules: data.rules, text };
    return text;
}

// ---------------------------------------------------------------------------------------------------------------
// JSON Schema (draft 2020-12) subset used by spell_effect.schema.json
// ---------------------------------------------------------------------------------------------------------------

const SCHEMA_KEYWORDS = new Set(["$schema", "$id", "$defs", "$ref", "$comment", "title", "description", "examples", "default",
    "type", "enum", "const", "properties", "required", "additionalProperties", "propertyNames", "minProperties",
    "items", "minItems", "maxItems", "uniqueItems", "minLength", "maxLength", "pattern", "minimum", "maximum",
    "exclusiveMinimum", "allOf", "anyOf", "oneOf", "not", "if", "then", "else"]);

function schemaKeywordErrors(schema, where, out) {
    if (schema === true || schema === false) return;
    if (!schema || typeof schema !== "object" || Array.isArray(schema)) { out.push({ code: "SCHEMA_KEYWORD", path: where, message: "a schema must be an object or a boolean" }); return; }
    for (const k of Object.keys(schema)) {
        if (!SCHEMA_KEYWORDS.has(k)) out.push({ code: "SCHEMA_KEYWORD", path: where + "/" + k, message: "keyword not implemented by this validator" });
    }
    const sub = (s, p) => schemaKeywordErrors(s, p, out);
    for (const k of ["$defs", "properties"]) if (schema[k]) for (const n of Object.keys(schema[k])) sub(schema[k][n], where + "/" + k + "/" + n);
    for (const k of ["items", "propertyNames", "not", "if", "then", "else"]) if (schema[k] !== undefined) sub(schema[k], where + "/" + k);
    if (schema.additionalProperties !== undefined && typeof schema.additionalProperties === "object") sub(schema.additionalProperties, where + "/additionalProperties");
    for (const k of ["allOf", "anyOf", "oneOf"]) if (schema[k]) schema[k].forEach((s, i) => sub(s, where + "/" + k + "/" + i));
}

function typeOf(v) {
    if (v === null) return "null";
    if (Array.isArray(v)) return "array";
    if (typeof v === "number") return Number.isInteger(v) ? "integer" : "number";
    return typeof v;
}
function typeMatches(t, v) {
    const a = typeOf(v);
    return t === a || (t === "number" && a === "integer");
}
function deepEqual(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

function resolveRef(root, ref) {
    if (!ref.startsWith("#/")) return undefined;
    let node = root;
    for (const part of ref.slice(2).split("/")) {
        if (node === undefined || node === null) return undefined;
        node = node[part.replace(/~1/g, "/").replace(/~0/g, "~")];
    }
    return node;
}

function schemaValidate(schema, inst, root, where, out) {
    if (schema === true) return;
    if (schema === false) { out.push({ code: "SCHEMA_FALSE", path: where, message: "no value is allowed here" }); return; }
    if (schema.$ref !== undefined) {
        const target = resolveRef(root, schema.$ref);
        if (target === undefined) out.push({ code: "SCHEMA_REF", path: where, message: "unresolved $ref " + schema.$ref });
        else schemaValidate(target, inst, root, where, out);
    }
    if (schema.type !== undefined) {
        const types = Array.isArray(schema.type) ? schema.type : [schema.type];
        if (!types.some(t => typeMatches(t, inst))) { out.push({ code: "SCHEMA_TYPE", path: where, message: "expected " + types.join("|") + ", got " + typeOf(inst) }); return; }
    }
    if (schema.enum !== undefined && !schema.enum.some(x => deepEqual(x, inst))) out.push({ code: "SCHEMA_ENUM", path: where, message: JSON.stringify(inst) + " is not one of " + JSON.stringify(schema.enum).slice(0, 200) });
    if (schema.const !== undefined && !deepEqual(schema.const, inst)) out.push({ code: "SCHEMA_CONST", path: where, message: "must be " + JSON.stringify(schema.const) });
    const t = typeOf(inst);
    if (t === "object") {
        const props = schema.properties || {};
        for (const k of schema.required || []) if (!Object.prototype.hasOwnProperty.call(inst, k)) out.push({ code: "SCHEMA_REQUIRED", path: where, message: "missing required property " + JSON.stringify(k) });
        for (const k of Object.keys(inst)) {
            if (props[k] !== undefined) schemaValidate(props[k], inst[k], root, where + "/" + k, out);
            else if (schema.additionalProperties !== undefined) {
                if (schema.additionalProperties === false) out.push({ code: "SCHEMA_ADDITIONAL", path: where + "/" + k, message: "property " + JSON.stringify(k) + " is not allowed (additionalProperties: false)" });
                else schemaValidate(schema.additionalProperties, inst[k], root, where + "/" + k, out);
            }
            if (schema.propertyNames !== undefined) {
                const sub = [];
                schemaValidate(schema.propertyNames, k, root, where + "/" + k, sub);
                if (sub.length) out.push({ code: "SCHEMA_PROPERTY_NAME", path: where + "/" + k, message: "property name " + JSON.stringify(k) + " fails: " + sub[0].message });
            }
        }
        if (schema.minProperties !== undefined && Object.keys(inst).length < schema.minProperties) out.push({ code: "SCHEMA_SIZE", path: where, message: "fewer than " + schema.minProperties + " properties" });
    } else if (t === "array") {
        if (schema.items !== undefined) inst.forEach((x, i) => schemaValidate(schema.items, x, root, where + "/" + i, out));
        if (schema.minItems !== undefined && inst.length < schema.minItems) out.push({ code: "SCHEMA_SIZE", path: where, message: "fewer than " + schema.minItems + " items" });
        if (schema.maxItems !== undefined && inst.length > schema.maxItems) out.push({ code: "SCHEMA_SIZE", path: where, message: "more than " + schema.maxItems + " items" });
        if (schema.uniqueItems === true && new Set(inst.map(x => JSON.stringify(x))).size !== inst.length) out.push({ code: "SCHEMA_UNIQUE", path: where, message: "items are not unique" });
    } else if (t === "string") {
        const len = Array.from(inst).length;
        if (schema.minLength !== undefined && len < schema.minLength) out.push({ code: "SCHEMA_SIZE", path: where, message: "shorter than " + schema.minLength });
        if (schema.maxLength !== undefined && len > schema.maxLength) out.push({ code: "SCHEMA_SIZE", path: where, message: "longer than " + schema.maxLength });
        if (schema.pattern !== undefined && !new RegExp(schema.pattern, "u").test(inst)) out.push({ code: "SCHEMA_PATTERN", path: where, message: JSON.stringify(inst).slice(0, 80) + " does not match " + schema.pattern });
    } else if (t === "integer" || t === "number") {
        if (schema.minimum !== undefined && inst < schema.minimum) out.push({ code: "SCHEMA_RANGE", path: where, message: "below " + schema.minimum });
        if (schema.maximum !== undefined && inst > schema.maximum) out.push({ code: "SCHEMA_RANGE", path: where, message: "above " + schema.maximum });
        if (schema.exclusiveMinimum !== undefined && inst <= schema.exclusiveMinimum) out.push({ code: "SCHEMA_RANGE", path: where, message: "not above " + schema.exclusiveMinimum });
    }
    if (schema.allOf) schema.allOf.forEach(s => schemaValidate(s, inst, root, where, out));
    if (schema.anyOf) {
        const tries = schema.anyOf.map(s => { const e = []; schemaValidate(s, inst, root, where, e); return e; });
        if (!tries.some(e => e.length === 0)) out.push({ code: "SCHEMA_ANYOF", path: where, message: "no anyOf branch matches (" + tries.map((e, i) => i + ": " + e[0].code + " " + e[0].path + " " + e[0].message).join("; ").slice(0, 400) + ")" });
    }
    if (schema.oneOf) {
        const tries = schema.oneOf.map(s => { const e = []; schemaValidate(s, inst, root, where, e); return e; });
        const n = tries.filter(e => e.length === 0).length;
        if (n !== 1) out.push({ code: "SCHEMA_ONEOF", path: where, message: n + " oneOf branches match, exactly 1 must (" + tries.map((e, i) => i + ": " + (e.length ? e[0].code + " " + e[0].path + " " + e[0].message : "ok")).join("; ").slice(0, 400) + ")" });
    }
    if (schema.not !== undefined) {
        const e = [];
        schemaValidate(schema.not, inst, root, where, e);
        if (e.length === 0) out.push({ code: "SCHEMA_NOT", path: where, message: "matches a forbidden form" });
    }
    if (schema.if !== undefined) {
        const e = [];
        schemaValidate(schema.if, inst, root, where, e);
        if (e.length === 0) { if (schema.then !== undefined) schemaValidate(schema.then, inst, root, where, out); }
        else if (schema.else !== undefined) schemaValidate(schema.else, inst, root, where, out);
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Helpers for the rules
// ---------------------------------------------------------------------------------------------------------------

const QUOTE_KEY = k => k === "srdQuote" || /Quote$/.test(k);
const ID_KEYS = new Set(["srdRef", "tuningRef", "cause", "key", "variant", "spellId", "deusRule", "question", "ownerOpen", "item",
    "part", "gap", "row", "q1Case", "primitive", "primitiveIfYes", "unit"]);
const isPointer = v => v && typeof v === "object" && !Array.isArray(v) && (typeof v.srdRef === "string" || typeof v.tuningRef === "string" || typeof v.ownerOpen === "string");

// visit(value, key, path, parent) for every node; pointer objects are visited but not entered.
function walk(value, pathStr, visit, key, parent) {
    visit(value, key, pathStr, parent);
    if (value && typeof value === "object" && !isPointer(value)) {
        if (Array.isArray(value)) value.forEach((x, i) => walk(x, pathStr + "/" + i, visit, i, value));
        else for (const k of Object.keys(value)) walk(value[k], pathStr + "/" + k, visit, k, value);
    }
}
function slugOf(spellId) { return String(spellId).replace(/^srd:spell:/, ""); }
function auditIndex(data) { return new Map(data.audit.records.map(r => [r.id, r])); }
function isNoneRecord(r) { return r.systems.length === 1 && r.systems[0] === "NONE"; }
function recordsOf(data) { return (data.effects && Array.isArray(data.effects.records)) ? data.effects.records : []; }
function instancesOf(rec) { return Array.isArray(rec.effects) ? rec.effects : []; }

// Every number that the SRD states for a spell: numeric fields of its baseline entry and every digit or dice token
// in its quotes. Offsets and page numbers are bookkeeping, not SRD values.
function srdNumbers(node) {
    const set = new Set();
    const addText = s => {
        let m;
        const re = /(\d+)d(\d+)|\d+(?:\.\d+)?/g;
        while ((m = re.exec(s))) {
            if (m[1]) { set.add(Number(m[1])); set.add(Number(m[2])); } else set.add(Number(m[0]));
        }
    };
    walk(node, "", (v, k) => {
        if (k === "at" || k === "pages") return;
        if (typeof v === "number") set.add(v);
        else if (typeof v === "string") addText(v.replace(/,(\d{3})/g, "$1"));
    });
    return set;
}
// Prose may name decisions and rows (DEC-018, R2, Q4, SIM.40.01, §3.4); those tokens are not SRD numbers.
function stripIds(s) {
    return s.replace(/§\s*\d+(?:\.\d+)*/g, " ").replace(/\b[A-Z][A-Za-z]*[-.]?\d+(?:[.-]\d+)*[a-z]?\b/g, " ");
}

function resolveSrdRef(data, ref) {
    const m = /^([a-z0-9:-]+)\.([a-zA-Z]+)(?:\[(\d+)\])?$/.exec(ref);
    if (!m) return { error: "malformed pointer" };
    const b = data.baseline || {};
    const owner = m[1].includes(":") ? (b.rules || {})[m[1]] : (b.spells || {})[m[1]];
    if (!owner) return { error: "no baseline entry " + JSON.stringify(m[1]) };
    let node = owner[m[2]];
    if (node === undefined) return { error: "no field " + JSON.stringify(m[2]) };
    if (m[3] !== undefined) {
        if (!Array.isArray(node) || Number(m[3]) >= node.length) return { error: "index " + m[3] + " out of range" };
        node = node[Number(m[3])];
    }
    return { key: m[1], field: m[2], node };
}

// ---------------------------------------------------------------------------------------------------------------
// Rules. Each adds errors with add(code, spellId, path, message).
// ---------------------------------------------------------------------------------------------------------------

function ruleSchema(data, add) {
    const kw = [];
    schemaKeywordErrors(data.schema, "#", kw);
    for (const e of kw) add(e.code, FILES.schema, e.path, e.message);
    const targets = [
        ["effects", data.effects, "#"],
        ["tuning", data.tuning, "#/$defs/tuningFile"],
        ["primitives", data.primitives, "#/$defs/primitiveCatalogue"]
    ];
    for (const [name, inst, ref] of targets) {
        const out = [];
        const target = ref === "#" ? data.schema : resolveRef(data.schema, ref);
        if (target === undefined) { add("SCHEMA_REF", FILES.schema, ref, "schema has no " + ref); continue; }
        schemaValidate(target, inst, data.schema, "", out);
        for (const e of out) {
            let who = FILES[name], p = e.path;
            const m = /^\/records\/(\d+)(.*)$/.exec(p);
            if (name === "effects" && m && inst.records[Number(m[1])]) { who = inst.records[Number(m[1])].spellId || who; p = m[2] || "/"; }
            add(e.code, who, p, e.message);
        }
    }
}

function ruleCoverage(data, add) {
    const idx = auditIndex(data);
    const baselineIds = new Set(Object.values((data.baseline || {}).spells || {}).map(s => s.id));
    const seen = new Map();
    for (const rec of recordsOf(data)) {
        if (!baselineIds.has(rec.spellId)) add("COVERAGE_UNKNOWN_SPELL", rec.spellId, "/", "effect record for a spell that is not in srd_baseline.json");
        if (seen.has(rec.spellId)) add("COVERAGE_DUPLICATE", rec.spellId, "/", "second effect record for this spell");
        seen.set(rec.spellId, rec);
        const a = idx.get(rec.spellId);
        if (a && isNoneRecord(a) && a.primitives.length === 0) add("COVERAGE_UNKNOWN_SPELL", rec.spellId, "/", "the audit classifies this spell NONE with no primitive; it takes no effect record");
    }
    for (const a of data.audit.records) {
        const needed = !isNoneRecord(a) || a.primitives.length > 0;
        if (needed && !seen.has(a.id)) add("COVERAGE_MISSING", a.id, "/", "audit record (" + a.systems.join(",") + "; " + a.primitives.join(",") + ") has no effect entry");
    }
}

function ruleSystems(data, add) {
    const idx = auditIndex(data);
    for (const rec of recordsOf(data)) {
        const a = idx.get(rec.spellId);
        if (!a) continue;
        const x = (rec.systems || []).slice().sort().join(","), y = a.systems.slice().sort().join(",");
        if (x !== y) add("SYSTEMS_MISMATCH", rec.spellId, "/systems", "systems " + x + " differ from the audit's " + y);
    }
}

function rulePrimitiveKnown(data, add) {
    const known = data.audit.meta.primitiveSystems;
    for (const rec of recordsOf(data)) instancesOf(rec).forEach((fx, i) => {
        if (!Object.prototype.hasOwnProperty.call(known, fx.primitive)) add("PRIMITIVE_UNKNOWN", rec.spellId, "/effects/" + i + "/primitive", JSON.stringify(fx.primitive) + " is not a primitive of the audit catalogue (meta.primitiveSystems)");
    });
}

function rulePrimitiveSystem(data, add) {
    const known = data.audit.meta.primitiveSystems;
    for (const rec of recordsOf(data)) {
        const sys = rec.systems || [];
        const none = sys.length === 1 && sys[0] === "NONE";
        instancesOf(rec).forEach((fx, i) => {
            const allowed = known[fx.primitive];
            if (!allowed) return;
            // Entity and meta primitives (audit section 3.3) may appear in any record; a physical primitive needs one of its systems.
            const ok = allowed.includes("meta") || (!none && allowed.some(s => sys.includes(s)));
            if (!ok) add("PRIMITIVE_SYSTEM", rec.spellId, "/effects/" + i + "/primitive", fx.primitive + " needs one of " + allowed.join(",") + " but the record's systems are " + sys.join(","));
        });
    }
}

function rulePrimitiveCoverage(data, add) {
    const idx = auditIndex(data);
    for (const rec of recordsOf(data)) {
        const a = idx.get(rec.spellId);
        if (!a) continue;
        const used = new Set(instancesOf(rec).map(fx => fx.primitive));
        for (const p of a.primitives) if (!used.has(p)) add("PRIMITIVE_COVERAGE", rec.spellId, "/effects", "audit primitive " + p + " has no effect instance");
        for (const p of used) if (!a.primitives.includes(p)) add("PRIMITIVE_COVERAGE", rec.spellId, "/effects", "primitive " + p + " is not in the audit record's primitives");
    }
}

function ruleKeys(data, add) {
    for (const rec of recordsOf(data)) {
        const seen = new Set();
        instancesOf(rec).forEach((fx, i) => {
            if (seen.has(fx.key)) add("KEY_DUPLICATE", rec.spellId, "/effects/" + i + "/key", "effect key " + JSON.stringify(fx.key) + " is used twice");
            seen.add(fx.key);
        });
    }
}

function ruleVariants(data, add) {
    for (const rec of recordsOf(data)) {
        const ids = (rec.variants || []).map(v => v.id);
        const used = new Set();
        instancesOf(rec).forEach((fx, i) => {
            if (fx.variant === undefined) return;
            used.add(fx.variant);
            if (!ids.includes(fx.variant)) add("VARIANT_UNKNOWN", rec.spellId, "/effects/" + i + "/variant", "variant " + JSON.stringify(fx.variant) + " is not declared in the record's variants");
        });
        ids.forEach((id, i) => { if (!used.has(id)) add("VARIANT_UNKNOWN", rec.spellId, "/variants/" + i, "variant " + id + " is declared but no effect uses it"); });
    }
}

function ruleSrdQuotes(data, add) {
    const entries = new Map(data.spells.entries.map(e => [e.id, e]));
    for (const rec of recordsOf(data)) {
        const e = entries.get(rec.spellId);
        if (!e) continue;
        walk(rec, "", (v, k, p) => {
            if (typeof k === "string" && QUOTE_KEY(k) && typeof v === "string" && !e.text.includes(v)) {
                add("SRD_QUOTE_INEXACT", rec.spellId, p, JSON.stringify(v).slice(0, 100) + " is not an exact substring of the spell's SRD text (spells.json)");
            }
        });
        instancesOf(rec).forEach((fx, i) => {
            if (fx.basis === "srd" && typeof fx.srdQuote !== "string") add("SRD_QUOTE_INEXACT", rec.spellId, "/effects/" + i, "basis srd without an srdQuote");
        });
    }
}

function ruleSrdRefs(data, add) {
    const ids = new Set(Object.values((data.baseline || {}).spells || {}).map(s => s.id));
    for (const rec of recordsOf(data)) {
        const slug = slugOf(rec.spellId);
        walk(rec, "", (v, k, p) => {
            if ((k === "asSpell" || k === "spell") && typeof v === "string" && !ids.has(v)) add("SRDREF_UNRESOLVED", rec.spellId, p, JSON.stringify(v) + " is not a spell of srd_baseline.json");
        });
        walk(rec, "", (v, k, p, parent) => {
            if (!v || typeof v !== "object" || v.srdRef === undefined) return;
            const r = resolveSrdRef(data, v.srdRef);
            if (r.error) { add("SRDREF_UNRESOLVED", rec.spellId, p, JSON.stringify(v.srdRef) + ": " + r.error); return; }
            if (!r.key.includes(":") && r.key !== slug) { add("SRDREF_UNRESOLVED", rec.spellId, p, JSON.stringify(v.srdRef) + " points into another spell's baseline"); return; }
            const node = r.node;
            if (v.unit !== undefined && (!node || node.unit !== v.unit)) add("SRDREF_KIND", rec.spellId, p, JSON.stringify(v.srdRef) + " has unit " + JSON.stringify(node && node.unit) + ", not " + JSON.stringify(v.unit));
            const want = { damage: "damage", area: "area", creatureSave: "save" }[k];
            if (want && r.field !== want) add("SRDREF_KIND", rec.spellId, p, k + " must point at ." + want + "[i], not ." + r.field);
            if (k === "duration" && !(r.field === "duration" || (r.field === "measures" && node && node.seconds !== undefined))) add("SRDREF_KIND", rec.spellId, p, "a lifetime must point at .duration or at a time measure");
            if (r.field === "measures" && v.unit === undefined) add("SRDREF_KIND", rec.spellId, p, "a pointer into measures must state the measure's unit");
        });
    }
}

function ruleSrdNumberCopied(data, add) {
    const spells = (data.baseline || {}).spells || {};
    for (const rec of recordsOf(data)) {
        const node = spells[slugOf(rec.spellId)];
        if (!node) continue;
        const nums = srdNumbers(node);
        walk(rec, "", (v, k, p) => {
            if (typeof k === "string" && (QUOTE_KEY(k) || ID_KEYS.has(k))) return;
            if (typeof v === "number" && nums.has(v)) add("SRD_NUMBER_COPIED", rec.spellId, p, "literal " + v + " equals an SRD value of this spell; point at the baseline with srdRef");
            if (typeof v === "string") {
                const s = stripIds(v).replace(/,(\d{3})/g, "$1");
                const re = /(\d+)d(\d+)|\d+(?:\.\d+)?/g;
                let m;
                while ((m = re.exec(s))) {
                    const hit = m[1] ? (nums.has(Number(m[1])) || nums.has(Number(m[2]))) : nums.has(Number(m[0]));
                    if (hit) { add("SRD_NUMBER_COPIED", rec.spellId, p, "text " + JSON.stringify(m[0]) + " repeats an SRD value of this spell"); break; }
                }
            }
        });
    }
}

const SRD_FIELD_WORDS = ["damage", "range", "save", "area", "duration", "castingtime", "radius", "diameter", "length", "width",
    "height", "depth", "thickness", "distance", "volume", "dice"];
function ruleSrdFieldLiteral(data, add) {
    for (const rec of recordsOf(data)) {
        walk(rec, "", (v, k, p) => {
            if (typeof k !== "string" || QUOTE_KEY(k)) return;
            const lk = k.toLowerCase();
            if (!SRD_FIELD_WORDS.some(w => lk.includes(w))) return;
            const literal = v === null || typeof v !== "object" || (Array.isArray(v) && v.some(x => x === null || typeof x !== "object"));
            if (literal) add("SRD_FIELD_LITERAL", rec.spellId, p, "field " + JSON.stringify(k) + " holds a literal; SRD damage, range, save, area, duration and casting values are pointers");
        });
    }
}

const TIME_SCALE_TEXT = [
    /\d+(?:\.\d+)?\s*(?:game[- ])?(?:seconds?|minutes?|hours?|days?|years?)\s*(?:per|\/|a|each)\s*(?:sim(?:ulation)?\s*)?tick/i,
    /\d+(?:\.\d+)?\s*ticks?\b/i,
    /\bticks?\s*(?:per|\/)\s*(?:second|minute|hour|day)/i,
    /\d+(?:\.\d+)?\s*Hz\b/i,
    /\d+(?:\.\d+)?\s*days?\s*(?:per|\/|a|each|in a)\s*year/i,
    /\byears?\s*(?:=|is|lasts)\s*\d/i
];
function ruleNoTickLiterals(data, add) {
    for (const rec of recordsOf(data)) {
        walk(rec, "", (v, k, p) => {
            if (typeof k === "string" && /tick/i.test(k)) add("Q2_TICK_LITERAL", rec.spellId, p, "effect data is in SRD seconds; a tick field (" + k + ") is not allowed while Q2 is open");
            if (typeof v === "string" && !(typeof k === "string" && QUOTE_KEY(k))) {
                if (/^(?:[a-z]+Tick[A-Za-z]*|ticks?[A-Z]?[A-Za-z]*)$/.test(v)) add("Q2_TICK_LITERAL", rec.spellId, p, "value " + JSON.stringify(v) + " names a tick");
                for (const re of TIME_SCALE_TEXT) if (re.test(v)) { add("Q2_TICK_LITERAL", rec.spellId, p, "text states a time scale (" + re + ")"); break; }
            }
        });
    }
    for (const name of ["tuning", "primitives"]) {
        walk(data[name], "", (v, k, p) => {
            if (typeof v === "string") for (const re of TIME_SCALE_TEXT) if (re.test(v)) { add("Q2_TICK_LITERAL", FILES[name], p, "text states a time scale (" + re + ")"); break; }
        });
    }
}

function ruleSecondsPerTickOpen(data, add) {
    const params = ((data.tuning || {}).parameters) || {};
    for (const d of ["action", "historical"]) {
        const n = "secondsPerTick." + d, p = params[n];
        if (!p) { add("Q2_SECONDS_PER_TICK", FILES.tuning, "/parameters/" + n, "missing: Q2 needs a named, empty parameter per time domain"); continue; }
        if (p.value !== null || p.status !== "OWNER_OPEN" || p.question !== "Q2") add("Q2_SECONDS_PER_TICK", FILES.tuning, "/parameters/" + n, "must stay value null, status OWNER_OPEN, question Q2 (Owner question Q2 is open)");
    }
    for (const n of Object.keys(params)) {
        if (/tick/i.test(n) && !/^secondsPerTick\.(action|historical)$/.test(n)) add("Q2_SECONDS_PER_TICK", FILES.tuning, "/parameters/" + n, "only secondsPerTick.action and secondsPerTick.historical may name a tick");
    }
    for (const rec of recordsOf(data)) walk(rec, "", (v, k, p) => {
        if (v && typeof v === "object" && typeof v.tuningRef === "string" && /tick/i.test(v.tuningRef)) add("Q2_SECONDS_PER_TICK", rec.spellId, p, "effects may not read secondsPerTick; lifetimes are SRD seconds");
    });
}

function ledgerOf(fx) { return fx && fx.ledger && typeof fx.ledger === "object" ? fx.ledger : {}; }

function ruleLedgerCause(data, add) {
    for (const rec of recordsOf(data)) instancesOf(rec).forEach((fx, i) => {
        const L = ledgerOf(fx);
        if (!L.mode || L.mode === "none") return;
        const p = "/effects/" + i + "/ledger/cause";
        if (typeof L.cause !== "string" || L.cause.length === 0) { add("LEDGER_NO_CAUSE", rec.spellId, p, "a ledger " + L.mode + " needs a cause"); return; }
        const m = /^spell:(srd:spell:[a-z0-9-]+)(?:#[A-Za-z][A-Za-z0-9]*)?$/.exec(L.cause);
        if (!m || m[1] !== rec.spellId) add("LEDGER_NO_CAUSE", rec.spellId, p, "cause " + JSON.stringify(L.cause) + " must be spell:" + rec.spellId + "[#variant]");
        if (L.cause.length > 200) add("LEDGER_NO_CAUSE", rec.spellId, p, "cause longer than the ledger's 200 characters");
    });
}

function policyCases(data) { return (((data.tuning || {}).conjuredMatterPolicy) || {}).cases || {}; }

function ruleLedgerNames(data, add) {
    const L = data.ledger;
    const cases = policyCases(data);
    for (const c of Object.keys(cases)) {
        const d = cases[c].default || {};
        if (d.source !== undefined && !Object.prototype.hasOwnProperty.call(L.sources, d.source)) add("LEDGER_NAME_UNKNOWN", FILES.tuning, "/conjuredMatterPolicy/cases/" + c + "/default/source", JSON.stringify(d.source) + " is not a source declared in " + FILES.ledger);
        if (d.sink !== undefined && !Object.prototype.hasOwnProperty.call(L.sinks, d.sink)) add("LEDGER_NAME_UNKNOWN", FILES.tuning, "/conjuredMatterPolicy/cases/" + c + "/default/sink", JSON.stringify(d.sink) + " is not a sink declared in " + FILES.ledger);
    }
    const rows = new Set(L.transforms.map(t => t.id));
    for (const rec of recordsOf(data)) instancesOf(rec).forEach((fx, i) => {
        const Lg = ledgerOf(fx);
        (Array.isArray(Lg.downstream) ? Lg.downstream : []).forEach((d, j) => {
            const m = /^(transform|source|sink):(.+)$/.exec(d);
            const ok = m && (m[1] === "transform" ? rows.has(m[2]) : Object.prototype.hasOwnProperty.call(m[1] === "source" ? L.sources : L.sinks, m[2]));
            if (!ok) add("LEDGER_NAME_UNKNOWN", rec.spellId, "/effects/" + i + "/ledger/downstream/" + j, JSON.stringify(d) + " names no transform row, source or sink of " + FILES.ledger);
        });
        if (Lg.mode === "source" || Lg.mode === "sink" || Lg.mode === "policy") {
            if (!Object.prototype.hasOwnProperty.call(cases, Lg.q1Case)) add("Q1_CASE_UNKNOWN", rec.spellId, "/effects/" + i + "/ledger/q1Case", JSON.stringify(Lg.q1Case) + " is not a case of the Q1 conjured-matter policy table (tuning.json)");
        }
    });
}

function classFormErrors(L, cls, form) {
    const c = L.classes[cls];
    if (!c) return "class " + JSON.stringify(cls) + " is not declared in the ledger defaults";
    if (!L.forms.includes(form)) return "form " + JSON.stringify(form) + " is not declared in the ledger defaults";
    if (!c.forms.includes(form)) return "class " + cls + " has no form " + form + " in the ledger defaults";
    return null;
}

function ruleLedgerClasses(data, add) {
    const L = data.ledger;
    const mat = (((data.tuning || {}).tables) || {}).materialClass || {};
    for (const rec of recordsOf(data)) instancesOf(rec).forEach((fx, i) => {
        const Lg = ledgerOf(fx), p = "/effects/" + i + "/ledger";
        const check = (cls, form, where) => { const e = classFormErrors(L, cls, form); if (e) add("LEDGER_CLASS_UNKNOWN", rec.spellId, p + where, e); };
        if (Lg.mode === "source" || Lg.mode === "sink" || (Lg.mode === "policy" && (Lg.class !== undefined || Lg.form !== undefined))) check(Lg.class, Lg.form, "");
        if (Lg.mode === "transform") (Lg.moves || []).forEach((mv, j) => {
            check(mv.from && mv.from.class, mv.from && mv.from.form, "/moves/" + j + "/from");
            check(mv.to && mv.to.class, mv.to && mv.to.form, "/moves/" + j + "/to");
        });
        if (Lg.mode === "relocate") (Lg.classes || []).forEach((c, j) => {
            if (!L.classes[c]) add("LEDGER_CLASS_UNKNOWN", rec.spellId, p + "/classes/" + j, "class " + JSON.stringify(c) + " is not declared in the ledger defaults");
            else if (!(Lg.forms || []).some(f => L.classes[c].forms.includes(f))) add("LEDGER_CLASS_UNKNOWN", rec.spellId, p + "/classes/" + j, "class " + c + " has none of the forms " + JSON.stringify(Lg.forms));
        });
        if (Lg.mode === "relocate") (Lg.forms || []).forEach((f, j) => { if (!L.forms.includes(f)) add("LEDGER_CLASS_UNKNOWN", rec.spellId, p + "/forms/" + j, "form " + JSON.stringify(f) + " is not declared in the ledger defaults"); });
        const material = fx.params && fx.params.material;
        if (fx.primitive === "conjureMatter" && typeof material === "string") {
            const row = mat[material];
            if (!row) add("LEDGER_CLASS_UNKNOWN", rec.spellId, "/effects/" + i + "/params/material", "material " + JSON.stringify(material) + " is not in tuning.json tables.materialClass");
            else if (!row.value) { if (Lg.mode !== "policy") add("LEDGER_CLASS_UNKNOWN", rec.spellId, p, "material " + material + " has no fixed ledger class (tuning.json); only ledger mode policy may use it"); }
            else if (row.value.class !== Lg.class || row.value.form !== Lg.form) add("LEDGER_CLASS_UNKNOWN", rec.spellId, p, "material " + material + " maps to " + row.value.class + "/" + row.value.form + " in tuning.json, not " + Lg.class + "/" + Lg.form);
        }
    });
}

function ruleLedgerRows(data, add) {
    const L = data.ledger;
    const gaps = new Set((((data.primitives || {}).ledgerGaps) || []).map(g => g.id));
    for (const rec of recordsOf(data)) instancesOf(rec).forEach((fx, i) => {
        const Lg = ledgerOf(fx);
        if (Lg.mode !== "transform") return;
        (Lg.moves || []).forEach((mv, j) => {
            const p = "/effects/" + i + "/ledger/moves/" + j;
            if (mv.row === null) {
                if (!gaps.has(mv.gap)) add("LEDGER_ROW_UNKNOWN", rec.spellId, p, "a move with no ledger row must name a gap listed in primitives.json ledgerGaps");
                return;
            }
            const ok = L.transforms.some(t => t.id === mv.row && t.from === (mv.from || {}).class && t.fromForms.includes((mv.from || {}).form) &&
                t.to === (mv.to || {}).class && t.toForms.includes((mv.to || {}).form));
            if (!ok) add("LEDGER_ROW_UNKNOWN", rec.spellId, p, "no transform row " + JSON.stringify(mv.row) + " moves " + JSON.stringify(mv.from) + " to " + JSON.stringify(mv.to) + " in " + FILES.ledger);
        });
    });
}

function ruleNoOre(data, add) {
    const L = data.ledger;
    const isOre = c => !!(L.classes[c] && L.classes[c].ore);
    for (const rec of recordsOf(data)) instancesOf(rec).forEach((fx, i) => {
        const Lg = ledgerOf(fx), p = "/effects/" + i + "/ledger";
        if ((Lg.mode === "source" || Lg.mode === "policy") && isOre(Lg.class)) add("ORE_OUTPUT", rec.spellId, p + "/class", "an effect may not create ore (" + Lg.class + "; LIFE-002, D-5)");
        if (Lg.mode === "transform") (Lg.moves || []).forEach((mv, j) => {
            if (mv.to && isOre(mv.to.class)) add("ORE_OUTPUT", rec.spellId, p + "/moves/" + j + "/to", "an effect may not output ore (" + mv.to.class + "; LIFE-002, D-5)");
        });
        (Array.isArray(Lg.downstream) ? Lg.downstream : []).forEach((d, j) => {
            const t = /^transform:(.+)$/.exec(d);
            if (t && L.transforms.some(r => r.id === t[1] && isOre(r.to))) add("ORE_OUTPUT", rec.spellId, p + "/downstream/" + j, "downstream row " + t[1] + " outputs ore");
        });
    });
    const mat = (((data.tuning || {}).tables) || {}).materialClass || {};
    for (const k of Object.keys(mat)) if (mat[k].value && isOre(mat[k].value.class)) add("ORE_OUTPUT", FILES.tuning, "/tables/materialClass/" + k, "a conjured material may not map to ore");
}

function ruleSourceScope(data, add) {
    const L = data.ledger;
    const cases = policyCases(data);
    for (const rec of recordsOf(data)) instancesOf(rec).forEach((fx, i) => {
        const Lg = ledgerOf(fx);
        if (Lg.mode !== "source" && Lg.mode !== "policy") return;
        const c = cases[Lg.q1Case];
        const name = c && c.default && c.default.source;
        const src = name && L.sources[name];
        const cls = L.classes[Lg.class];
        if (!src || !cls) return;
        const fam = cls.family ? [cls.family] : Object.keys(cls.composition || {});
        if (fam.some(f => L.families[f] && L.families[f].finite) && !src.allowFinite) add("LEDGER_SOURCE_SCOPE", rec.spellId, "/effects/" + i + "/ledger/class", "source " + name + " may not add to a finite family (" + Lg.class + "); the ledger refuses it (allowFinite false)");
        if (src.classes !== "*" && !src.classes.includes(Lg.class)) add("LEDGER_SOURCE_SCOPE", rec.spellId, "/effects/" + i + "/ledger/class", "source " + name + " does not cover class " + Lg.class);
        if (src.forms !== "*" && !src.forms.includes(Lg.form)) add("LEDGER_SOURCE_SCOPE", rec.spellId, "/effects/" + i + "/ledger/form", "source " + name + " does not cover form " + Lg.form);
    });
}

function ruleLedgerMode(data, add) {
    const cat = {};
    for (const p of (((data.primitives || {}).primitives) || [])) cat[p.name] = p;
    for (const rec of recordsOf(data)) instancesOf(rec).forEach((fx, i) => {
        const c = cat[fx.primitive];
        const mode = ledgerOf(fx).mode;
        if (c && Array.isArray(c.ledgerModes) && !c.ledgerModes.includes(mode)) add("LEDGER_MODE", rec.spellId, "/effects/" + i + "/ledger/mode", fx.primitive + " allows ledger modes " + c.ledgerModes.join(",") + ", not " + mode);
    });
}

function ruleTuningRefs(data, add) {
    const params = ((data.tuning || {}).parameters) || {};
    for (const rec of recordsOf(data)) walk(rec, "", (v, k, p) => {
        if (v && typeof v === "object" && v.tuningRef !== undefined && !Object.prototype.hasOwnProperty.call(params, v.tuningRef)) add("TUNING_REF_UNKNOWN", rec.spellId, p, JSON.stringify(v.tuningRef) + " is not a parameter of tuning.json");
    });
}

function ruleOwnerOpen(data, add) {
    const qs = ((data.tuning || {}).ownerQuestions) || {};
    const known = (q, item) => qs[q] && (item === undefined || (qs[q].items && Object.prototype.hasOwnProperty.call(qs[q].items, item)));
    for (const rec of recordsOf(data)) {
        (rec.ownerOpen || []).forEach((n, j) => {
            if (!known(n.question, n.item)) add("OWNER_OPEN_REF", rec.spellId, "/ownerOpen/" + j, "no Owner question " + n.question + (n.item ? " item " + n.item : "") + " in tuning.json ownerQuestions");
            // Q3/Q4: a primitive that would exist only under a "yes" answer stays out of the effect data.
            if (n.primitiveIfYes && (n.question === "Q3" || n.question === "Q4") && instancesOf(rec).some(fx => fx.primitive === n.primitiveIfYes)) {
                add("OWNER_OPEN_REF", rec.spellId, "/ownerOpen/" + j, n.primitiveIfYes + " would exist only under a yes answer to " + n.question + " but the record already has it");
            }
        });
        walk(rec, "", (v, k, p) => {
            if (v && typeof v === "object" && typeof v.ownerOpen === "string" && !known(v.ownerOpen, v.item)) add("OWNER_OPEN_REF", rec.spellId, p, "no Owner question " + v.ownerOpen + " item " + v.item + " in tuning.json ownerQuestions");
        });
    }
}

function ruleCatalogue(data, add) {
    const meta = data.audit.meta;
    const cat = ((data.primitives || {}).primitives) || [];
    const names = cat.map(p => p.name);
    const enumNames = (((data.schema || {}).$defs || {}).primitive || {}).enum || [];
    const auditNames = Object.keys(meta.primitiveSystems);
    const same = (a, b) => a.slice().sort().join(",") === b.slice().sort().join(",");
    if (!same(names, auditNames)) add("CATALOGUE_MISMATCH", FILES.primitives, "/primitives", "catalogue names differ from audit meta.primitiveSystems");
    if (!same(enumNames, auditNames)) add("CATALOGUE_MISMATCH", FILES.schema, "/$defs/primitive/enum", "schema primitive enum differs from audit meta.primitiveSystems");
    cat.forEach((p, i) => {
        if (!meta.primitiveSystems[p.name]) return;
        if (!same(p.systems || [], meta.primitiveSystems[p.name])) add("CATALOGUE_MISMATCH", FILES.primitives, "/primitives/" + i + "/systems", p.name + " systems differ from the audit");
        if (!same(p.wbs || [], meta.primitiveWbs[p.name] || [])) add("CATALOGUE_MISMATCH", FILES.primitives, "/primitives/" + i + "/wbs", p.name + " WBS rows differ from the audit");
        if (!same(p.auditGaps || [], meta.primitiveGaps[p.name] || [])) add("CATALOGUE_MISMATCH", FILES.primitives, "/primitives/" + i + "/auditGaps", p.name + " gaps differ from the audit");
        const a = p.adr186 || {};
        if (!(a.status === "MAPPED" && a.row && a.coreSystem) && !(a.status === "NO_ROW" && a.row === null && Array.isArray(p.adrGaps) && p.adrGaps.length)) add("CATALOGUE_MISMATCH", FILES.primitives, "/primitives/" + i + "/adr186", p.name + " must map to an ADR-003 18.6 row or be listed as a gap");
    });
}

function ruleBaselineFresh(data, add) {
    const want = baselineText(data);
    const have = stringify(data.baseline) + "\n";
    if (want !== have) add("BASELINE_STALE", FILES.baseline, "/", "srd_baseline.json differs from the baseline rebuilt from the audit JSON and spells.json (sha256 " + sha256(have).slice(0, 12) + " vs " + sha256(want).slice(0, 12) + ")");
    const cc = (data.baseline && data.baseline.crossCheck) || {};
    if ((cc.mismatches || []).length || (cc.quoteMisses || []).length) add("BASELINE_STALE", FILES.baseline, "/crossCheck", "the audit JSON and spells.json disagree; see crossCheck (never fixed silently)");
}

const RULES = [
    ruleSchema, ruleCoverage, ruleSystems, rulePrimitiveKnown, rulePrimitiveSystem, rulePrimitiveCoverage, ruleKeys, ruleVariants,
    ruleSrdQuotes, ruleSrdRefs, ruleSrdNumberCopied, ruleSrdFieldLiteral, ruleNoTickLiterals, ruleSecondsPerTickOpen,
    ruleLedgerCause, ruleLedgerNames, ruleLedgerClasses, ruleLedgerRows, ruleNoOre, ruleSourceScope, ruleLedgerMode,
    ruleTuningRefs, ruleOwnerOpen, ruleCatalogue, ruleBaselineFresh
];

function validateAll(data) {
    const errors = [];
    const add = (code, who, where, message) => errors.push({ code, who, path: where || "/", message });
    for (const rule of RULES) {
        try { rule(data, add); } catch (e) { add("RULE_CRASH", rule.name, "/", e && e.stack ? e.stack.split("\n").slice(0, 3).join(" | ") : String(e)); }
    }
    return errors;
}

// ---------------------------------------------------------------------------------------------------------------
// Fixtures: a JSON patch applied to an in-memory copy of the data (tools/spells/fixtures/*.json)
// ---------------------------------------------------------------------------------------------------------------

function locate(root, segs) {
    let node = root;
    for (const s of segs) {
        if (node === undefined || node === null) throw new Error("fixture path not found at " + s);
        if (Array.isArray(node) && s.startsWith("@")) {
            const want = s.slice(1);
            const hit = node.find(x => x && (x.key === want || x.spellId === want || x.id === want || x.name === want));
            if (!hit) throw new Error("fixture path: no element " + s);
            node = hit;
        } else node = node[Array.isArray(node) ? Number(s) : s];
    }
    return node;
}
function applyFixture(data, fixture) {
    const out = Object.assign({}, data);
    for (const k of ["schema", "effects", "baseline", "tuning", "primitives"]) out[k] = clone(data[k]);
    for (const op of fixture.patch) {
        const target = out[op.file];
        if (target === undefined) throw new Error("fixture: unknown file " + op.file);
        const segs = op.path.split("/").filter(Boolean);
        const last = segs.pop();
        const parent = locate(target, segs);
        const key = Array.isArray(parent) && !last.startsWith("@") ? Number(last) : last;
        if (op.op === "set") {
            if (Array.isArray(parent) && last.startsWith("@")) parent[parent.indexOf(locate(parent, [last]))] = clone(op.value);
            else parent[key] = clone(op.value);
        } else if (op.op === "delete") {
            if (Array.isArray(parent)) parent.splice(last.startsWith("@") ? parent.indexOf(locate(parent, [last])) : key, 1);
            else delete parent[key];
        } else if (op.op === "push") {
            locate(parent, [last]).push(clone(op.value));
        } else throw new Error("fixture: unknown op " + op.op);
    }
    return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Summary and command line
// ---------------------------------------------------------------------------------------------------------------

function summary(data) {
    const recs = recordsOf(data);
    const byPrim = {}, byMode = {}, byBasis = {};
    let n = 0;
    for (const r of recs) for (const fx of instancesOf(r)) {
        n++;
        byPrim[fx.primitive] = (byPrim[fx.primitive] || 0) + 1;
        byMode[ledgerOf(fx).mode] = (byMode[ledgerOf(fx).mode] || 0) + 1;
        byBasis[fx.basis] = (byBasis[fx.basis] || 0) + 1;
    }
    return { records: recs.length, instances: n, byPrimitive: byPrim, byLedgerMode: byMode, byBasis };
}

function printErrors(errors) {
    for (const e of errors) console.log("ERROR " + e.code + " " + e.who + " " + e.path + " - " + e.message);
}

function main(argv) {
    if (argv.includes("--write-baseline") || argv.includes("--check")) return mainBaseline(argv, loadSources());
    const data = loadData();
    let run = data, label = "committed data";
    const fi = argv.indexOf("--fixture");
    if (fi >= 0) {
        const file = argv[fi + 1];
        const fixture = JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
        run = applyFixture(data, fixture);
        label = "fixture " + fixture.name + " (expects " + fixture.expect.join(", ") + ")";
    }
    const errors = validateAll(run);
    const s = summary(run);
    console.log("validated " + label + ": " + s.records + " effect records, " + s.instances + " primitive instances, " + RULES.length + " rule groups");
    console.log("by basis " + JSON.stringify(s.byBasis) + "; by ledger mode " + JSON.stringify(s.byLedgerMode));
    printErrors(errors);
    const codes = {};
    for (const e of errors) codes[e.code] = (codes[e.code] || 0) + 1;
    console.log("errors " + errors.length + (errors.length ? " " + JSON.stringify(codes) : ""));
    return errors.length ? 1 : 0;
}

function mainBaseline(argv, data) {
    if (argv.includes("--write-baseline")) {
        const text = baselineText(data);
        fs.writeFileSync(path.join(ROOT, FILES.baseline), text);
        console.log("wrote " + FILES.baseline + " sha256 " + sha256(text) + " bytes " + Buffer.byteLength(text));
        return 0;
    }
    if (argv.includes("--check")) {
        const want = baselineText(data);
        const raw = fs.readFileSync(path.join(ROOT, FILES.baseline), "utf8");
        const bytesEqual = raw === want;
        const lfEqual = raw.replace(/\r\n/g, "\n") === want;
        console.log("rebuilt " + FILES.baseline + " from " + FILES.audit + " + " + FILES.spells + " + " + FILES.rules);
        console.log("rebuilt sha256 " + sha256(want) + " bytes " + Buffer.byteLength(want));
        console.log("committed sha256 " + sha256(raw) + " bytes " + Buffer.byteLength(raw));
        console.log("bytes identical: " + bytesEqual + (bytesEqual ? "" : "; identical after folding CRLF to LF: " + lfEqual));
        const b = JSON.parse(want);
        console.log("baseline spells " + b.counts.baselineSpells + ", measures " + b.counts.measures + ", audit/spells.json fields compared " +
            b.crossCheck.fieldsCompared + ", mismatches " + b.crossCheck.mismatches.length + ", quotes checked " + b.crossCheck.quotesChecked + ", quote misses " + b.crossCheck.quoteMisses.length);
        if (!lfEqual) { console.log("ERROR BASELINE_STALE " + FILES.baseline + " / - committed file differs from the rebuild; run --write-baseline only if the inputs changed on purpose"); return 1; }
        return 0;
    }
    return 1;
}

module.exports = { FILES, ROOT, RULES, loadSources, loadData, buildBaseline, baselineText, stringify, validateAll, applyFixture, summary,
    schemaValidate, extractMeasures, resolveSrdRef, sha256 };

if (require.main === module) process.exit(main(process.argv.slice(2)));
