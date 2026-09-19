const fs = require('fs');
const path = require('path');
const { writePNG } = require('./png_util');
const { readPNG } = require('./png_read');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// Load palette & prepare CIELAB snapping
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

function setPixel(buf, w, h, x, y, r, g, b, a = 255) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const idx = (y * w + x) * 4;
    buf[idx] = r;
    buf[idx + 1] = g;
    buf[idx + 2] = b;
    buf[idx + 3] = a;
}

function applyDarkOutline(buf, width, height, outlineColor = [24, 14, 8]) {
    const copy = Buffer.from(buf);
    const snappedOutline = pal.snap(...outlineColor);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            if (copy[idx + 3] === 0) continue;

            const isBorder = (
                x === 0 || copy[idx - 4 + 3] === 0 ||
                x === width - 1 || copy[idx + 4 + 3] === 0 ||
                y === 0 || copy[idx - width * 4 + 3] === 0 ||
                y === height - 1 || copy[idx + width * 4 + 3] === 0
            );

            if (isBorder) {
                buf[idx] = snappedOutline[0];
                buf[idx + 1] = snappedOutline[1];
                buf[idx + 2] = snappedOutline[2];
                buf[idx + 3] = 255;
            }
        }
    }
}

function reducePalette(buf, maxColors = 31) {
    const counts = new Map();
    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 0) continue;
        const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
        counts.set(k, (counts.get(k) || 0) + 1);
    }
    if (counts.size <= maxColors) return;

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const topKeys = sorted.slice(0, maxColors).map(e => e[0]);
    const topRgb = topKeys.map(k => [(k >> 16) & 255, (k >> 8) & 255, k & 255]);
    const topLab = topRgb.map(c => srgbToLab(...c));

    const map = new Map();
    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 0) continue;
        const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
        if (map.has(k)) {
            const best = map.get(k);
            buf[i] = best[0]; buf[i + 1] = best[1]; buf[i + 2] = best[2];
            continue;
        }
        const l = srgbToLab(buf[i], buf[i + 1], buf[i + 2]);
        let best = topRgb[0], bd = Infinity;
        for (let j = 0; j < topLab.length; j++) {
            const d = labDist(l, topLab[j]);
            if (d < bd) { bd = d; best = topRgb[j]; }
        }
        map.set(k, best);
        buf[i] = best[0]; buf[i + 1] = best[1]; buf[i + 2] = best[2];
    }
}

function extractFrame(sheetBuf, sheetW, col, row, fw, fh) {
    const out = Buffer.alloc(fw * fh * 4);
    for (let y = 0; y < fh; y++) {
        for (let x = 0; x < fw; x++) {
            const sx = col * fw + x;
            const sy = row * fh + y;
            const sIdx = (sy * sheetW + sx) * 4;
            const dIdx = (y * fw + x) * 4;
            out[dIdx] = sheetBuf[sIdx];
            out[dIdx + 1] = sheetBuf[sIdx + 1];
            out[dIdx + 2] = sheetBuf[sIdx + 2];
            out[dIdx + 3] = sheetBuf[sIdx + 3];
        }
    }
    return out;
}

function blitFrame(destBuf, destW, srcBuf, fw, fh, dx, dy) {
    for (let y = 0; y < fh; y++) {
        for (let x = 0; x < fw; x++) {
            const sIdx = (y * fw + x) * 4;
            if (srcBuf[sIdx + 3] === 0) continue;
            const dIdx = ((dy + y) * destW + (dx + x)) * 4;
            destBuf[dIdx] = srcBuf[sIdx];
            destBuf[dIdx + 1] = srcBuf[sIdx + 1];
            destBuf[dIdx + 2] = srcBuf[sIdx + 2];
            destBuf[dIdx + 3] = srcBuf[sIdx + 3];
        }
    }
}

