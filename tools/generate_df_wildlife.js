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
                if (cIdx !== 255 && destX + i >= 0 && destX + i < w && destY >= 0 && destY < h) {
                    const idx = (destY * w + destX + i) * 4;
                    const c = pal[cIdx];
                    pixels[idx] = c.r;
                    pixels[idx + 1] = c.g;
                    pixels[idx + 2] = c.b;
                    pixels[idx + 3] = 255;
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

function buildCreatureSheet(config, outPath, sidecarPath) {
    const scale = 3;
    const frameW = config.frameW;
    const frameH = config.frameH;
    const totalW = frameW * 3;
    const totalH = frameH * 4;
    const sheetBuf = Buffer.alloc(totalW * totalH * 4, 0);

    // Frame selection per row:
    // South: config.southFrames (e.g. [16, 17, 18])
    // West:  config.northFrames transposed
    // East:  config.southFrames transposed
    // North: config.northFrames (e.g. [0, 1, 2])
    const rows = [
        { frames: config.southFrames, transpose: false }, // South (Facing Down)
        { frames: config.northFrames, transpose: true  }, // West (Facing Left)
        { frames: config.southFrames, transpose: true  }, // East (Facing Right)
        { frames: config.northFrames, transpose: false }  // North (Facing Up)
    ];

    const decodedCache = {};
    for (const r of rows) {
        for (const fIdx of r.frames) {
            if (!decodedCache[fIdx]) {
                decodedCache[fIdx] = decodeShape(config.shapeId, fIdx);
            }
        }
    }

    for (let r = 0; r < 4; r++) {
        const rowCfg = rows[r];
        for (let c = 0; c < 3; c++) {
            const fIdx = rowCfg.frames[c];
            const f = decodedCache[fIdx];
            if (!f) continue;

            let fw = f.width, fh = f.height;
            let fPixels = f.pixels;

            if (rowCfg.transpose) {
                fw = f.height;
                fh = f.width;
                const tPix = Buffer.alloc(fw * fh * 4, 0);
                for (let y = 0; y < f.height; y++) {
                    for (let x = 0; x < f.width; x++) {
                        const sIdx = (y * f.width + x) * 4;
                        const dIdx = (x * fw + y) * 4;
                        tPix[dIdx] = f.pixels[sIdx];
                        tPix[dIdx + 1] = f.pixels[sIdx + 1];
                        tPix[dIdx + 2] = f.pixels[sIdx + 2];
                        tPix[dIdx + 3] = f.pixels[sIdx + 3];
                    }
                }
                fPixels = tPix;
            }

            const originX = c * frameW;
            const originY = r * frameH;
            const offsetX = Math.floor((frameW - fw * scale) / 2);
            const offsetY = frameH - fh * scale - (config.bottomPad || 2);

            for (let y = 0; y < fh; y++) {
                for (let x = 0; x < fw; x++) {
                    const srcIdx = (y * fw + x) * 4;
                    if (fPixels[srcIdx + 3] === 0) continue;
                    const rCol = fPixels[srcIdx];
                    const gCol = fPixels[srcIdx + 1];
                    const bCol = fPixels[srcIdx + 2];

                    for (let dy = 0; dy < scale; dy++) {
                        for (let dx = 0; dx < scale; dx++) {
                            const destX = originX + offsetX + x * scale + dx;
                            const destY = originY + offsetY + y * scale + dy;
                            if (destX >= originX && destX < originX + frameW && destY >= originY && destY < originY + frameH) {
                                const dIdx = (destY * totalW + destX) * 4;
                                sheetBuf[dIdx] = rCol;
                                sheetBuf[dIdx + 1] = gCol;
                                sheetBuf[dIdx + 2] = bCol;
                                sheetBuf[dIdx + 3] = 255;
                            }
                        }
                    }
                }
            }
        }
    }

    writePNG(outPath, totalW, totalH, sheetBuf);

    // Write sidecar JSON
    const sidecar = {
        id: config.id,
        name: config.name,
        category: "wildlife",
        frameWidth: frameW,
        frameHeight: frameH,
        anchor: [Math.floor(frameW / 2), frameH],
        footprint: config.footprint || [1, 1],
        heightLifts: config.heightLifts || 2,
        facings: ["S", "W", "E", "N"],
        animations: {
            stand: [1],
            walk: [0, 1, 2, 1]
        },
        frameMs: 180,
        standInSource: `SHAPES.VGA shape ${config.shapeId} (transposed E/W, 3x integer nearest-neighbor)`
    };

    fs.writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2));
    console.log(`[U7 Wildlife] Built ${path.basename(outPath)} (${config.name}) [${totalW}x${totalH}]`);
}

const charDir = path.join(__dirname, '..', 'game', 'img', 'characters');

