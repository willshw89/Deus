const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');
const { decodePNG } = require('./png_read');

const jpgPath = 'C:/Users/snewt/.gemini/antigravity/brain/8584d1db-b919-4549-a06e-7f379ac517a3/nb_boar_profile_1789843829642.jpg';
const tmpPng = path.join(os.tmpdir(), 'profile_inspect3.png');
const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${jpgPath}'); $img.Save('${tmpPng}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);

const png = decodePNG(fs.readFileSync(tmpPng), 'profile.png');
try { fs.unlinkSync(tmpPng); } catch (e) {}

function isBgPixel(r, g, b) {
    return (r > 150 && g < 90 && b > 150) || (r > 130 && g < 70 && b > 130) || (r > 180 && g < 120 && b > 180);
}

for (let y = 715; y <= 755; y++) {
    let nonBg = 0;
    for (let x = 168; x <= 849; x++) {
        const idx = (y * png.width + x) * 4;
        if (!isBgPixel(png.data[idx], png.data[idx+1], png.data[idx+2])) nonBg++;
    }
    console.log(`y = ${y}: nonBg = ${nonBg}`);
}

