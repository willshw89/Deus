'use strict';

/**
 * tools/test_light_wall_occlusion_live.js
 *
 * Builds a walled room with a campfire inside at night (23:30),
 * captures live in-engine screenshots, and verifies that light
 * is occluded by walls and does not bleed into outside tiles.
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'light_wall_occlusion_test');
const BRAIN_DIR = 'C:/Users/snewt/.gemini/antigravity/brain/e6a9a54f-2cc6-432e-b7ec-5affda42dd85';
const REVIEW_DIR = path.join(ROOT, 'art', 'review');

console.log(`Setting up Light Wall Occlusion Live In-Game test snapshot at: ${SNAPSHOT_DIR}`);
try {
    fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
} catch (e) {}
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

// 1. Sync game/ to snapshot using robocopy
try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {}

// 2. Inject occlusion test into UF_Test.js in snapshot
const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Test.js');
let testCode = fs.readFileSync(testJsPath, 'utf8');

const targetHook = 't.screenshot("map");';
if (!testCode.includes(targetHook)) {
    console.error('Target hook t.screenshot("map") not found in UF_Test.js!');
    process.exit(1);
}

const occlusionTestCode = `
        // --- Live In-Game Wall Light Occlusion Test ---
        const W = window.UF && UF.World;
        const O = window.UF && UF.Objects;
        const curLevel = W && typeof W.levelOfMapId === 'function' ? W.levelOfMapId($gameMap.mapId()) : null;
        const curArea = curLevel ? { x: curLevel.x, y: curLevel.y } : (W && W.currentArea ? W.currentArea() : { x: 0, y: 0 });
        const curZ = curLevel ? curLevel.z : 0;
        const cx = $gamePlayer.x || 15;
        const cy = $gamePlayer.y || 15;

        // Move any units/events away so they don't interfere
        for (const ev of $gameMap.events()) {
            if (ev) ev.locate(cx + 40, cy - 30);
        }

        // Clear a 9x9 area around center
        for (let dy = -4; dy <= 4; dy++) {
            for (let dx = -4; dx <= 4; dx++) {
                if (O && typeof O.setIn === 'function') {
                    O.setIn(curArea, cx + dx, cy + dy, null);
                }
            }
        }

        // Build a 5x5 walled building: perimeter walls at dx = -2..2, dy = -2..2
        // North wall at dy = -2
        // South wall at dy = 2 (leave doorway at dx = 0)
        // West wall at dx = -2
        // East wall at dx = 2
        for (let dx = -2; dx <= 2; dx++) {
            O.setIn(curArea, cx + dx, cy - 2, "wall_stone");
        }
        for (let dy = -1; dy <= 1; dy++) {
            O.setIn(curArea, cx - 2, cy + dy, "wall_stone");
            O.setIn(curArea, cx + 2, cy + dy, "wall_stone");
        }
        // South wall with doorway at dx = 0
        O.setIn(curArea, cx - 2, cy + 2, "wall_stone");
        O.setIn(curArea, cx - 1, cy + 2, "wall_stone");
        O.setIn(curArea, cx + 1, cy + 2, "wall_stone");
        O.setIn(curArea, cx + 2, cy + 2, "wall_stone");
        // Doorway at (cx, cy + 2): closed door initially
        O.setIn(curArea, cx, cy + 2, "door_wood");

        // Place campfire in center of room
        O.setIn(curArea, cx, cy, "campfire");

        // Set time to night
        if (window.$ufTime) {
            $ufTime.setTime(23, 30);
        }

        if (O && typeof O.refresh === 'function') {
            O.refresh();
        }

        // Center player on campfire
        $gamePlayer.locate(cx, cy);

        // Zoom level 1 (2x)
        if (window.UF && UF.Camera && typeof UF.Camera.setLevel === 'function') {
            UF.Camera.setLevel(1);
        }

        await t.waitFrames(15);
        t.screenshot("wall_occlusion_closed_door");

        // Now open the doorway by clearing the door or setting open
        O.setIn(curArea, cx, cy + 2, null);
        if (O && typeof O.refresh === 'function') {
            O.refresh();
        }
        await t.waitFrames(15);
        t.screenshot("wall_occlusion_open_doorway");

        // Verification checks: inspect glow layer bitmap
        const glowLayer = SceneManager._scene && SceneManager._scene._spriteset && SceneManager._scene._spriteset._ufGlowLayer;
        let insideGlowAlpha = 0;
        let northOutsideGlowAlpha = 0;
        let eastOutsideGlowAlpha = 0;
        let westOutsideGlowAlpha = 0;
        let doorwaySpillAlpha = 0;

        if (glowLayer && glowLayer.bitmap) {
            const bmp = glowLayer.bitmap;
            const ctx = bmp.context;
            const tw = $gameMap.tileWidth(), th = $gameMap.tileHeight();
            const zF = window.UF && UF.Camera ? UF.Camera.zoom() : 1.0;
            const dispX = $gameMap.displayX(), dispY = $gameMap.displayY();

            const getAlphaAtTile = (tx, ty) => {
                const sx = Math.round(((tx - dispX) + 0.5) * tw * zF);
                const sy = Math.round(((ty - dispY) + 0.5) * th * zF);
                const pixel = ctx.getImageData(sx, sy, 1, 1).data;
                return pixel[3]; // alpha channel
            };

            insideGlowAlpha = getAlphaAtTile(cx, cy);
            northOutsideGlowAlpha = getAlphaAtTile(cx, cy - 3); // 1 tile north of north wall
            eastOutsideGlowAlpha = getAlphaAtTile(cx + 3, cy);  // 1 tile east of east wall
            westOutsideGlowAlpha = getAlphaAtTile(cx - 3, cy);  // 1 tile west of west wall
            doorwaySpillAlpha = getAlphaAtTile(cx, cy + 2);     // Doorway cell itself (dist 2.0 tiles from campfire)
        }

        t.check("inside_room_illuminated", insideGlowAlpha > 30, "Inside room glow alpha: " + insideGlowAlpha + " (expected > 30)");
        t.check("north_wall_blocks_light", northOutsideGlowAlpha === 0, "North exterior glow alpha: " + northOutsideGlowAlpha + " (expected 0, completely dark)");
        t.check("east_wall_blocks_light", eastOutsideGlowAlpha === 0, "East exterior glow alpha: " + eastOutsideGlowAlpha + " (expected 0, completely dark)");
        t.check("west_wall_blocks_light", westOutsideGlowAlpha === 0, "West exterior glow alpha: " + westOutsideGlowAlpha + " (expected 0, completely dark)");
        t.check("doorway_allows_light_spill", doorwaySpillAlpha > 0, "Open doorway light spill alpha: " + doorwaySpillAlpha + " (expected > 0)");
`;

testCode = testCode.replace(targetHook, occlusionTestCode + '\n        ' + targetHook);
fs.writeFileSync(testJsPath, testCode);
console.log('Injected Wall Light Occlusion test into snapshot UF_Test.js');

// 3. Run test using run_tests.js against snapshot
console.log('Running in-engine smoke test on snapshot...');
const testResult = childProcess.spawnSync(
    'C:\\Program Files\\nodejs\\node.exe',
    ['tools/run_tests.js', 'smoke', '--game', SNAPSHOT_DIR],
    { cwd: ROOT, encoding: 'utf8' }
);

console.log(testResult.stdout || '');
if (testResult.stderr) console.error(testResult.stderr);

// 4. Copy screenshots to art/review/ and brain artifacts
const snapOut = path.join(SNAPSHOT_DIR, 'test_output');
const shotClosed = path.join(snapOut, 'smoke.wall_occlusion_closed_door.png');
const shotOpen = path.join(snapOut, 'smoke.wall_occlusion_open_doorway.png');

if (fs.existsSync(shotClosed)) {
    const destClosed = path.join(REVIEW_DIR, 'wall_occlusion_closed_door.png');
    fs.copyFileSync(shotClosed, destClosed);
    fs.copyFileSync(shotClosed, path.join(BRAIN_DIR, 'wall_occlusion_closed_door.png'));
    console.log(`Saved closed door screenshot: ${destClosed}`);
} else {
    console.warn(`Missing closed door screenshot: ${shotClosed}`);
}

if (fs.existsSync(shotOpen)) {
    const destOpen = path.join(REVIEW_DIR, 'wall_occlusion_open_doorway.png');
    fs.copyFileSync(shotOpen, destOpen);
    fs.copyFileSync(shotOpen, path.join(BRAIN_DIR, 'wall_occlusion_open_doorway.png'));
    console.log(`Saved open doorway screenshot: ${destOpen}`);
} else {
    console.warn(`Missing open doorway screenshot: ${shotOpen}`);
}

console.log('=== Light Wall Occlusion Live In-Game test complete ===');
