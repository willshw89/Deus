'use strict';
// tools/build_scale_lineup.js: the world-scale lineup (VISION V44, V2 / ART_STANDARD U2 and U3).
// Written 2026-09-19 by Claude Code. The decision it serves and the numbers it measures: docs/design/SCALE.md.
//
// Two questions, kept apart:
//   (a) WORLD SCALE: how many screen pixels a metre is at zoom 1 (so how tall a person is, how many 48 px
//       cells a deer, a horse, an oak, a boulder or a house covers). Open; this tool shows three candidates.
//   (b) PIXEL DENSITY: fixed by the user (2026-09-19): one art pixel = one screen pixel at zoom 1.
//
// Candidate A = the reference game's own scale at 1x (its library is coherent at that density).
// Candidates B and C = a person about 1 cell and about 1.5 cells tall. At the fixed density they need NEW art
// drawn at that size; here they are shown with the 1x shapes enlarged 2x and 3x by nearest neighbour under a
// visible caption, as placeholders, never as the look.
//
// Reads (read-only reference; nothing from it ships, AGENTS.md rule 8):
//   <u7>/SHAPES.VGA, <u7>/PALETTES.FLX (record 0, daylight), <u7>/TFA.DAT (footprint and height per shape)
//   game/img/characters/*.png + .json   (the stand-ins: exact 3x exports are used when one exists)
//   art/palette/uf.hex                   (grass colours)
//   scratch/u7_nature/shape_181.png      (an earlier decode by tools/extract_u7_nature_standins.js: decoder proof)
// Writes: <out>/scale_*.png and <out>/scale_measurements.json (default out: game/test_output, gitignored).
// The decoder below is the algorithm of decodeShape() in tools/generate_all_u7_assets.js and
// decodeShapeFrame() in tools/extract_u7_nature_standins.js. Those files write into the project when
// loaded, so they are not required here; the check decoder_matches_earlier_decode proves the two agree.
//
// Usage:
//   node tools/build_scale_lineup.js                 build every image, run the checks, print PASS/FAIL lines
//   node tools/build_scale_lineup.js --table         also print the measurement table (markdown)
//   node tools/build_scale_lineup.js --out <dir>     write somewhere else
//   node tools/build_scale_lineup.js --u7 <STATIC>   the reference game's STATIC folder
//   node tools/build_scale_lineup.js --survey 181,306,502 [--frames 0,16]   labelled contact sheet (identification)
//   node tools/build_scale_lineup.js --provoke <decoder|recovery|recovery_match|shapes|person|exact|integer|zoom2|caption|outputs>
//        sabotages one check on purpose to show it can fail (the images are still written).
// Exit code: 0 when every check passes, 1 on any FAIL, 2 on bad arguments or missing reference files.

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const { writePNG } = require('./png_util');
const { readPNG } = require('./png_read');

// ---------------------------------------------------------------- arguments
const argv = process.argv.slice(2);
function argVal(name, def) { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] ? argv[i + 1] : def; }
const OUT = path.resolve(argVal('--out', path.join(ROOT, 'game', 'test_output')));
const U7 = argVal('--u7', 'C:\\Program Files\\GOG Galaxy\\Games\\Ultima 7\\STATIC');
const PROVOKE = argVal('--provoke', null);
const PROVOKES = ['decoder', 'recovery', 'recovery_match', 'shapes', 'person', 'exact', 'integer', 'zoom2', 'caption', 'outputs'];
if (PROVOKE && !PROVOKES.includes(PROVOKE)) { console.error('unknown --provoke ' + PROVOKE + ' (one of ' + PROVOKES.join(', ') + ')'); process.exit(2); }
if (argv.includes('--help')) { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 36).join('\n')); process.exit(0); }

// ---------------------------------------------------------------- reference data
for (const f of ['SHAPES.VGA', 'PALETTES.FLX', 'TFA.DAT']) {
    if (!fs.existsSync(path.join(U7, f))) { console.error('missing ' + path.join(U7, f) + ' (pass --u7 <STATIC folder>)'); process.exit(2); }
}
const SHAPES = fs.readFileSync(path.join(U7, 'SHAPES.VGA'));
const PALBYTES = fs.readFileSync(path.join(U7, 'PALETTES.FLX'));
const TFA = fs.readFileSync(path.join(U7, 'TFA.DAT'));
const PAL = [];
for (let i = 0; i < 256; i++) {
    PAL.push([0, 1, 2].map(c => Math.min(255, Math.round(PALBYTES[256 + i * 3 + c] * 255 / 63.0))));
}
const UFHEX = fs.readFileSync(path.join(ROOT, 'art', 'palette', 'uf.hex'), 'utf8').split(/\r?\n/).filter(Boolean)
    .map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);

// Footprint in reference tiles (8 px each at 1x) and height in lifts (4 px up + 4 px left each), from TFA.DAT.
function tfaDims(shape) {
    const b0 = TFA[shape * 3], b2 = TFA[shape * 3 + 2];
    return { x: (b2 & 7) + 1, y: ((b2 >> 3) & 7) + 1, z: b0 >> 5 };
}

// One frame of one shape -> { w, h, rgba (Buffer w*h*4), xleft, yabove, frames }. Shapes >= 150 are RLE frames.
function decodeShape(shape, frame) {
    const off = SHAPES.readUInt32LE(128 + shape * 8);
    if (off === 0 || off >= SHAPES.length) return null;
    const frames = (SHAPES.readUInt32LE(off + 4) - 4) / 4;
    if (frame >= frames) return null;
    const ptr = off + SHAPES.readUInt32LE(off + 4 + frame * 4);
    const xright = SHAPES.readInt16LE(ptr), xleft = SHAPES.readInt16LE(ptr + 2);
    const yabove = SHAPES.readInt16LE(ptr + 4), ybelow = SHAPES.readInt16LE(ptr + 6);
    const w = xleft + xright + 1, h = yabove + ybelow + 1;
    if (w <= 0 || h <= 0 || w > 500 || h > 500) return null;
    const rgba = Buffer.alloc(w * h * 4, 0);
    const put = (x, y, ci) => {
        if (ci === 255 || x < 0 || x >= w || y < 0 || y >= h) return;
        const i = (y * w + x) * 4, c = PAL[ci];
        rgba[i] = c[0]; rgba[i + 1] = c[1]; rgba[i + 2] = c[2]; rgba[i + 3] = 255;
    };
    let cur = ptr + 8;
    while (cur < SHAPES.length - 1) {
        const scanlen = SHAPES.readUInt16LE(cur); cur += 2;
        if (scanlen === 0) break;
        const encoded = scanlen & 1, len = scanlen >> 1;
        const sx = SHAPES.readInt16LE(cur); cur += 2;
        const sy = SHAPES.readInt16LE(cur); cur += 2;
        const dy = yabove + sy, dx = xleft + sx;
        if (!encoded) {
            for (let i = 0; i < len; i++) put(dx + i, dy, SHAPES[cur++]);
        } else {
            let done = 0;
            while (done < len) {
                const b = SHAPES[cur++], n = b >> 1;
                if (b & 1) { const ci = SHAPES[cur++]; for (let k = 0; k < n; k++) put(dx + done + k, dy, ci); }
                else { for (let k = 0; k < n; k++) put(dx + done + k, dy, SHAPES[cur++]); }
                done += n;
            }
        }
    }
    return { w, h, rgba, xleft, yabove, frames };
}

