const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
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

function isBg(r, g, b) {
    return (r > 160 && g < 80 && b > 160) || (r > 200 && b > 200 && g < 50);
}

function snap(r, g, b) {
    if (isBg(r, g, b)) return [0, 0, 0, 0];
    const key = (r << 16) | (g << 8) | b;
    if (cache.has(key)) return cache.get(key);
    const l = srgbToLab(r, g, b);
    let best = palRGB[0], bd = Infinity;
    for (let i = 0; i < palLab.length; i++) {
        const d = Math.hypot(l[0] - palLab[i][0], l[1] - palLab[i][1], l[2] - palLab[i][2]);
        if (d < bd) { bd = d; best = palRGB[i]; }
    }
    cache.set(key, best);
    return best;
}

// ----------------------------------------------------------------------------
// 2. Load Authentic Nano Banana 2 Raw Generations
// ----------------------------------------------------------------------------
const woodRaw = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'wall_wood_nano_banana_raw.png')));
const stoneRaw = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'wall_stone_nano_banana_raw.png')));

// Helper to sample a sub-rectangle from raw and downsample with box averaging + palette snapping
function sampleBlock(src, sx, sy, sw, sh, dw, dh, threshold = 0.25) {
    const buf = Buffer.alloc(dw * dh * 4);
    for (let dy = 0; dy < dh; dy++) {
        for (let dx = 0; dx < dw; dx++) {
            const startX = Math.round(sx + (dx * sw / dw));
            const endX = Math.round(sx + ((dx + 1) * sw / dw));
            const startY = Math.round(sy + (dy * sh / dh));
            const endY = Math.round(sy + ((dy + 1) * sh / dh));

            let rSum = 0, gSum = 0, bSum = 0, count = 0;
            for (let py = startY; py < endY; py++) {
                if (py < 0 || py >= src.height) continue;
                for (let px = startX; px < endX; px++) {
                    if (px < 0 || px >= src.width) continue;
                    const si = (py * src.width + px) * 4;
                    const r = src.data[si], g = src.data[si + 1], b = src.data[si + 2];
                    if (!isBg(r, g, b)) {
                        rSum += r; gSum += g; bSum += b; count++;
                    }
                }
            }
            const di = (dy * dw + dx) * 4;
            const total = Math.max(1, (endX - startX) * (endY - startY));
            if (count / total > threshold) {
                const sn = snap(Math.round(rSum / count), Math.round(gSum / count), Math.round(bSum / count));
                buf[di] = sn[0];
                buf[di + 1] = sn[1];
                buf[di + 2] = sn[2];
                buf[di + 3] = 255;
            } else {
                buf[di + 3] = 0;
            }
        }
    }
    return buf;
}

function blit(dst, dw, dh, src, sw, sh, dx, dy, sx = 0, sy = 0, w = sw, h = sh) {
    for (let y = 0; y < h; y++) {
        const destY = dy + y;
        const srcY = sy + y;
        if (destY < 0 || destY >= dh || srcY < 0 || srcY >= sh) continue;
        for (let x = 0; x < w; x++) {
            const destX = dx + x;
            const srcX = sx + x;
            if (destX < 0 || destX >= dw || srcX < 0 || srcX >= sw) continue;
            const si = (srcY * sw + srcX) * 4;
            const a = src[si + 3];
            if (a > 0) {
                const di = (destY * dw + destX) * 4;
                dst[di] = src[si];
                dst[di + 1] = src[si + 1];
                dst[di + 2] = src[si + 2];
                dst[di + 3] = 255;
            }
        }
    }
}

// ----------------------------------------------------------------------------
// 3. Pre-extract Nano Banana Components at Native Scale (48w or 96h)
// ----------------------------------------------------------------------------

// === WOOD COMPONENTS ===
// 1. Full North horizontal wall (48x96): top beam + plank face + baseboard
const woodHorizFull = sampleBlock(woodRaw, 0, 0, 192, 256, 48, 96);
const woodHorizFull2 = sampleBlock(woodRaw, 192, 0, 192, 256, 48, 96);

