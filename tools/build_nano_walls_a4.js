const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// ----------------------------------------------------------------------------
// 1. Palette & CIELAB Snapping
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
const snapCache = new Map();

function snap(r, g, b) {
    const key = (r << 16) | (g << 8) | b;
    if (snapCache.has(key)) return snapCache.get(key);
    const l = srgbToLab(r, g, b);
    let best = palRGB[0], bd = Infinity;
    for (let i = 0; i < palLab.length; i++) {
        const d = Math.hypot(l[0] - palLab[i][0], l[1] - palLab[i][1], l[2] - palLab[i][2]);
        if (d < bd) { bd = d; best = palRGB[i]; }
    }
    snapCache.set(key, best);
    return best;
}

function snapHex(hex) {
    const rgb = parseHex(hex);
    return snap(rgb[0], rgb[1], rgb[2]);
}

// ----------------------------------------------------------------------------
// 2. Load Raw Sources
// ----------------------------------------------------------------------------
const stoneRaw = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'wall_stone_nano_banana_raw.png')));
const woodRaw = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'wall_wood_nano_banana_raw.png')));
const groundRaw = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'ground_tiles_nano_raw.png')));
const batch2Raw = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'ground_batch2_nano_raw.png')));

function sampleTexture(raw, sx, sy, sw, sh, tw, th) {
    const buf = Buffer.alloc(tw * th * 4);
    for (let dy = 0; dy < th; dy++) {
        for (let dx = 0; dx < tw; dx++) {
            const px = Math.floor(sx + (dx * sw / tw));
            const py = Math.floor(sy + (dy * sh / th));
            const si = (py * raw.width + px) * 4;
            const di = (dy * tw + dx) * 4;
            buf[di] = raw.data[si];
            buf[di + 1] = raw.data[si + 1];
            buf[di + 2] = raw.data[si + 2];
            buf[di + 3] = 255;
        }
    }
    return buf;
}

