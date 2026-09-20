'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'raw');
const SYS_DIR = path.join(ROOT, 'game', 'img', 'system');
const MASTER_DIR = path.join(ROOT, 'art', 'masters');
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
    if (r > 150 && g < 90 && b > 150) return true;
    if (r > 80 && b > 70 && g < 65 && Math.abs(r - b) < 45) return true;
    return false;
}

function keepLargestComponent(buf, w, h) {
    const visited = new Uint8Array(w * h);
    const components = [];
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            if (visited[idx] || buf[idx * 4 + 3] === 0) continue;
            const comp = [];
            const queue = [x, y];
            visited[idx] = 1;
            while (queue.length > 0) {
                const qy = queue.pop();
                const qx = queue.pop();
                comp.push([qx, qy]);
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = qx + dx, ny = qy + dy;
                        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                            const nIdx = ny * w + nx;
                            if (!visited[nIdx] && buf[nIdx * 4 + 3] > 0) {
                                visited[nIdx] = 1;
                                queue.push(nx, ny);
                            }
                        }
                    }
                }
            }
            components.push(comp);
        }
    }
    if (components.length <= 1) return buf;
    components.sort((a, b) => b.length - a.length);
    const largest = new Set(components[0].map(([x, y]) => y * w + x));
    const out = Buffer.from(buf);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            if (!largest.has(idx)) out[idx * 4 + 3] = 0;
        }
    }
    return out;
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
                const r = buf[idx], g = buf[idx + 1], b = buf[idx + 2];
                const isGlow = (r > 200 && g > 220 && b > 240) || (r > 80 && g > 185 && b > 225) || (r > 180 && g < 60 && b < 60);
                if (!isGlow) {
                    buf[idx]     = C_DARK_OUTLINE[0];
                    buf[idx + 1] = C_DARK_OUTLINE[1];
                    buf[idx + 2] = C_DARK_OUTLINE[2];
                }
            }
        }
    }
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

function processSingleCursor(rawFile, facKey) {
    const img = decodePNG(fs.readFileSync(path.join(RAW_DIR, rawFile)));
    let minX = img.width, maxX = 0, minY = img.height, maxY = 0;
    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
            const pIdx = (y * img.width + x) * 4;
            if (!isMagenta(img.data[pIdx], img.data[pIdx + 1], img.data[pIdx + 2])) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    const curW = maxX - minX + 1;
    const curH = maxY - minY + 1;
    const scale = Math.min(38.0 / curW, 38.0 / curH);
    let curBuf = Buffer.alloc(48 * 48 * 4);

    for (let cy = 0; cy < 48; cy++) {
        for (let cx = 0; cx < 48; cx++) {
            const srcX = Math.round(minX + (cx - 4) / scale);
            const srcY = Math.round(minY + (cy - 4) / scale);
            if (srcX >= minX && srcX <= maxX && srcY >= minY && srcY <= maxY) {
                const sIdx = (srcY * img.width + srcX) * 4;
                if (!isMagenta(img.data[sIdx], img.data[sIdx + 1], img.data[sIdx + 2])) {
                    const sn = pal.snap(img.data[sIdx], img.data[sIdx + 1], img.data[sIdx + 2]);
                    const dIdx = (cy * 48 + cx) * 4;
                    curBuf[dIdx]     = sn[0];
                    curBuf[dIdx + 1] = sn[1];
                    curBuf[dIdx + 2] = sn[2];
                    curBuf[dIdx + 3] = 255;
                }
            }
        }
    }

    curBuf = keepLargestComponent(curBuf, 48, 48);

    // Find topmost/leftmost point
    let minD = Infinity, bestX = 4, bestY = 4;
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const idx = (y * 48 + x) * 4;
            if (curBuf[idx + 3] > 0) {
                const d = x + y;
                if (d < minD) { minD = d; bestX = x; bestY = y; }
            }
        }
    }

    const dx = 4 - bestX;
    const dy = 4 - bestY;
    const shifted = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        const ny = y + dy;
        if (ny < 0 || ny >= 48) continue;
        for (let x = 0; x < 48; x++) {
            const nx = x + dx;
            if (nx < 0 || nx >= 48) continue;
            const sIdx = (y * 48 + x) * 4;
            if (curBuf[sIdx + 3] === 0) continue;
            const dIdx = (ny * 48 + nx) * 4;
            shifted[dIdx]     = curBuf[sIdx];
            shifted[dIdx + 1] = curBuf[sIdx + 1];
            shifted[dIdx + 2] = curBuf[sIdx + 2];
            shifted[dIdx + 3] = 255;
        }
    }

    const tipIdx = (4 * 48 + 4) * 4;
    shifted[tipIdx]     = 255;
    shifted[tipIdx + 1] = 255;
    shifted[tipIdx + 2] = 255;
    shifted[tipIdx + 3] = 255;

    applyDarkOutline(shifted, 48, 48);
    quantizeSheet(shifted, 48, 48, 31);

    fs.writeFileSync(path.join(SYS_DIR, `Cursor_${facKey}.png`), writePNG(shifted, 48, 48));
    fs.writeFileSync(path.join(MASTER_DIR, `Cursor_${facKey}.png`), writePNG(shifted, 48, 48));

    const sidecar = {
        name: `Cursor_${facKey}`,
        culture: facKey,
        about: `Pointy 16-bit mouse cursor for ${facKey} (hotspot: [4, 4]).`,
        frameWidth: 48,
        frameHeight: 48,
        anchor: [4, 4],
        facings: ["S"],
        animations: { default: [0] },
        layer: "ui_cursor",
        palette: "art/palette/uf.hex"
    };
    fs.writeFileSync(path.join(MASTER_DIR, `Cursor_${facKey}.json`), JSON.stringify(sidecar, null, 2));
    console.log(`Saved pointy Cursor_${facKey}.png at [4, 4]`);
}

processSingleCursor('cursor_dwarf_pick_raw.png', 'dwarf');
processSingleCursor('cursor_orc_dagger_raw.png', 'orc');
