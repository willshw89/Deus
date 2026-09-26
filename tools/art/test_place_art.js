#!/usr/bin/env node
'use strict';
/**
 * tools/art/test_place_art.js
 *
 * WG.41.01 Lane U: tests for tools/art/validate_art.js and tools/art/place_art.js.
 *
 * No art is used or made. Every image is a synthetic cell the test writes at run time into the OS
 * temp folder: per frame, one solid block in a colour from tools/art/fixtures/place/palette.fixture.json
 * (a subset of the master palette), sized to the entry's envelope and set on a transparent margin.
 * The catalogue, geometry, palette, template sidecars and approvals ledger are fixture files written
 * into the same temp folder; the test never reads art/ or reference/ and never writes outside it.
 *
 * Sections: fixture sanity; unit checks; validator accepts; one negative case per refusal rule (each
 * must produce exactly its listed reason codes, and the pixel coordinate where one is injected);
 * CLI exit codes; placement (pixel diff 0 against an independently composed sheet, runtime RMMZ
 * sheet sizes and positions, exact coverage report, rerun sha256, DERIVED_PENDING, --replace and the
 * overwrite guard, all-or-nothing refusal, state checks); source mutants of both tools, each run on a
 * temp copy and required to make its kill case fail.
 *
 * Usage: node tools/art/test_place_art.js [--keep] [--provoke-sweep]
 *   --keep           leave the temp folder
 *   --provoke-sweep  run the suite once per check with UF_TEST_PROVOKE=place.<check> and require
 *                    that each run exits non-zero and prints FAIL for that check
 * UF_TEST_PROVOKE=place.<check>: that check is fed an input or expectation that must make it fail
 * (negative cases get the valid input; positive cases get a corrupted one; mutant checks get the
 * unmutated tool copy).
 * Output: PASS <name> / FAIL <name>: <detail>, then RESULT: <n> passed, <m> failed. Exit 1 on any failure.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { spawnSync, spawn } = require('child_process');
const { writePNG } = require('../png_util');
const { decodePNG } = require('../png_read');

const HERE = __dirname;
const FIX_DIR = path.join(HERE, 'fixtures', 'place');
const KEEP = process.argv.includes('--keep');
const PROVOKE = process.env.UF_TEST_PROVOKE || '';
const pv = name => PROVOKE === `place.${name}`;

const LEDGER_HEADING = '## SHA-256 approval ledger (v1)';
const LEDGER_HEADER = '| Date | Decision (YEA/NAY) | Entry or slot ids | File (repo path) | SHA-256 (64 lowercase hex) | Approved derived variants (ids or none) |';
const GRID = 0x00FFFF, LABEL = 0xFFFF00, MAGENTA = 0xFF00FF; // template colours, none in the palette
const MARGIN_RGB = [1, 2, 3]; // colour bytes of transparent margin pixels (must survive the copy)

let passed = 0, failed = 0;
function check(name, ok, detail) {
    if (ok) { passed++; console.log(`PASS ${name}`); }
    else { failed++; console.log(`FAIL ${name}: ${detail}`); }
}
// Runs a case function; a thrown error counts as a failure of that case.
function safe(fn, ...args) {
    try { return fn(...args); } catch (e) { return `threw: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`; }
}

const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const clone = o => JSON.parse(JSON.stringify(o));
const readJson = f => JSON.parse(fs.readFileSync(path.join(FIX_DIR, f), 'utf8'));
function put(root, rel, content) {
    const f = path.join(root, ...rel.split('/'));
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, content);
    return f;
}
let serial = 0;
const uniq = () => ++serial;

// ------------------------------------------------------------------ fixtures

const FIX = { geometry: readJson('geometry.fixture.json'), palette: readJson('palette.fixture.json'), catalogue: readJson('catalogue.fixture.json') };
const PAL = FIX.palette.colours.map(h => parseInt(h.slice(1), 16));
const ATLAS = 'ATLAS_TEST_SURFACE_B1';
const ID = {
    HUMAN: 'SURFACE_B1_CREATURE_TEST_HUMAN_V1_WALK', OGRE: 'SURFACE_B1_CREATURE_TEST_OGRE_V1_WALK', HORSE: 'SURFACE_B1_CREATURE_TEST_HORSE_V1_WALK',
    TILE: 'SURFACE_B1_TERRAIN_TEST_SOIL_V1_BASE', PROP: 'SURFACE_B1_PROP_TEST_CHEST_V1_CLOSED', HANG: 'SURFACE_B1_PROP_TEST_LANTERN_V1_HANGING',
    WALL: 'SURFACE_B1_WALL_TEST_STONE_V1_FACE', CAVE: 'LOWER1_B1_TERRAIN_TEST_CAVEFLOOR_V1_BASE', STOOL: 'TEST_NOBAND_B1_PROP_TEST_STOOL_V1_BASE',
    GIANT: 'SURFACE_B1_CREATURE_TEST_GIANT_V1_WALK', FLIPH: 'SURFACE_B1_PROP_TEST_CHEST_V1_CLOSED_FLIPH', A2: 'SURFACE_B1_TERRAIN_TEST_GRASS_V1_AUTOTILE',
    BOULDER: 'SURFACE_B1_ROCK_TEST_BOULDER_V1_BASE', RAT: 'SURFACE_B1_CREATURE_TEST_RAT_V1_WALK', TALLMED: 'SURFACE_B1_CREATURE_TEST_TALLFOLK_V1_STAND',
    STRIP1: 'SURFACE_B1_EDGE_TEST_SOIL_V1_H1', STRIP3: 'SURFACE_B1_EDGE_TEST_SOIL_V1_H3', RIM: 'SURFACE_B1_RIMSHADOW_TEST_RIM_V1_E', FACE: 'SURFACE_B1_FACE_TEST_FOLK_V1_SHEET'
};
const RAMP = k => `SURFACE_B1_RAMP_TEST_SOIL_V1_C${k}`;
// Test-side geometry: heights of every run of k consecutive strata (independent of validate_art.js).
const runsOf = (g, k) => { const r = []; for (let i = 0; i + k <= g.stratumPx.length; i++) r.push(g.stratumPx.slice(i, i + k).reduce((a, b) => a + b, 0)); return r; };
const SPLIT_C = [16, 20, 20, 20, 20]; // a valid split whose k-runs are not contiguous ranges
// Rebuilds strip and ramp envelopes from the geometry (as the Lane S builder does); slots keep their rects.
function envelopesFromGeometry(cat, g) {
    for (const e of cat.entries) {
        const m = /^GEOM_(STRATUM|RAMP)_(\d)$/.exec(e.scaleRow || '');
        if (!m) continue;
        const k = Number(m[2]), top = m[1] === 'RAMP' ? g.tilePx : 0, r = runsOf(g, k);
        Object.assign(e.envelope, { hMin: top + Math.min(...r), hTarget: top + r[0], hMax: top + Math.max(...r) });
    }
}
const entryIn = (cat, id) => cat.entries.find(e => e.id === id);

const TOOLS_REAL = { V: require('./validate_art'), P: require('./place_art'), tag: 'real', dir: HERE };
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'deus-place-art-test-'));

// ------------------------------------------------------------------ synthetic images

const rgbOf = n => [n >> 16, (n >> 8) & 255, n & 255];
function blank(w, h) {
    const data = Buffer.alloc(w * h * 4);
    for (let i = 0; i < w * h; i++) { data[i * 4] = MARGIN_RGB[0]; data[i * 4 + 1] = MARGIN_RGB[1]; data[i * 4 + 2] = MARGIN_RGB[2]; }
    return { w, h, data };
}
function setPx(img, x, y, rgb, a) {
    const o = (y * img.w + x) * 4;
    img.data[o] = rgb >> 16; img.data[o + 1] = (rgb >> 8) & 255; img.data[o + 2] = rgb & 255; img.data[o + 3] = a === undefined ? 255 : a;
}
function fillRect(img, x, y, w, h, rgb) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) setPx(img, x + i, y + j, rgb); }
const cloneImg = img => ({ w: img.w, h: img.h, data: Buffer.from(img.data) });
const pxAt = (img, x, y) => { const o = (y * img.w + x) * 4; return [...img.data.subarray(o, o + 4)]; };
const idSeed = id => [...id].reduce((a, c) => a + c.charCodeAt(0), 0) % PAL.length;

// One solid block per frame, sized to the envelope target and placed by the anchor: GROUND on the
// frame's last row, CEILING and WALL from row 0, otherwise centred.
function makeCell(entry, o = {}) {
    const s = entry.slot, f = entry.frames || {}, cols = f.cols || 1, rows = f.rows || 1;
    const fw = s.w / cols, fh = s.h / rows, env = entry.envelope;
    const img = blank(s.w, s.h);
    const seed = o.seed === undefined ? idSeed(entry.id) : o.seed;
    for (let fr = 0; fr < rows; fr++) {
        for (let fc = 0; fc < cols; fc++) {
            const idx = fr * cols + fc;
            let bw = Math.min(env.wTarget, fw), bh = Math.min(env.hTarget, fh), dx = 0, dy = 0;
            const b = o.block ? o.block(idx) || {} : {};
            if (b.bw !== undefined) bw = b.bw;
            if (b.bh !== undefined) bh = b.bh;
            dx = b.dx || 0; dy = b.dy || 0;
            const t = entry.anchor.type;
            const x = Math.floor((fw - bw) / 2) + dx;
            const y = (t === 'GROUND' ? fh - bh : t === 'CEILING' || t === 'WALL' ? 0 : Math.floor((fh - bh) / 2)) + dy;
            if (bw > 0 && bh > 0) fillRect(img, fc * fw + x, fr * fh + y, bw, bh, PAL[(seed + idx) % PAL.length]);
        }
    }
    return img;
}
const blockColour = entry => PAL[idSeed(entry.id) % PAL.length];

// 16-bit RGBA PNG (each 8-bit sample v stored as v*257), to prove 16-bit input is refused.
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xFFFFFFFF; for (const b of buf) c = CRC_TABLE[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data) {
    const b = Buffer.alloc(12 + data.length);
    b.writeUInt32BE(data.length, 0); b.write(type, 4, 'ascii'); data.copy(b, 8);
    b.writeUInt32BE(crc32(b.subarray(4, 8 + data.length)), 8 + data.length);
    return b;
}
function png16(img) {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(img.w, 0); ihdr.writeUInt32BE(img.h, 4); ihdr[8] = 16; ihdr[9] = 6;
    const raw = Buffer.alloc(img.h * (1 + img.w * 8));
    let p = 0;
    for (let y = 0; y < img.h; y++) {
        raw[p++] = 0;
        for (let i = 0; i < img.w * 4; i++) { const v = img.data[y * img.w * 4 + i]; raw[p++] = v; raw[p++] = v; }
    }
    return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function writeCell(dir, name, img, raw) {
    const buf = raw || writePNG(img.data, img.w, img.h);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${name}.png`);
    fs.writeFileSync(file, buf);
    return { file, sha: sha(buf), img };
}

// ------------------------------------------------------------------ worlds (temp repo roots)

const yea = (ids, hash, variants) => ({ decision: 'YEA', ids, file: `art/approved/${String(ids).split(',')[0].replace(/:/g, '_')}.png`, sha: hash, variants: variants || 'none' });
function ledgerDoc(rows, o = {}) {
    const L = ['# ART APPROVALS (TEST_ fixture)', '', 'TEST_ legacy table (no hashes); the tools ignore it.', '',
        '| Date | Asset ID | Description | Master File | Review Notes |', '| :--- | :--- | :--- | :--- | :--- |',
        `| 2026-09-18 | \`${ID.PROP}\` | TEST_ legacy row${o.legacySha ? ` ${o.legacySha}` : ''} | \`art/masters/test_chest.png\` | ignored |`, ''];
    const section = [o.heading || LEDGER_HEADING, '', 'TEST_ ledger. Owner rows only.', '', o.header || LEDGER_HEADER, '| :--- | :--- | :--- | :--- | :--- | :--- |'];
    for (const r of rows) section.push(`| ${r.date || '2026-09-26'} | ${r.decision} | \`${r.ids}\` | \`${r.file}\` | \`${r.sha}\` | ${r.variants} |`);
    if (o.extra) section.push(...o.extra);
    if (o.noLedger) { /* legacy table only */ }
    else if (o.fenced) L.push('```text', ...section, '```');
    else if (o.commentWrap) L.push('<!-- TEST_ hidden from readers', ...section, '-->');
    else L.push(...section);
    if (o.second) L.push('', ...section);
    L.push('', '## Later section', '', 'TEST_ text after the ledger.', '');
    return (o.bom ? '\uFEFF' : '') + L.join(o.eol || '\n');
}

