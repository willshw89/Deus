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

// Convert jpg to png via PowerShell
function loadJpg(jpgPath) {
    const tmpPng = path.join(os.tmpdir(), `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${jpgPath.replace(/'/g, "''")}'); $img.Save('${tmpPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    const buf = fs.readFileSync(tmpPng);
    fs.unlinkSync(tmpPng);
    return decodePNG(buf, path.basename(jpgPath));
}

const jpgFile = 'C:/Users/snewt/.gemini/antigravity/brain/3ffbd16e-0b90-4fbe-9345-ac504edad4c5/settler_male_face_1789835056641.jpg';
const src = loadJpg(jpgFile);
console.log(`Loaded face JPG: ${src.width}x${src.height}`);

// Downsample 1024x1024 to 144x144
const targetSize = 144;
const faceBuf = Buffer.alloc(targetSize * targetSize * 4);
const scale = src.width / targetSize;

for (let y = 0; y < targetSize; y++) {
    const y0 = Math.floor(y * scale);
    const y1 = Math.floor((y + 1) * scale);
    for (let x = 0; x < targetSize; x++) {
        const x0 = Math.floor(x * scale);
        const x1 = Math.floor((x + 1) * scale);

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

        const avgR = Math.round(sumR / count);
        const avgG = Math.round(sumG / count);
        const avgB = Math.round(sumB / count);
        const snapped = snapColor(avgR, avgG, avgB);

        const outIdx = (y * targetSize + x) * 4;
        faceBuf[outIdx] = snapped[0];
        faceBuf[outIdx + 1] = snapped[1];
        faceBuf[outIdx + 2] = snapped[2];
        faceBuf[outIdx + 3] = 255;
    }
}

// Quantize to max 32 colors
function quantizeBuffer(buf, maxColors) {
    const counts = new Map();
    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 0) continue;
        const key = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
        counts.set(key, (counts.get(key) || 0) + 1);
    }
    console.log(`Initial distinct colors: ${counts.size}`);

    while (counts.size > maxColors) {
        // Find least used color
        let minCount = Infinity, minKey = null;
        for (const [k, c] of counts.entries()) {
            if (c < minCount) {
                minCount = c;
                minKey = k;
            }
        }
        const r1 = (minKey >> 16) & 255, g1 = (minKey >> 8) & 255, b1 = minKey & 255;
        const lab1 = rgbToLab(r1, g1, b1);

        // Find closest other color
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

        // Remap minKey -> bestKey
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
    console.log(`Quantized to ${counts.size} colors`);
}

quantizeBuffer(faceBuf, 32);

// Save standalone master face: 144x144
const masterFacePath = path.join(ROOT, 'art', 'masters', 'settler_male_face_144x144.png');
writePNG(masterFacePath, targetSize, targetSize, faceBuf);
console.log(`Saved master face: ${masterFacePath}`);

// Build standard RPG Maker MZ faceset sheet: 576x288 (4 columns x 2 rows of 144x144)
const sheetW = 4 * 144; // 576
const sheetH = 2 * 144; // 288
const sheetBuf = Buffer.alloc(sheetW * sheetH * 4); // default transparent

// Copy face to Slot 0 (col 0, row 0)
for (let y = 0; y < targetSize; y++) {
    for (let x = 0; x < targetSize; x++) {
        const sidx = (y * targetSize + x) * 4;
        const didx = (y * sheetW + x) * 4;
        sheetBuf[didx] = faceBuf[sidx];
        sheetBuf[didx + 1] = faceBuf[sidx + 1];
        sheetBuf[didx + 2] = faceBuf[sidx + 2];
        sheetBuf[didx + 3] = faceBuf[sidx + 3];
    }
}

const rmmzFacePath = path.join(ROOT, 'game', 'img', 'faces', 'UF_Settler_Male.png');
writePNG(rmmzFacePath, sheetW, sheetH, sheetBuf);
console.log(`Saved RMMZ faceset sheet: ${rmmzFacePath} (${sheetW}x${sheetH})`);

// Export 2x review render of the face
const r2xW = targetSize * 2;
const r2xH = targetSize * 2;
const r2xBuf = Buffer.alloc(r2xW * r2xH * 4);
for (let y = 0; y < targetSize; y++) {
    for (let x = 0; x < targetSize; x++) {
        const sidx = (y * targetSize + x) * 4;
        for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
                const didx = ((y * 2 + dy) * r2xW + (x * 2 + dx)) * 4;
                r2xBuf[didx] = faceBuf[sidx];
                r2xBuf[didx + 1] = faceBuf[sidx + 1];
                r2xBuf[didx + 2] = faceBuf[sidx + 2];
                r2xBuf[didx + 3] = faceBuf[sidx + 3];
            }
        }
    }
}

const reviewFacePath = path.join(ROOT, 'art', 'review', 'human_male_face_portrait_2x.png');
writePNG(reviewFacePath, r2xW, r2xH, r2xBuf);
const brainReviewFace = 'C:/Users/snewt/.gemini/antigravity/brain/3ffbd16e-0b90-4fbe-9345-ac504edad4c5/human_male_face_portrait_2x.png';
writePNG(brainReviewFace, r2xW, r2xH, r2xBuf);
console.log(`Saved 2x review render: ${reviewFacePath}`);