// -------------------------------------------------------------
// 1. PERFECTED GIANT SPIDER (96x96)
// -------------------------------------------------------------
function buildPerfectSpiderActions(idleSheetBuf) {
    const fw = 96, fh = 96;
    const actions = { idle: [], walk: [], action: [], attack: [], graze: [], hurt: [], death: [] };

    const baseFrames = [];
    for (let r = 0; r < 8; r++) {
        const stand = extractFrame(idleSheetBuf, 288, 0, r, fw, fh);
        const idle1 = extractFrame(idleSheetBuf, 288, 1, r, fw, fh);
        const idle2 = extractFrame(idleSheetBuf, 288, 2, r, fw, fh);
        actions.idle.push([stand, idle1, idle2]);
        baseFrames.push(stand);
    }

    for (let r = 0; r < 8; r++) {
        const b = baseFrames[r];
        const isEast = (r === 5 || r === 6 || r === 7);
        const dirSign = isEast ? 1 : -1;

        // Walk: 8-leg creeping gait
        const w0 = Buffer.alloc(fw * fh * 4);
        const w1 = Buffer.from(b);
        const w2 = Buffer.alloc(fw * fh * 4);
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const idx = (y * fw + x) * 4;
                if (b[idx + 3] === 0) continue;
                const red = b[idx], gr = b[idx + 1], bl = b[idx + 2];
                if (x <= 36) {
                    setPixel(w0, fw, fh, x, y - 2, red, gr, bl);
                    setPixel(w2, fw, fh, x, y + 1, red, gr, bl);
                } else if (x >= 60) {
                    setPixel(w0, fw, fh, x, y + 1, red, gr, bl);
                    setPixel(w2, fw, fh, x, y - 2, red, gr, bl);
                } else {
                    setPixel(w0, fw, fh, x, y, red, gr, bl);
                    setPixel(w2, fw, fh, x, y, red, gr, bl);
                }
            }
        }
        applyDarkOutline(w0, fw, fh, [20, 15, 10]);
        applyDarkOutline(w2, fw, fh, [20, 15, 10]);
        actions.walk.push([w0, w1, w2]);

        // Action: Pedipalps twitch alertly, zero tearing/lines!
        const a0 = Buffer.from(b);
        const a1 = Buffer.from(b);
        const a2 = Buffer.from(b);
        // Animate front pedipalps in f1 and f2
        for (let y = 48; y <= 62; y++) {
            for (let x = 42; x <= 54; x++) {
                const idx = (y * fw + x) * 4;
                if (b[idx + 3] === 0) continue;
                // Lift pedipalp in a1
                setPixel(a1, fw, fh, x, y - 2, b[idx], b[idx + 1], b[idx + 2]);
                // Lower pedipalp in a2
                setPixel(a2, fw, fh, x, y + 1, b[idx], b[idx + 1], b[idx + 2]);
            }
        }
        applyDarkOutline(a1, fw, fh, [20, 15, 10]);
        applyDarkOutline(a2, fw, fh, [20, 15, 10]);
        actions.action.push([a0, a1, a2]);

        // Attack: Rearing up on hind legs, vicious downward strike (NO NEON LINES!)
        const at0 = Buffer.alloc(fw * fh * 4);
        const at1 = Buffer.alloc(fw * fh * 4);
        const at2 = Buffer.alloc(fw * fh * 4);
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const idx = (y * fw + x) * 4;
                if (b[idx + 3] === 0) continue;
                const red = b[idx], gr = b[idx + 1], bl = b[idx + 2];
                // F0: rear up 4px
                setPixel(at0, fw, fh, x, Math.max(0, y - 4), red, gr, bl);
                // F1: lunge forward & downward strike
                setPixel(at1, fw, fh, x + dirSign * 4, Math.min(fh - 1, y + 2), red, gr, bl);
                // F2: recovery
                setPixel(at2, fw, fh, x, y, red, gr, bl);
            }
        }
        applyDarkOutline(at0, fw, fh, [20, 15, 10]);
        applyDarkOutline(at1, fw, fh, [20, 15, 10]);
        applyDarkOutline(at2, fw, fh, [20, 15, 10]);
        actions.attack.push([at0, at1, at2]);

        // Graze: feeding mandibles
        const g0 = Buffer.from(b);
        const g1 = Buffer.from(b);
        const g2 = Buffer.from(b);
        for (let y = 50; y <= 66; y++) {
            for (let x = 44; x <= 52; x++) {
                const idx = (y * fw + x) * 4;
                if (b[idx + 3] === 0) continue;
                setPixel(g1, fw, fh, x, y + 2, b[idx], b[idx + 1], b[idx + 2]);
                setPixel(g2, fw, fh, x, y + 1, b[idx], b[idx + 1], b[idx + 2]);
            }
        }
        actions.graze.push([g0, g1, g2]);

        // Hurt: flinch recoil
        const h0 = Buffer.alloc(fw * fh * 4);
        const h1 = Buffer.alloc(fw * fh * 4);
        const h2 = Buffer.alloc(fw * fh * 4);
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const idx = (y * fw + x) * 4;
                if (b[idx + 3] === 0) continue;
                setPixel(h0, fw, fh, x - dirSign * 4, Math.min(fh - 1, y + 2), b[idx], b[idx + 1], b[idx + 2]);
                setPixel(h1, fw, fh, x - dirSign * 2, y, b[idx], b[idx + 1], b[idx + 2]);
                setPixel(h2, fw, fh, x, y, b[idx], b[idx + 1], b[idx + 2]);
            }
        }
        applyDarkOutline(h0, fw, fh, [20, 15, 10]);
        applyDarkOutline(h1, fw, fh, [20, 15, 10]);
        actions.hurt.push([h0, h1, h2]);

        // Death: tight curled spider on ground
        const d0 = Buffer.alloc(fw * fh * 4);
        const d1 = Buffer.alloc(fw * fh * 4);
        const d2 = Buffer.alloc(fw * fh * 4);
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const idx = (y * fw + x) * 4;
                if (b[idx + 3] === 0) continue;
                const red = b[idx], gr = b[idx + 1], bl = b[idx + 2];
                const cx = 48, cy = 60;
                const dx = x - cx, dy = y - cy;

                // F0: legs hunch in
                const nx0 = Math.round(cx + dx * 0.9);
                const ny0 = Math.min(fh - 1, Math.round(cy + dy * 0.9 + 2));
                setPixel(d0, fw, fh, nx0, ny0, red, gr, bl);

                // F1: legs curl halfway
                const nx1 = Math.round(cx + dx * 0.78);
                const ny1 = Math.min(fh - 1, Math.round(cy + dy * 0.82 + 5));
                setPixel(d1, fw, fh, nx1, ny1, red, gr, bl);

                // F2: curled dead spider
                const nx2 = Math.round(cx + dx * 0.65);
                const ny2 = Math.min(fh - 1, Math.round(cy + dy * 0.72 + 8));
                setPixel(d2, fw, fh, nx2, ny2, red, gr, bl);
            }
        }
        applyDarkOutline(d0, fw, fh, [20, 15, 10]);
        applyDarkOutline(d1, fw, fh, [20, 15, 10]);
        applyDarkOutline(d2, fw, fh, [20, 15, 10]);
        actions.death.push([d0, d1, d2]);
    }

    return actions;
}

