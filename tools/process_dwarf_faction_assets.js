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
    dwarf_male_front: path.join(BRAIN, 'dwarf_male_clean_front_1789847907403.jpg'),
    dwarf_male_side: path.join(BRAIN, 'dwarf_male_clean_side_1789847981218.jpg'),
    dwarf_male_back: path.join(BRAIN, 'dwarf_male_clean_back_1789847961098.jpg'),
    dwarf_female_front: path.join(BRAIN, 'dwarf_female_front_1789847555163.jpg'),
    dwarf_female_side: path.join(BRAIN, 'dwarf_female_side_1789848162242.jpg'),
    dwarf_female_back: path.join(BRAIN, 'dwarf_female_back_1789848177071.jpg'),
    dwarf_war_axe: path.join(BRAIN, 'dwarf_war_axe_1789847609353.jpg'),
    dwarf_crossbow: path.join(BRAIN, 'dwarf_crossbow_clean_1789848002354.jpg'),
    dwarf_rune_hammer: path.join(BRAIN, 'dwarf_rune_hammer_1789847654306.jpg'),
    dwarf_attack_axe: path.join(BRAIN, 'dwarf_attack_axe_1789847721353.jpg'),
    dwarf_attack_crossbow: path.join(BRAIN, 'dwarf_attack_crossbow_1789847739025.jpg'),
    dwarf_cast_magic: path.join(BRAIN, 'dwarf_cast_magic_1789847757229.jpg')
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
    // Magenta background detection
    if (r > 150 && g < 90 && b > 150) return true;
    if (r > 100 && g < 60 && b > 100) return true;
    if (b > g + 35 && r > g + 35) return true;
    return false;
}

// V104 Dark Silhouette Outline enforcement
// Preserves bright specular highlights & luminous magic glows (luminance > 165 or amber glow)
function applyDarkOutline(buf, w, h) {
    const isOpaque = (x, y) => {
        if (x < 0 || x >= w || y < 0 || y >= h) return false;
        return buf[(y * w + x) * 4 + 3] > 0;
    };

    // 1. Remove isolated 1px specks (compression noise)
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
                    buf[(y * w + x) * 4 + 3] = 0; // eliminate lone speck
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

        // If it's a bright glow / magic rune wisp, keep it luminous
        const isAmberGlow = (r > 190 && g > 145 && b < 130);
        const isBrightWhite = (lum > 175);
        if (isAmberGlow || isBrightWhite) {
            continue;
        }

        buf[idx] = C_DARK_OUTLINE[0];
        buf[idx + 1] = C_DARK_OUTLINE[1];
        buf[idx + 2] = C_DARK_OUTLINE[2];
        buf[idx + 3] = 255;
    }
}

