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

// Dedicated palette colors for U7 style
const cBlack      = snap(12, 10, 8);
const cDarkShadow = snap(24, 20, 16);
const cSlateDark  = snap(34, 30, 26);
const cSlateMid   = snap(46, 40, 36);
const cSlateLight = snap(60, 52, 46);

const cWoodDark   = snap(50, 30, 15);
const cWoodMid    = snap(75, 45, 22);
const cWoodLit    = snap(105, 65, 32);
const cWoodBevel  = snap(130, 82, 42);

const cGoldDark   = snap(120, 85, 20);
const cGoldMid    = snap(175, 130, 35);
const cGoldLit    = snap(220, 180, 55);
const cGoldBright = snap(250, 225, 110);

const W = 192, H = 192;
const buf = Buffer.alloc(W * H * 4, 0);

function setPixel(x, y, rgb, a = 255) {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const idx = (y * W + x) * 4;
    buf[idx] = rgb[0];
    buf[idx + 1] = rgb[1];
    buf[idx + 2] = rgb[2];
    buf[idx + 3] = a;
}

// 1. TOP-LEFT [0..95, 0..95]: Background (Deep dark slate/blackened oak, subtle texture)
// Subtle 2px dither grain that tiles seamlessly at 96x96
for (let y = 0; y < 96; y++) {
    for (let x = 0; x < 96; x++) {
        const n = ((x * 17 + y * 31) ^ (x * 7 + y * 13)) & 7;
        let c = cDarkShadow;
        if (n === 0) c = cBlack;
        else if (n === 1 || n === 2) c = cDarkShadow;
        else if (n === 3 || n === 4) c = cSlateDark;
        else if (n === 5) c = cSlateMid;
        else c = cDarkShadow;
        setPixel(x, y, c, 255);
    }
}

// 2. BOTTOM-LEFT [0..95, 96..191]: Dim Background (Dark warm charcoal)
for (let y = 96; y < 192; y++) {
    for (let x = 0; x < 96; x++) {
        const n = ((x * 13 + y * 29) ^ (x * 5 + y * 11)) & 7;
        let c = cBlack;
        if (n > 4) c = cDarkShadow;
        setPixel(x, y, c, 240);
    }
}

// 3. TOP-RIGHT [96..191, 0..95]: 9-slice Frame (24px borders)
// Clear center [120..167, 24..71] to alpha 0
// We draw a 96x96 frame in coordinates fx: 0..95, fy: 0..95, then offset by x+96
for (let fy = 0; fy < 96; fy++) {
    for (let fx = 0; fx < 96; fx++) {
        const isCenter = (fx >= 24 && fx < 72 && fy >= 24 && fy < 72);
        if (isCenter) {
            setPixel(fx + 96, fy, [0, 0, 0], 0);
            continue;
        }

        // Distance from outer boundary
        const distLeft = fx;
        const distRight = 95 - fx;
        const distTop = fy;
        const distBottom = 95 - fy;
        const distOuter = Math.min(distLeft, distRight, distTop, distBottom);

        // Distance from inner boundary (24px inset)
        // For corners, check diagonal distance or box distance
        let col = cWoodDark;

        // Layer 0: Outermost 1px border (shadow ink)
        if (distOuter === 0) {
            col = cBlack;
        }
        // Layer 1: Outer brass/gold fine wire (1px)
        else if (distOuter === 1) {
            col = (distTop === 1 || distLeft === 1) ? cGoldBright : cGoldMid;
        }
        // Layer 2: Outer gold shade
        else if (distOuter === 2) {
            col = (distTop <= 2 || distLeft <= 2) ? cGoldLit : cGoldDark;
        }
        // Layer 3: Dark groove next to gold wire
        else if (distOuter === 3) {
            col = cBlack;
        }
        // Layer 4..18: Carved Dark Walnut/Oak Moulding with subtle curve
        else if (distOuter >= 4 && distOuter <= 18) {
            const rel = distOuter - 4; // 0..14
            if (rel === 0) {
                // Outer moulding highlight
                col = (distTop <= 4 || distLeft <= 4) ? cWoodBevel : cWoodLit;
            } else if (rel <= 3) {
                col = (distTop <= 7 || distLeft <= 7) ? cWoodLit : cWoodMid;
            } else if (rel <= 8) {
                // Ridge crown
                col = cWoodMid;
            } else if (rel <= 12) {
                // Slope down
                col = cWoodDark;
            } else {
                // Inner groove
                col = cDarkShadow;
            }

            // Fine wood grain variation
            if ((fx + fy * 3) % 7 === 0 && distOuter > 5 && distOuter < 17) {
                col = cWoodLit;
            } else if ((fx * 2 + fy) % 9 === 0 && distOuter > 6 && distOuter < 16) {
                col = cWoodDark;
            }
        }
        // Layer 19: Inner dark groove
        else if (distOuter === 19) {
            col = cBlack;
        }
        // Layer 20: Inner gold inlay bevel
        else if (distOuter === 20) {
            col = (distTop <= 20 || distLeft <= 20) ? cGoldLit : cGoldDark;
        }
        // Layer 21: Inner gold highlight
        else if (distOuter === 21) {
            col = (distTop <= 21 || distLeft <= 21) ? cGoldBright : cGoldMid;
        }
        // Layer 22: Inner drop shadow
        else if (distOuter === 22) {
            col = cDarkShadow;
        }
        // Layer 23: Innermost shadow before window interior
        else {
            col = cBlack;
        }

        // Corner studs: Small antique bronze dome rivets at the 4 corners (around distOuter ~ 8..14)
        const cornerDists = [
            Math.hypot(fx - 11, fy - 11),
            Math.hypot(fx - 84, fy - 11),
            Math.hypot(fx - 11, fy - 84),
            Math.hypot(fx - 84, fy - 84)
        ];
        const minCDist = Math.min(...cornerDists);
        if (minCDist <= 4.2) {
            if (minCDist <= 1.2) {
                col = cGoldBright; // Stud specular gleam
            } else if (minCDist <= 2.5) {
                col = cGoldLit;
            } else if (minCDist <= 3.6) {
                col = cGoldMid;
            } else {
                col = cBlack; // Stud dark rim
            }
        }

        setPixel(fx + 96, fy, col, 255);
    }
}

