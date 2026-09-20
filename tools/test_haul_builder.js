#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
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

const C_OUTLINE     = pal.snap(24, 20, 32);
const C_SKIN_BASE   = pal.snap(232, 192, 160);
const C_SKIN_SHADE  = pal.snap(184, 144, 116);
const C_TUNIC_BASE  = pal.snap(48, 140, 48);
const C_TUNIC_SHADE = pal.snap(28, 88, 32);
const C_PANTS_BASE  = pal.snap(88, 64, 48);
const C_PANTS_SHADE = pal.snap(52, 38, 28);
const C_SACK_LIGHT  = pal.snap(210, 180, 135); // Burlap sunny highlight
const C_SACK_BASE   = pal.snap(175, 140, 95);  // Burlap tan
const C_SACK_SHADE  = pal.snap(120, 85, 50);   // Burlap crease shadow
const C_SACK_ROPE   = pal.snap(240, 230, 195); // Hemp cord tie

function applyDarkOutline(buf, w, h) {
    const isOpaque = (x, y) => {
        if (x < 0 || x >= w || y < 0 || y >= h) return false;
        return buf[(y * w + x) * 4 + 3] > 0;
    };
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
                buf[idx]     = C_OUTLINE[0];
                buf[idx + 1] = C_OUTLINE[1];
                buf[idx + 2] = C_OUTLINE[2];
            }
        }
    }
}

