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
    for (let i = maxColors; i < sorted.length; i++) {
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
            const rep = map.get(k);
            buf[i] = rep[0];
            buf[i + 1] = rep[1];
            buf[i + 2] = rep[2];
        }
    }
}

function setPixel(buf, w, h, x, y, r, g, b, a = 255) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const idx = (y * w + x) * 4;
    const sn = pal.snap(r, g, b);
    buf[idx] = sn[0];
    buf[idx + 1] = sn[1];
    buf[idx + 2] = sn[2];
    buf[idx + 3] = a;
}

function mirrorFrame(buf, w = 48, h = 48) {
    const out = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const sidx = (y * w + x) * 4;
            const didx = (y * w + (w - 1 - x)) * 4;
            out[didx] = buf[sidx];
            out[didx + 1] = buf[sidx + 1];
            out[didx + 2] = buf[sidx + 2];
            out[didx + 3] = buf[sidx + 3];
        }
    }
    return out;
}

function extractFrame(sheetBuf, sheetW, fCol, fRow, fw, fh) {
    const out = Buffer.alloc(fw * fh * 4);
    const startX = fCol * fw;
    const startY = fRow * fh;
    for (let y = 0; y < fh; y++) {
        for (let x = 0; x < fw; x++) {
            const sidx = ((startY + y) * sheetW + (startX + x)) * 4;
            const didx = (y * fw + x) * 4;
            out[didx] = sheetBuf[sidx];
            out[didx + 1] = sheetBuf[sidx + 1];
            out[didx + 2] = sheetBuf[sidx + 2];
            out[didx + 3] = sheetBuf[sidx + 3];
        }
    }
    return out;
}

function blitFrame(dstBuf, dstW, srcBuf, srcW, srcH, dx, dy) {
    for (let y = 0; y < srcH; y++) {
        const ty = dy + y;
        for (let x = 0; x < srcW; x++) {
            const tx = dx + x;
            const sidx = (y * srcW + x) * 4;
            if (srcBuf[sidx + 3] === 0) continue;
            const didx = (ty * dstW + tx) * 4;
            dstBuf[didx] = srcBuf[sidx];
            dstBuf[didx + 1] = srcBuf[sidx + 1];
            dstBuf[didx + 2] = srcBuf[sidx + 2];
            dstBuf[didx + 3] = srcBuf[sidx + 3];
        }
    }
}

// -------------------------------------------------------------
// BEAR GENERATION LOGIC
// -------------------------------------------------------------
const BEAR_PAL = {
    cInk: [24, 14, 8],
    cDarkShadow: [52, 27, 11],
    cShadow: [82, 43, 19],
    cMidtone: [120, 66, 32],
    cHighlight: [163, 95, 50],
    cLight: [199, 131, 78],
    cMuzzleTan: [184, 140, 92],
    cMuzzleShadow: [116, 74, 43],
    cNoseBlack: [18, 9, 4],
    cClawIvory: [210, 203, 181],
    cEyeAmber: [232, 168, 56]
};

function renderBearBaseWest() {
    const f = Buffer.alloc(48 * 48 * 4);
    const { cInk, cDarkShadow, cShadow, cMidtone, cHighlight, cLight, cMuzzleTan, cMuzzleShadow, cNoseBlack, cClawIvory, cEyeAmber } = BEAR_PAL;

    // Bear side silhouette: heavy hump (x:18-24, y:14-20), deep chest (x:11-25, y:23-37), hind haunches (x:27-37, y:21-36)
    // Head: x:5-17, y:21-31
    for (let y = 14; y <= 47; y++) {
        for (let x = 4; x <= 42; x++) {
            let col = null;

            // Shoulder hump
            const isHump = (x >= 18 && x <= 25 && y >= 14 && y <= 21);
            if (isHump) {
                if (y === 14 && (x === 18 || x >= 24)) continue;
                col = (y <= 16) ? cLight : cHighlight;
            }

            // Head & Neck
            const isHead = (x >= 5 && x <= 17 && y >= 21 && y <= 31);
            if (isHead) {
                // Muzzle / Snout
                if (x <= 11 && y >= 24 && y <= 28) {
                    if (x === 5 && (y === 24 || y === 28)) continue;
                    if (x === 5 && y === 25) col = cNoseBlack;
                    else if (y === 28) col = cMuzzleShadow;
                    else col = cMuzzleTan;
                } else if (x >= 14 && x <= 17 && y >= 19 && y <= 22) { // Ear
                    col = (x === 15 && y === 20) ? cDarkShadow : cHighlight;
                } else {
                    col = (y <= 24) ? cHighlight : cMidtone;
                }
            }

            // Eye
            if (x === 11 && y === 23) col = cEyeAmber;

            // Massive Torso / Belly
            const isTorso = (x >= 14 && x <= 37 && y >= 20 && y <= 38);
            if (isTorso) {
                if (col === null) {
                    if (y <= 24) col = cHighlight;
                    else if (y <= 33) col = cMidtone;
                    else col = cShadow;
                }
            }

            // Back Haunches
            const isHaunch = (x >= 28 && x <= 38 && y >= 21 && y <= 35);
            if (isHaunch && col === null) {
                col = (y <= 25) ? cHighlight : cMidtone;
            }

            // Tail
            if (x >= 39 && x <= 41 && y >= 26 && y <= 29) {
                col = cMidtone;
            }

            // Foreleg (near)
            if (x >= 14 && x <= 21 && y >= 32 && y <= 47) {
                if (y >= 45 && x >= 14 && x <= 16) col = cClawIvory;
                else col = (x <= 17) ? cMidtone : cShadow;
            }

            // Foreleg (far - peeking in front)
            if (x >= 9 && x <= 13 && y >= 34 && y <= 46) {
                col = cDarkShadow;
            }

            // Hindleg (near)
            if (x >= 28 && x <= 36 && y >= 33 && y <= 47) {
                if (y >= 45 && x >= 28 && x <= 30) col = cClawIvory;
                else col = (x <= 32) ? cMidtone : cShadow;
            }

            // Hindleg (far)
            if (x >= 24 && x <= 27 && y >= 36 && y <= 46) {
                col = cDarkShadow;
            }

            if (col) {
                setPixel(f, 48, 48, x, y, ...col);
            }
        }
    }

    applyDarkOutline(f, 48, 48, cInk);
    return f;
}

