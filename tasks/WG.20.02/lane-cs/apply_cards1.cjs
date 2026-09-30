'use strict';
// One-time, metadata/text-only CARDS-1 migration. No images or external calls.
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '../../..');
const cardPath = 'docs/art/cards/TEMPERATE_BATCH1_GENERATIONS.md';
const catPath = 'art/catalogue/catalogue.json';
const catText = fs.readFileSync(path.join(root, catPath), 'utf8');
const cardText = fs.readFileSync(path.join(root, cardPath), 'utf8');
const cat = JSON.parse(catText);
const kinds = ['dirt', 'rock', 'forest-floor', 'needle-floor', 'shrub-soil', 'dry-grass', 'mud', 'swamp-mud', 'stony', 'scree', 'sand'].sort();
const sheetId = 'ATLAS_SURFACE_SHARED_TILE_DEC045';
assert(!cat.sheets.some(s => s.sheetId === sheetId), 'Migration already applied');
assert(cardText.includes('DRAFT v0.1, 2026-09-29.'), 'Unexpected card revision');
const entries = [];
for (const kind of kinds) {
    const oldId = `SURFACE_SHARED_TERRAIN_${kind.toUpperCase()}_A2_DEFAULT`;
    const old = cat.entries.find(e => e.id === oldId);
    assert(old, `Missing source row ${oldId}`);
    for (const [v, state] of [[1, 'damp'], [2, 'base'], [3, 'dry']]) {
        const entry = JSON.parse(JSON.stringify(old));
        entry.id = oldId.replace('_A2_', `_V${v}_`);
        assert(!cat.entries.some(e => e.id === entry.id), `Duplicate ${entry.id}`);
        entry.sourceIds = Object.fromEntries(Object.keys(old.sourceIds).map(k => [k, k === 'catalog' ? old.sourceIds.catalog : []]));
        entry.scaleRow = 'RMMZ_TILE_48';
        entry.envelope = { wMin: 48, wTarget: 48, wMax: 48, hMin: 48, hTarget: 48, hMax: 48 };
        entry.footprint = { w: 1, h: 1 };
        entry.anchor = { type: 'CENTER', x: 24, y: 24 };
        entry.frames = { cols: 1, rows: 1, facings: ['S'], rate: null };
        entry.slot = { sheetId, slotId: `${sheetId}:${String(entries.length + 1).padStart(4, '0')}`, x: entries.length * 48, y: 0, w: 48, h: 48 };
        entry.runtime = { kind: 'NONE', file: null };
        entry.status = 'REQUESTED';
        entry.statusWhy = `DEC-045 ${state} (V${v}) metadata record; no image, QA or Owner approval; DEC-007 remains in force.`;
        entry.mapping = { scaleBasis: 'MATCH', rampBasis: old.mapping.rampBasis, rule: `DEC-045 ${state} V${v}; 48x48 source stamp; inherited mapping.terrains.${kind.replace(/-/g, '_')}` };
        entry.promptFile = cardPath;
        entry.specFile = null;
        entry.notes = `DEC-045: V1 damp, V2 base, V3 dry. Same hue, adjacent grey-value steps; opaque master-palette fill, at most 8 colours, no outline or glow, self-seam, fixed feature positions, readable against neighbouring kinds. DEC-046: one static frame. Planned consumer: V2 tool-tiled into ${oldId}; V1/V3 layer-1 stamps on DEUS_GroundVar_D under WG.21.01. No runtime placement or image is supplied by this row.`;
        entries.push(entry);
    }
}
// Insert individual rows without reserializing or changing pre-existing records.
const catEol = catText.includes('\r\n') ? '\r\n' : '\n';
let updatedCat = catText;
for (const old of cat.entries.filter(e => kinds.includes(e.id.replace(/^SURFACE_SHARED_TERRAIN_/, '').replace(/_A2_DEFAULT$/, '').toLowerCase()))) {
    const line = updatedCat.split(catEol).find(l => l.startsWith(`    {"id":"${old.id}",`));
    assert(line && line.endsWith(','), `Expected compact source row ${old.id}`);
    const rows = entries.filter(e => e.id.startsWith(old.id.replace('_A2_DEFAULT', '_V')));
    assert.equal(rows.length, 3);
    updatedCat = updatedCat.replace(line, line + catEol + rows.map(e => '    ' + JSON.stringify(e) + ',').join(catEol));
}
const sheet = { sheetId, kind: 'ATLAS', group: { band: 'SURFACE', biome: 'SHARED', type: 'TILE' }, w: entries.length * 48, h: 48, gridPx: 48, runtimeFile: null };
const sheetsAt = `  "sheets": [${catEol}`;
assert(updatedCat.includes(sheetsAt));
updatedCat = updatedCat.replace(sheetsAt, sheetsAt + JSON.stringify(sheet, null, 2).split('\n').map(l => '    ' + l).join(catEol) + ',' + catEol);
assert.equal(JSON.parse(updatedCat).entries.length, cat.entries.length + 33);

