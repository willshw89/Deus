'use strict';
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');

// Load project palette
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

const raw = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', 'pro_sheep_walk.png')), 'sheep');

function isPurpleOrMagenta(r, g, b) {
    if (r > 60 && b > 60 && (r + b) > (g * 2 + 20)) return true;
    if (r > 120 && b > 120 && g < 110) return true;
    if (r > 170 && b > 170) return true;
    return false;
}

function extractSprite(x0, y0, x1, y1) {
    let minX = 9999, maxX = -1, minY = 9999, maxY = -1;
    for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
            const idx = (y * raw.width + x) * 4;
            const r = raw.data[idx], g = raw.data[idx+1], b = raw.data[idx+2];
            if (!isPurpleOrMagenta(r, g, b)) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    if (minX > maxX) return null;

    const sw = maxX - minX + 1;
    const sh = maxY - minY + 1;
    const spriteBuf = Buffer.alloc(sw * sh * 4);
    for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
            const sx = minX + x;
            const sy = minY + y;
            const sidx = (sy * raw.width + sx) * 4;
            const r = raw.data[sidx], g = raw.data[sidx + 1], b = raw.data[sidx + 2];
            if (!isPurpleOrMagenta(r, g, b)) {
                const didx = (y * sw + x) * 4;
                spriteBuf[didx] = r;
                spriteBuf[didx + 1] = g;
                spriteBuf[didx + 2] = b;
                spriteBuf[didx + 3] = 255;
            }
        }
    }

    return {
        x0: minX,
        y0: minY,
        x1: maxX,
        y1: maxY,
        w: sw,
        h: sh,
        buf: spriteBuf
    };
}

// South:
const southStepLBox = extractSprite(35, 20, 200, 260);
const southStandBox = extractSprite(265, 20, 440, 260);
const southStepRBox = extractSprite(500, 20, 675, 260);

// West:
const westStepLBox  = extractSprite(5, 275, 235, 510);
const westStandBox  = extractSprite(240, 275, 470, 510);
const westStepRBox  = extractSprite(475, 275, 705, 510);

// East:
const eastStepLBox  = extractSprite(710, 275, 940, 510);
const eastStandBox  = extractSprite(945, 275, 1175, 510);
const eastStepRBox  = extractSprite(1180, 275, 1405, 510);

// North:
const northStepLBox = extractSprite(20, 520, 200, 765);
const northStandBox = extractSprite(260, 520, 440, 765);
const northStepRBox = extractSprite(725, 520, 905, 765);

console.log('South stand:', southStandBox.w, 'x', southStandBox.h);
console.log('West stand:', westStandBox.w, 'x', westStandBox.h);
console.log('North stand:', northStandBox.w, 'x', northStandBox.h);

// Invariant uniform scale factor for wild mountain sheep:
// Sheep body is ~36 px long, ~30 px tall in 48x48 cell, grounded at y = 47.
// westStandBox is 216 px wide -> scale factor ~36 / 216 = 0.1667
const targetScale = 36.0 / Math.max(westStandBox.w, 210);
console.log('Target scale factor:', targetScale.toFixed(4));

function renderCell(box, mirrorX = false, xOffset = 0, yOffset = 0) {
    const cell = Buffer.alloc(48 * 48 * 4);
    if (!box) return cell;

    const scaledW = Math.round(box.w * targetScale);
    const scaledH = Math.round(box.h * targetScale);
    const startX = Math.round(24 - scaledW / 2) + xOffset;
    const startY = 47 - (scaledH - 1) + yOffset;

    for (let dy = 0; dy < scaledH; dy++) {
        const sy = Math.min(box.h - 1, Math.floor(dy / targetScale));
        const outY = startY + dy;
        if (outY < 0 || outY >= 48) continue;

        for (let dx = 0; dx < scaledW; dx++) {
            const sampleDx = mirrorX ? (scaledW - 1 - dx) : dx;
            const sx = Math.min(box.w - 1, Math.floor(sampleDx / targetScale));
            const outX = startX + dx;
            if (outX < 0 || outX >= 48) continue;

            const sidx = (sy * box.w + sx) * 4;
            if (box.buf[sidx + 3] === 255) {
                const r = box.buf[sidx];
                const g = box.buf[sidx + 1];
                const b = box.buf[sidx + 2];

                if (isPurpleOrMagenta(r, g, b)) continue;

                const snapped = snapColor(r, g, b);
                const didx = (outY * 48 + outX) * 4;
                cell[didx] = snapped[0];
                cell[didx + 1] = snapped[1];
                cell[didx + 2] = snapped[2];
                cell[didx + 3] = 255;
            }
        }
    }
    return cell;
}

