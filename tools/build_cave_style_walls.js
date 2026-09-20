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

// ----------------------------------------------------------------------------
// 2. Load Raw Nano Banana Generations for Wall Textures
// ----------------------------------------------------------------------------
const woodRaw = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'wall_wood_nano_banana_raw.png')));
const stoneRaw = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'wall_stone_nano_banana_raw.png')));
const dungeonA4 = decodePNG(fs.readFileSync(path.join(ROOT, 'game', 'img', 'tilesets', 'Dungeon_A4.png')));

// ----------------------------------------------------------------------------
// 3. Build Two-Tile High Frames (48 x 96):
// Rows 0..47: TOP FACE (Rooftop / Coping / Walkway seen from above)
// Rows 48..95: WALL FACE (Vertical Front Wall with deep cast shadow under lip)
// ----------------------------------------------------------------------------

function createBlankFrame() {
    return Buffer.alloc(48 * 96 * 4); // initialized to alpha 0
}

function setPixel(buf, x, y, col) {
    if (x < 0 || x >= 48 || y < 0 || y >= 96) return;
    const idx = (y * 48 + x) * 4;
    buf[idx] = col[0];
    buf[idx + 1] = col[1];
    buf[idx + 2] = col[2];
    buf[idx + 3] = 255;
}

// ============================================================================
// BUILD WOOD WALL SET (48x96, 20 frames)
// ============================================================================
function buildWoodSet() {
    // Palette ramps for Wood Wall
    const C = {
        topHigh: snapHex('#C89650'),
        topBody: snapHex('#9A7141'),
        topShade: snapHex('#7D4D18'),
        topGroove: snapHex('#452810'),
        topLip: snapHex('#B27D24'),
        topEdgeDark: snapHex('#3D240C'),
        
        shadowDeep: snapHex('#1F1206'),
        shadowMid: snapHex('#351F0A'),
        shadowSoft: snapHex('#4A2B0E'),

        wallHigh: snapHex('#A8783E'),
        wallBody: snapHex('#8A5518'),
        wallShade: snapHex('#6E3E0C'),
        wallGroove: snapHex('#3D1E04'),
        
        postBody: snapHex('#784510'),
        postHigh: snapHex('#9E6225'),
        postDark: snapHex('#2C1402'),
        
        baseTrim: snapHex('#452308'),
        baseEdge: snapHex('#241103')
    };

    function drawWoodTopFace(f, mask) {
        const hasN = !!(mask & 1);
        const hasE = !!(mask & 2);
        const hasS = !!(mask & 4);
        const hasW = !!(mask & 8);

        // Standard Top Face bounds
        // If isolated (mask===0): 32x32 center cap at x=8..39, y=8..39
        // If connecting: expands towards connections
        const xMin = hasW ? 0 : 6;
        const xMax = hasE ? 47 : 41;
        const yMin = hasN ? 0 : 6;
        const yMax = 45; // South edge of top face sits at y=45

        for (let y = yMin; y <= yMax; y++) {
            for (let x = xMin; x <= xMax; x++) {
                // Horizontal plank grain on top deck
                const plankY = y % 8;
                let col = C.topBody;
                if (plankY === 0) col = C.topGroove;
                else if (plankY === 1) col = C.topHigh;
                else if (plankY >= 6) col = C.topShade;
                else {
                    const n = ((x * 7 + y * 13) % 11) / 11;
                    col = n > 0.7 ? C.topHigh : (n < 0.3 ? C.topShade : C.topBody);
                }
                setPixel(f, x, y, col);
            }
        }

        // Top Face outer borders & bevels
        // North border
        if (!hasN) {
            for (let x = xMin; x <= xMax; x++) {
                setPixel(f, x, yMin, C.topEdgeDark);
                setPixel(f, x, yMin + 1, C.topHigh);
            }
        }
        // West border
        if (!hasW) {
            for (let y = yMin; y <= yMax; y++) {
                setPixel(f, xMin, y, C.topEdgeDark);
                setPixel(f, xMin + 1, y, C.topHigh);
            }
        }
        // East border
        if (!hasE) {
            for (let y = yMin; y <= yMax; y++) {
                setPixel(f, xMax, y, C.topEdgeDark);
                setPixel(f, xMax - 1, y, C.topShade);
            }
        }
        // South coping lip (y=44..46): The overhang lip seen across the front!
        for (let x = xMin; x <= xMax; x++) {
            setPixel(f, x, 44, C.topHigh);
            setPixel(f, x, 45, C.topLip);
            setPixel(f, x, 46, C.topEdgeDark);
        }
    }

    function drawWoodWallFace(f, mask) {
        const hasN = !!(mask & 1);
        const hasE = !!(mask & 2);
        const hasS = !!(mask & 4);
        const hasW = !!(mask & 8);

        const xMin = hasW ? 0 : 6;
        const xMax = hasE ? 47 : 41;

        // 1. Cast shadow directly under top face lip (y=47..50)
        for (let x = xMin; x <= xMax; x++) {
            setPixel(f, x, 47, C.shadowDeep);
            setPixel(f, x, 48, C.shadowMid);
            setPixel(f, x, 49, C.shadowSoft);
        }

        // 2. Vertical wood plank wall face (y=50..91)
        for (let y = 50; y <= 91; y++) {
            for (let x = xMin; x <= xMax; x++) {
                const plankX = x % 8;
                let col = C.wallBody;
                if (plankX === 0) col = C.wallGroove;
                else if (plankX === 1) col = C.wallHigh;
                else if (plankX >= 6) col = C.wallShade;
                else {
                    const n = ((x * 17 + y * 23) % 13) / 13;
                    col = n > 0.65 ? C.wallHigh : (n < 0.35 ? C.wallShade : C.wallBody);
                }
                setPixel(f, x, y, col);
            }
        }

        // 3. West & East corner / post edges on the wall face
        if (!hasW) {
            for (let y = 47; y <= 95; y++) {
                setPixel(f, xMin, y, C.postDark);
                setPixel(f, xMin + 1, y, C.postDark);
                setPixel(f, xMin + 2, y, C.postHigh);
            }
        }
        if (!hasE) {
            for (let y = 47; y <= 95; y++) {
                setPixel(f, xMax, y, C.postDark);
                setPixel(f, xMax - 1, y, C.postDark);
                setPixel(f, xMax - 2, y, C.postBody);
            }
        }

        // 4. Sturdy baseboard / footer trim (y=92..95)
        for (let x = xMin; x <= xMax; x++) {
            setPixel(f, x, 92, C.baseTrim);
            setPixel(f, x, 93, C.topHigh);
            setPixel(f, x, 94, C.baseTrim);
            setPixel(f, x, 95, C.baseEdge);
        }
    }

    function buildFrame(idx) {
        const f = createBlankFrame();
        // Mask 0..15: NESW bitmask
        // Frame 16: Alternate horizontal East-West wall (mask 10)
        // Frame 17: Alternate horizontal East-West wall variant (mask 10)
        // Frame 18: Alternate West cap (mask 8)
        // Frame 19: Alternate East cap (mask 2)
        let mask = idx;
        if (idx === 16 || idx === 17) mask = 10;
        else if (idx === 18) mask = 8;
        else if (idx === 19) mask = 2;

        drawWoodTopFace(f, mask);
        drawWoodWallFace(f, mask);
        return f;
    }

    const SHEET_W = 192, SHEET_H = 480;
    const sheetBuf = Buffer.alloc(SHEET_W * SHEET_H * 4);

    for (let idx = 0; idx < 20; idx++) {
        const frameBuf = buildFrame(idx);
        const col = idx % 4;
        const row = Math.floor(idx / 4);
        const startX = col * 48;
        const startY = row * 96;

        for (let y = 0; y < 96; y++) {
            for (let x = 0; x < 48; x++) {
                const si = (y * 48 + x) * 4;
                const di = ((startY + y) * SHEET_W + (startX + x)) * 4;
                sheetBuf[di] = frameBuf[si];
                sheetBuf[di + 1] = frameBuf[si + 1];
                sheetBuf[di + 2] = frameBuf[si + 2];
                sheetBuf[di + 3] = frameBuf[si + 3];
            }
        }
    }

    quantizeToMaxColors(sheetBuf, 30);
    return sheetBuf;
}

