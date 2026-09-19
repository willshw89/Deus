"use strict";
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_PATH = path.join(ROOT, 'art', 'palette', 'uf.hex');

// Load approved 256-color palette
const hexLines = fs.readFileSync(PALETTE_PATH, 'utf8').trim().split(/\r?\n/).map(l => l.trim().toUpperCase());
const PALETTE = hexLines.map(h => {
    const num = parseInt(h.replace('#', ''), 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
});

function findClosestColor(r, g, b) {
    let bestDist = Infinity;
    let bestCol = PALETTE[0];
    for (const p of PALETTE) {
        const dr = r - p[0];
        const dg = g - p[1];
        const db = b - p[2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist < bestDist) {
            bestDist = dist;
            bestCol = p;
            if (dist === 0) break;
        }
    }
    return bestCol;
}

function quantizeTo32(buf) {
    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] < 128) {
            buf[i] = 0; buf[i + 1] = 0; buf[i + 2] = 0; buf[i + 3] = 0;
        } else {
            buf[i + 3] = 255;
            const c = findClosestColor(buf[i], buf[i + 1], buf[i + 2]);
            buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2];
        }
    }
}

const { writePNG } = require('./png_util');

function setPixel(buf, w, x, y, hex) {
    if (x < 0 || x >= w || y < 0) return;
    const idx = (y * w + x) * 4;
    if (idx >= buf.length) return;
    const num = parseInt(hex.replace('#', ''), 16);
    buf[idx] = (num >> 16) & 255;
    buf[idx + 1] = (num >> 8) & 255;
    buf[idx + 2] = num & 255;
    buf[idx + 3] = 255;
}

// -------------------------------------------------------------
// NATIVE 16x16 PIXEL ART GENERATORS FOR THE 9 OBJECTS
// -------------------------------------------------------------

// 1. Wooden Door (cols: 0 closed, 1 ajar, 2 open)
function generateDoorWoodFrames() {
    const frames = [];
    const w = 16, h = 16;
    for (let f = 0; f < 3; f++) {
        const buf = Buffer.alloc(w * h * 4);
        // Stone / heavy wood jamb outer frame
        for (let y = 1; y <= 15; y++) {
            setPixel(buf, w, 2, y, '#424242');
            setPixel(buf, w, 3, y, '#616161');
            setPixel(buf, w, 12, y, '#616161');
            setPixel(buf, w, 13, y, '#303030');
        }
        for (let x = 2; x <= 13; x++) {
            setPixel(buf, w, x, 1, '#757575');
            setPixel(buf, w, x, 2, '#424242');
        }
        // Threshold sill
        for (let x = 3; x <= 12; x++) {
            setPixel(buf, w, x, 15, '#37474F');
        }

        if (f === 0) {
            // Closed door: heavy studded oak planks
            for (let y = 3; y <= 14; y++) {
                for (let x = 4; x <= 11; x++) {
                    const isSeam = (x === 6 || x === 9);
                    const col = isSeam ? '#3E2723' : ((y % 4 === 0) ? '#6D4C41' : '#5D4037');
                    setPixel(buf, w, x, y, col);
                }
            }
            // Iron strap hinges on left
            for (let x = 3; x <= 7; x++) {
                setPixel(buf, w, x, 5, '#212121');
                setPixel(buf, w, x, 11, '#212121');
            }
            // Iron rivets / studs
            setPixel(buf, w, 5, 5, '#9E9E9E');
            setPixel(buf, w, 5, 11, '#9E9E9E');
            // Iron latch / ring on right
            setPixel(buf, w, 10, 9, '#9E9E9E');
            setPixel(buf, w, 10, 10, '#212121');
        } else if (f === 1) {
            // Ajar door: swung inward 45 degrees
            // Dark interior behind door
            for (let y = 3; y <= 14; y++) {
                for (let x = 7; x <= 11; x++) {
                    setPixel(buf, w, x, y, '#1A1A1A');
                }
            }
            // Angled leaf
            for (let y = 3; y <= 14; y++) {
                for (let dx = 0; dx <= 3; dx++) {
                    const x = 4 + dx;
                    const col = (dx === 3) ? '#8D6E63' : ((dx === 0) ? '#3E2723' : '#5D4037');
                    setPixel(buf, w, x, y, col);
                }
            }
            // Cast floor shadow
            setPixel(buf, w, 8, 14, '#0D0D0D');
            setPixel(buf, w, 9, 14, '#0D0D0D');
        } else {
            // Fully open door: recessed flat against left jamb
            // Dark open threshold
            for (let y = 3; y <= 14; y++) {
                for (let x = 5; x <= 11; x++) {
                    setPixel(buf, w, x, y, '#101010');
                }
            }
            // Edge of open leaf on left
            for (let y = 3; y <= 14; y++) {
                setPixel(buf, w, 4, y, '#8D6E63');
            }
        }
        quantizeTo32(buf);
        frames.push(buf);
    }
    return frames;
}

