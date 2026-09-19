#!/usr/bin/env node
'use strict';

/**
 * tools/build_elf_standard_charsets.js
 *
 * Builds the official 8-Directional Elf Charset suite according to the
 * UF 8-Directional Standard Charset Architecture (CHARSET_8D_STANDARD.md).
 *
 * 18 Columns total (6 Actions x 3 Animation Frames per action):
 * - Set 1: Walk (C0: Step L, C1: Stand, C2: Step R)
 * - Set 2: Melee (C3: Windup, C4: Strike, C5: Recover)
 * - Set 3: Ranged (C6: Aim, C7: Draw, C8: Release)
 * - Set 4: Magic (C9: Ready/Focus, C10: Channel/Glow, C11: Cast/Thrust)
 * - Set 5: Work (C12: Reach/Crouch, C13: Work/Carve, C14: Gather/Stand)
 * - Set 6: Downed (C15: Hurt Flinch, C16: Kneeling Collapse, C17: Sleep/Dead Flat)
 *
 * 8 Rows (Facings):
 * - Row 0: South (Facing 2)
 * - Row 1: South-West (Facing 1)
 * - Row 2: West (Facing 4)
 * - Row 3: North-West (Facing 7)
 * - Row 4: North (Facing 8)
 * - Row 5: North-East (Facing 9) -> Mirror of Row 3 (NW)
 * - Row 6: East (Facing 6) -> Mirror of Row 2 (W)
 * - Row 7: South-East (Facing 3) -> Mirror of Row 1 (SW)
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const MASTER_DIR = path.join(ROOT, 'art', 'masters');
const BRAIN = 'C:/Users/snewt/.gemini/antigravity/brain/e6a9a54f-2cc6-432e-b7ec-5affda42dd85';
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// ----------------------------------------------------------------------------
// Palette & Color Functions
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
const C_DARK_OUTLINE = pal.snap(24, 20, 32);

function loadJpg(jpgPath) {
    const tmpPng = path.join(require('os').tmpdir(), `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${jpgPath.replace(/'/g, "''")}'); $img.Save('${tmpPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    const buf = fs.readFileSync(tmpPng);
    try { fs.unlinkSync(tmpPng); } catch (e) {}
    return decodePNG(buf, path.basename(jpgPath));
}

function isBg(r, g, b) {
    return (r > 160 && g < 80 && b > 160);
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
                    buf[idx]     = C_DARK_OUTLINE[0];
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
        buf[i]     = best[0];
        buf[i + 1] = best[1];
        buf[i + 2] = best[2];
    }
}

function detectBoxes(img, minArea = 300) {
    const visited = new Uint8Array(img.width * img.height);
    const boxes = [];
    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
            const idx = (y * img.width + x) * 4;
            if (visited[y * img.width + x]) continue;
            if (isBg(img.data[idx], img.data[idx + 1], img.data[idx + 2])) continue;

            let minX = x, maxX = x, minY = y, maxY = y;
            let count = 0;
            const q = [x, y];
            visited[y * img.width + x] = 1;
            let head = 0;
            while (head < q.length) {
                const cx = q[head++];
                const cy = q[head++];
                count++;
                if (cx < minX) minX = cx;
                if (cx > maxX) maxX = cx;
                if (cy < minY) minY = cy;
                if (cy > maxY) maxY = cy;
                const nbs = [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]];
                for (const [nx, ny] of nbs) {
                    if (nx < 0 || nx >= img.width || ny < 0 || ny >= img.height) continue;
                    const nIdx = ny * img.width + nx;
                    if (visited[nIdx]) continue;
                    const o = nIdx * 4;
                    if (!isBg(img.data[o], img.data[o + 1], img.data[o + 2])) {
                        visited[nIdx] = 1;
                        q.push(nx, ny);
                    }
                }
            }
            if (count > minArea) {
                boxes.push({ minX, maxX, minY, maxY, w: maxX - minX + 1, h: maxY - minY + 1, count });
            }
        }
    }
    boxes.sort((a, b) => a.minY - b.minY);
    const rows = [];
    boxes.forEach(b => {
        let placed = false;
        for (const r of rows) {
            if (Math.abs(r[0].minY - b.minY) < 45) {
                r.push(b);
                placed = true;
                break;
            }
        }
        if (!placed) rows.push([b]);
    });
    rows.forEach(r => r.sort((a, b) => a.minX - b.minX));
    return rows;
}

function extractFrameFromBox(img, b, targetH = 40) {
    const frame = Buffer.alloc(48 * 48 * 4);
    const targetW = Math.min(46, Math.round(targetH * (b.w / b.h)));
    const startY = 47 - targetH + 1; // row 47 bottom grounding
    const startX = Math.round((48 - targetW) / 2);

    for (let dy = 0; dy < targetH; dy++) {
        for (let dx = 0; dx < targetW; dx++) {
            const gy = startY + dy;
            const gx = startX + dx;
            if (gy < 0 || gy >= 48 || gx < 0 || gx >= 48) continue;

            const sy0 = b.minY + Math.floor(dy * (b.h / targetH));
            const sy1 = b.minY + Math.floor((dy + 1) * (b.h / targetH));
            const sx0 = b.minX + Math.floor(dx * (b.w / targetW));
            const sx1 = b.minX + Math.floor((dx + 1) * (b.w / targetW));

            let sumR = 0, sumG = 0, sumB = 0, count = 0, tot = 0;
            for (let sy = sy0; sy < sy1; sy++) {
                for (let sx = sx0; sx < sx1; sx++) {
                    tot++;
                    const o = (sy * img.width + sx) * 4;
                    const r = img.data[o], g = img.data[o + 1], bCol = img.data[o + 2];
                    if (!isBg(r, g, bCol)) {
                        sumR += r; sumG += g; sumB += bCol;
                        count++;
                    }
                }
            }

            if (count > 0 && (count / tot) >= 0.35) {
                const s = pal.snap(Math.round(sumR / count), Math.round(sumG / count), Math.round(sumB / count));
                const o = (gy * 48 + gx) * 4;
                frame[o] = s[0]; frame[o + 1] = s[1]; frame[o + 2] = s[2]; frame[o + 3] = 255;
            }
        }
    }
    applyDarkOutline(frame, 48, 48);
    return frame;
}

// Extract flat lying corpse sprite
function extractFlatFrame(img, b) {
    const frame = Buffer.alloc(48 * 48 * 4);
    const targetW = 44;
    const targetH = Math.round(targetW * (b.h / b.w));
    const startY = 47 - targetH; // grounded bottom
    const startX = Math.round((48 - targetW) / 2);

    for (let dy = 0; dy < targetH; dy++) {
        for (let dx = 0; dx < targetW; dx++) {
            const gy = startY + dy;
            const gx = startX + dx;
            if (gy < 0 || gy >= 48 || gx < 0 || gx >= 48) continue;

            const sy0 = b.minY + Math.floor(dy * (b.h / targetH));
            const sy1 = b.minY + Math.floor((dy + 1) * (b.h / targetH));
            const sx0 = b.minX + Math.floor(dx * (b.w / targetW));
            const sx1 = b.minX + Math.floor((dx + 1) * (b.w / targetW));

            let sumR = 0, sumG = 0, sumB = 0, count = 0, tot = 0;
            for (let sy = sy0; sy < sy1; sy++) {
                for (let sx = sx0; sx < sx1; sx++) {
                    tot++;
                    const o = (sy * img.width + sx) * 4;
                    const r = img.data[o], g = img.data[o + 1], bCol = img.data[o + 2];
                    if (!isBg(r, g, bCol)) {
                        sumR += r; sumG += g; sumB += bCol;
                        count++;
                    }
                }
            }

            if (count > 0 && (count / tot) >= 0.35) {
                const s = pal.snap(Math.round(sumR / count), Math.round(sumG / count), Math.round(sumB / count));
                const o = (gy * 48 + gx) * 4;
                frame[o] = s[0]; frame[o + 1] = s[1]; frame[o + 2] = s[2]; frame[o + 3] = 255;
            }
        }
    }
    applyDarkOutline(frame, 48, 48);
    return frame;
}

// ----------------------------------------------------------------------------
// Load Action Images & Extract Keyframes
// ----------------------------------------------------------------------------
console.log('Loading primary raw image sheets...');
const walkImg   = loadJpg(path.join(BRAIN, 'elf_base_walk_8d_1789860789263.jpg'));
const attackImg = loadJpg(path.join(BRAIN, 'elf_base_attack_8d_1789860804497.jpg'));
const shootImg  = loadJpg(path.join(BRAIN, 'elf_base_shoot_8d_1789860915093.jpg'));
const magicImg  = loadJpg(path.join(BRAIN, 'elf_base_magic_8d_1789860950219.jpg'));
const workImg   = loadJpg(path.join(BRAIN, 'elf_work_8d_consistent_1789860706610.jpg'));
const deathImg  = loadJpg(path.join(BRAIN, 'elf_death_8d_consistent_1789860759994.jpg'));

const walkRows   = detectBoxes(walkImg);
const attackRows = detectBoxes(attackImg);
const shootRows  = detectBoxes(shootImg);
const magicRows  = detectBoxes(magicImg);
const workRows   = detectBoxes(workImg);
const deathRows  = detectBoxes(deathImg);

// 1. Base Movement Frames (Cols 0..2)
const walkFrames = {
    S:  [extractFrameFromBox(walkImg, walkRows[0][0]), extractFrameFromBox(walkImg, walkRows[0][1]), extractFrameFromBox(walkImg, walkRows[0][2])],
    SW: [extractFrameFromBox(walkImg, walkRows[1][0]), extractFrameFromBox(walkImg, walkRows[1][1]), extractFrameFromBox(walkImg, walkRows[1][2])],
    W:  [extractFrameFromBox(walkImg, walkRows[2][0]), extractFrameFromBox(walkImg, walkRows[2][1]), extractFrameFromBox(walkImg, walkRows[2][2])],
    NW: [extractFrameFromBox(walkImg, walkRows[3][0]), extractFrameFromBox(walkImg, walkRows[4][0]), extractFrameFromBox(walkImg, walkRows[4][1])],
    N:  [extractFrameFromBox(walkImg, walkRows[3][1]), extractFrameFromBox(walkImg, walkRows[3][2]), extractFrameFromBox(walkImg, walkRows[3][3])]
};

// 2. Melee Attack Frames (Cols 3..5)
const attackFrames = {
    S:  [extractFrameFromBox(attackImg, attackRows[0][0]), extractFrameFromBox(attackImg, attackRows[0][1]), extractFrameFromBox(attackImg, attackRows[0][2])],
    SW: [extractFrameFromBox(attackImg, attackRows[1][0]), extractFrameFromBox(attackImg, attackRows[1][1]), extractFrameFromBox(attackImg, attackRows[1][2])],
    W:  [extractFrameFromBox(attackImg, attackRows[0][3]), extractFrameFromBox(attackImg, attackRows[2][1]), extractFrameFromBox(attackImg, attackRows[2][2])],
    NW: [extractFrameFromBox(attackImg, attackRows[1][3]), extractFrameFromBox(attackImg, attackRows[1][4]), extractFrameFromBox(attackImg, attackRows[1][5])],
    N:  [extractFrameFromBox(attackImg, attackRows[3][0]), extractFrameFromBox(attackImg, attackRows[3][1]), extractFrameFromBox(attackImg, attackRows[3][2])]
};

// 3. Ranged Bow Frames (Cols 6..8)
const shootFrames = {
    S:  [extractFrameFromBox(shootImg, shootRows[0][0]), extractFrameFromBox(shootImg, shootRows[0][1]), extractFrameFromBox(shootImg, shootRows[0][4])],
    SW: [extractFrameFromBox(shootImg, shootRows[1][0]), extractFrameFromBox(shootImg, shootRows[1][1]), extractFrameFromBox(shootImg, shootRows[1][4])],
    W:  [extractFrameFromBox(shootImg, shootRows[2][0]), extractFrameFromBox(shootImg, shootRows[2][1]), extractFrameFromBox(shootImg, shootRows[2][2])],
    NW: [extractFrameFromBox(shootImg, shootRows[4][3]), extractFrameFromBox(shootImg, shootRows[4][4]), extractFrameFromBox(shootImg, shootRows[4][5])],
    N:  [extractFrameFromBox(shootImg, shootRows[3][1]), extractFrameFromBox(shootImg, shootRows[3][2]), extractFrameFromBox(shootImg, shootRows[2][3])]
};

// 4. Magic Cast Frames (Cols 9..11) - authentic focus, channel mana hands, thrust palms forward
const magicFrames = {
    S:  [extractFrameFromBox(magicImg, magicRows[0][0]), extractFrameFromBox(magicImg, magicRows[1][0]), extractFrameFromBox(magicImg, magicRows[2][0])],
    SW: [extractFrameFromBox(magicImg, magicRows[0][1]), extractFrameFromBox(magicImg, magicRows[1][1]), extractFrameFromBox(magicImg, magicRows[2][1])],
    W:  [extractFrameFromBox(magicImg, magicRows[0][2]), extractFrameFromBox(magicImg, magicRows[1][2]), extractFrameFromBox(magicImg, magicRows[2][2])],
    NW: [extractFrameFromBox(magicImg, magicRows[0][5]), extractFrameFromBox(magicImg, magicRows[1][5]), extractFrameFromBox(magicImg, magicRows[2][5])],
    N:  [extractFrameFromBox(magicImg, magicRows[0][3]), extractFrameFromBox(magicImg, magicRows[1][3]), extractFrameFromBox(magicImg, magicRows[2][3])]
};

// 5. Work / Harvest Frames (Cols 12..14) - authentic kneeling reach, knife/tool carving, gather
const workFrames = {
    S:  [extractFrameFromBox(workImg, workRows[0][0], 35), extractFrameFromBox(workImg, workRows[0][1], 35), extractFrameFromBox(workImg, workRows[0][2], 35)],
    SW: [extractFrameFromBox(workImg, workRows[1][0], 36), extractFrameFromBox(workImg, workRows[1][1], 36), extractFrameFromBox(workImg, workRows[1][2], 36)],
    W:  [extractFrameFromBox(workImg, workRows[2][0], 38), extractFrameFromBox(workImg, workRows[1][4], 38), extractFrameFromBox(workImg, workRows[2][2], 38)],
    NW: [extractFrameFromBox(workImg, workRows[1][3], 38), extractFrameFromBox(workImg, workRows[3][4], 40), extractFrameFromBox(workImg, workRows[1][5], 38)],
    N:  [extractFrameFromBox(workImg, workRows[3][2], 40), extractFrameFromBox(workImg, workRows[3][5], 40), extractFrameFromBox(workImg, workRows[3][3], 40)]
};

// 6. Downed / Sleep / Dead Frames (Cols 15..17)
// C15: Hurt flinch
// C16: Kneeling collapse
// C17: Sleeping / flat dead on ground
const flatBox = { minX: 304, maxX: 483, minY: 116, maxY: 174, w: 180, h: 59 };
const flatSprite = extractFlatFrame(deathImg, flatBox);

// Helper for hurt recoil (recoil torso and tilt)
function createHurtFrame(standFrame) {
    const frame = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        const ty = Math.max(0, y - 1);
        for (let x = 0; x < 48; x++) {
            const s = (y * 48 + x) * 4;
            if (standFrame[s + 3] > 0) {
                const d = (ty * 48 + x) * 4;
                frame[d]     = standFrame[s];
                frame[d + 1] = standFrame[s + 1];
                frame[d + 2] = standFrame[s + 2];
                frame[d + 3] = 255;
            }
        }
    }
    applyDarkOutline(frame, 48, 48);
    return frame;
}

const deadFrames = {
    S:  [createHurtFrame(walkFrames.S[1]),  extractFrameFromBox(deathImg, deathRows[0][1], 34), flatSprite],
    SW: [createHurtFrame(walkFrames.SW[1]), extractFrameFromBox(deathImg, deathRows[0][3], 34), flatSprite],
    W:  [createHurtFrame(walkFrames.W[1]),  extractFrameFromBox(deathImg, deathRows[2][2], 34), mirrorFrame(flatSprite)],
    NW: [createHurtFrame(walkFrames.NW[1]), extractFrameFromBox(deathImg, deathRows[4][1], 34), mirrorFrame(flatSprite)],
    N:  [createHurtFrame(walkFrames.N[1]),  extractFrameFromBox(deathImg, deathRows[6][3], 34), flatSprite]
};

// ----------------------------------------------------------------------------
// Assemble 8-Directional Charset (3 Columns x 8 Directional Rows = 144 x 384 px)
// ----------------------------------------------------------------------------
function assemble8DCharset(framesByFacing) {
    const buf = Buffer.alloc(144 * 384 * 4);
    const rows = [
        framesByFacing.S,                 // Row 0: S (Facing 2)
        framesByFacing.SW,                // Row 1: SW (Facing 1)
        framesByFacing.W,                 // Row 2: W (Facing 4)
        framesByFacing.NW,                // Row 3: NW (Facing 7)
        framesByFacing.N,                 // Row 4: N (Facing 8)
        framesByFacing.NW.map(mirrorFrame), // Row 5: NE (Facing 9) = mirror(NW)
        framesByFacing.W.map(mirrorFrame),  // Row 6: E (Facing 6)  = mirror(W)
        framesByFacing.SW.map(mirrorFrame)  // Row 7: SE (Facing 3) = mirror(SW)
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

console.log('Assembling 6 action charsets...');
const walkBuf   = assemble8DCharset(walkFrames);
const attackBuf = assemble8DCharset(attackFrames);
const bowBuf    = assemble8DCharset(shootFrames);
const magicBuf  = assemble8DCharset(magicFrames);
const workBuf   = assemble8DCharset(workFrames);
const deadBuf   = assemble8DCharset(deadFrames);

// ----------------------------------------------------------------------------
// Assemble 18-Column Master Template (864 x 384 px)
// ----------------------------------------------------------------------------
console.log('Assembling 18-column master template (864 x 384 px)...');
const master18Buf = Buffer.alloc(864 * 384 * 4);
const sets = [
    { buf: walkBuf,   colOffset: 0 },
    { buf: attackBuf, colOffset: 3 },
    { buf: bowBuf,    colOffset: 6 },
    { buf: magicBuf,  colOffset: 9 },
    { buf: workBuf,   colOffset: 12 },
    { buf: deadBuf,   colOffset: 15 }
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
const master18Path = path.join(MASTER_DIR, 'Elf_Standard_8D_18Col.png');
writePNG(master18Path, 864, 384, master18Buf);
writePNG(path.join(BRAIN, 'elf_complete_standardized_charset_suite.png'), 864, 384, master18Buf);
console.log(`Saved master 18-col template: ${master18Path}`);

// ----------------------------------------------------------------------------
// Export Individual Sub-Charsets to game/img/characters/
// ----------------------------------------------------------------------------
function exportCharset(fileName, buf, extraProps = {}) {
    const p = path.join(CHAR_DIR, fileName);
    writePNG(p, 144, 384, buf);
    const sidecar = {
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'],
        frameMs: 150,
        species: 'elf',
        gender: 'male',
        ...extraProps
    };
    fs.writeFileSync(p.replace(/\.png$/, '.json'), JSON.stringify(sidecar, null, 2));
    console.log(`Exported ${fileName}`);
}

exportCharset('$UF_Elf_8D.png', walkBuf, { animations: { walk: [0, 1, 2] } });
exportCharset('$UF_Elf_Male_8D.png', walkBuf, { animations: { walk: [0, 1, 2] } });

exportCharset('$UF_Elf_Attack_8D.png', attackBuf, { animations: { attack: [0, 1, 2] } });
exportCharset('$UF_Elf_Attack_Sword_8D.png', attackBuf, { animations: { attack: [0, 1, 2] } });
exportCharset('$UF_Elf_Male_Attack_8D.png', attackBuf, { animations: { attack: [0, 1, 2] } });

exportCharset('$UF_Elf_Bow_8D.png', bowBuf, { animations: { bow: [0, 1, 2] } });
exportCharset('$UF_Elf_Ranged_8D.png', bowBuf, { animations: { ranged: [0, 1, 2] } });
exportCharset('$UF_Elf_Male_Bow_8D.png', bowBuf, { animations: { bow: [0, 1, 2] } });

exportCharset('$UF_Elf_Magic_8D.png', magicBuf, { animations: { cast: [0, 1, 2] } });
exportCharset('$UF_Elf_Cast_Staff_8D.png', magicBuf, { animations: { cast: [0, 1, 2] } });
exportCharset('$UF_Elf_Male_Cast_8D.png', magicBuf, { animations: { cast: [0, 1, 2] } });

exportCharset('$UF_Elf_Work_8D.png', workBuf, { animations: { work: [0, 1, 2] } });
exportCharset('$UF_Elf_Male_Work_8D.png', workBuf, { animations: { work: [0, 1, 2] } });

exportCharset('$UF_Elf_Dead_8D.png', deadBuf, { animations: { hurt: [0], collapse: [1], dead: [2] } });
exportCharset('$UF_Elf_Male_Dead_8D.png', deadBuf, { animations: { hurt: [0], collapse: [1], dead: [2] } });

// ----------------------------------------------------------------------------
// Assemble AR-600 Master Composite (20 Columns x 8 Rows = 960 x 384 px)
// ----------------------------------------------------------------------------
console.log('Assembling AR-600 master sheet (960 x 384 px)...');
const ar600Buf = Buffer.alloc(960 * 384 * 4);
const ar600Cols = [
    { srcBuf: walkBuf,   srcCol: 1 }, // 0: Stand
    { srcBuf: walkBuf,   srcCol: 0 }, // 1: Walk L
    { srcBuf: walkBuf,   srcCol: 1 }, // 2: Walk Pass
    { srcBuf: walkBuf,   srcCol: 2 }, // 3: Walk R
    { srcBuf: workBuf,   srcCol: 0 }, // 4: Work Reach
    { srcBuf: workBuf,   srcCol: 1 }, // 5: Work Craft
    { srcBuf: workBuf,   srcCol: 2 }, // 6: Work Gather
    { srcBuf: walkBuf,   srcCol: 1 }, // 7: Carry (V89)
    { srcBuf: attackBuf, srcCol: 0 }, // 8: Attack Windup
    { srcBuf: attackBuf, srcCol: 1 }, // 9: Attack Strike
    { srcBuf: attackBuf, srcCol: 2 }, // 10: Attack Recover
    { srcBuf: magicBuf,  srcCol: 0 }, // 11: Cast Focus
    { srcBuf: magicBuf,  srcCol: 1 }, // 12: Cast Glow
    { srcBuf: magicBuf,  srcCol: 2 }, // 13: Cast Thrust
    { srcBuf: deadBuf,   srcCol: 0 }, // 14: Hurt Flinch
    { srcBuf: deadBuf,   srcCol: 1 }, // 15: Collapse
    { srcBuf: deadBuf,   srcCol: 2 }, // 16: Dead / Sleep
    { srcBuf: deadBuf,   srcCol: 2 }, // 17: Dead alt
    { srcBuf: walkBuf,   srcCol: 1 }, // 18: Idle 1
    { srcBuf: walkBuf,   srcCol: 1 }  // 19: Idle 2
];

for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 20; c++) {
        const mapping = ar600Cols[c];
        for (let py = 0; py < 48; py++) {
            for (let px = 0; px < 48; px++) {
                const sIdx = ((r * 48 + py) * 144 + (mapping.srcCol * 48 + px)) * 4;
                const dIdx = ((r * 48 + py) * 960 + (c * 48 + px)) * 4;
                ar600Buf[dIdx]     = mapping.srcBuf[sIdx];
                ar600Buf[dIdx + 1] = mapping.srcBuf[sIdx + 1];
                ar600Buf[dIdx + 2] = mapping.srcBuf[sIdx + 2];
                ar600Buf[dIdx + 3] = mapping.srcBuf[sIdx + 3];
            }
        }
    }
}

quantizeSheet(ar600Buf, 960, 384, 31);
const ar600Path = path.join(CHAR_DIR, '$UF_Elf_Male_AR600.png');
writePNG(ar600Path, 960, 384, ar600Buf);
fs.writeFileSync(ar600Path.replace(/\.png$/, '.json'), JSON.stringify({
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'],
    frameMs: 150,
    species: 'elf',
    gender: 'male',
    animations: {
        stand: [0],
        walk: [1, 2, 3],
        work: [4, 5, 6],
        carry: [7],
        attack: [8, 9, 10],
        cast: [11, 12, 13],
        hurt: [14],
        death: [15, 16, 17],
        idle: [18, 19]
    }
}, null, 2));

console.log('Successfully completed building Elf Standard Charsets!');