function opaqueBox(img) {
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
        if (img.rgba[(y * img.w + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
function transpose(img) {
    const o = { w: img.h, h: img.w, rgba: Buffer.alloc(img.rgba.length), xleft: img.yabove, yabove: img.xleft, frames: img.frames };
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) img.rgba.copy(o.rgba, (x * o.w + y) * 4, (y * img.w + x) * 4, (y * img.w + x) * 4 + 4);
    return o;
}
function sameOpaque(a, b) { // compare two images by their opaque pixels (cropped to the opaque box)
    const ba = opaqueBox(a), bb = opaqueBox(b);
    if (!ba || !bb || ba.w !== bb.w || ba.h !== bb.h) return false;
    for (let y = 0; y < ba.h; y++) for (let x = 0; x < ba.w; x++) {
        const i = ((ba.y + y) * a.w + ba.x + x) * 4, j = ((bb.y + y) * b.w + bb.x + x) * 4;
        if (a.rgba[i + 3] !== b.rgba[j + 3]) return false;
        if (a.rgba[i + 3] && (a.rgba[i] !== b.rgba[j] || a.rgba[i + 1] !== b.rgba[j + 1] || a.rgba[i + 2] !== b.rgba[j + 2])) return false;
    }
    return true;
}

// A recovered 1x frame against a decoded frame, allowing the sheet's frame to have clipped the shape:
// every recovered pixel inside the frame equals the decode at one alignment of the two opaque boxes, and every
// opaque decoded pixel is either there or falls outside the frame. Returns { clipped, total } or null.
// (Recovered column/row 0 is the partial block before the frame's first pixel, so the frame starts at 1.)
function matchClipped(rec, dec) {
    const br = opaqueBox(rec), bd = opaqueBox(dec);
    if (!br || !bd) return null;
    const at = (img, x, y) => (x < 0 || y < 0 || x >= img.w || y >= img.h) ? null : img.rgba.slice((y * img.w + x) * 4, (y * img.w + x) * 4 + 4);
    const same = (a, b) => { const ao = a && a[3], bo = b && b[3]; if (!ao && !bo) return true; if (!ao || !bo) return false; return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]; };
    const aligns = [[br.x + br.w - (bd.x + bd.w), br.y + br.h - (bd.y + bd.h)], [br.x - bd.x, br.y + br.h - (bd.y + bd.h)],
        [br.x + br.w - (bd.x + bd.w), br.y - bd.y], [br.x - bd.x, br.y - bd.y]];
    for (const [dx, dy] of aligns) {
        let ok = true;
        for (let j = 1; j < rec.h && ok; j++) for (let i = 1; i < rec.w; i++) if (!same(at(rec, i, j), at(dec, i - dx, j - dy))) { ok = false; break; }
        if (!ok) continue;
        let clipped = 0, total = 0;
        for (let y = 0; y < dec.h && ok; y++) for (let x = 0; x < dec.w; x++) {
            const p = at(dec, x, y); if (!p[3]) continue; total++;
            const i = x + dx, j = y + dy;
            if (i < 1 || j < 1 || i >= rec.w || j >= rec.h) clipped++;
        }
        return { clipped, total };
    }
    return null;
}

// ---------------------------------------------------------------- checks bookkeeping
const results = [];
function check(name, pass, detail) {
    results.push({ name, pass: !!pass, detail });
    console.log(`${pass ? 'PASS' : 'FAIL'} scale.${name}: ${detail}`);
}
function info(line) { console.log('INFO ' + line); }

// ---------------------------------------------------------------- canvas
class Canvas {
    constructor(w, h, rgb) {
        this.w = w; this.h = h; this.d = Buffer.alloc(w * h * 4);
        if (rgb) this.fill(0, 0, w, h, rgb);
    }
    fill(x, y, w, h, rgb, a = 1) {
        for (let j = Math.max(0, y); j < Math.min(this.h, y + h); j++) for (let i = Math.max(0, x); i < Math.min(this.w, x + w); i++) this.blend(i, j, rgb, a);
    }
    blend(x, y, rgb, a = 1) {
        x |= 0; y |= 0;
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
        const i = (y * this.w + x) * 4, d = this.d;
        if (a >= 1) { d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255; return; }
        d[i] = Math.round(d[i] * (1 - a) + rgb[0] * a); d[i + 1] = Math.round(d[i + 1] * (1 - a) + rgb[1] * a);
        d[i + 2] = Math.round(d[i + 2] * (1 - a) + rgb[2] * a); d[i + 3] = 255;
    }
    get(x, y) { const i = (y * this.w + x) * 4; return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]]; }
    // Blit a sprite (rgba w*h) enlarged k times by nearest neighbour with its (0,0) at (x, y).
    blit(img, x, y, k = 1) {
        for (let sy = 0; sy < img.h; sy++) for (let sx = 0; sx < img.w; sx++) {
            const i = (sy * img.w + sx) * 4;
            if (!img.rgba[i + 3]) continue;
            const c = [img.rgba[i], img.rgba[i + 1], img.rgba[i + 2]];
            for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) this.blend(x + sx * k + dx, y + sy * k + dy, c);
        }
    }
    rect(x, y, w, h, rgb, a = 1, dash = 0) {
        for (let i = 0; i < w; i++) { if (!dash || ((i / dash) | 0) % 2 === 0) { this.blend(x + i, y, rgb, a); this.blend(x + i, y + h - 1, rgb, a); } }
        for (let j = 1; j < h - 1; j++) { if (!dash || ((j / dash) | 0) % 2 === 0) { this.blend(x, y + j, rgb, a); this.blend(x + w - 1, y + j, rgb, a); } }
    }
    hline(x0, x1, y, rgb, a = 1, dash = 0) { for (let x = x0; x <= x1; x++) if (!dash || (((x - x0) / dash) | 0) % 2 === 0) this.blend(x, y, rgb, a); }
    vline(x, y0, y1, rgb, a = 1) { for (let y = y0; y <= y1; y++) this.blend(x, y, rgb, a); }
    save(file) { writePNG(file, this.w, this.h, this.d); }
}

// ---------------------------------------------------------------- 5x7 font (code-drawn captions)
const GLYPH_ROWS = {
    'A': ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    'B': ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
    'C': ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
    'D': ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
    'E': ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    'F': ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
    'G': ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
    'H': ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    'I': ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
    'J': ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
    'K': ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    'L': ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
    'M': ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
    'N': ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
    'O': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    'P': ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
    'Q': ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
    'R': ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    'S': ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
    'T': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    'U': ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    'V': ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
    'W': ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
    'X': ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
    'Y': ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
    'Z': ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
    '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
    '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
    '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
    '3': ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
    '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
    '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
    '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
    '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
    '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
    '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
    ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
    '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
    ',': ['.....', '.....', '.....', '.....', '.##..', '..#..', '.#...'],
    ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
    ';': ['.....', '.##..', '.##..', '.....', '.##..', '..#..', '.#...'],
    '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
    '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
    '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
    ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
    '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
    '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
    '%': ['##..#', '##..#', '...#.', '..#..', '.#...', '#..##', '#..##'],
    '*': ['.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '.....'],
    '~': ['.....', '.##.#', '#..#.', '.....', '.##.#', '#..#.', '.....'],
    "'": ['..#..', '..#..', '.....', '.....', '.....', '.....', '.....'],
    '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
    '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
    '[': ['.###.', '.#...', '.#...', '.#...', '.#...', '.#...', '.###.'],
    ']': ['.###.', '...#.', '...#.', '...#.', '...#.', '...#.', '.###.'],
    '>': ['.#...', '..#..', '...#.', '....#', '...#.', '..#..', '.#...'],
    '<': ['...#.', '..#..', '.#...', '#....', '.#...', '..#..', '...#.'],
    '_': ['.....', '.....', '.....', '.....', '.....', '.....', '#####'],
    '#': ['.#.#.', '.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.#.#.'],
};
// '*' is drawn as a small x (the times sign); '~' as the approximately-equal sign.
function glyph(ch) {
    if (ch === '×') ch = '*';
    if (ch === '≈') ch = '~';
    return (GLYPH_ROWS[ch.toUpperCase()] || GLYPH_ROWS['?']).join('');
}
function textWidth(s, scale = 1) { return s.length * 6 * scale - scale; }
function drawText(cv, s, x, y, rgb, scale = 1, outline = [16, 12, 8]) {
    const pts = [];
    for (let n = 0; n < s.length; n++) {
        const g = glyph(s[n]);
        for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r * 5 + c] === '#') pts.push([x + (n * 6 + c) * scale, y + r * scale]);
    }
    if (outline) for (const [px, py] of pts) for (let dy = -1; dy <= scale; dy++) for (let dx = -1; dx <= scale; dx++) cv.blend(px + dx, py + dy, outline);
    for (const [px, py] of pts) cv.fill(px, py, scale, scale, rgb);
}

// ---------------------------------------------------------------- seeded noise (no Math.random anywhere)
function hash32(...v) {
    let h = 0x811c9dc5;
    for (const n of v) { h ^= n | 0; h = Math.imul(h, 0x01000193); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; }
    return h >>> 0;
}
const SEED = 20260919;