// 12-sprite matrix (3 columns x 4 rows)
// Row 0: South (stepL, stand, stepR)
// Row 1: West  (stepL, stand, stepR)
// Row 2: East  (stepL, stand, stepR)
// Row 3: North (stepL, stand, stepR)
const southL = renderCell(southStepLBox, false, 0, 0);
const southC = renderCell(southStandBox, false, 0, 0);
const southR = renderCell(southStepRBox, false, 0, 0);

const westL = renderCell(westStepLBox, false, 0, 0);
const westC = renderCell(westStandBox, false, 0, 0);
const westR = renderCell(westStepRBox, false, 0, 0);

const eastL = renderCell(eastStepLBox, false, 0, 0);
const eastC = renderCell(eastStandBox, false, 0, 0);
const eastR = renderCell(eastStepRBox, false, 0, 0);

const northL = renderCell(northStepLBox, false, 0, 0);
const northC = renderCell(northStandBox, false, 0, 0);
const northR = renderCell(northStepRBox, false, 0, 0);

const grid = [
    [southL, southC, southR],
    [westL,  westC,  westR],
    [eastL,  eastC,  eastR],
    [northL, northC, northR]
];

const sheetW = 144, sheetH = 192;
const sheetBuf = Buffer.alloc(sheetW * sheetH * 4);

for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
        const cell = grid[r][c];
        const ox = c * 48;
        const oy = r * 48;
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sidx = (y * 48 + x) * 4;
                const didx = ((oy + y) * sheetW + (ox + x)) * 4;
                sheetBuf[didx] = cell[sidx];
                sheetBuf[didx + 1] = cell[sidx + 1];
                sheetBuf[didx + 2] = cell[sidx + 2];
                sheetBuf[didx + 3] = cell[sidx + 3];
            }
        }
    }
}

// Clean stray disconnected isolated specks (< 6 connected pixels)
const visited = new Uint8Array(sheetW * sheetH);
for (let y = 0; y < sheetH; y++) {
    for (let x = 0; x < sheetW; x++) {
        const idx = y * sheetW + x;
        if (visited[idx] || sheetBuf[idx * 4 + 3] === 0) continue;
        const component = [];
        const q = [x, y];
        visited[idx] = 1;
        let qh = 0;
        while (qh < q.length) {
            const cx = q[qh++];
            const cy = q[qh++];
            component.push([cx, cy]);
            const nbs = [[cx+1, cy], [cx-1, cy], [cx, cy+1], [cx, cy-1], [cx+1, cy+1], [cx-1, cy-1], [cx+1, cy-1], [cx-1, cy+1]];
            for (const [nx, ny] of nbs) {
                if (nx >= 0 && nx < sheetW && ny >= 0 && ny < sheetH) {
                    const nidx = ny * sheetW + nx;
                    if (!visited[nidx] && sheetBuf[nidx * 4 + 3] === 255) {
                        visited[nidx] = 1;
                        q.push(nx, ny);
                    }
                }
            }
        }
        if (component.length < 6) {
            for (const [cx, cy] of component) {
                sheetBuf[(cy * sheetW + cx) * 4 + 3] = 0;
            }
        }
    }
}

// Quantize to <= 28 colors from uf.hex
const colorFreq = new Map();
for (let i = 0; i < sheetBuf.length; i += 4) {
    if (sheetBuf[i + 3] === 255) {
        const key = (sheetBuf[i] << 16) | (sheetBuf[i + 1] << 8) | sheetBuf[i + 2];
        colorFreq.set(key, (colorFreq.get(key) || 0) + 1);
    }
}

console.log('Distinct colors before quantization:', colorFreq.size);

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

// Save RMMZ character sheet & master
const gamePng = path.join(ROOT, 'game', 'img', 'characters', '$UF_Sheep.png');
const artPng = path.join(ROOT, 'art', 'masters', '$UF_Sheep.png');
writePNG(gamePng, sheetW, sheetH, sheetBuf);
writePNG(artPng, sheetW, sheetH, sheetBuf);
console.log('Saved sheep sheet:', gamePng);

// Write sidecar
const sidecar = {
    id: "wild_sheep",
    name: "Wild sheep",
    frameWidth: 48,
    frameHeight: 48,
    anchor: [24, 47],
    footprint: [1, 1],
    facings: ["S", "W", "E", "N"],
    animations: {
        stand: [1],
        walk: [0, 1, 2, 1]
    },
    frameMs: 150,
    generator: "Google Nano Banana Pro (gemini-3-pro-image)",
    standard: "Final Fantasy VI 16-bit HD"
};

const gameJson = path.join(ROOT, 'game', 'img', 'characters', '$UF_Sheep.json');
const artJson = path.join(ROOT, 'art', 'masters', '$UF_Sheep.json');
fs.writeFileSync(gameJson, JSON.stringify(sidecar, null, 2), 'utf8');
fs.writeFileSync(artJson, JSON.stringify(sidecar, null, 2), 'utf8');
console.log('Saved sheep sidecar:', gameJson);
