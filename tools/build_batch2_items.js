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

// Colors from brief SEG-06_items_a.md (exact indices)
const C = {
    MAGENTA: [255, 0, 255],
    SILHOUETTE: palColors[147], // #201408

    // ore_copper
    ROCK_TOP: palColors[158],   // #514945
    ROCK_SOUTH: palColors[159], // #453D39
    ROCK_EAST: palColors[160],  // #35312D
    CRUST_LIT: palColors[165],  // #B6C29A
    CRUST_MID: palColors[167],  // #8A9A61
    CRUST_PIT: palColors[169],  // #5D7139
    NATIVE_COPPER: palColors[182], // #AE653D
    COPPER_GLINT: findColor(255, 158, 61), // #FF9E3D

    // gold
    GOLD_GLINT: palColors[233], // #FFEF41
    GOLD_TOP: palColors[250],   // #FFD200
    GOLD_SOUTH: palColors[251], // #FFAE00
    GOLD_EAST: palColors[6],    // #DBAE20
    GOLD_CREVICE: palColors[7], // #C69618
    GOLD_PIT: palColors[9],     // #9E690C

    // gem_rough
    CRYSTAL_TOP: palColors[225],      // #B2D7F3
    CRYSTAL_FRACTURE: palColors[226], // #71AEE7
    CRYSTAL_SOUTH: palColors[227],    // #358EDB
    CRYSTAL_EAST: palColors[228],     // #006DD2
    WHITE_GLINT: palColors[15],       // #FFFFFF
    HOST_LIT: palColors[154],         // #8E8279
    HOST_SHADE: palColors[156],       // #6D615D

    // gem_cut
    TABLE: palColors[73],        // #DBDBFF
    CROWN_LIT: palColors[74],    // #BABAFF
    CROWN_MID: palColors[76],    // #7D7DFF
    PAVILION_SOUTH: palColors[78], // #3D3DFF
    PAVILION_EAST: palColors[81],  // #0000C2
    PAVILION_DEEP: palColors[83],  // #00008A
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
                    // Check if adjacent to solid pixel on bottom or right
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

console.log('Synthesizing Batch 2 items...');

// 1. ORE COPPER (Ground: 48x48, Icon: 32x32)
function buildCopperOreGround() {
    const g = new CanvasGrid(48, 48);
    // Base geometry: Two nodules. Left: cols 11..23, Right: cols 22..37.
    // Contact line on row 47 from col 17 to 36
    // Top facets: rows 32..38, cols 11..30 in ROCK_TOP
    for (let y = 32; y <= 38; y++) {
        const minX = (y <= 34) ? 14 : 11;
        const maxX = (y <= 34) ? 28 : 31;
        for (let x = minX; x <= maxX; x++) {
            g.set(x, y, C.ROCK_TOP);
        }
    }
    // Crease between nodules at col 22
    for (let y = 32; y <= 40; y++) {
        g.set(22, y, C.ROCK_SOUTH);
    }
    // South face: rows 38..46, cols 13..34
    for (let y = 38; y <= 46; y++) {
        const startX = 13 + Math.floor((y - 38) * 0.4);
        const endX = 33 + Math.floor((y - 38) * 0.4);
        for (let x = startX; x <= endX; x++) {
            if (g.isBg(x, y)) {
                g.set(x, y, C.ROCK_SOUTH);
            }
        }
    }
    // East face: rows 34..46, cols 30..37
    for (let y = 34; y <= 46; y++) {
        const startX = 30 + Math.floor((y - 34) * 0.4);
        const endX = 37;
        for (let x = startX; x <= endX; x++) {
            g.set(x, y, C.ROCK_EAST);
        }
    }
    // Green mineral crust (malachite bloom): upper-left two thirds of top, spilling 3 px down south face
    for (let y = 32; y <= 41; y++) {
        const maxX = (y <= 37) ? 24 : 20;
        for (let x = 12; x <= maxX; x++) {
            if (!g.isBg(x, y) && x !== 22) {
                if ((x + y) % 2 === 0) g.set(x, y, C.CRUST_LIT);
                else g.set(x, y, C.CRUST_MID);
            }
        }
    }
    // Pits of deeper green
    g.set(15, 34, C.CRUST_PIT);
    g.set(19, 36, C.CRUST_PIT);
    g.set(14, 38, C.CRUST_PIT);
    g.set(18, 40, C.CRUST_PIT);

    // Native metallic copper fleck / node at row 41, col 22 and upper facet
    g.set(22, 41, C.NATIVE_COPPER);
    g.set(23, 41, C.NATIVE_COPPER);
    g.set(22, 42, C.COPPER_GLINT);
    g.set(23, 42, C.NATIVE_COPPER);
    g.set(25, 35, C.COPPER_GLINT);
    g.set(26, 35, C.NATIVE_COPPER);

    // Bottom contact line
    for (let x = 17; x <= 36; x++) {
        g.set(x, 47, C.SILHOUETTE);
    }
    // Right silhouette outline
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

function buildCopperOreIcon() {
    const g = new CanvasGrid(32, 32);
    // Scaled centered chunk (approx 24w x 16h, cols 4..27, rows 8..23)
    // Top face: rows 8..14, cols 5..23 in ROCK_TOP
    for (let y = 8; y <= 14; y++) {
        const minX = (y <= 10) ? 8 : 5;
        const maxX = (y <= 10) ? 21 : 24;
        for (let x = minX; x <= maxX; x++) {
            g.set(x, y, C.ROCK_TOP);
        }
    }
    // Crease
    for (let y = 8; y <= 16; y++) g.set(15, y, C.ROCK_SOUTH);

    // South face
    for (let y = 14; y <= 22; y++) {
        const startX = 6 + Math.floor((y - 14) * 0.4);
        const endX = 24 + Math.floor((y - 14) * 0.3);
        for (let x = startX; x <= endX; x++) {
            if (g.isBg(x, y)) g.set(x, y, C.ROCK_SOUTH);
        }
    }
    // East face
    for (let y = 10; y <= 22; y++) {
        const startX = 22 + Math.floor((y - 10) * 0.3);
        for (let x = startX; x <= 27; x++) {
            g.set(x, y, C.ROCK_EAST);
        }
    }
    // Malachite crust
    for (let y = 8; y <= 17; y++) {
        const maxX = (y <= 13) ? 17 : 14;
        for (let x = 6; x <= maxX; x++) {
            if (!g.isBg(x, y) && x !== 15) {
                if ((x + y) % 2 === 0) g.set(x, y, C.CRUST_LIT);
                else g.set(x, y, C.CRUST_MID);
            }
        }
    }
    g.set(9, 11, C.CRUST_PIT);
    g.set(13, 13, C.CRUST_PIT);
    g.set(15, 17, C.NATIVE_COPPER);
    g.set(16, 17, C.COPPER_GLINT);
    g.set(18, 12, C.COPPER_GLINT);

    // Contact line
    for (let x = 9; x <= 26; x++) g.set(x, 23, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

// 2. GOLD (Ground: 48x48, Icon: 32x32)
function buildGoldGround() {
    const g = new CanvasGrid(48, 48);
    // Two-lobed nugget. Contact on row 47 from col 22 to 33.
    // Left lobe (cols 17..23), Right lobe (cols 24..28), crevice at col 24
    // Top: rows 38..42, cols 17..28 in GOLD_TOP
    for (let y = 38; y <= 42; y++) {
        const minX = (y === 38) ? 19 : 17;
        const maxX = (y === 38) ? 27 : 29;
        for (let x = minX; x <= maxX; x++) {
            g.set(x, y, C.GOLD_TOP);
        }
    }
    // Crevice
    for (let y = 38; y <= 45; y++) g.set(24, y, C.GOLD_CREVICE);

    // Glints on upper-left edge
    g.set(18, 38, C.GOLD_GLINT);
    g.set(19, 38, C.GOLD_GLINT);
    g.set(17, 39, C.GOLD_GLINT);

    // Pits on right lobe
    g.set(26, 40, C.GOLD_PIT);
    g.set(27, 41, C.GOLD_PIT);
    g.set(26, 42, C.GOLD_PIT);

    // South face: rows 42..46, cols 18..31 in GOLD_SOUTH
    for (let y = 42; y <= 46; y++) {
        const startX = 18 + Math.floor((y - 42) * 0.6);
        const endX = 29 + Math.floor((y - 42) * 0.4);
        for (let x = startX; x <= endX; x++) {
            if (g.isBg(x, y) || g.get(x, y) === C.GOLD_TOP) {
                if (y === 42 && (x % 2 === 0)) g.set(x, y, C.GOLD_TOP); // micro-dither
                else g.set(x, y, C.GOLD_SOUTH);
            }
        }
    }
    // East face: rows 40..46, cols 28..33 in GOLD_EAST
    for (let y = 40; y <= 46; y++) {
        const startX = 28 + Math.floor((y - 40) * 0.5);
        for (let x = startX; x <= 33; x++) {
            g.set(x, y, C.GOLD_EAST);
        }
    }

    // Two loose grains of 2x2 px at cols 14-15 and 36-37
    g.set(14, 46, C.GOLD_TOP); g.set(15, 46, C.GOLD_TOP);
    g.set(14, 47, C.GOLD_EAST); g.set(15, 47, C.GOLD_EAST);

    g.set(36, 46, C.GOLD_TOP); g.set(37, 46, C.GOLD_TOP);
    g.set(36, 47, C.GOLD_EAST); g.set(37, 47, C.GOLD_EAST);

    // Contact line on row 47
    for (let x = 22; x <= 33; x++) g.set(x, 47, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

function buildGoldIcon() {
    const g = new CanvasGrid(32, 32);
    // Centered nugget: rows 10..21, cols 5..26
    for (let y = 10; y <= 14; y++) {
        const minX = (y === 10) ? 9 : 7;
        const maxX = (y === 10) ? 21 : 23;
        for (let x = minX; x <= maxX; x++) {
            g.set(x, y, C.GOLD_TOP);
        }
    }
    for (let y = 10; y <= 18; y++) g.set(16, y, C.GOLD_CREVICE);

    g.set(8, 10, C.GOLD_GLINT);
    g.set(9, 10, C.GOLD_GLINT);
    g.set(7, 11, C.GOLD_GLINT);
    g.set(19, 12, C.GOLD_PIT);
    g.set(20, 13, C.GOLD_PIT);

    for (let y = 14; y <= 20; y++) {
        const startX = 8 + Math.floor((y - 14) * 0.5);
        const endX = 22 + Math.floor((y - 14) * 0.4);
        for (let x = startX; x <= endX; x++) {
            if (g.isBg(x, y) || g.get(x, y) === C.GOLD_TOP) {
                if (y === 14 && (x % 2 === 0)) g.set(x, y, C.GOLD_TOP);
                else g.set(x, y, C.GOLD_SOUTH);
            }
        }
    }
    for (let y = 12; y <= 20; y++) {
        const startX = 21 + Math.floor((y - 12) * 0.4);
        for (let x = startX; x <= 26; x++) {
            g.set(x, y, C.GOLD_EAST);
        }
    }
    // Loose grains
    g.set(4, 19, C.GOLD_TOP); g.set(5, 19, C.GOLD_TOP);
    g.set(4, 20, C.GOLD_EAST); g.set(5, 20, C.GOLD_EAST);

    for (let x = 11; x <= 24; x++) g.set(x, 21, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

// 3. GEM ROUGH (Ground: 48x48, Icon: 32x32)
function buildGemRoughGround() {
    const g = new CanvasGrid(48, 48);
    // Contact on row 47 from col 20 to 34
    // Top facet: rows 33..37, cols 16..27 in CRYSTAL_TOP
    for (let y = 33; y <= 37; y++) {
        const minX = (y === 33) ? 18 : 16;
        const maxX = (y === 33) ? 25 : 27;
        for (let x = minX; x <= maxX; x++) {
            if (x > 22 && (x + y) % 2 === 0) g.set(x, y, C.CRYSTAL_FRACTURE);
            else g.set(x, y, C.CRYSTAL_TOP);
        }
    }
    // Glint
    g.set(19, 34, C.WHITE_GLINT);

    // South face: rows 37..46, cols 17..31 in CRYSTAL_SOUTH
    for (let y = 37; y <= 46; y++) {
        const startX = 17 + Math.floor((y - 37) * 0.4);
        const endX = 28 + Math.floor((y - 37) * 0.4);
        for (let x = startX; x <= endX; x++) {
            if (g.isBg(x, y)) g.set(x, y, C.CRYSTAL_SOUTH);
        }
    }
    // Fracture line
    for (let y = 38; y <= 44; y++) {
        const fx = 20 + (y - 38);
        g.set(fx, y, C.CRYSTAL_FRACTURE);
    }

    // East face: rows 35..46, cols 27..35 in CRYSTAL_EAST
    for (let y = 35; y <= 46; y++) {
        const startX = 27 + Math.floor((y - 35) * 0.5);
        for (let x = startX; x <= 35; x++) {
            g.set(x, y, C.CRYSTAL_EAST);
        }
    }

    // Host rock rind on lower-left corner: cols 16..21, rows 42..47
    for (let y = 42; y <= 47; y++) {
        for (let x = 16; x <= 21; x++) {
            if (y <= 44) g.set(x, y, C.HOST_LIT);
            else g.set(x, y, C.HOST_SHADE);
        }
    }

    // Contact line
    for (let x = 20; x <= 34; x++) g.set(x, 47, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

function buildGemRoughIcon() {
    const g = new CanvasGrid(32, 32);
    // Centered: rows 8..23, cols 6..25
    for (let y = 8; y <= 12; y++) {
        const minX = (y === 8) ? 9 : 7;
        const maxX = (y === 8) ? 17 : 19;
        for (let x = minX; x <= maxX; x++) {
            if (x > 14 && (x + y) % 2 === 0) g.set(x, y, C.CRYSTAL_FRACTURE);
            else g.set(x, y, C.CRYSTAL_TOP);
        }
    }
    g.set(10, 9, C.WHITE_GLINT);

    for (let y = 12; y <= 21; y++) {
        const startX = 8 + Math.floor((y - 12) * 0.4);
        const endX = 19 + Math.floor((y - 12) * 0.4);
        for (let x = startX; x <= endX; x++) {
            if (g.isBg(x, y)) g.set(x, y, C.CRYSTAL_SOUTH);
        }
    }
    for (let y = 13; y <= 19; y++) {
        const fx = 11 + (y - 13);
        g.set(fx, y, C.CRYSTAL_FRACTURE);
    }
    for (let y = 10; y <= 21; y++) {
        const startX = 18 + Math.floor((y - 10) * 0.4);
        for (let x = startX; x <= 24; x++) {
            g.set(x, y, C.CRYSTAL_EAST);
        }
    }
    // Host rock
    for (let y = 17; y <= 22; y++) {
        for (let x = 7; x <= 11; x++) {
            if (y <= 19) g.set(x, y, C.HOST_LIT);
            else g.set(x, y, C.HOST_SHADE);
        }
    }
    for (let x = 10; x <= 23; x++) g.set(x, 22, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

// 4. GEM CUT (Ground: 48x48, Icon: 32x32)
function buildGemCutGround() {
    const g = new CanvasGrid(48, 48);
    // Point contact on row 47 at cols 26-27. 9 px high (rows 36..47).
    // Table: flat octagon 6 px wide on rows 36..38 from col 18 to 23 in TABLE
    for (let y = 36; y <= 38; y++) {
        for (let x = 18; x <= 23; x++) {
            if ((y === 36 || y === 38) && (x === 18 || x === 23)) continue; // octagon bevel
            g.set(x, y, C.TABLE);
        }
    }
    g.set(19, 36, C.WHITE_GLINT);

    // Crown facets: fanning down to girdle (row 41, cols 17..32)
    for (let y = 39; y <= 41; y++) {
        const minX = 18 - (y - 38);
        const maxX = 23 + (y - 38) * 2.5;
        for (let x = Math.round(minX); x <= Math.round(maxX); x++) {
            if (g.isBg(x, y)) {
                if (x < 24) {
                    if (x % 2 === 0) g.set(x, y, C.CROWN_LIT);
                    else g.set(x, y, C.CROWN_MID);
                } else {
                    g.set(x, y, C.CROWN_MID);
                }
            }
        }
    }

    // Pavilion narrowing from girdle (row 41) to point (row 47)
    for (let y = 42; y <= 47; y++) {
        const span = 1 - (y - 41) / 6;
        const minX = Math.round(26 - 9 * span);
        const maxX = Math.round(27 + 6 * span);
        const midX = Math.round(26 + 1 * span);
        for (let x = minX; x <= maxX; x++) {
            if (x < midX) {
                if (y === 42 && (x % 2 === 0)) g.set(x, y, C.CROWN_MID);
                else g.set(x, y, C.PAVILION_SOUTH);
            } else if (x === midX) {
                g.set(x, y, C.PAVILION_DEEP);
            } else {
                g.set(x, y, C.PAVILION_EAST);
            }
        }
    }

    // Contact
    g.set(26, 47, C.SILHOUETTE);
    g.set(27, 47, C.SILHOUETTE);
    // Lower right outline
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

function buildGemCutIcon() {
    const g = new CanvasGrid(32, 32);
    // Centered cut gem: rows 9..22, cols 8..23
    for (let y = 9; y <= 11; y++) {
        for (let x = 13; x <= 18; x++) {
            if ((y === 9 || y === 11) && (x === 13 || x === 18)) continue;
            g.set(x, y, C.TABLE);
        }
    }
    g.set(14, 9, C.WHITE_GLINT);

    for (let y = 12; y <= 14; y++) {
        const minX = 13 - (y - 11);
        const maxX = 18 + (y - 11) * 2;
        for (let x = Math.round(minX); x <= Math.round(maxX); x++) {
            if (g.isBg(x, y)) {
                if (x < 18) {
                    if (x % 2 === 0) g.set(x, y, C.CROWN_LIT);
                    else g.set(x, y, C.CROWN_MID);
                } else {
                    g.set(x, y, C.CROWN_MID);
                }
            }
        }
    }
    for (let y = 15; y <= 21; y++) {
        const span = 1 - (y - 14) / 7;
        const minX = Math.round(16 - 8 * span);
        const maxX = Math.round(17 + 6 * span);
        const midX = Math.round(16 + 1 * span);
        for (let x = minX; x <= maxX; x++) {
            if (x < midX) g.set(x, y, C.PAVILION_SOUTH);
            else if (x === midX) g.set(x, y, C.PAVILION_DEEP);
            else g.set(x, y, C.PAVILION_EAST);
        }
    }
    g.set(16, 21, C.SILHOUETTE);
    g.set(17, 21, C.SILHOUETTE);
    g.addSelectiveOutline(C.SILHOUETTE);
    return g;
}

// ----------------------------------------------------
// SAVE & EXPORT
// ----------------------------------------------------

const BATCH2 = [
    {
        id: 'ore_copper',
        name: 'Copper ore',
        groundGen: buildCopperOreGround,
        iconGen: buildCopperOreIcon
    },
    {
        id: 'gold',
        name: 'Gold nugget',
        groundGen: buildGoldGround,
        iconGen: buildGoldIcon
    },
    {
        id: 'gem_rough',
        name: 'Rough gem',
        groundGen: buildGemRoughGround,
        iconGen: buildGemRoughIcon
    },
    {
        id: 'gem_cut',
        name: 'Cut gem',
        groundGen: buildGemCutGround,
        iconGen: buildGemCutIcon
    }
];

for (const item of BATCH2) {
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

console.log('\nAll Batch 2 items synthesized and exported successfully.');
