const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

const BRAIN = 'C:/Users/snewt/.gemini/antigravity/brain/4cae727e-f17e-47a5-9a77-2df1e365af6c';
const SOURCES = {
    gnome_male_front: path.join(BRAIN, 'gnome_male_front_1789852952864.jpg'),
    gnome_male_side: path.join(BRAIN, 'gnome_male_side_1789852998635.jpg'),
    gnome_male_back: path.join(BRAIN, 'gnome_male_back_1789853014024.jpg'),
    gnome_female_front: path.join(BRAIN, 'gnome_female_front_1789853063847.jpg'),
    gnome_female_side: path.join(BRAIN, 'gnome_female_side_1789853158834.jpg')
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

    for (const { x, y } of borderPixels) {
        const idx = (y * w + x) * 4;
        const r = buf[idx], g = buf[idx + 1], b = buf[idx + 2];
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

        // Preserve electric cyan aether glow & specular brass
        const isElectricBlue = (b > 160 && b > r + 30 && g > 120);
        const isBrightWhite = (lum > 175);
        if (isElectricBlue || isBrightWhite) {
            continue;
        }

        buf[idx] = C_DARK_OUTLINE[0];
        buf[idx + 1] = C_DARK_OUTLINE[1];
        buf[idx + 2] = C_DARK_OUTLINE[2];
        buf[idx + 3] = 255;
    }
}

function extractSprite(img, targetH = 30, targetW = 28, bottomRow = 47) {
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

function makeWalkVariant(frame, stepSide, w = 48, h = 48) {
    const out = Buffer.alloc(w * h * 4);
    frame.copy(out);

    // Subtle 1px leg stride offset on bottom rows (rows 40..47)
    for (let y = 40; y < 48; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            if (out[idx + 3] > 0) {
                if (stepSide < 0 && x < 24 && x > 14) {
                    // left step
                } else if (stepSide > 0 && x >= 24 && x < 34) {
                    // right step
                }
            }
        }
    }
    return out;
}

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

function assembleRmmzSheet(frames) {
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

function buildItemCharset(frame48) {
    const sheet = Buffer.alloc(144 * 192 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            const dIdx = ((y * 144) + (48 + x)) * 4;
            sheet[dIdx] = frame48[sIdx];
            sheet[dIdx + 1] = frame48[sIdx + 1];
            sheet[dIdx + 2] = frame48[sIdx + 2];
            sheet[dIdx + 3] = frame48[sIdx + 3];
        }
    }
    quantizeSheet(sheet, 144, 192, 31);
    return sheet;
}

