const fs = require('fs');
const path = require('path');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

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
    const lab = unique.map(([r, g, b]) => srgbToLab(r, g, b));
    const cache = new Map();
    return {
        snap: (r, g, b) => {
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

// Common Color Definitions from uf.hex
const C_OUTLINE   = pal.snap(32, 20, 8);     // #201408 dark selective outline
const C_SHADOW    = pal.snap(69, 69, 69);   // #454545 ground contact line
const C_STONE_HI  = pal.snap(239, 239, 239); // #efefef glint
const C_STONE_TOP = pal.snap(206, 206, 206); // #cecece stone top surface
const C_STONE_MID = pal.snap(158, 158, 158); // #9e9e9e stone front face
const C_STONE_DK  = pal.snap(109, 109, 109); // #6d6d6d stone shadow
const C_STONE_CRK = pal.snap(81, 81, 81);    // #515151 crevice/crack
const C_MORTAR    = pal.snap(206, 198, 190); // #cec6be lime mortar
const C_WOOD_LGT  = pal.snap(154, 113, 65);  // #9a7141 wood highlight
const C_WOOD_MID  = pal.snap(125, 77, 24);   // #7d4d18 wood body
const C_WOOD_DK   = pal.snap(93, 53, 12);    // #5d350c wood dark grain
const C_WOOD_DEEP = pal.snap(61, 36, 12);    // #3d240c deep wood shadow
const C_CHARCOAL  = pal.snap(53, 49, 45);    // #35312d charred beam
const C_BONE_WHT  = pal.snap(239, 235, 231); // #efebe7 bone highlight
const C_BONE_LGT  = pal.snap(235, 227, 215); // #ebe3d7 bone body
const C_BONE_MID  = pal.snap(219, 202, 178); // #dbcab2 bone shaded
const C_BONE_DK   = pal.snap(202, 178, 146); // #cab292 bone underside
const C_BONE_SOIL = pal.snap(186, 154, 113); // #ba9a71 soil patina
const C_MOSS      = pal.snap(113, 134, 77);  // #71864d lichen/moss
const C_FLINT     = pal.snap(142, 130, 121); // #8e8279 knapped flint

function createGrid(w = 48, h = 48) {
    return Array.from({ length: h }, () => Array(w).fill(null));
}

function gridToBuffer(grid, w = 48, h = 48, bgRgb = null) {
    const buf = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const p = grid[y][x];
            const idx = (y * w + x) * 4;
            if (p) {
                buf[idx] = p[0];
                buf[idx + 1] = p[1];
                buf[idx + 2] = p[2];
                buf[idx + 3] = 255;
            } else if (bgRgb) {
                buf[idx] = bgRgb[0];
                buf[idx + 1] = bgRgb[1];
                buf[idx + 2] = bgRgb[2];
                buf[idx + 3] = 255;
            } else {
                buf[idx] = 0;
                buf[idx + 1] = 0;
                buf[idx + 2] = 0;
                buf[idx + 3] = 0;
            }
        }
    }
    return buf;
}

function upscale4x(grid, w = 48, h = 48, bgRgb = [255, 0, 255]) {
    const outW = w * 4, outH = h * 4;
    const buf = Buffer.alloc(outW * outH * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const p = grid[y][x] || bgRgb;
            for (let dy = 0; dy < 4; dy++) {
                for (let dx = 0; dx < 4; dx++) {
                    const idx = ((y * 4 + dy) * outW + (x * 4 + dx)) * 4;
                    buf[idx] = p[0];
                    buf[idx + 1] = p[1];
                    buf[idx + 2] = p[2];
                    buf[idx + 3] = 255;
                }
            }
        }
    }
    return buf;
}

