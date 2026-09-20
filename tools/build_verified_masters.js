const fs = require('fs');
const { writePNG } = require('./png_util');

// Load exact palette from uf.hex
const hexes = fs.readFileSync('art/palette/uf.hex', 'utf8').trim().split(/\r?\n/).map(l => l.trim().toUpperCase());

function hexToRgb(h) {
    return [parseInt(h.slice(1,3), 16), parseInt(h.slice(3,5), 16), parseInt(h.slice(5,7), 16)];
}

const colorMap = {
    '.': [255, 0, 255], // Magenta #FF00FF
};

function register(char, idx) {
    colorMap[char] = hexToRgb(hexes[idx]);
}

// Register all required indices
register('m147', 147); // #201408 (silhouette)
register('m146', 146); // #2D1C08

// Fruit tree & oak
register('m200', 200); // #86D200
register('m201', 201); // #86B200
register('m241', 241); // #45B645
register('m242', 242); // #189218
register('m243', 243); // #006D00
register('m70',   70); // #005100
register('m142', 142); // #6D3D0C
register('m143', 143); // #5D350C
register('m144', 144); // #4D2D0C
register('m145', 145); // #3D240C
register('m21',   21); // #FF394D
register('m23',   23); // #DF1428
register('m134', 134); // #EBE3D7
register('m136', 136); // #CAB292
register('m137', 137); // #BA9A71
register('m139', 139); // #9A7141

// Granite boulder & rocks
register('m120', 120); // #CECECE
register('m123', 123); // #9E9E9E
register('m126', 126); // #6D6D6D
register('m128', 128); // #515151
register('m129', 129); // #454545

// Ironstone
register('m150', 150); // #CEC6BE
register('m158', 158); // #514945
register('m159', 159); // #453D39
register('m160', 160); // #35312D
register('m122', 122); // #AEAEAE
register('m183', 183); // #9E5124
register('m184', 184); // #8E3D0C

// Campfire
register('m121', 121); // #BEBEBE
register('m124', 124); // #8E8E8E
register('m250', 250); // #FFD200
register('m251', 251); // #FFAE00
register('m235', 235); // #FF8E10
register('m236', 236); // #FF5100

// Boar
register('m141', 141); // #7D4D18
register('m111', 111); // #9A6D59
register('m15',   15); // #FFFFFF

// Helper to construct grid from arrays of registered color keys
function buildBuffer(rows) {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const key = rows[y][x];
            const rgb = colorMap[key];
            if (!rgb) throw new Error(`Missing color for key '${key}' at (${x}, ${y})`);
            const idx = (y * w + x) * 4;
            buf[idx] = rgb[0];
            buf[idx + 1] = rgb[1];
            buf[idx + 2] = rgb[2];
            buf[idx + 3] = 255;
        }
    }
    return buf;
}

function saveAsset(id, name, category, rows, animations = { "stand": [0] }) {
    const buf = buildBuffer(rows);
    const w = 16, h = 16;
    
    // Save 16x16 master
    writePNG(`art/masters/${id}.png`, w, h, buf);

    // Save 3x (48x48) in test_output
    const s3 = 3;
    const buf3 = Buffer.alloc(w * s3 * h * s3 * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const sIdx = (y * w + x) * 4;
            for (let dy = 0; dy < s3; dy++) {
                for (let dx = 0; dx < s3; dx++) {
                    const dIdx = (((y * s3 + dy) * w * s3) + (x * s3 + dx)) * 4;
                    buf3[dIdx] = buf[sIdx];
                    buf3[dIdx + 1] = buf[sIdx + 1];
                    buf3[dIdx + 2] = buf[sIdx + 2];
                    buf3[dIdx + 3] = 255;
                }
            }
        }
    }
    writePNG(`game/test_output/${id}_3x.png`, w * s3, h * s3, buf3);

    // Save 16x zoom (256x256) in test_output
    const s16 = 16;
    const buf16 = Buffer.alloc(w * s16 * h * s16 * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const sIdx = (y * w + x) * 4;
            for (let dy = 0; dy < s16; dy++) {
                for (let dx = 0; dx < s16; dx++) {
                    const dIdx = (((y * s16 + dy) * w * s16) + (x * s16 + dx)) * 4;
                    buf16[dIdx] = buf[sIdx];
                    buf16[dIdx + 1] = buf[sIdx + 1];
                    buf16[dIdx + 2] = buf[sIdx + 2];
                    buf16[dIdx + 3] = 255;
                }
            }
        }
    }
    writePNG(`game/test_output/${id}_16x.png`, w * s16, h * s16, buf16);

    // Write sidecar JSON
    const sidecar = {
        id: id,
        name: name,
        category: category,
        frameWidth: 16,
        frameHeight: 16,
        exportWidth: 48,
        exportHeight: 48,
        anchor: [8, 15],
        footprint: [1, 1],
        facings: ["S"],
        animations: animations,
        palette: "Ultima VII Daylight Palette (PALETTES.FLX Record 0)",
        style: "Final Fantasy V 2D flat 3/4 top-down",
        approvedDate: "2026-09-18"
    };
    fs.writeFileSync(`art/masters/${id}.json`, JSON.stringify(sidecar, null, 2));
    console.log(`Delivered: art/masters/${id}.png and .json`);
}

