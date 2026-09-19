const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'factions_live');

console.log(`Setting up in-game faction showcase snapshot at: ${SNAPSHOT_DIR}`);
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

// Sync game/ to snapshot using robocopy
try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {}

// Inject multi-faction dialogue & window test into UF_Test.js in snapshot
const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Test.js');
if (fs.existsSync(testJsPath)) {
    let code = fs.readFileSync(testJsPath, 'utf8');
    const hook = 't.check("reached_map", scene instanceof Scene_Map';
    const factionCapture = `
        // Test in-game dialogue with multiple faction facesets and U7 frames
        const testFaces = [
            { face: "UF_Faces_human_1", index: 0, msg: "Human Settlers: The colony foundation is set." },
            { face: "UF_Faces_elf_1", index: 1, msg: "Elven Grove-Keepers: The forest spirits welcome your peaceful intent." },
            { face: "UF_Faces_dwarf_1", index: 0, msg: "Dwarven Clan: The mountain veins run deep with gold and iron." },
            { face: "UF_Faces_gnome_1", index: 0, msg: "Gnomish Guild: Calibration complete! The brass chronometer is ticking." },
            { face: "UF_Faces_orc_1", index: 0, msg: "Orc War-Band: Blood and iron! Stand your ground, stranger." },
            { face: "UF_Faces_starborn_1", index: 1, msg: "Starborn Concord: The crystal lattice resonates with celestial light." },
            { face: "UF_Faces_swarm_1", index: 0, msg: "The Chitinous Swarm: The hive senses your arrival... biomass noted." }
        ];

        for (let i = 0; i < testFaces.length; i++) {
            const tf = testFaces[i];
            $gameMessage.setFaceImage(tf.face, tf.index);
            $gameMessage.add(tf.msg);
            await t.waitFrames(15);
            t.screenshot("faction_dialogue_" + tf.face);
            $gameMessage.clear();
            await t.waitFrames(10);
        }

        ${hook}`;
    code = code.replace(hook, factionCapture);
    fs.writeFileSync(testJsPath, code);
    console.log('Injected multi-faction dialogue capture into snapshot.');
}

// Run the snapshot test
console.log('Launching NW.js test harness on snapshot...');
try {
    const out = childProcess.execSync(`"C:\\Program Files\\nodejs\\node.exe" tools/run_tests.js smoke --game "${SNAPSHOT_DIR}"`, { cwd: ROOT, encoding: 'utf8' });
    console.log(out);
} catch (err) {
    console.log('Finished harness run.');
}

// Copy screenshots back to art/review/ and game/test_output/
const outDir = path.join(ROOT, 'art', 'review');
fs.mkdirSync(outDir, { recursive: true });

const snapOutDir = path.join(SNAPSHOT_DIR, 'test_output');
if (fs.existsSync(snapOutDir)) {
    for (const f of fs.readdirSync(snapOutDir)) {
        if (f.startsWith('smoke.faction_dialogue_')) {
            fs.copyFileSync(path.join(snapOutDir, f), path.join(outDir, f.replace('smoke.', '')));
            console.log(`Copied review screenshot: art/review/${f.replace('smoke.', '')}`);
        }
    }
}
