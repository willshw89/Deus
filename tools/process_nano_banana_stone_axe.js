const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// Load palette
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

// Palette definitions (from SEG-17 and uf.hex verified ramps)
const C_EDGE   = pal.snap(0xEF, 0xEF, 0xEF); // 118 #efefef cutting edge glint
const C_LIT    = pal.snap(0xCE, 0xCE, 0xCE); // 120 #cecece lit flint facet
const C_MID    = pal.snap(0xAE, 0xAE, 0xAE); // 122 #aeaeae mid stone
const C_SHAD   = pal.snap(0x8E, 0x8E, 0x8E); // 124 #8e8e8e shadowed stone
const C_DARK   = pal.snap(0x51, 0x51, 0x51); // 128 #515151 deep stone knapping
const C_HAFT_L = pal.snap(0x7D, 0x4D, 0x18); // 141 #7d4d18 lit wood haft
const C_HAFT_M = pal.snap(0x5D, 0x35, 0x0C); // 143 #5d350c mid wood haft
const C_HAFT_D = pal.snap(0x3D, 0x24, 0x0C); // 145 #3d240c shadow wood haft
const C_CORD_L = pal.snap(0xCA, 0xB2, 0x92); // 136 #cab292 hemp cord lit
const C_CORD_D = pal.snap(0xAA, 0x86, 0x59); // 138 #aa8659 hemp cord shadow
const C_OUT    = pal.snap(0x20, 0x14, 0x08); // 147 #201408 selective dark outline

// Helper to draw a pixel on a 48x48 RGBA buffer
function setPx(buf, x, y, col) {
    if (x < 0 || x >= 48 || y < 0 || y >= 48) return;
    const idx = (y * 48 + x) * 4;
    buf[idx] = col[0];
    buf[idx + 1] = col[1];
    buf[idx + 2] = col[2];
    buf[idx + 3] = 255;
}

