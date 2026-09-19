"use strict";
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const NODE = process.execPath;

const charsets = [
    '!$UF_Door_Wood.png',
    '!$UF_Door_Stone.png',
    '!$UF_Bowyer_Bench.png',
    '!$UF_Fletcher_Bench.png',
    '!$UF_Tanning_Rack.png',
    '!$UF_Weapon_Rack.png',
    '!$UF_Well.png',
    '!$UF_FarmPlot.png',
    '!$UF_Bridge.png'
];

const faceSets = [
    'UF_Faces_Flora_Ex.png',
    'UF_Faces_Landmarks.png'
];

let failed = 0;
let passed = 0;

console.log('=== Verifying Batch 6 Character Sheets (art_check & originality_check) ===');
for (const file of charsets) {
    const fullPath = path.join(ROOT, 'game', 'img', 'characters', file);
    if (!fs.existsSync(fullPath)) {
        console.error(`MISSING: ${fullPath}`);
        failed++;
        continue;
    }
    try {
        const artOut = execSync(`"${NODE}" tools/art_check.js "${fullPath}"`, { encoding: 'utf8' });
        console.log(`[PASS art_check] ${file}`);
        passed++;
    } catch (err) {
        console.error(`[FAIL art_check] ${file}:\n`, err.stdout || err.message);
        failed++;
    }

    try {
        const origOut = execSync(`"${NODE}" tools/originality_check.js "${fullPath}"`, { encoding: 'utf8' });
        console.log(`[PASS originality_check] ${file}`);
        passed++;
    } catch (err) {
        console.error(`[FAIL originality_check] ${file}:\n`, err.stdout || err.message);
        failed++;
    }
}

console.log('\n=== Verifying Batch 6 Face Sets (art_check & originality_check) ===');
for (const file of faceSets) {
    const fullPath = path.join(ROOT, 'game', 'img', 'faces', file);
    if (!fs.existsSync(fullPath)) {
        console.error(`MISSING: ${fullPath}`);
        failed++;
        continue;
    }
    try {
        const artOut = execSync(`"${NODE}" tools/art_check.js "${fullPath}"`, { encoding: 'utf8' });
        console.log(`[PASS art_check] ${file}`);
        passed++;
    } catch (err) {
        console.error(`[FAIL art_check] ${file}:\n`, err.stdout || err.message);
        failed++;
    }

    try {
        const origOut = execSync(`"${NODE}" tools/originality_check.js "${fullPath}"`, { encoding: 'utf8' });
        console.log(`[PASS originality_check] ${file}`);
        passed++;
    } catch (err) {
        console.error(`[FAIL originality_check] ${file}:\n`, err.stdout || err.message);
        failed++;
    }
}

console.log(`\nVerification Summary: ${passed} PASS, ${failed} FAIL`);
if (failed > 0) process.exit(1);
