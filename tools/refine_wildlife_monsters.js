const fs = require('fs');
const path = require('path');
const { writePNG } = require('./png_util');
const { readPNG } = require('./png_read');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// CIELAB Palette Snapping
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

function getPixel(buf, w, h, x, y) {
    if (x < 0 || x >= w || y < 0 || y >= h) return [0, 0, 0, 0];
    const idx = (y * w + x) * 4;
    return [buf[idx], buf[idx + 1], buf[idx + 2], buf[idx + 3]];
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

function mirrorFrameH(buf, w, h) {
    const out = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const sIdx = (y * w + x) * 4;
            const dIdx = (y * w + (w - 1 - x)) * 4;
            out[dIdx] = buf[sIdx];
            out[dIdx + 1] = buf[sIdx + 1];
            out[dIdx + 2] = buf[sIdx + 2];
            out[dIdx + 3] = buf[sIdx + 3];
        }
    }
    return out;
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
// 1. REFINED GIANT SPIDER ACTION SYNTHESIS (96x96)
// -------------------------------------------------------------
function buildRefinedSpiderActions(idleSheetBuf) {
    const fw = 96, fh = 96;
    const actions = {
        idle: [],
        walk: [],
        action: [],
        attack: [],
        graze: [],
        hurt: [],
        death: []
    };

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

        // 1. Walk: 8-leg creeping gait (alternating leg spans)
        const w0 = Buffer.alloc(fw * fh * 4);
        const w1 = Buffer.from(b);
        const w2 = Buffer.alloc(fw * fh * 4);
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const idx = (y * fw + x) * 4;
                if (b[idx + 3] === 0) continue;
                const red = b[idx], gr = b[idx + 1], bl = b[idx + 2];
                const isLegLeft = (x <= 36);
                const isLegRight = (x >= 60);
                if (isLegLeft) {
                    setPixel(w0, fw, fh, x, y - 2, red, gr, bl);
                    setPixel(w2, fw, fh, x, y + 1, red, gr, bl);
                } else if (isLegRight) {
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

        // 2. Action: Pedipalp / fang alert twitch & abdomen breathing (NO DIAGNOSTIC LINES!)
        const a0 = Buffer.from(b);
        const a1 = Buffer.alloc(fw * fh * 4);
        const a2 = Buffer.alloc(fw * fh * 4);
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const idx = (y * fw + x) * 4;
                if (b[idx + 3] === 0) continue;
                const red = b[idx], gr = b[idx + 1], bl = b[idx + 2];
                
                // Pedipalps and head area (around center head)
                const isHeadMouth = (Math.abs(x - 48) <= 10 && y >= 50 && y <= 66);
                const isAbdomenTip = (Math.abs(x - 48) <= 12 && y >= 72 && y <= 86);

                if (isHeadMouth) {
                    setPixel(a1, fw, fh, x, y - 1, red, gr, bl);
                    setPixel(a2, fw, fh, x, y + 1, red, gr, bl);
                } else if (isAbdomenTip) {
                    setPixel(a1, fw, fh, x, y + 1, red, gr, bl);
                    setPixel(a2, fw, fh, x, y, red, gr, bl);
                } else {
                    setPixel(a1, fw, fh, x, y, red, gr, bl);
                    setPixel(a2, fw, fh, x, y, red, gr, bl);
                }
            }
        }
        applyDarkOutline(a1, fw, fh, [20, 15, 10]);
        applyDarkOutline(a2, fw, fh, [20, 15, 10]);
        actions.action.push([a0, a1, a2]);

        // 3. Attack: Spider rearing up & striking with fangs (NO NEON LINES!)
        const at0 = Buffer.alloc(fw * fh * 4);
        const at1 = Buffer.alloc(fw * fh * 4);
        const at2 = Buffer.alloc(fw * fh * 4);
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const idx = (y * fw + x) * 4;
                if (b[idx + 3] === 0) continue;
                const red = b[idx], gr = b[idx + 1], bl = b[idx + 2];
                // Frame 0: rear up 4px, front legs flared
                const isFrontLeg = (y <= 58 && (x <= 34 || x >= 62));
                const dy0 = isFrontLeg ? -6 : -3;
                setPixel(at0, fw, fh, x, Math.max(0, y + dy0), red, gr, bl);

                // Frame 1: lunge forward and snap down!
                setPixel(at1, fw, fh, x + dirSign * 4, Math.min(fh - 1, y + 2), red, gr, bl);

                // Frame 2: recovery
                setPixel(at2, fw, fh, x, y, red, gr, bl);
            }
        }
        applyDarkOutline(at0, fw, fh, [20, 15, 10]);
        applyDarkOutline(at1, fw, fh, [20, 15, 10]);
        applyDarkOutline(at2, fw, fh, [20, 15, 10]);
        actions.attack.push([at0, at1, at2]);

        // 4. Graze: feeding mandibles
        const g0 = Buffer.alloc(fw * fh * 4);
        const g1 = Buffer.alloc(fw * fh * 4);
        const g2 = Buffer.alloc(fw * fh * 4);
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const idx = (y * fw + x) * 4;
                if (b[idx + 3] === 0) continue;
                const red = b[idx], gr = b[idx + 1], bl = b[idx + 2];
                if (y >= 45 && y <= 65 && Math.abs(x - 48) <= 12) {
                    setPixel(g0, fw, fh, x, y + 2, red, gr, bl);
                    setPixel(g1, fw, fh, x, y + 3, red, gr, bl);
                    setPixel(g2, fw, fh, x, y + 1, red, gr, bl);
                } else {
                    setPixel(g0, fw, fh, x, y, red, gr, bl);
                    setPixel(g1, fw, fh, x, y, red, gr, bl);
                    setPixel(g2, fw, fh, x, y, red, gr, bl);
                }
            }
        }
        actions.graze.push([g0, g1, g2]);

        // 5. Hurt: flinch recoil
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

        // 6. Death: spider death curl (curling inwards into organic carapace mound)
        const d0 = Buffer.alloc(fw * fh * 4);
        const d1 = Buffer.alloc(fw * fh * 4);
        const d2 = Buffer.alloc(fw * fh * 4);
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const idx = (y * fw + x) * 4;
                if (b[idx + 3] === 0) continue;
                const red = b[idx], gr = b[idx + 1], bl = b[idx + 2];
                
                // Dist from center
                const cx = 48, cy = 60;
                const dx = x - cx;
                const dy = y - cy;

                // Frame 0: slight legs hunching in, sink 2px
                const shrink0 = (Math.abs(dx) > 20) ? 0.85 : 0.95;
                const nx0 = Math.round(cx + dx * shrink0);
                const ny0 = Math.min(fh - 1, Math.round(cy + dy * 0.95 + 2));
                setPixel(d0, fw, fh, nx0, ny0, red, gr, bl);

                // Frame 1: legs curling further underneath, sink 5px
                const shrink1 = (Math.abs(dx) > 16) ? 0.72 : 0.90;
                const nx1 = Math.round(cx + dx * shrink1);
                const ny1 = Math.min(fh - 1, Math.round(cy + dy * 0.85 + 5));
                setPixel(d1, fw, fh, nx1, ny1, red, gr, bl);

                // Frame 2: tight organic spider death curl lying dead on ground
                const shrink2 = (Math.abs(dx) > 12) ? 0.60 : 0.82;
                const nx2 = Math.round(cx + dx * shrink2);
                const ny2 = Math.min(fh - 1, Math.round(cy + dy * 0.75 + 8));
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
// 2. REFINED TROLL ACTION SYNTHESIS (96x96)
// -------------------------------------------------------------
function buildRefinedTrollActions(idleSheetBuf) {
    const fw = 96, fh = 96;
    const actions = {
        idle: [],
        walk: [],
        action: [],
        attack: [],
        graze: [],
        hurt: [],
        death: []
    };

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

        // 1. Walk: heavy lumbering gait (leg steps, shoulder dip)
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

        // 2. Action: Double chest beat / roar (KEEP BODY INTACT, ZERO RECTANGULAR HOLES!)
        const a0 = Buffer.from(b);
        const a1 = Buffer.alloc(fw * fh * 4);
        const a2 = Buffer.alloc(fw * fh * 4);

        // Frame 1: Torso deepens & arms flex inward smoothly without tearing body
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const idx = (y * fw + x) * 4;
                if (b[idx + 3] === 0) continue;
                const red = b[idx], gr = b[idx + 1], bl = b[idx + 2];

                // Head tilts back slightly in roar
                if (y <= 38) {
                    setPixel(a1, fw, fh, x, y - 2, red, gr, bl);
                    setPixel(a2, fw, fh, x, y - 1, red, gr, bl);
                } else if (y >= 40 && y <= 75 && (x <= 32 || x >= 64)) {
                    // Arm flex: pull arms in 3px toward chest, but copy base underneath
                    const dx1 = (x < 48) ? 3 : -3;
                    setPixel(a1, fw, fh, x, y, red, gr, bl); // base stays
                    setPixel(a1, fw, fh, x + dx1, y - 2, red, gr, bl); // shifted arm overlays
                    setPixel(a2, fw, fh, x, y, red, gr, bl);
                } else {
                    setPixel(a1, fw, fh, x, y, red, gr, bl);
                    setPixel(a2, fw, fh, x, y, red, gr, bl);
                }
            }
        }
        applyDarkOutline(a1, fw, fh, [20, 15, 10]);
        applyDarkOutline(a2, fw, fh, [20, 15, 10]);
        actions.action.push([a0, a1, a2]);

        // 3. Attack: Two-fisted overhead ground smash (NO SERRATED CUTS!)
        const at0 = Buffer.alloc(fw * fh * 4);
        const at1 = Buffer.alloc(fw * fh * 4);
        const at2 = Buffer.alloc(fw * fh * 4);
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const idx = (y * fw + x) * 4;
                if (b[idx + 3] === 0) continue;
                const red = b[idx], gr = b[idx + 1], bl = b[idx + 2];
                // Frame 0: raise up and lean back
                setPixel(at0, fw, fh, x - dirSign * 2, Math.max(0, y - 4), red, gr, bl);
                // Frame 1: heavy downward lunge smash
                setPixel(at1, fw, fh, x + dirSign * 4, Math.min(fh - 1, y + 2), red, gr, bl);
                // Frame 2: recovery
                setPixel(at2, fw, fh, x, y, red, gr, bl);
            }
        }
        applyDarkOutline(at0, fw, fh, [20, 15, 10]);
        applyDarkOutline(at1, fw, fh, [20, 15, 10]);
        applyDarkOutline(at2, fw, fh, [20, 15, 10]);
        actions.attack.push([at0, at1, at2]);

        // 4. Graze: devouring meat
        const g0 = Buffer.alloc(fw * fh * 4);
        const g1 = Buffer.alloc(fw * fh * 4);
        const g2 = Buffer.alloc(fw * fh * 4);
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const idx = (y * fw + x) * 4;
                if (b[idx + 3] === 0) continue;
                const red = b[idx], gr = b[idx + 1], bl = b[idx + 2];
                if (y <= 50) {
                    setPixel(g0, fw, fh, x, y + 3, red, gr, bl);
                    setPixel(g1, fw, fh, x, y + 5, red, gr, bl);
                    setPixel(g2, fw, fh, x, y + 2, red, gr, bl);
                } else {
                    setPixel(g0, fw, fh, x, y, red, gr, bl);
                    setPixel(g1, fw, fh, x, y, red, gr, bl);
                    setPixel(g2, fw, fh, x, y, red, gr, bl);
                }
            }
        }
        actions.graze.push([g0, g1, g2]);

        // 5. Hurt: flinch recoil
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

        // 6. Death: collapse forward crashing down (GROUNDED AT ROW 95, NO FRAME CLIPPING!)
        const d0 = Buffer.alloc(fw * fh * 4);
        const d1 = Buffer.alloc(fw * fh * 4);
        const d2 = Buffer.alloc(fw * fh * 4);
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const idx = (y * fw + x) * 4;
                if (b[idx + 3] === 0) continue;
                const red = b[idx], gr = b[idx + 1], bl = b[idx + 2];

                // Frame 0: knees buckle, body hunches
                setPixel(d0, fw, fh, x, Math.min(fh - 1, y + 4), red, gr, bl);

                // Frame 1: heavy pitch forward onto knees and hands
                const dy1 = Math.round((y - 48) * 0.7 + 55);
                setPixel(d1, fw, fh, x + dirSign * 3, Math.min(fh - 1, dy1), red, gr, bl);

                // Frame 2: fallen troll mound (compressed organic mass resting on ground)
                const dy2 = Math.round((y - 48) * 0.45 + 68);
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
// 3. ORGANIC FF6 BEAR PIXEL ART SYNTHESIS (48x48)
// -------------------------------------------------------------
const BEAR_RAMP = {
    cInk: pal.snap(24, 14, 8),            // Dark ink outline
    cDarkShadow: pal.snap(54, 32, 16),    // Deep fur shadow / belly / haunch divider
    cShadow: pal.snap(82, 50, 24),        // Fur shadow
    cMidtone: pal.snap(122, 74, 38),      // Base rich brown coat
    cLight: pal.snap(158, 98, 52),        // Light fur / brow / back
    cHighlight: pal.snap(194, 126, 72),   // Fur crest / hump highlight
    cMuzzleTan: pal.snap(210, 165, 120),  // Muzzle tan
    cMuzzleShadow: pal.snap(165, 120, 80),// Muzzle lower shadow
    cNoseBlack: pal.snap(20, 15, 12),     // Nose leather
    cEyeAmber: pal.snap(240, 190, 40),    // Amber eye
    cClawIvory: pal.snap(230, 220, 200),  // Ivory claws
    cClawShadow: pal.snap(160, 150, 130)  // Claw base
};

