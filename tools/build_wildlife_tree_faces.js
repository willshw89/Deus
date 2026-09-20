const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');
const paletteLines = fs.readFileSync(PALETTE_FILE, 'utf8').trim().split(/\r?\n/);
const PALETTE = paletteLines.map(line => {
    const hex = line.trim().replace('#', '');
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
});

function srgbToLab(r, g, b) {
    const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const R = lin(r), G = lin(g), B = lin(b);
    const X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
    const Y = (R * 0.2126729 + G * 0.7151522 + B * 0.0721750);
    const Z = (R * 0.0193339 + G * 0.1191920 + B * 0.9503041) / 1.08883;
    const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (t * 24389 / 27 + 16) / 116);
    return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
const palLab = PALETTE.map(c => srgbToLab(...c));

function snap(r, g, b) {
    const l = srgbToLab(r, g, b);
    let best = PALETTE[0], bd = Infinity;
    for (let i = 0; i < PALETTE.length; i++) {
        const d = Math.hypot(l[0] - palLab[i][0], l[1] - palLab[i][1], l[2] - palLab[i][2]);
        if (d < bd) { bd = d; best = PALETTE[i]; }
    }
    return best;
}

function quantizeBuffer(buf, maxColors) {
    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 0) continue;
        const s = snap(buf[i], buf[i + 1], buf[i + 2]);
        buf[i] = s[0]; buf[i + 1] = s[1]; buf[i + 2] = s[2]; buf[i + 3] = 255;
    }
    const counts = new Map();
    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 0) continue;
        const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
        counts.set(k, (counts.get(k) || 0) + 1);
    }
    while (counts.size > maxColors) {
        let minCount = Infinity, minKey = null;
        for (const [k, c] of counts.entries()) {
            if (c < minCount) { minCount = c; minKey = k; }
        }
        const r1 = (minKey >> 16) & 255, g1 = (minKey >> 8) & 255, b1 = minKey & 255;
        const lab1 = srgbToLab(r1, g1, b1);
        let bestDist = Infinity, bestKey = null;
        for (const [k, _] of counts.entries()) {
            if (k === minKey) continue;
            const r2 = (k >> 16) & 255, g2 = (k >> 8) & 255, b2 = k & 255;
            const d = Math.hypot(lab1[0] - srgbToLab(r2, g2, b2)[0], lab1[1] - srgbToLab(r2, g2, b2)[1], lab1[2] - srgbToLab(r2, g2, b2)[2]);
            if (d < bestDist) { bestDist = d; bestKey = k; }
        }
        counts.set(bestKey, counts.get(bestKey) + counts.get(minKey));
        counts.delete(minKey);
        const nr = (bestKey >> 16) & 255, ng = (bestKey >> 8) & 255, nb = bestKey & 255;
        for (let i = 0; i < buf.length; i += 4) {
            const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
            if (k === minKey) { buf[i] = nr; buf[i + 1] = ng; buf[i + 2] = nb; }
        }
    }
}

