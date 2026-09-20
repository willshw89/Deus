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

const C = {
    MAGENTA: [255, 0, 255],
    SILHOUETTE: palColors[147], // #201408
    OUTLINE_DARK: palColors[0],  // #000000
    WHITE: palColors[15],        // #FFFFFF

    // Copper bar (Ramp 178-191)
    COPPER_SPEC: palColors[32],       // #FFDFBA specular shine
    COPPER_BEVEL: palColors[178],     // #EFDBCE top bevel glint
    COPPER_TOP_LIT: palColors[180],   // #CE9A7D lit top face
    COPPER_TOP_MID: palColors[181],   // #BE825D mid top face
    COPPER_FRONT_HI: palColors[182],  // #AE653D upper front highlight
    COPPER_FRONT_MID: palColors[183], // #9E5124 front face mid
    COPPER_FRONT_LOW: palColors[184], // #8E3D0C front face lower
    COPPER_SOUTH: palColors[186],     // #6D2400 south contact
    COPPER_EAST: palColors[188],      // #511C00 east shadowed face
    COPPER_STAMP: palColors[190],     // #351000 ingot stamp recess

    // Charcoal (Ramps 118-133, 0)
    ASH_WHITE: palColors[118],        // #EFEFEF ash specks
    ASH_LIT: palColors[120],          // #CECECE ash dust highlight
    ASH_MID: palColors[124],          // #8E8E8E mid ash dust
    COAL_HI: palColors[127],          // #616161 lit facet glint
    COAL_MID: palColors[129],         // #454545 charcoal mid facet
    COAL_DARK: palColors[131],        // #242424 charcoal shadow facet
    COAL_DEEP: palColors[132],        // #181818 deep fissure
    COAL_BLACK: palColors[0],         // #000000 core shadow

    // Feathers (Ramp 209-223, 148-150, 226)
    QUILL_WHITE: palColors[15],       // #FFFFFF quill shaft
    QUILL_SHADOW: palColors[150],     // #CEC6BE quill underside
    FEATHER_LIT: palColors[209],      // #EFDBC6 lit vane
    FEATHER_BUFF: palColors[211],     // #CEB6A2 buff vane
    FEATHER_TAN: palColors[213],      // #AE9282 tan barred stripe
    FEATHER_BROWN: palColors[216],    // #7D6559 brown barred stripe
    FEATHER_DARK: palColors[219],     // #514139 shadow vane edge
    FEATHER_IRID: palColors[226],     // #71AEE7 blue iridescent sheen
    DOWN_FLUFF: palColors[148],       // #EFEBE7 downy base

    // Leather roll (Ramps 134-147, 102-117)
    LEATHER_GLOSS: palColors[106],    // #DBB2A2 smooth grain sheen
    LEATHER_LIT: palColors[138],      // #AA8659 lit leather surface
    LEATHER_MID: palColors[139],      // #9A7141 mid leather body
    LEATHER_SHADE: palColors[140],    // #8A5D2D shadow leather body
    LEATHER_SOUTH: palColors[142],    // #6D3D0C underside contact
    SUEDE_INNER: palColors[135],      // #DBCAB2 suede underside roll
    SUEDE_MID: palColors[136],        // #CAB292 suede roll mid
    THONG_CORD: palColors[144],       // #4D2D0C binding thong
    THONG_KNOT: palColors[146]        // #2D1C08 knot and shadow
};

