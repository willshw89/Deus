const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const { decodePNG } = require('../tools/png_read');
const { writePNG } = require('../tools/png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// CIELAB color conversion functions
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

// Load meadow and settler for review renders
const meadowDecoded = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'meadow.png')), 'meadow.png');
const settlerDecoded = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'human_male_stand_south.png')), 'human_male_stand_south.png');

const ASSETS = [
    {
        id: 'gravel',
        name: 'Gravel',
        category: 'Geology',
        srcJpg: 'C:/Users/snewt/.gemini/antigravity/brain/3fc406d3-726b-4809-8b5b-891dbd58113a/gravel_raw_1789836634238.jpg',
        targetW: 40,
        targetH: 16,
        layer: 'under',
        passable: true,
        threshold: 0.35,
        snapOutline: [36, 36, 36] // #242424
    },
    {
        id: 'granite_boulder',
        name: 'Granite boulder',
        category: 'Geology',
        srcJpg: 'C:/Users/snewt/.gemini/antigravity/brain/3fc406d3-726b-4809-8b5b-891dbd58113a/granite_boulder_raw_1789836689210.jpg',
        targetW: 42,
        targetH: 38,
        layer: null,
        passable: false,
        threshold: 0.38,
        snapOutline: [36, 36, 36]
    },
    {
        id: 'ironstone',
        name: 'Ironstone outcrop',
        category: 'Geology',
        srcJpg: 'C:/Users/snewt/.gemini/antigravity/brain/3fc406d3-726b-4809-8b5b-891dbd58113a/ironstone_raw_1789836703513.jpg',
        targetW: 40,
        targetH: 38,
        layer: null,
        passable: false,
        threshold: 0.38,
        snapOutline: [53, 49, 45] // #35312D warm dark charcoal
    }
];

