const fs = require('fs');
const path = require('path');
const { writePNG } = require('./png_util');

const shapesPath = "C:\\Program Files\\GOG Galaxy\\Games\\Ultima 7\\STATIC\\SHAPES.VGA";
const palPath = "C:\\Program Files\\GOG Galaxy\\Games\\Ultima 7\\STATIC\\PALETTES.FLX";

const palBytes = fs.readFileSync(palPath);
const shapesBytes = fs.readFileSync(shapesPath);

// Daylight Palette (Record 0)
const pal = [];
for (let i = 0; i < 256; i++) {
    const r = Math.min(255, Math.round(palBytes[256 + i * 3] * 255 / 63.0));
    const g = Math.min(255, Math.round(palBytes[256 + i * 3 + 1] * 255 / 63.0));
    const b = Math.min(255, Math.round(palBytes[256 + i * 3 + 2] * 255 / 63.0));
    pal.push({ r, g, b });
}

function decodeShapeFrame(shapeId, frameIdx = 0) {
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

    const pixels = Buffer.alloc(w * h * 4, 0);
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
                        const idx = (py * w + px) * 4;
                        const c = pal[cIdx];
                        pixels[idx] = c.r;
                        pixels[idx + 1] = c.g;
                        pixels[idx + 2] = c.b;
                        pixels[idx + 3] = 255;
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
                            const idx = (py * w + px) * 4;
                            const col = pal[cIdx];
                            pixels[idx] = col.r;
                            pixels[idx + 1] = col.g;
                            pixels[idx + 2] = col.b;
                            pixels[idx + 3] = 255;
                        }
                    }
                } else {
                    for (let k = 0; k < c; k++) {
                        const cIdx = shapesBytes[curr++];
                        const px = destX + readTotal + k;
                        const py = destY;
                        if (cIdx !== 255 && px >= 0 && px < w && py >= 0 && py < h) {
                            const idx = (py * w + px) * 4;
                            const col = pal[cIdx];
                            pixels[idx] = col.r;
                            pixels[idx + 1] = col.g;
                            pixels[idx + 2] = col.b;
                            pixels[idx + 3] = 255;
                        }
                    }
                }
                readTotal += c;
            }
        }
    }
    return { width: w, height: h, pixels, numFrames, xleft, yabove };
}

const targetShapes = [181, 203, 310, 327, 331, 332, 341, 342, 343, 631, 634, 643, 670, 672, 673, 739, 825, 922, 932];
const outDir = path.join(__dirname, '..', 'scratch', 'u7_nature');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

for (const sid of targetShapes) {
    const res = decodeShapeFrame(sid, 0);
    if (res) {
        const out = path.join(outDir, `shape_${sid}.png`);
        writePNG(out, res.width, res.height, res.pixels);
        console.log(`Saved shape ${sid}: ${res.width}x${res.height}, frames: ${res.numFrames}`);
    }
}