class CanvasGrid {
    constructor(w, h) {
        this.w = w;
        this.h = h;
        this.grid = Array.from({ length: h }, () => Array.from({ length: w }, () => C.MAGENTA));
    }
    set(x, y, col) {
        if (x >= 0 && x < this.w && y >= 0 && y < this.h) this.grid[y][x] = col;
    }
    get(x, y) {
        if (x >= 0 && x < this.w && y >= 0 && y < this.h) return this.grid[y][x];
        return C.MAGENTA;
    }
    isBg(x, y) {
        const c = this.get(x, y);
        return c[0] === 255 && c[1] === 0 && c[2] === 255;
    }
    toBuffers() {
        const buf1x = Buffer.alloc(this.w * this.h * 4);
        for (let y = 0; y < this.h; y++) {
            for (let x = 0; x < this.w; x++) {
                const o = (y * this.w + x) * 4;
                const c = this.grid[y][x];
                const isBg = this.isBg(x, y);
                buf1x[o] = isBg ? 0 : c[0];
                buf1x[o + 1] = isBg ? 0 : c[1];
                buf1x[o + 2] = isBg ? 0 : c[2];
                buf1x[o + 3] = isBg ? 0 : 255;
            }
        }
        const w4x = this.w * 4, h4x = this.h * 4;
        const buf4x = Buffer.alloc(w4x * h4x * 4);
        for (let y = 0; y < h4x; y++) {
            const srcY = Math.floor(y / 4);
            for (let x = 0; x < w4x; x++) {
                const srcX = Math.floor(x / 4);
                const oDst = (y * w4x + x) * 4;
                const c = this.grid[srcY][srcX];
                buf4x[oDst] = c[0];
                buf4x[oDst + 1] = c[1];
                buf4x[oDst + 2] = c[2];
                buf4x[oDst + 3] = 255;
            }
        }
        return { buf1x, buf4x };
    }
}

// 1. COPPER BAR (bar_copper)
function buildBarCopperGround() {
    const g = new CanvasGrid(48, 48);
    // Trapezoidal cast ingot sitting on row 47, cols 10..37
    // Top face: rows 33..38, cols 14..33
    for (let y = 33; y <= 38; y++) {
        const xOffset = y - 33;
        const left = 14 + Math.round(xOffset * 0.5);
        const right = 33 - Math.round(xOffset * 0.2);
        for (let x = left; x <= right; x++) {
            if (y === 33 && x <= 22) g.set(x, y, C.COPPER_SPEC);
            else if (y === 33 || x === left) g.set(x, y, C.COPPER_BEVEL);
            else if ((x + y) % 2 === 0) g.set(x, y, C.COPPER_TOP_LIT);
            else g.set(x, y, C.COPPER_TOP_MID);
        }
    }
    // Assay stamp groove on top face (cols 20..27, rows 35..36)
    for (let x = 21; x <= 26; x++) {
        g.set(x, 35, C.COPPER_STAMP);
        g.set(x, 36, C.COPPER_FRONT_LOW);
    }
    g.set(23, 35, C.COPPER_BEVEL);

    // Front face: rows 39..47, cols 11..36
    for (let y = 39; y <= 47; y++) {
        const left = 14 - Math.round((y - 39) * 0.4);
        const right = 33 + Math.round((y - 39) * 0.4);
        for (let x = left; x <= right; x++) {
            if (y === 39 && x < 26) g.set(x, y, C.COPPER_BEVEL);
            else if (x === left) g.set(x, y, C.COPPER_FRONT_HI);
            else if (x === right || x === right - 1) g.set(x, y, C.COPPER_EAST);
            else if (y >= 45) g.set(x, y, C.COPPER_SOUTH);
            else if (y <= 41) g.set(x, y, (x + y) % 2 === 0 ? C.COPPER_FRONT_HI : C.COPPER_FRONT_MID);
            else g.set(x, y, C.COPPER_FRONT_MID);
        }
    }
    // Specular corner highlights
    g.set(13, 39, C.COPPER_SPEC);
    g.set(14, 40, C.COPPER_SPEC);

    // Subtle dark outlines
    for (let x = 11; x <= 36; x++) g.set(x, 47, C.COPPER_STAMP);
    for (let y = 39; y <= 47; y++) {
        const right = 33 + Math.round((y - 39) * 0.4);
        g.set(right, y, C.COPPER_STAMP);
    }
    return g;
}

