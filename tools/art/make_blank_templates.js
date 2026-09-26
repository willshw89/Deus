#!/usr/bin/env node
'use strict';
/**
 * tools/art/make_blank_templates.js — WG.32.02 Lane T: blank template tilesets.
 *
 * Turns an art catalogue (contract deus-art-catalogue/1.1.0) into blank template sheets the Owner
 * paints into: one PNG per catalogue sheet, a JSON sidecar per sheet and <out>/INDEX.md.
 * A template holds nothing but (DEC-007: no art):
 *   - one flat background (alpha 0, or #FF00FF with --bg magenta);
 *   - 1-px grid lines every sheet.gridPx (x or y a multiple of gridPx, plus the last column/row);
 *   - a 1-px outline on every catalogue slot rect (x, y, w, h), in the grid colour;
 *   - stratum guide ticks on geometry-derived slots, in the grid colour;
 *   - one label per slot in the label colour: "<4-digit slot index> <scaleRow short code>",
 *     the index alone when that does not fit, nothing when even the index does not fit.
 *
 * Geometry (tilePx, layerPx, stratumPx, frame classes) is read from the geometry file the
 * catalogue references (or --geometry); none of those values is written as a literal here
 * (tools/art/test_blank_templates.js scans this file for them).
 *
 * Geometry-derived slots are recognised by scaleRow:
 *   GEOM_STRATUM_<d>  a piece d strata high (edge/cliff strip or ramp cell rising d strata):
 *                     frame height = stratumPx[0] + ... + stratumPx[d-1]
 *   GEOM_LAYER_FACE   a full layer face: frame height = layerPx
 * stratumPx[0] is the lowest stratum. Slot height must be frames.rows x that frame height. Each
 * tick marks the top pixel row of a stratum, measured up from the bottom of each frame row, and is
 * TICK_LEN px long, drawn inward from both side outlines. Ticks on the slot's top outline are
 * not drawn.
 *
 * Refusals (exit 2, nothing written): invalid geometry (for example a stratumPx that does not sum
 * to layerPx), a geometry file whose sha256 differs from the catalogue's record, a slot whose size
 * disagrees with its frame class or stratum geometry, overlapping or out-of-sheet slots, a slot on
 * a variant row, on a frame class with no frame (HUGE, GARGANTUAN) or on a disabled optional
 * parameter (TALL_MEDIUM), a grid or label colour found in the catalogue's palette, and an output
 * folder holding files this tool did not write or a template PNG changed since it was written.
 *
 * Usage:
 *   node tools/art/make_blank_templates.js --catalogue <catalogue.json> [--geometry <geometry.json>]
 *        --out <dir> [--bg transparent|magenta]
 * Relative paths inside the catalogue resolve against the repository root. Exit 0 written,
 * 1 usage or I/O error, 2 refused.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { writePNG } = require(path.join(__dirname, '..', 'png_util.js'));

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const GENERATOR = 'tools/art/make_blank_templates.js';
const TEMPLATE_FORMAT = 'deus-blank-template/1';
const CATALOGUE_SCHEMA = /^deus-art-catalogue\/1\.(\d+)\.(\d+)$/;
const MIN_CATALOGUE_MINOR = 1;
const SHEET_KINDS = ['ATLAS', 'RMMZ_TILESET', 'RMMZ_CHARACTER'];
const ATLAS_MAX_SIDE = 4096;
const RMMZ_BLOCK = { cols: 3, rows: 4 };        // an RMMZ `$` character sheet is 3 x 4 frames
const SAFE_SHEET_ID = /^[A-Za-z0-9_$.-]+$/;
const SLOT_ID = /^(.+):(\d{4})$/;
const STRATUM_ROW = /^GEOM_STRATUM_(\d+)$/;
const LAYER_FACE_ROW = 'GEOM_LAYER_FACE';
const KEPT_FILES = ['INDEX.md', 'README.md'];  // may sit in the output folder; INDEX.md is rewritten

// Template colours. Neither may be in the master palette (the tool refuses if the catalogue's
// palette holds either), so template residue can never pass a palette check.
const GRID_HEX = '#00FFFF';
const LABEL_HEX = '#FFFF00';
const MAGENTA_HEX = '#FF00FF';
const BACKGROUNDS = { transparent: [0, 0, 0, 0], magenta: hexToRgba(MAGENTA_HEX) };

// Label and tick layout, in px.
const LAYOUT = {
    tickLen: 4,       // stratum tick length, inward from each side outline
    labelPad: 2,      // outline (1 px) + 1 px gap before a label
    tickGap: 1        // gap between a tick's inner end and a label
};

// 3x5 bitmap font: '#' = label pixel. No anti-aliasing; '?' stands in for unknown characters.
const FONT = {
    '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'],
    '2': ['###', '..#', '###', '#..', '###'], '3': ['###', '..#', '.##', '..#', '###'],
    '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '###', '..#', '###'],
    '6': ['###', '#..', '###', '#.#', '###'], '7': ['###', '..#', '.#.', '.#.', '.#.'],
    '8': ['###', '#.#', '###', '#.#', '###'], '9': ['###', '#.#', '###', '..#', '###'],
    'A': ['.#.', '#.#', '###', '#.#', '#.#'], 'B': ['##.', '#.#', '##.', '#.#', '##.'],
    'C': ['.##', '#..', '#..', '#..', '.##'], 'D': ['##.', '#.#', '#.#', '#.#', '##.'],
    'E': ['###', '#..', '##.', '#..', '###'], 'F': ['###', '#..', '##.', '#..', '#..'],
    'G': ['.##', '#..', '#.#', '#.#', '.##'], 'H': ['#.#', '#.#', '###', '#.#', '#.#'],
    'I': ['###', '.#.', '.#.', '.#.', '###'], 'J': ['..#', '..#', '..#', '#.#', '.#.'],
    'K': ['#.#', '#.#', '##.', '#.#', '#.#'], 'L': ['#..', '#..', '#..', '#..', '###'],
    'M': ['#.#', '###', '#.#', '#.#', '#.#'], 'N': ['###', '#.#', '#.#', '#.#', '#.#'],
    'O': ['.#.', '#.#', '#.#', '#.#', '.#.'], 'P': ['##.', '#.#', '##.', '#..', '#..'],
    'Q': ['.#.', '#.#', '#.#', '##.', '.##'], 'R': ['##.', '#.#', '##.', '#.#', '#.#'],
    'S': ['.##', '#..', '.#.', '..#', '##.'], 'T': ['###', '.#.', '.#.', '.#.', '.#.'],
    'U': ['#.#', '#.#', '#.#', '#.#', '###'], 'V': ['#.#', '#.#', '#.#', '#.#', '.#.'],
    'W': ['#.#', '#.#', '#.#', '###', '#.#'], 'X': ['#.#', '#.#', '.#.', '#.#', '#.#'],
    'Y': ['#.#', '#.#', '.#.', '.#.', '.#.'], 'Z': ['###', '..#', '.#.', '#..', '###'],
    ' ': ['...', '...', '...', '...', '...'], '?': ['###', '..#', '.#.', '...', '.#.']
};
const GLYPH_W = FONT['0'][0].length;
const GLYPH_H = FONT['0'].length;
const GLYPH_ADVANCE = GLYPH_W + 1;

// ---------------------------------------------------------------- small helpers

function hexToRgba(hex) {
    return [Number('0x' + hex.slice(1, 3)), Number('0x' + hex.slice(3, 5)), Number('0x' + hex.slice(5, 7)), 255];
}
function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }
// Text hash with CRLF folded to LF, so a CRLF checkout of a JSON file hashes like the LF original.
function textSha256(buf) { return sha256(Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'), 'utf8')); }
function isPosInt(v) { return Number.isInteger(v) && v > 0; }
function isNonNegInt(v) { return Number.isInteger(v) && v >= 0; }
function isPair(v) { return Array.isArray(v) && v.length === 2 && v.every(isPosInt); }
function sum(list) { return list.reduce((a, b) => a + b, 0); }
function resolveRef(p) { return path.isAbsolute(p) ? p : path.resolve(REPO_ROOT, p); }
function displayPath(p) {
    const rel = path.relative(REPO_ROOT, path.resolve(p));
    return rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? rel.split(path.sep).join('/') : path.basename(p);
}

// scaleRow short code for labels: the first letter of each word, number words kept whole.
function shortCode(scaleRow) {
    return String(scaleRow).toUpperCase().split('_').filter(Boolean)
        .map(w => (/^\d+$/.test(w) ? w : w[0])).join('');
}
function textWidth(text) { return text.length ? text.length * GLYPH_ADVANCE - 1 : 0; }

// ---------------------------------------------------------------- geometry

// The one place geometry values are read. Everything below uses these, never literals.
function geometryParams(geo) {
    return {
        tilePx: geo.tilePx,
        layerPx: geo.layerPx,
        strataPerLayer: geo.strataPerLayer,
        stratumPx: Array.isArray(geo.stratumPx) ? geo.stratumPx.slice() : geo.stratumPx,
        zMin: geo.zMin,
        zMax: geo.zMax,
        layerCount: geo.layerCount,
        frameClasses: geo.frameClasses,
        optionalParams: geo.optionalParams || {},
        rmmzCharacterBlocks: geo.rmmzCharacterBlocks || {}
    };
}

function checkGeometry(g, refuse) {
    const bad = msg => refuse('GEOMETRY_INVALID', msg);
    for (const k of ['tilePx', 'layerPx', 'strataPerLayer']) {
        if (!isPosInt(g[k])) bad(`${k} must be a positive integer (got ${JSON.stringify(g[k])})`);
    }
    if (!Array.isArray(g.stratumPx)) {
        bad(`stratumPx must be an array of ${g.strataPerLayer} positive integers (got ${JSON.stringify(g.stratumPx)})`);
    } else {
        if (g.stratumPx.length !== g.strataPerLayer) {
            bad(`stratumPx has ${g.stratumPx.length} entries but strataPerLayer is ${g.strataPerLayer}`);
        }
        g.stratumPx.forEach((v, i) => { if (!isPosInt(v)) bad(`stratumPx[${i}] must be a positive integer (got ${JSON.stringify(v)})`); });
        if (g.stratumPx.every(Number.isFinite) && sum(g.stratumPx) !== g.layerPx) {
            bad(`stratumPx ${JSON.stringify(g.stratumPx)} sums to ${sum(g.stratumPx)} but layerPx is ${g.layerPx}`);
        }
    }
    if (![g.zMin, g.zMax, g.layerCount].every(Number.isInteger) || g.zMax - g.zMin + 1 !== g.layerCount) {
        bad(`zMin ${g.zMin} .. zMax ${g.zMax} must span exactly layerCount ${g.layerCount} layers`);
    }
    if (!g.frameClasses || typeof g.frameClasses !== 'object' || Array.isArray(g.frameClasses)) {
        bad('frameClasses must be an object');
    } else {
        for (const [name, fc] of Object.entries(g.frameClasses)) {
            if (!fc || typeof fc !== 'object') { bad(`frameClasses.${name} must be an object`); continue; }
            if (fc.frame !== null && !isPair(fc.frame)) bad(`frameClasses.${name}.frame must be [w, h] positive integers or null`);
            if (fc.footprintSq !== undefined && !isPair(fc.footprintSq)) bad(`frameClasses.${name}.footprintSq must be [w, h] positive integers`);
        }
    }
    for (const [name, op] of Object.entries(g.optionalParams)) {
        if (!op || typeof op !== 'object') { bad(`optionalParams.${name} must be an object`); continue; }
        if (typeof op.enabled !== 'boolean') bad(`optionalParams.${name}.enabled must be true or false`);
        if (op.frame !== undefined && !isPair(op.frame)) bad(`optionalParams.${name}.frame must be [w, h] positive integers`);
    }
    for (const [key, block] of Object.entries(g.rmmzCharacterBlocks)) {
        const m = /^(\d+)x(\d+)$/.exec(key);
        if (!m || !isPair(block) || block[0] !== RMMZ_BLOCK.cols * Number(m[1]) || block[1] !== RMMZ_BLOCK.rows * Number(m[2])) {
            bad(`rmmzCharacterBlocks.${key} must be [${RMMZ_BLOCK.cols} x frame w, ${RMMZ_BLOCK.rows} x frame h] (got ${JSON.stringify(block)})`);
        }
    }
}

// Frame of a frame class or of an optional parameter that carries a frame (TALL_MEDIUM).
function resolveFrameClass(g, name) {
    if (g.frameClasses && Object.prototype.hasOwnProperty.call(g.frameClasses, name)) {
        return { known: true, frame: g.frameClasses[name].frame, enabled: true };
    }
    const op = g.optionalParams[name];
    if (op && Array.isArray(op.frame)) return { known: true, frame: op.frame, enabled: op.enabled === true, optional: true };
    return { known: false };
}

function activeFrames(g) {
    const frames = Object.values(g.frameClasses).map(fc => fc.frame).filter(isPair);
    for (const op of Object.values(g.optionalParams)) if (op.enabled === true && isPair(op.frame)) frames.push(op.frame);
    return frames;
}

function cumulativeStrata(g, d) { return sum(g.stratumPx.slice(0, d)); }

// Stratum spec of a geometry-derived slot: { strata, frameH }, null for other rows, or { error }.
function stratumSpec(scaleRow, g) {
    const m = STRATUM_ROW.exec(scaleRow);
    if (m) {
        const d = Number(m[1]);
        if (d < 1 || d > g.strataPerLayer) return { error: `${scaleRow}: stratum count must be 1..${g.strataPerLayer}` };
        return { strata: d, frameH: cumulativeStrata(g, d) };
    }
    if (scaleRow === LAYER_FACE_ROW) return { strata: g.strataPerLayer, frameH: g.layerPx };
    return null;
}

// Tick rows (offsets from the slot top) of a geometry-derived slot.
function stratumTicks(slotH, rows, spec, g) {
    const frameH = slotH / rows;
    const ticks = new Set();
    for (let r = 0; r < rows; r++) {
        const frameBottom = (r + 1) * frameH;             // exclusive
        for (let k = 1; k <= spec.strata; k++) {
            const row = frameBottom - cumulativeStrata(g, k);
            if (row > 0) ticks.add(row);
        }
    }
    return [...ticks].sort((a, b) => a - b);
}

// ---------------------------------------------------------------- catalogue

function framesOf(entry) {
    const f = entry.frames || {};
    return { cols: f.cols === undefined ? 1 : f.cols, rows: f.rows === undefined ? 1 : f.rows };
}

function checkCatalogue(cat, g, geoFile, refuse) {
    const m = CATALOGUE_SCHEMA.exec(cat.schemaVersion || '');
    if (!m || Number(m[1]) < MIN_CATALOGUE_MINOR) {
        refuse('CATALOGUE_INVALID', `schemaVersion ${JSON.stringify(cat.schemaVersion)} is not deus-art-catalogue/1.${MIN_CATALOGUE_MINOR}.x or a later 1.x`);
    }
    if (cat.tileSizePx !== g.tilePx) refuse('CATALOGUE_INVALID', `tileSizePx ${cat.tileSizePx} differs from geometry tilePx ${g.tilePx}`);
    const recorded = cat.geometry && cat.geometry.sha256;
    if (!recorded) {
        refuse('GEOMETRY_SHA_MISMATCH', 'catalogue.geometry.sha256 is missing');
    } else if (recorded !== geoFile.sha256 && recorded !== geoFile.rawSha256) {
        refuse('GEOMETRY_SHA_MISMATCH', `catalogue was built from geometry ${recorded} but ${displayPath(geoFile.path)} is ${geoFile.sha256}; rebuild the catalogue`);
    }

    const sheets = new Map();
    if (!Array.isArray(cat.sheets) || cat.sheets.length === 0) refuse('CATALOGUE_INVALID', 'sheets must be a non-empty array');
    const frames = activeFrames(g);
    for (const s of cat.sheets || []) {
        const id = s && s.sheetId;
        if (typeof id !== 'string' || !SAFE_SHEET_ID.test(id)) { refuse('SHEET_INVALID', `sheetId ${JSON.stringify(id)} is not a safe file name`); continue; }
        if (sheets.has(id)) { refuse('SHEET_INVALID', `sheetId ${id} appears twice`); continue; }
        sheets.set(id, s);
        if (!SHEET_KINDS.includes(s.kind)) refuse('SHEET_INVALID', `${id}: kind ${JSON.stringify(s.kind)} is not one of ${SHEET_KINDS.join(', ')}`);
        if (!isPosInt(s.w) || !isPosInt(s.h)) { refuse('SHEET_INVALID', `${id}: w and h must be positive integers`); continue; }
        if (!isPosInt(s.gridPx)) refuse('SHEET_INVALID', `${id}: gridPx must be a positive integer`);
        if (s.kind === 'ATLAS' && (s.w > ATLAS_MAX_SIDE || s.h > ATLAS_MAX_SIDE)) {
            refuse('SHEET_INVALID', `${id}: ATLAS ${s.w}x${s.h} exceeds ${ATLAS_MAX_SIDE} px`);
        }
        if (s.kind === 'RMMZ_CHARACTER' && !frames.some(f => s.w === RMMZ_BLOCK.cols * f[0] && s.h === RMMZ_BLOCK.rows * f[1])) {
            refuse('SHEET_INVALID', `${id}: RMMZ_CHARACTER ${s.w}x${s.h} is not ${RMMZ_BLOCK.cols} x ${RMMZ_BLOCK.rows} frames of an active frame class`);
        }
    }

    const ids = new Set();
    const slotIds = new Set();
    const slotsBySheet = new Map([...sheets.keys()].map(k => [k, []]));
    if (!Array.isArray(cat.entries)) refuse('CATALOGUE_INVALID', 'entries must be an array');
    for (const e of cat.entries || []) {
        const id = e && e.id;
        if (typeof id !== 'string' || !id) { refuse('ENTRY_INVALID', 'an entry has no id'); continue; }
        if (ids.has(id)) refuse('ENTRY_INVALID', `entry id ${id} appears twice`);
        ids.add(id);
        if (typeof e.scaleRow !== 'string' || !e.scaleRow) refuse('ENTRY_NO_SCALE_ROW', `${id}: scaleRow is required (DEC-016)`);
        if (e.zMin !== undefined && e.zMin !== null && (!Number.isInteger(e.zMin) || e.zMin < g.zMin || e.zMin > g.zMax)) {
            refuse('ENTRY_INVALID', `${id}: zMin ${e.zMin} outside geometry ${g.zMin}..${g.zMax}`);
        }
        if (e.zMax !== undefined && e.zMax !== null && (!Number.isInteger(e.zMax) || e.zMax < g.zMin || e.zMax > g.zMax)) {
            refuse('ENTRY_INVALID', `${id}: zMax ${e.zMax} outside geometry ${g.zMin}..${g.zMax}`);
        }
        let fc = null;
        if (e.frameClass !== undefined && e.frameClass !== null) {
            fc = resolveFrameClass(g, e.frameClass);
            if (!fc.known) refuse('FRAME_CLASS_UNKNOWN', `${id}: frameClass ${e.frameClass} is not in geometry`);
            else if (!fc.enabled) refuse('OPTIONAL_PARAM_DISABLED', `${id}: frameClass ${e.frameClass} is an optional parameter with enabled: false`);
        }
        const slot = e.slot;
        if (slot === null || slot === undefined) continue;
        if (e.variants && e.variants.derivedFrom) {
            refuse('VARIANT_HAS_SLOT', `${id}: variant row (derivedFrom ${e.variants.derivedFrom}) must have slot: null`);
            continue;
        }
        if (fc && fc.known && fc.enabled && !isPair(fc.frame)) {
            refuse('FRAME_OPEN_HAS_SLOT', `${id}: frameClass ${e.frameClass} has no frame yet (Owner open); it gets no paint slot`);
            continue;
        }
        const sm = SLOT_ID.exec(slot.slotId || '');
        if (!sheets.has(slot.sheetId)) { refuse('SLOT_INVALID', `${id}: slot sheetId ${JSON.stringify(slot.sheetId)} is not a catalogue sheet`); continue; }
        if (!sm || sm[1] !== slot.sheetId) refuse('SLOT_INVALID', `${id}: slotId ${JSON.stringify(slot.slotId)} is not <sheetId>:<4-digit index>`);
        else if (slotIds.has(slot.slotId)) refuse('SLOT_INVALID', `${id}: slotId ${slot.slotId} appears twice`);
        slotIds.add(slot.slotId);
        const sheet = sheets.get(slot.sheetId);
        if (!isNonNegInt(slot.x) || !isNonNegInt(slot.y) || !Number.isInteger(slot.w) || !Number.isInteger(slot.h) ||
            slot.w < LAYOUT.labelPad + 1 || slot.h < LAYOUT.labelPad + 1) {
            refuse('SLOT_INVALID', `${id}: slot rect ${JSON.stringify([slot.x, slot.y, slot.w, slot.h])} must be integers with w, h >= ${LAYOUT.labelPad + 1}`);
            continue;
        }
        if (slot.x + slot.w > sheet.w || slot.y + slot.h > sheet.h) {
            refuse('SLOT_OUT_OF_SHEET', `${id}: slot ${slot.x},${slot.y} ${slot.w}x${slot.h} leaves sheet ${sheet.sheetId} (${sheet.w}x${sheet.h})`);
            continue;
        }
        const { cols, rows } = framesOf(e);
        if (!isPosInt(cols) || !isPosInt(rows) || slot.w % cols !== 0 || slot.h % rows !== 0) {
            refuse('SLOT_SIZE_MISMATCH', `${id}: slot ${slot.w}x${slot.h} does not divide into frames ${cols} x ${rows}`);
            continue;
        }
        if (fc && fc.known && fc.enabled && (slot.w !== cols * fc.frame[0] || slot.h !== rows * fc.frame[1])) {
            refuse('SLOT_SIZE_MISMATCH', `${id}: slot ${slot.w}x${slot.h} is not ${cols} x ${rows} frames of ${e.frameClass} ${fc.frame[0]}x${fc.frame[1]}`);
        }
        const env = e.envelope;
        if (env && ((Number.isFinite(env.wMax) && env.wMax > slot.w / cols) || (Number.isFinite(env.hMax) && env.hMax > slot.h / rows))) {
            refuse('ENVELOPE_EXCEEDS_SLOT', `${id}: envelope max ${env.wMax}x${env.hMax} does not fit a ${slot.w / cols}x${slot.h / rows} frame`);
        }
        const spec = stratumSpec(e.scaleRow, g);
        if (spec && spec.error) refuse('STRATUM_HEIGHT_MISMATCH', `${id}: ${spec.error}`);
        else if (spec && slot.h !== rows * spec.frameH) {
            refuse('STRATUM_HEIGHT_MISMATCH', `${id}: ${e.scaleRow} needs frame height ${spec.frameH} from stratumPx ${JSON.stringify(g.stratumPx)} (slot height ${rows} x ${spec.frameH} = ${rows * spec.frameH}) but the slot is ${slot.h} high`);
        }
        slotsBySheet.get(slot.sheetId).push({ entry: e, slot, rows, spec: spec && !spec.error ? spec : null });
    }

    for (const [sheetId, list] of slotsBySheet) {
        list.sort((a, b) => a.slot.x - b.slot.x || a.slot.y - b.slot.y);
        for (let i = 0; i < list.length; i++) {
            const a = list[i].slot;
            for (let j = i + 1; j < list.length && list[j].slot.x < a.x + a.w; j++) {
                const b = list[j].slot;
                if (b.y < a.y + a.h && a.y < b.y + b.h) refuse('SLOT_OVERLAP', `${sheetId}: ${a.slotId} and ${b.slotId} overlap`);
            }
        }
        list.sort((a, b) => (a.slot.slotId < b.slot.slotId ? -1 : a.slot.slotId > b.slot.slotId ? 1 : 0));
    }
    return { sheets, slotsBySheet };
}

function readPaletteHex(file) {
    return new Set(fs.readFileSync(file, 'utf8').split(/\r?\n/).map(l => l.trim().toUpperCase())
        .filter(l => /^#[0-9A-F]{6}$/.test(l)));
}

// ---------------------------------------------------------------- output folder

// Files already in the output folder: INDEX.md / README.md stay; template pairs this tool wrote
// are replaced or, when their sheet left the catalogue, deleted. Anything else refuses the run,
// and so does a template PNG whose bytes differ from its sidecar's pngSha256 (someone painted it).
function planOutDir(outDir, sheetIds, refuse) {
    const deletions = [];
    if (!fs.existsSync(outDir)) return deletions;
    if (!fs.statSync(outDir).isDirectory()) { refuse('OUT_DIR_INVALID', `${outDir} is not a folder`); return deletions; }
    const names = fs.readdirSync(outDir).sort();
    const sidecars = new Map();
    for (const name of names.filter(n => n.endsWith('.json'))) {
        try {
            const j = JSON.parse(fs.readFileSync(path.join(outDir, name), 'utf8'));
            if (j && j.generator === GENERATOR && j.format === TEMPLATE_FORMAT) sidecars.set(name.slice(0, -'.json'.length), j);
        } catch (err) { /* not a sidecar; reported below */ }
    }
    for (const name of names) {
        const full = path.join(outDir, name);
        if (KEPT_FILES.includes(name) && fs.statSync(full).isFile()) continue;
        const base = name.replace(/\.(png|json)$/, '');
        const side = sidecars.get(base);
        if (!fs.statSync(full).isFile() || base === name || !side) {
            refuse('OUT_DIR_UNEXPECTED_FILE', `${name} in ${outDir} was not written by ${GENERATOR}; move it out first`);
            continue;
        }
        if (name.endsWith('.png') && sha256(fs.readFileSync(full)) !== side.pngSha256) {
            refuse('OUT_DIR_MODIFIED_TEMPLATE', `${name} in ${outDir} differs from the template this tool wrote; move it out first`);
            continue;
        }
        if (!sheetIds.has(base)) deletions.push(full);
    }
    return deletions;
}