function buildHaulFrame(baseWalkFrame, facing, isChild = false) {
    const out = Buffer.from(baseWalkFrame);

    const setPixel = (x, y, col) => {
        if (x >= 0 && x < 48 && y >= 0 && y < 48) {
            const o = (y * 48 + x) * 4;
            out[o] = col[0]; out[o + 1] = col[1]; out[o + 2] = col[2]; out[o + 3] = 255;
        }
    };

    const clearPixel = (x, y) => {
        if (x >= 0 && x < 48 && y >= 0 && y < 48) {
            const o = (y * 48 + x) * 4;
            out[o + 3] = 0;
        }
    };

    if (facing === 'S') {
        const yStart = isChild ? 28 : 24;
        const yEnd   = isChild ? 38 : 37;

        // Clear hanging lower arms/hands at flanks
        for (let y = 28; y <= 36; y++) {
            for (let x = 12; x <= 16; x++) clearPixel(x, y);
            for (let x = 32; x <= 36; x++) clearPixel(x, y);
        }

        // 1. Shoulders & Bent Arms
        if (!isChild) {
            // Left arm bent inward
            setPixel(15, 26, C_TUNIC_BASE); setPixel(16, 26, C_TUNIC_BASE);
            setPixel(14, 27, C_TUNIC_BASE); setPixel(15, 27, C_TUNIC_BASE); setPixel(16, 27, C_TUNIC_BASE);
            setPixel(14, 28, C_TUNIC_BASE); setPixel(15, 28, C_TUNIC_BASE);
            setPixel(15, 29, C_TUNIC_BASE); setPixel(16, 29, C_TUNIC_BASE);
            setPixel(16, 30, C_TUNIC_BASE); setPixel(17, 30, C_TUNIC_BASE);
            setPixel(17, 31, C_TUNIC_BASE); setPixel(18, 31, C_TUNIC_BASE);

            // Right arm bent inward
            setPixel(32, 26, C_TUNIC_BASE); setPixel(33, 26, C_TUNIC_BASE);
            setPixel(32, 27, C_TUNIC_SHADE); setPixel(33, 27, C_TUNIC_SHADE); setPixel(34, 27, C_TUNIC_SHADE);
            setPixel(33, 28, C_TUNIC_SHADE); setPixel(34, 28, C_TUNIC_SHADE);
            setPixel(32, 29, C_TUNIC_SHADE); setPixel(33, 29, C_TUNIC_SHADE);
            setPixel(31, 30, C_TUNIC_SHADE); setPixel(32, 30, C_TUNIC_SHADE);
            setPixel(30, 31, C_TUNIC_SHADE); setPixel(31, 31, C_TUNIC_SHADE);
        } else {
            setPixel(16, 28, C_TUNIC_BASE); setPixel(17, 29, C_TUNIC_BASE);
            setPixel(31, 28, C_TUNIC_SHADE); setPixel(30, 29, C_TUNIC_SHADE);
        }

        // 2. Pear-shaped Burlap Sack
        const neckX = 24;
        // Ruffled top
        setPixel(neckX - 2, yStart, C_SACK_LIGHT);
        setPixel(neckX - 1, yStart, C_SACK_LIGHT);
        setPixel(neckX,     yStart, C_SACK_BASE);
        setPixel(neckX + 1, yStart, C_SACK_BASE);
        setPixel(neckX + 2, yStart, C_SACK_SHADE);

        // Tied cord
        setPixel(neckX - 2, yStart + 1, C_OUTLINE);
        setPixel(neckX - 1, yStart + 1, C_SACK_ROPE);
        setPixel(neckX,     yStart + 1, C_SACK_ROPE);
        setPixel(neckX + 1, yStart + 1, C_SACK_ROPE);
        setPixel(neckX + 2, yStart + 1, C_OUTLINE);
        setPixel(neckX + 2, yStart + 2, C_SACK_ROPE);

        // Body rows
        const radii = isChild ?
            [2, 3, 4, 5, 5, 5, 4, 3, 2] :
            [3, 4, 5, 6, 7, 7, 7, 6, 5, 4, 3];

        radii.forEach((r, idx) => {
            const y = yStart + 2 + idx;
            if (y > yEnd) return;
            for (let dx = -r; dx <= r; dx++) {
                const px = neckX + dx;
                let col;
                if (dx === -r || dx === r || y === yEnd) {
                    col = C_OUTLINE;
                } else if (dx <= -r + 2 && idx <= 4) {
                    col = C_SACK_LIGHT;
                } else if (dx >= r - 2 || idx >= radii.length - 3) {
                    col = C_SACK_SHADE;
                } else if ((dx + idx) % 4 === 0) {
                    col = C_SACK_SHADE;
                } else {
                    col = C_SACK_BASE;
                }
                setPixel(px, y, col);
            }
        });

        // Hands cupping sack
        if (!isChild) {
            setPixel(18, yStart + 7, C_SKIN_BASE); setPixel(19, yStart + 7, C_SKIN_BASE);
            setPixel(18, yStart + 8, C_SKIN_SHADE); setPixel(19, yStart + 8, C_SKIN_SHADE);

            setPixel(29, yStart + 7, C_SKIN_BASE); setPixel(30, yStart + 7, C_SKIN_BASE);
            setPixel(29, yStart + 8, C_SKIN_SHADE); setPixel(30, yStart + 8, C_SKIN_SHADE);
        } else {
            setPixel(19, yStart + 5, C_SKIN_BASE);
            setPixel(29, yStart + 5, C_SKIN_BASE);
        }

    } else if (facing === 'SW') {
        const yStart = isChild ? 28 : 24;
        const yEnd   = isChild ? 38 : 37;

        // Clear hanging hands
        for (let y = 29; y <= 36; y++) {
            for (let x = 12; x <= 15; x++) clearPixel(x, y);
            for (let x = 30; x <= 34; x++) clearPixel(x, y);
        }

        // Near bent arm
        setPixel(15, 27, C_TUNIC_BASE); setPixel(16, 27, C_TUNIC_BASE);
        setPixel(14, 28, C_TUNIC_BASE); setPixel(15, 28, C_TUNIC_BASE);
        setPixel(15, 29, C_TUNIC_BASE); setPixel(16, 29, C_TUNIC_BASE);

        // Rear arm reaching forward
        setPixel(29, 27, C_TUNIC_SHADE); setPixel(30, 27, C_TUNIC_SHADE);
        setPixel(28, 28, C_TUNIC_SHADE); setPixel(29, 28, C_TUNIC_SHADE);
        setPixel(27, 29, C_TUNIC_SHADE); setPixel(28, 29, C_TUNIC_SHADE);

        const neckX = 21;
        setPixel(neckX - 1, yStart, C_SACK_LIGHT);
        setPixel(neckX,     yStart, C_SACK_LIGHT);
        setPixel(neckX + 1, yStart, C_SACK_BASE);
        setPixel(neckX - 1, yStart + 1, C_SACK_ROPE);
        setPixel(neckX,     yStart + 1, C_SACK_ROPE);
        setPixel(neckX + 1, yStart + 1, C_SACK_ROPE);

        const widths = isChild ?
            [{ l: 3, r: 2 }, { l: 4, r: 3 }, { l: 5, r: 3 }, { l: 5, r: 3 }, { l: 4, r: 2 }] :
            [{ l: 3, r: 2 }, { l: 4, r: 3 }, { l: 5, r: 4 }, { l: 6, r: 5 }, { l: 6, r: 5 }, { l: 6, r: 5 }, { l: 5, r: 4 }, { l: 4, r: 3 }, { l: 3, r: 2 }];

        widths.forEach((w, idx) => {
            const y = yStart + 2 + idx;
            if (y > yEnd) return;
            for (let dx = -w.l; dx <= w.r; dx++) {
                const px = neckX + dx;
                let col;
                if (dx === -w.l || dx === w.r || y === yEnd) col = C_OUTLINE;
                else if (dx <= -w.l + 2 && idx <= 3) col = C_SACK_LIGHT;
                else if (dx >= w.r - 1 || idx >= widths.length - 2) col = C_SACK_SHADE;
                else if ((dx + idx) % 4 === 0) col = C_SACK_SHADE;
                else col = C_SACK_BASE;
                setPixel(px, y, col);
            }
        });

        // Hands visible
        setPixel(16, yStart + 6, C_SKIN_BASE); setPixel(16, yStart + 7, C_SKIN_SHADE);
        setPixel(25, yStart + 7, C_SKIN_BASE); setPixel(26, yStart + 7, C_SKIN_BASE);

    } else if (facing === 'W') {
        const yStart = isChild ? 28 : 24;
        const yEnd   = isChild ? 38 : 37;

        // Clear ONLY hanging arm at x=25..27, y=28..33 (leave back at x>=28 completely intact!)
        for (let y = 28; y <= 33; y++) {
            for (let x = 25; x <= 27; x++) {
                if (y <= 31) setPixel(x, y, C_TUNIC_SHADE); // restore tunic
                else setPixel(x, y, C_PANTS_BASE);           // restore pants
            }
        }

        // Arm reaching forward from shoulder (x=23, y=26)
        setPixel(22, 27, C_TUNIC_BASE); setPixel(23, 27, C_TUNIC_BASE);
        setPixel(21, 28, C_TUNIC_BASE); setPixel(22, 28, C_TUNIC_BASE);
        setPixel(20, 29, C_TUNIC_BASE); setPixel(21, 29, C_TUNIC_BASE);
        setPixel(19, 30, C_TUNIC_BASE); setPixel(20, 30, C_TUNIC_BASE);
        setPixel(18, 31, C_TUNIC_BASE); setPixel(19, 31, C_TUNIC_BASE);
        // Hand cupping bottom of sack
        setPixel(16, 32, C_SKIN_BASE); setPixel(17, 32, C_SKIN_BASE);
        setPixel(16, 33, C_SKIN_SHADE); setPixel(17, 33, C_SKIN_SHADE);

        // Top gather
        setPixel(14, yStart, C_SACK_LIGHT);
        setPixel(15, yStart, C_SACK_LIGHT);
        setPixel(14, yStart + 1, C_SACK_ROPE);
        setPixel(15, yStart + 1, C_SACK_ROPE);
        setPixel(16, yStart + 1, C_OUTLINE);

        // Bulbous sack in front of chest
        const profileWidths = isChild ?
            [{ x0: 13, x1: 19 }, { x0: 12, x1: 20 }, { x0: 11, x1: 21 }, { x0: 11, x1: 21 }, { x0: 12, x1: 20 }, { x0: 13, x1: 19 }] :
            [{ x0: 13, x1: 19 }, { x0: 12, x1: 20 }, { x0: 11, x1: 21 }, { x0: 10, x1: 22 }, { x0: 10, x1: 22 }, { x0: 10, x1: 22 }, { x0: 11, x1: 21 }, { x0: 12, x1: 20 }, { x0: 13, x1: 19 }];

        profileWidths.forEach((p, idx) => {
            const y = yStart + 2 + idx;
            if (y > yEnd) return;
            for (let px = p.x0; px <= p.x1; px++) {
                let col;
                if (px === p.x0 || px === p.x1 || y === yEnd) col = C_OUTLINE;
                else if (px <= p.x0 + 2 && idx <= 3) col = C_SACK_LIGHT;
                else if (px >= p.x1 - 2 || idx >= profileWidths.length - 2) col = C_SACK_SHADE;
                else if ((px + idx) % 4 === 0) col = C_SACK_SHADE;
                else col = C_SACK_BASE;
                setPixel(px, y, col);
            }
        });

    } else if (facing === 'NW') {
        const yStart = isChild ? 28 : 24;
        const yEnd   = isChild ? 37 : 36;

        // In NW, sack peeks out forward-left in an organic rounded bulge
        const nwProfile = isChild ?
            [{ x0: 13, x1: 17 }, { x0: 12, x1: 18 }, { x0: 12, x1: 18 }, { x0: 13, x1: 17 }] :
            [{ x0: 13, x1: 17 }, { x0: 12, x1: 18 }, { x0: 11, x1: 19 }, { x0: 11, x1: 19 }, { x0: 11, x1: 19 }, { x0: 12, x1: 18 }, { x0: 13, x1: 17 }];

        nwProfile.forEach((p, idx) => {
            const y = yStart + 3 + idx;
            if (y > yEnd) return;
            for (let px = p.x0; px <= p.x1; px++) {
                let col;
                if (px === p.x0 || px === p.x1 || y === yEnd) col = C_OUTLINE;
                else if (px <= p.x0 + 2) col = C_SACK_LIGHT;
                else col = C_SACK_BASE;
                setPixel(px, y, col);
            }
        });

        // Left arm bent forward holding sack
        setPixel(16, 27, C_TUNIC_BASE); setPixel(17, 27, C_TUNIC_BASE);
        setPixel(15, 28, C_TUNIC_BASE); setPixel(16, 28, C_TUNIC_BASE);
        setPixel(15, 29, C_TUNIC_BASE); setPixel(16, 29, C_TUNIC_BASE);

    } else if (facing === 'N') {
        const yStart = isChild ? 28 : 24;

        // Clear hanging lower hands at sides
        for (let y = 29; y <= 34; y++) {
            for (let x = 12; x <= 15; x++) clearPixel(x, y);
            for (let x = 32; x <= 35; x++) clearPixel(x, y);
        }

        // Bent elbows flared forward
        setPixel(15, 27, C_TUNIC_BASE); setPixel(16, 27, C_TUNIC_BASE);
        setPixel(14, 28, C_TUNIC_BASE); setPixel(15, 28, C_TUNIC_BASE);
        setPixel(14, 29, C_TUNIC_BASE); setPixel(15, 29, C_TUNIC_BASE);

        setPixel(31, 27, C_TUNIC_SHADE); setPixel(32, 27, C_TUNIC_SHADE);
        setPixel(32, 28, C_TUNIC_SHADE); setPixel(33, 28, C_TUNIC_SHADE);
        setPixel(32, 29, C_TUNIC_SHADE); setPixel(33, 29, C_TUNIC_SHADE);

        // Bulge of sack visible at flanks in front of waist
        for (let y = yStart + 5; y <= yStart + 9; y++) {
            const lx = isChild ? 16 : 15;
            const rx = isChild ? 31 : 32;
            setPixel(lx - 1, y, C_OUTLINE);
            setPixel(lx,     y, C_SACK_LIGHT);
            setPixel(rx,     y, C_SACK_SHADE);
            setPixel(rx + 1, y, C_OUTLINE);
        }
    }

    applyDarkOutline(out, 48, 48);
    return out;
}