function buildBarCopperIcon() {
    const g = new CanvasGrid(32, 32);
    // Angled ingot resting at rows 10..24, cols 4..27
    for (let y = 10; y <= 15; y++) {
        const left = 6 + Math.round((y - 10) * 0.6);
        const right = 23 - Math.round((y - 10) * 0.3);
        for (let x = left; x <= right; x++) {
            if (y === 10 && x < 15) g.set(x, y, C.COPPER_SPEC);
            else if (y === 10 || x === left) g.set(x, y, C.COPPER_BEVEL);
            else g.set(x, y, C.COPPER_TOP_LIT);
        }
    }
    // Stamp mark on icon
    g.set(13, 12, C.COPPER_STAMP);
    g.set(14, 12, C.COPPER_STAMP);
    g.set(15, 12, C.COPPER_STAMP);
    g.set(14, 13, C.COPPER_BEVEL);

    // Front face: rows 16..24
    for (let y = 16; y <= 24; y++) {
        const left = 9 - Math.round((y - 16) * 0.5);
        const right = 22 + Math.round((y - 16) * 0.5);
        for (let x = left; x <= right; x++) {
            if (y === 16 && x < 16) g.set(x, y, C.COPPER_BEVEL);
            else if (x >= right - 1) g.set(x, y, C.COPPER_EAST);
            else if (y >= 23) g.set(x, y, C.COPPER_SOUTH);
            else if (y <= 18) g.set(x, y, C.COPPER_FRONT_HI);
            else g.set(x, y, C.COPPER_FRONT_MID);
        }
    }
    g.set(7, 16, C.COPPER_SPEC);
    for (let x = 5; x <= 26; x++) g.set(x, 24, C.COPPER_STAMP);
    return g;
}

// 2. CHARCOAL (charcoal)
function buildCharcoalGround() {
    const g = new CanvasGrid(48, 48);
    // Main lump: cols 10..29, rows 32..47
    for (let y = 32; y <= 47; y++) {
        const span = (y - 32) / 15;
        const left = Math.round(15 - 5 * Math.sin(span * Math.PI));
        const right = Math.round(24 + 5 * Math.sin(span * Math.PI));
        for (let x = left; x <= right; x++) {
            if (y <= 36 && x <= 18) {
                g.set(x, y, (x + y) % 2 === 0 ? C.COAL_HI : C.COAL_MID);
            } else if (x >= right - 3) {
                g.set(x, y, C.COAL_DARK);
            } else if (y >= 44) {
                g.set(x, y, C.COAL_BLACK);
            } else {
                g.set(x, y, C.COAL_MID);
            }
        }
    }
    // Deep fissure in main lump
    for (let y = 36; y <= 44; y++) {
        const fx = 18 + Math.round((y - 36) * 0.3);
        g.set(fx, y, C.COAL_DEEP);
        g.set(fx + 1, y, C.COAL_BLACK);
    }
    // Ash specks on main lump
    g.set(14, 34, C.ASH_WHITE);
    g.set(15, 34, C.ASH_LIT);
    g.set(13, 35, C.ASH_MID);
    g.set(22, 38, C.ASH_LIT);

    // Second lump: cols 27..40, rows 36..47
    for (let y = 36; y <= 47; y++) {
        const span = (y - 36) / 11;
        const left = Math.round(28 - 2 * Math.sin(span * Math.PI));
        const right = Math.round(38 + 2 * Math.sin(span * Math.PI));
        for (let x = left; x <= right; x++) {
            if (y <= 39 && x <= 33) g.set(x, y, C.COAL_HI);
            else if (x >= right - 2) g.set(x, y, C.COAL_BLACK);
            else if (y >= 45) g.set(x, y, C.COAL_BLACK);
            else g.set(x, y, C.COAL_DARK);
        }
    }
    g.set(31, 37, C.ASH_LIT);
    g.set(32, 38, C.ASH_WHITE);

    // Small foreground coal pebble: cols 19..26, rows 43..47
    for (let y = 43; y <= 47; y++) {
        for (let x = 20; x <= 25; x++) {
            if (y === 43 && x <= 22) g.set(x, y, C.COAL_HI);
            else if (y >= 46) g.set(x, y, C.COAL_BLACK);
            else g.set(x, y, C.COAL_MID);
        }
    }
    g.set(21, 44, C.ASH_WHITE);

    return g;
}

