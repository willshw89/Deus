#!/usr/bin/env node
'use strict';
/**
 * tools/art/validate_asset_standard.js
 *
 * WG.20.01 coverage report for the DEUS asset standard.
 * Reads the catalogue, UF_AssetStandard.json, the spell-visual schema and the SRD spell list.
 * It does not create or modify files, and it does not read or draw pixels (DEC-007).
 *
 *   node tools/art/validate_asset_standard.js [--json] [--category CAT] [--strict]
 *        [--catalogue path] [--standard path] [--spell-schema path] [--spells path]
 *
 * Default exit is 0 when the files parse. --strict exits 1 when any rule result is a violation.
 * Exit 2 is a usage or read error.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const ID_RE = /^[A-Z0-9]+(-[A-Z0-9]+)*(_[A-Z0-9]+(-[A-Z0-9]+)*){5}$/;
const ART_KEY_RE = /^[a-z0-9_]+__[a-z]+(?:-[a-z]+)*$/;
const LAYER_FILE_RE = /^\$UF_Layer_[a-z0-9_]+__[a-z]+(?:-[a-z]+)*\.png$/;
const CHAR_FILE_RE = /^[$][A-Za-z0-9_]+\.png$/;
const OBJECT_FILE_RE = /^![A-Za-z0-9_]+\.png$/;
const FACE_FILE_RE = /^UF_Faces_[a-z0-9-]+_\d+\.png$/;
const RACE_WORDS = ['elven', 'dwarven', 'orcish', 'gnomish'];
const DIR_CATS = { CHARACTER: 1, CREATURE: 1, EQUIPMENT: 1 };
const FRAME_CATS = { CHARACTER: 1, CREATURE: 1, EQUIPMENT: 1 };

function readJson(file) {
    const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
    return JSON.parse(text);
}

function clone(v) { return JSON.parse(JSON.stringify(v)); }

function result(ruleId, status, reason) {
    return { ruleId, result: status, reason: reason || '' };
}

function sameSet(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    const s = new Set(a);
    return b.every(x => s.has(x));
}

function frameOf(entry) {
    if (Array.isArray(entry.framePx) && entry.framePx.length === 2) return entry.framePx;
    const slot = entry.slot;
    const frames = entry.frames;
    if (!slot || !frames) return null;
    const cols = frames.cols;
    const rows = frames.rows;
    if (!cols || !rows) return null;
    if (slot.w % cols !== 0 || slot.h % rows !== 0) return null;
    return [slot.w / cols, slot.h / rows];
}

function isCritter(entry) {
    if (entry.category !== 'CREATURE') return false;
    if (entry.sizeClass === 'Tiny' || entry.sizeClass === 'Small') return true;
    if (entry.frameClass === 'TINY' || entry.frameClass === 'SMALL') return true;
    return false;
}

function isBeast(entry) {
    return entry.category === 'CREATURE' && !isCritter(entry);
}

function raceSpecificItemId(id, races) {
    const s = String(id || '').toLowerCase();
    if (s.indexOf('__') !== -1) return true;
    if (RACE_WORDS.some(w => s.indexOf(w) !== -1)) return true;
    const parts = s.split(/[_-]/);
    return parts.some(p => races.indexOf(p) !== -1);
}

function bandVocab(entry, standard) {
    const bands = new Set(standard.bands.map(b => b.id).concat(standard.sharedTokens.band));
    const biomes = new Set(standard.biomes.concat(standard.sharedTokens.biome, standard.transitions));
    const legacyB = new Set(standard.legacyBands);
    const legacyM = new Set(standard.legacyBiomes);
    if (!entry.band || !entry.biome) {
        return result('AS-GLOBAL-019', 'unknown', 'band or biome is absent');
    }
    const bOk = bands.has(entry.band);
    const mOk = biomes.has(entry.biome);
    if (bOk && mOk) return result('AS-GLOBAL-019', 'pass', entry.band + '/' + entry.biome);
    if (legacyB.has(entry.band) || legacyM.has(entry.biome)) {
        return result('AS-GLOBAL-019', 'unknown', 'legacy catalogue vocabulary ' + entry.band + '/' + entry.biome);
    }
    return result('AS-GLOBAL-019', 'violate', 'band/biome ' + entry.band + '/' + entry.biome + ' is not a DEC-030 token');
}

function checkEntry(entry, standard) {
    const out = [];
    const id = entry && entry.id;
    if (!id || !ID_RE.test(id)) out.push(result('AS-GLOBAL-010', 'violate', 'id is not BAND_BIOME_CATEGORY_TYPE_VARIANT_STATE'));
    else out.push(result('AS-GLOBAL-010', 'pass', id));
    out.push(bandVocab(entry, standard));

    if (DIR_CATS[entry.category]) {
        const facings = entry.frames && entry.frames.facings;
        if (!Array.isArray(facings) || facings.length === 0) {
            out.push(result('AS-GLOBAL-022', 'unknown', 'no facings declared'));
            out.push(result('AS-GLOBAL-023', 'unknown', 'no facings declared'));
        } else if (facings.some(f => standard.diagonalFacings.indexOf(f) !== -1)) {
            out.push(result('AS-GLOBAL-022', 'violate', 'diagonals are not a four-direction sheet'));
            out.push(result('AS-GLOBAL-023', 'violate', 'legacy 8-way facings ' + facings.join(',')));
        } else if (facings.length === 4 && standard.directions.every(d => facings.indexOf(d) !== -1)) {
            out.push(result('AS-GLOBAL-022', 'pass', facings.join(',')));
            out.push(result('AS-GLOBAL-023', 'pass', 'no diagonal facings'));
        } else {
            out.push(result('AS-GLOBAL-022', 'violate', 'facings ' + facings.join(',')));
            out.push(result('AS-GLOBAL-023', 'pass', 'no diagonal facings'));
        }
    }

    if (FRAME_CATS[entry.category]) {
        const expected = Object.prototype.hasOwnProperty.call(standard.frameClassPx, entry.frameClass)
            ? standard.frameClassPx[entry.frameClass] : undefined;
        const actual = frameOf(entry);
        if (expected === undefined) {
            /* not a sized character frame */
        } else if (expected === null) {
            if (!actual) out.push(result('AS-CRIT-004', 'unknown', 'Huge/Gargantuan frame size is open and no frame is declared'));
            else if (actual[0] % standard.gridPx !== 0 || actual[1] % standard.gridPx !== 0) {
                out.push(result('AS-GLOBAL-001', 'violate', 'frame ' + actual.join('x') + ' is not a multiple of 48'));
            } else out.push(result('AS-CRIT-004', 'unknown', 'exact Huge/Gargantuan frame is open'));
        } else if (!actual) {
            out.push(result('AS-CRIT-004', 'unknown', 'frame size cannot be derived'));
        } else if (actual[0] !== expected[0] || actual[1] !== expected[1]) {
            out.push(result('AS-CRIT-004', 'violate', 'frame ' + actual.join('x') + ' is not ' + expected.join('x')));
        } else out.push(result('AS-CRIT-004', 'pass', actual.join('x')));
    }

    if (entry.category === 'FACE') {
        const actual = frameOf(entry);
        const cols = entry.frames && entry.frames.cols;
        const rows = entry.frames && entry.frames.rows;
        if (!actual) out.push(result('AS-GLOBAL-014', 'unknown', 'face cell cannot be derived'));
        else if (actual[0] === 144 && actual[1] === 144 && cols === 4 && rows === 2) {
            out.push(result('AS-GLOBAL-014', 'pass', '144 in a 4x2 sheet'));
        } else out.push(result('AS-GLOBAL-014', 'violate', 'face cell/grid ' + (actual && actual.join('x')) + ' ' + cols + 'x' + rows));
    }

    if (entry.paperDoll) {
        const z = standard.paperDollZ[entry.paperDoll.layer];
        if (z === undefined) out.push(result('AS-HUM-004', 'violate', 'unknown paperDoll layer ' + entry.paperDoll.layer));
        else if (entry.paperDoll.zOrder !== z) out.push(result('AS-HUM-004', 'violate', entry.paperDoll.layer + ' zOrder ' + entry.paperDoll.zOrder + ' is not ' + z));
        else out.push(result('AS-HUM-004', 'pass', entry.paperDoll.layer + ' z' + z));
    } else if (entry.category === 'EQUIPMENT') {
        const status = entry.status === 'MISSING' ? 'unknown' : 'violate';
        out.push(result('AS-HUM-004', status, 'equipment entry has no paperDoll'));
    }

    if (entry.category === 'CREATURE') {
        if (!Array.isArray(entry.declaredRows)) out.push(result('AS-CRIT-001', 'unknown', 'animation rows are not on the catalogue entry'));
        else {
            const missing = standard.critterRows.filter(r => entry.declaredRows.indexOf(r) === -1);
            if (missing.length) out.push(result('AS-CRIT-001', 'violate', 'missing ' + missing.join(',')));
            else out.push(result('AS-CRIT-001', 'pass', standard.critterRows.join(',')));
        }
    }
    if (isBeast(entry)) {
        if (!Array.isArray(entry.declaredAttacks)) out.push(result('AS-BEAST-001', 'unknown', 'natural attacks are not declared'));
        else if (!Array.isArray(entry.declaredRows)) out.push(result('AS-BEAST-001', 'unknown', 'rows are not declared'));
        else {
            const missing = entry.declaredAttacks.filter(a => entry.declaredRows.indexOf('attack-' + a) === -1);
            if (missing.length) out.push(result('AS-BEAST-001', 'violate', 'missing attack-' + missing.join(', attack-')));
            else out.push(result('AS-BEAST-001', 'pass', entry.declaredAttacks.join(',')));
        }
    }
    if (entry.category === 'CHARACTER') {
        if (!Array.isArray(entry.declaredRows)) out.push(result('AS-HUM-009', 'unknown', 'action rows are not on the catalogue entry'));
        else {
            const missing = standard.humanoidRows.filter(r => entry.declaredRows.indexOf(r) === -1);
            if (missing.length) out.push(result('AS-HUM-009', 'violate', 'missing ' + missing.join(',')));
            else out.push(result('AS-HUM-009', 'pass', 'humanoid rows'));
        }
    }

    if (entry.runtime && entry.runtime.file) {
        const base = path.basename(String(entry.runtime.file));
        if (entry.category === 'EQUIPMENT') {
            if (LAYER_FILE_RE.test(base)) out.push(result('AS-STYLE-001', 'pass', base));
            else out.push(result('AS-STYLE-001', 'violate', base + ' is not $UF_Layer_<itemId>__<race>.png'));
        } else if (entry.category === 'CHARACTER' || entry.category === 'CREATURE') {
            if (CHAR_FILE_RE.test(base) || OBJECT_FILE_RE.test(base)) out.push(result('AS-STYLE-001', 'pass', base));
            else out.push(result('AS-STYLE-001', 'violate', base + ' is not a $ or ! sheet name'));
        } else if (entry.category === 'FACE') {
            if (FACE_FILE_RE.test(base)) out.push(result('AS-STYLE-001', 'pass', base));
            else out.push(result('AS-STYLE-001', 'violate', base + ' is not UF_Faces_<race>_<n>.png'));
        }
    }

    if (Object.prototype.hasOwnProperty.call(entry, 'animation') || Object.prototype.hasOwnProperty.call(entry, 'exception')) {
        out.push(animationResult(entry, standard));
    }
    return { id: id || '', category: entry.category || '', results: out };
}

