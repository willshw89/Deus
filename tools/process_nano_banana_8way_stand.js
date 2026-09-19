const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
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

const os = require('os');

// Process single facing JPG into a 48x48 RGBA buffer
function processFacing(img, name) {
    console.log(`Processing ${name}: ${img.width}x${img.height}`);
    
    // 1. Find bounding box of non-magenta pixels
    let minX = img.width, maxX = 0, minY = img.height, maxY = 0;
    const isMagenta = (r, g, b) => (r > 165 && g < 85 && b > 165);

    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
            const idx = (y * img.width + x) * 4;
            const r = img.data[idx];
            const g = img.data[idx + 1];
            const b = img.data[idx + 2];
            if (!isMagenta(r, g, b)) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    const bboxW = maxX - minX + 1;
    const bboxH = maxY - minY + 1;
    console.log(`  BBox: [${minX}, ${minY}] to [${maxX}, ${maxY}] (${bboxW}x${bboxH})`);

    // Target height: 46 pixels (rows 2 to 47), bottom row = 47
    const targetH = 46;
    const scale = targetH / bboxH;
    const targetW = Math.round(bboxW * scale);
    const startX = Math.round(24 - targetW / 2);
    const startY = 48 - targetH; // 2

    const out48 = Buffer.alloc(48 * 48 * 4); // RGBA

    for (let dy = 0; dy < targetH; dy++) {
        const outY = startY + dy;
        const srcY0 = minY + Math.floor(dy / scale);
        const srcY1 = minY + Math.floor((dy + 1) / scale);

        for (let dx = 0; dx < targetW; dx++) {
            const outX = startX + dx;
            if (outX < 0 || outX >= 48) continue;

            const srcX0 = minX + Math.floor(dx / scale);
            const srcX1 = minX + Math.floor((dx + 1) / scale);

            let sumR = 0, sumG = 0, sumB = 0, count = 0;
            for (let sy = srcY0; sy < srcY1 && sy < img.height; sy++) {
                for (let sx = srcX0; sx < srcX1 && sx < img.width; sx++) {
                    const sidx = (sy * img.width + sx) * 4;
                    const r = img.data[sidx];
                    const g = img.data[sidx + 1];
                    const b = img.data[sidx + 2];
                    if (!isMagenta(r, g, b)) {
                        sumR += r; sumG += g; sumB += b;
                        count++;
                    }
                }
            }

            const outIdx = (outY * 48 + outX) * 4;
            if (count > (srcY1 - srcY0) * (srcX1 - srcX0) * 0.35) {
                const avgR = Math.round(sumR / count);
                const avgG = Math.round(sumG / count);
                const avgB = Math.round(sumB / count);
                const snapped = snapColor(avgR, avgG, avgB);
                out48[outIdx] = snapped[0];
                out48[outIdx + 1] = snapped[1];
                out48[outIdx + 2] = snapped[2];
                out48[outIdx + 3] = 255;
            } else {
                out48[outIdx + 3] = 0;
            }
        }
    }

    return out48;
}

// Load South from existing approved master
const southPng = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'human_male_stand_south.png')), 'south');
const frameSouth = Buffer.from(southPng.data);

// Load and process SW, W, NW, N from Nano Banana JPGs
const BRAIN = 'C:/Users/snewt/.gemini/antigravity/brain/3ffbd16e-0b90-4fbe-9345-ac504edad4c5';
const frameWest = processFacing(loadJpg(path.join(BRAIN, 'settler_male_west_1789834346241.jpg')), 'West');
const frameNorth = processFacing(loadJpg(path.join(BRAIN, 'settler_male_north_1789834658915.jpg')), 'North');
const frameSouthWest = processFacing(loadJpg(path.join(BRAIN, 'settler_male_southwest_1789834868442.jpg')), 'SouthWest');
const frameNorthWest = processFacing(loadJpg(path.join(BRAIN, 'settler_male_northwest_1789834909366.jpg')), 'NorthWest');

// Mirror function
function mirrorFrame(buf) {
    const out = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const srcIdx = (y * 48 + x) * 4;
            const dstIdx = (y * 48 + (47 - x)) * 4;
            out[dstIdx] = buf[srcIdx];
            out[dstIdx + 1] = buf[srcIdx + 1];
            out[dstIdx + 2] = buf[srcIdx + 2];
            out[dstIdx + 3] = buf[srcIdx + 3];
        }
    }
    return out;
}