// ---------------------------------------------------------------- rendering

function newImage(w, h, bg) {
    const data = Buffer.alloc(w * h * 4);
    if (bg.some(v => v !== 0)) data.fill(Buffer.from(bg));
    return { w, h, data };
}
function setPx(img, x, y, rgba) {
    if (x < 0 || y < 0 || x >= img.w || y >= img.h) return;
    img.data.set(rgba, (y * img.w + x) * 4);
}
function hline(img, x0, x1, y, rgba) { for (let x = x0; x <= x1; x++) setPx(img, x, y, rgba); }
function vline(img, x, y0, y1, rgba) { for (let y = y0; y <= y1; y++) setPx(img, x, y, rgba); }
function rect(img, x, y, w, h, rgba) {
    hline(img, x, x + w - 1, y, rgba);
    hline(img, x, x + w - 1, y + h - 1, rgba);
    vline(img, x, y, y + h - 1, rgba);
    vline(img, x + w - 1, y, y + h - 1, rgba);
}
function drawText(img, x0, y0, text, rgba) {
    for (let i = 0; i < text.length; i++) {
        const glyph = FONT[text[i]] || FONT['?'];
        for (let gy = 0; gy < GLYPH_H; gy++) {
            for (let gx = 0; gx < GLYPH_W; gx++) if (glyph[gy][gx] === '#') setPx(img, x0 + i * GLYPH_ADVANCE + gx, y0 + gy, rgba);
        }
    }
}