function animationResult(asset, standard) {
    const frames = asset.animation && asset.animation.frames;
    if (frames > 0) return result('AS-ANIM-001', 'pass', frames + ' frames');
    if (asset.exception && standard.staticExceptions.indexOf(asset.exception) !== -1) {
        return result('AS-ANIM-001', 'pass', 'exception ' + asset.exception);
    }
    if (asset.exception) return result('AS-ANIM-001', 'violate', 'unknown exception ' + asset.exception);
    return result('AS-ANIM-001', 'violate', 'no animation and no listed exception');
}

function checkLayer(layer, standard) {
    const out = [];
    const pose = standard.poseGrid.find(p => p.id === layer.pose);
    const expect = pose ? pose.frames : null;
    if (!pose) out.push(result('AS-HUM-016', 'violate', 'unknown pose ' + layer.pose));
    else if (layer.frameCount !== expect || !Array.isArray(layer.frames) || layer.frames.length !== expect) {
        out.push(result('AS-HUM-016', 'violate', 'frame count ' + layer.frameCount + ' is not ' + expect));
    } else if (!layer.framePx || layer.framePx[0] !== layer.bodyFramePx[0] || layer.framePx[1] !== layer.bodyFramePx[1]) {
        out.push(result('AS-HUM-016', 'violate', 'layer frame size does not match the body'));
    } else if (!layer.deforming) {
        let bad = '';
        for (let i = 0; i < layer.frames.length; i++) {
            const a = layer.frames[i] && layer.frames[i].anchor;
            if (!a || !Number.isInteger(a.x) || !Number.isInteger(a.y)) bad = 'frame ' + i + ' has no anchor';
            else if (standard.angles.indexOf(a.angle) === -1) bad = 'frame ' + i + ' angle ' + a.angle;
            if (bad) break;
        }
        if (bad) out.push(result('AS-HUM-016', 'violate', bad));
        else out.push(result('AS-HUM-016', 'pass', pose.id + ' x' + expect));
    } else out.push(result('AS-HUM-016', 'pass', 'deforming piece uses per-pose frames'));

    if (layer.deforming) {
        const need = standard.poseGrid.map(p => p.id);
        const have = Array.isArray(layer.poses) ? layer.poses : [];
        const missing = need.filter(id => have.indexOf(id) === -1);
        if (missing.length) out.push(result('AS-HUM-017', 'violate', 'deforming piece missing ' + missing.join(',')));
        else out.push(result('AS-HUM-017', 'pass', layer.deformingKind || 'deforming'));
    } else out.push(result('AS-HUM-017', 'pass', 'not a deforming piece'));
    return out;
}