for (const asset of ASSETS) {
    console.log(`\n========================================`);
    console.log(`Processing: ${asset.id} (${asset.name})`);
    
    // 1. Convert JPG to temporary PNG
    const tmpPng = path.join(ROOT, 'scratch', `${asset.id}_raw.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${asset.srcJpg.replace(/'/g, "''")}'); $img.Save('${tmpPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    
    const decoded = decodePNG(fs.readFileSync(tmpPng), `${asset.id}_raw.png`);
    const imgW = decoded.width;
    const imgH = decoded.height;
    const imgData = decoded.data;
    
    function getSrcPixel(x, y) {
        if (x < 0 || x >= imgW || y < 0 || y >= imgH) return [255, 0, 255];
        const o = (y * imgW + x) * 4;
        return [imgData[o], imgData[o + 1], imgData[o + 2]];
    }
    
    // 2. Find bounding box of non-magenta pixels
    let minX = imgW, maxX = 0, minY = imgH, maxY = 0;
    for (let y = 0; y < imgH; y++) {
        for (let x = 0; x < imgW; x++) {
            const [r, g, b] = getSrcPixel(x, y);
            const isMagenta = (r > 165 && g < 85 && b > 165);
            if (!isMagenta) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    
    const bboxW = maxX - minX + 1;
    const bboxH = maxY - minY + 1;
    console.log(`Bounding box: (${minX}, ${minY}) to (${maxX}, ${maxY}), size: ${bboxW}x${bboxH}`);
    
    // 3. Map into 48x48 frame
    const targetW = asset.targetW;
    const targetH = Math.min(asset.targetH, Math.round(targetW * (bboxH / bboxW)));
    const startY = 47 - targetH + 1; // grounded at row 47
    const startX = Math.round((48 - targetW) / 2);
    console.log(`Target in 48x48: ${targetW}x${targetH} at (${startX}, ${startY})`);
    
    const grid = Array.from({ length: 48 }, () => Array(48).fill(null));
    
    for (let dy = 0; dy < targetH; dy++) {
        for (let dx = 0; dx < targetW; dx++) {
            const gy = startY + dy;
            const gx = startX + dx;
            
            const srcY0 = minY + Math.floor(dy * (bboxH / targetH));
            const srcY1 = minY + Math.floor((dy + 1) * (bboxH / targetH));
            const srcX0 = minX + Math.floor(dx * (bboxW / targetW));
            const srcX1 = minX + Math.floor((dx + 1) * (bboxW / targetW));
            
            let sumR = 0, sumG = 0, sumB = 0, count = 0, totalCount = 0;
            for (let sy = srcY0; sy < srcY1; sy++) {
                for (let sx = srcX0; sx < srcX1; sx++) {
                    totalCount++;
                    const [r, g, b] = getSrcPixel(sx, sy);
                    const isMagenta = (r > 165 && g < 85 && b > 165) || (r > 140 && g < 70 && b > 140);
                    if (!isMagenta) {
                        sumR += r;
                        sumG += g;
                        sumB += b;
                        count++;
                    }
                }
            }
            
            if (count > totalCount * asset.threshold) {
                const avgR = Math.round(sumR / count);
                const avgG = Math.round(sumG / count);
                const avgB = Math.round(sumB / count);
                let snapped = pal.snap(avgR, avgG, avgB);
                
                // Defringe magenta bleed
                const [sr, sg, sb] = snapped;
                if ((sr > sg + 15 && sb > sg + 15) || (sr === 36 && sg === 0 && sb === 36) || (sr === 24 && sg === 0 && sb === 24) || (sr === 53 && sg === 0 && sb === 53)) {
                    snapped = asset.snapOutline;
                }
                grid[gy][gx] = snapped;
            }
        }
    }
    
    // 4. Color count & limit to 32
    const usedColors = new Map();
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const c = grid[y][x];
            if (c) {
                const k = (c[0] << 16) | (c[1] << 8) | c[2];
                usedColors.set(k, (usedColors.get(k) || 0) + 1);
            }
        }
    }
    
    if (usedColors.size > 32) {
        const sorted = [...usedColors.entries()].sort((a, b) => b[1] - a[1]);
        const topPalette = sorted.slice(0, 32).map(([k]) => [(k >> 16) & 255, (k >> 8) & 255, k & 255]);
        const topLab = topPalette.map(c => srgbToLab(...c));
        
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const c = grid[y][x];
                if (!c) continue;
                const k = (c[0] << 16) | (c[1] << 8) | c[2];
                const isTop = topPalette.some(tc => ((tc[0] << 16) | (tc[1] << 8) | tc[2]) === k);
                if (!isTop) {
                    const l = srgbToLab(...c);
                    let best = topPalette[0], bd = Infinity;
                    for (let i = 0; i < topLab.length; i++) {
                        const d = labDist(l, topLab[i]);
                        if (d < bd) { bd = d; best = topPalette[i]; }
                    }
                    grid[y][x] = best;
                }
            }
        }
    }
    
    const colorSet = new Set();
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const c = grid[y][x];
            if (c) colorSet.add((c[0] << 16) | (c[1] << 8) | c[2]);
        }
    }
    console.log(`Final colors: ${colorSet.size}/32`);
    
    // 5. Save master 48x48
    const masterBuf = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const o = (y * 48 + x) * 4;
            const c = grid[y][x];
            if (c) {
                masterBuf[o] = c[0];
                masterBuf[o + 1] = c[1];
                masterBuf[o + 2] = c[2];
                masterBuf[o + 3] = 255;
            } else {
                masterBuf[o] = 0;
                masterBuf[o + 1] = 0;
                masterBuf[o + 2] = 0;
                masterBuf[o + 3] = 0;
            }
        }
    }
    const masterPath = path.join(ROOT, 'art', 'masters', `${asset.id}.png`);
    writePNG(masterPath, 48, 48, masterBuf);
    console.log(`Saved master: ${masterPath}`);
    
    // 6. Save sidecar
    const sidecar = {
        id: asset.id,
        name: asset.name,
        category: asset.category,
        dimensions: "48x48",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S"],
        animations: {
            stand: [0]
        },
        palette: "art/palette/uf.hex",
        colorCount: colorSet.size,
        updatedDate: "2026-09-19"
    };
    if (asset.layer) sidecar.layer = asset.layer;
    if (asset.passable !== undefined) sidecar.passable = asset.passable;
    
    const sidecarPath = path.join(ROOT, 'art', 'masters', `${asset.id}.json`);
    fs.writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2), 'utf8');
    console.log(`Saved sidecar: ${sidecarPath}`);
    
    // 7. Save 4x raw canvas (192x192 on flat magenta)
    const raw4xBuf = Buffer.alloc(192 * 192 * 4);
    for (let y = 0; y < 192; y++) {
        for (let x = 0; x < 192; x++) {
            const gx = Math.floor(x / 4);
            const gy = Math.floor(y / 4);
            const o = (y * 192 + x) * 4;
            const c = grid[gy][gx];
            if (c) {
                raw4xBuf[o] = c[0];
                raw4xBuf[o + 1] = c[1];
                raw4xBuf[o + 2] = c[2];
                raw4xBuf[o + 3] = 255;
            } else {
                raw4xBuf[o] = 255;
                raw4xBuf[o + 1] = 0;
                raw4xBuf[o + 2] = 255;
                raw4xBuf[o + 3] = 255;
            }
        }
    }
    const rawPath = path.join(ROOT, 'art', 'raw', `${asset.id}.png`);
    writePNG(rawPath, 192, 192, raw4xBuf);
    console.log(`Saved 4x raw: ${rawPath}`);
    
    // 8. Review renders
    // A. 4x on magenta
    writePNG(path.join(ROOT, 'art', 'review', `${asset.id}_4x_magenta.png`), 192, 192, raw4xBuf);
    
    // B. 4x on meadow
    const meadowBuf = Buffer.alloc(192 * 192 * 4);
    for (let y = 0; y < 192; y++) {
        for (let x = 0; x < 192; x++) {
            const mx = Math.floor(x / 4) % meadowDecoded.width;
            const my = Math.floor(y / 4) % meadowDecoded.height;
            const mo = (my * meadowDecoded.width + mx) * 4;
            
            const gx = Math.floor(x / 4);
            const gy = Math.floor(y / 4);
            const c = grid[gy][gx];
            const o = (y * 192 + x) * 4;
            
            if (c) {
                meadowBuf[o] = c[0];
                meadowBuf[o + 1] = c[1];
                meadowBuf[o + 2] = c[2];
                meadowBuf[o + 3] = 255;
            } else {
                meadowBuf[o] = meadowDecoded.data[mo];
                meadowBuf[o + 1] = meadowDecoded.data[mo + 1];
                meadowBuf[o + 2] = meadowDecoded.data[mo + 2];
                meadowBuf[o + 3] = 255;
            }
        }
    }
    writePNG(path.join(ROOT, 'art', 'review', `${asset.id}_on_meadow_4x.png`), 192, 192, meadowBuf);
    
    // C. 4x showcase with settler
    const compW = 384, compH = 192;
    const compBuf = Buffer.alloc(compW * compH * 4);
    for (let y = 0; y < compH; y++) {
        for (let x = 0; x < compW; x++) {
            const o = (y * compW + x) * 4;
            const screenX = Math.floor(x / 4);
            const screenY = Math.floor(y / 4);
            
            const mx = screenX % meadowDecoded.width;
            const my = screenY % meadowDecoded.height;
            const mo = (my * meadowDecoded.width + mx) * 4;
            let r = meadowDecoded.data[mo];
            let g = meadowDecoded.data[mo + 1];
            let b = meadowDecoded.data[mo + 2];
            
            if (screenX < 48) {
                // Left tile: settler
                const so = (screenY * 48 + screenX) * 4;
                if (settlerDecoded.data[so + 3] > 0) {
                    r = settlerDecoded.data[so];
                    g = settlerDecoded.data[so + 1];
                    b = settlerDecoded.data[so + 2];
                }
            } else {
                // Right tile: the asset
                const ax = screenX - 48;
                const ay = screenY;
                const ac = grid[ay][ax];
                if (ac) {
                    r = ac[0];
                    g = ac[1];
                    b = ac[2];
                }
                // If asset is "under", settler stands on top; if solid boulder, settler stands behind or beside
                if (asset.layer === 'under') {
                    const so = (ay * 48 + ax) * 4;
                    if (settlerDecoded.data[so + 3] > 0) {
                        r = settlerDecoded.data[so];
                        g = settlerDecoded.data[so + 1];
                        b = settlerDecoded.data[so + 2];
                    }
                }
            }
            
            compBuf[o] = r;
            compBuf[o + 1] = g;
            compBuf[o + 2] = b;
            compBuf[o + 3] = 255;
        }
    }
    writePNG(path.join(ROOT, 'art', 'review', `${asset.id}_settler_showcase_4x.png`), compW, compH, compBuf);
    console.log(`Saved reviews for ${asset.id}`);
}
