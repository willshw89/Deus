const fs = require('fs');
const path = require('path');
const { writePNG } = require('./png_util');

const shapesPath = "C:\\Program Files\\GOG Galaxy\\Games\\Ultima 7\\STATIC\\SHAPES.VGA";
const palPath = "C:\\Program Files\\GOG Galaxy\\Games\\Ultima 7\\STATIC\\PALETTES.FLX";

const palBytes = fs.readFileSync(palPath);
const shapesBytes = fs.readFileSync(shapesPath);

// Daylight Palette (Record 0) with 6-bit DAC (0-63) scaled to true 8-bit RGB (0-255)
const pal = [];
for (let i = 0; i < 256; i++) {
    const r = Math.min(255, Math.round(palBytes[256 + i * 3] * 255 / 63.0));
    const g = Math.min(255, Math.round(palBytes[256 + i * 3 + 1] * 255 / 63.0));
    const b = Math.min(255, Math.round(palBytes[256 + i * 3 + 2] * 255 / 63.0));
    pal.push({ r, g, b });
}

function decodeShapeFrame(shapeId, frameIdx) {
    const off = shapesBytes.readUInt32LE(128 + shapeId * 8);
    if (off === 0 || off >= shapesBytes.length) return null;
    const frame0Off = shapesBytes.readUInt32LE(off + 4);
    const numFrames = (frame0Off - 4) / 4;
    if (frameIdx >= numFrames) return null;
    const fOff = shapesBytes.readUInt32LE(off + 4 + frameIdx * 4);

    const ptr = off + fOff;
    const xright = shapesBytes.readInt16LE(ptr);
    const xleft = shapesBytes.readInt16LE(ptr + 2);
    const yabove = shapesBytes.readInt16LE(ptr + 4);
    const ybelow = shapesBytes.readInt16LE(ptr + 6);
    const w = xleft + xright + 1;
    const h = yabove + ybelow + 1;
    if (w <= 0 || h <= 0 || w > 500 || h > 500) return null;

    // Palette index buffer so we can modify attire/skin cleanly
    const indices = Buffer.alloc(w * h, 255);
    let curr = ptr + 8;
    while (curr < shapesBytes.length - 1) {
        const scanlen = shapesBytes.readUInt16LE(curr); curr += 2;
        if (scanlen === 0) break;
        const encoded = scanlen & 1;
        const len = scanlen >> 1;
        const scanx = shapesBytes.readInt16LE(curr); curr += 2;
        const scany = shapesBytes.readInt16LE(curr); curr += 2;
        const destY = yabove + scany;
        const destX = xleft + scanx;

        if (encoded === 0) {
            for (let i = 0; i < len; i++) {
                const cIdx = shapesBytes[curr++];
                if (cIdx !== 255) {
                    const px = destX + i;
                    const py = destY;
                    if (px >= 0 && px < w && py >= 0 && py < h) {
                        indices[py * w + px] = cIdx;
                    }
                }
            }
        } else {
            let readTotal = 0;
            while (readTotal < len) {
                const bcnt = shapesBytes[curr++];
                const repeat = bcnt & 1;
                const c = bcnt >> 1;
                if (repeat) {
                    const cIdx = shapesBytes[curr++];
                    for (let k = 0; k < c; k++) {
                        const px = destX + readTotal + k;
                        const py = destY;
                        if (cIdx !== 255 && px >= 0 && px < w && py >= 0 && py < h) {
                            indices[py * w + px] = cIdx;
                        }
                    }
                } else {
                    for (let k = 0; k < c; k++) {
                        const cIdx = shapesBytes[curr++];
                        const px = destX + readTotal + k;
                        const py = destY;
                        if (cIdx !== 255 && px >= 0 && px < w && py >= 0 && py < h) {
                            indices[py * w + px] = cIdx;
                        }
                    }
                }
                readTotal += c;
            }
        }
    }
    return { width: w, height: h, indices, xleft, yabove, xright, ybelow };
}

// Pure 2.5D transpose (swap x and y): (x, y) -> (y, x)
function transposeFrame(frame) {
    const tw = frame.height;
    const th = frame.width;
    const tIndices = Buffer.alloc(tw * th, 255);
    for (let y = 0; y < frame.height; y++) {
        for (let x = 0; x < frame.width; x++) {
            const val = frame.indices[y * frame.width + x];
            tIndices[x * tw + y] = val;
        }
    }
    return {
        width: tw,
        height: th,
        indices: tIndices,
        xleft: frame.yabove,
        yabove: frame.xleft,
        xright: frame.ybelow,
        ybelow: frame.xright
    };
}