const wildlifeList = [
    // 1. Small Grazer: Hare / Wild Rabbit
    { id: "rabbit", name: "Hare", shapeId: 811, frameW: 48, frameH: 48, southFrames: [16, 17, 18], northFrames: [0, 1, 2], footprint: [1, 1], heightLifts: 1 },
    // 2. Medium Grazer: Woodland Deer / Stag
    { id: "deer", name: "Deer", shapeId: 502, frameW: 192, frameH: 192, southFrames: [16, 17, 18], northFrames: [0, 1, 2], footprint: [1, 1], heightLifts: 4 },
    // 3. Large Grazer: Wild Ox / Cattle
    { id: "cow", name: "Ox", shapeId: 500, frameW: 192, frameH: 192, southFrames: [16, 17, 18], northFrames: [0, 1, 2], footprint: [2, 1], heightLifts: 4 },
    // 4. Mount / Pack Animal: Draft Horse
    { id: "horse", name: "Horse", shapeId: 727, frameW: 192, frameH: 192, southFrames: [16, 17, 18], northFrames: [0, 1, 2], footprint: [2, 1], heightLifts: 5 },
    // 5. Wool Grazer: Sheep / Ram
    { id: "sheep", name: "Sheep", shapeId: 970, frameW: 96, frameH: 96, southFrames: [16, 17, 18], northFrames: [0, 1, 2], footprint: [1, 1], heightLifts: 2 },
    // 6. Pack Predator: Wild Wolf
    { id: "wolf", name: "Wolf", shapeId: 537, frameW: 96, frameH: 96, southFrames: [16, 17, 18], northFrames: [0, 1, 2], footprint: [1, 1], heightLifts: 2 },
    // 7. Woodland Predator: Red Fox
    { id: "fox", name: "Fox", shapeId: 510, frameW: 96, frameH: 96, southFrames: [16, 17, 18], northFrames: [0, 1, 2], footprint: [1, 1], heightLifts: 2 },
    // 8. Domestic Companion: Dog
    { id: "dog", name: "Dog", shapeId: 496, frameW: 96, frameH: 96, southFrames: [16, 17, 18], northFrames: [0, 1, 2], footprint: [1, 1], heightLifts: 2 },
    // 9. Vermin Hunter: Feral Cat
    { id: "cat", name: "Cat", shapeId: 495, frameW: 96, frameH: 96, southFrames: [16, 17, 18], northFrames: [0, 1, 2], footprint: [1, 1], heightLifts: 1 },
    // 10. Ground Fowl: Chicken / Hen
    { id: "chicken", name: "Chicken", shapeId: 498, frameW: 48, frameH: 48, southFrames: [16, 17, 18], northFrames: [0, 1, 2], footprint: [1, 1], heightLifts: 1 },
    // 11. Aerial Bird / Flying Raptor: Hawk
    { id: "hawk", name: "Hawk", shapeId: 555, frameW: 96, frameH: 96, southFrames: [12, 13, 14], northFrames: [0, 1, 2], footprint: [1, 1], heightLifts: 3 },
    // 12. Aerial Songbird / Woodland Bird
    { id: "bird", name: "Wild Bird", shapeId: 716, frameW: 48, frameH: 48, southFrames: [16, 17, 18], northFrames: [0, 1, 2], footprint: [1, 1], heightLifts: 1 },
    // 13. Subterranean Crawler: Giant Cave Spider
    { id: "cave_spider", name: "Cave Spider", shapeId: 865, frameW: 96, frameH: 96, southFrames: [16, 17, 18], northFrames: [0, 1, 2], footprint: [1, 1], heightLifts: 2 },
    // 14. Subterranean Flyer: Cave Bat
    { id: "cave_bat", name: "Cave Bat", shapeId: 493, frameW: 96, frameH: 96, southFrames: [16, 17, 18], northFrames: [0, 1, 2], footprint: [1, 1], heightLifts: 2 },
    // 15. Vermin Scavenger: Rat
    { id: "rat", name: "Rat", shapeId: 523, frameW: 48, frameH: 48, southFrames: [16, 17, 18], northFrames: [0, 1, 2], footprint: [1, 1], heightLifts: 1 },
    // 16. Wild Reptile: Serpent / Snake
    { id: "snake", name: "Serpent", shapeId: 530, frameW: 96, frameH: 96, southFrames: [16, 17, 18], northFrames: [0, 1, 2], footprint: [1, 1], heightLifts: 1 }
];

for (const creature of wildlifeList) {
    const pngPath = path.join(charDir, `$U7_${creature.name.replace(/\s+/g, '')}.png`);
    const jsonPath = path.join(charDir, `$U7_${creature.name.replace(/\s+/g, '')}.json`);
    buildCreatureSheet(creature, pngPath, jsonPath);
}

console.log(`\nSuccessfully built all ${wildlifeList.length} Dwarf Fortress wildlife character sheets!`);
