const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// 1. Read palette
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

// Filter palette for Bog Horror: swamp peat brown, mossy olive green, mud, willow wood, pale wisps (no purple/magenta/cyan)
const validBogPalette = palette.filter(c => {
    const [r, g, b] = c;
    if (b > g + 20 && b > 60) return false;
    if (b > r + 30 && b > 80) return false;
    if (r > 150 && g < 80 && b < 80) return false; // avoid red bodies
    return true;
});

const bogPaletteLab = validBogPalette.map(c => rgbToLab(c[0], c[1], c[2]));

function snapColor(r, g, b) {
    const lab = rgbToLab(r, g, b);
    let bestDist = Infinity;
    let bestIdx = 0;
    for (let i = 0; i < bogPaletteLab.length; i++) {
        const pl = bogPaletteLab[i];
        const dL = lab[0] - pl[0];
        const da = lab[1] - pl[1];
        const db = lab[2] - pl[2];
        const dist = dL * dL + da * da + db * db;
        if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
        }
    }
    return validBogPalette[bestIdx];
}

function loadJpg(jpgPath) {
    const tmpPng = path.join(os.tmpdir(), `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${jpgPath.replace(/'/g, "''")}'); $img.Save('${tmpPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    const buf = fs.readFileSync(tmpPng);
    try { fs.unlinkSync(tmpPng); } catch (e) {}
    return decodePNG(buf, path.basename(jpgPath));
}

// Target height for Bog Horror: 68 px tall (64–72 px tall per ART_STANDARD §2)
function processFacing(img, name, targetH = 68) {
    console.log(`Processing ${name}: source ${img.width}x${img.height}`);
    
    let minX = img.width, maxX = 0, minY = img.height, maxY = 0;
    const isMagenta = (r, g, b) => (b > g + 20 && (b > 60 || r > 100)) || (r > 160 && g < 90 && b > 140);

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

    const scale = targetH / bboxH;
    let targetW = Math.round(bboxW * scale);
    if (targetW > 84) targetW = 84;
    const startX = Math.round(48 - targetW / 2);
    const startY = 95 - targetH + 1; // Grounded on bottom row 95
    console.log(`  Mapped to 96x96: ${targetW}x${targetH} at startX=${startX}, startY=${startY}`);

    const out96 = Buffer.alloc(96 * 96 * 4);

    for (let dy = 0; dy < targetH; dy++) {
        const outY = startY + dy;
        const srcY0 = minY + Math.floor(dy / scale);
        const srcY1 = minY + Math.floor((dy + 1) / scale);

        for (let dx = 0; dx < targetW; dx++) {
            const outX = startX + dx;
            if (outX < 0 || outX >= 96) continue;

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

            const outIdx = (outY * 96 + outX) * 4;
            const totalSamples = Math.max(1, (srcY1 - srcY0) * (srcX1 - srcX0));
            if (count > totalSamples * 0.35) {
                const avgR = Math.round(sumR / count);
                const avgG = Math.round(sumG / count);
                const avgB = Math.round(sumB / count);
                const snapped = snapColor(avgR, avgG, avgB);
                out96[outIdx] = snapped[0];
                out96[outIdx + 1] = snapped[1];
                out96[outIdx + 2] = snapped[2];
                out96[outIdx + 3] = 255;
            } else {
                out96[outIdx + 3] = 0;
            }
        }
    }

    return out96;
}

function createIdleFrames(baseFrame) {
    const frames = [baseFrame];

    // Frame 1: Torso mud/reed sag and heave 1 px (rows 27..86), feet grounded
    const f1 = Buffer.alloc(96 * 96 * 4);
    baseFrame.copy(f1);
    for (let y = 27; y < 87; y++) {
        for (let x = 0; x < 96; x++) {
            const nextIdx = ((y + 1) * 96 + x) * 4;
            const curIdx = (y * 96 + x) * 4;
            if (baseFrame[nextIdx + 3] > 0) {
                f1[curIdx]     = baseFrame[nextIdx];
                f1[curIdx + 1] = baseFrame[nextIdx + 1];
                f1[curIdx + 2] = baseFrame[nextIdx + 2];
                f1[curIdx + 3] = baseFrame[nextIdx + 3];
            } else if (baseFrame[curIdx + 3] > 0 && y < 32) {
                f1[curIdx + 3] = 0;
            }
        }
    }
    // Keep feet on rows 87..95 anchored
    for (let y = 87; y < 96; y++) {
        for (let x = 0; x < 96; x++) {
            const idx = (y * 96 + x) * 4;
            f1[idx]     = baseFrame[idx];
            f1[idx + 1] = baseFrame[idx + 1];
            f1[idx + 2] = baseFrame[idx + 2];
            f1[idx + 3] = baseFrame[idx + 3];
        }
    }
    frames.push(f1);

    // Frame 2: Drooping vine/moss drip twitch at rows 70..92
    const f2 = Buffer.alloc(96 * 96 * 4);
    baseFrame.copy(f2);
    for (let y = 70; y < 92; y++) {
        for (let x = 12; x <= 84; x++) {
            if ((x >= 14 && x <= 28) || (x >= 68 && x <= 82)) {
                const idx = (y * 96 + x) * 4;
                if (f2[idx + 3] > 0) {
                    const prevIdx = (y * 96 + (x - 1)) * 4;
                    if (baseFrame[prevIdx + 3] > 0) {
                        f2[idx]     = baseFrame[prevIdx];
                        f2[idx + 1] = baseFrame[prevIdx + 1];
                        f2[idx + 2] = baseFrame[prevIdx + 2];
                    }
                }
            }
        }
    }
    frames.push(f2);

    return frames;
}

function mirrorFrame(buf) {
    const out = Buffer.alloc(96 * 96 * 4);
    for (let y = 0; y < 96; y++) {
        for (let x = 0; x < 96; x++) {
            const srcIdx = (y * 96 + x) * 4;
            const dstIdx = (y * 96 + (95 - x)) * 4;
            out[dstIdx] = buf[srcIdx];
            out[dstIdx + 1] = buf[srcIdx + 1];
            out[dstIdx + 2] = buf[srcIdx + 2];
            out[dstIdx + 3] = buf[srcIdx + 3];
        }
    }
    return out;
}

module.exports = {
    loadJpg,
    processFacing,
    createIdleFrames,
    mirrorFrame,
    rgbToLab,
    snapColor,
    validBogPalette
};
