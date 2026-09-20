'use strict';

/**
 * tools/prepare_12_sprite_references.js
 *
 * Prepares high-resolution (576x768 px at 4x, 3x4 grid) reference sheets
 * on #FF00FF magenta background for Google Nano Banana Pro ImagePaths conditioning:
 * - 12 sprites per sheet (3 animation frames x 4 facings: S, W, E, N).
 * - Used as direct visual reference image for subsequent action sheet generation (Haul, Attack, Bow, Magic, Work, Downed).
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const REF_DIR = path.join(ROOT, 'art', 'raw', 'references');
fs.mkdirSync(REF_DIR, { recursive: true });

function export12SpriteReference(srcCharsetName, dstFilename) {
    const srcPath = path.join(ROOT, 'game', 'img', 'characters', `$${srcCharsetName}.png`);
    if (!fs.existsSync(srcPath)) {
        console.error(`File not found: ${srcPath}`);
        return;
    }

    const src = decodePNG(fs.readFileSync(srcPath));
    const outW = src.width * 4;   // 144 * 4 = 576 px
    const outH = src.height * 4;  // 192 * 4 = 768 px
    const outBuf = Buffer.alloc(outW * outH * 4);

    // Solid magenta background (#FF00FF)
    for (let i = 0; i < outBuf.length; i += 4) {
        outBuf[i] = 255; outBuf[i+1] = 0; outBuf[i+2] = 255; outBuf[i+3] = 255;
    }

    for (let y = 0; y < src.height; y++) {
        for (let x = 0; x < src.width; x++) {
            const sIdx = (y * src.width + x) * 4;
            if (src.data[sIdx + 3] > 0) {
                for (let dy = 0; dy < 4; dy++) {
                    for (let dx = 0; dx < 4; dx++) {
                        const dIdx = ((y * 4 + dy) * outW + (x * 4 + dx)) * 4;
                        outBuf[dIdx]     = src.data[sIdx];
                        outBuf[dIdx + 1] = src.data[sIdx + 1];
                        outBuf[dIdx + 2] = src.data[sIdx + 2];
                        outBuf[dIdx + 3] = 255;
                    }
                }
            }
        }
    }

    const dstPath = path.join(REF_DIR, dstFilename);
    fs.writeFileSync(dstPath, writePNG(outBuf, outW, outH));
    console.log(`Saved 12-sprite reference sheet (${outW}x${outH}): ${dstPath}`);
}

export12SpriteReference('UF_Elf_Male_Walk', 'elf_male_walk_12_reference.png');
export12SpriteReference('UF_Elf_Walk',      'elf_walk_12_reference.png');

console.log('12-sprite reference preparation complete.');
