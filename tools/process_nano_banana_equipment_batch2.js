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

// Verified Palette Ramps from uf.hex
const C_STONE_EDGE = pal.snap(0xEF, 0xEF, 0xEF); // 118 #efefef cutting edge glint
const C_STONE_LIT  = pal.snap(0xCE, 0xCE, 0xCE); // 120 #cecece lit flint facet
const C_STONE_MID  = pal.snap(0xAE, 0xAE, 0xAE); // 122 #aeaeae mid stone
const C_STONE_SHAD = pal.snap(0x8E, 0x8E, 0x8E); // 124 #8e8e8e shadowed stone
const C_STONE_DARK = pal.snap(0x51, 0x51, 0x51); // 128 #515151 deep stone knapping

const C_HAFT_HL    = pal.snap(0x9A, 0x71, 0x41); // lit wood highlight
const C_HAFT_L     = pal.snap(0x7D, 0x4D, 0x18); // 141 #7d4d18 lit wood haft
const C_HAFT_M     = pal.snap(0x5D, 0x35, 0x0C); // 143 #5d350c mid wood haft
const C_HAFT_D     = pal.snap(0x3D, 0x24, 0x0C); // 145 #3d240c shadow wood haft

const C_CORD_HL    = pal.snap(0xEF, 0xDB, 0xC6); // cord / gut string highlight
const C_CORD_L     = pal.snap(0xCA, 0xB2, 0x92); // 136 #cab292 hemp cord lit
const C_CORD_D     = pal.snap(0xAA, 0x86, 0x59); // 138 #aa8659 hemp cord shadow
const C_OUT        = pal.snap(0x20, 0x14, 0x08); // 147 #201408 selective dark outline

// Hide cloak / leather ramps
const C_HIDE_FUR_L = pal.snap(0xEF, 0xDB, 0xC6); // wolf / sheep fur lit
const C_HIDE_FUR_M = pal.snap(0xCA, 0xB2, 0x92); // fur midtone
const C_HIDE_FUR_D = pal.snap(0x8E, 0x71, 0x4D); // fur shadow
const C_PELT_HL    = pal.snap(0xB2, 0x86, 0x51); // buckskin highlight
const C_PELT_L     = pal.snap(0x9A, 0x71, 0x41); // buckskin lit
const C_PELT_M     = pal.snap(0x7D, 0x4D, 0x18); // buckskin mid
const C_PELT_D     = pal.snap(0x5D, 0x35, 0x0C); // buckskin shadow
const C_PELT_DARK  = pal.snap(0x35, 0x1C, 0x08); // deep crease

function setPx(buf, x, y, col) {
    if (x < 0 || x >= 48 || y < 0 || y >= 48) return;
    const idx = (y * 48 + x) * 4;
    buf[idx] = col[0];
    buf[idx + 1] = col[1];
    buf[idx + 2] = col[2];
    buf[idx + 3] = 255;
}

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

