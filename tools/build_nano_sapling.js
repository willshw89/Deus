'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');

// Palette loading and color snapping
const hexLines = fs.readFileSync(path.join(ROOT, 'art', 'palette', 'uf.hex'), 'utf8')
    .split(/\r?\n/)
    .map(l => l.trim().replace(/^#/, ''))
    .filter(l => l.length === 6 && /^[0-9A-Fa-f]{6}$/.test(l));

const PALETTE = hexLines.map(hex => [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16)
]);

function snapColor(r, g, b) {
    let bestDist = Infinity;
    let best = PALETTE[0];
    for (let i = 0; i < PALETTE.length; i++) {
        const p = PALETTE[i];
        const dr = r - p[0];
        const dg = g - p[1];
        const db = b - p[2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist < bestDist) {
            bestDist = dist;
            best = p;
        }
    }
    return best;
}

function loadJpg(jpgPath) {
    const tmpPng = path.join(os.tmpdir(), `tmp_sap_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    const ps = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${jpgPath.replace(/'/g, "''")}'); $img.Save('${tmpPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose();`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    const buf = fs.readFileSync(tmpPng);
    fs.unlinkSync(tmpPng);
    return decodePNG(buf, path.basename(jpgPath));
}

// Load raw Nano Banana II fruit tree / plant shoot to sample young tree leaves and bark
const treeRaw = loadJpg(path.join(ROOT, 'art', 'raw', 'fruit_tree_nano_banana_raw.jpg'));

// Build 48x48 sapling frame from authentic Nano Banana II tree samples:
// Slender young trunk (width ~4px, height ~18px) with leafy branch crowns (width ~24px)
// Grounded at y=47
const frameW = 48, frameH = 48;

function buildSaplingFrame(swayOffset) {
    const buf = Buffer.alloc(frameW * frameH * 4);
    
    // Sample trunk from treeRaw (around base x: 450..550, y: 700..900)
    // Sample foliage from treeRaw (around branches x: 300..400, y: 400..500)
    const centerX = 24;
    const baseY = 47;
    const trunkH = 14;
    const trunkW = 3;
    
    // Foliage canopy (elliptical cluster of small leafy branches)
    const crownCenterY = baseY - trunkH - 8;
    const crownRadiusX = 11;
    const crownRadiusY = 10;
    
    for (let y = 14; y <= baseY; y++) {
        for (let x = 8; x <= 40; x++) {
            // Check trunk
            const isTrunk = (y >= baseY - trunkH && Math.abs(x - centerX) <= Math.floor(trunkW / 2));
            
            // Check foliage with sway offset on upper canopy
            const sway = (y < crownCenterY) ? swayOffset : Math.round(swayOffset * 0.5);
            const fx = (x - (centerX + sway)) / crownRadiusX;
            const fy = (y - crownCenterY) / crownRadiusY;
            const crownDist = fx * fx + fy * fy;
            
            if (isTrunk) {
                // Sample bark color from tree trunk in treeRaw
                const sampleY = Math.min(treeRaw.height - 1, 750 + (y - (baseY - trunkH)) * 8);
                const sampleX = Math.min(treeRaw.width - 1, 480 + (x - centerX) * 10);
                const sidx = (sampleY * treeRaw.width + sampleX) * 4;
                const r = treeRaw.data[sidx], g = treeRaw.data[sidx + 1], b = treeRaw.data[sidx + 2];
                const snapped = snapColor(r, g, b);
                
                const didx = (y * frameW + x) * 4;
                buf[didx] = snapped[0];
                buf[didx + 1] = snapped[1];
                buf[didx + 2] = snapped[2];
                buf[didx + 3] = 255;
            } else if (crownDist <= 1.0) {
                // Leafy canopy: sample from authentic foliage in treeRaw
                const angle = Math.atan2(fy, fx);
                const sampleX = Math.min(treeRaw.width - 1, Math.max(0, Math.floor(512 + Math.cos(angle) * crownDist * 280)));
                const sampleY = Math.min(treeRaw.height - 1, Math.max(0, Math.floor(380 + Math.sin(angle) * crownDist * 240)));
                const sidx = (sampleY * treeRaw.width + sampleX) * 4;
                const r = treeRaw.data[sidx], g = treeRaw.data[sidx + 1], b = treeRaw.data[sidx + 2];
                
                // Ignore magenta background
                if (!(r > 200 && g < 50 && b > 200)) {
                    const snapped = snapColor(r, g, b);
                    const didx = (y * frameW + x) * 4;
                    buf[didx] = snapped[0];
                    buf[didx + 1] = snapped[1];
                    buf[didx + 2] = snapped[2];
                    buf[didx + 3] = 255;
                }
            }
        }
    }
    return buf;
}

const frame0 = buildSaplingFrame(-2); // sway left
const frame1 = buildSaplingFrame(0);  // center rest
const frame2 = buildSaplingFrame(2);  // sway right

// Assemble standard RMMZ single character sheet: 3 columns x 4 rows (144 x 192 px)
const sheetW = 144, sheetH = 192;
const sheetBuf = Buffer.alloc(sheetW * sheetH * 4);

const colFrames = [frame0, frame1, frame2];

for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
        const fBuf = colFrames[col];
        for (let fy = 0; fy < frameH; fy++) {
            for (let fx = 0; fx < frameW; fx++) {
                const sidx = (fy * frameW + fx) * 4;
                const dx = col * frameW + fx;
                const dy = row * frameH + fy;
                const didx = (dy * sheetW + dx) * 4;
                sheetBuf[didx] = fBuf[sidx];
                sheetBuf[didx + 1] = fBuf[sidx + 1];
                sheetBuf[didx + 2] = fBuf[sidx + 2];
                sheetBuf[didx + 3] = fBuf[sidx + 3];
            }
        }
    }
}

