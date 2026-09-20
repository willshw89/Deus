#!/usr/bin/env node
'use strict';

/**
 * tools/build_elf_demographics_standard_charsets.js
 *
 * Universal 8-Directional Standard Charset Generator for ALL Demographic Stages:
 * 1. Adult Male ($UF_Elf_Male_* / $UF_Elf_*) - 40px tall, athletic sylvan warrior/ranger
 * 2. Adult Female ($UF_Elf_Female_*) - 39px tall, slender waist, flared sylvan tunic hem, cascading silver mane
 * 3. Child / Kid ($UF_Elf_Child_*) - 28-30px tall, youthful 1:2.8 proportions, cute pointed ears, practice gear
 *
 * Standard Matrix across ALL 3 Demographics:
 * - 18 Columns x 8 Directional Rows
 * - C0..C2: Movement (Walk L, Stand, Walk R)
 * - C3..C5: Melee Attack (Windup, Strike with directional crescent slash arc, Recover)
 * - C6..C8: Ranged Bow (Aim, Tension draw in facing vector, Release recoil)
 * - C9..C11: Magic Cast (Ready, Radiant emerald mana hands - raised high for North!, Thrust palms)
 * - C12..C14: Work / Harvest (Reach, Kneeling Craft/Gather, Recover)
 * - C15..C17: Downed (Hurt flinch recoil, Kneeling collapse, Horizontal resting corpse / sleep)
 *
 * Outputs:
 * - game/img/characters/$UF_Elf_*.png and .json (Male, Female, Child across all 6 actions)
 * - game/img/characters/$UF_Elf_*_AR600.png and .json (Composite 20-column sheets)
 * - art/masters/Elf_*_Standard_8D_18Col.png (Native 18-column masters)
 * - art/review/elf_demographics_family_board.png (Complete review board)
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const MASTER_DIR = path.join(ROOT, 'art', 'masters');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');
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

// Canonical Sylvan Color Constants
const C_OUTLINE     = pal.snap(24, 20, 32);     // Deep shadow outline
const C_SKIN_BASE   = pal.snap(232, 192, 160);  // Elf skin tone
const C_SKIN_SHADE  = pal.snap(184, 144, 116);  // Skin shadow
const C_HAIR_BASE   = pal.snap(225, 230, 240);  // Silver hair highlight
const C_HAIR_SHADE  = pal.snap(160, 168, 184);  // Silver hair shadow
const C_TUNIC_BASE  = pal.snap(48, 140, 48);    // Sylvan forest green tunic
const C_TUNIC_SHADE = pal.snap(28, 88, 32);     // Tunic shadow
const C_TRIM_SILVER = pal.snap(210, 218, 230);  // Silver embroidery trim
const C_PANTS_BASE  = pal.snap(88, 64, 48);     // Leather trousers / leggings
const C_PANTS_SHADE = pal.snap(52, 38, 28);     // Pants shadow
const C_BELT        = pal.snap(120, 72, 36);    // Belt leather
const C_BUCKLE      = pal.snap(240, 200, 80);   // Gold belt buckle
const C_STEEL_CORE  = pal.snap(232, 240, 255);  // Mithril blade core
const C_STEEL_SHADE = pal.snap(140, 160, 190);  // Blade shadow
const C_SLASH_ARC   = pal.snap(245, 250, 255);  // Slash sweep arc
const C_SLASH_GLOW  = pal.snap(180, 210, 255);  // Arc glow
const C_BOW_WOOD    = pal.snap(150, 96, 44);    // Yew bow wood
const C_BOW_STRING  = pal.snap(220, 220, 220);  // Bowstring
const C_MANA_CORE   = pal.snap(140, 255, 180);  // Mana aura core
const C_MANA_EDGE   = pal.snap(40, 220, 110);   // Mana radiance glow
const C_BLOOD_FLASH = pal.snap(190, 40, 40);    // Pain flinch flash
const C_EYE         = pal.snap(24, 48, 32);     // Elven eye green

// Image transformation utilities
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

function getFrameFromSheet(sheet, col, row) {
    const frame = Buffer.alloc(48 * 48 * 4);
    for (let py = 0; py < 48; py++) {
        for (let px = 0; px < 48; px++) {
            const sIdx = ((row * 48 + py) * sheet.width + (col * 48 + px)) * 4;
            const dIdx = (py * 48 + px) * 4;
            frame[dIdx]     = sheet.data[sIdx];
            frame[dIdx + 1] = sheet.data[sIdx + 1];
            frame[dIdx + 2] = sheet.data[sIdx + 2];
            frame[dIdx + 3] = sheet.data[sIdx + 3];
        }
    }
    return frame;
}

// ----------------------------------------------------------------------------
// Step 1: Base Anchor Skeletons
// ----------------------------------------------------------------------------
console.log('Loading canonical Adult Male walk anchor ($UF_Elf_8D.png)...');
const maleWalkImg = decodePNG(fs.readFileSync(path.join(CHAR_DIR, '$UF_Elf_8D.png')));

const maleWalkFrames = {
    S:  [getFrameFromSheet(maleWalkImg, 0, 0), getFrameFromSheet(maleWalkImg, 1, 0), getFrameFromSheet(maleWalkImg, 2, 0)],
    SW: [getFrameFromSheet(maleWalkImg, 0, 1), getFrameFromSheet(maleWalkImg, 1, 1), getFrameFromSheet(maleWalkImg, 2, 1)],
    W:  [getFrameFromSheet(maleWalkImg, 0, 2), getFrameFromSheet(maleWalkImg, 1, 2), getFrameFromSheet(maleWalkImg, 2, 2)],
    NW: [getFrameFromSheet(maleWalkImg, 0, 3), getFrameFromSheet(maleWalkImg, 1, 3), getFrameFromSheet(maleWalkImg, 2, 3)],
    N:  [getFrameFromSheet(maleWalkImg, 0, 4), getFrameFromSheet(maleWalkImg, 1, 4), getFrameFromSheet(maleWalkImg, 2, 4)]
};

// ----------------------------------------------------------------------------
// Sculpt Adult Female Walk Frames from Grounded Skeleton
// ----------------------------------------------------------------------------
console.log('Sculpting Adult Female walk frames (cascading silver hair, feminine waist, flared sylvan hem)...');
function sculptFemaleFrame(maleFrame, facing) {
    const out = Buffer.from(maleFrame);

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

    // 1. Feminine waist slimming (rows 26..29)
    if (facing === 'S' || facing === 'N') {
        for (let y = 26; y <= 29; y++) {
            let minX = 48, maxX = 0;
            for (let x = 0; x < 48; x++) {
                if (out[(y * 48 + x) * 4 + 3] > 0) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                }
            }
            if (maxX - minX >= 9) {
                clearPixel(minX, y);
                clearPixel(maxX, y);
                setPixel(minX + 1, y, C_OUTLINE);
                setPixel(maxX - 1, y, C_OUTLINE);
            }
        }
    }

    // 2. Flared sylvan skirt/tunic hem (rows 32..35)
    for (let y = 32; y <= 35; y++) {
        let minX = 48, maxX = 0;
        for (let x = 0; x < 48; x++) {
            if (out[(y * 48 + x) * 4 + 3] > 0) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
            }
        }
        if (maxX >= minX) {
            const flare = (y === 34 || y === 35) ? 1 : 0;
            if (flare > 0 && facing !== 'W') {
                setPixel(minX - 1, y, C_OUTLINE);
                setPixel(minX, y, C_TUNIC_SHADE);
                setPixel(maxX + 1, y, C_OUTLINE);
                setPixel(maxX, y, C_TUNIC_BASE);
            }
            if (y === 35) {
                for (let x = minX + 1; x < maxX; x++) {
                    const idx = (y * 48 + x) * 4;
                    if (out[idx + 3] > 0) {
                        setPixel(x, y, C_TRIM_SILVER);
                    }
                }
            }
        }
    }

    // 3. Cascading long silver hair
    if (facing === 'S') {
        for (let y = 14; y <= 27; y++) {
            const hx1 = (y <= 21) ? 16 : 17;
            const hx2 = (y <= 21) ? 31 : 30;
            setPixel(hx1 - 1, y, C_OUTLINE);
            setPixel(hx1, y, y % 2 === 0 ? C_HAIR_BASE : C_HAIR_SHADE);
            setPixel(hx2 + 1, y, C_OUTLINE);
            setPixel(hx2, y, y % 2 === 1 ? C_HAIR_BASE : C_HAIR_SHADE);
        }
    } else if (facing === 'SW') {
        for (let y = 14; y <= 27; y++) {
            const hx = (y <= 21) ? 29 : 28;
            setPixel(hx + 1, y, C_OUTLINE);
            setPixel(hx, y, y % 2 === 0 ? C_HAIR_BASE : C_HAIR_SHADE);
            setPixel(hx - 1, y, C_HAIR_SHADE);
        }
    } else if (facing === 'W') {
        for (let y = 14; y <= 28; y++) {
            const hx = (y <= 20) ? 29 : (y <= 24) ? 28 : 27;
            setPixel(hx + 1, y, C_OUTLINE);
            setPixel(hx, y, y % 2 === 0 ? C_HAIR_BASE : C_HAIR_SHADE);
            setPixel(hx - 1, y, C_HAIR_SHADE);
        }
    } else if (facing === 'NW') {
        for (let y = 14; y <= 28; y++) {
            for (let x = 20; x <= 28; x++) {
                if (y <= 24 || (x >= 22 && x <= 27)) {
                    setPixel(x, y, (x + y) % 2 === 0 ? C_HAIR_BASE : C_HAIR_SHADE);
                }
            }
        }
    } else if (facing === 'N') {
        for (let y = 12; y <= 28; y++) {
            const w = (y <= 20) ? 6 : (y <= 25) ? 5 : 4;
            for (let dx = -w; dx <= w; dx++) {
                const px = 24 + dx;
                if (dx === -w || dx === w || y === 28) {
                    setPixel(px, y, C_OUTLINE);
                } else {
                    setPixel(px, y, (px + y) % 2 === 0 ? C_HAIR_BASE : C_HAIR_SHADE);
                }
            }
        }
    }

    applyDarkOutline(out, 48, 48);
    return out;
}

const femaleWalkFrames = {
    S:  maleWalkFrames.S.map(f => sculptFemaleFrame(f, 'S')),
    SW: maleWalkFrames.SW.map(f => sculptFemaleFrame(f, 'SW')),
    W:  maleWalkFrames.W.map(f => sculptFemaleFrame(f, 'W')),
    NW: maleWalkFrames.NW.map(f => sculptFemaleFrame(f, 'NW')),
    N:  maleWalkFrames.N.map(f => sculptFemaleFrame(f, 'N'))
};

// ----------------------------------------------------------------------------
// Sculpt Elf Child Walk Frames (Youthful Proportions: 30px tall, rows 18..47)
// ----------------------------------------------------------------------------
console.log('Sculpting Elf Child walk frames (youthful 30px stature, cute pointed ears, soft silver locks)...');
function buildChildFrame(facing, stridePhase) {
    const frame = Buffer.alloc(48 * 48 * 4);
    const setPixel = (x, y, col) => {
        if (x >= 0 && x < 48 && y >= 0 && y < 48) {
            const o = (y * 48 + x) * 4;
            frame[o] = col[0]; frame[o + 1] = col[1]; frame[o + 2] = col[2]; frame[o + 3] = 255;
        }
    };

    const bounce = (stridePhase === 0) ? 0 : -1;
    const hyTop = 18 + bounce;
    const hyBottom = 27 + bounce;
    const tyTop = hyBottom + 1;
    const tyBottom = hyBottom + 10;
    const lyTop = tyBottom + 1;

    if (facing === 'S') {
        // Head: rows 18..27, width 15px (col 17..31)
        for (let y = hyTop; y <= hyBottom; y++) {
            const hw = (y === hyTop || y === hyBottom) ? 4 : (y === hyTop + 1 || y === hyBottom - 1) ? 5 : 6;
            for (let dx = -hw; dx <= hw; dx++) {
                const px = 24 + dx;
                if (y <= hyTop + 4) setPixel(px, y, (px + y) % 2 === 0 ? C_HAIR_BASE : C_HAIR_SHADE);
                else setPixel(px, y, dx > 0 ? C_SKIN_BASE : C_SKIN_SHADE);
            }
        }
        setPixel(22, hyTop + 6, C_EYE); setPixel(26, hyTop + 6, C_EYE);
        setPixel(17, hyTop + 4, C_SKIN_SHADE); setPixel(18, hyTop + 5, C_SKIN_BASE);
        setPixel(31, hyTop + 4, C_SKIN_SHADE); setPixel(30, hyTop + 5, C_SKIN_BASE);

        // Torso: rows 28..37
        for (let y = tyTop; y <= tyBottom; y++) {
            const tw = (y <= tyTop + 2) ? 4 : 5;
            for (let dx = -tw; dx <= tw; dx++) {
                const px = 24 + dx;
                if (y === tyBottom - 3) setPixel(px, y, (dx === 0) ? C_BUCKLE : C_BELT);
                else setPixel(px, y, dx >= 0 ? C_TUNIC_BASE : C_TUNIC_SHADE);
            }
        }
        setPixel(18, tyTop + 4, C_SKIN_BASE); setPixel(30, tyTop + 4, C_SKIN_BASE);

        // Legs: rows 38..47
        const leftY  = (stridePhase < 0) ? 47 : (stridePhase > 0 ? 45 : 47);
        const rightY = (stridePhase > 0) ? 47 : (stridePhase < 0 ? 45 : 47);
        for (let y = lyTop; y <= leftY; y++) {
            for (let x = 21; x <= 23; x++) setPixel(x, y, y >= 43 ? C_PANTS_SHADE : C_PANTS_BASE);
        }
        for (let y = lyTop; y <= rightY; y++) {
            for (let x = 25; x <= 27; x++) setPixel(x, y, y >= 43 ? C_PANTS_SHADE : C_PANTS_BASE);
        }
    } else if (facing === 'SW') {
        // Head: width 12px (col 17..28)
        for (let y = hyTop; y <= hyBottom; y++) {
            const hw = (y === hyTop || y === hyBottom) ? 4 : 5;
            for (let dx = -hw; dx <= hw; dx++) {
                const px = 23 + dx;
                if (y <= hyTop + 4 || dx >= 2) setPixel(px, y, (px + y) % 2 === 0 ? C_HAIR_BASE : C_HAIR_SHADE);
                else setPixel(px, y, C_SKIN_BASE);
            }
        }
        setPixel(21, hyTop + 6, C_EYE); setPixel(25, hyTop + 6, C_EYE);
        setPixel(17, hyTop + 4, C_SKIN_SHADE); setPixel(18, hyTop + 5, C_SKIN_BASE);

        // Torso: width 11px (col 18..28)
        for (let y = tyTop; y <= tyBottom; y++) {
            for (let dx = -5; dx <= 5; dx++) {
                const px = 23 + dx;
                if (y === tyBottom - 3) setPixel(px, y, (dx === -1) ? C_BUCKLE : C_BELT);
                else setPixel(px, y, dx <= 0 ? C_TUNIC_BASE : C_TUNIC_SHADE);
            }
        }
        setPixel(18, tyTop + 4, C_SKIN_BASE);

        // Legs: stride
        const leadStep = (stridePhase < 0) ? -2 : (stridePhase > 0 ? 2 : 0);
        for (let y = lyTop; y <= 47; y++) {
            for (let x = 20 + leadStep; x <= 23 + leadStep; x++) setPixel(x, y, y >= 43 ? C_PANTS_SHADE : C_PANTS_BASE);
            for (let x = 24 - leadStep; x <= 26 - leadStep; x++) setPixel(x, y, y >= 43 ? C_PANTS_SHADE : C_PANTS_BASE);
        }
    } else if (facing === 'W') {
        // Full side profile child: Head width 11px (col 18..28)
        for (let y = hyTop; y <= hyBottom; y++) {
            const hw = (y === hyTop || y === hyBottom) ? 4 : 5;
            for (let dx = -hw; dx <= hw; dx++) {
                const px = 23 + dx;
                if (dx >= 0 || y <= hyTop + 3) setPixel(px, y, (px + y) % 2 === 0 ? C_HAIR_BASE : C_HAIR_SHADE);
                else setPixel(px, y, C_SKIN_BASE);
            }
        }
        setPixel(20, hyTop + 6, C_EYE);
        setPixel(25, hyTop + 4, C_SKIN_SHADE); setPixel(26, hyTop + 5, C_SKIN_BASE);

        // Torso side: width 9px (col 19..27)
        for (let y = tyTop; y <= tyBottom; y++) {
            for (let dx = -4; dx <= 4; dx++) {
                const px = 23 + dx;
                if (y === tyBottom - 3) setPixel(px, y, C_BELT);
                else setPixel(px, y, dx <= 1 ? C_TUNIC_BASE : C_TUNIC_SHADE);
            }
        }
        setPixel(22, tyTop + 4, C_SKIN_BASE);

        // Scissor legs side
        const step = (stridePhase === -1) ? -3 : (stridePhase === 1 ? 3 : 0);
        for (let y = lyTop; y <= 47; y++) {
            for (let x = 20 + step; x <= 23 + step; x++) {
                setPixel(x, y, y >= 43 ? C_PANTS_SHADE : C_PANTS_BASE);
            }
            const rearLift = (step !== 0 && y >= 46) ? 0 : 1;
            if (rearLift) {
                for (let x = 24 - step; x <= 27 - step; x++) {
                    setPixel(x, y, y >= 43 ? C_PANTS_SHADE : C_PANTS_BASE);
                }
            }
        }
    } else if (facing === 'NW') {
        // NW 3/4 Back: Head width 12px
        for (let y = hyTop; y <= hyBottom; y++) {
            const hw = (y === hyTop || y === hyBottom) ? 4 : 5;
            for (let dx = -hw; dx <= hw; dx++) {
                const px = 23 + dx;
                setPixel(px, y, (px + y) % 2 === 0 ? C_HAIR_BASE : C_HAIR_SHADE);
            }
        }
        setPixel(17, hyTop + 4, C_SKIN_SHADE);

        // Torso
        for (let y = tyTop; y <= tyBottom; y++) {
            for (let dx = -5; dx <= 5; dx++) {
                const px = 23 + dx;
                setPixel(px, y, C_TUNIC_SHADE);
            }
        }
        // Legs
        const leadStep = (stridePhase < 0) ? -2 : (stridePhase > 0 ? 2 : 0);
        for (let y = lyTop; y <= 47; y++) {
            for (let x = 20 + leadStep; x <= 23 + leadStep; x++) setPixel(x, y, y >= 43 ? C_PANTS_SHADE : C_PANTS_BASE);
            for (let x = 24 - leadStep; x <= 26 - leadStep; x++) setPixel(x, y, y >= 43 ? C_PANTS_SHADE : C_PANTS_BASE);
        }
    } else if (facing === 'N') {
        // Back view: width 15px (col 17..31)
        for (let y = hyTop; y <= hyBottom; y++) {
            const hw = (y === hyTop || y === hyBottom) ? 4 : (y === hyTop + 1 || y === hyBottom - 1) ? 5 : 6;
            for (let dx = -hw; dx <= hw; dx++) {
                const px = 24 + dx;
                setPixel(px, y, (px + y) % 2 === 0 ? C_HAIR_BASE : C_HAIR_SHADE);
            }
        }
        setPixel(17, hyTop + 4, C_SKIN_SHADE); setPixel(18, hyTop + 5, C_SKIN_BASE);
        setPixel(31, hyTop + 4, C_SKIN_SHADE); setPixel(30, hyTop + 5, C_SKIN_BASE);

        for (let y = tyTop; y <= tyBottom; y++) {
            const tw = (y <= tyTop + 2) ? 4 : 5;
            for (let dx = -tw; dx <= tw; dx++) {
                const px = 24 + dx;
                setPixel(px, y, C_TUNIC_SHADE);
            }
        }

        const leftY  = (stridePhase < 0) ? 47 : (stridePhase > 0 ? 45 : 47);
        const rightY = (stridePhase > 0) ? 47 : (stridePhase < 0 ? 45 : 47);
        for (let y = lyTop; y <= leftY; y++) {
            for (let x = 21; x <= 23; x++) setPixel(x, y, y >= 43 ? C_PANTS_SHADE : C_PANTS_BASE);
        }
        for (let y = lyTop; y <= rightY; y++) {
            for (let x = 25; x <= 27; x++) setPixel(x, y, y >= 43 ? C_PANTS_SHADE : C_PANTS_BASE);
        }
    }

    applyDarkOutline(frame, 48, 48);
    return frame;
}

const childWalkFrames = {
    S:  [buildChildFrame('S', -1), buildChildFrame('S', 0), buildChildFrame('S', 1)],
    SW: [buildChildFrame('SW', -1), buildChildFrame('SW', 0), buildChildFrame('SW', 1)],
    W:  [buildChildFrame('W', -1), buildChildFrame('W', 0), buildChildFrame('W', 1)],
    NW: [buildChildFrame('NW', -1), buildChildFrame('NW', 0), buildChildFrame('NW', 1)],
    N:  [buildChildFrame('N', -1), buildChildFrame('N', 0), buildChildFrame('N', 1)]
};

// ----------------------------------------------------------------------------
// Generic Action Generators for ANY Demographic
// ----------------------------------------------------------------------------

// Stage 2: Melee Attack
function buildAttackSet(baseStand, facing, isChild = false) {
    const f0 = Buffer.alloc(48 * 48 * 4);
    const f1 = Buffer.alloc(48 * 48 * 4);
    const f2 = Buffer.alloc(48 * 48 * 4);

    const lungeVec = {
        S:  { dx: 0, dy: isChild ? 1 : 2 },
        SW: { dx: isChild ? -1 : -2, dy: isChild ? 1 : 2 },
        W:  { dx: isChild ? -2 : -3, dy: 0 },
        NW: { dx: isChild ? -1 : -2, dy: isChild ? -1 : -2 },
        N:  { dx: 0, dy: isChild ? -1 : -2 }
    }[facing];

    const coil = shiftFrame(baseStand, -Math.sign(lungeVec.dx), -Math.sign(lungeVec.dy));
    coil.copy(f0);

    const lunge = shiftFrame(baseStand, lungeVec.dx, lungeVec.dy);
    lunge.copy(f1);

    baseStand.copy(f2);

    const swordDef = {
        S: {
            hand: { x: 28, y: isChild ? 35 : 30 },
            blade: isChild ? [{ dx: 2, dy: 2 }, { dx: 3, dy: 4 }, { dx: 4, dy: 6 }] :
                             [{ dx: 2, dy: 3 }, { dx: 3, dy: 5 }, { dx: 4, dy: 7 }, { dx: 5, dy: 9 }, { dx: 6, dy: 11 }],
            arc: [
                { x: 16, y: isChild ? 43 : 41 }, { x: 20, y: isChild ? 44 : 42 }, { x: 25, y: isChild ? 45 : 43 },
                { x: 30, y: isChild ? 45 : 43 }, { x: 35, y: isChild ? 44 : 42 }, { x: 39, y: isChild ? 42 : 40 }
            ]
        },
        SW: {
            hand: { x: 20, y: isChild ? 35 : 30 },
            blade: isChild ? [{ dx: -2, dy: 2 }, { dx: -4, dy: 3 }, { dx: -6, dy: 4 }] :
                             [{ dx: -2, dy: 2 }, { dx: -4, dy: 3 }, { dx: -6, dy: 5 }, { dx: -8, dy: 6 }, { dx: -10, dy: 8 }],
            arc: [
                { x: 10, y: isChild ? 32 : 28 }, { x: 9, y: isChild ? 36 : 33 }, { x: 10, y: isChild ? 40 : 38 },
                { x: 13, y: 42 }, { x: 18, y: 44 }
            ]
        },
        W: {
            hand: { x: 17, y: isChild ? 33 : 28 },
            blade: isChild ? [{ dx: -2, dy: 0 }, { dx: -4, dy: -1 }, { dx: -6, dy: -2 }] :
                             [{ dx: -2, dy: 0 }, { dx: -4, dy: -1 }, { dx: -6, dy: -2 }, { dx: -8, dy: -3 }, { dx: -10, dy: -4 }],
            arc: [
                { x: 16, y: isChild ? 20 : 15 }, { x: 11, y: isChild ? 22 : 17 }, { x: 7, y: isChild ? 26 : 22 },
                { x: 6, y: 28 }, { x: 8, y: 34 }, { x: 12, y: 38 }
            ]
        },
        NW: {
            hand: { x: 18, y: isChild ? 30 : 25 },
            blade: isChild ? [{ dx: -2, dy: -2 }, { dx: -4, dy: -4 }] :
                             [{ dx: -2, dy: -2 }, { dx: -4, dy: -4 }, { dx: -6, dy: -6 }, { dx: -8, dy: -8 }],
            arc: [
                { x: 8, y: isChild ? 30 : 26 }, { x: 7, y: isChild ? 24 : 20 }, { x: 9, y: isChild ? 18 : 15 },
                { x: 13, y: isChild ? 15 : 12 }, { x: 19, y: isChild ? 14 : 11 }
            ]
        },
        N: {
            hand: { x: 29, y: isChild ? 29 : 24 },
            blade: isChild ? [{ dx: 1, dy: -2 }, { dx: 2, dy: -4 }] :
                             [{ dx: 1, dy: -2 }, { dx: 2, dy: -5 }, { dx: 3, dy: -7 }, { dx: 4, dy: -9 }],
            arc: [
                { x: 16, y: isChild ? 16 : 12 }, { x: 21, y: isChild ? 14 : 10 }, { x: 27, y: isChild ? 14 : 10 },
                { x: 33, y: isChild ? 15 : 11 }, { x: 38, y: isChild ? 17 : 14 }
            ]
        }
    }[facing];

    const hx = swordDef.hand.x + lungeVec.dx;
    const hy = swordDef.hand.y + lungeVec.dy;
    const bladeColorCore = isChild ? C_BOW_WOOD : C_STEEL_CORE;
    const bladeColorShade = isChild ? C_PANTS_BASE : C_STEEL_SHADE;

    swordDef.blade.forEach((pt, idx) => {
        const bx = hx + pt.dx;
        const by = hy + pt.dy;
        if (bx >= 0 && bx < 48 && by >= 0 && by < 48) {
            const o = (by * 48 + bx) * 4;
            const col = (idx === swordDef.blade.length - 1) ? bladeColorCore : bladeColorShade;
            f1[o] = col[0]; f1[o + 1] = col[1]; f1[o + 2] = col[2]; f1[o + 3] = 255;
        }
    });

    swordDef.arc.forEach(pt => {
        const ax = pt.x + lungeVec.dx;
        const ay = pt.y + lungeVec.dy;
        if (ax >= 0 && ax < 48 && ay >= 0 && ay < 48) {
            const o = (ay * 48 + ax) * 4;
            f1[o] = C_SLASH_ARC[0]; f1[o + 1] = C_SLASH_ARC[1]; f1[o + 2] = C_SLASH_ARC[2]; f1[o + 3] = 255;
        }
    });

    applyDarkOutline(f0, 48, 48);
    applyDarkOutline(f1, 48, 48);
    applyDarkOutline(f2, 48, 48);
    return [f0, f1, f2];
}

// Stage 3: Ranged Bow
function buildBowSet(baseStand, facing, isChild = false) {
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

    const yStart = isChild ? 24 : 18;
    const yEnd = isChild ? 38 : 36;

    if (facing === 'S') {
        for (let y = yStart; y <= yEnd; y++) {
            const curve = (y >= yStart + 5 && y <= yEnd - 5) ? 20 : 21;
            setPixel(f0, curve, y, C_BOW_WOOD);
            setPixel(f1, curve - 1, y, C_BOW_WOOD);
            setPixel(f2, curve, y, C_BOW_WOOD);
        }
        setPixel(f0, 21, yStart + 8, C_SKIN_BASE);
        for (let y = yStart + 1; y <= yEnd - 1; y++) setPixel(f1, 25, y, C_BOW_STRING);
        setPixel(f1, 26, yStart + 8, C_SKIN_BASE);
        for (let y = yStart + 1; y <= yEnd - 1; y++) setPixel(f2, 21, y, C_BOW_STRING);
    } else if (facing === 'SW') {
        const radius = isChild ? 5 : 8;
        for (let i = -radius; i <= radius; i++) {
            const bx = 18 + Math.round(i * 0.7);
            const by = (isChild ? 32 : 28) + Math.round(i * 0.7);
            setPixel(f0, bx, by, C_BOW_WOOD);
            setPixel(f1, bx - 1, by, C_BOW_WOOD);
            setPixel(f2, bx, by, C_BOW_WOOD);
        }
        setPixel(f1, 25, isChild ? 29 : 25, C_SKIN_BASE);
    } else if (facing === 'W') {
        for (let y = yStart - 2; y <= yEnd; y++) {
            const curve = (y >= yStart + 4 && y <= yEnd - 5) ? 13 : 15;
            setPixel(f0, curve, y, C_BOW_WOOD);
            setPixel(f1, curve - 1, y, C_BOW_WOOD);
            setPixel(f2, curve, y, C_BOW_WOOD);
        }
        setPixel(f1, 22, isChild ? 30 : 26, C_SKIN_BASE);
    } else if (facing === 'NW') {
        const radius = isChild ? 5 : 8;
        for (let i = -radius; i <= radius; i++) {
            const bx = 18 + Math.round(i * 0.7);
            const by = (isChild ? 28 : 24) - Math.round(i * 0.7);
            setPixel(f0, bx, by, C_BOW_WOOD);
            setPixel(f1, bx - 1, by, C_BOW_WOOD);
            setPixel(f2, bx, by, C_BOW_WOOD);
        }
        setPixel(f1, 24, isChild ? 29 : 25, C_SKIN_BASE);
    } else if (facing === 'N') {
        for (let y = yStart; y <= yEnd; y++) {
            const curve = (y >= yStart + 5 && y <= yEnd - 5) ? 27 : 26;
            setPixel(f0, curve, y, C_BOW_WOOD);
            setPixel(f1, curve, y, C_BOW_WOOD);
            setPixel(f2, curve, y, C_BOW_WOOD);
        }
        for (let y = yStart + 1; y <= yEnd - 1; y++) setPixel(f1, 25, y, C_BOW_STRING);
    }

    applyDarkOutline(f0, 48, 48);
    applyDarkOutline(f1, 48, 48);
    applyDarkOutline(f2, 48, 48);
    return [f0, f1, f2];
}

// Stage 4: Magic Cast
function buildMagicSet(baseStand, facing, isChild = false) {
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

    let handPts = [];
    let thrustPts = [];
    const yOff = isChild ? 5 : 0;

    if (facing === 'S') {
        handPts = [{ x: 17, y: 25 + yOff }, { x: 30, y: 25 + yOff }];
        thrustPts = [{ x: 16, y: 28 + yOff }, { x: 31, y: 28 + yOff }, { x: 24, y: 30 + yOff }];
    } else if (facing === 'SW') {
        handPts = [{ x: 15, y: 25 + yOff }, { x: 23, y: 26 + yOff }];
        thrustPts = [{ x: 12, y: 28 + yOff }, { x: 20, y: 30 + yOff }];
    } else if (facing === 'W') {
        handPts = [{ x: 14, y: 25 + yOff }, { x: 19, y: 25 + yOff }];
        thrustPts = [{ x: 10, y: 25 + yOff }, { x: 15, y: 25 + yOff }];
    } else if (facing === 'NW') {
        handPts = [{ x: 16, y: 19 + yOff }, { x: 23, y: 20 + yOff }];
        thrustPts = [{ x: 12, y: 17 + yOff }, { x: 20, y: 18 + yOff }];
    } else if (facing === 'N') {
        // Raised high above shoulders for North
        handPts = [{ x: 15, y: 15 + (isChild ? 6 : 0) }, { x: 32, y: 15 + (isChild ? 6 : 0) }];
        thrustPts = [{ x: 15, y: 12 + (isChild ? 6 : 0) }, { x: 32, y: 12 + (isChild ? 6 : 0) }, { x: 24, y: 10 + (isChild ? 6 : 0) }];
    }

    // F0: Focus hands
    handPts.forEach(pt => {
        setPixel(f0, pt.x, pt.y, C_SKIN_BASE);
        setPixel(f0, pt.x, pt.y + 1, C_SKIN_SHADE);
    });

    // F1: Radiant emerald glowing mana hands
    handPts.forEach(pt => {
        setPixel(f1, pt.x, pt.y, C_SKIN_BASE);
        const radius = isChild ? 1 : 2;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const dist = Math.abs(dx) + Math.abs(dy);
                if (dist <= radius) {
                    const col = (dist === 0) ? C_MANA_CORE : C_MANA_EDGE;
                    setPixel(f1, pt.x + dx, pt.y + dy, col);
                }
            }
        }
        setPixel(f1, pt.x - 2, pt.y, C_MANA_CORE);
        setPixel(f1, pt.x + 2, pt.y, C_MANA_CORE);
    });

    // F2: Thrust palms with expanding wave
    thrustPts.forEach(pt => {
        const radius = isChild ? 2 : 3;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const dist = Math.hypot(dx, dy);
                if (dist <= (isChild ? 2.0 : 2.8)) {
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

// Stage 5: Work / Harvest
function buildWorkSet(baseStand, facing, isChild = false) {
    const f0 = Buffer.alloc(48 * 48 * 4);
    const f1 = Buffer.alloc(48 * 48 * 4);
    const f2 = Buffer.alloc(48 * 48 * 4);

    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            if (baseStand[sIdx + 3] > 0) {
                let ty;
                if (!isChild) {
                    if (y < 22) ty = 13 + Math.round((y - 8) * 0.85);
                    else if (y < 34) ty = 25 + Math.round((y - 22) * 0.9);
                    else ty = 37 + Math.round((y - 34) * 0.77);
                } else {
                    // Child kneeling height: rows 26..47
                    if (y < 28) ty = 26 + Math.round((y - 18) * 0.6);
                    else if (y < 38) ty = 32 + Math.round((y - 28) * 0.8);
                    else ty = 40 + Math.round((y - 38) * (7 / 9)); // Exactly grounds row 47
                }
                if (ty >= 0 && ty < 48) {
                    const dIdx = (ty * 48 + x) * 4;
                    for (let f of [f0, f1, f2]) {
                        f[dIdx]     = baseStand[sIdx];
                        f[dIdx + 1] = baseStand[sIdx + 1];
                        f[dIdx + 2] = baseStand[sIdx + 2];
                        f[dIdx + 3] = 255;
                    }
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

    const workPt = {
        S:  { x: 24, y: isChild ? 43 : 39 },
        SW: { x: 19, y: isChild ? 44 : 40 },
        W:  { x: 17, y: isChild ? 44 : 41 },
        NW: { x: 18, y: isChild ? 43 : 40 },
        N:  { x: 24, y: isChild ? 42 : 38 }
    }[facing];

    if (!isChild) {
        // Carving knife blade & contact glint
        for (let i = -2; i <= 2; i++) setPixel(f1, workPt.x + i, workPt.y - i, C_STEEL_CORE);
        setPixel(f1, workPt.x, workPt.y, C_SLASH_ARC);
        setPixel(f1, workPt.x - 1, workPt.y + 1, C_BOW_WOOD);
    } else {
        // Child gathering berries / twigs
        setPixel(f1, workPt.x, workPt.y, C_SLASH_ARC);
        setPixel(f1, workPt.x - 1, workPt.y, C_BOW_WOOD);
        setPixel(f1, workPt.x + 1, workPt.y + 1, C_BLOOD_FLASH); // Berry red
        setPixel(f1, workPt.x, workPt.y + 1, C_TUNIC_BASE);
    }

    applyDarkOutline(f0, 48, 48);
    applyDarkOutline(f1, 48, 48);
    applyDarkOutline(f2, 48, 48);
    return [f0, f1, f2];
}

// Stage 6: Downed / Death / Sleep
function buildDownedSet(baseStand, facing, isFemale = false, isChild = false) {
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

    // F0: Hurt flinch
    const flinch = shiftFrame(baseStand, recoilVec.dx, recoilVec.dy);
    flinch.copy(f0);
    for (let y = isChild ? 28 : 24; y <= (isChild ? 34 : 30); y++) {
        for (let x = 20; x <= 28; x++) {
            const o = (y * 48 + x) * 4;
            if (f0[o + 3] > 0 && (x + y) % 3 === 0) {
                f0[o] = C_BLOOD_FLASH[0]; f0[o + 1] = C_BLOOD_FLASH[1]; f0[o + 2] = C_BLOOD_FLASH[2];
            }
        }
    }

    // F1: Kneeling collapse
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            if (baseStand[sIdx + 3] > 0) {
                let ty;
                if (!isChild) {
                    if (y < 22) ty = 22 + Math.round((y - 8) * 0.55);
                    else if (y < 34) ty = 30 + Math.round((y - 22) * 0.65);
                    else ty = 39 + Math.round((y - 34) * 0.6);
                } else {
                    if (y < 28) ty = 28 + Math.round((y - 18) * 0.5);
                    else if (y < 38) ty = 33 + Math.round((y - 28) * 0.7);
                    else ty = 40 + Math.round((y - 38) * (7 / 9)); // Exactly grounds row 47
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

    // F2: Horizontal resting corpse / sleep on rows 37..47
    const flip = (facing === 'W' || facing === 'NW');
    const startX = flip ? 8 : (isChild ? 14 : 10);
    const length = isChild ? 20 : 30;

    const setPixelF2 = (x, y, col) => {
        if (x >= 0 && x < 48 && y >= 0 && y < 48) {
            const o = (y * 48 + x) * 4;
            f2[o] = col[0]; f2[o + 1] = col[1]; f2[o + 2] = col[2]; f2[o + 3] = 255;
        }
    };

    for (let dx = 0; dx < length; dx++) {
        const px = flip ? (startX + length - 1 - dx) : (startX + dx);
        const h = isChild ? ((dx < 6) ? 5 : (dx < 14) ? 6 : 5) :
                            ((dx < 7) ? 6 : (dx < 16) ? 7 : (dx < 19) ? 6 : (dx < 25) ? 5 : 6);
        const topY = 48 - h;

        for (let y = topY; y < 48; y++) {
            const dy = y - topY;
            let col;
            if (dx < (isChild ? 6 : 7)) {
                // Head with silver hair
                if (y === topY || y === 47 || dx === 0) col = C_OUTLINE;
                else if (dy === 1) col = C_HAIR_BASE;
                else if (dy === 2) col = C_HAIR_SHADE;
                else col = C_SKIN_BASE;
            } else if (dx < (isChild ? 13 : 16)) {
                // Tunic
                if (y === topY || y === 47) col = C_OUTLINE;
                else if (dy === 1) col = C_TUNIC_BASE;
                else col = C_TUNIC_SHADE;
            } else if (!isChild && dx < 19) {
                col = (dy === 2) ? C_BUCKLE : C_BELT;
            } else if (dx < (isChild ? 17 : 25)) {
                // Trousers
                if (y === topY || y === 47) col = C_OUTLINE;
                else col = C_PANTS_BASE;
            } else {
                // Boots
                if (y === topY || y === 47 || dx === length - 1) col = C_OUTLINE;
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

// Assemble 8-directional charset (144 x 384 px)
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

function assemble18ColMaster(subSheets) {
    const master18Buf = Buffer.alloc(864 * 384 * 4);
    const sets = [
        { buf: subSheets.walk,   colOffset: 0 },
        { buf: subSheets.attack, colOffset: 3 },
        { buf: subSheets.bow,    colOffset: 6 },
        { buf: subSheets.magic,  colOffset: 9 },
        { buf: subSheets.work,   colOffset: 12 },
        { buf: subSheets.dead,   colOffset: 15 }
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
    quantizeSheet(master18Buf, 864, 384, 31);
    return master18Buf;
}

function assembleAR600Master(subSheets) {
    const ar600Buf = Buffer.alloc(960 * 384 * 4);
    const colMap = [
        { src: subSheets.walk, sc: 1 },    // 0: stand
        { src: subSheets.walk, sc: 0 },    // 1: walk L
        { src: subSheets.walk, sc: 1 },    // 2: walk pass
        { src: subSheets.walk, sc: 2 },    // 3: walk R
        { src: subSheets.work, sc: 0 },    // 4: work reach
        { src: subSheets.work, sc: 1 },    // 5: work carve
        { src: subSheets.work, sc: 2 },    // 6: work gather
        { src: subSheets.walk, sc: 1 },    // 7: stand (carry compat)
        { src: subSheets.attack, sc: 0 },  // 8: attack windup
        { src: subSheets.attack, sc: 1 },  // 9: attack strike
        { src: subSheets.attack, sc: 2 },  // 10: attack recover
        { src: subSheets.magic, sc: 0 },   // 11: magic ready
        { src: subSheets.magic, sc: 1 },   // 12: magic glow
        { src: subSheets.magic, sc: 2 },   // 13: magic thrust
        { src: subSheets.dead, sc: 0 },    // 14: hurt flinch
        { src: subSheets.dead, sc: 1 },    // 15: death collapse
        { src: subSheets.dead, sc: 2 },    // 16: death corpse
        { src: subSheets.dead, sc: 2 },    // 17: death corpse
        { src: subSheets.walk, sc: 1 },    // 18: idle
        { src: subSheets.walk, sc: 1 }     // 19: idle
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
    return ar600Buf;
}

function saveCharsetWithSidecar(buf, baseName, species, actionTag, animations, stage = 'adult') {
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
        stage: stage,
        action: actionTag
    };
    fs.writeFileSync(path.join(CHAR_DIR, `$UF_${baseName}.json`), JSON.stringify(sidecar, null, 2));
}

// ----------------------------------------------------------------------------
// Build Suite for Demographic
// ----------------------------------------------------------------------------
function buildDemographicSuite(demographicName, walkFrames, isFemale = false, isChild = false) {
    console.log(`\nSynthesizing complete 18x8 standard suite for ${demographicName}...`);

    const attackFrames = {
        S:  buildAttackSet(walkFrames.S[1], 'S', isChild),
        SW: buildAttackSet(walkFrames.SW[1], 'SW', isChild),
        W:  buildAttackSet(walkFrames.W[1], 'W', isChild),
        NW: buildAttackSet(walkFrames.NW[1], 'NW', isChild),
        N:  buildAttackSet(walkFrames.N[1], 'N', isChild)
    };

    const bowFrames = {
        S:  buildBowSet(walkFrames.S[1], 'S', isChild),
        SW: buildBowSet(walkFrames.SW[1], 'SW', isChild),
        W:  buildBowSet(walkFrames.W[1], 'W', isChild),
        NW: buildBowSet(walkFrames.NW[1], 'NW', isChild),
        N:  buildBowSet(walkFrames.N[1], 'N', isChild)
    };

    const magicFrames = {
        S:  buildMagicSet(walkFrames.S[1], 'S', isChild),
        SW: buildMagicSet(walkFrames.SW[1], 'SW', isChild),
        W:  buildMagicSet(walkFrames.W[1], 'W', isChild),
        NW: buildMagicSet(walkFrames.NW[1], 'NW', isChild),
        N:  buildMagicSet(walkFrames.N[1], 'N', isChild)
    };

    const workFrames = {
        S:  buildWorkSet(walkFrames.S[1], 'S', isChild),
        SW: buildWorkSet(walkFrames.SW[1], 'SW', isChild),
        W:  buildWorkSet(walkFrames.W[1], 'W', isChild),
        NW: buildWorkSet(walkFrames.NW[1], 'NW', isChild),
        N:  buildWorkSet(walkFrames.N[1], 'N', isChild)
    };

    const deadFrames = {
        S:  buildDownedSet(walkFrames.S[1], 'S', isFemale, isChild),
        SW: buildDownedSet(walkFrames.SW[1], 'SW', isFemale, isChild),
        W:  buildDownedSet(walkFrames.W[1], 'W', isFemale, isChild),
        NW: buildDownedSet(walkFrames.NW[1], 'NW', isFemale, isChild),
        N:  buildDownedSet(walkFrames.N[1], 'N', isFemale, isChild)
    };

    const subSheets = {
        walk:   assemble8DCharset(walkFrames),
        attack: assemble8DCharset(attackFrames),
        bow:    assemble8DCharset(bowFrames),
        magic:  assemble8DCharset(magicFrames),
        work:   assemble8DCharset(workFrames),
        dead:   assemble8DCharset(deadFrames)
    };

    const master18 = assemble18ColMaster(subSheets);
    const ar600    = assembleAR600Master(subSheets);

    // Write Native 18-col master
    const masterPath = path.join(MASTER_DIR, `Elf_${demographicName}_Standard_8D_18Col.png`);
    fs.writeFileSync(masterPath, writePNG(master18, 864, 384));
    console.log(`Saved ${masterPath}`);

    // Write AR-600 sheet
    const ar600Path = path.join(CHAR_DIR, `$UF_Elf_${demographicName}_AR600.png`);
    fs.writeFileSync(ar600Path, writePNG(ar600, 960, 384));
    const stage = isChild ? 'child' : 'adult';
    fs.writeFileSync(path.join(CHAR_DIR, `$UF_Elf_${demographicName}_AR600.json`), JSON.stringify({
        frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
        facings: ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'],
        animations: { stand: [0], walk: [1, 2, 3, 2], work: [4, 5, 6], attack: [8, 9, 10], cast: [11, 12, 13], hurt: [14], dead: [15, 16] },
        frameMs: 200, species: 'elf', demographic: demographicName, stage: stage
    }, null, 2));

    // Write Sub-charsets
    saveCharsetWithSidecar(subSheets.walk,   `Elf_${demographicName}_8D`,        'Elf', 'Walk',   { walk: [0, 1, 2, 1], stand: [1] }, stage);
    saveCharsetWithSidecar(subSheets.attack, `Elf_${demographicName}_Attack_8D`, 'Elf', 'Attack', { attack: [0, 1, 2] }, stage);
    saveCharsetWithSidecar(subSheets.bow,    `Elf_${demographicName}_Bow_8D`,    'Elf', 'Bow',    { shoot: [0, 1, 2] }, stage);
    saveCharsetWithSidecar(subSheets.magic,  `Elf_${demographicName}_Magic_8D`,  'Elf', 'Cast',   { cast: [0, 1, 2] }, stage);
    saveCharsetWithSidecar(subSheets.work,   `Elf_${demographicName}_Work_8D`,   'Elf', 'Work',   { work: [0, 1, 2] }, stage);
    saveCharsetWithSidecar(subSheets.dead,   `Elf_${demographicName}_Dead_8D`,   'Elf', 'Dead',   { hurt: [0], collapse: [1], dead: [2], sleep: [2] }, stage);

    return { subSheets, master18, ar600 };
}

// ----------------------------------------------------------------------------
// Run Demographics Generation: Male, Female, Child
// ----------------------------------------------------------------------------
const maleSuite   = buildDemographicSuite('Male', maleWalkFrames, false, false);
const femaleSuite = buildDemographicSuite('Female', femaleWalkFrames, true, false);
const childSuite  = buildDemographicSuite('Child', childWalkFrames, false, true);

// Keep root $UF_Elf_8D aliases pointing to Male (default baseline)
saveCharsetWithSidecar(maleSuite.subSheets.walk,   'Elf_8D',        'Elf', 'Walk',   { walk: [0, 1, 2, 1], stand: [1] });
saveCharsetWithSidecar(maleSuite.subSheets.attack, 'Elf_Attack_8D', 'Elf', 'Attack', { attack: [0, 1, 2] });
saveCharsetWithSidecar(maleSuite.subSheets.bow,    'Elf_Bow_8D',    'Elf', 'Bow',    { shoot: [0, 1, 2] });
saveCharsetWithSidecar(maleSuite.subSheets.magic,  'Elf_Magic_8D',  'Elf', 'Cast',   { cast: [0, 1, 2] });
saveCharsetWithSidecar(maleSuite.subSheets.work,   'Elf_Work_8D',   'Elf', 'Work',   { work: [0, 1, 2] });
saveCharsetWithSidecar(maleSuite.subSheets.dead,   'Elf_Dead_8D',   'Elf', 'Dead',   { hurt: [0], collapse: [1], dead: [2], sleep: [2] });
fs.writeFileSync(path.join(CHAR_DIR, '$UF_Elf_AR600.png'), writePNG(maleSuite.ar600, 960, 384));

// Save master review sheets in art/masters
fs.writeFileSync(path.join(MASTER_DIR, 'elf_male.png'), writePNG(maleSuite.ar600, 960, 384));
fs.writeFileSync(path.join(MASTER_DIR, 'elf_female.png'), writePNG(femaleSuite.ar600, 960, 384));
fs.writeFileSync(path.join(MASTER_DIR, 'elf_child.png'), writePNG(childSuite.ar600, 960, 384));

// ----------------------------------------------------------------------------
// Step 4: Build Family Comparison Review Board (Male, Female, Child)
// ----------------------------------------------------------------------------
console.log('\nRendering Elf Demographics Family Review Board...');
const boardW = 864 * 2; // 2x zoom: 1728 px wide
const boardH = (384 * 3 + 120) * 2; // 3 demographics stacked + headers: 2544 px
const boardBuf = Buffer.alloc(boardW * boardH * 4);

// Background dark slate
for (let i = 0; i < boardBuf.length; i += 4) {
    boardBuf[i] = 20; boardBuf[i + 1] = 24; boardBuf[i + 2] = 30; boardBuf[i + 3] = 255;
}

const demos = [
    { name: 'ADULT MALE (40px)', master: maleSuite.master18, yOffset: 30 },
    { name: 'ADULT FEMALE (39px)', master: femaleSuite.master18, yOffset: 430 },
    { name: 'CHILD / KID (30px)', master: childSuite.master18, yOffset: 830 }
];

demos.forEach(d => {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 18; c++) {
            for (let py = 0; py < 48; py++) {
                for (let px = 0; px < 48; px++) {
                    const sIdx = ((r * 48 + py) * 864 + (c * 48 + px)) * 4;
                    if (d.master[sIdx + 3] > 0) {
                        for (let dy = 0; dy < 2; dy++) {
                            for (let dx = 0; dx < 2; dx++) {
                                const bx = (c * 48 + px) * 2 + dx;
                                const by = (d.yOffset + r * 48 + py) * 2 + dy;
                                const dIdx = (by * boardW + bx) * 4;
                                boardBuf[dIdx]     = d.master[sIdx];
                                boardBuf[dIdx + 1] = d.master[sIdx + 1];
                                boardBuf[dIdx + 2] = d.master[sIdx + 2];
                                boardBuf[dIdx + 3] = 255;
                            }
                        }
                    }
                }
            }
        }
    }
});

const reviewBoardPath = path.join(REVIEW_DIR, 'elf_demographics_family_board.png');
fs.writeFileSync(reviewBoardPath, writePNG(boardBuf, boardW, boardH));
console.log(`Saved review board: ${reviewBoardPath}`);

// Copy to brain artifacts
const BRAIN_DIR = 'C:/Users/snewt/.gemini/antigravity/brain/e6a9a54f-2cc6-432e-b7ec-5affda42dd85';
fs.copyFileSync(reviewBoardPath, path.join(BRAIN_DIR, 'elf_demographics_family_board.png'));
console.log('Copied to brain artifact.');

console.log('\n=== Elf Demographics Generation Successfully Completed! ===');
