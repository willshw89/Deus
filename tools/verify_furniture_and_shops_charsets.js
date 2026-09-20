'use strict';

const fs = require('fs');
const path = require('path');
const { readPNG } = require('./png_read');

const ROOT = path.resolve(__dirname, '..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');
const CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters');

const PROPS = [
    'Bed_Wood',
    'Chest_Wood',
    'Dining_Table',
    'Dining_Bench',
    'Kitchen_Counter',
    'Kitchen_Pantry',
    'Kitchen_Hearth',
    'Shop_Counter',
    'Apothecary_Bench'
];

function loadPaletteSet() {
    const text = fs.readFileSync(PALETTE_FILE, 'utf8');
    const set = new Set();
    for (const line of text.split(/\r?\n/)) {
        const s = line.trim().replace(/^#/, '');
        if (s.length === 6) set.add(parseInt(s, 16));
    }
    return set;
}

const palSet = loadPaletteSet();

let passCount = 0;
let failCount = 0;

console.log('=== Verifying Domestic Furniture, Kitchen, and Shop Character Sets ===\n');

for (const prop of PROPS) {
    const pngPath = path.join(CHAR_DIR, `!$UF_${prop}.png`);
    const jsonPath = path.join(CHAR_DIR, `!$UF_${prop}.json`);

    if (!fs.existsSync(pngPath)) {
        console.error(`FAIL: Missing PNG: ${pngPath}`);
        failCount++;
        continue;
    }
    if (!fs.existsSync(jsonPath)) {
        console.error(`FAIL: Missing JSON sidecar: ${jsonPath}`);
        failCount++;
        continue;
    }

    const img = readPNG(pngPath);
    if (img.width !== 144 || img.height !== 192) {
        console.error(`FAIL: ${prop} dimensions ${img.width}x${img.height} (expected 144x192)`);
        failCount++;
        continue;
    }

    const { data } = img;
    const opaqueColors = new Set();
    let semiTransparent = 0;
    let outOfPalette = 0;

    for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a === 0) continue;
        if (a !== 255) semiTransparent++;
        const hex = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
        opaqueColors.add(hex);
        if (!palSet.has(hex)) outOfPalette++;
    }

    if (semiTransparent > 0) {
        console.error(`FAIL: ${prop} has ${semiTransparent} semi-transparent pixels (must be binary alpha)`);
        failCount++;
        continue;
    }

    if (opaqueColors.size > 32) {
        console.error(`FAIL: ${prop} has ${opaqueColors.size} colors (max 32 allowed)`);
        failCount++;
        continue;
    }

    if (outOfPalette > 0) {
        console.error(`FAIL: ${prop} has ${outOfPalette} pixels not in uf.hex`);
        failCount++;
        continue;
    }

    console.log(`PASS: !$UF_${prop} (144x192, ${opaqueColors.size} colors <= 32, binary alpha, 100% uf.hex)`);
    passCount++;
}

console.log(`\n=== Verification Summary: ${passCount} passed, ${failCount} failed ===`);
if (failCount > 0) process.exit(1);
