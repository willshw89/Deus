'use strict';

/**
 * tools/build_perfect_male_human.js
 *
 * UNIFORM SCALE BUILDER for Adult Male Human (Serious Chibi ~3.1 heads, 46px standing height)
 * across ALL 7 ACTION SUITES:
 * 1. Walk   (12 sprites: 3 Down, 3 Left, 3 Right, 3 Up) - Master reference sheet
 * 2. Haul   (12 sprites) - Dedicated burlap sack carrying cycle held in front of chest
 * 3. Attack (12 sprites) - Melee broadsword strike with heroic lunge & sweeping slash arc
 * 4. Bow    (12 sprites) - Archery aim, draw, and string pluck recoil (ZERO flying arrows!)
 * 5. Magic  (12 sprites) - Spell initiation incantation chant posture & soft palm aura (ZERO flying beams!)
 * 6. Work   (12 sprites) - Reach, kneeling craftsman (~30px height), ground hammer strike
 * 7. Downed (12 sprites) - Hurt flinch recoil, kneeling collapse (~28px), flat horizontal prone corpse
 *
 * Standards:
 * - 1-Tile Height: Grounded strictly at native baseline y = 47 in 48x48 px cells.
 * - Serious Chibi Aesthetic (VISION V116): ~3.07 heads tall, narrow determined gaze, functional gear.
 * - 16-bit SNES / FF5 color palette snapped to art/palette/uf.hex (<= 31 opaque colors).
 * - Selective dark ink outline (#1c120a).
 * - Output to game/img/characters/$UF_Human_Male_*.png and .json sidecars.
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'raw');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');
const BRAIN_DIR = 'C:/Users/snewt/.gemini/antigravity/brain/e6a9a54f-2cc6-432e-b7ec-5affda42dd85';
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// --- 1. Palette Management (CIELAB) ---
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

// Canonical Palette Colors
const C_DARK_OUTLINE = pal.snap(24, 16, 10);     // Deep contour shadow #1c120a
const C_SKIN_BASE    = pal.snap(238, 195, 154);   // Male skin tone
const C_SKIN_SHADE   = pal.snap(198, 142, 117);   // Skin shadow
const C_HAIR_BASE    = pal.snap(107, 68, 35);     // Chestnut brown hair
const C_HAIR_HI      = pal.snap(150, 100, 55);    // Hair highlight
const C_LINEN_BASE   = pal.snap(210, 190, 165);   // Frontier linen tunic
const C_LINEN_SHADE  = pal.snap(165, 145, 120);   // Tunic fold shadow
const C_LEATHER_BASE = pal.snap(115, 68, 25);     // Belt & doublet leather
const C_LEATHER_DARK = pal.snap(75, 45, 18);      // Leather shadow
const C_PANTS_BASE   = pal.snap(61, 45, 36);      // Rugged trousers
const C_BOOTS_BASE   = pal.snap(45, 28, 8);       // Cuffed boot leather
const C_BOOTS_HI     = pal.snap(75, 48, 20);      // Boot highlight
const C_BUCKLE_GOLD  = pal.snap(240, 200, 80);    // Brass buckle

// Combat & Magic Accents
const C_STEEL_WHITE  = pal.snap(255, 255, 255);   // Blade glint
const C_STEEL_LIGHT  = pal.snap(219, 234, 254);   // Blade bright
const C_STEEL_MID    = pal.snap(170, 185, 200);   // Blade steel
const C_STEEL_DARK   = pal.snap(95, 110, 125);    // Blade edge
const C_SLASH_ARC    = pal.snap(245, 250, 255);   // Crescent slash sweep
const C_SLASH_GLOW   = pal.snap(140, 195, 255);   // Crescent slash luminous aura
const C_BOW_WOOD     = pal.snap(140, 88, 38);     // Yew recurve bow wood
const C_BOW_WOOD_SH  = pal.snap(95, 58, 22);      // Bow shadow
const C_BOW_STRING   = pal.snap(230, 230, 235);   // Bowstring
const C_MANA_AURA    = pal.snap(90, 215, 255);    // Soft palm magic aura
const C_MANA_CORE    = pal.snap(225, 250, 255);   // Mana radiance core
const C_SACK_BASE    = pal.snap(180, 140, 95);    // Heavy burlap sack
const C_SACK_SHADE   = pal.snap(135, 95, 55);     // Burlap weave shadow
const C_SACK_ROPE    = pal.snap(220, 190, 135);   // Sack tie rope
const C_TOOL_IRON    = pal.snap(140, 145, 155);   // Hammer head iron
const C_TOOL_WOOD    = pal.snap(120, 75, 32);     // Hammer haft wood
const C_BLOOD_RED    = pal.snap(180, 25, 25);     // Flinch blood flash

// --- 2. Frame Utilities ---
function isMagenta(r, g, b) {
    if (r > 165 && g < 85 && b > 165) return true;
    if (r > 80 && b > 70 && g < 65 && Math.abs(r - b) < 45) return true;
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
                const r = buf[idx], g = buf[idx + 1], b = buf[idx + 2];
                // Don't overwrite luminous blade sparks or soft mana glows
                const isGlow = (r > 200 && g > 220 && b > 240) || (r > 80 && g > 185 && b > 225);
                if (!isGlow) {
                    buf[idx]     = C_DARK_OUTLINE[0];
                    buf[idx + 1] = C_DARK_OUTLINE[1];
                    buf[idx + 2] = C_DARK_OUTLINE[2];
                }
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
                out[dIdx]     = frame[sIdx];
                out[dIdx + 1] = frame[sIdx + 1];
                out[dIdx + 2] = frame[sIdx + 2];
                out[dIdx + 3] = frame[sIdx + 3];
            }
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

// Extract a 48x48 frame from a raw 192x192 cell downscaled 4x
function extractRawFrame4x(rawImg, cellCol, cellRow) {
    const out = Buffer.alloc(48 * 48 * 4);
    const startX = cellCol * 192;
    const startY = cellRow * 192;

    for (let dy = 0; dy < 48; dy++) {
        for (let dx = 0; dx < 48; dx++) {
            let sumR = 0, sumG = 0, sumB = 0, count = 0;
            for (let sy = 0; sy < 4; sy++) {
                for (let sx = 0; sx < 4; sx++) {
                    const rx = startX + dx * 4 + sx;
                    const ry = startY + dy * 4 + sy;
                    if (rx >= rawImg.width || ry >= rawImg.height) continue;
                    const idx = (ry * rawImg.width + rx) * 4;
                    const a = rawImg.data[idx + 3];
                    const r = rawImg.data[idx], g = rawImg.data[idx + 1], b = rawImg.data[idx + 2];
                    if (a > 100 && !isMagenta(r, g, b)) {
                        sumR += r; sumG += g; sumB += b;
                        count++;
                    }
                }
            }
            if (count >= 4) {
                const avgR = Math.round(sumR / count);
                const avgG = Math.round(sumG / count);
                const avgB = Math.round(sumB / count);
                const snapped = pal.snap(avgR, avgG, avgB);
                const dIdx = (dy * 48 + dx) * 4;
                out[dIdx]     = snapped[0];
                out[dIdx + 1] = snapped[1];
                out[dIdx + 2] = snapped[2];
                out[dIdx + 3] = 255;
            }
        }
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

// Assemble standard 12-sprite charset sheet (144x192)
function assemble12SpriteSheet(framesByFacing) {
    const buf = Buffer.alloc(144 * 192 * 4);
    const rows = [
        framesByFacing.S,
        framesByFacing.W,
        framesByFacing.E || framesByFacing.W.map(mirrorFrame),
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
        generator: 'Google Nano Banana Pro (Rule 11, VISION V109)'
    };
    fs.writeFileSync(path.join(CHAR_DIR, `$UF_${baseName}.json`), JSON.stringify(sidecar, null, 2));
    console.log(`Saved $UF_${baseName}.png and .json`);
}

// ----------------------------------------------------------------------------
// ACTION BUILDERS
// ----------------------------------------------------------------------------

console.log('=== Building Adult Male Human 12-Sprite Action Suite (Serious Chibi) ===\n');

// Load Raw Sheets
const rawWalk   = decodePNG(fs.readFileSync(path.join(RAW_DIR, 'human_male_adult_walk.png')));
const rawAttack = decodePNG(fs.readFileSync(path.join(RAW_DIR, 'human_male_adult_attack.png')));
const rawCarry  = decodePNG(fs.readFileSync(path.join(RAW_DIR, 'human_male_adult_carry.png')));
const rawCast   = decodePNG(fs.readFileSync(path.join(RAW_DIR, 'human_male_adult_cast.png')));
const rawWork   = decodePNG(fs.readFileSync(path.join(RAW_DIR, 'human_male_adult_work.png')));
const rawDeath  = decodePNG(fs.readFileSync(path.join(RAW_DIR, 'human_male_adult_death.png')));

// 1. WALK (Master 12-Sprite Sheet)
console.log('1. Processing Walk Sheet...');
const walkFrames = {
    S: [extractRawFrame4x(rawWalk, 0, 0), extractRawFrame4x(rawWalk, 1, 0), extractRawFrame4x(rawWalk, 2, 0)],
    W: [extractRawFrame4x(rawWalk, 0, 2), extractRawFrame4x(rawWalk, 1, 2), extractRawFrame4x(rawWalk, 2, 2)],
    E: [extractRawFrame4x(rawWalk, 0, 6), extractRawFrame4x(rawWalk, 1, 6), extractRawFrame4x(rawWalk, 2, 6)],
    N: [extractRawFrame4x(rawWalk, 0, 4), extractRawFrame4x(rawWalk, 1, 4), extractRawFrame4x(rawWalk, 2, 4)]
};

const walkSheet = assemble12SpriteSheet(walkFrames);
saveSheetAndSidecar(walkSheet, 'Human_Male_Walk', 'Walk', { walk: [0, 1, 2, 1], stand: [1] });
saveSheetAndSidecar(walkSheet, 'Human_Male',      'Walk', { walk: [0, 1, 2, 1], stand: [1] });
saveSheetAndSidecar(walkSheet, 'Human_Male_Adult','Walk', { walk: [0, 1, 2, 1], stand: [1] });
saveSheetAndSidecar(walkSheet, 'Human',           'Walk', { walk: [0, 1, 2, 1], stand: [1] });

// 2. HAUL (Dedicated Burlap Sack Carrying Cycle)
console.log('2. Processing Haul Sheet (Dedicated Heavy Burlap Sack)...');
function addCarryingSack(baseFrame, facing, phase) {
    const out = Buffer.from(baseFrame);
    const setP = (x, y, col) => {
        if (x >= 0 && x < 48 && y >= 0 && y < 48) {
            const idx = (y * 48 + x) * 4;
            out[idx] = col[0]; out[idx + 1] = col[1]; out[idx + 2] = col[2]; out[idx + 3] = 255;
        }
    };

    if (facing === 'S') {
        // Large round burlap sack held firmly in both arms against torso
        const cy = 31 + (phase === 1 ? 0 : -1);
        for (let dy = -7; dy <= 7; dy++) {
            for (let dx = -7; dx <= 7; dx++) {
                const d = Math.hypot(dx * 1.1, dy);
                if (d <= 7) {
                    const isEdge = (d >= 6);
                    const isHi = (dy < -2 && dx < 2);
                    const col = isEdge ? C_DARK_OUTLINE : (isHi ? C_SACK_BASE : C_SACK_SHADE);
                    setP(24 + dx, cy + dy, col);
                }
            }
        }
        // Sack top tie ropes
        for (let rx = 21; rx <= 27; rx++) setP(rx, cy - 8, C_SACK_ROPE);
        setP(24, cy - 9, C_SACK_ROPE); setP(25, cy - 10, C_SACK_ROPE);
        // Sleeves wrapped around sides
        for (let ay = cy - 2; ay <= cy + 4; ay++) {
            setP(15, ay, C_LINEN_BASE); setP(16, ay, C_LINEN_SHADE);
            setP(32, ay, C_LINEN_SHADE); setP(33, ay, C_LINEN_BASE);
        }
        // Hands gripping bottom
        for (let hx = 19; hx <= 22; hx++) setP(hx, cy + 6, C_SKIN_BASE);
        for (let hx = 26; hx <= 29; hx++) setP(hx, cy + 6, C_SKIN_BASE);
    } else if (facing === 'W') {
        const cy = 30 + (phase === 1 ? 0 : -1);
        for (let dy = -7; dy <= 7; dy++) {
            for (let dx = -6; dx <= 6; dx++) {
                const d = Math.hypot(dx * 1.15, dy);
                if (d <= 6.5) {
                    const isEdge = (d >= 5.5);
                    const isHi = (dx < 0 && dy < -1);
                    const col = isEdge ? C_DARK_OUTLINE : (isHi ? C_SACK_BASE : C_SACK_SHADE);
                    setP(16 + dx, cy + dy, col);
                }
            }
        }
        for (let rx = 14; rx <= 19; rx++) setP(rx, cy - 7, C_SACK_ROPE);
        for (let ax = 17; ax <= 25; ax++) setP(ax, cy + 5, C_LINEN_BASE);
        setP(15, cy + 5, C_SKIN_BASE); setP(16, cy + 5, C_SKIN_BASE);
    } else if (facing === 'N') {
        const cy = 28 + (phase === 1 ? 0 : -1);
        for (let dy = -7; dy <= 7; dy++) {
            for (let dx = -7; dx <= 7; dx++) {
                const d = Math.hypot(dx * 1.1, dy);
                if (d <= 7) {
                    const isEdge = (d >= 6);
                    const isHi = (dy < -2);
                    const col = isEdge ? C_DARK_OUTLINE : (isHi ? C_SACK_BASE : C_SACK_SHADE);
                    setP(24 + dx, cy + dy, col);
                }
            }
        }
        for (let rx = 21; rx <= 27; rx++) setP(rx, cy - 8, C_SACK_ROPE);
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

const haulFrames = {
    S: [
        addCarryingSack(walkFrames.S[0], 'S', 0),
        addCarryingSack(walkFrames.S[1], 'S', 1),
        addCarryingSack(walkFrames.S[2], 'S', 2)
    ],
    W: [
        addCarryingSack(walkFrames.W[0], 'W', 0),
        addCarryingSack(walkFrames.W[1], 'W', 1),
        addCarryingSack(walkFrames.W[2], 'W', 2)
    ],
    N: [
        addCarryingSack(walkFrames.N[0], 'N', 0),
        addCarryingSack(walkFrames.N[1], 'N', 1),
        addCarryingSack(walkFrames.N[2], 'N', 2)
    ]
};
const haulSheet = assemble12SpriteSheet(haulFrames);
saveSheetAndSidecar(haulSheet, 'Human_Male_Haul', 'Haul', { haul: [0, 1, 2, 1], carry: [1], stand: [1] });

// 3. ATTACK (Heroic Lunge + Solid Broadsword Blade + Bold Sweeping Crescent Slash Arc)
console.log('3. Processing Melee Attack Sheet (Heroic Lunge & Bold Crescent Slash Arc)...');
function synthesizeMeleeAttack(baseStand, facing, phase) {
    const out = Buffer.alloc(48 * 48 * 4);
    const setP = (x, y, col) => {
        if (x >= 0 && x < 48 && y >= 0 && y < 48) {
            const idx = (y * 48 + x) * 4;
            out[idx] = col[0]; out[idx + 1] = col[1]; out[idx + 2] = col[2]; out[idx + 3] = 255;
        }
    };

    const fv = {
        S: { dx: 0, dy: 3 },
        W: { dx: -4, dy: 0 },
        N: { dx: 0, dy: -3 }
    }[facing];

    if (phase === 0) {
        // Phase 0: Windup high ready coil
        const coil = shiftFrame(baseStand, -Math.sign(fv.dx) * 2, -Math.sign(fv.dy));
        coil.copy(out);
        const handX = (facing === 'W') ? 28 : 17;
        const handY = 20;
        for (let i = 0; i < 14; i++) {
            const bx = handX + (facing === 'W' ? Math.round(i * 0.9) : -Math.round(i * 0.9));
            const by = handY - i;
            setP(bx, by, i >= 12 ? C_STEEL_WHITE : C_STEEL_LIGHT);
            setP(bx + (facing === 'W' ? 1 : -1), by, C_STEEL_DARK);
        }
    } else if (phase === 1) {
        // Phase 1: Forward lunge strike + extended broadsword + BOLD sweeping crescent slash arc
        const lunge = shiftFrame(baseStand, fv.dx, fv.dy);
        lunge.copy(out);

        const handPos = {
            S: { x: 28, y: 31 },
            W: { x: 14, y: 28 },
            N: { x: 28, y: 22 }
        }[facing];
        const hx = handPos.x + fv.dx;
        const hy = handPos.y + fv.dy;

        // Brass crossguard
        setP(hx - 2, hy, C_BUCKLE_GOLD);
        setP(hx - 1, hy, C_BUCKLE_GOLD);
        setP(hx, hy, C_BUCKLE_GOLD);
        setP(hx + 1, hy, C_BUCKLE_GOLD);
        setP(hx + 2, hy, C_BUCKLE_GOLD);

        // Blade vector
        const bVec = {
            S: { dx: 0, dy: 1, len: 15 },
            W: { dx: -1, dy: 0, len: 17 },
            N: { dx: 0, dy: -1, len: 15 }
        }[facing];

        for (let i = 1; i <= bVec.len; i++) {
            const bx = hx + Math.round(bVec.dx * i);
            const by = hy + Math.round(bVec.dy * i);
            const col = (i >= bVec.len - 2) ? C_STEEL_WHITE : (i % 2 === 0 ? C_STEEL_LIGHT : C_STEEL_MID);
            setP(bx, by, col);
            // 2px blade thickness
            const offX = bVec.dy !== 0 ? 1 : 0;
            const offY = bVec.dx !== 0 ? 1 : 0;
            setP(bx + offX, by + offY, (i >= bVec.len - 2) ? C_STEEL_LIGHT : C_STEEL_DARK);
        }

        // BOLD Sweeping Crescent Slash Arc
        const arc = {
            S: { cx: 24, cy: 38, rx: 18, ry: 10, startA: -0.3, endA: Math.PI + 0.3 },
            W: { cx: 10, cy: 28, rx: 10, ry: 18, startA: -Math.PI * 0.55, endA: Math.PI * 0.55 },
            N: { cx: 24, cy: 14, rx: 18, ry: 10, startA: Math.PI - 0.3, endA: Math.PI * 2 + 0.3 }
        }[facing];

        const steps = 36;
        for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const a = arc.startA + t * (arc.endA - arc.startA);
            const ax = Math.round(arc.cx + Math.cos(a) * arc.rx);
            const ay = Math.round(arc.cy + Math.sin(a) * arc.ry);
            const isEdge = (s < 4 || s > steps - 4);
            const col = isEdge ? C_SLASH_GLOW : C_SLASH_ARC;
            setP(ax, ay, col);
            // 2px thick glowing aura
            if (!isEdge) {
                setP(ax + (facing === 'W' ? -1 : 1), ay, C_SLASH_GLOW);
                setP(ax, ay + (facing === 'S' ? 1 : -1), C_SLASH_GLOW);
            }
        }
    } else {
        // Phase 2: Follow-through recovery
        const rec = shiftFrame(baseStand, Math.sign(fv.dx), Math.sign(fv.dy));
        rec.copy(out);
        const handX = (facing === 'W') ? 16 : 30;
        const handY = 34;
        for (let i = 1; i <= 10; i++) {
            setP(handX + (facing === 'W' ? -i : i), handY + Math.round(i * 0.3), (i === 10) ? C_STEEL_WHITE : C_STEEL_MID);
            setP(handX + (facing === 'W' ? -i : i), handY + Math.round(i * 0.3) + 1, C_STEEL_DARK);
        }
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

const attackFrames = {
    S: [synthesizeMeleeAttack(walkFrames.S[1], 'S', 0), synthesizeMeleeAttack(walkFrames.S[1], 'S', 1), synthesizeMeleeAttack(walkFrames.S[1], 'S', 2)],
    W: [synthesizeMeleeAttack(walkFrames.W[1], 'W', 0), synthesizeMeleeAttack(walkFrames.W[1], 'W', 1), synthesizeMeleeAttack(walkFrames.W[1], 'W', 2)],
    N: [synthesizeMeleeAttack(walkFrames.N[1], 'N', 0), synthesizeMeleeAttack(walkFrames.N[1], 'N', 1), synthesizeMeleeAttack(walkFrames.N[1], 'N', 2)]
};
const attackSheet = assemble12SpriteSheet(attackFrames);
saveSheetAndSidecar(attackSheet, 'Human_Male_Attack',   'Attack', { attack: [0, 1, 2] });
saveSheetAndSidecar(attackSheet, 'Human_Attack_Sword',  'Attack', { attack: [0, 1, 2] });

// 4. BOW (Aim, Tension Draw, String Pluck Recoil - ZERO Flying Projectiles!)
console.log('4. Processing Bow Sheet (Aim, Draw, String Pluck, ZERO flying arrows)...');
function synthesizeBowAttack(baseStand, facing, phase) {
    const out = Buffer.from(baseStand);
    const setP = (x, y, col) => {
        if (x >= 0 && x < 48 && y >= 0 && y < 48) {
            const idx = (y * 48 + x) * 4;
            out[idx] = col[0]; out[idx + 1] = col[1]; out[idx + 2] = col[2]; out[idx + 3] = 255;
        }
    };

    if (facing === 'S') {
        const bx = 34, by = 28;
        for (let dy = -12; dy <= 12; dy++) {
            const curve = Math.round(Math.cos(dy / 12 * Math.PI * 0.5) * 5);
            setP(bx - curve, by + dy, C_BOW_WOOD);
            setP(bx - curve + 1, by + dy, C_BOW_WOOD_SH);
        }
        const pull = (phase === 1) ? 8 : (phase === 2 ? 1 : 4);
        for (let dy = -12; dy <= 12; dy++) {
            const stringX = bx - (phase === 1 ? Math.round(Math.cos(dy / 12 * Math.PI * 0.5) * pull) : 0);
            setP(stringX, by + dy, C_BOW_STRING);
        }
        if (phase === 0 || phase === 1) {
            for (let ax = bx - 16; ax <= bx; ax++) setP(ax, by, C_STEEL_MID);
            setP(bx - 16, by, C_STEEL_WHITE);
        }
    } else if (facing === 'W') {
        const bx = 13, by = 26;
        for (let dy = -13; dy <= 13; dy++) {
            const curve = Math.round(Math.cos(dy / 13 * Math.PI * 0.5) * 5);
            setP(bx + curve, by + dy, C_BOW_WOOD);
            setP(bx + curve - 1, by + dy, C_BOW_WOOD_SH);
        }
        const pull = (phase === 1) ? 9 : (phase === 2 ? 1 : 4);
        for (let dy = -13; dy <= 13; dy++) {
            const stringX = bx + (phase === 1 ? Math.round(Math.cos(dy / 13 * Math.PI * 0.5) * pull) : 0);
            setP(stringX, by + dy, C_BOW_STRING);
        }
        if (phase === 0 || phase === 1) {
            for (let ax = bx - 3; ax <= bx + 13; ax++) setP(ax, by, C_STEEL_MID);
            setP(bx - 4, by, C_STEEL_WHITE);
        }
    } else if (facing === 'N') {
        const bx = 32, by = 24;
        for (let dy = -12; dy <= 12; dy++) {
            const curve = Math.round(Math.cos(dy / 12 * Math.PI * 0.5) * 5);
            setP(bx + curve, by + dy, C_BOW_WOOD);
            setP(bx + curve + 1, by + dy, C_BOW_WOOD_SH);
        }
        for (let dy = -12; dy <= 12; dy++) setP(bx, by + dy, C_BOW_STRING);
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

const bowFrames = {
    S: [synthesizeBowAttack(walkFrames.S[1], 'S', 0), synthesizeBowAttack(walkFrames.S[1], 'S', 1), synthesizeBowAttack(walkFrames.S[1], 'S', 2)],
    W: [synthesizeBowAttack(walkFrames.W[1], 'W', 0), synthesizeBowAttack(walkFrames.W[1], 'W', 1), synthesizeBowAttack(walkFrames.W[1], 'W', 2)],
    N: [synthesizeBowAttack(walkFrames.N[1], 'N', 0), synthesizeBowAttack(walkFrames.N[1], 'N', 1), synthesizeBowAttack(walkFrames.N[1], 'N', 2)]
};
const bowSheet = assemble12SpriteSheet(bowFrames);
saveSheetAndSidecar(bowSheet, 'Human_Male_Bow',    'Bow', { shoot: [0, 1, 2], pluck: [2] });
saveSheetAndSidecar(bowSheet, 'Human_Attack_Bow',  'Bow', { shoot: [0, 1, 2], pluck: [2] });

// 5. MAGIC (Spell Initiation / Incantation Posture & Soft Palm Mana Aura - ZERO Projectiles!)
console.log('5. Processing Magic Sheet (Spell Initiation Chant & Soft Palm Aura, ZERO beams)...');
function addSoftPalmAura(baseFrame, facing, phase) {
    const out = Buffer.from(baseFrame);
    const setP = (x, y, col) => {
        if (x >= 0 && x < 48 && y >= 0 && y < 48) {
            const idx = (y * 48 + x) * 4;
            out[idx] = col[0]; out[idx + 1] = col[1]; out[idx + 2] = col[2]; out[idx + 3] = 255;
        }
    };

    if (phase === 0) return out;

    const handPositions = {
        S: [{ x: 16, y: 22 }, { x: 32, y: 22 }],
        W: [{ x: 18, y: 24 }],
        N: [{ x: 16, y: 18 }, { x: 32, y: 18 }]
    }[facing];

    for (const hp of handPositions) {
        for (let dy = -3; dy <= 3; dy++) {
            for (let dx = -3; dx <= 3; dx++) {
                const dist = Math.hypot(dx, dy);
                if (dist <= 3.2) {
                    const col = (dist <= 1.2) ? C_MANA_CORE : C_MANA_AURA;
                    setP(hp.x + dx, hp.y + dy, col);
                }
            }
        }
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

const magicFrames = {
    S: [
        extractRawFrame4x(rawCast, 0, 0),
        extractRawFrame4x(rawCast, 1, 0),
        addSoftPalmAura(extractRawFrame4x(rawCast, 1, 0), 'S', 2)
    ],
    W: [
        extractRawFrame4x(rawCast, 0, 2),
        extractRawFrame4x(rawCast, 1, 2),
        addSoftPalmAura(extractRawFrame4x(rawCast, 1, 2), 'W', 2)
    ],
    N: [
        extractRawFrame4x(rawCast, 0, 4),
        extractRawFrame4x(rawCast, 1, 4),
        addSoftPalmAura(extractRawFrame4x(rawCast, 1, 4), 'N', 2)
    ]
};
const magicSheet = assemble12SpriteSheet(magicFrames);
saveSheetAndSidecar(magicSheet, 'Human_Male_Magic', 'Cast', { cast: [0, 1, 2] });
saveSheetAndSidecar(magicSheet, 'Human_Cast',       'Cast', { cast: [0, 1, 2] });

// 6. WORK (Reach, Kneeling Craftsman ~30px height with proportional head & torso, Hammer Ground Strike)
console.log('6. Processing Work Sheet (Reach, Kneel, Hammer Ground Stroke)...');
function synthesizeCraftsmanWork(baseStand, facing, phase) {
    const out = Buffer.alloc(48 * 48 * 4);
    const setP = (x, y, col) => {
        if (x >= 0 && x < 48 && y >= 0 && y < 48) {
            const idx = (y * 48 + x) * 4;
            out[idx] = col[0]; out[idx + 1] = col[1]; out[idx + 2] = col[2]; out[idx + 3] = 255;
        }
    };

    if (phase === 0) {
        // Col 0: Standing inspection / reach forward
        const reach = shiftFrame(baseStand, facing === 'W' ? -2 : (facing === 'E' ? 2 : 0), 0);
        reach.copy(out);
    } else {
        // Col 1 & 2: Kneeling down proportionally from 46px standing height to 31px kneeling height
        // y 2..47 maps to 17..47 (31px tall, row 47 baseline maintained!)
        for (let y = 0; y < 48; y++) {
            const targetY = Math.round(17 + (y - 2) * (30 / 45));
            if (targetY < 0 || targetY >= 48) continue;
            for (let x = 0; x < 48; x++) {
                const sIdx = (y * 48 + x) * 4;
                if (baseStand[sIdx + 3] > 0) {
                    const dIdx = (targetY * 48 + x) * 4;
                    out[dIdx]     = baseStand[sIdx];
                    out[dIdx + 1] = baseStand[sIdx + 1];
                    out[dIdx + 2] = baseStand[sIdx + 2];
                    out[dIdx + 3] = 255;
                }
            }
        }

        if (phase === 2) {
            // Col 2: Blacksmith hammer striking ground anvil/timber
            const hx = (facing === 'W') ? 13 : (facing === 'E' ? 35 : 24);
            const hy = 43;
            // Hammer iron head
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    setP(hx + dx, hy + dy, C_TOOL_IRON);
                }
            }
            // Wood handle
            for (let i = 1; i <= 5; i++) {
                setP(hx + (facing === 'W' ? i : -i), hy - i, C_TOOL_WOOD);
            }
            // Spark on contact
            setP(hx - 3, hy, C_STEEL_WHITE);
            setP(hx + 3, hy, C_STEEL_WHITE);
        }
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

const workFrames = {
    S: [synthesizeCraftsmanWork(walkFrames.S[1], 'S', 0), synthesizeCraftsmanWork(walkFrames.S[1], 'S', 1), synthesizeCraftsmanWork(walkFrames.S[1], 'S', 2)],
    W: [synthesizeCraftsmanWork(walkFrames.W[1], 'W', 0), synthesizeCraftsmanWork(walkFrames.W[1], 'W', 1), synthesizeCraftsmanWork(walkFrames.W[1], 'W', 2)],
    N: [synthesizeCraftsmanWork(walkFrames.N[1], 'N', 0), synthesizeCraftsmanWork(walkFrames.N[1], 'N', 1), synthesizeCraftsmanWork(walkFrames.N[1], 'N', 2)]
};
const workSheet = assemble12SpriteSheet(workFrames);
saveSheetAndSidecar(workSheet, 'Human_Male_Work', 'Work', { work: [0, 1, 2] });

// 7. DOWNED (Hurt Flinch Stagger, Kneeling Collapse ~28px, Prone Horizontal Corpse)
console.log('7. Processing Downed Sheet (Hurt, Kneel Collapse, Flat Horizontal Corpse)...');
const downedFrames = {
    S: [extractRawFrame4x(rawDeath, 0, 0), extractRawFrame4x(rawDeath, 1, 0), extractRawFrame4x(rawDeath, 2, 0)],
    W: [extractRawFrame4x(rawDeath, 0, 2), extractRawFrame4x(rawDeath, 1, 2), extractRawFrame4x(rawDeath, 2, 2)],
    N: [extractRawFrame4x(rawDeath, 0, 4), extractRawFrame4x(rawDeath, 1, 4), extractRawFrame4x(rawDeath, 2, 4)]
};
const downedSheet = assemble12SpriteSheet(downedFrames);
saveSheetAndSidecar(downedSheet, 'Human_Male_Downed', 'Downed', { downed: [0, 1, 2], hurt: [0], collapse: [1], corpse: [2] });

console.log('\nAll 7 Adult Male Human 12-Sprite Action Suites successfully compiled & deployed!');