// Build 8-facing base designs for Stone Axe
// S, SW, W, NW, N, NE, E, SE
function createFacingFrame(facing, frameOffset = 0) {
    const buf = Buffer.alloc(48 * 48 * 4); // all transparent
    const dy = frameOffset; // 0 for stand, -1 for idle breathing

    if (facing === 'S') {
        // South facing: Axe held in settler's right hand (viewer's left, cols 13..15, rows 32..35)
        // Haft runs from row 40 up through hand to socket at row 27
        // Haft
        for (let y = 35 + dy; y <= 39 + dy; y++) {
            setPx(buf, 13, y, C_HAFT_L);
            setPx(buf, 14, y, C_HAFT_M);
            setPx(buf, 15, y, C_HAFT_D);
        }
        // Grip area (rows 32..34 + dy): left transparent for fingers!
        // Upper haft above hand
        for (let y = 26 + dy; y <= 31 + dy; y++) {
            setPx(buf, 13, y, C_HAFT_L);
            setPx(buf, 14, y, C_HAFT_M);
            setPx(buf, 15, y, C_HAFT_D);
        }
        // Cord lashing at socket (rows 25..27 + dy)
        setPx(buf, 12, 26 + dy, C_CORD_L);
        setPx(buf, 13, 26 + dy, C_CORD_L);
        setPx(buf, 14, 26 + dy, C_CORD_D);
        setPx(buf, 15, 26 + dy, C_CORD_D);
        setPx(buf, 12, 27 + dy, C_CORD_D);
        setPx(buf, 13, 27 + dy, C_CORD_L);
        setPx(buf, 14, 27 + dy, C_CORD_D);

        // Knapped flint axe head (rows 22..28 + dy, cols 8..14)
        // Poll sticking out right (cols 15..16, row 24..26)
        setPx(buf, 16, 25 + dy, C_SHAD);
        setPx(buf, 16, 26 + dy, C_DARK);
        
        // Blade body extending left
        setPx(buf, 12, 24 + dy, C_LIT);
        setPx(buf, 11, 24 + dy, C_LIT);
        setPx(buf, 10, 24 + dy, C_EDGE);
        setPx(buf, 9, 24 + dy, C_OUT);

        setPx(buf, 12, 25 + dy, C_LIT);
        setPx(buf, 11, 25 + dy, C_MID);
        setPx(buf, 10, 25 + dy, C_LIT);
        setPx(buf, 9, 25 + dy, C_EDGE);
        setPx(buf, 8, 25 + dy, C_OUT);

        setPx(buf, 12, 26 + dy, C_MID);
        setPx(buf, 11, 26 + dy, C_SHAD);
        setPx(buf, 10, 26 + dy, C_MID);
        setPx(buf, 9, 26 + dy, C_EDGE);
        setPx(buf, 8, 26 + dy, C_OUT);

        setPx(buf, 11, 27 + dy, C_SHAD);
        setPx(buf, 10, 27 + dy, C_DARK);
        setPx(buf, 9, 27 + dy, C_SHAD);
        setPx(buf, 8, 27 + dy, C_OUT);

        // Outlines on axe head
        setPx(buf, 10, 23 + dy, C_OUT);
        setPx(buf, 11, 23 + dy, C_OUT);
        setPx(buf, 12, 23 + dy, C_OUT);
        setPx(buf, 10, 28 + dy, C_OUT);
        setPx(buf, 11, 28 + dy, C_OUT);
        setPx(buf, 13, 40 + dy, C_OUT);
        setPx(buf, 14, 40 + dy, C_OUT);
        setPx(buf, 15, 40 + dy, C_OUT);
    } else if (facing === 'SW') {
        // South-West facing: body turned 45 degrees, hand at cols 10..12, rows 30..33
        // Haft
        for (let y = 34 + dy; y <= 38 + dy; y++) {
            setPx(buf, 11, y, C_HAFT_L);
            setPx(buf, 12, y, C_HAFT_M);
        }
        for (let y = 25 + dy; y <= 29 + dy; y++) {
            setPx(buf, 11, y, C_HAFT_L);
            setPx(buf, 12, y, C_HAFT_M);
        }
        // Cord
        setPx(buf, 10, 25 + dy, C_CORD_L);
        setPx(buf, 11, 25 + dy, C_CORD_L);
        setPx(buf, 12, 25 + dy, C_CORD_D);
        setPx(buf, 11, 26 + dy, C_CORD_D);

        // Blade angled toward SW
        setPx(buf, 9, 23 + dy, C_EDGE);
        setPx(buf, 10, 23 + dy, C_LIT);
        setPx(buf, 8, 24 + dy, C_EDGE);
        setPx(buf, 9, 24 + dy, C_LIT);
        setPx(buf, 10, 24 + dy, C_MID);
        setPx(buf, 8, 25 + dy, C_LIT);
        setPx(buf, 9, 25 + dy, C_SHAD);
        setPx(buf, 8, 26 + dy, C_DARK);
        setPx(buf, 9, 26 + dy, C_OUT);
        setPx(buf, 7, 24 + dy, C_OUT);
        setPx(buf, 7, 25 + dy, C_OUT);
    } else if (facing === 'W') {
        // West facing: Side profile, held in front hand at cols 24..26, rows 31..34
        // Haft vertical in profile
        for (let y = 35 + dy; y <= 39 + dy; y++) {
            setPx(buf, 26, y, C_HAFT_L);
            setPx(buf, 27, y, C_HAFT_M);
        }
        for (let y = 26 + dy; y <= 30 + dy; y++) {
            setPx(buf, 26, y, C_HAFT_L);
            setPx(buf, 27, y, C_HAFT_M);
        }
        // Cord
        setPx(buf, 25, 26 + dy, C_CORD_L);
        setPx(buf, 26, 26 + dy, C_CORD_D);
        // Blade profile pointing West
        setPx(buf, 24, 24 + dy, C_EDGE);
        setPx(buf, 25, 24 + dy, C_LIT);
        setPx(buf, 23, 25 + dy, C_EDGE);
        setPx(buf, 24, 25 + dy, C_LIT);
        setPx(buf, 25, 25 + dy, C_MID);
        setPx(buf, 23, 26 + dy, C_EDGE);
        setPx(buf, 24, 26 + dy, C_SHAD);
        setPx(buf, 22, 25 + dy, C_OUT);
        setPx(buf, 22, 26 + dy, C_OUT);
        setPx(buf, 24, 27 + dy, C_OUT);
    } else if (facing === 'NW') {
        // North-West facing: 3/4 back view, hand at cols 18..20, rows 31..34
        for (let y = 35 + dy; y <= 39 + dy; y++) {
            setPx(buf, 19, y, C_HAFT_M);
            setPx(buf, 20, y, C_HAFT_D);
        }
        for (let y = 26 + dy; y <= 30 + dy; y++) {
            setPx(buf, 19, y, C_HAFT_M);
            setPx(buf, 20, y, C_HAFT_D);
        }
        // Cord
        setPx(buf, 18, 26 + dy, C_CORD_D);
        setPx(buf, 19, 26 + dy, C_CORD_L);
        // Blade pointing NW
        setPx(buf, 17, 24 + dy, C_LIT);
        setPx(buf, 18, 24 + dy, C_MID);
        setPx(buf, 16, 25 + dy, C_EDGE);
        setPx(buf, 17, 25 + dy, C_MID);
        setPx(buf, 18, 25 + dy, C_SHAD);
        setPx(buf, 16, 26 + dy, C_DARK);
        setPx(buf, 15, 25 + dy, C_OUT);
        setPx(buf, 15, 26 + dy, C_OUT);
    } else if (facing === 'N') {
        // North facing: Back view! Axe is held at right side (viewer's right, cols 32..35)
        // Since back view is shown, hand grips haft, blade head seen from behind
        for (let y = 35 + dy; y <= 40 + dy; y++) {
            setPx(buf, 33, y, C_HAFT_M);
            setPx(buf, 34, y, C_HAFT_D);
        }
        for (let y = 26 + dy; y <= 30 + dy; y++) {
            setPx(buf, 33, y, C_HAFT_M);
            setPx(buf, 34, y, C_HAFT_D);
        }
        // Cord
        setPx(buf, 32, 26 + dy, C_CORD_D);
        setPx(buf, 33, 26 + dy, C_CORD_D);
        setPx(buf, 34, 26 + dy, C_CORD_L);
        // Blade head extending right (away from spine)
        setPx(buf, 35, 24 + dy, C_MID);
        setPx(buf, 36, 24 + dy, C_SHAD);
        setPx(buf, 35, 25 + dy, C_MID);
        setPx(buf, 36, 25 + dy, C_DARK);
        setPx(buf, 37, 25 + dy, C_EDGE);
        setPx(buf, 35, 26 + dy, C_SHAD);
        setPx(buf, 36, 26 + dy, C_DARK);
        setPx(buf, 37, 26 + dy, C_EDGE);
        setPx(buf, 38, 25 + dy, C_OUT);
        setPx(buf, 38, 26 + dy, C_OUT);
        setPx(buf, 36, 27 + dy, C_OUT);
    }
    return buf;
}

