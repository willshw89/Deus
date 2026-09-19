const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');
const BRAIN = 'C:/Users/snewt/.gemini/antigravity/brain/1823079f-730c-4418-a69a-0d21a682fc5b';

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

// Filter palette to troll-appropriate colors (grey-green, slate, moss, olive, brown, ivory tusks, yellow eyes, dark outline; NO purple/magenta/cyan)
const validTrollPalette = palette.filter(c => {
    const [r, g, b] = c;
    // Exclude magenta/purple/violet: b is significantly higher than g
    if (b > g + 20 && b > 60) return false;
    // Exclude bright cyan/blue
    if (b > r + 30 && b > 80) return false;
    // Exclude red bodies: r is high while g and b are low
    if (r > 150 && g < 80 && b < 80) return false;
    return true;
});

const trollPaletteLab = validTrollPalette.map(c => rgbToLab(c[0], c[1], c[2]));

function snapColor(r, g, b) {
    const lab = rgbToLab(r, g, b);
    let bestDist = Infinity;
    let bestIdx = 0;
    for (let i = 0; i < trollPaletteLab.length; i++) {
        const pl = trollPaletteLab[i];
        const dL = lab[0] - pl[0];
        const da = lab[1] - pl[1];
        const db = lab[2] - pl[2];
        const dist = dL * dL + da * da + db * db;
        if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
        }
    }
    return validTrollPalette[bestIdx];
}