const frameNorthEast = mirrorFrame(frameNorthWest);
const frameEast = mirrorFrame(frameWest);
const frameSouthEast = mirrorFrame(frameSouthWest);

// 8 facings in canonical order: S, SW, W, NW, N, NE, E, SE
const facings = [
    { id: 'S', buf: frameSouth },
    { id: 'SW', buf: frameSouthWest },
    { id: 'W', buf: frameWest },
    { id: 'NW', buf: frameNorthWest },
    { id: 'N', buf: frameNorth },
    { id: 'NE', buf: frameNorthEast },
    { id: 'E', buf: frameEast },
    { id: 'SE', buf: frameSouthEast }
];

// 1. Build 4x Raw Canvas (192 x 1536 px)
const rawW = 192;
const rawH = 192 * 8; // 1536
const rawBuf = Buffer.alloc(rawW * rawH * 4);

// Fill with magenta
for (let i = 0; i < rawW * rawH; i++) {
    rawBuf[i * 4] = 255;
    rawBuf[i * 4 + 1] = 0;
    rawBuf[i * 4 + 2] = 255;
    rawBuf[i * 4 + 3] = 255;
}

for (let r = 0; r < 8; r++) {
    const fBuf = facings[r].buf;
    const rowOffset = r * 192;
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sidx = (y * 48 + x) * 4;
            const a = fBuf[sidx + 3];
            if (a > 0) {
                const pr = fBuf[sidx], pg = fBuf[sidx + 1], pb = fBuf[sidx + 2];
                for (let dy = 0; dy < 4; dy++) {
                    for (let dx = 0; dx < 4; dx++) {
                        const didx = ((rowOffset + y * 4 + dy) * rawW + (x * 4 + dx)) * 4;
                        rawBuf[didx] = pr;
                        rawBuf[didx + 1] = pg;
                        rawBuf[didx + 2] = pb;
                        rawBuf[didx + 3] = 255;
                    }
                }
            }
        }
    }
}

const rawPath = path.join(ROOT, 'art', 'raw', 'human_male_stand.png');
writePNG(rawPath, rawW, rawH, rawBuf);
console.log(`Saved raw 8-way stand canvas: ${rawPath} (${rawW}x${rawH})`);

// 2. Build standard RMMZ 144x192 Charset ($UF_Human_Male.png)
// Layout: 3 columns x 4 rows (Down, Left, Right, Up)
// Cols: 0 (step1), 1 (stand), 2 (step2) - all stand for now
// Rows: 0 (Down/S), 1 (Left/W), 2 (Right/E), 3 (Up/N)
const rmmzW = 144;
const rmmzH = 192;
const rmmzBuf = Buffer.alloc(rmmzW * rmmzH * 4); // Transparent by default

const rmmzRows = [
    frameSouth, // Row 0: Down (S)
    frameWest,  // Row 1: Left (W)
    frameEast,  // Row 2: Right (E)
    frameNorth  // Row 3: Up (N)
];

for (let r = 0; r < 4; r++) {
    const fBuf = rmmzRows[r];
    for (let col = 0; col < 3; col++) {
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sidx = (y * 48 + x) * 4;
                if (fBuf[sidx + 3] > 0) {
                    const didx = ((r * 48 + y) * rmmzW + (col * 48 + x)) * 4;
                    rmmzBuf[didx] = fBuf[sidx];
                    rmmzBuf[didx + 1] = fBuf[sidx + 1];
                    rmmzBuf[didx + 2] = fBuf[sidx + 2];
                    rmmzBuf[didx + 3] = 255;
                }
            }
        }
    }
}

const rmmzCharsetPath = path.join(ROOT, 'game', 'img', 'characters', '$UF_Human_Male.png');
writePNG(rmmzCharsetPath, rmmzW, rmmzH, rmmzBuf);
console.log(`Saved RMMZ charset: ${rmmzCharsetPath} (${rmmzW}x${rmmzH})`);

console.log('Done processing 8-way stand!');
