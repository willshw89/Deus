'use strict';

/**
 * tools/test_human_male_live_ingame.js
 *
 * Spawns the Adult Male Human 7-action 12-sprite suite in an in-game test snapshot
 * and captures live in-game screenshots at 3x close-up and 2x normal zoom.
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'human_male_live_test');
const BRAIN_DIR = 'C:/Users/snewt/.gemini/antigravity/brain/e6a9a54f-2cc6-432e-b7ec-5affda42dd85';
const REVIEW_DIR = path.join(ROOT, 'art', 'review');

console.log(`Setting up Human Male Live In-Game test snapshot at: ${SNAPSHOT_DIR}`);
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
        // --- Live In-Game Adult Male Human 12-Sprite Action Showcase ---
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
                    ev.setDirection(dir);
                    ev.setDirectionFix(true);
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

        // Lineup: Adult Male Human across all 7 actions
        addShowcaseUnit("Human Male Walk S",   "$UF_Human_Male_Walk",   cx - 5, cy, 2, 1, true);
        addShowcaseUnit("Human Male Walk W",   "$UF_Human_Male_Walk",   cx - 4, cy, 4, 1, true);
        addShowcaseUnit("Human Male Walk E",   "$UF_Human_Male_Walk",   cx - 3, cy, 6, 1, true);
        addShowcaseUnit("Human Male Walk N",   "$UF_Human_Male_Walk",   cx - 2, cy, 8, 1, true);
        addShowcaseUnit("Human Male Haul S",   "$UF_Human_Male_Haul",   cx - 1, cy, 2, 1, true);
        addShowcaseUnit("Human Male Attack S", "$UF_Human_Male_Attack", cx + 0, cy, 2, 1, true);
        addShowcaseUnit("Human Male Bow W",    "$UF_Human_Male_Bow",    cx + 1, cy, 4, 1, false);
        addShowcaseUnit("Human Male Magic S",  "$UF_Human_Male_Magic",  cx + 2, cy, 2, 2, true);
        addShowcaseUnit("Human Male Work S",   "$UF_Human_Male_Work",   cx + 3, cy, 2, 2, true);
        addShowcaseUnit("Human Male Downed S", "$UF_Human_Male_Downed", cx + 4, cy, 2, 2, false);

        if (window.UF && UF.Objects && typeof UF.Objects.refresh === 'function') {
            UF.Objects.refresh();
        }

        $gamePlayer.locate(cx, cy);

        if (window.TouchInput) {
            TouchInput._x = -999;
            TouchInput._y = -999;
        }

        // Capture Zoom Level 0 (3x closeup)
        if (window.UF && UF.Camera && typeof UF.Camera.setLevel === 'function') {
            UF.Camera.setLevel(0);
        }
        await t.waitFrames(40);
        t.screenshot("human_male_live_closeup");

        // Capture Zoom Level 1 (2x normal)
        if (window.UF && UF.Camera && typeof UF.Camera.setLevel === 'function') {
            UF.Camera.setLevel(1);
        }
        await t.waitFrames(30);
        t.screenshot("human_male_live_normal");
`;

testCode = testCode.replace(targetHook, `${showcaseCode}\n        ${targetHook}`);
fs.writeFileSync(testJsPath, testCode);
console.log('Injected Human Male Showcase into UF_Test.js in snapshot.');

// 3. Run test runner against snapshot using run_tests.js
console.log('Launching test runner against snapshot...');
try {
    const output = childProcess.execFileSync('C:/Program Files/nodejs/node.exe', [
        path.join(ROOT, 'tools', 'run_tests.js'),
        'smoke',
        '--game',
        SNAPSHOT_DIR
    ], {
        cwd: ROOT,
        timeout: 45000,
        encoding: 'utf8'
    });
    console.log('Test output:\n', output);
} catch (e) {
    console.log('Test finished with stdout:\n', e.stdout || e.message);
}

// 4. Retrieve screenshots
const testOutDir = path.join(SNAPSHOT_DIR, 'test_output');
const closeupSrc = path.join(testOutDir, 'smoke.human_male_live_closeup.png');
const normalSrc = path.join(testOutDir, 'smoke.human_male_live_normal.png');

if (fs.existsSync(closeupSrc)) {
    fs.copyFileSync(closeupSrc, path.join(REVIEW_DIR, 'human_male_live_closeup.png'));
    if (fs.existsSync(BRAIN_DIR)) {
        fs.copyFileSync(closeupSrc, path.join(BRAIN_DIR, 'human_male_live_closeup.png'));
    }
    console.log('Retrieved smoke.human_male_live_closeup.png');
} else {
    console.error('Closeup screenshot not found at:', closeupSrc);
}

if (fs.existsSync(normalSrc)) {
    fs.copyFileSync(normalSrc, path.join(REVIEW_DIR, 'human_male_live_normal.png'));
    if (fs.existsSync(BRAIN_DIR)) {
        fs.copyFileSync(normalSrc, path.join(BRAIN_DIR, 'human_male_live_normal.png'));
    }
    console.log('Retrieved smoke.human_male_live_normal.png');
} else {
    console.error('Normal screenshot not found at:', normalSrc);
}

console.log('Live in-game showcase execution completed successfully.');
