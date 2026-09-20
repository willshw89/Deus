'use strict';

/**
 * tools/compile_doors_nano_pro.js
 *
 * Compiles authentic 16-bit Google Nano Banana Pro fantasy doors:
 * - Wood Door  (! $UF_Door_Wood.png & .json)
 * - Stone Door (! $UF_Door_Stone.png & .json)
 * - Iron Door  (! $UF_Door_Iron.png & .json)
 *
 * 3 animation columns (Col 0: Closed, Col 1: Ajar, Col 2: Open) x 4 rows (S, W, E, N).
 * Sized 144x192 px, 48x48 per frame, grounded at baseline y = 47.
 * Snapped strictly to art/palette/uf.hex (<= 31 colors, 100% binary transparency).
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const RAW_PATH = path.join(ROOT, 'art', 'raw', 'doors_fantasy_nano_pro.png');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

fs.mkdirSync(CHAR_DIR, { recursive: true });
fs.mkdirSync(REVIEW_DIR, { recursive: true });

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
    const seen = new Set();
    for (const line of text.split(/\r?\n/)) {
        const rgb = parseHex(line);
        if (!rgb) continue;
        const k = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
        if (!seen.has(k)) {
            seen.add(k);
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
const C_DARK_OUTLINE = pal.snap(20, 16, 14);

function isMagenta(r, g, b) {
    if (r > 150 && g < 90 && b > 150) return true;
    if (r > 70 && b > 60 && g < 55 && Math.abs(r - b) < 40) return true;
    if (r > 100 && b > 100 && g < 70) return true;
    if (r > 15 && b > 15 && g < 12 && Math.abs(r - b) < 15) return true;
    return false;
}

function applyDarkOutline(buf, w, h) {
    const isOpaque = (x, y) => (x >= 0 && x < w && y >= 0 && y < h && buf[(y * w + x) * 4 + 3] > 0);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            if (buf[idx + 3] === 0) continue;
            let border = false;
            for (let dy = -1; dy <= 1 && !border; dy++) {
                for (let dx = -1; dx <= 1 && !border; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    if (!isOpaque(x + dx, y + dy)) border = true;
                }
            }
            if (border) {
                buf[idx]     = C_DARK_OUTLINE[0];
                buf[idx + 1] = C_DARK_OUTLINE[1];
                buf[idx + 2] = C_DARK_OUTLINE[2];
            }
        }
    }
}

function quantizeSheet(buf, w, h, maxColors = 31) {
    const counts = new Map();
    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 0) continue;
        const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
        counts.set(k, (counts.get(k) || 0) + 1);
    }
    if (counts.size <= maxColors) return;

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const keptKeys = sorted.slice(0, maxColors).map(e => e[0]);
    const keptRgb = keptKeys.map(k => [(k >> 16) & 255, (k >> 8) & 255, k & 255]);
    const keptLab = keptRgb.map(c => srgbToLab(...c));

    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 0) continue;
        const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
        if (keptKeys.includes(k)) continue;

        const curLab = srgbToLab(buf[i], buf[i + 1], buf[i + 2]);
        let best = keptRgb[0], bd = Infinity;
        for (let j = 0; j < keptLab.length; j++) {
            const d = labDist(curLab, keptLab[j]);
            if (d < bd) { bd = d; best = keptRgb[j]; }
        }
        buf[i]     = best[0];
        buf[i + 1] = best[1];
        buf[i + 2] = best[2];
    }
}

function extractDoorFrame(raw, bbox, targetH = 43) {
    const out = Buffer.alloc(48 * 48 * 4);
    const rawH = bbox.y1 - bbox.y0 + 1;
    const rawW = bbox.x1 - bbox.x0 + 1;
    const scale = targetH / rawH;

    const rawFootY = bbox.y1;
    const rawCenterX = (bbox.x0 + bbox.x1) / 2;

    for (let outY = 0; outY < 48; outY++) {
        const dyFromBase = 47 - outY;
        const rawY0 = Math.round(rawFootY - (dyFromBase + 1) / scale);
        const rawY1 = Math.round(rawFootY - dyFromBase / scale);

        if (rawY1 < bbox.y0 || rawY0 > bbox.y1 || rawY1 < 0 || rawY0 >= raw.height) continue;

        for (let outX = 0; outX < 48; outX++) {
            const dxFromCenter = outX - 24;
            const rawX0 = Math.round(rawCenterX + dxFromCenter / scale);
            const rawX1 = Math.round(rawCenterX + (dxFromCenter + 1) / scale);

            if (rawX1 < bbox.x0 || rawX0 > bbox.x1 || rawX1 < 0 || rawX0 >= raw.width) continue;

            let sumR = 0, sumG = 0, sumB = 0, count = 0;
            for (let ry = Math.max(bbox.y0, rawY0); ry <= Math.min(bbox.y1, rawY1); ry++) {
                for (let rx = Math.max(bbox.x0, rawX0); rx <= Math.min(bbox.x1, rawX1); rx++) {
                    const idx = (ry * raw.width + rx) * 4;
                    const r = raw.data[idx], g = raw.data[idx + 1], b = raw.data[idx + 2];
                    if (!isMagenta(r, g, b)) {
                        sumR += r; sumG += g; sumB += b;
                        count++;
                    }
                }
            }

            if (count > 0) {
                const sn = pal.snap(Math.round(sumR / count), Math.round(sumG / count), Math.round(sumB / count));
                const dIdx = (outY * 48 + outX) * 4;
                out[dIdx]     = sn[0];
                out[dIdx + 1] = sn[1];
                out[dIdx + 2] = sn[2];
                out[dIdx + 3] = 255;
            }
        }
    }

    applyDarkOutline(out, 48, 48);
    return out;
}

function assembleDoorSheet(closedFrame, ajarFrame, openFrame) {
    const sheet = Buffer.alloc(144 * 192 * 4);
    const cols = [closedFrame, ajarFrame, openFrame];

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
            const frame = cols[col];
            for (let py = 0; py < 48; py++) {
                for (let px = 0; px < 48; px++) {
                    const sIdx = (py * 48 + px) * 4;
                    const dIdx = (((row * 48) + py) * 144 + ((col * 48) + px)) * 4;
                    sheet[dIdx]     = frame[sIdx];
                    sheet[dIdx + 1] = frame[sIdx + 1];
                    sheet[dIdx + 2] = frame[sIdx + 2];
                    sheet[dIdx + 3] = frame[sIdx + 3];
                }
            }
        }
    }

    quantizeSheet(sheet, 144, 192, 31);
    return sheet;
}

function saveDoorAsset(sheet, id, name, material) {
    const pngPath = path.join(CHAR_DIR, `!$UF_${name}.png`);
    const jsonPath = path.join(CHAR_DIR, `!$UF_${name}.json`);

    writePNG(pngPath, 144, 192, sheet);

    const sidecar = {
        id: id,
        name: `${material.charAt(0).toUpperCase() + material.slice(1)} door`,
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: {
            closed: [0],
            opening: [1],
            open: [2]
        },
        door: {
            material: material,
            closedPattern: 0,
            ajarPattern: 1,
            openPattern: 2
        },
        generator: "Google Nano Banana Pro (gemini-3-pro-image)",
        standard: "Serious Chibi 16-bit RPG (VISION V116)"
    };

    fs.writeFileSync(jsonPath, JSON.stringify(sidecar, null, 2));
    console.log(`Saved: !$UF_${name}.png & .json`);
}

async function main() {
    console.log('=== Compiling Doors from Google Nano Banana Pro raw generation ===');
    const raw = decodePNG(fs.readFileSync(RAW_PATH));

    // Bounding boxes extracted from inspection:
    // Row 0 - Wood:
    // Door 0: Closed (with iron strap hinges)
    // Door 1: Ajar (swung inward)
    // Door 3: Open doorway (clean opening with dark interior)
    const woodBBoxes = [
        { x0: 35, x1: 240, y0: 0, y1: 224 },
        { x0: 317, x1: 524, y0: 0, y1: 247 },
        { x0: 885, x1: 1088, y0: 0, y1: 224 }
    ];

    // Row 1 - Stone:
    // Door 0: Closed (slab with runes)
    // Door 1: Ajar (slab pivoted open)
    // Door 4: Open doorway (open dark archway)
    const stoneBBoxes = [
        { x0: 4, x1: 272, y0: 256, y1: 508 },
        { x0: 285, x1: 556, y0: 256, y1: 511 },
        { x0: 1135, x1: 1404, y0: 256, y1: 508 }
    ];

    // Row 2 - Iron:
    // Door 0: Closed (riveted iron plate with latch)
    // Door 1: Ajar (swung open inward)
    // Door 3: Swung wide open against jamb
    const ironBBoxes = [
        { x0: 23, x1: 251, y0: 518, y1: 752 },
        { x0: 305, x1: 535, y0: 518, y1: 767 },
        { x0: 875, x1: 1105, y0: 518, y1: 767 }
    ];

    console.log('Processing Wood Door...');
    const woodFrames = woodBBoxes.map(b => extractDoorFrame(raw, b, 42));
    const woodSheet = assembleDoorSheet(woodFrames[0], woodFrames[1], woodFrames[2]);
    saveDoorAsset(woodSheet, 'door_wood', 'Door_Wood', 'wood');

    console.log('Processing Stone Door...');
    const stoneFrames = stoneBBoxes.map(b => extractDoorFrame(raw, b, 42));
    const stoneSheet = assembleDoorSheet(stoneFrames[0], stoneFrames[1], stoneFrames[2]);
    saveDoorAsset(stoneSheet, 'door_stone', 'Door_Stone', 'stone');

    console.log('Processing Iron Door...');
    const ironFrames = ironBBoxes.map(b => extractDoorFrame(raw, b, 42));
    const ironSheet = assembleDoorSheet(ironFrames[0], ironFrames[1], ironFrames[2]);
    saveDoorAsset(ironSheet, 'door_iron', 'Door_Iron', 'iron');

    // Create review montage: 3 doors x 3 states = 9 tiles (3x3 grid = 144x144, 2x zoom = 288x288)
    const montage1x = Buffer.alloc(144 * 144 * 4);
    const sheets = [woodSheet, stoneSheet, ironSheet];
    for (let d = 0; d < 3; d++) {
        const s = sheets[d];
        for (let c = 0; c < 3; c++) {
            for (let py = 0; py < 48; py++) {
                for (let px = 0; px < 48; px++) {
                    const sIdx = (py * 144 + (c * 48 + px)) * 4;
                    const dIdx = (((d * 48) + py) * 144 + ((c * 48) + px)) * 4;
                    montage1x[dIdx]     = s[sIdx];
                    montage1x[dIdx + 1] = s[sIdx + 1];
                    montage1x[dIdx + 2] = s[sIdx + 2];
                    montage1x[dIdx + 3] = s[sIdx + 3];
                }
            }
        }
    }

    // 2x zoom on dark grey background
    const montage2x = Buffer.alloc(288 * 288 * 4);
    for (let i = 0; i < montage2x.length; i += 4) {
        montage2x[i] = 34; montage2x[i+1] = 38; montage2x[i+2] = 42; montage2x[i+3] = 255;
    }
    for (let y = 0; y < 144; y++) {
        for (let x = 0; x < 144; x++) {
            const sIdx = (y * 144 + x) * 4;
            const a = montage1x[sIdx + 3];
            if (a > 0) {
                for (let dy = 0; dy < 2; dy++) {
                    for (let dx = 0; dx < 2; dx++) {
                        const dIdx = (((y * 2 + dy) * 288) + (x * 2 + dx)) * 4;
                        montage2x[dIdx]     = montage1x[sIdx];
                        montage2x[dIdx + 1] = montage1x[sIdx + 1];
                        montage2x[dIdx + 2] = montage1x[sIdx + 2];
                        montage2x[dIdx + 3] = 255;
                    }
                }
            }
        }
    }

    const montagePath = path.join(REVIEW_DIR, 'doors_fantasy_montage.png');
    writePNG(montagePath, 288, 288, montage2x);
    console.log(`Saved review montage: ${montagePath}`);
    console.log('=== Door Compilation Complete ===');
}

main().catch(err => {
    console.error('Compilation failed:', err);
    process.exit(1);
});