// -------------------------------------------------------------
// 2. PERFECTED TROLL (96x96)
// -------------------------------------------------------------
function buildPerfectTrollActions(idleSheetBuf) {
    const fw = 96, fh = 96;
    const actions = { idle: [], walk: [], action: [], attack: [], graze: [], hurt: [], death: [] };

    const baseFrames = [];
    for (let r = 0; r < 8; r++) {
        const stand = extractFrame(idleSheetBuf, 288, 0, r, fw, fh);
        const idle1 = extractFrame(idleSheetBuf, 288, 1, r, fw, fh);
        const idle2 = extractFrame(idleSheetBuf, 288, 2, r, fw, fh);
        actions.idle.push([stand, idle1, idle2]);
        baseFrames.push(stand);
    }

    for (let r = 0; r < 8; r++) {
        const b = baseFrames[r];
        const isEast = (r === 5 || r === 6 || r === 7);
        const dirSign = isEast ? 1 : -1;

        // Walk: heavy lumbering gait
        const w0 = Buffer.alloc(fw * fh * 4);
        const w1 = Buffer.from(b);
        const w2 = Buffer.alloc(fw * fh * 4);
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const idx = (y * fw + x) * 4;
                if (b[idx + 3] === 0) continue;
                const red = b[idx], gr = b[idx + 1], bl = b[idx + 2];
                if (y < 60) {
                    setPixel(w0, fw, fh, x, y, red, gr, bl);
                    setPixel(w2, fw, fh, x, y, red, gr, bl);
                } else {
                    if (x < 48) {
                        setPixel(w0, fw, fh, x, y - 3, red, gr, bl);
                        setPixel(w2, fw, fh, x, y, red, gr, bl);
                    } else {
                        setPixel(w0, fw, fh, x, y, red, gr, bl);
                        setPixel(w2, fw, fh, x, y - 3, red, gr, bl);
                    }
                }
            }
        }
        applyDarkOutline(w0, fw, fh, [20, 15, 10]);
        applyDarkOutline(w2, fw, fh, [20, 15, 10]);
        actions.walk.push([w0, w1, w2]);

        // Action: Roar / chest pump - NO SEAMS, BODY 100% INTACT!
        const a0 = Buffer.from(b);
        const a1 = Buffer.from(b);
        const a2 = Buffer.from(b);

        // Facing-aware roaring mouth in a1:
        if (r === 0) { // South facing: front mouth cavity
            for (let y = 28; y <= 31; y++) {
                for (let x = 46; x <= 50; x++) {
                    const idx = (y * fw + x) * 4;
                    if (b[idx + 3] === 0) continue;
                    // Lower fangs on corners, dark mouth cavity inside
                    if (y === 31 && (x === 46 || x === 50)) {
                        setPixel(a1, fw, fh, x, y, 220, 215, 190); // tusk tip
                    } else {
                        setPixel(a1, fw, fh, x, y, 42, 26, 18); // deep mouth shadow
                    }
                }
            }
        } else if (r === 1 || r === 2 || r === 3) { // West / SW / NW profile
            for (let y = 27; y <= 30; y++) {
                for (let x = 16; x <= 20; x++) {
                    const idx = (y * fw + x) * 4;
                    if (b[idx + 3] === 0) continue;
                    if (y === 30 && x === 17) {
                        setPixel(a1, fw, fh, x, y, 220, 215, 190); // tusk tip
                    } else {
                        setPixel(a1, fw, fh, x, y, 42, 26, 18);
                    }
                }
            }
        } else if (r === 5 || r === 6 || r === 7) { // East / NE / SE profile
            for (let y = 27; y <= 30; y++) {
                for (let x = 75; x <= 79; x++) {
                    const idx = (y * fw + x) * 4;
                    if (b[idx + 3] === 0) continue;
                    if (y === 30 && x === 78) {
                        setPixel(a1, fw, fh, x, y, 220, 215, 190); // tusk tip
                    } else {
                        setPixel(a1, fw, fh, x, y, 42, 26, 18);
                    }
                }
            }
        } // North (r === 4) has no mouth visible from behind

        // Pump arms inward in a1 without tearing
        for (let y = 40; y <= 76; y++) {
            for (let x = 0; x < fw; x++) {
                const idx = (y * fw + x) * 4;
                if (b[idx + 3] === 0) continue;
                if (x <= 32 || x >= 64) {
                    const dx = (x < 48) ? 2 : -2;
                    setPixel(a1, fw, fh, x + dx, y - 1, b[idx], b[idx + 1], b[idx + 2]);
                }
            }
        }
        applyDarkOutline(a1, fw, fh, [20, 15, 10]);
        applyDarkOutline(a2, fw, fh, [20, 15, 10]);
        actions.action.push([a0, a1, a2]);

        // Attack: Overhead two-fisted slam
        const at0 = Buffer.alloc(fw * fh * 4);
        const at1 = Buffer.alloc(fw * fh * 4);
        const at2 = Buffer.alloc(fw * fh * 4);
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const idx = (y * fw + x) * 4;
                if (b[idx + 3] === 0) continue;
                const red = b[idx], gr = b[idx + 1], bl = b[idx + 2];
                setPixel(at0, fw, fh, x - dirSign * 2, Math.max(0, y - 4), red, gr, bl);
                setPixel(at1, fw, fh, x + dirSign * 4, Math.min(fh - 1, y + 2), red, gr, bl);
                setPixel(at2, fw, fh, x, y, red, gr, bl);
            }
        }
        applyDarkOutline(at0, fw, fh, [20, 15, 10]);
        applyDarkOutline(at1, fw, fh, [20, 15, 10]);
        applyDarkOutline(at2, fw, fh, [20, 15, 10]);
        actions.attack.push([at0, at1, at2]);

        // Graze: feeding
        const g0 = Buffer.from(b);
        const g1 = Buffer.from(b);
        const g2 = Buffer.from(b);
        for (let y = 18; y <= 45; y++) {
            for (let x = 36; x <= 60; x++) {
                const idx = (y * fw + x) * 4;
                if (b[idx + 3] === 0) continue;
                setPixel(g1, fw, fh, x, y + 3, b[idx], b[idx + 1], b[idx + 2]);
                setPixel(g2, fw, fh, x, y + 1, b[idx], b[idx + 1], b[idx + 2]);
            }
        }
        actions.graze.push([g0, g1, g2]);

        // Hurt: flinch recoil
        const h0 = Buffer.alloc(fw * fh * 4);
        const h1 = Buffer.alloc(fw * fh * 4);
        const h2 = Buffer.alloc(fw * fh * 4);
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const idx = (y * fw + x) * 4;
                if (b[idx + 3] === 0) continue;
                setPixel(h0, fw, fh, x - dirSign * 2, Math.min(fh - 1, y + 2), b[idx], b[idx + 1], b[idx + 2]);
                setPixel(h1, fw, fh, x - dirSign * 1, y, b[idx], b[idx + 1], b[idx + 2]);
                setPixel(h2, fw, fh, x, y, b[idx], b[idx + 1], b[idx + 2]);
            }
        }
        applyDarkOutline(h0, fw, fh, [20, 15, 10]);
        applyDarkOutline(h1, fw, fh, [20, 15, 10]);
        actions.hurt.push([h0, h1, h2]);

        // Death: collapse forward crashing down
        const d0 = Buffer.alloc(fw * fh * 4);
        const d1 = Buffer.alloc(fw * fh * 4);
        const d2 = Buffer.alloc(fw * fh * 4);
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const idx = (y * fw + x) * 4;
                if (b[idx + 3] === 0) continue;
                const red = b[idx], gr = b[idx + 1], bl = b[idx + 2];
                // F0: knees buckle
                setPixel(d0, fw, fh, x, Math.min(fh - 1, y + 4), red, gr, bl);
                // F1: heavy pitch forward onto ground
                const dy1 = Math.round((y - 48) * 0.75 + 55);
                setPixel(d1, fw, fh, x + dirSign * 3, Math.min(fh - 1, dy1), red, gr, bl);
                // F2: fallen giant mound
                const dy2 = Math.round((y - 48) * 0.55 + 66);
                setPixel(d2, fw, fh, x + dirSign * 5, Math.min(fh - 1, dy2), red, gr, bl);
            }
        }
        applyDarkOutline(d0, fw, fh, [20, 15, 10]);
        applyDarkOutline(d1, fw, fh, [20, 15, 10]);
        applyDarkOutline(d2, fw, fh, [20, 15, 10]);
        actions.death.push([d0, d1, d2]);
    }

    return actions;
}

