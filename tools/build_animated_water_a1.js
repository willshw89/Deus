const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// ----------------------------------------------------------------------------
// 1. Palette & Color Snapping (CIELAB matching uf.hex)
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
// 2. Load Raw Generations
// ----------------------------------------------------------------------------
const rawImg = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'water_animated_nano_banana_raw.png')));

// Sample a 48x48 block from rawImg
function sampleRawTile(sx, sy, sw, sh) {
    const dw = 48, dh = 48;
    const buf = Buffer.alloc(dw * dh * 4);
    for (let dy = 0; dy < dh; dy++) {
        for (let dx = 0; dx < dw; dx++) {
            const startX = Math.round(sx + (dx * sw / dw));
            const endX = Math.round(sx + ((dx + 1) * sw / dw));
            const startY = Math.round(sy + (dy * sh / dh));
            const endY = Math.round(sy + ((dy + 1) * sh / dh));

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
            const r = count ? Math.round(rSum / count) : 0;
            const g = count ? Math.round(gSum / count) : 0;
            const b = count ? Math.round(bSum / count) : 0;
            buf[di] = r;
            buf[di + 1] = g;
            buf[di + 2] = b;
            buf[di + 3] = 255;
        }
    }
    return buf;
}

// Raw wave source frames (top row)
const rawFrame0 = sampleRawTile(10, 10, 310, 300);
const rawFrame1 = sampleRawTile(350, 10, 310, 300);
const rawFrame2 = sampleRawTile(690, 10, 310, 300);
const rawFrames = [rawFrame0, rawFrame1, rawFrame2];

