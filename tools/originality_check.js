'use strict';
// tools/originality_check.js: is a master PNG our own work, or a near-copy of an Ultima VII shape?
//
// AGENTS.md rule 8 (user decision 2026-09-19): U7 art may be a style reference and training data for
// the art generators, but nothing that ships may be a copy, trace, recolour, crop or near-copy of a
// U7 image. This tool compares a candidate against every frame of the U7 shape libraries and grades
// it FAIL (near-copy), WARN (similar: a human looks) or PASS. System doc: docs/systems/ORIGINALITY_CHECK.md.
//
//   node tools/originality_check.js --build-index            decode every U7 frame, write the fingerprints
//   node tools/originality_check.js <png ...> [--report <out.png>] [--json] [--frame WxH]
//   node tools/originality_check.js --selftest [--sample N]  calibration: copies must FAIL, originals must not
//
// The index (reference/u7_originality_index.json) and the reports hold U7-derived data: they stay
// local (reference/ is outside the .gitignore whitelist) and are never loaded by the game.
// The original game folders are read only. Dependency-free: Node's fs/path/zlib and ./png_read, ./png_util.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { readPNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.join(__dirname, '..');
const DEFAULT_INDEX = path.join(ROOT, 'reference', 'u7_originality_index.json');
const STATUS_FILE = path.join(ROOT, 'docs', 'STATUS.md');
const INDEX_VERSION = 4;