// 2. Low South horizontal wall (48x48): top trim + plank face + baseboard
const woodSouthLow = sampleBlock(woodRaw, 545, 770, 192, 185, 48, 48);
const woodSouthLow2 = sampleBlock(woodRaw, 590, 770, 192, 185, 48, 48);

// 3. Vertical timber post / column (16x96)
const woodCol16 = sampleBlock(woodRaw, 448, 0, 60, 512, 16, 96);
const woodPost16 = sampleBlock(woodRaw, 955, 255, 65, 240, 16, 96);

// 4. Low vertical post (16x48)
const woodPostLow16 = sampleBlock(woodRaw, 955, 375, 65, 120, 16, 48);

// === STONE COMPONENTS ===
// 1. Full North horizontal wall (48x96): coping + ashlar stone face + foundation
const stoneHorizFull = sampleBlock(stoneRaw, 0, 0, 192, 256, 48, 96);
const stoneHorizFull2 = sampleBlock(stoneRaw, 192, 0, 192, 256, 48, 96);

// 2. Low South horizontal wall (48x48): coping + ashlar stone face + foundation
const stoneSouthLow = sampleBlock(stoneRaw, 672, 830, 192, 190, 48, 48);
const stoneSouthLow2 = sampleBlock(stoneRaw, 720, 830, 192, 190, 48, 48);

// 3. Vertical stone wall column (16x96)
const stoneCol16 = sampleBlock(stoneRaw, 448, 0, 64, 256, 16, 96);

// 4. Carved stone pillar / isolated post (18x96)
const stonePillar18 = sampleBlock(stoneRaw, 455, 685, 95, 260, 18, 96);

// 5. Low stone post (16x48)
const stonePostLow16 = sampleBlock(stoneRaw, 448, 128, 64, 128, 16, 48);

// ----------------------------------------------------------------------------
// 4. Piece Builder Functions (20 Frames: 48 x 96 px)
// ----------------------------------------------------------------------------

function createBlankFrame() {
    return Buffer.alloc(48 * 96 * 4);
}

