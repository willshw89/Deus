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

// Dump an atlas of shapes 0 to 149 (15 columns x 10 rows of 8x8 tiles, scaled 3x = 24x24 per tile)
// Plus print info about each shape
const cols = 15;
const rows = 10;
const tileScaled = 24;
const totalW = cols * tileScaled;
const totalH = rows * tileScaled;
const buf = Buffer.alloc(totalW * totalH * 4, 0);

for (let s = 0; s < 150; s++) {
    const tile = decodeFlatTile(s, 0);
    if (!tile) continue;
    const col = s % cols;
    const row = Math.floor(s / cols);
    const ox = col * tileScaled;
    const oy = row * tileScaled;

    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            const sIdx = (y * 8 + x) * 4;
            const r = tile.pixels[sIdx];
            const g = tile.pixels[sIdx + 1];
            const b = tile.pixels[sIdx + 2];

            for (let dy = 0; dy < 3; dy++) {
                for (let dx = 0; dx < 3; dx++) {
                    const dIdx = (((oy + y * 3 + dy) * totalW) + (ox + x * 3 + dx)) * 4;
                    buf[dIdx] = r;
                    buf[dIdx + 1] = g;
                    buf[dIdx + 2] = b;
                    buf[dIdx + 3] = 255;
                }
            }
        }
    }
}

const outPath = path.join(__dirname, '..', 'reference', 'u7_flat_shapes_atlas.png');
if (!fs.existsSync(path.dirname(outPath))) fs.mkdirSync(path.dirname(outPath), { recursive: true });
writePNG(outPath, totalW, totalH, buf);
console.log(`Atlas dumped to ${outPath}`);
