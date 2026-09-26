#!/usr/bin/env node
'use strict';
// Self-test for tools/art/validate_asset_standard.js.
// Every check is shown passing on a good record and failing on a mutant of that record.
// A mutant that still passes means the check was removed or weakened.

const fs = require('fs');
const path = require('path');
const V = require('./validate_asset_standard.js');

const ROOT = path.resolve(__dirname, '..', '..');
const FIX = path.join(__dirname, 'fixtures', 'asset_standard');
const load = name => JSON.parse(fs.readFileSync(path.join(FIX, name), 'utf8'));
const standard = V.readJson(path.join(ROOT, 'game', 'data', 'UF_AssetStandard.json'));
const schema = V.readJson(path.join(ROOT, 'game', 'data', 'UF_SpellVisualTable.schema.json'));
const spells = V.readJson(path.join(ROOT, 'game', 'data', 'srd51', 'spells.json'));
const addenda = load('addenda.json');

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
    if (cond) { passed++; console.log('PASS ' + name); }
    else { failed++; console.log('FAIL ' + name + (detail ? ': ' + detail : '')); }
}
function hit(results, ruleId, status) {
    return results.some(r => r.ruleId === ruleId && r.result === status);
}
function kills(name, ruleId, goodResults, badResults) {
    check(name + '.good', hit(goodResults, ruleId, 'pass'), JSON.stringify(goodResults.filter(r => r.ruleId === ruleId)));
    check(name + '.mutant', hit(badResults, ruleId, 'violate'), JSON.stringify(badResults.filter(r => r.ruleId === ruleId)));
}

const valid = load('valid_entry.json');
kills('rows', 'AS-CRIT-001', V.checkEntry(valid, standard).results, V.checkEntry(load('missing_row.json'), standard).results);
const rowMutant = V.clone(valid);
rowMutant.declaredRows = rowMutant.declaredRows.filter(r => r !== 'death');
kills('rows-mutant', 'AS-CRIT-001', V.checkEntry(valid, standard).results, V.checkEntry(rowMutant, standard).results);

kills('frame', 'AS-CRIT-004', V.checkEntry(valid, standard).results, V.checkEntry(load('wrong_frame.json'), standard).results);
const frameMutant = V.clone(valid);
frameMutant.framePx = [32, 48];
kills('frame-mutant', 'AS-CRIT-004', V.checkEntry(valid, standard).results, V.checkEntry(frameMutant, standard).results);

kills('name', 'AS-GLOBAL-010', V.checkEntry(valid, standard).results, V.checkEntry(load('bad_name.json'), standard).results);
const nameMutant = V.clone(valid);
nameMutant.id = 'not a name';
kills('name-mutant', 'AS-GLOBAL-010', V.checkEntry(valid, standard).results, V.checkEntry(nameMutant, standard).results);

const zGood = V.clone(load('bad_zorder.json'));
zGood.paperDoll.zOrder = 6;
kills('zorder', 'AS-HUM-004', V.checkEntry(zGood, standard).results, V.checkEntry(load('bad_zorder.json'), standard).results);
const zMutant = V.clone(zGood);
zMutant.paperDoll.zOrder = 3;
kills('zorder-mutant', 'AS-HUM-004', V.checkEntry(zGood, standard).results, V.checkEntry(zMutant, standard).results);

const eight = load('eight_dir.json');
kills('eight-dir', 'AS-GLOBAL-023', V.checkEntry(valid, standard).results, V.checkEntry(eight, standard).results);
const eightMutant = V.clone(valid);
eightMutant.frames.facings = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'];
kills('eight-dir-mutant', 'AS-GLOBAL-023', V.checkEntry(valid, standard).results, V.checkEntry(eightMutant, standard).results);

