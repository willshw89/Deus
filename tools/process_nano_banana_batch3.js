const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

function loadPalette() {
    const text = fs.readFileSync(PALETTE_FILE, 'utf8');
    const colors = [];
    for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('#')) continue;
        const hex = trimmed.substring(1);
        if (hex.length === 6) {
            colors.push([
                parseInt(hex.substring(0, 2), 16),
                parseInt(hex.substring(2, 4), 16),
                parseInt(hex.substring(4, 6), 16)
            ]);
        }
    }
    return colors;
}

const PALETTE = loadPalette();

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

const palLab = PALETTE.map(c => srgbToLab(...c));

function snapToPalette(rgb) {
    const l = srgbToLab(rgb[0], rgb[1], rgb[2]);
    let best = PALETTE[0], bd = Infinity;
    for (let i = 0; i < PALETTE.length; i++) {
        const d = labDist(l, palLab[i]);
        if (d < bd) { bd = d; best = PALETTE[i]; }
    }
    return best;
}

function quantizeBuffer(buf, maxColors) {
    const counts = new Map();
    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 0) continue;
        const key = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
        counts.set(key, (counts.get(key) || 0) + 1);
    }

    while (counts.size > maxColors) {
        let minCount = Infinity, minKey = null;
        for (const [k, c] of counts.entries()) {
            if (c < minCount) {
                minCount = c;
                minKey = k;
            }
        }
        const r1 = (minKey >> 16) & 255, g1 = (minKey >> 8) & 255, b1 = minKey & 255;
        const lab1 = srgbToLab(r1, g1, b1);

        let bestDist = Infinity, bestKey = null;
        for (const [k, _] of counts.entries()) {
            if (k === minKey) continue;
            const r2 = (k >> 16) & 255, g2 = (k >> 8) & 255, b2 = k & 255;
            const lab2 = srgbToLab(r2, g2, b2);
            const dist = labDist(lab1, lab2);
            if (dist < bestDist) {
                bestDist = dist;
                bestKey = k;
            }
        }

        counts.set(bestKey, counts.get(bestKey) + counts.get(minKey));
        counts.delete(minKey);

        const newR = (bestKey >> 16) & 255, newG = (bestKey >> 8) & 255, newB = bestKey & 255;
        for (let i = 0; i < buf.length; i += 4) {
            if (buf[i + 3] === 0) continue;
            const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
            if (k === minKey) {
                buf[i] = newR;
                buf[i + 1] = newG;
                buf[i + 2] = newB;
            }
        }
    }
}

function isMagenta(r, g, b) {
    if (r > 140 && g < 100 && b > 140) return true;
    if (r > 90 && b > 90 && g < 75 && (r - g > 30) && (b - g > 30)) return true;
    if (r > 180 && b > 180 && g < 130) return true;
    return false;
}