// Mirroring helper for East-side rows (NE, E, SE)
function mirrorFrame(buf) {
    const out = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const srcIdx = (y * 48 + x) * 4;
            const dstIdx = (y * 48 + (47 - x)) * 4;
            out[dstIdx] = buf[srcIdx];
            out[dstIdx + 1] = buf[srcIdx + 1];
            out[dstIdx + 2] = buf[srcIdx + 2];
            out[dstIdx + 3] = buf[srcIdx + 3];
        }
    }
    return out;
}

// Generate the 8 facings for a given frame (0: stand, 1: idle_1, 2: idle_2)
function get8FacingsForFrame(frameIndex) {
    // Subtle idle animation shift: frame 1 lifts 1px
    const dy = frameIndex === 1 ? -1 : 0;
    
    const frameS = createFacingFrame('S', dy);
    const frameSW = createFacingFrame('SW', dy);
    const frameW = createFacingFrame('W', dy);
    const frameNW = createFacingFrame('NW', dy);
    const frameN = createFacingFrame('N', dy);
    
    // East side is symmetrical mirror of West side
    const frameNE = mirrorFrame(frameNW);
    const frameE = mirrorFrame(frameW);
    const frameSE = mirrorFrame(frameSW);

    return [frameS, frameSW, frameW, frameNW, frameN, frameNE, frameE, frameSE];
}

console.log('Generating Stone Axe Equipment Layer master and RMMZ sets...');

// 1. Build Native Master: 3 columns x 8 rows of 48x48 px = 144 x 384 px
const masterW = 144;
const masterH = 384;
const masterBuf = Buffer.alloc(masterW * masterH * 4); // all transparent

const frames = [
    get8FacingsForFrame(0), // stand
    get8FacingsForFrame(1), // idle 1
    get8FacingsForFrame(2)  // idle 2
];

for (let col = 0; col < 3; col++) {
    const colFacings = frames[col];
    for (let row = 0; row < 8; row++) {
        const cellBuf = colFacings[row];
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const srcIdx = (y * 48 + x) * 4;
                const dstX = col * 48 + x;
                const dstY = row * 48 + y;
                const dstIdx = (dstY * masterW + dstX) * 4;
                masterBuf[dstIdx] = cellBuf[srcIdx];
                masterBuf[dstIdx + 1] = cellBuf[srcIdx + 1];
                masterBuf[dstIdx + 2] = cellBuf[srcIdx + 2];
                masterBuf[dstIdx + 3] = cellBuf[srcIdx + 3];
            }
        }
    }
}

