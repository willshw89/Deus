#!/usr/bin/env node
'use strict';
// tools/art_check.js: the automated checks of docs/ART_STANDARD.md §6, run on PNG files.
//
//   node tools/art_check.js <png> [<png>...] [--sidecar] [--json] [--summary] [--type <t>]
//
// Every check prints PASS / WARN / FAIL / SKIP with what it measured; the exit code is 1 when
// any check on any file FAILs (WARN and SKIP never fail the run). Doc: docs/systems/ART_CHECK.md.
//
// Checks per file (names as printed):
//   alpha    every pixel's alpha is 0 or 255 (ART_STANDARD F5)
//   grid     every aligned 3x3 block is one colour: the sheet is a 3x nearest-neighbour export (F2)
//   palette  distinct opaque colours: <=32 PASS, 33-64 WARN, >64 FAIL (F5: 16-32 per sheet)
//   size     sheet dimensions by sheet type, and the frame grid divides the sheet (F3, RMMZ layouts)
//   sidecar  <name>.json next to the PNG: frameWidth/frameHeight/anchor/facings/animations (§3)
//   lean     characters: the S stand frame's opaque centre of mass is within 2 px of the frame centre (F3)
//   margin   characters: the S stand frame's bottom row has opaque pixels, its top row has none (F3)
//
// Options:
//   --sidecar   a missing sidecar is a FAIL (otherwise a present sidecar is checked, a missing one is SKIP)
//   --json      print one JSON array with every measurement instead of the lines
//   --summary   print one line per file instead of one per check
//   --type <t>  force the sheet type: character | object | tileset | icon | face | system | image
//               (default: from the folder and the RMMZ name prefixes, see classify())

const fs = require('fs');
const path = require('path');
const { readPNG } = require('./png_read');

const TILE = 48;            // RMMZ tile and frame size (ART_STANDARD F2, F3)
const SCALE = 3;            // native 16 px drawn at 3x (F2)
const PALETTE_LIMIT = 32;   // F5: 16-32 colours per sheet
const PALETTE_FAIL = 64;    // more than this is a FAIL, 33-64 a WARN
const LEAN_LIMIT_PX = 2;    // centre of mass within 2 px of the frame's horizontal centre
const ICON = 32;            // AR-800: IconSet icons are 32x32
const ICON_SHEET_WIDTH = 512;
const FACE = 144;           // AR-700: 4 columns x 2 rows of 144x144
const A1A2 = { width: 768, height: 576 }; // AR-001: A1 and A2 sheets are 768x576
const FACING_NAMES = { s: 'S', south: 'S', w: 'W', west: 'W', e: 'E', east: 'E', n: 'N', north: 'N' };

// ---------------------------------------------------------------- arguments

function parseArgs(argv) {
    const opts = { files: [], sidecar: false, json: false, summary: false, type: null, help: false, selftest: false };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--sidecar') opts.sidecar = true;
        else if (a === '--selftest') opts.selftest = true;
        else if (a === '--json') opts.json = true;
        else if (a === '--summary') opts.summary = true;
        else if (a === '--help' || a === '-h') opts.help = true;
        else if (a.startsWith('--type=')) opts.type = a.slice(7);
        else if (a === '--type') opts.type = argv[++i];
        else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
        else opts.files.push(a);
    }
    if (opts.type && !['character', 'object', 'tileset', 'icon', 'face', 'system', 'image'].includes(opts.type)) {
        throw new Error(`--type must be character, object, tileset, icon, face, system or image (got ${opts.type})`);
    }
    return opts;
}

function usage() {
    return [
        'Usage: node tools/art_check.js <png> [<png>...] [--sidecar] [--json] [--summary] [--type <t>]',
        '       node tools/art_check.js --selftest',
        'Runs the ART_STANDARD §6 checks (alpha, grid, palette, size, sidecar, lean, margin) on each PNG.',
        'Exit code 1 when any check FAILs. --selftest builds sheets that must trip each check and proves it does.',
        'See docs/systems/ART_CHECK.md.'
    ].join('\n');
}

// ---------------------------------------------------------------- sheet type