// Label placement: inside the outline, clear of the tick zones on both sides.
function labelFor(slot, scaleRow, hasTicks) {
    const index = SLOT_ID.exec(slot.slotId)[2];
    const inset = LAYOUT.labelPad + (hasTicks ? LAYOUT.tickLen + LAYOUT.tickGap : 0);
    const availW = slot.w - 2 * inset;
    const availH = slot.h - 2 * LAYOUT.labelPad;
    const full = `${index} ${shortCode(scaleRow)}`;
    let text = null, mode = 'NONE';
    if (GLYPH_H <= availH && textWidth(full) <= availW) { text = full; mode = 'FULL'; }
    else if (GLYPH_H <= availH && textWidth(index) <= availW) { text = index; mode = 'INDEX'; }
    if (!text) return { mode, text: null, full, x: null, y: null, w: 0, h: 0 };
    return { mode, text, full, x: slot.x + inset, y: slot.y + LAYOUT.labelPad, w: textWidth(text), h: GLYPH_H };
}

function renderSheet(sheet, placed, g, bgRgba) {
    const grid = hexToRgba(GRID_HEX);
    const label = hexToRgba(LABEL_HEX);
    const img = newImage(sheet.w, sheet.h, bgRgba);
    for (let x = 0; x < sheet.w; x += sheet.gridPx) vline(img, x, 0, sheet.h - 1, grid);
    for (let y = 0; y < sheet.h; y += sheet.gridPx) hline(img, 0, sheet.w - 1, y, grid);
    vline(img, sheet.w - 1, 0, sheet.h - 1, grid);
    hline(img, 0, sheet.w - 1, sheet.h - 1, grid);
    const slots = [];
    for (const p of placed) {
        const s = p.slot;
        rect(img, s.x, s.y, s.w, s.h, grid);
        const ticks = p.spec ? stratumTicks(s.h, p.rows, p.spec, g) : [];
        for (const t of ticks) {
            const inner = Math.min(LAYOUT.tickLen, s.w - 2);
            hline(img, s.x + 1, s.x + inner, s.y + t, grid);
            hline(img, s.x + s.w - 1 - inner, s.x + s.w - 2, s.y + t, grid);
        }
        const lab = labelFor(s, p.entry.scaleRow, ticks.length > 0);
        if (lab.text) drawText(img, lab.x, lab.y, lab.text, label);
        const e = p.entry;
        slots.push({
            slotId: s.slotId, entryId: e.id, scaleRow: e.scaleRow,
            frameClass: e.frameClass === undefined ? null : e.frameClass,
            footprint: e.footprint === undefined ? null : e.footprint,
            anchor: e.anchor === undefined ? null : e.anchor,
            x: s.x, y: s.y, w: s.w, h: s.h,
            frames: e.frames === undefined ? null : e.frames,
            envelope: e.envelope === undefined ? null : e.envelope,
            paperDoll: e.paperDoll === undefined ? null : e.paperDoll,
            strataTicks: ticks,
            label: { mode: lab.mode, text: lab.text, full: lab.full, x: lab.x, y: lab.y, w: lab.w, h: lab.h }
        });
    }
    return { img, slots };
}

