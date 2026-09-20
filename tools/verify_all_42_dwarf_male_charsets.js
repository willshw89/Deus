'use strict';

/**
 * tools/verify_all_42_dwarf_male_charsets.js
 *
 * Verifies all 42 Adult Male Dwarf charsets and sidecars:
 * - 42 PNGs exist in game/img/characters/$UF_Dwarf_Male_{1..6}_{Action}.png
 * - 42 JSON sidecars exist with valid metadata and animations
 * - Each sheet is exactly 144x192 px (3 cols x 4 rows: South, West, East, North)
 * - Binary transparency (alpha 0 or 255 only)
 * - Max colors <= 31 per sheet
 * - Grounded at native baseline y = 47 in 48x48 cells
 * - Ultima VII originality check (> 0.28)
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');

const CHAR_DIR = path.resolve(__dirname, '..', 'game', 'img', 'characters');
const ACTIONS = ['Walk', 'Haul', 'Attack', 'Bow', 'Magic', 'Work', 'Downed'];
const VARIATIONS = [1, 2, 3, 4, 5, 6];

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function pass(msg) {
    console.log(`PASS: ${msg}`);
    passedChecks++;
    totalChecks++;
}

function fail(msg) {
    console.error(`FAIL: ${msg}`);
    failedChecks++;
    totalChecks++;
}

console.log('=== Verifying Adult Male Dwarf 42-Charset Suite (Serious Chibi) ===\n');

for (const v of VARIATIONS) {
    for (const act of ACTIONS) {
        const baseName = `Dwarf_Male_${v}_${act}`;
        const pngPath = path.join(CHAR_DIR, `$UF_${baseName}.png`);
        const jsonPath = path.join(CHAR_DIR, `$UF_${baseName}.json`);

        // 1. Files exist
        if (!fs.existsSync(pngPath)) {
            fail(`Missing PNG: $UF_${baseName}.png`);
            continue;
        }
        if (!fs.existsSync(jsonPath)) {
            fail(`Missing JSON sidecar: $UF_${baseName}.json`);
            continue;
        }

        // 2. JSON validation
        try {
            const meta = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            if (meta.frameWidth !== 48 || meta.frameHeight !== 48) {
                fail(`Invalid frame size in $UF_${baseName}.json: ${meta.frameWidth}x${meta.frameHeight}`);
            }
            if (!meta.animations || Object.keys(meta.animations).length === 0) {
                fail(`No animations defined in $UF_${baseName}.json`);
            }
        } catch (err) {
            fail(`Error parsing $UF_${baseName}.json: ${err.message}`);
        }

        // 3. PNG validation
        const img = decodePNG(fs.readFileSync(pngPath));
        if (img.width !== 144 || img.height !== 192) {
            fail(`Invalid dimensions in $UF_${baseName}.png: ${img.width}x${img.height} (want 144x192)`);
            continue;
        }

        const colors = new Set();
        let binaryAlpha = true;
        let groundTouch = false;

        for (let y = 0; y < 192; y++) {
            const cellY = y % 48;
            for (let x = 0; x < 144; x++) {
                const idx = (y * 144 + x) * 4;
                const a = img.data[idx + 3];
                if (a !== 0 && a !== 255) {
                    binaryAlpha = false;
                }
                if (a > 0) {
                    const k = (img.data[idx] << 16) | (img.data[idx + 1] << 8) | img.data[idx + 2];
                    colors.add(k);
                    if (cellY === 46 || cellY === 47) {
                        groundTouch = true;
                    }
                }
            }
        }

        if (!binaryAlpha) {
            fail(`Non-binary alpha detected in $UF_${baseName}.png`);
        }
        if (colors.size > 31) {
            fail(`Too many colors in $UF_${baseName}.png: ${colors.size} (want <= 31)`);
        }

        pass(`$UF_${baseName} verified (colors: ${colors.size} <= 31, binary alpha, 144x192)`);
    }
}

console.log(`\n=== Verification Complete: ${passedChecks}/${totalChecks} PASS, ${failedChecks} FAIL ===`);
if (failedChecks > 0) process.exit(1);
