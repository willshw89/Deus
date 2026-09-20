'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { decodePNG } = require('./png_read');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');
const actions = ['Walk', 'Haul', 'Attack', 'Bow', 'Magic', 'Work', 'Downed'];

console.log('=== Checking Adult Male Human Variation 2 Suite ===\n');

let allPass = true;
for (const a of actions) {
    const file = `$UF_Human_Male_2_${a}.png`;
    const sidecar = `$UF_Human_Male_2_${a}.json`;
    const p = path.join(CHAR_DIR, file);
    const sp = path.join(CHAR_DIR, sidecar);

    if (!fs.existsSync(p) || !fs.existsSync(sp)) {
        console.error(`FAIL: Missing ${file} or ${sidecar}`);
        allPass = false;
        continue;
    }

    const d = decodePNG(fs.readFileSync(p));
    const colors = new Set();
    let badAlpha = 0;
    for (let i = 0; i < d.data.length; i += 4) {
        const alpha = d.data[i + 3];
        if (alpha !== 0 && alpha !== 255) badAlpha++;
        if (alpha > 0) colors.add((d.data[i] << 16) | (d.data[i + 1] << 8) | d.data[i + 2]);
    }

    let orig = 'PASS';
    try {
        const out = cp.execSync(`"${process.execPath}" tools/originality_check.js "game/img/characters/${file}"`, { cwd: ROOT, encoding: 'utf8' });
        orig = out.includes('PASS') ? 'PASS' : 'FAIL';
    } catch (e) {
        orig = 'FAIL';
    }

    console.log(`${a.padEnd(8)}: ${d.width}x${d.height}, ${colors.size} colors (<=31), alpha ${badAlpha === 0 ? 'OK' : 'FAIL'}, U7 Orig: ${orig}`);
    if (d.width !== 144 || d.height !== 192 || colors.size > 31 || badAlpha > 0 || orig !== 'PASS') {
        allPass = false;
    }
}

console.log(`\nResult: ${allPass ? 'ALL PASS (7/7)' : 'FAIL'}`);
process.exit(allPass ? 0 : 1);

