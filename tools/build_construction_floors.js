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

function isMagentaBg(r, g, b) {
    return (r > 180 && b > 180 && g < 80);
}

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

// ----------------------------------------------------------------------------
// 2. Load Raw Generation
// ----------------------------------------------------------------------------
const floorsRaw = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'floors_nano_banana_raw.png')));

function sampleArea(src, sx, sy, sw, sh, dw, dh) {
    const buf = Buffer.alloc(dw * dh * 4);
    for (let dy = 0; dy < dh; dy++) {
        for (let dx = 0; dx < dw; dx++) {
            const startX = Math.round(sx + (dx * sw / dw));
            const endX = Math.round(sx + ((dx + 1) * sw / dw));
            const startY = Math.round(sy + (dy * sh / dh));
            const endY = Math.round(sy + ((dy + 1) * sh / dh));

            let rSum = 0, gSum = 0, bSum = 0, count = 0;
            for (let py = startY; py < endY; py++) {
                if (py < 0 || py >= src.height) continue;
                for (let px = startX; px < endX; px++) {
                    if (px < 0 || px >= src.width) continue;
                    const si = (py * src.width + px) * 4;
                    const r = src.data[si], g = src.data[si + 1], b = src.data[si + 2];
                    if (!isMagentaBg(r, g, b)) {
                        rSum += r; gSum += g; bSum += b; count++;
                    }
                }
            }
            const di = (dy * dw + dx) * 4;
            if (count > 0) {
                const sn = snap(Math.round(rSum / count), Math.round(gSum / count), Math.round(bSum / count));
                buf[di] = sn[0];
                buf[di + 1] = sn[1];
                buf[di + 2] = sn[2];
                buf[di + 3] = 255;
            } else {
                buf[di] = 0;
                buf[di + 1] = 0;
                buf[di + 2] = 0;
                buf[di + 3] = 255;
            }
        }
    }
    return buf;
}

function quantizeToMaxColors(buf, maxColors = 30) {
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

// ----------------------------------------------------------------------------
// 3. Assemble A2 Autotile Block (96 x 144)
// Top-Left (0..47, 0..47): Showcase / center floor (seamlessly tiled)
// Top-Right (48..95, 0..47): Inner corners (center floor with inner corner notches)
// Bottom 2x2 (0..95, 48..143): 4 quadrants of 2x2 floor with natural outer border
// ----------------------------------------------------------------------------
function buildA2Block(baseTileBuf, borderDark, borderMid) {
    const W = 96, H = 144;
    const block = Buffer.alloc(W * H * 4);

    // 1. Fill entire block with baseTile tiled across (x%48, y%48)
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const bi = ((y % 48) * 48 + (x % 48)) * 4;
            const di = (y * W + x) * 4;
            block[di] = baseTileBuf[bi];
            block[di + 1] = baseTileBuf[bi + 1];
            block[di + 2] = baseTileBuf[bi + 2];
            block[di + 3] = 255;
        }
    }

    // 2. Top-Right (x=48..95, y=0..47): Inner corner notches
    // At each corner: (48,0), (95,0), (48,47), (95,47)
    // 3-px notch along both axes
    function setPixel(px, py, col) {
        if (px < 0 || px >= W || py < 0 || py >= H) return;
        const idx = (py * W + px) * 4;
        block[idx] = col[0];
        block[idx + 1] = col[1];
        block[idx + 2] = col[2];
        block[idx + 3] = 255;
    }

    // Four inner corner notches on the top-right tile
    const corners = [
        [48, 0, 1, 1],
        [95, 0, -1, 1],
        [48, 47, 1, -1],
        [95, 47, -1, -1]
    ];
    for (const [cx, cy, dx, dy] of corners) {
        for (let i = 0; i < 4; i++) {
            setPixel(cx + i * dx, cy, borderDark);
            setPixel(cx, cy + i * dy, borderDark);
            if (i > 0 && i < 3) {
                setPixel(cx + i * dx, cy + dy, borderMid);
                setPixel(cx + dx, cy + i * dy, borderMid);
            }
        }
    }

    // 3. Bottom 2x2 (x=0..95, y=48..143): Outer border on the outer perimeter only
    // Left edge (x=0,1), Right edge (x=94,95), Top edge (y=48,49), Bottom edge (y=142,143)
    for (let y = 48; y < 144; y++) {
        // Outer left
        setPixel(0, y, borderDark);
        setPixel(1, y, borderMid);
        // Outer right
        setPixel(95, y, borderDark);
        setPixel(94, y, borderMid);
    }
    for (let x = 0; x < 96; x++) {
        // Outer top
        setPixel(x, 48, borderDark);
        setPixel(x, 49, borderMid);
        // Outer bottom
        setPixel(x, 143, borderDark);
        setPixel(x, 142, borderMid);
    }

    // Quantize to max 30 colors
    quantizeToMaxColors(block, 30);

    const colors = new Set();
    for (let i = 0; i < block.length; i += 4) {
        colors.add((block[i] << 16) | (block[i + 1] << 8) | block[i + 2]);
    }

    return { block, colorCount: colors.size };
}

