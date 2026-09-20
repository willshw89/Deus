#!/usr/bin/env node
'use strict';

/**
 * tools/build_elf_standard_charsets.js
 *
 * Universal 8-Directional Standard Charset Generator (Creator Control Pipeline)
 *
 * Enforces strict creator-controlled pixel craftsmanship across all 6 action charsets:
 * - Stage 1: Movement (Walk) - Scissor strides, grounded row 47, 40px standing stature
 * - Stage 2: Melee (Attack) - Combat windup, forward lunge with directional crescent mithril slash arc, recovery guard
 * - Stage 3: Ranged (Bow) - Yew longbow aim, tension draw, release recoil strictly oriented in facing direction
 * - Stage 4: Magic (Cast) - Ready focus, glowing emerald mana hands (raised above shoulders for North!), forward palm thrust
 * - Stage 5: Work (Craft/Harvest) - UNIFIED kneeling craftsman across ALL 8 directions (32px tall, knees grounded on row 47, carving knife & contact glint)
 * - Stage 6: Downed (Dead/Sleep) - Hurt flinch recoil, kneeling collapse (27px tall), and organic horizontal resting corpse (11px tall on rows 37..47)
 *
 * Matrix:
 * - 18 Columns x 8 Directional Rows
 * - Mathematical mirroring: Rows 5, 6, 7 (NE, E, SE) mirrored from Rows 3, 2, 1 (NW, W, SW)
 * - Strict palette quantization: <= 31 colors from art/palette/uf.hex, binary alpha (0 or 255)
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const MASTER_DIR = path.join(ROOT, 'art', 'masters');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');
const DESIGN_DIR = path.join(ROOT, 'docs', 'design');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// ----------------------------------------------------------------------------
// Palette & Color Mathematics (CIELAB)
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

// Canonical Elf Palette Constants
const C_OUTLINE     = pal.snap(24, 20, 32);     // Deep shadow outline
const C_SKIN_BASE   = pal.snap(232, 192, 160);  // Elf skin tone
const C_SKIN_SHADE  = pal.snap(184, 144, 116);  // Skin shadow
const C_HAIR_BASE   = pal.snap(220, 224, 232);  // Silver hair highlight
const C_HAIR_SHADE  = pal.snap(160, 168, 184);  // Silver hair shadow
const C_TUNIC_BASE  = pal.snap(48, 140, 48);    // Sylvan forest green tunic
const C_TUNIC_SHADE = pal.snap(28, 88, 32);     // Tunic shadow
const C_PANTS_BASE  = pal.snap(88, 64, 48);     // Leather trousers
const C_PANTS_SHADE = pal.snap(52, 38, 28);     // Pants shadow
const C_BELT        = pal.snap(120, 72, 36);    // Belt leather
const C_BUCKLE      = pal.snap(240, 200, 80);   // Gold belt buckle
const C_STEEL_CORE  = pal.snap(232, 240, 255);  // Mithril blade core
const C_STEEL_SHADE = pal.snap(140, 160, 190);  // Blade shadow
const C_SLASH_ARC   = pal.snap(245, 250, 255);  // Slash sweep arc
const C_SLASH_GLOW  = pal.snap(180, 210, 255);  // Arc glow
const C_BOW_WOOD    = pal.snap(150, 96, 44);    // Yew longbow
const C_BOW_STRING  = pal.snap(220, 220, 220);  // Bowstring
const C_MANA_CORE   = pal.snap(140, 255, 180);  // Mana aura core
const C_MANA_EDGE   = pal.snap(40, 220, 110);   // Mana radiance glow
const C_BLOOD_FLASH = pal.snap(190, 40, 40);    // Pain flinch flash

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

function shiftFrame(frame, dx, dy) {
    const out = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        const ty = y + dy;
        if (ty < 0 || ty >= 48) continue;
        for (let x = 0; x < 48; x++) {
            const tx = x + dx;
            if (tx < 0 || tx >= 48) continue;
            const s = (y * 48 + x) * 4;
            if (frame[s + 3] > 0) {
                const d = (ty * 48 + tx) * 4;
                out[d]     = frame[s];
                out[d + 1] = frame[s + 1];
                out[d + 2] = frame[s + 2];
                out[d + 3] = frame[s + 3];
            }
        }
    }
    return out;
}

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
                const r = buf[idx], g = buf[idx + 1], b = buf[idx + 2];
                // Preserve bright blade highlights and radiant mana glows
                const isMana = (r > 100 && g > 200 && b > 140);
                const isBladeGlint = (r > 230 && g > 235 && b > 245);
                if (!isMana && !isBladeGlint) {
                    buf[idx]     = C_OUTLINE[0];
                    buf[idx + 1] = C_OUTLINE[1];
                    buf[idx + 2] = C_OUTLINE[2];
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

// ----------------------------------------------------------------------------
// Step 1: Load Canonical Base Body Anchor (Movement Sheet)
// ----------------------------------------------------------------------------
console.log('Loading canonical Elf movement anchor ($UF_Elf_8D.png)...');
const walkRaw = decodePNG(fs.readFileSync(path.join(CHAR_DIR, '$UF_Elf_8D.png')), '$UF_Elf_8D.png');

function getFrame(sheet, col, row) {
    const frame = Buffer.alloc(48 * 48 * 4);
    for (let py = 0; py < 48; py++) {
        for (let px = 0; px < 48; px++) {
            const sIdx = ((row * 48 + py) * 144 + (col * 48 + px)) * 4;
            const dIdx = (py * 48 + px) * 4;
            frame[dIdx]     = sheet.data[sIdx];
            frame[dIdx + 1] = sheet.data[sIdx + 1];
            frame[dIdx + 2] = sheet.data[sIdx + 2];
            frame[dIdx + 3] = sheet.data[sIdx + 3];
        }
    }
    return frame;
}

// Canonical Walk Frames across 5 primary facings (S, SW, W, NW, N)
const walkFrames = {
    S:  [getFrame(walkRaw, 0, 0), getFrame(walkRaw, 1, 0), getFrame(walkRaw, 2, 0)],
    SW: [getFrame(walkRaw, 0, 1), getFrame(walkRaw, 1, 1), getFrame(walkRaw, 2, 1)],
    W:  [getFrame(walkRaw, 0, 2), getFrame(walkRaw, 1, 2), getFrame(walkRaw, 2, 2)],
    NW: [getFrame(walkRaw, 0, 3), getFrame(walkRaw, 1, 3), getFrame(walkRaw, 2, 3)],
    N:  [getFrame(walkRaw, 0, 4), getFrame(walkRaw, 1, 4), getFrame(walkRaw, 2, 4)]
};

// ----------------------------------------------------------------------------
// Step 2: Melee Attack Charset ($UF_Elf_Attack_8D.png)
// F0: Windup (combat coil, blade drawn back)
// F1: Strike (forward lunge, mithril blade + crescent slash arc in facing vector)
// F2: Recover (follow-through combat guard)
// ----------------------------------------------------------------------------
console.log('Synthesizing Stage 2: Melee Attack with complete directional slash arcs...');
function buildAttackSet(baseStand, facing) {
    const f0 = Buffer.alloc(48 * 48 * 4);
    const f1 = Buffer.alloc(48 * 48 * 4);
    const f2 = Buffer.alloc(48 * 48 * 4);

    const lungeVec = {
        S:  { dx: 0, dy: 2 },
        SW: { dx: -2, dy: 2 },
        W:  { dx: -3, dy: 0 },
        NW: { dx: -2, dy: -2 },
        N:  { dx: 0, dy: -2 }
    }[facing];

    // Frame 0: Windup (coiled back slightly)
    const coil = shiftFrame(baseStand, -Math.sign(lungeVec.dx), -Math.sign(lungeVec.dy));
    coil.copy(f0);

    // Frame 1: Forward strike lunge
    const lunge = shiftFrame(baseStand, lungeVec.dx, lungeVec.dy);
    lunge.copy(f1);

    // Frame 2: Recover
    baseStand.copy(f2);

    // Sword hand & blade definitions
    const swordDef = {
        S: {
            hand: { x: 28, y: 30 },
            blade: [{ dx: 2, dy: 3 }, { dx: 3, dy: 5 }, { dx: 4, dy: 7 }, { dx: 5, dy: 9 }, { dx: 6, dy: 11 }],
            arc: [
                { x: 16, y: 41 }, { x: 20, y: 42 }, { x: 25, y: 43 }, { x: 30, y: 43 },
                { x: 35, y: 42 }, { x: 39, y: 40 }, { x: 42, y: 36 }
            ]
        },
        SW: {
            hand: { x: 20, y: 30 },
            blade: [{ dx: -2, dy: 2 }, { dx: -4, dy: 3 }, { dx: -6, dy: 5 }, { dx: -8, dy: 6 }, { dx: -10, dy: 8 }],
            arc: [
                { x: 10, y: 28 }, { x: 9, y: 33 }, { x: 10, y: 38 }, { x: 13, y: 42 },
                { x: 18, y: 44 }, { x: 23, y: 44 }
            ]
        },
        W: {
            hand: { x: 17, y: 28 },
            blade: [{ dx: -2, dy: 0 }, { dx: -4, dy: -1 }, { dx: -6, dy: -2 }, { dx: -8, dy: -3 }, { dx: -10, dy: -4 }],
            arc: [
                { x: 16, y: 15 }, { x: 11, y: 17 }, { x: 7, y: 22 }, { x: 6, y: 28 },
                { x: 8, y: 34 }, { x: 12, y: 38 }, { x: 17, y: 40 }
            ]
        },
        NW: {
            hand: { x: 18, y: 25 },
            blade: [{ dx: -2, dy: -2 }, { dx: -4, dy: -4 }, { dx: -6, dy: -6 }, { dx: -8, dy: -8 }],
            arc: [
                { x: 8, y: 26 }, { x: 7, y: 20 }, { x: 9, y: 15 }, { x: 13, y: 12 },
                { x: 19, y: 11 }, { x: 25, y: 12 }
            ]
        },
        N: {
            hand: { x: 29, y: 24 },
            blade: [{ dx: 1, dy: -2 }, { dx: 2, dy: -5 }, { dx: 3, dy: -7 }, { dx: 4, dy: -9 }],
            arc: [
                { x: 16, y: 12 }, { x: 21, y: 10 }, { x: 27, y: 10 }, { x: 33, y: 11 },
                { x: 38, y: 14 }
            ]
        }
    }[facing];

    // Draw sword blade on F1
    const hx = swordDef.hand.x + lungeVec.dx;
    const hy = swordDef.hand.y + lungeVec.dy;
    swordDef.blade.forEach((pt, idx) => {
        const bx = hx + pt.dx;
        const by = hy + pt.dy;
        if (bx >= 0 && bx < 48 && by >= 0 && by < 48) {
            const o = (by * 48 + bx) * 4;
            const col = (idx === swordDef.blade.length - 1) ? C_STEEL_CORE : C_STEEL_SHADE;
            f1[o] = col[0]; f1[o + 1] = col[1]; f1[o + 2] = col[2]; f1[o + 3] = 255;
        }
    });

    // Draw crescent slash arc on F1
    swordDef.arc.forEach((pt, idx) => {
        const ax = pt.x + lungeVec.dx;
        const ay = pt.y + lungeVec.dy;
        if (ax >= 0 && ax < 48 && ay >= 0 && ay < 48) {
            const o = (ay * 48 + ax) * 4;
            f1[o] = C_SLASH_ARC[0]; f1[o + 1] = C_SLASH_ARC[1]; f1[o + 2] = C_SLASH_ARC[2]; f1[o + 3] = 255;
        }
    });

    // Draw blade in ready windup on F0
    swordDef.blade.slice(0, 3).forEach(pt => {
        const bx = swordDef.hand.x - pt.dx / 2;
        const by = swordDef.hand.y - pt.dy / 2;
        if (bx >= 0 && bx < 48 && by >= 0 && by < 48) {
            const o = (Math.round(by) * 48 + Math.round(bx)) * 4;
            f0[o] = C_STEEL_SHADE[0]; f0[o + 1] = C_STEEL_SHADE[1]; f0[o + 2] = C_STEEL_SHADE[2]; f0[o + 3] = 255;
        }
    });

    // Draw blade in recovery on F2
    swordDef.blade.slice(0, 3).forEach(pt => {
        const bx = swordDef.hand.x + pt.dx / 2;
        const by = swordDef.hand.y + pt.dy / 2;
        if (bx >= 0 && bx < 48 && by >= 0 && by < 48) {
            const o = (Math.round(by) * 48 + Math.round(bx)) * 4;
            f2[o] = C_STEEL_CORE[0]; f2[o + 1] = C_STEEL_CORE[1]; f2[o + 2] = C_STEEL_CORE[2]; f2[o + 3] = 255;
        }
    });

    applyDarkOutline(f0, 48, 48);
    applyDarkOutline(f1, 48, 48);
    applyDarkOutline(f2, 48, 48);
    return [f0, f1, f2];
}

const attackFrames = {
    S:  buildAttackSet(walkFrames.S[1], 'S'),
    SW: buildAttackSet(walkFrames.SW[1], 'SW'),
    W:  buildAttackSet(walkFrames.W[1], 'W'),
    NW: buildAttackSet(walkFrames.NW[1], 'NW'),
    N:  buildAttackSet(walkFrames.N[1], 'N')
};

// ----------------------------------------------------------------------------
// Step 3: Ranged Bow Charset ($UF_Elf_Bow_8D.png)
// F0: Aim (bow gripped, arrow nocked in facing direction)
// F1: Draw (tension, string pulled to cheek/chest in facing direction)
// F2: Release (recoil follow-through after arrow released)
// ----------------------------------------------------------------------------
console.log('Synthesizing Stage 3: Ranged Bow strictly oriented in facing direction...');
function buildBowSet(baseStand, facing) {
    const f0 = Buffer.alloc(48 * 48 * 4);
    const f1 = Buffer.alloc(48 * 48 * 4);
    const f2 = Buffer.alloc(48 * 48 * 4);

    baseStand.copy(f0);
    baseStand.copy(f1);
    baseStand.copy(f2);

    const setPixel = (target, x, y, col) => {
        if (x >= 0 && x < 48 && y >= 0 && y < 48) {
            const o = (y * 48 + x) * 4;
            target[o] = col[0]; target[o + 1] = col[1]; target[o + 2] = col[2]; target[o + 3] = 255;
        }
    };

    if (facing === 'S') {
        // Facing South: Bow held vertically in front of chest, drawn downward/forward
        // Frame 0: Bow gripped in left hand
        for (let y = 18; y <= 36; y++) {
            const curve = (y >= 23 && y <= 31) ? 20 : 21;
            setPixel(f0, curve, y, C_BOW_WOOD);
        }
        setPixel(f0, 21, 27, C_SKIN_BASE); // Left hand

        // Frame 1: Full draw (string drawn back to right shoulder/chest)
        for (let y = 18; y <= 36; y++) {
            const curve = (y >= 23 && y <= 31) ? 19 : 21;
            setPixel(f1, curve, y, C_BOW_WOOD);
        }
        // String
        for (let y = 19; y <= 27; y++) setPixel(f1, 21 + Math.round((y - 19) * 0.7), y, C_BOW_STRING);
        for (let y = 28; y <= 35; y++) setPixel(f1, 27 - Math.round((y - 27) * 0.7), y, C_BOW_STRING);
        setPixel(f1, 27, 27, C_SKIN_BASE); // Drawing hand at cheek/chest

        // Frame 2: Release recoil
        for (let y = 19; y <= 35; y++) {
            const curve = (y >= 24 && y <= 30) ? 20 : 21;
            setPixel(f2, curve, y, C_BOW_WOOD);
        }
        for (let y = 19; y <= 35; y++) setPixel(f2, 21, y, C_BOW_STRING);
    } else if (facing === 'SW') {
        // Facing South-West: Bow angled at 45 degrees
        for (let i = -8; i <= 8; i++) {
            const bx = 18 + Math.round(i * 0.7);
            const by = 28 + Math.round(i * 0.7);
            setPixel(f0, bx, by, C_BOW_WOOD);
            setPixel(f1, bx - 1, by, C_BOW_WOOD);
            setPixel(f2, bx, by, C_BOW_WOOD);
        }
        setPixel(f1, 25, 25, C_SKIN_BASE); // Drawing hand
        for (let i = -7; i <= 7; i++) {
            setPixel(f1, 25 - Math.abs(i), 25 + i, C_BOW_STRING);
        }
    } else if (facing === 'W') {
        // Facing West: Side profile, bow held vertically pointing West
        for (let y = 16; y <= 36; y++) {
            const curve = (y >= 22 && y <= 30) ? 13 : 15;
            setPixel(f0, curve, y, C_BOW_WOOD);
            setPixel(f1, curve - 1, y, C_BOW_WOOD);
            setPixel(f2, curve, y, C_BOW_WOOD);
        }
        // String drawn back to cheek
        for (let y = 17; y <= 26; y++) setPixel(f1, 14 + Math.round((y - 17) * 0.9), y, C_BOW_STRING);
        for (let y = 27; y <= 35; y++) setPixel(f1, 22 - Math.round((y - 26) * 0.9), y, C_BOW_STRING);
        setPixel(f1, 22, 26, C_SKIN_BASE); // Drawing hand at cheek
        for (let y = 17; y <= 35; y++) setPixel(f2, 15, y, C_BOW_STRING);
    } else if (facing === 'NW') {
        // Facing North-West
        for (let i = -8; i <= 8; i++) {
            const bx = 18 + Math.round(i * 0.7);
            const by = 24 - Math.round(i * 0.7);
            setPixel(f0, bx, by, C_BOW_WOOD);
            setPixel(f1, bx - 1, by, C_BOW_WOOD);
            setPixel(f2, bx, by, C_BOW_WOOD);
        }
        setPixel(f1, 24, 25, C_SKIN_BASE);
    } else if (facing === 'N') {
        // Facing North: Bow held in front of character pointing North (away)
        for (let y = 18; y <= 36; y++) {
            const curve = (y >= 23 && y <= 31) ? 27 : 26;
            setPixel(f0, curve, y, C_BOW_WOOD);
            setPixel(f1, curve, y, C_BOW_WOOD);
            setPixel(f2, curve, y, C_BOW_WOOD);
        }
        for (let y = 19; y <= 35; y++) setPixel(f1, 25, y, C_BOW_STRING);
    }

    applyDarkOutline(f0, 48, 48);
    applyDarkOutline(f1, 48, 48);
    applyDarkOutline(f2, 48, 48);
    return [f0, f1, f2];
}

const shootFrames = {
    S:  buildBowSet(walkFrames.S[1], 'S'),
    SW: buildBowSet(walkFrames.SW[1], 'SW'),
    W:  buildBowSet(walkFrames.W[1], 'W'),
    NW: buildBowSet(walkFrames.NW[1], 'NW'),
    N:  buildBowSet(walkFrames.N[1], 'N')
};

// ----------------------------------------------------------------------------
// Step 4: Magic Cast Charset ($UF_Elf_Magic_8D.png)
// F0: Ready / Focus (hands brought together in concentration)
// F1: Channel / Glow (radiant emerald mana hands - raised high for North!)
// F2: Cast / Thrust (palms thrust forward in facing direction with expanding mana wave)
// ----------------------------------------------------------------------------
console.log('Synthesizing Stage 4: Magic Cast with authentic glowing hands and North visibility...');
function buildMagicSet(baseStand, facing) {
    const f0 = Buffer.alloc(48 * 48 * 4);
    const f1 = Buffer.alloc(48 * 48 * 4);
    const f2 = Buffer.alloc(48 * 48 * 4);

    baseStand.copy(f0);
    baseStand.copy(f1);
    baseStand.copy(f2);

    const setPixel = (target, x, y, col) => {
        if (x >= 0 && x < 48 && y >= 0 && y < 48) {
            const o = (y * 48 + x) * 4;
            target[o] = col[0]; target[o + 1] = col[1]; target[o + 2] = col[2]; target[o + 3] = 255;
        }
    };

    // Define precise hand coordinates for glowing aura
    let handPts = [];
    let thrustPts = [];

    if (facing === 'S') {
        handPts = [{ x: 17, y: 25 }, { x: 30, y: 25 }];
        thrustPts = [{ x: 16, y: 28 }, { x: 31, y: 28 }, { x: 24, y: 30 }];
    } else if (facing === 'SW') {
        handPts = [{ x: 15, y: 25 }, { x: 23, y: 26 }];
        thrustPts = [{ x: 12, y: 28 }, { x: 20, y: 30 }];
    } else if (facing === 'W') {
        handPts = [{ x: 14, y: 25 }, { x: 19, y: 25 }];
        thrustPts = [{ x: 10, y: 25 }, { x: 15, y: 25 }];
    } else if (facing === 'NW') {
        handPts = [{ x: 16, y: 19 }, { x: 23, y: 20 }];
        thrustPts = [{ x: 12, y: 17 }, { x: 20, y: 18 }];
    } else if (facing === 'N') {
        // For North: Hands raised UP high above shoulders/head on both sides of silver hair!
        handPts = [{ x: 15, y: 15 }, { x: 32, y: 15 }];
        thrustPts = [{ x: 15, y: 12 }, { x: 32, y: 12 }, { x: 24, y: 10 }];
    }

    // On F0: Draw focused hands
    handPts.forEach(pt => {
        setPixel(f0, pt.x, pt.y, C_SKIN_BASE);
        setPixel(f0, pt.x, pt.y + 1, C_SKIN_SHADE);
    });

    // On F1: Draw radiant emerald mana glowing hands (3x3 diamond + particle glints)
    handPts.forEach(pt => {
        // Draw hands
        setPixel(f1, pt.x, pt.y, C_SKIN_BASE);
        // Radiant mana aura
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                const dist = Math.abs(dx) + Math.abs(dy);
                if (dist <= 2) {
                    const col = (dist === 0) ? C_MANA_CORE : C_MANA_EDGE;
                    setPixel(f1, pt.x + dx, pt.y + dy, col);
                }
            }
        }
        // Sparkle glints
        setPixel(f1, pt.x - 3, pt.y, C_MANA_CORE);
        setPixel(f1, pt.x + 3, pt.y, C_MANA_CORE);
        setPixel(f1, pt.x, pt.y - 3, C_MANA_CORE);
    });

    // On F2: Palms thrust forward with expanding mana wave
    thrustPts.forEach(pt => {
        for (let dy = -3; dy <= 3; dy++) {
            for (let dx = -3; dx <= 3; dx++) {
                const dist = Math.hypot(dx, dy);
                if (dist <= 2.8) {
                    const col = (dist <= 1.2) ? C_MANA_CORE : C_MANA_EDGE;
                    setPixel(f2, pt.x + dx, pt.y + dy, col);
                }
            }
        }
    });

    applyDarkOutline(f0, 48, 48);
    applyDarkOutline(f1, 48, 48);
    applyDarkOutline(f2, 48, 48);
    return [f0, f1, f2];
}

const magicFrames = {
    S:  buildMagicSet(walkFrames.S[1], 'S'),
    SW: buildMagicSet(walkFrames.SW[1], 'SW'),
    W:  buildMagicSet(walkFrames.W[1], 'W'),
    NW: buildMagicSet(walkFrames.NW[1], 'NW'),
    N:  buildMagicSet(walkFrames.N[1], 'N')
};

// ----------------------------------------------------------------------------
// Step 5: Work / Harvest Charset ($UF_Elf_Work_8D.png)
// UNIFIED KNEELING CRAFTSMAN ACROSS ALL 8 FACINGS!
// Stature is consistently 32-35px tall on rows 13..47 across ALL directions!
// F0: Approach / Reach (kneeling, reaching toward workpiece)
// F1: Work / Carve (active carving stroke with tool & contact spark)
// F2: Gather / Recover (kneeling, gathering material / resetting tool)
// ----------------------------------------------------------------------------
console.log('Synthesizing Stage 5: Work / Harvest (unified kneeling craftsman across ALL facings)...');
function buildUnifiedKneelingWork(baseStand, facing) {
    const f0 = Buffer.alloc(48 * 48 * 4);
    const f1 = Buffer.alloc(48 * 48 * 4);
    const f2 = Buffer.alloc(48 * 48 * 4);

    // To create an authentic kneeling craftsman:
    // Compress standing sprite vertically down to kneeling height (H=34, bottom at row 47):
    // Head: rows 13..24
    // Torso & Tunic: rows 25..38
    // Knees & folded legs: rows 39..47
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            if (baseStand[sIdx + 3] > 0) {
                let ty;
                if (y < 22) {
                    // Head: maps 8..21 -> 13..24
                    ty = 13 + Math.round((y - 8) * 0.85);
                } else if (y < 34) {
                    // Torso: maps 22..33 -> 25..36
                    ty = 25 + Math.round((y - 22) * 0.9);
                } else {
                    // Legs/knees folded under: maps 34..47 -> 37..47
                    ty = 37 + Math.round((y - 34) * 0.77);
                }
                if (ty >= 0 && ty < 48) {
                    const dIdx = (ty * 48 + x) * 4;
                    f0[dIdx]     = baseStand[sIdx];
                    f0[dIdx + 1] = baseStand[sIdx + 1];
                    f0[dIdx + 2] = baseStand[sIdx + 2];
                    f0[dIdx + 3] = 255;

                    f1[dIdx]     = baseStand[sIdx];
                    f1[dIdx + 1] = baseStand[sIdx + 1];
                    f1[dIdx + 2] = baseStand[sIdx + 2];
                    f1[dIdx + 3] = 255;

                    f2[dIdx]     = baseStand[sIdx];
                    f2[dIdx + 1] = baseStand[sIdx + 1];
                    f2[dIdx + 2] = baseStand[sIdx + 2];
                    f2[dIdx + 3] = 255;
                }
            }
        }
    }

    const setPixel = (target, x, y, col) => {
        if (x >= 0 && x < 48 && y >= 0 && y < 48) {
            const o = (y * 48 + x) * 4;
            target[o] = col[0]; target[o + 1] = col[1]; target[o + 2] = col[2]; target[o + 3] = 255;
        }
    };

    // Add carving knife & contact point on F1
    const workPt = {
        S:  { x: 24, y: 39 },
        SW: { x: 19, y: 40 },
        W:  { x: 17, y: 41 },
        NW: { x: 18, y: 40 },
        N:  { x: 24, y: 38 }
    }[facing];

    // Carving knife blade on F1
    for (let i = -2; i <= 2; i++) {
        setPixel(f1, workPt.x + i, workPt.y - i, C_STEEL_CORE);
    }
    // Contact glint
    setPixel(f1, workPt.x, workPt.y, C_SLASH_ARC);
    setPixel(f1, workPt.x - 1, workPt.y + 1, C_BOW_WOOD); // Wood shavings / craft material

    applyDarkOutline(f0, 48, 48);
    applyDarkOutline(f1, 48, 48);
    applyDarkOutline(f2, 48, 48);
    return [f0, f1, f2];
}

const workFrames = {
    S:  buildUnifiedKneelingWork(walkFrames.S[1], 'S'),
    SW: buildUnifiedKneelingWork(walkFrames.SW[1], 'SW'),
    W:  buildUnifiedKneelingWork(walkFrames.W[1], 'W'),
    NW: buildUnifiedKneelingWork(walkFrames.NW[1], 'NW'),
    N:  buildUnifiedKneelingWork(walkFrames.N[1], 'N')
};

// ----------------------------------------------------------------------------
// Step 6: Downed / Sleep / Death Charset ($UF_Elf_Dead_8D.png)
// F0: Hurt Flinch (directional recoil, head jerk back, clutching wound)
// F1: Kneeling Collapse (buckling knees on row 47, head bowed down in grief)
// F2: Sleep / Dead (peaceful resting corpse lying flat on rows 37..47 with hair, tunic, trousers, boots)
// ----------------------------------------------------------------------------
console.log('Synthesizing Stage 6: Downed / Death / Sleep (authentic flinch, collapse, and organic resting corpse)...');
function buildDownedSet(baseStand, facing) {
    const f0 = Buffer.alloc(48 * 48 * 4);
    const f1 = Buffer.alloc(48 * 48 * 4);
    const f2 = Buffer.alloc(48 * 48 * 4);

    const recoilVec = {
        S:  { dx: 0, dy: -2 },
        SW: { dx: 2, dy: -2 },
        W:  { dx: 3, dy: 0 },
        NW: { dx: 2, dy: 2 },
        N:  { dx: 0, dy: 2 }
    }[facing];

    // Frame 0: Hurt Flinch (recoiling away from damage, clutching torso)
    const flinch = shiftFrame(baseStand, recoilVec.dx, recoilVec.dy);
    flinch.copy(f0);
    // Add blood / pain impact flash on torso (rows 24..30)
    for (let y = 24; y <= 30; y++) {
        for (let x = 20; x <= 28; x++) {
            const o = (y * 48 + x) * 4;
            if (f0[o + 3] > 0 && (x + y) % 3 === 0) {
                f0[o] = C_BLOOD_FLASH[0]; f0[o + 1] = C_BLOOD_FLASH[1]; f0[o + 2] = C_BLOOD_FLASH[2];
            }
        }
    }

    // Frame 1: Dedicated Kneeling Collapse (buckling to knees, head bowed, H=27px)
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            if (baseStand[sIdx + 3] > 0) {
                let ty;
                if (y < 22) {
                    // Head drops to rows 22..29
                    ty = 22 + Math.round((y - 8) * 0.55);
                } else if (y < 34) {
                    // Torso slumps to rows 30..38
                    ty = 30 + Math.round((y - 22) * 0.65);
                } else {
                    // Knees folded flat on ground rows 39..47
                    ty = 39 + Math.round((y - 34) * 0.6);
                }
                if (ty >= 0 && ty < 48) {
                    const dIdx = (ty * 48 + x) * 4;
                    f1[dIdx]     = baseStand[sIdx];
                    f1[dIdx + 1] = baseStand[sIdx + 1];
                    f1[dIdx + 2] = baseStand[sIdx + 2];
                    f1[dIdx + 3] = 255;
                }
            }
        }
    }

    // Frame 2: Organic horizontal resting corpse lying on rows 37..47 (11px tall)
    // Detailed sylvan resting anatomy: silver hair pillow, skin face, green tunic, belt/buckle, brown trousers, cuffed boots
    const flip = (facing === 'W' || facing === 'NW');
    const startX = flip ? 8 : 10;

    const setPixelF2 = (x, y, col) => {
        if (x >= 0 && x < 48 && y >= 0 && y < 48) {
            const o = (y * 48 + x) * 4;
            f2[o] = col[0]; f2[o + 1] = col[1]; f2[o + 2] = col[2]; f2[o + 3] = 255;
        }
    };

    for (let dx = 0; dx < 30; dx++) {
        const px = flip ? (startX + 29 - dx) : (startX + dx);
        const h = (dx < 7) ? 6 : (dx < 16) ? 7 : (dx < 19) ? 6 : (dx < 25) ? 5 : 6;
        const topY = 48 - h;

        for (let y = topY; y < 48; y++) {
            const dy = y - topY;
            let col;
            if (dx < 7) {
                // Head with silver hair
                if (y === topY || y === 47 || dx === 0) col = C_OUTLINE;
                else if (dy === 1) col = C_HAIR_BASE;
                else if (dy === 2) col = C_HAIR_SHADE;
                else col = C_SKIN_BASE;
            } else if (dx < 16) {
                // Tunic
                if (y === topY || y === 47) col = C_OUTLINE;
                else if (dy === 1) col = C_TUNIC_BASE;
                else if (dy === 2) col = C_TUNIC_BASE;
                else col = C_TUNIC_SHADE;
            } else if (dx < 19) {
                // Belt & gold buckle
                col = (dy === 2) ? C_BUCKLE : C_BELT;
            } else if (dx < 25) {
                // Trousers
                if (y === topY || y === 47) col = C_OUTLINE;
                else col = C_PANTS_BASE;
            } else {
                // Boots
                if (y === topY || y === 47 || dx === 29) col = C_OUTLINE;
                else col = C_PANTS_SHADE;
            }
            setPixelF2(px, y, col);
        }
    }

    applyDarkOutline(f0, 48, 48);
    applyDarkOutline(f1, 48, 48);
    applyDarkOutline(f2, 48, 48);
    return [f0, f1, f2];
}

const deadFrames = {
    S:  buildDownedSet(walkFrames.S[1], 'S'),
    SW: buildDownedSet(walkFrames.SW[1], 'SW'),
    W:  buildDownedSet(walkFrames.W[1], 'W'),
    NW: buildDownedSet(walkFrames.NW[1], 'NW'),
    N:  buildDownedSet(walkFrames.N[1], 'N')
};

// ----------------------------------------------------------------------------
// Assemble 8-Directional Charsets (144 x 384 px)
// Rows: S(0), SW(1), W(2), NW(3), N(4), NE=mirror(NW)(5), E=mirror(W)(6), SE=mirror(SW)(7)
// ----------------------------------------------------------------------------
function assemble8DCharset(framesByFacing) {
    const buf = Buffer.alloc(144 * 384 * 4);
    const rows = [
        framesByFacing.S,
        framesByFacing.SW,
        framesByFacing.W,
        framesByFacing.NW,
        framesByFacing.N,
        framesByFacing.NW.map(mirrorFrame),
        framesByFacing.W.map(mirrorFrame),
        framesByFacing.SW.map(mirrorFrame)
    ];

    for (let r = 0; r < 8; r++) {
        const frameArr = rows[r];
        for (let col = 0; col < 3; col++) {
            const frame = frameArr[col];
            for (let py = 0; py < 48; py++) {
                for (let px = 0; px < 48; px++) {
                    const sIdx = (py * 48 + px) * 4;
                    const dIdx = ((r * 48 + py) * 144 + (col * 48 + px)) * 4;
                    buf[dIdx]     = frame[sIdx];
                    buf[dIdx + 1] = frame[sIdx + 1];
                    buf[dIdx + 2] = frame[sIdx + 2];
                    buf[dIdx + 3] = frame[sIdx + 3];
                }
            }
        }
    }
    quantizeSheet(buf, 144, 384, 31);
    return buf;
}

console.log('Assembling 8D sub-charsets...');
const walkBuf   = assemble8DCharset(walkFrames);
const attackBuf = assemble8DCharset(attackFrames);
const bowBuf    = assemble8DCharset(shootFrames);
const magicBuf  = assemble8DCharset(magicFrames);
const workBuf   = assemble8DCharset(workFrames);
const deadBuf   = assemble8DCharset(deadFrames);

// ----------------------------------------------------------------------------
// Assemble 18-Column Master Template (864 x 384 px)
// ----------------------------------------------------------------------------
console.log('Assembling 18-column master template (864 x 384 px)...');
const master18Buf = Buffer.alloc(864 * 384 * 4);
const sets = [
    { buf: walkBuf,   colOffset: 0 },
    { buf: attackBuf, colOffset: 3 },
    { buf: bowBuf,    colOffset: 6 },
    { buf: magicBuf,  colOffset: 9 },
    { buf: workBuf,   colOffset: 12 },
    { buf: deadBuf,   colOffset: 15 }
];

sets.forEach(s => {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 3; c++) {
            const dstCol = s.colOffset + c;
            for (let py = 0; py < 48; py++) {
                for (let px = 0; px < 48; px++) {
                    const sIdx = ((r * 48 + py) * 144 + (c * 48 + px)) * 4;
                    const dIdx = ((r * 48 + py) * 864 + (dstCol * 48 + px)) * 4;
                    master18Buf[dIdx]     = s.buf[sIdx];
                    master18Buf[dIdx + 1] = s.buf[sIdx + 1];
                    master18Buf[dIdx + 2] = s.buf[sIdx + 2];
                    master18Buf[dIdx + 3] = s.buf[sIdx + 3];
                }
            }
        }
    }
});

// Save native 18-column master
fs.writeFileSync(path.join(MASTER_DIR, 'Elf_Standard_8D_18Col.png'), writePNG(master18Buf, 864, 384));
console.log('Saved art/masters/Elf_Standard_8D_18Col.png');

// ----------------------------------------------------------------------------
// Save Sub-Charsets & Sidecars into game/img/characters/
// ----------------------------------------------------------------------------
function saveCharsetWithSidecar(buf, baseName, species, actionTag, animations) {
    const pngPath = path.join(CHAR_DIR, `$UF_${baseName}.png`);
    fs.writeFileSync(pngPath, writePNG(buf, 144, 384));

    const sidecar = {
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'],
        animations: animations,
        frameMs: 200,
        species: species,
        action: actionTag
    };
    fs.writeFileSync(path.join(CHAR_DIR, `$UF_${baseName}.json`), JSON.stringify(sidecar, null, 2));

    // Also write Male alias
    const malePng = path.join(CHAR_DIR, `$UF_${species}_Male_${actionTag}_8D.png`);
    fs.writeFileSync(malePng, writePNG(buf, 144, 384));
    fs.writeFileSync(path.join(CHAR_DIR, `$UF_${species}_Male_${actionTag}_8D.json`), JSON.stringify(sidecar, null, 2));
}

saveCharsetWithSidecar(walkBuf,   'Elf_8D',        'Elf', 'Walk',   { walk: [0, 1, 2, 1], stand: [1] });
saveCharsetWithSidecar(attackBuf, 'Elf_Attack_8D', 'Elf', 'Attack', { attack: [0, 1, 2] });
saveCharsetWithSidecar(bowBuf,    'Elf_Bow_8D',    'Elf', 'Bow',    { shoot: [0, 1, 2] });
saveCharsetWithSidecar(magicBuf,  'Elf_Magic_8D',  'Elf', 'Cast',   { cast: [0, 1, 2] });
saveCharsetWithSidecar(workBuf,   'Elf_Work_8D',   'Elf', 'Work',   { work: [0, 1, 2] });
saveCharsetWithSidecar(deadBuf,   'Elf_Dead_8D',   'Elf', 'Dead',   { hurt: [0], collapse: [1], dead: [2], sleep: [2] });

// Save master AR-600 sheet (960 x 384 px)
const ar600Buf = Buffer.alloc(960 * 384 * 4);
// Map 20 columns:
// 0: stand, 1..3: walk, 4..6: work, 7: stand, 8..10: attack, 11..13: cast, 14: hurt, 15..17: death, 18..19: idle
const colMap = [
    { src: walkBuf, sc: 1 },    // 0: stand
    { src: walkBuf, sc: 0 },    // 1: walk L
    { src: walkBuf, sc: 1 },    // 2: walk pass
    { src: walkBuf, sc: 2 },    // 3: walk R
    { src: workBuf, sc: 0 },    // 4: work reach
    { src: workBuf, sc: 1 },    // 5: work carve
    { src: workBuf, sc: 2 },    // 6: work gather
    { src: walkBuf, sc: 1 },    // 7: stand (carry compat)
    { src: attackBuf, sc: 0 },  // 8: attack windup
    { src: attackBuf, sc: 1 },  // 9: attack strike
    { src: attackBuf, sc: 2 },  // 10: attack recover
    { src: magicBuf, sc: 0 },   // 11: magic ready
    { src: magicBuf, sc: 1 },   // 12: magic glow
    { src: magicBuf, sc: 2 },   // 13: magic thrust
    { src: deadBuf, sc: 0 },    // 14: hurt flinch
    { src: deadBuf, sc: 1 },    // 15: death collapse
    { src: deadBuf, sc: 2 },    // 16: death corpse
    { src: deadBuf, sc: 2 },    // 17: death corpse
    { src: walkBuf, sc: 1 },    // 18: idle
    { src: walkBuf, sc: 1 }     // 19: idle
];

for (let r = 0; r < 8; r++) {
    for (let dc = 0; dc < 20; dc++) {
        const item = colMap[dc];
        for (let py = 0; py < 48; py++) {
            for (let px = 0; px < 48; px++) {
                const sIdx = ((r * 48 + py) * 144 + (item.sc * 48 + px)) * 4;
                const dIdx = ((r * 48 + py) * 960 + (dc * 48 + px)) * 4;
                ar600Buf[dIdx]     = item.src[sIdx];
                ar600Buf[dIdx + 1] = item.src[sIdx + 1];
                ar600Buf[dIdx + 2] = item.src[sIdx + 2];
                ar600Buf[dIdx + 3] = item.src[sIdx + 3];
            }
        }
    }
}
quantizeSheet(ar600Buf, 960, 384, 31);
fs.writeFileSync(path.join(CHAR_DIR, '$UF_Elf_Male_AR600.png'), writePNG(ar600Buf, 960, 384));
fs.writeFileSync(path.join(MASTER_DIR, 'elf_male.png'), writePNG(ar600Buf, 960, 384));
console.log('Saved AR-600 composite master sheets ($UF_Elf_Male_AR600.png)');

// ----------------------------------------------------------------------------
// Step 7: Build Authoritative Specification Template & Creator Review Board
// ----------------------------------------------------------------------------
console.log('Building creator review board & labeled template specification...');
// Run build_creator_review_board.js to render the review board and template
const { execFileSync } = require('child_process');
execFileSync(process.execPath, [path.join(ROOT, 'tools', 'build_creator_review_board.js')], { stdio: 'inherit' });

console.log('Elf standard charset generation complete!');