function renderOrganicBearFront() {
    const f = Buffer.alloc(48 * 48 * 4);
    const { cInk, cDarkShadow, cShadow, cMidtone, cLight, cHighlight, cMuzzleTan, cMuzzleShadow, cNoseBlack, cEyeAmber, cClawIvory } = BEAR_RAMP;

    // Organic curved front-facing bear standing broad-shouldered on all fours
    // Center at x = 24, baseline at y = 47, height 34px (y: 14 to 47)
    for (let y = 14; y <= 47; y++) {
        for (let x = 6; x <= 41; x++) {
            let col = null;

            // Ears (rounded, prominent)
            const isLeftEar = (x >= 14 && x <= 18 && y >= 14 && y <= 18);
            const isRightEar = (x >= 29 && x <= 33 && y >= 14 && y <= 18);
            if (isLeftEar || isRightEar) {
                if ((x === 16 && y === 16) || (x === 31 && y === 16)) col = cDarkShadow;
                else col = (y <= 15) ? cHighlight : cLight;
            }

            // Head Dome & Forehead
            const isHead = (x >= 17 && x <= 30 && y >= 16 && y <= 24);
            if (isHead && !col) {
                if (y <= 18) col = (x >= 20 && x <= 27) ? cHighlight : cLight;
                else col = cLight;
            }

            // Eyes & Brow
            if (y === 21 && (x === 19 || x === 28)) col = cEyeAmber;
            if (y === 20 && (x === 19 || x === 28)) col = cDarkShadow;

            // Muzzle (rounded snout)
            if (x >= 21 && x <= 26 && y >= 22 && y <= 28) {
                if (x >= 23 && x <= 24 && y === 23) col = cNoseBlack;
                else if (y >= 26) col = cMuzzleShadow;
                else col = cMuzzleTan;
            }

            // Muscular Shoulders & Hump
            const isHump = (x >= 15 && x <= 32 && y >= 19 && y <= 27);
            if (isHump && !col) {
                col = (y <= 22) ? cLight : cMidtone;
            }

            // Deep Chest & Belly
            const isChest = (x >= 17 && x <= 30 && y >= 27 && y <= 38);
            if (isChest && !col) {
                col = (y >= 35) ? cShadow : cMidtone;
            }

            // Massive Sturdy Forelegs
            const isLeftLeg = (x >= 11 && x <= 18 && y >= 28 && y <= 47);
            const isRightLeg = (x >= 29 && x <= 36 && y >= 28 && y <= 47);
            if (isLeftLeg && !col) {
                if (y >= 45 && (x >= 12 && x <= 15)) col = cClawIvory;
                else col = (x <= 14) ? cMidtone : cShadow;
            }
            if (isRightLeg && !col) {
                if (y >= 45 && (x >= 32 && x <= 35)) col = cClawIvory;
                else col = (x >= 33) ? cMidtone : cShadow;
            }

            // Flanks and Hind Haunches peeking out
            const isFlank = ((x >= 7 && x <= 12) || (x >= 35 && x <= 40)) && y >= 27 && y <= 42;
            if (isFlank && !col) {
                col = cDarkShadow;
            }

            if (col) setPixel(f, 48, 48, x, y, ...col);
        }
    }

    applyDarkOutline(f, 48, 48, cInk);
    return f;
}