// ============================================================================
// BUILD STONE WALL SET (48x96, 20 frames - CAVE / ROCK WALL STYLE)
// ============================================================================
function buildStoneSet() {
    // Palette ramps for Stone Wall (Ashlar Granite / Cave Rock Style)
    const C = {
        topHigh: snapHex('#D8D8D0'),
        topLight: snapHex('#B8B8B0'),
        topBody: snapHex('#8E8E88'),
        topShade: snapHex('#6E6E68'),
        topGroove: snapHex('#454540'),
        topEdgeDark: snapHex('#2A2A26'),
        
        shadowDeep: snapHex('#141412'),
        shadowMid: snapHex('#262622'),
        shadowSoft: snapHex('#3C3C38'),

        masonryHigh: snapHex('#B0B0A8'),
        masonryBody: snapHex('#808078'),
        masonryShade: snapHex('#5C5C56'),
        mortarLine: snapHex('#30302C'),
        
        cornerDark: snapHex('#20201C'),
        cornerHigh: snapHex('#9E9E96'),
        
        baseTrim: snapHex('#40403C'),
        baseEdge: snapHex('#1E1E1A')
    };

    function drawStoneTopFace(f, mask) {
        const hasN = !!(mask & 1);
        const hasE = !!(mask & 2);
        const hasS = !!(mask & 4);
        const hasW = !!(mask & 8);

        const xMin = hasW ? 0 : 6;
        const xMax = hasE ? 47 : 41;
        const yMin = hasN ? 0 : 6;
        const yMax = 45;

        for (let y = yMin; y <= yMax; y++) {
            for (let x = xMin; x <= xMax; x++) {
                // Flat chiseled stone block paving on top face (like cave ledge in Dungeon_A4)
                const isBlockSeamX = (x % 16 === 0);
                const isBlockSeamY = (y % 12 === 0);
                let col = C.topBody;
                if (isBlockSeamX || isBlockSeamY) col = C.topGroove;
                else if (x % 16 === 1 || y % 12 === 1) col = C.topHigh;
                else if (x % 16 >= 14 || y % 12 >= 10) col = C.topShade;
                else {
                    const n = ((x * 13 + y * 19) % 17) / 17;
                    col = n > 0.7 ? C.topLight : (n < 0.3 ? C.topShade : C.topBody);
                }
                setPixel(f, x, y, col);
            }
        }

        // Top Face outer borders & chiseled bevels
        if (!hasN) {
            for (let x = xMin; x <= xMax; x++) {
                setPixel(f, x, yMin, C.topEdgeDark);
                setPixel(f, x, yMin + 1, C.topHigh);
            }
        }
        if (!hasW) {
            for (let y = yMin; y <= yMax; y++) {
                setPixel(f, xMin, y, C.topEdgeDark);
                setPixel(f, xMin + 1, y, C.topHigh);
            }
        }
        if (!hasE) {
            for (let y = yMin; y <= yMax; y++) {
                setPixel(f, xMax, y, C.topEdgeDark);
                setPixel(f, xMax - 1, y, C.topShade);
            }
        }
        // South coping stone lip (y=44..46)
        for (let x = xMin; x <= xMax; x++) {
            setPixel(f, x, 44, C.topHigh);
            setPixel(f, x, 45, C.topLight);
            setPixel(f, x, 46, C.topEdgeDark);
        }
    }

    function drawStoneWallFace(f, mask) {
        const hasN = !!(mask & 1);
        const hasE = !!(mask & 2);
        const hasS = !!(mask & 4);
        const hasW = !!(mask & 8);

        const xMin = hasW ? 0 : 6;
        const xMax = hasE ? 47 : 41;

        // 1. Cast shadow under stone coping lip (y=47..50)
        for (let x = xMin; x <= xMax; x++) {
            setPixel(f, x, 47, C.shadowDeep);
            setPixel(f, x, 48, C.shadowMid);
            setPixel(f, x, 49, C.shadowSoft);
        }

        // 2. Dressed ashlar stone masonry front wall face (y=50..91)
        // 3 horizontal courses of stone blocks (each ~14 px high)
        // with alternating brick offset
        for (let y = 50; y <= 91; y++) {
            const courseIdx = Math.floor((y - 50) / 14);
            const courseY = (y - 50) % 14;
            const xOffset = (courseIdx % 2 === 1) ? 8 : 0;

            for (let x = xMin; x <= xMax; x++) {
                const blockX = (x + xOffset) % 16;
                let col = C.masonryBody;
                if (courseY === 0 || blockX === 0) col = C.mortarLine;
                else if (courseY === 1 || blockX === 1) col = C.masonryHigh;
                else if (courseY >= 12 || blockX >= 14) col = C.masonryShade;
                else {
                    const n = ((x * 19 + y * 29) % 23) / 23;
                    col = n > 0.65 ? C.masonryHigh : (n < 0.35 ? C.masonryShade : C.masonryBody);
                }
                setPixel(f, x, y, col);
            }
        }

        // 3. Corner block vertical quoins
        if (!hasW) {
            for (let y = 47; y <= 95; y++) {
                setPixel(f, xMin, y, C.cornerDark);
                setPixel(f, xMin + 1, y, C.cornerDark);
                setPixel(f, xMin + 2, y, C.cornerHigh);
            }
        }
        if (!hasE) {
            for (let y = 47; y <= 95; y++) {
                setPixel(f, xMax, y, C.cornerDark);
                setPixel(f, xMax - 1, y, C.cornerDark);
                setPixel(f, xMax - 2, y, C.masonryShade);
            }
        }

        // 4. Sturdy stone foundation base (y=92..95)
        for (let x = xMin; x <= xMax; x++) {
            setPixel(f, x, 92, C.baseTrim);
            setPixel(f, x, 93, C.masonryHigh);
            setPixel(f, x, 94, C.baseTrim);
            setPixel(f, x, 95, C.baseEdge);
        }
    }

    function buildFrame(idx) {
        const f = createBlankFrame();
        let mask = idx;
        if (idx === 16 || idx === 17) mask = 10;
        else if (idx === 18) mask = 8;
        else if (idx === 19) mask = 2;

        drawStoneTopFace(f, mask);
        drawStoneWallFace(f, mask);
        return f;
    }

    const SHEET_W = 192, SHEET_H = 480;
    const sheetBuf = Buffer.alloc(SHEET_W * SHEET_H * 4);

    for (let idx = 0; idx < 20; idx++) {
        const frameBuf = buildFrame(idx);
        const col = idx % 4;
        const row = Math.floor(idx / 4);
        const startX = col * 48;
        const startY = row * 96;

        for (let y = 0; y < 96; y++) {
            for (let x = 0; x < 48; x++) {
                const si = (y * 48 + x) * 4;
                const di = ((startY + y) * SHEET_W + (startX + x)) * 4;
                sheetBuf[di] = frameBuf[si];
                sheetBuf[di + 1] = frameBuf[si + 1];
                sheetBuf[di + 2] = frameBuf[si + 2];
                sheetBuf[di + 3] = frameBuf[si + 3];
            }
        }
    }

    quantizeToMaxColors(sheetBuf, 30);
    return sheetBuf;
}

