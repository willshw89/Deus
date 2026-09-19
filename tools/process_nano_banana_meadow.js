const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');
const PNG_SRC = 'C:/Users/snewt/.gemini/antigravity/brain/3ffbd16e-0b90-4fbe-9345-ac504edad4c5/meadow_tile_ff6.png';

// CIELAB color conversion functions
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

const decoded = decodePNG(fs.readFileSync(PNG_SRC), 'meadow.png');
const srcW = decoded.width;
const srcH = decoded.height;
console.log(`Source meadow dimensions: ${srcW}x${srcH}`);

// 1. Downsample to 48x48 base tile
const tileW = 48, tileH = 48;
const baseTile = Array.from({ length: tileH }, () => Array(tileW).fill(null));

for (let y = 0; y < tileH; y++) {
    for (let x = 0; x < tileW; x++) {
        const srcX0 = Math.floor(x * (srcW / tileW));
        const srcX1 = Math.floor((x + 1) * (srcW / tileW));
        const srcY0 = Math.floor(y * (srcH / tileH));
        const srcY1 = Math.floor((y + 1) * (srcH / tileH));
        
        let sumR = 0, sumG = 0, sumB = 0, count = 0;
        for (let sy = srcY0; sy < srcY1; sy++) {
            for (let sx = srcX0; sx < srcX1; sx++) {
                const o = (sy * srcW + sx) * 4;
                sumR += decoded.data[o];
                sumG += decoded.data[o + 1];
                sumB += decoded.data[o + 2];
                count++;
            }
        }
        
        const avgR = Math.round(sumR / count);
        const avgG = Math.round(sumG / count);
        const avgB = Math.round(sumB / count);
        baseTile[y][x] = pal.snap(avgR, avgG, avgB);
    }
}

// 2. Seamless seam blending on the 48x48 tile:
// Blend edges (x=0 with x=47, y=0 with y=47)
for (let y = 0; y < tileH; y++) {
    const c0 = baseTile[y][0];
    const c1 = baseTile[y][tileW - 1];
    const avgR = Math.round((c0[0] + c1[0]) / 2);
    const avgG = Math.round((c0[1] + c1[1]) / 2);
    const avgB = Math.round((c0[2] + c1[2]) / 2);
    const sn = pal.snap(avgR, avgG, avgB);
    baseTile[y][0] = sn;
    baseTile[y][tileW - 1] = sn;
}
for (let x = 0; x < tileW; x++) {
    const c0 = baseTile[0][x];
    const c1 = baseTile[tileH - 1][x];
    const avgR = Math.round((c0[0] + c1[0]) / 2);
    const avgG = Math.round((c0[1] + c1[1]) / 2);
    const avgB = Math.round((c0[2] + c1[2]) / 2);
    const sn = pal.snap(avgR, avgG, avgB);
    baseTile[0][x] = sn;
    baseTile[tileH - 1][x] = sn;
}

// 3. Build standard RPG Maker A2 autotile block (96x144 px: 2 columns x 3 rows of 48x48)
// Top-Left (col 0, row 0): center 48x48 tile (seamless)
// Top-Right (col 1, row 0): 48x48 tile with corner bevel notches for outer border
// Rows 1-2 (cols 0-1, rows 1-2): 96x96 autotile quarter-corners
const blockW = 96, blockH = 144;
const block = Array.from({ length: blockH }, () => Array(blockW).fill(null));

// Fill entire 96x144 with seamless tiled baseTile
for (let y = 0; y < blockH; y++) {
    for (let x = 0; x < blockW; x++) {
        block[y][x] = baseTile[y % tileH][x % tileW];
    }
}

// Apply standard A2 autotile edge rings on Top-Right tile (col 48..95, row 0..47)
// Dark outer border ring on the perimeter for natural blending into adjacent biomes
const edgeColor = pal.snap(49, 61, 24); // deep border olive #313D18
for (let y = 0; y < 48; y++) {
    for (let x = 48; x < 96; x++) {
        const lx = x - 48;
        const ly = y;
        // 2-px outer edge ring with 4-px rounded corner notches
        const isOuterRing = (lx < 2 || lx >= 46 || ly < 2 || ly >= 46);
        const isCornerNotch = (
            (lx < 4 && ly < 4) ||
            (lx >= 44 && ly < 4) ||
            (lx < 4 && ly >= 44) ||
            (lx >= 44 && ly >= 44)
        );
        if (isOuterRing || isCornerNotch) {
            block[y][x] = edgeColor;
        }
    }
}

// Ensure <= 32 colors
const usedColors = new Set();
for (let y = 0; y < blockH; y++) {
    for (let x = 0; x < blockW; x++) {
        const c = block[y][x];
        usedColors.add((c[0] << 16) | (c[1] << 8) | c[2]);
    }
}
console.log(`Unique colors in meadow A2 block: ${usedColors.size}/32`);

// Save master 96x144
const masterBuf = Buffer.alloc(blockW * blockH * 4);
for (let y = 0; y < blockH; y++) {
    for (let x = 0; x < blockW; x++) {
        const o = (y * blockW + x) * 4;
        const c = block[y][x];
        masterBuf[o] = c[0];
        masterBuf[o + 1] = c[1];
        masterBuf[o + 2] = c[2];
        masterBuf[o + 3] = 255;
    }
}

const masterPath = path.join(ROOT, 'art', 'masters', 'meadow.png');
writePNG(masterPath, blockW, blockH, masterBuf);
console.log(`Saved master meadow A2 block: ${masterPath}`);

// Sidecar
const sidecar = {
    id: "meadow",
    name: "Temperate Meadow Grass",
    category: "Ground",
    frameWidth: 48,
    frameHeight: 48,
    anchor: null,
    facings: [],
    animations: {},
    layer: "ground",
    slot: 0
};
fs.writeFileSync(path.join(ROOT, 'art', 'masters', 'meadow.json'), JSON.stringify(sidecar, null, 2));

// Save review: 3x3 tiled field at 2x (144x144 at 2x = 288x288 px)
const fieldTiles = 3;
const fieldW = fieldTiles * tileW;
const fieldH = fieldTiles * tileH;
const scale = 2;
const revW = fieldW * scale;
const revH = fieldH * scale;
const revBuf = Buffer.alloc(revW * revH * 4);

for (let y = 0; y < revH; y++) {
    for (let x = 0; x < revW; x++) {
        const srcX = Math.floor(x / scale) % tileW;
        const srcY = Math.floor(y / scale) % tileH;
        const c = baseTile[srcY][srcX];
        const o = (y * revW + x) * 4;
        revBuf[o] = c[0];
        revBuf[o + 1] = c[1];
        revBuf[o + 2] = c[2];
        revBuf[o + 3] = 255;
    }
}

const revPath = path.join(ROOT, 'art', 'review', 'meadow_seamless_field_2x.png');
writePNG(revPath, revW, revH, revBuf);
console.log(`Saved 3x3 seamless field review: ${revPath}`);
