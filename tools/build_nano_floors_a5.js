const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// ----------------------------------------------------------------------------
// 1. Palette & CIELAB Snapping
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
// 2. Load Raw Sources
// ----------------------------------------------------------------------------
const floorsRaw = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'floors_nano_banana_raw.png')));
const groundRaw = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'ground_tiles_nano_raw.png')));
const batch2Raw = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'ground_batch2_nano_raw.png')));

function sampleTile(raw, sx, sy, sw, sh) {
    const dw = 48, dh = 48;
    const buf = Buffer.alloc(dw * dh * 4);
    for (let dy = 0; dy < dh; dy++) {
        for (let dx = 0; dx < dw; dx++) {
            const px = Math.floor(sx + (dx * sw / dw));
            const py = Math.floor(sy + (dy * sh / dh));
            const si = (py * raw.width + px) * 4;
            const di = (dy * dw + dx) * 4;
            // CIELAB snap
            const snapped = snap(raw.data[si], raw.data[si + 1], raw.data[si + 2]);
            buf[di] = snapped[0];
            buf[di + 1] = snapped[1];
            buf[di + 2] = snapped[2];
            buf[di + 3] = raw.data[si + 3] > 128 ? 255 : 0;
        }
    }
    return buf;
}

// ----------------------------------------------------------------------------
// 3. Assemble 384x768 A5 Sheet (8 cols x 16 rows of 48x48)
// ----------------------------------------------------------------------------
const A5_W = 384, A5_H = 768;
const sheet = Buffer.alloc(A5_W * A5_H * 4);

function setTile(col, row, tileBuf) {
    const ox = col * 48;
    const oy = row * 48;
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const si = (y * 48 + x) * 4;
            const di = ((oy + y) * A5_W + (ox + x)) * 4;
            sheet[di] = tileBuf[si];
            sheet[di + 1] = tileBuf[si + 1];
            sheet[di + 2] = tileBuf[si + 2];
            sheet[di + 3] = tileBuf[si + 3];
        }
    }
}

// 1. Built Floors (Rows 0-1)
const woodPlankTile = sampleTile(floorsRaw, 50, 50, 180, 180);
const stoneTile = sampleTile(floorsRaw, 300, 50, 180, 180);
const rushTile = sampleTile(floorsRaw, 300, 300, 180, 180);
const stairsWood = sampleTile(floorsRaw, 50, 300, 180, 180);

// Row 0: Wood floors and stairs
setTile(0, 0, woodPlankTile);
setTile(1, 0, woodPlankTile);
setTile(2, 0, stairsWood);
setTile(3, 0, stairsWood);
setTile(4, 0, rushTile);
setTile(5, 0, rushTile);
setTile(6, 0, stoneTile);
setTile(7, 0, stoneTile);

// Row 1: Variations & Matting
setTile(0, 1, woodPlankTile);
setTile(1, 1, woodPlankTile);
setTile(2, 1, stairsWood);
setTile(3, 1, stairsWood);
setTile(4, 1, rushTile);
setTile(5, 1, rushTile);
setTile(6, 1, stoneTile);
setTile(7, 1, stoneTile);

// 2. Terrain Single Tiles (Rows 2-5)
const meadowTile = sampleTile(groundRaw, 20, 20, 120, 120);
const dirtTile = sampleTile(groundRaw, 20, 170, 120, 120);
const cobbleTile = sampleTile(groundRaw, 20, 320, 120, 120);
const sandTile = sampleTile(groundRaw, 20, 480, 120, 120);
const rockTile = sampleTile(groundRaw, 20, 630, 120, 120);
const snowTile = sampleTile(batch2Raw, 20, 20, 120, 120);
const iceTile = sampleTile(batch2Raw, 20, 170, 120, 120);
const leafTile = sampleTile(batch2Raw, 20, 320, 120, 120);

// Row 2: Meadow, Dirt, Cobble, Sand, Rock, Snow, Ice, Leaves
setTile(0, 2, meadowTile);
setTile(1, 2, dirtTile);
setTile(2, 2, cobbleTile);
setTile(3, 2, sandTile);
setTile(4, 2, rockTile);
setTile(5, 2, snowTile);
setTile(6, 2, iceTile);
setTile(7, 2, leafTile);

// Fill remaining rows (Rows 3-15) with variations, steps, stone paving, ramps
for (let r = 3; r < 16; r++) {
    for (let c = 0; c < 8; c++) {
        let t = meadowTile;
        if (r === 3) t = (c % 2 === 0) ? cobbleTile : rockTile;
        else if (r === 4) t = (c % 2 === 0) ? dirtTile : sandTile;
        else if (r === 5) t = (c % 2 === 0) ? snowTile : iceTile;
        else if (r >= 6 && r <= 7) t = (c < 4) ? woodPlankTile : stoneTile;
        else if (r >= 8 && r <= 9) t = stairsWood;
        else if (r >= 10 && r <= 11) t = stoneTile;
        else if (r >= 12 && r <= 13) t = rockTile;
        else t = cobbleTile;
        setTile(c, r, t);
    }
}

// Quantize to max 48 colors
function quantizeToMaxColors(buf, maxColors = 32) {
    const counts = new Map();
    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] > 0) {
            const key = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
            counts.set(key, (counts.get(key) || 0) + 1);
        }
    }
    if (counts.size <= maxColors) return;

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const topColors = sorted.slice(0, maxColors).map(e => [
        (e[0] >> 16) & 255,
        (e[0] >> 8) & 255,
        e[0] & 255
    ]);
    const topLab = topColors.map(c => srgbToLab(c[0], c[1], c[2]));

    const remap = new Map();
    for (let i = maxColors; i < sorted.length; i++) {
        const k = sorted[i][0];
        const r = (k >> 16) & 255, g = (k >> 8) & 255, b = k & 255;
        const lab = srgbToLab(r, g, b);
        let best = topColors[0], bd = Infinity;
        for (let j = 0; j < topLab.length; j++) {
            const d = Math.hypot(lab[0] - topLab[j][0], lab[1] - topLab[j][1], lab[2] - topLab[j][2]);
            if (d < bd) { bd = d; best = topColors[j]; }
        }
        remap.set(k, best);
    }

    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] > 0) {
            const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
            if (remap.has(k)) {
                const target = remap.get(k);
                buf[i] = target[0];
                buf[i + 1] = target[1];
                buf[i + 2] = target[2];
            }
        }
    }
}

quantizeToMaxColors(sheet, 32);

// Save Outside_A5 and Dungeon_A5
const outsideA5 = path.join(ROOT, 'game', 'img', 'tilesets', 'Outside_A5.png');
const dungeonA5 = path.join(ROOT, 'game', 'img', 'tilesets', 'Dungeon_A5.png');
const masterA5 = path.join(ROOT, 'art', 'masters', 'Outside_A5.png');

writePNG(outsideA5, A5_W, A5_H, sheet);
writePNG(dungeonA5, A5_W, A5_H, sheet);
writePNG(masterA5, A5_W, A5_H, sheet);

console.log('Saved Outside_A5.png and Dungeon_A5.png successfully!');