// ==========================================
// 1. CLUB GENERATOR (Hardwood War Club)
// ==========================================
function createClubFrame(facing, dy = 0) {
    const buf = Buffer.alloc(48 * 48 * 4);

    if (facing === 'S') {
        // Right hand at cols 13..15, rows 32..34
        // Haft running rows 28..33
        for (let y = 28 + dy; y <= 33 + dy; y++) {
            setPx(buf, 13, y, C_HAFT_L);
            setPx(buf, 14, y, C_HAFT_M);
            setPx(buf, 15, y, C_OUT);
        }
        // Grip wrapping
        setPx(buf, 13, 31 + dy, C_CORD_L);
        setPx(buf, 14, 31 + dy, C_CORD_D);
        setPx(buf, 13, 33 + dy, C_CORD_L);
        setPx(buf, 14, 33 + dy, C_CORD_D);

        // Heavy knotted bludgeon head: rows 34..40, cols 11..16
        for (let y = 34 + dy; y <= 39 + dy; y++) {
            const minX = (y === 34 + dy || y === 39 + dy) ? 12 : 11;
            const maxX = (y === 34 + dy || y === 39 + dy) ? 15 : 16;
            for (let x = minX; x <= maxX; x++) {
                if (x === minX && y < 37 + dy) setPx(buf, x, y, C_HAFT_HL);
                else if (x <= 13) setPx(buf, x, y, C_HAFT_L);
                else if (x === 14) setPx(buf, x, y, C_HAFT_M);
                else setPx(buf, x, y, C_HAFT_D);
            }
        }
        // Outline bottom/right
        setPx(buf, 12, 40 + dy, C_OUT);
        setPx(buf, 13, 40 + dy, C_OUT);
        setPx(buf, 14, 40 + dy, C_OUT);
        setPx(buf, 15, 40 + dy, C_OUT);
        setPx(buf, 16, 38 + dy, C_OUT);
        setPx(buf, 16, 39 + dy, C_OUT);

        // Grip transparency (rows 32..34)
        for (let y = 32 + dy; y <= 33 + dy; y++) {
            for (let x = 13; x <= 14; x++) {
                const idx = (y * 48 + x) * 4;
                buf[idx + 3] = 0;
            }
        }
    } else if (facing === 'SW') {
        // Hand at cols 8..11, rows 31..34
        // Haft angled
        for (let i = 0; i <= 4; i++) {
            setPx(buf, 9 + i, 30 + i + dy, C_HAFT_L);
            setPx(buf, 10 + i, 30 + i + dy, C_HAFT_M);
            setPx(buf, 11 + i, 30 + i + dy, C_OUT);
        }
        // Heavy knob head at bottom-left: cols 6..11, rows 35..39
        for (let y = 35 + dy; y <= 39 + dy; y++) {
            for (let x = 6; x <= 10; x++) {
                if (x === 6 && y === 35 + dy) continue;
                if (x === 6 && y === 39 + dy) continue;
                setPx(buf, x, y, x <= 7 ? C_HAFT_L : (x <= 9 ? C_HAFT_M : C_HAFT_D));
            }
        }
        setPx(buf, 7, 40 + dy, C_OUT);
        setPx(buf, 8, 40 + dy, C_OUT);
        setPx(buf, 9, 40 + dy, C_OUT);
        // Palm transparency
        buf[((32 + dy) * 48 + 10) * 4 + 3] = 0;
        buf[((33 + dy) * 48 + 11) * 4 + 3] = 0;
    } else if (facing === 'W') {
        // Profile view: hand at cols 16..18, rows 31..34
        for (let y = 29 + dy; y <= 34 + dy; y++) {
            setPx(buf, 16, y, C_HAFT_L);
            setPx(buf, 17, y, C_HAFT_M);
            setPx(buf, 18, y, C_OUT);
        }
        // Knob head: cols 14..18, rows 35..40
        for (let y = 35 + dy; y <= 40 + dy; y++) {
            for (let x = 14; x <= 18; x++) {
                setPx(buf, x, y, x <= 15 ? C_HAFT_L : (x <= 17 ? C_HAFT_M : C_HAFT_D));
            }
        }
        setPx(buf, 15, 41 + dy, C_OUT);
        setPx(buf, 16, 41 + dy, C_OUT);
        setPx(buf, 17, 41 + dy, C_OUT);
        buf[((32 + dy) * 48 + 16) * 4 + 3] = 0;
        buf[((33 + dy) * 48 + 17) * 4 + 3] = 0;
    } else if (facing === 'NW') {
        // Hand at cols 27..30, rows 31..34
        for (let y = 30 + dy; y <= 35 + dy; y++) {
            setPx(buf, 28, y, C_HAFT_M);
            setPx(buf, 29, y, C_HAFT_D);
            setPx(buf, 30, y, C_OUT);
        }
        for (let y = 35 + dy; y <= 40 + dy; y++) {
            for (let x = 27; x <= 31; x++) {
                setPx(buf, x, y, x <= 28 ? C_HAFT_M : C_HAFT_D);
            }
        }
        setPx(buf, 28, 41 + dy, C_OUT);
        setPx(buf, 29, 41 + dy, C_OUT);
        setPx(buf, 30, 41 + dy, C_OUT);
    } else if (facing === 'N') {
        // North facing: right hand at screen right (cols 32..35, rows 31..34)
        for (let y = 29 + dy; y <= 34 + dy; y++) {
            setPx(buf, 33, y, C_HAFT_M);
            setPx(buf, 34, y, C_HAFT_D);
            setPx(buf, 35, y, C_OUT);
        }
        for (let y = 35 + dy; y <= 40 + dy; y++) {
            for (let x = 32; x <= 36; x++) {
                setPx(buf, x, y, x <= 33 ? C_HAFT_M : C_HAFT_D);
            }
        }
        setPx(buf, 33, 41 + dy, C_OUT);
        setPx(buf, 34, 41 + dy, C_OUT);
        setPx(buf, 35, 41 + dy, C_OUT);
    }
    return buf;
}

