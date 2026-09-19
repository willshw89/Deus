const fs = require('fs');
const { writePNG } = require('./png_util.js');

// Load palette
const hexLines = fs.readFileSync('art/palette/uf.hex', 'utf8').split(/\r?\n/);
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

const WOOD = {
    hi: nearest(220, 202, 178),
    light: nearest(186, 154, 113),
    mid: nearest(154, 113, 65),
    shade: nearest(125, 77, 24),
    dark: nearest(77, 45, 12),
    seam: nearest(45, 28, 8),
    out: nearest(32, 20, 8),
    iron_hi: nearest(190, 190, 200),
    iron: nearest(90, 90, 100),
    iron_dark: nearest(40, 40, 45)
};

const STONE = {
    hi: nearest(225, 225, 225),
    light: nearest(190, 190, 190),
    mid: nearest(160, 160, 160),
    shade: nearest(125, 125, 125),
    dark: nearest(81, 81, 81),
    mortar: nearest(40, 40, 40),
    out: nearest(24, 24, 24)
};

function createBuf(w, h) { return Buffer.alloc(w * h * 4); }
function setPx(buf, w, h, x, y, col, a = 255) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const idx = (y * w + x) * 4;
    buf[idx] = col[0]; buf[idx + 1] = col[1]; buf[idx + 2] = col[2]; buf[idx + 3] = a;
}
function getPx(buf, w, h, x, y) {
    if (x < 0 || x >= w || y < 0 || y >= h) return [0, 0, 0, 0];
    const idx = (y * w + x) * 4;
    return [buf[idx], buf[idx + 1], buf[idx + 2], buf[idx + 3]];
}

// ----------------------------------------------------------------------------
// Detailed Pixel Art Generators for 48x96 Wall Pieces
// ----------------------------------------------------------------------------