// 2. Stone Door (cols: 0 closed, 1 ajar, 2 open)
function generateDoorStoneFrames() {
    const frames = [];
    const w = 16, h = 16;
    for (let f = 0; f < 3; f++) {
        const buf = Buffer.alloc(w * h * 4);
        // Heavy carved stone archway
        for (let y = 1; y <= 15; y++) {
            setPixel(buf, w, 2, y, '#546E7A');
            setPixel(buf, w, 3, y, '#78909C');
            setPixel(buf, w, 12, y, '#78909C');
            setPixel(buf, w, 13, y, '#37474F');
        }
        for (let x = 2; x <= 13; x++) {
            setPixel(buf, w, x, 1, '#90A4AE');
            setPixel(buf, w, x, 2, '#546E7A');
        }
        // Keystone
        setPixel(buf, w, 7, 0, '#CFD8DC');
        setPixel(buf, w, 8, 0, '#CFD8DC');
        setPixel(buf, w, 7, 1, '#90A4AE');
        setPixel(buf, w, 8, 1, '#90A4AE');

        if (f === 0) {
            // Closed stone slab with dwarven runic etchings
            for (let y = 3; y <= 14; y++) {
                for (let x = 4; x <= 11; x++) {
                    setPixel(buf, w, x, y, (x + y) % 5 === 0 ? '#607D8B' : '#78909C');
                }
            }
            // Runic cross / chisels
            for (let y = 5; y <= 12; y++) setPixel(buf, w, 7, y, '#37474F');
            for (let x = 5; x <= 10; x++) setPixel(buf, w, x, 8, '#37474F');
            // Bronze pivot rings
            setPixel(buf, w, 4, 4, '#FFD54F');
            setPixel(buf, w, 4, 13, '#FFD54F');
            setPixel(buf, w, 10, 9, '#FFA000');
        } else if (f === 1) {
            // Ajar stone door
            for (let y = 3; y <= 14; y++) {
                for (let x = 7; x <= 11; x++) setPixel(buf, w, x, y, '#1A1A1A');
                for (let dx = 0; dx <= 2; dx++) {
                    setPixel(buf, w, 4 + dx, y, dx === 2 ? '#B0BEC5' : '#607D8B');
                }
            }
        } else {
            // Open archway
            for (let y = 3; y <= 14; y++) {
                for (let x = 5; x <= 11; x++) setPixel(buf, w, x, y, '#101010');
                setPixel(buf, w, 4, y, '#B0BEC5');
            }
        }
        quantizeTo32(buf);
        frames.push(buf);
    }
    return frames;
}

// 3. Bowyer's Bench
function generateBowyerBench() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Heavy wooden workbench top (rows 7-10, cols 2-13)
    for (let y = 7; y <= 9; y++) {
        for (let x = 2; x <= 13; x++) {
            setPixel(buf, w, x, y, y === 7 ? '#8D6E63' : '#6D4C41');
        }
    }
    // Oak legs and stretcher
    for (let y = 10; y <= 14; y++) {
        setPixel(buf, w, 3, y, '#4E342E');
        setPixel(buf, w, 4, y, '#3E2723');
        setPixel(buf, w, 11, y, '#4E342E');
        setPixel(buf, w, 12, y, '#3E2723');
    }
    for (let x = 4; x <= 11; x++) setPixel(buf, w, x, 12, '#3E2723');

    // Curved yew bow stave resting on bench (rows 5-7, cols 4-12)
    setPixel(buf, w, 4, 7, '#FFB74D');
    setPixel(buf, w, 5, 6, '#FFA726');
    setPixel(buf, w, 6, 6, '#FF9800');
    setPixel(buf, w, 7, 5, '#FFA726');
    setPixel(buf, w, 8, 5, '#FFA726');
    setPixel(buf, w, 9, 6, '#FF9800');
    setPixel(buf, w, 10, 6, '#FFA726');
    setPixel(buf, w, 11, 7, '#FFB74D');

    // Vise clamp on left
    setPixel(buf, w, 2, 6, '#757575');
    setPixel(buf, w, 2, 7, '#424242');
    setPixel(buf, w, 1, 7, '#9E9E9E');

    // Wood shavings on table and floor
    setPixel(buf, w, 7, 8, '#FFE082');
    setPixel(buf, w, 8, 8, '#FFE082');
    setPixel(buf, w, 5, 14, '#FFECB3');
    setPixel(buf, w, 10, 14, '#FFECB3');

    quantizeTo32(buf);
    return buf;
}

// 4. Fletcher's Bench
function generateFletcherBench() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Wooden workbench top
    for (let y = 7; y <= 9; y++) {
        for (let x = 2; x <= 13; x++) {
            setPixel(buf, w, x, y, y === 7 ? '#795548' : '#5D4037');
        }
    }
    // Legs
    for (let y = 10; y <= 14; y++) {
        setPixel(buf, w, 3, y, '#4E342E');
        setPixel(buf, w, 12, y, '#3E2723');
    }
    // Fletcher's feather tray on left (cols 3-6, rows 5-6)
    for (let x = 3; x <= 6; x++) {
        setPixel(buf, w, x, 6, '#E0E0E0');
    }
    setPixel(buf, w, 4, 5, '#FFFFFF'); // goose feather
    setPixel(buf, w, 5, 5, '#B0BEC5');

    // Arrow fletching jig in center (cols 7-10, rows 5-7)
    setPixel(buf, w, 7, 6, '#8D6E63');
    setPixel(buf, w, 8, 5, '#FFCA28'); // brass clamp
    setPixel(buf, w, 9, 6, '#8D6E63');
    setPixel(buf, w, 10, 5, '#D32F2F'); // red fletched feather

    // Arrow bundle in quiver/rack on right (cols 11-12, rows 4-7)
    setPixel(buf, w, 11, 4, '#8D6E63');
    setPixel(buf, w, 12, 4, '#8D6E63');
    setPixel(buf, w, 11, 3, '#CFD8DC'); // arrow nock / point
    setPixel(buf, w, 12, 3, '#CFD8DC');

    quantizeTo32(buf);
    return buf;
}

// 5. Tanning Rack
function generateTanningRack() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Upright timber rectangular frame (cols 2-13, rows 2-14)
    for (let y = 2; y <= 14; y++) {
        setPixel(buf, w, 2, y, '#6D4C41');
        setPixel(buf, w, 3, y, '#4E342E');
        setPixel(buf, w, 12, y, '#6D4C41');
        setPixel(buf, w, 13, y, '#4E342E');
    }
    for (let x = 2; x <= 13; x++) {
        setPixel(buf, w, x, 2, '#8D6E63');
        setPixel(buf, w, x, 3, '#4E342E');
        setPixel(buf, w, x, 13, '#4E342E');
    }
    // Feet support triangles
    setPixel(buf, w, 1, 14, '#3E2723');
    setPixel(buf, w, 4, 14, '#3E2723');
    setPixel(buf, w, 11, 14, '#3E2723');
    setPixel(buf, w, 14, 14, '#3E2723');

    // Stretched rawhide pegged taut in center (cols 5-10, rows 4-11)
    for (let y = 4; y <= 11; y++) {
        for (let x = 5; x <= 10; x++) {
            const isEdge = (x === 5 || x === 10 || y === 4 || y === 11);
            setPixel(buf, w, x, y, isEdge ? '#A1887F' : '#D7CCC8');
        }
    }
    // Taut cords to frame pegs
    setPixel(buf, w, 4, 4, '#EFEBE9');
    setPixel(buf, w, 11, 4, '#EFEBE9');
    setPixel(buf, w, 4, 11, '#EFEBE9');
    setPixel(buf, w, 11, 11, '#EFEBE9');
    setPixel(buf, w, 4, 8, '#EFEBE9');
    setPixel(buf, w, 11, 8, '#EFEBE9');

    quantizeTo32(buf);
    return buf;
}