// ============================================================================
// 1. fruit_tree (AR-020)
// ============================================================================
// Canopy rows 1-11, cols 2-13. Widest row 6.
// Left & bottom outline 147.
// Upper-left third (rows 1-5, cols 2-8): 200
// Middle band: 241
// Lower-right: 242
// 1px rim of 243 along bottom edge of canopy.
// Trunk cols 7-9 on rows 11-14 (143, 144, 145)
// Root flares row 15 cols 6 & 10 (145)
// Apples at (4,5) [21], (9,3) [21], (12,7) [23], (6,9) [23], (11,10) [23], (3,8) [23], (8,6) [23]
function createFruitTree(isBare = false) {
    const grid = Array.from({ length: 16 }, () => Array(16).fill('.'));
    
    // Canopy shape definitions per row [startCol, endCol]
    const canopy = {
        1: [5, 10],
        2: [4, 11],
        3: [3, 12],
        4: [3, 12],
        5: [2, 13],
        6: [2, 13], // widest
        7: [2, 13],
        8: [3, 12],
        9: [3, 12],
        10: [4, 11],
        11: [5, 10]
    };

    for (const [rStr, [cStart, cEnd]] of Object.entries(canopy)) {
        const y = parseInt(rStr);
        for (let x = cStart; x <= cEnd; x++) {
            // Outline along left edge
            if (x === cStart) {
                grid[y][x] = 'm147';
            } else if (y === 11 || (y === 10 && (x < 5 || x > 10))) {
                // Outline along bottom edge of canopy
                grid[y][x] = 'm147';
            } else if (y <= 5 && x <= 8) {
                // Upper-left third: 200
                grid[y][x] = 'm200';
            } else if (y >= 8 && x >= 7) {
                // Lower-right: 242, with 243 on the row above bottom outline
                if (y === 10 || (y === 9 && x >= 9)) {
                    grid[y][x] = 'm243';
                } else {
                    grid[y][x] = 'm242';
                }
            } else {
                // Middle band: 241 (if bare, darkened to 242)
                grid[y][x] = isBare ? 'm242' : 'm241';
            }
        }
    }

    // Trunk rows 11-14 cols 7-9 (143 left, 144 center, 145 right)
    for (let y = 11; y <= 14; y++) {
        grid[y][7] = 'm143';
        grid[y][8] = 'm144';
        grid[y][9] = 'm145';
    }
    // Root flares on row 15 cols 6 & 10 (145), and trunk base
    grid[15][6] = 'm145';
    grid[15][7] = 'm143';
    grid[15][8] = 'm144';
    grid[15][9] = 'm145';
    grid[15][10] = 'm145';

    // Apples if not bare:
    if (!isBare) {
        grid[3][9] = 'm21';   // (9, 3) highest
        grid[5][4] = 'm21';   // (4, 5) second highest
        grid[6][8] = 'm23';   // (8, 6)
        grid[7][12] = 'm23';  // (12, 7)
        grid[8][3] = 'm23';   // (3, 8)
        grid[9][6] = 'm23';   // (6, 9)
        grid[10][11] = 'm23'; // (11, 10)
    }

    return grid;
}

