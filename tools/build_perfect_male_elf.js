'use strict';

/**
 * tools/build_perfect_male_elf.js
 *
 * UNIFORM SCALE BUILDER for Adult Male Elf (40px standing anatomy) across all 7 actions:
 * - 100% Google Nano Banana II source generations.
 * - Single Uniform Global Scale Factor (40.0 / 276.0 = 0.1449275).
 * - Exact same head, face, torso, limb, and boot proportions across every action.
 * - Grounding at native baseline y = 47.
 * - Zero projectiles: Bow is string pluck only; Magic is spell initiation chant only.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'raw');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// Uniform Global Scale: 276px standing height in raw Nano Banana II -> 40px native in RMMZ
const UNIFORM_SCALE = 40.0 / 276.0;

function loadPalette() {
    const raw = fs.readFileSync(PALETTE_FILE, 'utf8');
    const hexes = raw.split(/\r?\n/).map(l => l.trim()).filter(l => /^#[0-9a-fA-F]{6}$/.test(l));
    const unique = [];
    const seen = new Set();
    for (const h of hexes) {
        if (!seen.has(h.toLowerCase())) {
            seen.add(h.toLowerCase());
            unique.push([parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
        }
    }
    const cache = new Map();
    return {
        snap(r, g, b) {
            const k = (r << 16) | (g << 8) | b;
            if (cache.has(k)) return cache.get(k);
            let best = unique[0], bd = Infinity;
            for (let i = 0; i < unique.length; i++) {
                const c = unique[i];
                const d = (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2;
                if (d < bd) { bd = d; best = c; }
            }
            cache.set(k, best);
            return best;
        }
    };
}
const pal = loadPalette();

function loadJpg(jpgPath) {
    const tmpPng = path.join(os.tmpdir(), `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${jpgPath.replace(/'/g, "''")}'); $img.Save('${tmpPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    const buf = fs.readFileSync(tmpPng);
    fs.unlinkSync(tmpPng);
    return decodePNG(buf, path.basename(jpgPath));
}

function isMagenta(r, g, b) {
    if (r > 165 && g < 85 && b > 165) return true;
    if (r > 80 && b > 70 && g < 65 && Math.abs(r - b) < 45) return true;
    if (r > 120 && b > 120 && g < 80) return true;
    return false;
}

function cleanFrame(frame) {
    const out = Buffer.from(frame);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const idx = (y * 48 + x) * 4;
            if (out[idx + 3] === 0) continue;
            let neighbors = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const ny = y + dy, nx = x + dx;
                    if (ny >= 0 && ny < 48 && nx >= 0 && nx < 48) {
                        if (frame[(ny * 48 + nx) * 4 + 3] > 0) neighbors++;
                    }
                }
            }
            if (neighbors === 0) {
                out[idx] = 0; out[idx + 1] = 0; out[idx + 2] = 0; out[idx + 3] = 0;
            }
        }
    }
    return out;
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
    const kept = sorted.slice(0, maxColors).map(e => [
        (e[0] >> 16) & 255, (e[0] >> 8) & 255, e[0] & 255
    ]);

    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 0) continue;
        let r = buf[i], g = buf[i + 1], b = buf[i + 2];
        let best = kept[0], bd = Infinity;
        for (let j = 0; j < kept.length; j++) {
            const c = kept[j];
            const d = (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2;
            if (d < bd) { bd = d; best = c; }
        }
        buf[i]     = best[0];
        buf[i + 1] = best[1];
        buf[i + 2] = best[2];
    }
}

function findRowSprites(rawImg, yMin, yMax) {
    const w = rawImg.width;
    const colHasPixels = new Array(w).fill(false);

    for (let x = 0; x < w; x++) {
        for (let y = yMin; y < yMax && y < rawImg.height; y++) {
            const idx = (y * w + x) * 4;
            if (!isMagenta(rawImg.data[idx], rawImg.data[idx + 1], rawImg.data[idx + 2])) {
                colHasPixels[x] = true;
                break;
            }
        }
    }

    const segments = [];
    let inSeg = false, startX = 0;
    for (let x = 0; x < w; x++) {
        if (colHasPixels[x] && !inSeg) {
            inSeg = true; startX = x;
        } else if (!colHasPixels[x] && inSeg) {
            inSeg = false;
            if (x - startX > 25) segments.push({ x0: startX, x1: x - 1 });
        }
    }
    if (inSeg && (w - startX > 25)) segments.push({ x0: startX, x1: w - 1 });

    return segments.map(seg => {
        let topY = yMax, botY = yMin;
        for (let y = yMin; y < yMax && y < rawImg.height; y++) {
            for (let x = seg.x0; x <= seg.x1; x++) {
                const idx = (y * w + x) * 4;
                if (!isMagenta(rawImg.data[idx], rawImg.data[idx + 1], rawImg.data[idx + 2])) {
                    if (y < topY) topY = y;
                    if (y > botY) botY = y;
                }
            }
        }
        return { x0: seg.x0, x1: seg.x1, y0: topY, y1: botY };
    });
}

/**
 * Extracts a sprite using the strict UNIFORM_SCALE.
 * - rawFootY maps to native Y = 47 (ground baseline).
 * - rawCenterX maps to native X = 24 (horizontal center).
 * - Scale is invariant across all actions and postures.
 */
