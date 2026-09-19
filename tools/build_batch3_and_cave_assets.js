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
// 1. PROCEDURAL MASTER GENERATORS (Batch 3 Trees)
// -------------------------------------------------------------

// Palm Tree (96x96, 4 frames)
function generatePalmMaster() {
    const W = 384, H = 96;
    const buf = Buffer.alloc(W * H * 4);

    const cTrunkDark = pal.snap(0x45, 0x30, 0x18);
    const cTrunkMid = pal.snap(0x75, 0x55, 0x32);
    const cTrunkLight = pal.snap(0xA8, 0x82, 0x55);
    const cCoconut = pal.snap(0x35, 0x22, 0x10);
    const cLeafDark = pal.snap(0x18, 0x55, 0x18);
    const cLeafMid = pal.snap(0x35, 0x8A, 0x22);
    const cLeafLight = pal.snap(0x65, 0xC5, 0x35);
    const cLeafGleam = pal.snap(0x9E, 0xE8, 0x55);

    for (let f = 0; f < 4; f++) {
        const ox = f * 96;
        const sway = (f === 1 ? 1 : f === 2 ? -1 : 0);

        // Curving ringed trunk (base at 48, 95 -> crown at 46 + sway, 44)
        for (let y = 44; y <= 95; y++) {
            const t = (y - 44) / 51;
            // Slight graceful curve
            const cx = Math.round(48 - 4 * Math.sin(t * Math.PI) + sway * (1 - t));
            const w = Math.round(3 + 3 * t);
            for (let x = cx - w; x <= cx + w; x++) {
                const d = Math.abs(x - cx) / w;
                const isRing = (y % 4 === 0);
                let rgb = (d > 0.7 || isRing) ? cTrunkDark : (x < cx ? cTrunkLight : cTrunkMid);
                const dIdx = (y * W + (ox + x)) * 4;
                buf[dIdx] = rgb[0]; buf[dIdx + 1] = rgb[1]; buf[dIdx + 2] = rgb[2]; buf[dIdx + 3] = 255;
            }
        }

        // Coconuts under crown
        const crownX = 46 + sway, crownY = 44;
        const nutOffsets = [[-2, 0], [2, 1], [0, 2], [-3, 2], [3, 0]];
        for (const [nx, ny] of nutOffsets) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const px = crownX + nx + dx, py = crownY + ny + dy;
                    const dIdx = (py * W + (ox + px)) * 4;
                    buf[dIdx] = cCoconut[0]; buf[dIdx + 1] = cCoconut[1]; buf[dIdx + 2] = cCoconut[2]; buf[dIdx + 3] = 255;
                }
            }
        }

        // Arching Palm Fronds (6 drooping fan palm fronds)
        const fronds = [
            { x0: crownX, y0: crownY, x1: crownX - 22 + sway * 2, y1: crownY - 24, x2: crownX - 34 + sway * 2, y2: crownY - 8 },
            { x0: crownX, y0: crownY, x1: crownX + 22 + sway * 2, y1: crownY - 24, x2: crownX + 34 + sway * 2, y2: crownY - 8 },
            { x0: crownX, y0: crownY, x1: crownX - 12 + sway, y1: crownY - 32, x2: crownX - 18 + sway * 2, y2: crownY - 20 },
            { x0: crownX, y0: crownY, x1: crownX + 12 + sway, y1: crownY - 32, x2: crownX + 18 + sway * 2, y2: crownY - 20 },
            { x0: crownX, y0: crownY, x1: crownX - 26 + sway * 2, y1: crownY - 8, x2: crownX - 36 + sway * 3, y2: crownY + 8 },
            { x0: crownX, y0: crownY, x1: crownX + 26 + sway * 2, y1: crownY - 8, x2: crownX + 36 + sway * 3, y2: crownY + 8 }
        ];

        for (const fr of fronds) {
            for (let step = 0; step <= 25; step++) {
                const u = step / 25;
                const fx = Math.round((1 - u) * (1 - u) * fr.x0 + 2 * (1 - u) * u * fr.x1 + u * u * fr.x2);
                const fy = Math.round((1 - u) * (1 - u) * fr.y0 + 2 * (1 - u) * u * fr.y1 + u * u * fr.y2);
                const leafletSpan = Math.max(1, Math.round(5 * Math.sin(u * Math.PI)));

                for (let dl = -leafletSpan; dl <= leafletSpan; dl++) {
                    const px = fx + dl, py = fy + Math.abs(dl);
                    if (px >= 0 && px < 96 && py >= 0 && py < 96) {
                        const dIdx = (py * W + (ox + px)) * 4;
                        let rgb = (dl === 0) ? cLeafGleam : (Math.abs(dl) === leafletSpan ? cLeafDark : (dl < 0 ? cLeafLight : cLeafMid));
                        buf[dIdx] = rgb[0]; buf[dIdx + 1] = rgb[1]; buf[dIdx + 2] = rgb[2]; buf[dIdx + 3] = 255;
                    }
                }
            }
        }
    }

    quantizeTo32(buf);
    writePNG(path.join(ROOT, 'art', 'masters', 'palm.png'), W, H, buf);
    console.log('  Created Palm Master');
}