// Known provenance is stronger evidence than a visual distance. AGENTS rule 8 reserves U7_ names
// for Ultima VII stand-ins, and STATUS records the older/unprefixed copies that predate that rule.
// This policy is intentionally limited to game/img: an original master or a local reference file is
// still graded on pixels even if its descriptive file name happens to contain "u7".
let STANDIN_DECLARATIONS;
function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function standInDeclarations() {
    if (STANDIN_DECLARATIONS) return STANDIN_DECLARATIONS;
    const out = { names: new Map(), globs: [], lines: 0, error: null };
    let text;
    try { text = fs.readFileSync(STATUS_FILE, 'utf8'); }
    catch (e) { out.error = e.message; return (STANDIN_DECLARATIONS = out); }
    const lines = text.split(/\r?\n/);
    let i = lines.findIndex(l => /^##\s+Stand-ins/i.test(l));
    if (i < 0) { out.error = 'Stand-ins heading not found'; return (STANDIN_DECLARATIONS = out); }
    for (i++; i < lines.length && !/^##\s/.test(lines[i]); i++) {
        if (!/^\s*-\s/.test(lines[i])) continue;
        out.lines++;
        // STATUS defines the declaration grammar as the first pipe-delimited field. Later fields
        // are provenance and consumers, and contain code words such as `standInSource` that are
        // not asset names.
        const declarationField = lines[i].split('|', 1)[0];
        for (const m of declarationField.matchAll(/`([^`]+)`/g)) {
            let token = m[1].trim().replace(/\\/g, '/').replace(/^game\/img\//i, '').replace(/\.(png|json)$/i, '');
            if (!token || /\s/.test(token)) continue;
            if (token.endsWith('/')) token += '*';
            if (token.includes('*')) {
                const re = new RegExp('^' + token.split('*').map(escapeRegExp).join('.*') + '$', 'i');
                out.globs.push({ re, token, line: i + 1 });
            } else out.names.set(token.toLowerCase(), { token, line: i + 1 });
        }
    }
    return (STANDIN_DECLARATIONS = out);
}
function standInPolicy(file) {
    if (!file) return null;
    const imageRoot = path.resolve(ROOT, 'game', 'img');
    const absolute = path.resolve(file);
    let rel = path.relative(imageRoot, absolute).replace(/\\/g, '/');
    if (!rel || rel === '..' || rel.startsWith('../') || path.isAbsolute(rel) || !/\.png$/i.test(rel)) return null;
    const stem = rel.replace(/\.png$/i, '');
    const name = path.posix.basename(stem);
    if (/^[!$]*u7_/i.test(name)) {
        return { kind: 'reserved-name', file: rel, why: 'filename uses the U7_ stand-in prefix required by AGENTS rule 8' };
    }
    if (/\.u7bak$/i.test(name)) {
        return { kind: 'reserved-name', file: rel, why: 'filename is a preserved .u7bak Ultima VII stand-in' };
    }
    const declared = standInDeclarations();
    if (declared.error) {
        return { kind: 'policy-error', file: rel, why: `cannot load docs/STATUS.md Stand-ins declarations: ${declared.error}` };
    }
    const folder = path.posix.dirname(stem) === '.' ? '' : path.posix.dirname(stem);
    const keys = [name.toLowerCase(), stem.toLowerCase()];
    for (const key of keys) {
        const hit = declared.names.get(key);
        if (hit) return { kind: 'status', file: rel, token: hit.token, line: hit.line, why: `listed in docs/STATUS.md:${hit.line} under Stand-ins` };
    }
    for (const hit of declared.globs) {
        if (hit.re.test(name) || hit.re.test(stem) || (folder && hit.re.test(folder + '/' + name))) {
            return { kind: 'status', file: rel, token: hit.token, line: hit.line, why: `matches ${hit.token} in docs/STATUS.md:${hit.line} under Stand-ins` };
        }
    }
    return null;
}
function policyFailure(policy) {
    const reason = policy.kind === 'policy-error'
        ? `stand-in provenance policy is unavailable (${policy.why})`
        : `project-declared Ultima VII stand-in (${policy.why}); provenance policy runs before perceptual distance`;
    return {
        grade: 'FAIL',
        summary: `FAIL: ${reason}`,
        frames: [],
        policy
    };
}

// ---------------------------------------------------------------------------------------------
// Calibrated constants (see --selftest and docs/systems/ORIGINALITY_CHECK.md → Calibration).
const T = {
    FAIL: 0.20,        // combined distance below this: near-copy → FAIL
    WARN: 0.28,        // below this: similar → WARN (human review)
    W_FP: 0.5,         // combined distance = W_FP × fingerprint distance + (1 − W_FP) × pixel distance
    W_HASH: 0.55,      // fingerprint distance: weight of the dHash distance (512 sign bits + decisive mask)
    W_SIL: 0.25,       // ... of the 12×12 silhouette (Jaccard) distance
    W_COL: 0.10,       // ... of the palette-histogram distance (weak: our palette is U7's)
    W_ASP: 0.10,       // ... of the aspect-ratio term (1 at a factor-2 difference)
    MIN_PX: 64,        // frames with fewer opaque pixels are "low information": not graded
    MIN_INFO: 40,      // ... and so are frames with fewer decisive dHash bits than this (of 512)
    DECISIVE: 0.15,    // a dHash bit is decisive when the grey step is above this (in std units)
    SHORTLIST: 64,     // stage 1b: frames re-fingerprinted at their own size
    VERIFY: 32,        // stage 2: frames decoded and compared pixel by pixel
    UPSCALE_UNIFORM: 0.55, // a pixel-art upscale: at least this share of r×r blocks is one colour
    TEX_MIN_COLOURS: 4,    // texture mode: 8×8 blocks (and U7 tiles) with fewer colours are not compared
    TEX_QUARTER_COLOURS: 4,// ... and 4×4 quarters with fewer colours do not vote
    TEX_EDITS: 2,      // texture mode: pixels of an 8×8 block that may differ from the tile (edits)
    TEX_MIN_MINORITY: 16, // ... and blocks need this many pixels outside their most common colour
    TEX_MAX_BLOCKS: 256,  // ... and large images are sampled to about this many blocks per grid phase
    TEX_FAIL: 0.5,     // texture distance (1 − matched share of blocks) at or below this: copied texture → FAIL
    TEX_WARN: 0.9,     // below this (more than 10 % of blocks match): WARN
    MIN_COMPLEXITY: 40 // information floor (deflate bytes of the colour-label image): a match with a simpler
                       // frame (a plain square, a stripe) can WARN but never FAIL
};

// ---------------------------------------------------------------------------------------------
// U7 sources. The project folders "Ultima VII - * [GOG.com]/" hold only shortcuts; the data lives
// in the GOG install. Override with UF_U7_BG / UF_U7_SI (a STATIC folder).
const GAME_DIRS = {
    BG: [process.env.UF_U7_BG, path.join(ROOT, 'Ultima VII - The Black Gate [GOG.com]', 'STATIC'),
        'C:/Program Files/GOG Galaxy/Games/Ultima 7/STATIC', 'C:/Program Files (x86)/GOG Galaxy/Games/Ultima 7/STATIC',
        'C:/GOG Games/Ultima 7/STATIC'],
    SI: [process.env.UF_U7_SI, path.join(ROOT, 'Ultima VII - Serpent Isle [GOG.com]', 'STATIC'),
        'C:/Program Files/GOG Galaxy/Games/Ultima 7 - Serpent Isle/STATIC', 'C:/Program Files (x86)/GOG Galaxy/Games/Ultima 7 - Serpent Isle/STATIC',
        'C:/GOG Games/Ultima 7 - Serpent Isle/STATIC']
};
// Every shape-format art library of both games. Fonts, menus and end-game screens are left out.
const SOURCE_FILES = { BG: ['SHAPES.VGA', 'FACES.VGA', 'GUMPS.VGA', 'SPRITES.VGA'], SI: ['SHAPES.VGA', 'FACES.VGA', 'GUMPS.VGA', 'SPRITES.VGA', 'PAPERDOL.VGA'] };

function findGameDir(game) {
    for (const d of GAME_DIRS[game]) {
        if (d && fs.existsSync(path.join(d, 'SHAPES.VGA')) && fs.existsSync(path.join(d, 'PALETTES.FLX'))) return d;
    }
    return null;
}

// ---------------------------------------------------------------------------------------------
// Flex files and the shape format (same decoding as tools/generate_all_u7_assets.js decodeShape and
// decodeFlatTile, with the entry table read instead of assumed, and every read bounds-checked).
function flexEntries(buf) {
    const count = buf.readUInt32LE(84);
    const out = [];
    for (let i = 0; i < count; i++) {
        const off = buf.readUInt32LE(128 + i * 8), len = buf.readUInt32LE(132 + i * 8);
        out.push(off && len && off + len <= buf.length ? { off, len } : null);
    }
    return out;
}

// PALETTES.FLX record 0 = daylight; 6-bit DAC values scaled to 8 bits (as the existing tools do).
function readPalette(file) {
    const buf = fs.readFileSync(file);
    const e = flexEntries(buf)[0];
    const pal = new Uint8Array(768);
    for (let i = 0; i < 768; i++) pal[i] = Math.min(255, Math.round(buf[e.off + i] * 255 / 63));
    return pal;
}

// Frame count of a shape: RLE shapes start with their own length; flat shapes are 8×8 tiles of 64 bytes.
function shapeInfo(buf, entry) {
    if (!entry) return null;
    const { off, len } = entry;
    if (len >= 8 && buf.readUInt32LE(off) === len) {
        const f0 = buf.readUInt32LE(off + 4);
        const nf = (f0 - 4) / 4;
        if (!Number.isInteger(nf) || nf <= 0 || nf > 4096) return null;
        return { rle: true, frames: nf };
    }
    if (len % 64 === 0) return { rle: false, frames: len / 64 };
    return null;
}

// Decodes one frame to palette indices (255 = transparent). Returns { w, h, idx } or null.
function decodeFrame(buf, entry, info, f) {
    const { off, len } = entry;
    const end = off + len;
    if (!info.rle) {
        const idx = new Uint8Array(64);
        const p = off + f * 64;
        for (let i = 0; i < 64; i++) idx[i] = buf[p + i];
        return { w: 8, h: 8, idx, flat: true };
    }
    const fo = buf.readUInt32LE(off + 4 + f * 4);
    if (fo + 8 > len) return null;
    const p0 = off + fo;
    const xr = buf.readInt16LE(p0), xl = buf.readInt16LE(p0 + 2), ya = buf.readInt16LE(p0 + 4), yb = buf.readInt16LE(p0 + 6);
    const w = xl + xr + 1, h = ya + yb + 1;
    if (w <= 0 || h <= 0 || w > 1024 || h > 1024) return null;
    const idx = new Uint8Array(w * h).fill(255);
    let p = p0 + 8;
    const put = (x, y, c) => { if (x >= 0 && x < w && y >= 0 && y < h) idx[y * w + x] = c; };
    while (p + 2 <= end) {
        const scan = buf.readUInt16LE(p); p += 2;
        if (scan === 0) break;
        if (p + 4 > end) break;
        const encoded = scan & 1, count = scan >> 1;
        const sx = buf.readInt16LE(p), sy = buf.readInt16LE(p + 2); p += 4;
        const y = ya + sy, x0 = xl + sx;
        if (!encoded) {
            for (let i = 0; i < count && p < end; i++) { const c = buf[p++]; if (c !== 255) put(x0 + i, y, c); }
        } else {
            let done = 0;
            while (done < count && p < end) {
                const b = buf[p++];
                const n = b >> 1;
                if (b & 1) {
                    const c = buf[p++];
                    if (c !== 255) for (let k = 0; k < n; k++) put(x0 + done + k, y, c);
                } else {
                    for (let k = 0; k < n && p < end; k++) { const c = buf[p++]; if (c !== 255) put(x0 + done + k, y, c); }
                }
                if (n === 0) break; // a zero run would loop forever on corrupt data
                done += n;
            }
        }
    }
    return { w, h, idx, flat: false };
}

// Opens every source file once; decodes frames on demand (for the report and the self-test).
class U7Library {
    constructor(sourceIds) {
        this.games = {};
        this.sources = [];
        for (const game of ['BG', 'SI']) {
            const dir = findGameDir(game);
            if (!dir) continue;
            const pal = readPalette(path.join(dir, 'PALETTES.FLX'));
            this.games[game] = { dir, pal };
            for (const file of SOURCE_FILES[game]) {
                const id = `${game}:${file.replace(/\..*$/, '')}`;
                if (sourceIds && !sourceIds.includes(id)) continue;
                const full = path.join(dir, file);
                if (!fs.existsSync(full)) continue;
                const buf = fs.readFileSync(full);
                this.sources.push({ id, game, file, path: full, size: buf.length, buf, entries: flexEntries(buf), pal });
            }
        }
    }
    source(id) { return this.sources.find(s => s.id === id) || null; }
    frame(srcId, shape, f) {
        const s = this.source(srcId);
        if (!s) return null;
        const entry = s.entries[shape];
        const info = shapeInfo(s.buf, entry);
        if (!info || f >= info.frames) return null;
        const fr = decodeFrame(s.buf, entry, info, f);
        return fr ? idxToRGBA(fr, s.pal) : null;
    }
}

function idxToRGBA(fr, pal) {
    const { w, h, idx } = fr;
    const px = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
        const c = idx[i];
        if (c === 255 && !fr.flat) continue;
        px[i * 4] = pal[c * 3]; px[i * 4 + 1] = pal[c * 3 + 1]; px[i * 4 + 2] = pal[c * 3 + 2]; px[i * 4 + 3] = 255;
    }
    return { w, h, px };
}

// ---------------------------------------------------------------------------------------------
// Palette (for the histogram and colour snapping): the Black Gate daylight palette; every colour is
// mapped to the first palette index with the nearest RGB ("canonical index").
let PAL = null;           // Uint8Array(768)
let PAL_CANON = null;     // canonical index per index
const snapCache = new Map();
function setPalette(pal) {
    PAL = pal;
    PAL_CANON = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
        PAL_CANON[i] = i;
        for (let j = 0; j < i; j++) {
            if (pal[j * 3] === pal[i * 3] && pal[j * 3 + 1] === pal[i * 3 + 1] && pal[j * 3 + 2] === pal[i * 3 + 2]) { PAL_CANON[i] = j; break; }
        }
    }
    snapCache.clear();
}
function snapIndex(r, g, b) {
    const key = (r << 16) | (g << 8) | b;
    let v = snapCache.get(key);
    if (v !== undefined) return v;
    let best = 1e9;
    v = 0;
    for (let i = 0; i < 255; i++) {
        const dr = PAL[i * 3] - r, dg = PAL[i * 3 + 1] - g, db = PAL[i * 3 + 2] - b;
        const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
        if (d < best) { best = d; v = i; }
    }
    v = PAL_CANON[v];
    snapCache.set(key, v);
    return v;
}

// ---------------------------------------------------------------------------------------------
// Image helpers. An image is { w, h, px: Uint8Array(w*h*4) } with alpha 0 or 255.
function isOpaque(px, i) {
    // Masters use a flat magenta background (art/README.md); treat it as transparent.
    return px[i + 3] >= 128 && !(px[i] === 255 && px[i + 1] === 0 && px[i + 2] === 255);
}
function normaliseAlpha(img) {
    const { w, h, px } = img;
    const out = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h * 4; i += 4) {
        if (isOpaque(px, i)) { out[i] = px[i]; out[i + 1] = px[i + 1]; out[i + 2] = px[i + 2]; out[i + 3] = 255; }
    }
    return { w, h, px: out };
}
function subImage(img, x0, y0, w, h) {
    const px = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) {
        const s = ((y0 + y) * img.w + x0) * 4;
        px.set(img.px.subarray(s, s + w * 4), y * w * 4);
    }
    return { w, h, px };
}
function contentBox(img) {
    let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1;
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
        if (img.px[(y * img.w + x) * 4 + 3] >= 128) {
            if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
    }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
function crop(img) {
    const b = contentBox(img);
    return b ? subImage(img, b.x, b.y, b.w, b.h) : null;
}
function mirror(img) {
    const { w, h, px } = img;
    const out = new Uint8Array(px.length);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const s = (y * w + x) * 4, d = (y * w + (w - 1 - x)) * 4;
        out[d] = px[s]; out[d + 1] = px[s + 1]; out[d + 2] = px[s + 2]; out[d + 3] = px[s + 3];
    }
    return { w, h, px: out };
}
function transpose(img) {
    const { w, h, px } = img;
    const out = new Uint8Array(px.length);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const s = (y * w + x) * 4, d = (x * h + y) * 4;
        out[d] = px[s]; out[d + 1] = px[s + 1]; out[d + 2] = px[s + 2]; out[d + 3] = px[s + 3];
    }
    return { w: h, h: w, px: out };
}
function scaleNearest(img, k) {
    const W = img.w * k, H = img.h * k;
    const out = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const s = ((Math.floor(y / k)) * img.w + Math.floor(x / k)) * 4, d = (y * W + x) * 4;
        out[d] = img.px[s]; out[d + 1] = img.px[s + 1]; out[d + 2] = img.px[s + 2]; out[d + 3] = img.px[s + 3];
    }
    return { w: W, h: H, px: out };
}
// Resample to W×H the way an editor would (premultiplied box filter, then alpha ≥ 50 % and palette snap).
function resizeSnap(img, W, H) {
    const { w, h, px } = img;
    const n = w * h;
    const R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n), A = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        const a = px[i * 4 + 3] >= 128 ? 1 : 0;
        A[i] = a; R[i] = px[i * 4] * a; G[i] = px[i * 4 + 1] * a; B[i] = px[i * 4 + 2] * a;
    }
    const r = resample(R, w, h, W, H), g = resample(G, w, h, W, H), b = resample(B, w, h, W, H), al = resample(A, w, h, W, H);
    const out = new Uint8Array(W * H * 4);
    for (let i = 0; i < W * H; i++) {
        if (al[i] < 0.5) continue;
        const k = snapIndex(Math.round(r[i] / al[i]), Math.round(g[i] / al[i]), Math.round(b[i] / al[i]));
        out[i * 4] = PAL[k * 3]; out[i * 4 + 1] = PAL[k * 3 + 1]; out[i * 4 + 2] = PAL[k * 3 + 2]; out[i * 4 + 3] = 255;
    }
    return { w: W, h: H, px: out };
}
// Bilinear 2× (premultiplied), then alpha ≥ 50 % and palette snap: a smooth upscale as an editor does it.
function upscaleBilinear2(img) {
    const { w, h, px } = img;
    const W = w * 2, H = h * 2;
    const out = new Uint8Array(W * H * 4);
    const at = (x, y, c) => {
        x = x < 0 ? 0 : x >= w ? w - 1 : x; y = y < 0 ? 0 : y >= h ? h - 1 : y;
        const i = (y * w + x) * 4;
        const a = px[i + 3] >= 128 ? 1 : 0;
        return c === 3 ? a : px[i + c] * a;
    };
    for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
        const sx = (X + 0.5) / 2 - 0.5, sy = (Y + 0.5) / 2 - 0.5;
        const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
        const v = [0, 0, 0, 0];
        for (let c = 0; c < 4; c++) {
            v[c] = at(x0, y0, c) * (1 - fx) * (1 - fy) + at(x0 + 1, y0, c) * fx * (1 - fy) + at(x0, y0 + 1, c) * (1 - fx) * fy + at(x0 + 1, y0 + 1, c) * fx * fy;
        }
        if (v[3] < 0.5) continue;
        const k = snapIndex(Math.round(v[0] / v[3]), Math.round(v[1] / v[3]), Math.round(v[2] / v[3]));
        const d = (Y * W + X) * 4;
        out[d] = PAL[k * 3]; out[d + 1] = PAL[k * 3 + 1]; out[d + 2] = PAL[k * 3 + 2]; out[d + 3] = 255;
    }
    return { w: W, h: H, px: out };
}

// Exact area (box) resampling of a float plane, separable; works for up- and down-scaling.
const weightCache = new Map();
function axisWeights(n, N) {
    const key = n * 65536 + N;
    let wts = weightCache.get(key);
    if (wts) return wts;
    wts = [];
    const scale = n / N;
    for (let i = 0; i < N; i++) {
        const a = i * scale, b = (i + 1) * scale;
        const list = [];
        for (let s = Math.floor(a); s < Math.ceil(b) && s < n; s++) {
            const ov = Math.min(b, s + 1) - Math.max(a, s);
            if (ov > 1e-9) list.push(s, ov / scale);
        }
        wts.push(list);
    }
    weightCache.set(key, wts);
    return wts;
}
function resample(src, w, h, W, H) {
    const wx = axisWeights(w, W), wy = axisWeights(h, H);
    const tmp = new Float32Array(W * h);
    for (let y = 0; y < h; y++) {
        const row = y * w;
        for (let X = 0; X < W; X++) {
            const l = wx[X];
            let s = 0;
            for (let k = 0; k < l.length; k += 2) s += src[row + l[k]] * l[k + 1];
            tmp[y * W + X] = s;
        }
    }
    const out = new Float32Array(W * H);
    for (let Y = 0; Y < H; Y++) {
        const l = wy[Y];
        for (let X = 0; X < W; X++) {
            let s = 0;
            for (let k = 0; k < l.length; k += 2) s += tmp[l[k] * W + X] * l[k + 1];
            out[Y * W + X] = s;
        }
    }
    return out;
}

// ---------------------------------------------------------------------------------------------
// Fingerprints of a cropped image.
//  hash: 32 words. Words 0–15 = 512 sign bits: dHash 16×16 horizontal (grey grid 17×16, bit = right
//        brighter than left) then 16×16 vertical (grid 16×17, bit = lower brighter than upper).
//        Words 16–31 = the matching "decisive" mask: the step is larger than T.DECISIVE. A flat area
//        gives no decisive bits, so two flat images are not "close" just because both hash to zeros.
//        Grey = HSL lightness (a hue shift, the usual recolour, keeps it), normalised to mean 0 / std 1
//        over the opaque pixels; transparent pixels count as the mean, so the outline matters little
//        here (the silhouette carries it).
//  sil:  5 words = 144 bits: the alpha mask area-averaged to 12×12, bit = coverage ≥ 50 %.
//  info: number of decisive hash bits; low = a flat or tiny image.
const HW = 32;
function lightness(r, g, b) { return (Math.max(r, g, b) + Math.min(r, g, b)) / 2; }
function fingerprint(img) {
    const { w, h, px } = img;
    const n = w * h;
    const Y = new Float32Array(n), A = new Float32Array(n);
    let cnt = 0, sum = 0, sum2 = 0;
    for (let i = 0; i < n; i++) {
        if (px[i * 4 + 3] < 128) continue;
        const y = lightness(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
        Y[i] = y; A[i] = 1; cnt++; sum += y; sum2 += y * y;
    }
    const mean = cnt ? sum / cnt : 0;
    const sd = cnt ? Math.sqrt(Math.max(0, sum2 / cnt - mean * mean)) : 0;
    const G = new Float32Array(n);
    if (sd > 1e-6) for (let i = 0; i < n; i++) if (A[i]) G[i] = (Y[i] - mean) / sd;
    const hash = new Uint32Array(HW);
    let info = 0;
    const setBit = (bit, d) => {
        if (Math.abs(d) <= T.DECISIVE) return;
        info++;
        hash[16 + (bit >> 5)] |= (1 << (bit & 31)) >>> 0;
        if (d > 0) hash[bit >> 5] |= (1 << (bit & 31)) >>> 0;
    };
    const gh = resample(G, w, h, 17, 16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) setBit(y * 16 + x, gh[y * 17 + x + 1] - gh[y * 17 + x]);
    const gv = resample(G, w, h, 16, 17);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) setBit(256 + y * 16 + x, gv[(y + 1) * 16 + x] - gv[y * 16 + x]);
    const sil = new Uint32Array(5);
    const sm = resample(A, w, h, 12, 12);
    for (let i = 0; i < 144; i++) if (sm[i] >= 0.5) sil[i >> 5] |= (1 << (i & 31)) >>> 0;
    return { w, h, n: cnt, info, hash, sil };
}
// Palette histogram (canonical indices), as a sparse list of [index, fraction].
function histogram(img) {
    const counts = new Map();
    let n = 0;
    for (let i = 0; i < img.w * img.h; i++) {
        const o = i * 4;
        if (img.px[o + 3] < 128) continue;
        const k = snapIndex(img.px[o], img.px[o + 1], img.px[o + 2]);
        counts.set(k, (counts.get(k) || 0) + 1);
        n++;
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k, c]) => [k, c / n]);
}

function popcount(x) {
    x = x - ((x >>> 1) & 0x55555555);
    x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
    return (((x + (x >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24;
}

// The six index variants of a frame: 1×, 1× mirrored, 2× (bilinear), 2× mirrored, 0.5× (box), 0.5× mirrored.
function frameVariants(img) {
    const base = img;
    const up = crop(upscaleBilinear2(base)) || base;
    const down = (base.w >= 4 && base.h >= 4) ? (crop(resizeSnap(base, Math.ceil(base.w / 2), Math.ceil(base.h / 2))) || base) : base;
    return [base, mirror(base), up, mirror(up), down, mirror(down)];
}
const NV = 6;

// ---------------------------------------------------------------------------------------------
// Index build.
// Texture patterns: a flat 8×8 ground tile is stored as its canonical colour-label pattern (colours
// renumbered in order of first appearance), which keeps the layout and drops the colours: a recoloured
// copy has the same pattern. Only these labels are stored, never the tile's pixels.
function labelPattern(keys) {
    const map = new Map();
    let s = '';
    for (const k of keys) {
        let v = map.get(k);
        if (v === undefined) { v = map.size; map.set(k, v); }
        s += String.fromCharCode(48 + v);
    }
    return { s, colours: map.size };
}
// Information content: the deflated size of the image's colour labels (colours renumbered in order of
// first appearance, transparent = 255). A plain panel or a regular stripe compresses to a few bytes;
// a detailed sprite does not.
function complexity(img) {
    const map = new Map();
    const b = Buffer.alloc(img.w * img.h + 4);
    b.writeUInt16LE(img.w, 0); b.writeUInt16LE(img.h, 2);
    for (let i = 0; i < img.w * img.h; i++) {
        const o = i * 4;
        if (img.px[o + 3] < 128) { b[4 + i] = 255; continue; }
        const k = (img.px[o] << 16) | (img.px[o + 1] << 8) | img.px[o + 2];
        let v = map.get(k);
        if (v === undefined) { v = Math.min(254, map.size); map.set(k, v); }
        b[4 + i] = v;
    }
    return zlib.deflateRawSync(b, { level: 9 }).length;
}
function buildIndex(outFile, opts = {}) {
    const t0 = Date.now();
    const lib = new U7Library(opts.sources);
    if (!lib.sources.length) throw new Error('no U7 shape files found (looked in: ' + GAME_DIRS.BG.concat(GAME_DIRS.SI).filter(Boolean).join('; ') + ')');
    setPalette(lib.games.BG ? lib.games.BG.pal : lib.sources[0].pal);
    const meta = [];            // [srcIndex, shape, frame, w, h, n, info, duplicates, flags]
    const hashes = [];          // Uint32Array(HW*NV) per unique frame
    const sils = [];            // Uint32Array(5*NV)
    const hists = [];           // sparse histograms
    const tex = [];             // [row, pattern] for flat tiles
    const seen = new Map();     // exact-duplicate detection
    let decoded = 0, empty = 0, dups = 0, failed = 0;
    for (let si = 0; si < lib.sources.length; si++) {
        const src = lib.sources[si];
        for (let shape = 0; shape < src.entries.length; shape++) {
            const entry = src.entries[shape];
            const info = shapeInfo(src.buf, entry);
            if (!info) continue;
            for (let f = 0; f < info.frames; f++) {
                let fr;
                try { fr = decodeFrame(src.buf, entry, info, f); } catch (e) { fr = null; }
                if (!fr) { failed++; continue; }
                decoded++;
                const rgba = idxToRGBA(fr, src.pal);
                const img = crop(rgba);
                if (!img) { empty++; continue; }
                const key = img.w + 'x' + img.h + ':' + Buffer.from(img.px).toString('base64');
                const flags = (fr.flat ? 1 : 0);
                if (seen.has(key)) {
                    dups++;
                    meta[seen.get(key)][7]++;   // duplicate count on the first occurrence
                    continue;
                }
                const vars = frameVariants(img);
                const H = new Uint32Array(HW * NV), S = new Uint32Array(5 * NV);
                let fp0 = null;
                vars.forEach((v, k) => {
                    const fp = fingerprint(v);
                    if (k === 0) fp0 = fp;
                    H.set(fp.hash, k * HW); S.set(fp.sil, k * 5);
                });
                seen.set(key, meta.length);
                if (fr.flat && img.w === 8 && img.h === 8) tex.push([meta.length, labelPattern(rgbKeys(img)).s]);
                meta.push([si, shape, f, img.w, img.h, fp0.n, fp0.info, 0, flags, complexity(img)]);
                hashes.push(H); sils.push(S);
                hists.push(histogram(img));
            }
        }
        if (!opts.quiet) console.log(`  ${src.id}: done (${meta.length} unique frames so far, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    }
    // Pack.
    const N = meta.length;
    const hashBuf = Buffer.alloc(N * HW * NV * 4), silBuf = Buffer.alloc(N * 5 * NV * 4);
    for (let i = 0; i < N; i++) {
        Buffer.from(hashes[i].buffer).copy(hashBuf, i * HW * NV * 4);
        Buffer.from(sils[i].buffer).copy(silBuf, i * 5 * NV * 4);
    }
    const histOff = [0], histBytes = [];
    for (const h of hists) {
        for (const [k, fr] of h) histBytes.push(k, Math.max(1, Math.round(fr * 255)));
        histOff.push(histBytes.length / 2);
    }
    const index = {
        version: INDEX_VERSION,
        note: 'U7-derived fingerprints for tools/originality_check.js. Local only (reference/ is untracked); never loaded by the game.',
        built: new Date().toISOString(),
        params: { variants: ['1x', '1x-mirror', '2x-bilinear', '2x-bilinear-mirror', '0.5x-box', '0.5x-box-mirror'], hashBits: 512, hashWords: HW, silBits: 144, decisive: T.DECISIVE, grey: 'HSL lightness' },
        sources: lib.sources.map(s => ({ id: s.id, game: s.game, file: s.file, path: s.path, size: s.size })),
        stats: { decoded, empty, duplicates: dups, undecodable: failed, unique: N, flatTiles: tex.length },
        fields: ['source', 'shape', 'frame', 'w', 'h', 'opaquePx', 'info', 'duplicates', 'flags(1=flat 8x8 tile)', 'complexity'],
        meta,
        hash: hashBuf.toString('base64'),
        sil: silBuf.toString('base64'),
        histOffsets: Buffer.from(new Uint32Array(histOff).buffer).toString('base64'),
        hist: Buffer.from(histBytes).toString('base64'),
        texture: tex
    };
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(index));
    const secs = (Date.now() - t0) / 1000;
    return { file: outFile, decoded, empty, dups, failed, unique: N, flatTiles: tex.length, secs, bytes: fs.statSync(outFile).size, sources: index.sources };
}
function rgbKeys(img) {
    const out = new Array(img.w * img.h);
    for (let i = 0; i < img.w * img.h; i++) {
        const o = i * 4;
        out[i] = img.px[o + 3] < 128 ? -1 : (img.px[o] << 16) | (img.px[o + 1] << 8) | img.px[o + 2];
    }
    return out;
}

function u32(b64) {
    const b = Buffer.from(b64, 'base64');
    return new Uint32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
}
// The 8 symmetries of a square: [x, y] of the source pixel for output (x, y) in an n×n block.
const DIHEDRAL = [
    (x, y, n) => [x, y], (x, y, n) => [n - 1 - x, y], (x, y, n) => [x, n - 1 - y], (x, y, n) => [n - 1 - x, n - 1 - y],
    (x, y, n) => [y, x], (x, y, n) => [n - 1 - y, x], (x, y, n) => [y, n - 1 - x], (x, y, n) => [n - 1 - y, n - 1 - x]
];
// An 8×8 label block is worth comparing when it has enough colours, is not a flat field with a few
// specks (at least TEX_MIN_MINORITY pixels outside its most common colour), and is not a stripe or a
// gradient (at least 3 different rows and 3 different columns).
function blockInformative(labels, minColours) {
    const counts = new Map();
    let top = 0;
    for (const l of labels) { const n = (counts.get(l) || 0) + 1; counts.set(l, n); if (n > top) top = n; }
    if (counts.size < minColours || 64 - top < T.TEX_MIN_MINORITY) return false;
    const rows = new Set(), cols = new Set();
    for (let y = 0; y < 8; y++) rows.add(labels.slice(y * 8, y * 8 + 8).join(','));
    for (let x = 0; x < 8; x++) { let c = ''; for (let y = 0; y < 8; y++) c += labels[y * 8 + x] + ','; cols.add(c); }
    return rows.size >= 3 && cols.size >= 3;
}
// Same-colour mask of an 8×8 block: 56 horizontal + 56 vertical neighbour pairs, 4 words.
function sameMask(labels, out, off) {
    for (let k = 0; k < 4; k++) out[off + k] = 0;
    let bit = 0;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 7; x++, bit++) if (labels[y * 8 + x] === labels[y * 8 + x + 1]) out[off + (bit >> 5)] |= (1 << (bit & 31)) >>> 0;
    for (let y = 0; y < 7; y++) for (let x = 0; x < 8; x++, bit++) if (labels[y * 8 + x] === labels[(y + 1) * 8 + x]) out[off + (bit >> 5)] |= (1 << (bit & 31)) >>> 0;
}
function loadIndex(file) {
    if (!fs.existsSync(file)) return null;
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (j.version !== INDEX_VERSION) throw new Error(`${file}: index version ${j.version}, this tool needs ${INDEX_VERSION}: rebuild with --build-index`);
    const N = j.meta.length;
    const idx = {
        file, raw: j, N, meta: j.meta, sources: j.sources,
        hash: u32(j.hash), sil: u32(j.sil),
        histOff: u32(j.histOffsets), hist: new Uint8Array(Buffer.from(j.hist, 'base64')),
        graded: new Uint8Array(N), aspect: new Float32Array(N)
    };
    // Sprite mode compares every frame except the flat 8×8 ground tiles (texture mode has those) and
    // frames too small or flat to judge.
    idx.gradedList = [];
    for (let i = 0; i < N; i++) {
        const m = j.meta[i];
        idx.aspect[i] = Math.log(m[3] / m[4]);
        idx.graded[i] = (!(m[8] & 1) && m[5] >= T.MIN_PX && m[6] >= T.MIN_INFO) ? 1 : 0;
        if (idx.graded[i]) idx.gradedList.push(i);
    }
    idx.gradedCount = idx.gradedList.length;
    // Texture tables: every informative flat tile in its 8 symmetries: whole-block patterns, 4×4
    // quarter patterns, and same-colour masks.
    idx.texExact = new Map();
    idx.texQuarter = new Map();
    idx.texRows = [];
    const masks = [];
    for (const [row, pat] of j.texture || []) {
        const labels = Array.from(pat, c => c.charCodeAt(0) - 48);
        if (!blockInformative(labels, T.TEX_MIN_COLOURS)) continue;
        const ti = idx.texRows.length;
        idx.texRows.push(row);
        DIHEDRAL.forEach((f, d) => {
            const o = new Array(64);
            for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const [sx, sy] = f(x, y, 8); o[y * 8 + x] = labels[sy * 8 + sx]; }
            const key = labelPattern(o).s;
            if (!idx.texExact.has(key)) idx.texExact.set(key, ti * 8 + d);
            masks.push(o);
            for (let q = 0; q < 4; q++) {
                const qx = (q & 1) * 4, qy = (q >> 1) * 4, part = [];
                for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) part.push(o[(qy + y) * 8 + qx + x]);
                const lp = labelPattern(part);
                if (lp.colours < T.TEX_QUARTER_COLOURS) continue;
                const k = q + lp.s;
                let list = idx.texQuarter.get(k);
                if (!list) idx.texQuarter.set(k, list = []);
                list.push(ti * 8 + d);
            }
        });
    }
    idx.texMask = new Uint32Array(masks.length * 4);
    idx.texSame = new Uint8Array(masks.length);
    idx.texLabels = new Uint8Array(masks.length * 64);
    idx.texColours = new Uint8Array(masks.length);
    masks.forEach((o, k) => {
        sameMask(o, idx.texMask, k * 4);
        let n = 0;
        for (let w = 0; w < 4; w++) n += popcount(idx.texMask[k * 4 + w]);
        idx.texSame[k] = n;
        idx.texLabels.set(o, k * 64);
        idx.texColours[k] = new Set(o).size;
    });
    // Stage 2 decodes frames from the game files; without them the check runs on fingerprints only.
    const lib = new U7Library();
    idx.lib = lib.sources.length ? lib : null;
    idx.frameCache = new Map();
    setPalette(lib.games.BG ? lib.games.BG.pal : (lib.sources[0] ? lib.sources[0].pal : readUfHex()));
    return idx;
}
// Fallback palette when the game files are absent: art/palette/uf.hex (the same 256 colours).
function readUfHex() {
    const pal = new Uint8Array(768);
    const hex = fs.readFileSync(path.join(ROOT, 'art', 'palette', 'uf.hex'), 'utf8').split(/\r?\n/).filter(Boolean);
    hex.slice(0, 256).forEach((h, i) => { const v = parseInt(h.replace('#', ''), 16); pal[i * 3] = (v >> 16) & 255; pal[i * 3 + 1] = (v >> 8) & 255; pal[i * 3 + 2] = v & 255; });
    return pal;
}

