#!/usr/bin/env node
'use strict';
// tools/make_25d.js: turns one raw art delivery into a game-ready master (1 art px = 1 screen px).
//
//   node tools/make_25d.js <raw file> [options]            one delivery -> art/masters/<id>.png + <id>.json
//   node tools/make_25d.js <folder> [options]              every asset listed in <folder>/manifest.json
//   node tools/make_25d.js --selftest [--break <step>]     synthetic inputs prove every step (exit 1 on a FAIL)
//
// Deliveries follow docs/handoffs/GENERATOR_PROMPTS.md: drawn on a 4x canvas (every final pixel a 4x4
// block, one 48 px grid square = 192x192), flat magenta background, either already in the 2.5D style
// (--lean none, the default) or drawn flat and upright (rule 12: --lean full / --lean box adds the lean).
//
// Steps, in order (doc: docs/systems/MAKE_25D.md):
//   1 load        PNG natively (tools/png_read.js); JPEG/BMP/GIF/TIFF through PowerShell System.Drawing and
//                 WEBP through PowerShell WPF (WIC) to a temp PNG. The format is sniffed from the bytes.
//   2 background  magenta #FF00FF (or --bg auto = the corner colour, or --bg #rrggbb, or --bg none) within
//                 --bg-tol, flood-filled from the image (or every sheet cell) edges, so enclosed pixels of that
//                 colour survive; alpha becomes 0/255 by --alpha.
//   3 blocks      block size N (default 4; --block auto measures it; --block n forces it), one
//                 representative per block by majority, never bilinear; optional --height rescale (nearest or
//                 majority, never blur, with a warning).
//   4 palette     every opaque pixel snapped to the nearest colour of art/palette/uf.hex in CIELAB (CIE76);
//                 --max-colors n merges the least-used colours; --despeckle removes isolated single pixels.
//   5 lean        --lean none | full (shear every row left by (baseline - row) * slope) | box (--top n rows move
//                 as a block by the full height; --east w adds an east face one palette step darker).
//   6 outline     --outline: #201408 on the lower and right silhouette edge pixels.
//   7 frame       --frame auto | 48 | 96 | 96x144 | WxH: ground contact at the bottom-centre of the frame's
//                 bottom-right 48x48 cell (the bottom-centre of a 48 frame), never cropping.
//   8 sheet       --sheet CxR: every cell processed alike (one block size, one baseline per sheet row).
//   9 output      art/masters/<id>.png (or --out) + <id>.json sidecar; --preview <png> at 1x and 4x on a
//                 48 px meadow grid with a 32 px person-height ruler and the input thumbnail.

const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');
const CELL = 48;
const OUTLINE_RGB = [0x20, 0x14, 0x08];
const STANDARD_FRAMES = [[48, 48], [96, 96], [96, 144]];
const CREATURE_ANIMS = { stand: [0], walk: [1, 2, 3], work: [4, 5, 6], carry: [7], attack: [8, 9, 10], cast: [11, 12, 13], hurt: [14], death: [15, 16, 17], idle: [18, 19] };
const DEFAULTS = {
    id: null, out: null, force: false, dryRun: false, preview: null, previewDir: null,
    bg: 'magenta', bgTol: 64, alpha: 128, bgHoles: false,
    block: '4', height: null, heightTol: 0,
    maxColors: null, despeckle: false,
    lean: 'none', slope: 1, top: null, east: 0, baseline: null,
    outline: false, frame: 'auto', place: 'auto', sheet: '1x1',
    facings: null, anim: null, frameMs: 150, footprint: '1x1'
};
const BREAKABLE = ['bg', 'block', 'detect', 'palette', 'lean', 'box', 'frame', 'sheet', 'outline', 'sidecar', 'despeckle'];
let BREAK = null; // --selftest --break <step> sabotages one step on purpose, to prove the self-test can FAIL

// ---------------------------------------------------------------- small image helpers
// An image is { w, h, d } with d a Buffer of w*h RGBA bytes. Opaque means alpha 255 after step 2.

function newImg(w, h) { return { w, h, d: Buffer.alloc(w * h * 4) }; }
function cloneImg(img) { return { w: img.w, h: img.h, d: Buffer.from(img.d) }; }
function rgbKey(d, o) { return (d[o] << 16) | (d[o + 1] << 8) | d[o + 2]; }
function keyRgb(k) { return [(k >> 16) & 255, (k >> 8) & 255, k & 255]; }
function hex(rgb) { return '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase(); }
function parseHex(s) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(s).trim());
    return m ? keyRgb(parseInt(m[1], 16)) : null;
}
function setPx(img, x, y, rgb, a) {
    const o = (y * img.w + x) * 4;
    img.d[o] = rgb[0]; img.d[o + 1] = rgb[1]; img.d[o + 2] = rgb[2]; img.d[o + 3] = a === undefined ? 255 : a;
}
function opaqueAt(img, x, y) { return x >= 0 && y >= 0 && x < img.w && y < img.h && img.d[(y * img.w + x) * 4 + 3] !== 0; }
function keyAt(img, x, y) { const o = (y * img.w + x) * 4; return img.d[o + 3] ? rgbKey(img.d, o) : -1; }

function crop(img, x0, y0, w, h) {
    const out = newImg(w, h);
    for (let y = 0; y < h; y++) {
        const sy = y0 + y;
        if (sy < 0 || sy >= img.h) continue;
        for (let x = 0; x < w; x++) {
            const sx = x0 + x;
            if (sx < 0 || sx >= img.w) continue;
            img.d.copy(out.d, (y * w + x) * 4, (sy * img.w + sx) * 4, (sy * img.w + sx) * 4 + 4);
        }
    }
    return out;
}

// Copies the opaque pixels of src into dst at (dx, dy); returns how many landed inside dst.
function blit(dst, src, dx, dy) {
    let n = 0;
    for (let y = 0; y < src.h; y++) {
        for (let x = 0; x < src.w; x++) {
            const so = (y * src.w + x) * 4;
            if (!src.d[so + 3]) continue;
            const tx = x + dx, ty = y + dy;
            if (tx < 0 || ty < 0 || tx >= dst.w || ty >= dst.h) continue;
            src.d.copy(dst.d, (ty * dst.w + tx) * 4, so, so + 4);
            n++;
        }
    }
    return n;
}

function opaqueCount(img) { let n = 0; for (let i = 3; i < img.d.length; i += 4) if (img.d[i]) n++; return n; }

function bbox(img) {
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    for (let y = 0; y < img.h; y++) {
        for (let x = 0; x < img.w; x++) {
            if (!img.d[(y * img.w + x) * 4 + 3]) continue;
            if (x < x0) x0 = x; if (x > x1) x1 = x;
            if (y < y0) y0 = y; y1 = y;
        }
    }
    return x1 < 0 ? null : { x0, y0, x1, y1 };
}

// The lowest opaque row and the horizontal span of its opaque pixels: the ground contact.
function lowestSpan(img) {
    for (let y = img.h - 1; y >= 0; y--) {
        let x0 = -1, x1 = -1;
        for (let x = 0; x < img.w; x++) if (img.d[(y * img.w + x) * 4 + 3]) { if (x0 < 0) x0 = x; x1 = x; }
        if (x0 >= 0) return { y, x0, x1 };
    }
    return null;
}

function colourSet(imgs) {
    const s = new Set();
    for (const img of imgs) for (let o = 0; o < img.d.length; o += 4) if (img.d[o + 3]) s.add(rgbKey(img.d, o));
    return s;
}

function fromDecoded(dec) { return { w: dec.width, h: dec.height, d: Buffer.from(dec.data) }; }

function rel(p) {
    const r = path.relative(ROOT, path.resolve(p));
    return r && !r.startsWith('..') && !path.isAbsolute(r) ? r.split(path.sep).join('/') : p;
}

// ---------------------------------------------------------------- colour: CIELAB and the palette

function srgbToLab(r, g, b) {
    const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const R = lin(r), G = lin(g), B = lin(b);
    const X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
    const Y = (R * 0.2126729 + G * 0.7151522 + B * 0.0721750);
    const Z = (R * 0.0193339 + G * 0.1191920 + B * 0.9503041) / 1.08883;
    const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (t * 24389 / 27 + 16) / 116);
    const fx = f(X), fy = f(Y), fz = f(Z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
function labDist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }

let PALETTE = null;
function loadPalette(file) {
    const text = fs.readFileSync(file, 'utf8');
    const raw = [];
    for (const line of text.split(/\r?\n/)) {
        const t = line.trim();
        if (!t || t.startsWith(';') || t.startsWith('//')) continue;
        const rgb = parseHex(t);
        if (!rgb) throw new Error(`${rel(file)}: not a colour: "${t}"`);
        raw.push(rgb);
    }
    const unique = [], index = new Map();
    for (const rgb of raw) {
        const k = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
        if (!index.has(k)) { index.set(k, unique.length); unique.push(rgb); }
    }
    return { file, raw, unique, index, lab: unique.map((c) => srgbToLab(...c)), cache: new Map(), darker: new Map() };
}
function getPalette() { if (!PALETTE) PALETTE = loadPalette(PALETTE_FILE); return PALETTE; }

// Index (into pal.unique) of the palette colour nearest to (r, g, b) in CIELAB (CIE76 distance).
function nearest(pal, r, g, b) {
    const k = (r << 16) | (g << 8) | b;
    if (pal.index.has(k)) return pal.index.get(k);
    let hit = pal.cache.get(k);
    if (hit !== undefined) return hit;
    const lab = srgbToLab(r, g, b);
    let best = 0, bd = Infinity;
    for (let i = 0; i < pal.lab.length; i++) {
        const d = labDist(lab, pal.lab[i]);
        if (d < bd) { bd = d; best = i; }
    }
    pal.cache.set(k, best);
    return best;
}

// One palette step darker: the next entry of the colour's ramp in uf.hex when that entry is darker and of
// the same hue (a*b* within 20); otherwise the palette colour nearest to (L* - 8, a*, b*) among the darker
// ones. Black has nothing darker and stays black.
function darkerStep(pal, rgb) {
    const k = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
    if (pal.darker.has(k)) return pal.darker.get(k);
    const lab = srgbToLab(...rgb);
    let res = null;
    for (let i = 0; i < pal.raw.length - 1 && !res; i++) {
        const c = pal.raw[i];
        if (c[0] !== rgb[0] || c[1] !== rgb[1] || c[2] !== rgb[2]) continue;
        const n = pal.raw[i + 1], nl = srgbToLab(...n);
        if (nl[0] < lab[0] - 1 && Math.hypot(nl[1] - lab[1], nl[2] - lab[2]) < 20) res = n;
    }
    if (!res) {
        const target = [lab[0] - 8, lab[1], lab[2]];
        let bd = Infinity;
        for (let i = 0; i < pal.unique.length; i++) {
            if (pal.lab[i][0] >= lab[0] - 1) continue;
            const d = labDist(target, pal.lab[i]);
            if (d < bd) { bd = d; res = pal.unique[i]; }
        }
    }
    res = res || rgb;
    pal.darker.set(k, res);
    return res;
}

// ---------------------------------------------------------------- step 1: load

function sniffFormat(buf) {
    if (buf.length >= 8 && buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return 'png';
    if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
    if (buf.length >= 2 && buf.toString('ascii', 0, 2) === 'BM') return 'bmp';
    if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
    if (buf.length >= 4 && buf.toString('ascii', 0, 4) === 'GIF8') return 'gif';
    if (buf.length >= 4 && (buf.toString('ascii', 0, 4) === 'II*\u0000' || buf.toString('ascii', 0, 4) === 'MM\u0000*')) return 'tiff';
    return 'unknown';
}

let PS_OK = null;
function powershellAvailable() {
    if (PS_OK !== null) return PS_OK;
    if (process.platform !== 'win32') { PS_OK = false; return PS_OK; }
    try {
        childProcess.execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', '1'], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 });
        PS_OK = true;
    } catch (e) { PS_OK = false; }
    return PS_OK;
}

function runPowerShell(script, env) {
    const encoded = Buffer.from(`$ErrorActionPreference = 'Stop'\n${script}`, 'utf16le').toString('base64');
    return childProcess.execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
        { env: Object.assign({}, process.env, env), stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 }).toString();
}

const PS_DRAWING_TO_PNG = `Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile($env:UF_M25_IN)
try { $img.Save($env:UF_M25_OUT, [System.Drawing.Imaging.ImageFormat]::Png) } finally { $img.Dispose() }`;
const PS_WIC_TO_PNG = `Add-Type -AssemblyName PresentationCore
$in = [IO.File]::OpenRead($env:UF_M25_IN)
try {
  $dec = [Windows.Media.Imaging.BitmapDecoder]::Create($in, [Windows.Media.Imaging.BitmapCreateOptions]::None, [Windows.Media.Imaging.BitmapCacheOption]::OnLoad)
  $bgra = New-Object Windows.Media.Imaging.FormatConvertedBitmap($dec.Frames[0], [Windows.Media.PixelFormats]::Bgra32, $null, 0)
  $enc = New-Object Windows.Media.Imaging.PngBitmapEncoder
  $enc.Frames.Add([Windows.Media.Imaging.BitmapFrame]::Create($bgra))
  $out = [IO.File]::Create($env:UF_M25_OUT)
  try { $enc.Save($out) } finally { $out.Close() }
} finally { $in.Close() }`;

