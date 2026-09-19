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
const C_HAFT_L     = pal.snap(0x7D, 0x4D, 0x18); // 141 #7d4d18 lit wood haft
const C_HAFT_M     = pal.snap(0x5D, 0x35, 0x0C); // 143 #5d350c mid wood haft
const C_HAFT_D     = pal.snap(0x3D, 0x24, 0x0C); // 145 #3d240c shadow wood haft
const C_CORD_L     = pal.snap(0xCA, 0xB2, 0x92); // 136 #cab292 hemp cord lit
const C_CORD_D     = pal.snap(0xAA, 0x86, 0x59); // 138 #aa8659 hemp cord shadow
const C_OUT        = pal.snap(0x20, 0x14, 0x08); // 147 #201408 selective dark outline

// Wood plank shield ramps
const C_PLANK_L    = pal.snap(0x9A, 0x71, 0x41); // 139 #9a7141 lit plank
const C_PLANK_M    = pal.snap(0x8A, 0x5D, 0x2D); // 140 #8a5d2d mid plank
const C_PLANK_D    = pal.snap(0x7D, 0x4D, 0x18); // 141 #7d4d18 shadow plank
const C_PLANK_SEAM = pal.snap(0x3D, 0x24, 0x0C); // 145 #3d240c plank seam

// Fiber wrap clothing ramps
const C_FIBER_HL   = pal.snap(0xEF, 0xDB, 0xC6); // straw highlight
const C_FIBER_L    = pal.snap(0xCA, 0xB2, 0x92); // lit grass fiber
const C_FIBER_M    = pal.snap(0xAA, 0x86, 0x59); // mid grass fiber
const C_FIBER_D    = pal.snap(0x7D, 0x5D, 0x2D); // shadow grass fiber
const C_FIBER_DARK = pal.snap(0x4D, 0x35, 0x18); // deep crease

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
// 1. STONE KNIFE GENERATOR
// ==========================================
function createStoneKnifeFrame(facing, dy = 0) {
    const buf = Buffer.alloc(48 * 48 * 4);
    if (facing === 'S') {
        // Knife held in settler's right hand (viewer's left), pointing down along hip
        // Grip above hand (cols 13..14, rows 30..31)
        setPx(buf, 13, 30 + dy, C_HAFT_L);
        setPx(buf, 14, 30 + dy, C_HAFT_M);
        setPx(buf, 13, 31 + dy, C_CORD_L);
        setPx(buf, 14, 31 + dy, C_CORD_D);
        // Grip area (rows 32..34 + dy) left transparent for settler fingers
        // Blade leaves fist at row 35, runs down to row 41
        setPx(buf, 13, 35 + dy, C_STONE_EDGE);
        setPx(buf, 14, 35 + dy, C_STONE_LIT);
        setPx(buf, 15, 35 + dy, C_STONE_SHAD);

        setPx(buf, 13, 36 + dy, C_STONE_EDGE);
        setPx(buf, 14, 36 + dy, C_STONE_LIT);
        setPx(buf, 15, 36 + dy, C_STONE_SHAD);

        setPx(buf, 14, 37 + dy, C_STONE_EDGE);
        setPx(buf, 15, 37 + dy, C_STONE_MID);
        setPx(buf, 16, 37 + dy, C_STONE_DARK);

        setPx(buf, 14, 38 + dy, C_STONE_EDGE);
        setPx(buf, 15, 38 + dy, C_STONE_SHAD);

        setPx(buf, 15, 39 + dy, C_STONE_LIT);
        setPx(buf, 15, 40 + dy, C_STONE_MID);
        setPx(buf, 15, 41 + dy, C_OUT); // point

        setPx(buf, 12, 35 + dy, C_OUT);
        setPx(buf, 12, 36 + dy, C_OUT);
        setPx(buf, 13, 37 + dy, C_OUT);
        setPx(buf, 16, 38 + dy, C_OUT);
    } else if (facing === 'SW') {
        setPx(buf, 11, 30 + dy, C_HAFT_L);
        setPx(buf, 11, 31 + dy, C_CORD_L);
        // Blade
        setPx(buf, 10, 34 + dy, C_STONE_EDGE);
        setPx(buf, 11, 34 + dy, C_STONE_LIT);
        setPx(buf, 10, 35 + dy, C_STONE_EDGE);
        setPx(buf, 11, 35 + dy, C_STONE_SHAD);
        setPx(buf, 10, 36 + dy, C_STONE_LIT);
        setPx(buf, 10, 37 + dy, C_OUT);
    } else if (facing === 'W') {
        // Profile view
        setPx(buf, 26, 30 + dy, C_HAFT_L);
        setPx(buf, 26, 31 + dy, C_CORD_L);
        setPx(buf, 26, 34 + dy, C_STONE_EDGE);
        setPx(buf, 27, 34 + dy, C_STONE_LIT);
        setPx(buf, 26, 35 + dy, C_STONE_EDGE);
        setPx(buf, 27, 35 + dy, C_STONE_SHAD);
        setPx(buf, 26, 36 + dy, C_STONE_MID);
        setPx(buf, 26, 37 + dy, C_OUT);
    } else if (facing === 'NW') {
        setPx(buf, 19, 31 + dy, C_HAFT_M);
        setPx(buf, 19, 34 + dy, C_STONE_LIT);
        setPx(buf, 20, 34 + dy, C_STONE_SHAD);
        setPx(buf, 19, 35 + dy, C_STONE_MID);
        setPx(buf, 19, 36 + dy, C_OUT);
    } else if (facing === 'N') {
        // Back view: knife is tucked at settler's right flank (viewer's right, cols 33..35)
        setPx(buf, 33, 31 + dy, C_HAFT_M);
        setPx(buf, 33, 34 + dy, C_STONE_MID);
        setPx(buf, 34, 34 + dy, C_STONE_DARK);
        setPx(buf, 33, 35 + dy, C_STONE_SHAD);
        setPx(buf, 33, 36 + dy, C_OUT);
    }
    return buf;
}