// -------------------------------------------------------------
// 3. PERFECTED GRIZZLY BEAR (48x48)
// -------------------------------------------------------------
const BEAR_PAL = {
    ink: pal.snap(24, 14, 8),
    darkShadow: pal.snap(52, 30, 14),
    shadow: pal.snap(80, 48, 22),
    midtone: pal.snap(118, 70, 34),
    light: pal.snap(155, 95, 48),
    highlight: pal.snap(192, 122, 68),
    muzzleTan: pal.snap(210, 165, 120),
    muzzleShadow: pal.snap(165, 120, 80),
    noseBlack: pal.snap(20, 15, 12),
    eyeAmber: pal.snap(240, 190, 40),
    clawIvory: pal.snap(230, 220, 200),
    clawBase: pal.snap(160, 150, 130)
};

function transformBoarFrameToGrizzlyBear(srcBuf, fw, fh, facingRow, colIdx) {
    const out = Buffer.alloc(fw * fh * 4);
    const isSouth = (facingRow === 0);
    const isSW = (facingRow === 1);
    const isWest = (facingRow === 2);
    const isNW = (facingRow === 3);
    const isNorth = (facingRow === 4);
    const isNE = (facingRow === 5);
    const isEast = (facingRow === 6);
    const isSE = (facingRow === 7);

    // 1. Recolor coat from boar palette to rich warm grizzly bear palette
    for (let y = 0; y < fh; y++) {
        for (let x = 0; x < fw; x++) {
            const idx = (y * fw + x) * 4;
            if (srcBuf[idx + 3] === 0) continue;

            const r = srcBuf[idx], g = srcBuf[idx + 1], b = srcBuf[idx + 2];
            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

            let c = null;
            // Remove white tusks, replace with fur or muzzle shadow
            const isTusk = (r > 190 && g > 180 && b > 160 && y >= 25 && y <= 35);
            if (isTusk) {
                c = BEAR_PAL.shadow;
            } else if (brightness < 35) {
                c = BEAR_PAL.ink;
            } else if (brightness < 60) {
                c = BEAR_PAL.darkShadow;
            } else if (brightness < 95) {
                c = BEAR_PAL.shadow;
            } else if (brightness < 135) {
                c = BEAR_PAL.midtone;
            } else if (brightness < 175) {
                c = BEAR_PAL.light;
            } else {
                c = BEAR_PAL.highlight;
            }

            out[idx] = c[0];
            out[idx + 1] = c[1];
            out[idx + 2] = c[2];
            out[idx + 3] = 255;
        }
    }

    // 2. Sculpt Bear Features using verified coordinates (standing, walking, action, attack):
    if (colIdx < 14) {
        if (isSouth) {
            // Rounded bear ears on existing head contour (y: 20..22)
            for (let y = 20; y <= 22; y++) {
                for (let x of [14, 15, 16, 28, 29, 30]) {
                    const idx = (y * fw + x) * 4;
                    if (out[idx + 3] !== 0) {
                        const c = (y === 21 && (x === 15 || x === 29)) ? BEAR_PAL.darkShadow : BEAR_PAL.highlight;
                        out[idx] = c[0]; out[idx + 1] = c[1]; out[idx + 2] = c[2];
                    }
                }
            }
            // Tan bear muzzle contoured naturally on snout:
            const muzzleMap = [
                // y = 26: Nose
                [26, 23, BEAR_PAL.noseBlack], [26, 24, BEAR_PAL.noseBlack],
                // y = 27: Upper muzzle
                [27, 22, BEAR_PAL.muzzleTan], [27, 23, BEAR_PAL.muzzleTan], [27, 24, BEAR_PAL.muzzleTan], [27, 25, BEAR_PAL.muzzleTan],
                // y = 28: Center muzzle
                [28, 21, BEAR_PAL.muzzleShadow], [28, 22, BEAR_PAL.muzzleTan], [28, 23, BEAR_PAL.muzzleTan], [28, 24, BEAR_PAL.muzzleTan], [28, 25, BEAR_PAL.muzzleTan], [28, 26, BEAR_PAL.muzzleShadow],
                // y = 29: Mouth line
                [29, 21, BEAR_PAL.shadow], [29, 22, BEAR_PAL.muzzleShadow], [29, 23, BEAR_PAL.ink], [29, 24, BEAR_PAL.ink], [29, 25, BEAR_PAL.muzzleShadow], [29, 26, BEAR_PAL.shadow],
                // y = 30: Chin
                [30, 22, BEAR_PAL.shadow], [30, 23, BEAR_PAL.muzzleShadow], [30, 24, BEAR_PAL.muzzleShadow], [30, 25, BEAR_PAL.shadow],
            ];
            for (const [my, mx, col] of muzzleMap) {
                const idx = (my * fw + mx) * 4;
                if (out[idx + 3] !== 0) {
                    out[idx] = col[0]; out[idx + 1] = col[1]; out[idx + 2] = col[2];
                }
            }
            // Amber eyes (y: 22, x: 18 and 26)
            const eyeL = (22 * fw + 18) * 4;
            const eyeR = (22 * fw + 26) * 4;
            if (out[eyeL + 3] !== 0) {
                out[eyeL] = BEAR_PAL.eyeAmber[0]; out[eyeL+1] = BEAR_PAL.eyeAmber[1]; out[eyeL+2] = BEAR_PAL.eyeAmber[2];
            }
            if (out[eyeR + 3] !== 0) {
                out[eyeR] = BEAR_PAL.eyeAmber[0]; out[eyeR+1] = BEAR_PAL.eyeAmber[1]; out[eyeR+2] = BEAR_PAL.eyeAmber[2];
            }
            // Claws on paws at ground (y: 46)
            for (let x of [13, 14, 15, 30, 31, 32]) {
                const idx = (46 * fw + x) * 4;
                if (out[idx + 3] !== 0) {
                    out[idx] = BEAR_PAL.clawIvory[0]; out[idx+1] = BEAR_PAL.clawIvory[1]; out[idx+2] = BEAR_PAL.clawIvory[2];
                }
            }
        } else if (isWest || isSW || isNW) {
            // Side/diagonal: Shoulder hump crest on upper back (y: 16..20, x: 22..28)
            for (let y = 16; y <= 20; y++) {
                for (let x = 22; x <= 28; x++) {
                    const idx = (y * fw + x) * 4;
                    if (out[idx + 3] !== 0) {
                        const c = (y <= 17) ? BEAR_PAL.highlight : BEAR_PAL.light;
                        out[idx] = c[0]; out[idx + 1] = c[1]; out[idx + 2] = c[2];
                    }
                }
            }
            // Rounded ear (y: 17..21, x: 15..19)
            for (let y = 17; y <= 21; y++) {
                for (let x = 16; x <= 19; x++) {
                    const idx = (y * fw + x) * 4;
                    if (out[idx + 3] !== 0) {
                        const c = (x === 17 && y === 19) ? BEAR_PAL.darkShadow : BEAR_PAL.highlight;
                        out[idx] = c[0]; out[idx + 1] = c[1]; out[idx + 2] = c[2];
                    }
                }
            }
            // Tan bear muzzle on real snout tip (y: 28..34, x: 2..8)
            for (let y = 28; y <= 34; y++) {
                for (let x = 2; x <= 8; x++) {
                    const idx = (y * fw + x) * 4;
                    if (out[idx + 3] !== 0) {
                        let c = (y >= 31) ? BEAR_PAL.muzzleShadow : BEAR_PAL.muzzleTan;
                        if (x <= 4 && y === 29) c = BEAR_PAL.noseBlack;
                        out[idx] = c[0]; out[idx + 1] = c[1]; out[idx + 2] = c[2];
                    }
                }
            }
            // Amber eye (y: 24, x: 10)
            const eyeIdx = (24 * fw + 10) * 4;
            if (out[eyeIdx + 3] !== 0) {
                out[eyeIdx] = BEAR_PAL.eyeAmber[0]; out[eyeIdx+1] = BEAR_PAL.eyeAmber[1]; out[eyeIdx+2] = BEAR_PAL.eyeAmber[2];
            }
            // Ivory claws on front paw (y: 46, x: 8..12)
            for (let x = 8; x <= 12; x++) {
                const idx = (46 * fw + x) * 4;
                if (out[idx + 3] !== 0) {
                    out[idx] = BEAR_PAL.clawIvory[0]; out[idx+1] = BEAR_PAL.clawIvory[1]; out[idx+2] = BEAR_PAL.clawIvory[2];
                }
            }
        } else if (isEast || isNE || isSE) {
            // Mirrored side/diagonal: Shoulder hump crest (y: 16..20, x: 19..25)
            for (let y = 16; y <= 20; y++) {
                for (let x = 19; x <= 25; x++) {
                    const idx = (y * fw + x) * 4;
                    if (out[idx + 3] !== 0) {
                        const c = (y <= 17) ? BEAR_PAL.highlight : BEAR_PAL.light;
                        out[idx] = c[0]; out[idx + 1] = c[1]; out[idx + 2] = c[2];
                    }
                }
            }
            // Rounded ear (y: 17..21, x: 28..31)
            for (let y = 17; y <= 21; y++) {
                for (let x = 28; x <= 31; x++) {
                    const idx = (y * fw + x) * 4;
                    if (out[idx + 3] !== 0) {
                        const c = (x === 30 && y === 19) ? BEAR_PAL.darkShadow : BEAR_PAL.highlight;
                        out[idx] = c[0]; out[idx + 1] = c[1]; out[idx + 2] = c[2];
                    }
                }
            }
            // Tan bear muzzle on real snout tip (y: 28..34, x: 39..45)
            for (let y = 28; y <= 34; y++) {
                for (let x = 39; x <= 45; x++) {
                    const idx = (y * fw + x) * 4;
                    if (out[idx + 3] !== 0) {
                        let c = (y >= 31) ? BEAR_PAL.muzzleShadow : BEAR_PAL.muzzleTan;
                        if (x >= 43 && y === 29) c = BEAR_PAL.noseBlack;
                        out[idx] = c[0]; out[idx + 1] = c[1]; out[idx + 2] = c[2];
                    }
                }
            }
            // Amber eye (y: 24, x: 37)
            const eyeIdx = (24 * fw + 37) * 4;
            if (out[eyeIdx + 3] !== 0) {
                out[eyeIdx] = BEAR_PAL.eyeAmber[0]; out[eyeIdx+1] = BEAR_PAL.eyeAmber[1]; out[eyeIdx+2] = BEAR_PAL.eyeAmber[2];
            }
            // Ivory claws on front paw (y: 46, x: 35..39)
            for (let x = 35; x <= 39; x++) {
                const idx = (46 * fw + x) * 4;
                if (out[idx + 3] !== 0) {
                    out[idx] = BEAR_PAL.clawIvory[0]; out[idx+1] = BEAR_PAL.clawIvory[1]; out[idx+2] = BEAR_PAL.clawIvory[2];
                }
            }
        } else if (isNorth) {
            // North: Back of head & rounded ears on existing silhouette
            for (let y = 19; y <= 21; y++) {
                for (let x of [15, 16, 17, 29, 30, 31]) {
                    const idx = (y * fw + x) * 4;
                    if (out[idx + 3] !== 0) {
                        out[idx] = BEAR_PAL.highlight[0]; out[idx + 1] = BEAR_PAL.highlight[1]; out[idx + 2] = BEAR_PAL.highlight[2];
                    }
                }
            }
        }
    }

    applyDarkOutline(out, fw, fh, [24, 14, 8]);
    return out;
}

