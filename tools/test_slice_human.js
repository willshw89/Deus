const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

function loadJpg(jpgPath) {
    const tmpPng = path.join(os.tmpdir(), `tmp_inspect_${Date.now()}.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${jpgPath.replace(/'/g, "''")}'); $img.Save('${tmpPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    const buf = fs.readFileSync(tmpPng);
    try { fs.unlinkSync(tmpPng); } catch(e) {}
    return decodePNG(buf, path.basename(jpgPath));
}

function crop(src, x, y, w, h) {
    const out = Buffer.alloc(w * h * 4);
    for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
            const si = ((y + r) * src.width + (x + c)) * 4;
            const di = (r * w + c) * 4;
            out[di] = src.data[si];
            out[di + 1] = src.data[si + 1];
            out[di + 2] = src.data[si + 2];
            out[di + 3] = src.data[si + 3];
        }
    }
    return out;
}

const m = loadJpg('C:/Users/snewt/.gemini/antigravity/brain/f9b9af6f-1902-44c2-8bc1-fe9d0fdadb45/faces_human_males_1789863537057.jpg');

// Let's test Row 0 (4 cells) and Row 1 (3 cells)
// Row 0: y = 10..415, h = 405
// Row 1: y = 430..835, h = 405
const r0_y = 10, r0_h = 405;
const r1_y = 430, r1_h = 405;

// In Row 0: cols are around:
// c0: 10..310 (w=300)
// c1: 325..625 (w=300)
// c2: 640..940 (w=300)
// c3: 955..1255 (w=300)
const m_cells = [
    crop(m, 10, r0_y, 300, r0_h),
    crop(m, 325, r0_y, 300, r0_h),
    crop(m, 640, r0_y, 300, r0_h),
    crop(m, 955, r0_y, 300, r0_h),
    // Row 1 (3 cells):
    // c0: 10..370 (w=360) -> center is around x=30..350
    // c1: 440..800 (w=360) -> center is around x=450..770
    // c2: 880..1240 (w=360)
    crop(m, 10, r1_y, 360, r1_h),
    crop(m, 440, r1_y, 360, r1_h),
    crop(m, 880, r1_y, 360, r1_h)
];

const testDir = path.join(__dirname, '..', 'art', 'review', 'test_crops');
fs.mkdirSync(testDir, { recursive: true });
m_cells.forEach((c, i) => {
    writePNG(path.join(testDir, `m_${i}.png`), i < 4 ? 300 : 360, 405, c);
});
console.log('Saved test crops to art/review/test_crops/');
