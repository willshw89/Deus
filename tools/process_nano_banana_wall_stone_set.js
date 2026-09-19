const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');
const NANO_PNG = path.join(ROOT, 'scratch', 'stone_wall_pieces.png');

// CIELAB color conversion functions (matching make_25d.js)
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
        unique,
        snap: (r, g, b) => {
            // Anti-aliasing fringe suppression against magenta background
            if (r > g * 1.25 && b > g * 1.25) {
                r = Math.min(80, Math.round(g * 0.9));
                b = Math.min(80, Math.round(g * 0.9));
            }
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

// Load Nano Banana output
const nanoImg = decodePNG(fs.readFileSync(NANO_PNG));
function getNanoPx(x, y) {
    if (x < 0 || x >= nanoImg.width || y < 0 || y >= nanoImg.height) return [255, 0, 255];
    const o = (y * nanoImg.width + x) * 4;
    return [nanoImg.data[o], nanoImg.data[o + 1], nanoImg.data[o + 2]];
}

function isBgPixel(r, g, b) {
    if (r > 150 && g < 100 && b > 150) return true;
    if (r > 120 && b > 120 && g < 90) return true;
    if (r > g * 1.30 && b > g * 1.30) return true;
    return false;
}

// Extract scaled, snapped block from Nano bounding box
function extractBlock(minX, minY, maxX, maxY, outW, outH) {
    const bboxW = maxX - minX + 1;
    const bboxH = maxY - minY + 1;
    const block = Array.from({ length: outH }, () => Array(outW).fill(null));

    for (let gy = 0; gy < outH; gy++) {
        for (let gx = 0; gx < outW; gx++) {
            const srcY0 = minY + Math.floor(gy * (bboxH / outH));
            const srcY1 = minY + Math.floor((gy + 1) * (bboxH / outH));
            const srcX0 = minX + Math.floor(gx * (bboxW / outW));
            const srcX1 = minX + Math.floor((gx + 1) * (bboxW / outW));

            let sumR = 0, sumG = 0, sumB = 0, count = 0;
            for (let sy = srcY0; sy < srcY1; sy++) {
                for (let sx = srcX0; sx < srcX1; sx++) {
                    const [r, g, b] = getNanoPx(sx, sy);
                    if (!isBgPixel(r, g, b)) {
                        sumR += r; sumG += g; sumB += b;
                        count++;
                    }
                }
            }

            if (count > (srcY1 - srcY0) * (srcX1 - srcX0) * 0.15) {
                let avgR = Math.round(sumR / count);
                let avgG = Math.round(sumG / count);
                let avgB = Math.round(sumB / count);
                if (avgR > avgG * 1.2 && avgB > avgG * 1.2) {
                    avgR = 60; avgG = 60; avgB = 60;
                }
                block[gy][gx] = pal.snap(avgR, avgG, avgB);
            }
        }
    }
    return block;
}

// Extract scaled pillar: top-right column [915, 0] to [1000, 256] -> 48 wide x 96 high
const rawPillar = extractBlock(915, 0, 1000, 256, 48, 96);

// Stone palette definitions strictly from uf.hex
const COL_HIGHLIGHT = pal.snap(206, 206, 206); // #cecece - top capstone bevel
const COL_CAPSTONE  = pal.snap(190, 190, 190); // #bebebe - capstone body
const COL_LIGHT     = pal.snap(158, 158, 158); // #9e9e9e - lit block face
const COL_MID       = pal.snap(142, 142, 142); // #8e8e8e - standard stone face
const COL_SHADOW    = pal.snap(109, 109, 109); // #6d6d6d - shaded block / joint
const COL_DARK      = pal.snap(81, 81, 81);    // #515151 - deep mortar joint
const COL_DEEP      = pal.snap(69, 69, 69);    // #454545 - contact line / crevice
const COL_OUTLINE   = pal.snap(32, 20, 8);     // #201408 - darkest edge / contact

// Helper to fill coursed ashlar stone face
function fillAshlarFace(piece, startY, endY, startX, endX, isEastFace = false) {
    const courseH = 8;
    for (let y = startY; y <= endY; y++) {
        const rowInCourse = (y - 48) % courseH;
        const courseIdx = Math.floor((y - 48) / courseH);
        const shift = (courseIdx % 2 === 0) ? 0 : 6;
        for (let x = startX; x <= endX; x++) {
            const colInBlock = (x + shift) % 12;
            if (rowInCourse === 0 || y === 48 || y === endY) {
                piece[y][x] = COL_DARK;
            } else if (colInBlock === 0) {
                piece[y][x] = COL_DARK;
            } else if (rowInCourse === 1 || colInBlock === 1) {
                piece[y][x] = isEastFace ? COL_MID : COL_LIGHT;
            } else if (rowInCourse === courseH - 1 || colInBlock === 11) {
                piece[y][x] = COL_SHADOW;
            } else {
                const hash = ((x * 17) ^ (y * 31)) & 7;
                if (isEastFace) {
                    piece[y][x] = (hash === 0) ? COL_DARK : (hash < 3 ? COL_MID : COL_SHADOW);
                } else {
                    piece[y][x] = (hash === 0) ? COL_HIGHLIGHT : (hash < 4 ? COL_MID : COL_LIGHT);
                }
            }
        }
    }
}

// Master piece creation: 48 wide x 96 high
function createPiece(mask, variant = 0) {
    const piece = Array.from({ length: 96 }, () => Array(48).fill(null));

    const n = (mask & 1) !== 0;
    const e = (mask & 2) !== 0;
    const s = (mask & 4) !== 0;
    const w = (mask & 8) !== 0;

    const isOpenNorthVariant = variant > 0;

    // -------------------------------------------------------------
    // 1. FRONT FACE (rows 48..95)
    // -------------------------------------------------------------
    if (mask === 0) {
        // Piece 0: Isolated stone pillar column (cols 12..35, rows 48..95)
        for (let y = 48; y < 96; y++) {
            for (let x = 0; x < 48; x++) {
                if (x >= 12 && x <= 35) {
                    const px = rawPillar[y][x];
                    if (px) {
                        piece[y][x] = px;
                    } else {
                        const isBorder = (x === 12 || x === 35 || y === 95);
                        const isEdge = (x === 13 || y === 48);
                        if (isBorder) piece[y][x] = COL_OUTLINE;
                        else if (isEdge) piece[y][x] = COL_LIGHT;
                        else piece[y][x] = (x > 28) ? COL_SHADOW : COL_MID;
                    }
                }
            }
        }
        for (let x = 12; x <= 35; x++) {
            piece[95][x] = COL_OUTLINE;
            piece[94][x] = COL_DEEP;
        }
    } else {
        // Standard wall front face: coursed ashlar stone blocks
        let leftX = 0, rightX = 47;
        if (!w && !n && !s) leftX = 8;
        if (!e && !n && !s) rightX = 39;

        fillAshlarFace(piece, 48, 95, leftX, rightX, false);

        // Ground contact line on row 95
        for (let x = leftX; x <= rightX; x++) {
            piece[95][x] = COL_OUTLINE;
            piece[94][x] = COL_DEEP;
        }

        // Side borders when not connecting
        if (!w) {
            for (let y = 48; y <= 95; y++) piece[y][leftX] = COL_OUTLINE;
        }
        if (!e) {
            for (let y = 48; y <= 95; y++) piece[y][rightX] = COL_OUTLINE;
        }
    }

    // -------------------------------------------------------------
    // 2. ROOF / WALKWAY SQUARE (rows 0..47)
    // -------------------------------------------------------------
    if (mask === 0) {
        // Piece 0: Pillar capital / top stone (cols 11..36, rows 8..47)
        for (let y = 8; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                if (x >= 11 && x <= 36) {
                    const px = rawPillar[y][x];
                    if (px) {
                        piece[y][x] = px;
                    } else {
                        if (y === 8 || x === 11 || x === 36) piece[y][x] = COL_OUTLINE;
                        else if (y === 9 || x === 12) piece[y][x] = COL_HIGHLIGHT;
                        else if (y < 20) piece[y][x] = COL_CAPSTONE;
                        else piece[y][x] = (x > 28) ? COL_SHADOW : COL_MID;
                    }
                }
            }
        }
    } else if (isOpenNorthVariant) {
        // Pieces 16-19: Open-North East-West runs with defensive crenels / battlements
        // Rows 0..15: Defensive crenel battlements facing open north
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 48; x++) {
                const merlon = (x % 12 < 8);
                if (merlon) {
                    if (y === 0 || x % 12 === 0 || x % 12 === 7) {
                        piece[y][x] = COL_OUTLINE;
                    } else if (y === 1 || x % 12 === 1) {
                        piece[y][x] = COL_HIGHLIGHT;
                    } else {
                        piece[y][x] = (x % 12 > 4) ? COL_MID : COL_CAPSTONE;
                    }
                }
            }
        }
        for (let x = 0; x < 48; x++) piece[16][x] = COL_DARK;

        // Rows 17..43: Flagstone rampart walkway
        for (let y = 17; y <= 43; y++) {
            for (let x = 0; x < 48; x++) {
                const isJointX = (x % 16 === 0);
                const isJointY = (y % 12 === 0);
                if (isJointX || isJointY) {
                    piece[y][x] = COL_DARK;
                } else if ((x % 16 === 1) || (y % 12 === 1)) {
                    piece[y][x] = COL_HIGHLIGHT;
                } else {
                    const noise = ((x * 13) ^ (y * 29)) & 7;
                    piece[y][x] = (noise === 0) ? COL_LIGHT : (noise < 5 ? COL_CAPSTONE : COL_MID);
                }
            }
        }

        // Rows 44..47: South capstone curb
        for (let x = 0; x < 48; x++) {
            piece[44][x] = COL_HIGHLIGHT;
            piece[45][x] = COL_CAPSTONE;
            piece[46][x] = COL_MID;
            piece[47][x] = COL_OUTLINE;
        }

        if (variant === 3) { // piece 18: W end
            for (let y = 0; y < 48; y++) piece[y][0] = COL_OUTLINE;
        } else if (variant === 4) { // piece 19: E end
            for (let y = 0; y < 48; y++) piece[y][47] = COL_OUTLINE;
        }
    } else if (mask === 5 || mask === 1 || mask === 4) {
        // Vertical runs (piece 5: N+S, piece 1: N, piece 4: S)
        // Walkway runs North-South across center (columns 12..35)
        // West parapet on columns 0..11, East parapet on columns 36..47
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                if (x < 12) {
                    // West parapet rail
                    if (x === 0 || x === 11) piece[y][x] = COL_OUTLINE;
                    else if (x <= 3) piece[y][x] = COL_HIGHLIGHT;
                    else if (x <= 7) piece[y][x] = COL_CAPSTONE;
                    else piece[y][x] = COL_MID;
                } else if (x > 35) {
                    // East parapet rail
                    if (x === 36 || x === 47) piece[y][x] = COL_OUTLINE;
                    else if (x <= 40) piece[y][x] = COL_MID;
                    else piece[y][x] = COL_SHADOW;
                } else {
                    // North-South paved stone walkway
                    const isJointX = ((x - 12) % 12 === 0);
                    const isJointY = (y % 16 === 0);
                    if (isJointX || isJointY) {
                        piece[y][x] = COL_DARK;
                    } else if (((x - 12) % 12 === 1) || (y % 16 === 1)) {
                        piece[y][x] = COL_HIGHLIGHT;
                    } else {
                        const noise = ((x * 19) ^ (y * 23)) & 7;
                        piece[y][x] = (noise === 0) ? COL_LIGHT : (noise < 5 ? COL_CAPSTONE : COL_MID);
                    }
                }
            }
        }

        // North curb if !n
        if (!n) {
            for (let y = 0; y <= 6; y++) {
                for (let x = 12; x <= 35; x++) {
                    piece[y][x] = (y === 0) ? COL_OUTLINE : (y === 1 ? COL_HIGHLIGHT : COL_CAPSTONE);
                }
            }
        }
        // South curb if !s
        if (!s) {
            for (let y = 42; y < 48; y++) {
                for (let x = 12; x <= 35; x++) {
                    piece[y][x] = (y === 47) ? COL_OUTLINE : (y === 42 ? COL_CAPSTONE : COL_MID);
                }
            }
        }
    } else {
        // Horizontal runs, corners, T-junctions, and cross
        // Fill base 48x48 paved flagstone walkway
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const isJointX = (x % 16 === 0);
                const isJointY = (y % 16 === 0);
                if (isJointX || isJointY) {
                    piece[y][x] = COL_DARK;
                } else if ((x % 16 === 1) || (y % 16 === 1)) {
                    piece[y][x] = COL_HIGHLIGHT;
                } else {
                    const noise = ((x * 17) ^ (y * 31)) & 7;
                    piece[y][x] = (noise === 0) ? COL_LIGHT : (noise < 5 ? COL_CAPSTONE : COL_MID);
                }
            }
        }

        // North edge treatment
        if (!n) {
            // North capstone parapet curb on rows 0..6
            for (let y = 0; y <= 6; y++) {
                for (let x = 0; x < 48; x++) {
                    if (y === 0) piece[y][x] = COL_OUTLINE;
                    else if (y === 1) piece[y][x] = COL_HIGHLIGHT;
                    else if (y <= 4) piece[y][x] = COL_CAPSTONE;
                    else piece[y][x] = COL_MID;
                }
            }
        }

        // South edge treatment: rows 44..47 capstone curb
        for (let x = 0; x < 48; x++) {
            piece[44][x] = COL_HIGHLIGHT;
            piece[45][x] = COL_CAPSTONE;
            piece[46][x] = COL_MID;
            piece[47][x] = COL_OUTLINE;
        }

        // West edge treatment if !w
        if (!w) {
            for (let y = 0; y < 48; y++) {
                piece[y][0] = COL_OUTLINE;
                piece[y][1] = COL_HIGHLIGHT;
                piece[y][2] = COL_CAPSTONE;
                piece[y][3] = COL_MID;
            }
        }

        // East edge treatment if !e
        if (!e) {
            for (let y = 0; y < 48; y++) {
                piece[y][47] = COL_OUTLINE;
                piece[y][46] = COL_SHADOW;
                piece[y][45] = COL_MID;
            }
        }
    }

    return piece;
}

