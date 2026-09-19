#!/usr/bin/env node
'use strict';

/**
 * tools/test_ff5_proportions_and_footsteps.js
 *
 * Prototype script testing authentic Final Fantasy V (FF5) proportions
 * and dynamic, punchy footstep walk cycles for Human, Dwarf, and Elf.
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');
const BRAIN = 'C:/Users/snewt/.gemini/antigravity/brain/8584d1db-b919-4549-a06e-7f379ac517a3';

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
                if (lum < 175) {
                    buf[idx] = C_DARK_OUTLINE[0];
                    buf[idx + 1] = C_DARK_OUTLINE[1];
                    buf[idx + 2] = C_DARK_OUTLINE[2];
                }
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

// ----------------------------------------------------------------------------
// FF5 Proportional Sprite Extractor
// ----------------------------------------------------------------------------
// Samples head, torso, and legs with custom height allocations to achieve
// the ~1:2.8 FF5 chibi proportion from high-res source images.
function extractFF5Proportions(img, opts) {
    const {
        totalH = 40,
        headH = 15,
        torsoH = 12,
        legsH = 13,
        targetW = 24,
        bottomRow = 47,
        crop = null
    } = opts;

    // 1. Find bounding box of content
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

    // Source proportion splits (standard humanoid source is roughly: head top 28%, torso 32%, legs 40%)
    const srcHeadEnd = minY + bboxH * 0.32;
    const srcTorsoEnd = minY + bboxH * 0.60;

    const startY = bottomRow - totalH + 1;
    const startX = Math.round(24 - targetW / 2);

    for (let outDy = 0; outDy < totalH; outDy++) {
        let srcY;
        if (outDy < headH) {
            // Head region
            const t = outDy / Math.max(1, headH - 1);
            srcY = minY + t * (srcHeadEnd - minY);
        } else if (outDy < headH + torsoH) {
            // Torso region
            const t = (outDy - headH) / Math.max(1, torsoH - 1);
            srcY = srcHeadEnd + t * (srcTorsoEnd - srcHeadEnd);
        } else {
            // Legs region
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
// Dynamic Articulated Footstep Walk Cycle Generator
// ----------------------------------------------------------------------------
// Takes a stand frame and articulates true, punchy FF5 footsteps.
function generateFootstepFrames(standFrame, facing, opts = {}) {
    const { legCutY = 35, strideDist = 3 } = opts;
    const isProfile = (facing === 'W' || facing === 'E');
    const isBack = (facing === 'N');
    const isFront = (facing === 'S');

    if (isFront) {
        // South Walk Cycle (Step L, Stand, Step R)
        return [
            makeSouthFootstep(standFrame, -1, strideDist),
            Buffer.from(standFrame),
            makeSouthFootstep(standFrame, 1, strideDist)
        ];
    } else if (isProfile) {
        // West Walk Cycle (Stride Forward, Stand, Stride Back)
        const wWalk = [
            makeWestFootstep(standFrame, 1, strideDist),
            Buffer.from(standFrame),
            makeWestFootstep(standFrame, -1, strideDist)
        ];
        if (facing === 'E') {
            return wWalk.map(f => mirrorFrame(f));
        }
        return wWalk;
    } else if (isBack) {
        // North Walk Cycle
        return [
            makeNorthFootstep(standFrame, -1, strideDist),
            Buffer.from(standFrame),
            makeNorthFootstep(standFrame, 1, strideDist)
        ];
    } else {
        // Diagonal: blended
        return [Buffer.from(standFrame), Buffer.from(standFrame), Buffer.from(standFrame)];
    }
}

// South Footstep:
// stepSide: -1 = left foot steps forward/down, right foot lifts; +1 = vice versa
function makeSouthFootstep(base, stepSide, strideDist = 2) {
    const out = Buffer.alloc(48 * 48 * 4);
    const bob = 1; // 1px torso dip on footstep
    const leadXCut = 24;

    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            if (base[sIdx + 3] === 0) continue;

            let targetX = x;
            let targetY = y + bob;

            if (y >= 35) {
                // Lower body & legs
                const isLeftLeg = (x < leadXCut);
                const isLead = (stepSide < 0) ? isLeftLeg : !isLeftLeg;

                if (isLead) {
                    // Leading foot steps forward and slightly outward, plants firmly on row 47
                    targetX = x + (stepSide < 0 ? -1 : 1);
                    targetY = y; // Grounded flat on row 47!
                } else {
                    // Trailing foot lifts off ground!
                    // Bottom 2 pixels (rows 46, 47) are raised up
                    if (y >= 46) {
                        targetY = y - 2; // Raised up, leaves row 47 transparent!
                    } else {
                        targetY = y - 1;
                    }
                    targetX = x + (stepSide < 0 ? 1 : -1);
                }
            } else if (y >= 24 && y < 35) {
                // Arm swing in opposition
                const isLeftArm = (x <= 16);
                const isRightArm = (x >= 31);
                if (stepSide < 0) {
                    // Left leg forward -> Left arm swings back (up 1px), Right arm swings forward (down 1px)
                    if (isLeftArm) targetY = y - 1;
                    if (isRightArm) targetY = y + 1;
                } else {
                    if (isLeftArm) targetY = y + 1;
                    if (isRightArm) targetY = y - 1;
                }
            }

            if (targetX >= 0 && targetX < 48 && targetY >= 0 && targetY < 48) {
                const dIdx = (targetY * 48 + targetX) * 4;
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

// West Footstep:
// strideDir: 1 = forward stride (front leg forward, rear leg back)
//           -1 = push-off stride (rear leg forward, front leg back)
function makeWestFootstep(base, strideDir, strideDist = 4) {
    const out = Buffer.alloc(48 * 48 * 4);
    const bob = 1; // 1px torso dip

    // Find leg center of mass in base frame on rows 38..47
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

            if (y >= 36) {
                // Leg articulation
                const prog = (y - 36) / 11; // 0 at waist, 1 at boot sole
                const shift = Math.round(prog * strideDist);

                if (strideDir > 0) {
                    // Front leg (x <= legMidX) steps forward (left)
                    // Rear leg (x > legMidX) steps backward (right) and lifts
                    if (x <= legMidX) {
                        targetX = x - shift;
                        targetY = y; // Grounded on row 47!
                    } else {
                        targetX = x + shift;
                        targetY = (y >= 46) ? (y - 2) : (y - 1); // Lift rear heel off ground!
                    }
                } else {
                    // Opposite stride
                    if (x <= legMidX) {
                        targetX = x + shift;
                        targetY = (y >= 46) ? (y - 2) : (y - 1);
                    } else {
                        targetX = x - shift;
                        targetY = y;
                    }
                }
            } else if (y >= 24 && y < 36) {
                // Torso & arm swing
                targetX = x + (strideDir > 0 ? -1 : 1);
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

// North Footstep:
function makeNorthFootstep(base, stepSide, strideDist = 2) {
    return makeSouthFootstep(base, stepSide, strideDist);
}

// Blit 48x48 into larger sheet
function blit48(src, dst, dstX, dstY, dstW) {
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sidx = (y * 48 + x) * 4;
            const didx = ((dstY + y) * dstW + (dstX + x)) * 4;
            if (src[sidx + 3] > 0) {
                dst[didx] = src[sidx];
                dst[didx + 1] = src[sidx + 1];
                dst[didx + 2] = src[sidx + 2];
                dst[didx + 3] = src[sidx + 3];
            }
        }
    }
}

function main() {
    console.log('=== Generating FF5 Proportions & Footsteps Lineup Showcase ===');

    // 1. Human Pair from scratch/peasant_48_test.png
    console.log('Extracting Human Male & Female...');
    const peasantImg = decodePNG(fs.readFileSync(path.join(ROOT, 'scratch', 'peasant_48_test.png')));
    function getPeasant(r, c) {
        const frame = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            const ty = y + 2;
            if (ty >= 48) continue;
            for (let x = 0; x < 48; x++) {
                const sIdx = (((r * 48 + y) * 144) + (c * 48 + x)) * 4;
                if (peasantImg.data[sIdx + 3] > 0) {
                    const dIdx = (ty * 48 + x) * 4;
                    frame[dIdx] = peasantImg.data[sIdx];
                    frame[dIdx + 1] = peasantImg.data[sIdx + 1];
                    frame[dIdx + 2] = peasantImg.data[sIdx + 2];
                    frame[dIdx + 3] = 255;
                }
            }
        }
        applyDarkOutline(frame, 48, 48);
        return frame;
    }

    const hMale_S = [getPeasant(0, 0), getPeasant(0, 1), getPeasant(0, 2)];
    const hMale_W = [getPeasant(1, 0), getPeasant(1, 1), getPeasant(1, 2)];

    // Transmute female
    const hFem_S = [
        decodePNG(fs.readFileSync(path.join(ROOT, 'game', 'img', 'characters', '$UF_Human_Female.png'))),
    ];
    function getFemFrame(img, r, c) {
        const frame = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = (((r * 48 + y) * 144) + (c * 48 + x)) * 4;
                if (img.data[sIdx + 3] > 0) {
                    const dIdx = (y * 48 + x) * 4;
                    frame[dIdx] = img.data[sIdx];
                    frame[dIdx + 1] = img.data[sIdx + 1];
                    frame[dIdx + 2] = img.data[sIdx + 2];
                    frame[dIdx + 3] = 255;
                }
            }
        }
        return frame;
    }
    const femImg = decodePNG(fs.readFileSync(path.join(ROOT, 'game', 'img', 'characters', '$UF_Human_Female.png')));
    const hFem_S_frames = [getFemFrame(femImg, 0, 0), getFemFrame(femImg, 0, 1), getFemFrame(femImg, 0, 2)];
    const hFem_W_frames = [getFemFrame(femImg, 1, 0), getFemFrame(femImg, 1, 1), getFemFrame(femImg, 1, 2)];

    // 2. Dwarf Pair
    console.log('Extracting Dwarf Male & Female and applying articulated footsteps...');
    const dwarfMaleStandS = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'dwarf_male_stand.png')));
    function getColFrame(img, r) {
        const frame = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = (((r * 48 + y) * 48) + x) * 4;
                if (img.data[sIdx + 3] > 0) {
                    const dIdx = (y * 48 + x) * 4;
                    frame[dIdx] = img.data[sIdx];
                    frame[dIdx + 1] = img.data[sIdx + 1];
                    frame[dIdx + 2] = img.data[sIdx + 2];
                    frame[dIdx + 3] = 255;
                }
            }
        }
        return frame;
    }

    const dMale_S_stand = getColFrame(dwarfMaleStandS, 0); // South stand
    const dMale_W_stand = getColFrame(dwarfMaleStandS, 2); // West stand

    const dMale_S_walk = generateFootstepFrames(dMale_S_stand, 'S', { strideDist: 3 });
    const dMale_W_walk = generateFootstepFrames(dMale_W_stand, 'W', { strideDist: 4 });

    const dwarfFemStandS = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'dwarf_female_stand.png')));
    const dFem_S_stand = getColFrame(dwarfFemStandS, 0);
    const dFem_W_stand = getColFrame(dwarfFemStandS, 2);

    const dFem_S_walk = generateFootstepFrames(dFem_S_stand, 'S', { strideDist: 3 });
    const dFem_W_walk = generateFootstepFrames(dFem_W_stand, 'W', { strideDist: 4 });

    // 3. Elf Pair (Extracted with FF5 proportions)
    console.log('Extracting Elf Male & Female with authentic FF5 proportions...');
    const elfMaleJpgFront = loadJpg(path.join(BRAIN, 'elf_male_clean_front_1789848652355.jpg'));
    const elfMaleJpgSide  = loadJpg(path.join(BRAIN, 'elf_male_side_1789848623158.jpg'));
    const elfFemJpgFront  = loadJpg(path.join(BRAIN, 'elf_female_front_1789848665721.jpg'));

    const eMale_S_stand = extractFF5Proportions(elfMaleJpgFront, { totalH: 42, headH: 15, torsoH: 13, legsH: 14, targetW: 24 });
    const eMale_W_stand = extractFF5Proportions(elfMaleJpgSide,  { totalH: 42, headH: 15, torsoH: 13, legsH: 14, targetW: 20 });

    const eMale_S_walk = generateFootstepFrames(eMale_S_stand, 'S', { strideDist: 3 });
    const eMale_W_walk = generateFootstepFrames(eMale_W_stand, 'W', { strideDist: 4 });

    const eFem_S_stand = extractFF5Proportions(elfFemJpgFront, { totalH: 40, headH: 15, torsoH: 12, legsH: 13, targetW: 22, crop: { x1: 20, y1: 20, x2: 380, y2: 920 } });
    const eFem_W_stand = extractFF5Proportions(elfFemJpgFront, { totalH: 40, headH: 15, torsoH: 12, legsH: 13, targetW: 20, crop: { x1: 750, y1: 20, x2: 930, y2: 520 } });

    const eFem_S_walk = generateFootstepFrames(eFem_S_stand, 'S', { strideDist: 3 });
    const eFem_W_walk = generateFootstepFrames(eFem_W_stand, 'W', { strideDist: 4 });

    // Build Lineup Showcase Canvas:
    // 6 rows x 6 columns:
    // Cols 0, 1, 2: South Walk (Step L, Stand, Step R)
    // Cols 3, 4, 5: West Walk (Stride Fwd, Stand, Stride Back)
    // Row 0: Human Male
    // Row 1: Human Female
    // Row 2: Dwarf Male
    // Row 3: Dwarf Female
    // Row 4: Elf Male
    // Row 5: Elf Female
    const cols = 6;
    const rows = 6;
    const canvasW = cols * 48; // 288
    const canvasH = rows * 48; // 288
    const canvas = Buffer.alloc(canvasW * canvasH * 4);

    const lineup = [
        { name: 'Human Male',   s: hMale_S,      w: hMale_W },
        { name: 'Human Female', s: hFem_S_frames, w: hFem_W_frames },
        { name: 'Dwarf Male',   s: dMale_S_walk,  w: dMale_W_walk },
        { name: 'Dwarf Female', s: dFem_S_walk,  w: dFem_W_walk },
        { name: 'Elf Male',     s: eMale_S_walk,  w: eMale_W_walk },
        { name: 'Elf Female',   s: eFem_S_walk,  w: eFem_W_walk }
    ];

    for (let r = 0; r < rows; r++) {
        const item = lineup[r];
        // South Walk (Cols 0, 1, 2)
        blit48(item.s[0], canvas, 0 * 48, r * 48, canvasW);
        blit48(item.s[1], canvas, 1 * 48, r * 48, canvasW);
        blit48(item.s[2], canvas, 2 * 48, r * 48, canvasW);

        // West Walk (Cols 3, 4, 5)
        blit48(item.w[0], canvas, 3 * 48, r * 48, canvasW);
        blit48(item.w[1], canvas, 4 * 48, r * 48, canvasW);
        blit48(item.w[2], canvas, 5 * 48, r * 48, canvasW);
    }

    // Upscale to 4x for crystal clear review (1152x1152)
    const scale = 4;
    const upW = canvasW * scale;
    const upH = canvasH * scale;
    const upBuf = Buffer.alloc(upW * upH * 4);

    // Dark slate background for clean contrast
    for (let i = 0; i < upBuf.length; i += 4) {
        upBuf[i] = 40; upBuf[i + 1] = 44; upBuf[i + 2] = 52; upBuf[i + 3] = 255;
    }

    for (let y = 0; y < canvasH; y++) {
        for (let x = 0; x < canvasW; x++) {
            const sIdx = (y * canvasW + x) * 4;
            if (canvas[sIdx + 3] > 0) {
                for (let dy = 0; dy < scale; dy++) {
                    for (let dx = 0; dx < scale; dx++) {
                        const dIdx = (((y * scale + dy) * upW) + (x * scale + dx)) * 4;
                        upBuf[dIdx] = canvas[sIdx];
                        upBuf[dIdx + 1] = canvas[sIdx + 1];
                        upBuf[dIdx + 2] = canvas[sIdx + 2];
                        upBuf[dIdx + 3] = 255;
                    }
                }
            }
        }
    }

    const outPath = path.join(ROOT, 'art', 'review', 'ff5_lineup_footsteps_comparison_4x.png');
    writePNG(outPath, upW, upH, upBuf);
    console.log('SUCCESS: Written FF5 lineup comparison to:', outPath);
}

main();
