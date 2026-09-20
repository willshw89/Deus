const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');
const paletteLines = fs.readFileSync(PALETTE_FILE, 'utf8').trim().split(/\r?\n/);
const PALETTE = paletteLines.map(line => {
    const hex = line.trim().replace('#', '');
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
});

function srgbToLab(r, g, b) {
    const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const R = lin(r), G = lin(g), B = lin(b);
    const X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
    const Y = (R * 0.2126729 + G * 0.7151522 + B * 0.0721750);
    const Z = (R * 0.0193339 + G * 0.1191920 + B * 0.9503041) / 1.08883;
    const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (t * 24389 / 27 + 16) / 116);
    return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
const palLab = PALETTE.map(c => srgbToLab(...c));

function snap(r, g, b) {
    const l = srgbToLab(r, g, b);
    let best = PALETTE[0], bd = Infinity;
    for (let i = 0; i < PALETTE.length; i++) {
        const d = Math.hypot(l[0] - palLab[i][0], l[1] - palLab[i][1], l[2] - palLab[i][2]);
        if (d < bd) { bd = d; best = PALETTE[i]; }
    }
    return best;
}

function quantizeBuffer(buf, maxColors) {
    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 0) continue;
        const s = snap(buf[i], buf[i + 1], buf[i + 2]);
        buf[i] = s[0]; buf[i + 1] = s[1]; buf[i + 2] = s[2]; buf[i + 3] = 255;
    }
    const counts = new Map();
    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] === 0) continue;
        const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
        counts.set(k, (counts.get(k) || 0) + 1);
    }
    while (counts.size > maxColors) {
        let minCount = Infinity, minKey = null;
        for (const [k, c] of counts.entries()) {
            if (c < minCount) { minCount = c; minKey = k; }
        }
        const r1 = (minKey >> 16) & 255, g1 = (minKey >> 8) & 255, b1 = minKey & 255;
        const lab1 = srgbToLab(r1, g1, b1);
        let bestDist = Infinity, bestKey = null;
        for (const [k, _] of counts.entries()) {
            if (k === minKey) continue;
            const r2 = (k >> 16) & 255, g2 = (k >> 8) & 255, b2 = k & 255;
            const d = Math.hypot(lab1[0] - srgbToLab(r2, g2, b2)[0], lab1[1] - srgbToLab(r2, g2, b2)[1], lab1[2] - srgbToLab(r2, g2, b2)[2]);
            if (d < bestDist) { bestDist = d; bestKey = k; }
        }
        counts.set(bestKey, counts.get(bestKey) + counts.get(minKey));
        counts.delete(minKey);
        const nr = (bestKey >> 16) & 255, ng = (bestKey >> 8) & 255, nb = bestKey & 255;
        for (let i = 0; i < buf.length; i += 4) {
            const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
            if (k === minKey) { buf[i] = nr; buf[i + 1] = ng; buf[i + 2] = nb; }
        }
    }
}

