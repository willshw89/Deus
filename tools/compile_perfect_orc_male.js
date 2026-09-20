'use strict';

/**
 * tools/compile_perfect_orc_male.js
 *
 * Compiles the 7 dedicated 12-sprite action suites for Adult Male Orc
 * from authentic Google Nano Banana Pro raw generations.
 *
 * Each sprite is cleanly extracted from its true bounding box,
 * scaled to target height (~44px, Serious Chibi ~3.0 heads tall),
 * grounded at native baseline y = 47, snapped to art/palette/uf.hex (<= 31 colors),
 * and given dark ink outlines for crisp 16-bit readability.
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const {
    mirrorFrame,
    assemble12SpriteSheet,
    saveSheetAndSidecar
} = require('./build_pro_human_male');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'raw');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

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
    const seen = new Set();
    for (const line of text.split(/\r?\n/)) {
        const rgb = parseHex(line);
        if (!rgb) continue;
        const k = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
        if (!seen.has(k)) {
            seen.add(k);
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
const C_DARK_OUTLINE = pal.snap(24, 16, 10);

function isMagenta(r, g, b) {
    // Standard magenta chroma key
    if (r > 110 && b > 110 && g < 100) return true;
    // Darker anti-aliased magenta edge shades
    if (r > 50 && b > 50 && g < 45 && Math.abs(r - b) < 25) return true;
    // Cyan chroma key
    if (r < 70 && g > 130 && b > 130) return true;
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
                const isGlow = (r > 200 && g > 220 && b > 240) || (r > 80 && g > 185 && b > 225) || (r > 180 && g < 60 && b < 60);
                if (!isGlow) {
                    buf[idx]     = C_DARK_OUTLINE[0];
                    buf[idx + 1] = C_DARK_OUTLINE[1];
                    buf[idx + 2] = C_DARK_OUTLINE[2];
                }
            }
        }
    }
}

function extractSpriteFromBox(img, minX, maxX, minY, maxY, targetH = 44, maxW = 44) {
    // Find true opaque pixel bounds inside the box
    let sMinX = Infinity, sMaxX = -Infinity, sMinY = Infinity, sMaxY = -Infinity;
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const idx = (y * img.width + x) * 4;
            const r = img.data[idx], g = img.data[idx+1], b = img.data[idx+2];
            if (!isMagenta(r, g, b)) {
                if (x < sMinX) sMinX = x;
                if (x > sMaxX) sMaxX = x;
                if (y < sMinY) sMinY = y;
                if (y > sMaxY) sMaxY = y;
            }
        }
    }

    if (sMinX === Infinity) return Buffer.alloc(48 * 48 * 4);

    const origW = sMaxX - sMinX + 1;
    const origH = sMaxY - sMinY + 1;
    let scale = targetH / origH;
    if (origW * scale > maxW) {
        scale = maxW / origW;
    }
    const outW = Math.round(origW * scale);
    const outH = Math.round(origH * scale);

    const out = Buffer.alloc(48 * 48 * 4);
    const dstBaseline = 47;
    const dstY0 = dstBaseline - outH + 1;
    const dstX0 = Math.round(24 - outW / 2);

    for (let dy = 0; dy < outH; dy++) {
        const ty = dstY0 + dy;
        if (ty < 0 || ty >= 48) continue;
        for (let dx = 0; dx < outW; dx++) {
            const tx = dstX0 + dx;
            if (tx < 0 || tx >= 48) continue;

            const srcMinX = sMinX + Math.floor(dx / scale);
            const srcMaxX = sMinX + Math.floor((dx + 1) / scale);
            const srcMinY = sMinY + Math.floor(dy / scale);
            const srcMaxY = sMinY + Math.floor((dy + 1) / scale);

            let rSum = 0, gSum = 0, bSum = 0, count = 0;
            for (let sy = srcMinY; sy <= srcMaxY; sy++) {
                if (sy < minY || sy > maxY) continue;
                for (let sx = srcMinX; sx <= srcMaxX; sx++) {
                    if (sx < minX || sx > maxX) continue;
                    const idx = (sy * img.width + sx) * 4;
                    const r = img.data[idx], g = img.data[idx+1], b = img.data[idx+2];
                    if (!isMagenta(r, g, b)) {
                        rSum += r; gSum += g; bSum += b; count++;
                    }
                }
            }
            if (count > 0) {
                const avgR = Math.round(rSum / count);
                const avgG = Math.round(gSum / count);
                const avgB = Math.round(bSum / count);
                const snapped = pal.snap(avgR, avgG, avgB);
                const dIdx = (ty * 48 + tx) * 4;
                out[dIdx]   = snapped[0];
                out[dIdx+1] = snapped[1];
                out[dIdx+2] = snapped[2];
                out[dIdx+3] = 255;
            }
        }
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

function buildOrcMale() {
    console.log('=== Building Adult Male Orc (Serious Chibi ~44px) ===\n');

    // 1. WALK (orc_male_walk_12_raw.png: 1408x768)
    // Row 0 (S): [358..522], [622..786], [886..1050]
    // Row 1 (W): Col 0 (137..251), Col 1 (390..488), Col 2 (649..755)
    // Row 2 (N): Col 1 (361..524), Col 2 (622..786), Col 3 (884..1047)
    console.log('1. Walk...');
    const imgWalk = decodePNG(fs.readFileSync(path.join(RAW_DIR, 'orc_male_walk_12_raw.png')));
    const wS = [
        extractSpriteFromBox(imgWalk, 350, 530, 0, 255, 44),
        extractSpriteFromBox(imgWalk, 615, 795, 0, 255, 44),
        extractSpriteFromBox(imgWalk, 880, 1060, 0, 255, 44)
    ];
    const wW = [
        extractSpriteFromBox(imgWalk, 125, 260, 255, 510, 44), // Stride A
        extractSpriteFromBox(imgWalk, 380, 500, 255, 510, 44), // Stand
        extractSpriteFromBox(imgWalk, 640, 765, 255, 510, 44)  // Stride B
    ];
    const wE = wW.map(mirrorFrame);
    const wN = [
        extractSpriteFromBox(imgWalk, 350, 530, 510, 768, 44),
        extractSpriteFromBox(imgWalk, 615, 795, 510, 768, 44),
        extractSpriteFromBox(imgWalk, 875, 1055, 510, 768, 44)
    ];
    const walkSheet = assemble12SpriteSheet({ S: wS, W: wW, E: wE, N: wN });
    saveSheetAndSidecar(walkSheet, 'Orc_Male_Walk', 'Walk', { walk: [0, 1, 2, 1], stand: [1] });
    saveSheetAndSidecar(walkSheet, 'Orc_Male', 'Walk', { walk: [0, 1, 2, 1], stand: [1] });
    saveSheetAndSidecar(walkSheet, 'Orc', 'Walk', { walk: [0, 1, 2, 1], stand: [1] });

    // 2. HAUL (orc_male_haul_12_raw.png: 1408x768)
    // Row 0 (S): [349..525], [611..787], [872..1048]
    // Row 1 (W): Col 0 (112..251), Col 1 (390..525), Col 2 (649..790)
    // Row 2 (N): Col 1 (352..531), Col 2 (614..792), Col 3 (878..1056)
    console.log('2. Haul...');
    const imgHaul = decodePNG(fs.readFileSync(path.join(RAW_DIR, 'orc_male_haul_12_raw.png')));
    const hS = [
        extractSpriteFromBox(imgHaul, 340, 530, 0, 255, 44),
        extractSpriteFromBox(imgHaul, 605, 795, 0, 255, 44),
        extractSpriteFromBox(imgHaul, 865, 1055, 0, 255, 44)
    ];
    const hW = [
        extractSpriteFromBox(imgHaul, 105, 260, 255, 510, 44),
        extractSpriteFromBox(imgHaul, 380, 535, 255, 510, 44),
        extractSpriteFromBox(imgHaul, 640, 800, 255, 510, 44)
    ];
    const hE = hW.map(mirrorFrame);
    const hN = [
        extractSpriteFromBox(imgHaul, 345, 535, 510, 768, 44),
        extractSpriteFromBox(imgHaul, 605, 800, 510, 768, 44),
        extractSpriteFromBox(imgHaul, 870, 1065, 510, 768, 44)
    ];
    const haulSheet = assemble12SpriteSheet({ S: hS, W: hW, E: hE, N: hN });
    saveSheetAndSidecar(haulSheet, 'Orc_Male_Haul', 'Haul', { haul: [0, 1, 2, 1], carry: [1], stand: [1] });

    // 3. ATTACK (orc_male_attack_12_raw.png: 1408x768)
    // Row 0 (S): [355..531], [640..827], [885..1047]
    // Row 1 (W): Col 0 (64..251), Col 1 (390..540), Col 2 (648..836)
    // Row 2 (N): Col 1 (361..524), Col 2 (581..783), Col 3 (884..1047)
    console.log('3. Attack (Cleaver)...');
    const imgAtk = decodePNG(fs.readFileSync(path.join(RAW_DIR, 'orc_male_attack_12_raw.png')));
    const aS = [
        extractSpriteFromBox(imgAtk, 345, 540, 0, 255, 44),
        extractSpriteFromBox(imgAtk, 630, 835, 0, 255, 44),
        extractSpriteFromBox(imgAtk, 875, 1055, 0, 255, 44)
    ];
    const aW = [
        extractSpriteFromBox(imgAtk, 55, 260, 255, 510, 44),
        extractSpriteFromBox(imgAtk, 380, 550, 255, 510, 44),
        extractSpriteFromBox(imgAtk, 640, 845, 255, 510, 44)
    ];
    const aE = aW.map(mirrorFrame);
    const aN = [
        extractSpriteFromBox(imgAtk, 350, 530, 510, 768, 44),
        extractSpriteFromBox(imgAtk, 570, 790, 510, 768, 44),
        extractSpriteFromBox(imgAtk, 875, 1055, 510, 768, 44)
    ];
    const atkSheet = assemble12SpriteSheet({ S: aS, W: aW, E: aE, N: aN });
    saveSheetAndSidecar(atkSheet, 'Orc_Male_Attack', 'Attack', { attack: [0, 1, 2], ready: [0] });
    saveSheetAndSidecar(atkSheet, 'Orc_Attack_Cleaver', 'Attack', { attack: [0, 1, 2], ready: [0] });

    // 4. BOW (orc_male_bow_12_raw.png: 1200x896)
    // 4 rows of 3:
    // Row 0: S: [198..363], [522..703], [827..1015]
    // Row 1: W: [203..364], [518..698], [833..1013]
    // Row 2: E: [184..363], [518..697], [836..1019]
    // Row 3: N: [170..351], [522..699], [847..1032]
    console.log('4. Bow (War Bow)...');
    const imgBow = decodePNG(fs.readFileSync(path.join(RAW_DIR, 'orc_male_bow_12_raw.png')));
    const bS = [
        extractSpriteFromBox(imgBow, 190, 370, 15, 230, 44),
        extractSpriteFromBox(imgBow, 515, 710, 15, 230, 44),
        extractSpriteFromBox(imgBow, 820, 1025, 15, 230, 44)
    ];
    const bW = [
        extractSpriteFromBox(imgBow, 195, 370, 235, 450, 44),
        extractSpriteFromBox(imgBow, 510, 705, 235, 450, 44),
        extractSpriteFromBox(imgBow, 825, 1020, 235, 450, 44)
    ];
    const bE = [
        extractSpriteFromBox(imgBow, 175, 370, 455, 675, 44),
        extractSpriteFromBox(imgBow, 510, 705, 455, 675, 44),
        extractSpriteFromBox(imgBow, 825, 1025, 455, 675, 44)
    ];
    const bN = [
        extractSpriteFromBox(imgBow, 160, 360, 675, 895, 44),
        extractSpriteFromBox(imgBow, 515, 705, 675, 895, 44),
        extractSpriteFromBox(imgBow, 840, 1040, 675, 895, 44)
    ];
    const bowSheet = assemble12SpriteSheet({ S: bS, W: bW, E: bE, N: bN });
    saveSheetAndSidecar(bowSheet, 'Orc_Male_Bow', 'Bow', { shoot: [0, 1, 2], aim: [1], ready: [0] });
    saveSheetAndSidecar(bowSheet, 'Orc_Attack_Bow', 'Bow', { shoot: [0, 1, 2], aim: [1], ready: [0] });

    // 5. MAGIC (orc_male_magic_12_raw.png: 1408x768)
    // Row 0 (S): Col 1 (350..533), Col 2 (628..780), Col 3 (884..1050)
    // Row 1 (W): Col 0 (104..251), Col 1 (390..538), Col 2 (649..798)
    // Row 2 (N): Col 1 (371..512), Col 2 (619..789), Col 3 (894..1036)
    console.log('5. Magic (Blood Totem)...');
    const imgMag = decodePNG(fs.readFileSync(path.join(RAW_DIR, 'orc_male_magic_12_raw.png')));
    const mS = [
        extractSpriteFromBox(imgMag, 340, 540, 0, 255, 44),
        extractSpriteFromBox(imgMag, 620, 790, 0, 255, 44),
        extractSpriteFromBox(imgMag, 875, 1060, 0, 255, 44)
    ];
    const mW = [
        extractSpriteFromBox(imgMag, 95, 260, 255, 510, 44),
        extractSpriteFromBox(imgMag, 380, 545, 255, 510, 44),
        extractSpriteFromBox(imgMag, 640, 805, 255, 510, 44)
    ];
    const mE = mW.map(mirrorFrame);
    const mN = [
        extractSpriteFromBox(imgMag, 360, 520, 510, 768, 44),
        extractSpriteFromBox(imgMag, 610, 795, 510, 768, 44),
        extractSpriteFromBox(imgMag, 885, 1045, 510, 768, 44)
    ];
    const magSheet = assemble12SpriteSheet({ S: mS, W: mW, E: mE, N: mN });
    saveSheetAndSidecar(magSheet, 'Orc_Male_Magic', 'Magic', { cast: [0, 1, 2, 1], chant: [0] });
    saveSheetAndSidecar(magSheet, 'Orc_Cast_Totem', 'Magic', { cast: [0, 1, 2, 1], chant: [0] });

    // 6. WORK (orc_male_work_12_raw.png: 1024x1024)
    // Row 0: 4 sprites: [43..225], [289..490], [537..740], [780..982]
    // Row 1: 3 sprites: [83..210], [336..572], [742..957]
    // Row 2: 3 sprites: [54..182], [337..579], [750..957]
    // Row 3: 3 sprites: [56..220], [388..584], [763..955]
    console.log('6. Work (Blacksmith/Craftsman)...');
    const imgWrk = decodePNG(fs.readFileSync(path.join(RAW_DIR, 'orc_male_work_12_raw.png')));
    const wkS = [
        extractSpriteFromBox(imgWrk, 35, 235, 10, 255, 44),
        extractSpriteFromBox(imgWrk, 280, 500, 10, 255, 44),
        extractSpriteFromBox(imgWrk, 530, 745, 10, 255, 44)
    ];
    const wkW = [
        extractSpriteFromBox(imgWrk, 75, 220, 260, 515, 44),
        extractSpriteFromBox(imgWrk, 330, 580, 260, 515, 44),
        extractSpriteFromBox(imgWrk, 735, 965, 260, 515, 44)
    ];
    const wkE = [
        extractSpriteFromBox(imgWrk, 45, 190, 515, 770, 44),
        extractSpriteFromBox(imgWrk, 330, 585, 515, 770, 44),
        extractSpriteFromBox(imgWrk, 740, 965, 515, 770, 44)
    ];
    const wkN = [
        extractSpriteFromBox(imgWrk, 45, 230, 775, 1024, 44),
        extractSpriteFromBox(imgWrk, 380, 590, 775, 1024, 44),
        extractSpriteFromBox(imgWrk, 755, 965, 775, 1024, 44)
    ];
    const wrkSheet = assemble12SpriteSheet({ S: wkS, W: wkW, E: wkE, N: wkN });
    saveSheetAndSidecar(wrkSheet, 'Orc_Male_Work', 'Work', { work: [0, 1, 2, 1], craft: [1] });

    // 7. DOWNED (orc_male_downed_12_raw.png: 1200x896)
    // Row 0 (S): [230..389], [559..706], [827..1094]
    // Row 1 (W): [258..395], [562..746], [843..1107]
    // Row 2 (E): [275..412], [567..753], [850..1114]
    // Row 3 (N): Col 1 (288..430), Col 2 (569..752), Col 3 (853..1118)
    console.log('7. Downed...');
    const imgDwn = decodePNG(fs.readFileSync(path.join(RAW_DIR, 'orc_male_downed_12_raw.png')));
    const dS = [
        extractSpriteFromBox(imgDwn, 220, 400, 25, 225, 44),
        extractSpriteFromBox(imgDwn, 550, 715, 25, 225, 44),
        extractSpriteFromBox(imgDwn, 820, 1100, 25, 225, 44, 44) // prone corpse
    ];
    const dW = [
        extractSpriteFromBox(imgDwn, 250, 405, 245, 450, 44),
        extractSpriteFromBox(imgDwn, 555, 755, 245, 450, 44),
        extractSpriteFromBox(imgDwn, 835, 1115, 245, 450, 44, 44)
    ];
    const dE = [
        extractSpriteFromBox(imgDwn, 265, 420, 470, 675, 44),
        extractSpriteFromBox(imgDwn, 560, 760, 470, 675, 44),
        extractSpriteFromBox(imgDwn, 840, 1120, 470, 675, 44, 44)
    ];
    const dN = [
        extractSpriteFromBox(imgDwn, 280, 440, 680, 900, 44),
        extractSpriteFromBox(imgDwn, 560, 760, 680, 900, 44),
        extractSpriteFromBox(imgDwn, 845, 1125, 680, 900, 44, 44)
    ];
    const dwnSheet = assemble12SpriteSheet({ S: dS, W: dW, E: dE, N: dN });
    saveSheetAndSidecar(dwnSheet, 'Orc_Male_Downed', 'Downed', { downed: [0, 1, 2], corpse: [2] });

    // Assemble 7-action showcase
    console.log('\nAssembling 7-action master showcase...');
    const showcaseW = 7 * 144;
    const showcaseH = 192;
    const showcaseBuf = Buffer.alloc(showcaseW * showcaseH * 4);
    const sheets = [walkSheet, haulSheet, atkSheet, bowSheet, magSheet, wrkSheet, dwnSheet];

    for (let i = 0; i < sheets.length; i++) {
        const sBuf = sheets[i];
        const xOffset = i * 144;
        for (let y = 0; y < 192; y++) {
            for (let x = 0; x < 144; x++) {
                const sIdx = (y * 144 + x) * 4;
                const dIdx = (y * showcaseW + (xOffset + x)) * 4;
                showcaseBuf[dIdx]   = sBuf[sIdx];
                showcaseBuf[dIdx+1] = sBuf[sIdx+1];
                showcaseBuf[dIdx+2] = sBuf[sIdx+2];
                showcaseBuf[dIdx+3] = sBuf[sIdx+3];
            }
        }
    }

    fs.mkdirSync(REVIEW_DIR, { recursive: true });
    const reviewPath = path.join(REVIEW_DIR, 'orc_male_all_7_actions_12_sprites.png');
    writePNG(reviewPath, showcaseW, showcaseH, showcaseBuf);
    console.log(`Saved 7-action showcase to: ${reviewPath}`);
}

buildOrcMale();