// ==========================================
// 2. STONE PICK GENERATOR
// ==========================================
function createStonePickFrame(facing, dy = 0) {
    const buf = Buffer.alloc(48 * 48 * 4);
    if (facing === 'S') {
        // Pick resting head-down or held with double-pointed head at chest
        // Haft runs vertically from row 26 to row 40
        for (let y = 35 + dy; y <= 40 + dy; y++) {
            setPx(buf, 13, y, C_HAFT_L);
            setPx(buf, 14, y, C_HAFT_M);
            setPx(buf, 15, y, C_HAFT_D);
        }
        // Grip area (rows 32..34) left transparent
        for (let y = 26 + dy; y <= 31 + dy; y++) {
            setPx(buf, 13, y, C_HAFT_L);
            setPx(buf, 14, y, C_HAFT_M);
            setPx(buf, 15, y, C_HAFT_D);
        }
        // Cord lashing at T-socket
        setPx(buf, 12, 25 + dy, C_CORD_L);
        setPx(buf, 13, 25 + dy, C_CORD_L);
        setPx(buf, 14, 25 + dy, C_CORD_D);
        setPx(buf, 15, 25 + dy, C_CORD_D);
        setPx(buf, 16, 25 + dy, C_CORD_D);

        // Double-pointed knapped pick head across top (rows 23..26, cols 7..21)
        // Left point
        setPx(buf, 7, 26 + dy, C_OUT);
        setPx(buf, 8, 25 + dy, C_STONE_EDGE);
        setPx(buf, 8, 26 + dy, C_STONE_LIT);
        setPx(buf, 9, 24 + dy, C_STONE_EDGE);
        setPx(buf, 9, 25 + dy, C_STONE_LIT);
        setPx(buf, 10, 24 + dy, C_STONE_LIT);
        setPx(buf, 10, 25 + dy, C_STONE_MID);
        setPx(buf, 11, 24 + dy, C_STONE_LIT);
        setPx(buf, 11, 25 + dy, C_STONE_MID);

        // Center head
        setPx(buf, 12, 23 + dy, C_STONE_EDGE);
        setPx(buf, 12, 24 + dy, C_STONE_LIT);
        setPx(buf, 13, 23 + dy, C_STONE_EDGE);
        setPx(buf, 13, 24 + dy, C_STONE_LIT);
        setPx(buf, 14, 23 + dy, C_STONE_LIT);
        setPx(buf, 14, 24 + dy, C_STONE_MID);
        setPx(buf, 15, 23 + dy, C_STONE_MID);
        setPx(buf, 15, 24 + dy, C_STONE_SHAD);

        // Right point
        setPx(buf, 16, 24 + dy, C_STONE_MID);
        setPx(buf, 16, 25 + dy, C_STONE_SHAD);
        setPx(buf, 17, 24 + dy, C_STONE_SHAD);
        setPx(buf, 17, 25 + dy, C_STONE_DARK);
        setPx(buf, 18, 24 + dy, C_STONE_SHAD);
        setPx(buf, 18, 25 + dy, C_STONE_DARK);
        setPx(buf, 19, 25 + dy, C_STONE_EDGE);
        setPx(buf, 19, 26 + dy, C_STONE_DARK);
        setPx(buf, 20, 26 + dy, C_OUT);

        // Outlines
        setPx(buf, 10, 23 + dy, C_OUT);
        setPx(buf, 11, 23 + dy, C_OUT);
        setPx(buf, 16, 23 + dy, C_OUT);
        setPx(buf, 17, 23 + dy, C_OUT);
        setPx(buf, 13, 41 + dy, C_OUT);
        setPx(buf, 14, 41 + dy, C_OUT);
        setPx(buf, 15, 41 + dy, C_OUT);
    } else if (facing === 'SW') {
        for (let y = 34 + dy; y <= 39 + dy; y++) {
            setPx(buf, 11, y, C_HAFT_L); setPx(buf, 12, y, C_HAFT_M);
        }
        for (let y = 25 + dy; y <= 29 + dy; y++) {
            setPx(buf, 11, y, C_HAFT_L); setPx(buf, 12, y, C_HAFT_M);
        }
        setPx(buf, 10, 25 + dy, C_CORD_L); setPx(buf, 11, 25 + dy, C_CORD_D);
        // Head
        setPx(buf, 7, 25 + dy, C_STONE_EDGE); setPx(buf, 8, 25 + dy, C_STONE_LIT); setPx(buf, 9, 24 + dy, C_STONE_LIT);
        setPx(buf, 12, 24 + dy, C_STONE_MID); setPx(buf, 13, 24 + dy, C_STONE_SHAD); setPx(buf, 14, 25 + dy, C_STONE_EDGE);
    } else if (facing === 'W') {
        for (let y = 35 + dy; y <= 40 + dy; y++) {
            setPx(buf, 26, y, C_HAFT_L); setPx(buf, 27, y, C_HAFT_M);
        }
        for (let y = 26 + dy; y <= 30 + dy; y++) {
            setPx(buf, 26, y, C_HAFT_L); setPx(buf, 27, y, C_HAFT_M);
        }
        setPx(buf, 25, 26 + dy, C_CORD_L); setPx(buf, 26, 26 + dy, C_CORD_D);
        setPx(buf, 23, 25 + dy, C_STONE_EDGE); setPx(buf, 24, 25 + dy, C_STONE_LIT); setPx(buf, 25, 25 + dy, C_STONE_LIT);
        setPx(buf, 27, 25 + dy, C_STONE_MID); setPx(buf, 28, 25 + dy, C_STONE_SHAD); setPx(buf, 29, 26 + dy, C_OUT);
    } else if (facing === 'NW') {
        for (let y = 35 + dy; y <= 39 + dy; y++) {
            setPx(buf, 19, y, C_HAFT_M); setPx(buf, 20, y, C_HAFT_D);
        }
        for (let y = 26 + dy; y <= 30 + dy; y++) {
            setPx(buf, 19, y, C_HAFT_M); setPx(buf, 20, y, C_HAFT_D);
        }
        setPx(buf, 17, 25 + dy, C_STONE_EDGE); setPx(buf, 18, 25 + dy, C_STONE_MID);
        setPx(buf, 21, 25 + dy, C_STONE_SHAD); setPx(buf, 22, 26 + dy, C_OUT);
    } else if (facing === 'N') {
        for (let y = 35 + dy; y <= 40 + dy; y++) {
            setPx(buf, 33, y, C_HAFT_M); setPx(buf, 34, y, C_HAFT_D);
        }
        for (let y = 26 + dy; y <= 30 + dy; y++) {
            setPx(buf, 33, y, C_HAFT_M); setPx(buf, 34, y, C_HAFT_D);
        }
        setPx(buf, 32, 26 + dy, C_CORD_D); setPx(buf, 33, 26 + dy, C_CORD_L);
        // Head across back
        setPx(buf, 28, 25 + dy, C_STONE_EDGE); setPx(buf, 29, 24 + dy, C_STONE_LIT); setPx(buf, 30, 24 + dy, C_STONE_MID);
        setPx(buf, 35, 24 + dy, C_STONE_SHAD); setPx(buf, 36, 24 + dy, C_STONE_DARK); setPx(buf, 37, 25 + dy, C_STONE_EDGE);
    }
    return buf;
}

