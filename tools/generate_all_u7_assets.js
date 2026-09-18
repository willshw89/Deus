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
                if (cIdx !== 255 && destX + i >= 0 && destX + i < w && destY >= 0 && destY < h) {
                    const idx = (destY * w + destX + i) * 4;
                    const c = pal[cIdx];
                    pixels[idx] = c.r;
                    pixels[idx + 1] = c.g;
                    pixels[idx + 2] = c.b;
                    pixels[idx + 3] = 255;
                    indices[destY * w + destX + i] = cIdx;
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
                            indices[py * w + px] = cIdx;
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
                            indices[py * w + px] = cIdx;
                        }
                    }
                }
                readTotal += c;
            }
        }
    }
    return { width: w, height: h, pixels, indices, numFrames, xleft, yabove, xright, ybelow };
}

// Decode flat 8x8 ground tile (shapes 0-149)
function decodeFlatTile(shapeId, frameIdx = 0) {
    const off = shapesBytes.readUInt32LE(128 + shapeId * 8);
    const len = shapesBytes.readUInt32LE(128 + shapeId * 8 + 4);
    if (off === 0 || len === 0) return null;
    const numFrames = Math.floor(len / 64);
    if (frameIdx >= numFrames) return null;

    const tileOffset = off + frameIdx * 64;
    const pixels = Buffer.alloc(8 * 8 * 4);
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            const cIdx = shapesBytes[tileOffset + y * 8 + x];
            const col = pal[cIdx];
            const idx = (y * 8 + x) * 4;
            pixels[idx] = col.r;
            pixels[idx + 1] = col.g;
            pixels[idx + 2] = col.b;
            pixels[idx + 3] = 255;
        }
    }
    return { width: 8, height: 8, pixels, numFrames };
}

// Build aligned scenery RMMZ sheet with exact physical collision anchor
function buildScenerySheet(shapeId, outPath, options = {}) {
    const dec = decodeShape(shapeId, options.frame || 0);
    if (!dec) throw new Error(`Could not decode shape ${shapeId}`);

    const scale = 3;
    const scaledW = dec.width * scale;
    const scaledH = dec.height * scale;
    const frameW = options.frameW;
    const frameH = options.frameH;

    const totalW = frameW * 3;
    const totalH = frameH * 4;
    const sheetBuf = Buffer.alloc(totalW * totalH * 4, 0);

    const scaledAnchorX = dec.xleft * scale;
    const offsetX = Math.floor(frameW / 2 - scaledAnchorX);
    const offsetY = frameH - scaledH - (options.bottomPad || 0);

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
            const originX = col * frameW;
            const originY = row * frameH;

            for (let y = 0; y < dec.height; y++) {
                for (let x = 0; x < dec.width; x++) {
                    const srcIdx = (y * dec.width + x) * 4;
                    const a = dec.pixels[srcIdx + 3];
                    if (a === 0) continue;
                    const r = dec.pixels[srcIdx];
                    const g = dec.pixels[srcIdx + 1];
                    const b = dec.pixels[srcIdx + 2];

                    for (let dy = 0; dy < scale; dy++) {
                        for (let dx = 0; dx < scale; dx++) {
                            const destX = originX + offsetX + x * scale + dx;
                            const destY = originY + offsetY + y * scale + dy;
                            if (destX >= originX && destX < originX + frameW && destY >= originY && destY < originY + frameH) {
                                const idx = (destY * totalW + destX) * 4;
                                sheetBuf[idx] = r;
                                sheetBuf[idx + 1] = g;
                                sheetBuf[idx + 2] = b;
                                sheetBuf[idx + 3] = 255;
                            }
                        }
                    }
                }
            }
        }
    }

    writePNG(outPath, totalW, totalH, sheetBuf);
    console.log(`[U7 Scenery] Built ${path.basename(outPath)} from shape ${shapeId}`);
}

