const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const dir = 'C:/Users/snewt/.gemini/antigravity/brain/f9b9af6f-1902-44c2-8bc1-fe9d0fdadb45';
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
    const tmpPng = path.join(os.tmpdir(), `tmp_face_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${jpgPath.replace(/'/g, "''")}'); $img.Save('${tmpPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    const buf = fs.readFileSync(tmpPng);
    try { fs.unlinkSync(tmpPng); } catch(e) {}
    return decodePNG(buf, path.basename(jpgPath));
}

function cropAndResize(src, sx, sy, sw, sh, tw, th) {
    const out = Buffer.alloc(tw * th * 4);
    for (let y = 0; y < th; y++) {
        const y0 = Math.floor(sy + y * sh / th);
        const y1 = Math.floor(sy + (y + 1) * sh / th);
        for (let x = 0; x < tw; x++) {
            const x0 = Math.floor(sx + x * sw / tw);
            const x1 = Math.floor(sx + (x + 1) * sw / tw);
            let sr = 0, sg = 0, sb = 0, count = 0;
            for (let py = y0; py < y1 && py < src.height; py++) {
                for (let px = x0; px < x1 && px < src.width; px++) {
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

const FACTIONS = [
    'human', 'elf', 'dwarf', 'gnome', 'goblin',
    'orc', 'lizardfolk', 'kobold', 'undead', 'starborn', 'swarm'
];

const allFiles = fs.readdirSync(dir);

// Grand composite showcase of all 132 faces:
// 12 columns x 11 rows of 144x144 px = 1728 x 1584 px
const grandW = 12 * 144; // 1728
const grandH = 11 * 144; // 1584
const grandBuf = Buffer.alloc(grandW * grandH * 4);

for (let facIdx = 0; facIdx < FACTIONS.length; facIdx++) {
    const fac = FACTIONS[facIdx];
    console.log(`\n========================================`);
    console.log(`[${facIdx + 1}/11] Processing faction: ${fac}`);
    console.log(`========================================`);

    const mFile = allFiles.find(f => f.startsWith(`faces_${fac}_males`) && f.endsWith('.jpg'));
    const fFile = allFiles.find(f => f.startsWith(`faces_${fac}_females`) && f.endsWith('.jpg'));

    const mImg = loadJpg(path.join(dir, mFile));
    const fImg = loadJpg(path.join(dir, fFile));

    let males = [];
    let females = [];

    if (fac === 'human') {
        males = [
            cropAndResize(mImg, 10, 10, 300, 405, 144, 144),   // 0: Recruit
            cropAndResize(mImg, 325, 10, 300, 405, 144, 144),  // 1: Veteran Eyepatch
            cropAndResize(mImg, 640, 10, 300, 405, 144, 144),  // 2: Elder White Beard
            cropAndResize(mImg, 955, 10, 300, 405, 144, 144),  // 3: Hooded Ranger
            cropAndResize(mImg, 465, 430, 330, 405, 144, 144), // 4: Scribe with Glasses
            cropAndResize(mImg, 900, 430, 330, 405, 144, 144)  // 5: Burly Blacksmith
        ];
        females = [
            cropAndResize(fImg, 10, 10, 300, 405, 144, 144),   // 0: Archer Scout
            cropAndResize(fImg, 325, 10, 300, 405, 144, 144),  // 1: Shieldmaiden
            cropAndResize(fImg, 640, 10, 300, 405, 144, 144),  // 2: Matriarch
            cropAndResize(fImg, 955, 10, 300, 405, 144, 144),  // 3: Cheerful Tavern Girl
            cropAndResize(fImg, 35, 430, 330, 405, 144, 144),  // 4: Herbalist
            cropAndResize(fImg, 465, 430, 330, 405, 144, 144)  // 5: Noble Lady
        ];
    } else {
        const gridX = [12, 432, 852];
        const gridY = [12, 436];
        const cw = 400, ch = 400;

        for (let r = 0; r < 2; r++) {
            for (let c = 0; c < 3; c++) {
                males.push(cropAndResize(mImg, gridX[c], gridY[r], cw, ch, 144, 144));
                females.push(cropAndResize(fImg, gridX[c], gridY[r], cw, ch, 144, 144));
            }
        }
    }

    // 1. Build 12-Face Review Showcase (864 x 288 px, 6 males top, 6 females bottom)
    const showW = 864, showH = 288;
    const showBuf = Buffer.alloc(showW * showH * 4);
    for (let i = 0; i < 6; i++) {
        // Top: Male
        const m = males[i];
        for (let cy = 0; cy < 144; cy++) {
            for (let cx = 0; cx < 144; cx++) {
                const si = (cy * 144 + cx) * 4;
                const di = (cy * showW + (i * 144 + cx)) * 4;
                showBuf[di] = m[si]; showBuf[di+1] = m[si+1]; showBuf[di+2] = m[si+2]; showBuf[di+3] = 255;
            }
        }
        // Bottom: Female
        const f = females[i];
        for (let cy = 0; cy < 144; cy++) {
            for (let cx = 0; cx < 144; cx++) {
                const si = (cy * 144 + cx) * 4;
                const di = ((144 + cy) * showW + (i * 144 + cx)) * 4;
                showBuf[di] = f[si]; showBuf[di+1] = f[si+1]; showBuf[di+2] = f[si+2]; showBuf[di+3] = 255;
            }
        }
    }
    quantizeBuffer(showBuf, 32);
    const reviewPath = path.join(ROOT, 'art', 'review', `faces_12_${fac}.png`);
    writePNG(reviewPath, showW, showH, showBuf);
    console.log(`Saved 12-face review showcase: ${reviewPath}`);

    // Blit to Grand Composite Showcase (Row facIdx: 6 males on left, 6 females on right)
    for (let i = 0; i < 6; i++) {
        const m = males[i];
        for (let cy = 0; cy < 144; cy++) {
            for (let cx = 0; cx < 144; cx++) {
                const si = (cy * 144 + cx) * 4;
                const di = (((facIdx * 144) + cy) * grandW + (i * 144 + cx)) * 4;
                grandBuf[di] = m[si]; grandBuf[di+1] = m[si+1]; grandBuf[di+2] = m[si+2]; grandBuf[di+3] = 255;
            }
        }
        const f = females[i];
        for (let cy = 0; cy < 144; cy++) {
            for (let cx = 0; cx < 144; cx++) {
                const si = (cy * 144 + cx) * 4;
                const di = (((facIdx * 144) + cy) * grandW + ((6 + i) * 144 + cx)) * 4;
                grandBuf[di] = f[si]; grandBuf[di+1] = f[si+1]; grandBuf[di+2] = f[si+2]; grandBuf[di+3] = 255;
            }
        }
    }

    // 2. Build Sheet 1 (UF_Faces_<fac>_1.png): 4 Males (top), 4 Females (bottom)
    const s1Cells = [males[0], males[1], males[2], males[3], females[0], females[1], females[2], females[3]];
    const sheet1Buf = Buffer.alloc(576 * 288 * 4);
    for (let i = 0; i < 8; i++) {
        const col = i % 4, row = Math.floor(i / 4);
        const cell = s1Cells[i];
        for (let cy = 0; cy < 144; cy++) {
            for (let cx = 0; cx < 144; cx++) {
                const si = (cy * 144 + cx) * 4;
                const di = (((row * 144) + cy) * 576 + ((col * 144) + cx)) * 4;
                sheet1Buf[di] = cell[si]; sheet1Buf[di+1] = cell[si+1]; sheet1Buf[di+2] = cell[si+2]; sheet1Buf[di+3] = 255;
            }
        }
    }
    quantizeBuffer(sheet1Buf, 32);

    const rmmz1 = path.join(ROOT, 'game', 'img', 'faces', `UF_Faces_${fac}_1.png`);
    const master1 = path.join(ROOT, 'art', 'masters', `face_${fac}_1.png`);
    writePNG(rmmz1, 576, 288, sheet1Buf);
    writePNG(master1, 576, 288, sheet1Buf);

    const sidecar1 = {
        name: `face_${fac}_1`,
        culture: fac,
        species: fac === 'human' ? 'human' : fac,
        layer: 'face',
        stage: 'adult_and_elder',
        frameWidth: 144,
        frameHeight: 144,
        anchor: [72, 144],
        facings: ["S", "N"],
        animations: {
            neutral: [0, 1, 2, 3]
        }
    };
    fs.writeFileSync(path.join(ROOT, 'art', 'masters', `face_${fac}_1.json`), JSON.stringify(sidecar1, null, 2) + '\n', 'utf8');

    // 3. Build Sheet 2 (UF_Faces_<fac>_2.png): Males 4, 5, 2(elder), 1(champion); Females 4, 5, 2(matriarch), 1(champion)
    const s2Cells = [males[4], males[5], males[2], males[1], females[4], females[5], females[2], females[1]];
    const sheet2Buf = Buffer.alloc(576 * 288 * 4);
    for (let i = 0; i < 8; i++) {
        const col = i % 4, row = Math.floor(i / 4);
        const cell = s2Cells[i];
        for (let cy = 0; cy < 144; cy++) {
            for (let cx = 0; cx < 144; cx++) {
                const si = (cy * 144 + cx) * 4;
                const di = (((row * 144) + cy) * 576 + ((col * 144) + cx)) * 4;
                sheet2Buf[di] = cell[si]; sheet2Buf[di+1] = cell[si+1]; sheet2Buf[di+2] = cell[si+2]; sheet2Buf[di+3] = 255;
            }
        }
    }
    quantizeBuffer(sheet2Buf, 32);

    const rmmz2 = path.join(ROOT, 'game', 'img', 'faces', `UF_Faces_${fac}_2.png`);
    const master2 = path.join(ROOT, 'art', 'masters', `face_${fac}_2.png`);
    writePNG(rmmz2, 576, 288, sheet2Buf);
    writePNG(master2, 576, 288, sheet2Buf);

    const sidecar2 = {
        name: `face_${fac}_2`,
        culture: fac,
        species: fac === 'human' ? 'human' : fac,
        layer: 'face',
        stage: 'adult_and_elder',
        frameWidth: 144,
        frameHeight: 144,
        anchor: [72, 144],
        facings: ["S", "N"],
        animations: {
            neutral: [0, 1, 2, 3]
        }
    };
    fs.writeFileSync(path.join(ROOT, 'art', 'masters', `face_${fac}_2.json`), JSON.stringify(sidecar2, null, 2) + '\n', 'utf8');

    console.log(`Saved Sheet 1 & 2 for ${fac}`);
}

// Save Grand Composite Showcase
quantizeBuffer(grandBuf, 32);
const grandPath = path.join(ROOT, 'art', 'review', 'all_factions_132_faces_showcase.png');
writePNG(grandPath, grandW, grandH, grandBuf);
console.log(`\n========================================`);
console.log(`SUCCESS: Saved Grand Composite Showcase: ${grandPath}`);
console.log(`Dimensions: ${grandW}x${grandH} px (132 unique faces across 11 factions)`);
console.log(`========================================`);