// ---------------------------------------------------------------------------------------------
// Pixel-art upscales. A copier who scales a U7 frame 2× (nearest neighbour) and touches it up leaves
// r×r blocks that are nearly all one colour on one phase of the grid. nativeScale finds the largest
// such r (2–8); modeDown shrinks the image back by majority vote per block, which undoes most light
// edits. A master drawn at 1:1 gives r = 1 and is used as it is. Stage 2 also uses modeDown whenever
// it compares at a whole-number scale, detected or not.
function keyImage(img) {
    // colour keys (-1 = transparent), computed once per image
    if (!img._keys) {
        const k = new Int32Array(img.w * img.h);
        for (let i = 0; i < k.length; i++) { const o = i * 4; k[i] = img.px[o + 3] < 128 ? -1 : (img.px[o] << 16) | (img.px[o + 1] << 8) | img.px[o + 2]; }
        Object.defineProperty(img, '_keys', { value: k, enumerable: false });
    }
    return img._keys;
}
function blockUniformity(img, r, px, py) {
    const K = keyImage(img);
    let uni = 0, total = 0;
    // large images: every k-th block row and column (at most about 32 × 32 blocks are read)
    const ky = Math.max(1, Math.ceil((img.h - py) / r / 32)), kx = Math.max(1, Math.ceil((img.w - px) / r / 32));
    for (let by = py; by + r <= img.h; by += r * ky) for (let bx = px; bx + r <= img.w; bx += r * kx) {
        const k0 = K[by * img.w + bx];
        let same = true;
        for (let y = 0; y < r && same; y++) {
            const row = (by + y) * img.w + bx;
            for (let x = 0; x < r; x++) if (K[row + x] !== k0) { same = false; break; }
        }
        if (same && k0 < 0) continue; // empty block: no evidence
        total++;
        if (same) uni++;
    }
    return total >= 16 ? uni / total : 0;
}
function bestPhase(img, r) {
    let best = -1, bp = [0, 0];
    const us = [];
    for (let py = 0; py < r; py++) for (let px = 0; px < r; px++) {
        const u = blockUniformity(img, r, px, py);
        us.push(u);
        if (u > best) { best = u; bp = [px, py]; }
    }
    us.sort((a, b) => a - b);
    return { px: bp[0], py: bp[1], uniform: best, median: us[Math.floor((us.length - 1) / 2)] };
}
// Tests the prime block sizes 2, 3, 5, 7 and then the composites whose factors passed (an image
// scaled 4× is also scaled 2×), so a 1:1 master costs four scans.
function nativeScale(img) {
    let found = { r: 1, px: 0, py: 0, uniform: 0 };
    const passed = new Set();
    for (const r of [2, 3, 5, 7, 4, 6, 8]) {
        if (img.w < 6 * r || img.h < 6 * r) continue;
        if (r === 4 && !passed.has(2)) continue;
        if (r === 6 && !(passed.has(2) && passed.has(3))) continue;
        if (r === 8 && !passed.has(4)) continue;
        const b = bestPhase(img, r);
        if (b.uniform >= T.UPSCALE_UNIFORM && b.uniform - b.median >= 0.2) {
            passed.add(r);
            if (r > found.r) found = { r, px: b.px, py: b.py, uniform: b.uniform };
        }
    }
    return found;
}
function modeDown(img, r, px, py) {
    const padX = (r - px) % r, padY = (r - py) % r;
    const W = Math.ceil((img.w + padX) / r), H = Math.ceil((img.h + padY) / r);
    const out = new Uint8Array(W * H * 4);
    const counts = new Map();
    for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
        counts.clear();
        let bestK = -1, bestN = 0;
        for (let y = 0; y < r; y++) for (let x = 0; x < r; x++) {
            const sx = X * r + x - padX, sy = Y * r + y - padY;
            let k = -1;
            if (sx >= 0 && sy >= 0 && sx < img.w && sy < img.h) {
                const o = (sy * img.w + sx) * 4;
                if (img.px[o + 3] >= 128) k = (img.px[o] << 16) | (img.px[o + 1] << 8) | img.px[o + 2];
            }
            const n = (counts.get(k) || 0) + 1;
            counts.set(k, n);
            if (n > bestN || (n === bestN && k !== -1 && bestK === -1)) { bestN = n; bestK = k; }
        }
        if (bestK < 0) continue;
        const d = (Y * W + X) * 4;
        out[d] = bestK >> 16; out[d + 1] = (bestK >> 8) & 255; out[d + 2] = bestK & 255; out[d + 3] = 255;
    }
    return crop({ w: W, h: H, px: out });
}

