const fs = require('fs');
const path = require('path');
const { writePNG } = require('./png_util');

const shapesPath = "C:\\Program Files\\GOG Galaxy\\Games\\Ultima 7\\STATIC\\SHAPES.VGA";
const palPath = "C:\\Program Files\\GOG Galaxy\\Games\\Ultima 7\\STATIC\\PALETTES.FLX";

const palBytes = fs.readFileSync(palPath);
const shapesBytes = fs.readFileSync(shapesPath);

// Daylight Palette
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

// Convert clothes to naked skin
function applyNakedTier(frame, gender) {
    const copy = Buffer.from(frame.indices);
    const w = frame.width, h = frame.height;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = y * w + x;
            const c = copy[i];
            if (c === 255) continue;
            // Palette 181..187 is U7 warm skin tone
            // If clothes (browns, greens, blues, reds, leathers), convert to skin
            if ((c >= 190 && c <= 230) || (c >= 64 && c <= 80) || (c >= 110 && c <= 140)) {
                // Keep head hair
                if (y < 8) continue;
                copy[i] = (y % 2 === 0) ? 182 : 184;
            }
        }
    }
    return { width: w, height: h, indices: copy };
}

function transposeFrame(frame) {
    const tw = frame.height;
    const th = frame.width;
    const tIndices = Buffer.alloc(tw * th, 255);
    for (let y = 0; y < frame.height; y++) {
        for (let x = 0; x < frame.width; x++) {
            tIndices[x * tw + y] = frame.indices[y * frame.width + x];
        }
    }
    return { width: tw, height: th, indices: tIndices };
}

// Render test sheet at given scale
function renderSheet(scale, outPath) {
    const frameW = scale * 26;
    const frameH = scale * 34;
    const totalW = frameW * 3;
    const totalH = frameH * 4;
    const buf = Buffer.alloc(totalW * totalH * 4, 0);

    const fAdam = applyNakedTier(decodeShapeFrame(458, 16), 'male');
    const fEve = applyNakedTier(decodeShapeFrame(452, 16), 'female');

    const fAdamT = transposeFrame(fAdam);
    const fEveT = transposeFrame(fEve);

    // Draw comparison in single sheet:
    // Row 0: Adam facing South
    // Row 1: Adam facing West (transposed)
    // Row 2: Eve facing South
    // Row 3: Eve facing West (transposed)
    const rows = [
        { f: fAdam, name: "Adam South" },
        { f: fAdamT, name: "Adam West (Transposed)" },
        { f: fEve, name: "Eve South" },
        { f: fEveT, name: "Eve West (Transposed)" }
    ];

    for (let r = 0; r < 4; r++) {
        const f = rows[r].f;
        for (let c = 0; c < 3; c++) {
            const ox = c * frameW;
            const oy = r * frameH;
            const pxOffset = Math.floor((frameW - f.width * scale) / 2);
            const pyOffset = frameH - f.height * scale - 4;

            for (let y = 0; y < f.height; y++) {
                for (let x = 0; x < f.width; x++) {
                    const cIdx = f.indices[y * f.width + x];
                    if (cIdx === 255) continue;
                    const col = pal[cIdx];

                    for (let dy = 0; dy < scale; dy++) {
                        for (let dx = 0; dx < scale; dx++) {
                            const destX = ox + pxOffset + x * scale + dx;
                            const destY = oy + pyOffset + y * scale + dy;
                            if (destX >= 0 && destX < totalW && destY >= 0 && destY < totalH) {
                                const idx = (destY * totalW + destX) * 4;
                                buf[idx] = col.r;
                                buf[idx + 1] = col.g;
                                buf[idx + 2] = col.b;
                                buf[idx + 3] = 255;
                            }
                        }
                    }
                }
            }
        }
    }

    writePNG(outPath, totalW, totalH, buf);
    console.log(`Rendered scale ${scale}x to ${path.basename(outPath)} (${totalW}x${totalH}, frame ${frameW}x${frameH})`);
}

renderSheet(5, 'reference/test_adam_scale5.png');
renderSheet(6, 'reference/test_adam_scale6.png');