// Converts a JPEG/BMP/GIF/TIFF (System.Drawing) or WEBP (WPF/WIC) file to a PNG through PowerShell.
function convertToPng(src, dst, format) {
    if (!powershellAvailable()) throw new Error(`${rel(src)} is ${format.toUpperCase()}: converting it needs PowerShell (Windows); save the delivery as PNG instead`);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    try {
        runPowerShell(format === 'webp' ? PS_WIC_TO_PNG : PS_DRAWING_TO_PNG, { UF_M25_IN: path.resolve(src), UF_M25_OUT: path.resolve(dst) });
    } catch (e) {
        const msg = (e.stderr ? e.stderr.toString() : e.message).split(/\r?\n/).filter(Boolean).slice(0, 3).join(' ');
        throw new Error(`PowerShell could not convert ${rel(src)} (${format}) to PNG: ${msg}`);
    }
    return dst;
}

function loadInput(file) {
    const buf = fs.readFileSync(file);
    const format = sniffFormat(buf);
    if (format === 'png') return { img: fromDecoded(decodePNG(buf, rel(file))), format, converted: null };
    if (format === 'unknown') throw new Error(`${rel(file)}: not a PNG, JPEG, BMP, GIF, TIFF or WEBP file (unknown signature)`);
    const tmp = path.join(os.tmpdir(), 'uf_make_25d', `${path.basename(file).replace(/[^\w.-]/g, '_')}.${process.pid}.png`);
    convertToPng(file, tmp, format);
    return { img: fromDecoded(decodePNG(fs.readFileSync(tmp), tmp)), format, converted: { tool: format === 'webp' ? 'PowerShell WPF (WIC) decoder' : 'PowerShell System.Drawing', temp: tmp } };
}

// ---------------------------------------------------------------- step 2: background

function resolveBackground(img, spec, alphaThreshold) {
    if (spec === 'none') return { key: null, desc: 'no background colour (--bg none): only alpha' };
    if (spec === 'magenta') return { key: [255, 0, 255], desc: 'magenta #FF00FF' };
    if (spec === 'auto') {
        const corners = [[0, 0], [img.w - 1, 0], [0, img.h - 1], [img.w - 1, img.h - 1]];
        const counts = new Map();
        let clear = 0;
        for (const [x, y] of corners) {
            const o = (y * img.w + x) * 4;
            if (img.d[o + 3] < alphaThreshold) { clear++; continue; }
            const k = rgbKey(img.d, o);
            counts.set(k, (counts.get(k) || 0) + 1);
        }
        let bestK = null, bestN = 0;
        for (const [k, n] of counts) if (n > bestN) { bestK = k; bestN = n; }
        if (clear >= bestN) return { key: null, desc: `auto: ${clear} of 4 corners transparent, so only alpha` };
        return { key: keyRgb(bestK), desc: `auto: corner colour ${hex(keyRgb(bestK))} (${bestN} of 4 corners)` };
    }
    const rgb = parseHex(spec);
    if (!rgb) throw new Error(`--bg must be magenta, auto, none or #rrggbb (got ${spec})`);
    return { key: rgb, desc: `${hex(rgb)} (--bg)` };
}

// Alpha to 0/255 by the threshold, then a 4-connected flood fill from the edges of every cell through
// pixels that are transparent or within `tol` (largest channel difference) of the background colour.
// Pixels of the background colour that the flood cannot reach (enclosed by the subject) are kept, unless
// `holes` clears them too.
function removeBackground(img, o) {
    const out = cloneImg(img);
    const { w, h, d } = out;
    let alphaCut = 0, alphaRaised = 0;
    for (let i = 3; i < d.length; i += 4) {
        if (d[i] < o.alpha) { if (d[i]) alphaCut++; d[i] = 0; } else if (d[i] < 255) { d[i] = 255; alphaRaised++; }
    }
    const key = o.key, tol = o.tol;
    const isBg = (p) => {
        const q = p * 4;
        if (!d[q + 3]) return true;
        return !!key && Math.abs(d[q] - key[0]) <= tol && Math.abs(d[q + 1] - key[1]) <= tol && Math.abs(d[q + 2] - key[2]) <= tol;
    };
    const mark = new Uint8Array(w * h);
    const queue = new Int32Array(w * h);
    let qh = 0, qt = 0;
    const seed = (x, y) => { const p = y * w + x; if (!mark[p] && isBg(p)) { mark[p] = 1; queue[qt++] = p; } };
    const cw = Math.max(1, o.cellW || w), ch = Math.max(1, o.cellH || h);
    for (let cy = 0; cy < h; cy += ch) {
        for (let cx = 0; cx < w; cx += cw) {
            const xe = Math.min(cx + cw, w) - 1, ye = Math.min(cy + ch, h) - 1;
            for (let x = cx; x <= xe; x++) { seed(x, cy); seed(x, ye); }
            for (let y = cy; y <= ye; y++) { seed(cx, y); seed(xe, y); }
        }
    }
    while (qh < qt) {
        const p = queue[qh++], x = p % w, y = (p - x) / w;
        if (x > 0) seed(x - 1, y);
        if (x < w - 1) seed(x + 1, y);
        if (y > 0) seed(x, y - 1);
        if (y < h - 1) seed(x, y + 1);
    }
    if (BREAK === 'bg') for (let p = 0; p < w * h; p++) if (isBg(p)) mark[p] = 1; // broken: plain colour key, no flood
    let removed = 0, kept = 0, cleared = 0;
    for (let p = 0; p < w * h; p++) {
        const q = p * 4;
        if (mark[p]) {
            if (d[q + 3]) removed++;
            d[q] = d[q + 1] = d[q + 2] = d[q + 3] = 0;
        } else if (key && d[q + 3] && isBg(p)) {
            if (o.holes) { d[q] = d[q + 1] = d[q + 2] = d[q + 3] = 0; cleared++; } else kept++;
        }
    }
    return { img: out, removed, kept, cleared, alphaCut, alphaRaised };
}

// ---------------------------------------------------------------- step 3: blocks

// Runs of equal colour (within tol of the run's first pixel) along rows and columns. `runs` holds the
// lengths of interior opaque runs (not touching the image edge); edgesX/edgesY the x (y) where a new run
// starts, i.e. where the colour changes.
function colourRuns(img, tol) {
    const { w, h, d } = img;
    const runs = [], edgesX = [], edgesY = [];
    const same = (a, b) => {
        const aa = d[a + 3], ba = d[b + 3];
        if (!aa || !ba) return !aa && !ba;
        return Math.abs(d[a] - d[b]) <= tol && Math.abs(d[a + 1] - d[b + 1]) <= tol && Math.abs(d[a + 2] - d[b + 2]) <= tol;
    };
    for (let y = 0; y < h; y++) {
        let s = 0;
        for (let x = 1; x <= w; x++) {
            if (x < w && same((y * w + s) * 4, (y * w + x) * 4)) continue;
            if (s > 0 && x < w && d[(y * w + s) * 4 + 3]) runs.push(x - s);
            if (x < w) edgesX.push(x);
            s = x;
        }
    }
    for (let x = 0; x < w; x++) {
        let s = 0;
        for (let y = 1; y <= h; y++) {
            if (y < h && same((s * w + x) * 4, (y * w + x) * 4)) continue;
            if (s > 0 && y < h && d[(s * w + x) * 4 + 3]) runs.push(y - s);
            if (y < h) edgesY.push(y);
            s = y;
        }
    }
    return { runs, edgesX, edgesY };
}

function sampleList(list, max) {
    if (list.length <= max) return list;
    const out = [], step = list.length / max;
    for (let i = 0; i < max; i++) out.push(list[Math.floor(i * step)]);
    return out;
}

// Circular statistics of edge positions modulo n: r = 1 when every edge sits on one lattice x = phase + k*n.
function circ(edges, n) {
    let c = 0, s = 0;
    for (const e of edges) { const t = 2 * Math.PI * e / n; c += Math.cos(t); s += Math.sin(t); }
    const m = edges.length || 1;
    return { r: Math.hypot(c, s) / m, phase: (((Math.atan2(s, c) / (2 * Math.PI)) * n) % n + n) % n };
}

// A non-integer block grid (the delivery was resized): the largest period n in [1.5, 32] whose lattice
// fits the colour edges almost as well as the best one.
function latticeFit(edgesX, edgesY) {
    const ex = sampleList(edgesX, 2500), ey = sampleList(edgesY, 2500);
    if (ex.length + ey.length < 40) return null;
    const R = (n) => (circ(ex, n).r * ex.length + circ(ey, n).r * ey.length) / (ex.length + ey.length);
    const scan = [];
    let rmax = 0;
    for (let n = 1.5; n <= 32.0001; n += 0.01) { const r = R(n); scan.push([n, r]); if (r > rmax) rmax = r; }
    let pick = null;
    for (const [n, r] of scan) if (r >= 0.8 * rmax) pick = n;
    if (pick === null) return null;
    let best = pick, br = R(pick);
    for (let n = pick - 0.02; n <= pick + 0.02; n += 0.0005) { const r = R(n); if (r > br) { br = r; best = n; } }
    return { n: Math.round(best * 1000) / 1000, r: br };
}

// Measures the block size: the largest integer N in 2..16 such that at least 80% of the colour runs are
// whole multiples of N (the mode of the run lengths is reported too); if none, a non-integer lattice fit.
function detectBlock(img, tol) {
    const { runs, edgesX, edgesY } = colourRuns(img, tol === undefined ? 24 : tol);
    const res = { size: 1, method: '', confidence: 0, runs: runs.length, scores: {}, mode: null };
    const hist = new Map();
    for (const l of runs) hist.set(l, (hist.get(l) || 0) + 1);
    let modeN = 0;
    for (const [l, n] of hist) if (n > modeN || (n === modeN && l < res.mode)) { res.mode = l; modeN = n; }
    res.phaseFor = (n) => {
        const cx = circ(sampleList(edgesX, 5000), n), cy = circ(sampleList(edgesY, 5000), n);
        const snap = (c) => (c.r < 0.3 ? 0 : Number.isInteger(n) ? Math.round(c.phase) % n : Math.round(c.phase * 100) / 100);
        return [snap(cx), snap(cy)];
    };
    if (runs.length < 12) { res.method = `only ${runs.length} colour runs: too few to measure`; return res; }
    let pick = 1;
    for (let n = 2; n <= 16; n++) {
        const share = runs.filter((l) => l % n === 0).length / runs.length;
        res.scores[n] = Math.round(share * 1000) / 1000;
        if (share >= 0.8) pick = n;
    }
    if (BREAK === 'detect') pick = 4; // broken: always 4
    if (pick > 1) {
        res.size = pick; res.method = 'runs'; res.confidence = res.scores[pick];
        return res;
    }
    const fit = latticeFit(edgesX, edgesY);
    if (fit && fit.r >= 0.6) { res.size = fit.n; res.method = 'lattice'; res.confidence = Math.round(fit.r * 1000) / 1000; return res; }
    res.method = 'no block grid found';
    return res;
}

function pickMax(counts, prefer) {
    let bestK = null, bestN = -1, tie = false;
    for (const [k, n] of counts) {
        if (n > bestN) { bestK = k; bestN = n; tie = false; } else if (n === bestN) { tie = true; if (k === prefer) bestK = k; }
    }
    return { key: bestK, count: bestN, tie };
}

// One representative per n x n block (n may be fractional), never an average: the colour that covers at
// least half of the block; failing that, the palette colour most of the block's pixels snap to. Ties go to
// the colour of the block's centre pixel. Blocks start at phase - n (phase > 0) or 0.
function reduceBlocks(img, n, phaseX, phaseY, pal) {
    const sx0 = phaseX > 0 ? phaseX - n : 0, sy0 = phaseY > 0 ? phaseY - n : 0;
    const W = Math.max(1, Math.ceil((img.w - sx0) / n - 1e-9)), H = Math.max(1, Math.ceil((img.h - sy0) / n - 1e-9));
    const out = newImg(W, H);
    const stats = { blocks: 0, uniform: 0, majority: 0, paletteVote: 0, ties: 0, empty: 0 };
    const clampX = (v) => Math.max(0, Math.min(img.w, v)), clampY = (v) => Math.max(0, Math.min(img.h, v));
    const counts = new Map(), pcounts = new Map();
    for (let by = 0; by < H; by++) {
        const y0 = clampY(Math.round(sy0 + by * n)), y1 = clampY(Math.round(sy0 + (by + 1) * n));
        for (let bx = 0; bx < W; bx++) {
            const x0 = clampX(Math.round(sx0 + bx * n)), x1 = clampX(Math.round(sx0 + (bx + 1) * n));
            stats.blocks++;
            if (x1 <= x0 || y1 <= y0) { stats.empty++; continue; }
            counts.clear();
            let total = 0;
            for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const k = keyAt(img, x, y); counts.set(k, (counts.get(k) || 0) + 1); total++; }
            const centre = keyAt(img, x0 + ((x1 - x0) >> 1), y0 + ((y1 - y0) >> 1));
            let best = pickMax(counts, centre);
            if (BREAK === 'block') { const k = keyAt(img, x0, y0); best = { key: k, count: counts.get(k), tie: false }; } // broken: top-left sample
            let rep;
            if (best.count * 2 >= total) {
                rep = best.key;
                if (best.count === total) stats.uniform++; else stats.majority++;
                if (best.tie) stats.ties++;
            } else {
                pcounts.clear();
                for (const [k, c] of counts) { const pk = k < 0 ? -1 : nearest(pal, ...keyRgb(k)); pcounts.set(pk, (pcounts.get(pk) || 0) + c); }
                const pc = pickMax(pcounts, centre < 0 ? -1 : nearest(pal, ...keyRgb(centre)));
                rep = pc.key < 0 ? -1 : ((pal.unique[pc.key][0] << 16) | (pal.unique[pc.key][1] << 8) | pal.unique[pc.key][2]);
                stats.paletteVote++;
                if (pc.tie) stats.ties++;
            }
            if (rep >= 0) setPx(out, bx, by, keyRgb(rep));
        }
    }
    return { img: out, stats };
}

