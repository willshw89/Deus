'use strict';

/**
 * tools/build_perfect_male_orc.js
 *
 * UNIFORM SCALE BUILDER for Adult Male Orc (Mountain Orc Settler / Raider)
 * across ALL 7 12-SPRITE ACTION SUITES:
 * 1. Walk   (12 sprites: 3 Down, 3 Left, 3 Right, 3 Up) - Master Walk Sheet
 * 2. Haul   (12 sprites) - Dedicated heavy cargo carrying cycle held in front of chest
 * 3. Attack (12 sprites) - Melee brutal notched iron chopper / cleaver cleave strike with slash arc
 * 4. Bow    (12 sprites) - Heavy war bow aim, draw, and pluck recoil (ZERO flying arrows)
 * 5. Magic  (12 sprites) - Shamanic blood totem chant with soft red mana aura (ZERO flying beams)
 * 6. Work   (12 sprites) - Kneeling crafting/smithing striking anvil with hammer (~30px height)
 * 7. Downed (12 sprites) - Hurt flinch stagger, kneeling collapse (~28px), flat horizontal corpse (~16px)
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

// Target orc height: ~44px in RMMZ (muscular ~3.0 heads, grounded at y = 47)
let UNIFORM_SCALE = 44.0 / 250.0;

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

function extractGridBBoxes(rawImg, cols, rows) {
    const cellW = rawImg.width / cols;
    const cellH = rawImg.height / rows;
    const grid = [];

    for (let r = 0; r < rows; r++) {
        const row = [];
        const y0 = Math.round(r * cellH);
        const y1 = Math.round((r + 1) * cellH) - 1;
        for (let c = 0; c < cols; c++) {
            const x0 = Math.round(c * cellW);
            const x1 = Math.round((c + 1) * cellW) - 1;
            let minX = x1, maxX = x0, minY = y1, maxY = y0, count = 0;
            for (let y = y0; y <= y1; y++) {
                for (let x = x0; x <= x1; x++) {
                    const idx = (y * rawImg.width + x) * 4;
                    if (!isMagenta(rawImg.data[idx], rawImg.data[idx + 1], rawImg.data[idx + 2])) {
                        count++;
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }
            row.push({ x0: minX, x1: maxX, y0: minY, y1: maxY, count });
        }
        grid.push(row);
    }
    return grid;
}

function extractUniformSprite(rawImg, bbox) {
    const out = Buffer.alloc(48 * 48 * 4);
    if (!bbox || bbox.count === 0) return out;

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
        species: 'orc',
        stage: 'adult',
        gender: 'male',
        action: actionTag,
        style: 'Serious Chibi (VISION V116)',
        generator: 'Google Nano Banana Pro (Rule 11, VISION V109)'
    };
    fs.writeFileSync(path.join(CHAR_DIR, `$UF_${baseName}.json`), JSON.stringify(sidecar, null, 2));
    console.log(`Saved $UF_${baseName}.png and .json`);
}

function shiftFrameY(frame, dy) {
    const out = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        const srcY = y - dy;
        if (srcY < 0 || srcY >= 48) continue;
        for (let x = 0; x < 48; x++) {
            const sIdx = (srcY * 48 + x) * 4;
            const dIdx = (y * 48 + x) * 4;
            out[dIdx]     = frame[sIdx];
            out[dIdx + 1] = frame[sIdx + 1];
            out[dIdx + 2] = frame[sIdx + 2];
            out[dIdx + 3] = frame[sIdx + 3];
        }
    }
    return out;
}

function processAction(rawFileName, actionTag, animations) {
    const rawPath = path.join(RAW_DIR, rawFileName);
    if (!fs.existsSync(rawPath)) {
        throw new Error(`Raw file not found: ${rawPath}`);
    }
    const rawImg = decodePNG(fs.readFileSync(rawPath));

    let S, W, E, N;

    // Detect grid layout (typically 3 cols x 4 rows, or 6 cols x 3 rows)
    const grid4x3 = extractGridBBoxes(rawImg, 3, 4);
    const hasRow3 = grid4x3[3] && grid4x3[3].some(b => b.count > 50);

    if (hasRow3) {
        // Standard 3 cols x 4 rows
        S = [grid4x3[0][0], grid4x3[0][1], grid4x3[0][2]].map(b => extractUniformSprite(rawImg, b));
        W = [grid4x3[1][0], grid4x3[1][1], grid4x3[1][2]].map(b => extractUniformSprite(rawImg, b));
        E = [grid4x3[2][0], grid4x3[2][1], grid4x3[2][2]].map(b => extractUniformSprite(rawImg, b));
        N = [grid4x3[3][0], grid4x3[3][1], grid4x3[3][2]].map(b => extractUniformSprite(rawImg, b));
    } else {
        // 6 cols x 3 rows layout
        const grid6x3 = extractGridBBoxes(rawImg, 6, 3);
        S = [grid6x3[0][0], grid6x3[0][1], grid6x3[0][2]].map(b => extractUniformSprite(rawImg, b));
        W = [grid6x3[1][0], grid6x3[1][1], grid6x3[1][2]].map(b => extractUniformSprite(rawImg, b));
        E = W.map(mirrorFrame);
        N = [grid6x3[2][3], grid6x3[2][4], grid6x3[2][5]].map(b => extractUniformSprite(rawImg, b));
    }

    if (actionTag === 'Walk') {
        // Calibrate scale from standing south frame (col 1)
        const standBBox = hasRow3 ? grid4x3[0][1] : extractGridBBoxes(rawImg, 6, 3)[0][1];
        const standH = standBBox.y1 - standBBox.y0;
        console.log(`Calibrating scale from walk standing sprite raw height = ${standH}px`);
        UNIFORM_SCALE = 44.0 / standH;
        console.log(`Calibrated UNIFORM_SCALE = ${UNIFORM_SCALE.toFixed(6)} (Target: 44px in RMMZ)`);

        // Re-extract walk sprites with calibrated uniform scale
        if (hasRow3) {
            S = [grid4x3[0][0], grid4x3[0][1], grid4x3[0][2]].map(b => extractUniformSprite(rawImg, b));
            W = [grid4x3[1][0], grid4x3[1][1], grid4x3[1][2]].map(b => extractUniformSprite(rawImg, b));
            E = [grid4x3[2][0], grid4x3[2][1], grid4x3[2][2]].map(b => extractUniformSprite(rawImg, b));
            N = [grid4x3[3][0], grid4x3[3][1], grid4x3[3][2]].map(b => extractUniformSprite(rawImg, b));
        } else {
            const grid6x3 = extractGridBBoxes(rawImg, 6, 3);
            S = [grid6x3[0][0], grid6x3[0][1], grid6x3[0][2]].map(b => extractUniformSprite(rawImg, b));
            W = [grid6x3[1][0], grid6x3[1][1], grid6x3[1][2]].map(b => extractUniformSprite(rawImg, b));
            E = W.map(mirrorFrame);
            N = [grid6x3[2][3], grid6x3[2][4], grid6x3[2][5]].map(b => extractUniformSprite(rawImg, b));
        }
    }

    const sheet = assemble12Charset({ S, W, E, N });
    saveSheetAndSidecar(sheet, `Orc_Male_${actionTag}`, actionTag, animations);
    return sheet;
}

function buildAll() {
    console.log('=== Building Adult Male Orc 7-Action 12-Sprite Action Suite ===\n');

    // 1. Walk (Calibrates UNIFORM_SCALE)
    console.log('1. Walk...');
    const walkSheet = processAction('orc_male_walk_12_raw.png', 'Walk', { walk: [0, 1, 2, 1], stand: [1] });
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Orc_Male.png'), writePNG(walkSheet, 144, 192));
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Orc.png'), writePNG(walkSheet, 144, 192));
    console.log('Updated $UF_Orc_Male.png and $UF_Orc.png aliases');

    // 2. Haul
    console.log('2. Haul...');
    const haulSheet = processAction('orc_male_haul_12_raw.png', 'Haul', { haul: [0, 1, 2, 1], carry: [1], stand: [1] });

    // 3. Attack (Cleaver)
    console.log('3. Attack (Cleaver)...');
    const attackSheet = processAction('orc_male_attack_12_raw.png', 'Attack', { attack: [0, 1, 2], stand: [0] });
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Orc_Attack_Cleaver.png'), writePNG(attackSheet, 144, 192));

    // 4. Bow (War Bow)
    console.log('4. Bow (War Bow)...');
    const bowSheet = processAction('orc_male_bow_12_raw.png', 'Bow', { bow: [0, 1, 2], stand: [0] });
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Orc_Attack_Bow.png'), writePNG(bowSheet, 144, 192));

    // 5. Magic (Blood Totem)
    console.log('5. Magic (Blood Totem)...');
    const magicSheet = processAction('orc_male_magic_12_raw.png', 'Magic', { cast: [0, 1, 2], stand: [0] });
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Orc_Cast_Totem.png'), writePNG(magicSheet, 144, 192));

    // 6. Work
    console.log('6. Work (Blacksmith/Butcher)...');
    const workSheet = processAction('orc_male_work_12_raw.png', 'Work', { work: [0, 1, 2], stand: [0] });

    // 7. Downed
    console.log('7. Downed...');
    const downedSheet = processAction('orc_male_downed_12_raw.png', 'Downed', { hurt: [0], collapse: [1], dead: [2] });

    // Assemble 7-action showcase
    console.log('\nAssembling 7-action master showcase...');
    const showcaseW = 7 * 3 * 48; // 1008 px
    const showcaseH = 4 * 48;      // 192 px
    const showcaseBuf = Buffer.alloc(showcaseW * showcaseH * 4);

    const sheets = [walkSheet, haulSheet, attackSheet, bowSheet, magicSheet, workSheet, downedSheet];
    for (let a = 0; a < 7; a++) {
        const cur = sheets[a];
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 3; c++) {
                for (let py = 0; py < 48; py++) {
                    for (let px = 0; px < 48; px++) {
                        const sIdx = ((r * 48 + py) * 144 + (c * 48 + px)) * 4;
                        const dCol = a * 3 + c;
                        const dIdx = ((r * 48 + py) * showcaseW + (dCol * 48 + px)) * 4;
                        showcaseBuf[dIdx]     = cur[sIdx];
                        showcaseBuf[dIdx + 1] = cur[sIdx + 1];
                        showcaseBuf[dIdx + 2] = cur[sIdx + 2];
                        showcaseBuf[dIdx + 3] = cur[sIdx + 3];
                    }
                }
            }
        }
    }

    fs.mkdirSync(REVIEW_DIR, { recursive: true });
    const reviewPath = path.join(REVIEW_DIR, 'orc_male_all_7_actions_12_sprites.png');
    fs.writeFileSync(reviewPath, writePNG(showcaseBuf, showcaseW, showcaseH));
    console.log(`Saved 7-action showcase: ${reviewPath}`);
}

if (require.main === module) {
    try {
        buildAll();
    } catch (err) {
        console.error('Build error:', err);
        process.exit(1);
    }
}

module.exports = { buildAll };
