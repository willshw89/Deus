const fs = require('fs');
const path = require('path');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

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
        snap: (r, g, b) => {
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

// -------------------------------------------------------------
// 1. BUILD STRAW BED (floor_straw)
// -------------------------------------------------------------
console.log('Building floor_straw (Straw Bed pallet)...');
const bedGrid = Array.from({ length: 48 }, () => Array(48).fill(null));

// Exact palette colors for straw bed from SEG-05
const STRAW_HIGHLIGHT = pal.snap(247, 231, 166); // #f7e7a6 - bright sunlit stalks
const STRAW_GOLD      = pal.snap(243, 223, 121); // #f3df79 - vibrant golden straw body
const STRAW_MID       = pal.snap(202, 178, 146); // #cab292 - woven shadow / mid tone
const STRAW_SHADOW    = pal.snap(170, 134, 89);  // #aa8659 - hollow depression & deep straw
const STRAW_DARK      = pal.snap(154, 113, 65);  // #9a7141 - edge rim stalks
const TWINE_BODY      = pal.snap(93, 53, 12);    // #5d350c - dark hemp rope twine ties
const TWINE_LIGHT     = pal.snap(125, 77, 24);   // #7d4d18 - twine highlight
const OUTLINE_DARK    = pal.snap(32, 20, 8);     // #201408 - selective silhouette
const CONTACT_GROUND  = pal.snap(69, 69, 69);    // #454545 - ground contact

// Pallet footprint: rows 24..47, cols 6..41 (rounded rectangle 36 wide x 24 high)
for (let y = 24; y <= 47; y++) {
    for (let x = 6; x <= 41; x++) {
        // Rounded corner cutoffs
        const cornerNW = (x <= 8 && y <= 25);
        const cornerNE = (x >= 39 && y <= 25);
        const cornerSW = (x <= 7 && y >= 46);
        const cornerSE = (x >= 40 && y >= 46);
        if (cornerNW || cornerNE || cornerSW || cornerSE) continue;

        const isBorder = (x === 6 || x === 41 || y === 24 || y === 47);
        const isDepression = (x >= 14 && x <= 33 && y >= 29 && y <= 40);

        if (y === 47) {
            // Ground contact row
            bedGrid[y][x] = CONTACT_GROUND;
        } else if (isBorder) {
            bedGrid[y][x] = (y === 24 || x === 6) ? STRAW_MID : OUTLINE_DARK;
        } else if (isDepression) {
            // Slept-in indentation hollow
            const dNoise = ((x * 17) ^ (y * 29)) & 7;
            if (dNoise === 0) bedGrid[y][x] = STRAW_DARK;
            else if (dNoise < 4) bedGrid[y][x] = STRAW_SHADOW;
            else bedGrid[y][x] = STRAW_MID;
        } else {
            // Raised straw bed rim and woven stalk pattern
            const sNoise = ((x * 13) ^ (y * 31)) & 7;
            const isStalkLine = (y % 2 === 0);
            if (isStalkLine && sNoise < 3) bedGrid[y][x] = STRAW_HIGHLIGHT;
            else if (sNoise === 0) bedGrid[y][x] = STRAW_MID;
            else if (sNoise < 5) bedGrid[y][x] = STRAW_GOLD;
            else bedGrid[y][x] = STRAW_DARK;
        }
    }
}

// Add two vertical twine binding ties at cols 13..14 and 33..34
for (let y = 24; y <= 46; y++) {
    [13, 14, 33, 34].forEach(col => {
        if (bedGrid[y][col] !== null) {
            bedGrid[y][col] = (col === 13 || col === 33) ? TWINE_LIGHT : TWINE_BODY;
        }
    });
}

// Export floor_straw files
const bedBuf = Buffer.alloc(48 * 48 * 4);
for (let y = 0; y < 48; y++) {
    for (let x = 0; x < 48; x++) {
        const o = (y * 48 + x) * 4;
        const c = bedGrid[y][x];
        if (c) {
            bedBuf[o] = c[0]; bedBuf[o + 1] = c[1]; bedBuf[o + 2] = c[2]; bedBuf[o + 3] = 255;
        } else {
            bedBuf[o] = 255; bedBuf[o + 1] = 0; bedBuf[o + 2] = 255; bedBuf[o + 3] = 0;
        }
    }
}

const bedMasterPng = path.join(ROOT, 'art', 'masters', 'floor_straw.png');
writePNG(bedMasterPng, 48, 48, bedBuf);

const bedSidecar = {
    id: "floor_straw",
    name: "Straw Bed Pallet",
    category: "Building",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S"],
    animations: { "stand": [0] }
};
fs.writeFileSync(path.join(ROOT, 'art', 'masters', 'floor_straw.json'), JSON.stringify(bedSidecar, null, 2));

// RMMZ export
const bedRmmzPng = path.join(ROOT, 'game', 'img', 'characters', '!$UF_Straw_Bed.png');
writePNG(bedRmmzPng, 48, 48, bedBuf);
fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Straw_Bed.json'), JSON.stringify(bedSidecar, null, 2));

// Raw 4x delivery canvas on #FF00FF
const bedRawBuf = Buffer.alloc(192 * 192 * 4);
for (let y = 0; y < 192; y++) {
    const sy = Math.floor(y / 4);
    for (let x = 0; x < 192; x++) {
        const sx = Math.floor(x / 4);
        const so = (sy * 48 + sx) * 4;
        const dof = (y * 192 + x) * 4;
        if (bedBuf[so + 3] === 255) {
            bedRawBuf[dof] = bedBuf[so]; bedRawBuf[dof + 1] = bedBuf[so + 1]; bedRawBuf[dof + 2] = bedBuf[so + 2]; bedRawBuf[dof + 3] = 255;
        } else {
            bedRawBuf[dof] = 255; bedRawBuf[dof + 1] = 0; bedRawBuf[dof + 2] = 255; bedRawBuf[dof + 3] = 255;
        }
    }
}
writePNG(path.join(ROOT, 'art', 'raw', 'floor_straw.png'), 192, 192, bedRawBuf);

// Review 4x render
const bedReviewBuf = Buffer.alloc(192 * 192 * 4);
for (let y = 0; y < 192; y++) {
    const sy = Math.floor(y / 4);
    for (let x = 0; x < 192; x++) {
        const sx = Math.floor(x / 4);
        const so = (sy * 48 + sx) * 4;
        const dof = (y * 192 + x) * 4;
        if (bedBuf[so + 3] === 255) {
            bedReviewBuf[dof] = bedBuf[so]; bedReviewBuf[dof + 1] = bedBuf[so + 1]; bedReviewBuf[dof + 2] = bedBuf[so + 2]; bedReviewBuf[dof + 3] = 255;
        } else {
            // Meadow grass background for review
            const isAlt = ((Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0);
            bedReviewBuf[dof] = 77; bedReviewBuf[dof + 1] = isAlt ? 93 : 85; bedReviewBuf[dof + 2] = 40; bedReviewBuf[dof + 3] = 255;
        }
    }
}
writePNG(path.join(ROOT, 'art', 'review', 'floor_straw_on_meadow_4x.png'), 192, 192, bedReviewBuf);
console.log('Saved floor_straw files.');

// -------------------------------------------------------------
// 2. BUILD STOCKPILE MARKER (stockpile)
// -------------------------------------------------------------
console.log('Building stockpile (Stockpile marker)...');
const pileGrid = Array.from({ length: 48 }, () => Array(48).fill(null));

const ROPE_DASH   = pal.snap(219, 202, 178); // #dbcab2 - pale linen rope dash
const ROPE_SHADOW = pal.snap(154, 113, 65);  // #9a7141 - rope shadow
const PEG_WOOD    = pal.snap(93, 53, 12);    // #5d350c - wooden corner peg
const PEG_LIGHT   = pal.snap(125, 77, 24);   // #7d4d18 - peg highlight
const FLOOR_DITH  = pal.snap(202, 178, 146); // #cab292 - subtle floor designation dither

// Dashed border: rows 3..4 and 43..44, cols 3..4 and 43..44
// 6-px dashes with 6-px gaps along all 4 edges
for (let i = 3; i <= 44; i++) {
    // Determine if index falls on a dash: 6px on, 6px off
    const rel = (i - 3) % 12;
    const isDash = (rel < 6);

    if (isDash) {
        // Top edge: rows 3..4
        pileGrid[3][i] = ROPE_DASH;
        pileGrid[4][i] = ROPE_DASH;
        pileGrid[5][i] = ROPE_SHADOW; // Shadow under top rope

        // Bottom edge: rows 43..44
        pileGrid[43][i] = ROPE_DASH;
        pileGrid[44][i] = ROPE_DASH;
        pileGrid[45][i] = ROPE_SHADOW; // Shadow under bottom rope

        // Left edge: cols 3..4
        pileGrid[i][3] = ROPE_DASH;
        pileGrid[i][4] = ROPE_DASH;
        pileGrid[i][5] = ROPE_SHADOW; // Shadow right of left rope

        // Right edge: cols 43..44
        pileGrid[i][43] = ROPE_DASH;
        pileGrid[i][44] = ROPE_DASH;
        pileGrid[i][45] = ROPE_SHADOW; // Shadow right of right rope
    }
}

// 4 Corner Pegs: 3x3 wooden pegs over corners
const corners = [
    [2, 2],   // NW
    [2, 42],  // NE
    [42, 2],  // SW
    [42, 42]  // SE
];
corners.forEach(([py, px]) => {
    for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
            pileGrid[py + y][px + x] = (y === 0 || x === 0) ? PEG_LIGHT : PEG_WOOD;
        }
    }
    // Shadow under peg
    for (let x = 0; x < 3; x++) {
        if (py + 3 < 48) pileGrid[py + 3][px + x] = OUTLINE_DARK;
    }
});

