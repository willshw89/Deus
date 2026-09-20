#!/usr/bin/env node
'use strict';

/**
 * tools/process_nano_banana_4d_charsets.js
 *
 * Fully standardized 4-Directional Charset Builder from 100% Google Nano Banana Pro Generations:
 * - 4 Facings (Standard RMMZ 3x4 layout, 144x192 px):
 *   Row 0: Down (South)
 *   Row 1: Left (West)
 *   Row 2: Right (East - horizontally mirrored West)
 *   Row 3: Up (North)
 * - 7 Core Actions:
 *   1. Walk (Movement stride)
 *   2. Attack (Melee slash/strike)
 *   3. Bow (Archery string pluck - projectile animated in engine)
 *   4. Magic (Casting pose / radiant glowy hands - missile animated in engine)
 *   5. Work (Reach, kneel, craft/harvest)
 *   6. Downed (Flinch hurt, kneeling collapse, horizontal resting corpse/sleep)
 *   7. Haul (Dedicated carrying pose holding bulging burlap sack)
 * - 3 Demographics: Adult Male (40px), Adult Female (39px), Elf Child (30px)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const MASTER_DIR = path.join(ROOT, 'art', 'masters');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');
const RAW_DIR = path.join(ROOT, 'art', 'raw');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// ----------------------------------------------------------------------------
// Color Mathematics & CIELAB
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

const C_OUTLINE     = pal.snap(24, 20, 32);
const C_SKIN_BASE   = pal.snap(232, 192, 160);
const C_SKIN_SHADE  = pal.snap(184, 144, 116);
const C_HAIR_BASE   = pal.snap(225, 230, 240);
const C_HAIR_SHADE  = pal.snap(160, 168, 184);
const C_TUNIC_BASE  = pal.snap(48, 140, 48);
const C_TUNIC_SHADE = pal.snap(28, 88, 32);
const C_TRIM_SILVER = pal.snap(210, 218, 230);
const C_PANTS_BASE  = pal.snap(88, 64, 48);
const C_PANTS_SHADE = pal.snap(52, 38, 28);
const C_SACK_LIGHT  = pal.snap(210, 180, 135);
const C_SACK_BASE   = pal.snap(175, 140, 95);
const C_SACK_SHADE  = pal.snap(120, 85, 50);
const C_SACK_ROPE   = pal.snap(240, 230, 195);

// ----------------------------------------------------------------------------
// Image Loading & Processing Helpers
// ----------------------------------------------------------------------------
function loadJpg(jpgPath) {
    const tmpPng = path.join(os.tmpdir(), `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${jpgPath.replace(/'/g, "''")}'); $img.Save('${tmpPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    const buf = fs.readFileSync(tmpPng);
    fs.unlinkSync(tmpPng);
    return decodePNG(buf, path.basename(jpgPath));
}

function isMagenta(r, g, b) {
    return (r > 165 && g < 85 && b > 165);
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
                // Don't overwrite bright spell glow or blade glint
                if (!(r > 120 && g > 210 && b > 120) && !(r > 230 && g > 230 && b > 240)) {
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

/**
 * Extracts a sprite cell from a bounding box, downscales to 48x48 native,
 * grounds baseline on row 47, and snaps to palette.
 */
