#!/usr/bin/env node
'use strict';

/**
 * tools/test_seamless_seam_live.js
 *
 * In-engine NW.js live test harness for seamless map edges:
 * - Boots real NW.js engine with world build
 * - Positions camera centered directly on the North/South toroidal seam (displayY = size - 6)
 * - Directly displays the river and terrain crossing between y = size - 1 and y = 0
 * - Captures high-resolution screenshot matching user's exact camera view
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'seamless_seam_live');
const ARTIFACT_DIR = 'C:/Users/snewt/.gemini/antigravity/brain/28d55bd5-5c9e-48a3-84ae-0a03f62bd3d0';

console.log(`Setting up Seamless Seam in-game test snapshot at: ${SNAPSHOT_DIR}`);
try {
    fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
} catch (e) {}
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

// 1. Sync game/ to snapshot using robocopy
try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {}

// 2. Inject live Seamless Seam Demo into UF_Test.js in snapshot
const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Test.js');
let testCode = fs.readFileSync(testJsPath, 'utf8');

const targetHook = 't.screenshot("map");';
const seamDemoCode = `
        t.screenshot("map");
        // --- Live Seamless Seam View ---
        const W = window.UF && UF.World;
        const WG = window.UF && UF.WorldGen;
        const size = (W && W.state && W.state.size) || $gameMap.width();
        
        // Find a river anchor/center to center the camera on the river crossing the seam
        const rivers = WG ? WG.riverModels(W.state) : [];
        let riverX = Math.floor(size / 2);
        if (rivers.length > 0) {
            riverX = Math.round(rivers[0].center(0));
        }

        // Reveal fog along the seam so the full terrain and river crossing are clearly visible
        if (window.UF && UF.Fog) {
            for (let rx = 0; rx < size; rx += 8) {
                UF.Fog.reveal(rx, 0, 16);
                UF.Fog.reveal(rx, size - 1, 16);
            }
            UF.Fog.refresh();
        }

        // Center camera directly over the North/South seam (Y seam runs right across the screen)
        // With screen height 13 tiles, displayY = size - 6 places the seam (y=size-1 -> y=0) at screen tile 6 (center!)
        const displayX = ((riverX - 8) % size + size) % size;
        const displayY = size - 6;
        $gameMap.setDisplayPos(displayX, displayY);
        await t.waitFrames(30);

        t.screenshot("seamless_river_and_terrain_at_seam");

        // Pan slightly East to show wide landscape alignment across seam
        $gameMap.setDisplayPos(((displayX + 16) % size + size) % size, displayY);
        await t.waitFrames(20);
        t.screenshot("seamless_landscape_across_seam");
`;

testCode = testCode.replace(targetHook, seamDemoCode);
fs.writeFileSync(testJsPath, testCode, 'utf8');

console.log('Running test harness on snapshot...');
const nodePath = process.execPath;
try {
    const out = childProcess.execSync(`"${nodePath}" tools/run_tests.js smoke --game "${SNAPSHOT_DIR}"`, { cwd: ROOT, encoding: 'utf8' });
    console.log(out);
} catch (e) {
    console.error('Smoke harness failed:', e.stdout || e.message);
    process.exit(1);
}

// Copy screenshots to Artifacts directory
const snapOutDir = path.join(SNAPSHOT_DIR, 'test_output');
const shots = [
    { src: 'smoke.seamless_river_and_terrain_at_seam.png', dest: 'live_seamless_river_and_terrain_at_seam.png' },
    { src: 'smoke.seamless_landscape_across_seam.png', dest: 'live_seamless_landscape_across_seam.png' }
];

for (const s of shots) {
    const srcFile = path.join(snapOutDir, s.src);
    const destFile = path.join(ARTIFACT_DIR, s.dest);
    if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, destFile);
        console.log(`Copied ${s.src} -> ${destFile}`);
    } else {
        console.warn(`Missing screenshot: ${srcFile}`);
    }
}

console.log('Live Seamless Seam verification complete.');
