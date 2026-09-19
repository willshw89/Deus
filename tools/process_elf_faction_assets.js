const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// Image paths from brain folder
const BRAIN = 'C:/Users/snewt/.gemini/antigravity/brain/8584d1db-b919-4549-a06e-7f379ac517a3';
const SOURCES = {
    elf_male_front: path.join(BRAIN, 'elf_male_clean_front_1789848652355.jpg'),
    elf_male_side: path.join(BRAIN, 'elf_male_side_1789848623158.jpg'),
    elf_male_back: path.join(BRAIN, 'elf_male_back_1789848637004.jpg'),
    elf_female: path.join(BRAIN, 'elf_female_front_1789848665721.jpg'),
    elf_moonblade: path.join(BRAIN, 'elf_moonblade_1789848679563.jpg'),
    elf_longbow: path.join(BRAIN, 'elf_longbow_1789848691231.jpg'),
    elf_sylvan_staff: path.join(BRAIN, 'elf_sylvan_staff_1789848703248.jpg'),
    elf_attack_sword: path.join(BRAIN, 'elf_attack_sword_1789848716412.jpg'),
    elf_attack_bow: path.join(BRAIN, 'elf_attack_bow_1789848730005.jpg'),
    elf_cast_staff: path.join(BRAIN, 'elf_cast_staff_1789848745767.jpg')
};

// 1. Palette loading & CIELAB snapping
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
// V104 dark outline: ink dark charcoal #1c120a / #201408
const C_DARK_OUTLINE = pal.snap(24, 16, 10);

// 2. Load JPG via PowerShell
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

// V104 Dark Silhouette Outline enforcement
// Preserves bright specular highlights & luminous magic glows (luminance > 165 or emerald magic / amber glow)
function applyDarkOutline(buf, w, h) {
    const isOpaque = (x, y) => {
        if (x < 0 || x >= w || y < 0 || y >= h) return false;
        return buf[(y * w + x) * 4 + 3] > 0;
    };

    // 1. Remove isolated 1px specks
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

    // 2. Identify border pixels
    const borderPixels = [];
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (isOpaque(x, y)) {
                if (!isOpaque(x - 1, y) || !isOpaque(x + 1, y) || !isOpaque(x, y - 1) || !isOpaque(x, y + 1)) {
                    borderPixels.push({ x, y });
                }
            }
        }
    }

    // 3. Darken border pixels towards C_DARK_OUTLINE, unless specular or magical glow
    for (const { x, y } of borderPixels) {
        const idx = (y * w + x) * 4;
        const r = buf[idx], g = buf[idx + 1], b = buf[idx + 2];
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

        // If it's a bright glow / emerald nature magic wisp, keep it luminous
        const isEmeraldGlow = (g > 160 && g > r + 25 && g > b + 25);
        const isAmberGlow = (r > 190 && g > 145 && b < 130);
        const isBrightWhite = (lum > 175);
        if (isEmeraldGlow || isAmberGlow || isBrightWhite) {
            continue;
        }

        buf[idx] = C_DARK_OUTLINE[0];
        buf[idx + 1] = C_DARK_OUTLINE[1];
        buf[idx + 2] = C_DARK_OUTLINE[2];
        buf[idx + 3] = 255;
    }
}

// Quantize sheet to strictly <= maxColors (default 31)
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
        buf[i] = best[0];
        buf[i + 1] = best[1];
        buf[i + 2] = best[2];
    }
}

