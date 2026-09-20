const fs = require('fs');
const path = require('path');
const { decodePNG } = require('../tools/png_read');
const { writePNG } = require('../tools/png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// Load palette
function parseHex(s) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(s).trim());
    return m ? [(parseInt(m[1], 16) >> 16) & 255, (parseInt(m[1], 16) >> 8) & 255, parseInt(m[1], 16) & 255] : null;
}

const hexLines = fs.readFileSync(PALETTE_FILE, 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.startsWith('#'));

const palColors = hexLines.map(parseHex);

function findColor(r, g, b) {
    let bestDist = Infinity;
    let best = palColors[0];
    for (const c of palColors) {
        const d = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2;
        if (d < bestDist) {
            bestDist = d;
            best = c;
        }
    }
    return best;
}

const C = {
    // Greys
    WHITE: findColor(255, 255, 255),
    GREY_TOP: findColor(223, 223, 223),
    GREY_LIT: findColor(206, 206, 206),
    GREY_MID: findColor(158, 158, 158),
    GREY_SHADE: findColor(125, 125, 125),
    GREY_DARK: findColor(97, 97, 97),
    GREY_DEEP: findColor(69, 69, 69),
    CHARCOAL: findColor(36, 36, 36), // #242424
    
    // Malachite / Copper
    MAL_LIT: findColor(125, 223, 125),    // #7DDF7D
    MAL_MIDLIT: findColor(69, 182, 69),  // #45B645
    MAL_MID: findColor(24, 146, 24),     // #189218
    MAL_DARK: findColor(0, 109, 0),      // #006D00
    COPPER_GLINT: findColor(255, 158, 61), // #FF9E3D
    COPPER_WARM: findColor(227, 109, 0),   // #E36D00
    
    // Quartz / Gold
    QUARTZ_TOP: findColor(255, 255, 255),
    QUARTZ_LIT: findColor(239, 239, 239),
    QUARTZ_MIDLIT: findColor(206, 206, 206),
    QUARTZ_MID: findColor(174, 174, 174),
    QUARTZ_SHADE: findColor(142, 142, 142),
    GOLD_CATCH: findColor(255, 255, 255),
    GOLD_BRIGHT: findColor(255, 210, 0),
    GOLD_MID: findColor(255, 174, 0),
    GOLD_DEEP: findColor(219, 174, 32),
    GOLD_SHADE: findColor(198, 150, 24),
    
    // Crystals
    CRYS_CATCH: findColor(255, 255, 255),
    CRYS_LIT: findColor(243, 243, 255),
    CRYS_MIDLIT: findColor(206, 206, 255),
    CRYS_MID: findColor(182, 182, 255),
    CRYS_SHADE: findColor(158, 158, 255),
    CRYS_DARK: findColor(125, 125, 255),
    CRYS_DEEP: findColor(61, 61, 255),
    CRYS_EDGE: findColor(0, 0, 194)
};