// What kind of sheet this is, from the folder and RMMZ's name prefixes
// (ENGINE_RULES §4: `$` = one character per file, no prefix = 8 characters, `!` = object).
function classify(file, sidecar, forcedType) {
    const base = path.basename(file, path.extname(file));
    const dir = path.basename(path.dirname(path.resolve(file))).toLowerCase();
    const slotMatch = base.match(/_(A[1-5]|[BCDE])$/);
    const single = base.startsWith('$') || base.startsWith('!$');
    const cls = { type: 'image', slot: null, multi: false, why: '' };
    if (forcedType) {
        cls.type = forcedType;
        cls.why = '--type';
    } else if (/^IconSet/i.test(base)) {
        cls.type = 'icon'; cls.why = 'name IconSet';
    } else if (dir === 'tilesets' || slotMatch) {
        cls.type = 'tileset'; cls.why = dir === 'tilesets' ? 'folder tilesets' : `name suffix _${slotMatch[1]}`;
    } else if (dir === 'faces') {
        cls.type = 'face'; cls.why = 'folder faces';
    } else if (dir === 'system') {
        cls.type = 'system'; cls.why = 'folder system';
    } else if (dir === 'characters' || base.startsWith('$') || base.startsWith('!')) {
        if (base.startsWith('!')) { cls.type = 'object'; cls.why = 'name prefix !'; }
        else { cls.type = 'character'; cls.why = dir === 'characters' ? 'folder characters' : 'name prefix $'; }
        if (cls.type === 'character' && sidecar && Array.isArray(sidecar.facings) && sidecar.facings.length === 1) {
            cls.type = 'object'; cls.why += ', sidecar has one facing';
        }
    }
    if (cls.type === 'tileset') cls.slot = slotMatch ? slotMatch[1] : null;
    if (cls.type === 'character' || cls.type === 'object') cls.multi = !single;
    return cls;
}

// The frame grid: from the sidecar when it gives frameWidth/frameHeight, else the RMMZ layout.
function frameGrid(img, cls, sidecar) {
    const g = { fw: 0, fh: 0, cols: 0, rows: 0, source: '' };
    if (sidecar && Number.isInteger(sidecar.frameWidth) && Number.isInteger(sidecar.frameHeight)
        && sidecar.frameWidth > 0 && sidecar.frameHeight > 0) {
        g.fw = sidecar.frameWidth; g.fh = sidecar.frameHeight; g.source = 'sidecar';
    } else if (cls.type === 'icon') {
        g.fw = ICON; g.fh = ICON; g.source = `${ICON}x${ICON} icons`;
    } else if (cls.type === 'tileset') {
        g.fw = TILE; g.fh = TILE; g.source = `${TILE}x${TILE} tiles`;
    } else if (cls.type === 'face') {
        g.fw = FACE; g.fh = FACE; g.source = `${FACE}x${FACE} faces`;
    } else if (cls.type === 'character' || cls.type === 'object') {
        const c = cls.multi ? 12 : 3, r = cls.multi ? 8 : 4;
        g.fw = img.width / c; g.fh = img.height / r;
        g.source = cls.multi ? 'RMMZ 8-character sheet, 12x8 frames' : 'RMMZ $ sheet, 3x4 frames';
    } else {
        g.source = 'none';
        return g;
    }
    g.cols = img.width / g.fw;
    g.rows = img.height / g.fh;
    return g;
}

function gridIsWhole(g) {
    return g.fw > 0 && g.fh > 0 && Number.isInteger(g.fw) && Number.isInteger(g.fh)
        && Number.isInteger(g.cols) && Number.isInteger(g.rows) && g.cols > 0 && g.rows > 0;
}

// ---------------------------------------------------------------- helpers

function hex(r, g, b, a) {
    const h = (v) => v.toString(16).padStart(2, '0');
    return `#${h(r)}${h(g)}${h(b)}${a === 255 ? '' : h(a)}`;
}

function pixelAt(img, x, y) {
    const o = (y * img.width + x) * 4;
    return [img.data[o], img.data[o + 1], img.data[o + 2], img.data[o + 3]];
}

// Opaque-pixel statistics of one frame: count, centre of mass x, rows touched.
function frameStats(img, fx, fy, fw, fh) {
    let n = 0, sumX = 0, top = -1, bottom = -1, bottomRow = 0, topRow = 0;
    for (let y = 0; y < fh; y++) {
        for (let x = 0; x < fw; x++) {
            const a = img.data[((fy + y) * img.width + fx + x) * 4 + 3];
            if (a === 0) continue;
            n++; sumX += x + 0.5;
            if (top < 0) top = y;
            bottom = y;
            if (y === 0) topRow++;
            if (y === fh - 1) bottomRow++;
        }
    }
    return { n, comX: n ? sumX / n : NaN, top, bottom, topRow, bottomRow };
}

function fmt(v) { return Number.isFinite(v) ? (Math.round(v * 10) / 10).toString() : 'n/a'; }

// ---------------------------------------------------------------- checks

function checkAlpha(img) {
    let bad = 0, opaque = 0, transparent = 0, first = null;
    const d = img.data;
    for (let i = 3, p = 0; i < d.length; i += 4, p++) {
        const a = d[i];
        if (a === 255) opaque++;
        else if (a === 0) transparent++;
        else { bad++; if (!first) first = { x: p % img.width, y: Math.floor(p / img.width), a }; }
    }
    const total = img.width * img.height;
    if (bad === 0) return ok(`every pixel is alpha 0 or 255 (${total} px: ${opaque} opaque, ${transparent} transparent)`);
    return fail(`${bad} of ${total} px have alpha between 1 and 254 (first at (${first.x},${first.y}) alpha ${first.a})`);
}