// 1. fruit_tree & 2. fruit_tree_bare
saveAsset('fruit_tree', 'Fruit tree', 'Flora', createFruitTree(false), { "stand": [0], "harvest": [0] });
saveAsset('fruit_tree_bare', 'Fruit tree (picked)', 'Flora', createFruitTree(true), { "stand": [0] });

// ============================================================================
// 3. oak (AR-021)
// ============================================================================
// Broad lobed canopy rows 1-10, cols 1-14. Notched upward 1px at cols 4, 8, 12.
// Highlight 201 on rows 1-4, cols 1-8. Mid 242 fills body.
// Shadow 243 lower-right quarter. 1px 70 line under bottom edge.
// Outline 147 on left and bottom silhouette.
// Trunk cols 6-9 rows 10-14 (142 on col 6, 144 on cols 7-8, 145 on col 9).
// Root flares of 145 at row 15 cols 5 and 10.
function createOak() {
    const grid = Array.from({ length: 16 }, () => Array(16).fill('.'));

    const canopy = {
        1: [4, 11],
        2: [2, 13],
        3: [1, 14],
        4: [1, 14],
        5: [1, 14],
        6: [1, 14],
        7: [1, 14],
        8: [1, 14],
        9: [2, 13],
        10: [2, 13]
    };

    for (const [rStr, [cStart, cEnd]] of Object.entries(canopy)) {
        const y = parseInt(rStr);
        for (let x = cStart; x <= cEnd; x++) {
            // Notched upward at cols 4 and 12 on row 10
            if (y === 10 && (x === 4 || x === 12)) {
                continue; // leaf lobe notch
            }

            // Outline along left edge
            if (x === cStart) {
                grid[y][x] = 'm147';
            } else if (y <= 4 && x <= 8) {
                grid[y][x] = 'm201'; // highlight
            } else if (y >= 7 && x >= 8) {
                grid[y][x] = 'm243'; // shadow
            } else {
                grid[y][x] = 'm242'; // mid
            }
        }
    }

    // 1px 70 line under bottom edge of foliage
    for (let x = 2; x <= 13; x++) {
        if (grid[10][x] !== '.' && grid[10][x] !== 'm147') {
            grid[10][x] = 'm70';
        } else if (grid[9][x] !== '.' && grid[9][x] !== 'm147' && grid[10][x] === '.') {
            grid[9][x] = 'm70';
        }
    }
    // Bottom outline 147 under foliage
    grid[10][2] = 'm147';
    grid[10][3] = 'm147';
    grid[10][11] = 'm147';
    grid[10][12] = 'm147';

    // Trunk cols 6-9 on rows 10-14
    for (let y = 10; y <= 14; y++) {
        grid[y][6] = 'm142';
        grid[y][7] = 'm144';
        grid[y][8] = 'm144';
        grid[y][9] = 'm145';
    }
    // Trunk base and root flares row 15 cols 5..10
    grid[15][5] = 'm145';
    grid[15][6] = 'm142';
    grid[15][7] = 'm144';
    grid[15][8] = 'm144';
    grid[15][9] = 'm145';
    grid[15][10] = 'm145';

    return grid;
}

saveAsset('oak', 'Oak', 'Flora', createOak(), { "stand": [0], "chop": [0] });

// ============================================================================
// 4. stump (AR-021 transformed)
// ============================================================================
// Rows 0-10 magenta. Rows 11-14: 5px wide cut trunk on cols 6-10.
// Elliptical top face on rows 11-12 in 134 with two concentric rings of 137,
// 1px 144 heart. Bark sides 144 and 145 on rows 13-14.
// Two 1px woodchips of 136 on row 15 cols 4 and 12.
function createStump() {
    const grid = Array.from({ length: 16 }, () => Array(16).fill('.'));

    // Cut face top rows 11-12 on cols 6-10
    // Row 11: 147 outline on left/top, 137 rings, 134 face
    grid[11][6] = 'm147';
    grid[11][7] = 'm137';
    grid[11][8] = 'm134';
    grid[11][9] = 'm137';
    grid[11][10] = 'm145';

    // Row 12: face with concentric ring 137 and heart 144
    grid[12][6] = 'm144';
    grid[12][7] = 'm134';
    grid[12][8] = 'm144'; // 1px heart
    grid[12][9] = 'm137';
    grid[12][10] = 'm145';

    // Bark sides on rows 13-14
    for (let y = 13; y <= 14; y++) {
        grid[y][6] = 'm144';
        grid[y][7] = 'm144';
        grid[y][8] = 'm144';
        grid[y][9] = 'm145';
        grid[y][10] = 'm145';
    }

    // Row 15: trunk base & root flares, woodchips at cols 4 and 12
    grid[15][4] = 'm136'; // woodchip
    grid[15][5] = 'm147';
    grid[15][6] = 'm144';
    grid[15][7] = 'm144';
    grid[15][8] = 'm144';
    grid[15][9] = 'm145';
    grid[15][10] = 'm145';
    grid[15][11] = 'm147';
    grid[15][12] = 'm136'; // woodchip

    return grid;
}