// ==========================================
// 2. SPEAR GENERATOR (Flint-tipped Polearm)
// ==========================================
function createSpearFrame(facing, dy = 0) {
    const buf = Buffer.alloc(48 * 48 * 4);

    if (facing === 'S') {
        // Right hand at cols 13..15, rows 31..34
        // Long shaft: col 14, rows 12..43
        for (let y = 18 + dy; y <= 43 + dy; y++) {
            setPx(buf, 13, y, C_HAFT_L);
            setPx(buf, 14, y, C_HAFT_M);
            setPx(buf, 15, y, C_OUT);
        }
        // Sinew lashing: rows 19..21
        for (let y = 19 + dy; y <= 21 + dy; y++) {
            setPx(buf, 13, y, C_CORD_L);
            setPx(buf, 14, y, C_CORD_D);
            setPx(buf, 15, y, C_OUT);
        }
        // Flint spearhead: rows 11..18, cols 12..16
        setPx(buf, 14, 11 + dy, C_STONE_EDGE); // tip
        setPx(buf, 13, 12 + dy, C_STONE_EDGE);
        setPx(buf, 14, 12 + dy, C_STONE_LIT);
        setPx(buf, 15, 12 + dy, C_OUT);

        for (let y = 13 + dy; y <= 15 + dy; y++) {
            setPx(buf, 12, y, C_STONE_EDGE);
            setPx(buf, 13, y, C_STONE_LIT);
            setPx(buf, 14, y, C_STONE_MID);
            setPx(buf, 15, y, C_STONE_DARK);
            setPx(buf, 16, y, C_OUT);
        }
        for (let y = 16 + dy; y <= 18 + dy; y++) {
            setPx(buf, 13, y, C_STONE_LIT);
            setPx(buf, 14, y, C_STONE_MID);
            setPx(buf, 15, y, C_OUT);
        }

        // Palm transparency at rows 32..33
        buf[((32 + dy) * 48 + 14) * 4 + 3] = 0;
        buf[((33 + dy) * 48 + 14) * 4 + 3] = 0;
    } else if (facing === 'SW') {
        // Angled spear in 3/4 front view
        for (let i = 0; i <= 24; i++) {
            const px = 10 + Math.floor(i * 0.15);
            const py = 16 + i + dy;
            setPx(buf, px - 1, py, C_HAFT_L);
            setPx(buf, px, py, C_HAFT_M);
            setPx(buf, px + 1, py, C_OUT);
        }
        // Spearhead rows 10..16, cols 8..12
        setPx(buf, 10, 10 + dy, C_STONE_EDGE);
        for (let y = 11 + dy; y <= 15 + dy; y++) {
            setPx(buf, 8, y, C_STONE_EDGE);
            setPx(buf, 9, y, C_STONE_LIT);
            setPx(buf, 10, y, C_STONE_MID);
            setPx(buf, 11, y, C_STONE_DARK);
            setPx(buf, 12, y, C_OUT);
        }
        // Sinew lashing rows 16..18
        for (let y = 16 + dy; y <= 18 + dy; y++) {
            setPx(buf, 9, y, C_CORD_L);
            setPx(buf, 10, y, C_CORD_D);
        }
        buf[((32 + dy) * 48 + 11) * 4 + 3] = 0;
    } else if (facing === 'W') {
        // Side profile: vertical spear held at col 16
        for (let y = 18 + dy; y <= 43 + dy; y++) {
            setPx(buf, 15, y, C_HAFT_L);
            setPx(buf, 16, y, C_HAFT_M);
            setPx(buf, 17, y, C_OUT);
        }
        setPx(buf, 16, 11 + dy, C_STONE_EDGE);
        for (let y = 12 + dy; y <= 17 + dy; y++) {
            setPx(buf, 14, y, C_STONE_EDGE);
            setPx(buf, 15, y, C_STONE_LIT);
            setPx(buf, 16, y, C_STONE_MID);
            setPx(buf, 17, y, C_OUT);
        }
        for (let y = 18 + dy; y <= 20 + dy; y++) {
            setPx(buf, 15, y, C_CORD_L);
            setPx(buf, 16, y, C_CORD_D);
        }
        buf[((32 + dy) * 48 + 16) * 4 + 3] = 0;
    } else if (facing === 'NW') {
        // Back 3/4 view: spear held at col 28
        for (let y = 18 + dy; y <= 43 + dy; y++) {
            setPx(buf, 27, y, C_HAFT_M);
            setPx(buf, 28, y, C_HAFT_D);
            setPx(buf, 29, y, C_OUT);
        }
        setPx(buf, 28, 11 + dy, C_STONE_EDGE);
        for (let y = 12 + dy; y <= 17 + dy; y++) {
            setPx(buf, 26, y, C_STONE_LIT);
            setPx(buf, 27, y, C_STONE_MID);
            setPx(buf, 28, y, C_STONE_DARK);
            setPx(buf, 29, y, C_OUT);
        }
    } else if (facing === 'N') {
        // North facing: held in right hand at screen right (col 34)
        for (let y = 18 + dy; y <= 43 + dy; y++) {
            setPx(buf, 33, y, C_HAFT_M);
            setPx(buf, 34, y, C_HAFT_D);
            setPx(buf, 35, y, C_OUT);
        }
        setPx(buf, 34, 11 + dy, C_STONE_EDGE);
        for (let y = 12 + dy; y <= 17 + dy; y++) {
            setPx(buf, 32, y, C_STONE_LIT);
            setPx(buf, 33, y, C_STONE_MID);
            setPx(buf, 34, y, C_STONE_DARK);
            setPx(buf, 35, y, C_OUT);
        }
        for (let y = 18 + dy; y <= 20 + dy; y++) {
            setPx(buf, 33, y, C_CORD_L);
            setPx(buf, 34, y, C_CORD_D);
        }
    }
    return buf;
}

