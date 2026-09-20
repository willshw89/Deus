'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

function loadJpg(jpgPath) {
    const tmpPng = path.join(os.tmpdir(), `tmp_crop_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${jpgPath.replace(/'/g, "''")}'); $img.Save('${tmpPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    const buf = fs.readFileSync(tmpPng);
    fs.unlinkSync(tmpPng);
    return decodePNG(buf, path.basename(jpgPath));
}

const raw = loadJpg(path.join(__dirname, '..', 'art', 'raw', 'plants_sway_nano_banana_raw.jpg'));
const cw = 320, ch = 300;
const crop = Buffer.alloc(cw * ch * 4);
for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
        const sx = 340 + x;
        const sy = 40 + y;
        const sidx = (sy * raw.width + sx) * 4;
        const didx = (y * cw + x) * 4;
        crop[didx] = raw.data[sidx];
        crop[didx + 1] = raw.data[sidx + 1];
        crop[didx + 2] = raw.data[sidx + 2];
        crop[didx + 3] = 255;
    }
}
const outPath = path.join(__dirname, '..', 'art', 'review', 'crop_top_middle.png');
writePNG(outPath, cw, ch, crop);
console.log('Saved:', outPath);