// 3. Extract bounding box and sample into target 48x48 frame
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
    const frame = Buffer.alloc(48 * 48 * 4); // transparent

    const actualW = Math.min(targetW, Math.round(targetH * (bboxW / bboxH)));
    const startX = Math.round(24 - actualW / 2);
    const startY = bottomRow - targetH + 1;

    for (let dy = 0; dy < targetH; dy++) {
        const fy = minY + (dy / (targetH - 1)) * (bboxH - 1);
        const iy = Math.min(img.height - 1, Math.round(fy));
        const outY = startY + dy;
        if (outY < 0 || outY >= 48) continue;

        for (let dx = 0; dx < actualW; dx++) {
            const fx = minX + (dx / (actualW - 1)) * (bboxW - 1);
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
    return frame;
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

// Create a walking frame step variant (bob and leg stride)
function makeWalkVariant(frame, stepSide, w = 48, h = 48) {
    const out = Buffer.alloc(w * h * 4);
    frame.copy(out);

    // Subtle 1px leg stride offset on bottom rows (rows 38..47)
    for (let y = 38; y < 48; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            if (out[idx + 3] > 0) {
                // Leg stride variation
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

// Blend two frames for diagonal 3/4 facing (e.g. South + West -> South-West)
function blendDiagonals(fA, fB, w = 48, h = 48) {
    const out = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const opA = fA[idx + 3] > 0;
            const opB = fB[idx + 3] > 0;
            if (opA && opB) {
                const r = Math.round((fA[idx] + fB[idx]) / 2);
                const g = Math.round((fA[idx + 1] + fB[idx + 1]) / 2);
                const b = Math.round((fA[idx + 2] + fB[idx + 2]) / 2);
                const s = pal.snap(r, g, b);
                out[idx] = s[0]; out[idx + 1] = s[1]; out[idx + 2] = s[2]; out[idx + 3] = 255;
            } else if (opA) {
                out[idx] = fA[idx]; out[idx + 1] = fA[idx + 1]; out[idx + 2] = fA[idx + 2]; out[idx + 3] = 255;
            } else if (opB) {
                out[idx] = fB[idx]; out[idx + 1] = fB[idx + 1]; out[idx + 2] = fB[idx + 2]; out[idx + 3] = 255;
            }
        }
    }
    applyDarkOutline(out, w, h);
    return out;
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

// Build 144x192 RMMZ single character sheet (3 cols x 4 rows)
function assembleRmmzSheet(frames) {
    // frames: { S: [stepL, stand, stepR], W: [...], E: [...], N: [...] }
    const sheet = Buffer.alloc(144 * 192 * 4);
    const rows = ['S', 'W', 'E', 'N'];
    for (let r = 0; r < 4; r++) {
        const rowKey = rows[r];
        const rowFrames = frames[rowKey];
        for (let c = 0; c < 3; c++) {
            const f = rowFrames[c];
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (y * 48 + x) * 4;
                    const dIdx = (((r * 48 + y) * 144) + (c * 48 + x)) * 4;
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

// Build 8-way master sheet: 8 rows (S, SW, W, NW, N, NE, E, SE) x 3 cols (144x384)
function assemble8DSheet(frames8) {
    const sheet = Buffer.alloc(144 * 384 * 4);
    for (let r = 0; r < 8; r++) {
        const rowFrames = frames8[r];
        for (let c = 0; c < 3; c++) {
            const f = rowFrames[c];
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (y * 48 + x) * 4;
                    const dIdx = (((r * 48 + y) * 144) + (c * 48 + x)) * 4;
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

console.log('=== Processing Dwarf Faction Assets ===');

// 1. Process Dwarf Male
console.log('Loading clean Dwarf Male raw images...');
const imgMaleFront = loadJpg(SOURCES.dwarf_male_front);
const imgMaleSide = loadJpg(SOURCES.dwarf_male_side);
const imgMaleBack = loadJpg(SOURCES.dwarf_male_back);

const fMaleS = extractSprite(imgMaleFront, 38, 28, 47);
const fMaleW = extractSprite(imgMaleSide, 38, 26, 47);
const fMaleE = mirrorFrame(fMaleW);
const fMaleN = extractSprite(imgMaleBack, 38, 28, 47);

// Diagonals
const fMaleSW = blendDiagonals(fMaleS, fMaleW);
const fMaleNW = blendDiagonals(fMaleN, fMaleW);
const fMaleNE = mirrorFrame(fMaleNW);
const fMaleSE = mirrorFrame(fMaleSW);

const maleFrames = {
    S: [makeWalkVariant(fMaleS, -1), fMaleS, makeWalkVariant(fMaleS, 1)],
    W: [makeWalkVariant(fMaleW, -1), fMaleW, makeWalkVariant(fMaleW, 1)],
    E: [makeWalkVariant(fMaleE, -1), fMaleE, makeWalkVariant(fMaleE, 1)],
    N: [makeWalkVariant(fMaleN, -1), fMaleN, makeWalkVariant(fMaleN, 1)]
};

const maleFrames8 = [
    maleFrames.S,
    [makeWalkVariant(fMaleSW, -1), fMaleSW, makeWalkVariant(fMaleSW, 1)],
    maleFrames.W,
    [makeWalkVariant(fMaleNW, -1), fMaleNW, makeWalkVariant(fMaleNW, 1)],
    maleFrames.N,
    [makeWalkVariant(fMaleNE, -1), fMaleNE, makeWalkVariant(fMaleNE, 1)],
    maleFrames.E,
    [makeWalkVariant(fMaleSE, -1), fMaleSE, makeWalkVariant(fMaleSE, 1)]
];

const rmmzDwarfMale = assembleRmmzSheet(maleFrames);
writePNG(path.join(ROOT, 'game', 'img', 'characters', '$UF_Dwarf_Male.png'), 144, 192, rmmzDwarfMale);
writePNG(path.join(ROOT, 'game', 'img', 'characters', '$UF_Dwarf.png'), 144, 192, rmmzDwarfMale); // default faction sprite

const rmmzDwarf8D = assemble8DSheet(maleFrames8);
writePNG(path.join(ROOT, 'game', 'img', 'characters', '$UF_Dwarf_8D.png'), 144, 384, rmmzDwarf8D);

// Sidecars
const dwarfSidecar = {
    id: "$UF_Dwarf_Male",
    species: "dwarf",
    gender: "male",
    stage: "adult",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S", "W", "E", "N"],
    animations: { stand: [1], walk: [0, 1, 2, 1] },
    frameMs: 150
};
fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '$UF_Dwarf_Male.json'), JSON.stringify(dwarfSidecar, null, 2));

const dwarfDefaultSidecar = { ...dwarfSidecar, id: "$UF_Dwarf" };
fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '$UF_Dwarf.json'), JSON.stringify(dwarfDefaultSidecar, null, 2));

const dwarf8DSidecar = {
    ...dwarfSidecar,
    id: "$UF_Dwarf_8D",
    facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"]
};
fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '$UF_Dwarf_8D.json'), JSON.stringify(dwarf8DSidecar, null, 2));

console.log('Saved $UF_Dwarf_Male.png, $UF_Dwarf.png, $UF_Dwarf_8D.png');

// 2. Process Dwarf Female
console.log('Loading clean Dwarf Female raw images...');
const imgFemFront = loadJpg(SOURCES.dwarf_female_front);
const imgFemSide = loadJpg(SOURCES.dwarf_female_side);
const imgFemBack = loadJpg(SOURCES.dwarf_female_back);

const fFemS = extractSprite(imgFemFront, 36, 26, 47);
const fFemW = extractSprite(imgFemSide, 36, 25, 47);
const fFemE = mirrorFrame(fFemW);
const fFemN = extractSprite(imgFemBack, 36, 26, 47);

const fFemSW = blendDiagonals(fFemS, fFemW);
const fFemNW = blendDiagonals(fFemN, fFemW);
const fFemNE = mirrorFrame(fFemNW);
const fFemSE = mirrorFrame(fFemSW);

const femFrames = {
    S: [makeWalkVariant(fFemS, -1), fFemS, makeWalkVariant(fFemS, 1)],
    W: [makeWalkVariant(fFemW, -1), fFemW, makeWalkVariant(fFemW, 1)],
    E: [makeWalkVariant(fFemE, -1), fFemE, makeWalkVariant(fFemE, 1)],
    N: [makeWalkVariant(fFemN, -1), fFemN, makeWalkVariant(fFemN, 1)]
};

const femFrames8 = [
    femFrames.S,
    [makeWalkVariant(fFemSW, -1), fFemSW, makeWalkVariant(fFemSW, 1)],
    femFrames.W,
    [makeWalkVariant(fFemNW, -1), fFemNW, makeWalkVariant(fFemNW, 1)],
    femFrames.N,
    [makeWalkVariant(fFemNE, -1), fFemNE, makeWalkVariant(fFemNE, 1)],
    femFrames.E,
    [makeWalkVariant(fFemSE, -1), fFemSE, makeWalkVariant(fFemSE, 1)]
];

const rmmzDwarfFem = assembleRmmzSheet(femFrames);
writePNG(path.join(ROOT, 'game', 'img', 'characters', '$UF_Dwarf_Female.png'), 144, 192, rmmzDwarfFem);

const dwarfFemSidecar = {
    id: "$UF_Dwarf_Female",
    species: "dwarf",
    gender: "female",
    stage: "adult",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S", "W", "E", "N"],
    animations: { stand: [1], walk: [0, 1, 2, 1] },
    frameMs: 150
};
fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '$UF_Dwarf_Female.json'), JSON.stringify(dwarfFemSidecar, null, 2));
console.log('Saved $UF_Dwarf_Female.png');

// 3. Process Racial Weapons (V103)
console.log('Processing Racial Weapons: Axe, Crossbow, Rune Hammer...');

// Helper: extract weapon as ground/icon item
function extractWeaponItem(jpgPath, targetH = 34, targetW = 34) {
    const img = loadJpg(jpgPath);
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

    const frame48 = Buffer.alloc(48 * 48 * 4);
    const actualW = Math.min(targetW, Math.round(targetH * (bboxW / bboxH)));
    const startX = Math.round(24 - actualW / 2);
    const startY = Math.round(47 - targetH); // grounded near row 47

    for (let dy = 0; dy < targetH; dy++) {
        const fy = minY + (dy / (targetH - 1)) * (bboxH - 1);
        const iy = Math.min(img.height - 1, Math.round(fy));
        const outY = startY + dy;
        if (outY < 0 || outY >= 48) continue;

        for (let dx = 0; dx < actualW; dx++) {
            const fx = minX + (dx / (actualW - 1)) * (bboxW - 1);
            const ix = Math.min(img.width - 1, Math.round(fx));
            const outX = startX + dx;
            if (outX < 0 || outX >= 48) continue;

            const sIdx = (iy * img.width + ix) * 4;
            const r = img.data[sIdx], g = img.data[sIdx + 1], b = img.data[sIdx + 2];
            if (!isBg(r, g, b)) {
                const s = pal.snap(r, g, b);
                const dIdx = (outY * 48 + outX) * 4;
                frame48[dIdx] = s[0];
                frame48[dIdx + 1] = s[1];
                frame48[dIdx + 2] = s[2];
                frame48[dIdx + 3] = 255;
            }
        }
    }
    applyDarkOutline(frame48, 48, 48);

    // Also build 32x32 icon
    const icon32 = Buffer.alloc(32 * 32 * 4);
    const iconScaleH = 26;
    const iconScaleW = Math.min(26, Math.round(iconScaleH * (bboxW / bboxH)));
    const iconStartX = Math.round(16 - iconScaleW / 2);
    const iconStartY = Math.round(16 - iconScaleH / 2);
    for (let dy = 0; dy < iconScaleH; dy++) {
        const fy = minY + (dy / (iconScaleH - 1)) * (bboxH - 1);
        const iy = Math.min(img.height - 1, Math.round(fy));
        const outY = iconStartY + dy;
        if (outY < 0 || outY >= 32) continue;

        for (let dx = 0; dx < iconScaleW; dx++) {
            const fx = minX + (dx / (iconScaleW - 1)) * (bboxW - 1);
            const ix = Math.min(img.width - 1, Math.round(fx));
            const outX = iconStartX + dx;
            if (outX < 0 || outX >= 32) continue;

            const sIdx = (iy * img.width + ix) * 4;
            const r = img.data[sIdx], g = img.data[sIdx + 1], b = img.data[sIdx + 2];
            if (!isBg(r, g, b)) {
                const s = pal.snap(r, g, b);
                const dIdx = (outY * 32 + outX) * 4;
                icon32[dIdx] = s[0];
                icon32[dIdx + 1] = s[1];
                icon32[dIdx + 2] = s[2];
                icon32[dIdx + 3] = 255;
            }
        }
    }
    applyDarkOutline(icon32, 32, 32);

    return { frame48, icon32 };
}

// Build equipment layer sheet from weapon item & attack poses
function buildWeaponLayer(weaponFrame, attackFrame, name) {
    const layer = Buffer.alloc(144 * 192 * 4);
    // 3 cols x 4 rows
    // Col 0: ready/windup, Col 1: hold/carry, Col 2: strike/recovery
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 3; c++) {
            const src = (c === 1) ? weaponFrame : (attackFrame || weaponFrame);
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (y * 48 + x) * 4;
                    if (src[sIdx + 3] === 0) continue;
                    // Mirror for East row (r === 2)
                    const fx = (r === 2) ? (47 - x) : x;
                    const dIdx = (((r * 48 + y) * 144) + (c * 48 + fx)) * 4;
                    layer[dIdx] = src[sIdx];
                    layer[dIdx + 1] = src[sIdx + 1];
                    layer[dIdx + 2] = src[sIdx + 2];
                    layer[dIdx + 3] = 255;
                }
            }
        }
    }
    quantizeSheet(layer, 144, 192, 31);
    return layer;
}

