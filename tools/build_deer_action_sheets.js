const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const MASTER_IDLE = path.join(ROOT, 'art', 'masters', 'deer_idle.png');
const decoded = decodePNG(fs.readFileSync(MASTER_IDLE), 'deer_idle.png');

const cellW = 48, cellH = 48;
const idleW = 144, idleH = 384; // 3 cols x 8 rows

// Extract base frames for each of the 8 facings (using col 0: stand)
// Facings order: S(0), SW(1), W(2), NW(3), N(4), NE(5), E(6), SE(7)
function getBaseFrame(facingRow) {
    const buf = Buffer.alloc(cellW * cellH * 4);
    for (let y = 0; y < cellH; y++) {
        for (let x = 0; x < cellW; x++) {
            const sidx = ((facingRow * cellH + y) * idleW + x) * 4;
            const didx = (y * cellW + x) * 4;
            buf[didx] = decoded.data[sidx];
            buf[didx + 1] = decoded.data[sidx + 1];
            buf[didx + 2] = decoded.data[sidx + 2];
            buf[didx + 3] = decoded.data[sidx + 3];
        }
    }
    return buf;
}

const baseFacings = [];
for (let r = 0; r < 8; r++) {
    baseFacings.push(getBaseFrame(r));
}

// Helper to create an empty frame
function emptyFrame() {
    return Buffer.alloc(cellW * cellH * 4);
}

// Helper to set pixel safely
function setPx(buf, x, y, r, g, b, a = 255) {
    if (x < 0 || x >= cellW || y < 0 || y >= cellH) return;
    const idx = (y * cellW + x) * 4;
    buf[idx] = r;
    buf[idx + 1] = g;
    buf[idx + 2] = b;
    buf[idx + 3] = a;
}

// -------------------------------------------------------------
// 1. WALK ANIMATION: 3 frames (Step 1, Pass/Stand, Step 2)
// -------------------------------------------------------------
function buildWalkFrames(baseBuf, facingIdx) {
    // Frame 1 is the neutral Stand frame
    const fPass = Buffer.from(baseBuf);
    const fStep1 = Buffer.alloc(cellW * cellH * 4);
    const fStep2 = Buffer.alloc(cellW * cellH * 4);

    // Copy base into fStep1 and fStep2 with leg gait alternation
    // Facing W (2) or E (6): Side profile walking
    if (facingIdx === 2 || facingIdx === 6) {
        const isEast = (facingIdx === 6);
        const dirSign = isEast ? 1 : -1;

        for (let y = 0; y < cellH; y++) {
            for (let x = 0; x < cellW; x++) {
                const sidx = (y * cellW + x) * 4;
                if (baseBuf[sidx + 3] === 0) continue;
                const r = baseBuf[sidx], g = baseBuf[sidx + 1], b = baseBuf[sidx + 2];

                // Torso & head (y < 35): subtle 1px vertical walk bob
                if (y < 35) {
                    setPx(fStep1, x, y, r, g, b);
                    setPx(fStep2, x, y, r, g, b);
                } else {
                    // Legs (y >= 35)
                    // Forelegs (around x: 13..18) and Hindlegs (around x: 30..35)
                    const isForeleg = isEast ? (x >= 30) : (x <= 18);
                    const isHindleg = isEast ? (x <= 18) : (x >= 30);

                    if (isForeleg) {
                        // Step 1: foreleg strides forward 2px, lifts 1px
                        setPx(fStep1, x + dirSign * 2, y - 1, r, g, b);
                        // Step 2: foreleg trails backward 1px
                        setPx(fStep2, x - dirSign * 1, y, r, g, b);
                    } else if (isHindleg) {
                        // Step 1: hindleg trails back 2px
                        setPx(fStep1, x - dirSign * 2, y, r, g, b);
                        // Step 2: hindleg pushes forward 2px, lifts 1px
                        setPx(fStep2, x + dirSign * 2, y - 1, r, g, b);
                    } else {
                        setPx(fStep1, x, y, r, g, b);
                        setPx(fStep2, x, y, r, g, b);
                    }
                }
            }
        }
    } else {
        // Front / Back / Diagonals: Alternating left/right leg lifts
        for (let y = 0; y < cellH; y++) {
            for (let x = 0; x < cellW; x++) {
                const sidx = (y * cellW + x) * 4;
                if (baseBuf[sidx + 3] === 0) continue;
                const r = baseBuf[sidx], g = baseBuf[sidx + 1], b = baseBuf[sidx + 2];

                if (y < 36) {
                    // Upper body
                    setPx(fStep1, x, y, r, g, b);
                    setPx(fStep2, x, y, r, g, b);
                } else {
                    // Lower legs
                    const isLeft = (x < 24);
                    if (isLeft) {
                        // Step 1: Left leg lifted 1px
                        setPx(fStep1, x, y - 1, r, g, b);
                        // Step 2: Left leg planted
                        setPx(fStep2, x, y, r, g, b);
                    } else {
                        // Step 1: Right leg planted
                        setPx(fStep1, x, y, r, g, b);
                        // Step 2: Right leg lifted 1px
                        setPx(fStep2, x, y - 1, r, g, b);
                    }
                }
            }
        }
    }

    return [fStep1, fPass, fStep2];
}

