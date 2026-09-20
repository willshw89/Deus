'use strict';

const fs = require('fs');
const path = require('path');
const { readPNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');
const RAW_DIR = path.join(ROOT, 'art', 'raw');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');

// ----------------------------------------------------------------------------
// Palette & Quantization
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
        colors: unique,
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

function isMagenta(r, g, b, a) {
    if (a < 64) return true;
    return (r > 150 && b > 150 && g < 115) || (r > 120 && b > 120 && g < 80 && Math.abs(r - b) < 50);
}

function quantizeTo32(buf) {
    const counts = new Map();
    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 0) continue;
        const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
        counts.set(k, (counts.get(k) || 0) + 1);
    }
    if (counts.size <= 32) return;

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const topKeys = sorted.slice(0, 31).map(e => e[0]);
    const topRgb = topKeys.map(k => [(k >> 16) & 255, (k >> 8) & 255, k & 255]);
    const topLab = topRgb.map(c => srgbToLab(...c));

    const map = new Map();
    for (let i = 31; i < sorted.length; i++) {
        const k = sorted[i][0];
        const rgb = [(k >> 16) & 255, (k >> 8) & 255, k & 255];
        const lab = srgbToLab(...rgb);
        let best = topRgb[0], bestDist = Infinity;
        for (let j = 0; j < topLab.length; j++) {
            const d = labDist(lab, topLab[j]);
            if (d < bestDist) { bestDist = d; best = topRgb[j]; }
        }
        map.set(k, best);
    }

    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 0) continue;
        const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
        if (map.has(k)) {
            const rgb = map.get(k);
            buf[i] = rgb[0];
            buf[i + 1] = rgb[1];
            buf[i + 2] = rgb[2];
        }
    }
}

// Crops an area, removes magenta background, and scales into target 48x48 cell anchored at baseline
function extractAndScale(srcImg, bbox, targetW, targetH, baselineY = 47) {
    const { data, width: srcW } = srcImg;
    const { minX, minY, maxX, maxY } = bbox;
    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;

    // First, create a tight cropped grid without magenta
    const cropGrid = Array.from({ length: cropH }, () => Array(cropW).fill(null));
    for (let y = 0; y < cropH; y++) {
        for (let x = 0; x < cropW; x++) {
            const sx = minX + x;
            const sy = minY + y;
            const idx = (sy * srcW + sx) * 4;
            const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
            if (!isMagenta(r, g, b, a)) {
                cropGrid[y][x] = [r, g, b];
            }
        }
    }

    // Now scale down to targetW x targetH using nearest/area sampling
    const scaledGrid = Array.from({ length: targetH }, () => Array(targetW).fill(null));
    for (let dy = 0; dy < targetH; dy++) {
        for (let dx = 0; dx < targetW; dx++) {
            const srcY = Math.min(cropH - 1, Math.floor((dy / targetH) * cropH));
            const srcX = Math.min(cropW - 1, Math.floor((dx / targetW) * cropW));
            const c = cropGrid[srcY][srcX];
            if (c) {
                scaledGrid[dy][dx] = pal.snap(c[0], c[1], c[2]);
            }
        }
    }

    // Embed into 48x48 cell anchored at baselineY (usually 47, bottom of tile)
    const cellBuf = Buffer.alloc(48 * 48 * 4);
    const startX = Math.floor((48 - targetW) / 2);
    const startY = Math.max(0, baselineY - targetH + 1);

    for (let dy = 0; dy < targetH; dy++) {
        for (let dx = 0; dx < targetW; dx++) {
            const c = scaledGrid[dy][dx];
            if (!c) continue;
            const outX = startX + dx;
            const outY = startY + dy;
            if (outX >= 0 && outX < 48 && outY >= 0 && outY < 48) {
                const o = (outY * 48 + outX) * 4;
                cellBuf[o] = c[0];
                cellBuf[o + 1] = c[1];
                cellBuf[o + 2] = c[2];
                cellBuf[o + 3] = 255;
            }
        }
    }
    return cellBuf;
}

// Assemble 3-frame or single-frame into 144x192 RMMZ sheet
function make144x192(frames) {
    const W = 144, H = 192;
    const buf = Buffer.alloc(W * H * 4);
    const count = frames.length;

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
            const f = count === 1 ? frames[0] : frames[col % count];
            const startX = col * 48;
            const startY = row * 48;
            for (let py = 0; py < 48; py++) {
                for (let px = 0; px < 48; px++) {
                    const srcIdx = (py * 48 + px) * 4;
                    const dstIdx = ((startY + py) * W + (startX + px)) * 4;
                    buf[dstIdx] = f[srcIdx];
                    buf[dstIdx + 1] = f[srcIdx + 1];
                    buf[dstIdx + 2] = f[srcIdx + 2];
                    buf[dstIdx + 3] = f[srcIdx + 3];
                }
            }
        }
    }
    quantizeTo32(buf);
    return buf;
}

