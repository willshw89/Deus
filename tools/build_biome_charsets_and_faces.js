const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

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

// -------------------------------------------------------------
// Procedural Master Generators for dead tree, tower cap, and stumps
// -------------------------------------------------------------

// Generate Dead Tree Master (96x96, 4 frames)
function generateDeadTreeMaster() {
    const W = 384, H = 96;
    const buf = Buffer.alloc(W * H * 4);

    // Color palette for dead tree
    const cWoodDark = pal.snap(0x2D, 0x24, 0x1C);
    const cWoodMid = pal.snap(0x45, 0x35, 0x2D);
    const cWoodLight = pal.snap(0x61, 0x55, 0x51);
    const cWoodHighlight = pal.snap(0x7D, 0x71, 0x69);

    for (let f = 0; f < 4; f++) {
        const ox = f * 96;
        const sway = (f === 1 ? 1 : f === 2 ? -1 : 0);

        // Trunk base (anchor at x=48, y=95)
        for (let y = 50; y <= 95; y++) {
            const t = (y - 50) / 45;
            const width = Math.round(5 + 7 * Math.pow(t, 2));
            const cx = 48;
            for (let x = cx - width; x <= cx + width; x++) {
                const d = Math.abs(x - cx) / width;
                let rgb = cWoodMid;
                if (d > 0.8) rgb = cWoodDark;
                else if (d < 0.3) rgb = cWoodHighlight;
                else if (x < cx) rgb = cWoodLight;

                const dIdx = (y * W + (ox + x)) * 4;
                buf[dIdx] = rgb[0];
                buf[dIdx + 1] = rgb[1];
                buf[dIdx + 2] = rgb[2];
                buf[dIdx + 3] = 255;
            }
        }

        // Twisted Branches
        const branches = [
            { x0: 48, y0: 55, x1: 25 + sway, y1: 35, x2: 15 + sway, y2: 18, w: 4 },
            { x0: 48, y0: 52, x1: 68 + sway, y1: 38, x2: 82 + sway, y2: 22, w: 4 },
            { x0: 48, y0: 50, x1: 46 + sway, y1: 30, x2: 52 + sway, y2: 12, w: 3 },
            { x0: 30 + sway, y0: 38, x1: 20 + sway, y1: 42, x2: 12 + sway, y2: 44, w: 2 },
            { x0: 65 + sway, y0: 40, x1: 76 + sway, y1: 46, x2: 84 + sway, y2: 50, w: 2 },
            { x0: 22 + sway, y0: 25, x1: 18 + sway, y1: 14, x2: 22 + sway, y2: 8, w: 2 },
            { x0: 75 + sway, y0: 30, x1: 82 + sway, y1: 18, x2: 78 + sway, y2: 10, w: 2 }
        ];

        for (const b of branches) {
            for (let step = 0; step <= 30; step++) {
                const u = step / 30;
                const bx = Math.round((1 - u) * (1 - u) * b.x0 + 2 * (1 - u) * u * b.x1 + u * u * b.x2);
                const by = Math.round((1 - u) * (1 - u) * b.y0 + 2 * (1 - u) * u * b.y1 + u * u * b.y2);
                const curW = Math.max(1, Math.round(b.w * (1 - 0.6 * u)));

                for (let dy = -curW; dy <= curW; dy++) {
                    for (let dx = -curW; dx <= curW; dx++) {
                        if (dx * dx + dy * dy <= curW * curW) {
                            const px = bx + dx, py = by + dy;
                            if (px >= 0 && px < 96 && py >= 0 && py < 96) {
                                const dIdx = (py * W + (ox + px)) * 4;
                                const edge = (dx * dx + dy * dy > (curW - 1) * (curW - 1));
                                const rgb = edge ? cWoodDark : (dx < 0 || dy < 0 ? cWoodLight : cWoodMid);
                                buf[dIdx] = rgb[0];
                                buf[dIdx + 1] = rgb[1];
                                buf[dIdx + 2] = rgb[2];
                                buf[dIdx + 3] = 255;
                            }
                        }
                    }
                }
            }
        }
    }

    quantizeTo32(buf);
    writePNG(path.join(ROOT, 'art', 'masters', 'tree_dead.png'), W, H, buf);
    console.log('  Created Dead Tree Master');
}

