const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');
const STAND_PNG = path.join(ROOT, 'art', 'masters', 'oak_stand_96x96.png');

// CIELAB color conversion functions
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

const decoded = decodePNG(fs.readFileSync(STAND_PNG), 'stand.png');
const frameW = 96, frameH = 96;

// Base stand grid
const standGrid = Array.from({ length: frameH }, () => Array(frameW).fill(null));
for (let y = 0; y < frameH; y++) {
    for (let x = 0; x < frameW; x++) {
        const o = (y * frameW + x) * 4;
        if (decoded.data[o + 3] > 128) {
            standGrid[y][x] = [decoded.data[o], decoded.data[o + 1], decoded.data[o + 2]];
        }
    }
}

// Function to generate swayed frame with progressive horizontal displacement:
// Trunk base at y >= 80 does not displace (anchor stays exactly at [48, 95]).
// Canopy (y < 65) displaces smoothly with height.
function createSwayFrame(maxDx, swayPhase) {
    const grid = Array.from({ length: frameH }, () => Array(frameW).fill(null));
    for (let y = 0; y < frameH; y++) {
        // Height factor: 0 at row 85 (trunk base), 1 at row 10 (treetop)
        const heightFactor = Math.max(0, Math.min(1, (85 - y) / 75));
        // Base displacement
        const dx = Math.round(maxDx * Math.pow(heightFactor, 1.2));
        
        for (let x = 0; x < frameW; x++) {
            const c = standGrid[y][x];
            if (!c) continue;
            
            // Subtle wave distortion in canopy leaves
            let leafJitter = 0;
            if (y < 60) {
                leafJitter = Math.round(Math.sin((y + swayPhase) * 0.25 + x * 0.1) * 0.6);
            }
            
            const targetX = x + dx + leafJitter;
            if (targetX >= 0 && targetX < frameW) {
                grid[y][targetX] = c;
            }
        }
    }
    
    // Fill any single-pixel gaps caused by expansion
    for (let y = 0; y < frameH; y++) {
        for (let x = 1; x < frameW - 1; x++) {
            if (!grid[y][x] && grid[y][x - 1] && grid[y][x + 1]) {
                grid[y][x] = grid[y][x - 1];
            }
        }
    }
    return grid;
}

// 4 frames:
// Frame 0: Stand (neutral)
// Frame 1: Sway right (+1.8 px)
// Frame 2: Sway crest (+2.6 px)
// Frame 3: Sway back left (-1.5 px)
const frames = [
    standGrid,
    createSwayFrame(2, 2),
    createSwayFrame(3, 5),
    createSwayFrame(-2, 7)
];

// Combine into 384x96 sheet (4 columns of 96x96)
const sheetW = frameW * 4; // 384
const sheetH = frameH;     // 96
const sheetBuf = Buffer.alloc(sheetW * sheetH * 4);

for (let f = 0; f < 4; f++) {
    const fGrid = frames[f];
    const startX = f * frameW;
    for (let y = 0; y < frameH; y++) {
        for (let x = 0; x < frameW; x++) {
            const c = fGrid[y][x];
            const o = (y * sheetW + (startX + x)) * 4;
            if (c) {
                sheetBuf[o] = c[0];
                sheetBuf[o + 1] = c[1];
                sheetBuf[o + 2] = c[2];
                sheetBuf[o + 3] = 255;
            } else {
                sheetBuf[o] = 0;
                sheetBuf[o + 1] = 0;
                sheetBuf[o + 2] = 0;
                sheetBuf[o + 3] = 0;
            }
        }
    }
}

// Save master sheet
const masterSheetPath = path.join(ROOT, 'art', 'masters', 'oak.png');
writePNG(masterSheetPath, sheetW, sheetH, sheetBuf);
console.log(`Saved master animated oak sheet: ${masterSheetPath} (${sheetW}x${sheetH})`);

// Save sidecar
const sidecar = {
    id: "oak",
    name: "Mature Broadleaf Oak",
    category: "Flora",
    frameWidth: 96,
    frameHeight: 96,
    anchor: [48, 95],
    footprint: [2, 2],
    facings: ["S"],
    animations: {
        stand: [0],
        sway: [0, 1, 2, 3]
    }
};
const sidecarPath = path.join(ROOT, 'art', 'masters', 'oak.json');
fs.writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2));
console.log(`Saved master oak sidecar: ${sidecarPath}`);

// Also save review render of the 4 frames at 2x on meadow grass
const meadowPath = path.join(ROOT, 'art', 'masters', 'meadow.png');
let meadowDec = null;
if (fs.existsSync(meadowPath)) {
    meadowDec = decodePNG(fs.readFileSync(meadowPath), 'meadow.png');
}

const revW = sheetW * 2;
const revH = sheetH * 2;
const revBuf = Buffer.alloc(revW * revH * 4);

for (let y = 0; y < revH; y++) {
    for (let x = 0; x < revW; x++) {
        const srcX = Math.floor(x / 2);
        const srcY = Math.floor(y / 2);
        const o = (y * revW + x) * 4;
        const srcO = (srcY * sheetW + srcX) * 4;
        
        if (sheetBuf[srcO + 3] > 128) {
            revBuf[o] = sheetBuf[srcO];
            revBuf[o + 1] = sheetBuf[srcO + 1];
            revBuf[o + 2] = sheetBuf[srcO + 2];
            revBuf[o + 3] = 255;
        } else if (meadowDec) {
            const mx = srcX % 48;
            const my = srcY % 48;
            const mo = (my * meadowDec.width + mx) * 4;
            revBuf[o] = meadowDec.data[mo];
            revBuf[o + 1] = meadowDec.data[mo + 1];
            revBuf[o + 2] = meadowDec.data[mo + 2];
            revBuf[o + 3] = 255;
        } else {
            revBuf[o] = 77;
            revBuf[o + 1] = 93;
            revBuf[o + 2] = 40;
            revBuf[o + 3] = 255;
        }
    }
}

const revPath = path.join(ROOT, 'art', 'review', 'oak_sway_sheet_2x_on_meadow.png');
writePNG(revPath, revW, revH, revBuf);
console.log(`Saved review sway sheet: ${revPath}`);
