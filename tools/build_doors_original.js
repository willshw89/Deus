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

// Common palette definitions
const OUTLINE_DARK   = pal.snap(32, 20, 8);      // #201408
const CONTACT_GROUND = pal.snap(69, 69, 69);     // #454545
const IRON_HIGHLIGHT = pal.snap(190, 190, 190);  // #bebebe
const IRON_BODY      = pal.snap(109, 109, 109);  // #6d6d6d
const IRON_DARK      = pal.snap(53, 49, 45);     // #35312d
const SHADOW_INTERIOR= pal.snap(24, 20, 18);     // #181412

// Timber palette (matching wall_wood)
const WOOD_HIGHLIGHT = pal.snap(174, 101, 61);   // #ae653d
const WOOD_LIGHT     = pal.snap(138, 93, 45);    // #8a5d2d
const WOOD_MID       = pal.snap(109, 77, 61);    // #6d4d3d
const WOOD_SHADOW    = pal.snap(85, 61, 49);     // #553d31
const WOOD_DARK      = pal.snap(61, 45, 36);     // #3d2d24
const WOOD_DEEP      = pal.snap(45, 28, 12);     // #2d1c08

// Stone palette (matching wall_stone)
const STONE_HIGHLIGHT = pal.snap(206, 206, 206); // #cecece
const STONE_CAPSTONE  = pal.snap(190, 190, 190); // #bebebe
const STONE_LIGHT     = pal.snap(158, 158, 158); // #9e9e9e
const STONE_MID       = pal.snap(142, 142, 142); // #8e8e8e
const STONE_SHADOW    = pal.snap(109, 109, 109); // #6d6d6d
const STONE_DARK      = pal.snap(81, 81, 81);    // #515151
const STONE_DEEP      = pal.snap(69, 69, 69);    // #454545

// -------------------------------------------------------------
// 1. GENERATE WOODEN DOOR (door_wood)
// -------------------------------------------------------------
console.log('Generating door_wood (144x192 RMMZ single character sheet)...');
// 3 columns x 4 rows of 48x48 frames
// col 0: closed, col 1: ajar, col 2: open
// row 0: Down (front), row 1: Left, row 2: Right, row 3: Up (rear)
const woodSheet = Array.from({ length: 192 }, () => Array(144).fill(null));

function drawWoodFrame(grid, ox, oy, facingRow) {
    // Sturdy timber doorway frame: left jamb cols 5..9, right jamb cols 38..42, lintel rows 4..9
    // Threshold on rows 46..47
    for (let y = 4; y <= 47; y++) {
        for (let x = 5; x <= 9; x++) {
            // Left jamb
            if (x === 5 || y === 4) grid[oy + y][ox + x] = OUTLINE_DARK;
            else if (x === 6) grid[oy + y][ox + x] = WOOD_HIGHLIGHT;
            else if (x <= 8) grid[oy + y][ox + x] = WOOD_LIGHT;
            else grid[oy + y][ox + x] = WOOD_MID;
        }
        for (let x = 38; x <= 42; x++) {
            // Right jamb
            if (x === 42 || y === 4) grid[oy + y][ox + x] = OUTLINE_DARK;
            else if (x <= 40) grid[oy + y][ox + x] = WOOD_MID;
            else grid[oy + y][ox + x] = WOOD_SHADOW;
        }
    }
    // Lintel header (rows 4..9, cols 5..42)
    for (let y = 4; y <= 9; y++) {
        for (let x = 5; x <= 42; x++) {
            if (y === 4 || x === 5 || x === 42) grid[oy + y][ox + x] = OUTLINE_DARK;
            else if (y === 5) grid[oy + y][ox + x] = WOOD_HIGHLIGHT;
            else if (y <= 7) grid[oy + y][ox + x] = WOOD_LIGHT;
            else grid[oy + y][ox + x] = WOOD_MID;
        }
    }
    // Threshold on rows 46..47
    for (let x = 5; x <= 42; x++) {
        grid[oy + 46][ox + x] = WOOD_DARK;
        grid[oy + 47][ox + x] = CONTACT_GROUND;
    }
}