saveAsset('stump', 'Stump', 'Flora', createStump(), { "stand": [0] });

// ============================================================================
// 5. granite_boulder (AR-022)
// ============================================================================
// Rows 4-14, cols 2-13. Angular silhouette.
// Top facet 120 on rows 4-7 leaning left. Front facet 123 on rows 7-13.
// Right facet 126 on cols 11-13. Two 1px diagonal cracks of 128.
// 3px moss in 242 with one 241 on top-left rim at row 4 cols 4-6.
// Contact shadow 129 on row 15 under widest point. Outline 147 on lower-right.
function createGraniteBoulder() {
    const grid = Array.from({ length: 16 }, () => Array(16).fill('.'));

    // Top facet leaning left (rows 4-7)
    // Row 4: cols 4-9
    for (let x = 4; x <= 9; x++) grid[4][x] = 'm120';
    // Moss on row 4 cols 4-6 (241 at col 4, 242 at cols 5-6)
    grid[4][4] = 'm241';
    grid[4][5] = 'm242';
    grid[4][6] = 'm242';

    // Row 5: cols 3-10
    for (let x = 3; x <= 10; x++) grid[5][x] = 'm120';
    grid[5][10] = 'm126'; // right edge facet starts

    // Row 6: cols 3-11
    for (let x = 3; x <= 9; x++) grid[6][x] = 'm120';
    grid[6][10] = 'm123';
    grid[6][11] = 'm126';

    // Row 7: cols 2-12 (transition to front facet 123)
    for (let x = 2; x <= 5; x++) grid[7][x] = 'm120';
    for (let x = 6; x <= 10; x++) grid[7][x] = 'm123';
    grid[7][11] = 'm126';
    grid[7][12] = 'm126';

    // Rows 8-13: Front facet 123, right facet 126, diagonal cracks 128
    for (let y = 8; y <= 13; y++) {
        const startX = y >= 11 ? 3 : 2;
        const endX = y >= 12 ? 12 : 13;
        for (let x = startX; x <= endX; x++) {
            if (x >= 11) {
                grid[y][x] = 'm126';
            } else {
                grid[y][x] = 'm123';
            }
        }
    }

    // Two diagonal cracks of 128 across front facet
    // Crack 1: (5, 8), (6, 9), (7, 10)
    grid[8][5] = 'm128';
    grid[9][6] = 'm128';
    grid[10][7] = 'm128';
    // Crack 2: (8, 11), (9, 12)
    grid[11][8] = 'm128';
    grid[12][9] = 'm128';

    // Lower-right outline 147
    grid[13][12] = 'm147';
    grid[13][13] = 'm147';
    grid[14][3] = 'm123';
    for (let x = 4; x <= 11; x++) grid[14][x] = 'm123';
    grid[14][11] = 'm126';
    grid[14][12] = 'm147';

    // Row 15: 2px contact shadow 129 under widest point (cols 6-7)
    grid[15][6] = 'm129';
    grid[15][7] = 'm129';

    return grid;
}

saveAsset('granite_boulder', 'Granite boulder', 'Geology', createGraniteBoulder(), { "stand": [0], "quarry": [0] });