// Code-drawn grass in the palette's olive greens with 1-px speckle (daylight).
// A calm, darker meadow (203 olive toward 70 deep green) so the sprites read against it.
const G = { base: [0, 1, 2].map(i => Math.round(UFHEX[203][i] * 0.7 + UFHEX[70][i] * 0.3)), dark: UFHEX[204], deep: UFHEX[70], lit: UFHEX[202], blade: UFHEX[243] };
function grassAt(wx, wy) { // world pixel at 1x density
    const h = hash32(SEED, wx, wy) % 1000;
    if (h < 90) return G.dark;
    if (h < 120) return G.lit;
    if (h < 135) return G.deep;
    if (h < 150) return G.blade;
    return G.base;
}
function mix(a, b, t) { return [0, 1, 2].map(i => Math.round(a[i] * (1 - t) + b[i] * t)); }

// ---------------------------------------------------------------- the lineup subjects
// shape / frame: in the reference data (read-only); name: generic (never a name from the reference game);
// standin: the image the catalog draws for it today (game/data/UF_WorldCatalog.json, 2026-09-19), checked for an exact 3x export;
// kind: 'unit' (occupies one cell for movement, V44) or 'object' (blocks its footprint cells).
const SUBJECTS = [
    { key: 'man', name: 'MAN', shape: 265, frame: 16, kind: 'unit', standin: '$U7_Townsman' },
    { key: 'woman', name: 'WOMAN', shape: 452, frame: 16, kind: 'unit', standin: '$U7_Eve_T0' },
    { key: 'child', name: 'CHILD', shape: 471, frame: 16, kind: 'unit' },
    { key: 'guard', name: 'GUARD', shape: 720, frame: 16, kind: 'unit', standin: '$U7_Guard' },
    { key: 'hare', name: 'HARE', shape: 811, frame: 16, kind: 'unit', standin: '$U7_Hare' },
    { key: 'fowl', name: 'FOWL', shape: 498, frame: 16, kind: 'unit', standin: '$U7_Chicken' },
    { key: 'deer', name: 'DEER', shape: 502, frame: 16, kind: 'unit', standin: '$U7_Deer' },
    { key: 'wolf', name: 'WOLF', shape: 537, frame: 16, kind: 'unit', standin: '$U7_Wolf' },
    { key: 'sheep', name: 'SHEEP', shape: 970, frame: 16, kind: 'unit', standin: '$U7_Sheep' },
    { key: 'horse', name: 'HORSE', shape: 727, frame: 16, kind: 'unit', standin: '$U7_Horse' },
    { key: 'ox', name: 'OX', shape: 500, frame: 16, kind: 'unit', standin: '$U7_Ox' },
    { key: 'troll', name: 'TROLL', shape: 533, frame: 16, kind: 'unit', standin: '$U7_Troll' },
    { key: 'giant', name: 'GIANT', shape: 501, frame: 16, kind: 'unit' },
    { key: 'oak', name: 'OAK', shape: 181, frame: 1, kind: 'object', standin: '!$TimberOak' },
    { key: 'pine', name: 'PINE', shape: 306, frame: 1, kind: 'object', standin: '!$PineTree' },
    { key: 'fruit', name: 'FRUIT TREE', shape: 453, frame: 4, kind: 'object', standin: '!$FruitTree' },
    { key: 'bush', name: 'BUSH', shape: 672, frame: 0, kind: 'object', standin: '!$UF_BerryBush' },
    { key: 'stump', name: 'STUMP', shape: 313, frame: 1, kind: 'object', standin: '!$UF_Stump' },
    { key: 'boulder', name: 'BOULDER', shape: 342, frame: 1, kind: 'object', standin: '!$GraniteBoulder' },
    { key: 'campfire', name: 'CAMPFIRE', shape: 825, frame: 1, kind: 'object', standin: '!$UF_Campfire' },
    { key: 'bed', name: 'BED', shape: 696, frame: 0, kind: 'object', standin: '!$UF_Straw_Bed' },
    { key: 'chest', name: 'CHEST', shape: 800, frame: 0, kind: 'object' },
    { key: 'barrel', name: 'BARREL', shape: 819, frame: 0, kind: 'object' },
    { key: 'wall', name: 'WALL', shape: 869, frame: 0, kind: 'object', standin: '!$WallStone_Set' },
    { key: 'door', name: 'DOOR', shape: 270, frame: 0, kind: 'object', standin: '!Door1' },
];
// Extra pieces the scene needs (the house's side walls); not in the lineup.
const EXTRA = [
    { key: 'wall_ns', name: 'WALL N-S', shape: 871, frame: 0, kind: 'object' },
];
const CELL = 48;
const TILE = 8;          // one reference ground tile at 1x
const LIFT = 4;          // one reference height unit: 4 px up and 4 px left at 1x
const PERSON_M = 1.75;   // the height a person stands for (m)
const TILE_M = 0.5;      // a reference ground tile is about half a metre (bed 5 tiles ~ 2 m, barrel 1 tile ~ 0.6 m)
const CANDIDATES = [
    { id: 'A', k: 1, title: 'CANDIDATE A: THE REFERENCE GAME\'S OWN SCALE AT 1X (THE FIXED DENSITY)', placeholder: false },
    { id: 'B', k: 2, title: 'CANDIDATE B: PERSON ABOUT 1 CELL TALL', placeholder: true },
    { id: 'C', k: 3, title: 'CANDIDATE C: PERSON ABOUT 1.5 CELLS TALL', placeholder: true },
];
const CAPTION = 'PLACEHOLDER ENLARGEMENT: REAL ART WOULD BE REDRAWN AT FULL DETAIL';
const CAPTION_BG = [168, 24, 24];

// ---------------------------------------------------------------- stand-ins: exact 3x or not
function sidecarOf(name) { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'game', 'img', 'characters', name + '.json'), 'utf8')); } catch (e) { return null; } }
// Returns { exact, bad, blocks, ox, oy, frame1x } for the frame at column 1 row 0 (stand, first facing row).
function recover3x(name, sabotage) {
    const file = path.join(ROOT, 'game', 'img', 'characters', name + '.png');
    if (!fs.existsSync(file)) return null;
    const png = readPNG(file);
    const sc = sidecarOf(name) || {};
    const single = name.includes('$'); // RMMZ: a $ sheet is one character (3x4 frames), otherwise 4x2 characters (12x8)
    const fw = sc.frameWidth || png.width / (single ? 3 : 12), fh = sc.frameHeight || png.height / (single ? 4 : 8);
    const x0 = fw, y0 = 0;
    const data = Buffer.from(png.data);
    if (sabotage) { // flip one opaque pixel's red channel inside the frame
        outer: for (let y = y0; y < y0 + fh; y++) for (let x = x0; x < x0 + fw; x++) {
            const i = (y * png.width + x) * 4; if (data[i + 3]) { data[i] ^= 0x40; break outer; }
        }
    }
    const px = (x, y) => { if (x < x0 || y < y0 || x >= x0 + fw || y >= y0 + fh) return '0'; const i = (y * png.width + x) * 4; return data[i + 3] ? data[i] + ',' + data[i + 1] + ',' + data[i + 2] : '0'; };
    let best = null;
    for (let oy = 0; oy < 3; oy++) for (let ox = 0; ox < 3; ox++) {
        let bad = 0, blocks = 0;
        for (let by = y0 + oy - 3; by < y0 + fh; by += 3) for (let bx = x0 + ox - 3; bx < x0 + fw; bx += 3) {
            const first = px(bx, by); let uni = true, any = first !== '0';
            for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) { const p = px(bx + dx, by + dy); if (p !== '0') any = true; if (p !== first) uni = false; }
            if (!any) continue; blocks++; if (!uni) bad++;
        }
        if (!best || bad < best.bad) best = { ox, oy, bad, blocks };
    }
    const res = { name, fw, fh, exact: best.bad === 0 && best.blocks > 0, bad: best.bad, blocks: best.blocks, ox: best.ox, oy: best.oy, source: sc.standInSource || '' };
    if (res.exact) {
        const w = Math.ceil((fw - best.ox) / 3) + 1, h = Math.ceil((fh - best.oy) / 3) + 1;
        const img = { w, h, rgba: Buffer.alloc(w * h * 4) };
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
            const x = x0 + best.ox - 3 + i * 3, y = y0 + best.oy - 3 + j * 3;
            if (x < x0 || y < y0 || x >= x0 + fw || y >= y0 + fh) continue;
            const s = (y * png.width + x) * 4;
            data.copy(img.rgba, (j * w + i) * 4, s, s + 4);
            if (!img.rgba[(j * w + i) * 4 + 3]) img.rgba.fill(0, (j * w + i) * 4, (j * w + i) * 4 + 4);
        }
        res.frame1x = img;
    }
    return res;
}