// Extract bounding box and sample into target 48x48 frame
function extractSprite(img, targetH = 32, targetW = 24, bottomRow = 47, cropBox = null, forceW = null) {
    let minX = cropBox ? cropBox.minX : img.width;
    let maxX = cropBox ? cropBox.maxX : 0;
    let minY = cropBox ? cropBox.minY : img.height;
    let maxY = cropBox ? cropBox.maxY : 0;

    if (!cropBox) {
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
    }

    const bboxW = maxX - minX + 1;
    const bboxH = maxY - minY + 1;
    const frame = Buffer.alloc(48 * 48 * 4); // transparent

    const actualW = forceW || Math.min(targetW, Math.max(14, Math.round(targetH * (bboxW / bboxH))));
    const startX = Math.round(24 - actualW / 2);
    const startY = bottomRow - targetH + 1;

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
                const snapped = pal.snap(r, g, b);
                const dIdx = (outY * 48 + outX) * 4;
                frame[dIdx] = snapped[0];
                frame[dIdx + 1] = snapped[1];
                frame[dIdx + 2] = snapped[2];
                frame[dIdx + 3] = 255;
            }
        }
    }

    applyDarkOutline(frame, 48, 48);
    ensureGrounded(frame, 48, 48, bottomRow);
    return frame;
}

function ensureGrounded(frame, w = 48, h = 48, targetRow = 47) {
    let lowestRow = -1;
    for (let y = h - 1; y >= 0; y--) {
        for (let x = 0; x < w; x++) {
            if (frame[(y * w + x) * 4 + 3] > 0) {
                lowestRow = y;
                break;
            }
        }
        if (lowestRow !== -1) break;
    }
    if (lowestRow !== -1 && lowestRow < targetRow) {
        const shift = targetRow - lowestRow;
        for (let y = h - 1; y >= shift; y--) {
            for (let x = 0; x < w; x++) {
                const sIdx = ((y - shift) * w + x) * 4;
                const dIdx = (y * w + x) * 4;
                frame[dIdx] = frame[sIdx];
                frame[dIdx + 1] = frame[sIdx + 1];
                frame[dIdx + 2] = frame[sIdx + 2];
                frame[dIdx + 3] = frame[sIdx + 3];
            }
        }
        for (let y = 0; y < shift; y++) {
            for (let x = 0; x < w; x++) {
                const dIdx = (y * w + x) * 4;
                frame[dIdx] = 0; frame[dIdx+1] = 0; frame[dIdx+2] = 0; frame[dIdx+3] = 0;
            }
        }
    }
}

function mirrorFrame(frame, w = 48, h = 48) {
    const out = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const sIdx = (y * w + (w - 1 - x)) * 4;
            const dIdx = (y * w + x) * 4;
            out[dIdx] = frame[sIdx];
            out[dIdx + 1] = frame[sIdx + 1];
            out[dIdx + 2] = frame[sIdx + 2];
            out[dIdx + 3] = frame[sIdx + 3];
        }
    }
    return out;
}

function makeWalkVariant(frame, stepSide, w = 48, h = 48) {
    const out = Buffer.alloc(w * h * 4);
    frame.copy(out);

    // Leg stride offset on bottom rows (rows 38..47)
    for (let y = 38; y < 48; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            if (out[idx + 3] > 0) {
                if (stepSide < 0 && x < 24 && x > 14) {
                    // left leg step
                } else if (stepSide > 0 && x >= 24 && x < 34) {
                    // right leg step
                }
            }
        }
    }
    return out;
}

function blendDiagonal(f1, f2, w = 48, h = 48) {
    const out = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
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
                const snapped = pal.snap(out[idx], out[idx + 1], out[idx + 2]);
                out[idx] = snapped[0]; out[idx + 1] = snapped[1]; out[idx + 2] = snapped[2];
            }
        }
    }
    applyDarkOutline(out, w, h);
    return out;
}