// ----------------------------------------------------------------------------
// 3. Build One 96x240 Wall Column (A4 format)
//    - y = 0..143: Wall Top (Ceiling with authentic rim, FLOOR_AUTOTILE_TABLE)
//    - y = 144..239: Wall Face (Vertical wall front face, WALL_AUTOTILE_TABLE)
// ----------------------------------------------------------------------------
function buildWallColumn(faceTex, rimColors, topTex = null) {
    const col = Buffer.alloc(96 * 240 * 4);
    const rimDark = snapHex(rimColors.dark);
    const rimMid  = snapHex(rimColors.mid);
    const rimHi   = snapHex(rimColors.hi);
    const srcTop  = topTex || faceTex;

    // 1. Top face (96x144 autotile ceiling) using FLOOR_AUTOTILE_TABLE (4 cols x 6 rows of 24x24 sub-tiles)
    for (let sy = 0; sy < 6; sy++) {
        for (let sx = 0; sx < 4; sx++) {
            for (let ly = 0; ly < 24; ly++) {
                for (let lx = 0; lx < 24; lx++) {
                    const gx = sx * 24 + lx;
                    const gy = sy * 24 + ly;
                    const di = (gy * 96 + gx) * 4;

                    // Calculate distance to boundary for ceiling framing
                    let dist = 24.0;
                    if ((sy === 3 || sy === 4) && (sx === 1 || sx === 2)) {
                        dist = 24.0; // Interior center
                    } else if (sx === 0 && sy === 2) { // Convex NW
                        dist = Math.hypot(23.5 - lx, 23.5 - ly);
                    } else if (sx === 3 && sy === 2) { // Convex NE
                        dist = Math.hypot(lx + 0.5, 23.5 - ly);
                    } else if (sx === 0 && sy === 5) { // Convex SW
                        dist = Math.hypot(23.5 - lx, ly + 0.5);
                    } else if (sx === 3 && sy === 5) { // Convex SE
                        dist = Math.hypot(lx + 0.5, ly + 0.5);
                    } else if (sy === 2) { // Straight North
                        dist = ly + 0.5;
                    } else if (sy === 5) { // Straight South
                        dist = 23.5 - ly;
                    } else if (sx === 0) { // Straight West
                        dist = lx + 0.5;
                    } else if (sx === 3) { // Straight East
                        dist = 23.5 - lx;
                    } else if (sx === 2 && sy === 0) { // Inner NW notch
                        dist = Math.hypot(lx + 0.5, ly + 0.5);
                    } else if (sx === 3 && sy === 0) { // Inner NE notch
                        dist = Math.hypot(23.5 - lx, ly + 0.5);
                    } else if (sx === 2 && sy === 1) { // Inner SW notch
                        dist = Math.hypot(lx + 0.5, 23.5 - ly);
                    } else if (sx === 3 && sy === 1) { // Inner SE notch
                        dist = Math.hypot(23.5 - lx, 23.5 - ly);
                    }

                    let c;
                    if (dist <= 1.0) c = rimDark;
                    else if (dist <= 2.2) c = rimMid;
                    else if (dist <= 3.4) c = rimHi;
                    else if (dist <= 4.6) c = rimMid;
                    else if (dist <= 5.8) c = rimDark;
                    else {
                        // Sample top surface texture
                        const ti = ((gy % 96) * 96 + (gx % 96)) * 4;
                        const tr = srcTop[ti], tg = srcTop[ti + 1], tb = srcTop[ti + 2];
                        c = snap(tr, tg, tb);
                    }

                    col[di]     = c[0];
                    col[di + 1] = c[1];
                    col[di + 2] = c[2];
                    col[di + 3] = 255;
                }
            }
        }
    }

    // 2. Front face (96x96 vertical wall face at y = 144..239) using WALL_AUTOTILE_TABLE (4 cols x 4 rows of 24x24 sub-tiles)
    for (let sy = 0; sy < 4; sy++) {
        for (let sx = 0; sx < 4; sx++) {
            for (let ly = 0; ly < 24; ly++) {
                for (let lx = 0; lx < 24; lx++) {
                    const gx = sx * 24 + lx;
                    const gy = sy * 24 + ly;
                    const si = (gy * 96 + gx) * 4;

                    let r = faceTex[si], g = faceTex[si + 1], b = faceTex[si + 2];

                    // Subtle top-down lighting & shadow gradient
                    const lumMod = 1.08 - (gy / 96) * 0.22;
                    r = Math.min(255, Math.floor(r * lumMod));
                    g = Math.min(255, Math.floor(g * lumMod));
                    b = Math.min(255, Math.floor(b * lumMod));

                    // Corner & edge shading for 3D depth
                    if (sx === 0 && lx < 2) { // Left shadow rim
                        r = Math.floor(r * 0.7); g = Math.floor(g * 0.7); b = Math.floor(b * 0.7);
                    } else if (sx === 3 && lx > 21) { // Right edge highlight
                        r = Math.min(255, Math.floor(r * 1.15)); g = Math.min(255, Math.floor(g * 1.15)); b = Math.min(255, Math.floor(b * 1.15));
                    }
                    if (sy === 3 && ly > 20) { // Bottom footing shadow
                        r = Math.floor(r * 0.65); g = Math.floor(g * 0.65); b = Math.floor(b * 0.65);
                    }

                    const snapped = snap(r, g, b);
                    const di = ((144 + gy) * 96 + gx) * 4;
                    col[di]     = snapped[0];
                    col[di + 1] = snapped[1];
                    col[di + 2] = snapped[2];
                    col[di + 3] = 255;
                }
            }
        }
    }

    return col;
}

// ----------------------------------------------------------------------------
// 4. Assemble Outside_A4 and Dungeon_A4
// ----------------------------------------------------------------------------
const A4_W = 768, A4_H = 720; // 8 cols x 3 rows of 96x240