// -------------------------------------------------------------
// Carcass definitions for Frame 2 of death
// -------------------------------------------------------------
const C = {
    OUTLINE: [53, 0, 0, 255],        // #350000
    DARK_SHADOW: [69, 20, 0, 255],   // #451400
    SHADOW: [109, 61, 12, 255],      // #6D3D0C
    MID_DARK: [130, 93, 77, 255],    // #825D4D
    BODY: [158, 81, 36, 255],        // #9E5124
    LIGHT_BODY: [166, 81, 0, 255],   // #A65100
    HIGHLIGHT: [194, 97, 0, 255],    // #C26100
    BRIGHT_GOLD: [255, 174, 93, 255],// #FFAE5D
    CREAM: [255, 223, 186, 255],     // #FFDFBA
    ANTLER_LIGHT: [202, 178, 146, 255], // #CAB292
    ANTLER_MID: [186, 154, 113, 255],   // #BA9A71
    ANTLER_DARK: [85, 61, 49, 255],     // #553D31
    HOOF: [53, 0, 0, 255]
};

function createWestCarcass() {
    const buf = Buffer.alloc(48 * 48 * 4);
    function p(x, y, col) {
        if (x < 0 || x >= 48 || y < 0 || y >= 48) return;
        const idx = (y * 48 + x) * 4;
        buf[idx] = col[0];
        buf[idx + 1] = col[1];
        buf[idx + 2] = col[2];
        buf[idx + 3] = col[3];
    }
    function hline(x1, x2, y, col) {
        for (let x = x1; x <= x2; x++) p(x, y, col);
    }

    // 1. ANTLERS: Resting back behind head across y=28..37, x=12..24
    p(12, 37, C.ANTLER_DARK);
    p(13, 36, C.ANTLER_MID);
    p(14, 35, C.ANTLER_LIGHT);
    p(15, 34, C.ANTLER_LIGHT);
    p(16, 33, C.ANTLER_LIGHT);
    p(17, 33, C.ANTLER_LIGHT);
    p(18, 32, C.ANTLER_MID);
    p(19, 32, C.ANTLER_LIGHT);
    p(20, 31, C.ANTLER_LIGHT);
    p(21, 31, C.ANTLER_MID);
    p(22, 30, C.ANTLER_LIGHT);
    p(23, 31, C.ANTLER_MID);
    p(24, 32, C.ANTLER_DARK);

    // Tines
    p(13, 34, C.ANTLER_MID);
    p(13, 33, C.ANTLER_LIGHT);
    p(14, 32, C.ANTLER_LIGHT);
    p(17, 31, C.ANTLER_MID);
    p(17, 30, C.ANTLER_LIGHT);
    p(18, 29, C.ANTLER_LIGHT);
    p(21, 29, C.ANTLER_LIGHT);
    p(22, 28, C.ANTLER_LIGHT);
    p(23, 29, C.ANTLER_MID);

    // Shadow antler
    p(14, 37, C.ANTLER_DARK);
    p(15, 36, C.ANTLER_DARK);
    p(16, 35, C.ANTLER_DARK);
    p(17, 34, C.ANTLER_DARK);
    p(18, 34, C.ANTLER_MID);
    p(19, 33, C.ANTLER_MID);
    p(20, 33, C.ANTLER_LIGHT);
    p(21, 32, C.ANTLER_DARK);

    // 2. MAIN BODY (Back, Flank, Rump)
    // Row 34: subtle crest
    p(24, 34, C.OUTLINE);
    hline(25, 27, 34, C.HIGHLIGHT);
    p(28, 34, C.OUTLINE);

    // Row 35: rounded top line of back and loin
    p(22, 35, C.OUTLINE);
    p(23, 35, C.LIGHT_BODY);
    hline(24, 27, 35, C.BRIGHT_GOLD);
    hline(28, 30, 35, C.HIGHLIGHT);
    hline(31, 34, 35, C.HIGHLIGHT);
    p(35, 35, C.OUTLINE);

    // Row 36: upper flank & rump
    p(19, 36, C.OUTLINE);
    p(20, 36, C.LIGHT_BODY);
    hline(21, 25, 36, C.HIGHLIGHT);
    hline(26, 31, 36, C.LIGHT_BODY);
    hline(32, 35, 36, C.BODY);
    p(36, 36, C.OUTLINE);

    // Row 37: shoulder slope to rump
    p(17, 37, C.OUTLINE);
    p(18, 37, C.LIGHT_BODY);
    hline(19, 24, 37, C.LIGHT_BODY);
    hline(25, 31, 37, C.BODY);
    hline(32, 36, 37, C.BODY);
    p(37, 37, C.OUTLINE);

    // Row 38: head top & main flank
    p(11, 38, C.OUTLINE);
    p(12, 38, C.BODY);
    p(13, 38, C.OUTLINE); // ear root
    p(16, 38, C.OUTLINE);
    hline(17, 23, 38, C.BODY);
    hline(24, 31, 38, C.BODY);
    hline(32, 36, 38, C.SHADOW);
    p(37, 38, C.OUTLINE);
    p(38, 38, C.SHADOW); // small tail
    p(39, 38, C.OUTLINE);

    // Row 39: head, neck & ribcage
    p(9, 39, C.OUTLINE);
    p(10, 39, C.BODY);
    p(11, 39, C.LIGHT_BODY);
    p(12, 39, C.OUTLINE); // closed eye
    p(13, 39, C.BODY);
    p(14, 39, C.OUTLINE);
    hline(16, 22, 39, C.BODY);
    hline(23, 30, 39, C.BODY);
    hline(31, 35, 39, C.SHADOW);
    p(36, 39, C.DARK_SHADOW);
    p(37, 39, C.OUTLINE);

    // Row 40: snout, throat, chest, belly, hindquarter
    p(7, 40, C.OUTLINE);
    p(8, 40, C.CREAM);
    p(9, 40, C.CREAM);
    p(10, 40, C.BODY);
    p(11, 40, C.BODY);
    p(12, 40, C.BODY);
    p(13, 40, C.OUTLINE);
    p(15, 40, C.OUTLINE);
    hline(16, 18, 40, C.CREAM); // throat patch
    hline(19, 23, 40, C.BODY);
    hline(24, 28, 40, C.BODY);
    hline(29, 33, 40, C.CREAM); // pale belly
    hline(34, 36, 40, C.SHADOW);
    p(37, 40, C.OUTLINE);

    // Row 41: muzzle, lower jaw, chest & folded hind leg
    p(5, 41, C.OUTLINE);
    p(6, 41, C.DARK_SHADOW); // nose tip
    p(7, 41, C.CREAM);
    p(8, 41, C.CREAM);
    p(9, 41, C.OUTLINE);
    p(14, 41, C.OUTLINE);
    hline(15, 18, 41, C.CREAM);
    hline(19, 22, 41, C.BODY);
    hline(23, 27, 41, C.SHADOW);
    hline(28, 31, 41, C.CREAM);
    hline(32, 35, 41, C.SHADOW);
    p(36, 41, C.BODY); // hind thigh
    p(37, 41, C.LIGHT_BODY);
    p(38, 41, C.OUTLINE);

    // Row 42: chin, front leg shoulder & folded hind leg
    p(6, 42, C.OUTLINE);
    hline(7, 8, 42, C.CREAM);
    p(9, 42, C.OUTLINE);
    p(14, 42, C.OUTLINE);
    hline(15, 17, 42, C.SHADOW);
    hline(18, 22, 42, C.BODY); // folded front leg knee
    hline(23, 27, 42, C.DARK_SHADOW);
    hline(28, 30, 42, C.SHADOW);
    hline(31, 35, 42, C.BODY);
    hline(36, 38, 42, C.LIGHT_BODY);
    p(39, 42, C.OUTLINE);

    // Row 43: neck on grass, folded front legs, folded rear leg
    p(7, 43, C.OUTLINE);
    p(8, 43, C.SHADOW);
    p(9, 43, C.OUTLINE);
    p(13, 43, C.OUTLINE);
    hline(14, 16, 43, C.BODY);
    hline(17, 21, 43, C.LIGHT_BODY);
    p(22, 43, C.OUTLINE);
    hline(23, 28, 43, C.DARK_SHADOW);
    hline(29, 32, 43, C.SHADOW);
    hline(33, 37, 43, C.BODY);
    p(38, 43, C.LIGHT_BODY);
    p(39, 43, C.OUTLINE);

    // Row 44: front cannon bone, folded knee, rear hock
    p(12, 44, C.OUTLINE);
    hline(13, 16, 44, C.LIGHT_BODY);
    p(17, 44, C.OUTLINE);
    p(18, 44, C.SHADOW);
    p(19, 44, C.BODY);
    p(20, 44, C.OUTLINE);
    hline(24, 28, 44, C.OUTLINE);
    hline(29, 33, 44, C.DARK_SHADOW);
    hline(34, 37, 44, C.SHADOW);
    p(38, 44, C.BODY);
    p(39, 44, C.OUTLINE);

    // Row 45: front hooves tucked, rear cannon bone extending
    p(14, 45, C.OUTLINE);
    p(15, 45, C.BODY);
    p(16, 45, C.LIGHT_BODY);
    p(17, 45, C.HOOF);
    p(18, 45, C.OUTLINE);
    hline(31, 35, 45, C.OUTLINE);
    hline(36, 38, 45, C.BODY);
    p(39, 45, C.LIGHT_BODY);
    p(40, 45, C.OUTLINE);

    // Row 46: hooves resting on turf
    p(15, 46, C.OUTLINE);
    p(16, 46, C.HOOF);
    p(17, 46, C.HOOF);
    p(18, 46, C.OUTLINE);
    p(37, 46, C.OUTLINE);
    p(38, 46, C.HOOF);
    p(39, 46, C.LIGHT_BODY);
    p(40, 46, C.OUTLINE);

    // Row 47: ground baseline contact points
    p(16, 47, C.OUTLINE);
    p(17, 47, C.OUTLINE);
    p(38, 47, C.OUTLINE);
    p(39, 47, C.OUTLINE);

    return buf;
}

