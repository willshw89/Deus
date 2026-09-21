'use strict';

const fs = require('fs');
const path = require('path');
const { convertJpgToPng } = require('./jpg_to_png');
const { readPNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const JPG_PATH = "C:/Users/snewt/.gemini/antigravity/brain/68544d17-f5bb-452f-930d-323a949c82b4/deus_chest_master_1790011793058.jpg";
const PNG_PATH = path.join(ROOT, 'art', 'raw', 'deus_chest_master.png');
const APP_DIR = path.join(ROOT, 'art', 'staging', 'chest_approved');

if (!fs.existsSync(APP_DIR)) fs.mkdirSync(APP_DIR, { recursive: true });

convertJpgToPng(JPG_PATH, PNG_PATH);
const img = readPNG(PNG_PATH);
console.log(`Loaded deus_chest_master: ${img.width}x${img.height}`);

const cw = Math.floor(img.width / 3);
const ch = Math.floor(img.height / 4);

// Extract all cells
for (let r = 1; r <= 4; r++) {
    for (let c = 1; c <= 3; c++) {
        const frameId = `R${r}C${c}`;
        const cellBuf = Buffer.alloc(cw * ch * 4);
        for (let y = 0; y < ch; y++) {
            for (let x = 0; x < cw; x++) {
                const sIdx = (((r - 1) * ch + y) * img.width + ((c - 1) * cw + x)) * 4;
                const dIdx = (y * cw + x) * 4;
                cellBuf[dIdx] = img.data[sIdx];
                cellBuf[dIdx + 1] = img.data[sIdx + 1];
                cellBuf[dIdx + 2] = img.data[sIdx + 2];
                cellBuf[dIdx + 3] = img.data[sIdx + 3];
            }
        }
        writePNG(path.join(APP_DIR, `${frameId}.png`), cw, ch, cellBuf);
    }
}
console.log('Extracted and preserved all cells into:', APP_DIR);