const masterPngPath = path.join(ROOT, 'art', 'masters', 'stone_axe_layer_idle.png');
writePNG(masterPngPath, masterW, masterH, masterBuf);
console.log('Wrote master PNG:', masterPngPath);

// Write master sidecar
const masterSidecar = {
    id: "stone_axe_layer",
    name: "Stone Axe Equipment Layer",
    category: "equipment",
    layer: "weapon",
    slot: "weapon",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"],
    animations: {
        stand: [0],
        idle: [0, 1, 2]
    },
    frameMs: 150,
    behind: ["N"],
    scale: {
        factor: 1
    }
};
fs.writeFileSync(path.join(ROOT, 'art', 'masters', 'stone_axe_layer_idle.json'), JSON.stringify(masterSidecar, null, 2));

// 2. Build 4x Raw Delivery Canvas: 3 columns x 8 rows of 192x192 px = 576 x 1536 px on flat magenta #FF00FF
const rawW = 576;
const rawH = 1536;
const rawBuf = Buffer.alloc(rawW * rawH * 4);

// Fill with pure magenta #FF00FF
for (let i = 0; i < rawW * rawH; i++) {
    rawBuf[i * 4] = 255;
    rawBuf[i * 4 + 1] = 0;
    rawBuf[i * 4 + 2] = 255;
    rawBuf[i * 4 + 3] = 255;
}

// Copy master pixels scaled 4x
for (let y = 0; y < masterH; y++) {
    for (let x = 0; x < masterW; x++) {
        const mIdx = (y * masterW + x) * 4;
        if (masterBuf[mIdx + 3] > 0) {
            const r = masterBuf[mIdx];
            const g = masterBuf[mIdx + 1];
            const b = masterBuf[mIdx + 2];
            for (let dy = 0; dy < 4; dy++) {
                for (let dx = 0; dx < 4; dx++) {
                    const rX = x * 4 + dx;
                    const rY = y * 4 + dy;
                    const rIdx = (rY * rawW + rX) * 4;
                    rawBuf[rIdx] = r;
                    rawBuf[rIdx + 1] = g;
                    rawBuf[rIdx + 2] = b;
                    rawBuf[rIdx + 3] = 255;
                }
            }
        }
    }
}

const rawPngPath = path.join(ROOT, 'art', 'raw', 'stone_axe_layer_idle.png');
writePNG(rawPngPath, rawW, rawH, rawBuf);
console.log('Wrote 4x raw delivery PNG:', rawPngPath);

// 3. Build Drop-in RPG Maker MZ Single Character Sheet: 144 x 192 px (Down, Left, Right, Up)
// Row 0: Down (S, row 0 of master)
// Row 1: Left (W, row 2 of master)
// Row 2: Right (E, row 6 of master)
// Row 3: Up (N, row 4 of master)
const rmmzW = 144;
const rmmzH = 192;
const rmmzBuf = Buffer.alloc(rmmzW * rmmzH * 4);

const rmmzRowMap = [0, 2, 6, 4]; // S, W, E, N

for (let rmmzRow = 0; rmmzRow < 4; rmmzRow++) {
    const masterRow = rmmzRowMap[rmmzRow];
    for (let col = 0; col < 3; col++) {
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const srcX = col * 48 + x;
                const srcY = masterRow * 48 + y;
                const srcIdx = (srcY * masterW + srcX) * 4;

                const dstX = col * 48 + x;
                const dstY = rmmzRow * 48 + y;
                const dstIdx = (dstY * rmmzW + dstX) * 4;

                rmmzBuf[dstIdx] = masterBuf[srcIdx];
                rmmzBuf[dstIdx + 1] = masterBuf[srcIdx + 1];
                rmmzBuf[dstIdx + 2] = masterBuf[srcIdx + 2];
                rmmzBuf[dstIdx + 3] = masterBuf[srcIdx + 3];
            }
        }
    }
}

const rmmzPath = path.join(ROOT, 'game', 'img', 'characters', '$UF_Layer_stone_axe.png');
writePNG(rmmzPath, rmmzW, rmmzH, rmmzBuf);
console.log('Wrote RMMZ drop-in charset:', rmmzPath);

