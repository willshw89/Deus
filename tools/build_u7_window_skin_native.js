const fs = require('fs');
const path = require('path');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// Load palette
const paletteLines = fs.readFileSync(PALETTE_FILE, 'utf8').trim().split(/\r?\n/);
const PALETTE = paletteLines.map(line => {
    const hex = line.trim().replace('#', '');
    return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16)
    ];
});

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

const palLab = PALETTE.map(c => srgbToLab(...c));
function snap(r, g, b) {
    const l = srgbToLab(r, g, b);
    let best = PALETTE[0], bd = Infinity;
    for (let i = 0; i < PALETTE.length; i++) {
        const d = labDist(l, palLab[i]);
        if (d < bd) { bd = d; best = PALETTE[i]; }
    }
    return best;
}

// Fixed 16-color cohesive set for U7 UI (all snapped to uf.hex)
const cInk        = snap(16, 12, 8);    // Outer dark shadow
const cSlateDark  = snap(28, 24, 20);   // Background base
const cSlateMid   = snap(42, 36, 30);   // Background grain
const cWoodDark   = snap(58, 34, 12);   // Carved walnut dark
const cWoodMid    = snap(88, 52, 18);   // Carved walnut mid
const cWoodLit    = snap(120, 75, 26);  // Carved walnut highlight
const cGoldDark   = snap(145, 95, 15);  // Gold shade
const cGoldMid    = snap(200, 150, 30); // Gold mid
const cGoldLit    = snap(240, 205, 50); // Gold bright
const cGoldGleam  = snap(255, 245, 140);// Gold specular

// System color chips (8 columns x 4 rows = 32 chips, reusing palette)
const cWhite   = snap(255, 255, 255);
const cBlueLit = snap(120, 190, 255);
const cBlueMid = snap(60, 120, 230);
const cRedLit  = snap(255, 110, 110);
const cRedMid  = snap(210, 50, 50);
const cGreenLit= snap(100, 230, 110);
const cGreenMid= snap(50, 170, 70);
const cGreyLit = snap(190, 190, 190);
const cGreyMid = snap(120, 120, 120);

// Native 64x64 grid (each pixel becomes 3x3 in 192x192)
const NW = 64, NH = 64;
const nativeBuf = Array.from({ length: NH }, () => Array.from({ length: NW }, () => [0, 0, 0, 0]));

function setNative(x, y, rgb, a = 255) {
    if (x < 0 || x >= NW || y < 0 || y >= NH) return;
    nativeBuf[y][x] = [rgb[0], rgb[1], rgb[2], a];
}

// 1. TOP-LEFT [0..31, 0..31]: Background (32x32 native)
// Seamless subtle texture
for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
        const n = ((x * 7 + y * 13) ^ (x * 19 + y * 5)) & 7;
        let c = cSlateDark;
        if (n === 0) c = cInk;
        else if (n === 3) c = cSlateMid;
        setNative(x, y, c, 255);
    }
}

// 2. BOTTOM-LEFT [0..31, 32..63]: Dim background (32x32 native)
for (let y = 32; y < 64; y++) {
    for (let x = 0; x < 32; x++) {
        const n = ((x * 11 + y * 17)) & 7;
        let c = cInk;
        if (n === 1) c = cSlateDark;
        setNative(x, y, c, 255);
    }
}

