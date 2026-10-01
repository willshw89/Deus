const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'ground_tiles_f5_live');

console.log('--- Setting Up Live F5 Demonstration NW.js Test Harness ---');

if (fs.existsSync(SNAPSHOT_DIR)) {
    fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

console.log(`Snapshotting game directory to ${SNAPSHOT_DIR}...`);
try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (_) {}

const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'DEUS_Test.js');
let testJs = fs.readFileSync(testJsPath, 'utf8');

const hook = 'Test.suite("smoke", async t => {';
const injection = `Test.suite("smoke", async t => {
        // Bright clear noon daylight for ground inspection
        if (window.$ufTime) window.$ufTime.setTime(12, 0);
        if (window.UF && UF.DayNight) UF.DayNight.toneFor = () => [0, 0, 0, 0];
        $gameScreen.startTint([0, 0, 0, 0], 1);

        // Ensure 1x camera zoom and centered on player (25, 20)
        if (window.UF && UF.Camera) {
            UF.Camera.setZoom(1.0);
        }

        await t.waitFrames(45);

        // Capture 1: Initial Central View at (25, 20)
        t.screenshot("ground_f5_center_plaza");
        console.log("Captured ground_f5_center_plaza");

        // Move to Zone 1: Grasslands & Woods (NW)
        $gamePlayer.locate(10, 8);
        if ($gameMap && $gameMap.setDisplayPos) {
            $gameMap.setDisplayPos(10 - Math.floor($dataSystem.advanced.screenWidth / 96), 8 - Math.floor($dataSystem.advanced.screenHeight / 96));
        }
        await t.waitFrames(30);
        t.screenshot("ground_f5_zone1_grasslands_nw");
        console.log("Captured ground_f5_zone1_grasslands_nw");

        // Move to Zone 2: Earth, Sand & Shoreline (SW)
        $gamePlayer.locate(10, 29);
        if ($gameMap && $gameMap.setDisplayPos) {
            $gameMap.setDisplayPos(10 - Math.floor($dataSystem.advanced.screenWidth / 96), 29 - Math.floor($dataSystem.advanced.screenHeight / 96));
        }
        await t.waitFrames(30);
        t.screenshot("ground_f5_zone2_earth_shore_sw");
        console.log("Captured ground_f5_zone2_earth_shore_sw");

        // Move to Zone 3: Rock, Scree & Mountain Peaks (NE)
        $gamePlayer.locate(36, 8);
        if ($gameMap && $gameMap.setDisplayPos) {
            $gameMap.setDisplayPos(36 - Math.floor($dataSystem.advanced.screenWidth / 96), 8 - Math.floor($dataSystem.advanced.screenHeight / 96));
        }
        await t.waitFrames(30);
        t.screenshot("ground_f5_zone3_rock_peaks_ne");
        console.log("Captured ground_f5_zone3_rock_peaks_ne");

        // Move to Zone 4: Subterranean & Excavation Cuts (SE)
        $gamePlayer.locate(36, 29);
        if ($gameMap && $gameMap.setDisplayPos) {
            $gameMap.setDisplayPos(36 - Math.floor($dataSystem.advanced.screenWidth / 96), 29 - Math.floor($dataSystem.advanced.screenHeight / 96));
        }
        await t.waitFrames(30);
        t.screenshot("ground_f5_zone4_subterranean_se");
        console.log("Captured ground_f5_zone4_subterranean_se");

        // Move to Zone 5: 42-Swatch 1:1 Native Pixel Runway
        $gamePlayer.locate(25, 37);
        if ($gameMap && $gameMap.setDisplayPos) {
            $gameMap.setDisplayPos(25 - Math.floor($dataSystem.advanced.screenWidth / 96), 37 - Math.floor($dataSystem.advanced.screenHeight / 96));
        }
        await t.waitFrames(30);
        t.screenshot("ground_f5_zone5_gallery_runway");
        console.log("Captured ground_f5_zone5_gallery_runway");
`;

testJs = testJs.replace(hook, injection);
fs.writeFileSync(testJsPath, testJs, 'utf8');

console.log('Executing live NW.js in-engine test...');
try {
    const nodeExe = process.execPath;
    const runTestsJs = path.join(ROOT, 'tools', 'run_tests.js');
    const cmd = `"${nodeExe}" "${runTestsJs}" smoke --game "${SNAPSHOT_DIR}"`;
    const out = childProcess.execSync(cmd, { stdio: 'pipe' });
    console.log(out.toString());
} catch (e) {
    if (e.stdout) console.log(e.stdout.toString());
    if (e.stderr) console.error(e.stderr.toString());
    process.exit(1);
}

// Copy screenshots to art/review/ and brain artifacts
const reviewDir = path.join(ROOT, 'art', 'review');
fs.mkdirSync(reviewDir, { recursive: true });

const shots = [
    'ground_f5_center_plaza',
    'ground_f5_zone1_grasslands_nw',
    'ground_f5_zone2_earth_shore_sw',
    'ground_f5_zone3_rock_peaks_ne',
    'ground_f5_zone4_subterranean_se',
    'ground_f5_zone5_gallery_runway'
];

let missingScreenshots = 0;
for (const name of shots) {
    const src = path.join(SNAPSHOT_DIR, 'test_output', `smoke.${name}.png`);
    if (fs.existsSync(src)) {
        const dst = path.join(reviewDir, `${name}.png`);
        fs.copyFileSync(src, dst);
        console.log(`Saved screenshot: ${dst}`);
    } else {
        console.error(`[FAIL - MISSING SCREENSHOT] ${src}`);
        missingScreenshots++;
    }
}

if (missingScreenshots > 0) {
    console.error(`Failed: ${missingScreenshots} screenshots missing.`);
    process.exit(1);
}

console.log('--- In-Engine F5 Playtest Verification Completed Successfully (6/6 screenshots captured) ---');

