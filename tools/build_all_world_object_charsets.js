const fs = require('fs');
const path = require('path');
const { decodePNG, readPNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');
const CATALOG_FILE = path.join(ROOT, 'game', 'data', 'UF_WorldCatalog.json');

// ----------------------------------------------------------------------------
// 1. Palette & Color Management (CIELAB on uf.hex)
// ----------------------------------------------------------------------------
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
        colors: unique,
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

function quantizeTo32(buf) {
    const counts = new Map();
    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 0) continue;
        const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
        counts.set(k, (counts.get(k) || 0) + 1);
    }
    if (counts.size <= 32) return;

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const topKeys = sorted.slice(0, 31).map(e => e[0]);
    const topRgb = topKeys.map(k => [(k >> 16) & 255, (k >> 8) & 255, k & 255]);
    const topLab = topRgb.map(c => srgbToLab(...c));

    const map = new Map();
    for (let i = 31; i < sorted.length; i++) {
        const k = sorted[i][0];
        const rgb = [(k >> 16) & 255, (k >> 8) & 255, k & 255];
        const lab = srgbToLab(...rgb);
        let best = topRgb[0], bestDist = Infinity;
        for (let j = 0; j < topLab.length; j++) {
            const d = labDist(lab, topLab[j]);
            if (d < bestDist) { bestDist = d; best = topRgb[j]; }
        }
        map.set(k, best);
    }

    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 0) continue;
        const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
        if (map.has(k)) {
            const rgb = map.get(k);
            buf[i] = rgb[0];
            buf[i + 1] = rgb[1];
            buf[i + 2] = rgb[2];
        }
    }
}

// ----------------------------------------------------------------------------
// 2. Catalog & Object Definitions
// ----------------------------------------------------------------------------
const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));

// Determine animation category for each object
function getAnimCategory(obj) {
    const id = obj.id;
    const tags = obj.tags || [];

    // Already animated trees (96x96)
    if (tags.includes('tree')) return 'tree_sway';

    // Campfire & light
    if (id === 'campfire' || tags.includes('fire')) return 'fire';

    // Bioluminescent cavern fungi & flora
    if (id === 'glow_caps' || id === 'cave_mushrooms' || id === 'cave_moss') return 'bioluminescence';

    // Resonant crystals
    if (id === 'crystal' || id === 'crystal_small' || id === 'crystal_spire') return 'crystal_glint';

    // Water surface well
    if (id === 'well') return 'well_water';

    // Floating water pads
    if (id === 'lily_pad') return 'water_bob';

    // Wind-swaying bushes & shrubs
    if (tags.includes('bush') || id.includes('shrub') || id.includes('bush')) return 'plant_sway';

    // Wind-swaying grasses, crops, flora, reeds, fern
    if (id === 'grass_tuft' || id === 'reeds' || id === 'spore_reeds' || id === 'wild_grain' ||
        id === 'wheat_wild' || id.startsWith('flowers') || id === 'fern') return 'plant_sway';

    // Cacti (subtle sway/heat shimmer)
    if (id === 'cactus' || id === 'cactus_tall') return 'cactus_sway';

    // Doors (already animated)
    if (id === 'door_wood' || id === 'door_stone') return 'door';

    // Walls (autotile sets)
    if (id === 'wall_wood' || id === 'wall_stone') return 'wall';

    // Solid geological, structural, or ruin objects
    return 'static';
}

// ----------------------------------------------------------------------------
// 3. Grid Manipulation & Procedural Frame Generators
// ----------------------------------------------------------------------------

function bufToGrid(buf, w, h) {
    const grid = Array.from({ length: h }, () => Array(w).fill(null));
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const o = (y * w + x) * 4;
            if (buf[o + 3] > 128) {
                const snapped = pal.snap(buf[o], buf[o + 1], buf[o + 2]);
                grid[y][x] = snapped;
            }
        }
    }
    return grid;
}