function checkFace(face, standard) {
    const out = [];
    const layers = face.layers || [];
    if (layers[0] !== 'background' || !face.rampId) {
        out.push(result('AS-FACE-001', 'violate', 'race background is not the bottom layer with a ramp id'));
    } else out.push(result('AS-FACE-001', 'pass', face.rampId));

    const required = ['background', 'body-base', 'face', 'hair', 'gear', 'overlay'];
    let idx = 0;
    let orderOk = true;
    for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        if (layer === 'faction-trim') {
            if (i === 0 || layers[i - 1] !== 'background') orderOk = false;
            continue;
        }
        if (layer !== required[idx]) orderOk = false;
        else idx++;
    }
    if (!orderOk || idx !== required.length) out.push(result('AS-FACE-002', 'violate', 'layer order ' + layers.join(',')));
    else out.push(result('AS-FACE-002', 'pass', layers.join(',')));

    const expr = face.expressions || [];
    if (expr.length !== standard.expressions.length || expr.some((e, i) => e !== standard.expressions[i])) {
        out.push(result('AS-FACE-003', 'violate', 'expressions ' + expr.join(',')));
    } else out.push(result('AS-FACE-003', 'pass', '8 expressions'));

    const cell = face.cell || [];
    const anchors = face.anchors || {};
    const names = Object.keys(standard.faceAnchors);
    let anchorOk = cell[0] === 144 && cell[1] === 144 && face.cols === 4 && face.rows === 2;
    if (anchorOk) {
        for (const name of names) {
            const p = anchors[name];
            if (!Array.isArray(p) || p.length !== 2 || !Number.isInteger(p[0]) || !Number.isInteger(p[1])) anchorOk = false;
            else if (p[0] < 0 || p[1] < 0 || p[0] > 143 || p[1] > 143) anchorOk = false;
        }
    }
    if (!anchorOk) out.push(result('AS-FACE-004', 'violate', '144 cell or anchors incomplete'));
    else out.push(result('AS-FACE-004', 'pass', 'anchors on 144'));
    if (cell[0] === 144 && cell[1] === 144 && face.cols === 4 && face.rows === 2) out.push(result('AS-GLOBAL-014', 'pass', '4x2 of 144'));
    else out.push(result('AS-GLOBAL-014', 'violate', 'face sheet geometry'));
    return out;
}

