const fs = require('fs');
const path = require('path');
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
    if (r > 200 && b > 200 && g < 160) return true;
    if (r > 25 && b > 25 && g < 15 && Math.abs(r - b) < 20) return true;
    if (r > 40 && b > 40 && g < 25 && (r - g > 25) && (b - g > 25)) return true;
    return false;
}

// Extract cropped frame from a region of an image
function extractObjectFrame(raw, sx, sy, sw, sh, targetW, targetH) {
    let minX = sx + sw, maxX = sx, minY = sy + sh, maxY = sy;
    for (let y = sy; y < sy + sh; y++) {
        for (let x = sx; x < sx + sw; x++) {
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

    const scale = Math.min((targetW - 4) / bw, (targetH - 4) / bh);
    const scaledW = Math.floor(bw * scale);
    const scaledH = Math.floor(bh * scale);

    const startX = Math.floor((targetW - scaledW) / 2);
    const startY = targetH - scaledH;

    const frameBuf = Buffer.alloc(targetW * targetH * 4);
    for (let dy = 0; dy < scaledH; dy++) {
        for (let dx = 0; dx < scaledW; dx++) {
            const srcX = Math.min(sx + sw - 1, Math.floor(minX + dx / scale));
            const srcY = Math.min(sy + sh - 1, Math.floor(minY + dy / scale));
            const sidx = (srcY * raw.width + srcX) * 4;
            const r = raw.data[sidx], g = raw.data[sidx + 1], b = raw.data[sidx + 2];
            if (!isMagenta(r, g, b)) {
                const ox = startX + dx;
                const oy = startY + dy;
                if (ox >= 0 && ox < targetW && oy >= 0 && oy < targetH) {
                    const oidx = (oy * targetW + ox) * 4;
                    const snapped = snapToPalette([r, g, b]);
                    frameBuf[oidx] = snapped[0];
                    frameBuf[oidx + 1] = snapped[1];
                    frameBuf[oidx + 2] = snapped[2];
                    frameBuf[oidx + 3] = 255;
                }
            }
        }
    }
    return frameBuf;
}

// 1. Process 48x48 Flora with wind sway animation
function processSwayingFlora48(rawFilename, outId) {
    const rawPath = path.join(ROOT, 'art', 'raw', rawFilename);
    if (!fs.existsSync(rawPath)) return;
    const raw = decodePNG(fs.readFileSync(rawPath), rawFilename);
    const baseFrame = extractObjectFrame(raw, 0, 0, raw.width, raw.height, 48, 48);

    const charsetW = 144, charsetH = 192;
    const cdata = Buffer.alloc(charsetW * charsetH * 4);

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
            const swayOffset = (col === 0 ? -1 : (col === 2 ? 1 : 0));
            for (let y = 0; y < 48; y++) {
                const rowSway = (y < 34) ? swayOffset : 0;
                for (let x = 0; x < 48; x++) {
                    const sidx = (y * 48 + x) * 4;
                    if (baseFrame[sidx + 3] === 255) {
                        const dx = col * 48 + x + rowSway;
                        const dy = row * 48 + y;
                        if (dx >= col * 48 && dx < (col + 1) * 48) {
                            const didx = (dy * charsetW + dx) * 4;
                            cdata[didx] = baseFrame[sidx];
                            cdata[didx + 1] = baseFrame[sidx + 1];
                            cdata[didx + 2] = baseFrame[sidx + 2];
                            cdata[didx + 3] = 255;
                        }
                    }
                }
            }
        }
    }

    quantizeBuffer(cdata, 28);
    quantizeBuffer(baseFrame, 28);

    const sheetName = `!$UF_${outId}.png`;
    const sidecarName = `!$UF_${outId}.json`;
    writePNG(path.join(ROOT, 'game', 'img', 'characters', sheetName), charsetW, charsetH, cdata);
    writePNG(path.join(ROOT, 'art', 'masters', sheetName), charsetW, charsetH, cdata);
    writePNG(path.join(ROOT, 'art', 'masters', `${outId.toLowerCase()}.png`), 48, 48, baseFrame);

    const sidecar = {
        id: outId.toLowerCase(),
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S"],
        animations: { stand: [1], sway: [0, 1, 2] },
        frameMs: 250,
        generator: "Google Nano Banana 2",
        standard: "Final Fantasy VI 16-bit HD"
    };
    fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', sidecarName), JSON.stringify(sidecar, null, 2), 'utf8');
    fs.writeFileSync(path.join(ROOT, 'art', 'masters', sidecarName), JSON.stringify(sidecar, null, 2), 'utf8');

    console.log(`Processed 48x48 swaying flora ${outId}`);
    return baseFrame;
}

