const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');

// Load meadow
const meadowPath = path.join(ROOT, 'art', 'masters', 'meadow.png');
let meadowDec = null;
if (fs.existsSync(meadowPath)) {
    meadowDec = decodePNG(fs.readFileSync(meadowPath), 'meadow.png');
}

function getMeadowPixel(x, y) {
    if (!meadowDec) return [77, 93, 40];
    const mx = x % 48;
    const my = y % 48;
    const o = (my * meadowDec.width + mx) * 4;
    return [meadowDec.data[o], meadowDec.data[o + 1], meadowDec.data[o + 2]];
}

// 1. Lineup of 8 facings in Stand pose
console.log('Rendering 8-facing spider lineup...');
const spiderMasterPath = path.join(ROOT, 'art', 'masters', 'giant_spider_idle.png');
const spiderMaster = decodePNG(fs.readFileSync(spiderMasterPath), 'spider.png');

// 8 columns of 96x96 frames (each facing in stand pose, which is col 0 in master)
// Total width = 8 * 96 = 768 px, height = 96 px
const lineupW = 8 * 96;
const lineupH = 96;
const lineupBuf = Buffer.alloc(lineupW * lineupH * 4);

// Fill with meadow
for (let y = 0; y < lineupH; y++) {
    for (let x = 0; x < lineupW; x++) {
        const bg = getMeadowPixel(x, y);
        const o = (y * lineupW + x) * 4;
        lineupBuf[o]     = bg[0];
        lineupBuf[o + 1] = bg[1];
        lineupBuf[o + 2] = bg[2];
        lineupBuf[o + 3] = 255;
    }
}

// Blit each facing's Stand frame (col 0 in master: master is 288x768, col 0 is x: 0..95, row r is y: r*96..(r+1)*96-1)
for (let r = 0; r < 8; r++) {
    const dstX0 = r * 96;
    const srcY0 = r * 96;
    for (let y = 0; y < 96; y++) {
        for (let x = 0; x < 96; x++) {
            const so = ((srcY0 + y) * spiderMaster.width + x) * 4;
            if (spiderMaster.data[so + 3] > 0) {
                const doff = (y * lineupW + (dstX0 + x)) * 4;
                lineupBuf[doff]     = spiderMaster.data[so];
                lineupBuf[doff + 1] = spiderMaster.data[so + 1];
                lineupBuf[doff + 2] = spiderMaster.data[so + 2];
                lineupBuf[doff + 3] = 255;
            }
        }
    }
}

// Scale lineup by 2x
function scale2x(srcBuf, w, h) {
    const out = Buffer.alloc(w * 2 * h * 2 * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const so = (y * w + x) * 4;
            for (let dy = 0; dy < 2; dy++) {
                for (let dx = 0; dx < 2; dx++) {
                    const doff = (((y * 2 + dy) * (w * 2)) + (x * 2 + dx)) * 4;
                    out[doff]     = srcBuf[so];
                    out[doff + 1] = srcBuf[so + 1];
                    out[doff + 2] = srcBuf[so + 2];
                    out[doff + 3] = srcBuf[so + 3];
                }
            }
        }
    }
    return out;
}

const lineup2x = scale2x(lineupBuf, lineupW, lineupH);
const lineupOutPath = path.join(ROOT, 'art', 'review', 'giant_spider_8way_stand_lineup_2x.png');
writePNG(lineupOutPath, lineupW * 2, lineupH * 2, lineup2x);
console.log(`Saved: ${lineupOutPath}`);

// 2. Scale comparison: Human Settler (1 square), Giant Spider (2 squares), Wood Wall (2 squares tall), Oak Tree (2 squares tall)
console.log('Rendering scale comparison scene...');
// Canvas: 8 tiles wide (384 px) x 3 tiles tall (144 px)
const compW = 384;
const compH = 144;
const compBuf = Buffer.alloc(compW * compH * 4);

// Fill with meadow
for (let y = 0; y < compH; y++) {
    for (let x = 0; x < compW; x++) {
        const bg = getMeadowPixel(x, y);
        const o = (y * compW + x) * 4;
        compBuf[o]     = bg[0];
        compBuf[o + 1] = bg[1];
        compBuf[o + 2] = bg[2];
        compBuf[o + 3] = 255;
    }
}

// Grid lines (subtle dark green every 48 px)
for (let y = 0; y < compH; y++) {
    for (let x = 0; x < compW; x++) {
        if (x % 48 === 0 || y % 48 === 0) {
            const o = (y * compW + x) * 4;
            compBuf[o]     = Math.max(0, compBuf[o] - 30);
            compBuf[o + 1] = Math.max(0, compBuf[o + 1] - 30);
            compBuf[o + 2] = Math.max(0, compBuf[o + 2] - 30);
        }
    }
}

