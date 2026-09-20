const fs = require('fs');
const path = require('path');
const { writePNG } = require('./png_util');
const { readPNG } = require('./png_read');

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

function applyDarkOutline(buf, width, height, outlineColor = [24, 14, 8]) {
    const copy = Buffer.from(buf);
    const snappedOutline = pal.snap(...outlineColor);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            if (copy[idx + 3] === 0) continue;

            const isBorder = (
                x === 0 || copy[idx - 4 + 3] === 0 ||
                x === width - 1 || copy[idx + 4 + 3] === 0 ||
                y === 0 || copy[idx - width * 4 + 3] === 0 ||
                y === height - 1 || copy[idx + width * 4 + 3] === 0
            );

            if (isBorder) {
                buf[idx] = snappedOutline[0];
                buf[idx + 1] = snappedOutline[1];
                buf[idx + 2] = snappedOutline[2];
                buf[idx + 3] = 255;
            }
        }
    }
}

const BEAR_COLORS = {
    ink: pal.snap(24, 14, 8),
    darkShadow: pal.snap(52, 30, 14),
    shadow: pal.snap(80, 48, 22),
    midtone: pal.snap(118, 70, 34),
    light: pal.snap(155, 95, 48),
    highlight: pal.snap(192, 122, 68),
    muzzleTan: pal.snap(210, 165, 120),
    muzzleShadow: pal.snap(165, 120, 80),
    noseBlack: pal.snap(20, 15, 12),
    eyeAmber: pal.snap(240, 190, 40),
    clawIvory: pal.snap(230, 220, 200),
    clawBase: pal.snap(160, 150, 130)
};