class PixelGrid {
    constructor(w, h) {
        this.w = w;
        this.h = h;
        this.pixels = Array.from({ length: h }, () => Array(w).fill(null));
    }
    set(x, y, color) {
        x = Math.round(x);
        y = Math.round(y);
        if (x >= 0 && x < this.w && y >= 0 && y < this.h) {
            this.pixels[y][x] = color;
        }
    }
    get(x, y) {
        if (x >= 0 && x < this.w && y >= 0 && y < this.h) {
            return this.pixels[y][x];
        }
        return null;
    }
    fillPoly(pts, color) {
        let minY = this.h, maxY = 0;
        for (const p of pts) {
            if (p[1] < minY) minY = p[1];
            if (p[1] > maxY) maxY = p[1];
        }
        minY = Math.max(0, Math.floor(minY));
        maxY = Math.min(this.h - 1, Math.ceil(maxY));
        
        for (let y = minY; y <= maxY; y++) {
            const nodeX = [];
            let j = pts.length - 1;
            for (let i = 0; i < pts.length; i++) {
                if ((pts[i][1] < y && pts[j][1] >= y) || (pts[j][1] < y && pts[i][1] >= y)) {
                    nodeX.push(pts[i][0] + (y - pts[i][1]) / (pts[j][1] - pts[i][1]) * (pts[j][0] - pts[i][0]));
                }
                j = i;
            }
            nodeX.sort((a, b) => a - b);
            for (let i = 0; i < nodeX.length; i += 2) {
                if (nodeX[i] >= this.w) break;
                if (nodeX[i + 1] > 0) {
                    const x1 = Math.max(0, Math.round(nodeX[i]));
                    const x2 = Math.min(this.w - 1, Math.round(nodeX[i + 1]));
                    for (let x = x1; x <= x2; x++) {
                        this.set(x, y, color);
                    }
                }
            }
        }
    }
    addSelectiveOutline(outlineColor = C.CHARCOAL) {
        const out = Array.from({ length: this.h }, () => Array(this.w).fill(null));
        for (let y = 0; y < this.h; y++) {
            for (let x = 0; x < this.w; x++) {
                out[y][x] = this.pixels[y][x];
            }
        }
        for (let y = 0; y < this.h; y++) {
            for (let x = 0; x < this.w; x++) {
                if (!this.pixels[y][x]) {
                    let neighborSolid = false;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const ny = y + dy, nx = x + dx;
                            if (ny >= 0 && ny < this.h && nx >= 0 && nx < this.w && this.pixels[ny][nx]) {
                                neighborSolid = true;
                            }
                        }
                    }
                    if (neighborSolid) {
                        out[y][x] = outlineColor;
                    }
                }
            }
        }
        this.pixels = out;
    }
}

// 1. RUGGED COPPER OUTCROP
console.log('Crafting rugged copper_outcrop...');
const copper = new PixelGrid(48, 48);

// Organic rock base from boulder geometry
const boulderPng = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'granite_boulder.png')), 'boulder');
for (let y = 0; y < 48; y++) {
    for (let x = 0; x < 48; x++) {
        const o = (y * 48 + x) * 4;
        if (boulderPng.data[o + 3] > 0) {
            const r = boulderPng.data[o], g = boulderPng.data[o+1], b = boulderPng.data[o+2];
            copper.set(x, y, findColor(r, g, b));
        }
    }
}

// Embed prominent Malachite veins and copper mineral pockets directly along natural crags
// Vein 1: Top crest down through central fracture to bottom-right
const malVein1 = [
    [16, 12], [17, 12], [18, 12],
    [16, 13], [17, 13], [18, 13], [19, 13],
    [17, 14], [18, 14], [19, 14], [20, 14],
    [18, 15], [19, 15], [20, 15], [21, 15],
    [19, 16], [20, 16], [21, 16], [22, 16],
    [20, 17], [21, 17], [22, 17], [23, 17],
    [21, 18], [22, 18], [23, 18], [24, 18],
    [21, 19], [22, 19], [23, 19], [24, 19], [25, 19],
    // Front descent
    [22, 20], [23, 20], [24, 20], [25, 20],
    [23, 21], [24, 21], [25, 21], [26, 21],
    [23, 22], [24, 22], [25, 22], [26, 22], [27, 22],
    [24, 23], [25, 23], [26, 23], [27, 23],
    [25, 24], [26, 24], [27, 24], [28, 24],
    [26, 25], [27, 25], [28, 25], [29, 25],
    [26, 26], [27, 26], [28, 26], [29, 26], [30, 26],
    [27, 27], [28, 27], [29, 27], [30, 27],
    [28, 28], [29, 28], [30, 28], [31, 28],
    [28, 29], [29, 29], [30, 29], [31, 29], [32, 29],
    [29, 30], [30, 30], [31, 30], [32, 30],
    [30, 31], [31, 31], [32, 31], [33, 31],
    [30, 32], [31, 32], [32, 32], [33, 32], [34, 32],
    [31, 33], [32, 33], [33, 33], [34, 33],
    [32, 34], [33, 34], [34, 34], [35, 34],
    [32, 35], [33, 35], [34, 35], [35, 35], [36, 35],
    [33, 36], [34, 36], [35, 36], [36, 36],
    [34, 37], [35, 37], [36, 37], [37, 37],
    [34, 38], [35, 38], [36, 38], [37, 38], [38, 38],
    [35, 39], [36, 39], [37, 39], [38, 39],
    [35, 40], [36, 40], [37, 40], [38, 40],
    [36, 41], [37, 41], [38, 41], [39, 41]
];