function checkGrid(img, cls) {
    const w = img.width, h = img.height;
    if (cls.type === 'icon') {
        return skip(`${ICON}-px icons (AR-800) are not on the ${SCALE}x grid: ${ICON} is not a multiple of ${SCALE}`);
    }
    if (w % SCALE !== 0 || h % SCALE !== 0) {
        return fail(`${w}x${h} is not a multiple of ${SCALE}, so it cannot be a ${SCALE}x export`);
    }
    const bw = w / SCALE, bh = h / SCALE;
    let broken = 0, first = null;
    for (let by = 0; by < bh; by++) {
        for (let bx = 0; bx < bw; bx++) {
            const x0 = bx * SCALE, y0 = by * SCALE;
            const ref = pixelAt(img, x0, y0);
            let bad = null;
            for (let dy = 0; dy < SCALE && !bad; dy++) {
                for (let dx = 0; dx < SCALE; dx++) {
                    const p = pixelAt(img, x0 + dx, y0 + dy);
                    // two transparent pixels are the same colour whatever their RGB
                    if (p[3] === 0 && ref[3] === 0) continue;
                    if (p[0] !== ref[0] || p[1] !== ref[1] || p[2] !== ref[2] || p[3] !== ref[3]) {
                        bad = { x: x0 + dx, y: y0 + dy, p }; break;
                    }
                }
            }
            if (bad) {
                broken++;
                if (!first) first = { bx, by, x0, y0, ref, ...bad };
            }
        }
    }
    const blocks = bw * bh;
    if (broken === 0) return ok(`every ${SCALE}x${SCALE} block is one colour (${blocks} blocks)`);
    return fail(`pixel (${first.x},${first.y}) is ${hex(...first.p)} but its block's top-left (${first.x0},${first.y0}) is ${hex(...first.ref)}; ${broken} of ${blocks} blocks broken`);
}

function checkPalette(img) {
    const seen = new Set();
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] !== 255) continue;
        seen.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
    }
    const n = seen.size;
    const r = { colors: n };
    if (n === 0) return fail('no opaque pixels at all', r);
    if (n <= PALETTE_LIMIT) return ok(`${n} opaque colours (limit ${PALETTE_LIMIT})`, r);
    if (n <= PALETTE_FAIL) return warn(`${n} opaque colours: over the ${PALETTE_LIMIT} limit (more than ${PALETTE_FAIL} fails)`, r);
    return fail(`${n} opaque colours: over ${PALETTE_FAIL} (limit ${PALETTE_LIMIT})`, r);
}

function checkSize(img, cls, grid) {
    const w = img.width, h = img.height;
    const dims = `${w}x${h}`;
    const mult48 = w % TILE === 0 && h % TILE === 0;
    if (cls.type === 'tileset') {
        if (cls.slot === 'A1' || cls.slot === 'A2') {
            if (w === A1A2.width && h === A1A2.height) return ok(`${dims}: the ${cls.slot} sheet size ${A1A2.width}x${A1A2.height} (${grid.cols}x${grid.rows} tiles of ${TILE})`);
            return fail(`${dims}: an ${cls.slot} sheet must be ${A1A2.width}x${A1A2.height}`);
        }
        if (mult48) return ok(`${dims}: a multiple of ${TILE} both ways (${grid.cols}x${grid.rows} tiles; no exact size rule for slot ${cls.slot || '?'})`);
        return fail(`${dims}: a tile sheet must be a multiple of ${TILE} both ways`);
    }
    if (cls.type === 'icon') {
        if (w === ICON_SHEET_WIDTH && h % ICON === 0) return ok(`${dims}: ${ICON_SHEET_WIDTH} wide, ${grid.cols}x${grid.rows} icons of ${ICON}`);
        return fail(`${dims}: an icon sheet must be ${ICON_SHEET_WIDTH} wide with a height that is a multiple of ${ICON} (${ICON}-px icons)`);
    }
    if (cls.type === 'face') {
        if (w === 4 * FACE && h === 2 * FACE) return ok(`${dims}: 4x2 faces of ${FACE}`);
        return fail(`${dims}: a face sheet must be ${4 * FACE}x${2 * FACE} (4 columns x 2 rows of ${FACE}, AR-700)`);
    }
    if (cls.type === 'system') {
        return skip(`${dims}: no size rule for system images`);
    }
    // character, object, image
    const problems = [];
    if (!mult48) problems.push(`not a multiple of ${TILE} both ways`);
    if (grid.source === 'none') {
        // unknown image: only the multiple-of-48 rule
    } else if (!gridIsWhole(grid)) {
        problems.push(`frame ${fmt(grid.fw)}x${fmt(grid.fh)} (${grid.source}) does not divide the sheet into whole frames`);
    }
    if (problems.length) return fail(`${dims}: ${problems.join('; ')}`);
    if (grid.source === 'none') return ok(`${dims}: a multiple of ${TILE} both ways`);
    const frames = `${grid.cols}x${grid.rows} frames of ${grid.fw}x${grid.fh} (${grid.source})`;
    if ((cls.type === 'character' || cls.type === 'object') && (grid.fw !== TILE || grid.fh !== TILE)) {
        return warn(`${dims}: a multiple of ${TILE}; ${frames}, not the ${TILE}x${TILE} frame of ART_STANDARD F3`);
    }
    return ok(`${dims}: a multiple of ${TILE} both ways; ${frames}`);
}