function checkItem(item, standard) {
    const out = [];
    if (raceSpecificItemId(item.id, standard.races)) out.push(result('AS-ITEM-001', 'violate', item.id + ' is a race-specific item id'));
    else out.push(result('AS-ITEM-001', 'pass', item.id));
    const key = String(item.artKey || '');
    const race = key.split('__')[1];
    if (ART_KEY_RE.test(key) && key.indexOf(item.id + '__') === 0 && standard.races.indexOf(race) !== -1 && !raceSpecificItemId(item.id, standard.races)) {
        out.push(result('AS-ITEM-002', 'pass', key));
    } else out.push(result('AS-ITEM-002', 'violate', 'art key ' + key));
    return out;
}

function checkIcon(icon, standard) {
    const out = [];
    const cell = standard.icon.cell;
    if (icon.w !== cell[0] || icon.h !== cell[1]) out.push(result('AS-ICON-001', 'violate', icon.w + 'x' + icon.h));
    else out.push(result('AS-ICON-001', 'pass', cell.join('x')));
    const baked = icon.rarity === 'redraw' || /_(rare|uncommon|epic|legendary)$/i.test(icon.id || '');
    if (baked) out.push(result('AS-ICON-003', 'violate', 'rarity is drawn into the icon'));
    else out.push(result('AS-ICON-003', 'pass', icon.rarity || 'overlay'));
    return out;
}