function renderBearBaseSouth() {
    const f = Buffer.alloc(48 * 48 * 4);
    const { cInk, cDarkShadow, cShadow, cMidtone, cHighlight, cLight, cMuzzleTan, cMuzzleShadow, cNoseBlack, cClawIvory, cEyeAmber } = BEAR_PAL;

    // South facing bear: symmetrical broad skull, rounded ears, wide snout, massive chest & forelegs
    for (let y = 13; y <= 47; y++) {
        for (let x = 8; x <= 39; x++) {
            let col = null;

            // Ears
            const isLeftEar = (x >= 15 && x <= 18 && y >= 13 && y <= 17);
            const isRightEar = (x >= 29 && x <= 32 && y >= 13 && y <= 17);
            if (isLeftEar || isRightEar) {
                col = ((x === 17 && y === 15) || (x === 30 && y === 15)) ? cDarkShadow : cHighlight;
            }

            // Head Dome
            const isHeadDome = (x >= 18 && x <= 29 && y >= 14 && y <= 21);
            if (isHeadDome) {
                col = (y <= 16) ? cLight : cHighlight;
            }

            // Face & Brow
            const isFace = (x >= 16 && x <= 31 && y >= 20 && y <= 28);
            if (isFace) {
                // Eyes
                if ((x === 19 && y === 22) || (x === 28 && y === 22)) {
                    col = cEyeAmber;
                } else if (x >= 21 && x <= 26 && y >= 23 && y <= 28) { // Muzzle
                    if ((x === 23 || x === 24) && y === 24) col = cNoseBlack;
                    else if (y >= 27) col = cMuzzleShadow;
                    else col = cMuzzleTan;
                } else {
                    col = cMidtone;
                }
            }

            // Muscular Shoulders
            const isShoulder = ((x >= 10 && x <= 16) || (x >= 31 && x <= 37)) && y >= 21 && y <= 35;
            if (isShoulder) {
                col = (y <= 26) ? cHighlight : cMidtone;
            }

            // Chest
            const isChest = (x >= 17 && x <= 30 && y >= 28 && y <= 38);
            if (isChest) {
                if (col === null) {
                    col = (y >= 35) ? cShadow : cMidtone;
                }
            }

            // Forelegs
            const isLeftLeg = (x >= 11 && x <= 18 && y >= 33 && y <= 47);
            const isRightLeg = (x >= 29 && x <= 36 && y >= 33 && y <= 47);
            if (isLeftLeg) {
                if (y >= 45) col = (x >= 12 && x <= 14) ? cClawIvory : cMidtone;
                else col = (x <= 14) ? cMidtone : cShadow;
            }
            if (isRightLeg) {
                if (y >= 45) col = (x >= 33 && x <= 35) ? cClawIvory : cMidtone;
                else col = (x >= 33) ? cMidtone : cShadow;
            }

            // Hind Haunches peeking out
            const isHaunch = ((x >= 8 && x <= 10) || (x >= 37 && x <= 39)) && y >= 29 && y <= 40;
            if (isHaunch && col === null) {
                col = cDarkShadow;
            }

            if (col) {
                setPixel(f, 48, 48, x, y, ...col);
            }
        }
    }

    applyDarkOutline(f, 48, 48, cInk);
    return f;
}