// Sparse interior dither: roughly 1 in 14 pixels
for (let y = 7; y <= 40; y++) {
    for (let x = 7; x <= 40; x++) {
        const hash = ((x * 19) ^ (y * 23)) & 15;
        if (hash === 0 && pileGrid[y][x] === null) {
            pileGrid[y][x] = FLOOR_DITH;
        }
    }
}

// Export stockpile files
const pileBuf = Buffer.alloc(48 * 48 * 4);
for (let y = 0; y < 48; y++) {
    for (let x = 0; x < 48; x++) {
        const o = (y * 48 + x) * 4;
        const c = pileGrid[y][x];
        if (c) {
            pileBuf[o] = c[0]; pileBuf[o + 1] = c[1]; pileBuf[o + 2] = c[2]; pileBuf[o + 3] = 255;
        } else {
            pileBuf[o] = 255; pileBuf[o + 1] = 0; pileBuf[o + 2] = 255; pileBuf[o + 3] = 0;
        }
    }
}

const pileMasterPng = path.join(ROOT, 'art', 'masters', 'stockpile.png');
writePNG(pileMasterPng, 48, 48, pileBuf);

const pileSidecar = {
    id: "stockpile",
    name: "Stockpile Marker",
    category: "Building",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S"],
    animations: { "stand": [0] }
};
fs.writeFileSync(path.join(ROOT, 'art', 'masters', 'stockpile.json'), JSON.stringify(pileSidecar, null, 2));