function checkNode(node, standard) {
    const statesOk = sameSet(node.states, standard.resourceStates);
    const biomesOk = Array.isArray(node.variants) && standard.biomes.every(b => node.variants.indexOf(b) !== -1);
    const harvestOk = node.harvestFrames > 0 && !!node.drop;
    if (statesOk && biomesOk && harvestOk) return [result('AS-NODE-001', 'pass', node.kind)];
    return [result('AS-NODE-001', 'violate', 'node ' + (node.kind || '') + ' is missing a state, biome, harvest or drop')];
}

function checkRemains(remains, standard) {
    const need = standard.remains;
    const ok = remains && remains.bodies && remains.skeleton && remains.blood && remains.scorch && remains.rubble && remains.debris
        && sameSet(remains.tileVariants, need.tileVariants) && sameSet(remains.buildingVariants, need.buildingVariants);
    return [result('AS-REMAIN-001', ok ? 'pass' : 'violate', ok ? 'remains set' : 'remains set is incomplete')];
}

function checkHaul(haul, standard) {
    const ok = haul && haul.carry === 'drawn' && haul.cart === true && sameSet(haul.fills, standard.stockpileFills);
    return [result('AS-HAUL-001', ok ? 'pass' : 'violate', ok ? 'carry drawn' : 'carry is not drawn or fills are incomplete')];
}

function checkVehicles(veh, standard) {
    const ok = veh && standard.vehicles.every(k => (veh.kinds || []).indexOf(k) !== -1)
        && sameSet(veh.directions, standard.directions) && veh.ridingRaces === standard.races.length;
    return [result('AS-VEH-001', ok ? 'pass' : 'violate', ok ? 'vehicles and riding poses' : 'vehicle set or riding directions are incomplete')];
}

function checkNight(night) {
    if (!night || night.dynamicLight && night.dynamicLight.blur === true) {
        return [result('AS-LIGHT-001', 'violate', 'dynamic light blur is on')];
    }
    const mode = night.dynamicLight && night.dynamicLight.mode;
    const allowed = night.dynamicLight && night.dynamicLight.allowedModes;
    const ok = night.palette && night.drawnLights && night.torchGlow === 'drawn' && night.windowGlow === 'drawn'
        && night.litBuilding && mode === 'off' && allowed && allowed.indexOf('per-pixel') !== -1 && night.dynamicLight.blur === false;
    return [result('AS-LIGHT-001', ok ? 'pass' : 'violate', ok ? 'night hook off, blur false' : 'night set is incomplete or blur is allowed')];
}

function checkName(rec) {
    const base = path.basename(String(rec.runtimeFile || ''));
    if (rec.category === 'EQUIPMENT') {
        if (LAYER_FILE_RE.test(base)) return [result('AS-STYLE-001', 'pass', base)];
        return [result('AS-STYLE-001', 'violate', base + ' is not $UF_Layer_<itemId>__<race>.png')];
    }
    return [result('AS-STYLE-001', 'violate', 'unsupported name record')];
}

function checkUi(px, standard) {
    if (typeof px !== 'number' || px < standard.uiMinPx) return [result('AS-UI-003', 'violate', 'glyph ' + px + ' px is under ' + standard.uiMinPx)];
    return [result('AS-UI-003', 'pass', px + ' px')];
}

function checkMap(banners, standard) {
    if (!sameSet(banners, standard.banners)) return [result('AS-MAP-001', 'violate', 'banner set does not match the six profiles')];
    return [result('AS-MAP-001', 'pass', banners.length + ' banners')];
}

function checkProps(props, standard) {
    if (!sameSet(props, standard.readableProps)) return [result('AS-PROP-001', 'violate', 'readable prop set is incomplete')];
    return [result('AS-PROP-001', 'pass', props.join(','))];
}