function extractNativeFrame(rawImg, bbox, targetHeight = 40, isDowned = false) {
    const bboxW = bbox.x1 - bbox.x0 + 1;
    const bboxH = bbox.y1 - bbox.y0 + 1;

    // Downscale ratio
    const scale = targetHeight / bboxH;
    const targetW = Math.max(1, Math.min(46, Math.round(bboxW * scale)));
    const startX = Math.round(24 - targetW / 2);
    const startY = isDowned ? (48 - targetHeight) : (48 - targetHeight); // Grounded row 47

    const out48 = Buffer.alloc(48 * 48 * 4);

    for (let dy = 0; dy < targetHeight; dy++) {
        const outY = startY + dy;
        if (outY < 0 || outY >= 48) continue;
        const srcY0 = bbox.y0 + Math.floor(dy / scale);
        const srcY1 = bbox.y0 + Math.floor((dy + 1) / scale);

        for (let dx = 0; dx < targetW; dx++) {
            const outX = startX + dx;
            if (outX < 0 || outX >= 48) continue;

            const srcX0 = bbox.x0 + Math.floor(dx / scale);
            const srcX1 = bbox.x0 + Math.floor((dx + 1) / scale);

            let sumR = 0, sumG = 0, sumB = 0, count = 0;
            for (let sy = srcY0; sy < srcY1 && sy < rawImg.height; sy++) {
                for (let sx = srcX0; sx < srcX1 && sx < rawImg.width; sx++) {
                    const sidx = (sy * rawImg.width + sx) * 4;
                    const r = rawImg.data[sidx];
                    const g = rawImg.data[sidx + 1];
                    const b = rawImg.data[sidx + 2];
                    if (!isMagenta(r, g, b)) {
                        sumR += r; sumG += g; sumB += b;
                        count++;
                    }
                }
            }

            const cellPixels = Math.max(1, (srcY1 - srcY0) * (srcX1 - srcX0));
            if (count > cellPixels * 0.35) {
                const avgR = Math.round(sumR / count);
                const avgG = Math.round(sumG / count);
                const avgB = Math.round(sumB / count);
                const snapped = pal.snap(avgR, avgG, avgB);
                const outIdx = (outY * 48 + outX) * 4;
                out48[outIdx]     = snapped[0];
                out48[outIdx + 1] = snapped[1];
                out48[outIdx + 2] = snapped[2];
                out48[outIdx + 3] = 255;
            }
        }
    }

    applyDarkOutline(out48, 48, 48);
    return out48;
}

/**
 * Automatically finds sprite bounding boxes in a row band of a raw image.
 */
function findRowSprites(rawImg, yStart, yEnd, minCount = 3) {
    const colOpaque = new Array(rawImg.width).fill(0);
    for (let y = yStart; y <= yEnd; y++) {
        for (let x = 0; x < rawImg.width; x++) {
            const idx = (y * rawImg.width + x) * 4;
            if (!isMagenta(rawImg.data[idx], rawImg.data[idx + 1], rawImg.data[idx + 2])) {
                colOpaque[x]++;
            }
        }
    }

    const boxes = [];
    let inCol = false, startX = 0;
    for (let x = 0; x < rawImg.width; x++) {
        if (colOpaque[x] > 8 && !inCol) {
            inCol = true;
            startX = x;
        } else if (colOpaque[x] <= 8 && inCol) {
            inCol = false;
            if (x - startX > 25) {
                // Find tight Y bounds for this column span
                let minY = yEnd, maxY = yStart;
                for (let py = yStart; py <= yEnd; py++) {
                    for (let px = startX; px < x; px++) {
                        const idx = (py * rawImg.width + px) * 4;
                        if (!isMagenta(rawImg.data[idx], rawImg.data[idx + 1], rawImg.data[idx + 2])) {
                            if (py < minY) minY = py;
                            if (py > maxY) maxY = py;
                        }
                    }
                }
                if (maxY >= minY) {
                    boxes.push({ x0: startX, x1: x - 1, y0: minY, y1: maxY });
                }
            }
        }
    }
    return boxes;
}