// Convert clothing to skin / primitive tier
function applyAttireTier(frame, gender, tier) {
    const copy = Buffer.from(frame.indices);
    const w = frame.width;
    const h = frame.height;

    // Palette mappings
    // Skin ramp: 179 (lightest) -> 180 -> 181 -> 182 -> 183 -> 184 -> 185 -> 186 (darkest)
    // Dark brown hair: 189, 188, 187
    // Grass/reed wrap: 70..75 (moss/grass greens), 144 (reed fiber)

    if (gender === 'male') {
        for (let i = 0; i < copy.length; i++) {
            const c = copy[i];
            const y = Math.floor(i / w);

            // Red bandana (y <= 11) / waist sash (y >= 12): 23..28
            if (c >= 23 && c <= 28) {
                if (tier === 0 || tier === 1) {
                    if (y <= 6) {
                        copy[i] = 188; // natural brown hair
                    } else if (y <= 11) {
                        copy[i] = 182; // bare skin under bandana knot
                    } else {
                        // Sash at waist becomes bare skin (T0) or reed loincloth (T1)
                        copy[i] = (tier === 0) ? 182 : 202;
                    }
                }
            }

            // Grey vest: 122..130
            if (c >= 122 && c <= 130) {
                if (tier === 0 || tier === 1) {
                    // Bare chest musculature
                    if (c <= 124) copy[i] = 180;
                    else if (c <= 127) copy[i] = 182;
                    else copy[i] = 184;
                }
            }

            // Black pants: 131..133
            if (c >= 131 && c <= 133) {
                if (tier === 0) {
                    // Fully unclad legs
                    copy[i] = (c === 131) ? 182 : (c === 132 ? 183 : 185);
                } else if (tier === 1) {
                    // Primitive grass/reed loincloth
                    if (y <= 16) {
                        copy[i] = (c === 131) ? 202 : (c === 132 ? 168 : 242);
                    } else {
                        copy[i] = (c === 131) ? 182 : 184; // bare legs below
                    }
                }
            }
        }
    } else {
        // Female (Eve) - Shape 452
        for (let i = 0; i < copy.length; i++) {
            const c = copy[i];
            const y = Math.floor(i / w);

            // White blouse (y = 5..13): 151..155, 135, 157
            if ((c >= 151 && c <= 155) || c === 135 || c === 157) {
                if (tier === 0) {
                    // Fully unclad torso
                    if (c === 135 || c === 151) copy[i] = 180; // light skin
                    else if (c <= 153) copy[i] = 181;
                    else copy[i] = 183;
                } else if (tier === 1) {
                    // Primitive fiber chest wrap
                    if (y >= 8 && y <= 11) {
                        copy[i] = (c <= 152) ? 202 : 168; // dry reed weave
                    } else {
                        copy[i] = (c === 135 || c === 151) ? 180 : 182; // bare skin
                    }
                }
            }

            // Brown skirt (y = 15..21): 217..222
            if (c >= 217 && c <= 222) {
                if (tier === 0) {
                    // Fully unclad legs
                    copy[i] = (c <= 218) ? 181 : (c <= 220 ? 183 : 185);
                } else if (tier === 1) {
                    // Primitive grass/reed wrap around hips
                    if (y <= 18) {
                        copy[i] = (c <= 218) ? 202 : (c <= 220 ? 168 : 242);
                    } else {
                        copy[i] = (c <= 218) ? 181 : 184; // bare legs
                    }
                }
            }
        }
    }

    return {
        width: w,
        height: h,
        indices: copy,
        xleft: frame.xleft,
        yabove: frame.yabove,
        xright: frame.xright,
        ybelow: frame.ybelow
    };
}

