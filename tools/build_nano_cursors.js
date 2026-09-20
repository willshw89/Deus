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
    const tmpPng = path.join(os.tmpdir(), `tmp_cur_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${jpgPath.replace(/'/g, "''")}'); $img.Save('${tmpPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    const buf = fs.readFileSync(tmpPng);
    try { fs.unlinkSync(tmpPng); } catch(e) {}
    return decodePNG(buf, path.basename(jpgPath));
}

const rawPath = 'C:/Users/snewt/.gemini/antigravity/brain/f9b9af6f-1902-44c2-8bc1-fe9d0fdadb45/faction_cursors_sheet_1789865322131.jpg';
const src = loadJpg(rawPath);

const COLS = 4;
const ROWS = 3;
const cellW = src.width / COLS;
const cellH = src.height / ROWS;

const FACTIONS = [
    'human', 'elf', 'dwarf', 'gnome',
    'goblin', 'orc', 'lizardfolk', 'kobold',
    'undead', 'starborn', 'swarm'
];

function isMagenta(r, g, b) {
    // Magenta is high R, low G, high B
    // Also catch compression artifacts: (r - g > 60 && b - g > 60)
    return (r > 150 && g < 90 && b > 150) || (r - g > 75 && b - g > 75);
}

const TARGET_SIZE = 48;
const showcaseW = 11 * 48;
const showcaseH = 48;
const showcaseBuf = Buffer.alloc(showcaseW * showcaseH * 4);

for (let idx = 0; idx < FACTIONS.length; idx++) {
    const fac = FACTIONS[idx];
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);

    const x0 = Math.floor(col * cellW);
    const y0 = Math.floor(row * cellH);
    const x1 = Math.floor((col + 1) * cellW);
    const y1 = Math.floor((row + 1) * cellH);

    // Find bounding box
    let minX = x1, maxX = x0, minY = y1, maxY = y0;
    for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
            const i = (y * src.width + x) * 4;
            const r = src.data[i], g = src.data[i + 1], b = src.data[i + 2];
            if (!isMagenta(r, g, b)) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    const bboxW = (maxX - minX) + 1;
    const bboxH = (maxY - minY) + 1;

    const curBuf = Buffer.alloc(TARGET_SIZE * TARGET_SIZE * 4);

    const maxDim = Math.max(bboxW, bboxH);
    const scale = 40 / maxDim;
    const drawW = Math.round(bboxW * scale);
    const drawH = Math.round(bboxH * scale);

    const offsetX = 4;
    const offsetY = 4;

    for (let dy = 0; dy < drawH; dy++) {
        for (let dx = 0; dx < drawW; dx++) {
            const sx0 = Math.floor(minX + dx / scale);
            const sx1 = Math.floor(minX + (dx + 1) / scale);
            const sy0 = Math.floor(minY + dy / scale);
            const sy1 = Math.floor(minY + (dy + 1) / scale);

            let sr = 0, sg = 0, sb = 0, solidCount = 0, totalCount = 0;
            for (let sy = sy0; sy < sy1 && sy < src.height; sy++) {
                for (let sx = sx0; sx < sx1 && sx < src.width; sx++) {
                    const si = (sy * src.width + sx) * 4;
                    const r = src.data[si], g = src.data[si + 1], b = src.data[si + 2];
                    totalCount++;
                    if (!isMagenta(r, g, b)) {
                        sr += r; sg += g; sb += b; solidCount++;
                    }
                }
            }

            // Only draw if more than half the source footprint was solid (prevents fuzzy edges)
            if (solidCount > 0 && (solidCount / totalCount >= 0.45)) {
                const tx = offsetX + dx;
                const ty = offsetY + dy;
                if (tx < TARGET_SIZE && ty < TARGET_SIZE) {
                    const avgR = Math.round(sr / solidCount);
                    const avgG = Math.round(sg / solidCount);
                    const avgB = Math.round(sb / solidCount);
                    if (!isMagenta(avgR, avgG, avgB)) {
                        const sn = snap(avgR, avgG, avgB);
                        const di = (ty * TARGET_SIZE + tx) * 4;
                        curBuf[di] = sn[0];
                        curBuf[di + 1] = sn[1];
                        curBuf[di + 2] = sn[2];
                        curBuf[di + 3] = 255;
                    }
                }
            }
        }
    }

    quantizeBuffer(curBuf, 24);

    // Save game cursor: game/img/system/Cursor_<fac>.png
    const gameCurPath = path.join(ROOT, 'game', 'img', 'system', `Cursor_${fac}.png`);
    writePNG(gameCurPath, TARGET_SIZE, TARGET_SIZE, curBuf);

    // Save master cursor: art/masters/Cursor_<fac>.png
    const masterCurPath = path.join(ROOT, 'art', 'masters', `Cursor_${fac}.png`);
    writePNG(masterCurPath, TARGET_SIZE, TARGET_SIZE, curBuf);

    // Sidecar
    const sidecar = {
        name: `Cursor_${fac}`,
        culture: fac,
        about: `Nano Banana Pro 48x48 bespoke faction cursor for ${fac}.`,
        frameWidth: 48,
        frameHeight: 48,
        anchor: [2, 2],
        facings: ["S"],
        animations: { default: [0] },
        layer: "ui_cursor",
        palette: "art/palette/uf.hex"
    };
    fs.writeFileSync(path.join(ROOT, 'art', 'masters', `Cursor_${fac}.json`), JSON.stringify(sidecar, null, 2) + '\n', 'utf8');

    // Blit to showcase
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const si = (y * 48 + x) * 4;
            const di = (y * showcaseW + (idx * 48 + x)) * 4;
            showcaseBuf[di] = curBuf[si];
            showcaseBuf[di + 1] = curBuf[si + 1];
            showcaseBuf[di + 2] = curBuf[si + 2];
            showcaseBuf[di + 3] = curBuf[si + 3];
        }
    }
}

const showPath = path.join(ROOT, 'art', 'review', 'faction_cursors_showcase.png');
writePNG(showPath, showcaseW, showcaseH, showcaseBuf);
console.log(`Cleaned and saved 11 faction cursors to ${showPath}`);