// Generate Subterranean Tower-Cap Giant Mushroom Master (96x96, 4 frames)
function generateTowerCapMaster() {
    const W = 384, H = 96;
    const buf = Buffer.alloc(W * H * 4);

    const cCapDark = pal.snap(0x28, 0x14, 0x3E);
    const cCapMid = pal.snap(0x48, 0x22, 0x68);
    const cCapLight = pal.snap(0x6E, 0x3E, 0x98);
    const cGills = pal.snap(0x00, 0xE8, 0xF0); // Brilliant Cyan bioluminescent glow
    const cGillsDark = pal.snap(0x00, 0x98, 0xA8);
    const cStemDark = pal.snap(0x35, 0x3A, 0x45);
    const cStemMid = pal.snap(0x52, 0x58, 0x65);
    const cStemLight = pal.snap(0x7D, 0x85, 0x95);
    const cSporeSpot = pal.snap(0xEE, 0xF8, 0xFF);

    for (let f = 0; f < 4; f++) {
        const ox = f * 96;
        const sway = (f === 1 ? 1 : f === 2 ? -1 : 0);

        // Sturdy Fungal Stem (anchor at x=48, y=95)
        for (let y = 35; y <= 95; y++) {
            const t = (y - 35) / 60;
            const width = Math.round(7 + 6 * Math.pow(t, 2));
            const cx = 48 + Math.round(sway * 0.5 * (1 - t));
            for (let x = cx - width; x <= cx + width; x++) {
                const d = Math.abs(x - cx) / width;
                let rgb = cStemMid;
                if (d > 0.8) rgb = cStemDark;
                else if (x < cx - 1) rgb = cStemLight;

                const dIdx = (y * W + (ox + x)) * 4;
                buf[dIdx] = rgb[0];
                buf[dIdx + 1] = rgb[1];
                buf[dIdx + 2] = rgb[2];
                buf[dIdx + 3] = 255;
            }
        }

        // Bioluminescent Gills under cap (y=34..46)
        for (let y = 33; y <= 45; y++) {
            const t = (y - 33) / 12;
            const w = Math.round(37 * (1 - t * 0.35));
            const cx = 48 + sway;
            for (let x = cx - w; x <= cx + w; x++) {
                const dIdx = (y * W + (ox + x)) * 4;
                const isEdge = Math.abs(x - cx) >= w - 1;
                const rgb = isEdge ? cGillsDark : cGills;
                buf[dIdx] = rgb[0];
                buf[dIdx + 1] = rgb[1];
                buf[dIdx + 2] = rgb[2];
                buf[dIdx + 3] = 255;
            }
        }

        // Giant Mushroom Cap (y=10..38)
        const capCx = 48 + sway;
        const capCy = 35;
        const rx = 38, ry = 25;
        for (let y = 8; y <= 35; y++) {
            for (let x = capCx - rx; x <= capCx + rx; x++) {
                const dx = (x - capCx) / rx;
                const dy = (y - capCy) / ry;
                if (dx * dx + dy * dy <= 1.0) {
                    const dIdx = (y * W + (ox + x)) * 4;
                    const d = Math.hypot(dx, dy);
                    let rgb = cCapMid;
                    if (d > 0.88) rgb = cCapDark;
                    else if (dy < -0.3 && dx < 0.2) rgb = cCapLight;

                    // Luminous ivory spore spots on top of cap
                    const isSpot = ((Math.abs(x * 11 + y * 17)) % 19 < 2) && (dy < -0.1);
                    if (isSpot) rgb = cSporeSpot;

                    buf[dIdx] = rgb[0];
                    buf[dIdx + 1] = rgb[1];
                    buf[dIdx + 2] = rgb[2];
                    buf[dIdx + 3] = 255;
                }
            }
        }
    }

    quantizeTo32(buf);
    writePNG(path.join(ROOT, 'art', 'masters', 'tower_cap.png'), W, H, buf);
    console.log('  Created Tower-Cap Master');
}

// -------------------------------------------------------------
// 1. BUILD CHARSETS (3x Native Grid Engine)
// -------------------------------------------------------------
console.log('=== Building Biome Charsets (3x Native Grid) ===');

// Extract native 32x32 frame from a 96x96 master frame (downsampling 3x3 block to 1 native pixel)
function extractNative32Frame(master, srcOx) {
    const NW = 32, NH = 32;
    const native = Array.from({ length: NH }, () => Array.from({ length: NW }, () => [0, 0, 0, 0]));

    for (let ny = 0; ny < NH; ny++) {
        for (let nx = 0; nx < NW; nx++) {
            let rSum = 0, gSum = 0, bSum = 0, count = 0;
            for (let dy = 0; dy < 3; dy++) {
                for (let dx = 0; dx < 3; dx++) {
                    const sx = srcOx + nx * 3 + dx;
                    const sy = ny * 3 + dy;
                    if (sx < master.width && sy < master.height) {
                        const idx = (sy * master.width + sx) * 4;
                        if (master.data[idx + 3] > 128) {
                            rSum += master.data[idx];
                            gSum += master.data[idx + 1];
                            bSum += master.data[idx + 2];
                            count++;
                        }
                    }
                }
            }

            // If majority of 3x3 block is opaque (at least 4 pixels)
            if (count >= 4) {
                const s = pal.snap(Math.round(rSum / count), Math.round(gSum / count), Math.round(bSum / count));
                native[ny][nx] = [s[0], s[1], s[2], 255];
            }
        }
    }

    return native;
}