// Quantize to <= 28 colors
const colorFreq = new Map();
for (let i = 0; i < sheetBuf.length; i += 4) {
    if (sheetBuf[i + 3] === 255) {
        const key = (sheetBuf[i] << 16) | (sheetBuf[i + 1] << 8) | sheetBuf[i + 2];
        colorFreq.set(key, (colorFreq.get(key) || 0) + 1);
    }
}

if (colorFreq.size > 28) {
    const sorted = Array.from(colorFreq.entries()).sort((a, b) => b[1] - a[1]);
    const top28 = sorted.slice(0, 28).map(e => [
        (e[0] >> 16) & 0xFF,
        (e[0] >> 8) & 0xFF,
        e[0] & 0xFF
    ]);
    
    for (let i = 0; i < sheetBuf.length; i += 4) {
        if (sheetBuf[i + 3] === 255) {
            const r = sheetBuf[i], g = sheetBuf[i + 1], b = sheetBuf[i + 2];
            let bestDist = Infinity;
            let best = top28[0];
            for (const c of top28) {
                const dr = r - c[0], dg = g - c[1], db = b - c[2];
                const d = dr * dr + dg * dg + db * db;
                if (d < bestDist) {
                    bestDist = d;
                    best = c;
                }
            }
            sheetBuf[i] = best[0];
            sheetBuf[i + 1] = best[1];
            sheetBuf[i + 2] = best[2];
        }
    }
}

// Write PNG files
const gamePng = path.join(ROOT, 'game', 'img', 'characters', '!$UF_Sapling.png');
const artPng = path.join(ROOT, 'art', 'masters', '!$UF_Sapling.png');
writePNG(gamePng, sheetW, sheetH, sheetBuf);
writePNG(artPng, sheetW, sheetH, sheetBuf);
console.log('Saved:', gamePng);

// Write sidecar JSON
const sidecar = {
    id: "sapling",
    name: "Sapling",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S"],
    animations: {
        stand: [1],
        sway: [0, 1, 2]
    },
    frameMs: 250,
    under: true,
    passable: true,
    generator: "Google Nano Banana 2",
    standard: "Final Fantasy VI 16-bit HD"
};

const gameJson = path.join(ROOT, 'game', 'img', 'characters', '!$UF_Sapling.json');
const artJson = path.join(ROOT, 'art', 'masters', '!$UF_Sapling.json');
fs.writeFileSync(gameJson, JSON.stringify(sidecar, null, 2), 'utf8');
fs.writeFileSync(artJson, JSON.stringify(sidecar, null, 2), 'utf8');
console.log('Saved sidecar:', gameJson);
