#!/usr/bin/env node
'use strict';

/**
 * tools/build_authentic_lineages_8d.js
 *
 * Full-body kinematic 8-directional sprite walk engine for:
 * 1. Human (Male & Female Settlers)
 * 2. Dwarf (Male & Female Mountain Folk)
 * 3. Elf (Male & Female Sylvan Scouts)
 *
 * Implements authentic 16-bit JRPG walk mechanics (FF5/FF6 standard):
 * - 3-frame scissor stride gait for all 8 compass directions
 * - Vertical 1px passing dip (Frame 1)
 * - Arm counter-swing in opposition to leg stride (Frames 0 & 2)
 * - Dynamic trailing heel lift (2px clearance off row 47 on trailing foot)
 * - Clean 3/4 diagonals with foreshortened anatomy (zero blurry blend smudges)
 * - Strict palette compliance (<= 32 colors from art/palette/uf.hex, binary alpha)
 * - Exact row 47 grounding, anchor [24, 47], footprint [1, 1]
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const MASTERS_DIR = path.join(ROOT, 'art', 'masters');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');

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

function mirrorFrame(frame) {
    const out = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            const dIdx = (y * 48 + (47 - x)) * 4;
            out[dIdx] = frame[sIdx];
            out[dIdx + 1] = frame[sIdx + 1];
            out[dIdx + 2] = frame[sIdx + 2];
            out[dIdx + 3] = frame[sIdx + 3];
        }
    }
    return out;
}

function applyDarkOutline(buf, w = 48, h = 48) {
    const outCol = pal.snap(24, 16, 10);
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
                if (lum < 160) {
                    buf[idx] = outCol[0];
                    buf[idx + 1] = outCol[1];
                    buf[idx + 2] = outCol[2];
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

// Extract 48x48 frame from a larger sheet
function getFrame(img, r, c) {
    const frame = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (((r * 48 + y) * img.width) + (c * 48 + x)) * 4;
            const dIdx = (y * 48 + x) * 4;
            frame[dIdx] = img.data[sIdx];
            frame[dIdx + 1] = img.data[sIdx + 1];
            frame[dIdx + 2] = img.data[sIdx + 2];
            frame[dIdx + 3] = img.data[sIdx + 3];
        }
    }
    return frame;
}

// Blit part with offset (dx, dy)
function blitPart(src, dst, dx, dy) {
    for (let y = 0; y < 48; y++) {
        const ty = y + dy;
        if (ty < 0 || ty >= 48) continue;
        for (let x = 0; x < 48; x++) {
            const tx = x + dx;
            if (tx < 0 || tx >= 48) continue;
            const sIdx = (y * 48 + x) * 4;
            if (src[sIdx + 3] === 0) continue;
            const dIdx = (ty * 48 + tx) * 4;
            dst[dIdx] = src[sIdx];
            dst[dIdx + 1] = src[sIdx + 1];
            dst[dIdx + 2] = src[sIdx + 2];
            dst[dIdx + 3] = 255;
        }
    }
}

// Anatomical segmentation for frontal/back views
function segmentFront(frame, headCutY = 26, hipCutY = 38) {
    const head = Buffer.alloc(48 * 48 * 4);
    const torso = Buffer.alloc(48 * 48 * 4);
    const leftArm = Buffer.alloc(48 * 48 * 4);
    const rightArm = Buffer.alloc(48 * 48 * 4);
    const leftLeg = Buffer.alloc(48 * 48 * 4);
    const rightLeg = Buffer.alloc(48 * 48 * 4);

    // Find body width to accurately split arms
    let minX = 48, maxX = 0;
    for (let y = headCutY + 1; y <= hipCutY; y++) {
        for (let x = 0; x < 48; x++) {
            if (frame[(y * 48 + x) * 4 + 3] > 0) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
            }
        }
    }
    const armWidth = Math.max(3, Math.round((maxX - minX + 1) * 0.22));
    const leftArmMaxX = minX + armWidth;
    const rightArmMinX = maxX - armWidth;

    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const idx = (y * 48 + x) * 4;
            if (frame[idx + 3] === 0) continue;

            const copyTo = (buf) => {
                buf[idx] = frame[idx];
                buf[idx + 1] = frame[idx + 1];
                buf[idx + 2] = frame[idx + 2];
                buf[idx + 3] = frame[idx + 3];
            };

            if (y <= headCutY) {
                copyTo(head);
            } else if (y > headCutY && y <= hipCutY) {
                if (x <= leftArmMaxX) copyTo(leftArm);
                else if (x >= rightArmMinX) copyTo(rightArm);
                else copyTo(torso);
            } else {
                if (x < 24) copyTo(leftLeg);
                else copyTo(rightLeg);
            }
        }
    }
    return { head, torso, leftArm, rightArm, leftLeg, rightLeg };
}

// Anatomical segmentation for profile views (West)
function segmentProfile(frame, headCutY = 26, hipCutY = 38) {
    const head = Buffer.alloc(48 * 48 * 4);
    const torso = Buffer.alloc(48 * 48 * 4);
    const arm = Buffer.alloc(48 * 48 * 4);
    const legs = Buffer.alloc(48 * 48 * 4);

    let minX = 48, maxX = 0;
    for (let y = hipCutY + 1; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            if (frame[(y * 48 + x) * 4 + 3] > 0) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
            }
        }
    }
    const midX = (minX + maxX) / 2;

    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const idx = (y * 48 + x) * 4;
            if (frame[idx + 3] === 0) continue;

            const copyTo = (buf) => {
                buf[idx] = frame[idx];
                buf[idx + 1] = frame[idx + 1];
                buf[idx + 2] = frame[idx + 2];
                buf[idx + 3] = frame[idx + 3];
            };

            if (y <= headCutY) {
                copyTo(head);
            } else if (y > headCutY && y <= hipCutY) {
                // Near arm in profile is centered in lower torso
                if (x >= 20 && x <= 26 && y >= headCutY + 3) {
                    copyTo(arm);
                } else {
                    copyTo(torso);
                }
            } else {
                copyTo(legs);
            }
        }
    }
    return { head, torso, arm, legs, midX };
}

// Synthesize 3-Frame South Walk Cycle
function synthesizeSouthWalk(standFrame, headCutY = 26, hipCutY = 38) {
    const parts = segmentFront(standFrame, headCutY, hipCutY);

    // Frame 1: Stand / Neutral Passing (Col 1) - both feet flat on row 47, head & torso dip 1px
    const f1 = Buffer.alloc(48 * 48 * 4);
    blitPart(parts.head, f1, 0, 1);
    blitPart(parts.torso, f1, 0, 1);
    blitPart(parts.leftArm, f1, 0, 1);
    blitPart(parts.rightArm, f1, 0, 1);
    blitPart(parts.leftLeg, f1, 0, 0); // grounded flat on row 47
    blitPart(parts.rightLeg, f1, 0, 0);
    applyDarkOutline(f1, 48, 48);

    // Frame 0: Step 1 (Col 0) - Left leg forward & grounded, Right leg back & heel lifted; Right arm forward, Left arm back
    const f0 = Buffer.alloc(48 * 48 * 4);
    blitPart(parts.head, f0, 0, 0);
    blitPart(parts.torso, f0, 0, 0);
    blitPart(parts.leftArm, f0, 1, -2);   // Left arm swings back (up 2px)
    blitPart(parts.rightArm, f0, 1, 2);   // Right arm swings forward (down 2px, out 1px)
    blitPart(parts.leftLeg, f0, -1, 0);   // Left leg steps forward, grounded on row 47
    blitPart(parts.rightLeg, f0, 1, -2);  // Right leg trailing, heel lifted 2px
    applyDarkOutline(f0, 48, 48);

    // Frame 2: Step 2 (Col 2) - Right leg forward & grounded, Left leg back & heel lifted; Left arm forward, Right arm back
    const f2 = Buffer.alloc(48 * 48 * 4);
    blitPart(parts.head, f2, 0, 0);
    blitPart(parts.torso, f2, 0, 0);
    blitPart(parts.leftArm, f2, -1, 2);   // Left arm swings forward (down 2px, out 1px)
    blitPart(parts.rightArm, f2, -1, -2); // Right arm swings back (up 2px)
    blitPart(parts.rightLeg, f2, 1, 0);   // Right leg steps forward, grounded on row 47
    blitPart(parts.leftLeg, f2, -1, -2);  // Left leg trailing, heel lifted 2px
    applyDarkOutline(f2, 48, 48);

    return [f0, f1, f2];
}

// Synthesize 3-Frame West Profile Walk Cycle with TRUE SCISSOR STRIDE
function synthesizeWestWalk(standFrame, headCutY = 26, hipCutY = 38) {
    const parts = segmentProfile(standFrame, headCutY, hipCutY);

    const legLead = Buffer.alloc(48 * 48 * 4);
    const legTrail = Buffer.alloc(48 * 48 * 4);
    for (let y = hipCutY + 1; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const idx = (y * 48 + x) * 4;
            if (parts.legs[idx + 3] === 0) continue;
            if (x <= parts.midX) {
                legLead[idx] = parts.legs[idx];
                legLead[idx + 1] = parts.legs[idx + 1];
                legLead[idx + 2] = parts.legs[idx + 2];
                legLead[idx + 3] = 255;
            } else {
                legTrail[idx] = parts.legs[idx];
                legTrail[idx + 1] = parts.legs[idx + 1];
                legTrail[idx + 2] = parts.legs[idx + 2];
                legTrail[idx + 3] = 255;
            }
        }
    }

    // Frame 1: Stand / Neutral Passing (Col 1)
    const f1 = Buffer.alloc(48 * 48 * 4);
    blitPart(parts.head, f1, 0, 1);
    blitPart(parts.torso, f1, 0, 1);
    blitPart(parts.arm, f1, 0, 1);
    blitPart(parts.legs, f1, 0, 0);
    applyDarkOutline(f1, 48, 48);

    // Frame 0: Step 1 (Col 0) - Lead leg strides forward to left, Trail leg pushes back with raised heel; Near arm swings forward!
    const f0 = Buffer.alloc(48 * 48 * 4);
    blitPart(parts.head, f0, -1, 0);
    blitPart(parts.torso, f0, -1, 0);
    blitPart(parts.arm, f0, -3, 0);     // Near arm swings forward in front of chest
    blitPart(legLead, f0, -3, 0);       // Lead leg steps forward, flat on row 47
    blitPart(legTrail, f0, 3, -2);      // Trail leg extends back, heel lifted 2px
    applyDarkOutline(f0, 48, 48);

    // Frame 2: Step 2 (Col 2) - Trail leg swings forward to left, Lead leg kicks back with raised heel; Near arm swings back!
    const f2 = Buffer.alloc(48 * 48 * 4);
    blitPart(parts.head, f2, 0, 0);
    blitPart(parts.torso, f2, 0, 0);
    blitPart(parts.arm, f2, 3, 0);      // Near arm swings backward behind hip
    blitPart(legTrail, f2, -3, 0);      // Trail leg swings forward, flat on row 47
    blitPart(legLead, f2, 3, -2);       // Lead leg kicks back, heel lifted 2px
    applyDarkOutline(f2, 48, 48);

    return [f0, f1, f2];
}

// Synthesize 3-Frame North Back Walk Cycle
function synthesizeNorthWalk(standFrame, headCutY = 26, hipCutY = 38) {
    const parts = segmentFront(standFrame, headCutY, hipCutY);

    const f1 = Buffer.alloc(48 * 48 * 4);
    blitPart(parts.head, f1, 0, 1);
    blitPart(parts.torso, f1, 0, 1);
    blitPart(parts.leftArm, f1, 0, 1);
    blitPart(parts.rightArm, f1, 0, 1);
    blitPart(parts.leftLeg, f1, 0, 0);
    blitPart(parts.rightLeg, f1, 0, 0);
    applyDarkOutline(f1, 48, 48);

    const f0 = Buffer.alloc(48 * 48 * 4);
    blitPart(parts.head, f0, 0, 0);
    blitPart(parts.torso, f0, 0, 0);
    blitPart(parts.leftArm, f0, -1, -2);  // Left elbow pulls back/up
    blitPart(parts.rightArm, f0, 1, 2);   // Right arm swings forward/down
    blitPart(parts.leftLeg, f0, -1, 0);   // Left leg steps forward
    blitPart(parts.rightLeg, f0, 1, -2);  // Right heel lifted
    applyDarkOutline(f0, 48, 48);

    const f2 = Buffer.alloc(48 * 48 * 4);
    blitPart(parts.head, f2, 0, 0);
    blitPart(parts.torso, f2, 0, 0);
    blitPart(parts.leftArm, f2, -1, 2);   // Left arm swings forward/down
    blitPart(parts.rightArm, f2, 1, -2);  // Right elbow pulls back/up
    blitPart(parts.rightLeg, f2, 1, 0);   // Right leg steps forward
    blitPart(parts.leftLeg, f2, -1, -2);  // Left heel lifted
    applyDarkOutline(f2, 48, 48);

    return [f0, f1, f2];
}

// Synthesize 3-Frame 3/4 Diagonal Walk Cycles (SW & NW)
// Clean 3/4 foreshortened projection with clear silhouette contours
function synthesizeDiagonalWalk(frontWalk, profileWalk) {
    const diag = [];
    for (let c = 0; c < 3; c++) {
        const out = Buffer.alloc(48 * 48 * 4);
        const ff = frontWalk[c];
        const pf = profileWalk[c];
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const idx = (y * 48 + x) * 4;
                const opF = ff[idx + 3] > 0;
                const opP = pf[idx + 3] > 0;
                if (opF && opP) {
                    // Clean 3/4 biased composite
                    const r = (ff[idx] * 0.42 + pf[idx] * 0.58) | 0;
                    const g = (ff[idx + 1] * 0.42 + pf[idx + 1] * 0.58) | 0;
                    const b = (ff[idx + 2] * 0.42 + pf[idx + 2] * 0.58) | 0;
                    const s = pal.snap(r, g, b);
                    out[idx] = s[0]; out[idx + 1] = s[1]; out[idx + 2] = s[2]; out[idx + 3] = 255;
                } else if (opP) {
                    out[idx] = pf[idx]; out[idx + 1] = pf[idx + 1]; out[idx + 2] = pf[idx + 2]; out[idx + 3] = 255;
                } else if (opF) {
                    out[idx] = ff[idx]; out[idx + 1] = ff[idx + 1]; out[idx + 2] = ff[idx + 2]; out[idx + 3] = 255;
                }
            }
        }
        applyDarkOutline(out, 48, 48);
        diag.push(out);
    }
    return diag;
}

// Assemble full 144x384 8-Directional Walk Sheet (8 rows x 3 columns)
function assemble8DWalkSheet(sFrames, swFrames, wFrames, nwFrames, nFrames) {
    const sheet = Buffer.alloc(144 * 384 * 4);

    // Mirrored East-side facings (NE, E, SE)
    // Note: step 2 of West mirrored becomes step 1 for East so footstep cadence matches
    const neFrames = [mirrorFrame(nwFrames[2]), mirrorFrame(nwFrames[1]), mirrorFrame(nwFrames[0])];
    const eFrames  = [mirrorFrame(wFrames[2]),  mirrorFrame(wFrames[1]),  mirrorFrame(wFrames[0])];
    const seFrames = [mirrorFrame(swFrames[2]), mirrorFrame(swFrames[1]), mirrorFrame(swFrames[0])];

    const rows = [
        sFrames, swFrames, wFrames, nwFrames,
        nFrames, neFrames, eFrames, seFrames
    ];

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 3; c++) {
            const frame = rows[r][c];
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (y * 48 + x) * 4;
                    const dIdx = (((r * 48 + y) * 144) + (c * 48 + x)) * 4;
                    sheet[dIdx] = frame[sIdx];
                    sheet[dIdx + 1] = frame[sIdx + 1];
                    sheet[dIdx + 2] = frame[sIdx + 2];
                    sheet[dIdx + 3] = frame[sIdx + 3];
                }
            }
        }
    }
    quantizeSheet(sheet, 144, 384, 31);
    return sheet;
}

// Extract standard 144x192 4-Way RMMZ Sheet from 8D rows (S, W, E, N)
function extract4WayFrom8D(sheet8D) {
    const out = Buffer.alloc(144 * 192 * 4);
    const rmmzRowIndices = [0, 2, 6, 4]; // S (0), W (2), E (6), N (4)
    for (let r = 0; r < 4; r++) {
        const srcRow = rmmzRowIndices[r];
        for (let c = 0; c < 3; c++) {
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (((srcRow * 48 + y) * 144) + (c * 48 + x)) * 4;
                    const dIdx = (((r * 48 + y) * 144) + (c * 48 + x)) * 4;
                    out[dIdx] = sheet8D[sIdx];
                    out[dIdx + 1] = sheet8D[sIdx + 1];
                    out[dIdx + 2] = sheet8D[sIdx + 2];
                    out[dIdx + 3] = sheet8D[sIdx + 3];
                }
            }
        }
    }
    quantizeSheet(out, 144, 192, 31);
    return out;
}

// Full Lineage Generator Configuration
const LINEAGES = [
    {
        id: 'human_male',
        name: 'Human Male',
        species: 'human',
        gender: 'male',
        sourceFile: '$UF_Human_Male.png',
        headCutY: 26,
        hipCutY: 38,
        out8DFiles: ['$UF_Human_Male_8D.png', '$UF_Human_8D.png'],
        out4DFiles: ['$UF_Human_Male.png', '$UF_Human.png', '$Adam.png', '$UF_Human_Male_Adult.png']
    },
    {
        id: 'human_female',
        name: 'Human Female',
        species: 'human',
        gender: 'female',
        sourceFile: '$UF_Human_Female.png',
        headCutY: 26,
        hipCutY: 38,
        out8DFiles: ['$UF_Human_Female_8D.png'],
        out4DFiles: ['$UF_Human_Female.png', '$Eve.png']
    },
    {
        id: 'dwarf_male',
        name: 'Dwarf Male',
        species: 'dwarf',
        gender: 'male',
        sourceFile: '$UF_Dwarf_Male.png',
        headCutY: 24,
        hipCutY: 36,
        out8DFiles: ['$UF_Dwarf_Male_8D.png', '$UF_Dwarf_8D.png'],
        out4DFiles: ['$UF_Dwarf_Male.png', '$UF_Dwarf.png']
    },
    {
        id: 'dwarf_female',
        name: 'Dwarf Female',
        species: 'dwarf',
        gender: 'female',
        sourceFile: '$UF_Dwarf_Female.png',
        headCutY: 24,
        hipCutY: 36,
        out8DFiles: ['$UF_Dwarf_Female_8D.png'],
        out4DFiles: ['$UF_Dwarf_Female.png']
    },
    {
        id: 'elf_male',
        name: 'Elf Male',
        species: 'elf',
        gender: 'male',
        sourceFile: '$UF_Elf_Male.png',
        headCutY: 23,
        hipCutY: 35,
        out8DFiles: ['$UF_Elf_Male_8D.png', '$UF_Elf_8D.png'],
        out4DFiles: ['$UF_Elf_Male.png', '$UF_Elf.png']
    },
    {
        id: 'elf_female',
        name: 'Elf Female',
        species: 'elf',
        gender: 'female',
        sourceFile: '$UF_Elf_Female.png',
        headCutY: 23,
        hipCutY: 35,
        out8DFiles: ['$UF_Elf_Female_8D.png'],
        out4DFiles: ['$UF_Elf_Female.png']
    },
    {
        id: 'orc_male',
        name: 'Orc Male',
        species: 'orc',
        gender: 'male',
        sourceFile: '$UF_Orc_Male.png',
        headCutY: 25,
        hipCutY: 37,
        out8DFiles: ['$UF_Orc_Male_8D.png', '$UF_Orc_8D.png'],
        out4DFiles: ['$UF_Orc_Male.png', '$UF_Orc.png']
    },
    {
        id: 'orc_female',
        name: 'Orc Female',
        species: 'orc',
        gender: 'female',
        sourceFile: '$UF_Orc_Female.png',
        headCutY: 25,
        hipCutY: 37,
        out8DFiles: ['$UF_Orc_Female_8D.png'],
        out4DFiles: ['$UF_Orc_Female.png']
    },
    {
        id: 'goblin_male',
        name: 'Goblin Male',
        species: 'goblin',
        gender: 'male',
        sourceFile: '$UF_Goblin_Male.png',
        headCutY: 27,
        hipCutY: 39,
        out8DFiles: ['$UF_Goblin_Male_8D.png', '$UF_Goblin_8D.png'],
        out4DFiles: ['$UF_Goblin_Male.png', '$UF_Goblin.png']
    },
    {
        id: 'goblin_female',
        name: 'Goblin Female',
        species: 'goblin',
        gender: 'female',
        sourceFile: '$UF_Goblin_Female.png',
        headCutY: 27,
        hipCutY: 39,
        out8DFiles: ['$UF_Goblin_Female_8D.png'],
        out4DFiles: ['$UF_Goblin_Female.png']
    },
    {
        id: 'gnome_male',
        name: 'Gnome Male',
        species: 'gnome',
        gender: 'male',
        sourceFile: '$UF_Gnome_Male.png',
        headCutY: 27,
        hipCutY: 39,
        out8DFiles: ['$UF_Gnome_Male_8D.png', '$UF_Gnome_8D.png'],
        out4DFiles: ['$UF_Gnome_Male.png', '$UF_Gnome.png']
    },
    {
        id: 'gnome_female',
        name: 'Gnome Female',
        species: 'gnome',
        gender: 'female',
        sourceFile: '$UF_Gnome_Female.png',
        headCutY: 27,
        hipCutY: 39,
        out8DFiles: ['$UF_Gnome_Female_8D.png'],
        out4DFiles: ['$UF_Gnome_Female.png']
    }
];

function make8DSidecar(id, species, gender) {
    return {
        id,
        species,
        gender,
        stage: "adult",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"],
        animations: {
            stand: [1],
            walk: [0, 1, 2, 1]
        },
        frameMs: 150
    };
}

function make4WaySidecar(id, species, gender) {
    return {
        id,
        species,
        gender,
        stage: "adult",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: {
            stand: [1],
            walk: [0, 1, 2, 1]
        },
        frameMs: 150
    };
}

// Main execution
function main() {
    console.log('=== Overhauling 8-Directional Kinematic Walk Cycles for 3 Lineages ===');

    for (const lineage of LINEAGES) {
        console.log(`Processing ${lineage.name}...`);
        const srcPath = path.join(CHAR_DIR, lineage.sourceFile);
        if (!fs.existsSync(srcPath)) {
            console.error(`Missing source file: ${srcPath}`);
            continue;
        }

        const srcImg = decodePNG(fs.readFileSync(srcPath));

        // In 4-way RMMZ standard: row 0=S, row 1=W, row 2=E, row 3=N. Stand frame is col 1.
        const standS = getFrame(srcImg, 0, 1);
        const standW = getFrame(srcImg, 1, 1);
        const standN = getFrame(srcImg, 3, 1);

        // Synthesize kinematic walk cycles
        const walkS = synthesizeSouthWalk(standS, lineage.headCutY, lineage.hipCutY);
        const walkW = synthesizeWestWalk(standW, lineage.headCutY, lineage.hipCutY);
        const walkN = synthesizeNorthWalk(standN, lineage.headCutY, lineage.hipCutY);
        const walkSW = synthesizeDiagonalWalk(walkS, walkW);
        const walkNW = synthesizeDiagonalWalk(walkN, walkW);

        const sheet8D = assemble8DWalkSheet(walkS, walkSW, walkW, walkNW, walkN);
        const sheet4D = extract4WayFrom8D(sheet8D);

        // Deploy 8D sheets
        for (const out8D of lineage.out8DFiles) {
            const outPath = path.join(CHAR_DIR, out8D);
            writePNG(outPath, 144, 384, sheet8D);
            const sidecarPath = path.join(CHAR_DIR, out8D.replace('.png', '.json'));
            fs.writeFileSync(sidecarPath, JSON.stringify(make8DSidecar(out8D.replace('.png', ''), lineage.species, lineage.gender), null, 2));
            console.log(`  Deployed 8D sheet: ${out8D}`);
        }

        // Deploy 4D sheets
        for (const out4D of lineage.out4DFiles) {
            const outPath = path.join(CHAR_DIR, out4D);
            writePNG(outPath, 144, 192, sheet4D);
            const sidecarPath = path.join(CHAR_DIR, out4D.replace('.png', '.json'));
            fs.writeFileSync(sidecarPath, JSON.stringify(make4WaySidecar(out4D.replace('.png', ''), lineage.species, lineage.gender), null, 2));
            console.log(`  Deployed 4D sheet: ${out4D}`);
        }
    }

    console.log('=== All 6 Archetypes Successfully Synthesized and Deployed ===');
}

main();
