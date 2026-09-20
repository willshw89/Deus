'use strict';
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const files = [
    { name: 'walk', file: 'dwarf_female_walk_12_raw.png', cols: 6, rows: 3 },
    { name: 'haul', file: 'dwarf_female_haul_12_raw.png', cols: 6, rows: 3 },
    { name: 'attack_5x4', file: 'dwarf_female_attack_12_raw.png', cols: 5, rows: 4 },
    { name: 'bow_3x4', file: 'dwarf_female_bow_12_raw.png', cols: 3, rows: 4 },
    { name: 'magic_3x4', file: 'dwarf_female_magic_12_raw.png', cols: 3, rows: 4 },
    { name: 'work', file: 'dwarf_female_work_12_raw.png', cols: 6, rows: 3 },
    { name: 'downed', file: 'dwarf_female_downed_12_raw.png', cols: 6, rows: 3 }
];

for (const item of files) {
    const raw = decodePNG(fs.readFileSync(path.join('art/raw', item.file)));
    // Draw grid lines on a copy
    const buf = Buffer.from(raw.data);
    const cellW = raw.width / item.cols;
    const cellH = raw.height / item.rows;

    for (let c = 1; c < item.cols; c++) {
        const x = Math.round(c * cellW);
        for (let y = 0; y < raw.height; y++) {
            const idx = (y * raw.width + x) * 4;
            buf[idx] = 0; buf[idx+1] = 255; buf[idx+2] = 0; buf[idx+3] = 255; // green line
        }
    }
    for (let r = 1; r < item.rows; r++) {
        const y = Math.round(r * cellH);
        for (let x = 0; x < raw.width; x++) {
            const idx = (y * raw.width + x) * 4;
            buf[idx] = 0; buf[idx+1] = 255; buf[idx+2] = 0; buf[idx+3] = 255; // green line
        }
    }

    // Downscale by factor of 2 or 4 for quick review
    const scale = 2;
    const outW = Math.round(raw.width / scale);
    const outH = Math.round(raw.height / scale);
    const outBuf = Buffer.alloc(outW * outH * 4);
    for (let oy = 0; oy < outH; oy++) {
        for (let ox = 0; ox < outW; ox++) {
            const sy = Math.min(raw.height - 1, oy * scale);
            const sx = Math.min(raw.width - 1, ox * scale);
            const sIdx = (sy * raw.width + sx) * 4;
            const dIdx = (oy * outW + ox) * 4;
            outBuf[dIdx] = buf[sIdx];
            outBuf[dIdx+1] = buf[sIdx+1];
            outBuf[dIdx+2] = buf[sIdx+2];
            outBuf[dIdx+3] = buf[sIdx+3];
        }
    }
    const outPath = path.join('art/review', `grid_preview_${item.name}.png`);
    fs.writeFileSync(outPath, writePNG(outBuf, outW, outH));
    console.log(`Wrote ${outPath}`);
}
