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

function loadJpgOrPng(filePath) {
    if (filePath.endsWith('.png')) {
        return decodePNG(fs.readFileSync(filePath), path.basename(filePath));
    }
    const tmpPng = path.join(os.tmpdir(), `tmp_nb2_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${filePath.replace(/'/g, "''")}'); $img.Save('${tmpPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    const buf = fs.readFileSync(tmpPng);
    try { fs.unlinkSync(tmpPng); } catch (_) {}
    return decodePNG(buf, path.basename(filePath));
}

function isMagenta(r, g, b) {
    if (r > 140 && g < 100 && b > 140) return true;
    if (r > 90 && b > 90 && g < 75 && (r - g > 30) && (b - g > 30)) return true;
    if (r > 180 && b > 180 && g < 130) return true;
    return false;
}

// Helper: extract rectangular region, downsample to tw x th, snapped to palette
function extractRect(raw, rx0, ry0, rw, rh, tw, th, padBottom = true) {
    let minX = rx0 + rw, maxX = rx0, minY = ry0 + rh, maxY = ry0;
    for (let y = ry0; y < ry0 + rh; y++) {
        for (let x = rx0; x < rx0 + rw; x++) {
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

    const maxInnerW = tw - 4;
    const maxInnerH = th - 4;
    const scale = Math.min(maxInnerW / bw, maxInnerH / bh);
    const scaledW = Math.floor(bw * scale);
    const scaledH = Math.floor(bh * scale);

    const startX = Math.floor((tw - scaledW) / 2);
    const startY = padBottom ? (th - scaledH) : Math.floor((th - scaledH) / 2);

    const out = Buffer.alloc(tw * th * 4);

    for (let dy = 0; dy < scaledH; dy++) {
        for (let dx = 0; dx < scaledW; dx++) {
            const sx = Math.min(raw.width - 1, Math.floor(minX + dx / scale));
            const sy = Math.min(raw.height - 1, Math.floor(minY + dy / scale));
            const sidx = (sy * raw.width + sx) * 4;
            const r = raw.data[sidx], g = raw.data[sidx + 1], b = raw.data[sidx + 2];
            if (!isMagenta(r, g, b)) {
                const ox = startX + dx;
                const oy = startY + dy;
                if (ox >= 0 && ox < tw && oy >= 0 && oy < th) {
                    const oidx = (oy * tw + ox) * 4;
                    const snapped = snapToPalette([r, g, b]);
                    out[oidx] = snapped[0];
                    out[oidx + 1] = snapped[1];
                    out[oidx + 2] = snapped[2];
                    out[oidx + 3] = 255;
                }
            }
        }
    }
    return out;
}

// 1. Process Subterranean Glowing Fungi & Crystals
function processSubterraneanGlow() {
    const rawPath = path.join(ROOT, 'art', 'raw', 'subterranean_glow_nano_banana_raw.jpg');
    if (!fs.existsSync(rawPath)) return;
    const raw = loadJpgOrPng(rawPath);
    console.log(`Loaded Subterranean Glow raw: ${raw.width}x${raw.height}`);

    const cellW = raw.width / 3;
    const cellH = raw.height / 3;

    // Row 0 has 3 columns: Frame 0 (ambient), Frame 1 (pulse bright), Frame 2 (cooling)
    const frames48 = [];
    for (let col = 0; col < 3; col++) {
        const fBuf = extractRect(raw, col * cellW, 0, cellW, cellH, 48, 48, true);
        frames48.push(fBuf);
    }

    // Build 144x192 3x4 RMMZ charset
    const charsetW = 144, charsetH = 192;
    const cdata = Buffer.alloc(charsetW * charsetH * 4);
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
            const fBuf = frames48[col];
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sidx = (y * 48 + x) * 4;
                    if (fBuf[sidx + 3] === 255) {
                        const didx = ((row * 48 + y) * charsetW + (col * 48 + x)) * 4;
                        cdata[didx] = fBuf[sidx];
                        cdata[didx + 1] = fBuf[sidx + 1];
                        cdata[didx + 2] = fBuf[sidx + 2];
                        cdata[didx + 3] = 255;
                    }
                }
            }
        }
    }
    quantizeBuffer(cdata, 28);

    const sidecar = {
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S"],
        animations: { stand: [0], idle: [0, 1, 2] },
        generator: "Google Nano Banana 2",
        standard: "Final Fantasy VI 16-bit HD"
    };

    const targets = ["GlowCaps", "CrystalCluster", "CaveMushrooms"];
    for (const t of targets) {
        writePNG(path.join(ROOT, 'game', 'img', 'characters', `!$UF_${t}.png`), charsetW, charsetH, cdata);
        writePNG(path.join(ROOT, 'art', 'masters', `!$UF_${t}.png`), charsetW, charsetH, cdata);
        const s = Object.assign({}, sidecar, { id: t.toLowerCase() });
        fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', `!$UF_${t}.json`), JSON.stringify(s, null, 2), 'utf8');
        fs.writeFileSync(path.join(ROOT, 'art', 'masters', `!$UF_${t}.json`), JSON.stringify(s, null, 2), 'utf8');
    }

    writePNG(path.join(ROOT, 'art', 'masters', 'glow_caps.png'), 48, 48, frames48[0]);
    writePNG(path.join(ROOT, 'art', 'masters', 'crystal_cluster.png'), 48, 48, frames48[0]);
    writePNG(path.join(ROOT, 'art', 'masters', 'cave_mushrooms.png'), 48, 48, frames48[0]);

    console.log('Successfully processed Subterranean Glow objects via Nano Banana 2!');
}

// 2. Process Smelting Furnace & Water Well
function processFurnaceAndWell() {
    const rawPath = path.join(ROOT, 'art', 'raw', 'furnace_well_nano_banana_raw.jpg');
    if (!fs.existsSync(rawPath)) return;
    const raw = loadJpgOrPng(rawPath);
    console.log(`Loaded Furnace & Well raw: ${raw.width}x${raw.height}`);

    const cellW = raw.width / 3;
    const halfH = raw.height / 2;

    // Top half: Furnace (3 frames)
    const furnaceFrames96 = [];
    for (let col = 0; col < 3; col++) {
        const fBuf = extractRect(raw, col * cellW, 0, cellW, halfH, 96, 96, true);
        furnaceFrames96.push(fBuf);
    }

    // Bottom half: Well (3 frames)
    const wellFrames96 = [];
    for (let col = 0; col < 3; col++) {
        const fBuf = extractRect(raw, col * cellW, halfH, cellW, halfH, 96, 96, true);
        wellFrames96.push(fBuf);
    }

    // Build 288x384 3x4 RMMZ charsets (96x96 frames)
    function buildCharset96(frames) {
        const cW = 288, cH = 384;
        const cdata = Buffer.alloc(cW * cH * 4);
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 3; col++) {
                const fBuf = frames[col];
                for (let y = 0; y < 96; y++) {
                    for (let x = 0; x < 96; x++) {
                        const sidx = (y * 96 + x) * 4;
                        if (fBuf[sidx + 3] === 255) {
                            const didx = ((row * 96 + y) * cW + (col * 96 + x)) * 4;
                            cdata[didx] = fBuf[sidx];
                            cdata[didx + 1] = fBuf[sidx + 1];
                            cdata[didx + 2] = fBuf[sidx + 2];
                            cdata[didx + 3] = 255;
                        }
                    }
                }
            }
        }
        quantizeBuffer(cdata, 28);
        return cdata;
    }

    const furnaceCharset = buildCharset96(furnaceFrames96);
    const wellCharset = buildCharset96(wellFrames96);

    writePNG(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Furnace.png'), 288, 384, furnaceCharset);
    writePNG(path.join(ROOT, 'art', 'masters', '!$UF_Furnace.png'), 288, 384, furnaceCharset);
    writePNG(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Well.png'), 288, 384, wellCharset);
    writePNG(path.join(ROOT, 'art', 'masters', '!$UF_Well.png'), 288, 384, wellCharset);

    writePNG(path.join(ROOT, 'art', 'masters', 'furnace.png'), 96, 96, furnaceFrames96[0]);
    writePNG(path.join(ROOT, 'art', 'masters', 'well.png'), 96, 96, wellFrames96[0]);

    const furnaceSidecar = {
        id: "furnace",
        frameWidth: 96,
        frameHeight: 96,
        anchor: [48, 95],
        footprint: [1, 1],
        facings: ["S"],
        animations: { stand: [0], lit: [0, 1, 2] },
        generator: "Google Nano Banana 2",
        standard: "Final Fantasy VI 16-bit HD"
    };
    fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Furnace.json'), JSON.stringify(furnaceSidecar, null, 2), 'utf8');
    fs.writeFileSync(path.join(ROOT, 'art', 'masters', '!$UF_Furnace.json'), JSON.stringify(furnaceSidecar, null, 2), 'utf8');

    const wellSidecar = {
        id: "well",
        frameWidth: 96,
        frameHeight: 96,
        anchor: [48, 95],
        footprint: [1, 1],
        facings: ["S"],
        animations: { stand: [1], idle: [0, 1, 2] },
        generator: "Google Nano Banana 2",
        standard: "Final Fantasy VI 16-bit HD"
    };
    fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Well.json'), JSON.stringify(wellSidecar, null, 2), 'utf8');
    fs.writeFileSync(path.join(ROOT, 'art', 'masters', '!$UF_Well.json'), JSON.stringify(wellSidecar, null, 2), 'utf8');

    console.log('Successfully processed Furnace and Well via Nano Banana 2!');
}

// 3. Process Palm and Pine Trees
function processPalmAndPine() {
    const rawPath = path.join(ROOT, 'art', 'raw', 'palm_pine_nano_banana_raw.jpg');
    if (!fs.existsSync(rawPath)) return;
    const raw = loadJpgOrPng(rawPath);
    console.log(`Loaded Palm & Pine raw: ${raw.width}x${raw.height}`);

    const halfH = raw.height / 2;

    // Top: Palm tree (96x96)
    const palmBase = extractRect(raw, 0, 0, raw.width, halfH, 96, 96, true);
    // Bottom: Pine tree (96x96)
    const pineBase = extractRect(raw, 0, halfH, raw.width, halfH, 96, 96, true);

    function makeTreeCharset(baseFrame) {
        const cW = 288, cH = 384;
        const cdata = Buffer.alloc(cW * cH * 4);
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 3; col++) {
                const swayOffset = 0;
                for (let y = 0; y < 96; y++) {
                    const rowSway = (y < 65) ? swayOffset : 0;
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
        return cdata;
    }

    const palmCharset = makeTreeCharset(palmBase);
    const pineCharset = makeTreeCharset(pineBase);

    writePNG(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Palm.png'), 288, 384, palmCharset);
    writePNG(path.join(ROOT, 'art', 'masters', '!$UF_Palm.png'), 288, 384, palmCharset);
    writePNG(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Pine.png'), 288, 384, pineCharset);
    writePNG(path.join(ROOT, 'art', 'masters', '!$UF_Pine.png'), 288, 384, pineCharset);

    writePNG(path.join(ROOT, 'art', 'masters', 'palm.png'), 96, 96, palmBase);
    writePNG(path.join(ROOT, 'art', 'masters', 'pine.png'), 96, 96, pineBase);

    const palmSidecar = {
        id: "palm",
        frameWidth: 96,
        frameHeight: 96,
        anchor: [48, 95],
        footprint: [1, 1],
        facings: ["S"],
        animations: { stand: [1] },
        generator: "Google Nano Banana 2",
        standard: "Final Fantasy VI 16-bit HD"
    };
    fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Palm.json'), JSON.stringify(palmSidecar, null, 2), 'utf8');
    fs.writeFileSync(path.join(ROOT, 'art', 'masters', '!$UF_Palm.json'), JSON.stringify(palmSidecar, null, 2), 'utf8');

    const pineSidecar = {
        id: "pine",
        frameWidth: 96,
        frameHeight: 96,
        anchor: [48, 95],
        footprint: [1, 1],
        facings: ["S"],
        animations: { stand: [1] },
        generator: "Google Nano Banana 2",
        standard: "Final Fantasy VI 16-bit HD"
    };
    fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Pine.json'), JSON.stringify(pineSidecar, null, 2), 'utf8');
    fs.writeFileSync(path.join(ROOT, 'art', 'masters', '!$UF_Pine.json'), JSON.stringify(pineSidecar, null, 2), 'utf8');

    console.log('Successfully processed Palm and Pine via Nano Banana 2!');
}

processSubterraneanGlow();
processFurnaceAndWell();
processPalmAndPine();