// ==========================================
// 3. SHORT BOW GENERATOR (Bow + Back Quiver)
// ==========================================
function createBowShortFrame(facing, dy = 0) {
    const buf = Buffer.alloc(48 * 48 * 4);

    if (facing === 'S') {
        // Held in left hand (screen right, cols 29..32, rows 30..34)
        // Bow stave curving from row 23 to row 42 at cols 30..33
        // Upper limb
        setPx(buf, 31, 23 + dy, C_HAFT_L);
        setPx(buf, 32, 23 + dy, C_OUT);
        setPx(buf, 32, 24 + dy, C_HAFT_L);
        setPx(buf, 33, 24 + dy, C_OUT);
        for (let y = 25 + dy; y <= 29 + dy; y++) {
            setPx(buf, 32, y, C_HAFT_L);
            setPx(buf, 33, y, C_HAFT_M);
            setPx(buf, 34, y, C_OUT);
        }
        // Grip handle
        for (let y = 30 + dy; y <= 33 + dy; y++) {
            setPx(buf, 30, y, C_CORD_L);
            setPx(buf, 31, y, C_HAFT_M);
            setPx(buf, 32, y, C_OUT);
        }
        // Lower limb
        for (let y = 34 + dy; y <= 38 + dy; y++) {
            setPx(buf, 32, y, C_HAFT_L);
            setPx(buf, 33, y, C_HAFT_M);
            setPx(buf, 34, y, C_OUT);
        }
        setPx(buf, 32, 39 + dy, C_HAFT_L);
        setPx(buf, 33, 39 + dy, C_OUT);
        setPx(buf, 31, 40 + dy, C_HAFT_L);
        setPx(buf, 32, 40 + dy, C_OUT);

        // Bowstring: taut straight cord from tip to tip at col 30
        for (let y = 24 + dy; y <= 39 + dy; y++) {
            if (y < 30 + dy || y > 33 + dy) {
                setPx(buf, 30, y, C_CORD_HL);
            }
        }

        // Quiver peeking over right shoulder (screen left, cols 17..19, rows 21..26)
        setPx(buf, 17, 21 + dy, C_STONE_EDGE); // feather fletching
        setPx(buf, 19, 21 + dy, C_STONE_EDGE);
        setPx(buf, 18, 22 + dy, C_STONE_LIT);
        for (let y = 23 + dy; y <= 26 + dy; y++) {
            setPx(buf, 17, y, C_PELT_M);
            setPx(buf, 18, y, C_PELT_D);
            setPx(buf, 19, y, C_OUT);
        }

        // Left palm grip transparency
        buf[((32 + dy) * 48 + 31) * 4 + 3] = 0;
    } else if (facing === 'SW') {
        // 3/4 front view: bow held in left hand (cols 24..27, rows 30..34)
        for (let y = 24 + dy; y <= 40 + dy; y++) {
            setPx(buf, 25, y, C_HAFT_L);
            setPx(buf, 26, y, C_HAFT_M);
            setPx(buf, 27, y, C_OUT);
        }
        for (let y = 25 + dy; y <= 39 + dy; y++) {
            setPx(buf, 24, y, C_CORD_HL);
        }
        // Quiver on back (cols 13..15, rows 22..27)
        setPx(buf, 14, 22 + dy, C_STONE_EDGE);
        setPx(buf, 15, 23 + dy, C_STONE_EDGE);
        for (let y = 24 + dy; y <= 27 + dy; y++) {
            setPx(buf, 14, y, C_PELT_M);
            setPx(buf, 15, y, C_PELT_D);
        }
    } else if (facing === 'W') {
        // West facing: profile view, bow held vertically in front
        for (let y = 24 + dy; y <= 40 + dy; y++) {
            setPx(buf, 17, y, C_HAFT_L);
            setPx(buf, 18, y, C_HAFT_M);
            setPx(buf, 19, y, C_OUT);
        }
        for (let y = 25 + dy; y <= 39 + dy; y++) {
            setPx(buf, 16, y, C_CORD_HL);
        }
        // Quiver visible on back (cols 26..28, rows 24..33)
        for (let y = 22 + dy; y <= 24 + dy; y++) {
            setPx(buf, 27, y, C_STONE_EDGE); // arrows
        }
        for (let y = 25 + dy; y <= 32 + dy; y++) {
            setPx(buf, 26, y, C_PELT_M);
            setPx(buf, 27, y, C_PELT_D);
            setPx(buf, 28, y, C_OUT);
        }
    } else if (facing === 'NW') {
        // Back 3/4 view: bow at screen left (col 18), quiver across back
        for (let y = 25 + dy; y <= 39 + dy; y++) {
            setPx(buf, 18, y, C_HAFT_M);
            setPx(buf, 19, y, C_OUT);
        }
        // Quiver across back from col 21 to 27
        setPx(buf, 28, 21 + dy, C_STONE_EDGE);
        setPx(buf, 29, 22 + dy, C_STONE_EDGE);
        for (let i = 0; i <= 8; i++) {
            setPx(buf, 28 - i, 23 + i + dy, C_PELT_M);
            setPx(buf, 29 - i, 23 + i + dy, C_PELT_D);
            setPx(buf, 30 - i, 23 + i + dy, C_OUT);
        }
    } else if (facing === 'N') {
        // North facing: bow held in left hand (screen left, col 14) behind body
        for (let y = 24 + dy; y <= 40 + dy; y++) {
            setPx(buf, 13, y, C_HAFT_M);
            setPx(buf, 14, y, C_HAFT_D);
            setPx(buf, 15, y, C_OUT);
        }
        for (let y = 25 + dy; y <= 39 + dy; y++) {
            setPx(buf, 12, y, C_CORD_HL);
        }
        // Full quiver on back: slung diagonally from left hip to right shoulder
        setPx(buf, 27, 20 + dy, C_STONE_EDGE); // arrow fletchings
        setPx(buf, 28, 21 + dy, C_STONE_EDGE);
        setPx(buf, 29, 21 + dy, C_STONE_EDGE);
        for (let i = 0; i <= 9; i++) {
            setPx(buf, 27 - i, 23 + i + dy, C_PELT_M);
            setPx(buf, 28 - i, 23 + i + dy, C_PELT_D);
            setPx(buf, 29 - i, 23 + i + dy, C_OUT);
        }
        // Leather sling strap across back
        for (let x = 16; x <= 28; x++) {
            const sy = Math.round(33 - (x - 16) * 0.7) + dy;
            setPx(buf, x, sy, C_HAFT_D);
        }
    }
    return buf;
}