// Standard 96x96 tree charset builder
function buildTreeCharset(masterName, outName, frameCount = 4) {
    const masterPath = path.join(ROOT, 'art', 'masters', `${masterName}.png`);
    const master = decodePNG(fs.readFileSync(masterPath), masterName);

    // Native canvas: 3 columns x 4 rows of 32x32 native frames = 96 x 128
    const NW = 96, NH = 128;
    const nativeCanvas = Array.from({ length: NH }, () => Array.from({ length: NW }, () => [0, 0, 0, 0]));

    // Extract native 32x32 frames
    const nativeFrames = [];
    for (let f = 0; f < frameCount; f++) {
        nativeFrames.push(extractNative32Frame(master, f * 96));
    }

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
            const fIdx = Math.min(col, frameCount - 1);
            const frame = nativeFrames[fIdx];
            const destOx = col * 32;
            const destOy = row * 32;

            for (let y = 0; y < 32; y++) {
                for (let x = 0; x < 32; x++) {
                    // Row 2 (East) is mirrored horizontally
                    const srcX = (row === 2) ? (31 - x) : x;
                    const p = frame[y][srcX];
                    if (p[3] > 0) {
                        nativeCanvas[destOy + y][destOx + x] = [p[0], p[1], p[2], 255];
                    }
                }
            }
        }
    }

    // UPSCALE 3X to 288x384 (each native pixel becomes an identical 3x3 block)
    const W = 288, H = 384;
    const buf = Buffer.alloc(W * H * 4);

    for (let ny = 0; ny < NH; ny++) {
        for (let nx = 0; nx < NW; nx++) {
            const p = nativeCanvas[ny][nx];
            for (let dy = 0; dy < 3; dy++) {
                for (let dx = 0; dx < 3; dx++) {
                    const idx = ((ny * 3 + dy) * W + (nx * 3 + dx)) * 4;
                    buf[idx] = p[0];
                    buf[idx + 1] = p[1];
                    buf[idx + 2] = p[2];
                    buf[idx + 3] = p[3];
                }
            }
        }
    }

    quantizeTo32(buf);
    const outPng = path.join(ROOT, 'game', 'img', 'characters', `${outName}.png`);
    writePNG(outPng, W, H, buf);
    console.log(`  Created Tree Charset: ${outName}.png (${W}x${H})`);

    const sidecar = {
        id: outName.replace('!$UF_', '').toLowerCase(),
        frameWidth: 96,
        frameHeight: 96,
        anchor: [48, 95],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: {
            stand: [0],
            sway: [0, 1, 2]
        },
        passable: false,
        under: false
    };
    fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', `${outName}.json`), JSON.stringify(sidecar, null, 2));
}

