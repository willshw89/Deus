#!/usr/bin/env node
'use strict';
// tools/check_briefs.js: validates the asset briefs for Gemini in docs/asset_briefs/SEG-*.md.
//
//   node tools/check_briefs.js [<file.md> ...] [--coverage] [--summary] [--verbose]
//   node tools/check_briefs.js --ids
//   node tools/check_briefs.js --selftest
//
// With no files it checks every docs/asset_briefs/SEG-*.md. It prints one line per problem
// ("FAIL|WARN <file> <brief id>: <message>"), then "RESULT PASS|FAIL <n> briefs, <f> fails, <w> warns",
// and exits 1 on any FAIL. Doc: docs/systems/CHECK_BRIEFS.md.
//
// Rules (numbered as in the doc):
//   1 structure   "### <id> — <name> (<AR-nnn>)", the header bullets Category, Dimensions, Anchor,
//                 Projection, Reference, Palette Ramps in that order (Sheet optional), then the three
//                 "#### " sections in order, each with a body, then a "Deliver:" line
//   2 palette     every "<index> `#HEX`" pair matches art/palette/uf.hex line <index> (0-based)
//   3 ids         the brief id is a catalog id or starts with ui_/eq_/face_/anchor_; backticked
//                 catalog-looking ids must be known (catalog, suffix form <id>_lit/_bare/_unbuilt) → WARN
//   4 request     the AR number is a "| AR-nnn |" row of docs/ASSET_REQUESTS.md → WARN
//   5 words       banned proper nouns → FAIL; "Ultima VII" / "U7" only on the Reference and Projection bullets
//   6 colours     more than 32 distinct palette indices in one brief → WARN
//   7 coverage    --coverage: every catalog id needs a brief in some segment file → FAIL per missing id
//
// Options:
//   --coverage  after the briefs, list every catalog id with no brief (exit 1 if any)
//   --summary   print a table per segment file (briefs, fails, warns) before the RESULT line
//   --verbose   also print "PASS <file> <id>" for every clean brief
//   --ids       print the catalog id sets a brief may use and exit
//   --selftest  write scratch segments under %TEMP%\uf_check_briefs_selftest and prove every rule can fail

const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');
const CATALOG_FILE = path.join(ROOT, 'game', 'data', 'UF_WorldCatalog.json');
const REQUESTS_FILE = path.join(ROOT, 'docs', 'ASSET_REQUESTS.md');
const BRIEFS_DIR = path.join(ROOT, 'docs', 'asset_briefs');

const HEADER_BULLETS = ['Category', 'Dimensions', 'Anchor', 'Projection', 'Reference', 'Palette Ramps'];
const OPTIONAL_BULLETS = ['Sheet'];
const SECTIONS = ['Primary State Visual Description', 'Interaction / Transformed State Description', 'Readability Check'];
const ID_PREFIXES = ['ui_', 'eq_', 'face_', 'anchor_'];  // non-catalog brief ids (UI, equipment, faces, markers)
const STATE_SUFFIXES = ['lit', 'bare', 'unbuilt'];       // <catalog id>_<suffix> names a state the engine derives
const COLOUR_LIMIT = 32;                                  // rule 6: distinct palette indices per brief
const MAGENTA = 'FF00FF';                                 // the master background; not a palette index
const PALETTE_PATH_TEXT = 'art/palette/uf.hex';           // allowed anywhere

// AGENTS.md → Reference vs. shipped content, plus the four the task names. Whole words, any case, plural allowed.
const BANNED = [
    'Avatar', 'Britannia', 'Guardian', 'Lord British', 'Iolo', 'Dupre', 'Shamino', 'Fellowship', 'moongate',
    'Urist', 'Armok', 'strange mood', 'fey mood',
    'beholder', 'mind flayer', 'illithid', 'displacer beast', 'githyanki',
    'Dwarf Fortress',
];
// Allowed only on the Reference and Projection bullet lines.
const REFERENCE_ONLY_RE = /(?<![A-Za-z0-9])(?:Ultima(?:\s+VII)?|U7)(?![A-Za-z0-9])/i;
const REFERENCE_ONLY_BULLETS = ['Reference', 'Projection'];

// Backticked lowercase tokens that are not catalog ids but are fine to write: animations, facings,
// actions, state words, sidecar and catalog field names.
const STATIC_VOCAB = [
    'stand', 'walk', 'work', 'carry', 'attack', 'cast', 'hurt', 'dead', 'sleep', 'idle', 'eat', 'die',
    's', 'w', 'e', 'n', 'south', 'west', 'east', 'north',
    'chop', 'gather', 'pick', 'quarry', 'mine', 'hunt', 'build', 'haul', 'dig', 'fish', 'cook', 'craft',
    'lit', 'unlit', 'bare', 'picked', 'full', 'unbuilt', 'built', 'ruined', 'intact', 'alive', 'regrown', 'regrow',
    'becomes', 'yields', 'ruin', 'tint', 'tags', 'tier', 'tiers', 'kind', 'stage', 'layer', 'species', 'image',
    'anchor', 'facings', 'animations', 'name', 'id', 'objects', 'items', 'types', 'wildlife', 'people', 'water',
    'surface', 'actions', 'true', 'false', 'null', 'friendly', 'indifferent', 'hostile',
];