// ----------------------------------------------------------------------------
// 4. Sample and Build Each Floor Material
// ----------------------------------------------------------------------------

// A. Warm Wood Plank Floor (`floor_wood`)
// In floors_nano_banana_raw.png: x=35..480, y=35..480
const woodBase = sampleArea(floorsRaw, 35, 35, 445, 445, 48, 48);
// Make woodBase seamless horizontally & vertically
for (let y = 0; y < 48; y++) {
    const leftIdx = (y * 48) * 4;
    const rightIdx = (y * 48 + 47) * 4;
    const avgR = Math.round((woodBase[leftIdx] + woodBase[rightIdx]) / 2);
    const avgG = Math.round((woodBase[leftIdx + 1] + woodBase[rightIdx + 1]) / 2);
    const avgB = Math.round((woodBase[leftIdx + 2] + woodBase[rightIdx + 2]) / 2);
    const sn = snap(avgR, avgG, avgB);
    woodBase[leftIdx] = sn[0]; woodBase[leftIdx + 1] = sn[1]; woodBase[leftIdx + 2] = sn[2];
    woodBase[rightIdx] = sn[0]; woodBase[rightIdx + 1] = sn[1]; woodBase[rightIdx + 2] = sn[2];
}
for (let x = 0; x < 48; x++) {
    const topIdx = x * 4;
    const botIdx = (47 * 48 + x) * 4;
    const avgR = Math.round((woodBase[topIdx] + woodBase[botIdx]) / 2);
    const avgG = Math.round((woodBase[topIdx + 1] + woodBase[botIdx + 1]) / 2);
    const avgB = Math.round((woodBase[topIdx + 2] + woodBase[botIdx + 2]) / 2);
    const sn = snap(avgR, avgG, avgB);
    woodBase[topIdx] = sn[0]; woodBase[topIdx + 1] = sn[1]; woodBase[topIdx + 2] = sn[2];
    woodBase[botIdx] = sn[0]; woodBase[botIdx + 1] = sn[1]; woodBase[botIdx + 2] = sn[2];
}
const woodBlock = buildA2Block(woodBase, snap(45, 28, 8), snap(101, 61, 16));

// B. Fitted Flagstone Floor (`floor_stone`)
// Clean interior box: x=585..805, y=18..238 (0 purple pixels)
const stoneBase = sampleArea(floorsRaw, 585, 18, 220, 220, 48, 48);
for (let y = 0; y < 48; y++) {
    const leftIdx = (y * 48) * 4;
    const rightIdx = (y * 48 + 47) * 4;
    const avgR = Math.round((stoneBase[leftIdx] + stoneBase[rightIdx]) / 2);
    const avgG = Math.round((stoneBase[leftIdx + 1] + stoneBase[rightIdx + 1]) / 2);
    const avgB = Math.round((stoneBase[leftIdx + 2] + stoneBase[rightIdx + 2]) / 2);
    const sn = snap(avgR, avgG, avgB);
    stoneBase[leftIdx] = sn[0]; stoneBase[leftIdx + 1] = sn[1]; stoneBase[leftIdx + 2] = sn[2];
    stoneBase[rightIdx] = sn[0]; stoneBase[rightIdx + 1] = sn[1]; stoneBase[rightIdx + 2] = sn[2];
}
for (let x = 0; x < 48; x++) {
    const topIdx = x * 4;
    const botIdx = (47 * 48 + x) * 4;
    const avgR = Math.round((stoneBase[topIdx] + stoneBase[botIdx]) / 2);
    const avgG = Math.round((stoneBase[topIdx + 1] + stoneBase[botIdx + 1]) / 2);
    const avgB = Math.round((stoneBase[topIdx + 2] + stoneBase[botIdx + 2]) / 2);
    const sn = snap(avgR, avgG, avgB);
    stoneBase[topIdx] = sn[0]; stoneBase[topIdx + 1] = sn[1]; stoneBase[topIdx + 2] = sn[2];
    stoneBase[botIdx] = sn[0]; stoneBase[botIdx + 1] = sn[1]; stoneBase[botIdx + 2] = sn[2];
}
const stoneBlock = buildA2Block(stoneBase, snap(53, 53, 53), snap(109, 109, 109));