// ==========================================
// 3. WOODEN SHIELD GENERATOR
// ==========================================
function createWoodShieldFrame(facing, dy = 0) {
    const buf = Buffer.alloc(48 * 48 * 4);
    if (facing === 'S') {
        // Held on off-hand (viewer's right, cols 29..40, rows 29..41)
        // 12x12 circular wooden plank shield with iron boss
        const cx = 34, cy = 35 + dy;
        for (let y = -6; y <= 6; y++) {
            for (let x = -6; x <= 6; x++) {
                const distSq = x * x + y * y;
                if (distSq <= 36) {
                    const px = cx + x;
                    const py = cy + y;
                    if (distSq > 28) {
                        // Rawhide rim
                        setPx(buf, px, py, x <= 0 && y <= 0 ? C_CORD_L : C_CORD_D);
                    } else if (distSq <= 5) {
                        // Iron center boss
                        if (x <= 0 && y <= 0) setPx(buf, px, py, C_STONE_EDGE);
                        else if (x <= 0 || y <= 0) setPx(buf, px, py, C_STONE_LIT);
                        else setPx(buf, px, py, C_STONE_SHAD);
                    } else {
                        // Planks
                        if (x === -2 || x === 2) {
                            setPx(buf, px, py, C_PLANK_SEAM);
                        } else if (x < 0) {
                            setPx(buf, px, py, C_PLANK_L);
                        } else if (x === 0 || x === 1) {
                            setPx(buf, px, py, C_PLANK_M);
                        } else {
                            setPx(buf, px, py, C_PLANK_D);
                        }
                    }
                }
            }
        }
        // Outline around rim
        for (let a = 0; a < 360; a += 15) {
            const rad = a * Math.PI / 180;
            const ox = Math.round(cx + 6.5 * Math.cos(rad));
            const oy = Math.round(cy + 6.5 * Math.sin(rad));
            if (oy >= cy || ox >= cx) setPx(buf, ox, oy, C_OUT);
        }
    } else if (facing === 'SW') {
        // 3/4 turn angled shield
        const cx = 27, cy = 34 + dy;
        for (let y = -5; y <= 5; y++) {
            for (let x = -3; x <= 3; x++) {
                const px = cx + x, py = cy + y;
                if (Math.abs(y) === 5 && Math.abs(x) === 3) continue;
                if (Math.abs(x) === 3 || Math.abs(y) === 5) setPx(buf, px, py, C_CORD_D);
                else if (x === 0 && Math.abs(y) <= 1) setPx(buf, px, py, C_STONE_LIT);
                else setPx(buf, px, py, C_PLANK_M);
            }
        }
    } else if (facing === 'W') {
        // West facing: Profile view, shield seen edge-on at cols 17..19, rows 30..40
        for (let y = 30 + dy; y <= 40 + dy; y++) {
            setPx(buf, 17, y, C_CORD_D);
            setPx(buf, 18, y, C_PLANK_D);
            setPx(buf, 19, y, C_OUT);
        }
        setPx(buf, 16, 35 + dy, C_STONE_LIT); // boss side profile
    } else if (facing === 'NW') {
        // Back-3/4 angle: shield on left arm in 3/4 perspective
        const cx = 19, cy = 33 + dy;
        for (let y = -5; y <= 5; y++) {
            for (let x = -3; x <= 3; x++) {
                const px = cx + x, py = cy + y;
                if (Math.abs(y) === 5 && Math.abs(x) === 3) continue;
                if (Math.abs(x) === 3 || Math.abs(y) === 5) setPx(buf, px, py, C_OUT);
                else if (y === 0 || y === 1) setPx(buf, px, py, y === 0 ? C_CORD_L : C_CORD_D); // arm strap
                else setPx(buf, px, py, x < 0 ? C_PLANK_M : C_PLANK_D);
            }
        }
    } else if (facing === 'N') {
        // North facing: shield on left arm (screen left, cols 11..19, rows 27..37) seen from behind
        const cx = 15, cy = 32 + dy;
        for (let y = -5; y <= 5; y++) {
            for (let x = -5; x <= 5; x++) {
                if (x * x + y * y <= 25) {
                    const px = cx + x, py = cy + y;
                    if (x * x + y * y > 18) {
                        setPx(buf, px, py, C_OUT); // rim
                    } else if (y === 0 || y === 1) {
                        setPx(buf, px, py, y === 0 ? C_CORD_L : C_CORD_D); // leather arm strap
                    } else {
                        // Vertical wood planks with seam
                        if (x === -2 || x === 2) setPx(buf, px, py, C_PLANK_SEAM);
                        else setPx(buf, px, py, x < 0 ? C_PLANK_M : C_PLANK_D);
                    }
                }
            }
        }
    }
    return buf;
}