// ==========================================
// 4. HIDE CLOAK GENERATOR (Clothing Tier 2)
// ==========================================
function createHideCloakFrame(facing, dy = 0) {
    const buf = Buffer.alloc(48 * 48 * 4);

    if (facing === 'S') {
        // South facing: fur trim collar and buckskin mantle draped over shoulders
        // Fur collar: rows 24..26 + dy
        for (let y = 24 + dy; y <= 26 + dy; y++) {
            const minX = (y === 24 + dy) ? 16 : 14;
            const maxX = (y === 24 + dy) ? 32 : 34;
            for (let x = minX; x <= maxX; x++) {
                if (y <= 25 + dy && x >= 21 && x <= 26) continue; // throat opening
                setPx(buf, x, y, (x + y) % 2 === 0 ? C_HIDE_FUR_L : C_HIDE_FUR_M);
            }
        }
        // Bone toggle clasp at throat
        setPx(buf, 23, 26 + dy, C_STONE_EDGE);
        setPx(buf, 24, 26 + dy, C_STONE_LIT);
        setPx(buf, 23, 27 + dy, C_HAFT_D); // leather clasp cord
        setPx(buf, 24, 27 + dy, C_HAFT_D);

        // Buckskin mantle draping over shoulders and outer chest: rows 27..34 + dy
        for (let y = 27 + dy; y <= 34 + dy; y++) {
            // Shoulders/arms: outer edges cover the tunic
            for (let x = 13; x <= 17; x++) {
                setPx(buf, x, y, x <= 15 ? C_PELT_L : C_PELT_M);
            }
            for (let x = 31; x <= 35; x++) {
                setPx(buf, x, y, x <= 33 ? C_PELT_M : C_PELT_D);
            }
        }
        // Bottom hem with soft fur trim at row 35..36
        for (let x = 14; x <= 17; x++) {
            setPx(buf, x, 35 + dy, C_HIDE_FUR_L);
            setPx(buf, x, 36 + dy, C_OUT);
        }
        for (let x = 31; x <= 34; x++) {
            setPx(buf, x, 35 + dy, C_HIDE_FUR_M);
            setPx(buf, x, 36 + dy, C_OUT);
        }
    } else if (facing === 'SW') {
        // 3/4 front view: fur collar and pelt mantle
        for (let y = 24 + dy; y <= 26 + dy; y++) {
            const minX = (y === 24 + dy) ? 13 : 10;
            const maxX = (y === 24 + dy) ? 27 : 29;
            for (let x = minX; x <= maxX; x++) {
                if (y <= 25 + dy && x >= 18 && x <= 21) continue;
                setPx(buf, x, y, (x + y) % 2 === 0 ? C_HIDE_FUR_L : C_HIDE_FUR_M);
            }
        }
        setPx(buf, 19, 26 + dy, C_STONE_EDGE); // toggle
        for (let y = 27 + dy; y <= 34 + dy; y++) {
            for (let x = 10; x <= 16; x++) setPx(buf, x, y, C_PELT_L);
            for (let x = 23; x <= 28; x++) setPx(buf, x, y, C_PELT_D);
        }
        for (let x = 11; x <= 16; x++) setPx(buf, x, 35 + dy, C_HIDE_FUR_L);
        for (let x = 23; x <= 27; x++) setPx(buf, x, 35 + dy, C_HIDE_FUR_M);
    } else if (facing === 'W') {
        // Side profile: cape draped over back shoulder
        for (let y = 24 + dy; y <= 26 + dy; y++) {
            for (let x = 18; x <= 28; x++) {
                setPx(buf, x, y, (x + y) % 2 === 0 ? C_HIDE_FUR_L : C_HIDE_FUR_M);
            }
        }
        setPx(buf, 19, 26 + dy, C_STONE_EDGE);
        for (let y = 27 + dy; y <= 34 + dy; y++) {
            for (let x = 20; x <= 29; x++) {
                setPx(buf, x, y, x <= 24 ? C_PELT_M : C_PELT_D);
            }
        }
        for (let x = 20; x <= 28; x++) {
            setPx(buf, x, 35 + dy, C_HIDE_FUR_M);
            setPx(buf, x, 36 + dy, C_OUT);
        }
    } else if (facing === 'NW') {
        // Back 3/4 view: full fur cape over back
        for (let y = 24 + dy; y <= 26 + dy; y++) {
            for (let x = 19; x <= 36; x++) {
                setPx(buf, x, y, (x + y) % 2 === 0 ? C_HIDE_FUR_L : C_HIDE_FUR_M);
            }
        }
        for (let y = 27 + dy; y <= 34 + dy; y++) {
            for (let x = 19; x <= 36; x++) {
                setPx(buf, x, y, x < 28 ? C_PELT_M : C_PELT_D);
            }
        }
        const yHem = 35 + dy;
        for (let x = 20; x <= 35; x++) {
            setPx(buf, x, yHem, (x + yHem) % 2 === 0 ? C_HIDE_FUR_M : C_HIDE_FUR_D);
            setPx(buf, x, yHem + 1, C_OUT);
        }
    } else if (facing === 'N') {
        // North facing: back view of full fur cloak!
        // Fur collar along neck: rows 24..25 + dy
        for (let y = 24 + dy; y <= 25 + dy; y++) {
            for (let x = 15; x <= 33; x++) {
                if (y === 24 + dy && x >= 21 && x <= 26) continue; // head cutout
                setPx(buf, x, y, (x + y) % 2 === 0 ? C_HIDE_FUR_L : C_HIDE_FUR_M);
            }
        }
        // Leather pelt cape covering whole back: rows 26..34 + dy
        for (let y = 26 + dy; y <= 34 + dy; y++) {
            for (let x = 14; x <= 34; x++) {
                if (x === 24) setPx(buf, x, y, C_PELT_DARK); // dorsal spine seam
                else if (x < 24) setPx(buf, x, y, (x + y) % 3 === 0 ? C_PELT_HL : (x < 19 ? C_PELT_L : C_PELT_M));
                else setPx(buf, x, y, (x + y) % 3 === 0 ? C_PELT_M : C_PELT_D);
            }
        }
        // Jagged fur trim along hem: row 35..36 + dy
        for (let x = 15; x <= 33; x++) {
            setPx(buf, x, 35 + dy, x < 24 ? C_HIDE_FUR_L : C_HIDE_FUR_M);
            if (x % 2 === 0) setPx(buf, x, 36 + dy, C_OUT);
        }
    }
    return buf;
}