// === BUILD WOOD FRAME ===
function buildWoodPiece(idx) {
    const f = createBlankFrame();

    switch (idx) {
        case 0: // Isolated Column
            blit(f, 48, 96, woodPost16, 16, 96, 16, 0);
            break;

        case 1: // End Cap North (connected only to North -> South end of vertical run)
            // Top 0..47 transparent, bottom 48..95 has post
            blit(f, 48, 96, woodPostLow16, 16, 48, 16, 48);
            break;

        case 2: // End Cap East (West end of horizontal run: cap on left, wall extends right)
            blit(f, 48, 96, woodHorizFull, 48, 96, 0, 0, 12, 0, 36, 96);
            blit(f, 48, 96, woodCol16, 16, 96, 0, 0, 0, 0, 16, 96);
            break;

        case 3: // Corner NE (connects North & East -> Bottom-West corner of room)
            // Non-occluding South-facing: rows 0..47 transparent!
            // Rows 48..95: West post + low wall extending East
            blit(f, 48, 96, woodSouthLow, 48, 48, 16, 48, 16, 0, 32, 48);
            blit(f, 48, 96, woodPostLow16, 16, 48, 0, 48, 0, 0, 16, 48);
            break;

        case 4: // End Cap South (North end of vertical wall: wall extends South)
            blit(f, 48, 96, woodCol16, 16, 96, 16, 0);
            break;

        case 5: // Vertical Run (N+S)
            blit(f, 48, 96, woodCol16, 16, 96, 16, 0);
            break;

        case 6: // Corner SE (connects East & South -> Top-West / NW corner of room)
            // Left post running South + horizontal beam/wall extending East
            blit(f, 48, 96, woodHorizFull, 48, 96, 16, 0, 16, 0, 32, 96);
            blit(f, 48, 96, woodCol16, 16, 96, 0, 0, 0, 0, 16, 96);
            break;

        case 7: // T-Junction East (N+E+S)
            blit(f, 48, 96, woodHorizFull, 48, 96, 16, 0, 16, 0, 32, 96);
            blit(f, 48, 96, woodCol16, 16, 96, 0, 0, 0, 0, 16, 96);
            break;

        case 8: // End Cap West (East end of horizontal run: wall extends left, cap on right)
            blit(f, 48, 96, woodHorizFull, 48, 96, 0, 0, 0, 0, 36, 96);
            blit(f, 48, 96, woodCol16, 16, 96, 32, 0, 0, 0, 16, 96);
            break;

        case 9: // Corner NW (connects North & West -> Bottom-East corner of room)
            // Non-occluding South-facing: rows 0..47 transparent!
            // Rows 48..95: Low wall extending West + East post
            blit(f, 48, 96, woodSouthLow, 48, 48, 0, 48, 0, 0, 32, 48);
            blit(f, 48, 96, woodPostLow16, 16, 48, 32, 48, 0, 0, 16, 48);
            break;

        case 10: // Horizontal Run (E+W: North horizontal wall)
            blit(f, 48, 96, woodHorizFull, 48, 96, 0, 0);
            break;

        case 11: // T-Junction North (N+E+W: South wall meeting interior partition going North)
            // Rows 0..47 transparent! Rows 48..95 low wall with center join
            blit(f, 48, 96, woodSouthLow, 48, 48, 0, 48);
            blit(f, 48, 96, woodPostLow16, 16, 48, 16, 48);
            break;

        case 12: // Corner SW (connects West & South -> Top-East / NE corner of room)
            // Right post running South + horizontal beam/wall extending West
            blit(f, 48, 96, woodHorizFull, 48, 96, 0, 0, 0, 0, 32, 96);
            blit(f, 48, 96, woodCol16, 16, 96, 32, 0, 0, 0, 16, 96);
            break;

        case 13: // T-Junction West (N+S+W)
            blit(f, 48, 96, woodHorizFull, 48, 96, 0, 0, 0, 0, 32, 96);
            blit(f, 48, 96, woodCol16, 16, 96, 32, 0, 0, 0, 16, 96);
            break;

        case 14: // T-Junction South (E+S+W)
            blit(f, 48, 96, woodHorizFull, 48, 96, 0, 0);
            blit(f, 48, 96, woodCol16, 16, 96, 16, 48, 0, 48, 16, 48);
            break;

        case 15: // 4-Way Cross Junction (N+E+S+W)
            blit(f, 48, 96, woodHorizFull, 48, 96, 0, 0);
            blit(f, 48, 96, woodCol16, 16, 96, 16, 0, 0, 0, 16, 24);
            blit(f, 48, 96, woodCol16, 16, 96, 16, 48, 0, 48, 16, 48);
            break;

        case 16: // South Horizontal Run (low wall, non-occluding)
            // Rows 0..47 transparent! Rows 48..95 low wall
            blit(f, 48, 96, woodSouthLow, 48, 48, 0, 48);
            break;

        case 17: // South Horizontal Run Variant 2
            blit(f, 48, 96, woodSouthLow2, 48, 48, 0, 48);
            break;

        case 18: // South Horizontal Run with West end (doorway left)
            blit(f, 48, 96, woodSouthLow, 48, 48, 12, 48, 12, 0, 36, 48);
            blit(f, 48, 96, woodPostLow16, 16, 48, 0, 48);
            break;

        case 19: // South Horizontal Run with East end (doorway right)
            blit(f, 48, 96, woodSouthLow, 48, 48, 0, 48, 0, 0, 36, 48);
            blit(f, 48, 96, woodPostLow16, 16, 48, 32, 48);
            break;
    }

    return f;
}