// Build 4-directional 2.5D character sheet (E/W transposed, 45° up-left lean)
function buildHumanoidSheet(shapeId, outPath) {
    const rawFrames = {};
    for (const f of [0, 1, 2, 16, 17, 18]) {
        rawFrames[f] = decodeShape(shapeId, f);
    }

    const scale = 3;
    const frameW = 96;
    const frameH = 96;
    const totalW = frameW * 3;
    const totalH = frameH * 4;
    const sheetBuf = Buffer.alloc(totalW * totalH * 4, 0);

    const rows = [
        { frames: [16, 17, 18], transpose: false }, // South
        { frames: [0, 1, 2],    transpose: true  }, // West
        { frames: [16, 17, 18], transpose: true  }, // East
        { frames: [0, 1, 2],    transpose: false }  // North
    ];

    for (let r = 0; r < 4; r++) {
        const cfg = rows[r];
        for (let c = 0; c < 3; c++) {
            const fIdx = cfg.frames[c];
            let f = rawFrames[fIdx];
            if (!f) continue;

            let fw = f.width, fh = f.height;
            let fPixels = f.pixels;

            if (cfg.transpose) {
                // Swap x and y
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
            const offsetY = frameH - fh * scale - 2;

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
                                const idx = (destY * totalW + destX) * 4;
                                sheetBuf[idx] = rCol;
                                sheetBuf[idx + 1] = gCol;
                                sheetBuf[idx + 2] = bCol;
                                sheetBuf[idx + 3] = 255;
                            }
                        }
                    }
                }
            }
        }
    }

    writePNG(outPath, totalW, totalH, sheetBuf);
    console.log(`[U7 Humanoid] Built ${path.basename(outPath)} from shape ${shapeId}`);
}

const charDir = path.join(__dirname, '..', 'game', 'img', 'characters');
const sysDir = path.join(__dirname, '..', 'game', 'img', 'system');
const tileDir = path.join(__dirname, '..', 'game', 'img', 'tilesets');

// 1. AR-021: Felled Tree Stump
buildScenerySheet(313, path.join(charDir, '!$TreeStump.png'), { frameW: 144, frameH: 144 });

// 2. AR-042: Cave Mouth Surface (Ways down)
buildScenerySheet(389, path.join(charDir, '!$CaveMouth.png'), { frameW: 144, frameH: 96 });

// 3. AR-043: Cave Way Up (Ladder / stairs)
buildScenerySheet(705, path.join(charDir, '!$CaveLadder.png'), { frameW: 96, frameH: 96 });

// 4. AR-044: Cave Ore Vein / Mineral Outcrop
buildScenerySheet(916, path.join(charDir, '!$IronOreVein.png'), { frameW: 96, frameH: 96 });

// 5. AR-050: Generic People / Arrivals / Visitors
buildHumanoidSheet(720, path.join(charDir, '$U7_Guard.png'));
buildHumanoidSheet(265, path.join(charDir, '$U7_Townsman.png'));
buildHumanoidSheet(460, path.join(charDir, '$U7_Ranger.png'));

// Also copy $U7_Townsman to People1 stand-in if desired
fs.copyFileSync(path.join(charDir, '$U7_Townsman.png'), path.join(charDir, '$People1.png'));