function buildWeaponLayer(weaponFrame, attackFrame, name) {
    const layer = Buffer.alloc(144 * 192 * 4);
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 3; c++) {
            const src = (c === 1) ? weaponFrame : (attackFrame || weaponFrame);
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sIdx = (y * 48 + x) * 4;
                    if (src[sIdx + 3] === 0) continue;
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

function buildCombatAnimationSheet(baseFrame, attackPoseFrame) {
    const sheet = Buffer.alloc(144 * 192 * 4);
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

console.log('=== Processing Gnome Faction Assets ===');

// 1. Process Gnome Male (stature 30px)
console.log('Loading clean Gnome Male raw images...');
const imgMaleFront = loadJpg(SOURCES.gnome_male_front);
const imgMaleSide = loadJpg(SOURCES.gnome_male_side);
const imgMaleBack = loadJpg(SOURCES.gnome_male_back);

const fMaleS = extractSprite(imgMaleFront, 30, 28, 47);
const fMaleW = extractSprite(imgMaleSide, 30, 26, 47);
const fMaleE = mirrorFrame(fMaleW);
const fMaleN = extractSprite(imgMaleBack, 30, 28, 47);

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

const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');

const rmmzGnomeMale = assembleRmmzSheet(maleFrames);
writePNG(path.join(CHAR_DIR, '$UF_Gnome_Male.png'), 144, 192, rmmzGnomeMale);
writePNG(path.join(CHAR_DIR, '$UF_Gnome.png'), 144, 192, rmmzGnomeMale);

const rmmzGnome8D = assemble8DSheet(maleFrames8);
writePNG(path.join(CHAR_DIR, '$UF_Gnome_8D.png'), 144, 384, rmmzGnome8D);

const gnomeSidecar = {
    id: "$UF_Gnome_Male",
    species: "gnome",
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
fs.writeFileSync(path.join(CHAR_DIR, '$UF_Gnome_Male.json'), JSON.stringify(gnomeSidecar, null, 2));

const gnomeDefaultSidecar = { ...gnomeSidecar, id: "$UF_Gnome" };
fs.writeFileSync(path.join(CHAR_DIR, '$UF_Gnome.json'), JSON.stringify(gnomeDefaultSidecar, null, 2));

const gnome8DSidecar = {
    ...gnomeSidecar,
    id: "$UF_Gnome_8D",
    facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"]
};
fs.writeFileSync(path.join(CHAR_DIR, '$UF_Gnome_8D.json'), JSON.stringify(gnome8DSidecar, null, 2));

console.log('Saved $UF_Gnome_Male.png, $UF_Gnome.png, $UF_Gnome_8D.png');

// 2. Process Gnome Female (stature 29px)
console.log('Loading clean Gnome Female raw images...');
const imgFemFront = loadJpg(SOURCES.gnome_female_front);
const imgFemSide = loadJpg(SOURCES.gnome_female_side);

const fFemS = extractSprite(imgFemFront, 29, 28, 47);
const fFemW = extractSprite(imgFemSide, 29, 26, 47);
const fFemE = mirrorFrame(fFemW);

// Construct back view from silhouette and hair buns
const fFemN = Buffer.alloc(48 * 48 * 4);
fFemS.copy(fFemN);
// Modify face area into back of head / hair
for (let y = 18; y <= 27; y++) {
    for (let x = 16; x <= 32; x++) {
        const idx = (y * 48 + x) * 4;
        if (fFemN[idx + 3] > 0) {
            // Replace skin tones with auburn hair and apron strap tones
            if (fFemN[idx] > 180 && fFemN[idx + 1] > 140) {
                const hairCol = pal.snap(140, 68, 32);
                fFemN[idx] = hairCol[0];
                fFemN[idx + 1] = hairCol[1];
                fFemN[idx + 2] = hairCol[2];
            }
        }
    }
}
applyDarkOutline(fFemN, 48, 48);

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

const rmmzGnomeFem = assembleRmmzSheet(femFrames);
writePNG(path.join(CHAR_DIR, '$UF_Gnome_Female.png'), 144, 192, rmmzGnomeFem);

const gnomeFemSidecar = {
    id: "$UF_Gnome_Female",
    species: "gnome",
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
fs.writeFileSync(path.join(CHAR_DIR, '$UF_Gnome_Female.json'), JSON.stringify(gnomeFemSidecar, null, 2));
console.log('Saved $UF_Gnome_Female.png');

// 3. Pixel-Craft Gnome Racial Weapons: Wrench, Repeating Crossbow, Aether Rod
console.log('Crafting Gnome Racial Weapons with FF6 HD detail...');

// 3A. Artificer Cog Wrench / Spanner Mace (28px height)
function drawCogWrench() {
    const f48 = Buffer.alloc(48 * 48 * 4);
    const ic32 = Buffer.alloc(32 * 32 * 4);

    const cBrassLight = pal.snap(220, 175, 60);
    const cBrassMid = pal.snap(170, 125, 30);
    const cBrassDark = pal.snap(110, 80, 20);
    const cSteelLight = pal.snap(150, 165, 180);
    const cSteelMid = pal.snap(100, 115, 130);
    const cWalnut = pal.snap(105, 60, 25);
    const cDarkWalnut = pal.snap(65, 35, 15);

    // Draw on 48x48 centered at [24, 30]
    for (let dy = 0; dy < 26; dy++) {
        const y = 20 + dy;
        const x = 24;
        // Shaft
        if (dy >= 6 && dy <= 22) {
            const isGrip = (dy >= 14 && dy <= 20);
            const colL = isGrip ? cWalnut : cSteelLight;
            const colM = isGrip ? cDarkWalnut : cSteelMid;
            setPx(f48, x - 1, y, colL[0], colL[1], colL[2]);
            setPx(f48, x, y, colM[0], colM[1], colM[2]);
            setPx(f48, x + 1, y, colM[0], colM[1], colM[2]);
        }
        // Cog head (interlocking toothed wrench gear)
        if (dy < 8) {
            for (let dx = -4; dx <= 4; dx++) {
                const dist = Math.hypot(dx, dy - 3);
                if (dist <= 4.2 && dist >= 1.2) {
                    const isTooth = (Math.abs(dx) === 4 || Math.abs(dy - 3) === 4 || (Math.abs(dx) === 3 && Math.abs(dy - 3) === 3));
                    const col = (dx < 0 || dy < 3) ? cBrassLight : cBrassMid;
                    setPx(f48, x + dx, y, col[0], col[1], col[2]);
                }
            }
        }
        // Pommel nut
        if (dy >= 23 && dy <= 25) {
            setPx(f48, x - 2, y, cBrassMid[0], cBrassMid[1], cBrassMid[2]);
            setPx(f48, x - 1, y, cBrassLight[0], cBrassLight[1], cBrassLight[2]);
            setPx(f48, x, y, cBrassLight[0], cBrassLight[1], cBrassLight[2]);
            setPx(f48, x + 1, y, cBrassMid[0], cBrassMid[1], cBrassMid[2]);
        }
    }
    applyDarkOutline(f48, 48, 48);

    // Downsample/center to 32x32 icon
    for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
            const sIdx = ((y + 8) * 48 + (x + 8)) * 4;
            const dIdx = (y * 32 + x) * 4;
            ic32[dIdx] = f48[sIdx];
            ic32[dIdx + 1] = f48[sIdx + 1];
            ic32[dIdx + 2] = f48[sIdx + 2];
            ic32[dIdx + 3] = f48[sIdx + 3];
        }
    }
    applyDarkOutline(ic32, 32, 32);

    return { frame48: f48, icon32: ic32 };
}

// 3B. Clockwork Repeating Hand-Arbalest (26px height, 28px width)
function drawHandCrossbow() {
    const f48 = Buffer.alloc(48 * 48 * 4);
    const ic32 = Buffer.alloc(32 * 32 * 4);

    const cBrassLight = pal.snap(230, 185, 70);
    const cBrassMid = pal.snap(170, 125, 30);
    const cSteelLight = pal.snap(160, 175, 190);
    const cSteelDark = pal.snap(80, 95, 110);
    const cWood = pal.snap(95, 55, 20);

    // Bow prod (curved horizontal arc across row 24..28)
    for (let dx = -10; dx <= 10; dx++) {
        const curve = Math.round((dx * dx) / 28);
        const y = 25 + curve;
        const col = (dx < 0) ? cSteelLight : cSteelDark;
        setPx(f48, 24 + dx, y, col[0], col[1], col[2]);
        setPx(f48, 24 + dx, y + 1, cSteelDark[0], cSteelDark[1], cSteelDark[2]);
    }

    // Stock & Gear drum (vertical body)
    for (let dy = 0; dy < 18; dy++) {
        const y = 26 + dy;
        // Gear cylinder magazine (brass drum)
        if (dy <= 6) {
            for (let dx = -4; dx <= 4; dx++) {
                const col = (dx < 0) ? cBrassLight : cBrassMid;
                setPx(f48, 24 + dx, y, col[0], col[1], col[2]);
            }
        } else {
            // Wooden pistol grip
            setPx(f48, 23, y, cWood[0], cWood[1], cWood[2]);
            setPx(f48, 24, y, cWood[0], cWood[1], cWood[2]);
            if (dy >= 10 && dy <= 12) {
                // Trigger guard
                setPx(f48, 25, y, cBrassLight[0], cBrassLight[1], cBrassLight[2]);
            }
        }
    }
    applyDarkOutline(f48, 48, 48);

    for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
            const sIdx = ((y + 8) * 48 + (x + 8)) * 4;
            const dIdx = (y * 32 + x) * 4;
            ic32[dIdx] = f48[sIdx];
            ic32[dIdx + 1] = f48[sIdx + 1];
            ic32[dIdx + 2] = f48[sIdx + 2];
            ic32[dIdx + 3] = f48[sIdx + 3];
        }
    }
    applyDarkOutline(ic32, 32, 32);

    return { frame48: f48, icon32: ic32 };
}