function sidecarPath(file) {
    const ext = path.extname(file);
    return file.slice(0, file.length - ext.length) + '.json';
}

function normFacing(f) {
    return typeof f === 'string' ? FACING_NAMES[f.toLowerCase()] || null : null;
}

function checkSidecar(file, img, cls, sidecar, sidecarError, required, grid) {
    const sc = sidecarPath(file);
    if (cls.type === 'tileset' || cls.type === 'icon' || cls.type === 'face' || cls.type === 'system') {
        return skip(`${cls.type} sheets have no sidecar in ART_STANDARD §3`);
    }
    if (sidecarError) return fail(`${path.basename(sc)}: ${sidecarError}`);
    if (!sidecar) {
        if (required) return fail(`missing: ${sc}`);
        return skip(`none next to the PNG (only required with --sidecar)`);
    }
    const problems = [];
    const intPos = (v) => Number.isInteger(v) && v > 0;
    if (!intPos(sidecar.frameWidth)) problems.push(`frameWidth ${JSON.stringify(sidecar.frameWidth)} is not a positive integer`);
    else if (img.width % sidecar.frameWidth !== 0) problems.push(`frameWidth ${sidecar.frameWidth} does not divide the width ${img.width}`);
    if (!intPos(sidecar.frameHeight)) problems.push(`frameHeight ${JSON.stringify(sidecar.frameHeight)} is not a positive integer`);
    else if (img.height % sidecar.frameHeight !== 0) problems.push(`frameHeight ${sidecar.frameHeight} does not divide the height ${img.height}`);
    const fw = intPos(sidecar.frameWidth) ? sidecar.frameWidth : 0;
    const fh = intPos(sidecar.frameHeight) ? sidecar.frameHeight : 0;
    const cols = fw ? img.width / fw : 0, rows = fh ? img.height / fh : 0;

    const an = sidecar.anchor;
    if (!Array.isArray(an) || an.length !== 2 || !Number.isInteger(an[0]) || !Number.isInteger(an[1])) {
        problems.push(`anchor ${JSON.stringify(an)} is not [x, y] of two integers`);
    } else if (fw && fh && (an[0] < 0 || an[0] > fw || an[1] < 0 || an[1] > fh)) {
        problems.push(`anchor [${an[0]},${an[1]}] is outside the ${fw}x${fh} frame`);
    }

    let facings = [];
    if (!Array.isArray(sidecar.facings) || sidecar.facings.length === 0) {
        problems.push(`facings ${JSON.stringify(sidecar.facings)} is not a non-empty array`);
    } else {
        facings = sidecar.facings.map(normFacing);
        const badF = sidecar.facings.filter((f, i) => !facings[i]);
        if (badF.length) problems.push(`facings has unknown entries ${JSON.stringify(badF)} (S, W, E, N or south, west, east, north)`);
        if (new Set(facings).size !== facings.length) problems.push(`facings repeats an entry: ${JSON.stringify(sidecar.facings)}`);
        if (rows && facings.length > rows) problems.push(`${facings.length} facings but only ${rows} rows of ${fh}`);
    }

    let maxIndex = -1;
    const animNames = [];
    if (!sidecar.animations || typeof sidecar.animations !== 'object' || Array.isArray(sidecar.animations)
        || Object.keys(sidecar.animations).length === 0) {
        problems.push(`animations is not a non-empty object`);
    } else {
        for (const [name, idx] of Object.entries(sidecar.animations)) {
            animNames.push(name);
            if (!Array.isArray(idx) || idx.length === 0 || !idx.every(Number.isInteger)) {
                problems.push(`animations.${name} ${JSON.stringify(idx)} is not a non-empty array of integers`);
                continue;
            }
            for (const i of idx) {
                if (i > maxIndex) maxIndex = i;
                if (i < 0 || (cols && i >= cols)) problems.push(`animations.${name} index ${i} is outside the ${cols} columns`);
            }
        }
    }
    const optional = ['layer', 'species', 'stage'].map((k) => `${k} ${k in sidecar ? 'present' : 'absent'}`).join(', ');
    if (problems.length) return fail(`${path.basename(sc)}: ${problems.join('; ')}`);
    return ok(`${path.basename(sc)}: frame ${fw}x${fh} (${cols}x${rows}), anchor [${an[0]},${an[1]}], facings ${facings.join('')}, animations ${animNames.join(',')} (highest index ${maxIndex} of ${cols} columns); ${optional}`);
}