// ----------------------------------------------------------------------------
// 3. Build 288x144 Animated Water Strip (3 frames of 96x144)
// ----------------------------------------------------------------------------
function buildWaterStrip(spec) {
    const W = 288, H = 144;
    const strip = Buffer.alloc(W * H * 4);

    const rampLit = snapHex(spec.ramp.lit);
    const rampField = snapHex(spec.ramp.field);
    const rampShade = snapHex(spec.ramp.shade);
    const rampDeep = snapHex(spec.ramp.deep);
    const rampCurrent = snapHex(spec.ramp.current || spec.ramp.lit);
    const rampGlint = snapHex(spec.ramp.glint || '#FFFFFF');
    const rampShallows = snapHex(spec.ramp.shallows || spec.ramp.lit);
    const shoreLine = snapHex(spec.ramp.shore || spec.ramp.shade);

    // Build 3 frames (col 0: 0..95, col 1: 96..191, col 2: 192..287)
    for (let f = 0; f < 3; f++) {
        const frameOriginX = f * 96;
        const rawF = rawFrames[f];

        // 1. Process 48x48 base tile from raw frame with spec color mapping
        const baseTile = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const si = (y * 48 + x) * 4;
                const r = rawF[si], g = rawF[si + 1], b = rawF[si + 2];
                // Luminance / brightness of wave feature
                const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;

                let c = rampField;
                if (lum > 0.85) c = rampGlint;
                else if (lum > 0.65) c = rampCurrent;
                else if (lum > 0.50) c = rampLit;
                else if (lum > 0.35) c = rampField;
                else if (lum > 0.20) c = rampShade;
                else c = rampDeep;

                baseTile[si] = c[0];
                baseTile[si + 1] = c[1];
                baseTile[si + 2] = c[2];
                baseTile[si + 3] = 255;
            }
        }

        // Seamless wrap baseTile edges
        for (let y = 0; y < 48; y++) {
            const leftIdx = (y * 48) * 4;
            const rightIdx = (y * 48 + 47) * 4;
            baseTile[rightIdx] = baseTile[leftIdx];
            baseTile[rightIdx + 1] = baseTile[leftIdx + 1];
            baseTile[rightIdx + 2] = baseTile[leftIdx + 2];
        }
        for (let x = 0; x < 48; x++) {
            const topIdx = x * 4;
            const botIdx = (47 * 48 + x) * 4;
            baseTile[botIdx] = baseTile[topIdx];
            baseTile[botIdx + 1] = baseTile[topIdx + 1];
            baseTile[botIdx + 2] = baseTile[topIdx + 2];
        }

        // 2. Tile baseTile across 96x144 autotile block
        for (let y = 0; y < 144; y++) {
            for (let x = 0; x < 96; x++) {
                const bi = ((y % 48) * 48 + (x % 48)) * 4;
                const di = (y * W + (frameOriginX + x)) * 4;
                strip[di] = baseTile[bi];
                strip[di + 1] = baseTile[bi + 1];
                strip[di + 2] = baseTile[bi + 2];
                strip[di + 3] = 255;
            }
        }

        // 3. Paint autotile shore ring & notches on this frame
        function setPixel(px, py, col) {
            if (px < 0 || px >= 96 || py < 0 || py >= 144) return;
            const idx = (py * W + (frameOriginX + px)) * 4;
            strip[idx] = col[0];
            strip[idx + 1] = col[1];
            strip[idx + 2] = col[2];
            strip[idx + 3] = 255;
        }

        // Top-Left tile (x 0..47, y 0..47): Showcase / isolated water tile with shore ring
        // Ring is 3 px thick (dist 0 = shoreLine, dist 1 = shallows, dist 2 = shallows/current dither)
        for (let x = 0; x < 48; x++) {
            for (let y = 0; y < 48; y++) {
                const dist = Math.min(x, 47 - x, y, 47 - y);
                if (dist === 0) {
                    setPixel(x, y, shoreLine);
                } else if (dist === 1) {
                    setPixel(x, y, rampShallows);
                } else if (dist === 2) {
                    const dither = (x + y) % 2 === 0;
                    setPixel(x, y, dither ? rampShallows : rampCurrent);
                }
            }
        }

        // Top-Right tile (x 48..95, y 0..47): Inner corner notches
        // Each notch is 3 px thick and 8 px long along both edges at the 4 corners:
        const innerCorners = [
            { cx: 48, cy: 0, dx: 1, dy: 1 },
            { cx: 95, cy: 0, dx: -1, dy: 1 },
            { cx: 48, cy: 47, dx: 1, dy: -1 },
            { cx: 95, cy: 47, dx: -1, dy: -1 }
        ];
        for (const { cx, cy, dx, dy } of innerCorners) {
            for (let lx = 0; lx < 8; lx++) {
                for (let ly = 0; ly < 8; ly++) {
                    if (lx < 3 || ly < 3) {
                        const px = cx + lx * dx;
                        const py = cy + ly * dy;
                        const dist = Math.min(lx, ly);
                        if (dist === 0) {
                            setPixel(px, py, shoreLine);
                        } else if (dist === 1) {
                            setPixel(px, py, rampShallows);
                        } else if (dist === 2) {
                            const dither = (px + py) % 2 === 0;
                            setPixel(px, py, dither ? rampShallows : rampCurrent);
                        }
                    }
                }
            }
        }

        // Bottom 2x2 (x 0..95, y 48..143): Shore ring on outer perimeter only
        for (let x = 0; x < 96; x++) {
            for (let y = 48; y < 144; y++) {
                const dist = Math.min(x, 95 - x, y - 48, 143 - y);
                if (dist === 0) {
                    setPixel(x, y, shoreLine);
                } else if (dist === 1) {
                    setPixel(x, y, rampShallows);
                } else if (dist === 2) {
                    const dither = (x + y) % 2 === 0;
                    setPixel(x, y, dither ? rampShallows : rampCurrent);
                }
            }
        }
    }

    // Palette count check & limit
    const colors = new Set();
    for (let i = 0; i < strip.length; i += 4) {
        colors.add((strip[i] << 16) | (strip[i + 1] << 8) | strip[i + 2]);
    }

    return { strip, colorCount: colors.size };
}