// -------------------------------------------------------------
// Stump Charset Builder (16x16 native, 3x upscale to 48x48)
// -------------------------------------------------------------
function buildStumpCharset(stumpType, outName) {
    // 16x16 native stump generator
    const NW = 16, NH = 16;
    const frame = Array.from({ length: NH }, () => Array.from({ length: NW }, () => [0, 0, 0, 0]));

    // Color definitions
    let barkDark, barkMid, barkLight, woodDark, woodMid, woodLight;
    if (stumpType === 'pine') {
        barkDark = pal.snap(0x35, 0x22, 0x18);
        barkMid = pal.snap(0x4D, 0x32, 0x22);
        barkLight = pal.snap(0x69, 0x48, 0x30);
        woodDark = pal.snap(0x61, 0x45, 0x28);
        woodMid = pal.snap(0x8A, 0x69, 0x45);
        woodLight = pal.snap(0xB5, 0x8A, 0x5D);
    } else if (stumpType === 'birch') {
        barkDark = pal.snap(0x28, 0x28, 0x28);
        barkMid = pal.snap(0x8A, 0x92, 0x8A);
        barkLight = pal.snap(0xDE, 0xE7, 0xDE);
        woodDark = pal.snap(0x69, 0x55, 0x3D);
        woodMid = pal.snap(0x9A, 0x82, 0x61);
        woodLight = pal.snap(0xD6, 0xC5, 0xA5);
    } else if (stumpType === 'swamp') {
        barkDark = pal.snap(0x18, 0x22, 0x18);
        barkMid = pal.snap(0x28, 0x35, 0x24);
        barkLight = pal.snap(0x3D, 0x51, 0x35);
        woodDark = pal.snap(0x35, 0x3D, 0x28);
        woodMid = pal.snap(0x51, 0x5D, 0x3D);
        woodLight = pal.snap(0x6D, 0x7D, 0x55);
    } else if (stumpType === 'dead') {
        barkDark = pal.snap(0x24, 0x20, 0x1C);
        barkMid = pal.snap(0x3D, 0x35, 0x30);
        barkLight = pal.snap(0x55, 0x4D, 0x45);
        woodDark = pal.snap(0x35, 0x30, 0x28);
        woodMid = pal.snap(0x55, 0x4D, 0x40);
        woodLight = pal.snap(0x75, 0x6D, 0x61);
    } else if (stumpType === 'tower_cap') {
        barkDark = pal.snap(0x20, 0x24, 0x2D);
        barkMid = pal.snap(0x35, 0x3A, 0x45);
        barkLight = pal.snap(0x55, 0x5D, 0x6D);
        woodDark = pal.snap(0x00, 0x68, 0x70);
        woodMid = pal.snap(0x00, 0x98, 0xA0);
        woodLight = pal.snap(0x35, 0xD8, 0xE0);
    } else { // oak / canonical
        barkDark = pal.snap(0x2D, 0x1C, 0x12);
        barkMid = pal.snap(0x4D, 0x30, 0x1E);
        barkLight = pal.snap(0x75, 0x48, 0x2D);
        woodDark = pal.snap(0x65, 0x40, 0x20);
        woodMid = pal.snap(0x92, 0x61, 0x35);
        woodLight = pal.snap(0xC1, 0x8A, 0x4D);
    }

    // Draw stump body in 16x16 native (centered, anchor at [8, 15])
    const cx = 8, cy = 11;
    // Bark base
    for (let y = 8; y <= 15; y++) {
        const t = (y - 8) / 7;
        const w = Math.round(3 + 3 * t);
        for (let x = cx - w; x <= cx + w; x++) {
            const d = Math.abs(x - cx) / w;
            const p = (d > 0.7) ? barkDark : ((x < cx) ? barkLight : barkMid);
            frame[y][x] = [p[0], p[1], p[2], 255];
        }
    }

    // Top heartwood cut surface (oval)
    const cutRx = 4, cutRy = 2.5;
    const cutCy = 8;
    for (let y = 6; y <= 10; y++) {
        for (let x = cx - cutRx; x <= cx + cutRx; x++) {
            const dx = (x - cx) / cutRx;
            const dy = (y - cutCy) / cutRy;
            const d2 = dx * dx + dy * dy;
            if (d2 <= 1.0) {
                let p = woodMid;
                if (d2 > 0.8) p = barkDark;
                else if (d2 > 0.45) p = woodLight;
                else if (d2 > 0.2) p = woodDark;
                frame[y][x] = [p[0], p[1], p[2], 255];
            }
        }
    }

    // Save individual 48x48 master in art/masters (upscaled 3x)
    const masterBuf = Buffer.alloc(48 * 48 * 4);
    for (let ny = 0; ny < NH; ny++) {
        for (let nx = 0; nx < NW; nx++) {
            const p = frame[ny][nx];
            for (let dy = 0; dy < 3; dy++) {
                for (let dx = 0; dx < 3; dx++) {
                    const idx = ((ny * 3 + dy) * 48 + (nx * 3 + dx)) * 4;
                    masterBuf[idx] = p[0]; masterBuf[idx + 1] = p[1]; masterBuf[idx + 2] = p[2]; masterBuf[idx + 3] = p[3];
                }
            }
        }
    }
    writePNG(path.join(ROOT, 'art', 'masters', `${stumpType}_stump.png`), 48, 48, masterBuf);

    // Expand to 3x4 RMMZ character sheet (native 48x64 -> 3x upscale to 144x192)
    const nativeCanvas = Array.from({ length: 64 }, () => Array.from({ length: 48 }, () => [0, 0, 0, 0]));
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
            const ox = col * 16;
            const oy = row * 16;
            for (let y = 0; y < 16; y++) {
                for (let x = 0; x < 16; x++) {
                    const p = frame[y][x];
                    if (p[3] > 0) {
                        nativeCanvas[oy + y][ox + x] = [p[0], p[1], p[2], 255];
                    }
                }
            }
        }
    }

    // UPSCALE 3X to 144x192
    const W = 144, H = 192;
    const buf = Buffer.alloc(W * H * 4);
    for (let ny = 0; ny < 64; ny++) {
        for (let nx = 0; nx < 48; nx++) {
            const p = nativeCanvas[ny][nx];
            for (let dy = 0; dy < 3; dy++) {
                for (let dx = 0; dx < 3; dx++) {
                    const idx = ((ny * 3 + dy) * W + (nx * 3 + dx)) * 4;
                    buf[idx] = p[0];
                    buf[idx + 1] = p[1];
                    buf[idx + 2] = p[2];
                    buf[idx + 3] = p[3];
                }
            }
        }
    }

    quantizeTo32(buf);
    const outPng = path.join(ROOT, 'game', 'img', 'characters', `${outName}.png`);
    writePNG(outPng, W, H, buf);
    console.log(`  Created Stump Charset: ${outName}.png (${W}x${H})`);

    const sidecar = {
        id: outName.replace('!$UF_', '').toLowerCase(),
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: { stand: [0] },
        passable: true,
        under: false
    };
    fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', `${outName}.json`), JSON.stringify(sidecar, null, 2));
}

