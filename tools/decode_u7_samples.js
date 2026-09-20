const fs = require('fs');
const { writePNG } = require('./png_util');

const shapesPath = 'C:\\Program Files\\GOG Galaxy\\Games\\Ultima 7\\STATIC\\SHAPES.VGA';
const palPath = 'C:\\Program Files\\GOG Galaxy\\Games\\Ultima 7\\STATIC\\PALETTES.FLX';

const palBytes = fs.readFileSync(palPath);
const shapesBytes = fs.readFileSync(shapesPath);

const pal = [];
for (let i = 0; i < 256; i++) {
    const r = Math.min(255, Math.round(palBytes[256 + i * 3] * 255 / 63.0));
    const g = Math.min(255, Math.round(palBytes[256 + i * 3 + 1] * 255 / 63.0));
    const b = Math.min(255, Math.round(palBytes[256 + i * 3 + 2] * 255 / 63.0));
    pal.push([r, g, b]);
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
            // RLE runs
            let px = destX;
            let py = destY;
            let endScan = curr + len;
            while (curr < endScan) {
                const b = shapesBytes[curr++];
                const runlen = b >> 1;
                const isRunRepeat = b & 1;
                if (isRunRepeat === 0) {
                    for (let i = 0; i < runlen; i++) {
                        const c = shapesBytes[curr++];
                        if (c !== 255 && px < w && py < h) indices[py * w + px] = c;
                        px++;
                    }
                } else {
                    const c = shapesBytes[curr++];
                    for (let i = 0; i < runlen; i++) {
                        if (c !== 255 && px < w && py < h) indices[py * w + px] = c;
                        px++;
                    }
                }
            }
        }
    }

    const rgba = Buffer.alloc(w * h * 4);
    for (let i = 0; i < w * h; i++) {
        const c = indices[i];
        if (c === 255) {
            rgba[i*4] = 255; rgba[i*4+1] = 0; rgba[i*4+2] = 255; rgba[i*4+3] = 255; // Magenta
        } else {
            const rgb = pal[c];
            rgba[i*4] = rgb[0]; rgba[i*4+1] = rgb[1]; rgba[i*4+2] = rgb[2]; rgba[i*4+3] = 255;
        }
    }
    return { w, h, rgba, xleft, xright, yabove, ybelow };
}

[
    { id: 458, name: 'avatar' },
    { id: 265, name: 'townsman' },
    { id: 313, name: 'stump' },
    { id: 342, name: 'boulder' },
    { id: 672, name: 'bush' },
    { id: 705, name: 'campfire' }
].forEach(({ id, name }) => {
    const res = decodeShapeFrame(id, 0);
    if (res) {
        writePNG(`game/test_output/u7_native_${name}.png`, res.w, res.h, res.rgba);
        // zoom 4x
        const s = 4;
        const z = Buffer.alloc(res.w * s * res.h * s * 4);
        for (let y = 0; y < res.h; y++) {
            for (let x = 0; x < res.w; x++) {
                const sIdx = (y * res.w + x) * 4;
                for (let dy = 0; dy < s; dy++) {
                    for (let dx = 0; dx < s; dx++) {
                        const dIdx = (((y * s + dy) * res.w * s) + (x * s + dx)) * 4;
                        z[dIdx] = res.rgba[sIdx];
                        z[dIdx+1] = res.rgba[sIdx+1];
                        z[dIdx+2] = res.rgba[sIdx+2];
                        z[dIdx+3] = res.rgba[sIdx+3];
                    }
                }
            }
        }
        writePNG(`game/test_output/u7_native_${name}_4x.png`, res.w * s, res.h * s, z);
        console.log(`Decoded ${name}: ${res.w}x${res.h}`);
    }
});

