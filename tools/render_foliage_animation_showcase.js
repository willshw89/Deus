const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const OUT_PNG = path.join(ROOT, 'art', 'review', 'foliage_sprite_sway_showcase_3x.png');

console.log("=== Generating Foliage 3-Frame Sway Showcase ===");

const SHOWCASE_ASSETS = [
    { name: "!$UF_Oak", label: "Oak Tree (96x96)" },
    { name: "!$UF_Pine", label: "Pine Tree (96x96)" },
    { name: "!$UF_Birch", label: "Birch Tree (96x96)" },
    { name: "!$UF_Fruit_Tree", label: "Fruit Tree (96x96)" },
    { name: "!$UF_BerryBush", label: "Berry Bush (48x48)" },
    { name: "!$UF_Bush", label: "Bush (48x48)" },
    { name: "!$UF_Fern", label: "Fern (48x48)" },
    { name: "!$UF_Flowers_Purple", label: "Flowers (48x48)" },
    { name: "!$UF_GrassTuft", label: "Grass Tuft (48x48)" },
    { name: "!$UF_Reeds", label: "Reeds (48x48)" }
];

// We will arrange them in a clean gallery:
// For each asset, show Frame 0 (Sway L), Frame 1 (Center), Frame 2 (Sway R)
// Scaled 3x with nearest neighbor.

const CARD_W = 96 * 3 * 3 + 40; // 904 px wide
let totalH = 40;

const loaded = [];
for (const item of SHOWCASE_ASSETS) {
    const pPath = path.join(CHAR_DIR, item.name + '.png');
    const jPath = path.join(CHAR_DIR, item.name + '.json');
    if (!fs.existsSync(pPath) || !fs.existsSync(jPath)) continue;

    const sidecar = JSON.parse(fs.readFileSync(jPath, 'utf8'));
    const fw = sidecar.frameWidth || 48;
    const fh = sidecar.frameHeight || 48;
    const raw = decodePNG(fs.readFileSync(pPath), item.name + '.png');

    loaded.push({
        name: item.name,
        label: item.label,
        fw, fh, raw,
        scale: 3
    });

    totalH += (fh * 3) + 30;
}

const outW = 960;
const outH = totalH + 20;
const outData = Buffer.alloc(outW * outH * 4);

// Background: deep charcoal dark slate (#181a20)
for (let i = 0; i < outW * outH; i++) {
    outData[i * 4] = 24;
    outData[i * 4 + 1] = 26;
    outData[i * 4 + 2] = 32;
    outData[i * 4 + 3] = 255;
}

let currY = 30;

for (const item of loaded) {
    const { fw, fh, raw, scale, label } = item;
    const srcW = raw.width;
    const srcData = raw.data;

    // Draw 3 columns (col 0, 1, 2) of row 0
    const startX = 60;
    const colSpacing = (fw * scale) + 20;

    for (let col = 0; col < 3; col++) {
        const dstBaseX = startX + col * colSpacing;
        const dstBaseY = currY;

        // Draw bounding subtle cell
        for (let dy = 0; dy < fh * scale; dy++) {
            for (let dx = 0; dx < fw * scale; dx++) {
                const px = dstBaseX + dx;
                const py = dstBaseY + dy;
                const idx = (py * outW + px) * 4;
                // subtle backdrop tile
                outData[idx] = 32;
                outData[idx + 1] = 36;
                outData[idx + 2] = 44;
                outData[idx + 3] = 255;
            }
        }

        // Blit sprite frame
        for (let y = 0; y < fh; y++) {
            for (let x = 0; x < fw; x++) {
                const sX = col * fw + x;
                const sY = y;
                const sIdx = (sY * srcW + sX) * 4;
                const a = srcData[sIdx + 3];
                if (a > 10) {
                    const r = srcData[sIdx];
                    const g = srcData[sIdx + 1];
                    const b = srcData[sIdx + 2];

                    for (let sy = 0; sy < scale; sy++) {
                        for (let sx = 0; sx < scale; sx++) {
                            const px = dstBaseX + x * scale + sx;
                            const py = dstBaseY + y * scale + sy;
                            const dIdx = (py * outW + px) * 4;

                            // Alpha blend over background
                            const alpha = a / 255;
                            outData[dIdx] = Math.round(r * alpha + outData[dIdx] * (1 - alpha));
                            outData[dIdx + 1] = Math.round(g * alpha + outData[dIdx + 1] * (1 - alpha));
                            outData[dIdx + 2] = Math.round(b * alpha + outData[dIdx + 2] * (1 - alpha));
                            outData[dIdx + 3] = 255;
                        }
                    }
                }
            }
        }
    }

    currY += (fh * scale) + 30;
}

writePNG(OUT_PNG, outW, outH, outData);
console.log(`Successfully generated foliage sway showcase: ${OUT_PNG}`);