const rmmzSidecar = {
    id: "$UF_Layer_stone_axe",
    name: "Stone Axe Equipment Layer (RMMZ)",
    category: "equipment",
    layer: "weapon",
    slot: "weapon",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S", "W", "E", "N"],
    animations: {
        stand: [1],
        walk: [0, 1, 2, 1]
    },
    frameMs: 150,
    behind: ["N"]
};
fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '$UF_Layer_stone_axe.json'), JSON.stringify(rmmzSidecar, null, 2));

// 4. Create Review Images
// Load settler body
const settlerPng = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'human_male_stand.png')));
// Load meadow ground tile for background
const meadowPng = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'meadow.png')));

// Review A: 8-way lineup with composite (Settler + Stone Axe) scaled 4x
// 8 tiles wide (384 px) x 1 tile tall (48 px) at 4x = 1536 x 192 px
const lineupW = 48 * 8 * 4;
const lineupH = 48 * 4;
const lineupBuf = Buffer.alloc(lineupW * lineupH * 4);

// Fill with tiled meadow
for (let y = 0; y < lineupH; y++) {
    for (let x = 0; x < lineupW; x++) {
        const mx = Math.floor(x / 4) % 48;
        const my = Math.floor(y / 4) % 48;
        const mIdx = (my * 48 + mx) * 4;
        const idx = (y * lineupW + x) * 4;
        lineupBuf[idx] = meadowPng.data[mIdx];
        lineupBuf[idx + 1] = meadowPng.data[mIdx + 1];
        lineupBuf[idx + 2] = meadowPng.data[mIdx + 2];
        lineupBuf[idx + 3] = 255;
    }
}

for (let r = 0; r < 8; r++) {
    const tileStartX = r * 48 * 4;
    for (let py = 0; py < 48; py++) {
        for (let px = 0; px < 48; px++) {
            const bodyIdx = ((r * 48 + py) * 48 + px) * 4;
            const axeIdx = ((r * 48 + py) * masterW + px) * 4; // frame 0 (col 0)

            // Compose: meadow -> body -> axe (or axe behind for North)
            let cr = null, cg = null, cb = null;
            const isBehind = (r === 4); // North facing

            if (isBehind) {
                if (masterBuf[axeIdx + 3] > 0) {
                    cr = masterBuf[axeIdx]; cg = masterBuf[axeIdx + 1]; cb = masterBuf[axeIdx + 2];
                }
                if (settlerPng.data[bodyIdx + 3] > 0) {
                    cr = settlerPng.data[bodyIdx]; cg = settlerPng.data[bodyIdx + 1]; cb = settlerPng.data[bodyIdx + 2];
                }
            } else {
                if (settlerPng.data[bodyIdx + 3] > 0) {
                    cr = settlerPng.data[bodyIdx]; cg = settlerPng.data[bodyIdx + 1]; cb = settlerPng.data[bodyIdx + 2];
                }
                if (masterBuf[axeIdx + 3] > 0) {
                    cr = masterBuf[axeIdx]; cg = masterBuf[axeIdx + 1]; cb = masterBuf[axeIdx + 2];
                }
            }

            if (cr !== null) {
                for (let dy = 0; dy < 4; dy++) {
                    for (let dx = 0; dx < 4; dx++) {
                        const outX = tileStartX + px * 4 + dx;
                        const outY = py * 4 + dy;
                        const outIdx = (outY * lineupW + outX) * 4;
                        lineupBuf[outIdx] = cr;
                        lineupBuf[outIdx + 1] = cg;
                        lineupBuf[outIdx + 2] = cb;
                        lineupBuf[outIdx + 3] = 255;
                    }
                }
            }
        }
    }
}

const lineupPath = path.join(ROOT, 'art', 'review', 'stone_axe_layer_on_settler_lineup_4x.png');
writePNG(lineupPath, lineupW, lineupH, lineupBuf);
console.log('Wrote review lineup:', lineupPath);

// Review B: 8-way Compass layout (3x3 tiles of 48x48 at 4x = 576 x 576 px)
const compassW = 48 * 3 * 4;
const compassH = 48 * 3 * 4;
const compassBuf = Buffer.alloc(compassW * compassH * 4);

// Fill with tiled meadow
for (let y = 0; y < compassH; y++) {
    for (let x = 0; x < compassW; x++) {
        const mx = Math.floor(x / 4) % 48;
        const my = Math.floor(y / 4) % 48;
        const mIdx = (my * 48 + mx) * 4;
        const idx = (y * compassW + x) * 4;
        compassBuf[idx] = meadowPng.data[mIdx];
        compassBuf[idx + 1] = meadowPng.data[mIdx + 1];
        compassBuf[idx + 2] = meadowPng.data[mIdx + 2];
        compassBuf[idx + 3] = 255;
    }
}