function createEastCarcass(westBuf) {
    const buf = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sidx = (y * 48 + x) * 4;
            const didx = (y * 48 + (47 - x)) * 4;
            buf[didx] = westBuf[sidx];
            buf[didx + 1] = westBuf[sidx + 1];
            buf[didx + 2] = westBuf[sidx + 2];
            buf[didx + 3] = westBuf[sidx + 3];
        }
    }
    return buf;
}

const westCarcass = createWestCarcass();
const eastCarcass = createEastCarcass(westCarcass);

// -------------------------------------------------------------
// 2. WORK / FLEE GALLOP: 3 frames (Crouch/Gather, Leap Extension, Land)
// -------------------------------------------------------------
function buildWorkFrames(baseBuf, facingIdx) {
    const fCrouch = Buffer.alloc(cellW * cellH * 4);
    const fLeap = Buffer.alloc(cellW * cellH * 4);
    const fLand = Buffer.alloc(cellW * cellH * 4);

    const isSide = (facingIdx === 2 || facingIdx === 6);
    const dirSign = (facingIdx === 6) ? 1 : -1;

    for (let y = 0; y < cellH; y++) {
        for (let x = 0; x < cellW; x++) {
            const sidx = (y * cellW + x) * 4;
            if (baseBuf[sidx + 3] === 0) continue;
            const r = baseBuf[sidx], g = baseBuf[sidx + 1], b = baseBuf[sidx + 2];

            if (isSide) {
                // For West (facing 2): forelegs are left (x <= 23), hindlegs are right (x >= 24)
                // For East (facing 6): forelegs are right (x >= 24), hindlegs are left (x <= 23)
                const isForeleg = (facingIdx === 6) ? (x >= 24) : (x <= 23);
                const isHindleg = (facingIdx === 6) ? (x <= 23) : (x >= 24);

                // Frame 0: Crouch / Gather (torso lowers 1px, legs coil under body)
                if (y < 34) {
                    setPx(fCrouch, x, y + 1, r, g, b);
                } else if (isForeleg) {
                    // Foreleg tucks back under chest
                    const tuck = Math.round(-dirSign * 2 * ((y - 34) / 13));
                    setPx(fCrouch, x + tuck, y + 1, r, g, b);
                } else if (isHindleg) {
                    // Hindleg coils forward under flank
                    const coil = Math.round(dirSign * 2 * ((y - 34) / 13));
                    setPx(fCrouch, x + coil, y + 1, r, g, b);
                }

                // Frame 1: Extended Leap (body surges forward 2px and up 2px)
                // All parts from y=0..34 shift x + dirSign * 2, y - 2
                if (y < 34) {
                    setPx(fLeap, x + dirSign * 2, y - 2, r, g, b);
                } else if (isForeleg) {
                    // Foreleg reaches forward: from +2 at shoulder down to +4 at hoof
                    const reach = Math.round(dirSign * 2 + dirSign * 2 * ((y - 34) / 13));
                    setPx(fLeap, x + reach, y - 2, r, g, b);
                } else if (isHindleg) {
                    // Hindleg extends back: from +2 at hip down to -1 at hoof
                    const extend = Math.round(dirSign * 2 - dirSign * 3 * ((y - 34) / 13));
                    setPx(fLeap, x + extend, y - 2, r, g, b);
                }

                // Frame 2: Landing (forelegs reach ground at row 47, chest drops, hindlegs follow)
                if (y < 34) {
                    setPx(fLand, x + dirSign * 1, y, r, g, b);
                } else if (isForeleg) {
                    setPx(fLand, x + dirSign * 1, y, r, g, b);
                } else if (isHindleg) {
                    const swing = Math.round(dirSign * 1 * ((47 - y) / 13));
                    setPx(fLand, x + swing, y, r, g, b);
                }
            } else {
                // Front (S), Back (N), Diagonals
                // Frame 0: Gather (drop 1px)
                setPx(fCrouch, x, Math.min(47, y + 1), r, g, b);

                // Frame 1: Surge up 2px
                setPx(fLeap, x, Math.max(0, y - 2), r, g, b);

                // Frame 2: Land (normal baseline)
                setPx(fLand, x, y, r, g, b);
            }
        }
    }

    return [fCrouch, fLeap, fLand];
}

