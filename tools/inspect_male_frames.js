'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'raw');

function loadJpg(jpgPath) {
    const tmpPng = path.join(os.tmpdir(), `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${jpgPath.replace(/'/g, "''")}'); $img.Save('${tmpPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    const buf = fs.readFileSync(tmpPng);
    fs.unlinkSync(tmpPng);
    return decodePNG(buf, path.basename(jpgPath));
}

function isMagenta(r, g, b) {
    return (r > 165 && g < 85 && b > 165);
}

function findRowSprites(rawImg, yMin, yMax) {
    const w = rawImg.width;
    const colHasPixels = new Array(w).fill(false);

    for (let x = 0; x < w; x++) {
        for (let y = yMin; y < yMax && y < rawImg.height; y++) {
            const idx = (y * w + x) * 4;
            if (!isMagenta(rawImg.data[idx], rawImg.data[idx + 1], rawImg.data[idx + 2])) {
                colHasPixels[x] = true;
                break;
            }
        }
    }

    const segments = [];
    let inSeg = false, startX = 0;
    for (let x = 0; x < w; x++) {
        if (colHasPixels[x] && !inSeg) {
            inSeg = true; startX = x;
        } else if (!colHasPixels[x] && inSeg) {
            inSeg = false;
            if (x - startX > 25) segments.push({ x0: startX, x1: x - 1 });
        }
    }
    if (inSeg && (w - startX > 25)) segments.push({ x0: startX, x1: w - 1 });

    return segments.map(seg => {
        let topY = yMax, botY = yMin;
        for (let y = yMin; y < yMax && y < rawImg.height; y++) {
            for (let x = seg.x0; x <= seg.x1; x++) {
                const idx = (y * w + x) * 4;
                if (!isMagenta(rawImg.data[idx], rawImg.data[idx + 1], rawImg.data[idx + 2])) {
                    if (y < topY) topY = y;
                    if (y > botY) botY = y;
                }
            }
        }
        return { x0: seg.x0, x1: seg.x1, y0: topY, y1: botY };
    });
}

console.log('=== Inspecting Raw Action Sets for Male Elf ===');
['elf_walk_nano_banana_raw.jpg', 'elf_attack_nano_banana_raw.jpg', 'elf_bow_nano_banana_raw.jpg', 'elf_magic_nano_banana_raw.jpg', 'elf_work_nano_banana_raw.jpg', 'elf_downed_nano_banana_raw.jpg', 'elf_haul_sack_nano_banana_raw.jpg'].forEach(name => {
    const raw = loadJpg(path.join(RAW_DIR, name));
    const sBoxes = findRowSprites(raw, 10, 340);
    const wBoxes = findRowSprites(raw, 350, 680);
    const nBoxes = findRowSprites(raw, 690, 1020);
    console.log(`\n${name}:`);
    console.log(`  Row 0 (S): ${sBoxes.length} sprites:`, sBoxes.map(b => `[${b.x0}..${b.x1} w=${b.x1-b.x0+1}, h=${b.y1-b.y0+1}]`).join(' '));
    console.log(`  Row 1 (W): ${wBoxes.length} sprites:`, wBoxes.map(b => `[${b.x0}..${b.x1} w=${b.x1-b.x0+1}, h=${b.y1-b.y0+1}]`).join(' '));
    console.log(`  Row 2 (N): ${nBoxes.length} sprites:`, nBoxes.map(b => `[${b.x0}..${b.x1} w=${b.x1-b.x0+1}, h=${b.y1-b.y0+1}]`).join(' '));
});