function renderOrganicBearSideWest() {
    const f = Buffer.alloc(48 * 48 * 4);
    const { cInk, cDarkShadow, cShadow, cMidtone, cLight, cHighlight, cMuzzleTan, cMuzzleShadow, cNoseBlack, cEyeAmber, cClawIvory } = BEAR_RAMP;

    // Organic side profile: head facing West (left), prominent shoulder hump, broad torso, heavy limbs
    for (let y = 14; y <= 47; y++) {
        for (let x = 6; x <= 42; x++) {
            let col = null;

            // Rounded Ear
            if (x >= 17 && x <= 20 && y >= 14 && y <= 18) {
                col = (x === 18 && y === 16) ? cDarkShadow : cHighlight;
            }

            // Head & Crown
            if (x >= 11 && x <= 21 && y >= 17 && y <= 27) {
                if (x <= 15 && y >= 21 && y <= 26) { // Muzzle
                    if (x === 11 && y === 22) col = cNoseBlack;
                    else if (y >= 25) col = cMuzzleShadow;
                    else col = cMuzzleTan;
                } else if (x === 16 && y === 20) {
                    col = cEyeAmber;
                } else {
                    col = (y <= 19) ? cHighlight : cLight;
                }
            }

            // Massive Shoulder Hump (crest peaking at y = 16..20, x = 20..27)
            if (x >= 20 && x <= 28 && y >= 15 && y <= 24) {
                if (!col) col = (y <= 18) ? cHighlight : cLight;
            }

            // Barrel Body & Haunches
            if (x >= 18 && x <= 39 && y >= 21 && y <= 38) {
                if (!col) {
                    if (y <= 26) col = cMidtone;
                    else if (y <= 33) col = cShadow;
                    else col = cDarkShadow;
                }
            }

            // Short stubby tail
            if (x >= 38 && x <= 41 && y >= 25 && y <= 29) {
                if (!col) col = cDarkShadow;
            }

            // Front Legs (forelimb left: near; forelimb right: far)
            if (x >= 12 && x <= 18 && y >= 31 && y <= 47) {
                if (y >= 45 && x <= 16) col = cClawIvory;
                else col = cMidtone;
            }
            if (x >= 19 && x <= 24 && y >= 33 && y <= 46) {
                if (!col) col = cDarkShadow;
            }

            // Hind Legs (hind left: near; hind right: far)
            if (x >= 30 && x <= 38 && y >= 30 && y <= 47) {
                if (y >= 45 && x <= 35) col = cClawIvory;
                else col = (x <= 34) ? cMidtone : cShadow;
            }
            if (x >= 25 && x <= 29 && y >= 33 && y <= 46) {
                if (!col) col = cDarkShadow;
            }

            if (col) setPixel(f, 48, 48, x, y, ...col);
        }
    }

    applyDarkOutline(f, 48, 48, cInk);
    return f;
}