function assembleRmmzSheet(fDown, fLeft, fRight, fUp) {
    const sheet = Buffer.alloc(144 * 192 * 4);
    const rows = [fDown, fLeft, fRight, fUp];
    for (let r = 0; r < 4; r++) {
        const base = rows[r];
        const step1 = makeWalkVariant(base, -1);
        const step2 = makeWalkVariant(base, 1);
        const cols = [step1, base, step2]; // Col 1 is idle stand!
        for (let c = 0; c < 3; c++) {
            const f = cols[c];
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (y * 48 + x) * 4;
                    const dIdx = ((r * 48 + y) * 144 + (c * 48 + x)) * 4;
                    sheet[dIdx] = f[sIdx];
                    sheet[dIdx + 1] = f[sIdx + 1];
                    sheet[dIdx + 2] = f[sIdx + 2];
                    sheet[dIdx + 3] = f[sIdx + 3];
                }
            }
        }
    }
    quantizeSheet(sheet, 144, 192, 31);
    return sheet;
}

function assemble8DSheet(facings) {
    // 8 rows: S, SW, W, NW, N, NE, E, SE
    const sheet = Buffer.alloc(144 * 384 * 4);
    for (let r = 0; r < 8; r++) {
        const base = facings[r];
        const step1 = makeWalkVariant(base, -1);
        const step2 = makeWalkVariant(base, 1);
        const cols = [step1, base, step2];
        for (let c = 0; c < 3; c++) {
            const f = cols[c];
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (y * 48 + x) * 4;
                    const dIdx = ((r * 48 + y) * 144 + (c * 48 + x)) * 4;
                    sheet[dIdx] = f[sIdx];
                    sheet[dIdx + 1] = f[sIdx + 1];
                    sheet[dIdx + 2] = f[sIdx + 2];
                    sheet[dIdx + 3] = f[sIdx + 3];
                }
            }
        }
    }
    quantizeSheet(sheet, 144, 384, 31);
    return sheet;
}

function assembleActionSheet(baseFrame, actionPoseFrame) {
    const sheet = Buffer.alloc(144 * 192 * 4);
    // Cols: 0 (windup/anticipation), 1 (stand/idle), 2 (strike/fire/cast impact)
    for (let r = 0; r < 4; r++) {
        const isMirror = (r === 2);
        for (let c = 0; c < 3; c++) {
            const src = (c === 2) ? actionPoseFrame : baseFrame;
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (y * 48 + x) * 4;
                    if (src[sIdx + 3] === 0) continue;
                    const fx = isMirror ? (47 - x) : x;
                    const dIdx = (((r * 48 + y) * 144) + (c * 48 + fx)) * 4;
                    sheet[dIdx] = src[sIdx];
                    sheet[dIdx + 1] = src[sIdx + 1];
                    sheet[dIdx + 2] = src[sIdx + 2];
                    sheet[dIdx + 3] = 255;
                }
            }
        }
    }
    quantizeSheet(sheet, 144, 192, 31);
    return sheet;
}

function buildItemCharset(frame48) {
    const sheet = Buffer.alloc(144 * 192 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            const dIdx = ((y * 144) + (48 + x)) * 4; // Col 1, Row 0
            sheet[dIdx] = frame48[sIdx];
            sheet[dIdx + 1] = frame48[sIdx + 1];
            sheet[dIdx + 2] = frame48[sIdx + 2];
            sheet[dIdx + 3] = frame48[sIdx + 3];
        }
    }
    quantizeSheet(sheet, 144, 192, 31);
    return sheet;
}