const ID_TOKEN_RE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const HEADING_RE = /^### (\S+) — (.+?) \((AR-\d{3})\)\s*$/;
const HEADING_LOOSE_RE = /^### ([^\s—(]+)/;
const BULLET_RE = /^- \*\*([^*]+)\*\*:\s*(.*)$/;
const SECTION_RE = /^#### (.*?)\s*:?\s*$/;
const DELIVER_RE = /^\*{0,2}Deliver\*{0,2}:\s*(.*)$/;
const CHUNK_RE = /^#{1,3} /;
// "<index> `#HEX`" (backticks optional); a bare "`#HEX`" has no index group.
const PAIR_RE = /(?:(\d{1,3})\s*)?`?#([0-9A-Fa-f]{6})\b`?/g;
const BACKTICK_RE = /`([^`\n]+)`/g;

// ---------------------------------------------------------------- arguments

function parseArgs(argv) {
    const opts = { files: [], coverage: false, summary: false, verbose: false, ids: false, selftest: false, help: false };
    for (const a of argv) {
        if (a === '--coverage') opts.coverage = true;
        else if (a === '--summary') opts.summary = true;
        else if (a === '--verbose') opts.verbose = true;
        else if (a === '--ids') opts.ids = true;
        else if (a === '--selftest') opts.selftest = true;
        else if (a === '--help' || a === '-h') opts.help = true;
        else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
        else opts.files.push(a);
    }
    return opts;
}

function usage() {
    return [
        'usage: node tools/check_briefs.js [<file.md> ...] [--coverage] [--summary] [--verbose]',
        '       node tools/check_briefs.js --ids',
        '       node tools/check_briefs.js --selftest',
        'With no files: every docs/asset_briefs/SEG-*.md. One line per problem, then',
        'RESULT PASS|FAIL <n> briefs, <f> fails, <w> warns. Exit 1 on any FAIL, 2 on bad arguments or no files.',
    ].join('\n');
}

// ---------------------------------------------------------------- project inputs

function readText(file) {
    return fs.readFileSync(file, 'utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
}

function loadPalette(file) {
    const lines = readText(file).split('\n').map(l => l.trim()).filter(l => l.length);
    if (lines.length !== 256) throw new Error(`${file}: expected 256 lines, found ${lines.length}`);
    return lines.map((l, i) => {
        const m = /^#?([0-9A-Fa-f]{6})$/.exec(l);
        if (!m) throw new Error(`${file}: line ${i + 1} is not #RRGGBB: ${l}`);
        return m[1].toUpperCase();
    });
}

// The six id sets a brief may be about (rule 3), plus every id-looking key or string in the catalog
// (the vocabulary that backticked tokens are checked against).
function loadCatalog(file) {
    const c = JSON.parse(readText(file));
    const sets = {
        'objects': (c.objects || []).map(o => o.id),
        'items.types': ((c.items || {}).types || []).map(t => t.id),
        'wildlife.species': ((c.wildlife || {}).species || []).map(s => s.id),
        'people': Object.keys(c.people || {}).filter(k => k !== 'about'),
        'groundKinds': (c.groundKinds || []).map(g => g.id),
        'water.surface': Object.keys((c.water || {}).surface || {}),
    };
    const ids = new Map();
    for (const [set, list] of Object.entries(sets)) for (const id of list) if (!ids.has(id)) ids.set(id, set);
    const vocab = new Set();
    (function walk(v) {
        if (Array.isArray(v)) { v.forEach(walk); return; }
        if (v && typeof v === 'object') {
            for (const [k, x] of Object.entries(v)) { if (ID_TOKEN_RE.test(k)) vocab.add(k); walk(x); }
            return;
        }
        if (typeof v === 'string' && ID_TOKEN_RE.test(v)) vocab.add(v);
    })(c);
    return { sets, ids, vocab };
}

function loadRequests(file) {
    const rows = new Set();
    for (const m of readText(file).matchAll(/^\| (AR-\d{3}) \|/gm)) rows.add(m[1]);
    return rows;
}

function loadContext() {
    return {
        palette: loadPalette(PALETTE_FILE),
        catalog: loadCatalog(CATALOG_FILE),
        requests: loadRequests(REQUESTS_FILE),
        banned: BANNED.map(p => ({
            word: p,
            re: new RegExp('(?<![A-Za-z0-9])' + p.replace(/\s+/g, '\\s+') + '(?:e?s)?(?![A-Za-z0-9])', 'i'),
        })),
        staticVocab: new Set(STATIC_VOCAB),
    };
}

// ---------------------------------------------------------------- parsing