function gridToBuf(grid, w, h) {
    const buf = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const o = (y * w + x) * 4;
            const c = grid[y][x];
            if (c) {
                buf[o] = c[0];
                buf[o + 1] = c[1];
                buf[o + 2] = c[2];
                buf[o + 3] = 255;
            } else {
                buf[o] = 0; buf[o + 1] = 0; buf[o + 2] = 0; buf[o + 3] = 0;
            }
        }
    }
    return buf;
}

function copyGrid(grid, w, h) {
    const out = Array.from({ length: h }, () => Array(w).fill(null));
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            out[y][x] = grid[y][x] ? [grid[y][x][0], grid[y][x][1], grid[y][x][2]] : null;
        }
    }
    return out;
}

/**
 * Generates sway animation frame for plants, foliage, shrubs, flowers.
 * Horizontal displacement scales upwards from anchored root (row 45-47) to apex.
 */
function createPlantSwayFrame(standGrid, w, h, maxDx, flutterPhase, anchorY = h - 1) {
    const grid = Array.from({ length: h }, () => Array(w).fill(null));
    for (let y = 0; y < h; y++) {
        const heightRatio = Math.max(0, Math.min(1, (anchorY - y) / (anchorY - 4)));
        const dx = Math.round(maxDx * Math.pow(heightRatio, 1.3));
        
        for (let x = 0; x < w; x++) {
            const c = standGrid[y][x];
            if (!c) continue;

            let flutter = 0;
            if (y < anchorY - 6 && heightRatio > 0.3) {
                flutter = Math.round(Math.sin((y + flutterPhase) * 0.4 + x * 0.2) * 0.6);
            }

            const targetX = x + dx + flutter;
            if (targetX >= 0 && targetX < w) {
                grid[y][targetX] = c;
            }
        }
    }

    // Fill 1-pixel horizontal tears
    for (let y = 0; y < h; y++) {
        for (let x = 1; x < w - 1; x++) {
            if (!grid[y][x] && grid[y][x - 1] && grid[y][x + 1]) {
                grid[y][x] = grid[y][x - 1];
            }
        }
    }
    return grid;
}

/**
 * Campfire: 3-frame crackling flame loop with rising embers and flame tip shifts.
 */
function createCampfireFrames(standGrid, w, h) {
    const f0 = copyGrid(standGrid, w, h);
    const f1 = copyGrid(standGrid, w, h);
    const f2 = copyGrid(standGrid, w, h);

    const goldCore = pal.snap(255, 220, 40);
    const orangeMid = pal.snap(245, 120, 20);
    const redOuter = pal.snap(210, 40, 20);

    // Frame 1: Flame tongues flick to right, rising embers
    for (let y = 14; y <= 36; y++) {
        for (let x = 16; x <= 32; x++) {
            const c = standGrid[y][x];
            if (c) {
                // If this is flame color (high red/gold), shift rightwards at apex
                if (c[0] > 180 && c[1] > 30) {
                    const shiftY = y <= 24 ? 1 : 0;
                    if (x + shiftY < w) {
                        f1[y][x + shiftY] = c;
                        if (shiftY > 0 && x - 1 >= 0 && !f1[y][x - 1]) f1[y][x] = orangeMid;
                    }
                }
            }
        }
    }
    // Add glowing rising embers in frame 1
    f1[15][21] = goldCore;
    f1[12][25] = orangeMid;
    f1[10][23] = redOuter;

    // Frame 2: Flame tongues flick to left, secondary ember drift
    for (let y = 14; y <= 36; y++) {
        for (let x = 16; x <= 32; x++) {
            const c = standGrid[y][x];
            if (c) {
                if (c[0] > 180 && c[1] > 30) {
                    const shiftY = y <= 24 ? -1 : 0;
                    if (x + shiftY >= 0) {
                        f2[y][x + shiftY] = c;
                    }
                }
            }
        }
    }
    // Add glowing embers in frame 2
    f2[14][27] = goldCore;
    f2[11][20] = orangeMid;
    f2[9][24] = redOuter;

    return [f0, f1, f2];
}