function renderBearBaseNorth() {
    const f = Buffer.alloc(48 * 48 * 4);
    const { cInk, cDarkShadow, cShadow, cMidtone, cHighlight, cLight } = BEAR_PAL;

    // North facing bear: back of head, rounded ears, shoulder hump, broad muscular back, hind legs
    for (let y = 13; y <= 47; y++) {
        for (let x = 8; x <= 39; x++) {
            let col = null;

            // Ears
            const isLeftEar = (x >= 15 && x <= 18 && y >= 13 && y <= 17);
            const isRightEar = (x >= 29 && x <= 32 && y >= 13 && y <= 17);
            if (isLeftEar || isRightEar) col = cHighlight;

            // Back of Head
            const isHead = (x >= 18 && x <= 29 && y >= 14 && y <= 21);
            if (isHead) col = cMidtone;

            // Shoulder Hump
            const isHump = (x >= 16 && x <= 31 && y >= 19 && y <= 26);
            if (isHump) {
                col = (y <= 21) ? cLight : cHighlight;
            }

            // Back & Haunches
            const isBack = (x >= 11 && x <= 36 && y >= 24 && y <= 38);
            if (isBack) {
                if (col === null) {
                    col = (y <= 30) ? cMidtone : cShadow;
                }
            }

            // Tail
            if (x >= 23 && x <= 25 && y >= 31 && y <= 34) col = cDarkShadow;

            // Hindlegs
            const isLeftLeg = (x >= 12 && x <= 19 && y >= 35 && y <= 47);
            const isRightLeg = (x >= 28 && x <= 35 && y >= 35 && y <= 47);
            if (isLeftLeg || isRightLeg) {
                col = (y >= 44) ? cDarkShadow : cShadow;
            }

            if (col) {
                setPixel(f, 48, 48, x, y, ...col);
            }
        }
    }

    applyDarkOutline(f, 48, 48, cInk);
    return f;
}

function renderBearBaseSouthWest() {
    const f = Buffer.alloc(48 * 48 * 4);
    const { cInk, cDarkShadow, cShadow, cMidtone, cHighlight, cLight, cMuzzleTan, cMuzzleShadow, cNoseBlack, cClawIvory, cEyeAmber } = BEAR_PAL;

    // 3/4 front diagonal: head turned slightly left, shoulder hump visible, deep chest
    for (let y = 13; y <= 47; y++) {
        for (let x = 6; x <= 40; x++) {
            let col = null;

            // Right ear (far) & Left ear (near)
            if (x >= 12 && x <= 15 && y >= 15 && y <= 19) col = cHighlight;
            if (x >= 23 && x <= 26 && y >= 13 && y <= 17) col = cHighlight;

            // Head
            if (x >= 10 && x <= 24 && y >= 17 && y <= 29) {
                if (x <= 15 && y >= 22 && y <= 27) { // Muzzle
                    if (x === 10 && y === 23) col = cNoseBlack;
                    else if (y >= 26) col = cMuzzleShadow;
                    else col = cMuzzleTan;
                } else if (x === 16 && y === 21) {
                    col = cEyeAmber;
                } else {
                    col = (y <= 19) ? cLight : cHighlight;
                }
            }

            // Shoulder hump
            if (x >= 21 && x <= 28 && y >= 15 && y <= 22) {
                if (col === null) col = (y <= 17) ? cLight : cHighlight;
            }

            // Body
            if (x >= 16 && x <= 38 && y >= 22 && y <= 37) {
                if (col === null) {
                    col = (y <= 27) ? cMidtone : cShadow;
                }
            }

            // Forelegs
            if (x >= 12 && x <= 19 && y >= 32 && y <= 47) {
                if (y >= 45 && x <= 15) col = cClawIvory;
                else col = cMidtone;
            }
            if (x >= 23 && x <= 29 && y >= 34 && y <= 46) {
                col = cDarkShadow;
            }

            // Hindlegs
            if (x >= 29 && x <= 37 && y >= 32 && y <= 47) {
                if (y >= 45 && x <= 32) col = cClawIvory;
                else col = (x <= 33) ? cMidtone : cShadow;
            }

            if (col) setPixel(f, 48, 48, x, y, ...col);
        }
    }

    applyDarkOutline(f, 48, 48, cInk);
    return f;
}