function renderOrganicBearNorth() {
    const f = Buffer.alloc(48 * 48 * 4);
    const { cInk, cDarkShadow, cShadow, cMidtone, cLight, cHighlight } = BEAR_RAMP;

    // Organic North facing bear: back of head, rounded ears, shoulder hump, broad muscular back, hind legs
    for (let y = 14; y <= 47; y++) {
        for (let x = 7; x <= 40; x++) {
            let col = null;

            // Ears
            const isLeftEar = (x >= 14 && x <= 18 && y >= 14 && y <= 18);
            const isRightEar = (x >= 29 && x <= 33 && y >= 14 && y <= 18);
            if (isLeftEar || isRightEar) col = cHighlight;

            // Back of Head
            const isHead = (x >= 17 && x <= 30 && y >= 16 && y <= 23);
            if (isHead) col = cMidtone;

            // Shoulder Hump
            const isHump = (x >= 15 && x <= 32 && y >= 18 && y <= 26);
            if (isHump && !col) {
                col = (y <= 21) ? cHighlight : cLight;
            }

            // Back & Haunches
            const isBack = (x >= 11 && x <= 36 && y >= 24 && y <= 38);
            if (isBack && !col) {
                col = (y <= 31) ? cMidtone : cShadow;
            }

            // Short Tail
            if (x >= 22 && x <= 25 && y >= 30 && y <= 34) col = cDarkShadow;

            // Hindlegs
            const isLeftLeg = (x >= 11 && x <= 18 && y >= 34 && y <= 47);
            const isRightLeg = (x >= 29 && x <= 36 && y >= 34 && y <= 47);
            if (isLeftLeg || isRightLeg) {
                col = (y >= 44) ? cDarkShadow : cShadow;
            }

            if (col) setPixel(f, 48, 48, x, y, ...col);
        }
    }

    applyDarkOutline(f, 48, 48, cInk);
    return f;
}

