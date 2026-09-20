'use strict';

/**
 * tools/build_perfect_female_human.js
 *
 * UNIFORM SCALE BUILDER for Adult Female Human (Eve / Settler)
 * across ALL 7 12-SPRITE ACTION SUITES:
 * 1. Walk   (12 sprites: 3 Down, 3 Left, 3 Right, 3 Up) - Master Walk Sheet
 * 2. Haul   (12 sprites) - Dedicated heavy burlap sack carrying pose in front of chest
 * 3. Attack (12 sprites) - Melee short sword strike with curved slash arc
 * 4. Bow    (12 sprites) - Archery aim, tension draw, and string pluck (ZERO flying arrows)
 * 5. Magic  (12 sprites) - Spell initiation incantation chant & soft palm aura (ZERO flying beams)
 * 6. Work   (12 sprites) - Reaching, kneeling craft & hammer strike (~28px height)
 * 7. Downed (12 sprites) - Hurt flinch recoil, kneeling collapse (~26px), flat horizontal corpse (~16px)
 *
 * Generated from authentic Google Nano Banana Pro (gemini-3-pro-image) generations
 * conditioned on the first master 12-sprite walk reference.
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'raw');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// Uniform scale: 238px raw standing height -> 42px native RMMZ height
const UNIFORM_SCALE = 42.0 / 238.0;

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

function findRowBands(img) {
    const rowHas = new Array(img.height).fill(false);
    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
            const idx = (y * img.width + x) * 4;
            if (!isMagenta(img.data[idx], img.data[idx + 1], img.data[idx + 2])) {
                rowHas[y] = true;
                break;
            }
        }
    }
    const bands = [];
    let inR = false, y0 = 0;
    for (let y = 0; y < img.height; y++) {
        if (rowHas[y] && !inR) { inR = true; y0 = y; }
        else if (!rowHas[y] && inR) { inR = false; if (y - y0 > 30) bands.push({ y0, y1: y - 1 }); }
    }
    if (inR && (img.height - y0 > 30)) bands.push({ y0, y1: img.height - 1 });
    return bands;
}

function findSpritesInBand(img, y0, y1) {
    const colHas = new Array(img.width).fill(false);
    for (let x = 0; x < img.width; x++) {
        for (let y = y0; y <= y1; y++) {
            const idx = (y * img.width + x) * 4;
            if (!isMagenta(img.data[idx], img.data[idx + 1], img.data[idx + 2])) {
                colHas[x] = true;
                break;
            }
        }
    }
    const cols = [];
    let inC = false, x0 = 0;
    for (let x = 0; x < img.width; x++) {
        if (colHas[x] && !inC) { inC = true; x0 = x; }
        else if (!colHas[x] && inC) { inC = false; if (x - x0 > 25) cols.push({ x0, x1: x - 1 }); }
    }
    if (inC && (img.width - x0 > 25)) cols.push({ x0, x1: img.width - 1 });

    return cols.map(c => {
        let topY = y1, botY = y0;
        for (let y = y0; y <= y1; y++) {
            for (let x = c.x0; x <= c.x1; x++) {
                const idx = (y * img.width + x) * 4;
                if (!isMagenta(img.data[idx], img.data[idx + 1], img.data[idx + 2])) {
                    if (y < topY) topY = y;
                    if (y > botY) botY = y;
                }
            }
        }
        return { x0: c.x0, x1: c.x1, y0: topY, y1: botY };
    });
}

/**
 * Extracts a sprite at UNIFORM_SCALE anchored to native baseline y = 47.
 */
function extractUniformSprite(rawImg, bbox, isProne = false) {
    const out = Buffer.alloc(48 * 48 * 4);
    const rawFootY = bbox.y1;
    const rawCenterX = (bbox.x0 + bbox.x1) / 2;

    for (let outY = 0; outY < 48; outY++) {
        const dyFromBase = 47 - outY;
        const rawY0 = Math.round(rawFootY - (dyFromBase + 1) / UNIFORM_SCALE);
        const rawY1 = Math.round(rawFootY - dyFromBase / UNIFORM_SCALE);

        if (rawY1 < bbox.y0 || rawY0 > bbox.y1 || rawY1 < 0 || rawY0 >= rawImg.height) continue;

        for (let outX = 0; outX < 48; outX++) {
            const dxFromCenter = outX - 24;
            const rawX0 = Math.round(rawCenterX + dxFromCenter / UNIFORM_SCALE);
            const rawX1 = Math.round(rawCenterX + (dxFromCenter + 1) / UNIFORM_SCALE);

            if (rawX1 < bbox.x0 || rawX0 > bbox.x1 || rawX1 < 0 || rawX0 >= rawImg.width) continue;

            let sumR = 0, sumG = 0, sumB = 0, count = 0;
            for (let ry = Math.max(bbox.y0, rawY0); ry <= Math.min(bbox.y1, rawY1); ry++) {
                for (let rx = Math.max(bbox.x0, rawX0); rx <= Math.min(bbox.x1, rawX1); rx++) {
                    const idx = (ry * rawImg.width + rx) * 4;
                    const r = rawImg.data[idx], g = rawImg.data[idx + 1], b = rawImg.data[idx + 2];
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

function assemble12Charset(framesByFacing) {
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
                    const dIdx = ((r * 48 + py) * 144 + (c * 48 + px)) * 4;
                    buf[dIdx]     = frame[sIdx];
                    buf[dIdx + 1] = frame[sIdx + 1];
                    buf[dIdx + 2] = frame[sIdx + 2];
                    buf[dIdx + 3] = frame[sIdx + 3];
                }
            }
        }
    }
    quantizeSheet(buf, 144, 192, 31);
    return buf;
}

function saveSheetAndSidecar(buf, baseName, actionTag, animations) {
    const pngPath = path.join(CHAR_DIR, `$UF_${baseName}.png`);
    fs.writeFileSync(pngPath, writePNG(buf, 144, 192));

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
        gender: 'female',
        action: actionTag,
        style: 'Serious Chibi (VISION V116)',
        generator: 'Google Nano Banana Pro (Rule 11, VISION V109)'
    };
    fs.writeFileSync(path.join(CHAR_DIR, `$UF_${baseName}.json`), JSON.stringify(sidecar, null, 2));
    console.log(`Saved $UF_${baseName}.png and .json`);
}

