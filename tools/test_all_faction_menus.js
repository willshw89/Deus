const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'faction_menus_all');
const BRAIN_DIR = 'C:\\Users\\snewt\\.gemini\\antigravity\\brain\\f9b9af6f-1902-44c2-8bc1-fe9d0fdadb45';

console.log(`Setting up in-game faction menus test snapshot at: ${SNAPSHOT_DIR}`);
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

// 1. Sync game/ to snapshot using robocopy
try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {}

// 2. Ensure UF_FactionMenus and UF_Test are registered in snapshot plugins.js
const pluginsJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins.js');
if (fs.existsSync(pluginsJsPath)) {
    let pluginsText = fs.readFileSync(pluginsJsPath, 'utf8');
    if (!pluginsText.includes('"UF_FactionMenus"')) {
        pluginsText = pluginsText.replace(
            '{"name":"UF_Test"',
            '{"name":"UF_FactionMenus","status":true,"description":"[UF Faction Menus] Dynamic matching full-screen menu themes, backdrops, window skins, and cultural cursors for all 11 factions.","parameters":{}},\n{"name":"UF_Test"'
        );
        fs.writeFileSync(pluginsJsPath, pluginsText, 'utf8');
        console.log('Registered UF_FactionMenus in snapshot plugins.js');
    }
}

// 3. Run the snapshot test with faction_menus suite
console.log('Launching NW.js test harness on snapshot for faction_menus suite...');
try {
    childProcess.execSync(`"${process.execPath}" tools/run_tests.js faction_menus --game "${SNAPSHOT_DIR}"`, {
        cwd: ROOT,
        stdio: 'inherit'
    });
} catch (err) {
    console.error('Test run error:', err.message);
}

// 4. Copy screenshots to game/test_output and brain artifacts folder
const gameOutDir = path.join(ROOT, 'game', 'test_output');
fs.mkdirSync(gameOutDir, { recursive: true });
const snapOutDir = path.join(SNAPSHOT_DIR, 'test_output');

if (fs.existsSync(snapOutDir)) {
    const files = fs.readdirSync(snapOutDir);
    for (const f of files) {
        if (f.endsWith('.png')) {
            const src = path.join(snapOutDir, f);
            const dst = path.join(gameOutDir, f);
            fs.copyFileSync(src, dst);
            console.log(`Copied screenshot to game/test_output/${f}`);

            if (fs.existsSync(BRAIN_DIR)) {
                fs.copyFileSync(src, path.join(BRAIN_DIR, f));
                console.log(`Copied screenshot to brain/${f}`);
            }
        }
    }
}

console.log('Done testing all faction menus!');