// Splits a segment file into chunks at every "# ", "## " or "### " line. Chunks whose first line is
// "### " are briefs; the rest is prose between briefs (checked for banned words only, as warnings).
function parseSegment(text) {
    const lines = text.split('\n');
    const chunks = [];
    let cur = { startLine: 1, lines: [] };
    lines.forEach((line, i) => {
        if (CHUNK_RE.test(line) && (cur.lines.length || i > 0)) {
            if (cur.lines.some(l => l.trim())) chunks.push(cur);
            cur = { startLine: i + 1, lines: [] };
        }
        cur.lines.push(line);
    });
    if (cur.lines.some(l => l.trim())) chunks.push(cur);
    const briefs = [], prose = [];
    for (const ch of chunks) {
        if (ch.lines[0].startsWith('### ')) {
            const m = HEADING_RE.exec(ch.lines[0]);
            const loose = HEADING_LOOSE_RE.exec(ch.lines[0]);
            briefs.push({
                startLine: ch.startLine, lines: ch.lines, heading: ch.lines[0],
                headingOk: !!m,
                id: m ? m[1] : (loose ? loose[1] : ch.lines[0].slice(4, 44).trim()),
                name: m ? m[2] : null, ar: m ? m[3] : null,
            });
        } else prose.push(ch);
    }
    return { briefs, prose };
}

// ---------------------------------------------------------------- checks

function isKnownToken(tok, ctx, briefIds) {
    const { ids, vocab } = ctx.catalog;
    if (ids.has(tok) || vocab.has(tok) || ctx.staticVocab.has(tok)) return true;
    if (ID_PREFIXES.some(p => tok.startsWith(p))) return true;
    if (briefIds && briefIds.has(tok)) return true;
    for (const s of STATE_SUFFIXES) {
        if (tok.endsWith('_' + s) && ids.has(tok.slice(0, -(s.length + 1)))) return true;
    }
    return false;
}

