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

function buildGroundItemSheet(itemConfig, outPath, sidecarPath) {
    const dec = decodeShape(itemConfig.shapeId, itemConfig.frame || 0);
    if (!dec) throw new Error(`Could not decode shape ${itemConfig.shapeId} frame ${itemConfig.frame || 0}`);

    const scale = itemConfig.scale || 3;
    const scaledW = dec.width * scale;
    const scaledH = dec.height * scale;

    const frameW = itemConfig.frameW || Math.max(48, Math.ceil((scaledW + 6) / 48) * 48);
    const frameH = itemConfig.frameH || Math.max(48, Math.ceil((scaledH + 6) / 48) * 48);
    const totalW = frameW * 3;
    const totalH = frameH * 4;
    const sheetBuf = Buffer.alloc(totalW * totalH * 4, 0);

    // Center horizontally, grounded vertically with comfortable bottom padding
    const offsetX = Math.floor((frameW - scaledW) / 2);
    const offsetY = frameH - scaledH - (itemConfig.bottomPad !== undefined ? itemConfig.bottomPad : 4);

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
        id: itemConfig.id,
        name: itemConfig.name,
        category: "resource_item",
        frameWidth: frameW,
        frameHeight: frameH,
        anchor: [Math.floor(frameW / 2), frameH],
        footprint: [1, 1],
        heightLifts: 1,
        facings: ["S"],
        animations: { "ground": [0] },
        frameMs: 150,
        standInSource: `SHAPES.VGA shape ${itemConfig.shapeId} frame ${itemConfig.frame || 0} (${scale}x integer nearest-neighbor)`
    };

    fs.writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2));
    console.log(`[U7 Item] Built ${path.basename(outPath)} (${itemConfig.name}) [frame ${frameW}x${frameH}, scaled ${scaledW}x${scaledH}]`);
}

const charDir = path.join(__dirname, '..', 'game', 'img', 'characters');

const resourceItems = [
    // Forestry / Wood
    { id: "item_wood_log", name: "Wood Log", shapeId: 923, frame: 0 },
    { id: "item_firewood", name: "Firewood", shapeId: 984, frame: 0 },
    
    // Stone / Masonry
    { id: "item_rough_stone", name: "Rough Stone", shapeId: 815, frame: 0 },
    
    // Ores & Minerals
    { id: "item_iron_ore", name: "Iron Ore", shapeId: 916, frame: 0 },
    { id: "item_lead_ore", name: "Lead Ore", shapeId: 915, frame: 0 },
    { id: "item_blackrock", name: "Blackrock", shapeId: 914, frame: 0 },
    { id: "item_gold_nugget", name: "Gold Nugget", shapeId: 645, frame: 0 },
    { id: "item_metal_bar", name: "Metal Bar", shapeId: 646, frame: 0 },
    
    // Gems & Crystals
    { id: "item_rough_gem", name: "Rough Gem", shapeId: 760, frame: 0 },
    { id: "item_cut_gem", name: "Cut Gem", shapeId: 728, frame: 0 },
    
    // Agricultural & Plant Fibers
    { id: "item_plant_fiber", name: "Plant Fiber", shapeId: 654, frame: 0 },
    { id: "item_wool_fleece", name: "Wool Fleece", shapeId: 653, frame: 0 },
    { id: "item_straw_bundle", name: "Straw Bundle", shapeId: 1023, frame: 0 },
    { id: "item_seed_pouch", name: "Seed Pouch", shapeId: 677, frame: 0 },
    
    // Foraged Food
    { id: "item_wild_berries", name: "Wild Berries", shapeId: 377, frame: 21 },
    { id: "item_tree_fruit", name: "Tree Fruit", shapeId: 377, frame: 20 },
    { id: "item_cave_mushroom", name: "Cave Mushroom", shapeId: 671, frame: 0 },
    { id: "item_root_vegetable", name: "Root Vegetable", shapeId: 377, frame: 18 },
    
    // Animal & Butchery Products
    { id: "item_raw_meat", name: "Raw Meat", shapeId: 377, frame: 23 },
    { id: "item_haunch_meat", name: "Haunch Meat", shapeId: 377, frame: 8 },
    { id: "item_fresh_fish", name: "River Fish", shapeId: 509, frame: 0 },
    { id: "item_animal_bone", name: "Animal Bone", shapeId: 507, frame: 9 },
    { id: "item_leather_hide", name: "Leather Hide", shapeId: 851, frame: 0 }
];

for (const item of resourceItems) {
    const filename = `!$U7_Item_${item.name.replace(/\s+/g, '')}`;
    const pngPath = path.join(charDir, `${filename}.png`);
    const jsonPath = path.join(charDir, `${filename}.json`);
    buildGroundItemSheet(item, pngPath, jsonPath);
}

console.log(`\nSuccessfully built all ${resourceItems.length} Dwarf Fortress loose ground resource items!`);
