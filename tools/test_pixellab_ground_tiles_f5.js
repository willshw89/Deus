const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');
const zlib = require('zlib');

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

// 1. Configure DEUS_World in snapshot plugins.js to ensure StartInWorld: "false" for Map001 inspection
const snapshotPluginsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins.js');
let pluginsContent = fs.readFileSync(snapshotPluginsPath, 'utf8');
pluginsContent = pluginsContent.replace(
    /("name"\s*:\s*"DEUS_World"[\s\S]*?"parameters"\s*:\s*\{)([\s\S]*?)(\})/,
    '$1"StartInWorld":"false"$3'
);
fs.writeFileSync(snapshotPluginsPath, pluginsContent, 'utf8');
console.log('Configured StartInWorld: "false" in snapshot plugins.js (forcing New Game boot directly into Map001)');

// 2. Inject test automation suite into DEUS_Test.js in snapshot
const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'DEUS_Test.js');
let testJs = fs.readFileSync(testJsPath, 'utf8');

const hook = 'Test.suite("selftest", t => {';
const injection = `Test.suite("ground_demo", async t => {
        // Assert we are on Map001
        t.check("reached_map001", $gameMap.mapId() === 1, $dataMap ? "map " + $gameMap.mapId() + " (" + $gameMap.displayName() + ")" : "no map");
        t.check("no_errors", t.errorsSoFar().length === 0, t.errorsSoFar().join(" | "));

        // Bright clear noon daylight for ground inspection
        if (window.$ufTime) window.$ufTime.setTime(12, 0);
        if (window.UF && UF.DayNight) UF.DayNight.toneFor = () => [0, 0, 0, 0];
        $gameScreen.startTint([0, 0, 0, 0], 1);

        // Ensure 1x camera zoom
        if (window.UF && UF.Camera) {
            UF.Camera.setZoom(1.0);
        }

        // Capture 1: Initial Central Plaza at (25, 20), camera centered (16.5, 13.5)
        $gamePlayer.locate(25, 20);
        if ($gameMap && $gameMap.setDisplayPos) {
            $gameMap.setDisplayPos(16.5, 13.5);
        }
        await t.waitFrames(45);
        t.screenshot("ground_f5_center_plaza");
        console.log("Captured ground_f5_center_plaza");

        // Capture 2: Zone 1: Grasslands & Woods (NW) at (8, 6), camera at (0, 0)
        $gamePlayer.locate(8, 6);
        if ($gameMap && $gameMap.setDisplayPos) {
            $gameMap.setDisplayPos(0, 0);
        }
        await t.waitFrames(30);
        t.screenshot("ground_f5_zone1_grasslands_nw");
        console.log("Captured ground_f5_zone1_grasslands_nw");

        // Capture 3: Zone 2: Earth, Sand & Shoreline (SW) at (8, 28), camera at (0, 22)
        $gamePlayer.locate(8, 28);
        if ($gameMap && $gameMap.setDisplayPos) {
            $gameMap.setDisplayPos(0, 22);
        }
        await t.waitFrames(30);
        t.screenshot("ground_f5_zone2_earth_shore_sw");
        console.log("Captured ground_f5_zone2_earth_shore_sw");

        // Capture 4: Zone 3: Rock, Scree & Mountain Peaks (NE) at (36, 6), camera at (25, 0)
        $gamePlayer.locate(36, 6);
        if ($gameMap && $gameMap.setDisplayPos) {
            $gameMap.setDisplayPos(25, 0);
        }
        await t.waitFrames(30);
        t.screenshot("ground_f5_zone3_rock_peaks_ne");
        console.log("Captured ground_f5_zone3_rock_peaks_ne");

        // Capture 5: Zone 4: Subterranean & Excavation Cuts (SE) at (36, 28), camera at (25, 22)
        $gamePlayer.locate(36, 28);
        if ($gameMap && $gameMap.setDisplayPos) {
            $gameMap.setDisplayPos(25, 22);
        }
        await t.waitFrames(30);
        t.screenshot("ground_f5_zone4_subterranean_se");
        console.log("Captured ground_f5_zone4_subterranean_se");

        // Capture 6: Zone 5: 42-Swatch 1:1 Specimen Runway at (25, 38), camera at (16.5, 27)
        $gamePlayer.locate(25, 38);
        if ($gameMap && $gameMap.setDisplayPos) {
            $gameMap.setDisplayPos(16.5, 27);
        }
        await t.waitFrames(30);
        t.screenshot("ground_f5_zone5_gallery_runway");
        console.log("Captured ground_f5_zone5_gallery_runway");
    });

    Test.suite("selftest", t => {`;

testJs = testJs.replace(hook, injection);
fs.writeFileSync(testJsPath, testJs, 'utf8');