// C. Woven Rush Matting Floor (`floor_rushes`)
// In floors_nano_banana_raw.png: x=530..860, y=530..750 (0 purple pixels)
const rushBase = sampleArea(floorsRaw, 530, 530, 330, 220, 48, 48);
for (let y = 0; y < 48; y++) {
    const leftIdx = (y * 48) * 4;
    const rightIdx = (y * 48 + 47) * 4;
    const avgR = Math.round((rushBase[leftIdx] + rushBase[rightIdx]) / 2);
    const avgG = Math.round((rushBase[leftIdx + 1] + rushBase[rightIdx + 1]) / 2);
    const avgB = Math.round((rushBase[leftIdx + 2] + rushBase[rightIdx + 2]) / 2);
    const sn = snap(avgR, avgG, avgB);
    rushBase[leftIdx] = sn[0]; rushBase[leftIdx + 1] = sn[1]; rushBase[leftIdx + 2] = sn[2];
    rushBase[rightIdx] = sn[0]; rushBase[rightIdx + 1] = sn[1]; rushBase[rightIdx + 2] = sn[2];
}
for (let x = 0; x < 48; x++) {
    const topIdx = x * 4;
    const botIdx = (47 * 48 + x) * 4;
    const avgR = Math.round((rushBase[topIdx] + rushBase[botIdx]) / 2);
    const avgG = Math.round((rushBase[topIdx + 1] + rushBase[botIdx + 1]) / 2);
    const avgB = Math.round((rushBase[topIdx + 2] + rushBase[botIdx + 2]) / 2);
    const sn = snap(avgR, avgG, avgB);
    rushBase[topIdx] = sn[0]; rushBase[topIdx + 1] = sn[1]; rushBase[topIdx + 2] = sn[2];
    rushBase[botIdx] = sn[0]; rushBase[botIdx + 1] = sn[1]; rushBase[botIdx + 2] = sn[2];
}
const rushBlock = buildA2Block(rushBase, snap(85, 61, 49), snap(154, 113, 65));

console.log(`Wood Floor A2 Block colors: ${woodBlock.colorCount}`);
console.log(`Stone Floor A2 Block colors: ${stoneBlock.colorCount}`);
console.log(`Rush Floor A2 Block colors: ${rushBlock.colorCount}`);

// Write master A2 blocks
writePNG(path.join(ROOT, 'art', 'masters', 'floor_wood.png'), 96, 144, woodBlock.block);
writePNG(path.join(ROOT, 'art', 'masters', 'floor_stone.png'), 96, 144, stoneBlock.block);
writePNG(path.join(ROOT, 'art', 'masters', 'floor_rushes.png'), 96, 144, rushBlock.block);

// Sidecars
const makeSidecar = (id, kind, tileId) => ({
    id,
    frameWidth: 96,
    frameHeight: 144,
    anchor: null,
    facings: [],
    animations: { stand: [0] },
    layer: "ground",
    kind,
    tileId
});

fs.writeFileSync(path.join(ROOT, 'art', 'masters', 'floor_wood.json'), JSON.stringify(makeSidecar('floor_wood', 23, 3920), null, 2));
fs.writeFileSync(path.join(ROOT, 'art', 'masters', 'floor_stone.json'), JSON.stringify(makeSidecar('floor_stone', 24, 3968), null, 2));
fs.writeFileSync(path.join(ROOT, 'art', 'masters', 'floor_rushes.json'), JSON.stringify(makeSidecar('floor_rushes', 25, 4016), null, 2));

console.log('Successfully written master A2 floor blocks and sidecars!');
