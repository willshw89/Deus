#!/usr/bin/env node
'use strict';
/**
 * tools/art/place_art.js
 *
 * WG.41.01 Lane U. Copies Owner-approved art files 1:1 into their catalogue slots (catalogue
 * contract deus-art-catalogue/1.1.0) and exports the runtime RMMZ sheets. Every input is checked by
 * tools/art/validate_art.js first. Pixels are copied byte for byte, RGBA including the colour
 * bytes of fully transparent pixels. They are never resampled, recoloured or edited (DEC-007).
 * No catalogue, template or approvals file is written.
 *
 * Usage:
 *   node tools/art/place_art.js --catalogue <path> --approvals <path> --in <dir> --out <dir>
 *        [--replace <slotId>]... [--geometry <path>] [--templates <dir>] [--root <dir>] [--json]
 *
 *   --in       folder of approved files named <entryId>.png (top level only; other files ignored)
 *   --out      output folder. It keeps the placement state between runs:
 *                sheets/<sheetId>.png              composed catalogue sheets that have a filled slot
 *                runtime/<entries[].runtime.file>  RMMZ tileset and character sheets
 *                placement_report.json             filled slots, the sha256 of each placed file
 *                coverage_report.json, .md         filled, empty and unexpected slots per sheet and band
 *   --replace  let a different approved file overwrite this filled slot (repeatable)
 *   --geometry, --templates, --root: as for validate_art.js
 *
 * All or nothing: if any input or earlier placement is refused, nothing under --out changes and the
 * refusals are printed. A filled slot given the identical file again is UNCHANGED; a different file
 * needs --replace <slotId>. Rows with variants.derivedFrom are reported DERIVED_PENDING and nothing
 * is written for them. Output bytes depend only on the inputs, so reruns give equal sha256.
 *
 * Runtime export (entries[].runtime; null = atlas only):
 *   {kind: "TILESET", file, tileId}   RMMZ tile id. B-E (0..1023) and A5 (1536..1663) place one
 *                                     tile; A1-A4 (2048..8191, autotile shape 0) place the whole
 *                                     autotile block. Positions follow Tilemap in game/js/rmmz_core.js.
 *   {kind: "CHARACTER", file, index}  a 3x4-frame slot. A "$" file holds one block (index 0); other
 *                                     files hold 4x2 blocks (index 0..7). Block sizes come from
 *                                     geometry.rmmzCharacterBlocks.
 *
 * Exit: 0 placed, 1 refused, 2 usage or I/O error.
 */

const fs = require('fs');
const path = require('path');
const V = require('./validate_art');
const { writePNG } = require('../png_util');
const { decodePNG } = require('../png_read');

const REPORT_SCHEMA = 'deus-art-placement/1';
const COVERAGE_SCHEMA = 'deus-art-coverage/1';
const ATLAS_MAX_PX = 4096; // contract deus-art-catalogue/1.1.0: ATLAS sides at most 4096
// RMMZ tilesets (docs/RMMZ_ASSET_SPEC.md §3): tile-id ranges and sheet size in tiles. The tile size
// comes from geometry.tilePx.
const RMMZ_TILESETS = [
    { type: 'B', first: 0, end: 256, cols: 16, rows: 16 },
    { type: 'C', first: 256, end: 512, cols: 16, rows: 16 },
    { type: 'D', first: 512, end: 768, cols: 16, rows: 16 },
    { type: 'E', first: 768, end: 1024, cols: 16, rows: 16 },
    { type: 'A5', first: 1536, end: 1664, cols: 8, rows: 16 },
    { type: 'A1', first: 2048, end: 2816, cols: 16, rows: 12 },
    { type: 'A2', first: 2816, end: 4352, cols: 16, rows: 12 },
    { type: 'A3', first: 4352, end: 5888, cols: 16, rows: 8 },
    { type: 'A4', first: 5888, end: 8192, cols: 16, rows: 15 }
];
const AUTOTILE_FIRST = 2048, AUTOTILE_SHAPES = 48;
const RMMZ_MULTI_COLS = 4, RMMZ_MULTI_ROWS = 2; // blocks in a non-$ character sheet
const { Refusal, cmp } = V;

// ------------------------------------------------------------------ RMMZ runtime targets