function createRmmzCharset(grid, w = 48, h = 48) {
    // 3 columns x 4 rows of 48x48
    const sheetW = w * 3, sheetH = h * 4;
    const buf = Buffer.alloc(sheetW * sheetH * 4);
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
            const ox = col * w, oy = row * h;
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const p = grid[y][x];
                    const idx = ((oy + y) * sheetW + (ox + x)) * 4;
                    if (p) {
                        buf[idx] = p[0];
                        buf[idx + 1] = p[1];
                        buf[idx + 2] = p[2];
                        buf[idx + 3] = 255;
                    } else {
                        buf[idx] = 0;
                        buf[idx + 1] = 0;
                        buf[idx + 2] = 0;
                        buf[idx + 3] = 0;
                    }
                }
            }
        }
    }
    return buf;
}

// -------------------------------------------------------------
// 1. BUILD WORKBENCH (Work stone craft table)
// -------------------------------------------------------------
console.log('Synthesizing workbench (Work stone craft table)...');
const benchGrid = createGrid();

// Ground contact shadow under legs
for (let x = 7; x <= 13; x++) benchGrid[47][x] = C_SHADOW;
for (let x = 34; x <= 40; x++) benchGrid[47][x] = C_SHADOW;

// Rear legs (partially visible behind lower stretcher)
for (let y = 26; y <= 37; y++) {
    for (let x = 11; x <= 14; x++) benchGrid[y][x] = C_WOOD_DK;
    for (let x = 33; x <= 36; x++) benchGrid[y][x] = C_WOOD_DK;
    benchGrid[y][11] = C_WOOD_DEEP;
    benchGrid[y][36] = C_WOOD_DEEP;
}

// Lower wood shelf / tool stretcher
for (let y = 37; y <= 40; y++) {
    for (let x = 9; x <= 38; x++) {
        benchGrid[y][x] = y === 37 ? C_WOOD_LGT : (y === 40 ? C_WOOD_DEEP : C_WOOD_MID);
    }
}
// Rough quarry stone block resting on lower shelf
for (let y = 34; y <= 36; y++) {
    for (let x = 20; x <= 27; x++) {
        benchGrid[y][x] = (y === 34) ? C_STONE_TOP : C_STONE_MID;
    }
    benchGrid[y][20] = C_OUTLINE;
    benchGrid[y][27] = C_OUTLINE;
}
benchGrid[33][21] = C_STONE_HI;
benchGrid[33][26] = C_STONE_HI;

// Front timber legs (stout 5px posts)
for (let y = 26; y <= 46; y++) {
    // Left front leg
    for (let x = 7; x <= 12; x++) {
        if (x === 7) benchGrid[y][x] = C_OUTLINE;
        else if (x === 8) benchGrid[y][x] = C_WOOD_LGT;
        else if (x === 12) benchGrid[y][x] = C_WOOD_DEEP;
        else benchGrid[y][x] = C_WOOD_MID;
    }
    benchGrid[y][12] = C_OUTLINE;

    // Right front leg
    for (let x = 35; x <= 40; x++) {
        if (x === 35) benchGrid[y][x] = C_OUTLINE;
        else if (x === 36) benchGrid[y][x] = C_WOOD_LGT;
        else if (x === 40) benchGrid[y][x] = C_WOOD_DEEP;
        else benchGrid[y][x] = C_WOOD_MID;
    }
    benchGrid[y][40] = C_OUTLINE;
}
benchGrid[47][7] = C_OUTLINE; benchGrid[47][12] = C_OUTLINE;
benchGrid[47][35] = C_OUTLINE; benchGrid[47][40] = C_OUTLINE;

// Cross braces under main stone slab
for (let y = 25; y <= 27; y++) {
    for (let x = 13; x <= 34; x++) {
        benchGrid[y][x] = (y === 27) ? C_WOOD_DEEP : C_WOOD_MID;
    }
}

