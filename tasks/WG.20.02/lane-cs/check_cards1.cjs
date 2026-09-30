'use strict';
// Read-only lane assertions. These do not replace the required catalogue/schema gate.
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { execFileSync } = require('child_process');
const root = path.resolve(__dirname, '../../..');
const B = require(path.join(root, 'tools/art/build_catalogue.js'));
const catPath = 'art/catalogue/catalogue.json';
const cardPath = 'docs/art/cards/TEMPERATE_BATCH1_GENERATIONS.md';
const cat = JSON.parse(fs.readFileSync(path.join(root, catPath), 'utf8'));
const doc = fs.readFileSync(path.join(root, cardPath), 'utf8').replace(/\r\n/g, '\n');
const before = JSON.parse(execFileSync('git', ['show', 'b0b0b784:' + catPath], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
const built = B.build({ root });
assert(built.ok, 'Cannot obtain catalogue validation context');
const kinds = ['rock', 'dirt', 'forest-floor', 'needle-floor', 'shrub-soil', 'dry-grass', 'mud', 'swamp-mud', 'stony', 'scree', 'sand'];
const runs = [1,4,7,10,13,16,19,22,28,31,34];
const uniform = new Map([[25, 'SURFACE_SHARED_TERRAIN_PEAK-ROCK_A2_DEFAULT'], [37, 'SURFACE_SHARED_TERRAIN_ROAD_A2_DEFAULT'], [48, 'ALL_SHARED_TERRAIN_CAVE-FLOOR_A2_DEFAULT'], [49, 'ALL_SHARED_TERRAIN_MINED-STONE_A2_DEFAULT'], [50, 'ALL_SHARED_TERRAIN_MINED-SOIL_A2_DEFAULT']]);
const expected = new Set(kinds.flatMap(k => [1,2,3].map(v => `SURFACE_SHARED_TERRAIN_${k.toUpperCase()}_V${v}_DEFAULT`)));
const oldIds = new Set(before.entries.map(e => e.id));
const additions = c => c.entries.filter(e => !oldIds.has(e.id));
const cards = d => new Map([...d.matchAll(/^### (\d+)\. [\s\S]*?(?=^### |$(?![\s\S]))/gm)].map(m => [+m[1], m[0]]));
const checks = [
    ['metadata', (c) => {
        const rows = additions(c);
        assert.deepEqual(new Set(rows.map(e => e.id)), expected);
        assert.equal(rows.length, 33);
        for (const e of rows) {
            assert.equal(e.status, 'MISSING');
            assert.deepEqual(e.envelope, { wMin: 48, wTarget: 48, wMax: 48, hMin: 48, hTarget: 48, hMax: 48 });
            assert.deepEqual(e.footprint, { w: 1, h: 1 });
            assert.deepEqual(e.frames, { cols: 1, rows: 1, facings: ['S'], rate: null });
            assert.deepEqual(e.runtime, { kind: 'NONE', file: null });
            assert.equal(e.variants.derivedFrom, null);
            assert.equal(e.promptFile, cardPath);
            const base = before.entries.find(b => b.id === e.id.replace(/_V[123]_/, '_A2_'));
            assert.deepEqual(e.paletteRampIds, base.paletteRampIds);
            assert.deepEqual(e.sourceIds.catalog, base.sourceIds.catalog);
            const state = {1: 'damp', 2: 'base', 3: 'dry'}[e.id.match(/_V([123])_/)[1]];
            assert(e.statusWhy.includes(`DEC-045 ${state} (`));
        }
    }, c => { additions(c)[0].status = 'APPROVED'; }],
    ['preserve_existing', c => {
        assert.deepEqual(c.entries.filter(e => oldIds.has(e.id)), before.entries);
        assert.deepEqual(c.sheets.filter(s => before.sheets.some(b => b.sheetId === s.sheetId)), before.sheets);
        assert.equal(c.references?.path, before.references?.path);
        for (const k of Object.keys(before).filter(k => !['entries','sheets','sources','references'].includes(k))) assert.deepEqual(c[k], before[k]);
    }, c => { c.entries[0].statusWhy = 'TEST_CHANGED'; }],
    ['actual_catalogue_structure', c => {
        const errors = B.validateCatalogue(c, built.validateCtx);
        assert.deepEqual(errors, [], JSON.stringify(errors.slice(0, 3)));
    }, c => { additions(c)[1].slot = { ...additions(c)[0].slot }; }],
    ['card_links', (c, d) => {
        const blocks = cards(d);
        assert.equal(blocks.size, 77);
        assert(!blocks.has(26) && !blocks.has(27));
        kinds.forEach((k, i) => [2,1,3].forEach((v, j) => {
            const id = `SURFACE_SHARED_TERRAIN_${k.toUpperCase()}_V${v}_DEFAULT`;
            assert(blocks.get(runs[i] + j).includes('`' + id + '`'), `run ${runs[i] + j}`);
            assert.equal(c.entries.filter(e => e.id === id).length, 1);
        }));
        for (const [n, id] of uniform) {
            assert(blocks.get(n).includes('`' + id + '`'), `uniform run ${n}`);
            assert.equal(c.entries.filter(e => e.id === id).length, 1);
            assert(!c.entries.some(e => e.id.startsWith(id.replace('_A2_DEFAULT', '_V'))));
        }
    }, (c, d) => d.replace('`SURFACE_SHARED_TERRAIN_ROCK_V2_DEFAULT`', '`SURFACE_SHARED_TERRAIN_ROCK_V1_DEFAULT`')],
    ['terrain_gates', (c, d) => {
        const settings = 'Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile';
        for (const [n, block] of cards(d)) {
            if (n <= 37 || (n >= 48 && n <= 52)) assert(block.includes(settings), `settings run ${n}`);
            if (n <= 36 || (n >= 48 && n <= 52)) {
                const specs = block.split('\n').find(l => l.startsWith('Specs:'));
                for (const gate of ['Master palette only, ≤8 colours, no outline, no glow.', "Same hue as this kind's base; damp is one grey-value step darker, dry one step paler.", 'Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only.', 'Driest of this kind must still read apart from the dampest neighbour kind.']) assert(specs.includes(gate), `Specs run ${n}`);
            }
        }
    }, (c, d) => d.replace('segmentation off', 'segmentation on')],
    ['static_first', (c, d) => {
        const blocks = cards(d);
        for (const n of [38,40,42,44,46]) {
            assert(!blocks.get(n).includes('It will be animated'));
            assert(blocks.get(n).includes('Static single frame.'));
        }
        for (const n of [39,41,43,45,47,75,76,77,78,79]) assert(blocks.get(n).split('\n')[0].includes('DEFERRED'), `animation run ${n}`);
        for (const n of [51,52]) assert(blocks.get(n).includes('outside the 16 terrain kinds'));
    }, (c, d) => d.replace('### 39. Fresh water — animation (3 phases) — DEFERRED', '### 39. Fresh water — animation (3 phases)')],
    ['references_and_text', (c, d) => {
        const blocks = cards(d);
        assert(d.indexOf('## Owner run order') < d.indexOf('## Ground'));
        for (const n of [25,31]) assert(blocks.get(n).includes('style reference: your accepted Rock base tile'));
        for (const n of [28,37,50]) assert(blocks.get(n).includes('style reference: your accepted Dirt base tile'));
        for (const n of [13,14,15]) assert(blocks.get(n).includes('no grass tufts, no bush.'));
        for (const n of [20,23]) assert(blocks.get(n).includes('no specular highlight.'));
        for (const n of [21,24]) assert(blocks.get(n).includes('no cracked crust.'));
        for (const n of [31,32,33]) assert(blocks.get(n).includes('tight-packed angular broken stones, fully opaque, no intact slab, no holes.'));
        for (const n of [49,50]) assert(blocks.get(n).includes('evenly scattered, no centred motif'));
        assert(!blocks.get(37).includes('Do not paint roads'));
        assert(!blocks.get(73).includes('Never a 48 px tree enlarged'));
        assert(blocks.get(61).includes('binary-alpha wording correction remains deferred'));
    }, (c, d) => d.replace('no grass tufts, no bush.', 'grass tufts and a bush.')]
];
let passed = 0, failed = 0;
for (const [name, check, mutate] of checks) {
    try { check(cat, doc); console.log('PASS cards1.' + name); passed++; }
    catch (error) { console.log('FAIL cards1.' + name + ': ' + error.message.slice(0, 500)); failed++; }
    if (process.argv.includes('--self-test')) {
        const broken = JSON.parse(JSON.stringify(cat));
        let rejected = false;
        try { const changedDoc = mutate(broken, doc); check(broken, typeof changedDoc === 'string' ? changedDoc : doc); } catch (_) { rejected = true; }
        console.log(`${rejected ? 'PASS' : 'FAIL'} cards1.reject_${name}: ${rejected ? 'mutated input rejected' : 'mutation escaped check'}`);
        if (rejected) passed++; else failed++;
    }
}
console.log(`RESULT: ${passed} passed, ${failed} failed (lane checks only; required schema/rebuild gate remains separate)`);
process.exitCode = failed ? 1 : 0;
