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

function decodeFlatTile(shapeId, frameIdx = 0) {
    const off = shapesBytes.readUInt32LE(128 + shapeId * 8);
    const len = shapesBytes.readUInt32LE(128 + shapeId * 8 + 4);
    if (off === 0 || len === 0) return null;
    const numFrames = Math.floor(len / 64);
    if (numFrames === 0) return null;
    const f = frameIdx % numFrames;

    const tileOffset = off + f * 64;
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

// ----------------------------------------------------------------------------
// 1. Build A2 Ground Autotile Sheet (768x576)
// Sourced strictly from verified U7 pure flat terrain shapes
// ----------------------------------------------------------------------------
function buildGroundA2(outPath) {
    const totalW = 768, totalH = 576;
    const buf = Buffer.alloc(totalW * totalH * 4, 0);

    const kinds = [
        // 0: meadow (Meadow grass)
        { id: "meadow", shape: 33, edgeColor: [59, 99, 38] },
        // 1: tropical_grass (Lush vibrant grass)
        { id: "tropical_grass", shape: 147, edgeColor: [40, 96, 46] },
        // 2: dry_grass (Savanna / dry steppe)
        { id: "dry_grass", shape: 124, edgeColor: [122, 106, 42] },
        // 3: shrub_soil (Scrub soil)
        { id: "shrub_soil", shape: 136, edgeColor: [88, 85, 38] },
        // 4: forest_floor (Leaf litter)
        { id: "forest_floor", shape: 49, edgeColor: [58, 46, 24] },
        // 5: needle_floor (Pine needles)
        { id: "needle_floor", shape: 51, edgeColor: [46, 46, 24] },
        // 6: jungle_floor (Jungle dense floor)
        { id: "jungle_floor", shape: 44, edgeColor: [42, 60, 24] },
        // 7: tundra (Tundra)
        { id: "tundra", shape: 120, edgeColor: [90, 106, 78] },

        // 8: snow (Snow - derived cleanly from seamless rock texture)
        { id: "snow", shape: 1, mapper: (r, g, b) => [Math.min(255, Math.round(r * 0.4 + 150)), Math.min(255, Math.round(g * 0.4 + 158)), Math.min(255, Math.round(b * 0.4 + 172))], edgeColor: [136, 152, 172] },
        // 9: ice (Glacier ice)
        { id: "ice", shape: 1, mapper: (r, g, b) => [Math.min(255, Math.round(r * 0.3 + 90)), Math.min(255, Math.round(g * 0.4 + 140)), Math.min(255, Math.round(b * 0.5 + 180))], edgeColor: [104, 152, 176] },
        // 10: sand (Desert sand)
        { id: "sand", shape: 118, edgeColor: [168, 144, 90] },
        // 11: stony (Stony ground)
        { id: "stony", shape: 1, mapper: (r, g, b) => [Math.round(r * 0.8), Math.round(g * 0.78), Math.round(b * 0.72)], edgeColor: [98, 84, 68] },
        // 12: red_clay (Red clay)
        { id: "red_clay", shape: 144, edgeColor: [122, 58, 30] },
        // 13: rock (Bare rock)
        { id: "rock", shape: 1, mapper: (r, g, b) => [Math.round(r * 0.75), Math.round(g * 0.75), Math.round(b * 0.75)], edgeColor: [78, 76, 72] },
        // 14: peak_rock (High mountain rock face)
        { id: "peak_rock", shape: 1, mapper: (r, g, b) => [Math.round(r * 0.55), Math.round(g * 0.55), Math.round(b * 0.55)], edgeColor: [46, 44, 42] },
        // 15: mud (Wet mud)
        { id: "mud", shape: 5, edgeColor: [66, 40, 11] },

        // 16: swamp_mud (Swamp peat)
        { id: "swamp_mud", shape: 51, mapper: (r, g, b) => [Math.round(r * 0.6), Math.round(g * 0.55), Math.round(b * 0.4)], edgeColor: [40, 30, 16] },
        // 17: dirt (Beaten dirt path)
        { id: "dirt", shape: 16, edgeColor: [76, 61, 21] },
        // 18: cursed_grass (Blighted cursed ground)
        { id: "cursed_grass", shape: 36, mapper: (r, g, b) => [Math.round(r * 0.85), Math.round(g * 0.75), Math.round(b * 0.65)], edgeColor: [62, 62, 42] },
        // 19: blessed_grass (Flowering meadow)
        { id: "blessed_grass", shape: 35, mapper: (r, g, b) => [Math.min(255, Math.round(r * 1.05)), Math.min(255, Math.round(g * 1.2)), Math.min(255, Math.round(b * 0.95))], edgeColor: [62, 122, 46] },
        // 20: ash (Volcanic ash)
        { id: "ash", shape: 1, mapper: (r, g, b) => [Math.round(r * 0.45), Math.round(g * 0.45), Math.round(b * 0.45)], edgeColor: [36, 34, 32] },
        // 21: cave_floor (Subterranean cave floor)
        { id: "cave_floor", shape: 1, mapper: (r, g, b) => [Math.round(r * 0.65), Math.round(g * 0.6), Math.round(b * 0.55)], edgeColor: [68, 60, 50] },
        // 22: cave_rock (Solid cavern rock)
        { id: "cave_rock", shape: 1, mapper: (r, g, b) => [Math.round(r * 0.4), Math.round(g * 0.38), Math.round(b * 0.35)], edgeColor: [40, 32, 30] },
        // 23: fungal_floor (Purple bioluminescent fungal cavern)
        { id: "fungal_floor", shape: 36, mapper: (r, g, b) => [Math.min(255, Math.round(r * 0.8 + 50)), Math.min(255, Math.round(g * 0.4 + 15)), Math.min(255, Math.round(b * 1.2 + 65))], edgeColor: [70, 30, 80] },

        // 24: crystal_floor (Luminescent crystal cavern)
        { id: "crystal_floor", shape: 1, mapper: (r, g, b) => [Math.min(255, Math.round(r * 0.5 + 20)), Math.min(255, Math.round(g * 0.8 + 45)), Math.min(255, Math.round(b * 1.3 + 80))], edgeColor: [52, 60, 82] },
        // 25: chasm (Abyssal pit)
        { id: "chasm", shape: 51, mapper: () => [16, 14, 20], edgeColor: [12, 12, 16] },
        // 26: Cobblestone
        { id: "cobble", shape: 1, edgeColor: [90, 88, 85] },
        // 27: Wood Planks
        { id: "wood_floor", shape: 17, edgeColor: [65, 38, 12] },
        // 28: Golden Steppe
        { id: "steppe", shape: 124, mapper: (r, g, b) => [Math.min(255, Math.round(r * 1.15)), Math.min(255, Math.round(g * 1.05)), Math.round(b * 0.7)], edgeColor: [116, 108, 58] },
        // 29: Deep Loam
        { id: "deep_loam", shape: 50, edgeColor: [60, 35, 10] },
        // 30: Scree Slope
        { id: "scree", shape: 1, mapper: (r, g, b) => [Math.round(r * 0.7), Math.round(g * 0.7), Math.round(b * 0.7)], edgeColor: [80, 80, 80] },
        // 31: Basalt Bedrock
        { id: "basalt", shape: 1, mapper: (r, g, b) => [Math.round(r * 0.25), Math.round(g * 0.25), Math.round(b * 0.25)], edgeColor: [15, 15, 15] }
    ];

    for (let k = 0; k < 32; k++) {
        const kind = kinds[k];
        const col = k % 8;
        const row = Math.floor(k / 8);
        const originX = col * 96;
        const originY = row * 144;

        const subFrames = [];
        for (let f = 0; f < 4; f++) {
            subFrames.push(decodeFlatTile(kind.shape, f * 2) || decodeFlatTile(kind.shape, 0));
        }

        // Texture whole 96x144 autotile block (2x3 cells of 48x48)
        for (let cellY = 0; cellY < 3; cellY++) {
            for (let cellX = 0; cellX < 2; cellX++) {
                const cellOriginX = originX + cellX * 48;
                const cellOriginY = originY + cellY * 48;

                for (let py = 0; py < 16; py++) {
                    for (let px = 0; px < 16; px++) {
                        const subX = Math.floor(px / 8);
                        const subY = Math.floor(py / 8);
                        const t = subFrames[(subY * 2 + subX) % subFrames.length];

                        const sIdx = ((py % 8) * 8 + (px % 8)) * 4;
                        let r = t ? t.pixels[sIdx] : 0;
                        let g = t ? t.pixels[sIdx + 1] : 0;
                        let b = t ? t.pixels[sIdx + 2] : 0;

                        if (kind.mapper) {
                            const mapped = kind.mapper(r, g, b);
                            r = mapped[0]; g = mapped[1]; b = mapped[2];
                        }

                        // 3x integer scale
                        for (let dy = 0; dy < 3; dy++) {
                            for (let dx = 0; dx < 3; dx++) {
                                const destX = cellOriginX + px * 3 + dx;
                                const destY = cellOriginY + py * 3 + dy;
                                const dIdx = (destY * totalW + destX) * 4;
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

        // Draw standard RMMZ autotile edge borders (1 native px = 3 scaled px)
        const edge = kind.edgeColor;
        const setEdge = (nx, ny) => {
            for (let dy = 0; dy < 3; dy++) {
                for (let dx = 0; dx < 3; dx++) {
                    const destX = originX + nx * 3 + dx;
                    const destY = originY + ny * 3 + dy;
                    const dIdx = (destY * totalW + destX) * 4;
                    buf[dIdx] = edge[0];
                    buf[dIdx + 1] = edge[1];
                    buf[dIdx + 2] = edge[2];
                    buf[dIdx + 3] = 255;
                }
            }
        };

        // Preview tile (0,0)-(16,16): border on all 4 sides
        for (let i = 0; i < 16; i++) {
            setEdge(i, 0); setEdge(i, 15);
            setEdge(0, i); setEdge(15, i);
        }
        // Inner corner tile (16,0)-(32,16): 4 corner notches
        const corners = [[16, 0, 1, 1], [31, 0, -1, 1], [16, 15, 1, -1], [31, 15, -1, -1]];
        for (const [cx, cy, dx, dy] of corners) {
            setEdge(cx, cy);
            setEdge(cx + dx, cy);
            setEdge(cx, cy + dy);
        }
        // 2x2 Blob square (0,16)-(32,48): outer border
        for (let i = 0; i < 32; i++) {
            setEdge(i, 16); setEdge(i, 47);
            setEdge(0, 16 + i); setEdge(31, 16 + i);
        }
    }

    writePNG(outPath, totalW, totalH, buf);
    console.log(`[Chipset A2] Built ${path.basename(outPath)} (768x576, 32 Ground Autotiles)`);
}

// ----------------------------------------------------------------------------
// 2. Build A1 Water Animated Autotile Sheet (768x576)
// Sourced strictly from verified U7 water ripple frames
// ----------------------------------------------------------------------------
function buildWaterA1(outPath) {
    const totalW = 768, totalH = 576;
    const buf = Buffer.alloc(totalW * totalH * 4, 0);

    const waterConfigs = [
        {
            kind: 0,
            originX: 0, originY: 0, animated: true,
            shapes: [2, 19, 26],
            bankColor: [59, 99, 38], // grassy riverbank
            mapper: null
        },
        {
            kind: 1,
            originX: 0, originY: 144, animated: true,
            shapes: [2, 19, 26],
            bankColor: [66, 56, 31],
            mapper: (r, g, b) => [Math.round(r * 0.4 + 20), Math.round(g * 0.8 + 60), Math.round(b * 0.5 + 40)] // greenish marsh
        },
        {
            kind: 2,
            originX: 288, originY: 0, animated: false,
            shapes: [26],
            bankColor: [40, 60, 100],
            mapper: (r, g, b) => [Math.round(r * 0.6), Math.round(g * 0.7), Math.min(255, Math.round(b * 1.2))] // deep ocean navy
        },
        {
            kind: 3,
            originX: 288, originY: 144, animated: false,
            shapes: [26],
            bankColor: [30, 28, 16],
            mapper: (r, g, b) => [Math.round(r * 0.4), Math.round(g * 0.45), Math.round(b * 0.3)] // dark swamp peat
        },
        {
            kind: 4,
            originX: 384, originY: 0, animated: true,
            shapes: [2, 19, 26],
            bankColor: [45, 20, 15], // volcanic obsidian bank
            mapper: (r, g, b) => [255, Math.min(255, Math.round(b * 0.6 + 40)), 20] // incandescent fiery orange-red
        },
        {
            kind: 5,
            originX: 672, originY: 0, animated: true, isWaterfall: true,
            shapes: [2, 19, 26],
            bankColor: [50, 20, 15],
            mapper: (r, g, b) => [240, Math.min(255, Math.round(b * 0.5 + 30)), 15]
        },
        {
            kind: 6,
            originX: 384, originY: 144, animated: true,
            shapes: [26, 19, 2],
            bankColor: [40, 36, 30],
            mapper: (r, g, b) => [Math.round(r * 0.5), Math.round(g * 0.85 + 40), Math.min(255, Math.round(b * 1.15 + 60))] // subterranean cyan pool
        },
        {
            kind: 7,
            originX: 672, originY: 144, animated: true, isWaterfall: true,
            shapes: [2, 19, 26],
            bankColor: [60, 80, 100],
            mapper: (r, g, b) => [Math.min(255, Math.round(r * 0.8 + 60)), Math.min(255, Math.round(g * 0.9 + 70)), Math.min(255, Math.round(b * 1.1 + 80))] // fresh waterfall
        }
    ];

    for (const cfg of waterConfigs) {
        const frameCount = cfg.animated ? (cfg.isWaterfall ? 1 : 3) : 1;

        for (let frameIdx = 0; frameIdx < (cfg.isWaterfall ? 1 : frameCount); frameIdx++) {
            const frameShape = cfg.shapes[frameIdx % cfg.shapes.length];
            const frameOriginX = cfg.originX + frameIdx * 96;
            const frameOriginY = cfg.originY;

            // Texture 96x144 autotile block (2x3 cells of 48x48)
            for (let cellY = 0; cellY < 3; cellY++) {
                for (let cellX = 0; cellX < 2; cellX++) {
                    const cx = frameOriginX + cellX * 48;
                    const cy = frameOriginY + cellY * 48;

                    for (let py = 0; py < 16; py++) {
                        for (let px = 0; px < 16; px++) {
                            const subX = Math.floor(px / 8);
                            const subY = Math.floor(py / 8);
                            const fOffset = (subY * 2 + subX + frameIdx * 3) % 16;
                            const t = decodeFlatTile(frameShape, fOffset) || decodeFlatTile(frameShape, 0);

                            const sIdx = ((py % 8) * 8 + (px % 8)) * 4;
                            let r = t ? t.pixels[sIdx] : 0;
                            let g = t ? t.pixels[sIdx + 1] : 0;
                            let b = t ? t.pixels[sIdx + 2] : 200;

                            if (cfg.mapper) {
                                const mapped = cfg.mapper(r, g, b);
                                r = mapped[0]; g = mapped[1]; b = mapped[2];
                            }

                            for (let dy = 0; dy < 3; dy++) {
                                for (let dx = 0; dx < 3; dx++) {
                                    const destX = cx + px * 3 + dx;
                                    const destY = cy + py * 3 + dy;
                                    if (destX < totalW && destY < totalH) {
                                        const dIdx = (destY * totalW + destX) * 4;
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

            // Draw autotile edge banks
            const bank = cfg.bankColor;
            const setBank = (nx, ny) => {
                for (let dy = 0; dy < 3; dy++) {
                    for (let dx = 0; dx < 3; dx++) {
                        const destX = frameOriginX + nx * 3 + dx;
                        const destY = frameOriginY + ny * 3 + dy;
                        if (destX < totalW && destY < totalH) {
                            const dIdx = (destY * totalW + destX) * 4;
                            buf[dIdx] = bank[0];
                            buf[dIdx + 1] = bank[1];
                            buf[dIdx + 2] = bank[2];
                            buf[dIdx + 3] = 255;
                        }
                    }
                }
            };

            // Preview tile (0,0)-(16,16)
            for (let i = 0; i < 16; i++) {
                setBank(i, 0); setBank(i, 15);
                setBank(0, i); setBank(15, i);
            }
            // Inner corner notches
            const corners = [[16, 0, 1, 1], [31, 0, -1, 1], [16, 15, 1, -1], [31, 15, -1, -1]];
            for (const [cx, cy, dx, dy] of corners) {
                setBank(cx, cy); setBank(cx + dx, cy); setBank(cx, cy + dy);
            }
            // Outer blob border
            for (let i = 0; i < 32; i++) {
                setBank(i, 16); setBank(i, 47);
                setBank(0, 16 + i); setBank(31, 16 + i);
            }
        }
    }

    writePNG(outPath, totalW, totalH, buf);
    console.log(`[Chipset A1] Built ${path.basename(outPath)} (768x576, Water & Lava Animated Autotiles)`);
}

const tileDir = path.join(__dirname, '..', 'game', 'img', 'tilesets');

// Build both chipsets
buildGroundA2(path.join(tileDir, 'U7_Ground_A2.png'));
buildWaterA1(path.join(tileDir, 'U7_Ground_A1.png'));

// Deploy as drop-in replacements for stock RMMZ Outside_A1, Outside_A2, Dungeon_A1, Dungeon_A2
fs.copyFileSync(path.join(tileDir, 'U7_Ground_A2.png'), path.join(tileDir, 'Outside_A2.png'));
fs.copyFileSync(path.join(tileDir, 'U7_Ground_A2.png'), path.join(tileDir, 'U7_Outside_A2.png'));
fs.copyFileSync(path.join(tileDir, 'U7_Ground_A2.png'), path.join(tileDir, 'Dungeon_A2.png'));
fs.copyFileSync(path.join(tileDir, 'U7_Ground_A2.png'), path.join(tileDir, 'U7_Dungeon_A2.png'));

fs.copyFileSync(path.join(tileDir, 'U7_Ground_A1.png'), path.join(tileDir, 'Outside_A1.png'));
fs.copyFileSync(path.join(tileDir, 'U7_Ground_A1.png'), path.join(tileDir, 'U7_Outside_A1.png'));
fs.copyFileSync(path.join(tileDir, 'U7_Ground_A1.png'), path.join(tileDir, 'Dungeon_A1.png'));
fs.copyFileSync(path.join(tileDir, 'U7_Ground_A1.png'), path.join(tileDir, 'U7_Dungeon_A1.png'));

console.log("\nGround and Water Chipsets successfully compiled and deployed across all tileset slots!");