function drawWoodDoorClosed(grid, ox, oy, isRear = false) {
    drawWoodFrame(grid, ox, oy);
    // Door panel fills cols 10..37, rows 10..45
    for (let y = 10; y <= 45; y++) {
        for (let x = 10; x <= 37; x++) {
            // Vertical plank grooves every 7 px (cols 16, 23, 30)
            const isGroove = (x === 16 || x === 23 || x === 30 || x === 10 || x === 37);
            if (isGroove) {
                grid[oy + y][ox + x] = WOOD_DEEP;
            } else if (x === 11 || x === 17 || x === 24 || x === 31) {
                // Plank left highlight
                grid[oy + y][ox + x] = WOOD_HIGHLIGHT;
            } else if (x === 15 || x === 22 || x === 29 || x === 36) {
                // Plank right shadow
                grid[oy + y][ox + x] = WOOD_MID;
            } else {
                grid[oy + y][ox + x] = WOOD_LIGHT;
            }
        }
    }

    if (!isRear) {
        // Front face: 2 heavy horizontal iron strap hinges with stud rivets
        [17, 36].forEach(hy => {
            for (let y = hy; y <= hy + 2; y++) {
                for (let x = 8; x <= 34; x++) {
                    if (y === hy) grid[oy + y][ox + x] = IRON_HIGHLIGHT;
                    else if (y === hy + 2) grid[oy + y][ox + x] = OUTLINE_DARK;
                    else grid[oy + y][ox + x] = IRON_BODY;
                }
            }
            // Rivet studs
            [12, 20, 28, 33].forEach(rx => {
                grid[oy + hy + 1][ox + rx] = IRON_HIGHLIGHT;
            });
        });
        // Heavy iron latch / ring pull on right side (col 32..34, rows 26..29)
        grid[oy + 26][ox + 33] = IRON_HIGHLIGHT;
        grid[oy + 27][ox + 32] = IRON_BODY;
        grid[oy + 27][ox + 34] = IRON_BODY;
        grid[oy + 28][ox + 33] = IRON_DARK;
        grid[oy + 29][ox + 33] = OUTLINE_DARK;
    } else {
        // Rear face: diagonal timber Z-brace (battens)
        // Top and bottom horizontal ledges
        [15, 16, 38, 39].forEach(by => {
            for (let x = 11; x <= 36; x++) {
                grid[oy + by][ox + x] = (by === 15 || by === 38) ? WOOD_HIGHLIGHT : WOOD_MID;
            }
        });
        // Diagonal cross brace from (11, 16) to (36, 38)
        for (let t = 0; t <= 25; t++) {
            const bx = 11 + t;
            const by = Math.floor(17 + t * (21 / 25));
            grid[oy + by][ox + bx] = WOOD_HIGHLIGHT;
            grid[oy + by + 1][ox + bx] = WOOD_MID;
        }
    }
}

function drawWoodDoorAjar(grid, ox, oy) {
    drawWoodFrame(grid, ox, oy);
    // Dark interior shadow opening on right side (cols 24..37, rows 10..45)
    for (let y = 10; y <= 45; y++) {
        for (let x = 24; x <= 37; x++) {
            const depth = Math.floor((37 - x) / 2);
            grid[oy + y][ox + x] = (y > 42) ? WOOD_DARK : (depth < 2 ? SHADOW_INTERIOR : OUTLINE_DARK);
        }
    }
    // Angled door panel swung open (cols 10..23, rows 10..45)
    for (let y = 10; y <= 45; y++) {
        for (let x = 10; x <= 23; x++) {
            if (x === 10 || x === 23) {
                grid[oy + y][ox + x] = WOOD_DEEP;
            } else if (x === 11) {
                grid[oy + y][ox + x] = WOOD_HIGHLIGHT;
            } else if (x < 17) {
                grid[oy + y][ox + x] = WOOD_LIGHT;
            } else {
                grid[oy + y][ox + x] = WOOD_MID;
            }
        }
    }
    // Iron hinge visible at left edge
    [17, 36].forEach(hy => {
        for (let x = 8; x <= 14; x++) {
            grid[oy + hy][ox + x] = IRON_HIGHLIGHT;
            grid[oy + hy + 1][ox + x] = IRON_BODY;
        }
    });
}