function drawWoodWall(frameIdx) {
    const W = 48, H = 96;
    const buf = createBuf(W, H);

    let mask = frameIdx;
    let isSouth = false;
    if (frameIdx === 16 || frameIdx === 17) { mask = 10; isSouth = true; }
    else if (frameIdx === 18) { mask = 8; isSouth = true; }
    else if (frameIdx === 19) { mask = 2; isSouth = true; }

    const n = (mask & 1) !== 0;
    const e = (mask & 2) !== 0;
    const s = (mask & 4) !== 0;
    const w = (mask & 8) !== 0;

    // Helper: draw vertical timber column / post on x=8..39
    function drawVerticalPost(yStart, yEnd, hasGroundLine) {
        for (let y = yStart; y <= yEnd; y++) {
            for (let x = 8; x <= 39; x++) {
                if (x === 8 || x === 39) {
                    setPx(buf, W, H, x, y, WOOD.out);
                } else if (x === 9) {
                    setPx(buf, W, H, x, y, WOOD.hi);
                } else if (x === 10) {
                    setPx(buf, W, H, x, y, WOOD.light);
                } else if (x === 38) {
                    setPx(buf, W, H, x, y, WOOD.dark);
                } else if (x === 37) {
                    setPx(buf, W, H, x, y, WOOD.shade);
                } else {
                    const isSeam = (x === 18 || x === 29);
                    const isHJoint = (y % 24 === 0 && x > 10 && x < 37);
                    if (isSeam || isHJoint) setPx(buf, W, H, x, y, WOOD.seam);
                    else {
                        const g = ((x * 17 + y * 23) % 9 === 0);
                        setPx(buf, W, H, x, y, g ? WOOD.shade : WOOD.mid);
                    }
                }
            }
        }
        if (hasGroundLine) {
            for (let x = 8; x <= 39; x++) {
                setPx(buf, W, H, x, yEnd - 1, WOOD.dark);
                setPx(buf, W, H, x, yEnd, WOOD.out);
            }
        }
    }

    // Helper: draw iron band across vertical post
    function drawPostIronBand(iy) {
        if (iy >= 0 && iy + 1 < H) {
            for (let x = 9; x <= 38; x++) {
                setPx(buf, W, H, x, iy - 1, WOOD.iron_hi);
                setPx(buf, W, H, x, iy, WOOD.iron);
                setPx(buf, W, H, x, iy + 1, WOOD.iron_dark);
            }
            setPx(buf, W, H, 14, iy, WOOD.iron_hi);
            setPx(buf, W, H, 24, iy, WOOD.iron_hi);
            setPx(buf, W, H, 33, iy, WOOD.iron_hi);
        }
    }

    // A. SOUTH-FACING HORIZONTAL WALL / SILL (Frames 16, 17, 18, 19)
    // On the south side of an enclosure, rows 0..47 are transparent so room interior is visible!
    // Rows 48..55: cutaway top sill
    // Rows 56..95: timber face with iron reinforcement
    if (isSouth) {
        const x1 = w ? 0 : 8;
        const x2 = e ? 47 : 39;
        // Top sill
        for (let y = 48; y <= 55; y++) {
            for (let x = x1; x <= x2; x++) {
                if (y === 48) setPx(buf, W, H, x, y, WOOD.out);
                else if (y === 49) setPx(buf, W, H, x, y, WOOD.hi);
                else setPx(buf, W, H, x, y, (x % 16 === 0) ? WOOD.seam : WOOD.light);
            }
        }
        // Timber face
        for (let y = 56; y <= 95; y++) {
            for (let x = x1; x <= x2; x++) {
                const isSeam = (x % 12 === 0);
                const isGrain = ((x * 17 + y * 23) % 7 === 0);
                if (isSeam) setPx(buf, W, H, x, y, WOOD.seam);
                else if (isGrain) setPx(buf, W, H, x, y, WOOD.shade);
                else setPx(buf, W, H, x, y, WOOD.mid);
            }
        }
        // Iron strap at y=68
        for (let x = x1; x <= x2; x++) {
            setPx(buf, W, H, x, 67, WOOD.iron_hi);
            setPx(buf, W, H, x, 68, WOOD.iron);
            setPx(buf, W, H, x, 69, WOOD.iron_dark);
            if ((x + 6) % 12 === 0) setPx(buf, W, H, x, 68, WOOD.iron_hi);
        }
        if (!w) {
            for (let y = 48; y <= 95; y++) {
                setPx(buf, W, H, x1, y, WOOD.out);
                setPx(buf, W, H, x1 + 1, y, WOOD.hi);
            }
        }
        if (!e) {
            for (let y = 48; y <= 95; y++) {
                setPx(buf, W, H, x2, y, WOOD.out);
                setPx(buf, W, H, x2 - 1, y, WOOD.shade);
            }
        }
        for (let x = x1; x <= x2; x++) {
            setPx(buf, W, H, x, 94, WOOD.dark);
            setPx(buf, W, H, x, 95, WOOD.out);
        }
        return buf;
    }

    // B. VERTICAL WALL COLUMN (Frame 5: N + S)
    if (mask === 5) {
        drawVerticalPost(0, 95, false);
        drawPostIronBand(20);
        drawPostIronBand(68);
        return buf;
    }

    // C. ISOLATED POST (Frame 0)
    if (mask === 0) {
        // Cap (y=16..47)
        for (let y = 16; y <= 47; y++) {
            for (let x = 8; x <= 39; x++) {
                if (y === 16 || x === 8 || x === 39) setPx(buf, W, H, x, y, WOOD.out);
                else if (y === 17 || x === 9) setPx(buf, W, H, x, y, WOOD.hi);
                else if (x === 38 || y === 47) setPx(buf, W, H, x, y, WOOD.shade);
                else setPx(buf, W, H, x, y, WOOD.light);
            }
        }
        // Body (y=48..95)
        drawVerticalPost(48, 95, true);
        drawPostIronBand(36);
        drawPostIronBand(68);
        return buf;
    }

    // D. VERTICAL RUN TERMINATING OR BRANCHING WITH WALL TO NORTH (n === true)
    // When n === true, (x, y-1) ALREADY contains the wall cell above it.
    // If s === true (T-junctions 7, 13, or 4-way 15): rows 0..47 is the vertical post.
    // If s === false (corners SW 3, SE 9, end cap 1, or T-junction 11): rows 0..47 is TRANSPARENT
    // so we never overwrite the wall above or the room interior!
    if (n) {
        if (s) {
            // Continuous vertical column through rows 0..47
            drawVerticalPost(0, 47, false);
            drawPostIronBand(20);
            drawVerticalPost(48, 95, false);
            drawPostIronBand(68);
        } else {
            // s === false: Bottom corner or bottom end of vertical wall
            // Rows 0..47 is transparent!
            // Rows 48..95 has the vertical post terminating at y=95
            drawVerticalPost(48, 95, true);
            drawPostIronBand(68);
        }

        // Horizontal branch connections on rows 48..95:
        if (e) {
            // Branch to East (connects to south sill or horizontal run)
            for (let y = 48; y <= 55; y++) {
                for (let x = 39; x <= 47; x++) {
                    if (y === 48) setPx(buf, W, H, x, y, WOOD.out);
                    else if (y === 49) setPx(buf, W, H, x, y, WOOD.hi);
                    else setPx(buf, W, H, x, y, WOOD.light);
                }
            }
            for (let y = 56; y <= 95; y++) {
                for (let x = 39; x <= 47; x++) {
                    const isSeam = (x % 12 === 0);
                    if (isSeam) setPx(buf, W, H, x, y, WOOD.seam);
                    else setPx(buf, W, H, x, y, WOOD.mid);
                }
            }
            // Iron band continuation
            for (let x = 39; x <= 47; x++) {
                setPx(buf, W, H, x, 67, WOOD.iron_hi);
                setPx(buf, W, H, x, 68, WOOD.iron);
                setPx(buf, W, H, x, 69, WOOD.iron_dark);
            }
            for (let x = 39; x <= 47; x++) {
                setPx(buf, W, H, x, 94, WOOD.dark);
                setPx(buf, W, H, x, 95, WOOD.out);
            }
        }
        if (w) {
            // Branch to West
            for (let y = 48; y <= 55; y++) {
                for (let x = 0; x <= 8; x++) {
                    if (y === 48) setPx(buf, W, H, x, y, WOOD.out);
                    else if (y === 49) setPx(buf, W, H, x, y, WOOD.hi);
                    else setPx(buf, W, H, x, y, WOOD.light);
                }
            }
            for (let y = 56; y <= 95; y++) {
                for (let x = 0; x <= 8; x++) {
                    const isSeam = (x % 12 === 0);
                    if (isSeam) setPx(buf, W, H, x, y, WOOD.seam);
                    else setPx(buf, W, H, x, y, WOOD.mid);
                }
            }
            // Iron band continuation
            for (let x = 0; x <= 8; x++) {
                setPx(buf, W, H, x, 67, WOOD.iron_hi);
                setPx(buf, W, H, x, 68, WOOD.iron);
                setPx(buf, W, H, x, 69, WOOD.iron_dark);
            }
            for (let x = 0; x <= 8; x++) {
                setPx(buf, W, H, x, 94, WOOD.dark);
                setPx(buf, W, H, x, 95, WOOD.out);
            }
        }
        return buf;
    }

    // E. NORTH-FACING RUNS AND CORNERS (n === false)
    // When n === false, there is no wall north, so rows 0..47 is the visual ROOF!
    // Rows 48..95 is the front face.
    const topX1 = w ? 0 : 8;
    const topX2 = e ? 47 : 39;
    const topY1 = 8; // Clean roof margin
    const topY2 = 47;

    // 1. Draw Roof (rows 8..47)
    for (let y = topY1; y <= 47; y++) {
        for (let x = topX1; x <= topX2; x++) {
            const isSeam = (y % 8 === 0) || (x % 16 === 0);
            const isGrain = ((x * 19 + y * 7) % 11 === 0);
            if (isSeam) setPx(buf, W, H, x, y, WOOD.seam);
            else if (isGrain) setPx(buf, W, H, x, y, WOOD.shade);
            else setPx(buf, W, H, x, y, WOOD.light);
        }
    }

    // Roof borders
    for (let x = topX1; x <= topX2; x++) {
        setPx(buf, W, H, x, topY1, WOOD.out);
        setPx(buf, W, H, x, topY1 + 1, WOOD.hi);
    }
    if (!w) {
        for (let y = topY1; y <= 47; y++) {
            setPx(buf, W, H, topX1, y, WOOD.out);
            setPx(buf, W, H, topX1 + 1, y, WOOD.hi);
        }
    }
    if (!e) {
        for (let y = topY1; y <= 47; y++) {
            setPx(buf, W, H, topX2, y, WOOD.out);
            setPx(buf, W, H, topX2 - 1, y, WOOD.shade);
        }
    }

    // 2. Draw Front Face (rows 48..95)
    const faceX1 = w ? 0 : 8;
    const faceX2 = e ? 47 : 39;

    for (let y = 48; y <= 95; y++) {
        for (let x = faceX1; x <= faceX2; x++) {
            const isSeam = (x % 12 === 0);
            const isGrain = ((x * 17 + y * 23) % 7 === 0);
            if (isSeam) setPx(buf, W, H, x, y, WOOD.seam);
            else if (isGrain) setPx(buf, W, H, x, y, WOOD.shade);
            else setPx(buf, W, H, x, y, WOOD.mid);
        }
    }

    // Under-roof shadow line on rows 48 and 49
    for (let x = faceX1; x <= faceX2; x++) {
        setPx(buf, W, H, x, 48, WOOD.dark);
        setPx(buf, W, H, x, 49, WOOD.shade);
    }

    // Horizontal iron reinforcement strap at y=68 (aligned with vertical columns!)
    for (let x = faceX1; x <= faceX2; x++) {
        setPx(buf, W, H, x, 67, WOOD.iron_hi);
        setPx(buf, W, H, x, 68, WOOD.iron);
        setPx(buf, W, H, x, 69, WOOD.iron_dark);
        if ((x + 6) % 12 === 0) setPx(buf, W, H, x, 68, WOOD.iron_hi);
    }

    // If South connects (NW corner 6, NE corner 12, or South T-junction 14):
    // Blend the vertical column into rows 48..95
    if (s) {
        const postX1 = (!w) ? 8 : (e ? 16 : 8);
        const postX2 = (!e) ? 39 : (w ? 31 : 39);
        drawVerticalPost(48, 95, false);
        drawPostIronBand(68);
    }

    // Left and right edges
    if (!w && !s) {
        for (let y = 48; y <= 95; y++) {
            setPx(buf, W, H, faceX1, y, WOOD.out);
            setPx(buf, W, H, faceX1 + 1, y, WOOD.hi);
        }
    }
    if (!e && !s) {
        for (let y = 48; y <= 95; y++) {
            setPx(buf, W, H, faceX2, y, WOOD.out);
            setPx(buf, W, H, faceX2 - 1, y, WOOD.shade);
        }
    }

    // Ground contact line
    for (let x = faceX1; x <= faceX2; x++) {
        setPx(buf, W, H, x, 94, WOOD.dark);
        setPx(buf, W, H, x, 95, WOOD.out);
    }

    return buf;
}

