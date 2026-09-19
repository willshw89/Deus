#!/usr/bin/env node
'use strict';

/**
 * tools/process_elf_8d_suite.js
 *
 * Assembles and synthesizes complete 8-directional sprite suites for Elf Settlers
 * (Male & Female) with authentic Final Fantasy V (FF5) proportions and dynamic footsteps:
 * - Proportions: ~1:2.8 head-to-body ratio (head ~15px, torso ~12-13px, legs ~13-14px, total ~40-42px grounded on row 47)
 * - Stand (8 facings: S, SW, W, NW, N, NE, E, SE)
 * - Walk (3 frames x 8 facings with agile, springy footstep strides)
 * - Idle (3 frames x 8 facings with serene breathing and sylvan posture)
 * - Attack Moonblade (3 frames x 8 facings with curved blade & lunar crescent slash arc)
 * - Attack Longbow (3 frames x 8 facings with full draw, nock, and release)
 * - Cast Sylvan Staff (3 frames x 8 facings with emerald staff surge and verdant leaf magic)
 * - Work (3 frames x 8 facings with forestry gathering stroke)
 * - Hurt (1 frame x 8 facings with graceful recoil flinch)
 * - Death & Remains (3 frames x 8 facings with horizontal sylvan remains on rows 41..47)
 * - Sleep (1 frame x 8 facings with peaceful resting pose on rows 41..47)
 * - Full AR-600 20-column x 8-row masters (960x384 px)
 * - RMMZ 8D drop-in charsets and standard 4-way charsets
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const MASTERS_DIR = path.join(ROOT, 'art', 'masters');
const RAW_DIR = path.join(ROOT, 'art', 'raw');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');

const BRAIN = 'C:/Users/snewt/.gemini/antigravity/brain/8584d1db-b919-4549-a06e-7f379ac517a3';
const SOURCES = {
    elf_male_front:   path.join(BRAIN, 'elf_male_clean_front_1789848652355.jpg'),
    elf_male_side:    path.join(BRAIN, 'elf_male_side_1789848623158.jpg'),
    elf_male_back:    path.join(BRAIN, 'elf_male_back_1789848637004.jpg'),
    elf_female_sheet: path.join(BRAIN, 'elf_female_front_1789848665721.jpg'),
    elf_attack_sword: path.join(BRAIN, 'elf_attack_sword_1789848716412.jpg'),
    elf_attack_bow:   path.join(BRAIN, 'elf_attack_bow_1789848730005.jpg'),
    elf_cast_staff:   path.join(BRAIN, 'elf_cast_staff_1789848745767.jpg')
};

// 1. Palette loading & CIELAB color snapping
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
const C_DARK_OUTLINE = pal.snap(24, 16, 10);
const C_MOON_WHITE   = pal.snap(245, 250, 255);
const C_MOON_CYAN    = pal.snap(160, 220, 255);
const C_MOON_BLUE    = pal.snap(80, 150, 210);
const C_GOLD_TRIM    = pal.snap(210, 175, 75);
const C_EMERALD      = pal.snap(50, 205, 50);
const C_EMERALD_LGT  = pal.snap(120, 240, 110);
const C_WOOD_STAFF   = pal.snap(110, 70, 30);

function loadJpg(jpgPath) {
    const tmpPng = path.join(os.tmpdir(), `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${jpgPath.replace(/'/g, "''")}'); $img.Save('${tmpPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    const buf = fs.readFileSync(tmpPng);
    try { fs.unlinkSync(tmpPng); } catch (e) {}
    return decodePNG(buf, path.basename(jpgPath));
}

function isBg(r, g, b) {
    if (r > 150 && g < 90 && b > 150) return true;
    if (r > 100 && g < 60 && b > 100) return true;
    if (b > g + 35 && r > g + 35) return true;
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
        if (buf[i + 3] === 255) {
            const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
            counts.set(k, (counts.get(k) || 0) + 1);
        }
    }
    if (counts.size <= maxColors) return;

    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const keepKeys = new Set(sorted.slice(0, maxColors).map(e => e[0]));
    const keepRgb = Array.from(keepKeys).map(k => [(k >> 16) & 255, (k >> 8) & 255, k & 255]);
    const keepLab = keepRgb.map(c => srgbToLab(...c));

    const remap = new Map();
    for (const [k] of sorted.slice(maxColors)) {
        const rgb = [(k >> 16) & 255, (k >> 8) & 255, k & 255];
        const lab = srgbToLab(...rgb);
        let bestDist = Infinity, bestIdx = 0;
        for (let i = 0; i < keepLab.length; i++) {
            const d = labDist(lab, keepLab[i]);
            if (d < bestDist) { bestDist = d; bestIdx = i; }
        }
        remap.set(k, keepRgb[bestIdx]);
    }

    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 255) {
            const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
            if (remap.has(k)) {
                const mapped = remap.get(k);
                buf[i] = mapped[0]; buf[i + 1] = mapped[1]; buf[i + 2] = mapped[2];
            }
        }
    }
}

function mirrorFrame(frame48) {
    const out = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            const dIdx = (y * 48 + (47 - x)) * 4;
            out[dIdx] = frame48[sIdx];
            out[dIdx + 1] = frame48[sIdx + 1];
            out[dIdx + 2] = frame48[sIdx + 2];
            out[dIdx + 3] = frame48[sIdx + 3];
        }
    }
    return out;
}

function blendDiagonal(f1, f2) {
    const out = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const idx = (y * 48 + x) * 4;
            const a1 = f1[idx + 3], a2 = f2[idx + 3];
            if (a1 > 0 && a2 > 0) {
                out[idx] = (f1[idx] + f2[idx]) >> 1;
                out[idx + 1] = (f1[idx + 1] + f2[idx + 1]) >> 1;
                out[idx + 2] = (f1[idx + 2] + f2[idx + 2]) >> 1;
                out[idx + 3] = 255;
            } else if (a1 > 0) {
                out[idx] = f1[idx]; out[idx + 1] = f1[idx + 1]; out[idx + 2] = f1[idx + 2]; out[idx + 3] = 255;
            } else if (a2 > 0) {
                out[idx] = f2[idx]; out[idx + 1] = f2[idx + 1]; out[idx + 2] = f2[idx + 2]; out[idx + 3] = 255;
            }
            if (out[idx + 3] > 0) {
                const s = pal.snap(out[idx], out[idx + 1], out[idx + 2]);
                out[idx] = s[0]; out[idx + 1] = s[1]; out[idx + 2] = s[2];
            }
        }
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

// ----------------------------------------------------------------------------
// FF5 Proportional Extractor
// ----------------------------------------------------------------------------
function extractFF5Proportions(img, opts) {
    const {
        totalH = 41,
        headH = 15,
        torsoH = 13,
        legsH = 13,
        targetW = 24,
        bottomRow = 47,
        crop = null
    } = opts;

    const scanX1 = crop ? crop.x1 : 0;
    const scanX2 = crop ? crop.x2 : img.width;
    const scanY1 = crop ? crop.y1 : 0;
    const scanY2 = crop ? crop.y2 : img.height;

    let minX = scanX2, maxX = scanX1, minY = scanY2, maxY = scanY1;
    for (let y = scanY1; y < scanY2; y++) {
        for (let x = scanX1; x < scanX2; x++) {
            const idx = (y * img.width + x) * 4;
            const r = img.data[idx], g = img.data[idx + 1], b = img.data[idx + 2];
            if (!isBg(r, g, b)) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    const bboxW = maxX - minX + 1;
    const bboxH = maxY - minY + 1;
    const frame = Buffer.alloc(48 * 48 * 4);

    const srcHeadEnd = minY + bboxH * 0.32;
    const srcTorsoEnd = minY + bboxH * 0.60;

    const startY = bottomRow - totalH + 1;
    const startX = Math.round(24 - targetW / 2);

    for (let outDy = 0; outDy < totalH; outDy++) {
        let srcY;
        if (outDy < headH) {
            const t = outDy / Math.max(1, headH - 1);
            srcY = minY + t * (srcHeadEnd - minY);
        } else if (outDy < headH + torsoH) {
            const t = (outDy - headH) / Math.max(1, torsoH - 1);
            srcY = srcHeadEnd + t * (srcTorsoEnd - srcHeadEnd);
        } else {
            const t = (outDy - (headH + torsoH)) / Math.max(1, legsH - 1);
            srcY = srcTorsoEnd + t * (maxY - srcTorsoEnd);
        }

        const iy = Math.min(img.height - 1, Math.round(srcY));
        const outY = startY + outDy;
        if (outY < 0 || outY >= 48) continue;

        for (let outDx = 0; outDx < targetW; outDx++) {
            const tX = outDx / Math.max(1, targetW - 1);
            const ix = Math.min(img.width - 1, Math.round(minX + tX * (bboxW - 1)));
            const outX = startX + outDx;
            if (outX < 0 || outX >= 48) continue;

            const sIdx = (iy * img.width + ix) * 4;
            const r = img.data[sIdx], g = img.data[sIdx + 1], b = img.data[sIdx + 2];
            if (!isBg(r, g, b)) {
                const s = pal.snap(r, g, b);
                const dIdx = (outY * 48 + outX) * 4;
                frame[dIdx] = s[0]; frame[dIdx + 1] = s[1]; frame[dIdx + 2] = s[2]; frame[dIdx + 3] = 255;
            }
        }
    }

    applyDarkOutline(frame, 48, 48);
    return frame;
}

// ----------------------------------------------------------------------------
// Agile Sylvan Footstep Walk Generator
// ----------------------------------------------------------------------------
function makeElfWalkVariant(base, stepSide, facingIndex = 0) {
    const out = Buffer.alloc(48 * 48 * 4);
    const bob = 1;
    const isProfile = (facingIndex === 2 || facingIndex === 6);
    const isWest = (facingIndex === 2);
    const isEast = (facingIndex === 6);
    const isNorth = (facingIndex === 4);
    const isSouth = (facingIndex === 0);

    let legMinX = 48, legMaxX = 0;
    for (let y = 35; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            if (base[(y * 48 + x) * 4 + 3] > 0) {
                if (x < legMinX) legMinX = x;
                if (x > legMaxX) legMaxX = x;
            }
        }
    }
    const legMidX = (legMinX + legMaxX) / 2;

    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            if (base[sIdx + 3] === 0) continue;

            let targetX = x;
            let targetY = y + bob;

            if (isProfile) {
                // Sylvan Profile Stride
                if (y >= 35) {
                    const prog = (y - 35) / 12;
                    const shift = Math.round(prog * 4);
                    const strideDir = (stepSide < 0) ? 1 : -1;
                    const fwdLeft = isWest ? (strideDir > 0) : (strideDir < 0);

                    if (fwdLeft) {
                        if (x <= legMidX) {
                            targetX = x - shift;
                            targetY = y; // Front foot grounded
                        } else {
                            targetX = x + shift;
                            targetY = (y >= 46) ? (y - 2) : (y - 1); // Rear heel raised
                        }
                    } else {
                        if (x <= legMidX) {
                            targetX = x + shift;
                            targetY = (y >= 46) ? (y - 2) : (y - 1);
                        } else {
                            targetX = x - shift;
                            targetY = y;
                        }
                    }
                } else if (y >= 23 && y < 35) {
                    targetX = x + (isWest ? (stepSide < 0 ? -1 : 1) : (stepSide < 0 ? 1 : -1));
                }
            } else {
                // Lateral Front / Back / Diagonal Stride
                if (y >= 35) {
                    const isLeftFoot = (x < 24);
                    const isLead = (stepSide < 0) ? isLeftFoot : !isLeftFoot;
                    if (isLead) {
                        targetX = x + (stepSide < 0 ? -2 : 2);
                        targetY = y; // Grounded on row 47
                    } else {
                        targetX = x + (stepSide < 0 ? 1 : -1);
                        targetY = (y >= 46) ? (y - 2) : (y - 1); // Raised off ground
                    }
                } else if (y >= 23 && y < 35) {
                    // Arm & cloak counter-swing
                    if (x <= 16) targetY = y + (stepSide < 0 ? -1 : 1);
                    else if (x >= 31) targetY = y + (stepSide < 0 ? 1 : -1);
                }
            }

            if (targetX >= 0 && targetX < 48 && targetY >= 0 && targetY < 48) {
                const dIdx = (targetY * 48 + targetX) * 4;
                out[dIdx] = base[sIdx];
                out[dIdx + 1] = base[sIdx + 1];
                out[dIdx + 2] = base[sIdx + 2];
                out[dIdx + 3] = 255;
            }
        }
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

// ----------------------------------------------------------------------------
// Action Synthesizers
// ----------------------------------------------------------------------------
function makeElfIdleVariant(base, phase) {
    if (phase === 0) return Buffer.from(base);
    const out = Buffer.alloc(48 * 48 * 4);
    const lift = (phase === 1) ? -1 : 0;
    for (let y = 0; y < 48; y++) {
        const dy = (y >= 10 && y <= 35) ? lift : 0;
        const ty = y + dy;
        if (ty < 0 || ty >= 48) continue;
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            if (base[sIdx + 3] > 0) {
                const dIdx = (ty * 48 + x) * 4;
                out[dIdx] = base[sIdx];
                out[dIdx + 1] = base[sIdx + 1];
                out[dIdx + 2] = base[sIdx + 2];
                out[dIdx + 3] = base[sIdx + 3];
            }
        }
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

// Melee Moonblade Strike:
// Phase 0: Ready coil back
// Phase 1: Forward lunge + curved steel blade + lunar crescent slash arc
// Phase 2: Follow-through recovery
function makeElfAttackSwordVariant(base, phase, facingIndex) {
    const out = Buffer.alloc(48 * 48 * 4);
    const lungeX = (facingIndex === 2 || facingIndex === 1 || facingIndex === 3) ? -3 :
                   (facingIndex === 6 || facingIndex === 5 || facingIndex === 7) ? 3 : 0;
    const lungeY = (facingIndex === 0 || facingIndex === 1 || facingIndex === 7) ? 2 :
                   (facingIndex === 4 || facingIndex === 3 || facingIndex === 5) ? -2 : 0;

    const offset = (phase === 1) ? { x: lungeX, y: lungeY } :
                   (phase === 0) ? { x: -Math.sign(lungeX) * 2, y: -Math.sign(lungeY) } : { x: 0, y: 0 };

    for (let y = 0; y < 48; y++) {
        const ty = y + offset.y;
        if (ty < 0 || ty >= 48) continue;
        for (let x = 0; x < 48; x++) {
            const tx = x + offset.x;
            if (tx < 0 || tx >= 48) continue;
            const sIdx = (y * 48 + x) * 4;
            if (base[sIdx + 3] > 0) {
                const dIdx = (ty * 48 + tx) * 4;
                out[dIdx] = base[sIdx];
                out[dIdx + 1] = base[sIdx + 1];
                out[dIdx + 2] = base[sIdx + 2];
                out[dIdx + 3] = base[sIdx + 3];
            }
        }
    }

    const setPx = (px, py, col) => {
        if (px >= 0 && px < 48 && py >= 0 && py < 48) {
            const idx = (py * 48 + px) * 4;
            out[idx] = col[0]; out[idx + 1] = col[1]; out[idx + 2] = col[2]; out[idx + 3] = 255;
        }
    };

    if (phase === 0) {
        // High ready coil: blade over shoulder
        const hx = (facingIndex >= 1 && facingIndex <= 3) ? 28 : 20;
        const hy = 22;
        for (let i = 0; i < 9; i++) {
            setPx(hx + (facingIndex >= 1 && facingIndex <= 3 ? i : -i), hy - i, i === 8 ? C_MOON_WHITE : C_MOON_CYAN);
        }
    } else if (phase === 1) {
        // Full strike: curved moonblade + sweeping crescent slash arc
        const hx = 24 + offset.x;
        const hy = 26 + offset.y;
        const arcDir = (facingIndex >= 1 && facingIndex <= 3) ? -1 : 1;

        // Draw curved moonblade
        for (let i = 1; i <= 12; i++) {
            const bx = hx + Math.round(arcDir * i * 0.9);
            const by = hy + Math.round(i * 0.4);
            setPx(bx, by, i >= 10 ? C_MOON_WHITE : C_MOON_CYAN);
            setPx(bx, by - 1, C_MOON_WHITE);
        }

        // Sweeping lunar slash arc (curved crescent)
        const arcCenter = { x: hx + arcDir * 12, y: hy + 2 };
        for (let a = -40; a <= 40; a += 10) {
            const rad = (a * Math.PI) / 180;
            const ax = Math.round(arcCenter.x + arcDir * Math.cos(rad) * 9);
            const ay = Math.round(arcCenter.y + Math.sin(rad) * 9);
            setPx(ax, ay, C_MOON_WHITE);
            setPx(ax + arcDir, ay, C_MOON_CYAN);
        }
    }

    applyDarkOutline(out, 48, 48);
    return out;
}

// Ranged Longbow Attack:
// Phase 0: Raise bow, begin draw
// Phase 1: Full draw, arrow nocked and drawn back to ear
// Phase 2: Loose arrow, release string, follow-through
function makeElfAttackBowVariant(base, phase, facingIndex) {
    const out = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            if (base[sIdx + 3] > 0) {
                out[sIdx] = base[sIdx]; out[sIdx + 1] = base[sIdx + 1]; out[sIdx + 2] = base[sIdx + 2]; out[sIdx + 3] = base[sIdx + 3];
            }
        }
    }

    const setPx = (px, py, col) => {
        if (px >= 0 && px < 48 && py >= 0 && py < 48) {
            const idx = (py * 48 + px) * 4;
            out[idx] = col[0]; out[idx + 1] = col[1]; out[idx + 2] = col[2]; out[idx + 3] = 255;
        }
    };

    const isLeft = (facingIndex >= 1 && facingIndex <= 3);
    const bowX = isLeft ? 14 : 34;
    const bowY = 24;

    // Draw longbow stave (curved 14px sylvan wood stave)
    for (let dy = -7; dy <= 7; dy++) {
        const curve = Math.round((7 - Math.abs(dy)) * 0.35);
        const bx = bowX + (isLeft ? -curve : curve);
        const by = bowY + dy;
        setPx(bx, by, dy === 0 ? C_GOLD_TRIM : C_WOOD_STAFF);
        // Bowstring
        const strX = (phase === 1) ? (isLeft ? bowX + 5 : bowX - 5) : bowX;
        setPx(strX, by, [220, 220, 230, 255]);
    }

    // Drawn arrow
    if (phase === 1) {
        const arrowY = bowY;
        for (let dx = -6; dx <= 6; dx++) {
            const ax = bowX + dx;
            setPx(ax, arrowY, [210, 200, 180, 255]);
        }
        // Silver arrowhead
        setPx(isLeft ? bowX - 7 : bowX + 7, arrowY, C_MOON_WHITE);
    }

    applyDarkOutline(out, 48, 48);
    return out;
}

// Sylvan Staff Cast:
// Phase 0: Staff raised, emerald gem gather
// Phase 1: High staff elevation, swirling verdant leaf vortex
// Phase 2: Channel release
function makeElfCastStaffVariant(base, phase, facingIndex) {
    const out = Buffer.alloc(48 * 48 * 4);
    const liftY = (phase === 1) ? -1 : 0;

    for (let y = 0; y < 48; y++) {
        const ty = (y >= 45) ? y : (y + liftY);
        if (ty < 0 || ty >= 48) continue;
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            if (base[sIdx + 3] > 0) {
                const dIdx = (ty * 48 + x) * 4;
                out[dIdx] = base[sIdx]; out[dIdx + 1] = base[sIdx + 1]; out[dIdx + 2] = base[sIdx + 2]; out[dIdx + 3] = base[sIdx + 3];
            }
        }
    }

    const setPx = (px, py, col) => {
        if (px >= 0 && px < 48 && py >= 0 && py < 48) {
            const idx = (py * 48 + px) * 4;
            out[idx] = col[0]; out[idx + 1] = col[1]; out[idx + 2] = col[2]; out[idx + 3] = 255;
        }
    };

    const isLeft = (facingIndex >= 1 && facingIndex <= 3);
    const staffX = isLeft ? 16 : 32;
    const staffTopY = 10 + liftY;

    // Wooden staff shaft
    for (let y = staffTopY + 3; y <= staffTopY + 22; y++) {
        setPx(staffX, y, C_WOOD_STAFF);
    }
    // Emerald headpiece
    setPx(staffX, staffTopY + 1, C_EMERALD_LGT);
    setPx(staffX - 1, staffTopY + 1, C_EMERALD);
    setPx(staffX + 1, staffTopY + 1, C_EMERALD);
    setPx(staffX, staffTopY, C_GOLD_TRIM);
    setPx(staffX, staffTopY + 2, C_GOLD_TRIM);

    if (phase === 1) {
        // Swirling verdant leaf magic vortex aura
        const leafOffsets = [
            { dx: -4, dy: -3 }, { dx: 4, dy: -4 }, { dx: -6, dy: 2 },
            { dx: 6, dy: 1 }, { dx: -3, dy: 6 }, { dx: 5, dy: 5 }
        ];
        for (const pt of leafOffsets) {
            setPx(staffX + pt.dx, staffTopY + pt.dy, C_EMERALD_LGT);
            setPx(staffX + pt.dx + 1, staffTopY + pt.dy, C_EMERALD);
        }
    }

    applyDarkOutline(out, 48, 48);
    return out;
}

function makeElfWorkVariant(base, phase) {
    const out = Buffer.alloc(48 * 48 * 4);
    const dip = (phase === 1) ? 2 : (phase === 2) ? 1 : -1;
    for (let y = 0; y < 48; y++) {
        const ty = y + dip;
        if (ty < 0 || ty >= 48) continue;
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            if (base[sIdx + 3] > 0) {
                const dIdx = (ty * 48 + x) * 4;
                out[dIdx] = base[sIdx]; out[dIdx + 1] = base[sIdx + 1]; out[dIdx + 2] = base[sIdx + 2]; out[dIdx + 3] = 255;
            }
        }
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

function makeElfHurtVariant(base) {
    const out = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        const ty = y - 1;
        if (ty < 0 || ty >= 48) continue;
        for (let x = 0; x < 48; x++) {
            const tx = x - 1;
            if (tx < 0 || tx >= 48) continue;
            const sIdx = (y * 48 + x) * 4;
            if (base[sIdx + 3] > 0) {
                const dIdx = (ty * 48 + tx) * 4;
                out[dIdx] = base[sIdx]; out[dIdx + 1] = base[sIdx + 1]; out[dIdx + 2] = base[sIdx + 2]; out[dIdx + 3] = 255;
            }
        }
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

function makeElfDeathVariant(base, phase) {
    const out = Buffer.alloc(48 * 48 * 4);
    if (phase === 0) {
        // Buckle knee
        for (let y = 0; y < 48; y++) {
            const ty = y + 3;
            if (ty >= 48) continue;
            for (let x = 0; x < 48; x++) {
                const sIdx = (y * 48 + x) * 4;
                if (base[sIdx + 3] > 0) {
                    const dIdx = (ty * 48 + x) * 4;
                    out[dIdx] = base[sIdx]; out[dIdx + 1] = base[sIdx + 1]; out[dIdx + 2] = base[sIdx + 2]; out[dIdx + 3] = 255;
                }
            }
        }
    } else if (phase === 1) {
        // Fall down
        for (let y = 0; y < 48; y++) {
            const ty = Math.round(28 + (y / 48) * 18);
            if (ty >= 48) continue;
            for (let x = 0; x < 48; x++) {
                const sIdx = (y * 48 + x) * 4;
                if (base[sIdx + 3] > 0) {
                    const dIdx = (ty * 48 + x) * 4;
                    out[dIdx] = base[sIdx]; out[dIdx + 1] = base[sIdx + 1]; out[dIdx + 2] = base[sIdx + 2]; out[dIdx + 3] = 255;
                }
            }
        }
    } else {
        // Sylvan remains resting horizontally on rows 41..47
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = (y * 48 + x) * 4;
                if (base[sIdx + 3] > 0) {
                    const newX = Math.round(10 + (y / 48) * 28);
                    const newY = Math.round(41 + ((x - 12) / 24) * 6);
                    if (newX >= 0 && newX < 48 && newY >= 38 && newY < 48) {
                        const dIdx = (newY * 48 + newX) * 4;
                        out[dIdx] = base[sIdx]; out[dIdx + 1] = base[sIdx + 1]; out[dIdx + 2] = base[sIdx + 2]; out[dIdx + 3] = 255;
                    }
                }
            }
        }
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

function makeElfSleepVariant(base) {
    const out = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            if (base[sIdx + 3] > 0) {
                const newX = Math.round(12 + (y / 48) * 24);
                const newY = Math.round(42 + ((x - 12) / 24) * 5);
                if (newX >= 0 && newX < 48 && newY >= 38 && newY < 48) {
                    const dIdx = (newY * 48 + newX) * 4;
                    out[dIdx] = base[sIdx]; out[dIdx + 1] = base[sIdx + 1]; out[dIdx + 2] = base[sIdx + 2]; out[dIdx + 3] = 255;
                }
            }
        }
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

// Assemble Grid Helper
function assembleGrid(framesList, cols, rows) {
    const w = cols * 48;
    const h = rows * 48;
    const buf = Buffer.alloc(w * h * 4);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const f = framesList[r * cols + c];
            if (!f) continue;
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (y * 48 + x) * 4;
                    if (f[sIdx + 3] > 0) {
                        const dIdx = ((r * 48 + y) * w + (c * 48 + x)) * 4;
                        buf[dIdx] = f[sIdx]; buf[dIdx + 1] = f[sIdx + 1]; buf[dIdx + 2] = f[sIdx + 2]; buf[dIdx + 3] = 255;
                    }
                }
            }
        }
    }
    quantizeSheet(buf, w, h, 31);
    return buf;
}

function makeRawCanvas(framesColsRows, cols, rows) {
    const w = cols * 48 * 4;
    const h = rows * 48 * 4;
    const raw = Buffer.alloc(w * h * 4);
    for (let i = 0; i < raw.length; i += 4) {
        raw[i] = 255; raw[i + 1] = 0; raw[i + 2] = 255; raw[i + 3] = 255;
    }
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const frame = framesColsRows[r * cols + c];
            if (!frame) continue;
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (y * 48 + x) * 4;
                    if (frame[sIdx + 3] > 0) {
                        for (let dy = 0; dy < 4; dy++) {
                            for (let dx = 0; dx < 4; dx++) {
                                const ry = (r * 48 + y) * 4 + dy;
                                const rx = (c * 48 + x) * 4 + dx;
                                const dIdx = (ry * w + rx) * 4;
                                raw[dIdx] = frame[sIdx]; raw[dIdx + 1] = frame[sIdx + 1]; raw[dIdx + 2] = frame[sIdx + 2]; raw[dIdx + 3] = 255;
                            }
                        }
                    }
                }
            }
        }
    }
    return { w, h, buf: raw };
}

function buildCombat4WaySheet(standList, action3ColsList) {
    const rmmzRowIndices = [0, 2, 6, 4]; // S, W, E, N
    const buf = Buffer.alloc(144 * 192 * 4);
    for (let r = 0; r < 4; r++) {
        const srcRow = rmmzRowIndices[r];
        const fWindup = action3ColsList[srcRow * 3 + 0];
        const fStand  = standList[srcRow];
        const fAction = action3ColsList[srcRow * 3 + 2] || action3ColsList[srcRow * 3 + 1];
        const cols = [fWindup, fStand, fAction];

        for (let c = 0; c < 3; c++) {
            const f = cols[c];
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (y * 48 + x) * 4;
                    const dIdx = ((r * 48 + y) * 144 + (c * 48 + x)) * 4;
                    buf[dIdx] = f[sIdx]; buf[dIdx + 1] = f[sIdx + 1]; buf[dIdx + 2] = f[sIdx + 2]; buf[dIdx + 3] = f[sIdx + 3];
                }
            }
        }
    }
    quantizeSheet(buf, 144, 192, 31);
    return buf;
}

function processElfGender(gender, sImg, wImg, nImg) {
    console.log(`Processing Elf ${gender}...`);
    const FACINGS_LIST = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"];
    const targetH = (gender === 'male') ? 42 : 40;
    const targetW = (gender === 'male') ? 24 : 22;

    const eS = extractFF5Proportions(sImg.img, { totalH: targetH, headH: 15, torsoH: 13, legsH: 14, targetW, crop: sImg.crop });
    const eW = extractFF5Proportions(wImg.img, { totalH: targetH, headH: 15, torsoH: 13, legsH: 14, targetW: targetW - 2, crop: wImg.crop });
    const eE = mirrorFrame(eW);
    const eN = extractFF5Proportions(nImg.img, { totalH: targetH, headH: 15, torsoH: 13, legsH: 14, targetW, crop: nImg.crop });

    const eSW = blendDiagonal(eS, eW);
    const eSE = blendDiagonal(eS, eE);
    const eNW = blendDiagonal(eN, eW);
    const eNE = blendDiagonal(eN, eE);

    const facings = [eS, eSW, eW, eNW, eN, eNE, eE, eSE];

    const standFrames = [];
    const walkFrames = [];
    const idleFrames = [];
    const attackSwordFrames = [];
    const attackBowFrames = [];
    const castStaffFrames = [];
    const workFrames = [];
    const hurtFrames = [];
    const deathFrames = [];
    const sleepFrames = [];

    for (let r = 0; r < 8; r++) {
        const base = facings[r];
        standFrames.push(base);
        walkFrames.push(makeElfWalkVariant(base, -1, r), base, makeElfWalkVariant(base, 1, r));
        idleFrames.push(makeElfIdleVariant(base, 0), makeElfIdleVariant(base, 1), makeElfIdleVariant(base, 2));
        attackSwordFrames.push(makeElfAttackSwordVariant(base, 0, r), makeElfAttackSwordVariant(base, 1, r), makeElfAttackSwordVariant(base, 2, r));
        attackBowFrames.push(makeElfAttackBowVariant(base, 0, r), makeElfAttackBowVariant(base, 1, r), makeElfAttackBowVariant(base, 2, r));
        castStaffFrames.push(makeElfCastStaffVariant(base, 0, r), makeElfCastStaffVariant(base, 1, r), makeElfCastStaffVariant(base, 2, r));
        workFrames.push(makeElfWorkVariant(base, 0), makeElfWorkVariant(base, 1), makeElfWorkVariant(base, 2));
        hurtFrames.push(makeElfHurtVariant(base));
        deathFrames.push(makeElfDeathVariant(base, 0), makeElfDeathVariant(base, 1), makeElfDeathVariant(base, 2));
        sleepFrames.push(makeElfSleepVariant(base));
    }

    // Save action masters
    const actions = [
        { name: `elf_${gender}_stand`, frames: standFrames, cols: 1, anim: { stand: [0] } },
        { name: `elf_${gender}_adult_walk`, frames: walkFrames, cols: 3, anim: { walk: [0, 1, 2] } },
        { name: `elf_${gender}_adult_idle`, frames: idleFrames, cols: 3, anim: { stand: [0], idle: [0, 1, 2] } },
        { name: `elf_${gender}_adult_attack`, frames: attackSwordFrames, cols: 3, anim: { attack: [0, 1, 2] } },
        { name: `elf_${gender}_adult_work`, frames: workFrames, cols: 3, anim: { work: [0, 1, 2] } },
        { name: `elf_${gender}_adult_cast`, frames: castStaffFrames, cols: 3, anim: { cast: [0, 1, 2] } },
        { name: `elf_${gender}_adult_hurt`, frames: hurtFrames, cols: 1, anim: { hurt: [0] } },
        { name: `elf_${gender}_adult_death`, frames: deathFrames, cols: 3, anim: { death: [0, 1, 2] } },
        { name: `elf_${gender}_adult_sleep`, frames: sleepFrames, cols: 1, anim: { sleep: [0] } }
    ];

    for (const act of actions) {
        const buf = assembleGrid(act.frames, act.cols, 8);
        writePNG(path.join(MASTERS_DIR, `${act.name}.png`), act.cols * 48, 384, buf);
        fs.writeFileSync(path.join(MASTERS_DIR, `${act.name}.json`), JSON.stringify({
            id: act.name, species: "elf", gender, stage: "adult",
            frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
            facings: FACINGS_LIST, animations: act.anim, frameMs: 150
        }, null, 2));

        const raw = makeRawCanvas(act.frames, act.cols, 8);
        writePNG(path.join(RAW_DIR, `${act.name}.png`), raw.w, raw.h, raw.buf);
    }

    // Build AR-600 Master (20 cols x 8 rows)
    const fullFrames = [];
    for (let r = 0; r < 8; r++) {
        fullFrames.push(
            standFrames[r],
            walkFrames[r * 3 + 0], walkFrames[r * 3 + 1], walkFrames[r * 3 + 2],
            workFrames[r * 3 + 0], workFrames[r * 3 + 1], workFrames[r * 3 + 2],
            standFrames[r],
            attackSwordFrames[r * 3 + 0], attackSwordFrames[r * 3 + 1], attackSwordFrames[r * 3 + 2],
            castStaffFrames[r * 3 + 0], castStaffFrames[r * 3 + 1], castStaffFrames[r * 3 + 2],
            hurtFrames[r],
            deathFrames[r * 3 + 0], deathFrames[r * 3 + 1], deathFrames[r * 3 + 2],
            idleFrames[r * 3 + 0], idleFrames[r * 3 + 1]
        );
    }
    const ar600Buf = assembleGrid(fullFrames, 20, 8);
    writePNG(path.join(MASTERS_DIR, `elf_${gender}.png`), 960, 384, ar600Buf);
    writePNG(path.join(CHAR_DIR, `$UF_Elf_${gender === 'male' ? 'Male' : 'Female'}_AR600.png`), 960, 384, ar600Buf);

    const sidecarAR600 = {
        id: `elf_${gender}`, species: "elf", gender, stage: "adult",
        frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
        facings: FACINGS_LIST,
        animations: {
            stand: [0],
            walk: [1, 2, 3, 2],
            work: [4, 5, 6],
            attack: [8, 9, 10],
            cast: [11, 12, 13],
            hurt: [14],
            death: [15, 16, 17],
            idle: [18, 19]
        },
        frameMs: 150
    };
    fs.writeFileSync(path.join(MASTERS_DIR, `elf_${gender}.json`), JSON.stringify(sidecarAR600, null, 2));
    fs.writeFileSync(path.join(CHAR_DIR, `$UF_Elf_${gender === 'male' ? 'Male' : 'Female'}_AR600.json`), JSON.stringify(sidecarAR600, null, 2));

    // RMMZ 8D Movement Charset (144x384)
    const walk8DBuf = assembleGrid(walkFrames, 3, 8);
    const charsetName = `$UF_Elf_${gender === 'male' ? 'Male' : 'Female'}_8D`;
    writePNG(path.join(CHAR_DIR, `${charsetName}.png`), 144, 384, walk8DBuf);
    fs.writeFileSync(path.join(CHAR_DIR, `${charsetName}.json`), JSON.stringify({
        id: charsetName, species: "elf", gender, stage: "adult",
        frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
        facings: FACINGS_LIST, animations: { stand: [1], walk: [0, 1, 2, 1] }, frameMs: 150
    }, null, 2));

    return {
        standFrames,
        walkFrames,
        idleFrames,
        attackSwordFrames,
        attackBowFrames,
        castStaffFrames,
        workFrames,
        hurtFrames,
        deathFrames,
        sleepFrames
    };
}

function main() {
    console.log('=== Processing Complete Elf 8-Directional Sprite Suites ===');

    console.log('Loading high-res source JPGs...');
    const mFrontJpg = loadJpg(SOURCES.elf_male_front);
    const mSideJpg  = loadJpg(SOURCES.elf_male_side);
    const mBackJpg  = loadJpg(SOURCES.elf_male_back);
    const femJpg    = loadJpg(SOURCES.elf_female_sheet);

    // Crops for female sheet: Pose 1 (left) = front stand, Pose 3 (top right) = side, Pose 5 (bot right) = back
    const maleData = processElfGender('male',
        { img: mFrontJpg, crop: null },
        { img: mSideJpg,  crop: null },
        { img: mBackJpg,  crop: null }
    );

    const femData = processElfGender('female',
        { img: femJpg, crop: { x1: 20, y1: 20, x2: 380, y2: 920 } },
        { img: femJpg, crop: { x1: 750, y1: 20, x2: 930, y2: 520 } },
        { img: femJpg, crop: { x1: 710, y1: 520, x2: 930, y2: 980 } }
    );

    const FACINGS_LIST = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"];
    const rmmzRowIndices = [0, 2, 6, 4]; // S, W, E, N

    // Default 8D Elf Charset ($UF_Elf_8D.png)
    const defaultElf8DBuf = assembleGrid(maleData.walkFrames, 3, 8);
    writePNG(path.join(CHAR_DIR, '$UF_Elf_8D.png'), 144, 384, defaultElf8DBuf);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Elf_8D.json'), JSON.stringify({
        id: "$UF_Elf_8D", species: "elf", frameWidth: 48, frameHeight: 48,
        anchor: [24, 47], footprint: [1, 1], facings: FACINGS_LIST,
        animations: { stand: [1], walk: [0, 1, 2, 1] }, frameMs: 150
    }, null, 2));

    // Default 4-Way Elf Charset ($UF_Elf.png)
    const defaultElf4Way = Buffer.alloc(144 * 192 * 4);
    for (let r = 0; r < 4; r++) {
        const srcRow = rmmzRowIndices[r];
        for (let c = 0; c < 3; c++) {
            const frame = maleData.walkFrames[srcRow * 3 + c];
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (y * 48 + x) * 4;
                    const dIdx = ((r * 48 + y) * 144 + (c * 48 + x)) * 4;
                    defaultElf4Way[dIdx] = frame[sIdx];
                    defaultElf4Way[dIdx + 1] = frame[sIdx + 1];
                    defaultElf4Way[dIdx + 2] = frame[sIdx + 2];
                    defaultElf4Way[dIdx + 3] = frame[sIdx + 3];
                }
            }
        }
    }
    quantizeSheet(defaultElf4Way, 144, 192, 31);
    writePNG(path.join(CHAR_DIR, '$UF_Elf.png'), 144, 192, defaultElf4Way);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Elf.json'), JSON.stringify({
        id: "$UF_Elf", species: "elf", frameWidth: 48, frameHeight: 48,
        anchor: [24, 47], footprint: [1, 1], facings: ["S", "W", "E", "N"],
        animations: { stand: [1], walk: [0, 1, 2, 1] }, frameMs: 150
    }, null, 2));

    // Elf Male & Female 4-Way Movement Sheets
    const elfMale4Way = defaultElf4Way;
    writePNG(path.join(CHAR_DIR, '$UF_Elf_Male.png'), 144, 192, elfMale4Way);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Elf_Male.json'), JSON.stringify({
        id: "$UF_Elf_Male", species: "elf", gender: "male", stage: "adult", frameWidth: 48, frameHeight: 48,
        anchor: [24, 47], footprint: [1, 1], facings: ["S", "W", "E", "N"],
        animations: { stand: [1], walk: [0, 1, 2, 1] }, frameMs: 150
    }, null, 2));

    const elfFem4Way = Buffer.alloc(144 * 192 * 4);
    for (let r = 0; r < 4; r++) {
        const srcRow = rmmzRowIndices[r];
        for (let c = 0; c < 3; c++) {
            const frame = femData.walkFrames[srcRow * 3 + c];
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (y * 48 + x) * 4;
                    const dIdx = ((r * 48 + y) * 144 + (c * 48 + x)) * 4;
                    elfFem4Way[dIdx] = frame[sIdx];
                    elfFem4Way[dIdx + 1] = frame[sIdx + 1];
                    elfFem4Way[dIdx + 2] = frame[sIdx + 2];
                    elfFem4Way[dIdx + 3] = frame[sIdx + 3];
                }
            }
        }
    }
    quantizeSheet(elfFem4Way, 144, 192, 31);
    writePNG(path.join(CHAR_DIR, '$UF_Elf_Female.png'), 144, 192, elfFem4Way);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Elf_Female.json'), JSON.stringify({
        id: "$UF_Elf_Female", species: "elf", gender: "female", stage: "adult", frameWidth: 48, frameHeight: 48,
        anchor: [24, 47], footprint: [1, 1], facings: ["S", "W", "E", "N"],
        animations: { stand: [1], walk: [0, 1, 2, 1] }, frameMs: 150
    }, null, 2));

    // Elf 8D Combat Charsets
    const elfAttackSword8D = assembleGrid(maleData.attackSwordFrames, 3, 8);
    writePNG(path.join(CHAR_DIR, '$UF_Elf_Attack_Sword_8D.png'), 144, 384, elfAttackSword8D);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Elf_Attack_Sword_8D.json'), JSON.stringify({
        id: "$UF_Elf_Attack_Sword_8D", species: "elf", weapon: "elf_moonblade",
        frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
        facings: FACINGS_LIST, animations: { attack: [0, 1, 2] }, frameMs: 120
    }, null, 2));

    const elfAttackBow8D = assembleGrid(maleData.attackBowFrames, 3, 8);
    writePNG(path.join(CHAR_DIR, '$UF_Elf_Attack_Bow_8D.png'), 144, 384, elfAttackBow8D);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Elf_Attack_Bow_8D.json'), JSON.stringify({
        id: "$UF_Elf_Attack_Bow_8D", species: "elf", weapon: "elf_longbow",
        frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
        facings: FACINGS_LIST, animations: { attack: [0, 1, 2] }, frameMs: 120
    }, null, 2));

    const elfCastStaff8D = assembleGrid(maleData.castStaffFrames, 3, 8);
    writePNG(path.join(CHAR_DIR, '$UF_Elf_Cast_Staff_8D.png'), 144, 384, elfCastStaff8D);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Elf_Cast_Staff_8D.json'), JSON.stringify({
        id: "$UF_Elf_Cast_Staff_8D", species: "elf", weapon: "elf_sylvan_staff",
        frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
        facings: FACINGS_LIST, animations: { cast: [0, 1, 2] }, frameMs: 150
    }, null, 2));

    // 4-Way Combat Sheets
    const elfAttackSword4Way = buildCombat4WaySheet(maleData.standFrames, maleData.attackSwordFrames);
    writePNG(path.join(CHAR_DIR, '$UF_Elf_Attack_Sword.png'), 144, 192, elfAttackSword4Way);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Elf_Attack_Sword.json'), JSON.stringify({
        id: "$UF_Elf_Attack_Sword", species: "elf", weapon: "elf_moonblade",
        frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
        facings: ["S", "W", "E", "N"], animations: { attack: [0, 1, 2] }, frameMs: 120
    }, null, 2));

    const elfAttackBow4Way = buildCombat4WaySheet(maleData.standFrames, maleData.attackBowFrames);
    writePNG(path.join(CHAR_DIR, '$UF_Elf_Attack_Bow.png'), 144, 192, elfAttackBow4Way);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Elf_Attack_Bow.json'), JSON.stringify({
        id: "$UF_Elf_Attack_Bow", species: "elf", weapon: "elf_longbow",
        frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
        facings: ["S", "W", "E", "N"], animations: { attack: [0, 1, 2] }, frameMs: 120
    }, null, 2));

    const elfCastStaff4Way = buildCombat4WaySheet(maleData.standFrames, maleData.castStaffFrames);
    writePNG(path.join(CHAR_DIR, '$UF_Elf_Cast_Staff.png'), 144, 192, elfCastStaff4Way);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Elf_Cast_Staff.json'), JSON.stringify({
        id: "$UF_Elf_Cast_Staff", species: "elf", weapon: "elf_sylvan_staff",
        frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
        facings: ["S", "W", "E", "N"], animations: { cast: [0, 1, 2] }, frameMs: 150
    }, null, 2));

    const elfFemAttack4Way = buildCombat4WaySheet(femData.standFrames, femData.attackSwordFrames);
    writePNG(path.join(CHAR_DIR, '$UF_Elf_Female_Attack.png'), 144, 192, elfFemAttack4Way);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Elf_Female_Attack.json'), JSON.stringify({
        id: "$UF_Elf_Female_Attack", species: "elf", gender: "female",
        frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
        facings: ["S", "W", "E", "N"], animations: { attack: [0, 1, 2] }, frameMs: 120
    }, null, 2));

    const elfFemCast4Way = buildCombat4WaySheet(femData.standFrames, femData.castStaffFrames);
    writePNG(path.join(CHAR_DIR, '$UF_Elf_Female_Cast.png'), 144, 192, elfFemCast4Way);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Elf_Female_Cast.json'), JSON.stringify({
        id: "$UF_Elf_Female_Cast", species: "elf", gender: "female",
        frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
        facings: ["S", "W", "E", "N"], animations: { cast: [0, 1, 2] }, frameMs: 150
    }, null, 2));

    // -------------------------------------------------------------
    // REVIEW SHOWCASES (4x Upscale)
    // -------------------------------------------------------------
    console.log('Rendering Elf 8D Review Showcase...');
    const scW = 8 * 48 * 4;
    const scH = 4 * 48 * 4;
    const scBuf = Buffer.alloc(scW * scH * 4);
    for (let i = 0; i < scBuf.length; i += 4) {
        scBuf[i] = 30; scBuf[i + 1] = 45; scBuf[i + 2] = 35; scBuf[i + 3] = 255;
    }

    // Row 0: Elf Male Stand (8 facings)
    // Row 1: Elf Male Attack Sword (8 facings, col 1 strike)
    // Row 2: Elf Female Stand (8 facings)
    // Row 3: Elf Female Attack Bow (8 facings, col 1 full draw)
    const elfRows = [
        maleData.standFrames,
        maleData.attackSwordFrames.filter((_, idx) => idx % 3 === 1),
        femData.standFrames,
        femData.attackBowFrames.filter((_, idx) => idx % 3 === 1)
    ];

    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 8; c++) {
            const f = elfRows[r][c];
            if (!f) continue;
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (y * 48 + x) * 4;
                    if (f[sIdx + 3] > 0) {
                        for (let dy = 0; dy < 4; dy++) {
                            for (let dx = 0; dx < 4; dx++) {
                                const dIdx = (((r * 48 * 4 + y * 4 + dy) * scW) + (c * 48 * 4 + x * 4 + dx)) * 4;
                                scBuf[dIdx] = f[sIdx];
                                scBuf[dIdx + 1] = f[sIdx + 1];
                                scBuf[dIdx + 2] = f[sIdx + 2];
                                scBuf[dIdx + 3] = 255;
                            }
                        }
                    }
                }
            }
        }
    }
    writePNG(path.join(REVIEW_DIR, 'elf_sprites_8d_actions_showcase_4x.png'), scW, scH, scBuf);
    console.log('Saved elf_sprites_8d_actions_showcase_4x.png');

    // 8-Directional Compass Comparison Showcase (Human, Dwarf, Elf)
    console.log('Rendering All-Lineages 8D Compass Showcase...');
    const humanMaleStandImg = decodePNG(fs.readFileSync(path.join(MASTERS_DIR, 'human_male_stand.png')));
    const humanFemStandImg  = decodePNG(fs.readFileSync(path.join(MASTERS_DIR, 'human_female_stand.png')));
    const dwarfMaleStandImg = decodePNG(fs.readFileSync(path.join(MASTERS_DIR, 'dwarf_male_stand.png')));
    const dwarfFemStandImg  = decodePNG(fs.readFileSync(path.join(MASTERS_DIR, 'dwarf_female_stand.png')));

    function getSub48(img, col, row) {
        const frame = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = (((row * 48 + y) * img.width) + (col * 48 + x)) * 4;
                const dIdx = (y * 48 + x) * 4;
                frame[dIdx] = img.data[sIdx];
                frame[dIdx + 1] = img.data[sIdx + 1];
                frame[dIdx + 2] = img.data[sIdx + 2];
                frame[dIdx + 3] = img.data[sIdx + 3];
            }
        }
        return frame;
    }

    const allLineageRows = [
        Array.from({ length: 8 }, (_, i) => getSub48(humanMaleStandImg, 0, i)),
        Array.from({ length: 8 }, (_, i) => getSub48(dwarfMaleStandImg, 0, i)),
        maleData.standFrames,
        Array.from({ length: 8 }, (_, i) => getSub48(humanFemStandImg, 0, i)),
        Array.from({ length: 8 }, (_, i) => getSub48(dwarfFemStandImg, 0, i)),
        femData.standFrames
    ];

    const compH = 6 * 48 * 4;
    const compBuf = Buffer.alloc(scW * compH * 4);
    for (let i = 0; i < compBuf.length; i += 4) {
        compBuf[i] = 40; compBuf[i + 1] = 44; compBuf[i + 2] = 52; compBuf[i + 3] = 255;
    }

    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 8; c++) {
            const f = allLineageRows[r][c];
            if (!f) continue;
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (y * 48 + x) * 4;
                    if (f[sIdx + 3] > 0) {
                        for (let dy = 0; dy < 4; dy++) {
                            for (let dx = 0; dx < 4; dx++) {
                                const dIdx = (((r * 48 * 4 + y * 4 + dy) * scW) + (c * 48 * 4 + x * 4 + dx)) * 4;
                                compBuf[dIdx] = f[sIdx];
                                compBuf[dIdx + 1] = f[sIdx + 1];
                                compBuf[dIdx + 2] = f[sIdx + 2];
                                compBuf[dIdx + 3] = 255;
                            }
                        }
                    }
                }
            }
        }
    }
    writePNG(path.join(REVIEW_DIR, 'all_lineages_8d_compass_comparison_4x.png'), scW, compH, compBuf);
    console.log('Saved all_lineages_8d_compass_comparison_4x.png');

    console.log('=== Elf 8D Suite Assembly Complete! ===');
}

main();