// ----------------------------------------------------------------------------
// 4. Nine Water Kinds (from SEG-15_water.md)
// ----------------------------------------------------------------------------
const WATER_KINDS = [
    {
        id: "fresh", name: "Fresh Water", kind: 0, tileId: 2048, slot: [0, 0],
        ramp: { lit: "#0000E3", field: "#0000C2", shade: "#0000A6", deep: "#00008A", current: "#3D3DFF", glint: "#DBDBFF", shallows: "#7D7DFF", shore: "#00006D" }
    },
    {
        id: "pond", name: "Pond Water", kind: 1, tileId: 2096, slot: [0, 144],
        ramp: { lit: "#358EDB", field: "#006DD2", shade: "#0000C2", deep: "#0000A6", current: "#71AEE7", glint: "#B2D7F3", shallows: "#7D7DFF", shore: "#00006D" }
    },
    {
        id: "marsh", name: "Marsh Water", kind: 2, tileId: 2144, slot: [288, 0],
        ramp: { lit: "#5D7139", field: "#415120", shade: "#39451C", deep: "#283114", current: "#71864D", glint: "#B6C29A", shallows: "#71864D", shore: "#202410" }
    },
    {
        id: "swamp", name: "Swamp Water", kind: 3, tileId: 2192, slot: [288, 144],
        ramp: { lit: "#514139", field: "#352D24", shade: "#241818", deep: "#181010", current: "#313D18", glint: "#BA9A71", shallows: "#45352D", shore: "#100C08" }
    },
    {
        id: "icy", name: "Icy Water", kind: 4, tileId: 2240, slot: [384, 0],
        ramp: { lit: "#0000C2", field: "#0000A6", shade: "#00008A", deep: "#00006D", current: "#CECEFF", glint: "#FFFFFF", shallows: "#71AEE7", shore: "#000035" }
    },
    {
        id: "brackish", name: "Brackish Water", kind: 8, tileId: 2432, slot: [0, 288],
        ramp: { lit: "#71AEE7", field: "#9EAE7D", shade: "#358EDB", deep: "#8A9A61", current: "#B2D7F3", glint: "#EBE3D7", shallows: "#CAD7B6", shore: "#514945" }
    },
    {
        id: "salt", name: "Salt Water", kind: 10, tileId: 2528, slot: [0, 432],
        ramp: { lit: "#B2D7F3", field: "#71AEE7", shade: "#358EDB", deep: "#006DD2", current: "#FFFFFF", glint: "#FFFFFF", shallows: "#F3F3FF", shore: "#0000C2" }
    },
    {
        id: "deep", name: "Deep Ocean", kind: 12, tileId: 2624, slot: [384, 288],
        ramp: { lit: "#00008A", field: "#00006D", shade: "#000051", deep: "#000035", current: "#0000A6", glint: "#FFFFFF", shallows: "#0000A6", shore: "#000018" }
    },
    {
        id: "blighted", name: "Blighted Water", kind: 14, tileId: 2720, slot: [384, 432],
        ramp: { lit: "#6D006D", field: "#510051", shade: "#450045", deep: "#350035", current: "#A228A2", glint: "#D79AD7", shallows: "#7D007D", shore: "#240024" }
    }
];

// Full A1 Sheet: 768 x 576 px
const A1_W = 768, A1_H = 576;
const fullA1 = Buffer.alloc(A1_W * A1_H * 4);

// Initialize with stock or deep water background
for (let i = 0; i < fullA1.length; i += 4) {
    fullA1[i] = 0;
    fullA1[i + 1] = 0;
    fullA1[i + 2] = 109; // #00006D deep water
    fullA1[i + 3] = 255;
}

for (const k of WATER_KINDS) {
    const built = buildWaterStrip(k);
    console.log(`Water [${k.id}] built. Colors: ${built.colorCount}`);

    // Save master 288x144 strip
    writePNG(path.join(ROOT, 'art', 'masters', `${k.id}.png`), 288, 144, built.strip);

    // Save sidecar
    const sidecar = {
        id: k.id,
        frameWidth: 96,
        frameHeight: 144,
        anchor: null,
        facings: [],
        animations: { surface: [0, 1, 2, 1] },
        layer: "water",
        kind: k.kind,
        tileId: k.tileId,
        slot: k.slot
    };
    fs.writeFileSync(path.join(ROOT, 'art', 'masters', `${k.id}.json`), JSON.stringify(sidecar, null, 2));

    // Blit into full A1 sheet at [slotX, slotY]
    const slotX = k.slot[0];
    const slotY = k.slot[1];
    // For kinds 2 and 3 (marsh, swamp), they take first 96 px width in standard A1
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

// Write compiled A1 sheets
writePNG(path.join(ROOT, 'art', 'masters', 'UF_GenWater_A1.png'), A1_W, A1_H, fullA1);
writePNG(path.join(ROOT, 'game', 'img', 'tilesets', 'UF_GenWater_A1.png'), A1_W, A1_H, fullA1);
writePNG(path.join(ROOT, 'game', 'img', 'tilesets', 'Outside_A1.png'), A1_W, A1_H, fullA1);
writePNG(path.join(ROOT, 'game', 'img', 'tilesets', 'Dungeon_A1.png'), A1_W, A1_H, fullA1);

console.log('Successfully generated all 9 animated water kinds, strips, sidecars, and compiled UF_GenWater_A1.png, Outside_A1.png, and Dungeon_A1.png!');