// === BUILD STONE FRAME ===
function buildStonePiece(idx) {
    const f = createBlankFrame();

    switch (idx) {
        case 0: // Isolated Pillar
            blit(f, 48, 96, stonePillar18, 18, 96, 15, 0);
            break;

        case 1: // End Cap North (connected only to North -> South end of vertical run)
            // Rows 0..47 transparent, rows 48..95 end cap
            blit(f, 48, 96, stonePostLow16, 16, 48, 16, 48);
            break;

        case 2: // End Cap East (West end of horizontal run: cap on left, wall extends right)
            blit(f, 48, 96, stoneHorizFull, 48, 96, 0, 0, 12, 0, 36, 96);
            blit(f, 48, 96, stoneCol16, 16, 96, 0, 0, 0, 0, 16, 96);
            break;

        case 3: // Corner NE (connects North & East -> Bottom-West corner of room)
            // Non-occluding South-facing: rows 0..47 transparent!
            // Rows 48..95: West post + low stone wall extending East
            blit(f, 48, 96, stoneSouthLow, 48, 48, 16, 48, 16, 0, 32, 48);
            blit(f, 48, 96, stonePostLow16, 16, 48, 0, 48, 0, 0, 16, 48);
            break;

        case 4: // End Cap South (North end of vertical wall: wall extends South)
            blit(f, 48, 96, stoneCol16, 16, 96, 16, 0);
            break;

        case 5: // Vertical Run (N+S)
            blit(f, 48, 96, stoneCol16, 16, 96, 16, 0);
            break;

        case 6: // Corner SE (connects East & South -> Top-West / NW corner of room)
            // Left post running South + horizontal stone wall extending East
            blit(f, 48, 96, stoneHorizFull, 48, 96, 16, 0, 16, 0, 32, 96);
            blit(f, 48, 96, stoneCol16, 16, 96, 0, 0, 0, 0, 16, 96);
            break;

        case 7: // T-Junction East (N+E+S)
            blit(f, 48, 96, stoneHorizFull, 48, 96, 16, 0, 16, 0, 32, 96);
            blit(f, 48, 96, stoneCol16, 16, 96, 0, 0, 0, 0, 16, 96);
            break;

        case 8: // End Cap West (East end of horizontal run: wall extends left, cap on right)
            blit(f, 48, 96, stoneHorizFull, 48, 96, 0, 0, 0, 0, 36, 96);
            blit(f, 48, 96, stoneCol16, 16, 96, 32, 0, 0, 0, 16, 96);
            break;

        case 9: // Corner NW (connects North & West -> Bottom-East corner of room)
            // Non-occluding South-facing: rows 0..47 transparent!
            // Rows 48..95: Low stone wall extending West + East post
            blit(f, 48, 96, stoneSouthLow, 48, 48, 0, 48, 0, 0, 32, 48);
            blit(f, 48, 96, stonePostLow16, 16, 48, 32, 48, 0, 0, 16, 48);
            break;

        case 10: // Horizontal Run (E+W: North horizontal wall)
            blit(f, 48, 96, stoneHorizFull, 48, 96, 0, 0);
            break;

        case 11: // T-Junction North (N+E+W: South wall meeting interior partition going North)
            // Rows 0..47 transparent! Rows 48..95 low stone wall with center join
            blit(f, 48, 96, stoneSouthLow, 48, 48, 0, 48);
            blit(f, 48, 96, stonePostLow16, 16, 48, 16, 48);
            break;

        case 12: // Corner SW (connects West & South -> Top-East / NE corner of room)
            // Right post running South + horizontal stone wall extending West
            blit(f, 48, 96, stoneHorizFull, 48, 96, 0, 0, 0, 0, 32, 96);
            blit(f, 48, 96, stoneCol16, 16, 96, 32, 0, 0, 0, 16, 96);
            break;

        case 13: // T-Junction West (N+S+W)
            blit(f, 48, 96, stoneHorizFull, 48, 96, 0, 0, 0, 0, 32, 96);
            blit(f, 48, 96, stoneCol16, 16, 96, 32, 0, 0, 0, 16, 96);
            break;

        case 14: // T-Junction South (E+S+W)
            blit(f, 48, 96, stoneHorizFull, 48, 96, 0, 0);
            blit(f, 48, 96, stoneCol16, 16, 96, 16, 48, 0, 48, 16, 48);
            break;

        case 15: // 4-Way Cross Junction (N+E+S+W)
            blit(f, 48, 96, stoneHorizFull, 48, 96, 0, 0);
            blit(f, 48, 96, stoneCol16, 16, 96, 16, 0, 0, 0, 16, 24);
            blit(f, 48, 96, stoneCol16, 16, 96, 16, 48, 0, 48, 16, 48);
            break;

        case 16: // South Horizontal Run (low stone wall, non-occluding)
            // Rows 0..47 transparent! Rows 48..95 low stone wall
            blit(f, 48, 96, stoneSouthLow, 48, 48, 0, 48);
            break;

        case 17: // South Horizontal Run Variant 2
            blit(f, 48, 96, stoneSouthLow2, 48, 48, 0, 48);
            break;

        case 18: // South Horizontal Run with West end (doorway left)
            blit(f, 48, 96, stoneSouthLow, 48, 48, 12, 48, 12, 0, 36, 48);
            blit(f, 48, 96, stonePostLow16, 16, 48, 0, 48);
            break;

        case 19: // South Horizontal Run with East end (doorway right)
            blit(f, 48, 96, stoneSouthLow, 48, 48, 0, 48, 0, 0, 36, 48);
            blit(f, 48, 96, stonePostLow16, 16, 48, 32, 48);
            break;
    }

    return f;
}