// ---------------------------------------------------------------- index

function mdCell(v) { return String(v === null || v === undefined ? '' : v).replace(/\|/g, '\\|'); }

function buildIndex(ctx, written) {
    const L = [];
    L.push('# Blank template index');
    L.push('');
    L.push(`Generated by \`${GENERATOR}\`; do not edit. Rerun the generator after any catalogue or geometry change.`);
    L.push('These templates contain no art (DEC-007): one flat background, 1-px grid lines, 1-px slot outlines, stratum guide ticks and slot labels only.');
    L.push('');
    L.push('| Field | Value |');
    L.push('|---|---|');
    L.push(`| Catalogue | \`${ctx.catalogueDisplay}\` (text sha256 \`${ctx.catalogueSha256}\`, ${mdCell(ctx.catalogue.schemaVersion)}) |`);
    L.push(`| Geometry | \`${ctx.geometryDisplay}\` (text sha256 \`${ctx.geometrySha256}\`) |`);
    L.push(`| tilePx / layerPx / stratumPx | ${ctx.g.tilePx} / ${ctx.g.layerPx} / ${JSON.stringify(ctx.g.stratumPx)} |`);
    L.push(`| Background | ${ctx.bgName} ${JSON.stringify(ctx.bgRgba)} |`);
    L.push(`| Grid colour / label colour | ${GRID_HEX} / ${LABEL_HEX} (neither is in \`${ctx.paletteDisplay}\`) |`);
    L.push(`| Sheets / paint slots | ${written.length} / ${written.reduce((n, w) => n + w.slots.length, 0)} |`);
    L.push('');
    L.push('Labels read `<slot index> <scaleRow short code>` (first letter of each scaleRow word, numbers kept whole); the full row is in the sidecar.');
    L.push(`Stratum ticks (${LAYOUT.tickLen} px, both sides) mark the top pixel row of each stratum, counted up from the bottom of each frame row, on GEOM_STRATUM_<d> and ${LAYER_FACE_ROW} slots. stratumPx[0] is the lowest stratum.`);
    L.push('');
    L.push('## Sheets');
    L.push('');
    L.push('| Sheet | Kind | Size | gridPx | Group | Runtime file | Slots | PNG sha256 |');
    L.push('|---|---|---|---|---|---|---|---|');
    for (const w of written) {
        const s = w.sheet;
        L.push(`| \`${s.sheetId}\` | ${s.kind} | ${s.w}x${s.h} | ${s.gridPx} | ${mdCell(s.group ? JSON.stringify(s.group) : '')} | ${mdCell(s.runtimeFile)} | ${w.slots.length} | \`${w.pngSha256}\` |`);
    }
    for (const w of written) {
        L.push('');
        L.push(`## \`${w.sheet.sheetId}\``);
        L.push('');
        if (w.sheet.w % w.sheet.gridPx || w.sheet.h % w.sheet.gridPx) {
            L.push(`Note: ${w.sheet.w}x${w.sheet.h} is not a multiple of gridPx ${w.sheet.gridPx}; the last grid column/row is partial.`);
            L.push('');
        }
        if (!w.slots.length) { L.push('No paint slots.'); continue; }
        L.push('| Slot | Entry | scaleRow | frameClass | x, y, w, h | Frames | Stratum ticks | Label |');
        L.push('|---|---|---|---|---|---|---|---|');
        for (const s of w.slots) {
            const fr = s.frames ? `${s.frames.cols === undefined ? 1 : s.frames.cols}x${s.frames.rows === undefined ? 1 : s.frames.rows}` : '1x1';
            L.push(`| \`${s.slotId}\` | \`${s.entryId}\` | ${mdCell(s.scaleRow)} | ${mdCell(s.frameClass)} | ${s.x}, ${s.y}, ${s.w}, ${s.h} | ${fr} | ${s.strataTicks.join(' ')} | ${s.label.mode}${s.label.text ? ` \`${s.label.text}\`` : ''} |`);
        }
    }
    const noSlot = (ctx.catalogue.entries || []).filter(e => !e.slot);
    L.push('');
    L.push('## Entries without a paint slot');
    L.push('');
    if (!noSlot.length) L.push('None.');
    else {
        L.push('| Entry | Why no slot | Status |');
        L.push('|---|---|---|');
        for (const e of noSlot) {
            let why = 'slot: null';
            if (e.variants && e.variants.derivedFrom) why = `variant of \`${e.variants.derivedFrom}\``;
            else if (e.frameClass && resolveFrameClass(ctx.g, e.frameClass).known && !isPair(resolveFrameClass(ctx.g, e.frameClass).frame)) why = `frameClass ${e.frameClass} has no frame yet`;
            L.push(`| \`${e.id}\` | ${why} | ${mdCell(e.status)} |`);
        }
    }
    L.push('');
    return L.join('\n');
}