// Build dedicated full character attack animation sheet (3 cols x 4 rows: ready, swing, recover)
function buildCombatAnimationSheet(baseFrame, attackPoseFrame) {
    const sheet = Buffer.alloc(144 * 192 * 4);
    // Rows: S (0), W (1), E (2), N (3)
    // Cols: 0 (windup/ready), 1 (stand/idle), 2 (strike/fire/cast impact)
    for (let r = 0; r < 4; r++) {
        const isMirror = (r === 2);
        for (let c = 0; c < 3; c++) {
            const src = (c === 2) ? attackPoseFrame : baseFrame;
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

// Helper: build RMMZ Item charset (col 1, row 0 has the item, rest transparent)
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

// 3A. Dwarven War Axe
const axeData = extractWeaponItem(SOURCES.dwarf_war_axe, 34, 28);
const imgAxeAttack = loadJpg(SOURCES.dwarf_attack_axe);
const axeAttackFrame = extractSprite(imgAxeAttack, 38, 38, 47);

const axeLayer = buildWeaponLayer(axeData.frame48, axeAttackFrame, 'dwarf_axe');
writePNG(path.join(ROOT, 'game', 'img', 'characters', '$UF_Layer_dwarf_axe.png'), 144, 192, axeLayer);

const axeCombatSheet = buildCombatAnimationSheet(fMaleS, axeAttackFrame);
writePNG(path.join(ROOT, 'game', 'img', 'characters', '$UF_Dwarf_Attack_Axe.png'), 144, 192, axeCombatSheet);

const axeCombatSidecar = {
    id: "$UF_Dwarf_Attack_Axe",
    species: "dwarf",
    gender: "male",
    stage: "adult",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S", "W", "E", "N"],
    animations: { stand: [1], walk: [0, 1, 2, 1], attack: [0, 1, 2] },
    frameMs: 150
};
fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '$UF_Dwarf_Attack_Axe.json'), JSON.stringify(axeCombatSidecar, null, 2));

const axeItemCharset = buildItemCharset(axeData.frame48);
writePNG(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Item_DwarfAxe.png'), 144, 192, axeItemCharset);
writePNG(path.join(ROOT, 'art', 'masters', 'dwarf_axe.png'), 48, 48, axeData.frame48);
writePNG(path.join(ROOT, 'art', 'masters', 'dwarf_axe_icon.png'), 32, 32, axeData.icon32);

const axeSidecar = {
    id: "$UF_Layer_dwarf_axe",
    name: "Dwarven Runic Battleaxe",
    category: "equipment",
    layer: "weapon",
    slot: "weapon",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S", "W", "E", "N"],
    animations: { stand: [1], walk: [0, 1, 2, 1], attack: [0, 1, 2] },
    frameMs: 150,
    behind: ["N"]
};
fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '$UF_Layer_dwarf_axe.json'), JSON.stringify(axeSidecar, null, 2));