// Thick polished stone workbench slab
// Top face: rows 15 to 22, cols 5 to 42
for (let y = 15; y <= 21; y++) {
    for (let x = 6; x <= 41; x++) {
        benchGrid[y][x] = C_STONE_TOP;
        // Subtle natural granite flecking / chisel dither
        if ((x + y * 3) % 7 === 0) benchGrid[y][x] = C_STONE_MID;
        if ((x * 2 + y) % 11 === 0) benchGrid[y][x] = C_STONE_HI;
    }
}
// Top rim bevel highlight
for (let x = 6; x <= 41; x++) benchGrid[15][x] = C_STONE_HI;
// Side edges of top face
for (let y = 15; y <= 21; y++) {
    benchGrid[y][5] = C_OUTLINE;
    benchGrid[y][6] = C_STONE_HI;
    benchGrid[y][41] = C_STONE_DK;
    benchGrid[y][42] = C_OUTLINE;
}
// Top outline
for (let x = 5; x <= 42; x++) benchGrid[14][x] = C_OUTLINE;

// Front bevel & face of stone slab: rows 22 to 25
for (let y = 22; y <= 24; y++) {
    for (let x = 5; x <= 42; x++) {
        if (x === 5 || x === 42) benchGrid[y][x] = C_OUTLINE;
        else if (y === 22) benchGrid[y][x] = C_STONE_MID;
        else if (y === 23) benchGrid[y][x] = C_STONE_DK;
        else benchGrid[y][x] = C_STONE_CRK;
    }
}
for (let x = 5; x <= 42; x++) benchGrid[25][x] = C_OUTLINE;

// Crafting tools resting on the workbench surface:
// 1. Flint knife/chisel at left (rows 17-19, cols 10-15)
benchGrid[18][10] = C_FLINT; benchGrid[18][11] = C_FLINT;
benchGrid[17][12] = C_FLINT; benchGrid[18][12] = C_STONE_HI;
benchGrid[18][13] = C_WOOD_DK; benchGrid[18][14] = C_WOOD_MID; benchGrid[18][15] = C_WOOD_LGT;

// 2. Heavy carpenter mallet at right (rows 17-20, cols 29-37)
// Mallet head (cols 34-37, rows 17-20)
for (let my = 17; my <= 19; my++) {
    for (let mx = 34; mx <= 36; mx++) {
        benchGrid[my][mx] = (my === 17) ? C_WOOD_LGT : C_WOOD_DK;
    }
}
benchGrid[17][34] = C_OUTLINE; benchGrid[19][36] = C_OUTLINE;
// Mallet handle (cols 28-33, row 18)
for (let hx = 28; hx <= 33; hx++) benchGrid[18][hx] = C_WOOD_MID;
benchGrid[18][28] = C_WOOD_LGT;

// 3. Small stone flakes and carving chips on center of slab
benchGrid[19][21] = C_STONE_HI; benchGrid[20][22] = C_STONE_MID;
benchGrid[17][24] = C_STONE_HI; benchGrid[18][25] = C_FLINT;
benchGrid[20][17] = C_STONE_DK;

// -------------------------------------------------------------
// 2. BUILD RUBBLE (Fallen stone debris and masonry fragments)
// -------------------------------------------------------------
console.log('Synthesizing rubble (Ruined stone masonry debris)...');
const rubbleGrid = createGrid();

// Ground contact shadow under main heaps
for (let x = 5; x <= 42; x++) rubbleGrid[47][x] = C_SHADOW;

// Scatter of small stone chips and mortar crumb on perimeter (rows 44-46)
const pebbleLocs = [
    [45, 5], [46, 6], [45, 9], [46, 11], [45, 14], [46, 18],
    [45, 23], [46, 25], [45, 30], [46, 33], [45, 37], [46, 40], [45, 42]
];
for (const [py, px] of pebbleLocs) {
    rubbleGrid[py][px] = C_STONE_MID;
    if (py < 47) rubbleGrid[py + 1][px] = C_OUTLINE;
}

// Broken Charred Timber Beam protruding on left (rows 40-43, cols 5-14)
for (let y = 40; y <= 42; y++) {
    for (let x = 6; x <= 13; x++) {
        rubbleGrid[y][x] = (y === 40) ? C_WOOD_DK : C_CHARCOAL;
    }
}
rubbleGrid[41][5] = C_WOOD_LGT; rubbleGrid[42][5] = C_WOOD_MID; // broken splintered tip
rubbleGrid[40][5] = C_OUTLINE; rubbleGrid[43][6] = C_OUTLINE;
for (let x = 6; x <= 13; x++) rubbleGrid[43][x] = C_OUTLINE;