// Blit Oak Tree (cols 0..1, rows 0..1: 96x96 at x=0, y=24)
const oakPath = path.join(ROOT, 'art', 'masters', 'oak_stand_96x96.png');
if (fs.existsSync(oakPath)) {
    const oak = decodePNG(fs.readFileSync(oakPath), 'oak.png');
    for (let y = 0; y < 96; y++) {
        for (let x = 0; x < 96; x++) {
            const so = (y * 96 + x) * 4;
            if (oak.data[so + 3] > 0) {
                const doff = ((24 + y) * compW + (12 + x)) * 4;
                compBuf[doff]     = oak.data[so];
                compBuf[doff + 1] = oak.data[so + 1];
                compBuf[doff + 2] = oak.data[so + 2];
                compBuf[doff + 3] = 255;
            }
        }
    }
}

// Blit Wall Wood (48x96 at x=120, y=24)
const wallPath = path.join(ROOT, 'art', 'masters', 'wall_wood.png');
if (fs.existsSync(wallPath)) {
    const wall = decodePNG(fs.readFileSync(wallPath), 'wall.png');
    for (let y = 0; y < 96; y++) {
        for (let x = 0; x < 48; x++) {
            const so = (y * 48 + x) * 4;
            if (wall.data[so + 3] > 0) {
                const doff = ((24 + y) * compW + (120 + x)) * 4;
                compBuf[doff]     = wall.data[so];
                compBuf[doff + 1] = wall.data[so + 1];
                compBuf[doff + 2] = wall.data[so + 2];
                compBuf[doff + 3] = 255;
            }
        }
    }
}

// Blit Human Male Settler (48x48 at x=184, y=72)
const humanPath = path.join(ROOT, 'art', 'masters', 'human_male_stand_south.png');
if (fs.existsSync(humanPath)) {
    const human = decodePNG(fs.readFileSync(humanPath), 'human.png');
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const so = (y * 48 + x) * 4;
            if (human.data[so + 3] > 0) {
                const doff = ((72 + y) * compW + (184 + x)) * 4;
                compBuf[doff]     = human.data[so];
                compBuf[doff + 1] = human.data[so + 1];
                compBuf[doff + 2] = human.data[so + 2];
                compBuf[doff + 3] = 255;
            }
        }
    }
}

// Blit Giant Spider South (96x96 at x=256, y=24)
for (let y = 0; y < 96; y++) {
    for (let x = 0; x < 96; x++) {
        const so = (y * spiderMaster.width + x) * 4; // Row 0 (South) col 0 (Stand)
        if (spiderMaster.data[so + 3] > 0) {
            const doff = ((24 + y) * compW + (256 + x)) * 4;
            compBuf[doff]     = spiderMaster.data[so];
            compBuf[doff + 1] = spiderMaster.data[so + 1];
            compBuf[doff + 2] = spiderMaster.data[so + 2];
            compBuf[doff + 3] = 255;
        }
    }
}

const comp2x = scale2x(compBuf, compW, compH);
const compOutPath = path.join(ROOT, 'art', 'review', 'giant_spider_scale_comparison_on_meadow_2x.png');
writePNG(compOutPath, compW * 2, compH * 2, comp2x);
console.log(`Saved: ${compOutPath}`);

// 3. 3-frame Idle cycle showcase for South facing
console.log('Rendering 3-frame idle showcase for South facing...');
// 3 frames side by side: 3 * 96 = 288 px wide x 96 px tall
const idleW = 288;
const idleH = 96;
const idleBuf = Buffer.alloc(idleW * idleH * 4);

for (let y = 0; y < idleH; y++) {
    for (let x = 0; x < idleW; x++) {
        const bg = getMeadowPixel(x, y);
        const o = (y * idleW + x) * 4;
        idleBuf[o]     = bg[0];
        idleBuf[o + 1] = bg[1];
        idleBuf[o + 2] = bg[2];
        idleBuf[o + 3] = 255;
    }
}

for (let col = 0; col < 3; col++) {
    const dstX0 = col * 96;
    for (let y = 0; y < 96; y++) {
        for (let x = 0; x < 96; x++) {
            const so = (y * spiderMaster.width + (col * 96 + x)) * 4;
            if (spiderMaster.data[so + 3] > 0) {
                const doff = (y * idleW + (dstX0 + x)) * 4;
                idleBuf[doff]     = spiderMaster.data[so];
                idleBuf[doff + 1] = spiderMaster.data[so + 1];
                idleBuf[doff + 2] = spiderMaster.data[so + 2];
                idleBuf[doff + 3] = 255;
            }
        }
    }
}

const idle2x = scale2x(idleBuf, idleW, idleH);
const idleOutPath = path.join(ROOT, 'art', 'review', 'giant_spider_idle_cycle_south_2x.png');
writePNG(idleOutPath, idleW * 2, idleH * 2, idle2x);
console.log(`Saved: ${idleOutPath}`);

console.log('Review renders successfully generated!');