// 4. BOTTOM-RIGHT [96..191, 96..191]: Cursor, Arrows, Color Chips
// A) Cursor Frame [96..143, 96..143] (48x48 9-slice cursor)
for (let cy = 0; cy < 48; cy++) {
    for (let cx = 0; cx < 48; cx++) {
        const dEdge = Math.min(cx, 47 - cx, cy, 47 - cy);
        let col = null, a = 0;
        if (dEdge === 0) {
            col = cBlack;
            a = 255;
        } else if (dEdge === 1) {
            col = (cx === 1 || cy === 1) ? cGoldBright : cGoldLit;
            a = 255;
        } else if (dEdge === 2) {
            col = cGoldMid;
            a = 255;
        } else if (dEdge === 3) {
            col = cGoldDark;
            a = 200;
        } else if (dEdge === 4) {
            col = cWoodLit;
            a = 120;
        } else {
            // Subtle amber inner field
            col = cWoodMid;
            a = 60;
        }
        setPixel(cx + 96, cy + 96, col, a);
    }
}

// B) Scroll Arrows
// Down arrow at [144..167, 120..143] (24x24)
// Up arrow at [144..167, 96..119] (24x24)
function drawArrow(ax, ay, dir) {
    // Clear 24x24
    for (let y = 0; y < 24; y++) {
        for (let x = 0; x < 24; x++) {
            setPixel(ax + x, ay + y, [0, 0, 0], 0);
        }
    }
    // Centered triangle: base width 14, height 8
    // Center at x=12, y=12
    for (let dy = 0; dy < 8; dy++) {
        const halfW = 7 - dy;
        const y = (dir === 'up') ? (8 + dy) : (15 - dy);
        for (let dx = -halfW; dx <= halfW; dx++) {
            const x = 12 + dx;
            let c = cGoldLit;
            if (Math.abs(dx) === halfW || dy === 0 || dy === 7) {
                c = cBlack; // Outline
            } else if (dy >= 5 || Math.abs(dx) <= 1) {
                c = cGoldBright; // Specular
            } else {
                c = cGoldMid;
            }
            setPixel(ax + x, ay + y, c, 255);
        }
    }
}
drawArrow(144, 96, 'up');
drawArrow(144, 120, 'down');

// Copy side arrows to [168..191]
drawArrow(168, 96, 'up');
drawArrow(168, 120, 'down');