function buildCharcoalIcon() {
    const g = new CanvasGrid(32, 32);
    // Angular coal lumps resting at rows 8..24, cols 5..26
    for (let y = 9; y <= 23; y++) {
        const span = (y - 9) / 14;
        const left = Math.round(8 - 3 * Math.sin(span * Math.PI));
        const right = Math.round(22 + 4 * Math.sin(span * Math.PI));
        for (let x = left; x <= right; x++) {
            if (y <= 13 && x <= 14) g.set(x, y, C.COAL_HI);
            else if (x >= right - 2) g.set(x, y, C.COAL_DARK);
            else if (y >= 21) g.set(x, y, C.COAL_BLACK);
            else g.set(x, y, C.COAL_MID);
        }
    }
    // Fissure
    for (let y = 13; y <= 19; y++) {
        g.set(15, y, C.COAL_DEEP);
        g.set(16, y, C.COAL_BLACK);
    }
    // Ash specks
    g.set(11, 11, C.ASH_WHITE);
    g.set(12, 11, C.ASH_LIT);
    g.set(19, 14, C.ASH_LIT);
    g.set(20, 15, C.ASH_WHITE);
    return g;
}

// 3. FEATHERS (feathers)
function buildFeathersGround() {
    const g = new CanvasGrid(48, 48);
    // Main flight feather: diagonal from (10, 46) up-right to (36, 29)
    // Quill shaft
    for (let i = 0; i <= 28; i++) {
        const t = i / 28;
        const qx = Math.round(10 + t * 26);
        const qy = Math.round(46 - t * 16);
        g.set(qx, qy, C.QUILL_WHITE);
        g.set(qx, qy + 1, C.QUILL_SHADOW);
    }

    // Top vane: extending up-left perpendicular to quill
    for (let i = 6; i <= 27; i++) {
        const t = i / 28;
        const qx = Math.round(10 + t * 26);
        const qy = Math.round(46 - t * 16);
        const len = Math.round(7 * Math.sin((i / 28) * Math.PI));
        for (let d = 1; d <= len; d++) {
            const vx = qx - Math.round(d * 0.5);
            const vy = qy - d;
            if (i >= 20 && d >= len - 2) g.set(vx, vy, C.FEATHER_IRID); // iridescent wing tip
            else if (i % 6 <= 2) g.set(vx, vy, C.FEATHER_LIT);
            else if (i % 6 <= 4) g.set(vx, vy, C.FEATHER_BUFF);
            else g.set(vx, vy, C.FEATHER_BROWN);
        }
    }

    // Bottom vane: extending down-right
    for (let i = 8; i <= 26; i++) {
        const t = i / 28;
        const qx = Math.round(10 + t * 26);
        const qy = Math.round(46 - t * 16);
        const len = Math.round(5 * Math.sin((i / 28) * Math.PI));
        for (let d = 1; d <= len; d++) {
            const vx = qx + Math.round(d * 0.4);
            const vy = qy + d;
            if (d === len) g.set(vx, vy, C.FEATHER_DARK);
            else if (i % 6 <= 2) g.set(vx, vy, C.FEATHER_BUFF);
            else g.set(vx, vy, C.FEATHER_TAN);
        }
    }

    // Second smaller feather crossed underneath: from (15, 47) up-right to (26, 38)
    for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        const qx = Math.round(18 + t * 12);
        const qy = Math.round(46 - t * 7);
        if (g.isBg(qx, qy)) g.set(qx, qy, C.QUILL_WHITE);
        const len = Math.round(4 * Math.sin((i / 14) * Math.PI));
        for (let d = 1; d <= len; d++) {
            if (g.isBg(qx - d, qy - d)) g.set(qx - d, qy - d, C.FEATHER_BUFF);
            if (g.isBg(qx + d, qy + d)) g.set(qx + d, qy + d, C.FEATHER_BROWN);
        }
    }

    // Downy fluff at base of quills (cols 8..14, rows 44..47)
    g.set(9, 45, C.DOWN_FLUFF);
    g.set(10, 44, C.DOWN_FLUFF);
    g.set(11, 45, C.QUILL_WHITE);
    g.set(12, 44, C.DOWN_FLUFF);
    g.set(13, 46, C.DOWN_FLUFF);

    return g;
}