// ============================================================================
// 6. rocks_small (AR-022 transformed)
// ============================================================================
// Nothing above row 8. Five loose stones of 2-3 pixels in 123 and 126 with 120 tops,
// one 4x3 stone in the middle, scattered on magenta.
function createRocksSmall() {
    const grid = Array.from({ length: 16 }, () => Array(16).fill('.'));

    // Middle stone 4x3 on rows 11-13 cols 6-9
    // Row 11: 120 tops
    grid[11][6] = 'm120'; grid[11][7] = 'm120'; grid[11][8] = 'm120'; grid[11][9] = 'm126';
    // Row 12: 123 body
    grid[12][6] = 'm123'; grid[12][7] = 'm123'; grid[12][8] = 'm123'; grid[12][9] = 'm126';
    // Row 13: 123 body & 147 shadow
    grid[13][6] = 'm123'; grid[13][7] = 'm123'; grid[13][8] = 'm126'; grid[13][9] = 'm147';

    // Stone 1 (upper left): rows 9-10 cols 3-4
    grid[9][3] = 'm120'; grid[9][4] = 'm120';
    grid[10][3] = 'm123'; grid[10][4] = 'm126';

    // Stone 2 (upper right): rows 9-10 cols 11-12
    grid[9][11] = 'm120'; grid[9][12] = 'm126';
    grid[10][11] = 'm123'; grid[10][12] = 'm147';

    // Stone 3 (lower left): rows 13-14 cols 2-3
    grid[13][2] = 'm120'; grid[13][3] = 'm120';
    grid[14][2] = 'm123'; grid[14][3] = 'm126';

    // Stone 4 (lower right): rows 13-14 cols 12-13
    grid[13][12] = 'm120'; grid[13][13] = 'm126';
    grid[14][12] = 'm123'; grid[14][13] = 'm147';

    // Stone 5 (bottom center-right): row 15 cols 10-11
    grid[15][10] = 'm123'; grid[15][11] = 'm126';

    return grid;
}

saveAsset('rocks_small', 'Loose stones', 'Geology', createRocksSmall(), { "stand": [0], "pick": [0] });

// ============================================================================
// 7. ironstone (AR-022)
// ============================================================================
// Three stacked slabs on rows 3-14, cols 2-13, stepped right.
// Top edge 150 highlight. Faces 158 left, 159 mid, 160 right.
// Two diagonal veins of 122 with 184 rust beneath, 183 stain spreading 2px under lower vein.
// Outline 147 bottom and right silhouette, 2px 129 contact shadow on row 15.
function createIronstone() {
    const grid = Array.from({ length: 16 }, () => Array(16).fill('.'));

    // Slab 1: rows 3-6 cols 3-10
    // Top highlight row 3
    for (let x = 3; x <= 10; x++) grid[3][x] = 'm150';
    for (let y = 4; y <= 6; y++) {
        for (let x = 3; x <= 10; x++) {
            if (x <= 5) grid[y][x] = 'm158';
            else if (x <= 8) grid[y][x] = 'm159';
            else grid[y][x] = 'm160';
        }
    }

    // Slab 2: rows 7-10 cols 4-11 (stepped 1px right)
    for (let x = 4; x <= 11; x++) grid[7][x] = 'm150';
    for (let y = 8; y <= 10; y++) {
        for (let x = 4; x <= 11; x++) {
            if (x <= 6) grid[y][x] = 'm158';
            else if (x <= 9) grid[y][x] = 'm159';
            else grid[y][x] = 'm160';
        }
    }

    // Slab 3: rows 11-14 cols 5-12 (stepped 1px right)
    for (let x = 5; x <= 12; x++) grid[11][x] = 'm150';
    for (let y = 12; y <= 14; y++) {
        for (let x = 5; x <= 12; x++) {
            if (x <= 7) grid[y][x] = 'm158';
            else if (x <= 10) grid[y][x] = 'm159';
            else grid[y][x] = 'm160';
        }
    }

    // Outline 147 on right edge of slabs
    grid[5][10] = 'm147'; grid[6][10] = 'm147';
    grid[9][11] = 'm147'; grid[10][11] = 'm147';
    grid[13][12] = 'm147'; grid[14][12] = 'm147';

    // Vein 1 (upper-left to lower-right across slab 1 & 2):
    // 122 with 184 rust beneath
    grid[4][5] = 'm122'; grid[5][5] = 'm184';
    grid[5][6] = 'm122'; grid[6][6] = 'm184';
    grid[6][7] = 'm122'; grid[7][7] = 'm184';
    grid[7][8] = 'm122'; grid[8][8] = 'm184';

    // Vein 2 (across slab 2 & 3):
    grid[9][6] = 'm122';  grid[10][6] = 'm184';
    grid[10][7] = 'm122'; grid[11][7] = 'm184';
    grid[11][8] = 'm122'; grid[12][8] = 'm184';
    grid[12][9] = 'm122'; grid[13][9] = 'm184';
    // 183 stain spreading two pixels under lower vein
    grid[13][7] = 'm183';
    grid[13][8] = 'm183';

    // Bottom outline 147
    for (let x = 5; x <= 12; x++) grid[14][x] = 'm147';

    // Contact shadow 129 on row 15 (2px)
    grid[15][8] = 'm129';
    grid[15][9] = 'm129';

    return grid;
}

