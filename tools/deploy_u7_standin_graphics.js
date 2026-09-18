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

function decodeShape(shapeId, frameIdx = 0) {
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
    return { width: w, height: h, pixels, numFrames, xleft, yabove, xright, ybelow };
}

// Build 3x4 RMMZ character sheet from decoded U7 shape with exact footprint anchor alignment
function buildAlignedRMMZSheet(shapeId, outPath, options = {}) {
    const decoded = decodeShape(shapeId, options.frame || 0);
    if (!decoded) throw new Error(`Could not decode shape ${shapeId}`);

    const scale = 3;
    const scaledW = decoded.width * scale;
    const scaledH = decoded.height * scale;

    const frameW = options.frameW;
    const frameH = options.frameH;

    const sheetCols = 3;
    const sheetRows = 4;
    const totalW = frameW * sheetCols;
    const totalH = frameH * sheetRows;
    const sheetBuf = Buffer.alloc(totalW * totalH * 4, 0);

    // Precise Footprint & Collision Alignment:
    // Ground anchor in native U7 is at (xleft, yabove).
    // In RMMZ, the cell center is at frameW / 2, and bottom of cell is at frameH.
    // By placing scaled anchor (xleft * scale) at frameW / 2, the visual base/trunk
    // sits exactly on the RMMZ physical collision tile (x, y)!
    const scaledAnchorX = decoded.xleft * scale;
    const offsetX = Math.floor(frameW / 2 - scaledAnchorX);
    const offsetY = frameH - scaledH;

    for (let row = 0; row < sheetRows; row++) {
        for (let col = 0; col < sheetCols; col++) {
            const originX = col * frameW;
            const originY = row * frameH;

            for (let y = 0; y < decoded.height; y++) {
                for (let x = 0; x < decoded.width; x++) {
                    const srcIdx = (y * decoded.width + x) * 4;
                    const a = decoded.pixels[srcIdx + 3];
                    if (a === 0) continue;
                    const r = decoded.pixels[srcIdx];
                    const g = decoded.pixels[srcIdx + 1];
                    const b = decoded.pixels[srcIdx + 2];

                    // 3x nearest-neighbor upscale
                    for (let dy = 0; dy < scale; dy++) {
                        for (let dx = 0; dx < scale; dx++) {
                            const destX = originX + offsetX + x * scale + dx;
                            const destY = originY + offsetY + y * scale + dy;
                            if (destX >= originX && destX < originX + frameW && destY >= originY && destY < originY + frameH) {
                                const destIdx = (destY * totalW + destX) * 4;
                                sheetBuf[destIdx] = r;
                                sheetBuf[destIdx + 1] = g;
                                sheetBuf[destIdx + 2] = b;
                                sheetBuf[destIdx + 3] = 255;
                            }
                        }
                    }
                }
            }
        }
    }

    writePNG(outPath, totalW, totalH, sheetBuf);
    console.log(`[U7 Stand-in] Built ${outPath} from shape ${shapeId} (scaled ${scaledW}x${scaledH} in frame ${frameW}x${frameH}, anchor offset ${offsetX})`);
}

const charDir = path.join(__dirname, '..', 'game', 'img', 'characters');

// 1. Timber Oak: U7 Shape 181 (72x70 broadleaf oak leaning 45° up-left)
buildAlignedRMMZSheet(181, path.join(charDir, '!$TimberOak.png'), { frameW: 384, frameH: 240 });

// 2. Pine Tree: U7 Shape 306 (60x58 evergreen conifer leaning 45° up-left)
buildAlignedRMMZSheet(306, path.join(charDir, '!$PineTree.png'), { frameW: 336, frameH: 192 });

// 3. Ancient Fruit Tree: U7 Shape 328 (64x64 gnarled ancient green tree leaning 45° up-left)
buildAlignedRMMZSheet(328, path.join(charDir, '!$FruitTree.png'), { frameW: 384, frameH: 240 });

// 4. Granite Boulder: U7 Shape 342 (45x47 weathered granite rock leaning 45° up-left)
buildAlignedRMMZSheet(342, path.join(charDir, '!$GraniteBoulder.png'), { frameW: 288, frameH: 144 });

// 5. Ironstone Deposit: U7 Shape 341 (41x27 mineral stone deposit leaning 45° up-left)
buildAlignedRMMZSheet(341, path.join(charDir, '!$IronstoneDeposit.png'), { frameW: 240, frameH: 96 });

// 6. Berry Bush: U7 Shape 672 (29x28 green leafy shrubbery leaning 45° up-left)
buildAlignedRMMZSheet(672, path.join(charDir, '!$BerryBush.png'), { frameW: 192, frameH: 96 });

// 7. Campfire Hearth: U7 Shape 739 (47x47 stone firepit with glowing hot coals)
buildAlignedRMMZSheet(739, path.join(charDir, '!$Campfire.png'), { frameW: 288, frameH: 144 });

console.log("All authentic Ultima VII scenery graphics deployed with collision-aligned anchors!");
