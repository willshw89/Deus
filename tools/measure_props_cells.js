'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');
const { decodePNG } = require('./png_read');

const ROOT = path.resolve(__dirname, '..');

function loadJpg(jpgPath) {
    const tmpPng = path.join(os.tmpdir(), `tmp_inspect_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${jpgPath.replace(/'/g, "''")}'); $img.Save('${tmpPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    const buf = fs.readFileSync(tmpPng);
    fs.unlinkSync(tmpPng);
    return decodePNG(buf, path.basename(jpgPath));
}

function isMagenta(r, g, b) {
    return (r > 190 && g < 75 && b > 190);
}

const sheets = [
    'art/raw/nano_fences_gates_raw.jpg',
    'art/raw/nano_signposts_markers_raw.jpg',
    'art/raw/nano_boulders_megaliths_raw.jpg',
    'art/raw/nano_camp_farm_props_raw.jpg',
    'art/raw/nano_ruins_bridges_caves_raw.jpg'
];

for (const s of sheets) {
    const p = path.join(ROOT, s);
    if (!fs.existsSync(p)) {
        console.log(`Skipping missing ${s}`);
        continue;
    }
    const img = loadJpg(p);
    console.log(`=== ${path.basename(s)} (${img.width}x${img.height}) ===`);
    console.log(`(0,0): ${img.data[0]},${img.data[1]},${img.data[2]}`);
    console.log(`(10,10): ${img.data[(10*img.width+10)*4]},${img.data[(10*img.width+10)*4+1]},${img.data[(10*img.width+10)*4+2]}`);
    console.log(`(255,255): ${img.data[(255*img.width+255)*4]},${img.data[(255*img.width+255)*4+1]},${img.data[(255*img.width+255)*4+2]}`);
    console.log(`(256,256): ${img.data[(256*img.width+256)*4]},${img.data[(256*img.width+256)*4+1]},${img.data[(256*img.width+256)*4+2]}`);
    const cellW = img.width / 4;
    const cellH = img.height / 4;
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            let minX = cellW, maxX = 0, minY = cellH, maxY = 0;
            let count = 0;
            for (let y = 3; y < cellH - 3; y++) {
                for (let x = 3; x < cellW - 3; x++) {
                    const px = Math.floor(c * cellW + x);
                    const py = Math.floor(r * cellH + y);
                    const idx = (py * img.width + px) * 4;
                    const cr = img.data[idx], cg = img.data[idx + 1], cb = img.data[idx + 2];
                    if (!isMagenta(cr, cg, cb)) {
                        count++;
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }
            console.log(`Cell (${r},${c}): inner bounds [${minX},${minY}..${maxX},${maxY}] (${maxX - minX + 1}x${maxY - minY + 1}), opaque: ${count}`);
        }
    }
}