const worldCache = new Map();
// mods: geometry(g), catalogue(cat, g) before the templates are written (the templates follow it),
// template(sidecar), dropTemplate(sheetId), drift(cat) after the templates (catalogue disagrees).
function makeWorld(name, mods = {}) {
    if (worldCache.has(name)) return worldCache.get(name);
    const root = path.join(TMP, 'w', name);
    const geometry = clone(FIX.geometry);
    if (mods.geometry) mods.geometry(geometry);
    const geomText = JSON.stringify(geometry, null, 2) + '\n';
    put(root, 'art/catalogue/geometry.json', geomText);
    const palText = FIX.palette.colours.join('\n') + '\n';
    put(root, 'art/palette/deus_master_world_palette_v1.hex', palText);
    const cat = clone(FIX.catalogue);
    cat.geometry.sha256 = sha(geomText);
    cat.palette.sha256 = sha(palText);
    if (mods.catalogue) mods.catalogue(cat, geometry);
    for (const sheet of cat.sheets) {
        const side = {
            sheetId: sheet.sheetId, w: sheet.w, h: sheet.h, gridPx: sheet.gridPx, bg: 'transparent',
            gridColour: '#00FFFF', labelColour: '#FFFF00', geometrySha256: cat.geometry.sha256, stratumPx: geometry.stratumPx,
            slots: cat.entries.filter(e => e.slot && e.slot.sheetId === sheet.sheetId).map(e => ({
                slotId: e.slot.slotId, entryId: e.id, scaleRow: e.scaleRow, frameClass: e.frameClass, footprint: e.footprint, anchor: e.anchor,
                x: e.slot.x, y: e.slot.y, w: e.slot.w, h: e.slot.h
            }))
        };
        if (mods.template) mods.template(side);
        if (mods.dropTemplate !== sheet.sheetId) put(root, `art/templates/${sheet.sheetId}.json`, JSON.stringify(side, null, 2) + '\n');
    }
    if (mods.drift) mods.drift(cat);
    const catalogueFile = put(root, 'art/catalogue/catalogue.json', JSON.stringify(cat, null, 2) + '\n');
    const cells = new Map();
    for (const e of cat.entries) {
        if (!e.slot || (e.variants && e.variants.derivedFrom)) continue;
        cells.set(e.id, writeCell(path.join(root, 'cells'), e.id, makeCell(e)));
    }
    const prop = entryIn(cat, ID.PROP), hang = entryIn(cat, ID.HANG);
    // HANG is approved by slot id; PROP's row also approves its flipH variant.
    const rows = [...cells].map(([id, c]) => yea(id === ID.HANG ? hang.slot.slotId : id, c.sha, id === ID.PROP ? ID.FLIPH : 'none'));
    const approvalsFile = put(root, 'art/APPROVALS.md', ledgerDoc(rows));
    const w = { name, root, cat, geometry, cells, rows, approvalsFile, catalogueFile, prop, templatesDir: path.join(root, 'art', 'templates') };
    worldCache.set(name, w);
    return w;
}
const BASE = () => makeWorld('base', {
    template: s => { if (s.sheetId === ATLAS) s.slots.push({ slotId: `${ATLAS}:0099`, entryId: 'TEST_TEMPLATE_ONLY', x: 528, y: 480, w: 48, h: 48 }); }
});

// A variant of an entry's good cell (mutate() edits a copy, or img replaces it), written under
// <world>/neg with its own approvals file. approve: false leaves it out of the ledger.
function variant(w, name, entryId, o = {}) {
    let img = o.img || cloneImg(w.cells.get(entryId).img);
    if (o.mutate) o.mutate(img);
    const c = writeCell(path.join(w.root, 'neg'), name, img, o.raw ? o.raw(img) : null);
    const rows = o.rows ? o.rows(c) : w.rows.concat(o.approve === false ? [] : [yea(entryId, c.sha)]);
    const approvals = put(w.root, `neg/${name}.APPROVALS.md`, ledgerDoc(rows, o.ledger || {}));
    return { file: c.file, approvals, sha: c.sha, img };
}
function approvalsOnly(w, name, rows, ledgerOpts) {
    return { file: w.cells.get(ID.PROP).file, approvals: put(w.root, `neg/${name}.APPROVALS.md`, ledgerDoc(rows, ledgerOpts || {})) };
}
const withoutProp = w => w.rows.filter(r => r.ids !== ID.PROP);

// ------------------------------------------------------------------ tool calls

const isRefusal = e => e && typeof e.code === 'string' && e.constructor && e.constructor.name === 'Refusal';
function runValidate(T, w, entryId, file, o = {}) {
    try {
        const ctx = T.V.loadContext({ catalogue: o.catalogue || w.catalogueFile, approvals: o.approvals || w.approvalsFile, root: w.root, templates: o.templates, geometry: o.geometry });
        return T.V.validateFile(ctx, file, entryId);
    } catch (e) {
        if (!isRefusal(e)) throw e;
        return { result: 'REFUSED', codes: [e.code], reasons: [{ code: e.code, message: e.message, pixels: [] }] };
    }
}
function expectRefusal(res, codes, pixel, msgPart) {
    if (res.result !== 'REFUSED') return `accepted; expected ${codes.join(' + ')}`;
    const got = [...res.codes].sort().join(','), want = [...codes].sort().join(',');
    if (got !== want) return `codes [${got}], expected [${want}]: ${res.reasons.map(r => `${r.code}: ${r.message}`).join(' | ')}`;
    if (pixel) {
        const r = res.reasons.find(x => x.code === codes[0]);
        if (!r.pixels.some(p => p[0] === pixel[0] && p[1] === pixel[1])) return `${codes[0]} did not report pixel (${pixel}); got ${JSON.stringify(r.pixels)}`;
    }
    if (msgPart && !res.reasons.some(r => r.message.includes(msgPart))) return `no reason message mentions "${msgPart}": ${res.reasons.map(r => r.message).join(' | ')}`;
    return null;
}
function runPlace(T, w, inDir, outDir, o = {}) {
    return T.P.placeArt({ catalogue: o.catalogue || w.catalogueFile, approvals: o.approvals || w.approvalsFile, in: inDir, out: outDir, replace: o.replace || [], root: w.root });
}
function inDir(w, name, ids, extra = {}) {
    const dir = path.join(w.root, 'in', `${name}_${uniq()}`);
    fs.mkdirSync(dir, { recursive: true });
    for (const id of ids) fs.copyFileSync(w.cells.get(id).file, path.join(dir, `${id}.png`));
    for (const [n, src] of Object.entries(extra)) fs.copyFileSync(src, path.join(dir, n));
    return dir;
}
const outDir = (w, name, T) => path.join(w.root, 'out', `${name}_${T.tag}_${uniq()}`);
const refusalCodes = res => (res.report.refusals || []).flatMap(r => r.codes);
function snapshot(dir) {
    const out = {};
    if (!fs.existsSync(dir)) return out;
    const walk = (d, rel) => {
        for (const n of fs.readdirSync(d).sort()) {
            const p = path.join(d, n), r = rel ? `${rel}/${n}` : n;
            if (fs.statSync(p).isDirectory()) walk(p, r); else out[r] = sha(fs.readFileSync(p));
        }
    };
    walk(dir, '');
    return out;
}
const sameSnap = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function diffCount(img, exp) {
    if (img.width !== exp.w || img.height !== exp.h) return Infinity;
    let n = 0;
    for (let i = 0; i < exp.w * exp.h; i++) {
        const o = i * 4;
        if (img.data[o] !== exp.data[o] || img.data[o + 1] !== exp.data[o + 1] || img.data[o + 2] !== exp.data[o + 2] || img.data[o + 3] !== exp.data[o + 3]) n++;
    }
    return n;
}
// Test-side composition, pixel by pixel, independent of place_art's copy code.
function compose(w, h, parts) {
    const c = { w, h, data: Buffer.alloc(w * h * 4) };
    for (const { img, x, y } of parts) {
        for (let j = 0; j < img.h; j++) for (let i = 0; i < img.w; i++) {
            const tx = x + i, ty = y + j;
            if (tx < 0 || ty < 0 || tx >= w || ty >= h) continue;
            for (let k = 0; k < 4; k++) c.data[(ty * w + tx) * 4 + k] = img.data[(j * img.w + i) * 4 + k];
        }
    }
    return c;
}
function runNode(script, args) {
    const env = Object.assign({}, process.env);
    delete env.UF_TEST_PROVOKE;
    return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', env });
}

// ------------------------------------------------------------------ case table (name -> (T, provoked) => null | failure)

const CASES = {};
const PLACED_IDS = w => [...w.cells.keys()].filter(id => id !== ID.CAVE && id !== ID.STOOL);

// Negative validator cases: each must refuse with exactly `codes`. Provoked, the case validates the
// base world's valid cell for the entry (PROP when the entry has none), which must be accepted.
function negCase(name, spec) {
    CASES[name] = (T, provoked) => {
        if (provoked) {
            const b = BASE(), id = b.cells.has(spec.entry) ? spec.entry : ID.PROP;
            return expectRefusal(runValidate(T, b, id, b.cells.get(id).file), spec.codes, spec.pixel, spec.msg);
        }
        const w = spec.world ? spec.world() : BASE();
        const built = spec.build(w);
        return expectRefusal(runValidate(T, w, spec.entry, built.file, built), spec.codes, spec.pixel, spec.msg);
    };
}
const propBlock = () => { // PROP's block rect inside its 48x48 cell (GROUND anchor, centred)
    const e = entryIn(FIX.catalogue, ID.PROP), env = e.envelope;
    return { x: Math.floor((48 - env.wTarget) / 2), y: 48 - env.hTarget, w: env.wTarget, h: env.hTarget };
};

// approvals
negCase('neg.approval_missing', { entry: ID.PROP, codes: ['APPROVAL_MISSING'], build: w => approvalsOnly(w, 'approval_missing', withoutProp(w)) });
negCase('neg.approval_nay', { entry: ID.PROP, codes: ['APPROVAL_NAY', 'APPROVAL_MISSING'],
    build: w => approvalsOnly(w, 'approval_nay', withoutProp(w).concat([Object.assign(yea(ID.PROP, w.cells.get(ID.PROP).sha), { decision: 'NAY' })])) });
negCase('neg.approval_hash_of_other_file', { entry: ID.PROP, codes: ['APPROVAL_MISSING'], build: w => {
    const other = variant(w, 'prop_other_file', ID.PROP, { img: makeCell(w.prop, { seed: idSeed(ID.PROP) + 5 }), approve: false });
    return approvalsOnly(w, 'approval_other_file', withoutProp(w).concat([yea(ID.PROP, other.sha)]));
} });
negCase('neg.approval_for_other_entry', { entry: ID.PROP, codes: ['APPROVAL_MISSING'], msg: ID.STOOL,
    build: w => approvalsOnly(w, 'approval_other_entry', withoutProp(w).concat([yea(ID.STOOL, w.cells.get(ID.PROP).sha)])) });
negCase('neg.approval_conflict_yea_nay', { entry: ID.PROP, codes: ['APPROVAL_NAY', 'APPROVAL_CONFLICT'],
    build: w => approvalsOnly(w, 'approval_conflict', w.rows.concat([Object.assign(yea(ID.PROP, w.cells.get(ID.PROP).sha), { decision: 'NAY' })])) });
negCase('neg.approval_conflict_variants', { entry: ID.PROP, codes: ['APPROVAL_CONFLICT'],
    build: w => approvalsOnly(w, 'approval_variants', w.rows.concat([yea(ID.PROP, w.cells.get(ID.PROP).sha, 'none')])) });
negCase('neg.ledger_uppercase_hash', { entry: ID.PROP, codes: ['LEDGER_MALFORMED'],
    build: w => approvalsOnly(w, 'ledger_upper', w.rows.concat([yea(ID.STOOL, w.cells.get(ID.STOOL).sha.toUpperCase())])) });
negCase('neg.ledger_short_hash', { entry: ID.PROP, codes: ['LEDGER_MALFORMED'],
    build: w => approvalsOnly(w, 'ledger_short', w.rows.concat([yea(ID.STOOL, w.cells.get(ID.STOOL).sha.slice(1))])) });
negCase('neg.ledger_bad_decision', { entry: ID.PROP, codes: ['LEDGER_MALFORMED'],
    build: w => approvalsOnly(w, 'ledger_decision', w.rows.concat([Object.assign(yea(ID.STOOL, w.cells.get(ID.STOOL).sha), { decision: 'Yes' })])) });
negCase('neg.ledger_bad_date', { entry: ID.PROP, codes: ['LEDGER_MALFORMED'],
    build: w => approvalsOnly(w, 'ledger_date', w.rows.concat([Object.assign(yea(ID.STOOL, w.cells.get(ID.STOOL).sha), { date: '2026-02-30' })])) });
negCase('neg.ledger_bad_header', { entry: ID.PROP, codes: ['LEDGER_MALFORMED', 'APPROVAL_MISSING'],
    build: w => approvalsOnly(w, 'ledger_header', w.rows, { header: '| Date | Entry or slot ids | Decision (YEA/NAY) | File (repo path) | SHA-256 (64 lowercase hex) | Approved derived variants (ids or none) |' }) });
negCase('neg.ledger_legacy_rows_only', { entry: ID.PROP, codes: ['APPROVAL_MISSING'],
    build: w => approvalsOnly(w, 'ledger_legacy', w.rows, { noLedger: true, legacySha: w.cells.get(ID.PROP).sha }) });
negCase('neg.ledger_only_in_code_fence', { entry: ID.PROP, codes: ['APPROVAL_MISSING'], build: w => approvalsOnly(w, 'ledger_fenced', w.rows, { fenced: true }) });
negCase('neg.ledger_heading_twice', { entry: ID.PROP, codes: ['LEDGER_MALFORMED', 'APPROVAL_MISSING'], build: w => approvalsOnly(w, 'ledger_twice', w.rows, { second: true }) });
negCase('neg.ledger_heading_near_miss', { entry: ID.PROP, codes: ['LEDGER_MALFORMED', 'APPROVAL_MISSING'],
    build: w => approvalsOnly(w, 'ledger_near', w.rows, { heading: '## SHA-256 Approval Ledger (v1)' }) });
const stoolRow = w => `| 2026-09-26 | YEA | \`${ID.STOOL}\` | \`art/approved/stool.png\` | \`${w.cells.get(ID.STOOL).sha}\` | none |`;
negCase('neg.ledger_row_in_html_comment', { entry: ID.PROP, codes: ['LEDGER_MALFORMED'], msg: 'HTML comments',
    build: w => approvalsOnly(w, 'ledger_comment', w.rows, { extra: [`<!-- ${stoolRow(w)} -->`] }) });