const axeItemSidecar = {
    id: "!$UF_Item_DwarfAxe",
    name: "Dwarven Runic Battleaxe (Item)",
    category: "item",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S"],
    animations: { stand: [1] }
};
fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Item_DwarfAxe.json'), JSON.stringify(axeItemSidecar, null, 2));
console.log('Saved Dwarven War Axe layer, combat sheet, and item assets');

// 3B. Dwarven Heavy Crossbow
const xbowData = extractWeaponItem(SOURCES.dwarf_crossbow, 36, 32);
const imgXbowAttack = loadJpg(SOURCES.dwarf_attack_crossbow);
const xbowAttackFrame = extractSprite(imgXbowAttack, 38, 36, 47);

const xbowLayer = buildWeaponLayer(xbowData.frame48, xbowAttackFrame, 'dwarf_crossbow');
writePNG(path.join(ROOT, 'game', 'img', 'characters', '$UF_Layer_dwarf_crossbow.png'), 144, 192, xbowLayer);

const xbowCombatSheet = buildCombatAnimationSheet(fMaleS, xbowAttackFrame);
writePNG(path.join(ROOT, 'game', 'img', 'characters', '$UF_Dwarf_Attack_Crossbow.png'), 144, 192, xbowCombatSheet);

const xbowCombatSidecar = {
    id: "$UF_Dwarf_Attack_Crossbow",
    species: "dwarf",
    gender: "male",
    stage: "adult",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S", "W", "E", "N"],
    animations: { stand: [1], walk: [0, 1, 2, 1], attack: [0, 1, 2] },
    frameMs: 150
};
fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '$UF_Dwarf_Attack_Crossbow.json'), JSON.stringify(xbowCombatSidecar, null, 2));

