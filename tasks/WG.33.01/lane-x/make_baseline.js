#!/usr/bin/env node
'use strict';
/**
 * tasks/WG.33.01/lane-x/make_baseline.js — writes tools/wsr/known_gaps.json for the repository at hand.
 *
 * Runs tools/verify_world_state_registry.js in-process against an empty baseline, then gives every
 * violation and gap a one-line reason from the table below (keyed by rule and code, with details taken
 * from the finding). It stops with exit 1, writing nothing, if a finding has no reason rule, so a new
 * kind of gap can never be baselined silently. Deterministic: same inputs, same bytes.
 * The question and proposal ids (X-Qn, X-En, PROPOSED-X-nn) are defined in tasks/WG.33.01/lane-x/REPORT.md.
 *
 * Usage: node tasks/WG.33.01/lane-x/make_baseline.js [--check]
 *   --check  do not write; exit 1 if tools/wsr/known_gaps.json differs from what would be written.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..', '..');
const T = require(path.join(REPO, 'tools', 'verify_world_state_registry.js'));
const OUT = path.join(REPO, 'tools', 'wsr', 'known_gaps.json');
const BASE = '425b594c146d5f353c10faa11f4b5d47f499b45f';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wsr-baseline-'));
let res;
try {
    const empty = path.join(tmp, 'empty.json');
    fs.writeFileSync(empty, JSON.stringify({ schema: 'deus-wsr-known-gaps/1', entries: [] }));
    res = T.runChecker(['--baseline', empty]);
} finally {
    fs.rmSync(tmp, { recursive: true, force: true });
}
if (!res.ctx) { console.error(res.lines.join('\n')); process.exit(2); }
const ctx = res.ctx;

const cls = id => { const e = ctx.cat.entries.get(id); return `${e.family}:${e.category}`; };
const slotEntry = slotId => ctx.cat.slotById.get(slotId).entryId;
const stateRes = id => ctx.resolved.find(x => x.row.stateId === id);
const forbidden = new Set((ctx.cat.forbiddenBiomes || []).flatMap(b => b.split('_')));
const snowy = id => { const r = stateRes(id); return [id, r.visualStateId || ''].join('_').toUpperCase().split(/[^A-Z0-9]+/).some(t => forbidden.has(t)); };

const SLOT_WHY = {
    'SOURCE:TERRAIN': 'the registry has soil-moisture, succession and snow states but no state per ground kind (meadow, sand, rock, floors)',
    'SOURCE:WATER': 'the registry has spring, seep, cave-pool and river states but none for these water surfaces',
    'SOURCE:TREE': 'the registry has succession stages and a charred trunk but no state per tree species',
    'SOURCE:FLORA': 'the registry has succession stages but no state per wild plant',
    'SOURCE:STONE': 'the registry has ore and mineral-stain states but none for boulders, outcrops, crystals or deposits',
    'SOURCE:VEIN': 'STATE_GEOL_ORE_VEIN_EXPOSED names ore_vein_exposed, which matches no catalogue id (candidate PROPOSED in visual_state_map.json)',
    'SOURCE:REMAINS': 'STATE_RECL_RUBBLE_MOSS names rubble_mossy, which matches no catalogue id; bones and skeletons have no state'
};

// Every rule below checks that the finding has the cause its reason states, and returns null (refuse)
// otherwise, so a new gap with a different cause is never baselined under a stock reason.
function reason(f) {
    const d = f.detail;
    const refusedSlots = sheetId => ctx.findings.filter(x => x.code === 'TEMPLATE_REFUSED_STRATUM_HEIGHT_MISMATCH' && x.id.startsWith(`${sheetId}:`)).length;
    switch (`${f.rule} ${f.code}`) {
        case 'WSR-01 SYSTEM_NOT_IN_ENUM':
            if (f.value !== 'CREATURE_ECOLOGY') return null;
            return 'Registry row names system CREATURE_ECOLOGY, which is not in the section 2 system enum (the enum has ECOLOGY_WILDLIFE); the registry is Gemini\'s file, question X-Q1.';
        case 'WSR-03 NO_CATALOGUE_ENTRY': {
            const r = stateRes(f.id);
            if (f.value !== r.visualStateId) return null;
            let s = `No catalogue entry for visual state ${r.visualStateId}: catalogue 1.1.0 was built from WorldCatalog, briefs, AR rows and addendum families, not from registry states (WBS WG.20.01 says it consumes them); PROPOSED-X-01.`;
            if (r.rejected.length) s = s.replace(/\.$/, `; it matches only entries whose class may not display a world state: ${r.rejected.join(', ')}.`);
            if (r.proposals.length) s = s.replace(/\.$/, `; PROPOSED candidate in visual_state_map.json: ${r.proposals.join(', ')}.`);
            if (snowy(f.id)) s = s.replace(/\.$/, '; snow/ice also conflicts with the forbidden biomes of game/data/DEUS_BiomeRegistry.json (X-Q6, catalogue Q-SNOW).');
            return s;
        }
        case 'WSR-03 NOT_IN_WORLD_CATALOG': {
            const r = stateRes(f.id);
            if (f.value !== r.visualStateId) return null;
            return `Visual state ${r.visualStateId} is not a game/data/UF_WorldCatalog.json id and resolves to no catalogue entry that cites one: the WorldCatalog lists runtime content, not registry visual states (spec WSR-03 wording, X-Q4).`;
        }
        case 'WSR-03 FAMILY_NOT_IN_CATALOGUE':
            return `Asset family ${f.id} does not exist in the catalogue, whose family field holds SOURCE and the Owner addendum families only; the registry FAM_* families were never added (X-Q5, PROPOSED-X-02).`;
        case 'WSR-04 SLOT_NO_STATE': {
            const e = slotEntry(f.id);
            const c = cls(e);
            if (!SLOT_WHY[c] || f.value !== e) return null;
            return `Natural-world slot of ${e} traces to no registry state: ${SLOT_WHY[c]} (PROPOSED-X-03).`;
        }
        case 'WSR-05 PERFORMANCE_CLASS_MISSING':
            if (d !== 'the seed table has no Performance Class column') return null;
            return 'The registry seed table (section 3) has no Performance Class column, so no state declares one; the registry is Gemini\'s file (X-Q3, PROPOSED-X-04).';
        case 'WSR-SCHEMA COLUMN_MISSING':
            if (!['description', 'visible', 'transitionStates', 'saveRequired'].includes(f.id)) return null;
            return `The section 2 schema requires ${f.id} but the seed table has no ${f.id} column (it carries 6 of the 11 required fields); X-Q3, PROPOSED-X-04.`;
        case 'MANIFEST-TEMPLATE TEMPLATE_REFUSED_STRATUM_HEIGHT_MISMATCH': {
            const e = slotEntry(f.id);
            const slot = ctx.cat.slotById.get(f.id);
            const m = /GEOM_STRATUM_\d needs frame height (\d+) .* but the slot is (\d+) high/.exec(d);
            // The known cause: a stratum slot whose height the catalogue rounded up to the tile grid.
            if (f.value !== e || !m || Number(m[2]) !== slot.h || slot.h % ctx.cat.geometry.tilePx !== 0 || Number(m[1]) >= slot.h) return null;
            const row = ctx.cat.entries.get(e).scaleRow;
            return `The template generator refuses this ${row} slot of ${e}: the catalogue rounds stratum slot heights up to the 48 grid, the generator wants the exact stratum height (Lane T E2/E4, unruled); X-E2, PROPOSED-X-05.`;
        }
        case 'MANIFEST-TEMPLATE TEMPLATE_REFUSED_SHEET_INVALID': {
            const s = ctx.cat.sheets.get(f.id);
            if (!s || s.kind !== 'RMMZ_CHARACTER' || !/is not 3 x 4 frames of an active frame class/.test(d)) return null;
            return `The template generator refuses tree sheet ${f.id}: RMMZ_CHARACTER ${s.w}x${s.h} is not 3 x 4 frames of an active frame class in geometry.json; X-E2, PROPOSED-X-05.`;
        }
        case 'MANIFEST-TEMPLATE SHEET_NOT_IN_TEMPLATE': {
            const n = (ctx.cat.slotsBySheet.get(f.id) || []).length;
            const s = ctx.cat.sheets.get(f.id);
            if (s.kind === 'RMMZ_CHARACTER') {
                if (!ctx.findings.some(x => x.code === 'TEMPLATE_REFUSED_SHEET_INVALID' && x.id === f.id)) return null;
                return `No template for tree sheet ${f.id} because the generator refuses the sheet (SHEET_INVALID); it has ${n} slots; X-E2, PROPOSED-X-05.`;
            }
            if (!refusedSlots(f.id)) return null;
            return `No template for ${f.id} because the generator refuses ${refusedSlots(f.id)} GEOM_STRATUM slots on it, so none of its ${n} slots can be compared; X-E2, PROPOSED-X-05.`;
        }
        default:
            return null;
    }
}

const entries = [];
const missing = [];
for (const f of ctx.findings) {
    if (f.severity !== 'VIOLATION' && f.severity !== 'GAP') continue;
    const r = reason(f);
    if (!r) { missing.push(`${f.rule} ${f.code} ${f.id}`); continue; }
    entries.push(f.value ? { rule: f.rule, code: f.code, id: f.id, value: f.value, reason: r } : { rule: f.rule, code: f.code, id: f.id, reason: r });
}
if (missing.length) {
    console.error(`NO REASON RULE for ${missing.length} finding(s); nothing written:`);
    for (const m of missing.slice(0, 50)) console.error(`  ${m}`);
    process.exit(1);
}

const head = {
    schema: 'deus-wsr-known-gaps/1',
    about: `Known gaps of tools/verify_world_state_registry.js on main ${BASE} (WG.33.01, Lane X, 2026-09-26). Written by tasks/WG.33.01/lane-x/make_baseline.js; every entry has a one-line reason. The gate key is (rule, code, id, value); value is the offending value (system name, visual state id, the entry owning the slot) so a changed value is a new gap. The gate fails on any gap not listed here and on any entry that no longer occurs, so this file must shrink as gaps close. Question and proposal ids (X-Qn, X-En, PROPOSED-X-nn) are in tasks/WG.33.01/lane-x/REPORT.md.`,
    base: BASE
};
const lines = ['{'];
for (const [k, v] of Object.entries(head)) lines.push(`  ${JSON.stringify(k)}: ${JSON.stringify(v)},`);
lines.push('  "entries": [');
entries.forEach((e, i) => lines.push(`    ${JSON.stringify(e)}${i < entries.length - 1 ? ',' : ''}`));
lines.push('  ]', '}');
const text = lines.join('\n') + '\n';

const counts = {};
for (const e of entries) counts[`${e.rule} ${e.code}`] = (counts[`${e.rule} ${e.code}`] || 0) + 1;
for (const k of Object.keys(counts).sort()) console.log(`${String(counts[k]).padStart(5)} ${k}`);
if (process.argv.includes('--check')) {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : null;
    console.log(cur === text ? `BASELINE CHECK: OK (${entries.length} entries match)` : 'BASELINE CHECK: DIFFERS');
    process.exit(cur === text ? 0 : 1);
}
fs.writeFileSync(OUT, text);
console.log(`WROTE tools/wsr/known_gaps.json: ${entries.length} entries`);