function assembleMasterSheet(actionGrids, cols, rows, fw, fh, outPath, sidecarJson) {
    const sheetW = fw * cols;
    const sheetH = fh * rows;
    const buf = Buffer.alloc(sheetW * sheetH * 4);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const frameBuf = actionGrids[r][c];
            blitFrame(buf, sheetW, frameBuf, fw, fh, c * fw, r * fh);
        }
    }

    reducePalette(buf, 31);
    writePNG(outPath, sheetW, sheetH, buf);
    fs.writeFileSync(outPath.replace(/\.png$/, '.json'), JSON.stringify(sidecarJson, null, 2) + '\n');
}

function assembleAR600Master(actions, fw, fh, outPath, sidecarJson) {
    const cols = 20, rows = 8;
    const sheetW = fw * cols, sheetH = fh * rows;
    const buf = Buffer.alloc(sheetW * sheetH * 4);

    for (let r = 0; r < rows; r++) {
        blitFrame(buf, sheetW, actions.idle[r][0], fw, fh, 0 * fw, r * fh);
        for (let c = 0; c < 3; c++) blitFrame(buf, sheetW, actions.walk[r][c], fw, fh, (1 + c) * fw, r * fh);
        for (let c = 0; c < 3; c++) blitFrame(buf, sheetW, actions.action[r][c], fw, fh, (4 + c) * fw, r * fh);
        blitFrame(buf, sheetW, actions.idle[r][0], fw, fh, 7 * fw, r * fh);
        for (let c = 0; c < 3; c++) blitFrame(buf, sheetW, actions.attack[r][c], fw, fh, (8 + c) * fw, r * fh);
        blitFrame(buf, sheetW, actions.hurt[r][0], fw, fh, 14 * fw, r * fh);
        for (let c = 0; c < 3; c++) blitFrame(buf, sheetW, actions.death[r][c], fw, fh, (15 + c) * fw, r * fh);
        blitFrame(buf, sheetW, actions.idle[r][1], fw, fh, 18 * fw, r * fh);
        blitFrame(buf, sheetW, actions.idle[r][2], fw, fh, 19 * fw, r * fh);
    }

    reducePalette(buf, 31);
    writePNG(outPath, sheetW, sheetH, buf);
    fs.writeFileSync(outPath.replace(/\.png$/, '.json'), JSON.stringify(sidecarJson, null, 2) + '\n');
}