function extractUniformFrame(rawImg, bbox, cropXMax = Infinity) {
    const rawFootY = bbox.y1;
    const cropXBound = Math.min(bbox.x1, cropXMax);
    const rawCenterX = (bbox.x0 + cropXBound) / 2;

    const out48 = Buffer.alloc(48 * 48 * 4);

    for (let outY = 0; outY < 48; outY++) {
        // outY = 47 corresponds to rawFootY
        const dyFromBase = 47 - outY;
        const rawY0 = Math.round(rawFootY - (dyFromBase + 1) / UNIFORM_SCALE);
        const rawY1 = Math.round(rawFootY - dyFromBase / UNIFORM_SCALE);

        if (rawY1 < bbox.y0 || rawY0 > bbox.y1 || rawY1 < 0 || rawY0 >= rawImg.height) continue;

        for (let outX = 0; outX < 48; outX++) {
            const dxFromCenter = outX - 24;
            const rawX0 = Math.round(rawCenterX + dxFromCenter / UNIFORM_SCALE);
            const rawX1 = Math.round(rawCenterX + (dxFromCenter + 1) / UNIFORM_SCALE);

            if (rawX1 < bbox.x0 || rawX0 > cropXBound) continue;

            const yStart = Math.max(bbox.y0, rawY0);
            const yEnd = Math.min(bbox.y1 + 1, rawY1);
            const xStart = Math.max(bbox.x0, rawX0);
            const xEnd = Math.min(cropXBound + 1, rawX1);

            if (yStart >= yEnd || xStart >= xEnd) continue;

            let sumR = 0, sumG = 0, sumB = 0, count = 0;

            for (let sy = yStart; sy < yEnd; sy++) {
                for (let sx = xStart; sx < xEnd; sx++) {
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

            const area = Math.max(1, (rawY1 - rawY0) * (rawX1 - rawX0));
            if (count > area * 0.35) {
                const avgR = Math.round(sumR / count);
                const avgG = Math.round(sumG / count);
                const avgB = Math.round(sumB / count);
                const snapped = pal.snap(avgR, avgG, avgB);

                const didx = (outY * 48 + outX) * 4;
                out48[didx]     = snapped[0];
                out48[didx + 1] = snapped[1];
                out48[didx + 2] = snapped[2];
                out48[didx + 3] = 255;
            }
        }
    }
    return cleanFrame(out48);
}

function assemble4DCharset(framesByFacing) {
    const buf = Buffer.alloc(144 * 192 * 4);
    const rows = [
        framesByFacing.S,
        framesByFacing.W,
        framesByFacing.W.map(mirrorFrame),
        framesByFacing.N
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
        frameMs: 200,
        species: 'elf',
        stage: 'adult',
        gender: 'male',
        action: actionTag,
        scale: "UNIFORM 40/276",
        generator: "Google Nano Banana II (Rule V69/V70/V79)"
    };
    fs.writeFileSync(path.join(CHAR_DIR, `$UF_${baseName}.json`), JSON.stringify(sidecar, null, 2));
}

console.log('=== Processing Adult Male Elf at Strict UNIFORM SCALE (40/276) ===\n');
const rawWalk   = loadJpg(path.join(RAW_DIR, 'elf_walk_nano_banana_raw.jpg'));
const rawAttack = loadJpg(path.join(RAW_DIR, 'elf_attack_nano_banana_raw.jpg'));
const rawBow    = loadJpg(path.join(RAW_DIR, 'elf_bow_nano_banana_raw.jpg'));
const rawMagic  = loadJpg(path.join(RAW_DIR, 'elf_magic_nano_banana_raw.jpg'));
const rawWork   = loadJpg(path.join(RAW_DIR, 'elf_work_nano_banana_raw.jpg'));
const rawDowned = loadJpg(path.join(RAW_DIR, 'elf_downed_nano_banana_raw.jpg'));
const rawHaul   = loadJpg(path.join(RAW_DIR, 'elf_haul_sack_nano_banana_raw.jpg'));

// 1. Walk: S [0, 1, 2], W [0, 1, 2], N [0, 1, 2]
console.log('1. Walk (Uniform Scale)...');
const sWalkB = findRowSprites(rawWalk, 10, 340);
const wWalkB = findRowSprites(rawWalk, 350, 680);
const nWalkB = findRowSprites(rawWalk, 690, 1020);
const walkFrames = {
    S: [sWalkB[0], sWalkB[1], sWalkB[2]].map(b => extractUniformFrame(rawWalk, b)),
    W: [wWalkB[0], wWalkB[1], wWalkB[2]].map(b => extractUniformFrame(rawWalk, b)),
    N: [nWalkB[0], nWalkB[1], nWalkB[2]].map(b => extractUniformFrame(rawWalk, b))
};
const walkSheet = assemble4DCharset(walkFrames);
saveSheetAndSidecar(walkSheet, 'Elf_Male_Walk', 'Walk', { walk: [0, 1, 2, 1], stand: [1] });
saveSheetAndSidecar(walkSheet, 'Elf_Walk',      'Walk', { walk: [0, 1, 2, 1], stand: [1] });

// 2. Haul: Dedicated Burlap Sack Carrying Pose
console.log('2. Haul (Dedicated Burlap Sack, Uniform Scale)...');
const sHaulB = findRowSprites(rawHaul, 10, 340);
const wHaulB = findRowSprites(rawHaul, 350, 680);
const nHaulB = findRowSprites(rawHaul, 690, 1020);
const haulFrames = {
    S: [sHaulB[0], sHaulB[1], sHaulB[2]].map(b => extractUniformFrame(rawHaul, b)),
    W: [wHaulB[0], wHaulB[1], wHaulB[2]].map(b => extractUniformFrame(rawHaul, b)),
    N: [nHaulB[0], nHaulB[1], nHaulB[2]].map(b => extractUniformFrame(rawHaul, b))
};
const haulSheet = assemble4DCharset(haulFrames);
saveSheetAndSidecar(haulSheet, 'Elf_Male_Haul', 'Haul', { haul: [0, 1, 2, 1], carry: [1], stand: [1] });
saveSheetAndSidecar(haulSheet, 'Elf_Haul',      'Haul', { haul: [0, 1, 2, 1], carry: [1], stand: [1] });

// 3. Attack: Melee Sword Strike
console.log('3. Attack (Melee Strike with Slash Arc, Uniform Scale)...');
const sAtkB = findRowSprites(rawAttack, 10, 340);
const wAtkB = findRowSprites(rawAttack, 350, 680);
const nAtkB = findRowSprites(rawAttack, 690, 1020);
const attackFrames = {
    S: [sAtkB[0], sAtkB[1], sAtkB[2]].map(b => extractUniformFrame(rawAttack, b)),
    W: [wAtkB[0], wAtkB[1], wAtkB[2]].map(b => extractUniformFrame(rawAttack, b)),
    N: [nAtkB[0], nAtkB[1], nAtkB[2]].map(b => extractUniformFrame(rawAttack, b))
};
const attackSheet = assemble4DCharset(attackFrames);
saveSheetAndSidecar(attackSheet, 'Elf_Male_Attack', 'Attack', { attack: [0, 1, 2] });
saveSheetAndSidecar(attackSheet, 'Elf_Attack',      'Attack', { attack: [0, 1, 2] });

// 4. Bow: Archery Aim, Tension, String Pluck (NO flying arrow projectile!)
console.log('4. Bow (Aim, Tension, String Pluck, NO flying arrows, Uniform Scale)...');
const sBowB = findRowSprites(rawBow, 10, 340);
const wBowB = findRowSprites(rawBow, 350, 680);
const nBowB = findRowSprites(rawBow, 690, 1020);
const bowFrames = {
    S: [
        extractUniformFrame(rawBow, sBowB[0]),
        extractUniformFrame(rawBow, sBowB[1]),
        extractUniformFrame(rawBow, sBowB[2]) // Box 2 is pluck, box 3 (flying arrow tip) omitted
    ],
    W: [
        extractUniformFrame(rawBow, wBowB[0]),
        extractUniformFrame(rawBow, wBowB[1]),
        extractUniformFrame(rawBow, wBowB[2])
    ],
    N: [
        extractUniformFrame(rawBow, nBowB[0]),
        extractUniformFrame(rawBow, nBowB[1]),
        extractUniformFrame(rawBow, nBowB[2])
    ]
};
const bowSheet = assemble4DCharset(bowFrames);
saveSheetAndSidecar(bowSheet, 'Elf_Male_Bow', 'Bow', { shoot: [0, 1, 2], pluck: [2] });
saveSheetAndSidecar(bowSheet, 'Elf_Bow',      'Bow', { shoot: [0, 1, 2], pluck: [2] });

// 5. Magic: Spell Initiation / Incantation Posture ONLY (NO projectiles!)
console.log('5. Magic (Spell Initiation Chant ONLY, NO projectiles, Uniform Scale)...');
const sMagB = findRowSprites(rawMagic, 10, 340);
const wMagB = findRowSprites(rawMagic, 350, 680);
const nMagB = findRowSprites(rawMagic, 690, 1020);

function addSoftPalmGlow(frame) {
    const out = Buffer.from(frame);
    const cGlow = pal.snap(120, 240, 140);
    for (let y = 4; y < 24; y++) {
        for (let x = 10; x < 38; x++) {
            const idx = (y * 48 + x) * 4;
            if (out[idx + 3] > 0) {
                const r = out[idx], g = out[idx + 1], b = out[idx + 2];
                // Check flesh tones around hands
                if (r > 170 && g > 130 && b > 100 && y < 20) {
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const nidx = ((y + dy) * 48 + (x + dx)) * 4;
                            if (out[nidx + 3] === 0) {
                                out[nidx]     = cGlow[0];
                                out[nidx + 1] = cGlow[1];
                                out[nidx + 2] = cGlow[2];
                                out[nidx + 3] = 255;
                            }
                        }
                    }
                }
            }
        }
    }
    return out;
}

