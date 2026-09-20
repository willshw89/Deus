'use strict';

/**
 * tools/compile_all_42_dwarf_male_charsets.js
 *
 * Master compilation and verification tool for Adult Male Dwarf 42-Charset Suite
 * (6 Variations x 7 Actions: Walk, Haul, Attack, Bow, Magic, Work, Downed)
 * 100% generated via Google Nano Banana Pro (gemini-3-pro-image).
 *
 * Invariant stocky serious chibi proportions (~2.6 heads tall, ~36-37px height, grounded at y = 47).
 * Snapped to art/palette/uf.hex (<= 31 colors, 100% binary transparency).
 * Outputs to game/img/characters/$UF_Dwarf_Male_{1..6}_{Action}.png and .json sidecars.
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'raw');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

fs.mkdirSync(REVIEW_DIR, { recursive: true });
fs.mkdirSync(CHAR_DIR, { recursive: true });

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
    if (r > 165 && g < 85 && b > 165) return true;
    if (r > 80 && b > 70 && g < 65 && Math.abs(r - b) < 45) return true;
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
                const isGlow = (r > 200 && g > 220 && b > 240) || (r > 80 && g > 185 && b > 225);
                if (!isGlow) {
                    buf[idx]     = C_DARK_OUTLINE[0];
                    buf[idx + 1] = C_DARK_OUTLINE[1];
                    buf[idx + 2] = C_DARK_OUTLINE[2];
                }
            }
        }
    }
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

function extractGridBBoxes(rawImg, numCols = 6) {
    const cellW = rawImg.width / numCols;
    const cellH = rawImg.height / 3;
    const grid = [];
    const insetX = numCols === 8 ? 16 : 4;
    const insetY = 8;

    for (let r = 0; r < 3; r++) {
        const row = [];
        const y0 = Math.round(r * cellH);
        const y1 = Math.round((r + 1) * cellH) - 1;
        for (let c = 0; c < numCols; c++) {
            const x0 = Math.round(c * cellW);
            const x1 = Math.round((c + 1) * cellW) - 1;
            let minX = x1, maxX = x0, minY = y1, maxY = y0, count = 0;
            for (let y = y0 + insetY; y <= y1 - insetY; y++) {
                for (let x = x0 + insetX; x <= x1 - insetX; x++) {
                    const idx = (y * rawImg.width + x) * 4;
                    if (!isMagenta(rawImg.data[idx], rawImg.data[idx + 1], rawImg.data[idx + 2])) {
                        count++;
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }
            row.push({ x0: minX, x1: maxX, y0: minY, y1: maxY, count });
        }
        grid.push(row);
    }
    return grid;
}

function extractUniformSprite(rawImg, bbox, scale, numCols = 6) {
    const out = Buffer.alloc(48 * 48 * 4);
    const rawFootY = bbox.y1;
    const rawCenterX = (bbox.x0 + bbox.x1) / 2;
    const cellW = Math.round(rawImg.width / numCols);
    const cellH = Math.round(rawImg.height / 3);
    const insetX = numCols === 8 ? 16 : 4;

    for (let outY = 0; outY < 48; outY++) {
        const dyFromBase = 47 - outY;
        const rawY0 = Math.round(rawFootY - (dyFromBase + 1) / scale);
        const rawY1 = Math.round(rawFootY - dyFromBase / scale);

        if (rawY1 < bbox.y0 || rawY0 > bbox.y1 || rawY1 < 0 || rawY0 >= rawImg.height) continue;

        for (let outX = 0; outX < 48; outX++) {
            const dxFromCenter = outX - 24;
            const rawX0 = Math.round(rawCenterX + dxFromCenter / scale);
            const rawX1 = Math.round(rawCenterX + (dxFromCenter + 1) / scale);

            if (rawX1 < bbox.x0 || rawX0 > bbox.x1 || rawX1 < 0 || rawX0 >= rawImg.width) continue;

            let sumR = 0, sumG = 0, sumB = 0, count = 0;
            for (let ry = Math.max(bbox.y0, rawY0); ry <= Math.min(bbox.y1, rawY1); ry++) {
                const remY = ry % cellH;
                if (remY <= 3 || remY >= cellH - 3) continue; // ignore AI grid line
                for (let rx = Math.max(bbox.x0, rawX0); rx <= Math.min(bbox.x1, rawX1); rx++) {
                    const remX = rx % cellW;
                    if (remX <= insetX - 1 || remX >= cellW - insetX) continue; // ignore AI grid line
                    const idx = (ry * rawImg.width + rx) * 4;
                    const r = rawImg.data[idx], g = rawImg.data[idx + 1], b = rawImg.data[idx + 2];
                    if (!isMagenta(r, g, b)) {
                        sumR += r; sumG += g; sumB += b;
                        count++;
                    }
                }
            }

            if (count > 0) {
                const sn = pal.snap(Math.round(sumR / count), Math.round(sumG / count), Math.round(sumB / count));
                const dIdx = (outY * 48 + outX) * 4;
                out[dIdx]     = sn[0];
                out[dIdx + 1] = sn[1];
                out[dIdx + 2] = sn[2];
                out[dIdx + 3] = 255;
            }
        }
    }

    applyDarkOutline(out, 48, 48);
    return out;
}

function assemble12Charset(framesByFacing) {
    const buf = Buffer.alloc(144 * 192 * 4);
    const rows = [
        framesByFacing.S,
        framesByFacing.W,
        framesByFacing.E || framesByFacing.W.map(mirrorFrame),
        framesByFacing.N
    ];

    for (let r = 0; r < 4; r++) {
        const frameArr = rows[r];
        for (let c = 0; c < 3; c++) {
            const frame = frameArr[c];
            for (let py = 0; py < 48; py++) {
                for (let px = 0; px < 48; px++) {
                    const sIdx = (py * 48 + px) * 4;
                    const dIdx = ((r * 48 + py) * 144 + (c * 48 + px)) * 4;
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

function saveSheetAndSidecar(buf, baseName, actionTag, animations, varNum) {
    const pngPath = path.join(CHAR_DIR, `$UF_${baseName}.png`);
    fs.writeFileSync(pngPath, writePNG(buf, 144, 192));

    const sidecar = {
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ['S', 'W', 'E', 'N'],
        animations: animations,
        frameMs: 180,
        species: 'dwarf',
        stage: 'adult',
        gender: 'male',
        variation: varNum,
        action: actionTag,
        style: 'Serious Chibi (VISION V116)',
        generator: 'Google Nano Banana Pro (Rule 11, VISION V109)'
    };
    fs.writeFileSync(path.join(CHAR_DIR, `$UF_${baseName}.json`), JSON.stringify(sidecar, null, 2));
}

const VARIATION_CONFIGS = [
    {
        num: 1,
        name: 'Variation 1 (Pioneer Settler / Mountain Miner)',
        walkRaw: 'dwarf_male_walk_12_raw.png',
        haulRaw: 'dwarf_male_haul_12_raw.png',
        attackRaw: 'dwarf_male_attack_12_raw.png',
        bowRaw: 'dwarf_male_bow_12_raw.png',
        magicRaw: 'dwarf_male_magic_12_raw.png',
        workRaw: 'dwarf_male_work_12_raw.png',
        downedRaw: 'dwarf_male_downed_12_raw.png'
    },
    {
        num: 2,
        name: 'Variation 2 (Deep Runesmith / Stonecrafter)',
        walkRaw: 'dwarf_male_var2_pro_4d_walk.png',
        haulRaw: 'dwarf_male_var2_pro_4d_haul.png',
        attackRaw: 'dwarf_male_var2_pro_4d_attack.png',
        bowRaw: 'dwarf_male_var2_pro_4d_bow.png',
        magicRaw: 'dwarf_male_var2_pro_4d_magic.png',
        workRaw: 'dwarf_male_var2_pro_4d_work.png',
        downedRaw: 'dwarf_male_var2_pro_4d_downed.png'
    },
    {
        num: 3,
        name: 'Variation 3 (Ironbreaker / Citadel Heavy Guard)',
        walkRaw: 'dwarf_male_var3_pro_4d_walk.png',
        haulRaw: 'dwarf_male_var3_pro_4d_haul.png',
        attackRaw: 'dwarf_male_var3_pro_4d_attack.png',
        bowRaw: 'dwarf_male_var3_pro_4d_bow.png',
        magicRaw: 'dwarf_male_var3_pro_4d_magic.png',
        workRaw: 'dwarf_male_var3_pro_4d_work.png',
        downedRaw: 'dwarf_male_var3_pro_4d_downed.png'
    },
    {
        num: 4,
        name: 'Variation 4 (Tunnel Scout / Geologist)',
        walkRaw: 'dwarf_male_var4_pro_4d_walk.png',
        haulRaw: 'dwarf_male_var4_pro_4d_haul.png',
        attackRaw: 'dwarf_male_var4_pro_4d_attack.png',
        bowRaw: 'dwarf_male_var4_pro_4d_bow.png',
        magicRaw: 'dwarf_male_var4_pro_4d_magic.png',
        workRaw: 'dwarf_male_var4_pro_4d_work.png',
        downedRaw: 'dwarf_male_var4_pro_4d_downed.png'
    },
    {
        num: 5,
        name: 'Variation 5 (Master Brewmaster / Clan Cook)',
        walkRaw: 'dwarf_male_var5_pro_4d_walk.png',
        haulRaw: 'dwarf_male_var5_pro_4d_haul.png',
        attackRaw: 'dwarf_male_var5_pro_4d_attack.png',
        bowRaw: 'dwarf_male_var5_pro_4d_bow.png',
        magicRaw: 'dwarf_male_var5_pro_4d_magic.png',
        workRaw: 'dwarf_male_var5_pro_4d_work.png',
        downedRaw: 'dwarf_male_var5_pro_4d_downed.png'
    },
    {
        num: 6,
        name: 'Variation 6 (Ancient Thane / Clan Elder)',
        walkRaw: 'dwarf_male_var6_pro_4d_walk.png',
        haulRaw: 'dwarf_male_var6_pro_4d_haul.png',
        attackRaw: 'dwarf_male_var6_pro_4d_attack.png',
        bowRaw: 'dwarf_male_var6_pro_4d_bow.png',
        magicRaw: 'dwarf_male_var6_pro_4d_magic.png',
        workRaw: 'dwarf_male_var6_pro_4d_work.png',
        downedRaw: 'dwarf_male_var6_pro_4d_downed.png'
    }
];

function compileOneAction(rawFileName, actionTag, animations, scale, varNum) {
    const rawPath = path.join(RAW_DIR, rawFileName);
    if (!fs.existsSync(rawPath)) {
        throw new Error(`Missing raw file: ${rawPath}`);
    }
    const rawImg = decodePNG(fs.readFileSync(rawPath));
    const numCols = (varNum === 3 && actionTag === 'Walk') ? 8 : 6;
    const grid = extractGridBBoxes(rawImg, numCols);

    let S, W, E, N;
    if (actionTag === 'Downed') {
        S = [grid[0][0], grid[0][4], grid[0][5]].map(b => extractUniformSprite(rawImg, b, scale, numCols));
        W = [grid[1][0], grid[1][4], grid[1][5]].map(b => extractUniformSprite(rawImg, b, scale, numCols));
        E = W.map(mirrorFrame);
        N = [grid[2][0], grid[2][4], grid[2][5]].map(b => extractUniformSprite(rawImg, b, scale, numCols));
    } else if (actionTag === 'Attack' || actionTag === 'Bow' || actionTag === 'Work') {
        S = [grid[0][0], grid[0][1], grid[0][2]].map(b => extractUniformSprite(rawImg, b, scale, numCols));
        W = [grid[1][0], grid[1][1], grid[1][2]].map(b => extractUniformSprite(rawImg, b, scale, numCols));
        E = [grid[1][3], grid[1][4], grid[1][5]].map(b => extractUniformSprite(rawImg, b, scale, numCols));
        N = [grid[2][3], grid[2][4], grid[2][5]].map(b => extractUniformSprite(rawImg, b, scale, numCols));
    } else {
        // Walk, Haul, Magic
        S = [grid[0][0], grid[0][1], grid[0][2]].map(b => extractUniformSprite(rawImg, b, scale, numCols));
        W = [grid[1][0], grid[1][3] || grid[1][0], grid[1][0]].map(b => extractUniformSprite(rawImg, b, scale, numCols));
        E = [grid[1][2], grid[1][5] || grid[1][2], grid[1][2]].map(b => extractUniformSprite(rawImg, b, scale, numCols));
        N = [grid[2][3], grid[2][4], grid[2][5]].map(b => extractUniformSprite(rawImg, b, scale, numCols));
    }

    const sheet = assemble12Charset({ S, W, E, N });
    saveSheetAndSidecar(sheet, `Dwarf_Male_${varNum}_${actionTag}`, actionTag, animations, varNum);

    // If Var 1, also save canonical aliases
    if (varNum === 1) {
        saveSheetAndSidecar(sheet, `Dwarf_Male_${actionTag}`, actionTag, animations, 1);
        if (actionTag === 'Walk') {
            saveSheetAndSidecar(sheet, 'Dwarf_Male', 'Walk', animations, 1);
            saveSheetAndSidecar(sheet, 'Dwarf', 'Walk', animations, 1);
        }
    }
    return sheet;
}

function compileVariation(v) {
    console.log(`\n==========================================================`);
    console.log(`=== Compiling Adult Male Dwarf ${v.name} ===`);
    console.log(`==========================================================`);

    // Check all raw files exist
    const rawFiles = [v.walkRaw, v.haulRaw, v.attackRaw, v.bowRaw, v.magicRaw, v.workRaw, v.downedRaw];
    for (const rf of rawFiles) {
        if (!fs.existsSync(path.join(RAW_DIR, rf))) {
            console.log(`Skipping Var ${v.num} (awaiting generation of ${rf})`);
            return null;
        }
    }

    // Calibrate scale from walk standing sprite height
    const rawWalk = decodePNG(fs.readFileSync(path.join(RAW_DIR, v.walkRaw)));
    const gridWalk = extractGridBBoxes(rawWalk);
    const standH = gridWalk[0][1].y1 - gridWalk[0][1].y0;
    const scale = 36.0 / standH;
    console.log(`[Var ${v.num}] Calibrated UNIFORM_SCALE = ${scale.toFixed(6)} (standH: ${standH}px, target: 36px in RMMZ)`);

    const actions = [
        { tag: 'Walk', raw: v.walkRaw, anim: { walk: [0, 1, 2, 1], stand: [1] } },
        { tag: 'Haul', raw: v.haulRaw, anim: { haul: [0, 1, 2, 1], carry: [1], stand: [1] } },
        { tag: 'Attack', raw: v.attackRaw, anim: { attack: [0, 1, 2], ready: [0] } },
        { tag: 'Bow', raw: v.bowRaw, anim: { shoot: [0, 1, 2], aim: [1], ready: [0] } },
        { tag: 'Magic', raw: v.magicRaw, anim: { cast: [0, 1, 2, 1], chant: [0] } },
        { tag: 'Work', raw: v.workRaw, anim: { work: [0, 1, 2, 1], craft: [1] } },
        { tag: 'Downed', raw: v.downedRaw, anim: { downed: [0, 1, 2], hurt: [0], dead: [2] } }
    ];

    const sheets = [];
    for (const a of actions) {
        console.log(`  - Compiling ${a.tag}...`);
        const sheet = compileOneAction(a.raw, a.tag, a.anim, scale, v.num);
        sheets.push(sheet);
    }

    // Assemble 7-action showcase board for this variation (1008x192 px)
    const showcaseBuf = Buffer.alloc(1008 * 192 * 4);
    for (let i = 0; i < 7; i++) {
        const s = sheets[i];
        for (let y = 0; y < 192; y++) {
            for (let x = 0; x < 144; x++) {
                const sIdx = (y * 144 + x) * 4;
                const dIdx = (y * 1008 + (i * 144 + x)) * 4;
                showcaseBuf[dIdx]     = s[sIdx];
                showcaseBuf[dIdx + 1] = s[sIdx + 1];
                showcaseBuf[dIdx + 2] = s[sIdx + 2];
                showcaseBuf[dIdx + 3] = s[sIdx + 3];
            }
        }
    }
    const showcasePath = path.join(REVIEW_DIR, `dwarf_male_var${v.num}_all_7_actions_12_sprites.png`);
    fs.writeFileSync(showcasePath, writePNG(showcaseBuf, 1008, 192));
    console.log(`[Var ${v.num}] Saved 7-action showcase to: ${showcasePath}`);

    return { varNum: v.num, walkSheet: sheets[0], sheets };
}

function main() {
    console.log('=== Compiling Adult Male Dwarf 42-Charset Suite (Serious Chibi) ===');
    const compiled = [];

    for (const v of VARIATION_CONFIGS) {
        const res = compileVariation(v);
        if (res) compiled.push(res);
    }

    console.log(`\nSuccessfully compiled ${compiled.length} of ${VARIATION_CONFIGS.length} variations (${compiled.length * 7} charsets).`);

    // If multiple variations compiled, assemble montage
    if (compiled.length > 0) {
        const montageWidth = compiled.length * 144;
        const montageBuf = Buffer.alloc(montageWidth * 192 * 4);
        for (let i = 0; i < compiled.length; i++) {
            const w = compiled[i].walkSheet;
            for (let y = 0; y < 192; y++) {
                for (let x = 0; x < 144; x++) {
                    const sIdx = (y * 144 + x) * 4;
                    const dIdx = (y * montageWidth + (i * 144 + x)) * 4;
                    montageBuf[dIdx]     = w[sIdx];
                    montageBuf[dIdx + 1] = w[sIdx + 1];
                    montageBuf[dIdx + 2] = w[sIdx + 2];
                    montageBuf[dIdx + 3] = w[sIdx + 3];
                }
            }
        }
        const montagePath = path.join(REVIEW_DIR, 'dwarf_male_variations_walk_montage.png');
        fs.writeFileSync(montagePath, writePNG(montageBuf, montageWidth, 192));
        console.log(`Saved variations montage: ${montagePath}`);
    }
}

main();