function renderReviewShowcase(name, actions, fw, fh, outPath) {
    const scale = 4;
    const cols = 7, rows = 5;
    const pad = 12 * scale;
    const frameScaledW = fw * scale, frameScaledH = fh * scale;
    const canvasW = cols * frameScaledW + (cols + 1) * pad;
    const canvasH = rows * frameScaledH + (rows + 1) * pad;
    const buf = Buffer.alloc(canvasW * canvasH * 4);

    for (let i = 0; i < canvasW * canvasH; i++) {
        buf[i * 4] = 61; buf[i * 4 + 1] = 74; buf[i * 4 + 2] = 56; buf[i * 4 + 3] = 255;
    }

    const rowMap = [0, 2, 6, 4];
    for (let r = 0; r < 4; r++) {
        const srcRow = rowMap[r];
        const frames = [
            actions.idle[srcRow][0],
            actions.walk[srcRow][1],
            actions.action[srcRow][1],
            actions.attack[srcRow][1],
            actions.graze[srcRow][1],
            actions.hurt[srcRow][0],
            actions.death[srcRow][2]
        ];

        for (let c = 0; c < cols; c++) {
            const f = frames[c];
            const startX = pad + c * (frameScaledW + pad);
            const startY = pad + r * (frameScaledH + pad);
            for (let y = 0; y < fh; y++) {
                for (let x = 0; x < fw; x++) {
                    const sIdx = (y * fw + x) * 4;
                    if (f[sIdx + 3] === 0) continue;
                    for (let sy = 0; sy < scale; sy++) {
                        for (let sx = 0; sx < scale; sx++) {
                            const dIdx = ((startY + y * scale + sy) * canvasW + (startX + x * scale + sx)) * 4;
                            buf[dIdx] = f[sIdx];
                            buf[dIdx + 1] = f[sIdx + 1];
                            buf[dIdx + 2] = f[sIdx + 2];
                            buf[dIdx + 3] = 255;
                        }
                    }
                }
            }
        }
    }

    // Row 4: Carcass
    const carcassFrame = actions.death[2][2];
    const cStartX = pad + (cols - 1) * (frameScaledW + pad);
    const cStartY = pad + 4 * (frameScaledH + pad);
    for (let y = 0; y < fh; y++) {
        for (let x = 0; x < fw; x++) {
            const sIdx = (y * fw + x) * 4;
            if (carcassFrame[sIdx + 3] === 0) continue;
            for (let sy = 0; sy < scale; sy++) {
                for (let sx = 0; sx < scale; sx++) {
                    const dIdx = ((cStartY + y * scale + sy) * canvasW + (cStartX + x * scale + sx)) * 4;
                    buf[dIdx] = carcassFrame[sIdx];
                    buf[dIdx + 1] = carcassFrame[sIdx + 1];
                    buf[dIdx + 2] = carcassFrame[sIdx + 2];
                    buf[dIdx + 3] = 255;
                }
            }
        }
    }

    writePNG(outPath, canvasW, canvasH, buf);
    console.log(`[SHOWCASE] Saved ${outPath}`);
}

