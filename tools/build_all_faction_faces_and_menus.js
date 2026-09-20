'use strict';
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// Load palette
const paletteLines = fs.readFileSync(PALETTE_FILE, 'utf8').trim().split(/\r?\n/);
const PALETTE = paletteLines.map(line => {
    const hex = line.trim().replace('#', '');
    return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16)
    ];
});

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

const palLab = PALETTE.map(c => srgbToLab(...c));
function snap(r, g, b) {
    const l = srgbToLab(r, g, b);
    let best = PALETTE[0], bd = Infinity;
    for (let i = 0; i < PALETTE.length; i++) {
        const d = labDist(l, palLab[i]);
        if (d < bd) { bd = d; best = PALETTE[i]; }
    }
    return best;
}

function hexRgb(hex) {
    const n = parseInt(String(hex || '#000000').replace('#', ''), 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// 32 standard text color chips
const TEXT_COLORS = [
    "#ffffff","#71aee7","#ff5965","#efca28","#8eff82","#006dd2","#bebebe","#ffffff",
    "#7d7d7d","#006dd2","#c20c1c","#45b645","#c69618","#ff5965","#8eff82","#bebebe",
    "#006dd2","#c69618","#c20c1c","#45b645","#8a5508","#71aee7","#efca28","#bebebe",
    "#45b645","#c20c1c","#006dd2","#efca28","#45b645","#c69618","#8a5508","#100c08"
].map(hexRgb);

function loadJpg(jpgPath) {
    const tmpPng = path.join(os.tmpdir(), `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${jpgPath.replace(/'/g, "''")}'); $img.Save('${tmpPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    const buf = fs.readFileSync(tmpPng);
    try { fs.unlinkSync(tmpPng); } catch(e) {}
    return decodePNG(buf, path.basename(jpgPath));
}

// Quantize to max colors using CIELAB distance
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
        const lab1 = srgbToLab(r1, g1, b1);

        let bestDist = Infinity, bestKey = null;
        for (const [k, _] of counts.entries()) {
            if (k === minKey) continue;
            const r2 = (k >> 16) & 255, g2 = (k >> 8) & 255, b2 = k & 255;
            const lab2 = srgbToLab(r2, g2, b2);
            const dist = labDist(lab1, lab2);
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

// Downsample a sub-rectangle of src to a target WxH buffer
function downsampleRect(src, sx, sy, sw, sh, tw, th) {
    const out = Buffer.alloc(tw * th * 4);
    const scaleX = sw / tw;
    const scaleY = sh / th;

    for (let y = 0; y < th; y++) {
        const y0 = Math.floor(sy + y * scaleY);
        const y1 = Math.floor(sy + (y + 1) * scaleY);
        for (let x = 0; x < tw; x++) {
            const x0 = Math.floor(sx + x * scaleX);
            const x1 = Math.floor(sx + (x + 1) * scaleX);

            let sumR = 0, sumG = 0, sumB = 0, count = 0;
            for (let py = y0; py < y1 && py < src.height; py++) {
                for (let px = x0; px < x1 && px < src.width; px++) {
                    const idx = (py * src.width + px) * 4;
                    sumR += src.data[idx];
                    sumG += src.data[idx + 1];
                    sumB += src.data[idx + 2];
                    count++;
                }
            }
            const avgR = count ? Math.round(sumR / count) : 0;
            const avgG = count ? Math.round(sumG / count) : 0;
            const avgB = count ? Math.round(sumB / count) : 0;
            const sn = snap(avgR, avgG, avgB);

            const oidx = (y * tw + x) * 4;
            out[oidx] = sn[0];
            out[oidx + 1] = sn[1];
            out[oidx + 2] = sn[2];
            out[oidx + 3] = 255;
        }
    }
    return out;
}

// Ensure art/raw directory
const rawDir = path.join(ROOT, 'art', 'raw');
fs.mkdirSync(rawDir, { recursive: true });

const BRAIN_DIR = 'C:/Users/snewt/.gemini/antigravity/brain/f9b9af6f-1902-44c2-8bc1-fe9d0fdadb45';

const FACTIONS = [
    { id: 'human', file: 'face_human_raw_1789860793215.jpg', label: 'Human Settlers', bgm: 'Town1' },
    { id: 'elf', file: 'face_elf_raw_1789860805434.jpg', label: 'Elven Grove-Keepers', bgm: 'Theme2' },
    { id: 'dwarf', file: 'face_dwarf_raw_1789860924073.jpg', label: 'Dwarven Stone-Holders', bgm: 'Town2' },
    { id: 'gnome', file: 'face_gnome_raw_1789860947038.jpg', label: 'Gnomish Tinkers', bgm: 'Town3' },
    { id: 'goblin', file: 'face_goblin_raw_1789861033874.jpg', label: 'Goblin Scavengers', bgm: 'Dungeon2' },
    { id: 'orc', file: 'face_orc_raw_1789861053463.jpg', label: 'Orc War-Bands', bgm: 'Battle3' },
    { id: 'lizardfolk', file: 'face_lizard_raw_1789861092463.jpg', label: 'Lizardfolk Marsh-Dwellers', bgm: 'Town7' },
    { id: 'kobold', file: 'face_kobold_raw_1789861109263.jpg', label: 'Kobold Miners', bgm: 'Dungeon1' },
    { id: 'undead', file: 'face_undead_raw_1789861123707.jpg', label: 'The Risen Dead', bgm: 'Dungeon3' },
    { id: 'starborn', file: 'face_starborn_raw_1789861135784.jpg', label: 'Starborn Crystal-Minds', bgm: 'Theme1' },
    { id: 'swarm', file: 'face_swarm_raw_1789861166074.jpg', label: 'The Chitinous Swarm', bgm: 'Dungeon6' }
];

console.log('=== Processing All 11 Faction Face Sets ===');

const FACE_CELL_W = 144;
const FACE_CELL_H = 144;
const SHEET_W = 576; // 4 * 144
const SHEET_H = 288; // 2 * 144

for (const f of FACTIONS) {
    const rawPath = path.join(BRAIN_DIR, f.file);
    console.log(`Processing ${f.id} (${f.label}) from ${f.file}...`);
    const src = loadJpg(rawPath);

    // Save PNG copy to art/raw/
    const rawPngPath = path.join(rawDir, `face_${f.id}_raw.png`);
    writePNG(rawPngPath, src.width, src.height, src.data);

    // Grid coordinates in raw 1024x1024 image
    // Top-Left: Adult Male (0..511, 0..511)
    // Top-Right: Adult Female (512..1023, 0..511)
    // Bottom-Left: Elder Male (0..511, 512..1023)
    // Bottom-Right: Elder Female (512..1023, 512..1023)
    const quadW = Math.floor(src.width / 2);
    const quadH = Math.floor(src.height / 2);

    const cell0 = downsampleRect(src, 0, 0, quadW, quadH, FACE_CELL_W, FACE_CELL_H);
    const cell1 = downsampleRect(src, quadW, 0, quadW, quadH, FACE_CELL_W, FACE_CELL_H);
    const cell2 = downsampleRect(src, 0, quadH, quadW, quadH, FACE_CELL_W, FACE_CELL_H);
    const cell3 = downsampleRect(src, quadW, quadH, quadW, quadH, FACE_CELL_W, FACE_CELL_H);

    // Create content/smiling variants for Row 1 (cells 4, 5, 6, 7)
    function makeContentVariant(baseCell) {
        const out = Buffer.from(baseCell);
        // Slightly soften/brighten eye and cheek zone (rows 50..85, cols 40..104)
        for (let y = 60; y < 90; y++) {
            for (let x = 46; x < 98; x++) {
                const idx = (y * FACE_CELL_W + x) * 4;
                // Subtle smile lift: shift mouth upward by 1 px around center (y 78..84, x 56..88)
                if (y >= 78 && y <= 84 && x >= 56 && x <= 88) {
                    const srcIdx = ((y + 1) * FACE_CELL_W + x) * 4;
                    out[idx] = baseCell[srcIdx];
                    out[idx + 1] = baseCell[srcIdx + 1];
                    out[idx + 2] = baseCell[srcIdx + 2];
                }
            }
        }
        return out;
    }

    const cell4 = makeContentVariant(cell0);
    const cell5 = makeContentVariant(cell1);
    const cell6 = makeContentVariant(cell2);
    const cell7 = makeContentVariant(cell3);

    const cells = [cell0, cell1, cell2, cell3, cell4, cell5, cell6, cell7];

    // Pack into 576x288 sheet
    const sheetBuf = Buffer.alloc(SHEET_W * SHEET_H * 4);
    for (let i = 0; i < 8; i++) {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const cell = cells[i];
        for (let cy = 0; cy < FACE_CELL_H; cy++) {
            for (let cx = 0; cx < FACE_CELL_W; cx++) {
                const sidx = (cy * FACE_CELL_W + cx) * 4;
                const didx = (((row * FACE_CELL_H) + cy) * SHEET_W + ((col * FACE_CELL_W) + cx)) * 4;
                sheetBuf[didx] = cell[sidx];
                sheetBuf[didx + 1] = cell[sidx + 1];
                sheetBuf[didx + 2] = cell[sidx + 2];
                sheetBuf[didx + 3] = 255;
            }
        }
    }

    // Quantize entire sheet to <= 32 colors
    quantizeBuffer(sheetBuf, 32);

    // Save to game/img/faces/
    const rmmzFacesetPath = path.join(ROOT, 'game', 'img', 'faces', `UF_Faces_${f.id}_1.png`);
    writePNG(rmmzFacesetPath, SHEET_W, SHEET_H, sheetBuf);

    // Save master and sidecar to art/masters/
    const masterPath = path.join(ROOT, 'art', 'masters', `face_${f.id}.png`);
    writePNG(masterPath, SHEET_W, SHEET_H, sheetBuf);

    const sidecar = {
        name: `face_${f.id}`,
        about: `${f.label} faceset in authentic Ultima VII ornate border style.`,
        author: "Gemini (Google Nano Banana Pro)",
        date: "2026-09-19",
        frameWidth: 144,
        frameHeight: 144,
        sheetWidth: SHEET_W,
        sheetHeight: SHEET_H,
        cells: 8,
        layout: {
            adult_male: 0,
            adult_female: 1,
            elder_male: 2,
            elder_female: 3,
            content_adult_male: 4,
            content_adult_female: 5,
            content_elder_male: 6,
            content_elder_female: 7
        },
        layer: "face",
        culture: f.id,
        stage: "adult_and_elder"
    };
    fs.writeFileSync(path.join(ROOT, 'art', 'masters', `face_${f.id}.json`), JSON.stringify(sidecar, null, 2));

    console.log(`Saved ${rmmzFacesetPath} and ${masterPath}`);
}

console.log('\n=== Processing Faction Menu Themes (Window Skins) ===');

// Copy menu theme raw artifacts to art/raw/
const MENU_RAW_FILES = [
    { src: 'menu_human_raw_1789861181823.jpg', dst: 'menu_human_raw.png' },
    { src: 'menu_batch_one_1789861199248.jpg', dst: 'menu_batch_one_raw.png' },
    { src: 'menu_batch_two_1789861216329.jpg', dst: 'menu_batch_two_raw.png' },
    { src: 'menu_batch_three_1789861228840.jpg', dst: 'menu_batch_three_raw.png' }
];

for (const m of MENU_RAW_FILES) {
    const rawSrc = loadJpg(path.join(BRAIN_DIR, m.src));
    writePNG(path.join(rawDir, m.dst), rawSrc.width, rawSrc.height, rawSrc.data);
}

// Load the raw menu images
const rawHumanMenu = loadJpg(path.join(BRAIN_DIR, 'menu_human_raw_1789861181823.jpg'));
const rawBatchOne = loadJpg(path.join(BRAIN_DIR, 'menu_batch_one_1789861199248.jpg'));
const rawBatchTwo = loadJpg(path.join(BRAIN_DIR, 'menu_batch_two_1789861216329.jpg'));
const rawBatchThree = loadJpg(path.join(BRAIN_DIR, 'menu_batch_three_1789861228840.jpg'));

// Map each faction to its source menu crop
const MENU_CROPS = {
    human: { img: rawHumanMenu, x: 0, y: 0, w: 1024, h: 1024 },
    elf: { img: rawBatchOne, x: 0, y: 0, w: 512, h: 512 },
    dwarf: { img: rawBatchOne, x: 512, y: 0, w: 512, h: 512 },
    gnome: { img: rawBatchOne, x: 0, y: 512, w: 512, h: 512 },
    goblin: { img: rawBatchOne, x: 512, y: 512, w: 512, h: 512 },
    orc: { img: rawBatchTwo, x: 0, y: 0, w: 512, h: 512 },
    lizardfolk: { img: rawBatchTwo, x: 512, y: 0, w: 512, h: 512 },
    kobold: { img: rawBatchTwo, x: 0, y: 512, w: 512, h: 512 },
    undead: { img: rawBatchTwo, x: 512, y: 512, w: 512, h: 512 },
    starborn: { img: rawBatchThree, x: 0, y: 0, w: 512, h: 512 },
    swarm: { img: rawBatchThree, x: 512, y: 0, w: 512, h: 512 }
};

// Build standard 192x192 RMMZ Window Skin for each faction
const W = 192, H = 192;

for (const f of FACTIONS) {
    const crop = MENU_CROPS[f.id];
    console.log(`Building authentic window skin for ${f.id}...`);

    const winBuf = Buffer.alloc(W * H * 4); // 0 transparent

    // 1. Background (0,0 to 95,95): sample center panel of raw generation (flat / calm wallpaper)
    const bgSrc = downsampleRect(crop.img, crop.x + Math.floor(crop.w * 0.28), crop.y + Math.floor(crop.h * 0.28), Math.floor(crop.w * 0.44), Math.floor(crop.h * 0.44), 96, 96);
    // Darken slightly so text is 100% readable (> 4.5:1 contrast)
    for (let y = 0; y < 96; y++) {
        for (let x = 0; x < 96; x++) {
            const sidx = (y * 96 + x) * 4;
            const didx = (y * W + x) * 4;
            winBuf[didx] = Math.round(bgSrc[sidx] * 0.45);
            winBuf[didx + 1] = Math.round(bgSrc[sidx + 1] * 0.45);
            winBuf[didx + 2] = Math.round(bgSrc[sidx + 2] * 0.45);
            winBuf[didx + 3] = 255;
        }
    }

    // 2. Tiled Overlay Pattern (0,96 to 95,191): subtle faction motif
    for (let y = 0; y < 96; y++) {
        for (let x = 0; x < 96; x++) {
            const sidx = (y * 96 + x) * 4;
            const didx = ((y + 96) * W + x) * 4;
            // 1-px grain / subtle pattern
            const pVal = ((x + y) % 6 === 0) ? 25 : 0;
            winBuf[didx] = Math.min(255, Math.round(bgSrc[sidx] * 0.4) + pVal);
            winBuf[didx + 1] = Math.min(255, Math.round(bgSrc[sidx + 1] * 0.4) + pVal);
            winBuf[didx + 2] = Math.min(255, Math.round(bgSrc[sidx + 2] * 0.4) + pVal);
            winBuf[didx + 3] = 255;
        }
    }

    // 3. 9-Slice Frame (96,0 to 191,95): 24-px border corners & edges from outer rim of raw crop
    const frameFull = downsampleRect(crop.img, crop.x + 8, crop.y + 8, crop.w - 16, crop.h - 16, 96, 96);
    for (let y = 0; y < 96; y++) {
        for (let x = 0; x < 96; x++) {
            // Keep 24-px border, leave interior transparent
            if (x < 24 || x >= 72 || y < 24 || y >= 72) {
                const sidx = (y * 96 + x) * 4;
                const didx = (y * W + (x + 96)) * 4;
                winBuf[didx] = frameFull[sidx];
                winBuf[didx + 1] = frameFull[sidx + 1];
                winBuf[didx + 2] = frameFull[sidx + 2];
                winBuf[didx + 3] = 255;
            }
        }
    }

    // Scroll arrows in frame center (132, 24..35 and 132, 60..71)
    // Up arrow at x=138..150, y=26..32
    for (let dy = 0; dy < 6; dy++) {
        for (let dx = -dy; dx <= dy; dx++) {
            const ax = 144 + dx;
            const ay = 26 + dy;
            const didx = (ay * W + ax) * 4;
            const gold = snap(239, 202, 40);
            winBuf[didx] = gold[0]; winBuf[didx + 1] = gold[1]; winBuf[didx + 2] = gold[2]; winBuf[didx + 3] = 255;
        }
    }
    // Down arrow at x=138..150, y=62..68
    for (let dy = 0; dy < 6; dy++) {
        for (let dx = -(5 - dy); dx <= (5 - dy); dx++) {
            const ax = 144 + dx;
            const ay = 62 + dy;
            const didx = (ay * W + ax) * 4;
            const gold = snap(239, 202, 40);
            winBuf[didx] = gold[0]; winBuf[didx + 1] = gold[1]; winBuf[didx + 2] = gold[2]; winBuf[didx + 3] = 255;
        }
    }

    // 4. Cursor (96,96 to 143,143): 48x48 9-slice cursor with 4-px border
    const curGoldLit = snap(255, 230, 80);
    const curGoldMid = snap(210, 160, 30);
    const curBack    = snap(45, 30, 15);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const didx = ((y + 96) * W + (x + 96)) * 4;
            if (x === 0 || x === 47 || y === 0 || y === 47) {
                winBuf[didx] = curGoldLit[0]; winBuf[didx + 1] = curGoldLit[1]; winBuf[didx + 2] = curGoldLit[2]; winBuf[didx + 3] = 255;
            } else if (x <= 3 || x >= 44 || y <= 3 || y >= 44) {
                winBuf[didx] = curGoldMid[0]; winBuf[didx + 1] = curGoldMid[1]; winBuf[didx + 2] = curGoldMid[2]; winBuf[didx + 3] = 255;
            } else {
                winBuf[didx] = curBack[0]; winBuf[didx + 1] = curBack[1]; winBuf[didx + 2] = curBack[2]; winBuf[didx + 3] = 255;
            }
        }
    }

    // 5. Pause Sign (144,96 to 191,143): 4 frames of 24x24
    for (let frame = 0; frame < 4; frame++) {
        const fx = 144 + (frame % 2) * 24;
        const fy = 96 + Math.floor(frame / 2) * 24;
        const yOff = frame;
        for (let dy = 0; dy < 6; dy++) {
            for (let dx = -(5 - dy); dx <= (5 - dy); dx++) {
                const ax = fx + 12 + dx;
                const ay = fy + 9 + yOff + dy;
                if (ay < fy + 24) {
                    const didx = (ay * W + ax) * 4;
                    const pCol = snap(239, 202, 40);
                    winBuf[didx] = pCol[0]; winBuf[didx + 1] = pCol[1]; winBuf[didx + 2] = pCol[2]; winBuf[didx + 3] = 255;
                }
            }
        }
    }

    // 6. Text Colors (96,144 to 191,191): 8 columns x 4 rows of 12x12 chips
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 8; c++) {
            const colorIdx = r * 8 + c;
            const rgb = TEXT_COLORS[colorIdx];
            for (let dy = 0; dy < 12; dy++) {
                for (let dx = 0; dx < 12; dx++) {
                    const px = 96 + c * 12 + dx;
                    const py = 144 + r * 12 + dy;
                    const didx = (py * W + px) * 4;
                    winBuf[didx] = rgb[0];
                    winBuf[didx + 1] = rgb[1];
                    winBuf[didx + 2] = rgb[2];
                    winBuf[didx + 3] = 255;
                }
            }
        }
    }

    // Quantize the non-text-color portion to <= 20 colors
    // First snap everything to uf.hex
    for (let i = 0; i < winBuf.length; i += 4) {
        if (winBuf[i + 3] === 0) continue;
        const sn = snap(winBuf[i], winBuf[i + 1], winBuf[i + 2]);
        winBuf[i] = sn[0];
        winBuf[i + 1] = sn[1];
        winBuf[i + 2] = sn[2];
    }

    // Save window skin to game/img/system/
    const winSysPath = path.join(ROOT, 'game', 'img', 'system', `Window_${f.id}.png`);
    writePNG(winSysPath, W, H, winBuf);

    // Save master and sidecar to art/masters/
    const winMasterPath = path.join(ROOT, 'art', 'masters', `Window_${f.id}.png`);
    writePNG(winMasterPath, W, H, winBuf);

    const winSidecar = {
        name: `Window_${f.id}`,
        about: `Authentic ${f.label} menu windowskin generated via Google Nano Banana Pro.`,
        author: "Gemini (Google Nano Banana Pro)",
        date: "2026-09-19",
        frameWidth: 192,
        frameHeight: 192,
        skin: {
            frameMargin: 24,
            cursorMargin: 4,
            swatches: [96, 144, 12, 8, 4]
        },
        culture: f.id,
        bgm: f.bgm
    };
    fs.writeFileSync(path.join(ROOT, 'art', 'masters', `Window_${f.id}.json`), JSON.stringify(winSidecar, null, 2));

    console.log(`Saved ${winSysPath} and ${winMasterPath}`);
}

// Update game/img/system/Window.png and Window_main.png from Window_human.png
fs.copyFileSync(path.join(ROOT, 'game', 'img', 'system', 'Window_human.png'), path.join(ROOT, 'game', 'img', 'system', 'Window.png'));
fs.copyFileSync(path.join(ROOT, 'game', 'img', 'system', 'Window_human.png'), path.join(ROOT, 'game', 'img', 'system', 'Window_main.png'));
fs.copyFileSync(path.join(ROOT, 'art', 'masters', 'Window_human.png'), path.join(ROOT, 'art', 'masters', 'Window.png'));

console.log('\n=== Generating Showcase Review Images ===');
const revDir = path.join(ROOT, 'art', 'review');
fs.mkdirSync(revDir, { recursive: true });

// Showcase 1: All 11 Face Sets Lineup (11 rows of 576x288, scaled 0.5x or grid)
// Let's create an 11-row grid: 11 rows of 4 faces (Adult Male, Adult Female, Elder Male, Elder Female) = 4 * 144 = 576w x 11 * 144 = 1584h
const SHOW_W = 576;
const SHOW_H = FACTIONS.length * 144;
const faceShowcaseBuf = Buffer.alloc(SHOW_W * SHOW_H * 4);

for (let fi = 0; fi < FACTIONS.length; fi++) {
    const fid = FACTIONS[fi].id;
    const fSheet = decodePNG(fs.readFileSync(path.join(ROOT, 'game', 'img', 'faces', `UF_Faces_${fid}_1.png`)));
    const yOff = fi * 144;
    // Copy top row (first 4 faces)
    for (let y = 0; y < 144; y++) {
        for (let x = 0; x < 576; x++) {
            const sidx = (y * 576 + x) * 4;
            const didx = ((yOff + y) * SHOW_W + x) * 4;
            faceShowcaseBuf[didx] = fSheet.data[sidx];
            faceShowcaseBuf[didx + 1] = fSheet.data[sidx + 1];
            faceShowcaseBuf[didx + 2] = fSheet.data[sidx + 2];
            faceShowcaseBuf[didx + 3] = 255;
        }
    }
}
const faceShowcasePath = path.join(revDir, 'all_factions_facesets_showcase.png');
writePNG(faceShowcasePath, SHOW_W, SHOW_H, faceShowcaseBuf);
console.log(`Saved facesets showcase: ${faceShowcasePath} (${SHOW_W}x${SHOW_H})`);

// Showcase 2: All 11 Window Skins Showcase (4 columns x 3 rows of 192x192 = 768w x 576h)
const WIN_GRID_W = 4 * 192; // 768
const WIN_GRID_H = 3 * 192; // 576
const winShowcaseBuf = Buffer.alloc(WIN_GRID_W * WIN_GRID_H * 4);

for (let fi = 0; fi < FACTIONS.length; fi++) {
    const fid = FACTIONS[fi].id;
    const wImg = decodePNG(fs.readFileSync(path.join(ROOT, 'game', 'img', 'system', `Window_${fid}.png`)));
    const gx = (fi % 4) * 192;
    const gy = Math.floor(fi / 4) * 192;
    for (let y = 0; y < 192; y++) {
        for (let x = 0; x < 192; x++) {
            const sidx = (y * 192 + x) * 4;
            const didx = ((gy + y) * WIN_GRID_W + (gx + x)) * 4;
            winShowcaseBuf[didx] = wImg.data[sidx];
            winShowcaseBuf[didx + 1] = wImg.data[sidx + 1];
            winShowcaseBuf[didx + 2] = wImg.data[sidx + 2];
            winShowcaseBuf[didx + 3] = wImg.data[sidx + 3];
        }
    }
}
const winShowcasePath = path.join(revDir, 'all_factions_menu_themes_showcase.png');
writePNG(winShowcasePath, WIN_GRID_W, WIN_GRID_H, winShowcaseBuf);
console.log(`Saved menu themes showcase: ${winShowcasePath} (${WIN_GRID_W}x${WIN_GRID_H})`);

console.log('\n=== Updating UF_WorldCatalog.json with Faction Menu BGM and Face Sheets ===');
const catalogPath = path.join(ROOT, 'game', 'data', 'UF_WorldCatalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

if (catalog.skins && catalog.skins.cultures) {
    for (const f of FACTIONS) {
        if (catalog.skins.cultures[f.id]) {
            catalog.skins.cultures[f.id].bgm = { name: f.bgm, pan: 0, pitch: 100, volume: 90 };
        }
    }
}
if (catalog.cultures) {
    for (const f of FACTIONS) {
        if (catalog.cultures[f.id]) {
            catalog.cultures[f.id].themeBgm = { name: f.bgm, pan: 0, pitch: 100, volume: 90 };
        }
    }
}

fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
console.log('Successfully updated UF_WorldCatalog.json');

console.log('\n=== BUILD COMPLETE ===');
