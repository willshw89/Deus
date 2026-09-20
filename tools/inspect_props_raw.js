'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');
const { decodePNG } = require('./png_read');

function loadJpg(jpgPath) {
    const tmpPng = path.join(os.tmpdir(), `tmp_props_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${jpgPath.replace(/'/g, "''")}'); $img.Save('${tmpPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    const buf = fs.readFileSync(tmpPng);
    fs.unlinkSync(tmpPng);
    return decodePNG(buf, path.basename(jpgPath));
}

const targets = [
    'furnace_well_nano_banana_raw.jpg',
    'subterranean_glow_nano_banana_raw.jpg',
    'plants_sway_nano_banana_raw.jpg',
    'inventory_icons_nano_banana_raw.jpg',
    'palm_pine_nano_banana_raw.jpg'
];

for (const name of targets) {
    const p = path.join(__dirname, '..', 'art', 'raw', name);
    if (!fs.existsSync(p)) {
        console.log('Not found:', name);
        continue;
    }
    const img = loadJpg(p);
    console.log(`Loaded ${name}: ${img.width}x${img.height}`);
}