// Assemble all 20 pieces
const pieces = [];
for (let i = 0; i < 16; i++) {
    pieces.push(createPiece(i, 0));
}
// 4 North-face open ground variants (16..19)
pieces.push(createPiece(10, 1)); // 16: open_north_ew
pieces.push(createPiece(10, 2)); // 17: open_north_ew_var
pieces.push(createPiece(8, 3));  // 18: open_north_w (end)
pieces.push(createPiece(2, 4));  // 19: open_north_e (end)

// -------------------------------------------------------------
// OUTPUT COMPOSITING
// -------------------------------------------------------------
const SHEET_COLS = 4;
const SHEET_ROWS = 5;
const FRAME_W = 48;
const FRAME_H = 96;
const SHEET_W = SHEET_COLS * FRAME_W; // 192
const SHEET_H = SHEET_ROWS * FRAME_H; // 480

// Palette enforcement across all 20 pieces (limit 32 colors)
const usedColors = new Map();
for (let i = 0; i < 20; i++) {
    const p = pieces[i];
    for (let y = 0; y < FRAME_H; y++) {
        for (let x = 0; x < FRAME_W; x++) {
            const c = p[y][x];
            if (!c) continue;
            const k = (c[0] << 16) | (c[1] << 8) | c[2];
            usedColors.set(k, (usedColors.get(k) || 0) + 1);
        }
    }
}

