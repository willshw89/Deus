'use strict';

const fs = require('fs');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const raw = decodePNG(fs.readFileSync('art/raw/u7_modular_portraits_nano_pro.png'));

// The entire raw image is 1024x1024.
// If we scale the entire 1024x1024 raw image down uniformly:
// Notice Row 0 has 3 arches:
// Arch 0: x: 10, y: 0, w: 321, h: 341 -> fits in 144x144!
// Scale factor S = 144 / 341 ≈ 0.422287 (or 144 / 321 = 0.448598).
// When we scaled the arch:
// rect was { x: 10, y: 0, w: 321, h: 341 } -> scaled to 144x144.
// Now look at Row 3: Outfits!
// Col 0: Leather vest: x: 0..256, y: 770..1024 (w: 256, h: 254).
// Col 1: Plate cuirass: x: 256..512, y: 770..1024
// Col 2: Cloak: x: 512..768, y: 770..1024
// Col 3: Apron: x: 768..1024, y: 770..1024

// Look at the neck hole of the cuirass in Col 1:
// Where is the neck cutout in the raw image?
// In raw cuirass (x: 256..512, y: 770..1024):
// Find top edge of cuirass and neck hole:
console.log('Analyzing raw clothing alignment...');
for (let y = 770; y < 850; y++) {
    for (let x = 256; x < 512; x++) {
        const idx = (y * 1024 + x) * 4;
        const r = raw.data[idx], g = raw.data[idx+1], b = raw.data[idx+2], a = raw.data[idx+3];
        // If not magenta
        if (!(r > 150 && b > 150 && g < 80) && a > 50) {
            // First visible pixel of cuirass!
            // console.log(`Cuirass top pixel at x=${x-256}, y=${y-770}`);
        }
    }
}

// Let's test overlaying cuirass directly onto maleBase1:
// maleBase1 neck is at x: 50..94 (width 44), y: 105..135.
// So clothing should be placed at the bottom of the 144x144 frame:
// Target clothing bounds in 144x144 frame:
// w = 144, h = 50, placed at y = 144 - 50 = 94!
console.log('Done.');