// -------------------------------------------------------------
// 3. HURT ANIMATION: 1 frame (Flinch back, head thrown back)
// -------------------------------------------------------------
function buildHurtFrame(baseBuf, facingIdx) {
    const fHurt = Buffer.alloc(cellW * cellH * 4);
    const isSide = (facingIdx === 2 || facingIdx === 6);
    const dirSign = (facingIdx === 6) ? 1 : -1;

    if (isSide) {
        // Recoil backward away from blow: entire body shifts by -dirSign * 2
        for (let y = 0; y < cellH; y++) {
            for (let x = 0; x < cellW; x++) {
                const sidx = (y * cellW + x) * 4;
                if (baseBuf[sidx + 3] === 0) continue;
                const r = baseBuf[sidx], g = baseBuf[sidx + 1], b = baseBuf[sidx + 2];

                // Rearing recoil: front hooves lift 1px, head/chest pitch slightly back
                const isForeleg = (facingIdx === 6) ? (x >= 28) : (x <= 20);
                const lift = (isForeleg && y >= 40) ? 1 : 0;
                setPx(fHurt, x - dirSign * 2, y - lift, r, g, b);
            }
        }
    } else {
        // Front (S), Back (N), Diagonals: Flinch recoil
        // Torso drops 1px into a flinch crouch as a unified unit (ZERO gap!)
        for (let y = 0; y < cellH; y++) {
            for (let x = 0; x < cellW; x++) {
                const sidx = (y * cellW + x) * 4;
                if (baseBuf[sidx + 3] === 0) continue;
                const r = baseBuf[sidx], g = baseBuf[sidx + 1], b = baseBuf[sidx + 2];
                setPx(fHurt, x, Math.min(47, y + 1), r, g, b);
            }
        }
    }
    return fHurt;
}