// 2. Process 96x96 Canopy Trees with canopy sway
function processLargeCanopyTree96(rawFilename, outId) {
    const rawPath = path.join(ROOT, 'art', 'raw', rawFilename);
    if (!fs.existsSync(rawPath)) return;
    const raw = decodePNG(fs.readFileSync(rawPath), rawFilename);
    const baseFrame = extractObjectFrame(raw, 0, 0, raw.width, raw.height, 96, 96);

    const cW = 288, cH = 384;
    const cdata = Buffer.alloc(cW * cH * 4);

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
            const swayOffset = (col === 0 ? -1 : (col === 2 ? 1 : 0));
            for (let y = 0; y < 96; y++) {
                const rowSway = (y < 68) ? swayOffset : 0;
                for (let x = 0; x < 96; x++) {
                    const sidx = (y * 96 + x) * 4;
                    if (baseFrame[sidx + 3] === 255) {
                        const dx = col * 96 + x + rowSway;
                        const dy = row * 96 + y;
                        if (dx >= col * 96 && dx < (col + 1) * 96) {
                            const didx = (dy * cW + dx) * 4;
                            cdata[didx] = baseFrame[sidx];
                            cdata[didx + 1] = baseFrame[sidx + 1];
                            cdata[didx + 2] = baseFrame[sidx + 2];
                            cdata[didx + 3] = 255;
                        }
                    }
                }
            }
        }
    }

    quantizeBuffer(cdata, 28);
    quantizeBuffer(baseFrame, 28);

    const sheetName = `!$UF_${outId}.png`;
    const sidecarName = `!$UF_${outId}.json`;
    writePNG(path.join(ROOT, 'game', 'img', 'characters', sheetName), cW, cH, cdata);
    writePNG(path.join(ROOT, 'art', 'masters', sheetName), cW, cH, cdata);
    writePNG(path.join(ROOT, 'art', 'masters', `${outId.toLowerCase()}.png`), 96, 96, baseFrame);

    const sidecar = {
        id: outId.toLowerCase(),
        frameWidth: 96,
        frameHeight: 96,
        anchor: [48, 95],
        footprint: [1, 1],
        facings: ["S"],
        animations: { stand: [1], sway: [0, 1, 2] },
        frameMs: 300,
        generator: "Google Nano Banana 2",
        standard: "Final Fantasy VI 16-bit HD"
    };
    fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', sidecarName), JSON.stringify(sidecar, null, 2), 'utf8');
    fs.writeFileSync(path.join(ROOT, 'art', 'masters', sidecarName), JSON.stringify(sidecar, null, 2), 'utf8');

    console.log(`Processed 96x96 mature tree ${outId}`);
    return baseFrame;
}