function drawStoneWall(frameIdx) {
    const W = 48, H = 96;
    const buf = createBuf(W, H);

    let mask = frameIdx;
    let isSouth = false;
    if (frameIdx === 16 || frameIdx === 17) { mask = 10; isSouth = true; }
    else if (frameIdx === 18) { mask = 8; isSouth = true; }
    else if (frameIdx === 19) { mask = 2; isSouth = true; }

    const n = (mask & 1) !== 0;
    const e = (mask & 2) !== 0;
    const s = (mask & 4) !== 0;
    const w = (mask & 8) !== 0;

    // Helper: draw vertical stone buttress / column on x=6..41
    function drawVerticalButtress(yStart, yEnd, hasGroundLine) {
        for (let y = yStart; y <= yEnd; y++) {
            const courseY = Math.floor(y / 12);
            const isHJoint = (y % 12 === 0);
            const xOff = (courseY % 2 === 0) ? 0 : 8;
            for (let x = 6; x <= 41; x++) {
                const isVJoint = ((x + xOff) % 16 === 0);
                if (isHJoint || isVJoint) {
                    setPx(buf, W, H, x, y, STONE.mortar);
                } else if (x === 7) {
                    setPx(buf, W, H, x, y, STONE.hi);
                } else if (x === 40) {
                    setPx(buf, W, H, x, y, STONE.shade);
                } else {
                    setPx(buf, W, H, x, y, STONE.mid);
                }
            }
            setPx(buf, W, H, 6, y, STONE.out);
            setPx(buf, W, H, 41, y, STONE.out);
        }
        if (hasGroundLine) {
            for (let x = 6; x <= 41; x++) {
                setPx(buf, W, H, x, yEnd - 1, STONE.dark);
                setPx(buf, W, H, x, yEnd, STONE.out);
            }
        }
    }

    // A. SOUTH-FACING / ENCLOSURE SOUTH WALL (Frames 16, 17, 18, 19)
    if (isSouth) {
        const x1 = w ? 0 : 6;
        const x2 = e ? 47 : 41;
        // Coping sill on rows 48..55
        for (let y = 48; y <= 55; y++) {
            for (let x = x1; x <= x2; x++) {
                if (y === 48) setPx(buf, W, H, x, y, STONE.out);
                else if (y === 49) setPx(buf, W, H, x, y, STONE.hi);
                else setPx(buf, W, H, x, y, (x % 16 === 0) ? STONE.mortar : STONE.light);
            }
        }
        // Ashlar face on rows 56..95
        for (let y = 56; y <= 95; y++) {
            const courseY = Math.floor((y - 56) / 12);
            const isHJoint = ((y - 56) % 12 === 0);
            const xOff = (courseY % 2 === 0) ? 0 : 12;
            for (let x = x1; x <= x2; x++) {
                const isVJoint = ((x + xOff) % 24 === 0);
                if (isHJoint || isVJoint) setPx(buf, W, H, x, y, STONE.mortar);
                else if (y === 56 || y === 68 || y === 80) setPx(buf, W, H, x, y, STONE.hi);
                else setPx(buf, W, H, x, y, STONE.mid);
            }
        }
        if (!w) {
            for (let y = 48; y <= 95; y++) {
                setPx(buf, W, H, x1, y, STONE.out);
                setPx(buf, W, H, x1 + 1, y, STONE.hi);
            }
        }
        if (!e) {
            for (let y = 48; y <= 95; y++) {
                setPx(buf, W, H, x2, y, STONE.out);
                setPx(buf, W, H, x2 - 1, y, STONE.shade);
            }
        }
        for (let x = x1; x <= x2; x++) {
            setPx(buf, W, H, x, 94, STONE.dark);
            setPx(buf, W, H, x, 95, STONE.out);
        }
        return buf;
    }

    // B. VERTICAL STONE BUTTRESS / WALL (Frame 5)
    if (mask === 5) {
        drawVerticalButtress(0, 95, false);
        return buf;
    }

    // C. ISOLATED STONE PILLAR (Frame 0)
    if (mask === 0) {
        for (let y = 16; y <= 47; y++) {
            for (let x = 6; x <= 41; x++) {
                if (y === 16 || x === 6 || x === 41) setPx(buf, W, H, x, y, STONE.out);
                else if (y === 17 || x === 7) setPx(buf, W, H, x, y, STONE.hi);
                else setPx(buf, W, H, x, y, (x % 16 === 0) ? STONE.mortar : STONE.light);
            }
        }
        drawVerticalButtress(48, 95, true);
        return buf;
    }

    // D. VERTICAL RUN TERMINATING OR BRANCHING WITH WALL TO NORTH (n === true)
    if (n) {
        if (s) {
            drawVerticalButtress(0, 95, false);
        } else {
            // s === false: Bottom corner (SW 3, SE 9) or end cap
            // Rows 0..47 is transparent!
            drawVerticalButtress(48, 95, true);
        }

        // Horizontal branch connections on rows 48..95
        if (e) {
            for (let y = 48; y <= 55; y++) {
                for (let x = 41; x <= 47; x++) {
                    if (y === 48) setPx(buf, W, H, x, y, STONE.out);
                    else if (y === 49) setPx(buf, W, H, x, y, STONE.hi);
                    else setPx(buf, W, H, x, y, STONE.light);
                }
            }
            for (let y = 56; y <= 95; y++) {
                const isHJoint = ((y - 56) % 12 === 0);
                for (let x = 41; x <= 47; x++) {
                    if (isHJoint) setPx(buf, W, H, x, y, STONE.mortar);
                    else setPx(buf, W, H, x, y, STONE.mid);
                }
            }
            for (let x = 41; x <= 47; x++) {
                setPx(buf, W, H, x, 94, STONE.dark);
                setPx(buf, W, H, x, 95, STONE.out);
            }
        }
        if (w) {
            for (let y = 48; y <= 55; y++) {
                for (let x = 0; x <= 6; x++) {
                    if (y === 48) setPx(buf, W, H, x, y, STONE.out);
                    else if (y === 49) setPx(buf, W, H, x, y, STONE.hi);
                    else setPx(buf, W, H, x, y, STONE.light);
                }
            }
            for (let y = 56; y <= 95; y++) {
                const isHJoint = ((y - 56) % 12 === 0);
                for (let x = 0; x <= 6; x++) {
                    if (isHJoint) setPx(buf, W, H, x, y, STONE.mortar);
                    else setPx(buf, W, H, x, y, STONE.mid);
                }
            }
            for (let x = 0; x <= 6; x++) {
                setPx(buf, W, H, x, 94, STONE.dark);
                setPx(buf, W, H, x, 95, STONE.out);
            }
        }
        return buf;
    }

    // E. NORTH-FACING RUNS AND CORNERS (n === false)
    const topX1 = w ? 0 : 6;
    const topX2 = e ? 47 : 41;
    const topY1 = 6;

    // 1. Rampart Coping Stones (rows 6..47)
    for (let y = topY1; y <= 47; y++) {
        for (let x = topX1; x <= topX2; x++) {
            const isJoint = (x % 16 === 0) || (y % 12 === 0);
            const isSpeckle = ((x * 17 + y * 31) % 13 === 0);
            if (isJoint) setPx(buf, W, H, x, y, STONE.mortar);
            else if (isSpeckle) setPx(buf, W, H, x, y, STONE.shade);
            else setPx(buf, W, H, x, y, STONE.light);
        }
    }

    // Coping borders
    for (let x = topX1; x <= topX2; x++) {
        setPx(buf, W, H, x, topY1, STONE.out);
        setPx(buf, W, H, x, topY1 + 1, STONE.hi);
    }
    if (!w) {
        for (let y = topY1; y <= 47; y++) {
            setPx(buf, W, H, topX1, y, STONE.out);
            setPx(buf, W, H, topX1 + 1, y, STONE.hi);
        }
    }
    if (!e) {
        for (let y = topY1; y <= 47; y++) {
            setPx(buf, W, H, topX2, y, STONE.out);
            setPx(buf, W, H, topX2 - 1, y, STONE.shade);
        }
    }

    // 2. Ashlar Face (rows 48..95)
    const faceX1 = w ? 0 : 6;
    const faceX2 = e ? 47 : 41;

    for (let y = 48; y <= 95; y++) {
        const courseY = Math.floor((y - 48) / 12);
        const isHJoint = ((y - 48) % 12 === 0);
        const xOff = (courseY % 2 === 0) ? 0 : 12;
        for (let x = faceX1; x <= faceX2; x++) {
            const isVJoint = ((x + xOff) % 24 === 0);
            if (isHJoint || isVJoint) {
                setPx(buf, W, H, x, y, STONE.mortar);
            } else if (y === 48 || y === 60 || y === 72 || y === 84) {
                setPx(buf, W, H, x, y, STONE.hi);
            } else {
                setPx(buf, W, H, x, y, STONE.mid);
            }
        }
    }

    // If South connects (NW corner 6, NE corner 12, South T 14):
    if (s) {
        drawVerticalButtress(48, 95, false);
    }

    // Left and right edges
    if (!w && !s) {
        for (let y = 48; y <= 95; y++) {
            setPx(buf, W, H, faceX1, y, STONE.out);
            setPx(buf, W, H, faceX1 + 1, y, STONE.hi);
        }
    }
    if (!e && !s) {
        for (let y = 48; y <= 95; y++) {
            setPx(buf, W, H, faceX2, y, STONE.out);
            setPx(buf, W, H, faceX2 - 1, y, STONE.shade);
        }
    }

    // Ground line
    for (let x = faceX1; x <= faceX2; x++) {
        setPx(buf, W, H, x, 94, STONE.dark);
        setPx(buf, W, H, x, 95, STONE.out);
    }

    return buf;
}