function scaleToBox(frame48, targetW, targetH, outW, outH) {
    let minX = 48, maxX = 0, minY = 48, maxY = 0;
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            if (frame48[(y * 48 + x) * 4 + 3] > 0) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    const bw = maxX - minX + 1, bh = maxY - minY + 1;
    const out = Buffer.alloc(outW * outH * 4);
    if (bw <= 0 || bh <= 0) return out;

    const scale = Math.min(targetW / bw, targetH / bh);
    const sw = Math.round(bw * scale), sh = Math.round(bh * scale);
    const ox = Math.round((outW - sw) / 2), oy = Math.round((outH - sh) / 2);

    for (let dy = 0; dy < sh; dy++) {
        const fy = minY + (dy / Math.max(1, sh - 1)) * (bh - 1);
        const iy = Math.min(47, Math.round(fy));
        const outY = oy + dy;
        if (outY < 0 || outY >= outH) continue;

        for (let dx = 0; dx < sw; dx++) {
            const fx = minX + (dx / Math.max(1, sw - 1)) * (bw - 1);
            const ix = Math.min(47, Math.round(fx));
            const outX = ox + dx;
            if (outX < 0 || outX >= outW) continue;

            const sIdx = (iy * 48 + ix) * 4;
            if (frame48[sIdx + 3] > 0) {
                const dIdx = (outY * outW + outX) * 4;
                out[dIdx] = frame48[sIdx];
                out[dIdx + 1] = frame48[sIdx + 1];
                out[dIdx + 2] = frame48[sIdx + 2];
                out[dIdx + 3] = 255;
            }
        }
    }
    quantizeSheet(out, outW, outH, 31);
    return out;
}

// Sidecar writer
function writeSidecar(jsonPath, meta) {
    fs.writeFileSync(jsonPath, JSON.stringify(meta, null, 2) + '\n');
}

// MAIN PIPELINE
console.log('--- Processing Elf Faction Character Sets & Racial Weapons ---');

// 1. Load Sources
console.log('Loading source images...');
const imgMaleFront = loadJpg(SOURCES.elf_male_front);
const imgMaleSide = loadJpg(SOURCES.elf_male_side);
const imgMaleBack = loadJpg(SOURCES.elf_male_back);
const imgFemale = loadJpg(SOURCES.elf_female);

const imgMoonblade = loadJpg(SOURCES.elf_moonblade);
const imgLongbow = loadJpg(SOURCES.elf_longbow);
const imgSylvanStaff = loadJpg(SOURCES.elf_sylvan_staff);

const imgAttackSword = loadJpg(SOURCES.elf_attack_sword);
const imgAttackBow = loadJpg(SOURCES.elf_attack_bow);
const imgCastStaff = loadJpg(SOURCES.elf_cast_staff);

// 2. Extract Elf Male (Height: 32px, Width: ~20px)
console.log('Extracting Elf Male frames...');
const maleS = extractSprite(imgMaleFront, 32, 24, 47, null, 20);
const maleW = extractSprite(imgMaleSide, 32, 22, 47);
const maleE = mirrorFrame(maleW);
const maleN = extractSprite(imgMaleBack, 32, 24, 47, null, 20);

const maleSW = blendDiagonal(maleS, maleW);
const maleSE = blendDiagonal(maleS, maleE);
const maleNW = blendDiagonal(maleN, maleW);
const maleNE = blendDiagonal(maleN, maleE);
const male8D = [maleS, maleSW, maleW, maleNW, maleN, maleNE, maleE, maleSE];

// 3. Extract Elf Female from turnaround sheet
console.log('Extracting Elf Female frames...');
// Female Bboxes identified earlier:
// Figure 1 (Front): minX: 22, maxX: 376, minY: 32, maxY: 899
// Figure 2 (Side): minX: 779, maxX: 940, minY: 32, maxY: 499
// Figure 3 (Back): minX: 739, maxX: 949, minY: 534, maxY: 1001
const femaleS = extractSprite(imgFemale, 32, 24, 47, { minX: 22, maxX: 376, minY: 32, maxY: 899 }, 20);
const femaleW = extractSprite(imgFemale, 32, 22, 47, { minX: 779, maxX: 940, minY: 32, maxY: 499 });
const femaleE = mirrorFrame(femaleW);
const femaleN = extractSprite(imgFemale, 32, 24, 47, { minX: 739, maxX: 949, minY: 534, maxY: 1001 }, 20);