function spellMatches(spell, derivation) {
    if (!spell || spell.kind !== derivation.kind) return false;
    if (derivation.exclude && derivation.exclude[spell.name]) return false;
    const name = spell.name || '';
    const desc = (spell.data && spell.data.description) || '';
    if ((derivation.namePrefixes || []).some(p => name.indexOf(p) === 0)) return true;
    if ((derivation.named || []).indexOf(name) !== -1) return true;
    return (derivation.descriptionPatterns || []).some(p => new RegExp(p, 'i').test(desc));
}

function checkSummons(spellEntries, table, derivation) {
    const out = [];
    const byId = new Map((table || []).map(row => [row.spellId, row]));
    const derived = (spellEntries || []).filter(s => spellMatches(s, derivation));
    const missing = derived.filter(s => !byId.has(s.id));
    if (missing.length) out.push(result('AS-SUMMON-001', 'violate', 'unmapped ' + missing.map(s => s.id).join(',')));
    else out.push(result('AS-SUMMON-001', 'pass', derived.length + ' spells mapped'));
    const bad = (table || []).filter(row => !row.summonIn || !row.dismiss || !row.controllerMarker);
    if (bad.length) out.push(result('AS-SUMMON-002', 'violate', 'missing summon parts on ' + bad.map(r => r.spellId).join(',')));
    else if ((table || []).length === 0) out.push(result('AS-SUMMON-002', 'violate', 'summon table is empty'));
    else out.push(result('AS-SUMMON-002', 'pass', 'summon-in, dismiss, controller marker'));
    return out;
}

function checkMatrix(matrix, standard) {
    const expect = standard.races.length * (standard.classes.length + standard.armorWeights.length);
    if (!Array.isArray(matrix) || matrix.length !== expect) {
        return [result('AS-HUM-015', 'violate', 'outfit matrix length ' + (matrix ? matrix.length : 0) + ' is not ' + expect)];
    }
    const keys = new Set();
    for (const row of matrix) {
        if (!ART_KEY_RE.test(row.artKey) || keys.has(row.artKey)) {
            return [result('AS-HUM-015', 'violate', 'bad or duplicate art key ' + row.artKey)];
        }
        keys.add(row.artKey);
        if (standard.races.indexOf(row.race) === -1) return [result('AS-HUM-015', 'violate', 'bad race ' + row.race)];
        if (!row.slots || !row.slots.length || !row.layers || !row.layers.length) {
            return [result('AS-HUM-015', 'violate', row.artKey + ' has no slots or layers')];
        }
        if (row.fallbackArtKey !== row.outfitId + '__human') {
            return [result('AS-HUM-015', 'violate', 'fallback is not __human')];
        }
    }
    return [result('AS-HUM-015', 'pass', expect + ' outfit variants')];
}

function checkLife(templates) {
    const child = templates && templates.child;
    const elder = templates && templates.elder;
    const adult = templates && templates.adult;
    const work = ['hammer', 'saw', 'chop', 'dig', 'stir', 'carry'];
    const hasWork = t => t && t.workRows === true && Array.isArray(t.requiredRows) && work.every(r => t.requiredRows.indexOf(r) !== -1);
    if (!adult || !hasWork(child) || !hasWork(elder) || elder.stooped !== true) {
        return [result('AS-HUM-019', 'violate', 'child or working stooped elder template is missing')];
    }
    return [result('AS-HUM-019', 'pass', 'child, adult, working elder')];
}

function typeOf(v) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    if (Number.isInteger(v)) return 'integer';
    return typeof v;
}

function typeOk(t, v) {
    const vt = typeOf(v);
    if (t === 'number') return vt === 'number' || vt === 'integer';
    if (t === 'integer') return vt === 'integer';
    return t === vt;
}