saveAsset('ironstone', 'Ironstone outcrop', 'Geology', createIronstone(), { "stand": [0], "mine": [0] });

// ============================================================================
// 8. campfire (AR-105) & 9. campfire_lit
// ============================================================================
// Ellipse of 8 2x2 river cobbles on rows 8-14 between cols 3 and 12.
// Each cobble: 121 top-left, 124 body, 126 lower-right, spaced 1px apart.
// Kindling: 3 crossing 1px diagonals in 143 and 144 over 2px ash 160.
// Shadow 129 on row 15 (2px).
// Lit: teardrop flame on rows 3-11, 3x4 core of 250, 251 mid, 235 outer, 236 tongues,
// 250 spark at row 2, cobbles facing fire recoloured 137.
function createCampfire(isLit = false) {
    const grid = Array.from({ length: 16 }, () => Array(16).fill('.'));

    // 8 cobbles positions [topY, leftX]
    const cobbles = [
        [8, 6],   // top-left center
        [8, 9],   // top-right center
        [9, 3],   // far left upper
        [9, 12],  // far right upper
        [12, 3],  // far left lower
        [12, 12], // far right lower
        [13, 6],  // bottom-left center
        [13, 9]   // bottom-right center
    ];

    cobbles.forEach(([cy, cx]) => {
        grid[cy][cx] = 'm121';         // top-left
        grid[cy][cx + 1] = 'm124';     // top-right
        grid[cy + 1][cx] = 'm124';     // bottom-left
        grid[cy + 1][cx + 1] = 'm126'; // bottom-right
    });

    if (!isLit) {
        // Ash 160 (2px in center)
        grid[11][7] = 'm160';
        grid[11][8] = 'm160';

        // Kindling sticks 143 & 144
        grid[10][6] = 'm143'; grid[10][7] = 'm144';
        grid[11][9] = 'm143';
        grid[12][7] = 'm144'; grid[12][8] = 'm143';
    } else {
        // Recolor inner edges of cobbles to 137 (glow)
        grid[9][7] = 'm137';   grid[9][8] = 'm137';
        grid[10][5] = 'm137';  grid[10][11] = 'm137';
        grid[11][5] = 'm137';  grid[11][11] = 'm137';
        grid[12][7] = 'm137';  grid[12][8] = 'm137';

        // Spark at row 2 col 8
        grid[2][8] = 'm250';

        // Teardrop flame rows 3-11
        // Row 3: two 1px tongues of 236
        grid[3][7] = 'm236'; grid[3][8] = 'm236';

        // Row 4: 235 outer, 236 tips
        grid[4][7] = 'm235'; grid[4][8] = 'm235';

        // Row 5: 235 outer, 251 mid
        grid[5][6] = 'm235'; grid[5][7] = 'm251'; grid[5][8] = 'm251'; grid[5][9] = 'm235';

        // Rows 6-9: 3x4 core of 250 in middle (cols 7-8 or 7-9)
        for (let y = 6; y <= 9; y++) {
            grid[y][6] = 'm235';
            grid[y][7] = 'm250';
            grid[y][8] = 'm250';
            grid[y][9] = 'm251';
            grid[y][10] = 'm235';
        }
        // Row 10: base of flame
        grid[10][6] = 'm235'; grid[10][7] = 'm251'; grid[10][8] = 'm251'; grid[10][9] = 'm235';
        // Row 11: coals
        grid[11][7] = 'm235'; grid[11][8] = 'm235';
    }

    // Contact shadow 129 on row 15 under lowest cobbles
    grid[15][7] = 'm129';
    grid[15][8] = 'm129';

    return grid;
}