const spellGood = schema.examples[0];
kills('spell-damage', 'AS-FX-003', V.checkSpellTable(spellGood, schema, standard), V.checkSpellTable(load('bad_spell.json'), schema, standard));
const spellMutant = V.clone(spellGood);
spellMutant.rows[0].damageTypes = ['void'];
kills('spell-damage-mutant', 'AS-FX-003', V.checkSpellTable(spellGood, schema, standard), V.checkSpellTable(spellMutant, schema, standard));

const human = V.clone(valid);
human.category = 'CHARACTER';
human.id = 'ALL_SHARED_CHARACTER_HUMAN_MALE-T0_DEFAULT';
human.sizeClass = 'Medium';
human.frameClass = 'MEDIUM';
human.declaredRows = standard.humanoidRows.slice();
const humanBad = V.clone(human);
humanBad.declaredRows = human.declaredRows.filter(r => r !== 'dodge');
kills('humanoid-rows', 'AS-HUM-009', V.checkEntry(human, standard).results, V.checkEntry(humanBad, standard).results);

const beast = V.clone(valid);
beast.sizeClass = 'Medium';
beast.frameClass = 'MEDIUM';
beast.declaredAttacks = ['bite'];
beast.declaredRows = standard.critterRows.concat(['attack-bite']);
const beastBad = V.clone(beast);
beastBad.declaredRows = standard.critterRows.slice();
kills('beast-attack', 'AS-BEAST-001', V.checkEntry(beast, standard).results, V.checkEntry(beastBad, standard).results);

const vocabBad = V.clone(valid);
vocabBad.biome = 'NOTABIOME';
kills('band-vocab', 'AS-GLOBAL-019', V.checkEntry(valid, standard).results, V.checkEntry(vocabBad, standard).results);
const legacy = V.clone(valid);
legacy.band = 'LOWER2';
legacy.biome = 'TEMP';
check('band-legacy-unknown', hit(V.checkEntry(legacy, standard).results, 'AS-GLOBAL-019', 'unknown'));

const layer = addenda.layer;
const layerCount = V.clone(layer);
layerCount.frameCount = 2;
layerCount.frames = layer.frames.slice(0, 2);
kills('pose-count', 'AS-HUM-016', V.checkLayer(layer, standard), V.checkLayer(layerCount, standard));
const layerAnchor = V.clone(layer);
delete layerAnchor.frames[1].anchor;
kills('pose-anchor', 'AS-HUM-016', V.checkLayer(layer, standard), V.checkLayer(layerAnchor, standard));
const layerAngle = V.clone(layer);
layerAngle.frames[0].anchor.angle = 'A10';
kills('pose-angle', 'AS-HUM-016', V.checkLayer(layer, standard), V.checkLayer(layerAngle, standard));
const deform = V.clone(layer);
deform.deforming = true;
deform.deformingKind = 'cape';
deform.poses = standard.poseGrid.map(p => p.id);
const deformBad = V.clone(deform);
deformBad.poses = deform.poses.filter(id => id !== 'death');
kills('deforming', 'AS-HUM-017', V.checkLayer(deform, standard), V.checkLayer(deformBad, standard));

const face = addenda.face;
const faceOrder = V.clone(face);
faceOrder.layers = ['background', 'face', 'body-base', 'hair', 'gear', 'overlay'];
kills('face-layers', 'AS-FACE-002', V.checkFace(face, standard), V.checkFace(faceOrder, standard));
const faceBg = V.clone(face);
faceBg.layers = face.layers.slice(1);
kills('face-background', 'AS-FACE-001', V.checkFace(face, standard), V.checkFace(faceBg, standard));
const faceExpr = V.clone(face);
faceExpr.expressions = face.expressions.slice().reverse();
kills('face-expressions', 'AS-FACE-003', V.checkFace(face, standard), V.checkFace(faceExpr, standard));
const faceCell = V.clone(face);
faceCell.cell = [72, 72];
kills('face-anchors', 'AS-FACE-004', V.checkFace(face, standard), V.checkFace(faceCell, standard));
const faceAnchor = V.clone(face);
delete faceAnchor.anchors.crown;
kills('face-anchor-missing', 'AS-FACE-004', V.checkFace(face, standard), V.checkFace(faceAnchor, standard));