for (const [x, y] of malVein1) {
    if (copper.get(x, y)) {
        copper.set(x, y, C.MAL_MIDLIT);
        if (copper.get(x + 1, y)) copper.set(x + 1, y, C.MAL_MID);
        if (copper.get(x - 1, y) && y < 20) copper.set(x - 1, y, C.MAL_LIT);
        if (copper.get(x + 1, y + 1)) copper.set(x + 1, y + 1, C.MAL_DARK);
    }
}

// Vein 2: Left shelf malachite pocket (rows 22..34, cols 10..18)
for (let y = 24; y <= 32; y++) {
    for (let x = 11; x <= 16; x++) {
        if (copper.get(x, y)) {
            if (y === 24 || x === 11) copper.set(x, y, C.MAL_LIT);
            else if (y === 32 || x === 16) copper.set(x, y, C.MAL_DARK);
            else copper.set(x, y, C.MAL_MIDLIT);
        }
    }
}

// Metallic copper nuggets & glints
copper.set(19, 14, C.COPPER_GLINT);
copper.set(20, 14, C.COPPER_GLINT);
copper.set(20, 15, C.COPPER_WARM);

copper.set(27, 23, C.COPPER_GLINT);
copper.set(28, 23, C.COPPER_GLINT);
copper.set(28, 24, C.COPPER_WARM);

copper.set(33, 31, C.COPPER_GLINT);
copper.set(34, 31, C.COPPER_GLINT);
copper.set(34, 32, C.COPPER_WARM);

copper.set(13, 27, C.COPPER_GLINT);
copper.set(14, 27, C.COPPER_WARM);

copper.addSelectiveOutline(C.CHARCOAL);


// 2. RUGGED GOLD OUTCROP (Pale Quartz with Gold Veins)
console.log('Crafting rugged gold_outcrop...');
const gold = new PixelGrid(48, 48);

// Start from boulder geometry, shifted to pale quartz palette
for (let y = 0; y < 48; y++) {
    for (let x = 0; x < 48; x++) {
        const o = (y * 48 + x) * 4;
        if (boulderPng.data[o + 3] > 0) {
            const r = boulderPng.data[o], g = boulderPng.data[o+1], b = boulderPng.data[o+2];
            // Map boulder grey ramp to quartz pale ramp
            let qColor = C.QUARTZ_MID;
            if (r > 200) qColor = C.QUARTZ_TOP;
            else if (r > 170) qColor = C.QUARTZ_LIT;
            else if (r > 130) qColor = C.QUARTZ_MIDLIT;
            else if (r > 90) qColor = C.QUARTZ_MID;
            else if (r > 50) qColor = C.QUARTZ_SHADE;
            else qColor = C.CHARCOAL;
            gold.set(x, y, qColor);
        }
    }
}