// Master pack function for any asset
function buildAssetPackage(assetId, assetName, layerType, slotType, generatorFn) {
    console.log(`Building package for ${assetId}...`);

    function get8Facings(frameIdx) {
        const dy = (frameIdx === 1) ? -1 : 0;
        const fS = generatorFn('S', dy);
        const fSW = generatorFn('SW', dy);
        const fW = generatorFn('W', dy);
        const fNW = generatorFn('NW', dy);
        const fN = generatorFn('N', dy);
        const fNE = mirrorFrame(fNW);
        const fE = mirrorFrame(fW);
        const fSE = mirrorFrame(fSW);
        return [fS, fSW, fW, fNW, fN, fNE, fE, fSE];
    }

    const frames = [get8Facings(0), get8Facings(1), get8Facings(2)];

    // 1. Native Master (144 x 384)
    const masterW = 144, masterH = 384;
    const masterBuf = Buffer.alloc(masterW * masterH * 4);

    for (let col = 0; col < 3; col++) {
        const colFacings = frames[col];
        for (let row = 0; row < 8; row++) {
            const cellBuf = colFacings[row];
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const srcIdx = (y * 48 + x) * 4;
                    const dstIdx = ((row * 48 + y) * masterW + (col * 48 + x)) * 4;
                    masterBuf[dstIdx] = cellBuf[srcIdx];
                    masterBuf[dstIdx + 1] = cellBuf[srcIdx + 1];
                    masterBuf[dstIdx + 2] = cellBuf[srcIdx + 2];
                    masterBuf[dstIdx + 3] = cellBuf[srcIdx + 3];
                }
            }
        }
    }

    const masterPngPath = path.join(ROOT, 'art', 'masters', `${assetId}_layer_idle.png`);
    writePNG(masterPngPath, masterW, masterH, masterBuf);

    const masterSidecar = {
        id: `${assetId}_layer`,
        name: `${assetName} Layer`,
        category: "equipment",
        layer: layerType,
        slot: slotType,
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"],
        animations: { stand: [0], idle: [0, 1, 2] },
        frameMs: 150,
        behind: (slotType === "shield" || slotType === "weapon") ? ["N"] : []
    };
    fs.writeFileSync(path.join(ROOT, 'art', 'masters', `${assetId}_layer_idle.json`), JSON.stringify(masterSidecar, null, 2));

    // 2. 4x Raw Delivery Canvas (576 x 1536) on magenta #FF00FF
    const rawW = 576, rawH = 1536;
    const rawBuf = Buffer.alloc(rawW * rawH * 4);
    for (let i = 0; i < rawW * rawH; i++) {
        rawBuf[i * 4] = 255; rawBuf[i * 4 + 1] = 0; rawBuf[i * 4 + 2] = 255; rawBuf[i * 4 + 3] = 255;
    }
    for (let y = 0; y < masterH; y++) {
        for (let x = 0; x < masterW; x++) {
            const mIdx = (y * masterW + x) * 4;
            if (masterBuf[mIdx + 3] > 0) {
                const r = masterBuf[mIdx], g = masterBuf[mIdx + 1], b = masterBuf[mIdx + 2];
                for (let dy = 0; dy < 4; dy++) {
                    for (let dx = 0; dx < 4; dx++) {
                        const rIdx = ((y * 4 + dy) * rawW + (x * 4 + dx)) * 4;
                        rawBuf[rIdx] = r; rawBuf[rIdx + 1] = g; rawBuf[rIdx + 2] = b; rawBuf[rIdx + 3] = 255;
                    }
                }
            }
        }
    }
    const rawPngPath = path.join(ROOT, 'art', 'raw', `${assetId}_layer_idle.png`);
    writePNG(rawPngPath, rawW, rawH, rawBuf);

    // 3. Drop-in RMMZ Charset (144 x 192)
    const rmmzW = 144, rmmzH = 192;
    const rmmzBuf = Buffer.alloc(rmmzW * rmmzH * 4);
    const rmmzRowMap = [0, 2, 6, 4]; // Down, Left, Right, Up
    for (let rRow = 0; rRow < 4; rRow++) {
        const mRow = rmmzRowMap[rRow];
        for (let col = 0; col < 3; col++) {
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const srcIdx = ((mRow * 48 + y) * masterW + (col * 48 + x)) * 4;
                    const dstIdx = ((rRow * 48 + y) * rmmzW + (col * 48 + x)) * 4;
                    rmmzBuf[dstIdx] = masterBuf[srcIdx];
                    rmmzBuf[dstIdx + 1] = masterBuf[srcIdx + 1];
                    rmmzBuf[dstIdx + 2] = masterBuf[srcIdx + 2];
                    rmmzBuf[dstIdx + 3] = masterBuf[srcIdx + 3];
                }
            }
        }
    }
    const rmmzPath = path.join(ROOT, 'game', 'img', 'characters', `$UF_Layer_${assetId}.png`);
    writePNG(rmmzPath, rmmzW, rmmzH, rmmzBuf);

    const rmmzSidecar = {
        id: `$UF_Layer_${assetId}`,
        name: `${assetName} (RMMZ)`,
        category: "equipment",
        layer: layerType,
        slot: slotType,
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: { stand: [1], walk: [0, 1, 2, 1] },
        frameMs: 150,
        behind: (slotType === "shield" || slotType === "weapon") ? ["N"] : []
    };
    fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', `$UF_Layer_${assetId}.json`), JSON.stringify(rmmzSidecar, null, 2));

    return { masterBuf, masterW, masterH };
}

