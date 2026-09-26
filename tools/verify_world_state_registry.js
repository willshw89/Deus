#!/usr/bin/env node
'use strict';
/**
 * tools/verify_world_state_registry.js — WG.33.01 (Lane X), 2026-09-26.
 *
 * Bi-directional integrity checker for the World-State Registry (docs/worldgen/DEUS_WORLD_STATE_REGISTRY.md,
 * DEUS-WSR-v1.0 §5, rules WSR-01..05) against the art catalogue (art/catalogue/catalogue.json, contract
 * deus-art-catalogue/1.1.0), the blank-template slot map (tools/art/make_blank_templates.js, sidecar format
 * deus-blank-template/1), game/data/UF_WorldCatalog.json and placed art (Lane U: the SHA-256 ledger section of
 * art/APPROVALS.md and deus-art-placement/1 reports). It reads manifests, docs and slot geometry. It never
 * reads, prints or writes image data (DEC-007). The template generator it runs writes its template PNGs into
 * a fresh OS temp folder, which this tool deletes before it returns.
 *
 * Rules and finding codes (severity VIOLATION or GAP gates; EXEMPT is reported and never gates):
 *   WSR-01 single ownership: every state has exactly one system from the schema's system enum.
 *          DUPLICATE_STATE, NO_SYSTEM, MULTIPLE_SYSTEMS, SYSTEM_NOT_IN_ENUM
 *   WSR-02 visual completeness: art-required states (scope.json artRequiredClasses) have a visualStateId
 *          and an assetFamily; SIMULATION_ONLY states have neither. Rows whose family and visual state are
 *          both "*Compositional Assembly*" / "*None (Composed)*" on a system listed in composedExemptSystems
 *          are COMPOSED_EXEMPT (EXEMPT).
 *          VISUAL_STATE_ID_MISSING, VISUAL_STATE_ID_INVALID, ASSET_FAMILY_MISSING, ASSET_FAMILY_INVALID,
 *          SIMULATION_HAS_VISUAL, COMPOSED_INCOMPLETE, COMPOSED_NOT_ALLOWED, COMPOSED_EXEMPT
 *   WSR-03 atlas allocation: an art-required visualStateId resolves to a catalogue entry (see Resolution),
 *          the entry (or its derivedFrom base) owns a paint slot, and that slot is in the template output
 *          with the same sheet and rect. The catalogue sheets/slots are the atlas of record (WG.30.01 has no
 *          deliverable). The spec's UF_WorldCatalog leg is checked too: the visualStateId is a WorldCatalog id,
 *          or a resolved entry cites a WorldCatalog id. Every asset family must exist in the catalogue.
 *          NO_CATALOGUE_ENTRY, NO_SLOT, SLOT_NOT_IN_TEMPLATE, TEMPLATE_UNAVAILABLE, NOT_IN_WORLD_CATALOG,
 *          FAMILY_NOT_IN_CATALOGUE, MAP_TARGET_UNKNOWN, MAP_UNUSED
 *   WSR-04 no phantom assets: every catalogue slot's class (<family>:<category>) is declared in scope.json;
 *          a NATURAL_WORLD slot traces to a registry state (some state resolves to its entry or to a variant
 *          derived from it); a NON_WORLD_STATE slot's entry cites a source of the kinds its source class allows.
 *          SLOT_CLASS_UNDECLARED, SLOT_NO_STATE, SLOT_SOURCE_UNDECLARED
 *   WSR-05 performance class: every state declares a performanceClass from the enum.
 *          PERFORMANCE_CLASS_MISSING, PERFORMANCE_CLASS_INVALID. "Never scanned globally per frame" is a
 *          runtime property and is listed under notCheckable in the report.
 *   WSR-SCHEMA the seed table against the §2 schema: a column for every required field (system and
 *          performanceClass have their own rules), enum and boolean values, id format, known transitions.
 *          COLUMN_MISSING, ENUM_INVALID, TYPE_INVALID, STATE_ID_FORMAT, TRANSITION_UNKNOWN
 *   MANIFEST-TEMPLATE 100% agreement both ways between catalogue sheets/slots and the template slot map.
 *          TEMPLATE_REFUSED_<generator code>, SHEET_NOT_IN_TEMPLATE, SHEET_NOT_IN_CATALOGUE,
 *          SHEET_GEOMETRY_DIFFERS, SLOT_NOT_IN_TEMPLATE, SLOT_NOT_IN_CATALOGUE, SLOT_RECT_DIFFERS,
 *          SLOT_SHEET_DIFFERS, SLOT_ENTRY_DIFFERS, SLOT_ID_SHEET_MISMATCH, SLOT_SHEET_UNKNOWN, SLOT_INVALID,
 *          DUPLICATE_SLOT_ID, DUPLICATE_ENTRY_ID, DUPLICATE_SHEET_ID, DUPLICATE_TEMPLATE_SLOT,
 *          DUPLICATE_TEMPLATE_SHEET, TEMPLATE_SIDECAR_INVALID
 *   PLACED-IN-SLOT placed art lies inside catalogue slots: every id in the approval ledger is a catalogue
 *          entry or slot id; every filled region of a placement report lies inside its catalogue slot.
 *          LEDGER_MALFORMED, LEDGER_ID_UNKNOWN, PLACEMENT_REPORT_INVALID, PLACED_OUTSIDE_SLOT
 *
 * Resolution of a visualStateId v to catalogue entries (WSR-03, and the reverse trace of WSR-04):
 *   ID      an entry whose id is v, or whose TYPE field (4th of the 6 id fields) is v upper-cased with every
 *           character outside [A-Z0-9] turned into '-' (the id rule of docs/art/catalogue/SCHEMA.md §6);
 *   SOURCE  an entry citing a source id whose bare id is v: catalog ids without their list prefix
 *           (objects:, items:, wildlife:, people:, groundKinds:, water:, faces:, faces:species:, skins:,
 *           underground:), brief ids without SEG-nn: and the :<gender> suffix, assetIndex/manifest/matrix
 *           ids as they are; AR and addendum ids never match;
 *   MAP     an ACCEPTED row of the visual-state map (tools/wsr/visual_state_map.json). PROPOSED rows are
 *           listed as candidates and never resolve anything.
 *   A derived variant (variants.derivedFrom) is displayed through its base's slot.
 *
 * Template slot map: by default the generator runs on the catalogue in a fresh OS temp folder. Every refusal
 * becomes a MANIFEST-TEMPLATE gap. The generator then runs again on a copy of the catalogue that holds only
 * the sheets it did not refuse (and their slotted entries), and repeats until a run succeeds, so the sheets it
 * accepts are still compared slot by slot. --templates <dir> reads existing sidecars instead.
 *
 * Gate (default): exit 1 on any VIOLATION or GAP whose (rule, code, id) is not in the baseline, and on any
 * baseline entry that no longer occurs (stale: the baseline must shrink as gaps close). --strict ignores the
 * baseline and exits 1 on any VIOLATION or GAP. --check builds the report in memory and exits 1 if the
 * committed report differs (CRLF is folded to LF before comparing). --report <dir> writes wsr_report.json and
 * WSR_REPORT.md (deterministic: no timestamps, no absolute paths, sorted).
 *
 * Usage:
 *   node tools/verify_world_state_registry.js [--registry <md>] [--catalogue <json>] [--templates <dir>]
 *        [--world-catalog <json>] [--approvals <md>] [--placements <json>]... [--scope <json>]
 *        [--map <json>] [--baseline <json>] [--report <dir>] [--check | --strict]
 *   Defaults are the repository files (see DEFAULTS); relative paths given on the command line resolve
 *   against the current directory.
 * Exit: 0 gate passed / report matches, 1 gate failed / report differs, 2 usage error or unreadable or
 * invalid input (the message names the file, and the line for the registry).
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const TOOL = 'tools/verify_world_state_registry.js';
const GENERATOR = 'tools/art/make_blank_templates.js';
const LEDGER_PARSER = 'tools/art/validate_art.js';

const SCHEMA = {
    report: 'deus-wsr-report/1',
    baseline: 'deus-wsr-known-gaps/1',
    scope: 'deus-wsr-scope/1',
    map: 'deus-wsr-map/1',
    template: 'deus-blank-template/1',
    placement: 'deus-art-placement/1'
};

const DEFAULTS = {
    registry: 'docs/worldgen/DEUS_WORLD_STATE_REGISTRY.md',
    catalogue: 'art/catalogue/catalogue.json',
    worldCatalog: 'game/data/UF_WorldCatalog.json',
    approvals: 'art/APPROVALS.md',
    scope: 'tools/wsr/scope.json',
    map: 'tools/wsr/visual_state_map.json',
    baseline: 'tools/wsr/known_gaps.json',
    report: 'tools/wsr/report'
};

const RULES = ['WSR-01', 'WSR-02', 'WSR-03', 'WSR-04', 'WSR-05', 'WSR-SCHEMA', 'MANIFEST-TEMPLATE', 'PLACED-IN-SLOT'];
const SEVERITIES = ['VIOLATION', 'GAP', 'EXEMPT'];
const GATING = new Set(['VIOLATION', 'GAP']);
const REPORT_JSON = 'wsr_report.json';
const REPORT_MD = 'WSR_REPORT.md';
const SOURCE_KINDS = ['catalog', 'assetIndex', 'brief', 'ar', 'manifest', 'matrix', 'addendum'];
const SCOPES = ['NATURAL_WORLD', 'NON_WORLD_STATE'];
const MAP_STATUS = ['PROPOSED', 'ACCEPTED'];
const STATE_ID_RE = /^STATE_[A-Z0-9]+(?:_[A-Z0-9]+)+$/;
const TOKEN_RE = /^[A-Za-z0-9_.:-]+$/;
// Longest prefix first: faces:species: before faces:.
const CATALOG_PREFIXES = ['faces:species:', 'objects:', 'items:', 'wildlife:', 'people:', 'groundKinds:', 'water:', 'faces:', 'skins:', 'underground:'];
// Seed-table header (lower-cased, letters and digits only) -> schema field.
const COLUMN_FIELDS = {
    stateid: 'stateId', system: 'system', description: 'description', authoritativesource: 'authoritativeSource',
    visible: 'visible', visualclass: 'visualClass', visualstateid: 'visualStateId', assetfamily: 'assetFamily',
    semanticassetfamily: 'assetFamily', transitionstates: 'transitionStates', saverequired: 'saveRequired',
    performanceclass: 'performanceClass'
};
// Required schema fields with a rule of their own (WSR-SCHEMA does not report their column again).
const OWN_RULE_FIELDS = new Set(['stateId', 'system', 'performanceClass']);
const BOOLEAN_FIELDS = ['visible', 'saveRequired'];
const NOT_CHECKABLE = [
    {
        rule: 'WSR-05',
        what: 'States marked ACTIVE_FRONT_QUEUE or REGIONAL_DIRTY must never be scanned globally per frame.',
        why: 'A runtime property of the simulation code. The registry, catalogue and templates do not record it, so a static check cannot see it.'
    }
];
const ATLAS_OF_RECORD = 'art/catalogue/catalogue.json sheets[] and entries[].slot. WG.30.01 (master sheet allocation) has no deliverable, so the "WG.30 atlas coordinate" of WSR-03 is read as the catalogue slot, confirmed in the template output.';

class InputError extends Error {
    constructor(message) { super(message); this.name = 'InputError'; }
}

// ---------------------------------------------------------------- small helpers

function cmp(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
function uniq(list) { return [...new Set(list)]; }
function lf(text) { return String(text).replace(/\r\n/g, '\n'); }
function push(map, k, v) { if (!map.has(k)) map.set(k, []); map.get(k).push(v); }
function isObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
function countBy(list, fn) {
    const m = {};
    for (const x of list) { const k = fn(x); m[k] = (m[k] || 0) + 1; }
    return sortKeys(m);
}
function sortKeys(o) { const r = {}; for (const k of Object.keys(o).sort(cmp)) r[k] = o[k]; return r; }
function displayPath(p) {
    const rel = path.relative(REPO_ROOT, path.resolve(p));
    return rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? rel.split(path.sep).join('/') : path.basename(p);
}
function readText(file, what) {
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new InputError(`${what} ${displayPath(file)} not found`);
    return fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
}
function parseJsonText(text, file, what) {
    try { return JSON.parse(text); } catch (err) { throw new InputError(`${what} ${displayPath(file)} is not valid JSON: ${err.message}`); }
}
function readJson(file, what) { return parseJsonText(readText(file, what), file, what); }
function keyOf(f) { return `${f.rule}|${f.code}|${f.id}`; }

// ---------------------------------------------------------------- registry markdown

function norm(s) { return String(s).toLowerCase().replace(/[^a-z0-9]/g, ''); }
function isTableLine(l) { return /^\s{0,3}\|/.test(l); }
function splitRow(l) {
    let t = l.trim();
    if (t.startsWith('|')) t = t.slice(1);
    if (t.endsWith('|') && !t.endsWith('\\|')) t = t.slice(0, -1);
    const cells = [];
    let cur = '';
    for (let i = 0; i < t.length; i++) {
        if (t[i] === '\\' && t[i + 1] === '|') { cur += '|'; i++; continue; }
        if (t[i] === '|') { cells.push(cur.trim()); cur = ''; continue; }
        cur += t[i];
    }
    cells.push(cur.trim());
    return cells;
}
function isSeparator(l) { const c = splitRow(l); return c.length > 0 && c.every(x => /^:?-{3,}:?$/.test(x)); }
function fenceMask(lines) {
    const mask = [];
    let open = null;
    for (const l of lines) {
        const f = /^\s{0,3}(`{3,}|~{3,})/.exec(l);
        if (open) { mask.push(true); if (f && f[1][0] === open[0] && f[1].length >= open.length) open = null; }
        else if (f) { open = f[1]; mask.push(true); }
        else mask.push(false);
    }
    return mask;
}

// One seed-table cell. kind: EMPTY, NONE (*None*, null, -), COMPOSED (*Compositional Assembly*,
// *None (Composed)*), VALUE (one identifier, backticks removed) or TEXT (anything else; tokens lists the
// identifiers found in it).
function parseCell(raw) {
    const t = String(raw).trim();
    if (!t) return { kind: 'EMPTY', value: null, raw: t, tokens: [] };
    const italic = /^\*+([^*]*)\*+$/.exec(t);
    if (italic) {
        const inner = italic[1].trim();
        if (/^none\s*\(composed\)$/i.test(inner) || /^compositional\s+assembly$/i.test(inner)) return { kind: 'COMPOSED', value: null, raw: t, tokens: [] };
        if (/^none$/i.test(inner)) return { kind: 'NONE', value: null, raw: t, tokens: [] };
        return { kind: 'TEXT', value: inner, raw: t, tokens: [] };
    }
    const value = t.replace(/`/g, '').trim();
    if (/^(null|none|-|—|n\/a)$/i.test(value)) return { kind: 'NONE', value: null, raw: t, tokens: [] };
    const ticks = [...t.matchAll(/`([^`]*)`/g)].map(m => m[1].trim()).filter(Boolean);
    const outside = t.replace(/`[^`]*`/g, '').trim();
    if (ticks.length <= 1 && !outside.length && TOKEN_RE.test(value)) return { kind: 'VALUE', value, raw: t, tokens: [value] };
    if (ticks.length === 0 && TOKEN_RE.test(value)) return { kind: 'VALUE', value, raw: t, tokens: [value] };
    const tokens = ticks.length > 1 ? ticks : value.split(/[^A-Za-z0-9_.:-]+/).filter(x => x && !/^(and|or)$/i.test(x));
    return { kind: 'TEXT', value, raw: t, tokens: uniq(tokens) };
}

function parseRegistry(text, file) {
    const where = n => `${displayPath(file)}:${n}`;
    const lines = lf(text).split('\n');
    const fenced = fenceMask(lines);

    // §2: the first ```json block that describes a world-state entry (properties.stateId).
    let schema = null, schemaLine = 0;
    for (let i = 0; i < lines.length && !schema; i++) {
        if (!/^\s{0,3}```\s*json\s*$/i.test(lines[i])) continue;
        let j = i + 1;
        while (j < lines.length && !/^\s{0,3}```\s*$/.test(lines[j])) j++;
        if (j >= lines.length) throw new InputError(`${where(i + 1)}: the json code block is not closed`);
        let obj;
        try { obj = JSON.parse(lines.slice(i + 1, j).join('\n')); } catch (err) {
            throw new InputError(`${where(i + 1)}: the json block does not parse: ${err.message}`);
        }
        if (isObj(obj) && isObj(obj.properties) && obj.properties.stateId) { schema = obj; schemaLine = i + 1; }
        i = j;
    }
    if (!schema) throw new InputError(`${displayPath(file)}: no \`\`\`json block with a world-state schema (properties.stateId) found`);
    const enumOf = field => {
        const p = schema.properties[field];
        if (!isObj(p) || !Array.isArray(p.enum) || !p.enum.length || !p.enum.every(x => typeof x === 'string')) {
            throw new InputError(`${where(schemaLine)}: schema property ${field} has no string enum`);
        }
        return p.enum.slice();
    };
    if (!Array.isArray(schema.required) || !schema.required.every(x => typeof x === 'string')) throw new InputError(`${where(schemaLine)}: schema has no required[] list of field names`);
    const enums = { system: enumOf('system'), visualClass: enumOf('visualClass'), performanceClass: enumOf('performanceClass') };

    // §3: every table (outside code blocks) whose header has a "State ID" column; the rows of all of
    // them are read, so a state added in a later table is never skipped.
    const tables = [];
    const rows = [];
    for (let hdr = 0; hdr < lines.length; hdr++) {
        const startsTable = !fenced[hdr] && isTableLine(lines[hdr]) && !(hdr > 0 && !fenced[hdr - 1] && isTableLine(lines[hdr - 1]));
        if (!startsTable || !splitRow(lines[hdr]).some(c => norm(c) === 'stateid')) continue;
        const header = splitRow(lines[hdr]);
        const fields = header.map(h => COLUMN_FIELDS[norm(h)] || null);
        const seenField = new Map();
        fields.forEach((f, k) => {
            if (!f) return;
            if (seenField.has(f)) throw new InputError(`${where(hdr + 1)}: columns "${header[seenField.get(f)]}" and "${header[k]}" both map to ${f}`);
            seenField.set(f, k);
        });
        if (hdr + 1 >= lines.length || !isSeparator(lines[hdr + 1])) throw new InputError(`${where(hdr + 2)}: the seed table header is not followed by a | --- | separator row`);
        const table = { line: hdr + 1, header, fields: new Set(fields.filter(Boolean)), unknown: header.filter((h, k) => !fields[k]), rows: 0 };
        let i = hdr + 2;
        for (; i < lines.length && !fenced[i] && isTableLine(lines[i]); i++) {
            const cells = splitRow(lines[i]);
            if (cells.length !== header.length) throw new InputError(`${where(i + 1)}: seed table row has ${cells.length} cells; the header has ${header.length}`);
            const row = { line: i + 1, table: tables.length, cells: {} };
            fields.forEach((f, k) => { if (f) row.cells[f] = parseCell(cells[k]); });
            const sid = row.cells.stateId;
            if (sid.kind !== 'VALUE') throw new InputError(`${where(i + 1)}: State ID ${JSON.stringify(sid.raw)} is not one identifier`);
            row.stateId = sid.value;
            rows.push(row);
            table.rows++;
        }
        if (!table.rows) throw new InputError(`${where(hdr + 1)}: the seed table has no rows`);
        tables.push(table);
        hdr = i - 1;
    }
    if (!tables.length) throw new InputError(`${displayPath(file)}: no seed table with a "State ID" column found`);
    return {
        file, schemaLine, enums, required: schema.required.slice(), tables,
        // A field counts as a column only if every seed table has it.
        columns: new Set([...tables[0].fields].filter(f => tables.every(t => t.fields.has(f)))),
        unknownColumns: uniq([].concat(...tables.map(t => t.unknown))),
        rows
    };
}

// ---------------------------------------------------------------- catalogue

function bareSourceId(kind, sid) {
    if (typeof sid !== 'string' || !sid) return null;
    if (kind === 'ar' || kind === 'addendum') return null;
    if (kind === 'catalog') { for (const p of CATALOG_PREFIXES) if (sid.startsWith(p)) return sid.slice(p.length); return sid; }
    if (kind === 'brief') { const m = /^SEG-\d+:([^:]+)/.exec(sid); return m ? m[1] : sid; }
    return sid;
}
function typeToken(v) { return String(v).toUpperCase().replace(/[^A-Z0-9]/g, '-'); }
function classOf(e) { return `${typeof e.family === 'string' && e.family ? e.family : 'NONE'}:${typeof e.category === 'string' && e.category ? e.category : 'NONE'}`; }

function indexCatalogue(cat, text, file) {
    const where = displayPath(file);
    if (!isObj(cat) || !Array.isArray(cat.sheets) || !Array.isArray(cat.entries)) throw new InputError(`catalogue ${where}: sheets[] and entries[] are required`);
    const lineOf = new Map();
    lf(text).split('\n').forEach((l, i) => {
        const m = /"(?:id|sheetId)"\s*:\s*"([^"]+)"/.exec(l);
        if (m && !lineOf.has(m[1])) lineOf.set(m[1], i + 1);
    });
    const idx = {
        file, where, lineOf, sheets: new Map(), entries: new Map(), slots: [], slotById: new Map(), slotByEntry: new Map(),
        slotsBySheet: new Map(), dupSheets: [], dupEntries: [], dupSlots: [], badSlots: [],
        typeIndex: new Map(), bareSource: new Map(), fullSource: new Map(), families: new Set(),
        forbiddenBiomes: isObj(cat.biomes) && Array.isArray(cat.biomes.forbidden) ? cat.biomes.forbidden.slice() : [],
        catalogIndex: isObj(cat.sourceIdIndex) && Array.isArray(cat.sourceIdIndex.catalog) ? cat.sourceIdIndex.catalog.slice() : null
    };
    for (const s of cat.sheets) {
        if (!isObj(s) || typeof s.sheetId !== 'string' || !s.sheetId) throw new InputError(`catalogue ${where}: a sheet has no sheetId`);
        if (idx.sheets.has(s.sheetId)) { idx.dupSheets.push(s.sheetId); continue; }
        idx.sheets.set(s.sheetId, s);
    }
    for (const e of cat.entries) {
        if (!isObj(e) || typeof e.id !== 'string' || !e.id) throw new InputError(`catalogue ${where}: an entry has no id`);
        if (idx.entries.has(e.id)) { idx.dupEntries.push(e.id); continue; }
        idx.entries.set(e.id, e);
        if (typeof e.family === 'string' && e.family) idx.families.add(e.family);
        const f = e.id.split('_');
        if (f.length === 6) push(idx.typeIndex, f[3], e.id);
        const src = isObj(e.sourceIds) ? e.sourceIds : {};
        for (const k of SOURCE_KINDS) {
            for (const sid of Array.isArray(src[k]) ? src[k] : []) {
                push(idx.fullSource, sid, e.id);
                const b = bareSourceId(k, sid);
                if (b) push(idx.bareSource, b, e.id);
            }
        }
        const s = e.slot;
        if (s === null || s === undefined) continue;
        if (!isObj(s) || typeof s.sheetId !== 'string' || typeof s.slotId !== 'string' || ![s.x, s.y, s.w, s.h].every(Number.isInteger) || s.x < 0 || s.y < 0 || s.w < 1 || s.h < 1) {
            idx.badSlots.push(e.id);
            continue;
        }
        const rec = { slotId: s.slotId, sheetId: s.sheetId, x: s.x, y: s.y, w: s.w, h: s.h, entryId: e.id };
        idx.slots.push(rec);
        idx.slotByEntry.set(e.id, rec);
        push(idx.slotsBySheet, rec.sheetId, rec);
        if (idx.slotById.has(rec.slotId)) idx.dupSlots.push(rec); else idx.slotById.set(rec.slotId, rec);
    }
    for (const m of [idx.typeIndex, idx.bareSource, idx.fullSource]) for (const [k, v] of m) m.set(k, uniq(v).sort(cmp));
    return idx;
}
function catSource(ctx, id) { const n = ctx.cat.lineOf.get(id); return n ? `${ctx.cat.where}:${n}` : ctx.cat.where; }

// The entry whose slot displays entry `id`: itself, or the base of a derived variant.
function slotOwner(cat, id) {
    const e = cat.entries.get(id);
    if (!e) return null;
    if (cat.slotByEntry.has(id)) return id;
    const base = isObj(e.variants) && typeof e.variants.derivedFrom === 'string' ? e.variants.derivedFrom : null;
    return base && cat.slotByEntry.has(base) ? base : null;
}

// ---------------------------------------------------------------- WorldCatalog

function worldCatalogIds(wc, file) {
    if (!isObj(wc)) throw new InputError(`WorldCatalog ${displayPath(file)} is not a JSON object`);
    const bare = new Set(), prefixed = new Set();
    const add = (kind, id) => { if (typeof id === 'string' && id) { bare.add(id); prefixed.add(`${kind}:${id}`); } };
    const list = v => (Array.isArray(v) ? v.map(x => (isObj(x) ? x.id : null)) : isObj(v) ? Object.keys(v).filter(k => k !== 'about') : []);
    const at = (o, k) => (isObj(o) ? o[k] : undefined);
    list(wc.objects).forEach(id => add('objects', id));
    list(at(wc.items, 'types')).forEach(id => add('items', id));
    list(at(wc.wildlife, 'species')).forEach(id => add('wildlife', id));
    list(wc.people).forEach(id => add('people', id));
    list(wc.groundKinds).forEach(id => add('groundKinds', id));
    list(at(wc.water, 'surface')).forEach(id => add('water', id));
    list(at(wc.faces, 'cultures')).forEach(id => add('faces', id));
    list(at(wc.faces, 'species')).forEach(id => add('faces:species', id));
    list(at(wc.skins, 'cultures')).forEach(id => add('skins', id));
    const under = isObj(wc.undergroundBiomes) ? Object.values(wc.undergroundBiomes).map(v => (isObj(v) ? v.ground : null)) : [];
    uniq(under).forEach(id => add('underground', id));
    return { bare, prefixed };
}

// ---------------------------------------------------------------- parameters

function loadScope(obj, file) {
    const where = displayPath(file);
    const errs = [];
    if (!isObj(obj)) throw new InputError(`scope ${where} is not a JSON object`);
    if (obj.schema !== SCHEMA.scope) errs.push(`schema must be ${SCHEMA.scope}`);
    const strList = v => Array.isArray(v) && v.every(x => typeof x === 'string' && x);
    if (!strList(obj.artRequiredClasses) || !obj.artRequiredClasses.length) errs.push('artRequiredClasses must be a non-empty list of visual classes');
    if (!strList(obj.composedExemptSystems)) errs.push('composedExemptSystems must be a list of systems');
    if (!isObj(obj.sourceClasses)) errs.push('sourceClasses must be an object');
    else for (const [k, v] of Object.entries(obj.sourceClasses)) {
        if (!isObj(v) || !strList(v.kinds) || !v.kinds.length || !v.kinds.every(x => SOURCE_KINDS.includes(x))) errs.push(`sourceClasses.${k}.kinds must list source kinds from ${SOURCE_KINDS.join(', ')}`);
        if (!isObj(v) || typeof v.why !== 'string' || !v.why.trim()) errs.push(`sourceClasses.${k}.why is required`);
    }
    if (!isObj(obj.classes)) errs.push('classes must be an object');
    else for (const [k, v] of Object.entries(obj.classes)) {
        if (!/^[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/.test(k)) errs.push(`classes key ${k} is not <family>:<category>`);
        if (!isObj(v) || !SCOPES.includes(v.scope)) { errs.push(`classes.${k}.scope must be one of ${SCOPES.join(', ')}`); continue; }
        if (v.scope === 'NON_WORLD_STATE' && !(isObj(obj.sourceClasses) && isObj(obj.sourceClasses[v.sourceClass]))) errs.push(`classes.${k}.sourceClass must name a sourceClasses entry`);
        if (v.scope === 'NATURAL_WORLD' && v.sourceClass !== undefined) errs.push(`classes.${k}: a NATURAL_WORLD class has no sourceClass`);
        if (typeof v.why !== 'string' || !v.why.trim()) errs.push(`classes.${k}.why is required`);
    }
    if (errs.length) throw new InputError(`scope ${where} is invalid: ${errs.join('; ')}`);
    return obj;
}

function loadMap(obj, file) {
    const where = displayPath(file);
    const errs = [];
    if (!isObj(obj)) throw new InputError(`visual-state map ${where} is not a JSON object`);
    if (obj.schema !== SCHEMA.map) errs.push(`schema must be ${SCHEMA.map}`);
    if (!Array.isArray(obj.visualStates)) errs.push('visualStates must be an array');
    if (!Array.isArray(obj.assetFamilies)) errs.push('assetFamilies must be an array');
    (obj.visualStates || []).forEach((m, i) => {
        const at = `visualStates[${i}]`;
        if (!isObj(m) || typeof m.visualStateId !== 'string' || !m.visualStateId) { errs.push(`${at}.visualStateId is required`); return; }
        const t = m.target;
        const ok = isObj(t) && Object.keys(t).length === 1 && ((typeof t.entryId === 'string' && t.entryId) || (typeof t.sourceId === 'string' && t.sourceId));
        if (!ok) errs.push(`${at}.target must be {"entryId": ...} or {"sourceId": ...}`);
        if (!MAP_STATUS.includes(m.status)) errs.push(`${at}.status must be one of ${MAP_STATUS.join(', ')}`);
        if (typeof m.reason !== 'string' || !m.reason.trim()) errs.push(`${at}.reason is required`);
    });
    (obj.assetFamilies || []).forEach((m, i) => {
        const at = `assetFamilies[${i}]`;
        if (!isObj(m) || typeof m.assetFamily !== 'string' || !m.assetFamily) { errs.push(`${at}.assetFamily is required`); return; }
        if (typeof m.catalogueFamily !== 'string' || !m.catalogueFamily) errs.push(`${at}.catalogueFamily is required`);
        if (!MAP_STATUS.includes(m.status)) errs.push(`${at}.status must be one of ${MAP_STATUS.join(', ')}`);
        if (typeof m.reason !== 'string' || !m.reason.trim()) errs.push(`${at}.reason is required`);
    });
    if (errs.length) throw new InputError(`visual-state map ${where} is invalid: ${errs.join('; ')}`);
    return obj;
}

function loadBaseline(file) {
    const where = displayPath(file);
    const b = readJson(file, 'baseline');
    const errs = [];
    if (!isObj(b)) throw new InputError(`baseline ${where} is not a JSON object`);
    if (b.schema !== SCHEMA.baseline) errs.push(`schema must be ${SCHEMA.baseline}`);
    if (!Array.isArray(b.entries)) errs.push('entries must be an array');
    const seen = new Set();
    (Array.isArray(b.entries) ? b.entries : []).forEach((e, i) => {
        const at = `entries[${i}]`;
        if (!isObj(e)) { errs.push(`${at} is not an object`); return; }
        if (!RULES.includes(e.rule)) errs.push(`${at}: rule ${JSON.stringify(e.rule)} is not one of ${RULES.join(', ')}`);
        if (typeof e.code !== 'string' || !e.code) errs.push(`${at}: code is required`);
        if (typeof e.id !== 'string' || !e.id) errs.push(`${at}: id is required`);
        if (typeof e.reason !== 'string' || e.reason.trim().length < 10 || /[\r\n]/.test(e.reason)) errs.push(`${at} (${e.id}): reason must be one line of at least 10 characters`);
        const k = keyOf(e);
        if (seen.has(k)) errs.push(`${at}: duplicate entry ${k}`);
        seen.add(k);
    });
    if (errs.length) throw new InputError(`baseline ${where} is invalid: ${errs.slice(0, 20).join('; ')}${errs.length > 20 ? `; and ${errs.length - 20} more` : ''}`);
    return { file, entries: b.entries };
}

// ---------------------------------------------------------------- template slot map

function readSidecars(dir) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw new InputError(`template folder ${displayPath(dir)} not found`);
    const out = [], ignored = [];
    for (const name of fs.readdirSync(dir).filter(n => n.toLowerCase().endsWith('.json')).sort(cmp)) {
        let obj = null;
        try { obj = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8').replace(/^﻿/, '')); } catch (err) { obj = null; }
        if (isObj(obj) && obj.format === SCHEMA.template) out.push({ file: name, obj }); else ignored.push(name);
    }
    return { sidecars: out, ignored };
}

function parseRefusals(stderr, cat, scrub) {
    const out = [];
    for (const line of lf(stderr).split('\n')) {
        const m = /^REFUSED ([A-Z][A-Z0-9_]*): (.*)$/.exec(line);
        if (!m) continue;
        const code = m[1], message = scrub(m[2]);
        const p = /^([^\s:]+):\s/.exec(message);
        const id = p ? p[1] : null;
        let level = 'catalogue', target = 'catalogue', idKind = 'file', sheetId = null;
        if (id && cat.sheets.has(id)) { level = 'sheet'; target = id; idKind = 'sheetId'; sheetId = id; }
        else if (id && cat.entries.has(id)) {
            const s = cat.slotByEntry.get(id);
            if (s && cat.sheets.has(s.sheetId)) { level = 'slot'; target = s.slotId; idKind = 'slotId'; sheetId = s.sheetId; }
            else { level = 'entry'; target = id; idKind = 'entryId'; }
        }
        out.push({ code, message, level, id: target, idKind, sheetId, key: `${code}|${target}|${message}` });
    }
    return out;
}

function subCatalogue(raw, keep) {
    return Object.assign({}, raw, {
        sheets: raw.sheets.filter(s => isObj(s) && keep.has(s.sheetId)),
        entries: raw.entries.filter(e => isObj(e) && isObj(e.slot) && keep.has(e.slot.sheetId))
    });
}

// Runs the generator in a temp folder; see the header. Returns {mode, runs, refusals, sidecars}.
function generateTemplates(catFile, raw, cat) {
    const gen = path.join(REPO_ROOT, GENERATOR);
    if (!fs.existsSync(gen)) throw new InputError(`template generator ${GENERATOR} not found`);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wsr-templates-'));
    const scrub = s => String(s).split(tmp).join('<tmp>');
    const res = { mode: 'GENERATED', source: GENERATOR, runs: [], refusals: [], sidecars: [], ignored: [] };
    try {
        let input = catFile;
        let sheetIds = [...cat.sheets.keys()].sort(cmp);
        let prev = null;
        const refused = new Set();
        for (let n = 0; n <= cat.sheets.size + 1; n++) {
            const out = path.join(tmp, `out${n}`);
            const r = childProcess.spawnSync(process.execPath, [gen, '--catalogue', input, '--out', out], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
            const refusals = r.status === 2 ? parseRefusals(r.stderr || '', cat, scrub) : [];
            res.runs.push({ run: n + 1, catalogue: n === 0 ? displayPath(catFile) : `<tmp>/catalogue_sub${n}.json`, sheets: sheetIds.length, exit: r.status, refusals: refusals.length });
            if (r.status === 0) { const s = readSidecars(out); res.sidecars = s.sidecars; res.ignored = s.ignored; break; }
            if (r.status !== 2 || !refusals.length) {
                const tail = scrub(lf(r.stderr || '').trim().split('\n').slice(-3).join(' / '));
                throw new InputError(`template generator ${GENERATOR} exited ${r.status}${r.error ? ` (${r.error.message})` : ''}: ${tail}`);
            }
            for (const x of refusals) if (!res.refusals.some(y => y.key === x.key)) res.refusals.push(x);
            if (refusals.some(x => x.level === 'catalogue')) break;
            for (const x of refusals) if (x.sheetId) refused.add(x.sheetId);
            prev = sheetIds;
            sheetIds = [...cat.sheets.keys()].filter(id => !refused.has(id)).sort(cmp);
            if (!sheetIds.length || (n > 0 && sheetIds.join('\n') === prev.join('\n'))) break;
            input = path.join(tmp, `catalogue_sub${n + 1}.json`);
            fs.writeFileSync(input, JSON.stringify(subCatalogue(raw, new Set(sheetIds))));
        }
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }
    res.refusals.sort((a, b) => cmp(a.key, b.key));
    return res;
}

function indexTemplates(t) {
    const idx = Object.assign({}, t, { sheets: new Map(), slots: [], slotById: new Map(), dupSlots: [], dupSheets: [], bad: [] });
    for (const sc of t.sidecars) {
        const o = sc.obj;
        if (typeof o.sheetId !== 'string' || !o.sheetId || !Array.isArray(o.slots)) { idx.bad.push({ file: sc.file, why: 'no sheetId or slots[]' }); continue; }
        if (idx.sheets.has(o.sheetId)) { idx.dupSheets.push(o.sheetId); continue; }
        idx.sheets.set(o.sheetId, { sheetId: o.sheetId, kind: o.kind, w: o.w, h: o.h, gridPx: o.gridPx, file: sc.file });
        for (const s of o.slots) {
            if (!isObj(s) || typeof s.slotId !== 'string' || !s.slotId) { idx.bad.push({ file: sc.file, why: 'a slot has no slotId' }); continue; }
            const rec = { slotId: s.slotId, sheetId: o.sheetId, entryId: s.entryId, x: s.x, y: s.y, w: s.w, h: s.h };
            idx.slots.push(rec);
            if (idx.slotById.has(rec.slotId)) idx.dupSlots.push(rec); else idx.slotById.set(rec.slotId, rec);
        }
    }
    return idx;
}

function sameRect(a, b) { return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h; }
function sameSheet(a, b) { return a.kind === b.kind && a.w === b.w && a.h === b.h && a.gridPx === b.gridPx; }
function contains(s, r) { return r.w > 0 && r.h > 0 && r.x >= s.x && r.y >= s.y && r.x + r.w <= s.x + s.w && r.y + r.h <= s.y + s.h; }

// OK, UNAVAILABLE (no template for the sheet), MISSING, OTHER_SHEET or RECT_DIFFERS.
function templateStatus(ctx, slot) {
    if (!ctx.tpl.sheets.has(slot.sheetId)) return 'UNAVAILABLE';
    const t = ctx.tpl.slotById.get(slot.slotId);
    if (!t) return 'MISSING';
    if (t.sheetId !== slot.sheetId) return 'OTHER_SHEET';
    if (!sameRect(slot, t)) return 'RECT_DIFFERS';
    return 'OK';
}

// ---------------------------------------------------------------- resolution (visualStateId -> entries)

function mapTargets(cat, m) {
    if (typeof m.target.entryId === 'string') return cat.entries.has(m.target.entryId) ? [m.target.entryId] : [];
    return (cat.fullSource.get(m.target.sourceId) || []).slice();
}
function describeTarget(m) { return typeof m.target.entryId === 'string' ? `entry ${m.target.entryId}` : `source ${m.target.sourceId}`; }
function artRequired(ctx, r) { const vc = r.cells.visualClass; return !!vc && vc.kind === 'VALUE' && ctx.scope.artRequiredClasses.includes(vc.value); }
function isComposed(r) { return ['assetFamily', 'visualStateId'].some(f => r.cells[f] && r.cells[f].kind === 'COMPOSED'); }
// A row whose visualStateId may trace slots: a valid id on a row that is not SIMULATION_ONLY and not composed.
function tracingRow(ctx, r) {
    const vc = r.cells.visualClass, v = r.cells.visualStateId;
    return !!vc && vc.kind === 'VALUE' && ctx.reg.enums.visualClass.includes(vc.value) && vc.value !== 'SIMULATION_ONLY' && !isComposed(r) && !!v && v.kind === 'VALUE';
}

function resolveStates(ctx) {
    const { cat, map } = ctx;
    const accepted = new Map(), proposed = new Map();
    for (const m of map.visualStates) push(m.status === 'ACCEPTED' ? accepted : proposed, m.visualStateId, m);
    ctx.resolved = [];
    ctx.traced = new Map();
    for (const r of ctx.reg.rows) {
        const v = r.cells.visualStateId;
        const vid = v && v.kind === 'VALUE' ? v.value : null;
        const res = { row: r, visualStateId: vid, entries: [], slots: [], proposals: [] };
        if (vid) {
            const hits = new Map();
            const hit = (id, how) => { if (!hits.has(id)) hits.set(id, new Set()); hits.get(id).add(how); };
            if (cat.entries.has(vid)) hit(vid, 'ID');
            for (const id of cat.typeIndex.get(typeToken(vid)) || []) hit(id, 'ID');
            for (const id of cat.bareSource.get(vid) || []) hit(id, 'SOURCE');
            for (const m of accepted.get(vid) || []) for (const id of mapTargets(cat, m)) hit(id, 'MAP');
            res.entries = [...hits.keys()].sort(cmp).map(id => ({ entryId: id, methods: [...hits.get(id)].sort(cmp) }));
            res.proposals = uniq((proposed.get(vid) || []).map(describeTarget)).sort(cmp);
            const owners = uniq(res.entries.map(x => slotOwner(cat, x.entryId)).filter(Boolean)).sort(cmp);
            res.slots = owners.map(id => { const s = cat.slotByEntry.get(id); return { entryId: id, slotId: s.slotId, sheetId: s.sheetId, template: templateStatus(ctx, s) }; });
            if (tracingRow(ctx, r)) for (const o of owners) push(ctx.traced, o, r.stateId);
        }
        ctx.resolved.push(res);
    }
}

// ---------------------------------------------------------------- rules

function ruleWsr01(ctx, add) {
    const R = 'WSR-01';
    const lines = new Map();
    for (const r of ctx.reg.rows) {
        push(lines, r.stateId, r);
        const c = r.cells.system;
        const at = `${displayPath(ctx.reg.file)}:${r.line}`;
        const systems = !c || c.kind === 'EMPTY' || c.kind === 'NONE' || c.kind === 'COMPOSED' ? [] : c.kind === 'VALUE' ? [c.value] : c.tokens;
        if (!systems.length) add(R, 'NO_SYSTEM', 'VIOLATION', 'stateId', r.stateId, `no owning system (cell ${JSON.stringify(c ? c.raw : '')})`, at);
        else if (systems.length > 1) add(R, 'MULTIPLE_SYSTEMS', 'VIOLATION', 'stateId', r.stateId, `${systems.length} systems in one cell: ${systems.join(', ')}`, at);
        else if (!ctx.reg.enums.system.includes(systems[0])) add(R, 'SYSTEM_NOT_IN_ENUM', 'VIOLATION', 'stateId', r.stateId, `system ${systems[0]} is not in the schema's system enum (${displayPath(ctx.reg.file)}:${ctx.reg.schemaLine})`, at);
    }
    for (const [id, rows] of lines) {
        if (rows.length < 2) continue;
        const desc = rows.map(r => `line ${r.line} system ${r.cells.system ? r.cells.system.raw.replace(/`/g, '') : '(none)'}`).join('; ');
        add(R, 'DUPLICATE_STATE', 'VIOLATION', 'stateId', id, `stateId appears on ${rows.length} rows: ${desc}`, `${displayPath(ctx.reg.file)}:${rows[0].line}`);
    }
}

function ruleWsr02(ctx, add) {
    const R = 'WSR-02';
    for (const r of ctx.reg.rows) {
        const at = `${displayPath(ctx.reg.file)}:${r.line}`;
        const vc = r.cells.visualClass;
        const fam = r.cells.assetFamily, vis = r.cells.visualStateId;
        const has = c => !!c && (c.kind === 'VALUE' || c.kind === 'TEXT');
        if (!vc || vc.kind !== 'VALUE' || !ctx.reg.enums.visualClass.includes(vc.value)) continue;   // WSR-SCHEMA ENUM_INVALID
        if (isComposed(r)) {
            const both = fam && fam.kind === 'COMPOSED' && vis && vis.kind === 'COMPOSED';
            const sys = r.cells.system && r.cells.system.kind === 'VALUE' ? r.cells.system.value : null;
            if (!both) add(R, 'COMPOSED_INCOMPLETE', 'VIOLATION', 'stateId', r.stateId, `a composed row needs "*Compositional Assembly*" as family and "*None (Composed)*" as visual state; got ${JSON.stringify(fam ? fam.raw : '')} / ${JSON.stringify(vis ? vis.raw : '')}`, at);
            else if (!ctx.scope.composedExemptSystems.includes(sys)) add(R, 'COMPOSED_NOT_ALLOWED', 'VIOLATION', 'stateId', r.stateId, `composed exemption is declared only for ${ctx.scope.composedExemptSystems.join(', ') || '(no system)'}; this row's system is ${sys || '(invalid)'}`, at);
            else add(R, 'COMPOSED_EXEMPT', 'EXEMPT', 'stateId', r.stateId, `${vc.value} landmark assembled from catalogue pieces (WG.63.02); no slot of its own`, at);
            continue;
        }
        if (ctx.scope.artRequiredClasses.includes(vc.value)) {
            if (!has(vis)) add(R, 'VISUAL_STATE_ID_MISSING', 'VIOLATION', 'stateId', r.stateId, `${vc.value} state has no visualStateId`, at);
            else if (vis.kind !== 'VALUE') add(R, 'VISUAL_STATE_ID_INVALID', 'VIOLATION', 'stateId', r.stateId, `visualStateId ${JSON.stringify(vis.raw)} is not one identifier`, at);
            if (!has(fam)) add(R, 'ASSET_FAMILY_MISSING', 'VIOLATION', 'stateId', r.stateId, `${vc.value} state has no assetFamily`, at);
            else if (fam.kind !== 'VALUE') add(R, 'ASSET_FAMILY_INVALID', 'VIOLATION', 'stateId', r.stateId, `assetFamily ${JSON.stringify(fam.raw)} is not one identifier`, at);
        } else if (vc.value === 'SIMULATION_ONLY' && (has(vis) || has(fam))) {
            add(R, 'SIMULATION_HAS_VISUAL', 'VIOLATION', 'stateId', r.stateId, `SIMULATION_ONLY state names ${[has(fam) ? `assetFamily ${fam.value}` : null, has(vis) ? `visualStateId ${vis.value}` : null].filter(Boolean).join(' and ')}`, at);
        }
    }
}

function ruleWsr03(ctx, add) {
    const R = 'WSR-03';
    const reg = displayPath(ctx.reg.file);
    for (const res of ctx.resolved) {
        const r = res.row;
        if (!artRequired(ctx, r) || isComposed(r) || !res.visualStateId) continue;
        const at = `${reg}:${r.line}`;
        const v = res.visualStateId;
        const cand = res.proposals.length ? `; candidates (PROPOSED, not used): ${res.proposals.join(', ')}` : '';
        if (!res.entries.length) {
            add(R, 'NO_CATALOGUE_ENTRY', 'GAP', 'stateId', r.stateId, `visualStateId ${v} resolves to no catalogue entry (by id, TYPE field, source id or ACCEPTED map row)${cand}`, at);
        } else if (!res.slots.length) {
            add(R, 'NO_SLOT', 'GAP', 'stateId', r.stateId, `visualStateId ${v} resolves to ${res.entries.map(x => x.entryId).join(', ')}, none of which (or their derivedFrom base) owns a paint slot`, at);
        } else if (!res.slots.some(s => s.template === 'OK')) {
            const all = res.slots.every(s => s.template === 'UNAVAILABLE');
            add(R, all ? 'TEMPLATE_UNAVAILABLE' : 'SLOT_NOT_IN_TEMPLATE', 'GAP', 'stateId', r.stateId, `visualStateId ${v}: no slot confirmed in the template output (${res.slots.map(s => `${s.slotId} ${s.template}`).join(', ')})`, at);
        }
        const viaEntry = res.entries.some(x => {
            const e = ctx.cat.entries.get(x.entryId);
            const list = isObj(e.sourceIds) && Array.isArray(e.sourceIds.catalog) ? e.sourceIds.catalog : [];
            return list.some(sid => ctx.wc.prefixed.has(sid));
        });
        if (!ctx.wc.bare.has(v) && !viaEntry) {
            add(R, 'NOT_IN_WORLD_CATALOG', 'GAP', 'stateId', r.stateId, `visualStateId ${v} is not an id in ${displayPath(ctx.files.worldCatalog)}, and no resolved catalogue entry cites one`, at);
        }
    }
    // Asset families of art-required rows must exist in the catalogue.
    const accepted = new Map(ctx.map.assetFamilies.filter(m => m.status === 'ACCEPTED').map(m => [m.assetFamily, m]));
    const byFam = new Map();
    for (const r of ctx.reg.rows) {
        const f = r.cells.assetFamily;
        if (artRequired(ctx, r) && !isComposed(r) && f && f.kind === 'VALUE') push(byFam, f.value, r);
    }
    for (const [fam, rows] of [...byFam].sort((a, b) => cmp(a[0], b[0]))) {
        const m = accepted.get(fam);
        if (ctx.cat.families.has(fam) || (m && ctx.cat.families.has(m.catalogueFamily))) continue;
        add(R, 'FAMILY_NOT_IN_CATALOGUE', 'GAP', 'assetFamily', fam, `${rows.length} art-required state(s) use it; no catalogue entry has family ${fam} and no ACCEPTED map row points it at a catalogue family (catalogue families: ${[...ctx.cat.families].sort(cmp).join(', ') || 'none'})`, `${reg}:${rows[0].line}`);
    }
    // The map must point at things that exist and be used.
    const mapFile = displayPath(ctx.files.map);
    const usedVis = new Set(ctx.reg.rows.map(r => r.cells.visualStateId).filter(c => c && c.kind === 'VALUE').map(c => c.value));
    const usedFam = new Set(ctx.reg.rows.map(r => r.cells.assetFamily).filter(c => c && c.kind === 'VALUE').map(c => c.value));
    for (const m of ctx.map.visualStates) {
        if (!mapTargets(ctx.cat, m).length) add(R, 'MAP_TARGET_UNKNOWN', 'VIOLATION', 'visualStateId', m.visualStateId, `map row (${m.status}) points at ${describeTarget(m)}, which is not in the catalogue`, mapFile);
        if (!usedVis.has(m.visualStateId)) add(R, 'MAP_UNUSED', 'VIOLATION', 'visualStateId', m.visualStateId, 'map row for a visualStateId no registry row uses', mapFile);
    }
    for (const m of ctx.map.assetFamilies) {
        if (!ctx.cat.families.has(m.catalogueFamily)) add(R, 'MAP_TARGET_UNKNOWN', 'VIOLATION', 'assetFamily', m.assetFamily, `map row (${m.status}) points at catalogue family ${m.catalogueFamily}, which no entry has`, mapFile);
        if (!usedFam.has(m.assetFamily)) add(R, 'MAP_UNUSED', 'VIOLATION', 'assetFamily', m.assetFamily, 'map row for an asset family no registry row uses', mapFile);
    }
}

function ruleWsr04(ctx, add) {
    const R = 'WSR-04';
    const undeclared = new Map();
    for (const s of ctx.cat.slots) {
        const e = ctx.cat.entries.get(s.entryId);
        const cls = classOf(e);
        const decl = ctx.scope.classes[cls];
        if (!decl) { push(undeclared, cls, s); continue; }
        if (decl.scope === 'NATURAL_WORLD') {
            if (!ctx.traced.has(e.id)) add(R, 'SLOT_NO_STATE', 'GAP', 'slotId', s.slotId, `${e.id} (${cls}, NATURAL_WORLD scope) traces to no registry state: no state's visualStateId resolves to it or to a variant derived from it`, catSource(ctx, e.id));
        } else {
            const kinds = ctx.scope.sourceClasses[decl.sourceClass].kinds;
            const src = isObj(e.sourceIds) ? e.sourceIds : {};
            if (!kinds.some(k => Array.isArray(src[k]) && src[k].length)) add(R, 'SLOT_SOURCE_UNDECLARED', 'VIOLATION', 'slotId', s.slotId, `${e.id} (${cls}) is declared NON_WORLD_STATE/${decl.sourceClass} but cites no ${kinds.join('/')} source id`, catSource(ctx, e.id));
        }
    }
    for (const [cls, list] of undeclared) {
        add(R, 'SLOT_CLASS_UNDECLARED', 'VIOLATION', 'class', cls, `${list.length} slot(s) of class ${cls} (first ${list[0].slotId}); ${displayPath(ctx.files.scope)} declares no scope for this class`, displayPath(ctx.files.scope));
    }
}

function ruleWsr05(ctx, add) {
    const R = 'WSR-05';
    for (const r of ctx.reg.rows) {
        const at = `${displayPath(ctx.reg.file)}:${r.line}`;
        const c = r.cells.performanceClass;
        if (!c || c.kind === 'EMPTY' || c.kind === 'NONE') add(R, 'PERFORMANCE_CLASS_MISSING', 'VIOLATION', 'stateId', r.stateId, c ? 'performanceClass cell is empty' : 'the seed table has no Performance Class column', at);
        else if (c.kind !== 'VALUE' || !ctx.reg.enums.performanceClass.includes(c.value)) add(R, 'PERFORMANCE_CLASS_INVALID', 'VIOLATION', 'stateId', r.stateId, `performanceClass ${JSON.stringify(c.raw)} is not in the enum (${ctx.reg.enums.performanceClass.join(', ')})`, at);
    }
}

function ruleSchema(ctx, add) {
    const R = 'WSR-SCHEMA';
    const reg = displayPath(ctx.reg.file);
    for (const f of ctx.reg.required) {
        if (OWN_RULE_FIELDS.has(f) || ctx.reg.columns.has(f)) continue;
        const lacking = ctx.reg.tables.filter(t => !t.fields.has(f));
        const n = lacking.reduce((s, t) => s + t.rows, 0);
        add(R, 'COLUMN_MISSING', 'VIOLATION', 'field', f, `the schema (${reg}:${ctx.reg.schemaLine}) requires ${f}; ${lacking.length === 1 ? 'the seed table' : `${lacking.length} seed tables`} at line ${lacking.map(t => t.line).join(', ')} ${lacking.length === 1 ? 'has' : 'have'} no column for it, so ${n} row(s) do not declare it`, `${reg}:${lacking[0].line}`);
    }
    const ids = new Set(ctx.reg.rows.map(r => r.stateId));
    for (const r of ctx.reg.rows) {
        const at = `${reg}:${r.line}`;
        if (!STATE_ID_RE.test(r.stateId)) add(R, 'STATE_ID_FORMAT', 'VIOLATION', 'stateId', r.stateId, 'stateId is not STATE_<SYSTEM>_<NAME> in upper case', at);
        const vc = r.cells.visualClass;
        if (vc !== undefined && (vc.kind !== 'VALUE' || !ctx.reg.enums.visualClass.includes(vc.value))) add(R, 'ENUM_INVALID', 'VIOLATION', 'stateId', r.stateId, `visualClass ${JSON.stringify(vc ? vc.raw : '')} is not in the enum (${ctx.reg.enums.visualClass.join(', ')})`, at);
        for (const f of BOOLEAN_FIELDS) {
            const c = r.cells[f];
            if (c && !(c.kind === 'VALUE' && /^(true|false)$/.test(c.value))) add(R, 'TYPE_INVALID', 'VIOLATION', 'stateId', r.stateId, `${f} ${JSON.stringify(c.raw)} is not true or false`, at);
        }
        const t = r.cells.transitionStates;
        if (t && t.kind !== 'EMPTY' && t.kind !== 'NONE') {
            const list = t.kind === 'VALUE' ? [t.value] : t.tokens;
            const unknown = list.filter(x => !ids.has(x));
            if (unknown.length) add(R, 'TRANSITION_UNKNOWN', 'VIOLATION', 'stateId', r.stateId, `transitionStates names unknown state(s): ${unknown.join(', ')}`, at);
        }
    }
}

function ruleManifestTemplate(ctx, add) {
    const R = 'MANIFEST-TEMPLATE';
    const { cat, tpl } = ctx;
    const tplSrc = sheetId => (tpl.mode === 'GENERATED' ? `${GENERATOR} (sheet ${sheetId})` : `${displayPath(tpl.dir)}/${(tpl.sheets.get(sheetId) || {}).file || sheetId + '.json'}`);
    for (const id of cat.dupSheets) add(R, 'DUPLICATE_SHEET_ID', 'VIOLATION', 'sheetId', id, 'sheetId appears more than once in the catalogue', catSource(ctx, id));
    for (const id of cat.dupEntries) add(R, 'DUPLICATE_ENTRY_ID', 'VIOLATION', 'entryId', id, 'entry id appears more than once in the catalogue', catSource(ctx, id));
    for (const id of cat.badSlots) add(R, 'SLOT_INVALID', 'VIOLATION', 'entryId', id, 'slot must be {sheetId, slotId, x, y, w, h} with non-negative integer x, y and positive integer w, h', catSource(ctx, id));
    for (const s of cat.dupSlots) add(R, 'DUPLICATE_SLOT_ID', 'VIOLATION', 'slotId', s.slotId, `slotId is owned by ${cat.slotById.get(s.slotId).entryId} and ${s.entryId}`, catSource(ctx, s.entryId));
    for (const s of cat.slots) {
        if (!cat.sheets.has(s.sheetId)) add(R, 'SLOT_SHEET_UNKNOWN', 'VIOLATION', 'slotId', s.slotId, `slot of ${s.entryId} is on sheet ${s.sheetId}, which is not a catalogue sheet`, catSource(ctx, s.entryId));
        const colon = s.slotId.lastIndexOf(':');
        if (colon < 0 || s.slotId.slice(0, colon) !== s.sheetId) add(R, 'SLOT_ID_SHEET_MISMATCH', 'VIOLATION', 'slotId', s.slotId, `slotId is not <sheetId>:<index> for sheet ${s.sheetId}`, catSource(ctx, s.entryId));
    }
    for (const x of tpl.refusals) {
        add(R, `TEMPLATE_REFUSED_${x.code}`, 'GAP', x.idKind, x.id, `the template generator refused ${x.level === 'catalogue' ? 'the catalogue' : `this ${x.level}`}: ${x.message}`, GENERATOR);
    }
    for (const b of tpl.bad) add(R, 'TEMPLATE_SIDECAR_INVALID', 'VIOLATION', 'file', b.file, b.why, b.file);
    for (const id of tpl.dupSheets) add(R, 'DUPLICATE_TEMPLATE_SHEET', 'VIOLATION', 'sheetId', id, 'two template sidecars describe this sheet', tplSrc(id));
    for (const s of tpl.dupSlots) add(R, 'DUPLICATE_TEMPLATE_SLOT', 'VIOLATION', 'slotId', s.slotId, `slotId appears twice in the template output (sheets ${tpl.slotById.get(s.slotId).sheetId}, ${s.sheetId})`, tplSrc(s.sheetId));
    const refusedSheets = new Set(tpl.refusals.filter(x => x.sheetId).map(x => x.sheetId));
    for (const [id, sh] of cat.sheets) {
        const t = tpl.sheets.get(id);
        if (!t) {
            const n = (cat.slotsBySheet.get(id) || []).length;
            const why = tpl.mode === 'GENERATED' ? (refusedSheets.has(id) ? 'the generator refused this sheet or slots on it' : 'the generator wrote no template for it') : 'no sidecar for it in the template folder';
            add(R, 'SHEET_NOT_IN_TEMPLATE', 'GAP', 'sheetId', id, `${why}; ${n} catalogue slot(s) on it are not compared`, catSource(ctx, id));
        } else if (!sameSheet(sh, t)) {
            add(R, 'SHEET_GEOMETRY_DIFFERS', 'VIOLATION', 'sheetId', id, `catalogue ${sh.kind} ${sh.w}x${sh.h} grid ${sh.gridPx} vs template ${t.kind} ${t.w}x${t.h} grid ${t.gridPx}`, tplSrc(id));
        }
    }
    for (const [id] of tpl.sheets) if (!cat.sheets.has(id)) add(R, 'SHEET_NOT_IN_CATALOGUE', 'VIOLATION', 'sheetId', id, 'template sheet that the catalogue does not list', tplSrc(id));
    for (const s of cat.slots) {
        if (!tpl.sheets.has(s.sheetId)) continue;
        const t = tpl.slotById.get(s.slotId);
        const rect = o => `${o.x},${o.y} ${o.w}x${o.h}`;
        if (!t) add(R, 'SLOT_NOT_IN_TEMPLATE', 'VIOLATION', 'slotId', s.slotId, `catalogue slot of ${s.entryId} (${rect(s)}) is missing from the template for ${s.sheetId}`, catSource(ctx, s.entryId));
        else if (t.sheetId !== s.sheetId) add(R, 'SLOT_SHEET_DIFFERS', 'VIOLATION', 'slotId', s.slotId, `catalogue sheet ${s.sheetId}, template sheet ${t.sheetId}`, catSource(ctx, s.entryId));
        else {
            if (!sameRect(s, t)) add(R, 'SLOT_RECT_DIFFERS', 'VIOLATION', 'slotId', s.slotId, `catalogue ${rect(s)} vs template ${rect(t)}`, catSource(ctx, s.entryId));
            if (t.entryId !== s.entryId) add(R, 'SLOT_ENTRY_DIFFERS', 'VIOLATION', 'slotId', s.slotId, `catalogue entry ${s.entryId} vs template entry ${t.entryId}`, catSource(ctx, s.entryId));
        }
    }
    for (const t of tpl.slots) if (!cat.slotById.has(t.slotId)) add(R, 'SLOT_NOT_IN_CATALOGUE', 'VIOLATION', 'slotId', t.slotId, `template slot on ${t.sheetId} (entry ${t.entryId}) that the catalogue does not have`, tplSrc(t.sheetId));
}

function rulePlaced(ctx, add) {
    const R = 'PLACED-IN-SLOT';
    const L = ctx.ledger;
    if (L) {
        const where = displayPath(ctx.files.approvals);
        if (L.errors.length) add(R, 'LEDGER_MALFORMED', 'VIOLATION', 'file', where, L.errors.slice(0, 5).map(e => `line ${e.line}: ${e.message}`).join('; '), where);
        for (const row of L.rows) {
            for (const id of row.ids) {
                if (!ctx.cat.entries.has(id) && !ctx.cat.slotById.has(id)) add(R, 'LEDGER_ID_UNKNOWN', 'VIOLATION', 'id', id, `${row.decision} row names an id that is neither a catalogue entry nor a catalogue slot`, `${where}:${row.line}`);
            }
        }
    }
    for (const p of ctx.placements) {
        const where = displayPath(p.file);
        if (!isObj(p.obj) || p.obj.schema !== SCHEMA.placement || !Array.isArray(p.obj.filled)) {
            add(R, 'PLACEMENT_REPORT_INVALID', 'VIOLATION', 'file', where, `not a ${SCHEMA.placement} report with filled[]`, where);
            continue;
        }
        p.obj.filled.forEach((f, i) => {
            const ok = isObj(f) && typeof f.sheetId === 'string' && [f.x, f.y, f.w, f.h].every(Number.isInteger);
            if (!ok) { add(R, 'PLACEMENT_REPORT_INVALID', 'VIOLATION', 'file', where, `filled[${i}] has no sheetId and integer x, y, w, h`, where); return; }
            const s = typeof f.slotId === 'string' ? ctx.cat.slotById.get(f.slotId) : null;
            const inside = s ? s.sheetId === f.sheetId && contains(s, f) : (ctx.cat.slotsBySheet.get(f.sheetId) || []).some(x => contains(x, f));
            if (!inside) {
                const id = typeof f.slotId === 'string' ? f.slotId : `${f.sheetId}@${f.x},${f.y},${f.w}x${f.h}`;
                const what = s ? `catalogue slot ${s.sheetId} ${s.x},${s.y} ${s.w}x${s.h}` : 'any catalogue slot on that sheet';
                add(R, 'PLACED_OUTSIDE_SLOT', 'VIOLATION', 'slotId', id, `placed region ${f.sheetId} ${f.x},${f.y} ${f.w}x${f.h} (entry ${f.entryId}) is not inside ${what}`, where);
            }
        });
    }
}

// ---------------------------------------------------------------- evaluation

function finalizeFindings(list) {
    const byKey = new Map();
    for (const f of list) {
        const k = keyOf(f);
        const prev = byKey.get(k);
        if (!prev) { byKey.set(k, Object.assign({}, f, { details: [f.detail], sources: [f.source] })); continue; }
        prev.details.push(f.detail);
        prev.sources.push(f.source);
    }
    const out = [...byKey.values()].map(f => ({
        rule: f.rule, code: f.code, severity: f.severity, idKind: f.idKind, id: f.id,
        detail: uniq(f.details).sort(cmp).join(' | '), source: uniq(f.sources).sort(cmp)[0]
    }));
    return out.sort((a, b) => RULES.indexOf(a.rule) - RULES.indexOf(b.rule) || cmp(a.code, b.code) || cmp(a.id, b.id));
}

function evaluate(input) {
    const reg = parseRegistry(input.registryText, input.files.registry);
    const cat = indexCatalogue(input.catalogue, input.catalogueText, input.files.catalogue);
    const scope = loadScope(input.scope, input.files.scope);
    const map = loadMap(input.map, input.files.map);
    const wc = worldCatalogIds(input.worldCatalog, input.files.worldCatalog);
    let rawTpl;
    if (input.templatesDir) rawTpl = Object.assign({ mode: 'DIR', source: displayPath(input.templatesDir), dir: input.templatesDir, runs: [], refusals: [] }, readSidecars(input.templatesDir));
    else rawTpl = generateTemplates(input.files.catalogue, input.catalogue, cat);
    const tpl = indexTemplates(rawTpl);
    let ledger = null;
    if (input.approvalsText !== null) {
        const V = require(path.join(REPO_ROOT, LEDGER_PARSER));
        ledger = V.parseLedger(input.approvalsText, displayPath(input.files.approvals));
    }
    const ctx = { files: input.files, reg, cat, scope, map, wc, tpl, ledger, placements: input.placements };
    resolveStates(ctx);
    const raw = [];
    const add = (rule, code, severity, idKind, id, detail, source) => raw.push({ rule, code, severity, idKind, id: String(id), detail, source });
    ruleWsr01(ctx, add);
    ruleWsr02(ctx, add);
    ruleWsr03(ctx, add);
    ruleWsr04(ctx, add);
    ruleWsr05(ctx, add);
    ruleSchema(ctx, add);
    ruleManifestTemplate(ctx, add);
    rulePlaced(ctx, add);
    ctx.findings = finalizeFindings(raw);
    return ctx;
}

function gate(findings, baseline) {
    const current = new Map(findings.filter(f => GATING.has(f.severity)).map(f => [keyOf(f), f]));
    const base = new Map(baseline.entries.map(b => [keyOf(b), b]));
    const fresh = [...current.values()].filter(f => !base.has(keyOf(f)));
    const stale = [...base.values()].filter(b => !current.has(keyOf(b))).sort((a, b) => cmp(keyOf(a), keyOf(b)));
    return { current, base, fresh, stale, matched: current.size - fresh.length };
}

// ---------------------------------------------------------------- counts and report

function computeCounts(ctx, g) {
    const { reg, cat, tpl } = ctx;
    const rows = reg.rows;
    const sysOf = r => { const c = r.cells.system; return !c ? '(none)' : c.kind === 'VALUE' ? c.value : c.kind === 'TEXT' ? c.tokens.join('+') : '(none)'; };
    const vcOf = r => { const c = r.cells.visualClass; return c && c.kind === 'VALUE' ? c.value : '(invalid)'; };
    const exempt = new Set(ctx.findings.filter(f => f.code === 'COMPOSED_EXEMPT').map(f => f.id));
    const art = ctx.resolved.filter(x => artRequired(ctx, x.row) && !isComposed(x.row));
    const fams = {};
    for (const x of art) {
        const f = x.row.cells.assetFamily;
        const k = f && f.kind === 'VALUE' ? f.value : '(none)';
        const o = fams[k] || (fams[k] = { states: 0, withCatalogueEntry: 0, withTemplateSlot: 0, inCatalogue: ctx.cat.families.has(k) });
        o.states++;
        if (x.entries.length) o.withCatalogueEntry++;
        if (x.slots.some(s => s.template === 'OK')) o.withTemplateSlot++;
    }
    const classes = {};
    for (const s of cat.slots) {
        const e = cat.entries.get(s.entryId);
        const cls = classOf(e);
        const d = ctx.scope.classes[cls];
        const o = classes[cls] || (classes[cls] = { scope: d ? d.scope : 'UNDECLARED', sourceClass: d && d.sourceClass ? d.sourceClass : null, slots: 0, tracing: 0 });
        o.slots++;
        if (ctx.traced.has(e.id)) o.tracing++;
    }
    const byScope = {};
    for (const o of Object.values(classes)) { const b = byScope[o.scope] || (byScope[o.scope] = { slots: 0, tracing: 0 }); b.slots += o.slots; b.tracing += o.tracing; }
    const compared = cat.slots.filter(s => tpl.sheets.has(s.sheetId));
    const agree = compared.filter(s => templateStatus(ctx, s) === 'OK' && tpl.slotById.get(s.slotId).entryId === s.entryId);
    const mt = ctx.findings.filter(f => f.rule === 'MANIFEST-TEMPLATE');
    const rules = {};
    for (const r of RULES) rules[r] = { VIOLATION: 0, GAP: 0, EXEMPT: 0, baselined: 0, new: 0 };
    for (const f of ctx.findings) {
        rules[f.rule][f.severity]++;
        if (GATING.has(f.severity)) rules[f.rule][g.base.has(keyOf(f)) ? 'baselined' : 'new']++;
    }
    const wcIds = [...ctx.wc.prefixed].sort(cmp);
    const idxIds = cat.catalogIndex ? cat.catalogIndex.slice().sort(cmp) : null;
    const forbidden = uniq(cat.forbiddenBiomes.map(String)).sort(cmp);
    return {
        registry: {
            seedTables: reg.tables.map(t => ({ line: t.line, rows: t.rows })),
            rows: rows.length, states: new Set(rows.map(r => r.stateId)).size,
            bySystem: countBy(rows, sysOf), byVisualClass: countBy(rows, vcOf),
            artRequired: art.length, composedExempt: exempt.size,
            withVisualStateId: art.filter(x => x.visualStateId).length,
            withCatalogueEntry: art.filter(x => x.entries.length).length,
            withSlot: art.filter(x => x.slots.length).length,
            withTemplateSlot: art.filter(x => x.slots.some(s => s.template === 'OK')).length,
            withWorldCatalogId: art.filter(x => x.visualStateId && ctx.wc.bare.has(x.visualStateId)).length,
            byAssetFamily: sortKeys(fams),
            unknownColumns: reg.unknownColumns.slice(),
            forbiddenBiomeStates: rows.map(r => {
                const toks = new Set([r.stateId, r.cells.visualStateId && r.cells.visualStateId.value || ''].join('_').toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean));
                const hit = forbidden.filter(b => b.split('_').every(t => toks.has(t)));
                return hit.length ? { stateId: r.stateId, forbiddenBiomes: hit } : null;
            }).filter(Boolean)
        },
        catalogue: {
            sheets: cat.sheets.size, sheetsByKind: countBy([...cat.sheets.values()], s => String(s.kind)),
            entries: cat.entries.size, slots: cat.slots.length,
            slotsTracingToState: cat.slots.filter(s => ctx.traced.has(s.entryId)).length,
            slotsByScope: sortKeys(byScope), slotsByClass: sortKeys(classes)
        },
        worldCatalog: {
            ids: wcIds.length,
            catalogueSourceIdIndex: idxIds === null ? 'ABSENT' : (wcIds.join('\n') === idxIds.join('\n') ? 'EQUAL' : 'DIFFERENT'),
            onlyInWorldCatalog: idxIds === null ? [] : wcIds.filter(x => !idxIds.includes(x)),
            onlyInCatalogueIndex: idxIds === null ? [] : idxIds.filter(x => !ctx.wc.prefixed.has(x))
        },
        manifestTemplate: {
            catalogueSheets: cat.sheets.size, templateSheets: tpl.sheets.size,
            sheetsCompared: [...cat.sheets.keys()].filter(id => tpl.sheets.has(id)).length,
            catalogueSlots: cat.slots.length, templateSlots: tpl.slots.length,
            slotsCompared: compared.length, slotsAgree: agree.length,
            slotsOnSheetsWithoutTemplate: cat.slots.length - compared.length,
            generatorRefusals: tpl.refusals.length,
            refusalsByCode: countBy(tpl.refusals, x => x.code),
            findingsByCode: countBy(mt, f => f.code)
        },
        placed: {
            approvals: ctx.ledger ? displayPath(ctx.files.approvals) : null,
            ledgerSection: ctx.ledger ? (ctx.ledger.present ? 'PRESENT' : 'ABSENT') : 'NO_FILE',
            ledgerRows: ctx.ledger ? ctx.ledger.rows.length : 0,
            placementReports: ctx.placements.length,
            placedRegions: ctx.placements.reduce((n, p) => n + (isObj(p.obj) && Array.isArray(p.obj.filled) ? p.obj.filled.length : 0), 0)
        },
        rules,
        gate: { baselineEntries: g.base.size, gatingFindings: g.current.size, matched: g.matched, new: g.fresh.length, stale: g.stale.length }
    };
}

// JSON with the listed arrays written one element per line (reviewable diffs, stable bytes).
function jsonLines(obj, lineArrays) {
    const out = ['{'];
    const keys = Object.keys(obj);
    keys.forEach((k, i) => {
        const v = obj[k];
        const comma = i < keys.length - 1 ? ',' : '';
        if (lineArrays.includes(k) && Array.isArray(v) && v.length) {
            out.push(`  ${JSON.stringify(k)}: [`);
            v.forEach((x, j) => out.push(`    ${JSON.stringify(x)}${j < v.length - 1 ? ',' : ''}`));
            out.push(`  ]${comma}`);
        } else {
            out.push(`  ${JSON.stringify(k)}: ${JSON.stringify(v, null, 2).replace(/\n/g, '\n  ')}${comma}`);
        }
    });
    out.push('}');
    return out.join('\n') + '\n';
}

function md(v) { return String(v === null || v === undefined ? '' : v).replace(/\|/g, '\\|').replace(/\r?\n/g, ' '); }

function buildReport(ctx, g) {
    const counts = computeCounts(ctx, g);
    const f = ctx.files;
    const tpl = ctx.tpl;
    const inputs = {
        registry: displayPath(f.registry), catalogue: displayPath(f.catalogue), worldCatalog: displayPath(f.worldCatalog),
        approvals: ctx.ledger ? displayPath(f.approvals) : null, scope: displayPath(f.scope), map: displayPath(f.map),
        baseline: displayPath(f.baseline), placements: ctx.placements.map(p => displayPath(p.file)),
        templates: { mode: tpl.mode, source: tpl.source, runs: tpl.runs, ignoredFiles: tpl.ignored || [] }
    };
    const parameters = {
        atlasOfRecord: ATLAS_OF_RECORD,
        artRequiredClasses: ctx.scope.artRequiredClasses.slice(),
        composedExemptSystems: ctx.scope.composedExemptSystems.slice(),
        resolution: ['ID (entry id, or TYPE field)', 'SOURCE (bare source id)', 'MAP (ACCEPTED rows only)'],
        scopeClasses: Object.keys(ctx.scope.classes).sort(cmp).map(k => ({ class: k, scope: ctx.scope.classes[k].scope, sourceClass: ctx.scope.classes[k].sourceClass || null })),
        sourceClasses: sortKeys(Object.fromEntries(Object.entries(ctx.scope.sourceClasses).map(([k, v]) => [k, v.kinds.slice()])))
    };
    const states = ctx.resolved.map(x => ({
        stateId: x.row.stateId, line: x.row.line,
        system: x.row.cells.system ? x.row.cells.system.raw.replace(/`/g, '') : null,
        visualClass: x.row.cells.visualClass ? x.row.cells.visualClass.raw.replace(/`/g, '') : null,
        assetFamily: x.row.cells.assetFamily ? x.row.cells.assetFamily.raw.replace(/`/g, '') : null,
        visualStateId: x.row.cells.visualStateId ? x.row.cells.visualStateId.raw.replace(/`/g, '') : null,
        performanceClass: x.row.cells.performanceClass ? x.row.cells.performanceClass.raw.replace(/`/g, '') : null,
        entries: x.entries, slots: x.slots, proposals: x.proposals,
        worldCatalogId: !!x.visualStateId && ctx.wc.bare.has(x.visualStateId)
    }));
    const findings = ctx.findings.map(x => Object.assign({}, x, { gate: GATING.has(x.severity) ? (g.base.has(keyOf(x)) ? 'BASELINED' : 'NEW') : 'NOT_GATING' }));
    const report = { schema: SCHEMA.report, tool: TOOL, inputs, parameters, notCheckable: NOT_CHECKABLE, counts, states, findings, staleBaseline: g.stale.map(b => ({ rule: b.rule, code: b.code, id: b.id, reason: b.reason })) };
    return { json: jsonLines(report, ['states', 'findings', 'staleBaseline']), md: reportMarkdown(report) };
}

function reportMarkdown(rep) {
    const c = rep.counts;
    const L = [];
    const table = (head, rows) => { L.push(`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`); for (const r of rows) L.push(`| ${r.map(md).join(' | ')} |`); L.push(''); };
    L.push('# World-State Registry integrity report (WG.33.01)', '');
    L.push(`Generated by \`${rep.tool}\`. Deterministic: rerunning on the same inputs gives the same bytes. No image data. Machine form: \`${REPORT_JSON}\`.`, '');
    L.push('## Inputs', '');
    const i = rep.inputs;
    table(['Input', 'Path'], [
        ['Registry', i.registry], ['Catalogue (atlas of record)', i.catalogue], ['WorldCatalog', i.worldCatalog],
        ['Approvals ledger', i.approvals || '(none)'], ['Scope parameter', i.scope], ['Visual-state map', i.map], ['Baseline', i.baseline],
        ['Placement reports', i.placements.join(', ') || '(none given)'],
        ['Template slot map', `${i.templates.mode}: ${i.templates.source}`]
    ]);
    if (i.templates.runs.length) {
        L.push('Template generator runs (each in a fresh OS temp folder, deleted afterwards):', '');
        table(['Run', 'Catalogue', 'Sheets', 'Exit', 'Refusals'], i.templates.runs.map(r => [r.run, r.catalogue, r.sheets, r.exit, r.refusals]));
    }
    L.push('## Parameters', '');
    L.push(`- Atlas of record: ${rep.parameters.atlasOfRecord}`);
    L.push(`- Art-required visual classes (WSR-02, WSR-03): ${rep.parameters.artRequiredClasses.join(', ')}`);
    L.push(`- Composed exemption allowed for systems: ${rep.parameters.composedExemptSystems.join(', ') || '(none)'}`);
    L.push(`- Resolution methods: ${rep.parameters.resolution.join('; ')}`);
    L.push(`- Source classes (NON_WORLD_STATE slots must cite one of these source kinds): ${Object.entries(rep.parameters.sourceClasses).map(([k, v]) => `${k} = ${v.join('/')}`).join('; ')}`, '');
    L.push('## Not checkable statically', '');
    for (const n of rep.notCheckable) L.push(`- ${n.rule}: ${n.what} ${n.why}`);
    L.push('');
    L.push('## Gate', '');
    table(['Baseline entries', 'Gating findings', 'Baselined', 'New', 'Stale baseline entries'], [[c.gate.baselineEntries, c.gate.gatingFindings, c.gate.matched, c.gate.new, c.gate.stale]]);
    L.push('## Findings per rule', '');
    table(['Rule', 'Violations', 'Gaps', 'Exempt', 'Baselined', 'New'], Object.entries(c.rules).map(([r, o]) => [r, o.VIOLATION, o.GAP, o.EXEMPT, o.baselined, o.new]));
    L.push('## Registry', '');
    const rg = c.registry;
    L.push(`Seed tables read (every table with a State ID column): ${rg.seedTables.map(t => `line ${t.line} (${t.rows} rows)`).join(', ')}.`, '');
    table(['Rows', 'States', 'Art-required (not composed)', 'Composed exempt', 'With visualStateId', 'Resolving to a catalogue entry', 'With a slot', 'With a slot confirmed in the template', 'visualStateId is a WorldCatalog id'],
        [[rg.rows, rg.states, rg.artRequired, rg.composedExempt, rg.withVisualStateId, rg.withCatalogueEntry, rg.withSlot, rg.withTemplateSlot, rg.withWorldCatalogId]]);
    L.push('Per system:', '');
    table(['System', 'Rows'], Object.entries(rg.bySystem));
    L.push('Per visual class:', '');
    table(['Visual class', 'Rows'], Object.entries(rg.byVisualClass));
    L.push('Per asset family (art-required rows):', '');
    table(['Asset family', 'States', 'Resolving to an entry', 'With a template slot', 'Family in catalogue'], Object.entries(rg.byAssetFamily).map(([k, o]) => [k, o.states, o.withCatalogueEntry, o.withTemplateSlot, o.inCatalogue ? 'yes' : 'no']));
    if (rg.unknownColumns.length) L.push(`Seed-table columns not mapped to a schema field: ${rg.unknownColumns.join(', ')}`, '');
    L.push(`States whose id or visual state names a biome the catalogue lists as forbidden (\`biomes.forbidden\`): ${rg.forbiddenBiomeStates.length ? rg.forbiddenBiomeStates.map(x => `${x.stateId} (${x.forbiddenBiomes.join(', ')})`).join(', ') : 'none'}`, '');
    L.push('## Catalogue slots', '');
    const ct = c.catalogue;
    table(['Sheets', 'Entries', 'Slots', 'Slots tracing to a state'], [[ct.sheets, ct.entries, ct.slots, ct.slotsTracingToState]]);
    table(['Sheet kind', 'Sheets'], Object.entries(ct.sheetsByKind));
    L.push('Per scope (tools/wsr/scope.json; the spec text of WSR-04 would require every slot to trace to a state):', '');
    table(['Scope', 'Slots', 'Tracing to a state'], Object.entries(ct.slotsByScope).map(([k, o]) => [k, o.slots, o.tracing]));
    L.push('Per class (`<family>:<category>`):', '');
    table(['Class', 'Scope', 'Source class', 'Slots', 'Tracing to a state'], Object.entries(ct.slotsByClass).map(([k, o]) => [k, o.scope, o.sourceClass || '', o.slots, o.tracing]));
    L.push('## WorldCatalog', '');
    const w = c.worldCatalog;
    L.push(`${w.ids} WorldCatalog ids read (the lists the catalogue ingests). Against the catalogue's \`sourceIdIndex.catalog\`: ${w.catalogueSourceIdIndex}.${w.onlyInWorldCatalog.length ? ` Only in the WorldCatalog: ${w.onlyInWorldCatalog.join(', ')}.` : ''}${w.onlyInCatalogueIndex.length ? ` Only in the catalogue index: ${w.onlyInCatalogueIndex.join(', ')}.` : ''}`, '');
    L.push('## Manifest <-> template', '');
    const m = c.manifestTemplate;
    table(['Catalogue sheets', 'Template sheets', 'Sheets compared', 'Catalogue slots', 'Template slots', 'Slots compared', 'Slots agreeing', 'Slots on sheets without a template', 'Generator refusals'],
        [[m.catalogueSheets, m.templateSheets, m.sheetsCompared, m.catalogueSlots, m.templateSlots, m.slotsCompared, m.slotsAgree, m.slotsOnSheetsWithoutTemplate, m.generatorRefusals]]);
    if (Object.keys(m.refusalsByCode).length) table(['Generator refusal code', 'Count'], Object.entries(m.refusalsByCode));
    if (Object.keys(m.findingsByCode).length) table(['Finding code', 'Count'], Object.entries(m.findingsByCode));
    L.push('## Placed art', '');
    const p = c.placed;
    L.push(`Approvals file: ${p.approvals || '(none)'}; SHA-256 ledger section: ${p.ledgerSection}; ledger rows: ${p.ledgerRows}. Placement reports given: ${p.placementReports}; placed regions: ${p.placedRegions}.`, '');
    L.push('## States', '');
    table(['State', 'Line', 'System', 'Visual class', 'Family', 'Visual state', 'Perf. class', 'Entries', 'Slots (template)', 'Candidates (PROPOSED)'],
        rep.states.map(s => [s.stateId, s.line, s.system, s.visualClass, s.assetFamily, s.visualStateId, s.performanceClass || '(no column)',
            s.entries.length ? s.entries.map(e => `${e.entryId} (${e.methods.join('+')})`).join(', ') : '-',
            s.slots.length ? s.slots.map(x => `${x.slotId} ${x.template}`).join(', ') : '-',
            s.proposals.join(', ') || '-']));
    L.push('## Findings', '');
    L.push(`${rep.findings.length} finding(s). Gate column: BASELINED (in the baseline), NEW (fails the gate), NOT_GATING (exempt).`, '');
    for (const r of RULES) {
        const list = rep.findings.filter(x => x.rule === r);
        if (!list.length) continue;
        L.push(`### ${r} (${list.length})`, '');
        table(['Code', 'Severity', 'Gate', 'Id', 'Detail', 'Source'], list.map(x => [x.code, x.severity, x.gate, `${x.idKind} ${x.id}`, x.detail, x.source]));
    }
    L.push('## Stale baseline entries', '');
    if (rep.staleBaseline.length) table(['Rule', 'Code', 'Id', 'Reason'], rep.staleBaseline.map(b => [b.rule, b.code, b.id, b.reason]));
    else L.push('None.', '');
    return L.join('\n').replace(/\n+$/, '') + '\n';
}

// ---------------------------------------------------------------- command line

const USAGE = [
    'usage: node tools/verify_world_state_registry.js [--registry <md>] [--catalogue <json>] [--templates <dir>]',
    '         [--world-catalog <json>] [--approvals <md>] [--placements <json>]... [--scope <json>] [--map <json>]',
    '         [--baseline <json>] [--report <dir>] [--check | --strict]',
    '  default: gate against the baseline (exit 1 on a new or stale gap)',
    '  --strict  ignore the baseline; exit 1 on any violation or gap',
    '  --check   exit 1 if the committed report (--report dir, default tools/wsr/report) differs from a fresh one',
    '  --report  write wsr_report.json and WSR_REPORT.md into <dir>'
].join('\n');

function parseArgs(argv) {
    const o = { placements: [] };
    const valued = {
        '--registry': 'registry', '--catalogue': 'catalogue', '--templates': 'templates', '--world-catalog': 'worldCatalog',
        '--approvals': 'approvals', '--placements': 'placements', '--scope': 'scope', '--map': 'map', '--baseline': 'baseline', '--report': 'report'
    };
    for (let i = 0; i < argv.length; i++) {
        let a = argv[i], v;
        const eq = a.indexOf('=');
        if (a.startsWith('--') && eq > 0) { v = a.slice(eq + 1); a = a.slice(0, eq); }
        if (a === '--help' || a === '-h') { o.help = true; continue; }
        if (a === '--check' || a === '--strict') {
            if (v !== undefined) throw new Error(`${a} takes no value`);
            o[a.slice(2)] = true;
            continue;
        }
        const k = valued[a];
        if (!k) throw new Error(`unknown argument ${argv[i]}`);
        if (v === undefined) { v = argv[++i]; if (v === undefined) throw new Error(`${a} needs a value`); }
        if (k === 'placements') o.placements.push(v);
        else if (o[k] !== undefined) throw new Error(`${a} given twice`);
        else o[k] = v;
    }
    if (o.check && o.strict) throw new Error('--check and --strict cannot be combined');
    return o;
}

function loadInputs(opts) {
    const p = k => (opts[k] !== undefined ? path.resolve(opts[k]) : path.join(REPO_ROOT, DEFAULTS[k]));
    const files = { registry: p('registry'), catalogue: p('catalogue'), worldCatalog: p('worldCatalog'), approvals: p('approvals'), scope: p('scope'), map: p('map'), baseline: p('baseline'), report: p('report') };
    let approvalsText = null;
    if (opts.approvals !== undefined || fs.existsSync(files.approvals)) approvalsText = readText(files.approvals, 'approvals file');
    const catalogueText = readText(files.catalogue, 'catalogue');
    return {
        files,
        registryText: readText(files.registry, 'registry'),
        catalogueText,
        catalogue: parseJsonText(catalogueText, files.catalogue, 'catalogue'),
        worldCatalog: readJson(files.worldCatalog, 'WorldCatalog'),
        scope: readJson(files.scope, 'scope'),
        map: readJson(files.map, 'visual-state map'),
        approvalsText,
        placements: opts.placements.map(f => ({ file: path.resolve(f), obj: readJson(path.resolve(f), 'placement report') })),
        templatesDir: opts.templates !== undefined ? path.resolve(opts.templates) : null
    };
}

// Runs the checker. Returns {code, lines, ctx, report}; prints nothing itself.
function runChecker(argv) {
    const lines = [];
    const out = s => lines.push(s);
    let opts;
    try { opts = parseArgs(argv); } catch (err) { out(`ERROR: ${err.message}`); out(USAGE); return { code: 2, lines }; }
    if (opts.help) { out(USAGE); return { code: 0, lines }; }
    let ctx, g, report, baseline;
    try {
        const input = loadInputs(opts);
        baseline = loadBaseline(input.files.baseline);
        ctx = evaluate(input);
        g = gate(ctx.findings, baseline);
        report = buildReport(ctx, g);
    } catch (err) {
        if (err instanceof InputError) { out(`ERROR: ${err.message}`); return { code: 2, lines }; }
        throw err;
    }
    const c = computeCounts(ctx, g);
    const f = ctx.files;
    out(`WSR: ${displayPath(f.registry)}: ${c.registry.rows} rows, ${c.registry.states} states; ${displayPath(f.catalogue)}: ${c.catalogue.sheets} sheets, ${c.catalogue.slots} slots`);
    const t = ctx.tpl;
    out(`TEMPLATES: ${t.mode} (${t.source}); ${t.runs.map(r => `run ${r.run}: ${r.sheets} sheet(s) exit ${r.exit}${r.refusals ? `, ${r.refusals} refusal(s)` : ''}`).join('; ') || 'sidecars read'}; ${c.manifestTemplate.templateSheets} template sheet(s), ${c.manifestTemplate.slotsCompared} slot(s) compared, ${c.manifestTemplate.slotsAgree} agree`);
    for (const r of RULES) { const o = c.rules[r]; out(`RULE ${r}: ${o.VIOLATION} violation(s), ${o.GAP} gap(s), ${o.EXEMPT} exempt`); }
    const reportDir = f.report;
    if (opts.check) {
        const diffs = [];
        for (const [name, text] of [[REPORT_JSON, report.json], [REPORT_MD, report.md]]) {
            const file = path.join(reportDir, name);
            if (!fs.existsSync(file)) diffs.push(`${name} (missing)`);
            else if (lf(fs.readFileSync(file, 'utf8')) !== text) diffs.push(name);
        }
        for (const d of diffs) out(`DIFF ${displayPath(reportDir)}/${d}`);
        out(diffs.length ? `CHECK: FAILED (${diffs.length} report file(s) differ from a fresh run; rerun with --report ${displayPath(reportDir)})` : `CHECK: OK (${displayPath(reportDir)} matches a fresh run)`);
        return { code: diffs.length ? 1 : 0, lines, ctx, report };
    }
    if (opts.report !== undefined) {
        fs.mkdirSync(reportDir, { recursive: true });
        fs.writeFileSync(path.join(reportDir, REPORT_JSON), report.json);
        fs.writeFileSync(path.join(reportDir, REPORT_MD), report.md);
        out(`WROTE ${displayPath(path.join(reportDir, REPORT_JSON))} and ${REPORT_MD}`);
    }
    if (opts.strict) {
        const gating = ctx.findings.filter(x => GATING.has(x.severity));
        for (const x of gating) out(`GAP ${x.rule} ${x.code} ${x.id}: ${x.detail} (${x.source})`);
        out(gating.length ? `STRICT: FAILED (${gating.length} violation(s) or gap(s); the baseline is ignored)` : 'STRICT: OK (no violation or gap)');
        return { code: gating.length ? 1 : 0, lines, ctx, report };
    }
    for (const x of g.fresh) out(`NEW ${x.rule} ${x.code} ${x.id}: ${x.detail} (${x.source})`);
    for (const b of g.stale) out(`STALE ${b.rule} ${b.code} ${b.id}: baseline entry no longer occurs; remove it (reason was: ${b.reason})`);
    out(`BASELINE ${displayPath(f.baseline)}: ${g.base.size} entr${g.base.size === 1 ? 'y' : 'ies'}, ${g.matched} matched, ${g.fresh.length} new, ${g.stale.length} stale`);
    const failed = g.fresh.length > 0 || g.stale.length > 0;
    out(failed ? `GATE: FAILED (${g.fresh.length} new, ${g.stale.length} stale)` : 'GATE: OK (every violation and gap is baselined; no stale entry)');
    return { code: failed ? 1 : 0, lines, ctx, report };
}

function main(argv) {
    let res;
    try { res = runChecker(argv); } catch (err) {
        process.stderr.write(`ERROR: ${err && err.stack ? err.stack : err}\n`);
        return 2;
    }
    for (const l of res.lines) (res.code === 2 && /^ERROR|^usage/.test(l) ? process.stderr : process.stdout).write(l + '\n');
    return res.code;
}

module.exports = {
    runChecker, evaluate, gate, parseRegistry, parseCell, indexCatalogue, worldCatalogIds, generateTemplates, parseRefusals,
    loadBaseline, buildReport, InputError, RULES, SCHEMA, DEFAULTS, REPORT_JSON, REPORT_MD, GENERATOR
};

if (require.main === module) process.exitCode = main(process.argv.slice(2));