const magF0_S = extractUniformFrame(rawMagic, sMagB[0]);
const magF1_S = extractUniformFrame(rawMagic, sMagB[1]);
const magF2_S = addSoftPalmGlow(magF1_S);

const magF0_W = extractUniformFrame(rawMagic, wMagB[0]);
const magF1_W = extractUniformFrame(rawMagic, wMagB[1]);
const magF2_W = addSoftPalmGlow(magF1_W);

const magF0_N = extractUniformFrame(rawMagic, nMagB[0]);
const magF1_N = extractUniformFrame(rawMagic, nMagB[1]);
const magF2_N = addSoftPalmGlow(magF1_N);

const magicFrames = {
    S: [magF0_S, magF1_S, magF2_S],
    W: [magF0_W, magF1_W, magF2_W],
    N: [magF0_N, magF1_N, magF2_N]
};
const magicSheet = assemble4DCharset(magicFrames);
saveSheetAndSidecar(magicSheet, 'Elf_Male_Magic', 'Cast', { cast: [0, 1, 2] });
saveSheetAndSidecar(magicSheet, 'Elf_Magic',      'Cast', { cast: [0, 1, 2] });

// 6. Work: Reach, Kneel Craft/Harvest, Inspect (Uniform Scale, preserves natural kneeling height!)
console.log('6. Work (Reach & Kneel, Uniform Scale)...');
const sWrkB = findRowSprites(rawWork, 10, 340);
const wWrkB = findRowSprites(rawWork, 350, 680);
const nWrkB = findRowSprites(rawWork, 690, 1020);
const workFrames = {
    S: [sWrkB[0], sWrkB[1], sWrkB[2]].map(b => extractUniformFrame(rawWork, b)),
    W: [wWrkB[0], wWrkB[1], wWrkB[2]].map(b => extractUniformFrame(rawWork, b)),
    N: [nWrkB[0], nWrkB[1], nWrkB[2]].map(b => extractUniformFrame(rawWork, b))
};
const workSheet = assemble4DCharset(workFrames);
saveSheetAndSidecar(workSheet, 'Elf_Male_Work', 'Work', { work: [0, 1, 2] });
saveSheetAndSidecar(workSheet, 'Elf_Work',      'Work', { work: [0, 1, 2] });