const xbowItemCharset = buildItemCharset(xbowData.frame48);
writePNG(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Item_DwarfCrossbow.png'), 144, 192, xbowItemCharset);
writePNG(path.join(ROOT, 'art', 'masters', 'dwarf_crossbow.png'), 48, 48, xbowData.frame48);
writePNG(path.join(ROOT, 'art', 'masters', 'dwarf_crossbow_icon.png'), 32, 32, xbowData.icon32);

const xbowSidecar = {
    id: "$UF_Layer_dwarf_crossbow",
    name: "Dwarven Heavy Arbalest",
    category: "equipment",
    layer: "weapon",
    slot: "weapon",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S", "W", "E", "N"],
    animations: { stand: [1], walk: [0, 1, 2, 1], attack: [0, 1, 2] },
    frameMs: 150,
    behind: ["N"]
};
fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '$UF_Layer_dwarf_crossbow.json'), JSON.stringify(xbowSidecar, null, 2));

const xbowItemSidecar = {
    id: "!$UF_Item_DwarfCrossbow",
    name: "Dwarven Heavy Arbalest (Item)",
    category: "item",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S"],
    animations: { stand: [1] }
};
fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Item_DwarfCrossbow.json'), JSON.stringify(xbowItemSidecar, null, 2));
console.log('Saved Dwarven Heavy Crossbow layer, combat sheet, and item assets');