// Rescale without blur: a whole-number reduction is a majority reduction, a whole-number enlargement
// repeats pixels, anything else is nearest neighbour sampled at pixel centres.
function rescale(img, f, pal) {
    const inv = 1 / f, ki = Math.round(inv), kf = Math.round(f);
    if (ki >= 2 && Math.abs(inv - ki) < 0.01) return { img: reduceBlocks(img, ki, 0, 0, pal).img, method: `majority of ${ki}x${ki} blocks` };
    const W = Math.max(1, Math.round(img.w * f)), H = Math.max(1, Math.round(img.h * f));
    const out = newImg(W, H);
    for (let y = 0; y < H; y++) {
        const sy = Math.min(img.h - 1, Math.floor((y + 0.5) / f));
        for (let x = 0; x < W; x++) {
            const sx = Math.min(img.w - 1, Math.floor((x + 0.5) / f));
            img.d.copy(out.d, (y * W + x) * 4, (sy * img.w + sx) * 4, (sy * img.w + sx) * 4 + 4);
        }
    }
    return { img: out, method: kf >= 2 && Math.abs(f - kf) < 0.01 ? `each pixel repeated ${kf}x${kf}` : 'nearest neighbour' };
}

// ---------------------------------------------------------------- step 4: palette

function snapToPalette(img, pal) {
    let changed = 0;
    const from = new Set();
    if (BREAK === 'palette') return { changed, sources: 0 }; // broken: no snapping
    for (let o = 0; o < img.d.length; o += 4) {
        if (!img.d[o + 3]) continue;
        const k = rgbKey(img.d, o);
        if (pal.index.has(k)) continue;
        const c = pal.unique[nearest(pal, img.d[o], img.d[o + 1], img.d[o + 2])];
        img.d[o] = c[0]; img.d[o + 1] = c[1]; img.d[o + 2] = c[2];
        changed++; from.add(k);
    }
    return { changed, sources: from.size };
}

// Merges the least-used colour into its nearest remaining one (CIELAB) until at most `max` are left.
function limitColors(frames, max) {
    const counts = new Map();
    for (const f of frames) for (let o = 0; o < f.d.length; o += 4) if (f.d[o + 3]) { const k = rgbKey(f.d, o); counts.set(k, (counts.get(k) || 0) + 1); }
    const merges = [];
    const labOf = new Map();
    const lab = (k) => { if (!labOf.has(k)) labOf.set(k, srgbToLab(...keyRgb(k))); return labOf.get(k); };
    while (counts.size > max) {
        let minK = null;
        for (const [k, c] of counts) if (minK === null || c < counts.get(minK) || (c === counts.get(minK) && k < minK)) minK = k;
        let best = null, bd = Infinity;
        for (const k of counts.keys()) if (k !== minK) { const dd = labDist(lab(minK), lab(k)); if (dd < bd) { bd = dd; best = k; } }
        const into = keyRgb(best);
        for (const f of frames) for (let o = 0; o < f.d.length; o += 4) if (f.d[o + 3] && rgbKey(f.d, o) === minK) { f.d[o] = into[0]; f.d[o + 1] = into[1]; f.d[o + 2] = into[2]; }
        merges.push(`${hex(keyRgb(minK))} (${counts.get(minK)} px) -> ${hex(into)}`);
        counts.set(best, counts.get(best) + counts.get(minK));
        counts.delete(minK);
    }
    return merges;
}

// Isolated single pixels: an opaque pixel with no opaque neighbour (8-connected) is cleared; an opaque
// pixel whose 8 neighbours are all one other colour takes that colour.
function despeckle(img) {
    const src = img.d, out = Buffer.from(src);
    let removed = 0, filled = 0;
    for (let y = 0; y < img.h; y++) {
        for (let x = 0; x < img.w; x++) {
            const o = (y * img.w + x) * 4;
            if (!src[o + 3]) continue;
            let opaqueN = 0, first = null, same = true;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (!dx && !dy) continue;
                    const nx = x + dx, ny = y + dy;
                    if (!opaqueAt(img, nx, ny)) { same = false; continue; }
                    opaqueN++;
                    const k = rgbKey(src, (ny * img.w + nx) * 4);
                    if (first === null) first = k; else if (k !== first) same = false;
                }
            }
            if (opaqueN === 0) { out[o] = out[o + 1] = out[o + 2] = out[o + 3] = 0; removed++; }
            else if (BREAK !== 'despeckle' && opaqueN === 8 && same && first !== rgbKey(src, o)) { const c = keyRgb(first); out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; filled++; }
        }
    }
    if (BREAK === 'despeckle') return { removed: 0, filled: 0 };
    img.d = out;
    return { removed, filled };
}

// ---------------------------------------------------------------- step 5: lean

// The canvas grows by padLeft on the left (the largest possible shift, row 0) and padRight on the right
// (rows below the baseline shift right), so every frame of one sheet row shares one coordinate system.
function leanPads(h, baseline, slope) {
    return { padLeft: Math.ceil(Math.max(0, baseline) * slope), padRight: Math.ceil(Math.max(0, h - 1 - baseline) * slope) };
}

// mode full: every row r moves left by round((baseline - r) * slope); rows stay horizontal, nothing rotates.
// mode box: the top `top` rows of the subject (the top face) move as one block by the full height
// H = baseline - (firstRow + top) + 1; the rows below (the south face) shear as in full.
// east > 0: an east face, each right-edge pixel of the south face extruded `east` px up (north), one
// palette step darker, never above the subject's top row.
function leanFrame(img, o) {
    if (o.mode === 'none') return { img: cloneImg(img), padLeft: 0, padRight: 0, east: 0 };
    const b = o.baseline, s = BREAK === 'lean' ? o.slope / 2 : o.slope;
    const { padLeft, padRight } = leanPads(img.h, b, o.slope);
    const out = newImg(img.w + padLeft + padRight, img.h);
    const box = bbox(img);
    if (!box) return { img: out, padLeft, padRight, east: 0 };
    const t0 = box.y0;
    const faceEnd = o.mode === 'box' ? t0 + o.top : t0; // first row of the south face
    const H = b - faceEnd + 1;
    const shiftOf = (r) => {
        if (o.mode === 'box' && r < faceEnd && BREAK !== 'box') return Math.round(H * s);
        return Math.round((b - r) * s);
    };
    for (let y = 0; y < img.h; y++) {
        const sh = shiftOf(y);
        for (let x = 0; x < img.w; x++) {
            const so = (y * img.w + x) * 4;
            if (!img.d[so + 3]) continue;
            const tx = x + padLeft - sh;
            if (tx < 0 || tx >= out.w) continue;
            img.d.copy(out.d, (y * out.w + tx) * 4, so, so + 4);
        }
    }
    let east = 0;
    if (o.east > 0) east = addEastFace(out, faceEnd, Math.min(b, box.y1), o.east, t0, o.pal);
    return { img: out, padLeft, padRight, east };
}

function addEastFace(img, rStart, rEnd, depth, topLimit, pal) {
    const adds = new Map(); // pixel index -> rgb
    for (let r = rStart; r <= rEnd; r++) {
        let xe = -1;
        for (let x = img.w - 1; x >= 0; x--) if (opaqueAt(img, x, r)) { xe = x; break; }
        if (xe < 0) continue;
        const o = (r * img.w + xe) * 4;
        const dark = darkerStep(pal, [img.d[o], img.d[o + 1], img.d[o + 2]]);
        for (let dd = 1; dd <= depth; dd++) {
            const y = r - dd;
            if (y < topLimit || y < 0 || opaqueAt(img, xe, y)) continue;
            const p = y * img.w + xe;
            if (!adds.has(p)) adds.set(p, dark);
        }
    }
    // close gaps a slope other than 1 leaves between the silhouette and the extruded pixels
    const byRow = new Map();
    for (const p of adds.keys()) { const y = Math.floor(p / img.w), x = p % img.w; if (!byRow.has(y) || byRow.get(y) < x) byRow.set(y, x); }
    for (const [y, xmax] of byRow) {
        let x = xmax - 1, fill = adds.get(y * img.w + xmax);
        while (x >= 0 && !opaqueAt(img, x, y)) {
            const p = y * img.w + x;
            if (adds.has(p)) fill = adds.get(p); else adds.set(p, fill);
            x--;
        }
    }
    for (const [p, rgb] of adds) setPx(img, p % img.w, Math.floor(p / img.w), rgb);
    return adds.size;
}

// ---------------------------------------------------------------- step 6: outline

function outlineFrame(img) {
    const marks = [];
    for (let y = 0; y < img.h; y++) {
        for (let x = 0; x < img.w; x++) {
            if (!opaqueAt(img, x, y)) continue;
            const edge = BREAK === 'outline' ? !opaqueAt(img, x - 1, y) : (!opaqueAt(img, x, y + 1) || !opaqueAt(img, x + 1, y));
            if (edge) marks.push([x, y]);
        }
    }
    for (const [x, y] of marks) setPx(img, x, y, OUTLINE_RGB);
    return marks.length;
}

// ---------------------------------------------------------------- step 7: frame placement

// rowInfo[r] = { box (union over the row's frames), cx (ground contact x), b (baseline) } or null.
// The anchor is the bottom-centre of the frame's bottom-right 48 x 48 cell ([24, 47] in a 48 frame,
// [72, 95] in 96 x 96). Every row's contact goes onto the anchor; if the subject would cross the frame's
// edge, the anchor moves (the same for every row) just enough to keep it whole. Returns null if it can't.
function tryFrame(fw, fh, rowInfo) {
    const ideal = fw - CELL / 2, ay = BREAK === 'frame' ? fh - 2 : fh - 1;
    let lo = -Infinity, hi = Infinity;
    for (const ri of rowInfo) {
        if (!ri) continue;
        lo = Math.max(lo, ri.cx - ri.box.x0);
        hi = Math.min(hi, fw - 1 - ri.box.x1 + ri.cx);
        const dy = ay - ri.b;
        if (ri.box.y0 + dy < 0 || ri.box.y1 + dy > fh - 1) return null;
    }
    if (lo > hi) return null;
    const ax = Math.min(hi, Math.max(lo, ideal));
    return { fw, fh, ax, ay, moved: ax - ideal, inCell: ax >= fw - CELL && ax <= fw - 1 };
}

function chooseFrame(rowInfo, spec) {
    if (spec !== 'auto') return { plan: tryFrame(spec[0], spec[1], rowInfo), auto: false };
    for (const [w, h] of STANDARD_FRAMES) {
        const p = tryFrame(w, h, rowInfo);
        if (p && p.inCell) return { plan: p, auto: true, standard: true };
    }
    const sizes = [];
    for (let w = CELL; w <= 10 * CELL; w += CELL) for (let h = CELL; h <= 10 * CELL; h += CELL) sizes.push([w, h]);
    sizes.sort((a, b) => a[0] * a[1] - b[0] * b[1] || a[0] - b[0]);
    for (const [w, h] of sizes) {
        const p = tryFrame(w, h, rowInfo);
        if (p && p.inCell) return { plan: p, auto: true, standard: false };
    }
    return { plan: null, auto: true };
}

// ---------------------------------------------------------------- options

const VALUE_FLAGS = {
    '--id': 'id', '--out': 'out', '--bg': 'bg', '--bg-tol': 'bgTol', '--alpha': 'alpha', '--block': 'block',
    '--height': 'height', '--height-tol': 'heightTol', '--max-colors': 'maxColors', '--lean': 'lean', '--slope': 'slope',
    '--top': 'top', '--east': 'east', '--baseline': 'baseline', '--frame': 'frame', '--place': 'place', '--sheet': 'sheet',
    '--facings': 'facings', '--anim': 'anim', '--frame-ms': 'frameMs', '--footprint': 'footprint', '--preview': 'preview',
    '--preview-dir': 'previewDir', '--break': 'break'
};
const BOOL_FLAGS = {
    '--bg-holes': 'bgHoles', '--despeckle': 'despeckle', '--outline': 'outline', '--force': 'force', '--dry-run': 'dryRun',
    '--selftest': 'selftest', '--help': 'help', '-h': 'help'
};

function parseArgs(argv) {
    const o = { _: [] };
    for (let i = 0; i < argv.length; i++) {
        let a = argv[i], v = null;
        const eq = a.indexOf('=');
        if (a.startsWith('--') && eq > 0) { v = a.slice(eq + 1); a = a.slice(0, eq); }
        if (BOOL_FLAGS[a]) { o[BOOL_FLAGS[a]] = true; continue; }
        if (VALUE_FLAGS[a]) {
            if (v === null) { if (i + 1 >= argv.length) throw new Error(`${a} needs a value`); v = argv[++i]; }
            o[VALUE_FLAGS[a]] = v;
            continue;
        }
        if (a.startsWith('-')) throw new Error(`unknown option ${a}`);
        o._.push(a);
    }
    return o;
}

