'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { decodePNG } = require('../../../tools/png_read');
const { writePNG } = require('../../../tools/png_util');

const ROOT = path.resolve(__dirname, '../../..');
const SOURCE_DIR = path.join(ROOT, 'art', 'masters', 'owner', '2026-09-29_biome');
const OUT_DIR = __dirname;

const BOARD_PNG = path.join(OUT_DIR, 'meadow_set0_a2_board.png');
const MANIFEST_MD = path.join(OUT_DIR, 'manifest.md');

// Simple 3x5 bitmap font
const FONT_3X5 = {
    '0': [7, 5, 5, 5, 7], '1': [2, 6, 2, 2, 7], '2': [7, 1, 7, 4, 7], '3': [7, 1, 7, 1, 7],
    '4': [5, 5, 7, 1, 1], '5': [7, 4, 7, 1, 7], '6': [7, 4, 7, 5, 7], '7': [7, 1, 2, 2, 2],
    '8': [7, 5, 7, 5, 7], '9': [7, 5, 7, 1, 7],
    'a': [7, 5, 7, 5, 5], 'b': [6, 5, 7, 5, 7], 'c': [7, 4, 4, 4, 7], 'd': [6, 5, 5, 5, 7],
    'e': [7, 4, 7, 4, 7], 'f': [7, 4, 7, 4, 4], 'g': [7, 4, 5, 5, 7], 'h': [5, 5, 7, 5, 5],
    'i': [7, 2, 2, 2, 7], 'j': [1, 1, 1, 5, 7], 'k': [5, 5, 6, 5, 5], 'l': [4, 4, 4, 4, 7],
    'm': [5, 7, 5, 5, 5], 'n': [6, 5, 5, 5, 5], 'o': [7, 5, 5, 5, 7], 'p': [7, 5, 7, 4, 4],
    'r': [7, 5, 6, 5, 5], 's': [7, 4, 7, 1, 7], 't': [7, 2, 2, 2, 2], 'u': [5, 5, 5, 5, 7],
    'v': [5, 5, 5, 5, 2], 'w': [5, 5, 5, 7, 5], 'x': [5, 5, 2, 5, 5], 'y': [5, 5, 7, 1, 7],
    'z': [7, 1, 2, 4, 7], '-': [0, 0, 7, 0, 0], '#': [5, 7, 5, 7, 5], ' ': [0, 0, 0, 0, 0],
    '.': [0, 0, 0, 0, 2], ':': [0, 2, 0, 2, 0], '/': [1, 1, 2, 4, 4], '(': [2, 4, 4, 4, 2], ')': [4, 2, 2, 2, 4]
};

function drawChar(buf, bufW, bufH, char, startX, startY, scale = 1, r = 255, g = 255, b = 255) {
    const glyph = FONT_3X5[char.toLowerCase()] || FONT_3X5[' '];
    for (let row = 0; row < 5; row++) {
        const bits = glyph[row];
        for (let col = 0; col < 3; col++) {
            if ((bits & (1 << (2 - col))) !== 0) {
                for (let sy = 0; sy < scale; sy++) {
                    for (let sx = 0; sx < scale; sx++) {
                        const px = startX + col * scale + sx;
                        const py = startY + row * scale + sy;
                        if (px >= 0 && px < bufW && py >= 0 && py < bufH) {
                            const idx = (py * bufW + px) * 4;
                            buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = 255;
                        }
                    }
                }
            }
        }
    }
}

function drawString(buf, bufW, bufH, str, startX, startY, scale = 1, r = 255, g = 255, b = 255) {
    let curX = startX;
    for (let i = 0; i < str.length; i++) {
        drawChar(buf, bufW, bufH, str[i], curX, startY, scale, r, g, b);
        curX += (3 * scale) + scale;
    }
}

// 1. Read Set 0 variants (0 through 5)
const variants = [];
for (let i = 0; i <= 5; i++) {
    const vPath = path.join(SOURCE_DIR, `variant_${i}.png`);
    if (fs.existsSync(vPath)) {
        const raw = fs.readFileSync(vPath);
        const png = decodePNG(raw, `variant_${i}.png`);
        variants.push({
            name: `variant_${i}.png`,
            path: vPath,
            width: png.width,
            height: png.height,
            png
        });
    }
}

console.log(`Loaded ${variants.length} Set 0 meadow variants.`);

// 2. Build contact review board
const cellW = 160;
const cellH = 170;
const cols = 3;
const rows = Math.ceil(variants.length / cols) || 1;
const margin = 30;
const headerH = 60;
const boardW = margin * 2 + cols * cellW;
const boardH = headerH + rows * cellH + 30;

const buf = Buffer.alloc(boardW * boardH * 4);
for (let i = 0; i < buf.length; i += 4) {
    buf[i] = 120; buf[i + 1] = 120; buf[i + 2] = 120; buf[i + 3] = 255;
}