console.log(`Unique stone wall colors used across 20 pieces: ${usedColors.size}`);
let topPalette = [...usedColors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 32).map(([k]) => [
    (k >> 16) & 255, (k >> 8) & 255, k & 255
]);
const topLab = topPalette.map(c => srgbToLab(...c));

function clampToTop32(r, g, b) {
    const l = srgbToLab(r, g, b);
    let best = topPalette[0], bd = Infinity;
    for (let i = 0; i < topLab.length; i++) {
        const d = labDist(l, topLab[i]);
        if (d < bd) { bd = d; best = topPalette[i]; }
    }
    return best;
}

// Build 1x Master Sheet (192x480)
const masterData = Buffer.alloc(SHEET_W * SHEET_H * 4);
for (let idx = 0; idx < 20; idx++) {
    const col = idx % SHEET_COLS;
    const row = Math.floor(idx / SHEET_COLS);
    const piece = pieces[idx];

    for (let py = 0; py < FRAME_H; py++) {
        for (let px = 0; px < FRAME_W; px++) {
            const outX = col * FRAME_W + px;
            const outY = row * FRAME_H + py;
            const outIdx = (outY * SHEET_W + outX) * 4;
            let c = piece[py][px];
            if (c) {
                if (usedColors.size > 32) c = clampToTop32(c[0], c[1], c[2]);
                masterData[outIdx] = c[0];
                masterData[outIdx + 1] = c[1];
                masterData[outIdx + 2] = c[2];
                masterData[outIdx + 3] = 255;
            } else {
                masterData[outIdx] = 255;
                masterData[outIdx + 1] = 0;
                masterData[outIdx + 2] = 255;
                masterData[outIdx + 3] = 0; // Transparent for master
            }
        }
    }
}

