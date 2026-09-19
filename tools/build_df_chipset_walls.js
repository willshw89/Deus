const fs = require('fs');
const path = require('path');
const { writePNG } = require('./png_util.js');

// Parse palette hex
const hexLines = fs.readFileSync('art/palette/uf.hex', 'utf8').split('\n');
const palette = [];
for (const line of hexLines) {
    const s = line.trim().replace(/^#/, '');
    if (s.length === 6) {
        palette.push([
            parseInt(s.substring(0, 2), 16),
            parseInt(s.substring(2, 4), 16),
            parseInt(s.substring(4, 6), 16)
        ]);
    }
}

function nearest(r, g, b) {
    let bestDist = Infinity;
    let best = palette[0];
    for (let i = 0; i < palette.length; i++) {
        const dr = r - palette[i][0];
        const dg = g - palette[i][1];
        const db = b - palette[i][2];
        const d = dr * dr + dg * dg + db * db;
        if (d < bestDist) {
            bestDist = d;
            best = palette[i];
        }
    }
    return best;
}

// Stone colors (clean ashlar blocks)
const STONE = {
    hi: nearest(225, 225, 225),       // #DFDFDF
    light: nearest(190, 190, 190),    // #BEBEBE
    mid: nearest(160, 160, 160),      // #9E9E9E
    shade: nearest(125, 125, 125),    // #7D7D7D
    dark: nearest(81, 81, 81),        // #515151
    mortar: nearest(40, 40, 40),      // #242424
    out: nearest(24, 24, 24)          // #181818
};

// Wood colors (warm timber planks/logs)
const WOOD = {
    hi: nearest(220, 202, 178),       // #DBCAB2
    light: nearest(186, 154, 113),    // #BA9A71
    mid: nearest(154, 113, 65),       // #9A7141
    shade: nearest(125, 77, 24),      // #7D4D18
    dark: nearest(77, 45, 12),        // #4D2D0C
    seam: nearest(45, 28, 8),         // #2D1C08
    out: nearest(32, 20, 8)           // #201408
};

function createTileBuffer(w = 48, h = 48) {
    return Buffer.alloc(w * h * 4);
}

function setPx(buf, w, x, y, col, a = 255) {
    if (x < 0 || x >= w || y < 0 || y >= (buf.length / (w * 4))) return;
    const idx = (y * w + x) * 4;
    buf[idx] = col[0];
    buf[idx + 1] = col[1];
    buf[idx + 2] = col[2];
    buf[idx + 3] = a;
}

function getPx(buf, w, x, y) {
    if (x < 0 || x >= w || y < 0 || y >= (buf.length / (w * 4))) return [0, 0, 0, 0];
    const idx = (y * w + x) * 4;
    return [buf[idx], buf[idx + 1], buf[idx + 2], buf[idx + 3]];
}

// -------------------------------------------------------------
// Base Wall Textures: Stone and Wood
// -------------------------------------------------------------

function generateStoneBase() {
    const horiz = createTileBuffer(48, 48);

    // 1. Top Cap (y = 0..15)
    for (let y = 0; y <= 15; y++) {
        for (let x = 0; x < 48; x++) {
            if (y === 0) {
                setPx(horiz, 48, x, y, STONE.hi);
            } else if (y === 15) {
                setPx(horiz, 48, x, y, STONE.dark);
            } else {
                // Vertical coping stone joint at x=24
                const isJoint = (x === 24);
                if (isJoint) {
                    setPx(horiz, 48, x, y, STONE.mortar);
                } else {
                    const h = (x * 31 + y * 19) % 7;
                    if (y === 1) setPx(horiz, 48, x, y, STONE.hi);
                    else if (h === 0) setPx(horiz, 48, x, y, STONE.light);
                    else if (h === 6) setPx(horiz, 48, x, y, STONE.shade);
                    else setPx(horiz, 48, x, y, STONE.mid);
                }
            }
        }
    }

    // 2. Front Face (y = 16..47) - 3 courses of Ashlar masonry
    const courses = [
        { y0: 16, y1: 25, joints: [0, 24] },
        { y0: 26, y1: 35, joints: [12, 36] },
        { y0: 36, y1: 46, joints: [0, 24] }
    ];

    for (const c of courses) {
        for (let y = c.y0; y <= c.y1; y++) {
            for (let x = 0; x < 48; x++) {
                const isVertJoint = c.joints.some(j => x === j || (j === 0 && x === 47));
                if (isVertJoint) {
                    setPx(horiz, 48, x, y, STONE.mortar);
                } else if (y === c.y0) {
                    setPx(horiz, 48, x, y, STONE.light);
                } else if (y === c.y1) {
                    setPx(horiz, 48, x, y, STONE.dark);
                } else {
                    const d = (x * 13 + y * 29) % 11;
                    if (d === 0) setPx(horiz, 48, x, y, STONE.light);
                    else if (d >= 9) setPx(horiz, 48, x, y, STONE.shade);
                    else setPx(horiz, 48, x, y, STONE.mid);
                }
            }
        }
    }

    // Mortar lines
    for (let x = 0; x < 48; x++) {
        setPx(horiz, 48, x, 25, STONE.mortar);
        setPx(horiz, 48, x, 35, STONE.mortar);
        setPx(horiz, 48, x, 47, STONE.out); // Base ground shadow
    }

    return horiz;
}

function generateWoodBase() {
    const horiz = createTileBuffer(48, 48);

    // 1. Top Cap (y = 0..15)
    for (let y = 0; y <= 15; y++) {
        for (let x = 0; x < 48; x++) {
            if (y === 0) {
                setPx(horiz, 48, x, y, WOOD.hi);
            } else if (y === 15) {
                setPx(horiz, 48, x, y, WOOD.dark);
            } else {
                const grain = (y % 4 === 0) || ((x + y * 3) % 9 === 0);
                if (y === 1) setPx(horiz, 48, x, y, WOOD.light);
                else if (grain) setPx(horiz, 48, x, y, WOOD.shade);
                else setPx(horiz, 48, x, y, WOOD.mid);
            }
        }
    }

    // 2. Front Face (y = 16..47) - 3 horizontal timber planks
    const planks = [
        { y0: 16, y1: 25 },
        { y0: 26, y1: 35 },
        { y0: 36, y1: 46 }
    ];

    for (const p of planks) {
        for (let y = p.y0; y <= p.y1; y++) {
            for (let x = 0; x < 48; x++) {
                if (y === p.y0) {
                    setPx(horiz, 48, x, y, WOOD.hi);
                } else if (y === p.y0 + 1) {
                    setPx(horiz, 48, x, y, WOOD.light);
                } else if (y === p.y1) {
                    setPx(horiz, 48, x, y, WOOD.dark);
                } else {
                    const g = ((y - p.y0) === 4 && (x % 6 !== 0)) || ((x * 7 + y * 3) % 13 === 0);
                    if (g) setPx(horiz, 48, x, y, WOOD.shade);
                    else setPx(horiz, 48, x, y, WOOD.mid);
                }

                // Timber peg / bolt details
                if ((x === 12 || x === 36) && (y === p.y0 + 4)) {
                    setPx(horiz, 48, x, y, WOOD.seam);
                }
            }
        }
    }

    // Seam grooves between planks
    for (let x = 0; x < 48; x++) {
        setPx(horiz, 48, x, 25, WOOD.seam);
        setPx(horiz, 48, x, 35, WOOD.seam);
        setPx(horiz, 48, x, 47, WOOD.out);
    }

    return horiz;
}

// -------------------------------------------------------------
// Sheet Construction
// -------------------------------------------------------------

function buildWallSet(type) {
    const isStone = type === 'stone';
    const C = isStone ? STONE : WOOD;
    const baseHoriz = isStone ? generateStoneBase() : generateWoodBase();

    const fw = 48, fh = 48;
    const sheet = Buffer.alloc(fw * 4 * fh * 5 * 4); // 192 x 240
    const frames = [];
    for (let i = 0; i < 20; i++) frames.push(createTileBuffer(fw, fh));

    const X_LEFT = 10;
    const X_RIGHT = 37;

    // Draw vertical wall column with staggered block courses
    function drawVerticalColumn(f, y0 = 0, y1 = 47, hasLeftBorder = true, hasRightBorder = true) {
        for (let y = y0; y <= y1; y++) {
            if (hasLeftBorder) {
                setPx(f, fw, X_LEFT, y, C.out);
                setPx(f, fw, X_LEFT + 1, y, C.hi);
            }
            const bodyStart = hasLeftBorder ? X_LEFT + 2 : X_LEFT;
            const bodyEnd = hasRightBorder ? X_RIGHT - 3 : X_RIGHT;

            // Horizontal course line every 12px
            const isHorizJoint = (y % 12 === 11);
            // Staggered vertical joint
            const courseIdx = Math.floor(y / 12);
            const vertJointX = (courseIdx % 2 === 0) ? (X_LEFT + 12) : (X_LEFT + 18);

            for (let x = bodyStart; x <= bodyEnd; x++) {
                if (isHorizJoint) {
                    setPx(f, fw, x, y, isStone ? C.mortar : C.seam);
                } else if (isStone && x === vertJointX) {
                    setPx(f, fw, x, y, C.mortar);
                } else if (y % 12 === 0) {
                    setPx(f, fw, x, y, C.light);
                } else {
                    const h = (x * 11 + y * 23) % 9;
                    if (h === 0) setPx(f, fw, x, y, C.light);
                    else if (h >= 7) setPx(f, fw, x, y, C.shade);
                    else setPx(f, fw, x, y, C.mid);
                }
            }

            if (hasRightBorder) {
                // Depth shadow (right side)
                for (let x = X_RIGHT - 2; x <= X_RIGHT - 1; x++) {
                    setPx(f, fw, x, y, C.dark);
                }
                setPx(f, fw, X_RIGHT, y, C.out);
            }
        }
    }

    function copyRect(src, dst, sx, sy, dx, dy, w, h) {
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const px = getPx(src, fw, sx + x, sy + y);
                setPx(dst, fw, dx + x, dy + y, [px[0], px[1], px[2]], px[3]);
            }
        }
    }

    // Frame 10: Horizontal Run (North wall: East + West)
    copyRect(baseHoriz, frames[10], 0, 0, 0, 0, 48, 48);

    // Frame 16: South Horizontal Run (South wall: East + West)
    copyRect(baseHoriz, frames[16], 0, 0, 0, 0, 48, 48);

    // Frame 5: Vertical Wall Run (North + South)
    drawVerticalColumn(frames[5], 0, 47, true, true);

    // Frame 0: Isolated Post
    drawVerticalColumn(frames[0], 0, 47, true, true);
    for (let x = X_LEFT; x <= X_RIGHT; x++) {
        setPx(frames[0], fw, x, 0, C.out);
        setPx(frames[0], fw, x, 47, C.out);
    }

    // Frame 1: North only
    drawVerticalColumn(frames[1], 0, 47, true, true);
    for (let x = X_LEFT; x <= X_RIGHT; x++) setPx(frames[1], fw, x, 47, C.out);

    // Frame 4: South only
    drawVerticalColumn(frames[4], 0, 47, true, true);
    for (let x = X_LEFT; x <= X_RIGHT; x++) setPx(frames[4], fw, x, 0, C.out);

    // Frame 8: West connection only (East end-cap on north wall)
    copyRect(baseHoriz, frames[8], 0, 0, 0, 0, X_RIGHT, 48);
    for (let y = 0; y < 48; y++) setPx(frames[8], fw, X_RIGHT, y, C.out);

    // Frame 18: South Wall East end-cap
    copyRect(frames[8], frames[18], 0, 0, 0, 0, 48, 48);

    // Frame 2: East connection only (West end-cap on north wall)
    copyRect(baseHoriz, frames[2], X_LEFT, 0, X_LEFT, 0, 48 - X_LEFT, 48);
    for (let y = 0; y < 48; y++) setPx(frames[2], fw, X_LEFT, y, C.out);

    // Frame 19: South Wall West end-cap
    copyRect(frames[2], frames[19], 0, 0, 0, 0, 48, 48);

    // Frame 6: NW Corner (connects East & South)
    // Horizontal face covers x >= X_LEFT, y = 0..47
    copyRect(baseHoriz, frames[6], X_LEFT, 0, X_LEFT, 0, 48 - X_LEFT, 48);
    // Vertical wall continues south below front face (or seamless blend)
    // Left outer wall border
    for (let y = 0; y < 48; y++) {
        setPx(frames[6], fw, X_LEFT, y, C.out);
        setPx(frames[6], fw, X_LEFT + 1, y, C.hi);
    }
    // Top-left corner pixel
    setPx(frames[6], fw, X_LEFT, 0, C.out);

    // Frame 12: NE Corner (connects West & South)
    // Horizontal face covers x <= X_RIGHT, y = 0..47
    copyRect(baseHoriz, frames[12], 0, 0, 0, 0, X_RIGHT + 1, 48);
    // Right outer wall border & depth shadow
    for (let y = 0; y < 48; y++) {
        setPx(frames[12], fw, X_RIGHT - 2, y, C.dark);
        setPx(frames[12], fw, X_RIGHT - 1, y, C.dark);
        setPx(frames[12], fw, X_RIGHT, y, C.out);
    }
    setPx(frames[12], fw, X_RIGHT, 0, C.out);

    // Frame 3: SW Corner (connects North & East)
    copyRect(baseHoriz, frames[3], X_LEFT, 0, X_LEFT, 0, 48 - X_LEFT, 48);
    // Left outer border
    for (let y = 0; y < 48; y++) {
        setPx(frames[3], fw, X_LEFT, y, C.out);
        setPx(frames[3], fw, X_LEFT + 1, y, C.hi);
    }
    for (let x = X_LEFT; x < 48; x++) setPx(frames[3], fw, x, 47, C.out);

    // Frame 9: SE Corner (connects North & West)
    copyRect(baseHoriz, frames[9], 0, 0, 0, 0, X_RIGHT + 1, 48);
    // Right outer border
    for (let y = 0; y < 48; y++) {
        setPx(frames[9], fw, X_RIGHT - 2, y, C.dark);
        setPx(frames[9], fw, X_RIGHT - 1, y, C.dark);
        setPx(frames[9], fw, X_RIGHT, y, C.out);
    }
    for (let x = 0; x <= X_RIGHT; x++) setPx(frames[9], fw, x, 47, C.out);

    // Frame 7: T-Junction East (N + E + S)
    drawVerticalColumn(frames[7], 0, 47, true, false);
    copyRect(baseHoriz, frames[7], X_RIGHT, 0, X_RIGHT, 0, 48 - X_RIGHT, 48);

    // Frame 13: T-Junction West (N + S + W)
    drawVerticalColumn(frames[13], 0, 47, false, true);
    copyRect(baseHoriz, frames[13], 0, 0, 0, 0, X_LEFT, 48);

    // Frame 14: T-Junction South (E + S + W)
    copyRect(baseHoriz, frames[14], 0, 0, 0, 0, 48, 48);
    drawVerticalColumn(frames[14], 16, 47, true, true);

    // Frame 11: T-Junction North (N + E + W)
    copyRect(baseHoriz, frames[11], 0, 0, 0, 0, 48, 48);
    drawVerticalColumn(frames[11], 0, 16, true, true);

    // Frame 15: 4-Way Intersection (N + S + E + W)
    copyRect(baseHoriz, frames[15], 0, 0, 0, 0, 48, 48);
    drawVerticalColumn(frames[15], 0, 47, false, false);

    // Frame 17: (duplicate of 16)
    copyRect(frames[16], frames[17], 0, 0, 0, 0, 48, 48);

    // Assemble into 192x240 buffer
    const sheetW = fw * 4; // 192
    for (let i = 0; i < 20; i++) {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const f = frames[i];
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const px = getPx(f, fw, x, y);
                const sIdx = ((row * fh + y) * sheetW + (col * fw + x)) * 4;
                sheet[sIdx] = px[0];
                sheet[sIdx + 1] = px[1];
                sheet[sIdx + 2] = px[2];
                sheet[sIdx + 3] = px[3];
            }
        }
    }

    return { sheet, frames };
}