negCase('neg.ledger_inside_html_comment', { entry: ID.PROP, codes: ['LEDGER_MALFORMED', 'APPROVAL_MISSING'], msg: 'inside an HTML comment',
    build: w => approvalsOnly(w, 'ledger_comment_wrap', w.rows, { commentWrap: true }) });
negCase('neg.ledger_row_indented_as_code', { entry: ID.PROP, codes: ['LEDGER_MALFORMED'], msg: 'indented',
    build: w => approvalsOnly(w, 'ledger_indent', w.rows, { extra: [`    ${stoolRow(w)}`] }) });

// file size, alpha, palette, template residue, opacity, PNG format
negCase('neg.dims_47x48', { entry: ID.TILE, codes: ['DIMS_MISMATCH'], build: w => {
    const src = w.cells.get(ID.TILE).img, img = blank(47, 48);
    for (let y = 0; y < 48; y++) src.data.copy(img.data, y * 47 * 4, y * 48 * 4, y * 48 * 4 + 47 * 4);
    return variant(w, 'dims_47x48', ID.TILE, { img });
} });
negCase('neg.alpha_128', { entry: ID.PROP, codes: ['ALPHA_NOT_BINARY'], pixel: [24, 40], build: w => variant(w, 'alpha_128', ID.PROP, { mutate: img => { img.data[(40 * 48 + 24) * 4 + 3] = 128; } }) });
negCase('neg.alpha_owner_open_still_binary', { entry: ID.PROP, codes: ['ALPHA_NOT_BINARY'], pixel: [24, 40], msg: 'OWNER_OPEN',
    world: () => makeWorld('alpha_owner_open', { catalogue: cat => { entryIn(cat, ID.PROP).alphaMode = 'OWNER_OPEN'; } }),
    build: w => variant(w, 'alpha_owner_open', ID.PROP, { mutate: img => { img.data[(40 * 48 + 24) * 4 + 3] = 128; } }) });
negCase('neg.off_palette_pixel', { entry: ID.PROP, codes: ['OFF_PALETTE'], pixel: [25, 41],
    build: w => variant(w, 'off_palette', ID.PROP, { mutate: img => { const o = (41 * 48 + 25) * 4 + 2; img.data[o] ^= 1; } }) });
negCase('neg.template_grid_colour_pixel', { entry: ID.PROP, codes: ['TEMPLATE_RESIDUE', 'OFF_PALETTE'], pixel: [20, 30],
    build: w => variant(w, 'grid_pixel', ID.PROP, { mutate: img => setPx(img, 20, 30, GRID) }) });
negCase('neg.template_label_colour_pixel', { entry: ID.PROP, codes: ['TEMPLATE_RESIDUE', 'OFF_PALETTE'], pixel: [21, 31],
    build: w => variant(w, 'label_pixel', ID.PROP, { mutate: img => setPx(img, 21, 31, LABEL) }) });
negCase('neg.template_magenta_bg_pixel', { entry: ID.PROP, codes: ['TEMPLATE_RESIDUE', 'OFF_PALETTE'], pixel: [22, 32],
    world: () => makeWorld('bg_magenta', { template: s => { s.bg = 'magenta'; } }),
    build: w => variant(w, 'magenta_pixel', ID.PROP, { mutate: img => setPx(img, 22, 32, MAGENTA) }) });
// The residue rule on its own: a (bad) template whose grid colour is a palette colour.
const RESIDUE_IN_PAL = PAL[(idSeed(ID.PROP) + 6) % PAL.length];
negCase('neg.template_residue_isolated', { entry: ID.PROP, codes: ['TEMPLATE_RESIDUE'], pixel: [23, 33],
    world: () => makeWorld('grid_in_palette', { template: s => { if (s.sheetId === ATLAS) s.gridColour = '#' + RESIDUE_IN_PAL.toString(16).padStart(6, '0'); } }),
    build: w => variant(w, 'residue_isolated', ID.PROP, { mutate: img => setPx(img, 23, 33, RESIDUE_IN_PAL) }) });
negCase('neg.template_sidecar_missing', { entry: ID.PROP, codes: ['TEMPLATE_SIDECAR_MISSING'],
    world: () => makeWorld('no_template', { dropTemplate: ATLAS }), build: w => ({ file: w.cells.get(ID.PROP).file }) });
negCase('neg.template_sidecar_wrong_size', { entry: ID.PROP, codes: ['TEMPLATE_SIDECAR_INVALID'],
    world: () => makeWorld('template_size', { template: s => { if (s.sheetId === ATLAS) s.w -= 1; } }), build: w => ({ file: w.cells.get(ID.PROP).file }) });
for (const [suffix, dx, dy] of [['x_plus_1', 1, 0], ['x_minus_1', -1, 0], ['y_plus_1', 0, 1], ['y_minus_1', 0, -1]]) {
    negCase(`neg.rect_${suffix}`, { entry: ID.PROP, codes: ['SLOT_RECT_MISMATCH'],
        world: () => makeWorld(`rect_${suffix}`, { drift: cat => { const s = entryIn(cat, ID.PROP).slot; s.x += dx; s.y += dy; } }),
        build: w => ({ file: w.cells.get(ID.PROP).file }) });
}
negCase('neg.tile_with_hole', { entry: ID.TILE, codes: ['TILE_NOT_OPAQUE'], pixel: [20, 20], build: w => variant(w, 'tile_hole', ID.TILE, { mutate: img => { img.data[(20 * 48 + 20) * 4 + 3] = 0; } }) });
negCase('neg.png_16bit', { entry: ID.PROP, codes: ['PNG_16BIT'], build: w => variant(w, 'png16', ID.PROP, { raw: png16 }) });
negCase('neg.png_corrupt', { entry: ID.PROP, codes: ['PNG_INVALID'], build: w => variant(w, 'png_corrupt', ID.PROP, { raw: () => Buffer.from('TEST_ not a png') }) });
negCase('neg.png_huge_header_not_decoded', { entry: ID.PROP, codes: ['DIMS_MISMATCH'], msg: 'not decoded', build: w => variant(w, 'png_huge', ID.PROP, {
    raw: () => { const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(60000, 0); ihdr.writeUInt32BE(60000, 4); ihdr[8] = 8; ihdr[9] = 6; return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IEND', Buffer.alloc(0))]); }
}) });

// scale envelope and anchors
const env = id => entryIn(FIX.catalogue, id).envelope;
negCase('neg.envelope_w_1px_over_max', { entry: ID.PROP, codes: ['SCALE_OUT_OF_ENVELOPE'], build: w => variant(w, 'env_w_over', ID.PROP, { img: makeCell(w.prop, { block: () => ({ bw: env(ID.PROP).wMax + 1 }) }) }) });
negCase('neg.envelope_h_1px_over_max', { entry: ID.PROP, codes: ['SCALE_OUT_OF_ENVELOPE'], build: w => variant(w, 'env_h_over', ID.PROP, { img: makeCell(w.prop, { block: () => ({ bh: env(ID.PROP).hMax + 1 }) }) }) });
negCase('neg.envelope_w_1px_under_min', { entry: ID.PROP, codes: ['SCALE_OUT_OF_ENVELOPE'], build: w => variant(w, 'env_w_under', ID.PROP, { img: makeCell(w.prop, { block: () => ({ bw: env(ID.PROP).wMin - 1 }) }) }) });
negCase('neg.envelope_one_frame_of_12', { entry: ID.HUMAN, codes: ['SCALE_OUT_OF_ENVELOPE'], msg: 'frame 7:',
    build: w => variant(w, 'env_frame7', ID.HUMAN, { img: makeCell(entryIn(w.cat, ID.HUMAN), { block: i => (i === 7 ? { bh: env(ID.HUMAN).hMax + 1 } : {}) }) }) });
negCase('neg.empty_frame', { entry: ID.HUMAN, codes: ['SCALE_OUT_OF_ENVELOPE', 'ANCHOR_GROUND'], msg: 'nothing drawn',
    build: w => variant(w, 'empty_frame', ID.HUMAN, { img: makeCell(entryIn(w.cat, ID.HUMAN), { block: i => (i === 0 ? { bw: 0 } : {}) }) }) });
negCase('neg.ground_baseline_1px_high', { entry: ID.PROP, codes: ['ANCHOR_GROUND'], msg: 'lowest drawn row 46',
    build: w => variant(w, 'ground_high', ID.PROP, { img: makeCell(w.prop, { block: () => ({ dy: -1 }) }) }) });
negCase('neg.ceiling_anchor_1px_low', { entry: ID.HANG, codes: ['ANCHOR_CEILING'], msg: 'highest drawn row 1',
    build: w => variant(w, 'ceiling_low', ID.HANG, { img: makeCell(entryIn(w.cat, ID.HANG), { block: () => ({ dy: 1 }) }), rows: c => w.rows.concat([yea(entryIn(w.cat, ID.HANG).slot.slotId, c.sha)]) }) });

// frame classes (sprite frame, stored apart from the footprint)
const resized = (w, id, sw, sh, envOver) => Object.assign(clone(entryIn(w.cat, id)), { slot: Object.assign(clone(entryIn(w.cat, id).slot), { w: sw, h: sh }) }, envOver ? { envelope: Object.assign(clone(entryIn(w.cat, id).envelope), envOver) } : {});
negCase('neg.large_tall_file_at_48x48', { entry: ID.OGRE, codes: ['DIMS_MISMATCH'], build: w => variant(w, 'ogre_48x48', ID.OGRE, { img: makeCell(resized(w, ID.OGRE, 144, 192)) }) });
negCase('neg.large_tall_file_at_96x96', { entry: ID.OGRE, codes: ['DIMS_MISMATCH'], build: w => variant(w, 'ogre_96x96', ID.OGRE, { img: makeCell(resized(w, ID.OGRE, 288, 384)) }) });
negCase('neg.large_long_file_at_48x96', { entry: ID.HORSE, codes: ['DIMS_MISMATCH'], build: w => variant(w, 'horse_48x96', ID.HORSE, { img: makeCell(resized(w, ID.HORSE, 144, 384)) }) });
negCase('neg.medium_file_at_48x64', { entry: ID.HUMAN, codes: ['DIMS_MISMATCH'], build: w => variant(w, 'human_48x64', ID.HUMAN, { img: makeCell(resized(w, ID.HUMAN, 144, 256)) }) });
negCase('neg.large_tall_slot_48x48', { entry: ID.OGRE, codes: ['FRAME_CLASS_MISMATCH'],
    world: () => makeWorld('ogre_slot_48x48', { catalogue: cat => { const e = entryIn(cat, ID.OGRE); e.slot.h = 192; e.envelope = { wMin: 30, wTarget: 38, wMax: 48, hMin: 30, hTarget: 40, hMax: 48 }; } }),
    build: w => ({ file: w.cells.get(ID.OGRE).file }) });
negCase('neg.large_tall_slot_96x96', { entry: ID.OGRE, codes: ['FRAME_CLASS_MISMATCH'],
    world: () => makeWorld('ogre_slot_96x96', { catalogue: cat => { entryIn(cat, ID.OGRE).slot.w = 288; } }), build: w => ({ file: w.cells.get(ID.OGRE).file }) });
negCase('neg.large_long_slot_48x96', { entry: ID.HORSE, codes: ['FRAME_CLASS_MISMATCH'],
    world: () => makeWorld('horse_slot_48x96', { catalogue: cat => { const e = entryIn(cat, ID.HORSE); e.slot.w = 144; e.slot.h = 384; e.envelope = { wMin: 30, wTarget: 40, wMax: 48, hMin: 30, hTarget: 38, hMax: 48 }; } }),
    build: w => ({ file: w.cells.get(ID.HORSE).file }) });
const addTallMedium = cat => cat.entries.push(Object.assign(clone(entryIn(cat, ID.HUMAN)), {
    id: ID.TALLMED, frameClass: 'TALL_MEDIUM', scaleRow: 'TEST_CHART_TALLFOLK', frames: null, runtime: null,
    envelope: { wMin: 10, wTarget: 16, wMax: 24, hMin: 43, hTarget: 50, hMax: 56 }, slot: { sheetId: ATLAS, slotId: `${ATLAS}:0015`, x: 144, y: 0, w: 48, h: 64 }
}));
negCase('neg.tall_medium_48x64_while_disabled', { entry: ID.TALLMED, codes: ['FRAME_CLASS_DISABLED'],
    world: () => makeWorld('tall_medium_off', { catalogue: addTallMedium }), build: w => ({ file: w.cells.get(ID.TALLMED).file }) });
negCase('neg.huge_frame_owner_open_with_slot', { entry: ID.GIANT, codes: ['FRAME_CLASS_OWNER_OPEN'],
    world: () => makeWorld('giant_slot', { catalogue: cat => { const e = entryIn(cat, ID.GIANT); e.frames = null; e.envelope = { wMin: 10, wTarget: 16, wMax: 24, hMin: 10, hTarget: 16, hMax: 24 }; e.slot = { sheetId: ATLAS, slotId: `${ATLAS}:0016`, x: 192, y: 0, w: 48, h: 48 }; } }),
    build: w => ({ file: w.cells.get(ID.GIANT).file }) });

// geometry-derived heights (stratumPx / layerPx, never literals)
negCase('neg.ramp_height_ignores_stratumPx', { entry: RAMP(2), codes: ['GEOM_HEIGHT_MISMATCH'], msg: 'stratumPx',
    world: () => makeWorld('ramp_literal', { catalogue: cat => { Object.assign(entryIn(cat, RAMP(2)).envelope, { hMin: 96, hTarget: 96, hMax: 96 }); } }),
    build: w => ({ file: w.cells.get(RAMP(2)).file }) });
// Envelope 86..96 (96 a literal two tiles); the art is drawn 86, an allowed height, so only the envelope rule fires.
negCase('neg.ramp_envelope_ignores_stratumPx', { entry: RAMP(2), codes: ['GEOM_HEIGHT_MISMATCH'], msg: 'envelope height 86..96',
    world: () => makeWorld('ramp_env_literal', { catalogue: cat => { Object.assign(entryIn(cat, RAMP(2)).envelope, { hMax: 96 }); } }),
    build: w => ({ file: w.cells.get(RAMP(2)).file }) });
// Split [16,20,20,20,20]: ramp cell 1 may be 64 or 68 px; 66 lies inside the envelope 64..68 but is not a stratum run.
const splitC = () => makeWorld('split_c_rebuilt', { geometry: g => { g.stratumPx = SPLIT_C.slice(); }, catalogue: envelopesFromGeometry });
negCase('neg.ramp_drawn_height_not_a_run', { entry: RAMP(1), codes: ['GEOM_HEIGHT_MISMATCH'], msg: 'drawn 66',
    world: splitC, build: w => variant(w, 'ramp_66', RAMP(1), { img: makeCell(entryIn(w.cat, RAMP(1)), { block: () => ({ bh: 66 }) }) }) });
negCase('neg.wall_face_height_ignores_layerPx', { entry: ID.WALL, codes: ['GEOM_HEIGHT_MISMATCH'], msg: 'layerPx',
    world: () => makeWorld('wall_literal', { catalogue: cat => { const e = entryIn(cat, ID.WALL); e.slot.h = 48; Object.assign(e.envelope, { hMin: 48, hTarget: 48, hMax: 48 }); } }),
    build: w => ({ file: w.cells.get(ID.WALL).file }) });
// stratumPx changed, catalogue not rebuilt: the ramp drawn at the old 67 px is no longer a run (64 or 68).
negCase('neg.stratumPx_changed_old_ramp_refused', { entry: RAMP(1), codes: ['GEOM_HEIGHT_MISMATCH'], msg: 'drawn 67',
    world: () => makeWorld('split_c_old_catalogue', { geometry: g => { g.stratumPx = SPLIT_C.slice(); } }), build: w => ({ file: w.cells.get(RAMP(1)).file }) });
negCase('neg.stratumPx_zero_stratum', { entry: ID.PROP, codes: ['GEOMETRY_INVALID'], world: () => makeWorld('split_zero', { geometry: g => { g.stratumPx = [24, 24, 24, 24, 0]; } }), build: w => ({ file: w.cells.get(ID.PROP).file }) });
negCase('neg.stratumPx_sum_not_layerPx', { entry: ID.PROP, codes: ['GEOMETRY_INVALID'], world: () => makeWorld('split_sum', { geometry: g => { g.stratumPx = [20, 19, 19, 19, 20]; } }), build: w => ({ file: w.cells.get(ID.PROP).file }) });
negCase('neg.stratumPx_wrong_count', { entry: ID.PROP, codes: ['GEOMETRY_INVALID'], world: () => makeWorld('split_count', { geometry: g => { g.stratumPx = [48, 48]; } }), build: w => ({ file: w.cells.get(ID.PROP).file }) });
negCase('neg.geometry_hash_mismatch', { entry: ID.PROP, codes: ['GEOMETRY_HASH_MISMATCH'], world: () => makeWorld('geom_hash', { drift: cat => { cat.geometry.sha256 = '0'.repeat(64); } }), build: w => ({ file: w.cells.get(ID.PROP).file }) });
negCase('neg.geometry_flag_still_hash_checked', { entry: ID.PROP, codes: ['GEOMETRY_HASH_MISMATCH'], build: w => {
    const g = clone(w.geometry); g.stratumPx = SPLIT_C.slice();
    return { file: w.cells.get(ID.PROP).file, geometry: put(w.root, 'neg/geometry_other.json', JSON.stringify(g, null, 2) + '\n') };
} });
negCase('neg.palette_hash_mismatch', { entry: ID.PROP, codes: ['PALETTE_HASH_MISMATCH'], world: () => makeWorld('pal_hash', { drift: cat => { cat.palette.sha256 = 'f'.repeat(64); } }), build: w => ({ file: w.cells.get(ID.PROP).file }) });

// tile class, frame class present, ledger table edges, PNG bombs
negCase('neg.autotile_with_hole', { entry: ID.A2, codes: ['TILE_NOT_OPAQUE'], pixel: [50, 70], build: w => variant(w, 'a2_hole', ID.A2, { mutate: img => { img.data[(70 * 96 + 50) * 4 + 3] = 0; } }) });
negCase('neg.frame_class_missing', { entry: ID.HUMAN, codes: ['FRAME_CLASS_MISSING'],
    world: () => makeWorld('no_frame_class', { catalogue: cat => { entryIn(cat, ID.HUMAN).frameClass = null; } }), build: w => ({ file: w.cells.get(ID.HUMAN).file }) });
const nayLine = w => `2026-09-27 | NAY | \`${ID.PROP}\` | \`art/approved/chest.png\` | \`${w.cells.get(ID.PROP).sha}\` | none`;
negCase('neg.ledger_row_without_leading_pipe', { entry: ID.PROP, codes: ['LEDGER_MALFORMED'], msg: 'does not start with',
    build: w => approvalsOnly(w, 'ledger_pipeless_row', w.rows, { extra: [nayLine(w)] }) });
negCase('neg.ledger_pipeless_second_table', { entry: ID.PROP, codes: ['LEDGER_MALFORMED'], msg: 'separator row outside',
    build: w => approvalsOnly(w, 'ledger_pipeless_table', w.rows, { extra: ['', LEDGER_HEADER.slice(2, -2), '--- | --- | --- | --- | --- | ---', nayLine(w)] }) });
negCase('neg.png_inflate_bomb', { entry: ID.PROP, codes: ['PNG_INVALID'], msg: 'inflates past', build: w => variant(w, 'png_bomb', ID.PROP, {
    raw: () => { const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(48, 0); ihdr.writeUInt32BE(48, 4); ihdr[8] = 8; ihdr[9] = 6; return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.alloc(8 * 1024 * 1024))), chunk('IEND', Buffer.alloc(0))]); }
}) });