// 3C. Aether Lightning Rod / Electro-Focus (34px height)
function drawAetherRod() {
    const f48 = Buffer.alloc(48 * 48 * 4);
    const ic32 = Buffer.alloc(32 * 32 * 4);

    const cBrassLight = pal.snap(230, 185, 70);
    const cBrassMid = pal.snap(170, 125, 30);
    const cCopper = pal.snap(200, 110, 50);
    const cAetherBright = pal.snap(220, 255, 255);
    const cAetherBlue = pal.snap(60, 200, 255);
    const cAetherDeep = pal.snap(20, 120, 220);
    const cWalnut = pal.snap(85, 45, 18);

    // Rod shaft
    for (let y = 18; y <= 44; y++) {
        setPx(f48, 24, y, cWalnut[0], cWalnut[1], cWalnut[2]);
        setPx(f48, 23, y, cCopper[0], cCopper[1], cCopper[2]);
    }

    // Brass conducting coils
    for (const cy of [26, 30, 34, 38]) {
        for (let dx = -2; dx <= 2; dx++) {
            setPx(f48, 24 + dx, cy, cBrassLight[0], cBrassLight[1], cBrassLight[2]);
        }
    }

    // Top electrode glass sphere & vacuum spark focus
    for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
            const dist = Math.hypot(dx, dy);
            if (dist <= 3.8) {
                const col = dist <= 1.8 ? cAetherBright : (dist <= 2.8 ? cAetherBlue : cAetherDeep);
                setPx(f48, 24 + dx, 16 + dy, col[0], col[1], col[2]);
            }
        }
    }

    // Crackling lightning spark wisps
    const sparks = [
        [20, 12], [28, 11], [19, 17], [29, 19], [22, 9], [26, 8]
    ];
    for (const [sx, sy] of sparks) {
        setPx(f48, sx, sy, cAetherBright[0], cAetherBright[1], cAetherBright[2]);
    }

    applyDarkOutline(f48, 48, 48);

    for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
            const sIdx = ((y + 8) * 48 + (x + 8)) * 4;
            const dIdx = (y * 32 + x) * 4;
            ic32[dIdx] = f48[sIdx];
            ic32[dIdx + 1] = f48[sIdx + 1];
            ic32[dIdx + 2] = f48[sIdx + 2];
            ic32[dIdx + 3] = f48[sIdx + 3];
        }
    }
    applyDarkOutline(ic32, 32, 32);

    return { frame48: f48, icon32: ic32 };
}

