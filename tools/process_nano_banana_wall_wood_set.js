const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');
const NANO_PNG = path.join(ROOT, 'scratch', 'wall_wood_connected.png');
const ANCHOR_PNG = path.join(ROOT, 'scratch', 'wall_wood_anchor_piece10.png');

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
    const lab = unique.map(c => srgbToLab(...c));
    const cache = new Map();
    return {
        snap(r, g, b) {
            // Strict fringe elimination
            if (r > g * 1.25 && b > g * 1.25) {
                r = Math.min(50, Math.round(g * 1.1));
                b = Math.min(25, Math.round(g * 0.8));
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

// Load Anchor 3 straight wall (48x96)
const anchorImg = decodePNG(fs.readFileSync(ANCHOR_PNG));
function getAnchorPx(x, y) {
    const o = (y * 48 + x) * 4;
    return [anchorImg.data[o], anchorImg.data[o + 1], anchorImg.data[o + 2]];
}

// Load Nano Banana output
const nanoImg = decodePNG(fs.readFileSync(NANO_PNG));
function getNanoPx(x, y) {
    if (x < 0 || x >= nanoImg.width || y < 0 || y >= nanoImg.height) return [255, 0, 255];
    const o = (y * nanoImg.width + x) * 4;
    return [nanoImg.data[o], nanoImg.data[o + 1], nanoImg.data[o + 2]];
}

function isBgPixel(r, g, b) {
    if (r > 140 && g < 100 && b > 140) return true;
    if (r > 120 && b > 120 && g < 90) return true;
    if (r > g * 1.30 && b > g * 1.30) return true;
    return false;
}

// Extract scaled, snapped 48x48 block from Nano bounding box with strict fringe cleanup
function extractBlock(minX, minY, maxX, maxY, outW = 48, outH = 48) {
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

            if (count > (srcY1 - srcY0) * (srcX1 - srcX0) * 0.20) {
                let avgR = Math.round(sumR / count);
                let avgG = Math.round(sumG / count);
                let avgB = Math.round(sumB / count);
                if (avgR > avgG * 1.2 && avgB > avgG * 1.2) {
                    avgR = 36; avgG = 24; avgB = 12;
                }
                block[gy][gx] = pal.snap(avgR, avgG, avgB);
            }
        }
    }
    return block;
}

// 2. North Palisade Face: [343, 20] to [901, 312] (559x293)
const northPalisadeFace = extractBlock(343, 20, 901, 312, 48, 48);

// Base Anchor 3 horizontal piece (piece 10)
const anchorGrid = Array.from({ length: 96 }, (_, y) =>
    Array.from({ length: 48 }, (_, x) => getAnchorPx(x, y))
);

// Wood texture palettes from Anchor 3
const COL_OUTLINE = pal.snap(32, 20, 8);      // #201408
const COL_DEEP = pal.snap(45, 28, 12);        // #2d1c08
const COL_SHADOW = pal.snap(61, 45, 36);      // #3d2d24
const COL_DARK = pal.snap(85, 61, 49);        // #553d31
const COL_MID = pal.snap(109, 77, 61);        // #6d4d3d
const COL_LIGHT = pal.snap(138, 93, 45);      // #8a5d2d
const COL_HIGHLIGHT = pal.snap(174, 101, 61);  // #ae653d
const COL_PALE = pal.snap(190, 130, 93);      // #be825d

// Piece structure: 48 wide x 96 high
// Rows 0..47: Walkway / Roof
// Rows 48..95: Front Face / South Face
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
        // Isolated post front face: continues the single log post down to ground row 95
        for (let y = 48; y < 96; y++) {
            for (let x = 0; x < 48; x++) {
                if (x >= 14 && x <= 33) {
                    const logX = x - 14;
                    if (y === 60 || y === 61 || y === 84 || y === 85) {
                        // Hemp rope lashing bands
                        piece[y][x] = (x < 24) ? COL_PALE : COL_LIGHT;
                    } else if (logX === 0 || logX === 19) {
                        piece[y][x] = COL_OUTLINE;
                    } else if (logX <= 3) {
                        piece[y][x] = COL_HIGHLIGHT;
                    } else if (logX <= 10) {
                        piece[y][x] = COL_LIGHT;
                    } else if (logX <= 16) {
                        piece[y][x] = COL_MID;
                    } else {
                        piece[y][x] = COL_DARK;
                    }
                } else {
                    piece[y][x] = null;
                }
            }
        }
    } else {
        // Continuous palisade front face
        for (let y = 48; y < 96; y++) {
            for (let x = 0; x < 48; x++) {
                piece[y][x] = anchorGrid[y][x];
            }
        }

        // Left boundary if !w
        if (!w) {
            for (let y = 48; y < 96; y++) {
                piece[y][0] = COL_OUTLINE;
                piece[y][1] = COL_DEEP;
                piece[y][2] = COL_SHADOW;
                if (y <= 52) piece[y][0] = COL_OUTLINE;
            }
        }

        // Right boundary if !e
        if (!e) {
            for (let y = 48; y < 96; y++) {
                piece[y][47] = COL_OUTLINE;
                piece[y][46] = COL_DEEP;
                piece[y][45] = COL_SHADOW;
            }
        }
    }

    // -------------------------------------------------------------
    // 2. TOP ROOF / WALKWAY (rows 0..47)
    // -------------------------------------------------------------
    if (isOpenNorthVariant) {
        // Pieces 16-19: Open-North East-West runs
        // Displays north palisade face on rows 0..27, and horizontal timber deck on rows 28..47
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                if (y < 28) {
                    const np = northPalisadeFace[Math.min(47, y + 8)][x];
                    piece[y][x] = np || anchorGrid[y][x];
                } else {
                    piece[y][x] = anchorGrid[y][x];
                }
            }
        }

        if (variant === 3) { // piece 18: W end
            for (let y = 0; y < 28; y++) {
                piece[y][0] = COL_OUTLINE;
                piece[y][1] = COL_DEEP;
            }
        } else if (variant === 4) { // piece 19: E end
            for (let y = 0; y < 28; y++) {
                piece[y][47] = COL_OUTLINE;
                piece[y][46] = COL_DEEP;
            }
        } else if (variant === 2) { // piece 17: variant B
            for (let x = 0; x < 48; x++) {
                if (x % 6 === 0) {
                    piece[17][x] = COL_DEEP;
                    piece[18][x] = COL_LIGHT;
                }
            }
        }
    } else if (mask === 0) {
        // Isolated post top (piece 0):
        // Rows 0..7: empty
        // Rows 8..20: Pointed defensive stake head!
        // Rows 21..47: Cylindrical post shaft with rope lashing at rows 34..35
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                if (x >= 14 && x <= 33) {
                    const logX = x - 14;
                    if (y < 8) {
                        piece[y][x] = null;
                    } else if (y <= 20) {
                        // Pointed stake head
                        const distToCenter = Math.abs(x - 23.5);
                        const slopeY = Math.floor(8 + distToCenter * 1.35);
                        if (y < slopeY) {
                            piece[y][x] = null;
                        } else if (y === slopeY) {
                            piece[y][x] = COL_OUTLINE;
                        } else if (x < 24) {
                            piece[y][x] = COL_LIGHT;
                        } else {
                            piece[y][x] = COL_MID;
                        }
                    } else if (y === 34 || y === 35) {
                        // Upper rope lashing
                        piece[y][x] = (x < 24) ? COL_PALE : COL_LIGHT;
                    } else if (logX === 0 || logX === 19) {
                        piece[y][x] = COL_OUTLINE;
                    } else if (logX <= 3) {
                        piece[y][x] = COL_HIGHLIGHT;
                    } else if (logX <= 10) {
                        piece[y][x] = COL_LIGHT;
                    } else if (logX <= 16) {
                        piece[y][x] = COL_MID;
                    } else {
                        piece[y][x] = COL_DARK;
                    }
                } else {
                    piece[y][x] = null;
                }
            }
        }
    } else if (mask === 5 || mask === 1 || mask === 4) {
        // Vertical runs (piece 5: N+S, piece 1: N, piece 4: S)
        // Walkway runs North to South across center (columns 12..35)
        // Left parapet rail on columns 0..11, right parapet rail on columns 36..47
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                if (x < 12) {
                    // West parapet rail
                    if (x === 0 || x === 11) piece[y][x] = COL_OUTLINE;
                    else if (x <= 4) piece[y][x] = COL_HIGHLIGHT;
                    else if (x <= 8) piece[y][x] = COL_LIGHT;
                    else piece[y][x] = COL_DARK;
                } else if (x > 35) {
                    // East parapet rail
                    if (x === 36 || x === 47) piece[y][x] = COL_OUTLINE;
                    else if (x <= 40) piece[y][x] = COL_LIGHT;
                    else piece[y][x] = COL_DARK;
                } else {
                    // Vertical timber walkway planks
                    const isPlankBorder = (x === 12 || x === 20 || x === 28 || x === 35);
                    const isCrossSeam = (y % 16 === 0);
                    if (isPlankBorder || isCrossSeam) {
                        piece[y][x] = COL_DEEP;
                    } else if (x < 20) {
                        piece[y][x] = (y % 16 === 1) ? COL_PALE : COL_LIGHT;
                    } else if (x < 28) {
                        piece[y][x] = (y % 16 === 1) ? COL_HIGHLIGHT : COL_MID;
                    } else {
                        piece[y][x] = COL_DARK;
                    }
                }
            }
        }

        // If dead-ending at North (!n): add North timber curb on rows 0..6
        if (!n) {
            for (let y = 0; y <= 6; y++) {
                for (let x = 12; x <= 35; x++) {
                    piece[y][x] = (y === 0) ? COL_OUTLINE : (y === 1 ? COL_PALE : COL_MID);
                }
            }
        }
        // If dead-ending at South (!s): add South timber curb on rows 42..47
        if (!s) {
            for (let y = 42; y < 48; y++) {
                for (let x = 12; x <= 35; x++) {
                    piece[y][x] = (y === 47) ? COL_OUTLINE : (y === 42 ? COL_LIGHT : COL_DARK);
                }
            }
        }
    } else if (mask === 10) {
        // Standard straight horizontal E-W run (piece 10)
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                piece[y][x] = anchorGrid[y][x];
            }
        }
    } else {
        // Corner and T-junction Walkway Compositing
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                piece[y][x] = anchorGrid[y][x];
            }
        }

        // Vertical corridor overlay if N or S connects:
        if (n || s) {
            const yStart = n ? 0 : 20;
            const yEnd = s ? 48 : 38;
            for (let y = yStart; y < yEnd; y++) {
                for (let x = 14; x <= 33; x++) {
                    const isBorder = (x === 14 || x === 33);
                    const isSeam = (y % 16 === 0);
                    if (isBorder || isSeam) {
                        piece[y][x] = COL_DEEP;
                    } else {
                        piece[y][x] = (x < 24) ? COL_LIGHT : COL_MID;
                    }
                }
            }
        }

        // If West is closed (!w): Solid West parapet rail on columns 0..11
        if (!w) {
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x <= 11; x++) {
                    if (x === 0 || x === 11) piece[y][x] = COL_OUTLINE;
                    else if (x <= 4) piece[y][x] = COL_HIGHLIGHT;
                    else piece[y][x] = COL_DARK;
                }
            }
        }

        // If East is closed (!e): Solid East parapet rail on columns 36..47
        if (!e) {
            for (let y = 0; y < 48; y++) {
                for (let x = 36; x < 48; x++) {
                    if (x === 36 || x === 47) piece[y][x] = COL_OUTLINE;
                    else if (x <= 40) piece[y][x] = COL_LIGHT;
                    else piece[y][x] = COL_DARK;
                }
            }
        }

        // If North is closed (!n): Solid North parapet beam on rows 0..20
        if (!n) {
            for (let y = 0; y <= 20; y++) {
                for (let x = 0; x < 48; x++) {
                    piece[y][x] = anchorGrid[y][x];
                }
            }
        }

        // Clean corner post joinery:
        if (!n && !w) {
            for (let y = 0; y <= 22; y++) {
                for (let x = 0; x <= 12; x++) {
                    if (x === 0 || y === 0 || x === 12 || y === 22) piece[y][x] = COL_OUTLINE;
                    else piece[y][x] = (x < 6 && y < 11) ? COL_HIGHLIGHT : COL_MID;
                }
            }
        }
        if (!n && !e) {
            for (let y = 0; y <= 22; y++) {
                for (let x = 35; x < 48; x++) {
                    if (x === 35 || y === 0 || x === 47 || y === 22) piece[y][x] = COL_OUTLINE;
                    else piece[y][x] = (x < 41 && y < 11) ? COL_LIGHT : COL_DARK;
                }
            }
        }
    }

    // Ground contact line on row 95 (where piece is not transparent)
    for (let x = 0; x < 48; x++) {
        if (piece[95][x] !== null) {
            piece[95][x] = COL_OUTLINE;
        }
    }

    return piece;
}

