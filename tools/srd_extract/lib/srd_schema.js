// tools/srd_extract/lib/srd_schema.js - the SRD 5.1 catalogue contract as code.
//
// The single definition of categories, kinds, required fields and readiness tags that the stagers,
// build_srd_catalog.js and validate_srd_catalog.js share. The prose version is
// docs/SRD5_1_COVERAGE_MANIFEST.md (sections 5 to 8); when the two disagree, fix both.
"use strict";

const SCHEMA_VERSION = 1;
const SOURCE_DOCUMENT = "SRD 5.1";
const SOURCE_PAGES = 403;

const ATTRIBUTION = "This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.";
const LICENSE = Object.freeze({ id: "CC-BY-4.0", url: "https://creativecommons.org/licenses/by/4.0/legalcode", attribution: ATTRIBUTION });

/** Browser categories and the catalogue file each one is written to. */
const CATEGORIES = Object.freeze({
    "creatures": "creatures.json",
    "spells": "spells.json",
    "equipment": "equipment.json",
    "magic-items": "magic_items.json",
    "character-options": "character_options.json",
    "rules": "rules.json"
});

/** Every kind, the category it belongs to and its placeholder icon (IconSet.png index, 16 per row). */
const KINDS = Object.freeze({
    "creature": { category: "creatures", icon: 8 }, // 12 is a transparent cell of the stock sheet (seen empty in the NW.js run, 2026-09-22)
    "spell": { category: "spells", icon: 79 },
    "spell-list": { category: "spells", icon: 187 },
    "weapon": { category: "equipment", icon: 97 },
    "armor": { category: "equipment", icon: 128 },
    "gear": { category: "equipment", icon: 176 },
    "tool": { category: "equipment", icon: 194 },
    "mount": { category: "equipment", icon: 82 },
    "vehicle": { category: "equipment", icon: 83 },
    "trade-good": { category: "equipment", icon: 208 },
    "magic-item": { category: "magic-items", icon: 160 },
    "race": { category: "character-options", icon: 80 },
    "subrace": { category: "character-options", icon: 81 },
    "class": { category: "character-options", icon: 84 },
    "subclass": { category: "character-options", icon: 85 },
    "background": { category: "character-options", icon: 86 },
    "feat": { category: "character-options", icon: 87 },
    "condition": { category: "rules", icon: 16 },
    "rule": { category: "rules", icon: 189 },
    "hazard": { category: "rules", icon: 1 },
    "table": { category: "rules", icon: 188 },
    "appendix": { category: "rules", icon: 190 }
});

const READINESS = Object.freeze(["extracted", "parsed", "verified", "adapted"]);

/**
 * Required `data` fields per kind for readiness "parsed" (contract section 7). A field is present when
 * it is not undefined and not null; empty arrays and empty objects count as present (a creature may have
 * no reactions), so a stager must set them explicitly.
 */
const REQUIRED_DATA = Object.freeze({
    "creature": ["size", "type", "alignment", "armorClass", "hitPoints", "speed", "abilities", "savingThrows", "skills", "damageVulnerabilities", "damageResistances", "damageImmunities", "conditionImmunities", "senses", "languages", "challenge", "traits", "actions", "reactions"],
    "spell": ["level", "school", "ritual", "castingTime", "range", "components", "duration", "concentration", "description", "classes"],
    "spell-list": ["class", "spells"],
    "weapon": ["weaponCategory", "rangeType", "cost", "properties"], // weight is null for the sling, which the table prints without one
    "armor": ["armorCategory", "cost", "ac", "stealthDisadvantage", "weight"],
    "gear": ["cost"], // group is the table's sub-heading and is null for the many rows that have none
    "tool": ["cost"],
    "mount": ["cost"],
    "vehicle": ["cost"],
    "trade-good": ["cost"],
    "magic-item": ["itemType", "rarity", "attunement", "description", "tables"],
    "race": ["traits", "abilityScoreIncrease", "size", "speed", "languages", "subraces"],
    "subrace": ["traits", "abilityScoreIncrease", "parent"],
    "class": ["hitDie", "savingThrows", "proficiencies", "startingEquipment", "classTable", "features", "subclasses"],
    "subclass": ["parentClass", "features"],
    "background": ["skillProficiencies", "languages", "equipment", "feature"],
    "feat": ["prerequisite", "benefits"],
    "condition": ["effects"],
    "rule": ["headingPath"],
    "hazard": ["headingPath"],
    "appendix": ["headingPath"],
    "table": ["caption", "columns", "rows", "headingPath"]
});