function schemaErrors(schema, data) {
    const errs = [];
    const resolve = ref => ref.replace(/^#\//, '').split('/').reduce((s, k) => (s ? s[k] : s), schema);
    const walk = (s, v, p) => {
        if (!s) return;
        if (s.$ref) return walk(resolve(s.$ref), v, p);
        if (s.type) {
            const ts = Array.isArray(s.type) ? s.type : [s.type];
            if (!ts.some(t => typeOk(t, v))) { errs.push(p + ': ' + typeOf(v) + ' is not ' + ts.join('|')); return; }
        }
        if (Object.prototype.hasOwnProperty.call(s, 'const') && JSON.stringify(v) !== JSON.stringify(s.const)) {
            errs.push(p + ': not ' + JSON.stringify(s.const));
        }
        if (s.enum && !s.enum.some(x => JSON.stringify(x) === JSON.stringify(v))) errs.push(p + ': ' + JSON.stringify(v) + ' is not in the enum');
        if (v === null) return;
        if (typeof v === 'string') {
            if (s.pattern && !new RegExp(s.pattern).test(v)) errs.push(p + ': does not match ' + s.pattern);
            if (s.minLength !== undefined && v.length < s.minLength) errs.push(p + ': shorter than ' + s.minLength);
        }
        if (typeof v === 'number' && s.minimum !== undefined && v < s.minimum) errs.push(p + ': ' + v + ' < ' + s.minimum);
        if (Array.isArray(v)) {
            if (s.minItems !== undefined && v.length < s.minItems) errs.push(p + ': fewer than ' + s.minItems);
            if (s.items) v.forEach((x, i) => walk(s.items, x, p + '[' + i + ']'));
        }
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            for (const r of s.required || []) if (!Object.prototype.hasOwnProperty.call(v, r)) errs.push(p + ': missing ' + r);
            if (s.properties) {
                for (const [k, sub] of Object.entries(s.properties)) {
                    if (Object.prototype.hasOwnProperty.call(v, k)) walk(sub, v[k], p + '.' + k);
                }
            }
            if (s.additionalProperties === false) {
                for (const k of Object.keys(v)) {
                    if (!s.properties || !Object.prototype.hasOwnProperty.call(s.properties, k)) errs.push(p + ': unexpected ' + k);
                }
            }
        }
    };
    walk(schema, data, '$');
    return errs;
}

function checkSpellTable(table, schema, standard) {
    const out = [];
    const errs = schemaErrors(schema, table);
    const damageErr = errs.filter(e => e.indexOf('damageTypes') !== -1 || e.indexOf('.impact') !== -1);
    const other = errs.filter(e => damageErr.indexOf(e) === -1);
    if (damageErr.length) out.push(result('AS-FX-003', 'violate', damageErr[0]));
    else {
        let bad = '';
        for (const row of table.rows || []) {
            for (const d of row.damageTypes || []) {
                if (standard.damageTypes.indexOf(d) === -1) bad = d;
            }
            if (row.impact && standard.damageTypes.indexOf(row.impact) === -1) bad = row.impact;
        }
        if (bad) out.push(result('AS-FX-003', 'violate', 'unknown damage type ' + bad));
        else out.push(result('AS-FX-003', 'pass', 'damage types'));
    }
    if (other.length) out.push(result('AS-FX-005', 'violate', other[0]));
    else if (!damageErr.length) out.push(result('AS-FX-005', 'pass', 'schema'));
    else out.push(result('AS-FX-005', 'pass', 'schema aside from damage'));
    return out;
}

function entryStatus(results) {
    if (results.some(r => r.result === 'violate')) return 'violate';
    if (results.some(r => r.result === 'unknown')) return 'unknown';
    return 'pass';
}

function summarize(perEntry, globals) {
    const byCategory = {};
    const totals = { entries: perEntry.length, pass: 0, violate: 0, unknown: 0 };
    const rules = { pass: 0, violate: 0, unknown: 0 };
    for (const e of perEntry) {
        const st = entryStatus(e.results);
        totals[st]++;
        if (!byCategory[e.category]) byCategory[e.category] = { entries: 0, pass: 0, violate: 0, unknown: 0 };
        byCategory[e.category].entries++;
        byCategory[e.category][st]++;
        for (const r of e.results) rules[r.result]++;
    }
    const globalViolations = (globals || []).filter(r => r.result === 'violate');
    return { totals, byCategory, rules, globals: globals || [], globalViolations: globalViolations.length };
}

function collectGlobals(standard, spells, schema) {
    const out = [];
    out.push.apply(out, checkMatrix(standard.outfitMatrix, standard));
    out.push.apply(out, checkLife(standard.bodyTemplates));
    const entries = spells && spells.entries ? spells.entries : spells;
    out.push.apply(out, checkSummons(entries, standard.summons, standard.summonDerivation));
    const examples = schema && schema.examples ? schema.examples : [];
    for (const ex of examples) out.push.apply(out, checkSpellTable(ex, schema, standard));
    out.push.apply(out, checkMap(standard.banners, standard));
    out.push.apply(out, checkProps(standard.readableProps, standard));
    out.push.apply(out, checkNight(standard.night));
    out.push.apply(out, checkRemains(standard.remains, standard));
    return out;
}

