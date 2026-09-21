#!/usr/bin/env node
'use strict';

/**
 * tools/test_fog_z_level_live.js
 *
 * In-engine NW.js automated verification for:
 * 1. Starting Camp Floor: No floor pre-laid around the campfire at game start.
 * 2. Fog of War Z-Level Isolation: Fog clearance is limited strictly to the current Z level.
 *    - Ground observers (colonists, campfires, settlement site) do not clear Upper (z=+1) or Cave (z=-1).
 *    - Switching Z level switches explored fog buffers.
 *    - Captures in-engine screenshots of Ground (z=0), Upper (z=1), and Cave (z=-1).
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'fog_z_level_live');
const ARTIFACT_DIR = 'C:/Users/snewt/.gemini/antigravity/brain/74107bfb-a5b5-43a6-8ab7-87deb97997e1';

const mutant = (process.argv.find(a => a.startsWith('--mutant=')) || '').slice(9);

console.log(`Setting up Fog Z-Level in-engine test snapshot at: ${SNAPSHOT_DIR}`);
try {
    fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
} catch (e) {}
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

// 1. Sync game/ to snapshot using robocopy
try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {}

// 2. Inject Fog Z-Level test into UF_Test.js in snapshot
const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Test.js');
let testCode = fs.readFileSync(testJsPath, 'utf8');

const targetHook = 't.screenshot("map");';
const zFogTestCode = `
        t.screenshot("map");
        // --- Live Fog Z-Level & Starting Floor Verification ---
        const W = window.UF && UF.World;
        const L = window.UF && UF.Levels;
        const F = window.UF && UF.Floors;
        const H = window.UF && UF.Households;
        const Fog = window.UF && UF.Fog;
        const col = window.UF && UF.Colonists && UF.Colonists.state && UF.Colonists.state();
        const site = col ? col.site : { x: 128, y: 128 };
        const groundArea = W.viewLevel();

        // 1. Assertion: No starting floor around the campfire on ground
        let floorTilesFound = 0;
        if (F && typeof F.getFloor === "function") {
            for (let dy = -3; dy <= 3; dy++) {
                for (let dx = -3; dx <= 3; dx++) {
                    const fl = F.getFloor(groundArea, site.x + dx, site.y + dy);
                    if (fl !== null && fl !== undefined && fl !== 0) floorTilesFound++;
                }
            }
        }
        const noStartFloor = ${mutant === 'has_start_floor' ? 'false' : 'floorTilesFound === 0'};
        t.check("no_starting_floor_around_campfire", noStartFloor,
            \`Starting camp floor check: \${floorTilesFound} floor tiles found in 7x7 area around campfire at (\${site.x},\${site.y}) (want 0)\`);

        // 2. Assertion: Ground (z=0) has active fog clearance
        const groundObs = Fog.observers();
        const groundExploredCount = Fog.exploredCount(0);
        t.check("ground_fog_active", groundObs.length >= 2 && groundExploredCount > 0,
            \`Ground (z=0) fog: \${groundObs.length} observers, \${groundExploredCount} explored cells\`);

        // Screenshot of Ground Level at start camp
        $gamePlayer.locate(site.x, site.y);
        if (window.UF && UF.Camera) UF.Camera.setLevel(0);
        await t.waitFrames(15);
        t.screenshot("live_ground_start_camp_no_floor");

        // 3. Switch to Level +1 (Upper Deck / Roof plane)
        if (L && typeof L.setView === "function") {
            L.setView(1);
            await t.waitUntil(() => W.viewLevel() && W.viewLevel().z === 1 && !SceneManager._scene._isTransferring, 10000, "view switch to Z=1");
            await t.waitFrames(15);
            Fog.refresh();

            const upperObs = Fog.observers();
            const upperExploredCount = ${mutant === 'leak_z' ? '999' : 'Fog.exploredCount(1)'};
            t.check("upper_level_fog_isolated", upperObs.length === 0 && upperExploredCount === 0,
                \`Upper level (z=+1) fog isolation: \${upperObs.length} observers (want 0), \${upperExploredCount} explored cells (want 0)\`);

            // Screenshot of Level +1 (pitch black fog covering unvisited roof level)
            t.screenshot("live_upper_deck_fog_isolated");

            // 4. Switch to Level -1 (Subterranean / Cave plane)
            L.setView(-1);
            await t.waitUntil(() => W.viewLevel() && W.viewLevel().z === -1 && !SceneManager._scene._isTransferring, 10000, "view switch to Z=-1");
            await t.waitFrames(15);
            Fog.refresh();

            const caveObs = Fog.observers();
            const caveExploredCount = Fog.exploredCount(-1);
            t.check("cave_level_fog_isolated", caveObs.length === 0 && caveExploredCount === 0,
                \`Cave level (z=-1) fog isolation: \${caveObs.length} observers (want 0), \${caveExploredCount} explored cells (want 0)\`);

            // Screenshot of Level -1 (cave level covered in fog)
            t.screenshot("live_cave_level_fog_isolated");

            // 5. Switch back to Ground (z=0)
            L.setView(0);
            await t.waitUntil(() => W.viewLevel() && W.viewLevel().z === 0 && !SceneManager._scene._isTransferring, 10000, "view switch to Z=0");
            await t.waitFrames(15);
            Fog.refresh();

            const restoredGroundCount = Fog.exploredCount(0);
            t.check("ground_fog_restored", restoredGroundCount >= groundExploredCount,
                \`Ground fog restoration: restored=\${restoredGroundCount}, original=\${groundExploredCount}\`);
        }
`;

testCode = testCode.replace(targetHook, zFogTestCode);
fs.writeFileSync(testJsPath, testCode, 'utf8');

// 3. Run NW.js headless using run_tests.js harness
console.log('Launching NW.js test harness...');
const nodePath = process.execPath;
const runTestsScript = path.join(ROOT, 'tools', 'run_tests.js');

try {
    const output = childProcess.execSync(`"${nodePath}" "${runTestsScript}" smoke --game "${SNAPSHOT_DIR}"`, {
        cwd: SNAPSHOT_DIR,
        encoding: 'utf8',
        timeout: 90000
    });
    console.log(output);

    // 4. Copy screenshots to artifact directory
    const testOutDir = path.join(SNAPSHOT_DIR, 'test_output');
    const screenshots = [
        'smoke.live_ground_start_camp_no_floor.png',
        'smoke.live_upper_deck_fog_isolated.png',
        'smoke.live_cave_level_fog_isolated.png'
    ];

    for (const shot of screenshots) {
        const src = path.join(testOutDir, shot);
        const dest = path.join(ARTIFACT_DIR, shot.replace('smoke.', ''));
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
            console.log(`Copied screenshot to artifact: ${dest}`);
        } else {
            console.warn(`Screenshot not found: ${src}`);
        }
    }

    console.log('All Fog Z-Level tests PASSED.');
    process.exit(0);
} catch (err) {
    console.error('Test run failed:');
    if (err.stdout) console.log(err.stdout);
    if (err.stderr) console.error(err.stderr);
    process.exit(1);
}
