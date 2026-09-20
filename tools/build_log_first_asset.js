const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// CIELAB color conversion functions (matching make_25d.js)
function parseHex(s) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(s).trim());
    return m ? [(parseInt(m[1], 16) >> 16) & 255, (parseInt(m[1], 16) >> 8) & 255, parseInt(m[1], 16) & 255] : null;
}

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

function loadPalette() {
    const text = fs.readFileSync(PALETTE_FILE, 'utf8');
    const unique = [];
    const index = new Map();
    for (const line of text.split(/\r?\n/)) {
        const rgb = parseHex(line);
        if (!rgb) continue;
        const k = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
        if (!index.has(k)) {
            index.set(k, unique.length);
            unique.push(rgb);
        }
    }
    const lab = unique.map(c => srgbToLab(...c));
    const cache = new Map();
    return {
        unique,
        snap(r, g, b) {
            const k = (r << 16) | (g << 8) | b;
            if (cache.has(k)) return cache.get(k);
            const l = srgbToLab(r, g, b);
            let best = unique[0], bd = Infinity;
            for (let i = 0; i < lab.length; i++) {
                const d = labDist(l, lab[i]);
                if (d < bd) { bd = d; best = unique[i]; }
            }
            cache.set(k, best);
            return best;
        }
    };
}

const pal = loadPalette();

function sampleToGrid(img, bbox, targetW, targetH, startX, startY, frameW, frameH, threshold = 0.35) {
    const grid = Array.from({ length: frameH }, () => Array(frameW).fill([255, 0, 255]));
    
    for (let dy = 0; dy < targetH; dy++) {
        for (let dx = 0; dx < targetW; dx++) {
            const gy = startY + dy;
            const gx = startX + dx;
            if (gy < 0 || gy >= frameH || gx < 0 || gx >= frameW) continue;

            const srcY0 = bbox.minY + Math.floor(dy * (bbox.h / targetH));
            const srcY1 = bbox.minY + Math.floor((dy + 1) * (bbox.h / targetH));
            const srcX0 = bbox.minX + Math.floor(dx * (bbox.w / targetW));
            const srcX1 = bbox.minX + Math.floor((dx + 1) * (bbox.w / targetW));

            let sumR = 0, sumG = 0, sumB = 0, charCount = 0, totalCount = 0;
            for (let sy = srcY0; sy < srcY1; sy++) {
                for (let sx = srcX0; sx < srcX1; sx++) {
                    totalCount++;
                    const o = (sy * img.width + sx) * 4;
                    const r = img.data[o], g = img.data[o + 1], b = img.data[o + 2];
                    const isMag = (r > 165 && g < 85 && b > 165);
                    if (!isMag) {
                        sumR += r;
                        sumG += g;
                        sumB += b;
                        charCount++;
                    }
                }
            }

            if (charCount > 0 && (charCount / totalCount) >= threshold) {
                const avgR = Math.round(sumR / charCount);
                const avgG = Math.round(sumG / charCount);
                const avgB = Math.round(sumB / charCount);
                grid[gy][gx] = pal.snap(avgR, avgG, avgB);
            }
        }
    }
    return grid;
}

// Ensure selective outline (dark silhouette on bottom/right)
function cleanOutlines(grid, frameW, frameH) {
    const OUTLINE = [0x20, 0x14, 0x08]; // Dark wood/shadow outline
    for (let y = 0; y < frameH; y++) {
        for (let x = 0; x < frameW; x++) {
            const rgb = grid[y][x];
            if (rgb[0] === 255 && rgb[1] === 0 && rgb[2] === 255) continue;
            
            // If adjacent to background on bottom or right, ensure dark outline
            const isBottomEdge = (y === frameH - 1) || (grid[y + 1][x][0] === 255 && grid[y + 1][x][1] === 0 && grid[y + 1][x][2] === 255);
            const isRightEdge = (x === frameW - 1) || (grid[y][x + 1][0] === 255 && grid[y][x + 1][1] === 0 && grid[y][x + 1][2] === 255);
            
            if (isBottomEdge || isRightEdge) {
                // If the pixel is too bright for an edge, deepen it
                const lum = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
                if (lum > 80) {
                    grid[y][x] = pal.snap(Math.round(rgb[0] * 0.4), Math.round(rgb[1] * 0.4), Math.round(rgb[2] * 0.4));
                }
            }
        }
    }
}

