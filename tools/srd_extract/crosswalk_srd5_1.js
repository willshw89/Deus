// tools/srd_extract/crosswalk_srd5_1.js - record-level crosswalk between the two SRD 5.1 data folders.
//
// Usage: node tools/srd_extract/crosswalk_srd5_1.js [--out <json file>]
//
// Reads (never writes) the legacy folder game/data/srd5_1/ (15 files, 2026-09-21) and the dormant
// catalogue game/data/srd51/ (catalogue_manifest.json plus six category files, 2026-09-22), matches
// every legacy record to a catalogue entry, compares the facts field by field, classifies each legacy
// record into exactly one of six classes, and writes tools/srd_extract/reports/crosswalk_srd5_1.json.
// The human report is docs/SRD_CATALOGUE_CROSSWALK.md.
//
// Deterministic: the output depends only on the two folders (their SHA-256 digests are recorded in
// the report); no timestamps. Name matching uses slugify/stableId/toPlain from lib/srd_text.js so a
// legacy name maps to the id the catalogue assembler would have given it. Nothing here edits either
// folder, renames or aliases an id in place, or touches game/.
//
// Classes (docs/SRD_CATALOGUE_CROSSWALK.md section 2 states the rules in full):
//   1 equivalent, 2 more complete in the new catalogue, 3 legacy carries DEUS-specific fields,
//   4 split or merged representation, 5 conflicting SRD fact (page cited), 6 missing or unresolved.
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { slugify, stableId, toPlain } = require("./lib/srd_text.js");

const ROOT = path.resolve(__dirname, "..", "..");
const LEGACY_DIR = path.join(ROOT, "game", "data", "srd5_1");
const NEW_DIR = path.join(ROOT, "game", "data", "srd51");
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback; };
const OUT_FILE = path.resolve(opt("--out", path.join(__dirname, "reports", "crosswalk_srd5_1.json")));

const LEGACY_FILES = [
    "abilities.json", "armor.json", "classes_reference.json", "combat_actions.json", "conditions.json",
    "damage_types.json", "magic_items_reference.json", "monsters_reference.json", "rules_reference.json",
    "skills.json", "species_reference.json", "spells.json", "tools.json", "weapon_properties.json", "weapons.json"
];
const NEW_FILES = ["catalogue_manifest.json", "character_options.json", "creatures.json", "equipment.json", "magic_items.json", "rules.json", "spells.json"];

const CLASS_LABELS = {
    1: "equivalent",
    2: "more complete in the new catalogue",
    3: "contains DEUS-specific fields or overrides",
    4: "split or merged representation",
    5: "conflicting",
    6: "missing or unresolved"
};
const ABILITY_NAMES = { str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", wis: "Wisdom", cha: "Charisma" };

// ---------------------------------------------------------------------------------------------
// Input loading
// ---------------------------------------------------------------------------------------------
const inputs = {};
function loadJson(dir, file, relName) {
    const full = path.join(dir, file);
    const raw = fs.readFileSync(full);
    inputs[relName] = { sha256: crypto.createHash("sha256").update(raw).digest("hex"), bytes: raw.length };
    return JSON.parse(raw.toString("utf8"));
}
const legacy = {};
for (const f of LEGACY_FILES) legacy[f] = loadJson(LEGACY_DIR, f, "game/data/srd5_1/" + f);
const cat = {};
for (const f of NEW_FILES) cat[f] = loadJson(NEW_DIR, f, "game/data/srd51/" + f);

const newEntries = [];
for (const f of NEW_FILES) if (f !== "catalogue_manifest.json") for (const e of cat[f].entries) newEntries.push(e);
const newById = new Map(newEntries.map(e => [e.id, e]));
const newByKind = new Map();
for (const e of newEntries) {
    if (!newByKind.has(e.kind)) newByKind.set(e.kind, []);
    newByKind.get(e.kind).push(e);
}
if (newById.size !== newEntries.length) throw new Error("duplicate ids in the new catalogue");

// ---------------------------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------------------------
/** Fold a value for comparison: ASCII punctuation, one hyphen for any run, lower case, single spaces. */
function nz(v) {
    if (v === null || v === undefined) return "";
    return toPlain(String(v).replace(/½/g, ".5"))
        .toLowerCase()
        .replace(/-+/g, "-")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\.$/, "");
}
/** Strict name key for the "exact name" method: typographic punctuation folded, case and spacing ignored, hyphen runs kept (so hyphen artifacts fall through to the slug method). */
function nameKey(name) { return toPlain(String(name)).toLowerCase().replace(/\s+/g, " ").trim(); }
function parseCost(s) {
    if (s === null || s === undefined) return null;
    const m = /^\s*([\d,]+(?:\.\d+)?)\s*(cp|sp|ep|gp|pp)\s*$/i.exec(String(s));
    if (!m) return { text: String(s).trim() };
    return { amount: parseFloat(m[1].replace(/,/g, "")), unit: m[2].toLowerCase() };
}
function sameCost(a, b) {
    if (!a || !b) return a === b;
    if (a.text !== undefined || b.text !== undefined) return nz(a.text) === nz(b.text);
    return a.amount === b.amount && a.unit === b.unit;
}
function typeLine(entry) {
    // The second paragraph of a magic item or creature text is the printed type/size line.
    const parts = String(entry.text).split(/\n\s*\n/);
    return parts.length > 1 ? parts[1].trim() : "";
}
function sha(s) { return crypto.createHash("sha256").update(s).digest("hex"); }

// ---------------------------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------------------------
/** Legacy names that are the same record under another printed name. Documented in the report. */
const ALIASES = {
    subrace: { "lightfoot-halfling": "srd:subrace:lightfoot" }
};
const kindNameIndex = new Map();
function indexKind(kind) {
    if (kindNameIndex.has(kind)) return kindNameIndex.get(kind);
    const byName = new Map();
    for (const e of newByKind.get(kind) || []) {
        const k = nameKey(e.name);
        if (!byName.has(k)) byName.set(k, []);
        byName.get(k).push(e);
    }
    kindNameIndex.set(kind, byName);
    return byName;
}
function matchByName(name, kind) {
    const byName = indexKind(kind);
    const exact = byName.get(nameKey(name));
    if (exact && exact.length === 1) return { entry: exact[0], method: "exact name" };
    let id;
    try { id = stableId(kind, name); } catch (e) { id = null; }
    if (id && newById.has(id) && newById.get(id).kind === kind) return { entry: newById.get(id), method: "slug" };
    const alias = ALIASES[kind] && ALIASES[kind][slugify(name)];
    if (alias && newById.has(alias)) return { entry: newById.get(alias), method: "alias" };
    return { entry: null, method: "none" };
}
function manual(id, relation, related) {
    const entry = newById.get(id);
    if (!entry) throw new Error("manual table names an id that is not in the catalogue: " + id);
    return { entry, method: "manual table", relation: relation || "one-to-one", related: related || [] };
}

