const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const BRAIN = 'C:/Users/snewt/.gemini/antigravity/brain/8584d1db-b919-4549-a06e-7f379ac517a3';
const srcPath = path.join(ROOT, 'game', 'test_output', 'dwarf_faction_live_ingame_closeup.png');

const img = decodePNG(fs.readFileSync(srcPath), 'closeup');
console.log('Source image dimensions:', img.width, img.height);

// Crop rectangle around center where dwarves and weapons are placed
// Dwarves are centered around x: 260..600, y: 190..390
const startX = 220;
const startY = 180;
const cropW = 420;
const cropH = 210;

const cropBuf = Buffer.alloc(cropW * cropH * 4);
for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
        const sIdx = (((startY + y) * img.width) + (startX + x)) * 4;
        const dIdx = (y * cropW + x) * 4;
        cropBuf[dIdx] = img.data[sIdx];
        cropBuf[dIdx + 1] = img.data[sIdx + 1];
        cropBuf[dIdx + 2] = img.data[sIdx + 2];
        cropBuf[dIdx + 3] = img.data[sIdx + 3];
    }
}

writePNG(path.join(ROOT, 'game', 'test_output', 'dwarf_combat_live_ingame_crop.png'), cropW, cropH, cropBuf);
writePNG(path.join(BRAIN, 'dwarf_combat_live_ingame_crop.png'), cropW, cropH, cropBuf);

// 2x crisp nearest-neighbor upscale for visual artifact and user presentation
const scale = 2;
const scaledW = cropW * scale;
const scaledH = cropH * scale;
const scaledBuf = Buffer.alloc(scaledW * scaledH * 4);

for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
        const sIdx = (y * cropW + x) * 4;
        for (let dy = 0; dy < scale; dy++) {
            for (let dx = 0; dx < scale; dx++) {
                const dIdx = (((y * scale + dy) * scaledW) + (x * scale + dx)) * 4;
                scaledBuf[dIdx] = cropBuf[sIdx];
                scaledBuf[dIdx + 1] = cropBuf[sIdx + 1];
                scaledBuf[dIdx + 2] = cropBuf[sIdx + 2];
                scaledBuf[dIdx + 3] = cropBuf[sIdx + 3];
            }
        }
    }
}

writePNG(path.join(ROOT, 'game', 'test_output', 'dwarf_combat_live_ingame_crop_2x.png'), scaledW, scaledH, scaledBuf);
writePNG(path.join(BRAIN, 'dwarf_combat_live_ingame_crop_2x.png'), scaledW, scaledH, scaledBuf);

console.log('Crop and 2x zoom render complete!');