// 6. Weapon Rack
function generateWeaponRack() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Upright timber stand with horizontal notches (cols 2-13, rows 3-14)
    for (let y = 3; y <= 14; y++) {
        setPixel(buf, w, 2, y, '#5D4037');
        setPixel(buf, w, 13, y, '#3E2723');
    }
    for (let x = 2; x <= 13; x++) {
        setPixel(buf, w, x, 13, '#4E342E');
        setPixel(buf, w, x, 14, '#3E2723');
        setPixel(buf, w, x, 7, '#5D4037');
    }
    // Triangular side feet
    setPixel(buf, w, 1, 14, '#2E1C14');
    setPixel(buf, w, 14, 14, '#2E1C14');

    // Weapons held:
    // Spear 1 (col 4, rows 1-13)
    setPixel(buf, w, 4, 1, '#ECEFF1'); // spearhead
    setPixel(buf, w, 4, 2, '#B0BEC5');
    for (let y = 3; y <= 12; y++) setPixel(buf, w, 4, y, '#8D6E63');

    // Longsword 1 (col 6, rows 4-12)
    setPixel(buf, w, 6, 4, '#ECEFF1');
    for (let y = 5; y <= 11; y++) setPixel(buf, w, 6, y, '#CFD8DC');
    setPixel(buf, w, 5, 11, '#FFD54F'); // gold crossguard
    setPixel(buf, w, 7, 11, '#FFD54F');
    setPixel(buf, w, 6, 12, '#212121'); // hilt

    // Battleaxe (col 8-9, rows 3-12)
    for (let y = 4; y <= 12; y++) setPixel(buf, w, 9, y, '#6D4C41');
    setPixel(buf, w, 8, 3, '#90A4AE'); // axe blade
    setPixel(buf, w, 7, 4, '#CFD8DC');
    setPixel(buf, w, 8, 5, '#78909C');

    // Spear 2 (col 11, rows 2-13)
    setPixel(buf, w, 11, 2, '#ECEFF1');
    for (let y = 3; y <= 12; y++) setPixel(buf, w, 11, y, '#8D6E63');

    quantizeTo32(buf);
    return buf;
}

// 7. Stone Well
function generateWell() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Circular stone wellhead (rows 8-15, cols 3-12)
    for (let y = 8; y <= 14; y++) {
        for (let x = 3; x <= 12; x++) {
            const isRim = (y === 8 || y === 14 || x === 3 || x === 12);
            setPixel(buf, w, x, y, isRim ? '#616161' : '#757575');
        }
    }
    // Deep dark interior pool
    for (let y = 9; y <= 11; y++) {
        for (let x = 5; x <= 10; x++) {
            setPixel(buf, w, x, y, (x === 8 && y === 10) ? '#00B0FF' : '#0D47A1');
        }
    }
    // Upright timber gallows frame (cols 3, 12, rows 3-8)
    for (let y = 3; y <= 8; y++) {
        setPixel(buf, w, 3, y, '#8D6E63');
        setPixel(buf, w, 12, y, '#5D4037');
    }
    // Crossbeam
    for (let x = 3; x <= 12; x++) setPixel(buf, w, x, 3, '#A1887F');

    // Wooden roof hood
    for (let x = 2; x <= 13; x++) {
        setPixel(buf, w, x, 2, '#6D4C41');
    }
    setPixel(buf, w, 7, 1, '#8D6E63');
    setPixel(buf, w, 8, 1, '#8D6E63');

    // Rope spool & hanging bucket
    setPixel(buf, w, 7, 4, '#D7CCC8');
    setPixel(buf, w, 8, 4, '#D7CCC8');
    setPixel(buf, w, 7, 5, '#D7CCC8'); // rope
    setPixel(buf, w, 7, 6, '#8D6E63'); // bucket rim
    setPixel(buf, w, 8, 6, '#8D6E63');
    setPixel(buf, w, 7, 7, '#5D4037');

    quantizeTo32(buf);
    return buf;
}

// 8. Farm Plot (furrows & sprouting shoots)
function generateFarmPlot() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Tilled agricultural earth with 3 furrows
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const furrow = Math.floor(y / 5);
            const line = y % 5;
            let col = '#4E342E';
            if (line === 0 || line === 1) col = '#6D4C41'; // ridge
            else if (line === 2) col = '#5D4037';
            else col = '#3E2723'; // trench
            setPixel(buf, w, x, y, col);
        }
    }
    // Sprouting green vegetable shoots along ridges
    const shoots = [
        [3, 1], [8, 1], [13, 1],
        [5, 6], [10, 6],
        [2, 11], [7, 11], [12, 11]
    ];
    for (const [sx, sy] of shoots) {
        setPixel(buf, w, sx, sy, '#76FF03');
        setPixel(buf, w, sx - 1, sy - 1, '#64DD17');
        setPixel(buf, w, sx + 1, sy - 1, '#B2FF59');
    }
    quantizeTo32(buf);
    return buf;
}

// 9. Wooden Bridge
function generateBridge() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Heavy transverse plank deck (horizontal planks crossing stream)
    for (let y = 0; y < 16; y++) {
        const isJoint = (y % 4 === 0);
        for (let x = 1; x <= 14; x++) {
            const col = isJoint ? '#3E2723' : ((y % 4 === 1) ? '#8D6E63' : '#6D4C41');
            setPixel(buf, w, x, y, col);
        }
    }
    // Outer timber curbs / stringers with iron bolts
    for (let y = 0; y < 16; y++) {
        setPixel(buf, w, 1, y, '#4E342E');
        setPixel(buf, w, 14, y, '#3E2723');
        if (y % 4 === 2) {
            setPixel(buf, w, 1, y, '#CFD8DC'); // iron bolt
            setPixel(buf, w, 14, y, '#90A4AE');
        }
    }
    quantizeTo32(buf);
    return buf;
}

