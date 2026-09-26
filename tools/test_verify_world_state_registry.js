#!/usr/bin/env node
'use strict';
/**
 * tools/test_verify_world_state_registry.js — WG.33.01 (Lane X) tests for tools/verify_world_state_registry.js.
 *
 * Prints one "PASS <name>" or "FAIL <name>: <why>" line per check, then "RESULT: <n> passed, <m> failed".
 * Exit 0 only if every check passes.
 *
 * Fixtures: tools/wsr/fixtures/clean/ (committed, synthetic, TEST_ ids, no image data) passes with no gap.
 * Each negative fixture is a copy of it with one change, made at run time in an OS temp folder, and must
 * fail with the named rule and code. Generation checks run tools/art/make_blank_templates.js (read only) on
 * Lane T's fixture catalogue (tools/art/fixtures/templates/catalogue.fixture.json) or on changed copies of
 * it in the temp folder. The temp folder is deleted at the end.
 *
 * Mutation checks: each mutant is the tool's source with one change, compiled in memory with the tool's
 * own file name (the file on disk is never written). The whole suite runs against the mutant and must fail
 * at least one check ("PASS mutant_<name>_killed"). The unmutated source compiled the same way must pass
 * every check (mutation_control).
 *
 * Usage: node tools/test_verify_world_state_registry.js [--no-mutants] [--only <substring of check names>]
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const Module = require('module');
const childProcess = require('child_process');

const REPO = path.resolve(__dirname, '..');
const TOOL_PATH = path.join(__dirname, 'verify_world_state_registry.js');
const CLEAN = path.join(__dirname, 'wsr', 'fixtures', 'clean');
const LANE_T_CATALOGUE = path.join(__dirname, 'art', 'fixtures', 'templates', 'catalogue.fixture.json');
const TMP_PREFIX = 'wsr-templates-';

const args = process.argv.slice(2);
const NO_MUTANTS = args.includes('--no-mutants');
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;

let tmpRoot = null;
let wsCounter = 0;

// ---------------------------------------------------------------- tool loading

function compileTool(src) {
    const m = new Module(TOOL_PATH, module);
    m.filename = TOOL_PATH;
    m.paths = Module._nodeModulePaths(path.dirname(TOOL_PATH));
    m._compile(src, TOOL_PATH);
    return m.exports;
}

// ---------------------------------------------------------------- fixture workspaces

function loadClean() {
    const r = f => fs.readFileSync(path.join(CLEAN, f), 'utf8');
    const j = f => JSON.parse(r(f));
    const templates = {};
    for (const n of fs.readdirSync(path.join(CLEAN, 'templates')).sort()) templates[n] = JSON.parse(fs.readFileSync(path.join(CLEAN, 'templates', n), 'utf8'));
    return {
        registry: r('registry.md'), catalogue: j('catalogue.json'), templates, worldCatalog: j('world_catalog.json'),
        scope: j('scope.json'), map: j('map.json'), baseline: j('known_gaps.json'), approvals: r('approvals.md'),
        placements: [j('placement_report.json')], catalogueFile: null, generate: false
    };
}

function writeWorkspace(ws) {
    const dir = path.join(tmpRoot, `ws${++wsCounter}`);
    fs.mkdirSync(path.join(dir, 'templates'), { recursive: true });
    const w = (f, v) => { const p = path.join(dir, f); fs.writeFileSync(p, typeof v === 'string' ? v : JSON.stringify(v, null, 2) + '\n'); return p; };
    const a = [
        '--registry', w('registry.md', ws.registry),
        '--catalogue', ws.catalogueFile || w('catalogue.json', ws.catalogue),
        '--world-catalog', w('world_catalog.json', ws.worldCatalog),
        '--approvals', w('approvals.md', ws.approvals === null ? '# TEST_ approvals without a ledger section\n' : ws.approvals),
        '--scope', w('scope.json', ws.scope),
        '--map', w('map.json', ws.map),
        '--baseline', w('known_gaps.json', ws.baseline)
    ];
    if (!ws.generate) {
        for (const [n, v] of Object.entries(ws.templates)) w(path.join('templates', n), v);
        a.push('--templates', path.join(dir, 'templates'));
    }
    ws.placements.forEach((p, i) => a.push('--placements', w(`placement_${i}.json`, p)));
    return { dir, args: a };
}

function runCase(T, mutate, extra) {
    const ws = loadClean();
    if (mutate) mutate(ws);
    const { dir, args: a } = writeWorkspace(ws);
    const res = T.runChecker(a.concat(extra || []));
    return Object.assign({ dir, ws }, res);
}

// ---------------------------------------------------------------- registry table edits

function splitCells(l) { return l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(s => s.trim()); }
function tableEdit(ws, fn) {
    const lines = ws.registry.split('\n');
    const h = lines.findIndex(l => l.startsWith('| State ID'));
    if (h < 0) throw new Error('test bug: no seed table header');
    const header = splitCells(lines[h]);
    const t = {
        lines, h, header,
        row: id => { const i = lines.findIndex(l => l.startsWith(`| \`${id}\``)); if (i < 0) throw new Error(`test bug: no row ${id}`); return i; },
        col: name => { const k = header.indexOf(name); if (k < 0) throw new Error(`test bug: no column ${name}`); return k; },
        cells: i => splitCells(lines[i]),
        set: (i, cells) => { lines[i] = '| ' + cells.join(' | ') + ' |'; }
    };
    fn(t);
    ws.registry = lines.join('\n');
}
function setCell(ws, id, col, value) { tableEdit(ws, t => { const i = t.row(id); const c = t.cells(i); c[t.col(col)] = value; t.set(i, c); }); }
function removeColumn(ws, col) {
    tableEdit(ws, t => {
        const k = t.col(col);
        for (let i = t.h; i < t.lines.length && t.lines[i].startsWith('|'); i++) { const c = t.cells(i); c.splice(k, 1); t.set(i, c); }
    });
}
function lineOfRow(ws, id) { return ws.registry.split('\n').findIndex(l => l.startsWith(`| \`${id}\``)) + 1; }
function entry(ws, id) { const e = ws.catalogue.entries.find(x => x.id === id); if (!e) throw new Error(`test bug: no entry ${id}`); return e; }
function sidecar(ws, sheetId) { const s = ws.templates[`${sheetId}.json`]; if (!s) throw new Error(`test bug: no sidecar ${sheetId}`); return s; }
function tslot(ws, slotId) { for (const s of Object.values(ws.templates)) { const x = s.slots.find(y => y.slotId === slotId); if (x) return x; } throw new Error(`test bug: no template slot ${slotId}`); }

// ---------------------------------------------------------------- assertions

function findings(res) { return res.ctx ? res.ctx.findings : []; }
function has(res, rule, code, id) { return findings(res).some(f => f.rule === rule && f.code === code && (id === undefined || f.id === id)); }
function gating(res) { return findings(res).filter(f => f.severity === 'VIOLATION' || f.severity === 'GAP'); }
function summary(res) {
    if (!res.ctx) return `exit ${res.code}: ${res.lines.join(' / ')}`;
    return `exit ${res.code}; findings: ${findings(res).map(f => `${f.rule}/${f.code}/${f.id}`).join(', ') || 'none'}`;
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function sha(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }

// A negative fixture: gate exit 1 (the fixture baseline is empty) and the named finding present.
function negative(name, rule, code, id, mutate) {
    return [name, T => {
        const res = runCase(T, mutate);
        assert(res.code === 1 && has(res, rule, code, id), `want exit 1 and ${rule}/${code}/${id}; got ${summary(res)}`);
        return `${rule} ${code} ${id}`;
    }];
}

// ---------------------------------------------------------------- Lane T fixture variants (generation)

function laneT() { return JSON.parse(fs.readFileSync(LANE_T_CATALOGUE, 'utf8')); }
function laneTRefused() {
    const c = laneT();
    const e = c.entries.find(x => x.id === 'TEST_SURFACE_B1_RAMP_RISE1_V1_BASE');
    e.slot.y = 144; e.slot.h = 48;                        // GEOM_STRATUM_1 needs 19 px: STRATUM_HEIGHT_MISMATCH
    c.sheets.find(s => s.sheetId === '$TEST_Horse').h = 240; // not 3 x 4 frames: SHEET_INVALID
    return c;
}
function genCase(T, cat) {
    return runCase(T, ws => {
        ws.generate = true;
        if (cat === null) ws.catalogueFile = LANE_T_CATALOGUE; else { ws.catalogue = cat; }
    });
}
function tmpTemplateDirs() { return fs.readdirSync(os.tmpdir()).filter(n => n.startsWith(TMP_PREFIX)).sort(); }

// ---------------------------------------------------------------- checks

const CHECKS = [
    ['clean_fixture_passes', T => {
        const res = runCase(T);
        assert(res.code === 0, `want exit 0; got ${summary(res)}`);
        assert(gating(res).length === 0, `want no violation or gap; got ${summary(res)}`);
        const ex = findings(res).filter(f => f.severity === 'EXEMPT');
        assert(ex.length === 1 && ex[0].code === 'COMPOSED_EXEMPT' && ex[0].id === 'STATE_TEST_ARCH', `want one COMPOSED_EXEMPT for STATE_TEST_ARCH; got ${summary(res)}`);
        assert(res.lines.includes('GATE: OK (every violation and gap is baselined; no stale entry)'), 'no GATE: OK line');
        return '0 gating findings, 1 exempt';
    }],
    ['clean_fixture_strict_passes', T => {
        const res = runCase(T, null, ['--strict']);
        assert(res.code === 0, `want exit 0; got ${summary(res)}`);
        return 'exit 0';
    }],
    ['clean_resolution_methods', T => {
        const res = runCase(T);
        const by = id => res.ctx.resolved.find(x => x.row.stateId === id);
        const methods = id => by(id).entries.map(e => `${e.entryId}:${e.methods.join('+')}`).join(',');
        assert(methods('STATE_TEST_SOIL_DRY') === 'SURFACE_SHARED_EDGE_TEST-SOIL-DRY_N-H1_DEFAULT:ID+SOURCE,SURFACE_SHARED_TERRAIN_TEST-SOIL-DRY_A2_DEFAULT:ID+SOURCE', `soil: ${methods('STATE_TEST_SOIL_DRY')}`);
        assert(methods('STATE_TEST_SPRING') === 'SURFACE_SHARED_WATER_TEST-POOL_A1_DEFAULT:SOURCE', `spring: ${methods('STATE_TEST_SPRING')}`);
        assert(methods('STATE_TEST_FLAME') === 'ALL_SHARED_EFFECT_FX-FLAME_V1_DEFAULT:MAP', `flame: ${methods('STATE_TEST_FLAME')}`);
        const moss = by('STATE_TEST_MOSS_DEEP');
        assert(moss.entries.length === 1 && moss.entries[0].entryId === 'LOWER1_SHARED_TERRAIN_TEST-MOSS-DEEP_A2_DEFAULT', 'moss variant not resolved');
        assert(moss.slots.length === 1 && moss.slots[0].entryId === 'LOWER1_SHARED_TERRAIN_TEST-MOSS_A2_DEFAULT' && moss.slots[0].template === 'OK', 'moss variant does not use its base slot');
        const art = res.ctx.resolved.filter(x => ['STATE_TEST_SOIL_DRY', 'STATE_TEST_SPRING', 'STATE_TEST_MOSS_DEEP', 'STATE_TEST_BOULDER', 'STATE_TEST_FLAME'].includes(x.row.stateId));
        assert(art.every(x => x.slots.some(s => s.template === 'OK')), 'an art-required state has no confirmed template slot');
        return 'ID, SOURCE, MAP and derived-variant resolution';
    }],
    ['clean_counts', T => {
        const res = runCase(T);
        const c = JSON.parse(res.report.json).counts;
        assert(c.registry.rows === 8 && c.registry.artRequired === 5 && c.registry.withTemplateSlot === 5 && c.registry.composedExempt === 1, `registry counts ${JSON.stringify(c.registry)}`);
        assert(c.catalogue.slots === 9 && c.catalogue.slotsByScope.NATURAL_WORLD.slots === 4 && c.catalogue.slotsByScope.NATURAL_WORLD.tracing === 4, `catalogue counts ${JSON.stringify(c.catalogue.slotsByScope)}`);
        assert(c.manifestTemplate.slotsCompared === 9 && c.manifestTemplate.slotsAgree === 9 && c.manifestTemplate.sheetsCompared === 4, `manifest counts ${JSON.stringify(c.manifestTemplate)}`);
        assert(c.placed.ledgerSection === 'PRESENT' && c.placed.ledgerRows === 2 && c.placed.placedRegions === 2, `placed counts ${JSON.stringify(c.placed)}`);
        return 'rows 8, art 5, slots 9, natural 4/4 traced, 9/9 agree';
    }],

    // WSR-01
    negative('neg_wsr01_duplicate_state', 'WSR-01', 'DUPLICATE_STATE', 'STATE_TEST_BOULDER', ws => tableEdit(ws, t => {
        const i = t.row('STATE_TEST_BOULDER'); const c = t.cells(i); c[t.col('System')] = '`GEOTHERMAL_VOLCANIC`';
        t.lines.splice(i + 1, 0, '| ' + c.join(' | ') + ' |');
    })),
    negative('neg_wsr01_two_systems', 'WSR-01', 'MULTIPLE_SYSTEMS', 'STATE_TEST_SPRING', ws => setCell(ws, 'STATE_TEST_SPRING', 'System', '`HYDROLOGY_GROUNDWATER` / `HYDROLOGY_DRAINAGE`')),
    negative('neg_wsr01_system_not_in_enum', 'WSR-01', 'SYSTEM_NOT_IN_ENUM', 'STATE_TEST_TRAIL', ws => setCell(ws, 'STATE_TEST_TRAIL', 'System', '`CREATURE_ECOLOGY`')),
    negative('neg_wsr01_no_system', 'WSR-01', 'NO_SYSTEM', 'STATE_TEST_AQUIFER', ws => setCell(ws, 'STATE_TEST_AQUIFER', 'System', '')),

    // WSR-02
    negative('neg_wsr02_visual_state_null_family', 'WSR-02', 'ASSET_FAMILY_MISSING', 'STATE_TEST_BOULDER', ws => setCell(ws, 'STATE_TEST_BOULDER', 'Semantic Asset Family', '*None*')),
    negative('neg_wsr02_visual_state_null_id', 'WSR-02', 'VISUAL_STATE_ID_MISSING', 'STATE_TEST_BOULDER', ws => setCell(ws, 'STATE_TEST_BOULDER', 'Visual State ID', '*None*')),
    negative('neg_wsr02_visual_state_id_not_an_id', 'WSR-02', 'VISUAL_STATE_ID_INVALID', 'STATE_TEST_BOULDER', ws => setCell(ws, 'STATE_TEST_BOULDER', 'Visual State ID', '*a grey boulder*')),
    negative('neg_wsr02_vfx_null_family', 'WSR-02', 'ASSET_FAMILY_MISSING', 'STATE_TEST_FLAME', ws => setCell(ws, 'STATE_TEST_FLAME', 'Semantic Asset Family', '')),
    negative('neg_wsr02_simulation_has_visual', 'WSR-02', 'SIMULATION_HAS_VISUAL', 'STATE_TEST_AQUIFER', ws => setCell(ws, 'STATE_TEST_AQUIFER', 'Visual State ID', '`test_spring`')),
    negative('neg_wsr02_composed_other_system', 'WSR-02', 'COMPOSED_NOT_ALLOWED', 'STATE_TEST_ARCH', ws => setCell(ws, 'STATE_TEST_ARCH', 'System', '`GEOLOGY`')),
    negative('neg_wsr02_composed_incomplete', 'WSR-02', 'COMPOSED_INCOMPLETE', 'STATE_TEST_ARCH', ws => setCell(ws, 'STATE_TEST_ARCH', 'Visual State ID', '`test_arch`')),

    // WSR-03
    negative('neg_wsr03_visual_state_without_entry', 'WSR-03', 'NO_CATALOGUE_ENTRY', 'STATE_TEST_BOULDER', ws => setCell(ws, 'STATE_TEST_BOULDER', 'Visual State ID', '`test_boulder_missing`')),
    negative('neg_wsr03_entry_without_slot', 'WSR-03', 'NO_SLOT', 'STATE_TEST_SPRING', ws => { entry(ws, 'SURFACE_SHARED_WATER_TEST-POOL_A1_DEFAULT').slot = null; }),
    negative('neg_wsr03_slot_not_in_template', 'WSR-03', 'SLOT_NOT_IN_TEMPLATE', 'STATE_TEST_SPRING', ws => { const s = sidecar(ws, 'ATLAS_SURFACE_TEST_TILE_01'); s.slots = s.slots.filter(x => x.slotId !== 'ATLAS_SURFACE_TEST_TILE_01:0002'); }),
    negative('neg_wsr03_slot_rect_differs_in_template', 'WSR-03', 'SLOT_NOT_IN_TEMPLATE', 'STATE_TEST_SPRING', ws => { tslot(ws, 'ATLAS_SURFACE_TEST_TILE_01:0002').h = 96; }),
    negative('neg_wsr03_template_unavailable', 'WSR-03', 'TEMPLATE_UNAVAILABLE', 'STATE_TEST_FLAME', ws => { delete ws.templates['ATLAS_ALL_TEST_PROP_01.json']; }),
    negative('neg_wsr03_not_in_world_catalog', 'WSR-03', 'NOT_IN_WORLD_CATALOG', 'STATE_TEST_SPRING', ws => { delete ws.worldCatalog.water.surface.test_spring; }),
    negative('neg_wsr03_family_not_in_catalogue', 'WSR-03', 'FAMILY_NOT_IN_CATALOGUE', 'FAM_TEST_WATER', ws => { ws.map.assetFamilies = ws.map.assetFamilies.filter(m => m.assetFamily !== 'FAM_TEST_WATER'); }),
    negative('neg_wsr03_proposed_mapping_not_used', 'WSR-03', 'NO_CATALOGUE_ENTRY', 'STATE_TEST_FLAME', ws => { ws.map.visualStates[0].status = 'PROPOSED'; }),
    negative('neg_wsr03_map_target_unknown', 'WSR-03', 'MAP_TARGET_UNKNOWN', 'test_flame', ws => { ws.map.visualStates[0].target = { entryId: 'ALL_SHARED_EFFECT_FX-NOPE_V1_DEFAULT' }; }),
    negative('neg_wsr03_map_unused', 'WSR-03', 'MAP_UNUSED', 'test_unused', ws => { ws.map.visualStates.push({ visualStateId: 'test_unused', target: { entryId: 'ALL_SHARED_ITEM_TEST-LOG_V1_DEFAULT' }, status: 'PROPOSED', reason: 'TEST unused row.' }); }),

    // WSR-04
    negative('neg_wsr04_natural_slot_without_state', 'WSR-04', 'SLOT_NO_STATE', 'ATLAS_ALL_TEST_PROP_01:0003', ws => {
        ws.catalogue.entries.push({ id: 'SURFACE_SHARED_STONE_TEST-PEBBLE_V1_DEFAULT', category: 'STONE', family: 'SOURCE', sourceIds: { catalog: ['objects:test_pebble'] }, slot: { sheetId: 'ATLAS_ALL_TEST_PROP_01', slotId: 'ATLAS_ALL_TEST_PROP_01:0003', x: 96, y: 0, w: 48, h: 48 }, variants: { derivedFrom: null } });
        sidecar(ws, 'ATLAS_ALL_TEST_PROP_01').slots.push({ slotId: 'ATLAS_ALL_TEST_PROP_01:0003', entryId: 'SURFACE_SHARED_STONE_TEST-PEBBLE_V1_DEFAULT', x: 96, y: 0, w: 48, h: 48 });
    }),
    negative('neg_wsr04_class_undeclared', 'WSR-04', 'SLOT_CLASS_UNDECLARED', 'SOURCE:FLORA', ws => { entry(ws, 'ALL_SHARED_ITEM_TEST-LOG_V1_DEFAULT').category = 'FLORA'; }),
    negative('neg_wsr04_non_world_slot_without_source', 'WSR-04', 'SLOT_SOURCE_UNDECLARED', 'ATLAS_ALL_TEST_CHARACTER_01:0001', ws => { entry(ws, 'ALL_SHARED_CHARACTER_TEST-HUMAN_MALE_DEFAULT').sourceIds.brief = []; }),

    // WSR-05
    negative('neg_wsr05_missing_performance_class', 'WSR-05', 'PERFORMANCE_CLASS_MISSING', 'STATE_TEST_SPRING', ws => setCell(ws, 'STATE_TEST_SPRING', 'Performance Class', '')),
    negative('neg_wsr05_invalid_performance_class', 'WSR-05', 'PERFORMANCE_CLASS_INVALID', 'STATE_TEST_SPRING', ws => setCell(ws, 'STATE_TEST_SPRING', 'Performance Class', '`EVERY_FRAME`')),
    ['neg_wsr05_no_column', T => {
        const res = runCase(T, ws => removeColumn(ws, 'Performance Class'));
        const miss = findings(res).filter(f => f.rule === 'WSR-05' && f.code === 'PERFORMANCE_CLASS_MISSING');
        assert(res.code === 1 && miss.length === 8, `want exit 1 and 8 PERFORMANCE_CLASS_MISSING; got ${summary(res)}`);
        return 'WSR-05 PERFORMANCE_CLASS_MISSING x8';
    }],

    // WSR-SCHEMA
    negative('neg_schema_column_missing', 'WSR-SCHEMA', 'COLUMN_MISSING', 'description', ws => removeColumn(ws, 'Description')),
    negative('neg_schema_visual_class_not_in_enum', 'WSR-SCHEMA', 'ENUM_INVALID', 'STATE_TEST_TRAIL', ws => setCell(ws, 'STATE_TEST_TRAIL', 'Visual Class', '`VISUAL_MANDATORY`')),
    negative('neg_schema_state_id_format', 'WSR-SCHEMA', 'STATE_ID_FORMAT', 'State_Test_Aquifer', ws => tableEdit(ws, t => { const i = t.row('STATE_TEST_AQUIFER'); t.lines[i] = t.lines[i].replace('`STATE_TEST_AQUIFER`', '`State_Test_Aquifer`'); })),
    negative('neg_schema_transition_unknown', 'WSR-SCHEMA', 'TRANSITION_UNKNOWN', 'STATE_TEST_SPRING', ws => setCell(ws, 'STATE_TEST_SPRING', 'Transition States', '`STATE_TEST_NOWHERE`')),
    negative('neg_schema_boolean_invalid', 'WSR-SCHEMA', 'TYPE_INVALID', 'STATE_TEST_SPRING', ws => setCell(ws, 'STATE_TEST_SPRING', 'Visible', '`yes`')),

    // MANIFEST-TEMPLATE
    negative('neg_mt_slot_rect_differs', 'MANIFEST-TEMPLATE', 'SLOT_RECT_DIFFERS', 'ATLAS_ALL_TEST_PROP_01:0002', ws => { tslot(ws, 'ATLAS_ALL_TEST_PROP_01:0002').x = 96; }),
    negative('neg_mt_template_slot_missing_from_catalogue', 'MANIFEST-TEMPLATE', 'SLOT_NOT_IN_CATALOGUE', 'ATLAS_ALL_TEST_PROP_01:0009', ws => { sidecar(ws, 'ATLAS_ALL_TEST_PROP_01').slots.push({ slotId: 'ATLAS_ALL_TEST_PROP_01:0009', entryId: 'TEST_ORPHAN', x: 144, y: 0, w: 48, h: 48 }); }),
    negative('neg_mt_catalogue_slot_missing_from_template', 'MANIFEST-TEMPLATE', 'SLOT_NOT_IN_TEMPLATE', 'ATLAS_ALL_TEST_PROP_01:0002', ws => { const s = sidecar(ws, 'ATLAS_ALL_TEST_PROP_01'); s.slots = s.slots.filter(x => x.slotId !== 'ATLAS_ALL_TEST_PROP_01:0002'); }),
    negative('neg_mt_sheet_missing_from_template', 'MANIFEST-TEMPLATE', 'SHEET_NOT_IN_TEMPLATE', 'RMMZ_TEST_A2', ws => { delete ws.templates['RMMZ_TEST_A2.json']; }),
    negative('neg_mt_sheet_missing_from_catalogue', 'MANIFEST-TEMPLATE', 'SHEET_NOT_IN_CATALOGUE', 'RMMZ_TEST_B', ws => { ws.templates['RMMZ_TEST_B.json'] = Object.assign({}, sidecar(ws, 'RMMZ_TEST_A2'), { sheetId: 'RMMZ_TEST_B', slots: [] }); }),
    negative('neg_mt_sheet_geometry_differs', 'MANIFEST-TEMPLATE', 'SHEET_GEOMETRY_DIFFERS', 'RMMZ_TEST_A2', ws => { sidecar(ws, 'RMMZ_TEST_A2').h = 624; }),
    negative('neg_mt_slot_entry_differs', 'MANIFEST-TEMPLATE', 'SLOT_ENTRY_DIFFERS', 'ATLAS_ALL_TEST_PROP_01:0002', ws => { tslot(ws, 'ATLAS_ALL_TEST_PROP_01:0002').entryId = 'ALL_SHARED_ITEM_TEST-OTHER_V1_DEFAULT'; }),
    negative('neg_mt_slot_on_other_sheet', 'MANIFEST-TEMPLATE', 'SLOT_SHEET_DIFFERS', 'ATLAS_ALL_TEST_PROP_01:0002', ws => {
        const s = sidecar(ws, 'ATLAS_ALL_TEST_PROP_01'); const x = s.slots.find(y => y.slotId === 'ATLAS_ALL_TEST_PROP_01:0002');
        s.slots = s.slots.filter(y => y !== x); sidecar(ws, 'RMMZ_TEST_A2').slots.push(x);
    }),
    negative('neg_mt_slot_id_not_of_its_sheet', 'MANIFEST-TEMPLATE', 'SLOT_ID_SHEET_MISMATCH', 'ATLAS_ALL_TEST_OTHER_01:0002', ws => { entry(ws, 'ALL_SHARED_ITEM_TEST-LOG_V1_DEFAULT').slot.slotId = 'ATLAS_ALL_TEST_OTHER_01:0002'; }),
    negative('neg_mt_slot_on_unknown_sheet', 'MANIFEST-TEMPLATE', 'SLOT_SHEET_UNKNOWN', 'ATLAS_ALL_TEST_GONE_01:0001', ws => { const s = entry(ws, 'ALL_SHARED_ITEM_TEST-LOG_V1_DEFAULT').slot; s.sheetId = 'ATLAS_ALL_TEST_GONE_01'; s.slotId = 'ATLAS_ALL_TEST_GONE_01:0001'; }),
    negative('neg_mt_duplicate_template_slot', 'MANIFEST-TEMPLATE', 'DUPLICATE_TEMPLATE_SLOT', 'ATLAS_ALL_TEST_PROP_01:0002', ws => { sidecar(ws, 'ATLAS_ALL_TEST_CHARACTER_01').slots.push(Object.assign({}, tslot(ws, 'ATLAS_ALL_TEST_PROP_01:0002'))); }),
    negative('neg_mt_duplicate_entry_id', 'MANIFEST-TEMPLATE', 'DUPLICATE_ENTRY_ID', 'ALL_SHARED_ITEM_TEST-LOG_V1_DEFAULT', ws => { ws.catalogue.entries.push(Object.assign({}, entry(ws, 'ALL_SHARED_ITEM_TEST-LOG_V1_DEFAULT'), { slot: null })); }),
    negative('neg_mt_duplicate_catalogue_slot', 'MANIFEST-TEMPLATE', 'DUPLICATE_SLOT_ID', 'ATLAS_ALL_TEST_PROP_01:0002', ws => { entry(ws, 'ALL_SHARED_EFFECT_FX-FLAME_V1_DEFAULT').slot.slotId = 'ATLAS_ALL_TEST_PROP_01:0002'; }),

    // PLACED-IN-SLOT
    negative('neg_placed_region_outside_slot', 'PLACED-IN-SLOT', 'PLACED_OUTSIDE_SLOT', 'ATLAS_ALL_TEST_PROP_01:0002', ws => { ws.placements[0].filled[1].x = 96; }),
    negative('neg_placed_region_larger_than_slot', 'PLACED-IN-SLOT', 'PLACED_OUTSIDE_SLOT', 'ATLAS_SURFACE_TEST_TILE_01:0006', ws => { ws.placements[0].filled[0].h = 144; }),
    negative('neg_placed_unknown_slot_outside', 'PLACED-IN-SLOT', 'PLACED_OUTSIDE_SLOT', 'ATLAS_ALL_TEST_PROP_01@144,0,48x48', ws => { const f = ws.placements[0].filled[1]; delete f.slotId; f.x = 144; }),
    negative('neg_placed_ledger_unknown_id', 'PLACED-IN-SLOT', 'LEDGER_ID_UNKNOWN', 'ATLAS_ALL_TEST_PROP_01:0007', ws => { ws.approvals = ws.approvals.replace('`ATLAS_ALL_TEST_PROP_01:0002`', '`ATLAS_ALL_TEST_PROP_01:0007`'); }),
    negative('neg_placed_ledger_malformed', 'PLACED-IN-SLOT', 'LEDGER_MALFORMED', 'approvals.md', ws => { ws.approvals = ws.approvals.replace('| 2026-09-26 | YEA | `ATLAS_ALL', '| 2026-13-45 | YEA | `ATLAS_ALL'); }),
    negative('neg_placed_report_invalid', 'PLACED-IN-SLOT', 'PLACEMENT_REPORT_INVALID', 'placement_0.json', ws => { ws.placements[0].schema = 'deus-art-placement/0'; }),
    ['placed_region_inside_without_slot_id', T => {
        const res = runCase(T, ws => { delete ws.placements[0].filled[1].slotId; });
        assert(res.code === 0, `a region inside a slot, given without slotId, must pass; got ${summary(res)}`);
        return 'exit 0';
    }],
    ['placed_none_reported', T => {
        const res = runCase(T, ws => { ws.approvals = null; ws.placements = []; });
        const p = JSON.parse(res.report.json).counts.placed;
        assert(res.code === 0 && p.ledgerSection === 'ABSENT' && p.placementReports === 0 && p.placedRegions === 0, `want exit 0 and no placed art; got ${JSON.stringify(p)} ${summary(res)}`);
        return 'ledger ABSENT, 0 regions';
    }],

    // Baseline, --strict
    ['baseline_new_gap_fails', T => {
        const res = runCase(T, ws => setCell(ws, 'STATE_TEST_SPRING', 'Performance Class', ''));
        assert(res.code === 1 && res.lines.some(l => l.startsWith('NEW WSR-05 PERFORMANCE_CLASS_MISSING STATE_TEST_SPRING')) && res.lines.some(l => l.startsWith('GATE: FAILED (1 new, 0 stale)')), `want exit 1 with one NEW line; got ${res.lines.slice(-3).join(' / ')}`);
        return 'exit 1, 1 new';
    }],
    ['baseline_baselined_gap_passes', T => {
        const res = runCase(T, ws => {
            setCell(ws, 'STATE_TEST_SPRING', 'Performance Class', '');
            ws.baseline.entries.push({ rule: 'WSR-05', code: 'PERFORMANCE_CLASS_MISSING', id: 'STATE_TEST_SPRING', reason: 'TEST: baselined on purpose for the gate check.' });
        });
        assert(res.code === 0 && res.lines.includes('GATE: OK (every violation and gap is baselined; no stale entry)'), `want exit 0; got ${summary(res)}`);
        return 'exit 0';
    }],
    ['baseline_stale_entry_fails', T => {
        const res = runCase(T, ws => ws.baseline.entries.push({ rule: 'WSR-05', code: 'PERFORMANCE_CLASS_MISSING', id: 'STATE_TEST_SPRING', reason: 'TEST: a gap that no longer occurs.' }));
        assert(res.code === 1 && res.lines.some(l => l.startsWith('STALE WSR-05 PERFORMANCE_CLASS_MISSING STATE_TEST_SPRING')) && res.lines.some(l => l.startsWith('GATE: FAILED (0 new, 1 stale)')), `want exit 1 with one STALE line; got ${res.lines.slice(-3).join(' / ')}`);
        return 'exit 1, 1 stale';
    }],
    ['strict_fails_on_baselined_gap', T => {
        const res = runCase(T, ws => {
            setCell(ws, 'STATE_TEST_SPRING', 'Performance Class', '');
            ws.baseline.entries.push({ rule: 'WSR-05', code: 'PERFORMANCE_CLASS_MISSING', id: 'STATE_TEST_SPRING', reason: 'TEST: baselined on purpose for the strict check.' });
        }, ['--strict']);
        assert(res.code === 1 && res.lines.some(l => l.startsWith('STRICT: FAILED (1 violation(s) or gap(s)')), `want exit 1 from --strict; got ${res.lines.slice(-2).join(' / ')}`);
        return 'exit 1';
    }],
    ['baseline_exempt_is_not_baselinable', T => {
        const res = runCase(T, ws => ws.baseline.entries.push({ rule: 'WSR-02', code: 'COMPOSED_EXEMPT', id: 'STATE_TEST_ARCH', reason: 'TEST: exemptions never gate, so this entry is stale.' }));
        assert(res.code === 1 && res.lines.some(l => l.startsWith('STALE WSR-02 COMPOSED_EXEMPT STATE_TEST_ARCH')), `want exit 1 (stale); got ${res.lines.slice(-2).join(' / ')}`);
        return 'exit 1';
    }],
    ['baseline_reason_required', T => {
        const res = runCase(T, ws => ws.baseline.entries.push({ rule: 'WSR-05', code: 'PERFORMANCE_CLASS_MISSING', id: 'STATE_TEST_SPRING', reason: '' }));
        assert(res.code === 2 && res.lines.some(l => /baseline .* is invalid: .*reason must be one line/.test(l)), `want exit 2 naming the reason; got ${res.lines.join(' / ')}`);
        return 'exit 2';
    }],
    ['baseline_duplicate_rejected', T => {
        const e = { rule: 'WSR-05', code: 'PERFORMANCE_CLASS_MISSING', id: 'STATE_TEST_SPRING', reason: 'TEST: the same entry twice.' };
        const res = runCase(T, ws => { ws.baseline.entries.push(e, Object.assign({}, e)); });
        assert(res.code === 2 && res.lines.some(l => /duplicate entry/.test(l)), `want exit 2 (duplicate); got ${res.lines.join(' / ')}`);
        return 'exit 2';
    }],

    // Report, --check, determinism
    ['report_deterministic', T => {
        const da = path.join(tmpRoot, `repA${++wsCounter}`), db = path.join(tmpRoot, `repB${++wsCounter}`);
        const a = runCase(T, ws => setCell(ws, 'STATE_TEST_SPRING', 'Performance Class', ''), ['--report', da]);
        const b = runCase(T, ws => setCell(ws, 'STATE_TEST_SPRING', 'Performance Class', ''), ['--report', db]);
        const out = [];
        for (const f of [T.REPORT_JSON, T.REPORT_MD]) {
            const x = sha(path.join(da, f)), y = sha(path.join(db, f));
            assert(x === y, `${f} differs between two runs: ${x} vs ${y}`);
            out.push(`${f} ${x}`);
        }
        assert(a.code === 1 && b.code === 1, 'both runs should fail the gate (one new gap)');
        return out.join('; ');
    }],
    ['report_has_no_paths_or_times', T => {
        const res = runCase(T, ws => setCell(ws, 'STATE_TEST_SPRING', 'Performance Class', ''));
        for (const text of [res.report.json, res.report.md]) {
            assert(!text.includes(tmpRoot) && !text.includes(os.tmpdir()), 'report contains a temp path');
            assert(!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text), 'report contains a timestamp');
            assert(!/[A-Za-z]:\\/.test(text), 'report contains a Windows path');
        }
        return 'no temp path, timestamp or Windows path';
    }],
    ['report_lists_every_finding', T => {
        const res = runCase(T, ws => { setCell(ws, 'STATE_TEST_SPRING', 'Performance Class', ''); removeColumn(ws, 'Description'); ws.placements[0].filled[1].x = 96; });
        const rep = JSON.parse(res.report.json);
        assert(rep.findings.length === findings(res).length && findings(res).length >= 3, `JSON findings ${rep.findings.length} vs ${findings(res).length}`);
        for (const f of findings(res)) assert(res.report.md.includes(`| ${f.code} | ${f.severity} |`) && res.report.md.includes(`${f.idKind} ${f.id}`), `md lacks ${f.rule}/${f.code}/${f.id}`);
        for (const r of ['WSR-01', 'WSR-02', 'WSR-03', 'WSR-04', 'WSR-05', 'WSR-SCHEMA', 'MANIFEST-TEMPLATE', 'PLACED-IN-SLOT']) assert(rep.counts.rules[r], `counts.rules lacks ${r}`);
        return `${rep.findings.length} findings in both files`;
    }],
    ['check_matches_committed_report', T => {
        const dir = path.join(tmpRoot, `rep${++wsCounter}`);
        const w = runCase(T, null, ['--report', dir]);
        assert(w.code === 0, `writing the report failed: ${summary(w)}`);
        const c = runCase(T, null, ['--check', '--report', dir]);
        assert(c.code === 0 && c.lines.some(l => l.startsWith('CHECK: OK')), `want CHECK: OK; got ${c.lines.slice(-2).join(' / ')}`);
        return 'exit 0';
    }],
    ['check_detects_changed_report', T => {
        const dir = path.join(tmpRoot, `rep${++wsCounter}`);
        runCase(T, null, ['--report', dir]);
        fs.appendFileSync(path.join(dir, T.REPORT_MD), 'edited by hand\n');
        const c = runCase(T, null, ['--check', '--report', dir]);
        assert(c.code === 1 && c.lines.some(l => l.endsWith(`/${T.REPORT_MD}`) && l.startsWith('DIFF')), `want exit 1 and a DIFF line; got ${c.lines.slice(-2).join(' / ')}`);
        const d = path.join(tmpRoot, `rep${++wsCounter}`);
        fs.mkdirSync(d);
        const m = runCase(T, null, ['--check', '--report', d]);
        assert(m.code === 1 && m.lines.some(l => l.includes('(missing)')), `want exit 1 for a missing report; got ${m.lines.slice(-2).join(' / ')}`);
        return 'edited: exit 1; missing: exit 1';
    }],
    ['check_detects_stale_input', T => {
        const dir = path.join(tmpRoot, `rep${++wsCounter}`);
        runCase(T, null, ['--report', dir]);
        const c = runCase(T, ws => setCell(ws, 'STATE_TEST_SPRING', 'Performance Class', ''), ['--check', '--report', dir]);
        assert(c.code === 1 && c.lines.some(l => l.startsWith('DIFF')), `a new gap must make the committed report stale; got ${c.lines.slice(-2).join(' / ')}`);
        return 'exit 1';
    }],
    ['check_folds_crlf', T => {
        const dir = path.join(tmpRoot, `rep${++wsCounter}`);
        runCase(T, null, ['--report', dir]);
        for (const f of [T.REPORT_JSON, T.REPORT_MD]) { const p = path.join(dir, f); fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/\n/g, '\r\n')); }
        const c = runCase(T, null, ['--check', '--report', dir]);
        assert(c.code === 0, `a CRLF checkout of the committed report must still match; got ${c.lines.slice(-2).join(' / ')}`);
        return 'exit 0';
    }],

    // Parsing and usage
    ['parse_error_names_the_line', T => {
        let line = 0;
        const res = runCase(T, ws => { line = lineOfRow(ws, 'STATE_TEST_BOULDER'); tableEdit(ws, t => { const i = t.row('STATE_TEST_BOULDER'); const c = t.cells(i); c.pop(); t.set(i, c); }); });
        assert(res.code === 2 && res.lines.some(l => l.includes(`registry.md:${line}:`) && l.includes('cells')), `want exit 2 naming registry.md:${line}; got ${res.lines.join(' / ')}`);
        return `registry.md:${line}`;
    }],
    ['parse_bad_schema_names_the_line', T => {
        let line = 0;
        const res = runCase(T, ws => { const L = ws.registry.split('\n'); line = L.findIndex(l => l.trim() === '```json') + 1; ws.registry = ws.registry.replace('"stateId",\n', '"stateId"\n'); });
        assert(res.code === 2 && res.lines.some(l => l.includes(`registry.md:${line}:`) && l.includes('does not parse')), `want exit 2 naming registry.md:${line}; got ${res.lines.join(' / ')}`);
        return `registry.md:${line}`;
    }],
    ['parse_every_seed_table_read', T => {
        const res = runCase(T, ws => {
            ws.registry += '\n## 3b. More TEST_ states\n\n| State ID | System | Authoritative Source | Visual Class | Semantic Asset Family | Visual State ID | Performance Class |\n|---|---|---|---|---|---|---|\n| `STATE_TEST_EXTRA` | `CREATURE_ECOLOGY` | TEST | `SIMULATION_ONLY` | *None* | *None* | `STATIC_TERRAIN` |\n';
        });
        const c = JSON.parse(res.report.json).counts.registry;
        assert(c.rows === 9 && c.seedTables.length === 2, `want 9 rows in 2 tables; got ${c.rows} rows, ${JSON.stringify(c.seedTables)}`);
        assert(has(res, 'WSR-01', 'SYSTEM_NOT_IN_ENUM', 'STATE_TEST_EXTRA') && has(res, 'WSR-SCHEMA', 'COLUMN_MISSING', 'description'), `the second table's row or its missing columns were not checked; ${summary(res)}`);
        return '2 tables, 9 rows; second-table row and its missing columns reported';
    }],
    ['parse_no_seed_table', T => {
        const res = runCase(T, ws => { ws.registry = ws.registry.replace('| State ID |', '| Name |'); });
        assert(res.code === 2 && res.lines.some(l => l.includes('no seed table')), `want exit 2; got ${res.lines.join(' / ')}`);
        return 'exit 2';
    }],
    ['usage_errors', T => {
        const a = T.runChecker(['--nope']);
        const b = T.runChecker(['--check', '--strict']);
        const c = T.runChecker(['--help']);
        assert(a.code === 2 && b.code === 2 && c.code === 0, `exits ${a.code}, ${b.code}, ${c.code}`);
        return 'unknown 2, --check --strict 2, --help 0';
    }],

    // Generation (Lane T generator, read only)
    ['gen_lane_t_fixture_agrees', T => {
        const res = genCase(T, null);
        const t = res.ctx.tpl;
        const c = JSON.parse(res.report.json).counts.manifestTemplate;
        const mt = findings(res).filter(f => f.rule === 'MANIFEST-TEMPLATE');
        assert(t.mode === 'GENERATED' && t.runs.length === 1 && t.runs[0].exit === 0, `runs ${JSON.stringify(t.runs)}`);
        assert(mt.length === 0, `want no MANIFEST-TEMPLATE finding; got ${mt.map(f => f.code + ' ' + f.id).join(', ')}`);
        assert(c.sheetsCompared === 5 && c.catalogueSlots === 28 && c.slotsAgree === 28, `counts ${JSON.stringify(c)}`);
        return '5 sheets, 28/28 slots agree';
    }],
    ['gen_refusals_recorded_and_rest_compared', T => {
        const res = genCase(T, laneTRefused());
        const t = res.ctx.tpl;
        const mt = findings(res).filter(f => f.rule === 'MANIFEST-TEMPLATE').map(f => `${f.code} ${f.id}`).sort();
        const want = ['SHEET_NOT_IN_TEMPLATE $TEST_Horse', 'SHEET_NOT_IN_TEMPLATE TEST_ATLAS_SURFACE', 'TEMPLATE_REFUSED_SHEET_INVALID $TEST_Horse', 'TEMPLATE_REFUSED_STRATUM_HEIGHT_MISMATCH TEST_ATLAS_SURFACE:0008'];
        assert(JSON.stringify(mt) === JSON.stringify(want), `MANIFEST-TEMPLATE findings ${JSON.stringify(mt)}`);
        assert(t.runs.length === 2 && t.runs[0].exit === 2 && t.runs[1].exit === 0 && t.runs[1].sheets === 3, `runs ${JSON.stringify(t.runs)}`);
        const c = JSON.parse(res.report.json).counts.manifestTemplate;
        assert(c.sheetsCompared === 3 && c.slotsCompared === 4 && c.slotsAgree === 4, `counts ${JSON.stringify(c)}`);
        return '2 refusals, 3 sheets / 4 slots still compared';
    }],
    ['gen_split_run_keeps_slots', T => {
        const whole = genCase(T, null).ctx.tpl.sidecars;
        const split = genCase(T, laneTRefused()).ctx.tpl.sidecars;
        const pick = (list, id) => list.find(s => s.obj.sheetId === id);
        for (const id of ['TEST_A2_SURFACE', '$TEST_Human', '$TEST_Ogre']) {
            const a = pick(whole, id), b = pick(split, id);
            assert(a && b, `sheet ${id} missing from a run`);
            assert(JSON.stringify(a.obj.slots) === JSON.stringify(b.obj.slots) && a.obj.w === b.obj.w && a.obj.h === b.obj.h && a.obj.pngSha256 === b.obj.pngSha256, `sheet ${id}: slots or template differ between the whole run and the split run`);
        }
        return '3 sheets identical (slots and template sha256)';
    }],
    ['gen_catalogue_refusal_blocks_all', T => {
        const c = laneT();
        c.geometry.sha256 = '0'.repeat(64);
        const res = genCase(T, c);
        const t = res.ctx.tpl;
        assert(t.runs.length === 1 && t.runs[0].exit === 2, `runs ${JSON.stringify(t.runs)}`);
        assert(has(res, 'MANIFEST-TEMPLATE', 'TEMPLATE_REFUSED_GEOMETRY_SHA_MISMATCH', 'catalogue'), `no catalogue-level refusal; ${summary(res)}`);
        const missing = findings(res).filter(f => f.code === 'SHEET_NOT_IN_TEMPLATE').length;
        assert(missing === 5, `want 5 SHEET_NOT_IN_TEMPLATE; got ${missing}`);
        return '1 run, 5 sheets unavailable';
    }],
    ['gen_temp_folder_removed', T => {
        const before = tmpTemplateDirs();
        genCase(T, laneTRefused());
        const after = tmpTemplateDirs();
        assert(JSON.stringify(before) === JSON.stringify(after), `temp folders left behind: ${after.filter(x => !before.includes(x)).join(', ')}`);
        return 'no wsr-templates-* folder left';
    }]
];

// Only for the file on disk (these spawn the real file or read repo state; mutants are never on disk).
const DISK_CHECKS = [
    ['cli_exit_codes', () => {
        const { args: a } = writeWorkspace(loadClean());
        const run = extra => childProcess.spawnSync(process.execPath, [TOOL_PATH].concat(a, extra), { cwd: REPO, encoding: 'utf8' }).status;
        const ok = run([]), strict = run(['--strict']);
        const ws = loadClean(); setCell(ws, 'STATE_TEST_SPRING', 'Performance Class', '');
        const neg = childProcess.spawnSync(process.execPath, [TOOL_PATH].concat(writeWorkspace(ws).args), { cwd: REPO, encoding: 'utf8' }).status;
        const bad = childProcess.spawnSync(process.execPath, [TOOL_PATH, '--nope'], { cwd: REPO, encoding: 'utf8' }).status;
        assert(ok === 0 && strict === 0 && neg === 1 && bad === 2, `exits clean ${ok}, strict ${strict}, negative ${neg}, bad argument ${bad}`);
        return 'clean 0, strict 0, negative 1, bad argument 2';
    }],
    ['real_baseline_valid', T => {
        const b = T.loadBaseline(path.join(REPO, T.DEFAULTS.baseline));
        assert(b.entries.length > 0, 'the committed baseline is empty');
        const short = b.entries.filter(e => e.reason.length < 20);
        assert(!short.length, `${short.length} baseline reasons are under 20 characters`);
        return `${b.entries.length} entries, every one with a reason`;
    }]
];

// ---------------------------------------------------------------- mutants

const MUTANTS = [
    ['wsr01_off', 'function ruleWsr01(ctx, add) {', 'function ruleWsr01(ctx, add) { return;'],
    ['wsr02_off', 'function ruleWsr02(ctx, add) {', 'function ruleWsr02(ctx, add) { return;'],
    ['wsr03_off', 'function ruleWsr03(ctx, add) {', 'function ruleWsr03(ctx, add) { return;'],
    ['wsr04_off', 'function ruleWsr04(ctx, add) {', 'function ruleWsr04(ctx, add) { return;'],
    ['wsr05_off', 'function ruleWsr05(ctx, add) {', 'function ruleWsr05(ctx, add) { return;'],
    ['schema_off', 'function ruleSchema(ctx, add) {', 'function ruleSchema(ctx, add) { return;'],
    ['manifest_template_off', 'function ruleManifestTemplate(ctx, add) {', 'function ruleManifestTemplate(ctx, add) { return;'],
    ['placed_off', 'function rulePlaced(ctx, add) {', 'function rulePlaced(ctx, add) { return;'],
    ['baseline_staleness_ignored', 'const stale = [...base.values()].filter(b => !current.has(keyOf(b)))', 'const stale = [].filter(b => !current.has(keyOf(b)))'],
    ['baseline_new_gaps_ignored', 'const fresh = [...current.values()].filter(f => !base.has(keyOf(f)));', 'const fresh = [];'],
    ['strict_uses_baseline', 'if (opts.strict) {', 'if (false) {'],
    ['slot_ids_only_no_rects', 'function sameRect(a, b) { return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h; }', 'function sameRect(a, b) { return true; }'],
    ['sheet_geometry_ignored', 'function sameSheet(a, b) { return a.kind === b.kind && a.w === b.w && a.h === b.h && a.gridPx === b.gridPx; }', 'function sameSheet(a, b) { return true; }'],
    ['template_to_catalogue_direction_off', 'for (const t of tpl.slots) if (!cat.slotById.has(t.slotId))', 'for (const t of []) if (!cat.slotById.has(t.slotId))'],
    ['refusals_dropped', 'for (const x of refusals) if (!res.refusals.some(y => y.key === x.key)) res.refusals.push(x);', ''],
    ['temp_folder_kept', 'fs.rmSync(tmp, { recursive: true, force: true });', 'void tmp;'],
    ['composed_exempt_any_system', 'else if (!ctx.scope.composedExemptSystems.includes(sys))', 'else if (false)'],
    ['proposed_mapping_resolves', "push(m.status === 'ACCEPTED' ? accepted : proposed, m.visualStateId, m)", 'push(accepted, m.visualStateId, m)'],
    ['derived_variant_base_ignored', 'return base && cat.slotByEntry.has(base) ? base : null;', 'return null;'],
    ['world_catalog_leg_off', 'if (!ctx.wc.bare.has(v) && !viaEntry) {', 'if (false) {'],
    ['family_leg_off', 'if (ctx.cat.families.has(fam) || (m && ctx.cat.families.has(m.catalogueFamily))) continue;', 'continue;'],
    ['undeclared_class_allowed', 'if (!decl) { push(undeclared, cls, s); continue; }', 'if (!decl) { continue; }'],
    ['baseline_reason_not_required', "if (typeof e.reason !== 'string' || e.reason.trim().length < 10 || /[\\r\\n]/.test(e.reason))", 'if (false)'],
    ['check_always_matches', 'return { code: diffs.length ? 1 : 0, lines, ctx, report };', 'return { code: 0, lines, ctx, report };'],
    ['report_timestamped', 'const report = { schema: SCHEMA.report, tool: TOOL,', 'const report = { schema: SCHEMA.report, generatedAt: String(process.hrtime.bigint()), tool: TOOL,'],
    ['later_seed_tables_ignored', 'hdr = i - 1;', 'hdr = lines.length;'],
    ['parse_line_dropped',"throw new InputError(`${where(i + 1)}: seed table row has", "throw new InputError(`${displayPath(file)}: seed table row has"]
];

// ---------------------------------------------------------------- runner

function runSuite(T, list, quiet) {
    const results = [];
    for (const [name, fn] of list) {
        if (ONLY && !name.includes(ONLY)) continue;
        let ok = false, detail = '';
        try { detail = fn(T) || ''; ok = true; } catch (err) { detail = err && err.message ? err.message : String(err); }
        results.push({ name, ok, detail });
        if (!quiet) console.log(ok ? `PASS ${name}${detail ? `: ${detail}` : ''}` : `FAIL ${name}: ${detail}`);
    }
    return results;
}

function gitStatus() {
    const r = childProcess.spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: REPO, encoding: 'utf8' });
    return r.status === 0 ? r.stdout : null;
}

function main() {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wsr-test-'));
    let passed = 0, failed = 0;
    const tally = ok => { if (ok) passed++; else failed++; };
    try {
        const statusBefore = gitStatus();
        const src = fs.readFileSync(TOOL_PATH, 'utf8');
        const T = require(TOOL_PATH);
        for (const r of runSuite(T, CHECKS.concat(DISK_CHECKS), false)) tally(r.ok);

        if (!NO_MUTANTS && !ONLY) {
            const control = runSuite(compileTool(src), CHECKS, true);
            const bad = control.filter(r => !r.ok);
            tally(!bad.length);
            console.log(bad.length ? `FAIL mutation_control: the unmutated source compiled in memory fails ${bad.map(r => r.name).join(', ')}` : `PASS mutation_control: the unmutated source compiled in memory passes all ${control.length} checks`);
            for (const [name, from, to] of MUTANTS) {
                const n = src.split(from).length - 1;
                if (n !== 1) { tally(false); console.log(`FAIL mutant_${name}_killed: anchor found ${n} times (want exactly 1)`); continue; }
                let killer = null;
                const tmpBefore = new Set(tmpTemplateDirs());
                try {
                    const M = compileTool(src.replace(from, () => to));
                    const res = runSuite(M, CHECKS, true);
                    const f = res.find(r => !r.ok);
                    killer = f ? `${f.name} (${f.detail.slice(0, 160)})` : null;
                } catch (err) { killer = `compile/load error: ${err.message}`; }
                // A mutant may leave the generator's temp folder behind (temp_folder_kept); remove it.
                for (const d of tmpTemplateDirs()) if (!tmpBefore.has(d)) fs.rmSync(path.join(os.tmpdir(), d), { recursive: true, force: true });
                tally(!!killer);
                console.log(killer ? `PASS mutant_${name}_killed: by ${killer}` : `FAIL mutant_${name}_killed: every check passed against the mutant`);
            }
            if (fs.readFileSync(TOOL_PATH, 'utf8') !== src) { tally(false); console.log('FAIL mutants_left_tool_untouched: the tool file changed on disk'); }
            else { tally(true); console.log('PASS mutants_left_tool_untouched: the tool file on disk is unchanged'); }
        }

        const statusAfter = gitStatus();
        const same = statusBefore !== null && statusBefore === statusAfter;
        tally(same);
        console.log(same ? 'PASS repo_untouched: git status is the same before and after the run' : `FAIL repo_untouched: git status changed during the run (or git is unavailable)`);
    } finally {
        fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
    console.log(`RESULT: ${passed} passed, ${failed} failed`);
    return failed ? 1 : 0;
}

process.exitCode = main();
