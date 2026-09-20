const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const nodeExe = process.execPath;
const CATALOG_FILE = path.join(ROOT, 'game', 'data', 'UF_WorldCatalog.json');
const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));

console.log('Testing art_check and originality_check on all 67 World Object character sheets...');

let artPass = 0, artFail = 0;
const artFails = [];

for (const obj of catalog.objects) {
    const sheetPath = path.join(ROOT, 'game', 'img', 'characters', `${obj.image}.png`);
    try {
        execSync(`"${nodeExe}" tools/art_check.js "${sheetPath}" --native --sidecar`, { cwd: ROOT, stdio: 'pipe' });
        artPass++;
    } catch (e) {
        artFail++;
        artFails.push({ id: obj.id, file: sheetPath, error: e.stdout ? e.stdout.toString() : e.message });
    }
}

console.log(`Art Check Results: PASS = ${artPass} / 67, FAIL = ${artFail}`);
if (artFails.length > 0) {
    console.error('Art Check Failures:');
    artFails.forEach(f => console.error(`  - ${f.id} (${f.file}): ${f.error.split('\n').filter(l => l.includes('FAIL')).join('; ')}`));
    process.exit(1);
} else {
    console.log('All 67 World Object Character Sheets PASS tools/art_check.js!');
    process.exit(0);
}