/**
 * Bioluminescent Fungi / Cavern Flora: Pulsing breathing luminance and spore glow.
 */
function createBioluminescenceFrames(standGrid, w, h, auraRgb, coreRgb) {
    const f0 = copyGrid(standGrid, w, h);
    const f1 = copyGrid(standGrid, w, h);
    const f2 = copyGrid(standGrid, w, h);

    const aura = pal.snap(...auraRgb);
    const core = pal.snap(...coreRgb);

    // Frame 1: Luminous peak - expand aura perimeter by 1 px around bright nodes, add spore glints
    for (let y = 4; y < h - 4; y++) {
        for (let x = 4; x < w - 4; x++) {
            const c = standGrid[y][x];
            if (c && (c[0] > 100 || c[1] > 150 || c[2] > 150)) {
                // Highlight core
                f1[y][x] = core;
                // Expand soft halo
                if (!f1[y - 1][x]) f1[y - 1][x] = aura;
                if (!f1[y + 1][x]) f1[y + 1][x] = aura;
                if (!f1[y][x - 1]) f1[y][x - 1] = aura;
                if (!f1[y][x + 1]) f1[y][x + 1] = aura;
            }
        }
    }
    // Drifting spore particles in Frame 1
    f1[12][20] = core;
    f1[10][27] = aura;

    // Frame 2: Soft recharge - subtle spore drift
    for (let y = 4; y < h - 4; y++) {
        for (let x = 4; x < w - 4; x++) {
            const c = standGrid[y][x];
            if (c && (c[0] > 100 || c[1] > 150 || c[2] > 150)) {
                f2[y][x] = c;
            }
        }
    }
    f2[8][22] = aura;
    f2[14][29] = core;

    return [f0, f1, f2];
}

/**
 * Crystals & Resonant Minerals: Prismatic facet glints and moving star sparkles.
 */
function createCrystalFrames(standGrid, w, h, glintColor) {
    const f0 = copyGrid(standGrid, w, h);
    const f1 = copyGrid(standGrid, w, h);
    const f2 = copyGrid(standGrid, w, h);

    const glintBright = pal.snap(255, 255, 255);
    const glintSecondary = pal.snap(...glintColor);

    // Find top-most and central crystalline pixels
    const crystalPixels = [];
    for (let y = 8; y < h - 8; y++) {
        for (let x = 8; x < w - 8; x++) {
            if (standGrid[y][x]) crystalPixels.push({ x, y });
        }
    }

    if (crystalPixels.length > 0) {
        const topPx = crystalPixels[Math.floor(crystalPixels.length * 0.25)];
        const midPx = crystalPixels[Math.floor(crystalPixels.length * 0.65)];

        // Frame 1: 4-pointed star glint on upper crystal facet
        if (topPx) {
            f1[topPx.y][topPx.x] = glintBright;
            if (topPx.y > 0) f1[topPx.y - 1][topPx.x] = glintSecondary;
            if (topPx.y < h - 1) f1[topPx.y + 1][topPx.x] = glintSecondary;
            if (topPx.x > 0) f1[topPx.y][topPx.x - 1] = glintSecondary;
            if (topPx.x < w - 1) f1[topPx.y][topPx.x + 1] = glintSecondary;
        }

        // Frame 2: Specular sparkle shifts to mid facet
        if (midPx) {
            f2[midPx.y][midPx.x] = glintBright;
            if (midPx.y > 0) f2[midPx.y - 1][midPx.x] = glintSecondary;
            if (midPx.y < h - 1) f2[midPx.y + 1][midPx.x] = glintSecondary;
            if (midPx.x > 0) f2[midPx.y][midPx.x - 1] = glintSecondary;
            if (midPx.x < w - 1) f2[midPx.y][midPx.x + 1] = glintSecondary;
        }
    }

    return [f0, f1, f2];
}

/**
 * Water Well: Water surface ripple and rope oscillation.
 */