// Where RMMZ reads tile <tileId> from, in pixels of its tileset file (Tilemap._addNormalTile and
// Tilemap._addAutotile). Autotile ids must be shape 0 and address the kind's whole block.
function tilesetTarget(tileId, t) {
    if (!Number.isInteger(tileId)) return { error: `tileId ${JSON.stringify(tileId)} is not an integer` };
    const set = RMMZ_TILESETS.find(s => tileId >= s.first && tileId < s.end);
    if (!set) return { error: `tileId ${tileId} is not in an RMMZ tileset range` };
    const base = { type: set.type, fileW: set.cols * t, fileH: set.rows * t };
    if (tileId < AUTOTILE_FIRST) {
        return Object.assign(base, {
            x: ((Math.floor(tileId / 128) % 2) * 8 + (tileId % 8)) * t,
            y: (Math.floor((tileId % 256) / 8) % 16) * t, w: t, h: t
        });
    }
    const shape = (tileId - AUTOTILE_FIRST) % AUTOTILE_SHAPES;
    if (shape !== 0) return { error: `tileId ${tileId} is autotile shape ${shape}; an autotile entry is a whole block and uses shape 0` };
    const kind = (tileId - AUTOTILE_FIRST) / AUTOTILE_SHAPES, tx = kind % 8, ty = Math.floor(kind / 8);
    let bx, by, bw = 2, bh = 3; // tiles
    if (set.type === 'A1') {
        if (kind < 4) { bx = kind < 2 ? 0 : 6; by = (kind % 2) * 3; bw = kind < 2 ? 6 : 2; }
        else {
            bx = Math.floor(tx / 4) * 8 + (kind % 2 ? 6 : 0);
            by = ty * 6 + (Math.floor(tx / 2) % 2) * 3;
            bw = kind % 2 ? 2 : 6; // water: 3 frames side by side; waterfall: 3 frames stacked
        }
    } else if (set.type === 'A2') { bx = tx * 2; by = (ty - 2) * 3; }
    else if (set.type === 'A3') { bx = tx * 2; by = (ty - 6) * 2; bh = 2; }
    else { bx = tx * 2; by = Math.floor((ty - 10) * 2.5 + (ty % 2 === 1 ? 0.5 : 0)); bh = ty % 2 === 1 ? 2 : 3; }
    return Object.assign(base, { x: bx * t, y: by * t, w: bw * t, h: bh * t });
}

function characterTarget(entry, grid, geometry) {
    const rt = entry.runtime;
    if (grid.cols !== V.RMMZ_CHAR_COLS || grid.rows !== V.RMMZ_CHAR_ROWS) {
        return { error: `CHARACTER export needs a ${V.RMMZ_CHAR_COLS}x${V.RMMZ_CHAR_ROWS}-frame slot; this one is ${grid.cols}x${grid.rows}` };
    }
    const key = `${grid.fw}x${grid.fh}`;
    const block = (geometry.rmmzCharacterBlocks || {})[key];
    if (!block) return { error: `geometry.rmmzCharacterBlocks has no block for ${key} frames` };
    // RMMZ ImageManager.isBigCharacter: a leading run of ! and $ that contains a $.
    if (/^[!$]*\$/.test(path.posix.basename(rt.file))) {
        if (rt.index !== undefined && rt.index !== null && rt.index !== 0) return { error: `a "$" character file holds one block; index must be 0, got ${JSON.stringify(rt.index)}` };
        return { type: `CHARACTER_SINGLE_${key}`, fileW: block[0], fileH: block[1], x: 0, y: 0, w: block[0], h: block[1] };
    }
    const n = RMMZ_MULTI_COLS * RMMZ_MULTI_ROWS;
    if (!Number.isInteger(rt.index) || rt.index < 0 || rt.index >= n) return { error: `character index must be 0..${n - 1}, got ${JSON.stringify(rt.index)}` };
    return {
        type: `CHARACTER_MULTI_${key}`, fileW: block[0] * RMMZ_MULTI_COLS, fileH: block[1] * RMMZ_MULTI_ROWS,
        x: (rt.index % RMMZ_MULTI_COLS) * block[0], y: Math.floor(rt.index / RMMZ_MULTI_COLS) * block[1], w: block[0], h: block[1]
    };
}

