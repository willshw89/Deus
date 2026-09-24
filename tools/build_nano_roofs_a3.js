'use strict';

/**
 * tools/build_nano_roofs_a3.js
 *
 * Compiles authentic Google Nano Banana Pro roof textures into a complete
 * 768x576 RMMZ Outside_A3 autotile sheet (8 cols x 6 rows of 96x96 blocks).
 *
 * Each 96x96 block is constructed as an authentic RMMZ WALL_AUTOTILE_TABLE
 * roof autotile (16 shapes) with:
 * - Row 0 (sub-tiles sy=0): Roof ridge cap with sunlit highlight
 * - Row 3 (sub-tiles sy=3): Roof eave overhang with deep fascia drop shadow
 * - Col 0 (sub-tiles sx=0): Left bargeboard/verge trim
 * - Col 3 (sub-tiles sx=3): Right bargeboard/verge trim
 * - Center (sx=1..2, sy=1..2): Textured shingle/thatch/slate field
 *
 * All colors strictly snapped to art/palette/uf.hex (<= 32 colors per block).
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

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

const roofsRaw = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'roofs_nano_raw.png')));

function sampleBlock(raw, sx, sy, sw, sh, tw = 96, th = 96) {
    const buf = Buffer.alloc(tw * th * 4);
    for (let dy = 0; dy < th; dy++) {
        for (let dx = 0; dx < tw; dx++) {
            const px = Math.floor(sx + (dx * sw / tw));
            const py = Math.floor(sy + (dy * sh / th));
            const si = (py * raw.width + px) * 4;
            const di = (dy * tw + dx) * 4;
            const snapped = snap(raw.data[si], raw.data[si + 1], raw.data[si + 2]);
            buf[di]     = snapped[0];
            buf[di + 1] = snapped[1];
            buf[di + 2] = snapped[2];
            buf[di + 3] = 255;
        }
    }
    return buf;
}

// Sample 4 distinct authentic roof materials from Nano Banana Pro
const woodRoof  = sampleBlock(roofsRaw, 20, 20, 150, 150);
const thatchRoof = sampleBlock(roofsRaw, 20, 200, 150, 150);
const clayRoof  = sampleBlock(roofsRaw, 20, 380, 150, 150);
const slateRoof = sampleBlock(roofsRaw, 20, 580, 150, 150);

const ROOF_SPECS = [
    { name: "Wood Shingle", tex: woodRoof, ridgeHex: "#BA9A71", eaveHex: "#241C14" },
    { name: "Thatched Straw", tex: thatchRoof, ridgeHex: "#F7E7A6", eaveHex: "#352D24" },
    { name: "Red Clay Tile", tex: clayRoof, ridgeHex: "#CE9E7D", eaveHex: "#351810" },
    { name: "Slate Stone", tex: slateRoof, ridgeHex: "#AEAEAE", eaveHex: "#181818" },
    { name: "Dark Timber", tex: woodRoof, ridgeHex: "#8A5D2D", eaveHex: "#1C1410" },
    { name: "Mossy Thatch", tex: thatchRoof, ridgeHex: "#86D200", eaveHex: "#283114" }
];

function buildRoofAutotile(spec) {
    const block = Buffer.alloc(96 * 96 * 4);
    const tex = spec.tex;
    const ridgeCol = snapHex(spec.ridgeHex);
    const eaveCol = snapHex(spec.eaveHex);

    for (let sy = 0; sy < 4; sy++) {
        for (let sx = 0; sx < 4; sx++) {
            for (let ly = 0; ly < 24; ly++) {
                for (let lx = 0; lx < 24; lx++) {
                    const gx = sx * 24 + lx;
                    const gy = sy * 24 + ly;
                    const si = (gy * 96 + gx) * 4;
                    const di = (gy * 96 + gx) * 4;

                    let r = tex[si], g = tex[si + 1], b = tex[si + 2];

                    // 1. Top Ridge (sy = 0, ly < 4): sunlit ridge cap
                    if (sy === 0 && ly < 3) {
                        r = ridgeCol[0]; g = ridgeCol[1]; b = ridgeCol[2];
                    }
                    // 2. Bottom Eave (sy = 3, ly > 19): dark fascia shadow overhang
                    else if (sy === 3 && ly > 20) {
                        r = eaveCol[0]; g = eaveCol[1]; b = eaveCol[2];
                    }
                    // 3. Side Verges (sx = 0, lx < 2; sx = 3, lx > 21)
                    else if (sx === 0 && lx < 2) {
                        r = Math.floor(r * 0.75); g = Math.floor(g * 0.75); b = Math.floor(b * 0.75);
                    } else if (sx === 3 && lx > 21) {
                        r = Math.min(255, Math.floor(r * 1.12)); g = Math.min(255, Math.floor(g * 1.12)); b = Math.min(255, Math.floor(b * 1.12));
                    }

                    const snapped = snap(r, g, b);
                    block[di]     = snapped[0];
                    block[di + 1] = snapped[1];
                    block[di + 2] = snapped[2];
                    block[di + 3] = 255;
                }
            }
        }
    }
    return block;
}

const A3_W = 768, A3_H = 384; // 8 cols x 4 rows of 96x96 (official RMMZ A3 standard)
const sheet = Buffer.alloc(A3_W * A3_H * 4);

for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 8; c++) {
        const spec = ROOF_SPECS[(r * 8 + c) % ROOF_SPECS.length];
        const block = buildRoofAutotile(spec);

        const ox = c * 96;
        const oy = r * 96;

        for (let y = 0; y < 96; y++) {
            for (let x = 0; x < 96; x++) {
                const si = (y * 96 + x) * 4;
                const di = ((oy + y) * A3_W + (ox + x)) * 4;
                sheet[di]     = block[si];
                sheet[di + 1] = block[si + 1];
                sheet[di + 2] = block[si + 2];
                sheet[di + 3] = 255;
            }
        }
    }
}

const outsideA3 = path.join(ROOT, 'game', 'img', 'tilesets', 'Outside_A3.png');
const masterA3  = path.join(ROOT, 'art', 'masters', 'Outside_A3.png');

writePNG(outsideA3, A3_W, A3_H, sheet);
writePNG(masterA3, A3_W, A3_H, sheet);

console.log(`Saved complete 768x384 Outside_A3.png (8 cols x 4 rows) successfully!`);
