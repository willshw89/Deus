'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { decodePNG } = require('../../../tools/png_read');

const DIR = __dirname;
const BOARD_PNG = path.join(DIR, 'meadow_set0_a2_board.png');
const MANIFEST_MD = path.join(DIR, 'manifest.md');

function runTest() {
    let passed = 0;
    let failed = 0;

    function assert(cond, msg) {
        if (cond) {
            passed++;
            console.log(`PASS: ${msg}`);
        } else {
            failed++;
            console.error(`FAIL: ${msg}`);
        }
    }

    console.log('Testing Set 0 Meadow A2 Review Board...');

    // Mutant hook
    if (process.env.MUTANT_BOARD_FAIL) {
        assert(false, 'Injected mutant failure triggered');
        process.exit(1);
    }

    // 1. Board PNG exists and is non-empty
    assert(fs.existsSync(BOARD_PNG), 'meadow_set0_a2_board.png exists');
    const stat = fs.statSync(BOARD_PNG);
    assert(stat.size > 1000, `Board PNG size > 1KB (got ${stat.size} bytes)`);

    // 2. Board PNG decodes cleanly and has correct dimensions
    const buf = fs.readFileSync(BOARD_PNG);
    const png = decodePNG(buf, 'meadow_set0_a2_board.png');
    assert(png.width === 540, `Board width is 540 px (got ${png.width})`);
    assert(png.height === 430, `Board height is 430 px (got ${png.height})`);

    // 3. Manifest exists and documents all 6 variants
    assert(fs.existsSync(MANIFEST_MD), 'manifest.md exists');
    const manifestText = fs.readFileSync(MANIFEST_MD, 'utf8');
    for (let i = 0; i <= 5; i++) {
        assert(manifestText.includes(`variant_${i}.png`), `manifest documents variant_${i}.png`);
    }

    // 4. Board SHA256 in manifest matches disk SHA256
    const boardSha = crypto.createHash('sha256').update(buf).digest('hex');
    assert(manifestText.includes(boardSha), `manifest records accurate board sha256 ${boardSha}`);

    console.log(`Results: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
        process.exit(1);
    }
}

runTest();
