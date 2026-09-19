const fs = require('fs');
const path = require('path');
const { readPNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// ----------------------------------------------------------------------------
// 1. Palette & Color Snapping (CIELAB matching uf.hex)
// ----------------------------------------------------------------------------
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

const hexLines = fs.readFileSync(PALETTE_FILE, 'utf8').split(/\r?\n/).filter(s => s.trim().startsWith('#'));
const palRGB = hexLines.map(parseHex).filter(Boolean);
const palLab = palRGB.map(c => srgbToLab(...c));
const cache = new Map();

function snap(r, g, b) {
    // Magenta background suppression
    if ((r > 150 && b > 150 && g < 100) || (r > g * 1.4 && b > g * 1.4)) {
        return [0, 0, 0, 0];
    }
    const key = (r << 16) | (g << 8) | b;
    if (cache.has(key)) return cache.get(key);
    const lab = srgbToLab(r, g, b);
    let best = palRGB[0], bd = Infinity;
    for (let i = 0; i < palLab.length; i++) {
        const d = Math.hypot(lab[0] - palLab[i][0], lab[1] - palLab[i][1], lab[2] - palLab[i][2]);
        if (d < bd) { bd = d; best = palRGB[i]; }
    }
    cache.set(key, best);
    return best;
}

// Palette constants for crisp structural lines
const C_STONE_OUTLINE = snap(24, 24, 24);
const C_STONE_DEEP    = snap(45, 45, 45);
const C_STONE_DARK    = snap(65, 65, 65);
const C_STONE_MID     = snap(125, 125, 125);
const C_STONE_LIGHT   = snap(175, 175, 175);
const C_STONE_HI      = snap(210, 210, 210);

const C_WOOD_OUTLINE  = snap(32, 20, 8);
const C_WOOD_DARK     = snap(61, 36, 12);
const C_WOOD_SHADE    = snap(93, 53, 12);
const C_WOOD_MID      = snap(125, 77, 24);
const C_WOOD_LIGHT    = snap(186, 154, 113);
const C_WOOD_HI       = snap(219, 202, 178);
const C_IRON_HI       = snap(190, 190, 200);
const C_IRON_MID      = snap(90, 90, 100);
const C_IRON_DARK     = snap(40, 40, 45);

// ----------------------------------------------------------------------------
// 2. Load Authentic Nano Banana Source Assets
// ----------------------------------------------------------------------------
const stoneNanoImg = readPNG(path.join(ROOT, 'scratch', 'stone_wall_pieces.png'));
const woodConnectedImg = readPNG(path.join(ROOT, 'scratch', 'wall_wood_connected.png'));
const sampleWoodImg = readPNG(path.join(ROOT, 'art', 'review', 'sample_horizontal_wood_wall.png'));

// ----------------------------------------------------------------------------
// 3. Extract & Pre-snap Authentic Texture Blocks
// ----------------------------------------------------------------------------

// A. STONE TEXTURES
// 1. Ashlar Face: 3 courses of 16px blocks, sampled from stoneNanoImg (x=302..349, y=847..894)
const stoneFace = Array.from({ length: 48 }, (_, y) =>
    Array.from({ length: 48 }, (_, x) => {
        const p = stoneNanoImg.px(302 + x, 847 + y);
        return snap(p[0], p[1], p[2]);
    })
);

// 2. Walkway: flagstones with coping ledge at bottom (x=302..349, y=80..127)
const stoneWalkway = Array.from({ length: 48 }, (_, y) =>
    Array.from({ length: 48 }, (_, x) => {
        const p = stoneNanoImg.px(302 + x, 80 + y);
        return snap(p[0], p[1], p[2]);
    })
);

// 3. Vertical Wall Column: x=44..91, y=250..345 (48x96)
const stoneVertWalkway = Array.from({ length: 96 }, (_, y) =>
    Array.from({ length: 48 }, (_, x) => {
        const p = stoneNanoImg.px(44 + x, 250 + y);
        return snap(p[0], p[1], p[2]);
    })
);

// 4. Isolated Pillar: downscaled from 915..1001, 0..255 (48x96)
function extractScaledBlock(img, minX, maxX, minY, maxY, outW, outH) {
    const bboxW = maxX - minX + 1, bboxH = maxY - minY + 1;
    const block = Array.from({ length: outH }, () => Array(outW).fill(null));
    for (let gy = 0; gy < outH; gy++) {
        for (let gx = 0; gx < outW; gx++) {
            const y0 = minY + Math.floor(gy * bboxH / outH);
            const y1 = minY + Math.floor((gy + 1) * bboxH / outH);
            const x0 = minX + Math.floor(gx * bboxW / outW);
            const x1 = minX + Math.floor((gx + 1) * bboxW / outW);
            let sumR = 0, sumG = 0, sumB = 0, cnt = 0;
            for (let sy = y0; sy < y1; sy++) {
                for (let sx = x0; sx < x1; sx++) {
                    const p = img.px(sx, sy);
                    if (!((p[0] > 180 && p[1] < 60 && p[2] > 180) || (p[0] > 140 && p[2] > 140 && p[1] < 100))) {
                        sumR += p[0]; sumG += p[1]; sumB += p[2]; cnt++;
                    }
                }
            }
            if (cnt > (y1 - y0) * (x1 - x0) * 0.2) {
                block[gy][gx] = snap(Math.round(sumR / cnt), Math.round(sumG / cnt), Math.round(sumB / cnt));
            } else {
                block[gy][gx] = [0, 0, 0, 0];
            }
        }
    }
    return block;
}
const stonePillar = extractScaledBlock(stoneNanoImg, 915, 1001, 0, 255, 48, 96);

// B. WOOD TEXTURES
// 1. Wood Face: 48x48 timber wall panel downscaled 8x from sample_horizontal_wood_wall.png
const woodFace = Array.from({ length: 48 }, (_, y) =>
    Array.from({ length: 48 }, (_, x) => {
        const p = sampleWoodImg.px(x * 8, y * 8);
        return snap(p[0], p[1], p[2]);
    })
);

// 2. Wood Walkway: top rail (y=0..7) + plank deck (y=8..47)
const woodWalkway = Array.from({ length: 48 }, (_, y) =>
    Array.from({ length: 48 }, (_, x) => {
        let p;
        if (y < 8) p = woodConnectedImg.px(50 + x, 332 + y);
        else p = woodConnectedImg.px(50 + x, 438 + (y - 8));
        return snap(p[0], p[1], p[2]);
    })
);

// 3. Wood Vertical Column (x=8..39, y=0..95): vertical hewn timber grain
const woodColumn = Array.from({ length: 96 }, (_, y) =>
    Array.from({ length: 48 }, (_, x) => {
        if (x < 8 || x > 39) return [0, 0, 0, 0];
        const p = sampleWoodImg.px(((x - 8) % 48) * 8, (((y % 28) + 16)) * 8);
        return snap(p[0], p[1], p[2]);
    })
);

// Helper buffer tools
const W = 48, H = 96;
function createBuf(w, h) { return Buffer.alloc(w * h * 4); }
function setPx(buf, w, h, x, y, col, a = 255) {
    if (x < 0 || x >= w || y < 0 || y >= h || !col) return;
    if (col[3] === 0) return;
    const idx = (y * w + x) * 4;
    buf[idx] = col[0]; buf[idx + 1] = col[1]; buf[idx + 2] = col[2]; buf[idx + 3] = a;
}

// ----------------------------------------------------------------------------
// 4. Stone Wall Piece Builder (20 Frames)
// ----------------------------------------------------------------------------
function buildStonePiece(frameIdx) {
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

    // A. SOUTH-FACING SILL / WALL (Frames 16..19)
    // Rows 0..47 are fully transparent so room interior is NOT occluded!
    // Rows 48..55 coping sill; Rows 56..95 ashlar stone face
    if (isSouth) {
        const x1 = w ? 0 : 8;
        const x2 = e ? 47 : 39;
        // Coping sill on cutaway wall
        for (let y = 48; y <= 55; y++) {
            for (let x = x1; x <= x2; x++) {
                const c = stoneWalkway[y - 48 + 40][x];
                setPx(buf, W, H, x, y, c);
            }
        }
        // Ashlar face
        for (let y = 56; y <= 95; y++) {
            for (let x = x1; x <= x2; x++) {
                const c = stoneFace[y - 48][x];
                setPx(buf, W, H, x, y, c);
            }
        }
        // Clean end borders if not connecting
        if (!w) {
            for (let y = 48; y <= 95; y++) {
                setPx(buf, W, H, x1, y, C_STONE_OUTLINE);
                setPx(buf, W, H, x1 + 1, y, C_STONE_HI);
            }
        }
        if (!e) {
            for (let y = 48; y <= 95; y++) {
                setPx(buf, W, H, x2, y, C_STONE_OUTLINE);
                setPx(buf, W, H, x2 - 1, y, C_STONE_DARK);
            }
        }
        // Ground contact line
        for (let x = x1; x <= x2; x++) {
            setPx(buf, W, H, x, 94, C_STONE_DEEP);
            setPx(buf, W, H, x, 95, C_STONE_OUTLINE);
        }
        return buf;
    }

    // B. ISOLATED PILLAR (Frame 0)
    if (mask === 0) {
        for (let y = 0; y < 96; y++) {
            for (let x = 0; x < 48; x++) {
                const c = stonePillar[y][x];
                if (c && c[3] !== 0) setPx(buf, W, H, x, y, c);
            }
        }
        return buf;
    }

    // C. VERTICAL WALL COLUMN (Frame 5: N + S)
    if (mask === 5) {
        for (let y = 0; y < 96; y++) {
            for (let x = 8; x <= 39; x++) {
                const c = stoneVertWalkway[y][x];
                setPx(buf, W, H, x, y, c);
            }
        }
        for (let y = 0; y < 96; y++) {
            setPx(buf, W, H, 8, y, C_STONE_OUTLINE);
            setPx(buf, W, H, 9, y, C_STONE_HI);
            setPx(buf, W, H, 38, y, C_STONE_DARK);
            setPx(buf, W, H, 39, y, C_STONE_OUTLINE);
        }
        return buf;
    }

    // D. CONNECTED TO NORTH (n === true)
    if (n) {
        if (s) {
            // Continuous vertical column through rows 0..47
            for (let y = 0; y < 96; y++) {
                for (let x = 8; x <= 39; x++) {
                    setPx(buf, W, H, x, y, stoneVertWalkway[y][x]);
                }
            }
            for (let y = 0; y < 96; y++) {
                setPx(buf, W, H, 8, y, C_STONE_OUTLINE);
                setPx(buf, W, H, 9, y, C_STONE_HI);
                setPx(buf, W, H, 38, y, C_STONE_DARK);
                setPx(buf, W, H, 39, y, C_STONE_OUTLINE);
            }
        } else {
            // Bottom end / bottom corner: rows 0..47 is transparent!
            // Rows 48..95 has vertical column grounded on row 95
            for (let y = 48; y < 96; y++) {
                for (let x = 8; x <= 39; x++) {
                    setPx(buf, W, H, x, y, stoneFace[y - 48][x]);
                }
            }
            for (let y = 48; y < 96; y++) {
                setPx(buf, W, H, 8, y, C_STONE_OUTLINE);
                setPx(buf, W, H, 9, y, C_STONE_HI);
                setPx(buf, W, H, 38, y, C_STONE_DARK);
                setPx(buf, W, H, 39, y, C_STONE_OUTLINE);
            }
            for (let x = 8; x <= 39; x++) {
                setPx(buf, W, H, x, 94, C_STONE_DEEP);
                setPx(buf, W, H, x, 95, C_STONE_OUTLINE);
            }
        }

        // Horizontal branch connections on rows 48..95
        if (e) {
            for (let y = 48; y <= 55; y++) {
                for (let x = 39; x <= 47; x++) setPx(buf, W, H, x, y, stoneWalkway[y - 48 + 40][x]);
            }
            for (let y = 56; y <= 95; y++) {
                for (let x = 39; x <= 47; x++) setPx(buf, W, H, x, y, stoneFace[y - 48][x]);
            }
            for (let x = 39; x <= 47; x++) {
                setPx(buf, W, H, x, 94, C_STONE_DEEP);
                setPx(buf, W, H, x, 95, C_STONE_OUTLINE);
            }
        }
        if (w) {
            for (let y = 48; y <= 55; y++) {
                for (let x = 0; x <= 8; x++) setPx(buf, W, H, x, y, stoneWalkway[y - 48 + 40][x]);
            }
            for (let y = 56; y <= 95; y++) {
                for (let x = 0; x <= 8; x++) setPx(buf, W, H, x, y, stoneFace[y - 48][x]);
            }
            for (let x = 0; x <= 8; x++) {
                setPx(buf, W, H, x, 94, C_STONE_DEEP);
                setPx(buf, W, H, x, 95, C_STONE_OUTLINE);
            }
        }
        return buf;
    }

    // E. NORTH-FACING RUNS AND CORNERS (n === false)
    // Rows 0..47 is the visual ROOF / WALKWAY!
    // Rows 48..95 is the FRONT ASHLAR WALL FACE!
    const topX1 = w ? 0 : 8;
    const topX2 = e ? 47 : 39;

    // 1. Walkway (rows 0..47)
    for (let y = 0; y < 48; y++) {
        for (let x = topX1; x <= topX2; x++) {
            setPx(buf, W, H, x, y, stoneWalkway[y][x]);
        }
    }
    for (let x = topX1; x <= topX2; x++) {
        setPx(buf, W, H, x, 0, C_STONE_OUTLINE);
        setPx(buf, W, H, x, 1, C_STONE_HI);
    }
    if (!w) {
        for (let y = 0; y < 48; y++) {
            setPx(buf, W, H, topX1, y, C_STONE_OUTLINE);
            setPx(buf, W, H, topX1 + 1, y, C_STONE_HI);
        }
    }
    if (!e) {
        for (let y = 0; y < 48; y++) {
            setPx(buf, W, H, topX2, y, C_STONE_OUTLINE);
            setPx(buf, W, H, topX2 - 1, y, C_STONE_DARK);
        }
    }

    // 2. Front Face (rows 48..95)
    const faceX1 = w ? 0 : 8;
    const faceX2 = e ? 47 : 39;

    for (let y = 48; y <= 95; y++) {
        for (let x = faceX1; x <= faceX2; x++) {
            setPx(buf, W, H, x, y, stoneFace[y - 48][x]);
        }
    }

    // Under-coping shadow line
    for (let x = faceX1; x <= faceX2; x++) {
        setPx(buf, W, H, x, 48, C_STONE_DARK);
    }

    if (!w) {
        for (let y = 48; y <= 95; y++) {
            setPx(buf, W, H, faceX1, y, C_STONE_OUTLINE);
            setPx(buf, W, H, faceX1 + 1, y, C_STONE_HI);
        }
    }
    if (!e) {
        for (let y = 48; y <= 95; y++) {
            setPx(buf, W, H, faceX2, y, C_STONE_OUTLINE);
            setPx(buf, W, H, faceX2 - 1, y, C_STONE_DARK);
        }
    }

    // Ground contact
    for (let x = faceX1; x <= faceX2; x++) {
        setPx(buf, W, H, x, 94, C_STONE_DEEP);
        setPx(buf, W, H, x, 95, C_STONE_OUTLINE);
    }

    if (s) {
        for (let y = 48; y < 96; y++) {
            for (let x = 8; x <= 39; x++) {
                setPx(buf, W, H, x, y, stoneFace[y - 48][x]);
            }
        }
    }

    return buf;
}

// ----------------------------------------------------------------------------
// 5. Wood Wall Piece Builder (20 Frames)
// ----------------------------------------------------------------------------
function buildWoodPiece(frameIdx) {
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

    function drawPostIronBand(iy) {
        if (iy >= 0 && iy + 1 < H) {
            for (let x = 9; x <= 38; x++) {
                setPx(buf, W, H, x, iy - 1, C_IRON_HI);
                setPx(buf, W, H, x, iy, C_IRON_MID);
                setPx(buf, W, H, x, iy + 1, C_IRON_DARK);
            }
            setPx(buf, W, H, 14, iy, C_IRON_HI);
            setPx(buf, W, H, 24, iy, C_IRON_HI);
            setPx(buf, W, H, 33, iy, C_IRON_HI);
        }
    }

    // A. SOUTH-FACING SILL / WALL (Frames 16..19)
    if (isSouth) {
        const x1 = w ? 0 : 8;
        const x2 = e ? 47 : 39;
        // Top sill
        for (let y = 48; y <= 55; y++) {
            for (let x = x1; x <= x2; x++) {
                setPx(buf, W, H, x, y, woodWalkway[y - 48][x]);
            }
        }
        // Front timber planks
        for (let y = 56; y <= 95; y++) {
            for (let x = x1; x <= x2; x++) {
                setPx(buf, W, H, x, y, woodFace[y - 48][x]);
            }
        }
        if (!w) {
            for (let y = 48; y <= 95; y++) {
                setPx(buf, W, H, x1, y, C_WOOD_OUTLINE);
                setPx(buf, W, H, x1 + 1, y, C_WOOD_HI);
            }
        }
        if (!e) {
            for (let y = 48; y <= 95; y++) {
                setPx(buf, W, H, x2, y, C_WOOD_OUTLINE);
                setPx(buf, W, H, x2 - 1, y, C_WOOD_SHADE);
            }
        }
        for (let x = x1; x <= x2; x++) {
            setPx(buf, W, H, x, 94, C_WOOD_DARK);
            setPx(buf, W, H, x, 95, C_WOOD_OUTLINE);
        }
        return buf;
    }

    // B. ISOLATED POST (Frame 0)
    if (mask === 0) {
        for (let y = 8; y <= 47; y++) {
            for (let x = 8; x <= 39; x++) {
                setPx(buf, W, H, x, y, woodColumn[y][x]);
            }
        }
        for (let x = 8; x <= 39; x++) {
            setPx(buf, W, H, x, 8, C_WOOD_OUTLINE);
            setPx(buf, W, H, x, 9, C_WOOD_HI);
        }
        for (let y = 8; y <= 47; y++) {
            setPx(buf, W, H, 8, y, C_WOOD_OUTLINE);
            setPx(buf, W, H, 9, y, C_WOOD_HI);
            setPx(buf, W, H, 38, y, C_WOOD_SHADE);
            setPx(buf, W, H, 39, y, C_WOOD_OUTLINE);
        }
        for (let y = 48; y <= 95; y++) {
            for (let x = 8; x <= 39; x++) {
                setPx(buf, W, H, x, y, woodColumn[y][x]);
            }
        }
        for (let y = 48; y <= 95; y++) {
            setPx(buf, W, H, 8, y, C_WOOD_OUTLINE);
            setPx(buf, W, H, 9, y, C_WOOD_HI);
            setPx(buf, W, H, 38, y, C_WOOD_SHADE);
            setPx(buf, W, H, 39, y, C_WOOD_OUTLINE);
        }
        for (let x = 8; x <= 39; x++) {
            setPx(buf, W, H, x, 94, C_WOOD_DARK);
            setPx(buf, W, H, x, 95, C_WOOD_OUTLINE);
        }
        return buf;
    }

    // C. VERTICAL POST COLUMN (Frame 5: N + S)
    if (mask === 5) {
        for (let y = 0; y < 96; y++) {
            for (let x = 8; x <= 39; x++) {
                setPx(buf, W, H, x, y, woodColumn[y][x]);
            }
        }
        for (let y = 0; y < 96; y++) {
            setPx(buf, W, H, 8, y, C_WOOD_OUTLINE);
            setPx(buf, W, H, 9, y, C_WOOD_HI);
            setPx(buf, W, H, 38, y, C_WOOD_SHADE);
            setPx(buf, W, H, 39, y, C_WOOD_OUTLINE);
        }
        return buf;
    }

    // D. CONNECTED TO NORTH (n === true)
    if (n) {
        if (s) {
            for (let y = 0; y < 96; y++) {
                for (let x = 8; x <= 39; x++) {
                    setPx(buf, W, H, x, y, woodColumn[y][x]);
                }
            }
            for (let y = 0; y < 96; y++) {
                setPx(buf, W, H, 8, y, C_WOOD_OUTLINE);
                setPx(buf, W, H, 9, y, C_WOOD_HI);
                setPx(buf, W, H, 38, y, C_WOOD_SHADE);
                setPx(buf, W, H, 39, y, C_WOOD_OUTLINE);
            }
        } else {
            // Bottom end / corner
            for (let y = 48; y < 96; y++) {
                for (let x = 8; x <= 39; x++) {
                    setPx(buf, W, H, x, y, woodColumn[y][x]);
                }
            }
            for (let y = 48; y < 96; y++) {
                setPx(buf, W, H, 8, y, C_WOOD_OUTLINE);
                setPx(buf, W, H, 9, y, C_WOOD_HI);
                setPx(buf, W, H, 38, y, C_WOOD_SHADE);
                setPx(buf, W, H, 39, y, C_WOOD_OUTLINE);
            }
            for (let x = 8; x <= 39; x++) {
                setPx(buf, W, H, x, 94, C_WOOD_DARK);
                setPx(buf, W, H, x, 95, C_WOOD_OUTLINE);
            }
        }

        // Horizontal branch connections on rows 48..95
        if (e) {
            for (let y = 48; y <= 55; y++) {
                for (let x = 39; x <= 47; x++) setPx(buf, W, H, x, y, woodWalkway[y - 48][x]);
            }
            for (let y = 56; y <= 95; y++) {
                for (let x = 39; x <= 47; x++) setPx(buf, W, H, x, y, woodFace[y - 48][x]);
            }
            for (let x = 39; x <= 47; x++) {
                setPx(buf, W, H, x, 94, C_WOOD_DARK);
                setPx(buf, W, H, x, 95, C_WOOD_OUTLINE);
            }
        }
        if (w) {
            for (let y = 48; y <= 55; y++) {
                for (let x = 0; x <= 8; x++) setPx(buf, W, H, x, y, woodWalkway[y - 48][x]);
            }
            for (let y = 56; y <= 95; y++) {
                for (let x = 0; x <= 8; x++) setPx(buf, W, H, x, y, woodFace[y - 48][x]);
            }
            for (let x = 0; x <= 8; x++) {
                setPx(buf, W, H, x, 94, C_WOOD_DARK);
                setPx(buf, W, H, x, 95, C_WOOD_OUTLINE);
            }
        }
        return buf;
    }

    // E. NORTH-FACING RUNS AND CORNERS (n === false)
    const topX1 = w ? 0 : 8;
    const topX2 = e ? 47 : 39;

    // 1. Walkway (rows 0..47)
    for (let y = 0; y < 48; y++) {
        for (let x = topX1; x <= topX2; x++) {
            setPx(buf, W, H, x, y, woodWalkway[y][x]);
        }
    }
    for (let x = topX1; x <= topX2; x++) {
        setPx(buf, W, H, x, 0, C_WOOD_OUTLINE);
        setPx(buf, W, H, x, 1, C_WOOD_HI);
    }
    if (!w) {
        for (let y = 0; y < 48; y++) {
            setPx(buf, W, H, topX1, y, C_WOOD_OUTLINE);
            setPx(buf, W, H, topX1 + 1, y, C_WOOD_HI);
        }
    }
    if (!e) {
        for (let y = 0; y < 48; y++) {
            setPx(buf, W, H, topX2, y, C_WOOD_OUTLINE);
            setPx(buf, W, H, topX2 - 1, y, C_WOOD_SHADE);
        }
    }

    // 2. Front Face (rows 48..95)
    const faceX1 = w ? 0 : 8;
    const faceX2 = e ? 47 : 39;

    for (let y = 48; y <= 95; y++) {
        for (let x = faceX1; x <= faceX2; x++) {
            setPx(buf, W, H, x, y, woodFace[y - 48][x]);
        }
    }
    for (let x = faceX1; x <= faceX2; x++) {
        setPx(buf, W, H, x, 48, C_WOOD_DARK);
        setPx(buf, W, H, x, 94, C_WOOD_DARK);
        setPx(buf, W, H, x, 95, C_WOOD_OUTLINE);
    }
    if (!w) {
        for (let y = 48; y <= 95; y++) {
            setPx(buf, W, H, faceX1, y, C_WOOD_OUTLINE);
            setPx(buf, W, H, faceX1 + 1, y, C_WOOD_HI);
        }
    }
    if (!e) {
        for (let y = 48; y <= 95; y++) {
            setPx(buf, W, H, faceX2, y, C_WOOD_OUTLINE);
            setPx(buf, W, H, faceX2 - 1, y, C_WOOD_SHADE);
        }
    }

    if (s) {
        for (let y = 48; y < 96; y++) {
            for (let x = 8; x <= 39; x++) {
                setPx(buf, W, H, x, y, woodColumn[y][x]);
            }
        }
    }

    return buf;
}

// ----------------------------------------------------------------------------
// 6. Assemble Sheets (192 x 480 px: 4 cols x 5 rows)
// ----------------------------------------------------------------------------
const SHEET_W = 192;
const SHEET_H = 480;

function assembleSheet(builder) {
    const sheetBuf = Buffer.alloc(SHEET_W * SHEET_H * 4);
    const uniqueColors = new Set();

    for (let frameIdx = 0; frameIdx < 20; frameIdx++) {
        const col = frameIdx % 4;
        const row = Math.floor(frameIdx / 4);
        const startX = col * 48;
        const startY = row * 96;

        const pieceBuf = builder(frameIdx);

        for (let py = 0; py < 96; py++) {
            for (let px = 0; px < 48; px++) {
                const srcIdx = (py * 48 + px) * 4;
                const dstIdx = ((startY + py) * SHEET_W + (startX + px)) * 4;
                const r = pieceBuf[srcIdx];
                const g = pieceBuf[srcIdx + 1];
                const b = pieceBuf[srcIdx + 2];
                const a = pieceBuf[srcIdx + 3];

                sheetBuf[dstIdx] = r;
                sheetBuf[dstIdx + 1] = g;
                sheetBuf[dstIdx + 2] = b;
                sheetBuf[dstIdx + 3] = a;

                if (a > 0) {
                    uniqueColors.add((r << 16) | (g << 8) | b);
                }
            }
        }
    }

    return { sheetBuf, colorCount: uniqueColors.size };
}

console.log('Generating Stone Wall Sheet...');
const stoneResult = assembleSheet(buildStonePiece);
console.log(`Stone Wall generated. Colors: ${stoneResult.colorCount}`);

console.log('Generating Wood Wall Sheet...');
const woodResult = assembleSheet(buildWoodPiece);
console.log(`Wood Wall generated. Colors: ${woodResult.colorCount}`);

// Write target assets
writePNG(path.join(ROOT, 'game', 'img', 'characters', '!$WallStone_Set.png'), SHEET_W, SHEET_H, stoneResult.sheetBuf);
writePNG(path.join(ROOT, 'art', 'masters', '!$WallStone_Set.png'), SHEET_W, SHEET_H, stoneResult.sheetBuf);

writePNG(path.join(ROOT, 'game', 'img', 'characters', '!$WallWood_Set.png'), SHEET_W, SHEET_H, woodResult.sheetBuf);
writePNG(path.join(ROOT, 'art', 'masters', '!$WallWood_Set.png'), SHEET_W, SHEET_H, woodResult.sheetBuf);

console.log('Done generating clean textured two-square wall sheets!');
