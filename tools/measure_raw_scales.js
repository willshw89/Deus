'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');
const { decodePNG } = require('./png_read');

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

// In each sheet, let's find the head size of the front-facing (South) sprite
const sheets = [
    'elf_walk_nano_banana_raw.jpg',
    'elf_attack_nano_banana_raw.jpg',
    'elf_bow_nano_banana_raw.jpg',
    'elf_magic_nano_banana_raw.jpg',
    'elf_work_nano_banana_raw.jpg',
    'elf_downed_nano_banana_raw.jpg',
    'elf_haul_sack_nano_banana_raw.jpg'
];

console.log('=== Measuring Raw Sprite Anatomy Across Sheets ===');

sheets.forEach(name => {
    const raw = loadJpg(path.join(RAW_DIR, name));
    // Sample frame 0 of row 0 (South facing)
    // Find x0, x1, y0, y1 of the first sprite
    let x0 = raw.width, x1 = 0, y0 = 350, y1 = 0;
    for (let x = 0; x < 250; x++) {
        for (let y = 10; y < 350; y++) {
            const idx = (y * raw.width + x) * 4;
            if (!isMagenta(raw.data[idx], raw.data[idx + 1], raw.data[idx + 2])) {
                if (x < x0) x0 = x;
                if (x > x1) x1 = x;
                if (y < y0) y0 = y;
                if (y > y1) y1 = y;
            }
        }
    }
    
    // Find feet (lowest y) and head top (highest y) of the standing body
    // Also find head width at eye level
    const h = y1 - y0 + 1;
    const w = x1 - x0 + 1;
    console.log(`${name}:`);
    console.log(`  Sprite 0 bounds: x=[${x0}..${x1}] (w=${w}), y=[${y0}..${y1}] (h=${h})`);
});