function renderBearBaseNorthWest() {
    const f = Buffer.alloc(48 * 48 * 4);
    const { cInk, cDarkShadow, cShadow, cMidtone, cHighlight, cLight } = BEAR_PAL;

    // 3/4 rear diagonal
    for (let y = 13; y <= 47; y++) {
        for (let x = 6; x <= 40; x++) {
            let col = null;

            if (x >= 12 && x <= 15 && y >= 15 && y <= 18) col = cHighlight;
            if (x >= 14 && x <= 22 && y >= 16 && y <= 24) col = cMidtone;
            if (x >= 20 && x <= 28 && y >= 14 && y <= 22) col = (y <= 16) ? cLight : cHighlight;

            if (x >= 15 && x <= 38 && y >= 21 && y <= 37) {
                if (col === null) col = (y <= 28) ? cMidtone : cShadow;
            }

            // Legs
            if (x >= 13 && x <= 19 && y >= 34 && y <= 46) col = cDarkShadow;
            if (x >= 27 && x <= 35 && y >= 33 && y <= 47) col = (x <= 31) ? cMidtone : cShadow;

            if (col) setPixel(f, 48, 48, x, y, ...col);
        }
    }

    applyDarkOutline(f, 48, 48, cInk);
    return f;
}

function renderBearCarcass() {
    const f = Buffer.alloc(48 * 48 * 4);
    const { cInk, cDarkShadow, cShadow, cMidtone, cMuzzleShadow, cMuzzleTan, cNoseBlack } = BEAR_PAL;

    // Fallen bear lying flat on its side: y from 26 to 47, width from 4 to 43
    for (let y = 26; y <= 47; y++) {
        for (let x = 4; x <= 43; x++) {
            let col = null;

            // Head resting on ground
            if (x >= 4 && x <= 15 && y >= 35 && y <= 46) {
                if (x <= 8 && y >= 39 && y <= 43) {
                    if (x === 4 && y === 40) col = cNoseBlack;
                    else col = (y >= 42) ? cMuzzleShadow : cMuzzleTan;
                } else {
                    col = cShadow;
                }
            }

            // Heavy collapsed body
            if (x >= 13 && x <= 38 && y >= 27 && y <= 45) {
                if (col === null) {
                    col = (y <= 33) ? cMidtone : (y <= 39 ? cShadow : cDarkShadow);
                }
            }

            // Limbs sprawled
            if (x >= 12 && x <= 22 && y >= 43 && y <= 47) col = cDarkShadow;
            if (x >= 28 && x <= 39 && y >= 43 && y <= 47) col = cDarkShadow;

            if (col) setPixel(f, 48, 48, x, y, ...col);
        }
    }

    applyDarkOutline(f, 48, 48, cInk);
    return f;
}