function pair(v, what) {
    if (Array.isArray(v) && v.length === 2) return v.map(Number);
    const m = /^(\d+)\s*[x\u00d7]\s*(\d+)$/i.exec(String(v).trim());
    if (!m) throw new Error(`${what} must be <w>x<h> (got ${v})`);
    return [Number(m[1]), Number(m[2])];
}
function num(v, what, test) {
    const n = Number(v);
    if (!Number.isFinite(n) || (test && !test(n))) throw new Error(`${what}: bad value ${v}`);
    return n;
}
function parseAnim(v) {
    if (v && typeof v === 'object') return v;
    const out = {};
    for (const part of String(v).split(';').map((s) => s.trim()).filter(Boolean)) {
        const m = /^([\w-]+)\s*=\s*(.+)$/.exec(part);
        if (!m) throw new Error(`--anim: "${part}" is not name=frames (e.g. stand=0;walk=1-3)`);
        const list = [];
        for (const piece of m[2].split(',').map((s) => s.trim())) {
            const r = /^(\d+)\s*-\s*(\d+)$/.exec(piece);
            if (r) { for (let i = Number(r[1]); i <= Number(r[2]); i++) list.push(i); } else list.push(num(piece, `--anim ${m[1]}`, Number.isInteger));
        }
        out[m[1]] = list;
    }
    return out;
}

// Canonical options from CLI values or a manifest entry (kebab-case keys accepted there too).
function normalize(raw) {
    const src = {};
    for (const [k, v] of Object.entries(raw || {})) src[k.replace(/-([a-z])/g, (m, c) => c.toUpperCase())] = v;
    const o = Object.assign({}, DEFAULTS, src);
    o.bg = String(o.bg).toLowerCase();
    o.bgTol = num(o.bgTol, '--bg-tol', (n) => n >= 0 && n <= 255);
    o.alpha = num(o.alpha, '--alpha', (n) => n >= 1 && n <= 255);
    o.block = String(o.block).toLowerCase();
    if (o.block !== 'auto') num(o.block, '--block', (n) => n >= 1 && n <= 64);
    o.height = o.height == null ? null : num(o.height, '--height', (n) => Number.isInteger(n) && n > 0);
    o.heightTol = num(o.heightTol, '--height-tol', (n) => n >= 0);
    o.maxColors = o.maxColors == null ? null : num(o.maxColors, '--max-colors', (n) => Number.isInteger(n) && n >= 1);
    o.lean = String(o.lean).toLowerCase();
    if (!['none', 'full', 'box'].includes(o.lean)) throw new Error(`--lean must be none, full or box (got ${o.lean})`);
    o.slope = num(o.slope, '--slope', (n) => n > 0 && n <= 4);
    o.top = o.top == null ? null : num(o.top, '--top', (n) => Number.isInteger(n) && n >= 1);
    if (o.lean === 'box' && o.top == null) throw new Error('--lean box needs --top <rows of the top face>');
    o.east = num(o.east, '--east', (n) => Number.isInteger(n) && n >= 0);
    if (o.east && o.lean === 'none') throw new Error('--east needs --lean box (or full)');
    o.baseline = o.baseline == null ? null : num(o.baseline, '--baseline', (n) => Number.isInteger(n) && n >= 0);
    o.frame = String(o.frame).toLowerCase() === 'auto' ? 'auto' : /^\d+$/.test(String(o.frame)) ? [Number(o.frame), Number(o.frame)] : pair(o.frame, '--frame');
    o.place = String(o.place).toLowerCase();
    if (!['auto', 'keep'].includes(o.place)) throw new Error(`--place must be auto or keep (got ${o.place})`);
    if (o.place === 'keep' && o.lean !== 'none') throw new Error('--place keep only works with --lean none');
    const sh = pair(o.sheet, '--sheet');
    o.sheet = { cols: sh[0], rows: sh[1] };
    if (o.sheet.cols < 1 || o.sheet.rows < 1) throw new Error('--sheet needs at least 1x1');
    if (o.facings != null) o.facings = Array.isArray(o.facings) ? o.facings.map(String) : String(o.facings).split(',').map((s) => s.trim()).filter(Boolean);
    if (o.anim != null) o.anim = parseAnim(o.anim);
    o.frameMs = num(o.frameMs, '--frame-ms', (n) => Number.isInteger(n) && n > 0);
    o.footprint = pair(o.footprint, '--footprint');
    return o;
}

function defaultFacings(rows) { return rows === 4 ? ['S', 'W', 'E', 'N'] : ['S']; }
function defaultAnims(cols) {
    if (cols === 20) return { anims: CREATURE_ANIMS, why: 'the 20-column creature layout of GENERATOR_PROMPTS' };
    if (cols === 4) return { anims: { stand: [0], sway: [1, 2, 3] }, why: 'stand + 3 sway frames' };
    if (cols === 1) return { anims: { stand: [0] }, why: 'one frame' };
    return { anims: { stand: [0], loop: Array.from({ length: cols }, (_, i) => i) }, why: `stand + a ${cols}-frame loop` };
}

// make_25d writes masters under art/ and previews anywhere, never into game/ except game/test_output/.
function assertWritable(file) {
    const abs = path.resolve(file).toLowerCase();
    const game = (path.join(ROOT, 'game') + path.sep).toLowerCase();
    const testOut = (path.join(ROOT, 'game', 'test_output') + path.sep).toLowerCase();
    if (abs.startsWith(game) && !abs.startsWith(testOut)) {
        throw new Error(`refusing to write ${rel(file)}: make_25d never writes into game/ (only game/test_output/); masters go to art/masters/ and are copied into game/img/ only after approval`);
    }
}

// ---------------------------------------------------------------- the pipeline

function make(opts, logger) {
    const o = normalize(opts);
    const log = logger || { lines: [], warnings: [], step(n, t) { this.lines.push(`STEP ${n}: ${t}`); }, warn(t) { this.warnings.push(t); this.lines.push(`WARN ${t}`); }, note(t) { this.lines.push(`NOTE ${t}`); } };
    const pal = getPalette();
    if (!o.input) throw new Error('no input file');
    const id = o.id || path.basename(o.input, path.extname(o.input));
    const outPng = o.out || path.join(ROOT, 'art', 'masters', `${id}.png`);
    const outJson = outPng.replace(/\.png$/i, '') + '.json';
    if (!o.dryRun) {
        assertWritable(outPng);
        if (!/\.png$/i.test(outPng)) throw new Error(`--out must end in .png (got ${outPng})`);
        if (!o.force && (fs.existsSync(outPng) || fs.existsSync(outJson))) throw new Error(`${rel(outPng)} or its sidecar already exists: pass --force to replace it, or --out to write elsewhere`);
    }
    if (o.preview) assertWritable(o.preview);

    // 1 load
    const input = loadInput(o.input);
    const raw = input.img;
    const extFmt = path.extname(o.input).slice(1).toLowerCase().replace('jpg', 'jpeg');
    log.step('load', `${rel(o.input)}: ${input.format.toUpperCase()} ${raw.w}x${raw.h}` + (input.converted ? `, converted to PNG by ${input.converted.tool} (temp ${input.converted.temp})` : ''));
    if (extFmt && extFmt !== input.format) log.warn(`${rel(o.input)} is named .${extFmt} but holds ${input.format.toUpperCase()} data (read by its content)`);

    // sheet cells
    const { cols, rows } = o.sheet;
    const cellW = Math.floor(raw.w / cols), cellH = Math.floor(raw.h / rows);
    if (cellW < 1 || cellH < 1) throw new Error(`${raw.w}x${raw.h} is too small for a ${cols}x${rows} sheet`);
    if (raw.w % cols || raw.h % rows) log.warn(`${raw.w}x${raw.h} does not divide into ${cols}x${rows} cells: using ${cellW}x${cellH} cells; the last ${raw.w % cols} px columns and ${raw.h % rows} px rows are ignored`);

    // 2 background
    const bg = resolveBackground(raw, o.bg, o.alpha);
    const bgr = removeBackground(raw, { key: bg.key, tol: o.bgTol, alpha: o.alpha, holes: o.bgHoles, cellW, cellH });
    log.step('background', `${bg.desc}, tolerance ${o.bgTol}: ${bgr.removed} px removed by a flood fill from the ${cols * rows > 1 ? 'edges of every cell' : 'image edges'}; alpha threshold ${o.alpha}: ${bgr.alphaCut} partly transparent px cleared, ${bgr.alphaRaised} made opaque` + (bgr.cleared ? `; ${bgr.cleared} enclosed background px cleared (--bg-holes)` : ''));
    if (bgr.kept) log.warn(`${bgr.kept} px of the background colour are enclosed by the subject and were kept (they snap to the nearest palette colour); --bg-holes clears them`);

    // 3 blocks
    const det = detectBlock(bgr.img);
    const measured = det.method === 'runs' || det.method === 'lattice'
        ? `measured ${det.size} (${det.method}, ${det.method === 'runs' ? `${Math.round(det.confidence * 100)}% of ${det.runs} colour runs are multiples` : `lattice fit ${det.confidence}`}; commonest run ${det.mode} px)`
        : `measured: ${det.method}`;
    let N, how;
    if (o.block === 'auto') {
        N = det.size; how = '--block auto';
        if (N === 1) log.warn(`--block auto found no block grid (${det.method}); treating the delivery as 1 px per final pixel`);
    } else {
        N = Number(o.block); how = o.block === String(DEFAULTS.block) && opts.block === undefined ? 'default: the 4x canvas' : `--block ${o.block}`;
        if (det.method === 'runs' && det.size !== N && det.confidence >= 0.9 && !(N % det.size === 0 && det.scores[N] >= 0.8)) {
            log.warn(`the delivery's block grid measures ${det.size} px, not ${N}: pass --block auto (or --block ${det.size}) if it was not drawn on the ${N}x canvas`);
        }
    }
    const [phX, phY] = N > 1 ? det.phaseFor(N) : [0, 0];
    let frames = [];
    const agg = { blocks: 0, uniform: 0, majority: 0, paletteVote: 0, ties: 0 };
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = crop(bgr.img, c * cellW, r * cellH, cellW, cellH);
            if (N === 1) { frames.push(cell); continue; }
            const px = (((phX - c * cellW) % N) + N) % N, py = (((phY - r * cellH) % N) + N) % N;
            const red = reduceBlocks(cell, N, px, py, pal);
            for (const k of Object.keys(agg)) agg[k] += red.stats[k];
            frames.push(red.img);
        }
    }
    log.step('blocks', `block ${N} px (${how}; ${measured}), phase (${phX}, ${phY}): ${cols * rows} cell(s) of ${cellW}x${cellH} -> ${frames[0].w}x${frames[0].h}` +
        (N > 1 ? `; ${agg.uniform} blocks one colour, ${agg.majority} by majority, ${agg.paletteVote} by palette vote, ${agg.ties} ties` : ''));
    if (N > 1 && agg.paletteVote > 0.2 * (agg.uniform + agg.majority + agg.paletteVote)) log.warn(`${agg.paletteVote} blocks had no colour covering half of them (smeared or misaligned blocks): check the result by eye`);

    // scale: subject height against --height
    const refIdx = frames.findIndex((f) => bbox(f));
    if (refIdx < 0) throw new Error('nothing is left after the background removal (is the background colour right? try --bg auto)');
    const refBox = bbox(frames[refIdx]);
    const heightBefore = refBox.y1 - refBox.y0 + 1;
    let factor = 1, heightAfter = heightBefore;
    if (o.height && Math.abs(heightBefore - o.height) > o.heightTol) {
        factor = o.height / heightBefore;
        let method = '';
        frames = frames.map((f) => { const rs = rescale(f, factor, pal); method = rs.method; return rs.img; });
        const nb = bbox(frames[refIdx]);
        heightAfter = nb ? nb.y1 - nb.y0 + 1 : 0;
        log.warn(`subject ${heightBefore} px tall, target --height ${o.height}: rescaled x${factor.toFixed(3)} (${method}, no blur); now ${heightAfter} px; check it by eye`);
    } else {
        log.step('scale', `subject ${heightBefore} px tall (frame ${refIdx})` + (o.height ? `, target ${o.height} (within ${o.heightTol})` : ', no --height target given'));
    }

    // 4 palette
    let changed = 0, sources = 0;
    for (const f of frames) { const s = snapToPalette(f, pal); changed += s.changed; sources += s.sources; }
    const merges = o.maxColors ? limitColors(frames, o.maxColors) : [];
    let desp = { removed: 0, filled: 0 };
    if (o.despeckle) for (const f of frames) { const r = despeckle(f); desp.removed += r.removed; desp.filled += r.filled; }
    log.step('palette', `${changed} px snapped to ${rel(pal.file)} (CIELAB, CIE76 distance)` + (o.maxColors ? `; --max-colors ${o.maxColors}: ${merges.length} merged${merges.length ? ` (${merges.join('; ')})` : ''}` : '') +
        (o.despeckle ? `; --despeckle: ${desp.removed} isolated px cleared, ${desp.filled} single px filled` : '') + `; ${colourSet(frames).size} colours`);

    // 5 lean (one baseline per sheet row)
    const rowBase = [];
    for (let r = 0; r < rows; r++) {
        if (o.baseline != null) { rowBase.push(factor === 1 ? o.baseline : Math.floor((o.baseline + 0.5) * factor)); continue; }
        let b = -1;
        for (let c = 0; c < cols; c++) { const ls = lowestSpan(frames[r * cols + c]); if (ls && ls.y > b) b = ls.y; }
        rowBase.push(b);
    }
    const leaned = frames.map((f, i) => {
        const r = Math.floor(i / cols);
        let b = rowBase[r];
        if (BREAK === 'sheet') { const ls = lowestSpan(f); if (ls && o.baseline == null) b = ls.y; } // broken: a baseline per frame
        return leanFrame(f, { mode: o.lean, slope: o.slope, top: o.top, east: o.east, baseline: b < 0 ? 0 : b, pal });
    });
    const eastPx = leaned.reduce((n, l) => n + l.east, 0);
    const leanDesc = o.lean === 'none' ? 'none: the delivery is already drawn with the lean'
        : o.lean === 'full' ? `full, slope ${o.slope}: every row above the baseline moves left by round((baseline - row) x ${o.slope})`
            : `box, slope ${o.slope}: the top ${o.top} rows move as a block by the full height, the rows below shear`;
    log.step('lean', `${leanDesc}; baseline row${rows > 1 ? 's' : ''} ${rowBase.join(', ')}${o.baseline != null ? ' (--baseline)' : ' (lowest opaque row)'}` + (o.east ? `; east face ${o.east} px deep: ${eastPx} px added one palette step darker` : ''));

    // 6 outline
    if (o.outline) { let n = 0; for (const l of leaned) n += outlineFrame(l.img); log.step('outline', `${n} lower and right edge px set to ${hex(OUTLINE_RGB)}`); }

    // 7 frame
    let fw, fh, ax, ay;
    const placeAt = [];
    if (o.place === 'keep') {
        fw = leaned[0].img.w; fh = leaned[0].img.h; ax = fw - CELL / 2; ay = fh - 1;
        for (let r = 0; r < rows; r++) placeAt.push({ dx: 0, dy: 0 });
        log.step('frame', `--place keep: ${fw}x${fh} frames as delivered, anchor [${ax}, ${ay}]`);
        if (fw % CELL || fh % CELL) log.warn(`${fw}x${fh} frames are not a multiple of ${CELL}`);
    } else {
        const rowInfo = [];
        for (let r = 0; r < rows; r++) {
            let box = null, ref = null;
            for (let c = 0; c < cols; c++) {
                const l = leaned[r * cols + c], bb = bbox(l.img);
                if (!bb) continue;
                box = box ? { x0: Math.min(box.x0, bb.x0), y0: Math.min(box.y0, bb.y0), x1: Math.max(box.x1, bb.x1), y1: Math.max(box.y1, bb.y1) } : bb;
                if (!ref) ref = l;
            }
            if (!box) { rowInfo.push(null); continue; }
            const low = lowestSpan(ref.img);
            const b = rowBase[r] < 0 ? low.y : rowBase[r];
            const cx = Math.floor((low.x0 + low.x1 + 1) / 2) + Math.round((b - low.y) * o.slope);
            rowInfo.push({ box, cx, b });
        }
        const ch = chooseFrame(rowInfo, o.frame);
        if (!ch.plan) {
            const need = rowInfo.filter(Boolean).map((ri) => `${ri.box.x1 - ri.box.x0 + 1}x${ri.b - ri.box.y0 + 1}`).join(', ');
            throw new Error(`the subject (${need} px after the lean, contact to top) does not fit a ${o.frame === 'auto' ? 'frame up to 480x480' : `${o.frame[0]}x${o.frame[1]} frame`} without cropping; use a larger --frame (or --frame auto)`);
        }
        ({ fw, fh, ax, ay } = ch.plan);
        for (let r = 0; r < rows; r++) placeAt.push(rowInfo[r] ? { dx: ax - rowInfo[r].cx, dy: ay - rowInfo[r].b } : { dx: 0, dy: 0 });
        log.step('frame', `${fw}x${fh}${ch.auto ? ` (--frame auto${ch.standard ? '' : ', not one of 48, 96, 96x144'})` : ''}, anchor [${ax}, ${ay}] = the ground contact` +
            (ch.plan.moved ? `, ${Math.abs(ch.plan.moved)} px ${ch.plan.moved > 0 ? 'right' : 'left'} of the cell's bottom-centre so nothing is cropped` : ', the bottom-centre of the frame\'s bottom-right 48 px cell'));
        if (ch.auto && !ch.standard) log.warn(`the subject needs a ${fw}x${fh} frame, larger than the standard 48, 96 and 96x144`);
        if (!ch.plan.inCell) log.warn(`the ground contact [${ax}, ${ay}] is outside the frame's bottom-right 48 px cell`);
    }

    // 8 sheet assembly
    const master = newImg(cols * fw, rows * fh);
    let lost = 0;
    for (let i = 0; i < leaned.length; i++) {
        const r = Math.floor(i / cols), c = i % cols, p = placeAt[r];
        const frameImg = newImg(fw, fh);
        const n = blit(frameImg, leaned[i].img, p.dx, p.dy);
        lost += opaqueCount(leaned[i].img) - n;
        blit(master, frameImg, c * fw, r * fh);
    }
    if (lost) throw new Error(`${lost} px would be cropped by the ${fw}x${fh} frame (never cropping): use a larger --frame`);

    // 9 sidecar
    const anim = o.anim ? { anims: o.anim, why: '--anim' } : defaultAnims(cols);
    for (const [name, list] of Object.entries(anim.anims)) for (const i of list) if (i < 0 || i >= cols) throw new Error(`--anim ${name}: frame ${i} is outside the ${cols} columns`);
    const facings = o.facings || defaultFacings(rows);
    if (facings.length > rows) throw new Error(`${facings.length} facings but the sheet has ${rows} rows`);
    const sidecar = {
        id,
        frameWidth: fw, frameHeight: fh,
        anchor: [ax, ay],
        footprint: o.footprint,
        facings,
        animations: anim.anims,
        frameMs: o.frameMs,
        lean: { mode: o.lean, slope: o.slope, top: o.lean === 'box' ? o.top : null, east: o.east },
        scale: { subjectHeight: heightAfter, target: o.height, factor: Math.round(factor * 1000) / 1000 },
        source: {
            file: rel(o.input), format: input.format, converted: input.converted ? input.converted.tool : null,
            size: [raw.w, raw.h], sheet: [cols, rows], block: N, phase: [phX, phY], background: bg.desc
        },
        made: { by: 'tools/make_25d.js', at: new Date().toISOString(), options: opts.argv || null }
    };
    if (BREAK === 'sidecar') delete sidecar.anchor;
    log.step('sidecar', `frames ${cols}x${rows} of ${fw}x${fh}, facings ${facings.join('')}, animations ${Object.keys(anim.anims).join(',')} (${anim.why}), frameMs ${o.frameMs}; ${colourSet([master]).size} colours`);

    const result = { id, master, sidecar, outPng, outJson, log, previewPath: null, raw };
    if (!o.dryRun) {
        fs.mkdirSync(path.dirname(path.resolve(outPng)), { recursive: true });
        writePNG(outPng, master.w, master.h, master.d);
        fs.writeFileSync(outJson, toJson(sidecar) + '\n');
        log.step('write', `${rel(outPng)} (${master.w}x${master.h}) and ${rel(outJson)}`);
    } else {
        log.step('write', '--dry-run: nothing written');
    }
    if (o.preview) {
        fs.mkdirSync(path.dirname(path.resolve(o.preview)), { recursive: true });
        const pv = renderPreview(raw, master, sidecar);
        writePNG(o.preview, pv.w, pv.h, pv.d);
        result.previewPath = o.preview;
        log.step('preview', `${rel(o.preview)} (${pv.w}x${pv.h}): input thumbnail, frame 0 at 1x and 4x on 48 px meadow squares next to a 32 px ruler` + (cols * rows > 1 ? ', and the whole sheet at 1x' : ''));
    }
    return result;
}