// Embed branched Gold Veins
// Main Vein (crest down through center-right)
const goldVeinMain = [
    [20, 11], [21, 11], [22, 11],
    [21, 12], [22, 12], [23, 12],
    [22, 13], [23, 13], [24, 13],
    [22, 14], [23, 14], [24, 14],
    [23, 15], [24, 15], [25, 15],
    [24, 16], [25, 16], [26, 16],
    [24, 17], [25, 17], [26, 17], [27, 17],
    [25, 18], [26, 18], [27, 18],
    [26, 19], [27, 19], [28, 19],
    [26, 20], [27, 20], [28, 20],
    [27, 21], [28, 21], [29, 21],
    [27, 22], [28, 22], [29, 22], [30, 22],
    [28, 23], [29, 23], [30, 23],
    [29, 24], [30, 24], [31, 24],
    [29, 25], [30, 25], [31, 25], [32, 25],
    [30, 26], [31, 26], [32, 26],
    [31, 27], [32, 27], [33, 27],
    [31, 28], [32, 28], [33, 28], [34, 28],
    [32, 29], [33, 29], [34, 29],
    [33, 30], [34, 30], [35, 30],
    [33, 31], [34, 31], [35, 31], [36, 31],
    [34, 32], [35, 32], [36, 32],
    [35, 33], [36, 33], [37, 33],
    [35, 34], [36, 34], [37, 34], [38, 34],
    [36, 35], [37, 35], [38, 35],
    [37, 36], [38, 36], [39, 36],
    [37, 37], [38, 37], [39, 37], [40, 37],
    [38, 38], [39, 38], [40, 38]
];

for (const [x, y] of goldVeinMain) {
    if (gold.get(x, y)) {
        gold.set(x, y, C.GOLD_BRIGHT);
        if (gold.get(x + 1, y)) gold.set(x + 1, y, C.GOLD_MID);
        if (gold.get(x + 1, y + 1)) gold.set(x + 1, y + 1, C.GOLD_DEEP);
    }
}

// Branch vein heading down-left across south face
const goldBranch = [
    [26, 20], [25, 21], [24, 22], [23, 23], [22, 24], [21, 25],
    [20, 26], [19, 27], [18, 28], [17, 29], [16, 30], [15, 31],
    [15, 32], [14, 33], [14, 34], [13, 35], [13, 36]
];

for (const [x, y] of goldBranch) {
    if (gold.get(x, y)) {
        gold.set(x, y, C.GOLD_MID);
        if (gold.get(x + 1, y)) gold.set(x + 1, y, C.GOLD_DEEP);
    }
}

// Catchlights on gold
gold.set(21, 12, C.GOLD_CATCH);
gold.set(24, 15, C.GOLD_CATCH);
gold.set(28, 22, C.GOLD_CATCH);
gold.set(32, 28, C.GOLD_CATCH);
gold.set(21, 25, C.GOLD_CATCH);

gold.addSelectiveOutline(C.CHARCOAL);