// Bear Action synthesis
function buildBearActions(baseFacings, carcassWest, carcassEast) {
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

        // 1. Idle (breathing & ear alert)
        const i0 = Buffer.from(b);
        const i1 = Buffer.alloc(48 * 48 * 4);
        const i2 = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const idx = (y * 48 + x) * 4;
                if (b[idx + 3] === 0) continue;
                // Frame 1: gentle torso breathing heave
                if (y >= 14 && y <= 35) {
                    setPixel(i1, 48, 48, x, y - 1, b[idx], b[idx + 1], b[idx + 2]);
                } else {
                    setPixel(i1, 48, 48, x, y, b[idx], b[idx + 1], b[idx + 2]);
                }
                // Frame 2: snout / ear twitch
                if (y >= 13 && y <= 25) {
                    setPixel(i2, 48, 48, x + dirSign, y, b[idx], b[idx + 1], b[idx + 2]);
                } else {
                    setPixel(i2, 48, 48, x, y, b[idx], b[idx + 1], b[idx + 2]);
                }
            }
        }
        applyDarkOutline(i1, 48, 48, BEAR_PAL.cInk);
        applyDarkOutline(i2, 48, 48, BEAR_PAL.cInk);
        actions.idle.push([i0, i1, i2]);

        // 2. Walk (4-beat gait)
        const w0 = Buffer.alloc(48 * 48 * 4);
        const w1 = Buffer.from(b);
        const w2 = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const idx = (y * 48 + x) * 4;
                if (b[idx + 3] === 0) continue;
                const r = b[idx], g = b[idx + 1], bl = b[idx + 2];
                if (y < 32) {
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
        applyDarkOutline(w0, 48, 48, BEAR_PAL.cInk);
        applyDarkOutline(w2, 48, 48, BEAR_PAL.cInk);
        actions.walk.push([w0, w1, w2]);

        // 3. Action (pawing/sniffing ground)
        const a0 = Buffer.alloc(48 * 48 * 4);
        const a1 = Buffer.alloc(48 * 48 * 4);
        const a2 = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const idx = (y * 48 + x) * 4;
                if (b[idx + 3] === 0) continue;
                const r = b[idx], g = b[idx + 1], bl = b[idx + 2];
                // Reach paw forward
                if (y >= 30 && ((isEast && x >= 22) || (!isEast && x <= 26))) {
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
        applyDarkOutline(a0, 48, 48, BEAR_PAL.cInk);
        applyDarkOutline(a1, 48, 48, BEAR_PAL.cInk);
        applyDarkOutline(a2, 48, 48, BEAR_PAL.cInk);
        actions.action.push([a0, a1, a2]);

        // 4. Attack (rearing up, vicious claw swipe!)
        const at0 = Buffer.alloc(48 * 48 * 4);
        const at1 = Buffer.alloc(48 * 48 * 4);
        const at2 = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const idx = (y * 48 + x) * 4;
                if (b[idx + 3] === 0) continue;
                const r = b[idx], g = b[idx + 1], bl = b[idx + 2];
                // Frame 0: rear up 3px
                setPixel(at0, 48, 48, x - dirSign, Math.max(0, y - 3), r, g, bl);
                // Frame 1: heavy downward lunge & swipe
                setPixel(at1, 48, 48, x + dirSign * 3, Math.min(47, y + 1), r, g, bl);
                // Frame 2: recovery
                setPixel(at2, 48, 48, x, y, r, g, bl);
            }
        }
        // Frame 1: Add white/silver claw swipe slash arc
        const swipeX = isEast ? 36 : 10;
        for (let sy = 24; sy <= 36; sy++) {
            setPixel(at1, 48, 48, swipeX + dirSign * Math.round((sy - 24) * 0.4), sy, 240, 240, 255);
            setPixel(at1, 48, 48, swipeX + dirSign * Math.round((sy - 24) * 0.4) + 1, sy, 180, 210, 255);
        }
        applyDarkOutline(at0, 48, 48, BEAR_PAL.cInk);
        applyDarkOutline(at1, 48, 48, BEAR_PAL.cInk);
        applyDarkOutline(at2, 48, 48, BEAR_PAL.cInk);
        actions.attack.push([at0, at1, at2]);

        // 5. Graze / Forage (snout lowered to root for food)
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
        applyDarkOutline(g0, 48, 48, BEAR_PAL.cInk);
        applyDarkOutline(g1, 48, 48, BEAR_PAL.cInk);
        applyDarkOutline(g2, 48, 48, BEAR_PAL.cInk);
        actions.graze.push([g0, g1, g2]);

        // 6. Hurt (flinch back)
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
        applyDarkOutline(h0, 48, 48, BEAR_PAL.cInk);
        applyDarkOutline(h1, 48, 48, BEAR_PAL.cInk);
        applyDarkOutline(h2, 48, 48, BEAR_PAL.cInk);
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
        applyDarkOutline(d0, 48, 48, BEAR_PAL.cInk);
        applyDarkOutline(d1, 48, 48, BEAR_PAL.cInk);
        const d2 = isEast ? carcassEast : carcassWest;
        actions.death.push([d0, d1, d2]);
    }

    return actions;
}