// -------------------------------------------------------------
// EXECUTE CHARSETS GENERATION
// -------------------------------------------------------------
generateDeadTreeMaster();
generateTowerCapMaster();

// Build Tree Charsets
buildTreeCharset('oak', '!$UF_Oak');
buildTreeCharset('pine', '!$UF_Pine');
buildTreeCharset('birch', '!$UF_Birch');
buildTreeCharset('fruit_tree', '!$UF_Fruit_Tree');
buildTreeCharset('fruit_tree_bare', '!$UF_Fruit_Tree_Bare');
buildTreeCharset('tree_savanna', '!$UF_Tree_Savanna');
buildTreeCharset('tree_swamp', '!$UF_Tree_Swamp');
buildTreeCharset('tree_dead', '!$UF_Tree_Dead');
buildTreeCharset('tower_cap', '!$UF_TowerCap');

// Build Stump Charsets
buildStumpCharset('oak', '!$UF_Oak_Stump');
buildStumpCharset('pine', '!$UF_Pine_Stump');
buildStumpCharset('birch', '!$UF_Birch_Stump');
buildStumpCharset('swamp', '!$UF_Swamp_Stump');
buildStumpCharset('dead', '!$UF_Dead_Stump');
buildStumpCharset('tower_cap', '!$UF_TowerCap_Stump');
buildStumpCharset('oak', '!$UF_Stump'); // canonical stump

// -------------------------------------------------------------
// 2. BUILD FACE SETS (48x48 Native Frames -> 3x Upscale to 576x288)
// -------------------------------------------------------------
console.log('\n=== Building Biome Face Sets (48x48 Native -> 3x Upscale) ===');

const cInk          = pal.snap(12, 10, 8);
const cBackdrop     = pal.snap(14, 18, 42); // Deep U7 midnight navy backdrop
const cBackdropDark = pal.snap(8, 10, 26);  // Deepest shadow

// Living Oak Wood colors
const cBarkDark  = pal.snap(42, 28, 16);
const cBarkMid   = pal.snap(70, 46, 24);
const cBarkLit   = pal.snap(105, 72, 38);
const cLeafDark  = pal.snap(35, 65, 25);
const cLeafMid   = pal.snap(60, 115, 45);
const cLeafLit   = pal.snap(95, 165, 65);

// Stone grey colors
const cStoneDark = pal.snap(45, 45, 48);
const cStoneMid  = pal.snap(75, 75, 80);
const cStoneLit  = pal.snap(115, 115, 120);