function loadJpg(jpgPath) {
    const tmpPng = path.join(os.tmpdir(), `tmp_wt_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${jpgPath.replace(/'/g, "''")}'); $img.Save('${tmpPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    const buf = fs.readFileSync(tmpPng);
    try { fs.unlinkSync(tmpPng); } catch(e) {}
    return decodePNG(buf, path.basename(jpgPath));
}

function cropAndResize(src, sx, sy, sw, sh, tw, th) {
    const out = Buffer.alloc(tw * th * 4);
    for (let y = 0; y < th; y++) {
        const y0 = Math.floor(sy + y * sh / th);
        const y1 = Math.floor(sy + (y + 1) * sh / th);
        for (let x = 0; x < tw; x++) {
            const x0 = Math.floor(sx + x * sw / tw);
            const x1 = Math.floor(sx + (x + 1) * sw / tw);
            let sr = 0, sg = 0, sb = 0, count = 0;
            for (let py = y0; py < y1 && py < src.height; py++) {
                for (let px = x0; px < x1 && px < src.width; px++) {
                    const idx = (py * src.width + px) * 4;
                    sr += src.data[idx]; sg += src.data[idx + 1]; sb += src.data[idx + 2]; count++;
                }
            }
            const sn = snap(Math.round(sr / count), Math.round(sg / count), Math.round(sb / count));
            const o = (y * tw + x) * 4;
            out[o] = sn[0]; out[o + 1] = sn[1]; out[o + 2] = sn[2]; out[o + 3] = 255;
        }
    }
    return out;
}

const sets = [
    {
        id: 'wildlife_beasts',
        gameFile: 'UF_Faces_Wildlife_Beasts.png',
        masterFile: 'face_wildlife_beasts',
        jpgFile: 'C:/Users/snewt/.gemini/antigravity/brain/f9b9af6f-1902-44c2-8bc1-fe9d0fdadb45/faces_wildlife_beasts_1789865352323.jpg',
        species: 'wildlife',
        names: ['Stag', 'Boar', 'Wolf', 'Fox', 'Bear', 'Hare', 'Falcon', 'Wildcat']
    },
    {
        id: 'wildlife_monsters',
        gameFile: 'UF_Faces_Wildlife_Monsters.png',
        masterFile: 'face_wildlife_monsters',
        jpgFile: 'C:/Users/snewt/.gemini/antigravity/brain/f9b9af6f-1902-44c2-8bc1-fe9d0fdadb45/faces_wildlife_monsters_1789865425692.jpg',
        species: 'monster',
        names: ['Crag Troll', 'Bog Horror', 'Giant Spider', 'Sand Stalker', 'Cavern Bat', 'Restless Dead', 'Ice Wraith', 'Aurochs']
    },
    {
        id: 'trees_nature',
        gameFile: 'UF_Faces_Trees_Nature.png',
        masterFile: 'face_trees_nature',
        jpgFile: 'C:/Users/snewt/.gemini/antigravity/brain/f9b9af6f-1902-44c2-8bc1-fe9d0fdadb45/faces_trees_nature_1789865472289.jpg',
        species: 'flora',
        names: ['Grand Oak', 'Silver Birch', 'Highland Pine', 'Fruit Tree', 'Date Palm', 'Swamp Willow', 'Blighted Tree', 'Tower-Cap']
    }
];

const SHEET_W = 576;
const SHEET_H = 288;
const showTotalH = SHEET_H * sets.length; // 288 * 3 = 864
const showTotalBuf = Buffer.alloc(SHEET_W * showTotalH * 4);

for (let sIdx = 0; sIdx < sets.length; sIdx++) {
    const s = sets[sIdx];
    console.log(`\nProcessing ${s.id}...`);
    const src = loadJpg(s.jpgFile);
    console.log(`Loaded ${src.width}x${src.height}`);

    const cellW = src.width / 4;
    const cellH = src.height / 2;

    const sheetBuf = Buffer.alloc(SHEET_W * SHEET_H * 4);

    for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 4; c++) {
            const sx = Math.floor(c * cellW + 10);
            const sy = Math.floor(r * cellH + 10);
            const sw = Math.floor(cellW - 20);
            const sh = Math.floor(cellH - 20);

            const cell = cropAndResize(src, sx, sy, sw, sh, 144, 144);

            for (let cy = 0; cy < 144; cy++) {
                for (let cx = 0; cx < 144; cx++) {
                    const si = (cy * 144 + cx) * 4;
                    const di = (((r * 144) + cy) * SHEET_W + ((c * 144) + cx)) * 4;
                    sheetBuf[di] = cell[si];
                    sheetBuf[di + 1] = cell[si + 1];
                    sheetBuf[di + 2] = cell[si + 2];
                    sheetBuf[di + 3] = 255;
                }
            }
        }
    }

    quantizeBuffer(sheetBuf, 32);

    // Save game sheet
    const gamePath = path.join(ROOT, 'game', 'img', 'faces', s.gameFile);
    writePNG(gamePath, SHEET_W, SHEET_H, sheetBuf);
    console.log(`Saved game face sheet: ${gamePath}`);

    // Save master sheet
    const masterPath = path.join(ROOT, 'art', 'masters', `${s.masterFile}.png`);
    writePNG(masterPath, SHEET_W, SHEET_H, sheetBuf);
    console.log(`Saved master face sheet: ${masterPath}`);

    // Sidecar
    const sidecar = {
        name: s.masterFile,
        culture: s.species,
        species: s.species,
        layer: 'face',
        stage: 'adult',
        frameWidth: 144,
        frameHeight: 144,
        anchor: [72, 144],
        facings: ["S", "N"],
        animations: {
            neutral: [0, 1, 2, 3]
        },
        portraits: s.names.map((n, i) => ({ index: i, name: n }))
    };
    fs.writeFileSync(path.join(ROOT, 'art', 'masters', `${s.masterFile}.json`), JSON.stringify(sidecar, null, 2) + '\n', 'utf8');

    // Blit to showTotalBuf
    for (let y = 0; y < SHEET_H; y++) {
        for (let x = 0; x < SHEET_W; x++) {
            const si = (y * SHEET_W + x) * 4;
            const di = (((sIdx * SHEET_H) + y) * SHEET_W + x) * 4;
            showTotalBuf[di] = sheetBuf[si];
            showTotalBuf[di + 1] = sheetBuf[si + 1];
            showTotalBuf[di + 2] = sheetBuf[si + 2];
            showTotalBuf[di + 3] = 255;
        }
    }
}

const showPath = path.join(ROOT, 'art', 'review', 'faces_wildlife_trees_showcase.png');
writePNG(showPath, SHEET_W, showTotalH, showTotalBuf);
console.log(`\nSUCCESS: Saved 24 Wildlife & Trees faces showcase to ${showPath}`);
