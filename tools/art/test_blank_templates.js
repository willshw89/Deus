#!/usr/bin/env node
'use strict';
/**
 * tools/art/test_blank_templates.js — WG.32.02 Lane T: tests for tools/art/make_blank_templates.js.
 *
 * Runs the generator on the TEST_ fixture (tools/art/fixtures/templates/) and checks every output
 * pixel against an oracle built here from the catalogue and geometry: grid lines, slot outlines,
 * stratum ticks and labels in their colours, background everywhere else. All output goes to a
 * folder under os.tmpdir(); the repository is only read (check repo_untouched).
 *
 * BRIEF WG.32.02 done tests -> checks (each prints PASS/FAIL templates.<check>[...]):
 *   (1) one_per_sheet  (2) dimensions  (3) census  (4) slot_edges  (5) interior, free_area, labels
 *   (6) sidecar  (7) determinism  (8) palette  (9) stratum_param  (10) mutants
 *   and: run, png_chunks, bg_magenta, tall_medium, readability_floor, refusals, out_dir_safety,
 *   no_literals, fixture_contract, fixture_drift, repo_untouched.
 * UF_TEST_PROVOKE=templates.<check> feeds that check a broken input (a synthetic solid-colour
 * block, a changed pixel, a wrong expectation) so it must print FAIL; --provoke-all runs every
 * provocation in a child process and checks each one fails only its own check.
 *
 * Usage: node tools/art/test_blank_templates.js [--only=<check>[,<check>...]] [--keep] [--provoke-all]
 * Output: PASS <name> / FAIL <name>: <detail> and INFO lines, then RESULT: <n> passed, <m> failed.
 * Exit 1 on any failure.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const TOOL = path.join(__dirname, 'make_blank_templates.js');
const tool = require(TOOL);
const { decodePNG } = require(path.join(REPO_ROOT, 'tools', 'png_read.js'));
const { writePNG } = require(path.join(REPO_ROOT, 'tools', 'png_util.js'));
const fixture = require(path.join(__dirname, 'fixtures', 'templates', 'build_fixture.js'));
const FIX_CAT = fixture.CATALOGUE_FILE;
const FIX_GEO = fixture.GEOMETRY_FILE;
const MASTER_PALETTE = path.join(REPO_ROOT, 'art', 'palette', 'deus_master_world_palette_v1.hex');

const CHECKS = ['run', 'one_per_sheet', 'dimensions', 'census', 'slot_edges', 'interior', 'free_area', 'labels',
    'sidecar', 'png_chunks', 'determinism', 'palette', 'bg_magenta', 'stratum_param', 'tall_medium',
    'readability_floor', 'refusals', 'out_dir_safety', 'no_literals', 'mutants', 'fixture_contract',
    'fixture_drift', 'repo_untouched'];
const PIXEL_CHECKS = ['one_per_sheet', 'dimensions', 'census', 'slot_edges', 'interior', 'free_area', 'labels', 'sidecar', 'png_chunks'];

const ARGS = process.argv.slice(2);
const KEEP = ARGS.includes('--keep');
const PROVOKE_ALL = ARGS.includes('--provoke-all');
const ONLY = new Set(((ARGS.find(a => a.startsWith('--only=')) || '').slice('--only='.length)).split(',').filter(Boolean));
const PROVOKE = process.env.UF_TEST_PROVOKE || '';

let passed = 0, failed = 0;
function check(name, ok, detail) {
    if (ok) { passed++; console.log(`PASS ${name}`); } else { failed++; console.log(`FAIL ${name}: ${detail}`); }
}
function info(msg) { console.log(`INFO ${msg}`); }
function want(name) { return ONLY.size === 0 || ONLY.has(name); }
function provoked(name) { return PROVOKE === `templates.${name}`; }
function problems(list) { return list.length ? `${list.length} problem(s): ${list.slice(0, 4).join('; ')}` : ''; }

const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');
const textSha256 = buf => sha256(Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'), 'utf8'));
const clone = obj => JSON.parse(JSON.stringify(obj));
const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const cumulative = (split, d) => split.slice(0, d).reduce((a, b) => a + b, 0);

// ---------------------------------------------------------------- colours and oracle

const hexRgba = hex => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255];
const pack = c => ((c[0] << 24) | (c[1] << 16) | (c[2] << 8) | c[3]) >>> 0;
const unpackHex = v => '#' + v.toString(16).padStart(8, '0').toUpperCase();
const GRID = pack(hexRgba(tool.GRID_HEX));
const LABEL = pack(hexRgba(tool.LABEL_HEX));
const BG = { transparent: pack([0, 0, 0, 0]), magenta: pack([255, 0, 255, 255]) };
const BG_RGBA = { transparent: [0, 0, 0, 0], magenta: [255, 0, 255, 255] };
const { FONT, GLYPH_W, GLYPH_H, GLYPH_ADVANCE, LAYOUT } = tool;

// The label rule, written independently of the generator: "<slot index> <short code>".
function shortCode(row) { return String(row).toUpperCase().split('_').filter(Boolean).map(w => (/^\d+$/.test(w) ? w : w[0])).join(''); }

// Tick rows (offsets from the slot top) the spec asks for, or [] for slots that are not geometry-derived.
function expectedTicks(entry, geo) {
    const m = /^GEOM_STRATUM_(\d+)$/.exec(entry.scaleRow);
    const strata = m ? Number(m[1]) : entry.scaleRow === 'GEOM_LAYER_FACE' ? geo.stratumPx.length : 0;
    if (!strata) return [];
    const rows = (entry.frames && entry.frames.rows) || 1;
    const frameH = entry.slot.h / rows;
    const out = new Set();
    for (let r = 0; r < rows; r++) {
        for (let k = 1; k <= strata; k++) {
            const row = (r + 1) * frameH - cumulative(geo.stratumPx, k);
            if (row > 0) out.add(row);
        }
    }
    return [...out].sort((a, b) => a - b);
}

function expectedLabel(entry, hasTicks) {
    const s = entry.slot;
    const index = s.slotId.split(':').pop();
    const inset = LAYOUT.labelPad + (hasTicks ? LAYOUT.tickLen + LAYOUT.tickGap : 0);
    const width = t => t.length * GLYPH_ADVANCE - 1;
    const fits = t => GLYPH_H <= s.h - 2 * LAYOUT.labelPad && width(t) <= s.w - 2 * inset;
    const full = `${index} ${shortCode(entry.scaleRow)}`;
    const text = fits(full) ? full : fits(index) ? index : null;
    return { text, mode: text === null ? 'NONE' : text === full ? 'FULL' : 'INDEX', x: s.x + inset, y: s.y + LAYOUT.labelPad, w: text ? width(text) : 0, h: GLYPH_H };
}

// Class map of the sheet the spec describes: 0 background, 1 grid colour, 2 label colour.
function expectedSheet(sheet, placed, geo) {
    const { w, h } = sheet;
    const cls = new Uint8Array(w * h);
    const mark = (x, y, c) => { if (x >= 0 && y >= 0 && x < w && y < h) cls[y * w + x] = c; };
    for (let x = 0; x < w; x++) if (x % sheet.gridPx === 0 || x === w - 1) for (let y = 0; y < h; y++) cls[y * w + x] = 1;
    for (let y = 0; y < h; y++) if (y % sheet.gridPx === 0 || y === h - 1) cls.fill(1, y * w, y * w + w);
    const slots = [];
    for (const e of placed) {
        const s = e.slot;
        for (let x = s.x; x < s.x + s.w; x++) { mark(x, s.y, 1); mark(x, s.y + s.h - 1, 1); }
        for (let y = s.y; y < s.y + s.h; y++) { mark(s.x, y, 1); mark(s.x + s.w - 1, y, 1); }
        const ticks = expectedTicks(e, geo);
        const len = Math.min(LAYOUT.tickLen, s.w - 2);
        for (const t of ticks) for (let i = 1; i <= len; i++) { mark(s.x + i, s.y + t, 1); mark(s.x + s.w - 1 - i, s.y + t, 1); }
        const label = expectedLabel(e, ticks.length > 0);
        if (label.text) {
            for (let c = 0; c < label.text.length; c++) {
                const glyph = FONT[label.text[c]] || FONT['?'];
                for (let gy = 0; gy < GLYPH_H; gy++) for (let gx = 0; gx < GLYPH_W; gx++) {
                    if (glyph[gy][gx] === '#') mark(label.x + c * GLYPH_ADVANCE + gx, label.y + gy, 2);
                }
            }
        }
        slots.push({ entry: e, ticks, label });
    }
    return { cls, slots };
}

function decodeLabel(data, w, label) {
    let text = '';
    for (let c = 0; c < label.text.length; c++) {
        const rows = [];
        for (let gy = 0; gy < GLYPH_H; gy++) {
            let row = '';
            for (let gx = 0; gx < GLYPH_W; gx++) row += data.readUInt32BE(((label.y + gy) * w + label.x + c * GLYPH_ADVANCE + gx) * 4) === LABEL ? '#' : '.';
            rows.push(row);
        }
        const hit = Object.keys(FONT).find(k => FONT[k].join('/') === rows.join('/'));
        text += hit === undefined ? '¿' : hit;
    }
    return text;
}

function placedOn(cat, sheetId) {
    return (cat.entries || []).filter(e => e.slot && e.slot.sheetId === sheetId)
        .sort((a, b) => (a.slot.slotId < b.slot.slotId ? -1 : a.slot.slotId > b.slot.slotId ? 1 : 0));
}

function pngChunks(buf) {
    const out = [];
    let pos = 8;
    while (pos + 8 <= buf.length) {
        const len = buf.readUInt32BE(pos);
        out.push(buf.toString('ascii', pos + 4, pos + 8));
        pos += 12 + len;
    }
    return out;
}
function withTextChunk(png) {
    const data = Buffer.from('Comment\0TEST_ provoked text chunk', 'latin1');
    const chunk = Buffer.alloc(12 + data.length);
    chunk.writeUInt32BE(data.length, 0);
    chunk.write('tEXt', 4, 'ascii');
    data.copy(chunk, 8);
    const iend = png.length - 12;
    return Buffer.concat([png.subarray(0, iend), chunk, png.subarray(iend)]);
}
function solidBlock(w, h, rgba) {
    const data = Buffer.alloc(w * h * 4);
    for (let o = 0; o < data.length; o += 4) data.set(rgba, o);
    return writePNG(data, w, h);
}

// ---------------------------------------------------------------- verifying one output folder

// Returns { results: { <check>: [problems] }, colours: Set of opaque colours, sidecars: { sheetId: json } }.
function verifyOutput(outDir, cat, geo, geoSha, bgName, primary) {
    const R = {};
    for (const k of PIXEL_CHECKS) R[k] = [];
    const P = name => primary && provoked(name);
    const bg = BG[bgName];
    const colours = new Set();
    const sidecars = {};

    let listing = fs.existsSync(outDir) ? fs.readdirSync(outDir).sort() : [];
    if (P('one_per_sheet')) listing = listing.concat('TEST_PROVOKED_EXTRA.png');
    const expectedFiles = new Set(['INDEX.md']);
    for (const s of cat.sheets) { expectedFiles.add(`${s.sheetId}.png`); expectedFiles.add(`${s.sheetId}.json`); }
    for (const f of listing) if (!expectedFiles.has(f)) R.one_per_sheet.push(`unexpected file ${f}`);
    for (const f of expectedFiles) if (!listing.includes(f)) R.one_per_sheet.push(`missing ${f}`);
    if (fs.existsSync(path.join(outDir, 'INDEX.md'))) {
        const index = fs.readFileSync(path.join(outDir, 'INDEX.md'), 'utf8');
        for (const s of cat.sheets) if (!index.includes('`' + s.sheetId + '`')) R.one_per_sheet.push(`INDEX.md does not list ${s.sheetId}`);
    }

    cat.sheets.forEach((sheet, si) => {
        const id = sheet.sheetId;
        const first = si === 0;
        const pngPath = path.join(outDir, `${id}.png`);
        if (!fs.existsSync(pngPath)) { R.dimensions.push(`${id}: no PNG to measure`); return; }
        const bytes = fs.readFileSync(pngPath);
        const chunks = pngChunks(P('png_chunks') && first ? withTextChunk(bytes) : bytes);
        const inner = chunks.slice(1, -1);
        if (chunks[0] !== 'IHDR' || chunks[chunks.length - 1] !== 'IEND' || !inner.length || inner.some(c => c !== 'IDAT')) {
            R.png_chunks.push(`${id}: chunks ${chunks.join(',')} (want IHDR, IDAT..., IEND only)`);
        }
        if (bytes[24] !== 8 || bytes[25] !== 6 || bytes[28] !== 0) R.png_chunks.push(`${id}: IHDR depth ${bytes[24]} colour type ${bytes[25]} interlace ${bytes[28]} (want 8, 6, 0)`);

        const img = decodePNG(bytes, id);
        const dim = P('dimensions') && first ? decodePNG(solidBlock(sheet.w + 1, sheet.h, [0, 0, 0, 0]), 'provoked') : img;
        if (dim.width !== sheet.w || dim.height !== sheet.h) R.dimensions.push(`${id}: PNG is ${dim.width}x${dim.height}, catalogue says ${sheet.w}x${sheet.h}`);
        if (img.width !== sheet.w || img.height !== sheet.h) return;

        const { w, h } = sheet;
        const placed = placedOn(cat, id);
        const exp = expectedSheet(sheet, placed, geo);
        const expect = i => (exp.cls[i] === 1 ? GRID : exp.cls[i] === 2 ? LABEL : bg);
        const inLabel = (L, x, y) => L.text && x >= L.x && x < L.x + L.w && y >= L.y && y < L.y + L.h;
        const inSlot = new Uint8Array(w * h);
        for (const p of exp.slots) { const s = p.entry.slot; for (let y = s.y; y < s.y + s.h; y++) inSlot.fill(1, y * w + s.x, y * w + s.x + s.w); }
        const tampered = (name, fn) => { if (!(P(name) && first)) return img.data; const copy = Buffer.from(img.data); fn(copy); return copy; };
        // Provocation targets: a background pixel inside the first slot (off its label), or outside every slot.
        const firstInteriorBg = () => {
            const p = exp.slots[0], s = p.entry.slot;
            for (let y = s.y + 1; y < s.y + s.h - 1; y++) for (let x = s.x + 1; x < s.x + s.w - 1; x++) if (exp.cls[y * w + x] === 0 && !inLabel(p.label, x, y)) return y * w + x;
            return -1;
        };
        const firstFreeBg = () => { for (let i = 0; i < w * h; i++) if (!inSlot[i] && exp.cls[i] === 0) return i; return -1; };

        // (3) census: only background, grid and label colours; alpha only 0 or 255.
        const cdata = tampered('census', d => d.writeUInt32BE(pack([1, 2, 3, 255]), (w * h - w - 2) * 4));
        let badColour = 0, badAlpha = 0;
        const samples = [];
        for (let i = 0; i < w * h; i++) {
            const v = cdata.readUInt32BE(i * 4);
            const a = v & 255;
            if (a !== 0 && a !== 255) badAlpha++;
            if (a === 255) colours.add(v);
            if (v !== bg && v !== GRID && v !== LABEL) { badColour++; if (samples.length < 3) samples.push(`(${i % w},${(i / w) | 0}) ${unpackHex(v)}`); }
        }
        if (badColour) R.census.push(`${id}: ${badColour} pixel(s) outside {bg ${unpackHex(bg)}, grid ${unpackHex(GRID)}, label ${unpackHex(LABEL)}}, e.g. ${samples.join(', ')}`);
        if (badAlpha) R.census.push(`${id}: ${badAlpha} pixel(s) with alpha other than 0/255`);

        // (4) slot edges: every pixel of the four boundary edges is the grid colour.
        const edata = tampered('slot_edges', d => { const s = exp.slots[0].entry.slot; d.writeUInt32BE(bg, ((s.y + s.h - 1) * w + s.x + s.w - 1) * 4); });
        for (const p of exp.slots) {
            const s = p.entry.slot;
            let miss = 0;
            const at = (x, y) => { if (edata.readUInt32BE((y * w + x) * 4) !== GRID) miss++; };
            for (let x = s.x; x < s.x + s.w; x++) { at(x, s.y); at(x, s.y + s.h - 1); }
            for (let y = s.y + 1; y < s.y + s.h - 1; y++) { at(s.x, y); at(s.x + s.w - 1, y); }
            if (miss) R.slot_edges.push(`${s.slotId} (${s.x},${s.y} ${s.w}x${s.h}): ${miss} boundary pixel(s) not grid colour`);
        }

        // (5a) interiors minus the label box: grid lines and ticks where the spec puts them, background elsewhere.
        const idata = tampered('interior', d => { const i = firstInteriorBg(); if (i >= 0) d.writeUInt32BE(GRID, i * 4); });
        for (const p of exp.slots) {
            const s = p.entry.slot, L = p.label;
            let bad = 0, sample = '';
            for (let y = s.y + 1; y < s.y + s.h - 1; y++) {
                for (let x = s.x + 1; x < s.x + s.w - 1; x++) {
                    if (inLabel(L, x, y)) continue;
                    const i = y * w + x;
                    const v = idata.readUInt32BE(i * 4);
                    if (v !== expect(i)) { bad++; if (!sample) sample = ` e.g. (${x},${y}) ${unpackHex(v)} want ${unpackHex(expect(i))}`; }
                }
            }
            if (bad) R.interior.push(`${s.slotId}: ${bad} interior pixel(s) differ from grid/tick/background${sample}`);
        }

        // (5b) labels: the label box holds exactly the expected text; the text decodes back.
        const ldata = tampered('labels', d => {
            const p = exp.slots.find(q => q.label.text);
            if (!p) return;
            const L = p.label;
            for (let y = L.y; y < L.y + L.h; y++) for (let x = L.x; x < L.x + L.w; x++) {
                const i = y * w + x;
                if (exp.cls[i] === 2) d.writeUInt32BE(bg, i * 4);
            }
        });
        for (const p of exp.slots) {
            const L = p.label, s = p.entry.slot;
            if (!L.text) continue;
            let bad = 0;
            for (let y = L.y; y < L.y + L.h; y++) for (let x = L.x; x < L.x + L.w; x++) {
                const i = y * w + x;
                if (ldata.readUInt32BE(i * 4) !== expect(i)) bad++;
            }
            const decoded = decodeLabel(ldata, w, L);
            if (bad || decoded !== L.text) R.labels.push(`${s.slotId}: label reads "${decoded}" (want "${L.text}"), ${bad} pixel(s) differ`);
        }

        // (5c) free area (outside every slot): grid lines only.
        const fdata = tampered('free_area', d => { const i = firstFreeBg(); if (i >= 0) d.writeUInt32BE(GRID, i * 4); });
        let freeBad = 0, freeSample = '';
        for (let i = 0; i < w * h; i++) {
            if (inSlot[i]) continue;
            const v = fdata.readUInt32BE(i * 4);
            if (v !== expect(i)) { freeBad++; if (!freeSample) freeSample = ` e.g. (${i % w},${(i / w) | 0}) ${unpackHex(v)} want ${unpackHex(expect(i))}`; }
        }
        if (freeBad) R.free_area.push(`${id}: ${freeBad} pixel(s) outside slots differ from grid/background${freeSample}`);

        // (6) sidecar matches the catalogue 1:1.
        const sidePath = path.join(outDir, `${id}.json`);
        if (!fs.existsSync(sidePath)) { R.sidecar.push(`${id}: no sidecar`); return; }
        let side = readJson(sidePath);
        sidecars[id] = side;
        if (P('sidecar') && first) { side = clone(side); if (side.slots[0]) side.slots[0].x += 1; }
        const nul = v => (v === undefined ? null : v);
        const header = {
            format: tool.TEMPLATE_FORMAT, generator: tool.GENERATOR, sheetId: id, kind: sheet.kind, group: nul(sheet.group), runtimeFile: nul(sheet.runtimeFile),
            w: sheet.w, h: sheet.h, gridPx: sheet.gridPx, bg: bgName, bgRgba: BG_RGBA[bgName], gridColour: tool.GRID_HEX, labelColour: tool.LABEL_HEX,
            geometrySha256: geoSha, tilePx: geo.tilePx, layerPx: geo.layerPx, stratumPx: geo.stratumPx, png: `${id}.png`, pngSha256: sha256(bytes)
        };
        for (const [k, v] of Object.entries(header)) {
            try { assert.deepStrictEqual(side[k], v); } catch (err) { R.sidecar.push(`${id}: ${k} is ${JSON.stringify(side[k])}, want ${JSON.stringify(v)}`); }
        }
        const slots = Array.isArray(side.slots) ? side.slots : [];
        if (slots.length !== exp.slots.length) R.sidecar.push(`${id}: ${slots.length} sidecar slot(s), catalogue has ${exp.slots.length}`);
        exp.slots.forEach((p, n) => {
            const e = p.entry, got = slots[n] || {};
            const wantSlot = {
                slotId: e.slot.slotId, entryId: e.id, scaleRow: e.scaleRow, frameClass: nul(e.frameClass), footprint: nul(e.footprint), anchor: nul(e.anchor),
                x: e.slot.x, y: e.slot.y, w: e.slot.w, h: e.slot.h, frames: nul(e.frames), envelope: nul(e.envelope), paperDoll: nul(e.paperDoll), strataTicks: p.ticks
            };
            for (const [k, v] of Object.entries(wantSlot)) {
                try { assert.deepStrictEqual(got[k], v); } catch (err) { R.sidecar.push(`${e.slot.slotId}: ${k} is ${JSON.stringify(got[k])}, want ${JSON.stringify(v)}`); }
            }
            const gl = got.label || {};
            if (gl.mode !== p.label.mode || gl.text !== p.label.text || (p.label.text && (gl.x !== p.label.x || gl.y !== p.label.y))) {
                R.sidecar.push(`${e.slot.slotId}: label ${JSON.stringify([gl.mode, gl.text, gl.x, gl.y])}, want ${JSON.stringify([p.label.mode, p.label.text, p.label.x, p.label.y])}`);
            }
        });
    });
    return { results: R, colours, sidecars };
}

function failedChecks(v) { return Object.keys(v.results).filter(k => v.results[k].length); }

// ---------------------------------------------------------------- running the generator

function runTool(toolPath, catPath, outDir, extra) {
    const r = spawnSync(process.execPath, [toolPath, '--catalogue', catPath, '--out', outDir].concat(extra || []), { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const codes = [...new Set([...(r.stderr || '').matchAll(/^REFUSED ([A-Z_]+):/gm)].map(m => m[1]))].sort();
    return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '', codes, error: r.error };
}
function brief(r) { return `exit ${r.status}${r.codes.length ? ` codes ${r.codes.join(',')}` : ''}${r.status !== 0 ? ` stderr: ${r.stderr.trim().split(/\r?\n/).slice(0, 2).join(' | ')}` : ''}`; }

let TMP = null;
// A fixture copy under TMP with absolute geometry/palette paths. catalogueFn defaults to the fixture builder.
function stage(name, geo, catalogueFn) {
    const dir = path.join(TMP, name);
    fs.mkdirSync(dir, { recursive: true });
    const geoPath = path.join(dir, 'geometry.json');
    const geoText = JSON.stringify(geo, null, 2) + '\n';
    fs.writeFileSync(geoPath, geoText);
    const geoSha = sha256(Buffer.from(geoText, 'utf8'));
    const cat = catalogueFn ? catalogueFn(geoSha, geoPath) : fixture.buildCatalogue(geo, geoSha, { geometryPath: geoPath, palettePath: MASTER_PALETTE });
    const catPath = path.join(dir, 'catalogue.json');
    fs.writeFileSync(catPath, JSON.stringify(cat, null, 2) + '\n');
    return { dir, geoPath, catPath, geo, cat, geoSha, out: path.join(dir, 'out') };
}

// ---------------------------------------------------------------- scenario groups (shared by the real tool and mutants)

// (9) stratumPx is a parameter end to end. Returns [{ name, ok, detail }].
function stratumParamCases(toolPath, tag, full, base) {
    const res = [];
    const add = (name, ok, detail) => res.push({ name, ok, detail });
    const baseGeo = base.geo;
    const split = baseGeo.stratumPx;
    const rotated = [split[split.length - 1]].concat(split.slice(0, -1));
    const splitA = provoked('stratum_param') && tag === 'real' ? split.slice() : rotated;

    const A = stage(`stratum-${tag}-A`, Object.assign(clone(baseGeo), { stratumPx: splitA }));
    const rA = runTool(toolPath, A.catPath, A.out);
    if (rA.status !== 0) add('changed_split', false, `split ${JSON.stringify(splitA)}: ${brief(rA)}`);
    else {
        const v = verifyOutput(A.out, A.cat, A.geo, A.geoSha, 'transparent', false);
        const bad = failedChecks(v);
        const errs = bad.map(k => `${k}: ${v.results[k][0]}`);
        const atlas = v.sidecars.TEST_ATLAS_SURFACE;
        const strata = atlas ? atlas.slots.filter(s => /^GEOM_STRATUM_\d+$/.test(s.scaleRow)) : [];
        for (const s of strata) {
            const d = Number(s.scaleRow.split('_').pop());
            if (s.h !== cumulative(splitA, d)) errs.push(`${s.slotId} ${s.scaleRow} h ${s.h}, want ${cumulative(splitA, d)}`);
        }
        const moved = strata.filter(s => s.h !== cumulative(split, Number(s.scaleRow.split('_').pop()))).length;
        if (!strata.length) errs.push('no GEOM_STRATUM slots in the atlas sidecar');
        else if (!moved) errs.push(`no ramp/strip slot height moved from the base split ${JSON.stringify(split)}`);
        const face = atlas && atlas.slots.find(s => s.entryId === 'TEST_SURFACE_B1_WALL_FACE_V1_BASE');
        const baseTicks = expectedTicks({ scaleRow: 'GEOM_LAYER_FACE', frames: { rows: 1 }, slot: { h: baseGeo.layerPx } }, baseGeo);
        if (!face) errs.push('wall face slot missing');
        else {
            const img = decodePNG(fs.readFileSync(path.join(A.out, 'TEST_ATLAS_SURFACE.png')));
            const px = (x, y) => img.data.readUInt32BE((y * img.width + x) * 4);
            if (JSON.stringify(face.strataTicks) === JSON.stringify(baseTicks)) errs.push(`wall face ticks ${JSON.stringify(face.strataTicks)} did not move from the base split`);
            for (const t of face.strataTicks) if (px(face.x + 1, face.y + t) !== GRID) errs.push(`no tick pixel at wall face row ${t}`);
            for (const t of baseTicks.filter(t => !face.strataTicks.includes(t))) if (px(face.x + 1, face.y + t) !== BG.transparent) errs.push(`stale tick pixel at base row ${t}`);
        }
        add('changed_split', errs.length === 0, `split ${JSON.stringify(splitA)}: ${errs.slice(0, 4).join('; ')}`);
    }

    // The catalogue built for the base split is refused against the changed geometry.
    const stale = stage(`stratum-${tag}-stale`, A.geo, () => Object.assign(clone(base.cat), { geometry: { path: A.geoPath, sha256: base.geoSha } }));
    const rS = runTool(toolPath, stale.catPath, stale.out);
    add('stale_catalogue_refused', rS.status === 2 && rS.codes.join() === 'GEOMETRY_SHA_MISMATCH,STRATUM_HEIGHT_MISMATCH' && !fs.existsSync(stale.out), brief(rS));
    const staleRects = stage(`stratum-${tag}-stale-rects`, A.geo, (sha, p) => Object.assign(clone(base.cat), { geometry: { path: p, sha256: sha } }));
    const rR = runTool(toolPath, staleRects.catPath, staleRects.out);
    add('stale_rects_refused', rR.status === 2 && rR.codes.join() === 'STRATUM_HEIGHT_MISMATCH' && /stratumPx/.test(rR.stderr) && !fs.existsSync(staleRects.out), brief(rR));

    const invalid = [
        ['zero_stratum', split.slice(0, -1).map(() => baseGeo.layerPx / (split.length - 1)).concat(0)],
        ['sum_not_layerPx', split.map(v => v + 1)],
        ['too_few_strata', split.slice(0, -1)],
        ['fractional', split.slice(0, -2).concat([split[split.length - 2] + 0.5, split[split.length - 1] - 0.5])],
        ['not_an_array', split.join(',')]
    ];
    invalid.forEach(([name, bad]) => {
        const st = stage(`stratum-${tag}-invalid-${name}`, Object.assign(clone(baseGeo), { stratumPx: bad }), (sha, p) => Object.assign(clone(base.cat), { geometry: { path: p, sha256: sha } }));
        const r = runTool(toolPath, st.catPath, st.out);
        add(`invalid_${name}_refused`, r.status === 2 && r.codes.join() === 'GEOMETRY_INVALID' && /stratumPx/.test(r.stderr) && !fs.existsSync(st.out), `stratumPx ${JSON.stringify(bad)}: ${brief(r)}`);
    });

    if (full) {
        const irregular = [10, 20, 30, 20, baseGeo.layerPx - 80];
        const B = stage(`stratum-${tag}-B`, Object.assign(clone(baseGeo), { stratumPx: irregular }));
        const rB = runTool(toolPath, B.catPath, B.out);
        const vB = rB.status === 0 ? verifyOutput(B.out, B.cat, B.geo, B.geoSha, 'transparent', false) : null;
        add('irregular_split', rB.status === 0 && failedChecks(vB).length === 0, rB.status !== 0 ? brief(rB) : failedChecks(vB).map(k => `${k}: ${vB.results[k][0]}`).join('; '));

        const layerPx = (Math.ceil(baseGeo.layerPx / split.length) + 4) * split.length;
        const C = stage(`stratum-${tag}-C`, Object.assign(clone(baseGeo), { layerPx, stratumPx: split.map(() => layerPx / split.length) }));
        const rC = runTool(toolPath, C.catPath, C.out);
        const vC = rC.status === 0 ? verifyOutput(C.out, C.cat, C.geo, C.geoSha, 'transparent', false) : null;
        const faceC = vC && vC.sidecars.TEST_ATLAS_SURFACE && vC.sidecars.TEST_ATLAS_SURFACE.slots.find(s => s.entryId === 'TEST_SURFACE_B1_WALL_FACE_V1_BASE');
        add('layerPx_param', rC.status === 0 && failedChecks(vC).length === 0 && faceC && faceC.h === layerPx,
            rC.status !== 0 ? brief(rC) : `wall face h ${faceC && faceC.h} (want ${layerPx}); ${failedChecks(vC).map(k => `${k}: ${vC.results[k][0]}`).join('; ')}`);
    }
    return res;
}

// Catalogues the generator must refuse. Each case: exit code, exact reason codes, nothing written.
function refusalCases(toolPath, tag, base, onlyNames) {
    const A = 'TEST_ATLAS_SURFACE';
    const find = (cat, id) => cat.entries.find(e => e.id === id);
    const T = base.geo.tilePx;
    const freeSlot = (n, size) => ({ sheetId: A, slotId: `${A}:${String(900 + n).padStart(4, '0')}`, x: 60 * T, y: (60 + 3 * n) * T, w: (size || 1) * T, h: (size || 1) * T });
    const synthPalette = (name, extra) => {
        const p = path.join(TMP, `refuse-${tag}-${name}.hex`);
        fs.writeFileSync(p, fs.readFileSync(MASTER_PALETTE, 'utf8') + extra + '\n');
        return p;
    };
    const cases = [
        ['variant_has_slot', ['VARIANT_HAS_SLOT'], c => { find(c, 'TEST_SURFACE_B1_FURNITURE_BED_V1_FLIPPED').slot = freeSlot(1, 2); }],
        ['huge_has_slot', ['FRAME_OPEN_HAS_SLOT'], c => { find(c, 'TEST_SURFACE_B1_CREATURE_HUGE_V1_IDLE').slot = freeSlot(2); }],
        ['slot_overlap', ['SLOT_OVERLAP'], c => { find(c, 'TEST_SURFACE_B1_FURNITURE_TABLE_V1_BASE').slot.x = T / 2; }],
        ['slot_out_of_sheet', ['SLOT_OUT_OF_SHEET'], c => { find(c, 'TEST_SURFACE_B1_FURNITURE_TABLE_V1_BASE').slot.x = c.sheets[0].w - T / 2; }],
        ['slot_too_small', ['SLOT_INVALID'], c => { Object.assign(find(c, 'TEST_SURFACE_B1_FURNITURE_TABLE_V1_BASE').slot, { w: 2 }); }],
        ['missing_scale_row', ['ENTRY_NO_SCALE_ROW'], c => { delete find(c, 'TEST_SURFACE_B1_FURNITURE_TABLE_V1_BASE').scaleRow; }],
        ['duplicate_slot_id', ['SLOT_INVALID'], c => { find(c, 'TEST_SURFACE_B1_CHARACTER_GNOME_V1_IDLE').slot.slotId = `${A}:0001`; }],
        ['bad_slot_id', ['SLOT_INVALID'], c => { find(c, 'TEST_SURFACE_B1_FURNITURE_TABLE_V1_BASE').slot.slotId = `${A}:12`; }],
        ['unknown_sheet', ['SLOT_INVALID'], c => { find(c, 'TEST_SURFACE_B1_FURNITURE_TABLE_V1_BASE').slot.sheetId = 'TEST_NO_SUCH_SHEET'; }],
        ['frame_size_mismatch', ['SLOT_SIZE_MISMATCH'], c => { find(c, 'TEST_SURFACE_B1_CHARACTER_GNOME_V1_IDLE').frameClass = 'LARGE_TALL'; }],
        ['frames_do_not_divide', ['SLOT_SIZE_MISMATCH'], c => { find(c, 'TEST_SURFACE_B1_WALL_FACE_V2_SET').frames.rows = 7; }],
        ['unknown_frame_class', ['FRAME_CLASS_UNKNOWN'], c => { find(c, 'TEST_SURFACE_B1_CREATURE_TINY_V1_IDLE').frameClass = 'TEST_BOGUS'; }],
        ['envelope_exceeds_slot', ['ENVELOPE_EXCEEDS_SLOT'], c => { find(c, 'TEST_SURFACE_B1_FURNITURE_TABLE_V1_BASE').envelope.wMax = T + 1; }],
        ['z_out_of_range', ['ENTRY_INVALID'], c => { find(c, 'TEST_SURFACE_B1_FURNITURE_TABLE_V1_BASE').zMin = base.geo.zMin - 1; }],
        ['old_schema', ['CATALOGUE_INVALID'], c => { c.schemaVersion = 'deus-art-catalogue/1.0.0'; }],
        ['tile_size_mismatch', ['CATALOGUE_INVALID'], c => { c.tileSizePx = T + 1; }],
        ['character_sheet_size', ['SHEET_INVALID'], c => { c.sheets.find(s => s.sheetId === '$TEST_Human').w += 1; }],
        ['atlas_too_big', ['SHEET_INVALID'], c => { c.sheets[0].w += 1; }],
        ['unsafe_sheet_id', ['SHEET_INVALID', 'SLOT_INVALID'], c => { c.sheets.find(s => s.sheetId === '$TEST_Human').sheetId = '../TEST_escape'; }],
        ['geometry_missing', ['GEOMETRY_MISSING'], c => { c.geometry.path = path.join(TMP, 'TEST_no_such_geometry.json'); }],
        ['palette_missing', ['PALETTE_UNREADABLE'], c => { c.palette.path = path.join(TMP, 'TEST_no_such_palette.hex'); }],
        ['grid_colour_in_palette', ['PALETTE_COLLISION'], c => { c.palette.path = synthPalette('grid', tool.GRID_HEX); }],
        ['label_colour_in_palette', ['PALETTE_COLLISION'], c => { c.palette.path = synthPalette('label', tool.LABEL_HEX); }],
        ['magenta_in_palette', ['PALETTE_COLLISION'], c => { c.palette.path = synthPalette('magenta', tool.MAGENTA_HEX); }, ['--bg', 'magenta']],
        ['usage_no_out', null, null, null, 1],
        ['usage_bad_bg', null, null, ['--bg', 'TEST_plaid'], 1]
    ];
    if (provoked('refusals') && tag === 'real') cases.push(['provoked_valid_catalogue', ['VARIANT_HAS_SLOT'], () => {}]);
    const res = [];
    for (const [name, codes, mutate, extra, exitWant] of cases) {
        if (onlyNames && !onlyNames.includes(name)) continue;
        const dir = path.join(TMP, `refuse-${tag}-${name}`);
        fs.mkdirSync(dir, { recursive: true });
        const cat = clone(base.cat);
        if (mutate) mutate(cat);
        const catPath = path.join(dir, 'catalogue.json');
        fs.writeFileSync(catPath, JSON.stringify(cat, null, 2) + '\n');
        const out = path.join(dir, 'out');
        let r;
        if (name === 'usage_no_out') {
            const s = spawnSync(process.execPath, [toolPath, '--catalogue', catPath], { encoding: 'utf8' });
            r = { status: s.status, stderr: s.stderr || '', codes: [] };
        } else r = runTool(toolPath, catPath, out, extra);
        const want = exitWant || 2;
        const ok = r.status === want && (codes === null ? /ERROR:/.test(r.stderr) : r.codes.join() === codes.slice().sort().join()) && !fs.existsSync(out);
        res.push({ name, ok, detail: `want exit ${want}${codes ? ` codes ${codes.join(',')}` : ''}; got ${brief(r)}; out written: ${fs.existsSync(out)}` });
    }
    return res;
}

// ---------------------------------------------------------------- literal scan

// Numeric literals in JavaScript code, skipping comments, strings, template text and regex bodies.
function numericLiterals(src) {
    const found = [];
    const n = src.length;
    let i = src.startsWith('#!') ? src.indexOf('\n') : 0, line = 1, depth = 0, prev = '';
    const tpl = [];
    const KEYWORD_BEFORE_REGEX = new Set(['return', 'typeof', 'case', 'in', 'of', 'delete', 'void', 'throw', 'new', 'else', 'do']);
    const scanTemplate = () => {
        while (i < n) {
            const c = src[i];
            if (c === '\\') { i += 2; continue; }
            if (c === '\n') line++;
            if (c === '`') { i++; prev = 'a'; return; }
            if (c === '$' && src[i + 1] === '{') { i += 2; tpl.push(depth); depth++; prev = '('; return; }
            i++;
        }
    };
    while (i < n) {
        const c = src[i];
        if (c === '\n') { line++; i++; continue; }
        if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
        if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
        if (c === '/' && src[i + 1] === '*') {
            const end = src.indexOf('*/', i + 2);
            const stop = end < 0 ? n : end + 2;
            for (let k = i; k < stop; k++) if (src[k] === '\n') line++;
            i = stop;
            continue;
        }
        if (c === '"' || c === "'") { i++; while (i < n && src[i] !== c && src[i] !== '\n') { if (src[i] === '\\') i++; i++; } i++; prev = 'a'; continue; }
        if (c === '`') { i++; scanTemplate(); continue; }
        if (c === '/' && (prev === '' || '(,=:[!&|?{};+-*%<>~^'.includes(prev))) {
            i++;
            let inClass = false;
            while (i < n && src[i] !== '\n') {
                if (src[i] === '\\') { i += 2; continue; }
                if (src[i] === '[') inClass = true;
                else if (src[i] === ']') inClass = false;
                else if (src[i] === '/' && !inClass) break;
                i++;
            }
            i++;
            while (i < n && /[a-z]/.test(src[i])) i++;
            prev = 'a';
            continue;
        }
        if (c === '{') { depth++; i++; prev = c; continue; }
        if (c === '}') {
            depth--; i++;
            if (tpl.length && tpl[tpl.length - 1] === depth) { tpl.pop(); scanTemplate(); } else prev = c;
            continue;
        }
        if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
            const m = /^(0[xX][0-9a-fA-F_]+|0[oO][0-7_]+|0[bB][01_]+|\d[\d_]*(\.[\d_]*)?([eE][+-]?\d+)?|\.\d[\d_]*([eE][+-]?\d+)?)n?/.exec(src.slice(i, i + 64));
            found.push({ text: m[0], value: Number(m[0].replace(/_/g, '').replace(/n$/, '')), line });
            i += m[0].length;
            prev = 'a';
            continue;
        }
        if (/[A-Za-z_$]/.test(c)) {
            let j = i + 1;
            while (j < n && /[A-Za-z0-9_$]/.test(src[j])) j++;
            prev = KEYWORD_BEFORE_REGEX.has(src.slice(i, j)) ? '(' : 'a';
            i = j;
            continue;
        }
        prev = c;
        i++;
    }
    return found;
}

