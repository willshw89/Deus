#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');
const { decodePNG } = require('./png_read');

function loadJpg(jpgPath) {
    const tmpPng = path.join(os.tmpdir(), `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${jpgPath.replace(/'/g, "''")}'); $img.Save('${tmpPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    const buf = fs.readFileSync(tmpPng);
    fs.unlinkSync(tmpPng);
    return decodePNG(buf, path.basename(jpgPath));
}

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'raw');

const files = [
    'elf_walk_nano_banana_raw.jpg',
    'elf_attack_nano_banana_raw.jpg',
    'elf_bow_nano_banana_raw.jpg',
    'elf_magic_nano_banana_raw.jpg',
    'elf_work_nano_banana_raw.jpg',
    'elf_downed_nano_banana_raw.jpg',
    'elf_haul_sack_nano_banana_raw.jpg',
    'elf_female_haul_nano_banana_raw.jpg',
    'elf_child_haul_nano_banana_raw.jpg'
];

function isMagenta(r, g, b) {
    return (r > 165 && g < 85 && b > 165);
}

files.forEach(f => {
    const full = path.join(RAW_DIR, f);
    if (!fs.existsSync(full)) {
        console.log(`Missing: ${f}`);
        return;
    }
    const img = loadJpg(full);
    console.log(`\n=== ${f} (${img.width}x${img.height}) ===`);

    // Vertical projection to find rows
    const rowOpaque = new Array(img.height).fill(0);
    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
            const idx = (y * img.width + x) * 4;
            if (!isMagenta(img.data[idx], img.data[idx + 1], img.data[idx + 2])) {
                rowOpaque[y]++;
            }
        }
    }

    // Find row spans
    const rowBands = [];
    let inBand = false, startY = 0;
    for (let y = 0; y < img.height; y++) {
        if (rowOpaque[y] > 20 && !inBand) {
            inBand = true;
            startY = y;
        } else if (rowOpaque[y] <= 20 && inBand) {
            inBand = false;
            if (y - startY > 40) rowBands.push({ startY, endY: y - 1 });
        }
    }
    if (inBand) rowBands.push({ startY, endY: img.height - 1 });

    console.log(`Found ${rowBands.length} row bands:`);
    rowBands.forEach((b, rIdx) => {
        // Find column spans within this row
        const colOpaque = new Array(img.width).fill(0);
        for (let y = b.startY; y <= b.endY; y++) {
            for (let x = 0; x < img.width; x++) {
                const idx = (y * img.width + x) * 4;
                if (!isMagenta(img.data[idx], img.data[idx + 1], img.data[idx + 2])) {
                    colOpaque[x]++;
                }
            }
        }

        const colBands = [];
        let inCol = false, startX = 0;
        for (let x = 0; x < img.width; x++) {
            if (colOpaque[x] > 5 && !inCol) {
                inCol = true;
                startX = x;
            } else if (colOpaque[x] <= 5 && inCol) {
                inCol = false;
                if (x - startX > 20) colBands.push({ startX, endX: x - 1 });
            }
        }
        if (inCol) colBands.push({ startX, endX: img.width - 1 });

        console.log(`  Row ${rIdx} [y=${b.startY}..${b.endY}, h=${b.endY - b.startY + 1}]: ${colBands.length} sprites -> ${colBands.map(c => `[x=${c.startX}..${c.endX}, w=${c.endX - c.startX + 1}]`).join(', ')}`);
    });
});