// Frame 1: Natural Living Oak Border (48x48 native)
function createLivingOakNative() {
    const FH = 48, FW = 48;
    const frame = Array.from({ length: FH }, () => Array.from({ length: FW }, () => [0, 0, 0, 0]));
    const isInside = Array.from({ length: FH }, () => Array.from({ length: FW }, () => false));

    const cx = 23.5, cy = 23.5;
    const outerRx = 20.0, outerRy = 22.0;
    const innerRx = 16.0, innerRy = 18.0;

    for (let y = 0; y < FH; y++) {
        for (let x = 0; x < FW; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const outerD = Math.hypot(dx / outerRx, dy / outerRy);
            const innerD = Math.hypot(dx / innerRx, dy / innerRy);

            if (innerD <= 1.0) {
                isInside[y][x] = true;
                const col = (y > 33) ? cBackdropDark : cBackdrop;
                frame[y][x] = [col[0], col[1], col[2], 255];
            } else if (outerD <= 1.0) {
                const angle = Math.atan2(dy, dx);
                const light = Math.cos(angle - (-Math.PI * 0.75));

                let c = cBarkMid;
                if (outerD >= 0.94) c = cInk;
                else if (outerD >= 0.82) c = (light > 0) ? cBarkLit : cBarkMid;
                else c = cBarkDark;

                // Leaf foliage along crown
                if (y <= 12 || (y <= 24 && Math.abs(dx) >= 15)) {
                    const leaf = (x * 3 + y * 7) % 5;
                    if (leaf === 0) c = cLeafLit;
                    else if (leaf === 1 || leaf === 2) c = cLeafMid;
                    else if (leaf === 3) c = cLeafDark;
                }

                frame[y][x] = [c[0], c[1], c[2], 255];
            }

            // Root flares at bottom (y: 42..47)
            if (y >= 42) {
                if (Math.hypot(x - 6, y - 45) <= 3.0) {
                    let c = (x === 6 && y === 44) ? cBarkLit : cBarkMid;
                    frame[y][x] = [c[0], c[1], c[2], 255];
                }
                if (Math.hypot(x - 41, y - 45) <= 3.0) {
                    let c = (x === 41 && y === 44) ? cBarkLit : cBarkMid;
                    frame[y][x] = [c[0], c[1], c[2], 255];
                }
            }
            // Canopy crest leaves at top (y: 0..5)
            if (y <= 5 && Math.abs(dx) <= 7) {
                let c = (y <= 2) ? cLeafLit : cLeafMid;
                frame[y][x] = [c[0], c[1], c[2], 255];
            }
        }
    }
    return { frame, isInside };
}

// Frame 3: Classical Romanesque Stone Arch (48x48 native)
function createStoneArchNative() {
    const FH = 48, FW = 48;
    const frame = Array.from({ length: FH }, () => Array.from({ length: FW }, () => [0, 0, 0, 0]));
    const isInside = Array.from({ length: FH }, () => Array.from({ length: FW }, () => false));

    const cx = 23.5;
    const archCy = 21.0;
    const archOuterR = 19.0, archInnerR = 15.0;

    for (let y = 0; y < FH; y++) {
        for (let x = 0; x < FW; x++) {
            const dx = x - cx;

            if (y <= archCy) {
                const r = Math.hypot(dx, y - archCy);
                if (r <= archInnerR) {
                    isInside[y][x] = true;
                    frame[y][x] = [cBackdrop[0], cBackdrop[1], cBackdrop[2], 255];
                } else if (r <= archOuterR) {
                    let c = (r >= archOuterR - 0.8) ? cInk : (r >= archOuterR - 2.5 ? cStoneLit : cStoneMid);
                    if (Math.abs(dx) <= 2 && y <= 6) c = cStoneLit; // Keystone
                    frame[y][x] = [c[0], c[1], c[2], 255];
                }
            } else {
                if (Math.abs(dx) < archInnerR && y < 44) {
                    isInside[y][x] = true;
                    const col = (y > 35) ? cBackdropDark : cBackdrop;
                    frame[y][x] = [col[0], col[1], col[2], 255];
                } else if (Math.abs(dx) >= archInnerR && Math.abs(dx) <= archOuterR && y < 44) {
                    const isLeft = (dx < 0);
                    let c = isLeft ? (dx === -Math.round(archOuterR) ? cInk : cStoneLit) : (dx === Math.round(archOuterR) ? cInk : cStoneDark);
                    frame[y][x] = [c[0], c[1], c[2], 255];
                } else if (Math.abs(dx) <= archOuterR + 1 && y >= 44 && y <= 46) {
                    let c = (y === 44) ? cStoneLit : (y === 46 ? cInk : cStoneMid);
                    frame[y][x] = [c[0], c[1], c[2], 255];
                }
            }
        }
    }
    return { frame, isInside };
}

// -------------------------------------------------------------
// Native Portrait Compositors (48x48)
// -------------------------------------------------------------