// 3. CRYSTAL CLUSTER (Refined sharp prisms with 3 frames)
console.log('Crafting crystalline crystal cluster...');
function drawRefinedCrystalCluster(glintFrame = 0) {
    const grid = new PixelGrid(48, 48);
    
    // Jagged rock pedestal base
    grid.fillPoly([[8, 41], [38, 41], [42, 47], [6, 47]], C.GREY_MID);
    grid.fillPoly([[26, 41], [38, 41], [42, 47], [30, 47]], C.GREY_SHADE);
    grid.fillPoly([[6, 45], [42, 45], [42, 47], [6, 47]], C.CHARCOAL);
    
    // Prism 1 (Main central tall): tip at [23, 6], base rows 38..42, cols 19..28
    grid.fillPoly([[23, 6], [27, 10], [28, 42], [24, 42]], C.CRYS_MID);
    grid.fillPoly([[23, 6], [18, 11], [19, 42], [24, 42]], C.CRYS_LIT);
    grid.fillPoly([[27, 10], [30, 13], [31, 42], [28, 42]], C.CRYS_DARK);
    for (let y = 6; y <= 42; y++) grid.set(23, y, C.CRYS_MIDLIT);
    for (let y = 13; y <= 42; y++) grid.set(31, y, C.CRYS_EDGE);
    
    // Prism 2 (Left leaning tall): tip at [13, 13], base rows 38..42, cols 10..19
    grid.fillPoly([[13, 13], [17, 17], [19, 42], [15, 42]], C.CRYS_MID);
    grid.fillPoly([[13, 13], [9, 18], [11, 42], [15, 42]], C.CRYS_LIT);
    grid.fillPoly([[17, 17], [20, 20], [22, 42], [19, 42]], C.CRYS_DARK);
    for (let y = 13; y <= 42; y++) {
        const x = 13 + Math.floor((y - 13) * 0.18);
        grid.set(x, y, C.CRYS_MIDLIT);
    }
    
    // Prism 3 (Right tall spire): tip at [33, 10], base rows 38..42, cols 28..37
    grid.fillPoly([[33, 10], [36, 14], [36, 42], [33, 42]], C.CRYS_MID);
    grid.fillPoly([[33, 10], [29, 15], [30, 42], [33, 42]], C.CRYS_LIT);
    grid.fillPoly([[36, 14], [39, 17], [40, 42], [36, 42]], C.CRYS_DARK);
    for (let y = 10; y <= 42; y++) {
        const x = 33 + Math.floor((y - 10) * 0.08);
        grid.set(x, y, C.CRYS_MIDLIT);
    }
    for (let y = 17; y <= 42; y++) grid.set(40, y, C.CRYS_EDGE);
    
    // Prism 4 (Front center small): tip at [20, 24], base rows 42..45
    grid.fillPoly([[20, 24], [23, 27], [24, 44], [21, 44]], C.CRYS_MIDLIT);
    grid.fillPoly([[20, 24], [17, 27], [18, 44], [21, 44]], C.CRYS_LIT);
    grid.fillPoly([[23, 27], [25, 29], [26, 44], [24, 44]], C.CRYS_DARK);
    
    // Prism 5 (Far right small): tip at [38, 25], base rows 42..45
    grid.fillPoly([[38, 25], [40, 28], [41, 44], [39, 44]], C.CRYS_MIDLIT);
    grid.fillPoly([[38, 25], [35, 28], [36, 44], [39, 44]], C.CRYS_LIT);
    grid.fillPoly([[40, 28], [42, 30], [43, 44], [41, 44]], C.CRYS_DARK);

    // Tip Catchlights on Frame 0
    grid.set(23, 6, C.CRYS_CATCH);
    grid.set(13, 13, C.CRYS_CATCH);
    grid.set(33, 10, C.CRYS_CATCH);
    grid.set(20, 24, C.CRYS_CATCH);
    grid.set(38, 25, C.CRYS_CATCH);

    // Glint animations
    if (glintFrame === 1) {
        // Main Spire Sparkle at [23, 6]
        const gx = 23, gy = 6;
        grid.set(gx, gy, C.WHITE);
        grid.set(gx - 1, gy, C.WHITE);
        grid.set(gx + 1, gy, C.WHITE);
        grid.set(gx, gy - 1, C.WHITE);
        grid.set(gx, gy + 1, C.WHITE);
        grid.set(gx - 2, gy, C.CRYS_MIDLIT);
        grid.set(gx + 2, gy, C.CRYS_MIDLIT);
        grid.set(gx, gy - 2, C.CRYS_MIDLIT);
        grid.set(gx, gy + 2, C.CRYS_MIDLIT);
    } else if (glintFrame === 2) {
        // Right Spire Sparkle at [33, 10]
        const gx = 33, gy = 10;
        grid.set(gx, gy, C.WHITE);
        grid.set(gx - 1, gy, C.WHITE);
        grid.set(gx + 1, gy, C.WHITE);
        grid.set(gx, gy - 1, C.WHITE);
        grid.set(gx, gy + 1, C.WHITE);
        grid.set(gx - 2, gy, C.CRYS_MIDLIT);
        grid.set(gx + 2, gy, C.CRYS_MIDLIT);
        grid.set(gx, gy - 2, C.CRYS_MIDLIT);
        grid.set(gx, gy + 2, C.CRYS_MIDLIT);
    }

    grid.addSelectiveOutline(C.CHARCOAL);
    return grid;
}