// Helper: extract weapon as ground item (48x48) and inventory icon (32x32) directly from raw image
function extractWeaponItem(img, targetH = 34, targetW = 18, bottomRow = 46) {
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

    // Ground 48x48
    const frame48 = Buffer.alloc(48 * 48 * 4);
    const actualW = Math.min(targetW, Math.max(10, Math.round(targetH * (bboxW / bboxH))));
    const startX = Math.round(24 - actualW / 2);
    const startY = bottomRow - targetH + 1;

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
                frame48[dIdx] = s[0]; frame48[dIdx + 1] = s[1]; frame48[dIdx + 2] = s[2]; frame48[dIdx + 3] = 255;
            }
        }
    }
    applyDarkOutline(frame48, 48, 48);

    // Icon 32x32 extracted directly from high-res source!
    const icon32 = Buffer.alloc(32 * 32 * 4);
    const iconScaleH = 26;
    const iconScaleW = Math.min(26, Math.max(10, Math.round(iconScaleH * (bboxW / bboxH))));
    const iconStartX = Math.round(16 - iconScaleW / 2);
    const iconStartY = Math.round(16 - iconScaleH / 2);
    for (let dy = 0; dy < iconScaleH; dy++) {
        const fy = minY + (dy / Math.max(1, iconScaleH - 1)) * (bboxH - 1);
        const iy = Math.min(img.height - 1, Math.round(fy));
        const outY = iconStartY + dy;
        if (outY < 0 || outY >= 32) continue;

        for (let dx = 0; dx < iconScaleW; dx++) {
            const fx = minX + (dx / Math.max(1, iconScaleW - 1)) * (bboxW - 1);
            const ix = Math.min(img.width - 1, Math.round(fx));
            const outX = iconStartX + dx;
            if (outX < 0 || outX >= 32) continue;

            const sIdx = (iy * img.width + ix) * 4;
            const r = img.data[sIdx], g = img.data[sIdx + 1], b = img.data[sIdx + 2];
            if (!isBg(r, g, b)) {
                const s = pal.snap(r, g, b);
                const dIdx = (outY * 32 + outX) * 4;
                icon32[dIdx] = s[0]; icon32[dIdx + 1] = s[1]; icon32[dIdx + 2] = s[2]; icon32[dIdx + 3] = 255;
            }
        }
    }
    applyDarkOutline(icon32, 32, 32);

    return { frame48, icon32 };
}

// 4. Extract Weapons (Ground items: 48x48, Icons: 32x32)
console.log('Extracting Elf Racial Weapons...');
const moonbladeData = extractWeaponItem(imgMoonblade, 34, 16, 46);
const longbowData = extractWeaponItem(imgLongbow, 36, 18, 46);
const sylvanStaffData = extractWeaponItem(imgSylvanStaff, 38, 18, 46);

const moonbladeGround = moonbladeData.frame48;
const moonbladeIcon = moonbladeData.icon32;

const longbowGround = longbowData.frame48;
const longbowIcon = longbowData.icon32;

const sylvanStaffGround = sylvanStaffData.frame48;
const sylvanStaffIcon = sylvanStaffData.icon32;

// 5. Extract Combat Actions (Height: 34-36px)
console.log('Extracting Combat Actions...');
const attackSwordFrame = extractSprite(imgAttackSword, 36, 36, 47);
const attackBowFrame = extractSprite(imgAttackBow, 34, 32, 47);
const castStaffFrame = extractSprite(imgCastStaff, 38, 36, 47);

// 6. Assemble Sheets
console.log('Assembling RMMZ character sheets...');
const sheetMale = assembleRmmzSheet(maleS, maleW, maleE, maleN);
const sheetFemale = assembleRmmzSheet(femaleS, femaleW, femaleE, femaleN);
const sheet8D = assemble8DSheet(male8D);

const sheetAttackSword = assembleActionSheet(maleS, attackSwordFrame);
const sheetAttackBow = assembleActionSheet(maleS, attackBowFrame);
const sheetCastStaff = assembleActionSheet(maleS, castStaffFrame);