// 3. Process Campfire (3 animated flame frames + unlit state)
function processCampfire() {
    const rawLit1 = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'campfire_lit.png')), 'campfire_lit.png');
    const rawLit2 = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'campfire_lit_f2.png')), 'campfire_lit_f2.png');
    const rawLit3 = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'campfire_lit_f3.png')), 'campfire_lit_f3.png');
    const rawUnlit = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'campfire_unlit.png')), 'campfire_unlit.png');

    const f0 = extractObjectFrame(rawLit1, 0, 0, 1024, 1024, 48, 48);
    const f1 = extractObjectFrame(rawLit2, 0, 0, 1024, 1024, 48, 48);
    const f2 = extractObjectFrame(rawLit3, 0, 0, 1024, 1024, 48, 48);
    const fUnlit = extractObjectFrame(rawUnlit, 0, 0, 1024, 1024, 48, 48);

    const cW = 144, cH = 192;
    const cdataLit = Buffer.alloc(cW * cH * 4);
    const cdataUnlit = Buffer.alloc(cW * cH * 4);

    const frames = [f0, f1, f2];

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
            const curFrame = frames[col];
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sidx = (y * 48 + x) * 4;
                    const didx = ((row * 48 + y) * cW + (col * 48 + x)) * 4;
                    if (curFrame[sidx + 3] === 255) {
                        cdataLit[didx] = curFrame[sidx];
                        cdataLit[didx + 1] = curFrame[sidx + 1];
                        cdataLit[didx + 2] = curFrame[sidx + 2];
                        cdataLit[didx + 3] = 255;
                    }
                    if (fUnlit[sidx + 3] === 255) {
                        cdataUnlit[didx] = fUnlit[sidx];
                        cdataUnlit[didx + 1] = fUnlit[sidx + 1];
                        cdataUnlit[didx + 2] = fUnlit[sidx + 2];
                        cdataUnlit[didx + 3] = 255;
                    }
                }
            }
        }
    }

    quantizeBuffer(cdataLit, 28);
    quantizeBuffer(cdataUnlit, 28);
    quantizeBuffer(f0, 28);
    quantizeBuffer(fUnlit, 28);

    writePNG(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Campfire.png'), cW, cH, cdataLit);
    writePNG(path.join(ROOT, 'art', 'masters', '!$UF_Campfire.png'), cW, cH, cdataLit);
    writePNG(path.join(ROOT, 'art', 'masters', 'campfire.png'), 48, 48, f0);

    writePNG(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Campfire_Unlit.png'), cW, cH, cdataUnlit);
    writePNG(path.join(ROOT, 'art', 'masters', '!$UF_Campfire_Unlit.png'), cW, cH, cdataUnlit);
    writePNG(path.join(ROOT, 'art', 'masters', 'campfire_unlit.png'), 48, 48, fUnlit);

    const sidecarLit = {
        id: "campfire",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S"],
        animations: { stand: [0, 1, 2], burn: [0, 1, 2] },
        frameMs: 160,
        generator: "Google Nano Banana 2",
        standard: "Final Fantasy VI 16-bit HD"
    };
    fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Campfire.json'), JSON.stringify(sidecarLit, null, 2), 'utf8');
    fs.writeFileSync(path.join(ROOT, 'art', 'masters', '!$UF_Campfire.json'), JSON.stringify(sidecarLit, null, 2), 'utf8');

    const sidecarUnlit = {
        id: "campfire_unlit",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S"],
        animations: { stand: [0] },
        generator: "Google Nano Banana 2",
        standard: "Final Fantasy VI 16-bit HD"
    };
    fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Campfire_Unlit.json'), JSON.stringify(sidecarUnlit, null, 2), 'utf8');
    fs.writeFileSync(path.join(ROOT, 'art', 'masters', '!$UF_Campfire_Unlit.json'), JSON.stringify(sidecarUnlit, null, 2), 'utf8');

    console.log('Processed Campfire (animated lit + unlit)');
    return { lit: f0, unlit: fUnlit };
}

// 4. Process Static 48x48 objects (Stump, Floor Straw, Doors)
function processStaticObject48(rawFilename, outId) {
    const rawPath = path.join(ROOT, 'art', 'raw', rawFilename);
    if (!fs.existsSync(rawPath)) return;
    const raw = decodePNG(fs.readFileSync(rawPath), rawFilename);
    const frameBuf = extractObjectFrame(raw, 0, 0, raw.width, raw.height, 48, 48);

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

    console.log(`Processed 48x48 static object ${outId}`);
    return frameBuf;
}

// 5. Process Small Crystals (3 animated bioluminescent pulse frames)
function processSmallCrystals() {
    const rawPath = path.join(ROOT, 'art', 'raw', 'crystal_small.png');
    if (!fs.existsSync(rawPath)) return;
    const raw = decodePNG(fs.readFileSync(rawPath), 'crystal_small.png');

    const f0 = extractObjectFrame(raw, 0, 0, 192, 192, 48, 48);
    const f1 = extractObjectFrame(raw, 192, 0, 192, 192, 48, 48);
    const f2 = extractObjectFrame(raw, 384, 0, 192, 192, 48, 48);

    const cW = 144, cH = 192;
    const cdata = Buffer.alloc(cW * cH * 4);
    const frames = [f0, f1, f2];

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
            const curFrame = frames[col];
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sidx = (y * 48 + x) * 4;
                    if (curFrame[sidx + 3] === 255) {
                        const didx = ((row * 48 + y) * cW + (col * 48 + x)) * 4;
                        cdata[didx] = curFrame[sidx];
                        cdata[didx + 1] = curFrame[sidx + 1];
                        cdata[didx + 2] = curFrame[sidx + 2];
                        cdata[didx + 3] = 255;
                    }
                }
            }
        }
    }

    quantizeBuffer(cdata, 28);
    quantizeBuffer(f0, 28);

    const sheetName = `!$UF_SmallCrystals.png`;
    const sidecarName = `!$UF_SmallCrystals.json`;
    writePNG(path.join(ROOT, 'game', 'img', 'characters', sheetName), cW, cH, cdata);
    writePNG(path.join(ROOT, 'art', 'masters', sheetName), cW, cH, cdata);
    writePNG(path.join(ROOT, 'art', 'masters', 'crystal_small.png'), 48, 48, f0);

    const sidecar = {
        id: "crystal_small",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S"],
        animations: { stand: [0, 1, 2], pulse: [0, 1, 2] },
        frameMs: 220,
        generator: "Google Nano Banana 2",
        standard: "Final Fantasy VI 16-bit HD"
    };
    fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', sidecarName), JSON.stringify(sidecar, null, 2), 'utf8');
    fs.writeFileSync(path.join(ROOT, 'art', 'masters', sidecarName), JSON.stringify(sidecar, null, 2), 'utf8');

    console.log('Processed Small Crystals (3-frame pulse)');
    return f0;
}

