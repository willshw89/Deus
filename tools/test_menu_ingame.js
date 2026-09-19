const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'menu_live');

console.log(`Setting up in-game menu test snapshot at: ${SNAPSHOT_DIR}`);
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

// Sync game/ to snapshot using robocopy
try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {}

// Inject menu and dialogue test into UF_Test.js in snapshot
const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Test.js');
if (fs.existsSync(testJsPath)) {
    let code = fs.readFileSync(testJsPath, 'utf8');
    const hook = 't.check("reached_map", scene instanceof Scene_Map';
    const menuCapture = `
        // Test in-game menu with U7 windowskin
        SceneManager.push(Scene_Menu);
        await t.waitFrames(20);
        t.screenshot("u7_menu_live_ingame");
        SceneManager.pop();
        await t.waitFrames(15);

        // Test in-game message dialogue with U7 framed face
        $gameMessage.setFaceImage("UF_Faces_Human_Male_Adult", 0);
        $gameMessage.add("Hail, Overseer! The perimeter is secure.");
        await t.waitFrames(20);
        t.screenshot("u7_dialogue_live_ingame");
        $gameMessage.clear();
        await t.waitFrames(10);

        ${hook}`;
    code = code.replace(hook, menuCapture);
    fs.writeFileSync(testJsPath, code);
    console.log('Injected menu and dialogue capture into snapshot test suite.');
}

// Run the snapshot test
console.log('Launching NW.js test harness on snapshot...');
try {
    const out = childProcess.execSync(`"${process.execPath}" tools/run_tests.js smoke --game "${SNAPSHOT_DIR}"`, { cwd: ROOT, encoding: 'utf8' });
    console.log(out);
} catch (err) {
    console.error('Test output:', err.stdout);
    console.error('Error:', err.message);
}

// Copy screenshots back to game/test_output/ and brain folder
const outDir = path.join(ROOT, 'game', 'test_output');
fs.mkdirSync(outDir, { recursive: true });

const snapOutDir = path.join(SNAPSHOT_DIR, 'test_output');
if (fs.existsSync(snapOutDir)) {
    for (const f of fs.readdirSync(snapOutDir)) {
        if (f.endsWith('.png')) {
            fs.copyFileSync(path.join(snapOutDir, f), path.join(outDir, f));
            console.log(`Copied in-game screenshot to: game/test_output/${f}`);
        }
    }
}