function renderOrganicBearSouthWest() {
    const f = Buffer.alloc(48 * 48 * 4);
    const { cInk, cDarkShadow, cShadow, cMidtone, cLight, cHighlight, cMuzzleTan, cMuzzleShadow, cNoseBlack, cEyeAmber, cClawIvory } = BEAR_RAMP;

    // 3/4 front diagonal: head turned toward viewer left, shoulder hump, deep body
    for (let y = 14; y <= 47; y++) {
        for (let x = 6; x <= 41; x++) {
            let col = null;

            // Far Ear & Near Ear
            if (x >= 12 && x <= 15 && y >= 15 && y <= 19) col = cHighlight;
            if (x >= 24 && x <= 28 && y >= 14 && y <= 18) col = cHighlight;

            // Head
            if (x >= 10 && x <= 25 && y >= 17 && y <= 28) {
                if (x <= 16 && y >= 21 && y <= 27) { // Muzzle
                    if (x === 10 && y === 22) col = cNoseBlack;
                    else if (y >= 25) col = cMuzzleShadow;
                    else col = cMuzzleTan;
                } else if (x === 17 && y === 20) {
                    col = cEyeAmber;
                } else {
                    col = (y <= 19) ? cHighlight : cLight;
                }
            }

            // Shoulder hump
            if (x >= 20 && x <= 29 && y >= 16 && y <= 23) {
                if (!col) col = (y <= 18) ? cHighlight : cLight;
            }

            // Body
            if (x >= 16 && x <= 39 && y >= 22 && y <= 38) {
                if (!col) col = (y <= 27) ? cMidtone : (y <= 34 ? cShadow : cDarkShadow);
            }

            // Forelegs
            if (x >= 12 && x <= 19 && y >= 31 && y <= 47) {
                if (y >= 45 && x <= 16) col = cClawIvory;
                else col = cMidtone;
            }
            if (x >= 23 && x <= 28 && y >= 34 && y <= 46) {
                if (!col) col = cDarkShadow;
            }

            // Hindlegs
            if (x >= 29 && x <= 37 && y >= 31 && y <= 47) {
                if (y >= 45 && x <= 33) col = cClawIvory;
                else col = (x <= 33) ? cMidtone : cShadow;
            }

            if (col) setPixel(f, 48, 48, x, y, ...col);
        }
    }

    applyDarkOutline(f, 48, 48, cInk);
    return f;
}

function renderOrganicBearNorthWest() {
    const f = Buffer.alloc(48 * 48 * 4);
    const { cInk, cDarkShadow, cShadow, cMidtone, cLight, cHighlight } = BEAR_RAMP;

    // 3/4 rear diagonal
    for (let y = 14; y <= 47; y++) {
        for (let x = 6; x <= 41; x++) {
            let col = null;

            if (x >= 12 && x <= 16 && y >= 15 && y <= 19) col = cHighlight;
            if (x >= 14 && x <= 23 && y >= 16 && y <= 24) col = cMidtone;
            if (x >= 19 && x <= 29 && y >= 15 && y <= 23) col = (y <= 17) ? cHighlight : cLight;

            if (x >= 15 && x <= 39 && y >= 21 && y <= 38) {
                if (!col) col = (y <= 28) ? cMidtone : (y <= 34 ? cShadow : cDarkShadow);
            }

            // Legs
            if (x >= 13 && x <= 19 && y >= 33 && y <= 46) col = cDarkShadow;
            if (x >= 27 && x <= 36 && y >= 32 && y <= 47) col = (x <= 32) ? cMidtone : cShadow;

            if (col) setPixel(f, 48, 48, x, y, ...col);
        }
    }

    applyDarkOutline(f, 48, 48, cInk);
    return f;
}

function renderOrganicBearCarcass() {
    const f = Buffer.alloc(48 * 48 * 4);
    const { cInk, cDarkShadow, cShadow, cMidtone, cLight, cMuzzleTan, cMuzzleShadow, cNoseBlack, cClawIvory } = BEAR_RAMP;

    // Organic fallen bear resting flat on its side: height 20px, grounded at y = 47
    for (let y = 26; y <= 47; y++) {
        for (let x = 5; x <= 42; x++) {
            let col = null;

            // Head resting on ground
            if (x >= 5 && x <= 16 && y >= 34 && y <= 46) {
                if (x <= 9 && y >= 38 && y <= 44) {
                    if (x === 5 && y === 39) col = cNoseBlack;
                    else if (y >= 42) col = cMuzzleShadow;
                    else col = cMuzzleTan;
                } else {
                    col = (y <= 37) ? cLight : cShadow;
                }
            }

            // Heavy collapsed body mound
            if (x >= 14 && x <= 38 && y >= 27 && y <= 45) {
                if (!col) {
                    col = (y <= 32) ? cMidtone : (y <= 38 ? cShadow : cDarkShadow);
                }
            }

            // Relaxed limbs
            if (x >= 12 && x <= 22 && y >= 42 && y <= 47) {
                if (y >= 45 && x <= 14) col = cClawIvory;
                else col = cDarkShadow;
            }
            if (x >= 27 && x <= 39 && y >= 42 && y <= 47) {
                if (y >= 45 && x <= 29) col = cClawIvory;
                else col = cDarkShadow;
            }

            if (col) setPixel(f, 48, 48, x, y, ...col);
        }
    }

    applyDarkOutline(f, 48, 48, cInk);
    return f;
}