function drawWoodDoorOpen(grid, ox, oy) {
    drawWoodFrame(grid, ox, oy);
    // Door fully open: visible wooden floorboards through doorway opening (cols 14..37, rows 10..45)
    for (let y = 10; y <= 45; y++) {
        for (let x = 14; x <= 37; x++) {
            if (y < 20) {
                // Interior ambient shadow under lintel
                grid[oy + y][ox + x] = (y < 14) ? SHADOW_INTERIOR : WOOD_DARK;
            } else {
                // Interior plank floor visible through doorway
                const isPlank = (y % 6 === 0);
                if (isPlank) grid[oy + y][ox + x] = WOOD_DARK;
                else if (y % 6 === 1) grid[oy + y][ox + x] = WOOD_LIGHT;
                else grid[oy + y][ox + x] = WOOD_MID;
            }
        }
    }
    // Door slab folded flat against the left jamb (cols 10..13, rows 10..45)
    for (let y = 10; y <= 45; y++) {
        grid[oy + y][ox + 10] = WOOD_DEEP;
        grid[oy + y][ox + 11] = WOOD_HIGHLIGHT;
        grid[oy + y][ox + 12] = WOOD_LIGHT;
        grid[oy + y][ox + 13] = OUTLINE_DARK;
    }
    // Exposed iron hinge pins on left jamb
    [17, 36].forEach(hy => {
        grid[oy + hy][ox + 9] = IRON_HIGHLIGHT;
        grid[oy + hy + 1][ox + 9] = IRON_BODY;
        grid[oy + hy + 2][ox + 9] = OUTLINE_DARK;
    });
}

// Assemble all 4 rows for wood door
for (let r = 0; r < 4; r++) {
    const oy = r * 48;
    const isRear = (r === 3);
    drawWoodDoorClosed(woodSheet, 0, oy, isRear);
    drawWoodDoorAjar(woodSheet, 48, oy);
    drawWoodDoorOpen(woodSheet, 96, oy);
}

// Write door_wood PNGs
const woodBuf = Buffer.alloc(144 * 192 * 4);
for (let y = 0; y < 192; y++) {
    for (let x = 0; x < 144; x++) {
        const o = (y * 144 + x) * 4;
        const c = woodSheet[y][x];
        if (c) {
            woodBuf[o] = c[0]; woodBuf[o + 1] = c[1]; woodBuf[o + 2] = c[2]; woodBuf[o + 3] = 255;
        } else {
            woodBuf[o] = 255; woodBuf[o + 1] = 0; woodBuf[o + 2] = 255; woodBuf[o + 3] = 0;
        }
    }
}

const woodMasterPng = path.join(ROOT, 'art', 'masters', 'door_wood.png');
writePNG(woodMasterPng, 144, 192, woodBuf);

const woodSidecar = {
    id: "door_wood",
    name: "Wooden Door",
    category: "Building",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S", "W", "E", "N"],
    animations: { "stand": [0] },
    states: { "closed": 0, "ajar": 1, "open": 2 }
};
fs.writeFileSync(path.join(ROOT, 'art', 'masters', 'door_wood.json'), JSON.stringify(woodSidecar, null, 2));

// Export to RMMZ characters
const woodRmmzPng = path.join(ROOT, 'game', 'img', 'characters', '!$UF_Door_Wood.png');
writePNG(woodRmmzPng, 144, 192, woodBuf);
fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Door_Wood.json'), JSON.stringify(woodSidecar, null, 2));

// Raw 4x canvas on #FF00FF (576x768)
const woodRawBuf = Buffer.alloc(576 * 768 * 4);
for (let y = 0; y < 768; y++) {
    const sy = Math.floor(y / 4);
    for (let x = 0; x < 576; x++) {
        const sx = Math.floor(x / 4);
        const so = (sy * 144 + sx) * 4;
        const dof = (y * 576 + x) * 4;
        if (woodBuf[so + 3] === 255) {
            woodRawBuf[dof] = woodBuf[so]; woodRawBuf[dof + 1] = woodBuf[so + 1]; woodRawBuf[dof + 2] = woodBuf[so + 2]; woodRawBuf[dof + 3] = 255;
        } else {
            woodRawBuf[dof] = 255; woodRawBuf[dof + 1] = 0; woodRawBuf[dof + 2] = 255; woodRawBuf[dof + 3] = 255;
        }
    }
}
writePNG(path.join(ROOT, 'art', 'raw', 'door_wood.png'), 576, 768, woodRawBuf);