// ---------------------------------------------------------------------------------------------
// Texture mode: an opaque candidate (a ground tile or block) is cut into 8×8 blocks on each of the 64
// grid phases. Only informative blocks count (blockInformative). A block matches a U7 ground tile
// (in any of its 8 symmetries) when
//  - exact: the colour-label patterns are equal (survives any recolour that keeps colours apart,
//    mirroring, turning, whole-number scaling and shifting);
//  - near: the labels correspond one to one except for at most TEX_EDITS pixels (light edits);
//  - merged: the block's colours are a function of the tile's (each tile colour became one block
//    colour; a recolour that merged up to 3 colours) except for at most TEX_EDITS pixels.
// Near and merged candidates come from 4×4 quarter patterns on every phase, and from comparing every
// tile on the best phase (or phase 0,0 when nothing matched). Texture distance = 1 − the matched
// share of blocks on the best phase.
const MV_COUNT = new Uint8Array(64 * 64), MV_BEST = new Uint8Array(64);
function mapViolations(a, ao, b, bo) {
    // pixels of b that disagree with the most common b-label of their a-label (labels < 64)
    const touched = [];
    let keep = 0;
    for (let i = 0; i < 64; i++) {
        const la = a[ao + i], k = la * 64 + b[bo + i];
        if (MV_COUNT[k] === 0) touched.push(k);
        const n = ++MV_COUNT[k];
        if (n > MV_BEST[la]) { keep += n - MV_BEST[la]; MV_BEST[la] = n; }
    }
    for (const k of touched) { MV_COUNT[k] = 0; MV_BEST[(k / 64) | 0] = 0; }
    return 64 - keep;
}
function blockMatch(index, labels, bm, bColours, td) {
    // one tile-orientation td against a block (labels: Uint8Array(64)): 'near', 'merged' or null
    const tc = index.texColours[td];
    const merges = tc - bColours;
    const nearPossible = Math.abs(merges) <= T.TEX_EDITS;
    const mergePossible = bColours >= 3 && merges >= 1 && merges <= 3;
    if (!nearPossible && !mergePossible) return null;
    const o = td * 4;
    let missing = 0, extra = 0;
    for (let w = 0; w < 4; w++) {
        missing += popcount((index.texMask[o + w] & ~bm[w]) >>> 0);
        extra += popcount((bm[w] & ~index.texMask[o + w]) >>> 0);
    }
    if (missing > 4 * T.TEX_EDITS) return null;                       // an edit breaks at most 4 pairs
    const near = nearPossible && missing + extra <= 8 * T.TEX_EDITS;
    if (!near && !mergePossible) return null;
    if (mapViolations(index.texLabels, td * 64, labels, 0) > T.TEX_EDITS) return null;
    if (near && mapViolations(labels, 0, index.texLabels, td * 64) <= T.TEX_EDITS) return 'near';
    return mergePossible ? 'merged' : null;
}
function textureCheck(index, img) {
    const res = { applicable: false, blocks: 0, exact: 0, near: 0, merged: 0, share: 0, d: 1, rows: [] };
    if (!index.texRows.length || img.w < 8 || img.h < 8) return res;
    let opaque = 0;
    for (let i = 3; i < img.px.length; i += 4) if (img.px[i] >= 128) opaque++;
    if (opaque < 0.9 * img.w * img.h) return res;
    res.applicable = true;
    const keys = rgbKeys(img);
    const bm = new Uint32Array(4);
    const blockAt = (bx, by) => {
        const b = new Array(64);
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const k = keys[(by + y) * img.w + bx + x]; if (k < 0) return null; b[y * 8 + x] = k; }
        const lp = labelPattern(b);
        return { s: lp.s, colours: lp.colours, labels: Uint8Array.from(lp.s, c => c.charCodeAt(0) - 48) };
    };
    const TN = index.texSame.length;
    // large images: an even sample of at most TEX_MAX_BLOCKS block positions per phase
    const ky = Math.max(1, Math.ceil(Math.sqrt(Math.floor(img.w / 8) * Math.floor(img.h / 8) / T.TEX_MAX_BLOCKS)));
    const scanPhase = (ox, oy, everyTile) => {
        let blocks = 0, exact = 0, near = 0, merged = 0;
        const rows = new Map();
        const hit = ti => rows.set(ti, (rows.get(ti) || 0) + 1);
        for (let by = oy; by + 8 <= img.h; by += 8 * ky) for (let bx = ox; bx + 8 <= img.w; bx += 8 * ky) {
            const b = blockAt(bx, by);
            if (!b || !blockInformative(b.labels, 3)) continue;
            blocks++;
            const ex = b.colours >= T.TEX_MIN_COLOURS ? index.texExact.get(b.s) : undefined;
            if (ex !== undefined) { exact++; hit(ex >> 3); continue; }
            sameMask(b.labels, bm, 0);
            let tds;
            if (everyTile) tds = null;
            else {
                tds = new Set();
                for (let q = 0; q < 4; q++) {
                    const qx = (q & 1) * 4, qy = (q >> 1) * 4, part = [];
                    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) part.push(b.labels[(qy + y) * 8 + qx + x]);
                    const qp = labelPattern(part);
                    if (qp.colours < T.TEX_QUARTER_COLOURS) continue;
                    const list = index.texQuarter.get(q + qp.s);
                    if (list && list.length <= 64) for (const td of list) tds.add(td);
                }
                if (!tds.size) continue;
            }
            let how = null, which = -1;
            const tryTd = td => { const m = blockMatch(index, b.labels, bm, b.colours, td); if (m && (!how || m === 'near')) { how = m; which = td; } return m === 'near'; };
            if (tds) { for (const td of tds) if (tryTd(td)) break; }
            else { for (let td = 0; td < TN; td++) if (tryTd(td)) break; }
            if (how === 'near') { near++; hit(which >> 3); } else if (how === 'merged') { merged++; hit(which >> 3); }
        }
        return { blocks, exact, near, merged, rows, phase: [ox, oy] };
    };
    let best = null;
    for (let oy = 0; oy < 8; oy++) for (let ox = 0; ox < 8; ox++) {
        const r = scanPhase(ox, oy, false);
        const m = r.exact + r.near + r.merged;
        if (!best || m > best.exact + best.near + best.merged || (m === best.exact + best.near + best.merged && r.blocks > best.blocks)) best = r;
    }
    const anyHit = best && best.exact + best.near + best.merged > 0;
    const full = scanPhase(anyHit ? best.phase[0] : 0, anyHit ? best.phase[1] : 0, true);
    const pick = (full.exact + full.near + full.merged >= (best ? best.exact + best.near + best.merged : 0)) ? full : best;
    if (!pick || !pick.blocks) return Object.assign(res, { note: 'no informative 8x8 block' });
    res.blocks = pick.blocks; res.exact = pick.exact; res.near = pick.near; res.merged = pick.merged; res.phase = pick.phase;
    res.share = (pick.exact + pick.near + pick.merged) / pick.blocks;
    res.d = 1 - res.share;
    res.rows = [...pick.rows.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([ti, n]) => ({ row: index.texRows[ti], blocks: n }));
    return res;
}

// ---------------------------------------------------------------------------------------------
// Checking (sprite mode).
//
// Forms of the candidate: the image as given, plus its native form when it is a pixel-art upscale
// (nativeScale / modeDown above).
// Stage 1 (every graded frame in the index): the fingerprint distance
//   D_fp = W_HASH·hash + W_SIL·silhouette + W_ASP·aspect + W_COL·colour
// as the minimum over each form (as-is, transposed) × the frame's six variants.
// Stage 1b (the SHORTLIST closest): the form resampled to that frame's own size and fingerprinted
// again, compared with the frame's 1× and mirrored fingerprints ("at sizes matching the U7 frame").
// Stage 2 (the VERIFY closest): the U7 frame is decoded; each form, in 4 orientations, is brought to
// the frame's scale, aligned (centre of mass, then ±2 px) and compared pixel by pixel:
//   D_px = 1 − (IoU of the masks + κ of the lightness-step signs + κ of the same-colour structure) / 3
// with κ = agreement beyond chance (Cohen's kappa, below 0 counted as 0). A κ whose categories are
// all one value in both images (say, no two neighbours share a colour) carries no evidence and is
// left out of the mean instead of counting as 0. The same-colour structure (which neighbouring pixels
// share a colour) survives any recolour; the lightness steps survive a hue shift.
// Combined distance D = W_FP·D_fp + (1 − W_FP)·D_px. The grade uses D (and texture mode, below).

function hashDist(a, ao, b, bo) {
    // Both decisive and opposite = 1, only one decisive = 0.5, neither = not counted.
    let diff = 0, one = 0, uni = 0;
    for (let k = 0; k < 16; k++) {
        const ma = a[ao + 16 + k], mb = b[bo + 16 + k];
        diff += popcount((ma & mb & (a[ao + k] ^ b[bo + k])) >>> 0);
        one += popcount((ma ^ mb) >>> 0);
        uni += popcount((ma | mb) >>> 0);
    }
    return uni ? (diff + 0.5 * one) / uni : 1;
}
function silDist(a, ao, b, bo) {
    let inter = 0, uni = 0;
    for (let k = 0; k < 5; k++) { inter += popcount((a[ao + k] & b[bo + k]) >>> 0); uni += popcount((a[ao + k] | b[bo + k]) >>> 0); }
    return uni ? 1 - inter / uni : 0;
}
function histVector(img) {
    const v = new Float32Array(256);
    for (const [k, f] of histogram(img)) v[k] = f;
    return v;
}
function aspectTerm(a, b) { return Math.min(1, Math.abs(a - b) / Math.LN2); }

// Pixel planes for stage 2: lightness 0–1, alpha 0/1, colour key (-1 = transparent), centre of mass.
function planes(img) {
    const { w, h, px } = img;
    const n = w * h;
    const L = new Float32Array(n), A = new Uint8Array(n), K = new Int32Array(n);
    let cnt = 0, sx = 0, sy = 0;
    for (let i = 0; i < n; i++) {
        const o = i * 4;
        if (px[o + 3] < 128) { K[i] = -1; continue; }
        A[i] = 1; cnt++;
        L[i] = lightness(px[o], px[o + 1], px[o + 2]) / 255;
        K[i] = (px[o] << 16) | (px[o + 1] << 8) | px[o + 2];
        sx += i % w; sy += (i / w) | 0;
    }
    return { w, h, L, A, K, n: cnt, cx: cnt ? sx / cnt : 0, cy: cnt ? sy / cnt : 0 };
}
function iouAt(F, C, dx, dy) {
    let inter = 0;
    for (let y = 0; y < C.h; y++) {
        const Y = y + dy;
        if (Y < 0 || Y >= F.h) continue;
        const cr = y * C.w, fr = Y * F.w;
        for (let x = 0; x < C.w; x++) {
            if (!C.A[cr + x]) continue;
            const X = x + dx;
            if (X >= 0 && X < F.w) inter += F.A[fr + X];
        }
    }
    return inter / (F.n + C.n - inter);
}
// Cohen's kappa; null when there is no evidence (too few pairs, or both sides all one category).
function kappa(agree, total, pa, pb) {
    if (total < 32) return null;
    const po = agree / total;
    let pe = 0;
    for (let k = 0; k < pa.length; k++) pe += (pa[k] / total) * (pb[k] / total);
    if (1 - pe < 0.02) return null;
    return (po - pe) / (1 - pe);
}
const STEP_EPS = 0.02;   // lightness steps below 2 % are "level"
function structureAt(F, C, dx, dy, rowStep = 1) {
    let total = 0, sAgree = 0, eAgree = 0, bothSame = 0;
    const sa = [0, 0, 0], sb = [0, 0, 0], ea = [0, 0], eb = [0, 0];
    for (let y = 0; y < C.h; y += rowStep) {
        const Y = y + dy;
        if (Y < 0 || Y >= F.h) continue;
        for (let x = 0; x < C.w; x++) {
            const X = x + dx;
            if (X < 0 || X >= F.w) continue;
            const ci = y * C.w + x, fi = Y * F.w + X;
            if (!C.A[ci] || !F.A[fi]) continue;
            for (let dir = 0; dir < 2; dir++) {
                let cj, fj;
                if (dir === 0) { if (x + 1 >= C.w || X + 1 >= F.w) continue; cj = ci + 1; fj = fi + 1; }
                else { if (y + 1 >= C.h || Y + 1 >= F.h) continue; cj = ci + C.w; fj = fi + F.w; }
                if (!C.A[cj] || !F.A[fj]) continue;
                const dF = F.L[fj] - F.L[fi], dC = C.L[cj] - C.L[ci];
                const s1 = dF > STEP_EPS ? 2 : dF < -STEP_EPS ? 0 : 1;
                const s2 = dC > STEP_EPS ? 2 : dC < -STEP_EPS ? 0 : 1;
                const e1 = F.K[fi] === F.K[fj] ? 1 : 0, e2 = C.K[ci] === C.K[cj] ? 1 : 0;
                total++; sa[s1]++; sb[s2]++; ea[e1]++; eb[e2]++;
                if (s1 === s2) sAgree++;
                if (e1 === e2) eAgree++;
                if (e1 && e2) bothSame++;
            }
        }
    }
    // Merge-tolerant variant: a recolour that merges colours turns "different" pairs into "same" but never
    // the reverse, so how much more often a U7 same-colour pair is also same in the candidate than
    // chance says is copy evidence too.
    let ki = null;
    if (total >= 32 && ea[1] >= 16) {
        const pc = eb[1] / total;
        if (1 - pc >= 0.02) ki = (bothSame / ea[1] - pc) / (1 - pc);
    }
    const ke = kappa(eAgree, total, ea, eb);
    return { pairs: total, ks: kappa(sAgree, total, sa, sb), ke: ke === null ? ki : ki === null ? ke : Math.max(ke, ki) };
}
function pixelSim(iou, st) {
    const ks = st.ks === null ? null : Math.max(0, st.ks), ke = st.ke === null ? null : Math.max(0, st.ke);
    if (ks === null && ke === null) return iou / 3;            // no structural evidence at all
    if (ks === null) return (iou + ke) / 2;
    if (ke === null) return (iou + ks) / 2;
    return (iou + ks + ke) / 3;
}
// Scales at which a form is compared with a frame: from the opaque areas (and the nearest whole
// number when close: copies are usually scaled by whole numbers) and from fitting the larger side.
function scalesFor(cw, ch, cn, fw, fh, fn) {
    const out = [];
    const add = s => { if (s > 0.05 && !out.some(v => Math.abs(v - s) / s < 0.03)) out.push(s); };
    const sArea = Math.sqrt(cn / fn);
    const r = Math.round(sArea);
    if (r >= 1 && Math.abs(sArea - r) < 0.2 * sArea) add(r);
    add(sArea);
    add(Math.max(cw / fw, ch / fh));
    return out;
}
function verify(orients, F) {
    let best = { d: 1, iou: 0, ks: null, ke: null, pairs: 0, orient: '-', scale: 0 };
    for (const o of orients) {
        for (const s of scalesFor(o.img.w, o.img.h, o.n, F.w, F.h, F.n)) {
            const tw = Math.max(1, Math.round(o.img.w / s)), th = Math.max(1, Math.round(o.img.h / s));
            if (tw > 2 * F.w + 8 || th > 2 * F.h + 8 || 2 * tw + 8 < F.w || 2 * th + 8 < F.h) continue;
            const whole = Number.isInteger(s) && s >= 2;
            const key = whole ? 'm' + s : tw + 'x' + th;
            let C = o.cache.get(key);
            if (!C) {
                let im;
                if (whole) { const ph = bestPhase(o.img, s); im = modeDown(o.img, s, ph.px, ph.py); }
                else im = tw === o.img.w && th === o.img.h ? o.img : resizeSnap(o.img, tw, th);
                C = im ? planes(im) : { n: 0 };
                o.cache.set(key, C);
            }
            if (!C.n) continue;
            const dx0 = Math.round(F.cx - C.cx), dy0 = Math.round(F.cy - C.cy);
            const offs = [];
            let bi = -1;
            for (let dy = dy0 - 2; dy <= dy0 + 2; dy++) for (let dx = dx0 - 2; dx <= dx0 + 2; dx++) {
                const v = iouAt(F, C, dx, dy);
                offs.push([v, dx, dy]);
                if (v > bi) bi = v;
            }
            // Every offset within 0.02 of the best overlap is scored on structure too (an opaque
            // rectangle overlaps the same at many offsets; only the pixels tell which is right). With
            // several ties they are ranked on every k-th row first; the winner is scored in full.
            const ties = offs.filter(([v]) => v >= bi - 0.02);
            let pickT = ties[0];
            if (ties.length > 1) {
                const step = Math.max(1, Math.floor(C.h / 24));
                let bd = 2;
                for (const tie of ties) {
                    const d = 1 - pixelSim(tie[0], structureAt(F, C, tie[1], tie[2], step));
                    if (d < bd) { bd = d; pickT = tie; }
                }
            }
            const st = structureAt(F, C, pickT[1], pickT[2]);
            const d = 1 - pixelSim(pickT[0], st);
            if (d < best.d) best = { d, iou: pickT[0], ks: st.ks, ke: st.ke, pairs: st.pairs, orient: o.name, scale: s };
        }
    }
    return best;
}
function framePlanes(index, i) {
    if (!index.lib) return null;
    let F = index.frameCache.get(i);
    if (F !== undefined) return F;
    const m = index.meta[i];
    const fr = index.lib.frame(index.sources[m[0]].id, m[1], m[2]);
    const img = fr ? crop(fr) : null;
    F = img ? planes(img) : null;
    if (index.frameCache.size > 20000) index.frameCache.clear();
    index.frameCache.set(i, F);
    return F;
}
function countOpaque(img) { let n = 0; for (let p = 3; p < img.px.length; p += 4) if (img.px[p] >= 128) n++; return n; }