// ---------------------------------------------------------------- survey (identification aid)
if (argv.includes('--survey')) {
    const list = argVal('--survey', '').split(',').map(Number).filter(n => n >= 150 && n < 1024);
    const frames = argVal('--frames', '0,16').split(',').map(Number);
    const Z = 3, CW = 80 * Z, CH = 84 * Z;
    const cols = Math.min(6, list.length * frames.length);
    const n = list.length * frames.length, rows = Math.ceil(n / cols);
    const cv = new Canvas(cols * CW, rows * CH, [40, 44, 40]);
    let idx = 0;
    for (const s of list) for (const f of frames) {
        const cx = (idx % cols) * CW, cy = ((idx / cols) | 0) * CH; idx++;
        cv.rect(cx, cy, CW, CH, [70, 76, 70]);
        const img = decodeShape(s, f), d = tfaDims(s);
        drawText(cv, `${s}:${f} ${d.x}*${d.y}*${d.z}`, cx + 4, cy + 4, [255, 240, 160], 2);
        if (!img) { drawText(cv, 'NO FRAME', cx + 8, cy + 40, [255, 120, 120], 2); continue; }
        const vis = { w: Math.min(img.w, 76), h: Math.min(img.h, 70), rgba: Buffer.alloc(Math.min(img.w, 76) * Math.min(img.h, 70) * 4) };
        for (let y = 0; y < vis.h; y++) img.rgba.copy(vis.rgba, y * vis.w * 4, y * img.w * 4, y * img.w * 4 + vis.w * 4);
        cv.blit(vis, cx + 4, cy + 20 * 1 + 14 * Z - 20, Z);
    }
    fs.mkdirSync(OUT, { recursive: true });
    const file = path.join(OUT, 'scale_survey.png');
    cv.save(file);
    console.log('wrote ' + file + ' (' + list.length + ' shapes x ' + frames.length + ' frames, shown at 3x for identification only)');
    process.exit(0);
}

// ---------------------------------------------------------------- main
fs.mkdirSync(OUT, { recursive: true });

// 1. The decoder agrees with the earlier decode of the reference oak (tools/extract_u7_nature_standins.js output).
{
    const earlier = path.join(ROOT, 'scratch', 'u7_nature', 'shape_181.png');
    if (!fs.existsSync(earlier)) {
        check('decoder_matches_earlier_decode', false, `no earlier decode at ${earlier} to compare with (run tools/extract_u7_nature_standins.js once, or restore the file)`);
    } else {
        const e = readPNG(earlier), mine = decodeShape(181, 0);
        const cmp = { w: mine.w, h: mine.h, rgba: Buffer.from(mine.rgba) };
        if (PROVOKE === 'decoder') { for (let i = 0; i < cmp.rgba.length; i += 4) if (cmp.rgba[i + 3]) { cmp.rgba[i] ^= 0x20; break; } }
        let diff = 0;
        if (e.width !== cmp.w || e.height !== cmp.h) diff = -1;
        else for (let i = 0; i < cmp.rgba.length; i += 4) {
            const a = e.data[i + 3] ? 1 : 0, b = cmp.rgba[i + 3] ? 1 : 0;
            if (a !== b || (a && (e.data[i] !== cmp.rgba[i] || e.data[i + 1] !== cmp.rgba[i + 1] || e.data[i + 2] !== cmp.rgba[i + 2]))) diff++;
        }
        check('decoder_matches_earlier_decode', diff === 0,
            diff < 0 ? `size differs: earlier ${e.width}x${e.height}, this decoder ${cmp.w}x${cmp.h}` : `shape 181 frame 0: ${cmp.w}x${cmp.h}, ${diff} pixels differ from scratch/u7_nature/shape_181.png`);
    }
}

// 2. Stand-ins: which lineup shapes have an exact 3x export; recovery path proven on the exact files that exist.
const standinReport = [];
for (const s of SUBJECTS) {
    if (!s.standin) { standinReport.push({ key: s.key, file: null }); continue; }
    const r = recover3x(s.standin, false);
    standinReport.push({ key: s.key, file: s.standin, exact: r ? r.exact : null, bad: r ? r.bad : null, blocks: r ? r.blocks : null, frame: r ? `${r.fw}x${r.fh}` : null, source: r ? r.source : null });
    info(`stand-in ${s.standin}.png for ${s.key}: ${r ? (r.exact ? 'EXACT 3x' : `not an exact 3x export (${r.bad}/${r.blocks} 3x3 blocks mixed, frame ${r.fw}x${r.fh}; sidecar: ${r.source || 'no source'})`) : 'missing'}`);
    if (r && r.exact) {
        // use the recovered frame only when the sidecar names this shape and the frame is the one the lineup wants
        const m = /shape\s+(\d+)/i.exec(r.source || ''), d = decodeShape(s.shape, s.frame);
        // identical opaque pixels, so the decoded frame (which carries the hotspot) stands for the recovered one
        if (m && Number(m[1]) === s.shape && d && sameOpaque(r.frame1x, d)) { s.recovered = d; s.recoveredFrom = s.standin; }
        else info(`  ${s.standin}.png is exact 3x but is not shape ${s.shape} frame ${s.frame}; the decode is used`);
    }
}
{
    // The exact 3x files present today (found by scanning every $U7_ sheet): recovery must give uniform blocks
    // and a frame identical to a decoded frame of the shape the sidecar names.
    const dir = path.join(ROOT, 'game', 'img', 'characters');
    const exact = [];
    var clippedStandins = [];
    for (const f of fs.readdirSync(dir).filter(f => /^[$!]+U7_.*\.png$/.test(f)).sort()) {
        const name = f.slice(0, -4), r = recover3x(name, false);
        if (r && r.exact) exact.push(r);
    }
    info(`exact 3x exports among the ${fs.readdirSync(dir).filter(f => /^[$!]+U7_.*\.png$/.test(f)).length} U7_ sheets: ${exact.map(r => r.name).join(', ') || 'none'}`);
    if (!exact.length) check('recovery_uniform_blocks', false, 'no exact 3x export found to prove the recovery path on');
    for (const r0 of exact) {
        const r = PROVOKE === 'recovery' ? recover3x(r0.name, true) : r0;
        check('recovery_uniform_blocks', r.exact, `${r.name}.png frame (col 1, row 0) ${r.fw}x${r.fh}: ${r.blocks - r.bad}/${r.blocks} 3x3 blocks uniform at offset (${r.ox},${r.oy})`);
        if (!r.exact) continue;
        const m = /shape\s+(\d+)/i.exec(r.source || '');
        let shape = m ? Number(m[1]) : null;
        if (PROVOKE === 'recovery_match' && shape) shape += 1;
        let found = null;
        if (shape) for (let f = 0; f < 32 && !found; f++) {
            const d = decodeShape(shape, f); if (!d) break;
            for (const [tag, img] of [['', d], [' transposed', transpose(d)]]) {
                const m2 = !found && matchClipped(r.frame1x, img);
                if (m2) found = { what: `frame ${f}${tag}`, clipped: m2.clipped, total: m2.total };
            }
        }
        const clipNote = found && found.clipped ? `; the sheet's ${r.fw}x${r.fh} frame clips ${found.clipped} of the shape's ${found.total} pixels at 1x (a defect of that stand-in, not of the recovery)` : '';
        if (found && found.clipped) clippedStandins.push(`${r.name}.png (shape ${shape}: ${found.clipped} of ${found.total} pixels cut off by its frame)`);
        check('recovery_matches_decoder', !!found, `${r.name}.png recovered to 1x (${opaqueBox(r.frame1x).w}x${opaqueBox(r.frame1x).h} opaque) ${found ? '= decoded shape ' + shape + ' ' + found.what + clipNote : '!= any of frames 0-31 of shape ' + shape + ' (as is or transposed, allowing for frame clipping)'}`);
    }
}