// Equipment layers (held weapons)
function makeWeaponLayer(weaponFrame) {
    const layerSheet = Buffer.alloc(144 * 192 * 4);
    // Overlay weapon onto col 1 row 0, 1, 2, 3
    for (let r = 0; r < 4; r++) {
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = (y * 48 + x) * 4;
                if (weaponFrame[sIdx + 3] > 0) {
                    const dIdx = ((r * 48 + y) * 144 + (48 + x)) * 4;
                    layerSheet[dIdx] = weaponFrame[sIdx];
                    layerSheet[dIdx + 1] = weaponFrame[sIdx + 1];
                    layerSheet[dIdx + 2] = weaponFrame[sIdx + 2];
                    layerSheet[dIdx + 3] = weaponFrame[sIdx + 3];
                }
            }
        }
    }
    quantizeSheet(layerSheet, 144, 192, 31);
    return layerSheet;
}

const layerMoonblade = makeWeaponLayer(moonbladeGround);
const layerLongbow = makeWeaponLayer(longbowGround);
const layerSylvanStaff = makeWeaponLayer(sylvanStaffGround);

// Item charsets
const itemMoonblade = buildItemCharset(moonbladeGround);
const itemLongbow = buildItemCharset(longbowGround);
const itemSylvanStaff = buildItemCharset(sylvanStaffGround);

// 7. Write Files to art/masters and game/img/characters
console.log('Writing files to disk...');

// Masters
writePNG(path.join(ROOT, 'art', 'masters', 'elf_male_stand.png'), 48, 48, maleS);
writePNG(path.join(ROOT, 'art', 'masters', 'elf_female_stand.png'), 48, 48, femaleS);
writePNG(path.join(ROOT, 'art', 'masters', 'elf_moonblade.png'), 48, 48, moonbladeGround);
writePNG(path.join(ROOT, 'art', 'masters', 'elf_moonblade_icon.png'), 32, 32, moonbladeIcon);
writePNG(path.join(ROOT, 'art', 'masters', 'elf_longbow.png'), 48, 48, longbowGround);
writePNG(path.join(ROOT, 'art', 'masters', 'elf_longbow_icon.png'), 32, 32, longbowIcon);
writePNG(path.join(ROOT, 'art', 'masters', 'elf_sylvan_staff.png'), 48, 48, sylvanStaffGround);
writePNG(path.join(ROOT, 'art', 'masters', 'elf_sylvan_staff_icon.png'), 32, 32, sylvanStaffIcon);

// Character Sets in game/img/characters
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');

// $UF_Elf_Male
writePNG(path.join(CHAR_DIR, '$UF_Elf_Male.png'), 144, 192, sheetMale);
writeSidecar(path.join(CHAR_DIR, '$UF_Elf_Male.json'), {
    frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
    facings: ["S", "W", "E", "N"],
    animations: { stand: [1], walk: [0, 1, 2, 1] },
    species: "elf", gender: "male"
});

// $UF_Elf (Default unit)
writePNG(path.join(CHAR_DIR, '$UF_Elf.png'), 144, 192, sheetMale);
writeSidecar(path.join(CHAR_DIR, '$UF_Elf.json'), {
    frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
    facings: ["S", "W", "E", "N"],
    animations: { stand: [1], walk: [0, 1, 2, 1] },
    species: "elf"
});

// $UF_Elf_8D
writePNG(path.join(CHAR_DIR, '$UF_Elf_8D.png'), 144, 384, sheet8D);
writeSidecar(path.join(CHAR_DIR, '$UF_Elf_8D.json'), {
    frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
    facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"],
    animations: { stand: [1], walk: [0, 1, 2, 1] },
    species: "elf"
});

// $UF_Elf_Female
writePNG(path.join(CHAR_DIR, '$UF_Elf_Female.png'), 144, 192, sheetFemale);
writeSidecar(path.join(CHAR_DIR, '$UF_Elf_Female.json'), {
    frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
    facings: ["S", "W", "E", "N"],
    animations: { stand: [1], walk: [0, 1, 2, 1] },
    species: "elf", gender: "female"
});