function run(opts) {
    const standard = readJson(opts.standard);
    const catalogue = readJson(opts.catalogue);
    const schema = readJson(opts.spellSchema);
    const spells = readJson(opts.spells);
    let entries = catalogue.entries || [];
    if (opts.category) entries = entries.filter(e => e.category === opts.category);
    const perEntry = entries.map(e => checkEntry(e, standard));
    const globals = collectGlobals(standard, spells, schema);
    const summary = summarize(perEntry, globals);
    const violations = summary.totals.violate + summary.globalViolations;
    return { summary, perEntry, violations };
}

function parseArgs(argv) {
    const opts = {
        json: false,
        strict: false,
        category: '',
        standard: path.join(ROOT, 'game', 'data', 'UF_AssetStandard.json'),
        catalogue: path.join(ROOT, 'art', 'catalogue', 'catalogue.json'),
        spellSchema: path.join(ROOT, 'game', 'data', 'UF_SpellVisualTable.schema.json'),
        spells: path.join(ROOT, 'game', 'data', 'srd51', 'spells.json')
    };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--json') opts.json = true;
        else if (a === '--strict') opts.strict = true;
        else if (a === '--category') opts.category = argv[++i];
        else if (a === '--standard') opts.standard = argv[++i];
        else if (a === '--catalogue') opts.catalogue = argv[++i];
        else if (a === '--spell-schema') opts.spellSchema = argv[++i];
        else if (a === '--spells') opts.spells = argv[++i];
        else throw new Error('unknown argument ' + a);
    }
    return opts;
}

function printReport(payload, asJson) {
    if (asJson) {
        const compact = payload.perEntry.map(e => ({
            id: e.id,
            category: e.category,
            status: entryStatus(e.results),
            violations: e.results.filter(r => r.result === 'violate').map(r => ({ ruleId: r.ruleId, reason: r.reason })),
            unknown: e.results.filter(r => r.result === 'unknown').map(r => r.ruleId)
        }));
        process.stdout.write(JSON.stringify({ summary: payload.summary, entries: compact }) + '\n');
        return;
    }
    const t = payload.summary.totals;
    console.log('entries ' + t.entries + ' pass ' + t.pass + ' violate ' + t.violate + ' unknown ' + t.unknown);
    const cats = Object.keys(payload.summary.byCategory).sort();
    for (const c of cats) {
        const row = payload.summary.byCategory[c];
        console.log('category ' + c + ' entries ' + row.entries + ' pass ' + row.pass + ' violate ' + row.violate + ' unknown ' + row.unknown);
    }
    console.log('rule-results pass ' + payload.summary.rules.pass + ' violate ' + payload.summary.rules.violate + ' unknown ' + payload.summary.rules.unknown);
    console.log('global-violations ' + payload.summary.globalViolations);
    for (const g of payload.summary.globals) console.log('global ' + g.result + ' ' + g.ruleId + ' ' + g.reason);
}

function main(argv, hooks) {
    let opts;
    try { opts = parseArgs(argv); }
    catch (e) {
        console.error(e.message);
        if (hooks && hooks.noExit) return 2;
        process.exit(2);
    }
    let payload;
    try { payload = run(opts); }
    catch (e) {
        console.error(e && e.stack ? e.stack : e);
        if (hooks && hooks.noExit) return 2;
        process.exit(2);
    }
    printReport(payload, opts.json);
    const code = opts.strict && (payload.violations > 0) ? 1 : 0;
    if (hooks && hooks.noExit) return code;
    process.exit(code);
}

module.exports = {
    checkEntry, checkLayer, checkFace, checkItem, checkIcon, checkNode, checkRemains,
    checkHaul, checkVehicles, checkNight, checkName, checkUi, checkMap, checkProps,
    checkSummons, checkMatrix, checkLife, checkSpellTable, schemaErrors, spellMatches,
    animationResult, collectGlobals, run, main, readJson, clone, entryStatus
};

if (require.main === module) main(process.argv.slice(2));
