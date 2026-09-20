const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'creatures_live');

console.log(`Setting up in-game test snapshot at: ${SNAPSHOT_DIR}`);
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

// Sync game/ to snapshot using robocopy (fast and preserves files)
try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {
    // Robocopy returns exit code 1 on success when files are copied
}

// Update UF_WorldCatalog.json in snapshot ONLY
const catalogPath = path.join(SNAPSHOT_DIR, 'data', 'UF_WorldCatalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

const boar = catalog.wildlife.species.find(s => s.id === 'boar');
if (boar) {
    boar.image = '$UF_Boar';
    boar.tint = '#ffffff';
}

const hare = catalog.wildlife.species.find(s => s.id === 'hare');
if (hare) {
    hare.image = '$UF_Hare';
    hare.tint = '#ffffff';
}

const wolf = catalog.wildlife.species.find(s => s.id === 'wolf');
if (wolf) {
    wolf.image = '$UF_Wolf';
    wolf.tint = '#ffffff';
}

const fox = catalog.wildlife.species.find(s => s.id === 'fox');
if (fox) {
    fox.image = '$UF_Fox';
    fox.tint = '#ffffff';
}

fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
console.log('Updated catalog in snapshot: boar -> $UF_Boar, hare -> $UF_Hare, wolf -> $UF_Wolf, fox -> $UF_Fox');

// Add a high-visibility in-game showcase step to UF_Wildlife.js test in the snapshot
const wildlifeJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Wildlife.js');
let wildlifeJs = fs.readFileSync(wildlifeJsPath, 'utf8');

const targetHook = 't.screenshot("df_behaviors");';
const customShowcase = `
            // In-Game Live Creature Visual Showcase (Boar, Hare, Wolf, Fox)
            const showBoar = add("boar", px - 1, py, { ai: "wander", state: "idle" });
            const showHare = add("hare", px + 1, py, { ai: "wander", state: "idle" });
            const showBoarGraze = add("boar", px - 2, py + 1, { ai: "none", state: "graze" });
            const showHareHop = add("hare", px + 2, py + 1, { ai: "none", state: "walk" });
            const showWolf = add("wolf", px, py - 2, { ai: "wander", state: "idle" });
            const showWolfAttack = add("wolf", px - 2, py - 1, { ai: "none", state: "attack" });
            const showFox = add("fox", px + 1, py - 2, { ai: "wander", state: "idle" });
            const showFoxWalk = add("fox", px + 2, py - 1, { ai: "none", state: "walk" });

            if (UF.Camera) UF.Camera.setLevel(0);
            $gamePlayer.locate(px, py);
            await t.waitFrames(15);
            t.screenshot("creatures_live_ingame_closeup");

            if (UF.Camera) UF.Camera.setLevel(1);
            await t.waitFrames(15);
            t.screenshot("creatures_live_ingame");
            \${targetHook}
`;

wildlifeJs = wildlifeJs.replace(targetHook, customShowcase);
fs.writeFileSync(wildlifeJsPath, wildlifeJs);
console.log('Injected in-game creature camera showcase into snapshot test suite.');

// Run the snapshot test
console.log('Launching NW.js test harness on snapshot...');
try {
    const out = childProcess.execSync(`"${process.execPath}" tools/run_tests.js wildlife --game "${SNAPSHOT_DIR}"`, { cwd: ROOT, encoding: 'utf8' });
    console.log(out);
} catch (err) {
    console.error('Test harness output:', err.stdout);
    console.error('Error:', err.message);
}

// Copy screenshots back to game/test_output/ for inspection
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