// runtime.file must stay inside <out>/runtime: relative, "/" separators, no "." or ".." parts.
function runtimeRel(file) {
    if (typeof file !== 'string' || !/\.png$/i.test(file) || /[\\:*?"<>|]/.test(file) || file.startsWith('/')) return null;
    const parts = file.split('/');
    return parts.some(p => p === '' || p === '.' || p === '..') ? null : file;
}

function frameGrid(entry) {
    const f = entry.frames || {};
    const cols = f.cols || 1, rows = f.rows || 1;
    return { cols, rows, fw: entry.slot.w / cols, fh: entry.slot.h / rows };
}

// Maps every filled slot with a runtime target to its runtime file. Returns {errors, files}.
function runtimePlan(ctx, filled) {
    const errors = [], files = new Map();
    for (const f of filled) {
        const entry = ctx.entries.get(f.entryId), rt = entry.runtime;
        if (!rt) continue;
        const rel = runtimeRel(rt.file);
        if (!rel) { errors.push(`${entry.id}: runtime.file ${JSON.stringify(rt.file)} must be a relative .png path with / separators and no . or .. parts`); continue; }
        let target;
        if (rt.kind === 'TILESET') target = tilesetTarget(rt.tileId, ctx.geometry.tilePx);
        else if (rt.kind === 'CHARACTER') target = characterTarget(entry, frameGrid(entry), ctx.geometry);
        else target = { error: `runtime.kind ${JSON.stringify(rt.kind)} is not TILESET or CHARACTER` };
        if (target.error) { errors.push(`${entry.id}: ${target.error}`); continue; }
        if (target.w !== entry.slot.w || target.h !== entry.slot.h) {
            errors.push(`${entry.id}: slot is ${entry.slot.w}x${entry.slot.h} but its ${target.type} target in ${rel} is ${target.w}x${target.h}`);
            continue;
        }
        const key = rel.toLowerCase();
        let rf = files.get(key);
        if (!rf) files.set(key, rf = { file: rel, type: target.type, w: target.fileW, h: target.fileH, parts: [] });
        if (rf.file !== rel) { errors.push(`runtime files ${rf.file} and ${rel} differ only in letter case`); continue; }
        if (rf.type !== target.type) { errors.push(`${rel}: ${entry.id} needs a ${target.type} sheet; other entries make it ${rf.type}`); continue; }
        const clash = rf.parts.find(p => p.x < target.x + target.w && target.x < p.x + p.w && p.y < target.y + target.h && target.y < p.y + p.h);
        if (clash) { errors.push(`${rel}: ${entry.id} and ${clash.entryId} both target (${target.x},${target.y})`); continue; }
        rf.parts.push({ entryId: entry.id, slotId: entry.slot.slotId, sheetId: entry.slot.sheetId, src: entry.slot, x: target.x, y: target.y, w: target.w, h: target.h });
    }
    const list = [...files.values()].sort((a, b) => cmp(a.file, b.file));
    for (const rf of list) rf.parts.sort((a, b) => cmp(a.slotId, b.slotId));
    return { errors, files: list };
}

// ------------------------------------------------------------------ catalogue checks

function checkCatalogue(ctx) {
    const errors = [], t = ctx.geometry.tilePx, lower = new Map();
    for (const s of ctx.sheets.values()) {
        const k = s.sheetId.toLowerCase();
        if (lower.has(k)) errors.push(`sheets ${lower.get(k)} and ${s.sheetId} differ only in letter case`);
        lower.set(k, s.sheetId);
        if (s.kind === 'ATLAS' && (s.w % t || s.h % t || s.w > ATLAS_MAX_PX || s.h > ATLAS_MAX_PX)) {
            errors.push(`ATLAS ${s.sheetId} is ${s.w}x${s.h}; sides must be multiples of tilePx ${t} and at most ${ATLAS_MAX_PX}`);
        }
        if (s.kind === 'RMMZ_TILESET' && !RMMZ_TILESETS.some(f => f.cols * t === s.w && f.rows * t === s.h)) {
            errors.push(`RMMZ_TILESET ${s.sheetId} is ${s.w}x${s.h}, not an RMMZ tileset size`);
        }
        if (s.kind === 'RMMZ_CHARACTER' && (s.w % V.RMMZ_CHAR_COLS || s.h % V.RMMZ_CHAR_ROWS)) {
            errors.push(`RMMZ_CHARACTER ${s.sheetId} is ${s.w}x${s.h}; it must be ${V.RMMZ_CHAR_COLS} x frame width by ${V.RMMZ_CHAR_ROWS} x frame height`);
        }
    }
    const bySheet = new Map(), slotIds = new Map();
    for (const e of ctx.entries.values()) {
        if (V.isDerived(e)) {
            if (e.slot) errors.push(`${e.id}: a derived variant row owns no paint slot, but slot is set`);
            if (!ctx.entries.has(e.variants.derivedFrom)) errors.push(`${e.id}: derivedFrom ${e.variants.derivedFrom} is not an entry`);
            continue;
        }
        if (!e.slot || e.status === 'OUT_OF_SCOPE') continue;
        try { V.slotRect(ctx, e); }
        catch (err) { if (!(err instanceof Refusal)) throw err; errors.push(err.message); continue; }
        if (slotIds.has(e.slot.slotId)) { errors.push(`slot ${e.slot.slotId} belongs to both ${slotIds.get(e.slot.slotId)} and ${e.id}`); continue; }
        slotIds.set(e.slot.slotId, e.id);
        if (!bySheet.has(e.slot.sheetId)) bySheet.set(e.slot.sheetId, []);
        bySheet.get(e.slot.sheetId).push(e);
    }
    for (const list of bySheet.values()) {
        list.sort((a, b) => a.slot.x - b.slot.x || cmp(a.id, b.id));
        for (let i = 0; i < list.length; i++) {
            const a = list[i].slot;
            for (let j = i + 1; j < list.length && list[j].slot.x < a.x + a.w; j++) {
                const b = list[j].slot;
                if (b.y < a.y + a.h && a.y < b.y + b.h) errors.push(`slots ${a.slotId} and ${b.slotId} overlap`);
            }
        }
    }
    return errors;
}

// ------------------------------------------------------------------ pixels

// Copies a w x h block of RGBA bytes unchanged.
function copyRect(src, srcW, sx, sy, dst, dstW, dx, dy, w, h) {
    for (let row = 0; row < h; row++) {
        const s = ((sy + row) * srcW + sx) * 4;
        src.copy(dst, ((dy + row) * dstW + dx) * 4, s, s + w * 4);
    }
}

function rectBytes(buf, bufW, r) {
    const out = Buffer.alloc(r.w * r.h * 4);
    copyRect(buf, bufW, r.x, r.y, out, r.w, 0, 0, r.w, r.h);
    return out;
}

// Counts non-zero RGBA bytes outside every catalogue slot of the sheet (should be none).
function strayPixels(canvas, slots) {
    const mask = new Uint8Array(canvas.w * canvas.h);
    for (const s of slots) for (let y = s.y; y < s.y + s.h; y++) mask.fill(1, y * canvas.w + s.x, y * canvas.w + s.x + s.w);
    let count = 0, first = null;
    for (let i = 0; i < mask.length; i++) {
        if (mask[i]) continue;
        const o = i * 4, d = canvas.data;
        if (d[o] | d[o + 1] | d[o + 2] | d[o + 3]) {
            count++;
            if (!first) first = [i % canvas.w, Math.floor(i / canvas.w)];
        }
    }
    return { count, first };
}

// ------------------------------------------------------------------ state in --out

function isInside(dir, p) {
    const rel = path.relative(dir, p);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function readPriorState(ctx, outDir) {
    const state = { filled: new Map(), canvases: new Map(), errors: [] };
    const fail = (code, message) => { state.errors.push({ code, message }); return state; };
    if (!fs.existsSync(outDir)) return state;
    if (!fs.statSync(outDir).isDirectory()) return fail('OUT_DIR_INVALID', `--out ${outDir} is not a folder`);
    const reportFile = path.join(outDir, 'placement_report.json');
    if (!fs.existsSync(reportFile)) {
        if (fs.readdirSync(outDir).length) return fail('OUT_DIR_NOT_EMPTY', `${outDir} holds files but no placement_report.json; use an empty or new --out`);
        return state;
    }
    let rep;
    try { rep = JSON.parse(fs.readFileSync(reportFile, 'utf8')); }
    catch (e) { return fail('OUT_STATE_INVALID', `${reportFile} is not valid JSON: ${e.message}`); }
    if (!rep || rep.schema !== REPORT_SCHEMA || rep.result !== 'PLACED' || !Array.isArray(rep.sheets) || !Array.isArray(rep.filled)) {
        return fail('OUT_STATE_INVALID', `${reportFile} is not a ${REPORT_SCHEMA} report of a completed placement`);
    }
    const shaOf = k => rep[k] && rep[k].sha256;
    if (shaOf('catalogue') !== ctx.catalogueSha || shaOf('geometry') !== ctx.geometrySha || shaOf('palette') !== ctx.paletteSha) {
        return fail('OUT_STATE_STALE', `the catalogue, geometry or palette changed since ${outDir} was placed; place everything again into a new --out`);
    }
    for (const s of rep.sheets) {
        const sheet = s && ctx.sheets.get(s.sheetId);
        if (!sheet || s.file !== `sheets/${s.sheetId}.png`) return fail('OUT_STATE_INVALID', `${reportFile} lists an unknown sheet ${JSON.stringify(s)}`);
        const file = path.join(outDir, 'sheets', `${s.sheetId}.png`);
        let buf;
        try { buf = fs.readFileSync(file); } catch (e) { return fail('OUT_STATE_TAMPERED', `${file} is missing (${e.code})`); }
        if (V.sha256(buf) !== s.sha256) return fail('OUT_STATE_TAMPERED', `${file} changed since it was placed (sha256 ${V.sha256(buf)}, recorded ${s.sha256})`);
        let img;
        try { img = decodePNG(buf, file); } catch (e) { return fail('OUT_STATE_INVALID', `${file} cannot be decoded: ${e.message}`); }
        if (img.width !== sheet.w || img.height !== sheet.h) return fail('OUT_STATE_INVALID', `${file} is ${img.width}x${img.height}; sheet ${sheet.sheetId} is ${sheet.w}x${sheet.h}`);
        state.canvases.set(sheet.sheetId, { w: sheet.w, h: sheet.h, data: Buffer.from(img.data) });
    }
    for (const f of rep.filled) {
        const e = f && ctx.entries.get(f.entryId);
        const s = e && e.slot;
        if (!s || s.slotId !== f.slotId || s.sheetId !== f.sheetId || s.x !== f.x || s.y !== f.y || s.w !== f.w || s.h !== f.h) {
            return fail('OUT_STATE_INVALID', `${reportFile} lists filled slot ${JSON.stringify(f && f.slotId)} that does not match the catalogue`);
        }
        const c = state.canvases.get(s.sheetId);
        if (!c || V.sha256(rectBytes(c.data, c.w, s)) !== f.rectSha256) {
            return fail('OUT_STATE_TAMPERED', `the pixels of slot ${s.slotId} in sheets/${s.sheetId}.png differ from the recorded placement`);
        }
        state.filled.set(f.slotId, f);
    }
    return state;
}

// ------------------------------------------------------------------ coverage

function buildCoverage(ctx, filled, stray) {
    const bandIds = new Set((ctx.geometry.bands || []).map(b => b.id));
    const entries = [...ctx.entries.values()].sort((a, b) => cmp(a.id, b.id));
    const placeable = e => !V.isDerived(e) && e.slot && e.status !== 'OUT_OF_SCOPE';
    const sheets = [...ctx.sheets.values()].sort((a, b) => cmp(a.sheetId, b.sheetId)).map(sheet => {
        const ids = entries.filter(e => placeable(e) && e.slot.sheetId === sheet.sheetId).map(e => e.slot.slotId).sort(cmp);
        const tpl = V.loadTemplate(ctx, sheet);
        const idSet = new Set(ids);
        return {
            sheetId: sheet.sheetId, kind: sheet.kind, slots: ids.length,
            filled: ids.filter(id => filled.has(id)), empty: ids.filter(id => !filled.has(id)),
            unexpected: tpl.error ? [] : [...tpl.slots.keys()].filter(id => !idSet.has(id)).sort(cmp),
            notInTemplate: tpl.error ? [] : ids.filter(id => !tpl.slots.has(id)),
            template: tpl.error ? tpl.error.code : 'OK',
            strayPixels: stray.get(sheet.sheetId) || 0
        };
    });
    const bandNames = [...new Set(entries.map(e => (typeof e.band === 'string' && e.band) || '(none)'))].sort(cmp);
    const bands = bandNames.map(band => {
        const list = entries.filter(e => ((typeof e.band === 'string' && e.band) || '(none)') === band);
        const slotted = list.filter(placeable);
        const known = bandIds.has(band);
        return {
            band, inGeometry: known, slots: slotted.length,
            filled: slotted.filter(e => filled.has(e.slot.slotId)).map(e => e.id),
            empty: slotted.filter(e => !filled.has(e.slot.slotId)).map(e => e.id),
            derivedPending: list.filter(V.isDerived).map(e => e.id),
            noSlot: list.filter(e => !V.isDerived(e) && !placeable(e)).map(e => e.id),
            unexpected: known ? [] : list.map(e => e.id)
        };
    });
    const sum = (arr, k) => arr.reduce((n, x) => n + (Array.isArray(x[k]) ? x[k].length : x[k]), 0);
    return {
        schema: COVERAGE_SCHEMA, catalogueSha256: ctx.catalogueSha,
        totals: { slots: sum(sheets, 'slots'), filled: sum(sheets, 'filled'), empty: sum(sheets, 'empty'), unexpected: sum(sheets, 'unexpected'), strayPixels: sum(sheets, 'strayPixels'), derivedPending: sum(bands, 'derivedPending'), noSlot: sum(bands, 'noSlot') },
        sheets, bands
    };
}

function coverageMarkdown(cov) {
    const L = ['# Art placement coverage', '', `Written by tools/art/place_art.js for catalogue sha256 \`${cov.catalogueSha256}\`.`, '',
        '## Per sheet', '', '| Sheet | Kind | Slots | Filled | Empty | Unexpected | Not in template | Stray pixels | Template |', '| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | :--- |'];
    for (const s of cov.sheets) L.push(`| ${s.sheetId} | ${s.kind} | ${s.slots} | ${s.filled.length} | ${s.empty.length} | ${s.unexpected.length} | ${s.notInTemplate.length} | ${s.strayPixels} | ${s.template} |`);
    L.push('', '## Per band', '', '| Band | In geometry | Slots | Filled | Empty | Derived pending | No slot | Unexpected |', '| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |');
    for (const b of cov.bands) L.push(`| ${b.band} | ${b.inGeometry ? 'yes' : 'no'} | ${b.slots} | ${b.filled.length} | ${b.empty.length} | ${b.derivedPending.length} | ${b.noSlot.length} | ${b.unexpected.length} |`);
    const odd = [];
    for (const s of cov.sheets) {
        if (s.unexpected.length) odd.push(`- ${s.sheetId}: template slots not in the catalogue: ${s.unexpected.join(', ')}`);
        if (s.notInTemplate.length) odd.push(`- ${s.sheetId}: catalogue slots missing from the template: ${s.notInTemplate.join(', ')}`);
    }
    for (const b of cov.bands) if (b.unexpected.length) odd.push(`- band ${b.band} is not in geometry.bands: ${b.unexpected.join(', ')}`);
    L.push('', '## Unexpected', '', ...(odd.length ? odd : ['None.']), '');
    return L.join('\n');
}

// ------------------------------------------------------------------ placement

const inputEntryId = name => name.replace(/\.png$/i, '');
// Input names that map to one entry (X.png and X.PNG on a case-sensitive file system).
function duplicateInputs(names) {
    const by = new Map();
    for (const n of names) { const id = inputEntryId(n); by.set(id, (by.get(id) || []).concat([n])); }
    return [...by].filter(([, files]) => files.length > 1);
}

function refusedReport(refusals, extra) {
    return Object.assign({ tool: 'place_art', schema: REPORT_SCHEMA, result: 'REFUSED', refusals }, extra || {});
}

function placeArt(opts) {
    const refusals = [];
    const refuse = (code, message, extra) => refusals.push(Object.assign({ codes: [code], reasons: [{ code, message }] }, extra || {}));
    let ctx;
    try { ctx = V.loadContext(opts); }
    catch (e) {
        if (!(e instanceof Refusal)) throw e;
        refuse(e.code, e.message);
        return { exitCode: e.code === 'IO_ERROR' ? 2 : 1, report: refusedReport(refusals) };
    }
    const inDir = path.resolve(opts.in), outDir = path.resolve(opts.out);
    if (!fs.existsSync(inDir) || !fs.statSync(inDir).isDirectory()) {
        refuse('IO_ERROR', `--in ${inDir} is not a folder`);
        return { exitCode: 2, report: refusedReport(refusals) };
    }
    const guarded = [ctx.catalogueFile, ctx.geometryFile, ctx.paletteFile, ctx.approvalsFile, ctx.templatesDir, inDir];
    const unsafe = guarded.filter(p => isInside(outDir, p));
    if (unsafe.length || isInside(ctx.templatesDir, outDir) || isInside(path.dirname(ctx.catalogueFile), outDir)) {
        refuse('OUT_DIR_UNSAFE', `--out ${outDir} must not contain, or sit inside, the catalogue, geometry, palette, approvals, templates or --in paths${unsafe.length ? ` (${unsafe.join(', ')})` : ''}`);
        return { exitCode: 1, report: refusedReport(refusals) };
    }
    for (const msg of checkCatalogue(ctx)) refuse('CATALOGUE_INVALID', msg);
    if (refusals.length) return { exitCode: 1, report: refusedReport(refusals) };

    const prior = readPriorState(ctx, outDir);
    for (const e of prior.errors) refuse(e.code, e.message);
    if (refusals.length) return { exitCode: 1, report: refusedReport(refusals) };

    const slotOwner = new Map([...ctx.entries.values()].filter(e => e.slot && !V.isDerived(e)).map(e => [e.slot.slotId, e]));
    const replace = new Set(opts.replace || []);
    for (const id of replace) if (!slotOwner.has(id)) refuse('REPLACE_UNKNOWN_SLOT', `--replace ${id} is not a catalogue slot id`);

    // Validate every input, then apply the overwrite guard.
    const listing = fs.readdirSync(inDir).sort(cmp);
    const names = listing.filter(n => /\.png$/i.test(n) && fs.statSync(path.join(inDir, n)).isFile());
    const ignoredFiles = listing.filter(n => !names.includes(n));
    for (const [entryId, files] of duplicateInputs(names)) refuse('DUPLICATE_INPUT', `${files.join(' and ')} both name entry ${entryId}`, { entryId });
    const placements = [];
    for (const name of names) {
        const entryId = inputEntryId(name);
        if (!ctx.entries.has(entryId)) { refuse('UNKNOWN_INPUT', `no catalogue entry ${entryId}; inputs are named <entryId>.png`, { input: name, entryId }); continue; }
        let buf;
        try { buf = fs.readFileSync(path.join(inDir, name)); }
        catch (e) { refuse('IO_ERROR', `cannot read ${name}: ${e.code || e.message}`, { input: name, entryId }); continue; }
        const res = V.validateBuffer(ctx, buf, name, entryId);
        if (res.result !== 'ACCEPTED') { refusals.push({ input: name, entryId, sha256: res.sha256, codes: res.codes, reasons: res.reasons }); continue; }
        const slot = ctx.entries.get(entryId).slot;
        const prev = prior.filled.get(slot.slotId);
        if (prev && prev.sha256 !== res.sha256 && !replace.has(slot.slotId)) {
            refuse('OVERWRITE_REFUSED', `slot ${slot.slotId} already holds ${prev.source} (sha256 ${prev.sha256}); pass --replace ${slot.slotId} to overwrite it`, { input: name, entryId, sha256: res.sha256 });
            continue;
        }
        const action = !prev ? 'PLACED' : prev.sha256 === res.sha256 ? 'UNCHANGED' : 'REPLACED';
        placements.push({ source: name, entryId, slot, sha256: res.sha256, image: res.image, action });
    }
    const targeted = new Set(placements.map(p => p.slot.slotId));
    for (const id of replace) if (slotOwner.has(id) && !targeted.has(id)) refuse('REPLACE_UNUSED', `--replace ${id} was given but no input targets that slot`);

    // Earlier placements that stay must still be approved by the current ledger.
    for (const [slotId, f] of prior.filled) {
        if (targeted.has(slotId)) continue;
        const reasons = V.approvalReasons(ctx.ledger, f.sha256, ctx.entries.get(f.entryId));
        if (reasons.length) {
            refusals.push({
                entryId: f.entryId, slotId, sha256: f.sha256, codes: ['APPROVAL_REVOKED', ...reasons.map(r => r.code)],
                reasons: [{ code: 'APPROVAL_REVOKED', message: `slot ${slotId} holds ${f.source} (sha256 ${f.sha256}), which the ledger no longer approves; place again into a new --out` }, ...reasons]
            });
        }
    }

    const filled = new Map(prior.filled);
    for (const p of placements) {
        filled.set(p.slot.slotId, { slotId: p.slot.slotId, entryId: p.entryId, sheetId: p.slot.sheetId, x: p.slot.x, y: p.slot.y, w: p.slot.w, h: p.slot.h, sha256: p.sha256, rectSha256: null, source: p.source });
    }
    const filledList = [...filled.values()].sort((a, b) => cmp(a.slotId, b.slotId));
    const plan = runtimePlan(ctx, filledList);
    for (const msg of plan.errors) refuse('RUNTIME_INVALID', msg);
    if (refusals.length) return { exitCode: 1, report: refusedReport(refusals, { ignoredFiles }) };

    // Compose the sheets: earlier state plus this run's files, copied 1:1 into their slot rects.
    const canvases = prior.canvases;
    for (const p of placements) {
        const sheet = ctx.sheets.get(p.slot.sheetId);
        let c = canvases.get(sheet.sheetId);
        if (!c) canvases.set(sheet.sheetId, c = { w: sheet.w, h: sheet.h, data: Buffer.alloc(sheet.w * sheet.h * 4) });
        copyRect(p.image.data, p.image.width, 0, 0, c.data, c.w, p.slot.x, p.slot.y, p.slot.w, p.slot.h);
    }
    // Self-check: every slot holds exactly its file's bytes and nothing lies outside the slots.
    for (const p of placements) {
        const c = canvases.get(p.slot.sheetId);
        if (!rectBytes(c.data, c.w, p.slot).equals(p.image.data)) refuse('INTERNAL_COPY_MISMATCH', `slot ${p.slot.slotId} does not hold the bytes of ${p.source} after the copy`);
    }
    const stray = new Map();
    for (const [sheetId, c] of canvases) {
        const slots = [...ctx.entries.values()].filter(e => e.slot && !V.isDerived(e) && e.slot.sheetId === sheetId).map(e => e.slot);
        const s = strayPixels(c, slots);
        stray.set(sheetId, s.count);
        if (s.count) refuse('STRAY_PIXELS', `sheets/${sheetId}.png has ${s.count} pixel(s) outside every catalogue slot, first at (${s.first[0]},${s.first[1]})`);
    }
    if (refusals.length) return { exitCode: 1, report: refusedReport(refusals, { ignoredFiles }) };
    for (const f of filledList) {
        const c = canvases.get(f.sheetId);
        f.rectSha256 = V.sha256(rectBytes(c.data, c.w, f));
    }

    // Encode outputs (placement_report.json last, so an interrupted write fails the next run's checks).
    const writes = [];
    const sheetsOut = [];
    for (const sheetId of [...canvases.keys()].sort(cmp)) {
        const c = canvases.get(sheetId);
        const buf = writePNG(c.data, c.w, c.h);
        sheetsOut.push({ sheetId, file: `sheets/${sheetId}.png`, w: c.w, h: c.h, sha256: V.sha256(buf) });
        writes.push({ rel: `sheets/${sheetId}.png`, buf });
    }
    const runtimeOut = [];
    for (const rf of plan.files) {
        const data = Buffer.alloc(rf.w * rf.h * 4);
        for (const part of rf.parts) {
            const c = canvases.get(part.sheetId);
            copyRect(c.data, c.w, part.src.x, part.src.y, data, rf.w, part.x, part.y, part.w, part.h);
        }
        const buf = writePNG(data, rf.w, rf.h);
        runtimeOut.push({ file: `runtime/${rf.file}`, type: rf.type, w: rf.w, h: rf.h, sha256: V.sha256(buf), parts: rf.parts.map(p => ({ entryId: p.entryId, slotId: p.slotId, x: p.x, y: p.y, w: p.w, h: p.h })) });
        writes.push({ rel: `runtime/${rf.file}`, buf });
    }
    const derivedPending = [...ctx.entries.values()].filter(V.isDerived).sort((a, b) => cmp(a.id, b.id)).map(e => {
        const parent = ctx.entries.get(e.variants.derivedFrom);
        const pf = parent && parent.slot && filled.get(parent.slot.slotId);
        const names = parent ? [parent.id, parent.slot && parent.slot.slotId].filter(Boolean) : [];
        const approved = !!pf && ctx.ledger.rows.some(r => r.decision === 'YEA' && r.sha256 === pf.sha256 && r.ids.some(id => names.includes(id)) && r.variants.includes(e.id));
        return { entryId: e.id, derivedFrom: e.variants.derivedFrom, status: 'DERIVED_PENDING', parentFilled: !!pf, ledgerApprovedVariant: approved };
    });
    const coverage = buildCoverage(ctx, filled, stray);
    const report = {
        tool: 'place_art', schema: REPORT_SCHEMA, result: 'PLACED',
        catalogue: { sha256: ctx.catalogueSha }, geometry: { sha256: ctx.geometrySha }, palette: { sha256: ctx.paletteSha }, approvals: { sha256: ctx.approvalsSha },
        filled: filledList,
        actions: placements.map(p => ({ slotId: p.slot.slotId, entryId: p.entryId, action: p.action, sha256: p.sha256, source: p.source })).sort((a, b) => cmp(a.slotId, b.slotId)),
        derivedPending, sheets: sheetsOut, runtime: runtimeOut, ignoredFiles,
        coverage: { file: 'coverage_report.json', totals: coverage.totals }
    };
    writes.push({ rel: 'coverage_report.json', buf: Buffer.from(JSON.stringify(coverage, null, 2) + '\n') });
    writes.push({ rel: 'coverage_report.md', buf: Buffer.from(coverageMarkdown(coverage)) });
    writes.push({ rel: 'placement_report.json', buf: Buffer.from(JSON.stringify(report, null, 2) + '\n') });

    // Write each file beside its target, then rename into place.
    const suffix = `.tmp-${process.pid}`;
    const abs = writes.map(w => path.join(outDir, ...w.rel.split('/')));
    writes.forEach((w, i) => { fs.mkdirSync(path.dirname(abs[i]), { recursive: true }); fs.writeFileSync(abs[i] + suffix, w.buf); });
    abs.forEach(a => fs.renameSync(a + suffix, a));
    return { exitCode: 0, report };
}

// ------------------------------------------------------------------ CLI

function printReport(r) {
    for (const f of r.refusals || []) {
        const who = f.input || f.slotId || '';
        for (const reason of f.reasons) {
            console.log(`REFUSE ${who ? `${who} ` : ''}${reason.code}: ${reason.message}`);
            if (reason.pixels && reason.pixels.length) console.log(`  pixels (${reason.count}): ${reason.pixels.map(p => `(${p[0]},${p[1]})`).join(' ')}${reason.count > reason.pixels.length ? ' ...' : ''}`);
        }
    }
    for (const a of r.actions || []) console.log(`${a.action} ${a.slotId} <- ${a.source} (${a.entryId})`);
    for (const d of r.derivedPending || []) console.log(`DERIVED_PENDING ${d.entryId} (from ${d.derivedFrom})`);
    if (r.result === 'PLACED') {
        const t = r.coverage.totals;
        console.log(`RESULT: PLACED filled=${t.filled}/${t.slots} empty=${t.empty} unexpected=${t.unexpected} derivedPending=${t.derivedPending} sheets=${r.sheets.length} runtime=${r.runtime.length}`);
    } else {
        console.log(`RESULT: REFUSED (${(r.refusals || []).length} refusal(s)); nothing under --out was changed`);
    }
}

function main(argv) {
    const usage = 'usage: node tools/art/place_art.js --catalogue <path> --approvals <path> --in <dir> --out <dir> [--replace <slotId>]... [--geometry <path>] [--templates <dir>] [--root <dir>] [--json]';
    let args;
    try {
        args = V.parseArgs(argv, { values: ['catalogue', 'approvals', 'in', 'out', 'geometry', 'templates', 'root'], multi: ['replace'], flags: ['json', 'help'] });
        if (args.help) { console.log(usage); return 0; }
        if (args._.length) throw new Error(`unexpected argument ${args._[0]}`);
        for (const k of ['catalogue', 'approvals', 'in', 'out']) if (!args[k]) throw new Error(`--${k} is required`);
    } catch (e) {
        console.error(`place_art: ${e.message}\n${usage}`);
        return 2;
    }
    const { exitCode, report } = placeArt(args);
    if (args.json) console.log(JSON.stringify(report, null, 2));
    else printReport(report);
    return exitCode;
}

module.exports = { placeArt, tilesetTarget, characterTarget, runtimeRel, checkCatalogue, copyRect, duplicateInputs, REPORT_SCHEMA, COVERAGE_SCHEMA };

if (require.main === module) process.exitCode = main(process.argv.slice(2));