// Bear Action synthesis using organic frames
function buildOrganicBearActions(baseFacings, carcassWest, carcassEast) {
    const actions = {
        idle: [],
        walk: [],
        action: [],
        attack: [],
        graze: [],
        hurt: [],
        death: []
    };

    for (let f = 0; f < 8; f++) {
        const b = baseFacings[f];
        const isSide = (f === 2 || f === 6);
        const isEast = (f === 5 || f === 6 || f === 7);
        const dirSign = isEast ? 1 : -1;

        // 1. Idle (organic breathing heave + ear alert)
        const i0 = Buffer.from(b);
        const i1 = Buffer.alloc(48 * 48 * 4);
        const i2 = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const idx = (y * 48 + x) * 4;
                if (b[idx + 3] === 0) continue;
                // Frame 1: gentle torso heave (move torso y: 15..35 up 1px)
                if (y >= 15 && y <= 35) {
                    setPixel(i1, 48, 48, x, y - 1, b[idx], b[idx + 1], b[idx + 2]);
                } else {
                    setPixel(i1, 48, 48, x, y, b[idx], b[idx + 1], b[idx + 2]);
                }
                // Frame 2: ear/snout alertness twitch
                if (y >= 14 && y <= 24) {
                    setPixel(i2, 48, 48, x + dirSign, y, b[idx], b[idx + 1], b[idx + 2]);
                } else {
                    setPixel(i2, 48, 48, x, y, b[idx], b[idx + 1], b[idx + 2]);
                }
            }
        }
        applyDarkOutline(i1, 48, 48, BEAR_RAMP.cInk);
        applyDarkOutline(i2, 48, 48, BEAR_RAMP.cInk);
        actions.idle.push([i0, i1, i2]);

        // 2. Walk (natural 4-beat quadruped stride)
        const w0 = Buffer.alloc(48 * 48 * 4);
        const w1 = Buffer.from(b);
        const w2 = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const idx = (y * 48 + x) * 4;
                if (b[idx + 3] === 0) continue;
                const r = b[idx], g = b[idx + 1], bl = b[idx + 2];
                if (y < 31) {
                    setPixel(w0, 48, 48, x, y, r, g, bl);
                    setPixel(w2, 48, 48, x, y, r, g, bl);
                } else {
                    if (isSide) {
                        const isFore = isEast ? (x >= 24) : (x <= 24);
                        if (isFore) {
                            setPixel(w0, 48, 48, x + dirSign * 2, y - 1, r, g, bl);
                            setPixel(w2, 48, 48, x - dirSign * 1, y, r, g, bl);
                        } else {
                            setPixel(w0, 48, 48, x - dirSign * 2, y, r, g, bl);
                            setPixel(w2, 48, 48, x + dirSign * 2, y - 1, r, g, bl);
                        }
                    } else {
                        if (x < 24) {
                            setPixel(w0, 48, 48, x, y - 1, r, g, bl);
                            setPixel(w2, 48, 48, x, y, r, g, bl);
                        } else {
                            setPixel(w0, 48, 48, x, y, r, g, bl);
                            setPixel(w2, 48, 48, x, y - 1, r, g, bl);
                        }
                    }
                }
            }
        }
        applyDarkOutline(w0, 48, 48, BEAR_RAMP.cInk);
        applyDarkOutline(w2, 48, 48, BEAR_RAMP.cInk);
        actions.walk.push([w0, w1, w2]);

        // 3. Action (paw reach / ground investigate)
        const a0 = Buffer.alloc(48 * 48 * 4);
        const a1 = Buffer.alloc(48 * 48 * 4);
        const a2 = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const idx = (y * 48 + x) * 4;
                if (b[idx + 3] === 0) continue;
                const r = b[idx], g = b[idx + 1], bl = b[idx + 2];
                // Paws reaching forward
                const isForepaw = (y >= 30 && ((isEast && x >= 22) || (!isEast && x <= 26)));
                if (isForepaw) {
                    setPixel(a0, 48, 48, x + dirSign * 2, y - 1, r, g, bl);
                    setPixel(a1, 48, 48, x + dirSign * 3, y + 1, r, g, bl);
                    setPixel(a2, 48, 48, x - dirSign, y, r, g, bl);
                } else {
                    setPixel(a0, 48, 48, x, y, r, g, bl);
                    setPixel(a1, 48, 48, x, y, r, g, bl);
                    setPixel(a2, 48, 48, x, y, r, g, bl);
                }
            }
        }
        applyDarkOutline(a0, 48, 48, BEAR_RAMP.cInk);
        applyDarkOutline(a1, 48, 48, BEAR_RAMP.cInk);
        applyDarkOutline(a2, 48, 48, BEAR_RAMP.cInk);
        actions.action.push([a0, a1, a2]);

        // 4. Attack: rearing lunge & heavy claw swipe
        const at0 = Buffer.alloc(48 * 48 * 4);
        const at1 = Buffer.alloc(48 * 48 * 4);
        const at2 = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const idx = (y * 48 + x) * 4;
                if (b[idx + 3] === 0) continue;
                const r = b[idx], g = b[idx + 1], bl = b[idx + 2];
                // F0: rear up 3px
                setPixel(at0, 48, 48, x - dirSign, Math.max(0, y - 3), r, g, bl);
                // F1: aggressive downward lunge
                setPixel(at1, 48, 48, x + dirSign * 3, Math.min(47, y + 1), r, g, bl);
                // F2: recovery
                setPixel(at2, 48, 48, x, y, r, g, bl);
            }
        }
        applyDarkOutline(at0, 48, 48, BEAR_RAMP.cInk);
        applyDarkOutline(at1, 48, 48, BEAR_RAMP.cInk);
        applyDarkOutline(at2, 48, 48, BEAR_RAMP.cInk);
        actions.attack.push([at0, at1, at2]);

        // 5. Graze (snout lowered to root for berries/fish)
        const g0 = Buffer.alloc(48 * 48 * 4);
        const g1 = Buffer.alloc(48 * 48 * 4);
        const g2 = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const idx = (y * 48 + x) * 4;
                if (b[idx + 3] === 0) continue;
                const r = b[idx], g = b[idx + 1], bl = b[idx + 2];
                if (y < 28) {
                    setPixel(g0, 48, 48, x, Math.min(47, y + 2), r, g, bl);
                    setPixel(g1, 48, 48, x, Math.min(47, y + 4), r, g, bl);
                    setPixel(g2, 48, 48, x, Math.min(47, y + 1), r, g, bl);
                } else {
                    setPixel(g0, 48, 48, x, y, r, g, bl);
                    setPixel(g1, 48, 48, x, y, r, g, bl);
                    setPixel(g2, 48, 48, x, y, r, g, bl);
                }
            }
        }
        applyDarkOutline(g0, 48, 48, BEAR_RAMP.cInk);
        applyDarkOutline(g1, 48, 48, BEAR_RAMP.cInk);
        applyDarkOutline(g2, 48, 48, BEAR_RAMP.cInk);
        actions.graze.push([g0, g1, g2]);

        // 6. Hurt (flinch recoil)
        const h0 = Buffer.alloc(48 * 48 * 4);
        const h1 = Buffer.alloc(48 * 48 * 4);
        const h2 = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const idx = (y * 48 + x) * 4;
                if (b[idx + 3] === 0) continue;
                const r = b[idx], g = b[idx + 1], bl = b[idx + 2];
                setPixel(h0, 48, 48, x - dirSign * 3, Math.min(47, y + 1), r, g, bl);
                setPixel(h1, 48, 48, x - dirSign * 1, y, r, g, bl);
                setPixel(h2, 48, 48, x, y, r, g, bl);
            }
        }
        applyDarkOutline(h0, 48, 48, BEAR_RAMP.cInk);
        applyDarkOutline(h1, 48, 48, BEAR_RAMP.cInk);
        applyDarkOutline(h2, 48, 48, BEAR_RAMP.cInk);
        actions.hurt.push([h0, h1, h2]);

        // 7. Death (buckle, fall, carcass)
        const d0 = Buffer.alloc(48 * 48 * 4);
        const d1 = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const idx = (y * 48 + x) * 4;
                if (b[idx + 3] === 0) continue;
                setPixel(d0, 48, 48, x, Math.min(47, y + 3), b[idx], b[idx + 1], b[idx + 2]);
                setPixel(d1, 48, 48, x, Math.min(47, y + 6), b[idx], b[idx + 1], b[idx + 2]);
            }
        }
        applyDarkOutline(d0, 48, 48, BEAR_RAMP.cInk);
        applyDarkOutline(d1, 48, 48, BEAR_RAMP.cInk);
        const d2 = isEast ? carcassEast : carcassWest;
        actions.death.push([d0, d1, d2]);
    }

    return actions;
}