// Execute Batch 4:
console.log('--- Processing Batch 4 Nano Banana Assets ---');

// Trees (96x96):
processLargeCanopyTree96('oak.png', 'Oak');
processLargeCanopyTree96('birch.png', 'Birch');
processLargeCanopyTree96('fir_snow.png', 'Fir_Snow');

// Stump (48x48):
processStaticObject48('stump.png', 'Stump');

// Shrubs & Flora (48x48 with sway):
processSwayingFlora48('berry_bush.png', 'BerryBush');
processSwayingFlora48('berry_bush_bare.png', 'BerryBush_Bare');
processSwayingFlora48('bush.png', 'Bush');
processSwayingFlora48('desert_shrub.png', 'DesertShrub');
processSwayingFlora48('snow_bush.png', 'SnowBush');
processSwayingFlora48('grass_tuft.png', 'GrassTuft');
processSwayingFlora48('fern.png', 'Fern');

// Campfire:
processCampfire();

// Straw Bed & Doors:
processStaticObject48('floor_straw.png', 'Straw_Bed');
processStaticObject48('door_wood.png', 'Door_Wood');
processStaticObject48('door_stone.png', 'Door_Stone');

// Small Crystals:
processSmallCrystals();

console.log('--- Batch 4 Processing Complete ---');