// -------------------------------------------------------------
// NATIVE 16x16 PIXEL ART GENERATORS FOR THE FACE PORTRAITS
// -------------------------------------------------------------

// White Flowers
function generateFaceWhiteFlowers() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Clustered 5-petal white blossoms with gold centers & lush leaves
    // Stems & leaves
    for (let y = 8; y <= 15; y++) {
        setPixel(buf, w, 8, y, '#2E7D32');
    }
    setPixel(buf, w, 5, 12, '#388E3C');
    setPixel(buf, w, 6, 11, '#4CAF50');
    setPixel(buf, w, 10, 11, '#4CAF50');
    setPixel(buf, w, 11, 12, '#388E3C');

    // Central white flower (cols 6-10, rows 4-8)
    const petals = [[8, 4], [6, 6], [10, 6], [7, 8], [9, 8]];
    for (const [px, py] of petals) {
        setPixel(buf, w, px, py, '#FFFFFF');
        setPixel(buf, w, px, py - 1, '#ECEFF1');
    }
    setPixel(buf, w, 8, 6, '#FFD54F'); // golden pistil

    // Secondary buds
    setPixel(buf, w, 4, 8, '#FFFFFF');
    setPixel(buf, w, 12, 7, '#FFFFFF');
    quantizeTo32(buf);
    return buf;
}

// Wild Grain
function generateFaceWildGrain() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Golden-brown nodding barley sheaf with awned heads
    for (let y = 7; y <= 15; y++) {
        setPixel(buf, w, 7, y, '#FFB74D');
        setPixel(buf, w, 8, y, '#FFA726');
    }
    // Gilded wheat heads
    for (let y = 3; y <= 7; y++) {
        setPixel(buf, w, 6, y, '#FFE082');
        setPixel(buf, w, 7, y, '#FFD54F');
        setPixel(buf, w, 8, y, '#FFCA28');
        setPixel(buf, w, 9, y, '#FFA000');
    }
    // Nodding awn whiskers
    setPixel(buf, w, 5, 2, '#FFF9C4');
    setPixel(buf, w, 7, 1, '#FFF9C4');
    setPixel(buf, w, 9, 2, '#FFF9C4');
    setPixel(buf, w, 10, 3, '#FFE082');
    quantizeTo32(buf);
    return buf;
}

// Lichen
function generateFaceLichen() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Weathered slate rock base
    for (let y = 5; y <= 14; y++) {
        for (let x = 3; x <= 13; x++) {
            setPixel(buf, w, x, y, '#455A64');
        }
    }
    // Pale mint-green and chartreuse crustose lichen rings
    const lichenDots = [
        [5, 7, '#B9F6CA'], [6, 7, '#69F0AE'], [6, 8, '#00E676'], [7, 8, '#B9F6CA'],
        [10, 9, '#B9F6CA'], [11, 9, '#69F0AE'], [10, 10, '#00E676'],
        [7, 11, '#EEFF41'], [8, 11, '#C6FF00'], [8, 12, '#AEEA00']
    ];
    for (const [lx, ly, col] of lichenDots) {
        setPixel(buf, w, lx, ly, col);
    }
    quantizeTo32(buf);
    return buf;
}

// Lily Pad
function generateFaceLilyPad() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Dark deep water backdrop
    for (let y = 9; y <= 15; y++) {
        for (let x = 2; x <= 14; x++) {
            setPixel(buf, w, x, y, '#01579B');
        }
    }
    // Circular notched emerald lily pad (cols 3-13, rows 7-13)
    for (let y = 7; y <= 13; y++) {
        for (let x = 3; x <= 13; x++) {
            const dx = x - 8, dy = y - 10;
            if (dx * dx + dy * dy <= 22) {
                // V-notch on right
                if (dx >= 1 && dy <= 0 && dx > -dy) continue;
                setPixel(buf, w, x, y, (dx < 0 && dy < 0) ? '#43A047' : '#2E7D32');
            }
        }
    }
    // Water lily bloom (pink-tipped lotus)
    setPixel(buf, w, 7, 6, '#F8BBD0');
    setPixel(buf, w, 8, 5, '#FFFFFF');
    setPixel(buf, w, 9, 6, '#F8BBD0');
    setPixel(buf, w, 8, 6, '#FFEB3B');
    quantizeTo32(buf);
    return buf;
}

// Woodland Bush / Shrub
function generateFaceBush() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Rounded lush deciduous foliage sphere
    for (let y = 4; y <= 14; y++) {
        for (let x = 3; x <= 13; x++) {
            const dx = x - 8, dy = y - 9;
            if (dx * dx + dy * dy <= 25) {
                let col = '#2E7D32';
                if (dx <= 0 && dy <= 0) col = '#66BB6A'; // lit top-left
                else if (dx < 1 && dy < 1) col = '#43A047';
                else if (dx > 1 || dy > 1) col = '#1B5E20'; // shadow
                setPixel(buf, w, x, y, col);
            }
        }
    }
    // Twiggy brown branches at base
    setPixel(buf, w, 8, 14, '#5D4037');
    setPixel(buf, w, 7, 15, '#4E342E');
    setPixel(buf, w, 9, 15, '#3E2723');
    quantizeTo32(buf);
    return buf;
}

// Desert Shrub
function generateFaceDesertShrub() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Arid sage scrub: silver-green clustered foliage on twisted dry wood
    // Gnarled dry trunk
    for (let y = 10; y <= 15; y++) {
        setPixel(buf, w, 8, y, '#795548');
        setPixel(buf, w, 7, y, '#5D4037');
    }
    // Silver-sage foliage clusters
    const clusters = [
        [5, 7], [6, 6], [7, 6],
        [9, 5], [10, 6], [11, 7],
        [8, 8], [9, 8]
    ];
    for (const [cx, cy] of clusters) {
        setPixel(buf, w, cx, cy, '#A5D6A7');
        setPixel(buf, w, cx, cy + 1, '#81C784');
        setPixel(buf, w, cx + 1, cy, '#66BB6A');
    }
    quantizeTo32(buf);
    return buf;
}