// Write master PNG and sidecar
const masterPngPath = path.join(ROOT, 'art', 'masters', 'wall_stone.png');
writePNG(masterPngPath, SHEET_W, SHEET_H, masterData);
console.log('Saved master PNG:', masterPngPath, `(${SHEET_W}x${SHEET_H})`);

const sidecar = {
    id: "wall_stone",
    name: "Stone Castle Wall (Connected 20-Piece Set)",
    category: "Site",
    frameWidth: 48,
    frameHeight: 96,
    anchor: [24, 95],
    footprint: [1, 2],
    facings: ["S"],
    animations: { "stand": [0] },
    pieces: {
        "post": 0, "n": 1, "e": 2, "ne": 3, "s": 4, "ns": 5, "es": 6, "nes": 7,
        "w": 8, "nw": 9, "ew": 10, "new": 11, "sw": 12, "nsw": 13, "esw": 14, "nesw": 15,
        "open_north_ew": 16, "open_north_ew_var": 17, "open_north_w": 18, "open_north_e": 19
    }
};
const masterJsonPath = path.join(ROOT, 'art', 'masters', 'wall_stone.json');
fs.writeFileSync(masterJsonPath, JSON.stringify(sidecar, null, 2));
console.log('Saved master sidecar:', masterJsonPath);