// 6. AR-030: Look Cursor (48x48 cell outline with 2-frame pulse)
function buildLookCursor(outPath) {
    const w = 96; // 2 frames of 48x48
    const h = 48;
    const buf = Buffer.alloc(w * h * 4, 0);

    // Frame 0: Bright gold cell border
    // Frame 1: Pulse pale gold border
    const colors = [
        { r: 255, g: 215, b: 0 },  // gold
        { r: 255, g: 255, b: 180 } // pale gold
    ];

    for (let f = 0; f < 2; f++) {
        const ox = f * 48;
        const c = colors[f];

        for (let x = 0; x < 48; x++) {
            for (let y = 0; y < 48; y++) {
                // 3px thick border outline
                const isBorder = (x < 3 || x >= 45 || y < 3 || y >= 45);
                // Corner brackets
                const isCorner = ((x < 12 || x >= 36) && (y < 6 || y >= 42)) ||
                                 ((y < 12 || y >= 36) && (x < 6 || x >= 42));

                if (isBorder || isCorner) {
                    const idx = (y * w + (ox + x)) * 4;
                    buf[idx] = c.r;
                    buf[idx + 1] = c.g;
                    buf[idx + 2] = c.b;
                    buf[idx + 3] = 255;
                }
            }
        }
    }

    writePNG(outPath, w, h, buf);
    console.log(`[U7 UI] Built ${path.basename(outPath)} (Look Cursor)`);
}
buildLookCursor(path.join(sysDir, 'U7_Cursor.png'));

// 7. AR-031: Unit Selection Marker (48x48 cell bracket)
function buildSelectMarker(outPath) {
    const w = 48;
    const h = 48;
    const buf = Buffer.alloc(w * h * 4, 0);
    const c = { r: 50, g: 220, b: 255 }; // Cyan / diamond highlight

    for (let x = 0; x < 48; x++) {
        for (let y = 0; y < 48; y++) {
            // 4 corner brackets
            const isCorner = ((x <= 8 || x >= 39) && (y <= 3 || y >= 44)) ||
                             ((y <= 8 || y >= 39) && (x <= 3 || x >= 44));
            if (isCorner) {
                const idx = (y * w + x) * 4;
                buf[idx] = c.r;
                buf[idx + 1] = c.g;
                buf[idx + 2] = c.b;
                buf[idx + 3] = 255;
            }
        }
    }
    writePNG(outPath, w, h, buf);
    console.log(`[U7 UI] Built ${path.basename(outPath)} (Selection Marker)`);
}
buildSelectMarker(path.join(sysDir, 'U7_Select.png'));

