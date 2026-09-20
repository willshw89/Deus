const fs = require('fs');

function hash32(...parts) {
    let h = 2166136261 >>> 0;
    for (const part of parts) {
        let v = part >>> 0;
        for (let i = 0; i < 4; i++) {
            h ^= v & 255;
            h = Math.imul(h, 16777619) >>> 0;
            v >>>= 8;
        }
    }
    h ^= h >>> 15;
    h = Math.imul(h, 0x2c1b3c6d) >>> 0;
    return (h ^ (h >>> 12)) >>> 0;
}
const hashString = s => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
    return h;
};
const smooth = t => t * t * (3 - 2 * t);
function valueNoise(seed, salt, gx, gy, scale) {
    const fx = gx / scale, fy = gy / scale;
    const ix = Math.floor(fx), iy = Math.floor(fy);
    const tx = smooth(fx - ix), ty = smooth(fy - iy);
    const c = (a, b) => hash32(seed, salt, a, b) / 4294967296;
    const a = c(ix, iy), b = c(ix + 1, iy), d = c(ix, iy + 1), e = c(ix + 1, iy + 1);
    const top = a + (b - a) * tx, bottom = d + (e - d) * tx;
    return top + (bottom - top) * ty;
}

const SOLID = 1, FLOOR = 2;
const STONE = 0, SOIL = 1;
const BORDER = 2;
const size = 256;
const seed = 424242;

const BIOMES = [
    null,
    { id: "rooted_loam", material: SOIL },
    { id: "clay_bed", material: SOIL },
    { id: "chalk_karst", material: STONE },
    { id: "shallow_cave", material: SOIL },
    { id: "deep_mine_belt", material: STONE },
    { id: "crystal_cavern", material: STONE },
    { id: "fossil_bed", material: STONE },
    { id: "deep_salt_cavern", material: STONE }
];