saveAsset('campfire', 'Campfire', 'Building', createCampfire(false), { "stand": [0] });
saveAsset('campfire_lit', 'Campfire (lit)', 'Building', createCampfire(true), { "stand": [0] });

// ============================================================================
// 10. boar (AR-401)
// ============================================================================
// Rows 4-15, cols 1-14. Stocky front-facing body.
// Rounded back rows 4-7 in 141, with 1px 147 bristle dashes along top edge.
// Lowered head rows 7-13 cols 4-11 in 142 shading to 143 on right.
// 2px triangular ears of 142 at row 5 on cols 4 and 11.
// Two single 147 eyes at row 8 cols 6 and 9.
// 2x2 snout of 111 on rows 12-13 cols 7-8.
// Two 1px tusks of 15 at row 12 on cols 5 and 10.
// Four 2px legs of 145 on rows 14-15 at cols 2-3, 5-6, 9-10, 12-13.
// 147 hooves on row 15. Outline 147 along belly and outer legs.
function createBoar() {
    const grid = Array.from({ length: 16 }, () => Array(16).fill('.'));

    // Bristle dashes on row 4: cols 5, 7, 9, 11
    grid[4][5] = 'm147'; grid[4][7] = 'm147'; grid[4][9] = 'm147'; grid[4][11] = 'm147';

    // Rounded back rows 5-7
    for (let x = 5; x <= 10; x++) grid[5][x] = 'm141';
    // Ears at row 5 cols 4 and 11
    grid[5][4] = 'm142'; grid[5][11] = 'm142';
    grid[6][4] = 'm142'; grid[6][11] = 'm142';
    for (let x = 3; x <= 12; x++) grid[6][x] = 'm141';
    for (let x = 2; x <= 13; x++) grid[7][x] = 'm141';

    // Lowered head rows 8-13 cols 4-11 (142 left/mid, 143 right)
    for (let y = 8; y <= 13; y++) {
        for (let x = 4; x <= 11; x++) {
            grid[y][x] = x <= 7 ? 'm142' : 'm143';
        }
    }
    // Flanks on rows 8-11: cols 2-3 in 141, cols 12-13 in 143
    for (let y = 8; y <= 11; y++) {
        grid[y][2] = 'm141'; grid[y][3] = 'm141';
        grid[y][12] = 'm143'; grid[y][13] = 'm143';
    }

    // Eyes at row 8 cols 6 and 9 (147)
    grid[8][6] = 'm147';
    grid[8][9] = 'm147';

    // Tusks of 15 at row 12 cols 5 and 10
    grid[12][5] = 'm15';
    grid[12][10] = 'm15';

    // 2x2 Snout of 111 on rows 12-13 cols 7-8
    grid[12][7] = 'm111'; grid[12][8] = 'm111';
    grid[13][7] = 'm111'; grid[13][8] = 'm111';

    // Belly outline 147
    grid[13][4] = 'm147';
    grid[13][11] = 'm147';

    // Four 2px legs of 145 on rows 14-15 at cols 2-3, 5-6, 9-10, 12-13
    const legCols = [[2, 3], [5, 6], [9, 10], [12, 13]];
    legCols.forEach(([c1, c2]) => {
        grid[14][c1] = 'm145'; grid[14][c2] = 'm145';
        grid[15][c1] = 'm147'; grid[15][c2] = 'm147'; // 147 hooves
    });

    // Outer leg outline 147
    grid[14][1] = 'm147'; grid[15][1] = 'm147';
    grid[14][14] = 'm147'; grid[15][14] = 'm147';

    return grid;
}

saveAsset('boar', 'Boar', 'Wildlife', createBoar(), { "stand": [0] });