// Review 3 states at 4x scale (576x192)
const woodRevBuf = Buffer.alloc(576 * 192 * 4);
for (let y = 0; y < 192; y++) {
    const sy = Math.floor(y / 4);
    for (let x = 0; x < 576; x++) {
        const sx = Math.floor(x / 4);
        const so = (sy * 144 + sx) * 4;
        const dof = (y * 576 + x) * 4;
        if (woodBuf[so + 3] === 255) {
            woodRevBuf[dof] = woodBuf[so]; woodRevBuf[dof + 1] = woodBuf[so + 1]; woodRevBuf[dof + 2] = woodBuf[so + 2]; woodRevBuf[dof + 3] = 255;
        } else {
            woodRevBuf[dof] = 255; woodRevBuf[dof + 1] = 0; woodRevBuf[dof + 2] = 255; woodRevBuf[dof + 3] = 255;
        }
    }
}
writePNG(path.join(ROOT, 'art', 'review', 'door_wood_states_4x.png'), 576, 192, woodRevBuf);
console.log('Saved door_wood deliverables.');

// -------------------------------------------------------------
// 2. GENERATE STONE DOOR (door_stone)
// -------------------------------------------------------------
console.log('Generating door_stone (144x192 RMMZ single character sheet)...');
// Stone door in heavy stone masonry architrave frame
const stoneSheet = Array.from({ length: 192 }, () => Array(144).fill(null));

function drawStoneFrame(grid, ox, oy) {
    // Dressed ashlar stone archway frame: left jamb cols 4..9, right jamb cols 38..43, architrave header rows 3..9
    for (let y = 3; y <= 47; y++) {
        // Ashlar block courses every 9 px
        const course = Math.floor((y - 3) / 9);
        const isJointY = ((y - 3) % 9 === 0);

        for (let x = 4; x <= 9; x++) {
            if (x === 4 || isJointY || y === 3) grid[oy + y][ox + x] = OUTLINE_DARK;
            else if (x === 5 || (y - 3) % 9 === 1) grid[oy + y][ox + x] = STONE_HIGHLIGHT;
            else if (x <= 7) grid[oy + y][ox + x] = STONE_LIGHT;
            else grid[oy + y][ox + x] = STONE_MID;
        }
        for (let x = 38; x <= 43; x++) {
            if (x === 43 || isJointY || y === 3) grid[oy + y][ox + x] = OUTLINE_DARK;
            else if (x <= 40) grid[oy + y][ox + x] = STONE_MID;
            else grid[oy + y][ox + x] = STONE_SHADOW;
        }
    }
    // Heavy keystone lintel header on rows 3..9
    for (let y = 3; y <= 9; y++) {
        for (let x = 4; x <= 43; x++) {
            const isKeystone = (x >= 21 && x <= 26);
            if (y === 3 || x === 4 || x === 43) grid[oy + y][ox + x] = OUTLINE_DARK;
            else if (y === 4) grid[oy + y][ox + x] = STONE_HIGHLIGHT;
            else if (isKeystone) grid[oy + y][ox + x] = (y === 5) ? STONE_HIGHLIGHT : STONE_CAPSTONE;
            else if (y <= 7) grid[oy + y][ox + x] = STONE_LIGHT;
            else grid[oy + y][ox + x] = STONE_MID;
        }
    }
    // Stone threshold on rows 46..47
    for (let x = 4; x <= 43; x++) {
        grid[oy + 46][ox + x] = STONE_DARK;
        grid[oy + 47][ox + x] = CONTACT_GROUND;
    }
}