// ==========================================
// 4. FIBER WRAP GENERATOR
// ==========================================
function createFiberWrapFrame(facing, dy = 0) {
    const buf = Buffer.alloc(48 * 48 * 4);
    if (facing === 'S') {
        // Torso & hip wrap covering rows 24..36
        // Shoulders & Chest
        for (let y = 24 + dy; y <= 30 + dy; y++) {
            const rowW = (y - (24 + dy)) * 2;
            const minX = Math.max(15, 24 - 4 - rowW);
            const maxX = Math.min(33, 24 + 3 + rowW);
            for (let x = minX; x <= maxX; x++) {
                // V-neck open at center top
                if (y <= 26 + dy && x >= 22 && x <= 25) continue;
                // Diagonal cross-weave pattern
                const pat = (x + y) % 3;
                if (pat === 0) setPx(buf, x, y, C_FIBER_HL);
                else if (pat === 1) setPx(buf, x, y, x < 24 ? C_FIBER_L : C_FIBER_M);
                else setPx(buf, x, y, x < 24 ? C_FIBER_M : C_FIBER_D);
            }
        }
        // Woven cord belt (rows 31..32 + dy)
        for (let x = 14; x <= 34; x++) {
            setPx(buf, x, 31 + dy, (x % 2 === 0) ? C_FIBER_HL : C_FIBER_L);
            setPx(buf, x, 32 + dy, (x % 2 === 0) ? C_FIBER_D : C_FIBER_DARK);
        }
        // Skirt wrap (rows 33..35 + dy)
        for (let y = 33 + dy; y <= 35 + dy; y++) {
            for (let x = 15; x <= 33; x++) {
                const pat = (x - y) % 3;
                if (pat === 0) setPx(buf, x, y, C_FIBER_L);
                else if (pat === 1) setPx(buf, x, y, C_FIBER_M);
                else setPx(buf, x, y, C_FIBER_D);
            }
        }
        // Frayed grass hem (row 36 + dy)
        for (let x = 16; x <= 32; x += 2) {
            setPx(buf, x, 36 + dy, C_FIBER_L);
            setPx(buf, x + 1, 36 + dy, C_OUT);
        }
    } else if (facing === 'SW') {
        // 3/4 front view
        for (let y = 24 + dy; y <= 30 + dy; y++) {
            const minX = (y === 24 + dy) ? 14 : 11;
            const maxX = (y === 24 + dy) ? 26 : 28;
            for (let x = minX; x <= maxX; x++) {
                if (y <= 25 + dy && x >= 18 && x <= 21) continue; // neck open
                const pat = (x + y) % 3;
                if (pat === 0) setPx(buf, x, y, C_FIBER_HL);
                else if (pat === 1) setPx(buf, x, y, x < 19 ? C_FIBER_L : C_FIBER_M);
                else setPx(buf, x, y, x < 19 ? C_FIBER_M : C_FIBER_D);
            }
        }
        // Cord belt
        for (let x = 10; x <= 28; x++) {
            setPx(buf, x, 31 + dy, (x % 2 === 0) ? C_FIBER_HL : C_FIBER_L);
            setPx(buf, x, 32 + dy, (x % 2 === 0) ? C_FIBER_D : C_FIBER_DARK);
        }
        // Skirt wrap
        for (let y = 33 + dy; y <= 35 + dy; y++) {
            for (let x = 11; x <= 27; x++) {
                const pat = (x - y) % 3;
                setPx(buf, x, y, pat === 0 ? C_FIBER_L : (pat === 1 ? C_FIBER_M : C_FIBER_D));
            }
        }
        // Frayed hem
        for (let x = 12; x <= 26; x += 2) {
            setPx(buf, x, 36 + dy, C_FIBER_L);
            setPx(buf, x + 1, 36 + dy, C_OUT);
        }
    } else if (facing === 'W') {
        // Side view
        for (let y = 24 + dy; y <= 30 + dy; y++) {
            const minX = (y === 24 + dy) ? 19 : 17;
            const maxX = (y === 24 + dy) ? 27 : 29;
            for (let x = minX; x <= maxX; x++) {
                const pat = (x + y) % 3;
                setPx(buf, x, y, x < 23 ? (pat === 0 ? C_FIBER_HL : C_FIBER_L) : (pat === 0 ? C_FIBER_M : C_FIBER_D));
            }
        }
        // Cord belt
        for (let x = 17; x <= 29; x++) {
            setPx(buf, x, 31 + dy, (x % 2 === 0) ? C_FIBER_HL : C_FIBER_L);
            setPx(buf, x, 32 + dy, (x % 2 === 0) ? C_FIBER_D : C_FIBER_DARK);
        }
        // Skirt wrap
        for (let y = 33 + dy; y <= 35 + dy; y++) {
            for (let x = 17; x <= 28; x++) {
                const pat = (x - y) % 3;
                setPx(buf, x, y, pat === 0 ? C_FIBER_L : (pat === 1 ? C_FIBER_M : C_FIBER_D));
            }
        }
        // Frayed hem
        for (let x = 18; x <= 27; x += 2) {
            setPx(buf, x, 36 + dy, C_FIBER_L);
            setPx(buf, x + 1, 36 + dy, C_OUT);
        }
    } else if (facing === 'NW') {
        // 3/4 back view
        for (let y = 24 + dy; y <= 30 + dy; y++) {
            const minX = (y === 24 + dy) ? 22 : 19;
            const maxX = (y === 24 + dy) ? 35 : 37;
            for (let x = minX; x <= maxX; x++) {
                const pat = (x + y) % 3;
                setPx(buf, x, y, x < 28 ? (pat === 0 ? C_FIBER_L : C_FIBER_M) : (pat === 0 ? C_FIBER_M : C_FIBER_D));
            }
        }
        // Cord belt
        for (let x = 19; x <= 36; x++) {
            setPx(buf, x, 31 + dy, (x % 2 === 0) ? C_FIBER_HL : C_FIBER_L);
            setPx(buf, x, 32 + dy, (x % 2 === 0) ? C_FIBER_D : C_FIBER_DARK);
        }
        // Skirt wrap
        for (let y = 33 + dy; y <= 35 + dy; y++) {
            for (let x = 20; x <= 35; x++) {
                const pat = (x - y) % 3;
                setPx(buf, x, y, pat === 0 ? C_FIBER_L : (pat === 1 ? C_FIBER_M : C_FIBER_D));
            }
        }
        // Frayed hem
        for (let x = 21; x <= 34; x += 2) {
            setPx(buf, x, 36 + dy, C_FIBER_L);
            setPx(buf, x + 1, 36 + dy, C_OUT);
        }
    } else if (facing === 'N') {
        // Back view
        for (let y = 24 + dy; y <= 30 + dy; y++) {
            const minX = (y === 24 + dy) ? 16 : 14;
            const maxX = (y === 24 + dy) ? 32 : 34;
            for (let x = minX; x <= maxX; x++) {
                if (y <= 24 + dy && x >= 21 && x <= 26) continue; // neck cutout
                const pat = (x + y) % 3;
                setPx(buf, x, y, x < 24 ? (pat === 0 ? C_FIBER_L : C_FIBER_M) : (pat === 0 ? C_FIBER_M : C_FIBER_D));
            }
        }
        // Cord belt
        for (let x = 14; x <= 34; x++) {
            setPx(buf, x, 31 + dy, (x % 2 === 0) ? C_FIBER_HL : C_FIBER_L);
            setPx(buf, x, 32 + dy, (x % 2 === 0) ? C_FIBER_D : C_FIBER_DARK);
        }
        // Skirt wrap
        for (let y = 33 + dy; y <= 35 + dy; y++) {
            for (let x = 15; x <= 33; x++) {
                const pat = (x - y) % 3;
                setPx(buf, x, y, pat === 0 ? C_FIBER_L : (pat === 1 ? C_FIBER_M : C_FIBER_D));
            }
        }
        // Frayed hem
        for (let x = 16; x <= 32; x += 2) {
            setPx(buf, x, 36 + dy, C_FIBER_L);
            setPx(buf, x + 1, 36 + dy, C_OUT);
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

// Generate all 4 assets in Batch 1
const knifePkg  = buildAssetPackage('stone_knife', 'Stone Knife', 'weapon', 'weapon', createStoneKnifeFrame);
const pickPkg   = buildAssetPackage('stone_pick', 'Stone Pick', 'weapon', 'weapon', createStonePickFrame);
const shieldPkg = buildAssetPackage('shield_wood', 'Wooden Shield', 'shield', 'shield', createWoodShieldFrame);
const wrapPkg   = buildAssetPackage('fiber_wrap', 'Woven Grass Wrap', 'torso', 'torso', createFiberWrapFrame);

// Load base settler and meadow for composites
const settlerPng = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'human_male_stand.png')));
const meadowPng  = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'meadow.png')));