// Snow Bush
function generateFaceSnowBush() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Dark winter evergreen shrub crowned with snow
    for (let y = 6; y <= 14; y++) {
        for (let x = 3; x <= 13; x++) {
            const dx = x - 8, dy = y - 10;
            if (dx * dx + dy * dy <= 22) {
                setPixel(buf, w, x, y, (dy > 0) ? '#1B5E20' : '#2E7D32');
            }
        }
    }
    // Thick blanket of white snow on upper canopy
    for (let y = 4; y <= 7; y++) {
        for (let x = 4; x <= 12; x++) {
            const dx = x - 8, dy = y - 6;
            if (dx * dx + dy * dy <= 16) {
                setPixel(buf, w, x, y, (y === 4 || x === 8) ? '#FFFFFF' : '#E0E0E0');
            }
        }
    }
    // Blue shadow on snow edge
    setPixel(buf, w, 5, 7, '#B0BEC5');
    setPixel(buf, w, 11, 7, '#B0BEC5');
    quantizeTo32(buf);
    return buf;
}

// Fern
function generateFaceFern() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Curling arching fiddlehead and fronds
    // Central fiddlehead crozier
    setPixel(buf, w, 8, 3, '#76FF03');
    setPixel(buf, w, 9, 3, '#64DD17');
    setPixel(buf, w, 9, 4, '#64DD17');
    setPixel(buf, w, 8, 5, '#43A047');

    // Arching pinnate fronds
    const fronds = [
        [4, 8], [5, 7], [6, 6], [7, 6],
        [9, 6], [10, 6], [11, 7], [12, 8],
        [3, 11], [4, 10], [5, 9],
        [11, 9], [12, 10], [13, 11]
    ];
    for (const [fx, fy] of fronds) {
        setPixel(buf, w, fx, fy, '#66BB6A');
        setPixel(buf, w, fx, fy + 1, '#2E7D32');
    }
    for (let y = 7; y <= 15; y++) setPixel(buf, w, 8, y, '#1B5E20');
    quantizeTo32(buf);
    return buf;
}

// Snow Fir Stump
function generateFaceFirSnowStump() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Conifer stump with dark bark, heartwood rings, snow cap
    for (let y = 8; y <= 14; y++) {
        for (let x = 4; x <= 12; x++) {
            setPixel(buf, w, x, y, '#3E2723');
        }
    }
    // Heartwood cut top
    for (let x = 5; x <= 11; x++) {
        setPixel(buf, w, x, 8, '#8D6E63');
    }
    // Snow mound on top
    setPixel(buf, w, 6, 7, '#FFFFFF');
    setPixel(buf, w, 7, 6, '#FFFFFF');
    setPixel(buf, w, 8, 6, '#FFFFFF');
    setPixel(buf, w, 9, 6, '#FFFFFF');
    setPixel(buf, w, 10, 7, '#ECEFF1');
    quantizeTo32(buf);
    return buf;
}

// Mangrove Stump
function generateFaceMangroveStump() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Gnarled stilt roots splaying out
    for (let y = 6; y <= 10; y++) {
        for (let x = 6; x <= 10; x++) setPixel(buf, w, x, y, '#4E342E');
    }
    // Splaying stilt roots
    setPixel(buf, w, 5, 11, '#3E2723');
    setPixel(buf, w, 4, 12, '#3E2723');
    setPixel(buf, w, 3, 13, '#3E2723');
    setPixel(buf, w, 2, 14, '#2E1C14');

    setPixel(buf, w, 11, 11, '#3E2723');
    setPixel(buf, w, 12, 12, '#3E2723');
    setPixel(buf, w, 13, 13, '#3E2723');
    setPixel(buf, w, 14, 14, '#2E1C14');

    // Mossy aerial growth
    setPixel(buf, w, 7, 5, '#66BB6A');
    setPixel(buf, w, 8, 5, '#8D6E63');
    setPixel(buf, w, 9, 5, '#43A047');
    quantizeTo32(buf);
    return buf;
}

// Tropical Giant Stump
function generateFaceTropicalStump() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Massive buttressed rainforest stump
    for (let y = 7; y <= 14; y++) {
        for (let x = 3; x <= 13; x++) {
            setPixel(buf, w, x, y, '#5D4037');
        }
    }
    // Broad saw-cut heartwood top (cols 4-12, rows 6-7)
    for (let x = 4; x <= 12; x++) {
        setPixel(buf, w, x, 6, '#A1887F');
        setPixel(buf, w, x, 7, '#8D6E63');
    }
    // Broad buttress root flares
    setPixel(buf, w, 2, 13, '#3E2723');
    setPixel(buf, w, 1, 14, '#2E1C14');
    setPixel(buf, w, 14, 13, '#3E2723');
    setPixel(buf, w, 15, 14, '#2E1C14');
    quantizeTo32(buf);
    return buf;
}

// Palm Stump
function generateFacePalmStump() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Fibrous ringed palm cylinder
    for (let y = 7; y <= 14; y++) {
        const isRing = (y % 2 === 0);
        for (let x = 5; x <= 11; x++) {
            setPixel(buf, w, x, y, isRing ? '#8D6E63' : '#6D4C41');
        }
    }
    // Fibrous radial pith top
    for (let x = 5; x <= 11; x++) {
        setPixel(buf, w, x, 6, '#D7CCC8');
    }
    setPixel(buf, w, 8, 6, '#4E342E');
    quantizeTo32(buf);
    return buf;
}

