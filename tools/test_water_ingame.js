const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'water_live');

if (fs.existsSync(SNAPSHOT_DIR)) fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (_) {}

const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Test.js');
let testJs = fs.readFileSync(testJsPath, 'utf8');

const hook = 'Test.suite("smoke", async t => {';
const injection = `Test.suite("smoke", async t => {
        // Place a clean 6x4 fresh water pond and 6x4 deep water pool directly south of player
        const px = $gamePlayer.x, py = $gamePlayer.y;
        const w = $dataMap.width;
        for (let dy = 1; dy <= 6; dy++) {
            for (let dx = -5; dx <= -1; dx++) {
                $dataMap.data[(py + dy) * w + (px + dx)] = 2048; // Fresh water
            }
            for (let dx = 1; dx <= 5; dx++) {
                $dataMap.data[(py + dy) * w + (px + dx)] = 2624; // Deep water
            }
        }
        if (SceneManager._scene && SceneManager._scene._spriteset && SceneManager._scene._spriteset._tilemap) {
            SceneManager._scene._spriteset._tilemap.refresh();
        }
        await t.waitFrames(20);
        t.screenshot("live_water_pond_surface");
`;

testJs = testJs.replace(hook, injection);
fs.writeFileSync(testJsPath, testJs, 'utf8');

console.log('Running water smoke test...');
try {
    const out = childProcess.execSync(`"C:\\Program Files\\nodejs\\node.exe" "${path.join(ROOT, 'tools', 'run_tests.js')}" smoke --game "${SNAPSHOT_DIR}"`, { stdio: 'pipe' });
    console.log(out.toString());
} catch (e) {
    if (e.stdout) console.log(e.stdout.toString());
    if (e.stderr) console.error(e.stderr.toString());
}

const shot = path.join(SNAPSHOT_DIR, 'test_output', 'smoke.live_water_pond_surface.png');
if (fs.existsSync(shot)) {
    fs.copyFileSync(shot, path.join(ROOT, 'art', 'review', 'water_live_flow_surface.png'));
    console.log('Copied to art/review/water_live_flow_surface.png');
} else {
    console.log('Screenshot not found at', shot);
}
