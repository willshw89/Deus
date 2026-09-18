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

// ----------------------------------------------------------------------------
// 1. Build Static Flora / Ground Object Sheet
// ----------------------------------------------------------------------------
function buildStaticSheet(config, outPath, sidecarPath) {
    const dec = decodeShape(config.shapeId, config.frame || 0);
    if (!dec) throw new Error(`Could not decode shape ${config.shapeId}`);

    const scale = 3;
    const scaledW = dec.width * scale;
    const scaledH = dec.height * scale;

    const frameW = config.frameW || Math.max(48, Math.ceil((scaledW + 4) / 48) * 48);
    const frameH = config.frameH || Math.max(48, Math.ceil((scaledH + 4) / 48) * 48);
    const totalW = frameW * 3;
    const totalH = frameH * 4;
    const sheetBuf = Buffer.alloc(totalW * totalH * 4, 0);

    const offsetX = Math.floor((frameW - scaledW) / 2);
    const offsetY = frameH - scaledH - (config.bottomPad !== undefined ? config.bottomPad : 2);

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
            const originX = col * frameW;
            const originY = row * frameH;

            for (let y = 0; y < dec.height; y++) {
                for (let x = 0; x < dec.width; x++) {
                    const srcIdx = (y * dec.width + x) * 4;
                    if (dec.pixels[srcIdx + 3] === 0) continue;
                    let r = dec.pixels[srcIdx];
                    let g = dec.pixels[srcIdx + 1];
                    let b = dec.pixels[srcIdx + 2];

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
        heightLifts: config.heightLifts || 1,
        facings: ["S"],
        animations: { "standing": [0] },
        frameMs: 150,
        standInSource: `SHAPES.VGA shape ${config.shapeId} frame ${config.frame || 0} (3x integer nearest-neighbor)`
    };

    fs.writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2));
    console.log(`[Flora/Object] Built ${path.basename(outPath)} (${config.name}) [${frameW}x${frameH}]`);
}

// ----------------------------------------------------------------------------
// 2. Build 32-Frame Animated Creature / Faction Sheet
// East/West facings matrix coordinate transposition
// ----------------------------------------------------------------------------
function buildCreatureSheet(config, outPath, sidecarPath) {
    const scale = 3;
    const frameW = config.frameW;
    const frameH = config.frameH;
    const totalW = frameW * 3;
    const totalH = frameH * 4;
    const sheetBuf = Buffer.alloc(totalW * totalH * 4, 0);

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
                    let rCol = fPixels[srcIdx];
                    let gCol = fPixels[srcIdx + 1];
                    let bCol = fPixels[srcIdx + 2];

                    if (config.tint) {
                        rCol = Math.min(255, Math.round(rCol * config.tint[0]));
                        gCol = Math.min(255, Math.round(gCol * config.tint[1]));
                        bCol = Math.min(255, Math.round(bCol * config.tint[2]));
                    }

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

    const sidecar = {
        id: config.id,
        name: config.name,
        category: config.category || "creature",
        frameWidth: frameW,
        frameHeight: frameH,
        anchor: [Math.floor(frameW / 2), frameH],
        footprint: config.footprint || [1, 1],
        heightLifts: config.heightLifts || 2,
        facings: ["S", "W", "E", "N"],
        animations: {
            "walk_S": [0, 1, 2, 1],
            "walk_W": [3, 4, 5, 4],
            "walk_E": [6, 7, 8, 7],
            "walk_N": [9, 10, 11, 10]
        },
        frameMs: 150,
        standInSource: `SHAPES.VGA shape ${config.shapeId} (3x integer nearest-neighbor, transposed facings)`
    };

    fs.writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2));
    console.log(`[Creature/Faction] Built ${path.basename(outPath)} (${config.name}) [${frameW}x${frameH}]`);
}

const charDir = path.join(__dirname, '..', 'game', 'img', 'characters');

// 1. Build Small Flora & Ground Detail sheets:
const floraObjects = [
    { id: "grass_tuft", name: "TallGrass", shapeId: 321, frame: 0, frameW: 144, frameH: 144, heightLifts: 1 },
    { id: "reeds", name: "Reeds", shapeId: 323, frame: 0, frameW: 144, frameH: 144, heightLifts: 2 },
    { id: "flowers", name: "Wildflowers", shapeId: 314, frame: 0, frameW: 96, frameH: 96, heightLifts: 1 },
    { id: "rocks_small", name: "LooseStones", shapeId: 353, frame: 0, frameW: 96, frameH: 48, heightLifts: 1 },
    { id: "crystal_small", name: "SmallCrystals", shapeId: 747, frame: 1, frameW: 96, frameH: 96, tint: [0.75, 1.1, 1.4], heightLifts: 2 },
    { id: "gravel", name: "Gravel", shapeId: 353, frame: 0, frameW: 96, frameH: 48, tint: [0.7, 0.7, 0.7], heightLifts: 1 },
    { id: "bones", name: "OldBones", shapeId: 650, frame: 0, frameW: 96, frameH: 48, heightLifts: 1 }
];

for (const obj of floraObjects) {
    const filename = `!$U7_${obj.name}`;
    const pngPath = path.join(charDir, `${filename}.png`);
    const jsonPath = path.join(charDir, `${filename}.json`);
    buildStaticSheet(obj, pngPath, jsonPath);
}

// 2. Build Faction Species & Monsters
const creatures = [
    { id: "bog_horror", name: "BogHorror", category: "monster", shapeId: 381, frameW: 192, frameH: 192, southFrames: [16, 17, 18], northFrames: [0, 1, 2], footprint: [2, 2], heightLifts: 4 },
    { id: "goblin", name: "Goblin", category: "faction", shapeId: 506, frameW: 96, frameH: 96, southFrames: [16, 17, 18], northFrames: [0, 1, 2], footprint: [1, 1], heightLifts: 2 },
    { id: "orc", name: "Orc", category: "faction", shapeId: 505, frameW: 192, frameH: 192, southFrames: [16, 17, 18], northFrames: [0, 1, 2], footprint: [1, 1], heightLifts: 3 },
    { id: "gnome", name: "Gnome", category: "faction", shapeId: 521, frameW: 48, frameH: 48, southFrames: [16, 17, 18], northFrames: [0, 1, 2], footprint: [1, 1], heightLifts: 1 },
    { id: "automaton", name: "Automaton", category: "faction", shapeId: 525, frameW: 192, frameH: 240, southFrames: [16, 17, 18], northFrames: [0, 1, 2], footprint: [1, 1], heightLifts: 4 },
    { id: "cave_crawler", name: "CaveCrawler", category: "wildlife", shapeId: 513, frameW: 96, frameH: 96, southFrames: [16, 17, 18], northFrames: [0, 1, 2], footprint: [1, 1], heightLifts: 2 },
    { id: "cave_lurker", name: "CaveLurker", category: "wildlife", shapeId: 524, frameW: 192, frameH: 192, southFrames: [16, 17, 18], northFrames: [0, 1, 2], footprint: [1, 1], heightLifts: 3 }
];

for (const cr of creatures) {
    const filename = `$U7_${cr.name}`;
    const pngPath = path.join(charDir, `${filename}.png`);
    const jsonPath = path.join(charDir, `${filename}.json`);
    buildCreatureSheet(cr, pngPath, jsonPath);
}

console.log("\nAll Flora, Ground Detail, and Creature/Faction sheets successfully generated!");