// 7. Downed: Hurt Flinch, Kneeling Collapse, Horizontal Resting Corpse (Uniform Scale!)
console.log('7. Downed (Hurt, Kneel, Horizontal Resting Corpse, Uniform Scale)...');
const sDwnB = findRowSprites(rawDowned, 10, 340);
const wDwnB = findRowSprites(rawDowned, 350, 680);
const nDwnB = findRowSprites(rawDowned, 690, 1020);

const downedFrames = {
    S: [sDwnB[0], sDwnB[1], sDwnB[2]].map(b => extractUniformFrame(rawDowned, b)),
    W: [wDwnB[0], wDwnB[1], wDwnB[2]].map(b => extractUniformFrame(rawDowned, b)),
    N: [nDwnB[0], nDwnB[1], nDwnB[2]].map(b => extractUniformFrame(rawDowned, b))
};
const downedSheet = assemble4DCharset(downedFrames);
saveSheetAndSidecar(downedSheet, 'Elf_Male_Downed', 'Dead', { hurt: [0], collapse: [1], dead: [2], sleep: [2] });
saveSheetAndSidecar(downedSheet, 'Elf_Downed',      'Dead', { hurt: [0], collapse: [1], dead: [2], sleep: [2] });

// Assemble Master 21-Column 4-Row Sheet for Male Elf (1008 x 192 px)
console.log('Assembling Adult Male Elf Master 21-Col Sheet...');
const maleSheets = {
    walk: walkSheet, attack: attackSheet, bow: bowSheet, magic: magicSheet,
    work: workSheet, downed: downedSheet, haul: haulSheet
};

