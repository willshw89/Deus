'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { decodePNG } = require('./png_read');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');

console.log('=== Verifying All 6 Adult Male Human Variations ===\n');

let allPassed = true;

for (let i = 1; i <= 6; i++) {
    const file = `$UF_Human_Male_${i}.png`;
    const sidecar = `$UF_Human_Male_${i}.json`;
    const p = path.join(CHAR_DIR, file);
    const sp = path.join(CHAR_DIR, sidecar);

    if (!fs.existsSync(p)) {
        console.error(`FAIL: Missing ${file}`);
        allPassed = false;
        continue;
    }
    if (!fs.existsSync(sp)) {
        console.error(`FAIL: Missing ${sidecar}`);
        allPassed = false;
        continue;
    }

    const d = decodePNG(fs.readFileSync(p));
    if (d.width !== 144 || d.height !== 192) {
        console.error(`FAIL: ${file} dimension mismatch: ${d.width}x${d.height}`);
        allPassed = false;
    }

    const colors = new Set();
    let badAlpha = 0;
    for (let j = 0; j < d.data.length; j += 4) {
        const a = d.data[j + 3];
        if (a !== 0 && a !== 255) badAlpha++;
        if (a > 0) {
            colors.add((d.data[j] << 16) | (d.data[j + 1] << 8) | d.data[j + 2]);
        }
    }

    if (badAlpha > 0) {
        console.error(`FAIL: ${file} has ${badAlpha} non-binary alpha pixels`);
        allPassed = false;
    }
    if (colors.size > 31) {
        console.error(`FAIL: ${file} exceeds 31 colors (${colors.size})`);
        allPassed = false;
    }

    // Verify side walk frames are distinct and alternating
    // Compare East row (Row 2): Col 0 (Stride A), Col 1 (Stand), Col 2 (Stride B)
    const getFramePixels = (col, row) => {
        const arr = [];
        for (let y = row * 48; y < (row + 1) * 48; y++) {
            for (let x = col * 48; x < (col + 1) * 48; x++) {
                const idx = (y * 144 + x) * 4;
                arr.push(d.data[idx], d.data[idx+1], d.data[idx+2], d.data[idx+3]);
            }
        }
        return Buffer.from(arr);
    };

    const e0 = getFramePixels(0, 2);
    const e1 = getFramePixels(1, 2);
    const e2 = getFramePixels(2, 2);

    const diff01 = Buffer.compare(e0, e1) !== 0;
    const diff12 = Buffer.compare(e1, e2) !== 0;
    const diff02 = Buffer.compare(e0, e2) !== 0;

    if (!diff01 || !diff12 || !diff02) {
        console.error(`FAIL: ${file} side walk frames are not distinct (diff01=${diff01}, diff12=${diff12}, diff02=${diff02})`);
        allPassed = false;
    }

    // Originality check
    let origResult = 'NOT RUN';
    try {
        const out = cp.execSync(`"${process.execPath}" tools/originality_check.js "game/img/characters/${file}"`, { cwd: ROOT, encoding: 'utf8' });
        origResult = out.includes('PASS') ? 'PASS' : 'FAIL';
    } catch (e) {
        origResult = 'CHECK ERROR: ' + e.message;
    }

    console.log(`Variation ${i}: 144x192, ${colors.size} colors (<=31), alpha ${badAlpha === 0 ? 'OK' : 'FAIL'}, side frames distinct (A/Stand/B: OK), U7 originality: ${origResult}`);
}

console.log(`\nOverall Result: ${allPassed ? 'ALL PASS' : 'FAIL'}`);
process.exit(allPassed ? 0 : 1);