// 4. CRYSTAL SMALL (Refined low scatter with 3 frames)
console.log('Crafting crystalline crystal_small...');
function drawRefinedCrystalSmall(glintFrame = 0) {
    const grid = new PixelGrid(48, 48);
    
    // Lies low under people, rows 32..47
    grid.fillPoly([[10, 42], [18, 42], [20, 47], [8, 47]], C.GREY_MID);
    grid.fillPoly([[22, 40], [32, 40], [34, 47], [20, 47]], C.GREY_MID);
    grid.fillPoly([[33, 43], [40, 43], [42, 47], [32, 47]], C.GREY_SHADE);
    grid.fillPoly([[8, 45], [42, 45], [42, 47], [8, 47]], C.CHARCOAL);
    
    // Shard 1 (left): tip at [13, 34]
    grid.fillPoly([[13, 34], [15, 37], [16, 44], [14, 44]], C.CRYS_MID);
    grid.fillPoly([[13, 34], [11, 37], [12, 44], [14, 44]], C.CRYS_LIT);
    grid.fillPoly([[15, 37], [17, 39], [18, 44], [16, 44]], C.CRYS_DARK);
    
    // Shard 2 (center tall): tip at [26, 30]
    grid.fillPoly([[26, 30], [29, 34], [30, 44], [27, 44]], C.CRYS_MID);
    grid.fillPoly([[26, 30], [23, 34], [24, 44], [27, 44]], C.CRYS_LIT);
    grid.fillPoly([[29, 34], [32, 36], [33, 44], [30, 44]], C.CRYS_DARK);
    for (let y = 30; y <= 44; y++) grid.set(26, y, C.CRYS_MIDLIT);
    
    // Shard 3 (center small): tip at [20, 36]
    grid.fillPoly([[20, 36], [22, 39], [23, 45], [21, 45]], C.CRYS_MIDLIT);
    grid.fillPoly([[20, 36], [18, 39], [19, 45], [21, 45]], C.CRYS_LIT);
    grid.fillPoly([[22, 39], [24, 41], [25, 45], [23, 45]], C.CRYS_DARK);
    
    // Shard 4 (right): tip at [36, 35]
    grid.fillPoly([[36, 35], [38, 38], [39, 45], [37, 45]], C.CRYS_MID);
    grid.fillPoly([[36, 35], [34, 38], [35, 45], [37, 45]], C.CRYS_LIT);
    grid.fillPoly([[38, 38], [40, 40], [41, 45], [39, 45]], C.CRYS_DARK);

    grid.set(13, 34, C.CRYS_CATCH);
    grid.set(26, 30, C.CRYS_CATCH);
    grid.set(20, 36, C.CRYS_CATCH);
    grid.set(36, 35, C.CRYS_CATCH);

    if (glintFrame === 1) {
        const gx = 13, gy = 34;
        grid.set(gx, gy, C.WHITE);
        grid.set(gx - 1, gy, C.WHITE);
        grid.set(gx + 1, gy, C.WHITE);
        grid.set(gx, gy - 1, C.WHITE);
        grid.set(gx, gy + 1, C.WHITE);
    } else if (glintFrame === 2) {
        const gx = 26, gy = 30;
        grid.set(gx, gy, C.WHITE);
        grid.set(gx - 1, gy, C.WHITE);
        grid.set(gx + 1, gy, C.WHITE);
        grid.set(gx, gy - 1, C.WHITE);
        grid.set(gx, gy + 1, C.WHITE);
    }

    grid.addSelectiveOutline(C.CHARCOAL);
    return grid;
}

