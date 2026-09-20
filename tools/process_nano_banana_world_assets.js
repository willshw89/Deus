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
    const tmpPng = path.join(os.tmpdir(), `tmp_nb_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${filePath.replace(/'/g, "''")}'); $img.Save('${tmpPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    const buf = fs.readFileSync(tmpPng);
    try { fs.unlinkSync(tmpPng); } catch (_) {}
    return decodePNG(buf, path.basename(filePath));
}

function isMagenta(r, g, b) {
    return (r > 165 && g < 100 && b > 165) || (r > 140 && g < 80 && b > 140);
}

// 1. Process Fruit Tree
function processFruitTree() {
    const rawPath = path.join(ROOT, 'art', 'raw', 'fruit_tree_nano_banana_raw.jpg');
    if (!fs.existsSync(rawPath)) return;
    const raw = loadJpgOrPng(rawPath);
    console.log(`Loaded Fruit Tree raw: ${raw.width}x${raw.height}`);

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

    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    const targetW = 84;
    const targetH = 88;
    const scaleX = targetW / bw;
    const scaleY = targetH / bh;

    const frameW = 96, frameH = 96;
    const outData = Buffer.alloc(frameW * frameH * 4);
    const bareData = Buffer.alloc(frameW * frameH * 4);

    const startX = Math.floor(48 - targetW / 2);
    const startY = 96 - targetH;

    for (let dy = 0; dy < targetH; dy++) {
        for (let dx = 0; dx < targetW; dx++) {
            const srcX = Math.min(raw.width - 1, Math.floor(minX + dx / scaleX));
            const srcY = Math.min(raw.height - 1, Math.floor(minY + dy / scaleY));
            const sidx = (srcY * raw.width + srcX) * 4;
            const r = raw.data[sidx], g = raw.data[sidx + 1], b = raw.data[sidx + 2];

            if (!isMagenta(r, g, b)) {
                const ox = startX + dx;
                const oy = startY + dy;
                const oidx = (oy * frameW + ox) * 4;

                const snapped = snapToPalette([r, g, b]);
                outData[oidx] = snapped[0];
                outData[oidx + 1] = snapped[1];
                outData[oidx + 2] = snapped[2];
                outData[oidx + 3] = 255;

                // Bare fruit tree: replace red apples with foliage
                const isRedApple = (snapped[0] > 140 && snapped[1] < 80 && snapped[2] < 80);
                if (isRedApple) {
                    const bareCol = snapToPalette([80, 100, 40]);
                    bareData[oidx] = bareCol[0];
                    bareData[oidx + 1] = bareCol[1];
                    bareData[oidx + 2] = bareCol[2];
                    bareData[oidx + 3] = 255;
                } else {
                    bareData[oidx] = snapped[0];
                    bareData[oidx + 1] = snapped[1];
                    bareData[oidx + 2] = snapped[2];
                    bareData[oidx + 3] = 255;
                }
            }
        }
    }

    // Quantize masters to <= 28 colors
    quantizeBuffer(outData, 28);
    quantizeBuffer(bareData, 28);

    writePNG(path.join(ROOT, 'art', 'masters', 'fruit_tree.png'), frameW, frameH, outData);
    writePNG(path.join(ROOT, 'art', 'masters', 'fruit_tree_bare.png'), frameW, frameH, bareData);

    const charsetW = 288, charsetH = 384;
    function makeCharset(frameBuf) {
        const cdata = Buffer.alloc(charsetW * charsetH * 4);
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 3; col++) {
                const swayOffset = 0;
                for (let y = 0; y < frameH; y++) {
                    const rowSway = (y < 60) ? swayOffset : 0;
                    for (let x = 0; x < frameW; x++) {
                        const sidx = (y * frameW + x) * 4;
                        if (frameBuf[sidx + 3] === 255) {
                            const dx = col * frameW + x + rowSway;
                            const dy = row * frameH + y;
                            if (dx >= col * frameW && dx < (col + 1) * frameW) {
                                const didx = (dy * charsetW + dx) * 4;
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
        return cdata;
    }

    const ftCharset = makeCharset(outData);
    const ftBareCharset = makeCharset(bareData);

    writePNG(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Fruit_Tree.png'), charsetW, charsetH, ftCharset);
    writePNG(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Fruit_Tree_Bare.png'), charsetW, charsetH, ftBareCharset);
    writePNG(path.join(ROOT, 'art', 'masters', '!$UF_Fruit_Tree.png'), charsetW, charsetH, ftCharset);
    writePNG(path.join(ROOT, 'art', 'masters', '!$UF_Fruit_Tree_Bare.png'), charsetW, charsetH, ftBareCharset);

    const sidecar = {
        id: "fruit_tree",
        frameWidth: 96,
        frameHeight: 96,
        anchor: [48, 95],
        footprint: [1, 1],
        facings: ["S"],
        animations: { stand: [1] },
        generator: "Google Nano Banana 2",
        standard: "Final Fantasy VI 16-bit HD"
    };
    fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Fruit_Tree.json'), JSON.stringify(sidecar, null, 2), 'utf8');
    fs.writeFileSync(path.join(ROOT, 'art', 'masters', '!$UF_Fruit_Tree.json'), JSON.stringify(sidecar, null, 2), 'utf8');

    const bareSidecar = Object.assign({}, sidecar, { id: "fruit_tree_bare" });
    fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Fruit_Tree_Bare.json'), JSON.stringify(bareSidecar, null, 2), 'utf8');
    fs.writeFileSync(path.join(ROOT, 'art', 'masters', '!$UF_Fruit_Tree_Bare.json'), JSON.stringify(bareSidecar, null, 2), 'utf8');

    console.log('Successfully processed Fruit Tree via Nano Banana 2!');
}

// 2. Process Swaying Plants & Reeds
function processSwayingPlants() {
    const rawPath = path.join(ROOT, 'art', 'raw', 'plants_sway_nano_banana_raw.jpg');
    if (!fs.existsSync(rawPath)) return;
    const raw = loadJpgOrPng(rawPath);
    console.log(`Loaded Plants Sway raw: ${raw.width}x${raw.height}`);

    const frameW = 48, frameH = 48;
    const frames = [
        { name: "left", x0: 20, x1: 330, y0: 40, y1: 880 },
        { name: "center", x0: 350, x1: 660, y0: 350, y1: 880 },
        { name: "right", x0: 680, x1: 980, y0: 40, y1: 880 }
    ];

    const extractedFrames = frames.map(f => {
        const out = Buffer.alloc(frameW * frameH * 4);
        const bw = f.x1 - f.x0;
        const bh = f.y1 - f.y0;
        const targetW = 36;
        const targetH = 42;
        const scaleX = targetW / bw;
        const scaleY = targetH / bh;
        const startX = Math.floor(24 - targetW / 2);
        const startY = 48 - targetH;

        for (let dy = 0; dy < targetH; dy++) {
            for (let dx = 0; dx < targetW; dx++) {
                const sx = Math.min(raw.width - 1, Math.floor(f.x0 + dx / scaleX));
                const sy = Math.min(raw.height - 1, Math.floor(f.y0 + dy / scaleY));
                const sidx = (sy * raw.width + sx) * 4;
                const r = raw.data[sidx], g = raw.data[sidx + 1], b = raw.data[sidx + 2];
                if (!isMagenta(r, g, b)) {
                    const ox = startX + dx;
                    const oy = startY + dy;
                    const oidx = (oy * frameW + ox) * 4;
                    const snapped = snapToPalette([r, g, b]);
                    out[oidx] = snapped[0];
                    out[oidx + 1] = snapped[1];
                    out[oidx + 2] = snapped[2];
                    out[oidx + 3] = 255;
                }
            }
        }
        return out;
    });

    const charsetW = 144, charsetH = 192;
    const cdata = Buffer.alloc(charsetW * charsetH * 4);
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
            const frameBuf = extractedFrames[col];
            for (let y = 0; y < frameH; y++) {
                for (let x = 0; x < frameW; x++) {
                    const sidx = (y * frameW + x) * 4;
                    if (frameBuf[sidx + 3] === 255) {
                        const dx = col * frameW + x;
                        const dy = row * frameH + y;
                        const didx = (dy * charsetW + dx) * 4;
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

    writePNG(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Reeds.png'), charsetW, charsetH, cdata);
    writePNG(path.join(ROOT, 'art', 'masters', '!$UF_Reeds.png'), charsetW, charsetH, cdata);
    writePNG(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Wildflowers.png'), charsetW, charsetH, cdata);
    writePNG(path.join(ROOT, 'art', 'masters', '!$UF_Wildflowers.png'), charsetW, charsetH, cdata);

    console.log('Successfully processed Swaying Plants via Nano Banana 2!');
}

// 3. Process Inventory Icons
function processInventoryIcons() {
    const rawPath = path.join(ROOT, 'art', 'raw', 'inventory_icons_nano_banana_raw.jpg');
    if (!fs.existsSync(rawPath)) return;
    const raw = loadJpgOrPng(rawPath);
    console.log(`Loaded Inventory Icons raw: ${raw.width}x${raw.height}`);

    const iconNames = [
        ["log", "dressed_stone", "stone", "copper_ore"],
        ["gold_ore", "apple", "berries", "wheat"],
        ["herbs", "pickaxe", "axe", "sword"],
        ["bow", "campfire", "crystal", "potion"]
    ];

    const cellW = raw.width / 4;
    const cellH = raw.height / 4;

    const goldBorderDark = snapToPalette([93, 73, 24]);
    const goldBorderLight = snapToPalette([235, 202, 105]);

    for (let gy = 0; gy < 4; gy++) {
        for (let gx = 0; gx < 4; gx++) {
            const name = iconNames[gy][gx];
            const x0 = Math.floor(gx * cellW);
            const y0 = Math.floor(gy * cellH);

            const margin = Math.floor(cellW * 0.12);
            let minX = x0 + cellW, maxX = x0, minY = y0 + cellH, maxY = y0;

            for (let y = y0 + margin; y < y0 + cellH - margin; y++) {
                for (let x = x0 + margin; x < x0 + cellW - margin; x++) {
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

            const targetDim = 28;
            const scaleX = targetDim / bw;
            const scaleY = targetDim / bh;

            const icon48 = Buffer.alloc(48 * 48 * 4);
            const startX48 = Math.floor(24 - targetDim / 2);
            const startY48 = Math.floor(24 - targetDim / 2);

            for (let dy = 0; dy < targetDim; dy++) {
                for (let dx = 0; dx < targetDim; dx++) {
                    const sx = Math.min(raw.width - 1, Math.floor(minX + dx / scaleX));
                    const sy = Math.min(raw.height - 1, Math.floor(minY + dy / scaleY));
                    const sidx = (sy * raw.width + sx) * 4;
                    const r = raw.data[sidx], g = raw.data[sidx + 1], b = raw.data[sidx + 2];
                    if (!isMagenta(r, g, b)) {
                        const ox = startX48 + dx;
                        const oy = startY48 + dy;
                        const oidx = (oy * 48 + ox) * 4;
                        const snapped = snapToPalette([r, g, b]);
                        icon48[oidx] = snapped[0];
                        icon48[oidx + 1] = snapped[1];
                        icon48[oidx + 2] = snapped[2];
                        icon48[oidx + 3] = 255;
                    }
                }
            }

            // Draw clean beveled frame on 48x48
            for (let i = 2; i < 46; i++) {
                setPixel(icon48, 48, i, 2, goldBorderLight);
                setPixel(icon48, 48, 2, i, goldBorderLight);
                setPixel(icon48, 48, 45, i, goldBorderDark);
                setPixel(icon48, 48, i, 45, goldBorderDark);
            }

            quantizeBuffer(icon48, 28);
            writePNG(path.join(ROOT, 'art', 'masters', `${name}_icon.png`), 48, 48, icon48);
        }
    }
    console.log('Successfully processed 16 Inventory Icons via Nano Banana 2!');
}

function setPixel(buf, w, x, y, col) {
    const idx = (y * w + x) * 4;
    buf[idx] = col[0];
    buf[idx + 1] = col[1];
    buf[idx + 2] = col[2];
    buf[idx + 3] = 255;
}

processFruitTree();
processSwayingPlants();
processInventoryIcons();