// Build all 20 pieces
const pieces = [];
for (let idx = 0; idx < 20; idx++) {
    if (idx < 16) {
        pieces.push(createPiece(idx, 0));
    } else if (idx === 16) {
        pieces.push(createPiece(10, 1)); // open-north E+W run A
    } else if (idx === 17) {
        pieces.push(createPiece(10, 2)); // open-north E+W run B
    } else if (idx === 18) {
        pieces.push(createPiece(8, 3));  // open-north W end
    } else if (idx === 19) {
        pieces.push(createPiece(2, 4));  // open-north E end
    }
}

// Assemble 1x master sheet: 4 cols x 5 rows of 48x96
const cols = 4, rows = 5;
const pw = 48, ph = 96;
const masterW = cols * pw; // 192
const masterH = rows * ph; // 480
const masterBuf = Buffer.alloc(masterW * masterH * 4);

// Palette check and snap
const usedColors = new Map();
for (let i = 0; i < 20; i++) {
    const p = pieces[i];
    for (let y = 0; y < ph; y++) {
        for (let x = 0; x < pw; x++) {
            const c = p[y][x];
            if (!c) continue;
            const k = (c[0] << 16) | (c[1] << 8) | c[2];
            usedColors.set(k, (usedColors.get(k) || 0) + 1);
        }
    }
}