// Build 3x4 character sheet (RMMZ format) at exact 3x scale with transposed E/W
function buildCharacterSheet(baseShapeId, gender, tier, outPath) {
    // Frames for 4 directions:
    // South (Down):  16, 17, 18 (direct)
    // West (Left):   0, 1, 2 (transposed)
    // East (Right):  16, 17, 18 (transposed)
    // North (Up):    0, 1, 2 (direct)

    const rawFrames = {};
    for (const f of [0, 1, 2, 16, 17, 18]) {
        rawFrames[f] = decodeShapeFrame(baseShapeId, f);
    }

    const scale = 3;
    const frameW = 96; // 96x96 frame allows character to fit comfortably
    const frameH = 96;

    const sheetCols = 3;
    const sheetRows = 4;
    const totalW = frameW * sheetCols;
    const totalH = frameH * sheetRows;
    const sheetBuf = Buffer.alloc(totalW * totalH * 4, 0);

    const rows = [
        { frames: [16, 17, 18], transpose: false }, // Row 0: Down / South
        { frames: [0, 1, 2],    transpose: true  }, // Row 1: Left / West
        { frames: [16, 17, 18], transpose: true  }, // Row 2: Right / East
        { frames: [0, 1, 2],    transpose: false }  // Row 3: Up / North
    ];

    for (let r = 0; r < 4; r++) {
        const cfg = rows[r];
        for (let c = 0; c < 3; c++) {
            const fIdx = cfg.frames[c];
            let f = rawFrames[fIdx];
            if (!f) continue;

            // Apply clothing tier transformation
            f = applyAttireTier(f, gender, tier);

            // Transpose if West or East
            if (cfg.transpose) {
                f = transposeFrame(f);
            }

            const originX = c * frameW;
            const originY = r * frameH;

            // Center character in frame with feet resting at bottom
            const offsetX = Math.floor((frameW - f.width * scale) / 2);
            const offsetY = frameH - f.height * scale - 2;

            for (let y = 0; y < f.height; y++) {
                for (let x = 0; x < f.width; x++) {
                    const cIdx = f.indices[y * f.width + x];
                    if (cIdx === 255) continue;
                    const color = pal[cIdx];

                    for (let dy = 0; dy < scale; dy++) {
                        for (let dx = 0; dx < scale; dx++) {
                            const destX = originX + offsetX + x * scale + dx;
                            const destY = originY + offsetY + y * scale + dy;
                            if (destX >= originX && destX < originX + frameW && destY >= originY && destY < originY + frameH) {
                                const idx = (destY * totalW + destX) * 4;
                                sheetBuf[idx] = color.r;
                                sheetBuf[idx + 1] = color.g;
                                sheetBuf[idx + 2] = color.b;
                                sheetBuf[idx + 3] = 255;
                            }
                        }
                    }
                }
            }
        }
    }

    writePNG(outPath, totalW, totalH, sheetBuf);
    console.log(`[Attire Sheet] Built ${path.basename(outPath)} (Gender: ${gender}, Tier: ${tier})`);
}

const charDir = path.join(__dirname, '..', 'game', 'img', 'characters');

// Tier 0: Naked (Adam and Eve start completely unclad)
buildCharacterSheet(458, 'male', 0, path.join(charDir, '$U7_Adam_T0.png'));
buildCharacterSheet(452, 'female', 0, path.join(charDir, '$U7_Eve_T0.png'));

// Also copy to active $Adam.png, $Eve.png, $U7_Adam.png, $U7_Eve.png so the game starts with naked models!
fs.copyFileSync(path.join(charDir, '$U7_Adam_T0.png'), path.join(charDir, '$Adam.png'));
fs.copyFileSync(path.join(charDir, '$U7_Eve_T0.png'), path.join(charDir, '$Eve.png'));
fs.copyFileSync(path.join(charDir, '$U7_Adam_T0.png'), path.join(charDir, '$U7_Adam.png'));
fs.copyFileSync(path.join(charDir, '$U7_Eve_T0.png'), path.join(charDir, '$U7_Eve.png'));

// Tier 1: Primitive Woven Grass / Fiber Loincloth
buildCharacterSheet(458, 'male', 1, path.join(charDir, '$U7_Adam_T1.png'));
buildCharacterSheet(452, 'female', 1, path.join(charDir, '$U7_Eve_T1.png'));

// Tier 2: Fur / Peasant Attire (Shape 458 / 452 base clothing)
buildCharacterSheet(458, 'male', 2, path.join(charDir, '$U7_Adam_T2.png'));
buildCharacterSheet(452, 'female', 2, path.join(charDir, '$U7_Eve_T2.png'));

// Tier 3: Tailored Leather / Fighter Armor (Shape 462 male fighter / Shape 463 female fighter)
buildCharacterSheet(462, 'male', 2, path.join(charDir, '$U7_Adam_T3.png'));
buildCharacterSheet(463, 'female', 2, path.join(charDir, '$U7_Eve_T3.png'));

console.log("All character attire tiers built successfully!");