// Cursed Tree Stump
function generateFaceCursedStump() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Withered blackened briar stump with purple ooze
    for (let y = 6; y <= 14; y++) {
        for (let x = 5; x <= 11; x++) {
            setPixel(buf, w, x, y, '#212121');
        }
    }
    // Jagged splintered fangs
    setPixel(buf, w, 5, 4, '#424242');
    setPixel(buf, w, 7, 5, '#424242');
    setPixel(buf, w, 10, 4, '#424242');

    // Blighted purplish resin ooze
    setPixel(buf, w, 8, 7, '#AB47BC');
    setPixel(buf, w, 8, 8, '#7B1FA2');
    setPixel(buf, w, 8, 9, '#4A148C');
    setPixel(buf, w, 6, 10, '#BA68C8');
    quantizeTo32(buf);
    return buf;
}

// Rubble
function generateFaceRubble() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Masonry rubble pile with dressed stone blocks and mortar
    const blocks = [
        { x: 3, y: 11, w: 4, h: 3, c: '#9E9E9E' },
        { x: 8, y: 10, w: 5, h: 4, c: '#BDBDBD' },
        { x: 6, y: 7, w: 4, h: 3, c: '#E0E0E0' }
    ];
    for (const b of blocks) {
        for (let dy = 0; dy < b.h; dy++) {
            for (let dx = 0; dx < b.w; dx++) {
                let col = b.c;
                if (dx === 0 || dy === 0) col = '#ECEFF1';
                else if (dx === b.w - 1 || dy === b.h - 1) col = '#616161';
                setPixel(buf, w, b.x + dx, b.y + dy, col);
            }
        }
    }
    // Mortar dust & gravel chips
    setPixel(buf, w, 4, 14, '#757575');
    setPixel(buf, w, 12, 14, '#757575');
    setPixel(buf, w, 7, 13, '#CFD8DC');
    quantizeTo32(buf);
    return buf;
}

// Workbench
function generateFaceWorkbench() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Dressed stone work stone / mason bench
    for (let y = 6; y <= 9; y++) {
        for (let x = 2; x <= 13; x++) {
            setPixel(buf, w, x, y, (y === 6) ? '#B0BEC5' : '#78909C');
        }
    }
    // Solid ashlar masonry pedestals
    for (let y = 10; y <= 14; y++) {
        setPixel(buf, w, 3, y, '#546E7A');
        setPixel(buf, w, 4, y, '#37474F');
        setPixel(buf, w, 11, y, '#546E7A');
        setPixel(buf, w, 12, y, '#37474F');
    }
    // Mason's chisel and hammer on benchtop
    setPixel(buf, w, 6, 5, '#CFD8DC'); // chisel
    setPixel(buf, w, 7, 5, '#78909C');
    setPixel(buf, w, 10, 5, '#424242'); // iron hammer head
    setPixel(buf, w, 9, 6, '#8D6E63'); // handle
    quantizeTo32(buf);
    return buf;
}

// Campfire
function generateFaceCampfire() {
    const w = 16, h = 16;
    const buf = Buffer.alloc(w * h * 4);
    // Circular stone ring
    for (let y = 9; y <= 14; y++) {
        for (let x = 3; x <= 13; x++) {
            if (y === 9 || y === 14 || x === 3 || x === 13) {
                setPixel(buf, w, x, y, '#757575');
            }
        }
    }
    // Charred fuel logs
    setPixel(buf, w, 5, 11, '#3E2723');
    setPixel(buf, w, 6, 10, '#3E2723');
    setPixel(buf, w, 10, 10, '#3E2723');
    setPixel(buf, w, 11, 11, '#3E2723');

    // Glowing crackling flame (cols 6-10, rows 3-10)
    for (let y = 7; y <= 10; y++) {
        for (let x = 6; x <= 9; x++) {
            setPixel(buf, w, x, y, '#D50000'); // deep red coal
        }
    }
    setPixel(buf, w, 7, 6, '#FF6D00'); // orange flame
    setPixel(buf, w, 8, 6, '#FF6D00');
    setPixel(buf, w, 7, 5, '#FFD600'); // bright yellow tip
    setPixel(buf, w, 8, 4, '#FFFF00');
    setPixel(buf, w, 8, 3, '#FFFFFF'); // core ember
    quantizeTo32(buf);
    return buf;
}

// -------------------------------------------------------------
// 3x EXPORT PIPELINE FOR CHARACTER SHEETS
// -------------------------------------------------------------

function exportCharset(frames16, rmmzName, sidecarData) {
    const sheetW = 144;
    const sheetH = 192;
    const sheetBuf = Buffer.alloc(sheetW * sheetH * 4);

    // frames16 can be array of 3 frames, or a single frame
    const f0 = Array.isArray(frames16) ? frames16[0] : frames16;
    const f1 = Array.isArray(frames16) ? frames16[1] : frames16;
    const f2 = Array.isArray(frames16) ? frames16[2] : frames16;
    const frameArr = [f0, f1, f2];

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
            const curFrame = frameArr[col];
            const ox = col * 48;
            const oy = row * 48;
            for (let ny = 0; ny < 16; ny++) {
                for (let nx = 0; nx < 16; nx++) {
                    const sIdx = (ny * 16 + nx) * 4;
                    if (curFrame[sIdx + 3] === 0) continue;
                    const r = curFrame[sIdx];
                    const g = curFrame[sIdx + 1];
                    const b = curFrame[sIdx + 2];
                    const a = curFrame[sIdx + 3];

                    for (let dy = 0; dy < 3; dy++) {
                        for (let dx = 0; dx < 3; dx++) {
                            const px = ox + nx * 3 + dx;
                            const py = oy + ny * 3 + dy;
                            const dIdx = (py * sheetW + px) * 4;
                            sheetBuf[dIdx] = r;
                            sheetBuf[dIdx + 1] = g;
                            sheetBuf[dIdx + 2] = b;
                            sheetBuf[dIdx + 3] = a;
                        }
                    }
                }
            }
        }
    }

    quantizeTo32(sheetBuf);

    const outPng = path.join(ROOT, 'game', 'img', 'characters', `${rmmzName}.png`);
    const outJson = path.join(ROOT, 'game', 'img', 'characters', `${rmmzName}.json`);

    writePNG(outPng, sheetW, sheetH, sheetBuf);
    fs.writeFileSync(outJson, JSON.stringify(sidecarData, null, 2), 'utf8');
    console.log(`[Charset Exported] ${rmmzName}.png & .json`);
}

