'use strict';
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');

const ROOT = path.resolve(__dirname, '..');

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
    return { x0: minX, y0: minY, x1: maxX, y1: maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

const tests = [
    {
        file: 'pro_deer_eat.png',
        boxes: [
            ['South L', 40, 10, 200, 250],
            ['South C', 270, 10, 440, 250],
            ['South R', 700, 10, 920, 250],
            ['East L',  10, 260, 220, 520],
            ['East C',  270, 260, 450, 520],
            ['East R',  470, 260, 690, 520],
            ['North L', 30, 530, 240, 765],
            ['North C', 310, 530, 400, 765],
            ['North R', 470, 530, 680, 765]
        ]
    },
    {
        file: 'pro_deer_attack.png',
        boxes: [
            ['South L', 40, 10, 200, 250],
            ['South C', 270, 10, 440, 250],
            ['South R', 730, 10, 910, 250],
            ['East L',  40, 260, 220, 520],
            ['East C',  250, 260, 450, 520],
            ['East R',  490, 260, 700, 520],
            ['North L', 30, 530, 220, 765],
            ['North C', 310, 530, 400, 765],
            ['North R', 480, 530, 680, 765]
        ]
    },
    {
        file: 'pro_deer_sleep.png',
        boxes: [
            ['South L', 30, 10, 210, 250],
            ['South C', 260, 10, 445, 250],
            ['South R', 500, 10, 680, 250],
            ['East L',  30, 260, 220, 520],
            ['East C',  260, 260, 450, 520],
            ['East R',  490, 260, 690, 520],
            ['North L', 30, 530, 220, 765],
            ['North C', 310, 530, 395, 765],
            ['North R', 490, 530, 680, 765]
        ]
    }
];

for (const t of tests) {
    const raw = decodePNG(fs.readFileSync(path.join(ROOT, 'art', 'raw', t.file)), t.file);
    console.log(`\n=== ${t.file} ===`);
    for (const [name, x0, y0, x1, y1] of t.boxes) {
        const b = extractSprite(raw, x0, y0, x1, y1);
        if (b) {
            console.log(`  ${name}: ${b.w}x${b.h} @ (${b.x0}, ${b.y0})`);
        } else {
            console.log(`  ${name}: NULL`);
        }
    }
}