// Build 192x480 sheets
function buildFullSheet(drawFn) {
    const sheetW = 192, sheetH = 480;
    const sheet = createBuf(sheetW, sheetH);
    const frames = [];

    for (let i = 0; i < 20; i++) {
        const frame = drawFn(i);
        frames.push(frame);

        const col = i % 4;
        const row = Math.floor(i / 4);

        for (let y = 0; y < 96; y++) {
            for (let x = 0; x < 48; x++) {
                const px = getPx(frame, 48, 96, x, y);
                const sIdx = (((row * 96 + y) * sheetW) + (col * 48 + x)) * 4;
                sheet[sIdx] = px[0];
                sheet[sIdx + 1] = px[1];
                sheet[sIdx + 2] = px[2];
                sheet[sIdx + 3] = px[3];
            }
        }
    }

    return { sheet, frames };
}

// Render Room Showcase with Ground Floor under it
function renderRoomWithFloor(frames, floorColor) {
    const roomTiles = 7;
    const roomW = roomTiles * 48, roomH = roomTiles * 48;
    const room = createBuf(roomW, roomH);

    // 1. Fill ground floor with subtle dithered meadow/earth floor
    for (let y = 0; y < roomH; y++) {
        for (let x = 0; x < roomW; x++) {
            const isDither = ((x * 11 + y * 17) % 7 === 0);
            const c = isDither ? floorColor.dither : floorColor.base;
            setPx(room, roomW, roomH, x, y, c);
        }
    }

    // 2. Helper to stamp wall at (tx, ty)
    // Anchor is bottom-center of cell (tx, ty)
    // Visual overhang starts 1 tile north: destBaseY = (ty - 1) * 48
    function stamp(frameIdx, tx, ty) {
        const f = frames[frameIdx];
        const destBaseX = tx * 48;
        const destBaseY = (ty - 1) * 48;

        for (let y = 0; y < 96; y++) {
            for (let x = 0; x < 48; x++) {
                const px = getPx(f, 48, 96, x, y);
                if (px[3] > 0) {
                    const destX = destBaseX + x;
                    const destY = destBaseY + y;
                    if (destX >= 0 && destX < roomW && destY >= 0 && destY < roomH) {
                        setPx(room, roomW, roomH, destX, destY, [px[0], px[1], px[2]], px[3]);
                    }
                }
            }
        }
    }

    // Room Layout (Outer walls at x=1..5, y=1..5):
    // North wall (y=1):
    stamp(6, 1, 1); // NW corner
    stamp(10, 2, 1); // North horiz
    stamp(10, 3, 1);
    stamp(10, 4, 1);
    stamp(12, 5, 1); // NE corner

    // West & East walls:
    // ty=2:
    stamp(5, 1, 2);
    stamp(5, 5, 2);

    // ty=3 (West wall has interior T-junction 7 pointing East):
    stamp(7, 1, 3);
    stamp(10, 2, 3); // Interior wall
    stamp(8, 3, 3);  // Interior wall cap
    stamp(5, 5, 3);  // East wall

    // ty=4:
    stamp(5, 1, 4);
    stamp(5, 5, 4);

    // South wall (y=5):
    stamp(3, 1, 5);  // SW corner
    stamp(16, 2, 5); // South horiz
    // tx=3, ty=5 is open doorway!
    stamp(16, 4, 5); // South horiz
    stamp(9, 5, 5);  // SE corner

    return { room, w: roomW, h: roomH };
}

