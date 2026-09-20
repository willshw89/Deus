'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const FACTIONS = ["default", "human", "elf", "dwarf", "gnome", "goblin", "orc", "lizardfolk", "kobold", "undead", "starborn", "swarm"];

const HOTSPOTS = {
    default: [4, 4],
    human: [5, 4],
    elf: [4, 4],
    dwarf: [4, 4],
    gnome: [4, 4],
    goblin: [4, 4],
    orc: [4, 4],
    lizardfolk: [4, 4],
    kobold: [4, 4],
    undead: [4, 4],
    starborn: [4, 4],
    swarm: [4, 4]
};

// Render each cursor at 4x with hotspot dot
const cols = 6;
const rows = 2;
const cellW = 48 * 4; // 192
const cellH = 48 * 4; // 192
const outBuf = Buffer.alloc(cols * cellW * rows * cellH * 4);

// Fill with checkerboard background
for (let y = 0; y < rows * cellH; y++) {
    for (let x = 0; x < cols * cellW; x++) {
        const check = ((Math.floor(x / 16) + Math.floor(y / 16)) % 2 === 0);
        const col = check ? 40 : 50;
        const idx = (y * cols * cellW + x) * 4;
        outBuf[idx] = col;
        outBuf[idx+1] = col;
        outBuf[idx+2] = col + 8;
        outBuf[idx+3] = 255;
    }
}

for (let i = 0; i < FACTIONS.length; i++) {
    const fac = FACTIONS[i];
    const p = path.join(__dirname, '..', 'game', 'img', 'system', `Cursor_${fac}.png`);
    if (!fs.existsSync(p)) {
        console.log(`Missing cursor: ${p}`);
        continue;
    }
    const img = decodePNG(fs.readFileSync(p));
    const c = i % cols;
    const r = Math.floor(i / cols);
    const ox = c * cellW;
    const oy = r * cellH;
    const spot = HOTSPOTS[fac] || [0, 0];

    // Check bounds & top-most / left-most pixels
    let minX = 48, maxX = 0, minY = 48, maxY = 0;
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const idx = (y * 48 + x) * 4;
            if (img.data[idx+3] > 0) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    console.log(`${fac}: bounds [${minX},${minY} .. ${maxX},${maxY}], hotspot: [${spot[0]}, ${spot[1]}]`);

    // Draw cursor at 4x
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const sIdx = (y * 48 + x) * 4;
            if (img.data[sIdx+3] === 0) continue;
            for (let dy = 0; dy < 4; dy++) {
                for (let dx = 0; dx < 4; dx++) {
                    const px = ox + x * 4 + dx;
                    const py = oy + y * 4 + dy;
                    const dIdx = (py * cols * cellW + px) * 4;
                    outBuf[dIdx]   = img.data[sIdx];
                    outBuf[dIdx+1] = img.data[sIdx+1];
                    outBuf[dIdx+2] = img.data[sIdx+2];
                    outBuf[dIdx+3] = 255;
                }
            }
        }
    }

    // Draw red hotspot crosshair (at hotspot * 4)
    const hx = ox + spot[0] * 4;
    const hy = oy + spot[1] * 4;
    for (let d = -4; d <= 7; d++) {
        const p1 = (hy * cols * cellW + Math.min(Math.max(hx + d, 0), cols * cellW - 1)) * 4;
        const p2 = (Math.min(Math.max(hy + d, 0), rows * cellH - 1) * cols * cellW + hx) * 4;
        outBuf[p1] = 255; outBuf[p1+1] = 0; outBuf[p1+2] = 0; outBuf[p1+3] = 255;
        outBuf[p2] = 255; outBuf[p2+1] = 0; outBuf[p2+2] = 0; outBuf[p2+3] = 255;
    }
}

fs.writeFileSync('art/review/all_cursors_inspected.png', writePNG(outBuf, cols * cellW, rows * cellH));
console.log('Saved art/review/all_cursors_inspected.png');
