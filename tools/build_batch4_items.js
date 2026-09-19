const fs = require('fs');
const path = require('path');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

function parseHex(s) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(s).trim());
    return m ? [(parseInt(m[1], 16) >> 16) & 255, (parseInt(m[1], 16) >> 8) & 255, parseInt(m[1], 16) & 255] : null;
}

const hexLines = fs.readFileSync(PALETTE_FILE, 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.startsWith('#'));

const palColors = hexLines.map(parseHex);

// Colors from briefs SEG-06_items_a.md & SEG-07_items_b_tools_clothes.md
const C = {
    MAGENTA: [255, 0, 255],
    SILHOUETTE: palColors[147], // #201408

    // mushroom
    CAP_LIT: palColors[149],  // #DFD7D2
    CAP_MID: palColors[150],  // #CEC6BE
    CAP_RIM: palColors[152],  // #AEA29A
    GILL_BASE: palColors[136],// #CAB292
    GILL_RAY: palColors[137], // #BA9A71
    MUSH_STEM: palColors[135],// #DBCAB2
    MUSH_SHADE: palColors[154],// #8E8279

    // root
    ROOT_TOP: palColors[135],   // #DBCAB2
    ROOT_BODY: palColors[136],  // #CAB292
    ROOT_SIDE: palColors[137],  // #BA9A71
    ROOT_TIP: palColors[139],   // #9A7141
    SOIL: palColors[143],       // #5D350C
    LEAF_TIP: palColors[241],   // #45B645
    LEAF_MID: palColors[242],   // #189218
    LEAF_BASE: palColors[243],  // #006D00

    // seeds
    CLOTH_LIT: palColors[137],  // #BA9A71
    CLOTH_BODY: palColors[138], // #AA8659
    CLOTH_SOUTH: palColors[139],// #9A7141
    CLOTH_EAST: palColors[140], // #8A5D2D
    MOUTH: palColors[145],      // #3D240C
    CORD: palColors[143],       // #5D350C
    SEED_LIT: palColors[4],     // #EFD251
    SEED_MID: palColors[6],     // #DBAE20
    SEED_DARK: palColors[8],    // #B28210

    // fiber
    FIBER_LIT: palColors[2],    // #F7E7A6
    FIBER_MIDLIT: palColors[3], // #F3DF79
    FIBER_BELLY: palColors[136],// #CAB292
    FIBER_STRAND: palColors[137],// #BA9A71
    FRESH_END1: palColors[202], // #7D9600
    FRESH_END2: palColors[168], // #71864D
    TIE_CORD: palColors[139],   // #9A7141
    TIE_KNOT: palColors[141],   // #7D4D18
};

