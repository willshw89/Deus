const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');
const { decodePNG } = require('./png_read');

function loadJpg(jpgPath) {
    const tmpPng = path.join(os.tmpdir(), `tmp_inspect_${Date.now()}.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${jpgPath.replace(/'/g, "''")}'); $img.Save('${tmpPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    const buf = fs.readFileSync(tmpPng);
    try { fs.unlinkSync(tmpPng); } catch(e) {}
    return decodePNG(buf, path.basename(jpgPath));
}

const m = loadJpg('C:/Users/snewt/.gemini/antigravity/brain/f9b9af6f-1902-44c2-8bc1-fe9d0fdadb45/faces_human_males_1789863537057.jpg');
const f = loadJpg('C:/Users/snewt/.gemini/antigravity/brain/f9b9af6f-1902-44c2-8bc1-fe9d0fdadb45/faces_human_females_1789863654515.jpg');
console.log('Males:', m.width, 'x', m.height, 'Females:', f.width, 'x', f.height);