// entries that own no paint slot
negCase('neg.unknown_entry', { entry: 'TEST_NOT_AN_ENTRY', codes: ['ENTRY_NOT_FOUND'], build: w => ({ file: w.cells.get(ID.PROP).file }) });
negCase('neg.derived_variant_row', { entry: ID.FLIPH, codes: ['ENTRY_NOT_PLACEABLE'], msg: 'DERIVED_PENDING', build: w => ({ file: w.cells.get(ID.PROP).file }) });
negCase('neg.huge_no_slot', { entry: ID.GIANT, codes: ['ENTRY_NOT_PLACEABLE'], build: w => ({ file: w.cells.get(ID.PROP).file }) });

// ------------------------------------------------------------------ placement cases

// Places every good cell of the base world except CAVE and STOOL (left empty for the coverage check).
function placeAllGood(T, provoked) {
    const w = BASE();
    const extra = provoked ? { [`${ID.PROP}.png`]: variant(w, 'all_good_provoked', ID.PROP, { mutate: img => { img.data[(41 * 48 + 25) * 4] ^= 1; } }).file } : {};
    const ids = PLACED_IDS(w).filter(id => !(provoked && id === ID.PROP));
    const out = outDir(w, 'all', T);
    return { w, out, res: runPlace(T, w, inDir(w, 'all', ids, extra), out) };
}
function expectedSheets(w, ids) {
    const bySheet = new Map();
    for (const id of ids) {
        const e = entryIn(w.cat, id);
        if (!bySheet.has(e.slot.sheetId)) bySheet.set(e.slot.sheetId, []);
        bySheet.get(e.slot.sheetId).push({ img: w.cells.get(id).img, x: e.slot.x, y: e.slot.y });
    }
    const out = new Map();
    for (const [sheetId, parts] of bySheet) { const s = w.cat.sheets.find(x => x.sheetId === sheetId); out.set(sheetId, compose(s.w, s.h, parts)); }
    return out;
}
// RMMZ runtime files, sizes from docs/RMMZ_ASSET_SPEC.md and positions worked out by hand from
// Tilemap in game/js/rmmz_core.js (A5 tile 1539 -> column 3; B tile 17 -> column 1, row 2).
const RT_EXPECT = {
    'img/characters/$TEST_Horse.png': { w: 288, h: 192, parts: [[ID.HORSE, 0, 0]] },
    'img/characters/$TEST_Human.png': { w: 144, h: 192, parts: [[ID.HUMAN, 0, 0]] },
    'img/characters/$TEST_Ogre.png': { w: 144, h: 384, parts: [[ID.OGRE, 0, 0]] },
    'img/characters/TEST_Critters.png': { w: 576, h: 384, parts: [[ID.RAT, 144, 192]] },
    'img/tilesets/TEST_Surface_A2.png': { w: 768, h: 576, parts: [[ID.A2, 0, 0]] },
    'img/tilesets/TEST_Surface_A5.png': { w: 384, h: 768, parts: [[ID.TILE, 144, 0]] },
    'img/faces/TEST_Faces.png': { w: 576, h: 288, parts: [[ID.FACE, 0, 0]] },
    'img/tilesets/TEST_Surface_B.png': { w: 768, h: 768, parts: [[ID.BOULDER, 48, 96]] }
};
const readOut = (out, rel) => decodePNG(fs.readFileSync(path.join(out, ...rel.split('/'))), rel);

CASES['place.all_good_exit0'] = (T, provoked) => {
    const { res } = placeAllGood(T, provoked);
    return res.exitCode === 0 && res.report.result === 'PLACED' ? null : `exit ${res.exitCode}, refusals ${JSON.stringify(refusalCodes(res))}`;
};
CASES['place.pixel_diff_zero_sheets'] = (T, provoked) => {
    const { w, out, res } = placeAllGood(T);
    if (res.exitCode !== 0) return `placement refused: ${JSON.stringify(refusalCodes(res))}`;
    const exp = expectedSheets(w, PLACED_IDS(w));
    if (provoked) { const c = exp.get(ATLAS); c.data[(200 * c.w + 200) * 4] ^= 1; }
    const files = fs.readdirSync(path.join(out, 'sheets')).sort();
    const want = [...exp.keys()].map(k => `${k}.png`).sort();
    if (files.join() !== want.join()) return `sheets [${files}], expected [${want}]`;
    const bad = [...exp].map(([id, c]) => [id, diffCount(readOut(out, `sheets/${id}.png`), c)]).filter(([, n]) => n !== 0);
    return bad.length ? `pixels differ: ${bad.map(([id, n]) => `${id}: ${n}`).join(', ')}` : null;
};
CASES['place.overwrite_refused'] = (T, provoked) => {
    const w = BASE(), out = outDir(w, 'overwrite', T);
    const first = runPlace(T, w, inDir(w, 'ow1', [ID.PROP]), out);
    if (first.exitCode !== 0) return `first placement refused: ${JSON.stringify(refusalCodes(first))}`;
    const before = snapshot(out);
    const b = propB(w);
    const second = runPlace(T, w, inDir(w, 'ow2', [], { [`${ID.PROP}.png`]: b.file }), out, { approvals: b.approvals, replace: provoked ? [w.prop.slot.slotId] : [] });
    if (second.exitCode !== 1 || !refusalCodes(second).includes('OVERWRITE_REFUSED')) return `second placement exit ${second.exitCode}, codes ${JSON.stringify(refusalCodes(second))}; expected exit 1 OVERWRITE_REFUSED`;
    return sameSnap(before, snapshot(out)) ? null : '--out changed although the overwrite was refused';
};
// A second approved chest cell (another colour), with an approvals file holding both chests.
function propB(w) {
    if (w.propB) return w.propB;
    const c = writeCell(path.join(w.root, 'cells_b'), ID.PROP, makeCell(w.prop, { seed: idSeed(ID.PROP) + 5 }));
    const approvals = put(w.root, 'neg/propB.APPROVALS.md', ledgerDoc(w.rows.concat([yea(ID.PROP, c.sha)])));
    w.propB = { file: c.file, sha: c.sha, img: c.img, approvals };
    return w.propB;
}

// ------------------------------------------------------------------ source mutants