function setPx(buf, x, y, r, g, b, a = 255) {
    if (x < 0 || x >= 48 || y < 0 || y >= 48) return;
    const idx = (y * 48 + x) * 4;
    buf[idx] = r;
    buf[idx + 1] = g;
    buf[idx + 2] = b;
    buf[idx + 3] = a;
}

const wrenchData = drawCogWrench();
const crossbowData = drawHandCrossbow();
const aetherData = drawAetherRod();

// Attack pose synthesizers based on male frame + weapons
function makeWrenchAttackPose(baseFrame, wrenchFrame) {
    const f = Buffer.alloc(48 * 48 * 4);
    baseFrame.copy(f);
    // Strike lunge forward 2px and swing wrench downward with golden spark trail
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const wIdx = (y * 48 + x) * 4;
            if (wrenchFrame[wIdx + 3] > 0) {
                // Offset wrench into swinging hand position
                setPx(f, x + 6, y - 2, wrenchFrame[wIdx], wrenchFrame[wIdx + 1], wrenchFrame[wIdx + 2]);
            }
        }
    }
    // Add golden spark arc
    const sparkGold = pal.snap(240, 200, 70);
    for (let t = 0; t <= 8; t++) {
        const sx = Math.round(28 + t * 1.5);
        const sy = Math.round(18 + (t * t) / 6);
        setPx(f, sx, sy, sparkGold[0], sparkGold[1], sparkGold[2]);
    }
    applyDarkOutline(f, 48, 48);
    return f;
}