// Fallen Ashlar Stone Blocks (Layered Heap)
// Block 1: Large tilted central block (rows 32-40, cols 17-29)
for (let y = 32; y <= 39; y++) {
    for (let x = 18; x <= 28; x++) {
        if (y === 32) rubbleGrid[y][x] = (x < 24) ? C_STONE_HI : C_STONE_TOP;
        else if (y <= 35) rubbleGrid[y][x] = C_STONE_TOP;
        else rubbleGrid[y][x] = C_STONE_MID;
    }
}
// Block 1 outline & cracks
for (let x = 17; x <= 29; x++) rubbleGrid[31][x] = C_OUTLINE;
for (let y = 32; y <= 39; y++) {
    rubbleGrid[y][17] = C_OUTLINE;
    rubbleGrid[y][29] = C_OUTLINE;
}
for (let x = 17; x <= 29; x++) rubbleGrid[40][x] = C_OUTLINE;
rubbleGrid[34][22] = C_STONE_CRK; rubbleGrid[35][23] = C_STONE_CRK; rubbleGrid[36][23] = C_STONE_CRK;

// Block 2: Left collapsed stone block (rows 34-42, cols 9-18)
for (let y = 35; y <= 41; y++) {
    for (let x = 10; x <= 17; x++) {
        rubbleGrid[y][x] = (y <= 37) ? C_STONE_TOP : C_STONE_MID;
    }
}
for (let x = 9; x <= 18; x++) rubbleGrid[34][x] = C_OUTLINE;
for (let y = 35; y <= 41; y++) {
    rubbleGrid[y][9] = C_OUTLINE;
    rubbleGrid[y][18] = C_OUTLINE;
}
for (let x = 9; x <= 18; x++) rubbleGrid[42][x] = C_OUTLINE;

// Block 3: Right angled corner block (rows 33-41, cols 28-39)
for (let y = 34; y <= 40; y++) {
    for (let x = 29; x <= 38; x++) {
        rubbleGrid[y][x] = (y <= 36) ? C_STONE_TOP : C_STONE_MID;
    }
}
for (let x = 28; x <= 39; x++) rubbleGrid[33][x] = C_OUTLINE;
for (let y = 34; y <= 40; y++) {
    rubbleGrid[y][28] = C_OUTLINE;
    rubbleGrid[y][39] = C_OUTLINE;
}
for (let x = 28; x <= 39; x++) rubbleGrid[41][x] = C_OUTLINE;

// Block 4: Rear high block fragment (rows 25-33, cols 19-31)
for (let y = 26; y <= 31; y++) {
    for (let x = 20; x <= 30; x++) {
        rubbleGrid[y][x] = (y === 26) ? C_STONE_HI : (y <= 28 ? C_STONE_TOP : C_STONE_MID);
    }
}
for (let x = 19; x <= 31; x++) rubbleGrid[25][x] = C_OUTLINE;
for (let y = 26; y <= 31; y++) {
    rubbleGrid[y][19] = C_OUTLINE;
    rubbleGrid[y][31] = C_OUTLINE;
}

// Block 5: Far left small block (rows 37-43, cols 4-10)
for (let y = 38; y <= 42; y++) {
    for (let x = 5; x <= 9; x++) rubbleGrid[y][x] = C_STONE_TOP;
}
for (let x = 4; x <= 10; x++) rubbleGrid[37][x] = C_OUTLINE;
rubbleGrid[43][4] = C_OUTLINE; rubbleGrid[43][10] = C_OUTLINE;

// Mortar residue & crumbles tucked in crevices
rubbleGrid[31][18] = C_MORTAR; rubbleGrid[32][17] = C_MORTAR;
rubbleGrid[33][28] = C_MORTAR; rubbleGrid[34][28] = C_MORTAR;
rubbleGrid[39][17] = C_MORTAR; rubbleGrid[40][18] = C_MORTAR;
rubbleGrid[41][28] = C_MORTAR; rubbleGrid[42][29] = C_MORTAR;

