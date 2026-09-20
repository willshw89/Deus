const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
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
    const lab = unique.map(c => srgbToLab(...c));
    const cache = new Map();
    return {
        colors: unique,
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
const C_DARK_OUTLINE = pal.snap(24, 16, 10);
const C_STEEL_WHITE = pal.snap(245, 245, 255);
const C_STEEL_MID = pal.snap(170, 180, 195);
const C_STEEL_DARK = pal.snap(80, 90, 105);
const C_BLOOD_RED = pal.snap(180, 30, 20);
const C_MAGIC_CYAN = pal.snap(120, 220, 255);
const C_MAGIC_GLOW = pal.snap(200, 245, 255);

function applyDarkOutline(buf, w, h) {
    const isOpaque = (x, y) => {
        if (x < 0 || x >= w || y < 0 || y >= h) return false;
        return buf[(y * w + x) * 4 + 3] > 0;
    };

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            if (buf[idx + 3] === 0) continue;

            let border = false;
            for (let dy = -1; dy <= 1 && !border; dy++) {
                for (let dx = -1; dx <= 1 && !border; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    if (!isOpaque(x + dx, y + dy)) border = true;
                }
            }

            if (border) {
                const r = buf[idx], g = buf[idx + 1], b = buf[idx + 2];
                const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                // Preserve bright specular blade glints & magic glows
                if (lum < 175 && !(r < 150 && g > 200 && b > 230)) {
                    buf[idx] = C_DARK_OUTLINE[0];
                    buf[idx + 1] = C_DARK_OUTLINE[1];
                    buf[idx + 2] = C_DARK_OUTLINE[2];
                }
            }
        }
    }
}

function quantizeSheet(buf, w, h, maxColors = 31) {
    const counts = new Map();
    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 0) continue;
        const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
        counts.set(k, (counts.get(k) || 0) + 1);
    }
    if (counts.size <= maxColors) return;

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const keptKeys = sorted.slice(0, maxColors).map(e => e[0]);
    const keptRgb = keptKeys.map(k => [(k >> 16) & 255, (k >> 8) & 255, k & 255]);
    const keptLab = keptRgb.map(c => srgbToLab(...c));

    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 0) continue;
        const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
        if (keptKeys.includes(k)) continue;

        const curLab = srgbToLab(buf[i], buf[i + 1], buf[i + 2]);
        let best = keptRgb[0], bd = Infinity;
        for (let j = 0; j < keptLab.length; j++) {
            const d = labDist(curLab, keptLab[j]);
            if (d < bd) { bd = d; best = keptRgb[j]; }
        }
        buf[i] = best[0];
        buf[i + 1] = best[1];
        buf[i + 2] = best[2];
    }
}

// Mirror 48x48 frame horizontally
function mirrorFrame(frame) {
    const out = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            const dIdx = (y * 48 + (47 - x)) * 4;
            out[dIdx] = frame[sIdx];
            out[dIdx + 1] = frame[sIdx + 1];
            out[dIdx + 2] = frame[sIdx + 2];
            out[dIdx + 3] = frame[sIdx + 3];
        }
    }
    return out;
}

// Blend two frames for diagonal 3/4 facing (e.g. S + W -> SW)
function blendDiagonals(fA, fB) {
    const out = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const idx = (y * 48 + x) * 4;
            const opA = fA[idx + 3] > 0;
            const opB = fB[idx + 3] > 0;
            if (opA && opB) {
                // Bias slightly towards side profile for clear 3/4 turn
                const r = Math.round((fA[idx] * 0.45) + (fB[idx] * 0.55));
                const g = Math.round((fA[idx + 1] * 0.45) + (fB[idx + 1] * 0.55));
                const b = Math.round((fA[idx + 2] * 0.45) + (fB[idx + 2] * 0.55));
                const s = pal.snap(r, g, b);
                out[idx] = s[0]; out[idx + 1] = s[1]; out[idx + 2] = s[2]; out[idx + 3] = 255;
            } else if (opB) {
                out[idx] = fB[idx]; out[idx + 1] = fB[idx + 1]; out[idx + 2] = fB[idx + 2]; out[idx + 3] = 255;
            } else if (opA) {
                out[idx] = fA[idx]; out[idx + 1] = fA[idx + 1]; out[idx + 2] = fA[idx + 2]; out[idx + 3] = 255;
            }
        }
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

