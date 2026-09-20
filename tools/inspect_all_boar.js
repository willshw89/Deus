const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');
const { decodePNG } = require('./png_read');

const BRAIN = 'C:/Users/snewt/.gemini/antigravity/brain/8584d1db-b919-4549-a06e-7f379ac517a3';
const files = [
  'nb_boar_south_1789843675270.jpg',
  'nb_boar_north_1789843886155.jpg',
  'nb_boar_southwest_1789844075876.jpg',
  'nb_boar_northwest_1789844091092.jpg',
  'nb_boar_death_1789844012900.jpg'
];

for (const f of files) {
  const jpgPath = path.join(BRAIN, f);
  const tmpPng = path.join(os.tmpdir(), 'tmp_check.png');
  const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${jpgPath}'); $img.Save('${tmpPng}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
  childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
  const png = decodePNG(fs.readFileSync(tmpPng), f);
  try { fs.unlinkSync(tmpPng); } catch (e) {}
  let minX = png.width, maxX = 0, minY = png.height, maxY = 0;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const idx = (y * png.width + x) * 4;
      const r = png.data[idx], g = png.data[idx+1], b = png.data[idx+2];
      const isBg = (r > 150 && g < 90 && b > 150) || (r > 130 && g < 70 && b > 130) || (r > 180 && g < 120 && b > 180);
      if (!isBg) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  console.log(f, 'BBox:', minX, minY, maxX, maxY, 'Size:', (maxX - minX + 1), 'x', (maxY - minY + 1));
}