// 8. AR-033: Authentic U7 Carved Oak & Parchment Window Skin (Window.png, 192x192)
function buildU7WindowSkin(outPath) {
    const w = 192, h = 192;
    const buf = Buffer.alloc(w * h * 4, 0);

    // Warm aged parchment palette
    const parchmentDark = { r: 180, g: 154, b: 120 };
    const parchmentMid  = { r: 210, g: 190, b: 155 };
    const parchmentLight= { r: 235, g: 220, b: 190 };

    // Dark carved oak wood palette
    const oakShadow = { r: 35, g: 20, b: 10 };
    const oakMid    = { r: 65, g: 40, b: 20 };
    const oakLight  = { r: 110, g: 75, b: 40 };
    const goldLeaf  = { r: 215, g: 175, b: 55 };

    // Part A: Top-left 96x96 background (Window content backdrop)
    // Dark aged parchment with subtle noise / gradient
    for (let y = 0; y < 96; y++) {
        for (let x = 0; x < 96; x++) {
            const idx = (y * w + x) * 4;
            // Slightly translucent dark oak parchment
            const noise = ((x * 17 + y * 31) % 11) - 5;
            buf[idx]     = Math.max(0, Math.min(255, 30 + noise));
            buf[idx + 1] = Math.max(0, Math.min(255, 20 + noise));
            buf[idx + 2] = Math.max(0, Math.min(255, 12 + noise));
            buf[idx + 3] = 230; // Solid semi-transparent backdrop
        }
    }

    // Part B: Top-right 96x96 window frame (Carved Oak with Gold Trim)
    // In RMMZ:
    // Frame occupies [96, 0] to [191, 95].
    // Corners are 24x24 px.
    // Edges are between corners.
    for (let y = 0; y < 96; y++) {
        for (let x = 0; x < 96; x++) {
            const destX = 96 + x;
            const destY = y;
            const idx = (destY * w + destX) * 4;

            // Frame border width is 8px
            const isOuter = (x < 2 || x >= 94 || y < 2 || y >= 94);
            const isWood  = (x < 8 || x >= 88 || y < 8 || y >= 88);
            const isInnerGold = ((x === 7 || x === 88) && (y >= 7 && y <= 88)) ||
                                ((y === 7 || y === 88) && (x >= 7 && x <= 88));

            if (isOuter) {
                buf[idx] = oakShadow.r; buf[idx+1] = oakShadow.g; buf[idx+2] = oakShadow.b; buf[idx+3] = 255;
            } else if (isInnerGold) {
                buf[idx] = goldLeaf.r; buf[idx+1] = goldLeaf.g; buf[idx+2] = goldLeaf.b; buf[idx+3] = 255;
            } else if (isWood) {
                // Wood grain
                const grain = (x + y) % 4 === 0 ? oakLight : oakMid;
                buf[idx] = grain.r; buf[idx+1] = grain.g; buf[idx+2] = grain.b; buf[idx+3] = 255;
            }
        }
    }

    // Part C: Cursor selection highlight (at [96, 96] to [143, 143], 48x48 px)
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const destX = 96 + x;
            const destY = 96 + y;
            const idx = (destY * w + destX) * 4;

            const isBorder = (x < 3 || x >= 45 || y < 3 || y >= 45);
            if (isBorder) {
                buf[idx] = goldLeaf.r; buf[idx+1] = goldLeaf.g; buf[idx+2] = goldLeaf.b; buf[idx+3] = 255;
            } else {
                // Gold sheen fill
                buf[idx] = 180; buf[idx+1] = 140; buf[idx+2] = 40; buf[idx+3] = 80;
            }
        }
    }

    // Part D: Down arrow pause sign (at [144, 96] to [167, 119], 24x24 px)
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 24; x++) {
            const destX = 144 + x;
            const destY = 96 + y + 4;
            const idx = (destY * w + destX) * 4;
            // Downward pointing triangle
            if (y < 12 && x >= y && x <= 23 - y) {
                buf[idx] = goldLeaf.r; buf[idx+1] = goldLeaf.g; buf[idx+2] = goldLeaf.b; buf[idx+3] = 255;
            }
        }
    }

    // Part E: Palette swatches at bottom-right ([96, 144] to [191, 191])
    // Copy existing standard message color swatches or fill with warm medieval text colors
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 8; col++) {
            const colorIdx = (row * 8 + col);
            // Default RMMZ system colors
            const ox = 96 + col * 12;
            const oy = 144 + row * 12;
            const swColor = colorIdx === 0 ? { r: 255, g: 255, b: 255 } : // Normal white text
                            (colorIdx === 1 ? { r: 100, g: 180, b: 255 } :
                            (colorIdx === 2 ? { r: 255, g: 120, b: 120 } :
                            (colorIdx === 3 ? { r: 120, g: 240, b: 120 } :
                            (colorIdx === 4 ? { r: 140, g: 200, b: 255 } :
                            (colorIdx === 14 ? { r: 255, g: 204, b: 34 } : { r: 200, g: 200, b: 200 })))));

            for (let cy = 0; cy < 12; cy++) {
                for (let cx = 0; cx < 12; cx++) {
                    const idx = ((oy + cy) * w + (ox + cx)) * 4;
                    buf[idx] = swColor.r; buf[idx+1] = swColor.g; buf[idx+2] = swColor.b; buf[idx+3] = 255;
                }
            }
        }
    }

    writePNG(outPath, w, h, buf);
    console.log(`[U7 UI] Built ${path.basename(outPath)} (Carved Oak & Parchment Windowskin)`);
}
buildU7WindowSkin(path.join(sysDir, 'Window.png'));

// 9. AR-001 / AR-040: Ground Tileset Autotiles (768x576)
// Sidecar JSON writer helper
function writeSidecar(jsonPath, data) {
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
}