function toJson(v, ind) {
    ind = ind || '';
    if (Array.isArray(v) && v.every((x) => x === null || typeof x !== 'object')) return '[' + v.map((x) => JSON.stringify(x)).join(', ') + ']';
    if (Array.isArray(v)) return '[\n' + v.map((x) => `${ind}  ${toJson(x, ind + '  ')}`).join(',\n') + `\n${ind}]`;
    if (v && typeof v === 'object') {
        const ks = Object.keys(v).filter((k) => v[k] !== undefined);
        if (!ks.length) return '{}';
        return '{\n' + ks.map((k) => `${ind}  ${JSON.stringify(k)}: ${toJson(v[k], ind + '  ')}`).join(',\n') + `\n${ind}}`;
    }
    return JSON.stringify(v);
}

// ---------------------------------------------------------------- preview

const FONT = {
    0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'], 2: ['111', '001', '111', '100', '111'],
    3: ['111', '001', '111', '001', '111'], 4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'],
    6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '001', '001', '001'], 8: ['111', '101', '111', '101', '111'],
    9: ['111', '101', '111', '001', '111'], X: ['101', '101', '010', '101', '101'], R: ['110', '101', '110', '101', '101'],
    A: ['010', '101', '111', '101', '101'], W: ['101', '101', '111', '111', '101'], S: ['111', '100', '111', '001', '111'],
    H: ['101', '101', '111', '101', '101'], E: ['111', '100', '111', '100', '111'], T: ['111', '010', '010', '010', '010'],
    P: ['111', '101', '111', '100', '100'], ' ': ['000', '000', '000', '000', '000']
};
function drawText(img, x, y, text, rgb, scale) {
    for (const ch of String(text).toUpperCase()) {
        const g = FONT[ch] || FONT[' '];
        for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r][c] === '1') fillRect(img, x + c * scale, y + r * scale, scale, scale, rgb);
        x += 4 * scale;
    }
}
function fillRect(img, x, y, w, h, rgb) {
    for (let yy = Math.max(0, y); yy < Math.min(img.h, y + h); yy++) for (let xx = Math.max(0, x); xx < Math.min(img.w, x + w); xx++) setPx(img, xx, yy, rgb);
}
function scaleUp(img, k) {
    const out = newImg(img.w * k, img.h * k);
    for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) img.d.copy(out.d, (y * out.w + x) * 4, ((Math.floor(y / k)) * img.w + Math.floor(x / k)) * 4, ((Math.floor(y / k)) * img.w + Math.floor(x / k)) * 4 + 4);
    return out;
}
function thumbnail(img, box) {
    const f = Math.min(1, box / img.w, box / img.h);
    const W = Math.max(1, Math.round(img.w * f)), H = Math.max(1, Math.round(img.h * f));
    const out = newImg(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const sx = Math.min(img.w - 1, Math.floor((x + 0.5) / f)), sy = Math.min(img.h - 1, Math.floor((y + 0.5) / f));
        img.d.copy(out.d, (y * W + x) * 4, (sy * img.w + sx) * 4, (sy * img.w + sx) * 4 + 4);
        out.d[(y * W + x) * 4 + 3] = 255; // show the delivery as delivered, background included
    }
    return out;
}
const MEADOW = { base: [0x5D, 0x71, 0x39], light: [0x71, 0x86, 0x4D], dark: [0x4D, 0x5D, 0x28], line: [0x39, 0x45, 0x1C], cell: [0x9E, 0xAE, 0x7D] };
const RULER = [[0xFF, 0xFF, 0xFF], [0xC2, 0x0C, 0x1C]];
// A code-drawn meadow: three palette greens in a fixed hash pattern, a 1 px darker line on every 48 px edge.
function meadow(w, h) {
    const img = newImg(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const v = ((x * 73856093) ^ (y * 19349663)) >>> 0;
        const m = v % 17;
        setPx(img, x, y, x % CELL === 0 || y % CELL === 0 ? MEADOW.line : m < 2 ? MEADOW.light : m < 4 ? MEADOW.dark : MEADOW.base);
    }
    return img;
}
function renderPreview(raw, master, sidecar) {
    const fw = sidecar.frameWidth, fh = sidecar.frameHeight, ax = sidecar.anchor ? sidecar.anchor[0] : fw - 24, ay = sidecar.anchor ? sidecar.anchor[1] : fh - 1;
    const ac = Math.max(1, Math.ceil((ax - CELL / 2) / CELL)), ar = Math.max(1, Math.ceil((ay + 1) / CELL) - 1);
    const scene = meadow((ac + 3) * CELL, (ar + 2) * CELL);
    // outline the square the thing stands on
    for (let i = 1; i < CELL; i++) {
        setPx(scene, ac * CELL + i, ar * CELL + 1, MEADOW.cell); setPx(scene, ac * CELL + i, (ar + 1) * CELL - 1, MEADOW.cell);
        setPx(scene, ac * CELL + 1, ar * CELL + i, MEADOW.cell); setPx(scene, (ac + 1) * CELL - 1, ar * CELL + i, MEADOW.cell);
    }
    const frame0 = crop(master, 0, 0, fw, fh);
    blit(scene, frame0, ac * CELL + CELL / 2 - ax, (ar + 1) * CELL - 1 - ay);
    // 32 px person-height ruler on the same ground line, one square to the right: 4 bands of 8 px
    const rx = (ac + 1) * CELL + CELL / 2 - 1, groundY = (ar + 1) * CELL - 1;
    for (let i = 0; i < 32; i++) { setPx(scene, rx, groundY - i, RULER[(i >> 3) & 1]); setPx(scene, rx + 1, groundY - i, RULER[(i >> 3) & 1]); }
    const big = scaleUp(scene, 4);
    const thumb = thumbnail(raw, 256);
    const multi = master.w > fw || master.h > fh;
    const G = 16, label = 16;
    const topH = Math.max(thumb.h, scene.h, big.h);
    const W = Math.max(G + thumb.w + G + scene.w + G + big.w + G, multi ? G + master.w + G : 0);
    const H = G + label + topH + G + (multi ? label + master.h + G : 0);
    const out = newImg(W, H);
    fillRect(out, 0, 0, W, H, [0x24, 0x24, 0x24]);
    let x = G;
    drawText(out, x, G, 'raw', RULER[0], 2); blit(out, thumb, x, G + label); x += thumb.w + G;
    drawText(out, x, G, '1x', RULER[0], 2); blit(out, scene, x, G + label); x += scene.w + G;
    drawText(out, x, G, '4x', RULER[0], 2); blit(out, big, x, G + label);
    if (multi) {
        const y0 = G + label + topH + G;
        drawText(out, G, y0, 'sheet 1x', RULER[0], 2);
        const strip = meadow(master.w, master.h);
        blit(strip, master, 0, 0);
        blit(out, strip, G, y0 + label);
    }
    return out;
}

