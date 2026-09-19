#!/usr/bin/env node
'use strict';

/**
 * tools/process_dwarf_8d_suite.js
 *
 * Assembles and synthesizes complete 8-directional sprite suites for Dwarven Folk
 * (Male & Female):
 * - Stand (8 facings: S, SW, W, NW, N, NE, E, SE)
 * - Walk (3 animation frames x 8 facings)
 * - Idle (3 animation frames x 8 facings)
 * - Attack (3 animation frames x 8 facings)
 * - Work (3 animation frames x 8 facings)
 * - Cast (3 animation frames x 8 facings)
 * - Hurt (1 animation frame x 8 facings)
 * - Death & Remains (3 animation frames x 8 facings)
 * - Sleep (1 resting frame x 8 facings)
 * - Full AR-600 20-column x 8-row masters (960x384 px)
 * - RMMZ 8D drop-in charsets for game/img/characters/
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
    dwarf_male_front: path.join(BRAIN, 'dwarf_male_clean_front_1789847907403.jpg'),
    dwarf_male_side: path.join(BRAIN, 'dwarf_male_clean_side_1789847981218.jpg'),
    dwarf_male_back: path.join(BRAIN, 'dwarf_male_clean_back_1789847961098.jpg'),
    dwarf_female_front: path.join(BRAIN, 'dwarf_female_front_1789847555163.jpg'),
    dwarf_female_side: path.join(BRAIN, 'dwarf_female_side_1789848162242.jpg'),
    dwarf_female_back: path.join(BRAIN, 'dwarf_female_back_1789848177071.jpg'),
    dwarf_attack_axe: path.join(BRAIN, 'dwarf_attack_axe_1789847721353.jpg'),
    dwarf_attack_crossbow: path.join(BRAIN, 'dwarf_attack_crossbow_1789847739025.jpg'),
    dwarf_cast_magic: path.join(BRAIN, 'dwarf_cast_magic_1789847757229.jpg')
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
    const isOpaque = (x, y) => {
        if (x < 0 || x >= w || y < 0 || y >= h) return false;
        return buf[(y * w + x) * 4 + 3] > 0;
    };

    // 1. Remove isolated specks
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (isOpaque(x, y)) {
                let neighbors = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        if (isOpaque(x + dx, y + dy)) neighbors++;
                    }
                }
                if (neighbors < 2) {
                    buf[(y * w + x) * 4 + 3] = 0;
                }
            }
        }
    }

    // 2. Selective dark ink outline along outer contour
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
                if (lum < 165) {
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

function extractSprite(img, targetH = 38, targetW = 28, bottomRow = 47) {
    let minX = img.width, maxX = 0, minY = img.height, maxY = 0;
    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
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
    const actualW = Math.min(targetW, Math.max(14, Math.round(targetH * (bboxW / bboxH))));
    const startX = Math.round(24 - actualW / 2);
    const startY = Math.max(0, bottomRow - targetH + 1);

    for (let dy = 0; dy < targetH; dy++) {
        const fy = minY + (dy / Math.max(1, targetH - 1)) * (bboxH - 1);
        const iy = Math.min(img.height - 1, Math.round(fy));
        const outY = startY + dy;
        if (outY < 0 || outY >= 48) continue;

        for (let dx = 0; dx < actualW; dx++) {
            const fx = minX + (dx / Math.max(1, actualW - 1)) * (bboxW - 1);
            const ix = Math.min(img.width - 1, Math.round(fx));
            const outX = startX + dx;
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

function makeWalkVariant(base, stepSide, facingIndex = 0) {
    const out = Buffer.alloc(48 * 48 * 4);
    const bob = 1; // 1px vertical dip on footstep
    const isProfile = (facingIndex === 2 || facingIndex === 6);
    const isWest = (facingIndex === 2);
    const isEast = (facingIndex === 6);
    const isNorth = (facingIndex === 4);
    const isSouth = (facingIndex === 0);
    const isDiagonal = (!isProfile && !isNorth && !isSouth);

    // Find leg center of mass on rows 37..47
    let legMinX = 48, legMaxX = 0;
    for (let y = 37; y < 48; y++) {
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
                // Profile Left/Right dynamic leg split
                if (y >= 37) {
                    const prog = (y - 37) / 10;
                    const shift = Math.round(prog * 4);
                    const strideDir = (stepSide < 0) ? 1 : -1;
                    const fwdLeft = isWest ? (strideDir > 0) : (strideDir < 0);

                    if (fwdLeft) {
                        if (x <= legMidX) {
                            targetX = x - shift;
                            targetY = y; // Grounded on row 47
                        } else {
                            targetX = x + shift;
                            targetY = (y >= 46) ? (y - 2) : (y - 1); // Lift trailing boot off ground
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
                } else if (y >= 24 && y < 37) {
                    targetX = x + (isWest ? (stepSide < 0 ? -1 : 1) : (stepSide < 0 ? 1 : -1));
                }
            } else {
                // Front, Back, or Diagonal: lateral footstep stride
                if (y >= 37) {
                    const isLeftFoot = (x < 24);
                    const isLead = (stepSide < 0) ? isLeftFoot : !isLeftFoot;
                    if (isLead) {
                        // Leading foot plants flat on row 47
                        targetX = x + (stepSide < 0 ? -2 : 2);
                        targetY = y;
                    } else {
                        // Trailing foot lifts off ground
                        targetX = x + (stepSide < 0 ? 1 : -1);
                        targetY = (y >= 46) ? (y - 2) : (y - 1);
                    }
                } else if (y >= 24 && y < 37) {
                    // Arm counter-swing
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

function makeIdleVariant(base, phase) {
    if (phase === 0) return Buffer.from(base);
    const out = Buffer.alloc(48 * 48 * 4);
    const lift = (phase === 1) ? -1 : 0;
    for (let y = 0; y < 48; y++) {
        const dy = (y >= 12 && y <= 36) ? lift : 0;
        const targetY = y + dy;
        if (targetY < 0 || targetY >= 48) continue;
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            if (base[sIdx + 3] > 0) {
                const dIdx = (targetY * 48 + x) * 4;
                out[dIdx] = base[sIdx];
                out[dIdx + 1] = base[sIdx + 1];
                out[dIdx + 2] = base[sIdx + 2];
                out[dIdx + 3] = base[sIdx + 3];
            }
        }
    }
    return out;
}

function makeAttackVariant(base, phase, facingIndex) {
    const out = Buffer.alloc(48 * 48 * 4);
    const lungeX = (facingIndex === 2 || facingIndex === 1 || facingIndex === 3) ? -2 :
                   (facingIndex === 6 || facingIndex === 5 || facingIndex === 7) ? 2 : 0;
    const lungeY = (facingIndex === 0 || facingIndex === 1 || facingIndex === 7) ? 1 :
                   (facingIndex === 4 || facingIndex === 3 || facingIndex === 5) ? -1 : 0;

    const offset = (phase === 1) ? { x: lungeX, y: lungeY } :
                   (phase === 0) ? { x: -Math.sign(lungeX), y: -Math.sign(lungeY) } : { x: 0, y: 0 };

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
    return out;
}

function makeWorkVariant(base, phase) {
    const out = Buffer.alloc(48 * 48 * 4);
    const dip = (phase === 1) ? 2 : (phase === 2) ? 1 : -1;
    for (let y = 0; y < 48; y++) {
        const ty = y + dip;
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
    return out;
}

function makeCastVariant(base, phase) {
    const out = Buffer.alloc(48 * 48 * 4);
    const dy = (phase === 1) ? -1 : (phase === 2) ? 1 : 0;
    for (let y = 0; y < 48; y++) {
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
    return out;
}

function makeHurtVariant(base) {
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
                out[dIdx] = base[sIdx];
                out[dIdx + 1] = base[sIdx + 1];
                out[dIdx + 2] = base[sIdx + 2];
                out[dIdx + 3] = base[sIdx + 3];
            }
        }
    }
    return out;
}

function makeDeathVariant(base, phase) {
    const out = Buffer.alloc(48 * 48 * 4);
    if (phase === 0) {
        // Buckle: drop down 2px
        for (let y = 0; y < 48; y++) {
            const ty = y + 2;
            if (ty >= 48) continue;
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
    } else if (phase === 1) {
        // Going down
        for (let y = 0; y < 48; y++) {
            const ty = Math.round(30 + (y / 48) * 16);
            if (ty >= 48) continue;
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
    } else {
        // Fallen stout corpse / remains resting on rows 41..47
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = (y * 48 + x) * 4;
                if (base[sIdx + 3] > 0) {
                    const newX = Math.round(11 + (y / 48) * 26);
                    const newY = Math.round(41 + ((x - 10) / 28) * 6);
                    if (newX >= 0 && newX < 48 && newY >= 38 && newY < 48) {
                        const dIdx = (newY * 48 + newX) * 4;
                        out[dIdx] = base[sIdx];
                        out[dIdx + 1] = base[sIdx + 1];
                        out[dIdx + 2] = base[sIdx + 2];
                        out[dIdx + 3] = base[sIdx + 3];
                    }
                }
            }
        }
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

function makeSleepVariant(base) {
    const out = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            if (base[sIdx + 3] > 0) {
                const newX = Math.round(12 + (y / 48) * 24);
                const newY = Math.round(42 + ((x - 10) / 28) * 5);
                if (newX >= 0 && newX < 48 && newY >= 38 && newY < 48) {
                    const dIdx = (newY * 48 + newX) * 4;
                    out[dIdx] = base[sIdx];
                    out[dIdx + 1] = base[sIdx + 1];
                    out[dIdx + 2] = base[sIdx + 2];
                    out[dIdx + 3] = base[sIdx + 3];
                }
            }
        }
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

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
                        buf[dIdx] = f[sIdx];
                        buf[dIdx + 1] = f[sIdx + 1];
                        buf[dIdx + 2] = f[sIdx + 2];
                        buf[dIdx + 3] = 255;
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
                                raw[dIdx] = frame[sIdx];
                                raw[dIdx + 1] = frame[sIdx + 1];
                                raw[dIdx + 2] = frame[sIdx + 2];
                                raw[dIdx + 3] = 255;
                            }
                        }
                    }
                }
            }
        }
    }
    return { w, h, buf: raw };
}

function buildAR600Master(standList, walkList, workList, attackList, castList, hurtList, deathList, idleList) {
    const fullFrames = [];
    for (let r = 0; r < 8; r++) {
        const fStand = standList[r];
        const fWalk0 = walkList[r * 3], fWalk1 = walkList[r * 3 + 1], fWalk2 = walkList[r * 3 + 2];
        const fWork0 = workList[r * 3], fWork1 = workList[r * 3 + 1], fWork2 = workList[r * 3 + 2];
        const fAtk0  = attackList[r * 3], fAtk1  = attackList[r * 3 + 1], fAtk2  = attackList[r * 3 + 2];
        const fCast0 = castList[r * 3], fCast1 = castList[r * 3 + 1], fCast2 = castList[r * 3 + 2];
        const fHurt  = hurtList[r];
        const fDead0 = deathList[r * 3], fDead1 = deathList[r * 3 + 1], fDead2 = deathList[r * 3 + 2];
        const fIdle0 = idleList[r * 3 + 1], fIdle1 = idleList[r * 3 + 2];

        fullFrames.push(
            fStand,
            fWalk0, fWalk1, fWalk2,
            fWork0, fWork1, fWork2,
            fStand,
            fAtk0, fAtk1, fAtk2,
            fCast0, fCast1, fCast2,
            fHurt,
            fDead0, fDead1, fDead2,
            fIdle0, fIdle1
        );
    }
    return assembleGrid(fullFrames, 20, 8);
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
                    buf[dIdx] = f[sIdx];
                    buf[dIdx + 1] = f[sIdx + 1];
                    buf[dIdx + 2] = f[sIdx + 2];
                    buf[dIdx + 3] = f[sIdx + 3];
                }
            }
        }
    }
    quantizeSheet(buf, 144, 192, 31);
    return buf;
}

function processDwarfGender(gender, frontSrc, sideSrc, backSrc) {
    console.log(`Processing Dwarf ${gender}...`);
    const imgFront = loadJpg(frontSrc);
    const imgSide  = loadJpg(sideSrc);
    const imgBack  = loadJpg(backSrc);

    const targetH = (gender === 'male') ? 38 : 36;
    const targetW = (gender === 'male') ? 28 : 26;

    const dS = extractSprite(imgFront, targetH, targetW, 47);
    const dW = extractSprite(imgSide,  targetH, targetW - 2, 47);
    const dE = mirrorFrame(dW);
    const dN = extractSprite(imgBack,  targetH, targetW, 47);

    const dSW = blendDiagonal(dS, dW);
    const dSE = blendDiagonal(dS, dE);
    const dNW = blendDiagonal(dN, dW);
    const dNE = blendDiagonal(dN, dE);

    const facings = [dS, dSW, dW, dNW, dN, dNE, dE, dSE];
    const FACINGS_LIST = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"];

    const standFrames = [];
    const walkFrames = [];
    const idleFrames = [];
    const attackFrames = [];
    const workFrames = [];
    const castFrames = [];
    const hurtFrames = [];
    const deathFrames = [];
    const sleepFrames = [];

    for (let r = 0; r < 8; r++) {
        const base = facings[r];
        standFrames.push(base);
        walkFrames.push(makeWalkVariant(base, -1, r), base, makeWalkVariant(base, 1, r));
        idleFrames.push(makeIdleVariant(base, 0), makeIdleVariant(base, 1), makeIdleVariant(base, 2));
        attackFrames.push(makeAttackVariant(base, 0, r), makeAttackVariant(base, 1, r), makeAttackVariant(base, 2, r));
        workFrames.push(makeWorkVariant(base, 0), makeWorkVariant(base, 1), makeWorkVariant(base, 2));
        castFrames.push(makeCastVariant(base, 0), makeCastVariant(base, 1), makeCastVariant(base, 2));
        hurtFrames.push(makeHurtVariant(base));
        deathFrames.push(makeDeathVariant(base, 0), makeDeathVariant(base, 1), makeDeathVariant(base, 2));
        sleepFrames.push(makeSleepVariant(base));
    }

    // Save individual action masters
    const actions = [
        { name: `dwarf_${gender}_stand`, frames: standFrames, cols: 1, anim: { stand: [0] } },
        { name: `dwarf_${gender}_adult_walk`, frames: walkFrames, cols: 3, anim: { walk: [0, 1, 2] } },
        { name: `dwarf_${gender}_adult_idle`, frames: idleFrames, cols: 3, anim: { stand: [0], idle: [0, 1, 2] } },
        { name: `dwarf_${gender}_adult_attack`, frames: attackFrames, cols: 3, anim: { attack: [0, 1, 2] } },
        { name: `dwarf_${gender}_adult_work`, frames: workFrames, cols: 3, anim: { work: [0, 1, 2] } },
        { name: `dwarf_${gender}_adult_cast`, frames: castFrames, cols: 3, anim: { cast: [0, 1, 2] } },
        { name: `dwarf_${gender}_adult_hurt`, frames: hurtFrames, cols: 1, anim: { hurt: [0] } },
        { name: `dwarf_${gender}_adult_death`, frames: deathFrames, cols: 3, anim: { death: [0, 1, 2] } },
        { name: `dwarf_${gender}_adult_sleep`, frames: sleepFrames, cols: 1, anim: { sleep: [0] } }
    ];

    for (const act of actions) {
        const buf = assembleGrid(act.frames, act.cols, 8);
        writePNG(path.join(MASTERS_DIR, `${act.name}.png`), act.cols * 48, 384, buf);
        fs.writeFileSync(path.join(MASTERS_DIR, `${act.name}.json`), JSON.stringify({
            id: act.name,
            species: "dwarf",
            gender,
            stage: "adult",
            frameWidth: 48,
            frameHeight: 48,
            anchor: [24, 47],
            footprint: [1, 1],
            facings: FACINGS_LIST,
            animations: act.anim,
            frameMs: 150
        }, null, 2));

        const raw = makeRawCanvas(act.frames, act.cols, 8);
        writePNG(path.join(RAW_DIR, `${act.name}.png`), raw.w, raw.h, raw.buf);
    }

    // Full AR-600 Master (960x384)
    const ar600Buf = buildAR600Master(standFrames, walkFrames, workFrames, attackFrames, castFrames, hurtFrames, deathFrames, idleFrames);
    writePNG(path.join(MASTERS_DIR, `dwarf_${gender}.png`), 960, 384, ar600Buf);
    writePNG(path.join(CHAR_DIR, `$UF_Dwarf_${gender === 'male' ? 'Male' : 'Female'}_AR600.png`), 960, 384, ar600Buf);

    const sidecarAR600 = {
        id: `dwarf_${gender}`,
        species: "dwarf",
        gender,
        stage: "adult",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
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
    fs.writeFileSync(path.join(MASTERS_DIR, `dwarf_${gender}.json`), JSON.stringify(sidecarAR600, null, 2));
    fs.writeFileSync(path.join(CHAR_DIR, `$UF_Dwarf_${gender === 'male' ? 'Male' : 'Female'}_AR600.json`), JSON.stringify(sidecarAR600, null, 2));

    // RMMZ 8D Charset (144x384)
    const walk8DBuf = assembleGrid(walkFrames, 3, 8);
    const charsetName = `$UF_Dwarf_${gender === 'male' ? 'Male' : 'Female'}_8D`;
    writePNG(path.join(CHAR_DIR, `${charsetName}.png`), 144, 384, walk8DBuf);
    fs.writeFileSync(path.join(CHAR_DIR, `${charsetName}.json`), JSON.stringify({
        id: charsetName,
        species: "dwarf",
        gender,
        stage: "adult",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: FACINGS_LIST,
        animations: { stand: [1], walk: [0, 1, 2, 1] },
        frameMs: 150
    }, null, 2));

    return {
        standFrames,
        walkFrames,
        idleFrames,
        attackFrames,
        workFrames,
        castFrames,
        hurtFrames,
        deathFrames,
        sleepFrames
    };
}

function main() {
    console.log('=== Processing Complete Dwarf 8-Directional Sprite Suites ===');

    const maleData = processDwarfGender('male', SOURCES.dwarf_male_front, SOURCES.dwarf_male_side, SOURCES.dwarf_male_back);
    const femData  = processDwarfGender('female', SOURCES.dwarf_female_front, SOURCES.dwarf_female_side, SOURCES.dwarf_female_back);

    const FACINGS_LIST = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"];

    // Default 8D Dwarf Charset ($UF_Dwarf_8D.png)
    const defaultDwarf8DBuf = assembleGrid(maleData.walkFrames, 3, 8);
    writePNG(path.join(CHAR_DIR, '$UF_Dwarf_8D.png'), 144, 384, defaultDwarf8DBuf);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Dwarf_8D.json'), JSON.stringify({
        id: "$UF_Dwarf_8D",
        species: "dwarf",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: FACINGS_LIST,
        animations: { stand: [1], walk: [0, 1, 2, 1] },
        frameMs: 150
    }, null, 2));

    // Default 4-way Dwarf Charset ($UF_Dwarf.png)
    const rmmzRowIndices = [0, 2, 6, 4]; // S, W, E, N
    const defaultDwarf4Way = Buffer.alloc(144 * 192 * 4);
    for (let r = 0; r < 4; r++) {
        const srcRow = rmmzRowIndices[r];
        for (let c = 0; c < 3; c++) {
            const frame = maleData.walkFrames[srcRow * 3 + c];
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (y * 48 + x) * 4;
                    const dIdx = ((r * 48 + y) * 144 + (c * 48 + x)) * 4;
                    defaultDwarf4Way[dIdx] = frame[sIdx];
                    defaultDwarf4Way[dIdx + 1] = frame[sIdx + 1];
                    defaultDwarf4Way[dIdx + 2] = frame[sIdx + 2];
                    defaultDwarf4Way[dIdx + 3] = frame[sIdx + 3];
                }
            }
        }
    }
    quantizeSheet(defaultDwarf4Way, 144, 192, 31);
    writePNG(path.join(CHAR_DIR, '$UF_Dwarf.png'), 144, 192, defaultDwarf4Way);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Dwarf.json'), JSON.stringify({
        id: "$UF_Dwarf",
        species: "dwarf",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: { stand: [1], walk: [0, 1, 2, 1] },
        frameMs: 150
    }, null, 2));

    // Dwarf 8D Combat Sheets
    const dwarfAttackAxe8D = assembleGrid(maleData.attackFrames, 3, 8);
    writePNG(path.join(CHAR_DIR, '$UF_Dwarf_Attack_Axe_8D.png'), 144, 384, dwarfAttackAxe8D);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Dwarf_Attack_Axe_8D.json'), JSON.stringify({
        id: "$UF_Dwarf_Attack_Axe_8D",
        species: "dwarf",
        weapon: "dwarf_axe",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: FACINGS_LIST,
        animations: { attack: [0, 1, 2] },
        frameMs: 120
    }, null, 2));

    const dwarfAttackCrossbow8D = assembleGrid(maleData.attackFrames, 3, 8);
    writePNG(path.join(CHAR_DIR, '$UF_Dwarf_Attack_Crossbow_8D.png'), 144, 384, dwarfAttackCrossbow8D);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Dwarf_Attack_Crossbow_8D.json'), JSON.stringify({
        id: "$UF_Dwarf_Attack_Crossbow_8D",
        species: "dwarf",
        weapon: "dwarf_crossbow",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: FACINGS_LIST,
        animations: { attack: [0, 1, 2] },
        frameMs: 120
    }, null, 2));

    const dwarfCastHammer8D = assembleGrid(maleData.castFrames, 3, 8);
    writePNG(path.join(CHAR_DIR, '$UF_Dwarf_Cast_Hammer_8D.png'), 144, 384, dwarfCastHammer8D);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Dwarf_Cast_Hammer_8D.json'), JSON.stringify({
        id: "$UF_Dwarf_Cast_Hammer_8D",
        species: "dwarf",
        weapon: "dwarf_rune_hammer",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: FACINGS_LIST,
        animations: { cast: [0, 1, 2] },
        frameMs: 150
    }, null, 2));

    // 4-Way Combat Sheets
    const dwarfAttackAxe4Way = buildCombat4WaySheet(maleData.standFrames, maleData.attackFrames);
    writePNG(path.join(CHAR_DIR, '$UF_Dwarf_Attack_Axe.png'), 144, 192, dwarfAttackAxe4Way);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Dwarf_Attack_Axe.json'), JSON.stringify({
        id: "$UF_Dwarf_Attack_Axe",
        species: "dwarf",
        weapon: "dwarf_axe",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: { attack: [0, 1, 2] },
        frameMs: 120
    }, null, 2));

    const dwarfAttackCrossbow4Way = buildCombat4WaySheet(maleData.standFrames, maleData.attackFrames);
    writePNG(path.join(CHAR_DIR, '$UF_Dwarf_Attack_Crossbow.png'), 144, 192, dwarfAttackCrossbow4Way);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Dwarf_Attack_Crossbow.json'), JSON.stringify({
        id: "$UF_Dwarf_Attack_Crossbow",
        species: "dwarf",
        weapon: "dwarf_crossbow",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: { attack: [0, 1, 2] },
        frameMs: 120
    }, null, 2));

    const dwarfCastHammer4Way = buildCombat4WaySheet(maleData.standFrames, maleData.castFrames);
    writePNG(path.join(CHAR_DIR, '$UF_Dwarf_Cast_Hammer.png'), 144, 192, dwarfCastHammer4Way);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Dwarf_Cast_Hammer.json'), JSON.stringify({
        id: "$UF_Dwarf_Cast_Hammer",
        species: "dwarf",
        weapon: "dwarf_rune_hammer",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: { cast: [0, 1, 2] },
        frameMs: 150
    }, null, 2));

    // Female Combat Sheets
    const femAttack4Way = buildCombat4WaySheet(femData.standFrames, femData.attackFrames);
    writePNG(path.join(CHAR_DIR, '$UF_Dwarf_Female_Attack.png'), 144, 192, femAttack4Way);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Dwarf_Female_Attack.json'), JSON.stringify({
        id: "$UF_Dwarf_Female_Attack",
        species: "dwarf",
        gender: "female",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: { attack: [0, 1, 2] },
        frameMs: 120
    }, null, 2));

    const femCast4Way = buildCombat4WaySheet(femData.standFrames, femData.castFrames);
    writePNG(path.join(CHAR_DIR, '$UF_Dwarf_Female_Cast.png'), 144, 192, femCast4Way);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Dwarf_Female_Cast.json'), JSON.stringify({
        id: "$UF_Dwarf_Female_Cast",
        species: "dwarf",
        gender: "female",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: { cast: [0, 1, 2] },
        frameMs: 150
    }, null, 2));

    // Render Showcase in art/review/
    console.log('Rendering Dwarf 8D Showcase Image...');
    const SHOW_W = 8 * 48 * 4; // 1536
    const SHOW_H = 4 * 48 * 4 + 32; // 800
    const showBuf = Buffer.alloc(SHOW_W * SHOW_H * 4);

    // Warm stone-earth background #3A3228
    for (let i = 0; i < showBuf.length; i += 4) {
        showBuf[i] = 58; showBuf[i + 1] = 50; showBuf[i + 2] = 40; showBuf[i + 3] = 255;
    }

    const rowsToShow = [
        { label: "Male Dwarf Walk (Stand)", frames: maleData.standFrames },
        { label: "Male Dwarf Attack (Cleave)", frames: Array.from({length: 8}, (_, r) => maleData.attackFrames[r * 3 + 1]) },
        { label: "Female Dwarf Walk (Stand)", frames: femData.standFrames },
        { label: "Female Dwarf Attack (Cleave)", frames: Array.from({length: 8}, (_, r) => femData.attackFrames[r * 3 + 1]) }
    ];

    for (let row = 0; row < rowsToShow.length; row++) {
        const item = rowsToShow[row];
        for (let col = 0; col < 8; col++) {
            const f = item.frames[col];
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (y * 48 + x) * 4;
                    if (f[sIdx + 3] > 0) {
                        for (let dy = 0; dy < 4; dy++) {
                            for (let dx = 0; dx < 4; dx++) {
                                const ry = (row * 48 + y) * 4 + dy + 16;
                                const rx = (col * 48 + x) * 4 + dx;
                                const dIdx = (ry * SHOW_W + rx) * 4;
                                showBuf[dIdx] = f[sIdx];
                                showBuf[dIdx + 1] = f[sIdx + 1];
                                showBuf[dIdx + 2] = f[sIdx + 2];
                                showBuf[dIdx + 3] = 255;
                            }
                        }
                    }
                }
            }
        }
    }

    writePNG(path.join(REVIEW_DIR, 'dwarf_sprites_8d_actions_showcase_4x.png'), SHOW_W, SHOW_H, showBuf);
    console.log('Saved review showcase: art/review/dwarf_sprites_8d_actions_showcase_4x.png');

    // Also render Comparative Compass Comparison: Human & Dwarf side-by-side
    console.log('Rendering Human & Dwarf Comparative Compass Showcase...');
    const COMP_W = 8 * 48 * 4; // 1536
    const COMP_H = 4 * 48 * 4 + 32; // 800
    const compBuf = Buffer.alloc(COMP_W * COMP_H * 4);

    // Deep slate tone #2A3036
    for (let i = 0; i < compBuf.length; i += 4) {
        compBuf[i] = 42; compBuf[i + 1] = 48; compBuf[i + 2] = 54; compBuf[i + 3] = 255;
    }

    const compRows = [
        { label: "Human Male 8D", frames: maleData.standFrames /* placeholder swapped below */ },
        { label: "Dwarf Male 8D", frames: maleData.standFrames },
        { label: "Human Female 8D", frames: femData.standFrames /* placeholder swapped below */ },
        { label: "Dwarf Female 8D", frames: femData.standFrames }
    ];

    // Load human stand frames
    const humanMaleStandImg = decodePNG(fs.readFileSync(path.join(MASTERS_DIR, 'human_male_stand.png')));
    const humanFemStandImg  = decodePNG(fs.readFileSync(path.join(MASTERS_DIR, 'human_female_stand.png')));
    compRows[0].frames = Array.from({length: 8}, (_, r) => {
        const f = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = ((r * 48 + y) * 48 + x) * 4;
                const dIdx = (y * 48 + x) * 4;
                f[dIdx] = humanMaleStandImg.data[sIdx];
                f[dIdx + 1] = humanMaleStandImg.data[sIdx + 1];
                f[dIdx + 2] = humanMaleStandImg.data[sIdx + 2];
                f[dIdx + 3] = humanMaleStandImg.data[sIdx + 3];
            }
        }
        return f;
    });
    compRows[2].frames = Array.from({length: 8}, (_, r) => {
        const f = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = ((r * 48 + y) * 48 + x) * 4;
                const dIdx = (y * 48 + x) * 4;
                f[dIdx] = humanFemStandImg.data[sIdx];
                f[dIdx + 1] = humanFemStandImg.data[sIdx + 1];
                f[dIdx + 2] = humanFemStandImg.data[sIdx + 2];
                f[dIdx + 3] = humanFemStandImg.data[sIdx + 3];
            }
        }
        return f;
    });

    for (let row = 0; row < compRows.length; row++) {
        const item = compRows[row];
        for (let col = 0; col < 8; col++) {
            const f = item.frames[col];
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (y * 48 + x) * 4;
                    if (f[sIdx + 3] > 0) {
                        for (let dy = 0; dy < 4; dy++) {
                            for (let dx = 0; dx < 4; dx++) {
                                const ry = (row * 48 + y) * 4 + dy + 16;
                                const rx = (col * 48 + x) * 4 + dx;
                                const dIdx = (ry * COMP_W + rx) * 4;
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

    writePNG(path.join(REVIEW_DIR, 'human_dwarf_8d_compass_comparison_4x.png'), COMP_W, COMP_H, compBuf);
    console.log('Saved comparison showcase: art/review/human_dwarf_8d_compass_comparison_4x.png');
    console.log('=== Dwarf 8D Suite Assembly Complete! ===');
}

main();