// -------------------------------------------------------------
// GIANT SPIDER ACTION SYNTHESIS (96x96 frames)
// -------------------------------------------------------------
function buildSpiderActions(idleSheetBuf) {
    // idleSheetBuf is 288x768 (3 cols x 8 rows of 96x96)
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

    // Load the 8 facings from idle sheet
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

        // 1. Walk: 8-leg creeping gait
        const w0 = Buffer.alloc(fw * fh * 4);
        const w1 = Buffer.from(b);
        const w2 = Buffer.alloc(fw * fh * 4);
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const idx = (y * fw + x) * 4;
                if (b[idx + 3] === 0) continue;
                const red = b[idx], gr = b[idx + 1], bl = b[idx + 2];
                // Animate outer leg spans
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

        // 2. Action: Web spinning (spinnerets pulse, silk threads appear)
        const a0 = Buffer.alloc(fw * fh * 4);
        const a1 = Buffer.alloc(fw * fh * 4);
        const a2 = Buffer.alloc(fw * fh * 4);
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const idx = (y * fw + x) * 4;
                if (b[idx + 3] === 0) continue;
                setPixel(a0, fw, fh, x, y, b[idx], b[idx + 1], b[idx + 2]);
                setPixel(a1, fw, fh, x, y, b[idx], b[idx + 1], b[idx + 2]);
                setPixel(a2, fw, fh, x, y, b[idx], b[idx + 1], b[idx + 2]);
            }
        }
        // Silk threads trailing from abdomen tip
        for (let sy = 70; sy <= 85; sy++) {
            setPixel(a1, fw, fh, 48 + Math.round((sy - 70) * 0.5), sy, 230, 235, 245);
            setPixel(a2, fw, fh, 48 - Math.round((sy - 70) * 0.5), sy, 230, 235, 245);
        }
        actions.action.push([a0, a1, a2]);

        // 3. Attack: Spider rearing up & striking with dripping fangs
        const at0 = Buffer.alloc(fw * fh * 4);
        const at1 = Buffer.alloc(fw * fh * 4);
        const at2 = Buffer.alloc(fw * fh * 4);
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const idx = (y * fw + x) * 4;
                if (b[idx + 3] === 0) continue;
                const red = b[idx], gr = b[idx + 1], bl = b[idx + 2];
                // Frame 0: rear up 4px
                setPixel(at0, fw, fh, x, Math.max(0, y - 4), red, gr, bl);
                // Frame 1: lunge forward 5px
                setPixel(at1, fw, fh, x + dirSign * 4, Math.min(fh - 1, y + 3), red, gr, bl);
                // Frame 2: recovery
                setPixel(at2, fw, fh, x, y, red, gr, bl);
            }
        }
        // Frame 1: venom drip
        const venomX = 48 + dirSign * 6;
        for (let vy = 72; vy <= 78; vy++) {
            setPixel(at1, fw, fh, venomX, vy, 110, 220, 60);
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
                    setPixel(g1, fw, fh, x, y + 4, red, gr, bl);
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

        // 6. Death: spider death curl
        const d0 = Buffer.alloc(fw * fh * 4);
        const d1 = Buffer.alloc(fw * fh * 4);
        const d2 = Buffer.alloc(fw * fh * 4);
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const idx = (y * fw + x) * 4;
                if (b[idx + 3] === 0) continue;
                const red = b[idx], gr = b[idx + 1], bl = b[idx + 2];
                // Frame 0: legs hunch inward
                const dx0 = (x < 48) ? 3 : -3;
                setPixel(d0, fw, fh, x + dx0, Math.min(fh - 1, y + 4), red, gr, bl);
                // Frame 1: legs curl in more
                const dx1 = (x < 48) ? 6 : -6;
                setPixel(d1, fw, fh, x + dx1, Math.min(fh - 1, y + 8), red, gr, bl);
                // Frame 2: tight curled dead spider on ground
                const dx2 = (x < 48) ? 10 : -10;
                setPixel(d2, fw, fh, x + dx2, Math.min(fh - 1, y + 12), red, gr, bl);
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
// TROLL ACTION SYNTHESIS (96x96 frames)
// -------------------------------------------------------------
function buildTrollActions(idleSheetBuf) {
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

        // 2. Action: Double chest beat / roar
        const a0 = Buffer.alloc(fw * fh * 4);
        const a1 = Buffer.alloc(fw * fh * 4);
        const a2 = Buffer.alloc(fw * fh * 4);
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const idx = (y * fw + x) * 4;
                if (b[idx + 3] === 0) continue;
                const red = b[idx], gr = b[idx + 1], bl = b[idx + 2];
                // Arms pump in toward chest
                const isArm = (x <= 28 || x >= 68) && (y >= 40 && y <= 75);
                if (isArm) {
                    const dx0 = (x < 48) ? 6 : -6;
                    setPixel(a0, fw, fh, x + dx0, y - 4, red, gr, bl);
                    setPixel(a1, fw, fh, x + dx0 * 2, y - 6, red, gr, bl);
                    setPixel(a2, fw, fh, x, y, red, gr, bl);
                } else {
                    setPixel(a0, fw, fh, x, y, red, gr, bl);
                    setPixel(a1, fw, fh, x, y - 1, red, gr, bl);
                    setPixel(a2, fw, fh, x, y, red, gr, bl);
                }
            }
        }
        applyDarkOutline(a0, fw, fh, [20, 15, 10]);
        applyDarkOutline(a1, fw, fh, [20, 15, 10]);
        actions.action.push([a0, a1, a2]);

        // 3. Attack: Massive two-fisted overhead ground smash!
        const at0 = Buffer.alloc(fw * fh * 4);
        const at1 = Buffer.alloc(fw * fh * 4);
        const at2 = Buffer.alloc(fw * fh * 4);
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const idx = (y * fw + x) * 4;
                if (b[idx + 3] === 0) continue;
                const red = b[idx], gr = b[idx + 1], bl = b[idx + 2];
                // Frame 0: raise arms high overhead, lean back
                setPixel(at0, fw, fh, x - dirSign * 2, Math.max(0, y - 6), red, gr, bl);
                // Frame 1: slam down with full weight!
                setPixel(at1, fw, fh, x + dirSign * 5, Math.min(fh - 1, y + 4), red, gr, bl);
                // Frame 2: recovery
                setPixel(at2, fw, fh, x, y, red, gr, bl);
            }
        }
        // Shockwave impact on frame 1
        for (let sx = 20; sx <= 76; sx++) {
            setPixel(at1, fw, fh, sx, 92, 190, 175, 130);
            if (sx % 3 === 0) setPixel(at1, fw, fh, sx, 91, 230, 220, 180);
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
                    setPixel(g0, fw, fh, x, y + 4, red, gr, bl);
                    setPixel(g1, fw, fh, x, y + 6, red, gr, bl);
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
                setPixel(h0, fw, fh, x - dirSign * 5, Math.min(fh - 1, y + 2), b[idx], b[idx + 1], b[idx + 2]);
                setPixel(h1, fw, fh, x - dirSign * 2, y, b[idx], b[idx + 1], b[idx + 2]);
                setPixel(h2, fw, fh, x, y, b[idx], b[idx + 1], b[idx + 2]);
            }
        }
        applyDarkOutline(h0, fw, fh, [20, 15, 10]);
        applyDarkOutline(h1, fw, fh, [20, 15, 10]);
        actions.hurt.push([h0, h1, h2]);

        // 6. Death: collapse forward crashing down
        const d0 = Buffer.alloc(fw * fh * 4);
        const d1 = Buffer.alloc(fw * fh * 4);
        const d2 = Buffer.alloc(fw * fh * 4);
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const idx = (y * fw + x) * 4;
                if (b[idx + 3] === 0) continue;
                const red = b[idx], gr = b[idx + 1], bl = b[idx + 2];
                // Frame 0: knees buckle
                setPixel(d0, fw, fh, x, Math.min(fh - 1, y + 6), red, gr, bl);
                // Frame 1: heavy pitch forward
                setPixel(d1, fw, fh, x + dirSign * 4, Math.min(fh - 1, y + 14), red, gr, bl);
                // Frame 2: fallen troll mound
                setPixel(d2, fw, fh, x + dirSign * 8, Math.min(fh - 1, y + 22), red, gr, bl);
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
// SHEET EXPORTERS & PACKING
// -------------------------------------------------------------
function assembleMasterSheet(actionGrids, cols, rows, fw, fh, outPath, sidecarJson) {
    const totalW = fw * cols;
    const totalH = fh * rows;
    const buf = Buffer.alloc(totalW * totalH * 4);

    for (let r = 0; r < rows; r++) {
        const rowFrames = actionGrids[r];
        for (let c = 0; c < cols; c++) {
            const fBuf = rowFrames[c];
            blitFrame(buf, totalW, fBuf, fw, fh, c * fw, r * fh);
        }
    }

    reducePalette(buf, 31);
    writePNG(outPath, totalW, totalH, buf);
    fs.writeFileSync(outPath.replace(/\.png$/, '.json'), JSON.stringify(sidecarJson, null, 2) + '\n');
}