// Mangrove Tree (96x96, 4 frames)
function generateMangroveMaster() {
    const W = 384, H = 96;
    const buf = Buffer.alloc(W * H * 4);

    const cRootDark = pal.snap(0x28, 0x1C, 0x12);
    const cRootMid = pal.snap(0x48, 0x32, 0x20);
    const cRootLight = pal.snap(0x6D, 0x4D, 0x32);
    const cLeafDark = pal.snap(0x18, 0x40, 0x20);
    const cLeafMid = pal.snap(0x28, 0x6D, 0x35);
    const cLeafLight = pal.snap(0x4D, 0x9A, 0x45);
    const cLeafLit = pal.snap(0x7D, 0xC5, 0x5D);

    for (let f = 0; f < 4; f++) {
        const ox = f * 96;
        const sway = (f === 1 ? 1 : f === 2 ? -1 : 0);

        // Arching stilt prop roots (x=24..72, y=60..95)
        const roots = [
            { x0: 48, y0: 55, x1: 34, y1: 72, x2: 24, y2: 95, w: 3 },
            { x0: 48, y0: 55, x1: 62, y1: 72, x2: 72, y2: 95, w: 3 },
            { x0: 48, y0: 58, x1: 40, y1: 76, x2: 34, y2: 95, w: 2 },
            { x0: 48, y0: 58, x1: 56, y1: 76, x2: 62, y2: 95, w: 2 },
            { x0: 48, y0: 50, x1: 47, y1: 72, x2: 48, y2: 95, w: 3 }
        ];

        for (const r of roots) {
            for (let step = 0; step <= 25; step++) {
                const u = step / 25;
                const rx = Math.round((1 - u) * (1 - u) * r.x0 + 2 * (1 - u) * u * r.x1 + u * u * r.x2);
                const ry = Math.round((1 - u) * (1 - u) * r.y0 + 2 * (1 - u) * u * r.y1 + u * u * r.y2);
                for (let dy = -r.w; dy <= r.w; dy++) {
                    for (let dx = -r.w; dx <= r.w; dx++) {
                        if (dx * dx + dy * dy <= r.w * r.w) {
                            const px = rx + dx, py = ry + dy;
                            if (px >= 0 && px < 96 && py >= 0 && py < 96) {
                                const dIdx = (py * W + (ox + px)) * 4;
                                const isEdge = (dx * dx + dy * dy > (r.w - 1) * (r.w - 1));
                                const rgb = isEdge ? cRootDark : (dx < 0 ? cRootLight : cRootMid);
                                buf[dIdx] = rgb[0]; buf[dIdx + 1] = rgb[1]; buf[dIdx + 2] = rgb[2]; buf[dIdx + 3] = 255;
                            }
                        }
                    }
                }
            }
        }

        // Central gnarled trunk (y=40..58)
        for (let y = 38; y <= 58; y++) {
            const t = (y - 38) / 20;
            const w = Math.round(5 + 3 * t);
            const cx = 48 + Math.round(sway * 0.5);
            for (let x = cx - w; x <= cx + w; x++) {
                const d = Math.abs(x - cx) / w;
                const rgb = d > 0.7 ? cRootDark : (x < cx ? cRootLight : cRootMid);
                const dIdx = (y * W + (ox + x)) * 4;
                buf[dIdx] = rgb[0]; buf[dIdx + 1] = rgb[1]; buf[dIdx + 2] = rgb[2]; buf[dIdx + 3] = 255;
            }
        }

        // Spreading mangrove canopy dome (y=10..45, x=16..80)
        const canopies = [
            { cx: 48 + sway, cy: 26, rx: 32, ry: 18 },
            { cx: 36 + sway, cy: 30, rx: 20, ry: 14 },
            { cx: 60 + sway, cy: 30, rx: 20, ry: 14 }
        ];

        for (const c of canopies) {
            for (let y = c.cy - c.ry; y <= c.cy + c.ry; y++) {
                for (let x = c.cx - c.rx; x <= c.cx + c.rx; x++) {
                    const dx = (x - c.cx) / c.rx;
                    const dy = (y - c.cy) / c.ry;
                    if (dx * dx + dy * dy <= 1.0) {
                        const d = Math.hypot(dx, dy);
                        let rgb = cLeafMid;
                        if (d > 0.85) rgb = cLeafDark;
                        else if (dy < -0.3 && dx < 0.2) rgb = cLeafLit;
                        else if (dy < 0) rgb = cLeafLight;

                        const dIdx = (y * W + (ox + x)) * 4;
                        buf[dIdx] = rgb[0]; buf[dIdx + 1] = rgb[1]; buf[dIdx + 2] = rgb[2]; buf[dIdx + 3] = 255;
                    }
                }
            }
        }
    }

    quantizeTo32(buf);
    writePNG(path.join(ROOT, 'art', 'masters', 'mangrove.png'), W, H, buf);
    console.log('  Created Mangrove Master');
}

// Broadleaf Giant Tropical Jungle Tree (96x96, 4 frames)
function generateTropicalMaster() {
    const W = 384, H = 96;
    const buf = Buffer.alloc(W * H * 4);

    const cTrunkDark = pal.snap(0x32, 0x22, 0x16);
    const cTrunkMid = pal.snap(0x55, 0x3A, 0x24);
    const cTrunkLight = pal.snap(0x7D, 0x58, 0x38);
    const cLeafDark = pal.snap(0x0C, 0x48, 0x14);
    const cLeafMid = pal.snap(0x18, 0x75, 0x20);
    const cLeafLight = pal.snap(0x35, 0xAA, 0x35);
    const cLeafLit = pal.snap(0x65, 0xD8, 0x4D);

    for (let f = 0; f < 4; f++) {
        const ox = f * 96;
        const sway = (f === 1 ? 1 : f === 2 ? -1 : 0);

        // Huge buttressed trunk base (y=45..95)
        for (let y = 45; y <= 95; y++) {
            const t = (y - 45) / 50;
            const w = Math.round(7 + 10 * Math.pow(t, 2));
            const cx = 48 + Math.round(sway * 0.3);
            for (let x = cx - w; x <= cx + w; x++) {
                const d = Math.abs(x - cx) / w;
                let rgb = d > 0.8 ? cTrunkDark : (x < cx - 1 ? cTrunkLight : cTrunkMid);
                const dIdx = (y * W + (ox + x)) * 4;
                buf[dIdx] = rgb[0]; buf[dIdx + 1] = rgb[1]; buf[dIdx + 2] = rgb[2]; buf[dIdx + 3] = 255;
            }
        }

        // Massive sprawling rainforest canopy (y=8..52, x=8..88)
        const clusters = [
            { cx: 48 + sway, cy: 22, rx: 36, ry: 18 },
            { cx: 30 + sway, cy: 32, rx: 24, ry: 16 },
            { cx: 66 + sway, cy: 32, rx: 24, ry: 16 },
            { cx: 48 + sway, cy: 38, rx: 28, ry: 14 }
        ];

        for (const cl of clusters) {
            for (let y = cl.cy - cl.ry; y <= cl.cy + cl.ry; y++) {
                for (let x = cl.cx - cl.rx; x <= cl.cx + cl.rx; x++) {
                    const dx = (x - cl.cx) / cl.rx;
                    const dy = (y - cl.cy) / cl.ry;
                    if (dx * dx + dy * dy <= 1.0) {
                        const d = Math.hypot(dx, dy);
                        let rgb = cLeafMid;
                        if (d > 0.86) rgb = cLeafDark;
                        else if (dy < -0.35 && dx < 0.2) rgb = cLeafLit;
                        else if (dy < 0) rgb = cLeafLight;

                        const dIdx = (y * W + (ox + x)) * 4;
                        buf[dIdx] = rgb[0]; buf[dIdx + 1] = rgb[1]; buf[dIdx + 2] = rgb[2]; buf[dIdx + 3] = 255;
                    }
                }
            }
        }
    }

    quantizeTo32(buf);
    writePNG(path.join(ROOT, 'art', 'masters', 'tree_tropical.png'), W, H, buf);
    console.log('  Created Tropical Giant Master');
}

