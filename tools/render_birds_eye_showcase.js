const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'birds_eye_review');

if (fs.existsSync(SNAPSHOT_DIR)) fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (_) {}

const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Test.js');
let testJs = fs.readFileSync(testJsPath, 'utf8');

const hook = 'Test.suite("smoke", async t => {';
const injection = `Test.suite("smoke", async t => {
        if (window.UF && UF.Levels && UF.World && UF.World.viewLevel() && UF.World.viewLevel().z !== 0) {
            UF.Levels.ground();
            await t.waitUntil(() => UF.World.viewLevel() && UF.World.viewLevel().z === 0, 10000, "Ground level");
        }
        await t.waitFrames(25);

        const mid = 128;
        const px = $gamePlayer.x, py = $gamePlayer.y;

        // 1. Zoom level 0 (1.0x normal view) centered on starting camp and meadow rolling shades
        $gamePlayer.locate(px, py);
        if (UF.Camera) UF.Camera.setLevel(0);
        await t.waitFrames(20);
        t.screenshot("birds_eye_zoom_0_normal");

        // 2. Zoom level 1 (0.667x medium view) showing the nearby natural water body and organic rounded shorelines
        // Find nearest water in area (0, 0)
        let waterX = px, waterY = py, minDist = 999999;
        const w = $dataMap.width;
        for (let dy = -30; dy <= 30; dy++) {
            for (let dx = -30; dx <= 30; dx++) {
                const gx = px + dx, gy = py + dy;
                if (gx >= 0 && gx < w && gy >= 0 && gy < $dataMap.height) {
                    const tile = $dataMap.data[gy * w + gx];
                    if (tile >= 2048 && tile < 2816) {
                        const d = dx * dx + dy * dy;
                        if (d < minDist) {
                            minDist = d;
                            waterX = gx;
                            waterY = gy;
                        }
                    }
                }
            }
        }
        $gamePlayer.locate(waterX, waterY);
        if (UF.Camera) UF.Camera.setLevel(1);
        await t.waitFrames(20);
        t.screenshot("birds_eye_zoom_1_medium");

        // 3. Zoom level 2 (0.333x wide bird's-eye view) continent-scale view of rolling gradients and natural biomes
        $gamePlayer.locate(mid, mid);
        if (UF.Camera) UF.Camera.setLevel(2);
        await t.waitFrames(25);
        t.screenshot("birds_eye_zoom_2_wide");
`;

testJs = testJs.replace(hook, injection);
fs.writeFileSync(testJsPath, testJs, 'utf8');

console.log('Running authentic bird\'s-eye view showcase test...');
try {
    const out = childProcess.execSync(`"C:\\Program Files\\nodejs\\node.exe" "${path.join(ROOT, 'tools', 'run_tests.js')}" smoke --game "${SNAPSHOT_DIR}"`, { stdio: 'pipe' });
    console.log(out.toString());
} catch (e) {
    if (e.stdout) console.log(e.stdout.toString());
    if (e.stderr) console.error(e.stderr.toString());
}

const copy = (srcName, destName) => {
    const s = path.join(SNAPSHOT_DIR, 'test_output', srcName);
    const d = path.join(ROOT, 'art', 'review', destName);
    if (fs.existsSync(s)) {
        fs.copyFileSync(s, d);
        console.log('Copied to', d);
    } else {
        console.log('Not found:', s);
    }
};

copy('smoke.birds_eye_zoom_0_normal.png', 'birds_eye_zoom_0_normal.png');
copy('smoke.birds_eye_zoom_1_medium.png', 'birds_eye_zoom_1_medium.png');
copy('smoke.birds_eye_zoom_2_wide.png', 'birds_eye_zoom_2_wide.png');