const settings = 'Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile';
const gates = "Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.";
const bases = new Set([1,4,7,10,13,16,19,22,28,31,34]);
const damp = new Set([2,5,8,11,14,17,20,23,29,32,35]);
const dry = new Set([3,6,9,12,15,18,21,24,30,33,36]);
const deferred = new Set([39,41,43,45,47,75,76,77,78,79]);
const items = {
    13: 'One seamless tile of gritty light-brown scrubland soil with small stones, no grass tufts, no bush.',
    14: 'One seamless tile of damp gritty light-brown scrubland soil with small stones, no grass tufts, no bush.',
    15: 'One seamless tile of dry, pale gritty light-brown scrubland soil with small stones, no grass tufts, no bush.',
    17: 'One seamless tile of rain-damp golden-brown grass with sparse blades over soil, same hue as the base, one value-step darker.',
    20: 'One seamless tile of damp, darker soft brown marsh mud with broad compressed patches and a little reed stubble, no open puddles, no specular highlight.',
    21: 'One seamless tile of dry, paler soft brown marsh mud with broad compressed patches and a little reed stubble, no open puddles, no cracked crust.',
    23: 'One seamless tile of damp, darker black peaty swamp mud with coarse organic texture and small flecks of moss, no open water, no specular highlight.',
    24: 'One seamless tile of dry, paler black peaty swamp mud with coarse organic texture and small flecks of moss, no open water, no cracked crust.',
    31: 'One seamless tile of grey scree of tight-packed angular broken stones, fully opaque, no intact slab, no holes.',
    32: 'One seamless tile of damp, darker grey scree of tight-packed angular broken stones, fully opaque, no intact slab, no holes.',
    33: 'One seamless tile of dry, paler grey scree of tight-packed angular broken stones, fully opaque, no intact slab, no holes.',
    37: 'A compacted packed-earth cart track with subdued wheel wear, lighter and smoother than bare dirt, no painted border.',
    38: 'Clear fresh river water, cool blue-green, with small restrained groups of ripples.',
    49: 'A newly worked floor of the same grey rock, flatter than the cave floor, with restrained chisel marks, evenly scattered, no centred motif, and the host rock still recognisable.',
    50: 'A freshly dug floor of compacted brown earth with blunt pick marks, evenly scattered, no centred motif, and no surviving turf, the same soil colour as dirt.'
};
let doc = cardText.replace(/\r\n/g, '\n');
doc = doc.replace(/^### (\d+)\. [\s\S]*?(?=^### |$(?![\s\S]))/gm, (block, number) => {
    const n = +number;
    if ([26,27].includes(n)) return '';
    if (n <= 37 || (n >= 48 && n <= 52)) {
        assert(block.includes('Maps → Create Tiles Pro · square top-down · 48 px · view high top-down · segmentation on · one tile'));
        block = block.replace('Maps → Create Tiles Pro · square top-down · 48 px · view high top-down · segmentation on · one tile', settings);
    }
    const v = bases.has(n) ? 2 : damp.has(n) ? 1 : dry.has(n) ? 3 : null;
    if (v) block = block.replace('_A2_DEFAULT`', `_V${v}_DEFAULT\``);
    if ([25,31].includes(n)) block = block.replace('style reference: your Meadow tile', 'style reference: your accepted Rock base tile');
    if (n === 28) block = block.replace('style reference: your Meadow tile', 'style reference: your accepted Dirt base tile');
    if (n === 37) block = block.replace(' Do not paint roads, fences or ruins into natural things.', '');
    if (n <= 36 || (n >= 48 && n <= 52)) block = block.replace(/^Specs: .+$/m, s => s + ' ' + gates);
    if (items[n]) block = block.replace(/(```text\n[^]*?\n\n[^]*?\n\n)[^]*?(\n\nSpecs:)/, (_, start, end) => start + items[n] + end);
    if ([38,40,42,44,46].includes(n)) block = block.replace(' It will be animated in three drawn phases that must each tile seamlessly.', ' Static single frame.');
    if (n === 25) {
        block = block.replace('Peak rock — base', 'Peak rock — uniform');
        block = block.replace('the ordinary state of this ground; match the grain scale and density of its other states.', 'the single uniform state of this ground; no damp or dry variants.');
    }
    if (n === 50) block = block.replace('### 50. Dug earth', '### 50. Mined soil (dug earth)');
    if (n === 73) block = block.replace(' Never a 48 px tree enlarged.', '');
    if (deferred.has(n)) block = block.replace(/^(### .+)\n\n/, '$1 — DEFERRED\n\nDEFERRED under DEC-046 (2026-09-30): animation is outside the static-first batch; retained as a future reference only.\n\n');
    if ([51,52].includes(n)) block = block.replace(/^(### .+)\n\n/, '$1 — DEFERRED (outside the 16 terrain kinds)\n\nOutside the CARDS-1 terrain job; retained as reference metadata only.\n\n');
    if (n === 61) block = block.replace(/^(### .+)\n\n/, '$1\n\nCARDS-1 follow-up: binary-alpha wording correction remains deferred; this card is not QA-cleared by WG.20.02.\n\n');
    return block;
});
const intro = 'DRAFT v0.2, 2026-09-30. CARDS-1 document corrections and DEC-045 catalogue metadata only; this document is not an art request or authorization to execute a tool. Existing run numbers are stable reference IDs, not execution order. World / Biome or depth band / Item / Specs structure retained; World paragraph remains provisional until the lore lock. DEC-046: static first; animation references below are DEFERRED. Nothing enters the game without the Owner\'s YEA.';
doc = doc.replace(/^DRAFT v0\.1[^\n]+/m, intro);
const order = [
    '## Owner run order (CARDS-1 Section 4 reference)',
    '',
    'Recorded dependency order only; no generation is requested by this lane. Within each triplet: base (V2), damp (V1), dry (V3); damp and dry share the accepted base reference.',
    '',
    '1. Dirt 4, 5, 6: Meadow reference for base, then accepted Dirt base.',
    '2. Forest floor 7, 8, 9.',
    '3. Dry grass 16, 17, 18.',
    '4. Rock 1, 2, 3.',
    '5. Stony 28, 29, 30: accepted Dirt base reference for run 28.',
    '6. Shrub soil 13, 14, 15.',
    '7. Needle floor 10, 11, 12.',
    '8. Mud 19, 20, 21.',
    '9. Swamp mud 22, 23, 24.',
    '10. Sand 34, 35, 36.',
    '11. Scree 31, 32, 33: accepted Rock base reference for run 31.',
    '12. Peak rock 25: accepted Rock base reference; uniform.',
    '13. Road 37: accepted Dirt base reference; uniform.',
    '14. Cave floor 48 and mined stone 49: accepted Rock base reference; uniform.',
    '15. Mined soil (dug earth) 50: accepted Dirt base reference; uniform. Canonical ID: `ALL_SHARED_TERRAIN_MINED-SOIL_A2_DEFAULT`.',
    '',
    'Runs 26 and 27 were removed because peak rock is uniform. Runs 51 and 52 are outside these 16 terrain kinds. Water loops 39, 41, 43, 45, 47 and foliage loops 75–79 remain DEFERRED. For uniform cards, the damp/dry Specs comparison describes neighbouring gradient kinds; it does not create additional variants.',
    ''
].join('\n');
doc = doc.replace('## Ground\n', order + '\n## Ground\n');
// Validate both outputs before either write; no other path is writable here.
assert.equal((doc.match(/^### /gm) || []).length, 77);
fs.writeFileSync(path.join(root, catPath), updatedCat);
fs.writeFileSync(path.join(root, cardPath), cardText.includes('\r\n') ? doc.replace(/\n/g, '\r\n') : doc);
console.log('Updated 33 metadata rows, 1 metadata-only atlas, and CARDS-1 text. No images or runtime files written.');