// Build 1x PNG (transparent bg) and 4x raw PNG (magenta bg, 4x4 blocks)
function buildBuffers(grid, frameW, frameH) {
    const buf1x = Buffer.alloc(frameW * frameH * 4);
    for (let y = 0; y < frameH; y++) {
        for (let x = 0; x < frameW; x++) {
            const rgb = grid[y][x];
            const isBg = (rgb[0] === 255 && rgb[1] === 0 && rgb[2] === 255);
            const o = (y * frameW + x) * 4;
            buf1x[o]     = rgb[0];
            buf1x[o + 1] = rgb[1];
            buf1x[o + 2] = rgb[2];
            buf1x[o + 3] = isBg ? 0 : 255;
        }
    }

    const rawW = frameW * 4, rawH = frameH * 4;
    const buf4x = Buffer.alloc(rawW * rawH * 4);
    for (let y = 0; y < rawH; y++) {
        for (let x = 0; x < rawW; x++) {
            const gx = Math.floor(x / 4);
            const gy = Math.floor(y / 4);
            const rgb = grid[gy][gx];
            const o = (y * rawW + x) * 4;
            buf4x[o]     = rgb[0];
            buf4x[o + 1] = rgb[1];
            buf4x[o + 2] = rgb[2];
            buf4x[o + 3] = 255; // Opaque in raw
        }
    }

    return { buf1x, buf4x };
}

function limitColorsGrid(grid, frameW, frameH, maxColors = 32) {
    const counts = new Map();
    for (let y = 0; y < frameH; y++) {
        for (let x = 0; x < frameW; x++) {
            const rgb = grid[y][x];
            if (rgb[0] === 255 && rgb[1] === 0 && rgb[2] === 255) continue;
            const k = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
            counts.set(k, (counts.get(k) || 0) + 1);
        }
    }
    const labOf = new Map();
    const lab = (k) => {
        if (!labOf.has(k)) labOf.set(k, srgbToLab((k >> 16) & 255, (k >> 8) & 255, k & 255));
        return labOf.get(k);
    };

    while (counts.size > maxColors) {
        let minK = null;
        for (const [k, c] of counts) {
            if (minK === null || c < counts.get(minK) || (c === counts.get(minK) && k < minK)) minK = k;
        }
        let best = null, bd = Infinity;
        for (const k of counts.keys()) {
            if (k !== minK) {
                const dd = labDist(lab(minK), lab(k));
                if (dd < bd) { bd = dd; best = k; }
            }
        }
        const into = [(best >> 16) & 255, (best >> 8) & 255, best & 255];
        for (let y = 0; y < frameH; y++) {
            for (let x = 0; x < frameW; x++) {
                const rgb = grid[y][x];
                if (rgb[0] === 255 && rgb[1] === 0 && rgb[2] === 255) continue;
                const k = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
                if (k === minK) grid[y][x] = into;
            }
        }
        counts.set(best, counts.get(best) + counts.get(minK));
        counts.delete(minK);
    }
}

function countColors(grid, frameW, frameH) {
    const set = new Set();
    for (let y = 0; y < frameH; y++) {
        for (let x = 0; x < frameW; x++) {
            const rgb = grid[y][x];
            if (rgb[0] === 255 && rgb[1] === 0 && rgb[2] === 255) continue;
            set.add((rgb[0] << 16) | (rgb[1] << 8) | rgb[2]);
        }
    }
    return set.size;
}

// ----------------------------------------------------
// 1. Process Ground Item: log.png
// ----------------------------------------------------
console.log('Processing Ground Item: log.png...');
const gImg = decodePNG(fs.readFileSync('scratch/log_ground_src.png'));
const gBBox = { minX: 40, maxX: 983, minY: 307, maxY: 757, w: 944, h: 451 };