// 3. Decode every subject (an exact 3x recovery wins over a decode when it exists).
const SUBJ = {};
for (const s of SUBJECTS.concat(EXTRA)) {
    let shape = s.shape;
    if (PROVOKE === 'shapes' && s.key === 'boulder') shape = 688; // an empty 1x1 placeholder shape in the reference data
    const img = s.recovered ? null : decodeShape(shape, s.frame);
    const src = s.recovered || img;
    const box = src ? opaqueBox(src) : null;
    const dims = tfaDims(s.shape);
    // Footprint on the ground (px at 1x). Frames 16-31 of units are the other stored facing; footprints are square for units.
    const fp = { w: dims.x * TILE, h: dims.y * TILE };
    const ok = !!(src && box && box.w >= 4 && box.h >= 4);
    SUBJ[s.key] = Object.assign({}, s, { img: src, box, dims, fp, source: s.recovered ? 'exact 3x stand-in' : 'decoded' });
    if (SUBJECTS.includes(s)) check('shapes_decoded', ok, `${s.key}: shape ${shape} frame ${s.frame}: ${src ? src.w + 'x' + src.h + ' frame, opaque ' + (box ? box.w + 'x' + box.h : 'none') : 'no frame'}; footprint ${dims.x}x${dims.y} tiles, height ${dims.z} lifts (${SUBJ[s.key].source})`);
}
{
    const man = SUBJ[PROVOKE === 'person' ? 'fowl' : 'man'];
    const h = man.box ? man.box.h : 0;
    check('person_height', h >= 20 && h <= 40, `the standing man at 1x is ${h} px tall (a standing adult frame in the reference data is 20-40 px; outside that the wrong frame or shape was read)`);
}
const MAN_H = SUBJ.man.box.h;

// ---------------------------------------------------------------- placement helpers
// A subject placed with its ground footprint's bottom-right corner (the reference hotspot) at (hx, hy) in
// canvas pixels, at enlargement k. The frame's hotspot is at (xleft, yabove) of the decoded frame.
function drawSubject(cv, sub, hx, hy, k) {
    const img = sub.img;
    const ox = hx - (sub.img.xleft !== undefined ? sub.img.xleft : 0) * k;
    const oy = hy - (sub.img.yabove !== undefined ? sub.img.yabove : 0) * k;
    cv.blit(img, ox, oy, k);
    return { x: ox, y: oy };
}
function cellsFor(px) { return Math.max(1, Math.ceil(px / CELL - 1e-9)); }
// Five short label lines: name, sprite size, sprite span in cells, ground footprint in cells, what it occupies.
function labelLines(s, k) {
    const f = v => { const t = (Math.round(v * 10) / 10).toFixed(1); return t.startsWith('0.') ? t.slice(1) : t; };
    return [
        s.name,
        `${s.box.w * k}*${s.box.h * k} PX`,
        `SPAN ${f(s.box.w * k / CELL)}*${f(s.box.h * k / CELL)}`,
        `GROUND ${f(s.fp.w * k / CELL)}*${f(s.fp.h * k / CELL)}`,
        s.kind === 'unit' ? 'STANDS IN 1' : `BLOCKS ${cellsFor(s.fp.w * k)}*${cellsFor(s.fp.h * k)}`,
    ];
}

// ---------------------------------------------------------------- lineup
function buildLineup(cand) {
    const k = cand.k;
    const subs = SUBJECTS.map(s => SUBJ[s.key]);
    // Horizontal layout: each subject gets whole cells; its footprint is centred in its footprint cells and
    // stands on the baseline; the sprite (leaning up-left) must not overlap the previous column.
    const pad = 6;
    let cursor = 3 * CELL;             // right edge (px) of the previous sprite and its cells; the ruler sits left of it
    const labelRight = [0, 0];         // labels alternate between two tiers, so neighbours may sit closer than a label
    const placed = [];
    subs.forEach((s, n) => {
        const fpw = s.fp.w * k, fph = s.fp.h * k;
        const cw = s.kind === 'unit' ? 1 : cellsFor(fpw), ch = s.kind === 'unit' ? 1 : cellsFor(fph);
        const bodyW = cellsFor(fpw), bodyH = cellsFor(fph);
        const xl = s.img.xleft * k, xr = (s.img.w - 1 - s.img.xleft) * k;
        const labelW = Math.max(...labelLines(s, k).map(t => textWidth(t))) + 8, tier = n % 2;
        const posW = s.kind === 'unit' ? 1 : bodyW; // a unit stands in one cell with its body centred on it
        let c0 = Math.ceil(cursor / CELL);
        for (;; c0++) {
            const hx = (c0 + posW) * CELL - Math.floor((posW * CELL - fpw) / 2);
            const lc = c0 * CELL + posW * CELL / 2;
            if (hx - xl >= cursor + pad && lc - labelW / 2 >= labelRight[tier] + pad) break;
        }
        const hx = (c0 + posW) * CELL - Math.floor((posW * CELL - fpw) / 2);
        placed.push({ s, c0, cw, ch, bodyW, bodyH, posW, hx, fpw, fph, tier });
        cursor = Math.max(hx + xr, (c0 + posW) * CELL, hx);
        labelRight[tier] = c0 * CELL + posW * CELL / 2 + labelW / 2;
    });
    cursor = Math.max(cursor, labelRight[0], labelRight[1]);
    const W = Math.ceil((cursor + CELL) / CELL) * CELL;
    // Vertical: title band, field (tallest sprite + 1 cell), label band.
    const tallest = Math.max(...subs.map(s => (s.img.yabove + 1) * k));
    const fieldCells = Math.ceil((tallest + 20) / CELL) + 1;
    const top = cand.placeholder ? 76 : 52, fieldH = fieldCells * CELL, labelH = 124, capH = cand.placeholder ? 34 : 0;
    const H = top + fieldH + labelH + capH;
    const cv = new Canvas(W, H, [24, 22, 20]);
    const baseY = top + fieldH - CELL; // one cell row of ground below the baseline
    // grass field (world px at density 1 art px per screen px: enlargement does not change the ground)
    for (let y = top; y < top + fieldH; y++) for (let x = 0; x < W; x++) cv.blend(x, y, grassAt(x, y - top));
    // cell grid, lightly
    for (let x = 0; x <= W; x += CELL) cv.vline(x, top, top + fieldH - 1, [255, 255, 255], 0.16);
    for (let y = top; y <= top + fieldH; y += CELL) cv.hline(0, W - 1, y, [255, 255, 255], 0.16);
    const YEL = [255, 214, 64], CYA = [96, 230, 255];
    // person ruler (left) and the person-height line across
    const pxPerM = MAN_H * k / PERSON_M;
    const rx = 2 * CELL - 10;
    cv.fill(rx - 3, baseY - Math.round(2.5 * pxPerM), 6, Math.round(2.5 * pxPerM), [30, 26, 22], 0.85);
    for (let m = 0; m <= 2.5 + 1e-9; m += 0.25) {
        const y = baseY - Math.round(m * pxPerM);
        const major = Math.abs(m - Math.round(m * 2) / 2) < 1e-9;
        cv.hline(rx - (major ? 8 : 4), rx + (major ? 3 : 1), y, [255, 250, 230]);
        if (major && k > 0 && (pxPerM * 0.5 >= 9)) drawText(cv, m.toFixed(1) + 'M', rx - 8 - textWidth(m.toFixed(1) + 'M') - 2, y - 3, [255, 250, 230]);
    }
    if (pxPerM * 0.5 < 9) for (const m of [1, 2]) drawText(cv, m + 'M', rx - 8 - textWidth(m + 'M') - 2, baseY - Math.round(m * pxPerM) - 3, [255, 250, 230]);
    cv.vline(rx, baseY - Math.round(2.5 * pxPerM), baseY, [255, 250, 230]);
    const headY = baseY - MAN_H * k;
    cv.hline(rx + 4, W - 1, headY, [255, 120, 200], 0.9, 4);
    drawText(cv, `PERSON 1.75 M = ${MAN_H * k} PX`, rx + 8, headY - 10, [255, 170, 220]);
    // baseline
    cv.hline(0, W - 1, baseY, [255, 255, 255], 0.55);
    // a creature's one cell and ground footprint go under its sprite (as the game's stance square does)
    for (const p of placed) if (p.s.kind === 'unit') {
        cv.rect(p.c0 * CELL + 1, baseY - CELL + 1, CELL - 1, CELL - 1, [120, 255, 120], 0.9);
        cv.rect(p.hx - p.fpw, baseY - p.fph, p.fpw, p.fph, CYA, 0.95, 2);
    }
    // sprites, back to front (all on one baseline, so left to right is fine)
    for (const p of placed) drawSubject(cv, p.s, p.hx, baseY, k);
    // object footprints over the sprites, so the blocked cells stay countable under a crown
    for (const p of placed) if (p.s.kind === 'object') {
        const x = p.c0 * CELL, y = baseY - p.bodyH * CELL;
        cv.rect(x + 1, y + 1, p.cw * CELL - 1, p.ch * CELL - 1, YEL, 0.95);
        cv.rect(x + 2, y + 2, p.cw * CELL - 3, p.ch * CELL - 3, YEL, 0.5);
        cv.rect(p.hx - p.fpw, baseY - p.fph, p.fpw, p.fph, CYA, 0.95, 2);
    }
    // labels
    for (const p of placed) {
        const cx = p.c0 * CELL + p.posW * CELL / 2;
        const box = p.s.box;
        const lines = labelLines(p.s, k, p);
        const ly = top + fieldH + 6 + p.tier * 60;
        if (p.tier) cv.vline(Math.round(cx), top + fieldH + 1, ly - 3, [150, 150, 140], 0.8);
        lines.forEach((t, i) => drawText(cv, t, Math.round(cx - textWidth(t) / 2), ly + i * 11, i === 0 ? [255, 244, 200] : [210, 210, 200], 1, null));
    }
    // title and legend
    const mPerCellP = CELL / pxPerM, mPerCellG = CELL / (TILE * k / TILE_M);
    drawText(cv, cand.title, 8, 6, [255, 244, 200], 2);
    drawText(cv, `ONE ART PIXEL = ONE SCREEN PIXEL AT ZOOM 1. CELL = 48 PX ~ ${mPerCellG.toFixed(1)}-${mPerCellP.toFixed(1)} M. PERSON = ${MAN_H * k} PX TALL.`, 8, 26, [230, 230, 220]);
    drawText(cv, 'YELLOW = CELLS AN OBJECT BLOCKS. GREEN = THE ONE CELL A CREATURE STANDS IN. CYAN DOTS = GROUND FOOTPRINT (GROUND = ITS SIZE IN CELLS). SPAN = SPRITE SIZE IN CELLS. GRID = 48 PX CELLS.', 8, 38, [200, 200, 190]);
    if (cand.placeholder && PROVOKE !== 'caption') {
        cv.fill(0, 52, W, 20, CAPTION_BG);
        drawText(cv, CAPTION + `  (${k}X NEAREST NEIGHBOUR OF THE 1X SHAPES)`, 8, 55, [255, 255, 255], 2, [60, 0, 0]);
        cv.fill(0, H - capH, W, capH, CAPTION_BG);
        drawText(cv, CAPTION, 8, H - capH + 10, [255, 255, 255], 2, [60, 0, 0]);
    }
    return { cv, placed, baseY, top, k, capH, W, H };
}