console.log(`Unique colors used across 20 pieces: ${usedColors.size}`);
let topPalette = [...usedColors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 32).map(([k]) => [
    (k >> 16) & 255, (k >> 8) & 255, k & 255
]);
const topLab = topPalette.map(c => srgbToLab(...c));

for (let i = 0; i < 20; i++) {
    const p = pieces[i];
    const cCol = i % cols;
    const cRow = Math.floor(i / cols);

    for (let y = 0; y < ph; y++) {
        for (let x = 0; x < pw; x++) {
            let c = p[y][x];
            const outX = cCol * pw + x;
            const outY = cRow * ph + y;
            const o = (outY * masterW + outX) * 4;

            if (!c) {
                // Transparent background (alpha 0)
                masterBuf[o] = 0;
                masterBuf[o + 1] = 0;
                masterBuf[o + 2] = 0;
                masterBuf[o + 3] = 0;
            } else {
                const k = (c[0] << 16) | (c[1] << 8) | c[2];
                const isTop = topPalette.some(tc => ((tc[0] << 16) | (tc[1] << 8) | tc[2]) === k);
                if (!isTop) {
                    const l = srgbToLab(...c);
                    let best = topPalette[0], bd = Infinity;
                    for (let j = 0; j < topLab.length; j++) {
                        const d = labDist(l, topLab[j]);
                        if (d < bd) { bd = d; best = topPalette[j]; }
                    }
                    c = best;
                }

                masterBuf[o] = c[0];
                masterBuf[o + 1] = c[1];
                masterBuf[o + 2] = c[2];
                masterBuf[o + 3] = 255;
            }
        }
    }
}

