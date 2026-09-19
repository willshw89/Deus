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

    // bar_iron
    IRON_HIGH: palColors[119], // #DFDFDF
    IRON_TOP: palColors[121],  // #BEBEBE
    IRON_RIGHT: palColors[122],// #AEAEAE
    IRON_SOUTH: palColors[124],// #8E8E8E
    IRON_EAST: palColors[127], // #616161
    IRON_SEAM: palColors[129], // #454545

    // berries
    BERRY_BODY: palColors[24],  // #C20C1C
    BERRY_GLINT: palColors[21], // #FF394D
    BERRY_SHADE: palColors[26], // #8A040C
    BERRY_CREASE: palColors[28],// #510000
    LEAF_LIT: palColors[241],   // #45B645
    LEAF_DARK: palColors[243],  // #006D00
    TWIG: palColors[143],       // #5D350C

    // fruit
    FRUIT_LIT: palColors[36],   // #FF9E3D
    FRUIT_BODY: palColors[38],  // #FF7D00
    FRUIT_SOUTH: palColors[40], // #C26100
    FRUIT_EAST: palColors[41],  // #A65100
    FRUIT_GLINT: palColors[33], // #FFCE9A
    STEM: palColors[143],       // #5D350C

    // straw
    STRAW_LIT: palColors[2],    // #F7E7A6
    STRAW_MIDLIT: palColors[3], // #F3DF79
    STRAW_BODY: palColors[4],   // #EFD251
    STRAW_GROOVE: palColors[6], // #DBAE20
    STRAW_SHADE: palColors[7],  // #C69618
    STRAW_DEEP: palColors[8],   // #B28210
    STRAW_DEEPEST: palColors[9],// #9E690C
    CORD: palColors[139],       // #9A7141
    KNOT: palColors[141],       // #7D4D18
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

console.log('Synthesizing Batch 3 items...');

