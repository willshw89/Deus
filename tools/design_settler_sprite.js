const fs = require('fs');
const path = require('path');
const { writePNG } = require('./png_util');

// Let's create helper to render 16x16 grid to PNG, both 1x and upscaled Nx for easy viewing
function exportSprite(filename, grid, palette) {
    const w = 16;
    const h = 16;
    const buf1x = Buffer.alloc(w * h * 4);

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const char = grid[y][x];
            const color = palette[char];
            if (!color) {
                throw new Error(`Unknown char '${char}' at (${x}, ${y})`);
            }
            const idx = (y * w + x) * 4;
            buf1x[idx] = color[0];
            buf1x[idx + 1] = color[1];
            buf1x[idx + 2] = color[2];
            buf1x[idx + 3] = color[3] !== undefined ? color[3] : 255;
        }
    }

    // Write 1x native PNG
    writePNG(filename, w, h, buf1x);

    // Also write a 16x preview for inspection
    const scale = 16;
    const sw = w * scale;
    const sh = h * scale;
    const bufPreview = Buffer.alloc(sw * sh * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const sIdx = (y * w + x) * 4;
            for (let dy = 0; dy < scale; dy++) {
                for (let dx = 0; dx < scale; dx++) {
                    const dIdx = (((y * scale + dy) * sw) + (x * scale + dx)) * 4;
                    bufPreview[dIdx] = buf1x[sIdx];
                    bufPreview[dIdx + 1] = buf1x[sIdx + 1];
                    bufPreview[dIdx + 2] = buf1x[sIdx + 2];
                    bufPreview[dIdx + 3] = buf1x[sIdx + 3];
                }
            }
        }
    }
    const previewName = filename.replace('.png', '_preview16x.png');
    writePNG(previewName, sw, sh, bufPreview);
    console.log(`Saved ${filename} (16x16) and ${previewName} (${sw}x${sh})`);
}

module.exports = { exportSprite };

