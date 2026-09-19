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
const cache = new Map();

function isBg(r, g, b) {
    return (r > 160 && g < 80 && b > 160) || (r > 200 && b > 200 && g < 50);
}

function snap(r, g, b) {
    if (isBg(r, g, b)) return [0, 0, 0, 0];
    const key = (r << 16) | (g << 8) | b;
    if (cache.has(key)) return cache.get(key);
    const l = srgbToLab(r, g, b);
    let best = palRGB[0], bd = Infinity;
    for (let i = 0; i < palLab.length; i++) {
        const d = Math.hypot(l[0] - palLab[i][0], l[1] - palLab[i][1], l[2] - palLab[i][2]);
        if (d < bd) { bd = d; best = palRGB[i]; }
    }
    cache.set(key, best);
    return best;
}

// ----------------------------------------------------------------------------
// 2. Load Raw Generations
// ----------------------------------------------------------------------------
const woodRaw = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'door_wood_nano_banana_raw.png')));
const stoneRaw = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'door_stone_nano_banana_raw.png')));

function sampleBlock(src, sx, sy, sw, sh, dw, dh, threshold = 0.2) {
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
                    if (!isBg(r, g, b)) {
                        rSum += r; gSum += g; bSum += b; count++;
                    }
                }
            }
            const di = (dy * dw + dx) * 4;
            const total = Math.max(1, (endX - startX) * (endY - startY));
            if (count / total > threshold) {
                const sn = snap(Math.round(rSum / count), Math.round(gSum / count), Math.round(bSum / count));
                buf[di] = sn[0];
                buf[di + 1] = sn[1];
                buf[di + 2] = sn[2];
                buf[di + 3] = 255;
            } else {
                buf[di + 3] = 0;
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
// 3. Assemble 144 x 192 Character Sheets (3 cols x 4 rows of 48x48)
// ----------------------------------------------------------------------------
function buildDoorSheet(frames) {
    const SHEET_W = 144;
    const SHEET_H = 192;
    const sheetBuf = Buffer.alloc(SHEET_W * SHEET_H * 4);

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
            const frameBuf = frames[col];
            const startX = col * 48;
            const startY = row * 48;

            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const srcIdx = (y * 48 + x) * 4;
                    const dstIdx = ((startY + y) * SHEET_W + (startX + x)) * 4;
                    sheetBuf[dstIdx] = frameBuf[srcIdx];
                    sheetBuf[dstIdx + 1] = frameBuf[srcIdx + 1];
                    sheetBuf[dstIdx + 2] = frameBuf[srcIdx + 2];
                    sheetBuf[dstIdx + 3] = frameBuf[srcIdx + 3];
                }
            }
        }
    }

    quantizeToMaxColors(sheetBuf, 30);

    const colors = new Set();
    for (let i = 0; i < sheetBuf.length; i += 4) {
        if (sheetBuf[i + 3] > 0) {
            colors.add((sheetBuf[i] << 16) | (sheetBuf[i + 1] << 8) | sheetBuf[i + 2]);
        }
    }

    return { sheetBuf, colorCount: colors.size };
}

// Sample Wood Door Frames (48x48 each)
// In door_wood_nano_banana_raw.png:
// Closed: x=20..330, y=10..490
// Ajar: x=340..660, y=10..490
// Open: x=675..950, y=10..490
const woodFrames = [
    sampleBlock(woodRaw, 20, 10, 310, 480, 48, 48),
    sampleBlock(woodRaw, 345, 10, 315, 480, 48, 48),
    sampleBlock(woodRaw, 675, 10, 275, 480, 48, 48)
];

// Sample Stone Door Frames (48x48 each)
// In door_stone_nano_banana_raw.png:
// Closed: x=5..330, y=0..495
// Ajar: x=340..660, y=0..495
// Open: x=670..995, y=0..495
const stoneFrames = [
    sampleBlock(stoneRaw, 5, 0, 325, 495, 48, 48),
    sampleBlock(stoneRaw, 340, 0, 320, 495, 48, 48),
    sampleBlock(stoneRaw, 670, 0, 325, 495, 48, 48)
];

const woodSheet = buildDoorSheet(woodFrames);
const stoneSheet = buildDoorSheet(stoneFrames);

console.log(`Wood Door generated. Colors: ${woodSheet.colorCount}`);
console.log(`Stone Door generated. Colors: ${stoneSheet.colorCount}`);

// Write target assets
writePNG(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Door_Wood.png'), 144, 192, woodSheet.sheetBuf);
writePNG(path.join(ROOT, 'art', 'masters', '!$UF_Door_Wood.png'), 144, 192, woodSheet.sheetBuf);

writePNG(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Door_Stone.png'), 144, 192, stoneSheet.sheetBuf);
writePNG(path.join(ROOT, 'art', 'masters', '!$UF_Door_Stone.png'), 144, 192, stoneSheet.sheetBuf);

// Write JSON sidecars
const woodSidecar = {
    id: "door_wood",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S", "W", "E", "N"],
    animations: {
        stand: [0],
        closed: [0],
        ajar: [1],
        open: [2]
    }
};

const stoneSidecar = {
    id: "door_stone",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S", "W", "E", "N"],
    animations: {
        stand: [0],
        closed: [0],
        ajar: [1],
        open: [2]
    }
};

fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Door_Wood.json'), JSON.stringify(woodSidecar, null, 2));
fs.writeFileSync(path.join(ROOT, 'art', 'masters', '!$UF_Door_Wood.json'), JSON.stringify(woodSidecar, null, 2));
fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Door_Stone.json'), JSON.stringify(stoneSidecar, null, 2));
fs.writeFileSync(path.join(ROOT, 'art', 'masters', '!$UF_Door_Stone.json'), JSON.stringify(stoneSidecar, null, 2));

console.log('Successfully generated animated door chipsets with sidecars!');