// 5. PACK AND DELIVER ALL 4
const BATCH2 = [
    {
        id: 'copper_outcrop',
        name: 'Copper outcrop',
        category: 'Geology',
        frames: [copper],
        layer: null,
        passable: false,
        animations: { stand: [0] }
    },
    {
        id: 'gold_outcrop',
        name: 'Gold outcrop',
        category: 'Geology',
        frames: [gold],
        layer: null,
        passable: false,
        animations: { stand: [0] }
    },
    {
        id: 'crystal',
        name: 'Crystal cluster',
        category: 'Geology',
        frames: [drawRefinedCrystalCluster(0), drawRefinedCrystalCluster(1), drawRefinedCrystalCluster(2)],
        layer: null,
        passable: false,
        animations: { stand: [0], glint: [0, 1, 2, 0] },
        frameMs: 200
    },
    {
        id: 'crystal_small',
        name: 'Small crystals',
        category: 'Geology',
        frames: [drawRefinedCrystalSmall(0), drawRefinedCrystalSmall(1), drawRefinedCrystalSmall(2)],
        layer: 'under',
        passable: true,
        animations: { stand: [0], glint: [0, 1, 2, 0] },
        frameMs: 200
    }
];

const meadowDecoded = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'meadow.png')), 'meadow.png');
const settlerDecoded = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'human_male_stand_south.png')), 'human_male_stand_south.png');

