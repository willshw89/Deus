const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// ----------------------------------------------------------------------------
// 1. Palette & CIELAB Color Snapping
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
// 2. Load Nano Banana Pro Raw Source Sheets
// ----------------------------------------------------------------------------
const rawGrass = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'nano_terrain_gradient_grass.png')));
const rawEarth = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'nano_terrain_gradient_earth.png')));
const rawClay  = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'nano_terrain_gradient_clay_canyon.png')));
const rawSwamp = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'nano_terrain_gradient_swamp_marsh.png')));
const rawRock  = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'nano_terrain_gradient_mountain_rock.png')));
const rawSnow  = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'nano_terrain_gradient_tundra_snow.png')));
const rawImg1  = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'ground_tiles_nano_raw.png')));
const rawImg2  = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'ground_batch2_nano_raw.png')));

// Sample a 48x48 tile from a raw image with area averaging
function sampleRawTile(img, sx, sy, size = 140) {
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

// Make a 48x48 tile wrap seamlessly horizontally and vertically
function makeSeamless(tile, w = 48, h = 48, blend = 8) {
    const out = Buffer.from(tile);
    const B = Math.min(blend, Math.floor(w / 4));

    // Horizontal seamless blend: match right edge (x = w - 1) and left edge (x = 0)
    for (let y = 0; y < h; y++) {
        for (let c = 0; c < 3; c++) {
            const left0 = out[(y * w + 0) * 4 + c];
            const right0 = out[(y * w + (w - 1)) * 4 + c];
            const diff = left0 - right0; // mismatch at seam

            for (let i = 0; i < B; i++) {
                const u = i / B;
                // Cubic smoothstep taper: 1.0 at boundary (i=0), 0.0 at interior (i=B)
                const s = 1.0 - (3.0 * u * u - 2.0 * u * u * u);
                const weight = 0.5 * s;

                const leftIdx = (y * w + i) * 4 + c;
                const rightIdx = (y * w + (w - 1 - i)) * 4 + c;

                out[leftIdx] = Math.max(0, Math.min(255, Math.round(out[leftIdx] - diff * weight)));
                out[rightIdx] = Math.max(0, Math.min(255, Math.round(out[rightIdx] + diff * weight)));
            }
        }
    }

    // Vertical seamless blend: match bottom edge (y = h - 1) and top edge (y = 0)
    for (let x = 0; x < w; x++) {
        for (let c = 0; c < 3; c++) {
            const top0 = out[(0 * w + x) * 4 + c];
            const bot0 = out[((h - 1) * w + x) * 4 + c];
            const diff = top0 - bot0; // mismatch at seam

            for (let i = 0; i < B; i++) {
                const u = i / B;
                const s = 1.0 - (3.0 * u * u - 2.0 * u * u * u);
                const weight = 0.5 * s;

                const topIdx = (i * w + x) * 4 + c;
                const botIdx = ((h - 1 - i) * w + x) * 4 + c;

                out[topIdx] = Math.max(0, Math.min(255, Math.round(out[topIdx] - diff * weight)));
                out[botIdx] = Math.max(0, Math.min(255, Math.round(out[botIdx] + diff * weight)));
            }
        }
    }

    return out;
}

// Bayer 8x8 matrix for smooth micro-dithering
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

// ----------------------------------------------------------------------------
// 3. Assemble Full 96x144 A2 Autotile Block with Euclidean Rounded Math
// ----------------------------------------------------------------------------
function buildA2Block(baseTile, edgeColorHex, highlightHex, isConstructed = false) {
    const block = Buffer.alloc(96 * 144 * 4);
    const edgeColor = snapHex(edgeColorHex);
    const highlightColor = snapHex(highlightHex);

    for (let sy = 0; sy < 6; sy++) {
        for (let sx = 0; sx < 4; sx++) {
            // Determine source quadrant in baseTile (48x48)
            const baseTx = (sx % 2 === 0) ? 0 : 24;
            const baseTy = (sy % 2 === 0) ? 0 : 24;

            for (let ly = 0; ly < 24; ly++) {
                for (let lx = 0; lx < 24; lx++) {
                    const bi = ((baseTy + ly) * 48 + (baseTx + lx)) * 4;
                    let r = baseTile[bi], g = baseTile[bi + 1], b = baseTile[bi + 2];

                    let d = 24.0; // Distance to outer boundary (higher = interior, lower = outer)

                    // Interior quadrants (sy 3..4, sx 1..2): pure terrain
                    if ((sy === 3 || sy === 4) && (sx === 1 || sx === 2)) {
                        d = 24.0;
                    }
                    // Convex NW outer corner: sx 0, sy 2 (Land SE, Outside NW)
                    else if (sx === 0 && sy === 2) {
                        const distCenter = Math.hypot(23.5 - lx, 23.5 - ly);
                        const w = Math.sin((lx - ly) * 0.28) * (Math.sin(Math.min(1, distCenter / 17.0) * Math.PI) * 1.2);
                        d = 17.0 - distCenter + w;
                    }
                    // Convex NE outer corner: sx 3, sy 2 (Land SW, Outside NE)
                    else if (sx === 3 && sy === 2) {
                        const distCenter = Math.hypot(lx + 0.5, 23.5 - ly);
                        const w = Math.sin(((23 - lx) - ly) * 0.28) * (Math.sin(Math.min(1, distCenter / 17.0) * Math.PI) * 1.2);
                        d = 17.0 - distCenter + w;
                    }
                    // Convex SW outer corner: sx 0, sy 5 (Land NE, Outside SW)
                    else if (sx === 0 && sy === 5) {
                        const distCenter = Math.hypot(23.5 - lx, ly + 0.5);
                        const w = Math.sin((lx - (23 - ly)) * 0.28) * (Math.sin(Math.min(1, distCenter / 17.0) * Math.PI) * 1.2);
                        d = 17.0 - distCenter + w;
                    }
                    // Convex SE outer corner: sx 3, sy 5 (Land NW, Outside SE)
                    else if (sx === 3 && sy === 5) {
                        const distCenter = Math.hypot(lx + 0.5, ly + 0.5);
                        const w = Math.sin(((23 - lx) - (23 - ly)) * 0.28) * (Math.sin(Math.min(1, distCenter / 17.0) * Math.PI) * 1.2);
                        d = 17.0 - distCenter + w;
                    }
                    // Straight North edge: sy 2, sx 1..2
                    else if (sy === 2 && (sx === 1 || sx === 2)) {
                        const localX = (sx === 1 ? lx : 24 + lx);
                        const w = Math.sin(localX * (Math.PI / 24)) * 1.2 + Math.cos(localX * (Math.PI / 12)) * 0.6;
                        d = (ly + 0.5 + w) - 6.5;
                    }
                    // Straight South edge: sy 5, sx 1..2
                    else if (sy === 5 && (sx === 1 || sx === 2)) {
                        const localX = (sx === 1 ? lx : 24 + lx);
                        const w = Math.sin(localX * (Math.PI / 24)) * 1.2 + Math.cos(localX * (Math.PI / 12)) * 0.6;
                        d = (23.5 - ly + w) - 6.5;
                    }
                    // Straight West edge: sx 0, sy 3..4
                    else if (sx === 0 && (sy === 3 || sy === 4)) {
                        const localY = (sy === 3 ? ly : 24 + ly);
                        const w = Math.sin(localY * (Math.PI / 24)) * 1.2 + Math.cos(localY * (Math.PI / 12)) * 0.6;
                        d = (lx + 0.5 + w) - 6.5;
                    }
                    // Straight East edge: sx 3, sy 3..4
                    else if (sx === 3 && (sy === 3 || sy === 4)) {
                        const localY = (sy === 3 ? ly : 24 + ly);
                        const w = Math.sin(localY * (Math.PI / 24)) * 1.2 + Math.cos(localY * (Math.PI / 12)) * 0.6;
                        d = (23.5 - lx + w) - 6.5;
                    }
                    // Concave Inner Corners (sx 2..3, sy 0..1):
                    else if (sx === 2 && sy === 0) {
                        const rDist = Math.hypot(lx + 0.5, ly + 0.5);
                        const w = Math.sin((lx + ly) * 0.28) * 0.9;
                        d = (rDist + w) - 6.5;
                    } else if (sx === 3 && sy === 0) {
                        const rDist = Math.hypot(23.5 - lx, ly + 0.5);
                        const w = Math.sin(((23 - lx) + ly) * 0.28) * 0.9;
                        d = (rDist + w) - 6.5;
                    } else if (sx === 2 && sy === 1) {
                        const rDist = Math.hypot(lx + 0.5, 23.5 - ly);
                        const w = Math.sin((lx + (23 - ly)) * 0.28) * 0.9;
                        d = (rDist + w) - 6.5;
                    } else if (sx === 3 && sy === 1) {
                        const rDist = Math.hypot(23.5 - lx, 23.5 - ly);
                        const w = Math.sin(((23 - lx) + (23 - ly)) * 0.28) * 0.9;
                        d = (rDist + w) - 6.5;
                    }
                    // Isolated single tile (sx 0..1, sy 0..1)
                    else if (sx === 0 && sy === 0) {
                        d = 17.0 - Math.hypot(23.5 - lx, 23.5 - ly);
                    } else if (sx === 1 && sy === 0) {
                        d = 17.0 - Math.hypot(lx + 0.5, 23.5 - ly);
                    } else if (sx === 0 && sy === 1) {
                        d = 17.0 - Math.hypot(23.5 - lx, ly + 0.5);
                    } else if (sx === 1 && sy === 1) {
                        d = 17.0 - Math.hypot(lx + 0.5, ly + 0.5);
                    }

                    // Apply border transition
                    if (isConstructed) {
                        // Crisp architectural bevel
                        if (d <= 0.8) {
                            r = edgeColor[0]; g = edgeColor[1]; b = edgeColor[2];
                        } else if (d <= 2.2) {
                            r = highlightColor[0]; g = highlightColor[1]; b = highlightColor[2];
                        }
                    } else {
                        // Natural organic Euclidean boundary with Bayer 8x8 micro-dithering:
                        // No harsh dark outline! Muted transition blend that feathers softly into the neighbor
                        const bayer = BAYER8[ly & 7][lx & 7];
                        if (d <= -0.5) {
                            r = edgeColor[0]; g = edgeColor[1]; b = edgeColor[2];
                        } else if (d <= 2.5) {
                            const t = (d - (-0.5)) / 3.0;
                            const useEdge = (t + (bayer - 0.5) * 0.70) < 0.40;
                            if (useEdge) {
                                r = edgeColor[0]; g = edgeColor[1]; b = edgeColor[2];
                            } else {
                                const useHi = (t + (bayer - 0.5) * 0.70) < 0.75;
                                if (useHi) {
                                    r = highlightColor[0]; g = highlightColor[1]; b = highlightColor[2];
                                }
                            }
                        }
                    }

                    const px = sx * 24 + lx;
                    const py = sy * 24 + ly;
                    const di = (py * 96 + px) * 4;
                    block[di] = r;
                    block[di + 1] = g;
                    block[di + 2] = b;
                    block[di + 3] = 255;
                }
            }
        }
    }
    return block;
}

// ----------------------------------------------------------------------------
// 4. Cohesive Ramps from Shared Palette (Total sheet colors <= 64)
// ----------------------------------------------------------------------------
const TERRAINS = [
    // 0: Meadow (lush grass with subtle flowers) - from rawGrass
    { id: 'meadow', name: 'Meadow', source: rawGrass, sx: 560, sy: 300, size: 160, edge: '#39451C', hi: '#5D7139',
      ramp: { d4: '#283114', d3: '#39451C', d2: '#4D5D28', d1: '#5D7139', m: '#71864D', l1: '#8A9A61', l2: '#F7E7A6' } },
    // 1: Tropical Grass (rich emerald) - from rawGrass
    { id: 'tropical_grass', name: 'Lush grass', source: rawGrass, sx: 210, sy: 300, size: 160, edge: '#004500', hi: '#189218',
      ramp: { d4: '#004500', d3: '#006D00', d2: '#189218', d1: '#45B645', m: '#71864D', l1: '#86D200', l2: '#F7E7A6' } },
    // 2: Dry Grass (golden savanna) - from rawGrass
    { id: 'dry_grass', name: 'Dry grass', source: rawGrass, sx: 1190, sy: 300, size: 160, edge: '#8A5D2D', hi: '#AA8659',
      ramp: { d4: '#6D4D28', d3: '#8A5D2D', d2: '#9A7141', d1: '#AA8659', m: '#BA9A71', l1: '#DBAE20', l2: '#F7E7A6' } },
    // 3: Scrub Soil (sandy shrub earth) - from rawEarth
    { id: 'shrub_soil', name: 'Scrub soil', source: rawEarth, sx: 1190, sy: 300, size: 160, edge: '#6D4D28', hi: '#9A7141',
      ramp: { d4: '#553D20', d3: '#6D4D28', d2: '#8A5D2D', d1: '#9A7141', m: '#AA8659', l1: '#BA9A71', l2: '#CAB292' } },
    // 4: Forest Floor (autumn leaf litter) - from rawEarth
    { id: 'forest_floor', name: 'Leaf litter', source: rawEarth, sx: 210, sy: 300, size: 160, edge: '#352D24', hi: '#6D4D3D',
      ramp: { d4: '#352D24', d3: '#553D31', d2: '#6D4D3D', d1: '#824D28', m: '#9E5124', l1: '#AE653D', l2: '#BE825D' } },
    // 5: Needle Floor (conifer needles & pinecones) - from rawSnow
    { id: 'needle_floor', name: 'Needle floor', source: rawSnow, sx: 210, sy: 300, size: 160, edge: '#241C14', hi: '#4D5D28',
      ramp: { d4: '#241C14', d3: '#283114', d2: '#39451C', d1: '#4D5D28', m: '#6D4D3D', l1: '#8A5D2D', l2: '#9A7141' } },
    // 6: Jungle Floor (dense moist canopy undergrowth) - from rawEarth
    { id: 'jungle_floor', name: 'Jungle floor', source: rawEarth, sx: 350, sy: 300, size: 160, edge: '#283114', hi: '#4D5D28',
      ramp: { d4: '#283114', d3: '#39451C', d2: '#4D5D28', d1: '#5D7139', m: '#71864D', l1: '#8A5D2D', l2: '#AA8659' } },
    // 7: Tundra (cold lichen heath) - from rawSnow
    { id: 'tundra', name: 'Tundra', source: rawSnow, sx: 550, sy: 300, size: 160, edge: '#454545', hi: '#7D7D7D',
      ramp: { d4: '#454545', d3: '#616161', d2: '#7D7D7D', d1: '#8A9A61', m: '#8AA2BE', l1: '#B2C6DE', l2: '#DBDBFF' } },
    // 8: Snow (pure white snow drifts) - from rawSnow
    { id: 'snow', name: 'Snow', source: rawSnow, sx: 1170, sy: 300, size: 160, edge: '#8AA2BE', hi: '#DBDBFF',
      ramp: { d4: '#71AEE7', d3: '#8AA2BE', d2: '#B2C6DE', d1: '#B2D7F3', m: '#DBDBFF', l1: '#EFEFEF', l2: '#FFFFFF' } },
    // 9: Ice (translucent glacial ice) - from rawSnow
    { id: 'ice', name: 'Ice', source: rawSnow, sx: 890, sy: 300, size: 160, edge: '#3571A6', hi: '#8AA2BE',
      ramp: { d4: '#28558A', d3: '#3571A6', d2: '#71AEE7', d1: '#8AA2BE', m: '#B2D7F3', l1: '#DBDBFF', l2: '#FFFFFF' } },
    // 10: Sand (rippled dune sand) - from rawClay
    { id: 'sand', name: 'Sand', source: rawClay, sx: 200, sy: 300, size: 160, edge: '#AA8659', hi: '#CAB292',
      ramp: { d4: '#9A7141', d3: '#AA8659', d2: '#BA9A71', d1: '#CAB292', m: '#DBCAB2', l1: '#F3DF79', l2: '#F7E7A6' } },
    // 11: Stony Ground (desert gravel) - from rawRock
    { id: 'stony', name: 'Stony ground', source: rawRock, sx: 550, sy: 300, size: 160, edge: '#3D3531', hi: '#616161',
      ramp: { d4: '#2D2D2D', d3: '#3D3531', d2: '#515151', d1: '#616161', m: '#7D7D7D', l1: '#8E8E8E', l2: '#CAB292' } },
    // 12: Red Clay (badlands terra cotta) - from rawClay
    { id: 'red_clay', name: 'Red clay', source: rawClay, sx: 550, sy: 300, size: 160, edge: '#6D4D3D', hi: '#9E5124',
      ramp: { d4: '#553D31', d3: '#6D4D3D', d2: '#824D28', d1: '#9E5124', m: '#AE653D', l1: '#BE825D', l2: '#CE9E7D' } },
    // 13: Bare Rock (mountain slate) - from rawRock
    { id: 'rock', name: 'Bare rock', source: rawRock, sx: 890, sy: 300, size: 160, edge: '#2D2D2D', hi: '#616161',
      ramp: { d4: '#181818', d3: '#2D2D2D', d2: '#454545', d1: '#515151', m: '#616161', l1: '#7D7D7D', l2: '#8E8E8E' } },
    // 14: Peak Rock (high jagged peak granite) - from rawRock
    { id: 'peak_rock', name: 'Rock face', source: rawRock, sx: 1170, sy: 300, size: 160, edge: '#181818', hi: '#454545',
      ramp: { d4: '#181818', d3: '#2D2D2D', d2: '#3D3531', d1: '#454545', m: '#515151', l1: '#616161', l2: '#7D7D7D' } },
    // 15: Mud (marsh peat & puddle borders) - from rawSwamp
    { id: 'mud', name: 'Mud', source: rawSwamp, sx: 550, sy: 300, size: 160, edge: '#241C14', hi: '#553D31',
      ramp: { d4: '#241C14', d3: '#352D24', d2: '#553D31', d1: '#6D4D3D', m: '#824D28', l1: '#8A5D2D', l2: '#AA8659' } },
    // 16: Swamp Mud (deep bog peat) - from rawSwamp
    { id: 'swamp_mud', name: 'Swamp mud', source: rawSwamp, sx: 890, sy: 300, size: 160, edge: '#181818', hi: '#352D24',
      ramp: { d4: '#181818', d3: '#241C14', d2: '#352D24', d1: '#553D31', m: '#6D4D3D', l1: '#5D7139', l2: '#71864D' } },
    // 17: Dirt (rich loam soil) - from rawEarth
    { id: 'dirt', name: 'Dirt', source: rawEarth, sx: 560, sy: 300, size: 160, edge: '#352D24', hi: '#6D4D3D',
      ramp: { d4: '#241C14', d3: '#352D24', d2: '#553D31', d1: '#6D4D3D', m: '#8A5D2D', l1: '#9A7141', l2: '#AA8659' } },
    // 18: Cursed Grass (blighted ash-violet necrotic lawn) - from rawClay
    { id: 'cursed_grass', name: 'Blighted grass', source: rawClay, sx: 1170, sy: 300, size: 160, edge: '#280828', hi: '#55314D',
      ramp: { d4: '#280828', d3: '#451845', d2: '#55314D', d1: '#6D006D', m: '#616161', l1: '#7D7D7D', l2: '#8E8279' } },
    // 19: Blessed Grass (luminous emerald & gold clover) - from rawGrass
    { id: 'blessed_grass', name: 'Flowering grass', source: rawGrass, sx: 210, sy: 300, size: 160, edge: '#004500', hi: '#45B645',
      ramp: { d4: '#004500', d3: '#006D00', d2: '#45B645', d1: '#5D7139', m: '#71864D', l1: '#86D200', l2: '#F7E7A6' } },
    // 20: Ash (volcanic cinder & soot) - from rawClay
    { id: 'ash', name: 'Ash', source: rawClay, sx: 1170, sy: 300, size: 160, edge: '#181818', hi: '#3D3531',
      ramp: { d4: '#181818', d3: '#2D2D2D', d2: '#3D3531', d1: '#454545', m: '#515151', l1: '#616161', l2: '#7D7D7D' } },
    // 21: Scree (loose broken shale fragments) - from rawRock
    { id: 'scree', name: 'Scree', source: rawRock, sx: 200, sy: 300, size: 160, edge: '#2D2D2D', hi: '#515151',
      ramp: { d4: '#181818', d3: '#2D2D2D', d2: '#454545', d1: '#515151', m: '#6D615D', l1: '#7D7D7D', l2: '#8E8E8E' } },
    // 22: Road (packed earth with wagon cart ruts) - from rawEarth
    { id: 'road', name: 'Packed earth', source: rawEarth, sx: 900, sy: 300, size: 160, edge: '#553D20', hi: '#8A5D2D', isConstructed: true,
      ramp: { d4: '#553D20', d3: '#6D4D28', d2: '#8A5D2D', d1: '#9A7141', m: '#AA8659', l1: '#BA9A71', l2: '#CAB292' } },
    // 23: Floor Wood (timber planks) - from rawImg1
    { id: 'floor_wood', name: 'Plank floor', source: rawImg1, sx: 20, sy: 170, size: 120, edge: '#241C14', hi: '#6D4D3D', isConstructed: true,
      ramp: { d4: '#241C14', d3: '#352D24', d2: '#6D4D3D', d1: '#8A5D2D', m: '#9A7141', l1: '#AA8659', l2: '#BE825D' } },
    // 24: Floor Stone (dressed flagstone pavement) - from rawImg1
    { id: 'floor_stone', name: 'Flagstone floor', source: rawImg1, sx: 20, sy: 320, size: 120, edge: '#181818', hi: '#454545', isConstructed: true,
      ramp: { d4: '#181818', d3: '#2D2D2D', d2: '#454545', d1: '#616161', m: '#7D7D7D', l1: '#8E8E8E', l2: '#AEAEAE' } },
    // 25: Floor Rushes (woven rush reed matting) - from rawImg2
    { id: 'floor_rushes', name: 'Rush floor', source: rawImg2, sx: 20, sy: 480, size: 120, edge: '#553D20', hi: '#9A7141', isConstructed: true,
      ramp: { d4: '#553D20', d3: '#6D4D28', d2: '#9A7141', d1: '#AA8659', m: '#BA9A71', l1: '#DBCAB2', l2: '#F7E7A6' } }
];

// ----------------------------------------------------------------------------
// 5. Build Master A2 Sheet (768x576)
// ----------------------------------------------------------------------------
const SHEET_W = 768, SHEET_H = 576;
const sheetBuf = Buffer.alloc(SHEET_W * SHEET_H * 4);

console.log(`Building ${TERRAINS.length} ground kinds with Nano Banana Pro into A2 tileset...`);

TERRAINS.forEach((t, k) => {
    // 1. Sample raw 48x48 tile
    const rawTile = sampleRawTile(t.source, t.sx, t.sy, t.size);
    // 2. Make seamless
    const seamlessTile = makeSeamless(rawTile, 48, 48, 6);
    // 3. Process base tile with 16-bit color ramp and dithering
    const baseTile = processBaseTile(seamlessTile, t.ramp);
    // 4. Build 96x144 autotile block with Euclidean rounded mathematics
    const block = buildA2Block(baseTile, t.edge, t.hi, !!t.isConstructed);

    // 5. Position in 768x576 sheet (8 blocks per row, 4 rows)
    const blockCol = k % 8;
    const blockRow = Math.floor(k / 8);
    const ox = blockCol * 96;
    const oy = blockRow * 144;

    for (let by = 0; by < 144; by++) {
        for (let bx = 0; bx < 96; bx++) {
            const bi = (by * 96 + bx) * 4;
            const di = ((oy + by) * SHEET_W + (ox + bx)) * 4;
            sheetBuf[di] = block[bi];
            sheetBuf[di + 1] = block[bi + 1];
            sheetBuf[di + 2] = block[bi + 2];
            sheetBuf[di + 3] = 255;
        }
    }

    // Save individual master block (no .json sidecar for tileset autotile blocks per ART_STANDARD §3)
    const blockPath = path.join(ROOT, 'art', 'masters', `ground_${t.id}.png`);
    writePNG(blockPath, 96, 144, block);

    // Count colors
    const colors = new Set();
    for (let i = 0; i < block.length; i += 4) {
        colors.add((block[i] << 16) | (block[i + 1] << 8) | block[i + 2]);
    }
    console.log(`Kind [${k}: ${t.id}] built at (${ox}, ${oy}) - Colors: ${colors.size}`);
});

// Save complete master sheets
const masterA2 = path.join(ROOT, 'art', 'masters', 'UF_GenGround_A2.png');
writePNG(masterA2, SHEET_W, SHEET_H, sheetBuf);
console.log(`Saved master A2: ${masterA2}`);

const outsideA2 = path.join(ROOT, 'game', 'img', 'tilesets', 'Outside_A2.png');
writePNG(outsideA2, SHEET_W, SHEET_H, sheetBuf);
console.log(`Saved Outside_A2: ${outsideA2}`);

console.log('Successfully generated full Nano Banana Pro A2 autotile sheet for all 26 ground kinds!');
