#!/usr/bin/env node
'use strict';
// tools/art/build_catalogue.js: the DEUS art catalogue builder (WG.20.02, schema deus-art-catalogue/1.1.0).
//
// Reads the project's asset sources and writes one deterministic, machine-readable manifest of every
// tile and sprite slot: ids, sizes, slots, sources, statuses and references. It contains NO image data
// and never opens, draws or writes a pixel (DEC-007). No npm dependencies.
//
//   node tools/art/build_catalogue.js            rebuild every generated output
//   node tools/art/build_catalogue.js --check    rebuild in memory; exit 1 if a committed output differs
//   node tools/art/build_catalogue.js --root <dir>   read sources from <dir> (fixtures); same layout as the repo
//
// Outputs: art/catalogue/{catalogue.json, scale_chart.json, size_classes.json, references.json, conflicts.md}
// and docs/art/catalogue/{INDEX.md, BAND_<band>.md}. Hand-written: catalogue.schema.json and SCHEMA.md.
// Every pixel size that depends on the vertical geometry is computed from art/catalogue/geometry.json
// (stratumPx, layerPx, tilePx); the layer count and z range are read from it, never assumed.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SCHEMA_VERSION = 'deus-art-catalogue/1.1.0';

const OUT = {
    catalogue: 'art/catalogue/catalogue.json',
    scaleChart: 'art/catalogue/scale_chart.json',
    sizeClasses: 'art/catalogue/size_classes.json',
    references: 'art/catalogue/references.json',
    conflicts: 'art/catalogue/conflicts.md',
    docsDir: 'docs/art/catalogue',
};

const SRC = {
    geometry: 'art/catalogue/geometry.json',
    strip: 'art/catalogue/strip_transcription.json',
    sizeInputs: 'art/catalogue/size_inputs.json',
    mapping: 'art/catalogue/mapping.json',
    refInputs: 'art/catalogue/reference_inputs.json',
    claims: 'art/catalogue/conflict_claims.json',
    manifest: 'docs/ASSET_MANIFEST.md',
    srdOptions: 'game/data/srd51/character_options.json',
    srdRules: 'game/data/srd51/rules.json',
    srdCreatures: 'game/data/srd51/creatures.json',
    ufIndex: 'game/data/UF_AssetIndex.json',
    deusIndex: 'game/data/DEUS_AssetIndex.json',
    worldCatalog: 'game/data/UF_WorldCatalog.json',
    briefsDir: 'docs/asset_briefs',
    requests: 'docs/ASSET_REQUESTS.md',
    inventory: 'docs/ASSET_INVENTORY.md',
    matrix: 'docs/art/DEUS_BIOME_PRODUCTION_MATRIX.json',
    scaleReg: 'game/data/DEUS_ScaleRegistry.json',
    paletteReg: 'game/data/DEUS_PaletteRegistry.json',
    biomeReg: 'game/data/DEUS_BiomeRegistry.json',
    rmmzSpec: 'docs/RMMZ_ASSET_SPEC.md',
    paletteHex: 'art/palette/deus_master_world_palette_v1.hex',
    ufHex: 'art/palette/uf.hex',
    scaleStandard: 'docs/art/DEUS_HUMAN_WORLD_SCALE_STANDARD.md',
    docsScaleReg: 'docs/art/DEUS_ScaleRegistry.json',
    docsBiomeReg: 'docs/art/DEUS_BiomeRegistry.json',
    decisions: 'docs/OWNER_DECISIONS.md',
    vision: 'docs/VISION.md',
};

// Enumerations of the contract (docs/art/catalogue/SCHEMA.md).
const STATUS = ['MISSING', 'EXISTING_UNAPPROVED', 'STAND_IN', 'STOCK', 'APPROVED', 'OUT_OF_SCOPE'];
const ANCHOR_TYPES = ['GROUND', 'CEILING', 'WALL', 'CENTER'];
const ALPHA_MODES = ['BINARY', 'OWNER_OPEN'];
const SHEET_KINDS = ['ATLAS', 'RMMZ_TILESET', 'RMMZ_CHARACTER'];
const SOURCE_KINDS = ['catalog', 'assetIndex', 'brief', 'ar', 'manifest', 'matrix', 'addendum'];
const CATEGORY_GROUP = {
    TERRAIN: 'TILE', WATER: 'TILE', TOP: 'TILE', EDGE: 'TILE', RAMP: 'TILE', RAMPSIDE: 'TILE',
    WALLFACE: 'TILE', CONNECTOR: 'TILE', VEIN: 'TILE',
    SHADE: 'OVERLAY', RIMSHADOW: 'OVERLAY', DECAY: 'OVERLAY',
    TREE: 'PROP', FLORA: 'PROP', STONE: 'PROP', REMAINS: 'PROP', STRUCTURE: 'PROP', FURNITURE: 'PROP',
    WORKSHOP: 'PROP', HANGING: 'PROP', LIGHT: 'PROP',
    ITEM: 'ITEM',
    CHARACTER: 'CHARACTER', CREATURE: 'CHARACTER', EQUIPMENT: 'CHARACTER',
    FACE: 'FACE', EFFECT: 'EFFECT',
};
const CATEGORIES = Object.keys(CATEGORY_GROUP);
// The Owner addendum families (tasks/WG.20.02/lane-s/BRIEF.md deliverable 5). `find` locates the
// ruling that orders each family so conflicts/coverage can cite file:line.
const FAMILIES = [
    { id: 'EDGE', section: '§15', file: 'docs/OWNER_DECISIONS.md', find: 'auto-placed edge/cliff-face strips per height difference' },
    { id: 'SHADE', section: '§15', file: 'docs/OWNER_DECISIONS.md', find: 'auto-placed edge/cliff-face strips per height difference' },
    { id: 'TOP', section: '§15', file: 'docs/OWNER_DECISIONS.md', find: 'one top-surface tile per terrain' },
    { id: 'RAMP', section: '§16', file: 'docs/OWNER_DECISIONS.md', find: 'Art catalogue adds ramp/slope pieces per terrain' },
    { id: 'RAMPSIDE', section: '§16', file: 'tasks/WG.20.02/lane-s/BRIEF.md', find: 'plus ramp side faces and stair/ladder connector pieces' },
    { id: 'CONNECTOR', section: '§16', file: 'tasks/WG.20.02/lane-s/BRIEF.md', find: 'plus ramp side faces and stair/ladder connector pieces' },
    { id: 'DECAY', section: '§7', file: 'docs/VISION.md', find: 'intact -> weathered -> overgrown -> collapsed -> buried mound' },
    { id: 'WALLFACE', section: '§19 cue 1', file: 'docs/VISION.md', find: '(1) visible inner side walls of openings' },
    { id: 'RIMSHADOW', section: '§19 cue 2', file: 'docs/VISION.md', find: '(2) rim shadows cast onto lower layers' },
    { id: 'DEPTH', section: '§19 cue 3', file: 'docs/VISION.md', find: '(3) deeper layers use darker baked palettes in tile art' },
    { id: 'HANGING', section: '§19 cue 5', file: 'docs/VISION.md', find: '(5) hanging and falling props between layers' },
    { id: 'LIGHT', section: '§19 cue 6', file: 'docs/VISION.md', find: '(6) deep light sources against darkness' },
    { id: 'FRAMECLASS', section: 'Owner 02:04 CT', file: 'tasks/WG.20.02/lane-s/BRIEF.md', find: 'Character/creature frame slots by frame class' },
];
const HANGING_KINDS = ['ROOTS', 'VINES', 'STALACTITES', 'WATERFALL', 'DUST', 'LIGHT-SHAFT'];
const DECAY_STAGES = ['WEATHERED', 'OVERGROWN', 'COLLAPSED', 'BURIED'];
const ALL_BAND = 'ALL';
const SHARED = 'SHARED';