// ---------------------------------------------------------------- main

function parseArgs(argv) {
    const opts = { bg: 'transparent' };
    const keys = { '--catalogue': 'catalogue', '--geometry': 'geometry', '--out': 'out', '--bg': 'bg' };
    for (let i = 0; i < argv.length; i++) {
        let a = argv[i], v;
        const eq = a.indexOf('=');
        if (eq > 0) { v = a.slice(eq + 1); a = a.slice(0, eq); }
        if (a === '--help' || a === '-h') { opts.help = true; continue; }
        if (!keys[a]) throw new Error(`unknown argument ${argv[i]}`);
        if (v === undefined) { v = argv[++i]; if (v === undefined) throw new Error(`${a} needs a value`); }
        opts[keys[a]] = v;
    }
    if (!opts.help) {
        if (!opts.catalogue || !opts.out) throw new Error('--catalogue and --out are required');
        if (!Object.prototype.hasOwnProperty.call(BACKGROUNDS, opts.bg)) throw new Error(`--bg must be one of ${Object.keys(BACKGROUNDS).join(', ')}`);
    }
    return opts;
}

function readJsonFile(file, what) {
    const raw = fs.readFileSync(file);
    let obj;
    try { obj = JSON.parse(raw.toString('utf8').replace(/^﻿/, '')); } catch (err) { throw new Error(`${what} ${file} is not valid JSON: ${err.message}`); }
    return { obj, raw, sha256: textSha256(raw), rawSha256: sha256(raw), path: file };
}

