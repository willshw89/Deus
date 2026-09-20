const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const nodeExe = process.execPath;
const CATALOG_FILE = path.join(ROOT, 'game', 'data', 'UF_WorldCatalog.json');
const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));

console.log('Validating all 67 World Object Character Sets & Master Icons...');

let sheetPass = 0, sheetFail = 0;
let iconPass = 0, iconFail = 0;
let origPass = 0, origFail = 0;

for (const obj of catalog.objects) {
    const sheetPath = path.join(ROOT, 'game', 'img', 'characters', `${obj.image}.png`);
    const iconPath = path.join(ROOT, 'art', 'masters', `${obj.id}_icon.png`);

    // 1. Sheet art check
    try {
        execSync(`"${nodeExe}" tools/art_check.js "${sheetPath}" --native --sidecar`, { cwd: ROOT, stdio: 'pipe' });
        sheetPass++;
    } catch (e) {
        sheetFail++;
        console.error(`Sheet Art Check FAIL on ${obj.id} (${sheetPath}):\n${e.stdout ? e.stdout.toString() : e.message}`);
    }

    // 2. Icon art check
    try {
        execSync(`"${nodeExe}" tools/art_check.js "${iconPath}" --native --sidecar --type icon`, { cwd: ROOT, stdio: 'pipe' });
        iconPass++;
    } catch (e) {
        iconFail++;
        console.error(`Icon Art Check FAIL on ${obj.id} (${iconPath}):\n${e.stdout ? e.stdout.toString() : e.message}`);
    }

    // 3. Originality check on sheet
    try {
        execSync(`"${nodeExe}" tools/originality_check.js "${sheetPath}"`, { cwd: ROOT, stdio: 'pipe' });
        origPass++;
    } catch (e) {
        origFail++;
        console.error(`Originality Check FAIL on ${obj.id} (${sheetPath}):\n${e.stdout ? e.stdout.toString() : e.message}`);
    }
}

console.log('====================================================');
console.log(`Character Sheets Art Check:   ${sheetPass}/67 PASS, ${sheetFail} FAIL`);
console.log(`Master Icons Art Check:       ${iconPass}/67 PASS, ${iconFail} FAIL`);
console.log(`Originality Check (vs U7):    ${origPass}/67 PASS, ${origFail} FAIL`);
console.log('====================================================');

if (sheetFail > 0 || iconFail > 0 || origFail > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
