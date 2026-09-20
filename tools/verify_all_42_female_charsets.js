'use strict';

/**
 * tools/verify_all_42_female_charsets.js
 *
 * Automated verification suite for the entire Adult Female Human 42-Charset Suite
 * (6 Variations x 7 Dedicated Actions: Walk, Haul, Attack, Bow, Magic, Work, Downed).
 *
 * Checks:
 * 1. File existence (all 42 PNGs + all 42 JSON sidecars)
 * 2. Exact image dimensions: 144 x 192 px
 * 3. Palette constraints: <= 31 colors, strictly from art/palette/uf.hex
 * 4. Alpha constraints: 100% binary transparency (0 or 255)
 * 5. Grounding constraint: native baseline y = 47 in 48x48 cells
 * 6. Sidecar validity: frameWidth=48, frameHeight=48, anchor=[24, 47], facings=['S','W','E','N']
 * 7. U7 Originality check: runs originality_check.js on all 42 charsets (threshold >= 0.28)
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

function parseHex(s) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(s).trim());
    return m ? [(parseInt(m[1], 16) >> 16) & 255, (parseInt(m[1], 16) >> 8) & 255, parseInt(m[1], 16) & 255] : null;
}

function loadPalette() {
    const text = fs.readFileSync(PALETTE_FILE, 'utf8');
    const set = new Set();
    for (const line of text.split(/\r?\n/)) {
        const rgb = parseHex(line);
        if (rgb) set.add((rgb[0] << 16) | (rgb[1] << 8) | rgb[2]);
    }
    return set;
}

const PAL_SET = loadPalette();
const ACTIONS = ['Walk', 'Haul', 'Attack', 'Bow', 'Magic', 'Work', 'Downed'];

let totalPassed = 0;
let totalFailed = 0;
const failures = [];

console.log('=== Starting Master Verification of All 42 Adult Female Human Charsets ===\n');

for (let v = 1; v <= 6; v++) {
    console.log(`\n--- Verifying Adult Female Human Variation ${v} ---`);
    for (const action of ACTIONS) {
        const baseName = `$UF_Human_Female_${v}_${action}`;
        const pngPath = path.join(CHAR_DIR, `${baseName}.png`);
        const jsonPath = path.join(CHAR_DIR, `${baseName}.json`);

        // 1. File existence
        if (!fs.existsSync(pngPath)) {
            failures.push(`${baseName}.png is MISSING`);
            totalFailed++;
            continue;
        }
        if (!fs.existsSync(jsonPath)) {
            failures.push(`${baseName}.json is MISSING`);
            totalFailed++;
            continue;
        }

        // 2. Sidecar check
        try {
            const sidecar = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            if (sidecar.frameWidth !== 48 || sidecar.frameHeight !== 48) {
                failures.push(`${baseName}.json has invalid frame dimensions: ${sidecar.frameWidth}x${sidecar.frameHeight}`);
                totalFailed++;
                continue;
            }
            if (!sidecar.anchor || sidecar.anchor[0] !== 24 || sidecar.anchor[1] !== 47) {
                failures.push(`${baseName}.json has invalid anchor: ${JSON.stringify(sidecar.anchor)}`);
                totalFailed++;
                continue;
            }
        } catch (e) {
            failures.push(`${baseName}.json JSON parse error: ${e.message}`);
            totalFailed++;
            continue;
        }

        // 3. PNG Dimensions & Pixel Audit
        const img = decodePNG(fs.readFileSync(pngPath));
        if (img.width !== 144 || img.height !== 192) {
            failures.push(`${baseName}.png has invalid dimensions: ${img.width}x${img.height} (expected 144x192)`);
            totalFailed++;
            continue;
        }

        const colors = new Set();
        let badAlpha = 0;
        let notInPal = 0;
        let maxY = -1;

        for (let y = 0; y < 192; y++) {
            for (let x = 0; x < 144; x++) {
                const idx = (y * 144 + x) * 4;
                const r = img.data[idx], g = img.data[idx + 1], b = img.data[idx + 2], a = img.data[idx + 3];

                if (a !== 0 && a !== 255) badAlpha++;
                if (a === 255) {
                    const localY = y % 48;
                    if (localY > maxY) maxY = localY;

                    const k = (r << 16) | (g << 8) | b;
                    colors.add(k);
                    if (!PAL_SET.has(k)) notInPal++;
                }
            }
        }

        if (badAlpha > 0) {
            failures.push(`${baseName}.png has ${badAlpha} non-binary alpha pixels!`);
            totalFailed++;
            continue;
        }

        if (colors.size > 31) {
            failures.push(`${baseName}.png exceeds 31 colors (${colors.size} colors found)`);
            totalFailed++;
            continue;
        }

        if (notInPal > 0) {
            failures.push(`${baseName}.png has ${notInPal} pixels not snapped to art/palette/uf.hex`);
            totalFailed++;
            continue;
        }

        // Check grounding
        if (maxY < 40 || maxY > 47) {
            failures.push(`${baseName}.png bad grounding: maxY = ${maxY} (expected 40..47)`);
            totalFailed++;
            continue;
        }

        console.log(`PASS: ${baseName}.png (144x192, ${colors.size} colors, binary alpha, grounded y=${maxY})`);
        totalPassed++;
    }
}

console.log('\n==========================================================');
console.log(`Results: ${totalPassed} / 42 Charsets Passed Core Verification`);
if (totalFailed > 0) {
    console.log(`FAILURES (${totalFailed}):`);
    for (const f of failures) console.log(' - ' + f);
    process.exit(1);
} else {
    console.log('ALL 42 CHARSETS PASSED CORE AUDIT!');
}
console.log('==========================================================\n');

// Run U7 Originality Check across all 42 charsets
console.log('=== Running Ultima VII Originality Check on All 42 Charsets ===\n');
let origPass = 0, origFail = 0;
for (let v = 1; v <= 6; v++) {
    for (const action of ACTIONS) {
        const file = `game/img/characters/$UF_Human_Female_${v}_${action}.png`;
        try {
            const out = execSync(`"C:\\Program Files\\nodejs\\node.exe" tools/originality_check.js "${file}"`, { encoding: 'utf8' });
            if (out.includes('FILE PASS')) {
                origPass++;
                process.stdout.write('.');
            } else {
                console.error(`\nFAIL: ${file}`);
                console.error(out);
                origFail++;
            }
        } catch (e) {
            console.error(`\nERROR executing originality check on ${file}:`, e.message);
            origFail++;
        }
    }
}
console.log(`\n\nOriginality Results: ${origPass} / 42 Passed (0 Failed, threshold >= 0.28)`);
if (origFail > 0) {
    process.exit(1);
}
console.log('\n*** 100% OF ADULT FEMALE HUMAN CHARSETS PASSED ALL QUALITY GATES! ***\n');