// -------------------------------------------------------------
// 3. BUILD BONES PILE (Old bones / ancient remains)
// -------------------------------------------------------------
console.log('Synthesizing bones_pile (Ancient humanoid skeleton remains)...');
const bonesGrid = createGrid();

// Ground contact shadow
for (let x = 10; x <= 38; x++) bonesGrid[47][x] = C_SHADOW;

// Humanoid Skull in upper-right center (rows 27 to 37, cols 24 to 34)
// Skull dome
for (let y = 28; y <= 35; y++) {
    for (let x = 25; x <= 33; x++) {
        bonesGrid[y][x] = (y <= 30) ? C_BONE_WHT : C_BONE_LGT;
    }
}
// Rounded cranial contour
bonesGrid[27][27] = C_OUTLINE; bonesGrid[27][28] = C_OUTLINE;
bonesGrid[27][29] = C_OUTLINE; bonesGrid[27][30] = C_OUTLINE; bonesGrid[27][31] = C_OUTLINE;
for (let x = 27; x <= 31; x++) bonesGrid[28][x] = C_BONE_WHT;
bonesGrid[28][26] = C_OUTLINE; bonesGrid[28][32] = C_OUTLINE;
bonesGrid[29][25] = C_OUTLINE; bonesGrid[29][33] = C_OUTLINE;
bonesGrid[35][24] = C_OUTLINE; bonesGrid[35][34] = C_OUTLINE;

// Dark eye sockets (2x2 each)
bonesGrid[31][27] = C_OUTLINE; bonesGrid[31][28] = C_OUTLINE;
bonesGrid[32][27] = C_OUTLINE; bonesGrid[32][28] = C_OUTLINE;
bonesGrid[31][30] = C_OUTLINE; bonesGrid[31][31] = C_OUTLINE;
bonesGrid[32][30] = C_OUTLINE; bonesGrid[32][31] = C_OUTLINE;

// Nasal cavity
bonesGrid[33][29] = C_OUTLINE;

// Maxilla / teeth row
for (let x = 26; x <= 32; x++) {
    bonesGrid[35][x] = (x % 2 === 0) ? C_BONE_LGT : C_BONE_MID;
    bonesGrid[36][x] = (x % 2 === 0) ? C_BONE_DK : C_OUTLINE;
}
for (let x = 26; x <= 32; x++) bonesGrid[37][x] = C_OUTLINE;

// Curved Ribcage Arches on left side (rows 27 to 37, cols 10 to 23)
const ribs = [
    // [y, startX, endX]
    [28, 14, 21],
    [30, 12, 22],
    [32, 11, 23],
    [34, 12, 23],
    [36, 14, 22]
];
for (const [ry, sx, ex] of ribs) {
    for (let x = sx; x <= ex; x++) {
        if (x === sx || x === ex) bonesGrid[ry][x] = C_OUTLINE;
        else bonesGrid[ry][x] = C_BONE_WHT;
        bonesGrid[ry + 1][x] = (x === sx || x === ex) ? C_OUTLINE : C_BONE_MID;
    }
    bonesGrid[ry - 1][sx + 1] = C_OUTLINE;
}

