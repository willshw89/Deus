#!/usr/bin/env node
'use strict';
// tools/art/test_catalogue.js: done tests for the DEUS art catalogue (WG.20.02).
//
//   node tools/art/test_catalogue.js                                   run every check (exit 1 on any FAIL)
//   UF_TEST_PROVOKE=catalogue.<check> node tools/art/test_catalogue.js provoke one check: it must print FAIL
//
// Every check has a provocation that breaks exactly what the check guards, so each check is seen able
// to fail (ENGINE_RULES §6). The FAIL rules of build_catalogue.js are checked against the fixture
// catalogue in tools/art/fixtures/catalogue/mini/ patched by one case file per rule
// (tools/art/fixtures/catalogue/cases/); provoking a rule check switches that rule off in the validator.
// No image is read or written here; the catalogue holds no image data.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const B = require('./build_catalogue.js');

const ROOT = path.resolve(__dirname, '..', '..');
const FIX = path.join(__dirname, 'fixtures', 'catalogue');
const PROVOKE = process.env.UF_TEST_PROVOKE || '';
const provoked = name => PROVOKE === 'catalogue.' + name;
const rel = p => path.join(ROOT, p);
const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const clone = o => JSON.parse(JSON.stringify(o));

const results = [];
const names = [];
function check(name, fn) {
    names.push(name);
    let r;
    try { r = fn(provoked(name)); } catch (e) { r = { ok: false, detail: 'threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e) }; }
    results.push(Object.assign({ name }, r));
    console.log(`${r.ok ? 'PASS' : 'FAIL'} catalogue.${name}: ${r.detail}`);
}

// ---------------------------------------------------------------- shared state
let _real = null;
const realBuild = () => (_real = _real || B.build({ root: ROOT }));
const committed = p => fs.readFileSync(rel(p));
let _cat = null;
const committedCatalogue = () => (_cat = _cat || JSON.parse(committed(B.OUT.catalogue).toString('utf8')));
function geometryWith(fixtureName) {
    const f = readJson(path.join(FIX, 'geometry', fixtureName + '.json'));
    const g = readJson(rel(f.base));
    const merge = (dst, src) => { for (const [k, v] of Object.entries(src)) { if (v && typeof v === 'object' && !Array.isArray(v) && dst[k] && typeof dst[k] === 'object' && !Array.isArray(dst[k])) merge(dst[k], v); else dst[k] = v; } };
    merge(g, f.set);
    return { g, fixture: f };
}
const byId = cat => new Map(cat.entries.map(e => [e.id, e]));

// ---------------------------------------------------------------- JSON Schema (2020-12 subset)
const SCHEMA_KEYWORDS = new Set(['$schema', '$id', 'title', 'description', 'type', 'required', 'additionalProperties', 'properties', '$defs', '$ref', 'enum', 'const', 'pattern', 'minimum', 'minLength', 'items', 'minItems']);
function schemaKeywordErrors(schema) {
    const errs = [];
    const walk = (s, p, isMap) => {
        if (!s || typeof s !== 'object') return;
        if (isMap) { for (const [k, v] of Object.entries(s)) walk(v, `${p}/${k}`, false); return; }
        for (const [k, v] of Object.entries(s)) {
            if (!SCHEMA_KEYWORDS.has(k)) errs.push(`${p}: unsupported keyword ${k}`);
            if (k === 'properties' || k === '$defs') walk(v, `${p}/${k}`, true);
            else if (k === 'items') walk(v, `${p}/items`, false);
        }
    };
    walk(schema, '#', false);
    return errs;
}
function validateSchema(schema, data, limit) {
    const errs = [];
    limit = limit || 50;
    const resolve = ref => ref.replace(/^#\//, '').split('/').reduce((s, k) => s[k], schema);
    const typeOf = v => v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v;
    const typeOk = (t, v) => { const vt = typeOf(v); return t === 'number' ? vt === 'number' || vt === 'integer' : t === vt; };
    const push = m => { if (errs.length < limit) errs.push(m); };
    const walk = (s, v, p) => {
        if (s.$ref) return walk(resolve(s.$ref), v, p);
        if (s.type) { const ts = Array.isArray(s.type) ? s.type : [s.type]; if (!ts.some(t => typeOk(t, v))) { push(`${p}: ${typeOf(v)} is not ${ts.join('|')}`); return; } }
        if (Object.prototype.hasOwnProperty.call(s, 'const') && JSON.stringify(v) !== JSON.stringify(s.const)) push(`${p}: not ${JSON.stringify(s.const)}`);
        if (s.enum && !s.enum.some(x => JSON.stringify(x) === JSON.stringify(v))) push(`${p}: ${JSON.stringify(v)} is not in the enum`);
        if (typeof v === 'string') {
            if (s.pattern && !new RegExp(s.pattern).test(v)) push(`${p}: "${v}" does not match ${s.pattern}`);
            if (s.minLength !== undefined && v.length < s.minLength) push(`${p}: shorter than ${s.minLength}`);
        }
        if (typeof v === 'number' && s.minimum !== undefined && v < s.minimum) push(`${p}: ${v} < ${s.minimum}`);
        if (Array.isArray(v)) {
            if (s.minItems !== undefined && v.length < s.minItems) push(`${p}: fewer than ${s.minItems} items`);
            if (s.items) v.forEach((x, i) => walk(s.items, x, `${p}[${i}]`));
        }
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            for (const r of s.required || []) if (!Object.prototype.hasOwnProperty.call(v, r)) push(`${p}: missing ${r}`);
            if (s.properties) for (const [k, sub] of Object.entries(s.properties)) if (Object.prototype.hasOwnProperty.call(v, k)) walk(sub, v[k], `${p}.${k}`);
            if (s.additionalProperties === false) for (const k of Object.keys(v)) if (!s.properties || !Object.prototype.hasOwnProperty.call(s.properties, k)) push(`${p}: unexpected property ${k}`);
        }
    };
    walk(schema, data, '$');
    return errs;
}

// ---------------------------------------------------------------- fixture patches
function selectIn(arr, sel) {
    if (sel.index !== undefined) return sel.index < 0 ? arr.length + sel.index : sel.index;
    const [k, v] = Object.entries(sel)[0];
    const i = arr.findIndex(x => x[k] === v);
    if (i < 0) throw new Error(`fixture selector ${JSON.stringify(sel)} matched nothing`);
    return i;
}
function applyPatch(doc, patch) {
    for (const op of patch) {
        let parent = doc;
        const p = op.path;
        for (let i = 0; i < p.length - 1; i++) parent = parent[typeof p[i] === 'object' ? selectIn(parent, p[i]) : p[i]];
        const last = p[p.length - 1];
        const key = typeof last === 'object' ? selectIn(parent, last) : last;
        if (op.op === 'set') parent[key] = clone(op.value);
        else if (op.op === 'delete') delete parent[key];
        else if (op.op === 'push') parent[key].push(clone(op.value));
        else if (op.op === 'dup') parent.push(clone(parent[key]));
        else throw new Error('unknown op ' + op.op);
    }
    return doc;
}
function miniContext() {
    const c = readJson(path.join(FIX, 'mini', 'context.json'));
    return { geometry: c.geometry, rows: new Map(c.rows.map(r => [r.rowId, r])), rampIds: new Set(c.rampIds), rmmzSheets: c.rmmzSheets };
}

// ================================================================= checks
// 1. The schema validates catalogue.json (and the validator rejects a broken copy).
check('schema', p => {
    const schema = readJson(rel('art/catalogue/catalogue.schema.json'));
    const kw = schemaKeywordErrors(schema);
    const cat = committedCatalogue();
    const broken = clone({ schemaVersion: cat.schemaVersion, tileSizePx: cat.tileSizePx, geometry: cat.geometry, palette: cat.palette, scaleChart: cat.scaleChart, sources: cat.sources, sheets: cat.sheets.slice(0, 1), entries: cat.entries.slice(0, 3), outOfScope: [] });
    delete broken.entries[0].status;
    broken.entries[1].alphaMode = 'PARTIAL';
    const neg = validateSchema(schema, broken);
    const errs = validateSchema(schema, p ? broken : cat);
    const ok = !kw.length && schema.$id === B.SCHEMA_VERSION && /2020-12/.test(schema.$schema) && errs.length === 0 && neg.length >= 2;
    return { ok, detail: `$id ${schema.$id}; unsupported keywords ${kw.length}; ${cat.entries.length} entries, ${cat.sheets.length} sheets: ${errs.length} schema errors${errs.length ? ' (' + errs.slice(0, 3).join('; ') + ')' : ''}; broken copy rejected with ${neg.length} errors` };
});

// Every band value is a geometry band (or ALL for band-neutral content); ids match their fields.
check('entry_fields', p => {
    const cat = committedCatalogue();
    const g = readJson(rel(B.SRC.geometry));
    const bands = new Set(g.bands.map(b => b.id).concat(['ALL']));
    const bad = [];
    const list = p ? cat.entries.slice(0, 5).map(e => Object.assign(clone(e), { band: 'MIDDLE' })) : cat.entries;
    for (const e of list) {
        if (!bands.has(e.band)) bad.push(`${e.id} band ${e.band}`);
        const f = e.id.split('_');
        if (f[0] !== B.idField(e.band) || f[1] !== B.idField(e.biome) || f[2] !== B.idField(e.category)) bad.push(`${e.id} id fields do not match band/biome/category`);
    }
    return { ok: !bad.length, detail: `${list.length} entries checked; ${bad.length} bad${bad.length ? ': ' + bad.slice(0, 3).join('; ') : ''}` };
});

// 2. The rebuild is byte-identical twice, and equals the committed outputs.
check('rebuild_identical', p => {
    const r1 = B.build({ root: ROOT });
    const r2 = B.build({ root: ROOT });
    if (!r1.ok || !r2.ok) return { ok: false, detail: `build failed: ${(r1.errors || []).concat(r2.errors || []).slice(0, 3).map(e => e.code + ' ' + e.id).join('; ')}` };
    const files = Object.keys(r1.files).sort();
    const diff12 = [], diffCommitted = [];
    for (const f of files) {
        let t2 = r2.files[f];
        if (p && f === B.OUT.catalogue) t2 = t2.replace('"schemaVersion"', `"builtAt": "${new Date().toISOString()}",\n  "schemaVersion"`);
        const h1 = sha(Buffer.from(r1.files[f])), h2 = sha(Buffer.from(t2));
        if (h1 !== h2) diff12.push(f);
        const onDisk = fs.existsSync(rel(f)) ? sha(committed(f)) : null;
        if (onDisk !== h1) diffCommitted.push(f);
    }
    const catHash = sha(Buffer.from(r1.files[B.OUT.catalogue]));
    return { ok: !diff12.length && !diffCommitted.length, detail: `${files.length} outputs; run1 vs run2 differ: ${diff12.length ? diff12.join(', ') : 'none'}; fresh build vs committed differ: ${diffCommitted.length ? diffCommitted.join(', ') : 'none'}; catalogue.json sha256 ${catHash.slice(0, 16)}...` };
});

// 3. One check per FAIL rule, each against a fixture (tools/art/fixtures/catalogue/cases/*.json).
const caseFiles = fs.readdirSync(path.join(FIX, 'cases')).filter(f => f.endsWith('.json')).sort();
for (const cf of caseFiles) {
    const c = readJson(path.join(FIX, 'cases', cf));
    check('rule_' + c.case, p => {
        const base = readJson(rel(c.base));
        const ctx = miniContext();
        const baseline = B.validateCatalogue(base, ctx);
        const patched = applyPatch(clone(base), c.patch);
        const errs = B.validateCatalogue(patched, Object.assign({}, ctx, { disabled: p ? [c.code] : [] }));
        const hit = errs.filter(e => e.code === c.code);
        return { ok: baseline.length === 0 && hit.length > 0, detail: `${c.rule}: baseline fixture ${baseline.length} errors; patched fixture -> ${hit.length} ${c.code}${hit.length ? ' (' + hit[0].id + ': ' + hit[0].msg + ')' : ''}${p ? ' [rule switched off]' : ''}` };
    });
}
// Every FAIL rule of deliverable 4 has at least one fixture case.
check('rule_coverage', p => {
    const need = ['DUP_ID', 'DUP_SLOT', 'MISSING_FIELD', 'RAMP_UNKNOWN', 'SCALEROW_UNKNOWN', 'SIZE_OUTSIDE_ROW', 'SLOT_TOO_SMALL', 'SLOT_OVERLAP', 'SLOT_OFF_GRID', 'SLOT_OUTSIDE_SHEET', 'SHEET_TOO_LARGE', 'SHEET_NOT_GRID', 'Z_OUT_OF_RANGE', 'NO_SOURCE', 'SOURCE_DROPPED', 'DERIVED_BAD_BASE', 'VARIANT_HAS_SLOT', 'PAPERDOLL_MISMATCH', 'GEOM_HEIGHT'];
    const have = new Set(caseFiles.map(f => readJson(path.join(FIX, 'cases', f)).code));
    if (p) have.delete('GEOM_HEIGHT');
    const missing = need.filter(c => !have.has(c));
    return { ok: !missing.length, detail: `${need.length} FAIL rules, ${caseFiles.length} fixture cases; rules without a case: ${missing.join(', ') || 'none'}` };
});
// The live catalogue passes every FAIL rule (the real build reports no error).
check('live_catalogue_valid', p => {
    const r = realBuild();
    let errs = r.errors;
    if (p) { const cat = clone(r.catalogue); cat.entries.push(clone(cat.entries[0])); errs = B.validateCatalogue(cat, r.validateCtx); }
    return { ok: r.ok && errs.length === 0, detail: `real build: ${r.catalogue ? r.catalogue.entries.length : 0} entries, ${errs.length} rule errors${errs.length ? ' (' + errs.slice(0, 2).map(e => e.code + ' ' + e.id).join('; ') + ')' : ''}` };
});

// 4. Scale chart vs the registry (read with the shared helper tools/scale_resolver.js).
check('scale_chart_vs_registry', p => {
    const resolver = require('../scale_resolver.js');
    const reg = resolver.loadRegistry();
    const chart = JSON.parse(committed(B.OUT.scaleChart).toString('utf8'));
    const conflicts = committed(B.OUT.conflicts).toString('utf8');
    const strip = readJson(rel(B.SRC.strip));
    const rows = new Map(chart.rows.map(r => [r.rowId, r]));
    const bad = [];
    for (const [cls, v] of Object.entries(reg.classes)) {
        const r = rows.get(cls);
        if (!r) { bad.push(`${cls} missing`); continue; }
        const env = resolver.resolveScaleClass(cls).visualEnvelope;
        if (r.wMin !== env.width.min || r.wTarget !== env.width.target || r.wMax !== env.width.max || r.hMin !== env.height.min || r.hTarget !== env.height.target || r.hMax !== env.height.max) bad.push(`${cls} numbers differ from the registry`);
        if (r.footprint.w !== v.footprintWidthTiles || r.footprint.h !== v.footprintHeightTiles || r.anchor !== v.anchorType) bad.push(`${cls} footprint/anchor differ`);
    }
    const stripRows = chart.rows.filter(r => r.source === 'STRIP+REGISTRY').map(r => clone(r));
    if (p) stripRows[0].chartHeightPx += 1;
    for (const r of stripRows) {
        const target = reg.classes[r.rowId].visualHeightTarget;
        if (r.chartHeightPx !== target && !conflicts.includes(`strip label ${r.chartLabel} reads ${r.chartHeightPx} px`)) bad.push(`${r.rowId}: strip ${r.chartHeightPx} vs registry ${target}, not listed in conflicts.md`);
    }
    for (const l of strip.labels) if (!rows.get(l.row) || rows.get(l.row).chartHeightPx !== l.chartHeightPx) bad.push(`strip label ${l.chartLabel} not carried to ${l.row}`);
    const regRows = chart.rows.filter(r => r.source === 'STRIP+REGISTRY' || r.source === 'REGISTRY_ONLY').length;
    const extra = chart.rows.filter(r => !['STRIP+REGISTRY', 'REGISTRY_ONLY', 'RMMZ_SPEC', 'GEOMETRY'].includes(r.source));
    if (extra.length) bad.push(`rows with an unknown source: ${extra.map(r => r.rowId).join(', ')}`);
    return { ok: !bad.length && regRows === Object.keys(reg.classes).length, detail: `${regRows} registry rows for ${Object.keys(reg.classes).length} registry classes; ${stripRows.length} STRIP rows (+ ${strip.labels.length - stripRows.length} tile label); ${bad.length} problems${bad.length ? ': ' + bad.slice(0, 3).join('; ') : ''}` };
});

// 5. Geometry: stratumPx sums to layerPx; invalid splits are rejected.
check('geometry_stratum_sum', p => {
    const g = readJson(rel(B.SRC.geometry));
    const use = p ? Object.assign(clone(g), { stratumPx: [19, 19, 19, 19, 19] }) : g;
    const sum = use.stratumPx.reduce((a, b) => a + b, 0);
    const own = B.validateGeometry(use);
    const rejected = ['stratum_invalid_zero', 'stratum_invalid_sum'].map(n => { const r = B.build({ root: ROOT, geometry: geometryWith(n).g }); return { n, rejected: !r.ok && r.errors.some(e => e.code === 'GEOM_INVALID') }; });
    return { ok: sum === use.layerPx && use.stratumPx.length === use.strataPerLayer && own.length === 0 && rejected.every(x => x.rejected), detail: `stratumPx ${JSON.stringify(use.stratumPx)} sums to ${sum} (layerPx ${use.layerPx}); geometry errors ${own.length}; ${rejected.map(x => `${x.n} ${x.rejected ? 'rejected' : 'NOT rejected'}`).join(', ')}` };
});
// Changing stratumPx in a fixture changes the strip / wall / ramp slot heights.
check('geometry_stratum_changes_slots', p => {
    const base = realBuild().catalogue;
    const skew = p ? realBuild() : B.build({ root: ROOT, geometry: geometryWith('stratum_skewed').g });
    const reord = p ? realBuild() : B.build({ root: ROOT, geometry: geometryWith('stratum_reordered').g });
    if (!skew.ok || !reord.ok) return { ok: false, detail: 'fixture build failed' };
    const ids = ['SURFACE_SHARED_EDGE_MEADOW_S-H2_DEFAULT', 'SURFACE_SHARED_WALLFACE_OPENING_H2_DEFAULT', 'SURFACE_SHARED_RAMP_MEADOW_N-C2_DEFAULT', 'SURFACE_SHARED_RAMPSIDE_MEADOW_E-H2_DEFAULT'];
    const b = byId(base), s = byId(skew.catalogue), r = byId(reord.catalogue);
    const changedSlot = ids.filter(id => b.get(id) && s.get(id) && b.get(id).slot.h !== s.get(id).slot.h);
    const tgtIds = ['SURFACE_SHARED_EDGE_MEADOW_S-H1_DEFAULT', 'SURFACE_SHARED_WALLFACE_OPENING_H3_DEFAULT', 'SURFACE_SHARED_RAMP_MEADOW_N-C4_DEFAULT'];
    const changedTarget = tgtIds.filter(id => b.get(id) && r.get(id) && b.get(id).envelope.hTarget !== r.get(id).envelope.hTarget);
    const d = id => `${id.split('_').slice(2, 5).join('_')} ${b.get(id).slot.h}->${s.get(id) ? s.get(id).slot.h : '?'}`;
    return { ok: changedSlot.length === ids.length && changedTarget.length === tgtIds.length, detail: `[40,14,14,14,14]: ${changedSlot.length}/${ids.length} slot heights changed (${ids.map(d).join(', ')}); [20,19,19,19,19]: ${changedTarget.length}/${tgtIds.length} target heights changed (${tgtIds.map(id => `${b.get(id).envelope.hTarget}->${r.get(id) ? r.get(id).envelope.hTarget : '?'}`).join(', ')})` };
});
// No 9 or 32 literal layer count in build_catalogue.js (the layer count is read from geometry.json).
check('geometry_no_literal_layer_count', p => {
    let src = fs.readFileSync(path.join(__dirname, 'build_catalogue.js'), 'utf8');
    if (p) src += '\nconst LAYERS = 32;\n';
    const hits = [];
    src.split(/\r?\n/).forEach((l, i) => { const m = l.match(/\b(9|32)\b/g); if (m) hits.push(`line ${i + 1}: ${l.trim().slice(0, 60)}`); });
    return { ok: hits.length === 0, detail: `${hits.length} lines with a literal 9 or 32 in build_catalogue.js${hits.length ? ': ' + hits.slice(0, 3).join(' | ') : ''}` };
});
// The builder reads the layer count and bands from geometry: a 9-layer world builds and stays in range.
check('geometry_nine_layers', p => {
    const { g } = geometryWith('nine_layers');
    const r = B.build({ root: ROOT, geometry: g });
    const cat = p ? realBuild().catalogue : (r.catalogue || { entries: [], bands: [] });
    const out = cat.entries.filter(e => e.zMin < g.zMin || e.zMax > g.zMax);
    return { ok: r.ok && out.length === 0 && cat.bands.length === g.bands.length, detail: `9-layer fixture (z ${g.zMin}..${g.zMax}): build ${r.ok ? 'OK' : 'FAILED ' + r.errors.slice(0, 2).map(e => e.code).join(',')}, ${cat.entries.length} entries, ${out.length} outside z range, ${cat.bands.length} bands` };
});

// 6. Size classes.
check('size_srd', p => {
    const sc = JSON.parse(committed(B.OUT.sizeClasses).toString('utf8'));
    const inputs = readJson(rel(B.SRC.sizeInputs));
    const srd = readJson(rel(B.SRC.srdOptions));
    const g = readJson(rel(B.SRC.geometry));
    const races = clone(sc.races);
    if (p) races.find(r => r.id === 'RACE_DWARF').drawnHeightPxMax = 36;
    const bad = [];
    const ppf = g.pxPerFootCreature;
    const human = races.find(r => r.id === 'RACE_HUMAN');
    for (const r of races) {
        const inp = inputs.races.find(x => x.id === r.id);
        const e = srd.entries.find(x => x.id === r.srdSourceRef.entryId);
        const trait = e && e.data.traits.find(t => t.name === 'Size');
        if (!trait || trait.text !== 'Size. ' + r.srdSourceRef.trait) bad.push(`${r.id}: quoted trait differs from ${B.SRC.srdOptions}`);
        if (!e || e.data.size !== r.srdSize) bad.push(`${r.id}: SRD size ${e && e.data.size} vs ${r.srdSize}`);
        const test = (px, ft, how) => how === 'EQ' ? px === ft * ppf : how === 'LT' ? px < ft * ppf : how === 'GT' ? px > ft * ppf : how === 'SAME_AS_HUMAN' ? true : how === 'NONE' ? px <= g.frameClasses[r.frameClass].frame[1] : false;
        if (!test(r.drawnHeightPxMin, inp.feetMin, inp.minRel)) bad.push(`${r.id}: min ${r.drawnHeightPxMin} px fails ${inp.minRel} ${inp.feetMin} ft x ${ppf}`);
        if (!test(r.drawnHeightPxMax, inp.feetMax, inp.maxRel)) bad.push(`${r.id}: max ${r.drawnHeightPxMax} px fails ${inp.maxRel} ${inp.feetMax} ft x ${ppf}`);
        if (inp.minRel === 'SAME_AS_HUMAN' && (r.drawnHeightPxMin !== human.drawnHeightPxMin || r.drawnHeightPxMax !== human.drawnHeightPxMax)) bad.push(`${r.id}: not the same as RACE_HUMAN`);
        if (r.drawnHeightPxMin !== inp.drawnHeightPxMin || r.drawnHeightPxMax !== inp.drawnHeightPxMax) bad.push(`${r.id}: ${r.drawnHeightPxMin}-${r.drawnHeightPxMax} differs from size_inputs`);
        if ((r.status === 'DERIVED') !== (inp.minRel === 'EQ' && inp.maxRel === 'EQ')) bad.push(`${r.id}: status ${r.status}`);
    }
    const humanOk = ppf * 6 === g.humanPx && sc.humanCheck.ok;
    return { ok: !bad.length && humanOk && races.length === 9 && sc.frameClasses.length === 7, detail: `${races.length} race rows checked against SRD Size traits and ${ppf} px/ft; 6 ft human = ${ppf * 6} px (humanPx ${g.humanPx}); ${sc.frameClasses.length} frame-class rows; ${bad.length} problems${bad.length ? ': ' + bad.slice(0, 3).join('; ') : ''}` };
});
check('size_footprint_frame_separate', p => {
    const cat = committedCatalogue();
    const g = readJson(rel(B.SRC.geometry));
    const beings = cat.entries.filter(e => ['CREATURE', 'CHARACTER', 'EQUIPMENT'].includes(e.category)).map(e => p && e.id === 'ALL_SHARED_CREATURE_TROLL_V1_DEFAULT' ? Object.assign(clone(e), { footprint: null }) : e);
    const bad = [];
    for (const e of beings) {
        if (!('footprint' in e) || !('frameClass' in e)) { bad.push(`${e.id}: no separate footprint/frameClass fields`); continue; }
        const fc = g.frameClasses[e.frameClass] || (e.frameClass === 'TALL_MEDIUM' ? { frame: g.optionalParams.TALL_MEDIUM.frame } : null);
        if (!fc) { bad.push(`${e.id}: unknown frameClass ${e.frameClass}`); continue; }
        if (!e.footprint || !(e.footprint.w > 0)) bad.push(`${e.id}: missing footprint`);
        if (fc.frame && e.slot) {
            const cw = e.slot.w / e.frames.cols, ch = e.slot.h / e.frames.rows;
            if (cw !== fc.frame[0] || ch !== fc.frame[1]) bad.push(`${e.id}: cell ${cw}x${ch} is not the ${e.frameClass} frame ${fc.frame.join('x')}`);
        }
    }
    const longBody = cat.entries.find(e => e.frameClass === 'LARGE_LONG' && e.slot);
    const separate = longBody && longBody.footprint.w === longBody.footprint.h && longBody.slot.w / 3 !== longBody.slot.h / 4;
    return { ok: !bad.length && !!separate, detail: `${beings.length} creature/character/equipment entries carry footprint (squares) and frameClass (px frame) separately; e.g. ${longBody ? `${longBody.id} footprint ${longBody.footprint.w}x${longBody.footprint.h} squares, frame ${longBody.slot.w / 3}x${longBody.slot.h / 4} px` : 'no LARGE_LONG entry'}; ${bad.length} problems${bad.length ? ': ' + bad.slice(0, 3).join('; ') : ''}` };
});
check('size_frame_classes', p => {
    const cat = committedCatalogue();
    const g = readJson(rel(B.SRC.geometry));
    const sc = JSON.parse(committed(B.OUT.sizeClasses).toString('utf8'));
    const entries = cat.entries.map(e => p && e.frameClass === 'LARGE_LONG' && e.slot ? Object.assign(clone(e), { slot: Object.assign({}, e.slot, { w: 288, h: 384 }) }) : e);
    const cell = e => [e.slot.w / e.frames.cols, e.slot.h / e.frames.rows];
    const want = { TINY: [48, 48], LARGE_TALL: [48, 96], LARGE_LONG: [96, 48] };
    const bad = [];
    const n = { TINY: 0, LARGE_TALL: 0, LARGE_LONG: 0 };
    for (const e of entries) {
        if (!e.slot || !want[e.frameClass]) continue;
        n[e.frameClass]++;
        const c = cell(e);
        if (c[0] !== want[e.frameClass][0] || c[1] !== want[e.frameClass][1]) bad.push(`${e.id}: ${e.frameClass} cell ${c.join('x')}`);
    }
    const large96 = entries.filter(e => e.slot && /^LARGE/.test(e.frameClass || '') && cell(e)[0] === 96 && cell(e)[1] === 96);
    for (const cls of ['HUGE', 'GARGANTUAN']) {
        const fc = g.frameClasses[cls];
        if (fc.frame !== null || fc.status !== 'OWNER_OPEN' || fc.future !== true) bad.push(`${cls} is not a null OWNER_OPEN future parameter`);
        const row = sc.frameClasses.find(r => r.id === 'FRAME_' + cls);
        if (!row || row.frame !== null) bad.push(`size_classes FRAME_${cls} frame is not null`);
        if (entries.some(e => e.frameClass === cls && e.slot)) bad.push(`${cls} has a paint slot`);
    }
    const tinyInTiny = g.frameClasses.TINY.frame.join('x') === '48x48' && g.frameClasses.TINY.drawnFootprintPx.join('x') === '24x24';
    return { ok: !bad.length && !large96.length && tinyInTiny && n.TINY > 0 && n.LARGE_TALL > 0 && n.LARGE_LONG > 0, detail: `TINY ${n.TINY} / LARGE_TALL ${n.LARGE_TALL} / LARGE_LONG ${n.LARGE_LONG} entries with the right cells; 96x96 Large frames: ${large96.length}; HUGE/GARGANTUAN null frames without slots; TINY footprint 24x24 in a 48x48 frame: ${tinyInTiny}; ${bad.length} problems${bad.length ? ': ' + bad.slice(0, 3).join('; ') : ''}` };
});
check('size_optional_params', p => {
    const g = readJson(rel(B.SRC.geometry));
    const sc = JSON.parse(committed(B.OUT.sizeClasses).toString('utf8'));
    const base = realBuild().catalogue;
    const tm = p ? realBuild() : B.build({ root: ROOT, geometry: geometryWith('tall_medium_on').g });
    const fl = p ? realBuild() : B.build({ root: ROOT, geometry: geometryWith('readability_floor_on').g });
    const offByDefault = g.optionalParams.TALL_MEDIUM.enabled === false && g.optionalParams.smallRaceReadabilityFloorPx.enabled === false && sc.optionalParams.TALL_MEDIUM.enabled === false && sc.optionalParams.smallRaceReadabilityFloorPx.enabled === false;
    const tmBase = base.entries.filter(e => e.frameClass === 'TALL_MEDIUM').length;
    const tmOn = tm.catalogue.entries.filter(e => e.frameClass === 'TALL_MEDIUM' && e.slot);
    const tmSlots = uniqStr(tmOn.map(e => `${e.slot.w}x${e.slot.h}`));
    const env = (cat, id) => { const e = cat.entries.find(x => x.id === id); return e ? `${e.envelope.hMin}/${e.envelope.hTarget}/${e.envelope.hMax}` : '?'; };
    const ids = ['ALL_SHARED_CHARACTER_GNOME_MALE_DEFAULT', 'ALL_SHARED_CHARACTER_HALFLING_FEMALE_DEFAULT'];
    const changed = ids.filter(id => env(base, id) !== env(fl.catalogue, id));
    return { ok: offByDefault && tmBase === 0 && tmOn.length > 0 && changed.length === ids.length, detail: `defaults OFF: ${offByDefault}; TALL_MEDIUM entries default ${tmBase}, enabled ${tmOn.length} (slots ${tmSlots.join(', ')}); readability floor on: ${ids.map(id => `${id.split('_')[3]} ${env(base, id)} -> ${env(fl.catalogue, id)}`).join(', ')}` };
});
function uniqStr(a) { return Array.from(new Set(a)).sort(); }
check('size_character_blocks', p => {
    const g = readJson(rel(B.SRC.geometry));
    const cat = committedCatalogue();
    const want = { '48x48': [144, 192], '48x96': [144, 384], '96x48': [288, 192] };
    const bad = [];
    for (const [k, v] of Object.entries(want)) if (!g.rmmzCharacterBlocks[k] || g.rmmzCharacterBlocks[k].join('x') !== v.join('x')) bad.push(`block ${k}`);
    const beings = cat.entries.filter(e => ['CREATURE', 'CHARACTER', 'EQUIPMENT'].includes(e.category) && e.slot).map(e => p && e.category === 'EQUIPMENT' ? Object.assign(clone(e), { frames: Object.assign({}, e.frames, { cols: 4 }) }) : e);
    for (const e of beings) {
        if (e.frames.cols !== 3 || e.frames.rows !== 4) bad.push(`${e.id}: ${e.frames.cols}x${e.frames.rows} frames`);
        const block = `${e.slot.w / 3}x${e.slot.h / 4}`;
        const exp = want[block];
        if (exp && (exp[0] !== e.slot.w || exp[1] !== e.slot.h)) bad.push(`${e.id}: slot ${e.slot.w}x${e.slot.h}`);
    }
    const rt = cat.sheets.filter(s => s.kind === 'RMMZ_CHARACTER').filter(s => s.w % 3 || s.h % 4);
    const blocks = uniqStr(beings.map(e => `${e.slot.w}x${e.slot.h}`));
    return { ok: !bad.length && !rt.length, detail: `${beings.length} character/creature/equipment slots in 3x4-frame blocks (${blocks.join(', ')}); RMMZ character sheets not 3x4: ${rt.length}; ${bad.length} problems${bad.length ? ': ' + bad.slice(0, 3).join('; ') : ''}` };
});

// 7. Coverage = 100%, including every addendum family x band (recomputed here from the committed files).
check('coverage', p => {
    const cat = clone(committedCatalogue());
    if (p) cat.entries = cat.entries.filter(e => !e.sourceIds.catalog.includes('objects:oak'));
    const covered = new Map(B.SOURCE_KINDS.map(k => [k, new Set()]));
    for (const e of cat.entries) for (const k of B.SOURCE_KINDS) for (const id of e.sourceIds[k]) covered.get(k).add(id);
    const oos = new Set(cat.outOfScope.filter(o => o.reason && o.reason.trim()).map(o => o.kind + ':' + o.sourceId));
    const isCov = (k, id) => covered.get(k).has(id) || oos.has(k + ':' + id);
    // Required source ids, read again from the sources.
    const wc = readJson(rel(B.SRC.worldCatalog));
    const items = Array.isArray(wc.items.types) ? wc.items.types.map(i => i.id) : Object.keys(wc.items.types);
    const species = Array.isArray(wc.wildlife.species) ? wc.wildlife.species.map(s => s.id) : Object.keys(wc.wildlife.species);
    const catIds = [].concat(wc.objects.map(o => 'objects:' + o.id), items.map(i => 'items:' + i), species.map(s => 'wildlife:' + s), Object.keys(wc.people).filter(k => k !== 'about').map(k => 'people:' + k), wc.groundKinds.map(x => 'groundKinds:' + x.id), Object.keys(wc.water.surface).map(k => 'water:' + k), Object.keys(wc.faces.cultures).map(k => 'faces:' + k), Object.keys(wc.skins.cultures).map(k => 'skins:' + k));
    const briefText = fs.readdirSync(rel(B.SRC.briefsDir)).filter(f => /^SEG-\d\d/.test(f)).map(f => ({ f, t: fs.readFileSync(rel(B.SRC.briefsDir + '/' + f), 'utf8') }));
    const special = [];
    for (const { f, t } of briefText) for (const m of t.matchAll(/^### ((anchor|ui|eq|face)_\S+) — /gm)) special.push(f.slice(0, 6) + ':' + m[1]);
    const manifest = fs.readFileSync(rel(B.SRC.manifest), 'utf8').split(/\r?\n/).filter(l => /^\| `/.test(l)).map(l => l.split('|')[1].trim().replace(/`/g, ''));
    const openAr = fs.readFileSync(rel(B.SRC.requests), 'utf8').split(/\r?\n/).filter(l => /^\|\s*AR-\d+/.test(l)).map(l => l.split('|').map(s => s.trim())).filter(c => !/^(DELIVERED|CHECKED|APPROVED|INTEGRATED|WITHDRAWN)/.test(c[c.length - 2])).map(c => c[1]);
    const groups = [['WorldCatalog ids', 'catalog', catIds], ['brief anchor/ui/eq/face ids', 'brief', special], ['manifest rows', 'manifest', manifest], ['open AR rows', 'ar', openAr]];
    const lines = [], missing = [];
    for (const [label, k, ids] of groups) {
        const miss = ids.filter(id => !isCov(k, id));
        missing.push(...miss.map(m => `${k}:${m}`));
        lines.push(`${label} ${ids.length - miss.length}/${ids.length}`);
    }
    const g = readJson(rel(B.SRC.geometry));
    const empty = [];
    for (const f of B.FAMILIES) for (const b of g.bands) {
        const n = cat.entries.filter(e => e.band === b.id && (f.id === 'DEPTH' ? e.variants.paletteSwap === 'DEPTH_' + b.id : e.family === f.id || (f.id === 'LIGHT' && e.category === 'LIGHT'))).length;
        if (!n) empty.push(`${f.id}x${b.id}`);
    }
    return { ok: !missing.length && !empty.length && catIds.length > 0, detail: `${lines.join('; ')}; addendum family x band cells: ${B.FAMILIES.length * g.bands.length - empty.length}/${B.FAMILIES.length * g.bands.length}${missing.length ? '; uncovered: ' + missing.slice(0, 5).join(', ') : ''}${empty.length ? '; empty: ' + empty.join(', ') : ''}` };
});

// 8. References hash-verify.
check('references_hash', p => {
    const refs = JSON.parse(committed(B.OUT.references).toString('utf8'));
    const pins = readJson(rel(B.SRC.refInputs));
    const list = clone(refs.references);
    if (p) { const t = list.find(r => r.tracked); t.sha256 = t.sha256.replace(/^./, c => (c === '0' ? '1' : '0')); }
    const bad = [];
    let verified = 0;
    for (const r of list) {
        const pin = pins.references.find(x => x.path === r.path);
        if (!pin || pin.sha256 !== r.sha256) bad.push(`${r.path}: not pinned or pin differs`);
        if (r.tracked) {
            if (!fs.existsSync(rel(r.path))) { bad.push(`${r.path}: missing`); continue; }
            if (sha(fs.readFileSync(rel(r.path))) !== r.sha256) bad.push(`${r.path}: sha256 mismatch`); else verified++;
        } else {
            if (!r.thirdParty || r.styleAnchorEligible || r.verification !== 'UNVERIFIED_ABSENT') bad.push(`${r.path}: untracked third-party flags wrong`);
        }
        if (r.ownerApproved !== 'UNKNOWN') bad.push(`${r.path}: ownerApproved ${r.ownerApproved} (must stay UNKNOWN until the Owner confirms)`);
        if (/u7_|^reference\//.test(r.path) && (!r.thirdParty || r.styleAnchorEligible)) bad.push(`${r.path}: U7-derived reference must be thirdParty and not style-anchor eligible`);
    }
    const cat = committedCatalogue();
    const known = new Set(list.map(r => r.path).concat(refs.packs.map(pk => 'pack:' + pk.packId)));
    const unknown = cat.entries.filter(e => e.references.some(x => !known.has(x)));
    return { ok: !bad.length && !unknown.length && verified > 0, detail: `${list.length} references, ${verified} tracked re-hashed and matching; ${list.filter(r => !r.tracked).length} untracked (UNVERIFIED_ABSENT); entries with unknown references: ${unknown.length}; ${bad.length} problems${bad.length ? ': ' + bad.slice(0, 3).join('; ') : ''}` };
});

// 9. DEPTH_<band> rows carry no colour values; variant rows own no paint slot.
check('depth_no_colours', p => {
    const cat = committedCatalogue();
    const rows = cat.entries.filter(e => /^DEPTH_/.test(e.variants.paletteSwap || ''));
    const text = rows.map(e => JSON.stringify(e)).join('\n') + (p ? '\n{"notes":"#1A2B3C"}' : '');
    const hex = text.match(/#[0-9A-Fa-f]{6}\b/g) || [];
    const colorKeys = (text.match(/"colou?rs?"\s*:/g) || []).length;
    const pal = cat.depthPalettes || [];
    const palBad = pal.filter(x => x.colors !== null);
    const withSlot = cat.entries.filter(e => e.variants.derivedFrom && e.slot);
    return { ok: rows.length > 0 && !hex.length && !colorKeys && pal.length > 0 && !palBad.length && !withSlot.length, detail: `${rows.length} DEPTH_<band> rows: ${hex.length} colour values, ${colorKeys} colour keys; ${pal.length} depth palette placeholders, ${palBad.length} with colours; variant rows with a paint slot: ${withSlot.length}` };
});

// 10. No image data anywhere in the catalogue; no image committed by this lane.
check('no_image_data', p => {
    const dirs = ['art/catalogue', 'docs/art/catalogue', 'tools/art/fixtures/catalogue'];
    const images = [];
    const walk = d => { if (!fs.existsSync(rel(d))) return; for (const f of fs.readdirSync(rel(d))) { const r = d + '/' + f; if (fs.statSync(rel(r)).isDirectory()) walk(r); else if (/\.(png|jpe?g|gif|bmp|webp|tga|psd|aseprite)$/i.test(f)) images.push(r); } };
    dirs.forEach(walk);
    if (p) images.push('art/catalogue/provoked.png');
    const blobs = [B.OUT.catalogue, B.OUT.references, B.OUT.scaleChart, B.OUT.sizeClasses].filter(f => /data:image|iVBORw0KGgo|\/9j\/4AAQ/.test(committed(f).toString('utf8')));
    return { ok: !images.length && !blobs.length, detail: `image files under ${dirs.join(', ')}: ${images.length}${images.length ? ' (' + images.join(', ') + ')' : ''}; outputs with embedded image data: ${blobs.length}` };
});

// 11. SCHEMA.md records the terrain list the build used.
check('schema_doc_terrains', p => {
    const md = fs.readFileSync(rel('docs/art/catalogue/SCHEMA.md'), 'utf8');
    const sec = /## Terrain list[\s\S]*?(?=\n## )/.exec(md);
    let listed = sec ? Array.from(new Set((sec[0].match(/`([a-z_]+)`/g) || []).map(s => s.replace(/`/g, '')))) : [];
    if (p) listed = listed.slice(1);
    const used = realBuild().terrains.map(t => t.id);
    const missing = used.filter(t => !listed.includes(t)), extra = listed.filter(t => !used.includes(t) && !['groundKinds', 'undergroundBiomes', 'ground'].includes(t));
    return { ok: !!sec && !missing.length && !extra.length, detail: `${used.length} terrains used; SCHEMA.md lists ${listed.length}; missing ${missing.join(', ') || 'none'}; extra ${extra.join(', ') || 'none'}` };
});

// 12. conflicts.md names the required disagreements and resolves nothing.
check('conflicts_required', p => {
    let md = committed(B.OUT.conflicts).toString('utf8');
    const need = [
        ['UF vs DEUS AssetIndex', /keys only in game\/data\/UF_AssetIndex\.json/],
        ['AR ref drift', /AR reference drift \(for example AR-200 vs AR-2000\)/],
        ['matrix 6 biomes incl. Cold vs registry 5', /including "Cold"/],
        ['5 canonical vs 25 biomes', /5 canonical biomes .* vs 25 biomes in 5 bands/],
        ['charter grass/bush sizes', /\*\*SC-01\*\*.*\*\*|\*\*SC-01\*\*/],
        ['bible door 64-80', /\*\*SC-05\*\* door height 64-80/],
        ['briefs INDEX one 48x48 square', /\*\*SC-06\*\* every asset inside one 48x48 square/],
        ['SCALE.md person 44-48', /\*\*SC-07\*\* grown human 44-48/],
        ['APPROVALS 46 px anchors', /\*\*SC-08\*\*.*46 px/],
        ['TREE_SAPLING not in the standard', /TREE_SAPLING \(game\/data\/DEUS_ScaleRegistry\.json:\d+\)/],
        ['px/ft Owner choice, not an error', /Owner's deliberate choice.*not as an error/],
        ['palette 256 vs 226', /has 256 colours; art\/palette\/deus_master_world_palette_v1\.hex has 226/],
        ['manifest 18 vs 20', /has 18 registered rows .* 20 are claimed/],
        ['DW.01.06 pending', /\*\*ST-01\*\* DW\.01\.06/],
        ['4096 atlases vs RMMZ sizes', /\*\*ST-02\*\*/],
        ['flips vs upper-left lighting', /\*\*ST-03\*\*.*lightingSafe false/],
        ['legacy layer counts', /## \d+\. Legacy layer-count assumptions/],
        ['Owner questions listed', /## \d+\. Owner questions \(asked, not answered\)/],
        ['nothing resolved', /\*\*Nothing here is resolved\*\*/],
    ];
    if (p) md = md.replace(/\*\*SC-05\*\*[^\n]*\n/, '');
    const miss = need.filter(([, re]) => !re.test(md)).map(([n]) => n);
    const lines = md.split('\n').length;
    return { ok: !miss.length, detail: `${need.length - miss.length}/${need.length} required topics present; conflicts.md ${lines} lines${miss.length ? '; missing: ' + miss.join(', ') : ''}` };
});

// ---------------------------------------------------------------- summary
if (PROVOKE && !names.some(n => provoked(n))) {
    console.log(`FAIL catalogue.provoke: UF_TEST_PROVOKE=${PROVOKE} names no check (checks: ${names.join(', ')})`);
    process.exit(1);
}
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed${PROVOKE ? ` (provoked: ${PROVOKE})` : ''}`);
process.exit(failed.length ? 1 : 0);