// ---------------------------------------------------------------- the scene (a small camp) in world tiles
// Positions are the bottom-right corner of each footprint, in reference tiles (0.5 m); the camp is centred on (0, 0).
const SCENE = [
    // the house: north wall, side walls, south wall with a door (a wall run with a door), bed inside
    { key: 'wall', t: [-8, -12] }, { key: 'wall', t: [-4, -12] }, { key: 'wall', t: [0, -12] }, { key: 'wall', t: [4, -12] },
    { key: 'wall_ns', t: [-11, -8] }, { key: 'wall_ns', t: [-11, -4] },
    { key: 'wall_ns', t: [4, -8] }, { key: 'wall_ns', t: [4, -4] },
    { key: 'wall', t: [-8, -3] }, { key: 'wall', t: [-4, -3] }, { key: 'door', t: [0, -3] }, { key: 'wall', t: [4, -3] },
    { key: 'bed', t: [-5, -5] }, { key: 'chest', t: [2, -5] },
    // the camp in front of it
    { key: 'campfire', t: [1, 5] },
    { key: 'man', t: [-3, 5], unit: 'friendly' }, { key: 'woman', t: [4, 6], unit: 'friendly' },
    { key: 'barrel', t: [8, -1] },
    // trees and a boulder around
    { key: 'oak', t: [-16, 2] }, { key: 'pine', t: [-20, -8] }, { key: 'boulder', t: [12, 9] },
    // a deer at the edge of the clearing
    { key: 'deer', t: [18, 1], unit: 'indifferent' },
];
// Scattered forest outside the clearing (seeded, for the zoomed-out views): one chance per 6x6-tile block.
function sceneObjects() {
    const list = SCENE.map(o => Object.assign({}, o));
    const kinds = ['oak', 'pine', 'pine', 'fruit', 'bush', 'bush', 'boulder', 'stump', 'oak'];
    for (let by = -24; by < 24; by++) for (let bx = -30; bx < 30; bx++) {
        const cx = bx * 6 + 3, cy = by * 6 + 3;
        const d = Math.hypot(cx / 1.3, cy);
        if (d < 30) continue;
        const h = hash32(SEED, 77, bx, by);
        if (h % 100 >= (d < 50 ? 22 : 38)) continue;
        const kind = kinds[(h >>> 8) % kinds.length];
        list.push({ key: kind, t: [bx * 6 + 5, by * 6 + 5] });
    }
    return list;
}
const STANCE = { friendly: [34, 197, 94], indifferent: [234, 179, 8], hostile: [239, 68, 68] };

// Render the world (at enlargement k) into a canvas of view size, centred on world tile (0, 0),
// where one canvas pixel = one screen pixel at zoom 1.
function renderWorld(k, vw, vh, opts = {}) {
    const cv = new Canvas(vw, vh);
    const cx = Math.floor(vw / 2), cy = Math.floor(vh / 2); // world tile (0,0) corner lands here
    // grass (density fixed: the ground texture is drawn per screen pixel, same at every candidate)
    for (let y = 0; y < vh; y++) for (let x = 0; x < vw; x++) cv.blend(x, y, grassAt(x - cx + 100000, y - cy + 100000));
    // grid aligned so that world tile (0,0) sits on a cell corner at A
    const gx0 = ((cx % CELL) + CELL) % CELL, gy0 = ((cy % CELL) + CELL) % CELL;
    for (let x = gx0; x < vw; x += CELL) cv.vline(x, 0, vh - 1, [255, 255, 255], 0.12);
    for (let y = gy0; y < vh; y += CELL) cv.hline(0, vw - 1, y, [255, 255, 255], 0.12);
    const objs = sceneObjects().map(o => {
        const s = SUBJ[o.key];
        return { o, s, hx: cx + o.t[0] * TILE * k, hy: cy + o.t[1] * TILE * k };
    }).filter(p => p.hx + 200 * k > 0 && p.hy + 200 * k > 0 && p.hx - 200 * k < vw && p.hy - 200 * k < vh + 200 * k);
    // units stand in a cell, as in the engine: the cell that holds the centre of their ground footprint; the body
    // is centred on that cell and its feet sit on the cell's bottom edge. The stance square is that cell.
    for (const p of objs) if (p.o.unit) {
        const fx = p.hx - Math.round(p.s.fp.w * k / 2), fy = p.hy - Math.round(p.s.fp.h * k / 2);
        const qx = gx0 + Math.floor((fx - gx0) / CELL) * CELL, qy = gy0 + Math.floor((fy - gy0) / CELL) * CELL;
        p.hx = qx + CELL - Math.floor((CELL - p.s.fp.w * k) / 2); p.hy = qy + CELL;
        cv.fill(qx, qy, CELL, CELL, STANCE[p.o.unit], 0.40);
        cv.rect(qx, qy, CELL, CELL, STANCE[p.o.unit].map(v => Math.round(v * 0.55)), 0.85);
        cv.rect(qx + 1, qy + 1, CELL - 2, CELL - 2, STANCE[p.o.unit].map(v => Math.round(v * 0.55)), 0.85);
    }
    // draw back to front: by the footprint's bottom edge, then its right edge (the reference game's hotspot order)
    objs.sort((a, b) => a.hy - b.hy || a.hx - b.hx);
    for (const p of objs) drawSubject(cv, p.s, p.hx, p.hy, k);
    return cv;
}
function zoomIn(src, z) { // integer camera zoom-in by nearest neighbour, of the centre region
    const out = new Canvas(src.w, src.h);
    const ox = Math.floor(src.w / 2 - src.w / (2 * z)), oy = Math.floor(src.h / 2 - src.h / (2 * z));
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
        const i = ((oy + Math.floor(y / z)) * src.w + ox + Math.floor(x / z)) * 4;
        out.d[(y * src.w + x) * 4] = src.d[i]; out.d[(y * src.w + x) * 4 + 1] = src.d[i + 1]; out.d[(y * src.w + x) * 4 + 2] = src.d[i + 2]; out.d[(y * src.w + x) * 4 + 3] = 255;
    }
    return { out, ox, oy };
}
function zoomOut(src, z, mode, ow, oh) { // camera zoom-out: 'sampled' (nearest) or 'averaged' (area-weighted box)
    const out = new Canvas(ow, oh);
    const inv = 1 / z;
    for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) {
        let r = 0, g = 0, b = 0;
        if (mode === 'sampled') {
            const sx = Math.min(src.w - 1, Math.floor((x + 0.5) * inv)), sy = Math.min(src.h - 1, Math.floor((y + 0.5) * inv));
            const i = (sy * src.w + sx) * 4; r = src.d[i]; g = src.d[i + 1]; b = src.d[i + 2];
        } else {
            const x0 = x * inv, x1 = (x + 1) * inv, y0 = y * inv, y1 = (y + 1) * inv; let wsum = 0;
            for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy++) for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx++) {
                const wx = Math.min(x1, sx + 1) - Math.max(x0, sx), wy = Math.min(y1, sy + 1) - Math.max(y0, sy), w = wx * wy;
                if (w <= 0 || sx >= src.w || sy >= src.h) continue;
                const i = (sy * src.w + sx) * 4; r += src.d[i] * w; g += src.d[i + 1] * w; b += src.d[i + 2] * w; wsum += w;
            }
            r /= wsum; g /= wsum; b /= wsum;
        }
        const o = (y * ow + x) * 4; out.d[o] = Math.round(r); out.d[o + 1] = Math.round(g); out.d[o + 2] = Math.round(b); out.d[o + 3] = 255;
    }
    return out;
}
function banner(cv, lines, placeholder) {
    const h = 8 + lines.length * 12 + (placeholder ? 26 : 0);
    cv.fill(0, 0, cv.w, h, [16, 14, 12], 0.72);
    lines.forEach((t, i) => drawText(cv, t, 6, 5 + i * 12, i === 0 ? [255, 244, 200] : [225, 225, 215], 1, null));
    if (placeholder && PROVOKE !== 'caption') {
        cv.fill(0, h - 24, cv.w, 22, CAPTION_BG);
        drawText(cv, CAPTION, 6, h - 21, [255, 255, 255], 2, [60, 0, 0]);
        cv.fill(0, cv.h - 22, cv.w, 22, CAPTION_BG);
        drawText(cv, CAPTION, 6, cv.h - 19, [255, 255, 255], 2, [60, 0, 0]);
    }
}
function paste(dst, src, x, y) { for (let j = 0; j < src.h; j++) src.d.copy(dst.d, ((y + j) * dst.w + x) * 4, j * src.w * 4, (j + 1) * src.w * 4); }

