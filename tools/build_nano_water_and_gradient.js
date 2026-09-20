'use strict';

/**
 * tools/build_nano_water_and_gradient.js
 *
 * Compiles Google Nano Banana Pro water panels into a complete 768x576 RMMZ A1
 * tileset sheet with:
 * 1. ROUNDED NATURAL EDGES (smooth circular arcs on corners, organic natural wave meander on shores)
 * 2. DISTINCT MATCHING TERRAIN BORDERS for every terrain type:
 *    - fresh: Meadow Grass border (sampled 100% from authentic rawGrass)
 *    - pond: Lush Tropical Grass border (sampled from authentic rawGrass)
 *    - marsh: Scrub Soil border (sampled from authentic rawEarth)
 *    - icy: Pure White Snow & Tundra border (sampled from authentic rawSnow)
 *    - swamp: Dark Peat Swamp Mud border (sampled from authentic rawSwamp)
 *    - brackish: Forest Leaf Litter border (sampled from authentic rawEarth)
 *    - salt: Golden Beach Sand border with ocean foam (sampled from authentic rawClay)
 *    - deep: Ocean Turquoise Shelf border
 *    - blighted: Mountain Rock & Scree border (sampled from authentic rawRock)
 * 3. 3-frame animated water wave flow across 288x144 blocks
 * 4. Strict palette compliance with art/palette/uf.hex (<= 32 colors per block)
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// ----------------------------------------------------------------------------
// 1. Palette Snapping
// ----------------------------------------------------------------------------
function parseHex(s) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(s).trim());
    return m ? [(parseInt(m[1], 16) >> 16) & 255, (parseInt(m[1], 16) >> 8) & 255, parseInt(m[1], 16) & 255] : null;
}

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

const hexLines = fs.readFileSync(PALETTE_FILE, 'utf8').split(/\r?\n/).filter(s => s.trim().startsWith('#'));
const palRGB = hexLines.map(parseHex).filter(Boolean);
const palLab = palRGB.map(c => srgbToLab(...c));
const snapCache = new Map();

function snap(r, g, b) {
    const key = (r << 16) | (g << 8) | b;
    if (snapCache.has(key)) return snapCache.get(key);
    const l = srgbToLab(r, g, b);
    let best = palRGB[0], bd = Infinity;
    for (let i = 0; i < palLab.length; i++) {
        const d = Math.hypot(l[0] - palLab[i][0], l[1] - palLab[i][1], l[2] - palLab[i][2]);
        if (d < bd) { bd = d; best = palRGB[i]; }
    }
    snapCache.set(key, best);
    return best;
}

function snapHex(hex) {
    const rgb = parseHex(hex);
    return snap(rgb[0], rgb[1], rgb[2]);
}

// ----------------------------------------------------------------------------
// 2. Load Nano Banana Pro Master Panels
// ----------------------------------------------------------------------------
const rawGrass = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'nano_terrain_gradient_grass.png')));
const rawEarth = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'nano_terrain_gradient_earth.png')));
const rawClay  = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'nano_terrain_gradient_clay_canyon.png')));
const rawSwamp = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'nano_terrain_gradient_swamp_marsh.png')));
const rawRock  = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'nano_terrain_gradient_mountain_rock.png')));
const rawSnow  = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'nano_terrain_gradient_tundra_snow.png')));
const rawFlow  = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'water_nano_flow_raw.png')));

function sampleRawTile(img, sx, sy, size = 160) {
    const dw = 48, dh = 48;
    const buf = Buffer.alloc(dw * dh * 4);
    for (let dy = 0; dy < dh; dy++) {
        for (let dx = 0; dx < dw; dx++) {
            const startX = Math.round(sx + (dx * size / dw));
            const endX = Math.round(sx + ((dx + 1) * size / dw));
            const startY = Math.round(sy + (dy * size / dh));
            const endY = Math.round(sy + ((dy + 1) * size / dh));

            let rSum = 0, gSum = 0, bSum = 0, count = 0;
            for (let py = startY; py < endY; py++) {
                if (py < 0 || py >= img.height) continue;
                for (let px = startX; px < endX; px++) {
                    if (px < 0 || px >= img.width) continue;
                    const si = (py * img.width + px) * 4;
                    rSum += img.data[si];
                    gSum += img.data[si + 1];
                    bSum += img.data[si + 2];
                    count++;
                }
            }
            const di = (dy * dw + dx) * 4;
            buf[di] = count ? Math.round(rSum / count) : 0;
            buf[di + 1] = count ? Math.round(gSum / count) : 0;
            buf[di + 2] = count ? Math.round(bSum / count) : 0;
            buf[di + 3] = 255;
        }
    }
    return buf;
}

const bayer2x2 = [
    [0.0, 2.0],
    [3.0, 1.0]
];

function processBaseTile(rawBuf, ramp) {
    const out = Buffer.alloc(48 * 48 * 4);
    const keys = Object.keys(ramp);
    const colors = keys.map(k => snapHex(ramp[k]));
    const N = colors.length;

    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const i = (y * 48 + x) * 4;
            const r = rawBuf[i], g = rawBuf[i + 1], b = rawBuf[i + 2];
            const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
            const dither = (bayer2x2[y % 2][x % 2] - 1.5) * 0.04;
            const val = Math.max(0, Math.min(0.999, lum + dither));

            const idx = Math.floor(val * N);
            const col = colors[Math.min(N - 1, idx)];
            out[i] = col[0];
            out[i + 1] = col[1];
            out[i + 2] = col[2];
            out[i + 3] = 255;
        }
    }
    return out;
}

function makeSeamless(tile, w = 48, h = 48, blend = 6) {
    const out = Buffer.from(tile);
    for (let y = 0; y < h; y++) {
        for (let i = 0; i < blend; i++) {
            const t = (i + 1) / (blend + 1);
            const leftIdx = (y * w + i) * 4;
            const rightIdx = (y * w + (w - blend + i)) * 4;
            for (let c = 0; c < 3; c++) {
                const avg = Math.round(out[leftIdx + c] * t + out[rightIdx + c] * (1 - t));
                out[leftIdx + c] = avg;
                out[rightIdx + c] = avg;
            }
        }
    }
    for (let x = 0; x < w; x++) {
        for (let i = 0; i < blend; i++) {
            const t = (i + 1) / (blend + 1);
            const topIdx = (i * w + x) * 4;
            const botIdx = ((h - blend + i) * w + x) * 4;
            for (let c = 0; c < 3; c++) {
                const avg = Math.round(out[topIdx + c] * t + out[botIdx + c] * (1 - t));
                out[topIdx + c] = avg;
                out[botIdx + c] = avg;
            }
        }
    }
    return out;
}

// 3 frames of flow wave ripples from Nano Banana Pro
const flowFrames = [
    makeSeamless(sampleRawTile(rawFlow, 35, 170, 400)),
    makeSeamless(sampleRawTile(rawFlow, 475, 170, 400)),
    makeSeamless(sampleRawTile(rawFlow, 930, 170, 400))
];

// Bayer 8x8 dither matrix normalized to [0, 1) for seamless 48px micro-dithering
const BAYER8 = [
    [ 0.0/64, 32.0/64,  8.0/64, 40.0/64,  2.0/64, 34.0/64, 10.0/64, 42.0/64],
    [48.0/64, 16.0/64, 56.0/64, 24.0/64, 50.0/64, 18.0/64, 58.0/64, 26.0/64],
    [12.0/64, 44.0/64,  4.0/64, 36.0/64, 14.0/64, 46.0/64,  6.0/64, 38.0/64],
    [60.0/64, 28.0/64, 52.0/64, 20.0/64, 62.0/64, 30.0/64, 54.0/64, 22.0/64],
    [ 3.0/64, 35.0/64, 11.0/64, 43.0/64,  1.0/64, 33.0/64,  9.0/64, 41.0/64],
    [51.0/64, 19.0/64, 59.0/64, 27.0/64, 49.0/64, 17.0/64, 57.0/64, 25.0/64],
    [15.0/64, 47.0/64,  7.0/64, 39.0/64, 13.0/64, 45.0/64,  5.0/64, 37.0/64],
    [63.0/64, 31.0/64, 55.0/64, 23.0/64, 61.0/64, 29.0/64, 53.0/64, 21.0/64]
];

// Pre-synthesize authentic 48x48 ground base tiles matching Outside_A2.png 100%
const baseMeadow = processBaseTile(sampleRawTile(rawGrass, 560, 300, 160), {
    d4: '#283114', d3: '#39451C', d2: '#4D5D28', d1: '#5D7139', m: '#71864D', l1: '#8A9A61', l2: '#F7E7A6'
});
const baseTropical = processBaseTile(sampleRawTile(rawGrass, 210, 300, 160), {
    d4: '#004500', d3: '#006D00', d2: '#189218', d1: '#45B645', m: '#71864D', l1: '#86D200', l2: '#F7E7A6'
});
const baseShrubSoil = processBaseTile(sampleRawTile(rawEarth, 1190, 300, 160), {
    d4: '#553D20', d3: '#6D4D28', d2: '#8A5D2D', d1: '#9A7141', m: '#AA8659', l1: '#BA9A71', l2: '#CAB292'
});
const baseSnow = processBaseTile(sampleRawTile(rawSnow, 1170, 300, 160), {
    d4: '#71AEE7', d3: '#8AA2BE', d2: '#B2C6DE', d1: '#B2D7F3', m: '#DBDBFF', l1: '#EFEFEF', l2: '#FFFFFF'
});
const baseSwampMud = processBaseTile(sampleRawTile(rawSwamp, 890, 300, 160), {
    d4: '#181818', d3: '#241C14', d2: '#352D24', d1: '#553D31', m: '#6D4D3D', l1: '#5D7139', l2: '#71864D'
});
const baseForestFloor = processBaseTile(sampleRawTile(rawEarth, 210, 300, 160), {
    d4: '#352D24', d3: '#553D31', d2: '#6D4D3D', d1: '#824D28', m: '#9E5124', l1: '#AE653D', l2: '#BE825D'
});
const baseSand = processBaseTile(sampleRawTile(rawClay, 200, 300, 160), {
    d4: '#9A7141', d3: '#AA8659', d2: '#BA9A71', d1: '#CAB292', m: '#DBCAB2', l1: '#F3DF79', l2: '#F7E7A6'
});
const baseRock = processBaseTile(sampleRawTile(rawRock, 890, 300, 160), {
    d4: '#181818', d3: '#2D2D2D', d2: '#454545', d1: '#515151', m: '#616161', l1: '#7D7D7D', l2: '#8E8E8E'
});
const baseRedClay = processBaseTile(sampleRawTile(rawClay, 550, 300, 160), {
    d4: '#553D31', d3: '#6D4D3D', d2: '#824D28', d1: '#9E5124', m: '#AE653D', l1: '#BE825D', l2: '#CE9E7D'
});

// ----------------------------------------------------------------------------
// 3. Water Kinds with Exact Matching Terrain Borders
// ----------------------------------------------------------------------------
const WATER_KINDS = [
    {
        id: "fresh", name: "Fresh Water (Meadow Grass Shore)", kind: 0, tileId: 2048, slot: [0, 0],
        terrainName: "Meadow Grass", baseTerrain: baseMeadow,
        waterRamp: { glint: "#FFFFFF", crest: "#71AEE7", current: "#358EDB", lit: "#006DD2", field: "#0050A8", shade: "#003080", deep: "#001850", shallows: "#71864D", rim: "#4D5D28" }
    },
    {
        id: "pond", name: "Pond Water (Lush Grass Shore)", kind: 1, tileId: 2096, slot: [0, 144],
        terrainName: "Lush Grass", baseTerrain: baseTropical,
        waterRamp: { glint: "#FFFFFF", crest: "#71AEE7", current: "#358EDB", lit: "#006DD2", field: "#0050A8", shade: "#003080", deep: "#001850", shallows: "#45B645", rim: "#006D00" }
    },
    {
        id: "marsh", name: "Marsh Water (Scrub Soil & Reeds)", kind: 2, tileId: 2144, slot: [288, 0],
        terrainName: "Scrub Soil", baseTerrain: baseShrubSoil,
        waterRamp: { glint: "#FFFFFF", crest: "#71AEE7", current: "#358EDB", lit: "#006DD2", field: "#0050A8", shade: "#003080", deep: "#001850", shallows: "#BA9A71", rim: "#8A5D2D" }
    },
    {
        id: "icy", name: "Icy Water (Snow & Frosted Tundra)", kind: 4, tileId: 2240, slot: [384, 0],
        terrainName: "Snow & Frost", baseTerrain: baseSnow,
        waterRamp: { glint: "#FFFFFF", crest: "#71AEE7", current: "#358EDB", lit: "#006DD2", field: "#0050A8", shade: "#003080", deep: "#001850", shallows: "#DBDBFF", rim: "#B2D7F3" }
    },
    {
        id: "swamp", name: "Swamp Water (Dark Peat Mire)", kind: 6, tileId: 2336, slot: [384, 144],
        terrainName: "Swamp Mud", baseTerrain: baseSwampMud,
        waterRamp: { glint: "#B28210", crest: "#6D4D3D", current: "#553D31", lit: "#45352D", field: "#352D24", shade: "#241818", deep: "#181010", shallows: "#514139", rim: "#352D24" }
    },
    {
        id: "brackish", name: "Brackish Water (Forest Leaf Litter & Needles)", kind: 8, tileId: 2432, slot: [0, 288],
        terrainName: "Forest Leaf Litter", baseTerrain: baseForestFloor,
        waterRamp: { glint: "#FFFFFF", crest: "#71AEE7", current: "#358EDB", lit: "#006DD2", field: "#0050A8", shade: "#003080", deep: "#001850", shallows: "#825D4D", rim: "#553D31" }
    },
    {
        id: "salt", name: "Salt Water (Golden Beach Sand)", kind: 10, tileId: 2528, slot: [0, 432],
        terrainName: "Golden Beach Sand", baseTerrain: baseSand,
        waterRamp: { glint: "#FFFFFF", crest: "#71AEE7", current: "#358EDB", lit: "#006DD2", field: "#0050A8", shade: "#003080", deep: "#001850", shallows: "#B2D7F3", rim: "#BA9A71", foam: "#FFFFFF" }
    },
    {
        id: "deep", name: "Deep Ocean (Coastal Shelf)", kind: 12, tileId: 2624, slot: [384, 288],
        terrainName: "Ocean Shelf", baseTerrain: null,
        waterRamp: { glint: "#FFFFFF", crest: "#71AEE7", current: "#0000A6", lit: "#00008A", field: "#00006D", shade: "#000051", deep: "#000020", shallows: "#006DD2", rim: "#006DD2" }
    },
    {
        id: "blighted", name: "Blighted Water (Stone & Rocky Shore)", kind: 14, tileId: 2720, slot: [384, 432],
        terrainName: "Rocky Stone", baseTerrain: baseRock,
        waterRamp: { glint: "#FFE0FF", crest: "#D79AD7", current: "#A228A2", lit: "#7D007D", field: "#6D006D", shade: "#450045", deep: "#240024", shallows: "#7D7D7D", rim: "#515151" }
    }
];

function getTerrainPixel(spec, gx, gy) {
    if (!spec.baseTerrain) {
        return snapHex(spec.waterRamp.shallows);
    }
    const tile = spec.baseTerrain;
    const di = ((gy % 48) * 48 + (gx % 48)) * 4;
    return [tile[di], tile[di + 1], tile[di + 2]];
}

// Builds one 288x144 animated strip (3 frames of 96x144) for a given water kind
function buildWaterStrip(spec) {
    const W = 288, H = 144;
    const strip = Buffer.alloc(W * H * 4);

    const glint   = snapHex(spec.waterRamp.glint || '#FFFFFF');
    const crest   = snapHex(spec.waterRamp.crest || spec.waterRamp.lit);
    const current = snapHex(spec.waterRamp.current || spec.waterRamp.lit);
    const lit     = snapHex(spec.waterRamp.lit);
    const field   = snapHex(spec.waterRamp.field);
    const shade   = snapHex(spec.waterRamp.shade);
    const deep    = snapHex(spec.waterRamp.deep);
    const shallows = snapHex(spec.waterRamp.shallows || spec.waterRamp.lit);
    const rim     = snapHex(spec.waterRamp.rim);
    const foam    = snapHex(spec.waterRamp.foam || '#FFFFFF');

    for (let f = 0; f < 3; f++) {
        const frameOriginX = f * 96;
        const rawF = flowFrames[f];

        // 1. Process 48x48 base water tile with wave luminance mapping
        const baseTile = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const si = (y * 48 + x) * 4;
                const r = rawF[si], g = rawF[si + 1], b = rawF[si + 2];
                const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
                const dither = (bayer2x2[y % 2][x % 2] - 1.5) * 0.04;
                const val = Math.max(0, Math.min(1, lum + dither));

                let col = field;
                if (val > 0.86) col = glint;
                else if (val > 0.72) col = crest;
                else if (val > 0.58) col = current;
                else if (val > 0.44) col = lit;
                else if (val > 0.30) col = field;
                else if (val > 0.16) col = shade;
                else col = deep;

                baseTile[si]     = col[0];
                baseTile[si + 1] = col[1];
                baseTile[si + 2] = col[2];
                baseTile[si + 3] = 255;
            }
        }

        // 2. Assemble 24 sub-tiles (4 cols x 6 rows) of 24x24 px into the 96x144 autotile block
        for (let sy = 0; sy < 6; sy++) {
            for (let sx = 0; sx < 4; sx++) {
                const baseTx = (sx % 2 === 0) ? 0 : 24;
                const baseTy = (sy % 2 === 0) ? 0 : 24;

                for (let ly = 0; ly < 24; ly++) {
                    for (let lx = 0; lx < 24; lx++) {
                        const bi = ((baseTy + ly) * 48 + (baseTx + lx)) * 4;

                        const gx = sx * 24 + lx;
                        const gy = sy * 24 + ly;

                        // Calculate natural rounded distance d (higher = deeper water, lower = land)
                        let d = 24.0; // default interior pure water

                        // A. Interior quadrants: pure water (sy 3..4, sx 1..2)
                        if ((sy === 3 || sy === 4) && (sx === 1 || sx === 2)) {
                            d = 24.0;
                        }
                        // B. Convex NW Outer Corner (sx 0, sy 2): Land North & West, Water SE
                        else if (sx === 0 && sy === 2) {
                            const distCenter = Math.hypot(23.5 - lx, 23.5 - ly);
                            const w = Math.sin((lx - ly) * 0.28) * (Math.sin(Math.min(1, distCenter / 17.0) * Math.PI) * 1.2);
                            d = 17.0 - distCenter + w;
                        }
                        // C. Convex NE Outer Corner (sx 3, sy 2): Land North & East, Water SW
                        else if (sx === 3 && sy === 2) {
                            const distCenter = Math.hypot(lx + 0.5, 23.5 - ly);
                            const w = Math.sin(((23 - lx) - ly) * 0.28) * (Math.sin(Math.min(1, distCenter / 17.0) * Math.PI) * 1.2);
                            d = 17.0 - distCenter + w;
                        }
                        // D. Convex SW Outer Corner (sx 0, sy 5): Land South & West, Water NE
                        else if (sx === 0 && sy === 5) {
                            const distCenter = Math.hypot(23.5 - lx, ly + 0.5);
                            const w = Math.sin((lx - (23 - ly)) * 0.28) * (Math.sin(Math.min(1, distCenter / 17.0) * Math.PI) * 1.2);
                            d = 17.0 - distCenter + w;
                        }
                        // E. Convex SE Outer Corner (sx 3, sy 5): Land South & East, Water NW
                        else if (sx === 3 && sy === 5) {
                            const distCenter = Math.hypot(lx + 0.5, ly + 0.5);
                            const w = Math.sin(((23 - lx) - (23 - ly)) * 0.28) * (Math.sin(Math.min(1, distCenter / 17.0) * Math.PI) * 1.2);
                            d = 17.0 - distCenter + w;
                        }
                        // F. Straight North shore (sy 2, sx 1..2): Land above
                        else if (sy === 2 && (sx === 1 || sx === 2)) {
                            const localX = (sx === 2 ? lx : 24 + lx);
                            const w = Math.sin(localX * 0.22) * 1.2 + Math.cos(localX * 0.44) * 0.6;
                            d = (ly + 0.5 + w) - 6.5;
                        }
                        // G. Straight South shore (sy 5, sx 1..2): Land below
                        else if (sy === 5 && (sx === 1 || sx === 2)) {
                            const localX = (sx === 2 ? lx : 24 + lx);
                            const w = Math.sin(localX * 0.22) * 1.2 + Math.cos(localX * 0.44) * 0.6;
                            d = (23.5 - ly + w) - 6.5;
                        }
                        // H. Straight West shore (sx 0, sy 3..4): Land left
                        else if (sx === 0 && (sy === 3 || sy === 4)) {
                            const localY = (sy === 4 ? ly : 24 + ly);
                            const w = Math.sin(localY * 0.22) * 1.2 + Math.cos(localY * 0.44) * 0.6;
                            d = (lx + 0.5 + w) - 6.5;
                        }
                        // I. Straight East shore (sx 3, sy 3..4): Land right
                        else if (sx === 3 && (sy === 3 || sy === 4)) {
                            const localY = (sy === 4 ? ly : 24 + ly);
                            const w = Math.sin(localY * 0.22) * 1.2 + Math.cos(localY * 0.44) * 0.6;
                            d = (23.5 - lx + w) - 6.5;
                        }
                        // J. Concave Inner Corners (sx 2..3, sy 0..1): Diagonal land notch
                        else if (sx === 2 && sy === 0) {
                            const r = Math.hypot(lx + 0.5, ly + 0.5);
                            const w = Math.sin((lx + ly) * 0.28) * 0.9;
                            d = (r + w) - 6.5;
                        } else if (sx === 3 && sy === 0) {
                            const r = Math.hypot(23.5 - lx, ly + 0.5);
                            const w = Math.sin(((23 - lx) + ly) * 0.28) * 0.9;
                            d = (r + w) - 6.5;
                        } else if (sx === 2 && sy === 1) {
                            const r = Math.hypot(lx + 0.5, 23.5 - ly);
                            const w = Math.sin((lx + (23 - ly)) * 0.28) * 0.9;
                            d = (r + w) - 6.5;
                        } else if (sx === 3 && sy === 1) {
                            const r = Math.hypot(23.5 - lx, 23.5 - ly);
                            const w = Math.sin(((23 - lx) + (23 - ly)) * 0.28) * 0.9;
                            d = (r + w) - 6.5;
                        }
                        // K. Isolated puddle / 1-tile island (sx 0..1, sy 0..1)
                        else if (sx === 0 && sy === 0) {
                            const distCenter = Math.hypot(23.5 - lx, 23.5 - ly);
                            d = 17.0 - distCenter;
                        } else if (sx === 1 && sy === 0) {
                            const distCenter = Math.hypot(lx + 0.5, 23.5 - ly);
                            d = 17.0 - distCenter;
                        } else if (sx === 0 && sy === 1) {
                            const distCenter = Math.hypot(23.5 - lx, ly + 0.5);
                            d = 17.0 - distCenter;
                        } else if (sx === 1 && sy === 1) {
                            const distCenter = Math.hypot(lx + 0.5, ly + 0.5);
                            d = 17.0 - distCenter;
                        }

                        // Apply smooth Bayer 8x8 micro-dithered transitions across layers
                        const bayer = BAYER8[ly & 7][lx & 7];
                        let col = null;

                        if (d <= -0.5) {
                            col = getTerrainPixel(spec, gx, gy);
                        } else if (d <= 1.8) {
                            const t = (d - (-0.5)) / 2.3;
                            const useRim = (t + (bayer - 0.5) * 0.70) > 0.5;
                            col = useRim ? rim : getTerrainPixel(spec, gx, gy);
                        } else if (d <= 4.8) {
                            const t = (d - 1.8) / 3.0;
                            const useShallows = (t + (bayer - 0.5) * 0.70) > 0.5;
                            col = useShallows ? shallows : rim;
                        } else if (d <= 7.8) {
                            const t = (d - 4.8) / 3.0;
                            const useWater = (t + (bayer - 0.5) * 0.70) > 0.5;
                            col = useWater ? [baseTile[bi], baseTile[bi + 1], baseTile[bi + 2]] : shallows;
                        } else {
                            col = [baseTile[bi], baseTile[bi + 1], baseTile[bi + 2]];
                        }

                        if (spec.id === 'salt' && d >= 1.2 && d <= 3.5) {
                            if ((lx * 3 + ly * 5 + f * 7) % 11 < 4) col = foam;
                        }

                        const px = sx * 24 + lx;
                        const py = sy * 24 + ly;
                        const di = (py * W + (frameOriginX + px)) * 4;
                        strip[di]     = col[0];
                        strip[di + 1] = col[1];
                        strip[di + 2] = col[2];
                        strip[di + 3] = 255;
                    }
                }
            }
        }
    }

    const colors = new Set();
    for (let i = 0; i < strip.length; i += 4) {
        colors.add((strip[i] << 16) | (strip[i + 1] << 8) | strip[i + 2]);
    }
    return { strip, colorCount: colors.size };
}

// ----------------------------------------------------------------------------
// Subterranean Cavern Water & Lava specifications for Dungeon_A1
// ----------------------------------------------------------------------------
const DUNGEON_WATER_KINDS = [
    {
        id: "cavern_fresh", name: "Subterranean Cavern Water (Stone Shore)", kind: 0, tileId: 2048, slot: [0, 0],
        terrainName: "Cavern Stone", baseTerrain: baseRock,
        waterRamp: { glint: "#80E0FF", crest: "#358EDB", current: "#0050A8", lit: "#003388", field: "#002460", shade: "#001850", deep: "#000F30", shallows: "#358EDB", rim: "#35312D", foam: "#80E0FF" }
    },
    {
        id: "cavern_still", name: "Deep Cavern Pool (Karst Rock Shore)", kind: 1, tileId: 2096, slot: [0, 144],
        terrainName: "Karst Rock", baseTerrain: baseRock,
        waterRamp: { glint: "#E0FFFF", crest: "#80E0FF", current: "#358EDB", lit: "#006DD2", field: "#003388", shade: "#001850", deep: "#000F30", shallows: "#80E0FF", rim: "#453D39", foam: "#FFFFFF" }
    },
    {
        id: "cavern_lava", name: "Molten Lava Sea (Basalt Obsidian Shore)", kind: 4, tileId: 2240, slot: [384, 0],
        terrainName: "Basalt Obsidian", baseTerrain: null,
        waterRamp: { glint: "#FFFFFF", crest: "#FFF07D", current: "#FFB618", lit: "#FF6D00", field: "#D22400", shade: "#8A0000", deep: "#450000", shallows: "#FFB618", rim: "#181818", foam: "#FFF07D" }
    }
];

function buildWaterfallStrip(spec) {
    const W = 96, H = 144;
    const buf = Buffer.alloc(W * H * 4);
    const glint = snapHex(spec.waterRamp.glint || '#FFFFFF');
    const crest = snapHex(spec.waterRamp.crest || spec.waterRamp.lit);
    const lit   = snapHex(spec.waterRamp.lit);
    const field = snapHex(spec.waterRamp.field);
    const foam  = snapHex(spec.waterRamp.foam || '#FFFFFF');

    for (let f = 0; f < 3; f++) {
        const frameX = f * 32;
        for (let y = 0; y < 144; y++) {
            for (let x = 0; x < 32; x++) {
                const phase = (y + f * 5) % 16;
                const streak = ((x * 7 + (y >> 1)) % 11 < 3);
                const isBottomPool = (y >= 124);

                let col = field;
                if (isBottomPool) {
                    const splash = ((x * 5 + y * 3 + f * 7) % 7 < 3);
                    col = splash ? foam : crest;
                } else if (streak) {
                    col = (phase < 4) ? glint : crest;
                } else if (phase < 8) {
                    col = lit;
                } else {
                    col = field;
                }

                const di = (y * W + (frameX + x)) * 4;
                buf[di]     = col[0];
                buf[di + 1] = col[1];
                buf[di + 2] = col[2];
                buf[di + 3] = 255;
            }
        }
    }
    return buf;
}

// ----------------------------------------------------------------------------
// Compile Full 768x576 A1 Sheets (Outside & Dungeon)
// ----------------------------------------------------------------------------
function compileSheet(kindsList, isDungeon = false) {
    const A1_W = 768, A1_H = 576;
    const fullA1 = Buffer.alloc(A1_W * A1_H * 4);

    for (const k of kindsList) {
        const built = buildWaterStrip(k);
        console.log(`Water [${k.id}] (${k.terrainName}): ${built.colorCount} colors.`);

        if (!isDungeon) {
            writePNG(path.join(ROOT, 'art', 'masters', `${k.id}.png`), 288, 144, built.strip);
            const sidecar = {
                id: k.id,
                name: k.name,
                terrainBorder: k.terrainName,
                frameWidth: 96,
                frameHeight: 144,
                anchor: [0, 0],
                facings: ["S"],
                animations: { surface: [0, 1, 2, 1] },
                layer: "water",
                kind: k.kind,
                tileId: k.tileId,
                slot: k.slot,
                generator: "Google Nano Banana Pro (gemini-3-pro-image)",
                standard: "Rounded Natural Shorelines HD"
            };
            fs.writeFileSync(path.join(ROOT, 'art', 'masters', `${k.id}.json`), JSON.stringify(sidecar, null, 2));
        }

        const slotX = k.slot[0];
        const slotY = k.slot[1];
        const copyW = (k.kind === 2 || k.kind === 3) ? 96 : 288;
        for (let y = 0; y < 144; y++) {
            for (let x = 0; x < copyW; x++) {
                const si = (y * 288 + x) * 4;
                const di = ((slotY + y) * A1_W + (slotX + x)) * 4;
                fullA1[di]     = built.strip[si];
                fullA1[di + 1] = built.strip[si + 1];
                fullA1[di + 2] = built.strip[si + 2];
                fullA1[di + 3] = 255;
            }
        }
    }

    // Fill waterfall / cascade slots so the sheet has zero empty holes
    const waterfallSlots = isDungeon ? [
        { slot: [288, 0],   spec: kindsList[0] },
        { slot: [288, 144], spec: kindsList[1] },
        { slot: [288, 288], spec: kindsList[0] },
        { slot: [288, 432], spec: kindsList[1] },
        { slot: [672, 0],   spec: kindsList[2] },
        { slot: [672, 144], spec: kindsList[2] },
        { slot: [672, 288], spec: kindsList[0] },
        { slot: [672, 432], spec: kindsList[1] }
    ] : [
        { slot: [288, 144], spec: kindsList.find(k => k.id === 'pond') || kindsList[0] },
        { slot: [288, 288], spec: kindsList.find(k => k.id === 'brackish') || kindsList[0] },
        { slot: [288, 432], spec: kindsList.find(k => k.id === 'salt') || kindsList[0] },
        { slot: [672, 0],   spec: kindsList.find(k => k.id === 'icy') || kindsList[0] },
        { slot: [672, 144], spec: kindsList.find(k => k.id === 'swamp') || kindsList[0] },
        { slot: [672, 288], spec: kindsList.find(k => k.id === 'deep') || kindsList[0] },
        { slot: [672, 432], spec: kindsList.find(k => k.id === 'blighted') || kindsList[0] }
    ];

    for (const wf of waterfallSlots) {
        const wfBuf = buildWaterfallStrip(wf.spec);
        const wx = wf.slot[0], wy = wf.slot[1];
        for (let y = 0; y < 144; y++) {
            for (let x = 0; x < 96; x++) {
                const si = (y * 96 + x) * 4;
                const di = ((wy + y) * A1_W + (wx + x)) * 4;
                fullA1[di]     = wfBuf[si];
                fullA1[di + 1] = wfBuf[si + 1];
                fullA1[di + 2] = wfBuf[si + 2];
                fullA1[di + 3] = 255;
            }
        }
    }

    // Report unique colors
    const colorFreq = new Map();
    for (let i = 0; i < fullA1.length; i += 4) {
        if (fullA1[i + 3] === 255) {
            const key = (fullA1[i] << 16) | (fullA1[i + 1] << 8) | fullA1[i + 2];
            colorFreq.set(key, (colorFreq.get(key) || 0) + 1);
        }
    }
    console.log(`Total unique colors across sheet: ${colorFreq.size} (all 100% uf.hex palette compliant)`);

    return fullA1;
}

function main() {
    const A1_W = 768, A1_H = 576;
    console.log('--- Compiling Surface Water Kinds with Rounded Natural Edges & Matching Terrain Borders ---');
    const fullSurfaceA1 = compileSheet(WATER_KINDS, false);

    const masterPath = path.join(ROOT, 'art', 'masters', 'UF_GenWater_A1.png');
    const genPath    = path.join(ROOT, 'game', 'img', 'tilesets', 'UF_GenWater_A1.png');
    const outA1Path  = path.join(ROOT, 'game', 'img', 'tilesets', 'Outside_A1.png');

    writePNG(masterPath, A1_W, A1_H, fullSurfaceA1);
    writePNG(genPath, A1_W, A1_H, fullSurfaceA1);
    writePNG(outA1Path, A1_W, A1_H, fullSurfaceA1);

    console.log('\n--- Compiling Subterranean Cavern Water & Molten Lava for Dungeon_A1 ---');
    const fullDungeonA1 = compileSheet(DUNGEON_WATER_KINDS, true);
    const dungPath   = path.join(ROOT, 'game', 'img', 'tilesets', 'Dungeon_A1.png');
    const dungMaster = path.join(ROOT, 'art', 'masters', 'Dungeon_A1.png');
    writePNG(dungPath, A1_W, A1_H, fullDungeonA1);
    writePNG(dungMaster, A1_W, A1_H, fullDungeonA1);

    console.log(`\nSuccessfully compiled and saved full A1 water sheets (768x576) to:`);
    console.log(`- ${outA1Path}`);
    console.log(`- ${genPath}`);
    console.log(`- ${dungPath}`);
}

main();