// Write sidecars for character/scenery sheets
writeSidecar(path.join(charDir, '!$TreeStump.json'), {
    id: "tree_stump",
    frameWidth: 144,
    frameHeight: 144,
    anchor: [72, 144],
    footprint: [1, 1],
    heightLifts: 1,
    facings: ["S"],
    animations: { "stump": [0] },
    frameMs: 150,
    standInSource: "SHAPES.VGA shape 313 frame 0"
});
fs.copyFileSync(path.join(charDir, '!$TreeStump.json'), path.join(charDir, '!$U7_TreeStump.json'));
fs.copyFileSync(path.join(charDir, '!$TreeStump.png'), path.join(charDir, '!$U7_TreeStump.png'));

writeSidecar(path.join(charDir, '!$CaveMouth.json'), {
    id: "cave_mouth",
    frameWidth: 144,
    frameHeight: 96,
    anchor: [72, 96],
    footprint: [1, 1],
    heightLifts: 2,
    facings: ["S"],
    animations: { "open": [0] },
    frameMs: 150,
    standInSource: "SHAPES.VGA shape 389 frame 0"
});
fs.copyFileSync(path.join(charDir, '!$CaveMouth.json'), path.join(charDir, '!$U7_CaveMouth.json'));
fs.copyFileSync(path.join(charDir, '!$CaveMouth.png'), path.join(charDir, '!$U7_CaveMouth.png'));

writeSidecar(path.join(charDir, '!$CaveLadder.json'), {
    id: "cave_ladder",
    frameWidth: 96,
    frameHeight: 96,
    anchor: [48, 96],
    footprint: [1, 1],
    heightLifts: 3,
    facings: ["S"],
    animations: { "ladder": [0] },
    frameMs: 150,
    standInSource: "SHAPES.VGA shape 705 frame 0"
});
fs.copyFileSync(path.join(charDir, '!$CaveLadder.json'), path.join(charDir, '!$U7_CaveLadder.json'));
fs.copyFileSync(path.join(charDir, '!$CaveLadder.png'), path.join(charDir, '!$U7_CaveLadder.png'));

writeSidecar(path.join(charDir, '!$IronOreVein.json'), {
    id: "iron_ore_vein",
    frameWidth: 96,
    frameHeight: 96,
    anchor: [48, 96],
    footprint: [1, 1],
    heightLifts: 2,
    facings: ["S"],
    animations: { "idle": [0] },
    frameMs: 150,
    standInSource: "SHAPES.VGA shape 916 frame 0"
});
fs.copyFileSync(path.join(charDir, '!$IronOreVein.json'), path.join(charDir, '!$U7_IronOreVein.json'));
fs.copyFileSync(path.join(charDir, '!$IronOreVein.png'), path.join(charDir, '!$U7_IronOreVein.png'));

writeSidecar(path.join(charDir, '$U7_Guard.json'), {
    id: "human_guard",
    frameWidth: 96,
    frameHeight: 96,
    anchor: [48, 94],
    footprint: [1, 1],
    heightLifts: 5,
    facings: ["S", "W", "E", "N"],
    animations: { "stand": [1], "walk": [0, 1, 2, 1] },
    frameMs: 150,
    standInSource: "SHAPES.VGA shape 720 frames 0-2, 16-18 (transposed E/W)"
});

writeSidecar(path.join(charDir, '$U7_Townsman.json'), {
    id: "human_townsman",
    frameWidth: 96,
    frameHeight: 96,
    anchor: [48, 94],
    footprint: [1, 1],
    heightLifts: 5,
    facings: ["S", "W", "E", "N"],
    animations: { "stand": [1], "walk": [0, 1, 2, 1] },
    frameMs: 150,
    standInSource: "SHAPES.VGA shape 265 frames 0-2, 16-18 (transposed E/W)"
});

writeSidecar(path.join(charDir, '$U7_Ranger.json'), {
    id: "human_ranger",
    frameWidth: 96,
    frameHeight: 96,
    anchor: [48, 94],
    footprint: [1, 1],
    heightLifts: 5,
    facings: ["S", "W", "E", "N"],
    animations: { "stand": [1], "walk": [0, 1, 2, 1] },
    frameMs: 150,
    standInSource: "SHAPES.VGA shape 460 frames 0-2, 16-18 (transposed E/W)"
});

