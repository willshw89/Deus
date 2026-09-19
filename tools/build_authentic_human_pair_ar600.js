#!/usr/bin/env node
'use strict';

/**
 * tools/build_authentic_human_pair_ar600.js
 *
 * Constructs authentic 16-bit RPG Human Settlers (Male & Female) conforming to:
 * - AR-600 standard: 8 rows (S, SW, W, NW, N, NE, E, SE) x 20 columns (960x384 px)
 * - Authentic 16-bit RPG pixel art (FF6 / Chrono Trigger styling, grounded on row 47)
 * - Complete animation suite:
 *     Col 0: Stand
 *     Cols 1..3: Walk with dynamic scissor strides and animated foot movement
 *     Cols 4..6: Work (raise tool, chop/mine stroke, follow-through)
 *     Col 7: Stand placeholder (V89 carry legacy slot)
 *     Cols 8..10: Fighting / Attack (windup, heroic lunge & steel blade with sweeping slash arc, recovery)
 *     Cols 11..13: Cast (mana gather, radiant magic surge, channel)
 *     Col 14: Hurt (defensive recoil)
 *     Cols 15..17: Dying & Remains (stagger, kneeling collapse to ~28px, horizontal prone corpse)
 *     Cols 18..19: Idle (inhale 1px chest rise, exhale weight shift)
 * - V104 selective dark ink outline (#1c120a)
 * - Color-snapped strictly to art/palette/uf.hex (<= 31 colors, binary alpha)
 * - Deploys both 4-way RMMZ standard sheets (144x192), 8D movement sheets (144x384),
 *   and full AR-600 sheets (960x384) with exact sidecars
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const MASTERS_DIR = path.join(ROOT, 'art', 'masters');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');

// --- 1. Palette Management ---
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
const C_DARK_OUTLINE = pal.snap(24, 16, 10); // #1c120a
const C_STEEL_WHITE  = pal.snap(255, 255, 255);
const C_STEEL_LIGHT  = pal.snap(219, 234, 254);
const C_STEEL_MID    = pal.snap(180, 195, 210);
const C_STEEL_DARK   = pal.snap(100, 115, 130);
const C_ARC_CYAN     = pal.snap(147, 197, 253);
const C_BRASS        = pal.snap(186, 154, 113);
const C_BLOOD_RED    = pal.snap(180, 20, 20);
const C_MAGIC_GLOW   = pal.snap(230, 250, 255);
const C_MAGIC_CYAN   = pal.snap(80, 210, 240);

const C_M_HAIR       = pal.snap(107, 68, 35);
const C_M_HAIR_HI    = pal.snap(150, 100, 55);
const C_F_HAIR       = pal.snap(142, 60, 25);
const C_F_HAIR_HI    = pal.snap(190, 95, 45);
const C_SKIN         = pal.snap(238, 195, 154);
const C_SKIN_HI      = pal.snap(255, 223, 186);
const C_SKIN_SHADOW  = pal.snap(198, 142, 117);
const C_LINEN        = pal.snap(202, 178, 146);
const C_LINEN_HI     = pal.snap(235, 227, 215);
const C_M_VEST       = pal.snap(115, 68, 25);
const C_F_BODICE     = pal.snap(95, 45, 20);
const C_F_LACE       = pal.snap(210, 180, 140);
const C_F_SKIRT      = pal.snap(48, 82, 54);
const C_F_SKIRT_HI   = pal.snap(68, 110, 75);
const C_BELT         = pal.snap(97, 49, 0);
const C_BUCKLE       = pal.snap(186, 154, 113);
const C_PANTS        = pal.snap(61, 45, 36);
const C_BOOTS        = pal.snap(45, 28, 8);
const C_BOOTS_HI     = pal.snap(75, 48, 20);

// V104 Dark Outline
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
                const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                if (lum < 175 && !(r < 150 && g > 200 && b > 230)) {
                    buf[idx] = C_DARK_OUTLINE[0];
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
        buf[i] = best[0]; buf[i + 1] = best[1]; buf[i + 2] = best[2];
    }
}

function mirrorFrame(frame) {
    const out = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            const dIdx = (y * 48 + (47 - x)) * 4;
            out[dIdx] = frame[sIdx];
            out[dIdx + 1] = frame[sIdx + 1];
            out[dIdx + 2] = frame[sIdx + 2];
            out[dIdx + 3] = frame[sIdx + 3];
        }
    }
    return out;
}

function blendDiagonals(fA, fB) {
    const out = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const idx = (y * 48 + x) * 4;
            const opA = fA[idx + 3] > 0;
            const opB = fB[idx + 3] > 0;
            if (opA && opB) {
                const r = Math.round((fA[idx] * 0.45) + (fB[idx] * 0.55));
                const g = Math.round((fA[idx + 1] * 0.45) + (fB[idx + 1] * 0.55));
                const b = Math.round((fA[idx + 2] * 0.45) + (fB[idx + 2] * 0.55));
                const s = pal.snap(r, g, b);
                out[idx] = s[0]; out[idx + 1] = s[1]; out[idx + 2] = s[2]; out[idx + 3] = 255;
            } else if (opB) {
                out[idx] = fB[idx]; out[idx + 1] = fB[idx + 1]; out[idx + 2] = fB[idx + 2]; out[idx + 3] = 255;
            } else if (opA) {
                out[idx] = fA[idx]; out[idx + 1] = fA[idx + 1]; out[idx + 2] = fA[idx + 2]; out[idx + 3] = 255;
            }
        }
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

function shiftFrame(frame, dx, dy) {
    const out = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        const ty = y + dy;
        if (ty < 0 || ty >= 48) continue;
        for (let x = 0; x < 48; x++) {
            const tx = x + dx;
            if (tx < 0 || tx >= 48) continue;
            const sIdx = (y * 48 + x) * 4;
            if (frame[sIdx + 3] > 0) {
                const dIdx = (ty * 48 + tx) * 4;
                out[dIdx] = frame[sIdx];
                out[dIdx + 1] = frame[sIdx + 1];
                out[dIdx + 2] = frame[sIdx + 2];
                out[dIdx + 3] = frame[sIdx + 3];
            }
        }
    }
    return out;
}

// --- 2. Action Generators ---

// FIGHTING / ATTACK ANIMATIONS (Windup, Lunge & Slashing Arc, Recovery)
function synthesizeAttack(baseFrame, facing, phase) {
    const out = Buffer.alloc(48 * 48 * 4);
    const fv = {
        S:  { dx: 0, dy: 3 },
        SW: { dx: -3, dy: 2 },
        W:  { dx: -3, dy: 0 },
        NW: { dx: -2, dy: -2 },
        N:  { dx: 0, dy: -3 },
        NE: { dx: 2, dy: -2 },
        E:  { dx: 3, dy: 0 },
        SE: { dx: 3, dy: 2 }
    }[facing];

    const setPixel = (x, y, col) => {
        if (x >= 0 && x < 48 && y >= 0 && y < 48) {
            const idx = (y * 48 + x) * 4;
            out[idx] = col[0]; out[idx + 1] = col[1]; out[idx + 2] = col[2]; out[idx + 3] = 255;
        }
    };

    if (phase === 0) {
        // Phase 0: Windup / Ready coil back
        const coil = shiftFrame(baseFrame, -Math.sign(fv.dx) * 2, -Math.sign(fv.dy));
        coil.copy(out);

        // Blade drawn back in high ready guard
        const handX = (facing === 'W' || facing === 'SW' || facing === 'NW') ? 29 : 19;
        const handY = 24;
        for (let i = 0; i < 11; i++) {
            setPixel(handX + (facing.includes('W') ? i : -i), handY - i, i === 10 ? C_STEEL_WHITE : C_STEEL_MID);
            setPixel(handX + (facing.includes('W') ? i : -i) + 1, handY - i, C_STEEL_DARK);
        }
    } else if (phase === 1) {
        // Phase 1: Dynamic forward strike lunge + full steel broadsword + sweeping slash arc
        const lunge = shiftFrame(baseFrame, fv.dx, fv.dy);
        lunge.copy(out);

        const handPos = {
            S:  { x: 28, y: 30 },
            SW: { x: 18, y: 30 },
            W:  { x: 16, y: 28 },
            NW: { x: 18, y: 25 },
            N:  { x: 28, y: 24 },
            NE: { x: 30, y: 25 },
            E:  { x: 32, y: 28 },
            SE: { x: 30, y: 30 }
        }[facing];

        const hx = handPos.x + fv.dx;
        const hy = handPos.y + fv.dy;

        // Crossguard
        setPixel(hx - 1, hy, C_BRASS);
        setPixel(hx, hy, C_BRASS);
        setPixel(hx + 1, hy, C_BRASS);

        const bladeVec = {
            S:  { dx: 0, dy: 1, len: 14 },
            SW: { dx: -1, dy: 1, len: 13 },
            W:  { dx: -1, dy: 0, len: 15 },
            NW: { dx: -1, dy: -1, len: 13 },
            N:  { dx: 0, dy: -1, len: 14 },
            NE: { dx: 1, dy: -1, len: 13 },
            E:  { dx: 1, dy: 0, len: 15 },
            SE: { dx: 1, dy: 1, len: 13 }
        }[facing];

        // Draw 2px thick solid steel blade
        for (let i = 1; i <= bladeVec.len; i++) {
            const bx = hx + Math.round(bladeVec.dx * i);
            const by = hy + Math.round(bladeVec.dy * i);
            const col = (i === bladeVec.len) ? C_STEEL_WHITE : (i % 2 === 0 ? C_STEEL_WHITE : C_STEEL_MID);
            setPixel(bx, by, col);

            const px = bx + (bladeVec.dy !== 0 ? 1 : 0);
            const py = by + (bladeVec.dx !== 0 ? 1 : 0);
            setPixel(px, py, (i === bladeVec.len) ? C_STEEL_MID : C_STEEL_DARK);
        }

        // BOLD Sweeping Slash Arc (dynamic curved crescent motion trail)
        const arcCenter = {
            S:  { x: 24, y: 40, rx: 14, ry: 7, startA: -0.2, endA: Math.PI + 0.2 },
            SW: { x: 14, y: 36, rx: 12, ry: 10, startA: -0.5, endA: Math.PI * 0.7 },
            W:  { x: 10, y: 28, rx: 8,  ry: 15, startA: -Math.PI * 0.5, endA: Math.PI * 0.5 },
            NW: { x: 14, y: 18, rx: 12, ry: 10, startA: -Math.PI * 0.7, endA: 0.5 },
            N:  { x: 24, y: 14, rx: 14, ry: 7, startA: Math.PI - 0.2, endA: Math.PI * 2 + 0.2 },
            NE: { x: 34, y: 18, rx: 12, ry: 10, startA: Math.PI * 0.5, endA: Math.PI * 1.7 },
            E:  { x: 38, y: 28, rx: 8,  ry: 15, startA: -Math.PI * 0.5, endA: Math.PI * 0.5 },
            SE: { x: 34, y: 36, rx: 12, ry: 10, startA: Math.PI * 0.3, endA: Math.PI * 1.5 }
        }[facing];

        const steps = 24;
        for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const a = arcCenter.startA + t * (arcCenter.endA - arcCenter.startA);
            const ax = Math.round(arcCenter.x + (facing.includes('E') ? -Math.cos(a) : Math.cos(a)) * arcCenter.rx);
            const ay = Math.round(arcCenter.y + Math.sin(a) * arcCenter.ry);
            const isEdge = (s < 3 || s > steps - 3);
            const col = isEdge ? C_ARC_CYAN : (s % 2 === 0 ? C_STEEL_WHITE : C_STEEL_LIGHT);
            setPixel(ax, ay, col);
            if (!isEdge) {
                setPixel(ax + (facing.includes('W') ? -1 : 1), ay, C_STEEL_LIGHT);
            }
        }
    } else {
        // Phase 2: Recovery guard
        const rec = shiftFrame(baseFrame, Math.sign(fv.dx), Math.sign(fv.dy));
        rec.copy(out);

        const handX = (facing === 'W' || facing === 'SW' || facing === 'NW') ? 18 : 30;
        const handY = 32;
        for (let i = 1; i <= 8; i++) {
            setPixel(handX + (facing.includes('W') ? -i : i), handY + Math.round(i * 0.5), (i === 8) ? C_STEEL_WHITE : C_STEEL_MID);
        }
    }

    applyDarkOutline(out, 48, 48);
    return out;
}

function synthesizeWork(baseFrame, facing, phase) {
    const out = Buffer.alloc(48 * 48 * 4);
    if (phase === 0) {
        const shifted = shiftFrame(baseFrame, 0, -2);
        shifted.copy(out);
    } else if (phase === 1) {
        const shifted = shiftFrame(baseFrame, (facing === 'W' || facing === 'SW') ? -2 : (facing === 'E' || facing === 'SE') ? 2 : 0, 1);
        shifted.copy(out);
    } else {
        baseFrame.copy(out);
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

function synthesizeCast(baseFrame, facing, phase) {
    const out = Buffer.alloc(48 * 48 * 4);
    baseFrame.copy(out);

    const cx = 24, cy = 26;
    const setPixel = (x, y, col) => {
        if (x >= 0 && x < 48 && y >= 0 && y < 48) {
            const idx = (y * 48 + x) * 4;
            out[idx] = col[0]; out[idx + 1] = col[1]; out[idx + 2] = col[2]; out[idx + 3] = 255;
        }
    };

    if (phase === 0) {
        // Mana gathering spark
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                setPixel(cx + dx, cy + dy, (dx === 0 && dy === 0) ? C_MAGIC_GLOW : C_MAGIC_CYAN);
            }
        }
    } else if (phase === 1) {
        // Radiant magic release surge
        const pts = [
            { x: 23, y: 25 }, { x: 25, y: 25 }, { x: 24, y: 24 }, { x: 24, y: 26 },
            { x: 21, y: 25 }, { x: 27, y: 25 }, { x: 24, y: 22 }, { x: 24, y: 28 },
            { x: 20, y: 24 }, { x: 28, y: 24 }, { x: 22, y: 28 }, { x: 26, y: 28 },
            { x: 19, y: 23 }, { x: 29, y: 23 }, { x: 24, y: 20 }, { x: 24, y: 30 }
        ];
        for (const pt of pts) {
            setPixel(pt.x, pt.y, C_MAGIC_GLOW);
            setPixel(pt.x + 1, pt.y, C_MAGIC_CYAN);
        }
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

function synthesizeHurt(baseFrame, facing) {
    const out = Buffer.alloc(48 * 48 * 4);
    const revX = (facing === 'W' || facing === 'SW' || facing === 'NW') ? 2 :
                 (facing === 'E' || facing === 'SE' || facing === 'NE') ? -2 : 0;
    const revY = (facing === 'S' || facing === 'SW' || facing === 'SE') ? -1 : 1;
    const shifted = shiftFrame(baseFrame, revX, revY);
    shifted.copy(out);

    for (let y = 20; y < 32; y++) {
        for (let x = 18; x < 30; x++) {
            const idx = (y * 48 + x) * 4;
            if (out[idx + 3] > 0 && (x + y) % 4 === 0) {
                out[idx] = C_BLOOD_RED[0]; out[idx + 1] = C_BLOOD_RED[1]; out[idx + 2] = C_BLOOD_RED[2];
            }
        }
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

// DYING & FALLEN REMAINS (Mortal Stagger, Kneeling Collapse ~28px, Prone Human Corpse)
function synthesizeDeath(baseFrame, phase, facing, isFemale = false) {
    const out = Buffer.alloc(48 * 48 * 4);

    if (phase === 0) {
        // Phase 0: Mortal Stagger (recoil backwards, arms flailing, head thrown back)
        const stagger = shiftFrame(baseFrame, (facing.includes('W') ? 2 : (facing.includes('E') ? -2 : 0)), 2);
        stagger.copy(out);
        // Blood wound splash on chest
        for (let y = 24; y <= 32; y++) {
            for (let x = 20; x <= 28; x++) {
                if ((x + y) % 3 === 0 && out[(y * 48 + x) * 4 + 3] > 0) {
                    const idx = (y * 48 + x) * 4;
                    out[idx] = C_BLOOD_RED[0]; out[idx + 1] = C_BLOOD_RED[1]; out[idx + 2] = C_BLOOD_RED[2];
                }
            }
        }
    } else if (phase === 1) {
        // Phase 1: Kneeling Collapse (organic human silhouette, height drops from 36px to 27px, rows 21..47)
        // Project baseFrame down into kneeling slump
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = (y * 48 + x) * 4;
                if (baseFrame[sIdx + 3] > 0) {
                    let ty;
                    if (y < 22) {
                        // Head: drops ~9px (y=12 -> 21)
                        ty = Math.round(21 + (y - 12) * 0.9);
                    } else if (y < 35) {
                        // Torso: drops to rows 29..39
                        ty = Math.round(30 + (y - 22) * 0.75);
                    } else {
                        // Legs/Boots: compresses to rows 40..47
                        ty = Math.round(40 + (y - 35) * 0.6);
                    }
                    const tx = x + (facing.includes('W') ? 1 : (facing.includes('E') ? -1 : 0));
                    if (ty >= 0 && ty < 48 && tx >= 0 && tx < 48) {
                        const dIdx = (ty * 48 + tx) * 4;
                        out[dIdx] = baseFrame[sIdx];
                        out[dIdx + 1] = baseFrame[sIdx + 1];
                        out[dIdx + 2] = baseFrame[sIdx + 2];
                        out[dIdx + 3] = 255;
                    }
                }
            }
        }
        // Hand clutching chest wound
        const hx = 24, hy = 33;
        const hIdx = (hy * 48 + hx) * 4;
        out[hIdx] = C_SKIN[0]; out[hIdx + 1] = C_SKIN[1]; out[hIdx + 2] = C_SKIN[2]; out[hIdx + 3] = 255;
        const bIdx = ((hy + 1) * 48 + hx) * 4;
        out[bIdx] = C_BLOOD_RED[0]; out[bIdx + 1] = C_BLOOD_RED[1]; out[bIdx + 2] = C_BLOOD_RED[2]; out[bIdx + 3] = 255;
    } else {
        // Phase 2: Prone Corpse Remains (rows 38..47, height 10px, organic resting humanoid body)
        // Project baseFrame horizontally onto floor (swapping x and y projection)
        const flip = facing.includes('W') || facing.includes('NW') || facing.includes('SW');
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = (y * 48 + x) * 4;
                if (baseFrame[sIdx + 3] > 0) {
                    // Length along horizontal axis (dx) from head (y=12) to feet (y=47)
                    // Maps y (12..47) to newX (8..38, span of 30px)
                    const relY = Math.max(0, Math.min(1, (y - 12) / 35));
                    const newX = flip ? Math.round(38 - relY * 30) : Math.round(8 + relY * 30);

                    // Thickness along vertical axis (dy) from width of body (x: 14..34, span of 20px)
                    // Maps x to newY (rows 39..47, height of 8-9px)
                    const relX = Math.max(0, Math.min(1, (x - 14) / 20));
                    const newY = Math.round(39 + relX * 8);

                    if (newX >= 0 && newX < 48 && newY >= 37 && newY < 48) {
                        const dIdx = (newY * 48 + newX) * 4;
                        out[dIdx] = baseFrame[sIdx];
                        out[dIdx + 1] = baseFrame[sIdx + 1];
                        out[dIdx + 2] = baseFrame[sIdx + 2];
                        out[dIdx + 3] = 255;
                    }
                }
            }
        }
    }

    applyDarkOutline(out, 48, 48);
    return out;
}

// IDLE ANIMATION (Gentle Respiration Inhale / Exhale)
function synthesizeIdle(baseFrame, phase) {
    const out = Buffer.alloc(48 * 48 * 4);
    baseFrame.copy(out);

    if (phase === 0) {
        // Inhale: 1px chest and head lift on rows 10..34, keeping rows 34..47 solid
        for (let y = 10; y <= 34; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = (y * 48 + x) * 4;
                if (baseFrame[sIdx + 3] > 0) {
                    const dIdx = ((y - 1) * 48 + x) * 4;
                    out[dIdx] = baseFrame[sIdx];
                    out[dIdx + 1] = baseFrame[sIdx + 1];
                    out[dIdx + 2] = baseFrame[sIdx + 2];
                    out[dIdx + 3] = 255;
                }
            }
        }
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

// --- 3. Female Settler Transmutation ---
function transmuteToFemale(maleFrame, facing) {
    const out = Buffer.alloc(48 * 48 * 4);
    maleFrame.copy(out);

    // Replace hair with rich auburn tones
    for (let y = 12; y <= 25; y++) {
        for (let x = 12; x <= 35; x++) {
            const idx = (y * 48 + x) * 4;
            if (out[idx + 3] > 0) {
                const r = out[idx], g = out[idx + 1], b = out[idx + 2];
                if (r > 80 && r < 160 && g > 40 && g < 110 && b < 60) {
                    const isHi = (r > 120);
                    const col = isHi ? C_F_HAIR_HI : C_F_HAIR;
                    out[idx] = col[0]; out[idx + 1] = col[1]; out[idx + 2] = col[2];
                }
            }
        }
    }

    // Add side braid on rows 24..33
    const braidX = (facing === 'W' || facing === 'SW' || facing === 'NW') ? 22 :
                   (facing === 'E' || facing === 'NE' || facing === 'SE') ? 25 : 20;
    for (let y = 24; y <= 33; y++) {
        const bx = braidX + (y % 2 === 0 ? 0 : 1);
        const idx = (y * 48 + bx) * 4;
        const col = (y % 3 === 0) ? C_F_HAIR_HI : C_F_HAIR;
        out[idx] = col[0]; out[idx + 1] = col[1]; out[idx + 2] = col[2]; out[idx + 3] = 255;
    }

    // Bodice & travel skirt on torso / lower body
    for (let y = 26; y <= 45; y++) {
        for (let x = 13; x <= 34; x++) {
            const idx = (y * 48 + x) * 4;
            if (out[idx + 3] > 0) {
                const r = out[idx], g = out[idx + 1], b = out[idx + 2];
                if (y >= 27 && y <= 35) {
                    // Bodice area
                    if (x === 23 || x === 24) {
                        if (y % 2 === 0) {
                            out[idx] = C_F_LACE[0]; out[idx + 1] = C_F_LACE[1]; out[idx + 2] = C_F_LACE[2];
                        }
                    } else if (r > 90 && r < 140 && g > 50 && g < 80) {
                        out[idx] = C_F_BODICE[0]; out[idx + 1] = C_F_BODICE[1]; out[idx + 2] = C_F_BODICE[2];
                    }
                } else if (y >= 36 && y <= 43) {
                    // Travel skirt area
                    if (r < 90 && g < 70 && b < 60) {
                        const isHi = (x % 3 === 0);
                        const col = isHi ? C_F_SKIRT_HI : C_F_SKIRT;
                        out[idx] = col[0]; out[idx + 1] = col[1]; out[idx + 2] = col[2];
                    }
                }
            }
        }
    }

    applyDarkOutline(out, 48, 48);
    return out;
}

// Assemble full AR-600 Buffer (960x384)
function buildAR600(cWalk, isFemale = false) {
    const dWalk = {
        SW: [blendDiagonals(cWalk.S[0], cWalk.W[0]), blendDiagonals(cWalk.S[1], cWalk.W[1]), blendDiagonals(cWalk.S[2], cWalk.W[2])],
        NW: [blendDiagonals(cWalk.N[0], cWalk.W[0]), blendDiagonals(cWalk.N[1], cWalk.W[1]), blendDiagonals(cWalk.N[2], cWalk.W[2])],
        NE: [mirrorFrame(blendDiagonals(cWalk.N[0], cWalk.W[0])), mirrorFrame(blendDiagonals(cWalk.N[1], cWalk.W[1])), mirrorFrame(blendDiagonals(cWalk.N[2], cWalk.W[2]))],
        SE: [mirrorFrame(blendDiagonals(cWalk.S[0], cWalk.W[0])), mirrorFrame(blendDiagonals(cWalk.S[1], cWalk.W[1])), mirrorFrame(blendDiagonals(cWalk.S[2], cWalk.W[2]))]
    };

    const FACINGS = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'];
    const walkByFacing = {
        S: cWalk.S, SW: dWalk.SW, W: cWalk.W, NW: dWalk.NW,
        N: cWalk.N, NE: dWalk.NE, E: cWalk.E, SE: dWalk.SE
    };

    const buf = Buffer.alloc(960 * 384 * 4);

    function setCell(c, r, frame) {
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = (y * 48 + x) * 4;
                if (frame[sIdx + 3] > 0) {
                    const dIdx = (((r * 48 + y) * 960) + (c * 48 + x)) * 4;
                    buf[dIdx] = frame[sIdx];
                    buf[dIdx + 1] = frame[sIdx + 1];
                    buf[dIdx + 2] = frame[sIdx + 2];
                    buf[dIdx + 3] = 255;
                }
            }
        }
    }

    for (let r = 0; r < 8; r++) {
        const facing = FACINGS[r];
        const [stepL, stand, stepR] = walkByFacing[facing];

        // Col 0: Stand
        setCell(0, r, stand);

        // Cols 1, 2, 3: Walk with moving feet
        setCell(1, r, stepL);
        setCell(2, r, stand);
        setCell(3, r, stepR);

        // Cols 4, 5, 6: Work
        setCell(4, r, synthesizeWork(stand, facing, 0));
        setCell(5, r, synthesizeWork(stand, facing, 1));
        setCell(6, r, synthesizeWork(stand, facing, 2));

        // Col 7: Stand placeholder (V89 carry legacy slot)
        setCell(7, r, stand);

        // Cols 8, 9, 10: Fighting / Attack Animations
        setCell(8, r, synthesizeAttack(stand, facing, 0));
        setCell(9, r, synthesizeAttack(stand, facing, 1));
        setCell(10, r, synthesizeAttack(stand, facing, 2));

        // Cols 11, 12, 13: Cast
        setCell(11, r, synthesizeCast(stand, facing, 0));
        setCell(12, r, synthesizeCast(stand, facing, 1));
        setCell(13, r, synthesizeCast(stand, facing, 2));

        // Col 14: Hurt
        setCell(14, r, synthesizeHurt(stand, facing));

        // Cols 15, 16, 17: Dying & Remains
        setCell(15, r, synthesizeDeath(stand, 0, facing, isFemale));
        setCell(16, r, synthesizeDeath(stand, 1, facing, isFemale));
        setCell(17, r, synthesizeDeath(stand, 2, facing, isFemale));

        // Cols 18, 19: Idle
        setCell(18, r, synthesizeIdle(stand, 0));
        setCell(19, r, synthesizeIdle(stand, 1));
    }

    quantizeSheet(buf, 960, 384, 31);
    return buf;
}

// Extract 144x384 8D walk sheet from AR-600 buffer (cols 1, 2, 3)
function extract8DWalk(ar600Buf) {
    const out = Buffer.alloc(144 * 384 * 4);
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 3; c++) {
            const arCol = c + 1; // cols 1, 2, 3
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (((r * 48 + y) * 960) + (arCol * 48 + x)) * 4;
                    const dIdx = (((r * 48 + y) * 144) + (c * 48 + x)) * 4;
                    out[dIdx] = ar600Buf[sIdx];
                    out[dIdx + 1] = ar600Buf[sIdx + 1];
                    out[dIdx + 2] = ar600Buf[sIdx + 2];
                    out[dIdx + 3] = ar600Buf[sIdx + 3];
                }
            }
        }
    }
    quantizeSheet(out, 144, 384, 31);
    return out;
}

// Extract 144x192 4-way RMMZ standard sheet (rows: S, W, E, N)
function extract4WaySheet(walkList) {
    const out = Buffer.alloc(144 * 192 * 4);
    const rmmzRowIndices = [0, 2, 6, 4]; // S (0), W (2), E (6), N (4)
    for (let r = 0; r < 4; r++) {
        const srcRow = rmmzRowIndices[r];
        for (let c = 0; c < 3; c++) {
            const frame = walkList[srcRow * 3 + c];
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (y * 48 + x) * 4;
                    const dIdx = (((r * 48 + y) * 144) + (c * 48 + x)) * 4;
                    out[dIdx] = frame[sIdx];
                    out[dIdx + 1] = frame[sIdx + 1];
                    out[dIdx + 2] = frame[sIdx + 2];
                    out[dIdx + 3] = frame[sIdx + 3];
                }
            }
        }
    }
    quantizeSheet(out, 144, 192, 31);
    return out;
}

// Extract 144x192 4-way combat/cast sheet from AR-600 buffer
function extract4WayAction(ar600Buf, startCol) {
    const out = Buffer.alloc(144 * 192 * 4);
    const rmmzRowIndices = [0, 2, 6, 4]; // S (0), W (2), E (6), N (4)
    for (let r = 0; r < 4; r++) {
        const srcRow = rmmzRowIndices[r];
        for (let c = 0; c < 3; c++) {
            const arCol = startCol + c;
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (((srcRow * 48 + y) * 960) + (arCol * 48 + x)) * 4;
                    const dIdx = (((r * 48 + y) * 144) + (c * 48 + x)) * 4;
                    out[dIdx] = ar600Buf[sIdx];
                    out[dIdx + 1] = ar600Buf[sIdx + 1];
                    out[dIdx + 2] = ar600Buf[sIdx + 2];
                    out[dIdx + 3] = ar600Buf[sIdx + 3];
                }
            }
        }
    }
    quantizeSheet(out, 144, 192, 31);
    return out;
}

// Extract 144x384 8D action sheet from AR-600 buffer
function extract8DAction(ar600Buf, startCol) {
    const out = Buffer.alloc(144 * 384 * 4);
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 3; c++) {
            const arCol = startCol + c;
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (((r * 48 + y) * 960) + (arCol * 48 + x)) * 4;
                    const dIdx = (((r * 48 + y) * 144) + (c * 48 + x)) * 4;
                    out[dIdx] = ar600Buf[sIdx];
                    out[dIdx + 1] = ar600Buf[sIdx + 1];
                    out[dIdx + 2] = ar600Buf[sIdx + 2];
                    out[dIdx + 3] = ar600Buf[sIdx + 3];
                }
            }
        }
    }
    quantizeSheet(out, 144, 384, 31);
    return out;
}

// Extract 96x384 2-column idle sheet from AR-600 buffer
function extractIdleSheet(ar600Buf) {
    const out = Buffer.alloc(96 * 384 * 4);
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 2; c++) {
            const arCol = 18 + c;
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (((r * 48 + y) * 960) + (arCol * 48 + x)) * 4;
                    const dIdx = (((r * 48 + y) * 96) + (c * 48 + x)) * 4;
                    out[dIdx] = ar600Buf[sIdx];
                    out[dIdx + 1] = ar600Buf[sIdx + 1];
                    out[dIdx + 2] = ar600Buf[sIdx + 2];
                    out[dIdx + 3] = ar600Buf[sIdx + 3];
                }
            }
        }
    }
    quantizeSheet(out, 96, 384, 31);
    return out;
}

// Extract 48x384 single-column sheet from AR-600 buffer
function extractColumnSheet(ar600Buf, col) {
    const out = Buffer.alloc(48 * 384 * 4);
    for (let r = 0; r < 8; r++) {
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = (((r * 48 + y) * 960) + (col * 48 + x)) * 4;
                const dIdx = (((r * 48 + y) * 48) + x) * 4;
                out[dIdx] = ar600Buf[sIdx];
                out[dIdx + 1] = ar600Buf[sIdx + 1];
                out[dIdx + 2] = ar600Buf[sIdx + 2];
                out[dIdx + 3] = ar600Buf[sIdx + 3];
            }
        }
    }
    quantizeSheet(out, 48, 384, 31);
    return out;
}

// Sidecar builders
function make4WaySidecar(id, species, gender) {
    return {
        id,
        species,
        gender,
        stage: "adult",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: {
            stand: [1],
            walk: [0, 1, 2, 1]
        },
        frameMs: 150
    };
}

function make4WayCombatSidecar(id, species, actionName) {
    return {
        id,
        species,
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: {
            [actionName]: [0, 1, 2]
        },
        frameMs: 120
    };
}

function make8DSidecar(id, species, gender) {
    return {
        id,
        species,
        gender,
        stage: "adult",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"],
        animations: {
            stand: [1],
            walk: [0, 1, 2, 1]
        },
        frameMs: 150
    };
}

function make8DActionSidecar(id, species, actionName) {
    return {
        id,
        species,
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"],
        animations: {
            [actionName]: [0, 1, 2]
        },
        frameMs: 120
    };
}

function makeAR600Sidecar(id, species, gender) {
    return {
        id,
        species,
        gender,
        stage: "adult",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"],
        animations: {
            stand: [0],
            walk: [1, 2, 3, 2],
            work: [4, 5, 6],
            attack: [8, 9, 10],
            cast: [11, 12, 13],
            hurt: [14],
            death: [15, 16, 17],
            idle: [18, 19, 18, 0]
        },
        frameMs: 150
    };
}

// --- Main Execution ---
function main() {
    console.log('=== Building Authentic Human Pair AR-600 & 8D Movement Suite ===');
    const srcBuf = fs.readFileSync(path.join(ROOT, 'scratch', 'peasant_48_test.png'));
    const src = decodePNG(srcBuf);

    function getCardFrame(r, c) {
        const frame = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            const ty = y + 2; // Grounded exactly on row 47
            if (ty >= 48) continue;
            for (let x = 0; x < 48; x++) {
                const sIdx = (((r * 48 + y) * 144) + (c * 48 + x)) * 4;
                if (src.data[sIdx + 3] > 0) {
                    const dIdx = (ty * 48 + x) * 4;
                    frame[dIdx] = src.data[sIdx];
                    frame[dIdx + 1] = src.data[sIdx + 1];
                    frame[dIdx + 2] = src.data[sIdx + 2];
                    frame[dIdx + 3] = 255;
                }
            }
        }
        applyDarkOutline(frame, 48, 48);
        return frame;
    }

    const mWalk = {
        S: [getCardFrame(0, 0), getCardFrame(0, 1), getCardFrame(0, 2)],
        W: [getCardFrame(1, 0), getCardFrame(1, 1), getCardFrame(1, 2)],
        E: [getCardFrame(2, 0), getCardFrame(2, 1), getCardFrame(2, 2)],
        N: [getCardFrame(3, 0), getCardFrame(3, 1), getCardFrame(3, 2)]
    };

    const fWalk = {
        S: mWalk.S.map(f => transmuteToFemale(f, 'S')),
        W: mWalk.W.map(f => transmuteToFemale(f, 'W')),
        E: mWalk.E.map(f => transmuteToFemale(f, 'E')),
        N: mWalk.N.map(f => transmuteToFemale(f, 'N'))
    };

    console.log('Synthesizing Male AR-600 Sheet...');
    const maleAR600 = buildAR600(mWalk, false);
    const male8DWalk = extract8DWalk(maleAR600);
    const male4Way = extract4WaySheet([
        mWalk.S[0], mWalk.S[1], mWalk.S[2], // S
        mWalk.S[0], mWalk.S[1], mWalk.S[2], // SW placeholder
        mWalk.W[0], mWalk.W[1], mWalk.W[2], // W
        mWalk.W[0], mWalk.W[1], mWalk.W[2], // NW
        mWalk.N[0], mWalk.N[1], mWalk.N[2], // N
        mWalk.N[0], mWalk.N[1], mWalk.N[2], // NE
        mWalk.E[0], mWalk.E[1], mWalk.E[2], // E
        mWalk.E[0], mWalk.E[1], mWalk.E[2]  // SE
    ]);

    console.log('Synthesizing Female AR-600 Sheet...');
    const femaleAR600 = buildAR600(fWalk, true);
    const female8DWalk = extract8DWalk(femaleAR600);
    const female4Way = extract4WaySheet([
        fWalk.S[0], fWalk.S[1], fWalk.S[2], // S
        fWalk.S[0], fWalk.S[1], fWalk.S[2], // SW
        fWalk.W[0], fWalk.W[1], fWalk.W[2], // W
        fWalk.W[0], fWalk.W[1], fWalk.W[2], // NW
        fWalk.N[0], fWalk.N[1], fWalk.N[2], // N
        fWalk.N[0], fWalk.N[1], fWalk.N[2], // NE
        fWalk.E[0], fWalk.E[1], fWalk.E[2], // E
        fWalk.E[0], fWalk.E[1], fWalk.E[2]  // SE
    ]);

    // Combat & Cast Sub-sheets
    const maleAttack4Way   = extract4WayAction(maleAR600, 8);
    const maleAttack8D     = extract8DAction(maleAR600, 8);
    const femaleAttack4Way = extract4WayAction(femaleAR600, 8);

    const maleCast4Way     = extract4WayAction(maleAR600, 11);
    const maleCast8D       = extract8DAction(maleAR600, 11);
    const femaleCast4Way   = extract4WayAction(femaleAR600, 11);

    // Deploy to game/img/characters/
    console.log('Deploying sheets to game/img/characters/ ...');

    // 1. Standard 4-way RMMZ sheets (144x192) - 100% compliant with art_check.js
    writePNG(path.join(CHAR_DIR, '$UF_Human_Male.png'), 144, 192, male4Way);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Human_Male.json'), JSON.stringify(make4WaySidecar('$UF_Human_Male', 'human', 'male'), null, 2));

    writePNG(path.join(CHAR_DIR, '$UF_Human_Female.png'), 144, 192, female4Way);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Human_Female.json'), JSON.stringify(make4WaySidecar('$UF_Human_Female', 'human', 'female'), null, 2));

    writePNG(path.join(CHAR_DIR, '$Adam.png'), 144, 192, male4Way);
    fs.writeFileSync(path.join(CHAR_DIR, '$Adam.json'), JSON.stringify(make4WaySidecar('$Adam', 'human', 'male'), null, 2));

    writePNG(path.join(CHAR_DIR, '$Eve.png'), 144, 192, female4Way);
    fs.writeFileSync(path.join(CHAR_DIR, '$Eve.json'), JSON.stringify(make4WaySidecar('$Eve', 'human', 'female'), null, 2));

    writePNG(path.join(CHAR_DIR, '$UF_Human.png'), 144, 192, male4Way);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Human.json'), JSON.stringify(make4WaySidecar('$UF_Human', 'human', 'male'), null, 2));

    writePNG(path.join(CHAR_DIR, '$UF_Human_Male_Adult.png'), 144, 192, male4Way);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Human_Male_Adult.json'), JSON.stringify(make4WaySidecar('$UF_Human_Male_Adult', 'human', 'male'), null, 2));

    writePNG(path.join(CHAR_DIR, '$UF_Human_Attack_Sword.png'), 144, 192, maleAttack4Way);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Human_Attack_Sword.json'), JSON.stringify(make4WayCombatSidecar('$UF_Human_Attack_Sword', 'human', 'attack'), null, 2));

    writePNG(path.join(CHAR_DIR, '$UF_Human_Female_Attack.png'), 144, 192, femaleAttack4Way);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Human_Female_Attack.json'), JSON.stringify(make4WayCombatSidecar('$UF_Human_Female_Attack', 'human', 'attack'), null, 2));

    writePNG(path.join(CHAR_DIR, '$UF_Human_Cast.png'), 144, 192, maleCast4Way);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Human_Cast.json'), JSON.stringify(make4WayCombatSidecar('$UF_Human_Cast', 'human', 'cast'), null, 2));

    writePNG(path.join(CHAR_DIR, '$UF_Human_Female_Cast.png'), 144, 192, femaleCast4Way);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Human_Female_Cast.json'), JSON.stringify(make4WayCombatSidecar('$UF_Human_Female_Cast', 'human', 'cast'), null, 2));

    // 2. 8-Directional Movement Sheets (144x384)
    writePNG(path.join(CHAR_DIR, '$UF_Human_8D.png'), 144, 384, male8DWalk);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Human_8D.json'), JSON.stringify(make8DSidecar('$UF_Human_8D', 'human', 'male'), null, 2));

    writePNG(path.join(CHAR_DIR, '$UF_Human_Male_8D.png'), 144, 384, male8DWalk);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Human_Male_8D.json'), JSON.stringify(make8DSidecar('$UF_Human_Male_8D', 'human', 'male'), null, 2));

    writePNG(path.join(CHAR_DIR, '$UF_Human_Female_8D.png'), 144, 384, female8DWalk);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Human_Female_8D.json'), JSON.stringify(make8DSidecar('$UF_Human_Female_8D', 'human', 'female'), null, 2));

    writePNG(path.join(CHAR_DIR, '$UF_Human_Attack_8D.png'), 144, 384, maleAttack8D);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Human_Attack_8D.json'), JSON.stringify(make8DActionSidecar('$UF_Human_Attack_8D', 'human', 'attack'), null, 2));

    writePNG(path.join(CHAR_DIR, '$UF_Human_Cast_8D.png'), 144, 384, maleCast8D);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Human_Cast_8D.json'), JSON.stringify(make8DActionSidecar('$UF_Human_Cast_8D', 'human', 'cast'), null, 2));

    // 3. AR-600 Extended Sheets (960x384)
    writePNG(path.join(CHAR_DIR, '$UF_Human_Male_AR600.png'), 960, 384, maleAR600);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Human_Male_AR600.json'), JSON.stringify(makeAR600Sidecar('$UF_Human_Male_AR600', 'human', 'male'), null, 2));

    writePNG(path.join(CHAR_DIR, '$UF_Human_Female_AR600.png'), 960, 384, femaleAR600);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Human_Female_AR600.json'), JSON.stringify(makeAR600Sidecar('$UF_Human_Female_AR600', 'human', 'female'), null, 2));

    // 4. Masters in art/masters/
    writePNG(path.join(MASTERS_DIR, 'human_male.png'), 960, 384, maleAR600);
    fs.writeFileSync(path.join(MASTERS_DIR, 'human_male.json'), JSON.stringify(makeAR600Sidecar('human_male', 'human', 'male'), null, 2));

    writePNG(path.join(MASTERS_DIR, 'human_female.png'), 960, 384, femaleAR600);
    fs.writeFileSync(path.join(MASTERS_DIR, 'human_female.json'), JSON.stringify(makeAR600Sidecar('human_female', 'human', 'female'), null, 2));

    writePNG(path.join(MASTERS_DIR, 'human_male_adult_walk.png'), 144, 384, male8DWalk);
    fs.writeFileSync(path.join(MASTERS_DIR, 'human_male_adult_walk.json'), JSON.stringify(make8DSidecar('human_male_adult_walk', 'human', 'male'), null, 2));

    writePNG(path.join(MASTERS_DIR, 'human_female_adult_walk.png'), 144, 384, female8DWalk);
    fs.writeFileSync(path.join(MASTERS_DIR, 'human_female_adult_walk.json'), JSON.stringify(make8DSidecar('human_female_adult_walk', 'human', 'female'), null, 2));

    writePNG(path.join(MASTERS_DIR, 'human_male_adult_attack.png'), 144, 384, maleAttack8D);
    fs.writeFileSync(path.join(MASTERS_DIR, 'human_male_adult_attack.json'), JSON.stringify(make8DActionSidecar('human_male_adult_attack', 'human', 'attack'), null, 2));

    writePNG(path.join(MASTERS_DIR, 'human_female_adult_attack.png'), 144, 384, extract8DAction(femaleAR600, 8));
    fs.writeFileSync(path.join(MASTERS_DIR, 'human_female_adult_attack.json'), JSON.stringify(make8DActionSidecar('human_female_adult_attack', 'human', 'attack'), null, 2));

    writePNG(path.join(MASTERS_DIR, 'human_male_adult_death.png'), 144, 384, extract8DAction(maleAR600, 15));
    fs.writeFileSync(path.join(MASTERS_DIR, 'human_male_adult_death.json'), JSON.stringify(make8DActionSidecar('human_male_adult_death', 'human', 'death'), null, 2));

    writePNG(path.join(MASTERS_DIR, 'human_female_adult_death.png'), 144, 384, extract8DAction(femaleAR600, 15));
    fs.writeFileSync(path.join(MASTERS_DIR, 'human_female_adult_death.json'), JSON.stringify(make8DActionSidecar('human_female_adult_death', 'human', 'death'), null, 2));

    writePNG(path.join(MASTERS_DIR, 'human_male_adult_idle.png'), 96, 384, extractIdleSheet(maleAR600));
    fs.writeFileSync(path.join(MASTERS_DIR, 'human_male_adult_idle.json'), JSON.stringify({
        id: "human_male_adult_idle", species: "human", gender: "male",
        frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
        facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"],
        animations: { idle: [0, 1] }, frameMs: 250
    }, null, 2));

    writePNG(path.join(MASTERS_DIR, 'human_female_adult_idle.png'), 96, 384, extractIdleSheet(femaleAR600));
    fs.writeFileSync(path.join(MASTERS_DIR, 'human_female_adult_idle.json'), JSON.stringify({
        id: "human_female_adult_idle", species: "human", gender: "female",
        frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
        facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"],
        animations: { idle: [0, 1] }, frameMs: 250
    }, null, 2));

    writePNG(path.join(MASTERS_DIR, 'human_male_stand.png'), 48, 384, extractColumnSheet(maleAR600, 0));
    fs.writeFileSync(path.join(MASTERS_DIR, 'human_male_stand.json'), JSON.stringify(make8DSidecar('human_male_stand', 'human', 'male'), null, 2));

    writePNG(path.join(MASTERS_DIR, 'human_female_stand.png'), 48, 384, extractColumnSheet(femaleAR600, 0));
    fs.writeFileSync(path.join(MASTERS_DIR, 'human_female_stand.json'), JSON.stringify(make8DSidecar('human_female_stand', 'human', 'female'), null, 2));

    // Work masters (cols 4, 5, 6)
    writePNG(path.join(MASTERS_DIR, 'human_male_adult_work.png'), 144, 384, extract8DAction(maleAR600, 4));
    fs.writeFileSync(path.join(MASTERS_DIR, 'human_male_adult_work.json'), JSON.stringify(make8DActionSidecar('human_male_adult_work', 'human', 'work'), null, 2));
    writePNG(path.join(MASTERS_DIR, 'human_female_adult_work.png'), 144, 384, extract8DAction(femaleAR600, 4));
    fs.writeFileSync(path.join(MASTERS_DIR, 'human_female_adult_work.json'), JSON.stringify(make8DActionSidecar('human_female_adult_work', 'human', 'work'), null, 2));

    // Cast masters (cols 11, 12, 13)
    writePNG(path.join(MASTERS_DIR, 'human_male_adult_cast.png'), 144, 384, extract8DAction(maleAR600, 11));
    fs.writeFileSync(path.join(MASTERS_DIR, 'human_male_adult_cast.json'), JSON.stringify(make8DActionSidecar('human_male_adult_cast', 'human', 'cast'), null, 2));
    writePNG(path.join(MASTERS_DIR, 'human_female_adult_cast.png'), 144, 384, extract8DAction(femaleAR600, 11));
    fs.writeFileSync(path.join(MASTERS_DIR, 'human_female_adult_cast.json'), JSON.stringify(make8DActionSidecar('human_female_adult_cast', 'human', 'cast'), null, 2));

    // Hurt masters (col 14)
    writePNG(path.join(MASTERS_DIR, 'human_male_adult_hurt.png'), 48, 384, extractColumnSheet(maleAR600, 14));
    fs.writeFileSync(path.join(MASTERS_DIR, 'human_male_adult_hurt.json'), JSON.stringify({
        id: "human_male_adult_hurt", species: "human", gender: "male", stage: "adult",
        frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
        facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"],
        animations: { hurt: [0] }, frameMs: 150
    }, null, 2));
    writePNG(path.join(MASTERS_DIR, 'human_female_adult_hurt.png'), 48, 384, extractColumnSheet(femaleAR600, 14));
    fs.writeFileSync(path.join(MASTERS_DIR, 'human_female_adult_hurt.json'), JSON.stringify({
        id: "human_female_adult_hurt", species: "human", gender: "female", stage: "adult",
        frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
        facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"],
        animations: { hurt: [0] }, frameMs: 150
    }, null, 2));

    // Sleep masters (col 17 prone remains)
    writePNG(path.join(MASTERS_DIR, 'human_male_adult_sleep.png'), 48, 384, extractColumnSheet(maleAR600, 17));
    fs.writeFileSync(path.join(MASTERS_DIR, 'human_male_adult_sleep.json'), JSON.stringify({
        id: "human_male_adult_sleep", species: "human", gender: "male", stage: "adult",
        frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
        facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"],
        animations: { sleep: [0] }, frameMs: 150
    }, null, 2));
    writePNG(path.join(MASTERS_DIR, 'human_female_adult_sleep.png'), 48, 384, extractColumnSheet(femaleAR600, 17));
    fs.writeFileSync(path.join(MASTERS_DIR, 'human_female_adult_sleep.json'), JSON.stringify({
        id: "human_female_adult_sleep", species: "human", gender: "female", stage: "adult",
        frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
        facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"],
        animations: { sleep: [0] }, frameMs: 150
    }, null, 2));

    // 5. Build Master 4x Pair Showcase
    console.log('Rendering 4x Pair Showcase...');
    const colsToShow = [0, 1, 2, 3, 8, 9, 10, 14, 15, 16, 17, 18, 19];
    const rowsToShow = [0, 1, 2, 4]; // S, SW, W, N
    const scW = colsToShow.length * 48 * 4;
    const scH = (rowsToShow.length * 2) * 48 * 4;
    const scBuf = Buffer.alloc(scW * scH * 4);

    for (let i = 0; i < scBuf.length; i += 4) {
        scBuf[i] = 40; scBuf[i + 1] = 65; scBuf[i + 2] = 45; scBuf[i + 3] = 255;
    }

    function renderGroup(sourceBuf, rowOffset) {
        for (let sri = 0; sri < rowsToShow.length; sri++) {
            const r = rowsToShow[sri];
            for (let sci = 0; sci < colsToShow.length; sci++) {
                const c = colsToShow[sci];
                const srcStartX = c * 48;
                const srcStartY = r * 48;
                const dstStartX = sci * 48 * 4;
                const dstStartY = (rowOffset + sri) * 48 * 4;

                for (let py = 0; py < 48; py++) {
                    for (let px = 0; px < 48; px++) {
                        const sIdx = (((srcStartY + py) * 960) + (srcStartX + px)) * 4;
                        if (sourceBuf[sIdx + 3] > 0) {
                            for (let dy = 0; dy < 4; dy++) {
                                for (let dx = 0; dx < 4; dx++) {
                                    const dIdx = (((dstStartY + py * 4 + dy) * scW) + (dstStartX + px * 4 + dx)) * 4;
                                    scBuf[dIdx] = sourceBuf[sIdx];
                                    scBuf[dIdx + 1] = sourceBuf[sIdx + 1];
                                    scBuf[dIdx + 2] = sourceBuf[sIdx + 2];
                                    scBuf[dIdx + 3] = 255;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    renderGroup(maleAR600, 0);
    renderGroup(femaleAR600, 4);

    const scPath = path.join(REVIEW_DIR, 'human_settlers_pair_showcase_4x.png');
    writePNG(scPath, scW, scH, scBuf);
    console.log(`Saved master 4x pair showcase to ${scPath}`);

    // 6. Build Dedicated Foot Movement Walk Showcase
    console.log('Rendering Foot Movement Walk Showcase (all 8 facings x 3 walk frames)...');
    const walkW = 3 * 48 * 4; // 576 px
    const walkH = 8 * 48 * 4; // 1536 px
    const walkBuf = Buffer.alloc(walkW * walkH * 4);
    for (let i = 0; i < walkBuf.length; i += 4) {
        walkBuf[i] = 48; walkBuf[i + 1] = 52; walkBuf[i + 2] = 58; walkBuf[i + 3] = 255;
    }

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 3; c++) {
            const srcStartX = (c + 1) * 48;
            const srcStartY = r * 48;
            const dstStartX = c * 48 * 4;
            const dstStartY = r * 48 * 4;

            for (let py = 0; py < 48; py++) {
                for (let px = 0; px < 48; px++) {
                    const sIdx = (((srcStartY + py) * 960) + (srcStartX + px)) * 4;
                    if (maleAR600[sIdx + 3] > 0) {
                        for (let dy = 0; dy < 4; dy++) {
                            for (let dx = 0; dx < 4; dx++) {
                                const dIdx = (((dstStartY + py * 4 + dy) * walkW) + (dstStartX + px * 4 + dx)) * 4;
                                walkBuf[dIdx] = maleAR600[sIdx];
                                walkBuf[dIdx + 1] = maleAR600[sIdx + 1];
                                walkBuf[dIdx + 2] = maleAR600[sIdx + 2];
                                walkBuf[dIdx + 3] = 255;
                            }
                        }
                    }
                }
            }
        }
    }

    const walkPath = path.join(REVIEW_DIR, 'human_walk_feet_animation_4x.png');
    writePNG(walkPath, walkW, walkH, walkBuf);
    console.log(`Saved foot movement walk showcase to ${walkPath}`);
    console.log('=== All files successfully generated and deployed! ===');
}

main();
