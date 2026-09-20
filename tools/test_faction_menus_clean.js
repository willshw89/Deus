'use strict';
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TEST_OUT = path.join(ROOT, 'game', 'test_output');
const REVIEW_OUT = path.join(ROOT, 'art', 'review', 'menus');

fs.mkdirSync(REVIEW_OUT, { recursive: true });

console.log('Running faction_menus test suite...');
try {
    const out = childProcess.execSync(`"${process.execPath}" tools/run_tests.js faction_menus`, {
        cwd: ROOT,
        encoding: 'utf8'
    });
    console.log(out);
} catch (err) {
    console.log(err.stdout || err.message);
}

// Copy screenshots immediately before another test wipes them
const files = fs.readdirSync(TEST_OUT);
for (const f of files) {
    if (f.startsWith('faction_menus.') && f.endsWith('.png')) {
        const src = path.join(TEST_OUT, f);
        const dst = path.join(REVIEW_OUT, f);
        fs.copyFileSync(src, dst);
        console.log(`Preserved ${f} -> art/review/menus/${f}`);
    }
}
console.log('Done!');