// Cursed / Blighted Tree (96x96, 4 frames)
function generateCursedTreeMaster() {
    const W = 384, H = 96;
    const buf = Buffer.alloc(W * H * 4);

    const cWoodDark = pal.snap(0x14, 0x10, 0x18);
    const cWoodMid = pal.snap(0x28, 0x1E, 0x2E);
    const cWoodLight = pal.snap(0x45, 0x32, 0x4D);
    const cNecrotic = pal.snap(0x9E, 0x22, 0x90); // Glowing violet cursed sap
    const cNecroticGlow = pal.snap(0xDE, 0x4D, 0xD0);

    for (let f = 0; f < 4; f++) {
        const ox = f * 96;
        const sway = (f === 1 ? 1 : f === 2 ? -1 : 0);

        // Twisted trunk with corrupted fissures
        for (let y = 48; y <= 95; y++) {
            const t = (y - 48) / 47;
            const w = Math.round(5 + 7 * Math.pow(t, 2));
            const cx = 48 + Math.round(3 * Math.sin(t * Math.PI));
            for (let x = cx - w; x <= cx + w; x++) {
                const d = Math.abs(x - cx) / w;
                const isFissure = Math.abs(x - (cx - 1)) <= 1 && (y % 6 < 3);
                let rgb = isFissure ? cNecroticGlow : (d > 0.75 ? cWoodDark : (x < cx ? cWoodLight : cWoodMid));
                const dIdx = (y * W + (ox + x)) * 4;
                buf[dIdx] = rgb[0]; buf[dIdx + 1] = rgb[1]; buf[dIdx + 2] = rgb[2]; buf[dIdx + 3] = 255;
            }
        }

        // Drooping claw-like branches
        const limbs = [
            { x0: 48, y0: 52, x1: 22 + sway, y1: 36, x2: 12 + sway, y2: 48, w: 3 },
            { x0: 48, y0: 50, x1: 74 + sway, y1: 36, x2: 84 + sway, y2: 48, w: 3 },
            { x0: 48, y0: 48, x1: 38 + sway, y1: 24, x2: 32 + sway, y2: 10, w: 3 },
            { x0: 48, y0: 48, x1: 58 + sway, y1: 24, x2: 64 + sway, y2: 10, w: 3 }
        ];

        for (const l of limbs) {
            for (let step = 0; step <= 25; step++) {
                const u = step / 25;
                const lx = Math.round((1 - u) * (1 - u) * l.x0 + 2 * (1 - u) * u * l.x1 + u * u * l.x2);
                const ly = Math.round((1 - u) * (1 - u) * l.y0 + 2 * (1 - u) * u * l.y1 + u * u * l.y2);
                for (let dy = -l.w; dy <= l.w; dy++) {
                    for (let dx = -l.w; dx <= l.w; dx++) {
                        if (dx * dx + dy * dy <= l.w * l.w) {
                            const px = lx + dx, py = ly + dy;
                            if (px >= 0 && px < 96 && py >= 0 && py < 96) {
                                const dIdx = (py * W + (ox + px)) * 4;
                                const isDrop = (step === 25 && dy > 0);
                                const rgb = isDrop ? cNecrotic : (dx * dx + dy * dy > (l.w - 1) * (l.w - 1) ? cWoodDark : cWoodMid);
                                buf[dIdx] = rgb[0]; buf[dIdx + 1] = rgb[1]; buf[dIdx + 2] = rgb[2]; buf[dIdx + 3] = 255;
                            }
                        }
                    }
                }
            }
        }
    }

    quantizeTo32(buf);
    writePNG(path.join(ROOT, 'art', 'masters', 'tree_cursed.png'), W, H, buf);
    console.log('  Created Cursed Tree Master');
}

// -------------------------------------------------------------
// 2. PROCEDURAL MASTER GENERATORS (Cave Flora & Speleothems, 48x48)
// -------------------------------------------------------------

function generateCaveFloraMaster(id, renderFn) {
    const W = 48, H = 48;
    const buf = Buffer.alloc(W * H * 4);
    renderFn(buf, W, H);
    quantizeTo32(buf);
    writePNG(path.join(ROOT, 'art', 'masters', `${id}.png`), W, H, buf);
    console.log(`  Created Cave Master: ${id}.png`);
}