// ---------------------------------------------------------------------------------------------
// Record model
// ---------------------------------------------------------------------------------------------
const records = [];
function rec(file, key, lpath, name, page, hasIdField) {
    const r = {
        legacyFile: file,
        legacyKey: key,
        legacyPath: lpath,
        legacyName: name,
        legacyPage: page === undefined ? null : page,
        legacyHasIdField: !!hasIdField,
        matchedNewId: null,
        matchedNewName: null,
        newPages: null,
        relatedNewIds: [],
        matchMethod: "none",
        relation: "none",
        classification: null,
        classLabel: null,
        classificationIfKeyIsDeusField: null,
        differences: {
            sameFields: [],
            representation: [],
            legacyMissingValue: [],
            deusFields: [],
            newOnly: [],
            conflicts: [],
            pageCitation: null,
            notes: []
        }
    };
    records.push(r);
    return r;
}
function attach(r, m, relation) {
    if (!m || !m.entry) { r.matchMethod = m ? m.method : "none"; return null; }
    r.matchedNewId = m.entry.id;
    r.matchedNewName = m.entry.name;
    r.newPages = m.entry.source.pages.slice();
    r.matchMethod = m.method;
    r.relation = relation || m.relation || "one-to-one";
    if (m.related) r.relatedNewIds = m.related.slice();
    if (nz(r.legacyName) !== nz(m.entry.name)) r.differences.representation.push({ field: "name", legacy: r.legacyName, new: m.entry.name });
    else if (String(r.legacyName) !== String(m.entry.name)) r.differences.representation.push({ field: "name", legacy: r.legacyName, new: m.entry.name, note: "typographic punctuation or hyphen artifact" });
    return m.entry;
}
function same(r, field) { r.differences.sameFields.push(field); }
function repr(r, field, legacyVal, newVal, note) { const o = { field, legacy: legacyVal, new: newVal }; if (note) o.note = note; r.differences.representation.push(o); }
function missing(r, field, newVal) { r.differences.legacyMissingValue.push({ field, new: newVal }); }
function deus(r, field, value, note) { const o = { field, value }; if (note) o.note = note; r.differences.deusFields.push(o); }
function newOnly(r, field) { r.differences.newOnly.push(field); }
function conflict(r, field, legacyVal, newVal, pages, note) { const o = { field, legacy: legacyVal, new: newVal, pages }; if (note) o.note = note; r.differences.conflicts.push(o); }
function note(r, text) { r.differences.notes.push(text); }
function cite(r, legacyPage, entry) {
    if (legacyPage === null || legacyPage === undefined || !entry) return;
    const pages = entry.source.pages;
    r.differences.pageCitation = { legacy: legacyPage, new: pages.slice(), agrees: pages.includes(legacyPage) };
}
/** Compare a fact: identical -> same; equal after folding -> representation; else conflict. */
function fact(r, field, legacyVal, newVal, entry, opts) {
    opts = opts || {};
    const a = legacyVal, b = newVal;
    if (opts.legacyEmpty && (a === "" || a === null || a === undefined)) { missing(r, field, b); return; }
    if (JSON.stringify(a) === JSON.stringify(b)) { same(r, field); return; }
    const fa = opts.fold ? opts.fold(a) : nz(a), fb = opts.fold ? opts.fold(b) : nz(b);
    if (fa === fb) { repr(r, field, a, b, opts.note); return; }
    if (opts.prefixOk && fb.startsWith(fa) && fa.length >= 8) { repr(r, field, a, b, "legacy value truncated; the new value is the full printed text"); return; }
    conflict(r, field, a, b, entry ? entry.source.pages.slice() : null, opts.note);
}
function classify(r) {
    const d = r.differences;
    let c;
    if (!r.matchedNewId) c = r.deusOnly ? 3 : 6;
    else if (d.conflicts.length) c = 5;
    else if (r.relation === "many-to-one" || r.relation === "one-to-many") c = 4;
    else if (d.deusFields.length) c = 3;
    else if (d.newOnly.length || d.legacyMissingValue.length) c = 2;
    else c = 1;
    r.classification = c;
    r.classLabel = CLASS_LABELS[c];
    r.classificationIfKeyIsDeusField = (c === 1 || c === 2) && r.legacyHasIdField ? 3 : c;
    return c;
}

// ---------------------------------------------------------------------------------------------
// Catalogue text probes (facts the legacy digests are checked against)
// ---------------------------------------------------------------------------------------------
const R = id => { const e = newById.get(id); if (!e) throw new Error("missing catalogue entry " + id); return e; };
const usingAbility = R("srd:rule:using-ability-scores");
const abilityChecks = R("srd:rule:using-ability-scores-ability-checks");
const abilityPhrases = {};
for (const m of usingAbility.text.matchAll(/•\s*(\w+),\s*(measuring [^\n]+)/g)) abilityPhrases[m[1]] = m[2].trim();
const skillsByAbility = (() => {
    const t = abilityChecks.text;
    const start = t.indexOf("(No skills are related to Constitution.)");
    const end = t.indexOf("Sometimes, the GM might ask");
    const seg = t.slice(start, end);
    const out = {};
    let cur = null;
    for (const line of seg.split("\n").map(l => l.trim()).filter(Boolean)) {
        if (/^(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)$/.test(line)) { cur = line; out[cur] = []; }
        else if (cur && /^•\s*/.test(line)) out[cur].push(line.replace(/^•\s*/, "").trim());
    }
    out.Constitution = out.Constitution || [];
    return out;
})();
const skillNameById = new Map(legacy["skills.json"].skills.map(s => [s.id, s.name]));

// ---------------------------------------------------------------------------------------------
// abilities.json
// ---------------------------------------------------------------------------------------------
(function abilities() {
    const file = "abilities.json";
    const d = legacy[file];
    d.abilities.forEach((a, i) => {
        const r = rec(file, a.id, "abilities[" + i + "]", a.name, d.metadata.sourcePage, true);
        const e = attach(r, manual("srd:rule:using-ability-scores", "many-to-one", ["srd:rule:using-ability-scores-using-each-ability"]));
        if (abilityPhrases[a.name]) same(r, "name (listed on the page)");
        else conflict(r, "name", a.name, Object.keys(abilityPhrases), e.source.pages.slice(), "ability not found in the six-ability list");
        const src = abilityPhrases[a.name] || "";
        if (nz(a.description) === nz(src)) same(r, "description");
        else deus(r, "description", a.description, "paraphrase; the page reads \"" + src + "\"");
        deus(r, "abbreviation", a.abbreviation, "not printed as a field on the page");
        const want = (skillsByAbility[a.name] || []).map(nz).sort();
        const have = (a.defaultSkills || []).map(id => nz(skillNameById.get(id) || id)).sort();
        if (JSON.stringify(want) === JSON.stringify(have)) same(r, "defaultSkills (skills list, page 77)");
        else conflict(r, "defaultSkills", a.defaultSkills, skillsByAbility[a.name], abilityChecks.source.pages.slice());
        cite(r, d.metadata.sourcePage, e);
        newOnly(r, "text (full ability rules, pages 76 and 79-83)");
    });
    // modifierFormula
    {
        const r = rec(file, "modifierFormula", "modifierFormula", "Ability modifier formula", d.metadata.sourcePage, false);
        const e = attach(r, manual("srd:table:ability-scores-and-modifiers", "one-to-one", ["srd:rule:using-ability-scores-ability-scores-and-modifiers"]));
        const bad = [];
        for (const [score, mod] of e.data.rows) {
            const m = /^(\d+)(?:-(\d+))?$/.exec(nz(score));
            const lo = parseInt(m[1], 10), hi = m[2] ? parseInt(m[2], 10) : lo;
            for (let s = lo; s <= hi; s++) if (Math.floor((s - 10) / 2) !== parseInt(mod, 10)) bad.push({ score: s, table: mod, formula: Math.floor((s - 10) / 2) });
        }
        if (bad.length) conflict(r, "modifierFormula", d.modifierFormula, e.data.rows, e.source.pages.slice(), JSON.stringify(bad));
        else repr(r, "modifierFormula", d.modifierFormula, "table of 16 score ranges (pages 76)", "the formula reproduces every row of the table");
        cite(r, d.metadata.sourcePage, e);
    }
    // standardDCLadder
    {
        const r = rec(file, "standardDCLadder", "standardDCLadder", "Typical Difficulty Classes", 77, false);
        const e = attach(r, manual("srd:table:typical-difficulty-classes", "one-to-one"));
        const want = e.data.rows.map(([k, v]) => nz(k) + "=" + v);
        const have = d.standardDCLadder.map(x => nz(x.difficulty) + "=" + x.dc);
        if (JSON.stringify(want) === JSON.stringify(have)) {
            if (JSON.stringify(e.data.rows.map(x => x[0])) === JSON.stringify(d.standardDCLadder.map(x => x.difficulty))) same(r, "rows");
            else repr(r, "rows", d.standardDCLadder.map(x => x.difficulty), e.data.rows.map(x => x[0]), "capitalisation only");
        } else conflict(r, "rows", have, want, e.source.pages.slice());
        cite(r, 77, e);
    }
})();

// ---------------------------------------------------------------------------------------------
// skills.json
// ---------------------------------------------------------------------------------------------
(function skills() {
    const file = "skills.json";
    const d = legacy[file];
    d.skills.forEach((s, i) => {
        const r = rec(file, s.id, "skills[" + i + "]", s.name, s.sourcePage, true);
        const e = attach(r, manual("srd:rule:using-ability-scores-ability-checks", "many-to-one", ["srd:rule:using-ability-scores-using-each-ability"]));
        const abil = ABILITY_NAMES[s.defaultAbility];
        const listed = (skillsByAbility[abil] || []).map(nz);
        if (listed.includes(nz(s.name))) same(r, "defaultAbility (skills list, page 77)");
        else {
            const under = Object.keys(skillsByAbility).find(k => skillsByAbility[k].map(nz).includes(nz(s.name)));
            conflict(r, "defaultAbility", s.defaultAbility, under || null, e.source.pages.slice());
        }
        deus(r, "category", s.category, "DEUS grouping (physical, mental, practical, social); the source has none");
        cite(r, s.sourcePage, e);
        newOnly(r, "text (skill descriptions under each ability, pages 79-83)");
    });
})();

