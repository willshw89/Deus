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

function isPurpleOrMagenta(r, g, b) {
    if (r > 60 && b > 60 && (r + b) > (g * 2 + 20)) return true;
    if (r > 120 && b > 120 && g < 110) return true;
    if (r > 170 && b > 170) return true;
    return false;
}

function extractSprite(raw, x0, y0, x1, y1) {
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

// Invariant uniform scale factor matching $UF_Hare.png
// 20.0 / 169.0 = 0.1183
const targetScale = 0.1183;

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

function cleanAndQuantizeSheet(sheetBuf, sheetW, sheetH) {
    // Clean tiny isolated specks (< 6 connected pixels)
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
}

function assembleAndSave(grid, sheetName, sidecarActionName) {
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

    cleanAndQuantizeSheet(sheetBuf, sheetW, sheetH);

    const gamePng = path.join(ROOT, 'game', 'img', 'characters', `$UF_${sheetName}.png`);
    const artPng = path.join(ROOT, 'art', 'masters', `$UF_${sheetName}.png`);
    writePNG(gamePng, sheetW, sheetH, sheetBuf);
    writePNG(artPng, sheetW, sheetH, sheetBuf);

    const animations = {};
    animations[sidecarActionName] = [0, 1, 2, 1];
    animations.stand = [1];

    const sidecar = {
        id: sheetName.toLowerCase(),
        name: `Hare ${sheetName}`,
        frameWidth: 48,
        frameHeight: 48,
        anchor: [24, 47],
        footprint: [1, 1],
        facings: ["S", "W", "E", "N"],
        animations: animations,
        frameMs: 150,
        generator: "Google Nano Banana Pro (gemini-3-pro-image)",
        standard: "Final Fantasy VI 16-bit HD"
    };

    const gameJson = path.join(ROOT, 'game', 'img', 'characters', `$UF_${sheetName}.json`);
    const artJson = path.join(ROOT, 'art', 'masters', `$UF_${sheetName}.json`);
    fs.writeFileSync(gameJson, JSON.stringify(sidecar, null, 2), 'utf8');
    fs.writeFileSync(artJson, JSON.stringify(sidecar, null, 2), 'utf8');
    console.log(`Saved $UF_${sheetName}.png and sidecar.`);
}

function processAction(filename, sheetName, actionName) {
    console.log(`--- Compiling Hare ${sheetName} ---`);
    const raw = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', filename)), filename);

    // Row 0: South
    const southL = extractSprite(raw, 400, 20,  560, 200);
    const southC = extractSprite(raw, 640, 20,  765, 200);
    const southR = extractSprite(raw, 840, 20, 1000, 200);

    // Row 1: West
    const westL  = extractSprite(raw, 370, 190,  590, 380);
    const westC  = extractSprite(raw, 610, 190,  790, 380);
    const westR  = extractSprite(raw, 830, 190, 1040, 380);

    // Row 2: East
    const eastL  = extractSprite(raw, 370, 380,  580, 580);
    const eastC  = extractSprite(raw, 610, 380,  800, 580);
    const eastR  = extractSprite(raw, 830, 380, 1040, 580);

    // Row 3: North
    const northL = extractSprite(raw, 390, 570,  580, 750);
    const northC = extractSprite(raw, 630, 570,  770, 750);
    const northR = extractSprite(raw, 830, 570, 1020, 750);

    const grid = [
        [renderCell(southL), renderCell(southC), renderCell(southR)],
        [renderCell(westL),  renderCell(westC),  renderCell(westR)],
        [renderCell(eastL || westL, !eastL), renderCell(eastC || westC, !eastC), renderCell(eastR || westR, !eastR)],
        [renderCell(northL), renderCell(northC), renderCell(northR)]
    ];

    assembleAndSave(grid, sheetName, actionName);
}

processAction('pro_hare_eat.png', 'Hare_Eat', 'eat');
processAction('pro_hare_attack.png', 'Hare_Attack', 'attack');
processAction('pro_hare_sleep.png', 'Hare_Sleep', 'sleep');

console.log('All hare action suites successfully compiled!');
