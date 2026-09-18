const fs = require('fs');
const path = require('path');
const { writePNG } = require('./png_util');

const shapesPath = "C:\\Program Files\\GOG Galaxy\\Games\\Ultima 7\\STATIC\\SHAPES.VGA";
const palPath = "C:\\Program Files\\GOG Galaxy\\Games\\Ultima 7\\STATIC\\PALETTES.FLX";

const palBytes = fs.readFileSync(palPath);
const shapesBytes = fs.readFileSync(shapesPath);

// Daylight Palette
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

// Deterministic hash for noise/organic edges
function hash(x, y, seed = 1) {
    let h = (x * 374761393 + y * 668265263 + seed * 3266489917) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    return (h ^ (h >>> 16)) >>> 0;
}
function noise(x, y, seed = 1) {
    return (hash(x, y, seed) & 65535) / 65536.0;
}

// Get seamless pixel from U7 shape (8x8 tile repeated across native coordinates)
function getU7Pixel(shapeId, nx, ny, frameOffset = 0, mapper = null) {
    const subX = Math.floor(nx / 8);
    const subY = Math.floor(ny / 8);
    const frame = (subY * 3 + subX + frameOffset) % 16;
    const tile = decodeFlatTile(shapeId, frame) || decodeFlatTile(shapeId, 0);
    const px = (nx % 8 + 8) % 8;
    const py = (ny % 8 + 8) % 8;
    const sIdx = (py * 8 + px) * 4;
    let r = tile ? tile.pixels[sIdx] : 0;
    let g = tile ? tile.pixels[sIdx + 1] : 0;
    let b = tile ? tile.pixels[sIdx + 2] : 0;
    if (mapper) {
        const m = mapper(r, g, b, nx, ny);
        r = m[0]; g = m[1]; b = m[2];
    }
    return [r, g, b, 255];
}