// ---------------------------------------------------------------------------------------------
// combat_actions.json
// ---------------------------------------------------------------------------------------------
(function combatActions() {
    const file = "combat_actions.json";
    const d = legacy[file];
    const e0 = R("srd:rule:combat-actions-in-combat");
    d.actions.forEach((a, i) => {
        const r = rec(file, a.id, "actions[" + i + "]", a.name, a.sourcePage, true);
        const e = attach(r, manual("srd:rule:combat-actions-in-combat", "many-to-one"));
        if (e0.text.includes("\n" + a.name + "\n")) same(r, "name (heading present)");
        else conflict(r, "name", a.name, null, e.source.pages.slice(), "no such heading in Actions in Combat");
        deus(r, "description", a.description, "one-line paraphrase; the source paragraph is in the matched rule text");
        cite(r, a.sourcePage, e);
        newOnly(r, "text (full action rules)");
    });
})();

// ---------------------------------------------------------------------------------------------
// damage_types.json
// ---------------------------------------------------------------------------------------------
(function damageTypes() {
    const file = "damage_types.json";
    const d = legacy[file];
    const e0 = R("srd:rule:combat-damage-and-healing");
    const seg = e0.text.slice(e0.text.indexOf("Damage Types"), e0.text.indexOf("Damage Resistance and Vulnerability"));
    d.damageTypes.forEach((t, i) => {
        const r = rec(file, t.id, "damageTypes[" + i + "]", t.name, d.metadata.sourcePage, true);
        const e = attach(r, manual("srd:rule:combat-damage-and-healing", "many-to-one"));
        const m = new RegExp("\\n" + t.name + "\\. ([^\\n]+)").exec(seg);
        if (m) same(r, "name (listed under Damage Types)");
        else conflict(r, "name", t.name, null, e.source.pages.slice(), "not listed under Damage Types");
        deus(r, "description", t.description, m ? "paraphrase; the page reads \"" + m[1] + "\"" : "paraphrase");
        cite(r, d.metadata.sourcePage, e);
        newOnly(r, "text (damage type examples and the resistance rules)");
    });
})();

// ---------------------------------------------------------------------------------------------
// weapon_properties.json
// ---------------------------------------------------------------------------------------------
(function weaponProperties() {
    const file = "weapon_properties.json";
    const d = legacy[file];
    const e0 = R("srd:rule:equipment-weapon-properties");
    const weapons = newByKind.get("weapon");
    d.properties.forEach((p, i) => {
        const r = rec(file, p.id, "properties[" + i + "]", p.name, p.sourcePage, true);
        const carriers = weapons.filter(w => w.data.properties.some(x => nz(x.name) === nz(p.name) || (nz(p.name) === "range" && x.detail && /range/.test(x.detail)))).map(w => w.id);
        const e = attach(r, manual("srd:rule:equipment-weapon-properties", "many-to-one", carriers));
        if (new RegExp("\\n" + p.name.replace(/-/g, "-") + "\\. ").test(e0.text)) same(r, "name (property paragraph present)");
        else conflict(r, "name", p.name, null, e.source.pages.slice(), "no such property paragraph");
        deus(r, "description", p.description, "paraphrase; the source paragraph is in the matched rule text");
        cite(r, p.sourcePage, e);
        newOnly(r, "text (full property rules); the property is also carried by " + carriers.length + " weapon entries");
    });
})();

// ---------------------------------------------------------------------------------------------
// conditions.json
// ---------------------------------------------------------------------------------------------
(function conditions() {
    const file = "conditions.json";
    const d = legacy[file];
    const exh = R("srd:table:exhaustion");
    d.conditions.forEach((c, i) => {
        const r = rec(file, c.id, "conditions[" + i + "]", c.name, d.metadata.sourcePage, true);
        const e = attach(r, matchByName(c.name, "condition"));
        if (!e) return;
        for (const k of Object.keys(c)) {
            if (k === "id" || k === "name") continue;
            if (k === "levels") {
                const want = exh.data.rows.map(([l, t]) => l + ":" + nz(t));
                const have = c.levels.map(x => x.level + ":" + nz(x.effect));
                if (JSON.stringify(want) === JSON.stringify(have)) same(r, "levels (Exhaustion table)");
                else conflict(r, "levels", c.levels, exh.data.rows, exh.source.pages.slice());
                r.relatedNewIds.push(exh.id);
                continue;
            }
            if (k === "hasLevels" || k === "maxLevels") { repr(r, k, c[k], exh.data.rows.length + " rows in the Exhaustion table", "representation of the table"); continue; }
            deus(r, k, c[k], "machine-readable rule flag; not an SRD field");
        }
        cite(r, d.metadata.sourcePage, e);
        newOnly(r, "data.effects (the printed bullets) and text");
        note(r, "flag semantics were read against the printed bullets by the author, not checked by this script");
    });
})();

// ---------------------------------------------------------------------------------------------
// classes_reference.json
// ---------------------------------------------------------------------------------------------
(function classes() {
    const file = "classes_reference.json";
    const d = legacy[file];
    d.classes.forEach((c, i) => {
        const r = rec(file, c.id, "classes[" + i + "]", c.name, c.sourcePage, true);
        const e = attach(r, matchByName(c.name, "class"));
        if (!e) return;
        fact(r, "hitDie", c.hitDie, e.data.hitDie, e, { fold: v => nz(String(v).replace(/^1d/, "")) });
        fact(r, "savingThrows", c.savingThrows, e.data.savingThrows, e, { fold: v => v.map(x => nz(ABILITY_NAMES[x] || x)).sort().join(",") });
        deus(r, "primaryAbility", c.primaryAbility, "the SRD 5.1 class descriptions carry no primary-ability field or Quick Build text; DEUS-derived");
        cite(r, c.sourcePage, e);
        for (const k of ["hitPoints", "proficiencies", "startingEquipment", "classTable", "features", "subclasses"]) newOnly(r, "data." + k);
        newOnly(r, "text");
    });
    {
        const r = rec(file, "standardProficiencyBonusByLevel", "standardProficiencyBonusByLevel", "Proficiency bonus by level", 56, false);
        const e = attach(r, manual("srd:rule:beyond-1st-level", "one-to-one", ["srd:rule:using-ability-scores-proficiency-bonus"]));
        const table = e.data.tables.find(t => /Character Advancement/.test(t.caption));
        const want = {};
        for (const row of table.rows) want[parseInt(row[1], 10)] = parseInt(row[2].replace("+", ""), 10);
        const bad = [];
        for (const tier of d.standardProficiencyBonusByLevel) for (const lv of tier.levels) if (want[lv] !== tier.bonus) bad.push({ level: lv, legacy: tier.bonus, table: want[lv] });
        if (bad.length) conflict(r, "standardProficiencyBonusByLevel", d.standardProficiencyBonusByLevel, table.rows, e.source.pages.slice(), JSON.stringify(bad));
        else repr(r, "standardProficiencyBonusByLevel", "5 tiers", "Character Advancement table, 20 rows", "same bonus at every level");
        newOnly(r, "experience points column and the multiclassing text");
        cite(r, 56, e);
    }
})();

// ---------------------------------------------------------------------------------------------
// species_reference.json
// ---------------------------------------------------------------------------------------------
(function species() {
    const file = "species_reference.json";
    const d = legacy[file];
    d.species.forEach((s, i) => {
        const r = rec(file, s.id, "species[" + i + "]", s.name, s.sourcePage, true);
        const e = attach(r, matchByName(s.name, "race"));
        if (!e) return;
        fact(r, "size", s.size, e.data.size, e);
        fact(r, "speedFeet", s.speedFeet, e.data.speed, e);
        const dv = (e.data.traits || []).find(t => t.name === "Darkvision");
        const m = dv && /within (\d+) feet/.exec(dv.text);
        const newDv = m ? parseInt(m[1], 10) : 0;
        if (s.darkvisionFeet === newDv) { if (newDv === 0) repr(r, "darkvisionFeet", 0, "no Darkvision trait", "0 encodes the absence of the trait"); else same(r, "darkvisionFeet"); }
        else conflict(r, "darkvisionFeet", s.darkvisionFeet, dv ? dv.text : "no Darkvision trait", e.source.pages.slice());
        const want = (e.data.subraces || []).map(nz).sort();
        const have = (s.subraces || []).map(x => { const a = ALIASES.subrace[slugify(x.name)]; return nz(a ? newById.get(a).name : x.name); }).sort();
        if (JSON.stringify(want) === JSON.stringify(have)) {
            if (JSON.stringify((s.subraces || []).map(x => x.name).sort()) === JSON.stringify((e.data.subraces || []).slice().sort())) same(r, "subraces");
            else repr(r, "subraces", (s.subraces || []).map(x => x.name), e.data.subraces, "printed heading differs (alias)");
        } else conflict(r, "subraces", (s.subraces || []).map(x => x.name), e.data.subraces, e.source.pages.slice());
        cite(r, s.sourcePage, e);
        for (const k of ["traits", "abilityScoreIncrease", "languages"]) newOnly(r, "data." + k);
        newOnly(r, "text");
        (s.subraces || []).forEach((sub, j) => {
            const rs = rec(file, sub.id, "species[" + i + "].subraces[" + j + "]", sub.name, s.sourcePage, true);
            const es = attach(rs, matchByName(sub.name, "subrace"));
            if (!es) return;
            fact(rs, "parent", s.name, es.data.parent, es);
            cite(rs, s.sourcePage, es);
            for (const k of ["traits", "abilityScoreIncrease", "size", "speed", "languages"]) newOnly(rs, "data." + k);
            newOnly(rs, "text");
        });
    });
})();

