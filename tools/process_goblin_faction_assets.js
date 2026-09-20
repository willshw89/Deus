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
    goblin_male_front: path.join(BRAIN, 'goblin_male_front_1789852318460.jpg'),
    goblin_male_side: path.join(BRAIN, 'goblin_male_side_1789852373138.jpg'),
    goblin_male_back: path.join(BRAIN, 'goblin_male_back_1789852388627.jpg'),
    goblin_female_front: path.join(BRAIN, 'goblin_female_front_1789852410797.jpg'),
    goblin_female_side: path.join(BRAIN, 'goblin_female_side_1789852423258.jpg'),
    goblin_female_back: path.join(BRAIN, 'goblin_female_back_1789852436743.jpg'),
    goblin_shiv: path.join(BRAIN, 'goblin_shiv_1789852449478.jpg'),
    goblin_blowgun: path.join(BRAIN, 'goblin_blowgun_1789852462605.jpg'),
    goblin_hex_wand: path.join(BRAIN, 'goblin_hex_wand_1789852577672.jpg'),
    goblin_attack_shiv: path.join(BRAIN, 'goblin_attack_shiv_1789852592374.jpg'),
    goblin_attack_blowgun: path.join(BRAIN, 'goblin_attack_blowgun_1789852604250.jpg'),
    goblin_cast_hex: path.join(BRAIN, 'goblin_cast_hex_1789852623603.jpg')
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

        // Preserve toxic venom green glow & white sparks
        const isToxicGreen = (g > 160 && g > r + 30 && g > b + 30);
        const isBrightWhite = (lum > 175);
        if (isToxicGreen || isBrightWhite) {
            continue;
        }

        buf[idx] = C_DARK_OUTLINE[0];
        buf[idx + 1] = C_DARK_OUTLINE[1];
        buf[idx + 2] = C_DARK_OUTLINE[2];
        buf[idx + 3] = 255;
    }
}