drawString(buf, boardW, boardH, 'SET 0 MEADOW A2 OWNER REVIEW BOARD', margin, 20, 2, 255, 255, 255);
drawString(buf, boardW, boardH, 'SOURCE: ART/MASTERS/OWNER/2026-09-29_BIOME/ | SCALE: 2X NATIVE (48X48 -> 96X96)', margin, 42, 1, 230, 230, 230);

for (let idx = 0; idx < variants.length; idx++) {
    const v = variants[idx];
    const col = idx % cols;
    const row = Math.floor(idx / cols);

    const cellX = margin + col * cellW;
    const cellY = headerH + row * cellH;

    // Border
    for (let x = cellX; x < cellX + cellW - 4; x++) {
        const topIdx = (cellY * boardW + x) * 4;
        const botIdx = ((cellY + cellH - 4) * boardW + x) * 4;
        buf[topIdx] = buf[topIdx+1] = buf[topIdx+2] = 80; buf[topIdx+3] = 255;
        buf[botIdx] = buf[botIdx+1] = buf[botIdx+2] = 80; buf[botIdx+3] = 255;
    }
    for (let y = cellY; y < cellY + cellH - 4; y++) {
        const leftIdx = (y * boardW + cellX) * 4;
        const rightIdx = (y * boardW + cellX + cellW - 4) * 4;
        buf[leftIdx] = buf[leftIdx+1] = buf[leftIdx+2] = 80; buf[leftIdx+3] = 255;
        buf[rightIdx] = buf[rightIdx+1] = buf[rightIdx+2] = 80; buf[rightIdx+3] = 255;
    }

    // Render tile at 2x scale
    const renderW = v.width * 2;
    const renderH = v.height * 2;
    const ox = cellX + Math.floor((cellW - renderW) / 2);
    const oy = cellY + 12;

    for (let sy = 0; sy < v.height; sy++) {
        for (let sx = 0; sx < v.width; sx++) {
            const p = v.png.px(sx, sy);
            if (p[3] === 0) continue;
            for (let dy = 0; dy < 2; dy++) {
                for (let dx = 0; dx < 2; dx++) {
                    const tx = ox + sx * 2 + dx;
                    const ty = oy + sy * 2 + dy;
                    const bIdx = (ty * boardW + tx) * 4;
                    const alpha = p[3] / 255;
                    buf[bIdx] = Math.round(p[0] * alpha + buf[bIdx] * (1 - alpha));
                    buf[bIdx + 1] = Math.round(p[1] * alpha + buf[bIdx + 1] * (1 - alpha));
                    buf[bIdx + 2] = Math.round(p[2] * alpha + buf[bIdx + 2] * (1 - alpha));
                    buf[bIdx + 3] = 255;
                }
            }
        }
    }

    drawString(buf, boardW, boardH, v.name.toUpperCase(), cellX + 10, cellY + cellH - 30, 1, 255, 255, 255);
    drawString(buf, boardW, boardH, `${v.width}X${v.height} PX | NATIVE BASE`, cellX + 10, cellY + cellH - 16, 1, 210, 210, 180);
}

writePNG(BOARD_PNG, boardW, boardH, buf);
const boardStat = fs.statSync(BOARD_PNG);
const boardSha = crypto.createHash('sha256').update(fs.readFileSync(BOARD_PNG)).digest('hex');

console.log(`Generated review board: ${BOARD_PNG} (${boardStat.size} bytes, sha256: ${boardSha})`);

// 3. Write Manifest
let manifestContent = `# Set 0 Meadow A2 Owner Review Manifest\n\n`;
manifestContent += `**Date:** ${new Date().toISOString()}\n`;
manifestContent += `**Authority:** MSG-PRUNE-PM-040, MSG-PRUNE-PM-043, DEC-007, DEC-046\n`;
manifestContent += `**Board Image:** \`meadow_set0_a2_board.png\` (${boardW}x${boardH} px, 2x scale display)\n`;
manifestContent += `**Board SHA-256:** \`${boardSha}\`\n`;
manifestContent += `**Board mtime:** \`${boardStat.mtime.toISOString()}\`\n\n`;
manifestContent += `## Sourced Master Variants\n\n`;
manifestContent += `| # | Variant File | Dimensions | Source Path | sha256 |\n`;
manifestContent += `|---|---|---|---|---|\n`;

for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    const sha = crypto.createHash('sha256').update(fs.readFileSync(v.path)).digest('hex');
    manifestContent += `| ${i + 1} | \`${v.name}\` | ${v.width}x${v.height} px | \`${v.path}\` | \`${sha}\` |\n`;
}

fs.writeFileSync(MANIFEST_MD, manifestContent, 'utf8');
console.log(`Wrote manifest: ${MANIFEST_MD}`);