// ---------------------------------------------------------------------------------------------
// tools.json
// ---------------------------------------------------------------------------------------------
(function tools() {
    const file = "tools.json";
    const d = legacy[file];
    const GROUP = { artisan_tools: "Artisan’s tools", gaming_set: "Gaming set", musical_instrument: "Musical instrument" };
    d.tools.forEach((t, i) => {
        const r = rec(file, t.id, "tools[" + i + "]", t.name, t.sourcePage, true);
        const e = attach(r, matchByName(t.name, "tool"));
        if (!e) return;
        const lc = parseCost(t.costSRD);
        if (sameCost(lc, e.data.cost)) { if (JSON.stringify(lc) === JSON.stringify(e.data.cost)) repr(r, "cost", t.costSRD, e.data.cost, "string vs structured"); else repr(r, "cost", t.costSRD, e.data.cost, "the table prints " + JSON.stringify(e.data.cost.text)); }
        else conflict(r, "cost", t.costSRD, e.data.cost, e.source.pages.slice());
        const nw = e.data.weight && e.data.weight.lb;
        if (t.weightSRD === nw) same(r, "weight");
        else if ((nw === null || nw === undefined) && t.weightSRD === 0) repr(r, "weight", 0, e.data.weight, "0 stands for a blank cell (the table prints no weight)");
        else conflict(r, "weight", t.weightSRD, e.data.weight, e.source.pages.slice());
        if (GROUP[t.category] !== undefined) {
            if (nz(GROUP[t.category]) === nz(e.data.group)) repr(r, "category", t.category, e.data.group, "group label");
            else conflict(r, "category", t.category, e.data.group, e.source.pages.slice());
        } else deus(r, "category", t.category, "DEUS grouping; the tools table has no such group (the row is ungrouped: group " + JSON.stringify(e.data.group) + ")");
        cite(r, t.sourcePage, e);
        if (e.data.description) newOnly(r, "data.description");
        if (e.data.groupDescription) newOnly(r, "data.groupDescription");
        newOnly(r, "text");
    });
})();

// ---------------------------------------------------------------------------------------------
// armor.json
// ---------------------------------------------------------------------------------------------
(function armor() {
    const file = "armor.json";
    const d = legacy[file];
    d.armor.forEach((a, i) => {
        const r = rec(file, a.id, "armor[" + i + "]", a.name, a.sourcePage, true);
        const e = attach(r, matchByName(a.name, "armor"));
        if (!e) return;
        fact(r, "category", a.category, e.data.armorCategory, e);
        if (a.category === "shield") {
            if (a.isBonusAC === true && a.baseAC === e.data.ac.bonus && e.data.ac.base === 0) repr(r, "baseAC/isBonusAC", { baseAC: a.baseAC, isBonusAC: true }, e.data.ac, "shield bonus");
            else conflict(r, "baseAC", a.baseAC, e.data.ac, e.source.pages.slice());
        } else fact(r, "baseAC", a.baseAC, e.data.ac.base, e);
        fact(r, "dexContribution", a.dexContribution, e.data.ac.dexModifier, e);
        const derivedMax = { full: null, max2: 2, none: 0 }[e.data.ac.dexModifier];
        if (a.maxDexContribution === derivedMax || (a.category === "shield" && a.maxDexContribution === null)) repr(r, "maxDexContribution", a.maxDexContribution, e.data.ac.dexModifier, "derived from the Dex rule");
        else conflict(r, "maxDexContribution", a.maxDexContribution, e.data.ac.dexModifier, e.source.pages.slice());
        fact(r, "strengthRequirement", a.strengthRequirement, e.data.strength, e);
        const ls = a.stealthConsequence === "disadvantage";
        if (ls === e.data.stealthDisadvantage) repr(r, "stealthConsequence", a.stealthConsequence, e.data.stealthDisadvantage, "string vs boolean");
        else conflict(r, "stealthConsequence", a.stealthConsequence, e.data.stealthDisadvantage, e.source.pages.slice());
        fact(r, "weight", a.weightSRD, e.data.weight ? e.data.weight.lb : null, e);
        const lc = parseCost(a.costSRD);
        if (sameCost(lc, e.data.cost)) repr(r, "cost", a.costSRD, e.data.cost, "string vs structured");
        else conflict(r, "cost", a.costSRD, e.data.cost, e.source.pages.slice());
        cite(r, a.sourcePage, e);
        if (e.data.description) newOnly(r, "data.description");
        newOnly(r, "text");
    });
})();

// ---------------------------------------------------------------------------------------------
// weapons.json
// ---------------------------------------------------------------------------------------------
(function weapons() {
    const file = "weapons.json";
    const d = legacy[file];
    d.weapons.forEach((w, i) => {
        const r = rec(file, w.id, "weapons[" + i + "]", w.name, w.sourcePage, true);
        const e = attach(r, matchByName(w.name, "weapon"));
        if (!e) return;
        fact(r, "category", w.category, e.data.weaponCategory, e);
        fact(r, "mode", w.mode, e.data.rangeType, e);
        if (e.data.damage === null) {
            if ((w.baseDamageDice === "0" || w.baseDamageDice === "") && (w.damageType === "none" || w.damageType === null)) repr(r, "damage", { dice: w.baseDamageDice, type: w.damageType }, null, "the table prints a dash");
            else conflict(r, "damage", { dice: w.baseDamageDice, type: w.damageType }, null, e.source.pages.slice());
        } else {
            fact(r, "baseDamageDice", w.baseDamageDice, e.data.damage.dice, e);
            fact(r, "damageType", w.damageType, e.data.damage.type, e);
        }
        const want = e.data.properties.map(p => nz(p.name)).sort();
        const have = (w.properties || []).map(p => nz(p.replace(/_/g, "-"))).sort();
        if (JSON.stringify(want) === JSON.stringify(have)) { if (JSON.stringify(w.properties.slice().sort()) === JSON.stringify(e.data.properties.map(p => p.name).sort())) same(r, "properties"); else repr(r, "properties", w.properties, e.data.properties.map(p => p.name), "ids vs printed names"); }
        else conflict(r, "properties", w.properties, e.data.properties.map(p => p.name), e.source.pages.slice());
        const vers = e.data.properties.find(p => p.name === "versatile");
        if (vers || w.versatileDamageDice !== undefined) fact(r, "versatileDamageDice", w.versatileDamageDice === undefined ? null : w.versatileDamageDice, vers ? vers.detail : null, e);
        const ranged = e.data.properties.find(p => p.detail && /^range (\d+)\/(\d+)$/.test(p.detail));
        if (ranged) {
            const m = /^range (\d+)\/(\d+)$/.exec(ranged.detail);
            fact(r, "normalRangeFeet/longRangeFeet", [w.normalRangeFeet, w.longRangeFeet], [parseInt(m[1], 10), parseInt(m[2], 10)], e, { note: "from the " + ranged.name + " property" });
        } else deus(r, "normalRangeFeet/longRangeFeet", [w.normalRangeFeet, w.longRangeFeet], "derived (melee reach); the table prints no range for this weapon");
        deus(r, "handsRequired", w.handsRequired, "derived from the two-handed/versatile properties; not printed");
        if (e.data.weight === null) { if (w.weightSRD === 0) repr(r, "weight", 0, null, "0 stands for a blank cell (the table prints no weight)"); else conflict(r, "weight", w.weightSRD, null, e.source.pages.slice()); }
        else fact(r, "weight", w.weightSRD, e.data.weight.lb, e);
        const lc = parseCost(w.costSRD);
        if (sameCost(lc, e.data.cost)) repr(r, "cost", w.costSRD, e.data.cost, "string vs structured");
        else conflict(r, "cost", w.costSRD, e.data.cost, e.source.pages.slice());
        cite(r, w.sourcePage, e);
        if (e.data.description) newOnly(r, "data.description");
        newOnly(r, "text");
    });
})();