// C) System Color Chips [96..191, 144..191] (96x48, 8 cols x 4 rows of 12x12 chips)
// Standard RMMZ system colors snapped to uf.hex
const sysColors = [
    // Row 0 (0..7): Normal, System, Crisis, Danger, Normal/System tones
    [255, 255, 255], [128, 200, 255], [255, 160, 160], [255, 220, 120],
    [100, 220, 100], [180, 220, 255], [200, 180, 255], [255, 255, 255],
    // Row 1 (8..15): HP/MP/TP and stat colors
    [128, 128, 128], [140, 200, 240], [255, 100, 100], [0, 220, 120],
    [255, 200, 0],   [255, 160, 200], [160, 240, 100], [200, 200, 200],
    // Row 2 (16..23): Gauges and gauges back
    [120, 180, 240], [240, 180, 60],  [240, 80, 80],   [60, 180, 80],
    [160, 80, 240],  [80, 160, 240],  [240, 240, 80],  [220, 220, 220],
    // Row 3 (24..31): Dark accents and special status
    [0, 160, 80],    [240, 60, 60],   [30, 100, 220],  [255, 240, 160],
    [0, 120, 0],     [160, 160, 0],   [220, 100, 0],   [0, 0, 0]
];

for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 8; col++) {
        const colorIdx = row * 8 + col;
        const baseRgb = sysColors[colorIdx];
        const snapped = snap(...baseRgb);
        const x0 = 96 + col * 12;
        const y0 = 144 + row * 12;
        for (let dy = 0; dy < 12; dy++) {
            for (let dx = 0; dx < 12; dx++) {
                setPixel(x0 + dx, y0 + dy, snapped, 255);
            }
        }
    }
}

// Check total unique colors
const uniqueMap = new Map();
for (let i = 0; i < buf.length; i += 4) {
    if (buf[i + 3] === 0) continue;
    const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
    uniqueMap.set(k, true);
}
console.log(`U7 Window skin unique colors: ${uniqueMap.size}`);

// Write files
const destGame = path.join(ROOT, 'game', 'img', 'system', 'Window.png');
const destMaster = path.join(ROOT, 'art', 'masters', 'ui_window_skin.png');
const destReview = path.join(ROOT, 'art', 'review', 'u7_window_skin_review.png');

writePNG(destGame, W, H, buf);
writePNG(destMaster, W, H, buf);

// Also generate a preview review showing how menus look with this windowskin!
const revW = 400, revH = 300;
const revBuf = Buffer.alloc(revW * revH * 4, 0);

// Helper to draw 9-slice window onto preview
function drawWindow(wx, wy, ww, wh) {
    // 1. Draw tiled background
    for (let y = wy + 4; y < wy + wh - 4; y++) {
        for (let x = wx + 4; x < wx + ww - 4; x++) {
            const bx = (x - wx) % 96;
            const by = (y - wy) % 96;
            const sidx = (by * W + bx) * 4;
            const didx = (y * revW + x) * 4;
            revBuf[didx] = buf[sidx];
            revBuf[didx + 1] = buf[sidx + 1];
            revBuf[didx + 2] = buf[sidx + 2];
            revBuf[didx + 3] = 255;
        }
    }

    // 2. Draw 9-slice border (corners 24x24, edges stretch)
    const cw = 24, ch = 24;
    for (let y = 0; y < wh; y++) {
        for (let x = 0; x < ww; x++) {
            let sx = -1, sy = -1;
            // Left column
            if (x < cw) sx = 96 + x;
            else if (x >= ww - cw) sx = 192 - (ww - x);
            else sx = 120 + ((x - cw) % 48);

            // Row
            if (y < ch) sy = y;
            else if (y >= wh - ch) sy = 96 - (wh - y);
            else sy = 24 + ((y - ch) % 48);

            const sidx = (sy * W + sx) * 4;
            const sa = buf[sidx + 3];
            if (sa > 0) {
                const didx = ((wy + y) * revW + (wx + x)) * 4;
                revBuf[didx] = buf[sidx];
                revBuf[didx + 1] = buf[sidx + 1];
                revBuf[didx + 2] = buf[sidx + 2];
                revBuf[didx + 3] = sa;
            }
        }
    }
}

// Background dark tabletop
for (let i = 0; i < revBuf.length; i += 4) {
    revBuf[i] = 16; revBuf[i + 1] = 18; revBuf[i + 2] = 22; revBuf[i + 3] = 255;
}

// Draw dialogue window
drawWindow(20, 20, 360, 90);
// Draw command menu window
drawWindow(20, 130, 140, 150);
// Draw status preview window
drawWindow(170, 130, 210, 150);

writePNG(destReview, revW, revH, revBuf);
console.log(`Saved U7 window skin to: ${destGame}`);
console.log(`Saved review preview to: ${destReview}`);