// ---------------------------------------------------------------- utilities
function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }
function sortStr(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
function uniq(arr) { return Array.from(new Set(arr)); }
function idField(v) { return String(v).toUpperCase().replace(/[^A-Z\d]+/g, '-').replace(/^-+|-+$/g, ''); }
function makeId(band, biome, category, type, variant, state) {
    return [band, biome, category, type, variant, state].map(idField).join('_');
}
function ceilTo(n, step) { return step * Math.ceil(n / step); }

function makeCtx(root) {
    const cache = new Map();
    const ctx = {
        root,
        abs: rel => path.join(root, rel),
        exists: rel => fs.existsSync(path.join(root, rel)),
        buf: rel => fs.readFileSync(path.join(root, rel)),
        text: rel => {
            if (!cache.has(rel)) cache.set(rel, fs.readFileSync(path.join(root, rel), 'utf8').replace(/^﻿/, ''));
            return cache.get(rel);
        },
        json: rel => JSON.parse(ctx.text(rel)),
        lines: rel => ctx.text(rel).split(/\r?\n/),
        used: new Set(),
    };
    // Every file read through read() is recorded as a source of the catalogue.
    ctx.read = (rel, role) => { ctx.used.add(rel + '\u0000' + role); return ctx.text(rel); };
    ctx.readJson = (rel, role) => JSON.parse(ctx.read(rel, role));
    // First 1-based line that contains `find` (literal), or 0.
    ctx.lineOf = (rel, find) => {
        if (!ctx.exists(rel)) return 0;
        ctx.used.add(rel + '\u0000CITED');
        const L = ctx.lines(rel);
        for (let i = 0; i < L.length; i++) if (L[i].includes(find)) return i + 1;
        return 0;
    };
    return ctx;
}

// ---------------------------------------------------------------- geometry
function validateGeometry(g) {
    const errs = [];
    const e = msg => errs.push({ code: 'GEOM_INVALID', id: 'geometry', msg });
    if (g.schemaVersion !== SCHEMA_VERSION) e(`schemaVersion ${g.schemaVersion} is not ${SCHEMA_VERSION}`);
    for (const k of ['squareFt', 'layerFt', 'strataPerLayer', 'stratumFt', 'layerCount', 'zMin', 'zMax', 'tilePx', 'layerPx', 'humanPx', 'pxPerFootCreature', 'atlasMaxPx']) {
        if (!Number.isInteger(g[k])) e(`${k} must be an integer`);
    }
    if (g.layerCount !== g.zMax - g.zMin + 1) e(`layerCount ${g.layerCount} does not equal zMax - zMin + 1 (${g.zMax - g.zMin + 1})`);
    if (g.strataPerLayer * g.stratumFt !== g.layerFt) e('strataPerLayer x stratumFt must equal layerFt');
    if (!Array.isArray(g.stratumPx) || g.stratumPx.length !== g.strataPerLayer) e(`stratumPx must list strataPerLayer (${g.strataPerLayer}) values`);
    else {
        if (g.stratumPx.some(v => !Number.isInteger(v) || v < 1)) e('every stratumPx value must be an integer >= 1');
        const sum = g.stratumPx.reduce((a, b) => a + b, 0);
        if (sum !== g.layerPx) e(`stratumPx sums to ${sum}, not layerPx ${g.layerPx}`);
    }
    if (g.layerPx % g.tilePx !== 0) e('layerPx must be a whole number of tiles');
    if (g.atlasMaxPx < g.tilePx) e('atlasMaxPx must be at least one tile');
    if (!Array.isArray(g.facings) || !g.facings.length) e('facings must be a non-empty list');
    // Bands: contiguous, non-overlapping, covering zMin..zMax exactly.
    const bands = (g.bands || []).slice().sort((a, b) => a.zMin - b.zMin);
    if (!bands.length) e('bands missing');
    let z = g.zMin;
    for (const b of bands) {
        if (!/^[A-Z][A-Z\d]*$/.test(b.id || '') || b.id === ALL_BAND) e(`bad band id ${b.id}`);
        if (b.zMin !== z) e(`band ${b.id} starts at ${b.zMin}, expected ${z}`);
        if (b.zMax < b.zMin) e(`band ${b.id} is empty`);
        z = b.zMax + 1;
    }
    if (bands.length && z !== g.zMax + 1) e(`bands end at ${z - 1}, expected zMax ${g.zMax}`);
    for (const [cls, fc] of Object.entries(g.frameClasses || {})) {
        if (!Array.isArray(fc.footprintSq) || fc.footprintSq.length !== 2) e(`frameClass ${cls} footprintSq`);
        if (fc.frame !== null && !(Array.isArray(fc.frame) && fc.frame.length === 2)) e(`frameClass ${cls} frame must be [w,h] or null`);
        if (fc.frame) {
            const key = `${fc.frame[0]}x${fc.frame[1]}`;
            const blk = (g.rmmzCharacterBlocks || {})[key];
            if (!blk) e(`frameClass ${cls} has no rmmzCharacterBlocks entry ${key}`);
            else if (blk[0] !== fc.frame[0] * 3 || blk[1] !== fc.frame[1] * 4) e(`rmmzCharacterBlocks ${key} is not 3x4 frames`);
        } else if (fc.status !== 'OWNER_OPEN') e(`frameClass ${cls} without a frame must be OWNER_OPEN`);
    }
    const op = g.optionalParams || {};
    if (!op.TALL_MEDIUM || typeof op.TALL_MEDIUM.enabled !== 'boolean') e('optionalParams.TALL_MEDIUM.enabled must be boolean');
    if (!op.smallRaceReadabilityFloorPx || typeof op.smallRaceReadabilityFloorPx.enabled !== 'boolean') e('optionalParams.smallRaceReadabilityFloorPx.enabled must be boolean');
    return errs;
}

// Face / strip heights from the stratum split (stratumPx is listed bottom-up). A step of k strata can
// start at any stratum, so the slot must fit the tallest run of k consecutive strata (max) and the
// envelope minimum is the shortest run (min); the target is the step that starts on the lowest stratum
// (the first k values), so the order of stratumPx matters for the target but not for the slot size.
function strataWindow(g, k) {
    let min = Infinity, max = 0;
    for (let i = 0; i + k <= g.stratumPx.length; i++) {
        const s = g.stratumPx.slice(i, i + k).reduce((a, b) => a + b, 0);
        if (s < min) min = s;
        if (s > max) max = s;
    }
    const target = g.stratumPx.slice(0, k).reduce((a, b) => a + b, 0);
    return { min, target, max };
}
function bandIds(g) { return g.bands.map(b => b.id); }
function bandOfZ(g, z) { const b = g.bands.find(x => z >= x.zMin && z <= x.zMax); return b ? b.id : null; }
function bandRange(g, band) {
    if (band === ALL_BAND) return [g.zMin, g.zMax];
    const b = g.bands.find(x => x.id === band);
    return b ? [b.zMin, b.zMax] : [null, null];
}

// ---------------------------------------------------------------- RMMZ spec
function parseRmmzSpec(ctx) {
    const text = ctx.read(SRC.rmmzSpec, 'RMMZ_SPEC');
    const L = text.split(/\r?\n/);
    const find = re => { for (let i = 0; i < L.length; i++) { const m = re.exec(L[i]); if (m) return { m, line: i + 1 }; } return null; };
    const out = { sheets: {}, rows: {}, zOrder: {} };
    const tile = find(/\*\*Grid Tile Size\*\*\s*\|\s*\*\*(\d+) × (\d+) px\*\*/);
    if (tile) out.rows.RMMZ_TILE_48 = { w: +tile.m[1], h: +tile.m[2], line: tile.line, note: 'grid tile' };
    for (const s of ['A1', 'A2', 'A3', 'A4', 'A5']) {
        const r = find(new RegExp('^\\| \\*\\*' + s + '\\*\\* \\|[^|]*\\| \\*\\*(\\d+) × (\\d+) px\\*\\*'));
        if (r) {
            out.sheets[s] = { w: +r.m[1], h: +r.m[2], line: r.line };
            const blk = /each (\d+)×(\d+) px/.exec(L[r.line - 1]);
            if (blk && s !== 'A5') out.rows['RMMZ_AUTOTILE_' + s] = { w: +blk[1], h: +blk[2], line: r.line, note: s + ' autotile block' };
        }
    }
    const be = find(/^\| \*\*B – E\*\* \|[^|]*\| \*\*(\d+) × (\d+) px\*\*/);
    if (be) for (const s of ['B', 'C', 'D', 'E']) out.sheets[s] = { w: +be.m[1], h: +be.m[2], line: be.line };
    const face = find(/\*\*Cell Size\*\*: \*\*(\d+) × (\d+) px\*\*/);
    if (face) out.rows.RMMZ_FACE_144 = { w: +face.m[1], h: +face.m[2], line: face.line, note: 'face cell' };
    const fsheet = find(/^- \*\*Dimensions\*\*: \*\*(\d+) × (\d+) px\*\* \(4 columns × 2 rows/);
    if (fsheet) out.faceSheet = { w: +fsheet.m[1], h: +fsheet.m[2], line: fsheet.line };
    // Equipment layer z-order stack (§2 C).
    for (let i = 0; i < L.length; i++) {
        const m = /^\s*(\d)\. `([a-z]+)`/.exec(L[i]);
        if (m && !out.zOrder[m[2]]) out.zOrder[m[2]] = { z: +m[1], line: i + 1 };
    }
    const ws = find(/^\s*\d\. `weapon` \/ `tool`/);
    if (ws) out.zOrder.tool = { z: out.zOrder.weapon ? out.zOrder.weapon.z : 0, line: ws.line };
    return out;
}

// ---------------------------------------------------------------- markdown sources
function parseManifest(ctx) {
    const L = ctx.read(SRC.manifest, 'ASSET_MANIFEST').split(/\r?\n/);
    const rows = [];
    L.forEach((l, i) => {
        if (!/^\| `/.test(l)) return;
        const c = l.split('|').slice(1, -1).map(s => s.trim().replace(/^`|`$/g, '').trim());
        if (c.length < 15) return;
        const [id, sheet, grid, category, material, type, footprint, frames, rate, anchor, zext, blackTop, system, promptVer, verified] = c;
        rows.push({ id, sheet, grid, category, material, type, footprint, frames, rate, anchor, zext, blackTop, system, promptVer, verified, line: i + 1 });
    });
    return rows;
}

function parseRequests(ctx) {
    const L = ctx.read(SRC.requests, 'ASSET_REQUESTS').split(/\r?\n/);
    const rows = [];
    L.forEach((l, i) => {
        const m = /^\|\s*(~~)?(AR-\d+)(~~)?\s*\|/.exec(l);
        if (!m) return;
        const c = l.split('|').slice(1, -1).map(s => s.trim());
        const status = c[c.length - 1];
        const word = (/^([A-Z][A-Z ]+?)(\s*\(|$)/.exec(status) || [null, status])[1].trim();
        const open = !/^(DELIVERED|CHECKED|APPROVED|INTEGRATED|WITHDRAWN)/.test(status);
        rows.push({ id: m[2], title: c[1].replace(/\*\*/g, ''), status: word, statusText: status, open, withdrawn: !!m[1], line: i + 1, text: l });
    });
    return rows;
}

function parseInventory(ctx) {
    const L = ctx.read(SRC.inventory, 'ASSET_INVENTORY').split(/\r?\n/);
    const map = new Map();
    let inTables = true;
    L.forEach((l, i) => {
        if (/^## Needs a request/.test(l)) inTables = false;
        if (!inTables) return;
        const m = /^\| `([^`]*)` \|/.exec(l);
        if (!m) return;
        const c = l.split(' | ');
        if (c.length < 6) return;
        const status = c[c.length - 2].trim();
        if (!map.has(m[1])) map.set(m[1], { status, line: i + 1 });
    });
    return map;
}

function parseBriefs(ctx) {
    const dir = SRC.briefsDir;
    const files = fs.readdirSync(ctx.abs(dir)).filter(f => /^SEG-\d\d_.*\.md$/.test(f)).sort(sortStr);
    const briefs = [];
    for (const f of files) {
        const rel = dir + '/' + f;
        const L = ctx.read(rel, 'ASSET_BRIEF').split(/\r?\n/);
        const seg = f.slice(0, 6);
        let cur = null;
        const flush = () => { if (cur) briefs.push(cur); cur = null; };
        L.forEach((l, i) => {
            const h = /^### (\S+) — (.*)$/.exec(l);
            if (h) {
                flush();
                const gender = /, (male|female)\b/i.exec(h[2]);
                cur = { seg, file: rel, line: i + 1, id: h[1], title: h[2], ars: uniq((h[2].match(/AR-\d+/g) || [])), gender: gender ? gender[1].toLowerCase() : null, refs: [] };
                return;
            }
            if (!cur) return;
            let m = /^- \*\*Category\*\*: (.*)$/.exec(l); if (m) cur.category = m[1];
            m = /^- \*\*Dimensions\*\*: (.*)$/.exec(l);
            if (m) {
                cur.dimensions = m[1];
                const d = /drawn shape is (\d+) px wide and (\d+) px tall/.exec(m[1]);
                if (d) { cur.drawnW = +d[1]; cur.drawnH = +d[2]; }
            }
            m = /^- \*\*Anchor\*\*: (.*)$/.exec(l); if (m) cur.anchorText = m[1];
            m = /^- \*\*Reference\*\*: (.*)$/.exec(l);
            if (m) {
                const refs = (m[1].match(/`((?:art\/u7_reference_squares|reference)\/[A-Za-z0-9_.\-]+\.png)`/g) || []).map(s => s.replace(/`/g, ''));
                cur.refs = uniq(refs);
            }
            m = /^Deliver: (.*)$/.exec(l);
            if (m) {
                cur.deliver = m[1];
                const s = /\((\d+)×(\d+)/.exec(m[1]);
                if (s) { cur.deliverW = +s[1]; cur.deliverH = +s[2]; }
                const fw = /frameWidth (\d+), frameHeight (\d+)/.exec(m[1]);
                if (fw) { cur.frameW = +fw[1]; cur.frameH = +fw[2]; }
                const a = /anchor \[(\d+), (\d+)\]/.exec(m[1]);
                if (a) cur.anchor = [+a[1], +a[2]];
            }
        });
        flush();
    }
    for (const b of briefs) b.sourceId = b.seg + ':' + b.id + (b.seg === 'SEG-11' && b.gender ? ':' + b.gender : '');
    return briefs;
}

// ---------------------------------------------------------------- size authorities
function buildScaleChart(ctx, g, rmmz, strip, stats) {
    const reg = ctx.readJson(SRC.scaleReg, 'SCALE_REGISTRY');
    const stripByRow = new Map(strip.labels.map(l => [l.row, l]));
    const rows = [];
    for (const [cls, v] of Object.entries(reg.classes)) {
        const lab = stripByRow.get(cls);
        const row = {
            rowId: cls, source: lab ? 'STRIP+REGISTRY' : 'REGISTRY_ONLY', category: v.category,
            wMin: v.visualWidthMin, wTarget: v.visualWidthTarget, wMax: v.visualWidthMax,
            hMin: v.visualHeightMin, hTarget: v.visualHeightTarget, hMax: v.visualHeightMax,
            footprint: { w: v.footprintWidthTiles, h: v.footprintHeightTiles },
            anchor: v.anchorType, overhangAllowed: v.overhangAllowed,
            ref: `${SRC.scaleReg}:${ctx.lineOf(SRC.scaleReg, '"' + cls + '"')}`,
        };
        if (lab) { row.chartLabel = lab.chartLabel; row.chartHeightPx = lab.chartHeightPx; }
        rows.push(row);
    }
    // Tile-class rows from the RMMZ spec (sizes parsed from docs/RMMZ_ASSET_SPEC.md, never typed here).
    for (const id of ['RMMZ_TILE_48', 'RMMZ_AUTOTILE_A1', 'RMMZ_AUTOTILE_A2', 'RMMZ_AUTOTILE_A3', 'RMMZ_AUTOTILE_A4', 'RMMZ_FACE_144']) {
        const r = rmmz.rows[id];
        if (!r) { stats.errors.push({ code: 'RMMZ_SPEC', id, msg: `size of ${id} not found in ${SRC.rmmzSpec}` }); continue; }
        const row = { rowId: id, source: 'RMMZ_SPEC', category: 'TILE_CLASS', wMin: r.w, wTarget: r.w, wMax: r.w, hMin: r.h, hTarget: r.h, hMax: r.h, footprint: { w: r.w / g.tilePx, h: r.h / g.tilePx }, anchor: 'CENTER', overhangAllowed: false, ref: `${SRC.rmmzSpec}:${r.line}` };
        const lab = stripByRow.get(id);
        if (lab) { row.chartLabel = lab.chartLabel; row.chartHeightPx = lab.chartHeightPx; }
        rows.push(row);
    }
    // Geometry rows, computed from geometry.json only.
    const T = g.tilePx;
    const geo = (rowId, w, hMin, h, note, extra, hTarget) => rows.push(Object.assign({ rowId, source: 'GEOMETRY', category: 'GEOMETRY', wMin: w, wTarget: w, wMax: w, hMin, hTarget: hTarget === undefined ? h : hTarget, hMax: h, footprint: { w: Math.max(1, Math.ceil(w / T)), h: 1 }, anchor: 'CENTER', overhangAllowed: false, ref: `${SRC.geometry} (${note})` }, extra || {}));
    geo('GEOM_TILE', T, T, T, 'tilePx');
    for (let k = 1; k <= g.strataPerLayer; k++) {
        const w = strataWindow(g, k);
        geo('GEOM_STRATUM_' + k, T, w.min, w.max, `${k} consecutive stratumPx: min..max over start positions, target = the lowest ${k}`, { strata: k }, w.target);
    }
    geo('GEOM_LAYER_FACE', T, g.layerPx, g.layerPx, 'layerPx');
    for (let k = 1; k <= g.strataPerLayer; k++) {
        const w = strataWindow(g, k);
        geo('GEOM_RAMP_' + k, T, T + w.min, T + w.max, `ramp cell ${k}: tilePx + rise of ${k} strata`, { strata: k }, T + w.target);
    }
    for (const [cls, fc] of Object.entries(g.frameClasses)) {
        if (!fc.frame) continue;
        rows.push({ rowId: 'GEOM_FRAME_' + cls, source: 'GEOMETRY', category: 'FRAME_CLASS', wMin: fc.frame[0], wTarget: fc.frame[0], wMax: fc.frame[0], hMin: fc.frame[1], hTarget: fc.frame[1], hMax: fc.frame[1], footprint: { w: fc.footprintSq[0], h: fc.footprintSq[1] }, anchor: 'BOTTOM_CENTER', overhangAllowed: false, ref: `${SRC.geometry} (frameClasses.${cls}.frame)` });
    }
    if (g.optionalParams.TALL_MEDIUM.enabled) {
        const f = g.optionalParams.TALL_MEDIUM.frame;
        rows.push({ rowId: 'GEOM_FRAME_TALL_MEDIUM', source: 'GEOMETRY', category: 'FRAME_CLASS', wMin: f[0], wTarget: f[0], wMax: f[0], hMin: f[1], hTarget: f[1], hMax: f[1], footprint: { w: 1, h: 1 }, anchor: 'BOTTOM_CENTER', overhangAllowed: false, ref: `${SRC.geometry} (optionalParams.TALL_MEDIUM.frame, enabled)` });
    }
    return { reg, rows };
}

function parseSizeTable(ctx, g) {
    const rules = ctx.readJson(SRC.srdRules, 'SRD_SIZE_TABLE');
    const e = rules.entries.find(x => x.id === 'srd:table:size-categories');
    const out = {};
    if (!e) return out;
    for (const [size, space] of e.data.rows) {
        const m = /^(\d+)(½)?/.exec(space);
        const ft = m ? +m[1] + (m[2] ? 0.5 : 0) : null;
        out[size] = { spaceText: space, spaceFt: ft, footprintSq: ft === null ? null : Math.max(1, Math.ceil(ft / g.squareFt)), orLarger: /or larger/.test(space) };
    }
    return out;
}

function buildSizeClasses(ctx, g, scale, stats) {
    const inputs = ctx.readJson(SRC.sizeInputs, 'SIZE_INPUTS');
    const opts = ctx.readJson(SRC.srdOptions, 'SRD_RACES');
    const sizeTable = parseSizeTable(ctx, g);
    const regClasses = scale.reg.classes;
    const floor = g.optionalParams.smallRaceReadabilityFloorPx;
    const ppf = g.pxPerFootCreature;
    const races = [];
    const checks = [];
    const human = inputs.races.find(r => r.id === 'RACE_HUMAN');
    for (const r of inputs.races) {
        const e = opts.entries.find(x => x.id === r.srdEntryId);
        const trait = e && e.data && (e.data.traits || []).find(t => t.name === 'Size');
        const traitText = trait ? trait.text.replace(/^Size\.\s*/, '') : null;
        const srdSize = e && e.data ? e.data.size : null;
        if (!e) stats.errors.push({ code: 'SRD_ENTRY', id: r.id, msg: `SRD entry ${r.srdEntryId} not found` });
        if (traitText !== r.srdTraitQuote) stats.errors.push({ code: 'SRD_QUOTE', id: r.id, msg: `quoted Size trait does not match ${SRC.srdOptions} ${r.srdEntryId}` });
        // 7 px per foot checks; a failed check is a conflict, never a silent fix.
        const rel = (px, ft, how, side) => {
            if (how === 'NONE') return { side, ok: px <= g.frameClasses[r.frameClass].frame[1], rule: `no SRD bound; <= frame height ${g.frameClasses[r.frameClass].frame[1]}` };
            if (how === 'SAME_AS_HUMAN') { const hp = side === 'min' ? human.drawnHeightPxMin : human.drawnHeightPxMax; return { side, ok: px === hp, rule: `same as RACE_HUMAN (${hp})` }; }
            const lim = ft * ppf;
            if (how === 'EQ') return { side, ok: px === lim, rule: `${ft} ft x ${ppf} = ${lim}` };
            if (how === 'LT') return { side, ok: px < lim, rule: `under ${ft} ft: < ${lim}` };
            if (how === 'GT') return { side, ok: px > lim, rule: `over ${ft} ft: > ${lim}` };
            return { side, ok: false, rule: `unknown relation ${how}` };
        };
        const cMin = rel(r.drawnHeightPxMin, r.feetMin, r.minRel, 'min');
        const cMax = rel(r.drawnHeightPxMax, r.feetMax, r.maxRel, 'max');
        for (const c of [cMin, cMax]) checks.push({ race: r.id, side: c.side, ok: c.ok, rule: c.rule, px: c.side === 'min' ? r.drawnHeightPxMin : r.drawnHeightPxMax });
        const fcSize = { TINY: 'Tiny', SMALL: 'Small', MEDIUM: 'Medium' }[r.frameClass];
        if (srdSize && fcSize && fcSize !== srdSize) stats.errors.push({ code: 'SRD_SIZE', id: r.id, msg: `frameClass ${r.frameClass} does not match SRD size ${srdSize}` });
        const wr = regClasses[r.widthRow];
        let hMin = r.drawnHeightPxMin, hMax = r.drawnHeightPxMax;
        let floorApplied = false;
        const race = r.id.replace(/^RACE_/, '');
        if (floor.enabled && floor.races.includes(race)) { hMin = Math.max(hMin, floor.value[0]); hMax = Math.max(hMax, floor.value[1]); floorApplied = true; }
        const hTarget = r.heightTargetRule === 'HUMAN_PX' ? g.humanPx : Math.round((hMin + hMax) / 2);
        const status = r.minRel === 'EQ' && r.maxRel === 'EQ' && cMin.ok && cMax.ok ? 'DERIVED' : 'PROPOSED';
        const row = {
            id: r.id, srdSize, srdSourceRef: { file: SRC.srdOptions, entryId: r.srdEntryId, line: ctx.lineOf(SRC.srdOptions, r.srdTraitQuote.slice(0, 40)), trait: traitText },
            feetMin: r.feetMin, minRel: r.minRel, feetMax: r.feetMax, maxRel: r.maxRel,
            drawnHeightPxMin: hMin, drawnHeightPxMax: hMax, drawnHeightPxTarget: hTarget,
            drawnWidthPx: wr ? { min: wr.visualWidthMin, target: wr.visualWidthTarget, max: wr.visualWidthMax, row: r.widthRow, status: r.widthStatus } : null,
            frameClass: r.frameClass, frame: g.frameClasses[r.frameClass].frame,
            footprintSq: srdSize && sizeTable[srdSize] ? [sizeTable[srdSize].footprintSq, sizeTable[srdSize].footprintSq] : null,
            status,
        };
        if (floor.races.includes(race)) row.readabilityFloorPx = { value: floor.value, enabled: floor.enabled, applied: floorApplied };
        if (!wr) stats.errors.push({ code: 'SCALEROW_UNKNOWN', id: r.id, msg: `widthRow ${r.widthRow} not in the scale registry` });
        races.push(row);
    }
    const humanOk = ppf * 6 === g.humanPx;
    const frameClasses = Object.entries(g.frameClasses).map(([cls, fc]) => {
        const row = { id: 'FRAME_' + cls, footprintSq: fc.footprintSq, frame: fc.frame, rmmzBlock: fc.frame ? g.rmmzCharacterBlocks[`${fc.frame[0]}x${fc.frame[1]}`] : null, status: fc.status || 'DECIDED' };
        if (fc.drawnFootprintPx) row.drawnFootprintPx = fc.drawnFootprintPx;
        if (fc.future) row.future = true;
        return row;
    });
    const tm = g.optionalParams.TALL_MEDIUM;
    const doc = {
        schemaVersion: SCHEMA_VERSION,
        about: 'Machine-readable character-size authority (generated by tools/art/build_catalogue.js from art/catalogue/size_inputs.json, the SRD 5.1 race Size traits and the Size Categories table). Drawn heights only: the simulation keeps the true SRD heights. Footprint (SRD squares) and frame (px) are separate fields and are never derived from each other.',
        pxPerFootCreature: ppf,
        humanCheck: { feet: 6, px: ppf * 6, humanPx: g.humanPx, ok: humanOk },
        sizeTable: { file: SRC.srdRules, entryId: 'srd:table:size-categories', rows: Object.entries(sizeTable).map(([size, v]) => ({ size, spaceText: v.spaceText, spaceFt: v.spaceFt, footprintSq: v.footprintSq, orLarger: v.orLarger })) },
        races,
        checks,
        frameClasses,
        optionalParams: {
            TALL_MEDIUM: { frame: tm.frame, enabled: tm.enabled, rmmzBlock: [tm.frame[0] * 3, tm.frame[1] * 4], status: 'OWNER_OPEN' },
            smallRaceReadabilityFloorPx: { value: floor.value, races: floor.races, enabled: floor.enabled, status: 'OWNER_OPEN' },
        },
    };
    if (!humanOk) stats.errors.push({ code: 'SIZE_RULE', id: 'humanCheck', msg: `pxPerFootCreature x 6 = ${ppf * 6} but humanPx = ${g.humanPx}` });
    return { doc, inputs, sizeTable };
}

// ---------------------------------------------------------------- entries
function entryBase(g, p) {
    const [zMin, zMax] = bandRange(g, p.band);
    return {
        id: makeId(p.band, p.biome || SHARED, p.category, p.type, p.variant || 'V1', p.state || 'DEFAULT'),
        category: p.category, band: p.band, biome: p.biome || SHARED, zMin, zMax,
        sizeClass: p.sizeClass === undefined ? null : p.sizeClass,
        frameClass: p.frameClass === undefined ? null : p.frameClass,
        sourceIds: Object.fromEntries(SOURCE_KINDS.map(k => [k, uniq((p.sourceIds && p.sourceIds[k]) || []).sort(sortStr)])),
        scaleRow: p.scaleRow, envelope: null, footprint: null, anchor: null,
        paletteRampIds: (p.ramps || []).slice(),
        frames: p.frames || { cols: 1, rows: 1, facings: ['S'], rate: null },
        slot: null,
        runtime: p.runtime || { kind: 'NONE', file: null, index: null },
        variants: Object.assign({ derivedFrom: null, flipH: false, flipV: false, rot: 0, paletteSwap: null, lightingSafe: false }, p.variants || {}),
        paperDoll: p.paperDoll || null,
        references: (p.references || []).slice(),
        standardPending: p.standardPending || null,
        alphaMode: p.alphaMode || 'BINARY',
        status: p.status || 'MISSING',
        statusWhy: p.statusWhy || '',
        family: p.family || 'SOURCE',
        groupType: CATEGORY_GROUP[p.category] || 'PROP',
        mapping: p.mapping || null,
        geometryDerived: p.geometryDerived || null,
        ownerOpen: !!p.ownerOpen,
        notes: p.notes || null,
    };
}

// Fill envelope, footprint, anchor from the size row; the slot comes later from packing.
function applySize(g, e, row, anchorType, opts) {
    opts = opts || {};
    const env = opts.envelope || { wMin: row.wMin, wTarget: row.wTarget, wMax: row.wMax, hMin: row.hMin, hTarget: row.hTarget, hMax: row.hMax };
    e.envelope = env;
    e.footprint = opts.footprint || { w: row.footprint.w, h: row.footprint.h };
    const T = g.tilePx;
    const cw = ceilTo(env.wMax, T), ch = ceilTo(env.hMax, T);
    const ax = Math.floor(cw / 2);
    const ay = anchorType === 'GROUND' ? ch - 1 : anchorType === 'CENTER' ? Math.floor(ch / 2) : 0;
    e.anchor = { type: anchorType, x: ax, y: ay };
}
function anchorFromRow(row) { return row.anchor === 'BOTTOM_CENTER' ? 'GROUND' : 'CENTER'; }

function statusFromIndex(key, catalogId, inv, idx, stats) {
    const invRow = inv.get(key);
    const ix = idx[key];
    if (!invRow && !ix) return { status: 'MISSING', why: `no asset index row for ${key || '(empty key)'}` };
    const word = invRow ? invRow.status : ix.status;
    if (invRow && ix && invRow.status !== ix.status) stats.conflicts.push({ topic: 'status', text: `status of \`${key}\` differs: ${SRC.inventory}:${invRow.line} says "${invRow.status}", ${SRC.ufIndex} says "${ix.status}"` });
    // A catalog id that borrows another id's original image (tinted, or not its first user) has no art
    // of its own. Stock sheets stay STOCK whoever uses them (a tint only tells stock users apart).
    let tinted = false;
    if (ix && catalogId) {
        const users = ix.usedBy || [];
        const mine = users.find(u => new RegExp('\\b' + catalogId.replace(/[-_]/g, '[-_ ]') + '\\b').test(u)) || '';
        const first = users[0] || '';
        tinted = /tint #[0-9a-f]+/i.test(mine);
        if (word === 'original' && (tinted || (mine && mine !== first))) {
            const firstId = first.split('"')[0].trim();
            const why = mine !== first ? `borrows ${key}, drawn for ${firstId || 'another id'}${tinted ? ' (tinted)' : ''}` : `uses ${key} recoloured by a tint`;
            return { status: 'STAND_IN', why: `${why}; ${SRC.ufIndex}` };
        }
    }
    const map = { missing: 'MISSING', 'stock RMMZ': 'STOCK', 'U7 stand-in': 'STAND_IN', generated: 'STAND_IN', original: 'EXISTING_UNAPPROVED' };
    const status = map[word] || 'MISSING';
    const why = { MISSING: 'file missing', STOCK: 'stock RMMZ art in use', STAND_IN: word === 'generated' ? 'drawn in code (generated placeholder)' : 'U7 stand-in', EXISTING_UNAPPROVED: 'original art on disk; not Owner-approved under DEC-007' }[status];
    return { status, why: `${why}${tinted ? ', shared sheet told apart by a tint' : ''} (${invRow ? SRC.inventory + ':' + invRow.line : SRC.ufIndex})` };
}

function runtimeFromKey(key, idx, g) {
    if (key === undefined || key === null) return { kind: 'NONE', file: null, index: null };
    const m = /^([A-Za-z0-9_]+)#(\d+)$/.exec(key);
    if (m) return { kind: 'RMMZ_TILESET', file: `img/tilesets/${m[1]}.png`, tileId: +m[2] };
    const ix = idx[key];
    if (ix && /^img\/characters\//.test(ix.file)) return { kind: 'RMMZ_CHARACTER', file: ix.file, index: 0 };
    return { kind: 'NONE', file: ix ? ix.file : null, index: null };
}

function buildEntries(ctx, S) {
    const { g, chart, rowById, raceById, rampIds, mapping, wc, idx, inv, briefs, requests, manifest, rmmz, stats, sizeClasses, creatures } = S;
    const entries = [];
    const add = e => { entries.push(e); return e; };
    const byCatalog = new Map();
    const reg = (key, e) => { if (!byCatalog.has(key)) byCatalog.set(key, []); byCatalog.get(key).push(e); };
    const briefsById = new Map();
    for (const b of briefs) { if (!briefsById.has(b.id)) briefsById.set(b.id, []); briefsById.get(b.id).push(b); }
    const briefIds = id => (briefsById.get(id) || []).map(b => b.sourceId);
    const briefArs = id => uniq((briefsById.get(id) || []).flatMap(b => b.ars));
    const briefRefs = id => uniq((briefsById.get(id) || []).flatMap(b => b.refs));
    const worldRefs = ['pack:WORLD'];
    const rowOf = id => { const r = rowById.get(id) || raceById.get(id); if (!r) stats.errors.push({ code: 'SCALEROW_UNKNOWN', id, msg: `scale row ${id} is not in scale_chart.json or size_classes.json` }); return r; };
    const T = g.tilePx;

    // Surface / underground membership from the WorldCatalog biome tables.
    const surfaceObjs = new Set(), undergroundObjs = new Set();
    for (const [k, v] of Object.entries(wc.biomes)) if (k !== 'about' && v && v.plants) for (const o of Object.keys(v.plants)) surfaceObjs.add(o);
    for (const v of Object.values(wc.undergroundBiomes)) for (const o of Object.keys(v.plants || {})) undergroundObjs.add(o);
    const legacyUnderBand = bandOfZ(g, -1) === bandOfZ(g, -2) ? bandOfZ(g, -1) : null; // legacy levels -1/-2
    const objectBand = o => {
        const m = mapping.objects[o.id] || {};
        if ((o.tags || []).includes('building')) return ALL_BAND;
        const s = surfaceObjs.has(o.id), u = undergroundObjs.has(o.id);
        if (s && u) return ALL_BAND;
        if (s) return bandOfZ(g, 0);
        if (u) return legacyUnderBand || ALL_BAND;
        if (m.band) return m.band;
        stats.errors.push({ code: 'BAND_UNKNOWN', id: o.id, msg: `no band for object ${o.id}` });
        return ALL_BAND;
    };
    const assetKeyOfObject = o => o.image !== undefined ? o.image : (o.tile ? `${o.tile.sheet}#${o.tile.id}` : null);
    const arsOfKey = key => uniq(((idx[key] && idx[key].requests) || []).map(r => (/AR-\d+/.exec(r) || [r])[0]));
    const manifestFor = id => manifest.filter(r => r.mapTo === id).map(r => r.id);

    // A. WorldCatalog objects.
    for (const o of wc.objects) {
        const m = mapping.objects[o.id];
        if (!m) { stats.errors.push({ code: 'MAPPING_MISSING', id: 'objects:' + o.id, msg: 'object has no mapping in art/catalogue/mapping.json' }); continue; }
        const row = rowOf(m.scaleRow);
        const key = assetKeyOfObject(o);
        const st = statusFromIndex(key, o.id, inv, idx, stats);
        const bs = briefsById.get(o.id) || [];
        const fb = bs.slice().reverse().find(b => b.frameW && b.deliverW) || null;
        const cols = fb ? Math.max(1, Math.round(fb.deliverW / fb.frameW)) : 1;
        const rows_ = fb ? Math.max(1, Math.round(fb.deliverH / fb.frameH)) : 1;
        // Separate art states only where a source names separate art (campfire: SEG-05 delivers
        // campfire.png and campfire_lit.png; ASSET_MANIFEST lists the animated lit sheets).
        const states = o.id === 'campfire' ? ['UNLIT', 'LIT'] : ['DEFAULT'];
        for (const state of states) {
            const man = manifest.filter(r => r.mapTo === o.id && (state === 'LIT' ? r.state === 'LIT' : r.state !== 'LIT'));
            const animated = man.map(r => /(\d+)\.\.(\d+)/.exec(r.frames)).filter(Boolean);
            const frameCount = state === 'LIT' && animated.length ? Math.max(...animated.map(f => +f[2] - +f[1] + 1)) : cols;
            const rateRow = man.find(r => r.rate && r.rate !== '-');
            const e = entryBase(g, {
                category: m.category, band: objectBand(o), type: o.id, state,
                sourceIds: { catalog: ['objects:' + o.id], assetIndex: key !== null ? [key] : [], brief: briefIds(o.id), ar: uniq(arsOfKey(key).concat(briefArs(o.id))), manifest: man.map(r => r.id) },
                scaleRow: m.scaleRow, ramps: m.ramps,
                frames: { cols: frameCount, rows: state === 'LIT' ? 1 : rows_, facings: ['S'], rate: rateRow ? rateRow.rate : null },
                runtime: runtimeFromKey(key, idx, g), references: worldRefs.concat(briefRefs(o.id)),
                status: st.status, statusWhy: st.why, mapping: { scaleBasis: m.scaleBasis, rampBasis: m.rampBasis, rule: 'mapping.objects.' + o.id },
            });
            if (row) applySize(g, e, row, anchorFromRow(row));
            add(e); reg('objects:' + o.id, e);
        }
    }

    // B. Items.
    const items = Array.isArray(wc.items.types) ? wc.items.types : Object.entries(wc.items.types).map(([id, v]) => Object.assign({ id }, v));
    const itemRamp = it => {
        for (const r of mapping.itemRampRules) {
            if (r.default) return r;
            if ((r.ids || []).includes(it.id)) return r;
            if ((r.tags || []).some(t => (it.tags || []).includes(t) || it[t] !== undefined)) return r;
        }
        return null;
    };
    const itemRow = rowOf('RMMZ_TILE_48');
    for (const it of items) {
        const key = it.image || null;
        const st = statusFromIndex(key, it.id, inv, idx, stats);
        const rr = itemRamp(it);
        const e = entryBase(g, {
            category: 'ITEM', band: ALL_BAND, type: it.id,
            sourceIds: { catalog: ['items:' + it.id], assetIndex: key ? [key] : [], brief: briefIds(it.id), ar: uniq(arsOfKey(key).concat(briefArs(it.id))), manifest: manifestFor('items:' + it.id) },
            scaleRow: 'RMMZ_TILE_48', ramps: rr.ramps, runtime: runtimeFromKey(key, idx, g), references: worldRefs.concat(briefRefs(it.id)),
            status: st.status, statusWhy: st.why, mapping: { scaleBasis: 'PROPOSED', rampBasis: 'PROPOSED', rule: 'mapping.itemRampRules.' + rr.rule },
            notes: 'item icon occupies one 48x48 frame (RMMZ_ASSET_SPEC §2; briefs: 48x48 ground icon); drawn size inside the frame is not charted',
        });
        if (itemRow) applySize(g, e, itemRow, 'GROUND');
        add(e); reg('items:' + it.id, e);
    }

    // C. Creatures (wildlife).
    const species = Array.isArray(wc.wildlife.species) ? wc.wildlife.species : Object.entries(wc.wildlife.species).map(([id, v]) => Object.assign({ id }, v));
    const sizeToClass = { Tiny: 'TINY', Small: 'SMALL', Medium: 'MEDIUM' };
    const bodyPlan = sizeClasses.inputs.bodyPlanRules;
    const frameClassFor = (size, type) => {
        if (sizeToClass[size]) return { cls: sizeToClass[size], why: `SRD ${size}` };
        if (size === 'Large') {
            if (bodyPlan.LARGE_TALL.includes(type)) return { cls: 'LARGE_TALL', why: `SRD Large ${type} -> tall body` };
            if (bodyPlan.LARGE_LONG.includes(type)) return { cls: 'LARGE_LONG', why: `SRD Large ${type} -> long body` };
            return { cls: null, why: `SRD Large ${type}: body plan OWNER_OPEN` };
        }
        if (size === 'Huge' || size === 'Gargantuan') return { cls: size.toUpperCase(), why: `SRD ${size}: frame OWNER_OPEN` };
        return { cls: 'MEDIUM', why: 'no SRD creature matches this id; MEDIUM 48x48 frame PROPOSED (the current runtime frame)' };
    };
    const charFrames = { cols: 3, rows: 4, facings: ['S', 'W', 'E', 'N'], rate: null };
    for (const sp of species) {
        const srd = creatures.find(c => c.id === 'srd:creature:' + sp.id.replace(/_/g, '-'));
        const size = srd ? srd.data.size : null;
        const fc = frameClassFor(size, srd ? srd.data.type : null);
        const key = sp.image || null;
        const st = statusFromIndex(key, sp.id, inv, idx, stats);
        const geomFc = fc.cls ? g.frameClasses[fc.cls] : null;
        const footSq = size && sizeClasses.sizeTable[size] ? sizeClasses.sizeTable[size].footprintSq : (briefsById.has(sp.id) ? 1 : null);
        const e = entryBase(g, {
            category: 'CREATURE', band: ALL_BAND, type: sp.id, sizeClass: size, frameClass: fc.cls,
            sourceIds: { catalog: ['wildlife:' + sp.id], assetIndex: key ? [key] : [], brief: briefIds(sp.id), ar: uniq(arsOfKey(key).concat(briefArs(sp.id))) },
            scaleRow: geomFc && geomFc.frame ? 'GEOM_FRAME_' + fc.cls : null, ramps: mapping.living.ramps, frames: charFrames,
            runtime: runtimeFromKey(key, idx, g), references: worldRefs.concat(briefRefs(sp.id)),
            status: st.status, statusWhy: st.why, ownerOpen: !srd,
            mapping: { scaleBasis: srd ? 'MATCH' : 'PROPOSED', rampBasis: mapping.living.rampBasis, rule: srd ? `SRD ${srd.id} size ${size}; ${fc.why}` : fc.why },
        });
        if (geomFc && geomFc.frame) applySize(g, e, rowOf('GEOM_FRAME_' + fc.cls), 'GROUND', { footprint: footSq ? { w: footSq, h: footSq } : { w: geomFc.footprintSq[0], h: geomFc.footprintSq[1] } });
        else { e.footprint = footSq ? { w: footSq, h: footSq } : null; e.statusWhy += `; frame ${fc.why}, no paint slot`; }
        add(e); reg('wildlife:' + sp.id, e);
    }

    // D. People (the WorldCatalog species), start-pair colonists, brief-only species, generic person, children.
    const raceIdOf = sp => 'RACE_' + idField(sp).replace(/-/g, '_');
    const peopleKeys = Object.keys(wc.people).filter(k => k !== 'about');
    const personEntry = (p) => {
        const race = raceById.get(p.raceRow);
        const fcName = race ? race.frameClass : (p.frameClass || 'MEDIUM');
        const e = entryBase(g, Object.assign({ category: 'CHARACTER', band: ALL_BAND, ramps: mapping.living.ramps, frames: charFrames, sizeClass: race ? race.srdSize : (p.sizeClass || null), frameClass: fcName, references: worldRefs.concat(p.refs || []), mapping: { scaleBasis: race ? race.status === 'DERIVED' ? 'MATCH' : 'PROPOSED' : 'PROPOSED', rampBasis: mapping.living.rampBasis, rule: race ? 'size_classes.' + race.id : (p.rule || 'frame class default') } }, p));
        const row = race ? { wMin: race.drawnWidthPx.min, wTarget: race.drawnWidthPx.target, wMax: race.drawnWidthPx.max, hMin: race.drawnHeightPxMin, hTarget: race.drawnHeightPxTarget, hMax: race.drawnHeightPxMax, footprint: { w: race.footprintSq[0], h: race.footprintSq[1] }, anchor: 'BOTTOM_CENTER' } : rowOf(p.scaleRow);
        e.scaleRow = race ? race.id : p.scaleRow;
        if (row) applySize(g, e, row, 'GROUND');
        return e;
    };
    for (const sp of peopleKeys) {
        const imgs = wc.people[sp].images || [];
        const genders = ['MALE', 'FEMALE'];
        const counters = { MALE: 0, FEMALE: 0 };
        imgs.forEach((img, i) => {
            const gname = /female/i.test(img) ? 'FEMALE' : /male/i.test(img) ? 'MALE' : genders[i % 2];
            counters[gname]++;
            const variant = sp === 'human' ? `${gname}-${counters[gname]}` : gname;
            const st = statusFromIndex(img, null, inv, idx, stats);
            const bIds = briefs.filter(b => b.seg === 'SEG-11' && b.id === sp && (b.gender || '').toUpperCase() === gname && sp !== 'human').map(b => b.sourceId);
            const e = personEntry({ type: sp, variant, raceRow: raceIdOf(sp), sourceIds: { catalog: ['people:' + sp], assetIndex: [img], brief: bIds, ar: arsOfKey(img).concat(bIds.length ? ['AR-400'] : []) }, runtime: img ? runtimeFromKey(img, idx, g) : { kind: 'RMMZ_CHARACTER', file: null, index: null }, status: img ? st.status : 'MISSING', statusWhy: img ? st.why : `people.${sp}.images[${i}] is empty (${SRC.worldCatalog}); ${SRC.ufIndex} key "" is missing` });
            add(e); reg('people:' + sp, e);
        });
    }
    // Start-pair colonist sheets (the paper-doll bodies): tier 0 = $UF_Human_<G>, tier 1 = $Adam / $Eve.
    const colonist = [['MALE', 'T0', '$UF_Human_Male'], ['FEMALE', 'T0', '$UF_Human_Female'], ['MALE', 'T1', '$Adam'], ['FEMALE', 'T1', '$Eve']];
    const bodyIds = {};
    for (const [gname, tier, key] of colonist) {
        const st = statusFromIndex(key, null, inv, idx, stats);
        const bIds = tier === 'T0' ? briefs.filter(b => (b.seg === 'SEG-11' && b.id === 'human' && (b.gender || '').toUpperCase() === gname) || (b.seg === 'SEG-00' && b.id === 'human') || (b.id === 'anchor_person' && gname === 'MALE')).map(b => b.sourceId) : [];
        const e = personEntry({ type: 'human', variant: `${gname}-${tier}`, raceRow: 'RACE_HUMAN', sourceIds: { catalog: ['people:human'], assetIndex: [key], brief: bIds, ar: arsOfKey(key).concat(bIds.length ? ['AR-400'] : []) }, runtime: runtimeFromKey(key, idx, g), status: st.status, statusWhy: st.why + `; start.pair ${gname.toLowerCase()} clothing tier ${tier.slice(1)}` });
        add(e);
        if (tier === 'T0') bodyIds[gname] = e.id;
    }
    // Brief species that are not WorldCatalog people (goblin, orc, automaton): kept, not resolved (conflicts.md).
    const extraSpecies = uniq(briefs.filter(b => b.seg === 'SEG-11' && !peopleKeys.includes(b.id)).map(b => b.id));
    for (const sp of extraSpecies) {
        const srd = creatures.find(c => c.id === 'srd:creature:' + sp);
        const size = srd ? srd.data.size : null;
        const fc = frameClassFor(size, srd ? srd.data.type : null);
        for (const b of briefs.filter(x => x.seg === 'SEG-11' && x.id === sp)) {
            const gname = b.gender ? b.gender.toUpperCase() : 'ANY';
            const e = personEntry({ type: sp, variant: gname, frameClass: fc.cls, sizeClass: size, scaleRow: 'GEOM_FRAME_' + fc.cls, rule: srd ? `SRD ${srd.id} size ${size}; ${fc.why}` : fc.why, sourceIds: { brief: [b.sourceId], ar: b.ars }, runtime: { kind: 'RMMZ_CHARACTER', file: null, index: null }, status: 'MISSING', statusWhy: `brief ${b.file}:${b.line}; no ${SRC.ufIndex} row (${SRC.deusIndex} is a stale fork)`, ownerOpen: true, refs: b.refs });
            add(e);
        }
    }
    // Generic person (AR-050).
    add(personEntry({ type: 'person', variant: 'GENERIC', raceRow: 'RACE_HUMAN', sourceIds: { ar: ['AR-050'] }, runtime: { kind: 'RMMZ_CHARACTER', file: null, index: null }, status: 'MISSING', statusWhy: `AR-050 ${requests.find(r => r.id === 'AR-050') ? 'REQUESTED' : ''}: generic person for arrivals and test units` }));
    // Children (AR-601; only the child stage has a chart row, CHARACTER_CHILD).
    for (const sp of peopleKeys) {
        add(personEntry({ type: sp, variant: 'ANY', state: 'CHILD', scaleRow: 'CHARACTER_CHILD', frameClass: 'SMALL', sizeClass: null, rule: 'chart row CHARACTER_CHILD (baby and teen sizes OWNER_OPEN)', sourceIds: { catalog: ['people:' + sp], ar: ['AR-601'] }, runtime: { kind: 'RMMZ_CHARACTER', file: null, index: null }, status: 'MISSING', statusWhy: 'AR-601 REQUESTED: age stages (adults only today)' }));
    }

    // E. Paper-doll equipment layers on the human body bases.
    const zOf = layer => (rmmz.zOrder[layer === 'held' ? 'weapon' : layer === 'clothes' ? 'torso' : layer] || { z: null }).z;
    const bodyOf = gname => entries.find(e => e.id === bodyIds[gname]);
    const eqEntry = (type, variant, layer, gname, material, p) => {
        const body = bodyOf(gname);
        const layerFile = `img/characters/$UF_Layer_${type}.png`;
        const exists = ctx.exists('game/' + layerFile);
        const e = entryBase(g, Object.assign({
            category: 'EQUIPMENT', band: ALL_BAND, type, variant, ramps: mapping.equipmentRamps[material] || mapping.living.ramps,
            frames: JSON.parse(JSON.stringify(body.frames)), references: worldRefs.slice(),
            paperDoll: { bodyType: body.id, layer, zOrder: zOf(layer) },
            runtime: { kind: 'RMMZ_CHARACTER', file: exists ? layerFile : null, index: 0 },
            status: exists ? 'EXISTING_UNAPPROVED' : 'MISSING', statusWhy: exists ? `layer file game/${layerFile} on disk; not Owner-approved` : `no layer file game/${layerFile}`,
            mapping: { scaleBasis: 'MATCH', rampBasis: 'PROPOSED', rule: 'paper-doll part shares its body base frame and anchor' },
        }, p));
        e.scaleRow = body.scaleRow;
        e.frameClass = body.frameClass; // the layer rides on the body's frame; it has no SRD size of its own
        e.envelope = Object.assign({}, body.envelope);
        e.footprint = Object.assign({}, body.footprint);
        e.anchor = Object.assign({}, body.anchor);
        return e;
    };
    const eqList = [];
    const eqBrief = id => briefs.filter(b => b.id === id);
    const pushEq = (type, variant, layer, gname, material, sourceIds) => {
        const e = eqEntry(type, variant, layer, gname, material, { sourceIds });
        eqList.push(e); add(e); return e;
    };
    // SEG-17 held/shield/head layers.
    const seg17 = [['eq_weapon_stone_axe', 'stone_axe', 'held', 'stone'], ['eq_weapon_stone_knife', 'stone_knife', 'held', 'stone'], ['eq_weapon_stone_pick', 'stone_pick', 'held', 'stone'], ['eq_shield_wood', 'shield_wood', 'shield', 'wood'], ['eq_helmet_leather', 'helmet_leather', 'head', 'leather']];
    const seg18Layers = { club: ['held', 'wood', 'AR-900'], spear: ['held', 'wood', 'AR-900'], dagger_iron: ['held', 'iron', 'AR-900'], sword_short: ['held', 'iron', 'AR-900'], sword_long: ['held', 'iron', 'AR-900'], axe_iron: ['held', 'iron', 'AR-900'], mace: ['held', 'iron', 'AR-900'], bow_short: ['held', 'wood', 'AR-900'], bow_long: ['held', 'wood', 'AR-900'], sling: ['held', 'leather', 'AR-900'], shield_wood: ['shield', 'wood', 'AR-901'], shield_iron: ['shield', 'iron', 'AR-901'], helmet_leather: ['head', 'leather', 'AR-902'], helmet_iron: ['head', 'iron', 'AR-902'], armor_leather: ['torso', 'leather', 'AR-903'], mail_iron: ['torso', 'iron', 'AR-903'], leggings_leather: ['legs', 'leather', 'AR-903'], greaves_iron: ['legs', 'iron', 'AR-903'] };
    const eqByType = new Map();
    for (const [bid, type, layer, mat] of seg17) {
        const s18 = seg18Layers[type];
        const e = pushEq(type, 'LAYER', layer, 'MALE', mat, { catalog: items.some(i => i.id === type) ? ['items:' + type] : [], brief: eqBrief(bid).map(b => b.sourceId).concat(s18 ? briefIds(type).filter(x => x.startsWith('SEG-18')) : []), ar: uniq(eqBrief(bid).flatMap(b => b.ars).concat(s18 ? [s18[2]] : [])).concat(layer === 'held' || layer === 'shield' ? ['AR-512'] : []) });
        eqByType.set(type, e);
    }
    for (const [type, [layer, mat, ar]] of Object.entries(seg18Layers)) {
        if (eqByType.has(type)) continue;
        const e = pushEq(type, 'LAYER', layer, 'MALE', mat, { catalog: ['items:' + type], brief: briefIds(type).filter(x => x.startsWith('SEG-18')), ar: [ar].concat(layer === 'held' || layer === 'shield' ? ['AR-512'] : []) });
        eqByType.set(type, e);
    }
    // Quiver back layer (AR-904 arrows).
    pushEq('arrows', 'QUIVER', 'back', 'MALE', 'leather', { catalog: ['items:arrows'], brief: briefIds('arrows'), ar: ['AR-904'] });
    // Clothing tiers 1..3 (SEG-17 eq_torso_tiers / eq_legs_tiers; AR-501).
    for (const [bid, layer] of [['eq_torso_tiers', 'torso'], ['eq_legs_tiers', 'legs']]) {
        for (const gname of ['MALE', 'FEMALE']) {
            for (let t = 1; t <= 3; t++) {
                pushEq('clothes-' + layer, `T${t}-${gname}`, layer, gname, 'cloth', { brief: eqBrief(bid).map(b => b.sourceId), ar: uniq(eqBrief(bid).flatMap(b => b.ars).concat(['AR-501'])) });
            }
        }
    }

    // F. Faces: culture sheets (faces.pattern x faces.sheets) and species sheets.
    const faceRow = rowOf('RMMZ_FACE_144');
    const faceSheet = rmmz.faceSheet || { w: faceRow ? faceRow.wMax * 4 : 0, h: faceRow ? faceRow.hMax * 2 : 0 };
    const faceFrames = { cols: faceRow ? faceSheet.w / faceRow.wMax : 1, rows: faceRow ? faceSheet.h / faceRow.hMax : 1, facings: ['S'], rate: null };
    for (const culture of Object.keys(wc.faces.cultures)) {
        if (culture === 'default') continue;
        for (let n = 1; n <= wc.faces.sheets; n++) {
            const name = wc.faces.pattern.replace('{culture}', culture).replace('{n}', n);
            const file = `img/faces/${name}.png`;
            const exists = ctx.exists('game/' + file);
            const bIds = n === 1 ? briefs.filter(b => b.id === 'face_' + culture).map(b => b.sourceId) : [];
            const ars = requests.filter(r => r.text.includes(name + '.png')).map(r => r.id);
            const e = entryBase(g, { category: 'FACE', band: ALL_BAND, type: culture, variant: 'SHEET-' + n, sourceIds: { catalog: ['faces:' + culture], brief: bIds, ar: uniq(ars.concat(bIds.length ? ['AR-700'] : [])) }, scaleRow: 'RMMZ_FACE_144', ramps: mapping.living.ramps, frames: faceFrames, runtime: { kind: 'RMMZ_FACE', file: exists ? file : null, index: null }, references: worldRefs.slice(), status: exists ? 'EXISTING_UNAPPROVED' : 'MISSING', statusWhy: exists ? `game/${file} on disk; not Owner-approved` : `no game/${file}`, mapping: { scaleBasis: 'MATCH', rampBasis: mapping.living.rampBasis, rule: 'faces.pattern / RMMZ face sheet' } });
            if (faceRow) applySize(g, e, faceRow, 'CENTER');
            add(e); reg('faces:' + culture, e);
        }
    }
    for (const [sp, gs] of Object.entries(wc.faces.species || {})) {
        for (const [gname, stages] of Object.entries(gs)) {
            for (const [stage, spec] of Object.entries(stages)) {
                const file = `img/faces/${spec.sheet}.png`;
                const exists = ctx.exists('game/' + file);
                const e = entryBase(g, { category: 'FACE', band: ALL_BAND, type: sp, variant: `${gname}-${stage}`, sourceIds: { catalog: ['faces:species:' + sp], ar: ['AR-700'] }, scaleRow: 'RMMZ_FACE_144', ramps: mapping.living.ramps, frames: faceFrames, runtime: { kind: 'RMMZ_FACE', file: exists ? file : null, index: null }, references: worldRefs.slice(), status: exists ? 'EXISTING_UNAPPROVED' : 'MISSING', statusWhy: exists ? `game/${file} on disk; not Owner-approved` : `no game/${file}`, mapping: { scaleBasis: 'MATCH', rampBasis: mapping.living.rampBasis, rule: 'faces.species' } });
                if (faceRow) applySize(g, e, faceRow, 'CENTER');
                add(e); reg('faces:species:' + sp, e);
            }
        }
    }

    // G. Combat and casting effects (SEG-18 ui_fx_*, SEG-17 eq_cast_effect): $UF_fx sheets of 3x4 48-px cells.
    const fxRow = rowOf('RMMZ_TILE_48');
    for (const b of briefs.filter(x => /^ui_fx_/.test(x.id) || x.id === 'eq_cast_effect')) {
        const name = b.id.replace(/^ui_fx_/, 'fx_').replace(/^eq_cast_effect$/, 'fx_cast');
        const cands = [`img/characters/$UF_${name}.png`, `img/characters/!$UF_${name}.png`];
        const file = cands.find(f => ctx.exists('game/' + f)) || null;
        const e = entryBase(g, { category: 'EFFECT', band: ALL_BAND, type: name, sourceIds: { brief: [b.sourceId], ar: b.ars }, scaleRow: 'RMMZ_TILE_48', ramps: mapping.effects[b.id] || mapping.equipmentRamps.fx, frames: { cols: 3, rows: 4, facings: ['S', 'W', 'E', 'N'], rate: null }, runtime: { kind: 'RMMZ_CHARACTER', file, index: 0 }, references: worldRefs.slice(), status: file ? 'EXISTING_UNAPPROVED' : 'MISSING', statusWhy: file ? `game/${file} on disk; not Owner-approved` : 'no effect sheet on disk', alphaMode: 'BINARY', mapping: { scaleBasis: 'PROPOSED', rampBasis: 'PROPOSED', rule: 'RMMZ_ASSET_SPEC §7 single effect sheet 3 x 4 cells' } });
        if (fxRow) applySize(g, e, fxRow, 'GROUND');
        add(e);
    }

    // H. Ground kinds (A2) and water kinds (A1).
    const findGroundKey = kind => Object.keys(idx).find(k => /#\d+$/.test(k) && (idx[k].usedBy || []).some(u => u.startsWith(`ground kind ${kind} "`)));
    const findWaterKey = kind => Object.keys(idx).find(k => /#\d+$/.test(k) && (idx[k].usedBy || []).some(u => u === `water kind ${kind}` || u.startsWith(`water kind ${kind};`)));
    const surfaceBand = bandOfZ(g, 0);
    for (const gk of wc.groundKinds) {
        const key = findGroundKey(gk.id) || null;
        const st = statusFromIndex(key, null, inv, idx, stats);
        const ramps = mapping.terrains[gk.id];
        if (!ramps) stats.errors.push({ code: 'MAPPING_MISSING', id: 'groundKinds:' + gk.id, msg: 'terrain has no ramps in mapping.terrains' });
        const e = entryBase(g, { category: 'TERRAIN', band: surfaceBand, type: gk.id, variant: 'A2', sourceIds: { catalog: ['groundKinds:' + gk.id], assetIndex: key ? [key] : [], brief: briefIds(gk.id), ar: uniq(arsOfKey(key).concat(briefArs(gk.id)).concat(briefIds(gk.id).length ? [] : [])) }, scaleRow: 'RMMZ_AUTOTILE_A2', ramps: ramps || [], runtime: runtimeFromKey(key, idx, g), references: worldRefs.concat(['pack:BIOME']).concat(briefRefs(gk.id)), status: st.status, statusWhy: st.why, standardPending: 'DW.01.06', mapping: { scaleBasis: 'MATCH', rampBasis: 'PROPOSED', rule: 'mapping.terrains.' + gk.id } });
        const row = rowOf('RMMZ_AUTOTILE_A2');
        if (row) applySize(g, e, row, 'CENTER');
        add(e); reg('groundKinds:' + gk.id, e);
    }
    for (const [kind] of Object.entries(wc.water.surface)) {
        if (kind === 'about') continue;
        const key = findWaterKey(kind) || null;
        const st = statusFromIndex(key, null, inv, idx, stats);
        const row = rowOf('RMMZ_AUTOTILE_A1');
        const b = (briefsById.get(kind) || []).find(x => x.frameW);
        const e = entryBase(g, { category: 'WATER', band: surfaceBand, type: kind, variant: 'A1', sourceIds: { catalog: ['water:' + kind], assetIndex: key ? [key] : [], brief: briefIds(kind), ar: uniq(arsOfKey(key).concat(briefArs(kind))) }, scaleRow: 'RMMZ_AUTOTILE_A1', ramps: mapping.water[kind] || [], frames: { cols: b ? Math.round(b.deliverW / b.frameW) : 1, rows: 1, facings: ['S'], rate: null }, runtime: runtimeFromKey(key, idx, g), references: worldRefs.concat(['pack:BIOME']).concat(briefRefs(kind)), status: st.status, statusWhy: st.why, standardPending: 'DW.01.06', mapping: { scaleBasis: 'MATCH', rampBasis: 'PROPOSED', rule: 'mapping.water.' + kind } });
        if (row) applySize(g, e, row, 'CENTER');
        add(e); reg('water:' + kind, e);
    }

    // I. Vertical-world pieces from their AR rows (UF_Levels_* slots; legacy five-level engine).
    const levelDefs = [
        ['AR-1200', 'rock-solid', 'TOP', 'TERRAIN', 'RMMZ_AUTOTILE_A4', 0, ['HIGH_STONE_GRANITE', 'NEUT_VOID_BLACK']],
        ['AR-1200', 'rock-solid', 'SIDE', 'TERRAIN', 'RMMZ_AUTOTILE_A4', 1, ['HIGH_STONE_GRANITE'], ['AR-2100']],
        ['AR-1201', 'soil-solid', 'TOP', 'TERRAIN', 'RMMZ_AUTOTILE_A4', 0, ['TEMP_SOIL_LOAM', 'NEUT_VOID_BLACK']],
        ['AR-1201', 'soil-solid', 'SIDE', 'TERRAIN', 'RMMZ_AUTOTILE_A4', 1, ['TEMP_SOIL_LOAM'], ['AR-2101']],
        ['AR-1202', 'cave_floor', 'A2', 'TERRAIN', 'RMMZ_AUTOTILE_A2', 0, mapping.terrains.cave_floor, [], 'underground:cave_floor'],
        ['AR-1203', 'mined_stone', 'A2', 'TERRAIN', 'RMMZ_AUTOTILE_A2', 0, mapping.terrains.mined_stone, [], 'underground:mined_stone'],
        ['AR-1203', 'mined_soil', 'A2', 'TERRAIN', 'RMMZ_AUTOTILE_A2', 1, mapping.terrains.mined_soil, [], 'underground:mined_soil'],
        ['AR-1204', 'deck-wood', 'A2', 'TERRAIN', 'RMMZ_AUTOTILE_A2', 0, ['CONSTRUCT_TIMBER_FRESH']],
        ['AR-1205', 'deck-stone', 'A2', 'TERRAIN', 'RMMZ_AUTOTILE_A2', 0, ['CONSTRUCT_STONE_DRESSED']],
        ['AR-1206', 'open-air', 'A2', 'TERRAIN', 'RMMZ_AUTOTILE_A2', 0, ['NEUT_VOID_BLACK']],
        ['AR-1207', 'hole-edge', 'A2', 'TERRAIN', 'RMMZ_AUTOTILE_A2', 0, ['NEUT_VOID_BLACK', 'NEUT_WARM_GRAY']],
        ['AR-1219', 'roof-marker', 'A2', 'TERRAIN', 'RMMZ_AUTOTILE_A2', 0, ['CONSTRUCT_TIMBER_AGED']],
        ['AR-1208', 'stairs-up', 'V1', 'CONNECTOR', 'ARCH_STAIR_RAMP', 0, null],
        ['AR-1209', 'stairs-down', 'V1', 'CONNECTOR', 'ARCH_STAIR_RAMP', 0, null],
        ['AR-1210', 'stairs-both', 'V1', 'CONNECTOR', 'ARCH_STAIR_RAMP', 0, null],
        ['AR-1211', 'ramp-up', 'V1', 'CONNECTOR', 'ARCH_STAIR_RAMP', 0, null, ['AR-2102']],
        ['AR-1212', 'ramp-down', 'V1', 'CONNECTOR', 'ARCH_STAIR_RAMP', 0, null],
        ['AR-1213', 'ladder-foot', 'V1', 'CONNECTOR', 'ARCH_STAIR_RAMP', 0, null],
        ['AR-1213', 'ladder-top', 'V1', 'CONNECTOR', 'ARCH_STAIR_RAMP', 1, null],
        ['AR-1214', 'vein-iron', 'OVERLAY', 'VEIN', 'RMMZ_TILE_48', 0, ['CONSTRUCT_METAL_IRON', 'NEUT_WARM_GRAY']],
        ['AR-1215', 'vein-copper', 'OVERLAY', 'VEIN', 'RMMZ_TILE_48', 0, ['NEUT_WARM_GRAY']],
        ['AR-1216', 'vein-gold', 'OVERLAY', 'VEIN', 'RMMZ_TILE_48', 0, ['NEUT_WARM_GRAY', 'NEUT_PALE_CREST']],
        ['AR-1217', 'vein-gems', 'OVERLAY', 'VEIN', 'RMMZ_TILE_48', 0, ['MAGIC_ARCANE_CYAN']],
        ['AR-1218', 'pool-underground', 'A1', 'WATER', 'RMMZ_AUTOTILE_A1', 0, ['WATER_DEEP_FRESH']],
    ];
    const connectorBases = [];
    // The slot (sheet and kind/tile number) is read from the AR row's own text, never typed here.
    const slotsOfAr = title => { const out = []; const re = /\b(kind|tiles?)\s+(\d+)(?:\s+and\s+(\d+))?/g; let m; while ((m = re.exec(title))) { const w = m[1].replace(/s$/, ''); out.push(`${w} ${m[2]}`); if (m[3]) out.push(`${w} ${m[3]}`); } return out; };
    for (const [ar, type, variant, cat, rowId, slotIndex, ramps, moreArs, catalogId] of levelDefs) {
        const req = requests.find(r => r.id === ar);
        if (!req) { stats.errors.push({ code: 'AR_MISSING', id: ar, msg: `${ar} not found in ${SRC.requests}` }); continue; }
        const sheetM = /`(UF_Levels_[A-Z\d]+)\.png`/.exec(req.title);
        const slotText = slotsOfAr(req.title)[slotIndex];
        if (!sheetM || !slotText) { stats.errors.push({ code: 'AR_MISSING', id: ar, msg: `${ar} names no UF_Levels sheet or slot ${slotIndex}` }); continue; }
        const sheet = sheetM[1];
        const row = rowOf(rowId);
        const e = entryBase(g, { category: cat, band: ALL_BAND, type, variant, sourceIds: { ar: [ar].concat(moreArs || []), catalog: catalogId ? [catalogId] : [] }, scaleRow: rowId, ramps: ramps || mapping.addendum.CONNECTOR, frames: { cols: cat === 'WATER' ? 3 : 1, rows: 1, facings: ['S'], rate: null }, runtime: { kind: 'RMMZ_TILESET', file: `img/tilesets/${sheet}.png`, tileId: null, slotText }, references: worldRefs.slice(), status: /stock/i.test(req.statusText) ? 'STOCK' : 'MISSING', statusWhy: `${ar} ${req.status} (${SRC.requests}:${req.line}): ${req.statusText.replace(/\s+/g, ' ').slice(0, 140)}`, standardPending: cat === 'TERRAIN' || cat === 'WATER' ? 'DW.01.06' : null, alphaMode: cat === 'VEIN' || type === 'hole-edge' ? 'OWNER_OPEN' : 'BINARY', mapping: { scaleBasis: rowId === 'ARCH_STAIR_RAMP' ? 'MATCH' : 'MATCH', rampBasis: 'PROPOSED', rule: `${ar} slot ${sheet} ${slotText}` } });
        if (row) applySize(g, e, row, cat === 'CONNECTOR' ? 'GROUND' : 'CENTER');
        add(e);
        if (catalogId) reg(catalogId, e);
        if (cat === 'CONNECTOR') connectorBases.push(e);
    }

    // J. Manifest-only pieces (not in the WorldCatalog).
    for (const r of manifest.filter(x => x.newEntry)) {
        const row = rowOf(r.newEntry.scaleRow);
        const file = r.sheet.replace(/^img\//, 'img/');
        const exists = ctx.exists('game/' + file);
        const e = entryBase(g, { category: r.newEntry.category, band: r.newEntry.band, type: r.newEntry.type, variant: r.newEntry.variant || 'V1', sourceIds: { manifest: [r.id], ar: r.newEntry.ars || [] }, scaleRow: r.newEntry.scaleRow, ramps: r.newEntry.ramps, runtime: { kind: /tilesets/.test(file) ? 'RMMZ_TILESET' : 'RMMZ_CHARACTER', file, index: null, grid: r.grid }, references: worldRefs.slice(), status: /stock/.test(r.promptVer) ? 'STOCK' : exists ? 'EXISTING_UNAPPROVED' : 'MISSING', statusWhy: `${SRC.manifest}:${r.line} (${r.sheet} ${r.grid}, prompt ${r.promptVer}); ${exists ? 'file on disk' : 'file not on disk'}`, mapping: { scaleBasis: r.newEntry.scaleBasis, rampBasis: 'PROPOSED', rule: 'manifest row ' + r.id } });
        if (row) applySize(g, e, row, anchorFromRow(row));
        add(e);
    }

    return { entries, byCatalog, bodyIds, connectorBases, eqList, items, species, peopleKeys };
}

// Manifest rows: which map onto WorldCatalog entries and which are pieces of their own.
function classifyManifest(manifest, g) {
    const under = bandOfZ(g, -1);
    const toCatalog = { chest_wood: 'objects:chest_wood', obj_campfire: 'objects:campfire', obj_campfire_lit: 'objects:campfire', item_stone_granite: 'items:stone', item_stone_sandstone: 'items:stone', item_log_pine: 'items:log', item_log_oak: 'items:log' };
    for (const r of manifest) {
        if (toCatalog[r.id]) {
            r.mapTo = toCatalog[r.id].replace(/^objects:/, '');
            if (r.id === 'obj_campfire_lit' || r.id === 'obj_campfire') r.state = 'LIT';
            if (toCatalog[r.id].startsWith('items:')) r.mapTo = toCatalog[r.id];
            continue;
        }
        const band = r.zext === 'all' ? ALL_BAND : /^-/.test(r.zext) ? under : ALL_BAND;
        const isA4 = /_A4\.png$/.test(r.sheet);
        r.newEntry = {
            category: r.category === 'Architecture' ? 'STRUCTURE' : 'TERRAIN', band,
            type: r.id.replace(/_/g, '-'),
            scaleRow: isA4 ? 'RMMZ_AUTOTILE_A4' : 'ARCH_WALL_2GRID', scaleBasis: isA4 ? 'MATCH' : 'MATCH',
            ramps: /limestone/.test(r.material) ? ['TEMP_STONE_LIMESTONE', 'NEUT_VOID_BLACK'] : /granite/.test(r.material) ? ['HIGH_STONE_GRANITE', 'NEUT_VOID_BLACK'] : /pine|oak|wood/.test(r.material) ? ['CONSTRUCT_TIMBER_FRESH', 'NEUT_VOID_BLACK'] : ['NEUT_WARM_GRAY'],
            ars: r.id === 'rock_strata_solid' ? ['AR-1200'] : [],
        };
    }
}

// Owner addendum families, per band.
function buildAddendum(S, base) {
    const { g, mapping, wc, stats, rowById } = S;
    const out = [];
    const T = g.tilePx;
    const bands = bandIds(g);
    const row = id => { const r = rowById.get(id); if (!r) stats.errors.push({ code: 'SCALEROW_UNKNOWN', id, msg: `scale row ${id} missing` }); return r; };
    const fam = id => 'ADD-' + id;
    const derive = (b, e, cat) => {
        const d = JSON.parse(JSON.stringify(e));
        d.id = makeId(b, e.biome, cat || e.category, e.id.split('_')[3], e.id.split('_')[4], e.id.split('_')[5]);
        d.band = b; [d.zMin, d.zMax] = bandRange(g, b);
        if (cat) { d.category = cat; d.groupType = CATEGORY_GROUP[cat]; }
        d.slot = null;
        d.variants = { derivedFrom: e.id, flipH: false, flipV: false, rot: 0, paletteSwap: 'DEPTH_' + b, lightingSafe: false };
        d.runtime = { kind: e.runtime.kind, file: null, index: null };
        d.status = 'MISSING';
        d.statusWhy = `DEPTH_${b} recolour at export (placeholder palette, OWNER_OPEN); no paint slot`;
        d.family = cat === 'LIGHT' ? 'LIGHT' : e.family;
        d.sourceIds = Object.assign({}, e.sourceIds, { addendum: uniq(e.sourceIds.addendum.concat([fam('DEPTH')].concat(cat === 'LIGHT' ? [fam('LIGHT')] : []))).sort(sortStr) });
        return d;
    };
    // Terrain list: WorldCatalog groundKinds (surface) + the undergroundBiomes ground kinds.
    const terrains = wc.groundKinds.map(x => ({ id: x.id, home: bandOfZ(g, 0), cat: 'groundKinds:' + x.id }))
        .concat(uniq(Object.values(wc.undergroundBiomes).map(v => v.ground)).sort(sortStr).map(id => ({ id, home: bandOfZ(g, -1) === bandOfZ(g, -2) ? bandOfZ(g, -1) : bandOfZ(g, -1), cat: 'underground:' + id })));
    const tp = (p) => entryBase(g, p);
    for (const t of terrains) {
        const ramps = mapping.terrains[t.id] || [];
        if (!mapping.terrains[t.id]) stats.errors.push({ code: 'MAPPING_MISSING', id: t.cat, msg: 'terrain has no ramps in mapping.terrains' });
        const mk = (category, type, variant, rowId, anchor, family, geometryDerived, extra) => {
            const e = tp(Object.assign({ category, band: t.home, type, variant, sourceIds: { catalog: [t.cat], addendum: [fam(family)] }, scaleRow: rowId, ramps, references: ['pack:WORLD', 'pack:BIOME'], status: 'MISSING', statusWhy: `${family} placeholder (Owner addendum); no art`, family, geometryDerived, standardPending: 'DW.01.06', mapping: { scaleBasis: 'MATCH', rampBasis: 'PROPOSED', rule: 'geometry + mapping.terrains.' + t.id } }, extra || {}));
            const r = row(rowId); if (r) applySize(g, e, r, anchor);
            out.push(e);
            for (const b of bands) if (b !== t.home) out.push(derive(b, e));
        };
        mk('TOP', t.id, 'V1', 'GEOM_TILE', 'CENTER', 'TOP', null, { standardPending: null });
        for (const f of g.facings) {
            for (let k = 1; k <= g.strataPerLayer; k++) mk('EDGE', t.id, `${f}-H${k}`, 'GEOM_STRATUM_' + k, 'WALL', 'EDGE', { rule: 'STRATA_WINDOW', strata: k });
            mk('EDGE', t.id, `${f}-FULL`, 'GEOM_LAYER_FACE', 'WALL', 'EDGE', { rule: 'LAYER_FACE', strata: g.strataPerLayer });
        }
        for (const d of g.facings) for (let k = 1; k <= g.strataPerLayer; k++) mk('RAMP', t.id, `${d}-C${k}`, 'GEOM_RAMP_' + k, 'GROUND', 'RAMP', { rule: 'RAMP_CELL', strata: k });
        for (const f of g.facings) for (let k = 1; k <= g.strataPerLayer; k++) mk('RAMPSIDE', t.id, `${f}-H${k}`, 'GEOM_STRATUM_' + k, 'WALL', 'RAMPSIDE', { rule: 'STRATA_WINDOW', strata: k });
    }
    // Stair / ladder / ramp connectors: the AR-mapped bases (band ALL) recoloured per band.
    for (const c of base.connectorBases) {
        c.sourceIds.addendum = uniq(c.sourceIds.addendum.concat([fam('CONNECTOR')])).sort(sortStr);
        c.family = 'CONNECTOR';
        for (const b of bands) out.push(derive(b, c));
    }
    // Light sources (mapping.lightSources) recoloured per band.
    for (const ls of (mapping.lightSources || [])) {
        const src = base.byCatalog.get('objects:' + ls.object);
        if (!src) { stats.errors.push({ code: 'MAPPING_MISSING', id: ls.object, msg: 'light source object not found' }); continue; }
        const e = src[src.length - 1];
        for (const b of bands) out.push(derive(b, e, 'LIGHT'));
    }
    // Painted per band.
    const walls = wc.objects.filter(o => (o.tags || []).includes('wall')).map(o => o.id);
    for (const b of bands) {
        const pb = (category, type, variant, state, rowId, anchor, family, extra) => {
            const e = tp(Object.assign({ category, band: b, type, variant, state, sourceIds: { addendum: [fam(family)] }, scaleRow: rowId, ramps: mapping.addendum[family] || [], references: ['pack:WORLD'], status: 'MISSING', statusWhy: `${family} placeholder (Owner addendum); no art`, family, mapping: { scaleBasis: 'PROPOSED', rampBasis: 'PROPOSED', rule: 'addendum ' + family } }, extra || {}));
            const r = row(rowId); if (r) applySize(g, e, r, anchor, extra && extra.sizeOpts);
            out.push(e); return e;
        };
        for (let k = 1; k <= g.strataPerLayer; k++) pb('SHADE', 'height', `H${k}`, 'DEFAULT', 'GEOM_TILE', 'CENTER', 'SHADE', { alphaMode: 'OWNER_OPEN', notes: `height-shading overlay for ${k} strata of ground height` });
        for (let k = 1; k <= g.strataPerLayer; k++) pb('WALLFACE', 'opening', `H${k}`, 'DEFAULT', 'GEOM_STRATUM_' + k, 'WALL', 'WALLFACE', { geometryDerived: { rule: 'STRATA_WINDOW', strata: k } });
        pb('WALLFACE', 'opening', 'FULL', 'DEFAULT', 'GEOM_LAYER_FACE', 'WALL', 'WALLFACE', { geometryDerived: { rule: 'LAYER_FACE', strata: g.strataPerLayer } });
        for (const f of g.facings) pb('RIMSHADOW', 'rim', f, 'DEFAULT', 'GEOM_TILE', 'CENTER', 'RIMSHADOW', { standardPending: 'DW.01.06', alphaMode: 'OWNER_OPEN' });
        for (const w of walls) for (const s of DECAY_STAGES) {
            const src = base.byCatalog.get('objects:' + w);
            pb('DECAY', w, s, 'OVERLAY', 'ARCH_WALL_2GRID', 'GROUND', 'DECAY', { ramps: mapping.addendum.DECAY[s], sourceIds: { addendum: [fam('DECAY')], catalog: ['objects:' + w] }, notes: `decay overlay for ${src ? src[0].id : w}; overlays preferred over full tiles (§7)` });
        }
        for (const k of HANGING_KINDS) pb('HANGING', k, 'V1', 'DEFAULT', 'GEOM_LAYER_FACE', 'CEILING', 'HANGING', { ramps: mapping.addendum.HANGING[k], frames: { cols: k === 'WATERFALL' ? 3 : 1, rows: 1, facings: ['S'], rate: null }, alphaMode: k === 'DUST' || k === 'LIGHT-SHAFT' ? 'OWNER_OPEN' : 'BINARY', geometryDerived: { rule: 'LAYER_FACE', strata: g.strataPerLayer }, sourceIds: { addendum: [fam('HANGING')], ar: k === 'ROOTS' ? ['AR-1904'] : k === 'STALACTITES' ? ['AR-1903'] : [] } });
        const sizeOf = { TINY: 'Tiny', SMALL: 'Small', MEDIUM: 'Medium', LARGE_TALL: 'Large', LARGE_LONG: 'Large' };
        const classes = Object.entries(g.frameClasses).filter(([, fc]) => fc.frame).map(([c]) => c);
        if (g.optionalParams.TALL_MEDIUM.enabled) classes.push('TALL_MEDIUM');
        for (const c of classes) {
            const fc = c === 'TALL_MEDIUM' ? { footprintSq: [1, 1] } : g.frameClasses[c];
            pb('CREATURE', 'frame-' + c, 'V1', 'DEFAULT', 'GEOM_FRAME_' + c, 'GROUND', 'FRAMECLASS', { sizeClass: sizeOf[c] || 'Medium', frameClass: c, frames: { cols: 3, rows: 4, facings: ['S', 'W', 'E', 'N'], rate: null }, ownerOpen: true, ramps: mapping.addendum.FRAMECLASS, statusWhy: `generic ${c} creature frame slot for band-native creatures (which ones: OWNER_OPEN)`, sizeOpts: { footprint: { w: fc.footprintSq[0], h: fc.footprintSq[1] } } });
        }
    }
    return { entries: out, terrains };
}

// ---------------------------------------------------------------- packing
function pack(g, entries, stats) {
    const T = g.tilePx;
    const W = Math.floor(g.atlasMaxPx / T) * T;
    const H = W;
    const withSlot = entries.filter(e => !e.variants.derivedFrom && e.envelope && e.frames && !(e.family === 'SOURCE' && e.scaleRow === null));
    for (const e of withSlot) {
        const cw = ceilTo(e.envelope.wMax, T), ch = ceilTo(e.envelope.hMax, T);
        e._w = cw * e.frames.cols; e._h = ch * e.frames.rows;
    }
    const key = e => [e.band, e.biome, e.groupType, e.category, e.id];
    withSlot.sort((a, b) => { const ka = key(a), kb = key(b); for (let i = 0; i < ka.length; i++) { const c = sortStr(ka[i], kb[i]); if (c) return c; } return 0; });
    const groups = new Map();
    for (const e of withSlot) { const k = `${e.band}|${e.biome}|${e.groupType}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e); }
    const sheets = [];
    for (const [k, list] of groups) {
        const [band, biome, type] = k.split('|');
        let n = 0, sheet = null, x = 0, y = 0, shelfH = 0, idx = 0;
        const open = () => { n++; sheet = { sheetId: `ATLAS_${band}_${biome}_${type}_${String(n).padStart(2, '0')}`, kind: 'ATLAS', group: { band, biome, type }, w: 0, h: 0, gridPx: T, runtimeFile: null }; sheets.push(sheet); x = 0; y = 0; shelfH = 0; idx = 0; };
        open();
        for (const e of list) {
            if (e._w > W || e._h > H) { stats.errors.push({ code: 'SHEET_TOO_LARGE', id: e.id, msg: `slot ${e._w}x${e._h} does not fit an atlas of ${W}px` }); continue; }
            if (x + e._w > W) { y += shelfH; x = 0; shelfH = 0; }
            if (y + e._h > H) { open(); }
            idx++;
            e.slot = { sheetId: sheet.sheetId, slotId: `${sheet.sheetId}:${String(idx).padStart(4, '0')}`, x, y, w: e._w, h: e._h };
            x += e._w; shelfH = Math.max(shelfH, e._h);
            sheet.w = Math.max(sheet.w, x); sheet.h = Math.max(sheet.h, y + shelfH);
        }
    }
    for (const e of withSlot) { delete e._w; delete e._h; }
    return sheets;
}

function runtimeSheets(g, entries, rmmz, stats) {
    const T = g.tilePx;
    const out = new Map();
    for (const e of entries) {
        const r = e.runtime;
        if (!r || !r.file || e.variants.derivedFrom) continue;
        if (r.kind === 'RMMZ_TILESET') {
            const m = /_(A1|A2|A3|A4|A5|B|C|D|E)\.png$/.exec(r.file);
            const spec = m ? rmmz.sheets[m[1]] : null;
            if (!spec) { stats.errors.push({ code: 'RMMZ_SIZE', id: e.id, msg: `no RMMZ sheet size for ${r.file}` }); continue; }
            if (!out.has(r.file)) out.set(r.file, { sheetId: 'RMMZ_' + idField(path.basename(r.file, '.png')), kind: 'RMMZ_TILESET', group: { band: ALL_BAND, biome: SHARED, type: m[1] }, w: spec.w, h: spec.h, gridPx: T, runtimeFile: r.file });
        } else if (r.kind === 'RMMZ_CHARACTER') {
            if (!e.envelope) continue;
            const cw = ceilTo(e.envelope.wMax, T), ch = ceilTo(e.envelope.hMax, T);
            const s = { sheetId: 'RMMZ_' + idField(path.basename(r.file, '.png')), kind: 'RMMZ_CHARACTER', group: { band: ALL_BAND, biome: SHARED, type: 'CHARACTER' }, w: cw * 3, h: ch * 4, gridPx: T, runtimeFile: r.file };
            const prev = out.get(r.file);
            if (prev && (prev.w !== s.w || prev.h !== s.h)) { prev.w = Math.max(prev.w, s.w); prev.h = Math.max(prev.h, s.h); }
            else if (!prev) out.set(r.file, s);
        }
    }
    return Array.from(out.values());
}

// ---------------------------------------------------------------- validation (the FAIL rules)
// Every rule has a code. `disabled` switches one rule off (the provocation mechanism of the tests).
function validateCatalogue(cat, ctx) {
    const errors = [];
    const off = new Set(ctx.disabled || []);
    const err = (code, id, msg) => { if (!off.has(code)) errors.push({ code, id, msg }); };
    const g = ctx.geometry;
    const T = g.tilePx;
    const rows = ctx.rows; // Map rowId -> row (scale chart + race rows)
    const ramps = ctx.rampIds;
    const ids = new Set(), slotIds = new Set();
    const byId = new Map(cat.entries.map(e => [e.id, e]));
    for (const e of cat.entries) {
        if (ids.has(e.id)) err('DUP_ID', e.id, 'duplicate entry id');
        ids.add(e.id);
        const derived = !!(e.variants && e.variants.derivedFrom);
        const noFrame = e.frameClass && g.frameClasses[e.frameClass] && !g.frameClasses[e.frameClass].frame;
        if (!noFrame) {
            if (!e.envelope) err('MISSING_FIELD', e.id, 'missing envelope');
            if (!e.footprint) err('MISSING_FIELD', e.id, 'missing footprint');
            if (!e.anchor) err('MISSING_FIELD', e.id, 'missing anchor');
            if (!e.frames || !(e.frames.cols >= 1) || !(e.frames.rows >= 1)) err('MISSING_FIELD', e.id, 'missing size (frames)');
        }
        if (!Array.isArray(e.paletteRampIds) || !e.paletteRampIds.length) err('MISSING_FIELD', e.id, 'missing palette ramp');
        for (const r of e.paletteRampIds || []) if (!ramps.has(r)) err('RAMP_UNKNOWN', e.id, `ramp ${r} is not in the palette registry`);
        const row = e.scaleRow ? rows.get(e.scaleRow) : null;
        if (!noFrame && !row) err('SCALEROW_UNKNOWN', e.id, `scaleRow ${e.scaleRow} is not in scale_chart.json or size_classes.json`);
        if (row && e.envelope) {
            const v = e.envelope;
            const inside = (lo, x, hi) => x >= lo && x <= hi;
            if (!(inside(row.wMin, v.wMin, row.wMax) && inside(row.wMin, v.wTarget, row.wMax) && inside(row.wMin, v.wMax, row.wMax) && inside(row.hMin, v.hMin, row.hMax) && inside(row.hMin, v.hTarget, row.hMax) && inside(row.hMin, v.hMax, row.hMax))) err('SIZE_OUTSIDE_ROW', e.id, `envelope outside ${e.scaleRow} min/max`);
        }
        if (e.zMin < g.zMin || e.zMax > g.zMax || e.zMin > e.zMax || !Number.isInteger(e.zMin) || !Number.isInteger(e.zMax)) err('Z_OUT_OF_RANGE', e.id, `z ${e.zMin}..${e.zMax} outside ${g.zMin}..${g.zMax}`);
        const traced = SOURCE_KINDS.some(k => (e.sourceIds[k] || []).length);
        if (!traced) err('NO_SOURCE', e.id, 'entry traces to no source');
        if (derived) {
            const b = byId.get(e.variants.derivedFrom);
            if (!b) err('DERIVED_BAD_BASE', e.id, `derivedFrom ${e.variants.derivedFrom} is missing`);
            else if (b.variants && b.variants.derivedFrom) err('DERIVED_BAD_BASE', e.id, `derivedFrom ${b.id} is itself derived`);
            if (e.slot) err('VARIANT_HAS_SLOT', e.id, 'a variant row owns a paint slot');
        }
        if (e.slot) {
            if (slotIds.has(e.slot.slotId)) err('DUP_SLOT', e.id, `duplicate slotId ${e.slot.slotId}`);
            slotIds.add(e.slot.slotId);
            if (e.envelope && e.frames) {
                const cw = e.slot.w / e.frames.cols, ch = e.slot.h / e.frames.rows;
                if (cw < e.envelope.wMax || ch < e.envelope.hMax) err('SLOT_TOO_SMALL', e.id, `slot cell ${cw}x${ch} is smaller than the envelope ${e.envelope.wMax}x${e.envelope.hMax}`);
            }
            if ([e.slot.x, e.slot.y, e.slot.w, e.slot.h].some(v => !Number.isInteger(v) || v % T !== 0) || e.slot.w <= 0 || e.slot.h <= 0) err('SLOT_OFF_GRID', e.id, `slot ${e.slot.x},${e.slot.y} ${e.slot.w}x${e.slot.h} is off the ${T} grid`);
        } else if (!derived && !noFrame && e.envelope) {
            err('SLOT_MISSING', e.id, 'a non-variant row with a size has no paint slot');
        }
        // Geometry-derived heights must be recomputed from stratumPx / layerPx.
        if (['EDGE', 'RAMP', 'RAMPSIDE', 'WALLFACE', 'HANGING'].includes(e.category) && !derived) {
            const gd = e.geometryDerived;
            let want = null;
            if (!gd) err('GEOM_HEIGHT', e.id, 'geometry piece without geometryDerived');
            else if (gd.rule === 'STRATA_WINDOW') want = strataWindow(g, gd.strata);
            else if (gd.rule === 'LAYER_FACE') want = { min: g.layerPx, target: g.layerPx, max: g.layerPx };
            else if (gd.rule === 'RAMP_CELL') { const w = strataWindow(g, gd.strata); want = { min: T + w.min, target: T + w.target, max: T + w.max }; }
            else err('GEOM_HEIGHT', e.id, `unknown geometry rule ${gd.rule}`);
            if (want && e.envelope && (e.envelope.hMin !== want.min || e.envelope.hTarget !== want.target || e.envelope.hMax !== want.max)) err('GEOM_HEIGHT', e.id, `height ${e.envelope.hMin}/${e.envelope.hTarget}/${e.envelope.hMax} is not ${want.min}/${want.target}/${want.max} from stratumPx/layerPx`);
            if (want && e.slot && e.frames && e.slot.h !== ceilTo(want.max, T) * e.frames.rows) err('GEOM_HEIGHT', e.id, `slot height ${e.slot.h} is not computed from geometry (${ceilTo(want.max, T) * e.frames.rows})`);
        }
        if (e.paperDoll) {
            const b = byId.get(e.paperDoll.bodyType);
            if (!b) err('PAPERDOLL_MISMATCH', e.id, `bodyType ${e.paperDoll.bodyType} is missing`);
            else {
                const fl = x => JSON.stringify([x.frames.cols, x.frames.rows, x.frames.facings]);
                if (fl(b) !== fl(e)) err('PAPERDOLL_MISMATCH', e.id, `frame layout ${fl(e)} differs from ${b.id} ${fl(b)}`);
                if (!b.anchor || !e.anchor || b.anchor.type !== e.anchor.type || b.anchor.x !== e.anchor.x || b.anchor.y !== e.anchor.y) err('PAPERDOLL_MISMATCH', e.id, `anchor differs from ${b.id}`);
            }
        }
    }
    // Sheets.
    const sheetById = new Map();
    for (const s of cat.sheets) {
        if (sheetById.has(s.sheetId)) err('DUP_SHEET', s.sheetId, 'duplicate sheetId');
        sheetById.set(s.sheetId, s);
        if (s.kind === 'ATLAS') {
            if (s.w > g.atlasMaxPx || s.h > g.atlasMaxPx) err('SHEET_TOO_LARGE', s.sheetId, `atlas ${s.w}x${s.h} is over ${g.atlasMaxPx}`);
            if (s.w % T !== 0 || s.h % T !== 0 || s.w <= 0 || s.h <= 0) err('SHEET_NOT_GRID', s.sheetId, `atlas ${s.w}x${s.h} is not a multiple of ${T}`);
        } else if (s.kind === 'RMMZ_TILESET') {
            const spec = ctx.rmmzSheets[s.group.type];
            if (!spec || spec.w !== s.w || spec.h !== s.h) err('RMMZ_SIZE', s.sheetId, `tileset ${s.w}x${s.h} is not the RMMZ size for ${s.group.type}`);
        } else if (s.kind === 'RMMZ_CHARACTER') {
            if (s.w % 3 !== 0 || s.h % 4 !== 0) err('RMMZ_SIZE', s.sheetId, `character sheet ${s.w}x${s.h} is not 3 x 4 frames`);
        } else err('SHEET_KIND', s.sheetId, `unknown kind ${s.kind}`);
    }
    // Slots inside their sheet; no overlaps.
    const perSheet = new Map();
    for (const e of cat.entries) {
        if (!e.slot) continue;
        const s = sheetById.get(e.slot.sheetId);
        if (!s) { err('SLOT_OUTSIDE_SHEET', e.id, `sheet ${e.slot.sheetId} does not exist`); continue; }
        if (e.slot.x < 0 || e.slot.y < 0 || e.slot.x + e.slot.w > s.w || e.slot.y + e.slot.h > s.h) err('SLOT_OUTSIDE_SHEET', e.id, `slot leaves ${s.sheetId} (${s.w}x${s.h})`);
        if (!perSheet.has(s.sheetId)) perSheet.set(s.sheetId, []);
        perSheet.get(s.sheetId).push(e);
    }
    for (const [sid, list] of perSheet) {
        const sorted = list.slice().sort((a, b) => a.slot.y - b.slot.y || a.slot.x - b.slot.x);
        for (let i = 0; i < sorted.length; i++) {
            const a = sorted[i].slot;
            for (let j = i + 1; j < sorted.length; j++) {
                const b = sorted[j].slot;
                if (b.y >= a.y + a.h) break;
                if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) err('SLOT_OVERLAP', sorted[j].id, `overlaps ${sorted[i].id} in ${sid}`);
            }
        }
    }
    // Every source id maps to an entry or to outOfScope with a reason.
    const covered = new Map(SOURCE_KINDS.map(k => [k, new Set()]));
    for (const e of cat.entries) for (const k of SOURCE_KINDS) for (const id of e.sourceIds[k] || []) covered.get(k).add(id);
    const oos = new Map();
    for (const o of cat.outOfScope) {
        if (!o.reason || !String(o.reason).trim()) err('OOS_NO_REASON', o.sourceId, 'outOfScope row without a reason');
        oos.set(o.kind + '\u0000' + o.sourceId, o);
    }
    for (const k of SOURCE_KINDS) {
        for (const id of (cat.sourceIdIndex && cat.sourceIdIndex[k]) || []) {
            if (!covered.get(k).has(id) && !oos.has(k + '\u0000' + id)) err('SOURCE_DROPPED', id, `${k} source id ${JSON.stringify(id)} maps to no entry and has no outOfScope reason`);
        }
    }
    for (const e of cat.entries) for (const k of SOURCE_KINDS) for (const id of e.sourceIds[k] || []) {
        if (cat.sourceIdIndex && !(cat.sourceIdIndex[k] || []).includes(id)) err('NO_SOURCE', e.id, `${k} source id ${JSON.stringify(id)} is not a known source id`);
    }
    return errors;
}

// ---------------------------------------------------------------- source ids and out of scope
function collectSourceIds(S, base) {
    const { wc, idx, briefs, requests, manifest, matrix } = S;
    const ix = {};
    const objIds = wc.objects.map(o => 'objects:' + o.id);
    const itemIds = base.items.map(i => 'items:' + i.id);
    const wild = base.species.map(s => 'wildlife:' + s.id);
    const people = base.peopleKeys.map(p => 'people:' + p);
    const ground = wc.groundKinds.map(x => 'groundKinds:' + x.id);
    const water = Object.keys(wc.water.surface).filter(k => k !== 'about').map(k => 'water:' + k);
    const faces = Object.keys(wc.faces.cultures).map(k => 'faces:' + k);
    const facesSp = Object.keys(wc.faces.species || {}).map(k => 'faces:species:' + k);
    const skins = Object.keys(wc.skins.cultures).map(k => 'skins:' + k);
    const under = uniq(Object.values(wc.undergroundBiomes).map(v => v.ground)).map(k => 'underground:' + k);
    ix.catalog = uniq([].concat(objIds, itemIds, wild, people, ground, water, faces, facesSp, skins, under)).sort(sortStr);
    ix.assetIndex = Object.keys(idx).sort(sortStr);
    ix.brief = uniq(briefs.map(b => b.sourceId)).sort(sortStr);
    ix.ar = uniq(requests.map(r => r.id)).sort(sortStr);
    ix.manifest = manifest.map(r => r.id).sort(sortStr);
    ix.matrix = matrix.packages.map(p => p.id).sort(sortStr);
    ix.addendum = FAMILIES.map(f => 'ADD-' + f.id).sort(sortStr);
    return ix;
}

function outOfScopeRows(S, cat, ix) {
    const { idx, briefs, requests, matrix, g, wc, biomeReg } = S;
    const out = [];
    const covered = new Map(SOURCE_KINDS.map(k => [k, new Set()]));
    for (const e of cat.entries) for (const k of SOURCE_KINDS) for (const id of e.sourceIds[k] || []) covered.get(k).add(id);
    const add = (kind, sourceId, reason) => { if (!covered.get(kind).has(sourceId)) out.push({ sourceId, kind, reason }); };
    // WorldCatalog lists that are interface art or fallbacks.
    for (const id of ix.catalog) {
        if (id.startsWith('skins:')) add('catalog', id, 'window skin (interface art): no scale-chart or RMMZ_SPEC world size row covers UI; UI is sized by its own brief layout (Owner question Q-UI)');
        if (id === 'faces:default') add('catalog', id, 'fallback rule for cultures without a face sheet (code-drawn frame, UF_WorldCatalog faces.cultures.default); no sheet of its own');
    }
    for (const k of ix.assetIndex) {
        const v = idx[k];
        if (/^U7_|^\$U7_/.test(k) || /U7_/.test(v.file)) add('assetIndex', k, `U7 stand-in named only by legacy RMMZ editor data (${v.usedBy.join('; ').slice(0, 80)}); VISION V9 replaces it with stock art; not a catalogue slot`);
        else if (v.category === 'ui') add('assetIndex', k, 'RMMZ system/interface file (UI); interface art is outside the world catalogue (Owner question Q-UI)');
        else if (v.category === 'generated') add('assetIndex', k, 'code-drawn generator placeholder (plugin), not an art slot');
        else if (/^[A-Za-z0-9_]+$/.test(k) && /tilesets/.test(v.file)) add('assetIndex', k, 'whole-tileset key; its tiles are catalogued per tile id and the sheet is listed in sheets[] as an RMMZ runtime sheet');
    }
    for (const b of briefs) {
        if (/^ui_/.test(b.id) && !/^ui_fx_/.test(b.id)) add('brief', b.sourceId, `interface brief (${b.file}:${b.line}); UI is outside the world catalogue (Owner question Q-UI)`);
        if (b.id === 'eq_work_animations' || b.id === 'eq_attack_animations') add('brief', b.sourceId, `pose-contract proof sheet (${b.file}:${b.line}: "the proof is not loaded"); it fixes hand positions for the body and layer slots, it is not a runtime slot`);
    }
    const uiAr = /window skin|menu theme|cursor|look panel|selection marker|stance rings?|designation marker|core ui|character-sheet ui/i;
    for (const r of requests) {
        if (r.withdrawn) add('ar', r.id, `WITHDRAWN (${SRC.requests}:${r.line})`);
        else if (uiAr.test(r.title)) add('ar', r.id, `interface request (${SRC.requests}:${r.line}); UI is outside the world catalogue (Owner question Q-UI)`);
        else if (!r.open) add('ar', r.id, `closed request (${r.status}, ${SRC.requests}:${r.line}); its assets are catalogued through their catalog, AssetIndex and brief ids`);
    }
    const canon = biomeReg.canonicalBiomes;
    for (const p of matrix.packages) {
        const z = +String(p.zLevel).replace(/^Z/, '').replace('+', '');
        const band = bandOfZ(g, z);
        if (p.biome === 'Cold') add('matrix', p.id, `biome "Cold" is not one of the ${canon.length} canonical biomes (${SRC.biomeReg}) and the registry forbids ${biomeReg.forbiddenBiomes.join('/')}; not resolved here (conflicts.md)`);
        else add('matrix', p.id, `legacy package grid (${p.zLevel} of the old Z+2..Z-2 levels, lies in band ${band} by containment) with every sheet null and status ${p.status}: no slot to catalogue; per-band per-biome packages wait for the Owner's biome-to-band assignment (DEC-013 open sub-question)`);
    }
    return out.sort((a, b) => sortStr(a.kind, b.kind) || sortStr(a.sourceId, b.sourceId));
}

// ---------------------------------------------------------------- references
function buildReferences(ctx, S, cat) {
    const inp = ctx.readJson(SRC.refInputs, 'REFERENCE_PINS');
    const refs = [];
    for (const r of inp.references) {
        const present = ctx.exists(r.path);
        let verification;
        if (r.tracked) {
            if (!present) { verification = 'MISSING'; S.stats.errors.push({ code: 'REF_MISSING', id: r.path, msg: 'tracked reference is missing' }); }
            else if (sha256(ctx.buf(r.path)) !== r.sha256) { verification = 'MISMATCH'; S.stats.errors.push({ code: 'REF_HASH', id: r.path, msg: 'tracked reference does not hash-match its pin' }); }
            else verification = 'VERIFIED';
        } else {
            if (!present) { verification = 'UNVERIFIED_ABSENT'; S.stats.warnings.push(`UNVERIFIED_ABSENT ${r.path} (untracked third-party reference not present in this checkout)`); }
            else if (sha256(ctx.buf(r.path)) !== r.sha256) { verification = 'UNVERIFIED_ABSENT'; S.stats.warnings.push(`UNVERIFIED_MISMATCH ${r.path} differs from its pin`); }
            else { verification = 'UNVERIFIED_ABSENT'; S.stats.warnings.push(`present and matching (untracked, not recorded): ${r.path}`); }
        }
        // Untracked references are recorded as UNVERIFIED_ABSENT whatever this checkout holds, so the
        // committed output never depends on untracked files; the build prints what it found.
        refs.push({ path: r.path, sha256: r.sha256, kind: r.kind, tracked: r.tracked, ownerApproved: r.ownerApproved, thirdParty: r.thirdParty, styleAnchorEligible: r.styleAnchorEligible, verification });
    }
    const byKind = k => refs.filter(r => r.kind === k && !r.thirdParty && /^art\/reference\//.test(r.path)).map(r => r.path);
    const packs = [
        { packId: 'WORLD', about: 'perspective, scale and palette references for every world entry', paths: [].concat(byKind('PERSPECTIVE'), byKind('SCALE'), byKind('PALETTE')) },
        { packId: 'BIOME', about: 'biome material studies for terrain and water', paths: byKind('BIOME') },
        { packId: 'STYLE', about: 'style-lock anchors of art/APPROVALS.md (ownerApproved UNKNOWN under DEC-007)', paths: refs.filter(r => r.kind === 'STYLE_ANCHOR' && !r.thirdParty).map(r => r.path) },
    ];
    const known = new Set(refs.map(r => r.path));
    const packIds = new Set(packs.map(p => 'pack:' + p.packId));
    const byEntry = [];
    for (const e of cat.entries) {
        for (const r of e.references) if (!known.has(r) && !packIds.has(r)) S.stats.errors.push({ code: 'REF_UNKNOWN', id: e.id, msg: `reference ${r} has no pin in ${SRC.refInputs}` });
        const own = e.references.filter(r => !r.startsWith('pack:'));
        if (own.length) byEntry.push({ entryId: e.id, paths: own });
    }
    return { schemaVersion: SCHEMA_VERSION, about: 'Links by path + sha256 only; no reference is copied into git. Tracked references are re-hashed at every build (a mismatch fails the build). Untracked reference/** material is Ultima VII-derived third-party material: thirdParty true, styleAnchorEligible false, recorded as UNVERIFIED_ABSENT (warning only). An entry\'s references[] holds pack ids (pack:<id>) and paths; byEntry lists entries with their own paths.', references: refs, packs, byEntry };
}

// ---------------------------------------------------------------- conflicts
function buildConflicts(ctx, S, cat, sizeDoc, scaleRows) {
    const { g, idx, deusIdx, wc, biomeReg, matrix, manifest, briefs, requests, stats } = S;
    const out = [];
    let secN = 0;
    const sec = (title) => out.push('', `## ${++secN}. ${title.replace(/^\d+\.\s*/, '')}`, '');
    const li = s => out.push(`- ${s}`);
    const at = (file, find) => { const n = ctx.lineOf(file, find); return n ? `${file}:${n}` : `${file}:NOT FOUND ("${find.slice(0, 40)}")`; };
    out.push('# Art catalogue: conflicts between sources (generated)', '', `Generated by \`tools/art/build_catalogue.js\` (schema ${SCHEMA_VERSION}). Every line names both sides with file:line. **Nothing here is resolved**: the catalogue follows the size authority of DEC-016 (the scale chart) and the geometry of DEC-013 where an entry needs a size, and lists the other side here for the Owner.`);

    sec('UF_AssetIndex (runtime) vs DEUS_AssetIndex (stale fork)');
    const ka = Object.keys(idx), kb = Object.keys(deusIdx);
    const onlyA = ka.filter(k => !(k in deusIdx)).sort(sortStr), onlyB = kb.filter(k => !(k in idx)).sort(sortStr);
    li(`${onlyA.length} keys only in ${SRC.ufIndex}: ${onlyA.map(k => '`' + (k || '(empty key)') + '`').join(', ')} (lines: ${onlyA.map(k => ctx.lineOf(SRC.ufIndex, JSON.stringify(k) + ': {')).join(', ')})`);
    li(`${onlyB.length} keys only in ${SRC.deusIndex}: ${onlyB.map(k => '`' + k + '`').join(', ')} (lines: ${onlyB.map(k => ctx.lineOf(SRC.deusIndex, JSON.stringify(k) + ': {')).join(', ')})`);
    for (const k of ka.filter(x => x in deusIdx).sort(sortStr)) {
        const a = idx[k], b = deusIdx[k];
        const diffs = [];
        if (a.request !== b.request) diffs.push(`request ${a.request} vs ${b.request}`);
        const ra = (a.requests || []).join(','), rb = (b.requests || []).join(',');
        if (ra !== rb) diffs.push(`requests [${ra}] vs [${rb}]`);
        if (a.status !== b.status) diffs.push(`status ${a.status} vs ${b.status}`);
        if ((a.usedBy || []).join('|') !== (b.usedBy || []).join('|')) diffs.push('usedBy differs');
        if (diffs.length) li(`\`${k}\`: ${diffs.join('; ')} (${SRC.ufIndex}:${ctx.lineOf(SRC.ufIndex, JSON.stringify(k) + ': {')} vs ${SRC.deusIndex}:${ctx.lineOf(SRC.deusIndex, JSON.stringify(k) + ': {')})`);
    }
    const drift = [];
    for (const k of ka.filter(x => x in deusIdx)) {
        for (const r of (idx[k].requests || [])) if (!(deusIdx[k].requests || []).includes(r)) drift.push(`\`${k}\` ${r} only in UF`);
        for (const r of (deusIdx[k].requests || [])) if (!(idx[k].requests || []).includes(r)) drift.push(`\`${k}\` ${r} only in DEUS`);
    }
    li(`AR reference drift (for example AR-200 vs AR-2000): ${drift.length ? drift.sort(sortStr).join('; ') : 'none'}`);
    for (const k of Object.keys(idx).sort(sortStr)) {
        const v = idx[k];
        const rq = (v.requests || []).filter(r => !requests.some(x => x.id === r));
        if (rq.length) li(`\`${k || '(empty key)'}\` cites ${rq.join(', ')} which has no row in ${SRC.requests} (${SRC.ufIndex}:${ctx.lineOf(SRC.ufIndex, JSON.stringify(k) + ': {')})`);
    }

    sec('Biomes');
    const mb = uniq(matrix.packages.map(p => p.biome));
    li(`${SRC.matrix}:${ctx.lineOf(SRC.matrix, '"description"')} has ${mb.length} biomes (${mb.join(', ')}) including "Cold"; ${SRC.biomeReg}:${ctx.lineOf(SRC.biomeReg, '"canonicalBiomes"')} has ${biomeReg.canonicalBiomes.length} canonical biomes (${biomeReg.canonicalBiomes.join(', ')}) and forbids ${biomeReg.forbiddenBiomes.join(', ')} (${SRC.biomeReg}:${ctx.lineOf(SRC.biomeReg, '"forbiddenBiomes"')}).`);
    li(`${biomeReg.canonicalBiomes.length} canonical biomes (${SRC.biomeReg}) vs 25 biomes in 5 bands (${at(SRC.decisions, 'The 25 pipeline biomes are partitioned into 5 vertical bands')}); names and band assignment are OWNER_OPEN (${at(SRC.decisions, 'Biome Assignment per Band')}). The catalogue lists 25 placeholder ids <BAND>_B1..B5 (catalogue.json biomes.placeholders, ownerOpen) and uses SHARED for every entry: no entry needs a per-biome slot before the Owner rules.`);
    const wcb = Object.keys(wc.biomes).filter(k => k !== 'about');
    li(`${SRC.worldCatalog}:${ctx.lineOf(SRC.worldCatalog, '"biomes"')} runs its own ${wcb.length}-biome table (${wcb.slice(0, 6).join(', ')}, ...), which matches neither the ${biomeReg.canonicalBiomes.length} registry biomes nor the 6 matrix biomes.`);
    const forb = new RegExp('\\b(' + biomeReg.forbiddenBiomes.concat(['snow', 'ice', 'icy', 'arctic', 'glacier', 'tundra', 'frozen']).map(s => s.toLowerCase()).join('|') + ')', 'i');
    const hits = [].concat(wc.groundKinds.filter(x => forb.test(x.id)).map(x => `groundKinds.${x.id}`), wc.objects.filter(o => forb.test(o.id)).map(o => `objects.${o.id}`), Object.keys(wc.water.surface).filter(k => forb.test(k)).map(k => `water.${k}`), (Array.isArray(wc.wildlife.species) ? wc.wildlife.species : []).filter(s => forb.test(s.id)).map(s => `wildlife.${s.id}`), wcb.filter(k => forb.test(k)).map(k => `biomes.${k}`));
    li(`${SRC.worldCatalog} still names snow/ice content the registry forbids: ${hits.join(', ')}. Each is catalogued as the source names it (not dropped, not renamed).`);
    li(`${at('docs/worldgen/DEUS_WORLDGEN_WBS.md', '| **WG.22.01–25**|')} counts 25 as "5 biomes x 5 macro-Z" and mentions HIGH snowpack; DEC-013 counts 25 as 5 bands x 5 biomes (${at(SRC.decisions, 'The 25 pipeline biomes are partitioned into 5 vertical bands')}) and the registry forbids snow.`);

    sec('Scale: the chart (DEC-016) vs other sources');
    const reg = S.scaleReg;
    const stripRows = scaleRows.filter(r => r.source === 'STRIP+REGISTRY');
    for (const r of stripRows) if (r.chartHeightPx !== reg.classes[r.rowId].visualHeightTarget) li(`strip label ${r.chartLabel} reads ${r.chartHeightPx} px (${SRC.strip}) but ${SRC.scaleReg}:${ctx.lineOf(SRC.scaleReg, '"' + r.rowId + '"')} ${r.rowId} visualHeightTarget is ${reg.classes[r.rowId].visualHeightTarget}`);
    li(`strip vs registry: ${stripRows.filter(r => r.chartHeightPx === reg.classes[r.rowId].visualHeightTarget).length} of ${stripRows.length} labelled objects agree with the registry target height (the two are not independent evidence: DEC-016, ${at(SRC.decisions, 'whose numeric source is')}).`);
    const claims = ctx.readJson(SRC.claims, 'CONFLICT_CLAIMS').claims;
    const claimLine = c => `**${c.id}** ${c.a.says} (${at(c.a.file, c.a.find)}) vs ${c.b.says} (${at(c.b.file, c.b.find)})`;
    for (const c of claims.filter(x => x.topic === 'scale')) li(claimLine(c));
    // Registry classes with no row in the scale standard's class tables.
    const stdLines = ctx.exists(SRC.scaleStandard) ? ctx.read(SRC.scaleStandard, 'SCALE_STANDARD').split(/\r?\n/) : [];
    const inTables = new Set();
    for (const l of stdLines) if (/^\|/.test(l)) for (const m of l.match(/`([A-Z]+(?:_[A-Z\d]+)+)`/g) || []) inTables.add(m.replace(/`/g, ''));
    const notStd = Object.keys(reg.classes).filter(k => !inTables.has(k));
    const guide = k => { const h = reg.classes[k].visualHeightTarget; const n = stdLines.findIndex(l => l.includes('$' + h + '\\text{ px}$')); return n >= 0 ? `${k} target ${h} px appears only as a guide height at ${SRC.scaleStandard}:${n + 1}` : `${k} (target ${h} px) appears nowhere`; };
    if (notStd.length) li(`registry classes with no row in the class tables of ${SRC.scaleStandard}: ${notStd.map(k => `${k} (${SRC.scaleReg}:${ctx.lineOf(SRC.scaleReg, '"' + k + '"')})`).join(', ')}. Of these: ${notStd.map(guide).join('; ')}. The catalogue uses the registry (DEC-016).`);
    // Documentation mirrors: compare only the fields a mirror carries.
    for (const [f, canon, role] of [[SRC.docsScaleReg, reg, 'SCALE_REGISTRY_MIRROR'], [SRC.docsBiomeReg, biomeReg, 'BIOME_REGISTRY_MIRROR']]) {
        if (!ctx.exists(f)) continue;
        const d = JSON.parse(ctx.read(f, role));
        const diff = Object.keys(d).filter(k => !['$schema', 'title', 'canonicalSource', 'about', 'notes'].includes(k) && JSON.stringify(d[k]) !== JSON.stringify(canon[k]));
        if (diff.length) li(`${f} (a mirror naming canonicalSource ${d.canonicalSource}) differs from it in ${diff.map(k => `${k} (${f}:${ctx.lineOf(f, '"' + k + '"')})`).join(', ')}; the catalogue reads the canonical file only.`);
    }
    // Brief drawn sizes vs the registry or race row the catalogue uses (frame and tile rows are cells, not drawn sizes).
    const briefVsChart = [];
    for (const e of cat.entries) {
        if (e.variants.derivedFrom) continue;
        for (const bid of e.sourceIds.brief) {
            const b = briefs.find(x => x.sourceId === bid);
            if (!b || !b.drawnH) continue;
            const row = S.rowById.get(e.scaleRow) || S.raceById.get(e.scaleRow);
            if (!row || row.source === 'RMMZ_SPEC' || row.source === 'GEOMETRY') continue;
            const hMin = row.hMin !== undefined ? row.hMin : row.drawnHeightPxMin, hMax = row.hMax !== undefined ? row.hMax : row.drawnHeightPxMax;
            if (b.drawnH < hMin || b.drawnH > hMax) briefVsChart.push(`\`${b.id}\` drawn ${b.drawnW}x${b.drawnH} px (${b.file}:${b.line}) vs ${e.scaleRow} height ${hMin}..${hMax}`);
        }
    }
    li(`${briefVsChart.length} brief drawn sizes fall outside the chart row the catalogue uses (the briefs of 2026-09-18 fit everything in one 48x48 square): ${uniq(briefVsChart).sort(sortStr).join('; ')}`);
    li(`geometry vs chart px/ft: the grid is ${g.tilePx} px per ${g.squareFt} ft = ${(g.tilePx / g.squareFt).toFixed(1)} px/ft (${SRC.geometry}), creatures are drawn at ${g.pxPerFootCreature} px/ft (a 6-ft human = ${g.pxPerFootCreature * 6} px, chart HUMAN ${g.humanPx}). This is the Owner's deliberate choice (01:55 CT, ${at('tasks/WG.20.02/lane-s/BRIEF.md', 'Humans stay deliberately small')}), recorded here as a difference, not as an error.`);

    sec('Frames, footprints and sheet layouts');
    for (const c of claims.filter(x => x.topic === 'frames' || x.topic === 'animation')) li(claimLine(c));
    const large = reg.classes.CREATURE_LARGE_2TILE;
    if (large) li(`${SRC.scaleReg}:${ctx.lineOf(SRC.scaleReg, '"CREATURE_LARGE_2TILE"')} CREATURE_LARGE_2TILE is ${large.visualWidthMin}-${large.visualWidthMax} x ${large.visualHeightMin}-${large.visualHeightMax} px; the frame classes put a Large creature in ${g.frameClasses.LARGE_TALL.frame.join('x')} (LARGE_TALL) or ${g.frameClasses.LARGE_LONG.frame.join('x')} (LARGE_LONG), so a LARGE_LONG body cannot reach the registry's minimum height ${large.visualHeightMin} (${SRC.geometry}:${ctx.lineOf(SRC.geometry, '"LARGE_LONG"')}). Creature entries cite GEOM_FRAME_* rows.`);
    const tiny = sizeDoc.sizeTable.rows.find(r => r.size === 'Tiny');
    if (tiny) li(`SRD Tiny space is "${tiny.spaceText}" (${SRC.srdRules}:${ctx.lineOf(SRC.srdRules, 'Tiny | 2½ by 2½ ft.')}), half a ${g.squareFt}-ft square; frameClasses.TINY stores footprintSq ${JSON.stringify(g.frameClasses.TINY.footprintSq)} with drawnFootprintPx ${JSON.stringify(g.frameClasses.TINY.drawnFootprintPx)} (${SRC.geometry}:${ctx.lineOf(SRC.geometry, '"TINY"')}). The catalogue keeps the contract value (one cell) and records the difference.`);
    for (const r of sizeDoc.races) {
        const m = { RACE_HUMAN: 'CHARACTER_HUMAN_ADULT', RACE_DWARF: 'CHARACTER_DWARF_ADULT', RACE_ELF: 'CHARACTER_ELF_ADULT' }[r.id];
        const rc = m && reg.classes[m];
        if (rc && (rc.visualHeightMin !== r.drawnHeightPxMin || rc.visualHeightMax !== r.drawnHeightPxMax)) li(`${r.id} drawn height ${r.drawnHeightPxMin}-${r.drawnHeightPxMax} px (PM 01:59 CT, ${at('tasks/WG.20.02/lane-s/BRIEF.md', 'Race drawn heights')}) vs ${m} ${rc.visualHeightMin}-${rc.visualHeightMax} px target ${rc.visualHeightTarget} (${SRC.scaleReg}:${ctx.lineOf(SRC.scaleReg, '"' + m + '"')}). Character entries cite the race row (the brief's character-size authority).`);
    }
    const openRaces = sizeDoc.races.filter(r => r.status === 'PROPOSED').map(r => `${r.id} (${r.minRel}/${r.maxRel})`);
    li(`SRD Size traits with open-ended bounds ("under", "over", "well over", "same as humans") are turned into pixel ranges by the PM's numbers (${at('tasks/WG.20.02/lane-s/BRIEF.md', 'Race drawn heights')}); those rows are PROPOSED in size_classes.json: ${openRaces.join(', ')}.`);
    const bad = sizeDoc.checks.filter(c => !c.ok);
    li(`7 px/ft checks of the race rows against the SRD text: ${sizeDoc.checks.length - bad.length} of ${sizeDoc.checks.length} pass${bad.length ? '; failing: ' + bad.map(c => `${c.race} ${c.side} ${c.px} px (${c.rule})`).join(', ') : ''}.`);
    for (const c of claims.filter(x => x.topic === 'people')) li(claimLine(c));

    sec('Palette');
    const nMaster = ctx.read(SRC.paletteHex, 'MASTER_PALETTE').split(/\r?\n/).filter(l => /^#?[0-9A-Fa-f]{6}$/.test(l.trim())).length;
    const nUf = ctx.exists(SRC.ufHex) ? ctx.read(SRC.ufHex, 'UF_PALETTE').split(/\r?\n/).filter(l => /^#?[0-9A-Fa-f]{6}$/.test(l.trim())).length : 0;
    li(`${SRC.ufHex} has ${nUf} colours; ${SRC.paletteHex} has ${nMaster} (${SRC.paletteReg}:${ctx.lineOf(SRC.paletteReg, '"masterColorCount"')} masterColorCount ${S.paletteReg.masterColorCount}). Approved art was snapped to uf.hex (${at('art/APPROVALS.md', 'uf.hex')}); the catalogue cites the master palette and its ramps.`);
    for (const c of claims.filter(x => x.topic === 'palette')) li(claimLine(c));

    sec('Manifest, standards and naming');
    li(`${SRC.manifest} has ${manifest.length} registered rows (lines ${manifest.length ? manifest[0].line + '-' + manifest[manifest.length - 1].line : '-'}); 20 are claimed (${at('tasks/WG.20.02/lane-s/BRIEF.md', 'ASSET_MANIFEST 18 rows vs 20 claimed')}). The claim's own location was not found in docs/, tasks/ or art/.`);
    for (const c of claims.filter(x => ['standards', 'manifest', 'naming', 'lighting', 'biomes', 'bands'].includes(x.topic))) li(claimLine(c));
    const ghost = manifest.filter(r => /YES/.test(r.verified) && !ctx.exists('game/' + r.sheet));
    if (ghost.length) li(`${SRC.manifest} marks ${ghost.length} rows IN-GAME VERIFIED YES whose sheet file is not in game/: ${ghost.map(r => '`' + r.id + '` -> game/' + r.sheet + ` (${SRC.manifest}:${r.line})`).join('; ')}. The catalogue marks them MISSING.`);
    const briefVsAr = [];
    for (const b of briefs) for (const a of b.ars) if (!requests.some(r => r.id === a)) briefVsAr.push(`${b.sourceId} cites ${a} (${b.file}:${b.line})`);
    if (briefVsAr.length) li(`brief headings citing AR ids with no request row: ${uniq(briefVsAr).join('; ')}`);

    sec(`Legacy layer-count assumptions (DEC-013: the ${g.layerCount} layers of geometry.json supersede the old counts and the -2..+2 range)`);
    const scanFiles = [SRC.requests, SRC.manifest, SRC.inventory, SRC.rmmzSpec].concat(briefs.map(b => b.file)).concat(['docs/design/SCALE.md', 'docs/art/DEUS_TILESET_SCALE_STANDARD.md', 'docs/art/DEUS_WORLD_ART_VISUAL_CHARTER.md', 'docs/art/DEUS_SCALE_AND_ASSET_MASTER_BIBLE.md']);
    const pat = /\b(nine|\x39)[- ](z[- ])?(layers?|levels?)\b|\bfive[- ]level\b|\b5[- ]levels?\b|\bfive levels\b|-2\s*\.\.\s*\+?2\b|\bZ\+2\b|\$z\s*=\s*-2\$|\+1\/\+2|-1\/-2/i;
    const layerHits = [];
    for (const f of uniq(scanFiles).sort(sortStr)) {
        if (!ctx.exists(f)) continue;
        ctx.lines(f).forEach((l, i) => { const m = pat.exec(l); if (m) layerHits.push(`${f}:${i + 1} ("${m[0]}")`); });
    }
    li(`text hits: ${layerHits.length ? layerHits.join('; ') : 'none'}`);
    const zl = uniq(matrix.packages.map(p => p.zLevel));
    li(`${SRC.matrix}: packages exist for ${zl.length} Z levels (${zl.join(', ')}) only (${SRC.matrix}:${ctx.lineOf(SRC.matrix, '"description"')}).`);
    const ecoLevels = Object.keys((wc.ecology || {}).levels || {});
    if (ecoLevels.length) li(`${SRC.worldCatalog}:${ctx.lineOf(SRC.worldCatalog, '"levels"')} ecology.levels has ${ecoLevels.length} levels (${ecoLevels.join(', ')}).`);
    const fl = Object.keys((wc.factions || {}).layers || {});
    if (fl.length) li(`${SRC.worldCatalog}:${ctx.lineOf(SRC.worldCatalog, '"perLayer"')} factions.layers places races on layers ${fl.join(', ')} only (race-to-layer mapping is OWNER_OPEN in DEC-013).`);
    const manZ = uniq(manifest.map(r => r.zext)).filter(z => /-|\+/.test(z));
    li(`${SRC.manifest} Z EXTENT values use the old level numbers (${manZ.join(', ')}); the catalogue bands legacy z by containment (${bandIds(g).map(b => `${b} ${bandRange(g, b).join('..')}`).join(', ')}).`);

    sec('Status: inventory vs AssetIndex');
    const st = stats.conflicts.filter(c => c.topic === 'status');
    li(st.length ? uniq(st.map(c => c.text)).join('; ') : `${SRC.inventory} and ${SRC.ufIndex} agree on every status.`);

    sec('Owner questions (asked, not answered)');
    const qs = ownerQuestions(S, cat);
    qs.forEach((q, i) => out.push(`${i + 1}. **${q.id}** ${q.text}`));
    out.push('');
    return { text: out.join('\n'), questions: qs };
}

function ownerQuestions(S, cat) {
    const { g } = S;
    const proposed = cat.entries.filter(e => !e.variants.derivedFrom && e.mapping && (e.mapping.scaleBasis === 'PROPOSED' || e.mapping.rampBasis === 'PROPOSED'));
    const proposedSrc = proposed.filter(e => e.family === 'SOURCE');
    return [
        { id: 'Q-BIOMES', text: 'Which 25 biomes exist and which 5 belong to each band (LOWER2, LOWER1, SURFACE, UPPER1, UPPER2)? Until then every entry is SHARED and the placeholders <BAND>_B1..B5 are unused.' },
        { id: 'Q-BANDS', text: `Are the band ranges (${bandIds(g).map(b => `${b} ${bandRange(g, b).join('..')}`).join(', ')}) and the z range ${g.zMin}..${g.zMax} final?` },
        { id: 'Q-LEGACY-Z', text: 'Legacy "z = -2 Deep Caverns" content (AR-1905..1908) lands in LOWER1 by numeric containment, not in LOWER2 "Deep Caverns". Which band should it be in?' },
        { id: 'Q-STRATA', text: `Is the stratum split ${JSON.stringify(g.stratumPx)} final, and are strata listed bottom-up? (Slots use the tallest run of k strata, so order does not change slot sizes.)` },
        { id: 'Q-FACINGS', text: `Edge strips and ramp side faces are catalogued for facings ${g.facings.join('/')} with the same ${g.tilePx}-px width and stratum-derived height. Are N/E/W vertical faces drawn at all in the top-down view, or only S faces plus top-edge lips?` },
        { id: 'Q-H5-FULL', text: 'Height difference 5 strata and the full-layer face have the same pixel height by default. Keep both slots, or merge them?' },
        { id: 'Q-RAMP-SLOT', text: `Ramp cells are sized tilePx + rise of k strata (PROPOSED). Is that the drawing convention?` },
        { id: 'Q-DEPTH', text: 'Tile art (top tiles, edges, ramps, ramp sides, connectors) is painted once in its home band and appears in the other bands as DEPTH_<band> recolours with no paint slot and no colours. Is that right, and which colours does each DEPTH palette get?' },
        { id: 'Q-TOP-VS-A2', text: 'Surface terrains have both an RMMZ A2 autotile block and a DEC-019 top-surface tile. Is the A2 block the top-surface tile set, or are both needed?' },
        { id: 'Q-HANGING', text: 'Hanging props (roots, vines, stalactites, waterfalls, dust, light shafts) are painted per band in every band, including the sky bands; no source rules any of them out. Which bands should drop which kinds?' },
        { id: 'Q-LIGHT', text: 'Deep light sources are the source-cited emitters (mapping.lightSources) recoloured per band. Which light sources should each band have, and should they be recoloured at all?' },
        { id: 'Q-ALPHA', text: 'Rim shadows, height-shading overlays, dust, light shafts and ore/hole overlays carry alphaMode OWNER_OPEN (binary until ruled). Is partial alpha allowed for them?' },
        { id: 'Q-DECAY', text: 'Decay overlays are one 48x96 overlay per wall material and stage per band. Should they match every piece of the wall set (16/20 pieces) instead?' },
        { id: 'Q-FRAMES-HUGE', text: 'Frame sizes for HUGE and GARGANTUAN creatures (no paint slots until set); and whether LARGE_LONG 96x48 (PROPOSED) is accepted.' },
        { id: 'Q-TALL-MEDIUM', text: 'Turn on TALL_MEDIUM (48x64) and the Gnome/Halfling readability floor (26-28 px)? Both are OFF.' },
        { id: 'Q-SRD-OPEN', text: 'Accept the PM pixel readings of open-ended SRD heights (Dragonborn 46-48, Human/Half-Orc/Tiefling 35-46, Elf 33-44) and the PROPOSED widths of races with no registry row?' },
        { id: 'Q-CHILD', text: 'Baby and teen sizes (only CHARACTER_CHILD exists in the chart); child frames are catalogued with CHARACTER_CHILD.' },
        { id: 'Q-PEOPLE', text: 'Are goblin, orc and automaton (people briefs, cultures) people, monsters or neither under the DEC-013 rule of exactly nine races? They are catalogued as MISSING character entries until ruled.' },
        { id: 'Q-SNOW', text: 'The registry forbids snow/ice biomes but the WorldCatalog has snow, ice, icy water, snow fir, snow bush, arctic fox, ice wraith, glacier and tundra. Keep or drop them? (Catalogued as the sources name them.)' },
        { id: 'Q-SCALE-MAP', text: `${proposed.length} painted entries use a PROPOSED scale row or palette ramp (${proposedSrc.length} source entries, ${proposed.length - proposedSrc.length} addendum placeholders; no chart row or ramp names the thing; see mapping.scaleBasis / mapping.rampBasis per entry and art/catalogue/mapping.json). Confirm or reassign.` },
        { id: 'Q-LIVING-PAL', text: 'The palette registry has no skin, fur, hair or feather ramps; people, creatures, faces and body layers carry placeholder ramps. Which ramps should living beings use?' },
        { id: 'Q-UI', text: 'Should interface art (window skins, menus, cursors, markers, badges) join the catalogue? It needs size rows the scale chart does not have; today it is out of scope with a reason.' },
        { id: 'Q-APPROVED', text: 'art/APPROVALS.md rows predate DEC-007 (several say "approved via review policy" or "Awaiting user approval"). No entry is marked APPROVED until the Owner confirms which approvals stand.' },
        { id: 'Q-REFS', text: 'Which references are Owner-approved (every reference is ownerApproved UNKNOWN), and may the art/masters style anchors serve as style anchors under DEC-007?' },
        { id: 'Q-TREE-FRAMES', text: 'How many sway frames do trees and other swaying props get (AGENTS.md Rule 12)? Tree briefs deliver one frame, so trees have frames.cols = 1.' },
    ];
}

// ---------------------------------------------------------------- serialisation
function jsonLines(obj, arrayKeys) {
    // Top-level keys in order; arrays named in arrayKeys are written one element per line.
    const keys = Object.keys(obj);
    const parts = keys.map(k => {
        const v = obj[k];
        if (arrayKeys.includes(k) && Array.isArray(v)) {
            if (!v.length) return `  ${JSON.stringify(k)}: []`;
            return `  ${JSON.stringify(k)}: [\n${v.map(x => '    ' + JSON.stringify(x)).join(',\n')}\n  ]`;
        }
        return `  ${JSON.stringify(k)}: ${JSON.stringify(v, null, 2).replace(/\n/g, '\n  ')}`;
    });
    return `{\n${parts.join(',\n')}\n}\n`;
}

// ---------------------------------------------------------------- coverage and docs
function computeCoverage(cat, S) {
    const { requests, briefs } = S;
    const covered = new Map(SOURCE_KINDS.map(k => [k, new Set()]));
    for (const e of cat.entries) for (const k of SOURCE_KINDS) for (const id of e.sourceIds[k] || []) covered.get(k).add(id);
    const oos = new Map();
    for (const o of cat.outOfScope) oos.set(o.kind + '\u0000' + o.sourceId, o);
    const row = (label, kind, ids, required) => {
        let mapped = 0, out = 0, missing = [];
        for (const id of ids) { if (covered.get(kind).has(id)) mapped++; else if (oos.has(kind + '\u0000' + id)) out++; else missing.push(id); }
        return { label, kind, total: ids.length, mapped, outOfScope: out, uncovered: missing.length, missing, required, pct: ids.length ? ((mapped + out) / ids.length * 100) : 100 };
    };
    const ix = cat.sourceIdIndex;
    const cats = prefix => ix.catalog.filter(x => x.startsWith(prefix));
    const openAr = requests.filter(r => r.open).map(r => r.id);
    const briefSpecial = briefs.filter(b => /^(anchor|ui|eq|face)_/.test(b.id)).map(b => b.sourceId);
    const rows = [
        row('WorldCatalog objects', 'catalog', cats('objects:'), true),
        row('WorldCatalog items.types', 'catalog', cats('items:'), true),
        row('WorldCatalog wildlife.species', 'catalog', cats('wildlife:'), true),
        row('WorldCatalog people', 'catalog', cats('people:'), true),
        row('WorldCatalog groundKinds', 'catalog', cats('groundKinds:'), true),
        row('WorldCatalog water.surface', 'catalog', cats('water:'), true),
        row('WorldCatalog underground grounds', 'catalog', cats('underground:'), true),
        row('WorldCatalog faces (cultures + species)', 'catalog', cats('faces:'), true),
        row('WorldCatalog skins.cultures', 'catalog', cats('skins:'), true),
        row('Brief anchor_/ui_/eq_/face_ ids', 'brief', briefSpecial, true),
        row('ASSET_MANIFEST rows', 'manifest', ix.manifest, true),
        row('Open AR rows', 'ar', openAr, true),
        row('All brief ids', 'brief', ix.brief, false),
        row('All AR rows', 'ar', ix.ar, false),
        row('UF_AssetIndex keys', 'assetIndex', ix.assetIndex, false),
        row('Biome production matrix packages', 'matrix', ix.matrix, false),
        row('Owner addendum families', 'addendum', ix.addendum, true),
    ];
    const bands = bandIds(S.g);
    const famBand = FAMILIES.map(f => {
        const cells = bands.map(b => cat.entries.filter(e => e.band === b && (f.id === 'DEPTH' ? e.variants.paletteSwap === 'DEPTH_' + b : (e.family === f.id || (f.id === 'LIGHT' && e.category === 'LIGHT')))).length);
        return { family: f.id, section: f.section, cells };
    });
    return { rows, famBand, bands };
}

function mdTable(head, rows) {
    return [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`].concat(rows.map(r => `| ${r.join(' | ')} |`)).join('\n');
}

function buildDocs(cat, S, cov, terrains, conflicts, famCite) {
    const files = {};
    const { g } = S;
    const bands = [ALL_BAND].concat(bandIds(g));
    const count = f => cat.entries.filter(f).length;
    const largest = cat.sheets.filter(s => s.kind === 'ATLAS').reduce((m, s) => (s.w * s.h > m.w * m.h ? s : m), { w: 0, h: 0, sheetId: '-' });
    const idx = [];
    idx.push('# Art catalogue: index (generated)', '', `Generated by \`tools/art/build_catalogue.js\` from the sources listed in \`art/catalogue/catalogue.json\` (\`sources[]\`). Schema \`${SCHEMA_VERSION}\`: see [SCHEMA.md](SCHEMA.md). No image data: ids, sizes, slots, sources, statuses and references only (DEC-007).`, '');
    idx.push('## Counts', '');
    idx.push(mdTable(['Measure', 'Value'], [
        ['entries', String(cat.entries.length)],
        ['entries with a paint slot', String(count(e => e.slot))],
        ['derived variants (no paint slot)', String(count(e => e.variants.derivedFrom))],
        ['sheets (ATLAS / RMMZ_TILESET / RMMZ_CHARACTER)', `${cat.sheets.length} (${SHEET_KINDS.map(k => cat.sheets.filter(s => s.kind === k).length).join(' / ')})`],
        ['largest atlas', `${largest.sheetId} ${largest.w}x${largest.h}`],
        ['outOfScope rows', String(cat.outOfScope.length)],
        ['PROPOSED scale or ramp mappings', String(count(e => !e.variants.derivedFrom && e.mapping && (e.mapping.scaleBasis === 'PROPOSED' || e.mapping.rampBasis === 'PROPOSED')))],
        ['Owner questions', String(conflicts.questions.length)],
    ]), '');
    idx.push('## Entries by band and status', '');
    idx.push(mdTable(['Band', 'z range', 'entries', 'painted slots', 'derived'].concat(STATUS), bands.map(b => [b, bandRange(g, b).join('..'), String(count(e => e.band === b)), String(count(e => e.band === b && e.slot)), String(count(e => e.band === b && e.variants.derivedFrom))].concat(STATUS.map(s => String(count(e => e.band === b && e.status === s))))) ), '');
    idx.push(`Band pages: ${bands.map(b => `[${b}](BAND_${b}.md)`).join(', ')}.`, '');
    idx.push('## Coverage', '');
    idx.push(mdTable(['Source ids', 'required', 'total', 'mapped to entries', 'outOfScope (with reason)', 'uncovered', 'coverage'], cov.rows.map(r => [r.label, r.required ? 'yes' : 'no', String(r.total), String(r.mapped), String(r.outOfScope), String(r.uncovered), r.pct.toFixed(1) + '%'])), '');
    const unc = cov.rows.filter(r => r.uncovered);
    if (unc.length) idx.push('Uncovered: ' + unc.map(r => `${r.label}: ${r.missing.slice(0, 20).join(', ')}`).join('; '), '');
    idx.push('## Owner addendum families x band (entry counts; every cell must be > 0)', '');
    idx.push(mdTable(['Family', 'Addendum', 'ordered by'].concat(cov.bands), cov.famBand.map(f => [f.family, f.section, famCite[f.family]].concat(f.cells.map(String)))), '');
    idx.push('## Terrain list used by the terrain families', '', `From \`${SRC.worldCatalog}\` \`groundKinds\` (home band ${bandOfZ(g, 0)}) and the \`ground\` values of \`undergroundBiomes\` (home band ${bandOfZ(g, -1)}): ${terrains.map(t => `\`${t.id}\``).join(', ')} (${terrains.length}).`, '');
    idx.push('## Sheets', '');
    idx.push(mdTable(['sheetId', 'kind', 'group', 'size', 'slots'], cat.sheets.map(s => [s.sheetId, s.kind, `${s.group.band}/${s.group.biome}/${s.group.type}`, `${s.w}x${s.h}`, String(cat.entries.filter(e => e.slot && e.slot.sheetId === s.sheetId).length)])), '');
    files[OUT.docsDir + '/INDEX.md'] = idx.join('\n');
    for (const b of bands) {
        const L = [];
        const range = bandRange(g, b);
        const bdef = g.bands.find(x => x.id === b);
        L.push(`# Band ${b} (generated)`, '', b === ALL_BAND ? `Band-neutral content (items, creatures, people, equipment, faces, effects, buildings, depth-agnostic level pieces): z ${range.join('..')}.` : `${bdef.name}: z ${range.join('..')} (${range[1] - range[0] + 1} layers), ownerOpen ${bdef.ownerOpen}. Biomes: placeholders ${Array.from({ length: g.biomesPerBand }, (_, i) => `${b}_B${i + 1}`).join(', ')} (OWNER_OPEN, unused); entries use SHARED.`, '');
        const inBand = cat.entries.filter(e => e.band === b);
        const fams = uniq(inBand.map(e => e.category)).sort(sortStr);
        L.push('## Entries by category', '');
        L.push(mdTable(['category', 'entries', 'painted slots', 'derived'].concat(STATUS), fams.map(c => [c, String(inBand.filter(e => e.category === c).length), String(inBand.filter(e => e.category === c && e.slot).length), String(inBand.filter(e => e.category === c && e.variants.derivedFrom).length)].concat(STATUS.map(s => String(inBand.filter(e => e.category === c && e.status === s).length))))), '');
        L.push('## Sheets', '');
        const sh = cat.sheets.filter(s => s.kind === 'ATLAS' && s.group.band === b);
        L.push(mdTable(['sheetId', 'size', 'slots'], sh.map(s => [s.sheetId, `${s.w}x${s.h}`, String(inBand.filter(e => e.slot && e.slot.sheetId === s.sheetId).length)])), '');
        L.push('## Painted slots', '');
        L.push(mdTable(['id', 'scaleRow', 'slot', 'x,y', 'w x h', 'status'], inBand.filter(e => e.slot).map(e => [e.id, e.scaleRow, e.slot.slotId, `${e.slot.x},${e.slot.y}`, `${e.slot.w}x${e.slot.h}`, e.status])), '');
        const der = inBand.filter(e => e.variants.derivedFrom);
        if (der.length) {
            L.push('## Derived variants (no paint slot)', '');
            L.push(mdTable(['category', 'count', 'palette placeholder'], uniq(der.map(e => e.category)).sort(sortStr).map(c => [c, String(der.filter(e => e.category === c).length), uniq(der.filter(e => e.category === c).map(e => e.variants.paletteSwap)).join(', ')])), '');
        }
        files[`${OUT.docsDir}/BAND_${b}.md`] = L.join('\n');
    }
    return files;
}

// ---------------------------------------------------------------- main build
function build(opts) {
    opts = opts || {};
    const root = opts.root || path.resolve(__dirname, '..', '..');
    const ctx = makeCtx(root);
    const stats = { errors: [], warnings: [], conflicts: [] };
    const g = opts.geometry || ctx.readJson(SRC.geometry, 'GEOMETRY');
    if (opts.geometry) ctx.read(SRC.geometry, 'GEOMETRY');
    const gErr = validateGeometry(g);
    if (gErr.length) return { ok: false, errors: gErr, warnings: [], files: {} };
    const rmmz = parseRmmzSpec(ctx);
    const strip = ctx.readJson(SRC.strip, 'STRIP_TRANSCRIPTION');
    if (ctx.exists(strip.strip.path) && sha256(ctx.buf(strip.strip.path)) !== strip.strip.sha256) stats.errors.push({ code: 'REF_HASH', id: strip.strip.path, msg: 'the scale strip does not match the transcribed sha256' });
    const scale = buildScaleChart(ctx, g, rmmz, strip, stats);
    const sizeClasses = buildSizeClasses(ctx, g, scale, stats);
    const paletteReg = ctx.readJson(SRC.paletteReg, 'PALETTE_REGISTRY');
    ctx.read(SRC.paletteHex, 'MASTER_PALETTE');
    const biomeReg = ctx.readJson(SRC.biomeReg, 'BIOME_REGISTRY');
    const S = {
        g, rmmz, stats, scaleReg: scale.reg, paletteReg, biomeReg,
        mapping: ctx.readJson(SRC.mapping, 'MAPPING'),
        wc: ctx.readJson(SRC.worldCatalog, 'WORLD_CATALOG'),
        idx: ctx.readJson(SRC.ufIndex, 'ASSET_INDEX'),
        deusIdx: ctx.readJson(SRC.deusIndex, 'ASSET_INDEX_STALE_FORK'),
        inv: parseInventory(ctx),
        briefs: parseBriefs(ctx),
        requests: parseRequests(ctx),
        manifest: parseManifest(ctx),
        matrix: ctx.readJson(SRC.matrix, 'BIOME_MATRIX'),
        creatures: ctx.readJson(SRC.srdCreatures, 'SRD_CREATURE_SIZES').entries,
        sizeClasses,
        rampIds: new Set(Object.keys(paletteReg.ramps)),
    };
    S.rowById = new Map(scale.rows.map(r => [r.rowId, r]));
    S.raceById = new Map(sizeClasses.doc.races.map(r => [r.id, r]));
    S.chart = scale.rows;
    classifyManifest(S.manifest, g);
    const base = buildEntries(ctx, S);
    const add = buildAddendum(S, base);
    const entries = base.entries.concat(add.entries);
    // Tie brief anchors to the entries they anchor.
    const anchorMap = { anchor_tree: 'objects:oak', anchor_wall: 'objects:wall_wood', anchor_ground: 'groundKinds:meadow' };
    for (const b of S.briefs) {
        const tgt = anchorMap[b.id];
        if (tgt && base.byCatalog.has(tgt)) { const e = base.byCatalog.get(tgt)[0]; e.sourceIds.brief = uniq(e.sourceIds.brief.concat([b.sourceId])).sort(sortStr); e.sourceIds.ar = uniq(e.sourceIds.ar.concat(b.ars)).sort(sortStr); }
    }
    // AR rows that name catalog ids directly (mapping.arMap).
    for (const [ar, sel] of Object.entries(S.mapping.arMap || {})) {
        for (const cid of sel) for (const e of base.byCatalog.get(cid) || []) e.sourceIds.ar = uniq(e.sourceIds.ar.concat([ar])).sort(sortStr);
    }
    for (const e of entries) for (const k of SOURCE_KINDS) e.sourceIds[k] = uniq(e.sourceIds[k]).sort(sortStr);
    // Optional fields are written only when they carry something.
    for (const e of entries) {
        if (e.notes === null) delete e.notes;
        if (!e.geometryDerived) delete e.geometryDerived;
        if (!e.ownerOpen) delete e.ownerOpen;
    }
    const atlas = pack(g, entries, stats);
    const rt = runtimeSheets(g, entries, rmmz, stats);
    const sheets = atlas.concat(rt).sort((a, b) => sortStr(a.sheetId, b.sheetId));
    entries.sort((a, b) => sortStr(a.id, b.id));

    const scaleChartDoc = { schemaVersion: SCHEMA_VERSION, about: `Size rows cited by catalogue entries (DEC-016). Registry rows copy ${SRC.scaleReg}; chartLabel/chartHeightPx are transcribed from the strip (${SRC.strip}); RMMZ_SPEC rows are parsed from ${SRC.rmmzSpec}; GEOMETRY rows are computed from ${SRC.geometry}. No other rows.`, strip: strip.strip, rows: scale.rows };
    const scaleChartText = jsonLines(scaleChartDoc, ['rows']);
    const sizeText = JSON.stringify(sizeClasses.doc, null, 2) + '\n';
    const cat = {
        schemaVersion: SCHEMA_VERSION,
        tileSizePx: g.tilePx,
        geometry: { path: SRC.geometry, sha256: sha256(ctx.buf(SRC.geometry)) },
        palette: { path: SRC.paletteHex, sha256: sha256(ctx.buf(SRC.paletteHex)) },
        scaleChart: { path: OUT.scaleChart, sha256: sha256(Buffer.from(scaleChartText)) },
        sizeClasses: { path: OUT.sizeClasses, sha256: sha256(Buffer.from(sizeText)) },
        sources: [],
        bands: g.bands.map(b => ({ id: b.id, zMin: b.zMin, zMax: b.zMax, ownerOpen: b.ownerOpen })),
        biomes: { canonical: biomeReg.canonicalBiomes, forbidden: biomeReg.forbiddenBiomes, placeholders: [].concat(...bandIds(g).map(b => Array.from({ length: g.biomesPerBand }, (_, i) => ({ id: `${b}_B${i + 1}`, band: b, ownerOpen: true })))) },
        depthPalettes: bandIds(g).map(b => ({ id: 'DEPTH_' + b, band: b, colors: null, status: 'OWNER_OPEN' })),
        sourceIdIndex: null,
        sheets,
        entries,
        outOfScope: [],
    };
    cat.sourceIdIndex = collectSourceIds(S, base);
    cat.outOfScope = outOfScopeRows(S, cat, cat.sourceIdIndex);
    const refs = buildReferences(ctx, S, cat);
    const refsText = jsonLines(refs, ['references', 'byEntry']);
    cat.references = { path: OUT.references, sha256: sha256(Buffer.from(refsText)) };
    const conflicts = buildConflicts(ctx, S, cat, sizeClasses.doc, scale.rows);
    // Sources (every file read), after all reads.
    const srcList = uniq(Array.from(ctx.used)).map(s => s.split('\u0000')).sort((a, b) => sortStr(a[0], b[0]) || sortStr(a[1], b[1]));
    const seen = new Map();
    for (const [p, role] of srcList) { if (!seen.has(p)) seen.set(p, []); seen.get(p).push(role); }
    cat.sources = Array.from(seen.entries()).map(([p, roles]) => ({ path: p, sha256: sha256(ctx.buf(p)), role: uniq(roles).sort(sortStr).join('+') }));
    // Validate.
    const rowsForValidate = new Map(scale.rows.map(r => [r.rowId, r]));
    for (const r of sizeClasses.doc.races) rowsForValidate.set(r.id, { wMin: r.drawnWidthPx.min, wTarget: r.drawnWidthPx.target, wMax: r.drawnWidthPx.max, hMin: r.drawnHeightPxMin, hTarget: r.drawnHeightPxTarget, hMax: r.drawnHeightPxMax });
    const vctx = { geometry: g, rows: rowsForValidate, rampIds: S.rampIds, rmmzSheets: rmmz.sheets, disabled: opts.disabled };
    const vErr = validateCatalogue(cat, vctx);
    const cov = computeCoverage(cat, S);
    for (const r of cov.rows) if (r.required && r.uncovered) stats.errors.push({ code: 'COVERAGE', id: r.label, msg: `${r.uncovered} uncovered: ${r.missing.slice(0, 10).join(', ')}` });
    for (const f of cov.famBand) f.cells.forEach((n, i) => { if (!n) stats.errors.push({ code: 'COVERAGE', id: f.family, msg: `family ${f.family} has no entry in band ${cov.bands[i]}` }); });
    const errors = stats.errors.concat(vErr);
    const catText = jsonLines(cat, ['sources', 'sheets', 'entries', 'outOfScope']);
    const files = {};
    files[OUT.catalogue] = catText;
    files[OUT.scaleChart] = scaleChartText;
    files[OUT.sizeClasses] = sizeText;
    files[OUT.references] = refsText;
    files[OUT.conflicts] = conflicts.text;
    const famCite = {};
    for (const f of FAMILIES) { const n = ctx.lineOf(f.file, f.find); famCite[f.id] = n ? `${f.file}:${n}` : `${f.file}:NOT FOUND`; }
    Object.assign(files, buildDocs(cat, S, cov, add.terrains, conflicts, famCite));
    return { ok: errors.length === 0, errors, warnings: stats.warnings, files, catalogue: cat, coverage: cov, questions: conflicts.questions, terrains: add.terrains, scaleRows: scale.rows, sizeClasses: sizeClasses.doc, references: refs, validateCtx: vctx, S };
}

function main(argv) {
    const args = argv.slice(2);
    const check = args.includes('--check');
    const ri = args.indexOf('--root');
    const root = ri >= 0 ? path.resolve(args[ri + 1]) : path.resolve(__dirname, '..', '..');
    const res = build({ root });
    for (const w of res.warnings) console.log('WARN ' + w);
    if (!res.ok) {
        const byCode = {};
        for (const e of res.errors) (byCode[e.code] = byCode[e.code] || []).push(e);
        for (const [code, list] of Object.entries(byCode).sort((a, b) => sortStr(a[0], b[0]))) {
            console.log(`FAIL ${code} (${list.length})`);
            for (const e of list.slice(0, 12)) console.log(`  ${e.id}: ${e.msg}`);
        }
        console.log('BUILD: FAILED');
        return 1;
    }
    const names = Object.keys(res.files).sort(sortStr);
    if (check) {
        const diff = [];
        for (const f of names) {
            const p = path.join(root, f);
            const cur = fs.existsSync(p) ? fs.readFileSync(p) : null;
            if (!cur || !cur.equals(Buffer.from(res.files[f]))) diff.push(f);
        }
        const docsDir = path.join(root, OUT.docsDir);
        if (fs.existsSync(docsDir)) for (const f of fs.readdirSync(docsDir)) { const rel = `${OUT.docsDir}/${f}`; if (/^(INDEX|BAND_.*)\.md$/.test(f) && !res.files[rel]) diff.push(rel + ' (stale, not generated)'); }
        for (const f of diff) console.log('DIFF ' + f);
        console.log(diff.length ? `CHECK: FAILED (${diff.length} file(s) differ from a fresh build)` : `CHECK: OK (${names.length} generated files match)`);
        return diff.length ? 1 : 0;
    }
    for (const f of names) {
        const p = path.join(root, f);
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, res.files[f]);
    }
    const c = res.catalogue;
    console.log(`BUILD: OK (${c.entries.length} entries, ${c.sheets.length} sheets, ${c.outOfScope.length} outOfScope, ${names.length} files written)`);
    return 0;
}

module.exports = { build, validateCatalogue, validateGeometry, strataWindow, makeId, idField, SRC, OUT, SCHEMA_VERSION, SOURCE_KINDS, STATUS, CATEGORIES, ANCHOR_TYPES, ALPHA_MODES, SHEET_KINDS, FAMILIES, jsonLines, sha256 };

if (require.main === module) process.exit(main(process.argv));