// Returns { grade, why, distance, info, native, texture, matches: [...] } for one cropped candidate.
// opts.target (an index row) adds where that frame ranked (the self-test uses it).
function checkImage(index, img, opts = {}) {
    const t = Object.assign({}, T, opts.thresholds || {});
    const nat = nativeScale(img);
    const forms = [{ name: '', img }];
    if (nat.r > 1) {
        const n = modeDown(img, nat.r, nat.px, nat.py);
        if (n) forms.push({ name: `native/${nat.r}`, img: n });
    }
    const cands = [];
    for (const f of forms) for (const [k, im] of [['as-is', f.img], ['transposed', transpose(f.img)]]) {
        cands.push({ orient: (f.name ? f.name + '/' : '') + k, img: im, fp: fingerprint(im), aspect: Math.log(im.w / im.h) });
    }
    const NC = cands.length;
    const hv = histVector(img);
    const N = index.N, H = index.hash, S = index.sil;
    const dfp = new Float32Array(N).fill(9), how = new Uint16Array(N), colD = new Float32Array(N);
    for (const i of index.gradedList) {
        let inter = 0;
        for (let p = index.histOff[i]; p < index.histOff[i + 1]; p++) inter += Math.min(hv[index.hist[p * 2]], index.hist[p * 2 + 1] / 255);
        const dc = Math.max(0, 1 - inter);
        colD[i] = dc;
        let best = 9, bh = 0;
        for (let o = 0; o < NC; o++) {
            const c = cands[o];
            const da = t.W_ASP * aspectTerm(c.aspect, index.aspect[i]);
            for (let v = 0; v < NV; v++) {
                const d = t.W_HASH * hashDist(c.fp.hash, 0, H, (i * NV + v) * HW) + t.W_SIL * silDist(c.fp.sil, 0, S, (i * NV + v) * 5) + da;
                if (d < best) { best = d; bh = o * NV + v; }
            }
        }
        dfp[i] = best + t.W_COL * dc;
        how[i] = bh;
    }
    const order = index.gradedList.slice().sort((a, b) => dfp[a] - dfp[b]);
    const short = order.slice(0, t.SHORTLIST);
    // Stage 1b: at the frame's own size.
    for (const i of short) {
        const m = index.meta[i];
        let best = 9, bh = 0;
        for (let o = 0; o < NC; o++) {
            const rs = crop(resizeSnap(cands[o].img, m[3], m[4]));
            if (!rs) continue;
            const fp = fingerprint(rs);
            const da = t.W_ASP * aspectTerm(Math.log(rs.w / rs.h), index.aspect[i]);
            for (let v = 0; v < 2; v++) {
                const d = t.W_HASH * hashDist(fp.hash, 0, H, (i * NV + v) * HW) + t.W_SIL * silDist(fp.sil, 0, S, (i * NV + v) * 5) + da;
                if (d < best) { best = d; bh = 1000 + o * 2 + v; }
            }
        }
        const d2 = best + t.W_COL * colD[i];
        if (d2 < dfp[i]) { dfp[i] = d2; how[i] = bh; }
    }
    short.sort((a, b) => dfp[a] - dfp[b]);
    // Stage 2: pixel verification of the closest.
    const orients = [];
    if (index.lib) {
        for (const f of forms) {
            const tr = transpose(f.img);
            for (const [name, im] of [['as-is', f.img], ['mirrored', mirror(f.img)], ['transposed', tr], ['transposed+mirrored', mirror(tr)]]) {
                orients.push({ name: (f.name ? f.name + '/' : '') + name, img: im, n: countOpaque(im), cache: new Map() });
            }
        }
    }
    const cand = short.slice(0, index.lib ? t.VERIFY : t.SHORTLIST).map(i => {
        const F = orients.length ? framePlanes(index, i) : null;
        const px = F ? verify(orients, F) : null;
        const D = px ? t.W_FP * dfp[i] + (1 - t.W_FP) * px.d : dfp[i];
        return { i, D, fp: dfp[i], px };
    });
    cand.sort((a, b) => a.D - b.D);
    const variantName = h => {
        if (h >= 1000) { const k = h - 1000; return `${cands[k >> 1].orient}/${k & 1 ? '1x-mirror' : '1x'}/at-frame-size`; }
        return `${cands[Math.floor(h / NV)].orient}/${index.raw.params.variants[h % NV]}`;
    };
    const kx = v => (v === null ? null : +v.toFixed(3));
    const matches = [];
    const seenShape = new Set();
    for (const c of cand) {
        const m = index.meta[c.i];
        const key = m[0] + ':' + m[1];
        if (seenShape.has(key)) continue;
        seenShape.add(key);
        matches.push({
            source: index.sources[m[0]].id, shape: m[1], frame: m[2], w: m[3], h: m[4], duplicates: m[7], row: c.i, complexity: m[9],
            distance: +c.D.toFixed(4), fp: +c.fp.toFixed(4), colour: +colD[c.i].toFixed(3), fpVia: variantName(how[c.i]),
            px: c.px ? { d: +c.px.d.toFixed(4), iou: +c.px.iou.toFixed(3), kSteps: kx(c.px.ks), kColours: kx(c.px.ke), pairs: c.px.pairs, orient: c.px.orient, scale: +c.px.scale.toFixed(3) } : null
        });
        if (matches.length === 5) break;
    }
    // Texture mode on the native form of an opaque candidate.
    let texture = null;
    for (const f of forms) { const tx = textureCheck(index, f.img); if (!texture || (tx.applicable && (!texture.applicable || tx.d < texture.d))) texture = tx; }
    if (texture.applicable) {
        texture.tiles = texture.rows.map(({ row, blocks }) => { const m = index.meta[row]; return { source: index.sources[m[0]].id, shape: m[1], frame: m[2], blocks }; });
    }
    const info = cands[0].fp.info, n = cands[0].fp.n;
    const best = matches.length ? matches[0].distance : 9;
    const lowInfo = n < t.MIN_PX || info < t.MIN_INFO;
    const candComplexity = complexity(forms[forms.length - 1].img);
    const failable = matches.find(m => m.complexity >= t.MIN_COMPLEXITY);
    let grade = 'PASS', why;
    if (lowInfo) why = `low information (${n} px, ${info} decisive bits): too small or flat to judge as a sprite`;
    else if (best < t.FAIL && candComplexity >= t.MIN_COMPLEXITY && failable && failable.distance < t.FAIL) {
        grade = 'FAIL'; why = `near-copy: distance ${failable.distance.toFixed(3)} < ${t.FAIL}`;
    } else if (best < t.FAIL) {
        grade = 'WARN';
        why = `distance ${best.toFixed(3)} < ${t.FAIL}, but ${candComplexity < t.MIN_COMPLEXITY ? `the candidate is simple (${candComplexity} bytes of information)` : `the U7 frame is simple (${matches[0].complexity} bytes)`}: too generic to call a copy, a human compares`;
    } else if (best < t.WARN) { grade = 'WARN'; why = `similar: distance ${best.toFixed(3)} < ${t.WARN}, a human compares`; }
    else why = `closest distance ${best.toFixed(3)} >= ${t.WARN}`;
    if (texture.applicable && texture.blocks > 0) {
        const tw = `texture: ${texture.exact + texture.near + texture.merged}/${texture.blocks} 8x8 blocks match U7 ground tiles (${texture.exact} exact, ${texture.near} near, ${texture.merged} merged colours)`;
        if (texture.d <= t.TEX_FAIL) { grade = 'FAIL'; why = `copied texture: ${tw}; ` + why; }
        else if (texture.d < t.TEX_WARN && grade === 'PASS') { grade = 'WARN'; why = `${tw}, a human compares; ` + why; }
        else why += `; ${tw}`;
    }
    const res = { grade, why, distance: best, verified: !!index.lib, info, complexity: candComplexity, px: n, w: img.w, h: img.h, native: nat.r > 1 ? nat : null, texture, matches };
    if (opts.target !== undefined) {
        res.targetRank = order.indexOf(opts.target);
        const tc = cand.find(c => c.i === opts.target);
        res.targetVerified = !!tc;
        res.target = tc ? { D: tc.D, fp: tc.fp, px: tc.px ? tc.px.d : null } : { fp: dfp[opts.target] };
    }
    return res;
}

// Frames of a candidate file: --frame WxH, else the sidecar's frameWidth/frameHeight, else a `$` sheet's
// 3×4 grid, else the whole image. Each frame is cropped to its content; empty frames are skipped.
function candidateFrames(file, opts = {}) {
    const png = readPNG(file);
    return splitFrames(normaliseAlpha({ w: png.width, h: png.height, px: png.data }), file, opts);
}
function splitFrames(img, file, opts = {}) {
    let fw = img.w, fh = img.h, source = 'whole image';
    const base = file ? path.basename(file, path.extname(file)) : '';
    const side = file ? path.join(path.dirname(file), base + '.json') : '';
    if (opts.frame) {
        [fw, fh] = opts.frame; source = '--frame';
    } else if (side && fs.existsSync(side)) {
        try {
            const j = JSON.parse(fs.readFileSync(side, 'utf8'));
            if (Number.isInteger(j.frameWidth) && Number.isInteger(j.frameHeight) && j.frameWidth > 0 && j.frameHeight > 0 &&
                img.w % j.frameWidth === 0 && img.h % j.frameHeight === 0) { fw = j.frameWidth; fh = j.frameHeight; source = 'sidecar'; }
        } catch (e) { /* no usable sidecar */ }
    }
    if (source === 'whole image' && /^!?\$/.test(base) && img.w % 3 === 0 && img.h % 4 === 0) {
        fw = img.w / 3; fh = img.h / 4; source = '$ sheet 3x4';
    }
    const frames = [];
    const cols = Math.floor(img.w / fw), rows = Math.floor(img.h / fh);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const sub = subImage(img, c * fw, r * fh, fw, fh);
        const b = contentBox(sub);
        if (!b) continue;
        frames.push({ frame: r * cols + c, col: c, row: r, box: [c * fw + b.x, r * fh + b.y, b.w, b.h], img: subImage(sub, b.x, b.y, b.w, b.h) });
    }
    return { file, width: img.w, height: img.h, frameW: fw, frameH: fh, source, frames };
}

// ---------------------------------------------------------------------------------------------
// In-process API for other tools (tools/make_25d.js, tools/art_check.js). The index is loaded once per
// process (about 0.4 s). Identical frames in a sheet are checked once.
let INDEX_CACHE;
function getIndex(file) {
    const f = file || DEFAULT_INDEX;
    if (INDEX_CACHE === undefined || (INDEX_CACHE && INDEX_CACHE.file !== f)) INDEX_CACHE = loadIndex(f);
    return INDEX_CACHE;
}
function gradeSheet(split, opts) {
    const policy = split.file ? standInPolicy(split.file) : null;
    if (policy) return Object.assign(policyFailure(policy), {
        frameW: split.frameW, frameH: split.frameH, frameSource: split.source
    });
    const index = getIndex(opts.index);
    if (!index) return { grade: 'SKIP', summary: `no originality index (run: node tools/originality_check.js --build-index; it needs the U7 game files)`, frames: [] };
    const seen = new Map();
    const frames = [];
    for (const fr of split.frames) {
        const key = fr.img.w + 'x' + fr.img.h + ':' + Buffer.from(fr.img.px).toString('base64');
        let r = seen.get(key);
        if (!r) { r = checkImage(index, fr.img, opts); seen.set(key, r); }
        frames.push(Object.assign({ frame: fr.frame, box: fr.box }, r));
    }
    const worst = frames.find(x => x.grade === 'FAIL') || frames.find(x => x.grade === 'WARN') || frames.slice().sort((a, b) => a.distance - b.distance)[0];
    const grade = frames.some(x => x.grade === 'FAIL') ? 'FAIL' : frames.some(x => x.grade === 'WARN') ? 'WARN' : 'PASS';
    const m = worst && worst.matches[0];
    const nf = frames.filter(x => x.grade === 'FAIL').length, nw = frames.filter(x => x.grade === 'WARN').length;
    const summary = !worst ? 'no frame with content' :
        `${grade}: ${frames.length} frame(s), ${nf} FAIL, ${nw} WARN; frame ${worst.frame}: ${worst.why}${m ? `; closest U7 frame ${m.source} ${m.shape}:${m.frame}` : ''}${index.lib ? '' : ' (fingerprints only: U7 game files not found)'}`;
    return { grade, summary, frames, frameW: split.frameW, frameH: split.frameH, frameSource: split.source };
}
// checkFile(png, { frame: [w, h] }) and checkSheet({ w, h, px | d }, { frame: [w, h] }) return
// { grade: 'PASS'|'WARN'|'FAIL'|'SKIP', summary, frames: [per-frame checkImage results] }.
function checkFile(file, opts = {}) {
    const policy = standInPolicy(file);
    if (policy) {
        try {
            if (!fs.statSync(file).isFile()) throw new Error('not a file');
        } catch (e) {
            return { grade: 'FAIL', summary: `cannot read ${file}: ${e.message}`, frames: [] };
        }
        return policyFailure(policy);
    }
    let split;
    try { split = candidateFrames(file, opts); } catch (e) { return { grade: 'FAIL', summary: `cannot read ${file}: ${e.message}`, frames: [] }; }
    return gradeSheet(split, opts);
}
function checkSheet(sheet, opts = {}) {
    const img = normaliseAlpha({ w: sheet.w, h: sheet.h, px: sheet.px || sheet.d });
    return gradeSheet(splitFrames(img, null, opts), opts);
}
// A known near-copy for other tools' self-tests: a U7 frame (an oak tree, 72×70) scaled 3×, written
// to `file` (keep it out of the project: use the temp folder). Returns false without the game files.
function writeCopyFixture(file, shape = 181, frameNo = 0, scale = 3) {
    const lib = new U7Library();
    if (!lib.sources.length) return false;
    const fr = lib.frame('BG:SHAPES', shape, frameNo);
    if (!fr) return false;
    const big = scaleNearest(crop(fr), scale);
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
    writePNG(file, big.w, big.h, Buffer.from(big.px));
    return true;
}