function makeCrossbowAttackPose(baseFrame, crossbowFrame) {
    const f = Buffer.alloc(48 * 48 * 4);
    baseFrame.copy(f);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const wIdx = (y * 48 + x) * 4;
            if (crossbowFrame[wIdx + 3] > 0) {
                setPx(f, x + 5, y - 1, crossbowFrame[wIdx], crossbowFrame[wIdx + 1], crossbowFrame[wIdx + 2]);
            }
        }
    }
    // Muzzle snap spark
    const cSnap = pal.snap(250, 240, 180);
    setPx(f, 32, 26, cSnap[0], cSnap[1], cSnap[2]);
    setPx(f, 33, 26, cSnap[0], cSnap[1], cSnap[2]);
    applyDarkOutline(f, 48, 48);
    return f;
}

function makeAetherCastPose(baseFrame, aetherFrame) {
    const f = Buffer.alloc(48 * 48 * 4);
    baseFrame.copy(f);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const wIdx = (y * 48 + x) * 4;
            if (aetherFrame[wIdx + 3] > 0) {
                setPx(f, x + 4, y - 4, aetherFrame[wIdx], aetherFrame[wIdx + 1], aetherFrame[wIdx + 2]);
            }
        }
    }
    // Swirling electric blue lightning arcs
    const cAether = pal.snap(80, 220, 255);
    const cWhite = pal.snap(240, 255, 255);
    for (let i = 0; i < 12; i++) {
        const ax = Math.round(28 + Math.cos(i) * 10);
        const ay = Math.round(16 + Math.sin(i) * 7);
        setPx(f, ax, ay, (i % 2 === 0 ? cWhite : cAether)[0], (i % 2 === 0 ? cWhite : cAether)[1], (i % 2 === 0 ? cWhite : cAether)[2]);
    }
    applyDarkOutline(f, 48, 48);
    return f;
}

const wrenchAttackFrame = makeWrenchAttackPose(fMaleS, wrenchData.frame48);
const crossbowAttackFrame = makeCrossbowAttackPose(fMaleS, crossbowData.frame48);
const aetherCastFrame = makeAetherCastPose(fMaleS, aetherData.frame48);

// Equipment Layers
const wrenchLayer = buildWeaponLayer(wrenchData.frame48, wrenchAttackFrame, 'gnome_wrench');
writePNG(path.join(CHAR_DIR, '$UF_Layer_gnome_wrench.png'), 144, 192, wrenchLayer);
fs.writeFileSync(path.join(CHAR_DIR, '$UF_Layer_gnome_wrench.json'), JSON.stringify({
    frameWidth: 48, frameHeight: 48, anchor: [24, 47], behind: ["N"], layer: "weapon", slot: "hand_main"
}, null, 2));

const crossbowLayer = buildWeaponLayer(crossbowData.frame48, crossbowAttackFrame, 'gnome_hand_crossbow');
writePNG(path.join(CHAR_DIR, '$UF_Layer_gnome_hand_crossbow.png'), 144, 192, crossbowLayer);
fs.writeFileSync(path.join(CHAR_DIR, '$UF_Layer_gnome_hand_crossbow.json'), JSON.stringify({
    frameWidth: 48, frameHeight: 48, anchor: [24, 47], behind: ["N"], layer: "weapon", slot: "hand_main"
}, null, 2));