// Glow-caps (cluster of bioluminescent cyan mushrooms)
function renderGlowCaps(buf, W, H) {
    const cStem = pal.snap(0x35, 0x65, 0x75);
    const cGills = pal.snap(0x00, 0x88, 0xA0);
    const cCapMid = pal.snap(0x00, 0xC8, 0xD8);
    const cCapLit = pal.snap(0x40, 0xF5, 0xFF);

    const caps = [
        { cx: 24, cy: 26, r: 8, h: 18 },
        { cx: 16, cy: 30, r: 6, h: 14 },
        { cx: 32, cy: 29, r: 6, h: 15 },
        { cx: 12, cy: 36, r: 4, h: 8 },
        { cx: 36, cy: 35, r: 5, h: 9 }
    ];

    for (const cp of caps) {
        // Stalk
        const groundY = 44;
        for (let y = cp.cy; y <= groundY; y++) {
            for (let dx = -1; dx <= 1; dx++) {
                const px = cp.cx + dx;
                const idx = (y * W + px) * 4;
                buf[idx] = cStem[0]; buf[idx + 1] = cStem[1]; buf[idx + 2] = cStem[2]; buf[idx + 3] = 255;
            }
        }
        // Cap
        for (let y = cp.cy - cp.r; y <= cp.cy + 2; y++) {
            for (let x = cp.cx - cp.r; x <= cp.cx + cp.r; x++) {
                const dx = (x - cp.cx) / cp.r;
                const dy = (y - cp.cy) / (cp.r * 0.75);
                if (dx * dx + dy * dy <= 1.0 && y <= cp.cy) {
                    const idx = (y * W + x) * 4;
                    const rgb = (dy < -0.3) ? cCapLit : ((y >= cp.cy - 1) ? cGills : cCapMid);
                    buf[idx] = rgb[0]; buf[idx + 1] = rgb[1]; buf[idx + 2] = rgb[2]; buf[idx + 3] = 255;
                }
            }
        }
    }
}

// Cave Mushrooms (cavern shelf and cap fungi)
function renderCaveMushrooms(buf, W, H) {
    const cCapDark = pal.snap(0x4D, 0x28, 0x40);
    const cCapMid = pal.snap(0x7D, 0x45, 0x65);
    const cCapLight = pal.snap(0xB5, 0x75, 0x95);
    const cStem = pal.snap(0x60, 0x50, 0x58);

    const shrooms = [
        { cx: 22, cy: 28, rx: 9, ry: 6, stemH: 14 },
        { cx: 33, cy: 32, rx: 7, ry: 5, stemH: 10 },
        { cx: 14, cy: 35, rx: 6, ry: 4, stemH: 8 }
    ];

    for (const sh of shrooms) {
        for (let y = sh.cy; y <= 44; y++) {
            for (let dx = -1; dx <= 1; dx++) {
                const idx = (y * W + (sh.cx + dx)) * 4;
                buf[idx] = cStem[0]; buf[idx + 1] = cStem[1]; buf[idx + 2] = cStem[2]; buf[idx + 3] = 255;
            }
        }
        for (let y = sh.cy - sh.ry; y <= sh.cy + 1; y++) {
            for (let x = sh.cx - sh.rx; x <= sh.cx + sh.rx; x++) {
                const dx = (x - sh.cx) / sh.rx;
                const dy = (y - sh.cy) / sh.ry;
                if (dx * dx + dy * dy <= 1.0) {
                    const idx = (y * W + x) * 4;
                    const rgb = (dy < -0.35) ? cCapLight : (dy > 0.4 ? cCapDark : cCapMid);
                    buf[idx] = rgb[0]; buf[idx + 1] = rgb[1]; buf[idx + 2] = rgb[2]; buf[idx + 3] = 255;
                }
            }
        }
    }
}

// Cave Moss (bioluminescent green/teal moss mound)
function renderCaveMoss(buf, W, H) {
    const cMossDark = pal.snap(0x10, 0x35, 0x22);
    const cMossMid = pal.snap(0x18, 0x65, 0x3D);
    const cMossLit = pal.snap(0x35, 0xA8, 0x65);
    const cMossGlow = pal.snap(0x65, 0xF0, 0xA0);

    const cx = 24, cy = 36, rx = 18, ry = 8;
    for (let y = cy - ry; y <= 44; y++) {
        for (let x = cx - rx; x <= cx + rx; x++) {
            const dx = (x - cx) / rx;
            const dy = (y - cy) / ry;
            if (dx * dx + dy * dy <= 1.0) {
                const isSpeck = ((x * 13 + y * 7) % 11 === 0);
                let rgb = isSpeck ? cMossGlow : (dy < -0.2 ? cMossLit : (dy > 0.5 ? cMossDark : cMossMid));
                const idx = (y * W + x) * 4;
                buf[idx] = rgb[0]; buf[idx + 1] = rgb[1]; buf[idx + 2] = rgb[2]; buf[idx + 3] = 255;
            }
        }
    }
}

// Spore Reeds (puffball stalks)
function renderSporeReeds(buf, W, H) {
    const cReedDark = pal.snap(0x28, 0x45, 0x3D);
    const cReedMid = pal.snap(0x45, 0x75, 0x65);
    const cPodMid = pal.snap(0x8A, 0xB0, 0xA0);
    const cPodLight = pal.snap(0xC5, 0xE5, 0xD5);

    const stalks = [
        { x: 18, yTop: 18, podR: 4 },
        { x: 24, yTop: 12, podR: 5 },
        { x: 30, yTop: 16, podR: 4 },
        { x: 13, yTop: 26, podR: 3 },
        { x: 35, yTop: 24, podR: 3 }
    ];

    for (const st of stalks) {
        for (let y = st.yTop; y <= 44; y++) {
            const idx = (y * W + st.x) * 4;
            buf[idx] = cReedMid[0]; buf[idx + 1] = cReedMid[1]; buf[idx + 2] = cReedMid[2]; buf[idx + 3] = 255;
        }
        for (let y = st.yTop - st.podR; y <= st.yTop + st.podR; y++) {
            for (let x = st.x - st.podR; x <= st.x + st.podR; x++) {
                const dx = (x - st.x) / st.podR;
                const dy = (y - st.yTop) / st.podR;
                if (dx * dx + dy * dy <= 1.0) {
                    const idx = (y * W + x) * 4;
                    const rgb = (dy < -0.2) ? cPodLight : (dy > 0.4 ? cReedDark : cPodMid);
                    buf[idx] = rgb[0]; buf[idx + 1] = rgb[1]; buf[idx + 2] = rgb[2]; buf[idx + 3] = 255;
                }
            }
        }
    }
}

