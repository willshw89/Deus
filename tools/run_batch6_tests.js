"use strict";
const { execSync } = require('child_process');

const suites = ['ground', 'worldgen', 'vertical', 'smoke'];
for (const s of suites) {
    console.log(`\n=== Running suite: ${s} ===`);
    try {
        const out = execSync(`"${process.execPath}" tools/run_all_suites.js --suite=${s}`, { encoding: 'utf8' });
        console.log(out);
    } catch (err) {
        console.error(`Suite ${s} failed:\n`, err.stdout || err.message);
        process.exit(1);
    }
}
console.log('=== All 4 suites passed successfully! ===');