// ----------------------------------------------------------------------------
// 1. Build Master A2 Ground Autotiles (768x576)
// 8 columns x 4 rows
// Column 0 in each row is the Base Terrain (100% borderless seamless)!
// Columns 1-7 are Overlays on top of the Base Terrain with organic fringed edges!
// ----------------------------------------------------------------------------
function buildMasterGroundA2(outPath) {
    const totalW = 768, totalH = 576;
    const buf = Buffer.alloc(totalW * totalH * 4, 0);

    // Define 4 Rows of terrains:
    // Row 0: Base = Meadow Grass (Shape 33)
    // Row 1: Base = Sand (Shape 118)
    // Row 2: Base = Rich Forest Loam (Shape 49)
    // Row 3: Base = Cave Rock (Shape 1)
    const rows = [
        {
            baseShape: 33, // Meadow Grass
            baseMapper: null,
            kinds: [
                { id: "meadow", shape: 33, name: "Meadow Grass", isBase: true },
                { id: "lush_grass", shape: 147, name: "Lush Grass", fringe: "grass" },
                { id: "dirt_path", shape: 16, name: "Dirt Path", fringe: "dirt" },
                { id: "cobble", shape: 1, name: "Cobblestone", fringe: "stone" },
                { id: "sand", shape: 118, name: "Sand", fringe: "dirt" },
                { id: "dry_grass", shape: 124, name: "Savanna Grass", fringe: "grass" },
                { id: "flowers", shape: 35, mapper: (r,g,b,x,y) => noise(x,y,4)>0.88 ? [240, 210, 60] : (noise(x,y,5)>0.88 ? [230, 80, 110] : [r, Math.min(255, g+15), b]), name: "Flowering Meadow", fringe: "grass" },
                { id: "needles", shape: 51, name: "Pine Needles", fringe: "dirt" }
            ]
        },
        {
            baseShape: 118, // Desert Sand
            baseMapper: null,
            kinds: [
                { id: "sand_base", shape: 118, name: "Desert Sand", isBase: true },
                { id: "dune_sand", shape: 10, name: "Deep Dunes", fringe: "dirt" },
                { id: "dry_shrub_soil", shape: 136, name: "Scrub Soil", fringe: "dirt" },
                { id: "red_clay", shape: 144, name: "Red Clay", fringe: "dirt" },
                { id: "sand_scree", shape: 1, mapper: (r,g,b) => [Math.round(r*0.8+20), Math.round(g*0.75+15), Math.round(b*0.6)], name: "Sand Scree", fringe: "stone" },
                { id: "desert_rock", shape: 1, mapper: (r,g,b) => [Math.round(r*0.65+30), Math.round(g*0.6+25), Math.round(b*0.5+15)], name: "Desert Rock", fringe: "stone" },
                { id: "oasis_grass", shape: 33, name: "Oasis Grass", fringe: "grass" },
                { id: "cracked_earth", shape: 16, mapper: (r,g,b) => [Math.round(r*0.85), Math.round(g*0.75), Math.round(b*0.65)], name: "Cracked Earth", fringe: "dirt" }
            ]
        },
        {
            baseShape: 49, // Forest Loam
            baseMapper: null,
            kinds: [
                { id: "forest_floor", shape: 49, name: "Forest Loam", isBase: true },
                { id: "wet_mud", shape: 5, name: "Wet Mud", fringe: "dirt" },
                { id: "swamp_peat", shape: 51, mapper: (r,g,b) => [Math.round(r*0.55), Math.round(g*0.5), Math.round(b*0.35)], name: "Swamp Peat", fringe: "dirt" },
                { id: "jungle_floor", shape: 44, name: "Jungle Floor", fringe: "grass" },
                { id: "tundra", shape: 120, name: "Tundra", fringe: "grass" },
                { id: "blight_grass", shape: 36, mapper: (r,g,b) => [Math.round(r*0.85), Math.round(g*0.75), Math.round(b*0.65)], name: "Blighted Grass", fringe: "grass" },
                { id: "wood_planks", shape: 17, name: "Wood Planks", fringe: "wood" },
                { id: "deep_soil", shape: 50, name: "Deep Soil", fringe: "dirt" }
            ]
        },
        {
            baseShape: 1, // Cave Rock
            baseMapper: (r,g,b) => [Math.round(r*0.65), Math.round(g*0.6), Math.round(b*0.55)],
            kinds: [
                { id: "cave_floor", shape: 1, mapper: (r,g,b) => [Math.round(r*0.65), Math.round(g*0.6), Math.round(b*0.55)], name: "Cave Floor", isBase: true },
                { id: "solid_rock", shape: 1, mapper: (r,g,b) => [Math.round(r*0.45), Math.round(g*0.42), Math.round(b*0.4)], name: "Solid Rock", fringe: "stone" },
                { id: "snow", shape: 1, mapper: (r,g,b) => [Math.min(255, Math.round(r*0.35+165)), Math.min(255, Math.round(g*0.35+172)), Math.min(255, Math.round(b*0.35+185))], name: "Snow", fringe: "snow" },
                { id: "ice", shape: 1, mapper: (r,g,b) => [Math.min(255, Math.round(r*0.3+90)), Math.min(255, Math.round(g*0.4+140)), Math.min(255, Math.round(b*0.5+180))], name: "Glacier Ice", fringe: "snow" },
                { id: "fungal_cavern", shape: 36, mapper: (r,g,b) => [Math.min(255, Math.round(r*0.8+50)), Math.min(255, Math.round(g*0.4+15)), Math.min(255, Math.round(b*1.2+65))], name: "Fungal Floor", fringe: "grass" },
                { id: "crystal_cavern", shape: 1, mapper: (r,g,b) => [Math.min(255, Math.round(r*0.5+20)), Math.min(255, Math.round(g*0.8+45)), Math.min(255, Math.round(b*1.3+80))], name: "Crystal Floor", fringe: "stone" },
                { id: "volcanic_ash", shape: 1, mapper: (r,g,b) => [Math.round(r*0.35), Math.round(g*0.35), Math.round(b*0.35)], name: "Volcanic Ash", fringe: "dirt" },
                { id: "abyssal_chasm", shape: 51, mapper: () => [14, 12, 18], name: "Abyss Chasm", fringe: "stone" }
            ]
        }
    ];

    // Autotile block geometry in native pixels: width = 32, height = 48
    // Preview tile: (0,0)-(16,16)
    // Inner corners: (16,0)-(32,16) -> 4 quarter-tiles with corner cutouts
    // Outer blob: (0,16)-(32,48) -> 32x32 area with outer edge fringing
    for (let rIdx = 0; rIdx < 4; rIdx++) {
        const rowCfg = rows[rIdx];
        const baseShape = rowCfg.baseShape;
        const baseMapper = rowCfg.baseMapper;

        for (let cIdx = 0; cIdx < 8; cIdx++) {
            const kind = rowCfg.kinds[cIdx];
            const originX = cIdx * 96;
            const originY = rIdx * 144;

            for (let ny = 0; ny < 48; ny++) {
                for (let nx = 0; nx < 32; nx++) {
                    let isOverlay = false;

                    if (kind.isBase) {
                        // Base terrain is 100% overlay (seamless everywhere, no base bleed)
                        isOverlay = true;
                    } else {
                        // Decide if native pixel (nx, ny) belongs to the overlay or base terrain
                        if (ny < 16) {
                            if (nx < 16) {
                                // Preview tile (0..15, 0..15): isolated island with outer fringe
                                const distFromEdge = Math.min(nx, 15 - nx, ny, 15 - ny);
                                const threshold = 2 + (noise(nx, ny, 11) > 0.6 ? 1 : 0);
                                isOverlay = distFromEdge >= threshold;
                            } else {
                                // Inner corners tile (16..31, 0..15):
                                // Corner 0: (16, 0)
                                // Corner 1: (31, 0)
                                // Corner 2: (16, 15)
                                // Corner 3: (31, 15)
                                const lx = nx - 16;
                                const isCorner0 = (lx < 3 && ny < 3);
                                const isCorner1 = (lx >= 13 && ny < 3);
                                const isCorner2 = (lx < 3 && ny >= 13);
                                const isCorner3 = (lx >= 13 && ny >= 13);
                                isOverlay = !(isCorner0 || isCorner1 || isCorner2 || isCorner3);
                            }
                        } else {
                            // 2x2 Blob square (0..31, 16..47):
                            // Outer borders have fringe transitioning to base
                            const by = ny - 16;
                            const distFromOuter = Math.min(nx, 31 - nx, by, 31 - by);
                            const threshold = 2 + (noise(nx, ny, 23) > 0.65 ? 1 : 0);
                            isOverlay = distFromOuter >= threshold;
                        }
                    }

                    // Sample pixel from overlay or base
                    const rgb = isOverlay
                        ? getU7Pixel(kind.shape, nx, ny, 0, kind.mapper)
                        : getU7Pixel(baseShape, nx, ny, 0, baseMapper);

                    // If at the transition edge, apply soft fringing
                    let [r, g, b] = rgb;
                    if (!kind.isBase && isOverlay) {
                        // Check if adjacent to base
                        const edgeNoise = noise(nx, ny, 47);
                        if (edgeNoise > 0.75) {
                            const [br, bg, bb] = getU7Pixel(baseShape, nx, ny, 0, baseMapper);
                            r = Math.round(r * 0.65 + br * 0.35);
                            g = Math.round(g * 0.65 + bg * 0.35);
                            b = Math.round(b * 0.65 + bb * 0.35);
                        }
                    }

                    // 3x integer scale
                    for (let dy = 0; dy < 3; dy++) {
                        for (let dx = 0; dx < 3; dx++) {
                            const destX = originX + nx * 3 + dx;
                            const destY = originY + ny * 3 + dy;
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

    writePNG(outPath, totalW, totalH, buf);
    console.log(`[Master A2 Ground] Built ${path.basename(outPath)} (768x576, Seamless Base + Organic Autotile Fringes)`);
}

// ----------------------------------------------------------------------------
// 2. Build Master A1 Animated Water & Magma Autotiles (768x576)
// RMMZ A1 structure:
// Kind 0 (0..288, 0..144): Fresh Water / River with Grass Shoreline (3 animated frames)
// Kind 1 (0..288, 144..288): Marsh / Shallow Water with Mud Shoreline (3 animated frames)
// Kind 2 (288..384, 0..144): Deep Ocean Water
// Kind 3 (288..384, 144..288): Swamp Water
// Kind 4 (384..672, 0..144): Animated Molten Magma / Lava with Obsidian Shoreline (3 animated frames)
// Kind 5 (672..768, 0..144): Magmafall
// Kind 6 (384..672, 144..288): Cavern Pool (3 animated frames)
// Kind 7 (672..768, 144..288): Waterfall
// ----------------------------------------------------------------------------
function buildMasterWaterA1(outPath) {
    const totalW = 768, totalH = 576;
    const buf = Buffer.alloc(totalW * totalH * 4, 0);

    const waterDefs = [
        {
            kind: 0, originX: 0, originY: 0, animated: true,
            baseTerrain: 33, // Meadow Grass shoreline
            waterShape: 2,   // U7 animated water
            shoreType: "grass",
            waterMapper: null,
            foamColor: [180, 220, 255]
        },
        {
            kind: 1, originX: 0, originY: 144, animated: true,
            baseTerrain: 5,  // Wet Mud shoreline
            waterShape: 19,
            shoreType: "mud",
            waterMapper: (r, g, b) => [Math.round(r*0.4+20), Math.round(g*0.8+50), Math.round(b*0.6+30)],
            foamColor: [150, 190, 160]
        },
        {
            kind: 2, originX: 288, originY: 0, animated: false,
            baseTerrain: 118, // Sand beach
            waterShape: 26,
            shoreType: "sand",
            waterMapper: (r, g, b) => [Math.round(r*0.5), Math.round(g*0.65), Math.min(255, Math.round(b*1.2+20))],
            foamColor: [200, 230, 255]
        },
        {
            kind: 3, originX: 288, originY: 144, animated: false,
            baseTerrain: 51, // Swamp Peat
            waterShape: 26,
            shoreType: "mud",
            waterMapper: (r, g, b) => [Math.round(r*0.4), Math.round(g*0.45), Math.round(b*0.3)],
            foamColor: [120, 130, 100]
        },
        {
            kind: 4, originX: 384, originY: 0, animated: true,
            baseTerrain: 1, // Obsidian volcanic rock
            baseMapper: (r, g, b) => [Math.round(r*0.3), Math.round(g*0.25), Math.round(b*0.25)],
            waterShape: 2,
            shoreType: "magma",
            waterMapper: (r, g, b, x, y, f) => {
                // Incandescent molten lava with bright yellow/orange heat currents
                const n = noise(x, y, 99 + f * 7);
                if (n > 0.82) return [255, 240, 120]; // yellow hot spot
                if (n > 0.5) return [255, 140, 30];   // vibrant orange wave
                return [210, 45, 10];                 // deep red magma
            },
            foamColor: [255, 230, 100]
        },
        {
            kind: 5, originX: 672, originY: 0, animated: true, isWaterfall: true,
            baseTerrain: 1,
            baseMapper: (r,g,b) => [Math.round(r*0.3), Math.round(g*0.25), Math.round(b*0.25)],
            waterShape: 2,
            waterMapper: (r, g, b) => [240, 120, 20],
            foamColor: [255, 230, 100]
        },
        {
            kind: 6, originX: 384, originY: 144, animated: true,
            baseTerrain: 1, // Cave floor shoreline
            baseMapper: (r, g, b) => [Math.round(r*0.6), Math.round(g*0.55), Math.round(b*0.5)],
            waterShape: 26,
            shoreType: "stone",
            waterMapper: (r, g, b) => [Math.round(r*0.4), Math.round(g*0.8+30), Math.min(255, Math.round(b*1.15+50))],
            foamColor: [170, 215, 240]
        },
        {
            kind: 7, originX: 672, originY: 144, animated: true, isWaterfall: true,
            baseTerrain: 1,
            waterShape: 2,
            waterMapper: (r, g, b) => [Math.min(255, Math.round(r*0.8+60)), Math.min(255, Math.round(g*0.9+70)), Math.min(255, Math.round(b*1.1+80))],
            foamColor: [230, 245, 255]
        }
    ];

    for (const def of waterDefs) {
        const frameCount = def.animated ? (def.isWaterfall ? 1 : 3) : 1;

        for (let frameIdx = 0; frameIdx < frameCount; frameIdx++) {
            const frameOriginX = def.originX + frameIdx * 96;
            const frameOriginY = def.originY;

            // U7 water animation phase
            const waterPhase = frameIdx * 4;

            for (let ny = 0; ny < 48; ny++) {
                for (let nx = 0; nx < 32; nx++) {
                    let isWater = false;
                    let isFoam = false;

                    if (def.isWaterfall) {
                        isWater = true;
                    } else if (ny < 16) {
                        if (nx < 16) {
                            // Isolated pond in cell (0, 0): surrounded by shoreline grass
                            const distFromEdge = Math.min(nx, 15 - nx, ny, 15 - ny);
                            const rWave = (Math.sin(nx * 0.8 + frameIdx * 1.5) + 1) * 0.6;
                            const shoreLine = 3 + rWave;
                            isWater = distFromEdge >= shoreLine;
                            isFoam = (distFromEdge >= shoreLine - 1.2 && distFromEdge < shoreLine);
                        } else {
                            // Inner corners in cell (1, 0)
                            const lx = nx - 16;
                            const isC0 = (lx < 4 && ny < 4);
                            const isC1 = (lx >= 12 && ny < 4);
                            const isC2 = (lx < 4 && ny >= 12);
                            const isC3 = (lx >= 12 && ny >= 12);
                            isWater = !(isC0 || isC1 || isC2 || isC3);
                            isFoam = (lx === 3 && ny < 4) || (lx < 4 && ny === 3) ||
                                     (lx === 12 && ny < 4) || (lx >= 12 && ny === 3) ||
                                     (lx === 3 && ny >= 12) || (lx < 4 && ny === 12) ||
                                     (lx === 12 && ny >= 12) || (lx >= 12 && ny === 12);
                        }
                    } else {
                        // 2x2 Blob square (0..31, 16..47):
                        // Outer shoreline bank on the perimeter
                        const by = ny - 16;
                        const distFromOuter = Math.min(nx, 31 - nx, by, 31 - by);
                        const waveWiggle = (Math.sin(nx * 0.7 + by * 0.5 + frameIdx * 2.0) + 1) * 0.7;
                        const shoreLine = 3.5 + waveWiggle;
                        isWater = distFromOuter >= shoreLine;
                        isFoam = (distFromOuter >= shoreLine - 1.2 && distFromOuter < shoreLine);
                    }

                    let r, g, b;
                    if (isWater) {
                        // Sample deep water with animated ripple frames
                        const wPix = getU7Pixel(def.waterShape, nx, ny, waterPhase, def.waterMapper);
                        r = wPix[0]; g = wPix[1]; b = wPix[2];

                        // Add gentle animated ripple highlights across open water
                        const rippleNoise = noise(nx + frameIdx * 2, ny - frameIdx * 2, 73);
                        if (rippleNoise > 0.9) {
                            r = Math.min(255, r + 40);
                            g = Math.min(255, g + 50);
                            b = Math.min(255, b + 65);
                        }
                    } else if (isFoam) {
                        // Animated shore foam / waterline
                        r = def.foamColor[0];
                        g = def.foamColor[1];
                        b = def.foamColor[2];
                    } else {
                        // Shoreline bank: Base Terrain (e.g. Grass, Mud, Sand, Obsidian)
                        const bPix = getU7Pixel(def.baseTerrain, nx, ny, 0, def.baseMapper);
                        r = bPix[0]; g = bPix[1]; b = bPix[2];
                    }

                    // 3x integer scale
                    for (let dy = 0; dy < 3; dy++) {
                        for (let dx = 0; dx < 3; dx++) {
                            const destX = frameOriginX + nx * 3 + dx;
                            const destY = frameOriginY + ny * 3 + dy;
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

    writePNG(outPath, totalW, totalH, buf);
    console.log(`[Master A1 Water] Built ${path.basename(outPath)} (768x576, Water with Shorelines & Animated Waves)`);
}

const tileDir = path.join(__dirname, '..', 'game', 'img', 'tilesets');

// Build both master chipsets
buildMasterGroundA2(path.join(tileDir, 'U7_Ground_A2.png'));
buildMasterWaterA1(path.join(tileDir, 'U7_Ground_A1.png'));

// Deploy to all active tilesets
fs.copyFileSync(path.join(tileDir, 'U7_Ground_A2.png'), path.join(tileDir, 'Outside_A2.png'));
fs.copyFileSync(path.join(tileDir, 'U7_Ground_A2.png'), path.join(tileDir, 'U7_Outside_A2.png'));
fs.copyFileSync(path.join(tileDir, 'U7_Ground_A2.png'), path.join(tileDir, 'Dungeon_A2.png'));
fs.copyFileSync(path.join(tileDir, 'U7_Ground_A2.png'), path.join(tileDir, 'U7_Dungeon_A2.png'));

fs.copyFileSync(path.join(tileDir, 'U7_Ground_A1.png'), path.join(tileDir, 'Outside_A1.png'));
fs.copyFileSync(path.join(tileDir, 'U7_Ground_A1.png'), path.join(tileDir, 'U7_Outside_A1.png'));
fs.copyFileSync(path.join(tileDir, 'U7_Ground_A1.png'), path.join(tileDir, 'Dungeon_A1.png'));
fs.copyFileSync(path.join(tileDir, 'U7_Ground_A1.png'), path.join(tileDir, 'U7_Dungeon_A1.png'));

console.log("\nMaster Ground (A2) and Animated Water (A1) Chipsets successfully generated and deployed!");