function extractSprite(img, targetH = 28, targetW = 26, bottomRow = 47) {
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

function extractWeaponItem(jpgPath, targetH = 26, targetW = 26) {
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
    const startY = Math.round(47 - targetH);

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

    // Build 32x32 icon
    const icon32 = Buffer.alloc(32 * 32 * 4);
    const iconScaleH = 24;
    const iconScaleW = Math.min(24, Math.round(iconScaleH * (bboxW / bboxH)));
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

console.log('=== Processing Goblin Faction Assets ===');

// 1. Process Goblin Male (stature 28px)
console.log('Loading clean Goblin Male raw images...');
const imgMaleFront = loadJpg(SOURCES.goblin_male_front);
const imgMaleSide = loadJpg(SOURCES.goblin_male_side);
const imgMaleBack = loadJpg(SOURCES.goblin_male_back);

const fMaleS = extractSprite(imgMaleFront, 28, 28, 47);
const fMaleW = extractSprite(imgMaleSide, 28, 24, 47);
const fMaleE = mirrorFrame(fMaleW);
const fMaleN = extractSprite(imgMaleBack, 28, 28, 47);

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

const rmmzGoblinMale = assembleRmmzSheet(maleFrames);
writePNG(path.join(CHAR_DIR, '$UF_Goblin_Male.png'), 144, 192, rmmzGoblinMale);
writePNG(path.join(CHAR_DIR, '$UF_Goblin.png'), 144, 192, rmmzGoblinMale);

const rmmzGoblin8D = assemble8DSheet(maleFrames8);
writePNG(path.join(CHAR_DIR, '$UF_Goblin_8D.png'), 144, 384, rmmzGoblin8D);

const goblinSidecar = {
    id: "$UF_Goblin_Male",
    species: "goblin",
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
fs.writeFileSync(path.join(CHAR_DIR, '$UF_Goblin_Male.json'), JSON.stringify(goblinSidecar, null, 2));

const goblinDefaultSidecar = { ...goblinSidecar, id: "$UF_Goblin" };
fs.writeFileSync(path.join(CHAR_DIR, '$UF_Goblin.json'), JSON.stringify(goblinDefaultSidecar, null, 2));

const goblin8DSidecar = {
    ...goblinSidecar,
    id: "$UF_Goblin_8D",
    facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"]
};
fs.writeFileSync(path.join(CHAR_DIR, '$UF_Goblin_8D.json'), JSON.stringify(goblin8DSidecar, null, 2));

console.log('Saved $UF_Goblin_Male.png, $UF_Goblin.png, $UF_Goblin_8D.png');

// 2. Process Goblin Female (stature 26px)
console.log('Loading clean Goblin Female raw images...');
const imgFemFront = loadJpg(SOURCES.goblin_female_front);
const imgFemSide = loadJpg(SOURCES.goblin_female_side);
const imgFemBack = loadJpg(SOURCES.goblin_female_back);

const fFemS = extractSprite(imgFemFront, 26, 26, 47);
const fFemW = extractSprite(imgFemSide, 26, 24, 47);
const fFemE = mirrorFrame(fFemW);
const fFemN = extractSprite(imgFemBack, 26, 26, 47);

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

const rmmzGoblinFem = assembleRmmzSheet(femFrames);
writePNG(path.join(CHAR_DIR, '$UF_Goblin_Female.png'), 144, 192, rmmzGoblinFem);

const goblinFemSidecar = {
    id: "$UF_Goblin_Female",
    species: "goblin",
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
fs.writeFileSync(path.join(CHAR_DIR, '$UF_Goblin_Female.json'), JSON.stringify(goblinFemSidecar, null, 2));
console.log('Saved $UF_Goblin_Female.png');

// 3. Process Racial Weapons: Shiv, Blowgun, Hex Wand
console.log('Processing Racial Weapons: Shiv, Blowgun, Hex Wand...');
const shivData = extractWeaponItem(SOURCES.goblin_shiv, 26, 26);
const blowgunData = extractWeaponItem(SOURCES.goblin_blowgun, 28, 24);
const wandData = extractWeaponItem(SOURCES.goblin_hex_wand, 32, 24);

// Attack poses
const imgShivAttack = loadJpg(SOURCES.goblin_attack_shiv);
const shivAttackFrame = extractSprite(imgShivAttack, 30, 36, 47);

const imgBlowgunAttack = loadJpg(SOURCES.goblin_attack_blowgun);
const blowgunAttackFrame = extractSprite(imgBlowgunAttack, 28, 32, 47);

const imgHexCast = loadJpg(SOURCES.goblin_cast_hex);
const hexCastFrame = extractSprite(imgHexCast, 36, 36, 47);

// Equipment Layers
const shivLayer = buildWeaponLayer(shivData.frame48, shivAttackFrame, 'goblin_shiv');
writePNG(path.join(CHAR_DIR, '$UF_Layer_goblin_shiv.png'), 144, 192, shivLayer);
fs.writeFileSync(path.join(CHAR_DIR, '$UF_Layer_goblin_shiv.json'), JSON.stringify({
    frameWidth: 48, frameHeight: 48, anchor: [24, 47], behind: ["N"], layer: "weapon", slot: "hand_main"
}, null, 2));

const blowgunLayer = buildWeaponLayer(blowgunData.frame48, blowgunAttackFrame, 'goblin_blowgun');
writePNG(path.join(CHAR_DIR, '$UF_Layer_goblin_blowgun.png'), 144, 192, blowgunLayer);
fs.writeFileSync(path.join(CHAR_DIR, '$UF_Layer_goblin_blowgun.json'), JSON.stringify({
    frameWidth: 48, frameHeight: 48, anchor: [24, 47], behind: ["N"], layer: "weapon", slot: "hand_both"
}, null, 2));

const wandLayer = buildWeaponLayer(wandData.frame48, hexCastFrame, 'goblin_hex_wand');
writePNG(path.join(CHAR_DIR, '$UF_Layer_goblin_hex_wand.png'), 144, 192, wandLayer);
fs.writeFileSync(path.join(CHAR_DIR, '$UF_Layer_goblin_hex_wand.json'), JSON.stringify({
    frameWidth: 48, frameHeight: 48, anchor: [24, 47], behind: ["N"], layer: "weapon", slot: "hand_main"
}, null, 2));

// Dedicated Combat Animation Sheets
const shivCombatSheet = buildCombatAnimationSheet(fMaleS, shivAttackFrame);
writePNG(path.join(CHAR_DIR, '$UF_Goblin_Attack_Shiv.png'), 144, 192, shivCombatSheet);
fs.writeFileSync(path.join(CHAR_DIR, '$UF_Goblin_Attack_Shiv.json'), JSON.stringify({
    frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
    facings: ["S", "W", "E", "N"], animations: { attack: [0, 1, 2] },
    species: "goblin", weapon: "goblin_shiv"
}, null, 2));

const blowgunCombatSheet = buildCombatAnimationSheet(fMaleS, blowgunAttackFrame);
writePNG(path.join(CHAR_DIR, '$UF_Goblin_Attack_Blowgun.png'), 144, 192, blowgunCombatSheet);
fs.writeFileSync(path.join(CHAR_DIR, '$UF_Goblin_Attack_Blowgun.json'), JSON.stringify({
    frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
    facings: ["S", "W", "E", "N"], animations: { attack: [0, 1, 2] },
    species: "goblin", weapon: "goblin_blowgun"
}, null, 2));

const hexCombatSheet = buildCombatAnimationSheet(fMaleS, hexCastFrame);
writePNG(path.join(CHAR_DIR, '$UF_Goblin_Cast_Hex.png'), 144, 192, hexCombatSheet);
fs.writeFileSync(path.join(CHAR_DIR, '$UF_Goblin_Cast_Hex.json'), JSON.stringify({
    frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
    facings: ["S", "W", "E", "N"], animations: { cast: [0, 1, 2] },
    species: "goblin", weapon: "goblin_hex_wand"
}, null, 2));

// Ground Item Charsets
const shivItem = buildItemCharset(shivData.frame48);
writePNG(path.join(CHAR_DIR, '!$UF_Item_GoblinShiv.png'), 144, 192, shivItem);
fs.writeFileSync(path.join(CHAR_DIR, '!$UF_Item_GoblinShiv.json'), JSON.stringify({
    id: "!$UF_Item_GoblinShiv", name: "Notched Scavenger Shiv (Item)", category: "item",
    frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
    facings: ["S"], animations: { stand: [1] }
}, null, 2));

const blowgunItem = buildItemCharset(blowgunData.frame48);
writePNG(path.join(CHAR_DIR, '!$UF_Item_GoblinBlowgun.png'), 144, 192, blowgunItem);
fs.writeFileSync(path.join(CHAR_DIR, '!$UF_Item_GoblinBlowgun.json'), JSON.stringify({
    id: "!$UF_Item_GoblinBlowgun", name: "Scavenger Blowgun (Item)", category: "item",
    frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
    facings: ["S"], animations: { stand: [1] }
}, null, 2));

const wandItem = buildItemCharset(wandData.frame48);
writePNG(path.join(CHAR_DIR, '!$UF_Item_GoblinHexWand.png'), 144, 192, wandItem);
fs.writeFileSync(path.join(CHAR_DIR, '!$UF_Item_GoblinHexWand.json'), JSON.stringify({
    id: "!$UF_Item_GoblinHexWand", name: "Hex Doctor Fetish Wand (Item)", category: "item",
    frameWidth: 48, frameHeight: 48, anchor: [24, 47], footprint: [1, 1],
    facings: ["S"], animations: { stand: [1] }
}, null, 2));

// Masters
const MASTERS_DIR = path.join(ROOT, 'art', 'masters');
writePNG(path.join(MASTERS_DIR, 'goblin_male_stand.png'), 48, 48, fMaleS);
writePNG(path.join(MASTERS_DIR, 'goblin_female_stand.png'), 48, 48, fFemS);
writePNG(path.join(MASTERS_DIR, 'goblin_shiv.png'), 48, 48, shivData.frame48);
writePNG(path.join(MASTERS_DIR, 'goblin_shiv_icon.png'), 32, 32, shivData.icon32);
writePNG(path.join(MASTERS_DIR, 'goblin_blowgun.png'), 48, 48, blowgunData.frame48);
writePNG(path.join(MASTERS_DIR, 'goblin_blowgun_icon.png'), 32, 32, blowgunData.icon32);
writePNG(path.join(MASTERS_DIR, 'goblin_hex_wand.png'), 48, 48, wandData.frame48);
writePNG(path.join(MASTERS_DIR, 'goblin_hex_wand_icon.png'), 32, 32, wandData.icon32);

// Patch IconSet.png with 32x32 icons into slots 250, 251, 252
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

stampIcon(iconBuf, shivData.icon32, 250);
stampIcon(iconBuf, blowgunData.icon32, 251);
stampIcon(iconBuf, wandData.icon32, 252);
writePNG(iconSetPath, 512, 640, iconBuf);
console.log('Stamped icons into IconSet.png at slots 250, 251, 252');

// Review Showcases
console.log('Generating review showcases...');
const showcase9 = Buffer.alloc(9 * 48 * 48 * 4);
const lineup9 = [fMaleS, fMaleW, fMaleN, fFemS, fFemW, fFemN, shivAttackFrame, blowgunAttackFrame, hexCastFrame];
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
writePNG(path.join(ROOT, 'art', 'review', 'goblin_faction_showcase_4x.png'), 9 * 48 * 4, 48 * 4, showcase4x);

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
    shivData.frame48,
    centerIconIn48(shivData.icon32),
    blowgunData.frame48,
    centerIconIn48(blowgunData.icon32),
    wandData.frame48,
    centerIconIn48(wandData.icon32)
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
writePNG(path.join(ROOT, 'art', 'review', 'goblin_weapons_showcase_4x.png'), 6 * 48 * 4, 48 * 4, wepShowcase4x);

console.log('Goblin Faction assets processed successfully!');

