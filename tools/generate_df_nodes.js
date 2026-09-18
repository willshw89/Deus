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
    pal.push({
        r: Math.min(255, Math.round(palBytes[256 + i * 3] * 255 / 63.0)),
        g: Math.min(255, Math.round(palBytes[256 + i * 3 + 1] * 255 / 63.0)),
        b: Math.min(255, Math.round(palBytes[256 + i * 3 + 2] * 255 / 63.0))
    });
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

function buildNodeSheet(config, outPath, sidecarPath) {
    const dec = decodeShape(config.shapeId, config.frame || 0);
    if (!dec) throw new Error(`Could not decode shape ${config.shapeId}`);

    const scale = 3;
    const scaledW = dec.width * scale;
    const scaledH = dec.height * scale;

    const frameW = config.frameW || Math.max(48, Math.ceil((scaledW + 6) / 48) * 48);
    const frameH = config.frameH || Math.max(48, Math.ceil((scaledH + 6) / 48) * 48);
    const totalW = frameW * 3;
    const totalH = frameH * 4;
    const sheetBuf = Buffer.alloc(totalW * totalH * 4, 0);

    // Bottom grounded with slight floor clearance, centered horizontally
    const offsetX = Math.floor((frameW - scaledW) / 2);
    const offsetY = frameH - scaledH - (config.bottomPad !== undefined ? config.bottomPad : 2);

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
            const originX = col * frameW;
            const originY = row * frameH;

            for (let y = 0; y < dec.height; y++) {
                for (let x = 0; x < dec.width; x++) {
                    const srcIdx = (y * dec.width + x) * 4;
                    const a = dec.pixels[srcIdx + 3];
                    if (a === 0) continue;
                    let r = dec.pixels[srcIdx];
                    let g = dec.pixels[srcIdx + 1];
                    let b = dec.pixels[srcIdx + 2];

                    // Optional tinting (e.g. malachite/copper green or gold vein)
                    if (config.tint) {
                        r = Math.min(255, Math.round(r * config.tint[0]));
                        g = Math.min(255, Math.round(g * config.tint[1]));
                        b = Math.min(255, Math.round(b * config.tint[2]));
                    }

                    for (let dy = 0; dy < scale; dy++) {
                        for (let dx = 0; dx < scale; dx++) {
                            const destX = originX + offsetX + x * scale + dx;
                            const destY = originY + offsetY + y * scale + dy;
                            if (destX >= originX && destX < originX + frameW && destY >= originY && destY < originY + frameH) {
                                const dIdx = (destY * totalW + destX) * 4;
                                sheetBuf[dIdx] = r;
                                sheetBuf[dIdx + 1] = g;
                                sheetBuf[dIdx + 2] = b;
                                sheetBuf[dIdx + 3] = 255;
                            }
                        }
                    }
                }
            }
        }
    }

    writePNG(outPath, totalW, totalH, sheetBuf);

    const sidecar = {
        id: config.id,
        name: config.name,
        category: "world_object",
        frameWidth: frameW,
        frameHeight: frameH,
        anchor: [Math.floor(frameW / 2), frameH],
        footprint: config.footprint || [1, 1],
        heightLifts: config.heightLifts || 4,
        facings: ["S"],
        animations: { "standing": [0] },
        frameMs: 150,
        standInSource: `SHAPES.VGA shape ${config.shapeId} frame ${config.frame || 0} (3x integer nearest-neighbor)`
    };

    fs.writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2));
    console.log(`[U7 Node] Built ${path.basename(outPath)} (${config.name}) [frame ${frameW}x${frameH}, scaled ${scaledW}x${scaledH}]`);
}

const charDir = path.join(__dirname, '..', 'game', 'img', 'characters');

const nodes = [
    { id: "tree_savanna", name: "Flat-top tree", shapeId: 310, frame: 0, frameW: 192, frameH: 192, heightLifts: 8, footprint: [1, 1] },
    { id: "dead_tree", name: "Dead tree", shapeId: 325, frame: 0, frameW: 192, frameH: 192, heightLifts: 8, footprint: [1, 1] },
    { id: "tree_swamp", name: "Swamp tree", shapeId: 332, frame: 0, frameW: 240, frameH: 240, heightLifts: 10, footprint: [2, 2] },
    { id: "tree_tropical", name: "Broadleaf giant", shapeId: 181, frame: 0, frameW: 240, frameH: 240, heightLifts: 12, footprint: [2, 2] },
    { id: "bush", name: "Shrub", shapeId: 619, frame: 0, frameW: 192, frameH: 192, heightLifts: 4, footprint: [1, 1] },
    { id: "cave_boulder", name: "Cave Boulder", shapeId: 343, frame: 0, frameW: 192, frameH: 192, heightLifts: 6, footprint: [2, 2] },
    { id: "crystal", name: "Crystal Spire", shapeId: 747, frame: 0, frameW: 96, frameH: 192, heightLifts: 8, footprint: [1, 1] },
    { id: "copper_deposit", name: "Malachite Outcrop", shapeId: 341, frame: 0, frameW: 144, frameH: 96, tint: [0.35, 1.15, 0.75], heightLifts: 3, footprint: [1, 1] },
    { id: "gold_deposit", name: "Gold Vein Outcrop", shapeId: 341, frame: 0, frameW: 144, frameH: 96, tint: [1.25, 1.05, 0.25], heightLifts: 3, footprint: [1, 1] }
];

for (const n of nodes) {
    const filename = `!$U7_${n.name.replace(/\s+/g, '')}`;
    const pngPath = path.join(charDir, `${filename}.png`);
    const jsonPath = path.join(charDir, `${filename}.json`);
    buildNodeSheet(n, pngPath, jsonPath);
}

console.log(`\nSuccessfully built all ${nodes.length} Dwarf Fortress world object & harvestable node sheets!`);