// ---------------------------------------------------------------- CLI

function usage() {
    return [
        'Usage: node tools/make_25d.js <raw.png|.jpg|.webp|.bmp> [options]',
        '       node tools/make_25d.js <folder with manifest.json> [--preview-dir <dir>] [--force] [--dry-run]',
        '       node tools/make_25d.js --selftest [--break <step>]',
        'Output: art/masters/<id>.png + <id>.json (or --out <file.png>). Doc: docs/systems/MAKE_25D.md',
        '  --id <id>                 asset id (default: the input file name)',
        '  --out <file.png>          master path; the sidecar goes next to it      --force  replace an existing master',
        '  --bg magenta|auto|none|#rrggbb  background colour (default magenta)    --bg-tol <0-255> (64)',
        '  --alpha <1-255>           alpha threshold (128)                       --bg-holes  also clear enclosed background px',
        '  --block 4|auto|<n>        block size of the delivery (default 4; n may be fractional)',
        '  --height <px> [--height-tol <px>]  rescale when the subject height differs (scale table: human 32, oak 70 ...)',
        '  --max-colors <n>  --despeckle',
        '  --lean none|full|box      none (default: drawn in the 2.5D style), full (flat fallback), box (--top <n> [--east <w>])',
        '  --slope <s> (1)  --baseline <row>  (ground row of the reduced frame, for things drawn in the air)',
        '  --outline                 #201408 on the lower and right silhouette edges',
        '  --frame auto|48|96|96x144|<w>x<h>   (default auto)      --place auto|keep (keep: frames as delivered, --lean none)',
        '  --sheet <cols>x<rows>     a sheet of frames (default 1x1)',
        '  --facings S,W,E,N  --anim "stand=0;walk=1-3"  --frame-ms <ms> (150)  --footprint <w>x<h> (1x1)',
        '  --preview <file.png>      1x and 4x on a 48 px meadow grid next to a 32 px ruler (e.g. game/test_output/make_25d/<id>.png)',
        '  --dry-run                 run every step, write nothing but the preview'
    ].join('\n');
}

function printLog(log) { for (const l of log.lines) console.log(l); }

function runOne(opts) {
    const log = { lines: [], warnings: [], step(n, t) { this.lines.push(`STEP ${n}: ${t}`); }, warn(t) { this.warnings.push(t); this.lines.push(`WARN ${t}`); }, note(t) { this.lines.push(`NOTE ${t}`); } };
    try {
        const res = make(opts, log);
        printLog(log);
        if (!opts.dryRun) {
            console.log(`NEXT check: "C:\\Program Files\\nodejs\\node.exe" tools/art_check.js --native --sidecar ${rel(res.outPng)}`);
            const orig = path.join(ROOT, 'tools', 'originality_check.js');
            console.log(fs.existsSync(orig)
                ? `NEXT originality: run tools/originality_check.js on ${rel(res.outPng)} (make_25d does not call it yet: docs/systems/MAKE_25D.md -> Originality hook)`
                : 'NEXT originality: tools/originality_check.js does not exist yet (planned hook: docs/systems/MAKE_25D.md -> Originality hook)');
        }
        console.log(`DONE ${res.id}: ${res.sidecar.frameWidth}x${res.sidecar.frameHeight} frames, anchor [${res.sidecar.anchor}], ${log.warnings.length} warning(s)`);
        return 0;
    } catch (e) {
        printLog(log);
        console.log(`ERROR ${opts.id || opts.input}: ${e.message}`);
        return 1;
    }
}

function runManifest(dir, cli) {
    const mf = path.join(dir, 'manifest.json');
    if (!fs.existsSync(mf)) { console.log(`ERROR ${rel(dir)} is a folder without manifest.json (docs/systems/MAKE_25D.md -> Manifest)`); return 1; }
    let doc;
    try { doc = JSON.parse(fs.readFileSync(mf, 'utf8')); } catch (e) { console.log(`ERROR ${rel(mf)}: ${e.message}`); return 1; }
    const assets = Array.isArray(doc) ? doc : doc.assets;
    if (!Array.isArray(assets) || !assets.length) { console.log(`ERROR ${rel(mf)}: needs "assets": [ { "file": ... }, ... ]`); return 1; }
    const defaults = Array.isArray(doc) ? {} : doc.defaults || {};
    let failed = 0;
    for (const a of assets) {
        if (!a.file) { console.log(`ERROR ${rel(mf)}: an entry without "file"`); failed++; continue; }
        const opts = Object.assign({}, defaults, a, { input: path.join(dir, a.file) });
        delete opts.file;
        for (const k of ['force', 'dryRun']) if (cli[k]) opts[k] = true;
        const id = opts.id || path.basename(a.file, path.extname(a.file));
        if (cli.previewDir && !opts.preview) opts.preview = path.join(cli.previewDir, `${id}.png`);
        console.log(`== ${id} (${rel(opts.input)})`);
        failed += runOne(opts);
    }
    console.log(`RESULT ${failed ? 'FAIL' : 'PASS'} ${assets.length - failed}/${assets.length} assets made (make_25d, ${rel(mf)})`);
    return failed ? 1 : 0;
}

function main(argv) {
    let args;
    try { args = parseArgs(argv); } catch (e) { console.error(e.message); console.error(usage()); return 2; }
    if (args.break && !args.selftest) { console.error('--break only works with --selftest'); return 2; }
    if (args.selftest) {
        if (args.break && !BREAKABLE.includes(args.break)) { console.error(`--break must be one of ${BREAKABLE.join(', ')}`); return 2; }
        return selftest(args.break || null);
    }
    if (args.help || args._.length !== 1) { console.log(usage()); return args.help ? 0 : 2; }
    const input = args._[0];
    if (!fs.existsSync(input)) { console.log(`ERROR ${input}: not found`); return 1; }
    const cli = Object.assign({}, args);
    delete cli._;
    if (fs.statSync(input).isDirectory()) return runManifest(input, cli);
    try { normalize(cli); } catch (e) { console.error(e.message); return 2; }
    return runOne(Object.assign(cli, { input, argv }));
}

// ---------------------------------------------------------------- self-test
// Synthetic inputs under %TEMP%\uf_make_25d_selftest prove every step; each case prints PASS/FAIL (SKIP
// only for the WEBP decoder when Windows lacks it, and for JPEG/WEBP without PowerShell). --break <step>
// sabotages one step on purpose so the run shows the self-test can FAIL.

function mulberry(seed) {
    return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// Palette colours at least `minDe` apart (CIELAB) and far from magenta: what the test images are drawn in.
function distinctColours(pal, minDe) {
    const mag = srgbToLab(255, 0, 255), out = [];
    for (let i = 0; i < pal.unique.length; i++) {
        if (labDist(pal.lab[i], mag) < 60) continue;
        if (out.every((j) => labDist(pal.lab[i], pal.lab[j]) >= minDe)) out.push(i);
    }
    return out.map((i) => pal.unique[i]);
}
function upscale(img, k) { return scaleUp(img, k); }
function resizeNearest(img, W, H) {
    const out = newImg(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const sx = Math.min(img.w - 1, Math.floor(x * img.w / W)), sy = Math.min(img.h - 1, Math.floor(y * img.h / H));
        img.d.copy(out.d, (y * W + x) * 4, (sy * img.w + sx) * 4, (sy * img.w + sx) * 4 + 4);
    }
    return out;
}
function onBackground(img, rgb) {
    const out = cloneImg(img);
    for (let o = 0; o < out.d.length; o += 4) if (!out.d[o + 3]) { out.d[o] = rgb[0]; out.d[o + 1] = rgb[1]; out.d[o + 2] = rgb[2]; out.d[o + 3] = 255; }
    return out;
}
function sameImage(a, b) {
    if (a.w !== b.w || a.h !== b.h) return { ok: false, why: `size ${a.w}x${a.h} vs ${b.w}x${b.h}` };
    let diff = 0, first = null;
    for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) {
        const ka = keyAt(a, x, y), kb = keyAt(b, x, y);
        if (ka !== kb) { diff++; if (!first) first = `(${x},${y}) ${ka < 0 ? 'clear' : hex(keyRgb(ka))} vs ${kb < 0 ? 'clear' : hex(keyRgb(kb))}`; }
    }
    return { ok: diff === 0, why: diff ? `${diff} px differ, first ${first}` : 'identical', diff };
}
function randomNative(w, h, colours, rng, clearShare) {
    const img = newImg(w, h);
    for (let y = 0; y < h; y++) {
        let x = 0;
        while (x < w) {
            const len = 1 + Math.floor(rng() * 3);
            const clear = rng() < clearShare;
            const c = colours[Math.floor(rng() * colours.length)];
            for (let i = 0; i < len && x < w; i++, x++) if (!clear) setPx(img, x, y, c);
        }
    }
    return img;
}
function opaquePixels(img) {
    const list = [];
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (opaqueAt(img, x, y)) list.push([x, y, keyAt(img, x, y)]);
    return list;
}
function writeImg(file, img) { fs.mkdirSync(path.dirname(file), { recursive: true }); writePNG(file, img.w, img.h, img.d); return file; }