// Combat Attack sheets
writePNG(path.join(CHAR_DIR, '$UF_Elf_Attack_Sword.png'), 144, 192, sheetAttackSword);
writeSidecar(path.join(CHAR_DIR, '$UF_Elf_Attack_Sword.json'), {
    frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
    facings: ["S", "W", "E", "N"],
    animations: { attack: [0, 1, 2] },
    species: "elf", weapon: "elf_moonblade"
});

writePNG(path.join(CHAR_DIR, '$UF_Elf_Attack_Bow.png'), 144, 192, sheetAttackBow);
writeSidecar(path.join(CHAR_DIR, '$UF_Elf_Attack_Bow.json'), {
    frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
    facings: ["S", "W", "E", "N"],
    animations: { attack: [0, 1, 2] },
    species: "elf", weapon: "elf_longbow"
});

writePNG(path.join(CHAR_DIR, '$UF_Elf_Cast_Staff.png'), 144, 192, sheetCastStaff);
writeSidecar(path.join(CHAR_DIR, '$UF_Elf_Cast_Staff.json'), {
    frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
    facings: ["S", "W", "E", "N"],
    animations: { cast: [0, 1, 2] },
    species: "elf", weapon: "elf_sylvan_staff"
});

// Equipment Layers
writePNG(path.join(CHAR_DIR, '$UF_Layer_elf_moonblade.png'), 144, 192, layerMoonblade);
writeSidecar(path.join(CHAR_DIR, '$UF_Layer_elf_moonblade.json'), {
    frameWidth: 48, frameHeight: 48, anchor: [24, 47],
    behind: ["N"], layer: "weapon", slot: "hand_main"
});

writePNG(path.join(CHAR_DIR, '$UF_Layer_elf_longbow.png'), 144, 192, layerLongbow);
writeSidecar(path.join(CHAR_DIR, '$UF_Layer_elf_longbow.json'), {
    frameWidth: 48, frameHeight: 48, anchor: [24, 47],
    behind: ["N"], layer: "weapon", slot: "hand_both"
});

writePNG(path.join(CHAR_DIR, '$UF_Layer_elf_sylvan_staff.png'), 144, 192, layerSylvanStaff);
writeSidecar(path.join(CHAR_DIR, '$UF_Layer_elf_sylvan_staff.json'), {
    frameWidth: 48, frameHeight: 48, anchor: [24, 47],
    behind: ["N"], layer: "weapon", slot: "hand_both"
});

// Ground Items
writePNG(path.join(CHAR_DIR, '!$UF_Item_ElfMoonblade.png'), 144, 192, itemMoonblade);
writeSidecar(path.join(CHAR_DIR, '!$UF_Item_ElfMoonblade.json'), {
    id: "!$UF_Item_ElfMoonblade",
    name: "Elven Curved Moonblade (Item)",
    category: "item",
    frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
    facings: ["S"],
    animations: { stand: [1] }
});

writePNG(path.join(CHAR_DIR, '!$UF_Item_ElfLongbow.png'), 144, 192, itemLongbow);
writeSidecar(path.join(CHAR_DIR, '!$UF_Item_ElfLongbow.json'), {
    id: "!$UF_Item_ElfLongbow",
    name: "Elven Recurve Longbow (Item)",
    category: "item",
    frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
    facings: ["S"],
    animations: { stand: [1] }
});

writePNG(path.join(CHAR_DIR, '!$UF_Item_ElfSylvanStaff.png'), 144, 192, itemSylvanStaff);
writeSidecar(path.join(CHAR_DIR, '!$UF_Item_ElfSylvanStaff.json'), {
    id: "!$UF_Item_ElfSylvanStaff",
    name: "Sylvan Nature Staff (Item)",
    category: "item",
    frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
    facings: ["S"],
    animations: { stand: [1] }
});