// ---------------------------------------------------------------------------------------------
// spells.json
// ---------------------------------------------------------------------------------------------
const foldDuration = v => nz(v).replace(/concentration up to/, "concentration, up to").replace(/\bone (minute|hour|round|day)\b/, "1 $1");
(function spells() {
    const file = "spells.json";
    const d = legacy[file];
    d.spells.forEach((s, i) => {
        const r = rec(file, s.id, "spells[" + i + "]", s.name, s.sourcePage, true);
        const e = attach(r, matchByName(s.name, "spell"));
        if (!e) return;
        const n = e.data;
        fact(r, "level", s.level, n.level, e);
        fact(r, "school", s.school, n.school, e);
        fact(r, "ritual", s.ritual, n.ritual, e);
        fact(r, "castingTime", s.castingTime, n.castingTime, e, { prefixOk: true });
        fact(r, "range", s.rangeText, n.range, e, { legacyEmpty: true });
        fact(r, "components.verbal", s.components.verbal, n.components.verbal, e);
        fact(r, "components.somatic", s.components.somatic, n.components.somatic, e);
        fact(r, "components.material", s.components.material, n.components.material, e);
        if (s.components.materialDescription === null && n.components.materialDescription) missing(r, "components.materialDescription", n.components.materialDescription);
        else if (s.components.materialDescription !== null || n.components.materialDescription !== null) fact(r, "components.materialDescription", s.components.materialDescription, n.components.materialDescription, e, { prefixOk: true });
        fact(r, "duration", s.duration, n.duration, e, { legacyEmpty: true, fold: foldDuration });
        fact(r, "concentration", s.concentration, n.concentration, e);
        deus(r, "actionEconomyType", s.actionEconomyType, "DEUS routing of the casting time");
        deus(r, "durationDomain", s.durationDomain, "DEUS timing domain");
        deus(r, "source", s.source, "provenance tag");
        const rm = /^(\d+) feet$/.exec(nz(s.rangeText));
        if (rm && parseInt(rm[1], 10) !== s.rangeFeet) deus(r, "rangeFeet", s.rangeFeet, "derived number disagrees with its own rangeText " + JSON.stringify(s.rangeText));
        else deus(r, "rangeFeet", s.rangeFeet, "derived number (Touch = 5, Self = 0, miles and areas = 0)");
        cite(r, s.sourcePage, e);
        newOnly(r, "data.description");
        if (n.atHigherLevels) newOnly(r, "data.atHigherLevels");
        if (n.classes && n.classes.length) newOnly(r, "data.classes (from the spell lists)");
        newOnly(r, "text");
        if (r.differences.conflicts.length) {
            // Quote the header lines as printed (from the entry text) so the appendix cites the page, not the parser.
            r.printedHeader = e.text.split("\n").filter(l => /^(Casting Time|Range|Components?|Duration):/.test(l));
            const gaps = r.differences.legacyMissingValue.filter(x => x.field === "range" || x.field === "duration").map(x => x.field);
            if (gaps.length) note(r, "the same legacy record has an empty " + gaps.join(" and ") + "; consistent with the 2026-09-21 parser not reading this spell's header block (the header spans pages " + e.source.pages.join("-") + ")");
        }
    });
})();

// ---------------------------------------------------------------------------------------------
// monsters_reference.json
// ---------------------------------------------------------------------------------------------
(function monsters() {
    const file = "monsters_reference.json";
    const d = legacy[file];
    d.monsters.forEach((m, i) => {
        const r = rec(file, "monsters[" + i + "]", "monsters[" + i + "]", m.name, m.pageNum, false);
        const e = attach(r, matchByName(m.name, "creature"));
        if (!e) return;
        const printed = typeLine(e);
        fact(r, "sizeType", m.sizeType, printed, e);
        cite(r, m.pageNum, e);
        newOnly(r, "data (full stat block: AC, HP, speed, abilities, senses, traits, actions, legendary actions)");
        newOnly(r, "text");
    });
})();

// ---------------------------------------------------------------------------------------------
// magic_items_reference.json
// ---------------------------------------------------------------------------------------------
/** Where the eleven non-item lines of the legacy file come from (notes, not matches). */
const MAGIC_LINE_ORIGINS = {
    3: { fragmentOf: "srd:magic-item:amulet-of-proof-against-detection-and-location", what: "second line of the wrapped heading; the record's type and rarity are that amulet's" },
    10: { fragmentOf: "srd:magic-item:armor-of-resistance", headingTailOf: "srd:magic-item:armor-of-vulnerability", what: "last row (Thunder) of the Armor of Resistance damage-type table read as a name" },
    52: { fragmentOf: "srd:magic-item:deck-of-many-things", what: "size line of the Avatar of Death stat block inside the item; 'Class 20' is its 'Armor Class 20' line split at the word Armor" },
    73: { fragmentOf: "srd:magic-item:figurine-of-wondrous-power", what: "size line of the Giant Fly stat block inside the item; 'Class 11' is its 'Armor Class 11' line" },
    142: { fragmentOf: "srd:magic-item:potion-of-giant-strength", headingTailOf: "srd:magic-item:potion-of-growth", what: "last rarity cell (Legendary) of the Potion of Giant Strength table read as a name" },
    144: { fragmentOf: "srd:magic-item:potion-of-healing", what: "caption of the Potion of Healing table; the rarity line is the table header" },
    150: { fragmentOf: "srd:magic-item:potion-of-resistance", headingTailOf: "srd:magic-item:potion-of-speed", what: "last row (Thunder) of the Potion of Resistance table read as a name" },
    154: { fragmentOf: "srd:magic-item:ring-of-animal-influence", headingTailOf: "srd:magic-item:ring-of-djinni-summoning", what: "last spell (speak with animals) of the Ring of Animal Influence list read as a name" },
    165: { fragmentOf: "srd:magic-item:ring-of-resistance", headingTailOf: "srd:magic-item:ring-of-shooting-stars", what: "last gem row (Spinel) of the Ring of Resistance table read as a name" },
    180: { fragmentOf: "srd:magic-item:robe-of-useful-items", headingTailOf: "srd:magic-item:rod-of-absorption", what: "last row (Portable ram) of the Robe of Useful Items table read as a name" },
    201: { fragmentOf: "srd:magic-item:staff-of-power", what: "a sentence of the item split at 'Armor Class'; the item itself is the previous legacy record" }
};
(function magicItems() {
    const file = "magic_items_reference.json";
    const d = legacy[file];
    d.magicItems.forEach((m, i) => {
        const r = rec(file, "magicItems[" + i + "]", "magicItems[" + i + "]", m.name, null, false);
        const e = attach(r, matchByName(m.name, "magic-item"));
        if (!e) {
            const o = MAGIC_LINE_ORIGINS[i];
            if (o) {
                const f = newById.get(o.fragmentOf);
                let text = "not an item name: " + o.what + " (" + f.name + ", pages " + f.source.pages.join(", ") + ")";
                if (o.headingTailOf) { const h = newById.get(o.headingTailOf); text += "; the rarity line " + JSON.stringify(m.rarityLine) + " is the tail of the heading \"" + h.name + "\" (pages " + h.source.pages.join(", ") + "), which has no legacy record of its own"; }
                note(r, text);
                r.probableOrigin = o;
            } else note(r, "no catalogue magic item has this name");
            return;
        }
        fact(r, "category", m.category, e.data.itemType, e);
        const legacyLine = nz(m.category + " " + m.rarityLine).replace(/,/g, "").replace(/\s+/g, " ");
        const newLine = nz(typeLine(e)).replace(/,/g, "").replace(/\s+/g, " ");
        if (legacyLine === newLine) repr(r, "rarityLine", m.rarityLine, typeLine(e), "split of the printed type line");
        else if (newLine.startsWith(legacyLine)) repr(r, "rarityLine", m.rarityLine, typeLine(e), "legacy line truncated; the new type line is complete");
        else conflict(r, "rarityLine", m.category + " " + m.rarityLine, typeLine(e), e.source.pages.slice());
        newOnly(r, "data.rarity, data.attunement, data.typeDetail (structured from the type line)");
        newOnly(r, "data.description");
        if (e.data.tables && e.data.tables.length) newOnly(r, "data.tables");
        if (e.data.rarities && e.data.rarities.length > 1) note(r, "one legacy record and one new entry; the new entry structures the " + e.data.rarities.length + " rarity variants in data.rarities");
        newOnly(r, "text");
    });
})();