// Review 1: Full Settler Equipment Lineup (4 sets of 8 facings = 32 columns x 48 px at 4x = 1536 x 192 px)
// Set 1: Settler + Stone Knife
// Set 2: Settler + Stone Pick
// Set 3: Settler + Wooden Shield
// Set 4: Settler + Fiber Wrap
const lineupW = 48 * 8 * 4;
const lineupH = 48 * 4 * 4; // 4 rows of 48 px at 4x = 768 px
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

const pkgs = [
    { pkg: knifePkg, name: 'Stone Knife' },
    { pkg: pickPkg, name: 'Stone Pick' },
    { pkg: shieldPkg, name: 'Wooden Shield' },
    { pkg: wrapPkg, name: 'Fiber Wrap' }
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
                const isBehind = (r === 4 && (pIdx < 3)); // North facing weapons/shield

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

const lineupPath = path.join(ROOT, 'art', 'review', 'equipment_batch1_lineup_4x.png');
writePNG(lineupPath, lineupW, lineupH, lineupBuf);
console.log('Wrote review lineup:', lineupPath);

// Review 2: Fully Equipped Settler Compass Layout (Fiber Wrap + Wooden Shield + Stone Axe)
// 3x3 tiles at 4x = 576 x 576 px
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

const axePng = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'stone_axe_layer_idle.png')));