// Each mutant edits temp copies of the tools (every find string must occur exactly once) and must
// make its kill case fail while the unmutated copy passes it.
const MUTANTS = [
    { name: 'palette_check_disabled', kill: 'neg.off_palette_pixel', edits: [['validate_art.js', 'if (!ctx.palette.has(rgb)) offPal.add(', 'if (false) offPal.add(']] },
    { name: 'approval_check_bypassed', kill: 'neg.approval_missing', edits: [['validate_art.js', 'for (const r of approvalReasons(ctx.ledger, result.sha256, entry)) add(r.code, r.message);', '']] },
    { name: 'scale_check_disabled', kill: 'neg.envelope_w_1px_over_max', edits: [['validate_art.js', 'if (bw < env.wMin || bw > env.wMax || bh < env.hMin || bh > env.hMax) {', 'if (false) {']] },
    { name: 'overwrite_guard_removed', kill: 'place.overwrite_refused', edits: [['place_art.js', 'if (prev && prev.sha256 !== res.sha256 && !replace.has(slot.slotId)) {', 'if (false) {']] },
    { name: 'alpha_check_disabled', kill: 'neg.alpha_128', edits: [['validate_art.js', 'if (a !== 0 && a !== 255) alphaBad.add(', 'if (false) alphaBad.add(']] },
    { name: 'template_residue_disabled', kill: 'neg.template_residue_isolated', edits: [['validate_art.js', 'if (residue && residue.has(rgb)) resid.add(', 'if (false) resid.add(']] },
    { name: 'slot_rect_check_disabled', kill: 'neg.rect_x_plus_1', edits: [['validate_art.js', 'else if (ts.x !== slot.x || ts.y !== slot.y || ts.w !== slot.w || ts.h !== slot.h) {', 'else if (false) {']] },
    { name: 'ground_anchor_disabled', kill: 'neg.ground_baseline_1px_high', edits: [['validate_art.js', "if (anchor === 'GROUND' && maxY !== fh - 1) {", 'if (false) {']] },
    { name: 'ceiling_anchor_disabled', kill: 'neg.ceiling_anchor_1px_low', edits: [['validate_art.js', "if (anchor === 'CEILING' && (maxY < 0 || minY !== 0)) {", 'if (false) {']] },
    { name: 'tile_opacity_disabled', kill: 'neg.tile_with_hole', edits: [['validate_art.js', 'if (tileClass && a !== 255) holes.add(', 'if (false) holes.add(']] },
    { name: 'frame_class_check_disabled', kill: 'neg.large_tall_slot_96x96', edits: [['validate_art.js', 'if (fw !== fc.frame[0] || fh !== fc.frame[1]) {', 'if (false) {']] },
    { name: 'geom_envelope_check_disabled', kill: 'neg.ramp_envelope_ignores_stratumPx', edits: [['validate_art.js', "if (env.hMin < lo || env.hMax > hi) add('GEOM_HEIGHT_MISMATCH'", "if (false) add('GEOM_HEIGHT_MISMATCH'"]] },
    { name: 'geom_drawn_height_check_disabled', kill: 'neg.ramp_drawn_height_not_a_run', edits: [['validate_art.js', 'if (geomHeights && !geomHeights.has(bh)) {', 'if (false) {']] },
    { name: 'tile_class_rows_reduced_to_geom_tile', kill: 'neg.autotile_with_hole', edits: [['validate_art.js', "const TILE_CLASS_ROWS = ['GEOM_TILE', 'RMMZ_AUTOTILE_A1', 'RMMZ_AUTOTILE_A2', 'RMMZ_AUTOTILE_A3', 'RMMZ_AUTOTILE_A4'];", "const TILE_CLASS_ROWS = ['GEOM_TILE'];"]] },
    { name: 'pipeless_row_check_disabled', kill: 'neg.ledger_row_without_leading_pipe', edits: [['validate_art.js', "if (state === 'rows' && !fenced[i] && lines[i].trim() && !/^\\s{0,3}#/.test(lines[i])) {", 'if (false) {']] },
    { name: 'inflate_cap_removed', kill: 'neg.png_inflate_bomb', edits: [['validate_art.js', 'try { zlib.inflateSync(Buffer.concat(chunks.idat), { maxOutputLength: cap * 2 }); }', 'try { /* no cap */ }']] },
    { name: 'stratum_sum_check_disabled', kill: 'neg.stratumPx_sum_not_layerPx', edits: [['validate_art.js', 'if (sum !== g.layerPx) bad(', 'if (false) bad(']] },
    { name: 'copy_offset_x_plus_1', kill: 'place.all_good_exit0', edits: [['place_art.js', 'c.data, c.w, p.slot.x, p.slot.y, p.slot.w, p.slot.h);', 'c.data, c.w, p.slot.x + 1, p.slot.y, p.slot.w, p.slot.h);']] },
    {
        name: 'copy_offset_x_plus_1_self_check_off', kill: 'place.pixel_diff_zero_sheets', edits: [
            ['place_art.js', 'c.data, c.w, p.slot.x, p.slot.y, p.slot.w, p.slot.h);', 'c.data, c.w, p.slot.x + 1, p.slot.y, p.slot.w, p.slot.h);'],
            ['place_art.js', 'if (!rectBytes(c.data, c.w, p.slot).equals(p.image.data)) refuse(', 'if (false) refuse('],
            ['place_art.js', "if (s.count) refuse('STRAY_PIXELS'", "if (false) refuse('STRAY_PIXELS'"]
        ]
    }
];
function toolCopy(tag, edits) {
    const dir = path.join(TMP, 'mut', tag);
    fs.mkdirSync(path.join(dir, 'tools', 'art'), { recursive: true });
    for (const f of ['png_read.js', 'png_util.js']) fs.copyFileSync(path.join(HERE, '..', f), path.join(dir, 'tools', f));
    const src = { 'validate_art.js': fs.readFileSync(path.join(HERE, 'validate_art.js'), 'utf8'), 'place_art.js': fs.readFileSync(path.join(HERE, 'place_art.js'), 'utf8') };
    for (const [file, find, repl] of edits) {
        const n = src[file].split(find).length - 1;
        if (n !== 1) throw new Error(`mutation target in ${file} found ${n} times, expected once: ${find}`);
        src[file] = src[file].replace(find, () => repl);
    }
    for (const [f, text] of Object.entries(src)) fs.writeFileSync(path.join(dir, 'tools', 'art', f), text);
    return { V: require(path.join(dir, 'tools', 'art', 'validate_art.js')), P: require(path.join(dir, 'tools', 'art', 'place_art.js')), tag, dir };
}

// ------------------------------------------------------------------ run

