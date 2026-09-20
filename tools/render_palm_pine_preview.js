'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

function loadJpg(jpgPath) {
    const tmpPng = path.join(os.tmpdir(), `tmp_prev_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${jpgPath.replace(/'/g, "''")}'); $img.Save('${tmpPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    const buf = fs.readFileSync(tmpPng);
    fs.unlinkSync(tmpPng);
    return decodePNG(buf, path.basename(jpgPath));
}

const p = path.join(__dirname, '..', 'art', 'raw', 'palm_pine_nano_banana_raw.jpg');
const img = loadJpg(p);
const sw = 512, sh = 512;
const out = Buffer.alloc(sw * sh * 4);
for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
        const sx = Math.min(img.width - 1, Math.floor(x * (img.width / sw)));
        const sy = Math.min(img.height - 1, Math.floor(y * (img.height / sh)));
        const srcIdx = (sy * img.width + sx) * 4;
        const dstIdx = (y * sw + x) * 4;
        out[dstIdx] = img.data[srcIdx];
        out[dstIdx + 1] = img.data[srcIdx + 1];
        out[dstIdx + 2] = img.data[srcIdx + 2];
        out[dstIdx + 3] = 255;
    }
}
const outPath = path.join(__dirname, '..', 'art', 'review', 'raw_inspect_palm_pine_nano_banana_raw.png');
writePNG(outPath, sw, sh, out);
console.log('Saved:', outPath);