function loadJpg(jpgPath) {
    const tmpPng = path.join(os.tmpdir(), `tmp_menu_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${jpgPath.replace(/'/g, "''")}'); $img.Save('${tmpPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    const buf = fs.readFileSync(tmpPng);
    try { fs.unlinkSync(tmpPng); } catch(e) {}
    return decodePNG(buf, path.basename(jpgPath));
}

function resizeImage(src, tw, th) {
    const out = Buffer.alloc(tw * th * 4);
    for (let y = 0; y < th; y++) {
        const sy0 = Math.floor(y * src.height / th);
        const sy1 = Math.floor((y + 1) * src.height / th);
        for (let x = 0; x < tw; x++) {
            const sx0 = Math.floor(x * src.width / tw);
            const sx1 = Math.floor((x + 1) * src.width / tw);
            let sr = 0, sg = 0, sb = 0, count = 0;
            for (let py = sy0; py < sy1 && py < src.height; py++) {
                for (let px = sx0; px < sx1 && px < src.width; px++) {
                    const idx = (py * src.width + px) * 4;
                    sr += src.data[idx]; sg += src.data[idx + 1]; sb += src.data[idx + 2]; count++;
                }
            }
            const sn = snap(Math.round(sr / count), Math.round(sg / count), Math.round(sb / count));
            const o = (y * tw + x) * 4;
            out[o] = sn[0]; out[o + 1] = sn[1]; out[o + 2] = sn[2]; out[o + 3] = 255;
        }
    }
    return out;
}

// 1. Process Wildlife Menu Backdrop (816x624 px)
console.log('Processing UF_Menu_wildlife.png...');
const wildRaw = loadJpg('C:/Users/snewt/.gemini/antigravity/brain/f9b9af6f-1902-44c2-8bc1-fe9d0fdadb45/menu_theme_wildlife_1789865486183.jpg');
const wildBuf = resizeImage(wildRaw, 816, 624);
quantizeBuffer(wildBuf, 32);
writePNG(path.join(ROOT, 'game', 'img', 'pictures', 'UF_Menu_wildlife.png'), 816, 624, wildBuf);
writePNG(path.join(ROOT, 'art', 'masters', 'UF_Menu_wildlife.png'), 816, 624, wildBuf);
fs.writeFileSync(path.join(ROOT, 'art', 'masters', 'UF_Menu_wildlife.json'), JSON.stringify({
    name: "UF_Menu_wildlife",
    theme: "wildlife",
    frameWidth: 816,
    frameHeight: 624,
    layer: "menu_picture"
}, null, 2) + '\n', 'utf8');

// 2. Process Cavern Menu Backdrop (816x624 px)
console.log('Processing UF_Menu_cavern.png...');
const cavRaw = loadJpg('C:/Users/snewt/.gemini/antigravity/brain/f9b9af6f-1902-44c2-8bc1-fe9d0fdadb45/menu_theme_cavern_1789865621043.jpg');
const cavBuf = resizeImage(cavRaw, 816, 624);
quantizeBuffer(cavBuf, 32);
writePNG(path.join(ROOT, 'game', 'img', 'pictures', 'UF_Menu_cavern.png'), 816, 624, cavBuf);
writePNG(path.join(ROOT, 'art', 'masters', 'UF_Menu_cavern.png'), 816, 624, cavBuf);
fs.writeFileSync(path.join(ROOT, 'art', 'masters', 'UF_Menu_cavern.json'), JSON.stringify({
    name: "UF_Menu_cavern",
    theme: "cavern",
    frameWidth: 816,
    frameHeight: 624,
    layer: "menu_picture"
}, null, 2) + '\n', 'utf8');

// 3. Process Window_wildlife.png (192x192 px)
console.log('Processing Window_wildlife.png...');
const winWildRaw = loadJpg('C:/Users/snewt/.gemini/antigravity/brain/f9b9af6f-1902-44c2-8bc1-fe9d0fdadb45/window_skin_wildlife_1789865501355.jpg');
const winWildBuf = resizeImage(winWildRaw, 192, 192);

// Make transparent areas in top-right windowframe interior
for (let y = 16; y < 80; y++) {
    for (let x = 112; x < 176; x++) {
        const idx = (y * 192 + x) * 4;
        winWildBuf[idx + 3] = 0;
    }
}
quantizeBuffer(winWildBuf, 32);
writePNG(path.join(ROOT, 'game', 'img', 'system', 'Window_wildlife.png'), 192, 192, winWildBuf);
writePNG(path.join(ROOT, 'art', 'masters', 'Window_wildlife.png'), 192, 192, winWildBuf);
fs.writeFileSync(path.join(ROOT, 'art', 'masters', 'Window_wildlife.json'), JSON.stringify({
    name: "Window_wildlife",
    theme: "wildlife",
    frameWidth: 192,
    frameHeight: 192,
    layer: "window_skin"
}, null, 2) + '\n', 'utf8');

// 4. Process Window_cavern.png (192x192 px)
console.log('Processing Window_cavern.png...');
// Create matching crystalline cavern window skin from cavern palette
const winCavBuf = Buffer.alloc(192 * 192 * 4);
// Use Window_kobold / Window_undead as base layout template, retinted with cavern sapphire/slate tones
const koboldWin = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'masters', 'Window_kobold.png')), 'Window_kobold.png');
for (let i = 0; i < winCavBuf.length; i += 4) {
    const a = koboldWin.data[i + 3];
    if (a === 0) {
        winCavBuf[i + 3] = 0;
    } else {
        const r = koboldWin.data[i];
        const g = koboldWin.data[i + 1];
        const b = koboldWin.data[i + 2];
        // Shift warm earth to cool cavern slate & cyan crystal
        const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        let cr, cg, cb;
        if (lum < 60) {
            cr = 16; cg = 24; cb = 36; // deep cavern slate
        } else if (lum < 140) {
            cr = 32; cg = 55; cb = 75; // stalactite grey-blue
        } else if (lum < 200) {
            cr = 40; cg = 120; cb = 160; // cyan glow-cap mineral
        } else {
            cr = 100; cg = 220; cb = 240; // luminous crystal highlight
        }
        const sn = snap(cr, cg, cb);
        winCavBuf[i] = sn[0];
        winCavBuf[i + 1] = sn[1];
        winCavBuf[i + 2] = sn[2];
        winCavBuf[i + 3] = 255;
    }
}
quantizeBuffer(winCavBuf, 32);
writePNG(path.join(ROOT, 'game', 'img', 'system', 'Window_cavern.png'), 192, 192, winCavBuf);
writePNG(path.join(ROOT, 'art', 'masters', 'Window_cavern.png'), 192, 192, winCavBuf);
fs.writeFileSync(path.join(ROOT, 'art', 'masters', 'Window_cavern.json'), JSON.stringify({
    name: "Window_cavern",
    theme: "cavern",
    frameWidth: 192,
    frameHeight: 192,
    layer: "window_skin"
}, null, 2) + '\n', 'utf8');

console.log('\nSUCCESS: Saved all Wildlife & Cavern menu backdrops and window skins!');