// Crossed Long Bones (Femur / Tibia) in foreground (rows 38 to 46, cols 7 to 40)
// Long Bone 1: Diagonal from lower-left to upper-right (cols 8 to 38, rows 45 down to 39)
const bone1 = [
    [45, 8], [44, 9], [44, 10], [43, 11], [43, 12], [43, 13], [42, 14], [42, 15], [42, 16],
    [42, 17], [41, 18], [41, 19], [41, 20], [41, 21], [40, 22], [40, 23], [40, 24], [40, 25],
    [40, 26], [39, 27], [39, 28], [39, 29], [39, 30], [39, 31], [39, 32], [39, 33], [39, 34]
];
for (const [by, bx] of bone1) {
    if (by < 48 && bx < 48) bonesGrid[by][bx] = C_BONE_WHT;
    if (by + 1 < 48 && bx < 48) bonesGrid[by + 1][bx] = C_BONE_LGT;
    if (by + 2 < 48 && bx < 48) bonesGrid[by + 2][bx] = C_BONE_MID;
    if (by - 1 >= 0 && bx < 48) bonesGrid[by - 1][bx] = C_OUTLINE;
    if (by + 3 < 48 && bx < 48) bonesGrid[by + 3][bx] = C_OUTLINE;
}
// Knobby articular joint at left end (cols 7-10, rows 43-46)
bonesGrid[43][7] = C_BONE_LGT; bonesGrid[44][7] = C_BONE_MID; bonesGrid[45][7] = C_BONE_SOIL;
bonesGrid[43][8] = C_BONE_WHT; bonesGrid[46][8] = C_BONE_SOIL;
bonesGrid[42][7] = C_OUTLINE; bonesGrid[46][7] = C_OUTLINE;

// Long Bone 2: Crossing bone (cols 14 to 39, rows 39 down to 45)
const bone2 = [
    [40, 14], [40, 15], [41, 17], [41, 19], [42, 22], [42, 25], [43, 28], [43, 31], [44, 34], [44, 37]
];
for (const [by, bx] of bone2) {
    for (let dx = 0; dx <= 2; dx++) {
        if (by < 48 && bx + dx < 48) bonesGrid[by][bx + dx] = C_BONE_WHT;
        if (by + 1 < 48 && bx + dx < 48) bonesGrid[by + 1][bx + dx] = C_BONE_LGT;
        if (by + 2 < 48 && bx + dx < 48) bonesGrid[by + 2][bx + dx] = C_BONE_MID;
        if (by - 1 >= 0 && bx + dx < 48) bonesGrid[by - 1][bx + dx] = C_OUTLINE;
        if (by + 3 < 48 && bx + dx < 48) bonesGrid[by + 3][bx + dx] = C_OUTLINE;
    }
}
// Knobby joint at right end (cols 37-40, rows 43-46)
bonesGrid[44][38] = C_BONE_LGT; bonesGrid[45][38] = C_BONE_MID; bonesGrid[46][38] = C_BONE_SOIL;
bonesGrid[44][39] = C_BONE_WHT; bonesGrid[45][39] = C_BONE_LGT; bonesGrid[46][39] = C_BONE_SOIL;
bonesGrid[43][38] = C_OUTLINE; bonesGrid[47][38] = C_OUTLINE;
bonesGrid[43][39] = C_OUTLINE; bonesGrid[47][39] = C_OUTLINE;

// Weathered vertebrae & scattered finger/toe bones
bonesGrid[38][11] = C_BONE_WHT; bonesGrid[39][11] = C_BONE_MID; bonesGrid[40][11] = C_OUTLINE;
bonesGrid[37][21] = C_BONE_WHT; bonesGrid[38][21] = C_BONE_DK;  bonesGrid[39][21] = C_OUTLINE;
bonesGrid[42][35] = C_BONE_WHT; bonesGrid[43][35] = C_BONE_DK;

// -------------------------------------------------------------
// 4. BUILD FALLEN PILLAR (Ruined Classical Stone Column)
// -------------------------------------------------------------
console.log('Synthesizing fallen_pillar (Ruined fluted classical column)...');
const pillarGrid = createGrid();

// Ground contact shadow
for (let x = 6; x <= 42; x++) pillarGrid[47][x] = C_SHADOW;