function renderNativeTreePortrait(cell, isInside, masterName, bgColors) {
    const masterPath = path.join(ROOT, 'art', 'masters', `${masterName}.png`);
    const master = decodePNG(fs.readFileSync(masterPath), masterName);
    const nativeTree = extractNative32Frame(master, 0); // 32x32 native

    // 1. Draw sky/scenery backdrop inside aperture
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            if (!isInside[y][x]) continue;
            const t = Math.max(0, Math.min(1, (y - 8) / 34));
            const r = Math.round(bgColors[0][0] + (bgColors[1][0] - bgColors[0][0]) * t);
            const g = Math.round(bgColors[0][1] + (bgColors[1][1] - bgColors[0][1]) * t);
            const b = Math.round(bgColors[0][2] + (bgColors[1][2] - bgColors[0][2]) * t);
            const s = pal.snap(r, g, b);
            cell[y][x] = [s[0], s[1], s[2], 255];
        }
    }

    // 2. Center 32x32 native tree inside 48x48 aperture (offset x=8, y=7)
    const offX = 8, offY = 7;
    for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
            const p = nativeTree[y][x];
            if (p[3] > 0) {
                const dx = offX + x;
                const dy = offY + y;
                if (dx >= 0 && dx < 48 && dy >= 0 && dy < 48 && isInside[dy][dx]) {
                    cell[dy][dx] = [p[0], p[1], p[2], 255];
                }
            }
        }
    }
}

function renderNativeStumpPortrait(cell, isInside, stumpMasterName, bgColors, isTreant = false) {
    const masterPath = path.join(ROOT, 'art', 'masters', `${stumpMasterName}.png`);
    const master = decodePNG(fs.readFileSync(masterPath), stumpMasterName);
    // Downsample 48x48 master to 16x16 native
    const nativeStump = Array.from({ length: 16 }, () => Array.from({ length: 16 }, () => [0, 0, 0, 0]));
    for (let ny = 0; ny < 16; ny++) {
        for (let nx = 0; nx < 16; nx++) {
            let rSum = 0, gSum = 0, bSum = 0, count = 0;
            for (let dy = 0; dy < 3; dy++) {
                for (let dx = 0; dx < 3; dx++) {
                    const idx = ((ny * 3 + dy) * master.width + (nx * 3 + dx)) * 4;
                    if (master.data[idx + 3] > 128) {
                        rSum += master.data[idx];
                        gSum += master.data[idx + 1];
                        bSum += master.data[idx + 2];
                        count++;
                    }
                }
            }
            if (count >= 4) {
                const s = pal.snap(Math.round(rSum / count), Math.round(gSum / count), Math.round(bSum / count));
                nativeStump[ny][nx] = [s[0], s[1], s[2], 255];
            }
        }
    }

    // 1. Draw scenery backdrop inside aperture
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            if (!isInside[y][x]) continue;
            const t = Math.max(0, Math.min(1, (y - 8) / 34));
            const r = Math.round(bgColors[0][0] + (bgColors[1][0] - bgColors[0][0]) * t);
            const g = Math.round(bgColors[0][1] + (bgColors[1][1] - bgColors[0][1]) * t);
            const b = Math.round(bgColors[0][2] + (bgColors[1][2] - bgColors[0][2]) * t);
            const s = pal.snap(r, g, b);
            cell[y][x] = [s[0], s[1], s[2], 255];
        }
    }

    // 2. Center 16x16 native stump inside lower portion of aperture (offset x=16, y=23)
    const offX = 16, offY = 22;
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const p = nativeStump[y][x];
            if (p[3] > 0) {
                const dx = offX + x;
                const dy = offY + y;
                if (dx >= 0 && dx < 48 && dy >= 0 && dy < 48 && isInside[dy][dx]) {
                    cell[dy][dx] = [p[0], p[1], p[2], 255];
                }
            }
        }
    }

    // If treant, paint glowing golden eyes onto the trunk
    if (isTreant) {
        const eyeColor = pal.snap(247, 231, 69);
        const eyes = [[21, 26], [26, 26]];
        for (const [ex, ey] of eyes) {
            cell[ey][ex] = [eyeColor[0], eyeColor[1], eyeColor[2], 255];
        }
    }
}