// ----------------------------------------------------------------------------
// 4. Write Target Sheets & Sidecars
// ----------------------------------------------------------------------------
const woodSheet = buildWoodSet();
const stoneSheet = buildStoneSet();

writePNG(path.join(ROOT, 'game', 'img', 'characters', '!$WallWood_Set.png'), 192, 480, woodSheet);
writePNG(path.join(ROOT, 'art', 'masters', '!$WallWood_Set.png'), 192, 480, woodSheet);

writePNG(path.join(ROOT, 'game', 'img', 'characters', '!$WallStone_Set.png'), 192, 480, stoneSheet);
writePNG(path.join(ROOT, 'art', 'masters', '!$WallStone_Set.png'), 192, 480, stoneSheet);

const sidecarWood = {
    id: "wall_wood",
    frameWidth: 48,
    frameHeight: 96,
    anchor: [24, 95],
    footprint: [1, 2],
    facings: ["S"],
    animations: { stand: [0] }
};

const sidecarStone = {
    id: "wall_stone",
    frameWidth: 48,
    frameHeight: 96,
    anchor: [24, 95],
    footprint: [1, 2],
    facings: ["S"],
    animations: { stand: [0] }
};

fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$WallWood_Set.json'), JSON.stringify(sidecarWood, null, 2));
fs.writeFileSync(path.join(ROOT, 'art', 'masters', '!$WallWood_Set.json'), JSON.stringify(sidecarWood, null, 2));
fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$WallStone_Set.json'), JSON.stringify(sidecarStone, null, 2));
fs.writeFileSync(path.join(ROOT, 'art', 'masters', '!$WallStone_Set.json'), JSON.stringify(sidecarStone, null, 2));

console.log('Successfully generated cave/rock style Wood and Stone wall sets with top face and wall face!');