// ---------------------------------------------------------------------------------------------
// Report image: per row, the candidate and its 5 closest U7 frames at 4× (smaller when a frame would
// exceed 480 px), each on a checkerboard, with labels. Local only (U7-derived pixels).
const FONT = {
    '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001',
    '5': '111100111001111', '6': '111100111101111', '7': '111001001010010', '8': '111101111101111', '9': '111101111001111',
    'A': '010101111101101', 'B': '110101110101110', 'C': '011100100100011', 'D': '110101101101110', 'E': '111100110100111',
    'F': '111100110100100', 'G': '011100101101011', 'H': '101101111101101', 'I': '111010010010111', 'J': '001001001101010',
    'K': '101101110101101', 'L': '100100100100111', 'M': '101111111101101', 'N': '110101101101101', 'O': '010101101101010',
    'P': '110101110100100', 'Q': '010101101110011', 'R': '110101110101101', 'S': '011100010001110', 'T': '111010010010010',
    'U': '101101101101111', 'V': '101101101101010', 'W': '101101111111101', 'X': '101101010101101', 'Y': '101101010010010',
    'Z': '111001010100111', '.': '000000000000010', ':': '000010000010000', '-': '000000111000000', '=': '000111000111000',
    '/': '001001010100100', '_': '000000000000111', '(': '010100100100010', ')': '010001001001010', '#': '101111101111101',
    '$': '011110010011110', '!': '010010010000010', '?': '110001010000010', ' ': '000000000000000', '<': '001010100010001',
    '>': '100010001010100', '+': '000010111010000', ',': '000000000010100', '[': '110100100100110', ']': '011001001001011'
};
function drawText(canvas, x, y, text, rgb, scale = 2) {
    let cx = x;
    for (const ch0 of String(text).toUpperCase()) {
        const g = FONT[ch0] || FONT['?'];
        for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
            if (g[r * 3 + c] !== '1') continue;
            fillRect(canvas, cx + c * scale, y + r * scale, scale, scale, rgb);
        }
        cx += 4 * scale;
    }
}
function fillRect(canvas, x, y, w, h, rgb) {
    for (let yy = Math.max(0, y); yy < Math.min(canvas.h, y + h); yy++) for (let xx = Math.max(0, x); xx < Math.min(canvas.w, x + w); xx++) {
        const d = (yy * canvas.w + xx) * 4;
        canvas.px[d] = rgb[0]; canvas.px[d + 1] = rgb[1]; canvas.px[d + 2] = rgb[2]; canvas.px[d + 3] = 255;
    }
}
function blit(canvas, img, x, y, k) {
    for (let yy = 0; yy < img.h * k; yy++) for (let xx = 0; xx < img.w * k; xx++) {
        const s = (Math.floor(yy / k) * img.w + Math.floor(xx / k)) * 4;
        const X = x + xx, Y = y + yy;
        if (X < 0 || Y < 0 || X >= canvas.w || Y >= canvas.h) continue;
        const d = (Y * canvas.w + X) * 4;
        if (img.px[s + 3] < 128) {
            const ch = ((Math.floor(xx / 8) + Math.floor(yy / 8)) & 1) ? 58 : 44;
            canvas.px[d] = ch; canvas.px[d + 1] = ch; canvas.px[d + 2] = ch; canvas.px[d + 3] = 255;
        } else {
            canvas.px[d] = img.px[s]; canvas.px[d + 1] = img.px[s + 1]; canvas.px[d + 2] = img.px[s + 2]; canvas.px[d + 3] = 255;
        }
    }
}
const GRADE_RGB = { FAIL: [220, 50, 50], WARN: [235, 170, 30], PASS: [70, 190, 90] };
function writeReport(outFile, rows, lib) {
    const MAXPX = 480, PAD = 10, LABEL = 30;
    const scaleFor = img => Math.max(1, Math.min(4, Math.floor(MAXPX / Math.max(img.w, img.h))));
    const laid = rows.map(r => {
        const cells = [{ img: r.img, label1: r.label, label2: `${r.result.grade} ${r.result.distance.toFixed(3)}`, grade: r.result.grade }];
        for (const m of r.result.matches) {
            const fr = lib.frame(m.source, m.shape, m.frame);
            const img = fr ? crop(fr) : null;
            const how = m.px ? m.px.orient : m.fpVia;
            cells.push({ img, label1: `${m.source.replace(':', ' ')} ${m.shape}:${m.frame}`, label2: `D ${m.distance.toFixed(3)} ${how.includes('transposed') ? 'T' : ''}${how.includes('mirror') ? 'M' : ''}` });
        }
        cells.forEach(c => { c.k = c.img ? scaleFor(c.img) : 1; c.cw = Math.max(c.img ? c.img.w * c.k : 64, 150); c.ch = c.img ? c.img.h * c.k : 64; });
        const h = Math.max(...cells.map(c => c.ch)) + LABEL + PAD * 2;
        const w = cells.reduce((s, c) => s + c.cw + PAD, PAD + 8);
        return { cells, h, w, grade: r.result.grade };
    });
    const W = Math.max(...laid.map(l => l.w), 400), H = laid.reduce((s, l) => s + l.h, 0) + 24;
    const canvas = { w: W, h: H, px: new Uint8Array(W * H * 4) };
    fillRect(canvas, 0, 0, W, H, [24, 24, 28]);
    drawText(canvas, PAD, 6, 'ORIGINALITY CHECK: CANDIDATE, THEN ITS 5 CLOSEST U7 FRAMES (LOCAL ONLY)', [200, 200, 200]);
    let y = 24;
    for (const l of laid) {
        fillRect(canvas, 0, y, 6, l.h - 2, GRADE_RGB[l.grade]);
        fillRect(canvas, 6, y + l.h - 2, W - 6, 1, [60, 60, 66]);
        let x = PAD + 8;
        l.cells.forEach((c, k) => {
            if (c.img) blit(canvas, c.img, x, y + PAD, c.k);
            else drawText(canvas, x, y + PAD, 'NO IMAGE', [150, 150, 150]);
            const ty = y + PAD + Math.max(...l.cells.map(q => q.ch)) + 4;
            const maxChars = Math.floor(c.cw / 8);
            drawText(canvas, x, ty, c.label1.slice(0, maxChars), k === 0 ? [255, 255, 255] : [190, 190, 190]);
            drawText(canvas, x, ty + 13, (c.label2 + (c.k !== 4 ? ` X${c.k}` : '')).slice(0, maxChars), k === 0 ? GRADE_RGB[c.grade] : [190, 190, 190]);
            x += c.cw + PAD;
        });
        y += l.h;
    }
    fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
    writePNG(outFile, W, H, Buffer.from(canvas.px));
    return { width: W, height: H };
}

// ---------------------------------------------------------------------------------------------
// Self-test / calibration.
function mulberry32(a) {
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h / 6, s, l];
}
function hslToRgb(h, s, l) {
    if (s === 0) return [l * 255, l * 255, l * 255];
    const f = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255];
}
// Copier alterations of a U7 frame (the self-test's set (b)).
function recolour(img, rng) {
    // Hue-rotate every colour by one random angle (60–300°), keep lightness, snap to a palette colour
    // that differs from the original: a copier's "make the green tunic red".
    const rot = (60 + rng() * 240) / 360;
    const map = new Map();
    const out = new Uint8Array(img.px.length);
    for (let i = 0; i < img.w * img.h; i++) {
        const o = i * 4;
        if (img.px[o + 3] < 128) continue;
        const key = (img.px[o] << 16) | (img.px[o + 1] << 8) | img.px[o + 2];
        let c = map.get(key);
        if (!c) {
            const [h, s, l] = rgbToHsl(img.px[o], img.px[o + 1], img.px[o + 2]);
            const [r, g, b] = hslToRgb((h + rot) % 1, Math.max(s, 0.35), l);
            let k = snapIndex(Math.round(r), Math.round(g), Math.round(b));
            const orig = snapIndex(img.px[o], img.px[o + 1], img.px[o + 2]);
            if (k === orig) {  // grey or saturated edge case: take the nearest other palette colour
                let best = 1e9;
                for (let j = 0; j < 255; j++) {
                    if (PAL_CANON[j] === orig) continue;
                    const dr = PAL[j * 3] - r, dg = PAL[j * 3 + 1] - g, db = PAL[j * 3 + 2] - b;
                    const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
                    if (d < best) { best = d; k = j; }
                }
            }
            c = [PAL[k * 3], PAL[k * 3 + 1], PAL[k * 3 + 2]];
            map.set(key, c);
        }
        out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255;
    }
    return { w: img.w, h: img.h, px: out };
}
function shift(img, dx, dy, clip) {
    // clip = false: moved inside a canvas 4 px larger on every side (pure translation);
    // clip = true: moved inside its own frame, so 1–3 rows and columns fall off the edge.
    const pad = clip ? 0 : 4;
    const W = img.w + 2 * pad, H = img.h + 2 * pad;
    const out = new Uint8Array(W * H * 4);
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
        const X = x + pad + dx, Y = y + pad + dy;
        if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const s = (y * img.w + x) * 4, d = (Y * W + X) * 4;
        out.set(img.px.subarray(s, s + 4), d);
    }
    return { w: W, h: H, px: out };
}
function editPixels(img, frac, rng) {
    // Repaints `frac` of the opaque pixels with another colour already used in the image (a light edit).
    const out = new Uint8Array(img.px);
    const opaque = [], colours = new Map();
    for (let i = 0; i < img.w * img.h; i++) {
        if (out[i * 4 + 3] < 128) continue;
        opaque.push(i);
        colours.set((out[i * 4] << 16) | (out[i * 4 + 1] << 8) | out[i * 4 + 2], true);
    }
    const cols = [...colours.keys()];
    const n = Math.round(opaque.length * frac);
    for (let k = 0; k < n; k++) {
        const j = k + Math.floor(rng() * (opaque.length - k));
        [opaque[k], opaque[j]] = [opaque[j], opaque[k]];
        const i = opaque[k];
        const cur = (out[i * 4] << 16) | (out[i * 4 + 1] << 8) | out[i * 4 + 2];
        let c = cols[Math.floor(rng() * cols.length)];
        if (cols.length > 1) while (c === cur) c = cols[Math.floor(rng() * cols.length)];
        out[i * 4] = c >> 16; out[i * 4 + 1] = (c >> 8) & 255; out[i * 4 + 2] = c & 255;
    }
    return { w: img.w, h: img.h, px: out };
}
const ALTERATIONS = [
    { id: 'recolour', spec: true, f: (im, r) => recolour(im, r) },
    { id: 'mirror', spec: true, f: (im) => mirror(im) },
    { id: 'shift', spec: true, f: (im, r) => shift(im, rs(r), rs(r), false) },
    { id: 'shift-clip', spec: true, f: (im, r) => shift(im, rs(r), rs(r), true) },
    { id: 'scale2x', spec: true, f: (im) => scaleNearest(im, 2) },
    { id: 'scale2x-edit10', spec: true, f: (im, r) => editPixels(scaleNearest(im, 2), 0.10, r) },
    { id: 'transpose', spec: false, f: (im) => transpose(im) },
    { id: 'scale3x', spec: false, f: (im) => scaleNearest(im, 3) },
    { id: 'combo', spec: false, f: (im, r) => editPixels(scaleNearest(mirror(recolour(im, r)), 2), 0.10, r) }
];
function rs(r) { return (1 + Math.floor(r() * 3)) * (r() < 0.5 ? -1 : 1); }

// Synthetic shapes for set (c): plain geometry a generator or a person draws without any reference.
function synthetic() {
    const out = [];
    const mk = (name, w, h, fn) => {
        const px = new Uint8Array(w * h * 4);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const c = fn(x, y);
            if (!c) continue;
            const d = (y * w + x) * 4; px[d] = c[0]; px[d + 1] = c[1]; px[d + 2] = c[2]; px[d + 3] = 255;
        }
        out.push({ name, img: { w, h, px } });
    };
    const R = [200, 40, 40], G = [40, 160, 60], B = [40, 70, 200], Y = [230, 200, 40], K = [30, 30, 30], Wt = [240, 240, 240];
    mk('disc', 32, 32, (x, y) => ((x - 15.5) ** 2 + (y - 15.5) ** 2 < 225) ? R : null);
    mk('shaded-sphere', 32, 32, (x, y) => { const d = (x - 15.5) ** 2 + (y - 15.5) ** 2; if (d >= 225) return null; const l = Math.max(0, 1 - Math.hypot(x - 10, y - 10) / 26); return [60 + 180 * l, 60 + 120 * l, 200 * l + 40]; });
    mk('ring', 32, 32, (x, y) => { const d = Math.hypot(x - 15.5, y - 15.5); return d < 15 && d > 10 ? Y : null; });
    mk('square', 24, 24, () => B);
    mk('square-outline', 24, 24, (x, y) => (x < 2 || y < 2 || x > 21 || y > 21) ? K : Wt);
    mk('triangle', 32, 28, (x, y) => (Math.abs(x - 15.5) < y * 0.57) ? G : null);
    mk('cross', 30, 30, (x, y) => (Math.abs(x - 14.5) < 4 || Math.abs(y - 14.5) < 4) ? R : null);
    mk('diamond', 30, 30, (x, y) => (Math.abs(x - 14.5) + Math.abs(y - 14.5) < 14) ? Y : null);
    mk('star', 33, 33, (x, y) => { const a = Math.atan2(y - 16, x - 16), r = Math.hypot(x - 16, y - 16); return r < 8 + 7 * Math.cos(5 * a) ? Y : null; });
    mk('stripes-h', 32, 32, (x, y) => (y >> 2) & 1 ? B : Wt);
    mk('stripes-diag', 32, 32, (x, y) => ((x + y) >> 2) & 1 ? G : K);
    mk('checker', 32, 32, (x, y) => ((x >> 3) + (y >> 3)) & 1 ? K : Wt);
    mk('gradient-bar', 40, 12, (x) => [x * 6, x * 6, 255 - x * 6]);
    mk('lollipop-tree', 28, 44, (x, y) => { if ((x - 13.5) ** 2 + (y - 12) ** 2 < 144) return (x + y) % 3 ? G : [30, 110, 40]; if (Math.abs(x - 13.5) < 3 && y >= 20) return [110, 70, 30]; return null; });
    mk('stick-figure', 20, 40, (x, y) => { if ((x - 9.5) ** 2 + (y - 6) ** 2 < 25) return Wt; if (Math.abs(x - 9.5) < 1.5 && y > 10 && y < 28) return Wt; if (y > 13 && y < 16 && Math.abs(x - 9.5) < 8) return Wt; if (y >= 28 && Math.abs(Math.abs(x - 9.5) - (y - 28) * 0.6) < 1.5) return Wt; return null; });
    mk('house', 40, 36, (x, y) => { if (y < 16) return (Math.abs(x - 19.5) < y * 1.3) ? R : null; if (x > 3 && x < 36) return (x > 16 && x < 23 && y > 24) ? K : [200, 180, 140]; return null; });
    mk('crescent', 32, 32, (x, y) => ((x - 15.5) ** 2 + (y - 15.5) ** 2 < 196 && (x - 21) ** 2 + (y - 12) ** 2 > 150) ? Y : null);
    mk('arrow', 36, 20, (x, y) => (x < 22 && Math.abs(y - 9.5) < 3) || (x >= 22 && Math.abs(y - 9.5) < (36 - x) * 0.7) ? K : null);
    const rng = mulberry32(7);
    for (let s = 0; s < 6; s++) {
        const pts = Array.from({ length: 6 }, () => [8 + rng() * 32, 8 + rng() * 32, 5 + rng() * 9]);
        const col = [[120, 100, 80], [90, 140, 60], [150, 150, 160], [170, 60, 60], [60, 90, 150], [200, 170, 90]][s];
        mk(`blob-${s}`, 48, 48, (x, y) => {
            const inside = pts.some(([cx, cy, r]) => (x - cx) ** 2 + (y - cy) ** 2 < r * r);
            if (!inside) return null;
            const l = 0.6 + 0.4 * Math.sin(x * 0.7 + s) * Math.cos(y * 0.5);
            return [col[0] * l, col[1] * l, col[2] * l];
        });
    }
    return out;
}