// -------------------------------------------------------------
// Build 576x288 Face Sheet from 48x48 Native Portraits
// -------------------------------------------------------------
function buildFaceSheetNative(portraitsRenderer, frameBuilder, outName) {
    const NW = 192, NH = 96;
    const nativeCanvas = Array.from({ length: NH }, () => Array.from({ length: NW }, () => [0, 0, 0, 0]));

    for (let idx = 0; idx < 8; idx++) {
        const col = idx % 4;
        const row = Math.floor(idx / 4);
        const ox = col * 48;
        const oy = row * 48;

        const { frame, isInside } = frameBuilder();
        const cell = Array.from({ length: 48 }, () => Array.from({ length: 48 }, () => [0, 0, 0, 0]));

        // Render portrait inside cell
        portraitsRenderer(idx, cell, isInside);

        // Composite frame over cell
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const fp = frame[y][x];
                let finalPixel;
                if (isInside[y][x]) {
                    finalPixel = cell[y][x];
                } else if (fp[3] > 0) {
                    finalPixel = fp;
                } else {
                    finalPixel = [0, 0, 0, 0];
                }
                nativeCanvas[oy + y][ox + x] = finalPixel;
            }
        }
    }

    // UPSCALE 3X to 576x288
    const sheetW = 576, sheetH = 288;
    const sheetBuf = Buffer.alloc(sheetW * sheetH * 4);

    for (let ny = 0; ny < NH; ny++) {
        for (let nx = 0; nx < NW; nx++) {
            const p = nativeCanvas[ny][nx];
            for (let dy = 0; dy < 3; dy++) {
                for (let dx = 0; dx < 3; dx++) {
                    const idx = ((ny * 3 + dy) * sheetW + (nx * 3 + dx)) * 4;
                    sheetBuf[idx] = p[0];
                    sheetBuf[idx + 1] = p[1];
                    sheetBuf[idx + 2] = p[2];
                    sheetBuf[idx + 3] = p[3];
                }
            }
        }
    }

    quantizeTo32(sheetBuf);
    const outPng = path.join(ROOT, 'game', 'img', 'faces', `${outName}.png`);
    writePNG(outPng, sheetW, sheetH, sheetBuf);
    console.log(`  Created Faceset: game/img/faces/${outName}.png (${sheetW}x${sheetH})`);
}

// Build Trees Face Sheet
buildFaceSheetNative(
    (idx, cell, isInside) => {
        const specs = [
            { master: 'oak', bg: [[0x40, 0x60, 0x90], [0x70, 0xA0, 0xC0]] },
            { master: 'pine', bg: [[0x30, 0x45, 0x65], [0x70, 0x95, 0xAA]] },
            { master: 'birch', bg: [[0x60, 0x75, 0x8A], [0xB0, 0xBA, 0xAA]] },
            { master: 'tree_swamp', bg: [[0x35, 0x45, 0x40], [0x65, 0x75, 0x60]] },
            { master: 'tree_savanna', bg: [[0x8A, 0x5D, 0x35], [0xC0, 0x8D, 0x50]] },
            { master: 'fruit_tree', bg: [[0x50, 0x70, 0x8A], [0x80, 0xA5, 0xAA]] },
            { master: 'tree_dead', bg: [[0x28, 0x24, 0x35], [0x50, 0x45, 0x60]] },
            { master: 'tower_cap', bg: [[0x14, 0x1A, 0x2E], [0x2A, 0x48, 0x62]] }
        ];
        const s = specs[idx];
        renderNativeTreePortrait(cell, isInside, s.master, s.bg);
    },
    createLivingOakNative,
    'UF_Faces_Trees'
);

// Build Stumps Face Sheet
buildFaceSheetNative(
    (idx, cell, isInside) => {
        const specs = [
            { master: 'oak_stump', bg: [[0x40, 0x55, 0x30], [0x6D, 0x82, 0x51]], treant: false },
            { master: 'pine_stump', bg: [[0x45, 0x35, 0x28], [0x7D, 0x61, 0x45]], treant: false },
            { master: 'birch_stump', bg: [[0x51, 0x61, 0x55], [0x8A, 0x9A, 0x82]], treant: false },
            { master: 'swamp_stump', bg: [[0x28, 0x35, 0x24], [0x4D, 0x5D, 0x3D]], treant: false },
            { master: 'dead_stump', bg: [[0x31, 0x28, 0x20], [0x55, 0x45, 0x35]], treant: false },
            { master: 'tower_cap_stump', bg: [[0x18, 0x14, 0x28], [0x35, 0x24, 0x51]], treant: false },
            { master: 'granite_boulder', bg: [[0x3D, 0x41, 0x45], [0x69, 0x71, 0x79]], treant: false },
            { master: 'oak_stump', bg: [[0x30, 0x4D, 0x28], [0x55, 0x71, 0x39]], treant: true }
        ];
        const s = specs[idx];
        renderNativeStumpPortrait(cell, isInside, s.master, s.bg, s.treant);
    },
    createStoneArchNative,
    'UF_Faces_Stumps'
);

console.log('=== Done building all charsets and facesets with 3x Native Grid! ===');
