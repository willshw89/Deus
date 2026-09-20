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

    // raw meat
    MEAT_RAW_TOP: palColors[21],     // #FF394D
    MEAT_RAW_MID: palColors[23],     // #DF1428
    MEAT_RAW_SOUTH: palColors[24],   // #C20C1C
    MEAT_RAW_EAST: palColors[26],    // #8A040C
    MEAT_RAW_CREASE: palColors[28],  // #510000
    FAT_LIT: palColors[32],          // #FFDFBA
    FAT_SHADE: palColors[134],       // #EBE3D7
    BONE_LIT: palColors[134],        // #EBE3D7
    BONE_SHADE: palColors[120],      // #CECECE

    // cooked meat
    GLOSS_DOT: palColors[8],         // #B28210
    CRUST_TOP: palColors[140],       // #8A5D2D
    CRUST_MID1: palColors[10],       // #8A5508
    CRUST_SOUTH: palColors[11],      // #754504
    CRUST_MID2: palColors[12],       // #613100
    CRUST_EAST: palColors[13],       // #4D2400
    CRUST_CREASE: palColors[145],    // #3D240C
    BONE_COOK_MID: palColors[136],   // #CAB292
    BONE_SCORCH: palColors[137],     // #BA9A71

    // fish
    FISH_BACK_LIT: palColors[74],    // #BABAFF
    FISH_BACK_MID: palColors[76],    // #7D7DFF
    FISH_FIN: palColors[78],         // #3D3DFF
    FISH_FLANK_HI: palColors[118],   // #EFEFEF
    FISH_FLANK_MID: palColors[120],  // #CECECE
    FISH_BELLY: palColors[122],      // #AEAEAE
    FISH_TAIL_SHADE: palColors[126], // #6D6D6D
    WHITE: palColors[15],            // #FFFFFF

    // hide
    FUR_LIT: palColors[137],         // #BA9A71
    FUR_MID1: palColors[138],        // #AA8659
    FUR_MID2: palColors[139],        // #9A7141
    FUR_SHADE: palColors[140],       // #8A5D2D
    FUR_SPINE: palColors[141],       // #7D4D18
    RIM_INNER: palColors[135],       // #DBCAB2
    RIM_OUTER: palColors[136],       // #CAB292

    // bone
    BONE_WHITE: palColors[148],      // #EFEBE7
    BONE_IVORY: palColors[134],      // #EBE3D7
    BONE_SOUTH: palColors[135],      // #DBCAB2
    BONE_PIT: palColors[136],        // #CAB292
    BONE_EAST: palColors[150],       // #CEC6BE
    MARROW: palColors[137],          // #BA9A71

    // wool
    FLEECE_CROWN: palColors[15],     // #FFFFFF
    FLEECE_RIM: palColors[148],      // #EFEBE7
    FLEECE_SOUTH: palColors[149],    // #DFD7D2
    FLEECE_EAST: palColors[150],     // #CEC6BE
    FLEECE_CRIMP: palColors[151],    // #BEB2AE
    TIPS_YELLOW: palColors[134],     // #EBE3D7
    TIE_CORD: palColors[139],        // #9A7141
    TIE_KNOT: palColors[141]         // #7D4D18
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
    addSelectiveOutline(outlineCol) {
        const copy = this.grid.map(row => row.slice());
        for (let y = 0; y < this.h; y++) {
            for (let x = 0; x < this.w; x++) {
                if (this.isBg(x, y)) {
                    const top = !this.isBg(x, y - 1);
                    const left = !this.isBg(x - 1, y);
                    const topLeft = !this.isBg(x - 1, y - 1);
                    if (top || left || topLeft) {
                        copy[y][x] = outlineCol;
                    }
                }
            }
        }
        this.grid = copy;
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

// 1. RAW MEAT (Ground: 48x48, Icon: 32x32)
function buildMeatRawGround() {
    const g = new CanvasGrid(48, 48);
    // Haunch body: cols 14..37, rows 30..47. Contact rows 44..47, cols 16..37.
    for (let y = 30; y <= 47; y++) {
        const spanY = (y - 30) / 17;
        const minX = Math.round(15 - 1 * Math.sin(spanY * Math.PI));
        const maxX = Math.round(36 + 1 * Math.sin(spanY * Math.PI));
        for (let x = minX; x <= maxX; x++) {
            if (x - minX <= 5 && y <= 40) {
                if ((x + y) % 2 === 0) g.set(x, y, C.MEAT_RAW_TOP);
                else g.set(x, y, C.MEAT_RAW_MID);
            } else if (y >= 44) {
                g.set(x, y, C.MEAT_RAW_SOUTH);
            } else if (x >= maxX - 4) {
                g.set(x, y, C.MEAT_RAW_EAST);
            } else {
                g.set(x, y, C.MEAT_RAW_MID);
            }
        }
    }
    // Fat rim along top-left (rows 30..34)
    for (let x = 16; x <= 26; x++) g.set(x, 30, C.FAT_LIT);
    for (let x = 15; x <= 25; x++) g.set(x, 31, C.FAT_SHADE);
    // Crease along bottom right
    for (let x = 32; x <= 37; x++) g.set(x, 47, C.MEAT_RAW_CREASE);

    // Bone shank & knuckle: cols 10..15, rows 26..31
    for (let y = 29; y <= 33; y++) {
        g.set(13, y, C.BONE_LIT);
        g.set(14, y, C.BONE_LIT);
        g.set(15, y, C.BONE_SHADE);
    }
    // 6x6 knuckle at cols 10..15, rows 26..31
    for (let y = 26; y <= 31; y++) {
        for (let x = 10; x <= 15; x++) {
            if ((x - 12.5) ** 2 + (y - 28.5) ** 2 <= 7) {
                if (x <= 12 && y <= 28) g.set(x, y, C.BONE_LIT);
                else g.set(x, y, C.BONE_SHADE);
            }
        }
    }
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

function buildMeatRawIcon() {
    const g = new CanvasGrid(32, 32);
    // Centered: rows 10..24, cols 6..26
    for (let y = 13; y <= 23; y++) {
        for (let x = 11; x <= 25; x++) {
            if (x <= 15 && y <= 17) g.set(x, y, C.MEAT_RAW_TOP);
            else if (y >= 21) g.set(x, y, C.MEAT_RAW_SOUTH);
            else if (x >= 23) g.set(x, y, C.MEAT_RAW_EAST);
            else g.set(x, y, C.MEAT_RAW_MID);
        }
    }
    for (let x = 12; x <= 18; x++) g.set(x, 13, C.FAT_LIT);
    // Bone
    for (let y = 10; y <= 14; y++) {
        for (let x = 7; x <= 11; x++) {
            if (x <= 9 && y <= 12) g.set(x, y, C.BONE_LIT);
            else g.set(x, y, C.BONE_SHADE);
        }
    }
    for (let x = 12; x <= 25; x++) g.set(x, 23, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

// 2. COOKED MEAT (Ground: 48x48, Icon: 32x32)
function buildMeatCookedGround() {
    const g = new CanvasGrid(48, 48);
    // Exact register match with raw meat haunch
    for (let y = 30; y <= 47; y++) {
        const spanY = (y - 30) / 17;
        const minX = Math.round(15 - 1 * Math.sin(spanY * Math.PI));
        const maxX = Math.round(36 + 1 * Math.sin(spanY * Math.PI));
        for (let x = minX; x <= maxX; x++) {
            if (x - minX <= 5 && y <= 40) {
                if ((x + y) % 2 === 0) g.set(x, y, C.CRUST_TOP);
                else g.set(x, y, C.CRUST_MID1);
            } else if (y >= 44) {
                if (y === 47 && (x + y) % 2 === 0) g.set(x, y, C.CRUST_MID2);
                else g.set(x, y, C.CRUST_SOUTH);
            } else if (x >= maxX - 4) {
                g.set(x, y, C.CRUST_EAST);
            } else {
                g.set(x, y, C.CRUST_MID1);
            }
        }
    }
    // Fat gloss dots
    const gloss = [[18, 33], [22, 32], [27, 34], [19, 37], [24, 38], [29, 39], [22, 42], [26, 43]];
    for (const [gx, gy] of gloss) g.set(gx, gy, C.GLOSS_DOT);
    // Crease line
    for (let x = 32; x <= 37; x++) g.set(x, 47, C.CRUST_CREASE);

    // Bone shank & knuckle with scorch
    for (let y = 29; y <= 33; y++) {
        g.set(13, y, C.BONE_LIT);
        g.set(14, y, C.BONE_COOK_MID);
        g.set(15, y, C.BONE_SCORCH);
    }
    for (let y = 26; y <= 31; y++) {
        for (let x = 10; x <= 15; x++) {
            if ((x - 12.5) ** 2 + (y - 28.5) ** 2 <= 7) {
                if (x <= 12 && y <= 28) g.set(x, y, C.BONE_LIT);
                else g.set(x, y, C.BONE_COOK_MID);
            }
        }
    }
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

function buildMeatCookedIcon() {
    const g = new CanvasGrid(32, 32);
    for (let y = 13; y <= 23; y++) {
        for (let x = 11; x <= 25; x++) {
            if (x <= 15 && y <= 17) g.set(x, y, C.CRUST_TOP);
            else if (y >= 21) g.set(x, y, C.CRUST_SOUTH);
            else if (x >= 23) g.set(x, y, C.CRUST_EAST);
            else g.set(x, y, C.CRUST_MID1);
        }
    }
    g.set(14, 15, C.GLOSS_DOT); g.set(18, 16, C.GLOSS_DOT); g.set(15, 19, C.GLOSS_DOT);
    for (let y = 10; y <= 14; y++) {
        for (let x = 7; x <= 11; x++) {
            if (x <= 9 && y <= 12) g.set(x, y, C.BONE_LIT);
            else g.set(x, y, C.BONE_COOK_MID);
        }
    }
    for (let x = 12; x <= 25; x++) g.set(x, 23, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

// 3. FISH (Ground: 48x48, Icon: 32x32)
function buildFishGround() {
    const g = new CanvasGrid(48, 48);
    // Spindle body: cols 8..41, rows 34..47. Belly contact rows 44..47 cols 14..36.
    for (let x = 8; x <= 34; x++) {
        const frac = (x - 8) / 26;
        const halfThick = Math.round(5 * Math.sin(frac * Math.PI));
        const cy = Math.round(41 - 1 * frac);
        for (let y = cy - halfThick; y <= cy + halfThick; y++) {
            if (y < cy - halfThick + 2) {
                if ((x + y) % 2 === 0) g.set(x, y, C.FISH_BACK_LIT);
                else g.set(x, y, C.FISH_BACK_MID);
            } else if (y === cy - halfThick + 2) {
                g.set(x, y, C.FISH_FLANK_HI);
            } else if (y >= cy + halfThick - 1) {
                g.set(x, y, C.FISH_BELLY);
            } else {
                g.set(x, y, C.FISH_FLANK_MID);
            }
        }
    }
    // Forked tail: cols 35..41, rows 38..46
    for (let dx = 0; dx <= 6; dx++) {
        const tx = 35 + dx;
        const spread = Math.round(1 + dx * 0.7);
        for (let s = -spread; s <= spread; s++) {
            if (Math.abs(s) >= spread * 0.4 || dx === 6) {
                const ty = 40 + s;
                g.set(tx, ty, (dx >= 4) ? C.FISH_TAIL_SHADE : C.FISH_BELLY);
            }
        }
    }
    // Fins
    for (let fx = 22; fx <= 26; fx++) { g.set(fx, 35, C.FISH_FIN); g.set(fx, 36, C.FISH_FIN); }
    for (let px = 20; px <= 22; px++) g.set(px, 46, C.FISH_FIN);
    // Head features (cols 8..17)
    g.set(16, 39, C.FISH_TAIL_SHADE); g.set(16, 40, C.FISH_TAIL_SHADE); g.set(16, 41, C.FISH_TAIL_SHADE);
    // Eye
    g.set(12, 39, C.SILHOUETTE); g.set(11, 38, C.WHITE);
    // Mouth
    g.set(8, 42, C.SILHOUETTE);

    for (let x = 14; x <= 36; x++) g.set(x, 47, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

function buildFishIcon() {
    const g = new CanvasGrid(32, 32);
    for (let x = 6; x <= 23; x++) {
        const frac = (x - 6) / 17;
        const halfThick = Math.round(3.5 * Math.sin(frac * Math.PI));
        const cy = 16;
        for (let y = cy - halfThick; y <= cy + halfThick; y++) {
            if (y < cy - 1) g.set(x, y, C.FISH_BACK_MID);
            else if (y === cy - 1) g.set(x, y, C.FISH_FLANK_HI);
            else if (y > cy + 1) g.set(x, y, C.FISH_BELLY);
            else g.set(x, y, C.FISH_FLANK_MID);
        }
    }
    // Tail
    for (let dx = 0; dx <= 4; dx++) {
        const tx = 24 + dx;
        const spread = Math.round(1 + dx * 0.8);
        for (let s = -spread; s <= spread; s++) {
            if (Math.abs(s) >= spread * 0.3) g.set(tx, 16 + s, C.FISH_BELLY);
        }
    }
    g.set(9, 15, C.SILHOUETTE); g.set(8, 14, C.WHITE);
    for (let x = 10; x <= 24; x++) g.set(x, 19, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

// 4. HIDE (Ground: 48x48, Icon: 32x32)
function buildHideGround() {
    const g = new CanvasGrid(48, 48);
    // Lumpy pelt: cols 5..42, rows 24..47
    for (let y = 26; y <= 45; y++) {
        const ny = (y - 35.5) / 9.5;
        const wX = Math.round(14 * Math.sqrt(Math.max(0, 1 - ny * ny)));
        for (let x = 23 - wX; x <= 24 + wX; x++) {
            const diag = (x - 9) + (y - 26);
            if (diag <= 18) {
                if ((x + y) % 2 === 0) g.set(x, y, C.FUR_LIT);
                else g.set(x, y, C.FUR_MID1);
            } else if (diag <= 34) {
                g.set(x, y, C.FUR_MID2);
            } else {
                g.set(x, y, C.FUR_SHADE);
            }
        }
    }
    // Flaps: Upper-left, Upper-right, Lower-left, Lower-right, Neck
    const flaps = [
        [5, 9, 28, 31],   // UL leg
        [36, 40, 26, 29], // UR leg
        [7, 11, 41, 44],  // LL leg
        [38, 42, 40, 43], // LR leg
        [18, 23, 24, 28]  // Neck
    ];
    for (const [x0, x1, y0, y1] of flaps) {
        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                if (x <= 15) g.set(x, y, C.FUR_MID1);
                else if (x >= 32) g.set(x, y, C.FUR_SHADE);
                else g.set(x, y, C.FUR_MID2);
            }
        }
    }
    // Spine line at 45 deg
    for (let d = 0; d <= 24; d++) {
        const sx = 18 + Math.round(d * 0.7);
        const sy = 24 + Math.round(d * 0.85);
        g.set(sx, sy, C.FUR_SPINE);
        if (d % 3 === 0) {
            g.set(sx - 1, sy + 1, C.FUR_SPINE);
            g.set(sx + 1, sy - 1, C.FUR_SPINE);
        }
    }
    // Flesh rim along lower & right edge
    for (let x = 8; x <= 42; x++) {
        for (let y = 43; y <= 46; y++) {
            if (!g.isBg(x, y) && (g.isBg(x, y + 1) || g.isBg(x + 1, y))) {
                g.set(x, y, C.RIM_INNER);
            }
        }
    }
    for (let x = 7; x <= 42; x++) g.set(x, 47, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

function buildHideIcon() {
    const g = new CanvasGrid(32, 32);
    for (let y = 8; y <= 23; y++) {
        const ny = (y - 15.5) / 7.5;
        const wX = Math.round(9 * Math.sqrt(Math.max(0, 1 - ny * ny)));
        for (let x = 16 - wX; x <= 16 + wX; x++) {
            if (x <= 13) g.set(x, y, C.FUR_MID1);
            else if (x >= 19) g.set(x, y, C.FUR_SHADE);
            else g.set(x, y, C.FUR_MID2);
        }
    }
    // Small leg lobes
    for (let y = 10; y <= 13; y++) { g.set(5, y, C.FUR_MID1); g.set(27, y, C.FUR_SHADE); }
    for (let y = 18; y <= 21; y++) { g.set(6, y, C.FUR_MID1); g.set(26, y, C.FUR_SHADE); }
    for (let x = 8; x <= 25; x++) g.set(x, 23, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

// 5. BONE (Ground: 48x48, Icon: 32x32)
function buildBoneGround() {
    const g = new CanvasGrid(48, 48);
    // Long bone shaft: cols 6..36, rows 27..46
    for (let t = 0; t <= 30; t++) {
        const frac = t / 30;
        const cx = 9 + frac * 23;
        const cy = 30 + frac * 12;
        for (let s = -2; s <= 2; s++) {
            const x = Math.round(cx - s * 0.46);
            const y = Math.round(cy + s * 0.88);
            if (s < -1) g.set(x, y, C.BONE_WHITE);
            else if (s === -1) g.set(x, y, C.BONE_IVORY);
            else g.set(x, y, C.BONE_SOUTH);
        }
    }
    // Two knobs: UL (cols 6..12, rows 27..33), LR (cols 30..36, rows 40..46)
    const knobs = [[9, 30], [33, 43]];
    for (const [kx, ky] of knobs) {
        for (let y = ky - 3; y <= ky + 3; y++) {
            for (let x = kx - 3; x <= kx + 3; x++) {
                if ((x - kx) ** 2 + (y - ky) ** 2 <= 9) {
                    if (x < kx && y < ky) g.set(x, y, C.BONE_WHITE);
                    else if (x > kx && y > ky) g.set(x, y, C.BONE_EAST);
                    else g.set(x, y, C.BONE_IVORY);
                }
            }
        }
        g.set(kx, ky, C.BONE_PIT);
    }

    // Curved rib: arc from row 46 col 16 to row 38 col 26 to row 44 col 39
    for (let t = 0; t <= 20; t++) {
        const frac = t / 20;
        const rx = Math.round(16 + frac * 23);
        const ry = Math.round(46 - 8 * Math.sin(frac * Math.PI));
        g.set(rx, ry - 1, C.BONE_WHITE);
        g.set(rx, ry, C.BONE_IVORY);
        g.set(rx, ry + 1, C.BONE_SOUTH);
    }
    // Marrow at right cut end
    g.set(39, 44, C.MARROW);

    // Short bone: cols 14..22, rows 40..42
    for (let x = 14; x <= 22; x++) {
        g.set(x, 40, C.BONE_WHITE);
        g.set(x, 41, C.BONE_IVORY);
    }
    g.set(13, 40, C.BONE_IVORY); g.set(13, 41, C.BONE_SOUTH);
    g.set(23, 40, C.BONE_IVORY); g.set(23, 41, C.BONE_SOUTH);

    for (let x = 14; x <= 36; x++) g.set(x, 47, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

function buildBoneIcon() {
    const g = new CanvasGrid(32, 32);
    // Diagonal bone
    for (let t = 0; t <= 18; t++) {
        const frac = t / 18;
        const cx = 8 + frac * 16;
        const cy = 10 + frac * 12;
        g.set(Math.round(cx), Math.round(cy - 1), C.BONE_WHITE);
        g.set(Math.round(cx), Math.round(cy), C.BONE_IVORY);
        g.set(Math.round(cx), Math.round(cy + 1), C.BONE_SOUTH);
    }
    // Knobs
    g.set(7, 9, C.BONE_WHITE); g.set(8, 8, C.BONE_WHITE); g.set(8, 9, C.BONE_PIT);
    g.set(24, 22, C.BONE_IVORY); g.set(25, 23, C.BONE_EAST); g.set(24, 23, C.BONE_PIT);
    for (let x = 10; x <= 25; x++) g.set(x, 23, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

// 6. WOOL (Ground: 48x48, Icon: 32x32)
function buildWoolGround() {
    const g = new CanvasGrid(48, 48);
    // Rolled fleece mound: cols 6..40, rows 26..47. Contact rows 42..47, cols 16..40
    for (let y = 26; y <= 47; y++) {
        const spanY = (y - 26) / 21;
        const cx = Math.round(18 + 10 * spanY);
        const wX = Math.round(11 + 6 * Math.sin(spanY * Math.PI));
        for (let x = cx - wX; x <= cx + wX; x++) {
            if (x <= cx - 3 && y <= 36) {
                if ((x + y) % 2 === 0) g.set(x, y, C.FLEECE_CROWN);
                else g.set(x, y, C.FLEECE_RIM);
            } else if (y >= 42) {
                g.set(x, y, C.FLEECE_SOUTH);
            } else if (x >= cx + wX - 5) {
                g.set(x, y, C.FLEECE_EAST);
            } else {
                if ((x + y) % 3 === 0) g.set(x, y, C.FLEECE_RIM);
                else g.set(x, y, C.FLEECE_SOUTH);
            }
        }
    }
    // Crimp lines on south face
    for (let cy = 38; cy <= 45; cy += 3) {
        for (let cx = 15; cx <= 34; cx++) {
            if (!g.isBg(cx, cy) && (cx % 3 === 0)) g.set(cx, cy, C.FLEECE_CRIMP);
        }
    }
    // Yellowed tips on outer rim
    const tips = [[7, 29], [6, 33], [9, 36], [12, 40], [39, 38], [40, 42]];
    for (const [tx, ty] of tips) g.set(tx, ty, C.TIPS_YELLOW);

    // Tie cord: cols 20..26, rows 28..45
    for (let y = 28; y <= 45; y++) {
        const tx = Math.round(21 + 4 * ((y - 28) / 17));
        if (!g.isBg(tx, y)) {
            g.set(tx, y, C.TIE_CORD);
            g.set(tx + 1, y, C.TIE_CORD);
        }
    }
    g.set(27, 41, C.TIE_KNOT); g.set(28, 41, C.TIE_KNOT);

    for (let x = 16; x <= 40; x++) g.set(x, 47, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

function buildWoolIcon() {
    const g = new CanvasGrid(32, 32);
    for (let y = 10; y <= 22; y++) {
        const ny = (y - 16) / 6;
        const wX = Math.round(8 * Math.sqrt(Math.max(0, 1 - ny * ny)));
        for (let x = 16 - wX; x <= 16 + wX; x++) {
            if (x <= 14 && y <= 14) g.set(x, y, C.FLEECE_CROWN);
            else if (y >= 19) g.set(x, y, C.FLEECE_SOUTH);
            else if (x >= 21) g.set(x, y, C.FLEECE_EAST);
            else g.set(x, y, C.FLEECE_RIM);
        }
    }
    for (let y = 11; y <= 21; y++) g.set(16, y, C.TIE_CORD);
    g.set(17, 18, C.TIE_KNOT);
    for (let x = 10; x <= 23; x++) g.set(x, 22, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

const BATCH5 = [
    { id: 'meat_raw', name: 'Raw meat', groundGen: buildMeatRawGround, iconGen: buildMeatRawIcon, rmmzName: '!$UF_Item_MeatRaw.png' },
    { id: 'meat_cooked', name: 'Cooked meat', groundGen: buildMeatCookedGround, iconGen: buildMeatCookedIcon, rmmzName: '!$UF_Item_MeatCooked.png' },
    { id: 'fish', name: 'Fish', groundGen: buildFishGround, iconGen: buildFishIcon, rmmzName: '!$UF_Item_Fish.png' },
    { id: 'hide', name: 'Hide', groundGen: buildHideGround, iconGen: buildHideIcon, rmmzName: '!$UF_Item_Hide.png' },
    { id: 'bone', name: 'Bone', groundGen: buildBoneGround, iconGen: buildBoneIcon, rmmzName: '!$UF_Item_Bone.png' },
    { id: 'wool', name: 'Wool', groundGen: buildWoolGround, iconGen: buildWoolIcon, rmmzName: '!$UF_Item_Wool.png' }
];

for (const item of BATCH5) {
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

console.log('\nAll Batch 5 animal product items synthesized and exported successfully.');
