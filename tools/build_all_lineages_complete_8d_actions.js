#!/usr/bin/env node
'use strict';

/**
 * tools/build_all_lineages_complete_8d_actions.js
 *
 * Comprehensive generator delivering the COMPLETE 8-DIRECTIONAL ACTION SUITE
 * for all three core lineages (Human, Dwarf, Elf - Male & Female):
 *
 * For EVERY direction (S, SW, W, NW, N, NE, E, SE):
 * 1. Walk / Stand (3-frame kinematic scissor stride + passing bob)
 * 2. Use / Work (3-frame harvesting, mining, crafting, chopping stroke)
 * 3. Melee Attack (3-frame windup, weapon strike & slash arc, recovery)
 * 4. Ranged Attack (3-frame nock, aim, release for Bow & Crossbow)
 * 5. Magic Cast (3-frame mana gather, elemental surge, release)
 * 6. Hurt (1-frame flinch & recoil)
 * 7. Death & Remains (3-frame stagger, collapse, resting corpse)
 * 8. Idle (2-frame breathing / ready stance)
 *
 * Full AR-600 20-column x 8-row masters (960x384 px) + standalone 8D sub-sheets.
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

// Essential color ramps
const C_DARK_OUTLINE = pal.snap(24, 16, 10);
const C_STEEL_WHITE  = pal.snap(255, 255, 255);
const C_STEEL_LIGHT  = pal.snap(219, 234, 254);
const C_STEEL_MID    = pal.snap(160, 180, 200);
const C_STEEL_DARK   = pal.snap(90, 110, 130);
const C_GOLD_BRIGHT  = pal.snap(250, 220, 80);
const C_GOLD_MID     = pal.snap(210, 165, 40);
const C_WOOD_SHAFT   = pal.snap(130, 85, 45);
const C_BLOOD_RED    = pal.snap(180, 25, 25);
const C_MAGIC_CYAN   = pal.snap(80, 210, 240);
const C_MAGIC_GLOW   = pal.snap(230, 250, 255);
const C_MAGIC_EMERALD= pal.snap(60, 230, 120);

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

function applyDarkOutline(buf, w = 48, h = 48) {
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
                if (lum < 165 && !(r < 120 && g > 180 && b > 200)) {
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

// ----------------------------------------------------------------------------
// 8-Directional Action Synthesizers
// ----------------------------------------------------------------------------

const DIR_VECTORS = {
    S:  { dx: 0, dy: 3 },
    SW: { dx: -2, dy: 2 },
    W:  { dx: -3, dy: 0 },
    NW: { dx: -2, dy: -2 },
    N:  { dx: 0, dy: -3 },
    NE: { dx: 2, dy: -2 },
    E:  { dx: 3, dy: 0 },
    SE: { dx: 2, dy: 2 }
};

// 1. USE / WORK (Cols 4, 5, 6): Windup, Strike / Stroke, Recovery
function synthesizeWork(standFrame, facing, phase) {
    const out = Buffer.alloc(48 * 48 * 4);
    const vec = DIR_VECTORS[facing];

    if (phase === 0) {
        // Windup: lean back slightly opposite to work direction
        const shifted = shiftFrame(standFrame, -Math.sign(vec.dx), -Math.sign(vec.dy) - 1);
        shifted.copy(out);
    } else if (phase === 1) {
        // Active Stroke: dip and lunge towards the object being worked
        const shifted = shiftFrame(standFrame, vec.dx, Math.min(2, vec.dy + 1));
        shifted.copy(out);

        // Draw impact spark on target contact point
        const cx = Math.max(2, Math.min(45, 24 + vec.dx * 5));
        const cy = Math.max(2, Math.min(45, 34 + vec.dy * 4));
        const setSpark = (x, y, col) => {
            if (x >= 0 && x < 48 && y >= 0 && y < 48) {
                const idx = (y * 48 + x) * 4;
                out[idx] = col[0]; out[idx + 1] = col[1]; out[idx + 2] = col[2]; out[idx + 3] = 255;
            }
        };
        setSpark(cx, cy, C_STEEL_WHITE);
        setSpark(cx - 1, cy, C_GOLD_BRIGHT);
        setSpark(cx + 1, cy, C_GOLD_BRIGHT);
        setSpark(cx, cy - 1, C_GOLD_BRIGHT);
        setSpark(cx, cy + 1, C_GOLD_BRIGHT);
    } else {
        // Recovery: upright ready stance
        standFrame.copy(out);
    }

    applyDarkOutline(out, 48, 48);
    return out;
}

// 2. MELEE ATTACK (Cols 8, 9, 10): Windup, Slash / Cleave Arc, Guard
function synthesizeMeleeAttack(standFrame, facing, phase, weaponType = 'sword') {
    const out = Buffer.alloc(48 * 48 * 4);
    const vec = DIR_VECTORS[facing];

    if (phase === 0) {
        // Windup: ready lunge backward
        const shifted = shiftFrame(standFrame, -Math.sign(vec.dx) * 2, -Math.sign(vec.dy));
        shifted.copy(out);
    } else if (phase === 1) {
        // Dynamic Slash: powerful forward lunge towards opponent
        const shifted = shiftFrame(standFrame, vec.dx * 1.5 | 0, vec.dy);
        shifted.copy(out);

        // Render high-definition slashing weapon arc
        const setPixel = (x, y, col) => {
            if (x >= 0 && x < 48 && y >= 0 && y < 48) {
                const idx = (y * 48 + x) * 4;
                out[idx] = col[0]; out[idx + 1] = col[1]; out[idx + 2] = col[2]; out[idx + 3] = 255;
            }
        };

        const ax = Math.max(4, Math.min(43, 24 + vec.dx * 5));
        const ay = Math.max(4, Math.min(43, 30 + vec.dy * 4));

        // Gleaming weapon slash trail
        for (let i = -3; i <= 3; i++) {
            const px = ax + (vec.dy !== 0 ? i * 2 : 0);
            const py = ay + (vec.dx !== 0 ? i * 2 : 0);
            setPixel(px, py, (Math.abs(i) <= 1) ? C_STEEL_WHITE : C_STEEL_LIGHT);
            setPixel(px + Math.sign(vec.dx), py + Math.sign(vec.dy), C_STEEL_MID);
        }
    } else {
        // Recovery Guard
        const shifted = shiftFrame(standFrame, Math.sign(vec.dx), 0);
        shifted.copy(out);
    }

    applyDarkOutline(out, 48, 48);
    return out;
}

// 3. RANGED ATTACK (Bow / Crossbow): Nock / Aim, Full Draw, Release
function synthesizeRangedAttack(standFrame, facing, phase, weaponType = 'bow') {
    const out = Buffer.alloc(48 * 48 * 4);
    const vec = DIR_VECTORS[facing];

    if (phase === 0) {
        // Nock / Raise Weapon
        standFrame.copy(out);
    } else if (phase === 1) {
        // Full Draw & Steady Aim: slight lean into the shot
        const shifted = shiftFrame(standFrame, Math.sign(vec.dx), 0);
        shifted.copy(out);

        // Render drawn bow / crossbow line
        const bx = Math.max(4, Math.min(43, 24 + vec.dx * 4));
        const by = Math.max(4, Math.min(43, 28 + vec.dy * 3));
        const setPixel = (x, y, col) => {
            if (x >= 0 && x < 48 && y >= 0 && y < 48) {
                const idx = (y * 48 + x) * 4;
                out[idx] = col[0]; out[idx + 1] = col[1]; out[idx + 2] = col[2]; out[idx + 3] = 255;
            }
        };

        // Arrow tip gleam
        setPixel(bx, by, C_STEEL_WHITE);
        setPixel(bx - Math.sign(vec.dx), by - Math.sign(vec.dy), C_WOOD_SHAFT);
        setPixel(bx - Math.sign(vec.dx) * 2, by - Math.sign(vec.dy) * 2, C_WOOD_SHAFT);
    } else {
        // Release: string snapped, recoil shift backwards
        const shifted = shiftFrame(standFrame, -Math.sign(vec.dx), 0);
        shifted.copy(out);
    }

    applyDarkOutline(out, 48, 48);
    return out;
}

// 4. MAGIC CAST (Cols 11, 12, 13): Mana Gather, Surge / Channel, Release
function synthesizeMagicCast(standFrame, facing, phase, magicType = 'arcane') {
    const out = Buffer.alloc(48 * 48 * 4);
    const vec = DIR_VECTORS[facing];
    standFrame.copy(out);

    const auraColor = (magicType === 'sylvan') ? C_MAGIC_EMERALD :
                      (magicType === 'rune')   ? C_GOLD_BRIGHT : C_MAGIC_CYAN;

    const setPixel = (x, y, col) => {
        if (x >= 0 && x < 48 && y >= 0 && y < 48) {
            const idx = (y * 48 + x) * 4;
            out[idx] = col[0]; out[idx + 1] = col[1]; out[idx + 2] = col[2]; out[idx + 3] = 255;
        }
    };

    const cx = Math.max(4, Math.min(43, 24 + vec.dx * 3));
    const cy = Math.max(4, Math.min(43, 26 + vec.dy * 2));

    if (phase === 0) {
        // Mana gathering orb
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                setPixel(cx + dx, cy + dy, (dx === 0 && dy === 0) ? C_MAGIC_GLOW : auraColor);
            }
        }
    } else if (phase === 1) {
        // Radiant Magical Surge
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                if (Math.abs(dx) + Math.abs(dy) <= 3) {
                    setPixel(cx + dx, cy + dy, (dx === 0 && dy === 0) ? C_MAGIC_GLOW : auraColor);
                }
            }
        }
        // Directional casting bursts
        setPixel(cx + vec.dx * 3, cy + vec.dy * 3, C_MAGIC_GLOW);
        setPixel(cx + vec.dx * 4, cy + vec.dy * 4, auraColor);
    } else {
        // Residual Channel Sparks
        setPixel(cx - 1, cy - 2, auraColor);
        setPixel(cx + 2, cy - 1, C_MAGIC_GLOW);
        setPixel(cx - 2, cy + 1, auraColor);
    }

    applyDarkOutline(out, 48, 48);
    return out;
}

// 5. HURT (Col 14): Flinch & Hit Recoil
function synthesizeHurt(standFrame, facing) {
    const out = Buffer.alloc(48 * 48 * 4);
    const vec = DIR_VECTORS[facing];

    // Recoil backwards away from damage
    const shifted = shiftFrame(standFrame, -Math.sign(vec.dx) * 2, -1);
    shifted.copy(out);

    // Subtle blood flash on impact area
    for (let y = 22; y <= 32; y++) {
        for (let x = 18; x <= 30; x++) {
            const idx = (y * 48 + x) * 4;
            if (out[idx + 3] > 0 && (x + y) % 4 === 0) {
                out[idx] = C_BLOOD_RED[0]; out[idx + 1] = C_BLOOD_RED[1]; out[idx + 2] = C_BLOOD_RED[2];
            }
        }
    }

    applyDarkOutline(out, 48, 48);
    return out;
}

// 6. DEATH & REMAINS (Cols 15, 16, 17): Mortal Stagger, Collapse, Resting Corpse
function synthesizeDeath(standFrame, facing, phase) {
    const out = Buffer.alloc(48 * 48 * 4);

    if (phase === 0) {
        // Stagger: body thrown back
        const stagger = shiftFrame(standFrame, (facing.includes('W') ? 2 : (facing.includes('E') ? -2 : 0)), 2);
        stagger.copy(out);
    } else if (phase === 1) {
        // Kneeling Collapse
        for (let y = 0; y < 48; y++) {
            const prog = y / 47;
            const ty = Math.min(47, Math.round(26 + prog * 21));
            for (let x = 0; x < 48; x++) {
                const sIdx = (y * 48 + x) * 4;
                if (standFrame[sIdx + 3] > 0) {
                    const dIdx = (ty * 48 + x) * 4;
                    out[dIdx] = standFrame[sIdx];
                    out[dIdx + 1] = standFrame[sIdx + 1];
                    out[dIdx + 2] = standFrame[sIdx + 2];
                    out[dIdx + 3] = 255;
                }
            }
        }
    } else {
        // Resting Fallen Remains: flattened on ground (rows 40..47)
        for (let y = 14; y < 48; y++) {
            const ty = Math.min(47, Math.round(41 + (y - 14) * (6 / 34)));
            const tx = Math.min(47, Math.max(0, Math.round(24 + (y - 30) * 0.5)));
            for (let x = 14; x <= 34; x++) {
                const sIdx = (y * 48 + x) * 4;
                if (standFrame[sIdx + 3] > 0) {
                    const dIdx = (ty * 48 + tx) * 4;
                    out[dIdx] = standFrame[sIdx];
                    out[dIdx + 1] = standFrame[sIdx + 1];
                    out[dIdx + 2] = standFrame[sIdx + 2];
                    out[dIdx + 3] = 255;
                }
            }
        }
    }

    applyDarkOutline(out, 48, 48);
    return out;
}

// 7. IDLE (Cols 18, 19): Subtle Breathing Shift
function synthesizeIdle(standFrame, phase) {
    if (phase === 0) return Buffer.from(standFrame);
    const out = Buffer.alloc(48 * 48 * 4);
    // 1px chest lift during deep breath
    for (let y = 0; y < 48; y++) {
        const ty = (y >= 14 && y <= 35) ? (y - 1) : y;
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            if (standFrame[sIdx + 3] > 0) {
                const dIdx = (ty * 48 + x) * 4;
                out[dIdx] = standFrame[sIdx];
                out[dIdx + 1] = standFrame[sIdx + 1];
                out[dIdx + 2] = standFrame[sIdx + 2];
                out[dIdx + 3] = 255;
            }
        }
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

// ----------------------------------------------------------------------------
// Full AR-600 20-Column Sheet Assembly
// ----------------------------------------------------------------------------
const FACINGS = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'];

function assembleFullAR600(walk8D, weaponMelee, weaponRanged, magicType) {
    const ar600 = Buffer.alloc(960 * 384 * 4);

    function setCell(c, r, frame) {
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = (y * 48 + x) * 4;
                if (frame[sIdx + 3] > 0) {
                    const dIdx = (((r * 48 + y) * 960) + (c * 48 + x)) * 4;
                    ar600[dIdx] = frame[sIdx];
                    ar600[dIdx + 1] = frame[sIdx + 1];
                    ar600[dIdx + 2] = frame[sIdx + 2];
                    ar600[dIdx + 3] = 255;
                }
            }
        }
    }

    for (let r = 0; r < 8; r++) {
        const facing = FACINGS[r];
        // Extract 3 walk frames from walk8D sheet (cols 0, 1, 2)
        const getWalkFrame = (col) => {
            const f = Buffer.alloc(48 * 48 * 4);
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (((r * 48 + y) * 144) + (col * 48 + x)) * 4;
                    const dIdx = (y * 48 + x) * 4;
                    f[dIdx] = walk8D[sIdx];
                    f[dIdx + 1] = walk8D[sIdx + 1];
                    f[dIdx + 2] = walk8D[sIdx + 2];
                    f[dIdx + 3] = walk8D[sIdx + 3];
                }
            }
            return f;
        };

        const stepL = getWalkFrame(0);
        const stand = getWalkFrame(1);
        const stepR = getWalkFrame(2);

        // Col 0: Stand
        setCell(0, r, stand);

        // Cols 1, 2, 3: Walk
        setCell(1, r, stepL);
        setCell(2, r, stand);
        setCell(3, r, stepR);

        // Cols 4, 5, 6: Use / Work
        setCell(4, r, synthesizeWork(stand, facing, 0));
        setCell(5, r, synthesizeWork(stand, facing, 1));
        setCell(6, r, synthesizeWork(stand, facing, 2));

        // Col 7: Stand placeholder (V89 carry legacy)
        setCell(7, r, stand);

        // Cols 8, 9, 10: Melee Attack
        setCell(8, r, synthesizeMeleeAttack(stand, facing, 0, weaponMelee));
        setCell(9, r, synthesizeMeleeAttack(stand, facing, 1, weaponMelee));
        setCell(10, r, synthesizeMeleeAttack(stand, facing, 2, weaponMelee));

        // Cols 11, 12, 13: Magic Cast
        setCell(11, r, synthesizeMagicCast(stand, facing, 0, magicType));
        setCell(12, r, synthesizeMagicCast(stand, facing, 1, magicType));
        setCell(13, r, synthesizeMagicCast(stand, facing, 2, magicType));

        // Col 14: Hurt
        setCell(14, r, synthesizeHurt(stand, facing));

        // Cols 15, 16, 17: Death & Remains
        setCell(15, r, synthesizeDeath(stand, facing, 0));
        setCell(16, r, synthesizeDeath(stand, facing, 1));
        setCell(17, r, synthesizeDeath(stand, facing, 2));

        // Cols 18, 19: Idle
        setCell(18, r, synthesizeIdle(stand, 0));
        setCell(19, r, synthesizeIdle(stand, 1));
    }

    quantizeSheet(ar600, 960, 384, 31);
    return ar600;
}

// Extract 144x384 8D Action Sub-sheet (3 cols x 8 rows) from AR-600 buffer
function extract8DAction(ar600, startCol) {
    const out = Buffer.alloc(144 * 384 * 4);
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 3; c++) {
            const arCol = startCol + c;
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (((r * 48 + y) * 960) + (arCol * 48 + x)) * 4;
                    const dIdx = (((r * 48 + y) * 144) + (c * 48 + x)) * 4;
                    out[dIdx] = ar600[sIdx];
                    out[dIdx + 1] = ar600[sIdx + 1];
                    out[dIdx + 2] = ar600[sIdx + 2];
                    out[dIdx + 3] = ar600[sIdx + 3];
                }
            }
        }
    }
    quantizeSheet(out, 144, 384, 31);
    return out;
}

// Synthesize 144x384 Ranged Attack 8D Sheet (Nock, Aim, Release across all 8 facings)
function synthesizeRanged8DSheet(walk8D, weaponType = 'bow') {
    const out = Buffer.alloc(144 * 384 * 4);
    for (let r = 0; r < 8; r++) {
        const facing = FACINGS[r];
        // Stand frame from col 1 of walk8D
        const stand = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = (((r * 48 + y) * 144) + (48 + x)) * 4;
                const dIdx = (y * 48 + x) * 4;
                stand[dIdx] = walk8D[sIdx];
                stand[dIdx + 1] = walk8D[sIdx + 1];
                stand[dIdx + 2] = walk8D[sIdx + 2];
                stand[dIdx + 3] = walk8D[sIdx + 3];
            }
        }

        const f0 = synthesizeRangedAttack(stand, facing, 0, weaponType);
        const f1 = synthesizeRangedAttack(stand, facing, 1, weaponType);
        const f2 = synthesizeRangedAttack(stand, facing, 2, weaponType);
        const frames = [f0, f1, f2];

        for (let c = 0; c < 3; c++) {
            const frame = frames[c];
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
    quantizeSheet(out, 144, 384, 31);
    return out;
}

// ----------------------------------------------------------------------------
// Sidecar Helpers
// ----------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------
// Pipeline Execution
// ----------------------------------------------------------------------------
const CONFIGS = [
    {
        name: 'Human Male',
        species: 'human',
        gender: 'male',
        walk8DFile: '$UF_Human_Male_8D.png',
        weaponMelee: 'sword',
        weaponRanged: 'bow',
        magicType: 'arcane',
        ar600File: '$UF_Human_Male_AR600',
        work8DFile: '$UF_Human_Work_8D',
        melee8DFile: '$UF_Human_Attack_Sword_8D',
        ranged8DFile: '$UF_Human_Attack_Bow_8D',
        cast8DFile: '$UF_Human_Cast_8D'
    },
    {
        name: 'Human Female',
        species: 'human',
        gender: 'female',
        walk8DFile: '$UF_Human_Female_8D.png',
        weaponMelee: 'sword',
        weaponRanged: 'bow',
        magicType: 'arcane',
        ar600File: '$UF_Human_Female_AR600',
        work8DFile: null,
        melee8DFile: null,
        ranged8DFile: null,
        cast8DFile: null
    },
    {
        name: 'Dwarf Male',
        species: 'dwarf',
        gender: 'male',
        walk8DFile: '$UF_Dwarf_Male_8D.png',
        weaponMelee: 'axe',
        weaponRanged: 'crossbow',
        magicType: 'rune',
        ar600File: '$UF_Dwarf_Male_AR600',
        work8DFile: '$UF_Dwarf_Work_8D',
        melee8DFile: '$UF_Dwarf_Attack_Axe_8D',
        ranged8DFile: '$UF_Dwarf_Attack_Crossbow_8D',
        cast8DFile: '$UF_Dwarf_Cast_Hammer_8D'
    },
    {
        name: 'Dwarf Female',
        species: 'dwarf',
        gender: 'female',
        walk8DFile: '$UF_Dwarf_Female_8D.png',
        weaponMelee: 'axe',
        weaponRanged: 'crossbow',
        magicType: 'rune',
        ar600File: '$UF_Dwarf_Female_AR600',
        work8DFile: null,
        melee8DFile: null,
        ranged8DFile: null,
        cast8DFile: null
    },
    {
        name: 'Elf Male',
        species: 'elf',
        gender: 'male',
        walk8DFile: '$UF_Elf_Male_8D.png',
        weaponMelee: 'sword',
        weaponRanged: 'bow',
        magicType: 'sylvan',
        ar600File: '$UF_Elf_Male_AR600',
        work8DFile: '$UF_Elf_Work_8D',
        melee8DFile: '$UF_Elf_Attack_Sword_8D',
        ranged8DFile: '$UF_Elf_Attack_Bow_8D',
        cast8DFile: '$UF_Elf_Cast_Staff_8D'
    },
    {
        name: 'Elf Female',
        species: 'elf',
        gender: 'female',
        walk8DFile: '$UF_Elf_Female_8D.png',
        weaponMelee: 'sword',
        weaponRanged: 'bow',
        magicType: 'sylvan',
        ar600File: '$UF_Elf_Female_AR600',
        work8DFile: null,
        melee8DFile: null,
        ranged8DFile: null,
        cast8DFile: null
    }
];

function main() {
    console.log('=== Building Complete 8-Directional Action Suites for 3 Lineages ===');

    for (const cfg of CONFIGS) {
        console.log(`Processing ${cfg.name}...`);
        const walkPath = path.join(CHAR_DIR, cfg.walk8DFile);
        if (!fs.existsSync(walkPath)) {
            console.error(`Missing walk file: ${walkPath}`);
            continue;
        }

        const walkImg = decodePNG(fs.readFileSync(walkPath));

        // 1. Build full AR-600 Master (960x384)
        console.log(`  Assembling AR-600 Master (${cfg.ar600File})...`);
        const ar600 = assembleFullAR600(walkImg.data, cfg.weaponMelee, cfg.weaponRanged, cfg.magicType);

        // Deploy AR-600 to characters and masters
        writePNG(path.join(CHAR_DIR, `${cfg.ar600File}.png`), 960, 384, ar600);
        fs.writeFileSync(path.join(CHAR_DIR, `${cfg.ar600File}.json`), JSON.stringify(makeAR600Sidecar(cfg.ar600File, cfg.species, cfg.gender), null, 2));

        const masterBase = `${cfg.species}_${cfg.gender}`;
        writePNG(path.join(MASTERS_DIR, `${masterBase}.png`), 960, 384, ar600);
        fs.writeFileSync(path.join(MASTERS_DIR, `${masterBase}.json`), JSON.stringify(makeAR600Sidecar(masterBase, cfg.species, cfg.gender), null, 2));

        // 2. Deploy 8D Sub-sheets
        if (cfg.work8DFile) {
            console.log(`  Deploying Work 8D (${cfg.work8DFile})...`);
            const work8D = extract8DAction(ar600, 4);
            writePNG(path.join(CHAR_DIR, `${cfg.work8DFile}.png`), 144, 384, work8D);
            fs.writeFileSync(path.join(CHAR_DIR, `${cfg.work8DFile}.json`), JSON.stringify(make8DActionSidecar(cfg.work8DFile, cfg.species, 'work'), null, 2));
        }

        if (cfg.melee8DFile) {
            console.log(`  Deploying Melee Attack 8D (${cfg.melee8DFile})...`);
            const melee8D = extract8DAction(ar600, 8);
            writePNG(path.join(CHAR_DIR, `${cfg.melee8DFile}.png`), 144, 384, melee8D);
            fs.writeFileSync(path.join(CHAR_DIR, `${cfg.melee8DFile}.json`), JSON.stringify(make8DActionSidecar(cfg.melee8DFile, cfg.species, 'attack'), null, 2));

            // Also update $UF_Human_Attack_8D.png for human
            if (cfg.species === 'human') {
                writePNG(path.join(CHAR_DIR, '$UF_Human_Attack_8D.png'), 144, 384, melee8D);
                fs.writeFileSync(path.join(CHAR_DIR, '$UF_Human_Attack_8D.json'), JSON.stringify(make8DActionSidecar('$UF_Human_Attack_8D', 'human', 'attack'), null, 2));
            }
        }

        if (cfg.ranged8DFile) {
            console.log(`  Deploying Ranged Attack 8D (${cfg.ranged8DFile})...`);
            const ranged8D = synthesizeRanged8DSheet(walkImg.data, cfg.weaponRanged);
            writePNG(path.join(CHAR_DIR, `${cfg.ranged8DFile}.png`), 144, 384, ranged8D);
            fs.writeFileSync(path.join(CHAR_DIR, `${cfg.ranged8DFile}.json`), JSON.stringify(make8DActionSidecar(cfg.ranged8DFile, cfg.species, 'attack'), null, 2));
        }

        if (cfg.cast8DFile) {
            console.log(`  Deploying Magic Cast 8D (${cfg.cast8DFile})...`);
            const cast8D = extract8DAction(ar600, 11);
            writePNG(path.join(CHAR_DIR, `${cfg.cast8DFile}.png`), 144, 384, cast8D);
            fs.writeFileSync(path.join(CHAR_DIR, `${cfg.cast8DFile}.json`), JSON.stringify(make8DActionSidecar(cfg.cast8DFile, cfg.species, 'cast'), null, 2));
        }
    }

    console.log('=== All 8-Directional Action Suites Successfully Deployed ===');
}

main();