// Stalagmite (limestone speleothem)
function renderStalagmite(buf, W, H) {
    const cStoneDark = pal.snap(0x35, 0x35, 0x40);
    const cStoneMid = pal.snap(0x55, 0x58, 0x65);
    const cStoneLight = pal.snap(0x82, 0x86, 0x95);
    const cStoneHighlight = pal.snap(0xAF, 0xB5, 0xC5);

    const cx = 24;
    for (let y = 10; y <= 44; y++) {
        const t = (y - 10) / 34;
        const w = Math.round(2 + 8 * Math.pow(t, 1.6));
        for (let x = cx - w; x <= cx + w; x++) {
            const d = Math.abs(x - cx) / w;
            let rgb = d > 0.8 ? cStoneDark : (x < cx - 1 ? cStoneHighlight : (x < cx ? cStoneLight : cStoneMid));
            const idx = (y * W + x) * 4;
            buf[idx] = rgb[0]; buf[idx + 1] = rgb[1]; buf[idx + 2] = rgb[2]; buf[idx + 3] = 255;
        }
    }
}

// Crystal Spire (towering faceted luminous crystal)
function renderCrystalSpire(buf, W, H) {
    const cCrystDark = pal.snap(0x10, 0x28, 0x60);
    const cCrystMid = pal.snap(0x20, 0x55, 0xA8);
    const cCrystLight = pal.snap(0x40, 0x90, 0xE5);
    const cCrystGleam = pal.snap(0x9E, 0xD8, 0xFF);

    const cx = 24;
    // Central primary crystal spire (y=6..44)
    for (let y = 6; y <= 44; y++) {
        const t = (y - 6) / 38;
        const w = Math.round(1 + 7 * Math.min(1, t * 1.5));
        for (let x = cx - w; x <= cx + w; x++) {
            const d = Math.abs(x - cx) / Math.max(1, w);
            let rgb = (d > 0.8) ? cCrystDark : (x === cx - 1 ? cCrystGleam : (x < cx ? cCrystLight : cCrystMid));
            const idx = (y * W + x) * 4;
            buf[idx] = rgb[0]; buf[idx + 1] = rgb[1]; buf[idx + 2] = rgb[2]; buf[idx + 3] = 255;
        }
    }

    // Side crystal facets
    const sides = [
        { sx: 15, y0: 18, h: 26, w: 4 },
        { sx: 33, y0: 22, h: 22, w: 4 }
    ];
    for (const s of sides) {
        for (let y = s.y0; y <= 44; y++) {
            const t = (y - s.y0) / s.h;
            const w = Math.round(1 + (s.w - 1) * Math.min(1, t * 1.5));
            for (let x = s.sx - w; x <= s.sx + w; x++) {
                const idx = (y * W + x) * 4;
                if (buf[idx + 3] === 0) {
                    const rgb = (x < s.sx) ? cCrystLight : cCrystMid;
                    buf[idx] = rgb[0]; buf[idx + 1] = rgb[1]; buf[idx + 2] = rgb[2]; buf[idx + 3] = 255;
                }
            }
        }
    }
}

// -------------------------------------------------------------
// 3. TREE & STUMP CHARSET BUILDERS (3x Native Grid Engine)
// -------------------------------------------------------------

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
            if (count >= 4) {
                const s = pal.snap(Math.round(rSum / count), Math.round(gSum / count), Math.round(bSum / count));
                native[ny][nx] = [s[0], s[1], s[2], 255];
            }
        }
    }
    return native;
}