// 1. Save 1x Master: art/masters/wall_wood.png
const masterFile = path.join(ROOT, 'art', 'masters', 'wall_wood.png');
writePNG(masterFile, masterW, masterH, masterBuf);
console.log(`Saved master: ${masterFile} (${masterW}x${masterH})`);

// 2. Save Sidecar: art/masters/wall_wood.json
const sidecar = {
    id: "wall_wood",
    name: "Wooden Palisade Wall (Connected 20-Piece Set)",
    category: "Site",
    frameWidth: 48,
    frameHeight: 96,
    anchor: [24, 95],
    footprint: [1, 2],
    facings: ["S"],
    animations: {
        stand: [0]
    },
    pieces: {
        post: 0,
        n: 1,
        e: 2,
        ne: 3,
        s: 4,
        ns: 5,
        es: 6,
        nes: 7,
        w: 8,
        nw: 9,
        ew: 10,
        new: 11,
        sw: 12,
        nsw: 13,
        esw: 14,
        nesw: 15,
        open_north_ew: 16,
        open_north_ew_var: 17,
        open_north_w: 18,
        open_north_e: 19
    }
};
const sidecarFile = path.join(ROOT, 'art', 'masters', 'wall_wood.json');
fs.writeFileSync(sidecarFile, JSON.stringify(sidecar, null, 2));
console.log(`Saved sidecar: ${sidecarFile}`);

// 3. Save 4x raw delivery: art/raw/wall_wood.png (768x1920)
const rawW = masterW * 4;
const rawH = masterH * 4;
const rawBuf = Buffer.alloc(rawW * rawH * 4);
for (let y = 0; y < rawH; y++) {
    for (let x = 0; x < rawW; x++) {
        const srcX = Math.floor(x / 4);
        const srcY = Math.floor(y / 4);
        const srcO = (srcY * masterW + srcX) * 4;
        const dstO = (y * rawW + x) * 4;
        if (masterBuf[srcO + 3] === 0) {
            rawBuf[dstO] = 255;
            rawBuf[dstO + 1] = 0;
            rawBuf[dstO + 2] = 255;
            rawBuf[dstO + 3] = 255;
        } else {
            rawBuf[dstO] = masterBuf[srcO];
            rawBuf[dstO + 1] = masterBuf[srcO + 1];
            rawBuf[dstO + 2] = masterBuf[srcO + 2];
            rawBuf[dstO + 3] = masterBuf[srcO + 3];
        }
    }
}
const rawFile = path.join(ROOT, 'art', 'raw', 'wall_wood.png');
writePNG(rawFile, rawW, rawH, rawBuf);
console.log(`Saved 4x raw delivery: ${rawFile} (${rawW}x${rawH})`);