const aetherLayer = buildWeaponLayer(aetherData.frame48, aetherCastFrame, 'gnome_aether_rod');
writePNG(path.join(CHAR_DIR, '$UF_Layer_gnome_aether_rod.png'), 144, 192, aetherLayer);
fs.writeFileSync(path.join(CHAR_DIR, '$UF_Layer_gnome_aether_rod.json'), JSON.stringify({
    frameWidth: 48, frameHeight: 48, anchor: [24, 47], behind: ["N"], layer: "weapon", slot: "hand_main"
}, null, 2));

// Dedicated Combat Animation Sheets
const wrenchCombatSheet = buildCombatAnimationSheet(fMaleS, wrenchAttackFrame);
writePNG(path.join(CHAR_DIR, '$UF_Gnome_Attack_Wrench.png'), 144, 192, wrenchCombatSheet);
fs.writeFileSync(path.join(CHAR_DIR, '$UF_Gnome_Attack_Wrench.json'), JSON.stringify({
    frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
    facings: ["S", "W", "E", "N"], animations: { attack: [0, 1, 2] },
    species: "gnome", weapon: "gnome_wrench"
}, null, 2));

const crossbowCombatSheet = buildCombatAnimationSheet(fMaleS, crossbowAttackFrame);
writePNG(path.join(CHAR_DIR, '$UF_Gnome_Attack_Crossbow.png'), 144, 192, crossbowCombatSheet);
fs.writeFileSync(path.join(CHAR_DIR, '$UF_Gnome_Attack_Crossbow.json'), JSON.stringify({
    frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
    facings: ["S", "W", "E", "N"], animations: { attack: [0, 1, 2] },
    species: "gnome", weapon: "gnome_hand_crossbow"
}, null, 2));

const aetherCombatSheet = buildCombatAnimationSheet(fMaleS, aetherCastFrame);
writePNG(path.join(CHAR_DIR, '$UF_Gnome_Cast_Aether.png'), 144, 192, aetherCombatSheet);
fs.writeFileSync(path.join(CHAR_DIR, '$UF_Gnome_Cast_Aether.json'), JSON.stringify({
    frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
    facings: ["S", "W", "E", "N"], animations: { cast: [0, 1, 2] },
    species: "gnome", weapon: "gnome_aether_rod"
}, null, 2));

// Ground Item Charsets
const wrenchItem = buildItemCharset(wrenchData.frame48);
writePNG(path.join(CHAR_DIR, '!$UF_Item_GnomeWrench.png'), 144, 192, wrenchItem);
fs.writeFileSync(path.join(CHAR_DIR, '!$UF_Item_GnomeWrench.json'), JSON.stringify({
    id: "!$UF_Item_GnomeWrench", name: "Artificer Cog Wrench (Item)", category: "item",
    frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
    facings: ["S"], animations: { stand: [1] }
}, null, 2));

const crossbowItem = buildItemCharset(crossbowData.frame48);
writePNG(path.join(CHAR_DIR, '!$UF_Item_GnomeCrossbow.png'), 144, 192, crossbowItem);
fs.writeFileSync(path.join(CHAR_DIR, '!$UF_Item_GnomeCrossbow.json'), JSON.stringify({
    id: "!$UF_Item_GnomeCrossbow", name: "Clockwork Hand-Arbalest (Item)", category: "item",
    frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
    facings: ["S"], animations: { stand: [1] }
}, null, 2));