function buildTreeCharset(masterName, outName, frameCount = 4) {
    const masterPath = path.join(ROOT, 'art', 'masters', `${masterName}.png`);
    const master = decodePNG(fs.readFileSync(masterPath), masterName);

    const NW = 96, NH = 128;
    const nativeCanvas = Array.from({ length: NH }, () => Array.from({ length: NW }, () => [0, 0, 0, 0]));

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
                    const srcX = (row === 2) ? (31 - x) : x;
                    const p = frame[y][srcX];
                    if (p[3] > 0) {
                        nativeCanvas[destOy + y][destOx + x] = [p[0], p[1], p[2], 255];
                    }
                }
            }
        }
    }

    const W = 288, H = 384;
    const buf = Buffer.alloc(W * H * 4);
    for (let ny = 0; ny < NH; ny++) {
        for (let nx = 0; nx < NW; nx++) {
            const p = nativeCanvas[ny][nx];
            for (let dy = 0; dy < 3; dy++) {
                for (let dx = 0; dx < 3; dx++) {
                    const idx = ((ny * 3 + dy) * W + (nx * 3 + dx)) * 4;
                    buf[idx] = p[0]; buf[idx + 1] = p[1]; buf[idx + 2] = p[2]; buf[idx + 3] = p[3];
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
        animations: { stand: [0], sway: [0, 1, 2] },
        passable: false,
        under: false
    };
    fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', `${outName}.json`), JSON.stringify(sidecar, null, 2));
}

function buildStumpCharset(stumpType, outName) {
    const NW = 16, NH = 16;
    const frame = Array.from({ length: NH }, () => Array.from({ length: NW }, () => [0, 0, 0, 0]));

    let barkDark, barkMid, barkLight, woodDark, woodMid, woodLight, isSnowy = false, isCursed = false;
    if (stumpType === 'fir_snow') {
        barkDark = pal.snap(0x35, 0x25, 0x1A);
        barkMid = pal.snap(0x55, 0x3D, 0x2A);
        barkLight = pal.snap(0x75, 0x58, 0x3E);
        woodDark = pal.snap(0x61, 0x48, 0x2A);
        woodMid = pal.snap(0x8A, 0x6D, 0x45);
        woodLight = pal.snap(0xBA, 0x95, 0x65);
        isSnowy = true;
    } else if (stumpType === 'mangrove') {
        barkDark = pal.snap(0x28, 0x1C, 0x12);
        barkMid = pal.snap(0x48, 0x32, 0x20);
        barkLight = pal.snap(0x6D, 0x4D, 0x32);
        woodDark = pal.snap(0x45, 0x30, 0x1E);
        woodMid = pal.snap(0x6E, 0x4D, 0x30);
        woodLight = pal.snap(0x9A, 0x72, 0x48);
    } else if (stumpType === 'tropical') {
        barkDark = pal.snap(0x32, 0x22, 0x16);
        barkMid = pal.snap(0x55, 0x3A, 0x24);
        barkLight = pal.snap(0x7D, 0x58, 0x38);
        woodDark = pal.snap(0x5A, 0x3D, 0x25);
        woodMid = pal.snap(0x88, 0x60, 0x3D);
        woodLight = pal.snap(0xB5, 0x88, 0x58);
    } else if (stumpType === 'palm') {
        barkDark = pal.snap(0x45, 0x30, 0x18);
        barkMid = pal.snap(0x75, 0x55, 0x32);
        barkLight = pal.snap(0xA8, 0x82, 0x55);
        woodDark = pal.snap(0x65, 0x48, 0x28);
        woodMid = pal.snap(0x92, 0x72, 0x45);
        woodLight = pal.snap(0xC5, 0x9E, 0x65);
    } else { // cursed
        barkDark = pal.snap(0x14, 0x10, 0x18);
        barkMid = pal.snap(0x28, 0x1E, 0x2E);
        barkLight = pal.snap(0x45, 0x32, 0x4D);
        woodDark = pal.snap(0x2E, 0x18, 0x35);
        woodMid = pal.snap(0x55, 0x28, 0x5E);
        woodLight = pal.snap(0x8A, 0x3D, 0x90);
        isCursed = true;
    }

    const cx = 8;
    for (let y = 8; y <= 15; y++) {
        const t = (y - 8) / 7;
        const w = Math.round(3 + (stumpType === 'tropical' ? 4 : 3) * t);
        for (let x = cx - w; x <= cx + w; x++) {
            const d = Math.abs(x - cx) / w;
            const p = (d > 0.7) ? barkDark : ((x < cx) ? barkLight : barkMid);
            frame[y][x] = [p[0], p[1], p[2], 255];
        }
    }

    const cutRx = (stumpType === 'tropical' ? 5 : 4), cutRy = 2.5;
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

    // Snowy fir stump has snow on rim
    if (isSnowy) {
        const cSnow = pal.snap(0xEE, 0xF5, 0xFF);
        const cSnowShadow = pal.snap(0xB5, 0xD0, 0xEA);
        for (let x = cx - cutRx - 1; x <= cx + cutRx + 1; x++) {
            if (Math.abs(x - cx) >= cutRx - 1) {
                frame[6][x] = [cSnow[0], cSnow[1], cSnow[2], 255];
                frame[7][x] = [cSnowShadow[0], cSnowShadow[1], cSnowShadow[2], 255];
            }
        }
    }

    // Cursed stump has necrotic glowing fissure
    if (isCursed) {
        const cGlow = pal.snap(0xDE, 0x4D, 0xD0);
        frame[8][cx] = [cGlow[0], cGlow[1], cGlow[2], 255];
        frame[9][cx] = [cGlow[0], cGlow[1], cGlow[2], 255];
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

    const W = 144, H = 192;
    const buf = Buffer.alloc(W * H * 4);
    for (let ny = 0; ny < 64; ny++) {
        for (let nx = 0; nx < 48; nx++) {
            const p = nativeCanvas[ny][nx];
            for (let dy = 0; dy < 3; dy++) {
                for (let dx = 0; dx < 3; dx++) {
                    const idx = ((ny * 3 + dy) * W + (nx * 3 + dx)) * 4;
                    buf[idx] = p[0]; buf[idx + 1] = p[1]; buf[idx + 2] = p[2]; buf[idx + 3] = p[3];
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
// 4. CAVE FLORA 48x48 CHARSET BUILDER (3x Native Grid)
// -------------------------------------------------------------

function buildCaveFloraCharset(masterId, outName, isPassable = true, isUnder = true) {
    const masterPath = path.join(ROOT, 'art', 'masters', `${masterId}.png`);
    const master = decodePNG(fs.readFileSync(masterPath), masterId);

    // Downsample 48x48 master to 16x16 native
    const native = Array.from({ length: 16 }, () => Array.from({ length: 16 }, () => [0, 0, 0, 0]));
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
                native[ny][nx] = [s[0], s[1], s[2], 255];
            }
        }
    }

    // Expand to 3x4 RMMZ character sheet (native 48x64 -> 3x upscale to 144x192)
    const nativeCanvas = Array.from({ length: 64 }, () => Array.from({ length: 48 }, () => [0, 0, 0, 0]));
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
            const ox = col * 16;
            const oy = row * 16;
            for (let y = 0; y < 16; y++) {
                for (let x = 0; x < 16; x++) {
                    const p = native[y][x];
                    if (p[3] > 0) {
                        nativeCanvas[oy + y][ox + x] = [p[0], p[1], p[2], 255];
                    }
                }
            }
        }
    }

    const W = 144, H = 192;
    const buf = Buffer.alloc(W * H * 4);
    for (let ny = 0; ny < 64; ny++) {
        for (let nx = 0; nx < 48; nx++) {
            const p = nativeCanvas[ny][nx];
            for (let dy = 0; dy < 3; dy++) {
                for (let dx = 0; dx < 3; dx++) {
                    const idx = ((ny * 3 + dy) * W + (nx * 3 + dx)) * 4;
                    buf[idx] = p[0]; buf[idx + 1] = p[1]; buf[idx + 2] = p[2]; buf[idx + 3] = p[3];
                }
            }
        }
    }

    quantizeTo32(buf);
    const outPng = path.join(ROOT, 'game', 'img', 'characters', `${outName}.png`);
    writePNG(outPng, W, H, buf);
    console.log(`  Created Cave Flora Charset: ${outName}.png (${W}x${H})`);

    const sidecar = {
        id: outName.replace('!$UF_', '').toLowerCase(),
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: { stand: [0] },
        passable: isPassable,
        under: isUnder
    };
    fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', `${outName}.json`), JSON.stringify(sidecar, null, 2));
}

// -------------------------------------------------------------
// 5. FACE SETS GENERATORS (48x48 Native Frames -> 3x Upscale)
// -------------------------------------------------------------

const cInk = pal.snap(12, 10, 8);
const cBackdrop = pal.snap(14, 18, 42);
const cBackdropDark = pal.snap(8, 10, 26);
const cBarkDark = pal.snap(42, 28, 16);
const cBarkMid = pal.snap(70, 46, 24);
const cBarkLit = pal.snap(105, 72, 38);
const cLeafDark = pal.snap(35, 65, 25);
const cLeafMid = pal.snap(60, 115, 45);
const cLeafLit = pal.snap(95, 165, 65);
const cStoneDark = pal.snap(45, 45, 48);
const cStoneMid = pal.snap(75, 75, 80);
const cStoneLit = pal.snap(115, 115, 120);

function createLivingOakNative() {
    const FH = 48, FW = 48;
    const frame = Array.from({ length: FH }, () => Array.from({ length: FW }, () => [0, 0, 0, 0]));
    const isInside = Array.from({ length: FH }, () => Array.from({ length: FW }, () => false));

    const cx = 23.5, cy = 23.5;
    const outerRx = 20.0, outerRy = 22.0;
    const innerRx = 16.0, innerRy = 18.0;

    for (let y = 0; y < FH; y++) {
        for (let x = 0; x < FW; x++) {
            const dx = x - cx, dy = y - cy;
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

                if (y <= 12 || (y <= 24 && Math.abs(dx) >= 15)) {
                    const leaf = (x * 3 + y * 7) % 5;
                    if (leaf === 0) c = cLeafLit;
                    else if (leaf === 1 || leaf === 2) c = cLeafMid;
                    else if (leaf === 3) c = cLeafDark;
                }
                frame[y][x] = [c[0], c[1], c[2], 255];
            }

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
            if (y <= 5 && Math.abs(dx) <= 7) {
                let c = (y <= 2) ? cLeafLit : cLeafMid;
                frame[y][x] = [c[0], c[1], c[2], 255];
            }
        }
    }
    return { frame, isInside };
}

function createStoneArchNative() {
    const FH = 48, FW = 48;
    const frame = Array.from({ length: FH }, () => Array.from({ length: FW }, () => [0, 0, 0, 0]));
    const isInside = Array.from({ length: FH }, () => Array.from({ length: FW }, () => false));

    const cx = 23.5, archCy = 21.0;
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
                    if (Math.abs(dx) <= 2 && y <= 6) c = cStoneLit;
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

function renderNativeTreePortrait(cell, isInside, masterName, bgColors) {
    const masterPath = path.join(ROOT, 'art', 'masters', `${masterName}.png`);
    const master = decodePNG(fs.readFileSync(masterPath), masterName);
    const nativeTree = extractNative32Frame(master, 0);

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

    const offX = 8, offY = 7;
    for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
            const p = nativeTree[y][x];
            if (p[3] > 0) {
                const dx = offX + x, dy = offY + y;
                if (dx >= 0 && dx < 48 && dy >= 0 && dy < 48 && isInside[dy][dx]) {
                    cell[dy][dx] = [p[0], p[1], p[2], 255];
                }
            }
        }
    }
}

function renderNativeSmallFeaturePortrait(cell, isInside, masterName, bgColors) {
    const masterPath = path.join(ROOT, 'art', 'masters', `${masterName}.png`);
    const master = decodePNG(fs.readFileSync(masterPath), masterName);

    // Downsample 48x48 master to 16x16 native
    const native = Array.from({ length: 16 }, () => Array.from({ length: 16 }, () => [0, 0, 0, 0]));
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
                native[ny][nx] = [s[0], s[1], s[2], 255];
            }
        }
    }

    // Scenery backdrop
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

    // Scale 16x16 feature 1.5x to ~24x24 centered at (12, 16)
    for (let y = 0; y < 24; y++) {
        const sy = Math.floor(y / 1.5);
        for (let x = 0; x < 24; x++) {
            const sx = Math.floor(x / 1.5);
            if (sx < 16 && sy < 16) {
                const p = native[sy][sx];
                if (p[3] > 0) {
                    const dx = 12 + x, dy = 16 + y;
                    if (dx >= 0 && dx < 48 && dy >= 0 && dy < 48 && isInside[dy][dx]) {
                        cell[dy][dx] = [p[0], p[1], p[2], 255];
                    }
                }
            }
        }
    }
}

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

        portraitsRenderer(idx, cell, isInside);

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

    const sheetW = 576, sheetH = 288;
    const sheetBuf = Buffer.alloc(sheetW * sheetH * 4);
    for (let ny = 0; ny < NH; ny++) {
        for (let nx = 0; nx < NW; nx++) {
            const p = nativeCanvas[ny][nx];
            for (let dy = 0; dy < 3; dy++) {
                for (let dx = 0; dx < 3; dx++) {
                    const idx = ((ny * 3 + dy) * sheetW + (nx * 3 + dx)) * 4;
                    sheetBuf[idx] = p[0]; sheetBuf[idx + 1] = p[1]; sheetBuf[idx + 2] = p[2]; sheetBuf[idx + 3] = p[3];
                }
            }
        }
    }

    quantizeTo32(sheetBuf);
    const outPng = path.join(ROOT, 'game', 'img', 'faces', `${outName}.png`);
    writePNG(outPng, sheetW, sheetH, sheetBuf);
    console.log(`  Created Faceset: game/img/faces/${outName}.png (${sheetW}x${sheetH})`);
}