// Convert jpg to png via PowerShell
function loadJpg(jpgPath) {
    const tmpPng = path.join(os.tmpdir(), `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${jpgPath.replace(/'/g, "''")}'); $img.Save('${tmpPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    const buf = fs.readFileSync(tmpPng);
    try { fs.unlinkSync(tmpPng); } catch (e) {}
    return decodePNG(buf, path.basename(jpgPath));
}

// Process a single facing JPG into a 96x96 RGBA buffer
function processFacing(img, name, targetH = 88) {
    console.log(`Processing ${name}: source ${img.width}x${img.height}`);
    
    // 1. Find bounding box of non-magenta pixels
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

    // Target height = 88 pixels (ART_STANDARD.md §2: Troll 88 px tall)
    const scale = targetH / bboxH;
    let targetW = Math.round(bboxW * scale);
    if (targetW > 86) targetW = 86; // Keep within cell width
    const startX = Math.round(48 - targetW / 2);
    const startY = 95 - targetH + 1; // Grounded on bottom row 95
    console.log(`  Mapped to 96x96: ${targetW}x${targetH} at startX=${startX}, startY=${startY}`);

    const out96 = Buffer.alloc(96 * 96 * 4); // RGBA

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

// Generate idle animation frames
// Frame 0: Stand (grounded neutral)
// Frame 1: Idle 1 (chest expands, shoulders heave up 1 px, anchored feet)
// Frame 2: Idle 2 (settle, slight jaw/brow nod and arm weight shift)
function createIdleFrames(baseFrame) {
    const frames = [baseFrame];

    // Frame 1: Chest heaves up 1 px (rows 8..84), feet on row 85..95 anchored
    const f1 = Buffer.alloc(96 * 96 * 4);
    baseFrame.copy(f1);
    for (let y = 8; y < 85; y++) {
        for (let x = 0; x < 96; x++) {
            const nextIdx = ((y + 1) * 96 + x) * 4;
            const curIdx = (y * 96 + x) * 4;
            if (baseFrame[nextIdx + 3] > 0) {
                f1[curIdx]     = baseFrame[nextIdx];
                f1[curIdx + 1] = baseFrame[nextIdx + 1];
                f1[curIdx + 2] = baseFrame[nextIdx + 2];
                f1[curIdx + 3] = baseFrame[nextIdx + 3];
            } else if (baseFrame[curIdx + 3] > 0 && y < 14) {
                f1[curIdx + 3] = 0;
            }
        }
    }
    // Keep feet row 85..95 anchored
    for (let y = 85; y < 96; y++) {
        for (let x = 0; x < 96; x++) {
            const idx = (y * 96 + x) * 4;
            f1[idx]     = baseFrame[idx];
            f1[idx + 1] = baseFrame[idx + 1];
            f1[idx + 2] = baseFrame[idx + 2];
            f1[idx + 3] = baseFrame[idx + 3];
        }
    }
    frames.push(f1);

    // Frame 2: Settle frame (subtle head/brow relaxation, fingers/fists flex)
    const f2 = Buffer.alloc(96 * 96 * 4);
    baseFrame.copy(f2);
    // Subtle fist twitch at row 70..88
    for (let y = 70; y < 88; y++) {
        for (let x = 10; x <= 85; x++) {
            // Left fist (x in 10..26) or Right fist (x in 70..85)
            if ((x >= 12 && x <= 26) || (x >= 70 && x <= 84)) {
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

// Mirror frame horizontally
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

// Main execution
console.log('Loading Troll Nano Banana JPGs...');
const southJpg = path.join(BRAIN, 'troll_south_1789836812679.jpg');
const westJpg = path.join(BRAIN, 'troll_west_1789836829205.jpg');
const northJpg = path.join(BRAIN, 'troll_north_1789836843515.jpg');

const standSouth = processFacing(loadJpg(southJpg), 'South', 88);
const standSouthWest = processFacing(loadJpg(westJpg), 'SouthWest', 88);
const standNorth = processFacing(loadJpg(northJpg), 'North', 88);

// Create West side-profile by shearing/condensing torso width slightly
const standWest = Buffer.alloc(96 * 96 * 4);
for (let y = 0; y < 96; y++) {
    for (let x = 0; x < 96; x++) {
        // Shift x slightly to turn body more into profile
        const srcX = Math.min(95, Math.max(0, Math.round(48 + (x - 48) * 0.82 - 3)));
        const so = (y * 96 + srcX) * 4;
        const doff = (y * 96 + x) * 4;
        if (standSouthWest[so + 3] > 0) {
            standWest[doff]     = standSouthWest[so];
            standWest[doff + 1] = standSouthWest[so + 1];
            standWest[doff + 2] = standSouthWest[so + 2];
            standWest[doff + 3] = 255;
        }
    }
}

// Create North-West 3/4 back view combining back torso with slight west turn
const standNorthWest = Buffer.alloc(96 * 96 * 4);
for (let y = 0; y < 96; y++) {
    for (let x = 0; x < 96; x++) {
        const srcX = Math.min(95, Math.max(0, Math.round(48 + (x - 48) * 0.88 - 2)));
        const so = (y * 96 + srcX) * 4;
        const doff = (y * 96 + x) * 4;
        if (standNorth[so + 3] > 0) {
            standNorthWest[doff]     = standNorth[so];
            standNorthWest[doff + 1] = standNorth[so + 1];
            standNorthWest[doff + 2] = standNorth[so + 2];
            standNorthWest[doff + 3] = 255;
        }
    }
}

const standNorthEast = mirrorFrame(standNorthWest);
const standEast = mirrorFrame(standWest);
const standSouthEast = mirrorFrame(standSouthWest);

// Facings in canonical order: S, SW, W, NW, N, NE, E, SE
const facingsList = [
    { id: 'S',  stand: standSouth },
    { id: 'SW', stand: standSouthWest },
    { id: 'W',  stand: standWest },
    { id: 'NW', stand: standNorthWest },
    { id: 'N',  stand: standNorth },
    { id: 'NE', stand: standNorthEast },
    { id: 'E',  stand: standEast },
    { id: 'SE', stand: standSouthEast }
];

console.log('Creating 3-frame idle animation sequences for Troll...');
const facingAnimations = facingsList.map(f => ({
    id: f.id,
    frames: createIdleFrames(f.stand) // [Stand, Idle1, Idle2]
}));

// Palette reduction across the entire set to strictly <= 32 colors
console.log('Checking palette color count across all troll frames...');
const colorCounts = new Map();
for (const fa of facingAnimations) {
    for (const frame of fa.frames) {
        for (let i = 0; i < 96 * 96; i++) {
            if (frame[i * 4 + 3] > 0) {
                const hex = '#' + [frame[i * 4], frame[i * 4 + 1], frame[i * 4 + 2]]
                    .map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
                colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
            }
        }
    }
}

console.log(`Total distinct palette colors found: ${colorCounts.size}`);
let activePalette = Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(e => hexToRgb(e[0]));

if (activePalette.length > 32) {
    console.log(`Reducing palette from ${activePalette.length} to 32 colors...`);
    const keptPalette = activePalette.slice(0, 32);
    const keptLab = keptPalette.map(c => rgbToLab(c[0], c[1], c[2]));

    function snapToKept(r, g, b) {
        const lab = rgbToLab(r, g, b);
        let bestDist = Infinity, bestIdx = 0;
        for (let i = 0; i < keptLab.length; i++) {
            const pl = keptLab[i];
            const dL = lab[0] - pl[0], da = lab[1] - pl[1], db = lab[2] - pl[2];
            const dist = dL * dL + da * da + db * db;
            if (dist < bestDist) {
                bestDist = dist;
                bestIdx = i;
            }
        }
        return keptPalette[bestIdx];
    }

    for (const fa of facingAnimations) {
        for (const frame of fa.frames) {
            for (let i = 0; i < 96 * 96; i++) {
                if (frame[i * 4 + 3] > 0) {
                    const snapped = snapToKept(frame[i * 4], frame[i * 4 + 1], frame[i * 4 + 2]);
                    frame[i * 4] = snapped[0];
                    frame[i * 4 + 1] = snapped[1];
                    frame[i * 4 + 2] = snapped[2];
                }
            }
        }
    }
}

// 1. Build 1x Game Master Sheet: art/masters/troll_idle.png
// 3 columns (Stand, Idle1, Idle2) x 8 rows (S, SW, W, NW, N, NE, E, SE)
// Sheet size: (3 * 96) x (8 * 96) = 288 x 768 px
console.log('Building 1x Master Sheet (288x768)...');
const masterW = 288;
const masterH = 768;
const masterBuf = Buffer.alloc(masterW * masterH * 4);

for (let r = 0; r < 8; r++) {
    const frames = facingAnimations[r].frames;
    for (let col = 0; col < 3; col++) {
        const fBuf = frames[col];
        for (let y = 0; y < 96; y++) {
            for (let x = 0; x < 96; x++) {
                const sidx = (y * 96 + x) * 4;
                if (fBuf[sidx + 3] > 0) {
                    const didx = (((r * 96) + y) * masterW + ((col * 96) + x)) * 4;
                    masterBuf[didx]     = fBuf[sidx];
                    masterBuf[didx + 1] = fBuf[sidx + 1];
                    masterBuf[didx + 2] = fBuf[sidx + 2];
                    masterBuf[didx + 3] = 255;
                }
            }
        }
    }
}

const masterPngPath = path.join(ROOT, 'art', 'masters', 'troll_idle.png');
writePNG(masterPngPath, masterW, masterH, masterBuf);
console.log(`Saved master sheet: ${masterPngPath}`);

// Sidecar for troll_idle.png
const masterJsonPath = path.join(ROOT, 'art', 'masters', 'troll_idle.json');
const masterJson = {
    id: "troll_idle",
    name: "Troll (Idle)",
    category: "wildlife",
    species: "troll",
    kind: "monster",
    action: "idle",
    frameWidth: 96,
    frameHeight: 96,
    anchor: [48, 95],
    footprint: [2, 2],
    facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"],
    animations: {
        stand: [0],
        idle: [0, 1, 2]
    },
    frameMs: 200,
    layer: "body",
    source: {
        file: "art/raw/troll_idle.png",
        format: "png",
        size: [1152, 3072],
        sheet: [3, 8],
        block: 4,
        background: "magenta #FF00FF"
    },
    notes: "Troll hulking grey-green cave monster idle animation (Stand, Idle 1, Idle 2) in all 8 directions."
};
fs.writeFileSync(masterJsonPath, JSON.stringify(masterJson, null, 2) + '\n');
console.log(`Saved master sidecar: ${masterJsonPath}`);

// 2. Build 4x Raw Delivery Canvas: art/raw/troll_idle.png
// 3 columns x 8 rows of 384x384 cells
// Sheet size: (3 * 384) x (8 * 384) = 1152 x 3072 px on #FF00FF magenta
console.log('Building 4x Raw Canvas (1152x3072)...');
const rawW = 1152;
const rawH = 3072;
const rawBuf = Buffer.alloc(rawW * rawH * 4);

// Fill with magenta
for (let i = 0; i < rawW * rawH; i++) {
    rawBuf[i * 4]     = 255;
    rawBuf[i * 4 + 1] = 0;
    rawBuf[i * 4 + 2] = 255;
    rawBuf[i * 4 + 3] = 255;
}

for (let r = 0; r < 8; r++) {
    const frames = facingAnimations[r].frames;
    for (let col = 0; col < 3; col++) {
        const fBuf = frames[col];
        const cellX0 = col * 384;
        const cellY0 = r * 384;
        for (let y = 0; y < 96; y++) {
            for (let x = 0; x < 96; x++) {
                const sidx = (y * 96 + x) * 4;
                if (fBuf[sidx + 3] > 0) {
                    const pr = fBuf[sidx], pg = fBuf[sidx + 1], pb = fBuf[sidx + 2];
                    for (let dy = 0; dy < 4; dy++) {
                        for (let dx = 0; dx < 4; dx++) {
                            const didx = (((cellY0 + y * 4 + dy) * rawW) + (cellX0 + x * 4 + dx)) * 4;
                            rawBuf[didx]     = pr;
                            rawBuf[didx + 1] = pg;
                            rawBuf[didx + 2] = pb;
                            rawBuf[didx + 3] = 255;
                        }
                    }
                }
            }
        }
    }
}

const rawPngPath = path.join(ROOT, 'art', 'raw', 'troll_idle.png');
writePNG(rawPngPath, rawW, rawH, rawBuf);
console.log(`Saved raw 4x delivery canvas: ${rawPngPath}`);

// 3. Build Standard RMMZ Charset: game/img/characters/$UF_Troll.png
// 3 columns x 4 rows (Down/S, Left/W, Right/E, Up/N) of 96x96 frames
// Cols: 0 (Idle1), 1 (Stand), 2 (Idle2)
// Sheet size: (3 * 96) x (4 * 96) = 288 x 384 px
console.log('Building standard RMMZ charset (288x384)...');
const rmmzW = 288;
const rmmzH = 384;
const rmmzBuf = Buffer.alloc(rmmzW * rmmzH * 4);

const rmmzFacingRows = [
    facingAnimations.find(f => f.id === 'S').frames,  // Row 0: Down (South)
    facingAnimations.find(f => f.id === 'W').frames,  // Row 1: Left (West)
    facingAnimations.find(f => f.id === 'E').frames,  // Row 2: Right (East)
    facingAnimations.find(f => f.id === 'N').frames   // Row 3: Up (North)
];

for (let r = 0; r < 4; r++) {
    const frames = rmmzFacingRows[r]; // [Stand, Idle1, Idle2]
    const rmmzCols = [frames[1], frames[0], frames[2]];
    for (let col = 0; col < 3; col++) {
        const fBuf = rmmzCols[col];
        for (let y = 0; y < 96; y++) {
            for (let x = 0; x < 96; x++) {
                const sidx = (y * 96 + x) * 4;
                if (fBuf[sidx + 3] > 0) {
                    const didx = (((r * 96) + y) * rmmzW + ((col * 96) + x)) * 4;
                    rmmzBuf[didx]     = fBuf[sidx];
                    rmmzBuf[didx + 1] = fBuf[sidx + 1];
                    rmmzBuf[didx + 2] = fBuf[sidx + 2];
                    rmmzBuf[didx + 3] = 255;
                }
            }
        }
    }
}

const rmmzPngPath = path.join(ROOT, 'game', 'img', 'characters', '$UF_Troll.png');
writePNG(rmmzPngPath, rmmzW, rmmzH, rmmzBuf);
console.log(`Saved RMMZ charset: ${rmmzPngPath}`);

// Sidecar for $UF_Troll.png
const rmmzJsonPath = path.join(ROOT, 'game', 'img', 'characters', '$UF_Troll.json');
const rmmzJson = {
    id: "troll",
    name: "Troll",
    category: "wildlife",
    kind: "monster",
    frameWidth: 96,
    frameHeight: 96,
    anchor: [48, 95],
    footprint: [2, 2],
    facings: ["S", "W", "E", "N"],
    animations: {
        stand: [1],
        walk: [0, 1, 2, 1],
        idle: [0, 1, 2, 1]
    },
    frameMs: 200
};
fs.writeFileSync(rmmzJsonPath, JSON.stringify(rmmzJson, null, 2) + '\n');
console.log(`Saved RMMZ sidecar: ${rmmzJsonPath}`);

console.log('All troll assets successfully processed!');