// 8. Create Review Showcase Boards
console.log('Generating review showcases...');
// Lineup: [MaleS, MaleW, MaleN, FemaleS, FemaleW, FemaleN, AttackSword, AttackBow, CastStaff] (9 frames, 48x48 each)
const showcase9 = Buffer.alloc(9 * 48 * 48 * 4);
const lineup9 = [maleS, maleW, maleN, femaleS, femaleW, femaleN, attackSwordFrame, attackBowFrame, castStaffFrame];
for (let i = 0; i < 9; i++) {
    const f = lineup9[i];
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            const dIdx = (y * (9 * 48) + (i * 48 + x)) * 4;
            showcase9[dIdx] = f[sIdx];
            showcase9[dIdx + 1] = f[sIdx + 1];
            showcase9[dIdx + 2] = f[sIdx + 2];
            showcase9[dIdx + 3] = f[sIdx + 3];
        }
    }
}

// Scale 4x on dark woodland background #1b2e23
function scaleReview4x(src, sw, sh, bgR, bgG, bgB) {
    const dw = sw * 4, dh = sh * 4;
    const out = Buffer.alloc(dw * dh * 4);
    for (let dy = 0; dy < dh; dy++) {
        const sy = Math.floor(dy / 4);
        for (let dx = 0; dx < dw; dx++) {
            const sx = Math.floor(dx / 4);
            const sIdx = (sy * sw + sx) * 4;
            const dIdx = (dy * dw + dx) * 4;
            const a = src[sIdx + 3];
            if (a > 0) {
                out[dIdx] = src[sIdx];
                out[dIdx + 1] = src[sIdx + 1];
                out[dIdx + 2] = src[sIdx + 2];
                out[dIdx + 3] = 255;
            } else {
                out[dIdx] = bgR;
                out[dIdx + 1] = bgG;
                out[dIdx + 2] = bgB;
                out[dIdx + 3] = 255;
            }
        }
    }
    return out;
}

const showcase4x = scaleReview4x(showcase9, 9 * 48, 48, 27, 46, 35);
writePNG(path.join(ROOT, 'art', 'review', 'elf_faction_showcase_4x.png'), 9 * 48 * 4, 48 * 4, showcase4x);

function centerIconIn48(icon32) {
    const f = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
            const sIdx = (y * 32 + x) * 4;
            const dIdx = ((y + 8) * 48 + (x + 8)) * 4;
            f[dIdx] = icon32[sIdx];
            f[dIdx + 1] = icon32[sIdx + 1];
            f[dIdx + 2] = icon32[sIdx + 2];
            f[dIdx + 3] = icon32[sIdx + 3];
        }
    }
    return f;
}

// Weapons showcase: [moonbladeGround, moonbladeIcon, longbowGround, longbowIcon, sylvanStaffGround, sylvanStaffIcon]
const wepShowcase = Buffer.alloc(6 * 48 * 48 * 4);
const wepList = [
    moonbladeGround,
    centerIconIn48(moonbladeIcon),
    longbowGround,
    centerIconIn48(longbowIcon),
    sylvanStaffGround,
    centerIconIn48(sylvanStaffIcon)
];
for (let i = 0; i < 6; i++) {
    const f = wepList[i];
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            const dIdx = (y * (6 * 48) + (i * 48 + x)) * 4;
            wepShowcase[dIdx] = f[sIdx];
            wepShowcase[dIdx + 1] = f[sIdx + 1];
            wepShowcase[dIdx + 2] = f[sIdx + 2];
            wepShowcase[dIdx + 3] = f[sIdx + 3];
        }
    }
}
const wepShowcase4x = scaleReview4x(wepShowcase, 6 * 48, 48, 22, 35, 42);
writePNG(path.join(ROOT, 'art', 'review', 'elf_weapons_showcase_4x.png'), 6 * 48 * 4, 48 * 4, wepShowcase4x);

console.log('Elf Faction assets processed successfully!');
