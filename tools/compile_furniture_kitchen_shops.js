'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG, readPNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');
const RAW_DIR = path.join(ROOT, 'art', 'raw');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');

// ----------------------------------------------------------------------------
// Palette & Color Quantization (uf.hex CIELAB)
// ----------------------------------------------------------------------------
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

function isMagentaBackground(r, g, b, a) {
    if (a < 64) return true;
    // Bright magenta or pinkish hues
    return (r > 160 && b > 160 && g < 110) || (r > 130 && b > 140 && g < 80 && Math.abs(r - b) < 60);
}

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

// Builds a 144x192 RMMZ single character sheet from 1 or 3 frames (each 48x48)
function assemble144x192Sheet(frames) {
    const W = 144, H = 192;
    const outBuf = Buffer.alloc(W * H * 4);
    const fCount = frames.length;

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
            const frame = fCount === 1 ? frames[0] : frames[col % fCount];
            const startX = col * 48;
            const startY = row * 48;
            for (let py = 0; py < 48; py++) {
                for (let px = 0; px < 48; px++) {
                    const srcIdx = (py * 48 + px) * 4;
                    const dstIdx = ((startY + py) * W + (startX + px)) * 4;
                    outBuf[dstIdx] = frame[srcIdx];
                    outBuf[dstIdx + 1] = frame[srcIdx + 1];
                    outBuf[dstIdx + 2] = frame[srcIdx + 2];
                    outBuf[dstIdx + 3] = frame[srcIdx + 3];
                }
            }
        }
    }
    return outBuf;
}

module.exports = {
    loadPalette,
    pal,
    isMagentaBackground,
    quantizeTo32,
    assemble144x192Sheet
};