// Write RMMZ character drop-in
const rmmzPngPath = path.join(ROOT, 'game', 'img', 'characters', '!$WallStone_Set.png');
writePNG(rmmzPngPath, SHEET_W, SHEET_H, masterData);
const rmmzJsonPath = path.join(ROOT, 'game', 'img', 'characters', '!$WallStone_Set.json');
fs.writeFileSync(rmmzJsonPath, JSON.stringify(sidecar, null, 2));
console.log('Saved RMMZ character sheet:', rmmzPngPath);

// Write 4x Raw Delivery Canvas on #FF00FF (768x1920)
const rawW = SHEET_W * 4;
const rawH = SHEET_H * 4;
const rawData = Buffer.alloc(rawW * rawH * 4);
for (let y = 0; y < rawH; y++) {
    const srcY = Math.floor(y / 4);
    for (let x = 0; x < rawW; x++) {
        const srcX = Math.floor(x / 4);
        const srcIdx = (srcY * SHEET_W + srcX) * 4;
        const dstIdx = (y * rawW + x) * 4;
        if (masterData[srcIdx + 3] === 255) {
            rawData[dstIdx] = masterData[srcIdx];
            rawData[dstIdx + 1] = masterData[srcIdx + 1];
            rawData[dstIdx + 2] = masterData[srcIdx + 2];
            rawData[dstIdx + 3] = 255;
        } else {
            rawData[dstIdx] = 255;
            rawData[dstIdx + 1] = 0;
            rawData[dstIdx + 2] = 255;
            rawData[dstIdx + 3] = 255; // Opaque magenta
        }
    }
}
const rawPngPath = path.join(ROOT, 'art', 'raw', 'wall_stone.png');
writePNG(rawPngPath, rawW, rawH, rawData);
console.log('Saved 4x raw delivery:', rawPngPath);

// Write 2x Review Sheet on Magenta (384x960)
const revW = SHEET_W * 2;
const revH = SHEET_H * 2;
const revData = Buffer.alloc(revW * revH * 4);
for (let y = 0; y < revH; y++) {
    const srcY = Math.floor(y / 2);
    for (let x = 0; x < revW; x++) {
        const srcX = Math.floor(x / 2);
        const srcIdx = (srcY * SHEET_W + srcX) * 4;
        const dstIdx = (y * revW + x) * 4;
        if (masterData[srcIdx + 3] === 255) {
            revData[dstIdx] = masterData[srcIdx];
            revData[dstIdx + 1] = masterData[srcIdx + 1];
            revData[dstIdx + 2] = masterData[srcIdx + 2];
            revData[dstIdx + 3] = 255;
        } else {
            revData[dstIdx] = 255;
            revData[dstIdx + 1] = 0;
            revData[dstIdx + 2] = 255;
            revData[dstIdx + 3] = 255;
        }
    }
}
const reviewSheetPath = path.join(ROOT, 'art', 'review', 'wall_stone_connected_sheet_2x.png');
writePNG(reviewSheetPath, revW, revH, revData);
console.log('Saved 2x review sheet:', reviewSheetPath);