function processAction(rawFileName, actionTag, animations, customExtract = null) {
    const rawImg = decodePNG(fs.readFileSync(path.join(RAW_DIR, rawFileName)));
    const bands = findRowBands(rawImg);
    const row0 = findSpritesInBand(rawImg, bands[0].y0, bands[0].y1);
    const row1 = findSpritesInBand(rawImg, bands[1].y0, bands[1].y1);
    const row2 = findSpritesInBand(rawImg, bands[2].y0, bands[2].y1);

    const S = [row0[0], row0[1], row0[2]].map(b => extractUniformSprite(rawImg, b));
    const W = [row0[3], row0[4], row0[5]].map(b => extractUniformSprite(rawImg, b));
    const E = (row1.length >= 3) ? [row1[0], row1[1], row1[2]].map(b => extractUniformSprite(rawImg, b)) : W.map(mirrorFrame);
    const N = [row2[0], row2[1], row2[2]].map(b => extractUniformSprite(rawImg, b));

    const sheet = assemble12Charset({ S, W, E, N });
    saveSheetAndSidecar(sheet, `Human_Female_${actionTag}`, actionTag, animations);
    return sheet;
}

console.log('=== Building Adult Female Human 12-Sprite Action Suite (Serious Chibi) ===\n');

// 1. Walk (Master Sheet)
console.log('1. Walk...');
const walkSheet = processAction('human_female_walk_12_raw.png', 'Walk', { walk: [0, 1, 2, 1], stand: [1] });
// Also write aliases for engine
fs.writeFileSync(path.join(CHAR_DIR, '$UF_Human_Female.png'), writePNG(walkSheet, 144, 192));
fs.writeFileSync(path.join(CHAR_DIR, '$Eve.png'), writePNG(walkSheet, 144, 192));
console.log('Updated $UF_Human_Female.png and $Eve.png with authentic Walk sheet');

// 2. Haul
console.log('2. Haul...');
const haulSheet = processAction('human_female_haul_12_raw.png', 'Haul', { haul: [0, 1, 2, 1], carry: [1], stand: [1] });

// 3. Attack
console.log('3. Attack...');
const attackSheet = processAction('human_female_attack_12_raw.png', 'Attack', { attack: [0, 1, 2] });

// 4. Bow
console.log('4. Bow...');
const bowSheet = processAction('human_female_bow_12_raw.png', 'Bow', { shoot: [0, 1, 2], pluck: [2] });

// 5. Magic
console.log('5. Magic...');
const magicSheet = processAction('human_female_magic_12_raw.png', 'Magic', { cast: [0, 1, 2] });

// 6. Work
console.log('6. Work...');
const workSheet = processAction('human_female_work_12_raw.png', 'Work', { work: [0, 1, 2] });

// 7. Downed
console.log('7. Downed...');
const downedSheet = processAction('human_female_downed_12_raw.png', 'Downed', { hurt: [0], collapse: [1], dead: [2], sleep: [2] });

// 8. Build 7-Action Composite Review Showcase (1008 x 192 px)
console.log('\nBuilding 7-Action Review Showcase (art/review/human_female_all_7_actions_12_sprites.png)...');
const compW = 144 * 7; // 1008
const compH = 192;
const compBuf = Buffer.alloc(compW * compH * 4);
const allSheets = [walkSheet, haulSheet, attackSheet, bowSheet, magicSheet, workSheet, downedSheet];

for (let a = 0; a < 7; a++) {
    const sBuf = allSheets[a];
    const offX = a * 144;
    for (let y = 0; y < 192; y++) {
        for (let x = 0; x < 144; x++) {
            const sIdx = (y * 144 + x) * 4;
            const dIdx = (y * compW + (offX + x)) * 4;
            compBuf[dIdx]     = sBuf[sIdx];
            compBuf[dIdx + 1] = sBuf[sIdx + 1];
            compBuf[dIdx + 2] = sBuf[sIdx + 2];
            compBuf[dIdx + 3] = sBuf[sIdx + 3];
        }
    }
}

fs.mkdirSync(REVIEW_DIR, { recursive: true });
const reviewPath = path.join(REVIEW_DIR, 'human_female_all_7_actions_12_sprites.png');
fs.writeFileSync(reviewPath, writePNG(compBuf, compW, compH));
console.log(`Saved review showcase: ${reviewPath}`);

console.log('\n=== Adult Female Human Action Suite Complete ===');