function createWellFrames(standGrid, w, h) {
    const f0 = copyGrid(standGrid, w, h);
    const f1 = copyGrid(standGrid, w, h);
    const f2 = copyGrid(standGrid, w, h);

    const waterGlint = pal.snap(180, 220, 255);
    const waterShadow = pal.snap(20, 50, 100);

    // Well basin center (approx x=20..28, y=28..36)
    for (let y = 28; y <= 36; y++) {
        for (let x = 20; x <= 28; x++) {
            if (f1[y][x]) {
                if ((x + y) % 3 === 0) f1[y][x] = waterGlint;
                else if ((x + y) % 3 === 1) f1[y][x] = waterShadow;
            }
            if (f2[y][x]) {
                if ((x + y + 1) % 3 === 0) f2[y][x] = waterGlint;
                else if ((x + y + 1) % 3 === 1) f2[y][x] = waterShadow;
            }
        }
    }

    // Subtle rope displacement
    if (f1[18] && f1[18][24]) {
        f1[18][25] = f1[18][24];
        f1[19][25] = f1[19][24];
    }
    if (f2[18] && f2[18][24]) {
        f2[18][23] = f2[18][24];
        f2[19][23] = f2[19][24];
    }

    return [f0, f1, f2];
}

/**
 * Lily Pads: Gentle water bobbing and concentric expanding ripples.
 */
function createLilyPadFrames(standGrid, w, h) {
    const f0 = copyGrid(standGrid, w, h);
    const f1 = copyGrid(standGrid, w, h);
    const f2 = copyGrid(standGrid, w, h);

    const rippleColor = pal.snap(130, 180, 240);
    const shineColor = pal.snap(200, 245, 140);

    // Frame 1: Ripple expands outward, pad bobs down 1px
    for (let y = 16; y < h - 4; y++) {
        for (let x = 4; x < w - 4; x++) {
            if (standGrid[y][x]) {
                // Expanding water ripple ring
                if ((x === 6 || x === w - 7 || y === 18 || y === h - 6) && !standGrid[y][x]) {
                    f1[y][x] = rippleColor;
                }
            }
        }
    }
    // Water glint
    f1[24][18] = rippleColor;
    f1[25][30] = rippleColor;

    // Frame 2: Reflective shine highlight on leaves
    for (let y = 20; y < 34; y++) {
        for (let x = 12; x < 36; x++) {
            if (standGrid[y][x] && (x + y) % 5 === 0) {
                f2[y][x] = shineColor;
            }
        }
    }
    f2[28][14] = rippleColor;
    f2[22][34] = rippleColor;

    return [f0, f1, f2];
}

// ----------------------------------------------------------------------------
// 4. Main Generation Loop across all 67 objects
// ----------------------------------------------------------------------------

console.log('Beginning Complete World Object Character Sets & Icons Generation...');

let generatedCount = 0;
let animatedCount = 0;
const reportList = [];