for (const node of compassMap) {
    const tileStartX = node.gx * 48 * 4;
    const tileStartY = node.gy * 48 * 4;
    const r = node.r;

    for (let py = 0; py < 48; py++) {
        for (let px = 0; px < 48; px++) {
            const bIdx = ((r * 48 + py) * 48 + px) * 4;
            const wrapIdx = ((r * 48 + py) * wrapPkg.masterW + px) * 4;
            const shieldIdx = ((r * 48 + py) * shieldPkg.masterW + px) * 4;
            const axeIdx = ((r * 48 + py) * axePng.width + px) * 4;

            let cr = null, cg = null, cb = null;
            const isBehind = (r === 4); // North facing

            // Layer stack:
            // Behind items -> Body -> Clothes (Fiber Wrap) -> Shield -> Weapon (Stone Axe)
            if (isBehind) {
                if (axePng.data[axeIdx + 3] > 0) {
                    cr = axePng.data[axeIdx]; cg = axePng.data[axeIdx + 1]; cb = axePng.data[axeIdx + 2];
                }
                if (shieldPkg.masterBuf[shieldIdx + 3] > 0) {
                    cr = shieldPkg.masterBuf[shieldIdx]; cg = shieldPkg.masterBuf[shieldIdx + 1]; cb = shieldPkg.masterBuf[shieldIdx + 2];
                }
                if (settlerPng.data[bIdx + 3] > 0) {
                    cr = settlerPng.data[bIdx]; cg = settlerPng.data[bIdx + 1]; cb = settlerPng.data[bIdx + 2];
                }
                if (wrapPkg.masterBuf[wrapIdx + 3] > 0) {
                    cr = wrapPkg.masterBuf[wrapIdx]; cg = wrapPkg.masterBuf[wrapIdx + 1]; cb = wrapPkg.masterBuf[wrapIdx + 2];
                }
            } else {
                if (settlerPng.data[bIdx + 3] > 0) {
                    cr = settlerPng.data[bIdx]; cg = settlerPng.data[bIdx + 1]; cb = settlerPng.data[bIdx + 2];
                }
                if (wrapPkg.masterBuf[wrapIdx + 3] > 0) {
                    cr = wrapPkg.masterBuf[wrapIdx]; cg = wrapPkg.masterBuf[wrapIdx + 1]; cb = wrapPkg.masterBuf[wrapIdx + 2];
                }
                if (shieldPkg.masterBuf[shieldIdx + 3] > 0) {
                    cr = shieldPkg.masterBuf[shieldIdx]; cg = shieldPkg.masterBuf[shieldIdx + 1]; cb = shieldPkg.masterBuf[shieldIdx + 2];
                }
                if (axePng.data[axeIdx + 3] > 0) {
                    cr = axePng.data[axeIdx]; cg = axePng.data[axeIdx + 1]; cb = axePng.data[axeIdx + 2];
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

const fullSetCompassPath = path.join(ROOT, 'art', 'review', 'equipment_batch1_full_set_compass_4x.png');
writePNG(fullSetCompassPath, compassW, compassH, compassBuf);
console.log('Wrote full set compass review:', fullSetCompassPath);

console.log('All Batch 1 Equipment Layers generated and exported successfully!');
