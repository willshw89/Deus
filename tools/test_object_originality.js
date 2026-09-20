const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const nodeExe = process.execPath;
const CATALOG_FILE = path.join(ROOT, 'game', 'data', 'UF_WorldCatalog.json');
const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));

console.log('Testing originality_check on all 67 World Object character sheets (vs 19,431 U7 shapes)...');

let origPass = 0, origFail = 0;
const origFails = [];

for (const obj of catalog.objects) {
    const sheetPath = path.join(ROOT, 'game', 'img', 'characters', `${obj.image}.png`);
    try {
        const out = execSync(`"${nodeExe}" tools/originality_check.js "${sheetPath}"`, { cwd: ROOT, stdio: 'pipe' }).toString();
        origPass++;
    } catch (e) {
        origFail++;
        origFails.push({ id: obj.id, file: sheetPath, error: e.stdout ? e.stdout.toString() : e.message });
    }
}

console.log(`Originality Check Results: PASS = ${origPass} / 67, FAIL = ${origFail}`);
if (origFails.length > 0) {
    console.error('Originality Check Failures:');
    origFails.forEach(f => console.error(`  - ${f.id} (${f.file}): ${f.error.split('\n').filter(l => l.includes('FAIL') || l.includes('WARN')).join('; ')}`));
    process.exit(1);
} else {
    console.log('All 67 World Object Character Sheets PASS tools/originality_check.js!');
    process.exit(0);
}
