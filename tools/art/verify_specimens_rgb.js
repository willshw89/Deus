const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function decodePNG(buf) {
    let pos = 8;
    let w, h, idat = [];
    while (pos < buf.length) {
        const len = buf.readUInt32BE(pos);
        const type = buf.toString('ascii', pos + 4, pos + 8);
        if (type === 'IHDR') {
            w = buf.readUInt32BE(pos + 8);
            h = buf.readUInt32BE(pos + 12);
        } else if (type === 'IDAT') {
            idat.push(buf.subarray(pos + 8, pos + 8 + len));
        }
        pos += 12 + len;
    }
    const uncompressed = zlib.inflateSync(Buffer.concat(idat));
    const stride = w * 4 + 1;
    const data = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
        const filter = uncompressed[y * stride];
        const src = y * stride + 1;
        const dst = y * w * 4;
        for (let x = 0; x < w * 4; x++) {
            let val = uncompressed[src + x];
            let a = x >= 4 ? data[dst + x - 4] : 0;
            let b = y > 0 ? data[(y - 1) * w * 4 + x] : 0;
            let c = (x >= 4 && y > 0) ? data[(y - 1) * w * 4 + x - 4] : 0;
            if (filter === 1) val = (val + a) & 0xFF;
            else if (filter === 2) val = (val + b) & 0xFF;
            else if (filter === 3) val = (val + Math.floor((a + b) / 2)) & 0xFF;
            else if (filter === 4) {
                const p = a + b - c;
                const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
                const pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
                val = (val + pr) & 0xFF;
            }
            data[dst + x] = val;
        }
    }
    return { width: w, height: h, data };
}

const BACKUP_DIR = 'C:\\Users\\snewt\\DEUS_backups\\pixellab_2026-09-30\\tiles_pro';

// Load induct_all_ground_tiles.js and extract SPECIMENS
const code = fs.readFileSync(path.join(__dirname, 'induct_all_ground_tiles.js'), 'utf8');
const match = code.match(/const SPECIMENS = (\{[\s\S]*?\n\};)/);
if (!match) {
    console.error('Could not find SPECIMENS');
    process.exit(1);
}

// Evaluate SPECIMENS safely
const ROOT = path.resolve(__dirname, '../..');
const SPECIMENS = eval('(' + match[1].replace(/;\s*$/, '') + ')');

let missingCount = 0;
for (const [k, v] of Object.entries(SPECIMENS)) {
    let imgPath;
    if (v.sourceType === 'owner_master') {
        imgPath = v.sourcePath;
    } else {
        const pad = v.fillTile < 10 ? '0' + v.fillTile : '' + v.fillTile;
        imgPath = path.join(BACKUP_DIR, `${v.pixellabId}__${pad}.png`);
    }

    if (!fs.existsSync(imgPath)) {
        console.error(`[FAIL - MISSING] ${k.padEnd(20)}: ${imgPath}`);
        missingCount++;
        continue;
    }

    const { data } = decodePNG(fs.readFileSync(imgPath));
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
    }
    const n = data.length / 4;
    const avg = [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
    console.log(`[OK] ${k.padEnd(20)} fillTile=${v.fillTile !== undefined ? v.fillTile : 'N/A'} avg=[${avg.join(', ')}]`);
}

if (missingCount > 0) {
    console.error(`Verification FAILED: ${missingCount} specimens missing`);
    process.exit(1);
} else {
    console.log(`All ${Object.keys(SPECIMENS).length} specimens verified successfully.`);
}

