const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');
const JPG_SRC = 'C:/Users/snewt/.gemini/antigravity/brain/4673fa7e-4739-4315-a73d-9ef000ed7cee/fx_blood_raw_1789836849580.jpg';

// Specific target colors from SEG-18 for blood spatter
const COLOR_RIM = [255, 57, 77];     // Blood 21 (#FF394D)
const COLOR_BODY = [194, 12, 28];    // Blood 24 (#C20C1C)
const COLOR_CENTER = [138, 4, 12];   // Blood 26 (#8A040C)
const COLOR_POOL = [81, 0, 0];       // Blood 28 (#510000)
const COLOR_MAGENTA = [255, 0, 255]; // Background

function loadJpg(jpgPath) {
    const tmpPng = path.join(os.tmpdir(), `tmp_blood_${Date.now()}.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${jpgPath}'); $img.Save('${tmpPng}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    const buf = fs.readFileSync(tmpPng);
    fs.unlinkSync(tmpPng);
    return decodePNG(buf, path.basename(jpgPath));
}

const rawImg = loadJpg(JPG_SRC);
console.log(`Loaded Nano Banana blood image: ${rawImg.width}x${rawImg.height}`);

function isBgPixel(r, g, b) {
    return (r > 160 && g < 100 && b > 160) || (r > 140 && g < 80 && b > 140);
}

// Frame windows in the source image
const frameWindows = [
    { cx: 215.5, cy: 423.5, minX: 100, maxX: 330, minY: 320, maxY: 520 },
    { cx: 632.0, cy: 423.0, minX: 480, maxX: 780, minY: 310, maxY: 535 },
    { cx: 1039.0, cy: 423.5, minX: 930, maxX: 1150, minY: 300, maxY: 545 }
];

// Target 48x48 cell per frame, center decal at (24, 32)
const TARGET_CX = 24;
const TARGET_CY = 32;
const blockSize = 15.5;

const frames48 = [];

for (let f = 0; f < 3; f++) {
    const grid = Array.from({ length: 48 }, () => Array(48).fill(null));
    const win = frameWindows[f];
    
    for (let gy = 0; gy < 48; gy++) {
        for (let gx = 0; gx < 48; gx++) {
            const relGx = gx - TARGET_CX;
            const relGy = gy - TARGET_CY;
            
            const srcX = Math.round(win.cx + relGx * blockSize);
            const srcY = Math.round(win.cy + relGy * blockSize);
            
            if (srcX < win.minX || srcX > win.maxX || srcY < win.minY || srcY > win.maxY) {
                continue;
            }
            
            let sumR = 0, sumG = 0, sumB = 0, count = 0;
            const halfWin = Math.floor(blockSize * 0.4);
            
            for (let sy = srcY - halfWin; sy <= srcY + halfWin; sy++) {
                for (let sx = srcX - halfWin; sx <= srcX + halfWin; sx++) {
                    if (sx < win.minX || sx > win.maxX || sy < win.minY || sy > win.maxY) continue;
                    const o = (sy * rawImg.width + sx) * 4;
                    const r = rawImg.data[o];
                    const g = rawImg.data[o+1];
                    const b = rawImg.data[o+2];
                    if (!isBgPixel(r, g, b)) {
                        sumR += r;
                        sumG += g;
                        sumB += b;
                        count++;
                    }
                }
            }
            
            const totalWinPixels = (2 * halfWin + 1) * (2 * halfWin + 1);
            if (count > totalWinPixels * 0.25) {
                const avgR = sumR / count;
                const avgG = sumG / count;
                const avgB = sumB / count;
                
                // Color classification into the 4 SEG-18 blood ramp colors
                if (avgR > 210 && avgG < 60 && avgB < 80) {
                    grid[gy][gx] = COLOR_RIM;
                } else if (avgR > 150) {
                    grid[gy][gx] = COLOR_BODY;
                } else if (avgR > 90) {
                    grid[gy][gx] = COLOR_CENTER;
                } else {
                    grid[gy][gx] = COLOR_POOL;
                }
            }
        }
    }
    frames48.push(grid);
}

// Bounding boxes and validation
for (let f = 0; f < 3; f++) {
    let minX = 48, maxX = 0, minY = 48, maxY = 0, pxCount = 0;
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            if (frames48[f][y][x]) {
                pxCount++;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    console.log(`Variant ${f}: ${pxCount} px, bounds X [${minX}..${maxX}] (${w}px), Y [${minY}..${maxY}] (${h}px)`);
}

// 1. Build 1x Master: 144x48 px (3 frames on magenta #FF00FF)
const master1x = {
    width: 144,
    height: 48,
    data: Buffer.alloc(144 * 48 * 4)
};

for (let f = 0; f < 3; f++) {
    const offsetX = f * 48;
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const col = frames48[f][y][x] || COLOR_MAGENTA;
            const o = (y * 144 + (offsetX + x)) * 4;
            master1x.data[o] = col[0];
            master1x.data[o + 1] = col[1];
            master1x.data[o + 2] = col[2];
            master1x.data[o + 3] = 255;
        }
    }
}

// 2. Build 4x Raw Delivery: 576x192 px (each frame 192x192, 4x4 blocks on magenta #FF00FF)
const raw4x = {
    width: 576,
    height: 192,
    data: Buffer.alloc(576 * 192 * 4)
};

for (let f = 0; f < 3; f++) {
    const offsetX = f * 192;
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const col = frames48[f][y][x] || COLOR_MAGENTA;
            for (let dy = 0; dy < 4; dy++) {
                for (let dx = 0; dx < 4; dx++) {
                    const px = offsetX + x * 4 + dx;
                    const py = y * 4 + dy;
                    const o = (py * 576 + px) * 4;
                    raw4x.data[o] = col[0];
                    raw4x.data[o + 1] = col[1];
                    raw4x.data[o + 2] = col[2];
                    raw4x.data[o + 3] = 255;
                }
            }
        }
    }
}

// 3. Build Standard RMMZ Character Sheet: 144x192 px (3 cols x 4 rows, transparent background)
const rmmzSheet = {
    width: 144,
    height: 192,
    data: Buffer.alloc(144 * 192 * 4)
};

for (let row = 0; row < 4; row++) {
    const offsetY = row * 48;
    for (let f = 0; f < 3; f++) {
        const offsetX = f * 48;
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const col = frames48[f][y][x];
                const o = ((offsetY + y) * 144 + (offsetX + x)) * 4;
                if (col) {
                    rmmzSheet.data[o] = col[0];
                    rmmzSheet.data[o + 1] = col[1];
                    rmmzSheet.data[o + 2] = col[2];
                    rmmzSheet.data[o + 3] = 255;
                } else {
                    rmmzSheet.data[o] = 0;
                    rmmzSheet.data[o + 1] = 0;
                    rmmzSheet.data[o + 2] = 0;
                    rmmzSheet.data[o + 3] = 0;
                }
            }
        }
    }
}

// Sidecar JSONs
const sidecarMaster = {
    id: "fx_blood",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S"],
    animations: {
        stand: [0],
        splat: [0],
        smear: [1],
        drops: [2]
    },
    layer: "under"
};

const sidecarRmmz = {
    id: "UF_fx_blood",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S", "W", "E", "N"],
    animations: {
        stand: [0],
        splat: [0],
        smear: [1],
        drops: [2]
    },
    layer: "under"
};

// Write files
writePNG(path.join(ROOT, 'art', 'raw', 'fx_blood.png'), raw4x.width, raw4x.height, raw4x.data);
writePNG(path.join(ROOT, 'art', 'masters', 'fx_blood.png'), master1x.width, master1x.height, master1x.data);
fs.writeFileSync(path.join(ROOT, 'art', 'masters', 'fx_blood.json'), JSON.stringify(sidecarMaster, null, 2));

// ui_fx_blood aliases for SEG-18 compliance
writePNG(path.join(ROOT, 'art', 'masters', 'ui_fx_blood.png'), master1x.width, master1x.height, master1x.data);
fs.writeFileSync(path.join(ROOT, 'art', 'masters', 'ui_fx_blood.json'), JSON.stringify({ ...sidecarMaster, id: "ui_fx_blood" }, null, 2));

// Game RMMZ export
writePNG(path.join(ROOT, 'game', 'img', 'characters', '!$UF_fx_blood.png'), rmmzSheet.width, rmmzSheet.height, rmmzSheet.data);
fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_fx_blood.json'), JSON.stringify(sidecarRmmz, null, 2));

console.log('Successfully wrote fx_blood master, raw, and game exports!');