const item = addenda.item;
const itemId = V.clone(item);
itemId.id = 'elven_plate';
itemId.artKey = 'elven_plate__elf';
kills('item-id', 'AS-ITEM-001', V.checkItem(item, standard), V.checkItem(itemId, standard));
const itemKey = V.clone(item);
itemKey.artKey = 'armor_plate_dwarf';
kills('art-key', 'AS-ITEM-002', V.checkItem(item, standard), V.checkItem(itemKey, standard));

const icon = addenda.icon;
const iconSize = V.clone(icon);
iconSize.w = 24;
kills('icon-size', 'AS-ICON-001', V.checkIcon(icon, standard), V.checkIcon(iconSize, standard));
const iconRarity = V.clone(icon);
iconRarity.rarity = 'redraw';
iconRarity.id = 'icon:item:longsword_rare';
kills('icon-rarity', 'AS-ICON-003', V.checkIcon(icon, standard), V.checkIcon(iconRarity, standard));

const node = addenda.node;
const nodeBad = V.clone(node);
nodeBad.variants = node.variants.filter(b => b !== 'WILD');
kills('resource', 'AS-NODE-001', V.checkNode(node, standard), V.checkNode(nodeBad, standard));

kills('animation', 'AS-ANIM-001', [V.animationResult(addenda.asset, standard)], [V.animationResult({ id: 'rock', animation: null, exception: null }, standard)]);
const animMutant = V.clone(addenda.staticAsset);
animMutant.exception = 'not-a-real-exception';
kills('animation-exception', 'AS-ANIM-001', [V.animationResult(addenda.staticAsset, standard)], [V.animationResult(animMutant, standard)]);

kills('remains', 'AS-REMAIN-001', V.checkRemains(addenda.remains, standard), V.checkRemains(Object.assign(V.clone(addenda.remains), { skeleton: false }), standard));
kills('carry', 'AS-HAUL-001', V.checkHaul(addenda.haul, standard), V.checkHaul(Object.assign(V.clone(addenda.haul), { carry: 'not-drawn' }), standard));
const vehBad = V.clone(addenda.vehicle);
vehBad.directions = ['S', 'W'];
kills('vehicles', 'AS-VEH-001', V.checkVehicles(addenda.vehicle, standard), V.checkVehicles(vehBad, standard));
const nightBad = V.clone(addenda.night);
nightBad.dynamicLight.blur = true;
kills('night', 'AS-LIGHT-001', V.checkNight(addenda.night), V.checkNight(nightBad));
const nameBad = V.clone(addenda.name);
nameBad.runtimeFile = 'img/characters/$UF_Layer_longsword.png';
kills('filename', 'AS-STYLE-001', V.checkName(addenda.name), V.checkName(nameBad));
kills('ui-min', 'AS-UI-003', V.checkUi(16, standard), V.checkUi(8, standard));
const bannersBad = standard.banners.slice(0, 5);
kills('map', 'AS-MAP-001', V.checkMap(standard.banners, standard), V.checkMap(bannersBad, standard));
const propsBad = standard.readableProps.filter(p => p !== 'gravestone');
kills('props', 'AS-PROP-001', V.checkProps(standard.readableProps, standard), V.checkProps(propsBad, standard));

kills('outfit-matrix', 'AS-HUM-015', V.checkMatrix(standard.outfitMatrix, standard), V.checkMatrix(standard.outfitMatrix.slice(1), standard));
const lifeBad = V.clone(standard.bodyTemplates);
delete lifeBad.elder;
kills('life', 'AS-HUM-019', V.checkLife(standard.bodyTemplates), V.checkLife(lifeBad));