function writeCharsetAndSidecar(name, buf, animType = 'stand') {
    const pngPath = path.join(CHAR_DIR, `!$UF_${name}.png`);
    const jsonPath = path.join(CHAR_DIR, `!$UF_${name}.json`);

    writePNG(pngPath, 144, 192, buf);

    const sidecar = {
        sheet: `!$UF_${name}`,
        cellWidth: 48,
        cellHeight: 48,
        type: 'world_object',
        animations: animType === 'lit' ? {
            stand: [0, 1, 2],
            walk: [0, 1, 2],
            frameMs: 130
        } : {
            stand: [0],
            frameMs: 200
        }
    };
    fs.writeFileSync(jsonPath, JSON.stringify(sidecar, null, 2));
    console.log(`Saved: !$UF_${name}.png & .json (144x192)`);
}

function main() {
    console.log('=== Compiling Domestic Furniture, Kitchen, and Shop Character Sets ===');

    const propsImg = readPNG(path.join(RAW_DIR, 'props_domestic_kitchen_shops_nano_pro.png'));
    const hearthAnimImg = readPNG(path.join(RAW_DIR, 'kitchen_hearth_anim_nano_pro.png'));

    // 1. Bed_Wood (Wooden Bed)
    const bedFrame = extractAndScale(propsImg, { minX: 89, minY: 6, maxX: 371, maxY: 248 }, 44, 40, 47);
    writeCharsetAndSidecar('Bed_Wood', make144x192([bedFrame]));

    // 2. Chest_Wood (Domestic Storage Chest)
    const chestFrame = extractAndScale(propsImg, { minX: 563, minY: 6, maxX: 827, maxY: 250 }, 38, 32, 47);
    writeCharsetAndSidecar('Chest_Wood', make144x192([chestFrame]));

    // 3. Dining_Table (Timber Dining Table)
    const tableFrame = extractAndScale(propsImg, { minX: 998, minY: 5, maxX: 1328, maxY: 250 }, 44, 34, 47);
    writeCharsetAndSidecar('Dining_Table', make144x192([tableFrame]));

    // 4. Dining_Bench (Wooden Dining Bench)
    const benchFrame = extractAndScale(propsImg, { minX: 50, minY: 261, maxX: 415, maxY: 506 }, 44, 28, 47);
    writeCharsetAndSidecar('Dining_Bench', make144x192([benchFrame]));

    // 5. Kitchen_Counter (Food Prep Counter)
    const counterFrame = extractAndScale(propsImg, { minX: 475, minY: 263, maxX: 738, maxY: 506 }, 40, 36, 47);
    writeCharsetAndSidecar('Kitchen_Counter', make144x192([counterFrame]));

    // 6. Kitchen_Pantry (Food Larder / Pantry Shelf)
    const pantryFrame = extractAndScale(propsImg, { minX: 1015, minY: 261, maxX: 1321, maxY: 506 }, 40, 44, 47);
    writeCharsetAndSidecar('Kitchen_Pantry', make144x192([pantryFrame]));

    // 7. Kitchen_Hearth (Stone Cooking Hearth - 3 Animated Frames)
    const hFrame0 = extractAndScale(hearthAnimImg, { minX: 5, minY: 158, maxX: 463, maxY: 627 }, 42, 44, 47);
    const hFrame1 = extractAndScale(hearthAnimImg, { minX: 475, minY: 158, maxX: 932, maxY: 627 }, 42, 44, 47);
    const hFrame2 = extractAndScale(hearthAnimImg, { minX: 944, minY: 113, maxX: 1401, maxY: 627 }, 42, 44, 47);
    writeCharsetAndSidecar('Kitchen_Hearth', make144x192([hFrame0, hFrame1, hFrame2]), 'lit');

    // 8. Shop_Counter (Shop / Merchant Counter)
    const shopFrame = extractAndScale(propsImg, { minX: 475, minY: 518, maxX: 758, maxY: 762 }, 44, 36, 47);
    writeCharsetAndSidecar('Shop_Counter', make144x192([shopFrame]));

    // 9. Apothecary_Bench (Apothecary / Herbalist Station)
    const apothFrame = extractAndScale(propsImg, { minX: 950, minY: 518, maxX: 1214, maxY: 762 }, 42, 38, 47);
    writeCharsetAndSidecar('Apothecary_Bench', make144x192([apothFrame]));

    console.log('=== All 9 Character Sets Compiled Successfully ===');
}

main();