// -------------------------------------------------------------
// 4. DEATH ANIMATION: 3 frames (Buckle, Fall, Dedicated Carcass)
// -------------------------------------------------------------
function buildDeathFrames(baseBuf, facingIdx) {
    const fBuckle = Buffer.alloc(cellW * cellH * 4);
    const fFall = Buffer.alloc(cellW * cellH * 4);

    // Frame 0: Buckle knees (entire sprite sinks 3px toward ground)
    for (let y = 0; y < cellH; y++) {
        for (let x = 0; x < cellW; x++) {
            const sidx = (y * cellW + x) * 4;
            if (baseBuf[sidx + 3] === 0) continue;
            const r = baseBuf[sidx], g = baseBuf[sidx + 1], b = baseBuf[sidx + 2];
            setPx(fBuckle, x, Math.min(47, y + 3), r, g, b);
        }
    }

    // Frame 1: Collapse / pitching onto shoulder
    for (let y = 0; y < cellH; y++) {
        for (let x = 0; x < cellW; x++) {
            const sidx = (y * cellW + x) * 4;
            if (baseBuf[sidx + 3] === 0) continue;
            const r = baseBuf[sidx], g = baseBuf[sidx + 1], b = baseBuf[sidx + 2];
            const sink = Math.round(6 + (47 - y) * 0.25);
            setPx(fFall, x, Math.min(47, y + sink), r, g, b);
        }
    }

    // Frame 2: Dedicated Carcass
    // West-lying carcass for S(0), SW(1), W(2), NW(3)
    // East-lying carcass for N(4), NE(5), E(6), SE(7)
    const isEastProfile = (facingIdx === 4 || facingIdx === 5 || facingIdx === 6 || facingIdx === 7);
    const fCarcass = isEastProfile ? eastCarcass : westCarcass;

    return [fBuckle, fFall, fCarcass];
}

