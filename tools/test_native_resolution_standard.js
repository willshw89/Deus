/**
 * tools/test_native_resolution_standard.js
 *
 * Automated verification suite for DEUS-ART-NATIVE-01:
 * "DW.01.02 — Freeze native-resolution / pixel-density standard".
 *
 * Covers the 7 required test fixtures:
 * - Fixture A: Native 48x48 original DEUS tile passes.
 * - Fixture B: Native ~84 px multi-tile tree source passes its metadata dimensions.
 * - Fixture C: Legacy U7 16->48 stand-in passes legacy mode, fails forced native.
 * - Fixture D: Legacy 3x block art incorrectly submitted as native DEUS fails with clear error.
 * - Fixture E: Wrong-size native asset fails.
 * - Fixture F: Smoothed/resampled non-binary alpha fixture fails.
 * - Fixture G: Original native art does not require every 3x3 block to match (1-pixel variations pass cleanly).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { writePNG } = require('./png_util');
const { checkFile } = require('./art_check');

const TEST_DIR = path.join(os.tmpdir(), `deus_test_native_standard_${Date.now()}`);
fs.mkdirSync(TEST_DIR, { recursive: true });

function setPixel(buf, w, x, y, r, g, b, a = 255) {
    const idx = (y * w + x) * 4;
    buf[idx] = r;
    buf[idx + 1] = g;
    buf[idx + 2] = b;
    buf[idx + 3] = a;
}

function fill3xBlock(buf, w, bx, by, r, g, b, a = 255) {
    for (let dy = 0; dy < 3; dy++) {
        for (let dx = 0; dx < 3; dx++) {
            setPixel(buf, w, bx * 3 + dx, by * 3 + dy, r, g, b, a);
        }
    }
}

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
    totalTests++;
    if (!condition) {
        console.error(`FAIL: ${message}`);
        return false;
    } else {
        console.log(`PASS: ${message}`);
        passedTests++;
        return true;
    }
}

console.log('=== DEUS NATIVE RESOLUTION STANDARD TEST SUITE (DW.01.02) ===\n');

// -----------------------------------------------------------------------------
// FIXTURE A: Native 48x48 original DEUS tile passes.
// -----------------------------------------------------------------------------
console.log('--- Fixture A: Native 48x48 original DEUS tile ---');
{
    const w = 48, h = 48;
    const buf = Buffer.alloc(w * h * 4, 0);
    // Authentic 1:1 pixel art pattern with subtle 1px dither
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const isAlt = (x + y) % 2 === 0;
            setPixel(buf, w, x, y, isAlt ? 40 : 45, isAlt ? 80 : 85, isAlt ? 30 : 35, 255);
        }
    }
    const fileA = path.join(TEST_DIR, 'FixtureA_Tile_48x48.png');
    writePNG(fileA, w, h, buf);

    const reportA = checkFile(fileA, { type: 'tileset' });
    const gridCheck = reportA.checks.find(c => c.name === 'grid');
    const sizeCheck = reportA.checks.find(c => c.name === 'size');
    const alphaCheck = reportA.checks.find(c => c.name === 'alpha');

    assert(reportA.status === 'PASS', 'Fixture A overall status is PASS');
    assert(gridCheck && gridCheck.status === 'PASS', 'Fixture A passes native grid check');
    assert(sizeCheck && sizeCheck.status === 'PASS', 'Fixture A passes tile size check');
    assert(alphaCheck && alphaCheck.status === 'PASS', 'Fixture A passes binary alpha check');
}

// -----------------------------------------------------------------------------
// FIXTURE B: Native ~84 px multi-tile tree source passes its metadata dimensions.
// -----------------------------------------------------------------------------
console.log('\n--- Fixture B: Native 84x84 multi-tile tree source ---');
{
    const w = 84, h = 84;
    const buf = Buffer.alloc(w * h * 4, 0);
    // Fine 1:1 pixel trunk and foliage
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (y > 40 && x >= 36 && x <= 48) {
                // Trunk: 1px bark grain
                setPixel(buf, w, x, y, (x % 2 === 0) ? 90 : 75, 55, 30, 255);
            } else if (y <= 50 && (Math.hypot(x - 42, y - 30) < 32)) {
                // Foliage canopy: 1px leaf dither
                const d = (x * 3 + y * 7) % 3;
                setPixel(buf, w, x, y, 35 + d * 10, 80 + d * 15, 30, 255);
            }
        }
    }
    const fileB = path.join(TEST_DIR, '!$FixtureB_Oak_84x84.png');
    writePNG(fileB, w, h, buf);

    const sidecarB = {
        id: 'DEUS_TREE_OAK_84',
        pixelDensityMode: 'NATIVE_1_TO_1',
        alphaMode: 'BINARY_0_255',
        frameWidth: 84,
        frameHeight: 84,
        anchor: [42, 83],
        footprint: [2, 1],
        facings: ['S'],
        animations: { stand: [0] },
        intendedNativeWidth: 84,
        intendedNativeHeight: 84
    };
    fs.writeFileSync(path.join(TEST_DIR, '!$FixtureB_Oak_84x84.json'), JSON.stringify(sidecarB, null, 2));

    const reportB = checkFile(fileB, { sidecar: true });
    const sizeCheck = reportB.checks.find(c => c.name === 'size');
    const gridCheck = reportB.checks.find(c => c.name === 'grid');
    const sidecarCheck = reportB.checks.find(c => c.name === 'sidecar');

    assert(reportB.status === 'PASS', 'Fixture B overall status is PASS');
    assert(sizeCheck && sizeCheck.status === 'PASS' && sizeCheck.detail.includes('84x84'), 'Fixture B size check verifies intendedNativeWidth/Height');
    assert(gridCheck && gridCheck.status === 'PASS', 'Fixture B grid check passes for multi-tile dimensions');
    assert(sidecarCheck && sidecarCheck.status === 'PASS', 'Fixture B sidecar schema passes');
}

// -----------------------------------------------------------------------------
// FIXTURE C: Legacy U7 16->48 stand-in passes legacy mode, fails forced native.
// -----------------------------------------------------------------------------
console.log('\n--- Fixture C: Legacy U7 16->48 stand-in ---');
{
    const w = 48, h = 48;
    const buf = Buffer.alloc(w * h * 4, 0);
    // Legacy 3x3 uniform blocks (16px scaled 3x)
    for (let by = 0; by < 16; by++) {
        for (let bx = 0; bx < 16; bx++) {
            if (by >= 4 && by <= 14 && bx >= 4 && bx <= 12) {
                fill3xBlock(buf, w, bx, by, 100, 60, 40, 255);
            }
        }
    }
    const fileC = path.join(TEST_DIR, '$U7_FixtureC_StandIn.png');
    writePNG(fileC, w, h, buf);

    // 1. Check in legacy mode (by default because of $U7_ prefix)
    const reportCLegacy = checkFile(fileC, { legacy3x: true });
    const gridCheckLegacy = reportCLegacy.checks.find(c => c.name === 'grid');
    assert(gridCheckLegacy && gridCheckLegacy.status === 'PASS', 'Fixture C passes in legacy mode (--legacy-3x)');

    // 2. Check in forced native mode (--native): must fail anti-fraud block detection!
    const reportCNative = checkFile(fileC, { native: true });
    const gridCheckNative = reportCNative.checks.find(c => c.name === 'grid');
    assert(gridCheckNative && gridCheckNative.status === 'FAIL', 'Fixture C fails when checked in native mode');
    assert(gridCheckNative && gridCheckNative.detail.includes('prohibited legacy 3x block art'), 'Fixture C error explains 16px enlarged 3x rejection');
}

// -----------------------------------------------------------------------------
// FIXTURE D: Legacy 3x block art disguised as native DEUS art fails.
// -----------------------------------------------------------------------------
console.log('\n--- Fixture D: Disguised 3x block art submitted as native DEUS art ---');
{
    const w = 48, h = 48;
    const buf = Buffer.alloc(w * h * 4, 0);
    // Pure 3x3 solid blocks, but named without U7_ prefix
    for (let by = 0; by < 16; by++) {
        for (let bx = 0; bx < 16; bx++) {
            if (by >= 2 && by <= 14 && bx >= 4 && bx <= 12) {
                fill3xBlock(buf, w, bx, by, 30, 90, 160, 255);
            }
        }
    }
    const fileD = path.join(TEST_DIR, 'FixtureD_Disguised3x.png');
    writePNG(fileD, w, h, buf);

    const reportD = checkFile(fileD, {});
    const gridCheckD = reportD.checks.find(c => c.name === 'grid');
    assert(reportD.status === 'FAIL', 'Fixture D overall status is FAIL');
    assert(gridCheckD && gridCheckD.status === 'FAIL', 'Fixture D fails anti-fraud check');
    assert(gridCheckD && gridCheckD.detail.includes('prohibited legacy 3x block art'), 'Fixture D rejects 100% 3x3 solid blocks with clear message');
}

// -----------------------------------------------------------------------------
// FIXTURE E: Wrong-size native asset fails.
// -----------------------------------------------------------------------------
console.log('\n--- Fixture E: Wrong-size native asset ---');
{
    const w = 50, h = 50; // Not a multiple of 48, no sidecar metadata dimensions
    const buf = Buffer.alloc(w * h * 4, 0);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            setPixel(buf, w, x, y, 80, 80, 80, 255);
        }
    }
    const fileE = path.join(TEST_DIR, 'FixtureE_WrongSize_50x50.png');
    writePNG(fileE, w, h, buf);

    const reportE = checkFile(fileE, {});
    const sizeCheckE = reportE.checks.find(c => c.name === 'size');
    const gridCheckE = reportE.checks.find(c => c.name === 'grid');

    assert(reportE.status === 'FAIL', 'Fixture E overall status is FAIL');
    assert(sizeCheckE && sizeCheckE.status === 'FAIL', 'Fixture E fails size check (not multiple of 48)');
    assert(gridCheckE && gridCheckE.status === 'FAIL', 'Fixture E fails grid check');
}

// -----------------------------------------------------------------------------
// FIXTURE F: Smoothed / resampled non-binary alpha fixture fails.
// -----------------------------------------------------------------------------
console.log('\n--- Fixture F: Smoothed/resampled non-binary alpha fixture ---');
{
    const w = 48, h = 48;
    const buf = Buffer.alloc(w * h * 4, 0);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const isAlt = (x + y) % 2 === 0;
            // Introduce semi-transparent antialiasing pixel
            const alpha = (x === 10 && y === 10) ? 128 : (x < 30 ? 255 : 0);
            setPixel(buf, w, x, y, isAlt ? 60 : 70, 60, 60, alpha);
        }
    }
    const fileF = path.join(TEST_DIR, 'FixtureF_BilinearAlpha.png');
    writePNG(fileF, w, h, buf);

    const reportF = checkFile(fileF, {});
    const alphaCheckF = reportF.checks.find(c => c.name === 'alpha');

    assert(reportF.status === 'FAIL', 'Fixture F overall status is FAIL');
    assert(alphaCheckF && alphaCheckF.status === 'FAIL', 'Fixture F fails binary alpha check');
    assert(alphaCheckF && alphaCheckF.detail.includes('alpha between 1 and 254'), 'Fixture F reports offending semi-transparent pixel');
}

// -----------------------------------------------------------------------------
// FIXTURE G: Original native art does not require every 3x3 block to match.
// -----------------------------------------------------------------------------
console.log('\n--- Fixture G: Original native art with 1-pixel variations ---');
{
    const w = 48, h = 48;
    const buf = Buffer.alloc(w * h * 4, 0);
    // Draw a character-sized boulder or icon with 1-pixel detail, highlights, and contour
    for (let y = 10; y < 40; y++) {
        for (let x = 10; x < 38; x++) {
            // Contour
            if (x === 10 || x === 37 || y === 10 || y === 39) {
                setPixel(buf, w, x, y, 20, 20, 25, 255);
            } else if (x === 12 && y === 12) {
                // 1-pixel bright specular highlight
                setPixel(buf, w, x, y, 240, 240, 255, 255);
            } else {
                // Dithered stone surface
                const c = ((x * 13 + y * 7) % 5 === 0) ? 110 : 95;
                setPixel(buf, w, x, y, c, c, c + 5, 255);
            }
        }
    }
    const fileG = path.join(TEST_DIR, 'FixtureG_NativeVariations.png');
    writePNG(fileG, w, h, buf);

    const reportG = checkFile(fileG, {});
    const gridCheckG = reportG.checks.find(c => c.name === 'grid');
    const alphaCheckG = reportG.checks.find(c => c.name === 'alpha');

    assert(reportG.status === 'PASS', 'Fixture G overall status is PASS');
    assert(gridCheckG && gridCheckG.status === 'PASS', 'Fixture G passes: 1-pixel variations do NOT trigger legacy block failure');
    assert(alphaCheckG && alphaCheckG.status === 'PASS', 'Fixture G passes binary alpha');
}

// Clean up test temp dir
try {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
} catch (e) {
    // Ignore cleanup error in temp
}

console.log(`\n==================================================`);
console.log(`TOTAL CHECKS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${totalTests - passedTests}`);
console.log(`==================================================\n`);

if (passedTests === totalTests) {
    console.log('ALL FIXTURES A-G PASSED: Native resolution standard verified.');
    process.exit(0);
} else {
    console.error('VERIFICATION FAILED.');
    process.exit(1);
}