// Geometry-valued literals: every integer of magnitude 8 or more in the geometry fixture, plus 9 (the old layer count).
function forbiddenLiterals(geo) {
    const set = new Set([9]);
    const walk = v => {
        if (typeof v === 'number' && Number.isInteger(v) && Math.abs(v) >= 8) set.add(Math.abs(v));
        else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(geo);
    return set;
}
function literalHits(src, geo) {
    const forbidden = forbiddenLiterals(geo);
    return numericLiterals(src).filter(t => Number.isInteger(t.value) && forbidden.has(Math.abs(t.value)));
}

// ---------------------------------------------------------------- mutants

const MUTANTS = [
    { name: 'wrong_sheet_size', target: 'dimensions', from: 'const img = newImage(sheet.w, sheet.h, bgRgba);', to: 'const img = newImage(sheet.w + 1, sheet.h, bgRgba);' },
    { name: 'shifted_slot', target: 'slot_edges', from: 'rect(img, s.x, s.y, s.w, s.h, grid);', to: 'rect(img, s.x + 1, s.y, s.w, s.h, grid);' },
    { name: 'missing_sheet', target: 'one_per_sheet', from: 'for (const sheetId of order) {', to: 'for (const sheetId of order.slice(1)) {' },
    { name: 'extra_colour', target: 'census', from: 'hline(img, s.x + 1, s.x + inner, s.y + t, grid);', to: 'hline(img, s.x + 1, s.x + inner, s.y + t, [1, 2, 3, 255]);' },
    { name: 'hardcoded_stratum', target: 'stratum_param', from: 'stratumPx: Array.isArray(geo.stratumPx) ? geo.stratumPx.slice() : geo.stratumPx,', to: 'stratumPx: [19, 19, 19, 19, 20],' },
    { name: 'sha_check_removed', target: 'stratum_param', from: '} else if (recorded !== geoFile.sha256 && recorded !== geoFile.rawSha256) {', to: '} else if (false) {' },
    { name: 'ticks_off', target: 'interior', from: 'const ticks = p.spec ? stratumTicks(s.h, p.rows, p.spec, g) : [];', to: 'const ticks = [];' },
    { name: 'grid_offset', target: 'free_area', from: 'for (let x = 0; x < sheet.w; x += sheet.gridPx)', to: 'for (let x = 1; x < sheet.w; x += sheet.gridPx)' },
    { name: 'labels_off', target: 'labels', from: 'if (lab.text) drawText(img, lab.x, lab.y, lab.text, label);', to: '' },
    { name: 'sidecar_xy_swapped', target: 'sidecar', from: 'x: s.x, y: s.y, w: s.w, h: s.h,', to: 'x: s.y, y: s.x, w: s.w, h: s.h,' },
    { name: 'variant_slot_allowed', target: 'refusals', from: 'if (e.variants && e.variants.derivedFrom) {', to: 'if (false) {', refusals: ['variant_has_slot'] },
    { name: 'palette_check_removed', target: 'refusals', from: 'if (pal.has(hex)) refuse(', to: 'if (false) refuse(', refusals: ['grid_colour_in_palette', 'label_colour_in_palette'] },
    { name: 'timestamp_in_sidecar', target: 'determinism', from: 'format: TEMPLATE_FORMAT, generator: GENERATOR,', to: 'format: TEMPLATE_FORMAT, generator: GENERATOR, at: String(process.hrtime.bigint()),' }
];

function toolCopy(name, from, to) {
    const root = path.join(TMP, 'mut', name);
    fs.mkdirSync(path.join(root, 'tools', 'art'), { recursive: true });
    fs.copyFileSync(path.join(REPO_ROOT, 'tools', 'png_util.js'), path.join(root, 'tools', 'png_util.js'));
    let src = fs.readFileSync(TOOL, 'utf8');
    if (from !== undefined) {
        const count = src.split(from).length - 1;
        if (count !== 1) throw new Error(`mutant ${name}: anchor found ${count} times`);
        src = src.replace(from, () => to);
    }
    const p = path.join(root, 'tools', 'art', 'make_blank_templates.js');
    fs.writeFileSync(p, src);
    return { path: p, src };
}

// Runs the scenario a mutant targets; returns the problems found (empty = the mutant survived).
function exercise(toolPath, tag, target, base, refusalNames) {
    if (PIXEL_CHECKS.includes(target)) {
        const out = path.join(TMP, `mut-out-${tag}`);
        const r = runTool(toolPath, base.catPath, out);
        if (r.status !== 0) return [`generator ${brief(r)}`];
        const v = verifyOutput(out, base.cat, base.geo, base.geoSha, 'transparent', false);
        return v.results[target].length ? [`${target}: ${v.results[target][0]}`] : [];
    }
    if (target === 'stratum_param') return stratumParamCases(toolPath, tag, false, base).filter(c => !c.ok).map(c => `${c.name}: ${c.detail}`);
    if (target === 'refusals') return refusalCases(toolPath, tag, base, refusalNames).filter(c => !c.ok).map(c => `${c.name}: ${c.detail}`);
    if (target === 'determinism') {
        const shas = [1, 2].map(n => {
            const out = path.join(TMP, `mut-out-${tag}-${n}`);
            const r = runTool(toolPath, base.catPath, out);
            return r.status === 0 ? fs.readdirSync(out).sort().map(f => `${f}=${sha256(fs.readFileSync(path.join(out, f)))}`).join('\n') : `exit ${r.status}`;
        });
        return shas[0] === shas[1] ? [] : ['two runs differ'];
    }
    throw new Error(`no scenario for target ${target}`);
}

// ---------------------------------------------------------------- provoke-all

function provokeAll() {
    for (const name of CHECKS) {
        const r = spawnSync(process.execPath, [__filename, `--only=${name}`], {
            encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: Object.assign({}, process.env, { UF_TEST_PROVOKE: `templates.${name}` })
        });
        const fails = (r.stdout || '').split(/\r?\n/).filter(l => l.startsWith('FAIL '));
        const own = fails.filter(l => l.startsWith(`FAIL templates.${name}:`) || l.startsWith(`FAIL templates.${name}[`));
        const other = fails.filter(l => !own.includes(l));
        check(`provoke.${name}`, r.status !== 0 && own.length > 0 && other.length === 0,
            `exit ${r.status}, ${own.length} own FAIL line(s), other FAIL lines: ${other.slice(0, 2).join(' | ') || 'none'}`);
        if (own.length) info(`provoke.${name} -> ${own[0].slice(0, 220)}`);
    }
}

// ---------------------------------------------------------------- main

function gitStatus() {
    const r = spawnSync('git', ['-C', REPO_ROOT, 'status', '--porcelain=v1', '--untracked-files=all'], { encoding: 'utf8' });
    return r.status === 0 ? r.stdout : null;
}

function main() {
    if (PROVOKE && !CHECKS.includes(PROVOKE.replace(/^templates\./, ''))) {
        check('templates.provoke', false, `UF_TEST_PROVOKE=${PROVOKE} names no check (known: ${CHECKS.map(c => `templates.${c}`).join(', ')})`);
        return;
    }
    if (PROVOKE_ALL) { provokeAll(); return; }
    for (const name of ONLY) if (!CHECKS.includes(name)) { check('templates.only', false, `--only names unknown check ${name}`); return; }

    const statusBefore = want('repo_untouched') ? gitStatus() : null;
    TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'deus-blank-templates-test-'));
    info(`temp folder ${TMP}`);
    const geo = readJson(FIX_GEO);
    const cat = readJson(FIX_CAT);
    const geoSha = textSha256(fs.readFileSync(FIX_GEO));
    const slotCount = cat.entries.filter(e => e.slot).length;
    info(`fixture: ${cat.sheets.length} sheets, ${slotCount} paint slots, ${cat.entries.length} entries, geometry text sha256 ${geoSha}`);

    // Committed fixture, run twice (relative catalogue paths resolve against the repository root).
    const out1 = path.join(TMP, 'run1');
    const out2 = path.join(TMP, 'run2');
    const r1 = runTool(TOOL, FIX_CAT, out1);
    if (want('run')) {
        const rr = provoked('run') ? runTool(TOOL, FIX_CAT, path.join(TMP, 'run-provoked'), ['--bg', 'TEST_plaid']) : r1;
        check('templates.run', rr.status === 0 && /^TEMPLATES: /m.test(rr.stdout), brief(rr));
    }
    const v1 = verifyOutput(out1, cat, geo, geoSha, 'transparent', true);
    for (const k of PIXEL_CHECKS) if (want(k)) check(`templates.${k}`, v1.results[k].length === 0, problems(v1.results[k]));
    if (r1.status === 0) for (const s of cat.sheets) info(`run1 sha256 ${s.sheetId}.png ${sha256(fs.readFileSync(path.join(out1, `${s.sheetId}.png`)))}`);

    if (want('determinism')) {
        const r2 = runTool(TOOL, FIX_CAT, out2);
        const list = d => (fs.existsSync(d) ? fs.readdirSync(d).sort() : []);
        const hashes = d => list(d).map(f => [f, sha256(fs.readFileSync(path.join(d, f)))]);
        const h1 = hashes(out1), h2 = hashes(out2);
        if (provoked('determinism') && h2.length) h2[0] = [h2[0][0], sha256(Buffer.concat([fs.readFileSync(path.join(out2, h2[0][0])), Buffer.from('TEST_')]))];
        const diff = [];
        if (h1.length === 0 || r2.status !== 0) diff.push(`run2 ${brief(r2)}, ${h1.length} file(s) in run1`);
        if (JSON.stringify(h1.map(x => x[0])) !== JSON.stringify(h2.map(x => x[0]))) diff.push('file lists differ');
        for (const [f, s] of h1) { const o = h2.find(x => x[0] === f); if (o && o[1] !== s) diff.push(`${f}: ${s} vs ${o[1]}`); }
        for (const [f, s] of h2) if (f.endsWith('.png')) info(`run2 sha256 ${f} ${s}`);
        check('templates.determinism', diff.length === 0, problems(diff));
    }

    let vMagenta = null;
    if (want('bg_magenta') || want('palette')) {
        const out3 = path.join(TMP, 'run-magenta');
        const r3 = runTool(TOOL, FIX_CAT, out3, ['--bg', 'magenta']);
        if (provoked('bg_magenta') && r3.status === 0) {
            const p = path.join(out3, `${cat.sheets[0].sheetId}.png`);
            const img = decodePNG(fs.readFileSync(p));
            img.data[img.data.length - (img.width + 2) * 4 + 3] = 0;
            fs.writeFileSync(p, writePNG(img.data, img.width, img.height));
        }
        vMagenta = r3.status === 0 ? verifyOutput(out3, cat, geo, geoSha, 'magenta', false) : null;
        if (want('bg_magenta')) {
            const bad = vMagenta ? failedChecks(vMagenta).map(k => `${k}: ${vMagenta.results[k][0]}`) : [brief(r3)];
            check('templates.bg_magenta', bad.length === 0 && vMagenta.colours.has(BG.magenta), problems(bad) || 'no magenta pixel found');
        }
    }

    if (want('palette')) {
        const pal = new Set(fs.readFileSync(MASTER_PALETTE, 'utf8').split(/\r?\n/).map(l => l.trim().toUpperCase()).filter(l => /^#[0-9A-F]{6}$/.test(l)));
        if (provoked('palette')) pal.add(tool.GRID_HEX.toUpperCase());
        const bad = [];
        if (pal.size < 2) bad.push(`master palette ${MASTER_PALETTE} has ${pal.size} colours`);
        for (const hex of [tool.GRID_HEX, tool.LABEL_HEX]) if (pal.has(hex.toUpperCase())) bad.push(`${hex} is in the master palette`);
        const used = new Set([...v1.colours].concat(vMagenta ? [...vMagenta.colours] : []));
        for (const v of used) if (pal.has(unpackHex(v).slice(0, 7))) bad.push(`template colour ${unpackHex(v)} is in the master palette`);
        if (!used.has(GRID) || !used.has(LABEL)) bad.push('grid or label colour not found in the templates');
        check('templates.palette', bad.length === 0, problems(bad));
        info(`opaque colours in templates: ${[...used].map(unpackHex).join(', ')}; master palette ${pal.size} colours`);
    }

    const needBase = ['stratum_param', 'refusals', 'mutants', 'tall_medium', 'readability_floor'].some(want);
    const base = needBase ? stage('base', geo) : null;

    if (want('stratum_param')) for (const c of stratumParamCases(TOOL, 'real', true, base)) check(`templates.stratum_param[${c.name}]`, c.ok, c.detail);

    if (want('tall_medium')) {
        const off = geo.optionalParams.TALL_MEDIUM;
        const tm = t => t.frameClass === 'TALL_MEDIUM';
        const baseSlots = Object.values(v1.sidecars).reduce((n, s) => n + s.slots.length, 0);
        const baseTall = Object.values(v1.sidecars).flatMap(s => s.slots).filter(s => tm(s) || s.h / ((s.frames && s.frames.rows) || 1) === off.frame[1]);
        check('templates.tall_medium[off_by_default]', off.enabled === false && baseTall.length === 0, `enabled ${off.enabled}, ${baseTall.length} slot(s) with TALL_MEDIUM frames`);
        const onGeo = clone(geo);
        onGeo.optionalParams.TALL_MEDIUM.enabled = !provoked('tall_medium');
        const on = stage('tall-medium-on', onGeo);
        const r = runTool(TOOL, on.catPath, on.out);
        const v = r.status === 0 ? verifyOutput(on.out, on.cat, on.geo, on.geoSha, 'transparent', false) : null;
        const slots = v ? Object.values(v.sidecars).flatMap(s => s.slots) : [];
        const added = slots.filter(tm);
        const sized = added.filter(s => s.w / s.frames.cols === off.frame[0] && s.h / s.frames.rows === off.frame[1]);
        const wantAdded = on.cat.entries.filter(e => e.frameClass === 'TALL_MEDIUM' && e.slot).length;
        check('templates.tall_medium[on_adds_slots]', r.status === 0 && failedChecks(v).length === 0 && added.length > 0 && sized.length === added.length &&
            added.length === wantAdded && slots.length === baseSlots + added.length,
            `${brief(r)}; ${added.length} TALL_MEDIUM slot(s) (${sized.length} with ${off.frame.join('x')} frames), ${slots.length} slots vs ${baseSlots} base; ${v ? failedChecks(v).join(',') : ''}`);
        const misuse = stage('tall-medium-misuse', geo, (sha, p) => Object.assign(clone(on.cat), { geometry: { path: p, sha256: sha } }));
        const rm = runTool(TOOL, misuse.catPath, misuse.out);
        check('templates.tall_medium[disabled_use_refused]', rm.status === 2 && rm.codes.join() === 'OPTIONAL_PARAM_DISABLED' && !fs.existsSync(misuse.out), brief(rm));
    }

    if (want('readability_floor')) {
        const floor = geo.optionalParams.smallRaceReadabilityFloorPx;
        const onGeo = clone(geo);
        onGeo.optionalParams.smallRaceReadabilityFloorPx.enabled = !provoked('readability_floor');
        const on = stage('readability-floor-on', onGeo);
        const r = runTool(TOOL, on.catPath, on.out);
        const v = r.status === 0 ? verifyOutput(on.out, on.cat, on.geo, on.geoSha, 'transparent', false) : null;
        const pick = sc => Object.values(sc).flatMap(s => s.slots).filter(s => floor.races.some(race => s.scaleRow === `RACE_${race}`));
        const before = pick(v1.sidecars), after = v ? pick(v.sidecars) : [];
        const bad = [];
        if (floor.enabled !== false) bad.push('floor is not off by default');
        if (!before.length || before.length !== after.length) bad.push(`${before.length} small-race slot(s) before, ${after.length} after`);
        for (const b of before) {
            const a = after.find(s => s.slotId === b.slotId);
            if (!a) continue;
            if (b.envelope.hMin >= floor.value[0]) bad.push(`${b.slotId}: base hMin ${b.envelope.hMin} already at the floor`);
            if (a.envelope.hMin < floor.value[0] || a.envelope.hMax < floor.value[1]) bad.push(`${a.slotId}: envelope h ${a.envelope.hMin}..${a.envelope.hMax} below floor ${floor.value.join('..')}`);
            if (a.x !== b.x || a.y !== b.y || a.w !== b.w || a.h !== b.h) bad.push(`${a.slotId}: rect moved (the floor changes drawn heights, not frames)`);
        }
        if (v && failedChecks(v).length) bad.push(failedChecks(v).join(','));
        check('templates.readability_floor', r.status === 0 && bad.length === 0, `${brief(r)}; ${problems(bad)}`);
    }

    if (want('refusals')) for (const c of refusalCases(TOOL, 'real', base)) check(`templates.refusals[${c.name}]`, c.ok, c.detail);

    if (want('out_dir_safety')) {
        const copyOut = name => { const d = path.join(TMP, `outdir-${name}`); fs.cpSync(out1, d, { recursive: true }); return d; };
        const snapshot = d => fs.readdirSync(d).sort().map(f => `${f}=${sha256(fs.readFileSync(path.join(d, f)))}`).join('\n');
        // Rerun into an earlier output: README.md kept, a stale template pair removed, own files replaced.
        const X = copyOut('rerun');
        fs.writeFileSync(path.join(X, 'README.md'), 'TEST_ readme the generator must keep\n');
        const human = cat.sheets.find(s => s.kind === 'RMMZ_CHARACTER').sheetId;
        fs.copyFileSync(path.join(X, `${human}.png`), path.join(X, 'TEST_STALE_SHEET.png'));
        const staleSide = readJson(path.join(X, `${human}.json`));
        Object.assign(staleSide, { sheetId: 'TEST_STALE_SHEET', png: 'TEST_STALE_SHEET.png' });
        fs.writeFileSync(path.join(X, 'TEST_STALE_SHEET.json'), JSON.stringify(staleSide, null, 2) + '\n');
        const rx = runTool(TOOL, FIX_CAT, X);
        const vx = rx.status === 0 ? verifyOutput(X, cat, geo, geoSha, 'transparent', false) : null;
        const listX = fs.readdirSync(X);
        check('templates.out_dir_safety[rerun_keeps_readme_removes_stale]', rx.status === 0 && fs.readFileSync(path.join(X, 'README.md'), 'utf8') === 'TEST_ readme the generator must keep\n' &&
            !listX.includes('TEST_STALE_SHEET.png') && !listX.includes('TEST_STALE_SHEET.json') && vx && failedChecks(vx).filter(k => k !== 'one_per_sheet').length === 0 &&
            vx.results.one_per_sheet.every(p => p === 'unexpected file README.md'), `${brief(rx)}; files ${listX.join(',')}`);
        // A painted (changed) template, an unknown file, an unknown PNG, a file in place of the folder: refused, nothing touched.
        const refusedCases = [
            ['painted_template', 'OUT_DIR_MODIFIED_TEMPLATE', d => { if (!provoked('out_dir_safety')) fs.writeFileSync(path.join(d, `${human}.png`), solidBlock(cat.sheets.find(s => s.sheetId === human).w, cat.sheets.find(s => s.sheetId === human).h, [200, 30, 30, 255])); }],
            ['unknown_file', 'OUT_DIR_UNEXPECTED_FILE', d => fs.writeFileSync(path.join(d, 'TEST_notes.txt'), 'TEST_\n')],
            ['unknown_png', 'OUT_DIR_UNEXPECTED_FILE', d => fs.writeFileSync(path.join(d, 'TEST_EXTRA.png'), solidBlock(4, 4, [30, 200, 30, 255]))]
        ];
        for (const [name, code, prep] of refusedCases) {
            const d = copyOut(name);
            prep(d);
            const before = snapshot(d);
            const r = runTool(TOOL, FIX_CAT, d);
            check(`templates.out_dir_safety[${name}_refused]`, r.status === 2 && r.codes.join() === code && snapshot(d) === before, `${brief(r)}; folder unchanged: ${snapshot(d) === before}`);
        }
        const fileAsOut = path.join(TMP, 'TEST_file_not_folder');
        fs.writeFileSync(fileAsOut, 'TEST_\n');
        const rf = runTool(TOOL, FIX_CAT, fileAsOut);
        check('templates.out_dir_safety[file_as_out_refused]', rf.status === 2 && rf.codes.join() === 'OUT_DIR_INVALID', brief(rf));
    }

    if (want('no_literals')) {
        let src = fs.readFileSync(TOOL, 'utf8');
        if (provoked('no_literals')) src += '\nconst PROVOKED_LITERAL = 0x30;\n';
        const hits = literalHits(src, geo);
        const reads = ['geo.tilePx', 'geo.layerPx', 'geo.stratumPx', 'geo.frameClasses'].filter(r => !src.includes(r));
        check('templates.no_literals', hits.length === 0 && reads.length === 0,
            `${hits.map(h => `line ${h.line}: ${h.text}`).join(', ')}${reads.length ? `; geometry never read: ${reads.join(', ')}` : ''}`);
        info(`literal scan: ${numericLiterals(src).length} numeric literals checked against ${[...forbiddenLiterals(geo)].sort((a, b) => a - b).join(',')}`);
    }

    if (want('mutants')) {
        // The unmutated copy, run from the same temp layout, must pass every scenario the mutants are judged by.
        const control = toolCopy('control');
        const controlProblems = [];
        const cOut = path.join(TMP, 'mut-out-control');
        const rc = runTool(control.path, base.catPath, cOut);
        if (rc.status !== 0) controlProblems.push(`generator ${brief(rc)}`);
        else {
            const vc = verifyOutput(cOut, base.cat, base.geo, base.geoSha, 'transparent', false);
            controlProblems.push(...failedChecks(vc).map(k => `${k}: ${vc.results[k][0]}`));
        }
        for (const target of [...new Set(MUTANTS.map(m => m.target))].filter(t => !PIXEL_CHECKS.includes(t))) {
            const names = [...new Set(MUTANTS.filter(m => m.target === target).flatMap(m => m.refusals || []))];
            controlProblems.push(...exercise(control.path, `control-${target}`, target, base, names.length ? names : undefined));
        }
        check('templates.mutants[control_passes]', controlProblems.length === 0, problems(controlProblems));
        const list = MUTANTS.slice();
        if (provoked('mutants')) list.push({ name: 'provoked_noop', target: 'census', from: "const GENERATOR = 'tools/art/make_blank_templates.js';", to: "const GENERATOR = 'tools/art/make_blank_templates.js'; // TEST_ no-op" });
        for (const m of list) {
            let killedBy = [], err = null, literal = '';
            try {
                const copy = toolCopy(m.name, m.from, m.to);
                killedBy = exercise(copy.path, m.name, m.target, base, m.refusals);
                if (m.name === 'hardcoded_stratum') {
                    const hits = literalHits(copy.src, geo);
                    literal = `; literal scan: ${hits.map(h => h.text).join(',') || 'nothing'}`;
                    if (!hits.length) killedBy = [];
                }
            } catch (e) { err = e.message; }
            check(`templates.mutants[${m.name}]`, !err && killedBy.length > 0, err || `survived: ${m.target} found nothing`);
            if (!err && killedBy.length) info(`mutant ${m.name} killed by ${m.target}: ${killedBy[0].slice(0, 180)}${literal}`);
        }
    }

    if (want('fixture_contract')) {
        const c = clone(cat);
        if (provoked('fixture_contract')) c.entries = c.entries.filter(e => !(e.anchor && e.anchor.type === 'CEILING'));
        const bad = [];
        const need = (ok, what) => { if (!ok) bad.push(what); };
        const perFrame = e => [e.slot.w / ((e.frames && e.frames.cols) || 1), e.slot.h / ((e.frames && e.frames.rows) || 1)];
        const slotted = c.entries.filter(e => e.slot);
        need(c.schemaVersion === 'deus-art-catalogue/1.1.0', 'schemaVersion deus-art-catalogue/1.1.0');
        need(c.sheets.some(s => s.kind === 'ATLAS' && s.w === 4096 && s.h === 4096), 'a 4096x4096 ATLAS');
        need(c.sheets.some(s => s.kind === 'RMMZ_TILESET' && s.w === 768 && s.h === 576), 'an A2 768x576 RMMZ_TILESET');
        need(c.sheets.some(s => s.kind === 'RMMZ_CHARACTER' && s.sheetId.startsWith('$')), 'a `$` RMMZ_CHARACTER sheet');
        need(slotted.some(e => e.footprint.w === 2 && e.footprint.h === 2 && !e.frameClass), 'a 2x2-footprint prop slot');
        need(slotted.some(e => e.frameClass === 'LARGE_TALL' && perFrame(e).join() === '48,96' && e.footprint.w === 2 && e.footprint.h === 2), 'a LARGE_TALL 48x96 frame on a 2x2 footprint');
        need(slotted.some(e => e.frameClass === 'LARGE_LONG' && perFrame(e).join() === '96,48' && e.footprint.w === 2 && e.footprint.h === 2), 'a LARGE_LONG 96x48 frame on a 2x2 footprint');
        need(slotted.some(e => e.frameClass === 'TINY' && perFrame(e).join() === '48,48') && geo.frameClasses.TINY.drawnFootprintPx.join() === '24,24', 'a TINY 24x24 footprint in a 48x48 frame');
        need(geo.optionalParams.TALL_MEDIUM.enabled === false && geo.optionalParams.TALL_MEDIUM.frame.join() === '48,64' && !c.entries.some(e => e.frameClass === 'TALL_MEDIUM'), 'TALL_MEDIUM 48x64 present and off, unused');
        for (const [bw, bh] of [[144, 192], [144, 384], [288, 192]]) {
            need(slotted.some(e => e.slot.w === bw && e.slot.h === bh && e.frames.cols === 3 && e.frames.rows === 4), `an RMMZ 3x4 block ${bw}x${bh}`);
        }
        const dolls = slotted.filter(e => e.paperDoll);
        need(dolls.length >= 2 && new Set(dolls.map(e => e.paperDoll.group)).size === 1, 'a paper-doll group');
        for (const [cat2, what] of [['RAMP', 'ramp cell'], ['EDGE', 'edge strip']]) {
            for (let d = 1; d <= geo.strataPerLayer; d++) {
                need(slotted.some(e => e.category === cat2 && e.scaleRow === `GEOM_STRATUM_${d}` && e.slot.h === cumulative(geo.stratumPx, d)), `${what} for ${d} strata, height from stratumPx`);
            }
        }
        need(slotted.some(e => e.anchor && e.anchor.type === 'CEILING'), 'a CEILING-anchored slot');
        need(c.entries.some(e => e.variants.derivedFrom && e.slot === null), 'a derived variant row with slot: null');
        need(['HUGE', 'GARGANTUAN'].every(k => geo.frameClasses[k].frame === null && c.entries.some(e => e.frameClass === k && e.slot === null)), 'HUGE and GARGANTUAN rows without slots');
        need(geo.layerCount === 32 && geo.zMin === -16 && geo.zMax === 15, 'geometry layerCount 32, z -16..15');
        check('templates.fixture_contract', bad.length === 0, `missing: ${bad.join('; ')}`);
    }

    if (want('fixture_drift')) {
        const built = fixture.buildFromFiles();
        if (provoked('fixture_drift')) built.entries[0].scaleRow += '_TEST_PROVOKED';
        let detail = '';
        try { assert.deepStrictEqual(cat, built); } catch (err) { detail = 'catalogue.fixture.json differs from build_fixture.js output (rerun node tools/art/fixtures/templates/build_fixture.js)'; }
        check('templates.fixture_drift', detail === '', detail);
    }

    if (want('repo_untouched')) {
        let after = gitStatus();
        if (provoked('repo_untouched') && after !== null) after += '?? TEST_provoked_untracked_file\n';
        check('templates.repo_untouched', statusBefore !== null && after === statusBefore,
            statusBefore === null ? 'git status failed' : `git status changed during the run:\n${after}`);
    }
}

try { main(); } catch (err) {
    failed++;
    console.log(`FAIL templates.harness: ${err && err.stack ? err.stack.split('\n').slice(0, 3).join(' | ') : err}`);
}
if (TMP && !KEEP) fs.rmSync(TMP, { recursive: true, force: true });
else if (TMP) info(`kept ${TMP}`);
console.log(`RESULT: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