// -------------------------------------------------------------
// Assembly and Master Export
// -------------------------------------------------------------
console.log('Building action frames for all 8 facings...');
const walkGrid = [];
const workGrid = [];
const hurtGrid = [];
const deathGrid = [];

for (let r = 0; r < 8; r++) {
    walkGrid.push(buildWalkFrames(baseFacings[r], r));
    workGrid.push(buildWorkFrames(baseFacings[r], r));
    hurtGrid.push(buildHurtFrame(baseFacings[r], r));
    deathGrid.push(buildDeathFrames(baseFacings[r], r));
}

function assembleSheet(grid, cols, rows, rawOutPath, masterOutPath, sidecarJson) {
    const rawW = cellW * 4 * cols;
    const rawH = cellH * 4 * rows;
    const rawBuf = Buffer.alloc(rawW * rawH * 4);

    // Fill with magenta
    for (let i = 0; i < rawW * rawH; i++) {
        rawBuf[i * 4] = 255;
        rawBuf[i * 4 + 1] = 0;
        rawBuf[i * 4 + 2] = 255;
        rawBuf[i * 4 + 3] = 255;
    }

    const masterW = cellW * cols;
    const masterH = cellH * rows;
    const masterBuf = Buffer.alloc(masterW * masterH * 4);

    for (let r = 0; r < rows; r++) {
        const rowData = grid[r];
        for (let c = 0; c < cols; c++) {
            const fBuf = Array.isArray(rowData) ? rowData[c] : rowData;
            for (let y = 0; y < cellH; y++) {
                for (let x = 0; x < cellW; x++) {
                    const sidx = (y * cellW + x) * 4;
                    if (fBuf[sidx + 3] > 0) {
                        const pr = fBuf[sidx], pg = fBuf[sidx + 1], pb = fBuf[sidx + 2];

                        // Master
                        const midx = ((r * cellH + y) * masterW + (c * cellW + x)) * 4;
                        masterBuf[midx] = pr;
                        masterBuf[midx + 1] = pg;
                        masterBuf[midx + 2] = pb;
                        masterBuf[midx + 3] = 255;

                        // Raw 4x
                        const rawCellX = c * 192;
                        const rawCellY = r * 192;
                        for (let dy = 0; dy < 4; dy++) {
                            for (let dx = 0; dx < 4; dx++) {
                                const ridx = ((rawCellY + y * 4 + dy) * rawW + (rawCellX + x * 4 + dx)) * 4;
                                rawBuf[ridx] = pr;
                                rawBuf[ridx + 1] = pg;
                                rawBuf[ridx + 2] = pb;
                                rawBuf[ridx + 3] = 255;
                            }
                        }
                    }
                }
            }
        }
    }

    writePNG(rawOutPath, rawW, rawH, rawBuf);
    writePNG(masterOutPath, masterW, masterH, masterBuf);
    fs.writeFileSync(masterOutPath.replace(/\.png$/, '.json'), JSON.stringify(sidecarJson, null, 2) + '\n');
    console.log(`Saved: ${masterOutPath} (${masterW}x${masterH})`);
}