// Generate all 4 assets in Batch 2
const clubPkg   = buildAssetPackage('club', 'War Club', 'weapon', 'weapon', createClubFrame);
const spearPkg  = buildAssetPackage('spear', 'Hunting Spear', 'weapon', 'weapon', createSpearFrame);
const bowPkg    = buildAssetPackage('bow_short', 'Short Bow', 'weapon', 'weapon', createBowShortFrame);
const cloakPkg  = buildAssetPackage('hide_cloak', 'Hide Cloak', 'torso', 'torso', createHideCloakFrame);

// Load base settler and meadow for review renders
const settlerPng = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'human_male_stand.png')));
const meadowPng  = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'meadow.png')));

// Review 1: Full Settler Equipment Lineup (4 sets of 8 facings = 32 columns x 48 px at 4x = 1536 x 768 px)
const lineupW = 48 * 8 * 4;
const lineupH = 48 * 4 * 4;
const lineupBuf = Buffer.alloc(lineupW * lineupH * 4);

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

const pkgs = [
    { pkg: clubPkg, name: 'War Club' },
    { pkg: spearPkg, name: 'Hunting Spear' },
    { pkg: bowPkg, name: 'Short Bow' },
    { pkg: cloakPkg, name: 'Hide Cloak' }
];

for (let pIdx = 0; pIdx < pkgs.length; pIdx++) {
    const { pkg } = pkgs[pIdx];
    const rowStartY = pIdx * 48 * 4;

    for (let r = 0; r < 8; r++) {
        const colStartX = r * 48 * 4;

        for (let py = 0; py < 48; py++) {
            for (let px = 0; px < 48; px++) {
                const bIdx = ((r * 48 + py) * 48 + px) * 4;
                const eqIdx = ((r * 48 + py) * pkg.masterW + px) * 4;

                let cr = null, cg = null, cb = null;
                const isBehind = (r === 4 && pIdx < 3); // North facing weapon

                if (isBehind) {
                    if (pkg.masterBuf[eqIdx + 3] > 0) {
                        cr = pkg.masterBuf[eqIdx]; cg = pkg.masterBuf[eqIdx + 1]; cb = pkg.masterBuf[eqIdx + 2];
                    }
                    if (settlerPng.data[bIdx + 3] > 0) {
                        cr = settlerPng.data[bIdx]; cg = settlerPng.data[bIdx + 1]; cb = settlerPng.data[bIdx + 2];
                    }
                } else {
                    if (settlerPng.data[bIdx + 3] > 0) {
                        cr = settlerPng.data[bIdx]; cg = settlerPng.data[bIdx + 1]; cb = settlerPng.data[bIdx + 2];
                    }
                    if (pkg.masterBuf[eqIdx + 3] > 0) {
                        cr = pkg.masterBuf[eqIdx]; cg = pkg.masterBuf[eqIdx + 1]; cb = pkg.masterBuf[eqIdx + 2];
                    }
                }

                if (cr !== null) {
                    for (let dy = 0; dy < 4; dy++) {
                        for (let dx = 0; dx < 4; dx++) {
                            const outX = colStartX + px * 4 + dx;
                            const outY = rowStartY + py * 4 + dy;
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
}

const lineupPath = path.join(ROOT, 'art', 'review', 'equipment_batch2_lineup_4x.png');
writePNG(lineupPath, lineupW, lineupH, lineupBuf);
console.log('Wrote review lineup:', lineupPath);

// Review 2: Fully Equipped Settler Compass Layout (Hide Cloak + Spear)
const compassW = 48 * 3 * 4;
const compassH = 48 * 3 * 4;
const compassBuf = Buffer.alloc(compassW * compassH * 4);

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
            const bIdx = ((r * 48 + py) * 48 + px) * 4;
            const cloakIdx = ((r * 48 + py) * cloakPkg.masterW + px) * 4;
            const spearIdx = ((r * 48 + py) * spearPkg.masterW + px) * 4;

            let cr = null, cg = null, cb = null;
            const isBehind = (r === 4); // North facing spear behind body

            if (isBehind) {
                if (spearPkg.masterBuf[spearIdx + 3] > 0) {
                    cr = spearPkg.masterBuf[spearIdx]; cg = spearPkg.masterBuf[spearIdx + 1]; cb = spearPkg.masterBuf[spearIdx + 2];
                }
                if (settlerPng.data[bIdx + 3] > 0) {
                    cr = settlerPng.data[bIdx]; cg = settlerPng.data[bIdx + 1]; cb = settlerPng.data[bIdx + 2];
                }
                if (cloakPkg.masterBuf[cloakIdx + 3] > 0) {
                    cr = cloakPkg.masterBuf[cloakIdx]; cg = cloakPkg.masterBuf[cloakIdx + 1]; cb = cloakPkg.masterBuf[cloakIdx + 2];
                }
            } else {
                if (settlerPng.data[bIdx + 3] > 0) {
                    cr = settlerPng.data[bIdx]; cg = settlerPng.data[bIdx + 1]; cb = settlerPng.data[bIdx + 2];
                }
                if (cloakPkg.masterBuf[cloakIdx + 3] > 0) {
                    cr = cloakPkg.masterBuf[cloakIdx]; cg = cloakPkg.masterBuf[cloakIdx + 1]; cb = cloakPkg.masterBuf[cloakIdx + 2];
                }
                if (spearPkg.masterBuf[spearIdx + 3] > 0) {
                    cr = spearPkg.masterBuf[spearIdx]; cg = spearPkg.masterBuf[spearIdx + 1]; cb = spearPkg.masterBuf[spearIdx + 2];
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

const compassPath = path.join(ROOT, 'art', 'review', 'equipment_batch2_full_set_compass_4x.png');
writePNG(compassPath, compassW, compassH, compassBuf);
console.log('Wrote full set compass review:', compassPath);

console.log('All Batch 2 Equipment Layers generated and exported successfully!');