function main() {
    const T = TOOLS_REAL;
    const run = name => { const r = safe(CASES[name], T, pv(name)); check(name, r === null, r); };

    // --- fixture sanity
    {
        const listFiles = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? listFiles(path.join(d, e.name)).map(n => `${e.name}/${n}`) : [e.name]));
        const files = listFiles(FIX_DIR).concat(pv('fixture.json_only_no_png') ? ['TEST_provoked.png'] : []);
        const pngs = listFiles(HERE).filter(n => /\.png$/i.test(n)).concat(pv('fixture.json_only_no_png') ? ['TEST_provoked.png'] : []);
        check('fixture.json_only_no_png', files.length > 0 && files.every(n => n.endsWith('.json')) && pngs.length === 0, `fixtures [${files}], PNGs under tools/art [${pngs}]`);
        // Fixture strips, ramps and faces: envelope heights are the stratumPx runs (+ tilePx for ramps),
        // or layerPx; slot heights are the envelope maximum rounded up to the 48-px grid.
        const g = pv('fixture.geom_slots_follow_stratumPx') ? Object.assign(clone(FIX.geometry), { stratumPx: SPLIT_C }) : FIX.geometry;
        const geomEntries = FIX.catalogue.entries.filter(e => e.slot && /^GEOM_(STRATUM_\d|RAMP_\d|LAYER_FACE)$/.test(e.scaleRow));
        const bad = geomEntries.filter(e => {
            const m = /^GEOM_(STRATUM|RAMP)_(\d)$/.exec(e.scaleRow);
            const r = m ? runsOf(g, Number(m[2])).map(h => h + (m[1] === 'RAMP' ? g.tilePx : 0)) : [g.layerPx];
            return e.envelope.hMin !== Math.min(...r) || e.envelope.hMax !== Math.max(...r) || e.slot.h !== 48 * Math.ceil(e.envelope.hMax / 48);
        });
        check('fixture.geom_slots_follow_stratumPx', geomEntries.length === 8 && bad.length === 0,
            `${geomEntries.length} geometry entries; not from stratumPx/layerPx: ${bad.map(e => `${e.id} env h ${e.envelope.hMin}..${e.envelope.hMax} slot h ${e.slot.h}`).join(', ')}`);
        const w = BASE();
        const ctx = T.V.loadContext({ catalogue: w.catalogueFile, approvals: w.approvalsFile, root: w.root });
        if (pv('fixture.catalogue_slots_valid')) Object.assign(entryIn(ctx.catalogue, ID.STOOL).slot, { x: entryIn(ctx.catalogue, ID.PROP).slot.x + 1, y: entryIn(ctx.catalogue, ID.PROP).slot.y + 1 });
        const errs = T.P.checkCatalogue(ctx);
        check('fixture.catalogue_slots_valid', errs.length === 0, errs.join('; '));
        // Geometry sizes come from geometry.json: no stratum, layer, tile or human pixel literal in
        // the tools. Format constants are allowed where they are defined: 48 as RMMZ's autotile shape
        // count, 64 as the SHA-256 hex length.
        const lits = [];
        for (const f of ['validate_art.js', 'place_art.js']) {
            const lines = fs.readFileSync(path.join(HERE, f), 'utf8').split('\n');
            if (pv('static.no_geometry_literals_in_tools') && f === 'place_art.js') lines.push('const TEST_LAYER_PX = 96;');
            lines.forEach((l, i) => {
                if (/^\s*(\/\/|\*|\/\*)/.test(l)) return;
                for (const m of l.matchAll(/\b(19|20|42|48|64|96)\b/g)) {
                    const ok = (m[1] === '48' && l.includes('AUTOTILE_SHAPES = 48')) || (m[1] === '64' && (l.includes('{64}') || l.includes('64 lowercase')));
                    if (!ok) lits.push(`${f}:${i + 1}: ${l.trim()}`);
                }
            });
        }
        check('static.no_geometry_literals_in_tools', lits.length === 0, lits.join(' | '));
    }

    // --- unit checks
    {
        // [tileId, type, x, y, w, h]: RMMZ Tilemap positions worked out by hand.
        const table = [
            [1, 'B', 48, 0, 48, 48], [17, 'B', 48, 96, 48, 48], [128, 'B', 384, 0, 48, 48], [255, 'B', 720, 720, 48, 48], [1023, 'E', 720, 720, 48, 48],
            [1536, 'A5', 0, 0, 48, 48], [1539, 'A5', 144, 0, 48, 48], [1663, 'A5', 336, 720, 48, 48],
            [2048, 'A1', 0, 0, 288, 144], [2096, 'A1', 0, 144, 288, 144], [2144, 'A1', 288, 0, 96, 144], [2192, 'A1', 288, 144, 96, 144],
            [2240, 'A1', 384, 0, 288, 144], [2288, 'A1', 672, 0, 96, 144], [2336, 'A1', 384, 144, 288, 144], [2384, 'A1', 672, 144, 96, 144],
            [2432, 'A1', 0, 288, 288, 144], [2480, 'A1', 288, 288, 96, 144], [2528, 'A1', 0, 432, 288, 144], [2576, 'A1', 288, 432, 96, 144],
            [2624, 'A1', 384, 288, 288, 144], [2672, 'A1', 672, 288, 96, 144], [2720, 'A1', 384, 432, 288, 144], [2768, 'A1', 672, 432, 96, 144],
            [2816, 'A2', 0, 0, 96, 144], [4304, 'A2', 672, 432, 96, 144],
            [4352, 'A3', 0, 0, 96, 96], [5840, 'A3', 672, 288, 96, 96],
            [5888, 'A4', 0, 0, 96, 144], [6272, 'A4', 0, 144, 96, 96], [6656, 'A4', 0, 240, 96, 144], [7040, 'A4', 0, 384, 96, 96],
            [7424, 'A4', 0, 480, 96, 144], [7808, 'A4', 0, 624, 96, 96], [8144, 'A4', 672, 624, 96, 96]
        ];
        if (pv('unit.tileset_targets')) table[1][2] += 48;
        const wrong = table.filter(([id, type, x, y, w, h]) => { const t = T.P.tilesetTarget(id, 48); return t.error || t.type !== type || t.x !== x || t.y !== y || t.w !== w || t.h !== h; })
            .map(([id]) => `${id}: ${JSON.stringify(T.P.tilesetTarget(id, 48))}`);
        check('unit.tileset_targets', wrong.length === 0, wrong.join('; '));
        const bad = [0, 1024, 1535, 2049, 8192, 1.5].concat(pv('unit.tileset_target_errors') ? [17] : []).filter(id => !T.P.tilesetTarget(id, 48).error);
        check('unit.tileset_target_errors', bad.length === 0, `no error for tile ids ${bad}`);
        // Allowed drawn heights per geometry row, default split and [16,20,20,20,20].
        const g = clone(FIX.geometry), gC = Object.assign(clone(FIX.geometry), { stratumPx: SPLIT_C.slice() });
        const hs = (gg, row) => { const x = T.V.geometryRow(gg, row); return x.heights ? [...x.heights].sort((a, b) => a - b).join('/') : x.code || `${x.frameW}x${x.frameH}`; };
        const got = {
            s: [1, 2, 3, 4, 5].map(k => hs(g, `GEOM_STRATUM_${k}`)), ramp: [1, 2, 3, 4, 5].map(k => hs(g, `GEOM_RAMP_${k}`)),
            sC: [1, 2, 5].map(k => hs(gC, `GEOM_STRATUM_${k}`)), rampC: [1, 3].map(k => hs(gC, `GEOM_RAMP_${k}`)),
            face: hs(g, 'GEOM_LAYER_FACE'), tile: hs(g, 'GEOM_TILE'), tall: hs(g, 'GEOM_FRAME_LARGE_TALL'), s6: hs(g, 'GEOM_STRATUM_6'), tm: hs(g, 'GEOM_FRAME_TALL_MEDIUM')
        };
        const want = {
            s: [pv('unit.geometry_rows') ? '19' : '19/20', '38/39', '57/58', '76/77', '96'], ramp: ['67/68', '86/87', '105/106', '124/125', '144'],
            sC: ['16/20', '36/40', '96'], rampC: ['64/68', '104/108'], face: '96', tile: '48x48', tall: '48x96', s6: 'GEOM_ROW_UNKNOWN', tm: 'FRAME_CLASS_DISABLED'
        };
        check('unit.geometry_rows', JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}`);
        // Face sheets: 4x2 square cells; a whole sheet or one cell by index.
        const faceE = (w, h, cols, rows, index) => ({ runtime: { kind: 'RMMZ_FACE', file: 'img/faces/x.png', index }, slot: { w, h }, frames: { cols, rows } });
        const ft = (e) => { const f = T.P.faceTarget(e, { cols: e.frames.cols, rows: e.frames.rows, fw: e.slot.w / e.frames.cols, fh: e.slot.h / e.frames.rows }); return f.error ? 'error' : f.pending ? 'pending' : `${f.x},${f.y},${f.w}x${f.h} in ${f.fileW}x${f.fileH}`; };
        const faces = [ft(faceE(576, 288, 4, 2, null)), ft(faceE(144, 144, 1, 1, pv('unit.face_targets') ? 4 : 5)), ft(faceE(144, 144, 1, 1, null)), ft(faceE(144, 96, 1, 1, 0)), ft(faceE(144, 144, 1, 1, 8))];
        check('unit.face_targets', faces.join(' | ') === '0,0,576x288 in 576x288 | 144,144,144x144 in 576x288 | pending | error | error', faces.join(' | '));
        // Character blocks: "$" file = one block; other files = 4x2 blocks by index; other frame grids pending.
        const chE = (file, index, cols, rows, fw, fh) => ({ runtime: { kind: 'RMMZ_CHARACTER', file, index }, grid: { cols, rows, fw, fh } });
        const ct = e => { const r = T.P.characterTarget(e, e.grid, FIX.geometry); return r.error ? 'error' : r.pending ? 'pending' : `${r.x},${r.y},${r.w}x${r.h} in ${r.fileW}x${r.fileH}`; };
        const chars = [ct(chE('img/characters/$a.png', null, 3, 4, 48, 96)), ct(chE('img/characters/!$b.png', 0, 3, 4, 96, 48)),
            ct(chE('img/characters/c.png', pv('unit.character_targets') ? 4 : 5, 3, 4, 48, 48)), ct(chE('img/characters/!$d.png', 0, 1, 1, 48, 96)),
            ct(chE('img/characters/e.png', null, 3, 4, 48, 48)), ct(chE('img/characters/f.png', 8, 3, 4, 48, 48)), ct(chE('img/characters/$g.png', 0, 3, 4, 48, 64))];
        check('unit.character_targets', chars.join(' | ') === '0,0,144x384 in 144x384 | 0,0,288x192 in 288x192 | 144,192,144x192 in 576x384 | pending | pending | error | error', chars.join(' | '));
        const names = pv('unit.duplicate_inputs') ? ['A.png', 'B.PNG'] : ['A.png', 'A.PNG', 'B.png'];
        const dups = T.P.duplicateInputs(names);
        check('unit.duplicate_inputs', JSON.stringify(dups) === JSON.stringify([['A', ['A.png', 'A.PNG']]]), JSON.stringify(dups));
        const runtimeRels = ['img/x.png', 'a/b/$c.png'].map(T.P.runtimeRel);
        const refusedRels = ['../x.png', '/abs.png', 'a\\b.png', 'a//b.png', 'C:/x.png', 'x.jpg', './x.png'].concat(pv('unit.runtime_file_paths') ? ['ok/fine.png'] : []).filter(p => T.P.runtimeRel(p) !== null);
        check('unit.runtime_file_paths', runtimeRels.every(Boolean) && refusedRels.length === 0, `accepted: ${refusedRels}`);
    }

    // --- validator accepts
    {
        const w = BASE();
        const results = [...w.cells].map(([id, c]) => [id, runValidate(T, w, pv('validate.good_cells_accepted') && id === ID.HANG ? ID.PROP : id, c.file)]);
        const bad = results.filter(([, r]) => r.result !== 'ACCEPTED');
        check('validate.good_cells_accepted', bad.length === 0 && results.length === 21, `${results.length} cells; refused: ${bad.map(([id, r]) => `${id} ${r.codes}`).join('; ')}`);
        const hangRow = w.rows.find(r => r.ids === (pv('validate.slot_id_approval_warned') ? ID.HANG : entryIn(w.cat, ID.HANG).slot.slotId));
        const hang = runValidate(T, w, ID.HANG, w.cells.get(ID.HANG).file);
        check('validate.slot_id_approval_warned', !!hangRow && hang.result === 'ACCEPTED' && hang.warnings.some(x => x.includes('slot id')),
            `ledger row by slot id: ${!!hangRow}; result ${hang.result} ${hang.codes}; warnings ${JSON.stringify(hang.warnings)}`);
        // Overlays (groupType OVERLAY) are not tile-class; the same cell without the overlay mark is.
        const rimTile = makeWorld('rim_not_overlay', { catalogue: cat => { entryIn(cat, ID.RIM).groupType = 'TILE'; } });
        const rimW = pv('validate.overlay_exempt_from_opacity') ? rimTile : w;
        const rim = runValidate(T, rimW, ID.RIM, rimW.cells.get(ID.RIM).file), rimAsTile = runValidate(T, rimTile, ID.RIM, rimTile.cells.get(ID.RIM).file);
        const rimHoles = pxAt(w.cells.get(ID.RIM).img, 0, 0)[3] === 0;
        check('validate.overlay_exempt_from_opacity', rimHoles && rim.result === 'ACCEPTED' && rimAsTile.codes.join() === 'TILE_NOT_OPAQUE',
            `overlay: ${rim.result} ${rim.codes}; same cell as a tile: ${rimAsTile.result} ${rimAsTile.codes}`);
        // A colour-management chunk (gAMA) is reported; the pixels are still checked as stored.
        const withGama = variant(w, 'gama', ID.PROP, { raw: img => { const b = writePNG(img.data, img.w, img.h); const g = Buffer.alloc(4); g.writeUInt32BE(45455, 0); return pv('validate.colour_chunk_warned') ? b : Buffer.concat([b.subarray(0, 33), chunk('gAMA', g), b.subarray(33)]); } });
        const gr = runValidate(T, w, ID.PROP, withGama.file, { approvals: withGama.approvals });
        check('validate.colour_chunk_warned', gr.result === 'ACCEPTED' && gr.warnings.some(x => x.includes('gAMA')), `${gr.result} ${gr.codes}; warnings ${JSON.stringify(gr.warnings)}`);
        const crlf = put(w.root, 'neg/crlf_bom.APPROVALS.md', ledgerDoc(w.rows, { eol: pv('validate.ledger_crlf_and_bom') ? '\r' : '\r\n', bom: true }));
        const rc = runValidate(T, w, ID.PROP, w.cells.get(ID.PROP).file, { approvals: crlf });
        check('validate.ledger_crlf_and_bom', rc.result === 'ACCEPTED', `${rc.result} ${rc.codes}`);
        const tile = runValidate(T, w, pv('validate.not_checked_reported') ? ID.PROP : ID.TILE, w.cells.get(pv('validate.not_checked_reported') ? ID.PROP : ID.TILE).file);
        check('validate.not_checked_reported', tile.result === 'ACCEPTED' && tile.notChecked.some(n => n.includes('CENTER')), JSON.stringify(tile.notChecked));
        const horseId = pv('validate.proposed_frame_class_warned') ? ID.HUMAN : ID.HORSE;
        const horse = runValidate(T, w, horseId, w.cells.get(horseId).file);
        check('validate.proposed_frame_class_warned', horse.result === 'ACCEPTED' && horse.warnings.some(x => x.includes('LARGE_LONG') && x.includes('PROPOSED')), JSON.stringify(horse.warnings));
        // TALL_MEDIUM: switching the optional parameter on changes the result for the 48x64 slot.
        const on = makeWorld('tall_medium_on', { catalogue: addTallMedium, geometry: g => { g.optionalParams.TALL_MEDIUM.enabled = !pv('validate.tall_medium_enabled_accepts'); } });
        const off = makeWorld('tall_medium_off', { catalogue: addTallMedium });
        const rOn = runValidate(T, on, ID.TALLMED, on.cells.get(ID.TALLMED).file), rOff = runValidate(T, off, ID.TALLMED, off.cells.get(ID.TALLMED).file);
        check('validate.tall_medium_enabled_accepts', rOn.result === 'ACCEPTED' && rOff.result === 'REFUSED', `enabled: ${rOn.result} ${rOn.codes}; disabled: ${rOff.result} ${rOff.codes}`);
        // stratumPx [16,20,20,20,20] with envelopes rebuilt from it: strips and ramps drawn at the new
        // heights are accepted, and those heights differ from the default split's.
        const rebuilt = splitC();
        const useW = pv('validate.stratumPx_changed_heights_follow') ? BASE() : rebuilt;
        const geo = [ID.STRIP1, ID.STRIP3, RAMP(1), RAMP(2), RAMP(3), RAMP(4), RAMP(5)];
        const heights = geo.map(id => entryIn(rebuilt.cat, id).envelope.hTarget), baseHeights = geo.map(id => entryIn(w.cat, id).envelope.hTarget);
        const rr = geo.map(id => runValidate(T, rebuilt, id, useW.cells.get(id).file));
        check('validate.stratumPx_changed_heights_follow', rr.every(x => x.result === 'ACCEPTED') && heights.join() === '16,56,64,84,104,124,144' && baseHeights.join() === '19,57,67,86,105,124,144',
            `drawn heights ${heights} (default ${baseHeights}); results ${rr.map(x => `${x.result}${x.codes && x.codes.length ? ` ${x.codes}` : ''}`).join(', ')}`);
    }

    // --- negative cases, one per refusal rule
    for (const name of Object.keys(CASES).filter(n => n.startsWith('neg.'))) run(name);

    // --- CLI: validate_art.js
    {
        const w = BASE(), V = path.join(HERE, 'validate_art.js');
        const base = (file, entry) => [file, '--entry', entry, '--catalogue', w.catalogueFile, '--approvals', w.approvalsFile, '--root', w.root];
        const ok = runNode(V, base(w.cells.get(ID.PROP).file, pv('cli.validate_accepts_exit0') ? ID.HANG : ID.PROP));
        check('cli.validate_accepts_exit0', ok.status === 0 && /RESULT: ACCEPTED/.test(ok.stdout), `exit ${ok.status}: ${ok.stdout.trim().split('\n').pop()}`);
        const bad = variant(w, 'cli_off_palette', ID.PROP, { mutate: img => { img.data[(41 * 48 + 26) * 4 + 1] ^= 1; } });
        const file = pv('cli.validate_refuses_exit1_with_coords') ? w.cells.get(ID.PROP).file : bad.file;
        const r1 = runNode(V, base(file, ID.PROP).slice(0, 5).concat(['--approvals', bad.approvals, '--root', w.root]));
        check('cli.validate_refuses_exit1_with_coords', r1.status === 1 && /REFUSE OFF_PALETTE/.test(r1.stdout) && r1.stdout.includes('(26,41)'), `exit ${r1.status}: ${r1.stdout.trim()}`);
        const rj = runNode(V, base(bad.file, ID.PROP).slice(0, 5).concat(['--approvals', bad.approvals, '--root', w.root], pv('cli.validate_json') ? [] : ['--json']));
        let j = null;
        try { j = JSON.parse(rj.stdout); } catch (e) { /* checked below */ }
        check('cli.validate_json', rj.status === 1 && j && j.result === 'REFUSED' && j.reasons.some(x => x.code === 'OFF_PALETTE' && x.pixels.some(p => p[0] === 26 && p[1] === 41)), `exit ${rj.status}: ${rj.stdout.slice(0, 200)}`);
        const ru = runNode(V, pv('cli.validate_usage_exit2') ? base(w.cells.get(ID.PROP).file, ID.PROP) : [w.cells.get(ID.PROP).file, '--catalogue', w.catalogueFile, '--approvals', w.approvalsFile]);
        check('cli.validate_usage_exit2', ru.status === 2, `exit ${ru.status}: ${ru.stderr.trim()}`);
        const ri = runNode(V, base(pv('cli.validate_missing_file_exit2') ? w.cells.get(ID.PROP).file : path.join(w.root, 'TEST_missing.png'), ID.PROP));
        check('cli.validate_missing_file_exit2', ri.status === 2, `exit ${ri.status}: ${ri.stdout.trim()}`);
    }

    // --- placement
    run('place.all_good_exit0');
    run('place.pixel_diff_zero_sheets');
    {
        const w = BASE();
        const prefixed = (dir, p) => Object.fromEntries(Object.entries(snapshot(path.join(w.root, dir))).map(([k, v]) => [`${p}/${k}`, v]));
        const guarded = () => Object.assign(prefixed('art', 'art'), prefixed('cells', 'cells'));
        const inputsBefore = guarded();
        const main = placeAllGood(T), out = main.out, rep = main.res.report;
        if (main.res.exitCode !== 0) check('place.main_run', false, JSON.stringify(refusalCodes(main.res)));

        // 1:1 copy keeps even the colour bytes of transparent pixels.
        const atlas = readOut(out, `sheets/${ATLAS}.png`);
        const px = pxAt({ w: atlas.width, h: atlas.height, data: atlas.data }, 192, 192);
        const wantPx = pv('place.transparent_pixel_bytes_kept') ? [0, 0, 0, 0] : [...MARGIN_RGB, 0];
        check('place.transparent_pixel_bytes_kept', px.join() === wantPx.join(), `PROP slot corner (192,192) is [${px}], expected [${wantPx}]`);

        // The comparator used for pixel diff 0 does see a composite shifted by one pixel.
        const exp = expectedSheets(w, PLACED_IDS(w)).get(ATLAS);
        const shifts = pv('place.pixel_diff_sees_off_by_one') ? [[0, 0]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
        const shiftDiffs = shifts.map(([dx, dy]) => {
            const parts = PLACED_IDS(w).map(id => entryIn(w.cat, id)).filter(e => e.slot.sheetId === ATLAS).map(e => ({ img: w.cells.get(e.id).img, x: e.slot.x + (e.id === ID.PROP ? dx : 0), y: e.slot.y + (e.id === ID.PROP ? dy : 0) }));
            return diffCount(atlas, compose(exp.w, exp.h, parts));
        });
        check('place.pixel_diff_sees_off_by_one', shiftDiffs.every(n => n > 0 && n !== Infinity), `diffs for PROP shifted x+1, x-1, y+1, y-1: ${shiftDiffs}`);

        // Runtime RMMZ sheets: exact file set, spec sizes, pixel diff 0 at the RMMZ positions.
        const rtDir = path.join(out, 'runtime');
        const rtFiles = Object.keys(snapshot(rtDir)).sort();
        const expect = clone(RT_EXPECT), dimsExpect = clone(RT_EXPECT);
        if (pv('place.runtime_dims_rmmz_spec')) dimsExpect['img/tilesets/TEST_Surface_A2.png'].h = 768;
        const dimsBad = Object.entries(dimsExpect).filter(([rel, e]) => { const img = fs.existsSync(path.join(rtDir, rel)) && readOut(rtDir, rel); return !img || img.width !== e.w || img.height !== e.h; }).map(([rel]) => rel);
        check('place.runtime_dims_rmmz_spec', rtFiles.join() === Object.keys(dimsExpect).sort().join() && dimsBad.length === 0, `files [${rtFiles}]; wrong size: [${dimsBad}]`);
        if (pv('place.pixel_diff_zero_runtime')) expect['img/characters/TEST_Critters.png'].parts[0][1] = 0;
        const rtBad = Object.entries(expect).map(([rel, e]) => {
            const img = fs.existsSync(path.join(rtDir, rel)) ? readOut(rtDir, rel) : null;
            const n = img ? diffCount(img, compose(e.w, e.h, e.parts.map(([id, x, y]) => ({ img: w.cells.get(id).img, x, y })))) : Infinity;
            return [rel, n];
        }).filter(([, n]) => n !== 0);
        check('place.pixel_diff_zero_runtime', rtBad.length === 0, rtBad.map(([r, n]) => `${r}: ${n}`).join(', '));

        // Coverage report, exact.
        const S = id => entryIn(w.cat, id).slot.slotId;
        const atlasIds = [ID.HUMAN, ID.OGRE, ID.HORSE, ID.TILE, ID.PROP, ID.HANG, ID.WALL, RAMP(1), RAMP(2), RAMP(3), RAMP(4), RAMP(5), ID.STRIP1, ID.STRIP3, ID.RIM, ID.FACE];
        const surfaceIds = atlasIds.concat([ID.A2, ID.BOULDER, ID.RAT]).sort();
        const atlasFilled = atlasIds.map(S).sort();
        const sheetRow = (sheetId, kind, filled, empty, unexpected) => ({ sheetId, kind, slots: filled.length + empty.length, filled, empty, unexpected, notInTemplate: [], template: 'OK', strayPixels: 0 });
        const expectedCov = {
            schema: 'deus-art-coverage/1', catalogueSha256: sha(fs.readFileSync(w.catalogueFile)),
            totals: { slots: 21, filled: 19, empty: 2, unexpected: 1, strayPixels: 0, derivedPending: 1, noSlot: 1 },
            sheets: [
                sheetRow(ATLAS, 'ATLAS', atlasFilled, [S(ID.CAVE), S(ID.STOOL)], [`${ATLAS}:0099`]),
                sheetRow('CHR_TEST_SURFACE_B1_RAT', 'RMMZ_CHARACTER', [S(ID.RAT)], [], []),
                sheetRow('TS_TEST_SURFACE_B1_A2', 'RMMZ_TILESET', [S(ID.A2)], [], []),
                sheetRow('TS_TEST_SURFACE_B1_B', 'RMMZ_TILESET', [S(ID.BOULDER)], [], [])
            ],
            bands: [
                { band: 'LOWER1', inGeometry: true, slots: 1, filled: [], empty: [ID.CAVE], derivedPending: [], noSlot: [], unexpected: [] },
                { band: 'SURFACE', inGeometry: true, slots: 19, filled: surfaceIds, empty: [], derivedPending: [ID.FLIPH], noSlot: [ID.GIANT], unexpected: [] },
                { band: 'TEST_NOBAND', inGeometry: false, slots: 1, filled: [], empty: [ID.STOOL], derivedPending: [], noSlot: [], unexpected: [ID.STOOL] }
            ]
        };
        if (pv('place.coverage_report_exact')) expectedCov.bands[2].filled = [ID.STOOL];
        const cov = JSON.parse(fs.readFileSync(path.join(out, 'coverage_report.json'), 'utf8'));
        check('place.coverage_report_exact', JSON.stringify(cov) === JSON.stringify(expectedCov), `got ${JSON.stringify(cov)}`);
        const md = fs.readFileSync(path.join(out, 'coverage_report.md'), 'utf8');
        const mdRow = pv('place.coverage_markdown') ? `| ${ATLAS} | ATLAS | 18 | 18 |` : `| ${ATLAS} | ATLAS | 18 | 16 | 2 | 1 | 0 | 0 | OK |`;
        check('place.coverage_markdown', md.includes(mdRow) && md.includes('| TEST_NOBAND | no | 1 | 0 | 1 | 0 | 0 | 1 |'), md.split('\n').slice(0, 12).join(' / '));

        // Placement report: filled slots carry the file hash and the hash of the copied bytes.
        const filledBad = PLACED_IDS(w).filter(id => {
            const f = rep.filled.find(x => x.entryId === id), c = w.cells.get(id);
            const wantSha = pv('place.report_hashes') && id === ID.PROP ? '0'.repeat(64) : c.sha;
            return !f || f.sha256 !== wantSha || f.rectSha256 !== sha(c.img.data) || f.source !== `${id}.png`;
        });
        check('place.report_hashes', rep.filled.length === PLACED_IDS(w).length && filledBad.length === 0, `mismatched: ${filledBad}`);
        const dp = rep.derivedPending, wantApproved = !pv('place.derived_pending_reported');
        const dpOk = dp.length === 1 && dp[0].entryId === ID.FLIPH && dp[0].derivedFrom === ID.PROP && dp[0].status === 'DERIVED_PENDING' && dp[0].parentFilled === true && dp[0].ledgerApprovedVariant === wantApproved;
        const mentions = Object.keys(snapshot(out)).filter(f => f.includes(ID.FLIPH)).concat(rep.filled.filter(f => f.entryId === ID.FLIPH).map(f => f.slotId));
        check('place.derived_pending_reported', dpOk && mentions.length === 0, `derivedPending ${JSON.stringify(dp)}; files or slots for it: [${mentions}]`);
        // Runtime target without a file: placed in the atlas, reported RUNTIME_PENDING, not exported.
        const wantPending = pv('place.runtime_pending_reported') ? [] : [{ entryId: ID.HANG, slotId: S(ID.HANG), kind: 'RMMZ_CHARACTER', reason: 'no runtime file named' }];
        check('place.runtime_pending_reported', JSON.stringify(rep.runtimePending) === JSON.stringify(wantPending) && rep.filled.some(f => f.entryId === ID.HANG),
            `runtimePending ${JSON.stringify(rep.runtimePending)}`);
        // Runtime files holding only some of their tiles are marked partial and warned about.
        const wantPartial = { 'img/characters/$TEST_Horse.png': false, 'img/characters/$TEST_Human.png': pv('place.runtime_partial_flagged'), 'img/characters/$TEST_Ogre.png': false,
            'img/characters/TEST_Critters.png': true, 'img/faces/TEST_Faces.png': false, 'img/tilesets/TEST_Surface_A2.png': true, 'img/tilesets/TEST_Surface_A5.png': true, 'img/tilesets/TEST_Surface_B.png': true };
        const gotPartial = Object.fromEntries(rep.runtime.map(r => [r.file.replace(/^runtime\//, ''), r.partial]));
        const warned = rep.warnings.filter(x => x.includes('is partial')).length;
        check('place.runtime_partial_flagged', JSON.stringify(gotPartial) === JSON.stringify(wantPartial) && warned === 4, `partial ${JSON.stringify(gotPartial)}; ${warned} partial warnings`);

        // Determinism: a second run into a new folder gives byte-identical output.
        const out2 = outDir(w, 'rerun', T);
        const again = pv('place.rerun_sha256_equal')
            ? runPlace(T, w, inDir(w, 'rerun_prov', PLACED_IDS(w).filter(id => id !== ID.PROP), { [`${ID.PROP}.png`]: propB(w).file }), out2, { approvals: propB(w).approvals })
            : runPlace(T, w, inDir(w, 'rerun', PLACED_IDS(w)), out2);
        const s1 = snapshot(out), s2 = snapshot(out2);
        const differ = Object.keys(s1).filter(k => s1[k] !== s2[k]);
        check('place.rerun_sha256_equal', again.exitCode === 0 && Object.keys(s1).length === Object.keys(s2).length && differ.length === 0, `exit ${again.exitCode}; differing files: [${differ}]`);

        // Same folder again: every slot UNCHANGED and the images stay byte-identical.
        const out3 = outDir(w, 'same', T);
        fs.cpSync(out, out3, { recursive: true });
        const pre = snapshot(out3);
        const same = pv('place.rerun_same_folder_unchanged')
            ? runPlace(T, w, inDir(w, 'same_prov', [], { [`${ID.PROP}.png`]: propB(w).file }), out3, { approvals: propB(w).approvals, replace: [S(ID.PROP)] })
            : runPlace(T, w, inDir(w, 'same', PLACED_IDS(w)), out3);
        const post = snapshot(out3);
        const imgs = Object.keys(pre).filter(k => k.startsWith('sheets/') || k.startsWith('runtime/') || k.startsWith('coverage_report'));
        const changed = imgs.filter(k => pre[k] !== post[k]);
        check('place.rerun_same_folder_unchanged', same.exitCode === 0 && same.report.actions.length === PLACED_IDS(w).length && same.report.actions.every(a => a.action === 'UNCHANGED') && changed.length === 0,
            `exit ${same.exitCode}; actions ${JSON.stringify((same.report.actions || []).map(a => a.action))}; changed [${changed}]`);

        // --replace overwrites exactly the named slot with the new file's bytes.
        {
            const o = outDir(w, 'replace', T);
            const a = runPlace(T, w, inDir(w, 'rep1', [ID.PROP, ID.HANG]), o);
            const b = propB(w);
            const r = runPlace(T, w, inDir(w, 'rep2', [], { [`${ID.PROP}.png`]: b.file }), o, { approvals: b.approvals, replace: pv('place.replace_overwrites_slot') ? [] : [S(ID.PROP)] });
            let detail = `first exit ${a.exitCode}, second exit ${r.exitCode} ${JSON.stringify(refusalCodes(r))}`;
            let ok = a.exitCode === 0 && r.exitCode === 0;
            if (ok) {
                const sheet = readOut(o, `sheets/${ATLAS}.png`);
                const hang = entryIn(w.cat, ID.HANG).slot;
                const want = compose(sheet.width, sheet.height, [{ img: b.img, x: w.prop.slot.x, y: w.prop.slot.y }, { img: w.cells.get(ID.HANG).img, x: hang.x, y: hang.y }]);
                const n = diffCount(sheet, want);
                const act = r.report.actions.find(x => x.slotId === S(ID.PROP));
                ok = n === 0 && act && act.action === 'REPLACED' && r.report.filled.find(f => f.slotId === S(ID.PROP)).sha256 === b.sha;
                detail = `pixels differing from (new chest + old lantern): ${n}; action ${act && act.action}`;
            }
            check('place.replace_overwrites_slot', ok, detail);
        }
        run('place.overwrite_refused');

        const refusedCase = (name, fn) => { const r = safe(fn, pv(name)); check(name, r === null, r); };
        refusedCase('place.replace_unused_refused', p => {
            const r = runPlace(T, w, inDir(w, 'ru', p ? [ID.PROP] : [ID.HANG]), outDir(w, 'ru', T), { replace: [S(ID.PROP)] });
            return r.exitCode === 1 && refusalCodes(r).join() === 'REPLACE_UNUSED' ? null : `exit ${r.exitCode} ${JSON.stringify(refusalCodes(r))}`;
        });
        refusedCase('place.replace_unknown_slot_refused', p => {
            const r = runPlace(T, w, inDir(w, 'rk', [ID.PROP]), outDir(w, 'rk', T), { replace: [p ? S(ID.PROP) : 'TEST_NO_SHEET:0001'] });
            return r.exitCode === 1 && refusalCodes(r).join() === 'REPLACE_UNKNOWN_SLOT' ? null : `exit ${r.exitCode} ${JSON.stringify(refusalCodes(r))}`;
        });
        const badProp = variant(w, 'place_bad_prop', ID.PROP, { mutate: img => { img.data[(41 * 48 + 27) * 4] ^= 1; } });
        refusedCase('place.refusal_writes_nothing', p => {
            const o = outDir(w, 'nothing', T);
            const r = runPlace(T, w, inDir(w, 'nothing', PLACED_IDS(w).filter(id => p || id !== ID.PROP), p ? {} : { [`${ID.PROP}.png`]: badProp.file }), o, { approvals: badProp.approvals });
            return r.exitCode === 1 && refusalCodes(r).join() === 'OFF_PALETTE' && !fs.existsSync(o) ? null : `exit ${r.exitCode} ${JSON.stringify(refusalCodes(r))}; out exists: ${fs.existsSync(o)}`;
        });
        refusedCase('place.refusal_keeps_existing_out', p => {
            const o = outDir(w, 'keep', T);
            fs.cpSync(out, o, { recursive: true });
            const before = snapshot(o);
            const r = runPlace(T, w, inDir(w, 'keep', [ID.HANG], p ? {} : { [`${ID.STOOL}.png`]: w.cells.get(ID.PROP).file }), o);
            return r.exitCode === 1 && refusalCodes(r).length > 0 && sameSnap(before, snapshot(o)) ? null : `exit ${r.exitCode} ${JSON.stringify(refusalCodes(r))}; unchanged ${sameSnap(before, snapshot(o))}`;
        });
        const expectCodes = (r, codes) => (r.exitCode === 1 && JSON.stringify(refusalCodes(r).filter((c, i, a) => a.indexOf(c) === i).sort()) === JSON.stringify(codes.slice().sort()) ? null : `exit ${r.exitCode} ${JSON.stringify(refusalCodes(r))}`);
        refusedCase('place.derived_row_input_refused', p => expectCodes(runPlace(T, w, inDir(w, 'derived', p ? [ID.PROP] : [], p ? {} : { [`${ID.FLIPH}.png`]: w.cells.get(ID.PROP).file }), outDir(w, 'derived', T)), ['ENTRY_NOT_PLACEABLE']));
        refusedCase('place.unknown_input_refused', p => expectCodes(runPlace(T, w, inDir(w, 'unknown', [ID.PROP], p ? {} : { 'TEST_NOT_AN_ENTRY.png': w.cells.get(ID.PROP).file }), outDir(w, 'unknown', T)), ['UNKNOWN_INPUT']));
        const worldCase = (name, world, ids, codes) => refusedCase(name, p => {
            const ww = p ? w : world();
            return expectCodes(runPlace(T, ww, inDir(ww, name, ids), outDir(ww, name, T)), codes);
        });
        worldCase('place.catalogue_overlap_refused', () => makeWorld('overlap', { catalogue: cat => { Object.assign(entryIn(cat, ID.STOOL).slot, { x: 200, y: 200 }); } }), [ID.PROP], ['CATALOGUE_INVALID']);
        worldCase('place.runtime_path_escape_refused', () => makeWorld('rt_escape', { catalogue: cat => { entryIn(cat, ID.PROP).runtime = { kind: 'RMMZ_TILESET', file: '../TEST_escape.png', tileId: 3 }; } }), [ID.PROP], ['RUNTIME_INVALID']);
        worldCase('place.runtime_size_mismatch_refused', () => makeWorld('rt_size', { catalogue: cat => { entryIn(cat, ID.TILE).runtime.tileId = 2816; } }), [ID.TILE], ['RUNTIME_INVALID']);
        worldCase('place.runtime_kind_unknown_refused', () => makeWorld('rt_kind', { catalogue: cat => { entryIn(cat, ID.PROP).runtime = { kind: 'TEST_SPRITE', file: 'img/TEST_x.png', index: 0 }; } }), [ID.PROP], ['RUNTIME_INVALID']);
        worldCase('place.runtime_target_clash_refused', () => makeWorld('rt_clash', { catalogue: cat => { entryIn(cat, ID.PROP).runtime = { kind: 'RMMZ_TILESET', file: 'img/tilesets/TEST_Surface_B.png', tileId: 17 }; } }), [ID.PROP, ID.BOULDER], ['RUNTIME_INVALID']);
        worldCase('place.runtime_tile_zero_refused', () => makeWorld('rt_zero', { catalogue: cat => { entryIn(cat, ID.BOULDER).runtime.tileId = 0; } }), [ID.BOULDER], ['RUNTIME_INVALID']);
        refusedCase('place.out_state_tampered', p => {
            const o = outDir(w, 'tamper', T);
            fs.cpSync(out, o, { recursive: true });
            if (!p) {
                const f = path.join(o, 'sheets', `${ATLAS}.png`), img = decodePNG(fs.readFileSync(f), f);
                img.data[(200 * img.width + 200) * 4] ^= 1;
                fs.writeFileSync(f, writePNG(img.data, img.width, img.height));
            }
            return expectCodes(runPlace(T, w, inDir(w, 'tamper', []), o), ['OUT_STATE_TAMPERED']);
        });
        // A partial placement (chest only) as the earlier state for the next three cases.
        const partial = outDir(w, 'partial', T);
        const partialRun = runPlace(T, w, inDir(w, 'partial', [ID.PROP]), partial);
        if (partialRun.exitCode !== 0) check('place.partial_run', false, JSON.stringify(refusalCodes(partialRun)));
        refusedCase('place.out_state_unlisted_sheet_refused', p => {
            const o = outDir(w, 'unlisted', T);
            fs.cpSync(partial, o, { recursive: true });
            if (!p) { const b = entryIn(w.cat, ID.BOULDER); const img = compose(768, 768, [{ img: w.cells.get(ID.BOULDER).img, x: b.slot.x, y: b.slot.y }]); fs.writeFileSync(path.join(o, 'sheets', `${b.slot.sheetId}.png`), writePNG(img.data, img.w, img.h)); }
            return expectCodes(runPlace(T, w, inDir(w, 'unlisted', [ID.BOULDER]), o), ['OUT_STATE_TAMPERED']);
        });
        refusedCase('place.out_state_pixels_in_empty_slot_refused', p => {
            // Sheet and report edited together, so the recorded sheet hash still matches.
            const o = outDir(w, 'emptyslot', T);
            fs.cpSync(partial, o, { recursive: true });
            if (!p) {
                const f = path.join(o, 'sheets', `${ATLAS}.png`), img = decodePNG(fs.readFileSync(f), f), s = entryIn(w.cat, ID.STOOL).slot;
                img.data[((s.y + 5) * img.width + s.x + 5) * 4 + 3] = 255;
                const buf = writePNG(img.data, img.width, img.height);
                fs.writeFileSync(f, buf);
                const rf = path.join(o, 'placement_report.json'), r = JSON.parse(fs.readFileSync(rf, 'utf8'));
                r.sheets.find(x => x.sheetId === ATLAS).sha256 = sha(buf);
                fs.writeFileSync(rf, JSON.stringify(r, null, 2) + '\n');
            }
            return expectCodes(runPlace(T, w, inDir(w, 'emptyslot', []), o), ['OUT_STATE_TAMPERED']);
        });
        refusedCase('place.replace_with_refused_input_reports_only_the_refusal', p => {
            const o = outDir(w, 'repbad', T);
            fs.cpSync(partial, o, { recursive: true });
            const src = p ? propB(w) : badProp;
            return expectCodes(runPlace(T, w, inDir(w, 'repbad', [], { [`${ID.PROP}.png`]: src.file }), o, { approvals: badProp.approvals, replace: [S(ID.PROP)] }), ['OFF_PALETTE']);
        });
        refusedCase('place.template_change_makes_out_stale', p => {
            const tw = makeWorld('template_change');
            const o = outDir(tw, 'tplchange', T);
            const first = runPlace(T, tw, inDir(tw, 'tplchange1', [ID.PROP]), o);
            if (first.exitCode !== 0) return `first placement refused: ${JSON.stringify(refusalCodes(first))}`;
            const f = path.join(tw.templatesDir, `${ATLAS}.json`), side = JSON.parse(fs.readFileSync(f, 'utf8'));
            if (!p) { side.gridColour = '#00FFFE'; fs.writeFileSync(f, JSON.stringify(side, null, 2) + '\n'); }
            return expectCodes(runPlace(T, tw, inDir(tw, 'tplchange2', []), o), ['OUT_STATE_STALE']);
        });
        refusedCase('place.out_state_stale', p => {
            const o = outDir(w, 'stale', T);
            fs.cpSync(out, o, { recursive: true });
            const cat2 = put(w.root, 'art/catalogue/catalogue_changed.json', JSON.stringify(Object.assign(clone(w.cat), { note: 'TEST_ changed' }), null, 2) + '\n');
            return expectCodes(runPlace(T, w, inDir(w, 'stale', []), o, { catalogue: p ? w.catalogueFile : cat2 }), ['OUT_STATE_STALE']);
        });
        refusedCase('place.out_dir_not_empty_refused', p => {
            const o = outDir(w, 'notempty', T);
            fs.mkdirSync(o, { recursive: true });
            if (!p) fs.writeFileSync(path.join(o, 'TEST_stray.txt'), 'TEST_');
            return expectCodes(runPlace(T, w, inDir(w, 'notempty', [ID.PROP]), o), ['OUT_DIR_NOT_EMPTY']);
        });
        refusedCase('place.out_dir_unsafe_refused', p => expectCodes(runPlace(T, w, inDir(w, 'unsafe', [ID.PROP]), p ? outDir(w, 'unsafe', T) : path.join(w.root, 'art')), ['OUT_DIR_UNSAFE']));
        refusedCase('place.approval_revoked_refused', p => {
            const o = outDir(w, 'revoked', T);
            fs.cpSync(out, o, { recursive: true });
            const nay = put(w.root, 'neg/revoked.APPROVALS.md', ledgerDoc(w.rows.concat([Object.assign(yea(ID.PROP, w.cells.get(ID.PROP).sha), { decision: 'NAY' })])));
            return expectCodes(runPlace(T, w, inDir(w, 'revoked', []), o, { approvals: p ? w.approvalsFile : nay }), ['APPROVAL_REVOKED', 'APPROVAL_NAY', 'APPROVAL_CONFLICT']);
        });

        // No input, catalogue, template or approvals file changed by any placement run.
        const inputsAfter = guarded();
        if (pv('place.inputs_untouched')) inputsAfter['art/catalogue/catalogue.json'] = '0';
        const touched = Object.keys(inputsBefore).filter(k => inputsBefore[k] !== inputsAfter[k]);
        check('place.inputs_untouched', touched.length === 0, `changed: [${touched}]`);
    }

    // --- CLI: place_art.js
    {
        const w = BASE(), P = path.join(HERE, 'place_art.js');
        const args = (inD, out) => ['--catalogue', w.catalogueFile, '--approvals', w.approvalsFile, '--in', inD, '--out', out, '--root', w.root];
        const good = inDir(w, 'cli_good', [ID.PROP, ID.HANG]);
        const badIn = inDir(w, 'cli_bad', [], { 'TEST_NOT_AN_ENTRY.png': w.cells.get(ID.PROP).file });
        const r0 = runNode(P, args(pv('cli.place_exit_codes') ? badIn : good, outDir(w, 'cli0', T)));
        const r1 = runNode(P, args(badIn, outDir(w, 'cli1', T)));
        const r2 = runNode(P, ['--catalogue', w.catalogueFile, '--in', good]);
        check('cli.place_exit_codes', r0.status === 0 && /RESULT: PLACED/.test(r0.stdout) && r1.status === 1 && /UNKNOWN_INPUT/.test(r1.stdout) && r2.status === 2,
            `success exit ${r0.status}, refusal exit ${r1.status}, usage exit ${r2.status}`);
    }

    // --- source mutants
    {
        const control = toolCopy('control', []);
        for (const m of MUTANTS) {
            const name = `mutant.${m.name}_killed`;
            let mt;
            try { mt = toolCopy(m.name, m.edits); } catch (e) { check(name, false, e.message); continue; }
            const ctl = safe(CASES[m.kill], control, false);
            const res = safe(CASES[m.kill], pv(name) ? control : mt, false);
            check(name, ctl === null && res !== null, ctl !== null ? `kill case ${m.kill} fails on the unmutated copy: ${ctl}` : `mutant survived: ${m.kill} still passes`);
            if (res !== null) console.log(`  ${m.kill} on the mutant: ${res.length > 300 ? `${res.slice(0, 300)}...` : res}`);
        }
    }

    console.log(`RESULT: ${passed} passed, ${failed} failed`);
    return failed ? 1 : 0;
}

// Runs the suite once per check with UF_TEST_PROVOKE=place.<check>; each run must exit non-zero and
// print FAIL for that check. Other checks that fail in the same run are listed (knock-on failures).
async function provokeSweep() {
    const self = __filename;
    const base = spawnSync(process.execPath, [self], { encoding: 'utf8', env: Object.assign({}, process.env, { UF_TEST_PROVOKE: '' }) });
    const names = base.stdout.split('\n').map(l => /^(PASS|FAIL) (\S+?):?(\s|$)/.exec(l)).filter(Boolean).map(m => m[2]);
    console.log(`SWEEP baseline: exit ${base.status}, ${names.length} checks`);
    if (base.status !== 0) { console.log(base.stdout); return 1; }
    const results = [];
    let next = 0;
    const worker = async () => {
        while (next < names.length) {
            const name = names[next++];
            const r = await new Promise(resolve => {
                const child = spawn(process.execPath, [self], { env: Object.assign({}, process.env, { UF_TEST_PROVOKE: `place.${name}` }) });
                let out = '';
                child.stdout.on('data', d => { out += d; });
                child.stderr.on('data', () => {});
                child.on('close', code => resolve({ code, out }));
            });
            const fails = r.out.split('\n').filter(l => l.startsWith('FAIL ')).map(l => l.slice(5).split(':')[0]);
            results.push({ name, code: r.code, hit: fails.includes(name), others: fails.filter(f => f !== name) });
        }
    };
    await Promise.all([1, 2, 3, 4].map(worker));
    results.sort((a, b) => names.indexOf(a.name) - names.indexOf(b.name));
    let bad = 0;
    for (const r of results) {
        const ok = r.code !== 0 && r.hit;
        if (!ok) bad++;
        console.log(`SWEEP ${ok ? 'PROVOKED' : 'NOT-PROVOKED'} place.${r.name}: exit=${r.code} failed=${r.hit ? 'yes' : 'no'}${r.others.length ? ` knock-on=[${r.others.join(', ')}]` : ''}`);
    }
    console.log(`SWEEP RESULT: ${results.length - bad} of ${results.length} checks fail when provoked, ${bad} do not`);
    return bad ? 1 : 0;
}

function cleanup() { if (!KEEP) fs.rmSync(TMP, { recursive: true, force: true }); else console.log(`kept ${TMP}`); }

if (process.argv.includes('--provoke-sweep')) {
    cleanup();
    provokeSweep().then(code => { process.exitCode = code; });
} else {
    let code = 1;
    try { code = main(); }
    catch (e) { console.log(`FAIL harness: ${e.stack}`); console.log(`RESULT: ${passed} passed, ${failed + 1} failed`); }
    finally { cleanup(); }
    process.exitCode = code;
}