// 1. deer_walk
const walkSidecar = {
    id: "deer_walk",
    species: "deer",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"],
    animations: { walk: [0, 1, 2, 1] },
    frameMs: 180,
    layer: "body",
    category: "wildlife"
};
assembleSheet(walkGrid, 3, 8, path.join(ROOT, 'art', 'raw', 'deer_walk.png'), path.join(ROOT, 'art', 'masters', 'deer_walk.png'), walkSidecar);

// 2. deer_work (flee / run gallop)
const workSidecar = {
    id: "deer_work",
    species: "deer",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"],
    animations: { run: [0, 1, 2] },
    frameMs: 120,
    layer: "body",
    category: "wildlife"
};
assembleSheet(workGrid, 3, 8, path.join(ROOT, 'art', 'raw', 'deer_work.png'), path.join(ROOT, 'art', 'masters', 'deer_work.png'), workSidecar);

// 3. deer_hurt
const hurtSidecar = {
    id: "deer_hurt",
    species: "deer",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"],
    animations: { hurt: [0] },
    frameMs: 200,
    layer: "body",
    category: "wildlife"
};
assembleSheet(hurtGrid, 1, 8, path.join(ROOT, 'art', 'raw', 'deer_hurt.png'), path.join(ROOT, 'art', 'masters', 'deer_hurt.png'), hurtSidecar);

// 4. deer_death
const deathSidecar = {
    id: "deer_death",
    species: "deer",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"],
    animations: { death: [0, 1, 2] },
    frameMs: 250,
    layer: "body",
    category: "wildlife"
};
assembleSheet(deathGrid, 3, 8, path.join(ROOT, 'art', 'raw', 'deer_death.png'), path.join(ROOT, 'art', 'masters', 'deer_death.png'), deathSidecar);

// 5. Update RMMZ Charset with true Walk frames (Step 1, Pass, Step 2)
console.log('Updating standard RMMZ character sheet ($UF_Deer.png) with true walk gait...');
const rmmzW = 144, rmmzH = 192;
const rmmzBuf = Buffer.alloc(rmmzW * rmmzH * 4);
const rmmzRows = [0, 2, 6, 4]; // Down (S), Left (W), Right (E), Up (N)

for (let r = 0; r < 4; r++) {
    const srcRow = rmmzRows[r];
    const frames = walkGrid[srcRow];
    const shiftX = (r === 0) ? 2 : 0; // Maintain perfect center of mass for South
    for (let c = 0; c < 3; c++) {
        // Col 0: step1, Col 1: pass, Col 2: step2
        const fBuf = frames[c];
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sidx = (y * cellW + x) * 4;
                if (fBuf[sidx + 3] > 0) {
                    const outX = x + shiftX;
                    if (outX >= 0 && outX < 48) {
                        const didx = ((r * 48 + y) * rmmzW + (c * 48 + outX)) * 4;
                        rmmzBuf[didx] = fBuf[sidx];
                        rmmzBuf[didx + 1] = fBuf[sidx + 1];
                        rmmzBuf[didx + 2] = fBuf[sidx + 2];
                        rmmzBuf[didx + 3] = 255;
                    }
                }
            }
        }
    }
}
const rmmzPath = path.join(ROOT, 'game', 'img', 'characters', '$UF_Deer.png');
writePNG(rmmzPath, rmmzW, rmmzH, rmmzBuf);
console.log(`Updated RMMZ charset: ${rmmzPath}`);

