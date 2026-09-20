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
    const tmpPng = path.join(os.tmpdir(), `tmp_proc_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
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

const mImg = loadJpg('C:/Users/snewt/.gemini/antigravity/brain/f9b9af6f-1902-44c2-8bc1-fe9d0fdadb45/faces_human_males_1789863537057.jpg');
const fImg = loadJpg('C:/Users/snewt/.gemini/antigravity/brain/f9b9af6f-1902-44c2-8bc1-fe9d0fdadb45/faces_human_females_1789863654515.jpg');

// 6 Male crops
const males = [
    cropAndResize(mImg, 10, 10, 300, 405, 144, 144),  // Recruit
    cropAndResize(mImg, 325, 10, 300, 405, 144, 144), // Veteran Eyepatch
    cropAndResize(mImg, 640, 10, 300, 405, 144, 144), // Elder White Beard
    cropAndResize(mImg, 955, 10, 300, 405, 144, 144), // Hooded Ranger
    cropAndResize(mImg, 465, 430, 330, 405, 144, 144), // Scribe with Glasses
    cropAndResize(mImg, 900, 430, 330, 405, 144, 144)  // Burly Blacksmith
];

// 6 Female crops
const females = [
    cropAndResize(fImg, 10, 10, 300, 405, 144, 144),  // Archer Scout
    cropAndResize(fImg, 325, 10, 300, 405, 144, 144), // Shieldmaiden
    cropAndResize(fImg, 640, 10, 300, 405, 144, 144), // Matriarch
    cropAndResize(fImg, 955, 10, 300, 405, 144, 144), // Cheerful Tavern Girl
    cropAndResize(fImg, 35, 430, 330, 405, 144, 144),  // Apothecary Herbalist
    cropAndResize(fImg, 465, 430, 330, 405, 144, 144)  // Noble Lady Circlet
];

// 1. Build 12-Face Review Showcase (6 columns x 2 rows, 864 x 288 px)
const showW = 864, showH = 288;
const showBuf = Buffer.alloc(showW * showH * 4);
for (let i = 0; i < 6; i++) {
    // Top row: Males
    const mCell = males[i];
    for (let cy = 0; cy < 144; cy++) {
        for (let cx = 0; cx < 144; cx++) {
            const si = (cy * 144 + cx) * 4;
            const di = (cy * showW + (i * 144 + cx)) * 4;
            showBuf[di] = mCell[si]; showBuf[di + 1] = mCell[si + 1]; showBuf[di + 2] = mCell[si + 2]; showBuf[di + 3] = 255;
        }
    }
    // Bottom row: Females
    const fCell = females[i];
    for (let cy = 0; cy < 144; cy++) {
        for (let cx = 0; cx < 144; cx++) {
            const si = (cy * 144 + cx) * 4;
            const di = ((144 + cy) * showW + (i * 144 + cx)) * 4;
            showBuf[di] = fCell[si]; showBuf[di + 1] = fCell[si + 1]; showBuf[di + 2] = fCell[si + 2]; showBuf[di + 3] = 255;
        }
    }
}
quantizeBuffer(showBuf, 32);
const reviewPath = path.join(ROOT, 'art', 'review', 'faces_12_human.png');
writePNG(reviewPath, showW, showH, showBuf);
console.log('Saved 12-face review showcase to art/review/faces_12_human.png');

// 2. Build RMMZ Sheet 1 (UF_Faces_human_1.png): 4 Males (top), 4 Females (bottom)
const sheet1Buf = Buffer.alloc(576 * 288 * 4);
const s1_cells = [males[0], males[1], males[2], males[3], females[0], females[1], females[2], females[3]];
for (let i = 0; i < 8; i++) {
    const col = i % 4, row = Math.floor(i / 4);
    const cell = s1_cells[i];
    for (let cy = 0; cy < 144; cy++) {
        for (let cx = 0; cx < 144; cx++) {
            const si = (cy * 144 + cx) * 4;
            const di = (((row * 144) + cy) * 576 + ((col * 144) + cx)) * 4;
            sheet1Buf[di] = cell[si]; sheet1Buf[di + 1] = cell[si + 1]; sheet1Buf[di + 2] = cell[si + 2]; sheet1Buf[di + 3] = 255;
        }
    }
}
quantizeBuffer(sheet1Buf, 32);
writePNG(path.join(ROOT, 'game', 'img', 'faces', 'UF_Faces_human_1.png'), 576, 288, sheet1Buf);
writePNG(path.join(ROOT, 'art', 'masters', 'face_human_1.png'), 576, 288, sheet1Buf);

// 3. Build RMMZ Sheet 2 (UF_Faces_human_2.png): Males 5, 6, +2, Females 5, 6, +2
// For indices 2, 3, 6, 7 we include the alternate 7th crop (Scout / Craftswoman) and champion variants
const mExtra = cropAndResize(mImg, 40, 430, 330, 405, 144, 144); // Scout
const fExtra = cropAndResize(fImg, 900, 430, 330, 405, 144, 144); // Craftswoman
const s2_cells = [males[4], males[5], mExtra, males[1], females[4], females[5], fExtra, females[1]];
const sheet2Buf = Buffer.alloc(576 * 288 * 4);
for (let i = 0; i < 8; i++) {
    const col = i % 4, row = Math.floor(i / 4);
    const cell = s2_cells[i];
    for (let cy = 0; cy < 144; cy++) {
        for (let cx = 0; cx < 144; cx++) {
            const si = (cy * 144 + cx) * 4;
            const di = (((row * 144) + cy) * 576 + ((col * 144) + cx)) * 4;
            sheet2Buf[di] = cell[si]; sheet2Buf[di + 1] = cell[si + 1]; sheet2Buf[di + 2] = cell[si + 2]; sheet2Buf[di + 3] = 255;
        }
    }
}
quantizeBuffer(sheet2Buf, 32);
writePNG(path.join(ROOT, 'game', 'img', 'faces', 'UF_Faces_human_2.png'), 576, 288, sheet2Buf);
writePNG(path.join(ROOT, 'art', 'masters', 'face_human_2.png'), 576, 288, sheet2Buf);

console.log('Successfully processed Human 12 faces!');