const ID_RE = /^srd:[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isPresent(v) { return v !== undefined && v !== null; }

/** True when an attribution statement matches the required one, ignoring quote style and spacing. */
function attributionMatches(text) {
    const fold = s => require("./srd_text").toPlain(String(s || "")).replace(/\s+/g, " ").trim();
    return fold(text) === fold(ATTRIBUTION);
}

/**
 * Validate one entry against the contract. Returns an array of problem strings (empty = valid).
 * `strict` also demands that a "parsed" entry carries every required data field of its kind.
 */
function validateEntry(e, opts = {}) {
    const strict = opts.strict !== false;
    const p = [];
    if (!e || typeof e !== "object") return ["entry is not an object"];
    const where = e.id ? `${e.id}` : (e.name ? `"${e.name}"` : "(unnamed)");
    if (typeof e.id !== "string" || !ID_RE.test(e.id)) p.push(`${where}: id must match srd:<kind>:<slug> (got ${JSON.stringify(e.id)})`);
    if (!KINDS[e.kind]) p.push(`${where}: unknown kind ${JSON.stringify(e.kind)}`);
    if (!CATEGORIES[e.category]) p.push(`${where}: unknown category ${JSON.stringify(e.category)}`);
    if (KINDS[e.kind] && CATEGORIES[e.category] && KINDS[e.kind].category !== e.category) p.push(`${where}: kind ${e.kind} belongs to category ${KINDS[e.kind].category}, not ${e.category}`);
    if (typeof e.id === "string" && e.kind && e.id.split(":")[1] !== e.kind) p.push(`${where}: id kind segment differs from kind ${e.kind}`);
    if (typeof e.name !== "string" || !e.name.trim()) p.push(`${where}: name missing`);
    const s = e.source;
    if (!s || typeof s !== "object") p.push(`${where}: source missing`);
    else {
        if (s.document !== SOURCE_DOCUMENT) p.push(`${where}: source.document must be ${JSON.stringify(SOURCE_DOCUMENT)}`);
        if (!Array.isArray(s.pages) || !s.pages.length || !s.pages.every(n => Number.isInteger(n) && n >= 1 && n <= SOURCE_PAGES)) p.push(`${where}: source.pages must be integers 1..${SOURCE_PAGES}`);
        if (typeof s.section !== "string" || !s.section) p.push(`${where}: source.section missing`);
        if (typeof s.heading !== "string" || !s.heading) p.push(`${where}: source.heading missing`);
    }
    if (typeof e.text !== "string" || !e.text.trim()) p.push(`${where}: text missing`);
    if (!e.data || typeof e.data !== "object" || Array.isArray(e.data)) p.push(`${where}: data must be an object`);
    if (!Array.isArray(e.dice)) p.push(`${where}: dice must be an array`);
    if (!READINESS.includes(e.readiness)) p.push(`${where}: readiness must be one of ${READINESS.join(", ")}`);
    if (!Array.isArray(e.notes)) p.push(`${where}: notes must be an array`);
    if (e.readiness === "verified" && !(e.verifiedBy && e.verifiedAt)) p.push(`${where}: verified entries need verifiedBy and verifiedAt`);
    if (e.readiness === "adapted" && !(e.adaptation && e.adaptation.deusId)) p.push(`${where}: adapted entries need adaptation.deusId`);
    if (strict && e.readiness === "parsed" && e.data && REQUIRED_DATA[e.kind]) {
        const missing = REQUIRED_DATA[e.kind].filter(k => !isPresent(e.data[k]));
        if (missing.length) p.push(`${where}: readiness "parsed" but data lacks ${missing.join(", ")}`);
    }
    if (e.icon !== undefined) {
        if (!e.icon || e.icon.set !== "IconSet" || !Number.isInteger(e.icon.index) || e.icon.index < 0) p.push(`${where}: icon must be { set: "IconSet", index >= 0 }`);
    }
    return p;
}

/** Validate a staging or catalogue file object ({ metadata, entries, warnings }). */
function validateFile(obj, opts = {}) {
    const p = [];
    if (!obj || typeof obj !== "object") return ["file is not an object"];
    const m = obj.metadata;
    if (!m || typeof m !== "object") p.push("metadata missing");
    else {
        if (!m.license || m.license.id !== LICENSE.id || !attributionMatches(m.license.attribution)) p.push("metadata.license must carry the CC-BY-4.0 id and the attribution statement");
        if (!m.source || typeof m.source.sha256 !== "string") p.push("metadata.source.sha256 missing");
    }
    if (!Array.isArray(obj.entries)) p.push("entries must be an array");
    else {
        const seen = new Map();
        obj.entries.forEach((e, i) => {
            for (const msg of validateEntry(e, opts)) p.push(msg);
            if (e && typeof e.id === "string") {
                if (seen.has(e.id)) p.push(`duplicate id ${e.id} (entries ${seen.get(e.id)} and ${i})`);
                else seen.set(e.id, i);
            }
        });
    }
    if (obj.warnings !== undefined && !Array.isArray(obj.warnings)) p.push("warnings must be an array");
    return p;
}

module.exports = { SCHEMA_VERSION, SOURCE_DOCUMENT, SOURCE_PAGES, LICENSE, ATTRIBUTION, CATEGORIES, KINDS, READINESS, REQUIRED_DATA, ID_RE, attributionMatches, validateEntry, validateFile };