function run(argv) {
    let opts;
    try { opts = parseArgs(argv); } catch (err) {
        console.error(`ERROR: ${err.message}`);
        console.error('usage: node tools/art/make_blank_templates.js --catalogue <catalogue.json> [--geometry <geometry.json>] --out <dir> [--bg transparent|magenta]');
        return 1;
    }
    if (opts.help) {
        console.log('usage: node tools/art/make_blank_templates.js --catalogue <catalogue.json> [--geometry <geometry.json>] --out <dir> [--bg transparent|magenta]');
        return 0;
    }
    const problems = [];
    const refuse = (code, msg) => problems.push({ code, msg });
    const finish = () => {
        for (const p of problems) console.error(`REFUSED ${p.code}: ${p.msg}`);
        console.error(`REFUSED: ${problems.length} problem(s); nothing written`);
        return 2;
    };

    const catFile = readJsonFile(path.resolve(opts.catalogue), 'catalogue');
    const cat = catFile.obj;
    const geoRef = opts.geometry ? path.resolve(opts.geometry) : (cat.geometry && cat.geometry.path ? resolveRef(cat.geometry.path) : null);
    if (!geoRef) { refuse('GEOMETRY_MISSING', 'catalogue.geometry.path is missing and no --geometry was given'); return finish(); }
    if (!fs.existsSync(geoRef)) { refuse('GEOMETRY_MISSING', `geometry file ${geoRef} not found`); return finish(); }
    const geoFile = readJsonFile(geoRef, 'geometry');
    const g = geometryParams(geoFile.obj);
    checkGeometry(g, refuse);
    if (problems.length) return finish();

    const { sheets, slotsBySheet } = checkCatalogue(cat, g, geoFile, refuse);

    const palRef = cat.palette && cat.palette.path ? resolveRef(cat.palette.path) : null;
    if (!palRef || !fs.existsSync(palRef)) {
        refuse('PALETTE_UNREADABLE', `palette ${palRef || '(catalogue.palette.path missing)'} not found; cannot prove template colours are outside it`);
    } else {
        const pal = readPaletteHex(palRef);
        for (const [what, hex] of [['grid colour', GRID_HEX], ['label colour', LABEL_HEX]]) {
            if (pal.has(hex)) refuse('PALETTE_COLLISION', `${what} ${hex} is in ${displayPath(palRef)}`);
        }
        if (opts.bg === 'magenta' && pal.has(MAGENTA_HEX)) refuse('PALETTE_COLLISION', `magenta background ${MAGENTA_HEX} is in ${displayPath(palRef)}`);
    }

    const outDir = path.resolve(opts.out);
    const deletions = planOutDir(outDir, new Set(sheets.keys()), refuse);
    if (problems.length) return finish();

    fs.mkdirSync(outDir, { recursive: true });
    const bgRgba = BACKGROUNDS[opts.bg];
    const ctx = {
        g, catalogue: cat, bgName: opts.bg, bgRgba,
        catalogueDisplay: displayPath(catFile.path), catalogueSha256: catFile.sha256,
        geometryDisplay: displayPath(geoFile.path), geometrySha256: geoFile.sha256,
        paletteDisplay: displayPath(palRef)
    };
    const written = [];
    const order = [...sheets.keys()].sort();
    for (const sheetId of order) {
        const sheet = sheets.get(sheetId);
        const { img, slots } = renderSheet(sheet, slotsBySheet.get(sheetId), g, bgRgba);
        const png = writePNG(img.data, img.w, img.h);
        const pngSha256 = sha256(png);
        const sidecar = {
            format: TEMPLATE_FORMAT, generator: GENERATOR,
            sheetId, kind: sheet.kind, group: sheet.group === undefined ? null : sheet.group,
            runtimeFile: sheet.runtimeFile === undefined ? null : sheet.runtimeFile,
            w: sheet.w, h: sheet.h, gridPx: sheet.gridPx,
            bg: opts.bg, bgRgba, gridColour: GRID_HEX, labelColour: LABEL_HEX,
            geometrySha256: geoFile.sha256, catalogueSha256: catFile.sha256,
            tilePx: g.tilePx, layerPx: g.layerPx, stratumPx: g.stratumPx,
            png: `${sheetId}.png`, pngSha256,
            slots
        };
        fs.writeFileSync(path.join(outDir, `${sheetId}.png`), png);
        fs.writeFileSync(path.join(outDir, `${sheetId}.json`), JSON.stringify(sidecar, null, 2) + '\n');
        written.push({ sheet, slots, pngSha256 });
        console.log(`WROTE ${sheetId}.png ${sheet.w}x${sheet.h} slots=${slots.length} sha256=${pngSha256}`);
    }
    for (const f of deletions) { fs.unlinkSync(f); console.log(`REMOVED stale ${path.basename(f)}`); }
    fs.writeFileSync(path.join(outDir, 'INDEX.md'), buildIndex(ctx, written));
    console.log(`TEMPLATES: ${written.length} sheet(s), ${written.reduce((n, w) => n + w.slots.length, 0)} slot(s) in ${outDir}`);
    return 0;
}

module.exports = { FONT, GLYPH_W, GLYPH_H, GLYPH_ADVANCE, LAYOUT, GRID_HEX, LABEL_HEX, MAGENTA_HEX, GENERATOR, TEMPLATE_FORMAT, run };

if (require.main === module) {
    let code;
    try { code = run(process.argv.slice(2)); } catch (err) {
        console.error(`ERROR: ${err && err.message ? err.message : err}`);
        code = 1;
    }
    process.exitCode = code;
}