for (const obj of catalog.objects) {
    const imgKey = obj.image;
    const cat = getAnimCategory(obj);

    // Determine dimensions from existing sidecar or standard
    let frameW = 48, frameH = 48;
    const existingSidecarPath = path.join(ROOT, 'game', 'img', 'characters', `${imgKey}.json`);
    let existingSc = null;
    if (fs.existsSync(existingSidecarPath)) {
        try { existingSc = JSON.parse(fs.readFileSync(existingSidecarPath, 'utf8')); } catch (e) {}
    }
    if (existingSc && existingSc.frameWidth > 0) {
        frameW = existingSc.frameWidth;
        frameH = existingSc.frameHeight;
    }

    // Locate source file
    let srcFile = path.join(ROOT, 'game', 'img', 'characters', `${imgKey}.png`);
    if (!fs.existsSync(srcFile)) {
        srcFile = path.join(ROOT, 'art', 'masters', `${imgKey}.png`);
    }
    if (!fs.existsSync(srcFile)) {
        console.warn(`Source file missing for ${obj.id}: ${srcFile}`);
        continue;
    }

    const decoded = readPNG(srcFile);

    // Extract Stand Grid (column 0 or middle column)
    const standBuf = Buffer.alloc(frameW * frameH * 4);
    // Find stand column offset (usually col 0 or col 1)
    let srcCol = (existingSc && existingSc.animations && existingSc.animations.stand) ? existingSc.animations.stand[0] : 0;
    if ((srcCol + 1) * frameW > decoded.width) srcCol = 0;
    const srcX0 = srcCol * frameW;

    for (let y = 0; y < frameH; y++) {
        for (let x = 0; x < frameW; x++) {
            const sIdx = (y * decoded.width + (srcX0 + x)) * 4;
            const dIdx = (y * frameW + x) * 4;
            if (sIdx + 3 < decoded.data.length && decoded.data[sIdx + 3] > 128) {
                standBuf[dIdx] = decoded.data[sIdx];
                standBuf[dIdx + 1] = decoded.data[sIdx + 1];
                standBuf[dIdx + 2] = decoded.data[sIdx + 2];
                standBuf[dIdx + 3] = 255;
            }
        }
    }

    const standGrid = bufToGrid(standBuf, frameW, frameH);

    // Generate 3-Frame Animation Loop
    let frames = null;
    let animType = 'stand';
    let frameMs = 150;

    switch (cat) {
        case 'tree_sway':
            // Trees already have existing multi-frame sway
            animType = 'sway';
            frameMs = 240;
            if (decoded.width >= frameW * 3) {
                // Extract the 3 existing frames
                frames = [
                    bufToGrid(standBuf, frameW, frameH),
                    bufToGrid(sampleFrame(decoded, 1, frameW, frameH), frameW, frameH),
                    bufToGrid(sampleFrame(decoded, 2, frameW, frameH), frameW, frameH)
                ];
            } else {
                frames = [
                    standGrid,
                    createPlantSwayFrame(standGrid, frameW, frameH, 3, 2, frameH - 1),
                    createPlantSwayFrame(standGrid, frameW, frameH, -2.5, 5, frameH - 1)
                ];
            }
            animatedCount++;
            break;

        case 'plant_sway':
            animType = 'sway';
            frameMs = 200;
            frames = [
                standGrid,
                createPlantSwayFrame(standGrid, frameW, frameH, 2.2, 2, frameH - 1),
                createPlantSwayFrame(standGrid, frameW, frameH, -1.8, 5, frameH - 1)
            ];
            animatedCount++;
            break;

        case 'cactus_sway':
            animType = 'sway';
            frameMs = 250;
            frames = [
                standGrid,
                createPlantSwayFrame(standGrid, frameW, frameH, 1.2, 1, frameH - 1),
                createPlantSwayFrame(standGrid, frameW, frameH, -1.0, 3, frameH - 1)
            ];
            animatedCount++;
            break;

        case 'fire':
            animType = 'lit';
            frameMs = 120;
            frames = createCampfireFrames(standGrid, frameW, frameH);
            animatedCount++;
            break;

        case 'bioluminescence':
            animType = 'idle';
            frameMs = obj.id === 'glow_caps' ? 220 : 250;
            {
                const aura = obj.id === 'glow_caps' ? [40, 220, 180] : (obj.id === 'cave_moss' ? [60, 200, 120] : [140, 90, 220]);
                const core = obj.id === 'glow_caps' ? [160, 255, 230] : (obj.id === 'cave_moss' ? [120, 240, 160] : [200, 160, 255]);
                frames = createBioluminescenceFrames(standGrid, frameW, frameH, aura, core);
            }
            animatedCount++;
            break;

        case 'crystal_glint':
            animType = 'idle';
            frameMs = obj.id === 'crystal_small' ? 160 : 180;
            {
                const glint = obj.id === 'crystal_spire' ? [200, 160, 255] : [140, 220, 255];
                frames = createCrystalFrames(standGrid, frameW, frameH, glint);
            }
            animatedCount++;
            break;

        case 'well_water':
            animType = 'idle';
            frameMs = 200;
            frames = createWellFrames(standGrid, frameW, frameH);
            animatedCount++;
            break;

        case 'water_bob':
            animType = 'sway';
            frameMs = 240;
            frames = createLilyPadFrames(standGrid, frameW, frameH);
            animatedCount++;
            break;

        case 'door':
            // Doors have existing closed/ajar/open logic
            animType = 'door';
            frameMs = 150;
            frames = [
                bufToGrid(sampleFrame(decoded, 0, frameW, frameH), frameW, frameH),
                bufToGrid(sampleFrame(decoded, 1, frameW, frameH), frameW, frameH),
                bufToGrid(sampleFrame(decoded, 2, frameW, frameH), frameW, frameH)
            ];
            animatedCount++;
            break;

        case 'wall':
            // Walls are 4x5 connected autotile sheets; preserve their 20 frames directly
            animType = 'wall';
            break;

        default: // static
            animType = 'stand';
            frames = [standGrid, standGrid, standGrid];
            break;
    }

    // Assemble RMMZ Character Sheet (3 Columns x 4 Rows)
    if (animType !== 'wall') {
        const sheetCols = 3, sheetRows = 4;
        const sheetW = frameW * sheetCols;
        const sheetH = frameH * sheetRows;
        const sheetBuf = Buffer.alloc(sheetW * sheetH * 4);

        for (let row = 0; row < sheetRows; row++) {
            for (let col = 0; col < sheetCols; col++) {
                const fGrid = frames[col % frames.length];
                const ox = col * frameW;
                const oy = row * frameH;

                for (let y = 0; y < frameH; y++) {
                    for (let x = 0; x < frameW; x++) {
                        const c = fGrid[y][x];
                        const dIdx = ((oy + y) * sheetW + (ox + x)) * 4;
                        if (c) {
                            sheetBuf[dIdx] = c[0];
                            sheetBuf[dIdx + 1] = c[1];
                            sheetBuf[dIdx + 2] = c[2];
                            sheetBuf[dIdx + 3] = 255;
                        } else {
                            sheetBuf[dIdx] = 0; sheetBuf[dIdx + 1] = 0; sheetBuf[dIdx + 2] = 0; sheetBuf[dIdx + 3] = 0;
                        }
                    }
                }
            }
        }

        quantizeTo32(sheetBuf);

        // Write character sheet to game/img/characters/ and art/masters/
        const gamePng = path.join(ROOT, 'game', 'img', 'characters', `${imgKey}.png`);
        const masterPng = path.join(ROOT, 'art', 'masters', `${imgKey}.png`);
        writePNG(gamePng, sheetW, sheetH, sheetBuf);
        writePNG(masterPng, sheetW, sheetH, sheetBuf);

        // Build sidecar
        const sidecar = {
            id: obj.id,
            name: obj.name,
            frameWidth: frameW,
            frameHeight: frameH,
            anchor: [Math.floor(frameW / 2), frameH - 1],
            footprint: frameW >= 96 ? [2, 2] : [1, 1],
            facings: ["S", "W", "E", "N"],
            animations: {
                stand: [0]
            },
            frameMs: frameMs,
            passable: obj.passable === true,
            under: obj.under === true
        };

        if (animType === 'sway') {
            sidecar.animations.sway = [0, 1, 2];
        } else if (animType === 'lit') {
            sidecar.animations.lit = [0, 1, 2];
        } else if (animType === 'idle') {
            sidecar.animations.idle = [0, 1, 2];
        } else if (animType === 'door') {
            sidecar.animations.closed = [0];
            sidecar.animations.ajar = [1];
            sidecar.animations.open = [2];
        }

        const gameJson = path.join(ROOT, 'game', 'img', 'characters', `${imgKey}.json`);
        const masterJson = path.join(ROOT, 'art', 'masters', `${imgKey}.json`);
        fs.writeFileSync(gameJson, JSON.stringify(sidecar, null, 2), 'utf8');
        fs.writeFileSync(masterJson, JSON.stringify(sidecar, null, 2), 'utf8');
    }

    // ------------------------------------------------------------------------
    // Generate Standalone Master Inventory Icon (32x32 and 48x48)
    // ------------------------------------------------------------------------
    const icon32Buf = renderIconFromGrid(standGrid, frameW, frameH, 32);
    const icon48Buf = renderIconFromGrid(standGrid, frameW, frameH, 48);
    quantizeTo32(icon32Buf);
    quantizeTo32(icon48Buf);

    const icon32Path = path.join(ROOT, 'art', 'masters', `${obj.id}_icon.png`);
    const icon48Path = path.join(ROOT, 'art', 'masters', `${obj.id}_icon_48.png`);
    writePNG(icon32Path, 32, 32, icon32Buf);
    writePNG(icon48Path, 48, 48, icon48Buf);

    const iconSidecar = {
        id: `${obj.id}_icon`,
        name: `${obj.name} Icon`,
        frameWidth: 32,
        frameHeight: 32,
        anchor: [16, 31],
        footprint: [1, 1],
        facings: ["S"]
    };
    fs.writeFileSync(path.join(ROOT, 'art', 'masters', `${obj.id}_icon.json`), JSON.stringify(iconSidecar, null, 2), 'utf8');

    generatedCount++;
    reportList.push({
        id: obj.id,
        name: obj.name,
        category: cat,
        animated: animType !== 'stand' && animType !== 'wall',
        animType: animType,
        dims: `${frameW}x${frameH}`
    });
}