// Process 48x48 single objects (from 192x192 raw or 1024x1024 raw)
function processSingleObject48(rawFilename, outId, options = {}) {
    const rawPath = path.join(ROOT, 'art', 'raw', rawFilename);
    if (!fs.existsSync(rawPath)) return;
    const raw = decodePNG(fs.readFileSync(rawPath), rawFilename);

    let minX = raw.width, maxX = 0, minY = raw.height, maxY = 0;
    for (let y = 0; y < raw.height; y++) {
        for (let x = 0; x < raw.width; x++) {
            const idx = (y * raw.width + x) * 4;
            const r = raw.data[idx], g = raw.data[idx + 1], b = raw.data[idx + 2];
            if (!isMagenta(r, g, b)) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    const bw = Math.max(1, maxX - minX + 1);
    const bh = Math.max(1, maxY - minY + 1);

    const targetW = options.targetW || 40;
    const targetH = options.targetH || 38;
    const scale = Math.min((48 - 4) / bw, (48 - 4) / bh);
    const scaledW = Math.floor(bw * scale);
    const scaledH = Math.floor(bh * scale);

    const startX = Math.floor((48 - scaledW) / 2);
    const startY = 48 - scaledH;

    const frameBuf = Buffer.alloc(48 * 48 * 4);
    for (let dy = 0; dy < scaledH; dy++) {
        for (let dx = 0; dx < scaledW; dx++) {
            const sx = Math.min(raw.width - 1, Math.floor(minX + dx / scale));
            const sy = Math.min(raw.height - 1, Math.floor(minY + dy / scale));
            const sidx = (sy * raw.width + sx) * 4;
            const r = raw.data[sidx], g = raw.data[sidx + 1], b = raw.data[sidx + 2];
            if (!isMagenta(r, g, b)) {
                const ox = startX + dx;
                const oy = startY + dy;
                if (ox >= 0 && ox < 48 && oy >= 0 && oy < 48) {
                    const oidx = (oy * 48 + ox) * 4;
                    const snapped = snapToPalette([r, g, b]);
                    frameBuf[oidx] = snapped[0];
                    frameBuf[oidx + 1] = snapped[1];
                    frameBuf[oidx + 2] = snapped[2];
                    frameBuf[oidx + 3] = 255;
                }
            }
        }
    }

    // Build 144x192 3x4 RMMZ charset
    const charsetW = 144, charsetH = 192;
    const cdata = Buffer.alloc(charsetW * charsetH * 4);
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sidx = (y * 48 + x) * 4;
                    if (frameBuf[sidx + 3] === 255) {
                        const didx = ((row * 48 + y) * charsetW + (col * 48 + x)) * 4;
                        cdata[didx] = frameBuf[sidx];
                        cdata[didx + 1] = frameBuf[sidx + 1];
                        cdata[didx + 2] = frameBuf[sidx + 2];
                        cdata[didx + 3] = 255;
                    }
                }
            }
        }
    }

    quantizeBuffer(cdata, 28);
    quantizeBuffer(frameBuf, 28);

    const sheetName = `!$UF_${outId}.png`;
    const sidecarName = `!$UF_${outId}.json`;
    writePNG(path.join(ROOT, 'game', 'img', 'characters', sheetName), charsetW, charsetH, cdata);
    writePNG(path.join(ROOT, 'art', 'masters', sheetName), charsetW, charsetH, cdata);
    writePNG(path.join(ROOT, 'art', 'masters', `${outId.toLowerCase()}.png`), 48, 48, frameBuf);

    const sidecar = {
        id: outId.toLowerCase(),
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S"],
        animations: { stand: [0] },
        generator: "Google Nano Banana 2",
        standard: "Final Fantasy VI 16-bit HD"
    };
    fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', sidecarName), JSON.stringify(sidecar, null, 2), 'utf8');
    fs.writeFileSync(path.join(ROOT, 'art', 'masters', sidecarName), JSON.stringify(sidecar, null, 2), 'utf8');

    console.log(`Processed 48x48 object ${outId} from ${rawFilename}`);
    return frameBuf;
}

