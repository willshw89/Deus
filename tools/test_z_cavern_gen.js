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
const BORDER = 2;
const size = 256;
const seed = 424242;

function testCavern(z) {
    const shape = new Uint8Array(size * size);
    shape.fill(SOLID);
    const salt = hashString(`uf.levels.v3.${z}`);

    let floorCount = 0;
    for (let y = BORDER; y < size - BORDER; y++) {
        for (let x = BORDER; x < size - BORDER; x++) {
            const gx = x, gy = y;
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
                floorCount++;
            }
        }
    }

    // Pockets extraction
    const divisions = z === -1 ? 6 : 4;
    const span = size / divisions;
    const pockets = [];
    for (let py = 0; py < divisions; py++) {
        for (let px = 0; px < divisions; px++) {
            const id = py * divisions + px + 1;
            const minX = Math.max(BORDER + 2, Math.floor(px * span));
            const maxX = Math.min(size - BORDER - 3, Math.floor((px + 1) * span));
            const minY = Math.max(BORDER + 2, Math.floor(py * span));
            const maxY = Math.min(size - BORDER - 3, Math.floor((py + 1) * span));

            let bestX = Math.floor((minX + maxX) / 2);
            let bestY = Math.floor((minY + maxY) / 2);
            let bestScore = -1;

            for (let cy = minY + 2; cy <= maxY - 2; cy += 2) {
                for (let cx = minX + 2; cx <= maxX - 2; cx += 2) {
                    if (shape[cy * size + cx] !== FLOOR) continue;
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

            if (bestScore < 0) {
                // Ensure at least one floor cell
                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        shape[(bestY + dy) * size + (bestX + dx)] = FLOOR;
                    }
                }
                bestScore = 25;
            }

            // Find water cell near bestX, bestY
            const wx = Math.min(size - BORDER - 1, bestX + 3);
            const wy = bestY;
            for (let dy = 0; dy <= 1; dy++) {
                for (let dx = 0; dx <= 1; dx++) {
                    shape[(wy + dy) * size + (wx + dx)] = FLOOR;
                }
            }

            pockets.push({
                id, z, x: bestX, y: bestY,
                floorCells: bestScore * 10,
                clearRadius: 3,
                water: { x: wx, y: wy }
            });
        }
    }
    console.log(`Generated ${pockets.length} pockets for level ${z}. Sample pocket:`, pockets[0]);

    const floorPct = (floorCount / (size * size) * 100).toFixed(2);
    const solidPct = ((size * size - floorCount) / (size * size) * 100).toFixed(2);
    console.log(`Level ${z}: floor ${floorPct}%, solid ${solidPct}% (total cells: ${size * size})`);

    // Let's print an ASCII 40x20 preview of a section (x: 40-100, y: 40-70)
    console.log(`ASCII preview of Level ${z} (60x25 sample):`);
    let preview = '';
    for (let y = 40; y < 65; y++) {
        let line = '';
        for (let x = 40; x < 100; x++) {
            line += shape[y * size + x] === FLOOR ? '.' : '#';
        }
        preview += line + '\n';
    }
    console.log(preview);
}

testCavern(-1);
testCavern(-2);