// Textures sampled from Nano Banana Pro
const stoneFace = sampleTexture(stoneRaw, 50, 50, 200, 190, 96, 96);
const woodFace = sampleTexture(woodRaw, 50, 100, 200, 300, 96, 96);
const cobbleFace = sampleTexture(groundRaw, 20, 320, 120, 120, 96, 96);
const caveSlateFace = sampleTexture(groundRaw, 20, 630, 120, 120, 96, 96);
const iceFace = sampleTexture(batch2Raw, 20, 170, 120, 120, 96, 96);
const pineWoodFace = sampleTexture(batch2Raw, 20, 480, 120, 120, 96, 96);
const peatCaveFace = sampleTexture(batch2Raw, 20, 640, 120, 120, 96, 96);
const redBrickFace = sampleTexture(groundRaw, 180, 170, 120, 120, 96, 96);

const WALL_STYLES = [
    // 0: Ashlar Stone
    { face: stoneFace, rim: { dark: '#181818', mid: '#515151', hi: '#8E8E8E' } },
    // 1: Timber Palisade Wood
    { face: woodFace, rim: { dark: '#241C14', mid: '#6D4D3D', hi: '#9A7141' } },
    // 2: Cobblestone Mortar
    { face: cobbleFace, rim: { dark: '#2D2D2D', mid: '#616161', hi: '#AEAEAE' } },
    // 3: Dark Cavern Slate
    { face: caveSlateFace, rim: { dark: '#181818', mid: '#3D3531', hi: '#7D7D7D' } },
    // 4: Red Brick
    { face: redBrickFace, rim: { dark: '#351810', mid: '#824D28', hi: '#BE825D' } },
    // 5: Pine Timber
    { face: pineWoodFace, rim: { dark: '#1C1410', mid: '#553D31', hi: '#8A5D2D' } },
    // 6: Peat Rock / Swamp Wall
    { face: peatCaveFace, rim: { dark: '#181818', mid: '#352D24', hi: '#6D4D3D' } },
    // 7: Crystalline Glacier Ice
    { face: iceFace, rim: { dark: '#28558A', mid: '#71AEE7', hi: '#B2D7F3' } }
];

function quantizeToMaxColors(buf, maxColors = 32) {
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

function buildA4Sheet(targetPath) {
    const sheet = Buffer.alloc(A4_W * A4_H * 4);

    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 8; c++) {
            const styleIdx = (r * 8 + c) % WALL_STYLES.length;
            const style = WALL_STYLES[styleIdx];
            const wallCol = buildWallColumn(style.face, style.rim, style.top || style.face);

            const ox = c * 96;
            const oy = r * 240;

            for (let y = 0; y < 240; y++) {
                for (let x = 0; x < 96; x++) {
                    const si = (y * 96 + x) * 4;
                    const di = ((oy + y) * A4_W + (ox + x)) * 4;
                    sheet[di] = wallCol[si];
                    sheet[di + 1] = wallCol[si + 1];
                    sheet[di + 2] = wallCol[si + 2];
                    sheet[di + 3] = 255;
                }
            }
        }
    }

    quantizeToMaxColors(sheet, 32);
    writePNG(targetPath, A4_W, A4_H, sheet);
    console.log(`Saved A4 sheet: ${targetPath}`);
}

// Build Outside_A4 and Dungeon_A4
const outsideA4 = path.join(ROOT, 'game', 'img', 'tilesets', 'Outside_A4.png');
const dungeonA4Out = path.join(ROOT, 'game', 'img', 'tilesets', 'Dungeon_A4.png');
const masterA4 = path.join(ROOT, 'art', 'masters', 'UF_GenTerrain_A4.png');

buildA4Sheet(outsideA4);
buildA4Sheet(dungeonA4Out);
buildA4Sheet(masterA4);

console.log('Successfully generated complete Nano Banana Pro A4 wall tilesets!');