// 3. TOP-RIGHT [32..63, 0..31]: Window Frame 9-slice (32x32 native)
// Border width is 8 native pixels. Center [40..55, 8..23] is alpha 0!
for (let fy = 0; fy < 32; fy++) {
    for (let fx = 0; fx < 32; fx++) {
        const isCenter = (fx >= 8 && fx < 24 && fy >= 8 && fy < 24);
        if (isCenter) {
            setNative(fx + 32, fy, [0, 0, 0], 0);
            continue;
        }

        const dLeft = fx;
        const dRight = 31 - fx;
        const dTop = fy;
        const dBottom = 31 - fy;
        const dOuter = Math.min(dLeft, dRight, dTop, dBottom); // 0..7

        let c = cWoodMid;

        // Layer 0: Outermost dark rim
        if (dOuter === 0) {
            c = cInk;
        }
        // Layer 1: Outer fine gold wire
        else if (dOuter === 1) {
            c = (dTop === 1 || dLeft === 1) ? cGoldLit : cGoldMid;
        }
        // Layer 2: Gold shadow / bevel
        else if (dOuter === 2) {
            c = cGoldDark;
        }
        // Layer 3: Wood shadow groove
        else if (dOuter === 3) {
            c = cWoodDark;
        }
        // Layer 4: Carved wood highlight crest
        else if (dOuter === 4) {
            c = (dTop <= 4 || dLeft <= 4) ? cWoodLit : cWoodMid;
        }
        // Layer 5: Carved wood slope
        else if (dOuter === 5) {
            c = cWoodMid;
        }
        // Layer 6: Inner dark groove
        else if (dOuter === 6) {
            c = cWoodDark;
        }
        // Layer 7: Inner gold wire inlay
        else if (dOuter === 7) {
            c = (dTop <= 7 || dLeft <= 7) ? cGoldLit : cGoldMid;
        }

        // Corner studs: Small brass rivet at (4,4), (27,4), (4,27), (27,27)
        const corners = [
            Math.hypot(fx - 4, fy - 4),
            Math.hypot(fx - 27, fy - 4),
            Math.hypot(fx - 4, fy - 27),
            Math.hypot(fx - 27, fy - 27)
        ];
        const minCDist = Math.min(...corners);
        if (minCDist <= 1.6) {
            if (minCDist <= 0.6) c = cGoldGleam;
            else if (minCDist <= 1.1) c = cGoldLit;
            else c = cInk;
        }

        setNative(fx + 32, fy, c, 255);
    }
}

// 4. BOTTOM-RIGHT [32..63, 32..63]: Cursor, Arrows, Color Chips (32x32 native)
// A) Selection Cursor: [32..47, 32..47] (16x16 native = 48x48 at 3x)
// 9-slice cursor: outer 2px border, center 12x12 transparent!
for (let cy = 0; cy < 16; cy++) {
    for (let cx = 0; cx < 16; cx++) {
        const dEdge = Math.min(cx, 15 - cx, cy, 15 - cy);
        if (dEdge === 0) {
            setNative(cx + 32, cy + 32, cInk, 255);
        } else if (dEdge === 1) {
            const c = (cx === 1 || cy === 1) ? cGoldGleam : cGoldLit;
            setNative(cx + 32, cy + 32, c, 255);
        } else if (dEdge === 2) {
            setNative(cx + 32, cy + 32, cGoldDark, 255);
        } else {
            // Transparent interior so underlying item/text is pristine!
            setNative(cx + 32, cy + 32, [0, 0, 0], 0);
        }
    }
}

// B) Scroll Arrows (8x8 native = 24x24 at 3x)
// Up arrow: [48..55, 32..39]
// Down arrow: [48..55, 40..47]
function drawNativeArrow(ax, ay, isUp) {
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            setNative(ax + x, ay + y, [0, 0, 0], 0);
        }
    }
    for (let row = 0; row < 4; row++) {
        const y = isUp ? (2 + row) : (5 - row);
        const halfW = row;
        for (let dx = -halfW; dx <= halfW; dx++) {
            const x = 3 + dx;
            let c = cGoldLit;
            if (Math.abs(dx) === halfW || row === 3) {
                c = cInk;
            } else if (row === 0 || Math.abs(dx) === 0) {
                c = cGoldGleam;
            } else {
                c = cGoldMid;
            }
            setNative(ax + x, ay + y, c, 255);
        }
    }
}
drawNativeArrow(48, 32, true);  // Up
drawNativeArrow(48, 40, false); // Down
drawNativeArrow(56, 32, true);  // Up side
drawNativeArrow(56, 40, false); // Down side

// C) System Color Chips: [32..63, 48..63] (32x16 native = 96x48 at 3x)
// 8 cols x 4 rows of 4x4 native chips
const chipColors = [
    // Row 0: General text & highlights
    cWhite, cBlueLit, cRedLit, cGoldLit, cGreenLit, cBlueMid, cGreyLit, cWhite,
    // Row 1: Status & HP/MP
    cGreyMid, cBlueMid, cRedMid, cGreenMid, cGoldMid, cRedLit, cGreenLit, cGreyLit,
    // Row 2: Gauges
    cBlueMid, cGoldMid, cRedMid, cGreenMid, cGoldDark, cBlueLit, cGoldLit, cGreyLit,
    // Row 3: Accents & Dark
    cGreenMid, cRedMid, cBlueMid, cGoldLit, cGreenMid, cGoldMid, cGoldDark, cInk
];