// ---------------------------------------------------------------------------------------------
// rules_reference.json
// ---------------------------------------------------------------------------------------------
(function rulesReference() {
    const file = "rules_reference.json";
    const d = legacy[file];
    const pagesOf = id => R(id).source.pages.slice();
    for (const k of ["spatialInvariant", "timeDomains"]) {
        const r = rec(file, k, k, k, null, false);
        r.deusOnly = true;
        attach(r, { entry: null, method: "none" });
        for (const [f, v] of Object.entries(d[k])) deus(r, f, v, "DEUS engine invariant; no SRD counterpart exists or is expected");
        note(r, "DEUS-only record: not an SRD fact, so no catalogue entry can hold it; class 3 by the report's rule for intentional DEUS records");
    }
    {
        const tbl = R("srd:table:size-categories-combat");
        d.creatureSizes.forEach((s, i) => {
            const r = rec(file, s.id, "creatureSizes[" + i + "]", s.name, 92, true);
            const e = attach(r, manual("srd:table:size-categories-combat", "many-to-one", ["srd:table:size-categories", "srd:rule:monsters-size"]));
            const row = tbl.data.rows.find(x => nz(x[0]) === nz(s.name));
            if (!row) conflict(r, "name", s.name, tbl.data.rows.map(x => x[0]), e.source.pages.slice());
            else {
                const feet = parseFloat(nz(row[1]));
                if (feet === s.spaceFeet) repr(r, "spaceFeet", s.spaceFeet, row[1], "number vs printed cell");
                else conflict(r, "spaceFeet", s.spaceFeet, row[1], e.source.pages.slice());
            }
            deus(r, "gridCells", s.gridCells, "DEUS grid occupancy; not an SRD value");
            cite(r, 92, e);
            newOnly(r, "the page 254 table adds example creatures");
        });
    }
    {
        const cov = R("srd:rule:combat-cover");
        d.cover.forEach((c, i) => {
            const r = rec(file, c.id, "cover[" + i + "]", c.name, 96, true);
            const e = attach(r, manual("srd:rule:combat-cover", "many-to-one"));
            if (c.id === "total") {
                if (/A target with total cover can’t be targeted directly/.test(cov.text) && c.acBonus === null && c.dexSaveBonus === null) repr(r, "acBonus/dexSaveBonus", null, "can’t be targeted directly", "null encodes 'cannot be targeted'");
                else conflict(r, "acBonus/dexSaveBonus", [c.acBonus, c.dexSaveBonus], "can’t be targeted directly", e.source.pages.slice());
            } else {
                const key = c.id === "half" ? "half" : "three-quarters";
                const m = new RegExp("A target with " + key + " cover has a \\+(\\d+) bonus to AC and Dexterity saving throws").exec(cov.text);
                if (m && parseInt(m[1], 10) === c.acBonus && parseInt(m[1], 10) === c.dexSaveBonus) same(r, "acBonus/dexSaveBonus (+" + m[1] + ")");
                else conflict(r, "acBonus/dexSaveBonus", [c.acBonus, c.dexSaveBonus], m ? "+" + m[1] : null, e.source.pages.slice());
            }
            deus(r, "description", c.description, "paraphrase");
            cite(r, 96, e);
            newOnly(r, "text (full cover rules)");
        });
    }
    {
        const r = rec(file, "jumping", "jumping", "Jumping", 85, false);
        const e = attach(r, manual("srd:rule:adventuring-movement", "one-to-one"));
        const t = e.text;
        const checks = [
            ["longJump.runningFormula", d.jumping.longJump.runningFormula, /cover a number of feet up to your Strength score if you move at least 10 feet/.test(t), "a number of feet up to your Strength score"],
            ["longJump.standingFormula", d.jumping.longJump.standingFormula, /standing long jump, you can leap only half that distance/.test(t), "half that distance"],
            ["highJump.runningFormula", d.jumping.highJump.runningFormula, /a number of feet equal to 3 \+ your Strength modifier/.test(t), "3 + your Strength modifier"],
            ["highJump.standingFormula", d.jumping.highJump.standingFormula, /standing high jump, you can jump only half that distance/.test(t), "half that distance"]
        ];
        for (const [f, lv, ok, printed] of checks) { if (ok) repr(r, f, lv, printed, "prose formula"); else conflict(r, f, lv, null, e.source.pages.slice()); }
        cite(r, 85, e);
        newOnly(r, "text (the Jumping subsection sits inside the Movement rule, which also covers speed, travel pace, climbing and swimming)");
    }
    {
        const env = R("srd:rule:adventuring-the-environment");
        const t = env.text;
        const r1 = rec(file, "falling", "falling", "Falling", 86, false);
        const e1 = attach(r1, manual("srd:rule:adventuring-the-environment", "many-to-one"));
        const fm = /takes (\d+d\d+) bludgeoning damage for every 10 feet it fell, to a maximum of (\d+d\d+)\. The creature lands prone/.exec(t);
        if (fm && nz(d.falling.damagePer10Feet) === nz(fm[1] + " bludgeoning")) same(r1, "damagePer10Feet"); else conflict(r1, "damagePer10Feet", d.falling.damagePer10Feet, fm && fm[1], e1.source.pages.slice());
        if (fm && d.falling.maximumDice === fm[2]) same(r1, "maximumDice"); else conflict(r1, "maximumDice", d.falling.maximumDice, fm && fm[2], e1.source.pages.slice());
        if (fm && d.falling.landsProne === true) same(r1, "landsProne"); else conflict(r1, "landsProne", d.falling.landsProne, "lands prone", e1.source.pages.slice());
        cite(r1, 86, e1); newOnly(r1, "text");
        const r2 = rec(file, "suffocation", "suffocation", "Suffocating", 86, false);
        const e2 = attach(r2, manual("srd:rule:adventuring-the-environment", "many-to-one"));
        if (/hold its breath for a number of minutes equal to 1 \+ its Constitution modifier \(minimum of 30 seconds\)/.test(t)) repr(r2, "holdingBreathMinutes", d.suffocation.holdingBreathMinutes, "1 + its Constitution modifier (minimum of 30 seconds)", "prose formula"); else conflict(r2, "holdingBreathMinutes", d.suffocation.holdingBreathMinutes, null, e2.source.pages.slice());
        if (/survive for a number of rounds equal to its Constitution modifier \(minimum of 1 round\)/.test(t)) repr(r2, "chokingRoundsBeforeDying", d.suffocation.chokingRoundsBeforeDying, "its Constitution modifier (minimum of 1 round)", "prose formula"); else conflict(r2, "chokingRoundsBeforeDying", d.suffocation.chokingRoundsBeforeDying, null, e2.source.pages.slice());
        cite(r2, 86, e2); newOnly(r2, "text");
        const r3 = rec(file, "environmentSurvival", "environmentSurvival", "Food and Water", 87, false);
        const e3 = attach(r3, manual("srd:rule:adventuring-the-environment", "many-to-one"));
        const es = d.environmentSurvival;
        if (/needs one pound of food per day/.test(t) && es.foodLbsPerDay === 1) repr(r3, "foodLbsPerDay", 1, "one pound of food per day", "number vs prose"); else conflict(r3, "foodLbsPerDay", es.foodLbsPerDay, null, e3.source.pages.slice());
        if (/go without food for a number of days equal to 3 \+ his or her Constitution modifier \(minimum 1\)/.test(t) && /^3 \+ CON modifier/.test(es.daysWithoutFoodBeforeExhaustion)) repr(r3, "daysWithoutFoodBeforeExhaustion", es.daysWithoutFoodBeforeExhaustion, "3 + his or her Constitution modifier (minimum 1)", "prose formula; the legacy string omits the printed minimum of 1"); else conflict(r3, "daysWithoutFoodBeforeExhaustion", es.daysWithoutFoodBeforeExhaustion, null, e3.source.pages.slice());
        if (/needs one gallon of water per day, or two gallons per day if the weather is hot/.test(t) && es.waterGallonsPerDay === 1 && es.waterGallonsHotWeather === 2) repr(r3, "waterGallonsPerDay/waterGallonsHotWeather", [1, 2], "one gallon ... or two gallons per day if the weather is hot", "numbers vs prose"); else conflict(r3, "waterGallonsPerDay/waterGallonsHotWeather", [es.waterGallonsPerDay, es.waterGallonsHotWeather], null, e3.source.pages.slice());
        if (/DC 15 Constitution saving throw or suffer one level of exhaustion/.test(t) && es.dehydrationSaveDC === 15) same(r3, "dehydrationSaveDC"); else conflict(r3, "dehydrationSaveDC", es.dehydrationSaveDC, null, e3.source.pages.slice());
        cite(r3, 87, e3); newOnly(r3, "text");
    }
    {
        const r = rec(file, "resting", "resting", "Resting", 87, false);
        const e = attach(r, manual("srd:rule:adventuring-resting", "one-to-one"));
        const t = e.text;
        if (/short rest is a period of downtime, at least 1 hour long/.test(t) && d.resting.shortRestMinHours === 1) same(r, "shortRestMinHours"); else conflict(r, "shortRestMinHours", d.resting.shortRestMinHours, null, e.source.pages.slice());
        if (/long rest is a period of extended downtime, at least 8 hours long/.test(t) && d.resting.longRestMinHours === 8) same(r, "longRestMinHours"); else conflict(r, "longRestMinHours", d.resting.longRestMinHours, null, e.source.pages.slice());
        if (/can’t benefit from more than one long rest in a 24-hour period/.test(t) && d.resting.longRestMaxFrequencyHours === 24) same(r, "longRestMaxFrequencyHours"); else conflict(r, "longRestMaxFrequencyHours", d.resting.longRestMaxFrequencyHours, null, e.source.pages.slice());
        deus(r, "historicalTimeWarning", d.resting.historicalTimeWarning, "DEUS design note about the historical clock");
        cite(r, 87, e); newOnly(r, "text (Hit Dice recovery rules)");
    }
    {
        const r = rec(file, "objects.acByMaterial", "objects.acByMaterial", "Object Armor Class", 203, false);
        const e = attach(r, manual("srd:table:object-armor-class", "one-to-one"));
        const rows = e.data.rows;
        const legacyVals = Object.entries(d.objects.acByMaterial);
        if (legacyVals.length !== rows.length) conflict(r, "rows", legacyVals, rows, e.source.pages.slice(), "row count differs");
        else legacyVals.forEach(([k, v], i) => { if (parseInt(rows[i][1], 10) === v) repr(r, k, v, rows[i].join(" | "), "key names the substance row"); else conflict(r, k, v, rows[i].join(" | "), e.source.pages.slice()); });
        cite(r, 203, e);
    }
    {
        const r = rec(file, "objects.hpBySize", "objects.hpBySize", "Object Hit Points", 203, false);
        const e = attach(r, manual("srd:table:object-hit-points", "one-to-one"));
        for (const row of e.data.rows) {
            const size = nz(row[0]).split(" ")[0];
            const lv = d.objects.hpBySize[size];
            const frag = parseInt(row[1], 10), res = parseInt(row[2], 10);
            if (!lv) { conflict(r, size, null, row.join(" | "), e.source.pages.slice()); continue; }
            if (lv.fragile === frag) same(r, size + ".fragile"); else conflict(r, size + ".fragile", lv.fragile, row[1], e.source.pages.slice(), "the table prints " + row[1] + " for " + row[0]);
            if (lv.resilient === res) same(r, size + ".resilient"); else conflict(r, size + ".resilient", lv.resilient, row[2], e.source.pages.slice(), "the table prints " + row[2] + " for " + row[0]);
        }
        newOnly(r, "dice expressions and example objects in the table cells");
        cite(r, 203, e);
    }
})();

