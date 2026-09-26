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
 *        [--biome-registry path]   (repeatable; default is the two DEUS biome registries, read only)
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
const PORTRAIT_CATS = { ITEM: 1, EQUIPMENT: 1, CREATURE: 1, TREE: 1, VEIN: 1, FLORA: 1, STONE: 1, STRUCTURE: 1, FURNITURE: 1, WORKSHOP: 1 };
const PORTRAIT_FILE_RE = /^UF_Portrait_[a-z0-9_]+(?:__[a-z]+(?:-[a-z]+)*)?\.png$/;

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
    if (PORTRAIT_CATS[entry.category]) {
        if (entry.icon || entry.portrait) out.push.apply(out, checkPortrait(entry, standard));
        else out.push(result('AS-PORT-001', 'unknown', 'icon and portrait are not on the catalogue entry'));
    }
    if (entry.category === 'CREATURE' || entry.category === 'CHARACTER') out.push(sizeResult(entry, standard));
    return { id: id || '', category: entry.category || '', results: out };
}

function sizeResult(entry, standard) {
    const size = entry.sizeClass;
    if (!size) return result('AS-SIZE-001', 'unknown', 'size class is not on the entry');
    let shape = entry.bodyShape;
    if (!shape) {
        if (size === 'Tiny' || size === 'Small' || size === 'Medium') shape = 'square';
        else return result('AS-SIZE-001', 'unknown', 'body shape is not declared');
    }
    const row = (standard.sizeFrames || []).find(r => r.size === size && r.shape === shape);
    if (!row) return result('AS-SIZE-001', 'violate', size + ' ' + shape + ' has no frame');
    const actual = frameOf(entry);
    if (!actual) return result('AS-SIZE-001', 'unknown', 'frame size cannot be derived');
    if (actual[0] !== row.px[0] || actual[1] !== row.px[1]) {
        return result('AS-SIZE-001', 'violate', 'frame ' + actual.join('x') + ' is not ' + row.px.join('x') + ' for ' + size + ' ' + shape);
    }
    return result('AS-SIZE-001', 'pass', row.squares[0] + 'x' + row.squares[1]);
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
        if (row.pixels !== 'custom-per-race') {
            return [result('AS-HUM-015', 'violate', row.artKey + ' pixels are not custom per race')];
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

function checkSkins(ui, standard) {
    if (!ui || ui.playerSelectable !== true || ui.opacity !== 'opaque' || !ui.sheet) {
        return [result('AS-UI-004', 'violate', 'skins are not player-selectable opaque sheets')];
    }
    const skins = ui.skins || [];
    if (skins.length < (ui.minCount || 11)) return [result('AS-UI-004', 'violate', 'skin count ' + skins.length)];
    const ids = skins.map(sk => sk.id);
    if (ids.indexOf('deus') === -1 || ids.indexOf('deus-dark') === -1) {
        return [result('AS-UI-004', 'violate', 'Deus or Deus Dark is missing')];
    }
    for (const race of standard.races) {
        if (ids.indexOf('race-' + race) === -1) return [result('AS-UI-004', 'violate', 'missing race skin ' + race)];
    }
    const layout = ui.layout || {};
    const regions = ['background', 'pattern', 'frame', 'cursor', 'pause', 'textColours'];
    for (const name of regions) {
        if (!Array.isArray(layout[name]) || layout[name].length !== 4) return [result('AS-UI-004', 'violate', 'layout ' + name)];
    }
    if (ui.sheet[0] !== 192 || ui.sheet[1] !== 192) return [result('AS-UI-004', 'violate', 'window sheet is not 192 by 192')];
    const fonts = ui.fonts || [];
    const buttons = ui.buttons || [];
    const screens = ui.screens || [];
    if (fonts.length < 2 || buttons.length < 3 || screens.indexOf('title') === -1 || screens.indexOf('loading') === -1) {
        return [result('AS-UI-004', 'violate', 'fonts, buttons or screens')];
    }
    return [result('AS-UI-004', 'pass', skins.length + ' skins')];
}

function checkReligion(rel) {
    const need = ['holy-symbol', 'altar', 'shrine', 'aura', 'spellbook', 'scroll'];
    if (!rel || !sameSet(rel.pieces, need) || rel.aura !== 'drawn-frames' || rel.mundaneDistinct !== true) {
        return [result('AS-REL-001', 'violate', 'religion pieces or aura')];
    }
    for (const deity of rel.deities || []) {
        if (!deity.holySymbolId) return [result('AS-REL-001', 'violate', 'deity ' + (deity.id || '') + ' has no holy symbol')];
    }
    return [result('AS-REL-001', 'pass', 'religion pieces')];
}

function checkFarm(farm) {
    if (!farm || !sameSet(farm.stages, ['sown', 'growing', 'mature', 'harvested']) || !sameSet(farm.livestock, ['young', 'adult']) || farm.pens !== true || farm.tamedVariants !== true) {
        return [result('AS-FARM-001', 'violate', 'farming set')];
    }
    return [result('AS-FARM-001', 'pass', 'farming')];
}

function checkFood(food) {
    if (!food || !sameSet(food.states, ['raw', 'cooked']) || !sameSet(food.classes, ['meal', 'ingredient']) || !sameSet(food.displays, ['table', 'stockpile']) || food.icon !== true) {
        return [result('AS-FOOD-001', 'violate', 'food set')];
    }
    return [result('AS-FOOD-001', 'pass', 'food')];
}

function checkClosed(ruleId, have, need, label) {
    if (!sameSet(have, need)) return [result(ruleId, 'violate', label)];
    return [result(ruleId, 'pass', label)];
}

function checkScenes(scenes) {
    if (!scenes || scenes.required !== false || !sameSet(scenes.ids, ['founding', 'coronation', 'disaster', 'war'])) {
        return [result('AS-SCENE-001', 'violate', 'event scenes are a required set or the ids changed')];
    }
    return [result('AS-SCENE-001', 'pass', 'optional event scenes')];
}

function checkMarketing(marketing) {
    if (!marketing || marketing.required !== false || (marketing.pieces && marketing.pieces.length)) {
        return [result('AS-MKTG-001', 'violate', 'marketing is a required set')];
    }
    return [result('AS-MKTG-001', 'pass', 'marketing is later')];
}

function checkTame(rec) {
    const out = [];
    const artOk = rec && sameSet(rec.art, ['tamed-variant', 'captured-bound-pose', 'cage', 'pen'])
        && sameSet(rec.outcomes, ['pet', 'mount', 'livestock', 'work-animal', 'prisoner', 'recruit'])
        && sameSet(rec.visualMarkers, ['collar', 'saddle', 'harness']);
    out.push(result('AS-TAME-001', artOk ? 'pass' : 'violate', artOk ? 'tamed, bound, cage, pen' : 'domestication art set'));
    const slots = rec && rec.creatureEquipmentSlots;
    const gearOk = rec && (!slots || slots.length === 0) && rec.barding === false && rec.craftedCreatureGear === false
        && rec.visualMarkersHaveSlot === false && rec.visualMarkersHaveStats === false;
    out.push(result('AS-TAME-002', gearOk ? 'pass' : 'violate', gearOk ? 'no creature equipment' : 'creature equipment slot, barding or gear stats'));
    return out;
}

function checkVariety(variety, standard) {
    const out = [];
    if (!variety || !variety.surface || !variety.floors || !variety.underground) {
        return [result('AS-VAR-001', 'violate', 'variety block'), result('AS-VAR-002', 'violate', 'variety block')];
    }
    const floors = variety.floors;
    let countBad = '';
    let seasonBad = '';
    for (const biome of standard.biomes) {
        const row = variety.surface[biome];
        if (!row || row.trees < floors.trees || row.bushes < floors.bushes || row.harvestableBushes < floors.harvestableBushes
            || row.scatter < floors.scatter || row.rocks < floors.rocks || row.ore < floors.ore
            || row.waterEdge < floors.waterEdge || row.landmarks < floors.landmarks || row.harvestStates !== true) {
            countBad = biome;
            break;
        }
        if (row.seasons !== 'palette-swap') seasonBad = biome + ' seasons';
        else if (row.flip && row.directionalLighting) seasonBad = biome + ' flips a lit piece';
    }
    const bands = variety.undergroundBands || [];
    if (!countBad) {
        for (const band of bands) {
            const row = variety.underground[band];
            if (!row || row.caveFormations < floors.caveFormations || row.fungiOrCrystals < floors.fungiOrCrystals || row.ore < floors.undergroundOre) {
                countBad = band;
                break;
            }
        }
    }
    out.push(result('AS-VAR-001', countBad ? 'violate' : 'pass', countBad ? countBad + ' is under the floor' : 'variety floors'));
    out.push(result('AS-VAR-002', seasonBad ? 'violate' : 'pass', seasonBad || 'palette-swap seasons'));
    return out;
}

function checkGenes(genes, standard) {
    if (!genes || !genes.inheritance || genes.inheritance.owner !== 'sim' || genes.inheritance.ageLayersPreserveIdentity !== true) {
        return [result('AS-GENE-001', 'violate', 'inheritance is not the sim, or age layers do not keep identity')];
    }
    if (!genes.hairNaturalSteps || genes.hairNaturalSteps.length !== 12 || !genes.greying || genes.greying.length !== 4 || !genes.balding || genes.balding.length !== 3) {
        return [result('AS-GENE-001', 'violate', 'hair ramp, greying or balding count')];
    }
    if (genes.faceShape.length !== 4 || genes.eyes.length !== 5 || genes.brows.length !== 4 || genes.nose.length !== 5
        || genes.mouth.length !== 4 || genes.jaw.length !== 3 || genes.markings.length !== 4) {
        return [result('AS-GENE-001', 'violate', 'face-gene counts')];
    }
    for (const race of standard.races) {
        const block = genes.perRace && genes.perRace[race];
        if (!block || !block.ears || block.ears.length !== 3) return [result('AS-GENE-001', 'violate', race + ' ears')];
        const features = block.raceFeatures ? block.raceFeatures.length : 0;
        if (features < 3 || features > 4) return [result('AS-GENE-001', 'violate', race + ' race features')];
        const skip = (genes.beardlessRaces || []).indexOf(race) !== -1;
        const bodies = block.bodyTypes || {};
        for (const bodyType of ['male', 'female']) {
            const body = bodies[bodyType];
            if (!body || !body.styles || body.styles.length !== 12) return [result('AS-GENE-001', 'violate', race + ' ' + bodyType + ' hair styles')];
            const distinctive = body.styles.filter(style => style.raceDistinctive).length;
            if (distinctive < 3 || distinctive > 4) return [result('AS-GENE-001', 'violate', race + ' ' + bodyType + ' distinctive hair')];
            const facial = body.facialHair || [];
            if (skip) {
                if (facial.length !== 0) return [result('AS-GENE-001', 'violate', race + ' should skip facial hair')];
            } else if (race === 'dwarf') {
                const base = genes.facialHair.every(name => facial.indexOf(name) !== -1);
                const extra = (genes.dwarfExtra || []).every(name => facial.indexOf(name) !== -1);
                if (!base || !extra || !(genes.dwarfExtra || []).length) return [result('AS-GENE-001', 'violate', 'dwarf facial hair')];
            } else if (!sameSet(facial, genes.facialHair)) {
                return [result('AS-GENE-001', 'violate', race + ' facial hair')];
            }
        }
    }
    return [result('AS-GENE-001', 'pass', 'gene counts')];
}

function checkPortrait(entity, standard) {
    const out = [];
    const icon = entity && entity.icon;
    const portrait = entity && entity.portrait;
    let ok = !!(icon && icon.w === 32 && icon.h === 32 && icon.rarity !== 'redraw'
        && portrait && portrait.w === 144 && portrait.h === 144 && portrait.background && portrait.rarity !== 'redraw');
    if (ok && entity.raceNeutral) {
        const byRace = entity.portraitsByRace || {};
        ok = standard.races.every(race => byRace[race] && byRace[race].w === 144 && byRace[race].h === 144 && byRace[race].rarity !== 'redraw');
    }
    out.push(result('AS-PORT-001', ok ? 'pass' : 'violate', ok ? 'icon and portrait' : 'icon and portrait are both required'));
    const file = portrait && portrait.file;
    if (file) {
        const base = path.basename(String(file));
        if (PORTRAIT_FILE_RE.test(base)) out.push(result('AS-STYLE-001', 'pass', base));
        else out.push(result('AS-STYLE-001', 'violate', base + ' is not a portrait file name'));
    }
    return out;
}

function checkHeadLayer(layer) {
    const frames = (layer && layer.frames) || [];
    const dirs = ['S', 'W', 'E', 'N'];
    const seen = {};
    let bad = frames.length === 12 ? '' : 'frame count ' + frames.length;
    for (const frame of frames) {
        const key = frame && (frame.dir + ':' + frame.headState);
        if (!frame || dirs.indexOf(frame.dir) === -1 || [0, 1, 2].indexOf(frame.headState) === -1) bad = bad || 'frame dir or head state';
        else if (seen[key]) bad = bad || 'duplicate ' + key;
        else if (!frame.anchor || !Number.isInteger(frame.anchor.x) || !Number.isInteger(frame.anchor.y)) bad = bad || 'anchor';
        else seen[key] = true;
    }
    if (!bad) {
        for (const dir of dirs) {
            for (const state of [0, 1, 2]) {
                if (!seen[dir + ':' + state]) bad = 'missing ' + dir + ':' + state;
            }
        }
    }
    const extras = (layer && layer.extras) || [];
    if (layer && !layer.longHair && extras.length) bad = bad || 'extras on a short-hair grid';
    for (const extra of extras) {
        if (!extra || (extra.pose !== 'death' && extra.pose !== 'dodge')) bad = bad || 'extra pose ' + (extra && extra.pose);
    }
    if (bad) return [result('AS-HEAD-001', 'violate', bad)];
    return [result('AS-HEAD-001', 'pass', '12 head frames')];
}

function expectedBodyFrames(standard) {
    let n = 0;
    for (const pose of standard.poseGrid) n += pose.frames * standard.directions.length;
    return n;
}

function checkBodyAnchors(frames, standard) {
    const expect = expectedBodyFrames(standard);
    if (!Array.isArray(frames) || frames.length !== expect) {
        return [result('AS-HEAD-001', 'violate', 'body frames ' + (frames ? frames.length : 0) + ' is not ' + expect)];
    }
    for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const anchor = frame && frame.headAnchor;
        if (!Array.isArray(anchor) || anchor.length !== 2 || !Number.isInteger(anchor[0]) || !Number.isInteger(anchor[1])) {
            return [result('AS-HEAD-001', 'violate', 'frame ' + i + ' has no head anchor')];
        }
        if ([0, 1, 2].indexOf(frame.headState) === -1) return [result('AS-HEAD-001', 'violate', 'frame ' + i + ' head state')];
    }
    return [result('AS-HEAD-001', 'pass', expect + ' head anchors')];
}

function checkElder(rec, standard) {
    if (!rec || rec.body !== 'redraw-stooped' || rec.garbSheet !== 'adult' || rec.gearSheet !== 'adult' || rec.hairSheet !== 'adult') {
        return [result('AS-ELDER-001', 'violate', 'elder garb, gear or hair is not the adult sheet')];
    }
    const frames = rec.frames || [];
    const expect = expectedBodyFrames(standard);
    if (rec.frameCount !== expect || frames.length !== expect) {
        return [result('AS-ELDER-001', 'violate', 'offset table ' + frames.length + ' is not ' + expect)];
    }
    const seen = new Set();
    for (const frame of frames) {
        if (!Array.isArray(frame.torso) || frame.torso.length !== 2 || !Array.isArray(frame.head) || frame.head.length !== 2) {
            return [result('AS-ELDER-001', 'violate', 'frame ' + frame.frame + ' offset')];
        }
        if (seen.has(frame.frame)) return [result('AS-ELDER-001', 'violate', 'duplicate offset ' + frame.frame)];
        seen.add(frame.frame);
    }
    for (let i = 0; i < expect; i++) {
        if (!seen.has(i)) return [result('AS-ELDER-001', 'violate', 'missing offset ' + i)];
    }
    return [result('AS-ELDER-001', 'pass', 'adult layers on elder offsets')];
}

function checkGear(rows) {
    if (!Array.isArray(rows) || !rows.length) return [result('AS-GEAR-001', 'violate', 'no gear rows')];
    const silhouettes = {};
    for (const row of rows) {
        if (row.kind === 'outfit') {
            if (row.custom !== true) return [result('AS-GEAR-001', 'violate', row.itemId + ' outfit is not custom per race')];
            continue;
        }
        if (['weapon', 'tool', 'accessory'].indexOf(row.kind) === -1) return [result('AS-GEAR-001', 'violate', 'kind ' + row.kind)];
        if (row.perRaceSilhouette) return [result('AS-GEAR-001', 'violate', row.itemId + ' has a per-race silhouette')];
        if (!row.rampId || !row.decalSlot || !Number.isInteger(row.decalSlot.x) || !Number.isInteger(row.decalSlot.y)) {
            return [result('AS-GEAR-001', 'violate', row.itemId + ' ramp or decal slot')];
        }
        if (!silhouettes[row.itemId]) silhouettes[row.itemId] = row.silhouetteId;
        else if (silhouettes[row.itemId] !== row.silhouetteId) return [result('AS-GEAR-001', 'violate', row.itemId + ' silhouette split')];
    }
    return [result('AS-GEAR-001', 'pass', 'one silhouette plus custom outfits')];
}

function checkMirror(layer) {
    const frames = (layer && layer.frames) || [];
    const mirrored = frames.some(frame => frame && frame.mirrored);
    if (layer && layer.mirrorBake === 'runtime') return [result('AS-MIRROR-001', 'violate', 'runtime flip')];
    if (mirrored && !layer.symmetric) return [result('AS-MIRROR-001', 'violate', 'mirrored frame on a layer that is not symmetric')];
    if (layer && layer.symmetric && layer.directionalLighting) return [result('AS-MIRROR-001', 'violate', 'symmetric layer has directional lighting')];
    if (layer && layer.symmetric && layer.mirrorBake !== 'offline-w-to-e') {
        return [result('AS-MIRROR-001', 'violate', 'symmetric mirror is not an offline W to E bake')];
    }
    return [result('AS-MIRROR-001', 'pass', layer && layer.symmetric ? 'offline symmetric bake' : 'not mirrored')];
}

function checkPoses(standard) {
    const need = ['prone', 'unconscious', 'sleep', 'sit', 'sneak', 'climb'];
    const rows = standard.humanoidRows || [];
    const grid = (standard.poseGrid || []).map(pose => pose.id);
    const missingRows = need.filter(id => rows.indexOf(id) === -1);
    const missingGrid = need.filter(id => grid.indexOf(id) === -1);
    const map = standard.poseConditions || {};
    let mapBad = '';
    if (!map.prone || map.prone.kind !== 'condition' || map.prone.id !== 'prone') mapBad = 'prone';
    if (!map.unconscious || map.unconscious.kind !== 'condition' || map.unconscious.id !== 'unconscious') mapBad = mapBad || 'unconscious';
    for (const id of ['sleep', 'sit', 'sneak', 'climb']) {
        if (!map[id] || map[id].kind !== 'activity') mapBad = mapBad || id;
    }
    if (missingRows.length || missingGrid.length || mapBad) {
        return [result('AS-POSE-001', 'violate', 'rows ' + missingRows.join(',') + ' grid ' + missingGrid.join(',') + ' map ' + mapBad)];
    }
    return [result('AS-POSE-001', 'pass', 'six pose rows')];
}

function checkBiomeRegistry(doc, standard, label) {
    const list = doc && doc.canonicalBiomes;
    const norm = String(label || 'registry').replace(/\\/g, '/');
    const name = norm.indexOf('/docs/') !== -1 ? 'docs/art/DEUS_BiomeRegistry.json'
        : norm.indexOf('/game/') !== -1 ? 'game/data/DEUS_BiomeRegistry.json'
        : path.basename(norm);
    if (!Array.isArray(list) || !sameSet(list, standard.biomes)) {
        return [result('AS-BIOME-005', 'violate', name + ' canonical ' + (Array.isArray(list) ? list.join(',') : 'missing'))];
    }
    return [result('AS-BIOME-005', 'pass', name)];
}

function checkCatalogueBiomes(catalogue, standard) {
    if (!catalogue || !catalogue.biomes || !catalogue.biomes.canonical) {
        return [result('AS-BIOME-005', 'pass', 'catalogue has no canonical biome list')];
    }
    const list = catalogue.biomes.canonical;
    if (!sameSet(list, standard.biomes)) return [result('AS-BIOME-005', 'violate', 'catalogue canonical ' + list.join(','))];
    return [result('AS-BIOME-005', 'pass', 'catalogue canonical set')];
}

function stripPx(footprint, standard) {
    const template = standard.slotTemplates['action-row'];
    const footprintW = footprint && footprint[0] ? footprint[0] : 1;
    const footprintH = footprint && footprint[1] ? footprint[1] : 1;
    return [template.frames * footprintW * template.cell, template.directions * footprintH * template.cell];
}

function checkSheet(sheet, standard) {
    if (!sheet || !standard.slotTemplates[sheet.template]) return [result('AS-SLOT-001', 'violate', 'unknown template')];
    if (sheet.template === 'action-row') {
        const expect = stripPx(sheet.footprint, standard);
        if (sheet.scaled || sheet.w !== expect[0] || sheet.h !== expect[1]) {
            return [result('AS-SLOT-001', 'violate', 'action row ' + sheet.w + 'x' + sheet.h)];
        }
        return [result('AS-SLOT-001', 'pass', expect.join('x'))];
    }
    const template = standard.slotTemplates[sheet.template];
    if (sheet.w !== template.w || sheet.h !== template.h) {
        return [result('AS-SLOT-001', 'violate', sheet.template + ' ' + sheet.w + 'x' + sheet.h)];
    }
    return [result('AS-SLOT-001', 'pass', sheet.template)];
}

function checkAtlas(atlas) {
    if (!atlas || atlas.size !== 2048 || !atlas.squares || atlas.squares[0] !== 42 || atlas.squares[1] !== 42 || atlas.cell !== 48) {
        return [result('AS-SLOT-001', 'violate', 'atlas grid')];
    }
    if (atlas.squares[0] * atlas.cell !== 2016) return [result('AS-SLOT-001', 'violate', 'atlas content px')];
    if (!atlas.paddingPx || atlas.paddingPx[0] !== 1 || atlas.paddingPx[1] !== 2 || atlas.gridSnapped !== true) {
        return [result('AS-SLOT-001', 'violate', 'padding')];
    }
    if (atlas.terrainSizeIfBenchmarked !== 4096 || !atlas.lookupFile) return [result('AS-SLOT-001', 'violate', 'terrain atlas or lookup')];
    return [result('AS-SLOT-001', 'pass', '2048 atlas, 42 by 42')];
}

function checkPipeline(rec) {
    if (!rec || rec.scaled || rec.resized || (rec.accepted && (rec.offSize || rec.offPalette || rec.offAnchor))) {
        return [result('AS-PIPE-001', 'violate', 'scaled or accepted off-size output')];
    }
    if (rec.crop !== 'transparent-margins-only' || rec.missingFrom !== 'empty-slots') {
        return [result('AS-PIPE-001', 'violate', 'crop or MISSING rule')];
    }
    return [result('AS-PIPE-001', 'pass', 'exact size, no scaling')];
}

function checkPromptTemplates(block) {
    const cats = ['humanoid-layer', 'face-layer', 'creature', 'terrain-tile', 'building-piece', 'item-icon', 'portrait', 'effect', 'ui'];
    const fields = ['pixelSize', 'frameGrid', 'facing', 'poseFrameIndex', 'anchor', 'paletteRampHex', 'outlineRules', 'shadingRules', 'lightDirection', 'layerRole', 'catalogueId', 'referenceImages', 'negativeConstraints'];
    if (!block || block.policy !== 'field-list-only' || block.prosePrompt) {
        return [result('AS-PROMPT-001', 'violate', 'template is a runnable prompt')];
    }
    const have = block.categories || {};
    for (const cat of cats) {
        const row = have[cat];
        if (!row || !row.fields) return [result('AS-PROMPT-001', 'violate', 'missing ' + cat)];
        if (row.promptText) return [result('AS-PROMPT-001', 'violate', cat + ' has prompt text')];
        for (const field of fields) {
            if (!row.fields[field]) return [result('AS-PROMPT-001', 'violate', cat + ' missing ' + field)];
        }
    }
    return [result('AS-PROMPT-001', 'pass', 'field templates')];
}

function checkGenerationLog(row, schema) {
    const need = (schema && schema.requiredFields) || [];
    for (const key of need) {
        if (!row || row[key] === undefined || row[key] === null || row[key] === '') {
            return [result('AS-GEN-001', 'violate', 'missing ' + key)];
        }
    }
    if (!schema || schema.outcomes.indexOf(row.outcome) === -1) return [result('AS-GEN-001', 'violate', 'outcome')];
    if (row.outcome === 'fail' && (!row.reasons || !row.reasons.length)) return [result('AS-GEN-001', 'violate', 'fail without reasons')];
    for (const reason of row.reasons || []) {
        if (schema.reasonCodes.indexOf(reason) === -1) return [result('AS-GEN-001', 'violate', 'reason ' + reason)];
    }
    return [result('AS-GEN-001', 'pass', row.outcome)];
}

function checkYield(row) {
    const need = ['generator', 'category', 'template', 'firstPassAcceptance', 'usableSlotsPerGeneration', 'regenerationsPerSlot', 'costPerUsableSlot', 'timePerUsableSlot'];
    for (const key of need) {
        if (!row || row[key] === undefined || row[key] === null) return [result('AS-GEN-002', 'violate', 'missing ' + key)];
    }
    return [result('AS-GEN-002', 'pass', row.generator + ' ' + row.category)];
}

function checkPromptVersion(row) {
    if (!row || !row.version) return [result('AS-GEN-003', 'violate', 'no version')];
    if (row.status === 'promoted' && row.abYieldBeatsCurrent !== true) {
        return [result('AS-GEN-003', 'violate', 'promoted without a better yield')];
    }
    return [result('AS-GEN-003', 'pass', row.status || 'version')];
}

function checkGenerators(standard) {
    const generators = standard.generators || {};
    const adapters = standard.generatorAdapters || {};
    const routing = standard.routingPolicy || {};
    const golden = standard.goldenTestSet || {};
    const tune = standard.styleTune || {};
    const fields = generators.fields || [];
    if (fields.indexOf('id') === -1 || fields.indexOf('version') === -1) return [result('AS-GEN-004', 'violate', 'generator fields')];
    if (adapters.from !== 'shared-prompt-spec' || adapters.perGenerator !== true) return [result('AS-GEN-004', 'violate', 'adapters')];
    if (routing.objective !== 'best-yield-per-cost' || routing.rebenchmark !== 'periodic' || routing.testSet !== 'goldenTestSet') {
        return [result('AS-GEN-004', 'violate', 'routing')];
    }
    if (golden.fixed !== true || !sameSet(golden.checks, ['palette', 'outline', 'anchor', 'style'])) {
        return [result('AS-GEN-004', 'violate', 'golden test set')];
    }
    if (tune.status !== 'optional-later' || tune.requiresOwnerDecision !== true) {
        return [result('AS-GEN-004', 'violate', 'style tune is not optional')];
    }
    const ids = new Set((generators.entries || []).map(entry => entry.id));
    for (const assignment of routing.assignments || []) {
        if (!ids.has(assignment.generator)) return [result('AS-GEN-004', 'violate', 'routing names an unknown generator')];
    }
    return [result('AS-GEN-004', 'pass', 'generator policy')];
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
    out.push.apply(out, checkSkins(standard.uiSkins, standard));
    out.push.apply(out, checkReligion(standard.religion));
    out.push.apply(out, checkFarm(standard.farming));
    out.push.apply(out, checkFood(standard.food));
    out.push.apply(out, checkClosed('AS-DUNG-001', standard.dungeonKit, ['cave-wall', 'mine-support', 'tunnel', 'underground-water', 'crystal', 'ruin'], 'dungeon kit'));
    out.push.apply(out, checkClosed('AS-TRAP-001', standard.traps, ['pit', 'spikes', 'pressure-plate', 'door-locked', 'door-broken', 'poison-gas', 'web', 'quicksand'], 'traps'));
    out.push.apply(out, checkClosed('AS-LORE-001', standard.loreVisuals, ['historical-portrait', 'era-ruin', 'artifact', 'history-log'], 'lore'));
    out.push.apply(out, checkClosed('AS-ZONE-001', standard.designations, ['dig', 'build', 'stockpile', 'route', 'blueprint-ghost'], 'designations'));
    out.push.apply(out, checkScenes(standard.eventScenes));
    out.push.apply(out, checkMarketing(standard.marketing));
    out.push.apply(out, checkTame(standard.domestication));
    out.push.apply(out, checkVariety(standard.variety, standard));
    out.push.apply(out, checkGenes(standard.genes, standard));
    out.push.apply(out, checkPortrait(standard.portraitSample, standard));
    out.push.apply(out, checkHeadLayer(standard.headGrid.sample));
    out.push.apply(out, checkHeadLayer(standard.headGrid.longHairSample));
    out.push.apply(out, checkBodyAnchors(standard.elderReuse.frames, standard));
    out.push.apply(out, checkElder(standard.elderReuse, standard));
    out.push.apply(out, checkGear(standard.gearPolicy.rows));
    out.push.apply(out, checkPoses(standard));
    out.push.apply(out, checkSheet(standard.sheetSample, standard));
    out.push.apply(out, checkSheet(standard.actionRowSample, standard));
    out.push.apply(out, checkAtlas(standard.runtimeAtlas));
    out.push.apply(out, checkPipeline(standard.pipelineSample));
    out.push.apply(out, checkPromptTemplates(standard.promptSpecTemplates));
    out.push.apply(out, checkGenerationLog(standard.generationLogSample, standard.generationLog));
    out.push.apply(out, checkYield(standard.yieldSample));
    out.push.apply(out, checkPromptVersion(standard.promptVersionSample));
    out.push.apply(out, checkGenerators(standard));
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
    const registryPaths = opts.biomeRegistries && opts.biomeRegistries.length ? opts.biomeRegistries : [
        path.join(ROOT, 'game', 'data', 'DEUS_BiomeRegistry.json'),
        path.join(ROOT, 'docs', 'art', 'DEUS_BiomeRegistry.json')
    ];
    for (let i = 0; i < registryPaths.length; i++) {
        let doc = null;
        try { doc = readJson(registryPaths[i]); }
        catch (e) { doc = null; }
        globals.push.apply(globals, checkBiomeRegistry(doc, standard, registryPaths[i]));
    }
    globals.push.apply(globals, checkCatalogueBiomes(catalogue, standard));
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
        spells: path.join(ROOT, 'game', 'data', 'srd51', 'spells.json'),
        biomeRegistries: []
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
        else if (a === '--biome-registry') opts.biomeRegistries.push(argv[++i]);
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
    animationResult, collectGlobals, run, main, readJson, clone, entryStatus,
    checkSkins, checkReligion, checkFarm, checkFood, checkClosed, checkScenes, checkMarketing,
    checkTame, checkVariety, checkGenes, checkPortrait, checkHeadLayer, checkBodyAnchors,
    checkElder, checkGear, checkMirror, checkPoses, checkBiomeRegistry, checkCatalogueBiomes,
    checkSheet, checkAtlas, checkPipeline, checkPromptTemplates, checkGenerationLog, checkYield,
    checkPromptVersion, checkGenerators, sizeResult
};

if (require.main === module) main(process.argv.slice(2));
