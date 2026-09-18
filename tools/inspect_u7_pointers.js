const fs = require('fs');
const path = require('path');
const { writePNG } = require('./png_util');

const palPath = "C:\\Program Files\\GOG Galaxy\\Games\\Ultima 7\\STATIC\\PALETTES.FLX";
const palBytes = fs.readFileSync(palPath);
const pal = [];
for (let i = 0; i < 256; i++) {
    pal.push({
        r: Math.min(255, Math.round(palBytes[256 + i * 3] * 255 / 63.0)),
        g: Math.min(255, Math.round(palBytes[256 + i * 3 + 1] * 255 / 63.0)),
        b: Math.min(255, Math.round(palBytes[256 + i * 3 + 2] * 255 / 63.0))
    });
}

const shpPath = "C:\\Program Files\\GOG Galaxy\\Games\\Ultima 7\\STATIC\\POINTERS.SHP";
if (!fs.existsSync(shpPath)) {
    console.log("POINTERS.SHP not found");
    process.exit(0);
}
const shp = fs.readFileSync(shpPath);
const frame0Off = shp.readUInt32LE(4);
const numFrames = (frame0Off - 4) / 4;
console.log(`POINTERS.SHP has ${numFrames} frames`);

for (let i = 0; i < numFrames; i++) {
    const fOff = shp.readUInt32LE(4 + i * 4);
    const ptr = fOff;
    const xright = shp.readInt16LE(ptr);
    const xleft = shp.readInt16LE(ptr + 2);
    const yabove = shp.readInt16LE(ptr + 4);
    const ybelow = shp.readInt16LE(ptr + 6);
    const w = xleft + xright + 1;
    const h = yabove + ybelow + 1;
    console.log(`Frame ${i}: offset=${fOff}, size=${w}x${h}, hotspot=(${xleft},${yabove})`);

    // Decode frame
    const pixels = Buffer.alloc(w * h * 4, 0);
    let curr = ptr + 8;
    while (curr < shp.length - 1) {
        const scanlen = shp.readUInt16LE(curr); curr += 2;
        if (scanlen === 0) break;
        const encoded = scanlen & 1;
        const len = scanlen >> 1;
        const scanx = shp.readInt16LE(curr); curr += 2;
        const scany = shp.readInt16LE(curr); curr += 2;
        const destY = yabove + scany;
        const destX = xleft + scanx;

        if (encoded === 0) {
            for (let k = 0; k < len; k++) {
                const cIdx = shp[curr++];
                if (cIdx !== 255 && destX + k >= 0 && destX + k < w && destY >= 0 && destY < h) {
                    const idx = (destY * w + destX + k) * 4;
                    const c = pal[cIdx];
                    pixels[idx] = c.r;
                    pixels[idx + 1] = c.g;
                    pixels[idx + 2] = c.b;
                    pixels[idx + 3] = 255;
                }
            }
        } else {
            let runLeft = len;
            let runDestX = destX;
            while (runLeft > 0 && curr < shp.length) {
                const b = shp[curr++];
                const rep = b >> 1;
                const isRepeat = (b & 1) !== 0;
                if (isRepeat) {
                    const val = shp[curr++];
                    for (let r = 0; r < rep; r++) {
                        if (val !== 255 && runDestX >= 0 && runDestX < w && destY >= 0 && destY < h) {
                            const idx = (destY * w + runDestX) * 4;
                            const c = pal[val];
                            pixels[idx] = c.r;
                            pixels[idx + 1] = c.g;
                            pixels[idx + 2] = c.b;
                            pixels[idx + 3] = 255;
                        }
                        runDestX++;
                    }
                } else {
                    for (let r = 0; r < rep; r++) {
                        const val = shp[curr++];
                        if (val !== 255 && runDestX >= 0 && runDestX < w && destY >= 0 && destY < h) {
                            const idx = (destY * w + runDestX) * 4;
                            const c = pal[val];
                            pixels[idx] = c.r;
                            pixels[idx + 1] = c.g;
                            pixels[idx + 2] = c.b;
                            pixels[idx + 3] = 255;
                        }
                        runDestX++;
                    }
                }
                runLeft -= rep;
            }
        }
    }
    const outName = path.join(__dirname, `../game/test_output/u7_pointer_frame_${i}.png`);
    writePNG(outName, w, h, pixels);
}