// ---------------------------------------------------------------------------------------------
// Classification and counts
// ---------------------------------------------------------------------------------------------
for (const r of records) classify(r);

const perFile = {};
for (const f of LEGACY_FILES) perFile[f] = { records: 0, matched: 0, unmatched: 0, byClassification: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }, byMatchMethod: {} };
const byClassification = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
const byClassificationIfKeyIsDeusField = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
const byMatchMethod = {};
for (const r of records) {
    const p = perFile[r.legacyFile];
    p.records++;
    if (r.matchedNewId) p.matched++; else p.unmatched++;
    p.byClassification[r.classification]++;
    p.byMatchMethod[r.matchMethod] = (p.byMatchMethod[r.matchMethod] || 0) + 1;
    byClassification[r.classification]++;
    byClassificationIfKeyIsDeusField[r.classificationIfKeyIsDeusField]++;
    byMatchMethod[r.matchMethod] = (byMatchMethod[r.matchMethod] || 0) + 1;
}

// New entries with no legacy counterpart (covered = named as matchedNewId by at least one legacy record).
const covered = new Set(records.filter(r => r.matchedNewId).map(r => r.matchedNewId));
const relatedOnly = new Set();
for (const r of records) for (const id of r.relatedNewIds) if (!covered.has(id)) relatedOnly.add(id);
const newWithoutLegacy = {};
for (const e of newEntries) {
    if (covered.has(e.id)) continue;
    if (!newWithoutLegacy[e.category]) newWithoutLegacy[e.category] = { count: 0, byKind: {}, entries: [] };
    const b = newWithoutLegacy[e.category];
    b.count++;
    b.byKind[e.kind] = (b.byKind[e.kind] || 0) + 1;
    const row = { id: e.id, kind: e.kind, name: e.name, pages: e.source.pages.slice() };
    if (relatedOnly.has(e.id)) row.note = "named as a related entry by a legacy record, not as its match";
    b.entries.push(row);
}
for (const c of Object.values(newWithoutLegacy)) c.entries.sort((a, b) => a.kind.localeCompare(b.kind) || a.pages[0] - b.pages[0] || a.id.localeCompare(b.id));