// 6. Generate Grand Review Showcase
console.log('Generating deer actions review showcase...');
const reviewDir = path.join(ROOT, 'art', 'review');
const meadowPngPath = path.join(ROOT, 'art', 'masters', 'meadow.png');
const meadowImg = decodePNG(fs.readFileSync(meadowPngPath), 'meadow');

// 5 actions: Stand, Walk, Run, Hurt, Death
// Width: 5 tiles (240 px) x Height: 2 tiles (96 px)
const showW = 240, showH = 96;
const showBuf = Buffer.alloc(showW * showH * 4);

// Tile meadow background
for (let ty = 0; ty < 2; ty++) {
    for (let tx = 0; tx < 5; tx++) {
        for (let py = 0; py < 48; py++) {
            for (let px = 0; px < 48; px++) {
                const sidx = (py * 48 + px) * 4;
                const didx = (((ty * 48 + py) * showW) + (tx * 48 + px)) * 4;
                showBuf[didx] = meadowImg.data[sidx];
                showBuf[didx + 1] = meadowImg.data[sidx + 1];
                showBuf[didx + 2] = meadowImg.data[sidx + 2];
                showBuf[didx + 3] = 255;
            }
        }
    }
}

// Blit helper onto showBuf
function blitToScene(fBuf, tileX, tileY) {
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sidx = (y * 48 + x) * 4;
            if (fBuf[sidx + 3] > 0) {
                const didx = (((tileY * 48 + y) * showW) + (tileX * 48 + x)) * 4;
                showBuf[didx] = fBuf[sidx];
                showBuf[didx + 1] = fBuf[sidx + 1];
                showBuf[didx + 2] = fBuf[sidx + 2];
                showBuf[didx + 3] = 255;
            }
        }
    }
}

// Row 0 (West facings): Stand(col0), Walk step1(col1), Run gallop(col2), Hurt(col3), Death carcass(col4)
blitToScene(baseFacings[2], 0, 0); // Stand (West)
blitToScene(walkGrid[2][0], 1, 0); // Walk (West step)
blitToScene(workGrid[2][1], 2, 0); // Run leap (West)
blitToScene(hurtGrid[2], 3, 0);    // Hurt (West)
blitToScene(deathGrid[2][2], 4, 0); // Death carcass (West)

// Row 1 (South facings): Stand(col0), Walk step1(col1), Run gallop(col2), Hurt(col3), Death carcass(col4)
blitToScene(baseFacings[0], 0, 1); // Stand (South)
blitToScene(walkGrid[0][0], 1, 1); // Walk (South)
blitToScene(workGrid[0][1], 2, 1); // Run leap (South)
blitToScene(hurtGrid[0], 3, 1);    // Hurt (South)
blitToScene(deathGrid[0][2], 4, 1); // Death carcass (South)

// Upscale to 4x
const show4xW = showW * 4, show4xH = showH * 4;
const show4xBuf = Buffer.alloc(show4xW * show4xH * 4);
for (let y = 0; y < showH; y++) {
    for (let x = 0; x < showW; x++) {
        const sidx = (y * showW + x) * 4;
        for (let dy = 0; dy < 4; dy++) {
            for (let dx = 0; dx < 4; dx++) {
                const didx = ((y * 4 + dy) * show4xW + (x * 4 + dx)) * 4;
                show4xBuf[didx] = showBuf[sidx];
                show4xBuf[didx + 1] = showBuf[sidx + 1];
                show4xBuf[didx + 2] = showBuf[sidx + 2];
                show4xBuf[didx + 3] = 255;
            }
        }
    }
}
const show4xPath = path.join(reviewDir, 'deer_actions_showcase_4x.png');
writePNG(show4xPath, show4xW, show4xH, show4xBuf);
console.log(`Saved review showcase: ${show4xPath}`);

console.log('All deer action sheets built successfully!');