const summonGood = V.checkSummons(spells.entries, standard.summons, standard.summonDerivation);
const extraSpell = { kind: 'spell', id: 'srd:spell:conjure-test', name: 'Conjure Test', data: { description: 'You conjure a test creature.' } };
kills('summon-map', 'AS-SUMMON-001', summonGood, V.checkSummons(spells.entries.concat([extraSpell]), standard.summons, standard.summonDerivation));
const tableBad = V.clone(standard.summons);
tableBad[0].dismiss = '';
kills('summon-parts', 'AS-SUMMON-002', summonGood, V.checkSummons(spells.entries, tableBad, standard.summonDerivation));

function idsMatch(mdText, rules) {
    const mdIds = new Set(mdText.match(/AS-[A-Z]+-\d{3}/g) || []);
    const jsonIds = Object.keys(rules);
    return jsonIds.every(id => mdIds.has(id)) && [...mdIds].every(id => rules[id]);
}
const md = fs.readFileSync(path.join(ROOT, 'docs', 'art', 'DEUS_ASSET_STANDARD.md'), 'utf8');
const jsonIds = Object.keys(standard.rules);
check('rule-ids', idsMatch(md, standard.rules), 'set mismatch');
const dropped = V.clone(standard);
delete dropped.rules[jsonIds[0]];
check('rule-ids-mutant', idsMatch(md, dropped.rules) === false);

const src = fs.readFileSync(path.join(__dirname, 'validate_asset_standard.js'), 'utf8');
check('no-write-api', !/writeFile|appendFile|createWriteStream|mkdirSync|unlinkSync|rmSync/.test(src));
const writes = { n: 0 };
const orig = fs.writeFileSync;
fs.writeFileSync = function () { writes.n++; return orig.apply(fs, arguments); };
V.checkEntry(valid, standard);
V.collectGlobals(standard, spells, schema);
fs.writeFileSync = orig;
check('no-write-call', writes.n === 0, 'writes ' + writes.n);

function quiet(fn) {
    const log = console.log;
    const err = console.error;
    const write = process.stdout.write;
    console.log = () => {};
    console.error = () => {};
    process.stdout.write = () => true;
    try { return fn(); }
    finally {
        console.log = log;
        console.error = err;
        process.stdout.write = write;
    }
}
const strictOk = quiet(() => V.main(['--catalogue', path.join(FIX, 'mini_catalogue.json'), '--strict', '--json'], { noExit: true }));
check('cli-strict-clean', strictOk === 0, 'exit ' + strictOk);
const strictBad = quiet(() => V.main(['--catalogue', path.join(FIX, 'eight_catalogue.json'), '--strict'], { noExit: true }));
check('cli-strict-eight', strictBad === 1, 'exit ' + strictBad);

const checked = ['AS-GLOBAL-010', 'AS-GLOBAL-014', 'AS-GLOBAL-019', 'AS-GLOBAL-022', 'AS-GLOBAL-023', 'AS-CRIT-001', 'AS-CRIT-004', 'AS-BEAST-001', 'AS-HUM-004', 'AS-HUM-009', 'AS-HUM-015', 'AS-HUM-016', 'AS-HUM-017', 'AS-HUM-019', 'AS-FACE-001', 'AS-FACE-002', 'AS-FACE-003', 'AS-FACE-004', 'AS-ICON-001', 'AS-ICON-003', 'AS-ITEM-001', 'AS-ITEM-002', 'AS-NODE-001', 'AS-ANIM-001', 'AS-FX-003', 'AS-FX-005', 'AS-UI-003', 'AS-SUMMON-001', 'AS-SUMMON-002', 'AS-REMAIN-001', 'AS-HAUL-001', 'AS-VEH-001', 'AS-LIGHT-001', 'AS-MAP-001', 'AS-PROP-001', 'AS-STYLE-001'];
const srcHas = checked.filter(id => src.indexOf(id) === -1);
check('checks-present', srcHas.length === 0, srcHas.join(','));

console.log('RESULT: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