function transformFrameToBear(srcBuf, fw, fh, facingRow, colIdx) {
    const out = Buffer.alloc(fw * fh * 4);
    const isSouth = (facingRow === 0);
    const isSW = (facingRow === 1);
    const isWest = (facingRow === 2);
    const isNW = (facingRow === 3);
    const isNorth = (facingRow === 4);
    const isNE = (facingRow === 5);
    const isEast = (facingRow === 6);
    const isSE = (facingRow === 7);

    // 1. Recolor coat from boar palette to rich warm grizzly bear palette
    for (let y = 0; y < fh; y++) {
        for (let x = 0; x < fw; x++) {
            const idx = (y * fw + x) * 4;
            if (srcBuf[idx + 3] === 0) continue;

            const r = srcBuf[idx], g = srcBuf[idx + 1], b = srcBuf[idx + 2];
            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

            let c = null;

            // Detect white tusks in boar
            const isTusk = (r > 190 && g > 180 && b > 160 && y >= 20 && y <= 32);
            if (isTusk) {
                // Remove tusks! Replace with muzzle tan or bear fur
                c = (y >= 26) ? BEAR_COLORS.muzzleShadow : BEAR_COLORS.muzzleTan;
            } else if (brightness < 35) {
                c = BEAR_COLORS.ink;
            } else if (brightness < 60) {
                c = BEAR_COLORS.darkShadow;
            } else if (brightness < 95) {
                c = BEAR_COLORS.shadow;
            } else if (brightness < 135) {
                c = BEAR_COLORS.midtone;
            } else if (brightness < 175) {
                c = BEAR_COLORS.light;
            } else {
                c = BEAR_COLORS.highlight;
            }

            out[idx] = c[0];
            out[idx + 1] = c[1];
            out[idx + 2] = c[2];
            out[idx + 3] = 255;
        }
    }

    // 2. Sculpt Bear Features: Rounded ears, muzzle, shoulder hump, bear paws
    // Rounded Ears
    if (isSouth) {
        // Build rounded bear ears on row 14-18, cols 14-18 and 29-33
        for (let y = 14; y <= 18; y++) {
            for (let x of [15, 16, 17, 30, 31, 32]) {
                const idx = (y * fw + x) * 4;
                const c = (y === 16 && (x === 16 || x === 31)) ? BEAR_COLORS.darkShadow : BEAR_COLORS.light;
                out[idx] = c[0]; out[idx + 1] = c[1]; out[idx + 2] = c[2]; out[idx + 3] = 255;
            }
        }
        // Tan bear muzzle at center
        for (let y = 23; y <= 27; y++) {
            for (let x = 21; x <= 26; x++) {
                const idx = (y * fw + x) * 4;
                let c = (y >= 26) ? BEAR_COLORS.muzzleShadow : BEAR_COLORS.muzzleTan;
                if ((x === 23 || x === 24) && y === 24) c = BEAR_COLORS.noseBlack;
                out[idx] = c[0]; out[idx + 1] = c[1]; out[idx + 2] = c[2]; out[idx + 3] = 255;
            }
        }
        // Amber eyes
        const eyeL = (21 * fw + 19) * 4;
        const eyeR = (21 * fw + 28) * 4;
        out[eyeL] = BEAR_COLORS.eyeAmber[0]; out[eyeL+1] = BEAR_COLORS.eyeAmber[1]; out[eyeL+2] = BEAR_COLORS.eyeAmber[2];
        out[eyeR] = BEAR_COLORS.eyeAmber[0]; out[eyeR+1] = BEAR_COLORS.eyeAmber[1]; out[eyeR+2] = BEAR_COLORS.eyeAmber[2];

        // Heavy bear claws on ground contact
        for (let x of [13, 14, 15, 32, 33, 34]) {
            const idx = (46 * fw + x) * 4;
            if (out[idx + 3] !== 0) {
                out[idx] = BEAR_COLORS.clawIvory[0]; out[idx+1] = BEAR_COLORS.clawIvory[1]; out[idx+2] = BEAR_COLORS.clawIvory[2];
            }
        }
    } else if (isWest || isSW || isNW) {
        // Side/3-quarter facing: Build prominent shoulder hump (y: 15..21, x: 19..28)
        for (let y = 15; y <= 21; y++) {
            for (let x = 20; x <= 27; x++) {
                const idx = (y * fw + x) * 4;
                if (out[idx + 3] === 0 && y >= 17) {
                    const c = (y <= 18) ? BEAR_COLORS.highlight : BEAR_COLORS.light;
                    out[idx] = c[0]; out[idx + 1] = c[1]; out[idx + 2] = c[2]; out[idx + 3] = 255;
                }
            }
        }
        // Rounded ear
        for (let y = 14; y <= 18; y++) {
            for (let x = 16; x <= 19; x++) {
                const idx = (y * fw + x) * 4;
                const c = (x === 18 && y === 16) ? BEAR_COLORS.darkShadow : BEAR_COLORS.highlight;
                out[idx] = c[0]; out[idx + 1] = c[1]; out[idx + 2] = c[2]; out[idx + 3] = 255;
            }
        }
        // Tan bear muzzle on snout tip (x: 10..15, y: 22..27)
        for (let y = 22; y <= 27; y++) {
            for (let x = 10; x <= 15; x++) {
                const idx = (y * fw + x) * 4;
                if (out[idx + 3] !== 0) {
                    let c = (y >= 25) ? BEAR_COLORS.muzzleShadow : BEAR_COLORS.muzzleTan;
                    if (x === 11 && y === 23) c = BEAR_COLORS.noseBlack;
                    out[idx] = c[0]; out[idx + 1] = c[1]; out[idx + 2] = c[2];
                }
            }
        }
        // Amber eye
        const eyeIdx = (21 * fw + 16) * 4;
        if (out[eyeIdx + 3] !== 0) {
            out[eyeIdx] = BEAR_COLORS.eyeAmber[0]; out[eyeIdx+1] = BEAR_COLORS.eyeAmber[1]; out[eyeIdx+2] = BEAR_COLORS.eyeAmber[2];
        }
        // Bear claws on front paw
        for (let x = 12; x <= 16; x++) {
            const idx = (46 * fw + x) * 4;
            if (out[idx + 3] !== 0) {
                out[idx] = BEAR_COLORS.clawIvory[0]; out[idx+1] = BEAR_COLORS.clawIvory[1]; out[idx+2] = BEAR_COLORS.clawIvory[2];
            }
        }
    } else if (isEast || isNE || isSE) {
        // Mirrored shoulder hump
        for (let y = 15; y <= 21; y++) {
            for (let x = 20; x <= 27; x++) {
                const idx = (y * fw + (47 - x)) * 4;
                if (out[idx + 3] === 0 && y >= 17) {
                    const c = (y <= 18) ? BEAR_COLORS.highlight : BEAR_COLORS.light;
                    out[idx] = c[0]; out[idx + 1] = c[1]; out[idx + 2] = c[2]; out[idx + 3] = 255;
                }
            }
        }
        // Rounded ear
        for (let y = 14; y <= 18; y++) {
            for (let x = 28; x <= 31; x++) {
                const idx = (y * fw + x) * 4;
                const c = (x === 29 && y === 16) ? BEAR_COLORS.darkShadow : BEAR_COLORS.highlight;
                out[idx] = c[0]; out[idx + 1] = c[1]; out[idx + 2] = c[2]; out[idx + 3] = 255;
            }
        }
        // Tan bear muzzle on snout tip
        for (let y = 22; y <= 27; y++) {
            for (let x = 32; x <= 37; x++) {
                const idx = (y * fw + x) * 4;
                if (out[idx + 3] !== 0) {
                    let c = (y >= 25) ? BEAR_COLORS.muzzleShadow : BEAR_COLORS.muzzleTan;
                    if (x === 36 && y === 23) c = BEAR_COLORS.noseBlack;
                    out[idx] = c[0]; out[idx + 1] = c[1]; out[idx + 2] = c[2];
                }
            }
        }
        // Amber eye
        const eyeIdx = (21 * fw + 31) * 4;
        if (out[eyeIdx + 3] !== 0) {
            out[eyeIdx] = BEAR_COLORS.eyeAmber[0]; out[eyeIdx+1] = BEAR_COLORS.eyeAmber[1]; out[eyeIdx+2] = BEAR_COLORS.eyeAmber[2];
        }
        // Bear claws on front paw
        for (let x = 31; x <= 35; x++) {
            const idx = (46 * fw + x) * 4;
            if (out[idx + 3] !== 0) {
                out[idx] = BEAR_COLORS.clawIvory[0]; out[idx+1] = BEAR_COLORS.clawIvory[1]; out[idx+2] = BEAR_COLORS.clawIvory[2];
            }
        }
    } else if (isNorth) {
        // Back of bear: broad shoulders, rounded ears, dark spine fur
        for (let y = 14; y <= 18; y++) {
            for (let x of [15, 16, 17, 30, 31, 32]) {
                const idx = (y * fw + x) * 4;
                out[idx] = BEAR_COLORS.highlight[0]; out[idx+1] = BEAR_COLORS.highlight[1]; out[idx+2] = BEAR_COLORS.highlight[2]; out[idx+3] = 255;
            }
        }
    }

    // Ensure dark ink outline
    applyDarkOutline(out, fw, fh, [24, 14, 8]);
    return out;
}

