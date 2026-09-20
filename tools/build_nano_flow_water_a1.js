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
// 2. Load Nano Banana Pro Flowing Water Generation
// ----------------------------------------------------------------------------
const rawImg = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'water_nano_flow_raw.png')));

// Sample a 48x48 block from rawImg with area averaging
function sampleRawTile(sx, sy, size) {
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
                if (py < 0 || py >= rawImg.height) continue;
                for (let px = startX; px < endX; px++) {
                    if (px < 0 || px >= rawImg.width) continue;
                    const si = (py * rawImg.width + px) * 4;
                    rSum += rawImg.data[si];
                    gSum += rawImg.data[si + 1];
                    bSum += rawImg.data[si + 2];
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

// Seamless edge blend to wrap 48x48 tile seamlessly horizontally and vertically
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

// 3 sequential flowing wave frames directly from Nano Banana Pro panels
const rawFrames = [
    makeSeamless(sampleRawTile(35, 170, 400)),
    makeSeamless(sampleRawTile(475, 170, 400)),
    makeSeamless(sampleRawTile(930, 170, 400))
];

// ----------------------------------------------------------------------------
// 3. Build 288x144 Animated Water Strip (3 frames of 96x144)
// ----------------------------------------------------------------------------
function buildWaterStrip(spec) {
    const W = 288, H = 144;
    const strip = Buffer.alloc(W * H * 4);

    const rampGlint = snapHex(spec.ramp.glint || '#FFFFFF');
    const rampCrest = snapHex(spec.ramp.crest || spec.ramp.lit);
    const rampCurrent = snapHex(spec.ramp.current || spec.ramp.lit);
    const rampLit = snapHex(spec.ramp.lit);
    const rampField = snapHex(spec.ramp.field);
    const rampShade = snapHex(spec.ramp.shade);
    const rampDeep = snapHex(spec.ramp.deep);
    const rampShallows = snapHex(spec.ramp.shallows || spec.ramp.lit);
    const shoreLine = snapHex(spec.ramp.shore || spec.ramp.shade);

    // 2x2 Bayer dither matrix for authentic 16-bit retro RPG caustics
    const bayer2x2 = [
        [0, 2],
        [3, 1]
    ];

    for (let f = 0; f < 3; f++) {
        const frameOriginX = f * 96;
        const rawF = rawFrames[f];

        // 1. Process 48x48 base tile with responsive wave luminance mapping and dithering
        const baseTile = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const si = (y * 48 + x) * 4;
                const r = rawF[si], g = rawF[si + 1], b = rawF[si + 2];
                // Wave luminance calculation
                const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
                const dither = (bayer2x2[y % 2][x % 2] - 1.5) * 0.04;
                const val = Math.max(0, Math.min(1, lum + dither));

                let col = rampField;
                if (val > 0.86) col = rampGlint;
                else if (val > 0.72) col = rampCrest;
                else if (val > 0.58) col = rampCurrent;
                else if (val > 0.44) col = rampLit;
                else if (val > 0.30) col = rampField;
                else if (val > 0.16) col = rampShade;
                else col = rampDeep;

                baseTile[si] = col[0];
                baseTile[si + 1] = col[1];
                baseTile[si + 2] = col[2];
                baseTile[si + 3] = 255;
            }
        }

        // 2. Assemble 24 sub-tiles (4x6) of 24x24 px into the 96x144 autotile block
        for (let sy = 0; sy < 6; sy++) {
            for (let sx = 0; sx < 4; sx++) {
                // Determine source quadrant in baseTile (48x48)
                // Left quadrants: sx 0, 2 -> tx 0..23
                // Right quadrants: sx 1, 3 -> tx 24..47
                const baseTx = (sx % 2 === 0) ? 0 : 24;
                // Top quadrants: sy 0, 2, 4 -> ty 0..23
                // Bottom quadrants: sy 1, 3, 5 -> ty 24..47
                const baseTy = (sy % 2 === 0) ? 0 : 24;

                for (let ly = 0; ly < 24; ly++) {
                    for (let lx = 0; lx < 24; lx++) {
                        const bi = ((baseTy + ly) * 48 + (baseTx + lx)) * 4;
                        let r = baseTile[bi], g = baseTile[bi + 1], b = baseTile[bi + 2];

                        // Compute distance to land boundary
                        let dist = Infinity;

                        // Interior quadrants (sy 3..4, sx 1..2): pure water
                        if ((sy === 3 || sy === 4) && (sx === 1 || sx === 2)) {
                            dist = Infinity;
                        }
                        // Straight North edge: sy 2, sx 1..2
                        else if (sy === 2 && (sx === 1 || sx === 2)) {
                            dist = ly;
                        }
                        // Straight South edge: sy 5, sx 1..2
                        else if (sy === 5 && (sx === 1 || sx === 2)) {
                            dist = 23 - ly;
                        }
                        // Straight West edge: sx 0, sy 3..4
                        else if (sx === 0 && (sy === 3 || sy === 4)) {
                            dist = lx;
                        }
                        // Straight East edge: sx 3, sy 3..4
                        else if (sx === 3 && (sy === 3 || sy === 4)) {
                            dist = 23 - lx;
                        }
                        // Convex NW outer corner: sx 0, sy 2
                        else if (sx === 0 && sy === 2) {
                            dist = Math.min(lx, ly);
                        }
                        // Convex NE outer corner: sx 3, sy 2
                        else if (sx === 3 && sy === 2) {
                            dist = Math.min(23 - lx, ly);
                        }
                        // Convex SW outer corner: sx 0, sy 5
                        else if (sx === 0 && sy === 5) {
                            dist = Math.min(lx, 23 - ly);
                        }
                        // Convex SE outer corner: sx 3, sy 5
                        else if (sx === 3 && sy === 5) {
                            dist = Math.min(23 - lx, 23 - ly);
                        }
                        // Concave TL inner corner: sx 2, sy 0 (land at top-left)
                        else if (sx === 2 && sy === 0) {
                            if (lx < 4 && ly < 4) {
                                dist = Math.max(lx, ly);
                            }
                        }
                        // Concave TR inner corner: sx 3, sy 0 (land at top-right)
                        else if (sx === 3 && sy === 0) {
                            if ((23 - lx) < 4 && ly < 4) {
                                dist = Math.max(23 - lx, ly);
                            }
                        }
                        // Concave BL inner corner: sx 2, sy 1 (land at bottom-left)
                        else if (sx === 2 && sy === 1) {
                            if (lx < 4 && (23 - ly) < 4) {
                                dist = Math.max(lx, 23 - ly);
                            }
                        }
                        // Concave BR inner corner: sx 3, sy 1 (land at bottom-right)
                        else if (sx === 3 && sy === 1) {
                            if ((23 - lx) < 4 && (23 - ly) < 4) {
                                dist = Math.max(23 - lx, 23 - ly);
                            }
                        }
                        // Isolated single tile (sx 0..1, sy 0..1)
                        else if (sx === 0 && sy === 0) {
                            dist = Math.min(lx, ly);
                        } else if (sx === 1 && sy === 0) {
                            dist = Math.min(23 - lx, ly);
                        } else if (sx === 0 && sy === 1) {
                            dist = Math.min(lx, 23 - ly);
                        } else if (sx === 1 && sy === 1) {
                            dist = Math.min(23 - lx, 23 - ly);
                        }

                        // Apply 4-pixel shoreline transition
                        if (dist === 0) {
                            r = shoreLine[0]; g = shoreLine[1]; b = shoreLine[2];
                        } else if (dist === 1) {
                            r = rampCrest[0]; g = rampCrest[1]; b = rampCrest[2];
                        } else if (dist === 2) {
                            r = rampShallows[0]; g = rampShallows[1]; b = rampShallows[2];
                        } else if (dist === 3) {
                            const d = ((lx + ly) % 2 === 0);
                            const col = d ? rampShallows : rampCurrent;
                            r = col[0]; g = col[1]; b = col[2];
                        }

                        const px = sx * 24 + lx;
                        const py = sy * 24 + ly;
                        const di = (py * W + (frameOriginX + px)) * 4;
                        strip[di] = r;
                        strip[di + 1] = g;
                        strip[di + 2] = b;
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
// 4. Nine Water Kinds with Dynamic Flow Ramps
// ----------------------------------------------------------------------------
const WATER_KINDS = [
    {
        id: "fresh", name: "Fresh Water", kind: 0, tileId: 2048, slot: [0, 0],
        ramp: { glint: "#FFFFFF", crest: "#7DFFFF", current: "#3DBBFF", lit: "#0080E8", field: "#0055C2", shade: "#003388", deep: "#001850", shallows: "#7D7DFF", shore: "#00006D" }
    },
    {
        id: "pond", name: "Pond Water", kind: 1, tileId: 2096, slot: [0, 144],
        ramp: { glint: "#E0FFFF", crest: "#80E0FF", current: "#358EDB", lit: "#006DD2", field: "#0050A8", shade: "#003080", deep: "#001850", shallows: "#7D7DFF", shore: "#00006D" }
    },
    {
        id: "marsh", name: "Marsh Water", kind: 2, tileId: 2144, slot: [288, 0],
        ramp: { glint: "#D8F0A0", crest: "#B6C29A", current: "#71864D", lit: "#5D7139", field: "#415120", shade: "#39451C", deep: "#283114", shallows: "#71864D", shore: "#202410" }
    },
    {
        id: "swamp", name: "Swamp Water", kind: 3, tileId: 2192, slot: [288, 144],
        ramp: { glint: "#E8C8A0", crest: "#BA9A71", current: "#605030", lit: "#514139", field: "#352D24", shade: "#241818", deep: "#181010", shallows: "#45352D", shore: "#100C08" }
    },
    {
        id: "icy", name: "Icy Water", kind: 4, tileId: 2240, slot: [384, 0],
        ramp: { glint: "#FFFFFF", crest: "#E0F8FF", current: "#CECEFF", lit: "#71AEE7", field: "#0000C2", shade: "#00008A", deep: "#000051", shallows: "#71AEE7", shore: "#000035" }
    },
    {
        id: "brackish", name: "Brackish Water", kind: 8, tileId: 2432, slot: [0, 288],
        ramp: { glint: "#FFFFFF", crest: "#EBE3D7", current: "#B2D7F3", lit: "#71AEE7", field: "#358EDB", shade: "#8A9A61", deep: "#514945", shallows: "#CAD7B6", shore: "#514945" }
    },
    {
        id: "salt", name: "Salt Water", kind: 10, tileId: 2528, slot: [0, 432],
        ramp: { glint: "#FFFFFF", crest: "#FFFFFF", current: "#B2D7F3", lit: "#71AEE7", field: "#358EDB", shade: "#006DD2", deep: "#0000C2", shallows: "#F3F3FF", shore: "#0000C2" }
    },
    {
        id: "deep", name: "Deep Ocean", kind: 12, tileId: 2624, slot: [384, 288],
        ramp: { glint: "#FFFFFF", crest: "#71AEE7", current: "#0000A6", lit: "#00008A", field: "#00006D", shade: "#000051", deep: "#000020", shallows: "#0000A6", shore: "#000018" }
    },
    {
        id: "blighted", name: "Blighted Water", kind: 14, tileId: 2720, slot: [384, 432],
        ramp: { glint: "#FFE0FF", crest: "#D79AD7", current: "#A228A2", lit: "#7D007D", field: "#6D006D", shade: "#450045", deep: "#240024", shallows: "#A228A2", shore: "#240024" }
    }
];

// Full A1 Sheet: 768 x 576 px
const A1_W = 768, A1_H = 576;
const fullA1 = Buffer.alloc(A1_W * A1_H * 4);

// Background base
for (let i = 0; i < fullA1.length; i += 4) {
    fullA1[i] = 0;
    fullA1[i + 1] = 0;
    fullA1[i + 2] = 109;
    fullA1[i + 3] = 255;
}

for (const k of WATER_KINDS) {
    const built = buildWaterStrip(k);
    console.log(`Water [${k.id}] built with Nano Banana Pro flow frames. Colors: ${built.colorCount}`);

    writePNG(path.join(ROOT, 'art', 'masters', `${k.id}.png`), 288, 144, built.strip);

    const sidecar = {
        id: k.id,
        frameWidth: 96,
        frameHeight: 144,
        anchor: [0, 0],
        facings: ["S"],
        animations: { surface: [0, 1, 2, 1] },
        layer: "water",
        kind: k.kind,
        tileId: k.tileId,
        slot: k.slot
    };
    fs.writeFileSync(path.join(ROOT, 'art', 'masters', `${k.id}.json`), JSON.stringify(sidecar, null, 2));

    const slotX = k.slot[0];
    const slotY = k.slot[1];
    const copyW = (k.kind === 2 || k.kind === 3) ? 96 : 288;
    for (let y = 0; y < 144; y++) {
        for (let x = 0; x < copyW; x++) {
            const si = (y * 288 + x) * 4;
            const di = ((slotY + y) * A1_W + (slotX + x)) * 4;
            fullA1[di] = built.strip[si];
            fullA1[di + 1] = built.strip[si + 1];
            fullA1[di + 2] = built.strip[si + 2];
            fullA1[di + 3] = 255;
        }
    }
}

writePNG(path.join(ROOT, 'art', 'masters', 'UF_GenWater_A1.png'), A1_W, A1_H, fullA1);
writePNG(path.join(ROOT, 'game', 'img', 'tilesets', 'UF_GenWater_A1.png'), A1_W, A1_H, fullA1);
writePNG(path.join(ROOT, 'game', 'img', 'tilesets', 'Outside_A1.png'), A1_W, A1_H, fullA1);
writePNG(path.join(ROOT, 'game', 'img', 'tilesets', 'Dungeon_A1.png'), A1_W, A1_H, fullA1);

console.log('Successfully generated all 9 animated water kinds with Nano Banana Pro flow waveframes into Outside_A1.png and Dungeon_A1.png!');