// -------------------------------------------------------------
// SHEET EXPORTERS & PACKING
// -------------------------------------------------------------
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
    const cols = 20;
    const rows = 8;
    const sheetW = fw * cols;
    const sheetH = fh * rows;
    const buf = Buffer.alloc(sheetW * sheetH * 4);

    for (let r = 0; r < rows; r++) {
        // Col 0: stand (idle[0])
        blitFrame(buf, sheetW, actions.idle[r][0], fw, fh, 0 * fw, r * fh);
        // Cols 1-3: walk
        for (let c = 0; c < 3; c++) blitFrame(buf, sheetW, actions.walk[r][c], fw, fh, (1 + c) * fw, r * fh);
        // Cols 4-6: action
        for (let c = 0; c < 3; c++) blitFrame(buf, sheetW, actions.action[r][c], fw, fh, (4 + c) * fw, r * fh);
        // Col 7: stand again
        blitFrame(buf, sheetW, actions.idle[r][0], fw, fh, 7 * fw, r * fh);
        // Cols 8-10: attack
        for (let c = 0; c < 3; c++) blitFrame(buf, sheetW, actions.attack[r][c], fw, fh, (8 + c) * fw, r * fh);
        // Cols 11-13: cast (empty for animals)
        // Col 14: hurt (hurt[0])
        blitFrame(buf, sheetW, actions.hurt[r][0], fw, fh, 14 * fw, r * fh);
        // Cols 15-17: death
        for (let c = 0; c < 3; c++) blitFrame(buf, sheetW, actions.death[r][c], fw, fh, (15 + c) * fw, r * fh);
        // Cols 18-19: idle 1, idle 2
        blitFrame(buf, sheetW, actions.idle[r][1], fw, fh, 18 * fw, r * fh);
        blitFrame(buf, sheetW, actions.idle[r][2], fw, fh, 19 * fw, r * fh);
    }

    reducePalette(buf, 31);
    writePNG(outPath, sheetW, sheetH, buf);
    fs.writeFileSync(outPath.replace(/\.png$/, '.json'), JSON.stringify(sidecarJson, null, 2) + '\n');
}