function selftest(breakStep) {
    BREAK = breakStep;
    const pal = getPalette();
    const root = path.join(os.tmpdir(), 'uf_make_25d_selftest');
    fs.mkdirSync(root, { recursive: true });
    const counts = { pass: 0, fail: 0, skip: 0 };
    const check = (name, ok, detail) => { counts[ok ? 'pass' : 'fail']++; console.log(`${ok ? 'PASS' : 'FAIL'} selftest.${name}: ${detail}`); };
    const skip = (name, detail) => { counts.skip++; console.log(`SKIP selftest.${name}: ${detail}`); };
    const run = (name, fn) => { try { fn(); } catch (e) { check(name, false, `threw: ${e.message}`); } };
    const quiet = () => ({ lines: [], warnings: [], step(n, t) { this.lines.push(`STEP ${n}: ${t}`); }, warn(t) { this.warnings.push(t); this.lines.push(`WARN ${t}`); }, note() {} });
    const cols = distinctColours(pal, 12);
    const MAG = [255, 0, 255];
    const A = cols[3], B = cols[9], C = cols[14], D = cols[20];

    // step 2: background
    run('bg.flood_keeps_interior', () => {
        const img = newImg(12, 12);
        for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) setPx(img, x, y, MAG);
        for (let i = 2; i <= 9; i++) { setPx(img, i, 2, A); setPx(img, i, 9, A); setPx(img, 2, i, A); setPx(img, 9, i, A); }
        const r = removeBackground(img, { key: MAG, tol: 64, alpha: 128, holes: false });
        const inner = [[5, 5], [3, 3], [8, 8]].every(([x, y]) => keyAt(r.img, x, y) === ((255 << 16) | 255));
        const outer = [[0, 0], [11, 11], [1, 6]].every(([x, y]) => keyAt(r.img, x, y) === -1);
        check('bg.flood_keeps_interior', inner && outer && r.kept === 36 && r.removed === 144 - 64,
            `ring of ${hex(A)} around 36 magenta px: ${r.removed} outside px removed (want 80), ${r.kept} enclosed magenta px kept (want 36), inside still magenta: ${inner}, outside clear: ${outer}`);
        const h = removeBackground(img, { key: MAG, tol: 64, alpha: 128, holes: true });
        check('bg.holes', h.cleared === 36 && keyAt(h.img, 5, 5) === -1 && keyAt(h.img, 2, 5) >= 0, `--bg-holes: ${h.cleared} enclosed px cleared (want 36), ring kept: ${keyAt(h.img, 2, 5) >= 0}`);
    });
    run('bg.tolerance_alpha_auto', () => {
        const img = newImg(8, 8);
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) setPx(img, x, y, [0xF8, 0x05, 0xFA]);
        setPx(img, 3, 3, A); setPx(img, 4, 3, A, 200); setPx(img, 5, 3, A, 100);
        const r = removeBackground(img, { key: MAG, tol: 64, alpha: 128, holes: false });
        const ok = opaqueCount(r.img) === 2 && r.img.d[(3 * 8 + 4) * 4 + 3] === 255 && r.alphaCut === 1 && r.alphaRaised === 1;
        check('bg.tolerance_alpha', ok, `near-magenta #F805FA removed within tolerance 64; alpha 200 -> 255, alpha 100 -> 0: ${opaqueCount(r.img)} opaque px left (want 2), cut ${r.alphaCut}, raised ${r.alphaRaised}`);
        const grey = newImg(8, 8);
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) setPx(grey, x, y, [0x7D, 0x7D, 0x7D]);
        setPx(grey, 4, 4, B);
        const bg = resolveBackground(grey, 'auto', 128);
        const g = removeBackground(grey, { key: bg.key, tol: 8, alpha: 128 });
        check('bg.auto', bg.key && hex(bg.key) === '#7D7D7D' && opaqueCount(g.img) === 1, `--bg auto: ${bg.desc}; ${opaqueCount(g.img)} px left (want 1)`);
    });

    // step 3: blocks
    run('block.reduce_exact', () => {
        const rng = mulberry(7);
        const one = randomNative(24, 20, [A, B, C, D], rng, 0.3);
        const big = upscale(one, 4);
        let strays = 0;
        for (let by = 0; by < 20; by++) for (let bx = 0; bx < 24; bx++) {
            if ((bx + by) % 3) continue;
            const spots = [[0, 0], [3, 2]].map(([dx, dy]) => [bx * 4 + (by % 2 ? dx : 3 - dx), by * 4 + dy]);
            for (const [x, y] of spots) { setPx(big, x, y, cols[(bx * 7 + by) % cols.length]); strays++; }
        }
        const red = reduceBlocks(big, 4, 0, 0, pal);
        const cmp = sameImage(red.img, one);
        check('block.reduce_exact', cmp.ok, `24x20 image drawn at 4x with ${strays} stray px (2 in every third block, some at the block's top-left) -> ${red.img.w}x${red.img.h}: ${cmp.why}`);
    });
    run('block.reduce_noisy', () => {
        const rng = mulberry(11);
        const one = randomNative(16, 16, [A, B, C, D], rng, 0.2);
        const big = upscale(one, 4);
        for (let o = 0; o < big.d.length; o += 4) if (big.d[o + 3]) for (let k = 0; k < 3; k++) big.d[o + k] = Math.max(0, Math.min(255, big.d[o + k] + Math.round((rng() - 0.5) * 12)));
        const red = reduceBlocks(big, 4, 0, 0, pal);
        const cmp = sameImage(red.img, one);
        check('block.reduce_noisy', cmp.ok, `every 4x px moved by up to +-6 per channel (no block is one colour; palette vote): ${red.stats.paletteVote} of ${red.stats.blocks} blocks by palette vote, ${cmp.why}`);
    });
    run('block.detect', () => {
        const rng = mulberry(3);
        const one = randomNative(40, 30, [A, B, C, D], rng, 0.25);
        const d4 = detectBlock(upscale(one, 4)), d3 = detectBlock(upscale(one, 3));
        check('block.detect_4', d4.size === 4, `4x image: measured ${d4.size} (${d4.method}, share ${d4.confidence}, commonest run ${d4.mode})`);
        check('block.detect_3', d3.size === 3, `3x image: measured ${d3.size} (${d3.method}, share ${d3.confidence}, commonest run ${d3.mode})`);
        const shifted = newImg(160 + 2, 120 + 1);
        blit(shifted, upscale(one, 4), 2, 1);
        const ds = detectBlock(shifted);
        const [px, py] = ds.phaseFor(4);
        const red = reduceBlocks(shifted, 4, px, py, pal);
        const bb = bbox(red.img);
        const cmp = sameImage(crop(red.img, 1, 1, 40, 30), one);
        check('block.phase', px === 2 && py === 1 && cmp.ok, `4x image moved 2 px right and 1 down: phase (${px}, ${py}) (want 2, 1), reduced ${red.img.w}x${red.img.h} with the subject at (${bb.x0},${bb.y0}): ${cmp.why}`);
        const frac = resizeNearest(one, Math.round(40 * 10.667), Math.round(30 * 10.667));
        const df = detectBlock(frac);
        const [fx, fy] = df.phaseFor(df.size);
        const fr = reduceBlocks(frac, df.size, fx, fy, pal);
        const fc = sameImage(fr.img, one);
        check('block.detect_fractional', Math.abs(df.size - 10.667) < 0.05 && fc.diff <= 12, `image resized by 10.667 (blocks of 10 and 11 px): measured ${df.size} (${df.method}, fit ${df.confidence}); reduced ${fr.img.w}x${fr.img.h}: ${fc.why} (allowed: 12 of 1200)`);
    });
    run('scale.height', () => {
        const rng = mulberry(5);
        const one = newImg(20, 24);
        blit(one, randomNative(10, 16, [A, B, C], rng, 0), 5, 8);
        const raw = onBackground(upscale(one, 8), MAG);
        const file = writeImg(path.join(root, 'eight_x.png'), raw);
        const log = quiet();
        const res = make({ input: file, dryRun: true, height: 16, frame: '48' }, log);
        const bb = bbox(res.master);
        const got = crop(res.master, bb.x0, bb.y0, 10, 16);
        const cmp = sameImage(got, crop(one, 5, 8, 10, 16));
        check('scale.height', res.sidecar.scale.subjectHeight === 16 && cmp.ok && log.warnings.some((w) => /rescaled/.test(w)),
            `drawn at 8x, reduced by the default 4 -> 32 px tall; --height 16 -> ${res.sidecar.scale.subjectHeight} px, factor ${res.sidecar.scale.factor}, warned: ${log.warnings.some((w) => /rescaled/.test(w))}; against the 1x drawing: ${cmp.why}`);
    });

    // step 4: palette
    run('palette.membership', () => {
        const rng = mulberry(9);
        const one = newImg(30, 30);
        for (let y = 4; y < 30; y++) for (let x = 6; x < 24; x++) setPx(one, x, y, [Math.floor(rng() * 256), Math.floor(rng() * 200), Math.floor(rng() * 256)]);
        const file = writeImg(path.join(root, 'random_rgb.png'), onBackground(upscale(one, 4), MAG));
        const res = make({ input: file, dryRun: true }, quiet());
        const set = new Set(pal.index.keys());
        let off = 0, n = 0;
        for (let o = 0; o < res.master.d.length; o += 4) if (res.master.d[o + 3]) { n++; if (!set.has(rgbKey(res.master.d, o))) off++; }
        check('palette.membership', n > 0 && off === 0, `${n} opaque output px from random RGB input: ${off} not in ${rel(pal.file)}`);
        const self = pal.unique.every((c) => nearest(pal, ...c) === pal.index.get((c[0] << 16) | (c[1] << 8) | c[2]));
        check('palette.identity', self, `every one of the ${pal.unique.length} distinct uf.hex colours snaps to itself`);
    });
    run('palette.max_colors', () => {
        const img = newImg(10, 10);
        const six = cols.slice(0, 6), usage = [30, 25, 20, 15, 6, 4];
        let i = 0;
        six.forEach((c, k) => { for (let n = 0; n < usage[k]; n++, i++) setPx(img, i % 10, Math.floor(i / 10), c); });
        const merges = limitColors([img], 4);
        const left = colourSet([img]);
        const gone = [hex(six[4]), hex(six[5])].every((h) => ![...left].some((k) => hex(keyRgb(k)) === h));
        check('palette.max_colors', left.size === 4 && gone && opaqueCount(img) === 100, `6 colours used 30/25/20/15/6/4 times, --max-colors 4: ${left.size} left, the two least used merged: ${gone} (${merges.join('; ')})`);
    });
    run('palette.despeckle', () => {
        const img = newImg(9, 9);
        setPx(img, 1, 1, A); // isolated
        for (let y = 4; y < 9; y++) for (let x = 4; x < 9; x++) setPx(img, x, y, B);
        setPx(img, 6, 6, C); // lone odd pixel in a uniform field
        setPx(img, 1, 6, D); setPx(img, 2, 6, D); // a pair: kept
        const r = despeckle(img);
        check('palette.despeckle', !opaqueAt(img, 1, 1) && keyAt(img, 6, 6) === keyAt(img, 5, 5) && opaqueAt(img, 1, 6) && opaqueAt(img, 2, 6),
            `isolated px cleared: ${!opaqueAt(img, 1, 1)}; odd px in a uniform field filled: ${keyAt(img, 6, 6) === keyAt(img, 5, 5)}; a 2-px pair kept: ${opaqueAt(img, 1, 6) && opaqueAt(img, 2, 6)} (removed ${r.removed}, filled ${r.filled})`);
    });

    // step 5: lean
    run('lean.full', () => {
        const h = 10, img = newImg(12, 14);
        for (let y = 13 - h + 1; y <= 13; y++) setPx(img, 8, y, A); // vertical line, foot at (8, 13)
        for (let x = 5; x <= 10; x++) setPx(img, x, 4, B); // horizontal bar on row 4
        const l = leanFrame(img, { mode: 'full', slope: 1, baseline: 13, pal });
        let diagonal = true;
        for (let y = 4; y <= 13; y++) if (keyAt(l.img, l.padLeft + 8 - (13 - y), y) !== keyAt(img, 8, y)) diagonal = false;
        const top = opaquePixels(l.img).filter(([, y]) => y === 13 - h + 1 && true);
        const lineTop = opaquePixels(l.img).filter(([x, y, k]) => k === keyAt(img, 8, 13) && y === 4);
        const bar = opaquePixels(l.img).filter(([, , k]) => k === keyAt(img, 5, 4));
        const barRow = bar.every(([, y]) => y === 4), barRun = bar.length === 6 && bar[5][0] - bar[0][0] === 5;
        const foot = keyAt(l.img, l.padLeft + 8, 13) === keyAt(img, 8, 13);
        const colsSpanned = new Set(opaquePixels(l.img).filter(([, , k]) => k === keyAt(img, 8, 13)).map(([x]) => x)).size;
        check('lean.full_line', diagonal && foot && colsSpanned === h && top.length > 0,
            `1 px line of height ${h} (foot at row 13): every row r moved left by 13 - r: ${diagonal}; foot unmoved: ${foot}; the line now covers ${colsSpanned} columns (want ${h}), its top ${h - 1} px left of its foot`);
        check('lean.full_bar', barRow && barRun && bar[0][0] === l.padLeft + 5 - 9, `6 px horizontal bar on row 4: still on one row: ${barRow}, still 6 px in a run: ${barRun}, moved left by 9: ${bar.length ? bar[0][0] - l.padLeft - 5 : 'n/a'}`);
        void lineTop;
    });
    run('lean.box', () => {
        const img = newImg(10, 12);
        for (let y = 2; y <= 4; y++) for (let x = 1; x <= 8; x++) setPx(img, x, y, A); // top face, 3 rows
        for (let y = 5; y <= 11; y++) for (let x = 1; x <= 8; x++) setPx(img, x, y, B); // south face, 7 rows
        const l = leanFrame(img, { mode: 'box', slope: 1, top: 3, baseline: 11, pal });
        const left = (y) => { for (let x = 0; x < l.img.w; x++) if (opaqueAt(l.img, x, y)) return x - l.padLeft; return null; };
        const H = 11 - 5 + 1;
        const topRows = [2, 3, 4].map(left), southRows = [5, 8, 11].map(left);
        const okTop = topRows.every((v) => v === 1 - H);
        const okSouth = southRows[0] === 1 - 6 && southRows[1] === 1 - 3 && southRows[2] === 1;
        check('lean.box', okTop && okSouth, `box 8 wide: top face rows 2-4 left edges ${topRows.join(',')} (want all ${1 - H}: one block moved by the full height ${H}); south face rows 5, 8, 11 at ${southRows.join(',')} (want -5, -2, 1: sheared)`);
        const e = leanFrame(img, { mode: 'box', slope: 1, top: 3, east: 3, baseline: 11, pal });
        const added = opaquePixels(e.img).filter(([x, y]) => !opaqueAt(l.img, x, y));
        const set = new Set(pal.index.keys());
        const darker = added.every(([x, y, k]) => {
            // the source is the right-edge pixel of the south face straight below
            let yy = y + 1; while (yy < e.img.h && !opaqueAt(l.img, x, yy)) yy++;
            const src = keyAt(l.img, x, yy);
            return src >= 0 && srgbToLab(...keyRgb(k))[0] < srgbToLab(...keyRgb(src))[0] && set.has(k);
        });
        const aboveTop = added.some(([, y]) => y < 2);
        const rightOf = added.every(([x, y]) => { for (let xx = x + 1; xx < l.img.w; xx++) if (opaqueAt(l.img, xx, y)) return false; return true; });
        check('lean.box_east', added.length === 7 * 3 && darker && !aboveTop && rightOf, `--east 3: ${added.length} px added (want 21: 7 south-face rows x 3), all darker palette colours than their edge: ${darker}, right of the silhouette: ${rightOf}, none above the top row: ${!aboveTop}`);
    });
    run('lean.none', () => {
        const rng = mulberry(2);
        const img = randomNative(20, 20, [A, B, C], rng, 0.4);
        const l = leanFrame(img, { mode: 'none', slope: 1, baseline: 19, pal });
        const cmp = sameImage(l.img, img);
        check('lean.none', cmp.ok && l.padLeft === 0, `--lean none returns the frame unchanged: ${cmp.why}`);
    });

    // step 6: outline
    run('outline', () => {
        const img = newImg(8, 8);
        for (let y = 2; y <= 5; y++) for (let x = 2; x <= 5; x++) setPx(img, x, y, A);
        const n = outlineFrame(img);
        const ol = (x, y) => keyAt(img, x, y) === ((0x20 << 16) | (0x14 << 8) | 0x08);
        const lower = [2, 3, 4, 5].every((x) => ol(x, 5)), right = [2, 3, 4, 5].every((y) => ol(5, y));
        const upperLeft = [2, 3, 4].every((x) => !ol(x, 2)) && [3, 4].every((y) => !ol(2, y)) && !ol(3, 3);
        check('outline', n === 7 && lower && right && upperLeft, `4x4 square: ${n} px outlined (want 7): bottom row ${lower}, right column ${right}, top and left edges and inside untouched ${upperLeft}`);
    });

    // step 7: frame placement
    const subject = (w, h, x0, y0, cw, ch, c) => { const img = newImg(cw, ch); for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) setPx(img, x, y, c); return img; };
    run('frame.one_cell', () => {
        const one = subject(10, 12, 3, 20, 48, 48, A);
        const file = writeImg(path.join(root, 'small.png'), onBackground(upscale(one, 4), MAG));
        const res = make({ input: file, dryRun: true }, quiet());
        const ls = lowestSpan(res.master), bb = bbox(res.master);
        check('frame.one_cell', res.sidecar.frameWidth === 48 && res.sidecar.frameHeight === 48 && res.sidecar.anchor.join() === '24,47' && ls.y === 47 && Math.floor((ls.x0 + ls.x1 + 1) / 2) === 24 && opaqueCount(res.master) === 120,
            `10x12 subject drawn off-centre: frame ${res.sidecar.frameWidth}x${res.sidecar.frameHeight}, anchor [${res.sidecar.anchor}] (want 24,47), subject at x ${bb.x0}-${bb.x1}, bottom row ${ls.y}, ${opaqueCount(res.master)} px kept (want 120)`);
    });
    run('frame.large', () => {
        const one = subject(70, 70, 10, 20, 96, 96, B);
        const file = writeImg(path.join(root, 'large.png'), onBackground(upscale(one, 4), MAG));
        const res = make({ input: file, dryRun: true }, quiet());
        const ls = lowestSpan(res.master);
        const cx = Math.floor((ls.x0 + ls.x1 + 1) / 2);
        check('frame.large', res.sidecar.frameWidth === 96 && res.sidecar.frameHeight === 96 && res.sidecar.anchor.join() === '72,95' && cx >= 48 && ls.y === 95 && opaqueCount(res.master) === 4900,
            `70x70 subject: --frame auto chose ${res.sidecar.frameWidth}x${res.sidecar.frameHeight}, anchor [${res.sidecar.anchor}] (want 72,95), contact centre x ${cx} on row ${ls.y} (in the bottom-right cell), ${opaqueCount(res.master)} px kept (want 4900)`);
        let threw = null;
        try { make({ input: file, dryRun: true, frame: '48' }, quiet()); } catch (e) { threw = e.message; }
        check('frame.too_small', !!threw && /does not fit/.test(threw), `forced --frame 48 on the 70x70 subject: ${threw ? `refused ("${threw.slice(0, 90)}...")` : 'NOT refused'}`);
    });
    run('frame.clamp', () => {
        const one = newImg(48, 48);
        for (let i = 0; i < 30; i++) for (let t = 0; t < 4; t++) setPx(one, 10 + i + t, 40 - i, C); // a diagonal leaning up-left, foot at the right
        const file = writeImg(path.join(root, 'diagonal.png'), onBackground(upscale(one, 4), MAG));
        const log = quiet();
        const res = make({ input: file, dryRun: true }, log);
        const bb = bbox(res.master);
        check('frame.clamp', res.sidecar.frameWidth === 48 && res.sidecar.anchor[0] > 24 && bb.x0 >= 0 && opaqueCount(res.master) === opaqueCount(one) && res.sidecar.anchor[0] === Math.floor((lowestSpan(res.master).x0 + lowestSpan(res.master).x1 + 1) / 2),
            `leaning subject 33 px wide with its foot at the right: frame ${res.sidecar.frameWidth}, anchor x ${res.sidecar.anchor[0]} (moved right of 24 so nothing is cropped), left edge ${bb.x0}, ${opaqueCount(res.master)} of ${opaqueCount(one)} px kept, anchor = contact`);
    });

    // step 8: sheet
    run('sheet', () => {
        const fig = (cell, dx, dy) => {
            for (let y = 22; y <= 45; y++) for (let x = 20; x <= 25; x++) setPx(cell, x + dx, y + dy, y < 28 ? A : B);
            setPx(cell, 20 + dx, 46 + dy, D); setPx(cell, 25 + dx, 46 + dy, D); // feet
        };
        const sheet1 = newImg(96, 96);
        const cells = [[0, 0, 0], [0, -2, 0], [3, 0, 1], [3, -2, 1]]; // dx, dy (hop), row
        cells.forEach(([dx, dy, r], i) => { const cell = newImg(48, 48); fig(cell, dx, dy); blit(sheet1, cell, (i % 2) * 48, r * 48); });
        const file = writeImg(path.join(root, 'sheet.png'), onBackground(upscale(sheet1, 4), MAG));
        const res = make({ input: file, dryRun: true, sheet: '2x2', lean: 'full', frame: '96' }, quiet());
        const fw = res.sidecar.frameWidth, fh = res.sidecar.frameHeight;
        const frame = (c, r) => crop(res.master, c * fw, r * fh, fw, fh);
        const s0 = frame(0, 0), h0 = frame(1, 0), s1 = frame(0, 1), h1 = frame(1, 1);
        const layout = res.master.w === 2 * fw && res.master.h === 2 * fh && res.sidecar.facings.length === 1;
        const ground = lowestSpan(s0).y === fh - 1 && lowestSpan(s1).y === fh - 1 && lowestSpan(h0).y === fh - 3 && lowestSpan(h1).y === fh - 3;
        const shifted = newImg(fw, fh); blit(shifted, s0, -2, -2);
        const hopCmp = sameImage(h0, shifted);
        const rowsAgree = sameImage(s0, s1).ok;
        check('sheet', layout && ground && hopCmp.ok && rowsAgree,
            `2x2 sheet (a stand and a 2 px hop per row, row 1 drawn 3 px further right): ${res.master.w}x${res.master.h} = 2x2 frames of ${fw}x${fh}: ${layout}; stand frames on the bottom row and hops 2 rows up: ${ground}; ` +
            `the hop frame = the stand frame moved 2 up and 2 left (one baseline per row, so the lean moves it too): ${hopCmp.why}; row 1 placed like row 0: ${rowsAgree}`);
    });

    // step 9: sidecar, master file, art_check
    run('sidecar', () => {
        const one = subject(12, 20, 16, 24, 48, 48, A);
        for (let y = 24; y < 30; y++) for (let x = 16; x < 28; x++) setPx(one, x, y, D);
        const file = writeImg(path.join(root, 'TEST_prop.png'), onBackground(upscale(one, 4), MAG));
        const out = path.join(root, 'masters', 'TEST_prop.png');
        for (const f of [out, out.replace(/\.png$/, '.json')]) if (fs.existsSync(f)) fs.unlinkSync(f);
        const res = make({ input: file, out, lean: 'box', top: 6, east: 3, outline: true, preview: path.join(root, 'TEST_prop_preview.png') }, quiet());
        const sc = JSON.parse(fs.readFileSync(out.replace(/\.png$/, '.json'), 'utf8'));
        const want = ['id', 'frameWidth', 'frameHeight', 'anchor', 'footprint', 'facings', 'animations', 'frameMs', 'lean', 'source', 'made'];
        const missing = want.filter((k) => !(k in sc));
        const leanOk = sc.lean && sc.lean.mode === 'box' && sc.lean.slope === 1 && sc.lean.top === 6;
        check('sidecar.fields', missing.length === 0 && leanOk && sc.id === 'TEST_prop' && Array.isArray(sc.anchor) && sc.source.block === 4 && typeof sc.made.at === 'string',
            `${rel(out.replace(/\.png$/, '.json'))}: missing ${missing.length ? missing.join(',') : 'nothing'}; lean ${JSON.stringify(sc.lean)}; source.block ${sc.source && sc.source.block}; made.at ${sc.made && sc.made.at}`);
        const ac = require('./art_check').checkFile(out, { sidecar: true, type: null, native: true });
        const st = (n) => (ac.checks.find((c) => c.name === n) || {}).status;
        check('sidecar.art_check', st('alpha') === 'PASS' && st('palette') === 'PASS' && st('size') === 'PASS' && st('sidecar') === 'PASS' && st('grid') === 'SKIP',
            `art_check --native --sidecar on the written master: alpha ${st('alpha')}, grid ${st('grid')}, palette ${st('palette')}, size ${st('size')}, sidecar ${st('sidecar')}`);
        const pv = decodePNG(fs.readFileSync(res.previewPath));
        const pvImg = fromDecoded(pv), pvKeys = colourSet([pvImg]);
        const hasRuler = pvKeys.has((0xC2 << 16) | (0x0C << 8) | 0x1C), hasMeadow = pvKeys.has((0x5D << 16) | (0x71 << 8) | 0x39);
        check('preview', pv.width > res.master.w * 4 && hasRuler && hasMeadow, `${rel(res.previewPath)} ${pv.width}x${pv.height}: meadow green present ${hasMeadow}, ruler red present ${hasRuler}`);
        let refused = null;
        try { make({ input: file, out }, quiet()); } catch (e) { refused = e.message; }
        check('guard.existing', !!refused && /--force/.test(refused), `writing over an existing master without --force: ${refused ? 'refused' : 'NOT refused'}`);
        let g = null;
        try { assertWritable(path.join(ROOT, 'game', 'img', 'characters', 'TEST_x.png')); } catch (e) { g = e.message; }
        let t = null;
        try { assertWritable(path.join(ROOT, 'game', 'test_output', 'make_25d', 'x.png')); } catch (e) { t = e.message; }
        check('guard.game_img', !!g && !t, `game/img/characters/TEST_x.png refused: ${!!g}; game/test_output/make_25d/x.png allowed: ${!t}`);
    });

    // step 1: other formats
    run('load.sniff', () => {
        const f = path.join(root, 'jpeg_named.png');
        fs.writeFileSync(f, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]));
        check('load.sniff', sniffFormat(fs.readFileSync(f)) === 'jpeg' && sniffFormat(Buffer.from('RIFF0000WEBPVP8L')) === 'webp' && sniffFormat(Buffer.from('BM00')) === 'bmp',
            'JPEG bytes in a .png file read as jpeg; RIFF/WEBP as webp; BM as bmp');
    });
    run('load.jpeg', () => {
        if (!powershellAvailable()) { skip('load.jpeg', 'PowerShell is not available here: JPEG/WEBP/BMP need it (PNG does not)'); return; }
        const rng = mulberry(21);
        const one = newImg(24, 24);
        blit(one, randomNative(12, 16, [A, B, C, D], rng, 0), 6, 6);
        const png = writeImg(path.join(root, 'jpeg_src.png'), onBackground(upscale(one, 4), MAG));
        const jpg = path.join(root, 'delivery.jpg');
        runPowerShell(`Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile($env:UF_M25_IN)
try {
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $ep = New-Object System.Drawing.Imaging.EncoderParameters 1
  $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]92)
  $img.Save($env:UF_M25_OUT, $codec, $ep)
} finally { $img.Dispose() }`, { UF_M25_IN: png, UF_M25_OUT: jpg });
        const log = quiet();
        const res = make({ input: jpg, dryRun: true, frame: '48' }, log);
        const loaded = log.lines.find((l) => l.startsWith('STEP load'));
        const bb = bbox(res.master);
        const got = crop(res.master, bb.x0, bb.y0, 12, 16), want = crop(one, 6, 6, 12, 16);
        const cmp = sameImage(got, want);
        check('load.jpeg', /JPEG 96x96, converted to PNG by PowerShell System\.Drawing/.test(loaded) && bb.x1 - bb.x0 === 11 && bb.y1 - bb.y0 === 15 && cmp.diff <= 10,
            `${loaded.replace(/^STEP load: /, '')}; subject ${bb.x1 - bb.x0 + 1}x${bb.y1 - bb.y0 + 1} (want 12x16); against the 1x drawing: ${cmp.why} (JPEG quality 92; allowed 10 of 192)`);
    });
    run('load.webp', () => {
        if (!powershellAvailable()) { skip('load.webp', 'PowerShell is not available here'); return; }
        const f = path.join(root, 'one.webp');
        fs.writeFileSync(f, Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64')); // a 1x1 lossless WEBP
        try {
            const r = loadInput(f);
            check('load.webp', r.format === 'webp' && r.img.w === 1 && r.img.h === 1, `1x1 lossless WEBP decoded by ${r.converted.tool}: ${r.img.w}x${r.img.h}`);
        } catch (e) { skip('load.webp', `this Windows has no usable WEBP decoder (${e.message.slice(0, 120)})`); }
    });

    const total = counts.pass + counts.fail;
    console.log(`RESULT ${counts.fail ? 'FAIL' : 'PASS'} ${counts.pass}/${total} checks, ${counts.skip} skipped (make_25d selftest${BREAK ? `, step "${BREAK}" broken on purpose with --break` : ''}; files in ${root})`);
    BREAK = null;
    return counts.fail ? 1 : 0;
}

module.exports = {
    make, normalize, loadPalette, getPalette, nearest, darkerStep, srgbToLab, sniffFormat, loadInput, removeBackground,
    detectBlock, reduceBlocks, rescale, snapToPalette, limitColors, despeckle, leanFrame, outlineFrame, tryFrame, renderPreview, selftest
};

if (require.main === module) {
    process.exitCode = main(process.argv.slice(2));
}
