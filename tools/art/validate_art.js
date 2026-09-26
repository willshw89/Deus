#!/usr/bin/env node
'use strict';
/**
 * tools/art/validate_art.js
 *
 * WG.41.01 Lane U. Checks one Owner-approved art file against its catalogue slot (catalogue
 * contract deus-art-catalogue/1.1.0) before tools/art/place_art.js copies it into a sheet.
 * It only reads pixels. It never creates, edits, resamples or recolours them (DEC-007).
 *
 * Usage:
 *   node tools/art/validate_art.js <png> --entry <id> --catalogue <path> --approvals <path>
 *        [--geometry <path>] [--templates <dir>] [--root <dir>] [--json]
 *
 *   --catalogue  catalogue.json. Its geometry.path and palette.path are repo-relative and resolve
 *                against --root (default: the repository that holds this tool).
 *   --approvals  the Owner's art/APPROVALS.md. Only its "## SHA-256 approval ledger (v1)" section is
 *                read; see docs/art/APPROVALS_FORMAT.md.
 *   --geometry   use this geometry.json instead of catalogue.geometry.path. Its sha256 must still
 *                equal catalogue.geometry.sha256.
 *   --templates  folder of blank-template sidecars <sheetId>.json (default <root>/art/templates).
 *   --json       print the result as JSON.
 *
 * Refusal codes (exit 1; pixel reasons list file coordinates as (x,y)):
 *   APPROVAL_MISSING / APPROVAL_NAY / APPROVAL_CONFLICT / LEDGER_MALFORMED
 *       the file's sha256 is not in a YEA ledger row naming this entry id or its slot id; a NAY row
 *       or two disagreeing rows exist for that hash; any ledger row is malformed.
 *   DIMS_MISMATCH          file width x height is not the slot's w x h.
 *   ALPHA_NOT_BINARY       an alpha other than 0 or 255. alphaMode OWNER_OPEN is refused the same
 *                          way until the Owner rules.
 *   OFF_PALETTE            a non-transparent pixel whose colour is not in the catalogue's palette.
 *   TEMPLATE_RESIDUE       a non-transparent pixel in the template sidecar's grid, label or
 *                          background colour.
 *   SLOT_RECT_MISMATCH     the catalogue slot rect differs from the template sidecar's rect.
 *   SCALE_OUT_OF_ENVELOPE  a frame's drawn bounding box is outside [wMin..wMax] x [hMin..hMax].
 *   ANCHOR_GROUND          GROUND anchor: the lowest drawn row of a frame is not frameH-1.
 *   ANCHOR_CEILING         CEILING anchor: the highest drawn row of a frame is not row 0.
 *   TILE_NOT_OPAQUE        a tile-class slot (scaleRow GEOM_TILE) with a pixel that is not opaque.
 *   FRAME_CLASS_MISMATCH / FRAME_CLASS_DISABLED / FRAME_CLASS_OWNER_OPEN / FRAME_CLASS_UNKNOWN
 *       slot frame size differs from geometry.json, or the class is switched off or not yet set.
 *   GEOM_HEIGHT_MISMATCH / GEOM_WIDTH_MISMATCH / GEOM_ROW_UNKNOWN
 *       a geometry-derived slot whose size is not the geometry.json value (see geometryRowSize).
 *   plus ENTRY_NOT_FOUND, ENTRY_NOT_PLACEABLE, CATALOGUE_INVALID, GEOMETRY_INVALID,
 *   GEOMETRY_HASH_MISMATCH, PALETTE_INVALID, PALETTE_HASH_MISMATCH, TEMPLATE_SIDECAR_MISSING,
 *   TEMPLATE_SIDECAR_INVALID, PNG_INVALID, PNG_16BIT.
 *
 * Exit: 0 accepted, 1 refused, 2 usage or I/O error.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { decodePNG } = require('../png_read');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const LEDGER_HEADING = '## SHA-256 approval ledger (v1)';
const LEDGER_COLUMNS = ['Date', 'Decision (YEA/NAY)', 'Entry or slot ids', 'File (repo path)',
    'SHA-256 (64 lowercase hex)', 'Approved derived variants (ids or none)'];
const ID_RE = /^[A-Za-z0-9_.-]+(:\d{4})?$/;
const SAFE_NAME_RE = /^[A-Za-z0-9_.-]+$/;
const SHEET_KINDS = ['ATLAS', 'RMMZ_TILESET', 'RMMZ_CHARACTER'];
const ANCHOR_TYPES = ['GROUND', 'CEILING', 'WALL', 'CENTER'];
// RMMZ character blocks are 3 animation columns x 4 facing rows (docs/RMMZ_ASSET_SPEC.md §2).
const RMMZ_CHAR_COLS = 3, RMMZ_CHAR_ROWS = 4;
const MAX_COORDS = 16; // pixel coordinates listed per reason
const PNG_IHDR_W_AT = 16, PNG_IHDR_H_AT = 20; // PNG file format: byte offsets of IHDR width and height

class Refusal extends Error {
    constructor(code, message) { super(message); this.code = code; }
}

const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');
const isPosInt = v => Number.isInteger(v) && v > 0;
const isNonNegInt = v => Number.isInteger(v) && v >= 0;
const isFrame = f => Array.isArray(f) && f.length === 2 && f.every(isPosInt);
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const hex6 = n => '#' + n.toString(16).toUpperCase().padStart(6, '0');
const rectText = r => `(${r.x},${r.y}) ${r.w}x${r.h}`;

function readFileOr(file, what) {
    try { return fs.readFileSync(file); }
    catch (e) { throw new Refusal('IO_ERROR', `cannot read ${what} ${file}: ${e.code || e.message}`); }
}

function parseJson(buf, file, code) {
    try { return JSON.parse(buf.toString('utf8').replace(/^﻿/, '')); }
    catch (e) { throw new Refusal(code, `${file} is not valid JSON: ${e.message}`); }
}

// ------------------------------------------------------------------ catalogue, geometry, palette

function checkRef(ref, what) {
    if (!ref || typeof ref.path !== 'string' || !ref.path) throw new Refusal('CATALOGUE_INVALID', `catalogue.${what}.path is missing`);
    if (typeof ref.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(ref.sha256)) {
        throw new Refusal('CATALOGUE_INVALID', `catalogue.${what}.sha256 is not 64 lowercase hex characters`);
    }
}

// Catalogue paths are repo-relative (e.g. art/palette/deus_master_world_palette_v1.hex).
const resolveRef = (root, p) => (path.isAbsolute(p) ? p : path.join(root, p));

function checkCatalogueTop(c, file) {
    const inv = msg => { throw new Refusal('CATALOGUE_INVALID', `${file}: ${msg}`); };
    if (!c || typeof c !== 'object' || Array.isArray(c)) inv('not a JSON object');
    if (typeof c.schemaVersion !== 'string' || !/^(deus-art-catalogue\/)?1\.\d+(\.\d+)?$/.test(c.schemaVersion)) {
        inv(`schemaVersion ${JSON.stringify(c.schemaVersion)} is not deus-art-catalogue/1.x`);
    }
    if (!isPosInt(c.tileSizePx)) inv('tileSizePx must be a positive integer');
    if (!Array.isArray(c.sheets) || !Array.isArray(c.entries)) inv('sheets[] and entries[] are required');
    checkRef(c.geometry, 'geometry');
    checkRef(c.palette, 'palette');
}

function checkGeometry(g, file) {
    const bad = msg => { throw new Refusal('GEOMETRY_INVALID', `${file}: ${msg}`); };
    if (!g || typeof g !== 'object' || Array.isArray(g)) bad('not a JSON object');
    for (const k of ['tilePx', 'layerPx', 'strataPerLayer']) if (!isPosInt(g[k])) bad(`${k} must be a positive integer`);
    if (!Array.isArray(g.stratumPx) || g.stratumPx.length !== g.strataPerLayer) {
        bad(`stratumPx must list strataPerLayer (${g.strataPerLayer}) heights, got ${JSON.stringify(g.stratumPx)}`);
    }
    if (!g.stratumPx.every(isPosInt)) bad(`every stratumPx height must be a positive integer, got [${g.stratumPx}]`);
    const sum = g.stratumPx.reduce((a, b) => a + b, 0);
    if (sum !== g.layerPx) bad(`stratumPx [${g.stratumPx}] sums to ${sum}; layerPx is ${g.layerPx}`);
    if (!g.frameClasses || typeof g.frameClasses !== 'object') bad('frameClasses is missing');
    for (const [id, fc] of Object.entries(g.frameClasses)) {
        if (!fc || (fc.frame !== null && !isFrame(fc.frame))) bad(`frameClasses.${id}.frame must be [w, h] or null`);
    }
    for (const [id, p] of Object.entries(g.optionalParams || {})) {
        if (!p || typeof p.enabled !== 'boolean') bad(`optionalParams.${id}.enabled must be true or false`);
        if (p.frame !== undefined && !isFrame(p.frame)) bad(`optionalParams.${id}.frame must be [w, h]`);
    }
    for (const [key, block] of Object.entries(g.rmmzCharacterBlocks || {})) {
        const m = /^(\d+)x(\d+)$/.exec(key);
        if (!m || !isFrame(block) || block[0] !== RMMZ_CHAR_COLS * Number(m[1]) || block[1] !== RMMZ_CHAR_ROWS * Number(m[2])) {
            bad(`rmmzCharacterBlocks["${key}"] must be [${RMMZ_CHAR_COLS} x frame width, ${RMMZ_CHAR_ROWS} x frame height]`);
        }
    }
}

// One colour per line, #RRGGBB or RRGGBB. Returns a Set of 0xRRGGBB numbers.
function parsePalette(buf, file) {
    const set = new Set();
    buf.toString('utf8').replace(/^﻿/, '').split(/\r?\n/).forEach((line, i) => {
        const t = line.trim();
        if (!t) return;
        const m = /^#?([0-9A-Fa-f]{6})$/.exec(t);
        if (!m) throw new Refusal('PALETTE_INVALID', `${file}:${i + 1}: "${t}" is not a #RRGGBB colour`);
        set.add(parseInt(m[1], 16));
    });
    if (!set.size) throw new Refusal('PALETTE_INVALID', `${file} lists no colours`);
    return set;
}

// ------------------------------------------------------------------ approval ledger

// Marks the lines that sit inside ``` or ~~~ code fences (headings and tables there are ignored).
function markFences(lines) {
    const out = new Array(lines.length).fill(false);
    let open = null;
    lines.forEach((l, i) => {
        const m = /^\s{0,3}(`{3,}|~{3,})/.exec(l);
        if (open) {
            out[i] = true;
            if (m && m[1][0] === open[0] && m[1].length >= open.length && !l.trim().slice(m[1].length).trim()) open = null;
        } else if (m) { open = m[1]; out[i] = true; }
    });
    return out;
}

function splitRow(line) {
    let t = line.trim();
    if (t.startsWith('|')) t = t.slice(1);
    if (t.endsWith('|')) t = t.slice(0, -1);
    return t.split('|').map(c => c.trim());
}

function validDate(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return false;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

function splitIds(s) {
    const parts = s.split(',').map(p => p.trim());
    return parts.length && parts.every(p => ID_RE.test(p)) ? parts : null;
}

function parseLedgerRow(cells, line) {
    const err = message => ({ error: { line, message } });
    if (cells.length !== LEDGER_COLUMNS.length) return err(`row has ${cells.length} cells; the ledger has ${LEDGER_COLUMNS.length} columns`);
    const [date, decision, ids, file, hash, variants] = cells.map(c => c.replace(/`/g, '').trim());
    if (!validDate(date)) return err(`date "${date}" is not a YYYY-MM-DD date`);
    if (decision !== 'YEA' && decision !== 'NAY') return err(`decision "${decision}" is not YEA or NAY`);
    const idList = splitIds(ids);
    if (!idList) return err(`entry or slot ids "${ids}" are not a comma-separated list of ids`);
    if (!/\.png$/i.test(file) || /\s/.test(file)) return err(`file "${file}" is not a .png repo path`);
    if (!/^[0-9a-f]{64}$/.test(hash)) return err(`SHA-256 "${hash}" is not 64 lowercase hex characters`);
    const variantList = variants === 'none' ? [] : splitIds(variants);
    if (!variantList) return err(`approved derived variants "${variants}" must be "none" or a comma-separated list of ids`);
    return { row: { line, date, decision, ids: idList, file, sha256: hash, variants: variantList.slice().sort(cmp) } };
}

// Reads only the "## SHA-256 approval ledger (v1)" section. Any malformed row, a second ledger
// heading or a near-miss heading makes the whole ledger unusable (errors[] non-empty).
function parseLedger(text, file) {
    const ledger = { file, present: false, rows: [], errors: [] };
    const lines = text.replace(/^﻿/, '').split(/\r?\n/);
    const fenced = markFences(lines);
    const heads = [];
    lines.forEach((l, i) => {
        if (fenced[i]) return;
        const t = l.trimEnd();
        if (t === LEDGER_HEADING) heads.push(i);
        else if (/^\s{0,3}#{1,6}\s*sha-?256\s+approval\s+ledger/i.test(t)) {
            ledger.errors.push({ line: i + 1, message: `heading "${t.trim()}" is not exactly "${LEDGER_HEADING}"` });
        }
    });
    if (!heads.length) return ledger;
    ledger.present = true;
    if (heads.length > 1) {
        ledger.errors.push({ line: heads[1] + 1, message: `the ledger heading appears ${heads.length} times (lines ${heads.map(h => h + 1).join(', ')})` });
        return ledger;
    }
    let end = lines.length;
    for (let i = heads[0] + 1; i < lines.length; i++) if (!fenced[i] && /^#{1,2}\s/.test(lines[i])) { end = i; break; }
    let state = 'before'; // before -> sep -> rows -> after
    for (let i = heads[0] + 1; i < end; i++) {
        // Content a reader cannot see (HTML comments, rows indented into code) must not count.
        if (!fenced[i] && lines[i].includes('<!--')) {
            ledger.errors.push({ line: i + 1, message: 'HTML comments are not allowed in the ledger section; hidden rows cannot be told from shown ones' });
            return ledger;
        }
        const isRow = !fenced[i] && lines[i].trim().startsWith('|');
        if (isRow && /^\s{4,}/.test(lines[i])) {
            ledger.errors.push({ line: i + 1, message: 'table row indented 4 or more spaces (Markdown shows it as code, not as a ledger row)' });
            return ledger;
        }
        if (!isRow) {
            if (state === 'sep') { ledger.errors.push({ line: i + 1, message: 'the ledger table header is not followed by a | --- | separator row' }); return ledger; }
            if (state === 'rows') state = 'after';
            continue;
        }
        const cells = splitRow(lines[i]);
        if (state === 'before') {
            if (cells.join('|') !== LEDGER_COLUMNS.join('|')) {
                ledger.errors.push({ line: i + 1, message: `the ledger table header must be | ${LEDGER_COLUMNS.join(' | ')} |` });
                return ledger;
            }
            state = 'sep';
        } else if (state === 'sep') {
            if (cells.length !== LEDGER_COLUMNS.length || !cells.every(c => /^:?-{3,}:?$/.test(c))) {
                ledger.errors.push({ line: i + 1, message: 'the ledger table header is not followed by a | --- | separator row' });
                return ledger;
            }
            state = 'rows';
        } else if (state === 'rows') {
            const r = parseLedgerRow(cells, i + 1);
            if (r.error) ledger.errors.push(r.error); else ledger.rows.push(r.row);
        } else {
            ledger.errors.push({ line: i + 1, message: 'table rows after the ledger table ended; the section holds one table' });
            return ledger;
        }
    }
    return ledger;
}

// Ledger reasons that stop <sha> from being placed as <entry>. Empty array = approved.
function approvalReasons(ledger, sha, entry) {
    const out = [];
    if (ledger.errors.length) {
        const list = ledger.errors.slice(0, 5).map(e => `line ${e.line}: ${e.message}`).join('; ');
        out.push({ code: 'LEDGER_MALFORMED', message: `${ledger.file} ledger is malformed, so no file is approved until it is fixed (${ledger.errors.length} problem(s)): ${list}` });
    }
    if (!ledger.present) {
        out.push({ code: 'APPROVAL_MISSING', message: `${ledger.file} has no "${LEDGER_HEADING}" section; legacy rows without a SHA-256 are ignored` });
        return out;
    }
    const names = [entry.id];
    if (entry.slot && entry.slot.slotId) names.push(entry.slot.slotId);
    const rows = ledger.rows.filter(r => r.sha256 === sha);
    const yea = rows.filter(r => r.decision === 'YEA');
    const nay = rows.filter(r => r.decision === 'NAY');
    const lineList = rs => rs.map(r => r.line).join(', ');
    if (nay.length) out.push({ code: 'APPROVAL_NAY', message: `sha256 ${sha} has a NAY row (line ${lineList(nay)})` });
    if (nay.length && yea.length) {
        out.push({ code: 'APPROVAL_CONFLICT', message: `sha256 ${sha} has both YEA (line ${lineList(yea)}) and NAY (line ${lineList(nay)}) rows` });
    }
    const variantsById = new Map();
    for (const r of yea) {
        for (const id of r.ids) {
            const v = r.variants.join(',');
            const seen = variantsById.get(id);
            if (seen && seen.v !== v) {
                out.push({ code: 'APPROVAL_CONFLICT', message: `sha256 ${sha}: YEA rows at lines ${seen.line} and ${r.line} list different derived variants for ${id}` });
            } else if (!seen) variantsById.set(id, { v, line: r.line });
        }
    }
    if (!yea.some(r => r.ids.some(id => names.includes(id)))) {
        const others = [...new Set(yea.flatMap(r => r.ids))].sort(cmp);
        out.push({
            code: 'APPROVAL_MISSING',
            message: `no YEA ledger row approves sha256 ${sha} for ${names.join(' / ')}` + (others.length ? `; that hash is approved only for ${others.join(', ')}` : '')
        });
    }
    return out;
}

// ------------------------------------------------------------------ template sidecar

// '#RRGGBB', '#RRGGBBAA', [r,g,b(,a)] or {r,g,b(,a)} -> 0xRRGGBB. null = transparent (alpha 0, or
// bg "transparent"/"none"); undefined = unreadable. bg "magenta" is #FF00FF.
function parseColour(v, isBg) {
    if (isBg && (v === 'transparent' || v === 'none')) return null;
    if (isBg && v === 'magenta') return 0xFF00FF;
    let r, g, b, a = 255;
    if (typeof v === 'string') {
        const m = /^#?([0-9A-Fa-f]{6})([0-9A-Fa-f]{2})?$/.exec(v.trim());
        if (!m) return undefined;
        const n = parseInt(m[1], 16);
        r = n >> 16; g = (n >> 8) & 255; b = n & 255;
        if (m[2]) a = parseInt(m[2], 16);
    } else if (Array.isArray(v) && (v.length === 3 || v.length === 4)) {
        [r, g, b] = v;
        if (v.length === 4) a = v[3];
    } else if (v && typeof v === 'object') {
        ({ r, g, b } = v);
        if (v.a !== undefined) a = v.a;
    } else return undefined;
    if (![r, g, b, a].every(c => Number.isInteger(c) && c >= 0 && c <= 255)) return undefined;
    return a === 0 ? null : (r << 16) | (g << 8) | b;
}

function readTemplate(file, sheet) {
    const s = parseJson(readFileOr(file, 'template sidecar'), file, 'TEMPLATE_SIDECAR_INVALID');
    const bad = msg => { throw new Refusal('TEMPLATE_SIDECAR_INVALID', `${file}: ${msg}`); };
    if (!s || typeof s !== 'object') bad('not a JSON object');
    if (s.sheetId !== sheet.sheetId) bad(`sheetId ${JSON.stringify(s.sheetId)} is not ${sheet.sheetId}`);
    if (s.w !== sheet.w || s.h !== sheet.h) bad(`template is ${s.w}x${s.h}; catalogue sheet ${sheet.sheetId} is ${sheet.w}x${sheet.h}`);
    const residue = new Map();
    for (const field of ['gridColour', 'labelColour', 'bg']) {
        const c = parseColour(s[field], field === 'bg');
        if (c === undefined) bad(`${field} ${JSON.stringify(s[field])} is not a colour`);
        if (c !== null) residue.set(c, residue.has(c) ? `${residue.get(c)}/${field}` : field);
    }
    if (!Array.isArray(s.slots)) bad('slots[] is missing');
    const slots = new Map();
    for (const sl of s.slots) {
        if (!sl || typeof sl.slotId !== 'string') bad('a slot has no slotId');
        if (slots.has(sl.slotId)) bad(`slot ${sl.slotId} is listed twice`);
        slots.set(sl.slotId, sl);
    }
    return { file, residue, slots };
}

// Cached per sheet: {file, residue: Map(0xRRGGBB -> field), slots: Map(slotId -> rect)} or {error}.
function loadTemplate(ctx, sheet) {
    if (ctx.templateCache.has(sheet.sheetId)) return ctx.templateCache.get(sheet.sheetId);
    const file = path.join(ctx.templatesDir, `${sheet.sheetId}.json`);
    let t;
    if (!fs.existsSync(file)) {
        t = { error: { code: 'TEMPLATE_SIDECAR_MISSING', message: `no template sidecar ${file}; template residue cannot be checked` } };
    } else {
        try { t = readTemplate(file, sheet); }
        catch (e) {
            if (!(e instanceof Refusal)) throw e;
            t = { error: { code: e.code === 'IO_ERROR' ? 'TEMPLATE_SIDECAR_INVALID' : e.code, message: e.message } };
        }
    }
    ctx.templateCache.set(sheet.sheetId, t);
    return t;
}

// ------------------------------------------------------------------ context

function loadContext(opts) {
    const root = path.resolve(opts.root || REPO_ROOT);
    const catalogueFile = path.resolve(opts.catalogue);
    const catalogueBuf = readFileOr(catalogueFile, 'catalogue');
    const catalogue = parseJson(catalogueBuf, catalogueFile, 'CATALOGUE_INVALID');
    checkCatalogueTop(catalogue, catalogueFile);

    const geometryFile = opts.geometry ? path.resolve(opts.geometry) : resolveRef(root, catalogue.geometry.path);
    const geometryBuf = readFileOr(geometryFile, 'geometry');
    const geometrySha = sha256(geometryBuf);
    if (geometrySha !== catalogue.geometry.sha256) {
        throw new Refusal('GEOMETRY_HASH_MISMATCH', `${geometryFile} has sha256 ${geometrySha}; the catalogue was built against ${catalogue.geometry.sha256}`);
    }
    const geometry = parseJson(geometryBuf, geometryFile, 'GEOMETRY_INVALID');
    checkGeometry(geometry, geometryFile);
    if (catalogue.tileSizePx !== geometry.tilePx) {
        throw new Refusal('CATALOGUE_INVALID', `catalogue tileSizePx ${catalogue.tileSizePx} is not geometry tilePx ${geometry.tilePx}`);
    }

    const paletteFile = resolveRef(root, catalogue.palette.path);
    const paletteBuf = readFileOr(paletteFile, 'palette');
    const paletteSha = sha256(paletteBuf);
    if (paletteSha !== catalogue.palette.sha256) {
        throw new Refusal('PALETTE_HASH_MISMATCH', `${paletteFile} has sha256 ${paletteSha}; the catalogue was built against ${catalogue.palette.sha256}`);
    }
    const palette = parsePalette(paletteBuf, paletteFile);

    const approvalsFile = path.resolve(opts.approvals);
    const approvalsBuf = readFileOr(approvalsFile, 'approvals file');
    const ledger = parseLedger(approvalsBuf.toString('utf8'), approvalsFile);

    const sheets = new Map();
    for (const s of catalogue.sheets) {
        if (!s || typeof s.sheetId !== 'string' || !SAFE_NAME_RE.test(s.sheetId)) {
            throw new Refusal('CATALOGUE_INVALID', `sheetId ${JSON.stringify(s && s.sheetId)} must match ${SAFE_NAME_RE}`);
        }
        if (sheets.has(s.sheetId)) throw new Refusal('CATALOGUE_INVALID', `sheet ${s.sheetId} is listed twice`);
        if (!SHEET_KINDS.includes(s.kind)) throw new Refusal('CATALOGUE_INVALID', `sheet ${s.sheetId} kind ${JSON.stringify(s.kind)} is not ${SHEET_KINDS.join(', ')}`);
        if (!isPosInt(s.w) || !isPosInt(s.h)) throw new Refusal('CATALOGUE_INVALID', `sheet ${s.sheetId} needs positive integer w and h`);
        sheets.set(s.sheetId, s);
    }
    const entries = new Map();
    for (const e of catalogue.entries) {
        if (!e || typeof e.id !== 'string' || !e.id) throw new Refusal('CATALOGUE_INVALID', 'an entry has no id');
        if (entries.has(e.id)) throw new Refusal('CATALOGUE_INVALID', `entry ${e.id} is listed twice`);
        entries.set(e.id, e);
    }
    return {
        root, catalogueFile, catalogue, catalogueSha: sha256(catalogueBuf),
        geometryFile, geometry, geometrySha, paletteFile, palette, paletteSha,
        approvalsFile, approvalsSha: sha256(approvalsBuf), ledger, sheets, entries,
        templatesDir: opts.templates ? path.resolve(opts.templates) : path.join(root, 'art', 'templates'),
        templateCache: new Map()
    };
}

// ------------------------------------------------------------------ slot rules

const isDerived = e => !!(e && e.variants && e.variants.derivedFrom);

// The slot rect of a placeable entry, checked against its sheet. Throws a Refusal otherwise.
function slotRect(ctx, entry) {
    if (isDerived(entry)) {
        throw new Refusal('ENTRY_NOT_PLACEABLE', `entry ${entry.id} is a derived variant of ${entry.variants.derivedFrom} (DERIVED_PENDING); it owns no paint slot`);
    }
    if (entry.status === 'OUT_OF_SCOPE') throw new Refusal('ENTRY_NOT_PLACEABLE', `entry ${entry.id} is OUT_OF_SCOPE`);
    if (!entry.slot) {
        throw new Refusal('ENTRY_NOT_PLACEABLE', `entry ${entry.id} has no paint slot (slot: null${entry.frameClass ? `, frameClass ${entry.frameClass}` : ''})`);
    }
    const s = entry.slot;
    const inv = msg => { throw new Refusal('CATALOGUE_INVALID', `entry ${entry.id}: ${msg}`); };
    const sheet = ctx.sheets.get(s.sheetId);
    if (!sheet) inv(`slot sheet ${JSON.stringify(s.sheetId)} is not in sheets[]`);
    const m = typeof s.slotId === 'string' ? /^(.*):(\d{4})$/.exec(s.slotId) : null;
    if (!m || m[1] !== s.sheetId) inv(`slotId ${JSON.stringify(s.slotId)} is not <sheetId>:<4-digit index> for sheet ${s.sheetId}`);
    if (![s.x, s.y].every(isNonNegInt) || ![s.w, s.h].every(isPosInt)) inv('slot x, y, w, h must be integers with x, y >= 0 and w, h > 0');
    if (s.x + s.w > sheet.w || s.y + s.h > sheet.h) inv(`slot ${rectText(s)} lies outside sheet ${sheet.sheetId} (${sheet.w}x${sheet.h})`);
    return { sheet, slot: s };
}

// slotRect plus the frame grid, envelope and anchor the pixel checks need.
function slotSpec(ctx, entry) {
    const { sheet, slot } = slotRect(ctx, entry);
    const inv = msg => { throw new Refusal('CATALOGUE_INVALID', `entry ${entry.id}: ${msg}`); };
    const f = entry.frames || {};
    const cols = f.cols === undefined || f.cols === null ? 1 : f.cols;
    const rows = f.rows === undefined || f.rows === null ? 1 : f.rows;
    if (!isPosInt(cols) || !isPosInt(rows)) inv('frames.cols and frames.rows must be positive integers');
    if (slot.w % cols || slot.h % rows) inv(`slot ${slot.w}x${slot.h} does not split into ${cols}x${rows} equal frames`);
    const env = entry.envelope;
    if (!env || !['wMin', 'wMax', 'hMin', 'hMax'].every(k => isNonNegInt(env[k])) || env.wMin > env.wMax || env.hMin > env.hMax) {
        inv('envelope needs integers wMin <= wMax and hMin <= hMax');
    }
    if (!entry.anchor || !ANCHOR_TYPES.includes(entry.anchor.type)) {
        inv(`anchor.type ${JSON.stringify(entry.anchor && entry.anchor.type)} is not ${ANCHOR_TYPES.join(', ')}`);
    }
    if (typeof entry.scaleRow !== 'string' || !entry.scaleRow) inv('scaleRow is required');
    return { sheet, slot, cols, rows, fw: slot.w / cols, fh: slot.h / rows, env, anchor: entry.anchor.type };
}

// Frame size of a frame class from geometry.json: frameClasses, then optionalParams (off by default).
function resolveFrameClass(g, id) {
    const fc = g.frameClasses[id];
    if (fc) {
        if (fc.frame === null || fc.status === 'OWNER_OPEN') {
            return { code: 'FRAME_CLASS_OWNER_OPEN', message: `frame class ${id} has no frame size yet (status ${fc.status || 'unset'}); the Owner sets it` };
        }
        return { frame: fc.frame, status: fc.status || null };
    }
    const p = (g.optionalParams || {})[id];
    if (p && p.frame) {
        if (p.enabled !== true) return { code: 'FRAME_CLASS_DISABLED', message: `frame class ${id} is an optional parameter with enabled: false in geometry.json` };
        return { frame: p.frame, status: 'OPTIONAL_ENABLED' };
    }
    return { code: 'FRAME_CLASS_UNKNOWN', message: `frame class ${id} is in neither geometry.frameClasses nor geometry.optionalParams` };
}

// Per-frame size of a geometry row (scaleRow GEOM_*), read from geometry.json only.
// GEOM_STRATUM_k is a piece spanning k strata from the layer floor (the edge strip for a k-stratum
// drop, ramp cell k of 5): height = stratumPx[0] + ... + stratumPx[k-1]. GEOM_STRATUM_<strata> is
// therefore layerPx. This reading of the contract's row names is open for Lane S to confirm.
function geometryRowSize(g, row) {
    if (row === 'GEOM_TILE') return { w: g.tilePx, h: g.tilePx, source: 'tilePx' };
    if (row === 'GEOM_LAYER_FACE') return { h: g.layerPx, source: 'layerPx' };
    let m = /^GEOM_STRATUM_(\d+)$/.exec(row);
    if (m) {
        const k = Number(m[1]);
        if (k < 1 || k > g.strataPerLayer) return { code: 'GEOM_ROW_UNKNOWN', message: `${row}: geometry has strata 1..${g.strataPerLayer}` };
        return { h: g.stratumPx.slice(0, k).reduce((a, b) => a + b, 0), source: `stratumPx[0..${k - 1}] = [${g.stratumPx.slice(0, k)}]` };
    }
    m = /^GEOM_FRAME_([A-Z0-9_]+)$/.exec(row);
    if (m) {
        const fc = resolveFrameClass(g, m[1]);
        return fc.code ? fc : { w: fc.frame[0], h: fc.frame[1], source: `frame class ${m[1]}` };
    }
    return { code: 'GEOM_ROW_UNKNOWN', message: `scaleRow ${row} is not a geometry row (GEOM_TILE, GEOM_LAYER_FACE, GEOM_STRATUM_<k>, GEOM_FRAME_<class>)` };
}

// Collects the first MAX_COORDS pixel coordinates of a reason, and the total count.
function coordList() {
    return {
        count: 0, pixels: [], notes: [],
        add(x, y, note) {
            this.count++;
            if (this.pixels.length < MAX_COORDS) { this.pixels.push([x, y]); this.notes.push(note); }
        }
    };
}

// ------------------------------------------------------------------ validation

function finish(result, img) {
    result.codes = [...new Set(result.reasons.map(r => r.code))];
    result.result = result.reasons.length ? 'REFUSED' : 'ACCEPTED';
    // Decoded pixels ride along for place_art (same bytes that were hashed); not printed as JSON.
    Object.defineProperty(result, 'image', { value: result.result === 'ACCEPTED' ? img : null, enumerable: false });
    return result;
}

// Validates the bytes of one art file as catalogue entry <entryId>. The same buffer is hashed and
// decoded, so the approval and the pixels checked always belong to one file.
function validateBuffer(ctx, buf, label, entryId) {
    const result = { tool: 'validate_art', result: 'REFUSED', entry: entryId, file: label, sha256: sha256(buf), reasons: [], notChecked: [], warnings: [] };
    const add = (code, message, list) => result.reasons.push({ code, message, count: list ? list.count : 0, pixels: list ? list.pixels : [] });
    const entry = ctx.entries.get(entryId);
    let spec;
    try {
        if (!entry) throw new Refusal('ENTRY_NOT_FOUND', `entry ${entryId} is not in the catalogue`);
        spec = slotSpec(ctx, entry);
    } catch (e) {
        if (!(e instanceof Refusal)) throw e;
        add(e.code, e.message);
        return finish(result, null);
    }
    const { slot, cols, rows, fw, fh, env, anchor } = spec;

    // Approval: the sha256 of these bytes must be in a YEA ledger row for this entry or slot.
    for (const r of approvalReasons(ctx.ledger, result.sha256, entry)) add(r.code, r.message);

    // Frame size authorities: geometry.json frame classes and geometry rows (never literals).
    if (entry.frameClass) {
        const fc = resolveFrameClass(ctx.geometry, entry.frameClass);
        if (fc.code) add(fc.code, `entry ${entry.id}: ${fc.message}`);
        else {
            if (fc.status === 'PROPOSED') result.warnings.push(`frame class ${entry.frameClass} has status PROPOSED in geometry.json`);
            if (fw !== fc.frame[0] || fh !== fc.frame[1]) {
                add('FRAME_CLASS_MISMATCH', `slot ${slot.slotId} frames are ${fw}x${fh}; frame class ${entry.frameClass} is ${fc.frame[0]}x${fc.frame[1]} in geometry.json`);
            }
        }
    }
    if (entry.scaleRow.startsWith('GEOM_')) {
        const gs = geometryRowSize(ctx.geometry, entry.scaleRow);
        if (gs.code) add(gs.code, `entry ${entry.id}: ${gs.message}`);
        else {
            if (gs.w !== undefined && fw !== gs.w) add('GEOM_WIDTH_MISMATCH', `slot ${slot.slotId} frames are ${fw} px wide; ${entry.scaleRow} is ${gs.w} px (${gs.source} in geometry.json)`);
            if (fh !== gs.h) add('GEOM_HEIGHT_MISMATCH', `slot ${slot.slotId} frames are ${fh} px tall; ${entry.scaleRow} is ${gs.h} px (${gs.source} in geometry.json)`);
        }
    }

    // Template sidecar: slot rect agreement and the residue colours.
    const tpl = loadTemplate(ctx, spec.sheet);
    let residue = null;
    if (tpl.error) add(tpl.error.code, tpl.error.message);
    else {
        residue = tpl.residue;
        const ts = tpl.slots.get(slot.slotId);
        if (!ts) add('SLOT_RECT_MISMATCH', `slot ${slot.slotId} is not in template ${tpl.file}`);
        else if (ts.x !== slot.x || ts.y !== slot.y || ts.w !== slot.w || ts.h !== slot.h) {
            add('SLOT_RECT_MISMATCH', `catalogue slot ${slot.slotId} is ${rectText(slot)} but template ${tpl.file} has ${rectText(ts)}`);
        }
    }

    // A header far larger than the slot is refused before its pixels are inflated.
    if (buf.length >= PNG_IHDR_H_AT + 4 && buf.toString('ascii', PNG_IHDR_W_AT - 4, PNG_IHDR_W_AT) === 'IHDR') {
        const hw = buf.readUInt32BE(PNG_IHDR_W_AT), hh = buf.readUInt32BE(PNG_IHDR_H_AT);
        if (hw * hh > slot.w * slot.h * 4) {
            add('DIMS_MISMATCH', `file header says ${hw}x${hh}; slot ${slot.slotId} is ${slot.w}x${slot.h} (not decoded)`);
            return finish(result, null);
        }
    }
    let img;
    try { img = decodePNG(buf, label); }
    catch (e) { add('PNG_INVALID', e.message); return finish(result, null); }
    if (img.bitDepth > 8) {
        add('PNG_16BIT', `${label} has ${img.bitDepth}-bit samples; the decoder keeps only the high byte, so its pixels cannot be copied 1:1`);
        return finish(result, null);
    }
    const W = img.width, H = img.height, d = img.data;
    const dimsOk = W === slot.w && H === slot.h;
    if (!dimsOk) add('DIMS_MISMATCH', `file is ${W}x${H}; slot ${slot.slotId} is ${slot.w}x${slot.h}`);

    // Per pixel: binary alpha, master palette, template residue, tile opacity.
    const tileClass = entry.scaleRow === 'GEOM_TILE';
    const alphaBad = coordList(), offPal = coordList(), resid = coordList(), holes = coordList();
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const o = (y * W + x) * 4, a = d[o + 3];
            if (a !== 0 && a !== 255) alphaBad.add(x, y, `alpha ${a}`);
            if (tileClass && a !== 255) holes.add(x, y, `alpha ${a}`);
            if (a === 0) continue;
            const rgb = (d[o] << 16) | (d[o + 1] << 8) | d[o + 2];
            if (!ctx.palette.has(rgb)) offPal.add(x, y, hex6(rgb));
            if (residue && residue.has(rgb)) resid.add(x, y, `${hex6(rgb)} ${residue.get(rgb)}`);
        }
    }
    const firstAt = l => `first at ${l.pixels.slice(0, 4).map((p, i) => `(${p[0]},${p[1]}) ${l.notes[i]}`).join(', ')}`;
    if (alphaBad.count) {
        const mode = entry.alphaMode === 'OWNER_OPEN' ? ' (alphaMode OWNER_OPEN: no Owner ruling recorded, so binary alpha applies)' : '';
        add('ALPHA_NOT_BINARY', `${alphaBad.count} pixel(s) with alpha other than 0 or 255${mode}; ${firstAt(alphaBad)}`, alphaBad);
    }
    if (offPal.count) add('OFF_PALETTE', `${offPal.count} non-transparent pixel(s) not in ${path.basename(ctx.paletteFile)}; ${firstAt(offPal)}`, offPal);
    if (resid.count) add('TEMPLATE_RESIDUE', `${resid.count} non-transparent pixel(s) in a template colour of ${path.basename(tpl.file)}; ${firstAt(resid)}`, resid);
    if (holes.count) add('TILE_NOT_OPAQUE', `tile-class slot (GEOM_TILE) must be 100% opaque; ${holes.count} pixel(s) are not; ${firstAt(holes)}`, holes);

    // Per frame: scale envelope and anchor.
    if (!dimsOk) result.notChecked.push('scale envelope and anchor (file size differs from the slot)');
    else {
        if (anchor === 'WALL' || anchor === 'CENTER') result.notChecked.push(`anchor (${anchor} anchors have no pixel rule)`);
        const scaleBad = coordList(), groundBad = coordList(), ceilBad = coordList();
        const scaleNotes = [], groundNotes = [], ceilNotes = [];
        for (let fr = 0; fr < rows; fr++) {
            for (let fc = 0; fc < cols; fc++) {
                const idx = fr * cols + fc, x0 = fc * fw, y0 = fr * fh;
                let minX = fw, minY = fh, maxX = -1, maxY = -1;
                for (let y = 0; y < fh; y++) {
                    for (let x = 0; x < fw; x++) {
                        if (d[((y0 + y) * W + x0 + x) * 4 + 3] !== 0) {
                            if (x < minX) minX = x;
                            if (x > maxX) maxX = x;
                            if (y < minY) minY = y;
                            maxY = y;
                        }
                    }
                }
                const bw = maxX < 0 ? 0 : maxX - minX + 1, bh = maxY < 0 ? 0 : maxY - minY + 1;
                const at = maxX < 0 ? [x0, y0] : [x0 + minX, y0 + minY];
                const box = maxX < 0 ? 'nothing drawn' : `drawn box ${bw}x${bh} at (${x0 + minX},${y0 + minY})-(${x0 + maxX},${y0 + maxY})`;
                if (bw < env.wMin || bw > env.wMax || bh < env.hMin || bh > env.hMax) {
                    scaleBad.add(at[0], at[1]);
                    scaleNotes.push(`frame ${idx}: ${box}`);
                }
                if (anchor === 'GROUND' && maxY !== fh - 1) {
                    groundBad.add(maxX < 0 ? x0 : x0 + minX, y0 + (maxY < 0 ? 0 : maxY));
                    groundNotes.push(`frame ${idx}: ${maxY < 0 ? 'nothing drawn' : `lowest drawn row ${maxY}`}, baseline is ${fh - 1}`);
                }
                if (anchor === 'CEILING' && (maxY < 0 || minY !== 0)) {
                    ceilBad.add(at[0], at[1]);
                    ceilNotes.push(`frame ${idx}: ${maxY < 0 ? 'nothing drawn' : `highest drawn row ${minY}`}, must be 0`);
                }
            }
        }
        const few = notes => notes.slice(0, 4).join('; ') + (notes.length > 4 ? `; +${notes.length - 4} more` : '');
        if (scaleBad.count) {
            add('SCALE_OUT_OF_ENVELOPE', `${scaleBad.count} of ${cols * rows} frame(s) outside envelope w ${env.wMin}..${env.wMax} h ${env.hMin}..${env.hMax} (scaleRow ${entry.scaleRow}): ${few(scaleNotes)}`, scaleBad);
        }
        if (groundBad.count) add('ANCHOR_GROUND', `${groundBad.count} frame(s) not standing on the baseline: ${few(groundNotes)}`, groundBad);
        if (ceilBad.count) add('ANCHOR_CEILING', `${ceilBad.count} frame(s) not hanging from row 0: ${few(ceilNotes)}`, ceilBad);
    }
    return finish(result, img);
}

function validateFile(ctx, file, entryId) {
    return validateBuffer(ctx, readFileOr(file, 'art file'), file, entryId);
}

// ------------------------------------------------------------------ CLI

// --name value / --name=value; spec: {values: [...], multi: [...], flags: [...]}.
function parseArgs(argv, spec) {
    const values = spec.values || [], multi = spec.multi || [], flags = spec.flags || [];
    const out = { _: [] };
    for (const k of multi) out[k] = [];
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (!a.startsWith('--')) { out._.push(a); continue; }
        const eq = a.indexOf('=');
        const name = eq > 0 ? a.slice(2, eq) : a.slice(2);
        if (flags.includes(name)) {
            if (eq > 0) throw new Error(`--${name} takes no value`);
            out[name] = true;
            continue;
        }
        if (!values.includes(name) && !multi.includes(name)) throw new Error(`unknown option --${name}`);
        let v;
        if (eq > 0) v = a.slice(eq + 1);
        else {
            v = argv[++i];
            if (v === undefined || v.startsWith('--')) throw new Error(`--${name} needs a value`);
        }
        if (multi.includes(name)) out[name].push(v);
        else {
            if (out[name] !== undefined) throw new Error(`--${name} is given twice`);
            out[name] = v;
        }
    }
    return out;
}

function printResult(r) {
    for (const w of r.warnings || []) console.log(`WARN ${w}`);
    for (const reason of r.reasons) {
        console.log(`REFUSE ${reason.code}: ${reason.message}`);
        if (reason.pixels && reason.pixels.length) {
            console.log(`  pixels (${reason.count}): ${reason.pixels.map(p => `(${p[0]},${p[1]})`).join(' ')}${reason.count > reason.pixels.length ? ' ...' : ''}`);
        }
    }
    for (const n of r.notChecked || []) console.log(`NOT CHECKED ${n}`);
    const tail = r.result === 'ACCEPTED' ? '' : ` reasons=${(r.codes || []).join(',')}`;
    console.log(`RESULT: ${r.result} entry=${r.entry} file=${r.file} sha256=${r.sha256 || '-'}${tail}`);
}

function main(argv) {
    const usage = 'usage: node tools/art/validate_art.js <png> --entry <id> --catalogue <path> --approvals <path> [--geometry <path>] [--templates <dir>] [--root <dir>] [--json]';
    let args;
    try {
        args = parseArgs(argv, { values: ['entry', 'catalogue', 'approvals', 'geometry', 'templates', 'root'], flags: ['json', 'help'] });
        if (args.help) { console.log(usage); return 0; }
        if (args._.length !== 1) throw new Error('give exactly one <png>');
        for (const k of ['entry', 'catalogue', 'approvals']) if (!args[k]) throw new Error(`--${k} is required`);
    } catch (e) {
        console.error(`validate_art: ${e.message}\n${usage}`);
        return 2;
    }
    const file = path.resolve(args._[0]);
    let r;
    try {
        r = validateFile(loadContext(args), file, args.entry);
    } catch (e) {
        if (!(e instanceof Refusal)) throw e;
        const reasons = [{ code: e.code, message: e.message, count: 0, pixels: [] }];
        r = { tool: 'validate_art', result: e.code === 'IO_ERROR' ? 'ERROR' : 'REFUSED', entry: args.entry, file, sha256: null, reasons, codes: [e.code], notChecked: [], warnings: [] };
    }
    if (args.json) console.log(JSON.stringify(r, null, 2));
    else printResult(r);
    return r.result === 'ACCEPTED' ? 0 : r.result === 'REFUSED' ? 1 : 2;
}

module.exports = {
    Refusal, sha256, parseArgs, loadContext, validateFile, validateBuffer, slotRect, slotSpec,
    parseLedger, approvalReasons, parsePalette, checkGeometry, resolveFrameClass, geometryRowSize,
    loadTemplate, parseColour, isDerived, cmp,
    LEDGER_HEADING, LEDGER_COLUMNS, SAFE_NAME_RE, RMMZ_CHAR_COLS, RMMZ_CHAR_ROWS, REPO_ROOT
};

if (require.main === module) process.exitCode = main(process.argv.slice(2));