// The S stand frame(s) of a character sheet: [{col, row, label}], one per character on the sheet.
function standFrames(cls, grid, sidecar) {
    let sRow = 0;
    if (sidecar && Array.isArray(sidecar.facings)) {
        const i = sidecar.facings.map(normFacing).indexOf('S');
        if (i >= 0) sRow = i;
    }
    let standCol = grid.cols === 3 ? 1 : 0; // RMMZ's standing pose is the middle column of a 3-column sheet
    let colSource = grid.cols === 3 ? 'middle column' : 'column 0';
    if (sidecar && sidecar.animations && Array.isArray(sidecar.animations.stand) && Number.isInteger(sidecar.animations.stand[0])) {
        standCol = sidecar.animations.stand[0]; colSource = 'sidecar stand[0]';
    }
    if (!cls.multi) return { frames: [{ col: standCol, row: sRow, label: 'S stand frame' }], colSource };
    const frames = [];
    for (let cy = 0; cy < 2; cy++) {
        for (let cx = 0; cx < 4; cx++) {
            frames.push({ col: cx * 3 + standCol, row: cy * 4 + sRow, label: `character ${cy * 4 + cx + 1}` });
        }
    }
    return { frames, colSource };
}

function describeType(cls) {
    if (cls.type === 'object') return 'an object sheet';
    if (cls.type === 'image') return 'an unclassified image';
    if (cls.type === 'icon') return 'an icon sheet';
    return `a ${cls.type} sheet`;
}

function checkLean(img, cls, grid, sidecar) {
    if (cls.type !== 'character') return skip(`only for character sheets (this is ${describeType(cls)})`);
    if (!gridIsWhole(grid)) return fail('no whole frame grid (see size)');
    const { frames, colSource } = standFrames(cls, grid, sidecar);
    const centre = grid.fw / 2;
    const parts = [];
    let worst = null, empty = [];
    for (const f of frames) {
        if (f.col >= grid.cols || f.row >= grid.rows) return fail(`${f.label} at column ${f.col}, row ${f.row} is outside the ${grid.cols}x${grid.rows} grid`);
        const s = frameStats(img, f.col * grid.fw, f.row * grid.fh, grid.fw, grid.fh);
        if (s.n === 0) { empty.push(f.label); continue; }
        const off = s.comX - centre;
        parts.push(`${f.label}${cls.multi ? '' : ` (col ${f.col}, row ${f.row})`}: mass centre x ${fmt(s.comX)} of ${grid.fw}, centre ${fmt(centre)}, off by ${fmt(off)} px`);
        if (!worst || Math.abs(off) > Math.abs(worst.off)) worst = { off, label: f.label };
    }
    const where = `[S row ${frames[0].row}, ${colSource}, limit ${LEAN_LIMIT_PX}]`;
    if (!worst) return fail(`no opaque pixels in the S stand frame (${empty.join(', ')}) ${where}`);
    const detail = `${parts.join('; ')}${empty.length ? `; empty: ${empty.join(', ')}` : ''} ${where}`;
    const r = { leanPx: Math.round(worst.off * 100) / 100 };
    if (Math.abs(worst.off) > LEAN_LIMIT_PX) return fail(`${worst.label} is off centre by ${fmt(worst.off)} px (limit ${LEAN_LIMIT_PX}); ${detail}`, r);
    return ok(detail, r);
}

function checkMargin(img, cls, grid, sidecar) {
    if (cls.type !== 'character') return skip(`only for character sheets (this is ${describeType(cls)})`);
    if (!gridIsWhole(grid)) return fail('no whole frame grid (see size)');
    const { frames } = standFrames(cls, grid, sidecar);
    const problems = [], parts = [];
    for (const f of frames) {
        if (f.col >= grid.cols || f.row >= grid.rows) return fail(`${f.label} at column ${f.col}, row ${f.row} is outside the ${grid.cols}x${grid.rows} grid`);
        const s = frameStats(img, f.col * grid.fw, f.row * grid.fh, grid.fw, grid.fh);
        const where = cls.multi ? f.label : `${f.label} (col ${f.col}, row ${f.row})`;
        if (s.n === 0) { problems.push(`${where} has no opaque pixels`); continue; }
        parts.push(`${where}: bottom row ${s.bottomRow} opaque px, top row ${s.topRow}`);
        if (s.bottomRow === 0) problems.push(`${where}: bottom row is empty (lowest opaque row is ${s.bottom} of ${grid.fh - 1}: the feet float)`);
        if (s.topRow > 0) problems.push(`${where}: top row has ${s.topRow} opaque px (the figure touches the frame top)`);
    }
    if (problems.length) return fail(problems.join('; '));
    return ok(parts.join('; '));
}