// Build both wall sets
const stoneData = buildWallSet('stone');
const woodData = buildWallSet('wood');

// Save both sheets to game/img/characters/
writePNG('game/img/characters/!$WallStone_Set.png', 192, 240, stoneData.sheet);
writePNG('game/img/characters/!$WallWood_Set.png', 192, 240, woodData.sheet);

// Also copy to art/masters/
fs.mkdirSync('art/masters', { recursive: true });
writePNG('art/masters/!$WallStone_Set.png', 192, 240, stoneData.sheet);
writePNG('art/masters/!$WallWood_Set.png', 192, 240, woodData.sheet);

// Render Test Room (6x6 tiles = 288x288)
function renderRoom(frames) {
    const fw = 48, fh = 48;
    const room = Buffer.alloc(6 * fw * 6 * fh * 4);
    const roomW = 6 * fw;

    function stamp(frameIdx, tx, ty) {
        const f = frames[frameIdx];
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const px = getPx(f, fw, x, y);
                if (px[3] > 0) {
                    const idx = ((ty * fh + y) * roomW + (tx * fw + x)) * 4;
                    room[idx] = px[0];
                    room[idx + 1] = px[1];
                    room[idx + 2] = px[2];
                    room[idx + 3] = px[3];
                }
            }
        }
    }

    // Top North Wall: (0,0)=6(NW), (1..4,0)=10(horiz), (5,0)=12(NE)
    stamp(6, 0, 0);
    for (let x = 1; x <= 4; x++) stamp(10, x, 0);
    stamp(12, 5, 0);

    // Side Walls: y=1..4: (0,y)=5(vert), (5,y)=5(vert)
    for (let y = 1; y <= 4; y++) {
        stamp(5, 0, y);
        stamp(5, 5, y);
    }

    // Bottom South Wall: (0,5)=3(SW), (1..2,5)=16(South horiz), (3,5)=Doorway, (4,5)=16, (5,5)=9(SE)
    stamp(3, 0, 5);
    stamp(16, 1, 5);
    stamp(16, 2, 5);
    stamp(16, 4, 5);
    stamp(9, 5, 5);

    return room;
}

const stoneRoom = renderRoom(stoneData.frames);
const woodRoom = renderRoom(woodData.frames);

function scale3x(buf, w, h) {
    const out = Buffer.alloc(w * 3 * h * 3 * 4);
    const outW = w * 3;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const px = getPx(buf, w, x, y);
            for (let dy = 0; dy < 3; dy++) {
                for (let dx = 0; dx < 3; dx++) {
                    const idx = (((y * 3 + dy) * outW) + (x * 3 + dx)) * 4;
                    out[idx] = px[0];
                    out[idx + 1] = px[1];
                    out[idx + 2] = px[2];
                    out[idx + 3] = px[3];
                }
            }
        }
    }
    return out;
}

writePNG('art/review/df_chipset_stone_room_3x.png', 864, 864, scale3x(stoneRoom, 288, 288));
writePNG('art/review/df_chipset_wood_room_3x.png', 864, 864, scale3x(woodRoom, 288, 288));

console.log('Regenerated clean DF/Chipset walls with seamless corners!');