// UI Window skin Stand-in copy
fs.copyFileSync(path.join(sysDir, 'Window.png'), path.join(sysDir, 'U7_Window.png'));

// 9. AR-001 / AR-040: Ground Tileset Autotiles (768x576)
// In RMMZ A2: 8 columns (96px each) x 4 rows (144px each)
function buildU7GroundAutotileA2(outPath) {
    const w = 768, h = 576;
    const buf = Buffer.alloc(w * h * 4, 0);

    const grassTiles = [decodeFlatTile(4, 0), decodeFlatTile(4, 1), decodeFlatTile(4, 2), decodeFlatTile(4, 3)];
    const dirtTiles  = [decodeFlatTile(23, 0), decodeFlatTile(23, 1), decodeFlatTile(23, 2), decodeFlatTile(23, 3)];
    const caveTiles  = [decodeFlatTile(5, 0), decodeFlatTile(5, 1), decodeFlatTile(5, 2), decodeFlatTile(5, 3)];

    // Paint an authentic 96x144 RMMZ autotile block (2x3 cells of 48x48)
    function paintAutotileBlock(bx, by, tileSet) {
        for (let cellY = 0; cellY < 3; cellY++) {
            for (let cellX = 0; cellX < 2; cellX++) {
                const ox = bx * 96 + cellX * 48;
                const oy = by * 144 + cellY * 48;

                // 16x16 native = 2x2 grid of 8x8 tiles
                for (let py = 0; py < 16; py++) {
                    for (let px = 0; px < 16; px++) {
                        const subX = Math.floor(px / 8);
                        const subY = Math.floor(py / 8);
                        const t0 = tileSet[(subY * 2 + subX) % tileSet.length];

                        const tileX = px % 8;
                        const tileY = py % 8;
                        const sIdx = (tileY * 8 + tileX) * 4;
                        const r = t0.pixels[sIdx];
                        const g = t0.pixels[sIdx + 1];
                        const b = t0.pixels[sIdx + 2];

                        // 3x integer nearest-neighbor upscale
                        for (let dy = 0; dy < 3; dy++) {
                            for (let dx = 0; dx < 3; dx++) {
                                const destX = ox + px * 3 + dx;
                                const destY = oy + py * 3 + dy;
                                const dIdx = (destY * w + destX) * 4;
                                buf[dIdx] = r;
                                buf[dIdx + 1] = g;
                                buf[dIdx + 2] = b;
                                buf[dIdx + 3] = 255;
                            }
                        }
                    }
                }
            }
        }
    }

    // Fill all 8x4 autotile slots
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 8; c++) {
            if (r === 0) {
                // Top row: Grass and Dirt paths
                paintAutotileBlock(c, r, (c % 2 === 0) ? grassTiles : dirtTiles);
            } else if (r === 1) {
                // Row 1: Cave floors and rock floors
                paintAutotileBlock(c, r, (c % 2 === 0) ? caveTiles : dirtTiles);
            } else {
                // Other rows
                paintAutotileBlock(c, r, (c % 2 === 0) ? grassTiles : caveTiles);
            }
        }
    }

    writePNG(outPath, w, h, buf);
    console.log(`[U7 Tileset] Built ${path.basename(outPath)} (768x576 Autotile A2)`);
}

buildU7GroundAutotileA2(path.join(tileDir, 'U7_Ground_A2.png'));
fs.copyFileSync(path.join(tileDir, 'U7_Ground_A2.png'), path.join(tileDir, 'U7_Outside_A2.png'));
fs.copyFileSync(path.join(tileDir, 'U7_Ground_A2.png'), path.join(tileDir, 'U7_Dungeon_A2.png'));

console.log("All U7 2.5D game assets successfully generated and deployed!");

