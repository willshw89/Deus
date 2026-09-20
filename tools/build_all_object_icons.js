const fs = require('fs');
const path = require('path');
const { readPNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');
const CATALOG_FILE = path.join(ROOT, 'game', 'data', 'UF_WorldCatalog.json');
const ICONSET_FILE = path.join(ROOT, 'game', 'img', 'system', 'IconSet.png');

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

function labDist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }

function loadPalette() {
    const text = fs.readFileSync(PALETTE_FILE, 'utf8');
    const unique = [];
    const index = new Map();
    for (const line of text.split(/\r?\n/)) {
        const rgb = parseHex(line);
        if (!rgb) continue;
        const k = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
        if (!index.has(k)) {
            index.set(k, unique.length);
            unique.push(rgb);
        }
    }
    const lab = unique.map(c => srgbToLab(...c));
    const cache = new Map();
    return {
        snap(r, g, b) {
            const k = (r << 16) | (g << 8) | b;
            if (cache.has(k)) return cache.get(k);
            const l = srgbToLab(r, g, b);
            let best = unique[0], bd = Infinity;
            for (let i = 0; i < lab.length; i++) {
                const d = labDist(l, lab[i]);
                if (d < bd) { bd = d; best = unique[i]; }
            }
            cache.set(k, best);
            return best;
        }
    };
}

const pal = loadPalette();
const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));

console.log('Compiling Master Object Icons into RMMZ System IconSet.png...');

// Existing IconSet.png (512x640)
// Expand IconSet to 512x768 (16 cols x 24 rows) to comfortably host all 67 object icons on rows 20..24
const origIconSet = readPNG(ICONSET_FILE);
const NEW_ROWS = 25;
const NEW_W = 512;
const NEW_H = NEW_ROWS * 32; // 800
const outBuf = Buffer.alloc(NEW_W * NEW_H * 4);

// Copy existing iconSet with 100% binary alpha & palette snapping
for (let y = 0; y < origIconSet.height; y++) {
    for (let x = 0; x < origIconSet.width; x++) {
        const sIdx = (y * origIconSet.width + x) * 4;
        const dIdx = (y * NEW_W + x) * 4;
        if (origIconSet.data[sIdx + 3] > 128) {
            const snapped = pal.snap(origIconSet.data[sIdx], origIconSet.data[sIdx + 1], origIconSet.data[sIdx + 2]);
            outBuf[dIdx] = snapped[0];
            outBuf[dIdx + 1] = snapped[1];
            outBuf[dIdx + 2] = snapped[2];
            outBuf[dIdx + 3] = 255;
        }
    }
}

// Blit the 67 world object icons starting at row 20 (slot index 320)
let startSlot = 320;
catalog.objects.forEach((obj, idx) => {
    const slot = startSlot + idx;
    const col = slot % 16;
    const row = Math.floor(slot / 16);
    const ox = col * 32;
    const oy = row * 32;

    const iconPath = path.join(ROOT, 'art', 'masters', `${obj.id}_icon.png`);
    if (fs.existsSync(iconPath)) {
        const icon = readPNG(iconPath);
        for (let y = 0; y < 32; y++) {
            for (let x = 0; x < 32; x++) {
                const sIdx = (y * 32 + x) * 4;
                const dIdx = ((oy + y) * NEW_W + (ox + x)) * 4;
                if (icon.data[sIdx + 3] > 128) {
                    outBuf[dIdx] = icon.data[sIdx];
                    outBuf[dIdx + 1] = icon.data[sIdx + 1];
                    outBuf[dIdx + 2] = icon.data[sIdx + 2];
                    outBuf[dIdx + 3] = 255;
                }
            }
        }
    }
});

// Quantize total palette across IconSet
writePNG(ICONSET_FILE, NEW_W, NEW_H, outBuf);
writePNG(path.join(ROOT, 'art', 'masters', 'IconSet.png'), NEW_W, NEW_H, outBuf);
console.log(`Saved updated RMMZ IconSet.png (${NEW_W}x${NEW_H}) with all 67 world object icons!`);
