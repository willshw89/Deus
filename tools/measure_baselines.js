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

// Check foot y on each raw sheet for row 0 (y around 310-330)
const sheets = [
    'elf_walk_nano_banana_raw.jpg',
    'elf_attack_nano_banana_raw.jpg',
    'elf_bow_nano_banana_raw.jpg',
    'elf_magic_nano_banana_raw.jpg',
    'elf_work_nano_banana_raw.jpg',
    'elf_downed_nano_banana_raw.jpg',
    'elf_haul_sack_nano_banana_raw.jpg'
];

sheets.forEach(name => {
    const raw = loadJpg(path.join(RAW_DIR, name));
    // Find bottommost non-magenta pixel in row 0, row 1, row 2
    function getRowBaseline(yMin, yMax) {
        let maxBottom = 0;
        for (let y = yMin; y < yMax && y < raw.height; y++) {
            for (let x = 0; x < raw.width; x++) {
                const idx = (y * raw.width + x) * 4;
                if (!isMagenta(raw.data[idx], raw.data[idx + 1], raw.data[idx + 2])) {
                    if (y > maxBottom) maxBottom = y;
                }
            }
        }
        return maxBottom;
    }

    const b0 = getRowBaseline(10, 340);
    const b1 = getRowBaseline(350, 680);
    const b2 = getRowBaseline(690, 1020);
    console.log(`${name}: baseline Y -> Row 0: ${b0}, Row 1: ${b1}, Row 2: ${b2}`);
});