function generateUndergroundGen3(seed, z, ax = 0, ay = 0, size = 256) {
    const shape = new Uint8Array(size * size);
    const material = new Uint8Array(size * size);
    const biome = new Uint8Array(size * size);
    const water = new Uint8Array(size * size);
    const pockets = [];

    const salt = hashString(`uf.levels.v3.${z}`);
    const offset = hash32(seed, salt, 99) % 4;
    const rand = (...p) => hash32(seed, salt, ax, ay, ...p) / 4294967296;

    // 1. Voronoi biomes
    const provinces = [];
    for (let py = 0; py < 4; py++) for (let px = 0; px < 4; px++) {
        const i = py * 4 + px;
        provinces.push({
            x: (px + 0.25 + rand(i, 1) * 0.5) * size / 4,
            y: (py + 0.25 + rand(i, 2) * 0.5) * size / 4,
            code: (z === -1 ? 1 : 5) + ((px + py + offset) % 4)
        });
    }

    shape.fill(SOLID);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        let nearest = null, distance = Infinity;
        for (const p of provinces) {
            const d = (x - p.x) ** 2 + (y - p.y) ** 2;
            if (d < distance) { nearest = p; distance = d; }
        }
        const i = y * size + x;
        biome[i] = nearest.code;
        material[i] = BIOMES[nearest.code].material;
    }

    // 2. Continuous rolling cavern network with tunnels & pillars
    for (let y = BORDER; y < size - BORDER; y++) {
        for (let x = BORDER; x < size - BORDER; x++) {
            const gx = ax * size + x, gy = ay * size + y;
            const n1 = valueNoise(seed, salt + 101, gx, gy, z === -1 ? 26 : 30);
            const n2 = valueNoise(seed, salt + 102, gx, gy, 13);
            const n3 = valueNoise(seed, salt + 103, gx, gy, 6);
            const cVal = n1 * 0.55 + n2 * 0.32 + n3 * 0.13;

            const t1 = Math.abs(valueNoise(seed, salt + 201, gx, gy, 20) - 0.5) * 2;
            const t2 = Math.abs(valueNoise(seed, salt + 202, gx, gy, 20) - 0.5) * 2;
            const tVal = Math.min(t1, t2);

            const pVal = valueNoise(seed, salt + 301, gx, gy, 5);

            const isHall = cVal > (z === -1 ? 0.54 : 0.56);
            const isCorridor = tVal < (z === -1 ? 0.080 : 0.068);

            if ((isHall || isCorridor) && !(isHall && pVal > 0.84)) {
                shape[y * size + x] = FLOOR;
            }
        }
    }

    // 3. Habitable pockets with dry cores and water pools
    const divisions = z === -1 ? 6 : 4;
    const span = size / divisions;
    for (let py = 0; py < divisions; py++) {
        for (let px = 0; px < divisions; px++) {
            const id = py * divisions + px + 1;
            const minX = Math.max(BORDER + 4, Math.floor(px * span));
            const maxX = Math.min(size - BORDER - 5, Math.floor((px + 1) * span));
            const minY = Math.max(BORDER + 4, Math.floor(py * span));
            const maxY = Math.min(size - BORDER - 5, Math.floor((py + 1) * span));

            let bestX = Math.floor((minX + maxX) / 2);
            let bestY = Math.floor((minY + maxY) / 2);
            let bestScore = -1;

            for (let cy = minY + 2; cy <= maxY - 2; cy += 2) {
                for (let cx = minX + 2; cx <= maxX - 2; cx += 2) {
                    let score = 0;
                    for (let dy = -3; dy <= 3; dy++) {
                        for (let dx = -3; dx <= 3; dx++) {
                            if (shape[(cy + dy) * size + (cx + dx)] === FLOOR) score++;
                        }
                    }
                    if (score > bestScore) {
                        bestScore = score;
                        bestX = cx;
                        bestY = cy;
                    }
                }
            }

            const clearRadius = 3;
            // Carve clear dry core around pocket center
            for (let dy = -clearRadius; dy <= clearRadius; dy++) {
                for (let dx = -clearRadius; dx <= clearRadius; dx++) {
                    const idx = (bestY + dy) * size + (bestX + dx);
                    shape[idx] = FLOOR;
                    water[idx] = 0; // ensure dry core
                }
            }

            // Water source near the pocket (outside the dry core)
            const wx = Math.min(size - BORDER - 2, bestX + clearRadius + 2);
            const wy = bestY;
            for (let dy = 0; dy <= 1; dy++) {
                for (let dx = 0; dx <= 1; dx++) {
                    const idx = (wy + dy) * size + (wx + dx);
                    shape[idx] = FLOOR;
                    water[idx] = 1;
                }
            }

            const bounds = {
                x0: Math.max(BORDER, bestX - 12),
                x1: Math.min(size - BORDER - 1, bestX + 12),
                y0: Math.max(BORDER, bestY - 12),
                y1: Math.min(size - BORDER - 1, bestY + 12)
            };

            pockets.push({
                id, z,
                area: { x: ax, y: ay },
                x: bestX, y: bestY,
                floorCells: bestScore * 10,
                clearRadius,
                bounds,
                biome: BIOMES[biome[bestY * size + bestX]].id,
                water: { x: wx, y: wy }
            });
        }
    }

    pockets.sort((a, b) => b.floorCells - a.floorCells || a.id - b.id);
    return { shape, material, biome, water, pockets };
}

for (const z of [-1, -2]) {
    const result = generateUndergroundGen3(seed, z);
    let solid = 0, floor = 0, soil = 0, wat = 0;
    const biomeCounts = {};
    for (let i = 0; i < size * size; i++) {
        if (result.shape[i] === SOLID) solid++;
        if (result.shape[i] === FLOOR) floor++;
        if (result.material[i] === SOIL) soil++;
        if (result.water[i]) wat++;
        biomeCounts[result.biome[i]] = (biomeCounts[result.biome[i]] || 0) + 1;
    }
    const solidFraction = solid / (size * size);
    console.log(`Z=${z}: solidFraction ${(solidFraction * 100).toFixed(2)}%, pockets ${result.pockets.length}, water ${wat}, soil ${soil}, biomes:`, biomeCounts);
}