function stats(arr) {
    const a = arr.slice().sort((x, y) => x - y);
    if (!a.length) return { n: 0 };
    const q = p => a[Math.min(a.length - 1, Math.max(0, Math.floor(p * (a.length - 1))))];
    return { n: a.length, min: a[0], p5: q(0.05), median: q(0.5), p95: q(0.95), max: a[a.length - 1] };
}
const f3 = v => (v === undefined ? '-' : v.toFixed(3));

function selftest(opts) {
    const log = s => console.log(s);
    const checks = [];
    const check = (name, ok, detail) => { checks.push(ok); log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${detail}`); };
    const policyCases = {
        u7: ['game/img/characters/!$U7_TreeStump.png'],
        status: ['game/img/characters/!$UF_Stump.png', 'game/img/characters/!$BirchTree.png'],
        originals: ['art/masters/oak.png', 'art/masters/bone.png', 'art/masters/human_male_stand.png']
    };
    const policyRows = rels => rels.map(rel => {
        const file = path.join(ROOT, ...rel.split('/'));
        return { rel, exists: fs.existsSync(file), policy: standInPolicy(file) };
    });
    const u7Rows = policyRows(policyCases.u7);
    const statusRows = policyRows(policyCases.status);
    const originalRows = policyRows(policyCases.originals);
    const provokePolicy = process.env.UF_TEST_PROVOKE === 'originality.policy';
    check('policy.u7_named_fails', !provokePolicy && u7Rows.every(r => r.exists && r.policy && r.policy.kind === 'reserved-name'),
        u7Rows.map(r => `${r.rel}: ${r.exists ? (r.policy ? r.policy.kind : 'NO POLICY') : 'MISSING'}`).join('; ') + (provokePolicy ? '; deliberately provoked' : ''));
    check('policy.status_listed_fails', statusRows.every(r => r.exists && r.policy && r.policy.kind === 'status'),
        statusRows.map(r => `${r.rel}: ${r.exists ? (r.policy ? r.policy.kind : 'NO POLICY') : 'MISSING'}`).join('; '));
    check('policy.original_names_pass', originalRows.every(r => r.exists && !r.policy),
        originalRows.map(r => `${r.rel}: ${r.exists ? (r.policy ? r.policy.kind : 'no policy FAIL') : 'MISSING'}`).join('; '));
    if (provokePolicy) {
        const passed = checks.filter(Boolean).length;
        log(`RESULT: ${passed} passed, ${checks.length - passed} failed (originality_check selftest: deliberate provenance-policy failure; perceptual calibration not run)`);
        return { ok: false, records: [] };
    }
    const indexFile = opts.index || DEFAULT_INDEX;
    let index = loadIndex(indexFile);
    if (!index) {
        log(`index missing: building ${indexFile}`);
        const r = buildIndex(indexFile, { quiet: true });
        log(`built: ${r.unique} unique frames (${r.decoded} decoded, ${r.dups} exact duplicates) in ${r.secs.toFixed(1)} s`);
        index = loadIndex(indexFile);
    }
    if (!index.lib) { log('FAIL selftest: the U7 game files are not found; the calibration needs them'); return { ok: false }; }
    const lib = index.lib;
    const t = Object.assign({}, T, opts.thresholds || {});
    const nFlat = index.meta.filter(m => m[8] & 1).length;
    log(`index: ${index.N} unique frames from ${index.sources.length} files: ${index.gradedCount} compared in sprite mode, ${nFlat} flat 8x8 ground tiles for texture mode (${index.texRows.length} informative), ${index.N - index.gradedCount - nFlat} too small or flat (< ${t.MIN_PX} px or < ${t.MIN_INFO} decisive bits)`);
    log(`thresholds: FAIL < ${t.FAIL}, WARN < ${t.WARN}; D = ${t.W_FP} x fingerprint + ${(1 - t.W_FP).toFixed(2)} x pixel; fingerprint weights hash ${t.W_HASH}, silhouette ${t.W_SIL}, colour ${t.W_COL}, aspect ${t.W_ASP}`);
    try {
        const hex = fs.readFileSync(path.join(ROOT, 'art', 'palette', 'uf.hex'), 'utf8').split(/\r?\n/).filter(Boolean);
        let same = 0;
        hex.forEach((h, i) => { const v = parseInt(h.replace('#', ''), 16); if (((v >> 16) & 255) === PAL[i * 3] && ((v >> 8) & 255) === PAL[i * 3 + 1] && (v & 255) === PAL[i * 3 + 2]) same++; });
        log(`note: art/palette/uf.hex equals the decoded U7 daylight palette in ${same}/${hex.length} entries (so the colour term is weak evidence)`);
    } catch (e) { log('note: art/palette/uf.hex not read: ' + e.message); }

    const rng = mulberry32(opts.seed || 20260919);
    const sampleN = Math.min(opts.sample || 300, index.gradedList.length);
    const picks = [], used = new Set();
    while (picks.length < sampleN) {
        const i = index.gradedList[Math.floor(rng() * index.gradedList.length)];
        if (!used.has(i)) { used.add(i); picks.push(i); }
    }
    const records = [];
    let nDone = 0;
    const tStart = Date.now();
    const rec = (set, group, label, r, extra) => {
        if (opts.progress && ++nDone % 50 === 0) process.stderr.write(`progress: ${nDone} checks, ${((Date.now() - tStart) / 1000).toFixed(0)} s, last ${set} ${group} ${label}
`);
        const m = r.matches[0];
        records.push(Object.assign({
            set, group, label, grade: r.grade, why: r.why, D: r.distance, info: r.info, px: r.px, w: r.w, h: r.h,
            fp: m ? m.fp : null, pxd: m && m.px ? m.px.d : null, top: m ? `${m.source} ${m.shape}:${m.frame}` : '-',
            tex: r.texture && r.texture.applicable ? { blocks: r.texture.blocks, exact: r.texture.exact, near: r.texture.near, d: r.texture.d } : null, native: r.native ? r.native.r : 1,
            cands: opts.dump ? r.matches.map(q => [q.fp, q.px ? q.px.d : null]) : undefined
        }, extra || {}));
        return records[records.length - 1];
    };
    const t0 = Date.now();
    let selfTop = 0, recallMiss = [];
    for (const i of picks) {
        const m = index.meta[i];
        const srcId = index.sources[m[0]].id;
        const label = `${srcId} ${m[1]}:${m[2]}`;
        const fr = crop(lib.frame(srcId, m[1], m[2]));
        const r = checkImage(index, fr, Object.assign({}, opts, { target: i }));
        rec('a', 'U7 frames', label, r, { targetRank: r.targetRank, targetVerified: r.targetVerified });
        if (r.matches[0] && r.matches[0].source === srcId && r.matches[0].shape === m[1]) selfTop++;
        for (const alt of ALTERATIONS) {
            const im = crop(alt.f(fr, rng));
            if (!im) continue;
            const rb = checkImage(index, im, Object.assign({}, opts, { target: i }));
            rec('b', alt.id + (alt.spec ? '' : ' [extra]'), label, rb, { spec: alt.spec, targetRank: rb.targetRank, targetVerified: rb.targetVerified, target: rb.target });
            if (!rb.targetVerified) recallMiss.push(`${alt.id} ${label} rank ${rb.targetRank}`);
        }
    }
    // Texture mode: U7 flat ground tiles, alone and made into a ground sheet the way a copier would.
    const tilePicks = [], usedT = new Set();
    const nTiles = Math.min(opts.tileSample || 100, index.texRows.length);
    while (tilePicks.length < nTiles) {
        const r = index.texRows[Math.floor(rng() * index.texRows.length)];
        if (!usedT.has(r)) { usedT.add(r); tilePicks.push(r); }
    }
    const tileImg = r => { const m = index.meta[r]; return crop(lib.frame(index.sources[m[0]].id, m[1], m[2])); };
    const place = (dst, W, src, x0, y0) => { for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) dst.set(src.px.subarray((y * src.w + x) * 4, (y * src.w + x) * 4 + 4), ((y0 + y) * W + x0 + x) * 4); };
    for (let k = 0; k < tilePicks.length; k++) {
        const r = tilePicks[k], m = index.meta[r];
        const label = `${index.sources[m[0]].id} ${m[1]}:${m[2]}`;
        const t8 = tileImg(r);
        const ra = checkImage(index, t8, opts);
        rec('a', 'U7 ground tiles (texture)', label, ra, { tile: true, texD: ra.texture.d });
        // a 16×16 sheet of this tile and three others, as the ground stand-ins were built
        const others = [1, 2, 3].map(j => tileImg(tilePicks[(k + j * 7) % tilePicks.length]));
        const sheet = { w: 16, h: 16, px: new Uint8Array(16 * 16 * 4) };
        [t8, ...others].forEach((ti, q) => place(sheet.px, 16, ti, (q & 1) * 8, (q >> 1) * 8));
        const big = { w: 48, h: 48, px: new Uint8Array(48 * 48 * 4) };
        for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 3; xx++) place(big.px, 48, sheet, xx * 16, yy * 16);
        const dx = 1 + Math.floor(rng() * 3), dy = 1 + Math.floor(rng() * 3);
        const TEX_ALTS = [
            ['tex sheet 3x', () => scaleNearest(sheet, 3)],
            ['tex recolour', () => scaleNearest(recolour(sheet, rng), 3)],
            ['tex mirror', () => scaleNearest(mirror(sheet), 3)],
            ['tex shift', () => scaleNearest(subImage(big, dx, dy, 24, 24), 3)],
            ['tex scale2x', () => scaleNearest(sheet, 2)],
            ['tex scale2x-edit10', () => editPixels(scaleNearest(sheet, 2), 0.10, rng)]
        ];
        for (const [id, fn] of TEX_ALTS) {
            const rb = checkImage(index, crop(fn()), opts);
            rec('b', id, label, rb, { spec: true, tile: true, texD: rb.texture.d });
        }
    }
    const tAB = (Date.now() - t0) / 1000;
    const nAB = records.length;
    // (c) originals.
    const t1 = Date.now();
    const addC = (group, label, img) => { const im = crop(img); if (im) rec('c', group, label, checkImage(index, im, opts)); };
    const stock = [
        ['game/img/characters/People1.png', 48, 48], ['game/img/characters/People2.png', 48, 48], ['game/img/characters/People3.png', 48, 48],
        ['game/img/characters/People4.png', 48, 48], ['game/img/characters/Nature.png', 48, 48], ['game/img/characters/Monster.png', 48, 48],
        ['game/img/tilesets/Outside_B.png', 48, 48],
        ['game/img/tilesets/Outside_A2.png', 48, 48], ['game/img/tilesets/Outside_A5.png', 48, 48], ['game/img/tilesets/Inside_A2.png', 48, 48],
        ['game/img/tilesets/Inside_A5.png', 48, 48], ['game/img/tilesets/Dungeon_A2.png', 48, 48], ['game/img/tilesets/Dungeon_A5.png', 48, 48]
    ].concat(opts.extended ? [
        ['game/img/characters/Actor1.png', 48, 48], ['game/img/characters/Actor2.png', 48, 48], ['game/img/characters/Actor3.png', 48, 48],
        ['game/img/characters/Evil.png', 48, 48], ['game/img/characters/Vehicle.png', 48, 48], ['game/img/tilesets/Outside_C.png', 48, 48],
        ['game/img/tilesets/Inside_B.png', 48, 48], ['game/img/tilesets/Inside_C.png', 48, 48], ['game/img/tilesets/Dungeon_B.png', 48, 48],
        ['game/img/tilesets/Dungeon_C.png', 48, 48]
    ] : []);
    let nStock = 0;
    for (const [rel, fw, fh] of stock) {
        const file = path.join(ROOT, rel);
        if (!fs.existsSync(file)) { log(`note: ${rel} missing, skipped`); continue; }
        const cf = candidateFrames(file, { frame: [fw, fh] });
        const grp = /_A[1-5].png$/.test(rel) ? 'stock ground tiles (A2, A5)' : /People[1-4]|Nature|Monster|Outside_B/.test(rel) ? 'stock RPG Maker' : 'stock RPG Maker (extended)';
        for (const fr of cf.frames) { addC(grp, `${rel}#${fr.frame}`, fr.img); nStock++; }
    }
    let m16 = 0;
    const mdir = path.join(ROOT, 'art', 'masters');
    for (const f of (fs.existsSync(mdir) ? fs.readdirSync(mdir) : []).filter(f => f.endsWith('.png'))) {
        const png = readPNG(path.join(mdir, f));
        if (png.width !== 16 || png.height !== 16) continue;
        m16++;
        addC('flat 16x16 masters', `art/masters/${f}`, normaliseAlpha({ w: 16, h: 16, px: png.data }));
    }
    for (const s of synthetic()) addC('synthetic', `synthetic:${s.name}`, s.img);
    const tC = (Date.now() - t1) / 1000;

    // Distributions.
    const C = records.filter(r => r.set === 'c');
    log('');
    log('sprite mode: D = combined distance to the closest pixel-verified U7 frame (fp = its fingerprint part, px = its pixel part)');
    log('  set                                  n    D: min   p5     median  max    | fp median | px median');
    const groups = [];
    for (const r of records) if (!groups.includes(r.set + '|' + r.group)) groups.push(r.set + '|' + r.group);
    const line = (name, rs) => {
        const s = stats(rs.map(r => r.D)), sf = stats(rs.map(r => r.fp).filter(v => v !== null)), sp = stats(rs.map(r => r.pxd).filter(v => v !== null));
        log(`  ${name.padEnd(35)} ${String(s.n).padStart(5)}  ${f3(s.min)}  ${f3(s.p5)}  ${f3(s.median)}   ${f3(s.max)}  |    ${f3(sf.median)}  |    ${f3(sp.median)}`);
    };
    for (const g of groups) { const [set, group] = g.split('|'); const rs = records.filter(r => r.set === set && r.group === group && !r.tile); if (rs.length) line(`(${set}) ${group}`, rs); }
    line('(c) all originals', C);
    log('texture mode: T = 1 - share of 8x8 blocks matching U7 ground tiles, on the best grid phase (records where it applies)');
    log('  set                                  n    T: min   p5     median  max    | blocks median');
    const tline = (name, rs) => {
        const s = stats(rs.map(r => r.tex.d)), sb = stats(rs.map(r => r.tex.blocks));
        log(`  ${name.padEnd(35)} ${String(s.n).padStart(5)}  ${f3(s.min)}  ${f3(s.p5)}  ${f3(s.median)}   ${f3(s.max)}  |    ${sb.n ? sb.median : '-'}`);
    };
    for (const g of groups) { const [set, group] = g.split('|'); const rs = records.filter(r => r.set === set && r.group === group && r.tex && r.tex.blocks > 0); if (rs.length) tline(`(${set}) ${group}`, rs); }
    const texC = C.filter(r => r.tex && r.tex.blocks > 0);
    tline('(c) all originals with texture', texC);
    const copies = records.filter(r => !r.tile && (r.set === 'a' || (r.set === 'b' && r.spec)));
    const tileCopies = records.filter(r => r.tile && (r.set === 'a' || r.set === 'b'));
    const extras = records.filter(r => r.set === 'b' && !r.spec);
    const maxCopy = Math.max(...copies.map(r => r.D));
    const gradedC = C.filter(r => r.info >= t.MIN_INFO && r.px >= t.MIN_PX);
    const minOrig = Math.min(...gradedC.map(r => r.D));
    log('');
    log(`sprite mode: largest copy distance, (a) and the spec's (b): ${maxCopy.toFixed(3)}; smallest distance of a graded original (c): ${minOrig.toFixed(3)} (${gradedC.length} of ${C.length} originals are graded as sprites; the rest are low-information)`);
    log(maxCopy < minOrig ? `  separable: a FAIL threshold in (${maxCopy.toFixed(3)}, ${minOrig.toFixed(3)}] gives 0 misses and 0 false FAILs` : '  overlap: no single threshold gives 0 misses and 0 false FAILs');
    const maxTex = Math.max(...tileCopies.map(r => (r.tex ? r.tex.d : 1)));
    const minTexC = texC.length ? Math.min(...texC.map(r => r.tex.d)) : 1;
    log(`texture mode: largest texture distance of a tile copy: ${maxTex.toFixed(3)}; smallest of an original: ${minTexC.toFixed(3)}${maxTex < minTexC ? ` (separable: a threshold in (${maxTex.toFixed(3)}, ${minTexC.toFixed(3)}])` : ' (overlap)'}`);
    log(`(a) the top match is the frame's own shape: ${selfTop}/${picks.length}; copies whose true frame missed the pixel-verified shortlist: ${recallMiss.length}${recallMiss.length ? ' (' + recallMiss.slice(0, 6).join('; ') + ')' : ''}`);
    log(`time: (a)+(b) ${tAB.toFixed(1)} s for ${nAB} checks (${(1000 * tAB / nAB).toFixed(0)} ms each); (c) ${tC.toFixed(1)} s for ${C.length} checks (${(1000 * tC / Math.max(1, C.length)).toFixed(0)} ms each)`);
    log('');
    const aAll = records.filter(r => r.set === 'a');
    const aMiss = aAll.filter(r => r.grade !== 'FAIL');
    check('calibration.a_u7_frames_fail', aMiss.length === 0, `${aAll.length - aMiss.length}/${aAll.length} FAIL (${picks.length} sprite frames, ${aAll.length - picks.length} ground tiles)${aMiss.length ? '; missed: ' + aMiss.slice(0, 5).map(r => `${r.label} ${r.grade} ${r.D.toFixed(3)}`).join('; ') : ''}`);
    for (const g of groups.filter(g => g.startsWith('b|')).map(g => g.slice(2))) {
        const rs = records.filter(r => r.set === 'b' && r.group === g);
        const miss = rs.filter(r => r.grade !== 'FAIL');
        const extra = g.endsWith('[extra]');
        check(`calibration.b_${g.replace(' [extra]', '').replace(/ /g, '_')}${extra ? '_extra' : ''}_fail`, miss.length === 0, `${rs.length - miss.length}/${rs.length} FAIL, miss rate ${(100 * miss.length / Math.max(1, rs.length)).toFixed(1)} %${miss.length ? '; missed: ' + miss.slice(0, 4).map(r => `${r.label} ${r.grade} ${r.D.toFixed(3)}${r.tex ? ' tex ' + r.tex.d.toFixed(2) : ''}`).join('; ') : ''}`);
    }
    const fpC = C.filter(r => r.grade === 'FAIL'), warnC = C.filter(r => r.grade === 'WARN');
    const fpRate = 100 * fpC.length / Math.max(1, C.length);
    check('calibration.c_originals_not_fail', fpRate <= (opts.maxFpRate === undefined ? 1 : opts.maxFpRate),
        `${fpC.length}/${C.length} false FAIL (${fpRate.toFixed(2)} %), ${warnC.length} WARN (${(100 * warnC.length / Math.max(1, C.length)).toFixed(1)} %)${fpC.length ? '; ' + fpC.slice(0, 6).map(r => `${r.label} ${r.D.toFixed(3)} vs ${r.top}`).join('; ') : ''}`);
    if (warnC.length) log(`  WARN on originals: ${warnC.slice(0, 16).map(r => `${r.label} ${r.D.toFixed(3)} vs ${r.top}`).join('; ')}${warnC.length > 16 ? ' ...' : ''}`);
    check('calibration.c_inputs_present', m16 > 0 && nStock > 0, `${nStock} stock frames, ${m16} flat 16x16 masters, ${synthetic().length} synthetic shapes`);
    if (opts.dump) { fs.writeFileSync(opts.dump, JSON.stringify(records)); log(`records written to ${opts.dump}`); }
    const passed = checks.filter(Boolean).length;
    log(`RESULT: ${passed} passed, ${checks.length - passed} failed (originality_check selftest: ${copies.length} sprite copies, ${tileCopies.length} ground-tile copies, ${extras.length} extra copies, ${C.length} originals)`);
    return { ok: passed === checks.length, records };
}