// RMMZ export
const pileRmmzPng = path.join(ROOT, 'game', 'img', 'characters', '!$UF_Stockpile.png');
writePNG(pileRmmzPng, 48, 48, pileBuf);
fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Stockpile.json'), JSON.stringify(pileSidecar, null, 2));

// Raw 4x delivery canvas on #FF00FF
const pileRawBuf = Buffer.alloc(192 * 192 * 4);
for (let y = 0; y < 192; y++) {
    const sy = Math.floor(y / 4);
    for (let x = 0; x < 192; x++) {
        const sx = Math.floor(x / 4);
        const so = (sy * 48 + sx) * 4;
        const dof = (y * 192 + x) * 4;
        if (pileBuf[so + 3] === 255) {
            pileRawBuf[dof] = pileBuf[so]; pileRawBuf[dof + 1] = pileBuf[so + 1]; pileRawBuf[dof + 2] = pileBuf[so + 2]; pileRawBuf[dof + 3] = 255;
        } else {
            pileRawBuf[dof] = 255; pileRawBuf[dof + 1] = 0; pileRawBuf[dof + 2] = 255; pileRawBuf[dof + 3] = 255;
        }
    }
}
writePNG(path.join(ROOT, 'art', 'raw', 'stockpile.png'), 192, 192, pileRawBuf);

// Review 4x render
const pileReviewBuf = Buffer.alloc(192 * 192 * 4);
for (let y = 0; y < 192; y++) {
    const sy = Math.floor(y / 4);
    for (let x = 0; x < 192; x++) {
        const sx = Math.floor(x / 4);
        const so = (sy * 48 + sx) * 4;
        const dof = (y * 192 + x) * 4;
        if (pileBuf[so + 3] === 255) {
            pileReviewBuf[dof] = pileBuf[so]; pileReviewBuf[dof + 1] = pileBuf[so + 1]; pileReviewBuf[dof + 2] = pileBuf[so + 2]; pileReviewBuf[dof + 3] = 255;
        } else {
            const isAlt = ((Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0);
            pileReviewBuf[dof] = 77; pileReviewBuf[dof + 1] = isAlt ? 93 : 85; pileReviewBuf[dof + 2] = 40; pileReviewBuf[dof + 3] = 255;
        }
    }
}
writePNG(path.join(ROOT, 'art', 'review', 'stockpile_on_meadow_4x.png'), 192, 192, pileReviewBuf);
console.log('Saved stockpile files.');