const masterMale = Buffer.alloc(1008 * 192 * 4);
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
    const src = maleSheets[item.key];
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 3; c++) {
            const dstCol = item.col0 + c;
            for (let py = 0; py < 48; py++) {
                for (let px = 0; px < 48; px++) {
                    const sIdx = ((r * 48 + py) * 144 + (c * 48 + px)) * 4;
                    const dIdx = ((r * 48 + py) * 1008 + (dstCol * 48 + px)) * 4;
                    masterMale[dIdx]     = src[sIdx];
                    masterMale[dIdx + 1] = src[sIdx + 1];
                    masterMale[dIdx + 2] = src[sIdx + 2];
                    masterMale[dIdx + 3] = src[sIdx + 3];
                }
            }
        }
    }
});
quantizeSheet(masterMale, 1008, 192, 31);
fs.writeFileSync(path.join(ROOT, 'art', 'masters', 'Elf_Male_Standard_4D_21Col.png'), writePNG(masterMale, 1008, 192));

// Generate dedicated 2x visual review board for Adult Male Elf
console.log('Rendering Adult Male Elf Showcase Board (2x)...');
const boardW = 1008 * 2;
const boardH = 192 * 2 + 60;
const boardBuf = Buffer.alloc(boardW * boardH * 4);
for (let i = 0; i < boardBuf.length; i += 4) {
    boardBuf[i] = 18; boardBuf[i+1] = 22; boardBuf[i+2] = 28; boardBuf[i+3] = 255;
}

for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 21; c++) {
        for (let py = 0; py < 48; py++) {
            for (let px = 0; px < 48; px++) {
                const sIdx = ((r * 48 + py) * 1008 + (c * 48 + px)) * 4;
                if (masterMale[sIdx + 3] > 0) {
                    for (let dy = 0; dy < 2; dy++) {
                        for (let dx = 0; dx < 2; dx++) {
                            const bx = (c * 48 + px) * 2 + dx;
                            const by = (20 + r * 48 + py) * 2 + dy;
                            const dIdx = (by * boardW + bx) * 4;
                            boardBuf[dIdx]     = masterMale[sIdx];
                            boardBuf[dIdx + 1] = masterMale[sIdx + 1];
                            boardBuf[dIdx + 2] = masterMale[sIdx + 2];
                            boardBuf[dIdx + 3] = 255;
                        }
                    }
                }
            }
        }
    }
}

const maleBoardPath = path.join(REVIEW_DIR, 'elf_male_standard_4d_review.png');
fs.writeFileSync(maleBoardPath, writePNG(boardBuf, boardW, boardH));
console.log(`Saved Adult Male Elf review board: ${maleBoardPath}`);

const BRAIN_DIR = 'C:/Users/snewt/.gemini/antigravity/brain/e6a9a54f-2cc6-432e-b7ec-5affda42dd85';
fs.copyFileSync(maleBoardPath, path.join(BRAIN_DIR, 'elf_male_standard_4d_review.png'));

console.log('\n=== Uniform Scale Adult Male Elf Complete! ===');