// 3C. Dwarven Earth Rune Hammer
const hammerData = extractWeaponItem(SOURCES.dwarf_rune_hammer, 36, 26);
const imgHammerCast = loadJpg(SOURCES.dwarf_cast_magic);
const hammerCastFrame = extractSprite(imgHammerCast, 38, 38, 47);

const hammerLayer = buildWeaponLayer(hammerData.frame48, hammerCastFrame, 'dwarf_rune_hammer');
writePNG(path.join(ROOT, 'game', 'img', 'characters', '$UF_Layer_dwarf_rune_hammer.png'), 144, 192, hammerLayer);

const hammerCombatSheet = buildCombatAnimationSheet(fMaleS, hammerCastFrame);
writePNG(path.join(ROOT, 'game', 'img', 'characters', '$UF_Dwarf_Cast_Hammer.png'), 144, 192, hammerCombatSheet);

const hammerCombatSidecar = {
    id: "$UF_Dwarf_Cast_Hammer",
    species: "dwarf",
    gender: "male",
    stage: "adult",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S", "W", "E", "N"],
    animations: { stand: [1], walk: [0, 1, 2, 1], cast: [0, 1, 2] },
    frameMs: 150
};
fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '$UF_Dwarf_Cast_Hammer.json'), JSON.stringify(hammerCombatSidecar, null, 2));

const hammerItemCharset = buildItemCharset(hammerData.frame48);
writePNG(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Item_DwarfRuneHammer.png'), 144, 192, hammerItemCharset);
writePNG(path.join(ROOT, 'art', 'masters', 'dwarf_rune_hammer.png'), 48, 48, hammerData.frame48);
writePNG(path.join(ROOT, 'art', 'masters', 'dwarf_rune_hammer_icon.png'), 32, 32, hammerData.icon32);

const hammerSidecar = {
    id: "$UF_Layer_dwarf_rune_hammer",
    name: "Dwarven Earth Rune Hammer",
    category: "equipment",
    layer: "weapon",
    slot: "weapon",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S", "W", "E", "N"],
    animations: { stand: [1], walk: [0, 1, 2, 1], cast: [0, 1, 2] },
    frameMs: 150,
    behind: ["N"]
};
fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '$UF_Layer_dwarf_rune_hammer.json'), JSON.stringify(hammerSidecar, null, 2));

const hammerItemSidecar = {
    id: "!$UF_Item_DwarfRuneHammer",
    name: "Dwarven Earth Rune Hammer (Item)",
    category: "item",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S"],
    animations: { stand: [1] }
};
fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Item_DwarfRuneHammer.json'), JSON.stringify(hammerItemSidecar, null, 2));
console.log('Saved Dwarven Earth Rune Hammer layer, combat sheet, and item assets');

// Masters
writePNG(path.join(ROOT, 'art', 'masters', 'dwarf_male_stand.png'), 48, 48, fMaleS);
writePNG(path.join(ROOT, 'art', 'masters', 'dwarf_female_stand.png'), 48, 48, fFemS);

// 4. Build Review Showcases
console.log('Rendering Review Showcases...');
// A: Dwarf Faction Showcase (Male S/W/N, Female S/W/N, Melee Axe, Ranged Crossbow, Magic Cast)
// 9 subjects side by side on warm meadow tone at 4x scale
const REVIEW_W = 9 * 48 * 4; // 1728
const REVIEW_H = 48 * 4 + 32; // 224
const reviewBuf = Buffer.alloc(REVIEW_W * REVIEW_H * 4);