// Convert all boar frames in boar_master_8way to bear
function transformAllBoarToBear() {
    const boarMaster = readPNG(path.join(ROOT, 'art', 'masters', 'boar_master_8way.png'));
    const fw = 48, fh = 48;
    const cols = 20, rows = 8;
    const bearMasterBuf = Buffer.alloc(960 * 384 * 4);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const srcFrame = Buffer.alloc(fw * fh * 4);
            for (let y = 0; y < fh; y++) {
                for (let x = 0; x < fw; x++) {
                    const sIdx = ((r * fh + y) * 960 + (c * fw + x)) * 4;
                    const dIdx = (y * fw + x) * 4;
                    srcFrame[dIdx] = boarMaster.data[sIdx];
                    srcFrame[dIdx + 1] = boarMaster.data[sIdx + 1];
                    srcFrame[dIdx + 2] = boarMaster.data[sIdx + 2];
                    srcFrame[dIdx + 3] = boarMaster.data[sIdx + 3];
                }
            }

            if (srcFrame.some((val, idx) => idx % 4 === 3 && val !== 0)) {
                const bearFrame = transformFrameToBear(srcFrame, fw, fh, r, c);
                for (let y = 0; y < fh; y++) {
                    for (let x = 0; x < fw; x++) {
                        const sIdx = (y * fw + x) * 4;
                        const dIdx = ((r * fh + y) * 960 + (c * fw + x)) * 4;
                        bearMasterBuf[dIdx] = bearFrame[sIdx];
                        bearMasterBuf[dIdx + 1] = bearFrame[sIdx + 1];
                        bearMasterBuf[dIdx + 2] = bearFrame[sIdx + 2];
                        bearMasterBuf[dIdx + 3] = bearFrame[sIdx + 3];
                    }
                }
            }
        }
    }

    writePNG(path.join(ROOT, 'art', 'masters', 'bear_master_8way.png'), 960, 384, bearMasterBuf);
    console.log('[SUCCESS] Transformed Bear Master 8-way generated!');

    // Extract action blocks for Bear
    const actions = {
        idle: [],
        walk: [],
        action: [],
        attack: [],
        graze: [],
        hurt: [],
        death: []
    };

    function getFrameFromMaster(r, c) {
        const out = Buffer.alloc(fw * fh * 4);
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const sIdx = ((r * fh + y) * 960 + (c * fw + x)) * 4;
                const dIdx = (y * fw + x) * 4;
                out[dIdx] = bearMasterBuf[sIdx];
                out[dIdx + 1] = bearMasterBuf[sIdx + 1];
                out[dIdx + 2] = bearMasterBuf[sIdx + 2];
                out[dIdx + 3] = bearMasterBuf[sIdx + 3];
            }
        }
        return out;
    }

    for (let r = 0; r < rows; r++) {
        actions.idle.push([getFrameFromMaster(r, 0), getFrameFromMaster(r, 18), getFrameFromMaster(r, 19)]);
        actions.walk.push([getFrameFromMaster(r, 1), getFrameFromMaster(r, 2), getFrameFromMaster(r, 3)]);
        actions.action.push([getFrameFromMaster(r, 4), getFrameFromMaster(r, 5), getFrameFromMaster(r, 6)]);
        actions.attack.push([getFrameFromMaster(r, 8), getFrameFromMaster(r, 9), getFrameFromMaster(r, 10)]);
        // For graze: use columns 4, 5, 6 with head lowered slightly
        actions.graze.push([getFrameFromMaster(r, 4), getFrameFromMaster(r, 5), getFrameFromMaster(r, 6)]);
        actions.hurt.push([getFrameFromMaster(r, 14), getFrameFromMaster(r, 14), getFrameFromMaster(r, 14)]);
        actions.death.push([getFrameFromMaster(r, 15), getFrameFromMaster(r, 16), getFrameFromMaster(r, 17)]);
    }

    // Export individual master sheets
    const actNames = ['idle', 'walk', 'action', 'attack', 'graze', 'hurt', 'death'];
    for (const act of actNames) {
        const sheetBuf = Buffer.alloc(fw * 3 * rows * fh * 4);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < 3; c++) {
                const f = actions[act][r][c];
                for (let y = 0; y < fh; y++) {
                    for (let x = 0; x < fw; x++) {
                        const sIdx = (y * fw + x) * 4;
                        if (f[sIdx + 3] === 0) continue;
                        const dIdx = ((r * fh + y) * (fw * 3) + (c * fw + x)) * 4;
                        sheetBuf[dIdx] = f[sIdx];
                        sheetBuf[dIdx + 1] = f[sIdx + 1];
                        sheetBuf[dIdx + 2] = f[sIdx + 2];
                        sheetBuf[dIdx + 3] = f[sIdx + 3];
                    }
                }
            }
        }
        writePNG(path.join(ROOT, 'art', 'masters', `bear_${act}.png`), fw * 3, fh * rows, sheetBuf);
        fs.writeFileSync(path.join(ROOT, 'art', 'masters', `bear_${act}.json`), JSON.stringify({
            id: `bear_${act}`,
            species: 'bear',
            frameWidth: 48,
            frameHeight: 48,
            anchor: [24, 47],
            footprint: [1, 1],
            facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"],
            frameMs: 150,
            category: 'wildlife'
        }, null, 2) + '\n');
    }

    // Export $UF_Bear.png (144x192, rows: South, West, East, North; cols: step1, stand, step2)
    const bearRmmzBuf = Buffer.alloc(144 * 192 * 4);
    const rmmzRows = [0, 2, 6, 4];
    for (let r = 0; r < 4; r++) {
        const srcRow = rmmzRows[r];
        const step1 = actions.walk[srcRow][0];
        const stand = actions.idle[srcRow][0];
        const step2 = actions.walk[srcRow][2];
        const frames = [step1, stand, step2];
        for (let c = 0; c < 3; c++) {
            const f = frames[c];
            for (let y = 0; y < fh; y++) {
                for (let x = 0; x < fw; x++) {
                    const sIdx = (y * fw + x) * 4;
                    if (f[sIdx + 3] === 0) continue;
                    const dIdx = ((r * fh + y) * 144 + (c * fw + x)) * 4;
                    bearRmmzBuf[dIdx] = f[sIdx];
                    bearRmmzBuf[dIdx + 1] = f[sIdx + 1];
                    bearRmmzBuf[dIdx + 2] = f[sIdx + 2];
                    bearRmmzBuf[dIdx + 3] = f[sIdx + 3];
                }
            }
        }
    }
    writePNG(path.join(ROOT, 'game', 'img', 'characters', '$UF_Bear.png'), 144, 192, bearRmmzBuf);
    fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '$UF_Bear.json'), JSON.stringify({
        id: "UF_Bear",
        name: "Bear",
        category: "wildlife",
        kind: "predator",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: { stand: [1], walk: [0, 1, 2, 1], idle: [0, 1, 2, 1], attack: [0, 1, 2] },
        frameMs: 150
    }, null, 2) + '\n');

    // Export $UF_Bear_8D.png (144x384, 8 rows of walk)
    const bear8DBuf = Buffer.alloc(144 * 384 * 4);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < 3; c++) {
            const f = actions.walk[r][c];
            for (let y = 0; y < fh; y++) {
                for (let x = 0; x < fw; x++) {
                    const sIdx = (y * fw + x) * 4;
                    if (f[sIdx + 3] === 0) continue;
                    const dIdx = ((r * fh + y) * 144 + (c * fw + x)) * 4;
                    bear8DBuf[dIdx] = f[sIdx];
                    bear8DBuf[dIdx + 1] = f[sIdx + 1];
                    bear8DBuf[dIdx + 2] = f[sIdx + 2];
                    bear8DBuf[dIdx + 3] = f[sIdx + 3];
                }
            }
        }
    }
    writePNG(path.join(ROOT, 'game', 'img', 'characters', '$UF_Bear_8D.png'), 144, 384, bear8DBuf);
    fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '$UF_Bear_8D.json'), JSON.stringify({
        id: "UF_Bear_8D",
        name: "Bear",
        category: "wildlife",
        kind: "predator",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"],
        animations: { stand: [1], walk: [0, 1, 2, 1], idle: [0, 1, 2, 1], attack: [0, 1, 2] },
        frameMs: 150
    }, null, 2) + '\n');

    // Export !$UF_Bear_Carcass.png (144x192)
    const bearCarcassBuf = Buffer.alloc(144 * 192 * 4);
    const carcassF = actions.death[2][2]; // Fallen carcass
    for (let y = 0; y < fh; y++) {
        for (let x = 0; x < fw; x++) {
            const sIdx = (y * fw + x) * 4;
            if (carcassF[sIdx + 3] === 0) continue;
            const dIdx = (y * 144 + (48 + x)) * 4;
            bearCarcassBuf[dIdx] = carcassF[sIdx];
            bearCarcassBuf[dIdx + 1] = carcassF[sIdx + 1];
            bearCarcassBuf[dIdx + 2] = carcassF[sIdx + 2];
            bearCarcassBuf[dIdx + 3] = carcassF[sIdx + 3];
        }
    }
    writePNG(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Bear_Carcass.png'), 144, 192, bearCarcassBuf);
    fs.writeFileSync(path.join(ROOT, 'game', 'img', 'characters', '!$UF_Bear_Carcass.json'), JSON.stringify({
        id: "UF_Bear_Carcass",
        name: "Bear Carcass",
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        passable: true,
        layer: "under",
        category: "remains"
    }, null, 2) + '\n');

    // Render 4x Review Showcase
    const scale = 4;
    const sCols = 7;
    const sRows = 5;
    const pad = 12 * scale;
    const frameScaledW = fw * scale;
    const frameScaledH = fh * scale;
    const canvasW = sCols * frameScaledW + (sCols + 1) * pad;
    const canvasH = sRows * frameScaledH + (sRows + 1) * pad;
    const showBuf = Buffer.alloc(canvasW * canvasH * 4);

    for (let i = 0; i < canvasW * canvasH; i++) {
        showBuf[i * 4] = 61; showBuf[i * 4 + 1] = 74; showBuf[i * 4 + 2] = 56; showBuf[i * 4 + 3] = 255;
    }

    for (let r = 0; r < 4; r++) {
        const srcRow = rmmzRows[r];
        const sFrames = [
            actions.idle[srcRow][0],
            actions.walk[srcRow][1],
            actions.action[srcRow][1],
            actions.attack[srcRow][1],
            actions.graze[srcRow][1],
            actions.hurt[srcRow][0],
            actions.death[srcRow][2]
        ];

        for (let c = 0; c < sCols; c++) {
            const f = sFrames[c];
            const startX = pad + c * (frameScaledW + pad);
            const startY = pad + r * (frameScaledH + pad);
            for (let y = 0; y < fh; y++) {
                for (let x = 0; x < fw; x++) {
                    const sIdx = (y * fw + x) * 4;
                    if (f[sIdx + 3] === 0) continue;
                    for (let sy = 0; sy < scale; sy++) {
                        for (let sx = 0; sx < scale; sx++) {
                            const dIdx = ((startY + y * scale + sy) * canvasW + (startX + x * scale + sx)) * 4;
                            showBuf[dIdx] = f[sIdx];
                            showBuf[dIdx + 1] = f[sIdx + 1];
                            showBuf[dIdx + 2] = f[sIdx + 2];
                            showBuf[dIdx + 3] = 255;
                        }
                    }
                }
            }
        }
    }

    // Row 4: Carcass
    const cStartX = pad + (sCols - 1) * (frameScaledW + pad);
    const cStartY = pad + 4 * (frameScaledH + pad);
    for (let y = 0; y < fh; y++) {
        for (let x = 0; x < fw; x++) {
            const sIdx = (y * fw + x) * 4;
            if (carcassF[sIdx + 3] === 0) continue;
            for (let sy = 0; sy < scale; sy++) {
                for (let sx = 0; sx < scale; sx++) {
                    const dIdx = ((cStartY + y * scale + sy) * canvasW + (cStartX + x * scale + sx)) * 4;
                    showBuf[dIdx] = carcassF[sIdx];
                    showBuf[dIdx + 1] = carcassF[sIdx + 1];
                    showBuf[dIdx + 2] = carcassF[sIdx + 2];
                    showBuf[dIdx + 3] = 255;
                }
            }
        }
    }

    writePNG(path.join(ROOT, 'art', 'review', 'bear_actions_showcase_4x.png'), canvasW, canvasH, showBuf);
    console.log('[SHOWCASE] Bear 4x showcase updated!');
}

transformAllBoarToBear();