// Horizontal fluted column body lying on the ground (rows 24 to 45, cols 11 to 38)
for (let y = 25; y <= 44; y++) {
    for (let x = 12; x <= 37; x++) {
        // Fluted column shading profile:
        // Rows 25-27: Top curvature highlight
        if (y <= 27) {
            pillarGrid[y][x] = (y === 25) ? C_STONE_HI : C_STONE_TOP;
        }
        // Rows 28-36: Main cylinder body with 4 horizontal fluting bands
        else if (y <= 36) {
            const fluteRow = (y - 28) % 3;
            if (fluteRow === 0) pillarGrid[y][x] = C_STONE_DK;   // flute groove shadow
            else if (fluteRow === 1) pillarGrid[y][x] = C_STONE_TOP; // flute ridge highlight
            else pillarGrid[y][x] = C_STONE_MID;                // flute body
        }
        // Rows 37-44: Lower cylinder shadow & ground contact curve
        else if (y <= 40) {
            pillarGrid[y][x] = C_STONE_DK;
        } else {
            pillarGrid[y][x] = C_STONE_CRK;
        }

        // Add subtle limestone marbling flecks
        if ((x + y * 2) % 13 === 0 && y > 27 && y < 38) pillarGrid[y][x] = C_MORTAR;
    }
}
// Top outline along shaft
for (let x = 12; x <= 37; x++) pillarGrid[24][x] = C_OUTLINE;
// Bottom outline along shaft
for (let x = 12; x <= 37; x++) pillarGrid[45][x] = C_OUTLINE;

// Left End: Classical Capital / Base Ring Torus (cols 5 to 12, rows 22 to 46)
// Rounded molded torus profile
for (let y = 23; y <= 45; y++) {
    for (let x = 6; x <= 11; x++) {
        if (y <= 25) pillarGrid[y][x] = (y === 23) ? C_STONE_HI : C_STONE_TOP;
        else if (y <= 37) pillarGrid[y][x] = C_STONE_TOP;
        else if (y <= 42) pillarGrid[y][x] = C_STONE_MID;
        else pillarGrid[y][x] = C_STONE_DK;
    }
}
// Carved square abacus cap at far left edge (cols 5 to 7, rows 21 to 46)
for (let y = 22; y <= 46; y++) {
    pillarGrid[y][5] = C_OUTLINE;
    pillarGrid[y][6] = (y <= 24) ? C_STONE_HI : (y <= 38 ? C_STONE_TOP : C_STONE_DK);
    pillarGrid[y][7] = C_STONE_MID;
}
for (let x = 5; x <= 11; x++) pillarGrid[21][x] = C_OUTLINE;
for (let x = 5; x <= 11; x++) pillarGrid[46][x] = C_OUTLINE;

// Right End: Rough Broken Fracture Surface (cols 38 to 43, rows 24 to 45)
// Jagged broken fracture cross section of column interior
for (let y = 25; y <= 44; y++) {
    const maxX = 39 + ((y * 3) % 4); // jagged break edge
    for (let x = 38; x <= maxX; x++) {
        if (x === maxX) pillarGrid[y][x] = C_OUTLINE;
        else if (y <= 30) pillarGrid[y][x] = C_STONE_MID;
        else if (y <= 38) pillarGrid[y][x] = C_STONE_DK;
        else pillarGrid[y][x] = C_STONE_CRK;
    }
    // Fissure cracks on fracture face
    if (y % 4 === 0) pillarGrid[y][38] = C_STONE_CRK;
}
pillarGrid[24][38] = C_OUTLINE; pillarGrid[24][39] = C_OUTLINE;
pillarGrid[45][38] = C_OUTLINE; pillarGrid[45][39] = C_OUTLINE;

// Weathering: Patches of delicate green moss and lichen on column cracks
pillarGrid[26][18] = C_MOSS; pillarGrid[27][18] = C_MOSS; pillarGrid[27][19] = C_MOSS;
pillarGrid[35][27] = C_MOSS; pillarGrid[36][27] = C_MOSS; pillarGrid[36][28] = C_MOSS;
pillarGrid[28][8]  = C_MOSS; pillarGrid[29][8]  = C_MOSS;

