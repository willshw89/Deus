const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// Read palette
const hexLines = fs.readFileSync(PALETTE_FILE, 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.startsWith('#'));

function hexToRgb(h) {
    const r = parseInt(h.slice(1, 3), 16);
    const g = parseInt(h.slice(3, 5), 16);
    const b = parseInt(h.slice(5, 7), 16);
    return [r, g, b];
}

const palette = hexLines.map(hexToRgb);

function rgbToXyz(r, g, b) {
    let r1 = r / 255, g1 = g / 255, b1 = b / 255;
    r1 = r1 > 0.04045 ? Math.pow((r1 + 0.055) / 1.055, 2.4) : r1 / 12.92;
    g1 = g1 > 0.04045 ? Math.pow((g1 + 0.055) / 1.055, 2.4) : g1 / 12.92;
    b1 = b1 > 0.04045 ? Math.pow((b1 + 0.055) / 1.055, 2.4) : b1 / 12.92;
    return [
        (r1 * 0.4124 + g1 * 0.3576 + b1 * 0.1805) * 100,
        (r1 * 0.2126 + g1 * 0.7152 + b1 * 0.0722) * 100,
        (r1 * 0.0193 + g1 * 0.1192 + b1 * 0.9505) * 100
    ];
}

function xyzToLab(x, y, z) {
    let x1 = x / 95.047, y1 = y / 100.0, z1 = z / 108.883;
    const f = (t) => t > 0.008856 ? Math.cbrt(t) : (7.787 * t) + (16 / 116);
    const fx = f(x1), fy = f(y1), fz = f(z1);
    return [(116 * fy) - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function rgbToLab(r, g, b) {
    const [x, y, z] = rgbToXyz(r, g, b);
    return xyzToLab(x, y, z);
}

const paletteLab = palette.map(c => rgbToLab(c[0], c[1], c[2]));

function snapColor(r, g, b) {
    const lab = rgbToLab(r, g, b);
    let bestDist = Infinity;
    let bestIdx = 0;
    for (let i = 0; i < paletteLab.length; i++) {
        const pl = paletteLab[i];
        const dL = lab[0] - pl[0];
        const da = lab[1] - pl[1];
        const db = lab[2] - pl[2];
        const dist = dL * dL + da * da + db * db;
        if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
        }
    }
    return palette[bestIdx];
}

function loadJpg(jpgPath) {
    const tmpPng = path.join(os.tmpdir(), `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${jpgPath.replace(/'/g, "''")}'); $img.Save('${tmpPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    const buf = fs.readFileSync(tmpPng);
    fs.unlinkSync(tmpPng);
    return decodePNG(buf, path.basename(jpgPath));
}

function quantizeBuffer(buf, maxColors) {
    const counts = new Map();
    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 0) continue;
        const key = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
        counts.set(key, (counts.get(key) || 0) + 1);
    }

    while (counts.size > maxColors) {
        let minCount = Infinity, minKey = null;
        for (const [k, c] of counts.entries()) {
            if (c < minCount) {
                minCount = c;
                minKey = k;
            }
        }
        const r1 = (minKey >> 16) & 255, g1 = (minKey >> 8) & 255, b1 = minKey & 255;
        const lab1 = rgbToLab(r1, g1, b1);

        let bestDist = Infinity, bestKey = null;
        for (const [k, _] of counts.entries()) {
            if (k === minKey) continue;
            const r2 = (k >> 16) & 255, g2 = (k >> 8) & 255, b2 = k & 255;
            const lab2 = rgbToLab(r2, g2, b2);
            const dist = Math.pow(lab1[0] - lab2[0], 2) + Math.pow(lab1[1] - lab2[1], 2) + Math.pow(lab1[2] - lab2[2], 2);
            if (dist < bestDist) {
                bestDist = dist;
                bestKey = k;
            }
        }

        counts.set(bestKey, counts.get(bestKey) + counts.get(minKey));
        counts.delete(minKey);

        const newR = (bestKey >> 16) & 255, newG = (bestKey >> 8) & 255, newB = bestKey & 255;
        for (let i = 0; i < buf.length; i += 4) {
            if (buf[i + 3] === 0) continue;
            const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
            if (k === minKey) {
                buf[i] = newR;
                buf[i + 1] = newG;
                buf[i + 2] = newB;
            }
        }
    }
}

const COLS = 4;
const ROWS = 3;
const CELL_SIZE = 96;
const TARGET_W = COLS * CELL_SIZE; // 384
const TARGET_H = ROWS * CELL_SIZE; // 288

const batch = [
    {
        id: 'face_dwarf_male_adult',
        species: 'dwarf',
        gender: 'male',
        age: 'adult',
        stage: 'adult',
        jpgFile: null,
        rmmzFile: 'game/img/faces/UF_Faces_Dwarf_Male_Adult.png',
        descriptions: [
            "Stout dwarf warrior with thick fiery red braided beard secured with brass clasps",
            "Dwarf blacksmith with bushy dark brown beard, deep brow ridge, and warm brown eyes",
            "Grizzled veteran dwarf with long braided grey beard, eye patch, and heavy jaw",
            "Dark-skinned dwarf miner with jet-black braided beard, broad nose, and determined expression"
        ]
    },
    {
        id: 'face_dwarf_female_adult',
        species: 'dwarf',
        gender: 'female',
        age: 'adult',
        stage: 'adult',
        jpgFile: null,
        rmmzFile: 'game/img/faces/UF_Faces_Dwarf_Female_Adult.png',
        descriptions: [
            "Dwarf shieldmaiden with thick fiery red braids coiled over ears and gold rings",
            "Warm-eyed dwarf brewer with dark brown plaited locks and broad pleasant cheeks",
            "Dwarf runesmith with silver-grey hair in intricate crown braids and sharp gaze",
            "Dark-skinned dwarf craftswoman with tight black coiled braids and brass hair clasps"
        ]
    },
    {
        id: 'face_dwarf_male_elder',
        species: 'dwarf',
        gender: 'male',
        age: 'elder',
        stage: 'elder',
        jpgFile: null,
        rmmzFile: 'game/img/faces/UF_Faces_Dwarf_Male_Elder.png',
        descriptions: [
            "Venerable dwarf clan elder with immense snowy-white braided beard reaching chest and jeweled clasps",
            "Ancient dwarven loremaster with sweeping grey mustache, wise squinting eyes, and furrowed brow",
            "Battle-scarred dwarven patriarch with silver beard, notched ears, and iron circlet",
            "Dark-skinned elder miner with frosted curly silver beard and warm smile lines"
        ]
    },
    {
        id: 'face_dwarf_female_elder',
        species: 'dwarf',
        gender: 'female',
        age: 'elder',
        stage: 'elder',
        jpgFile: null,
        rmmzFile: 'game/img/faces/UF_Faces_Dwarf_Female_Elder.png',
        descriptions: [
            "Venerable dwarf matriarch with majestic silver hair in coiled side-buns with filigree pins",
            "Ancient dwarven healer with grey-frosted auburn braids and kind crinkled eyes",
            "Stern dwarven grandmother with coiled steel-grey plaits and carved bone ornaments",
            "Dark-skinned dwarven clan mother with silver-threaded braided crown and dignified gaze"
        ]
    }
];

function processItem(item) {
    if (!item.jpgFile || !fs.existsSync(item.jpgFile)) {
        console.log(`Skipping ${item.id}: jpgFile not found (${item.jpgFile})`);
        return false;
    }

    console.log(`\n=== Processing ${item.id} ===`);
    const src = loadJpg(item.jpgFile);
    console.log(`Loaded JPG: ${src.width}x${src.height}`);

    const cellSrcW = src.width / COLS;
    const cellSrcH = src.height / ROWS;

    const masterBuf = Buffer.alloc(TARGET_W * TARGET_H * 4);

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const srcX0 = c * cellSrcW;
            const srcY0 = r * cellSrcH;
            const dstX0 = c * CELL_SIZE;
            const dstY0 = r * CELL_SIZE;

            for (let cy = 0; cy < CELL_SIZE; cy++) {
                const y0 = Math.floor(srcY0 + (cy * cellSrcH) / CELL_SIZE);
                const y1 = Math.floor(srcY0 + ((cy + 1) * cellSrcH) / CELL_SIZE);
                for (let cx = 0; cx < CELL_SIZE; cx++) {
                    const x0 = Math.floor(srcX0 + (cx * cellSrcW) / CELL_SIZE);
                    const x1 = Math.floor(srcX0 + ((cx + 1) * cellSrcW) / CELL_SIZE);

                    let sumR = 0, sumG = 0, sumB = 0, count = 0;
                    for (let sy = y0; sy < y1 && sy < src.height; sy++) {
                        for (let sx = x0; sx < x1 && sx < src.width; sx++) {
                            const idx = (sy * src.width + sx) * 4;
                            sumR += src.data[idx];
                            sumG += src.data[idx + 1];
                            sumB += src.data[idx + 2];
                            count++;
                        }
                    }

                    const avgR = count > 0 ? Math.round(sumR / count) : 0;
                    const avgG = count > 0 ? Math.round(sumG / count) : 0;
                    const avgB = count > 0 ? Math.round(sumB / count) : 0;
                    const snapped = snapColor(avgR, avgG, avgB);

                    const outIdx = ((dstY0 + cy) * TARGET_W + (dstX0 + cx)) * 4;
                    masterBuf[outIdx] = snapped[0];
                    masterBuf[outIdx + 1] = snapped[1];
                    masterBuf[outIdx + 2] = snapped[2];
                    masterBuf[outIdx + 3] = 255;
                }
            }
        }
    }

    quantizeBuffer(masterBuf, 32);

    const masterPath = path.join(ROOT, 'art', 'masters', `${item.id}.png`);
    writePNG(masterPath, TARGET_W, TARGET_H, masterBuf);
    console.log(`Saved master sheet: ${masterPath} (${TARGET_W}x${TARGET_H})`);

    const rawPath = path.join(ROOT, 'art', 'raw', `${item.id}.png`);
    writePNG(rawPath, TARGET_W, TARGET_H, masterBuf);
    console.log(`Saved raw sheet: ${rawPath}`);

    const rmmzW = 576;
    const rmmzH = 288;
    const rmmzBuf = Buffer.alloc(rmmzW * rmmzH * 4);

    const bgR = masterBuf[0], bgG = masterBuf[1], bgB = masterBuf[2];
    for (let i = 0; i < rmmzBuf.length; i += 4) {
        rmmzBuf[i] = bgR;
        rmmzBuf[i + 1] = bgG;
        rmmzBuf[i + 2] = bgB;
        rmmzBuf[i + 3] = 255;
    }

    const offsetX = Math.floor((144 - CELL_SIZE) / 2); // 24
    const offsetY = Math.floor((144 - CELL_SIZE) / 2); // 24

    for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 4; c++) {
            const srcCellX0 = c * CELL_SIZE;
            const srcCellY0 = r * CELL_SIZE;
            const dstCellX0 = c * 144 + offsetX;
            const dstCellY0 = r * 144 + offsetY;

            for (let y = 0; y < CELL_SIZE; y++) {
                for (let x = 0; x < CELL_SIZE; x++) {
                    const sidx = ((srcCellY0 + y) * TARGET_W + (srcCellX0 + x)) * 4;
                    const didx = ((dstCellY0 + y) * rmmzW + (dstCellX0 + x)) * 4;
                    rmmzBuf[didx] = masterBuf[sidx];
                    rmmzBuf[didx + 1] = masterBuf[sidx + 1];
                    rmmzBuf[didx + 2] = masterBuf[sidx + 2];
                    rmmzBuf[didx + 3] = 255;
                }
            }
        }
    }

    const rmmzFullPath = path.join(ROOT, item.rmmzFile);
    writePNG(rmmzFullPath, rmmzW, rmmzH, rmmzBuf);
    console.log(`Saved RMMZ faceset: ${rmmzFullPath} (${rmmzW}x${rmmzH})`);

    const scale = 2;
    const revW = TARGET_W * scale;
    const revH = TARGET_H * scale;
    const revBuf = Buffer.alloc(revW * revH * 4);

    for (let y = 0; y < TARGET_H; y++) {
        for (let x = 0; x < TARGET_W; x++) {
            const sidx = (y * TARGET_W + x) * 4;
            for (let dy = 0; dy < scale; dy++) {
                for (let dx = 0; dx < scale; dx++) {
                    const didx = ((y * scale + dy) * revW + (x * scale + dx)) * 4;
                    revBuf[didx] = masterBuf[sidx];
                    revBuf[didx + 1] = masterBuf[sidx + 1];
                    revBuf[didx + 2] = masterBuf[sidx + 2];
                    revBuf[didx + 3] = masterBuf[sidx + 3];
                }
            }
        }
    }

    const revPath = path.join(ROOT, 'art', 'review', `${item.id}_2x.png`);
    writePNG(revPath, revW, revH, revBuf);
    console.log(`Saved review render: ${revPath}`);

    const sidecar = {
        "id": item.id,
        "species": item.species,
        "gender": item.gender,
        "age": item.age,
        "stage": item.stage,
        "layer": "face",
        "frameWidth": 96,
        "frameHeight": 96,
        "anchor": [48, 95],
        "footprint": [1, 1],
        "facings": ["S"],
        "animations": {
            "neutral": [0, 1, 2, 3],
            "content": [0, 1, 2, 3],
            "angry": [0, 1, 2, 3]
        },
        "columns": 4,
        "rows": 3,
        "variants": {
            [item.gender]: [0, 1, 2, 3]
        },
        "moods": ["neutral", "content", "angry"],
        "faces": item.descriptions.map((desc, idx) => ({ variant: idx, description: desc })),
        "rmmzFaceset": item.rmmzFile
    };

    const sidecarPath = path.join(ROOT, 'art', 'masters', `${item.id}.json`);
    fs.writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2) + '\n', 'utf8');
    console.log(`Saved sidecar JSON: ${sidecarPath}`);

    return true;
}

const targetId = process.argv[2];
const targetJpg = process.argv[3];

if (targetId && targetJpg) {
    const item = batch.find(b => b.id === targetId);
    if (item) {
        item.jpgFile = targetJpg;
        processItem(item);
    } else {
        console.error(`Unknown id: ${targetId}`);
    }
} else {
    for (const item of batch) {
        processItem(item);
    }
}