function assembleAR600Master(actionGrids, fw, fh, outPath, sidecarJson) {
    const cols = 20;
    const rows = 8;
    const totalW = fw * cols;
    const totalH = fh * rows;
    const buf = Buffer.alloc(totalW * totalH * 4);

    for (let r = 0; r < 8; r++) {
        const colMap = [
            actionGrids.walk[r][1],     // 0: stand
            actionGrids.walk[r][0],     // 1: walk 0
            actionGrids.walk[r][1],     // 2: walk 1
            actionGrids.walk[r][2],     // 3: walk 2
            actionGrids.action[r][0],   // 4: action 0
            actionGrids.action[r][1],   // 5: action 1
            actionGrids.action[r][2],   // 6: action 2
            actionGrids.walk[r][1],     // 7: carry (stand)
            actionGrids.attack[r][0],   // 8: attack 0
            actionGrids.attack[r][1],   // 9: attack 1
            actionGrids.attack[r][2],   // 10: attack 2
            actionGrids.graze[r][0],    // 11: eat 0
            actionGrids.graze[r][1],    // 12: eat 1
            actionGrids.graze[r][2],    // 13: eat 2
            actionGrids.hurt[r][0],     // 14: hurt
            actionGrids.death[r][0],    // 15: death 0
            actionGrids.death[r][1],    // 16: death 1
            actionGrids.death[r][2],    // 17: death 2 (carcass)
            actionGrids.idle[r][0],     // 18: idle 0
            actionGrids.idle[r][1]      // 19: idle 1
        ];

        for (let c = 0; c < 20; c++) {
            blitFrame(buf, totalW, colMap[c], fw, fh, c * fw, r * fh);
        }
    }

    reducePalette(buf, 31);
    writePNG(outPath, totalW, totalH, buf);
    fs.writeFileSync(outPath.replace(/\.png$/, '.json'), JSON.stringify(sidecarJson, null, 2) + '\n');
}