// 8 directions around 3x3 grid:
// [NW (0,0)] [N  (1,0)] [NE (2,0)]
// [W  (0,1)] [C  (1,1)] [E  (2,1)]
// [SW (0,2)] [S  (1,2)] [SE (2,2)]
const compassMap = [
    { r: 0, gx: 1, gy: 2 }, // S
    { r: 1, gx: 0, gy: 2 }, // SW
    { r: 2, gx: 0, gy: 1 }, // W
    { r: 3, gx: 0, gy: 0 }, // NW
    { r: 4, gx: 1, gy: 0 }, // N
    { r: 5, gx: 2, gy: 0 }, // NE
    { r: 6, gx: 2, gy: 1 }, // E
    { r: 7, gx: 2, gy: 2 }  // SE
];

for (const node of compassMap) {
    const tileStartX = node.gx * 48 * 4;
    const tileStartY = node.gy * 48 * 4;
    const r = node.r;

    for (let py = 0; py < 48; py++) {
        for (let px = 0; px < 48; px++) {
            const bodyIdx = ((r * 48 + py) * 48 + px) * 4;
            const axeIdx = ((r * 48 + py) * masterW + px) * 4; // frame 0 (col 0)

            let cr = null, cg = null, cb = null;
            const isBehind = (r === 4); // North facing

            if (isBehind) {
                if (masterBuf[axeIdx + 3] > 0) {
                    cr = masterBuf[axeIdx]; cg = masterBuf[axeIdx + 1]; cb = masterBuf[axeIdx + 2];
                }
                if (settlerPng.data[bodyIdx + 3] > 0) {
                    cr = settlerPng.data[bodyIdx]; cg = settlerPng.data[bodyIdx + 1]; cb = settlerPng.data[bodyIdx + 2];
                }
            } else {
                if (settlerPng.data[bodyIdx + 3] > 0) {
                    cr = settlerPng.data[bodyIdx]; cg = settlerPng.data[bodyIdx + 1]; cb = settlerPng.data[bodyIdx + 2];
                }
                if (masterBuf[axeIdx + 3] > 0) {
                    cr = masterBuf[axeIdx]; cg = masterBuf[axeIdx + 1]; cb = masterBuf[axeIdx + 2];
                }
            }

            if (cr !== null) {
                for (let dy = 0; dy < 4; dy++) {
                    for (let dx = 0; dx < 4; dx++) {
                        const outX = tileStartX + px * 4 + dx;
                        const outY = tileStartY + py * 4 + dy;
                        const outIdx = (outY * compassW + outX) * 4;
                        compassBuf[outIdx] = cr;
                        compassBuf[outIdx + 1] = cg;
                        compassBuf[outIdx + 2] = cb;
                        compassBuf[outIdx + 3] = 255;
                    }
                }
            }
        }
    }
}

const compassPath = path.join(ROOT, 'art', 'review', 'stone_axe_layer_8way_compass_4x.png');
writePNG(compassPath, compassW, compassH, compassBuf);
console.log('Wrote review compass:', compassPath);

// Review C: Layer alone at 4x on magenta
const aloneW = masterW * 4;
const aloneH = masterH * 4;
const aloneBuf = Buffer.alloc(aloneW * aloneH * 4);
for (let y = 0; y < masterH; y++) {
    for (let x = 0; x < masterW; x++) {
        const mIdx = (y * masterW + x) * 4;
        const isOpaque = masterBuf[mIdx + 3] > 0;
        const r = isOpaque ? masterBuf[mIdx] : 255;
        const g = isOpaque ? masterBuf[mIdx + 1] : 0;
        const b = isOpaque ? masterBuf[mIdx + 2] : 255;
        for (let dy = 0; dy < 4; dy++) {
            for (let dx = 0; dx < 4; dx++) {
                const outIdx = ((y * 4 + dy) * aloneW + (x * 4 + dx)) * 4;
                aloneBuf[outIdx] = r;
                aloneBuf[outIdx + 1] = g;
                aloneBuf[outIdx + 2] = b;
                aloneBuf[outIdx + 3] = 255;
            }
        }
    }
}
const alonePath = path.join(ROOT, 'art', 'review', 'stone_axe_layer_alone_4x.png');
writePNG(alonePath, aloneW, aloneH, aloneBuf);
console.log('Wrote review alone 4x:', alonePath);

console.log('All Stone Axe files successfully generated and exported!');
