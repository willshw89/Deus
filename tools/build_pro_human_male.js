'use strict';

/**
 * tools/build_pro_human_male.js
 *
 * Master compilation tool for Adult Male Human (Serious Chibi ~3.1 heads, 43px height, grounded y=47)
 * generated strictly via Google Nano Banana Pro (gemini-3-pro-image) per AGENTS.md Rule 11.
 *
 * 12 Sprites per Action Suite (3 cols x 4 rows: South, West, East, North).
 * Snapped to art/palette/uf.hex (<= 31 opaque colors).
 * Outputs to game/img/characters/$UF_Human_Male_*.png and .json sidecars.
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');
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
        colors: unique,
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
const C_DARK_OUTLINE = pal.snap(24, 16, 10);

function isMagenta(r, g, b) {
    // Magenta chroma key (high red and high blue, low green)
    if (r > 130 && b > 130 && g < 100) return true;
    // Cyan chroma key (low red, high green and high blue)
    if (r < 70 && g > 130 && b > 130) return true;
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

function mirrorFrame(frame) {
    const out = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            const dIdx = (y * 48 + (47 - x)) * 4;
            out[dIdx]     = frame[sIdx];
            out[dIdx + 1] = frame[sIdx + 1];
            out[dIdx + 2] = frame[sIdx + 2];
            out[dIdx + 3] = frame[sIdx + 3];
        }
    }
    return out;
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

function extractFrameFromCell(img, minX, maxX, minY, maxY, targetH = 43, maxW = 44) {
    const startX = minX + 15, endX = maxX - 15;
    const startY = minY + 15, endY = maxY - 15;

    let sMinX = Infinity, sMaxX = -Infinity, sMinY = Infinity, sMaxY = -Infinity;
    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            const idx = (y * img.width + x) * 4;
            const r = img.data[idx], g = img.data[idx+1], b = img.data[idx+2];
            if (!isMagenta(r, g, b)) {
                if (x < sMinX) sMinX = x;
                if (x > sMaxX) sMaxX = x;
                if (y < sMinY) sMinY = y;
                if (y > sMaxY) sMaxY = y;
            }
        }
    }

    if (sMinX === Infinity) return Buffer.alloc(48 * 48 * 4);

    const origW = sMaxX - sMinX + 1;
    const origH = sMaxY - sMinY + 1;
    let scale = targetH / origH;
    if (origW * scale > maxW) {
        scale = maxW / origW;
    }
    const outW = Math.round(origW * scale);
    const outH = Math.round(origH * scale);

    const out = Buffer.alloc(48 * 48 * 4);
    const dstBaseline = 47;
    const dstY0 = dstBaseline - outH + 1;
    const dstX0 = Math.round(24 - outW / 2);

    for (let dy = 0; dy < outH; dy++) {
        const ty = dstY0 + dy;
        if (ty < 0 || ty >= 48) continue;
        for (let dx = 0; dx < outW; dx++) {
            const tx = dstX0 + dx;
            if (tx < 0 || tx >= 48) continue;

            const srcMinX = sMinX + Math.floor(dx / scale);
            const srcMaxX = sMinX + Math.floor((dx + 1) / scale);
            const srcMinY = sMinY + Math.floor(dy / scale);
            const srcMaxY = sMinY + Math.floor((dy + 1) / scale);

            let rSum = 0, gSum = 0, bSum = 0, count = 0;
            for (let sy = srcMinY; sy <= srcMaxY; sy++) {
                if (sy < startY || sy > endY) continue;
                for (let sx = srcMinX; sx <= srcMaxX; sx++) {
                    if (sx < startX || sx > endX) continue;
                    const idx = (sy * img.width + sx) * 4;
                    const r = img.data[idx], g = img.data[idx+1], b = img.data[idx+2];
                    if (!isMagenta(r, g, b)) {
                        rSum += r; gSum += g; bSum += b; count++;
                    }
                }
            }
            if (count > 0) {
                const avgR = Math.round(rSum / count);
                const avgG = Math.round(gSum / count);
                const avgB = Math.round(bSum / count);
                const snapped = pal.snap(avgR, avgG, avgB);
                const dIdx = (ty * 48 + tx) * 4;
                out[dIdx]   = snapped[0];
                out[dIdx+1] = snapped[1];
                out[dIdx+2] = snapped[2];
                out[dIdx+3] = 255;
            }
        }
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

function checkFrameFacing(frame, w = 48, h = 48) {
    let leftSkin = 0, rightSkin = 0;
    let leftAlpha = 0, rightAlpha = 0;
    for (let py = 8; py < 34; py++) {
        for (let px = 0; px < 24; px++) {
            const idx = (py * w + px) * 4;
            if (frame[idx + 3] > 50) {
                leftAlpha++;
                const r = frame[idx], g = frame[idx + 1], b = frame[idx + 2];
                if ((r > 130 && g > 80 && b > 50) || (g > r && g > b && g > 80)) leftSkin++;
            }
        }
        for (let px = 24; px < 48; px++) {
            const idx = (py * w + px) * 4;
            if (frame[idx + 3] > 50) {
                rightAlpha++;
                const r = frame[idx], g = frame[idx + 1], b = frame[idx + 2];
                if ((r > 130 && g > 80 && b > 50) || (g > r && g > b && g > 80)) rightSkin++;
            }
        }
    }
    const skinDiff = leftSkin - rightSkin;
    const alphaDiff = leftAlpha - rightAlpha;
    return (skinDiff > 5) ? 'LEFT' : (skinDiff < -5) ? 'RIGHT' : (alphaDiff > 0) ? 'LEFT' : 'RIGHT';
}

function assemble12SpriteSheet(framesByFacing) {
    const buf = Buffer.alloc(144 * 192 * 4);

    // Standardize West (Row 1) to ALL LEFT (VISION V110, Rule 12)
    const westFrames = framesByFacing.W.map(f => (checkFrameFacing(f) === 'RIGHT' ? mirrorFrame(f) : f));
    // Standardize East (Row 2) to ALL RIGHT (either mirrored West or normalized East)
    const eastFrames = framesByFacing.E
        ? framesByFacing.E.map(f => (checkFrameFacing(f) === 'LEFT' ? mirrorFrame(f) : f))
        : westFrames.map(mirrorFrame);

    const rows = [
        framesByFacing.S,
        westFrames,
        eastFrames,
        framesByFacing.N
    ];

    for (let r = 0; r < 4; r++) {
        const frameArr = rows[r];
        for (let c = 0; c < 3; c++) {
            const frame = frameArr[c];
            for (let py = 0; py < 48; py++) {
                for (let px = 0; px < 48; px++) {
                    const sIdx = (py * 48 + px) * 4;
                    if (frame[sIdx + 3] > 0) {
                        const dIdx = ((r * 48 + py) * 144 + (c * 48 + px)) * 4;
                        buf[dIdx]     = frame[sIdx];
                        buf[dIdx + 1] = frame[sIdx + 1];
                        buf[dIdx + 2] = frame[sIdx + 2];
                        buf[dIdx + 3] = 255;
                    }
                }
            }
        }
    }
    quantizeSheet(buf, 144, 192, 31);
    return buf;
}

function saveSheetAndSidecar(buf, baseName, actionTag, animations) {
    const pngPath = path.join(CHAR_DIR, `$UF_${baseName}.png`);
    writePNG(pngPath, 144, 192, buf);

    const sidecar = {
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ['S', 'W', 'E', 'N'],
        animations: animations,
        frameMs: 180,
        species: 'human',
        stage: 'adult',
        gender: 'male',
        action: actionTag,
        style: 'Serious Chibi (VISION V116)',
        generator: 'Google Nano Banana Pro (gemini-3-pro-image, Rule 11, VISION V109)'
    };
    fs.writeFileSync(path.join(CHAR_DIR, `$UF_${baseName}.json`), JSON.stringify(sidecar, null, 2));
    console.log(`Saved $UF_${baseName}.png and .json (quantized <= 31 colors, grounded y=47)`);
}

const UNIFORM_SCALE = 43.0 / 234.0;

function extractUniformCell(img, minX, maxX, minY, maxY) {
    const startX = minX + 5, endX = maxX - 5;
    const startY = minY + 5, endY = maxY - 5;

    let sMinX = Infinity, sMaxX = -Infinity, sMinY = Infinity, sMaxY = -Infinity;
    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            const idx = (y * img.width + x) * 4;
            const r = img.data[idx], g = img.data[idx+1], b = img.data[idx+2];
            if (!isMagenta(r, g, b)) {
                if (x < sMinX) sMinX = x;
                if (x > sMaxX) sMaxX = x;
                if (y < sMinY) sMinY = y;
                if (y > sMaxY) sMaxY = y;
            }
        }
    }

    if (sMinX === Infinity) return Buffer.alloc(48 * 48 * 4);

    const out = Buffer.alloc(48 * 48 * 4);
    const rawFootY = sMaxY;
    const rawCenterX = (sMinX + sMaxX) / 2;

    for (let outY = 0; outY < 48; outY++) {
        const dyFromBase = 47 - outY;
        const rawY0 = Math.round(rawFootY - (dyFromBase + 1) / UNIFORM_SCALE);
        const rawY1 = Math.round(rawFootY - dyFromBase / UNIFORM_SCALE);

        if (rawY1 < sMinY || rawY0 > sMaxY || rawY1 < 0 || rawY0 >= img.height) continue;

        for (let outX = 0; outX < 48; outX++) {
            const dxFromCenter = outX - 24;
            const rawX0 = Math.round(rawCenterX + dxFromCenter / UNIFORM_SCALE);
            const rawX1 = Math.round(rawCenterX + (dxFromCenter + 1) / UNIFORM_SCALE);

            if (rawX1 < sMinX || rawX0 > sMaxX || rawX1 < 0 || rawX0 >= img.width) continue;

            let sumR = 0, sumG = 0, sumB = 0, count = 0;
            for (let ry = Math.max(sMinY, rawY0); ry <= Math.min(sMaxY, rawY1); ry++) {
                for (let rx = Math.max(sMinX, rawX0); rx <= Math.min(sMaxX, rawX1); rx++) {
                    const idx = (ry * img.width + rx) * 4;
                    const r = img.data[idx], g = img.data[idx+1], b = img.data[idx+2];
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

module.exports = {
    pal,
    isMagenta,
    applyDarkOutline,
    extractFrameFromCell,
    extractUniformCell,
    mirrorFrame,
    assemble12SpriteSheet,
    saveSheetAndSidecar,
    quantizeSheet,
    checkFrameFacing
};