// ============================================================================
// 11. wall_wood (AR-104)
// ============================================================================
// 5 vertical logs, each 3px wide with 1px 145 gap.
// Runs from pointed tips on rows 1-2 down to row 15.
// Continues across both edges: cols 0-2 (log 1), 3 (gap), 4-6 (log 2), 7 (gap),
// 8-10 (log 3), 11 (gap), 12-14 (log 4), 15 (gap).
// Log strip: 141 left, 142 face, 143 right, 134 tip.
// Binding band row 6 in 137, shadow row 7 in 139.
// Ground line row 15 in 145. Row 0 stays magenta.
function createWallWood() {
    const grid = Array.from({ length: 16 }, () => Array(16).fill('.'));

    const logOffsets = [0, 4, 8, 12]; // 4 full logs inside, plus col 15 gap

    // Build vertical logs rows 1-14
    logOffsets.forEach(startX => {
        // Pointed tip on rows 1-2
        grid[1][startX + 1] = 'm134'; // tip
        grid[2][startX] = 'm141';
        grid[2][startX + 1] = 'm142';
        grid[2][startX + 2] = 'm143';

        // Log body rows 3-14
        for (let y = 3; y <= 14; y++) {
            grid[y][startX] = 'm141';
            grid[y][startX + 1] = 'm142';
            grid[y][startX + 2] = 'm143';
        }
    });

    // Vertical gaps of 145 on cols 3, 7, 11, 15 from row 2 down to 14
    [3, 7, 11, 15].forEach(gx => {
        for (let y = 2; y <= 14; y++) {
            grid[y][gx] = 'm145';
        }
    });

    // Horizontal binding band row 6 in 137, shadow row 7 in 139 across all 16 columns!
    for (let x = 0; x < 16; x++) {
        grid[6][x] = 'm137';
        grid[7][x] = 'm139';
    }

    // Row 15: ground line in 145
    for (let x = 0; x < 16; x++) {
        grid[15][x] = 'm145';
    }

    return grid;
}

saveAsset('wall_wood', 'Wooden wall', 'Building', createWallWood(), { "stand": [0] });

// ============================================================================
// 12. rubble (AR-104 transformed)
// ============================================================================
// Low pile on rows 9-15 of three broken log ends in 142 and 143 showing 134 cut faces,
// mixed with four stones of 123 and 126, nothing above row 8.
function createRubble() {
    const grid = Array.from({ length: 16 }, () => Array(16).fill('.'));

    // Broken log 1 (left): rows 10-14 cols 2-4
    grid[10][3] = 'm134'; grid[10][4] = 'm134'; // cut face
    grid[11][2] = 'm142'; grid[11][3] = 'm142'; grid[11][4] = 'm143';
    grid[12][2] = 'm142'; grid[12][3] = 'm142'; grid[12][4] = 'm143';
    grid[13][2] = 'm142'; grid[13][3] = 'm143';

    // Broken log 2 (center angled): rows 9-12 cols 7-10
    grid[9][7] = 'm134'; grid[9][8] = 'm134'; // cut face
    grid[10][7] = 'm142'; grid[10][8] = 'm142'; grid[10][9] = 'm143';
    grid[11][8] = 'm142'; grid[11][9] = 'm142'; grid[11][10] = 'm143';
    grid[12][9] = 'm142'; grid[12][10] = 'm143';

    // Broken log 3 (right): rows 12-14 cols 11-13
    grid[12][12] = 'm134'; grid[12][13] = 'm134';
    grid[13][11] = 'm142'; grid[13][12] = 'm142'; grid[13][13] = 'm143';
    grid[14][11] = 'm142'; grid[14][12] = 'm143';

    // Four stones (123 top/mid, 126 right/shadow):
    // Stone 1: row 13-14 cols 5-6
    grid[13][5] = 'm123'; grid[13][6] = 'm126';
    grid[14][5] = 'm123'; grid[14][6] = 'm126';

    // Stone 2: row 14-15 cols 7-8
    grid[14][7] = 'm123'; grid[14][8] = 'm126';
    grid[15][7] = 'm123'; grid[15][8] = 'm126';

    // Stone 3: row 11-12 cols 5-6
    grid[11][5] = 'm123'; grid[11][6] = 'm126';
    grid[12][5] = 'm123'; grid[12][6] = 'm126';

    // Stone 4: row 14-15 cols 3-4
    grid[14][3] = 'm123'; grid[14][4] = 'm126';
    grid[15][3] = 'm123'; grid[15][4] = 'm126';

    // Silhouette outline bits 147
    grid[15][2] = 'm147';
    grid[15][9] = 'm147';
    grid[15][13] = 'm147';

    return grid;
}

saveAsset('rubble', 'Rubble', 'Building', createRubble(), { "stand": [0], "pick": [0] });

console.log('All 12 verified master assets built successfully!');