// ---------------------------------------------------------------- build everything
const SW = 816, SH = 624; // the game's screen (System.json screenWidth/Height)
const written = {};
function save(name, cv) { const f = path.join(OUT, name); cv.save(f); written[name] = { w: cv.w, h: cv.h, file: f }; }

const lineups = {};
for (const c of CANDIDATES) { lineups[c.id] = buildLineup(c); save(`scale_${c.id}_lineup.png`, lineups[c.id].cv); }

// Candidate A: the camp at zoom 1 (the real 816x624 screen), zoom 2 (a zoom-in level), and the zoom-outs of today.
const worldA = renderWorld(1, SW, SH);
const mA = CELL / (MAN_H / PERSON_M);
const sceneA1 = new Canvas(SW, SH); paste(sceneA1, worldA, 0, 0);
banner(sceneA1, [`CANDIDATE A AT ZOOM 1: THE 816*624 SCREEN = 17*13 CELLS ~ ${(17 * mA).toFixed(0)}*${(13 * mA).toFixed(0)} M. PERSON ${MAN_H} PX.`, 'A SMALL CAMP: HOUSE WALLS WITH A DOOR, BED, CHEST, CAMPFIRE, TWO PEOPLE, BARREL, OAK, PINE, BOULDER, DEER. SQUARES = STANCE (ONE CELL).'], false);
save('scale_A_scene_zoom1.png', sceneA1);
const zi = zoomIn(worldA, 2);
const sceneA2 = zi.out;
banner(sceneA2, ['CANDIDATE A AT A CAMERA ZOOM-IN OF 2 (EVERY SCREEN PIXEL DOUBLED BY THE CAMERA, THE ART IS THE SAME 1X ART).', `8.5*6.5 CELLS ON SCREEN. PERSON ${MAN_H * 2} PX ON SCREEN.`], false);
save('scale_A_scene_zoom2.png', sceneA2);
for (const [z, tag, label] of [[2 / 3, '2of3', '2/3'], [1 / 3, '1of3', '1/3']]) {
    const vw = Math.round(SW / z), vh = Math.round(SH / z);
    const world = renderWorld(1, vw, vh);
    const s = zoomOut(world, z, 'sampled', SW, SH), a = zoomOut(world, z, 'averaged', SW, SH);
    banner(s, [`CANDIDATE A AT ZOOM ${label}, SAMPLED: ART PIXELS SKIPPED (TILES NEAREST, SPRITES BILINEAR WITHOUT MIPMAPS TODAY).`, `${(17 / z).toFixed(0)}*${(13 / z).toFixed(0)} CELLS ON SCREEN. PERSON ~${Math.round(MAN_H * z)} PX.`], false);
    banner(a, [`CANDIDATE A AT ZOOM ${label}, AVERAGED: EACH SCREEN PIXEL AVERAGES THE ART PIXELS UNDER IT (MIPMAPS).`, `${(17 / z).toFixed(0)}*${(13 / z).toFixed(0)} CELLS ON SCREEN. PERSON ~${Math.round(MAN_H * z)} PX.`], false);
    const both = new Canvas(SW * 2 + 8, SH, [0, 0, 0]); paste(both, s, 0, 0); paste(both, a, SW + 8, 0);
    save(`scale_A_scene_zoom_${tag}.png`, both);
}
// Candidates B and C: the same camp at zoom 1 on the same screen (placeholder enlargements, captioned).
for (const c of CANDIDATES.filter(c => c.placeholder)) {
    const w = renderWorld(c.k, SW, SH);
    const m = CELL / (MAN_H * c.k / PERSON_M);
    banner(w, [`CANDIDATE ${c.id} AT ZOOM 1: THE SAME CAMP ON THE SAME 816*624 SCREEN = 17*13 CELLS ~ ${(17 * m).toFixed(0)}*${(13 * m).toFixed(0)} M. PERSON ${MAN_H * c.k} PX.`, 'SAME POSITIONS IN METRES AS CANDIDATE A; THE CELL GRID STAYS 48 PX.'], true);
    save(`scale_${c.id}_scene_zoom1.png`, w);
}

// ---------------------------------------------------------------- measurements
const meas = { written: '2026-09-19', cell: CELL, personMetres: PERSON_M, tileMetres: TILE_M, manHeight1x: MAN_H, candidates: {}, subjects: {}, standins: standinReport, clippedStandins };
for (const c of CANDIDATES) {
    const pxPerM = MAN_H * c.k / PERSON_M;
    meas.candidates[c.id] = {
        enlargement: c.k, personPx: MAN_H * c.k,
        metresPerCellFromPerson: +(CELL / pxPerM).toFixed(2),
        metresPerCellFromGround: +(CELL / (TILE * c.k / TILE_M)).toFixed(2),
        screenCells: [17, 13], screenMetresFromPerson: [+(17 * CELL / pxPerM).toFixed(1), +(13 * CELL / pxPerM).toFixed(1)],
        mapMetresFromPerson: +(256 * CELL / pxPerM).toFixed(0),
        stepSpeedMps: +(CELL / pxPerM).toFixed(2),
    };
}
for (const s of SUBJECTS) {
    const S = SUBJ[s.key];
    const row = { name: s.name.toLowerCase(), kind: s.kind, shape: s.shape, frame: s.frame, source: S.source, tfa: S.dims, sprite1x: [S.box.w, S.box.h], per: {} };
    for (const c of CANDIDATES) {
        const k = c.k;
        row.per[c.id] = {
            spritePx: [S.box.w * k, S.box.h * k],
            spanCells: [+(S.box.w * k / CELL).toFixed(2), +(S.box.h * k / CELL).toFixed(2)],
            groundPx: [S.fp.w * k, S.fp.h * k],
            groundCells: [+(S.fp.w * k / CELL).toFixed(2), +(S.fp.h * k / CELL).toFixed(2)],
            footprintCells: s.kind === 'unit' ? [1, 1] : [cellsFor(S.fp.w * k), cellsFor(S.fp.h * k)],
            bodyCells: [cellsFor(S.fp.w * k), cellsFor(S.fp.h * k)],
        };
    }
    meas.subjects[s.key] = row;
}
// A small house as the scene builds it: outer walls 16 x 10 tiles (8 x 5 m)
for (const c of CANDIDATES) {
    const k = c.k; meas.candidates[c.id].house8x5m = [cellsFor(16 * TILE * k), cellsFor(10 * TILE * k)];
    meas.candidates[c.id].house8x5mExact = [+(16 * TILE * k / CELL).toFixed(2), +(10 * TILE * k / CELL).toFixed(2)];
}
fs.writeFileSync(path.join(OUT, 'scale_measurements.json'), JSON.stringify(meas, null, 2) + '\n');
written['scale_measurements.json'] = { file: path.join(OUT, 'scale_measurements.json') };