// ---------------------------------------------------------------- result plumbing

function ok(detail, extra) { return Object.assign({ status: 'PASS', detail }, extra || {}); }
function warn(detail, extra) { return Object.assign({ status: 'WARN', detail }, extra || {}); }
function fail(detail, extra) { return Object.assign({ status: 'FAIL', detail }, extra || {}); }
function skip(detail, extra) { return Object.assign({ status: 'SKIP', detail }, extra || {}); }

function checkFile(file, opts) {
    const report = { file, width: 0, height: 0, type: null, frame: null, colors: null, checks: [], status: 'FAIL' };
    const add = (name, r) => { report.checks.push(Object.assign({ name }, r)); return r; };

    if (!fs.existsSync(file)) {
        add('read', fail('file not found'));
        return finish(report);
    }
    let img;
    try {
        img = readPNG(file);
    } catch (e) {
        add('read', fail(`cannot decode: ${e.message}`));
        return finish(report);
    }
    report.width = img.width; report.height = img.height;

    let sidecar = null, sidecarError = null;
    const sc = sidecarPath(file);
    if (fs.existsSync(sc)) {
        try {
            sidecar = JSON.parse(fs.readFileSync(sc, 'utf8'));
            if (!sidecar || typeof sidecar !== 'object' || Array.isArray(sidecar)) { sidecarError = 'not a JSON object'; sidecar = null; }
        } catch (e) { sidecarError = `invalid JSON (${e.message})`; }
    }
    const cls = classify(file, sidecar, opts.type);
    const grid = frameGrid(img, cls, sidecar);
    report.type = cls.type + (cls.slot ? ` ${cls.slot}` : '') + (cls.multi ? ' (8 per sheet)' : '');
    report.typeWhy = cls.why;
    report.frame = gridIsWhole(grid) ? { width: grid.fw, height: grid.fh, columns: grid.cols, rows: grid.rows, source: grid.source } : null;
    report.sidecar = sidecar ? path.basename(sc) : null;

    add('alpha', checkAlpha(img));
    add('grid', checkGrid(img, cls));
    const pal = add('palette', checkPalette(img));
    report.colors = pal.colors;
    add('size', checkSize(img, cls, grid));
    add('sidecar', checkSidecar(file, img, cls, sidecar, sidecarError, opts.sidecar, grid));
    const lean = add('lean', checkLean(img, cls, grid, sidecar));
    if ('leanPx' in lean) report.leanPx = lean.leanPx;
    add('margin', checkMargin(img, cls, grid, sidecar));
    return finish(report);
}

function finish(report) {
    const failed = report.checks.filter((c) => c.status === 'FAIL');
    const warned = report.checks.filter((c) => c.status === 'WARN');
    report.status = failed.length ? 'FAIL' : warned.length ? 'WARN' : 'PASS';
    report.failed = failed.map((c) => c.name);
    report.warned = warned.map((c) => c.name);
    return report;
}

function header(r) {
    const bits = [`${r.width}x${r.height}`, r.type || 'unreadable'];
    if (r.frame) bits.push(`${r.frame.columns}x${r.frame.rows} frames of ${r.frame.width}x${r.frame.height}`);
    if (r.sidecar) bits.push(`sidecar ${r.sidecar}`);
    return bits.join(', ');
}

function fileLine(r) {
    const total = r.checks.length, skipped = r.checks.filter((c) => c.status === 'SKIP').length;
    const passed = r.checks.filter((c) => c.status === 'PASS').length;
    const bits = [`${passed}/${total - skipped} checks pass`];
    if (r.failed.length) bits.push(`failed: ${r.failed.join(', ')}`);
    if (r.warned.length) bits.push(`warn: ${r.warned.join(', ')}`);
    if (skipped) bits.push(`${skipped} skipped`);
    const colors = r.colors == null ? '' : `, ${r.colors} colours`;
    return `FILE ${r.status} ${r.file}: ${header(r)}${colors}; ${bits.join('; ')}`;
}

function main() {
    let opts;
    try {
        opts = parseArgs(process.argv.slice(2));
    } catch (e) {
        console.error(e.message);
        console.error(usage());
        return 2;
    }
    if (opts.selftest) return selftest();
    if (opts.help || opts.files.length === 0) {
        console.log(usage());
        return opts.help ? 0 : 2;
    }
    const reports = opts.files.map((f) => checkFile(f, opts));
    const failedFiles = reports.filter((r) => r.status === 'FAIL').length;
    if (opts.json) {
        console.log(JSON.stringify(reports, null, 2));
    } else {
        for (const r of reports) {
            if (!opts.summary) {
                console.log(`== ${r.file} (${header(r)})`);
                for (const c of r.checks) console.log(`${c.status} ${c.name}: ${c.detail}`);
            }
            console.log(fileLine(r));
        }
        console.log(`RESULT ${failedFiles ? 'FAIL' : 'PASS'} ${reports.length - failedFiles}/${reports.length} files without a FAIL (art_check)`);
    }
    return failedFiles ? 1 : 0;
}