function scale3x(buf, w, h) {
    const outW = w * 3, outH = h * 3;
    const out = Buffer.alloc(outW * outH * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const px = getPx(buf, w, h, x, y);
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

const woodData = buildFullSheet(drawWoodWall);
const stoneData = buildFullSheet(drawStoneWall);

// Save sheets to game and art/masters
writePNG('game/img/characters/!$WallWood_Set.png', 192, 480, woodData.sheet);
writePNG('game/img/characters/!$WallStone_Set.png', 192, 480, stoneData.sheet);
writePNG('art/masters/!$WallWood_Set.png', 192, 480, woodData.sheet);
writePNG('art/masters/!$WallStone_Set.png', 192, 480, stoneData.sheet);

// Render showcases with floor
const meadowFloor = { base: nearest(77, 93, 40), dither: nearest(65, 81, 32) };
const clayFloor = { base: nearest(120, 80, 60), dither: nearest(100, 65, 50) };

const woodShowcase = renderRoomWithFloor(woodData.frames, meadowFloor);
const stoneShowcase = renderRoomWithFloor(stoneData.frames, clayFloor);

writePNG('art/review/clean_two_square_wood_room_3x.png', woodShowcase.w * 3, woodShowcase.h * 3, scale3x(woodShowcase.room, woodShowcase.w, woodShowcase.h));
writePNG('art/review/clean_two_square_stone_room_3x.png', stoneShowcase.w * 3, stoneShowcase.h * 3, scale3x(stoneShowcase.room, stoneShowcase.w, stoneShowcase.h));

console.log('Successfully generated clean 2-square wall sets with seamless joinery and floor showcases!');