// ---------------------------------------------------------------- checks on the written files
{
    // A is exact: the man's opaque pixels appear 1:1 in the written lineup.
    const L = lineups.A, p = L.placed.find(q => q.s.key === 'man');
    const png = readPNG(path.join(OUT, 'scale_A_lineup.png'));
    const img = SUBJ.man.img;
    let ox = p.hx - img.xleft, oy = L.baseY - img.yabove;
    if (PROVOKE === 'exact') ox += 1;
    let n = 0, bad = 0;
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
        const i = (y * img.w + x) * 4; if (!img.rgba[i + 3]) continue; n++;
        const j = ((oy + y) * png.width + ox + x) * 4;
        if (png.data[j] !== img.rgba[i] || png.data[j + 1] !== img.rgba[i + 1] || png.data[j + 2] !== img.rgba[i + 2]) bad++;
    }
    check('lineup_A_exact', n > 0 && bad === 0, `scale_A_lineup.png: ${n - bad}/${n} of the man's art pixels appear 1:1 at the placed position (one art pixel = one screen pixel)`);
}
for (const id of ['B', 'C']) {
    const L = lineups[id], k = L.k, p = L.placed.find(q => q.s.key === 'man');
    const png = readPNG(path.join(OUT, `scale_${id}_lineup.png`));
    const img = SUBJ.man.img;
    const kk = PROVOKE === 'integer' && id === 'B' ? k + 1 : k;
    const ox = p.hx - img.xleft * k, oy = L.baseY - img.yabove * k;
    let n = 0, bad = 0;
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
        const i = (y * img.w + x) * 4; if (!img.rgba[i + 3]) continue; n++;
        for (let dy = 0; dy < kk; dy++) for (let dx = 0; dx < kk; dx++) {
            const j = ((oy + y * kk + dy) * png.width + ox + x * kk + dx) * 4;
            if (png.data[j] !== img.rgba[i] || png.data[j + 1] !== img.rgba[i + 1] || png.data[j + 2] !== img.rgba[i + 2]) { bad++; dy = kk; break; }
        }
    }
    check('lineup_enlargement_integer', n > 0 && bad === 0, `scale_${id}_lineup.png: ${n - bad}/${n} of the man's art pixels are whole ${kk}x${kk} blocks (placeholder enlargement by an integer, nearest neighbour)`);
}
{
    const z1 = readPNG(path.join(OUT, 'scale_A_scene_zoom1.png')), z2 = readPNG(path.join(OUT, 'scale_A_scene_zoom2.png'));
    // compare below the banners (rows 60..): zoom2 pixel (x, y) = world pixel (ox + x/2, oy + y/2); the world is scene zoom1 without its banner
    let bad = 0, n = 0; const shift = PROVOKE === 'zoom2' ? 1 : 0;
    for (let y = 80; y < SH; y += 3) for (let x = 0; x < SW; x += 3) {
        const wx = zi.ox + Math.floor(x / 2) + shift, wy = zi.oy + Math.floor(y / 2);
        if (wy < 40) continue;
        const i = (y * SW + x) * 4, j = (wy * SW + wx) * 4; n++;
        if (z2.data[i] !== z1.data[j] || z2.data[i + 1] !== z1.data[j + 1] || z2.data[i + 2] !== z1.data[j + 2]) bad++;
    }
    check('zoom2_exact', n > 0 && bad === 0, `scale_A_scene_zoom2.png: ${n - bad}/${n} sampled screen pixels equal the zoom-1 world pixel they magnify (integer zoom-in keeps the 1x art exact)`);
}
for (const f of ['scale_B_lineup.png', 'scale_C_lineup.png', 'scale_B_scene_zoom1.png', 'scale_C_scene_zoom1.png']) {
    const png = readPNG(path.join(OUT, f));
    const rowHas = y => { let n = 0; for (let x = 0; x < png.width; x++) { const i = (y * png.width + x) * 4; if (png.data[i] === CAPTION_BG[0] && png.data[i + 1] === CAPTION_BG[1] && png.data[i + 2] === CAPTION_BG[2]) n++; } return n / png.width; };
    let topBand = 0, botBand = 0;
    for (let y = 0; y < 90; y++) topBand = Math.max(topBand, rowHas(y));
    for (let y = png.height - 24; y < png.height; y++) botBand = Math.max(botBand, rowHas(y));
    check('caption_present', topBand > 0.5 && botBand > 0.5, `${f}: caption band colour covers ${(topBand * 100).toFixed(0)}% of a row near the top and ${(botBand * 100).toFixed(0)}% near the bottom (the placeholder caption is on the image)`);
}
{
    const expect = ['scale_A_lineup.png', 'scale_A_scene_zoom1.png', 'scale_A_scene_zoom2.png', 'scale_B_lineup.png', 'scale_C_lineup.png',
        'scale_A_scene_zoom_2of3.png', 'scale_A_scene_zoom_1of3.png', 'scale_B_scene_zoom1.png', 'scale_C_scene_zoom1.png', 'scale_measurements.json'];
    if (PROVOKE === 'outputs') expect.push('scale_D_lineup.png');
    const missing = expect.filter(f => !fs.existsSync(path.join(OUT, f)));
    const sizes = ['scale_A_scene_zoom1.png', 'scale_A_scene_zoom2.png'].map(f => { const p = readPNG(path.join(OUT, f)); return `${f} ${p.width}x${p.height}`; });
    check('outputs_written', missing.length === 0 && sizes.every(s => s.endsWith(`${SW}x${SH}`)), missing.length ? `missing: ${missing.join(', ')}` : `${expect.length} files in ${OUT}; ${sizes.join(', ')}`);
}

// ---------------------------------------------------------------- table
if (argv.includes('--table')) {
    console.log('\n| Subject | Shape:frame | Footprint (tiles) x height (lifts) | Sprite at 1x (px) | A: sprite px / span cells / blocks | B: sprite px / span cells / blocks | C: sprite px / span cells / blocks |');
    console.log('|---|---|---|---|---|---|---|');
    for (const s of SUBJECTS) {
        const r = meas.subjects[s.key];
        const cell = id => { const q = r.per[id]; return `${q.spritePx[0]}×${q.spritePx[1]} / ${q.spanCells[0].toFixed(1)}×${q.spanCells[1].toFixed(1)} / ${s.kind === 'unit' ? '1 (body ' + q.bodyCells.join('×') + ')' : q.footprintCells.join('×')}`; };
        console.log(`| ${r.name} | ${r.shape}:${r.frame} | ${r.tfa.x}×${r.tfa.y} × ${r.tfa.z} | ${r.sprite1x.join('×')} | ${cell('A')} | ${cell('B')} | ${cell('C')} |`);
    }
    for (const c of CANDIDATES) console.log(`candidate ${c.id}: ${JSON.stringify(meas.candidates[c.id])}`);
}

const fails = results.filter(r => !r.pass).length;
console.log(`RESULT ${fails ? 'FAIL' : 'PASS'} ${results.length - fails}/${results.length} checks${PROVOKE ? ' (provoked: ' + PROVOKE + ')' : ''}; images in ${OUT}`);
process.exit(fails ? 1 : 0);
