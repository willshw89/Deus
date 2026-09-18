const fs = require('fs');
const path = require('path');
const { writePNG } = require('./png_util');

// Load U7 Daylight Palette from art/palette/uf.hex
const paletteHex = fs.readFileSync(path.join(__dirname, '..', 'art', 'palette', 'uf.hex'), 'utf8')
    .split(/\r?\n/)
    .filter(line => line.startsWith('#'))
    .map(hex => ({
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16)
    }));

function snapToPalette(r, g, b) {
    let bestDist = Infinity;
    let bestColor = paletteHex[0];
    for (const c of paletteHex) {
        // Weighted Euclidean color distance
        const dr = (c.r - r) * 0.30;
        const dg = (c.g - g) * 0.59;
        const db = (c.b - b) * 0.11;
        const dist = dr * dr + dg * dg + db * db;
        if (dist < bestDist) {
            bestDist = dist;
            bestColor = c;
        }
    }
    return bestColor;
}

// Pixel Canvas at 1x native resolution
class NativeCanvas {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.pixels = new Uint8Array(width * height * 4); // RGBA
    }

    setPixel(x, y, r, g, b, a = 255) {
        x = Math.round(x);
        y = Math.round(y);
        if (x < 0 || x >= this.width || y < 0 || y >= this.height || a === 0) return;
        const snapped = snapToPalette(r, g, b);
        const idx = (y * this.width + x) * 4;
        this.pixels[idx] = snapped.r;
        this.pixels[idx + 1] = snapped.g;
        this.pixels[idx + 2] = snapped.b;
        this.pixels[idx + 3] = 255;
    }

    fillCircle(cx, cy, radius, r, g, b) {
        const r2 = radius * radius;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy <= r2) {
                    this.setPixel(cx + dx, cy + dy, r, g, b);
                }
            }
        }
    }

    // U7 2.5D Prismatic Box: Top (x, y, w, d) at height z, leaning 45° up-left (4px up, 4px left per lift)
    draw25DBox(baseX, baseY, w, d, heightLifts, topCol, southCol, eastCol) {
        const liftShiftX = -4 * heightLifts;
        const liftShiftY = -4 * heightLifts;

        // 1. South Face (w wide, heightLifts tall, vertical)
        // Extends from base top-left to base bottom-right, up to height
        for (let dy = 0; dy <= heightLifts * 4; dy++) {
            for (let dx = 0; dx < w; dx++) {
                const px = baseX + dx - (dy / 4) * 4;
                const py = baseY + d - dy;
                this.setPixel(px, py, southCol.r, southCol.g, southCol.b);
            }
        }

        // 2. East Face (d deep, heightLifts tall)
        for (let dy = 0; dy <= heightLifts * 4; dy++) {
            for (let dd = 0; dd < d; dd++) {
                const px = baseX + w + dd - (dy / 4) * 4;
                const py = baseY + dd - dy;
                this.setPixel(px, py, eastCol.r, eastCol.g, eastCol.b);
            }
        }

        // 3. Top Face (w wide, d deep, shifted by liftShiftX, liftShiftY)
        const topX = baseX + liftShiftX;
        const topY = baseY + liftShiftY;
        for (let dy = 0; dy < d; dy++) {
            for (let dx = 0; dx < w; dx++) {
                this.setPixel(topX + dx + dy, topY + dy, topCol.r, topCol.g, topCol.b);
            }
        }
    }

    // Nearest-neighbor 3x upscale into RPG Maker MZ 3x4 sprite sheet
    toRMMZSheet(outPath) {
        const sheetCols = 3;
        const sheetRows = 4;
        const frameW = this.width * 3;
        const frameH = this.height * 3;
        const totalW = frameW * sheetCols;
        const totalH = frameH * sheetRows;
        const sheetBuf = Buffer.alloc(totalW * totalH * 4, 0);

        for (let row = 0; row < sheetRows; row++) {
            for (let col = 0; col < sheetCols; col++) {
                const originX = col * frameW;
                const originY = row * frameH;

                for (let y = 0; y < this.height; y++) {
                    for (let x = 0; x < this.width; x++) {
                        const srcIdx = (y * this.width + x) * 4;
                        const a = this.pixels[srcIdx + 3];
                        if (a === 0) continue;
                        const r = this.pixels[srcIdx];
                        const g = this.pixels[srcIdx + 1];
                        const b = this.pixels[srcIdx + 2];

                        // Draw 3x3 pixel block
                        for (let dy = 0; dy < 3; dy++) {
                            for (let dx = 0; dx < 3; dx++) {
                                const destX = originX + x * 3 + dx;
                                const destY = originY + y * 3 + dy;
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

        writePNG(outPath, totalW, totalH, sheetBuf);
        console.log(`Generated 2.5D sprite sheet: ${outPath} (${totalW}x${totalH}, frame: ${frameW}x${frameH})`);
    }
}

// 1. Generate 2.5D Timber Oak Tree (!$TimberOak.png)
// Native 64x64 -> 192x192 frame, 576x768 sheet
function generateTimberOak(outPath) {
    const cvs = new NativeCanvas(64, 64);
    const baseX = 38;
    const baseY = 56;

    // Gnarled root base on square ground grid
    for (let x = 32; x <= 46; x++) {
        for (let y = 52; y <= 58; y++) {
            const d = Math.abs(x - 39) + Math.abs(y - 55);
            if (d <= 6) cvs.setPixel(x, y, 64, 40, 24);
        }
    }
    // Mossy roots
    cvs.setPixel(33, 56, 48, 72, 24);
    cvs.setPixel(44, 57, 48, 72, 24);

    // Leaning Oak Trunk (45° up-left: 4px up, 4px left)
    const trunkHeight = 6; // 6 lifts
    for (let z = 0; z <= trunkHeight; z++) {
        const tx = baseX - z * 4;
        const ty = baseY - z * 4;
        for (let ox = -3; ox <= 3; ox++) {
            for (let oy = -2; oy <= 2; oy++) {
                if (ox * ox + oy * oy <= 10) {
                    // Shading: Top-left highlight, south midtone, east shadow
                    if (ox <= -1) cvs.setPixel(tx + ox, ty + oy, 96, 64, 40);
                    else if (ox >= 1) cvs.setPixel(tx + ox, ty + oy, 48, 28, 16);
                    else cvs.setPixel(tx + ox, ty + oy, 72, 48, 30);
                }
            }
        }
    }

    // Branch limbs spreading up-left
    const crownCenterX = baseX - trunkHeight * 4;
    const crownCenterY = baseY - trunkHeight * 4 - 6;

    // Leaf canopy clusters (spherical volumes with U7 2.5D lighting)
    const clusters = [
        { x: crownCenterX, y: crownCenterY, r: 15 },
        { x: crownCenterX - 6, y: crownCenterY - 4, r: 12 },
        { x: crownCenterX + 6, y: crownCenterY + 2, r: 11 },
        { x: crownCenterX - 2, y: crownCenterY - 9, r: 13 },
        { x: crownCenterX + 5, y: crownCenterY - 5, r: 10 }
    ];

    for (const c of clusters) {
        for (let dy = -c.r; dy <= c.r; dy++) {
            for (let dx = -c.r; dx <= c.r; dx++) {
                const dist2 = dx * dx + dy * dy;
                if (dist2 <= c.r * c.r) {
                    const px = c.x + dx;
                    const py = c.y + dy;
                    // Authentic U7 3-face leaf illumination:
                    // Top-left (sunlit): bright yellow-green
                    // South/center: rich vibrant forest green
                    // East/underside: deep shaded olive-green
                    const normalX = dx / c.r;
                    const normalY = dy / c.r;
                    if (normalX < -0.2 && normalY < -0.1) {
                        cvs.setPixel(px, py, 112, 160, 48); // Highlight
                    } else if (normalX > 0.3 || normalY > 0.4) {
                        cvs.setPixel(px, py, 36, 68, 24);  // East / Underside shadow
                    } else {
                        cvs.setPixel(px, py, 64, 112, 36); // South face midtone
                    }
                }
            }
        }
    }

    cvs.toRMMZSheet(outPath);
}

// 2. Generate 2.5D Boreal Pine Tree (!$PineTree.png)
// Native 48x64 -> 144x192 frame, 432x768 sheet
function generatePineTree(outPath) {
    const cvs = new NativeCanvas(48, 64);
    const baseX = 30;
    const baseY = 58;

    // Slender dark pine trunk leaning 45° up-left
    for (let z = 0; z <= 7; z++) {
        const tx = baseX - z * 4;
        const ty = baseY - z * 4;
        for (let ox = -2; ox <= 2; ox++) {
            cvs.setPixel(tx + ox, ty, ox < 0 ? 80 : 40, ox < 0 ? 56 : 28, 24);
        }
    }

    // 4 Tiered conical needle boughs leaning 45° up-left
    const tiers = [
        { z: 2, radius: 14, h: 7 },
        { z: 4, radius: 12, h: 7 },
        { z: 6, radius: 9,  h: 6 },
        { z: 8, radius: 6,  h: 5 }
    ];

    for (const tier of tiers) {
        const cx = baseX - tier.z * 4;
        const cy = baseY - tier.z * 4;

        for (let dy = -tier.h; dy <= 2; dy++) {
            const currentR = Math.max(1, Math.round(tier.radius * (1 - (dy + tier.h) / (tier.h * 1.6))));
            for (let dx = -currentR; dx <= currentR; dx++) {
                const px = cx + dx;
                const py = cy + dy;
                // Needle texture variation
                const isNeedleEdge = (Math.abs(dx) === currentR);
                if (dx < -1 && dy < 0) {
                    cvs.setPixel(px, py, 72, 130, 56); // Sunlit top needles
                } else if (dx > 1 || dy > 1) {
                    cvs.setPixel(px, py, 20, 52, 28);  // Shadowed east needles
                } else {
                    cvs.setPixel(px, py, 44, 92, 40);  // South midtone needles
                }
            }
        }
    }

    cvs.toRMMZSheet(outPath);
}

// 3. Generate 2.5D Granite Boulder (!$GraniteBoulder.png)
// Native 32x32 -> 96x96 frame, 288x384 sheet
function generateGraniteBoulder(outPath) {
    const cvs = new NativeCanvas(32, 32);

    // Weathered stepped granite rock mass leaning 45° up-left
    // Base block (12x10, height 3 lifts)
    cvs.draw25DBox(16, 20, 10, 8, 2.5,
        { r: 180, g: 180, b: 185 }, // Lighted top
        { r: 120, g: 122, b: 128 }, // South face midtone
        { r: 70,  g: 72,  b: 78 }   // East face dark shadow
    );

    // Secondary upper rock outcrop (height 4 lifts)
    cvs.draw25DBox(14, 18, 7, 6, 3.5,
        { r: 200, g: 202, b: 205 }, // Brightest top peak
        { r: 140, g: 142, b: 148 },
        { r: 85,  g: 88,  b: 94 }
    );

    // Natural fissure cracks & subtle lichen
    cvs.setPixel(16, 22, 60, 60, 65);
    cvs.setPixel(17, 23, 60, 60, 65);
    cvs.setPixel(12, 14, 90, 120, 60); // Green lichen on north face
    cvs.setPixel(13, 15, 90, 120, 60);

    cvs.toRMMZSheet(outPath);
}

// 4. Generate 2.5D Ironstone Deposit (!$IronstoneDeposit.png)
// Native 32x32 -> 96x96 frame, 288x384 sheet
function generateIronstoneDeposit(outPath) {
    const cvs = new NativeCanvas(32, 32);

    // Hematite raw iron vein: jagged metallic strata leaning 45° up-left
    cvs.draw25DBox(16, 21, 11, 7, 2.5,
        { r: 190, g: 84, b: 62 },  // Metallic red-orange top glint
        { r: 138, g: 52, b: 38 },  // Deep red hematite south face
        { r: 78,  g: 28, b: 20 }   // Dark iron-umber east shadow
    );

    // Secondary crystalline hematite spur
    cvs.draw25DBox(13, 18, 8, 6, 4.0,
        { r: 218, g: 110, b: 84 }, // Glint
        { r: 154, g: 60,  b: 44 },
        { r: 92,  g: 34,  b: 24 }
    );

    // Embedded iron ore flecks
    cvs.setPixel(15, 17, 240, 160, 120);
    cvs.setPixel(16, 17, 240, 160, 120);
    cvs.setPixel(18, 22, 50, 48, 55); // Dark basalt matrix

    cvs.toRMMZSheet(outPath);
}

// 5. Generate 2.5D Berry Bush (!$BerryBush.png)
// Native 16x16 -> 48x48 frame, 144x192 sheet
function generateBerryBush(outPath) {
    const cvs = new NativeCanvas(16, 16);

    // Rounded wild berry shrub leaning 45° up-left
    const cx = 8;
    const cy = 10;
    for (let dy = -5; dy <= 4; dy++) {
        for (let dx = -6; dx <= 6; dx++) {
            if (dx * dx * 0.8 + dy * dy <= 22) {
                const px = cx + dx;
                const py = cy + dy;
                if (dx < -1 && dy < 0) cvs.setPixel(px, py, 96, 150, 48); // Highlight
                else if (dx > 1 || dy > 1) cvs.setPixel(px, py, 32, 64, 20); // Shadow
                else cvs.setPixel(px, py, 58, 108, 34); // Midtone
            }
        }
    }

    // Ripe red wild berries
    const berries = [
        { x: 6, y: 8 }, { x: 9, y: 7 }, { x: 5, y: 11 },
        { x: 8, y: 11 }, { x: 11, y: 9 }, { x: 7, y: 9 }
    ];
    for (const b of berries) {
        cvs.setPixel(b.x, b.y, 220, 40, 50);
        cvs.setPixel(b.x, b.y + 1, 140, 20, 30);
    }

    cvs.toRMMZSheet(outPath);
}

// Execute Generation
const charDir = path.join(__dirname, '..', 'game', 'img', 'characters');
generateTimberOak(path.join(charDir, '!$TimberOak.png'));
generatePineTree(path.join(charDir, '!$PineTree.png'));
generateGraniteBoulder(path.join(charDir, '!$GraniteBoulder.png'));
generateIronstoneDeposit(path.join(charDir, '!$IronstoneDeposit.png'));
generateBerryBush(path.join(charDir, '!$BerryBush.png'));

console.log('All original 2.5D graphics generated successfully!');