function renderReviewShowcase(name, actions, fw, fh, outPath) {
    const scale = 4;
    const cols = 7; // Idle, Walk, Action, Attack, Graze, Hurt, Death
    const rows = 5; // South, West, East, North, Carcass/Fallen

    const pad = 12 * scale;
    const frameScaledW = fw * scale;
    const frameScaledH = fh * scale;
    const canvasW = cols * frameScaledW + (cols + 1) * pad;
    const canvasH = rows * frameScaledH + (rows + 1) * pad;

    const buf = Buffer.alloc(canvasW * canvasH * 4);

    // Fill background with muted dark moss #3D4A38
    for (let i = 0; i < canvasW * canvasH; i++) {
        buf[i * 4] = 61;
        buf[i * 4 + 1] = 74;
        buf[i * 4 + 2] = 56;
        buf[i * 4 + 3] = 255;
    }

    const rowMap = [0, 2, 6, 4]; // South, West, East, North
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

    // Row 4: Carcass / Fallen state
    const carcassFrame = actions.death[0][2];
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
    console.log('=== Refining Bear, Troll, and Giant Spider Action Suites ===');

    const actNames = ['idle', 'walk', 'action', 'attack', 'graze', 'hurt', 'death'];

    // 1. REFINED BEAR
    console.log('--- Synthesizing Organic FF6 Bear Suite (48x48) ---');
    const bSouth = renderOrganicBearFront();
    const bWest = renderOrganicBearSideWest();
    const bNorth = renderOrganicBearNorth();
    const bSouthWest = renderOrganicBearSouthWest();
    const bNorthWest = renderOrganicBearNorthWest();

    const bEast = mirrorFrameH(bWest, 48, 48);
    const bNorthEast = mirrorFrameH(bNorthWest, 48, 48);
    const bSouthEast = mirrorFrameH(bSouthWest, 48, 48);

    const bCarcassWest = renderOrganicBearCarcass();
    const bCarcassEast = mirrorFrameH(bCarcassWest, 48, 48);

    const bFacings = [bSouth, bSouthWest, bWest, bNorthWest, bNorth, bNorthEast, bEast, bSouthEast];
    const bearActions = buildOrganicBearActions(bFacings, bCarcassWest, bCarcassEast);

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

    // Character Sheet: $UF_Bear.png (144x192, 4-way S, W, E, N)
    const bearRmmzBuf = Buffer.alloc(144 * 192 * 4);
    const rmmzRows = [0, 2, 6, 4];
    for (let r = 0; r < 4; r++) {
        const srcRow = rmmzRows[r];
        for (let col = 0; col < 3; col++) {
            blitFrame(bearRmmzBuf, 144, bearActions.walk[srcRow][col], 48, 48, col * 48, r * 48);
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
    for (let r = 0; r < 8; r++) {
        for (let col = 0; col < 3; col++) {
            blitFrame(bear8DBuf, 144, bearActions.walk[r][col], 48, 48, col * 48, r * 48);
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
    blitFrame(bearCarcassBuf, 144, bCarcassWest, 48, 48, 48, 0);
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
        passable: true,
        layer: "under",
        category: "remains"
    }, null, 2) + '\n');

    renderReviewShowcase('bear', bearActions, 48, 48, path.join(ROOT, 'art', 'review', 'bear_actions_showcase_4x.png'));
    console.log('[SUCCESS] Refined Bear suite generated!');

    // 2. REFINED GIANT SPIDER
    console.log('--- Generating Refined Giant Spider Suite (96x96) ---');
    const spiderIdleImg = readPNG(path.join(ROOT, 'art', 'masters', 'giant_spider_idle.png'));
    const spiderActions = buildRefinedSpiderActions(spiderIdleImg.data);

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
        passable: true,
        layer: "under",
        category: "remains"
    }, null, 2) + '\n');

    renderReviewShowcase('giant_spider', spiderActions, 96, 96, path.join(ROOT, 'art', 'review', 'giant_spider_actions_showcase_4x.png'));
    console.log('[SUCCESS] Refined Giant Spider suite generated!');

    // 3. REFINED TROLL
    console.log('--- Generating Refined Troll Suite (96x96) ---');
    const trollIdleImg = readPNG(path.join(ROOT, 'art', 'masters', 'troll_idle.png'));
    const trollActions = buildRefinedTrollActions(trollIdleImg.data);

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
        passable: true,
        layer: "under",
        category: "remains"
    }, null, 2) + '\n');

    renderReviewShowcase('troll', trollActions, 96, 96, path.join(ROOT, 'art', 'review', 'troll_actions_showcase_4x.png'));
    console.log('[SUCCESS] Refined Troll suite generated!');

    console.log('=== All Refinements Complete! ===');
}

main().catch(console.error);