// ---------------------------------------------------------------------------------------------
// CLI
function usage() {
    console.log(`usage:
  node tools/originality_check.js --build-index [--index <file>]
  node tools/originality_check.js <png> [<png>...] [--report <out.png>] [--json] [--frame WxH] [--index <file>]
  node tools/originality_check.js --selftest [--sample N] [--tile-sample N] [--seed S] [--extended] [--dump <records.json>]
options: --fail-threshold X / --warn-threshold X override the calibrated thresholds (to see the checks fail).
exit: 0 no FAIL, 1 a FAIL (or a failed selftest expectation), 2 bad arguments or no index.`);
}
function parseArgs(argv) {
    const o = { files: [], thresholds: {} };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--build-index') o.build = true;
        else if (a === '--selftest') o.selftest = true;
        else if (a === '--json') o.json = true;
        else if (a === '--extended') o.extended = true;
        else if (a === '--report') o.report = argv[++i];
        else if (a === '--index') o.index = argv[++i];
        else if (a === '--sample') o.sample = parseInt(argv[++i], 10);
        else if (a === '--tile-sample') o.tileSample = parseInt(argv[++i], 10);
        else if (a === '--seed') o.seed = parseInt(argv[++i], 10);
        else if (a === '--dump') o.dump = argv[++i];
        else if (a === '--progress') o.progress = true;
        else if (a === '--frame') { const m = /^(\d+)x(\d+)$/i.exec(argv[++i] || ''); if (!m) throw new Error('--frame needs WxH'); o.frame = [+m[1], +m[2]]; }
        else if (a === '--fail-threshold') o.thresholds.FAIL = parseFloat(argv[++i]);
        else if (a === '--warn-threshold') o.thresholds.WARN = parseFloat(argv[++i]);
        else if (a === '--help' || a === '-h') o.help = true;
        else if (a.startsWith('--')) throw new Error('unknown option ' + a);
        else o.files.push(a);
    }
    return o;
}

function main() {
    let o;
    try { o = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message); usage(); process.exit(2); }
    if (o.help || (!o.build && !o.selftest && !o.files.length)) { usage(); process.exit(o.help ? 0 : 2); }
    const indexFile = o.index ? path.resolve(o.index) : DEFAULT_INDEX;
    if (o.build) {
        console.log(`building ${indexFile} ...`);
        const r = buildIndex(indexFile);
        console.log(`sources: ${r.sources.map(s => `${s.id} (${s.path})`).join(', ')}`);
        console.log(`indexed ${r.unique} unique frames (${r.decoded} decoded, ${r.empty} empty, ${r.dups} exact duplicates folded in, ${r.failed} undecodable) in ${r.secs.toFixed(1)} s; ${(r.bytes / 1048576).toFixed(1)} MB`);
        if (!o.selftest && !o.files.length) return;
    }
    if (o.selftest) {
        const r = selftest({ index: indexFile, sample: o.sample, tileSample: o.tileSample, seed: o.seed, thresholds: o.thresholds, extended: o.extended, dump: o.dump, progress: o.progress });
        process.exit(r.ok ? 0 : 1);
    }
    // Resolve deterministic provenance before loading the large perceptual index. A policy-only
    // invocation therefore still fails correctly when no local U7 index is available.
    const policies = new Map();
    let needsIndex = false;
    for (const file of o.files) {
        const policy = standInPolicy(file);
        if (!policy) { needsIndex = true; continue; }
        try {
            if (!fs.statSync(file).isFile()) throw new Error('not a file');
        } catch (e) { console.error(`${file}: ${e.message}`); process.exit(2); }
        policies.set(file, policy);
    }
    let index = null, lib = null, loadMs = 0;
    if (needsIndex) {
        const tLoad = Date.now();
        index = loadIndex(indexFile);
        loadMs = Date.now() - tLoad;
        if (!index) { console.error(`no index at ${indexFile}: run with --build-index first`); process.exit(2); }
        lib = index.lib;
        if (!lib && !o.json) console.log('note: the U7 game files were not found; stage 2 (pixel verification) is skipped and the grade rests on fingerprints alone');
    }
    const results = [], reportRows = [];
    let anyFail = false;
    for (const file of o.files) {
        const policy = policies.get(file);
        if (policy) {
            const fileRes = Object.assign({ file }, policyFailure(policy));
            results.push(fileRes);
            anyFail = true;
            if (!o.json) {
                console.log(`== ${file} (provenance policy)`);
                console.log(`  POLICY FAIL: ${policy.why}`);
                console.log(`FILE FAIL ${file}`);
            }
            continue;
        }
        let cf;
        try { cf = candidateFrames(file, { frame: o.frame }); } catch (e) { console.error(`${file}: ${e.message}`); process.exit(2); }
        const fileRes = { file, width: cf.width, height: cf.height, frame: [cf.frameW, cf.frameH], frameSource: cf.source, frames: [] };
        const seen = new Map();   // identical frames are checked once
        for (const fr of cf.frames) {
            const t0 = Date.now();
            const key = fr.img.w + 'x' + fr.img.h + ':' + Buffer.from(fr.img.px).toString('base64');
            let r = seen.get(key);
            if (r) r = Object.assign({}, r, { ms: 0, sameAs: r.frameNo });
            else { r = checkImage(index, fr.img, o); r.ms = Date.now() - t0; r.frameNo = fr.frame; seen.set(key, r); }
            fileRes.frames.push(Object.assign({ frame: fr.frame, box: fr.box }, r));
            if (r.grade === 'FAIL') anyFail = true;
            reportRows.push({ img: fr.img, label: `${path.basename(file)}${cf.frames.length > 1 ? ' #' + fr.frame : ''}`, result: r });
        }
        const g = fileRes.frames.some(f => f.grade === 'FAIL') ? 'FAIL' : fileRes.frames.some(f => f.grade === 'WARN') ? 'WARN' : 'PASS';
        fileRes.grade = g;
        results.push(fileRes);
        if (!o.json) {
            console.log(`== ${file} (${cf.width}x${cf.height}, frames ${cf.frameW}x${cf.frameH} from ${cf.source}, ${cf.frames.length} with content)`);
            for (const f of fileRes.frames) {
                const m = f.matches[0];
                console.log(`  ${f.grade} frame ${f.frame} [${f.box.join(',')}]${f.sameAs !== undefined ? ` (same pixels as frame ${f.sameAs})` : ''}: ${f.why}; closest ${m ? `${m.source} shape ${m.shape} frame ${m.frame} (${m.w}x${m.h}; fingerprint ${m.fp.toFixed(3)} via ${m.fpVia}${m.px ? `; pixel ${m.px.d.toFixed(3)}: mask overlap ${m.px.iou}, step kappa ${m.px.kSteps}, colour kappa ${m.px.kColours}, ${m.px.orient} at scale ${m.px.scale}` : ''})` : '-'}; ${f.ms} ms`);
                if (f.grade !== 'PASS') for (const mm of f.matches.slice(1)) console.log(`      also ${mm.source} shape ${mm.shape} frame ${mm.frame}: ${mm.distance.toFixed(3)}`);
            }
            console.log(`FILE ${g} ${file}`);
        }
    }
    if (o.report) {
        let rows = reportRows;
        if (rows.length > 24) rows = rows.slice().sort((a, b) => a.result.distance - b.result.distance).slice(0, 24);
        if (rows.length) {
            const r = writeReport(o.report, rows, lib);
            if (!o.json) console.log(`report: ${o.report} (${r.width}x${r.height}, ${rows.length} rows${rows.length < reportRows.length ? `, the ${rows.length} closest of ${reportRows.length} frames` : ''}; U7-derived: keep it local)`);
        } else if (!o.json) console.log('report: not written (all results were provenance-policy failures; there are no perceptual comparison rows)');
    }
    const nFail = results.filter(r => r.grade === 'FAIL').length, nWarn = results.filter(r => r.grade === 'WARN').length;
    if (o.json) console.log(JSON.stringify({ index: indexFile, indexLoadMs: loadMs, thresholds: { FAIL: o.thresholds.FAIL || T.FAIL, WARN: o.thresholds.WARN || T.WARN }, results }, null, 1));
    else console.log(`RESULT ${anyFail ? 'FAIL' : 'PASS'} ${results.length - nFail}/${results.length} files without a FAIL, ${nWarn} WARN (originality_check; index load ${loadMs} ms)`);
    process.exit(anyFail ? 1 : 0);
}

module.exports = {
    checkFile, checkSheet, writeCopyFixture, getIndex, buildIndex, loadIndex, checkImage, candidateFrames, selftest,
    standInPolicy, standInDeclarations, T, DEFAULT_INDEX,
    _internal: { U7Library, fingerprint, crop, shift, mirror, transpose, scaleNearest, recolour, editPixels, textureCheck, nativeScale, complexity }
};
if (require.main === module) main();
