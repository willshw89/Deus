#!/usr/bin/env node
'use strict';
/**
 * tools/art/fixtures/templates/build_fixture.js — WG.32.02 Lane T test fixture (TEST_ rows, no art).
 *
 * Builds catalogue.fixture.json from geometry.fixture.json. It stands in for Lane S's catalogue
 * builder so tools/art/test_blank_templates.js can rebuild the fixture from a changed geometry
 * (stratumPx, layerPx, TALL_MEDIUM, the small-race readability floor) and see the templates follow.
 * Every slot size comes from the geometry: frame classes for creatures and characters,
 * stratumPx / layerPx for ramps, edge strips and wall faces, tilePx x ceil(max / tilePx) for props.
 *
 * Contents required by BRIEF WG.32.02 (Dependency): a 4096x4096 ATLAS, an A2 768x576 RMMZ_TILESET,
 * `$` RMMZ_CHARACTER sheets for the 144x192, 144x384 and 288x192 blocks, a 2x2-footprint slot,
 * LARGE_TALL 48x96 and LARGE_LONG 96x48 frames on 2x2 footprints, a TINY creature, TALL_MEDIUM rows
 * only when that parameter is enabled, a paper-doll group, a 5-cell ramp run, edge strips for
 * stratum differences 1..5, a CEILING-anchored hanging prop and a derived variant row (slot: null).
 * HUGE and GARGANTUAN rows carry no slot (their frames are Owner-open).
 *
 * Usage: node tools/art/fixtures/templates/build_fixture.js [--check]
 *   (no flag) rewrites catalogue.fixture.json     --check  exit 1 if the committed file is stale
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');

const HERE = __dirname;
const GEOMETRY_FILE = path.join(HERE, 'geometry.fixture.json');
const CATALOGUE_FILE = path.join(HERE, 'catalogue.fixture.json');
const REL = {
    geometry: 'tools/art/fixtures/templates/geometry.fixture.json',
    palette: 'art/palette/deus_master_world_palette_v1.hex',
    scaleChart: 'art/reference/DEUS_HUMAN_SCALE_STRIP_V1.png',
    brief: 'tasks/WG.32.02/lane-t/BRIEF.md'
};
// BRIEF WG.32.02 asks for a 4096x4096 ATLAS; 4096 is not a multiple of 48 (see escalation.md).
const ATLAS_SIDE = 4096;
const RMMZ_A2_TILES = [16, 12];
const RMMZ_A2_FIRST_TILE_ID = 2816;
const RMMZ_AUTOTILE_IDS = 48;

function textSha256(buf) {
    return crypto.createHash('sha256').update(Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'), 'utf8')).digest('hex');
}

function env(wMin, wTarget, wMax, hMin, hTarget, hMax) { return { wMin, wTarget, wMax, hMin, hTarget, hMax }; }

function buildCatalogue(geo, geometrySha256, opts) {
    opts = opts || {};
    const T = geo.tilePx;
    const up = px => T * Math.ceil(px / T);
    const cum = d => geo.stratumPx.slice(0, d).reduce((a, b) => a + b, 0);
    const frameOf = name => (geo.frameClasses[name] || geo.optionalParams[name]).frame;
    const bandH = up(geo.layerPx);
    const ground = (w, h) => ({ type: 'GROUND', x: Math.floor(w / 2), y: h - 1 });
    const pxFt = geo.pxPerFootCreature;
    const floor = geo.optionalParams.smallRaceReadabilityFloorPx;
    const raiseSmall = (race, e) => {
        if (!floor || floor.enabled !== true || !floor.races.includes(race)) return e;
        return Object.assign({}, e, { hMin: Math.max(e.hMin, floor.value[0]), hTarget: Math.max(e.hTarget, floor.value[0]), hMax: Math.max(e.hMax, floor.value[1]) });
    };

    const [hw, hh] = frameOf('MEDIUM');
    const [tw, th] = frameOf('LARGE_TALL');
    const [lw, lh] = frameOf('LARGE_LONG');
    const sheets = [
        { sheetId: 'TEST_ATLAS_SURFACE', kind: 'ATLAS', group: { band: 'SURFACE', biome: 'SURFACE_B1', type: 'TEST_MIXED' }, w: ATLAS_SIDE, h: ATLAS_SIDE, gridPx: T, runtimeFile: null },
        { sheetId: 'TEST_A2_SURFACE', kind: 'RMMZ_TILESET', group: { band: 'SURFACE', biome: 'SURFACE_B1', type: 'TEST_GROUND' }, w: RMMZ_A2_TILES[0] * T, h: RMMZ_A2_TILES[1] * T, gridPx: T, runtimeFile: 'TEST_A2_Surface.png' },
        { sheetId: '$TEST_Human', kind: 'RMMZ_CHARACTER', group: { band: 'SURFACE', biome: 'SURFACE_B1', type: 'TEST_CHARACTER' }, w: 3 * hw, h: 4 * hh, gridPx: T, runtimeFile: '$TEST_Human.png' },
        { sheetId: '$TEST_Ogre', kind: 'RMMZ_CHARACTER', group: { band: 'SURFACE', biome: 'SURFACE_B1', type: 'TEST_CREATURE' }, w: 3 * tw, h: 4 * th, gridPx: T, runtimeFile: '$TEST_Ogre.png' },
        { sheetId: '$TEST_Horse', kind: 'RMMZ_CHARACTER', group: { band: 'SURFACE', biome: 'SURFACE_B1', type: 'TEST_CREATURE' }, w: 3 * lw, h: 4 * lh, gridPx: T, runtimeFile: '$TEST_Horse.png' }
    ];

    const counters = {};
    const slotAt = (sheetId, x, y, w, h) => {
        const n = counters[sheetId] || 0;
        counters[sheetId] = n + 1;
        return { sheetId, slotId: `${sheetId}:${String(n).padStart(4, '0')}`, x, y, w, h };
    };
    const entries = [];
    const add = f => {
        const band = geo.bands.find(b => b.id === f.band);
        entries.push({
            id: f.id, category: f.category, band: f.band, biome: `${f.band}_B1`,
            zMin: band.zMin, zMax: band.zMax,
            sizeClass: f.sizeClass || null, frameClass: f.frameClass || null,
            sourceIds: { catalog: [], assetIndex: [], brief: [REL.brief], ar: [], manifest: [], matrix: [], addendum: [] },
            scaleRow: f.scaleRow,
            envelope: f.envelope === undefined ? null : f.envelope,
            footprint: f.footprint || { w: 1, h: 1 },
            anchor: f.anchor || null,
            paletteRampIds: [],
            frames: f.frames || { cols: 1, rows: 1, facings: 1, rate: 0 },
            slot: f.slot || null,
            runtime: f.runtime || { kind: 'ATLAS', file: null, index: null },
            variants: Object.assign({ derivedFrom: null, flipH: false, flipV: false, rot: 0, paletteSwap: null, lightingSafe: true }, f.variants || {}),
            paperDoll: f.paperDoll || null,
            references: [],
            standardPending: null,
            alphaMode: 'BINARY',
            status: 'MISSING',
            statusWhy: f.statusWhy || 'TEST_ fixture row; no art exists'
        });
    };
    const A = 'TEST_ATLAS_SURFACE';
    const walk = { cols: 3, rows: 4, facings: 4, rate: 1 };

    // Row 1: props sized tilePx x ceil(max / tilePx), and single creature frames. Slots touch.
    let x = 0, rowY = 0;
    const row1 = [
        { id: 'TEST_SURFACE_B1_FURNITURE_BED_V1_BASE', category: 'FURNITURE', band: 'SURFACE', scaleRow: 'ARCH_BED', footprint: { w: 2, h: 2 }, envelope: env(80, 88, 90, 56, 64, 70) },
        { id: 'TEST_SURFACE_B1_FURNITURE_TABLE_V1_BASE', category: 'FURNITURE', band: 'SURFACE', scaleRow: 'ARCH_TABLE', envelope: env(30, 36, 40, 20, 24, 28) },
        { id: 'TEST_LOWER1_B1_PROP_HANGING_V1_BASE', category: 'PROP', band: 'LOWER1', scaleRow: 'TEST_PROP_HANGING', envelope: env(10, 14, 20, 40, 50, 60), ceiling: true },
        { id: 'TEST_SURFACE_B1_CREATURE_TINY_V1_IDLE', category: 'CREATURE', band: 'SURFACE', scaleRow: 'TEST_CREATURE_TINY', sizeClass: 'TINY', frameClass: 'TINY',
            envelope: env(12, 18, geo.frameClasses.TINY.drawnFootprintPx[0], 12, 18, geo.frameClasses.TINY.drawnFootprintPx[1]) },
        { id: 'TEST_SURFACE_B1_CREATURE_OGRE_V1_IDLE', category: 'CREATURE', band: 'SURFACE', scaleRow: 'GEOM_FRAME_LARGE_TALL', sizeClass: 'LARGE', frameClass: 'LARGE_TALL', footprint: { w: 2, h: 2 }, envelope: env(24, 32, tw, 70, 84, th) },
        { id: 'TEST_SURFACE_B1_CREATURE_HORSE_V1_IDLE', category: 'CREATURE', band: 'SURFACE', scaleRow: 'GEOM_FRAME_LARGE_LONG', sizeClass: 'LARGE', frameClass: 'LARGE_LONG', footprint: { w: 2, h: 2 }, envelope: env(70, 84, lw, 30, 38, lh) },
        { id: 'TEST_SURFACE_B1_CHARACTER_GNOME_V1_IDLE', category: 'CHARACTER', band: 'SURFACE', scaleRow: 'RACE_GNOME', sizeClass: 'SMALL', frameClass: 'SMALL',
            envelope: raiseSmall('GNOME', env(10, 12, 14, 3 * pxFt, 25, 4 * pxFt)) },
        { id: 'TEST_SURFACE_B1_CHARACTER_HALFLING_V1_IDLE', category: 'CHARACTER', band: 'SURFACE', scaleRow: 'RACE_HALFLING', sizeClass: 'SMALL', frameClass: 'SMALL',
            envelope: raiseSmall('HALFLING', env(10, 12, 14, 3 * pxFt, 3 * pxFt, 3 * pxFt)) }
    ];
    let rowH = 0;
    for (const f of row1) {
        const [w, h] = f.frameClass ? frameOf(f.frameClass) : [up(f.envelope.wMax), up(f.envelope.hMax)];
        f.slot = slotAt(A, x, rowY, w, h);
        f.anchor = f.ceiling ? { type: 'CEILING', x: Math.floor(w / 2), y: 0 } : ground(w, h);
        delete f.ceiling;
        add(f);
        x += w;
        rowH = Math.max(rowH, h);
    }
    rowY += up(rowH);

    // Row 2: a ramp run of five cells rising 1..5 strata, bottom-aligned in one layer band.
    for (let k = 1; k <= geo.strataPerLayer; k++) {
        const h = cum(k);
        add({ id: `TEST_SURFACE_B1_RAMP_RISE${k}_V1_BASE`, category: 'RAMP', band: 'SURFACE', scaleRow: `GEOM_STRATUM_${k}`, envelope: env(T, T, T, h, h, h),
            anchor: ground(T, h), slot: slotAt(A, (k - 1) * T, rowY + bandH - h, T, h) });
    }
    rowY += bandH;

    // Row 3: edge/cliff strips for stratum differences 1..5, two tiles wide, one cell apart.
    for (let d = 1; d <= geo.strataPerLayer; d++) {
        const h = cum(d);
        add({ id: `TEST_SURFACE_B1_EDGE_STRATA${d}_V1_BASE`, category: 'EDGE', band: 'SURFACE', scaleRow: `GEOM_STRATUM_${d}`, envelope: env(2 * T, 2 * T, 2 * T, h, h, h),
            anchor: ground(2 * T, h), slot: slotAt(A, (d - 1) * 3 * T, rowY + bandH - h, 2 * T, h) });
    }
    rowY += bandH;

    // Row 4: one wall face, and a 2 x 2 set of wall faces (ticks repeat per frame row).
    add({ id: 'TEST_SURFACE_B1_WALL_FACE_V1_BASE', category: 'WALL', band: 'SURFACE', scaleRow: 'GEOM_LAYER_FACE', envelope: env(T, T, T, geo.layerPx, geo.layerPx, geo.layerPx),
        anchor: ground(T, geo.layerPx), slot: slotAt(A, 0, rowY + 2 * bandH - geo.layerPx, T, geo.layerPx) });
    add({ id: 'TEST_SURFACE_B1_WALL_FACE_V2_SET', category: 'WALL', band: 'SURFACE', scaleRow: 'GEOM_LAYER_FACE', envelope: env(T, T, T, geo.layerPx, geo.layerPx, geo.layerPx),
        anchor: ground(T, geo.layerPx), frames: { cols: 2, rows: 2, facings: 1, rate: 0 }, slot: slotAt(A, 2 * T, rowY + 2 * bandH - 2 * geo.layerPx, 2 * T, 2 * geo.layerPx) });
    rowY += 2 * bandH;

    // Row 5: a paper-doll group (base body plus two layers), one RMMZ 3x4 block each.
    ['base', 'torso', 'head'].forEach((layer, i) => {
        add({ id: `TEST_SURFACE_B1_DOLL_HUMAN_${layer.toUpperCase()}_WALK`, category: 'PAPERDOLL', band: 'SURFACE', scaleRow: 'RACE_HUMAN', sizeClass: 'MEDIUM', frameClass: 'MEDIUM',
            envelope: env(14, 18, 22, 35, geo.humanPx, 46), anchor: ground(hw, hh), frames: walk,
            paperDoll: { group: 'TEST_DOLL_HUMAN', layer, z: i, registration: { x: Math.floor(hw / 2), y: hh - 1 } },
            slot: slotAt(A, i * (3 * hw + T), rowY, 3 * hw, 4 * hh) });
    });
    rowY += up(4 * hh);

    // Row 6: TALL_MEDIUM rows exist only when the Owner enables the parameter.
    if (geo.optionalParams.TALL_MEDIUM.enabled === true) {
        const [mw, mh] = frameOf('TALL_MEDIUM');
        add({ id: 'TEST_SURFACE_B1_CREATURE_TALLMEDIUM_V1_IDLE', category: 'CREATURE', band: 'SURFACE', scaleRow: 'TEST_CREATURE_TALL_MEDIUM', sizeClass: 'MEDIUM', frameClass: 'TALL_MEDIUM',
            envelope: env(14, 20, 26, 44, 52, mh), anchor: ground(mw, mh), slot: slotAt(A, 0, rowY, mw, mh) });
        add({ id: 'TEST_SURFACE_B1_CREATURE_TALLMEDIUM_V1_WALK', category: 'CREATURE', band: 'SURFACE', scaleRow: 'TEST_CREATURE_TALL_MEDIUM', sizeClass: 'MEDIUM', frameClass: 'TALL_MEDIUM',
            envelope: env(14, 20, 26, 44, 52, mh), anchor: ground(mw, mh), frames: walk, slot: slotAt(A, 2 * T, rowY, 3 * mw, 4 * mh) });
        rowY += up(4 * mh);
    }

    // Rows with no paint slot: a derived variant and the Owner-open frame classes.
    const bed = entries.find(e => e.scaleRow === 'ARCH_BED');
    add({ id: 'TEST_SURFACE_B1_FURNITURE_BED_V1_FLIPPED', category: 'FURNITURE', band: 'SURFACE', scaleRow: 'ARCH_BED', footprint: bed.footprint, envelope: bed.envelope,
        anchor: bed.anchor, variants: { derivedFrom: bed.id, flipH: true }, statusWhy: 'TEST_ variant row; drawn from its parent, owns no paint slot' });
    for (const [cls, sq] of [['HUGE', 3], ['GARGANTUAN', 4]]) {
        add({ id: `TEST_SURFACE_B1_CREATURE_${cls}_V1_IDLE`, category: 'CREATURE', band: 'SURFACE', scaleRow: `TEST_CREATURE_${cls}`, sizeClass: cls, frameClass: cls,
            footprint: { w: sq, h: sq }, statusWhy: `TEST_ row; ${cls} frame is OWNER_OPEN (future), so no paint slot` });
    }

    // RMMZ A2 tileset: two ground autotile blocks (2 x 3 tiles each).
    for (let k = 0; k < 2; k++) {
        add({ id: `TEST_SURFACE_B1_TERRAIN_GROUND_V${k + 1}_BASE`, category: 'TERRAIN', band: 'SURFACE', scaleRow: 'GEOM_TILE', envelope: env(T, T, T, T, T, T),
            anchor: { type: 'CENTER', x: Math.floor(T / 2), y: Math.floor(T / 2) }, frames: { cols: 2, rows: 3, facings: 1, rate: 0 },
            runtime: { kind: 'RMMZ_TILESET', file: 'TEST_A2_Surface.png', tileId: RMMZ_A2_FIRST_TILE_ID + k * RMMZ_AUTOTILE_IDS },
            slot: slotAt('TEST_A2_SURFACE', k * 2 * T, 0, 2 * T, 3 * T) });
    }

    // `$` character sheets: one 3x4 block each, the block filling the sheet.
    const chars = [
        ['$TEST_Human', 'TEST_SURFACE_B1_CHARACTER_HUMAN_V1_WALK', 'RACE_HUMAN', 'MEDIUM', 'MEDIUM', 1, env(14, 18, 22, 35, geo.humanPx, 46)],
        ['$TEST_Ogre', 'TEST_SURFACE_B1_CREATURE_OGRE_V1_WALK', 'GEOM_FRAME_LARGE_TALL', 'LARGE', 'LARGE_TALL', 2, env(24, 32, tw, 70, 84, th)],
        ['$TEST_Horse', 'TEST_SURFACE_B1_CREATURE_HORSE_V1_WALK', 'GEOM_FRAME_LARGE_LONG', 'LARGE', 'LARGE_LONG', 2, env(70, 84, lw, 30, 38, lh)]
    ];
    for (const [sheetId, id, scaleRow, sizeClass, frameClass, sq, envelope] of chars) {
        const [fw, fh] = frameOf(frameClass);
        add({ id, category: 'CREATURE', band: 'SURFACE', scaleRow, sizeClass, frameClass, footprint: { w: sq, h: sq }, envelope, anchor: ground(fw, fh), frames: walk,
            runtime: { kind: 'RMMZ_CHARACTER', file: `${sheetId}.png`, index: 0 }, slot: slotAt(sheetId, 0, 0, 3 * fw, 4 * fh) });
    }

    return {
        schemaVersion: 'deus-art-catalogue/1.1.0',
        fixture: 'TEST_ catalogue fixture for tools/art/test_blank_templates.js (WG.32.02 Lane T), built by build_fixture.js. Not the art catalogue; no art exists for any row.',
        tileSizePx: T,
        geometry: { path: opts.geometryPath || REL.geometry, sha256: geometrySha256 },
        palette: { path: opts.palettePath || REL.palette, sha256: null },
        scaleChart: { path: REL.scaleChart, sha256: null },
        sources: [{ path: REL.brief, sha256: null, role: 'fixture specification' }],
        sheets,
        entries,
        outOfScope: [{ sourceId: 'TEST_SOURCE_OUT_OF_SCOPE_1', reason: 'TEST_ example of an out-of-scope source row' }]
    };
}

function buildFromFiles() {
    const raw = fs.readFileSync(GEOMETRY_FILE);
    return buildCatalogue(JSON.parse(raw.toString('utf8')), textSha256(raw));
}

module.exports = { buildCatalogue, buildFromFiles, textSha256, GEOMETRY_FILE, CATALOGUE_FILE, REL, ATLAS_SIDE };

if (require.main === module) {
    const built = buildFromFiles();
    if (process.argv.includes('--check')) {
        const committed = JSON.parse(fs.readFileSync(CATALOGUE_FILE, 'utf8'));
        try { assert.deepStrictEqual(committed, built); } catch (err) {
            console.log('STALE: catalogue.fixture.json differs from build_fixture.js output; run node tools/art/fixtures/templates/build_fixture.js');
            process.exitCode = 1;
            return;
        }
        console.log('catalogue.fixture.json matches build_fixture.js output');
    } else {
        fs.writeFileSync(CATALOGUE_FILE, JSON.stringify(built, null, 2) + '\n');
        console.log(`wrote ${CATALOGUE_FILE}: ${built.sheets.length} sheets, ${built.entries.length} entries`);
    }
}