// -------------------------------------------------------------
// EXECUTE ALL ASSET BUILDS
// -------------------------------------------------------------
console.log('=== Building Batch 3 Trees & Stumps ===');
generatePalmMaster();
generateMangroveMaster();
generateTropicalMaster();
generateCursedTreeMaster();

// Tree charsets
buildTreeCharset('fir_snow', '!$UF_Fir_Snow');
buildTreeCharset('mangrove', '!$UF_Mangrove');
buildTreeCharset('tree_tropical', '!$UF_Tree_Tropical');
buildTreeCharset('palm', '!$UF_Palm');
buildTreeCharset('tree_cursed', '!$UF_Tree_Cursed');

// Stump charsets
buildStumpCharset('fir_snow', '!$UF_Fir_Snow_Stump');
buildStumpCharset('mangrove', '!$UF_Mangrove_Stump');
buildStumpCharset('tropical', '!$UF_Tropical_Stump');
buildStumpCharset('palm', '!$UF_Palm_Stump');
buildStumpCharset('cursed', '!$UF_Cursed_Stump');

console.log('\n=== Building Cave Flora & Speleothems ===');
generateCaveFloraMaster('glow_caps', renderGlowCaps);
generateCaveFloraMaster('cave_mushrooms', renderCaveMushrooms);
generateCaveFloraMaster('cave_moss', renderCaveMoss);
generateCaveFloraMaster('spore_reeds', renderSporeReeds);
generateCaveFloraMaster('stalagmite', renderStalagmite);
generateCaveFloraMaster('crystal_spire', renderCrystalSpire);

