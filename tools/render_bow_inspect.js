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

const bowRaw = loadJpg(path.join(RAW_DIR, 'elf_bow_nano_banana_raw.jpg'));

const outW = 1024, outH = 1024;
const outBuf = Buffer.alloc(outW * outH * 4);
for (let i = 0; i < outBuf.length; i += 4) {
    outBuf[i] = bowRaw.data[i];
    outBuf[i+1] = bowRaw.data[i+1];
    outBuf[i+2] = bowRaw.data[i+2];
    outBuf[i+3] = 255;
}

fs.writeFileSync(path.join(ROOT, 'art', 'review', 'bow_raw_inspect.png'), writePNG(outBuf, outW, outH));
console.log('Saved bow_raw_inspect.png');