function buildFeathersIcon() {
    const g = new CanvasGrid(32, 32);
    // Crossed pair of feathers centered at rows 6..25, cols 6..25
    // Main quill diagonal
    for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const qx = Math.round(7 + t * 18);
        const qy = Math.round(24 - t * 16);
        g.set(qx, qy, C.QUILL_WHITE);
        const len = Math.round(5 * Math.sin((i / 20) * Math.PI));
        for (let d = 1; d <= len; d++) {
            const vx = qx - Math.round(d * 0.4);
            const vy = qy - d;
            if (i >= 15 && d >= len - 1) g.set(vx, vy, C.FEATHER_IRID);
            else if (i % 4 === 0) g.set(vx, vy, C.FEATHER_LIT);
            else g.set(vx, vy, C.FEATHER_BUFF);
        }
        for (let d = 1; d <= Math.round(len * 0.7); d++) {
            const vx = qx + Math.round(d * 0.4);
            const vy = qy + d;
            g.set(vx, vy, C.FEATHER_TAN);
        }
    }
    // Down fluff
    g.set(6, 24, C.DOWN_FLUFF);
    g.set(7, 23, C.DOWN_FLUFF);
    g.set(8, 25, C.DOWN_FLUFF);
    return g;
}

// 4. LEATHER (leather roll)
function buildLeatherGround() {
    const g = new CanvasGrid(48, 48);
    // Tanned leather rolled hide resting on rows 33..47, cols 9..38
    // Spiral roll end face on left: cols 9..16, rows 34..46
    for (let y = 34; y <= 46; y++) {
        const span = (y - 34) / 12;
        const minX = Math.round(10 - 2 * Math.sin(span * Math.PI));
        const maxX = Math.round(15 + 2 * Math.sin(span * Math.PI));
        for (let x = minX; x <= maxX; x++) {
            // Spiral roll layers
            const distFromCenter = Math.hypot((x - 13) * 1.5, y - 40);
            if (distFromCenter < 2) g.set(x, y, C.THONG_CORD);
            else if (distFromCenter < 3.5) g.set(x, y, C.SUEDE_INNER);
            else if (distFromCenter < 4.8) g.set(x, y, C.LEATHER_MID);
            else if (distFromCenter < 6.2) g.set(x, y, C.SUEDE_MID);
            else g.set(x, y, C.LEATHER_SHADE);
        }
    }
    // Cylinder body: cols 16..38, rows 34..47
    for (let y = 34; y <= 47; y++) {
        for (let x = 16; x <= 38; x++) {
            if (y === 34) g.set(x, y, C.LEATHER_GLOSS);
            else if (y <= 37) g.set(x, y, (x + y) % 2 === 0 ? C.LEATHER_LIT : C.LEATHER_MID);
            else if (y >= 45) g.set(x, y, C.LEATHER_SOUTH);
            else if (x >= 37) g.set(x, y, C.LEATHER_SHADE);
            else g.set(x, y, C.LEATHER_MID);
        }
    }
    // Central binding thong: cols 25..27, rows 34..47
    for (let y = 34; y <= 47; y++) {
        g.set(25, y, C.THONG_CORD);
        g.set(26, y, C.THONG_KNOT);
        g.set(27, y, C.LEATHER_SHADE);
    }
    // Knot and dangling thong end at row 42..47
    g.set(26, 42, C.LEATHER_LIT);
    g.set(27, 43, C.THONG_CORD);
    g.set(28, 44, C.THONG_KNOT);
    g.set(29, 45, C.THONG_CORD);
    g.set(29, 46, C.THONG_KNOT);

    // Dark outline rim along south contact
    for (let x = 10; x <= 38; x++) g.set(x, 47, C.LEATHER_SOUTH);
    return g;
}