function renderReviewShowcase(species, actionGrids, fw, fh, outPath) {
    const showCols = [
        { name: 'idle', grid: actionGrids.idle, col: 1 },
        { name: 'walk', grid: actionGrids.walk, col: 2 },
        { name: 'action', grid: actionGrids.action, col: 1 },
        { name: 'attack', grid: actionGrids.attack, col: 1 },
        { name: 'graze', grid: actionGrids.graze, col: 1 },
        { name: 'hurt', grid: actionGrids.hurt, col: 0 },
        { name: 'death', grid: actionGrids.death, col: 2 }
    ];

    const rows = [
        { name: 'South (Down)', r: 0 },
        { name: 'South-West', r: 1 },
        { name: 'West (Left)', r: 2 },
        { name: 'East (Right)', r: 6 },
        { name: 'North (Up)', r: 4 }
    ];

    const scale = (fw === 96) ? 2 : 4;
    const cellW = fw * scale;
    const cellH = fh * scale;
    const pad = 12;
    const totalW = showCols.length * (cellW + pad) + pad;
    const totalH = rows.length * (cellH + pad) + pad;

    const bg = Buffer.alloc(totalW * totalH * 4);
    for (let y = 0; y < totalH; y++) {
        for (let x = 0; x < totalW; x++) {
            const idx = (y * totalW + x) * 4;
            bg[idx] = 68;
            bg[idx + 1] = 78;
            bg[idx + 2] = 54;
            bg[idx + 3] = 255;
        }
    }

    for (let r = 0; r < rows.length; r++) {
        const rowInfo = rows[r];
        for (let c = 0; c < showCols.length; c++) {
            const act = showCols[c];
            const frameBuf = act.grid[rowInfo.r][act.col];
            const dx = pad + c * (cellW + pad);
            const dy = pad + r * (cellH + pad);

            // Draw frame scaled nearest
            for (let sy = 0; sy < fh; sy++) {
                for (let sx = 0; sx < fw; sx++) {
                    const sidx = (sy * fw + sx) * 4;
                    if (frameBuf[sidx + 3] === 0) continue;
                    for (let sdy = 0; sdy < scale; sdy++) {
                        const ty = dy + sy * scale + sdy;
                        for (let sdx = 0; sdx < scale; sdx++) {
                            const tx = dx + sx * scale + sdx;
                            const didx = (ty * totalW + tx) * 4;
                            bg[didx] = frameBuf[sidx];
                            bg[didx + 1] = frameBuf[sidx + 1];
                            bg[didx + 2] = frameBuf[sidx + 2];
                            bg[didx + 3] = 255;
                        }
                    }
                }
            }
        }
    }

    writePNG(outPath, totalW, totalH, bg);
    console.log(`Saved review showcase: ${outPath}`);
}

// -------------------------------------------------------------
// MAIN WORKFLOW
// -------------------------------------------------------------
async function main() {
    console.log('=== Processing Wildlife & Monster Suites (Bear, Giant Spider, Troll) ===');

    // 1. PROCESS BEAR
    console.log('--- Generating Bear Suite (48x48) ---');
    const bSouth = renderBearBaseSouth();
    const bWest = renderBearBaseWest();
    const bNorth = renderBearBaseNorth();
    const bSouthWest = renderBearBaseSouthWest();
    const bNorthWest = renderBearBaseNorthWest();
    const bNorthEast = mirrorFrame(bNorthWest, 48, 48);
    const bEast = mirrorFrame(bWest, 48, 48);
    const bSouthEast = mirrorFrame(bSouthWest, 48, 48);

    const bFacings = [bSouth, bSouthWest, bWest, bNorthWest, bNorth, bNorthEast, bEast, bSouthEast];
    const bCarcassWest = renderBearCarcass();
    const bCarcassEast = mirrorFrame(bCarcassWest, 48, 48);

    const bearActions = buildBearActions(bFacings, bCarcassWest, bCarcassEast);

    // Save individual action masters for Bear
    const actNames = ['idle', 'walk', 'action', 'attack', 'graze', 'hurt', 'death'];
    for (const act of actNames) {
        assembleMasterSheet(bearActions[act], 3, 8, 48, 48,
            path.join(ROOT, 'art', 'masters', `bear_${act}.png`),
            { id: `bear_${act}`, species: 'bear', frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1], facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"], frameMs: 150, category: 'wildlife' }
        );
    }

    // AR-600 Master
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
    console.log('[SUCCESS] Bear suite generated and saved!');

    // 2. PROCESS GIANT SPIDER
    console.log('--- Generating Giant Spider Suite (96x96) ---');
    const spiderIdleImg = readPNG(path.join(ROOT, 'art', 'masters', 'giant_spider_idle.png'));
    const spiderActions = buildSpiderActions(spiderIdleImg.data);

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
    console.log('[SUCCESS] Giant Spider suite generated and saved!');

    // 3. PROCESS TROLL
    console.log('--- Generating Troll Suite (96x96) ---');
    const trollIdleImg = readPNG(path.join(ROOT, 'art', 'masters', 'troll_idle.png'));
    const trollActions = buildTrollActions(trollIdleImg.data);

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
    console.log('[SUCCESS] Troll suite generated and saved!');

    console.log('=== All Wildlife & Monster Suites Successfully Processed! ===');
}

main().catch(console.error);

