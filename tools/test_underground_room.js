const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'underground_room_review');

if (fs.existsSync(SNAPSHOT_DIR)) fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (_) {}

const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Test.js');
let testJs = fs.readFileSync(testJsPath, 'utf8');

const hook = 'Test.suite("smoke", async t => {';
const injection = `Test.suite("smoke", async t => {
        // Set time to noon and clear DayNight underground tone for clear visual review
        if (window.$ufTime) {
            window.$ufTime.setTime(12, 0);
        }
        if (window.UF && UF.DayNight) {
            UF.DayNight.toneFor = () => [0, 0, 0, 0];
        }
        $gameScreen.startTint([0, 0, 0, 0], 1);

        // Switch to Level -1
        if (window.UF && UF.Levels && UF.Levels.setView) {
            UF.Levels.setView(-1);
            await t.waitFrames(60);

            $gameScreen.startTint([0, 0, 0, 0], 1);
            await t.waitFrames(30);

            t.screenshot("underground_noon_room");
        }
`;

testJs = testJs.replace(hook, injection);
fs.writeFileSync(testJsPath, testJs, 'utf8');

console.log('Running noon underground test...');
try {
    const out = childProcess.execSync(`"C:\\Program Files\\nodejs\\node.exe" "${path.join(ROOT, 'tools', 'run_tests.js')}" smoke --game "${SNAPSHOT_DIR}"`, { stdio: 'pipe' });
    console.log(out.toString());
} catch (e) {
    if (e.stdout) console.log(e.stdout.toString());
    if (e.stderr) console.error(e.stderr.toString());
}

const shot = path.join(SNAPSHOT_DIR, 'test_output', 'smoke.underground_noon_room.png');
if (fs.existsSync(shot)) {
    fs.copyFileSync(shot, path.join(ROOT, 'art', 'review', 'nano_underground_noon_room.png'));
    console.log('Saved screenshot to art/review/nano_underground_noon_room.png');
}