function buildLeatherIcon() {
    const g = new CanvasGrid(32, 32);
    // Rolled hide bundle resting at rows 8..23, cols 4..27
    // Spiral left face
    for (let y = 10; y <= 21; y++) {
        const span = (y - 10) / 11;
        const minX = Math.round(5 - 1.5 * Math.sin(span * Math.PI));
        const maxX = Math.round(10 + 1.5 * Math.sin(span * Math.PI));
        for (let x = minX; x <= maxX; x++) {
            const d = Math.hypot((x - 8) * 1.5, y - 15.5);
            if (d < 1.8) g.set(x, y, C.THONG_CORD);
            else if (d < 3.2) g.set(x, y, C.SUEDE_INNER);
            else g.set(x, y, C.LEATHER_MID);
        }
    }
    // Body
    for (let y = 10; y <= 21; y++) {
        for (let x = 11; x <= 26; x++) {
            if (y === 10) g.set(x, y, C.LEATHER_GLOSS);
            else if (y <= 13) g.set(x, y, C.LEATHER_LIT);
            else if (y >= 20) g.set(x, y, C.LEATHER_SOUTH);
            else g.set(x, y, C.LEATHER_MID);
        }
    }
    // Binding thong
    for (let y = 10; y <= 21; y++) {
        g.set(18, y, C.THONG_CORD);
        g.set(19, y, C.THONG_KNOT);
    }
    g.set(20, 18, C.THONG_CORD);
    g.set(21, 19, C.THONG_KNOT);
    return g;
}

const ITEMS = [
    {
        id: 'bar_copper',
        name: 'Copper bar',
        rmmzName: '!$UF_Item_BarCopper.png',
        groundGen: buildBarCopperGround,
        iconGen: buildBarCopperIcon
    },
    {
        id: 'charcoal',
        name: 'Charcoal',
        rmmzName: '!$UF_Item_Charcoal.png',
        groundGen: buildCharcoalGround,
        iconGen: buildCharcoalIcon
    },
    {
        id: 'feathers',
        name: 'Feathers',
        rmmzName: '!$UF_Item_Feathers.png',
        groundGen: buildFeathersGround,
        iconGen: buildFeathersIcon
    },
    {
        id: 'leather',
        name: 'Leather',
        rmmzName: '!$UF_Item_Leather.png',
        groundGen: buildLeatherGround,
        iconGen: buildLeatherIcon
    }
];

console.log('--- EXPORTING BATCH 6 ITEMS (MATERIALS & CHAIN GOODS) ---');

for (const item of ITEMS) {
    console.log(`\n=== Exporting Item: ${item.id} (${item.name}) ===`);

    // 1. Ground Item Master & Raw
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

    // 3. Drop-in RMMZ Charset: 144x192 px (col 1, row 0 has the 48x48 master)
    const rmmzPath = path.join(ROOT, 'game', 'img', 'characters', item.rmmzName);
    const rmmzJson = path.join(ROOT, 'game', 'img', 'characters', item.rmmzName.replace('.png', '.json'));
    const rmmzBuf = Buffer.alloc(144 * 192 * 4, 0); // transparent alpha 0
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const col = gGrid.get(x, y);
            if (col[0] === 255 && col[1] === 0 && col[2] === 255) continue; // transparent
            const dstX = 48 + x; // col 1
            const dstY = y;      // row 0
            const o = (dstY * 144 + dstX) * 4;
            rmmzBuf[o] = col[0];
            rmmzBuf[o + 1] = col[1];
            rmmzBuf[o + 2] = col[2];
            rmmzBuf[o + 3] = 255;
        }
    }
    writePNG(rmmzPath, 144, 192, rmmzBuf);
    fs.writeFileSync(rmmzJson, JSON.stringify(sidecarGround, null, 2) + '\n');
    console.log(`Written RMMZ charset: ${rmmzPath}`);
}

console.log('\nAll Batch 6 items synthesized and exported successfully.');