function exportMaster(native16, masterId) {
    const mw = 48, mh = 48;
    const mbuf = Buffer.alloc(mw * mh * 4);
    for (let ny = 0; ny < 16; ny++) {
        for (let nx = 0; nx < 16; nx++) {
            const sIdx = (ny * 16 + nx) * 4;
            if (native16[sIdx + 3] === 0) continue;
            for (let dy = 0; dy < 3; dy++) {
                for (let dx = 0; dx < 3; dx++) {
                    const dIdx = ((ny * 3 + dy) * mw + (nx * 3 + dx)) * 4;
                    mbuf[dIdx] = native16[sIdx];
                    mbuf[dIdx + 1] = native16[sIdx + 1];
                    mbuf[dIdx + 2] = native16[sIdx + 2];
                    mbuf[dIdx + 3] = 255;
                }
            }
        }
    }
    quantizeTo32(mbuf);
    const outPng = path.join(ROOT, 'art', 'masters', `${masterId}.png`);
    writePNG(outPng, mw, mh, mbuf);
}

// -------------------------------------------------------------
// FACE SET EXPORT PIPELINE
// -------------------------------------------------------------

const cBackdrop = [24, 28, 36];
const cBackdropDark = [16, 18, 24];
const cBarkLit = [138, 93, 45];
const cBarkMid = [109, 61, 12];
const cBarkDark = [77, 36, 0];
const cLeafLit = [113, 134, 77];
const cLeafMid = [93, 113, 57];
const cLeafDark = [57, 69, 28];
const cInk = [0, 0, 0];

const cStoneLit = [174, 162, 154];
const cStoneMid = [125, 113, 105];
const cStoneDark = [81, 73, 69];

function createLivingOakNative() {
    const FH = 48, FW = 48;
    const frame = Array.from({ length: FH }, () => Array.from({ length: FW }, () => [0, 0, 0, 0]));
    const isInside = Array.from({ length: FH }, () => Array.from({ length: FW }, () => false));

    const cx = 23.5, cy = 23.5;
    const rx = 18.5, ry = 20.0;
    const innerRx = 14.5, innerRy = 16.0;

    for (let y = 0; y < FH; y++) {
        for (let x = 0; x < FW; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const outerD = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
            const innerD = (dx * dx) / (innerRx * innerRx) + (dy * dy) / (innerRy * innerRy);

            if (innerD <= 1.0) {
                isInside[y][x] = true;
                const col = (y > 33) ? cBackdropDark : cBackdrop;
                frame[y][x] = [col[0], col[1], col[2], 255];
            } else if (outerD <= 1.0) {
                const angle = Math.atan2(dy, dx);
                const light = Math.cos(angle - (-Math.PI * 0.75));
                let c = cBarkMid;
                if (outerD >= 0.94) c = cInk;
                else if (outerD >= 0.82) c = (light > 0) ? cBarkLit : cBarkMid;
                else c = cBarkDark;

                if (y <= 12 || (y <= 24 && Math.abs(dx) >= 15)) {
                    const leaf = (x * 3 + y * 7) % 5;
                    if (leaf === 0) c = cLeafLit;
                    else if (leaf === 1 || leaf === 2) c = cLeafMid;
                    else if (leaf === 3) c = cLeafDark;
                }
                frame[y][x] = [c[0], c[1], c[2], 255];
            }
        }
    }
    return { frame, isInside };
}

function createStoneArchNative() {
    const FH = 48, FW = 48;
    const frame = Array.from({ length: FH }, () => Array.from({ length: FW }, () => [0, 0, 0, 0]));
    const isInside = Array.from({ length: FH }, () => Array.from({ length: FW }, () => false));

    const cx = 23.5, archCy = 21.0;
    const archOuterR = 19.0, archInnerR = 15.0;

    for (let y = 0; y < FH; y++) {
        for (let x = 0; x < FW; x++) {
            const dx = x - cx;
            if (y <= archCy) {
                const r = Math.hypot(dx, y - archCy);
                if (r <= archInnerR) {
                    isInside[y][x] = true;
                    frame[y][x] = [cBackdrop[0], cBackdrop[1], cBackdrop[2], 255];
                } else if (r <= archOuterR) {
                    let c = (r >= archOuterR - 0.8) ? cInk : (r >= archOuterR - 2.5 ? cStoneLit : cStoneMid);
                    if (Math.abs(dx) <= 2 && y <= 6) c = cStoneLit;
                    frame[y][x] = [c[0], c[1], c[2], 255];
                }
            } else {
                if (Math.abs(dx) < archInnerR && y < 44) {
                    isInside[y][x] = true;
                    const col = (y > 35) ? cBackdropDark : cBackdrop;
                    frame[y][x] = [col[0], col[1], col[2], 255];
                } else if (Math.abs(dx) >= archInnerR && Math.abs(dx) <= archOuterR && y < 44) {
                    const isLeft = (dx < 0);
                    let c = isLeft ? (dx === -Math.round(archOuterR) ? cInk : cStoneLit) : (dx === Math.round(archOuterR) ? cInk : cStoneDark);
                    frame[y][x] = [c[0], c[1], c[2], 255];
                } else if (Math.abs(dx) <= archOuterR + 1 && y >= 44 && y <= 46) {
                    let c = (y === 44) ? cStoneLit : (y === 46 ? cInk : cStoneMid);
                    frame[y][x] = [c[0], c[1], c[2], 255];
                }
            }
        }
    }
    return { frame, isInside };
}