// ----------------------------------------------------------------------------
// 5. Assemble Sheets (192 x 480 px: 4 cols x 5 rows)
// ----------------------------------------------------------------------------
const SHEET_W = 192;
const SHEET_H = 480;

function quantizeToMaxColors(buf, maxColors = 30) {
    const counts = new Map();
    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] > 0) {
            const key = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
            counts.set(key, (counts.get(key) || 0) + 1);
        }
    }
    if (counts.size <= maxColors) return;

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const topColors = sorted.slice(0, maxColors).map(e => [
        (e[0] >> 16) & 255,
        (e[0] >> 8) & 255,
        e[0] & 255
    ]);
    const topLab = topColors.map(c => srgbToLab(c[0], c[1], c[2]));

    const remap = new Map();
    for (let i = maxColors; i < sorted.length; i++) {
        const k = sorted[i][0];
        const r = (k >> 16) & 255, g = (k >> 8) & 255, b = k & 255;
        const lab = srgbToLab(r, g, b);
        let best = topColors[0], bd = Infinity;
        for (let j = 0; j < topLab.length; j++) {
            const d = Math.hypot(lab[0] - topLab[j][0], lab[1] - topLab[j][1], lab[2] - topLab[j][2]);
            if (d < bd) { bd = d; best = topColors[j]; }
        }
        remap.set(k, best);
    }

    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] > 0) {
            const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
            if (remap.has(k)) {
                const target = remap.get(k);
                buf[i] = target[0];
                buf[i + 1] = target[1];
                buf[i + 2] = target[2];
            }
        }
    }
}

function assembleSheet(builder) {
    const sheetBuf = Buffer.alloc(SHEET_W * SHEET_H * 4);

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
            }
        }
    }

    quantizeToMaxColors(sheetBuf, 30);

    const finalColors = new Set();
    for (let i = 0; i < sheetBuf.length; i += 4) {
        if (sheetBuf[i + 3] > 0) {
            finalColors.add((sheetBuf[i] << 16) | (sheetBuf[i + 1] << 8) | sheetBuf[i + 2]);
        }
    }

    return { sheetBuf, colorCount: finalColors.size };
}

console.log('Generating Nano Banana 2 Stone Wall Sheet...');
const stoneResult = assembleSheet(buildStonePiece);
console.log(`Stone Wall generated. Colors: ${stoneResult.colorCount}`);

console.log('Generating Nano Banana 2 Wood Wall Sheet...');
const woodResult = assembleSheet(buildWoodPiece);
console.log(`Wood Wall generated. Colors: ${woodResult.colorCount}`);

// Write target assets
writePNG(path.join(ROOT, 'game', 'img', 'characters', '!$WallStone_Set.png'), SHEET_W, SHEET_H, stoneResult.sheetBuf);
writePNG(path.join(ROOT, 'art', 'masters', '!$WallStone_Set.png'), SHEET_W, SHEET_H, stoneResult.sheetBuf);

writePNG(path.join(ROOT, 'game', 'img', 'characters', '!$WallWood_Set.png'), SHEET_W, SHEET_H, woodResult.sheetBuf);
writePNG(path.join(ROOT, 'art', 'masters', '!$WallWood_Set.png'), SHEET_W, SHEET_H, woodResult.sheetBuf);

console.log('Done generating authentic Nano Banana 2 wall sheets!');