class CanvasGrid {
    constructor(w, h) {
        this.w = w;
        this.h = h;
        this.data = Array.from({ length: h }, () => Array(w).fill(C.MAGENTA));
    }
    set(x, y, color) {
        x = Math.round(x);
        y = Math.round(y);
        if (x >= 0 && x < this.w && y >= 0 && y < this.h) {
            this.data[y][x] = color;
        }
    }
    get(x, y) {
        if (x >= 0 && x < this.w && y >= 0 && y < this.h) {
            return this.data[y][x];
        }
        return C.MAGENTA;
    }
    isBg(x, y) {
        const c = this.get(x, y);
        return c[0] === 255 && c[1] === 0 && c[2] === 255;
    }
    addSelectiveOutline(outlineColor = C.SILHOUETTE) {
        const out = Array.from({ length: this.h }, () => Array(this.w).fill(C.MAGENTA));
        for (let y = 0; y < this.h; y++) {
            for (let x = 0; x < this.w; x++) {
                out[y][x] = this.data[y][x];
            }
        }
        for (let y = 0; y < this.h; y++) {
            for (let x = 0; x < this.w; x++) {
                if (this.isBg(x, y)) {
                    let neighborSolid = false;
                    for (let dy = -1; dy <= 0; dy++) {
                        for (let dx = -1; dx <= 0; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const ny = y + dy, nx = x + dx;
                            if (ny >= 0 && ny < this.h && nx >= 0 && nx < this.w && !this.isBg(nx, ny)) {
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
        this.data = out;
    }
    toBuffers() {
        const buf1x = Buffer.alloc(this.w * this.h * 4);
        for (let y = 0; y < this.h; y++) {
            for (let x = 0; x < this.w; x++) {
                const c = this.data[y][x];
                const isBg = (c[0] === 255 && c[1] === 0 && c[2] === 255);
                const o = (y * this.w + x) * 4;
                buf1x[o] = c[0];
                buf1x[o + 1] = c[1];
                buf1x[o + 2] = c[2];
                buf1x[o + 3] = isBg ? 0 : 255;
            }
        }
        const rawW = this.w * 4;
        const rawH = this.h * 4;
        const buf4x = Buffer.alloc(rawW * rawH * 4);
        for (let y = 0; y < rawH; y++) {
            for (let x = 0; x < rawW; x++) {
                const gx = Math.floor(x / 4);
                const gy = Math.floor(y / 4);
                const c = this.data[gy][gx];
                const o = (y * rawW + x) * 4;
                buf4x[o] = c[0];
                buf4x[o + 1] = c[1];
                buf4x[o + 2] = c[2];
                buf4x[o + 3] = 255;
            }
        }
        return { buf1x, buf4x };
    }
}

// ----------------------------------------------------
// BUILD ITEMS
// ----------------------------------------------------

console.log('Synthesizing Batch 4 items...');

// 1. MUSHROOM (Ground: 48x48, Icon: 32x32)
function buildMushroomGround() {
    const g = new CanvasGrid(48, 48);
    // Contact: row 47 from col 15 to 35
    // Mushroom 3 (small dome behind, rows 32..36, cols 20..27)
    for (let y = 32; y <= 36; y++) {
        const minX = (y === 32) ? 22 : 20;
        const maxX = (y === 32) ? 25 : 27;
        for (let x = minX; x <= maxX; x++) {
            if (y === 36) g.set(x, y, C.CAP_RIM);
            else g.set(x, y, C.CAP_LIT);
        }
    }
    // Mushroom 2 (standing cap-up at right, rows 36..47, cols 26..36)
    for (let y = 36; y <= 42; y++) {
        const minX = (y === 36) ? 28 : 26;
        const maxX = (y === 36) ? 34 : 36;
        for (let x = minX; x <= maxX; x++) {
            if (y === 42) g.set(x, y, C.CAP_RIM);
            else if (x >= 31 && (x + y) % 2 === 0) g.set(x, y, C.CAP_MID);
            else g.set(x, y, C.CAP_LIT);
        }
    }
    // Stem of mushroom 2: rows 42..47, cols 30..34
    for (let y = 42; y <= 47; y++) {
        for (let x = 30; x <= 34; x++) {
            if (x === 34) g.set(x, y, C.MUSH_SHADE);
            else g.set(x, y, C.MUSH_STEM);
        }
    }

    // Mushroom 1 (front, on side, cap toward viewer: rows 38..46, cols 15..25)
    for (let y = 38; y <= 46; y++) {
        const minX = (y === 38 || y === 46) ? 17 : 15;
        const maxX = (y === 38 || y === 46) ? 23 : 25;
        for (let x = minX; x <= maxX; x++) {
            g.set(x, y, C.GILL_BASE);
        }
    }
    // Radial gill lines
    const gillPts = [[17, 40], [20, 39], [23, 40], [24, 42], [23, 44], [20, 45], [17, 44], [16, 42]];
    for (const [gx, gy] of gillPts) g.set(gx, gy, C.GILL_RAY);

    // Stem of mushroom 1 pointing right: rows 41..45, cols 25..33
    for (let y = 41; y <= 45; y++) {
        for (let x = 25; x <= 33; x++) {
            if (y === 45) g.set(x, y, C.MUSH_SHADE);
            else g.set(x, y, C.MUSH_STEM);
        }
    }

    // Contact line
    for (let x = 15; x <= 35; x++) g.set(x, 47, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

function buildMushroomIcon() {
    const g = new CanvasGrid(32, 32);
    // Centered: rows 9..22, cols 6..25
    // Cap 2 (right)
    for (let y = 10; y <= 15; y++) {
        for (let x = 16; x <= 24; x++) {
            if (y === 15) g.set(x, y, C.CAP_RIM);
            else if (x >= 20 && (x + y) % 2 === 0) g.set(x, y, C.CAP_MID);
            else g.set(x, y, C.CAP_LIT);
        }
    }
    for (let y = 15; y <= 21; y++) {
        for (let x = 19; x <= 22; x++) {
            if (x === 22) g.set(x, y, C.MUSH_SHADE);
            else g.set(x, y, C.MUSH_STEM);
        }
    }
    // Cap 1 (front left)
    for (let y = 12; y <= 19; y++) {
        for (let x = 7; x <= 16; x++) {
            g.set(x, y, C.GILL_BASE);
        }
    }
    g.set(9, 14, C.GILL_RAY);
    g.set(11, 13, C.GILL_RAY);
    g.set(13, 14, C.GILL_RAY);
    g.set(14, 16, C.GILL_RAY);
    g.set(13, 18, C.GILL_RAY);
    g.set(11, 19, C.GILL_RAY);
    g.set(9, 18, C.GILL_RAY);

    for (let x = 8; x <= 23; x++) g.set(x, 21, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

// 2. ROOT (Ground: 48x48, Icon: 32x32)
function buildRootGround() {
    const g = new CanvasGrid(48, 48);
    // Wedge 8px thick at [14, 33]..[21, 41] tapering to tip at [33, 46]
    // Contact on rows 44..47, cols 20..33
    for (let t = 0; t <= 20; t++) {
        const frac = t / 20;
        const cx = 17 + frac * 16;
        const cy = 37 + frac * 9;
        const halfThick = 4.0 * (1 - frac * 0.85);
        // Normal vector
        const nx = -0.49, ny = 0.87;
        for (let s = -halfThick; s <= halfThick; s++) {
            const x = Math.round(cx + s * nx);
            const y = Math.round(cy + s * ny);
            if (s < -halfThick * 0.5) g.set(x, y, C.ROOT_TOP);
            else if (s > halfThick * 0.5) g.set(x, y, C.ROOT_SIDE);
            else if (frac > 0.75) g.set(x, y, C.ROOT_TIP);
            else g.set(x, y, C.ROOT_BODY);
        }
    }
    // Clods of soil clinging to thick end
    g.set(14, 39, C.SOIL); g.set(15, 39, C.SOIL);
    g.set(14, 40, C.SOIL); g.set(15, 40, C.SOIL);
    // Root hairs trailing down
    g.set(24, 46, C.ROOT_TIP);
    g.set(28, 46, C.ROOT_TIP);
    g.set(31, 47, C.ROOT_TIP);

    // Tuft of 5 leaves leaning up-left ending at row 27 col 8 to row 31 col 18
    const leafStems = [
        [[15, 33], [13, 31], [11, 29], [9, 27], [8, 27]],
        [[16, 33], [14, 31], [12, 29], [11, 28]],
        [[17, 34], [16, 32], [15, 30], [14, 28]],
        [[18, 35], [17, 33], [17, 31], [16, 30]],
        [[19, 36], [19, 34], [19, 32], [18, 31]]
    ];
    for (const pts of leafStems) {
        for (let i = 0; i < pts.length; i++) {
            const [lx, ly] = pts[i];
            let col = C.LEAF_BASE;
            if (i >= pts.length - 2) col = C.LEAF_TIP;
            else if (i >= 1) col = C.LEAF_MID;
            g.set(lx, ly, col);
            g.set(lx + 1, ly, col);
        }
    }

    // Contact line
    for (let x = 20; x <= 33; x++) g.set(x, 47, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

function buildRootIcon() {
    const g = new CanvasGrid(32, 32);
    // Centered root: rows 8..23, cols 5..26
    for (let t = 0; t <= 16; t++) {
        const frac = t / 16;
        const cx = 11 + frac * 13;
        const cy = 16 + frac * 6;
        const halfThick = 3.2 * (1 - frac * 0.8);
        const nx = -0.49, ny = 0.87;
        for (let s = -halfThick; s <= halfThick; s++) {
            const x = Math.round(cx + s * nx);
            const y = Math.round(cy + s * ny);
            if (s < -halfThick * 0.4) g.set(x, y, C.ROOT_TOP);
            else if (s > halfThick * 0.4) g.set(x, y, C.ROOT_SIDE);
            else if (frac > 0.75) g.set(x, y, C.ROOT_TIP);
            else g.set(x, y, C.ROOT_BODY);
        }
    }
    // Leaf tuft
    for (let dx = 0; dx < 6; dx++) {
        const lx = 10 - dx;
        const ly = 14 - Math.floor(dx * 0.8);
        g.set(lx, ly, (dx >= 4) ? C.LEAF_TIP : C.LEAF_MID);
        g.set(lx + 1, ly, (dx >= 4) ? C.LEAF_TIP : C.LEAF_BASE);
    }
    for (let x = 14; x <= 24; x++) g.set(x, 22, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

// 3. SEEDS (Ground: 48x48, Icon: 32x32)
function buildSeedsGround() {
    const g = new CanvasGrid(48, 48);
    // Rounded sack 16w x 12h on rows 36..47, cols 17..32. Contact row 47 cols 19..32.
    for (let y = 36; y <= 47; y++) {
        const spanY = (y <= 42) ? (y - 35) / 7 : (47 - y) / 5;
        const minX = Math.round(24 - 7 * Math.sqrt(Math.max(0, spanY)));
        const maxX = Math.round(24 + 8 * Math.sqrt(Math.max(0, spanY)));
        for (let x = minX; x <= maxX; x++) {
            if (x <= 21 && y <= 40) {
                if ((x + y) % 2 === 0) g.set(x, y, C.CLOTH_LIT);
                else g.set(x, y, C.CLOTH_BODY);
            } else if (y >= 44) {
                g.set(x, y, C.CLOTH_SOUTH);
            } else if (x >= 30) {
                g.set(x, y, C.CLOTH_EAST);
            } else {
                g.set(x, y, C.CLOTH_BODY);
            }
        }
    }
    // Folds
    g.set(22, 40, C.CLOTH_SOUTH); g.set(23, 41, C.CLOTH_SOUTH); g.set(24, 42, C.CLOTH_SOUTH);
    g.set(26, 40, C.CLOTH_SOUTH); g.set(27, 41, C.CLOTH_SOUTH);

    // Neck: rows 34..36, cols 21..27
    for (let y = 34; y <= 36; y++) {
        for (let x = 21; x <= 27; x++) g.set(x, y, C.CLOTH_BODY);
    }
    // Cord tie on row 35
    for (let x = 21; x <= 27; x++) g.set(x, 35, C.CORD);
    // Hanging cord ends
    g.set(23, 36, C.CORD); g.set(23, 37, C.CORD); g.set(23, 38, C.CORD);
    g.set(25, 36, C.CORD); g.set(25, 37, C.CORD);

    // Mouth opening: rows 32..33, cols 22..26 in MOUTH
    for (let y = 32; y <= 33; y++) {
        for (let x = 22; x <= 26; x++) g.set(x, y, C.MOUTH);
    }
    // Seeds in mouth
    g.set(23, 33, C.SEED_LIT);
    g.set(25, 33, C.SEED_LIT);

    // 11 spilled seeds on rows 43..47, cols 10..18
    const spilled = [
        [16, 44, C.SEED_LIT], [18, 44, C.SEED_MID], [14, 45, C.SEED_LIT],
        [16, 45, C.SEED_MID], [17, 46, C.SEED_DARK], [13, 46, C.SEED_MID],
        [15, 46, C.SEED_LIT], [11, 46, C.SEED_LIT], [10, 47, C.SEED_MID],
        [12, 47, C.SEED_DARK], [14, 47, C.SEED_LIT]
    ];
    for (const [sx, sy, scol] of spilled) g.set(sx, sy, scol);

    // Contact line
    for (let x = 19; x <= 32; x++) g.set(x, 47, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

function buildSeedsIcon() {
    const g = new CanvasGrid(32, 32);
    // Centered: rows 8..23, cols 6..25
    for (let y = 12; y <= 21; y++) {
        for (let x = 12; x <= 23; x++) {
            if (x <= 15 && y <= 15) g.set(x, y, C.CLOTH_LIT);
            else if (y >= 19) g.set(x, y, C.CLOTH_SOUTH);
            else if (x >= 21) g.set(x, y, C.CLOTH_EAST);
            else g.set(x, y, C.CLOTH_BODY);
        }
    }
    for (let x = 15; x <= 20; x++) g.set(x, 11, C.CORD);
    g.set(16, 12, C.CORD); g.set(16, 13, C.CORD);
    for (let x = 15; x <= 19; x++) g.set(x, 9, C.MOUTH);
    g.set(16, 9, C.SEED_LIT); g.set(18, 9, C.SEED_LIT);

    // Spilled seeds
    g.set(9, 19, C.SEED_LIT); g.set(11, 20, C.SEED_MID); g.set(8, 21, C.SEED_LIT);
    for (let x = 13; x <= 22; x++) g.set(x, 21, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

// 4. FIBER (Ground: 48x48, Icon: 32x32)
function buildFiberGround() {
    const g = new CanvasGrid(48, 48);
    // Twisted skein: cols 12..41, rows 30..47. Contact rows 41..47, cols 14..41.
    // Hank loop curve
    for (let t = 0; t <= 30; t++) {
        const frac = t / 30;
        const cx = 13 + frac * 23;
        const cy = 32 + frac * 11;
        const halfThick = 3.5;
        const nx = -0.43, ny = 0.90;
        for (let s = -halfThick; s <= halfThick; s++) {
            const x = Math.round(cx + s * nx);
            const y = Math.round(cy + s * ny);
            if (s < -1.5) {
                if ((x + y) % 2 === 0) g.set(x, y, C.FIBER_LIT);
                else g.set(x, y, C.FIBER_MIDLIT);
            } else if (s > 1.5) {
                g.set(x, y, C.FIBER_STRAND);
            } else if (Math.round(s) % 2 === 0) {
                g.set(x, y, C.FIBER_STRAND);
            } else {
                g.set(x, y, C.FIBER_BELLY);
            }
        }
    }
    // East cut frayed tips (cols 35..41)
    g.set(36, 42, C.FRESH_END1); g.set(37, 41, C.FRESH_END2);
    g.set(38, 43, C.FRESH_END1); g.set(39, 42, C.FRESH_END2);
    g.set(40, 44, C.FRESH_END1); g.set(41, 43, C.FRESH_END2);

    // Tie cord across waist at cols 25..27, rows 33..44
    for (let y = 35; y <= 42; y++) {
        for (let x = 25; x <= 27; x++) {
            if (!g.isBg(x, y)) g.set(x, y, C.TIE_CORD);
        }
    }
    g.set(26, 38, C.TIE_KNOT);
    g.set(27, 39, C.TIE_KNOT);

    // Contact line
    for (let x = 14; x <= 41; x++) g.set(x, 47, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

function buildFiberIcon() {
    const g = new CanvasGrid(32, 32);
    // Centered hank: rows 9..22, cols 5..26
    for (let t = 0; t <= 20; t++) {
        const frac = t / 20;
        const cx = 7 + frac * 17;
        const cy = 11 + frac * 8;
        const halfThick = 2.5;
        const nx = -0.43, ny = 0.90;
        for (let s = -halfThick; s <= halfThick; s++) {
            const x = Math.round(cx + s * nx);
            const y = Math.round(cy + s * ny);
            if (s < -1) g.set(x, y, C.FIBER_LIT);
            else if (s > 1) g.set(x, y, C.FIBER_STRAND);
            else g.set(x, y, C.FIBER_BELLY);
        }
    }
    // Tie cord
    for (let y = 13; y <= 18; y++) {
        g.set(15, y, C.TIE_CORD);
        g.set(16, y, C.TIE_CORD);
    }
    g.set(16, 16, C.TIE_KNOT);

    g.set(24, 18, C.FRESH_END1); g.set(25, 17, C.FRESH_END2);
    for (let x = 9; x <= 25; x++) g.set(x, 21, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

// ----------------------------------------------------
// EXPORT
// ----------------------------------------------------

const BATCH4 = [
    {
        id: 'mushroom',
        name: 'Mushrooms',
        groundGen: buildMushroomGround,
        iconGen: buildMushroomIcon
    },
    {
        id: 'root',
        name: 'Root vegetable',
        groundGen: buildRootGround,
        iconGen: buildRootIcon
    },
    {
        id: 'seeds',
        name: 'Seeds',
        groundGen: buildSeedsGround,
        iconGen: buildSeedsIcon
    },
    {
        id: 'fiber',
        name: 'Plant fiber',
        groundGen: buildFiberGround,
        iconGen: buildFiberIcon
    }
];

for (const item of BATCH4) {
    console.log(`\n=== Exporting Item: ${item.id} (${item.name}) ===`);
    
    // 1. Ground Item
    const gGrid = item.groundGen();
    const { buf1x: gBuf1x, buf4x: gBuf4x } = gGrid.toBuffers();
    
    const rawGroundPath = path.join(ROOT, 'art', 'raw', `${item.id}.png`);
    const masterGroundPath = path.join(ROOT, 'art', 'masters', `${item.id}.png`);
    const masterGroundJson = path.join(ROOT, 'art', 'masters', `${item.id}.json`);
    
    writePNG(rawGroundPath, 192, 192, gBuf4x);
    writePNG(masterGroundPath, 48, 48, gBuf1x);
    
    const sidecarGround = {
        id: item.id,
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S"],
        animations: { stand: [0] },
        frameMs: 150,
        layer: "object",
        species: null,
        stage: null
    };
    fs.writeFileSync(masterGroundJson, JSON.stringify(sidecarGround, null, 2) + '\n');
    console.log(`Written ground: ${rawGroundPath}, ${masterGroundPath}`);

    // 2. Inventory Icon
    const iGrid = item.iconGen();
    const { buf1x: iBuf1x, buf4x: iBuf4x } = iGrid.toBuffers();
    
    const rawIconPath = path.join(ROOT, 'art', 'raw', `${item.id}_icon.png`);
    const masterIconPath = path.join(ROOT, 'art', 'masters', `${item.id}_icon.png`);
    const masterIconJson = path.join(ROOT, 'art', 'masters', `${item.id}_icon.json`);
    
    writePNG(rawIconPath, 128, 128, iBuf4x);
    writePNG(masterIconPath, 32, 32, iBuf1x);
    
    const sidecarIcon = {
        id: `${item.id}_icon`,
        frameWidth: 32,
        frameHeight: 32,
        anchor: [16, 31],
        footprint: [1, 1],
        facings: ["S"],
        animations: { stand: [0] },
        frameMs: 150,
        layer: "icon",
        species: null,
        stage: null
    };
    fs.writeFileSync(masterIconJson, JSON.stringify(sidecarIcon, null, 2) + '\n');
    console.log(`Written icon: ${rawIconPath}, ${masterIconPath}`);
}

console.log('\nAll Batch 4 items synthesized and exported successfully.');