// 1. BAR IRON (Ground: 48x48, Icon: 32x32)
function buildBarIronGround() {
    const g = new CanvasGrid(48, 48);
    // Footprint: rows 41..47, cols 14..38 with contact on row 47
    // Top face: shifted 7px up-left: rows 34..40, cols 7..31 in IRON_TOP
    for (let y = 34; y <= 40; y++) {
        for (let x = 7; x <= 31; x++) {
            if ((y === 34 && (x === 7 || x === 31)) || (y === 40 && x === 7)) continue; // chamfer
            if (y === 34 || x === 7) g.set(x, y, C.IRON_HIGH);
            else if (x >= 26 && (x + y) % 2 === 0) g.set(x, y, C.IRON_RIGHT);
            else g.set(x, y, C.IRON_TOP);
        }
    }
    // South face: rows 40..47, parallelogram starting 1px right per row
    for (let y = 40; y <= 47; y++) {
        const startX = 7 + (y - 40);
        const endX = 31 + (y - 40);
        for (let x = startX; x <= endX; x++) {
            if (x >= 38) continue;
            if (y === 43) g.set(x, y, C.IRON_SEAM);
            else if (g.isBg(x, y) || g.get(x, y) === C.IRON_TOP) g.set(x, y, C.IRON_SOUTH);
        }
    }
    // East face: cols 31..38, rows 34..47
    for (let y = 34; y <= 47; y++) {
        const startX = Math.max(31, 25 + Math.floor((y - 34) * 0.9));
        const endX = Math.min(38, 31 + (y - 34));
        for (let x = startX; x <= endX; x++) {
            g.set(x, y, C.IRON_EAST);
        }
    }
    // Contact line
    for (let x = 14; x <= 38; x++) g.set(x, 47, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

function buildBarIronIcon() {
    const g = new CanvasGrid(32, 32);
    // Scaled centered cast ingot: rows 10..21, cols 4..27
    for (let y = 10; y <= 15; y++) {
        for (let x = 5; x <= 22; x++) {
            if (y === 10 || x === 5) g.set(x, y, C.IRON_HIGH);
            else if (x >= 18 && (x + y) % 2 === 0) g.set(x, y, C.IRON_RIGHT);
            else g.set(x, y, C.IRON_TOP);
        }
    }
    for (let y = 15; y <= 21; y++) {
        const startX = 5 + Math.floor((y - 15) * 0.8);
        const endX = 22 + Math.floor((y - 15) * 0.8);
        for (let x = startX; x <= endX; x++) {
            if (x >= 27) continue;
            if (y === 18) g.set(x, y, C.IRON_SEAM);
            else if (g.isBg(x, y)) g.set(x, y, C.IRON_SOUTH);
        }
    }
    for (let y = 10; y <= 21; y++) {
        const startX = Math.max(22, 17 + Math.floor((y - 10) * 0.8));
        for (let x = startX; x <= 27; x++) {
            g.set(x, y, C.IRON_EAST);
        }
    }
    for (let x = 10; x <= 27; x++) g.set(x, 21, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

// 2. BERRIES (Ground: 48x48, Icon: 32x32)
function buildBerriesGround() {
    const g = new CanvasGrid(48, 48);
    // Contact: row 47 from col 19 to 34
    // 12 berries of 3x3 in staggered rows, centers on rows 45, 42, 39, cols 17..34
    const berryCenters = [
        // row 45 (bottom row, 5 berries)
        [20, 45], [23, 45], [26, 45], [29, 45], [32, 45],
        // row 42 (middle row, 4 berries)
        [18, 42], [21, 42], [24, 42], [27, 42],
        // row 39 (top row, 3 berries)
        [16, 39], [19, 39], [22, 39]
    ];
    for (let i = 0; i < berryCenters.length; i++) {
        const [cx, cy] = berryCenters[i];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const x = cx + dx, y = cy + dy;
                if (dx === -1 && dy === -1 && i >= 5) {
                    g.set(x, y, C.BERRY_GLINT); // catchlight on upper-left berries
                } else if (dx === 1 && dy === 1 && i < 5) {
                    g.set(x, y, C.BERRY_SHADE); // shaded lower-right
                } else {
                    g.set(x, y, C.BERRY_BODY);
                }
            }
        }
    }
    // Crease where berries touch
    g.set(21, 45, C.BERRY_CREASE);
    g.set(24, 45, C.BERRY_CREASE);
    g.set(27, 45, C.BERRY_CREASE);
    g.set(30, 45, C.BERRY_CREASE);
    g.set(19, 42, C.BERRY_CREASE);
    g.set(22, 42, C.BERRY_CREASE);
    g.set(25, 42, C.BERRY_CREASE);
    g.set(17, 40, C.BERRY_CREASE);
    g.set(20, 40, C.BERRY_CREASE);

    // Leaves on twig
    // Twig
    for (let x = 12; x <= 16; x++) g.set(x, 40, C.TWIG);
    // Leaf 1 at rows 39..41, cols 12..17
    for (let x = 12; x <= 17; x++) {
        g.set(x, 39, C.LEAF_LIT);
        g.set(x, 41, C.LEAF_DARK);
    }
    // Leaf 2 at rows 36..38, cols 28..35
    for (let x = 28; x <= 35; x++) {
        g.set(x, 36, C.LEAF_LIT);
        g.set(x, 37, C.LEAF_LIT);
        g.set(x, 38, C.LEAF_DARK);
    }
    // Contact line
    for (let x = 19; x <= 34; x++) g.set(x, 47, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

function buildBerriesIcon() {
    const g = new CanvasGrid(32, 32);
    // Centered cluster: rows 10..21, cols 6..25
    const berryCenters = [
        [11, 19], [14, 19], [17, 19], [20, 19],
        [10, 16], [13, 16], [16, 16], [19, 16],
        [12, 13], [15, 13], [18, 13]
    ];
    for (let i = 0; i < berryCenters.length; i++) {
        const [cx, cy] = berryCenters[i];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const x = cx + dx, y = cy + dy;
                if (dx === -1 && dy === -1 && i >= 4) g.set(x, y, C.BERRY_GLINT);
                else if (dx === 1 && dy === 1 && i < 4) g.set(x, y, C.BERRY_SHADE);
                else g.set(x, y, C.BERRY_BODY);
            }
        }
    }
    // Leaves
    for (let x = 6; x <= 10; x++) {
        g.set(x, 14, C.LEAF_LIT);
        g.set(x, 15, C.LEAF_DARK);
    }
    for (let x = 19; x <= 24; x++) {
        g.set(x, 12, C.LEAF_LIT);
        g.set(x, 13, C.LEAF_DARK);
    }
    for (let x = 10; x <= 22; x++) g.set(x, 21, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

// 3. FRUIT (Ground: 48x48, Icon: 32x32)
function buildFruitGround() {
    const g = new CanvasGrid(48, 48);
    // Sphere 16px across on rows 32..47 from col 17 to 32
    // Center at col 24.5, row 39.5, radius ~7.8 px
    const cx = 24.5, cy = 39.5, r = 7.8;
    for (let y = 32; y <= 47; y++) {
        for (let x = 17; x <= 32; x++) {
            const dist = Math.hypot(x - cx, y - cy);
            if (dist <= r) {
                // Spherical chiaroscuro
                if (x <= 23 && y <= 38) {
                    if (y <= 35 && x >= 19 && x <= 21) g.set(x, y, C.FRUIT_GLINT);
                    else g.set(x, y, C.FRUIT_LIT);
                } else if (y >= 43) {
                    g.set(x, y, C.FRUIT_SOUTH);
                } else if (x >= 29) {
                    g.set(x, y, C.FRUIT_EAST);
                } else {
                    g.set(x, y, C.FRUIT_BODY);
                }
            }
        }
    }
    // Stem: 3px tall from row 31 to 29 at col 22
    g.set(22, 31, C.STEM);
    g.set(22, 30, C.STEM);
    g.set(22, 29, C.STEM);

    // Leaf: 7x4 px leaning up-left to row 27, col 14
    for (let dx = 0; dx < 7; dx++) {
        const lx = 21 - dx;
        const ly = 29 - Math.floor(dx * 0.4);
        g.set(lx, ly, C.LEAF_LIT);
        g.set(lx, ly + 1, C.LEAF_LIT);
        g.set(lx, ly + 2, C.LEAF_DARK);
    }

    // Contact line on row 47 at cols 24..27
    for (let x = 24; x <= 27; x++) g.set(x, 47, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

function buildFruitIcon() {
    const g = new CanvasGrid(32, 32);
    // Centered apple/fruit: rows 7..24, cols 7..24
    const cx = 16, cy = 16.5, r = 6.8;
    for (let y = 10; y <= 23; y++) {
        for (let x = 10; x <= 22; x++) {
            const dist = Math.hypot(x - cx, y - cy);
            if (dist <= r) {
                if (x <= 15 && y <= 15) {
                    if (y <= 13 && x >= 13 && x <= 14) g.set(x, y, C.FRUIT_GLINT);
                    else g.set(x, y, C.FRUIT_LIT);
                } else if (y >= 20) {
                    g.set(x, y, C.FRUIT_SOUTH);
                } else if (x >= 20) {
                    g.set(x, y, C.FRUIT_EAST);
                } else {
                    g.set(x, y, C.FRUIT_BODY);
                }
            }
        }
    }
    g.set(15, 9, C.STEM);
    g.set(15, 8, C.STEM);
    for (let dx = 0; dx < 5; dx++) {
        const lx = 14 - dx;
        const ly = 8 - Math.floor(dx * 0.3);
        g.set(lx, ly, C.LEAF_LIT);
        g.set(lx, ly + 1, C.LEAF_DARK);
    }
    for (let x = 14; x <= 18; x++) g.set(x, 23, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

// 4. STRAW (Ground: 48x48, Icon: 32x32)
function buildStrawGround() {
    const g = new CanvasGrid(48, 48);
    // Bound sheaf lying diagonal: seed heads up-left (cols 3..16, rows 20..30),
    // cut butt bottom-right (cols 30..41, rows 36..46, contact on rows 44..47).
    
    // Body sheaf: diagonal band from [10, 25] to [35, 42], ~14px thick
    for (let t = 0; t <= 30; t++) {
        const frac = t / 30;
        const midX = 10 + frac * 25;
        const midY = 24 + frac * 17;
        const halfThick = 6.5;
        // Normal to diagonal vector [25, 17] is [-17, 25] normalized
        const nx = -0.56, ny = 0.83;
        for (let s = -halfThick; s <= halfThick; s++) {
            const x = Math.round(midX + s * nx);
            const y = Math.round(midY + s * ny);
            if (s < -4) g.set(x, y, C.STRAW_LIT);
            else if (s < -2) g.set(x, y, C.STRAW_MIDLIT);
            else if (s > 4) g.set(x, y, C.STRAW_DEEP);
            else if (s > 2) g.set(x, y, C.STRAW_SHADE);
            else if (Math.round(s) % 2 === 0) g.set(x, y, C.STRAW_GROOVE);
            else g.set(x, y, C.STRAW_BODY);
        }
    }

    // Cut butt: oval 12w x 10h at cols 30..41, rows 36..46
    for (let y = 36; y <= 46; y++) {
        for (let x = 30; x <= 41; x++) {
            const dx = (x - 35.5) / 5.5;
            const dy = (y - 41) / 4.5;
            if (dx * dx + dy * dy <= 1) {
                if ((x + y) % 3 === 0) g.set(x, y, C.STRAW_BODY);
                else if ((x + y) % 3 === 1) g.set(x, y, C.STRAW_SHADE);
                else g.set(x, y, C.STRAW_GROOVE);
            }
        }
    }

    // Cord tie across waist at cols 22..25, rows 31..42
    for (let y = 31; y <= 40; y++) {
        for (let x = 22; x <= 25; x++) {
            if (!g.isBg(x, y)) g.set(x, y, C.CORD);
        }
    }
    // Knot
    g.set(25, 38, C.KNOT);
    g.set(25, 39, C.KNOT);

    // Nodding seed heads at up-left (cols 3..15, rows 20..28)
    const heads = [[5, 21], [8, 20], [4, 25], [9, 23], [13, 22], [7, 28]];
    for (const [hx, hy] of heads) {
        g.set(hx, hy, C.STRAW_BODY);
        g.set(hx + 1, hy, C.STRAW_GROOVE);
        g.set(hx, hy + 1, C.STRAW_GROOVE);
    }

    // Contact line on rows 44..47 at cols 32..41
    for (let x = 32; x <= 41; x++) g.set(x, 47, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

function buildStrawIcon() {
    const g = new CanvasGrid(32, 32);
    // Centered sheaf: rows 7..24, cols 3..28
    for (let t = 0; t <= 22; t++) {
        const frac = t / 22;
        const midX = 8 + frac * 17;
        const midY = 11 + frac * 10;
        const halfThick = 4.5;
        const nx = -0.56, ny = 0.83;
        for (let s = -halfThick; s <= halfThick; s++) {
            const x = Math.round(midX + s * nx);
            const y = Math.round(midY + s * ny);
            if (s < -2.5) g.set(x, y, C.STRAW_LIT);
            else if (s > 2.5) g.set(x, y, C.STRAW_SHADE);
            else if (Math.round(s) % 2 === 0) g.set(x, y, C.STRAW_GROOVE);
            else g.set(x, y, C.STRAW_BODY);
        }
    }
    // Cut butt
    for (let y = 17; y <= 23; y++) {
        for (let x = 21; x <= 28; x++) {
            const dx = (x - 24.5) / 3.5;
            const dy = (y - 20) / 3;
            if (dx * dx + dy * dy <= 1) {
                if ((x + y) % 2 === 0) g.set(x, y, C.STRAW_BODY);
                else g.set(x, y, C.STRAW_GROOVE);
            }
        }
    }
    // Cord
    for (let y = 14; y <= 19; y++) {
        g.set(16, y, C.CORD);
        g.set(17, y, C.CORD);
    }
    g.set(18, 18, C.KNOT);

    for (let x = 21; x <= 27; x++) g.set(x, 23, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

// ----------------------------------------------------
// EXPORT
// ----------------------------------------------------

const BATCH3 = [
    {
        id: 'bar_iron',
        name: 'Iron bar',
        groundGen: buildBarIronGround,
        iconGen: buildBarIronIcon
    },
    {
        id: 'berries',
        name: 'Berries',
        groundGen: buildBerriesGround,
        iconGen: buildBerriesIcon
    },
    {
        id: 'fruit',
        name: 'Fruit',
        groundGen: buildFruitGround,
        iconGen: buildFruitIcon
    },
    {
        id: 'straw',
        name: 'Straw',
        groundGen: buildStrawGround,
        iconGen: buildStrawIcon
    }
];

for (const item of BATCH3) {
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

console.log('\nAll Batch 3 items synthesized and exported successfully.');
