#!/usr/bin/env node
'use strict';

/**
 * tools/import_standard_8d_charset.js
 *
 * Universal importer for the UF 8-Directional Standard Charset Template.
 * Usage:
 *   node tools/import_standard_8d_charset.js <path-to-image> <SpeciesName> [Gender]
 *
 * Supported image input formats:
 *   1. Native 18-Column Grid: 864 x 384 px (18 cols x 8 rows, 48x48 px cells).
 *   2. Labeled Specification Template: 2040 x 918 px (annotated spec sheet with headers and row tags).
 *   3. Native AR-600 Sheet: 960 x 384 px (20 cols x 8 rows).
 *
 * Cuts and exports the 6 standardized sub-charsets (144 x 384 px each) + AR-600 master (960 x 384 px)
 * into game/img/characters/ with complete JSON sidecars.
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
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

const inputPath = process.argv[2];
const species = process.argv[3] || 'Elf';
const gender = process.argv[4] || '';

if (!inputPath || !fs.existsSync(inputPath)) {
    console.error('Usage: node tools/import_standard_8d_charset.js <input-png> <Species> [Gender]');
    process.exit(1);
}

const masterImg = decodePNG(fs.readFileSync(inputPath), path.basename(inputPath));
console.log(`Loaded image: ${masterImg.width}x${masterImg.height}`);

// Normalize input image into 18-col x 8-row native buffer (864 x 384 px)
const native18Buf = Buffer.alloc(864 * 384 * 4);

if (masterImg.width === 864 && masterImg.height === 384) {
    // Exact 18-col native master
    masterImg.data.copy(native18Buf);
} else if (masterImg.width === 2040 && masterImg.height === 918) {
    // Labeled template spec format
    console.log('Detected 2040x918 labeled template specification sheet. Extracting 18x8 cells...');
    const LEFT_MARGIN = 220;
    const SECTION_PAD = 12;
    const CELL_SIZE = 96;
    const SEC_W = 3 * CELL_SIZE;
    const HEADER_H = 110;
    const ROW_H = 96;

    for (let r = 0; r < 8; r++) {
        const ry = HEADER_H + r * ROW_H;
        for (let s = 0; s < 6; s++) {
            const sx = LEFT_MARGIN + s * (SEC_W + SECTION_PAD);
            for (let f = 0; f < 3; f++) {
                const fx = sx + f * CELL_SIZE;
                const colIdx = s * 3 + f;

                for (let py = 0; py < 48; py++) {
                    for (let px = 0; px < 48; px++) {
                        // Sample top-left pixel of 2x cell
                        const srcX = fx + px * 2;
                        const srcY = ry + py * 2;
                        const sIdx = (srcY * masterImg.width + srcX) * 4;
                        const dIdx = ((r * 48 + py) * 864 + (colIdx * 48 + px)) * 4;

                        // Check if background grid/slate (#131722 or similar dark)
                        const rCol = masterImg.data[sIdx];
                        const gCol = masterImg.data[sIdx + 1];
                        const bCol = masterImg.data[sIdx + 2];
                        if (rCol <= 25 && gCol <= 30 && bCol <= 40) {
                            native18Buf[dIdx + 3] = 0;
                        } else {
                            native18Buf[dIdx]     = rCol;
                            native18Buf[dIdx + 1] = gCol;
                            native18Buf[dIdx + 2] = bCol;
                            native18Buf[dIdx + 3] = 255;
                        }
                    }
                }
            }
        }
    }
} else if (masterImg.width === 960 && masterImg.height === 384) {
    // AR-600 master format (reconstruct 18 cols from AR-600 columns)
    console.log('Detected 960x384 AR-600 master sheet. Extracting 18 standard columns...');
    const ar600To18 = [
        1, 2, 3,    // Walk (cols 1, 2, 3)
        8, 9, 10,   // Melee (cols 8, 9, 10)
        1, 1, 1,    // Placeholder Ranged if missing
        11, 12, 13, // Magic (cols 11, 12, 13)
        4, 5, 6,    // Work (cols 4, 5, 6)
        14, 15, 16  // Dead (cols 14, 15, 16)
    ];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 18; c++) {
            const arCol = ar600To18[c];
            for (let py = 0; py < 48; py++) {
                for (let px = 0; px < 48; px++) {
                    const sIdx = ((r * 48 + py) * 960 + (arCol * 48 + px)) * 4;
                    const dIdx = ((r * 48 + py) * 864 + (c * 48 + px)) * 4;
                    native18Buf[dIdx]     = masterImg.data[sIdx];
                    native18Buf[dIdx + 1] = masterImg.data[sIdx + 1];
                    native18Buf[dIdx + 2] = masterImg.data[sIdx + 2];
                    native18Buf[dIdx + 3] = masterImg.data[sIdx + 3];
                }
            }
        }
    }
} else {
    console.error(`Error: Unsupported image dimensions (${masterImg.width}x${masterImg.height}).`);
    console.error('Expected 864x384 (18-col master), 2040x918 (labeled spec template), or 960x384 (AR-600).');
    process.exit(1);
}

quantizeSheet(native18Buf, 864, 384, 31);

// Slicing 6 standardized sub-charsets
const actionSets = [
    {
        id: 'Walk',
        startCol: 0,
        anim: { walk: [0, 1, 2] },
        files: [`$UF_${species}_8D.png`, gender ? `$UF_${species}_${gender}_8D.png` : null]
    },
    {
        id: 'Melee',
        startCol: 3,
        anim: { attack: [0, 1, 2] },
        files: [`$UF_${species}_Attack_8D.png`, `$UF_${species}_Attack_Sword_8D.png`, gender ? `$UF_${species}_${gender}_Attack_8D.png` : null]
    },
    {
        id: 'Ranged',
        startCol: 6,
        anim: { bow: [0, 1, 2], ranged: [0, 1, 2] },
        files: [`$UF_${species}_Bow_8D.png`, `$UF_${species}_Ranged_8D.png`, gender ? `$UF_${species}_${gender}_Bow_8D.png` : null]
    },
    {
        id: 'Magic',
        startCol: 9,
        anim: { cast: [0, 1, 2] },
        files: [`$UF_${species}_Cast_Staff_8D.png`, `$UF_${species}_Magic_8D.png`, gender ? `$UF_${species}_${gender}_Cast_8D.png` : null]
    },
    {
        id: 'Work',
        startCol: 12,
        anim: { work: [0, 1, 2] },
        files: [`$UF_${species}_Work_8D.png`, gender ? `$UF_${species}_${gender}_Work_8D.png` : null]
    },
    {
        id: 'Dead',
        startCol: 15,
        anim: { hurt: [0], collapse: [1], dead: [2] },
        files: [`$UF_${species}_Dead_8D.png`, gender ? `$UF_${species}_${gender}_Dead_8D.png` : null]
    }
];

const subBufs = {};

actionSets.forEach(set => {
    const subBuf = Buffer.alloc(144 * 384 * 4);
    for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 3; f++) {
            const masterCol = set.startCol + f;
            for (let py = 0; py < 48; py++) {
                for (let px = 0; px < 48; px++) {
                    const srcX = masterCol * 48 + px;
                    const srcY = r * 48 + py;
                    const sIdx = (srcY * 864 + srcX) * 4;
                    const dIdx = ((r * 48 + py) * 144 + (f * 48 + px)) * 4;

                    subBuf[dIdx]     = native18Buf[sIdx];
                    subBuf[dIdx + 1] = native18Buf[sIdx + 1];
                    subBuf[dIdx + 2] = native18Buf[sIdx + 2];
                    subBuf[dIdx + 3] = native18Buf[sIdx + 3];
                }
            }
        }
    }

    quantizeSheet(subBuf, 144, 384, 31);
    subBufs[set.id] = subBuf;

    set.files.filter(Boolean).forEach(fileName => {
        const outPath = path.join(CHAR_DIR, fileName);
        writePNG(outPath, 144, 384, subBuf);
        fs.writeFileSync(outPath.replace(/\.png$/, '.json'), JSON.stringify({
            frameWidth: 48,
            frameHeight: 48,
            anchor: [24, 47],
            footprint: [1, 1],
            facings: ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'],
            frameMs: 150,
            species: species.toLowerCase(),
            gender: gender ? gender.toLowerCase() : undefined,
            animations: set.anim
        }, null, 2));
        console.log(`Exported sub-charset: ${fileName}`);
    });
});

// Also assemble and export AR-600 composite (960 x 384 px)
console.log('Assembling AR-600 master sheet (960 x 384 px)...');
const ar600Buf = Buffer.alloc(960 * 384 * 4);
const ar600Cols = [
    { srcBuf: subBufs.Walk,   srcCol: 1 }, // 0: Stand
    { srcBuf: subBufs.Walk,   srcCol: 0 }, // 1: Walk L
    { srcBuf: subBufs.Walk,   srcCol: 1 }, // 2: Walk Pass
    { srcBuf: subBufs.Walk,   srcCol: 2 }, // 3: Walk R
    { srcBuf: subBufs.Work,   srcCol: 0 }, // 4: Work Reach
    { srcBuf: subBufs.Work,   srcCol: 1 }, // 5: Work Craft
    { srcBuf: subBufs.Work,   srcCol: 2 }, // 6: Work Gather
    { srcBuf: subBufs.Walk,   srcCol: 1 }, // 7: Carry (V89)
    { srcBuf: subBufs.Melee,  srcCol: 0 }, // 8: Attack Windup
    { srcBuf: subBufs.Melee,  srcCol: 1 }, // 9: Attack Strike
    { srcBuf: subBufs.Melee,  srcCol: 2 }, // 10: Attack Recover
    { srcBuf: subBufs.Magic,  srcCol: 0 }, // 11: Cast Focus
    { srcBuf: subBufs.Magic,  srcCol: 1 }, // 12: Cast Glow
    { srcBuf: subBufs.Magic,  srcCol: 2 }, // 13: Cast Thrust
    { srcBuf: subBufs.Dead,   srcCol: 0 }, // 14: Hurt Flinch
    { srcBuf: subBufs.Dead,   srcCol: 1 }, // 15: Collapse
    { srcBuf: subBufs.Dead,   srcCol: 2 }, // 16: Dead / Sleep
    { srcBuf: subBufs.Dead,   srcCol: 2 }, // 17: Dead alt
    { srcBuf: subBufs.Walk,   srcCol: 1 }, // 18: Idle 1
    { srcBuf: subBufs.Walk,   srcCol: 1 }  // 19: Idle 2
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
const ar600Name = gender ? `$UF_${species}_${gender}_AR600.png` : `$UF_${species}_AR600.png`;
const ar600Path = path.join(CHAR_DIR, ar600Name);
writePNG(ar600Path, 960, 384, ar600Buf);
fs.writeFileSync(ar600Path.replace(/\.png$/, '.json'), JSON.stringify({
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'],
    frameMs: 150,
    species: species.toLowerCase(),
    gender: gender ? gender.toLowerCase() : undefined,
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

console.log(`Exported master AR-600 composite: ${ar600Name}`);
console.log('Import and export successfully completed!');