// ---------------------------------------------------------------- self-test
// Builds small sheets that must trip each check (ENGINE_RULES §6: a check that cannot FAIL is not a
// check) under os.tmpdir()/uf_art_check_selftest, runs checkFile on them and compares with what is
// expected. Prints PASS/FAIL selftest.<case> lines and RESULT; exit code 1 on any mismatch.

function selftest() {
    const os = require('os');
    const { writePNG } = require('./png_util');
    const root = path.join(os.tmpdir(), 'uf_art_check_selftest');
    for (const d of ['characters', 'tilesets', 'system']) fs.mkdirSync(path.join(root, d), { recursive: true });

    const set = (buf, w, x, y, r, g, b, a) => {
        const o = (y * w + x) * 4; buf[o] = r; buf[o + 1] = g; buf[o + 2] = b; buf[o + 3] = a === undefined ? 255 : a;
    };
    const block = (buf, w, x, y, rgb) => { for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) set(buf, w, x + dx, y + dy, ...rgb); };
    const BODY = [0x30, 0x60, 0xa0], HEAD = [0xe0, 0xb0, 0x80], LINE = [0x20, 0x18, 0x30];
    // A 16-px-native figure drawn at 3x: head rows 3-5 cols 6-9, body rows 6-15 cols 5-10, centred on x=8.
    const figure = (buf, w, ox, oy, o) => {
        const top = o.headTop === undefined ? 3 : o.headTop, sx = o.shiftX || 0, sy = o.shiftY || 0;
        for (let y = top; y <= top + 2; y++) for (let x = 6; x <= 9; x++) block(buf, w, ox + (x + sx) * 3, oy + (y + sy) * 3, HEAD);
        for (let y = top + 3; y <= 15; y++) for (let x = 5; x <= 10; x++) block(buf, w, ox + (x + sx) * 3, oy + (y + sy) * 3, (x === 5 || x === 10) ? LINE : BODY);
    };
    const sheet = (name, o) => {
        o = o || {};
        const cols = o.cols || 3, rows = o.rows || 4, w = cols * TILE, h = rows * TILE;
        const buf = Buffer.alloc(w * h * 4, 0);
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) figure(buf, w, c * TILE, r * TILE, o);
        if (o.mutate) o.mutate(buf, w, h);
        const file = path.join(root, 'characters', name);
        writePNG(file, w, h, buf);
        const sc = sidecarPath(file);
        if (o.sidecar) fs.writeFileSync(sc, typeof o.sidecar === 'string' ? o.sidecar : JSON.stringify(o.sidecar, null, 2));
        else if (fs.existsSync(sc)) fs.unlinkSync(sc);
        return file;
    };
    const tiles = (folder, name, w, h) => {
        const buf = Buffer.alloc(w * h * 4, 0);
        for (let y = 0; y + 3 <= h; y += 3) for (let x = 0; x + 3 <= w; x += 3) block(buf, w, x, y, ((x + y) / 3) % 2 ? [90, 150, 60] : [70, 120, 50]);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; if (buf[o + 3] === 0) set(buf, w, x, y, 70, 120, 50); }
        const file = path.join(root, folder, name);
        writePNG(file, w, h, buf);
        return file;
    };
    const good = {
        id: 'TEST_clean', frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
        facings: ['S', 'W', 'E', 'N'], animations: { stand: [1], walk: [0, 1, 2] }, frameMs: 150,
        layer: 'body', species: 'TEST_species', stage: 'adult'
    };
    const rainbow = (n) => (b, w) => { for (let i = 0; i < n; i++) block(b, w, (3 * i) % w, 3 * Math.floor(3 * i / w) + 3, [(i * 7) % 256, 40, 200]); };
    const notPng = path.join(root, 'characters', '$T_NotPng.png');
    fs.writeFileSync(notPng, 'not a png');

    const cases = [
        { name: 'clean', file: sheet('$T_Clean.png', { sidecar: good }), expect: { alpha: 'PASS', grid: 'PASS', palette: 'PASS', size: 'PASS', sidecar: 'PASS', lean: 'PASS', margin: 'PASS' } },
        { name: 'alpha', file: sheet('$T_Alpha.png', { sidecar: good, mutate: (b, w) => set(b, w, 72, 30, ...BODY, 128) }), expect: { alpha: 'FAIL' } },
        { name: 'grid', file: sheet('$T_Grid.png', { sidecar: good, mutate: (b, w) => set(b, w, 73, 31, 255, 0, 0) }), expect: { grid: 'FAIL', alpha: 'PASS' } },
        { name: 'palette_warn', file: sheet('$T_Palette40.png', { sidecar: good, mutate: rainbow(37) }), expect: { palette: 'WARN' } },
        { name: 'palette_fail', file: sheet('$T_Palette70.png', { sidecar: good, mutate: rainbow(67) }), expect: { palette: 'FAIL' } },
        { name: 'palette_empty', file: sheet('$T_Empty.png', { sidecar: good, mutate: (b) => b.fill(0) }), expect: { palette: 'FAIL', lean: 'FAIL', margin: 'FAIL' } },
        { name: 'size_odd', file: (() => { const f = path.join(root, 'characters', '$T_Size100.png'); const b = Buffer.alloc(100 * 100 * 4, 0); for (let y = 40; y < 100; y++) for (let x = 40; x < 60; x++) set(b, 100, x, y, 10, 200, 10); writePNG(f, 100, 100, b); return f; })(), expect: { size: 'FAIL', grid: 'FAIL' } },
        { name: 'size_a2', file: tiles('tilesets', 'T_A2.png', 768, 576), expect: { size: 'PASS', grid: 'PASS', alpha: 'PASS', lean: 'SKIP', margin: 'SKIP', sidecar: 'SKIP' } },
        { name: 'size_a2_short', file: tiles('tilesets', 'T_Short_A2.png', 768, 384), expect: { size: 'FAIL' } },
        { name: 'size_icon', file: tiles('system', 'IconSet.png', 512, 64), expect: { size: 'PASS', grid: 'SKIP' } },
        { name: 'size_icon_narrow', file: tiles('system', 'IconSet_Narrow.png', 500, 64), expect: { size: 'FAIL' } },
        { name: 'sidecar_missing', file: sheet('$T_NoSidecar.png'), expect: { sidecar: 'FAIL' } },
        { name: 'sidecar_anchor', file: sheet('$T_BadAnchor.png', { sidecar: Object.assign({}, good, { anchor: [24, 60] }) }), expect: { sidecar: 'FAIL' } },
        { name: 'sidecar_anim', file: sheet('$T_BadAnim.png', { sidecar: Object.assign({}, good, { animations: { stand: [1], walk: [0, 1, 5] } }) }), expect: { sidecar: 'FAIL' } },
        { name: 'sidecar_frame', file: sheet('$T_BadFrame.png', { sidecar: Object.assign({}, good, { frameWidth: 50 }) }), expect: { sidecar: 'FAIL', size: 'FAIL' } },
        { name: 'sidecar_facing', file: sheet('$T_BadFacing.png', { sidecar: Object.assign({}, good, { facings: ['S', 'W', 'E', 'N', 'NE'] }) }), expect: { sidecar: 'FAIL' } },
        { name: 'sidecar_json', file: sheet('$T_BrokenJson.png', { sidecar: '{ not json' }), expect: { sidecar: 'FAIL' } },
        { name: 'lean', file: sheet('$T_Lean.png', { sidecar: good, shiftX: 1 }), expect: { lean: 'FAIL', margin: 'PASS' } },
        { name: 'margin_float', file: sheet('$T_Float.png', { sidecar: good, shiftY: -1 }), expect: { margin: 'FAIL', lean: 'PASS' } },
        { name: 'margin_top', file: sheet('$T_TopTouch.png', { sidecar: good, headTop: 0 }), expect: { margin: 'FAIL' } },
        { name: 'object_skips', file: sheet('!$T_Object.png', { sidecar: Object.assign({}, good, { facings: ['S'], animations: { stand: [1] } }) }), expect: { lean: 'SKIP', margin: 'SKIP', sidecar: 'PASS' } },
        { name: 'eight_sheet', file: sheet('T_Eight.png', { cols: 12, rows: 8 }), expect: { lean: 'PASS', margin: 'PASS', size: 'PASS' } },
        { name: 'read_not_png', file: notPng, expect: { read: 'FAIL' } },
        { name: 'read_missing', file: path.join(root, 'characters', '$T_Missing.png'), expect: { read: 'FAIL' } }
    ];

    let failed = 0;
    for (const c of cases) {
        const r = checkFile(c.file, { sidecar: true, type: null });
        for (const [check, want] of Object.entries(c.expect)) {
            const got = r.checks.find((k) => k.name === check);
            const okay = got && got.status === want;
            if (!okay) failed++;
            const detail = got ? `${got.status}: ${got.detail}` : 'check not run';
            console.log(`${okay ? 'PASS' : 'FAIL'} selftest.${c.name}.${check}: expected ${want}, got ${detail}`);
        }
    }
    const total = cases.reduce((n, c) => n + Object.keys(c.expect).length, 0);
    console.log(`RESULT ${failed ? 'FAIL' : 'PASS'} ${total - failed}/${total} expectations (art_check selftest, sheets in ${root})`);
    return failed ? 1 : 0;
}

module.exports = { checkFile, classify, frameGrid, selftest };

if (require.main === module) {
    process.exitCode = main();
}