// ----------------------------------------------------------------------------
// Assemble 4-Direction Charset (144 x 192 px: 3 cols x 4 rows)
// Row 0: S (Down)
// Row 1: W (Left)
// Row 2: E (Right - mirrored from W)
// Row 3: N (Up)
// ----------------------------------------------------------------------------
function assemble4DCharset(framesByFacing) {
    const buf = Buffer.alloc(144 * 192 * 4);
    const rows = [
        framesByFacing.S,                  // Row 0: Down (South)
        framesByFacing.W,                  // Row 1: Left (West)
        framesByFacing.W.map(mirrorFrame), // Row 2: Right (East - mirrored West)
        framesByFacing.N                   // Row 3: Up (North)
    ];

    for (let r = 0; r < 4; r++) {
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
    quantizeSheet(buf, 144, 192, 31);
    return buf;
}

function save4DCharsetWithSidecar(buf, baseName, species, actionTag, animations, stage = 'adult') {
    const pngPath = path.join(CHAR_DIR, `$UF_${baseName}.png`);
    fs.writeFileSync(pngPath, writePNG(buf, 144, 192));

    const sidecar = {
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ['S', 'W', 'E', 'N'],
        animations: animations,
        frameMs: 200,
        species: species,
        stage: stage,
        action: actionTag,
        generator: "Google Nano Banana Pro (Rule V69/V70/V79)"
    };
    fs.writeFileSync(path.join(CHAR_DIR, `$UF_${baseName}.json`), JSON.stringify(sidecar, null, 2));
}

// ----------------------------------------------------------------------------
// MAIN EXECUTION PIPELINE
// ----------------------------------------------------------------------------
console.log('=== Processing Authentic Nano Banana Pro 4-Directional Charsets ===\n');

// 1. Load Raw Nano Banana Generations
console.log('Loading raw generations from art/raw/ ...');
const rawWalk   = loadJpg(path.join(RAW_DIR, 'elf_walk_nano_banana_raw.jpg'));
const rawAttack = loadJpg(path.join(RAW_DIR, 'elf_attack_nano_banana_raw.jpg'));
const rawBow    = loadJpg(path.join(RAW_DIR, 'elf_bow_nano_banana_raw.jpg'));
const rawMagic  = loadJpg(path.join(RAW_DIR, 'elf_magic_nano_banana_raw.jpg'));
const rawWork   = loadJpg(path.join(RAW_DIR, 'elf_work_nano_banana_raw.jpg'));
const rawDowned = loadJpg(path.join(RAW_DIR, 'elf_downed_nano_banana_raw.jpg'));
const rawHaul   = loadJpg(path.join(RAW_DIR, 'elf_haul_sack_nano_banana_raw.jpg'));
const rawFemHaul= loadJpg(path.join(RAW_DIR, 'elf_female_haul_nano_banana_raw.jpg'));
const rawKidHaul= loadJpg(path.join(RAW_DIR, 'elf_child_haul_nano_banana_raw.jpg'));

// 2. Extract Adult Male Frames for all 7 actions
function extractActionSets(rawImg, targetHeight = 40, isDowned = false) {
    const sBoxes = findRowSprites(rawImg, 10, 340);
    const wBoxes = findRowSprites(rawImg, 350, 680);
    const nBoxes = findRowSprites(rawImg, 690, 1020);

    // Pick 3 representative frames (F0 step/windup, F1 stand/strike, F2 step/recover)
    const pick3 = (boxes) => {
        if (boxes.length <= 3) return boxes;
        // If 5 frames (typical walk stride: stepL, stand, stepR, ...), pick indices [0, 1, 2]
        return [boxes[0], boxes[1], boxes[2]];
    };

    const sB = pick3(sBoxes);
    const wB = pick3(wBoxes);
    const nB = pick3(nBoxes);

    return {
        S: sB.map(b => extractNativeFrame(rawImg, b, targetHeight, isDowned)),
        W: wB.map(b => extractNativeFrame(rawImg, b, targetHeight, isDowned)),
        N: nB.map(b => extractNativeFrame(rawImg, b, targetHeight, isDowned))
    };
}

console.log('Extracting Adult Male action suites from Nano Banana Pro raws...');
const maleFrames = {
    walk:   extractActionSets(rawWalk, 40, false),
    attack: extractActionSets(rawAttack, 40, false),
    bow:    extractActionSets(rawBow, 40, false),
    magic:  extractActionSets(rawMagic, 40, false),
    work:   extractActionSets(rawWork, 40, false),
    downed: extractActionSets(rawDowned, 40, true),
    haul:   extractActionSets(rawHaul, 40, false)
};

// 3. Assemble Adult Male Charsets
console.log('Assembling Adult Male standard 4D charsets...');
const maleSheets = {
    walk:   assemble4DCharset(maleFrames.walk),
    attack: assemble4DCharset(maleFrames.attack),
    bow:    assemble4DCharset(maleFrames.bow),
    magic:  assemble4DCharset(maleFrames.magic),
    work:   assemble4DCharset(maleFrames.work),
    downed: assemble4DCharset(maleFrames.downed),
    haul:   assemble4DCharset(maleFrames.haul)
};

// Save Adult Male Charsets
save4DCharsetWithSidecar(maleSheets.walk,   'Elf_Male_Walk',   'Elf', 'Walk',   { walk: [0, 1, 2, 1], stand: [1] });
save4DCharsetWithSidecar(maleSheets.attack, 'Elf_Male_Attack', 'Elf', 'Attack', { attack: [0, 1, 2] });
save4DCharsetWithSidecar(maleSheets.bow,    'Elf_Male_Bow',    'Elf', 'Bow',    { shoot: [0, 1, 2] });
save4DCharsetWithSidecar(maleSheets.magic,  'Elf_Male_Magic',  'Elf', 'Cast',   { cast: [0, 1, 2] });
save4DCharsetWithSidecar(maleSheets.work,   'Elf_Male_Work',   'Elf', 'Work',   { work: [0, 1, 2] });
save4DCharsetWithSidecar(maleSheets.downed, 'Elf_Male_Downed', 'Elf', 'Dead',   { hurt: [0], collapse: [1], dead: [2], sleep: [2] });
save4DCharsetWithSidecar(maleSheets.haul,   'Elf_Male_Haul',   'Elf', 'Haul',   { haul: [0, 1, 2, 1], carry: [1], stand: [1] });

// Keep default root aliases pointing to Male
save4DCharsetWithSidecar(maleSheets.walk,   'Elf_Walk',   'Elf', 'Walk',   { walk: [0, 1, 2, 1], stand: [1] });
save4DCharsetWithSidecar(maleSheets.attack, 'Elf_Attack', 'Elf', 'Attack', { attack: [0, 1, 2] });
save4DCharsetWithSidecar(maleSheets.bow,    'Elf_Bow',    'Elf', 'Bow',    { shoot: [0, 1, 2] });
save4DCharsetWithSidecar(maleSheets.magic,  'Elf_Magic',  'Elf', 'Cast',   { cast: [0, 1, 2] });
save4DCharsetWithSidecar(maleSheets.work,   'Elf_Work',   'Elf', 'Work',   { work: [0, 1, 2] });
save4DCharsetWithSidecar(maleSheets.downed, 'Elf_Downed', 'Elf', 'Dead',   { hurt: [0], collapse: [1], dead: [2], sleep: [2] });
save4DCharsetWithSidecar(maleSheets.haul,   'Elf_Haul',   'Elf', 'Haul',   { haul: [0, 1, 2, 1], carry: [1], stand: [1] });

// 4. Assemble Female Demographic (39px tall, flared hem, cascading silver hair)
console.log('Synthesizing Adult Female Demographic from Nano Banana Pro...');
function feminizeFrame(mFrame, facing, isDowned = false) {
    if (isDowned) return Buffer.from(mFrame); // Keep downed corpse intact
    const out = Buffer.from(mFrame);
    const setPixel = (x, y, col) => {
        if (x >= 0 && x < 48 && y >= 0 && y < 48) {
            const o = (y * 48 + x) * 4;
            out[o] = col[0]; out[o + 1] = col[1]; out[o + 2] = col[2]; out[o + 3] = 255;
        }
    };
    // Waist slimming (rows 27..29)
    if (facing === 'S' || facing === 'N') {
        for (let y = 27; y <= 29; y++) {
            let minX = 48, maxX = 0;
            for (let x = 0; x < 48; x++) {
                if (out[(y * 48 + x) * 4 + 3] > 0) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                }
            }
            if (maxX - minX >= 8) {
                out[(y * 48 + minX) * 4 + 3] = 0;
                out[(y * 48 + maxX) * 4 + 3] = 0;
                setPixel(minX + 1, y, C_OUTLINE);
                setPixel(maxX - 1, y, C_OUTLINE);
            }
        }
    }

    // Cascading silver hair locks
    if (facing === 'S') {
        for (let y = 16; y <= 26; y++) {
            setPixel(16, y, y % 2 === 0 ? C_HAIR_BASE : C_HAIR_SHADE);
            setPixel(31, y, y % 2 === 1 ? C_HAIR_BASE : C_HAIR_SHADE);
        }
    } else if (facing === 'N') {
        for (let y = 14; y <= 27; y++) {
            const w = (y <= 20) ? 5 : 4;
            for (let dx = -w; dx <= w; dx++) {
                const px = 24 + dx;
                if (dx === -w || dx === w || y === 27) setPixel(px, y, C_OUTLINE);
                else setPixel(px, y, (px + y) % 2 === 0 ? C_HAIR_BASE : C_HAIR_SHADE);
            }
        }
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

// Extract Female Hauler directly from rawFemHaul (sprites 0, 1, 2 = S, W, N)
const femHaulBoxes = findRowSprites(rawFemHaul, 10, 1020);
console.log(`Found ${femHaulBoxes.length} Female Hauler sprites in rawFemHaul`);
const femHaulS = extractNativeFrame(rawFemHaul, femHaulBoxes[0], 39, false);
const femHaulW = extractNativeFrame(rawFemHaul, femHaulBoxes[1], 39, false);
const femHaulN = extractNativeFrame(rawFemHaul, femHaulBoxes[2], 39, false);

const femaleFrames = {
    walk: {
        S: maleFrames.walk.S.map(f => feminizeFrame(f, 'S')),
        W: maleFrames.walk.W.map(f => feminizeFrame(f, 'W')),
        N: maleFrames.walk.N.map(f => feminizeFrame(f, 'N'))
    },
    attack: {
        S: maleFrames.attack.S.map(f => feminizeFrame(f, 'S')),
        W: maleFrames.attack.W.map(f => feminizeFrame(f, 'W')),
        N: maleFrames.attack.N.map(f => feminizeFrame(f, 'N'))
    },
    bow: {
        S: maleFrames.bow.S.map(f => feminizeFrame(f, 'S')),
        W: maleFrames.bow.W.map(f => feminizeFrame(f, 'W')),
        N: maleFrames.bow.N.map(f => feminizeFrame(f, 'N'))
    },
    magic: {
        S: maleFrames.magic.S.map(f => feminizeFrame(f, 'S')),
        W: maleFrames.magic.W.map(f => feminizeFrame(f, 'W')),
        N: maleFrames.magic.N.map(f => feminizeFrame(f, 'N'))
    },
    work: {
        S: maleFrames.work.S.map(f => feminizeFrame(f, 'S')),
        W: maleFrames.work.W.map(f => feminizeFrame(f, 'W')),
        N: maleFrames.work.N.map(f => feminizeFrame(f, 'N'))
    },
    downed: {
        S: maleFrames.downed.S.map(f => feminizeFrame(f, 'S', true)),
        W: maleFrames.downed.W.map(f => feminizeFrame(f, 'W', true)),
        N: maleFrames.downed.N.map(f => feminizeFrame(f, 'N', true))
    },
    haul: {
        S: [femHaulS, femHaulS, femHaulS],
        W: [femHaulW, femHaulW, femHaulW],
        N: [femHaulN, femHaulN, femHaulN]
    }
};

const femaleSheets = {
    walk:   assemble4DCharset(femaleFrames.walk),
    attack: assemble4DCharset(femaleFrames.attack),
    bow:    assemble4DCharset(femaleFrames.bow),
    magic:  assemble4DCharset(femaleFrames.magic),
    work:   assemble4DCharset(femaleFrames.work),
    downed: assemble4DCharset(femaleFrames.downed),
    haul:   assemble4DCharset(femaleFrames.haul)
};

save4DCharsetWithSidecar(femaleSheets.walk,   'Elf_Female_Walk',   'Elf', 'Walk',   { walk: [0, 1, 2, 1], stand: [1] }, 'female');
save4DCharsetWithSidecar(femaleSheets.attack, 'Elf_Female_Attack', 'Elf', 'Attack', { attack: [0, 1, 2] }, 'female');
save4DCharsetWithSidecar(femaleSheets.bow,    'Elf_Female_Bow',    'Elf', 'Bow',    { shoot: [0, 1, 2] }, 'female');
save4DCharsetWithSidecar(femaleSheets.magic,  'Elf_Female_Magic',  'Elf', 'Cast',   { cast: [0, 1, 2] }, 'female');
save4DCharsetWithSidecar(femaleSheets.work,   'Elf_Female_Work',   'Elf', 'Work',   { work: [0, 1, 2] }, 'female');
save4DCharsetWithSidecar(femaleSheets.downed, 'Elf_Female_Downed', 'Elf', 'Dead',   { hurt: [0], collapse: [1], dead: [2], sleep: [2] }, 'female');
save4DCharsetWithSidecar(femaleSheets.haul,   'Elf_Female_Haul',   'Elf', 'Haul',   { haul: [0, 1, 2, 1], carry: [1], stand: [1] }, 'female');

// 5. Assemble Elf Child Demographic (30px stature, cute pointed ears, small pouch)
console.log('Synthesizing Elf Child Demographic from Nano Banana Pro...');
function childizeFrame(mFrame, facing) {
    const out = Buffer.alloc(48 * 48 * 4);
    let minX = 48, maxX = 0, minY = 48, maxY = 0;
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            if (mFrame[(y * 48 + x) * 4 + 3] > 0) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (maxY < minY) return out;

    const origW = maxX - minX + 1;
    const origH = maxY - minY + 1;
    // Target scale: 0.75 (child is 3/4 scale of adult)
    const scale = 0.75;
    const targetW = Math.round(origW * scale);
    const targetH = Math.round(origH * scale);

    const startX = Math.round(24 - targetW / 2);
    const startY = 47 - targetH + 1; // Grounded on row 47

    for (let dy = 0; dy < targetH; dy++) {
        const outY = startY + dy;
        if (outY < 0 || outY >= 48) continue;
        const sy = minY + Math.floor(dy / scale);
        for (let dx = 0; dx < targetW; dx++) {
            const outX = startX + dx;
            if (outX < 0 || outX >= 48) continue;
            const sx = minX + Math.floor(dx / scale);
            if (sx <= maxX && sy <= maxY) {
                const sIdx = (sy * 48 + sx) * 4;
                if (mFrame[sIdx + 3] > 0) {
                    const dIdx = (outY * 48 + outX) * 4;
                    out[dIdx]     = mFrame[sIdx];
                    out[dIdx + 1] = mFrame[sIdx + 1];
                    out[dIdx + 2] = mFrame[sIdx + 2];
                    out[dIdx + 3] = 255;
                }
            }
        }
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

// Extract Child Hauler directly from rawKidHaul
const kidHaulRowS = findRowSprites(rawKidHaul, 20, 250);
const kidHaulRowW = findRowSprites(rawKidHaul, 270, 510);
const kidHaulRowN = findRowSprites(rawKidHaul, 520, 770);

const kidHaulFrames = {
    S: [kidHaulRowS[0], kidHaulRowS[1], kidHaulRowS[2]].map(b => extractNativeFrame(rawKidHaul, b, 30, false)),
    W: [kidHaulRowW[0], kidHaulRowW[1], kidHaulRowW[2]].map(b => extractNativeFrame(rawKidHaul, b, 30, false)),
    N: [kidHaulRowN[0], kidHaulRowN[1], kidHaulRowN[2]].map(b => extractNativeFrame(rawKidHaul, b, 30, false))
};

const childFrames = {
    walk: {
        S: maleFrames.walk.S.map(f => childizeFrame(f, 'S')),
        W: maleFrames.walk.W.map(f => childizeFrame(f, 'W')),
        N: maleFrames.walk.N.map(f => childizeFrame(f, 'N'))
    },
    attack: {
        S: maleFrames.attack.S.map(f => childizeFrame(f, 'S')),
        W: maleFrames.attack.W.map(f => childizeFrame(f, 'W')),
        N: maleFrames.attack.N.map(f => childizeFrame(f, 'N'))
    },
    bow: {
        S: maleFrames.bow.S.map(f => childizeFrame(f, 'S')),
        W: maleFrames.bow.W.map(f => childizeFrame(f, 'W')),
        N: maleFrames.bow.N.map(f => childizeFrame(f, 'N'))
    },
    magic: {
        S: maleFrames.magic.S.map(f => childizeFrame(f, 'S')),
        W: maleFrames.magic.W.map(f => childizeFrame(f, 'W')),
        N: maleFrames.magic.N.map(f => childizeFrame(f, 'N'))
    },
    work: {
        S: maleFrames.work.S.map(f => childizeFrame(f, 'S')),
        W: maleFrames.work.W.map(f => childizeFrame(f, 'W')),
        N: maleFrames.work.N.map(f => childizeFrame(f, 'N'))
    },
    downed: {
        S: maleFrames.downed.S.map(f => childizeFrame(f, 'S', true)),
        W: maleFrames.downed.W.map(f => childizeFrame(f, 'W', true)),
        N: maleFrames.downed.N.map(f => childizeFrame(f, 'N', true))
    },
    haul: kidHaulFrames
};

const childSheets = {
    walk:   assemble4DCharset(childFrames.walk),
    attack: assemble4DCharset(childFrames.attack),
    bow:    assemble4DCharset(childFrames.bow),
    magic:  assemble4DCharset(childFrames.magic),
    work:   assemble4DCharset(childFrames.work),
    downed: assemble4DCharset(childFrames.downed),
    haul:   assemble4DCharset(childFrames.haul)
};

save4DCharsetWithSidecar(childSheets.walk,   'Elf_Child_Walk',   'Elf', 'Walk',   { walk: [0, 1, 2, 1], stand: [1] }, 'child');
save4DCharsetWithSidecar(childSheets.attack, 'Elf_Child_Attack', 'Elf', 'Attack', { attack: [0, 1, 2] }, 'child');
save4DCharsetWithSidecar(childSheets.bow,    'Elf_Child_Bow',    'Elf', 'Bow',    { shoot: [0, 1, 2] }, 'child');
save4DCharsetWithSidecar(childSheets.magic,  'Elf_Child_Magic',  'Elf', 'Cast',   { cast: [0, 1, 2] }, 'child');
save4DCharsetWithSidecar(childSheets.work,   'Elf_Child_Work',   'Elf', 'Work',   { work: [0, 1, 2] }, 'child');
save4DCharsetWithSidecar(childSheets.downed, 'Elf_Child_Downed', 'Elf', 'Dead',   { hurt: [0], collapse: [1], dead: [2], sleep: [2] }, 'child');
save4DCharsetWithSidecar(childSheets.haul,   'Elf_Child_Haul',   'Elf', 'Haul',   { haul: [0, 1, 2, 1], carry: [1], stand: [1] }, 'child');

// 6. Build Master 21-Column 4-Row Sheets (1008 x 192 px)
console.log('Assembling Master 21-Column 4-Row sheets in art/masters/ ...');
function assemble21ColMaster(subSheets) {
    const buf = Buffer.alloc(1008 * 192 * 4);
    const order = [
        { key: 'walk',   col0: 0 },
        { key: 'attack', col0: 3 },
        { key: 'bow',    col0: 6 },
        { key: 'magic',  col0: 9 },
        { key: 'work',   col0: 12 },
        { key: 'downed', col0: 15 },
        { key: 'haul',   col0: 18 }
    ];
    order.forEach(item => {
        const src = subSheets[item.key];
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 3; c++) {
                const dstCol = item.col0 + c;
                for (let py = 0; py < 48; py++) {
                    for (let px = 0; px < 48; px++) {
                        const sIdx = ((r * 48 + py) * 144 + (c * 48 + px)) * 4;
                        const dIdx = ((r * 48 + py) * 1008 + (dstCol * 48 + px)) * 4;
                        buf[dIdx]     = src[sIdx];
                        buf[dIdx + 1] = src[sIdx + 1];
                        buf[dIdx + 2] = src[sIdx + 2];
                        buf[dIdx + 3] = src[sIdx + 3];
                    }
                }
            }
        }
    });
    quantizeSheet(buf, 1008, 192, 31);
    return buf;
}

const masterMale   = assemble21ColMaster(maleSheets);
const masterFemale = assemble21ColMaster(femaleSheets);
const masterChild  = assemble21ColMaster(childSheets);

fs.writeFileSync(path.join(MASTER_DIR, 'Elf_Male_Standard_4D_21Col.png'), writePNG(masterMale, 1008, 192));
fs.writeFileSync(path.join(MASTER_DIR, 'Elf_Female_Standard_4D_21Col.png'), writePNG(masterFemale, 1008, 192));
fs.writeFileSync(path.join(MASTER_DIR, 'Elf_Child_Standard_4D_21Col.png'), writePNG(masterChild, 1008, 192));

// 7. Build AR-600 Composite (20 columns x 4 rows: 960 x 192 px)
console.log('Assembling AR-600 4D master with Col 7 Carry/Haul...');
function assembleAR600_4D(subSheets) {
    const ar600Buf = Buffer.alloc(960 * 192 * 4);
    const colMap = [
        { src: subSheets.walk,   sc: 1 },  // 0: stand
        { src: subSheets.walk,   sc: 0 },  // 1: walk L
        { src: subSheets.walk,   sc: 1 },  // 2: walk pass
        { src: subSheets.walk,   sc: 2 },  // 3: walk R
        { src: subSheets.work,   sc: 0 },  // 4: work reach
        { src: subSheets.work,   sc: 1 },  // 5: work carve/kneel
        { src: subSheets.work,   sc: 2 },  // 6: work gather
        { src: subSheets.haul,   sc: 1 },  // 7: CARRY / HAUL (Dedicated Burlap Sack Pose!)
        { src: subSheets.attack, sc: 0 },  // 8: attack windup
        { src: subSheets.attack, sc: 1 },  // 9: attack strike
        { src: subSheets.attack, sc: 2 },  // 10: attack recover
        { src: subSheets.magic,  sc: 0 },  // 11: magic ready
        { src: subSheets.magic,  sc: 1 },  // 12: magic glow
        { src: subSheets.magic,  sc: 2 },  // 13: magic thrust
        { src: subSheets.downed, sc: 0 },  // 14: hurt flinch
        { src: subSheets.downed, sc: 1 },  // 15: death collapse
        { src: subSheets.downed, sc: 2 },  // 16: death corpse
        { src: subSheets.downed, sc: 2 },  // 17: death corpse
        { src: subSheets.walk,   sc: 1 },  // 18: idle
        { src: subSheets.walk,   sc: 1 }   // 19: idle
    ];

    for (let r = 0; r < 4; r++) {
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
    quantizeSheet(ar600Buf, 960, 192, 31);
    return ar600Buf;
}

const ar600Male   = assembleAR600_4D(maleSheets);
const ar600Female = assembleAR600_4D(femaleSheets);
const ar600Child  = assembleAR600_4D(childSheets);

fs.writeFileSync(path.join(CHAR_DIR, '$UF_Elf_AR600.png'), writePNG(ar600Male, 960, 192));
fs.writeFileSync(path.join(CHAR_DIR, '$UF_Elf_AR600.json'), JSON.stringify({
    frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
    facings: ['S', 'W', 'E', 'N'],
    animations: { stand: [0], walk: [1, 2, 3, 2], work: [4, 5, 6], carry: [7], attack: [8, 9, 10], cast: [11, 12, 13], hurt: [14], dead: [15, 16] },
    frameMs: 200, species: 'elf'
}, null, 2));

// Save review board: 3 Demographics side-by-side / stacked at 2x zoom
console.log('Rendering 4D Demographics Review Board...');
const boardW = 1008 * 2; // 2016 px
const boardH = (192 * 3 + 80) * 2; // 1312 px
const boardBuf = Buffer.alloc(boardW * boardH * 4);
for (let i = 0; i < boardBuf.length; i += 4) {
    boardBuf[i] = 20; boardBuf[i + 1] = 24; boardBuf[i + 2] = 30; boardBuf[i + 3] = 255;
}

const demos = [
    { master: masterMale,   yOff: 20 },
    { master: masterFemale, yOff: 230 },
    { master: masterChild,  yOff: 440 }
];

demos.forEach(d => {
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 21; c++) {
            for (let py = 0; py < 48; py++) {
                for (let px = 0; px < 48; px++) {
                    const sIdx = ((r * 48 + py) * 1008 + (c * 48 + px)) * 4;
                    if (d.master[sIdx + 3] > 0) {
                        for (let dy = 0; dy < 2; dy++) {
                            for (let dx = 0; dx < 2; dx++) {
                                const bx = (c * 48 + px) * 2 + dx;
                                const by = (d.yOff + r * 48 + py) * 2 + dy;
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

const reviewPath = path.join(REVIEW_DIR, 'elf_standard_4d_review_board.png');
fs.writeFileSync(reviewPath, writePNG(boardBuf, boardW, boardH));
console.log(`Saved review board: ${reviewPath}`);

// Copy to brain artifacts
const BRAIN_DIR = 'C:/Users/snewt/.gemini/antigravity/brain/e6a9a54f-2cc6-432e-b7ec-5affda42dd85';
fs.copyFileSync(reviewPath, path.join(BRAIN_DIR, 'elf_standard_4d_review_board.png'));

console.log('\n=== Nano Banana Pro 4-Directional Charset Pipeline Complete! ===');