const maleWalkRaw = decodePNG(fs.readFileSync(path.join(CHAR_DIR, '$UF_Elf_8D.png')));
function getF(col, row) {
    const frame = Buffer.alloc(48 * 48 * 4);
    for (let py = 0; py < 48; py++) {
        for (let px = 0; px < 48; px++) {
            const sIdx = ((row * 48 + py) * 144 + (col * 48 + px)) * 4;
            const dIdx = (py * 48 + px) * 4;
            frame[dIdx]     = maleWalkRaw.data[sIdx];
            frame[dIdx + 1] = maleWalkRaw.data[sIdx + 1];
            frame[dIdx + 2] = maleWalkRaw.data[sIdx + 2];
            frame[dIdx + 3] = maleWalkRaw.data[sIdx + 3];
        }
    }
    return frame;
}

console.log('Testing updated haul sack builder...');
const hS = buildHaulFrame(getF(1, 0), 'S', false);
const hSW = buildHaulFrame(getF(1, 1), 'SW', false);
const hW = buildHaulFrame(getF(1, 2), 'W', false);
const hNW = buildHaulFrame(getF(1, 3), 'NW', false);
const hN = buildHaulFrame(getF(1, 4), 'N', false);

// 3 frames of walk South
const hS_walkL = buildHaulFrame(getF(0, 0), 'S', false);
const hS_stand = buildHaulFrame(getF(1, 0), 'S', false);
const hS_walkR = buildHaulFrame(getF(2, 0), 'S', false);

// 3 frames of walk West
const hW_walkL = buildHaulFrame(getF(0, 2), 'W', false);
const hW_stand = buildHaulFrame(getF(1, 2), 'W', false);
const hW_walkR = buildHaulFrame(getF(2, 2), 'W', false);

// Write preview: 8 frames side by side (S, SW, W, NW, N, S-walkL, S-walkR, W-walkL)
const preview = Buffer.alloc(48 * 8 * 48 * 4);
[hS, hSW, hW, hNW, hN, hS_walkL, hS_walkR, hW_walkL].forEach((fr, i) => {
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
        const sIdx = (y * 48 + x) * 4;
        const dIdx = ((y * (48 * 8)) + (i * 48 + x)) * 4;
        preview[dIdx] = fr[sIdx];
        preview[dIdx + 1] = fr[sIdx + 1];
        preview[dIdx + 2] = fr[sIdx + 2];
        preview[dIdx + 3] = fr[sIdx + 3];
    }
});
writePNG(path.join(ROOT, 'art', 'review', 'test_haul_preview.png'), 48 * 8, 48, preview);
console.log('Saved updated art/review/test_haul_preview.png');