// Returns [{ level: 'FAIL'|'WARN', msg }] for one brief.
function checkBrief(brief, ctx, briefIds) {
    const out = [];
    const fail = m => out.push({ level: 'FAIL', msg: m });
    const warn = m => out.push({ level: 'WARN', msg: m });
    const L = brief.lines;

    // rule 1: heading
    if (!brief.headingOk) fail(`heading must be "### <id> — <name> (<AR-nnn>)" with an em dash, got "${brief.heading.trim()}"`);

    // rule 1: header bullets before the first "#### "
    let firstSection = L.findIndex((l, i) => i > 0 && SECTION_RE.test(l) && l.startsWith('#### '));
    const headerEnd = firstSection < 0 ? L.length : firstSection;
    const bullets = [];
    for (let i = 1; i < headerEnd; i++) {
        const m = BULLET_RE.exec(L[i]);
        if (m) bullets.push({ name: m[1].trim(), text: m[2].trim(), line: i });
    }
    const seen = new Set();
    for (const b of bullets) {
        if (!HEADER_BULLETS.includes(b.name) && !OPTIONAL_BULLETS.includes(b.name)) fail(`unknown header bullet "${b.name}"`);
        else if (seen.has(b.name)) fail(`header bullet "${b.name}" appears twice`);
        else seen.add(b.name);
        if (!b.text) fail(`header bullet "${b.name}" is empty`);
    }
    for (const want of HEADER_BULLETS) if (!seen.has(want)) fail(`missing header bullet "${want}"`);
    const requiredOrder = bullets.map(b => b.name).filter(n => HEADER_BULLETS.includes(n));
    const expectedOrder = HEADER_BULLETS.filter(n => seen.has(n));
    if (requiredOrder.join('|') !== expectedOrder.join('|') && new Set(requiredOrder).size === requiredOrder.length) {
        fail(`header bullets out of order: ${requiredOrder.join(', ')} (want ${HEADER_BULLETS.join(', ')})`);
    }
    const bulletText = name => { const b = bullets.find(x => x.name === name); return b ? b.text : ''; };
    if (seen.has('Anchor') && !/\[\s*24\s*,\s*47\s*\]/.test(bulletText('Anchor')) && !/\bnone\b/i.test(bulletText('Anchor'))) {
        warn('Anchor bullet is neither "bottom-centre of the cell [24, 47]" nor "none (tile)"');
    }
    if (seen.has('Dimensions') && !/\d\s*[×x]\s*\d/.test(bulletText('Dimensions'))) {
        warn('Dimensions bullet names no size (expected "<W>×<H>")');
    }

    // rule 1: sections and the Deliver line
    const sections = [];
    let deliverLine = -1, deliverText = '';
    for (let i = 1; i < L.length; i++) {
        if (L[i].startsWith('#### ')) {
            const m = SECTION_RE.exec(L[i]);
            sections.push({ name: m[1].trim(), line: i });
        } else if (deliverLine < 0) {
            const d = DELIVER_RE.exec(L[i].trim());
            if (d) { deliverLine = i; deliverText = d[1]; }
        }
    }
    const secSeen = new Set();
    for (const s of sections) {
        if (!SECTIONS.includes(s.name)) fail(`unknown section "#### ${s.name}"`);
        else if (secSeen.has(s.name)) fail(`section "${s.name}" appears twice`);
        else secSeen.add(s.name);
    }
    for (const want of SECTIONS) if (!secSeen.has(want)) fail(`missing section "#### ${want}:"`);
    const secOrder = sections.map(s => s.name).filter(n => SECTIONS.includes(n));
    if (new Set(secOrder).size === secOrder.length && secOrder.join('|') !== SECTIONS.filter(n => secSeen.has(n)).join('|')) {
        fail(`sections out of order: ${secOrder.join(' / ')} (want ${SECTIONS.join(' / ')})`);
    }
    sections.forEach((s, k) => {
        const end = k + 1 < sections.length ? sections[k + 1].line : (deliverLine > s.line ? deliverLine : L.length);
        const body = L.slice(s.line + 1, end).filter(l => l.trim());
        if (!body.length) fail(`section "${s.name}" is empty`);
    });
    if (deliverLine < 0) fail('missing "Deliver:" line');
    else {
        const lastSection = sections.length ? sections[sections.length - 1].line : 0;
        if (deliverLine < lastSection) fail(`"Deliver:" line (line ${brief.startLine + deliverLine}) comes before the last section`);
        if (!/art\/masters\//.test(deliverText)) warn('"Deliver:" line names no art/masters/ file (say which brief owns it if none is due)');
    }

    // rule 3: the brief id
    const { ids } = ctx.catalog;
    if (brief.headingOk) {
        if (!ids.has(brief.id) && !ID_PREFIXES.some(p => brief.id.startsWith(p))) {
            fail(`id "${brief.id}" is not in the catalog (objects, items.types, wildlife.species, people, groundKinds, water.surface) and has no ${ID_PREFIXES.join('/')} prefix`);
        }
    }

    // rule 4: the request row
    if (brief.ar && !ctx.requests.has(brief.ar)) warn(`${brief.ar} has no "| ${brief.ar} |" row in docs/ASSET_REQUESTS.md`);

    const text = L.join('\n');

    // rule 2 and 6: palette pairs
    const indices = new Set();
    for (const m of text.matchAll(PAIR_RE)) {
        const hex = m[2].toUpperCase();
        if (hex === MAGENTA) continue;
        if (m[1] === undefined) {
            const at = ctx.palette.indexOf(hex);
            warn(`\`#${hex}\` has no palette index (${at >= 0 ? `it is index ${at}: write "${at} \`#${hex}\`"` : `not in ${PALETTE_PATH_TEXT}; fine only when it quotes an engine tint, not a colour to paint with`})`);
            continue;
        }
        const idx = parseInt(m[1], 10);
        indices.add(idx);
        if (idx > 255) { fail(`palette index ${idx} is outside 0–255 (written as \`#${hex}\`)`); continue; }
        if (ctx.palette[idx] !== hex) fail(`palette index ${idx} is \`#${ctx.palette[idx]}\` in ${PALETTE_PATH_TEXT}, brief says \`#${hex}\``);
    }
    if (indices.size > COLOUR_LIMIT) warn(`${indices.size} distinct palette indices (aim for ${COLOUR_LIMIT} or fewer per asset)`);

    // rule 3: backticked catalog-looking ids
    const unknownSeen = new Set();
    for (const m of text.matchAll(BACKTICK_RE)) {
        const tok = m[1].trim();
        if (!ID_TOKEN_RE.test(tok) || tok === brief.id || unknownSeen.has(tok)) continue;
        if (!isKnownToken(tok, ctx, briefIds)) {
            unknownSeen.add(tok);
            warn(`unknown catalog-looking id \`${tok}\` (not a catalog id, a ${ID_PREFIXES.join('/')} id, or <id>_${STATE_SUFFIXES.join('/_')})`);
        }
    }

    // rule 5: banned words; Ultima VII / U7 only on the Reference and Projection bullets
    L.forEach((raw, i) => {
        const line = raw.split(PALETTE_PATH_TEXT).join(' ');
        const n = brief.startLine + i;
        for (const b of ctx.banned) if (b.re.test(line)) fail(`banned word "${b.word}" (line ${n})`);
        const bm = BULLET_RE.exec(raw);
        const allowed = bm && REFERENCE_ONLY_BULLETS.includes(bm[1].trim());
        if (!allowed && REFERENCE_ONLY_RE.test(line)) {
            fail(`"${REFERENCE_ONLY_RE.exec(line)[0]}" outside the Reference/Projection bullets (line ${n}); the descriptive text names no source game`);
        }
    });

    return out;
}

// ---------------------------------------------------------------- running

function defaultFiles() {
    if (!fs.existsSync(BRIEFS_DIR)) return [];
    return fs.readdirSync(BRIEFS_DIR).filter(f => /^SEG-.*\.md$/i.test(f)).sort()
        .map(f => path.join(BRIEFS_DIR, f));
}

// Checks the files; returns { problems: [{level, file, id, msg}], perFile: [{file, briefs, fails, warns}],
// briefIds: Map id -> file, briefs, fails, warns }.
function run(files, ctx, opts = {}) {
    const problems = [], perFile = [], briefIds = new Map(), parsed = [];
    for (const file of files) {
        const rel = path.relative(ROOT, file);
        const label = rel && !rel.startsWith('..') ? rel.split(path.sep).join('/') : file;
        let seg;
        try { seg = parseSegment(readText(file)); }
        catch (e) {
            problems.push({ level: 'FAIL', file: label, id: '(file)', msg: `cannot read: ${e.message}` });
            perFile.push({ file: label, briefs: 0, fails: 1, warns: 0 });
            continue;
        }
        for (const b of seg.briefs) if (b.headingOk && !briefIds.has(b.id)) briefIds.set(b.id, label);
        parsed.push({ file: label, seg });
    }
    const dupes = new Map();
    for (const { file, seg } of parsed) {
        const stat = { file, briefs: seg.briefs.length, fails: 0, warns: 0 };
        for (const ch of seg.prose) {
            ch.lines.forEach((raw, i) => {
                const line = raw.split(PALETTE_PATH_TEXT).join(' ');
                for (const b of ctx.banned) if (b.re.test(line)) {
                    problems.push({ level: 'WARN', file, id: '(prose)', msg: `banned word "${b.word}" outside a brief (line ${ch.startLine + i})` });
                    stat.warns++;
                }
            });
        }
        for (const b of seg.briefs) {
            const found = checkBrief(b, ctx, briefIds);
            if (b.headingOk) {
                const key = b.id;
                if (dupes.has(key)) found.push({ level: 'WARN', msg: `duplicate brief id (also in ${dupes.get(key)})` });
                else dupes.set(key, `${file} line ${b.startLine}`);
            }
            for (const p of found) {
                problems.push({ level: p.level, file, id: b.id, msg: p.msg });
                if (p.level === 'FAIL') stat.fails++; else stat.warns++;
            }
            if (opts.verbose && !found.length) problems.push({ level: 'PASS', file, id: b.id, msg: `${b.name} (${b.ar})` });
        }
        perFile.push(stat);
    }
    let coverage = null;
    if (opts.coverage) {
        const missing = [];
        for (const [id, set] of ctx.catalog.ids) if (!briefIds.has(id)) missing.push({ id, set });
        for (const m of missing) problems.push({ level: 'FAIL', file: '(coverage)', id: m.id, msg: `no brief in any segment file (${m.set})` });
        coverage = { total: ctx.catalog.ids.size, covered: ctx.catalog.ids.size - missing.length, missing };
    }
    const briefs = perFile.reduce((a, s) => a + s.briefs, 0);
    const fails = problems.filter(p => p.level === 'FAIL').length;
    const warns = problems.filter(p => p.level === 'WARN').length;
    return { problems, perFile, briefIds, briefs, fails, warns, coverage };
}

function printIds(ctx) {
    for (const [set, list] of Object.entries(ctx.catalog.sets)) console.log(`${set} (${list.length}): ${list.join(' ')}`);
    console.log(`plus any id starting with ${ID_PREFIXES.join(' / ')} (UI, equipment, faces, markers)`);
    console.log(`request rows in docs/ASSET_REQUESTS.md (${ctx.requests.size}): ${[...ctx.requests].join(' ')}`);
}

function main() {
    let opts;
    try { opts = parseArgs(process.argv.slice(2)); }
    catch (e) { console.error(e.message); console.error(usage()); return 2; }
    if (opts.help) { console.log(usage()); return 0; }
    if (opts.selftest) return selftest();
    const ctx = loadContext();
    if (opts.ids) { printIds(ctx); return 0; }
    const files = opts.files.length ? opts.files.map(f => path.resolve(f)) : defaultFiles();
    if (!files.length) {
        console.error(`no segment files: nothing given and no ${path.relative(ROOT, BRIEFS_DIR)}/SEG-*.md exists`);
        console.error(usage());
        return 2;
    }
    const r = run(files, ctx, opts);
    for (const p of r.problems) console.log(`${p.level} ${p.file} ${p.id}: ${p.msg}`);
    if (opts.summary) {
        console.log('| Segment | Briefs | Fails | Warns |');
        console.log('|---|---|---|---|');
        for (const s of r.perFile) console.log(`| ${s.file} | ${s.briefs} | ${s.fails} | ${s.warns} |`);
    }
    if (r.coverage) console.log(`COVERAGE ${r.coverage.covered}/${r.coverage.total} catalog ids have a brief`);
    console.log(`RESULT ${r.fails ? 'FAIL' : 'PASS'} ${r.briefs} briefs, ${r.fails} fails, ${r.warns} warns`);
    return r.fails ? 1 : 0;
}

// ---------------------------------------------------------------- selftest

// The exemplar brief (the standard every brief must meet), line by line.
const EXEMPLAR = [
    '### oak — Oak (AR-021)',
    '- **Category**: Flora',
    '- **Dimensions**: fits inside one 48×48 screen-pixel square at native resolution (1 art pixel = 1 screen pixel at zoom 1); the drawn shape is 44 px wide and 46 px tall',
    '- **Anchor**: bottom-centre of the cell `[24, 47]` (the engine draws every sprite with its anchor at the cell\'s bottom centre)',
    '- **Projection**: U7 2.5D oblique: height leans up and to the left at 45° (1 px up and 1 px left per unit of height); the top, south and east faces are visible',
    '- **Reference**: `art/u7_reference_squares/u7_oak_48.png` (SHAPES.VGA shape 181 shrunk to 0.67; a reference only, nothing copied ships)',
    '- **Palette Ramps**: Leaf 200 `#86D200` (sunlit crown), 241 `#45B645`, 242 `#189218`, 243 `#006D00`, 70 `#005100` (under-canopy); Bark 141 `#7D4D18`, 143 `#5D350C`, 145 `#3D240C`; Silhouette 147 `#201408`; background `#FF00FF`.',
    '',
    '#### Primary State Visual Description:',
    'The root flare sits in the bottom-right quarter of the square: a 10-px-wide base on rows 40–47, columns 30–40, in 145 with a 147 contact line on row 47. From it the trunk (6 px wide, 141 on its left strip, 143 in the middle, 145 on the right) climbs 14 px while sliding 14 px to the left, reaching the canopy\'s underside at row 26, columns 16–22. The canopy is an irregular mass of leaf clusters about 44 px wide (columns 2–45) and 28 px tall (rows 0–27), its upper-left third in 200 and 241 with 1-px micro-dither between the two, the centre in 242, the lower-right and the underside in 243 with 70 in the deepest pockets; three or four gaps of background show branch fragments in 143. The outline is 147 only where a cluster meets the background on its lower and right sides; the sunlit upper-left edge has no outline. Nothing touches columns 46–47 or row 48; the shape is contained.',
    '',
    '#### Interaction / Transformed State Description:',
    '`stump` (after "chop", yields 3 logs; the stump itself yields 1 more): its own brief and file. The oak has no other engine state.',
    '',
    '#### Readability Check:',
    'At zoom ⅓ the oak is the broadest, darkest-crowned tree with a visible bare trunk leaning up-left, unlike the pine\'s narrow tiered crown and the fruit tree\'s paler crown with red dots.',
    '',
    'Deliver: art/masters/oak.png (48×48, magenta background) + art/masters/oak.json (frameWidth 48, frameHeight 48, anchor [24, 47], facings ["S"], animations { "stand": [0] }).',
];

function selftest() {
    const ctx = loadContext();
    const dir = path.join(os.tmpdir(), 'uf_check_briefs_selftest');
    fs.mkdirSync(dir, { recursive: true });
    const ex = () => EXEMPLAR.slice();
    const lineOf = (lines, start) => lines.findIndex(l => l.startsWith(start));
    const replace = (lines, start, repl) => { const i = lineOf(lines, start); lines[i] = repl; return lines; };
    const remove = (lines, start) => { const i = lineOf(lines, start); lines.splice(i, 1); return lines; };
    const insertAfter = (lines, start, add) => { const i = lineOf(lines, start); lines.splice(i + 1, 0, add); return lines; };
    const manyRamps = Array.from({ length: 33 }, (_, k) => `${100 + k} \`#${ctx.palette[100 + k]}\``).join(', ');

    // Each case: the lines to write, the expected fails/warns, and message substrings that must appear.
    const cases = [
        { name: 'clean', lines: ex(), fails: 0, warns: 0 },
        { name: 'heading_dash', lines: replace(ex(), '### oak', '### oak - Oak (AR-021)'), fails: 1, warns: 0, expect: ['heading must be'] },
        { name: 'heading_no_ar', lines: replace(ex(), '### oak', '### oak — Oak'), fails: 1, warns: 0, expect: ['heading must be'] },
        { name: 'bullet_order', lines: (() => { const l = ex(); const a = lineOf(l, '- **Dimensions**'), b = lineOf(l, '- **Anchor**'); [l[a], l[b]] = [l[b], l[a]]; return l; })(), fails: 1, warns: 0, expect: ['out of order'] },
        { name: 'bullet_missing', lines: remove(ex(), '- **Reference**'), fails: 1, warns: 0, expect: ['missing header bullet "Reference"'] },
        { name: 'bullet_unknown', lines: insertAfter(ex(), '- **Category**', '- **Mood**: calm'), fails: 1, warns: 0, expect: ['unknown header bullet "Mood"'] },
        { name: 'bullet_empty', lines: replace(ex(), '- **Category**', '- **Category**:'), fails: 1, warns: 0, expect: ['"Category" is empty'] },
        { name: 'bullet_twice', lines: insertAfter(ex(), '- **Category**', '- **Category**: Flora'), fails: 1, warns: 0, expect: ['appears twice'] },
        { name: 'sheet_bullet_ok', lines: insertAfter(ex(), '- **Palette Ramps**', '- **Sheet**: AR-600 layout; this brief describes the south stand frame'), fails: 0, warns: 0 },
        { name: 'anchor_warn', lines: replace(ex(), '- **Anchor**', '- **Anchor**: bottom-right `[47, 47]`'), fails: 0, warns: 1, expect: ['Anchor bullet'] },
        { name: 'dimensions_warn', lines: replace(ex(), '- **Dimensions**', '- **Dimensions**: one square'), fails: 0, warns: 1, expect: ['Dimensions bullet'] },
        { name: 'section_missing', lines: (() => { const l = ex(); const i = lineOf(l, '#### Readability'); l.splice(i, 2); return l; })(), fails: 1, warns: 0, expect: ['missing section "#### Readability Check:"'] },
        { name: 'section_order', lines: (() => { const l = ex(); const a = lineOf(l, '#### Primary'), b = lineOf(l, '#### Interaction'); const primary = l.splice(a, 3); const c = lineOf(l, '#### Readability'); l.splice(c, 0, ...primary); return l; })(), fails: 1, warns: 0, expect: ['sections out of order'] },
        { name: 'section_empty', lines: (() => { const l = ex(); l.splice(lineOf(l, '#### Readability') + 1, 1); return l; })(), fails: 1, warns: 0, expect: ['"Readability Check" is empty'] },
        { name: 'section_unknown', lines: insertAfter(ex(), 'At zoom', '#### Notes:\nsome notes'), fails: 1, warns: 0, expect: ['unknown section "#### Notes"'] },
        { name: 'deliver_missing', lines: remove(ex(), 'Deliver:'), fails: 1, warns: 0, expect: ['missing "Deliver:" line'] },
        { name: 'deliver_early', lines: (() => { const l = ex(); const d = l.splice(lineOf(l, 'Deliver:'), 1)[0]; l.splice(lineOf(l, '#### Primary'), 0, d); return l; })(), fails: 1, warns: 0, expect: ['before the last section'] },
        { name: 'deliver_path', lines: replace(ex(), 'Deliver:', 'Deliver: nothing separate; the `stump` brief owns the file'), fails: 0, warns: 1, expect: ['names no art/masters/'] },
        { name: 'palette_mismatch', lines: replace(ex(), '- **Palette Ramps**', '- **Palette Ramps**: Leaf 200 `#86D201`, 241 `#45B645`; background `#FF00FF`.'), fails: 1, warns: 0, expect: ['palette index 200 is `#86D200`', 'brief says `#86D201`'] },
        { name: 'palette_bare_pair', lines: replace(ex(), '- **Palette Ramps**', '- **Palette Ramps**: Leaf 200 #86D200, 241 #45B646.'), fails: 1, warns: 0, expect: ['palette index 241 is `#45B645`'] },
        { name: 'palette_range', lines: replace(ex(), '- **Palette Ramps**', '- **Palette Ramps**: Leaf 300 `#FFFFFF`.'), fails: 1, warns: 0, expect: ['outside 0–255'] },
        { name: 'hex_no_index', lines: replace(ex(), '- **Palette Ramps**', '- **Palette Ramps**: Leaf `#45B645`; background `#FF00FF`.'), fails: 0, warns: 1, expect: ['`#45B645` has no palette index'] },
        { name: 'colours_many', lines: replace(ex(), '- **Palette Ramps**', '- **Palette Ramps**: ' + manyRamps + '.'), fails: 0, warns: 1, expect: ['33 distinct palette indices'] },
        { name: 'id_unknown', lines: replace(ex(), '### oak', '### dragon_egg — Dragon egg (AR-021)'), fails: 1, warns: 0, expect: ['id "dragon_egg" is not in the catalog'] },
        { name: 'id_prefix_ok', lines: replace(ex(), '### oak', '### ui_oak_marker — Oak marker (AR-021)'), fails: 0, warns: 0 },
        { name: 'id_items_ok', lines: replace(ex(), '### oak', '### log — Log (AR-021)'), fails: 0, warns: 0 },
        { name: 'id_water_ok', lines: replace(ex(), '### oak', '### fresh — Fresh water (AR-101)'), fails: 0, warns: 0 },
        { name: 'backtick_unknown', lines: insertAfter(ex(), '#### Interaction', 'Turns into `oak_glowing` at night.'), fails: 0, warns: 1, expect: ['unknown catalog-looking id `oak_glowing`'] },
        { name: 'backtick_suffix_ok', lines: insertAfter(ex(), '#### Interaction', 'Compare `campfire_lit`, `wall_wood_unbuilt`, `berry_bush_bare` and the `stand` frame.'), fails: 0, warns: 0 },
        { name: 'ar_missing', lines: replace(ex(), '### oak', '### oak — Oak (AR-999)'), fails: 0, warns: 1, expect: ['AR-999 has no "| AR-999 |" row'] },
        { name: 'banned_word', lines: insertAfter(ex(), '#### Primary', 'A tree as seen in Britannia.'), fails: 1, warns: 0, expect: ['banned word "Britannia"'] },
        { name: 'banned_phrase', lines: insertAfter(ex(), '#### Primary', 'The Lord British oak, the Avatars and a mind flayer.'), fails: 3, warns: 0, expect: ['banned word "Lord British"', 'banned word "Avatar"', 'banned word "mind flayer"'] },
        { name: 'banned_df', lines: replace(ex(), '### oak', '### oak — Oak of Dwarf Fortress (AR-021)'), fails: 1, warns: 0, expect: ['banned word "Dwarf Fortress"'] },
        { name: 'u7_outside', lines: insertAfter(ex(), '#### Readability', 'Like the U7 oak.'), fails: 1, warns: 0, expect: ['"U7" outside the Reference/Projection bullets'] },
        { name: 'ultima_outside', lines: insertAfter(ex(), '#### Primary', 'Drawn as in Ultima VII.'), fails: 1, warns: 0, expect: ['"Ultima VII" outside'] },
        { name: 'u7_standin_name', lines: insertAfter(ex(), '#### Interaction', 'Today the stand-in is `!$U7_TimberOak.png`.'), fails: 1, warns: 0, expect: ['"U7" outside'] },
        { name: 'palette_path_ok', lines: insertAfter(ex(), '#### Primary', 'Every index is from art/palette/uf.hex.'), fails: 0, warns: 0 },
        { name: 'duplicate_id', lines: ex().concat([''], ex()), fails: 0, warns: 1, briefs: 2, expect: ['duplicate brief id'] },
        { name: 'prose_warn', lines: ['# Segment 1', '', 'These briefs follow the reference squares (U7 stand-ins) and never name Britannia.', ''].concat(ex()), fails: 0, warns: 1, briefs: 1, expect: ['banned word "Britannia" outside a brief'] },
        { name: 'two_briefs', lines: ex().concat([''], replace(ex(), '### oak', '### pine — Pine (AR-021)').map(l => l.replace('art/masters/oak', 'art/masters/pine'))), fails: 0, warns: 0, briefs: 2 },
    ];

    let total = 0, failed = 0;
    const expect = (name, ok, want, got) => {
        total++;
        if (!ok) failed++;
        console.log(`${ok ? 'PASS' : 'FAIL'} selftest.${name}: expected ${want}, got ${got}`);
    };
    const written = [];
    for (const c of cases) {
        const file = path.join(dir, `SEG-${c.name}.md`);
        fs.writeFileSync(file, c.lines.join('\n') + '\n', 'utf8');
        written.push(file);
        const r = run([file], ctx, {});
        const msgs = r.problems.map(p => `${p.level} ${p.msg}`);
        const briefsWant = c.briefs === undefined ? 1 : c.briefs;
        expect(`${c.name}.counts`, r.briefs === briefsWant && r.fails === c.fails && r.warns === c.warns,
            `${briefsWant} briefs, ${c.fails} fails, ${c.warns} warns`,
            `${r.briefs} briefs, ${r.fails} fails, ${r.warns} warns` + (msgs.length ? ` [${msgs.join(' | ')}]` : ''));
        for (const s of c.expect || []) {
            expect(`${c.name}.message`, msgs.some(m => m.includes(s)), `a message containing "${s}"`, msgs.length ? msgs.join(' | ') : 'no messages');
        }
    }
    // rule 7: coverage over the clean file alone must list every other catalog id and not oak
    const cov = run([path.join(dir, 'SEG-clean.md')], ctx, { coverage: true });
    const missingIds = cov.coverage.missing.map(m => m.id);
    expect('coverage.missing', cov.fails === ctx.catalog.ids.size - 1 && missingIds.includes('pine') && !missingIds.includes('oak'),
        `${ctx.catalog.ids.size - 1} fails, pine missing, oak covered`,
        `${cov.fails} fails, pine ${missingIds.includes('pine') ? 'missing' : 'covered'}, oak ${missingIds.includes('oak') ? 'missing' : 'covered'}`);
    // the RESULT line and exit code of the command itself on the clean and the mismatch case
    const { spawnSync } = require('child_process');
    const cli = (args) => spawnSync(process.execPath, [__filename, ...args], { encoding: 'utf8' });
    const good = cli([path.join(dir, 'SEG-clean.md'), '--summary']);
    expect('cli.clean', good.status === 0 && /^RESULT PASS 1 briefs, 0 fails, 0 warns$/m.test(good.stdout) && /^\| \S*SEG-clean\.md \| 1 \| 0 \| 0 \|$/m.test(good.stdout),
        'exit 0, "RESULT PASS 1 briefs, 0 fails, 0 warns", summary row', `exit ${good.status}, ${JSON.stringify(good.stdout.trim().split('\n').slice(-1)[0])}`);
    const bad = cli([path.join(dir, 'SEG-palette_mismatch.md')]);
    expect('cli.mismatch', bad.status === 1 && /^RESULT FAIL 1 briefs, 1 fails, 0 warns$/m.test(bad.stdout),
        'exit 1, "RESULT FAIL 1 briefs, 1 fails, 0 warns"', `exit ${bad.status}, ${JSON.stringify(bad.stdout.trim().split('\n').slice(-1)[0])}`);
    const none = cli([path.join(dir, 'no_such_file.md')]);
    expect('cli.unreadable', none.status === 1 && /^FAIL .*no_such_file\.md \(file\): cannot read/m.test(none.stdout),
        'exit 1 and a FAIL (file) line', `exit ${none.status}, ${JSON.stringify(none.stdout.trim().split('\n')[0])}`);

    console.log(`RESULT ${failed ? 'FAIL' : 'PASS'} ${total - failed}/${total} expectations (check_briefs selftest, files in ${dir})`);
    return failed ? 1 : 0;
}

module.exports = { run, checkBrief, parseSegment, loadContext, selftest, EXEMPLAR };

if (require.main === module) {
    process.exitCode = main();
}