// Target: 48x48 frame, lower half of frame
// Target width ~32 px, height ~15 px, resting on row 47
const gTargetW = 32;
const gTargetH = 15;
const gStartX = Math.round((48 - gTargetW) / 2); // 8
const gStartY = 47 - gTargetH + 1;               // 33 (rows 33..47)

console.log(`Ground log mapped: ${gTargetW}x${gTargetH} at [${gStartX}, ${gStartY}], contact on row 47`);
const gGrid = sampleToGrid(gImg, gBBox, gTargetW, gTargetH, gStartX, gStartY, 48, 48, 0.35);
cleanOutlines(gGrid, 48, 48);
limitColorsGrid(gGrid, 48, 48, 32);

const { buf1x: gBuf1x, buf4x: gBuf4x } = buildBuffers(gGrid, 48, 48);
const gColors = countColors(gGrid, 48, 48);
console.log(`Ground log colors: ${gColors}`);

const rawLogPath = path.join(ROOT, 'art', 'raw', 'log.png');
const masterLogPath = path.join(ROOT, 'art', 'masters', 'log.png');
const masterLogJson = path.join(ROOT, 'art', 'masters', 'log.json');

writePNG(rawLogPath, 192, 192, gBuf4x);
writePNG(masterLogPath, 48, 48, gBuf1x);

const sidecarLog = {
    id: "log",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S"],
    animations: {
        stand: [0]
    },
    frameMs: 150,
    layer: "object",
    species: null,
    stage: null
};
fs.writeFileSync(masterLogJson, JSON.stringify(sidecarLog, null, 2) + '\n');
console.log('Written:', rawLogPath, masterLogPath, masterLogJson);

// ----------------------------------------------------
// 2. Process Inventory Icon: log_icon.png
// ----------------------------------------------------
console.log('\nProcessing Inventory Icon: log_icon.png...');
const iImg = decodePNG(fs.readFileSync('scratch/log_icon_src.png'));
const iBBox = { minX: 102, maxX: 921, minY: 153, maxY: 870, w: 820, h: 718 };

// Target: 32x32 frame, large and clear for inventory grid
const iTargetW = 26;
const iTargetH = 23;
const iStartX = Math.round((32 - iTargetW) / 2); // 3
const iStartY = Math.round((32 - iTargetH) / 2); // 4 (rows 4..26)

console.log(`Inventory log icon mapped: ${iTargetW}x${iTargetH} at [${iStartX}, ${iStartY}]`);
const iGrid = sampleToGrid(iImg, iBBox, iTargetW, iTargetH, iStartX, iStartY, 32, 32, 0.32);
cleanOutlines(iGrid, 32, 32);
limitColorsGrid(iGrid, 32, 32, 32);

const { buf1x: iBuf1x, buf4x: iBuf4x } = buildBuffers(iGrid, 32, 32);
const iColors = countColors(iGrid, 32, 32);
console.log(`Inventory log icon colors: ${iColors}`);

const rawIconPath = path.join(ROOT, 'art', 'raw', 'log_icon.png');
const masterIconPath = path.join(ROOT, 'art', 'masters', 'log_icon.png');
const masterIconJson = path.join(ROOT, 'art', 'masters', 'log_icon.json');

writePNG(rawIconPath, 128, 128, iBuf4x);
writePNG(masterIconPath, 32, 32, iBuf1x);

const sidecarIcon = {
    id: "log_icon",
    frameWidth: 32,
    frameHeight: 32,
    anchor: [16, 31],
    footprint: [1, 1],
    facings: ["S"],
    animations: {
        stand: [0]
    },
    frameMs: 150,
    layer: "icon",
    species: null,
    stage: null
};
fs.writeFileSync(masterIconJson, JSON.stringify(sidecarIcon, null, 2) + '\n');
console.log('Written:', rawIconPath, masterIconPath, masterIconJson);