buildCaveFloraCharset('glow_caps', '!$UF_GlowCaps', true, true);
buildCaveFloraCharset('cave_mushrooms', '!$UF_CaveMushrooms', true, true);
buildCaveFloraCharset('cave_moss', '!$UF_CaveMoss', true, true);
buildCaveFloraCharset('spore_reeds', '!$UF_SporeReeds', true, true);
buildCaveFloraCharset('stalagmite', '!$UF_Stalagmite', false, false);
buildCaveFloraCharset('crystal_spire', '!$UF_CrystalSpire', false, false);

console.log('\n=== Building Extended Face Sets ===');
// Trees Extended Face Set
buildFaceSheetNative(
    (idx, cell, isInside) => {
        const specs = [
            { master: 'fir_snow', bg: [[0x45, 0x60, 0x85], [0x85, 0xAA, 0xCA]] },
            { master: 'mangrove', bg: [[0x25, 0x40, 0x35], [0x48, 0x65, 0x55]] },
            { master: 'tree_tropical', bg: [[0x10, 0x45, 0x20], [0x30, 0x85, 0x45]] },
            { master: 'palm', bg: [[0x40, 0x75, 0xA5], [0x8A, 0xC5, 0xEA]] },
            { master: 'tree_cursed', bg: [[0x20, 0x14, 0x2A], [0x45, 0x28, 0x55]] },
            { master: 'fruit_tree_bare', bg: [[0x45, 0x55, 0x75], [0x75, 0x8A, 0xAA]] },
            { master: 'tree_savanna', bg: [[0x8A, 0x50, 0x25], [0xC8, 0x82, 0x40]] },
            { master: 'tree_swamp', bg: [[0x25, 0x35, 0x2E], [0x4D, 0x5D, 0x50]] }
        ];
        renderNativeTreePortrait(cell, isInside, specs[idx].master, specs[idx].bg);
    },
    createLivingOakNative,
    'UF_Faces_Trees_Ex'
);

// Cave Flora Face Set
buildFaceSheetNative(
    (idx, cell, isInside) => {
        const specs = [
            { master: 'glow_caps', bg: [[0x10, 0x18, 0x25], [0x18, 0x28, 0x38]] },
            { master: 'cave_mushrooms', bg: [[0x18, 0x14, 0x20], [0x28, 0x22, 0x32]] },
            { master: 'cave_moss', bg: [[0x10, 0x20, 0x18], [0x1C, 0x32, 0x24]] },
            { master: 'spore_reeds', bg: [[0x14, 0x1E, 0x1C], [0x22, 0x2E, 0x2A]] },
            { master: 'stalagmite', bg: [[0x20, 0x20, 0x28], [0x35, 0x35, 0x40]] },
            { master: 'crystal_spire', bg: [[0x12, 0x18, 0x30], [0x1E, 0x28, 0x48]] },
            { master: 'fir_snow_stump', bg: [[0x30, 0x45, 0x60], [0x50, 0x70, 0x90]] },
            { master: 'mangrove_stump', bg: [[0x18, 0x25, 0x20], [0x2D, 0x3D, 0x35]] }
        ];
        renderNativeSmallFeaturePortrait(cell, isInside, specs[idx].master, specs[idx].bg);
    },
    createStoneArchNative,
    'UF_Faces_CaveFlora'
);

console.log('=== Done building all Batch 3 and Cave Assets! ===');