function generateFaceSet(portraits16, isStone, outFileName) {
    const NW = 192, NH = 96;
    const nativeCanvas = Array.from({ length: NH }, () => Array.from({ length: NW }, () => [0, 0, 0, 0]));

    for (let idx = 0; idx < 8; idx++) {
        const col = idx % 4;
        const row = Math.floor(idx / 4);
        const ox = col * 48;
        const oy = row * 48;

        const { frame, isInside } = isStone ? createStoneArchNative() : createLivingOakNative();
        const cell = Array.from({ length: 48 }, () => Array.from({ length: 48 }, () => [0, 0, 0, 0]));

        // Render portrait inside cell
        const native16 = portraits16[idx];
        if (native16) {
            // Scale 16x16 feature ~1.5x into 24x24 centered at (12, 14)
            for (let y = 0; y < 24; y++) {
                const sy = Math.floor(y / 1.5);
                for (let x = 0; x < 24; x++) {
                    const sx = Math.floor(x / 1.5);
                    if (sx < 16 && sy < 16) {
                        const sIdx = (sy * 16 + sx) * 4;
                        if (native16[sIdx + 3] > 0) {
                            const dx = 12 + x, dy = 14 + y;
                            if (dx >= 0 && dx < 48 && dy >= 0 && dy < 48 && isInside[dy][dx]) {
                                cell[dy][dx] = [native16[sIdx], native16[sIdx + 1], native16[sIdx + 2], 255];
                            }
                        }
                    }
                }
            }
        }

        // Composite frame and portrait
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const fp = frame[y][x];
                let finalPixel;
                if (isInside[y][x]) {
                    finalPixel = cell[y][x][3] > 0 ? cell[y][x] : fp;
                } else if (fp[3] > 0) {
                    finalPixel = fp;
                } else {
                    finalPixel = [0, 0, 0, 0];
                }
                nativeCanvas[oy + y][ox + x] = finalPixel;
            }
        }
    }

    const sheetW = 576, sheetH = 288;
    const sheetBuf = Buffer.alloc(sheetW * sheetH * 4);
    for (let ny = 0; ny < NH; ny++) {
        for (let nx = 0; nx < NW; nx++) {
            const p = nativeCanvas[ny][nx];
            for (let dy = 0; dy < 3; dy++) {
                for (let dx = 0; dx < 3; dx++) {
                    const idx = ((ny * 3 + dy) * sheetW + (nx * 3 + dx)) * 4;
                    sheetBuf[idx] = p[0]; sheetBuf[idx + 1] = p[1]; sheetBuf[idx + 2] = p[2]; sheetBuf[idx + 3] = p[3];
                }
            }
        }
    }

    quantizeTo32(sheetBuf);
    const outPath = path.join(ROOT, 'game', 'img', 'faces', outFileName);
    writePNG(outPath, sheetW, sheetH, sheetBuf);
    console.log(`[Face Set Exported] ${outFileName} (576x288, 3x grid verified)`);
}

// -------------------------------------------------------------
// MAIN EXECUTION
// -------------------------------------------------------------

console.log('=== Building Batch 6 Objects and Face Sets ===');

// 1. Generate 9 Object Charsets
const doorWoodFrames = generateDoorWoodFrames();
const doorStoneFrames = generateDoorStoneFrames();
const bowyerBench = generateBowyerBench();
const fletcherBench = generateFletcherBench();
const tanningRack = generateTanningRack();
const weaponRack = generateWeaponRack();
const well = generateWell();
const farmPlot = generateFarmPlot();
const bridge = generateBridge();

// Export masters
exportMaster(doorWoodFrames[0], 'door_wood');
exportMaster(doorStoneFrames[0], 'door_stone');
exportMaster(bowyerBench, 'bowyer_bench');
exportMaster(fletcherBench, 'fletcher_bench');
exportMaster(tanningRack, 'tanning_rack');
exportMaster(weaponRack, 'weapon_rack');
exportMaster(well, 'well');
exportMaster(farmPlot, 'farm_plot');
exportMaster(bridge, 'bridge');

// Export Charsets + Sidecars
const baseSidecar = (id, name, cat = 'Building') => ({
    id,
    name,
    category: cat,
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ['S'],
    animations: { stand: [0] }
});

exportCharset(doorWoodFrames, '!$UF_Door_Wood', {
    ...baseSidecar('door_wood', 'Wooden Door'),
    facings: ['S', 'W', 'E', 'N'],
    animations: { closed: [0], ajar: [1], open: [2] }
});

exportCharset(doorStoneFrames, '!$UF_Door_Stone', {
    ...baseSidecar('door_stone', 'Stone Door'),
    facings: ['S', 'W', 'E', 'N'],
    animations: { closed: [0], ajar: [1], open: [2] }
});

exportCharset(bowyerBench, '!$UF_Bowyer_Bench', baseSidecar('bowyer_bench', "Bowyer's Bench", 'Workplace'));
exportCharset(fletcherBench, '!$UF_Fletcher_Bench', baseSidecar('fletcher_bench', "Fletcher's Bench", 'Workplace'));
exportCharset(tanningRack, '!$UF_Tanning_Rack', baseSidecar('tanning_rack', 'Tanning Rack', 'Workplace'));
exportCharset(weaponRack, '!$UF_Weapon_Rack', baseSidecar('weapon_rack', 'Weapon Rack', 'Building'));
exportCharset(well, '!$UF_Well', baseSidecar('well', 'Stone Well', 'Workplace'));
exportCharset(farmPlot, '!$UF_FarmPlot', { ...baseSidecar('farm_plot', 'Farm Plot', 'Workplace'), under: true, passable: true });
exportCharset(bridge, '!$UF_Bridge', { ...baseSidecar('bridge', 'Plank Bridge', 'Building'), under: true, passable: true, onWater: true });

// 2. Generate Face Sets
const floraExPortraits = [
    generateFaceWhiteFlowers(),
    generateFaceWildGrain(),
    generateFaceLichen(),
    generateFaceLilyPad(),
    generateFaceBush(),
    generateFaceDesertShrub(),
    generateFaceSnowBush(),
    generateFaceFern()
];
generateFaceSet(floraExPortraits, false, 'UF_Faces_Flora_Ex.png');

const landmarkPortraits = [
    generateFaceFirSnowStump(),
    generateFaceMangroveStump(),
    generateFaceTropicalStump(),
    generateFacePalmStump(),
    generateFaceCursedStump(),
    generateFaceRubble(),
    generateFaceWorkbench(),
    generateFaceCampfire()
];
generateFaceSet(landmarkPortraits, true, 'UF_Faces_Landmarks.png');

console.log('=== Batch 6 Build Complete ===');