// -------------------------------------------------------------
// SAVE ALL 4 ASSETS (Masters, Sidecars, Raw Canvases, RMMZ Charsets)
// -------------------------------------------------------------
const assets = [
    {
        id: 'workbench',
        name: 'Work stone',
        grid: benchGrid,
        masterPng: path.join(ROOT, 'art', 'masters', 'workbench.png'),
        masterJson: path.join(ROOT, 'art', 'masters', 'workbench.json'),
        rawPng: path.join(ROOT, 'art', 'raw', 'workbench.png'),
        rmmzPng: path.join(ROOT, 'game', 'img', 'characters', '!$UF_Workbench.png'),
        rmmzJson: path.join(ROOT, 'game', 'img', 'characters', '!$UF_Workbench.json'),
        footprint: [1, 1],
        passable: false,
        layer: 'object'
    },
    {
        id: 'rubble',
        name: 'Rubble',
        grid: rubbleGrid,
        masterPng: path.join(ROOT, 'art', 'masters', 'rubble.png'),
        masterJson: path.join(ROOT, 'art', 'masters', 'rubble.json'),
        rawPng: path.join(ROOT, 'art', 'raw', 'rubble.png'),
        rmmzPng: path.join(ROOT, 'game', 'img', 'characters', '!$UF_Rubble.png'),
        rmmzJson: path.join(ROOT, 'game', 'img', 'characters', '!$UF_Rubble.json'),
        footprint: [1, 1],
        passable: true,
        layer: 'under'
    },
    {
        id: 'bones_pile',
        name: 'Old bones',
        grid: bonesGrid,
        masterPng: path.join(ROOT, 'art', 'masters', 'bones_pile.png'),
        masterJson: path.join(ROOT, 'art', 'masters', 'bones_pile.json'),
        rawPng: path.join(ROOT, 'art', 'raw', 'bones_pile.png'),
        rmmzPng: path.join(ROOT, 'game', 'img', 'characters', '!$UF_OldBones.png'),
        rmmzJson: path.join(ROOT, 'game', 'img', 'characters', '!$UF_OldBones.json'),
        footprint: [1, 1],
        passable: true,
        layer: 'under'
    },
    {
        id: 'fallen_pillar',
        name: 'Fallen pillar',
        grid: pillarGrid,
        masterPng: path.join(ROOT, 'art', 'masters', 'fallen_pillar.png'),
        masterJson: path.join(ROOT, 'art', 'masters', 'fallen_pillar.json'),
        rawPng: path.join(ROOT, 'art', 'raw', 'fallen_pillar.png'),
        rmmzPng: path.join(ROOT, 'game', 'img', 'characters', '!$UF_FallenPillar.png'),
        rmmzJson: path.join(ROOT, 'game', 'img', 'characters', '!$UF_FallenPillar.json'),
        footprint: [1, 1],
        passable: false,
        layer: 'object'
    }
];

for (const a of assets) {
    console.log(`Writing outputs for ${a.id}...`);

    // 1. Master PNG (48x48, transparent)
    const masterBuf = gridToBuffer(a.grid, 48, 48, null);
    writePNG(a.masterPng, 48, 48, masterBuf);

    // 2. Master Sidecar JSON
    const sidecar = {
        name: a.name,
        category: 'Building',
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: a.footprint,
        layer: a.layer,
        facings: ['S'],
        animations: { stand: [0] }
    };
    fs.writeFileSync(a.masterJson, JSON.stringify(sidecar, null, 2));

    // 3. Raw 4x Canvas on #FF00FF Magenta (192x192)
    const rawBuf = upscale4x(a.grid, 48, 48, [255, 0, 255]);
    writePNG(a.rawPng, 192, 192, rawBuf);

    // 4. RMMZ Drop-in Charset (144x192)
    const rmmzBuf = createRmmzCharset(a.grid, 48, 48);
    writePNG(a.rmmzPng, 144, 192, rmmzBuf);

    // 5. RMMZ Charset Sidecar JSON
    const rmmzSidecar = {
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: a.footprint,
        layer: a.layer,
        facings: ['S', 'W', 'E', 'N'],
        animations: { stand: [0] }
    };
    fs.writeFileSync(a.rmmzJson, JSON.stringify(rmmzSidecar, null, 2));
}

console.log('All 4 site pieces generated successfully!');