function drawStoneDoorClosed(grid, ox, oy) {
    drawStoneFrame(grid, ox, oy);
    // Heavy stone slab door panel: cols 10..37, rows 10..45
    // Features recessed central square stone relief panel and heavy iron stud hardware
    for (let y = 10; y <= 45; y++) {
        for (let x = 10; x <= 37; x++) {
            const isRelief = (x >= 14 && x <= 33 && y >= 14 && y <= 41);
            if (x === 10 || x === 37 || y === 10 || y === 45) {
                grid[oy + y][ox + x] = STONE_DARK;
            } else if (y === 11 || x === 11) {
                grid[oy + y][ox + x] = STONE_HIGHLIGHT;
            } else if (isRelief) {
                // Carved sunken relief panel
                if (x === 14 || y === 14) grid[oy + y][ox + x] = STONE_DARK;
                else if (x === 33 || y === 41) grid[oy + y][ox + x] = STONE_HIGHLIGHT;
                else {
                    const noise = ((x * 19) ^ (y * 23)) & 7;
                    grid[oy + y][ox + x] = (noise === 0) ? STONE_CAPSTONE : (noise < 5 ? STONE_MID : STONE_SHADOW);
                }
            } else {
                grid[oy + y][ox + x] = STONE_LIGHT;
            }
        }
    }

    // Heavy iron reinforcement straps & bronze stud bosses
    [13, 42].forEach(by => {
        for (let x = 10; x <= 37; x++) {
            grid[oy + by][ox + x] = IRON_BODY;
        }
        [12, 18, 24, 30, 35].forEach(sx => {
            grid[oy + by][ox + sx] = IRON_HIGHLIGHT;
        });
    });

    // Heavy forged iron pull ring at center (cols 22..25, rows 26..30)
    grid[oy + 26][ox + 23] = IRON_HIGHLIGHT;
    grid[oy + 26][ox + 24] = IRON_HIGHLIGHT;
    grid[oy + 27][ox + 22] = IRON_BODY;
    grid[oy + 27][ox + 25] = IRON_BODY;
    grid[oy + 28][ox + 22] = IRON_BODY;
    grid[oy + 28][ox + 25] = IRON_BODY;
    grid[oy + 29][ox + 23] = IRON_DARK;
    grid[oy + 29][ox + 24] = IRON_DARK;
    grid[oy + 30][ox + 23] = OUTLINE_DARK;
}

function drawStoneDoorAjar(grid, ox, oy) {
    drawStoneFrame(grid, ox, oy);
    // Dark interior doorway opening on right (cols 24..37, rows 10..45)
    for (let y = 10; y <= 45; y++) {
        for (let x = 24; x <= 37; x++) {
            grid[oy + y][ox + x] = (y >= 43) ? STONE_DARK : SHADOW_INTERIOR;
        }
    }
    // Heavy stone slab swung inward at angle (cols 10..23, rows 10..45)
    for (let y = 10; y <= 45; y++) {
        for (let x = 10; x <= 23; x++) {
            if (x === 10 || x === 23) {
                grid[oy + y][ox + x] = STONE_DARK;
            } else if (x === 11) {
                grid[oy + y][ox + x] = STONE_HIGHLIGHT;
            } else if (x < 17) {
                grid[oy + y][ox + x] = STONE_LIGHT;
            } else {
                grid[oy + y][ox + x] = STONE_SHADOW;
            }
        }
    }
    // Massive iron pivot hinge socket at top and bottom of left jamb
    [12, 42].forEach(hy => {
        grid[oy + hy][ox + 8] = IRON_HIGHLIGHT;
        grid[oy + hy + 1][ox + 8] = IRON_BODY;
    });
}

function drawStoneDoorOpen(grid, ox, oy) {
    drawStoneFrame(grid, ox, oy);
    // Fully clear open stone portal opening (cols 14..37, rows 10..45)
    for (let y = 10; y <= 45; y++) {
        for (let x = 14; x <= 37; x++) {
            grid[oy + y][ox + x] = (y >= 43) ? STONE_DARK : SHADOW_INTERIOR;
        }
    }
    // Stone slab resting flat against left wall recess (cols 10..13, rows 10..45)
    for (let y = 10; y <= 45; y++) {
        grid[oy + y][ox + 10] = STONE_DARK;
        grid[oy + y][ox + 11] = STONE_HIGHLIGHT;
        grid[oy + y][ox + 12] = STONE_LIGHT;
        grid[oy + y][ox + 13] = OUTLINE_DARK;
    }
    // Pivot hinge fixtures on left jamb
    [12, 42].forEach(hy => {
        grid[oy + hy][ox + 9] = IRON_HIGHLIGHT;
        grid[oy + hy + 1][ox + 9] = IRON_BODY;
        grid[oy + hy + 2][ox + 9] = OUTLINE_DARK;
    });
}