// Reconciliations (the numbers the report itemises).
const recon = {};
{
    const legacyRecs = records.filter(r => r.legacyFile === "monsters_reference.json");
    recon.creatures = {
        legacyCount: legacyRecs.length,
        newCount: newByKind.get("creature").length,
        matched: legacyRecs.filter(r => r.matchedNewId).length,
        legacyWithoutNew: legacyRecs.filter(r => !r.matchedNewId).map(r => ({ legacyName: r.legacyName, page: r.legacyPage })),
        newWithoutLegacy: (newWithoutLegacy.creatures ? newWithoutLegacy.creatures.entries : []),
        legacyNamesWithHyphenArtifacts: legacyRecs.filter(r => r.differences.representation.some(x => x.field === "name")).map(r => ({ legacyName: r.legacyName, newName: r.matchedNewName, newId: r.matchedNewId, pages: r.newPages })),
        sizeTypeConflicts: legacyRecs.filter(r => r.differences.conflicts.length).map(r => ({ legacyName: r.legacyName, newId: r.matchedNewId, conflicts: r.differences.conflicts })),
        pageCitationMismatches: legacyRecs.filter(r => r.differences.pageCitation && !r.differences.pageCitation.agrees).map(r => ({ legacyName: r.legacyName, legacyPage: r.legacyPage, newPages: r.newPages }))
    };
}
{
    const legacyRecs = records.filter(r => r.legacyFile === "magic_items_reference.json");
    recon.magicItems = {
        legacyCount: legacyRecs.length,
        newCount: newByKind.get("magic-item").length,
        legacyRecordsMatched: legacyRecs.filter(r => r.matchedNewId).length,
        legacyLinesThatAreNotItems: legacyRecs.filter(r => !r.matchedNewId).map(r => ({ index: parseInt(/\d+/.exec(r.legacyPath)[0], 10), legacyName: r.legacyName, category: legacy["magic_items_reference.json"].magicItems[parseInt(/\d+/.exec(r.legacyPath)[0], 10)].category, rarityLine: legacy["magic_items_reference.json"].magicItems[parseInt(/\d+/.exec(r.legacyPath)[0], 10)].rarityLine, origin: r.differences.notes[0] || null })),
        newItemsWithoutLegacy: (newWithoutLegacy["magic-items"] ? newWithoutLegacy["magic-items"].entries : []),
        conflicts: legacyRecs.filter(r => r.differences.conflicts.length).map(r => ({ legacyName: r.legacyName, newId: r.matchedNewId, conflicts: r.differences.conflicts })),
        plusItemsNote: "the legacy file already holds one record per +1/+2/+3 item (Ammunition, Armor, Shield, Wand of the War Mage, Weapon); each maps one-to-one to the new entry whose data.rarities structures the three rarities, so no magic item is class 4"
    };
}
{
    const legacyRecs = records.filter(r => r.legacyFile === "spells.json");
    recon.spells = {
        legacyCount: legacyRecs.length,
        newSpellCount: newByKind.get("spell").length,
        newSpellListCount: newByKind.get("spell-list").length,
        matched: legacyRecs.filter(r => r.matchedNewId).length,
        legacyWithoutNew: legacyRecs.filter(r => !r.matchedNewId).map(r => r.legacyName),
        newSpellsWithoutLegacy: (newWithoutLegacy.spells ? newWithoutLegacy.spells.entries.filter(e => e.kind === "spell") : []),
        spellListsWithoutLegacy: (newWithoutLegacy.spells ? newWithoutLegacy.spells.entries.filter(e => e.kind === "spell-list") : []),
        nameRepresentationDifferences: legacyRecs.filter(r => r.differences.representation.some(x => x.field === "name")).map(r => ({ legacyName: r.legacyName, newName: r.matchedNewName })),
        conflicts: legacyRecs.filter(r => r.differences.conflicts.length).map(r => ({ legacyName: r.legacyName, newId: r.matchedNewId, pages: r.newPages, conflicts: r.differences.conflicts })),
        legacyMissingValues: legacyRecs.filter(r => r.differences.legacyMissingValue.some(x => x.field === "range" || x.field === "duration")).map(r => ({ legacyName: r.legacyName, missing: r.differences.legacyMissingValue.filter(x => x.field === "range" || x.field === "duration") })),
        truncatedLegacyValues: legacyRecs.filter(r => r.differences.representation.some(x => /truncated/.test(x.note || ""))).length,
        pageCitationMismatches: legacyRecs.filter(r => r.differences.pageCitation && !r.differences.pageCitation.agrees).map(r => ({ legacyName: r.legacyName, legacyPage: r.legacyPage, newPages: r.newPages }))
    };
}
{
    const kinds = ["weapon", "armor", "tool", "gear", "mount", "vehicle", "trade-good"];
    const files = { weapon: "weapons.json", armor: "armor.json", tool: "tools.json" };
    recon.equipment = { byKind: {} };
    for (const k of kinds) {
        const legacyRecs = files[k] ? records.filter(r => r.legacyFile === files[k]) : [];
        recon.equipment.byKind[k] = {
            legacyFile: files[k] || null,
            legacyCount: legacyRecs.length,
            newCount: newByKind.get(k).length,
            matched: legacyRecs.filter(r => r.matchedNewId).length,
            newWithoutLegacy: (newWithoutLegacy.equipment ? newWithoutLegacy.equipment.entries.filter(e => e.kind === k).length : 0),
            conflicts: legacyRecs.filter(r => r.differences.conflicts.length).map(r => ({ legacyName: r.legacyName, conflicts: r.differences.conflicts }))
        };
    }
    recon.equipment.weaponPropertiesNote = "the 11 legacy weapon_properties records have no equipment entry of their own; they map to srd:rule:equipment-weapon-properties and are carried by the weapon entries' data.properties";
}
{
    const cls = records.filter(r => r.legacyFile === "classes_reference.json" && r.legacyPath.startsWith("classes["));
    const races = records.filter(r => r.legacyFile === "species_reference.json" && !/subraces/.test(r.legacyPath));
    const subs = records.filter(r => r.legacyFile === "species_reference.json" && /subraces/.test(r.legacyPath));
    const nwl = newWithoutLegacy["character-options"] ? newWithoutLegacy["character-options"].entries : [];
    recon.characterOptions = {
        classes: { legacyCount: cls.length, newCount: newByKind.get("class").length, matched: cls.filter(r => r.matchedNewId).length },
        races: { legacyCount: races.length, newCount: newByKind.get("race").length, matched: races.filter(r => r.matchedNewId).length },
        subraces: { legacyCount: subs.length, newCount: newByKind.get("subrace").length, matched: subs.filter(r => r.matchedNewId).length, aliases: subs.filter(r => r.matchMethod === "alias").map(r => ({ legacyName: r.legacyName, newId: r.matchedNewId })) },
        newWithoutLegacy: { subclass: nwl.filter(e => e.kind === "subclass").length, background: nwl.filter(e => e.kind === "background").length, feat: nwl.filter(e => e.kind === "feat").length, entries: nwl },
        pageCitationMismatches: [...cls, ...races, ...subs].filter(r => r.differences.pageCitation && !r.differences.pageCitation.agrees).map(r => ({ legacyName: r.legacyName, legacyPage: r.legacyPage, newPages: r.newPages }))
    };
}
{
    const ruleFiles = ["conditions.json", "combat_actions.json", "damage_types.json", "skills.json", "abilities.json", "rules_reference.json", "weapon_properties.json"];
    const map = {};
    for (const f of ruleFiles) map[f] = records.filter(r => r.legacyFile === f).map(r => ({ legacyKey: r.legacyKey, legacyName: r.legacyName, matchedNewId: r.matchedNewId, relatedNewIds: r.relatedNewIds, relation: r.relation, classification: r.classification, newPages: r.newPages }));
    const nwl = newWithoutLegacy.rules ? newWithoutLegacy.rules.entries : [];
    recon.rules = {
        legacyRecordsByFile: Object.fromEntries(ruleFiles.map(f => [f, map[f].length])),
        newByKind: { rule: newByKind.get("rule").length, table: newByKind.get("table").length, hazard: newByKind.get("hazard").length, condition: newByKind.get("condition").length, appendix: newByKind.get("appendix").length },
        newEntriesWithLegacyCounterpart: newEntries.filter(e => e.category === "rules" && covered.has(e.id)).map(e => ({ id: e.id, kind: e.kind, pages: e.source.pages.slice(), legacyRecords: records.filter(r => r.matchedNewId === e.id).length })),
        newWithoutLegacy: { rule: nwl.filter(e => e.kind === "rule").length, table: nwl.filter(e => e.kind === "table").length, hazard: nwl.filter(e => e.kind === "hazard").length, condition: nwl.filter(e => e.kind === "condition").length, appendix: nwl.filter(e => e.kind === "appendix").length },
        mapping: map
    };
}

const conflictsAppendix = records.filter(r => r.classification === 5).map(r => ({ legacyFile: r.legacyFile, legacyKey: r.legacyKey, legacyName: r.legacyName, matchedNewId: r.matchedNewId, pages: r.newPages, conflicts: r.differences.conflicts, printedHeader: r.printedHeader || null, notes: r.differences.notes, deusFields: r.differences.deusFields.map(x => x.field) }));
const unresolvedAppendix = records.filter(r => r.classification === 6).map(r => ({ legacyFile: r.legacyFile, legacyKey: r.legacyKey, legacyName: r.legacyName, legacyPage: r.legacyPage, notes: r.differences.notes }));
const pageCitationMismatches = records.filter(r => r.differences.pageCitation && !r.differences.pageCitation.agrees).map(r => ({ legacyFile: r.legacyFile, legacyKey: r.legacyKey, legacyName: r.legacyName, legacyPage: r.legacyPage, newPages: r.newPages }));

const report = {
    generator: "tools/srd_extract/crosswalk_srd5_1.js",
    deterministic: true,
    inputs,
    legacyFolder: "game/data/srd5_1",
    newFolder: "game/data/srd51",
    classes: CLASS_LABELS,
    classificationPolicy: {
        precedence: "6 unmatched > 5 conflicts > 4 many-to-one or one-to-many > 3 DEUS-specific fields > 2 new carries more > 1 equivalent",
        legacyKey: "the legacy record's id is treated as its key, not as a classified field; byClassificationIfKeyIsDeusField shows the counts when the id is counted as a DEUS-specific field instead",
        deusOnlyRecords: "legacy records that are DEUS invariants rather than SRD facts (rules_reference spatialInvariant, timeDomains) are class 3 with no match; class 6 is reserved for SRD records without a counterpart and for lines that are not records"
    },
    aliases: ALIASES,
    counts: {
        legacyRecords: records.length,
        newEntries: newEntries.length,
        byClassification,
        byClassificationIfKeyIsDeusField,
        byMatchMethod,
        perFile,
        newEntriesCovered: covered.size,
        newEntriesWithoutLegacy: newEntries.length - covered.size,
        pageCitationMismatches: pageCitationMismatches.length
    },
    reconciliations: recon,
    newWithoutLegacy,
    pageCitationMismatches,
    conflictsAppendix,
    unresolvedAppendix,
    records
};

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
const json = JSON.stringify(report, null, 1) + "\n";
fs.writeFileSync(OUT_FILE, json, "utf8");

console.log("legacy records: " + records.length + " (from " + LEGACY_FILES.length + " files), new entries: " + newEntries.length);
console.log("by classification: " + Object.entries(byClassification).map(([k, v]) => k + "=" + v).join(" "));
console.log("by match method: " + Object.entries(byMatchMethod).map(([k, v]) => k + "=" + v).join(", "));
for (const f of LEGACY_FILES) { const p = perFile[f]; console.log("  " + f.padEnd(28) + " records " + String(p.records).padStart(4) + " matched " + String(p.matched).padStart(4) + "  classes " + Object.entries(p.byClassification).map(([k, v]) => k + ":" + v).join(" ")); }
console.log("new entries without a legacy counterpart: " + (newEntries.length - covered.size) + " " + JSON.stringify(Object.fromEntries(Object.entries(newWithoutLegacy).map(([k, v]) => [k, v.byKind]))));
console.log("page citation mismatches: " + pageCitationMismatches.length + "; class 5 records: " + conflictsAppendix.length + "; class 6 records: " + unresolvedAppendix.length);
console.log("report sha256 " + sha(json).slice(0, 16) + " -> " + path.relative(ROOT, OUT_FILE));