// Process 96x96 large objects / trees (e.g. tree_savanna, tree_swamp, cactus_tall)
function processLargeTree96(rawFilename, outId) {
    const rawPath = path.join(ROOT, 'art', 'raw', rawFilename);
    if (!fs.existsSync(rawPath)) return;
    const raw = decodePNG(fs.readFileSync(rawPath), rawFilename);

    let minX = raw.width, maxX = 0, minY = raw.height, maxY = 0;
    for (let y = 0; y < raw.height; y++) {
        for (let x = 0; x < raw.width; x++) {
            const idx = (y * raw.width + x) * 4;
            const r = raw.data[idx], g = raw.data[idx + 1], b = raw.data[idx + 2];
            if (!isMagenta(r, g, b)) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    const bw = Math.max(1, maxX - minX + 1);
    const bh = Math.max(1, maxY - minY + 1);

    const scale = Math.min((96 - 6) / bw, (96 - 6) / bh);
    const scaledW = Math.floor(bw * scale);
    const scaledH = Math.floor(bh * scale);

    const startX = Math.floor((96 - scaledW) / 2);
    const startY = 96 - scaledH;

    const frameBuf = Buffer.alloc(96 * 96 * 4);
    for (let dy = 0; dy < scaledH; dy++) {
        for (let dx = 0; dx < scaledW; dx++) {
            const sx = Math.min(raw.width - 1, Math.floor(minX + dx / scale));
            const sy = Math.min(raw.height - 1, Math.floor(minY + dy / scale));
            const sidx = (sy * raw.width + sx) * 4;
            const r = raw.data[sidx], g = raw.data[sidx + 1], b = raw.data[sidx + 2];
            if (!isMagenta(r, g, b)) {
                const ox = startX + dx;
                const oy = startY + dy;
                if (ox >= 0 && ox < 96 && oy >= 0 && oy < 96) {
                    const oidx = (oy * 96 + ox) * 4;
                    const snapped = snapToPalette([r, g, b]);
                    frameBuf[oidx] = snapped[0];
                    frameBuf[oidx + 1] = snapped[1];
                    frameBuf[oidx + 2] = snapped[2];
                    frameBuf[oidx + 3] = 255;
                }
            }
        }
    }

    // Build 288x384 3x4 RMMZ charset with sway
    const cW = 288, cH = 384;
    const cdata = Buffer.alloc(cW * cH * 4);
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
            const swayOffset = (col === 0 ? -1 : (col === 2 ? 1 : 0));
            for (let y = 0; y < 96; y++) {
                const rowSway = (y < 65) ? swayOffset : 0;
                for (let x = 0; x < 96; x++) {
                    const sidx = (y * 96 + x) * 4;
                    if (frameBuf[sidx + 3] === 255) {
                        const dx = col * 96 + x + rowSway;
                        const dy = row * 96 + y;
                        if (dx >= col * 96 && dx < (col + 1) * 96) {
                            const didx = (dy * cW + dx) * 4;
                            cdata[didx] = frameBuf[sidx];
                            cdata[didx + 1] = frameBuf[sidx + 1];
                            cdata[didx + 2] = frameBuf[sidx + 2];
                            cdata[didx + 3] = 255;
                        }
                    }
                }
            }
        }
    }

    quantizeBuffer(cdata, 28);
    quantizeBuffer(frameBuf, 28);

    const sheetName = `!$UF_${outId}.png`;
    const sidecarName = `!$UF_${outId}.json`;
    writePNG(path.join(ROOT, 'game', 'img', 'characters', sheetName), cW, cH, cdata);
    writePNG(path.join(ROOT, 'art', 'masters', sheetName), cW, cH, cdata);
    writePNG(path.join(ROOT, 'art', 'masters', `${outId.toLowerCase()}.png`), 96, 96, frameBuf);

    const sidecar = {
        id: outId.toLowerCase(),
        frameWidth: 96,
        frameHeight: 96,
        anchor: [48, 95],
        footprint: [1, 1],
        facings: ["S"],
        animations: { stand: [1], sway: [0, 1, 2] },
        generator: "Google Nano Banana 2",
        standard: "Final Fantasy VI 16-bit HD"
    };
    fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', sidecarName), JSON.stringify(sidecar, null, 2), 'utf8');
    fs.writeFileSync(path.join(ROOT, 'art', 'masters', sidecarName), JSON.stringify(sidecar, null, 2), 'utf8');

    console.log(`Processed 96x96 tree ${outId} from ${rawFilename}`);
    return frameBuf;
}

// Geology & Ores
processSingleObject48('granite_boulder.png', 'GraniteBoulder');
processSingleObject48('ironstone.png', 'IronstoneDeposit');
processSingleObject48('copper_outcrop.png', 'CopperOutcrop');
processSingleObject48('gold_outcrop.png', 'GoldOutcrop');
processSingleObject48('rocks_small.png', 'LooseStones');
processSingleObject48('gravel.png', 'Gravel');
processSingleObject48('rubble.png', 'Rubble');
processSingleObject48('fallen_pillar.png', 'FallenPillar');
processSingleObject48('bones_pile.png', 'OldBones');

// Workplaces & Structures
processSingleObject48('workbench.png', 'Workbench');
processSingleObject48('stockpile.png', 'Stockpile');

// Flora & Trees
processLargeTree96('cactus_tall.png', 'CactusTall');
processLargeTree96('tree_savanna.png', 'Tree_Savanna');
processLargeTree96('tree_swamp.png', 'Tree_Swamp');
processSingleObject48('cactus.png', 'Cactus');
