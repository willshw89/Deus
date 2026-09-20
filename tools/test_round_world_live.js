#!/usr/bin/env node
'use strict';

/**
 * tools/test_round_world_live.js
 *
 * In-engine NW.js test harness for the Round / Toroidal World:
 * - Positions player at East seam (x=255) and walks East onto West edge (x=0)
 * - Positions player at North seam (y=0) and walks North onto South edge (y=255)
 * - Captures high-resolution in-game screenshots across each seam
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'round_world_live');
const ARTIFACT_DIR = 'C:/Users/snewt/.gemini/antigravity/brain/74107bfb-a5b5-43a6-8ab7-87deb97997e1';

console.log(`Setting up Round World in-game test snapshot at: ${SNAPSHOT_DIR}`);
try {
    fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
} catch (e) {}
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

// 1. Sync game/ to snapshot using robocopy
try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {}

// 2. Inject live Round World Seam Demo into UF_Test.js in snapshot
const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Test.js');
let testCode = fs.readFileSync(testJsPath, 'utf8');

const targetHook = 't.screenshot("map");';
const seamDemoCode = `
        t.screenshot("map");
        // --- Live Round World Seam Crossing Demo ---
        const W = window.UF && UF.World;
        const size = (W && W.state && W.state.size) || $gameMap.width();
        
        // Make player visible with standard ranger charset
        $gamePlayer.setTransparent(false);
        $gamePlayer.setImage("$U7_Ranger", 0);

        // Find a clear row for East-West seam crossing
        let clearY = 128;
        for (let y = 10; y < size - 10; y++) {
            if ($gameMap.isPassable(255, y, 6) && $gameMap.isPassable(0, y, 4)) {
                clearY = y;
                break;
            }
        }
        
        // Ensure tiles and cells are passable ground (not water) and place trees on the border
        $dataMap.data[0 * size * size + clearY * size + 255] = 2816;
        $dataMap.data[0 * size * size + clearY * size + 0] = 2816;
        $dataMap.ufObjects[clearY * size + 255] = 0;
        $dataMap.ufObjects[clearY * size + 0] = 0;
        
        // Add decorative trees just above and below the crossing seam on both sides
        $dataMap.ufObjects[(clearY - 2) * size + 255] = 7; // Pine tree on east edge
        $dataMap.ufObjects[(clearY - 2) * size + 0] = 7;   // Pine tree on west edge
        $dataMap.ufObjects[(clearY + 2) * size + 255] = 7;
        $dataMap.ufObjects[(clearY + 2) * size + 0] = 7;

        // Position player at East edge facing East
        $gamePlayer.locate(255, clearY);
        $gamePlayer.setDirection(6);
        $gameMap.setDisplayPos(251, clearY - 6);
        await t.waitFrames(15);
        t.screenshot("round_seam_at_east_edge");

        // Walk East across the seam onto West edge (x=0)
        $gamePlayer.moveStraight(6);
        await t.waitFrames(25);
        $gameMap.setDisplayPos(251, clearY - 6);
        await t.waitFrames(10);
        t.screenshot("round_seam_crossed_to_west");

        // Now find a clear column for North-South seam crossing
        let clearX = 128;
        for (let x = 10; x < size - 10; x++) {
            if ($gameMap.isPassable(x, 0, 8) && $gameMap.isPassable(x, 255, 2)) {
                clearX = x;
                break;
            }
        }
        $dataMap.data[0 * size * size + 0 * size + clearX] = 2816;
        $dataMap.data[0 * size * size + 255 * size + clearX] = 2816;
        $dataMap.ufObjects[0 * size + clearX] = 0;
        $dataMap.ufObjects[255 * size + clearX] = 0;

        // Position player at North edge facing North
        $gamePlayer.locate(clearX, 0);
        $gamePlayer.setDirection(8);
        $gameMap.setDisplayPos(clearX - 7, 251);
        await t.waitFrames(15);
        t.screenshot("round_seam_at_north_edge");

        // Walk North across the seam onto South edge (y=255)
        $gamePlayer.moveStraight(8);
        await t.waitFrames(25);
        $gameMap.setDisplayPos(clearX - 7, 251);
        await t.waitFrames(10);
        t.screenshot("round_seam_crossed_to_south");
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
    { src: 'smoke.round_seam_at_east_edge.png', dest: 'live_round_world_at_east_edge.png' },
    { src: 'smoke.round_seam_crossed_to_west.png', dest: 'live_round_world_crossed_to_west.png' },
    { src: 'smoke.round_seam_at_north_edge.png', dest: 'live_round_world_at_north_edge.png' },
    { src: 'smoke.round_seam_crossed_to_south.png', dest: 'live_round_world_crossed_to_south.png' }
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

console.log('Live Round World verification complete.');