function sampleFrame(decoded, col, fw, fh) {
    const buf = Buffer.alloc(fw * fh * 4);
    const sx0 = col * fw;
    for (let y = 0; y < fh; y++) {
        for (let x = 0; x < fw; x++) {
            const sIdx = (y * decoded.width + (sx0 + x)) * 4;
            const dIdx = (y * fw + x) * 4;
            if (sIdx + 3 < decoded.data.length) {
                buf[dIdx] = decoded.data[sIdx];
                buf[dIdx + 1] = decoded.data[sIdx + 1];
                buf[dIdx + 2] = decoded.data[sIdx + 2];
                buf[dIdx + 3] = decoded.data[sIdx + 3];
            }
        }
    }
    return buf;
}

/**
 * Creates a trimmed, centered 32x32 or 48x48 icon from the stand grid.
 */
function renderIconFromGrid(grid, srcW, srcH, iconSize) {
    // Find opaque bounding box
    let minX = srcW, maxX = -1, minY = srcH, maxY = -1;
    for (let y = 0; y < srcH; y++) {
        for (let x = 0; x < srcW; x++) {
            if (grid[y][x]) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    const outBuf = Buffer.alloc(iconSize * iconSize * 4);
    if (maxX < minX || maxY < minY) return outBuf; // empty

    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;

    // Calculate scaling to fit into iconSize with a 2px padding margin
    const targetSize = iconSize - 4;
    const scale = Math.min(1, targetSize / bw, targetSize / bh);
    const dw = Math.max(1, Math.round(bw * scale));
    const dh = Math.max(1, Math.round(bh * scale));
    const destX = Math.floor((iconSize - dw) / 2);
    const destY = Math.floor((iconSize - dh) / 2);

    // Nearest-neighbor resampling
    for (let dy = 0; dy < dh; dy++) {
        const sy = minY + Math.min(bh - 1, Math.floor(dy / scale));
        for (let dx = 0; dx < dw; dx++) {
            const sx = minX + Math.min(bw - 1, Math.floor(dx / scale));
            const c = grid[sy][sx];
            if (c) {
                const o = ((destY + dy) * iconSize + (destX + dx)) * 4;
                outBuf[o] = c[0];
                outBuf[o + 1] = c[1];
                outBuf[o + 2] = c[2];
                outBuf[o + 3] = 255;
            }
        }
    }
    return outBuf;
}

console.log(`Successfully generated character sets and icons for ${generatedCount} world objects!`);
console.log(`Naturally animated objects: ${animatedCount} (sway, lit, idle loops).`);
