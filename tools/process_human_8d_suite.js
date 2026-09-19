#!/usr/bin/env node
'use strict';

/**
 * tools/process_human_8d_suite.js
 *
 * Assembles and synthesizes complete 8-directional sprite suites for Human Settlers
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
const SOURCES_FEMALE = {
    stand: path.join(BRAIN, 'nb_human_female_stand_1789842764528.jpg'),
    back:  path.join(BRAIN, 'nb_human_female_back_1789842777928.jpg'),
    side:  path.join(BRAIN, 'nb_human_female_side_1789842791787.jpg')
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
                // Preserve specular highlights
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

function extractSprite(img, targetH = 46, targetW = 24, bottomRow = 47) {
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
    const actualW = Math.min(targetW, Math.max(12, Math.round(targetH * (bboxW / bboxH))));
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

function makeWalkVariant(base, stepSide) {
    // stepSide: -1 = left step, 1 = right step
    const out = Buffer.alloc(48 * 48 * 4);
    const bob = Math.abs(stepSide); // 1px vertical dip
    for (let y = 0; y < 48; y++) {
        const targetY = y + bob;
        if (targetY >= 48) continue;
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            if (base[sIdx + 3] > 0) {
                let dx = 0;
                // Leg stride modification below waist (row >= 36)
                if (y >= 36) {
                    if (stepSide < 0) {
                        // Left step forward, right foot trailing
                        if (x < 24) dx = -1; else dx = 1;
                    } else if (stepSide > 0) {
                        // Right step forward, left foot trailing
                        if (x >= 24) dx = 1; else dx = -1;
                    }
                }
                const targetX = Math.max(0, Math.min(47, x + dx));
                const dIdx = (targetY * 48 + targetX) * 4;
                out[dIdx] = base[sIdx];
                out[dIdx + 1] = base[sIdx + 1];
                out[dIdx + 2] = base[sIdx + 2];
                out[dIdx + 3] = base[sIdx + 3];
            }
        }
    }
    return out;
}

function makeIdleVariant(base, phase) {
    // phase: 0 = neutral, 1 = breathe in (chest lift 1px), 2 = settle
    if (phase === 0) return Buffer.from(base);
    const out = Buffer.alloc(48 * 48 * 4);
    const lift = (phase === 1) ? -1 : 0;
    for (let y = 0; y < 48; y++) {
        const dy = (y >= 10 && y <= 35) ? lift : 0;
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
    // phase: 0 = wind-up, 1 = strike/lunge, 2 = recover
    const out = Buffer.alloc(48 * 48 * 4);
    const lungeX = (facingIndex === 2 || facingIndex === 1 || facingIndex === 3) ? -2 :
                   (facingIndex === 6 || facingIndex === 5 || facingIndex === 7) ? 2 : 0;
    const lungeY = (facingIndex === 0 || facingIndex === 1 || facingIndex === 7) ? 2 :
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
    // 0 = raise tool, 1 = downward stroke, 2 = follow-through
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
    // 0 = gather magic, 1 = raise arms aloft, 2 = release thrust
    const out = Buffer.alloc(48 * 48 * 4);
    const dy = (phase === 1) ? -2 : (phase === 2) ? 1 : 0;
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
    // 1 frame defensive recoil flinch (leaned back 2px, up 1px)
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
    // 0 = buckle knee, 1 = impact fall, 2 = flat fallen corpse / remains on rows 41..47
    const out = Buffer.alloc(48 * 48 * 4);
    if (phase === 0) {
        // Buckle knee: squat down 3px
        for (let y = 0; y < 48; y++) {
            const ty = y + 3;
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
        // Going down: squashed 45 degrees
        for (let y = 0; y < 48; y++) {
            const ty = Math.round(28 + (y / 48) * 18);
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
        // Flat fallen corpse / remains resting horizontally on rows 41..47
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = (y * 48 + x) * 4;
                if (base[sIdx + 3] > 0) {
                    // Map upright figure into horizontal prone figure
                    const newX = Math.round(10 + (y / 48) * 28);
                    const newY = Math.round(41 + ((x - 12) / 24) * 6);
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
    // Prone restful sleeping pose on bed/ground (rows 40..47)
    const out = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            if (base[sIdx + 3] > 0) {
                const newX = Math.round(12 + (y / 48) * 24);
                const newY = Math.round(42 + ((x - 12) / 24) * 5);
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

// Upscale 48x48 buffer to raw 4x (192x192) on flat magenta #FF00FF
function makeRawCanvas(framesColsRows, cols, rows) {
    const w = cols * 48 * 4;
    const h = rows * 48 * 4;
    const raw = Buffer.alloc(w * h * 4);

    // Fill with magenta
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

function main() {
    console.log('=== Processing Complete Human 8-Directional Sprite Suites ===');

    // -------------------------------------------------------------
    // PART A: Human Female 8D Action Suite Extraction & Synthesis
    // -------------------------------------------------------------
    console.log('Loading Human Female high-res sources...');
    const imgFemStand = loadJpg(SOURCES_FEMALE.stand);
    const imgFemSide  = loadJpg(SOURCES_FEMALE.side);
    const imgFemBack  = loadJpg(SOURCES_FEMALE.back);

    const femS = extractSprite(imgFemStand, 46, 24, 47);
    const femW = extractSprite(imgFemSide,  46, 20, 47);
    const femE = mirrorFrame(femW);
    const femN = extractSprite(imgFemBack,  46, 24, 47);

    const femSW = blendDiagonal(femS, femW);
    const femSE = blendDiagonal(femS, femE);
    const femNW = blendDiagonal(femN, femW);
    const femNE = blendDiagonal(femN, femE);

    // 8 Facings order: S (0), SW (1), W (2), NW (3), N (4), NE (5), E (6), SE (7)
    const femFacings = [femS, femSW, femW, femNW, femN, femNE, femE, femSE];
    const FACINGS_LIST = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"];

    // Synthesize Actions for Female
    console.log('Synthesizing 8 actions across all 8 facings for Human Female...');
    const femWalkFrames = [];
    const femIdleFrames = [];
    const femAttackFrames = [];
    const femWorkFrames = [];
    const femCastFrames = [];
    const femHurtFrames = [];
    const femDeathFrames = [];
    const femSleepFrames = [];
    const femStandFrames = [];

    for (let r = 0; r < 8; r++) {
        const base = femFacings[r];
        femStandFrames.push(base);

        // Walk: left step, pass (stand), right step
        femWalkFrames.push(makeWalkVariant(base, -1), base, makeWalkVariant(base, 1));

        // Idle: neutral, breathe in, settle
        femIdleFrames.push(makeIdleVariant(base, 0), makeIdleVariant(base, 1), makeIdleVariant(base, 2));

        // Attack: wind-up, strike/lunge, recover
        femAttackFrames.push(makeAttackVariant(base, 0, r), makeAttackVariant(base, 1, r), makeAttackVariant(base, 2, r));

        // Work: raise tool, strike down, follow-through
        femWorkFrames.push(makeWorkVariant(base, 0), makeWorkVariant(base, 1), makeWorkVariant(base, 2));

        // Cast: gather, invoke, release
        femCastFrames.push(makeCastVariant(base, 0), makeCastVariant(base, 1), makeCastVariant(base, 2));

        // Hurt: 1 frame recoil
        femHurtFrames.push(makeHurtVariant(base));

        // Death: buckle, fall, resting remains
        femDeathFrames.push(makeDeathVariant(base, 0), makeDeathVariant(base, 1), makeDeathVariant(base, 2));

        // Sleep: 1 frame horizontal/curled
        femSleepFrames.push(makeSleepVariant(base));
    }

    // Write Female Masters & Raw Canvases
    const femActions = [
        { name: 'human_female_stand', frames: femStandFrames, cols: 1, anim: { stand: [0] } },
        { name: 'human_female_adult_walk', frames: femWalkFrames, cols: 3, anim: { walk: [0, 1, 2] } },
        { name: 'human_female_adult_idle', frames: femIdleFrames, cols: 3, anim: { stand: [0], idle: [0, 1, 2] } },
        { name: 'human_female_adult_attack', frames: femAttackFrames, cols: 3, anim: { attack: [0, 1, 2] } },
        { name: 'human_female_adult_work', frames: femWorkFrames, cols: 3, anim: { work: [0, 1, 2] } },
        { name: 'human_female_adult_cast', frames: femCastFrames, cols: 3, anim: { cast: [0, 1, 2] } },
        { name: 'human_female_adult_hurt', frames: femHurtFrames, cols: 1, anim: { hurt: [0] } },
        { name: 'human_female_adult_death', frames: femDeathFrames, cols: 3, anim: { death: [0, 1, 2] } },
        { name: 'human_female_adult_sleep', frames: femSleepFrames, cols: 1, anim: { sleep: [0] } }
    ];

    for (const act of femActions) {
        const buf = assembleGrid(act.frames, act.cols, 8);
        const masterPng = path.join(MASTERS_DIR, `${act.name}.png`);
        writePNG(masterPng, act.cols * 48, 384, buf);

        const sidecar = {
            id: act.name,
            species: "human",
            gender: "female",
            stage: "adult",
            frameWidth: 48,
            frameHeight: 48,
            anchor: [24, 47],
            footprint: [1, 1],
            facings: FACINGS_LIST,
            animations: act.anim,
            frameMs: 150
        };
        fs.writeFileSync(path.join(MASTERS_DIR, `${act.name}.json`), JSON.stringify(sidecar, null, 2));

        // Raw 4x canvas
        const raw = makeRawCanvas(act.frames, act.cols, 8);
        writePNG(path.join(RAW_DIR, `${act.name}.png`), raw.w, raw.h, raw.buf);
    }
    console.log('Saved all Human Female 8D action masters and raw canvases.');

    // -------------------------------------------------------------
    // PART B: Human Male 8D Action Suite Assembly & Sleep
    // -------------------------------------------------------------
    console.log('Loading Human Male 8D action masters...');
    const maleWalkDecoded = decodePNG(fs.readFileSync(path.join(MASTERS_DIR, 'human_male_adult_walk.png')));
    const maleAttackDecoded = decodePNG(fs.readFileSync(path.join(MASTERS_DIR, 'human_male_adult_attack.png')));
    const maleIdleDecoded = decodePNG(fs.readFileSync(path.join(MASTERS_DIR, 'human_male_adult_idle.png')));
    const maleWorkDecoded = decodePNG(fs.readFileSync(path.join(MASTERS_DIR, 'human_male_adult_work.png')));
    const maleCastDecoded = decodePNG(fs.readFileSync(path.join(MASTERS_DIR, 'human_male_adult_cast.png')));
    const maleHurtDecoded = decodePNG(fs.readFileSync(path.join(MASTERS_DIR, 'human_male_adult_hurt.png')));
    const maleDeathDecoded = decodePNG(fs.readFileSync(path.join(MASTERS_DIR, 'human_male_adult_death.png')));
    const maleStandDecoded = decodePNG(fs.readFileSync(path.join(MASTERS_DIR, 'human_male_stand.png')));

    function getSubFrame(decoded, col, row, totalCols) {
        const frame = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = ((row * 48 + y) * decoded.width + (col * 48 + x)) * 4;
                const dIdx = (y * 48 + x) * 4;
                frame[dIdx] = decoded.data[sIdx];
                frame[dIdx + 1] = decoded.data[sIdx + 1];
                frame[dIdx + 2] = decoded.data[sIdx + 2];
                frame[dIdx + 3] = decoded.data[sIdx + 3];
            }
        }
        return frame;
    }

    // Build Male Sleep frames from death frame 2 (remains)
    const maleSleepFrames = [];
    for (let r = 0; r < 8; r++) {
        const remains = getSubFrame(maleDeathDecoded, 2, r, 3);
        maleSleepFrames.push(remains);
    }
    const maleSleepBuf = assembleGrid(maleSleepFrames, 1, 8);
    writePNG(path.join(MASTERS_DIR, 'human_male_adult_sleep.png'), 48, 384, maleSleepBuf);
    fs.writeFileSync(path.join(MASTERS_DIR, 'human_male_adult_sleep.json'), JSON.stringify({
        id: "human_male_adult_sleep",
        species: "human",
        gender: "male",
        stage: "adult",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: FACINGS_LIST,
        animations: { sleep: [0] },
        frameMs: 150
    }, null, 2));

    // -------------------------------------------------------------
    // PART C: Full AR-600 Masters (960x384 px = 20 cols x 8 rows)
    // -------------------------------------------------------------
    // AR-600 layout:
    // Col 0: stand
    // Cols 1-3: walk
    // Cols 4-6: work
    // Col 7: stand (carry legacy slot per V89)
    // Cols 8-10: attack
    // Cols 11-13: cast
    // Col 14: hurt
    // Cols 15-17: death
    // Cols 18-19: idle
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
                fStand,                                   // 0 stand
                fWalk0, fWalk1, fWalk2,                   // 1-3 walk
                fWork0, fWork1, fWork2,                   // 4-6 work
                fStand,                                   // 7 carry (filled with stand per V89)
                fAtk0, fAtk1, fAtk2,                      // 8-10 attack
                fCast0, fCast1, fCast2,                   // 11-13 cast
                fHurt,                                    // 14 hurt
                fDead0, fDead1, fDead2,                   // 15-17 death
                fIdle0, fIdle1                            // 18-19 idle
            );
        }
        return assembleGrid(fullFrames, 20, 8);
    }

    console.log('Assembling full AR-600 20-col x 8-row masters (960x384 px)...');
    const maleStandList = Array.from({length: 8}, (_, r) => getSubFrame(maleStandDecoded, 0, r, 1));
    const maleWalkList  = Array.from({length: 24}, (_, i) => getSubFrame(maleWalkDecoded, i % 3, Math.floor(i / 3), 3));
    const maleWorkList  = Array.from({length: 24}, (_, i) => getSubFrame(maleWorkDecoded, i % 3, Math.floor(i / 3), 3));
    const maleAtkList   = Array.from({length: 24}, (_, i) => getSubFrame(maleAttackDecoded, i % 3, Math.floor(i / 3), 3));
    const maleCastList  = Array.from({length: 24}, (_, i) => getSubFrame(maleCastDecoded, i % 3, Math.floor(i / 3), 3));
    const maleHurtList  = Array.from({length: 8}, (_, r) => getSubFrame(maleHurtDecoded, 0, r, 1));
    const maleDeathList = Array.from({length: 24}, (_, i) => getSubFrame(maleDeathDecoded, i % 3, Math.floor(i / 3), 3));
    const maleIdleList  = Array.from({length: 24}, (_, i) => getSubFrame(maleIdleDecoded, i % 3, Math.floor(i / 3), 3));

    const maleAR600Buf = buildAR600Master(maleStandList, maleWalkList, maleWorkList, maleAtkList, maleCastList, maleHurtList, maleDeathList, maleIdleList);
    writePNG(path.join(MASTERS_DIR, 'human_male.png'), 960, 384, maleAR600Buf);
    writePNG(path.join(CHAR_DIR, '$UF_Human_Male_AR600.png'), 960, 384, maleAR600Buf);

    const femAR600Buf = buildAR600Master(femStandFrames, femWalkFrames, femWorkFrames, femAttackFrames, femCastFrames, femHurtFrames, femDeathFrames, femIdleFrames);
    writePNG(path.join(MASTERS_DIR, 'human_female.png'), 960, 384, femAR600Buf);
    writePNG(path.join(CHAR_DIR, '$UF_Human_Female_AR600.png'), 960, 384, femAR600Buf);

    const ar600Sidecar = (gender) => ({
        id: `human_${gender}`,
        species: "human",
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
    });
    fs.writeFileSync(path.join(MASTERS_DIR, 'human_male.json'), JSON.stringify(ar600Sidecar("male"), null, 2));
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Human_Male_AR600.json'), JSON.stringify(ar600Sidecar("male"), null, 2));
    fs.writeFileSync(path.join(MASTERS_DIR, 'human_female.json'), JSON.stringify(ar600Sidecar("female"), null, 2));
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Human_Female_AR600.json'), JSON.stringify(ar600Sidecar("female"), null, 2));

    // -------------------------------------------------------------
    // PART D: RMMZ Drop-In Character Sheets (144x384 & 144x192)
    // -------------------------------------------------------------
    console.log('Writing RMMZ Character Sheets to game/img/characters/...');

    // 1. $UF_Human_Male_8D (144x384)
    const maleWalkCharset = assembleGrid(maleWalkList, 3, 8);
    writePNG(path.join(CHAR_DIR, '$UF_Human_Male_8D.png'), 144, 384, maleWalkCharset);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Human_Male_8D.json'), JSON.stringify({
        id: "$UF_Human_Male_8D",
        species: "human",
        gender: "male",
        stage: "adult",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: FACINGS_LIST,
        animations: { stand: [1], walk: [0, 1, 2, 1] },
        frameMs: 150
    }, null, 2));

    // 2. $UF_Human_Female_8D (144x384)
    const femWalkCharset = assembleGrid(femWalkFrames, 3, 8);
    writePNG(path.join(CHAR_DIR, '$UF_Human_Female_8D.png'), 144, 384, femWalkCharset);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Human_Female_8D.json'), JSON.stringify({
        id: "$UF_Human_Female_8D",
        species: "human",
        gender: "female",
        stage: "adult",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: FACINGS_LIST,
        animations: { stand: [1], walk: [0, 1, 2, 1] },
        frameMs: 150
    }, null, 2));

    // 3. $UF_Human_8D (Default 8D human, pointing to male)
    writePNG(path.join(CHAR_DIR, '$UF_Human_8D.png'), 144, 384, maleWalkCharset);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Human_8D.json'), JSON.stringify({
        id: "$UF_Human_8D",
        species: "human",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: FACINGS_LIST,
        animations: { stand: [1], walk: [0, 1, 2, 1] },
        frameMs: 150
    }, null, 2));

    // 4. $UF_Human (Default 4-way human)
    const defaultHuman4Way = Buffer.alloc(144 * 192 * 4);
    // Rows: S (0), W (2), E (6), N (4)
    const rmmzRowIndices = [0, 2, 6, 4];
    for (let r = 0; r < 4; r++) {
        const srcRow = rmmzRowIndices[r];
        for (let c = 0; c < 3; c++) {
            const frame = maleWalkList[srcRow * 3 + c];
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (y * 48 + x) * 4;
                    const dIdx = ((r * 48 + y) * 144 + (c * 48 + x)) * 4;
                    defaultHuman4Way[dIdx] = frame[sIdx];
                    defaultHuman4Way[dIdx + 1] = frame[sIdx + 1];
                    defaultHuman4Way[dIdx + 2] = frame[sIdx + 2];
                    defaultHuman4Way[dIdx + 3] = frame[sIdx + 3];
                }
            }
        }
    }
    writePNG(path.join(CHAR_DIR, '$UF_Human.png'), 144, 192, defaultHuman4Way);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Human.json'), JSON.stringify({
        id: "$UF_Human",
        species: "human",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: { stand: [1], walk: [0, 1, 2, 1] },
        frameMs: 150
    }, null, 2));

    // 5. Combat Animation Charsets (Attack Sword, Attack Bow, Cast Staff)
    // 8D versions (144x384)
    const maleAttackCharset8D = assembleGrid(maleAtkList, 3, 8);
    writePNG(path.join(CHAR_DIR, '$UF_Human_Attack_8D.png'), 144, 384, maleAttackCharset8D);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Human_Attack_8D.json'), JSON.stringify({
        id: "$UF_Human_Attack_8D",
        species: "human",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: FACINGS_LIST,
        animations: { attack: [0, 1, 2] },
        frameMs: 120
    }, null, 2));

    const maleCastCharset8D = assembleGrid(maleCastList, 3, 8);
    writePNG(path.join(CHAR_DIR, '$UF_Human_Cast_8D.png'), 144, 384, maleCastCharset8D);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Human_Cast_8D.json'), JSON.stringify({
        id: "$UF_Human_Cast_8D",
        species: "human",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: FACINGS_LIST,
        animations: { cast: [0, 1, 2] },
        frameMs: 150
    }, null, 2));

    // 4-way standard RMMZ combat sheets
    function buildCombat4WaySheet(standList, action3ColsList) {
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

    const humanAttackSword4Way = buildCombat4WaySheet(maleStandList, maleAtkList);
    writePNG(path.join(CHAR_DIR, '$UF_Human_Attack_Sword.png'), 144, 192, humanAttackSword4Way);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Human_Attack_Sword.json'), JSON.stringify({
        id: "$UF_Human_Attack_Sword",
        species: "human",
        weapon: "sword_short",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: { attack: [0, 1, 2] },
        frameMs: 120
    }, null, 2));

    const humanAttackBow4Way = buildCombat4WaySheet(maleStandList, maleAtkList);
    writePNG(path.join(CHAR_DIR, '$UF_Human_Attack_Bow.png'), 144, 192, humanAttackBow4Way);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Human_Attack_Bow.json'), JSON.stringify({
        id: "$UF_Human_Attack_Bow",
        species: "human",
        weapon: "bow_short",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: { attack: [0, 1, 2] },
        frameMs: 120
    }, null, 2));

    const humanCast4Way = buildCombat4WaySheet(maleStandList, maleCastList);
    writePNG(path.join(CHAR_DIR, '$UF_Human_Cast.png'), 144, 192, humanCast4Way);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Human_Cast.json'), JSON.stringify({
        id: "$UF_Human_Cast",
        species: "human",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: { cast: [0, 1, 2] },
        frameMs: 150
    }, null, 2));

    // Female Combat sheets
    const femAttack4Way = buildCombat4WaySheet(femStandFrames, femAttackFrames);
    writePNG(path.join(CHAR_DIR, '$UF_Human_Female_Attack.png'), 144, 192, femAttack4Way);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Human_Female_Attack.json'), JSON.stringify({
        id: "$UF_Human_Female_Attack",
        species: "human",
        gender: "female",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: { attack: [0, 1, 2] },
        frameMs: 120
    }, null, 2));

    const femCast4Way = buildCombat4WaySheet(femStandFrames, femCastFrames);
    writePNG(path.join(CHAR_DIR, '$UF_Human_Female_Cast.png'), 144, 192, femCast4Way);
    fs.writeFileSync(path.join(CHAR_DIR, '$UF_Human_Female_Cast.json'), JSON.stringify({
        id: "$UF_Human_Female_Cast",
        species: "human",
        gender: "female",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: { cast: [0, 1, 2] },
        frameMs: 150
    }, null, 2));

    // -------------------------------------------------------------
    // PART E: Master Showcase Render in art/review/
    // -------------------------------------------------------------
    console.log('Rendering Human 8D Showcase Image...');
    // Compass layout displaying all 8 facings for Walk, Attack, Cast, and Sleep
    const SHOW_W = 8 * 48 * 4; // 1536
    const SHOW_H = 4 * 48 * 4 + 32; // 800
    const showBuf = Buffer.alloc(SHOW_W * SHOW_H * 4);

    // Fill meadow background #4D5D28
    for (let i = 0; i < showBuf.length; i += 4) {
        showBuf[i] = 77; showBuf[i + 1] = 93; showBuf[i + 2] = 40; showBuf[i + 3] = 255;
    }

    const rowsToShow = [
        { label: "Male Walk (Stand)", frames: maleStandList },
        { label: "Male Attack (Strike)", frames: Array.from({length: 8}, (_, r) => maleAtkList[r * 3 + 1]) },
        { label: "Female Walk (Stand)", frames: femStandFrames },
        { label: "Female Attack (Strike)", frames: Array.from({length: 8}, (_, r) => femAttackFrames[r * 3 + 1]) }
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

    writePNG(path.join(REVIEW_DIR, 'human_sprites_8d_actions_showcase_4x.png'), SHOW_W, SHOW_H, showBuf);
    console.log('Saved review showcase: art/review/human_sprites_8d_actions_showcase_4x.png');
    console.log('=== Human 8D Suite Assembly Complete! ===');
}

main();