async function main() {
    console.log('=== Executing Pixel-Perfect Refinement for Bear, Troll, and Giant Spider ===');
    const actNames = ['idle', 'walk', 'action', 'attack', 'graze', 'hurt', 'death'];

    // 1. PROCESS BEAR
    console.log('--- Processing Grizzly Bear (48x48) ---');
    const boarMaster = readPNG(path.join(ROOT, 'art', 'masters', 'boar_master_8way.png'));
    const fw = 48, fh = 48;
    const cols = 20, rows = 8;
    const bearMasterBuf = Buffer.alloc(960 * 384 * 4);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const srcFrame = Buffer.alloc(fw * fh * 4);
            for (let y = 0; y < fh; y++) {
                for (let x = 0; x < fw; x++) {
                    const sIdx = ((r * fh + y) * 960 + (c * fw + x)) * 4;
                    const dIdx = (y * fw + x) * 4;
                    srcFrame[dIdx] = boarMaster.data[sIdx];
                    srcFrame[dIdx + 1] = boarMaster.data[sIdx + 1];
                    srcFrame[dIdx + 2] = boarMaster.data[sIdx + 2];
                    srcFrame[dIdx + 3] = boarMaster.data[sIdx + 3];
                }
            }

            if (srcFrame.some((val, idx) => idx % 4 === 3 && val !== 0)) {
                const bearFrame = transformBoarFrameToGrizzlyBear(srcFrame, fw, fh, r, c);
                for (let y = 0; y < fh; y++) {
                    for (let x = 0; x < fw; x++) {
                        const sIdx = (y * fw + x) * 4;
                        const dIdx = ((r * fh + y) * 960 + (c * fw + x)) * 4;
                        bearMasterBuf[dIdx] = bearFrame[sIdx];
                        bearMasterBuf[dIdx + 1] = bearFrame[sIdx + 1];
                        bearMasterBuf[dIdx + 2] = bearFrame[sIdx + 2];
                        bearMasterBuf[dIdx + 3] = bearFrame[sIdx + 3];
                    }
                }
            }
        }
    }

    const bearActions = { idle: [], walk: [], action: [], attack: [], graze: [], hurt: [], death: [] };
    function getBearFrame(r, c) {
        const out = Buffer.alloc(fw * fh * 4);
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const sIdx = ((r * fh + y) * 960 + (c * fw + x)) * 4;
                const dIdx = (y * fw + x) * 4;
                out[dIdx] = bearMasterBuf[sIdx];
                out[dIdx + 1] = bearMasterBuf[sIdx + 1];
                out[dIdx + 2] = bearMasterBuf[sIdx + 2];
                out[dIdx + 3] = bearMasterBuf[sIdx + 3];
            }
        }
        return out;
    }

    for (let r = 0; r < rows; r++) {
        bearActions.idle.push([getBearFrame(r, 0), getBearFrame(r, 18), getBearFrame(r, 19)]);
        bearActions.walk.push([getBearFrame(r, 1), getBearFrame(r, 2), getBearFrame(r, 3)]);
        bearActions.action.push([getBearFrame(r, 4), getBearFrame(r, 5), getBearFrame(r, 6)]);
        bearActions.attack.push([getBearFrame(r, 8), getBearFrame(r, 9), getBearFrame(r, 10)]);
        bearActions.graze.push([getBearFrame(r, 4), getBearFrame(r, 5), getBearFrame(r, 6)]);
        bearActions.hurt.push([getBearFrame(r, 14), getBearFrame(r, 14), getBearFrame(r, 14)]);
        bearActions.death.push([getBearFrame(r, 15), getBearFrame(r, 16), getBearFrame(r, 17)]);
    }

    for (const act of actNames) {
        assembleMasterSheet(bearActions[act], 3, 8, 48, 48,
            path.join(ROOT, 'art', 'masters', `bear_${act}.png`),
            { id: `bear_${act}`, species: 'bear', frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1], facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"], frameMs: 150, category: 'wildlife' }
        );
    }

    assembleAR600Master(bearActions, 48, 48,
        path.join(ROOT, 'art', 'masters', 'bear_master_8way.png'),
        { id: 'bear_master_8way', species: 'bear', frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1], facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"], frameMs: 150, category: 'wildlife' }
    );

    // Character Sheet: $UF_Bear.png (144x192)
    const bearRmmzBuf = Buffer.alloc(144 * 192 * 4);
    const rmmzRows = [0, 2, 6, 4];
    for (let r = 0; r < 4; r++) {
        const srcRow = rmmzRows[r];
        const step1 = bearActions.walk[srcRow][0];
        const stand = bearActions.idle[srcRow][0];
        const step2 = bearActions.walk[srcRow][2];
        const frames = [step1, stand, step2];
        for (let c = 0; c < 3; c++) {
            blitFrame(bearRmmzBuf, 144, frames[c], 48, 48, c * 48, r * 48);
        }
    }
    reducePalette(bearRmmzBuf, 31);
    const bearRmmzPath = path.join(ROOT, 'game', 'img', 'characters', '$UF_Bear.png');
    writePNG(bearRmmzPath, 144, 192, bearRmmzBuf);
    fs.writeFileSync(bearRmmzPath.replace(/\.png$/, '.json'), JSON.stringify({
        id: "UF_Bear",
        name: "Bear",
        category: "wildlife",
        kind: "predator",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: { stand: [1], walk: [0, 1, 2, 1], idle: [0, 1, 2, 1], attack: [0, 1, 2] },
        frameMs: 150
    }, null, 2) + '\n');

    // 8D Sheet: $UF_Bear_8D.png (144x384)
    const bear8DBuf = Buffer.alloc(144 * 384 * 4);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < 3; c++) {
            blitFrame(bear8DBuf, 144, bearActions.walk[r][c], 48, 48, c * 48, r * 48);
        }
    }
    reducePalette(bear8DBuf, 31);
    const bear8DPath = path.join(ROOT, 'game', 'img', 'characters', '$UF_Bear_8D.png');
    writePNG(bear8DPath, 144, 384, bear8DBuf);
    fs.writeFileSync(bear8DPath.replace(/\.png$/, '.json'), JSON.stringify({
        id: "UF_Bear_8D",
        name: "Bear",
        category: "wildlife",
        kind: "predator",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"],
        animations: { stand: [1], walk: [0, 1, 2, 1], idle: [0, 1, 2, 1], attack: [0, 1, 2] },
        frameMs: 150
    }, null, 2) + '\n');

    // Carcass: !$UF_Bear_Carcass.png (144x192)
    const bearCarcassBuf = Buffer.alloc(144 * 192 * 4);
    blitFrame(bearCarcassBuf, 144, bearActions.death[2][2], 48, 48, 48, 0);
    reducePalette(bearCarcassBuf, 31);
    const bearCarcassPath = path.join(ROOT, 'game', 'img', 'characters', '!$UF_Bear_Carcass.png');
    writePNG(bearCarcassPath, 144, 192, bearCarcassBuf);
    fs.writeFileSync(bearCarcassPath.replace(/\.png$/, '.json'), JSON.stringify({
        id: "UF_Bear_Carcass",
        name: "Bear Carcass",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: { stand: [0] },
        passable: true,
        layer: "under",
        category: "remains"
    }, null, 2) + '\n');

    renderReviewShowcase('bear', bearActions, 48, 48, path.join(ROOT, 'art', 'review', 'bear_actions_showcase_4x.png'));
    console.log('[SUCCESS] Refined Bear suite complete!');

    // 2. PROCESS GIANT SPIDER
    console.log('--- Processing Giant Spider (96x96) ---');
    const spiderIdleImg = readPNG(path.join(ROOT, 'art', 'masters', 'giant_spider_idle.png'));
    const spiderActions = buildPerfectSpiderActions(spiderIdleImg.data);

    for (const act of actNames) {
        assembleMasterSheet(spiderActions[act], 3, 8, 96, 96,
            path.join(ROOT, 'art', 'masters', `giant_spider_${act}.png`),
            { id: `giant_spider_${act}`, species: 'giant_spider', frameWidth: 96, frameHeight: 96, anchor: [48, 95], footprint: [2, 2], facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"], frameMs: 150, category: 'wildlife' }
        );
    }

    assembleAR600Master(spiderActions, 96, 96,
        path.join(ROOT, 'art', 'masters', 'giant_spider_master_8way.png'),
        { id: 'giant_spider_master_8way', species: 'giant_spider', frameWidth: 96, frameHeight: 96, anchor: [48, 95], footprint: [2, 2], facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"], frameMs: 150, category: 'wildlife' }
    );

    // 8D Sheet: $UF_GiantSpider_8D.png (288x768)
    const spider8DBuf = Buffer.alloc(288 * 768 * 4);
    for (let r = 0; r < 8; r++) {
        for (let col = 0; col < 3; col++) {
            blitFrame(spider8DBuf, 288, spiderActions.walk[r][col], 96, 96, col * 96, r * 96);
        }
    }
    reducePalette(spider8DBuf, 31);
    const spider8DPath = path.join(ROOT, 'game', 'img', 'characters', '$UF_GiantSpider_8D.png');
    writePNG(spider8DPath, 288, 768, spider8DBuf);
    fs.writeFileSync(spider8DPath.replace(/\.png$/, '.json'), JSON.stringify({
        id: "UF_GiantSpider_8D",
        name: "Giant Spider",
        category: "wildlife",
        kind: "predator",
        frameWidth: 96,
        frameHeight: 96,
        anchor: [48, 95],
        footprint: [2, 2],
        facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"],
        animations: { stand: [1], walk: [0, 1, 2, 1], idle: [0, 1, 2, 1], attack: [0, 1, 2] },
        frameMs: 150
    }, null, 2) + '\n');

    // Carcass: !$UF_GiantSpider_Carcass.png (288x384)
    const spiderCarcassBuf = Buffer.alloc(288 * 384 * 4);
    blitFrame(spiderCarcassBuf, 288, spiderActions.death[0][2], 96, 96, 96, 0);
    reducePalette(spiderCarcassBuf, 31);
    const spiderCarcassPath = path.join(ROOT, 'game', 'img', 'characters', '!$UF_GiantSpider_Carcass.png');
    writePNG(spiderCarcassPath, 288, 384, spiderCarcassBuf);
    fs.writeFileSync(spiderCarcassPath.replace(/\.png$/, '.json'), JSON.stringify({
        id: "UF_GiantSpider_Carcass",
        name: "Giant Spider Carcass",
        frameWidth: 96,
        frameHeight: 96,
        anchor: [48, 95],
        footprint: [2, 2],
        facings: ["S", "W", "E", "N"],
        animations: { stand: [0] },
        passable: true,
        layer: "under",
        category: "remains"
    }, null, 2) + '\n');

    renderReviewShowcase('giant_spider', spiderActions, 96, 96, path.join(ROOT, 'art', 'review', 'giant_spider_actions_showcase_4x.png'));
    console.log('[SUCCESS] Refined Giant Spider suite complete!');

    // 3. PROCESS TROLL
    console.log('--- Processing Troll (96x96) ---');
    const trollIdleImg = readPNG(path.join(ROOT, 'art', 'masters', 'troll_idle.png'));
    const trollActions = buildPerfectTrollActions(trollIdleImg.data);

    for (const act of actNames) {
        assembleMasterSheet(trollActions[act], 3, 8, 96, 96,
            path.join(ROOT, 'art', 'masters', `troll_${act}.png`),
            { id: `troll_${act}`, species: 'troll', frameWidth: 96, frameHeight: 96, anchor: [48, 95], footprint: [2, 2], facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"], frameMs: 150, category: 'wildlife' }
        );
    }

    assembleAR600Master(trollActions, 96, 96,
        path.join(ROOT, 'art', 'masters', 'troll_master_8way.png'),
        { id: 'troll_master_8way', species: 'troll', frameWidth: 96, frameHeight: 96, anchor: [48, 95], footprint: [2, 2], facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"], frameMs: 150, category: 'wildlife' }
    );

    // 8D Sheet: $UF_Troll_8D.png (288x768)
    const troll8DBuf = Buffer.alloc(288 * 768 * 4);
    for (let r = 0; r < 8; r++) {
        for (let col = 0; col < 3; col++) {
            blitFrame(troll8DBuf, 288, trollActions.walk[r][col], 96, 96, col * 96, r * 96);
        }
    }
    reducePalette(troll8DBuf, 31);
    const troll8DPath = path.join(ROOT, 'game', 'img', 'characters', '$UF_Troll_8D.png');
    writePNG(troll8DPath, 288, 768, troll8DBuf);
    fs.writeFileSync(troll8DPath.replace(/\.png$/, '.json'), JSON.stringify({
        id: "UF_Troll_8D",
        name: "Troll",
        category: "wildlife",
        kind: "monster",
        frameWidth: 96,
        frameHeight: 96,
        anchor: [48, 95],
        footprint: [2, 2],
        facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"],
        animations: { stand: [1], walk: [0, 1, 2, 1], idle: [0, 1, 2, 1], attack: [0, 1, 2] },
        frameMs: 150
    }, null, 2) + '\n');

    // Carcass: !$UF_Troll_Carcass.png (288x384)
    const trollCarcassBuf = Buffer.alloc(288 * 384 * 4);
    blitFrame(trollCarcassBuf, 288, trollActions.death[0][2], 96, 96, 96, 0);
    reducePalette(trollCarcassBuf, 31);
    const trollCarcassPath = path.join(ROOT, 'game', 'img', 'characters', '!$UF_Troll_Carcass.png');
    writePNG(trollCarcassPath, 288, 384, trollCarcassBuf);
    fs.writeFileSync(trollCarcassPath.replace(/\.png$/, '.json'), JSON.stringify({
        id: "UF_Troll_Carcass",
        name: "Troll Carcass",
        frameWidth: 96,
        frameHeight: 96,
        anchor: [48, 95],
        footprint: [2, 2],
        facings: ["S", "W", "E", "N"],
        animations: { stand: [0] },
        passable: true,
        layer: "under",
        category: "remains"
    }, null, 2) + '\n');

    renderReviewShowcase('troll', trollActions, 96, 96, path.join(ROOT, 'art', 'review', 'troll_actions_showcase_4x.png'));
    console.log('[SUCCESS] Refined Troll suite complete!');

    console.log('=== All Refinements Successfully Completed! ===');
}

main().catch(console.error);