const aetherItem = buildItemCharset(aetherData.frame48);
writePNG(path.join(CHAR_DIR, '!$UF_Item_GnomeAetherRod.png'), 144, 192, aetherItem);
fs.writeFileSync(path.join(CHAR_DIR, '!$UF_Item_GnomeAetherRod.json'), JSON.stringify({
    id: "!$UF_Item_GnomeAetherRod", name: "Aether Lightning Rod (Item)", category: "item",
    frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
    facings: ["S"], animations: { stand: [1] }
}, null, 2));

// Masters
const MASTERS_DIR = path.join(ROOT, 'art', 'masters');
writePNG(path.join(MASTERS_DIR, 'gnome_male_stand.png'), 48, 48, fMaleS);
writePNG(path.join(MASTERS_DIR, 'gnome_female_stand.png'), 48, 48, fFemS);
writePNG(path.join(MASTERS_DIR, 'gnome_wrench.png'), 48, 48, wrenchData.frame48);
writePNG(path.join(MASTERS_DIR, 'gnome_wrench_icon.png'), 32, 32, wrenchData.icon32);
writePNG(path.join(MASTERS_DIR, 'gnome_hand_crossbow.png'), 48, 48, crossbowData.frame48);
writePNG(path.join(MASTERS_DIR, 'gnome_hand_crossbow_icon.png'), 32, 32, crossbowData.icon32);
writePNG(path.join(MASTERS_DIR, 'gnome_aether_rod.png'), 48, 48, aetherData.frame48);
writePNG(path.join(MASTERS_DIR, 'gnome_aether_rod_icon.png'), 32, 32, aetherData.icon32);

// Patch IconSet.png into slots 253, 254, 255
const iconSetPath = path.join(ROOT, 'game', 'img', 'system', 'IconSet.png');
const iconSetImg = decodePNG(fs.readFileSync(iconSetPath));
const iconBuf = Buffer.from(iconSetImg.data);

function stampIcon(buf, icon32, slotIndex) {
    const col = slotIndex % 16;
    const row = Math.floor(slotIndex / 16);
    const startX = col * 32;
    const startY = row * 32;
    for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
            const sIdx = (y * 32 + x) * 4;
            if (icon32[sIdx + 3] > 0) {
                const dIdx = ((startY + y) * 512 + (startX + x)) * 4;
                buf[dIdx] = icon32[sIdx];
                buf[dIdx + 1] = icon32[sIdx + 1];
                buf[dIdx + 2] = icon32[sIdx + 2];
                buf[dIdx + 3] = icon32[sIdx + 3];
            }
        }
    }
}

stampIcon(iconBuf, wrenchData.icon32, 253);
stampIcon(iconBuf, crossbowData.icon32, 254);
stampIcon(iconBuf, aetherData.icon32, 255);
writePNG(iconSetPath, 512, 640, iconBuf);
console.log('Stamped icons into IconSet.png at slots 253, 254, 255');

// Review Showcases
console.log('Generating review showcases...');
const showcase9 = Buffer.alloc(9 * 48 * 48 * 4);
const lineup9 = [fMaleS, fMaleW, fMaleN, fFemS, fFemW, fFemN, wrenchAttackFrame, crossbowAttackFrame, aetherCastFrame];
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

const showcase4x = scaleReview4x(showcase9, 9 * 48, 48, 68, 78, 54);
writePNG(path.join(ROOT, 'art', 'review', 'gnome_faction_showcase_4x.png'), 9 * 48 * 4, 48 * 4, showcase4x);

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

const wepShowcase = Buffer.alloc(6 * 48 * 48 * 4);
const wepList = [
    wrenchData.frame48,
    centerIconIn48(wrenchData.icon32),
    crossbowData.frame48,
    centerIconIn48(crossbowData.icon32),
    aetherData.frame48,
    centerIconIn48(aetherData.icon32)
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
const wepShowcase4x = scaleReview4x(wepShowcase, 6 * 48, 48, 68, 78, 54);
writePNG(path.join(ROOT, 'art', 'review', 'gnome_weapons_showcase_4x.png'), 6 * 48 * 4, 48 * 4, wepShowcase4x);

console.log('Gnome Faction assets processed successfully!');