// Render Assembled Room Showcase (6x7 tiles = 288x336 px, matching wall_wood room)
const roomCols = 6, roomRows = 7;
const roomW = roomCols * 48;
const roomH = roomRows * 48;
const roomBuf = Buffer.alloc(roomW * roomH * 4);

// Background meadow
const meadowPng = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'meadow.png')));
for (let y = 0; y < roomH; y++) {
    for (let x = 0; x < roomW; x++) {
        const mx = x % 48;
        const my = y % 48;
        const midx = (my * meadowPng.width + mx) * 4;
        const o = (y * roomW + x) * 4;
        roomBuf[o] = meadowPng.data[midx];
        roomBuf[o + 1] = meadowPng.data[midx + 1];
        roomBuf[o + 2] = meadowPng.data[midx + 2];
        roomBuf[o + 3] = 255;
    }
}

function stampPiece(pieceIdx, tx, ty) {
    const p = pieces[pieceIdx];
    const startX = tx * 48;
    const startY = ty * 48;
    for (let py = 0; py < 96; py++) {
        for (let px = 0; px < 48; px++) {
            const rx = startX + px;
            const ry = startY + py;
            if (rx < 0 || rx >= roomW || ry < 0 || ry >= roomH) continue;
            const c = p[py][px];
            if (!c) continue;
            const o = (ry * roomW + rx) * 4;
            roomBuf[o] = c[0];
            roomBuf[o + 1] = c[1];
            roomBuf[o + 2] = c[2];
            roomBuf[o + 3] = 255;
        }
    }
}

// North Wall: (0,0)=6(E+S), (1..4,0)=10(E+W), (5,0)=12(W+S)
stampPiece(6, 0, 0);
for (let x = 1; x <= 4; x++) stampPiece(10, x, 0);
stampPiece(12, 5, 0);

// Side Walls: y=1..3
for (let y = 1; y <= 3; y++) {
    stampPiece(5, 0, y);
    stampPiece(5, 5, y);
}

// South Wall with open-north variants 16, 18, 19
stampPiece(3, 0, 4);   // SW corner (N+E)
stampPiece(18, 1, 4);  // open-north W end
stampPiece(16, 2, 4);  // open-north straight E+W
stampPiece(0, 3, 4);   // doorway post (piece 0)
stampPiece(17, 4, 4);  // open-north variant B
stampPiece(9, 5, 4);   // SE corner (N+W)

// Interior Partition:
stampPiece(14, 2, 2); // T-junction (E+S+W)
stampPiece(5, 2, 3);  // vertical wall (N+S)

const room1xPath = path.join(ROOT, 'art', 'review', 'wall_stone_connected_room_1x.png');
writePNG(room1xPath, roomW, roomH, roomBuf);

// 2x Zoom Room Render
const room2xW = roomW * 2;
const room2xH = roomH * 2;
const room2xData = Buffer.alloc(room2xW * room2xH * 4);
for (let y = 0; y < room2xH; y++) {
    const srcY = Math.floor(y / 2);
    for (let x = 0; x < room2xW; x++) {
        const srcX = Math.floor(x / 2);
        const srcIdx = (srcY * roomW + srcX) * 4;
        const dstIdx = (y * room2xW + x) * 4;
        room2xData[dstIdx] = roomBuf[srcIdx];
        room2xData[dstIdx + 1] = roomBuf[srcIdx + 1];
        room2xData[dstIdx + 2] = roomBuf[srcIdx + 2];
        room2xData[dstIdx + 3] = 255;
    }
}
const room2xPath = path.join(ROOT, 'art', 'review', 'wall_stone_connected_room_2x.png');
writePNG(room2xPath, room2xW, room2xH, room2xData);
console.log('Saved room review renders:', room1xPath, 'and', room2xPath);