console.log('Executing live NW.js in-engine test on Map001 (suite: ground_demo)...');
try {
    const nodeExe = process.execPath;
    const runTestsJs = path.join(ROOT, 'tools', 'run_tests.js');
    const cmd = `"${nodeExe}" "${runTestsJs}" ground_demo --game "${SNAPSHOT_DIR}"`;
    const out = childProcess.execSync(cmd, { stdio: 'pipe' });
    console.log(out.toString());
} catch (e) {
    if (e.stdout) console.log(e.stdout.toString());
    if (e.stderr) console.error(e.stderr.toString());
    process.exit(1);
}

// 3. Copy screenshots to art/review/ and brain artifacts
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
    const src = path.join(SNAPSHOT_DIR, 'test_output', `ground_demo.${name}.png`);
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

// 4. Decode PNGs and Validate Real Image Diversity (No Duplicate Views)
function decodePNG(buf) {
    let pos = 8;
    let w, h, idat = [];
    while (pos < buf.length) {
        const len = buf.readUInt32BE(pos);
        const type = buf.toString('ascii', pos + 4, pos + 8);
        if (type === 'IHDR') {
            w = buf.readUInt32BE(pos + 8);
            h = buf.readUInt32BE(pos + 12);
        } else if (type === 'IDAT') {
            idat.push(buf.subarray(pos + 8, pos + 8 + len));
        }
        pos += 12 + len;
    }
    const uncompressed = zlib.inflateSync(Buffer.concat(idat));
    const stride = w * 4 + 1;
    const data = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
        const filter = uncompressed[y * stride];
        const src = y * stride + 1;
        const dst = y * w * 4;
        for (let x = 0; x < w * 4; x++) {
            let val = uncompressed[src + x];
            let a = x >= 4 ? data[dst + x - 4] : 0;
            let b = y > 0 ? data[(y - 1) * w * 4 + x] : 0;
            let c = (x >= 4 && y > 0) ? data[(y - 1) * w * 4 + x - 4] : 0;
            if (filter === 1) val = (val + a) & 0xFF;
            else if (filter === 2) val = (val + b) & 0xFF;
            else if (filter === 3) val = (val + Math.floor((a + b) / 2)) & 0xFF;
            else if (filter === 4) {
                const p = a + b - c;
                const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
                const pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
                val = (val + pr) & 0xFF;
            }
            data[dst + x] = val;
        }
    }
    return { width: w, height: h, data };
}

function calcMSE(bufA, bufB) {
    let sum = 0;
    const len = bufA.length;
    for (let i = 0; i < len; i += 4) {
        const dr = bufA[i] - bufB[i];
        const dg = bufA[i + 1] - bufB[i + 1];
        const db = bufA[i + 2] - bufB[i + 2];
        sum += (dr * dr + dg * dg + db * db) / 3;
    }
    return sum / (len / 4);
}

const frames = {};
for (const name of shots) {
    const p = path.join(reviewDir, `${name}.png`);
    frames[name] = decodePNG(fs.readFileSync(p));
}

console.log('Verifying screenshot distinctness across zones...');
const pairs = [
    ['ground_f5_zone1_grasslands_nw', 'ground_f5_zone2_earth_shore_sw'],
    ['ground_f5_zone1_grasslands_nw', 'ground_f5_zone5_gallery_runway'],
    ['ground_f5_zone2_earth_shore_sw', 'ground_f5_zone3_rock_peaks_ne'],
    ['ground_f5_zone3_rock_peaks_ne', 'ground_f5_zone4_subterranean_se'],
    ['ground_f5_center_plaza', 'ground_f5_zone1_grasslands_nw']
];

for (const [a, b] of pairs) {
    const mse = calcMSE(frames[a].data, frames[b].data);
    console.log(`MSE(${a.replace('ground_f5_', '')}, ${b.replace('ground_f5_', '')}) = ${mse.toFixed(1)}`);
    if (mse < 200) {
        console.error(`[FAIL - DUPLICATE VIEWS] ${a} and ${b} are too similar (MSE: ${mse.toFixed(1)})`);
        process.exit(1);
    }
}

// Verify Zone 1 has green pixel presence (> 20%)
let greenCount = 0;
const z1Data = frames['ground_f5_zone1_grasslands_nw'].data;
for (let i = 0; i < z1Data.length; i += 4) {
    const r = z1Data[i], g = z1Data[i + 1], b = z1Data[i + 2];
    if (g > r && g > b) greenCount++;
}
const greenRatio = greenCount / (z1Data.length / 4);
console.log(`Zone 1 Green pixel ratio: ${(greenRatio * 100).toFixed(1)}%`);
if (greenRatio < 0.20) {
    console.error(`[FAIL - ZONE 1 CONTENT] Expected > 20% green pixels in Zone 1 Grasslands, got ${(greenRatio * 100).toFixed(1)}%`);
    process.exit(1);
}

console.log('--- In-Engine F5 Playtest Verification Completed Successfully (6/6 distinct Map001 screenshots verified) ---');