for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 8; c++) {
        const col = chipColors[r * 8 + c];
        const x0 = 32 + c * 4;
        const y0 = 48 + r * 4;
        for (let dy = 0; dy < 4; dy++) {
            for (let dx = 0; dx < 4; dx++) {
                setNative(x0 + dx, y0 + dy, col, 255);
            }
        }
    }
}

// 5. UPSCALE 3X NEAREST-NEIGHBOR to 192x192
const W = 192, H = 192;
const masterBuf = Buffer.alloc(W * H * 4, 0);

for (let ny = 0; ny < NH; ny++) {
    for (let nx = 0; nx < NW; nx++) {
        const pixel = nativeBuf[ny][nx];
        for (let dy = 0; dy < 3; dy++) {
            for (let dx = 0; dx < 3; dx++) {
                const px = nx * 3 + dx;
                const py = ny * 3 + dy;
                const idx = (py * W + px) * 4;
                masterBuf[idx] = pixel[0];
                masterBuf[idx + 1] = pixel[1];
                masterBuf[idx + 2] = pixel[2];
                masterBuf[idx + 3] = pixel[3];
            }
        }
    }
}

// Count unique colors
const uniqueColors = new Set();
for (let i = 0; i < masterBuf.length; i += 4) {
    if (masterBuf[i + 3] === 255) {
        uniqueColors.add((masterBuf[i] << 16) | (masterBuf[i + 1] << 8) | masterBuf[i + 2]);
    }
}
console.log(`Native 3x Window skin unique colors: ${uniqueColors.size} (Limit 32)`);

// Write files
const destGame = path.join(ROOT, 'game', 'img', 'system', 'Window.png');
const destMaster = path.join(ROOT, 'art', 'masters', 'ui_window_skin.png');
const destReview = path.join(ROOT, 'art', 'review', 'u7_window_skin_review.png');

writePNG(destGame, W, H, masterBuf);
writePNG(destMaster, W, H, masterBuf);

// Write sidecar
const sidecar = {
    frameWidth: 192,
    frameHeight: 192,
    anchor: [24, 47],
    facings: ["S"],
    animations: { "stand": [0] }
};
fs.writeFileSync(path.join(ROOT, 'art', 'masters', 'ui_window_skin.json'), JSON.stringify(sidecar, null, 2) + '\n');

// Draw review mockup
const revW = 400, revH = 300;
const revBuf = Buffer.alloc(revW * revH * 4, 0);
for (let i = 0; i < revBuf.length; i += 4) {
    revBuf[i] = 18; revBuf[i + 1] = 20; revBuf[i + 2] = 24; revBuf[i + 3] = 255;
}

function drawWindow(wx, wy, ww, wh) {
    // 1. Background
    for (let y = wy + 4; y < wy + wh - 4; y++) {
        for (let x = wx + 4; x < wx + ww - 4; x++) {
            const bx = (x - wx) % 96;
            const by = (y - wy) % 96;
            const sidx = (by * W + bx) * 4;
            const didx = (y * revW + x) * 4;
            revBuf[didx] = masterBuf[sidx];
            revBuf[didx + 1] = masterBuf[sidx + 1];
            revBuf[didx + 2] = masterBuf[sidx + 2];
            revBuf[didx + 3] = 255;
        }
    }
    // 2. 9-slice frame
    const cw = 24, ch = 24;
    for (let y = 0; y < wh; y++) {
        for (let x = 0; x < ww; x++) {
            let sx = -1, sy = -1;
            if (x < cw) sx = 96 + x;
            else if (x >= ww - cw) sx = 192 - (ww - x);
            else sx = 120 + ((x - cw) % 48);

            if (y < ch) sy = y;
            else if (y >= wh - ch) sy = 96 - (wh - y);
            else sy = 24 + ((y - ch) % 48);

            const sidx = (sy * W + sx) * 4;
            const sa = masterBuf[sidx + 3];
            if (sa > 0) {
                const didx = ((wy + y) * revW + (wx + x)) * 4;
                revBuf[didx] = masterBuf[sidx];
                revBuf[didx + 1] = masterBuf[sidx + 1];
                revBuf[didx + 2] = masterBuf[sidx + 2];
                revBuf[didx + 3] = sa;
            }
        }
    }
}

drawWindow(20, 20, 360, 90);
drawWindow(20, 130, 140, 150);
drawWindow(170, 130, 210, 150);

writePNG(destReview, revW, revH, revBuf);
console.log(`Saved review to: ${destReview}`);