for (const item of BATCH2) {
    const numFrames = item.frames.length;
    const totalW = 48 * numFrames;
    const totalH = 48;
    
    const colors = new Set();
    for (const f of item.frames) {
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const c = f.get(x, y);
                if (c) colors.add((c[0] << 16) | (c[1] << 8) | c[2]);
            }
        }
    }
    console.log(`${item.id}: ${numFrames} frames, ${colors.size}/32 unique colors`);

    // Master RGBA Buffer
    const masterBuf = Buffer.alloc(totalW * totalH * 4);
    for (let fIdx = 0; fIdx < numFrames; fIdx++) {
        const f = item.frames[fIdx];
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const outX = fIdx * 48 + x;
                const o = (y * totalW + outX) * 4;
                const c = f.get(x, y);
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
    }
    const masterPath = path.join(ROOT, 'art', 'masters', `${item.id}.png`);
    writePNG(masterPath, totalW, totalH, masterBuf);
    console.log(`Saved master: ${masterPath}`);

    // Sidecar
    const sidecar = {
        id: item.id,
        name: item.name,
        category: item.category,
        dimensions: numFrames > 1 ? `${totalW}x${totalH}` : "48x48",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S"],
        animations: item.animations,
        palette: "art/palette/uf.hex",
        colorCount: colors.size,
        updatedDate: "2026-09-19"
    };
    if (item.layer) sidecar.layer = item.layer;
    if (item.passable !== undefined) sidecar.passable = item.passable;
    if (item.frameMs) sidecar.frameMs = item.frameMs;

    const sidecarPath = path.join(ROOT, 'art', 'masters', `${item.id}.json`);
    fs.writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2), 'utf8');
    console.log(`Saved sidecar: ${sidecarPath}`);

    // 4x Raw PNG
    const rawW = totalW * 4;
    const rawH = totalH * 4;
    const rawBuf = Buffer.alloc(rawW * rawH * 4);
    for (let y = 0; y < rawH; y++) {
        for (let x = 0; x < rawW; x++) {
            const gx = Math.floor(x / 4);
            const gy = Math.floor(y / 4);
            const fIdx = Math.floor(gx / 48);
            const fx = gx % 48;
            const c = item.frames[fIdx].get(fx, gy);
            const o = (y * rawW + x) * 4;
            if (c) {
                rawBuf[o] = c[0];
                rawBuf[o + 1] = c[1];
                rawBuf[o + 2] = c[2];
                rawBuf[o + 3] = 255;
            } else {
                rawBuf[o] = 255;
                rawBuf[o + 1] = 0;
                rawBuf[o + 2] = 255;
                rawBuf[o + 3] = 255;
            }
        }
    }
    const rawPath = path.join(ROOT, 'art', 'raw', `${item.id}.png`);
    writePNG(rawPath, rawW, rawH, rawBuf);
    console.log(`Saved 4x raw: ${rawPath}`);

    // Review on magenta
    writePNG(path.join(ROOT, 'art', 'review', `${item.id}_4x_magenta.png`), rawW, rawH, rawBuf);

    // Review on meadow
    const meadowBuf = Buffer.alloc(192 * 192 * 4);
    const f0 = item.frames[0];
    for (let y = 0; y < 192; y++) {
        for (let x = 0; x < 192; x++) {
            const mx = Math.floor(x / 4) % meadowDecoded.width;
            const my = Math.floor(y / 4) % meadowDecoded.height;
            const mo = (my * meadowDecoded.width + mx) * 4;
            
            const gx = Math.floor(x / 4);
            const gy = Math.floor(y / 4);
            const c = f0.get(gx, gy);
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
    writePNG(path.join(ROOT, 'art', 'review', `${item.id}_on_meadow_4x.png`), 192, 192, meadowBuf);

    // Review showcase with settler
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
                const so = (screenY * 48 + screenX) * 4;
                if (settlerDecoded.data[so + 3] > 0) {
                    r = settlerDecoded.data[so];
                    g = settlerDecoded.data[so + 1];
                    b = settlerDecoded.data[so + 2];
                }
            } else {
                const ax = screenX - 48;
                const ay = screenY;
                const ac = f0.get(ax, ay);
                if (ac) {
                    r = ac[0];
                    g = ac[1];
                    b = ac[2];
                }
                if (item.layer === 'under') {
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
    writePNG(path.join(ROOT, 'art', 'review', `${item.id}_settler_showcase_4x.png`), compW, compH, compBuf);
}

// Master Lineup for Batch 2
const lineupW = 5 * 48 * 4;
const lineupH = 48 * 4;
const lineupBuf = Buffer.alloc(lineupW * lineupH * 4);

const lineupItems = [
    { name: 'Settler', getCol: (x, y) => {
        const o = (y * 48 + x) * 4;
        return settlerDecoded.data[o + 3] > 0 ? [settlerDecoded.data[o], settlerDecoded.data[o + 1], settlerDecoded.data[o + 2]] : null;
    }},
    { name: 'Copper', getCol: (x, y) => BATCH2[0].frames[0].get(x, y) },
    { name: 'Gold', getCol: (x, y) => BATCH2[1].frames[0].get(x, y) },
    { name: 'Crystal', getCol: (x, y) => BATCH2[2].frames[0].get(x, y) },
    { name: 'Crystal Small', getCol: (x, y) => BATCH2[3].frames[0].get(x, y) }
];

for (let y = 0; y < lineupH; y++) {
    for (let x = 0; x < lineupW; x++) {
        const o = (y * lineupW + x) * 4;
        const screenX = Math.floor(x / 4);
        const screenY = Math.floor(y / 4);
        const tileIdx = Math.floor(screenX / 48);
        const localX = screenX % 48;
        const localY = screenY;

        const mx = screenX % meadowDecoded.width;
        const my = screenY % meadowDecoded.height;
        const mo = (my * meadowDecoded.width + mx) * 4;
        let r = meadowDecoded.data[mo];
        let g = meadowDecoded.data[mo + 1];
        let b = meadowDecoded.data[mo + 2];

        const item = lineupItems[tileIdx];
        if (item) {
            const c = item.getCol(localX, localY);
            if (c) {
                r = c[0];
                g = c[1];
                b = c[2];
            }
        }

        if (localX === 0 || localX === 47) {
            r = Math.round(r * 0.85);
            g = Math.round(g * 0.85);
            b = Math.round(b * 0.85);
        }

        lineupBuf[o] = r;
        lineupBuf[o + 1] = g;
        lineupBuf[o + 2] = b;
        lineupBuf[o + 3] = 255;
    }
}
const lineupPath = path.join(ROOT, 'art', 'review', 'minerals_batch2_lineup_4x.png');
writePNG(lineupPath, lineupW, lineupH, lineupBuf);
console.log(`Saved batch 2 master lineup: ${lineupPath}`);