// Shift frame by dx, dy
function shiftFrame(frame, dx, dy) {
    const out = Buffer.alloc(48 * 48 * 4);
    for (let y = 0; y < 48; y++) {
        const ty = y + dy;
        if (ty < 0 || ty >= 48) continue;
        for (let x = 0; x < 48; x++) {
            const tx = x + dx;
            if (tx < 0 || tx >= 48) continue;
            const sIdx = (y * 48 + x) * 4;
            if (frame[sIdx + 3] > 0) {
                const dIdx = (ty * 48 + tx) * 4;
                out[dIdx] = frame[sIdx];
                out[dIdx + 1] = frame[sIdx + 1];
                out[dIdx + 2] = frame[sIdx + 2];
                out[dIdx + 3] = frame[sIdx + 3];
            }
        }
    }
    return out;
}

// Synthesize Attack Strike Frame (windup, strike, recovery)
function synthesizeAttack(baseFrame, facing, phase) {
    const out = Buffer.alloc(48 * 48 * 4);
    
    // Facing directions vectors for attack lunge
    const fv = {
        S:  { dx: 0, dy: 3 },
        SW: { dx: -3, dy: 2 },
        W:  { dx: -3, dy: 0 },
        NW: { dx: -2, dy: -2 },
        N:  { dx: 0, dy: -3 },
        NE: { dx: 2, dy: -2 },
        E:  { dx: 3, dy: 0 },
        SE: { dx: 3, dy: 2 }
    }[facing];

    if (phase === 0) {
        // Windup: ready attack coil (pulled back slightly, weapon raised)
        const coil = shiftFrame(baseFrame, -Math.sign(fv.dx) * 2, -Math.sign(fv.dy));
        coil.copy(out);
    } else if (phase === 1) {
        // Dynamic strike: lunge forward + heroic sword strike & slash arc
        const lunge = shiftFrame(baseFrame, fv.dx, fv.dy);
        lunge.copy(out);

        // Hand anchor positions by facing
        const handPos = {
            S:  { x: 28, y: 31 },
            SW: { x: 19, y: 31 },
            W:  { x: 18, y: 29 },
            NW: { x: 19, y: 27 },
            N:  { x: 27, y: 25 },
            NE: { x: 29, y: 27 },
            E:  { x: 30, y: 29 },
            SE: { x: 29, y: 31 }
        }[facing];

        const hx = handPos.x + fv.dx;
        const hy = handPos.y + fv.dy;

        // Draw steel sword blade with metallic glint
        const bladeDir = {
            S:  { dx: 1, dy: 2, len: 12 },
            SW: { dx: -2, dy: 1, len: 12 },
            W:  { dx: -2, dy: 0, len: 13 },
            NW: { dx: -2, dy: -1, len: 11 },
            N:  { dx: 1, dy: -2, len: 12 },
            NE: { dx: 2, dy: -1, len: 11 },
            E:  { dx: 2, dy: 0, len: 13 },
            SE: { dx: 2, dy: 1, len: 12 }
        }[facing];

        for (let i = 1; i <= bladeDir.len; i++) {
            const bx = hx + Math.round((bladeDir.dx * i) / 2);
            const by = hy + Math.round((bladeDir.dy * i) / 2);
            if (bx >= 1 && bx < 47 && by >= 1 && by < 47) {
                const bIdx = (by * 48 + bx) * 4;
                const col = (i === bladeDir.len || i % 3 === 0) ? C_STEEL_WHITE : C_STEEL_MID;
                out[bIdx] = col[0]; out[bIdx + 1] = col[1]; out[bIdx + 2] = col[2]; out[bIdx + 3] = 255;
                // Add cross thickness on blade core
                const cx = bx + (bladeDir.dy !== 0 ? 1 : 0);
                const cy = by + (bladeDir.dx !== 0 ? 1 : 0);
                if (cx >= 1 && cx < 47 && cy >= 1 && cy < 47 && i > 2 && i < bladeDir.len - 1) {
                    const cIdx = (cy * 48 + cx) * 4;
                    out[cIdx] = C_STEEL_MID[0]; out[cIdx + 1] = C_STEEL_MID[1]; out[cIdx + 2] = C_STEEL_MID[2]; out[cIdx + 3] = 255;
                }
            }
        }

        // Draw dynamic slash arc curving in front of strike
        const tipX = hx + Math.round(bladeDir.dx * bladeDir.len / 2);
        const tipY = hy + Math.round(bladeDir.dy * bladeDir.len / 2);
        const arcOffsets = [
            { x: -1, y: -2 }, { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 2 }
        ];
        for (const ao of arcOffsets) {
            const ax = tipX + (facing.includes('W') ? -ao.x : ao.x);
            const ay = tipY + ao.y;
            if (ax >= 1 && ax < 47 && ay >= 1 && ay < 47) {
                const aIdx = (ay * 48 + ax) * 4;
                out[aIdx] = C_STEEL_WHITE[0]; out[aIdx + 1] = C_STEEL_WHITE[1]; out[aIdx + 2] = C_STEEL_WHITE[2]; out[aIdx + 3] = 255;
            }
        }
    } else {
        // Recovery: battle-ready grounded recovery
        baseFrame.copy(out);
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

// Synthesize Work Frame (windup, chop stroke, follow-through)
function synthesizeWork(baseFrame, facing, phase) {
    const out = Buffer.alloc(48 * 48 * 4);
    if (phase === 0) {
        // Tool raise
        const shifted = shiftFrame(baseFrame, 0, -2);
        shifted.copy(out);
    } else if (phase === 1) {
        // Downward chop
        const shifted = shiftFrame(baseFrame, (facing === 'W' || facing === 'SW') ? -2 : (facing === 'E' || facing === 'SE') ? 2 : 0, 1);
        shifted.copy(out);
    } else {
        baseFrame.copy(out);
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

// Synthesize Cast Frame (gather, surge, channel)
function synthesizeCast(baseFrame, facing, phase) {
    const out = Buffer.alloc(48 * 48 * 4);
    if (phase === 0) {
        // Gather magic: arms raised to chest with mystical mana orb
        const shifted = shiftFrame(baseFrame, 0, -1);
        shifted.copy(out);
        const cx = 24, cy = 27;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const idx = ((cy + dy) * 48 + (cx + dx)) * 4;
                out[idx] = (dx === 0 && dy === 0) ? C_MAGIC_GLOW[0] : C_MAGIC_CYAN[0];
                out[idx + 1] = (dx === 0 && dy === 0) ? C_MAGIC_GLOW[1] : C_MAGIC_CYAN[1];
                out[idx + 2] = (dx === 0 && dy === 0) ? C_MAGIC_GLOW[2] : C_MAGIC_CYAN[2];
                out[idx + 3] = 255;
            }
        }
    } else if (phase === 1) {
        // Release burst: hands thrust forward releasing brilliant magic surge
        const shifted = shiftFrame(baseFrame, 0, -1);
        shifted.copy(out);
        const pts = [
            { x: 23, y: 25 }, { x: 25, y: 25 }, { x: 24, y: 24 }, { x: 24, y: 26 },
            { x: 21, y: 25 }, { x: 27, y: 25 }, { x: 24, y: 22 }, { x: 24, y: 28 },
            { x: 20, y: 24 }, { x: 28, y: 24 }, { x: 22, y: 28 }, { x: 26, y: 28 }
        ];
        for (const pt of pts) {
            if (pt.x >= 0 && pt.x < 48 && pt.y >= 0 && pt.y < 48) {
                const idx = (pt.y * 48 + pt.x) * 4;
                out[idx] = C_MAGIC_GLOW[0]; out[idx + 1] = C_MAGIC_GLOW[1]; out[idx + 2] = C_MAGIC_GLOW[2]; out[idx + 3] = 255;
            }
        }
    } else {
        baseFrame.copy(out);
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

// Synthesize Hurt Frame (recoil flinch)
function synthesizeHurt(baseFrame, facing) {
    const out = Buffer.alloc(48 * 48 * 4);
    const revX = (facing === 'W' || facing === 'SW' || facing === 'NW') ? 2 :
                 (facing === 'E' || facing === 'SE' || facing === 'NE') ? -2 : 0;
    const revY = (facing === 'S' || facing === 'SW' || facing === 'SE') ? -1 : 1;
    const shifted = shiftFrame(baseFrame, revX, revY);
    shifted.copy(out);

    // Flinch pain flash
    for (let y = 20; y < 32; y++) {
        for (let x = 18; x < 30; x++) {
            const idx = (y * 48 + x) * 4;
            if (out[idx + 3] > 0 && (x + y) % 4 === 0) {
                out[idx] = C_BLOOD_RED[0]; out[idx + 1] = C_BLOOD_RED[1]; out[idx + 2] = C_BLOOD_RED[2];
            }
        }
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

// Synthesize Death Animation:
// phase 0: mortal blow stagger
// phase 1: kneel/collapse (knees touching ground, torso bent, head bowed)
// phase 2: organic fallen remains lying prone horizontally on ground
function synthesizeDeath(baseFrame, phase, facing) {
    const out = Buffer.alloc(48 * 48 * 4);
    if (phase === 0) {
        // Mortal stagger: tilted back and sinking
        const stagger = shiftFrame(baseFrame, (facing === 'W' ? 2 : facing === 'E' ? -2 : 0), 2);
        stagger.copy(out);
    } else if (phase === 1) {
        // Dedicated Kneeling Collapse:
        // Torso drops down to row 30..41, knees bent firmly on row 42..47
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = (y * 48 + x) * 4;
                if (baseFrame[sIdx + 3] > 0) {
                    let ty;
                    if (y < 22) {
                        // Head drops from 12..21 down to 24..31
                        ty = 24 + Math.round((y - 12) * 0.7);
                    } else if (y < 35) {
                        // Torso compresses into rows 32..40
                        ty = 32 + Math.round((y - 22) * 0.65);
                    } else {
                        // Legs/knees folded under on rows 41..47
                        ty = 41 + Math.round((y - 35) * 0.5);
                    }
                    if (ty >= 0 && ty < 48) {
                        const dIdx = (ty * 48 + x) * 4;
                        out[dIdx] = baseFrame[sIdx];
                        out[dIdx + 1] = baseFrame[sIdx + 1];
                        out[dIdx + 2] = baseFrame[sIdx + 2];
                        out[dIdx + 3] = 255;
                    }
                }
            }
        }
    } else {
        // Phase 2: Organic Fallen Prone Remains on rows 42..47
        // Dignified horizontal resting pose:
        // Head with hair on left, tunic draped over chest, dark trousers, leather boots on right
        const flip = (facing === 'W' || facing === 'NW' || facing === 'SW');
        const startX = flip ? 8 : 10;
        
        const c_hair = pal.snap(109, 61, 12);
        const c_hair_hi = pal.snap(138, 93, 45);
        const c_skin = pal.snap(227, 194, 178);
        const c_tunic = pal.snap(202, 178, 146);
        const c_tunic_hi = pal.snap(235, 227, 215);
        const c_vest = pal.snap(115, 68, 25);
        const c_belt = pal.snap(97, 49, 0);
        const c_pants = pal.snap(61, 45, 36);
        const c_boots = pal.snap(45, 28, 8);

        const setP = (x, y, c) => {
            if (x >= 0 && x < 48 && y >= 0 && y < 48) {
                const idx = (y * 48 + x) * 4;
                out[idx] = c[0]; out[idx + 1] = c[1]; out[idx + 2] = c[2]; out[idx + 3] = 255;
            }
        };

        // 30px wide corpse silhouette from dx = 0 to 29
        for (let dx = 0; dx < 30; dx++) {
            const px = flip ? (startX + 29 - dx) : (startX + dx);
            // Dynamic thickness: head ~5px high, chest ~6px, waist ~5px, legs ~4px, boots ~5px
            const h = (dx < 7) ? 5 : (dx < 17) ? 6 : (dx < 20) ? 5 : (dx < 25) ? 4 : 5;
            const topY = 48 - h;

            for (let y = topY; y < 48; y++) {
                const dy = y - topY;
                let col;
                if (dx < 7) {
                    // Head
                    if (y === topY || y === 47 || dx === 0) col = C_DARK_OUTLINE;
                    else if (dy === 1) col = c_hair_hi;
                    else if (dy === 2) col = c_hair;
                    else col = c_skin;
                } else if (dx < 17) {
                    // Torso & Vest
                    if (y === topY || y === 47) col = C_DARK_OUTLINE;
                    else if (dy === 1) col = c_tunic_hi;
                    else if (dy === 2) col = c_vest;
                    else col = c_tunic;
                } else if (dx < 19) {
                    // Belt & buckle
                    col = (dy === 2) ? pal.snap(186, 154, 113) : c_belt;
                } else if (dx < 25) {
                    // Trousers
                    if (y === topY || y === 47) col = C_DARK_OUTLINE;
                    else col = c_pants;
                } else {
                    // Cuffed Boots
                    if (y === topY || y === 47 || dx === 29) col = C_DARK_OUTLINE;
                    else col = c_boots;
                }
                setP(px, y, col);
            }
        }
    }
    applyDarkOutline(out, 48, 48);
    return out;
}

// Synthesize Idle Frame (inhale, exhale) without any gap line
function synthesizeIdle(baseFrame, phase) {
    const out = Buffer.alloc(48 * 48 * 4);
    baseFrame.copy(out); // Base copy guarantees no transparent gap!

    if (phase === 0) {
        // Inhale: 1px chest and head lift on rows 10..34
        for (let y = 10; y <= 34; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = (y * 48 + x) * 4;
                if (baseFrame[sIdx + 3] > 0) {
                    const dIdx = ((y - 1) * 48 + x) * 4;
                    out[dIdx] = baseFrame[sIdx];
                    out[dIdx + 1] = baseFrame[sIdx + 1];
                    out[dIdx + 2] = baseFrame[sIdx + 2];
                    out[dIdx + 3] = 255;
                }
            }
        }
    }
    applyDarkOutline(out, 48, 48);
    return out;
}


console.log('Helpers defined.');

// --- Main Assembly ---
function run() {
    console.log('Loading source frames from scratch/peasant_48_test.png...');
    const srcBuf = fs.readFileSync(path.join(ROOT, 'scratch', 'peasant_48_test.png'));
    const src = decodePNG(srcBuf);

    // Extract 48x48 frame at (row, col) with +2px Y shift so boots sit on row 47
    function getCardFrame(r, c) {
        const frame = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            const ty = y + 2; // Shift +2px down to row 47
            if (ty >= 48) continue;
            for (let x = 0; x < 48; x++) {
                const sIdx = (((r * 48 + y) * 144) + (c * 48 + x)) * 4;
                if (src.data[sIdx + 3] > 0) {
                    const dIdx = (ty * 48 + x) * 4;
                    frame[dIdx] = src.data[sIdx];
                    frame[dIdx + 1] = src.data[sIdx + 1];
                    frame[dIdx + 2] = src.data[sIdx + 2];
                    frame[dIdx + 3] = 255;
                }
            }
        }
        applyDarkOutline(frame, 48, 48);
        return frame;
    }

    // Cardinal walk frames: [StepL, Stand, StepR]
    // Row 0: South, Row 1: West, Row 2: East, Row 3: North
    const cWalk = {
        S: [getCardFrame(0, 0), getCardFrame(0, 1), getCardFrame(0, 2)],
        W: [getCardFrame(1, 0), getCardFrame(1, 1), getCardFrame(1, 2)],
        E: [getCardFrame(2, 0), getCardFrame(2, 1), getCardFrame(2, 2)],
        N: [getCardFrame(3, 0), getCardFrame(3, 1), getCardFrame(3, 2)]
    };

    // Diagonal walk frames (SW, NW, NE, SE)
    const dWalk = {
        SW: [blendDiagonals(cWalk.S[0], cWalk.W[0]), blendDiagonals(cWalk.S[1], cWalk.W[1]), blendDiagonals(cWalk.S[2], cWalk.W[2])],
        NW: [blendDiagonals(cWalk.N[0], cWalk.W[0]), blendDiagonals(cWalk.N[1], cWalk.W[1]), blendDiagonals(cWalk.N[2], cWalk.W[2])],
        NE: [mirrorFrame(blendDiagonals(cWalk.N[0], cWalk.W[0])), mirrorFrame(blendDiagonals(cWalk.N[1], cWalk.W[1])), mirrorFrame(blendDiagonals(cWalk.N[2], cWalk.W[2]))],
        SE: [mirrorFrame(blendDiagonals(cWalk.S[0], cWalk.W[0])), mirrorFrame(blendDiagonals(cWalk.S[1], cWalk.W[1])), mirrorFrame(blendDiagonals(cWalk.S[2], cWalk.W[2]))]
    };

    const FACINGS = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'];
    const walkByFacing = {
        S: cWalk.S, SW: dWalk.SW, W: cWalk.W, NW: dWalk.NW,
        N: cWalk.N, NE: dWalk.NE, E: cWalk.E, SE: dWalk.SE
    };

    // Allocate AR-600 buffer: 20 cols x 8 rows of 48x48 = 960 x 384
    const ar600Buf = Buffer.alloc(960 * 384 * 4);

    function setCell(c, r, frame) {
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sIdx = (y * 48 + x) * 4;
                if (frame[sIdx + 3] > 0) {
                    const dIdx = (((r * 48 + y) * 960) + (c * 48 + x)) * 4;
                    ar600Buf[dIdx] = frame[sIdx];
                    ar600Buf[dIdx + 1] = frame[sIdx + 1];
                    ar600Buf[dIdx + 2] = frame[sIdx + 2];
                    ar600Buf[dIdx + 3] = 255;
                }
            }
        }
    }

    console.log('Synthesizing 20 columns across 8 facings...');
    for (let r = 0; r < 8; r++) {
        const facing = FACINGS[r];
        const [stepL, stand, stepR] = walkByFacing[facing];

        // Col 0: Stand
        setCell(0, r, stand);

        // Cols 1, 2, 3: Walk with moving feet!
        setCell(1, r, stepL);
        setCell(2, r, stand);
        setCell(3, r, stepR);

        // Cols 4, 5, 6: Work (mine / chop / craft)
        setCell(4, r, synthesizeWork(stand, facing, 0));
        setCell(5, r, synthesizeWork(stand, facing, 1));
        setCell(6, r, synthesizeWork(stand, facing, 2));

        // Col 7: Stand (placeholder)
        setCell(7, r, stand);

        // Cols 8, 9, 10: Attack (fighting animations with strike & blade arc!)
        setCell(8, r, synthesizeAttack(stand, facing, 0));
        setCell(9, r, synthesizeAttack(stand, facing, 1));
        setCell(10, r, synthesizeAttack(stand, facing, 2));

        // Cols 11, 12, 13: Cast (magic surge & glow)
        setCell(11, r, synthesizeCast(stand, facing, 0));
        setCell(12, r, synthesizeCast(stand, facing, 1));
        setCell(13, r, synthesizeCast(stand, facing, 2));

        // Col 14: Hurt (defensive recoil)
        setCell(14, r, synthesizeHurt(stand, facing));

        // Cols 15, 16, 17: Death & Remains (stagger, collapse to knees, horizontal corpse)
        setCell(15, r, synthesizeDeath(stand, 0, facing));
        setCell(16, r, synthesizeDeath(stand, 1, facing));
        setCell(17, r, synthesizeDeath(stand, 2, facing));

        // Cols 18, 19: Idle (inhale rise, exhale relax)
        setCell(18, r, synthesizeIdle(stand, 0));
        setCell(19, r, synthesizeIdle(stand, 1));
    }

    quantizeSheet(ar600Buf, 960, 384, 31);

    const outPath = path.join(ROOT, 'scratch', 'male_ar600_test.png');
    writePNG(outPath, 960, 384, ar600Buf);
    console.log(`Saved AR-600 master to ${outPath}`);

    // Generate 4x showcase: Row 0 (S), Row 1 (SW), Row 2 (W), Row 4 (N)
    // showing Cols 0 (Stand), 1..3 (Walk), 8..10 (Attack), 14 (Hurt), 15..17 (Death), 18..19 (Idle)
    // 13 key columns x 4 rows at 4x scale = (13 * 48 * 4) x (4 * 48 * 4) = 2496 x 768
    const colsToShow = [0, 1, 2, 3, 8, 9, 10, 14, 15, 16, 17, 18, 19];
    const rowsToShow = [0, 1, 2, 4]; // S, SW, W, N
    const scW = colsToShow.length * 48 * 4;
    const scH = rowsToShow.length * 48 * 4;
    const scBuf = Buffer.alloc(scW * scH * 4);

    // Green background for contrast
    for (let i = 0; i < scBuf.length; i += 4) {
        scBuf[i] = 40; scBuf[i + 1] = 65; scBuf[i + 2] = 45; scBuf[i + 3] = 255;
    }

    for (let sri = 0; sri < rowsToShow.length; sri++) {
        const r = rowsToShow[sri];
        for (let sci = 0; sci < colsToShow.length; sci++) {
            const c = colsToShow[sci];
            const srcStartX = c * 48;
            const srcStartY = r * 48;
            const dstStartX = sci * 48 * 4;
            const dstStartY = sri * 48 * 4;

            for (let py = 0; py < 48; py++) {
                for (let px = 0; px < 48; px++) {
                    const sIdx = (((srcStartY + py) * 960) + (srcStartX + px)) * 4;
                    if (ar600Buf[sIdx + 3] > 0) {
                        for (let dy = 0; dy < 4; dy++) {
                            for (let dx = 0; dx < 4; dx++) {
                                const dIdx = (((dstStartY + py * 4 + dy) * scW) + (dstStartX + px * 4 + dx)) * 4;
                                scBuf[dIdx] = ar600Buf[sIdx];
                                scBuf[dIdx + 1] = ar600Buf[sIdx + 1];
                                scBuf[dIdx + 2] = ar600Buf[sIdx + 2];
                                scBuf[dIdx + 3] = 255;
                            }
                        }
                    }
                }
            }
        }
    }

    const scPath = path.join(ROOT, 'scratch', 'male_ar600_showcase_4x.png');
    writePNG(scPath, scW, scH, scBuf);
    console.log(`Saved 4x showcase to ${scPath}`);
}

run();

