#!/usr/bin/env node
'use strict';

/**
 * tools/build_all_creatures_complete_8d_actions.js
 *
 * Comprehensive generator delivering the COMPLETE 8-DIRECTIONAL ACTION SUITE
 * for EVERY CREATURE in Ultima Fortress:
 *
 * 1. Playable & Faction Humanoids:
 *    - Human (Male & Female)
 *    - Dwarf (Male & Female)
 *    - Elf (Male & Female)
 *    - Orc (Male & Female)
 *    - Goblin (Male & Female)
 *    - Gnome (Male & Female)
 *
 * 2. Wildlife & Monsters:
 *    - Boar
 *    - Wolf
 *    - Bear
 *    - Fox
 *    - Hare
 *    - Giant Spider (96x96 multi-tile)
 *    - Troll (96x96 multi-tile)
 *
 * For EVERY single creature across ALL 8 DIRECTIONS (S, SW, W, NW, N, NE, E, SE):
 * - Walk / Stand (3-frame kinematic scissor stride + passing bob)
 * - Use / Work (3-frame resource interaction, harvesting, quarrying, rooting, web-spinning)
 * - Melee Attack (3-frame windup, forward strike / slash / gore / bite arc, recovery guard)
 * - Ranged Attack (3-frame nock/aim/draw/spit/web, full draw, release & recoil)
 * - Magic Cast / Special (3-frame mana/primal gather, surge burst, discharge)
 * - Hurt (1-frame flinch & recoil)
 * - Death & Remains (3-frame stagger, collapse, resting grounded carcass/remains)
 * - Idle (2-frame breathing / alert stance)
 *
 * Output:
 * - Full 20-col x 8-row AR-600 Masters (960x384 or 1920x768) + sidecars
 * - Dedicated 3-col x 8-row 8D Action Sub-sheets (144x384 or 288x768) + sidecars
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const MASTERS_DIR = path.join(ROOT, 'art', 'masters');

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

// Essential color ramps from palette
const C_DARK_OUTLINE  = pal.snap(24, 16, 10);
const C_STEEL_WHITE   = pal.snap(255, 255, 255);
const C_STEEL_LIGHT   = pal.snap(219, 234, 254);
const C_STEEL_MID     = pal.snap(160, 180, 200);
const C_STEEL_DARK    = pal.snap(90, 110, 130);
const C_GOLD_BRIGHT   = pal.snap(250, 220, 80);
const C_GOLD_MID      = pal.snap(210, 165, 40);
const C_WOOD_SHAFT    = pal.snap(130, 85, 45);
const C_BLOOD_RED     = pal.snap(180, 25, 25);
const C_MAGIC_CYAN    = pal.snap(80, 210, 240);
const C_MAGIC_GLOW    = pal.snap(230, 250, 255);
const C_MAGIC_EMERALD = pal.snap(60, 230, 120);
const C_MAGIC_PURPLE  = pal.snap(160, 60, 220);
const C_DIRT_EARTH    = pal.snap(120, 80, 45);
const C_WEB_WHITE     = pal.snap(245, 248, 255);
const C_STONE_GREY    = pal.snap(140, 145, 150);

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

function shiftFrame(frame, dx, dy, fw = 48, fh = 48) {
    const out = Buffer.alloc(fw * fh * 4);
    for (let y = 0; y < fh; y++) {
        const ty = y + dy;
        if (ty < 0 || ty >= fh) continue;
        for (let x = 0; x < fw; x++) {
            const tx = x + dx;
            if (tx < 0 || tx >= fw) continue;
            const sIdx = (y * fw + x) * 4;
            if (frame[sIdx + 3] > 0) {
                const dIdx = (ty * fw + tx) * 4;
                out[dIdx] = frame[sIdx];
                out[dIdx + 1] = frame[sIdx + 1];
                out[dIdx + 2] = frame[sIdx + 2];
                out[dIdx + 3] = frame[sIdx + 3];
            }
        }
    }
    return out;
}

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

// ----------------------------------------------------------------------------
// Action Synthesizers
// ----------------------------------------------------------------------------

// 1. USE / WORK (Cols 4, 5, 6)
function synthesizeWork(standFrame, facing, phase, workType, fw = 48, fh = 48) {
    const out = Buffer.alloc(fw * fh * 4);
    const vec = DIR_VECTORS[facing];
    const isBeast = ['root', 'sniff', 'forage', 'dig', 'burrow', 'spin', 'quarry'].includes(workType);

    if (phase === 0) {
        // Windup / ready
        const shifted = shiftFrame(standFrame, -Math.sign(vec.dx), isBeast ? 1 : -Math.sign(vec.dy) - 1, fw, fh);
        shifted.copy(out);
    } else if (phase === 1) {
        // Active work strike / foraging dip
        const shifted = shiftFrame(standFrame, vec.dx, isBeast ? 2 : Math.min(2, vec.dy + 1), fw, fh);
        shifted.copy(out);

        const setPixel = (x, y, col) => {
            if (x >= 0 && x < fw && y >= 0 && y < fh) {
                const idx = (y * fw + x) * 4;
                out[idx] = col[0]; out[idx + 1] = col[1]; out[idx + 2] = col[2]; out[idx + 3] = 255;
            }
        };

        const cx = Math.max(2, Math.min(fw - 3, Math.round(fw / 2 + vec.dx * (fw / 10))));
        const cy = Math.max(2, Math.min(fh - 3, Math.round(fh * 0.72 + vec.dy * (fh / 12))));

        if (workType === 'spin') {
            // Web silk particles
            for (let i = -2; i <= 2; i++) {
                setPixel(cx + i, cy, C_WEB_WHITE);
                setPixel(cx, cy + i, C_WEB_WHITE);
            }
        } else if (isBeast) {
            // Earth / dirt scratch particles
            setPixel(cx, cy, C_DIRT_EARTH);
            setPixel(cx - 1, cy - 1, C_DIRT_EARTH);
            setPixel(cx + 1, cy - 1, C_DIRT_EARTH);
            setPixel(cx - vec.dx, cy - 2, C_DIRT_EARTH);
        } else {
            // Impact spark
            setPixel(cx, cy, C_STEEL_WHITE);
            setPixel(cx - 1, cy, C_GOLD_BRIGHT);
            setPixel(cx + 1, cy, C_GOLD_BRIGHT);
            setPixel(cx, cy - 1, C_GOLD_BRIGHT);
            setPixel(cx, cy + 1, C_GOLD_BRIGHT);
        }
    } else {
        // Recovery
        standFrame.copy(out);
    }

    applyDarkOutline(out, fw, fh);
    return out;
}

// 2. MELEE ATTACK (Cols 8, 9, 10)
function synthesizeMeleeAttack(standFrame, facing, phase, weaponType, fw = 48, fh = 48) {
    const out = Buffer.alloc(fw * fh * 4);
    const vec = DIR_VECTORS[facing];

    if (phase === 0) {
        // Windup lunge backwards
        const shifted = shiftFrame(standFrame, -Math.sign(vec.dx) * 2, -Math.sign(vec.dy), fw, fh);
        shifted.copy(out);
    } else if (phase === 1) {
        // Forward lunge strike
        const shifted = shiftFrame(standFrame, Math.round(vec.dx * 1.5), vec.dy, fw, fh);
        shifted.copy(out);

        const setPixel = (x, y, col) => {
            if (x >= 0 && x < fw && y >= 0 && y < fh) {
                const idx = (y * fw + x) * 4;
                out[idx] = col[0]; out[idx + 1] = col[1]; out[idx + 2] = col[2]; out[idx + 3] = 255;
            }
        };

        const ax = Math.max(3, Math.min(fw - 4, Math.round(fw / 2 + vec.dx * (fw / 9))));
        const ay = Math.max(3, Math.min(fh - 4, Math.round(fh * 0.62 + vec.dy * (fh / 11))));

        // Weapon slash or claw/bite slash trail
        const arcSize = Math.max(3, Math.round(fw / 12));
        for (let i = -arcSize; i <= arcSize; i++) {
            const px = ax + (vec.dy !== 0 ? i * 2 : 0);
            const py = ay + (vec.dx !== 0 ? i * 2 : 0);
            setPixel(px, py, (Math.abs(i) <= 1) ? C_STEEL_WHITE : C_STEEL_LIGHT);
            setPixel(px + Math.sign(vec.dx), py + Math.sign(vec.dy), C_STEEL_MID);
        }
    } else {
        // Recovery Guard
        const shifted = shiftFrame(standFrame, Math.sign(vec.dx), 0, fw, fh);
        shifted.copy(out);
    }

    applyDarkOutline(out, fw, fh);
    return out;
}

// 3. RANGED ATTACK (Bow, Crossbow, Blowgun, Web, Roar, Boulder)
function synthesizeRangedAttack(standFrame, facing, phase, weaponType, fw = 48, fh = 48) {
    const out = Buffer.alloc(fw * fh * 4);
    const vec = DIR_VECTORS[facing];

    if (phase === 0) {
        // Aim / ready
        standFrame.copy(out);
    } else if (phase === 1) {
        // Full Draw / Projectile Launch
        const shifted = shiftFrame(standFrame, Math.sign(vec.dx), 0, fw, fh);
        shifted.copy(out);

        const setPixel = (x, y, col) => {
            if (x >= 0 && x < fw && y >= 0 && y < fh) {
                const idx = (y * fw + x) * 4;
                out[idx] = col[0]; out[idx + 1] = col[1]; out[idx + 2] = col[2]; out[idx + 3] = 255;
            }
        };

        const bx = Math.max(3, Math.min(fw - 4, Math.round(fw / 2 + vec.dx * (fw / 10))));
        const by = Math.max(3, Math.min(fh - 4, Math.round(fh * 0.58 + vec.dy * (fh / 13))));

        if (weaponType === 'web') {
            // Web net strand
            for (let i = -2; i <= 2; i++) {
                setPixel(bx + i, by - i, C_WEB_WHITE);
                setPixel(bx + i, by + i, C_WEB_WHITE);
            }
        } else if (weaponType === 'boulder') {
            // Hurled boulder
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    if (Math.abs(dx) + Math.abs(dy) <= 3) {
                        setPixel(bx + dx, by + dy, (dx === 0 && dy === 0) ? C_STONE_GREY : C_DARK_OUTLINE);
                    }
                }
            }
        } else if (['roar', 'howl', 'snort', 'bark', 'thump'].includes(weaponType)) {
            // Sonic shockwave rings
            setPixel(bx, by, C_STEEL_WHITE);
            setPixel(bx + vec.dx * 2, by + vec.dy * 2, C_STEEL_LIGHT);
            setPixel(bx + vec.dx * 3, by + vec.dy * 3, C_STEEL_MID);
        } else {
            // Arrow / bolt / blowgun dart tip
            setPixel(bx, by, C_STEEL_WHITE);
            setPixel(bx - Math.sign(vec.dx), by - Math.sign(vec.dy), C_WOOD_SHAFT);
            setPixel(bx - Math.sign(vec.dx) * 2, by - Math.sign(vec.dy) * 2, C_WOOD_SHAFT);
        }
    } else {
        // Release recoil shift backwards
        const shifted = shiftFrame(standFrame, -Math.sign(vec.dx), 0, fw, fh);
        shifted.copy(out);
    }

    applyDarkOutline(out, fw, fh);
    return out;
}

// 4. MAGIC CAST (Cols 11, 12, 13)
function synthesizeMagicCast(standFrame, facing, phase, magicType, fw = 48, fh = 48) {
    const out = Buffer.alloc(fw * fh * 4);
    const vec = DIR_VECTORS[facing];
    standFrame.copy(out);

    let auraColor = C_MAGIC_CYAN;
    if (['sylvan', 'nature'].includes(magicType)) auraColor = C_MAGIC_EMERALD;
    else if (['rune', 'gold'].includes(magicType)) auraColor = C_GOLD_BRIGHT;
    else if (['blood', 'primal', 'frenzy'].includes(magicType)) auraColor = C_BLOOD_RED;
    else if (['hex', 'spirit', 'venom'].includes(magicType)) auraColor = C_MAGIC_PURPLE;

    const setPixel = (x, y, col) => {
        if (x >= 0 && x < fw && y >= 0 && y < fh) {
            const idx = (y * fw + x) * 4;
            out[idx] = col[0]; out[idx + 1] = col[1]; out[idx + 2] = col[2]; out[idx + 3] = 255;
        }
    };

    const cx = Math.max(3, Math.min(fw - 4, Math.round(fw / 2 + vec.dx * (fw / 12))));
    const cy = Math.max(3, Math.min(fh - 4, Math.round(fh * 0.54 + vec.dy * (fh / 14))));

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
        setPixel(cx + vec.dx * 3, cy + vec.dy * 3, C_MAGIC_GLOW);
        setPixel(cx + vec.dx * 4, cy + vec.dy * 4, auraColor);
    } else {
        // Residual Channel Sparks
        setPixel(cx - 1, cy - 2, auraColor);
        setPixel(cx + 2, cy - 1, C_MAGIC_GLOW);
        setPixel(cx - 2, cy + 1, auraColor);
    }

    applyDarkOutline(out, fw, fh);
    return out;
}

// 5. HURT (Col 14)
function synthesizeHurt(standFrame, facing, fw = 48, fh = 48) {
    const out = Buffer.alloc(fw * fh * 4);
    const vec = DIR_VECTORS[facing];

    // Recoil backwards away from damage
    const shifted = shiftFrame(standFrame, -Math.sign(vec.dx) * 2, -1, fw, fh);
    shifted.copy(out);

    // Subtle blood flash on impact area
    const startY = Math.round(fh * 0.45), endY = Math.round(fh * 0.68);
    const startX = Math.round(fw * 0.38), endX = Math.round(fw * 0.62);
    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            const idx = (y * fw + x) * 4;
            if (out[idx + 3] > 0 && (x + y) % 4 === 0) {
                out[idx] = C_BLOOD_RED[0]; out[idx + 1] = C_BLOOD_RED[1]; out[idx + 2] = C_BLOOD_RED[2];
            }
        }
    }

    applyDarkOutline(out, fw, fh);
    return out;
}

// 6. DEATH & REMAINS (Cols 15, 16, 17)
function synthesizeDeath(standFrame, facing, phase, fw = 48, fh = 48) {
    const out = Buffer.alloc(fw * fh * 4);

    if (phase === 0) {
        // Stagger: body thrown back
        const stagger = shiftFrame(standFrame, (facing.includes('W') ? 2 : (facing.includes('E') ? -2 : 0)), 2, fw, fh);
        stagger.copy(out);
    } else if (phase === 1) {
        // Kneeling Collapse
        for (let y = 0; y < fh; y++) {
            const prog = y / (fh - 1);
            const ty = Math.min(fh - 1, Math.round(fh * 0.55 + prog * (fh * 0.44)));
            for (let x = 0; x < fw; x++) {
                const sIdx = (y * fw + x) * 4;
                if (standFrame[sIdx + 3] > 0) {
                    const dIdx = (ty * fw + x) * 4;
                    out[dIdx] = standFrame[sIdx];
                    out[dIdx + 1] = standFrame[sIdx + 1];
                    out[dIdx + 2] = standFrame[sIdx + 2];
                    out[dIdx + 3] = 255;
                }
            }
        }
    } else {
        // Resting Fallen Remains: grounded on bottom rows
        const baseRow = Math.round(fh * 0.85);
        for (let y = Math.round(fh * 0.28); y < fh; y++) {
            const ty = Math.min(fh - 1, Math.round(baseRow + (y - fh * 0.28) * (6 / (fh * 0.7))));
            const tx = Math.min(fw - 1, Math.max(0, Math.round(fw / 2 + (y - fh * 0.6) * 0.5)));
            for (let x = Math.round(fw * 0.28); x <= Math.round(fw * 0.72); x++) {
                const sIdx = (y * fw + x) * 4;
                if (standFrame[sIdx + 3] > 0) {
                    const dIdx = (ty * fw + tx) * 4;
                    out[dIdx] = standFrame[sIdx];
                    out[dIdx + 1] = standFrame[sIdx + 1];
                    out[dIdx + 2] = standFrame[sIdx + 2];
                    out[dIdx + 3] = 255;
                }
            }
        }
    }

    applyDarkOutline(out, fw, fh);
    return out;
}

// 7. IDLE (Cols 18, 19)
function synthesizeIdle(standFrame, phase, fw = 48, fh = 48) {
    if (phase === 0) return Buffer.from(standFrame);
    const out = Buffer.alloc(fw * fh * 4);
    // 1px chest lift during deep breath
    const topChest = Math.round(fh * 0.28), botChest = Math.round(fh * 0.72);
    for (let y = 0; y < fh; y++) {
        const ty = (y >= topChest && y <= botChest) ? (y - 1) : y;
        for (let x = 0; x < fw; x++) {
            const sIdx = (y * fw + x) * 4;
            if (standFrame[sIdx + 3] > 0) {
                const dIdx = (ty * fw + x) * 4;
                out[dIdx] = standFrame[sIdx];
                out[dIdx + 1] = standFrame[sIdx + 1];
                out[dIdx + 2] = standFrame[sIdx + 2];
                out[dIdx + 3] = 255;
            }
        }
    }
    applyDarkOutline(out, fw, fh);
    return out;
}

// ----------------------------------------------------------------------------
// AR-600 Assembly
// ----------------------------------------------------------------------------
const FACINGS = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'];

function assembleAR600(walk8D, weaponMelee, weaponRanged, magicType, workType, fw = 48, fh = 48) {
    const sheetW = fw * 20;
    const sheetH = fh * 8;
    const ar600 = Buffer.alloc(sheetW * sheetH * 4);

    function setCell(c, r, frame) {
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const sIdx = (y * fw + x) * 4;
                if (frame[sIdx + 3] > 0) {
                    const dIdx = (((r * fh + y) * sheetW) + (c * fw + x)) * 4;
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
        const getWalkFrame = (col) => {
            const f = Buffer.alloc(fw * fh * 4);
            for (let y = 0; y < fh; y++) {
                for (let x = 0; x < fw; x++) {
                    const sIdx = (((r * fh + y) * (fw * 3)) + (col * fw + x)) * 4;
                    const dIdx = (y * fw + x) * 4;
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
        setCell(4, r, synthesizeWork(stand, facing, 0, workType, fw, fh));
        setCell(5, r, synthesizeWork(stand, facing, 1, workType, fw, fh));
        setCell(6, r, synthesizeWork(stand, facing, 2, workType, fw, fh));

        // Col 7: Stand placeholder (V89 carry column)
        setCell(7, r, stand);

        // Cols 8, 9, 10: Melee Attack
        setCell(8, r, synthesizeMeleeAttack(stand, facing, 0, weaponMelee, fw, fh));
        setCell(9, r, synthesizeMeleeAttack(stand, facing, 1, weaponMelee, fw, fh));
        setCell(10, r, synthesizeMeleeAttack(stand, facing, 2, weaponMelee, fw, fh));

        // Cols 11, 12, 13: Magic Cast
        setCell(11, r, synthesizeMagicCast(stand, facing, 0, magicType, fw, fh));
        setCell(12, r, synthesizeMagicCast(stand, facing, 1, magicType, fw, fh));
        setCell(13, r, synthesizeMagicCast(stand, facing, 2, magicType, fw, fh));

        // Col 14: Hurt
        setCell(14, r, synthesizeHurt(stand, facing, fw, fh));

        // Cols 15, 16, 17: Death & Remains
        setCell(15, r, synthesizeDeath(stand, facing, 0, fw, fh));
        setCell(16, r, synthesizeDeath(stand, facing, 1, fw, fh));
        setCell(17, r, synthesizeDeath(stand, facing, 2, fw, fh));

        // Cols 18, 19: Idle
        setCell(18, r, synthesizeIdle(stand, 0, fw, fh));
        setCell(19, r, synthesizeIdle(stand, 1, fw, fh));
    }

    quantizeSheet(ar600, sheetW, sheetH, 31);
    return ar600;
}

function extract8DAction(ar600, startCol, fw = 48, fh = 48) {
    const subW = fw * 3;
    const subH = fh * 8;
    const arW = fw * 20;
    const out = Buffer.alloc(subW * subH * 4);
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 3; c++) {
            const arCol = startCol + c;
            for (let y = 0; y < fh; y++) {
                for (let x = 0; x < fw; x++) {
                    const sIdx = (((r * fh + y) * arW) + (arCol * fw + x)) * 4;
                    const dIdx = (((r * fh + y) * subW) + (c * fw + x)) * 4;
                    out[dIdx] = ar600[sIdx];
                    out[dIdx + 1] = ar600[sIdx + 1];
                    out[dIdx + 2] = ar600[sIdx + 2];
                    out[dIdx + 3] = ar600[sIdx + 3];
                }
            }
        }
    }
    quantizeSheet(out, subW, subH, 31);
    return out;
}

function synthesizeRanged8DSheet(walk8D, weaponType, fw = 48, fh = 48) {
    const subW = fw * 3;
    const subH = fh * 8;
    const out = Buffer.alloc(subW * subH * 4);
    for (let r = 0; r < 8; r++) {
        const facing = FACINGS[r];
        const stand = Buffer.alloc(fw * fh * 4);
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const sIdx = (((r * fh + y) * subW) + (fw + x)) * 4;
                const dIdx = (y * fw + x) * 4;
                stand[dIdx] = walk8D[sIdx];
                stand[dIdx + 1] = walk8D[sIdx + 1];
                stand[dIdx + 2] = walk8D[sIdx + 2];
                stand[dIdx + 3] = walk8D[sIdx + 3];
            }
        }

        const f0 = synthesizeRangedAttack(stand, facing, 0, weaponType, fw, fh);
        const f1 = synthesizeRangedAttack(stand, facing, 1, weaponType, fw, fh);
        const f2 = synthesizeRangedAttack(stand, facing, 2, weaponType, fw, fh);
        const frames = [f0, f1, f2];

        for (let c = 0; c < 3; c++) {
            const frame = frames[c];
            for (let y = 0; y < fh; y++) {
                for (let x = 0; x < fw; x++) {
                    const sIdx = (y * fw + x) * 4;
                    const dIdx = (((r * fh + y) * subW) + (c * fw + x)) * 4;
                    out[dIdx] = frame[sIdx];
                    out[dIdx + 1] = frame[sIdx + 1];
                    out[dIdx + 2] = frame[sIdx + 2];
                    out[dIdx + 3] = frame[sIdx + 3];
                }
            }
        }
    }
    quantizeSheet(out, subW, subH, 31);
    return out;
}

function makeSidecar(id, species, gender, category, fw, fh, footprint, actionName) {
    const sc = {
        id,
        species,
        frameWidth: fw,
        frameHeight: fh,
        anchor: [Math.floor(fw / 2), fh - 1],
        footprint: footprint || [1, 1],
        facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"],
        frameMs: 150
    };
    if (gender) sc.gender = gender;
    if (category) sc.category = category;

    if (!actionName || actionName === 'ar600') {
        sc.animations = {
            stand: [0],
            walk: [1, 2, 3, 2],
            work: [4, 5, 6],
            attack: [8, 9, 10],
            cast: [11, 12, 13],
            hurt: [14],
            death: [15, 16, 17],
            idle: [18, 19, 18, 0]
        };
    } else {
        sc.animations = {
            [actionName]: [0, 1, 2]
        };
    }
    return sc;
}

// ----------------------------------------------------------------------------
// Full Registry of All Creatures (12 Humanoids + 7 Wildlife/Monsters)
// ----------------------------------------------------------------------------
const CREATURES = [
    // 1. Human Male
    {
        name: 'Human Male', species: 'human', gender: 'male', category: 'colonist',
        walk8D: '$UF_Human_Male_8D.png', fw: 48, fh: 48, footprint: [1, 1],
        melee: 'sword', ranged: 'bow', magic: 'arcane', work: 'mine',
        ar600File: '$UF_Human_Male_AR600', masterFile: 'human_male',
        workFiles: ['$UF_Human_Work_8D', '$UF_Human_Male_Work_8D'],
        meleeFiles: ['$UF_Human_Attack_Sword_8D', '$UF_Human_Male_Attack_8D', '$UF_Human_Attack_8D'],
        rangedFiles: ['$UF_Human_Attack_Bow_8D', '$UF_Human_Male_Bow_8D'],
        castFiles: ['$UF_Human_Cast_8D', '$UF_Human_Male_Cast_8D']
    },
    // 2. Human Female
    {
        name: 'Human Female', species: 'human', gender: 'female', category: 'colonist',
        walk8D: '$UF_Human_Female_8D.png', fw: 48, fh: 48, footprint: [1, 1],
        melee: 'sword', ranged: 'bow', magic: 'arcane', work: 'forage',
        ar600File: '$UF_Human_Female_AR600', masterFile: 'human_female',
        workFiles: ['$UF_Human_Female_Work_8D'],
        meleeFiles: ['$UF_Human_Female_Attack_8D'],
        rangedFiles: ['$UF_Human_Female_Bow_8D'],
        castFiles: ['$UF_Human_Female_Cast_8D']
    },
    // 3. Dwarf Male
    {
        name: 'Dwarf Male', species: 'dwarf', gender: 'male', category: 'colonist',
        walk8D: '$UF_Dwarf_Male_8D.png', fw: 48, fh: 48, footprint: [1, 1],
        melee: 'axe', ranged: 'crossbow', magic: 'rune', work: 'mine',
        ar600File: '$UF_Dwarf_Male_AR600', masterFile: 'dwarf_male',
        workFiles: ['$UF_Dwarf_Work_8D', '$UF_Dwarf_Male_Work_8D'],
        meleeFiles: ['$UF_Dwarf_Attack_Axe_8D', '$UF_Dwarf_Male_Attack_8D', '$UF_Dwarf_Attack_8D'],
        rangedFiles: ['$UF_Dwarf_Attack_Crossbow_8D', '$UF_Dwarf_Male_Crossbow_8D'],
        castFiles: ['$UF_Dwarf_Cast_Hammer_8D', '$UF_Dwarf_Male_Cast_8D']
    },
    // 4. Dwarf Female
    {
        name: 'Dwarf Female', species: 'dwarf', gender: 'female', category: 'colonist',
        walk8D: '$UF_Dwarf_Female_8D.png', fw: 48, fh: 48, footprint: [1, 1],
        melee: 'axe', ranged: 'crossbow', magic: 'rune', work: 'craft',
        ar600File: '$UF_Dwarf_Female_AR600', masterFile: 'dwarf_female',
        workFiles: ['$UF_Dwarf_Female_Work_8D'],
        meleeFiles: ['$UF_Dwarf_Female_Attack_8D'],
        rangedFiles: ['$UF_Dwarf_Female_Crossbow_8D'],
        castFiles: ['$UF_Dwarf_Female_Cast_8D']
    },
    // 5. Elf Male
    {
        name: 'Elf Male', species: 'elf', gender: 'male', category: 'colonist',
        walk8D: '$UF_Elf_Male_8D.png', fw: 48, fh: 48, footprint: [1, 1],
        melee: 'sword', ranged: 'bow', magic: 'sylvan', work: 'forage',
        ar600File: '$UF_Elf_Male_AR600', masterFile: 'elf_male',
        workFiles: ['$UF_Elf_Work_8D', '$UF_Elf_Male_Work_8D'],
        meleeFiles: ['$UF_Elf_Attack_Sword_8D', '$UF_Elf_Male_Attack_8D', '$UF_Elf_Attack_8D'],
        rangedFiles: ['$UF_Elf_Attack_Bow_8D', '$UF_Elf_Male_Bow_8D'],
        castFiles: ['$UF_Elf_Cast_Staff_8D', '$UF_Elf_Male_Cast_8D']
    },
    // 6. Elf Female
    {
        name: 'Elf Female', species: 'elf', gender: 'female', category: 'colonist',
        walk8D: '$UF_Elf_Female_8D.png', fw: 48, fh: 48, footprint: [1, 1],
        melee: 'sword', ranged: 'bow', magic: 'sylvan', work: 'forage',
        ar600File: '$UF_Elf_Female_AR600', masterFile: 'elf_female',
        workFiles: ['$UF_Elf_Female_Work_8D'],
        meleeFiles: ['$UF_Elf_Female_Attack_8D'],
        rangedFiles: ['$UF_Elf_Female_Bow_8D'],
        castFiles: ['$UF_Elf_Female_Cast_8D']
    },
    // 7. Orc Male
    {
        name: 'Orc Male', species: 'orc', gender: 'male', category: 'colonist',
        walk8D: '$UF_Orc_Male_8D.png', fw: 48, fh: 48, footprint: [1, 1],
        melee: 'cleaver', ranged: 'bow', magic: 'blood', work: 'chop',
        ar600File: '$UF_Orc_Male_AR600', masterFile: 'orc_male',
        workFiles: ['$UF_Orc_Work_8D', '$UF_Orc_Male_Work_8D'],
        meleeFiles: ['$UF_Orc_Attack_Cleaver_8D', '$UF_Orc_Attack_8D'],
        rangedFiles: ['$UF_Orc_Attack_Bow_8D'],
        castFiles: ['$UF_Orc_Cast_Totem_8D']
    },
    // 8. Orc Female
    {
        name: 'Orc Female', species: 'orc', gender: 'female', category: 'colonist',
        walk8D: '$UF_Orc_Female_8D.png', fw: 48, fh: 48, footprint: [1, 1],
        melee: 'cleaver', ranged: 'bow', magic: 'blood', work: 'craft',
        ar600File: '$UF_Orc_Female_AR600', masterFile: 'orc_female',
        workFiles: ['$UF_Orc_Female_Work_8D'],
        meleeFiles: ['$UF_Orc_Female_Attack_8D'],
        rangedFiles: ['$UF_Orc_Female_Bow_8D'],
        castFiles: ['$UF_Orc_Female_Cast_8D']
    },
    // 9. Goblin Male
    {
        name: 'Goblin Male', species: 'goblin', gender: 'male', category: 'colonist',
        walk8D: '$UF_Goblin_Male_8D.png', fw: 48, fh: 48, footprint: [1, 1],
        melee: 'shiv', ranged: 'blowgun', magic: 'hex', work: 'forage',
        ar600File: '$UF_Goblin_Male_AR600', masterFile: 'goblin_male',
        workFiles: ['$UF_Goblin_Work_8D', '$UF_Goblin_Male_Work_8D'],
        meleeFiles: ['$UF_Goblin_Attack_Shiv_8D', '$UF_Goblin_Attack_8D'],
        rangedFiles: ['$UF_Goblin_Attack_Blowgun_8D'],
        castFiles: ['$UF_Goblin_Cast_Hex_8D']
    },
    // 10. Goblin Female
    {
        name: 'Goblin Female', species: 'goblin', gender: 'female', category: 'colonist',
        walk8D: '$UF_Goblin_Female_8D.png', fw: 48, fh: 48, footprint: [1, 1],
        melee: 'shiv', ranged: 'blowgun', magic: 'hex', work: 'forage',
        ar600File: '$UF_Goblin_Female_AR600', masterFile: 'goblin_female',
        workFiles: ['$UF_Goblin_Female_Work_8D'],
        meleeFiles: ['$UF_Goblin_Female_Attack_8D'],
        rangedFiles: ['$UF_Goblin_Female_Blowgun_8D'],
        castFiles: ['$UF_Goblin_Female_Cast_8D']
    },
    // 11. Gnome Male
    {
        name: 'Gnome Male', species: 'gnome', gender: 'male', category: 'colonist',
        walk8D: '$UF_Gnome_Male_8D.png', fw: 48, fh: 48, footprint: [1, 1],
        melee: 'wrench', ranged: 'crossbow', magic: 'aether', work: 'craft',
        ar600File: '$UF_Gnome_Male_AR600', masterFile: 'gnome_male',
        workFiles: ['$UF_Gnome_Work_8D', '$UF_Gnome_Male_Work_8D'],
        meleeFiles: ['$UF_Gnome_Attack_Wrench_8D', '$UF_Gnome_Attack_8D'],
        rangedFiles: ['$UF_Gnome_Attack_Crossbow_8D'],
        castFiles: ['$UF_Gnome_Cast_Aether_8D']
    },
    // 12. Gnome Female
    {
        name: 'Gnome Female', species: 'gnome', gender: 'female', category: 'colonist',
        walk8D: '$UF_Gnome_Female_8D.png', fw: 48, fh: 48, footprint: [1, 1],
        melee: 'wrench', ranged: 'crossbow', magic: 'aether', work: 'craft',
        ar600File: '$UF_Gnome_Female_AR600', masterFile: 'gnome_female',
        workFiles: ['$UF_Gnome_Female_Work_8D'],
        meleeFiles: ['$UF_Gnome_Female_Attack_8D'],
        rangedFiles: ['$UF_Gnome_Female_Crossbow_8D'],
        castFiles: ['$UF_Gnome_Female_Cast_8D']
    },
    // 13. Boar
    {
        name: 'Boar', species: 'boar', category: 'wildlife',
        walk8D: '$UF_Boar_8D.png', fw: 48, fh: 48, footprint: [1, 1],
        melee: 'gore', ranged: 'snort', magic: 'primal', work: 'root',
        ar600File: '$UF_Boar_AR600', masterFile: 'boar_master_8way',
        workFiles: ['$UF_Boar_Work_8D'],
        meleeFiles: ['$UF_Boar_Attack_8D'],
        rangedFiles: ['$UF_Boar_Ranged_8D'],
        castFiles: ['$UF_Boar_Cast_8D']
    },
    // 14. Wolf
    {
        name: 'Wolf', species: 'wolf', category: 'wildlife',
        walk8D: '$UF_Wolf_8D.png', fw: 48, fh: 48, footprint: [1, 1],
        melee: 'bite', ranged: 'howl', magic: 'pack', work: 'sniff',
        ar600File: '$UF_Wolf_AR600', masterFile: 'wolf_master_8way',
        workFiles: ['$UF_Wolf_Work_8D'],
        meleeFiles: ['$UF_Wolf_Attack_8D'],
        rangedFiles: ['$UF_Wolf_Ranged_8D'],
        castFiles: ['$UF_Wolf_Cast_8D']
    },
    // 15. Bear
    {
        name: 'Bear', species: 'bear', category: 'wildlife',
        walk8D: '$UF_Bear_8D.png', fw: 48, fh: 48, footprint: [1, 1],
        melee: 'maul', ranged: 'slam', magic: 'roar', work: 'forage',
        ar600File: '$UF_Bear_AR600', masterFile: 'bear_master_8way',
        workFiles: ['$UF_Bear_Work_8D'],
        meleeFiles: ['$UF_Bear_Attack_8D'],
        rangedFiles: ['$UF_Bear_Ranged_8D'],
        castFiles: ['$UF_Bear_Cast_8D']
    },
    // 16. Fox
    {
        name: 'Fox', species: 'fox', category: 'wildlife',
        walk8D: '$UF_Fox_8D.png', fw: 48, fh: 48, footprint: [1, 1],
        melee: 'nip', ranged: 'bark', magic: 'spirit', work: 'dig',
        ar600File: '$UF_Fox_AR600', masterFile: 'fox_master_8way',
        workFiles: ['$UF_Fox_Work_8D'],
        meleeFiles: ['$UF_Fox_Attack_8D'],
        rangedFiles: ['$UF_Fox_Ranged_8D'],
        castFiles: ['$UF_Fox_Cast_8D']
    },
    // 17. Hare
    {
        name: 'Hare', species: 'hare', category: 'wildlife',
        walk8D: '$UF_Hare_8D.png', fw: 48, fh: 48, footprint: [1, 1],
        melee: 'kick', ranged: 'thump', magic: 'dash', work: 'burrow',
        ar600File: '$UF_Hare_AR600', masterFile: 'hare_master_8way',
        workFiles: ['$UF_Hare_Work_8D'],
        meleeFiles: ['$UF_Hare_Attack_8D'],
        rangedFiles: ['$UF_Hare_Ranged_8D'],
        castFiles: ['$UF_Hare_Cast_8D']
    },
    // 18. Giant Spider (96x96 multi-tile)
    {
        name: 'Giant Spider', species: 'giant_spider', category: 'wildlife',
        walk8D: '$UF_GiantSpider_8D.png', fw: 96, fh: 96, footprint: [2, 2],
        melee: 'bite', ranged: 'web', magic: 'venom', work: 'spin',
        ar600File: '$UF_GiantSpider_AR600', masterFile: 'giant_spider_master_8way',
        workFiles: ['$UF_GiantSpider_Work_8D'],
        meleeFiles: ['$UF_GiantSpider_Attack_8D'],
        rangedFiles: ['$UF_GiantSpider_Ranged_8D'],
        castFiles: ['$UF_GiantSpider_Cast_8D']
    },
    // 19. Troll (96x96 multi-tile)
    {
        name: 'Troll', species: 'troll', category: 'wildlife',
        walk8D: '$UF_Troll_8D.png', fw: 96, fh: 96, footprint: [2, 2],
        melee: 'crush', ranged: 'boulder', magic: 'tremor', work: 'quarry',
        ar600File: '$UF_Troll_AR600', masterFile: 'troll_master_8way',
        workFiles: ['$UF_Troll_Work_8D'],
        meleeFiles: ['$UF_Troll_Attack_8D'],
        rangedFiles: ['$UF_Troll_Ranged_8D'],
        castFiles: ['$UF_Troll_Cast_8D']
    }
];

function main() {
    console.log('=== Building Complete 8-Directional Action Suites for ALL 19 Creatures ===');

    for (const c of CREATURES) {
        console.log(`\nProcessing ${c.name}...`);
        const walkPath = path.join(CHAR_DIR, c.walk8D);
        if (!fs.existsSync(walkPath)) {
            console.error(`  Missing walk sheet: ${walkPath}`);
            continue;
        }

        const walkImg = decodePNG(fs.readFileSync(walkPath));
        const fw = c.fw, fh = c.fh;

        // 1. Full AR-600 Master (20 cols x 8 rows)
        console.log(`  Assembling AR-600 Master (${c.ar600File})...`);
        const ar600 = assembleAR600(walkImg.data, c.melee, c.ranged, c.magic, c.work, fw, fh);
        const sheetW = fw * 20, sheetH = fh * 8;

        // Deploy AR-600 to characters
        writePNG(path.join(CHAR_DIR, `${c.ar600File}.png`), sheetW, sheetH, ar600);
        fs.writeFileSync(
            path.join(CHAR_DIR, `${c.ar600File}.json`),
            JSON.stringify(makeSidecar(c.ar600File, c.species, c.gender, c.category, fw, fh, c.footprint, 'ar600'), null, 2)
        );

        // Deploy AR-600 to art/masters
        if (c.masterFile) {
            writePNG(path.join(MASTERS_DIR, `${c.masterFile}.png`), sheetW, sheetH, ar600);
            fs.writeFileSync(
                path.join(MASTERS_DIR, `${c.masterFile}.json`),
                JSON.stringify(makeSidecar(c.masterFile, c.species, c.gender, c.category, fw, fh, c.footprint, 'ar600'), null, 2)
            );
        }

        const subW = fw * 3, subH = fh * 8;

        // 2. Deploy Work 8D sub-sheets
        if (c.workFiles && c.workFiles.length > 0) {
            console.log(`  Extracting Work 8D (${c.workFiles[0]})...`);
            const work8D = extract8DAction(ar600, 4, fw, fh);
            for (const wf of c.workFiles) {
                writePNG(path.join(CHAR_DIR, `${wf}.png`), subW, subH, work8D);
                fs.writeFileSync(
                    path.join(CHAR_DIR, `${wf}.json`),
                    JSON.stringify(makeSidecar(wf, c.species, c.gender, c.category, fw, fh, c.footprint, 'work'), null, 2)
                );
            }
        }

        // 3. Deploy Melee Attack 8D sub-sheets
        if (c.meleeFiles && c.meleeFiles.length > 0) {
            console.log(`  Extracting Melee Attack 8D (${c.meleeFiles[0]})...`);
            const melee8D = extract8DAction(ar600, 8, fw, fh);
            for (const mf of c.meleeFiles) {
                writePNG(path.join(CHAR_DIR, `${mf}.png`), subW, subH, melee8D);
                fs.writeFileSync(
                    path.join(CHAR_DIR, `${mf}.json`),
                    JSON.stringify(makeSidecar(mf, c.species, c.gender, c.category, fw, fh, c.footprint, 'attack'), null, 2)
                );
            }
        }

        // 4. Deploy Ranged Attack 8D sub-sheets
        if (c.rangedFiles && c.rangedFiles.length > 0) {
            console.log(`  Synthesizing Ranged Attack 8D (${c.rangedFiles[0]})...`);
            const ranged8D = synthesizeRanged8DSheet(walkImg.data, c.ranged, fw, fh);
            for (const rf of c.rangedFiles) {
                writePNG(path.join(CHAR_DIR, `${rf}.png`), subW, subH, ranged8D);
                fs.writeFileSync(
                    path.join(CHAR_DIR, `${rf}.json`),
                    JSON.stringify(makeSidecar(rf, c.species, c.gender, c.category, fw, fh, c.footprint, 'attack'), null, 2)
                );
            }
        }

        // 5. Deploy Magic Cast 8D sub-sheets
        if (c.castFiles && c.castFiles.length > 0) {
            console.log(`  Extracting Magic Cast 8D (${c.castFiles[0]})...`);
            const cast8D = extract8DAction(ar600, 11, fw, fh);
            for (const cf of c.castFiles) {
                writePNG(path.join(CHAR_DIR, `${cf}.png`), subW, subH, cast8D);
                fs.writeFileSync(
                    path.join(CHAR_DIR, `${cf}.json`),
                    JSON.stringify(makeSidecar(cf, c.species, c.gender, c.category, fw, fh, c.footprint, 'cast'), null, 2)
                );
            }
        }
    }

    console.log('\n=== All 19 Creatures Successfully Processed and Deployed ===');
}

main();

