'use strict';

/**
 * tools/test_human_male_variations_live.js
 *
 * Spawns all 6 Adult Male Human variations and the full 7-Action suite
 * in an in-game test snapshot and captures live in-game screenshots.
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'human_male_variations_test');
const BRAIN_DIR = 'C:/Users/snewt/.gemini/antigravity/brain/e6a9a54f-2cc6-432e-b7ec-5affda42dd85';
const REVIEW_DIR = path.join(ROOT, 'art', 'review');

console.log(`Setting up Human Male 6 Variations Live In-Game test snapshot at: ${SNAPSHOT_DIR}`);
try {
    fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
} catch (e) {}
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

// 1. Sync game/ to snapshot using robocopy
try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {}

// 2. Inject showcase lineup into UF_Test.js in snapshot
const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Test.js');
let testCode = fs.readFileSync(testJsPath, 'utf8');

const targetHook = 't.screenshot("map");';
if (!testCode.includes(targetHook)) {
    console.error('Target hook t.screenshot("map") not found in UF_Test.js!');
    process.exit(1);
}

const showcaseCode = `
        // --- Live In-Game Adult Male Human 6 Variations + 7 Actions Showcase ---
        const W = window.UF && UF.World;
        const curLevel = W && typeof W.levelOfMapId === 'function' ? W.levelOfMapId($gameMap.mapId()) : null;
        const curArea = curLevel ? { x: curLevel.x, y: curLevel.y } : (W && W.currentArea ? W.currentArea() : { x: 0, y: 0 });
        const curZ = curLevel ? curLevel.z : 0;
        const px = $gamePlayer.x || 15;
        const py = $gamePlayer.y || 15;

        // Move non-showcase events away
        for (const ev of $gameMap.events()) {
            if (!ev) continue;
            const evName = (ev.event() && ev.event().name) || '';
            if (!evName.startsWith('Human Male')) {
                ev.locate(px + 40, py - 30);
            }
        }

        function addShowcaseUnit(name, sheet, x, y, dir, pattern, stepAnime) {
            if (W && typeof W.setObject === 'function') {
                W.setObject(curArea.x, curArea.y, x, y, 0, curZ);
            }
            const u = W.addUnit({
                name: name,
                image: { characterName: sheet, characterIndex: 0 },
                area: curArea,
                z: curZ,
                x: x,
                y: y,
                dir: dir,
                exact: true,
                data: { species: "human" }
            });
            if (u && u.id !== undefined) {
                const evId = typeof W.eventIdOf === 'function' ? W.eventIdOf(u.id) : (1000 + u.id);
                const ev = $gameMap.event(evId);
                if (ev) {
                    ev.setImage(sheet, 0);
                    ev.setDirection(dir);
                    if (pattern !== undefined) {
                        ev.setPattern(pattern);
                        ev._originalPattern = pattern;
                    }
                    if (stepAnime) {
                        ev.setStepAnime(true);
                    }
                }
            }
            return u;
        }

        const cx = px;
        const cy = py;

        // Lineup 1 (Row cy - 1): All 6 Variations of Adult Male Human
        addShowcaseUnit("Male Var 1", "$UF_Human_Male_1", cx - 4, cy - 1, 2, 1, true);
        addShowcaseUnit("Male Var 2", "$UF_Human_Male_2", cx - 2, cy - 1, 2, 1, true);
        addShowcaseUnit("Male Var 3", "$UF_Human_Male_3", cx + 0, cy - 1, 2, 1, true);
        addShowcaseUnit("Male Var 4", "$UF_Human_Male_4", cx + 2, cy - 1, 2, 1, true);
        addShowcaseUnit("Male Var 5", "$UF_Human_Male_5", cx + 4, cy - 1, 2, 1, true);
        addShowcaseUnit("Male Var 6", "$UF_Human_Male_6", cx + 6, cy - 1, 2, 1, true);

        // Lineup 2 (Row cy + 1): 4 Facings & Key Actions of Master Settler
        addShowcaseUnit("Male South",  "$UF_Human_Male_Walk",   cx - 4, cy + 1, 2, 1, true);
        addShowcaseUnit("Male West",   "$UF_Human_Male_Walk",   cx - 2, cy + 1, 4, 1, true);
        addShowcaseUnit("Male East",   "$UF_Human_Male_Walk",   cx + 0, cy + 1, 6, 1, true);
        addShowcaseUnit("Male North",  "$UF_Human_Male_Walk",   cx + 2, cy + 1, 8, 1, true);
        addShowcaseUnit("Male Haul",   "$UF_Human_Male_Haul",   cx + 4, cy + 1, 2, 1, true);
        addShowcaseUnit("Male Attack", "$UF_Human_Male_Attack", cx + 6, cy + 1, 2, 1, true);

        if (window.UF && UF.Objects && typeof UF.Objects.refresh === 'function') {
            UF.Objects.refresh();
        }

        $gamePlayer.locate(cx + 1, cy);

        if (window.TouchInput) {
            TouchInput._x = -999;
            TouchInput._y = -999;
        }

        // Capture Zoom Level 0 (3x closeup)
        if (window.UF && UF.Camera && typeof UF.Camera.setLevel === 'function') {
            UF.Camera.setLevel(0);
        }
        await t.waitFrames(40);
        t.screenshot("human_male_6_variations_live_closeup");

        // Capture Zoom Level 1 (2x normal)
        if (window.UF && UF.Camera && typeof UF.Camera.setLevel === 'function') {
            UF.Camera.setLevel(1);
        }
        await t.waitFrames(30);
        t.screenshot("human_male_6_variations_live_normal");
`;

testCode = testCode.replace(targetHook, `${showcaseCode}\n        ${targetHook}`);
fs.writeFileSync(testJsPath, testCode);
console.log('Injected Human Male 6 Variations Showcase into UF_Test.js in snapshot.');

// 3. Run test runner against snapshot
console.log('Launching test runner against snapshot...');
try {
    const output = childProcess.execFileSync('C:/Program Files/nodejs/node.exe', [
        path.join(ROOT, 'tools', 'run_tests.js'),
        'smoke',
        '--game',
        SNAPSHOT_DIR
    ], {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 90000
    });
    console.log('Test output:\n', output);
} catch (err) {
    console.error('Test run failed:\n', err.stdout || err.message);
}

// 4. Copy screenshots
const snapTestOut = path.join(SNAPSHOT_DIR, 'test_output');
const filesToCopy = [
    'smoke.human_male_6_variations_live_closeup.png',
    'smoke.human_male_6_variations_live_normal.png'
];

for (const f of filesToCopy) {
    const src = path.join(snapTestOut, f);
    if (fs.existsSync(src)) {
        const dest = path.join(BRAIN_DIR, f.replace('smoke.', ''));
        fs.copyFileSync(src, dest);
        fs.copyFileSync(src, path.join(REVIEW_DIR, f.replace('smoke.', '')));
        console.log(`Retrieved ${f}`);
    } else {
        console.warn(`Could not find ${src}`);
    }
}

console.log('Live in-game showcase execution completed successfully.');