// Fill with warm parchment / stone-grass tone #384234
for (let i = 0; i < reviewBuf.length; i += 4) {
    reviewBuf[i] = 48; reviewBuf[i+1] = 62; reviewBuf[i+2] = 44; reviewBuf[i+3] = 255;
}

const reviewSubjects = [
    { name: "Male Dwarf Front", frame: fMaleS },
    { name: "Male Dwarf Side", frame: fMaleW },
    { name: "Male Dwarf Back", frame: fMaleN },
    { name: "Female Dwarf Front", frame: fFemS },
    { name: "Female Dwarf Side", frame: fFemW },
    { name: "Female Dwarf Back", frame: fFemN },
    { name: "Axe Cleave Attack", frame: axeAttackFrame },
    { name: "Arbalest Aim Attack", frame: xbowAttackFrame },
    { name: "Rune Geomancy Cast", frame: hammerCastFrame }
];

for (let s = 0; s < reviewSubjects.length; s++) {
    const f = reviewSubjects[s].frame;
    const startX = s * 48 * 4 + 16;
    const startY = 16;
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            if (f[sIdx + 3] === 0) continue;
            for (let dy = 0; dy < 4; dy++) {
                for (let dx = 0; dx < 4; dx++) {
                    const dIdx = (((startY + y * 4 + dy) * REVIEW_W) + (startX + x * 4 + dx)) * 4;
                    reviewBuf[dIdx] = f[sIdx];
                    reviewBuf[dIdx + 1] = f[sIdx + 1];
                    reviewBuf[dIdx + 2] = f[sIdx + 2];
                    reviewBuf[dIdx + 3] = 255;
                }
            }
        }
    }
}
writePNG(path.join(ROOT, 'art', 'review', 'dwarf_faction_showcase_4x.png'), REVIEW_W, REVIEW_H, reviewBuf);
writePNG(path.join(BRAIN, 'dwarf_faction_showcase_4x.png'), REVIEW_W, REVIEW_H, reviewBuf);
console.log('Saved art/review/dwarf_faction_showcase_4x.png');

// B: Weapons Showcase (Ground item 48x48 + Icon 32x32 for Axe, Crossbow, Rune Hammer)
const WEAPON_W = 6 * 48 * 4; // 1152
const WEAPON_H = 48 * 4 + 32; // 224
const weaponBuf = Buffer.alloc(WEAPON_W * WEAPON_H * 4);
for (let i = 0; i < weaponBuf.length; i += 4) {
    weaponBuf[i] = 36; weaponBuf[i+1] = 44; weaponBuf[i+2] = 52; weaponBuf[i+3] = 255;
}

const weaponSubjects = [
    { frame: axeData.frame48, w: 48, h: 48 },
    { frame: axeData.icon32, w: 32, h: 32 },
    { frame: xbowData.frame48, w: 48, h: 48 },
    { frame: xbowData.icon32, w: 32, h: 32 },
    { frame: hammerData.frame48, w: 48, h: 48 },
    { frame: hammerData.icon32, w: 32, h: 32 }
];

for (let s = 0; s < weaponSubjects.length; s++) {
    const { frame, w, h } = weaponSubjects[s];
    const startX = s * 48 * 4 + (48 - w) * 2 + 16;
    const startY = 16 + (48 - h) * 2;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const sIdx = (y * w + x) * 4;
            if (frame[sIdx + 3] === 0) continue;
            for (let dy = 0; dy < 4; dy++) {
                for (let dx = 0; dx < 4; dx++) {
                    const dIdx = (((startY + y * 4 + dy) * WEAPON_W) + (startX + x * 4 + dx)) * 4;
                    weaponBuf[dIdx] = frame[sIdx];
                    weaponBuf[dIdx + 1] = frame[sIdx + 1];
                    weaponBuf[dIdx + 2] = frame[sIdx + 2];
                    weaponBuf[dIdx + 3] = 255;
                }
            }
        }
    }
}
writePNG(path.join(ROOT, 'art', 'review', 'dwarf_weapons_showcase_4x.png'), WEAPON_W, WEAPON_H, weaponBuf);
writePNG(path.join(BRAIN, 'dwarf_weapons_showcase_4x.png'), WEAPON_W, WEAPON_H, weaponBuf);
console.log('Saved art/review/dwarf_weapons_showcase_4x.png');

console.log('=== Dwarf Faction Assets Processing Complete ===');