// 4. Export to game/img/characters/!$WallWood_Set.png and sidecar
const gameFile = path.join(ROOT, 'game', 'img', 'characters', '!$WallWood_Set.png');
writePNG(gameFile, masterW, masterH, masterBuf);
const gameSidecar = path.join(ROOT, 'game', 'img', 'characters', '!$WallWood_Set.json');
fs.writeFileSync(gameSidecar, JSON.stringify(sidecar, null, 2));
console.log(`Exported game charset: ${gameFile}`);

// 5. Render Test Room Showcase (6x6 tiles = 288x336 px)
const roomCols = 6, roomRows = 7;
const roomW = roomCols * 48;
const roomH = roomRows * 48;
const roomBuf = Buffer.alloc(roomW * roomH * 4);

// Fill with meadow ground
const meadowPath = path.join(ROOT, 'art', 'masters', 'meadow.png');
let meadowDec = null;
if (fs.existsSync(meadowPath)) {
    meadowDec = decodePNG(fs.readFileSync(meadowPath));
}
for (let y = 0; y < roomH; y++) {
    for (let x = 0; x < roomW; x++) {
        const o = (y * roomW + x) * 4;
        let r = 77, g = 93, b = 40;
        if (meadowDec) {
            const mo = ((y % 48) * meadowDec.width + (x % 48)) * 4;
            r = meadowDec.data[mo]; g = meadowDec.data[mo + 1]; b = meadowDec.data[mo + 2];
        }
        roomBuf[o] = r; roomBuf[o + 1] = g; roomBuf[o + 2] = b; roomBuf[o + 3] = 255;
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
            if (!c) continue; // transparent
            const o = (ry * roomW + rx) * 4;
            roomBuf[o] = c[0]; roomBuf[o + 1] = c[1]; roomBuf[o + 2] = c[2]; roomBuf[o + 3] = 255;
        }
    }
}

// North Wall: (0,0)=6(NW: E+S), (1..4,0)=10(horiz: E+W), (5,0)=12(NE: W+S)
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

// Save Room Review at 1x, 2x, 3x
const roomRevFile = path.join(ROOT, 'art', 'review', 'wall_wood_connected_room_1x.png');
writePNG(roomRevFile, roomW, roomH, roomBuf);

const room2xW = roomW * 2, room2xH = roomH * 2;
const room2xBuf = Buffer.alloc(room2xW * room2xH * 4);
for (let y = 0; y < room2xH; y++) {
    for (let x = 0; x < room2xW; x++) {
        const srcO = (Math.floor(y / 2) * roomW + Math.floor(x / 2)) * 4;
        const dstO = (y * room2xW + x) * 4;
        room2xBuf[dstO] = roomBuf[srcO];
        room2xBuf[dstO + 1] = roomBuf[srcO + 1];
        room2xBuf[dstO + 2] = roomBuf[srcO + 2];
        room2xBuf[dstO + 3] = 255;
    }
}
const room2xFile = path.join(ROOT, 'art', 'review', 'wall_wood_connected_room_2x.png');
writePNG(room2xFile, room2xW, room2xH, room2xBuf);

// 2x sheet review: 384x960
const sheet2xW = masterW * 2, sheet2xH = masterH * 2;
const sheet2xBuf = Buffer.alloc(sheet2xW * sheet2xH * 4);
for (let y = 0; y < sheet2xH; y++) {
    for (let x = 0; x < sheet2xW; x++) {
        const srcO = (Math.floor(y / 2) * masterW + Math.floor(x / 2)) * 4;
        const dstO = (y * sheet2xW + x) * 4;
        sheet2xBuf[dstO] = masterBuf[srcO];
        sheet2xBuf[dstO + 1] = masterBuf[srcO + 1];
        sheet2xBuf[dstO + 2] = masterBuf[srcO + 2];
        sheet2xBuf[dstO + 3] = 255;
    }
}
const sheet2xFile = path.join(ROOT, 'art', 'review', 'wall_wood_connected_sheet_2x.png');
writePNG(sheet2xFile, sheet2xW, sheet2xH, sheet2xBuf);

console.log('Saved updated clean review renders.');