// Assemble all 4 rows for stone door
for (let r = 0; r < 4; r++) {
    const oy = r * 48;
    drawStoneDoorClosed(stoneSheet, 0, oy);
    drawStoneDoorAjar(stoneSheet, 48, oy);
    drawStoneDoorOpen(stoneSheet, 96, oy);
}

// Write door_stone PNGs
const stoneBuf = Buffer.alloc(144 * 192 * 4);
for (let y = 0; y < 192; y++) {
    for (let x = 0; x < 144; x++) {
        const o = (y * 144 + x) * 4;
        const c = stoneSheet[y][x];
        if (c) {
            stoneBuf[o] = c[0]; stoneBuf[o + 1] = c[1]; stoneBuf[o + 2] = c[2]; stoneBuf[o + 3] = 255;
        } else {
            stoneBuf[o] = 255; stoneBuf[o + 1] = 0; stoneBuf[o + 2] = 255; stoneBuf[o + 3] = 0;
        }
    }
}

const stoneMasterPng = path.join(ROOT, 'art', 'masters', 'door_stone.png');
writePNG(stoneMasterPng, 144, 192, stoneBuf);

const stoneSidecar = {
    id: "door_stone",
    name: "Stone Door",
    category: "Building",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S", "W", "E", "N"],
    animations: { "stand": [0] },
    states: { "closed": 0, "ajar": 1, "open": 2 }
};
fs.writeFileSync(path.join(ROOT, 'art', 'masters', 'door_stone.json'), JSON.stringify(stoneSidecar, null, 2));

// Export to RMMZ characters
const stoneRmmzPng = path.join(ROOT, 'game', 'img', 'characters', '!$UF_Door_Stone.png');
writePNG(stoneRmmzPng, 144, 192, stoneBuf);
fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Door_Stone.json'), JSON.stringify(stoneSidecar, null, 2));

// Raw 4x canvas on #FF00FF (576x768)
const stoneRawBuf = Buffer.alloc(576 * 768 * 4);
for (let y = 0; y < 768; y++) {
    const sy = Math.floor(y / 4);
    for (let x = 0; x < 576; x++) {
        const sx = Math.floor(x / 4);
        const so = (sy * 144 + sx) * 4;
        const dof = (y * 576 + x) * 4;
        if (stoneBuf[so + 3] === 255) {
            stoneRawBuf[dof] = stoneBuf[so]; stoneRawBuf[dof + 1] = stoneBuf[so + 1]; stoneRawBuf[dof + 2] = stoneBuf[so + 2]; stoneRawBuf[dof + 3] = 255;
        } else {
            stoneRawBuf[dof] = 255; stoneRawBuf[dof + 1] = 0; stoneRawBuf[dof + 2] = 255; stoneRawBuf[dof + 3] = 255;
        }
    }
}
writePNG(path.join(ROOT, 'art', 'raw', 'door_stone.png'), 576, 768, stoneRawBuf);

// Review 3 states at 4x scale (576x192)
const stoneRevBuf = Buffer.alloc(576 * 192 * 4);
for (let y = 0; y < 192; y++) {
    const sy = Math.floor(y / 4);
    for (let x = 0; x < 576; x++) {
        const sx = Math.floor(x / 4);
        const so = (sy * 144 + sx) * 4;
        const dof = (y * 576 + x) * 4;
        if (stoneBuf[so + 3] === 255) {
            stoneRevBuf[dof] = stoneBuf[so]; stoneRevBuf[dof + 1] = stoneBuf[so + 1]; stoneRevBuf[dof + 2] = stoneBuf[so + 2]; stoneRevBuf[dof + 3] = 255;
        } else {
            stoneRevBuf[dof] = 255; stoneRevBuf[dof + 1] = 0; stoneRevBuf[dof + 2] = 255; stoneRevBuf[dof + 3] = 255;
        }
    }
}
writePNG(path.join(ROOT, 'art', 'review', 'door_stone_states_4x.png'), 576, 192, stoneRevBuf);
console.log('Saved door_stone deliverables.');
